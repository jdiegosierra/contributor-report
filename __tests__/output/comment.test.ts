/**
 * Tests for PR comment generation
 */

import {
  generateAnalysisComment,
  generatePassedComment,
  generateWhitelistComment,
  COMMENT_MARKER
} from '../../src/output/comment.js'
import type { AnalysisResult } from '../../src/types/scoring.js'
import type { ContributorQualityConfig } from '../../src/types/config.js'
import type { MetricCheckResult } from '../../src/types/metrics.js'

describe('Comment Generation', () => {
  const baseConfig: ContributorQualityConfig = {
    githubToken: 'test-token',
    minimumStars: 100,
    analysisWindowMonths: 12,
    newAccountThresholdDays: 30,
    newAccountAction: 'neutral',
    thresholds: {
      prMergeRate: 0.5,
      repoQuality: 2,
      positiveReactions: 5,
      negativeReactions: 0,
      accountAge: 30,
      activityConsistency: 0.3,
      issueEngagement: 1,
      codeReviews: 2
    },
    trustedUsers: [],
    trustedOrgs: [],
    labelName: '',
    onFail: 'comment',
    requiredMetrics: ['prMergeRate', 'accountAge'],
    dryRun: false
  }

  const createMetric = (name: string, rawValue: number, threshold: number, passed: boolean): MetricCheckResult => ({
    name,
    rawValue,
    threshold,
    passed,
    details: `Test metric ${name}`,
    dataPoints: 10
  })

  const baseResult: AnalysisResult = {
    username: 'testuser',
    passed: true,
    passedCount: 8,
    totalMetrics: 8,
    failedMetrics: [],
    metrics: [
      createMetric('prMergeRate', 0.8, 0.5, true),
      createMetric('repoQuality', 3, 2, true),
      createMetric('positiveReactions', 10, 5, true),
      createMetric('negativeReactions', 0, 0, true),
      createMetric('accountAge', 180, 30, true),
      createMetric('activityConsistency', 0.6, 0.3, true),
      createMetric('issueEngagement', 5, 1, true),
      createMetric('codeReviews', 10, 2, true)
    ],
    recommendations: [],
    isNewAccount: false,
    hasLimitedData: false,
    isTrustedUser: false,
    wasWhitelisted: false,
    analyzedAt: new Date('2026-01-01'),
    dataWindowStart: new Date('2025-01-01'),
    dataWindowEnd: new Date('2026-01-01')
  }

  describe('generateAnalysisComment', () => {
    it('generates comment for passed analysis', () => {
      const comment = generateAnalysisComment(baseResult, baseConfig)

      expect(comment).toContain(COMMENT_MARKER)
      expect(comment).toContain('## ✅ Contributor Report')
      expect(comment).toContain('**User:** @testuser')
      expect(comment).toContain('**Status:** Passed (8/8 metrics passed)')
      expect(comment).toContain('| Metric | Description | Value | Threshold | Status |')
      expect(comment).toContain(
        '[PR Merge Rate](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/pr-merge-rate.md)'
      )
      expect(comment).toContain('80%')
      expect(comment).toContain('>= 50%')
      expect(comment).toContain('Analysis period: 2025-01-01 to 2026-01-01')
    })

    it('generates comment for failed analysis', () => {
      const failedResult: AnalysisResult = {
        ...baseResult,
        passed: false,
        passedCount: 6,
        failedMetrics: ['prMergeRate', 'codeReviews'],
        metrics: [
          createMetric('prMergeRate', 0.3, 0.5, false),
          createMetric('codeReviews', 0, 2, false),
          ...baseResult.metrics.slice(2, 6)
        ],
        recommendations: ['Improve PR quality to increase merge rate', 'Contribute code reviews to other projects']
      }

      const comment = generateAnalysisComment(failedResult, baseConfig)

      expect(comment).toContain('## ⚠️ Contributor Report')
      expect(comment).toContain('**Status:** Needs Review (6/8 metrics passed)')
      expect(comment).toContain('### Recommendations')
      expect(comment).toContain('- Improve PR quality to increase merge rate')
      expect(comment).toContain('- Contribute code reviews to other projects')
      expect(comment).toContain('❌')
    })

    it('includes new account note when applicable', () => {
      const newAccountResult: AnalysisResult = {
        ...baseResult,
        isNewAccount: true,
        metrics: [createMetric('accountAge', 15, 30, false)]
      }

      const comment = generateAnalysisComment(newAccountResult, baseConfig)

      expect(comment).toContain('> **Note:** This is a new GitHub account (< 30 days old)')
      expect(comment).toContain('Limited history is available for evaluation')
    })

    it('includes limited data note when applicable', () => {
      const limitedDataResult: AnalysisResult = {
        ...baseResult,
        hasLimitedData: true,
        isNewAccount: false
      }

      const comment = generateAnalysisComment(limitedDataResult, baseConfig)

      expect(comment).toContain('> **Note:** Limited contribution data available')
      expect(comment).toContain('Results may be affected')
    })

    it('does not show limited data note for new accounts', () => {
      const result: AnalysisResult = {
        ...baseResult,
        hasLimitedData: true,
        isNewAccount: true
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).not.toContain('Limited contribution data available')
      expect(comment).toContain('new GitHub account')
    })

    it('does not show recommendations when all metrics pass', () => {
      const result: AnalysisResult = {
        ...baseResult,
        passed: true,
        recommendations: []
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).not.toContain('### Recommendations')
    })

    it('formats percentage metrics correctly', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('prMergeRate', 0.75, 0.5, true), createMetric('activityConsistency', 0.33, 0.3, true)]
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).toContain('75%')
      expect(comment).toContain('33%')
      expect(comment).toContain('>= 50%')
      expect(comment).toContain('>= 30%')
    })

    it('formats account age correctly', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('accountAge', 180, 30, true)]
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).toContain('180 days')
      expect(comment).toContain('>= 30 days')
    })

    it('formats negative reactions with <= operator', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('negativeReactions', 0, 0, true)]
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).toContain('<= 0')
    })

    it('formats suspicious patterns threshold as N/A', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('suspiciousPatterns', 0, 0, true)]
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).toContain('| N/A |')
    })

    it('formats regular metrics with numbers', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [
          createMetric('repoQuality', 5, 2, true),
          createMetric('issueEngagement', 10, 1, true),
          createMetric('codeReviews', 15, 2, true)
        ]
      }

      const comment = generateAnalysisComment(result, baseConfig)

      expect(comment).toContain('| [Repo Quality]')
      expect(comment).toContain('| 5 |')
      expect(comment).toContain('| [Issue Engagement]')
      expect(comment).toContain('| 10 |')
      expect(comment).toContain('| [Code Reviews]')
      expect(comment).toContain('| 15 |')
    })
  })

  describe('generatePassedComment', () => {
    it('generates compact passed comment', () => {
      const comment = generatePassedComment(baseResult)

      expect(comment).toContain(COMMENT_MARKER)
      expect(comment).toContain('## ✅ Contributor Report')
      expect(comment).toContain('**User:** @testuser')
      expect(comment).toContain('**Status:** Passed (8/8 metrics)')
      expect(comment).toContain('<details>')
      expect(comment).toContain('<summary>View metric details</summary>')
      expect(comment).toContain('</details>')
      expect(comment).toContain('[PR Merge Rate]')
    })

    it('includes all metrics in details section', () => {
      const comment = generatePassedComment(baseResult)

      expect(comment).toContain('[PR Merge Rate]')
      expect(comment).toContain('[Repo Quality]')
      expect(comment).toContain('[Positive Reactions]')
      expect(comment).toContain('[Account Age]')
      expect(comment).toContain('[Activity Consistency]')
      expect(comment).toContain('[Issue Engagement]')
      expect(comment).toContain('[Code Reviews]')
    })

    it('shows correct status icons', () => {
      const mixedResult: AnalysisResult = {
        ...baseResult,
        passedCount: 7,
        metrics: [createMetric('prMergeRate', 0.8, 0.5, true), createMetric('codeReviews', 0, 2, false)]
      }

      const comment = generatePassedComment(mixedResult)

      expect(comment).toContain('✅')
      expect(comment).toContain('❌')
    })
  })

  describe('generateWhitelistComment', () => {
    it('generates whitelist comment', () => {
      const comment = generateWhitelistComment('trusteduser')

      expect(comment).toContain(COMMENT_MARKER)
      expect(comment).toContain('## ✅ Contributor Report')
      expect(comment).toContain('**User:** @trusteduser')
      expect(comment).toContain('**Status:** Trusted contributor (whitelisted)')
      expect(comment).toContain('This user is on the trusted contributors list and was automatically approved')
    })

    it('uses username parameter correctly', () => {
      const comment1 = generateWhitelistComment('alice')
      const comment2 = generateWhitelistComment('bob')

      expect(comment1).toContain('@alice')
      expect(comment2).toContain('@bob')
      expect(comment1).not.toContain('@bob')
      expect(comment2).not.toContain('@alice')
    })
  })

  describe('metric name formatting with links', () => {
    it('includes documentation links for all metrics', () => {
      const comment = generateAnalysisComment(baseResult, baseConfig)

      const expectedLinks = [
        '[PR Merge Rate](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/pr-merge-rate.md)',
        '[Repo Quality](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/repo-quality.md)',
        '[Positive Reactions](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/positive-reactions.md)',
        '[Negative Reactions](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/negative-reactions.md)',
        '[Account Age](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/account-age.md)',
        '[Activity Consistency](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/activity-consistency.md)',
        '[Issue Engagement](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/issue-engagement.md)',
        '[Code Reviews](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/code-reviews.md)'
      ]

      expectedLinks.forEach((link) => {
        expect(comment).toContain(link)
      })
    })
  })

  describe('COMMENT_MARKER', () => {
    it('exports correct comment marker', () => {
      expect(COMMENT_MARKER).toBe('<!-- contributor-report-check -->')
    })
  })
})
