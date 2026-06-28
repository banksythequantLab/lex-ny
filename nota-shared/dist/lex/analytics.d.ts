export interface CitedDecision {
    opinion_id: string;
    cl_id: string | null;
    case_name: string;
    court_id: string;
    decision_date: string | null;
    inbound: number;
}
export interface JudgeInfluence {
    judge_id: string;
    name: string;
    authored: number;
    total_citations: number;
}
export interface JudgeProfile {
    judge_id: string;
    name: string;
    cl_person_id: number | null;
    authored: number;
    courts: string[];
    first_decision: string | null;
    last_decision: string | null;
    top_decisions: CitedDecision[];
}
export interface CitedByResult {
    seed: CitedDecision | null;
    citers: CitedDecision[];
    total_citers: number;
}
/** Most-cited decisions overall, or within one court (e.g. 'ny' = Court of Appeals). */
export declare function mostCitedDecisions(opts?: {
    limit?: number;
    courtId?: string;
}): Promise<CitedDecision[]>;
/** Judges ranked by total inbound citations across the opinions they authored. */
export declare function judgeInfluenceRanking(opts?: {
    limit?: number;
    minOpinions?: number;
}): Promise<JudgeInfluence[]>;
/** Search judges by name (matches any authoring judge in the corpus), ranked by
 *  citation influence. Powers the /judges search box — reaches the full judges
 *  table, not just the top-ranked leaderboard. */
export declare function searchJudges(q: string, opts?: {
    limit?: number;
}): Promise<JudgeInfluence[]>;
/** Full profile for one judge: volume, span, courts, and their most-cited decisions. */
export declare function judgeProfile(judgeId: string, opts?: {
    topN?: number;
}): Promise<JudgeProfile | null>;
/** "What cases cite this one?" — SQL replacement for the Neo4j cited-by route.
 *  Keyed by CourtListener cluster id (opinions.source_id); citers ranked by
 *  their own inbound count (most-authoritative citers first). */
export declare function citedBy(clId: string, opts?: {
    limit?: number;
}): Promise<CitedByResult>;
export interface OpinionDetail {
    opinion_id: string;
    cl_id: string | null;
    case_name: string;
    court_id: string;
    decision_date: string | null;
    citation: string | null;
    ai_summary: string | null;
    text: string | null;
    inbound: number;
}
/** Full opinion (by CourtListener cluster id) for the source viewer: metadata,
 *  body text (capped), and inbound citation count. */
export declare function getOpinion(clId: string): Promise<OpinionDetail | null>;
//# sourceMappingURL=analytics.d.ts.map