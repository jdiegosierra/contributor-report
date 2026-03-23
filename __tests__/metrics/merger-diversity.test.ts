/**
 * Tests for merger diversity metric
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { extractMergerDiversityData, checkMergerDiversity } = await import('../../src/metrics/merger-diversity.js')

import { createContributorData, createPRNode, createMergerDiversityData } from '../../__fixtures__/testData.js'

describe('Merger Diversity Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractMergerDiversityData', () => {
    it('counts unique mergers correctly', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 4,
          nodes: [
            createPRNode({ mergedBy: 'alice' }),
            createPRNode({ mergedBy: 'bob' }),
            createPRNode({ mergedBy: 'alice' }),
            createPRNode({ mergedBy: 'charlie' })
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'test-user', sinceDate)

      expect(result.uniqueMergers).toBe(3)
      expect(result.totalMergedPRs).toBe(4)
      expect(result.othersMergeCount).toBe(4)
      expect(result.selfMergeCount).toBe(0)
    })

    it('detects self-merges on own repos', () => {
      const data = createContributorData({
        login: 'test-user',
        pullRequests: {
          totalCount: 2,
          nodes: [
            createPRNode({ mergedBy: 'test-user', owner: 'test-user', repo: 'my-repo' }),
            createPRNode({ mergedBy: 'test-user', owner: 'test-user', repo: 'my-other-repo' })
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'test-user', sinceDate)

      expect(result.selfMergeCount).toBe(2)
      expect(result.selfMergesOnOwnRepos).toBe(2)
      expect(result.onlySelfMergesOnOwnRepos).toBe(true)
    })

    it('detects self-merges on external repos as trust signal', () => {
      const data = createContributorData({
        login: 'test-user',
        pullRequests: {
          totalCount: 1,
          nodes: [createPRNode({ mergedBy: 'test-user', owner: 'org', repo: 'project' })],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'test-user', sinceDate)

      expect(result.selfMergesOnExternalRepos).toBe(1)
      expect(result.externalReposWithMergePrivilege).toContain('org/project')
      expect(result.onlySelfMergesOnOwnRepos).toBe(false)
    })

    it('handles case-insensitive username comparison', () => {
      const data = createContributorData({
        login: 'Test-User',
        pullRequests: {
          totalCount: 1,
          nodes: [createPRNode({ mergedBy: 'TEST-USER', owner: 'org', repo: 'repo' })],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'Test-User', sinceDate)

      expect(result.selfMergeCount).toBe(1)
    })

    it('handles no merged PRs', () => {
      const data = createContributorData({
        pullRequests: {
          totalCount: 2,
          nodes: [
            createPRNode({ state: 'CLOSED', merged: false, mergedBy: null }),
            createPRNode({ state: 'OPEN', merged: false, mergedBy: null })
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'test-user', sinceDate)

      expect(result.totalMergedPRs).toBe(0)
      expect(result.uniqueMergers).toBe(0)
      expect(result.selfMergeRate).toBe(0)
    })

    it('filters PRs by sinceDate', () => {
      const oldDate = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000)
      const oldPR = createPRNode({ mergedBy: 'alice' })
      // Override mergedAt to be old
      oldPR.mergedAt = oldDate.toISOString()

      const data = createContributorData({
        pullRequests: {
          totalCount: 2,
          nodes: [createPRNode({ mergedBy: 'bob' }), oldPR],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      })

      const result = extractMergerDiversityData(data, 'test-user', sinceDate)

      expect(result.totalMergedPRs).toBe(1)
      expect(result.mergerLogins).toContain('bob')
    })
  })

  describe('checkMergerDiversity', () => {
    it('passes when unique mergers meet threshold', () => {
      const data = createMergerDiversityData({ uniqueMergers: 3 })
      const result = checkMergerDiversity(data, 2)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(3)
      expect(result.name).toBe('mergerDiversity')
    })

    it('fails when unique mergers below threshold', () => {
      const data = createMergerDiversityData({ uniqueMergers: 1, othersMergeCount: 0 })
      const result = checkMergerDiversity(data, 3)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(1)
    })

    it('handles no merged PRs with threshold 0', () => {
      const data = createMergerDiversityData({ totalMergedPRs: 0 })
      const result = checkMergerDiversity(data, 0)

      expect(result.passed).toBe(true)
      expect(result.details).toContain('No merged PRs')
    })

    it('fails for no merged PRs when threshold > 0', () => {
      const data = createMergerDiversityData({ totalMergedPRs: 0 })
      const result = checkMergerDiversity(data, 2)

      expect(result.passed).toBe(false)
    })

    it('fails when only self-merges on own repos', () => {
      const data = createMergerDiversityData({
        totalMergedPRs: 5,
        onlySelfMergesOnOwnRepos: true,
        selfMergeCount: 5,
        othersMergeCount: 0
      })
      const result = checkMergerDiversity(data, 1)

      expect(result.passed).toBe(false)
      expect(result.details).toContain('self-merges on own repositories')
    })

    it('includes external repo privilege in details', () => {
      const data = createMergerDiversityData({
        externalReposWithMergePrivilege: ['org/repo', 'org/repo2']
      })
      const result = checkMergerDiversity(data, 1)

      expect(result.passed).toBe(true)
      expect(result.details).toContain('merge rights on 2 external repos')
    })

    it('includes threshold info when threshold > 0', () => {
      const data = createMergerDiversityData({ uniqueMergers: 3 })
      const result = checkMergerDiversity(data, 2)

      expect(result.details).toContain('meets threshold >= 2')
    })
  })
})
