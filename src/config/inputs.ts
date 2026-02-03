/**
 * Parse action inputs from @actions/core
 */

import * as core from '@actions/core'
import type { ContributorQualityConfig, MetricThresholds, FailAction, NewAccountAction } from '../types/config.js'
import { DEFAULT_CONFIG, mergeThresholds, validateThresholds, validateRequiredMetrics } from './defaults.js'

/** Parse comma-separated string into array */
function parseList(input: string): string[] {
  if (!input || input.trim() === '') {
    return []
  }
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Parse JSON with fallback to empty object */
function parseJSON<T>(input: string, fallback: T): T {
  if (!input || input.trim() === '' || input.trim() === '{}') {
    return fallback
  }
  try {
    return JSON.parse(input) as T
  } catch {
    core.warning(`Failed to parse JSON input: ${input}. Using defaults.`)
    return fallback
  }
}

/** Validate fail action */
function validateFailAction(action: string): FailAction {
  const valid: FailAction[] = ['comment', 'label', 'fail', 'comment-and-label', 'none']
  if (valid.includes(action as FailAction)) {
    return action as FailAction
  }
  core.warning(`Invalid on-fail value: ${action}. Using 'comment'.`)
  return 'comment'
}

/** Validate new account action */
function validateNewAccountAction(action: string): NewAccountAction {
  const valid: NewAccountAction[] = ['neutral', 'require-review', 'block']
  if (valid.includes(action as NewAccountAction)) {
    return action as NewAccountAction
  }
  core.warning(`Invalid new-account-action value: ${action}. Using 'neutral'.`)
  return 'neutral'
}

/** Parse integer with validation */
function parseIntSafe(value: string, name: string, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`)
  }
  return parsed
}

/** Parse float with validation */
function parseFloatSafe(value: string, name: string, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue
  }
  const parsed = parseFloat(value)
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`)
  }
  return parsed
}

/** Validate the complete config object */
function validateConfig(config: ContributorQualityConfig): void {
  // Validate thresholds
  validateThresholds(config.thresholds)

  // Validate minimum stars is positive
  if (config.minimumStars < 0) {
    throw new Error(`minimum-stars must be a positive number, got ${config.minimumStars}`)
  }

  // Validate analysis window is positive
  if (config.analysisWindowMonths <= 0) {
    throw new Error(`analysis-window must be greater than 0, got ${config.analysisWindowMonths}`)
  }

  // Validate new account threshold is positive
  if (config.newAccountThresholdDays < 0) {
    throw new Error(`new-account-threshold-days must be a positive number, got ${config.newAccountThresholdDays}`)
  }

  // Validate required metrics
  validateRequiredMetrics(config.requiredMetrics)
}

/** Parse all action inputs into config object */
export function parseInputs(): ContributorQualityConfig {
  // Try to get from input first, then fall back to env variable
  let githubToken = core.getInput('github-token', { required: false })

  // For local testing: use INPUT_GITHUB_TOKEN env var directly if input is not provided
  if (!githubToken || githubToken.includes('${{')) {
    githubToken = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''
  }

  if (!githubToken) {
    throw new Error('GitHub token is required. Set INPUT_GITHUB_TOKEN in your .env file.')
  }

  // Parse thresholds - can be JSON or individual inputs
  const thresholdsJson = core.getInput('thresholds')
  let customThresholds: Partial<MetricThresholds> = {}

  if (thresholdsJson) {
    customThresholds = parseJSON<Partial<MetricThresholds>>(thresholdsJson, {})
  }

  // Individual threshold inputs override JSON
  const prMergeRateInput = core.getInput('threshold-pr-merge-rate')
  if (prMergeRateInput) {
    customThresholds.prMergeRate = parseFloatSafe(
      prMergeRateInput,
      'threshold-pr-merge-rate',
      DEFAULT_CONFIG.thresholds.prMergeRate
    )
  }

  const accountAgeInput = core.getInput('threshold-account-age')
  if (accountAgeInput) {
    customThresholds.accountAge = parseIntSafe(
      accountAgeInput,
      'threshold-account-age',
      DEFAULT_CONFIG.thresholds.accountAge
    )
  }

  const positiveReactionsInput = core.getInput('threshold-positive-reactions')
  if (positiveReactionsInput) {
    customThresholds.positiveReactions = parseIntSafe(
      positiveReactionsInput,
      'threshold-positive-reactions',
      DEFAULT_CONFIG.thresholds.positiveReactions
    )
  }

  const negativeReactionsInput = core.getInput('threshold-negative-reactions')
  if (negativeReactionsInput) {
    customThresholds.negativeReactions = parseIntSafe(
      negativeReactionsInput,
      'threshold-negative-reactions',
      DEFAULT_CONFIG.thresholds.negativeReactions
    )
  }

  const mergerDiversityInput = core.getInput('threshold-merger-diversity')
  if (mergerDiversityInput) {
    customThresholds.mergerDiversity = parseIntSafe(
      mergerDiversityInput,
      'threshold-merger-diversity',
      DEFAULT_CONFIG.thresholds.mergerDiversity
    )
  }

  const repoHistoryMergeRateInput = core.getInput('threshold-repo-history-merge-rate')
  if (repoHistoryMergeRateInput) {
    customThresholds.repoHistoryMergeRate = parseFloatSafe(
      repoHistoryMergeRateInput,
      'threshold-repo-history-merge-rate',
      DEFAULT_CONFIG.thresholds.repoHistoryMergeRate
    )
  }

  const repoHistoryMinPRsInput = core.getInput('threshold-repo-history-min-prs')
  if (repoHistoryMinPRsInput) {
    customThresholds.repoHistoryMinPRs = parseIntSafe(
      repoHistoryMinPRsInput,
      'threshold-repo-history-min-prs',
      DEFAULT_CONFIG.thresholds.repoHistoryMinPRs
    )
  }

  const profileCompletenessInput = core.getInput('threshold-profile-completeness')
  if (profileCompletenessInput) {
    customThresholds.profileCompleteness = parseIntSafe(
      profileCompletenessInput,
      'threshold-profile-completeness',
      DEFAULT_CONFIG.thresholds.profileCompleteness
    )
  }

  const thresholds = mergeThresholds(customThresholds)

  // Parse required metrics
  const requiredMetricsInput = core.getInput('required-metrics')
  const requiredMetrics =
    requiredMetricsInput !== undefined && requiredMetricsInput !== ''
      ? parseList(requiredMetricsInput)
      : DEFAULT_CONFIG.requiredMetrics

  const minimumStars = parseIntSafe(core.getInput('minimum-stars'), 'minimum-stars', DEFAULT_CONFIG.minimumStars)

  const analysisWindowMonths = parseIntSafe(
    core.getInput('analysis-window'),
    'analysis-window',
    DEFAULT_CONFIG.analysisWindowMonths
  )

  const trustedUsersInput = core.getInput('trusted-users')
  const trustedUsers =
    trustedUsersInput !== undefined && trustedUsersInput !== ''
      ? parseList(trustedUsersInput)
      : DEFAULT_CONFIG.trustedUsers

  const trustedOrgs = parseList(core.getInput('trusted-orgs'))

  const onFail = validateFailAction(core.getInput('on-fail') || DEFAULT_CONFIG.onFail)

  const labelName = core.getInput('label-name') || DEFAULT_CONFIG.labelName

  const dryRun = core.getInput('dry-run').toLowerCase() === 'true'

  const newAccountAction = validateNewAccountAction(
    core.getInput('new-account-action') || DEFAULT_CONFIG.newAccountAction
  )

  const newAccountThresholdDays = parseIntSafe(
    core.getInput('new-account-threshold-days'),
    'new-account-threshold-days',
    DEFAULT_CONFIG.newAccountThresholdDays
  )

  const enableSpamDetectionInput = core.getInput('enable-spam-detection')
  const enableSpamDetection =
    enableSpamDetectionInput === ''
      ? DEFAULT_CONFIG.enableSpamDetection
      : enableSpamDetectionInput.toLowerCase() !== 'false'

  const config: ContributorQualityConfig = {
    githubToken,
    thresholds,
    requiredMetrics,
    minimumStars,
    analysisWindowMonths,
    trustedUsers,
    trustedOrgs,
    onFail,
    labelName,
    dryRun,
    newAccountAction,
    newAccountThresholdDays,
    enableSpamDetection
  }

  // Validate all config values
  validateConfig(config)

  return config
}
