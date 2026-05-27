/**
 * Speechmatics voice integration. See speechmatics-client.ts.
 */
export {
  isSpeechmaticsConfigured,
  getSpeechmaticsConfig,
  issueTemporaryRTKey,
  getSpeechmaticsStats,
  speechmaticsHealthCheck,
  type SpeechmaticsConfig,
  type SpeechmaticsStats,
} from "./speechmatics-client.js";
