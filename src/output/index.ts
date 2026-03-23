/**
 * Output module exports
 */

export { generateAnalysisComment, generateWhitelistComment, COMMENT_MARKER } from './comment.js'

export {
  formatActionOutput,
  setActionOutputs,
  setWhitelistOutputs,
  logResultSummary,
  writeJobSummary,
  writeWhitelistSummary
} from './formatter.js'

export {
  formatMetricName,
  getMetricDescription,
  formatMetricValue,
  formatThreshold,
  shouldShowVerboseDetails
} from './shared.js'
