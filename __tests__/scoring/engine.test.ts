/**
 * Tests for the main evaluation engine
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractAllMetrics,
  checkAllMetrics,
  determinePassStatus,
  generateRecommendations,
  evaluateContributor
} from '../../src/scoring/engine.js'
import { DEFAULT_CONFIG } from '../../src/config/defaults.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { AllMetricsData, MetricCheckResult } from '../../src/types/metrics.js'

describe('Evaluation Engine', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  // Create a test config with all fields
  const testConfig = {
    ...DEFAULT_CONFIG,
    githubToken: 'test-token'
  }

  describe('extractAllMetrics', () => {
    it('extracts all metric data from GraphQL response', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
          pullRequests: {
            totalCount: 5,
            nodes: [
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'org' },
                  name: 'repo',
                  stargazerCount: 5000
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 100,
              weeks: [
                {
                  contributionDays: [{ contributionCount: 5, date: '2024-01-15' }]
                }
              ]
            },
            pullRequestReviewContributions: { totalCount: 10 }
          },
          issueComments: {
            totalCount: 5,
            nodes: [
              { reactions: { nodes: [{ content: 'THUMBS_UP' }] } },
              { reactions: { nodes: [{ content: 'HEART' }] } }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 2,
          nodes: [
            {
              createdAt: new Date().toISOString(),
              comments: { totalCount: 3 },
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }, { content: 'HEART' }, { content: 'THUMBS_UP' }]
              }
            }
          ]
        }
      }

      const result = extractAllMetrics(data, testConfig, sinceDate)

      expect(result.prHistory).toBeDefined()
      expect(result.repoQuality).toBeDefined()
      expect(result.reactions).toBeDefined()
      expect(result.account).toBeDefined()
      expect(result.issueEngagement).toBeDefined()
      expect(result.codeReviews).toBeDefined()
    })
  })

  describe('checkAllMetrics', () => {
    it('checks all metrics against thresholds', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 8,
          closedWithoutMerge: 2,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 100,
          veryShortPRs: 0,
          mergedPRDates: [new Date()]
        },
        repoQuality: {
          contributedRepos: [{ owner: 'org', repo: 'repo', stars: 5000, mergedPRCount: 3 }],
          qualityRepoCount: 1,
          averageRepoStars: 5000,
          highestStarRepo: 5000
        },
        reactions: {
          totalComments: 20,
          positiveReactions: 15,
          negativeReactions: 2,
          neutralReactions: 3,
          positiveRatio: 0.75
        },
        account: {
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          ageInDays: 400,
          monthsWithActivity: 10,
          totalMonthsInWindow: 12,
          consistencyScore: 0.83
        },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 4,
          issuesWithReactions: 3,
          averageCommentsPerIssue: 3
        },
        codeReviews: {
          reviewsGiven: 15,
          reviewCommentsGiven: 7,
          reviewedRepos: []
        }
      }

      const results = checkAllMetrics(metricsData, testConfig)

      expect(results.length).toBe(8) // 8 metrics
      expect(results.every((r) => typeof r.passed === 'boolean')).toBe(true)
      expect(results.every((r) => typeof r.rawValue === 'number')).toBe(true)
      expect(results.every((r) => typeof r.threshold === 'number')).toBe(true)
    })
  })

  describe('determinePassStatus', () => {
    it('passes when all required metrics pass', () => {
      const metrics: MetricCheckResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.5,
          threshold: 0.3,
          passed: true,
          details: 'Good',
          dataPoints: 10
        },
        {
          name: 'accountAge',
          rawValue: 100,
          threshold: 30,
          passed: true,
          details: 'Good',
          dataPoints: 1
        },
        {
          name: 'codeReviews',
          rawValue: 0,
          threshold: 5,
          passed: false,
          details: 'Low',
          dataPoints: 0
        }
      ]

      const passed = determinePassStatus(metrics, ['prMergeRate', 'accountAge'])

      expect(passed).toBe(true)
    })

    it('fails when a required metric fails', () => {
      const metrics: MetricCheckResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.2,
          threshold: 0.3,
          passed: false,
          details: 'Low',
          dataPoints: 10
        },
        {
          name: 'accountAge',
          rawValue: 100,
          threshold: 30,
          passed: true,
          details: 'Good',
          dataPoints: 1
        }
      ]

      const passed = determinePassStatus(metrics, ['prMergeRate', 'accountAge'])

      expect(passed).toBe(false)
    })

    it('requires all metrics to pass when requiredMetrics is empty', () => {
      const metrics: MetricCheckResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.5,
          threshold: 0.3,
          passed: true,
          details: 'Good',
          dataPoints: 10
        },
        {
          name: 'accountAge',
          rawValue: 10,
          threshold: 30,
          passed: false,
          details: 'New',
          dataPoints: 1
        }
      ]

      const passed = determinePassStatus(metrics, [])

      expect(passed).toBe(false)
    })
  })

  describe('generateRecommendations', () => {
    it('recommends improving PR quality for failed prMergeRate', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 2,
          closedWithoutMerge: 8,
          openPRs: 0,
          mergeRate: 0.2,
          averagePRSize: 50,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 0,
          positiveReactions: 0,
          negativeReactions: 0,
          neutralReactions: 0,
          positiveRatio: 0.5
        },
        account: {
          createdAt: new Date(),
          ageInDays: 100,
          monthsWithActivity: 3,
          totalMonthsInWindow: 12,
          consistencyScore: 0.25
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 0,
          reviewCommentsGiven: 0,
          reviewedRepos: []
        }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.2,
          threshold: 0.3,
          passed: false,
          details: 'Low merge rate',
          dataPoints: 10
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('pr quality'))).toBe(true)
    })

    it('recommends contributing to quality repos for failed repoQuality', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 5,
          mergedPRs: 4,
          closedWithoutMerge: 1,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 50,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [{ owner: 'user', repo: 'small', stars: 10, mergedPRCount: 1 }],
          qualityRepoCount: 0,
          averageRepoStars: 10,
          highestStarRepo: 10
        },
        reactions: {
          totalComments: 5,
          positiveReactions: 3,
          negativeReactions: 1,
          neutralReactions: 1,
          positiveRatio: 0.6
        },
        account: {
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
          ageInDays: 200,
          monthsWithActivity: 6,
          totalMonthsInWindow: 12,
          consistencyScore: 0.5
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 2,
          reviewCommentsGiven: 1,
          reviewedRepos: []
        }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'repoQuality',
          rawValue: 0,
          threshold: 1,
          passed: false,
          details: 'No quality repos',
          dataPoints: 1
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('established'))).toBe(true)
    })

    it('recommends code reviews for failed codeReviews metric', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 8,
          closedWithoutMerge: 2,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 100,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 10,
          positiveReactions: 8,
          negativeReactions: 1,
          neutralReactions: 1,
          positiveRatio: 0.8
        },
        account: {
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          ageInDays: 400,
          monthsWithActivity: 10,
          totalMonthsInWindow: 12,
          consistencyScore: 0.83
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 2,
          reviewCommentsGiven: 1,
          reviewedRepos: []
        }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'codeReviews',
          rawValue: 2,
          threshold: 5,
          passed: false,
          details: 'Few reviews',
          dataPoints: 2
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('code review'))).toBe(true)
    })

    it('adds general recommendation when metrics fail but no specific recommendation applies', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 0,
          mergedPRs: 0,
          closedWithoutMerge: 0,
          openPRs: 0,
          mergeRate: 0,
          averagePRSize: 0,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 0,
          positiveReactions: 0,
          negativeReactions: 0,
          neutralReactions: 0,
          positiveRatio: 0.5
        },
        account: {
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          ageInDays: 100,
          monthsWithActivity: 0,
          totalMonthsInWindow: 12,
          consistencyScore: 0
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 0,
          reviewCommentsGiven: 0,
          reviewedRepos: []
        }
      }

      // A metric that fails but doesn't have a specific recommendation
      const metrics: MetricCheckResult[] = [
        {
          name: 'positiveReactions',
          rawValue: 0,
          threshold: 5,
          passed: false,
          details: 'No reactions',
          dataPoints: 0
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      // Should have the positiveReactions specific recommendation
      expect(recommendations.some((r) => r.toLowerCase().includes('engage'))).toBe(true)
    })

    it('recommends focusing on constructive communication for failed negativeReactions', () => {
      const metricsData: AllMetricsData = {
        prHistory: { totalPRs: 10, mergedPRs: 8, mergeRate: 0.8 },
        reactions: { positive: 5, negative: 3, sources: { comments: 10, issues: 0 } },
        repoQuality: { contributedRepos: [], qualityRepoCount: 0, totalStarredContributions: 0 },
        account: { ageInDays: 180, monthsWithActivity: 6, totalMonthsInWindow: 12, consistencyRate: 0.5 },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 3,
          issuesWithReactions: 2,
          averageCommentsPerIssue: 2
        },
        codeReviews: { reviewsGiven: 10, reviewCommentsGiven: 20, reviewedRepos: [] }
      }

      const metrics: MetricCheckResult[] = [
        { name: 'negativeReactions', rawValue: 3, threshold: 0, passed: false, details: 'Too many', dataPoints: 10 }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('constructive communication'))).toBe(true)
    })

    it('recommends continuing building history for failed accountAge', () => {
      const metricsData: AllMetricsData = {
        prHistory: { totalPRs: 10, mergedPRs: 8, mergeRate: 0.8 },
        reactions: { positive: 10, negative: 0, sources: { comments: 10, issues: 0 } },
        repoQuality: { contributedRepos: [], qualityRepoCount: 2, totalStarredContributions: 0 },
        account: { ageInDays: 20, monthsWithActivity: 1, totalMonthsInWindow: 1, consistencyRate: 1.0 },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 3,
          issuesWithReactions: 2,
          averageCommentsPerIssue: 2
        },
        codeReviews: { reviewsGiven: 10, reviewCommentsGiven: 20, reviewedRepos: [] }
      }

      const metrics: MetricCheckResult[] = [
        { name: 'accountAge', rawValue: 20, threshold: 30, passed: false, details: 'New account', dataPoints: 10 }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('continue building'))).toBe(true)
      expect(recommendations.some((r) => r.toLowerCase().includes('new accounts'))).toBe(true)
    })

    it('recommends maintaining consistency for failed activityConsistency with old account', () => {
      const metricsData: AllMetricsData = {
        prHistory: { totalPRs: 10, mergedPRs: 8, mergeRate: 0.8 },
        reactions: { positive: 10, negative: 0, sources: { comments: 10, issues: 0 } },
        repoQuality: { contributedRepos: [], qualityRepoCount: 2, totalStarredContributions: 0 },
        account: { ageInDays: 120, monthsWithActivity: 2, totalMonthsInWindow: 12, consistencyRate: 0.16 },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 3,
          issuesWithReactions: 2,
          averageCommentsPerIssue: 2
        },
        codeReviews: { reviewsGiven: 10, reviewCommentsGiven: 20, reviewedRepos: [] }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'activityConsistency',
          rawValue: 0.16,
          threshold: 0.3,
          passed: false,
          details: 'Inconsistent',
          dataPoints: 10
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('maintain consistent activity'))).toBe(true)
    })

    it('does not recommend consistency for new accounts (<90 days) with failed activityConsistency', () => {
      const metricsData: AllMetricsData = {
        prHistory: { totalPRs: 10, mergedPRs: 8, mergeRate: 0.8 },
        reactions: { positive: 10, negative: 0, sources: { comments: 10, issues: 0 } },
        repoQuality: { contributedRepos: [], qualityRepoCount: 2, totalStarredContributions: 0 },
        account: { ageInDays: 60, monthsWithActivity: 1, totalMonthsInWindow: 2, consistencyRate: 0.5 },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 3,
          issuesWithReactions: 2,
          averageCommentsPerIssue: 2
        },
        codeReviews: { reviewsGiven: 10, reviewCommentsGiven: 20, reviewedRepos: [] }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'activityConsistency',
          rawValue: 0.5,
          threshold: 0.7,
          passed: false,
          details: 'Inconsistent',
          dataPoints: 10
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      // Should not have specific consistency recommendation for accounts < 90 days
      expect(recommendations.some((r) => r.toLowerCase().includes('maintain consistent activity'))).toBe(false)
    })

    it('recommends creating issues for failed issueEngagement', () => {
      const metricsData: AllMetricsData = {
        prHistory: { totalPRs: 10, mergedPRs: 8, mergeRate: 0.8 },
        reactions: { positive: 10, negative: 0, sources: { comments: 10, issues: 0 } },
        repoQuality: { contributedRepos: [], qualityRepoCount: 2, totalStarredContributions: 0 },
        account: { ageInDays: 180, monthsWithActivity: 6, totalMonthsInWindow: 12, consistencyRate: 0.5 },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: { reviewsGiven: 10, reviewCommentsGiven: 20, reviewedRepos: [] }
      }

      const metrics: MetricCheckResult[] = [
        {
          name: 'issueEngagement',
          rawValue: 0,
          threshold: 1,
          passed: false,
          details: 'No issues',
          dataPoints: 0
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics)

      expect(recommendations.some((r) => r.toLowerCase().includes('create issues'))).toBe(true)
      expect(recommendations.some((r) => r.toLowerCase().includes('report bugs or suggest features'))).toBe(true)
    })
  })

  describe('evaluateContributor', () => {
    const createTestData = (overrides: Partial<GraphQLContributorData> = {}): GraphQLContributorData => ({
      user: {
        login: 'test-user',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        pullRequests: {
          totalCount: 10,
          nodes: [
            {
              state: 'MERGED',
              merged: true,
              mergedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              closedAt: new Date().toISOString(),
              additions: 100,
              deletions: 50,
              repository: {
                owner: { login: 'org' },
                name: 'repo',
                stargazerCount: 5000
              }
            },
            {
              state: 'MERGED',
              merged: true,
              mergedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              closedAt: new Date().toISOString(),
              additions: 50,
              deletions: 20,
              repository: {
                owner: { login: 'org' },
                name: 'repo2',
                stargazerCount: 3000
              }
            }
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        },
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: 200,
            weeks: Array(52)
              .fill(null)
              .map((_, i) => ({
                contributionDays: [
                  { contributionCount: 5, date: `2024-${String(Math.floor(i / 4) + 1).padStart(2, '0')}-15` }
                ]
              }))
          },
          pullRequestReviewContributions: { totalCount: 15 }
        },
        issueComments: {
          totalCount: 10,
          nodes: [
            { reactions: { nodes: [{ content: 'THUMBS_UP' }] } },
            { reactions: { nodes: [{ content: 'HEART' }] } },
            { reactions: { nodes: [{ content: 'THUMBS_UP' }] } },
            { reactions: { nodes: [{ content: 'THUMBS_UP' }] } },
            { reactions: { nodes: [{ content: 'HEART' }] } }
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        },
        ...overrides.user
      },
      issueSearch: {
        issueCount: 3,
        nodes: [
          {
            __typename: 'Issue',
            createdAt: new Date().toISOString(),
            comments: { totalCount: 5 },
            reactions: { nodes: [{ content: 'THUMBS_UP' }] }
          },
          {
            __typename: 'Issue',
            createdAt: new Date().toISOString(),
            comments: { totalCount: 3 },
            reactions: { nodes: [{ content: 'HEART' }] }
          }
        ],
        ...overrides.issueSearch
      }
    })

    it('returns a complete AnalysisResult for a passing contributor', () => {
      const data = createTestData()
      const result = evaluateContributor(data, testConfig, sinceDate)

      expect(result.username).toBe('test-user')
      expect(result.passed).toBeDefined()
      expect(result.passedCount).toBeLessThanOrEqual(result.totalMetrics)
      expect(result.metrics).toHaveLength(8) // All 8 metrics
      expect(result.analyzedAt).toBeInstanceOf(Date)
      expect(result.dataWindowStart).toEqual(sinceDate)
      expect(result.dataWindowEnd).toBeInstanceOf(Date)
      expect(result.isTrustedUser).toBe(false)
      expect(result.wasWhitelisted).toBe(false)
    })

    it('correctly identifies a new account', () => {
      const newAccountDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      const data = createTestData({
        user: {
          login: 'new-user',
          createdAt: newAccountDate.toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 10, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      } as Partial<GraphQLContributorData>)

      const result = evaluateContributor(data, testConfig, sinceDate)

      expect(result.isNewAccount).toBe(true)
    })

    it('correctly identifies limited data', () => {
      // Create data with minimal activity - totalDataPoints needs to be < 5
      const data: GraphQLContributorData = {
        user: {
          login: 'limited-data-user',
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 1, weeks: [] },
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

      const result = evaluateContributor(data, testConfig, sinceDate)

      expect(result.hasLimitedData).toBe(true)
    })

    it('returns correct failedMetrics array', () => {
      // Config with non-zero thresholds so we can test failures
      const strictConfig = {
        ...testConfig,
        thresholds: {
          ...testConfig.thresholds,
          accountAge: 30, // Require account to be at least 30 days old
          prMergeRate: 0.5 // Require at least 50% merge rate
        }
      }

      // Create data that will fail the accountAge metric
      const data: GraphQLContributorData = {
        user: {
          login: 'failing-user',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Only 10 days old
          pullRequests: {
            totalCount: 2,
            nodes: [
              {
                state: 'CLOSED',
                merged: false,
                mergedAt: null,
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 5,
                deletions: 1,
                repository: { owner: { login: 'user' }, name: 'small-repo', stargazerCount: 10 }
              },
              {
                state: 'CLOSED',
                merged: false,
                mergedAt: null,
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 5,
                deletions: 1,
                repository: { owner: { login: 'user' }, name: 'small-repo', stargazerCount: 10 }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 5, weeks: [] },
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

      const result = evaluateContributor(data, strictConfig, sinceDate)

      expect(result.failedMetrics).toBeDefined()
      expect(Array.isArray(result.failedMetrics)).toBe(true)
      // accountAge should fail (10 days < 30 days threshold)
      expect(result.failedMetrics).toContain('accountAge')
      // prMergeRate should fail (0% < 50% threshold)
      expect(result.failedMetrics).toContain('prMergeRate')
    })

    it('respects requiredMetrics configuration', () => {
      // Config with strict thresholds that will fail some metrics
      const strictConfig = {
        ...testConfig,
        thresholds: {
          ...testConfig.thresholds,
          prMergeRate: 0, // Easy to pass (any merge rate >= 0)
          codeReviews: 1000 // Impossible to pass
        },
        requiredMetrics: ['prMergeRate'] // Only prMergeRate is required
      }

      // Create data with good merge rate but low code reviews
      const data = createTestData()

      const result = evaluateContributor(data, strictConfig, sinceDate)

      // prMergeRate should pass (threshold is 0)
      const prMergeRateMetric = result.metrics.find((m) => m.name === 'prMergeRate')
      expect(prMergeRateMetric?.passed).toBe(true)

      // codeReviews should fail (threshold is 1000)
      const codeReviewsMetric = result.metrics.find((m) => m.name === 'codeReviews')
      expect(codeReviewsMetric?.passed).toBe(false)

      // Overall should pass because only prMergeRate is required
      expect(result.passed).toBe(true)
    })

    it('generates recommendations for failed metrics', () => {
      // Config with strict thresholds that will cause failures
      const strictConfig = {
        ...testConfig,
        thresholds: {
          ...testConfig.thresholds,
          prMergeRate: 0.9, // 90% merge rate required
          codeReviews: 100 // 100 code reviews required
        }
      }

      // Create data that will fail both metrics
      const data: GraphQLContributorData = {
        user: {
          login: 'needs-improvement',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
          pullRequests: {
            totalCount: 2,
            nodes: [
              {
                state: 'CLOSED',
                merged: false,
                mergedAt: null,
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 10,
                deletions: 5,
                repository: { owner: { login: 'user' }, name: 'repo', stargazerCount: 50 }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 10, weeks: [] },
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

      const result = evaluateContributor(data, strictConfig, sinceDate)

      // With strict thresholds, there should be failed metrics
      expect(result.failedMetrics.length).toBeGreaterThan(0)
      // And recommendations should be generated for them
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('counts passed metrics correctly', () => {
      const data = createTestData()
      const result = evaluateContributor(data, testConfig, sinceDate)

      const actualPassedCount = result.metrics.filter((m) => m.passed).length
      expect(result.passedCount).toBe(actualPassedCount)
    })
  })
})
