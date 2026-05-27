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
  type LexAnswer,
  type AnswerCitation,
  type AnswerOpts,
} from "./answer.js";
