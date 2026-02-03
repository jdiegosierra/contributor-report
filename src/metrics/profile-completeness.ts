/**
 * Profile completeness metric calculator
 * Measures account profile richness as a legitimacy signal
 */

import * as core from '@actions/core'
import type { GraphQLContributorData } from '../types/github.js'
import type { ProfileData, MetricCheckResult } from '../types/metrics.js'

/**
 * Scoring weights for profile completeness (total: 100 points)
 *
 * - Followers: Up to 40 points (progressive)
 * - Public repos: Up to 20 points (progressive)
 * - Bio: 20 points
 * - Company: 20 points
 * - Location: 0 points (optional, doesn't affect score)
 * - Website: 0 points (optional, doesn't affect score)
 */
const SCORING = {
  FOLLOWERS_BASE: 20, // > 0 followers
  FOLLOWERS_MID: 10, // >= 10 followers (adds to base)
  FOLLOWERS_HIGH: 10, // >= 50 followers (adds to mid)
  REPOS_BASE: 15, // > 0 public repos
  REPOS_HIGH: 5, // >= 5 public repos (adds to base)
  BIO: 20,
  COMPANY: 20
} as const

/**
 * Extract profile completeness data from GraphQL response
 *
 * @param data - GraphQL contributor data
 * @returns ProfileData with profile analysis
 */
export function extractProfileData(data: GraphQLContributorData): ProfileData {
  const user = data.user

  const followersCount = user.followers?.totalCount ?? 0
  const publicReposCount = user.repositories?.totalCount ?? 0
  const hasBio = Boolean(user.bio && user.bio.trim().length > 0)
  const hasCompany = Boolean(user.company && user.company.trim().length > 0)
  const hasLocation = Boolean(user.location && user.location.trim().length > 0)
  const hasWebsite = Boolean(user.websiteUrl && user.websiteUrl.trim().length > 0)

  // Calculate completeness score
  let score = 0

  // Followers scoring (up to 40 points)
  if (followersCount > 0) {
    score += SCORING.FOLLOWERS_BASE
    if (followersCount >= 10) {
      score += SCORING.FOLLOWERS_MID
      if (followersCount >= 50) {
        score += SCORING.FOLLOWERS_HIGH
      }
    }
  }

  // Public repos scoring (up to 20 points)
  if (publicReposCount > 0) {
    score += SCORING.REPOS_BASE
    if (publicReposCount >= 5) {
      score += SCORING.REPOS_HIGH
    }
  }

  // Bio scoring (20 points)
  if (hasBio) {
    score += SCORING.BIO
  }

  // Company scoring (20 points)
  if (hasCompany) {
    score += SCORING.COMPANY
  }

  core.debug(
    `Profile completeness: score=${score}, followers=${followersCount}, repos=${publicReposCount}, ` +
      `bio=${hasBio}, company=${hasCompany}, location=${hasLocation}, website=${hasWebsite}`
  )

  return {
    followersCount,
    publicReposCount,
    hasBio,
    hasCompany,
    hasLocation,
    hasWebsite,
    completenessScore: score
  }
}

/**
 * Check profile completeness against threshold
 *
 * @param data - Extracted profile data
 * @param threshold - Minimum completeness score (0-100) to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkProfileCompleteness(data: ProfileData, threshold: number): MetricCheckResult {
  const score = data.completenessScore
  const passed = score >= threshold

  // Build details about what's present/missing
  const present: string[] = []
  const missing: string[] = []

  if (data.followersCount > 0) {
    present.push(`${data.followersCount} followers`)
  } else {
    missing.push('followers')
  }

  if (data.publicReposCount > 0) {
    present.push(`${data.publicReposCount} public repos`)
  } else {
    missing.push('public repos')
  }

  if (data.hasBio) {
    present.push('bio')
  } else {
    missing.push('bio')
  }

  if (data.hasCompany) {
    present.push('company')
  } else {
    missing.push('company')
  }

  let details = `Profile score: ${score}/100.`

  if (present.length > 0) {
    details += ` Has: ${present.join(', ')}.`
  }

  if (missing.length > 0 && !passed) {
    details += ` Missing: ${missing.join(', ')}.`
  }

  if (threshold > 0) {
    details += passed ? ` (meets threshold >= ${threshold})` : ` (below threshold >= ${threshold})`
  }

  return {
    name: 'profileCompleteness',
    rawValue: score,
    threshold,
    passed,
    details,
    dataPoints: 1 // Profile is a single data point
  }
}
