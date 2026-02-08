/**
 * Main evaluation engine that checks all metrics against thresholds
 */

import type { GraphQLContributorData, PRContext } from '../types/github.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { MetricCheckResult, AllMetricsData } from '../types/metrics.js'
import type { AnalysisResult } from '../types/scoring.js'
import { ANALYSIS_CONSTANTS } from '../types/scoring.js'

import {
  extractPRHistoryData,
  checkPRMergeRate,
  extractRepoQualityData,
  checkRepoQuality,
  extractReactionData,
  checkPositiveReactions,
  checkNegativeReactions,
  extractAccountData,
  checkAccountAge,
  checkActivityConsistency,
  isNewAccount,
  extractIssueEngagementData,
  checkIssueEngagement,
  extractCodeReviewData,
  checkCodeReviews,
  extractMergerDiversityData,
  checkMergerDiversity,
  extractRepoHistoryData,
  checkRepoHistoryMergeRate,
  checkRepoHistoryMinPRs,
  extractProfileData,
  checkProfileCompleteness,
  extractSuspiciousPatterns,
  checkSuspiciousPatterns,
  hasCriticalSpamPatterns
} from '../metrics/index.js'

/**
 * Extract all metrics data from GraphQL response
 */
export function extractAllMetrics(
  data: GraphQLContributorData,
  config: ContributorQualityConfig,
  sinceDate: Date,
  prContext: PRContext
): AllMetricsData {
  const username = data.user.login

  // Extract base metrics
  const prHistory = extractPRHistoryData(data, sinceDate)
  const repoQuality = extractRepoQualityData(data, config.minimumStars, sinceDate)
  const reactions = extractReactionData(data)
  const account = extractAccountData(data, config.analysisWindowMonths)
  const issueEngagement = extractIssueEngagementData(data)
  const codeReviews = extractCodeReviewData(data)

  // Extract new metrics
  const mergerDiversity = extractMergerDiversityData(data, username, sinceDate)
  const repoHistory = extractRepoHistoryData(data, prContext, sinceDate)
  const profile = extractProfileData(data)

  const baseMetrics: AllMetricsData = {
    prHistory,
    repoQuality,
    reactions,
    account,
    issueEngagement,
    codeReviews,
    mergerDiversity,
    repoHistory,
    profile
  }

  // Extract suspicious patterns if spam detection is enabled (cross-metric analysis)
  if (config.enableSpamDetection) {
    baseMetrics.suspiciousPatterns = extractSuspiciousPatterns(
      {
        prHistory,
        repoQuality,
        account,
        mergerDiversity
      },
      username
    )
  }

  return baseMetrics
}

/**
 * Check all metrics against their thresholds
 */
export function checkAllMetrics(metricsData: AllMetricsData, config: ContributorQualityConfig): MetricCheckResult[] {
  const thresholds = config.thresholds

  const baseChecks = [
    checkPRMergeRate(metricsData.prHistory, thresholds.prMergeRate),
    checkRepoQuality(metricsData.repoQuality, thresholds.repoQuality, config.minimumStars),
    checkPositiveReactions(metricsData.reactions, thresholds.positiveReactions),
    checkNegativeReactions(metricsData.reactions, thresholds.negativeReactions),
    checkAccountAge(metricsData.account, thresholds.accountAge),
    checkActivityConsistency(metricsData.account, thresholds.activityConsistency),
    checkIssueEngagement(metricsData.issueEngagement, thresholds.issueEngagement),
    checkCodeReviews(metricsData.codeReviews, thresholds.codeReviews),
    checkMergerDiversity(metricsData.mergerDiversity, thresholds.mergerDiversity),
    checkRepoHistoryMergeRate(metricsData.repoHistory, thresholds.repoHistoryMergeRate),
    checkRepoHistoryMinPRs(metricsData.repoHistory, thresholds.repoHistoryMinPRs),
    checkProfileCompleteness(metricsData.profile, thresholds.profileCompleteness)
  ]

  // Add suspicious patterns check if spam detection is enabled
  if (metricsData.suspiciousPatterns) {
    baseChecks.push(checkSuspiciousPatterns(metricsData.suspiciousPatterns))
  }

  return baseChecks
}

/**
 * Determine if all required metrics passed
 */
export function determinePassStatus(metrics: MetricCheckResult[], requiredMetrics: string[]): boolean {
  // If no required metrics specified, all must pass
  if (requiredMetrics.length === 0) {
    return metrics.every((m) => m.passed)
  }

  // Check only the required metrics
  return requiredMetrics.every((requiredName) => {
    const metric = metrics.find((m) => m.name === requiredName)
    return metric ? metric.passed : true // If metric not found, assume pass
  })
}

/**
 * Generate recommendations based on failed metrics
 */
export function generateRecommendations(metricsData: AllMetricsData, metrics: MetricCheckResult[]): string[] {
  const recommendations: string[] = []
  const failedMetrics = metrics.filter((m) => !m.passed)

  // Check for critical spam patterns FIRST - this takes priority
  if (metricsData.suspiciousPatterns && hasCriticalSpamPatterns(metricsData.suspiciousPatterns)) {
    recommendations.push(
      'CRITICAL: Suspicious activity patterns detected. This account exhibits characteristics commonly associated with spam or automated contributions.'
    )
    return recommendations // Early return - other recommendations irrelevant
  }

  for (const metric of failedMetrics) {
    switch (metric.name) {
      case 'prMergeRate':
        recommendations.push('Improve PR quality to increase merge rate. Focus on smaller, well-documented changes.')
        break
      case 'repoQuality':
        recommendations.push(
          'Consider contributing to established open source projects with significant community adoption.'
        )
        break
      case 'codeReviews':
        recommendations.push('Participate in code reviews to demonstrate engagement with the community.')
        break
      case 'negativeReactions':
        recommendations.push('Focus on constructive communication to improve community reception.')
        break
      case 'accountAge':
        recommendations.push('Continue building your contribution history. New accounts naturally have limited data.')
        break
      case 'activityConsistency':
        if (metricsData.account.ageInDays >= 90) {
          recommendations.push('Maintain consistent activity over time to build a stronger contribution profile.')
        }
        break
      case 'positiveReactions':
        recommendations.push('Engage more with the community through helpful comments and discussions.')
        break
      case 'issueEngagement':
        recommendations.push('Create issues to report bugs or suggest features, and engage with the community.')
        break
      case 'mergerDiversity':
        if (metricsData.mergerDiversity.onlySelfMergesOnOwnRepos) {
          recommendations.push(
            'Build trust by contributing to external projects where other maintainers can review and merge your work.'
          )
        } else {
          recommendations.push(
            'Increase trust signals by contributing to more diverse projects and getting PRs merged by different maintainers.'
          )
        }
        break
      case 'repoHistoryMergeRate':
        if (metricsData.repoHistory.isFirstTimeContributor) {
          recommendations.push('Welcome! This is your first contribution to this repository.')
        } else {
          recommendations.push('Review previous rejected PRs in this repository to understand maintainer expectations.')
        }
        break
      case 'repoHistoryMinPRs':
        recommendations.push('Build trust by making consistent, quality contributions to this repository over time.')
        break
      case 'profileCompleteness': {
        const missing = []
        if (!metricsData.profile.hasBio) missing.push('bio')
        if (!metricsData.profile.hasCompany) missing.push('company/affiliation')
        if (metricsData.profile.followersCount === 0) missing.push('GitHub followers (engage with community)')
        if (missing.length > 0) {
          recommendations.push(
            `Complete your GitHub profile by adding: ${missing.join(', ')}. A complete profile builds trust with maintainers.`
          )
        }
        break
      }
      case 'suspiciousPatterns':
        // Handled above with critical check
        break
    }
  }

  // General recommendation if no specific recommendations
  if (recommendations.length === 0 && failedMetrics.length > 0) {
    recommendations.push(
      'Build your GitHub profile through meaningful contributions, code reviews, and community engagement.'
    )
  }

  return recommendations
}

/**
 * Main evaluation function
 */
export function evaluateContributor(
  data: GraphQLContributorData,
  config: ContributorQualityConfig,
  sinceDate: Date,
  prContext: PRContext
): AnalysisResult {
  const username = data.user.login
  const now = new Date()

  // Extract all metrics data
  const metricsData = extractAllMetrics(data, config, sinceDate, prContext)

  // Check all metrics against thresholds
  const metrics = checkAllMetrics(metricsData, config)

  // Determine pass/fail based on required metrics
  const passed = determinePassStatus(metrics, config.requiredMetrics)

  // Calculate counts
  const passedCount = metrics.filter((m) => m.passed).length
  const failedMetrics = metrics.filter((m) => !m.passed).map((m) => m.name)

  // Check account status
  const accountIsNew = isNewAccount(metricsData.account, config.newAccountThresholdDays)
  const totalDataPoints = metrics.reduce((sum, m) => sum + m.dataPoints, 0)
  const hasLimitedData = totalDataPoints < ANALYSIS_CONSTANTS.MIN_CONTRIBUTIONS_FOR_DATA

  // Generate recommendations based on failed metrics
  const recommendations = generateRecommendations(metricsData, metrics)

  return {
    passed,
    passedCount,
    totalMetrics: metrics.length,
    metrics,
    failedMetrics,
    username,
    analyzedAt: now,
    dataWindowStart: sinceDate,
    dataWindowEnd: now,
    recommendations,
    isNewAccount: accountIsNew,
    hasLimitedData,
    wasWhitelisted: false,
    metricsData
  }
}
