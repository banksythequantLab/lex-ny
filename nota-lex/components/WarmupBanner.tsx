"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WarmupBanner — graceful cold-start UX for the scale-to-zero Aurora cluster.
 *
 * On page load it prefetches /api/warmup, which wakes the database. While the
 * cluster resumes from zero, this shows an honest "warming the corpus" countdown
 * (the DB scales to zero between visits to save compute). It disappears the
 * moment the cluster is live, and never shows at all when the DB is already warm.
 *
 * Fail-safe: it self-dismisses after MAX_MS, can be dismissed manually, and only
 * shows once per session. `?warm=demo` forces the warming animation for a demo.
 */

const EST_MS = 85_000; // cold-resume estimate for the countdown
const POLL_MS = 4_000;
const MAX_MS = 180_000; // never display longer than this

type State = "init" | "warming" | "ready" | "hidden";

export function WarmupBanner() {
  const [state, setState] = useState<State>("init");
  const [elapsed, setElapsed] = useState(0);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const demo = new URLSearchParams(window.location.search).get("warm") === "demo";
    if (!demo && sessionStorage.getItem("lexny_warm") === "1") {
      setState("hidden");
      return;
    }

    let cancelled = false;
    let pollT: ReturnType<typeof setTimeout>;
    start.current = Date.now();
    const tick = setInterval(() => {
      if (!cancelled) setElapsed(Date.now() - start.current);
    }, 250);

    const markReady = (ms: number) => {
      if (cancelled) return;
      sessionStorage.setItem("lexny_warm", "1");
      // Already warm (instant) → don't bother showing anything.
      if (ms < 1800 && !demo) {
        setState("hidden");
        return;
      }
      setReadyMs(ms);
      setState("ready");
      setTimeout(() => {
        if (!cancelled) setState("hidden");
      }, 2800);
    };

    if (demo) {
      setState("warming");
      setTimeout(() => markReady(EST_MS - 4000), 9000);
      return () => {
        cancelled = true;
        clearInterval(tick);
      };
    }

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - start.current > MAX_MS) {
        setState("hidden");
        return;
      }
      try {
        const r = await fetch("/api/warmup", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;
        if (d.ready) {
          markReady(Date.now() - start.current);
          return;
        }
      } catch {
        /* transient edge/network hiccup — keep trying */
      }
      if (cancelled) return;
      setState((s) => (s === "init" ? "warming" : s));
      pollT = setTimeout(poll, POLL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearTimeout(pollT);
    };
  }, []);

  if (state === "hidden" || state === "init") return null;

  const remaining = Math.max(0, EST_MS - elapsed);
  const pct = state === "ready" ? 100 : Math.min(96, (elapsed / EST_MS) * 100);

  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
      <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex items-center gap-3 text-sm text-[var(--color-ink)]">
        {state === "ready" ? (
          <>
            <span className="inline-flex w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="font-medium">
              Corpus live{readyMs ? ` — ready in ${Math.round(readyMs / 1000)}s` : ""}.
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex w-2 h-2 rounded-full bg-[var(--color-seal)] animate-pulse shrink-0" />
            <span className="font-medium">Warming the live corpus&hellip;</span>
            <span className="text-[var(--color-ink-2)] hidden md:inline">
              the AWS Aurora database scales to zero between visits to save compute &mdash; your first query wakes it.
            </span>
            <span className="ml-auto font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-ink-2)]">
              {remaining > 0 ? `~${Math.ceil(remaining / 1000)}s` : "almost there…"}
            </span>
            <button
              onClick={() => {
                sessionStorage.setItem("lexny_warm", "1");
                setState("hidden");
              }}
              aria-label="Dismiss"
              className="shrink-0 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] px-1 text-base leading-none"
            >
              &times;
            </button>
          </>
        )}
      </div>
      <div className="h-0.5 bg-[var(--color-line)]">
        <div
          className="h-full bg-[var(--color-seal)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
