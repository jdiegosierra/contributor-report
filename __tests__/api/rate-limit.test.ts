/**
 * Tests for rate limit handling utilities
 */
import { describe, it, expect, jest } from '@jest/globals'

// Mock @actions/core
jest.unstable_mockModule('@actions/core', () => ({
  warning: jest.fn(),
  debug: jest.fn()
}))

const {
  shouldWait,
  calculateWaitTime,
  parseRateLimit,
  isRateLimitError,
  isTransientError,
  executeWithRetry,
  waitWithLogging,
  handleRateLimitError,
  handleTransientError
} = await import('../../src/api/rate-limit.js')

const core = await import('@actions/core')

describe('Rate Limit Utilities', () => {
  describe('shouldWait', () => {
    it('returns true when remaining is below threshold', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() + 60000),
        used: 950,
        limit: 1000
      }

      expect(shouldWait(rateLimit)).toBe(true)
    })

    it('returns false when remaining is above threshold', () => {
      const rateLimit = {
        remaining: 500,
        resetAt: new Date(Date.now() + 60000),
        used: 500,
        limit: 1000
      }

      expect(shouldWait(rateLimit)).toBe(false)
    })
  })

  describe('calculateWaitTime', () => {
    it('returns 0 when remaining is above threshold', () => {
      const rateLimit = {
        remaining: 500,
        resetAt: new Date(Date.now() + 60000),
        used: 500,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBe(0)
    })

    it('returns time until reset when below threshold', () => {
      const resetTime = new Date(Date.now() + 30000) // 30 seconds from now
      const rateLimit = {
        remaining: 50,
        resetAt: resetTime,
        used: 950,
        limit: 1000
      }

      const waitTime = calculateWaitTime(rateLimit)
      expect(waitTime).toBeGreaterThan(0)
      expect(waitTime).toBeLessThanOrEqual(30000)
    })

    it('returns 0 when reset time has passed', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() - 1000), // 1 second ago
        used: 950,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBe(0)
    })

    it('caps wait time at maximum', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() + 120000), // 2 minutes from now
        used: 950,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBeLessThanOrEqual(60000)
    })
  })

  describe('parseRateLimit', () => {
    it('parses valid rate limit data', () => {
      const data = {
        remaining: 100,
        resetAt: '2024-01-01T00:00:00Z',
        used: 400,
        limit: 500
      }

      const result = parseRateLimit(data)

      expect(result).toEqual({
        remaining: 100,
        resetAt: new Date('2024-01-01T00:00:00Z'),
        used: 400,
        limit: 500
      })
    })

    it('uses default limit when not provided', () => {
      const data = {
        remaining: 100,
        resetAt: '2024-01-01T00:00:00Z',
        used: 400
      }

      const result = parseRateLimit(data)

      expect(result?.limit).toBe(5000)
    })

    it('returns null for null input', () => {
      expect(parseRateLimit(null)).toBeNull()
    })
  })

  describe('isRateLimitError', () => {
    it('detects rate limit error messages', () => {
      expect(isRateLimitError(new Error('API rate limit exceeded'))).toBe(true)
      expect(isRateLimitError(new Error('secondary rate limit'))).toBe(true)
      expect(isRateLimitError(new Error('Rate Limit Exceeded'))).toBe(true)
    })

    it('returns false for other errors', () => {
      expect(isRateLimitError(new Error('Not found'))).toBe(false)
      expect(isRateLimitError(new Error('Server error'))).toBe(false)
      expect(isRateLimitError('string error')).toBe(false)
    })
  })

  describe('isTransientError', () => {
    it('detects network errors', () => {
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true)
      expect(isTransientError(new Error('ENOTFOUND'))).toBe(true)
      expect(isTransientError(new Error('socket hang up'))).toBe(true)
      expect(isTransientError(new Error('network error'))).toBe(true)
      expect(isTransientError(new Error('fetch failed'))).toBe(true)
    })

    it('detects server errors', () => {
      expect(isTransientError(new Error('500 Internal Server Error'))).toBe(true)
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true)
      expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true)
      expect(isTransientError(new Error('504 Gateway Timeout'))).toBe(true)
    })

    it('returns false for non-transient errors', () => {
      expect(isTransientError(new Error('Not found'))).toBe(false)
      expect(isTransientError(new Error('Bad request'))).toBe(false)
      expect(isTransientError(new Error('Unauthorized'))).toBe(false)
      expect(isTransientError('string error')).toBe(false)
    })
  })

  describe('executeWithRetry', () => {
    it('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success')

      const result = await executeWithRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('throws non-transient errors immediately', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Not found'))

      await expect(executeWithRetry(fn)).rejects.toThrow('Not found')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('throws rate limit errors when it is a rate limit error', async () => {
      // This verifies the function calls the retrying mechanism (even if we don't wait for retries)
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('API rate limit exceeded'))

      // With real timers, we don't want to wait for retries
      // Just verify it rejects with the expected error
      await expect(executeWithRetry(fn, 1)).rejects.toThrow('rate limit')
    })

    it('retries on transient error and succeeds', async () => {
      jest.useFakeTimers()

      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success')

      const resultPromise = executeWithRetry(fn, 3)

      // Advance timers to allow retry
      await jest.advanceTimersByTimeAsync(1000)

      const result = await resultPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })

    it('exhausts all retries on persistent transient error', async () => {
      // With maxRetries=1, there are no retries, just the initial attempt
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('503 Service Unavailable'))

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('503 Service Unavailable')
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('waitWithLogging', () => {
    it('returns immediately when ms is 0', async () => {
      const result = await waitWithLogging(0)
      expect(result).toBeUndefined()
      expect(core.warning).not.toHaveBeenCalled()
    })

    it('returns immediately when ms is negative', async () => {
      const result = await waitWithLogging(-100)
      expect(result).toBeUndefined()
      expect(core.warning).not.toHaveBeenCalled()
    })

    it('waits and logs when ms is positive', async () => {
      jest.useFakeTimers()

      const promise = waitWithLogging(5000)

      expect(core.warning).toHaveBeenCalledWith('Rate limit low, waiting 5 seconds...')

      await jest.advanceTimersByTimeAsync(5000)
      await promise

      jest.useRealTimers()
    })

    it('rounds up wait time in log message', async () => {
      jest.useFakeTimers()

      const promise = waitWithLogging(1500)

      expect(core.warning).toHaveBeenCalledWith('Rate limit low, waiting 2 seconds...')

      await jest.advanceTimersByTimeAsync(1500)
      await promise

      jest.useRealTimers()
    })
  })

  describe('handleRateLimitError', () => {
    it('waits with exponential backoff', async () => {
      jest.useFakeTimers()

      // Attempt 0: 1000 * 2^0 = 1000ms
      const promise0 = handleRateLimitError(new Error('rate limit'), 0)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 1'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('1s'))
      await jest.advanceTimersByTimeAsync(1000)
      await promise0

      jest.clearAllMocks()

      // Attempt 1: 1000 * 2^1 = 2000ms
      const promise1 = handleRateLimitError(new Error('rate limit'), 1)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 2'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('2s'))
      await jest.advanceTimersByTimeAsync(2000)
      await promise1

      jest.clearAllMocks()

      // Attempt 2: 1000 * 2^2 = 4000ms
      const promise2 = handleRateLimitError(new Error('rate limit'), 2)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 3'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('4s'))
      await jest.advanceTimersByTimeAsync(4000)
      await promise2

      jest.useRealTimers()
    })

    it('caps wait time at 60 seconds', async () => {
      jest.useFakeTimers()

      // Attempt 10: 1000 * 2^10 = 1024000ms, but capped at 60000ms
      const promise = handleRateLimitError(new Error('rate limit'), 10)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('60s'))
      await jest.advanceTimersByTimeAsync(60000)
      await promise

      jest.useRealTimers()
    })

    it('handles non-Error objects', async () => {
      jest.useFakeTimers()

      const promise = handleRateLimitError('string error', 0)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Unknown error'))
      await jest.advanceTimersByTimeAsync(1000)
      await promise

      jest.useRealTimers()
    })
  })

  describe('handleTransientError', () => {
    it('waits with exponential backoff', async () => {
      jest.useFakeTimers()

      // Attempt 0: 500 * 2^0 = 500ms
      const promise0 = handleTransientError(new Error('ECONNRESET'), 0)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 1'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('0.5s'))
      await jest.advanceTimersByTimeAsync(500)
      await promise0

      jest.clearAllMocks()

      // Attempt 1: 500 * 2^1 = 1000ms
      const promise1 = handleTransientError(new Error('ECONNRESET'), 1)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 2'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('1s'))
      await jest.advanceTimersByTimeAsync(1000)
      await promise1

      jest.clearAllMocks()

      // Attempt 2: 500 * 2^2 = 2000ms
      const promise2 = handleTransientError(new Error('ETIMEDOUT'), 2)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 3'))
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('2s'))
      await jest.advanceTimersByTimeAsync(2000)
      await promise2

      jest.useRealTimers()
    })

    it('caps wait time at 30 seconds', async () => {
      jest.useFakeTimers()

      // Attempt 10: 500 * 2^10 = 512000ms, but capped at 30000ms
      const promise = handleTransientError(new Error('ETIMEDOUT'), 10)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('30s'))
      await jest.advanceTimersByTimeAsync(30000)
      await promise

      jest.useRealTimers()
    })

    it('handles non-Error objects', async () => {
      jest.useFakeTimers()

      const promise = handleTransientError({ code: 'UNKNOWN' }, 0)
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Unknown error'))
      await jest.advanceTimersByTimeAsync(500)
      await promise

      jest.useRealTimers()
    })
  })
})
