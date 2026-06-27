"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useElapsed — milliseconds since `active` flipped true; resets to 0 when false.
 * Powers the live "thinking" stopwatch shown while a question is being answered.
 */
export function useElapsed(active: boolean): number {
  const [ms, setMs] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!active) {
      setMs(0);
      return;
    }
    start.current = Date.now();
    setMs(0);
    const iv = setInterval(() => setMs(Date.now() - start.current), 100);
    return () => clearInterval(iv);
  }, [active]);
  return ms;
}
