/**
 * PR comment generation
 */

import type { AnalysisResult } from '../types/scoring.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { MetricCheckResult } from '../types/metrics.js'

/** Unique marker to identify our comments for updates */
export const COMMENT_MARKER = '<!-- contributor-report-check -->'

/**
 * Generate PR comment with analysis results
 */
export function generateAnalysisComment(result: AnalysisResult, config: ContributorQualityConfig): string {
  const statusEmoji = result.passed ? '✅' : '⚠️'
  const statusText = result.passed ? 'Passed' : 'Needs Review'

  const lines: string[] = [
    COMMENT_MARKER,
    `## ${statusEmoji} Contributor Report`,
    '',
    `**User:** @${result.username}`,
    `**Status:** ${statusText} (${result.passedCount}/${result.totalMetrics} metrics passed)`,
    ''
  ]

  // Add note for new accounts
  if (result.isNewAccount) {
    lines.push(
      `> **Note:** This is a new GitHub account (< ${config.newAccountThresholdDays} days old). ` +
        'Limited history is available for evaluation.'
    )
    lines.push('')
  }

  // Add note for limited data
  if (result.hasLimitedData && !result.isNewAccount) {
    lines.push('> **Note:** Limited contribution data available. ' + 'Results may be affected.')
    lines.push('')
  }

  // Metric results table
  lines.push('| Metric | Description | Value | Threshold | Status |')
  lines.push('|--------|-------------|-------|-----------|--------|')

  for (const metric of result.metrics) {
    const statusIcon = metric.passed ? '✅' : '❌'
    const formattedValue = formatMetricValue(metric)
    const formattedThreshold = formatThreshold(metric)
    const description = getMetricDescription(metric.name, config.minimumStars)
    lines.push(
      `| ${formatMetricName(metric.name)} | ${description} | ${formattedValue} | ${formattedThreshold} | ${statusIcon} |`
    )
  }

  lines.push('')

  // Recommendations (only if there are failed metrics)
  if (result.recommendations.length > 0 && !result.passed) {
    lines.push('### Recommendations')
    lines.push('')
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push(
    `<sub>Contributor Report evaluates based on public GitHub activity. ` +
      `Analysis period: ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]}</sub>`
  )

  return lines.join('\n')
}

/**
 * Generate PR comment for passed check (compact version)
 */
export function generatePassedComment(result: AnalysisResult, minimumStars = 100): string {
  const lines: string[] = [
    COMMENT_MARKER,
    '## ✅ Contributor Report',
    '',
    `**User:** @${result.username}`,
    `**Status:** Passed (${result.passedCount}/${result.totalMetrics} metrics)`,
    '',
    '<details>',
    '<summary>View metric details</summary>',
    '',
    '| Metric | Description | Value | Threshold | Status |',
    '|--------|-------------|-------|-----------|--------|',
    ...result.metrics.map((m) => {
      const statusIcon = m.passed ? '✅' : '❌'
      const description = getMetricDescription(m.name, minimumStars)
      return `| ${formatMetricName(m.name)} | ${description} | ${formatMetricValue(m)} | ${formatThreshold(m)} | ${statusIcon} |`
    }),
    '',
    '</details>'
  ]

  return lines.join('\n')
}

/**
 * Generate PR comment for whitelisted user
 */
export function generateWhitelistComment(username: string): string {
  return [
    COMMENT_MARKER,
    '## ✅ Contributor Report',
    '',
    `**User:** @${username}`,
    `**Status:** Trusted contributor (whitelisted)`,
    '',
    'This user is on the trusted contributors list and was automatically approved.'
  ].join('\n')
}

/**
 * Format metric value for display
 */
function formatMetricValue(metric: MetricCheckResult): string {
  switch (metric.name) {
    case 'prMergeRate':
    case 'activityConsistency':
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
function formatThreshold(metric: MetricCheckResult): string {
  // Suspicious patterns has no configurable threshold
  if (metric.name === 'suspiciousPatterns') {
    return 'N/A'
  }

  // For negative reactions, it's a maximum (<=)
  if (metric.name === 'negativeReactions') {
    return `<= ${metric.threshold}`
  }

  // For percentages
  if (metric.name === 'prMergeRate' || metric.name === 'activityConsistency') {
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
 * Format metric name for display with documentation link
 */
function formatMetricName(name: string): string {
  const BASE_URL = 'https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/'

  const metricInfo: Record<string, { display: string; file: string; description: string }> = {
    prMergeRate: { display: 'PR Merge Rate', file: 'pr-merge-rate.md', description: 'PRs merged vs closed' },
    repoQuality: { display: 'Repo Quality', file: 'repo-quality.md', description: 'Contributions to starred repos' },
    positiveReactions: {
      display: 'Positive Reactions',
      file: 'positive-reactions.md',
      description: 'Positive reactions received'
    },
    negativeReactions: {
      display: 'Negative Reactions',
      file: 'negative-reactions.md',
      description: 'Negative reactions received'
    },
    accountAge: { display: 'Account Age', file: 'account-age.md', description: 'GitHub account age' },
    activityConsistency: {
      display: 'Activity Consistency',
      file: 'activity-consistency.md',
      description: 'Regular activity over time'
    },
    issueEngagement: {
      display: 'Issue Engagement',
      file: 'issue-engagement.md',
      description: 'Issues with community engagement'
    },
    codeReviews: { display: 'Code Reviews', file: 'code-reviews.md', description: 'Code reviews given to others' },
    mergerDiversity: {
      display: 'Merger Diversity',
      file: 'merger-diversity.md',
      description: 'Unique maintainers who merged PRs'
    },
    repoHistoryMergeRate: {
      display: 'Repo History Merge Rate',
      file: 'repo-history.md',
      description: 'Merge rate in this repo'
    },
    repoHistoryMinPRs: {
      display: 'Repo History Min PRs',
      file: 'repo-history.md',
      description: 'Previous PRs in this repo'
    },
    profileCompleteness: {
      display: 'Profile Completeness',
      file: 'profile-completeness.md',
      description: 'Profile richness (bio, followers)'
    },
    suspiciousPatterns: {
      display: 'Suspicious Patterns',
      file: 'suspicious-patterns.md',
      description: 'Spam-like activity detection'
    }
  }

  const info = metricInfo[name]
  if (info) {
    return `[${info.display}](${BASE_URL}${info.file})`
  }

  return name
}

/**
 * Get metric description for display
 */
function getMetricDescription(name: string, minimumStars?: number): string {
  const descriptions: Record<string, string> = {
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

  return descriptions[name] || ''
}
