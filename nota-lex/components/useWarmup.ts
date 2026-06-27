"use client";

import { useEffect, useState } from "react";

/**
 * useWarmup — shared corpus-readiness signal.
 *
 * One module-level poller hits /api/warmup (which wakes the scale-to-zero Aurora
 * cluster) and shares the result with every subscriber, so the Ask box on any
 * page can show "warming" vs "ready to ask" without each component polling on
 * its own. Resolves to "ready" on the first successful probe and stays ready for
 * the session; fail-safes to "ready" after MAX so the UI never blocks.
 */

export type WarmupStatus = "checking" | "warming" | "ready";

let status: WarmupStatus = "checking";
let readyMs: number | null = null;
let started = false;
let startedAt = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function ensurePolling() {
  if (started || typeof window === "undefined") return;
  started = true;
  startedAt = Date.now();
  const POLL = 4000;
  const MAX = 120000;

  const poll = async () => {
    const el = Date.now() - startedAt;
    if (el > MAX) {
      status = "ready";
      readyMs = el;
      emit();
      return;
    }
    try {
      const r = await fetch("/api/warmup", { cache: "no-store" });
      const d = await r.json();
      if (d && d.ready) {
        status = "ready";
        readyMs = el;
        emit();
        return;
      }
    } catch {
      /* transient — keep trying */
    }
    if (status === "checking") {
      status = "warming";
      emit();
    }
    setTimeout(poll, POLL);
  };
  poll();
}

export function useWarmup(): { status: WarmupStatus; readyMs: number | null } {
  const [, force] = useState(0);
  useEffect(() => {
    ensurePolling();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (status !== "checking") l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { status, readyMs };
}
