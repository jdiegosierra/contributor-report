/**
 * GitHub API response types
 * These align with Octokit types but are simplified for our needs
 */

/** GitHub user profile */
export interface GitHubUser {
  login: string
  id: number
  created_at: string
  public_repos: number
  followers: number
  following: number
}

/** Pull request from GitHub API */
export interface GitHubPullRequest {
  number: number
  title: string
  state: 'open' | 'closed'
  merged: boolean
  merged_at: string | null
  created_at: string
  closed_at: string | null
  additions: number
  deletions: number
  changed_files: number
  user: {
    login: string
  }
  base: {
    repo: {
      owner: { login: string }
      name: string
      stargazers_count: number
    }
  }
}

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

/** Reaction from GitHub API */
export interface GitHubReaction {
  content: GitHubReactionContent
  user: { login: string }
}

/** Issue from GitHub API */
export interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  comments: number
  user: {
    login: string
  }
  reactions: {
    '+1': number
    '-1': number
    laugh: number
    hooray: number
    confused: number
    heart: number
    rocket: number
    eyes: number
    total_count: number
  }
  created_at: string
}

/** Pull request review */
export interface GitHubReview {
  id: number
  user: {
    login: string
  }
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  submitted_at: string
  body: string
}

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
