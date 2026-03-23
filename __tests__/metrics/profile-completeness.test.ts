/**
 * Tests for profile completeness metric
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { extractProfileData, checkProfileCompleteness } = await import('../../src/metrics/profile-completeness.js')

import { createContributorData, createProfileData } from '../../__fixtures__/testData.js'
import type { GraphQLContributorData } from '../../src/types/github.js'

/** Helper to create bare profile data (factory defaults use ?? which treats null as missing) */
function createBareProfileData(overrides: {
  followersCount?: number
  publicReposCount?: number
  bio?: string | null
  company?: string | null
}): GraphQLContributorData {
  const base = createContributorData()
  return {
    ...base,
    user: {
      ...base.user,
      bio: overrides.bio === undefined ? base.user.bio : (overrides.bio as string),
      company: overrides.company === undefined ? base.user.company : (overrides.company as string),
      location: null as unknown as string,
      websiteUrl: null as unknown as string,
      followers: { totalCount: overrides.followersCount ?? 0 },
      repositories: { totalCount: overrides.publicReposCount ?? 0 }
    }
  }
}

describe('Profile Completeness Metric', () => {
  describe('extractProfileData', () => {
    it('scores a complete profile at 100', () => {
      const data = createContributorData({
        followersCount: 50,
        publicReposCount: 10,
        bio: 'Full stack developer',
        company: 'Acme Corp'
      })

      const result = extractProfileData(data)

      expect(result.completenessScore).toBe(100)
      expect(result.hasBio).toBe(true)
      expect(result.hasCompany).toBe(true)
      expect(result.hasLocation).toBe(true)
      expect(result.hasWebsite).toBe(true)
    })

    it('scores an empty profile at 0', () => {
      const data = createBareProfileData({
        followersCount: 0,
        publicReposCount: 0,
        bio: null,
        company: null
      })

      const result = extractProfileData(data)

      expect(result.completenessScore).toBe(0)
      expect(result.hasBio).toBe(false)
      expect(result.hasCompany).toBe(false)
    })

    it('applies tiered follower scoring', () => {
      // 1 follower = 20 points (base)
      const low = createBareProfileData({ followersCount: 1, bio: null, company: null })
      expect(extractProfileData(low).completenessScore).toBe(20)

      // 10 followers = 30 points (base + mid)
      const mid = createBareProfileData({ followersCount: 10, bio: null, company: null })
      expect(extractProfileData(mid).completenessScore).toBe(30)

      // 50 followers = 40 points (base + mid + high)
      const high = createBareProfileData({ followersCount: 50, bio: null, company: null })
      expect(extractProfileData(high).completenessScore).toBe(40)
    })

    it('applies tiered repo scoring', () => {
      // 1 repo = 15 points (base)
      const low = createBareProfileData({ publicReposCount: 1, bio: null, company: null })
      expect(extractProfileData(low).completenessScore).toBe(15)

      // 5 repos = 20 points (base + high)
      const high = createBareProfileData({ publicReposCount: 5, bio: null, company: null })
      expect(extractProfileData(high).completenessScore).toBe(20)
    })

    it('treats whitespace-only bio as empty', () => {
      const data = createBareProfileData({
        bio: '   ',
        company: '  ',
        followersCount: 0,
        publicReposCount: 0
      })

      const result = extractProfileData(data)

      expect(result.hasBio).toBe(false)
      expect(result.hasCompany).toBe(false)
      expect(result.completenessScore).toBe(0)
    })
  })

  describe('checkProfileCompleteness', () => {
    it('passes when score meets threshold', () => {
      const data = createProfileData({ completenessScore: 80 })
      const result = checkProfileCompleteness(data, 60)

      expect(result.passed).toBe(true)
      expect(result.name).toBe('profileCompleteness')
      expect(result.rawValue).toBe(80)
      expect(result.details).toContain('meets threshold >= 60')
    })

    it('fails when score below threshold', () => {
      const data = createProfileData({
        completenessScore: 20,
        followersCount: 1,
        publicReposCount: 0,
        hasBio: false,
        hasCompany: false
      })
      const result = checkProfileCompleteness(data, 60)

      expect(result.passed).toBe(false)
      expect(result.details).toContain('below threshold >= 60')
      expect(result.details).toContain('Missing:')
    })

    it('lists present profile elements', () => {
      const data = createProfileData({
        completenessScore: 100,
        followersCount: 50,
        publicReposCount: 10,
        hasBio: true,
        hasCompany: true
      })
      const result = checkProfileCompleteness(data, 50)

      expect(result.details).toContain('50 followers')
      expect(result.details).toContain('10 public repos')
      expect(result.details).toContain('bio')
      expect(result.details).toContain('company')
    })

    it('omits threshold info when threshold is 0', () => {
      const data = createProfileData({ completenessScore: 50 })
      const result = checkProfileCompleteness(data, 0)

      expect(result.passed).toBe(true)
      expect(result.details).not.toContain('threshold')
    })

    it('does not show missing items when passed', () => {
      const data = createProfileData({
        completenessScore: 80,
        hasBio: false,
        hasCompany: true
      })
      const result = checkProfileCompleteness(data, 60)

      expect(result.passed).toBe(true)
      expect(result.details).not.toContain('Missing:')
    })
  })
})
