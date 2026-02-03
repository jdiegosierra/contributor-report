/**
 * Shared test data factories to reduce duplication across tests
 */

import type { GraphQLContributorData } from '../src/types/github.js'
import type { ContributorQualityConfig } from '../src/types/config.js'
import type { MetricCheckResult, ReactionData, PRHistoryData, AccountData } from '../src/types/metrics.js'
import { DEFAULT_CONFIG } from '../src/config/defaults.js'

/**
 * Create a minimal GraphQLContributorData object with sensible defaults
 * Use overrides to customize specific fields for your test case
 */
export function createContributorData(
  overrides: {
    login?: string
    createdAt?: Date
    pullRequests?: Partial<GraphQLContributorData['user']['pullRequests']>
    contributionsCollection?: Partial<GraphQLContributorData['user']['contributionsCollection']>
    issueComments?: Partial<GraphQLContributorData['user']['issueComments']>
    issueSearch?: Partial<GraphQLContributorData['issueSearch']>
  } = {}
): GraphQLContributorData {
  const defaultCreatedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // 400 days ago

  return {
    user: {
      login: overrides.login ?? 'test-user',
      createdAt: (overrides.createdAt ?? defaultCreatedAt).toISOString(),
      pullRequests: {
        totalCount: 0,
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        ...overrides.pullRequests
      },
      contributionsCollection: {
        contributionCalendar: { totalContributions: 0, weeks: [] },
        pullRequestReviewContributions: { totalCount: 0 },
        ...overrides.contributionsCollection
      },
      issueComments: {
        totalCount: 0,
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        ...overrides.issueComments
      }
    },
    issueSearch: {
      issueCount: 0,
      nodes: [],
      ...overrides.issueSearch
    }
  }
}

/**
 * Create a PR node for use in test data
 */
export function createPRNode(
  overrides: {
    state?: 'MERGED' | 'CLOSED' | 'OPEN'
    merged?: boolean
    stars?: number
    additions?: number
    deletions?: number
    owner?: string
    repo?: string
  } = {}
): GraphQLContributorData['user']['pullRequests']['nodes'][0] {
  const state = overrides.state ?? 'MERGED'
  const merged = overrides.merged ?? state === 'MERGED'

  return {
    state,
    merged,
    mergedAt: merged ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    closedAt: state !== 'OPEN' ? new Date().toISOString() : null,
    additions: overrides.additions ?? 50,
    deletions: overrides.deletions ?? 20,
    repository: {
      owner: { login: overrides.owner ?? 'org' },
      name: overrides.repo ?? 'repo',
      stargazerCount: overrides.stars ?? 1000
    }
  }
}

/**
 * Create an issue comment node with reactions
 */
export function createCommentNode(
  reactions: string[] = ['THUMBS_UP']
): GraphQLContributorData['user']['issueComments']['nodes'][0] {
  return {
    reactions: {
      nodes: reactions.map((content) => ({ content }))
    }
  }
}

/**
 * Create an issue node for issueSearch
 */
export function createIssueNode(
  overrides: {
    typename?: 'Issue' | 'PullRequest'
    reactions?: string[]
    commentCount?: number
  } = {}
): GraphQLContributorData['issueSearch']['nodes'][0] {
  return {
    __typename: overrides.typename ?? 'Issue',
    createdAt: new Date().toISOString(),
    comments: { totalCount: overrides.commentCount ?? 0 },
    reactions: {
      nodes: (overrides.reactions ?? []).map((content) => ({ content }))
    }
  }
}

/**
 * Create a test config with custom thresholds
 */
export function createTestConfig(overrides: Partial<ContributorQualityConfig> = {}): ContributorQualityConfig {
  return {
    ...DEFAULT_CONFIG,
    githubToken: 'test-token',
    ...overrides
  }
}

/**
 * Create a MetricCheckResult for testing
 */
export function createMetricResult(overrides: Partial<MetricCheckResult> & { name: string }): MetricCheckResult {
  return {
    rawValue: 0,
    threshold: 0,
    passed: true,
    details: `Test metric ${overrides.name}`,
    dataPoints: 10,
    ...overrides
  }
}

/**
 * Create ReactionData for testing check functions
 */
export function createReactionData(overrides: Partial<ReactionData> = {}): ReactionData {
  return {
    totalComments: 10,
    positiveReactions: 5,
    negativeReactions: 1,
    neutralReactions: 2,
    positiveRatio: 0.625,
    ...overrides
  }
}

/**
 * Create PRHistoryData for testing check functions
 */
export function createPRHistoryData(overrides: Partial<PRHistoryData> = {}): PRHistoryData {
  return {
    totalPRs: 10,
    mergedPRs: 8,
    closedWithoutMerge: 2,
    openPRs: 0,
    mergeRate: 0.8,
    averagePRSize: 100,
    veryShortPRs: 0,
    mergedPRDates: [],
    ...overrides
  }
}

/**
 * Create AccountData for testing check functions
 */
export function createAccountData(overrides: Partial<AccountData> = {}): AccountData {
  return {
    createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
    ageInDays: 400,
    monthsWithActivity: 10,
    totalMonthsInWindow: 12,
    consistencyScore: 0.83,
    ...overrides
  }
}

/**
 * Create a contributor with good metrics (should pass most checks)
 */
export function createGoodContributor(): GraphQLContributorData {
  return createContributorData({
    login: 'good-contributor',
    pullRequests: {
      totalCount: 10,
      nodes: Array(8)
        .fill(null)
        .map(() => createPRNode({ state: 'MERGED', stars: 5000 }))
        .concat(
          Array(2)
            .fill(null)
            .map(() => createPRNode({ state: 'CLOSED', merged: false }))
        ),
      pageInfo: { hasNextPage: false, endCursor: null }
    },
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 200,
        weeks: Array(52)
          .fill(null)
          .map((_, i) => ({
            contributionDays: [
              { contributionCount: 5, date: `2024-${String(Math.floor(i / 4) + 1).padStart(2, '0')}-15` }
            ]
          }))
      },
      pullRequestReviewContributions: { totalCount: 15 }
    },
    issueComments: {
      totalCount: 10,
      nodes: Array(5)
        .fill(null)
        .map(() => createCommentNode(['THUMBS_UP', 'HEART'])),
      pageInfo: { hasNextPage: false, endCursor: null }
    },
    issueSearch: {
      issueCount: 3,
      nodes: [
        createIssueNode({ reactions: ['THUMBS_UP'], commentCount: 5 }),
        createIssueNode({ reactions: ['HEART'], commentCount: 3 })
      ]
    }
  })
}

/**
 * Create a new account contributor (< 30 days old)
 */
export function createNewAccountContributor(): GraphQLContributorData {
  return createContributorData({
    login: 'new-user',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
  })
}

/**
 * Create a contributor with minimal/limited data
 */
export function createLimitedDataContributor(): GraphQLContributorData {
  return createContributorData({
    login: 'limited-data-user',
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    contributionsCollection: {
      contributionCalendar: { totalContributions: 1, weeks: [] },
      pullRequestReviewContributions: { totalCount: 0 }
    }
  })
}
