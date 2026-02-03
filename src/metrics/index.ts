/**
 * Metrics module exports
 */

// PR History
export { extractPRHistoryData, checkPRMergeRate } from './pr-history.js'

// Repo Quality
export { extractRepoQualityData, checkRepoQuality } from './repo-quality.js'

// Reactions
export { extractReactionData, checkPositiveReactions, checkNegativeReactions } from './reactions.js'

// Account Age
export { extractAccountData, checkAccountAge, checkActivityConsistency, isNewAccount } from './account-age.js'

// Issue Engagement
export { extractIssueEngagementData, checkIssueEngagement } from './issue-engagement.js'

// Code Reviews
export { extractCodeReviewData, checkCodeReviews } from './code-review.js'

// Merger Diversity
export { extractMergerDiversityData, checkMergerDiversity } from './merger-diversity.js'

// Repo History (repository-specific)
export { extractRepoHistoryData, checkRepoHistoryMergeRate, checkRepoHistoryMinPRs } from './repo-history.js'

// Profile Completeness
export { extractProfileData, checkProfileCompleteness } from './profile-completeness.js'

// Suspicious Patterns
export {
  extractSuspiciousPatterns,
  checkSuspiciousPatterns,
  hasCriticalSpamPatterns,
  SPAM_DETECTION_THRESHOLDS
} from './suspicious-patterns.js'
