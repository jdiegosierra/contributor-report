/**
 * GitHub API response types
 */

/** Reaction content types from GitHub GraphQL API (uppercase enum values) */
export type GitHubReactionContent =
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'LAUGH'
  | 'CONFUSED'
  | 'HEART'
  | 'HOORAY'
  | 'ROCKET'
  | 'EYES'

/** GraphQL response for user contributions */
export interface GraphQLContributorData {
  user: {
    login: string
    createdAt: string
    /** User's bio description */
    bio: string | null
    /** User's company/affiliation */
    company: string | null
    /** User's location */
    location: string | null
    /** User's website URL */
    websiteUrl: string | null
    /** Follower count */
    followers: {
      totalCount: number
    }
    /** Public repository count */
    repositories: {
      totalCount: number
    }
    pullRequests: {
      totalCount: number
      nodes: Array<{
        state: 'OPEN' | 'CLOSED' | 'MERGED'
        merged: boolean
        mergedAt: string | null
        createdAt: string
        closedAt: string | null
        additions: number
        deletions: number
        /** User who merged this PR (null if not merged or unknown) */
        mergedBy: {
          login: string
        } | null
        /** Can be null if the repository was deleted or made private */
        repository: {
          owner: { login: string }
          name: string
          stargazerCount: number
        } | null
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number
        weeks: Array<{
          contributionDays: Array<{
            contributionCount: number
            date: string
          }>
        }>
      }
      pullRequestReviewContributions: {
        totalCount: number
      }
    }
    issueComments: {
      totalCount: number
      nodes: Array<{
        reactions: {
          nodes: Array<{
            content: GitHubReactionContent
          }>
        }
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
  /** Issues created by the user (from search API) */
  issueSearch: {
    issueCount: number
    nodes: Array<{
      __typename?: string
      createdAt?: string
      comments?: { totalCount: number }
      reactions?: {
        nodes: Array<{
          content: GitHubReactionContent
        }>
      }
    }>
  }
}

/** Context from the PR that triggered the action */
export interface PRContext {
  owner: string
  repo: string
  prNumber: number
  prAuthor: string
}
