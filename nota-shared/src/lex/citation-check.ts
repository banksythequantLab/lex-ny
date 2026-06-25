/**
 * Brief citation-checker — the "can't fabricate a citation" feature.
 *
 * Extracts case + statute citations from brief text and verifies each against
 * the NY corpus: statutes by law-alias + section, cases by trigram match on
 * case_name. Anything not found is flagged (the hallucinated-cite catch);
 * verified cases carry a citation-strength signal from opinion_inbound_counts.
 * Pure Postgres (Aurora-ready).
 */
import pg from "pg";
import { pgPassword } from "../aws-rds-auth.js";

let pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (pool) return pool;
  const host = process.env.PGHOST || "localhost";
  const needsSSL = /\.amazonaws\.|\.supabase\.|\.googleapis\.|\.azure\./.test(host);
  pool = new pg.Pool({
    host, port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: pgPassword(host, Number(process.env.PGPORT || 5432), process.env.PGUSER || "postgres"),
    database: process.env.PGDATABASE || "lex",
    ssl: needsSSL ? { rejectUnauthorized: false } : false, max: 4,
  });
  return pool;
}

// NY law name/abbrev -> CourtListener law_id (matches the statutes table).
const LAW_ALIASES: Record<string, string> = {
  "civil practice law and rules": "CVP", "cplr": "CVP",
  "penal law": "PEN",
  "general business law": "GBS", "gbl": "GBS",
  "real property actions and proceedings law": "RPA", "rpapl": "RPA",
  "real property law": "RPP", "rpl": "RPP",
  "estates powers and trusts law": "EPT", "eptl": "EPT",
  "domestic relations law": "DOM", "drl": "DOM",
  "family court act": "FCT", "fca": "FCT",
  "business corporation law": "BSC", "bcl": "BSC",
  "vehicle and traffic law": "VAT", "vtl": "VAT",
  "general obligations law": "GOB", "gol": "GOB",
  "criminal procedure law": "CPL", "labor law": "LAB",
  "insurance law": "ISC", "executive law": "EXC",
  "public health law": "PBH", "phl": "PBH",
};

export interface CiteCheck {
  raw: string;
  kind: "statute" | "case";
  status: "verified" | "weak_match" | "not_found";
  matched?: string;            // resolved source name
  detail?: string;             // statute title, or court + date
  url?: string;
  inbound?: number;            // citation-strength signal (cases)
  similarity?: number;         // trigram score (cases)
  cl_id?: string;              // CourtListener cluster id -> /case/[cl_id]
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function uniq<T>(arr: T[], key: (t: T) => string) {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}

// "<law alias> [§] <section>" — longest aliases first so "cplr" beats "cpl"-like prefixes.
const ALIAS_ALT = Object.keys(LAW_ALIASES).sort((a, b) => b.length - a.length).map(escapeRe).join("|");
const STATUTE_RE = new RegExp("\\b(" + ALIAS_ALT + ")\\s*\\u00a7?\\s*([0-9][0-9A-Za-z.\\-]*)", "gi");
// Case parties = a Title-case word + up to 6 more connector/Title-case words
// (of/and/the/&), so matching stops at sentence continuations ("... is the
// controlling ...") and tolerates line wraps (after whitespace normalization).
const NAME = "[A-Z][A-Za-z'.&\\-]*(?:\\s+(?:of|and|the|&|[A-Z][A-Za-z0-9'.&\\-]*)){0,6}";
const CASE_RE = new RegExp("\\b(" + NAME + ")\\s+v\\.?\\s+(" + NAME + ")", "g");

interface RawStatute { raw: string; lawId: string; loc: string; }
interface RawCase { raw: string; name: string; }

function extractStatutes(text: string): RawStatute[] {
  const out: RawStatute[] = [];
  for (const m of text.matchAll(STATUTE_RE)) {
    const lawId = LAW_ALIASES[m[1].toLowerCase().replace(/\s+/g, " ").trim()];
    if (lawId) out.push({ raw: `${m[1]} ${m[2]}`.replace(/\s+/g, " "), lawId, loc: m[2] });
  }
  return uniq(out, (s) => s.lawId + " " + s.loc);
}

function extractCases(text: string): RawCase[] {
  const out: RawCase[] = [];
  for (const m of text.matchAll(CASE_RE)) {
    const p1 = m[1].trim().replace(/^(see also|see|cf|e\.g|accord|in|but see)\.?\s+/i, "").trim();
    const p2 = m[2].trim();
    if (p1.length < 3 || p2.length < 3) continue;
    const name = `${p1} v. ${p2}`.replace(/\s+/g, " ");
    out.push({ raw: name, name });
  }
  return uniq(out, (c) => c.name.toLowerCase());
}

export interface BriefCheckResult {
  checks: CiteCheck[];
  summary: { total: number; verified: number; weak_match: number; not_found: number };
}

/** Extract every case + statute citation from `text` and verify each against the corpus. */
export async function checkBrief(text: string): Promise<BriefCheckResult> {
  const p = getPool();
  const checks: CiteCheck[] = [];
  const norm = text.replace(/\s+/g, " ");  // collapse line wraps before extraction

  for (const s of extractStatutes(norm)) {
    const r = await p.query<{ law_name: string; title: string }>(
      `SELECT law_name, title FROM statutes WHERE law_id=$1 AND location_id=$2 AND doc_type='SECTION' LIMIT 1`,
      [s.lawId, s.loc]
    );
    if (r.rows.length) {
      checks.push({
        raw: s.raw, kind: "statute", status: "verified",
        matched: `${r.rows[0].law_name} ${s.loc}`, detail: r.rows[0].title || undefined,
        url: `https://www.nysenate.gov/legislation/laws/${s.lawId}/${s.loc}`,
      });
    } else {
      checks.push({ raw: s.raw, kind: "statute", status: "not_found" });
    }
  }

  for (const c of extractCases(norm)) {
    const r = await p.query<{ source_id: string; case_name: string; court_id: string; dt: string; sim: number; inbound: number }>(
      `SELECT o.source_id, o.case_name, o.court_id, o.decision_date::text dt,
              similarity(o.case_name, $1) sim, COALESCE(ic.inbound, 0) inbound
         FROM opinions o
         LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = o.id
        WHERE o.case_name % $1
        ORDER BY similarity(o.case_name, $1) DESC, COALESCE(ic.inbound, 0) DESC LIMIT 1`,
      [c.name]
    );
    const row = r.rows[0];
    const sim = row ? Number(row.sim) : 0;
    if (!row || sim < 0.45) {
      checks.push({
        raw: c.raw, kind: "case", status: "not_found",
        detail: row ? `no corpus match (closest: ${row.case_name}, ${sim.toFixed(2)})` : undefined,
      });
      continue;
    }
    checks.push({
      raw: c.raw, kind: "case",
      status: sim >= 0.6 ? "verified" : "weak_match",
      matched: row.case_name, detail: `${row.court_id} ${row.dt || ""}`.trim(),
      url: row.source_id ? `https://www.courtlistener.com/opinion/${row.source_id}/` : undefined,
      cl_id: row.source_id || undefined,
      inbound: Number(row.inbound), similarity: Number(sim.toFixed(3)),
    });
  }

  return {
    checks,
    summary: {
      total: checks.length,
      verified: checks.filter((c) => c.status === "verified").length,
      weak_match: checks.filter((c) => c.status === "weak_match").length,
      not_found: checks.filter((c) => c.status === "not_found").length,
    },
  };
}
