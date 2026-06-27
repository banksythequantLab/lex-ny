"use client";

/**
 * VoiceInputButton — voice dictation via the browser's Web Speech API.
 *
 * Self-hosted era: voice input is now browser-native (Web Speech API).
 * It uses the browser's built-in SpeechRecognition (free, runs entirely
 * on the client side — Chrome calls Google's speech API but no key,
 * no credits, no per-request cost to us).
 *
 * Behavior (matches the prior voice-input interface so the /ask and
 * /search wire-ups don't change):
 *   - Click to toggle. Stops automatically after ~5s of silence; user
 *     can also click to stop.
 *   - Emits onPartialTranscript(text) repeatedly with the current
 *     in-progress segment (no leading punctuation, capitalized).
 *   - Emits onFinalTranscript(text) once per segment when the
 *     recognizer finalizes (typically when the speaker pauses).
 *
 * Browser support:
 *   - Chrome / Edge: full support
 *   - Safari: experimental support (with webkitSpeechRecognition)
 *   - Firefox: not supported — button shows a fallback message
 *
 * If unsupported the button is rendered but disabled, with a tooltip
 * pointing the user at Chrome.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  onPartialTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  disabled?: boolean;
}

// SpeechRecognition is a vendor-prefixed Web API. TypeScript's DOM lib
// doesn't include it by default, so we declare just enough to use it
// without pulling in @types/dom-speech-recognition (which conflicts with
// some build setups).
interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type Status = "idle" | "listening" | "error";

export function VoiceInputButton({
  onPartialTranscript,
  onFinalTranscript,
  disabled,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognizerRef = useRef<SpeechRecognitionLike | null>(null);

  // Detect support once, client-side only (SSR has no window).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
  }, []);

  function stop() {
    const r = recognizerRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        // already stopped
      }
    }
    recognizerRef.current = null;
    setStatus("idle");
  }

  function start() {
    setError(null);
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      setError("Voice input requires Chrome or Edge.");
      setStatus("error");
      return;
    }

    const r: SpeechRecognitionLike = new Ctor();
    r.continuous = true;        // Keep listening across pauses
    r.interimResults = true;    // Emit partials as the user speaks
    r.lang = "en-US";
    r.maxAlternatives = 1;

    // Track which results have already been finalized so we don't
    // re-emit them on every onresult fire.
    let lastFinalizedIndex = 0;

    r.onresult = (ev) => {
      // The results array grows; resultIndex tells us where new content
      // starts. We walk from lastFinalizedIndex through results.length.
      let interimText = "";
      for (let i = lastFinalizedIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          // Commit each finalized segment exactly once.
          const finalText = transcript.trim();
          if (finalText.length > 0) {
            onFinalTranscript(finalText);
          }
          lastFinalizedIndex = i + 1;
        } else {
          interimText += transcript;
        }
      }
      const partial = interimText.trim();
      if (partial.length > 0) {
        onPartialTranscript(partial);
      }
    };

    r.onerror = (ev) => {
      const code = ev.error;
      // "no-speech" is normal — fires when the user is quiet. Don't
      // surface as an error.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission denied. Check the site permissions.");
      } else if (code === "audio-capture") {
        setError("No microphone detected.");
      } else {
        setError("Voice error: " + code);
      }
      setStatus("error");
      recognizerRef.current = null;
    };

    r.onend = () => {
      // Auto-stop fired (silence timeout or browser-imposed cap).
      // If we're still meant to be listening, restart; otherwise idle.
      if (recognizerRef.current === r && status === "listening") {
        // Browser ended the session on us — let it stay idle and let
        // the user re-click. Auto-restart can loop forever on some
        // mics.
        recognizerRef.current = null;
        setStatus("idle");
      }
    };

    try {
      r.start();
      recognizerRef.current = r;
      setStatus("listening");
    } catch (e) {
      setError("Could not start microphone: " + (e as Error).message);
      setStatus("error");
    }
  }

  // Clean up on unmount so a navigation-away doesn't leave the mic open.
  useEffect(() => {
    return () => {
      const r = recognizerRef.current;
      if (r) {
        try { r.abort(); } catch {}
      }
      recognizerRef.current = null;
    };
  }, []);

  const isListening = status === "listening";
  const isDisabled = disabled || supported === false;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isListening ? stop : start}
        disabled={isDisabled}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        className={
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-[family-name:var(--font-mono)] tracking-wider uppercase rounded-full border transition-colors " +
          (isDisabled
            ? "border-[var(--color-rule)]/30 text-[var(--color-ink-2)]/50 cursor-not-allowed"
            : isListening
            ? "border-red-500 bg-red-500/10 text-red-600 cursor-pointer"
            : "border-[var(--color-rule)]/40 text-[var(--color-ink-2)] hover:border-[var(--color-seal-deep)] hover:text-[var(--color-seal-deep)] cursor-pointer")
        }
        title={
          supported === false
            ? "Voice input requires Chrome or Edge"
            : isListening
            ? "Click to stop"
            : "Click to dictate"
        }
      >
        <span
          className={
            "inline-block w-1.5 h-1.5 rounded-full " +
            (isListening ? "bg-red-500 animate-pulse" : "bg-current opacity-60")
          }
        />
        {isListening ? "Listening… (click to stop)" : "🎙 Speak"}
      </button>
      {error && (
        <span className="text-xs text-red-600 font-[family-name:var(--font-mono)]">
          {error}
        </span>
      )}
    </div>
  );
}
