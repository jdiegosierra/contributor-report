/**
 * GitHub API client with rate limiting
 */

import * as github from '@actions/github'
import * as core from '@actions/core'
import type { GraphQLContributorData, PRContext } from '../types/github.js'
import { CONTRIBUTOR_DATA_QUERY, ORG_MEMBERSHIP_QUERY, RATE_LIMIT_QUERY } from './queries.js'
import {
  type RateLimitStatus,
  shouldWait,
  calculateWaitTime,
  waitWithLogging,
  parseRateLimit,
  isRateLimitError,
  isTransientError,
  handleRateLimitError,
  handleTransientError,
  executeWithRetry
} from './rate-limit.js'

/** Maximum retry attempts for rate limit errors */
const MAX_RETRIES = 3

/** GitHub API client wrapper */
export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>
  private rateLimitStatus: RateLimitStatus | null = null

  constructor(token: string) {
    this.octokit = github.getOctokit(token)
  }

  /**
   * Execute GraphQL query with rate limit handling
   */
  private async executeGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    // Check rate limit before making request
    if (this.rateLimitStatus && shouldWait(this.rateLimitStatus)) {
      const waitTime = calculateWaitTime(this.rateLimitStatus)
      await waitWithLogging(waitTime)
    }

    let lastError: unknown
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await this.octokit.graphql<T & { rateLimit?: unknown }>(query, variables)

        // Update rate limit status from response
        if (result.rateLimit) {
          this.rateLimitStatus = parseRateLimit(
            result.rateLimit as {
              remaining: number
              resetAt: string
              used: number
              limit?: number
            }
          )
        }

        return result
      } catch (error) {
        lastError = error
        if (attempt === MAX_RETRIES - 1) {
          throw error
        }
        if (isRateLimitError(error)) {
          await handleRateLimitError(error, attempt)
        } else if (isTransientError(error)) {
          await handleTransientError(error, attempt)
        } else {
          throw error
        }
      }
    }

    throw lastError
  }

  /**
   * Fetch contributor data with pagination
   */
  async fetchContributorData(username: string, sinceDate: Date): Promise<GraphQLContributorData> {
    core.info(`Fetching contributor data for ${username}`)

    // Build issue search query to find issues created by user
    // Using ISSUE_ADVANCED type with is:issue to properly filter out PRs
    const issueSearchQuery = `author:${username} is:issue created:>=${sinceDate.toISOString().split('T')[0]}`
    console.log(`[DEBUG] Issue search query: ${issueSearchQuery}`)

    const result = await this.executeGraphQL<GraphQLContributorData>(CONTRIBUTOR_DATA_QUERY, {
      username,
      since: sinceDate.toISOString(),
      prCursor: null,
      commentCursor: null,
      issueSearchQuery
    })

    if (!result.user) {
      throw new Error(`User not found: ${username}`)
    }

    console.log(
      `[DEBUG] Issue search returned: issueCount=${result.issueSearch?.issueCount ?? 0}, nodes=${result.issueSearch?.nodes?.length ?? 0}`
    )
    if (result.issueSearch?.nodes?.length) {
      for (const node of result.issueSearch.nodes) {
        console.log(
          `[DEBUG] Node: __typename=${(node as { __typename?: string }).__typename}, keys=${Object.keys(node).join(',')}`
        )
      }
    }

    // Handle pagination for PRs if needed
    let allPRs = [...result.user.pullRequests.nodes]
    let prPageInfo = result.user.pullRequests.pageInfo
    let pagesLoaded = 1
    const maxPages = 5 // Limit to prevent excessive API usage

    while (prPageInfo.hasNextPage && pagesLoaded < maxPages) {
      core.debug(`Fetching additional PR page ${pagesLoaded + 1}`)

      const nextPage = await this.executeGraphQL<GraphQLContributorData>(CONTRIBUTOR_DATA_QUERY, {
        username,
        since: sinceDate.toISOString(),
        prCursor: prPageInfo.endCursor,
        commentCursor: null,
        issueSearchQuery
      })

      if (nextPage.user) {
        allPRs = [...allPRs, ...nextPage.user.pullRequests.nodes]
        prPageInfo = nextPage.user.pullRequests.pageInfo
      }
      pagesLoaded++
    }

    // Filter PRs to only those within the analysis window
    const filteredPRs = allPRs.filter((pr) => {
      const prDate = new Date(pr.createdAt)
      return prDate >= sinceDate
    })

    // Handle pagination for Comments
    let allComments = [...result.user.issueComments.nodes]
    let commentPageInfo = result.user.issueComments.pageInfo
    pagesLoaded = 1

    while (commentPageInfo.hasNextPage && pagesLoaded < maxPages) {
      core.debug(`Fetching additional Comments page ${pagesLoaded + 1}`)

      const nextPage = await this.executeGraphQL<GraphQLContributorData>(CONTRIBUTOR_DATA_QUERY, {
        username,
        since: sinceDate.toISOString(),
        prCursor: null,
        commentCursor: commentPageInfo.endCursor,
        issueSearchQuery
      })

      if (nextPage.user) {
        allComments = [...allComments, ...nextPage.user.issueComments.nodes]
        commentPageInfo = nextPage.user.issueComments.pageInfo
      }
      pagesLoaded++
    }

    // Return aggregated data with safeguards for search results
    const issueSearch = result.issueSearch ?? { issueCount: 0, nodes: [] }

    return {
      user: {
        ...result.user,
        pullRequests: {
          ...result.user.pullRequests,
          nodes: filteredPRs,
          totalCount: filteredPRs.length
        },
        issueComments: {
          ...result.user.issueComments,
          nodes: allComments,
          totalCount: allComments.length
        }
      },
      issueSearch: {
        issueCount: issueSearch.issueCount ?? 0,
        nodes: issueSearch.nodes ?? []
      }
    }
  }

  /**
   * Check if user is member of any of the specified organizations
   */
  async checkOrgMembership(username: string, orgs: string[]): Promise<boolean> {
    if (orgs.length === 0) {
      return false
    }

    for (const org of orgs) {
      try {
        const result = await this.executeGraphQL<{
          organization: {
            membersWithRole: {
              nodes: Array<{ login: string }>
            }
          } | null
        }>(ORG_MEMBERSHIP_QUERY, { org, username })

        if (
          result.organization?.membersWithRole?.nodes?.some(
            (member) => member.login.toLowerCase() === username.toLowerCase()
          )
        ) {
          core.info(`User ${username} is member of organization ${org}`)
          return true
        }
      } catch (error) {
        // Organization might not exist or we don't have access
        core.debug(
          `Could not check membership for org ${org}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return false
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    try {
      const result = await this.executeGraphQL<{
        rateLimit: {
          remaining: number
          resetAt: string
          used: number
          limit: number
        }
      }>(RATE_LIMIT_QUERY, {})

      if (!result || !result.rateLimit) {
        return null
      }

      return parseRateLimit(result.rateLimit)
    } catch {
      return null
    }
  }

  /**
   * Add a comment to a pull request
   */
  async addPRComment(context: PRContext, body: string): Promise<void> {
    await executeWithRetry(async () => {
      await this.octokit.rest.issues.createComment({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.prNumber,
        body
      })
    })
  }

  /**
   * Update existing comment or create a new one
   * Looks for comments containing the marker and updates the first one found
   */
  async upsertPRComment(context: PRContext, body: string, marker: string): Promise<void> {
    await executeWithRetry(async () => {
      // Get existing comments
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.prNumber
      })

      // Find existing comment with marker
      const existingComment = comments.find((comment) => comment.body?.includes(marker))

      if (existingComment) {
        // Update existing comment
        await this.octokit.rest.issues.updateComment({
          owner: context.owner,
          repo: context.repo,
          comment_id: existingComment.id,
          body
        })
        core.info('Updated existing report comment')
      } else {
        // Create new comment
        await this.octokit.rest.issues.createComment({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.prNumber,
          body
        })
        core.info('Created new report comment')
      }
    })
  }

  /**
   * Ensure a label exists, creating it if necessary
   */
  private async ensureLabelExists(context: PRContext, label: string): Promise<void> {
    try {
      await this.octokit.rest.issues.getLabel({
        owner: context.owner,
        repo: context.repo,
        name: label
      })
    } catch {
      // Label doesn't exist, create it
      core.debug(`Creating label: ${label}`)
      await this.octokit.rest.issues.createLabel({
        owner: context.owner,
        repo: context.repo,
        name: label,
        color: 'FFA500', // Orange
        description: 'PR requires additional review due to contributor score'
      })
    }
  }

  /**
   * Add a label to a pull request
   * Uses idempotent pattern to avoid race conditions
   */
  async addPRLabel(context: PRContext, label: string): Promise<void> {
    await executeWithRetry(async () => {
      try {
        // Ensure label exists first (idempotent)
        await this.ensureLabelExists(context, label)

        // Add label to PR
        await this.octokit.rest.issues.addLabels({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.prNumber,
          labels: [label]
        })
      } catch (error) {
        // If label already exists error (422), ignore it
        if (error instanceof Error && error.message.includes('already_exists')) {
          core.debug(`Label ${label} already exists on PR`)
          return
        }
        throw error
      }
    })
  }
}

/**
 * Get PR context from GitHub Actions context
 */
export function getPRContext(): PRContext | null {
  const context = github.context

  if (context.eventName !== 'pull_request') {
    core.warning('This action should be run on pull_request events')
    return null
  }

  const pr = context.payload.pull_request
  if (!pr) {
    core.warning('No pull request found in context')
    return null
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNumber: pr.number,
    prAuthor: pr.user?.login ?? ''
  }
}
