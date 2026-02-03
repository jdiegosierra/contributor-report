/**
 * GraphQL queries for fetching contributor data
 */

/** Main query to fetch contributor metrics */
export const CONTRIBUTOR_DATA_QUERY = `
query ContributorAnalysis($username: String!, $since: DateTime!, $prCursor: String, $commentCursor: String, $issueSearchQuery: String!) {
  user(login: $username) {
    login
    createdAt
    bio
    company
    location
    websiteUrl
    followers { totalCount }
    repositories(privacy: PUBLIC) { totalCount }

    pullRequests(
      first: 100
      states: [MERGED, CLOSED, OPEN]
      orderBy: {field: CREATED_AT, direction: DESC}
      after: $prCursor
    ) {
      totalCount
      nodes {
        state
        merged
        mergedAt
        createdAt
        closedAt
        additions
        deletions
        mergedBy { login }
        repository {
          owner { login }
          name
          stargazerCount
        }
        reviews(first: 1) {
          totalCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }

    contributionsCollection(from: $since) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
      pullRequestReviewContributions {
        totalCount
      }
    }

    issueComments(
      first: 100
      orderBy: {field: UPDATED_AT, direction: DESC}
      after: $commentCursor
    ) {
      totalCount
      nodes {
        createdAt
        reactions(first: 10) {
          nodes {
            content
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }

  # Search for issues created by the user (works across all repos)
  # Using ISSUE_ADVANCED type (introduced March 2025) for proper is:issue filtering
  issueSearch: search(query: $issueSearchQuery, type: ISSUE_ADVANCED, first: 50) {
    issueCount
    nodes {
      __typename
      ... on Issue {
        createdAt
        comments { totalCount }
        reactions(first: 20) {
          nodes {
            content
          }
        }
      }
    }
  }

  rateLimit {
    remaining
    resetAt
    used
  }
}
`

/** Query to check if user is member of an organization */
export const ORG_MEMBERSHIP_QUERY = `
query OrgMembership($org: String!, $username: String!) {
  organization(login: $org) {
    membersWithRole(query: $username, first: 1) {
      nodes {
        login
      }
    }
  }
}
`

/** Simple query to get rate limit status */
export const RATE_LIMIT_QUERY = `
query RateLimit {
  rateLimit {
    remaining
    resetAt
    used
    limit
  }
}
`
