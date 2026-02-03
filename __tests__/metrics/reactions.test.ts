/**
 * Tests for reactions metrics
 */
import { describe, it, expect } from '@jest/globals'
import { extractReactionData, checkPositiveReactions, checkNegativeReactions } from '../../src/metrics/reactions.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { ReactionData } from '../../src/types/metrics.js'

describe('Reactions Metrics', () => {
  describe('extractReactionData', () => {
    it('counts reactions correctly', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 3,
            nodes: [
              {
                reactions: {
                  nodes: [{ content: 'THUMBS_UP' }, { content: 'HEART' }]
                }
              },
              { reactions: { nodes: [{ content: 'THUMBS_DOWN' }] } },
              { reactions: { nodes: [{ content: 'LAUGH' }] } }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(3)
      expect(result.positiveReactions).toBe(2) // +1, heart
      expect(result.negativeReactions).toBe(1) // -1
      expect(result.neutralReactions).toBe(1) // laugh
    })

    it('handles no comments', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(0)
      expect(result.positiveReactions).toBe(0)
    })

    it('counts reactions from issues', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 2,
          nodes: [
            {
              __typename: 'Issue',
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }, { content: 'THUMBS_UP' }, { content: 'ROCKET' }]
              }
            },
            {
              __typename: 'Issue',
              reactions: {
                nodes: [{ content: 'CONFUSED' }]
              }
            }
          ]
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(2) // 2 issues
      expect(result.positiveReactions).toBe(3) // 2 thumbs_up + 1 rocket
      expect(result.negativeReactions).toBe(1) // 1 confused
      expect(result.neutralReactions).toBe(0)
    })

    it('counts reactions from both comments and issues', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 1,
            nodes: [
              {
                reactions: {
                  nodes: [{ content: 'HEART' }]
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 1,
          nodes: [
            {
              __typename: 'Issue',
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }]
              }
            }
          ]
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(2) // 1 comment + 1 issue
      expect(result.positiveReactions).toBe(2) // heart + thumbs_up
    })

    it('filters out PullRequest nodes from issueSearch', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 2,
          nodes: [
            {
              __typename: 'Issue',
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }]
              }
            },
            {
              __typename: 'PullRequest',
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }, { content: 'THUMBS_UP' }]
              }
            }
          ]
        }
      }

      const result = extractReactionData(data)

      // Only the Issue should be counted, not the PullRequest
      expect(result.totalComments).toBe(1)
      expect(result.positiveReactions).toBe(1) // Only from Issue
    })

    it('handles undefined issueSearch', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 1,
            nodes: [
              {
                reactions: {
                  nodes: [{ content: 'THUMBS_UP' }]
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: undefined as unknown as GraphQLContributorData['issueSearch']
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(1)
      expect(result.positiveReactions).toBe(1)
    })

    it('calculates positiveRatio correctly', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 1,
            nodes: [
              {
                reactions: {
                  nodes: [
                    { content: 'THUMBS_UP' },
                    { content: 'THUMBS_DOWN' },
                    { content: 'LAUGH' },
                    { content: 'EYES' }
                  ]
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractReactionData(data)

      // 1 positive out of 4 total = 0.25
      expect(result.positiveRatio).toBe(0.25)
    })

    it('returns 0.5 positiveRatio when no reactions', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 1,
            nodes: [
              {
                reactions: {
                  nodes: [] // No reactions
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractReactionData(data)

      expect(result.positiveRatio).toBe(0.5) // Default when no reactions
    })
  })

  describe('checkPositiveReactions', () => {
    it('passes when positive reactions meet threshold', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.625
      }

      const result = checkPositiveReactions(data, 3)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(5)
    })

    it('fails when positive reactions are below threshold', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 2,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.4
      }

      const result = checkPositiveReactions(data, 5)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(2)
    })

    it('passes with threshold of 0', () => {
      const data: ReactionData = {
        totalComments: 0,
        positiveReactions: 0,
        negativeReactions: 0,
        neutralReactions: 0,
        positiveRatio: 0.5
      }

      const result = checkPositiveReactions(data, 0)

      expect(result.passed).toBe(true)
    })

    it('returns correct dataPoints', () => {
      const data: ReactionData = {
        totalComments: 15,
        positiveReactions: 5,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.625
      }

      const result = checkPositiveReactions(data, 3)

      expect(result.dataPoints).toBe(15)
    })

    it('includes threshold in details when threshold > 0', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.625
      }

      const result = checkPositiveReactions(data, 3)

      expect(result.details).toContain('meets threshold >= 3')
    })

    it('shows no comments message when totalComments is 0', () => {
      const data: ReactionData = {
        totalComments: 0,
        positiveReactions: 0,
        negativeReactions: 0,
        neutralReactions: 0,
        positiveRatio: 0.5
      }

      const result = checkPositiveReactions(data, 5)

      expect(result.details).toContain('No comments found')
    })

    it('shows no positive reactions message when count is 0', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 0,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0
      }

      const result = checkPositiveReactions(data, 5)

      expect(result.details).toContain('No positive reactions')
    })
  })

  describe('checkNegativeReactions', () => {
    it('passes when negative reactions are within limit', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 2,
        neutralReactions: 1,
        positiveRatio: 0.625
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(2)
    })

    it('fails when negative reactions exceed limit', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 5,
        negativeReactions: 15,
        neutralReactions: 2,
        positiveRatio: 0.23
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(15)
    })

    it('passes exactly at limit', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 5,
        negativeReactions: 10,
        neutralReactions: 2,
        positiveRatio: 0.29
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(true)
    })

    it('returns correct dataPoints', () => {
      const data: ReactionData = {
        totalComments: 25,
        positiveReactions: 5,
        negativeReactions: 2,
        neutralReactions: 1,
        positiveRatio: 0.625
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.dataPoints).toBe(25)
    })

    it('includes within limit message when passed', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 2,
        neutralReactions: 2,
        positiveRatio: 0.625
      }

      const result = checkNegativeReactions(data, 5)

      expect(result.details).toContain('within limit <= 5')
    })

    it('includes exceeds limit message when failed', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 8,
        neutralReactions: 2,
        positiveRatio: 0.33
      }

      const result = checkNegativeReactions(data, 5)

      expect(result.details).toContain('exceeds limit <= 5')
    })

    it('shows no comments message when totalComments is 0', () => {
      const data: ReactionData = {
        totalComments: 0,
        positiveReactions: 0,
        negativeReactions: 0,
        neutralReactions: 0,
        positiveRatio: 0.5
      }

      const result = checkNegativeReactions(data, 5)

      expect(result.details).toContain('No comments found')
    })

    it('shows no negative reactions message when count is 0', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 0,
        neutralReactions: 2,
        positiveRatio: 1.0
      }

      const result = checkNegativeReactions(data, 5)

      expect(result.details).toContain('No negative reactions')
    })
  })
})
