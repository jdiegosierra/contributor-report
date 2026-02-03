/**
 * Repository history metric calculator
 * Measures contributor's track record in a specific repository
 */

import * as core from '@actions/core'
import type { GraphQLContributorData, PRContext } from '../types/github.js'
import type { RepoHistoryData, MetricCheckResult } from '../types/metrics.js'

/**
 * Extract repository-specific history data from GraphQL response
 *
 * @param data - GraphQL contributor data
 * @param prContext - Context of the PR (owner, repo)
 * @param sinceDate - Filter PRs created after this date
 * @returns RepoHistoryData with repository-specific metrics
 */
export function extractRepoHistoryData(
  data: GraphQLContributorData,
  prContext: PRContext,
  sinceDate: Date
): RepoHistoryData {
  const targetRepo = `${prContext.owner}/${prContext.repo}`.toLowerCase()

  // Filter PRs to only those in the target repository within the analysis window
  const repoPRs = data.user.pullRequests.nodes.filter((pr) => {
    if (!pr.repository) return false
    const prRepo = `${pr.repository.owner.login}/${pr.repository.name}`.toLowerCase()
    if (prRepo !== targetRepo) return false

    const prDate = new Date(pr.createdAt)
    return prDate >= sinceDate
  })

  const mergedPRs = repoPRs.filter((pr) => pr.merged)
  const closedWithoutMerge = repoPRs.filter((pr) => pr.state === 'CLOSED' && !pr.merged)

  // Calculate merge rate only from resolved PRs (not open ones)
  const resolvedPRs = mergedPRs.length + closedWithoutMerge.length
  const repoMergeRate = resolvedPRs > 0 ? mergedPRs.length / resolvedPRs : 0

  // First-time contributor if no previous merged PRs in this repo
  const isFirstTimeContributor = mergedPRs.length === 0

  core.debug(
    `Repo history for ${targetRepo}: ${repoPRs.length} total PRs, ` +
      `${mergedPRs.length} merged, ${closedWithoutMerge.length} closed without merge, ` +
      `merge rate: ${(repoMergeRate * 100).toFixed(1)}%, first-time: ${isFirstTimeContributor}`
  )

  return {
    repoName: `${prContext.owner}/${prContext.repo}`,
    totalPRsInRepo: repoPRs.length,
    mergedPRsInRepo: mergedPRs.length,
    closedWithoutMergeInRepo: closedWithoutMerge.length,
    repoMergeRate,
    isFirstTimeContributor
  }
}

/**
 * Check repository merge rate against threshold
 *
 * @param data - Extracted repo history data
 * @param threshold - Minimum merge rate (0-1) to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkRepoHistoryMergeRate(data: RepoHistoryData, threshold: number): MetricCheckResult {
  // No PRs in this repo = first-time contributor, handle specially
  if (data.totalPRsInRepo === 0) {
    return {
      name: 'repoHistoryMergeRate',
      rawValue: 0,
      threshold,
      passed: threshold === 0,
      details: `First-time contributor to ${data.repoName}. No prior PR history.`,
      dataPoints: 0
    }
  }

  // No resolved PRs yet (all open) = neutral
  if (data.mergedPRsInRepo + data.closedWithoutMergeInRepo === 0) {
    return {
      name: 'repoHistoryMergeRate',
      rawValue: 0,
      threshold,
      passed: threshold === 0,
      details: `All ${data.totalPRsInRepo} PRs in ${data.repoName} are still open.`,
      dataPoints: data.totalPRsInRepo
    }
  }

  const mergeRate = data.repoMergeRate
  const passed = mergeRate >= threshold

  const mergeRatePercent = (mergeRate * 100).toFixed(1)
  const thresholdPercent = (threshold * 100).toFixed(0)
  const prInfo = `${data.mergedPRsInRepo}/${data.mergedPRsInRepo + data.closedWithoutMergeInRepo} PRs merged`

  let details: string
  if (passed) {
    details = `Repo merge rate ${mergeRatePercent}% meets threshold (>= ${thresholdPercent}%). ${prInfo} in ${data.repoName}`
  } else {
    details = `Repo merge rate ${mergeRatePercent}% below threshold (>= ${thresholdPercent}%). ${prInfo} in ${data.repoName}`
  }

  return {
    name: 'repoHistoryMergeRate',
    rawValue: mergeRate,
    threshold,
    passed,
    details,
    dataPoints: data.totalPRsInRepo
  }
}

/**
 * Check minimum PRs in repository against threshold
 *
 * @param data - Extracted repo history data
 * @param threshold - Minimum number of previous PRs to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkRepoHistoryMinPRs(data: RepoHistoryData, threshold: number): MetricCheckResult {
  const totalPRs = data.totalPRsInRepo
  const passed = totalPRs >= threshold

  let details: string
  if (data.isFirstTimeContributor) {
    details = `First-time contributor to ${data.repoName}. No prior PR history.`
  } else if (passed) {
    details = `Has ${totalPRs} PRs in ${data.repoName} (meets threshold >= ${threshold})`
  } else {
    details = `Has ${totalPRs} PRs in ${data.repoName} (below threshold >= ${threshold})`
  }

  return {
    name: 'repoHistoryMinPRs',
    rawValue: totalPRs,
    threshold,
    passed,
    details,
    dataPoints: totalPRs
  }
}
