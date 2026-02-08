/**
 * Shared output formatting utilities used by both comment.ts and formatter.ts
 */

import type { VerboseDetailsLevel } from '../types/config.js'
import type { MetricName } from '../types/metrics.js'

/** Base URL for metric documentation links */
const BASE_URL = 'https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/'

/** Metric display info for name formatting and documentation links */
const METRIC_INFO: Record<MetricName, { display: string; file: string }> = {
  prMergeRate: { display: 'PR Merge Rate', file: 'pr-merge-rate.md' },
  repoQuality: { display: 'Repo Quality', file: 'repo-quality.md' },
  positiveReactions: { display: 'Positive Reactions', file: 'positive-reactions.md' },
  negativeReactions: { display: 'Negative Reactions', file: 'negative-reactions.md' },
  accountAge: { display: 'Account Age', file: 'account-age.md' },
  activityConsistency: { display: 'Activity Consistency', file: 'activity-consistency.md' },
  issueEngagement: { display: 'Issue Engagement', file: 'issue-engagement.md' },
  codeReviews: { display: 'Code Reviews', file: 'code-reviews.md' },
  mergerDiversity: { display: 'Merger Diversity', file: 'merger-diversity.md' },
  repoHistoryMergeRate: { display: 'Repo History Merge Rate', file: 'repo-history.md' },
  repoHistoryMinPRs: { display: 'Repo History Min PRs', file: 'repo-history.md' },
  profileCompleteness: { display: 'Profile Completeness', file: 'profile-completeness.md' },
  suspiciousPatterns: { display: 'Suspicious Patterns', file: 'suspicious-patterns.md' }
}

/**
 * Format metric name for display with documentation link
 */
export function formatMetricName(name: MetricName): string {
  const info = METRIC_INFO[name]
  if (info) {
    return `[${info.display}](${BASE_URL}${info.file})`
  }
  return name
}

/**
 * Get metric description for display
 */
export function getMetricDescription(name: MetricName, minimumStars?: number): string {
  const descriptions: Record<MetricName, string> = {
    prMergeRate: 'PRs merged vs closed',
    repoQuality: `Repos with ≥${minimumStars ?? 100} stars`,
    positiveReactions: 'Positive reactions received',
    negativeReactions: 'Negative reactions received',
    accountAge: 'GitHub account age',
    activityConsistency: 'Regular activity over time',
    issueEngagement: 'Issues with community engagement',
    codeReviews: 'Code reviews given to others',
    mergerDiversity: 'Unique maintainers who merged PRs',
    repoHistoryMergeRate: 'Merge rate in this repo',
    repoHistoryMinPRs: 'Previous PRs in this repo',
    profileCompleteness: 'Profile richness (bio, followers)',
    suspiciousPatterns: 'Spam-like activity detection'
  }

  return descriptions[name]
}

/**
 * Format metric value for display
 */
export function formatMetricValue(metric: { name: MetricName; rawValue: number }): string {
  switch (metric.name) {
    case 'prMergeRate':
    case 'activityConsistency':
    case 'repoHistoryMergeRate':
      return `${(metric.rawValue * 100).toFixed(0)}%`
    case 'accountAge':
      return `${metric.rawValue} days`
    default:
      return `${metric.rawValue}`
  }
}

/**
 * Format threshold for display
 */
export function formatThreshold(metric: { name: MetricName; threshold: number }): string {
  // Suspicious patterns has no configurable threshold
  if (metric.name === 'suspiciousPatterns') {
    return 'N/A'
  }

  // For negative reactions, it's a maximum (<=)
  if (metric.name === 'negativeReactions') {
    return `<= ${metric.threshold}`
  }

  // For percentages
  if (
    metric.name === 'prMergeRate' ||
    metric.name === 'activityConsistency' ||
    metric.name === 'repoHistoryMergeRate'
  ) {
    return `>= ${(metric.threshold * 100).toFixed(0)}%`
  }

  // For account age
  if (metric.name === 'accountAge') {
    return `>= ${metric.threshold} days`
  }

  // Default (>=)
  return `>= ${metric.threshold}`
}

/**
 * Check if verbose details should be shown for a metric
 */
export function shouldShowVerboseDetails(verboseLevel: VerboseDetailsLevel, metricPassed: boolean): boolean {
  if (verboseLevel === 'none') return false
  if (verboseLevel === 'all') return true
  if (verboseLevel === 'failed') return !metricPassed
  return false
}
