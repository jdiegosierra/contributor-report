/**
 * Main entry point for the Contributor Report GitHub Action
 */

import * as core from '@actions/core'
import { parseInputs } from './config/index.js'
import { GitHubClient, getPRContext } from './api/index.js'
import { evaluateContributor } from './scoring/index.js'
import { generateAnalysisComment, generateWhitelistComment, COMMENT_MARKER } from './output/comment.js'
import {
  setActionOutputs,
  setWhitelistOutputs,
  logResultSummary,
  writeJobSummary,
  writeWhitelistSummary
} from './output/formatter.js'
import type { AnalysisResult } from './types/scoring.js'

/**
 * Main action function
 */
export async function run(): Promise<void> {
  try {
    // Parse configuration from inputs
    const config = parseInputs()

    // Get PR context
    const prContext = getPRContext()
    if (!prContext) {
      core.setFailed('Could not determine PR context. Is this running on a pull_request event?')
      return
    }

    const username = prContext.prAuthor
    core.info(`Analyzing contributor: ${username}`)

    // Initialize GitHub client
    const client = new GitHubClient(config.githubToken)

    // Check if user is in whitelist
    if (config.trustedUsers.includes(username)) {
      core.info(`User ${username} is in trusted users list, skipping analysis`)
      setWhitelistOutputs(username)
      await writeWhitelistSummary(username)

      // Always comment (upsert)
      if (!config.dryRun) {
        const comment = generateWhitelistComment(username)
        await client.upsertPRComment(prContext, comment, COMMENT_MARKER)
      }
      return
    }

    // Check organization membership
    if (config.trustedOrgs.length > 0) {
      const isMember = await client.checkOrgMembership(username, config.trustedOrgs)
      if (isMember) {
        core.info(`User ${username} is member of a trusted organization, skipping analysis`)
        setWhitelistOutputs(username)
        await writeWhitelistSummary(username)

        // Always comment (upsert)
        if (!config.dryRun) {
          const comment = generateWhitelistComment(username)
          await client.upsertPRComment(prContext, comment, COMMENT_MARKER)
        }
        return
      }
    }

    // Calculate analysis window
    const now = new Date()
    const sinceDate = new Date(now)
    sinceDate.setMonth(sinceDate.getMonth() - config.analysisWindowMonths)

    // Fetch contributor data
    core.info(
      `Analysis window: ${config.analysisWindowMonths} months (${sinceDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]})`
    )
    const contributorData = await client.fetchContributorData(username, sinceDate)

    // Evaluate contributor against thresholds
    core.info('Evaluating contributor metrics...')
    const result = evaluateContributor(contributorData, config, sinceDate, prContext)

    // Log results
    logResultSummary(result)

    // Write Job Summary
    await writeJobSummary(result)

    // Set outputs
    setActionOutputs(result)

    // Always post/update comment with results
    if (!config.dryRun) {
      const comment = generateAnalysisComment(result, config)
      await client.upsertPRComment(prContext, comment, COMMENT_MARKER)
    } else {
      core.info('[DRY RUN] Would post/update comment')
    }

    // Handle new account action
    if (result.isNewAccount && config.newAccountAction !== 'neutral') {
      await handleNewAccount(result, config, client, prContext)
      return
    }

    // Handle failed check based on configuration
    if (!result.passed) {
      await handleFailedCheck(result, config, client, prContext)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`)
      core.debug(error.stack ?? '')
    } else {
      core.setFailed('Action failed with unknown error')
    }
  }
}

/**
 * Handle new account based on configuration
 */
async function handleNewAccount(
  result: AnalysisResult,
  config: ReturnType<typeof parseInputs>,
  client: GitHubClient,
  prContext: NonNullable<ReturnType<typeof getPRContext>>
): Promise<void> {
  core.info(`New account detected (${result.isNewAccount ? 'new' : 'established'})`)

  switch (config.newAccountAction) {
    case 'require-review':
      if (!config.dryRun) {
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Added label "${config.labelName}" for new account review`)
      } else {
        core.info(`[DRY RUN] Would add label "${config.labelName}"`)
      }
      break

    case 'block':
      core.setFailed(`New accounts (< ${config.newAccountThresholdDays} days) are not allowed to submit PRs`)
      break

    case 'neutral':
    default:
      // No special handling
      break
  }
}

/**
 * Handle failed check based on configuration
 */
async function handleFailedCheck(
  result: AnalysisResult,
  config: ReturnType<typeof parseInputs>,
  client: GitHubClient,
  prContext: NonNullable<ReturnType<typeof getPRContext>>
): Promise<void> {
  core.warning(`Contributor check failed: ${result.failedMetrics.length} required metrics not met`)

  switch (config.onFail) {
    case 'comment':
      // Comment already handled above (always comment)
      break

    case 'label':
      if (!config.dryRun) {
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Added label "${config.labelName}"`)
      } else {
        core.info(`[DRY RUN] Would add label "${config.labelName}"`)
      }
      break

    case 'comment-and-label':
      // Comment already handled above
      if (!config.dryRun) {
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Added label "${config.labelName}"`)
      } else {
        core.info(`[DRY RUN] Would add label`)
      }
      break

    case 'fail':
      core.setFailed(`Contributor report check failed: ${result.failedMetrics.join(', ')} did not meet thresholds`)
      break

    case 'none':
    default:
      core.info('Failed check action set to "none", no additional action taken')
      break
  }
}
