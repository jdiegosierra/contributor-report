/**
 * Configuration types for the contributor quality action
 */

/** Threshold configuration for all metrics */
export interface MetricThresholds {
  /** PR merge rate (0-1): minimum acceptable merge rate */
  prMergeRate: number

  /** Repo quality: minimum number of quality repos with merged PRs */
  repoQuality: number

  /** Positive reactions: minimum positive reaction count */
  positiveReactions: number

  /** Negative reactions: maximum acceptable negative reaction count */
  negativeReactions: number

  /** Account age: minimum account age in days */
  accountAge: number

  /** Activity consistency: minimum consistency score (0-1) */
  activityConsistency: number

  /** Issue engagement: minimum issues created */
  issueEngagement: number

  /** Code reviews: minimum reviews given */
  codeReviews: number

  /** Merger diversity: minimum unique maintainers who merged PRs */
  mergerDiversity: number

  /** Repo history merge rate (0-1): minimum merge rate in this specific repo */
  repoHistoryMergeRate: number

  /** Repo history min PRs: minimum previous PRs in this repo */
  repoHistoryMinPRs: number

  /** Profile completeness: minimum score (0-100) */
  profileCompleteness: number
}

/** Actions to take when check fails */
export type FailAction = 'comment' | 'label' | 'fail' | 'comment-and-label' | 'none'

/** Actions for new accounts */
export type NewAccountAction = 'neutral' | 'require-review' | 'block'

/** Main configuration for the action */
export interface ContributorQualityConfig {
  /** GitHub token for API access */
  githubToken: string

  /** Metric thresholds */
  thresholds: MetricThresholds

  /** Metrics that must pass for the check to pass */
  requiredMetrics: string[]

  /** Minimum stars for a repo to be considered "quality" */
  minimumStars: number

  /** Months of history to analyze */
  analysisWindowMonths: number

  /** Usernames that always pass (whitelist) */
  trustedUsers: string[]

  /** Organizations whose members always pass */
  trustedOrgs: string[]

  /** Action to take when check fails */
  onFail: FailAction

  /** Label name to apply when using label action */
  labelName: string

  /** Run without taking action (logging only) */
  dryRun: boolean

  /** Action for new accounts */
  newAccountAction: NewAccountAction

  /** Days threshold to consider an account "new" */
  newAccountThresholdDays: number

  /** Enable suspicious activity pattern detection */
  enableSpamDetection: boolean
}

/** Default metric thresholds */
export const DEFAULT_THRESHOLDS: MetricThresholds = {
  prMergeRate: 0,
  repoQuality: 0,
  positiveReactions: 0,
  negativeReactions: 0,
  accountAge: 0,
  activityConsistency: 0,
  issueEngagement: 0,
  codeReviews: 0,
  mergerDiversity: 0,
  repoHistoryMergeRate: 0,
  repoHistoryMinPRs: 0,
  profileCompleteness: 0
}

/** Default required metrics (must pass for check to pass) */
export const DEFAULT_REQUIRED_METRICS: string[] = ['prMergeRate', 'accountAge']

/** Default trusted bots */
export const DEFAULT_TRUSTED_USERS: string[] = [
  'dependabot[bot]',
  'renovate[bot]',
  'github-actions[bot]',
  'codecov[bot]',
  'sonarcloud[bot]'
]
