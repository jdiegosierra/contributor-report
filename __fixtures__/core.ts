/**
 * Mock for @actions/core
 */
import { jest } from '@jest/globals'

export const debug = jest.fn()
export const info = jest.fn()
export const warning = jest.fn()
export const error = jest.fn()
export const getInput = jest.fn()
export const setOutput = jest.fn()
export const setFailed = jest.fn()

// Mock for core.summary with chainable methods
const createSummaryMock = () => {
  const summaryMock = {
    addHeading: jest.fn().mockReturnThis(),
    addRaw: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    addList: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined),
    emptyBuffer: jest.fn().mockReturnThis()
  }
  return summaryMock
}

export const summary = createSummaryMock()
