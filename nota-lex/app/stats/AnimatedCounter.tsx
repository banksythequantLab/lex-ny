"use client";

/**
 * AnimatedCounter
 *
 * Two-phase animation that doubles as both a flashy loading state and a
 * dramatic reveal when the real data arrives.
 *
 *   Phase 1 (target === undefined or null):
 *     Cycle random `digits`-length integers every ~55ms. Looks like a
 *     decoder spinning up. Held for as long as we're waiting on the API.
 *
 *   Phase 2 (target becomes a real number):
 *     Stop scrambling. Smoothly ease from the last scrambled value into
 *     the real target value over `easeMs` (default 1.6s) using a
 *     custom cubic curve that starts fast and settles. After that we
 *     hold the final value and never animate again.
 *
 * Honest about what's happening: while scrambling, the digits are
 * obviously random (each frame is unrelated to the last), so a careful
 * viewer can tell. Once data lands the easing reveals the real number.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  /** The real value, once known. Pass undefined or null while loading. */
  target: number | null | undefined;
  /** How many digits to scramble while loading. Defaults to a smart guess. */
  digits?: number;
  /** Locale string for the final formatted value. Default en-US. */
  locale?: string;
  /** Easing duration when target lands. Default 1600ms. */
  easeMs?: number;
  /** Optional className wrapping the number span. */
  className?: string;
}

function randomNDigit(n: number): number {
  // Smallest = 10^(n-1), largest = 10^n - 1 (i.e. n-digit number).
  // For n=1, smallest=1; for n>=2 we always show n-digit numbers.
  if (n <= 1) return Math.floor(Math.random() * 10);
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
}

function easeOutCubic(t: number): number {
  // Classic cubic ease-out. Starts fast, lands gently.
  return 1 - Math.pow(1 - t, 3);
}

function guessDigits(target: number | null | undefined, fallback: number): number {
  if (typeof target === "number" && target > 0) {
    return Math.floor(Math.log10(target)) + 1;
  }
  return fallback;
}

export function AnimatedCounter({
  target,
  digits,
  locale = "en-US",
  easeMs = 1600,
  className,
}: Props) {
  const [display, setDisplay] = useState<number | null>(null);
  const targetRef = useRef<number | null | undefined>(target);
  const phaseRef = useRef<"scramble" | "easing" | "done">("scramble");
  const lastScrambleRef = useRef<number>(0);

  // Keep targetRef synced for the loop closures.
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  // Decide on the digit count we want during scramble. If target is known,
  // match its width so the scrambled placeholder looks like the same shape
  // as the eventual answer.
  const scrambleDigits = digits ?? guessDigits(target, 7);

  useEffect(() => {
    let rafId: number | null = null;
    let scrambleTimer: ReturnType<typeof setInterval> | null = null;
    let easeStart: number | null = null;
    let easeFrom = 0;
    let easeTo = 0;

    function tickEasing(ts: number) {
      if (easeStart === null) easeStart = ts;
      const elapsed = ts - easeStart;
      const t = Math.min(1, elapsed / easeMs);
      const v = Math.round(easeFrom + (easeTo - easeFrom) * easeOutCubic(t));
      setDisplay(v);
      if (t < 1) {
        rafId = requestAnimationFrame(tickEasing);
      } else {
        setDisplay(easeTo);
        phaseRef.current = "done";
      }
    }

    function startEasing(fromVal: number, toVal: number) {
      easeFrom = fromVal;
      easeTo = toVal;
      easeStart = null;
      phaseRef.current = "easing";
      if (scrambleTimer) {
        clearInterval(scrambleTimer);
        scrambleTimer = null;
      }
      rafId = requestAnimationFrame(tickEasing);
    }

    function tickScramble() {
      const t = targetRef.current;
      if (typeof t === "number") {
        // Real value just arrived. Switch to easing from wherever we were.
        const from = lastScrambleRef.current || 0;
        startEasing(from, t);
        return;
      }
      const v = randomNDigit(scrambleDigits);
      lastScrambleRef.current = v;
      setDisplay(v);
    }

    // Initial state branch:
    if (typeof target === "number") {
      // Real value already provided on first render. Run the dramatic
      // count-up from 0 anyway — gives every page-load a flashy reveal
      // and matches the user's "flex programming muscle" request.
      phaseRef.current = "easing";
      startEasing(0, target);
    } else {
      // Loading. Scramble until the parent passes us a real target.
      phaseRef.current = "scramble";
      tickScramble();
      scrambleTimer = setInterval(tickScramble, 55);
    }

    return () => {
      if (scrambleTimer) clearInterval(scrambleTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // We deliberately only re-run on these. `target` updates are picked
    // up inside the loop via targetRef so we don't tear down the timer
    // mid-scramble.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrambleDigits, easeMs]);

  // If the parent flips target back to null (e.g. a refresh failed), we
  // could resume scrambling, but the typical demo never does that — and
  // resuming after `done` would feel weird. So we leave the value frozen.
  const text =
    display === null
      ? "0".padStart(scrambleDigits, "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : display.toLocaleString(locale);

  return <span className={className}>{text}</span>;
}
