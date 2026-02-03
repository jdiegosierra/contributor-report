/**
 * Tests for output formatting utilities
 */

import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const {
  formatActionOutput,
  setActionOutputs,
  setWhitelistOutputs,
  logResultSummary,
  writeJobSummary,
  writeWhitelistSummary
} = await import('../../src/output/formatter.js')

import type { AnalysisResult } from '../../src/types/scoring.js'
import type { MetricCheckResult } from '../../src/types/metrics.js'

describe('Output Formatter', () => {
  const createMetric = (name: string, rawValue: number, threshold: number, passed: boolean): MetricCheckResult => ({
    name,
    rawValue,
    threshold,
    passed,
    details: `Test metric ${name}`
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
    wasWhitelisted: false,
    dataWindowStart: new Date('2025-01-01'),
    dataWindowEnd: new Date('2026-01-01')
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('formatActionOutput', () => {
    it('formats passed analysis result correctly', () => {
      const output = formatActionOutput(baseResult)

      expect(output.passed).toBe(true)
      expect(output.passedCount).toBe(8)
      expect(output.totalMetrics).toBe(8)
      expect(output.isNewAccount).toBe(false)
      expect(output.hasLimitedData).toBe(false)
      expect(output.wasWhitelisted).toBe(false)

      const breakdown = JSON.parse(output.breakdown)
      expect(breakdown.passed).toBe(true)
      expect(breakdown.passedCount).toBe(8)
      expect(breakdown.totalMetrics).toBe(8)
      expect(breakdown.metrics).toHaveLength(8)
      expect(breakdown.analysisWindow.start).toBe('2025-01-01T00:00:00.000Z')
      expect(breakdown.analysisWindow.end).toBe('2026-01-01T00:00:00.000Z')

      const recommendations = JSON.parse(output.recommendations)
      expect(recommendations).toEqual([])
    })

    it('formats failed analysis result correctly', () => {
      const failedResult: AnalysisResult = {
        ...baseResult,
        passed: false,
        passedCount: 6,
        failedMetrics: ['prMergeRate', 'codeReviews'],
        recommendations: ['Improve PR quality', 'Add more code reviews']
      }

      const output = formatActionOutput(failedResult)

      expect(output.passed).toBe(false)
      expect(output.passedCount).toBe(6)

      const breakdown = JSON.parse(output.breakdown)
      expect(breakdown.passed).toBe(false)
      expect(breakdown.failedMetrics).toEqual(['prMergeRate', 'codeReviews'])

      const recommendations = JSON.parse(output.recommendations)
      expect(recommendations).toEqual(['Improve PR quality', 'Add more code reviews'])
    })

    it('includes new account flag', () => {
      const newAccountResult: AnalysisResult = {
        ...baseResult,
        isNewAccount: true
      }

      const output = formatActionOutput(newAccountResult)
      expect(output.isNewAccount).toBe(true)
    })

    it('includes limited data flag', () => {
      const limitedDataResult: AnalysisResult = {
        ...baseResult,
        hasLimitedData: true
      }

      const output = formatActionOutput(limitedDataResult)
      expect(output.hasLimitedData).toBe(true)
    })

    it('includes whitelisted flag', () => {
      const whitelistedResult: AnalysisResult = {
        ...baseResult,
        wasWhitelisted: true
      }

      const output = formatActionOutput(whitelistedResult)
      expect(output.wasWhitelisted).toBe(true)
    })

    it('formats all metric properties correctly', () => {
      const output = formatActionOutput(baseResult)
      const breakdown = JSON.parse(output.breakdown)

      const firstMetric = breakdown.metrics[0]
      expect(firstMetric).toHaveProperty('name')
      expect(firstMetric).toHaveProperty('rawValue')
      expect(firstMetric).toHaveProperty('threshold')
      expect(firstMetric).toHaveProperty('passed')
      expect(firstMetric).toHaveProperty('details')
    })
  })

  describe('setActionOutputs', () => {
    it('sets all action outputs correctly', () => {
      setActionOutputs(baseResult)

      expect(core.setOutput).toHaveBeenCalledWith('passed', true)
      expect(core.setOutput).toHaveBeenCalledWith('passed-count', 8)
      expect(core.setOutput).toHaveBeenCalledWith('total-metrics', 8)
      expect(core.setOutput).toHaveBeenCalledWith('is-new-account', false)
      expect(core.setOutput).toHaveBeenCalledWith('has-limited-data', false)
      expect(core.setOutput).toHaveBeenCalledWith('was-whitelisted', false)
      expect(core.setOutput).toHaveBeenCalledWith('breakdown', expect.any(String))
      expect(core.setOutput).toHaveBeenCalledWith('recommendations', expect.any(String))
    })

    it('sets outputs for failed result', () => {
      const failedResult: AnalysisResult = {
        ...baseResult,
        passed: false,
        passedCount: 5
      }

      setActionOutputs(failedResult)

      expect(core.setOutput).toHaveBeenCalledWith('passed', false)
      expect(core.setOutput).toHaveBeenCalledWith('passed-count', 5)
    })
  })

  describe('setWhitelistOutputs', () => {
    it('sets whitelist outputs correctly', () => {
      setWhitelistOutputs('trusteduser')

      expect(core.setOutput).toHaveBeenCalledWith('passed', true)
      expect(core.setOutput).toHaveBeenCalledWith('passed-count', 8)
      expect(core.setOutput).toHaveBeenCalledWith('total-metrics', 8)
      expect(core.setOutput).toHaveBeenCalledWith('breakdown', expect.stringContaining('trusteduser'))
      expect(core.setOutput).toHaveBeenCalledWith('recommendations', '[]')
      expect(core.setOutput).toHaveBeenCalledWith('is-new-account', false)
      expect(core.setOutput).toHaveBeenCalledWith('has-limited-data', false)
      expect(core.setOutput).toHaveBeenCalledWith('was-whitelisted', true)
    })

    it('includes username in breakdown', () => {
      setWhitelistOutputs('alice')

      const breakdownCall = (core.setOutput as jest.MockedFunction<typeof core.setOutput>).mock.calls.find(
        (call) => call[0] === 'breakdown'
      )
      expect(breakdownCall).toBeDefined()
      const breakdown = JSON.parse(breakdownCall![1] as string)
      expect(breakdown.username).toBe('alice')
      expect(breakdown.whitelisted).toBe(true)
    })
  })

  describe('logResultSummary', () => {
    it('logs passed result summary', () => {
      logResultSummary(baseResult)

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('CONTRIBUTOR REPORT ANALYSIS'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('@testuser'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('✓ PASSED'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('8/8 metrics'))
    })

    it('logs failed result summary', () => {
      const failedResult: AnalysisResult = {
        ...baseResult,
        passed: false,
        passedCount: 6,
        failedMetrics: ['prMergeRate', 'codeReviews']
      }

      logResultSummary(failedResult)

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('✗ NEEDS REVIEW'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('6/8 metrics'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Failed metrics: prMergeRate, codeReviews'))
    })

    it('logs metric table with correct formatting', () => {
      logResultSummary(baseResult)

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('│ Metric'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('│ Value'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('│ Threshold'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('│ Status'))
    })

    it('logs recommendations when present', () => {
      const resultWithRecs: AnalysisResult = {
        ...baseResult,
        recommendations: ['Improve PR quality', 'Add code reviews']
      }

      logResultSummary(resultWithRecs)

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Recommendations'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Improve PR quality'))
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Add code reviews'))
    })

    it('formats percentage metrics correctly in logs', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('prMergeRate', 0.75, 0.5, true)]
      }

      logResultSummary(result)

      // Should format as "75%" for value and ">= 50%" for threshold
      const infoCalls = (core.info as jest.MockedFunction<typeof core.info>).mock.calls
      const hasCorrectFormat = infoCalls.some((call) => {
        const str = call[0] as string
        return str.includes('75%') && str.includes('>= 50%')
      })
      expect(hasCorrectFormat).toBe(true)
    })

    it('formats account age correctly in logs', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('accountAge', 180, 30, true)]
      }

      logResultSummary(result)

      const infoCalls = (core.info as jest.MockedFunction<typeof core.info>).mock.calls
      const hasCorrectFormat = infoCalls.some((call) => {
        const str = call[0] as string
        return str.includes('180 days') && str.includes('>= 30 days')
      })
      expect(hasCorrectFormat).toBe(true)
    })

    it('formats negative reactions with <= operator in logs', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('negativeReactions', 0, 0, true)]
      }

      logResultSummary(result)

      const infoCalls = (core.info as jest.MockedFunction<typeof core.info>).mock.calls
      const hasCorrectFormat = infoCalls.some((call) => {
        const str = call[0] as string
        return str.includes('<= 0')
      })
      expect(hasCorrectFormat).toBe(true)
    })

    it('formats suspicious patterns threshold as N/A in logs', () => {
      const result: AnalysisResult = {
        ...baseResult,
        metrics: [createMetric('suspiciousPatterns', 0, 0, true)]
      }

      logResultSummary(result)

      const infoCalls = (core.info as jest.MockedFunction<typeof core.info>).mock.calls
      const hasCorrectFormat = infoCalls.some((call) => {
        const str = call[0] as string
        return str.includes('N/A')
      })
      expect(hasCorrectFormat).toBe(true)
    })
  })

  describe('writeJobSummary', () => {
    it('writes passed analysis to summary', async () => {
      await writeJobSummary(baseResult)

      expect(core.summary.addHeading).toHaveBeenCalledWith('✅ Contributor Report', 2)
      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('@testuser'))
      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('Passed'))
      expect(core.summary.addTable).toHaveBeenCalled()
      expect(core.summary.write).toHaveBeenCalled()
    })

    it('writes failed analysis to summary', async () => {
      const failedResult: AnalysisResult = {
        ...baseResult,
        passed: false,
        passedCount: 6,
        recommendations: ['Improve PR quality']
      }

      await writeJobSummary(failedResult)

      expect(core.summary.addHeading).toHaveBeenCalledWith('⚠️ Contributor Report', 2)
      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('Needs Review'))
      expect(core.summary.addList).toHaveBeenCalledWith(['Improve PR quality'])
    })

    it('includes new account note in summary', async () => {
      const newAccountResult: AnalysisResult = {
        ...baseResult,
        isNewAccount: true
      }

      await writeJobSummary(newAccountResult)

      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('new GitHub account'))
    })

    it('includes limited data note in summary', async () => {
      const limitedDataResult: AnalysisResult = {
        ...baseResult,
        hasLimitedData: true,
        isNewAccount: false
      }

      await writeJobSummary(limitedDataResult)

      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('Limited contribution data'))
    })

    it('does not show limited data note for new accounts', async () => {
      const result: AnalysisResult = {
        ...baseResult,
        hasLimitedData: true,
        isNewAccount: true
      }

      await writeJobSummary(result)

      const addRawCalls = (core.summary.addRaw as jest.MockedFunction<typeof core.summary.addRaw>).mock.calls
      const hasLimitedDataNote = addRawCalls.some((call) => (call[0] as string).includes('Limited contribution data'))
      expect(hasLimitedDataNote).toBe(false)
    })

    it('does not show recommendations when all pass', async () => {
      const passedResult: AnalysisResult = {
        ...baseResult,
        passed: true,
        recommendations: []
      }

      await writeJobSummary(passedResult)

      expect(core.summary.addList).not.toHaveBeenCalled()
    })

    it('includes metric table with documentation links', async () => {
      await writeJobSummary(baseResult)

      const tableCall = (core.summary.addTable as jest.MockedFunction<typeof core.summary.addTable>).mock.calls[0]
      const tableData = tableCall[0]

      // Check that metric names include links and descriptions
      const metricRows = tableData.slice(1)
      metricRows.forEach((row) => {
        // First column: metric name with link
        expect(row[0]).toContain('[')
        expect(row[0]).toContain('](https://github.com/jdiegosierra/contributor-report/blob/main/docs/metrics/')
        // Second column: description (non-empty string)
        expect(row[1]).toBeTruthy()
      })
    })
  })

  describe('writeWhitelistSummary', () => {
    it('writes whitelist summary', async () => {
      await writeWhitelistSummary('trusteduser')

      expect(core.summary.addHeading).toHaveBeenCalledWith('Contributor Report Analysis', 2)
      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('@trusteduser'))
      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('trusted contributor'))
      expect(core.summary.write).toHaveBeenCalled()
    })

    it('uses correct username', async () => {
      await writeWhitelistSummary('alice')

      expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('@alice'))
    })
  })
})
