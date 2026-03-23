/**
 * Output formatting utilities
 */

import * as core from '@actions/core'
import type { AnalysisResult, ActionOutput } from '../types/scoring.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { AllMetricsData, MetricName } from '../types/metrics.js'
import { VALID_METRIC_NAMES } from '../config/defaults.js'
import {
  formatMetricName,
  getMetricDescription,
  formatMetricValue,
  formatThreshold,
  shouldShowVerboseDetails
} from './shared.js'

/**
 * Format analysis result for action outputs
 */
export function formatActionOutput(result: AnalysisResult): ActionOutput {
  // Create breakdown object
  const breakdown = {
    passed: result.passed,
    passedCount: result.passedCount,
    totalMetrics: result.totalMetrics,
    failedMetrics: result.failedMetrics,
    metrics: result.metrics.map((m) => ({
      name: m.name,
      rawValue: m.rawValue,
      threshold: m.threshold,
      passed: m.passed,
      details: m.details
    })),
    analysisWindow: {
      start: result.dataWindowStart.toISOString(),
      end: result.dataWindowEnd.toISOString()
    }
  }

  return {
    passed: result.passed,
    passedCount: result.passedCount,
    totalMetrics: result.totalMetrics,
    breakdown: JSON.stringify(breakdown),
    recommendations: JSON.stringify(result.recommendations),
    isNewAccount: result.isNewAccount,
    hasLimitedData: result.hasLimitedData,
    wasWhitelisted: result.wasWhitelisted
  }
}

/**
 * Set all action outputs
 */
export function setActionOutputs(result: AnalysisResult): void {
  const output = formatActionOutput(result)

  core.setOutput('passed', output.passed)
  core.setOutput('passed-count', output.passedCount)
  core.setOutput('total-metrics', output.totalMetrics)
  core.setOutput('breakdown', output.breakdown)
  core.setOutput('recommendations', output.recommendations)
  core.setOutput('is-new-account', output.isNewAccount)
  core.setOutput('has-limited-data', output.hasLimitedData)
  core.setOutput('was-whitelisted', output.wasWhitelisted)
}

/**
 * Set outputs for whitelisted user
 */
export function setWhitelistOutputs(username: string): void {
  core.setOutput('passed', true)
  core.setOutput('passed-count', VALID_METRIC_NAMES.length)
  core.setOutput('total-metrics', VALID_METRIC_NAMES.length)
  core.setOutput('breakdown', JSON.stringify({ whitelisted: true, username }))
  core.setOutput('recommendations', JSON.stringify([]))
  core.setOutput('is-new-account', false)
  core.setOutput('has-limited-data', false)
  core.setOutput('was-whitelisted', true)
}

/**
 * Log analysis result summary
 */
export function logResultSummary(result: AnalysisResult): void {
  core.info('')
  core.info('╔══════════════════════════════════════════════════╗')
  core.info('║         CONTRIBUTOR REPORT ANALYSIS              ║')
  core.info('╚══════════════════════════════════════════════════╝')
  core.info('')
  core.info(`  User:      @${result.username}`)
  core.info(
    `  Status:    ${result.passed ? '✓ PASSED' : '✗ NEEDS REVIEW'} (${result.passedCount}/${result.totalMetrics} metrics)`
  )
  core.info(
    `  Period:    ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]}`
  )
  core.info('')

  core.info('┌──────────────────────────────────────────────────────────────────┐')
  core.info('│ Metric               │ Value          │ Threshold      │ Status  │')
  core.info('├──────────────────────────────────────────────────────────────────┤')

  for (const metric of result.metrics) {
    const name = metric.name.padEnd(20)
    const value = formatMetricValue(metric).padEnd(14)
    const threshold = formatThreshold(metric).padEnd(14)
    const status = metric.passed ? '✓ Pass ' : '✗ Fail '
    core.info(`│ ${name} │ ${value} │ ${threshold} │ ${status} │`)
  }

  core.info('└──────────────────────────────────────────────────────────────────┘')

  if (result.failedMetrics.length > 0) {
    core.info('')
    core.info(`Failed metrics: ${result.failedMetrics.join(', ')}`)
  }

  if (result.recommendations.length > 0) {
    core.info('')
    core.info('Recommendations:')
    for (const rec of result.recommendations) {
      core.info(`  → ${rec}`)
    }
  }

  core.info('')
}

/**
 * Write analysis result to GitHub Job Summary
 */
export async function writeJobSummary(result: AnalysisResult, config: ContributorQualityConfig): Promise<void> {
  const statusEmoji = result.passed ? '✅' : '⚠️'
  const statusText = result.passed ? 'Passed' : 'Needs Review'

  core.summary
    .addHeading(`${statusEmoji} Contributor Report`, 2)
    .addRaw(
      `\n**User:** @${result.username}\n\n**Status:** ${statusText} (${result.passedCount}/${result.totalMetrics} metrics passed)\n\n`
    )

  // Add note for new accounts
  if (result.isNewAccount) {
    core.summary.addRaw(`> **Note:** This is a new GitHub account. Limited history is available for evaluation.\n\n`)
  }

  // Add note for limited data
  if (result.hasLimitedData && !result.isNewAccount) {
    core.summary.addRaw(`> **Note:** Limited contribution data available. Results may be affected.\n\n`)
  }

  core.summary.addTable([
    [
      { data: 'Metric', header: true },
      { data: 'Description', header: true },
      { data: 'Value', header: true },
      { data: 'Threshold', header: true },
      { data: 'Status', header: true }
    ],
    ...result.metrics.map((m) => [
      formatMetricName(m.name),
      getMetricDescription(m.name, config.minimumStars),
      formatMetricValue(m),
      formatThreshold(m),
      m.passed ? '✅' : '❌'
    ])
  ])

  // Add verbose details if enabled
  if (result.metricsData && config.verboseDetails !== 'none') {
    const metricsToShow = result.metrics.filter((m) => shouldShowVerboseDetails(config.verboseDetails, m.passed))

    if (metricsToShow.length > 0) {
      core.summary.addHeading('Metric Details', 3)

      // Track shown groups to avoid duplicate details for paired metrics
      const shownGroups = new Set<string>()

      for (const metric of metricsToShow) {
        const group = getMetricDetailGroup(metric.name)
        if (!shownGroups.has(group)) {
          shownGroups.add(group)
          const details = formatVerboseDetailsForSummary(metric.name, result.metricsData)
          if (details) {
            core.summary.addRaw(details)
          }
        }
      }
    }
  }

  // Recommendations (only if there are failed metrics)
  if (result.recommendations.length > 0 && !result.passed) {
    core.summary.addHeading('Recommendations', 3).addList(result.recommendations)
  }

  await core.summary
    .addRaw(`\n---\n`)
    .addRaw(
      `<sub>Analysis period: ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]}</sub>\n`
    )
    .write()
}

/**
 * Format verbose details for job summary (markdown format without HTML details tags)
 */
function formatVerboseDetailsForSummary(metricName: MetricName, metricsData: AllMetricsData): string {
  switch (metricName) {
    case 'prMergeRate': {
      const data = metricsData.prHistory
      return `\n**PR Merge Rate:** ${data.mergedPRs} merged, ${data.closedWithoutMerge} closed, ${data.openPRs} open (avg size: ${data.averagePRSize} lines)\n`
    }
    case 'repoQuality': {
      const data = metricsData.repoQuality
      const topRepos = [...data.contributedRepos]
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 3)
        .map((r) => `${r.owner}/${r.repo} (${r.stars} ⭐)`)
        .join(', ')
      return `\n**Repo Quality:** ${data.qualityRepoCount} quality repos. Top: ${topRepos || 'none'}\n`
    }
    case 'positiveReactions':
    case 'negativeReactions': {
      const data = metricsData.reactions
      return `\n**Reactions:** ${data.positiveReactions} positive, ${data.negativeReactions} negative from ${data.totalComments} comments\n`
    }
    case 'accountAge':
    case 'activityConsistency': {
      const data = metricsData.account
      return `\n**Account:** ${data.ageInDays} days old, active ${data.monthsWithActivity}/${data.totalMonthsInWindow} months\n`
    }
    case 'mergerDiversity': {
      const data = metricsData.mergerDiversity
      const mergers = data.mergerLogins.slice(0, 3).join(', ')
      return `\n**Merger Diversity:** ${data.uniqueMergers} unique mergers (${mergers}${data.mergerLogins.length > 3 ? '...' : ''}), self-merge rate: ${(data.selfMergeRate * 100).toFixed(0)}%\n`
    }
    case 'suspiciousPatterns': {
      const data = metricsData.suspiciousPatterns
      if (!data || data.detectedPatterns.length === 0) {
        return `\n**Suspicious Patterns:** None detected\n`
      }
      const patterns = data.detectedPatterns.map((p) => `${p.severity}: ${p.type}`).join(', ')
      return `\n**Suspicious Patterns:** ${patterns}\n`
    }
    case 'profileCompleteness': {
      const data = metricsData.profile
      const components = []
      if (data.hasBio) components.push('bio')
      if (data.hasCompany) components.push('company')
      if (data.followersCount > 0) components.push(`${data.followersCount} followers`)
      return `\n**Profile:** Score ${data.completenessScore}/100 (${components.join(', ') || 'incomplete'})\n`
    }
    default:
      return ''
  }
}

/**
 * Get the detail group for a metric (to avoid duplicate details for paired metrics)
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
 * Write whitelisted user summary to GitHub Job Summary
 */
export async function writeWhitelistSummary(username: string): Promise<void> {
  await core.summary
    .addHeading('Contributor Report Analysis', 2)
    .addRaw(`✅ **@${username}** is a trusted contributor and was automatically approved.\n`)
    .write()
}
