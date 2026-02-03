/**
 * Suspicious activity pattern detector
 * Analyzes cross-metric data to detect spam patterns
 */

import * as core from '@actions/core'
import type {
  SuspiciousPatternData,
  SuspiciousPattern,
  MetricCheckResult,
  PRHistoryData,
  RepoQualityData,
  AccountData,
  MergerDiversityData
} from '../types/metrics.js'

/**
 * Default thresholds for spam pattern detection
 * These can be overridden via configuration
 */
export const SPAM_DETECTION_THRESHOLDS = {
  /** Account age in days to consider "new" for spam detection */
  NEW_ACCOUNT_DAYS: 30,
  /** PR count that triggers spam pattern for new accounts */
  NEW_ACCOUNT_HIGH_PR_COUNT: 25,
  /** Repo count that triggers spam pattern for new accounts */
  NEW_ACCOUNT_HIGH_REPO_COUNT: 10,
  /** PR rate (PRs per day) that triggers warning */
  HIGH_PR_RATE: 2.0,
  /** Self-merge rate on low-quality repos that triggers pattern */
  SELF_MERGE_ABUSE_RATE: 0.5,
  /** Minimum stars to not be considered "low quality" */
  LOW_QUALITY_REPO_STARS: 10,
  /** Number of repos that triggers repo spam check */
  REPO_SPAM_COUNT: 10,
  /** Average stars below which repo spam is flagged */
  REPO_SPAM_AVG_STARS: 10
} as const

/**
 * Input data structure for suspicious pattern analysis
 * This combines data from multiple metrics
 */
interface SuspiciousPatternInput {
  prHistory: PRHistoryData
  repoQuality: RepoQualityData
  account: AccountData
  mergerDiversity: MergerDiversityData
}

/**
 * Extract suspicious pattern data from aggregated metrics
 *
 * @param metrics - Aggregated metrics data
 * @param username - The contributor's username
 * @returns SuspiciousPatternData with detected patterns
 */
export function extractSuspiciousPatterns(metrics: SuspiciousPatternInput, username: string): SuspiciousPatternData {
  const detectedPatterns: SuspiciousPattern[] = []

  const accountAgeInDays = metrics.account.ageInDays
  const totalPRs = metrics.prHistory.totalPRs
  const uniqueRepoCount = metrics.repoQuality.contributedRepos.length
  const selfMergeRate = metrics.mergerDiversity.selfMergeRate
  const prRate = accountAgeInDays > 0 ? totalPRs / accountAgeInDays : totalPRs

  core.debug(
    `Suspicious pattern analysis for ${username}: ` +
      `account age=${accountAgeInDays}d, PRs=${totalPRs}, repos=${uniqueRepoCount}, ` +
      `self-merge rate=${(selfMergeRate * 100).toFixed(1)}%, PR rate=${prRate.toFixed(2)}/day`
  )

  // Pattern 1: SPAM_PATTERN (CRITICAL)
  // New account + high PR volume + many repos = classic spam pattern
  if (
    accountAgeInDays < SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_DAYS &&
    totalPRs > SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_HIGH_PR_COUNT &&
    uniqueRepoCount > SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_HIGH_REPO_COUNT
  ) {
    detectedPatterns.push({
      type: 'SPAM_PATTERN',
      severity: 'CRITICAL',
      description:
        `New account (${accountAgeInDays} days) with unusually high activity: ` +
        `${totalPRs} PRs across ${uniqueRepoCount} different repositories.`,
      evidence: {
        accountAgeDays: accountAgeInDays,
        totalPRs,
        uniqueRepoCount,
        threshold_accountAge: SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_DAYS,
        threshold_prCount: SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_HIGH_PR_COUNT,
        threshold_repoCount: SPAM_DETECTION_THRESHOLDS.NEW_ACCOUNT_HIGH_REPO_COUNT
      }
    })
  }

  // Pattern 2: HIGH_PR_RATE (WARNING)
  // Abnormally high PR submission rate
  if (prRate > SPAM_DETECTION_THRESHOLDS.HIGH_PR_RATE) {
    detectedPatterns.push({
      type: 'HIGH_PR_RATE',
      severity: 'WARNING',
      description:
        `High PR submission rate: ${prRate.toFixed(2)} PRs/day over account lifetime. ` +
        `This may indicate automated or low-quality submissions.`,
      evidence: {
        prRate: parseFloat(prRate.toFixed(2)),
        totalPRs,
        accountAgeDays: accountAgeInDays,
        threshold: SPAM_DETECTION_THRESHOLDS.HIGH_PR_RATE
      }
    })
  }

  // Pattern 3: SELF_MERGE_ABUSE (CRITICAL)
  // High rate of self-merges on low-quality repos (< 10 stars)
  const lowQualityRepos = metrics.repoQuality.contributedRepos.filter(
    (repo) => repo.stars < SPAM_DETECTION_THRESHOLDS.LOW_QUALITY_REPO_STARS
  )
  const lowQualityPRs = lowQualityRepos.reduce((sum, repo) => sum + repo.mergedPRCount, 0)
  const totalMergedPRs = metrics.mergerDiversity.totalMergedPRs

  if (
    totalMergedPRs > 0 &&
    selfMergeRate > SPAM_DETECTION_THRESHOLDS.SELF_MERGE_ABUSE_RATE &&
    lowQualityPRs / totalMergedPRs > SPAM_DETECTION_THRESHOLDS.SELF_MERGE_ABUSE_RATE
  ) {
    detectedPatterns.push({
      type: 'SELF_MERGE_ABUSE',
      severity: 'CRITICAL',
      description:
        `High rate of self-merges on low-quality repositories. ` +
        `${(selfMergeRate * 100).toFixed(0)}% self-merge rate with ` +
        `${lowQualityPRs}/${totalMergedPRs} PRs to repos with <${SPAM_DETECTION_THRESHOLDS.LOW_QUALITY_REPO_STARS} stars.`,
      evidence: {
        selfMergeRate: parseFloat((selfMergeRate * 100).toFixed(1)),
        lowQualityPRs,
        totalMergedPRs,
        lowQualityRepoCount: lowQualityRepos.length,
        threshold_selfMergeRate: SPAM_DETECTION_THRESHOLDS.SELF_MERGE_ABUSE_RATE * 100,
        threshold_stars: SPAM_DETECTION_THRESHOLDS.LOW_QUALITY_REPO_STARS
      }
    })
  }

  // Pattern 4: REPO_SPAM (WARNING)
  // Many repos but all low quality
  if (
    uniqueRepoCount > SPAM_DETECTION_THRESHOLDS.REPO_SPAM_COUNT &&
    metrics.repoQuality.averageRepoStars < SPAM_DETECTION_THRESHOLDS.REPO_SPAM_AVG_STARS
  ) {
    detectedPatterns.push({
      type: 'REPO_SPAM',
      severity: 'WARNING',
      description:
        `Contributions spread across ${uniqueRepoCount} repositories with an average of only ` +
        `${metrics.repoQuality.averageRepoStars.toFixed(0)} stars. May indicate targeting of low-quality repos.`,
      evidence: {
        uniqueRepoCount,
        averageStars: parseFloat(metrics.repoQuality.averageRepoStars.toFixed(1)),
        threshold_repoCount: SPAM_DETECTION_THRESHOLDS.REPO_SPAM_COUNT,
        threshold_avgStars: SPAM_DETECTION_THRESHOLDS.REPO_SPAM_AVG_STARS
      }
    })
  }

  if (detectedPatterns.length > 0) {
    core.debug(`Detected ${detectedPatterns.length} suspicious patterns for ${username}`)
    for (const pattern of detectedPatterns) {
      core.debug(`  - ${pattern.type} (${pattern.severity}): ${pattern.description}`)
    }
  } else {
    core.debug(`No suspicious patterns detected for ${username}`)
  }

  return {
    detectedPatterns,
    prRate,
    uniqueRepoCount,
    selfMergeRate,
    accountAgeInDays
  }
}

/**
 * Check if there are any critical spam patterns
 *
 * @param data - Suspicious pattern data
 * @returns true if any critical patterns detected
 */
export function hasCriticalSpamPatterns(data: SuspiciousPatternData): boolean {
  return data.detectedPatterns.some((pattern) => pattern.severity === 'CRITICAL')
}

/**
 * Check suspicious patterns (hard fail on critical patterns)
 *
 * @param data - Extracted suspicious pattern data
 * @returns MetricCheckResult with pass/fail status
 */
export function checkSuspiciousPatterns(data: SuspiciousPatternData): MetricCheckResult {
  const criticalPatterns = data.detectedPatterns.filter((p) => p.severity === 'CRITICAL')
  const warningPatterns = data.detectedPatterns.filter((p) => p.severity === 'WARNING')

  // No patterns = pass
  if (data.detectedPatterns.length === 0) {
    return {
      name: 'suspiciousPatterns',
      rawValue: 0,
      threshold: 0,
      passed: true,
      details: 'No suspicious activity patterns detected.',
      dataPoints: 1
    }
  }

  // Critical patterns = hard fail
  if (criticalPatterns.length > 0) {
    const patternTypes = criticalPatterns.map((p) => p.type).join(', ')
    return {
      name: 'suspiciousPatterns',
      rawValue: criticalPatterns.length,
      threshold: 0,
      passed: false,
      details:
        `CRITICAL: ${criticalPatterns.length} suspicious pattern(s) detected: ${patternTypes}. ` +
        criticalPatterns.map((p) => p.description).join(' '),
      dataPoints: 1
    }
  }

  // Warnings only = pass but note in details
  const patternTypes = warningPatterns.map((p) => p.type).join(', ')
  return {
    name: 'suspiciousPatterns',
    rawValue: warningPatterns.length,
    threshold: 0,
    passed: true,
    details:
      `${warningPatterns.length} warning pattern(s) noted: ${patternTypes}. ` +
      warningPatterns.map((p) => p.description).join(' '),
    dataPoints: 1
  }
}
