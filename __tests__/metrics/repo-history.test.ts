/**
 * Tests for repository history metric
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { extractRepoHistoryData, checkRepoHistoryMergeRate, checkRepoHistoryMinPRs } =
  await import('../../src/metrics/repo-history.js')

import {
  createContributorData,
  createPRNode,
  createPRContext,
  createRepoHistoryData
} from '../../__fixtures__/testData.js'

describe('Repository History Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const prContext = createPRContext({ owner: 'org', repo: 'repo' })

  describe('extractRepoHistoryData', () => {
    it('calculates merge rate for target repo', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 5,
          nodes: [
            createPRNode({ state: 'MERGED', owner: 'org', repo: 'repo' }),
            createPRNode({ state: 'MERGED', owner: 'org', repo: 'repo' }),
            createPRNode({ state: 'MERGED', owner: 'org', repo: 'repo' }),
            createPRNode({ state: 'CLOSED', merged: false, mergedBy: null, owner: 'org', repo: 'repo' }),
            createPRNode({ state: 'MERGED', owner: 'other', repo: 'other-repo' })
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractRepoHistoryData(data, prContext, sinceDate)

      expect(result.repoName).toBe('org/repo')
      expect(result.totalPRsInRepo).toBe(4)
      expect(result.mergedPRsInRepo).toBe(3)
      expect(result.closedWithoutMergeInRepo).toBe(1)
      expect(result.repoMergeRate).toBe(0.75)
      expect(result.isFirstTimeContributor).toBe(false)
    })

    it('identifies first-time contributors', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 1,
          nodes: [createPRNode({ state: 'OPEN', merged: false, mergedBy: null, owner: 'org', repo: 'repo' })],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractRepoHistoryData(data, prContext, sinceDate)

      expect(result.isFirstTimeContributor).toBe(true)
      expect(result.mergedPRsInRepo).toBe(0)
    })

    it('handles no PRs in target repo', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 3,
          nodes: [
            createPRNode({ owner: 'other', repo: 'other-repo' }),
            createPRNode({ owner: 'another', repo: 'another-repo' }),
            createPRNode({ owner: 'someone', repo: 'some-repo' })
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractRepoHistoryData(data, prContext, sinceDate)

      expect(result.totalPRsInRepo).toBe(0)
      expect(result.repoMergeRate).toBe(0)
      expect(result.isFirstTimeContributor).toBe(true)
    })

    it('is case-insensitive for repo matching', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 1,
          nodes: [createPRNode({ state: 'MERGED', owner: 'ORG', repo: 'REPO' })],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractRepoHistoryData(data, prContext, sinceDate)

      expect(result.totalPRsInRepo).toBe(1)
      expect(result.mergedPRsInRepo).toBe(1)
    })

    it('filters PRs by sinceDate', () => {
      const oldPR = createPRNode({ state: 'MERGED', owner: 'org', repo: 'repo' })
      oldPR.createdAt = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString()

      const data = createContributorData({
        pullRequests: {
          totalCount: 2,
          nodes: [createPRNode({ state: 'MERGED', owner: 'org', repo: 'repo' }), oldPR],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractRepoHistoryData(data, prContext, sinceDate)

      expect(result.totalPRsInRepo).toBe(1)
    })
  })

  describe('checkRepoHistoryMergeRate', () => {
    it('passes when merge rate meets threshold', () => {
      const data = createRepoHistoryData({ repoMergeRate: 0.8 })
      const result = checkRepoHistoryMergeRate(data, 0.5)

      expect(result.passed).toBe(true)
      expect(result.name).toBe('repoHistoryMergeRate')
      expect(result.details).toContain('meets threshold')
    })

    it('fails when merge rate below threshold', () => {
      const data = createRepoHistoryData({ repoMergeRate: 0.2 })
      const result = checkRepoHistoryMergeRate(data, 0.5)

      expect(result.passed).toBe(false)
      expect(result.details).toContain('below threshold')
    })

    it('handles first-time contributor with no PRs', () => {
      const data = createRepoHistoryData({ totalPRsInRepo: 0 })
      const result = checkRepoHistoryMergeRate(data, 0)

      expect(result.passed).toBe(true)
      expect(result.details).toContain('First-time contributor')
    })

    it('fails first-time contributor when threshold > 0', () => {
      const data = createRepoHistoryData({ totalPRsInRepo: 0 })
      const result = checkRepoHistoryMergeRate(data, 0.5)

      expect(result.passed).toBe(false)
    })

    it('handles all open PRs (no resolved)', () => {
      const data = createRepoHistoryData({
        totalPRsInRepo: 3,
        mergedPRsInRepo: 0,
        closedWithoutMergeInRepo: 0,
        repoMergeRate: 0
      })
      const result = checkRepoHistoryMergeRate(data, 0)

      expect(result.passed).toBe(true)
      expect(result.details).toContain('still open')
    })
  })

  describe('checkRepoHistoryMinPRs', () => {
    it('passes when PR count meets threshold', () => {
      const data = createRepoHistoryData({ totalPRsInRepo: 5 })
      const result = checkRepoHistoryMinPRs(data, 3)

      expect(result.passed).toBe(true)
      expect(result.name).toBe('repoHistoryMinPRs')
      expect(result.details).toContain('meets threshold >= 3')
    })

    it('fails when PR count below threshold', () => {
      const data = createRepoHistoryData({ totalPRsInRepo: 1 })
      const result = checkRepoHistoryMinPRs(data, 3)

      expect(result.passed).toBe(false)
      expect(result.details).toContain('below threshold >= 3')
    })

    it('shows first-time contributor message', () => {
      const data = createRepoHistoryData({ totalPRsInRepo: 0, isFirstTimeContributor: true })
      const result = checkRepoHistoryMinPRs(data, 0)

      expect(result.passed).toBe(true)
      expect(result.details).toContain('First-time contributor')
    })
  })
})
