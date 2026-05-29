/**
 * Lex.NY public API barrel - retrieval + answer generation.
 */

export {
  retrieve,
  type OpinionHit,
  type StatuteHit,
  type RetrievalResult,
} from "./retrieve.js";

export {
  answer,
  answerStream,
  type LexAnswer,
  type AnswerCitation,
  type AnswerOpts,
  type StreamEvent,
} from "./answer.js";
