/**
 * Tests for suspicious patterns metric
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { extractSuspiciousPatterns, hasCriticalSpamPatterns, checkSuspiciousPatterns } =
  await import('../../src/metrics/suspicious-patterns.js')

import {
  createPRHistoryData,
  createAccountData,
  createMergerDiversityData,
  createSuspiciousPatternData
} from '../../__fixtures__/testData.js'
import type { RepoQualityData } from '../../src/types/metrics.js'

function createRepoQualityData(overrides: Partial<RepoQualityData> = {}): RepoQualityData {
  return {
    contributedRepos: [
      { name: 'org/repo', stars: 1000, mergedPRCount: 5 },
      { name: 'org/repo2', stars: 500, mergedPRCount: 3 }
    ],
    qualifiedRepos: 2,
    averageRepoStars: 750,
    totalRepos: 2,
    ...overrides
  }
}

describe('Suspicious Patterns Metric', () => {
  describe('extractSuspiciousPatterns', () => {
    it('detects no patterns for normal contributor', () => {
      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 10 }),
          repoQuality: createRepoQualityData(),
          account: createAccountData({ ageInDays: 400 }),
          mergerDiversity: createMergerDiversityData({ selfMergeRate: 0.1, totalMergedPRs: 8 })
        },
        'test-user'
      )

      expect(result.detectedPatterns).toHaveLength(0)
      expect(result.accountAgeInDays).toBe(400)
    })

    it('detects SPAM_PATTERN for new account with high activity', () => {
      const manyRepos = Array.from({ length: 15 }, (_, i) => ({
        name: `org/repo${i}`,
        stars: 100,
        mergedPRCount: 2
      }))

      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 30 }),
          repoQuality: createRepoQualityData({ contributedRepos: manyRepos }),
          account: createAccountData({ ageInDays: 10 }),
          mergerDiversity: createMergerDiversityData()
        },
        'spam-user'
      )

      const spamPattern = result.detectedPatterns.find((p) => p.type === 'SPAM_PATTERN')
      expect(spamPattern).toBeDefined()
      expect(spamPattern!.severity).toBe('CRITICAL')
    })

    it('detects HIGH_PR_RATE for abnormal submission rate', () => {
      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 100 }),
          repoQuality: createRepoQualityData(),
          account: createAccountData({ ageInDays: 10 }),
          mergerDiversity: createMergerDiversityData()
        },
        'fast-user'
      )

      const highPRRate = result.detectedPatterns.find((p) => p.type === 'HIGH_PR_RATE')
      expect(highPRRate).toBeDefined()
      expect(highPRRate!.severity).toBe('WARNING')
    })

    it('detects SELF_MERGE_ABUSE for self-merges on low-quality repos', () => {
      const lowQualityRepos = Array.from({ length: 5 }, (_, i) => ({
        name: `user/repo${i}`,
        stars: 2,
        mergedPRCount: 4
      }))

      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 20 }),
          repoQuality: createRepoQualityData({ contributedRepos: lowQualityRepos }),
          account: createAccountData({ ageInDays: 200 }),
          mergerDiversity: createMergerDiversityData({
            selfMergeRate: 0.8,
            totalMergedPRs: 20
          })
        },
        'self-merger'
      )

      const abuse = result.detectedPatterns.find((p) => p.type === 'SELF_MERGE_ABUSE')
      expect(abuse).toBeDefined()
      expect(abuse!.severity).toBe('CRITICAL')
    })

    it('detects REPO_SPAM for many low-quality repos', () => {
      const lowStarRepos = Array.from({ length: 15 }, (_, i) => ({
        name: `org/repo${i}`,
        stars: 3,
        mergedPRCount: 1
      }))

      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 15 }),
          repoQuality: createRepoQualityData({
            contributedRepos: lowStarRepos,
            averageRepoStars: 3
          }),
          account: createAccountData({ ageInDays: 200 }),
          mergerDiversity: createMergerDiversityData()
        },
        'repo-spammer'
      )

      const repoSpam = result.detectedPatterns.find((p) => p.type === 'REPO_SPAM')
      expect(repoSpam).toBeDefined()
      expect(repoSpam!.severity).toBe('WARNING')
    })

    it('handles zero account age without division by zero', () => {
      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 5 }),
          repoQuality: createRepoQualityData(),
          account: createAccountData({ ageInDays: 0 }),
          mergerDiversity: createMergerDiversityData()
        },
        'brand-new'
      )

      expect(result.prRate).toBe(5)
    })

    it('can detect multiple patterns simultaneously', () => {
      const manyLowQualityRepos = Array.from({ length: 15 }, (_, i) => ({
        name: `user/repo${i}`,
        stars: 2,
        mergedPRCount: 3
      }))

      const result = extractSuspiciousPatterns(
        {
          prHistory: createPRHistoryData({ totalPRs: 50 }),
          repoQuality: createRepoQualityData({
            contributedRepos: manyLowQualityRepos,
            averageRepoStars: 2
          }),
          account: createAccountData({ ageInDays: 10 }),
          mergerDiversity: createMergerDiversityData({
            selfMergeRate: 0.9,
            totalMergedPRs: 45
          })
        },
        'super-spammer'
      )

      expect(result.detectedPatterns.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('hasCriticalSpamPatterns', () => {
    it('returns false when no patterns', () => {
      const data = createSuspiciousPatternData({ detectedPatterns: [] })
      expect(hasCriticalSpamPatterns(data)).toBe(false)
    })

    it('returns false for warnings only', () => {
      const data = createSuspiciousPatternData({
        detectedPatterns: [{ type: 'HIGH_PR_RATE', severity: 'WARNING', description: 'test', evidence: {} }]
      })
      expect(hasCriticalSpamPatterns(data)).toBe(false)
    })

    it('returns true when critical patterns exist', () => {
      const data = createSuspiciousPatternData({
        detectedPatterns: [{ type: 'SPAM_PATTERN', severity: 'CRITICAL', description: 'test', evidence: {} }]
      })
      expect(hasCriticalSpamPatterns(data)).toBe(true)
    })
  })

  describe('checkSuspiciousPatterns', () => {
    it('passes when no patterns detected', () => {
      const data = createSuspiciousPatternData({ detectedPatterns: [] })
      const result = checkSuspiciousPatterns(data)

      expect(result.passed).toBe(true)
      expect(result.name).toBe('suspiciousPatterns')
      expect(result.rawValue).toBe(0)
      expect(result.details).toContain('No suspicious activity')
    })

    it('fails on critical patterns', () => {
      const data = createSuspiciousPatternData({
        detectedPatterns: [{ type: 'SPAM_PATTERN', severity: 'CRITICAL', description: 'Spam detected', evidence: {} }]
      })
      const result = checkSuspiciousPatterns(data)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(1)
      expect(result.details).toContain('CRITICAL')
      expect(result.details).toContain('SPAM_PATTERN')
    })

    it('passes with warnings only', () => {
      const data = createSuspiciousPatternData({
        detectedPatterns: [
          { type: 'HIGH_PR_RATE', severity: 'WARNING', description: 'High rate', evidence: {} },
          { type: 'REPO_SPAM', severity: 'WARNING', description: 'Repo spam', evidence: {} }
        ]
      })
      const result = checkSuspiciousPatterns(data)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(2)
      expect(result.details).toContain('warning')
      expect(result.details).toContain('HIGH_PR_RATE')
    })
  })
})
