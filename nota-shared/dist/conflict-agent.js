/**
 * Conflict Search Agent — Bright Data hackathon centerpiece.
 *
 * Given a proposed trademark + class(es), this agent queries five gov/web
 * sources in parallel via Bright Data, then asks the LLM to reason about
 * likelihood-of-confusion using the DuPont factors framework.
 *
 * Sources searched:
 *   1. USPTO TESS (federal trademarks — registered + pending)
 *   2. USCO public catalog (any prior copyright on similar visual marks)
 *   3. NY DOS business name search
 *   4. DE Division of Corporations business name search
 *   5. WY Secretary of State business name search
 *   6. Google SERP (common-law trademark usage in commerce)
 *
 * Returns a ConflictReport with risk-scored matches and plain-English reasoning.
 *
 * Bright Data product usage: Web Unlocker (for 1-5) + SERP API (for 6).
 * Both are sponsor-required for the hackathon submission.
 */
import { chatJSON } from "./llm.js";
import { getWebDataClient } from "./bright-data.js";
/* ------------------------------------------------------------------ */
/*  Individual source search functions                                  */
/*  Each returns a list of normalized matches with similarity scores.   */
/* ------------------------------------------------------------------ */
/**
 * Search USPTO TESS (Trademark Electronic Search System) for the mark.
 * Uses the public TESS basic word mark search via Bright Data Web Unlocker.
 *
 * Note: USPTO is moving from TESS to the new Trademark Search system at
 * tmsearch.uspto.gov. We hit the new system since the old one is being
 * retired.
 */
async function searchUSPTO(client, mark) {
    // The new Trademark Search system uses a query parameter URL
    const searchUrl = `https://tmsearch.uspto.gov/search/search-information?searchType=basicSearch&searchTerm=${encodeURIComponent(mark)}`;
    try {
        const html = await client.fetchUrl(searchUrl);
        // We hand the HTML to the LLM and ask it to extract structured matches.
        // This is more reliable than us hand-writing a parser that breaks every
        // time USPTO redesigns their UI.
        const extracted = await chatJSON({
            system: "You extract structured trademark data from USPTO search results HTML. Return only the top 5 matches with details you can verify in the HTML. Do not invent data.",
            user: `Extract trademark matches from this HTML. Mark searched: "${mark}".\n\nHTML (truncated to first 30K chars):\n${html.slice(0, 30000)}`,
            schema_description: '{ "matches": [{ "serial_number": "string?", "registration_number": "string?", "mark_text": "string", "status": "string?", "filing_date": "string?", "classes": [number], "url": "string?" }] }',
            temperature: 0,
        });
        return (extracted.matches || []).map((m) => ({
            source: "uspto_tess",
            match_text: m.mark_text,
            match_url: m.url || `https://tmsearch.uspto.gov/search/search-information?searchType=basicSearch&searchTerm=${encodeURIComponent(m.mark_text)}`,
            registration_number: m.registration_number || m.serial_number || null,
            filing_date: m.filing_date || null,
            status: m.status || null,
            classes: m.classes || [],
        }));
    }
    catch (e) {
        console.error("USPTO search failed:", e);
        return [];
    }
}
/**
 * Search the US Copyright Office public catalog. The catalog is at
 * publicrecords.copyright.gov — a JSON API behind a fairly stable URL pattern.
 */
async function searchUSCO(client, mark) {
    // USCO Public Records System — using the title field search
    const searchUrl = `https://publicrecords.copyright.gov/search-results?searchByCode=TI&queryType=SEARCH_REQUESTS&filter=TITL&searchType=advanced&q=${encodeURIComponent(mark)}`;
    try {
        const html = await client.fetchUrl(searchUrl);
        const extracted = await chatJSON({
            system: "Extract copyright records from USCO public catalog HTML. Return only the top 5 matches you can verify. Do not invent data.",
            user: `Extract copyright records matching "${mark}".\n\nHTML (truncated):\n${html.slice(0, 30000)}`,
            schema_description: '{ "matches": [{ "title": "string", "registration_number": "string?", "registration_date": "string?", "type": "string?", "url": "string?" }] }',
            temperature: 0,
        });
        return (extracted.matches || []).map((m) => ({
            source: "usco_catalog",
            match_text: m.title,
            match_url: m.url || `https://publicrecords.copyright.gov/search-results?searchByCode=TI&q=${encodeURIComponent(m.title)}`,
            registration_number: m.registration_number || null,
            filing_date: m.registration_date || null,
        }));
    }
    catch (e) {
        console.error("USCO search failed:", e);
        return [];
    }
}
/**
 * Search NY Department of State business name records.
 * The DOS uses a session-based search; we use the entity-search endpoint.
 */
async function searchNYBusiness(client, mark) {
    const searchUrl = `https://apps.dos.ny.gov/publicInquiry/EntitySearch?searchValue=${encodeURIComponent(mark)}&searchType=Contains`;
    try {
        const html = await client.fetchUrl(searchUrl);
        const extracted = await chatJSON({
            system: "Extract NY business entity records from search results HTML. Return only the top 5.",
            user: `Extract NY entities matching "${mark}".\n\nHTML (truncated):\n${html.slice(0, 25000)}`,
            schema_description: '{ "matches": [{ "entity_name": "string", "dos_id": "string?", "entity_type": "string?", "status": "string?", "formation_date": "string?" }] }',
            temperature: 0,
        });
        return (extracted.matches || []).map((m) => ({
            source: "ny_dos",
            match_text: m.entity_name,
            match_url: searchUrl,
            registration_number: m.dos_id || null,
            filing_date: m.formation_date || null,
            status: m.status || null,
        }));
    }
    catch (e) {
        console.error("NY DOS search failed:", e);
        return [];
    }
}
async function searchDEBusiness(client, mark) {
    const searchUrl = `https://icis.corp.delaware.gov/ecorp/entitysearch/NameSearch.aspx?entityName=${encodeURIComponent(mark)}`;
    try {
        const html = await client.fetchUrl(searchUrl);
        const extracted = await chatJSON({
            system: "Extract DE business entity records. Return only the top 5.",
            user: `Extract DE entities matching "${mark}".\n\nHTML:\n${html.slice(0, 25000)}`,
            schema_description: '{ "matches": [{ "entity_name": "string", "file_number": "string?", "entity_type": "string?", "status": "string?" }] }',
            temperature: 0,
        });
        return (extracted.matches || []).map((m) => ({
            source: "de_sos",
            match_text: m.entity_name,
            match_url: searchUrl,
            registration_number: m.file_number || null,
            status: m.status || null,
        }));
    }
    catch (e) {
        console.error("DE SOS search failed:", e);
        return [];
    }
}
async function searchWYBusiness(client, mark) {
    const searchUrl = `https://wyobiz.wyo.gov/Business/FilingSearch.aspx?name=${encodeURIComponent(mark)}`;
    try {
        const html = await client.fetchUrl(searchUrl);
        const extracted = await chatJSON({
            system: "Extract WY business entity records. Return only the top 5.",
            user: `Extract WY entities matching "${mark}".\n\nHTML:\n${html.slice(0, 25000)}`,
            schema_description: '{ "matches": [{ "entity_name": "string", "filing_id": "string?", "status": "string?", "filing_date": "string?" }] }',
            temperature: 0,
        });
        return (extracted.matches || []).map((m) => ({
            source: "wy_sos",
            match_text: m.entity_name,
            match_url: searchUrl,
            registration_number: m.filing_id || null,
            filing_date: m.filing_date || null,
            status: m.status || null,
        }));
    }
    catch (e) {
        console.error("WY SOS search failed:", e);
        return [];
    }
}
/**
 * Search Google for common-law usage of the mark in commerce.
 * Common-law trademark rights attach to anyone using a mark in commerce
 * even without federal registration, so this catches real-world conflicts
 * that aren't yet on the USPTO record.
 */
async function searchCommonLaw(client, mark, classDescriptions) {
    const query = `"${mark}" ${classDescriptions.join(" ")} site:*.com OR site:*.io OR site:*.co`;
    try {
        const results = await client.searchSerp(query, { engine: "google", limit: 10 });
        return results.slice(0, 5).map((r) => ({
            source: "google_serp",
            match_text: r.title,
            match_url: r.link,
            similarity_reasoning: r.snippet,
        }));
    }
    catch (e) {
        console.error("Common-law SERP search failed:", e);
        return [];
    }
}
/**
 * Main entry point. Run all source searches in parallel, then ask the LLM
 * to score each match and produce a unified report.
 */
export async function runConflictSearch(opts) {
    const startedAt = Date.now();
    const classDescriptions = opts.class_descriptions || [];
    const client = getWebDataClient();
    // Run all six searches in parallel. Each is independently fault-tolerant
    // (returns [] on failure rather than throwing) so one bad source doesn't
    // kill the whole report.
    const [usptoMatches, uscoMatches, nyMatches, deMatches, wyMatches, commonLawMatches] = await Promise.all([
        searchUSPTO(client, opts.mark),
        searchUSCO(client, opts.mark),
        searchNYBusiness(client, opts.mark),
        searchDEBusiness(client, opts.mark),
        searchWYBusiness(client, opts.mark),
        searchCommonLaw(client, opts.mark, classDescriptions),
    ]);
    const allMatches = [
        ...usptoMatches,
        ...uscoMatches,
        ...nyMatches,
        ...deMatches,
        ...wyMatches,
        ...commonLawMatches,
    ];
    // Have the LLM score each match for similarity + reason about overall risk
    // using DuPont factors. We feed it the raw matches and ask for structured
    // analysis.
    const analysis = await chatJSON({
        system: `You are a trademark conflict search agent supervised by a NY-licensed attorney.
Given a proposed mark and search results across federal, state, and common-law sources,
you produce a risk assessment using the DuPont factors framework (In re E.I. DuPont DeNemours
& Co., 476 F.2d 1357 (CCPA 1973)).

The four key DuPont factors to evaluate:
  1. Similarity of marks (appearance, sound, connotation, commercial impression)
  2. Similarity of goods/services
  3. Channels of trade (where the marks are encountered by consumers)
  4. Strength of the prior mark (famous marks get broader protection)

Risk levels:
  - clear: no meaningful matches; safe to file
  - low: distant matches in unrelated classes; low refusal risk
  - moderate: similar marks in adjacent classes or common-law usage; some refusal risk
  - high: confusingly similar marks in same/related classes; substantial refusal risk
  - blocking: identical or near-identical marks in same class; refusal almost certain

Be conservative. False negatives (missing a real conflict) are worse than false positives.
Cite specific matches by index when reasoning.`,
        user: `Proposed mark: "${opts.mark}"
Filing kind: ${opts.filing_kind}
Classes (USPTO): ${opts.classes.join(", ")}
Class descriptions: ${classDescriptions.join("; ")}

Search results (indexed):
${allMatches.map((m, i) => `[${i}] source=${m.source} text="${m.match_text}" url=${m.match_url || "n/a"} status=${m.status || "?"}`).join("\n")}

Analyze and return:
1. Overall risk level + summary
2. DuPont factor analysis (one paragraph each)
3. For each match, a similarity score (0.0-1.0) and one-sentence reasoning`,
        schema_description: `{
  "overall_risk": "clear" | "low" | "moderate" | "high" | "blocking",
  "risk_summary": "string (2-3 sentences)",
  "dupont_analysis": {
    "similarity_of_marks": "string",
    "similarity_of_goods": "string",
    "channels_of_trade": "string",
    "strength_of_prior_mark": "string"
  },
  "scored_matches": [{ "index": number, "similarity_score": number, "similarity_reasoning": "string" }]
}`,
        temperature: 0.2,
        max_tokens: 4096,
    });
    // Merge LLM scores back into the matches
    const scoredMatches = analysis.scored_matches
        .filter((s) => allMatches[s.index] !== undefined)
        .map((s) => {
        const base = allMatches[s.index];
        return {
            source: base.source,
            match_text: base.match_text,
            match_url: base.match_url || null,
            registration_number: base.registration_number,
            filing_date: base.filing_date,
            status: base.status,
            classes: base.classes || [],
            similarity_score: s.similarity_score,
            similarity_reasoning: s.similarity_reasoning,
        };
    })
        // Sort by score descending so most-relevant matches are at the top
        .sort((a, b) => b.similarity_score - a.similarity_score);
    const report = {
        query: {
            mark: opts.mark,
            classes: opts.classes,
            filing_kind: opts.filing_kind,
        },
        overall_risk: analysis.overall_risk,
        risk_summary: analysis.risk_summary,
        dupont_analysis: analysis.dupont_analysis,
        matches: scoredMatches,
        sources_searched: ["uspto_tess", "usco_catalog", "ny_dos", "de_sos", "wy_sos", "google_serp"],
        web_data_provider: client.provider,
        search_duration_ms: Date.now() - startedAt,
        generated_at: new Date().toISOString(),
        disclaimer: `This conflict search is generated by an AI agent supervised by a New York-licensed attorney. Web data powered by ${client.provider === "nimble" ? "Nimble" : "Bright Data"}. It is for informational purposes only, does not constitute legal advice, and does not create an attorney-client relationship. For a binding legal opinion on registrability, engage Nota.Lawyer's Counsel tier ($50) for a 15-minute attorney consultation, or another qualified trademark attorney.`,
    };
    return report;
}
//# sourceMappingURL=conflict-agent.js.map