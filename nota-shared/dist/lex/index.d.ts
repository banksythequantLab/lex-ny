/**
 * Lex.NY public API barrel - retrieval + answer generation.
 */
export { retrieve, type OpinionHit, type StatuteHit, type RetrievalResult, } from "./retrieve.js";
export { answer, answerStream, type LexAnswer, type AnswerCitation, type AnswerOpts, type StreamEvent, } from "./answer.js";
export { mostCitedDecisions, judgeInfluenceRanking, judgeProfile, citedBy, getOpinion, type CitedDecision, type JudgeInfluence, type JudgeProfile, type CitedByResult, type OpinionDetail, } from "./analytics.js";
export { checkBrief, type CiteCheck, type BriefCheckResult, } from "./citation-check.js";
//# sourceMappingURL=index.d.ts.map