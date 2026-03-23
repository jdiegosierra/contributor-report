/**
 * PR comment generation
 */

import type { AnalysisResult } from '../types/scoring.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { AllMetricsData, MetricName } from '../types/metrics.js'
import {
  formatMetricName,
  getMetricDescription,
  formatMetricValue,
  formatThreshold,
  shouldShowVerboseDetails
} from './shared.js'

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

  // Add verbose details after the table (if enabled)
  if (result.metricsData && config.verboseDetails !== 'none') {
    const verboseMetrics = result.metrics.filter((m) => shouldShowVerboseDetails(config.verboseDetails, m.passed))

    if (verboseMetrics.length > 0) {
      lines.push('### Metric Details')
      lines.push('')

      // Track which detail groups have been shown to avoid duplicates
      const shownGroups = new Set<string>()

      for (const metric of verboseMetrics) {
        const group = getMetricDetailGroup(metric.name)
        if (!shownGroups.has(group)) {
          shownGroups.add(group)
          lines.push(formatVerboseDetails(metric.name, result.metricsData))
          lines.push('')
        }
      }
    }
  }

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
 * Get the detail group for a metric (to avoid duplicate details)
 */
function getMetricDetailGroup(metricName: MetricName): string {
  const groups: Partial<Record<MetricName, string>> = {
    positiveReactions: 'reactions',
    negativeReactions: 'reactions',
    accountAge: 'account',
    activityConsistency: 'account',
    repoHistoryMergeRate: 'repoHistory',
    repoHistoryMinPRs: 'repoHistory'
  }
  return groups[metricName] ?? metricName
}

/**
 * Format verbose details for a specific metric
 */
export function formatVerboseDetails(metricName: MetricName, metricsData: AllMetricsData): string {
  switch (metricName) {
    case 'prMergeRate':
      return formatPRMergeRateDetails(metricsData)
    case 'repoQuality':
      return formatRepoQualityDetails(metricsData)
    case 'positiveReactions':
    case 'negativeReactions':
      return formatReactionsDetails(metricsData)
    case 'accountAge':
    case 'activityConsistency':
      return formatAccountDetails(metricsData)
    case 'issueEngagement':
      return formatIssueEngagementDetails(metricsData)
    case 'codeReviews':
      return formatCodeReviewsDetails(metricsData)
    case 'mergerDiversity':
      return formatMergerDiversityDetails(metricsData)
    case 'repoHistoryMergeRate':
    case 'repoHistoryMinPRs':
      return formatRepoHistoryDetails(metricsData)
    case 'profileCompleteness':
      return formatProfileCompletenessDetails(metricsData)
    case 'suspiciousPatterns':
      return formatSuspiciousPatternsDetails(metricsData)
    default:
      return ''
  }
}

/**
 * Format PR Merge Rate details
 */
function formatPRMergeRateDetails(metricsData: AllMetricsData): string {
  const data = metricsData.prHistory
  const mergeRate = (data.mergeRate * 100).toFixed(0)

  const lines = [
    `<details>`,
    `<summary>📊 ${mergeRate}% merge rate (${data.mergedPRs}/${data.totalPRs} PRs)</summary>`,
    '',
    `- Merged: ${data.mergedPRs}`,
    `- Closed without merge: ${data.closedWithoutMerge}`,
    `- Open: ${data.openPRs}`,
    `- Avg PR size: ${data.averagePRSize} lines`
  ]

  if (data.veryShortPRs > 0) {
    lines.push(`- Very short PRs (<10 lines): ${data.veryShortPRs}`)
  }

  lines.push('', '</details>')
  return lines.join('\n')
}

/**
 * Format Repo Quality details
 */
function formatRepoQualityDetails(metricsData: AllMetricsData): string {
  const data = metricsData.repoQuality

  if (data.contributedRepos.length === 0) {
    return [
      '<details>',
      '<summary>📊 No repository contributions found</summary>',
      '',
      'No merged PRs found in the analysis window.',
      '',
      '</details>'
    ].join('\n')
  }

  // Sort by stars descending, limit to top 5
  const topRepos = [...data.contributedRepos].sort((a, b) => b.stars - a.stars).slice(0, 5)

  const lines = [
    '<details>',
    `<summary>📊 ${data.qualityRepoCount} quality repos found</summary>`,
    '',
    '| Repository | Stars | PRs |',
    '|------------|-------|-----|'
  ]

  for (const repo of topRepos) {
    const starsFormatted = repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : `${repo.stars}`
    lines.push(`| ${repo.owner}/${repo.repo} | ${starsFormatted} | ${repo.mergedPRCount} |`)
  }

  if (data.contributedRepos.length > 5) {
    lines.push('', `_...and ${data.contributedRepos.length - 5} more repositories_`)
  }

  lines.push('', `Avg stars: ${Math.round(data.averageRepoStars)} | Highest: ${data.highestStarRepo}`)
  lines.push('', '</details>')
  return lines.join('\n')
}

/**
 * Format Reactions details
 */
function formatReactionsDetails(metricsData: AllMetricsData): string {
  const data = metricsData.reactions

  if (data.totalComments === 0) {
    return [
      '<details>',
      '<summary>👍 No comments analyzed</summary>',
      '',
      'No comments found in the analysis window.',
      '',
      '</details>'
    ].join('\n')
  }

  const positiveRatio = (data.positiveRatio * 100).toFixed(0)

  return [
    '<details>',
    `<summary>👍 ${data.positiveReactions} positive / ${data.negativeReactions} negative</summary>`,
    '',
    `- Comments analyzed: ${data.totalComments}`,
    `- Positive reactions: ${data.positiveReactions}`,
    `- Negative reactions: ${data.negativeReactions}`,
    `- Neutral reactions: ${data.neutralReactions}`,
    `- Positive ratio: ${positiveRatio}%`,
    '',
    '</details>'
  ].join('\n')
}

/**
 * Format Account details
 */
function formatAccountDetails(metricsData: AllMetricsData): string {
  const data = metricsData.account
  const createdDate = data.createdAt.toISOString().split('T')[0]
  const consistency = (data.consistencyScore * 100).toFixed(0)

  return [
    '<details>',
    `<summary>📅 Account: ${data.ageInDays} days old</summary>`,
    '',
    `- Created: ${createdDate}`,
    `- Active months: ${data.monthsWithActivity}/${data.totalMonthsInWindow}`,
    `- Consistency score: ${consistency}%`,
    '',
    '</details>'
  ].join('\n')
}

/**
 * Format Issue Engagement details
 */
function formatIssueEngagementDetails(metricsData: AllMetricsData): string {
  const data = metricsData.issueEngagement

  if (data.issuesCreated === 0) {
    return [
      '<details>',
      '<summary>💬 No issues created</summary>',
      '',
      'No issues found in the analysis window.',
      '',
      '</details>'
    ].join('\n')
  }

  return [
    '<details>',
    `<summary>💬 ${data.issuesWithComments} issues with engagement</summary>`,
    '',
    `- Issues created: ${data.issuesCreated}`,
    `- With comments from others: ${data.issuesWithComments}`,
    `- With reactions: ${data.issuesWithReactions}`,
    `- Avg comments per issue: ${data.averageCommentsPerIssue.toFixed(1)}`,
    '',
    '</details>'
  ].join('\n')
}

/**
 * Format Code Reviews details
 */
function formatCodeReviewsDetails(metricsData: AllMetricsData): string {
  const data = metricsData.codeReviews

  if (data.reviewsGiven === 0) {
    return [
      '<details>',
      '<summary>👀 No code reviews given</summary>',
      '',
      'No code reviews found in the analysis window.',
      '',
      '</details>'
    ].join('\n')
  }

  const lines = [
    '<details>',
    `<summary>👀 ${data.reviewsGiven} reviews given</summary>`,
    '',
    `- Reviews: ${data.reviewsGiven}`,
    `- Review comments: ${data.reviewCommentsGiven}`
  ]

  if (data.reviewedRepos.length > 0) {
    lines.push(
      `- Repos reviewed: ${data.reviewedRepos.slice(0, 3).join(', ')}${data.reviewedRepos.length > 3 ? '...' : ''}`
    )
  }

  lines.push('', '</details>')
  return lines.join('\n')
}

/**
 * Format Merger Diversity details
 */
function formatMergerDiversityDetails(metricsData: AllMetricsData): string {
  const data = metricsData.mergerDiversity

  if (data.totalMergedPRs === 0) {
    return [
      '<details>',
      '<summary>👥 No merged PRs</summary>',
      '',
      'No merged PRs found in the analysis window.',
      '',
      '</details>'
    ].join('\n')
  }

  const selfMergeRate = (data.selfMergeRate * 100).toFixed(0)
  const mergersList = data.mergerLogins
    .slice(0, 5)
    .map((m) => `@${m}`)
    .join(', ')

  const lines = ['<details>', `<summary>👥 ${data.uniqueMergers} unique maintainers</summary>`, '']

  if (data.mergerLogins.length > 0) {
    lines.push(`**Mergers:** ${mergersList}${data.mergerLogins.length > 5 ? '...' : ''}`)
    lines.push('')
  }

  lines.push(
    `- Self-merges: ${data.selfMergeCount} (own repos: ${data.selfMergesOnOwnRepos}, external: ${data.selfMergesOnExternalRepos})`
  )
  lines.push(`- Merged by others: ${data.othersMergeCount}`)
  lines.push(`- Self-merge rate: ${selfMergeRate}%`)

  if (data.externalReposWithMergePrivilege.length > 0) {
    lines.push(`- External repos with merge rights: ${data.externalReposWithMergePrivilege.join(', ')}`)
  }

  if (data.onlySelfMergesOnOwnRepos) {
    lines.push('')
    lines.push('⚠️ All merges are self-merges on own repositories')
  }

  lines.push('', '</details>')
  return lines.join('\n')
}

/**
 * Format Repo History details
 */
function formatRepoHistoryDetails(metricsData: AllMetricsData): string {
  const data = metricsData.repoHistory

  if (data.isFirstTimeContributor) {
    return [
      '<details>',
      '<summary>📁 First-time contributor</summary>',
      '',
      `Repository: ${data.repoName}`,
      'This is your first contribution to this repository!',
      '',
      '</details>'
    ].join('\n')
  }

  const mergeRate = (data.repoMergeRate * 100).toFixed(0)

  return [
    '<details>',
    `<summary>📁 ${data.totalPRsInRepo} previous PRs in this repo</summary>`,
    '',
    `- Repository: ${data.repoName}`,
    `- Merged: ${data.mergedPRsInRepo}`,
    `- Closed without merge: ${data.closedWithoutMergeInRepo}`,
    `- Repo merge rate: ${mergeRate}%`,
    '',
    '</details>'
  ].join('\n')
}

/**
 * Format Profile Completeness details
 */
function formatProfileCompletenessDetails(metricsData: AllMetricsData): string {
  const data = metricsData.profile

  const lines = [
    '<details>',
    `<summary>📝 Score: ${data.completenessScore}/100</summary>`,
    '',
    '| Component | Status | Points |',
    '|-----------|--------|--------|'
  ]

  // Followers (up to 40 points: 20 base + 10 at >=10 + 10 at >=50)
  let followerPoints = 0
  if (data.followersCount > 0) {
    followerPoints = 20
    if (data.followersCount >= 10) followerPoints += 10
    if (data.followersCount >= 50) followerPoints += 10
  }
  lines.push(`| Followers | ${data.followersCount} | +${followerPoints}/40 |`)

  // Public repos (up to 20 points: 15 base + 5 at >=5)
  let repoPoints = 0
  if (data.publicReposCount > 0) {
    repoPoints = 15
    if (data.publicReposCount >= 5) repoPoints += 5
  }
  lines.push(`| Public repos | ${data.publicReposCount} | +${repoPoints}/20 |`)

  // Bio (20 points)
  lines.push(`| Bio | ${data.hasBio ? '✅' : '❌'} | +${data.hasBio ? 20 : 0}/20 |`)

  // Company (20 points)
  lines.push(`| Company | ${data.hasCompany ? '✅' : '❌'} | +${data.hasCompany ? 20 : 0}/20 |`)

  lines.push('', '</details>')
  return lines.join('\n')
}

/**
 * Format Suspicious Patterns details
 */
function formatSuspiciousPatternsDetails(metricsData: AllMetricsData): string {
  const data = metricsData.suspiciousPatterns

  if (!data || data.detectedPatterns.length === 0) {
    return [
      '<details>',
      '<summary>✅ No suspicious patterns detected</summary>',
      '',
      'Activity appears normal.',
      '',
      '</details>'
    ].join('\n')
  }

  const criticalCount = data.detectedPatterns.filter((p) => p.severity === 'CRITICAL').length
  const warningCount = data.detectedPatterns.filter((p) => p.severity === 'WARNING').length

  const summaryParts = []
  if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`)
  if (warningCount > 0) summaryParts.push(`${warningCount} warning`)

  const lines = [
    '<details>',
    `<summary>🚨 ${data.detectedPatterns.length} patterns detected (${summaryParts.join(', ')})</summary>`,
    ''
  ]

  for (const pattern of data.detectedPatterns) {
    const icon = pattern.severity === 'CRITICAL' ? '🔴' : '🟡'
    lines.push(`**${icon} ${pattern.severity}: ${pattern.type}**`)
    lines.push(pattern.description)
    lines.push('')

    // Add evidence details
    const evidenceLines = Object.entries(pattern.evidence).map(([key, value]) => `- ${key}: ${value}`)
    lines.push(...evidenceLines)
    lines.push('')
  }

  lines.push('</details>')
  return lines.join('\n')
}
