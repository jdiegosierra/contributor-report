/**
 * Analysis result types
 */

import type { MetricCheckResult, MetricName, AllMetricsData } from './metrics.js'

/** Complete analysis result */
export interface AnalysisResult {
  /** Whether all required metrics passed */
  passed: boolean

  /** Number of metrics that passed */
  passedCount: number

  /** Total number of metrics evaluated */
  totalMetrics: number

  /** Individual metric check results */
  metrics: MetricCheckResult[]

  /** Names of metrics that failed their checks */
  failedMetrics: MetricName[]

  /** Username analyzed */
  username: string

  /** When analysis was performed */
  analyzedAt: Date

  /** Start of analysis window */
  dataWindowStart: Date

  /** End of analysis window */
  dataWindowEnd: Date

  /** Actionable recommendations */
  recommendations: string[]

  /** Account is less than threshold days old */
  isNewAccount: boolean

  /** Limited data available for analysis */
  hasLimitedData: boolean

  /** User was whitelisted (trusted user or org member) */
  wasWhitelisted: boolean

  /** Raw metrics data for verbose output */
  metricsData?: AllMetricsData
}

/** Action output format */
export interface ActionOutput {
  /** Pass/fail status */
  passed: boolean

  /** Number of metrics passed */
  passedCount: number

  /** Total metrics evaluated */
  totalMetrics: number

  /** JSON string of metric breakdown */
  breakdown: string

  /** JSON string of recommendations */
  recommendations: string

  /** New account flag */
  isNewAccount: boolean

  /** Limited data flag */
  hasLimitedData: boolean

  /** Whitelist flag */
  wasWhitelisted: boolean
}

/** Constants for analysis */
export const ANALYSIS_CONSTANTS = {
  /** Minimum contributions to have "sufficient data" */
  MIN_CONTRIBUTIONS_FOR_DATA: 5
} as const
