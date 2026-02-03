/**
 * Merger diversity metric calculator
 * Measures trust through analyzing who merges contributor's PRs
 */

import * as core from '@actions/core'
import type { GraphQLContributorData } from '../types/github.js'
import type { MergerDiversityData, MetricCheckResult } from '../types/metrics.js'

/**
 * Extract merger diversity data from GraphQL response
 *
 * @param data - GraphQL contributor data
 * @param username - The contributor's username (for self-merge detection)
 * @param sinceDate - Filter PRs created after this date
 * @returns MergerDiversityData with merger analysis
 */
export function extractMergerDiversityData(
  data: GraphQLContributorData,
  username: string,
  sinceDate: Date
): MergerDiversityData {
  const userLower = username.toLowerCase()

  // Filter merged PRs within the analysis window
  const mergedPRs = data.user.pullRequests.nodes.filter((pr) => {
    if (!pr.merged || !pr.mergedAt) return false
    const mergedDate = new Date(pr.mergedAt)
    return mergedDate >= sinceDate
  })

  core.debug(`Merger diversity: analyzing ${mergedPRs.length} merged PRs for ${username}`)

  // Track unique mergers and categorize self-merges
  const mergerLogins = new Set<string>()
  let selfMergeCount = 0
  let othersMergeCount = 0
  let selfMergesOnOwnRepos = 0
  let selfMergesOnExternalRepos = 0
  const externalReposWithMergePrivilege = new Set<string>()

  for (const pr of mergedPRs) {
    const mergerLogin = pr.mergedBy?.login?.toLowerCase()
    const repoOwner = pr.repository?.owner?.login?.toLowerCase()

    if (mergerLogin) {
      mergerLogins.add(mergerLogin)

      if (mergerLogin === userLower) {
        // Self-merge detected
        selfMergeCount++

        if (repoOwner === userLower) {
          // Self-merge on own repository
          selfMergesOnOwnRepos++
        } else if (pr.repository) {
          // Self-merge on external repository (user has merge privilege)
          selfMergesOnExternalRepos++
          const repoFullName = `${pr.repository.owner.login}/${pr.repository.name}`
          externalReposWithMergePrivilege.add(repoFullName)
        }
      } else {
        othersMergeCount++
      }
    }
  }

  const totalMergedPRs = mergedPRs.length
  const selfMergeRate = totalMergedPRs > 0 ? selfMergeCount / totalMergedPRs : 0

  // RED FLAG: All merges are self-merges on own repos (no external trust)
  const onlySelfMergesOnOwnRepos =
    totalMergedPRs > 0 && selfMergesOnOwnRepos === totalMergedPRs && othersMergeCount === 0

  core.debug(
    `Merger diversity results: ${mergerLogins.size} unique mergers, ` +
      `${selfMergeCount} self-merges (${selfMergesOnOwnRepos} own repos, ${selfMergesOnExternalRepos} external), ` +
      `${othersMergeCount} by others, red flag: ${onlySelfMergesOnOwnRepos}`
  )

  return {
    totalMergedPRs,
    uniqueMergers: mergerLogins.size,
    selfMergeCount,
    othersMergeCount,
    selfMergesOnOwnRepos,
    selfMergesOnExternalRepos,
    externalReposWithMergePrivilege: Array.from(externalReposWithMergePrivilege),
    onlySelfMergesOnOwnRepos,
    selfMergeRate,
    mergerLogins: Array.from(mergerLogins)
  }
}

/**
 * Check merger diversity against threshold
 *
 * @param data - Extracted merger diversity data
 * @param threshold - Minimum unique mergers to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkMergerDiversity(data: MergerDiversityData, threshold: number): MetricCheckResult {
  // No merged PRs = neutral (pass if threshold is 0)
  if (data.totalMergedPRs === 0) {
    return {
      name: 'mergerDiversity',
      rawValue: 0,
      threshold,
      passed: threshold === 0,
      details: 'No merged PRs found in analysis window',
      dataPoints: 0
    }
  }

  // RED FLAG: All self-merges on own repos - this is a trust issue
  if (data.onlySelfMergesOnOwnRepos && threshold > 0) {
    return {
      name: 'mergerDiversity',
      rawValue: 0,
      threshold,
      passed: false,
      details: `All ${data.totalMergedPRs} merged PRs are self-merges on own repositories. No external trust demonstrated.`,
      dataPoints: data.totalMergedPRs
    }
  }

  const uniqueMergers = data.uniqueMergers
  const passed = uniqueMergers >= threshold

  let details: string
  const selfMergePercent = (data.selfMergeRate * 100).toFixed(0)

  if (data.externalReposWithMergePrivilege.length > 0) {
    // Has merge privilege on external repos - this is a trust signal
    details =
      `${uniqueMergers} unique maintainers merged PRs. ` +
      `Has merge rights on ${data.externalReposWithMergePrivilege.length} external repos. ` +
      `Self-merge rate: ${selfMergePercent}%`
  } else if (data.othersMergeCount > 0) {
    details =
      `${uniqueMergers} unique maintainers merged PRs. ` +
      `${data.othersMergeCount}/${data.totalMergedPRs} merged by others. ` +
      `Self-merge rate: ${selfMergePercent}%`
  } else {
    details = `${uniqueMergers} unique merger (self only). ` + `All ${data.totalMergedPRs} PRs are self-merges.`
  }

  if (threshold > 0) {
    details += passed ? ` (meets threshold >= ${threshold})` : ` (below threshold >= ${threshold})`
  }

  return {
    name: 'mergerDiversity',
    rawValue: uniqueMergers,
    threshold,
    passed,
    details,
    dataPoints: data.totalMergedPRs
  }
}
