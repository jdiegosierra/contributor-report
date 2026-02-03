/**
 * Reactions metric calculator
 */

import * as core from '@actions/core'
import type { GraphQLContributorData, GitHubReactionContent } from '../types/github.js'
import type { ReactionData, MetricCheckResult } from '../types/metrics.js'
import { POSITIVE_REACTIONS, NEGATIVE_REACTIONS } from '../types/metrics.js'

/**
 * Extract reaction data from GraphQL response
 * Counts reactions from both issue comments and issues created by the user
 */
export function extractReactionData(data: GraphQLContributorData): ReactionData {
  const comments = data.user.issueComments.nodes ?? []
  // Filter to only include Issue types with reactions
  const issues = (data.issueSearch?.nodes ?? []).filter(
    (issue) => issue.__typename === 'Issue' && issue.reactions?.nodes
  )

  core.debug(`Reaction sources: ${comments.length} comments, ${issues.length} issues`)

  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0

  // Count reactions from comments
  for (const comment of comments) {
    for (const reaction of comment.reactions.nodes) {
      const content = reaction.content as GitHubReactionContent

      if (POSITIVE_REACTIONS.includes(content as (typeof POSITIVE_REACTIONS)[number])) {
        positiveCount++
      } else if (NEGATIVE_REACTIONS.includes(content as (typeof NEGATIVE_REACTIONS)[number])) {
        negativeCount++
      } else {
        neutralCount++
      }
    }
  }

  // Count reactions from issues created by the user (from search results)
  for (const issue of issues) {
    for (const reaction of issue.reactions.nodes) {
      const content = reaction.content as GitHubReactionContent

      if (POSITIVE_REACTIONS.includes(content as (typeof POSITIVE_REACTIONS)[number])) {
        positiveCount++
      } else if (NEGATIVE_REACTIONS.includes(content as (typeof NEGATIVE_REACTIONS)[number])) {
        negativeCount++
      } else {
        neutralCount++
      }
    }
  }

  const totalReactions = positiveCount + negativeCount + neutralCount
  const positiveRatio = totalReactions > 0 ? positiveCount / totalReactions : 0.5

  return {
    totalComments: comments.length + issues.length,
    positiveReactions: positiveCount,
    negativeReactions: negativeCount,
    neutralReactions: neutralCount,
    positiveRatio
  }
}

/**
 * Check positive reactions against threshold
 *
 * @param data - Extracted reaction data
 * @param threshold - Minimum positive reactions to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkPositiveReactions(data: ReactionData, threshold: number): MetricCheckResult {
  const positiveCount = data.positiveReactions
  const passed = positiveCount >= threshold

  let details: string

  if (data.totalComments === 0) {
    details = 'No comments found in analysis window'
  } else if (positiveCount === 0) {
    details = 'No positive reactions received'
  } else {
    details = `${positiveCount} positive reactions received`
  }

  if (threshold > 0) {
    details += passed ? ` (meets threshold >= ${threshold})` : ` (below threshold >= ${threshold})`
  }

  return {
    name: 'positiveReactions',
    rawValue: positiveCount,
    threshold,
    passed,
    details,
    dataPoints: data.totalComments
  }
}

/**
 * Check negative reactions against threshold (maximum allowed)
 *
 * @param data - Extracted reaction data
 * @param threshold - Maximum negative reactions allowed to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkNegativeReactions(data: ReactionData, threshold: number): MetricCheckResult {
  const negativeCount = data.negativeReactions
  // For negative reactions, we pass if count is <= threshold (under the maximum)
  const passed = negativeCount <= threshold

  let details: string

  if (data.totalComments === 0) {
    details = 'No comments found in analysis window'
  } else if (negativeCount === 0) {
    details = 'No negative reactions received'
  } else {
    details = `${negativeCount} negative reactions received`
  }

  details += passed ? ` (within limit <= ${threshold})` : ` (exceeds limit <= ${threshold})`

  return {
    name: 'negativeReactions',
    rawValue: negativeCount,
    threshold,
    passed,
    details,
    dataPoints: data.totalComments
  }
}
