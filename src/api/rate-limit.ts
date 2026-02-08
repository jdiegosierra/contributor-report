/**
 * Rate limit handling utilities
 */

import * as core from '@actions/core'

/** Rate limit status from GitHub API */
export interface RateLimitStatus {
  remaining: number
  resetAt: Date
  used: number
  limit: number
}

/** Minimum remaining requests before we start being cautious */
const RATE_LIMIT_THRESHOLD = 100

/** Maximum wait time in milliseconds */
const MAX_WAIT_TIME = 60000

/**
 * Check if we should wait before making another request
 */
export function shouldWait(rateLimit: RateLimitStatus): boolean {
  return rateLimit.remaining < RATE_LIMIT_THRESHOLD
}

/**
 * Calculate how long to wait before next request
 */
export function calculateWaitTime(rateLimit: RateLimitStatus): number {
  if (rateLimit.remaining > RATE_LIMIT_THRESHOLD) {
    return 0
  }

  const now = new Date()
  const resetTime = rateLimit.resetAt
  const msUntilReset = resetTime.getTime() - now.getTime()

  if (msUntilReset <= 0) {
    return 0
  }

  // Wait until reset, but cap at max wait time
  return Math.min(msUntilReset, MAX_WAIT_TIME)
}

/**
 * Wait for the specified time with logging
 */
export async function waitWithLogging(ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }

  core.warning(`Rate limit low, waiting ${Math.ceil(ms / 1000)} seconds...`)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse rate limit from GraphQL response
 */
export function parseRateLimit(
  rateLimitData: {
    remaining: number
    resetAt: string
    used: number
    limit?: number
  } | null
): RateLimitStatus | null {
  if (!rateLimitData) {
    return null
  }

  return {
    remaining: rateLimitData.remaining,
    resetAt: new Date(rateLimitData.resetAt),
    used: rateLimitData.used,
    limit: rateLimitData.limit ?? 5000
  }
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('rate limit') || message.includes('api rate limit') || message.includes('secondary rate limit')
    )
  }
  return false
}

/**
 * Check if an error is transient and should be retried
 * Includes network errors and 5xx server errors
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      message.includes('fetch failed')
    ) {
      return true
    }

    // Server errors (5xx) - use word boundaries to avoid false positives
    if (
      /\b500\b/.test(message) ||
      /\b502\b/.test(message) ||
      /\b503\b/.test(message) ||
      /\b504\b/.test(message) ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return true
    }

    // Check error status code directly if available
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      const status = (error as { status: number }).status
      if (status >= 500 && status < 600) {
        return true
      }
    }
  }

  return false
}

/**
 * Handle rate limit error with exponential backoff
 */
export async function handleRateLimitError(error: unknown, attempt: number): Promise<void> {
  const baseWait = 1000 // 1 second
  const maxWait = 60000 // 1 minute
  const waitTime = Math.min(baseWait * Math.pow(2, attempt), maxWait)

  core.warning(
    `Rate limit error (attempt ${attempt + 1}), waiting ${waitTime / 1000}s: ${error instanceof Error ? error.message : 'Unknown error'}`
  )

  await new Promise((resolve) => setTimeout(resolve, waitTime))
}

/**
 * Handle transient error with exponential backoff
 */
export async function handleTransientError(error: unknown, attempt: number): Promise<void> {
  const baseWait = 500 // 500ms
  const maxWait = 30000 // 30 seconds
  const waitTime = Math.min(baseWait * Math.pow(2, attempt), maxWait)

  core.warning(
    `Transient error (attempt ${attempt + 1}), retrying in ${waitTime / 1000}s: ${error instanceof Error ? error.message : 'Unknown error'}`
  )

  await new Promise((resolve) => setTimeout(resolve, waitTime))
}

/**
 * Execute a function with retry for transient errors
 */
export async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries - 1) {
        throw error
      }

      if (isRateLimitError(error)) {
        await handleRateLimitError(error, attempt)
      } else if (isTransientError(error)) {
        await handleTransientError(error, attempt)
      } else {
        // Non-retryable error
        throw error
      }
    }
  }

  throw lastError
}
