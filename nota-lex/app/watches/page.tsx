"use client";

/**
 * /watches — Triggerware-powered legislative watches.
 *
 * A "watch" is a Triggerware trigger: a named SQL query that polls on a
 * schedule and tracks deltas. Practical use for a NY attorney: keep an
 * eye on every federal bill mentioning "consumer protection", "data
 * privacy", "hemp regulation" — anything that might land on a client's
 * desk before opposing counsel notices.
 *
 * What this page shows:
 *  1. Every active watch (live from Triggerware /triggers)
 *  2. The actual SQL the natural-language description was compiled to
 *  3. A one-click "Poll now" that hits /api/lex/watch/poll and shows the
 *     deltas (added/deleted rows since the last poll) in real time
 *
 * Storyboard reasoning: Westlaw and Lexis have "alerts" that cost
 * subscription dollars. This is the same workflow as a free, Triggerware-
 * powered HTTP endpoint with SQL-level transparency. That's the
 * sponsor-fit hook.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface Trigger {
  name: string;
  query: string;
  schedule: number;
  status: string;
  delivery?: string | null;
  created_at?: string;
}

interface PollResult {
  added_count: number;
  deleted_count: number;
  added: unknown[][];
  deleted: unknown[][];
}

function formatSchedule(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    return days === 1 ? "daily" : `every ${days} days`;
  }
  if (seconds >= 3600) {
    const h = Math.round(seconds / 3600);
    return h === 1 ? "hourly" : `every ${h} hours`;
  }
  if (seconds >= 60) {
    const m = Math.round(seconds / 60);
    return `every ${m} min`;
  }
  return `every ${seconds}s`;
}

function highlightSql(sql: string): string {
  // Light client-side SQL prettifier — collapse whitespace and add line breaks
  return sql
    .replace(/\s+/g, " ")
    .replace(/\b(SELECT|FROM|WHERE|UNION|AND|OR|GROUP BY|ORDER BY|LIMIT)\b/g, "\n$1")
    .trim();
}

export default function WatchesPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollResults, setPollResults] = useState<Record<string, PollResult | "loading" | string>>({});

  useEffect(() => {
    fetch("/api/lex/watch")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        setTriggers(d.triggers || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function pollWatch(name: string) {
    setPollResults((s) => ({ ...s, [name]: "loading" }));
    try {
      const r = await fetch(`/api/lex/watch/poll?name=${encodeURIComponent(name)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Poll failed");
      setPollResults((s) => ({ ...s, [name]: d as PollResult }));
    } catch (e) {
      setPollResults((s) => ({ ...s, [name]: e instanceof Error ? e.message : String(e) }));
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Legislative watches · Lex.NY
          </span>
          <span>Powered by Triggerware · live SQL deltas</span>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span> Lex.NY
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
            <li><Link href="/watches" className="text-[var(--color-ink)] font-medium">Watches</Link></li>
          </ul>
        </div>
      </nav>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY · Watches
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3 leading-tight">
          The next NY law change, before it lands.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-10">
          Westlaw and Lexis charge subscription dollars for legislative alerts.
          Lex.NY uses Triggerware to track federal bills, NY decisions, and
          regulatory changes as deltas — only the new rows since the last
          poll. Free, transparent, SQL-level visible.
        </p>

        {/* Status banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard
            label="Active watches"
            value={loading ? "…" : triggers.length.toString()}
            accent
          />
          <StatCard
            label="Polling cadence"
            value={triggers.length > 0
              ? formatSchedule(triggers[0].schedule)
              : "—"}
          />
          <StatCard
            label="Provider"
            value="Triggerware"
            footnote="SQL Over Everything"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-900 rounded-sm text-sm font-[family-name:var(--font-mono)]">
            Error loading watches: {error}
          </div>
        )}

        {loading && (
          <div className="text-sm text-[var(--color-ink-2)]">Loading active watches…</div>
        )}

        {!loading && triggers.length === 0 && !error && (
          <div className="p-6 border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)]">
            <p className="text-sm">
              No active watches. Create one via <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">POST /api/lex/watch</code> with a JSON body{" "}
              <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">
                {`{ name, description, scheduleSeconds }`}
              </code>.
            </p>
          </div>
        )}

        {/* Watch list */}
        <div className="space-y-5">
          {triggers.map((t) => {
            const poll = pollResults[t.name];
            return (
              <div
                key={t.name}
                className="border border-[var(--color-rule)]/30 rounded-sm p-5 bg-[var(--color-paper-2)]"
              >
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={
                        "px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] tracking-wider uppercase rounded-full " +
                        (t.status === "enabled"
                          ? "bg-[var(--color-seal)]/15 text-[var(--color-seal-deep)]"
                          : "bg-[var(--color-rule)]/15 text-[var(--color-ink-2)]")
                      }
                    >
                      {t.status}
                    </span>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">
                      {t.name.replace(/_/g, " ")}
                    </h2>
                  </div>
                  <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] whitespace-nowrap">
                    {formatSchedule(t.schedule)}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-1.5">
                    Compiled SQL
                  </div>
                  <pre className="font-[family-name:var(--font-mono)] text-[11.5px] leading-relaxed bg-[var(--color-paper)] border border-[var(--color-rule)]/20 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                    {highlightSql(t.query)}
                  </pre>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => pollWatch(t.name)}
                    disabled={poll === "loading"}
                    className="px-3 py-1.5 text-xs font-[family-name:var(--font-mono)] tracking-wider uppercase border border-[var(--color-seal-deep)] text-[var(--color-seal-deep)] rounded hover:bg-[var(--color-seal-deep)] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {poll === "loading" ? "Polling…" : "Poll now"}
                  </button>
                  {t.created_at && (
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-2)]">
                      created {new Date(t.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                  )}
                </div>

                {/* Poll results */}
                {poll && poll !== "loading" && (
                  typeof poll === "string" ? (
                    <div className="mt-4 p-3 border border-red-300 bg-red-50 text-red-900 rounded text-xs font-[family-name:var(--font-mono)]">
                      Poll error: {poll}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 border border-[var(--color-rule)]/30 bg-[var(--color-paper)] rounded">
                      <div className="flex gap-4 text-xs font-[family-name:var(--font-mono)] tracking-wider uppercase mb-2">
                        <span className="text-[var(--color-seal-deep)]">
                          {poll.added_count} new
                        </span>
                        <span className="text-[var(--color-ink-2)]">
                          {poll.deleted_count} removed
                        </span>
                      </div>
                      {poll.added_count === 0 && poll.deleted_count === 0 ? (
                        <p className="text-sm text-[var(--color-ink-2)]">
                          No deltas since the last poll. The watch will accumulate new rows as legislative
                          activity occurs; check back tomorrow.
                        </p>
                      ) : (
                        <>
                          {poll.added.length > 0 && (
                            <div className="mb-3">
                              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-1">
                                Newly matched rows
                              </div>
                              <pre className="font-[family-name:var(--font-mono)] text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(poll.added.slice(0, 5), null, 2)}
                              </pre>
                              {poll.added.length > 5 && (
                                <p className="text-[10px] text-[var(--color-ink-2)] mt-1">
                                  … and {poll.added.length - 5} more
                                </p>
                              )}
                            </div>
                          )}
                          {poll.deleted.length > 0 && (
                            <div>
                              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-1">
                                Removed rows
                              </div>
                              <pre className="font-[family-name:var(--font-mono)] text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(poll.deleted.slice(0, 5), null, 2)}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-14 mb-4">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-[var(--color-ink-2)] leading-relaxed">
          <div className="border border-[var(--color-rule)]/30 rounded-sm p-5">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              1 · Create
            </div>
            <p>
              POST a watch with a plain-English description (e.g. &ldquo;new federal bills
              mentioning consumer protection&rdquo;). Triggerware&rsquo;s planner compiles
              that to SQL against installed connectors.
            </p>
          </div>
          <div className="border border-[var(--color-rule)]/30 rounded-sm p-5">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              2 · Schedule
            </div>
            <p>
              The watch polls on a fixed cadence (daily by default). Each
              poll only returns deltas — rows added or removed since the
              last call. No re-processing of stale matches.
            </p>
          </div>
          <div className="border border-[var(--color-rule)]/30 rounded-sm p-5">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              3 · Act
            </div>
            <p>
              Hit &ldquo;Poll now&rdquo; or wire the JSON deltas into your inbox, Slack,
              or any HTTP endpoint. The watch is the alert; what you do with
              it is up to you.
            </p>
          </div>
        </div>

        <p className="mt-10 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
          Triggerware base · api.triggerware.com · HackerNoon Proof of Usefulness partner
        </p>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
  footnote,
}: {
  label: string;
  value: string;
  accent?: boolean;
  footnote?: string;
}) {
  return (
    <div
      className={
        "rounded-sm border p-5 " +
        (accent
          ? "border-[var(--color-seal-deep)] bg-[var(--color-seal)]/5"
          : "border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]")
      }
    >
      <div
        className={
          "font-[family-name:var(--font-display)] text-3xl mb-1 tabular-nums " +
          (accent ? "text-[var(--color-seal-deep)]" : "")
        }
      >
        {value}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
      {footnote && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-2)]/70 mt-1.5">
          {footnote}
        </div>
      )}
    </div>
  );
}
