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
  lines.push('### Metric Results')
  lines.push('')
  lines.push('| Metric | Value | Threshold | Status |')
  lines.push('|--------|-------|-----------|--------|')

  for (const metric of result.metrics) {
    const statusIcon = metric.passed ? '✅' : '❌'
    const formattedValue = formatMetricValue(metric)
    const formattedThreshold = formatThreshold(metric)
    lines.push(`| ${formatMetricName(metric.name)} | ${formattedValue} | ${formattedThreshold} | ${statusIcon} |`)
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
export function generatePassedComment(result: AnalysisResult): string {
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
    '| Metric | Value | Threshold | Status |',
    '|--------|-------|-----------|--------|',
    ...result.metrics.map((m) => {
      const statusIcon = m.passed ? '✅' : '❌'
      return `| ${formatMetricName(m.name)} | ${formatMetricValue(m)} | ${formatThreshold(m)} | ${statusIcon} |`
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
  const BASE_URL = 'https://github.com/jdiegosierra/contributor-report?tab=readme-ov-file#'

  const metricInfo: Record<string, { display: string; anchor: string }> = {
    prMergeRate: { display: 'PR Merge Rate', anchor: 'pr-merge-rate' },
    repoQuality: { display: 'Repo Quality', anchor: 'repo-quality' },
    positiveReactions: { display: 'Positive Reactions', anchor: 'positive-reactions' },
    negativeReactions: { display: 'Negative Reactions', anchor: 'negative-reactions' },
    accountAge: { display: 'Account Age', anchor: 'account-age' },
    activityConsistency: { display: 'Activity Consistency', anchor: 'activity-consistency' },
    issueEngagement: { display: 'Issue Engagement', anchor: 'issue-engagement' },
    codeReviews: { display: 'Code Reviews', anchor: 'code-reviews' }
  }

  const info = metricInfo[name]
  if (info) {
    return `[${info.display}](${BASE_URL}${info.anchor})`
  }

  return name
}
