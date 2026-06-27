"use client";

/**
 * /judges — Judge analytics surface (2nd hero pillar).
 *
 * Left: NY judges ranked by total inbound citations across the opinions they
 * authored (/api/judges). Click one to load their profile (/api/judges/[id]).
 * Right: most-cited NY decisions (/api/most-cited). All backed by the Postgres
 * citation graph (opinion_citations + opinion_judges) — no Neo4j.
 *
 * "Receipts": every number traces to real decisions you can open.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const COURT_NAMES: Record<string, string> = {
  ny: "Court of Appeals",
  nyappdiv: "Appellate Division",
  nyappterm: "Appellate Term",
  nysupct: "Supreme Court",
  nysurct: "Surrogate's Court",
  nyclaimsct: "Court of Claims",
  nyfamct: "Family Court",
};

interface JudgeRow { judge_id: string; name: string; authored: number; total_citations: number; }
interface Decision {
  opinion_id: string; cl_id: string | null; case_name: string;
  court_id: string; decision_date: string | null; inbound: number;
}
interface Profile {
  judge_id: string; name: string; cl_person_id: number | null; authored: number;
  courts: string[]; first_decision: string | null; last_decision: string | null;
  top_decisions: Decision[];
}

function court(id: string) { return COURT_NAMES[id] || id; }
function yr(d: string | null) { return d ? d.slice(0, 4) : "—"; }

export default function JudgesPage() {
  const [judges, setJudges] = useState<JudgeRow[] | null>(null);
  const [mostCited, setMostCited] = useState<Decision[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/judges?limit=25", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (!cancelled) setJudges(d.judges || []); })
      .catch(() => { if (!cancelled) setJudges([]); });
    fetch("/api/most-cited?limit=12", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (!cancelled) setMostCited(d.decisions || []); })
      .catch(() => { if (!cancelled) setMostCited([]); });
    return () => { cancelled = true; };
  }, []);

  function selectJudge(id: string) {
    setSelected(id); setProfile(null); setLoadingProfile(true);
    fetch(`/api/judges/${id}?top=8`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => { setProfile(d); setLoadingProfile(false); })
      .catch(() => setLoadingProfile(false));
  }

  const maxCites = judges && judges.length ? judges[0].total_citations : 1;

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Judge Analytics &middot; Lex.NY
          </span>
          <span>Citation influence from the live NY citation graph</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY &middot; Judges
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">Who shaped New York law?</h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-10">
          Judges ranked by how often the opinions they authored are cited by other NY decisions.
          Every figure traces back to real cases in the corpus &mdash; click a judge to see theirs.
        </p>

        <div className="grid md:grid-cols-2 gap-8">

          {/* LEFT: influence leaderboard */}
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Most influential judges</h2>
            <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden">
              {judges === null
                ? Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b border-[var(--color-rule)]/15 last:border-0">
                      <div className="h-3 w-40 bg-[var(--color-rule)]/15 rounded animate-pulse mb-2" />
                      <div className="h-1 bg-[var(--color-rule)]/15 rounded-full" />
                    </div>
                  ))
                : judges.map((j, i) => {
                    const pct = Math.max(3, (j.total_citations / maxCites) * 100);
                    const active = selected === j.judge_id;
                    return (
                      <button
                        key={j.judge_id}
                        onClick={() => selectJudge(j.judge_id)}
                        className={
                          "w-full text-left px-4 py-3 border-b border-[var(--color-rule)]/15 last:border-0 transition-colors " +
                          (active ? "bg-[var(--color-seal)]/8" : "hover:bg-[var(--color-paper-2)]")
                        }
                      >
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="font-[family-name:var(--font-display)] text-[15px]">
                            <span className="text-[var(--color-ink-2)] font-[family-name:var(--font-mono)] text-[16px] mr-2">{i + 1}</span>
                            {j.name}
                          </span>
                          <span className="font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
                            {j.total_citations.toLocaleString()} cites &middot; {j.authored} op.
                          </span>
                        </div>
                        <div className="h-1 bg-[var(--color-rule)]/15 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-seal)] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
            </div>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
              Ranked by total inbound citations to authored opinions. Names from the CourtListener
              dump are surname-level pending full disambiguation.
            </p>
          </div>

          {/* RIGHT: selected judge profile, or most-cited decisions */}
          <div>
            {selected ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl">
                    {profile?.name ?? "Judge"}
                  </h2>
                  <button
                    onClick={() => { setSelected(null); setProfile(null); }}
                    className="font-[family-name:var(--font-mono)] text-[16px] uppercase tracking-wider text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                  >
                    &larr; Most-cited
                  </button>
                </div>
                {loadingProfile || !profile ? (
                  <div className="border border-[var(--color-rule)]/30 rounded-sm p-5 text-[var(--color-ink-2)] text-sm">Loading profile&hellip;</div>
                ) : (
                  <div className="border border-[var(--color-rule)]/30 rounded-sm p-5">
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <Stat label="Opinions" value={profile.authored.toLocaleString()} />
                      <Stat label="Years" value={`${yr(profile.first_decision)}–${yr(profile.last_decision)}`} />
                      <Stat label="Courts" value={(profile.courts || []).map(court).join(", ") || "—"} />
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)] mb-2">Most-cited authored decisions</div>
                    <ol className="list-none m-0 p-0 space-y-2">
                      {profile.top_decisions.map((d) => (
                        <li key={d.opinion_id} className="flex justify-between items-baseline gap-3">
                          <span className="text-sm"><Link href={d.cl_id ? `/case/${d.cl_id}` : "#"} className="hover:text-[var(--color-seal-deep)] hover:underline">{d.case_name}</Link> <span className="text-[var(--color-ink-2)]">({court(d.court_id)} {yr(d.decision_date)})</span></span>
                          <span className="font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-seal-deep)] shrink-0">{d.inbound.toLocaleString()}&times;</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Most-cited NY decisions</h2>
                <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden">
                  {mostCited === null
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="px-4 py-3 border-b border-[var(--color-rule)]/15 last:border-0">
                          <div className="h-3 w-48 bg-[var(--color-rule)]/15 rounded animate-pulse" />
                        </div>
                      ))
                    : mostCited.map((d, i) => (
                        <Link key={d.opinion_id} href={d.cl_id ? `/case/${d.cl_id}` : "#"} className="px-4 py-2.5 border-b border-[var(--color-rule)]/15 last:border-0 flex justify-between items-baseline gap-3 hover:bg-[var(--color-paper-2)]">
                          <span className="text-sm">
                            <span className="text-[var(--color-ink-2)] font-[family-name:var(--font-mono)] text-[16px] mr-2">{i + 1}</span>
                            {d.case_name} <span className="text-[var(--color-ink-2)]">({court(d.court_id)} {yr(d.decision_date)})</span>
                          </span>
                          <span className="font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-seal-deep)] shrink-0">{d.inbound.toLocaleString()}&times;</span>
                        </Link>
                      ))}
                </div>
                <p className="mt-3 font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
                  Inbound citation counts from the live citation graph &middot; the cases every NY litigator cites.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-display)] text-lg leading-tight">{value}</div>
      <div className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-wider uppercase text-[var(--color-ink-2)] mt-0.5">{label}</div>
    </div>
  );
}
