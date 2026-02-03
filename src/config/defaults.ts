/**
 * Default configuration values
 */

import type { ContributorQualityConfig, MetricThresholds, FailAction, NewAccountAction } from '../types/config.js'

import { DEFAULT_THRESHOLDS, DEFAULT_REQUIRED_METRICS, DEFAULT_TRUSTED_USERS } from '../types/config.js'

// Re-export for convenience
export { DEFAULT_THRESHOLDS, DEFAULT_REQUIRED_METRICS, DEFAULT_TRUSTED_USERS }

/** Default configuration values */
export const DEFAULT_CONFIG: Omit<ContributorQualityConfig, 'githubToken'> = {
  thresholds: DEFAULT_THRESHOLDS,
  requiredMetrics: DEFAULT_REQUIRED_METRICS,
  minimumStars: 100,
  analysisWindowMonths: 12,
  trustedUsers: DEFAULT_TRUSTED_USERS,
  trustedOrgs: [],
  onFail: 'comment' as FailAction,
  labelName: 'needs-review',
  dryRun: false,
  newAccountAction: 'neutral' as NewAccountAction,
  newAccountThresholdDays: 30,
  enableSpamDetection: true
}

/** Validate threshold values */
export function validateThresholds(thresholds: MetricThresholds): void {
  if (thresholds.prMergeRate < 0 || thresholds.prMergeRate > 1) {
    throw new Error(`prMergeRate threshold must be between 0 and 1, got ${thresholds.prMergeRate}`)
  }

  if (thresholds.activityConsistency < 0 || thresholds.activityConsistency > 1) {
    throw new Error(`activityConsistency threshold must be between 0 and 1, got ${thresholds.activityConsistency}`)
  }

  if (thresholds.accountAge < 0) {
    throw new Error(`accountAge threshold must be non-negative, got ${thresholds.accountAge}`)
  }

  if (thresholds.negativeReactions < 0) {
    throw new Error(`negativeReactions threshold must be non-negative, got ${thresholds.negativeReactions}`)
  }

  if (thresholds.mergerDiversity < 0) {
    throw new Error(`mergerDiversity threshold must be non-negative, got ${thresholds.mergerDiversity}`)
  }

  if (thresholds.repoHistoryMergeRate < 0 || thresholds.repoHistoryMergeRate > 1) {
    throw new Error(`repoHistoryMergeRate threshold must be between 0 and 1, got ${thresholds.repoHistoryMergeRate}`)
  }

  if (thresholds.repoHistoryMinPRs < 0) {
    throw new Error(`repoHistoryMinPRs threshold must be non-negative, got ${thresholds.repoHistoryMinPRs}`)
  }

  if (thresholds.profileCompleteness < 0 || thresholds.profileCompleteness > 100) {
    throw new Error(`profileCompleteness threshold must be between 0 and 100, got ${thresholds.profileCompleteness}`)
  }
}

/** Merge custom thresholds with defaults */
export function mergeThresholds(custom: Partial<MetricThresholds>): MetricThresholds {
  return {
    ...DEFAULT_THRESHOLDS,
    ...custom
  }
}

/** Valid metric names for required-metrics validation */
export const VALID_METRIC_NAMES = [
  'prMergeRate',
  'repoQuality',
  'positiveReactions',
  'negativeReactions',
  'accountAge',
  'activityConsistency',
  'issueEngagement',
  'codeReviews',
  'mergerDiversity',
  'repoHistoryMergeRate',
  'repoHistoryMinPRs',
  'profileCompleteness',
  'suspiciousPatterns'
] as const

/** Validate required metrics list */
export function validateRequiredMetrics(metrics: string[]): string[] {
  const valid = metrics.filter((m) => VALID_METRIC_NAMES.includes(m as (typeof VALID_METRIC_NAMES)[number]))
  const invalid = metrics.filter((m) => !VALID_METRIC_NAMES.includes(m as (typeof VALID_METRIC_NAMES)[number]))

  if (invalid.length > 0) {
    throw new Error(`Invalid metric names in required-metrics: ${invalid.join(', ')}`)
  }

  return valid
}
