/**
 * Output formatting utilities
 */

import * as core from '@actions/core'
import type { AnalysisResult, ActionOutput } from '../types/scoring.js'

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
  core.setOutput('passed-count', 8)
  core.setOutput('total-metrics', 8)
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
    const value = formatValueForLog(metric).padEnd(14)
    const threshold = formatThresholdForLog(metric).padEnd(14)
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
export async function writeJobSummary(result: AnalysisResult): Promise<void> {
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

  core.summary.addHeading('Metric Results', 3).addTable([
    [
      { data: 'Metric', header: true },
      { data: 'Value', header: true },
      { data: 'Threshold', header: true },
      { data: 'Status', header: true }
    ],
    ...result.metrics.map((m) => [
      formatMetricName(m.name),
      formatValueForLog(m),
      formatThresholdForLog(m),
      m.passed ? '✅' : '❌'
    ])
  ])

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
 * Format metric name for display with documentation link
 */
function formatMetricName(name: string): string {
  const BASE_URL = 'https://github.com/jdiegosierra/contributor-report/blob/main/README.md#'

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

/**
 * Write whitelisted user summary to GitHub Job Summary
 */
export async function writeWhitelistSummary(username: string): Promise<void> {
  await core.summary
    .addHeading('Contributor Report Analysis', 2)
    .addRaw(`✅ **@${username}** is a trusted contributor and was automatically approved.\n`)
    .write()
}

/**
 * Format metric value for log display
 */
function formatValueForLog(metric: { name: string; rawValue: number }): string {
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
 * Format threshold for log display
 */
function formatThresholdForLog(metric: { name: string; threshold: number }): string {
  if (metric.name === 'negativeReactions') {
    return `<= ${metric.threshold}`
  }
  if (metric.name === 'prMergeRate' || metric.name === 'activityConsistency') {
    return `>= ${(metric.threshold * 100).toFixed(0)}%`
  }
  if (metric.name === 'accountAge') {
    return `>= ${metric.threshold} days`
  }
  return `>= ${metric.threshold}`
}
