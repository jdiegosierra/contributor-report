/**
 * Metric data structures and interfaces
 */

/** Result from checking a single metric against its threshold */
export interface MetricCheckResult {
  /** Metric identifier */
  name: string

  /** Raw measured value */
  rawValue: number

  /** Threshold value configured */
  threshold: number

  /** Whether this metric passed its check */
  passed: boolean

  /** Human-readable explanation */
  details: string

  /** Number of data points that contributed to this metric */
  dataPoints: number
}

/** PR history analysis data */
export interface PRHistoryData {
  /** Total number of PRs in analysis window */
  totalPRs: number

  /** Number of merged PRs */
  mergedPRs: number

  /** Number of PRs closed without merging */
  closedWithoutMerge: number

  /** Number of currently open PRs */
  openPRs: number

  /** Merge rate (merged / (merged + closed)) */
  mergeRate: number

  /** Average lines changed per PR */
  averagePRSize: number

  /** Number of very short PRs (< 10 lines) */
  veryShortPRs: number

  /** Dates of merged PRs for recency calculation */
  mergedPRDates: Date[]
}

/** Repository contribution data */
export interface RepoContribution {
  /** Repository owner */
  owner: string

  /** Repository name */
  repo: string

  /** Repository star count */
  stars: number

  /** Number of merged PRs to this repo */
  mergedPRCount: number
}

/** Repository quality metric data */
export interface RepoQualityData {
  /** All repositories contributed to */
  contributedRepos: RepoContribution[]

  /** Number of repos with >= minimum stars */
  qualityRepoCount: number

  /** Average stars across contributed repos */
  averageRepoStars: number

  /** Highest star count among contributed repos */
  highestStarRepo: number
}

/** Reaction type classification (GraphQL enum values) */
export type ReactionType = 'THUMBS_UP' | 'THUMBS_DOWN' | 'LAUGH' | 'CONFUSED' | 'HEART' | 'HOORAY' | 'ROCKET' | 'EYES'

/** Positive reaction types */
export const POSITIVE_REACTIONS: ReactionType[] = ['THUMBS_UP', 'HEART', 'ROCKET', 'HOORAY']

/** Negative reaction types */
export const NEGATIVE_REACTIONS: ReactionType[] = ['THUMBS_DOWN', 'CONFUSED']

/** Reaction analysis data */
export interface ReactionData {
  /** Total comments analyzed */
  totalComments: number

  /** Positive reactions count */
  positiveReactions: number

  /** Negative reactions count */
  negativeReactions: number

  /** Neutral reactions count */
  neutralReactions: number

  /** Ratio of positive reactions (0-1) */
  positiveRatio: number
}

/** Account age and activity data */
export interface AccountData {
  /** Account creation date */
  createdAt: Date

  /** Account age in days */
  ageInDays: number

  /** Number of months with activity in analysis window */
  monthsWithActivity: number

  /** Total months in analysis window */
  totalMonthsInWindow: number

  /** Consistency score (0-1) based on activity spread */
  consistencyScore: number
}

/** Issue engagement data */
export interface IssueEngagementData {
  /** Number of issues created */
  issuesCreated: number

  /** Issues that received comments from others */
  issuesWithComments: number

  /** Issues that received reactions */
  issuesWithReactions: number

  /** Average comments per issue */
  averageCommentsPerIssue: number
}

/** Code review contribution data */
export interface CodeReviewData {
  /** Number of reviews given */
  reviewsGiven: number

  /** Number of review comments written */
  reviewCommentsGiven: number

  /** Repositories where reviews were given */
  reviewedRepos: string[]
}

/** Merger diversity data - who merges contributor's PRs */
export interface MergerDiversityData {
  /** Total number of merged PRs */
  totalMergedPRs: number

  /** Count of different people who merged PRs */
  uniqueMergers: number

  /** Number of self-merged PRs */
  selfMergeCount: number

  /** Number of PRs merged by others */
  othersMergeCount: number

  /** Self-merges on user's own repositories */
  selfMergesOnOwnRepos: number

  /** Self-merges on external repositories */
  selfMergesOnExternalRepos: number

  /** External repos where user has merge privilege */
  externalReposWithMergePrivilege: string[]

  /** RED FLAG: All merges are self-merges on own repos */
  onlySelfMergesOnOwnRepos: boolean

  /** Self-merge rate (0-1) */
  selfMergeRate: number

  /** Logins of users who merged PRs */
  mergerLogins: string[]
}

/** Repository-specific history data */
export interface RepoHistoryData {
  /** Repository in "owner/repo" format */
  repoName: string

  /** Total PRs submitted to this specific repo */
  totalPRsInRepo: number

  /** Merged PRs in this repo */
  mergedPRsInRepo: number

  /** PRs closed without merge in this repo */
  closedWithoutMergeInRepo: number

  /** Merge rate in this specific repo (0-1) */
  repoMergeRate: number

  /** Whether this is user's first contribution to this repo */
  isFirstTimeContributor: boolean
}

/** Profile completeness data */
export interface ProfileData {
  /** Number of followers */
  followersCount: number

  /** Number of public repositories */
  publicReposCount: number

  /** Whether user has a bio */
  hasBio: boolean

  /** Whether user has company/affiliation */
  hasCompany: boolean

  /** Whether user has location */
  hasLocation: boolean

  /** Whether user has website */
  hasWebsite: boolean

  /** Calculated completeness score (0-100) */
  completenessScore: number
}

/** Suspicious pattern severity levels */
export type PatternSeverity = 'CRITICAL' | 'WARNING'

/** Types of suspicious patterns */
export type SuspiciousPatternType = 'SPAM_PATTERN' | 'HIGH_PR_RATE' | 'SELF_MERGE_ABUSE' | 'REPO_SPAM'

/** Individual suspicious pattern detection */
export interface SuspiciousPattern {
  /** Type of pattern detected */
  type: SuspiciousPatternType

  /** Severity level */
  severity: PatternSeverity

  /** Human-readable description */
  description: string

  /** Evidence data for this pattern */
  evidence: Record<string, number | string>
}

/** Suspicious activity pattern data */
export interface SuspiciousPatternData {
  /** All detected patterns */
  detectedPatterns: SuspiciousPattern[]

  /** PRs per day rate */
  prRate: number

  /** Number of unique repos contributed to */
  uniqueRepoCount: number

  /** Self-merge rate (0-1) */
  selfMergeRate: number

  /** Account age in days */
  accountAgeInDays: number
}

/** Aggregated metrics from all calculators */
export interface AllMetricsData {
  prHistory: PRHistoryData
  repoQuality: RepoQualityData
  reactions: ReactionData
  account: AccountData
  issueEngagement: IssueEngagementData
  codeReviews: CodeReviewData
  mergerDiversity: MergerDiversityData
  repoHistory: RepoHistoryData
  profile: ProfileData
  suspiciousPatterns?: SuspiciousPatternData
}
