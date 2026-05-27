"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeClient } from "@speechmatics/real-time-client";

/**
 * VoiceInputButton — microphone-driven voice input for the /ask page,
 * powered by Speechmatics Realtime transcription.
 *
 * Flow:
 *   1. User clicks the mic.
 *   2. We POST /api/speechmatics/temp-key to mint a 60-second JWT
 *      (the long-lived API key never reaches the browser).
 *   3. We open a Realtime WebSocket via @speechmatics/real-time-client,
 *      configured with { url } and authenticated with the JWT.
 *   4. We getUserMedia({ audio: true }) and feed 16kHz PCM_S16LE chunks
 *      from a ScriptProcessorNode to the WebSocket.
 *   5. AddPartialTranscript / AddTranscript events update the textarea.
 *   6. On click again we close cleanly.
 *
 * Hackathon: First 100 participants at the Bright Data UNLOCKED event get
 *            $200 in free Speechmatics credits.
 */

interface Props {
  /** Called as the user speaks; replace the textarea contents. */
  onPartialTranscript: (text: string) => void;
  /** Called when a turn finalizes; append to the textarea. */
  onFinalTranscript: (text: string) => void;
  /** Visual state hint */
  disabled?: boolean;
}

type VoiceState = "idle" | "requesting-key" | "connecting" | "listening" | "error";

// Build the spoken text from a list of RecognitionResults. Each result has
// `alternatives[0].content` (the word/punctuation) and `type` ('word' | 'punctuation').
type RecognitionResultLike = {
  type?: string;
  alternatives?: Array<{ content?: string }>;
};
function joinResults(results: RecognitionResultLike[] | undefined): string {
  if (!results || results.length === 0) return "";
  let out = "";
  for (const r of results) {
    const piece = r?.alternatives?.[0]?.content ?? "";
    if (!piece) continue;
    if (r.type === "punctuation") {
      out += piece;
    } else {
      out += (out.length ? " " : "") + piece;
    }
  }
  return out;
}

export function VoiceInputButton({ onPartialTranscript, onFinalTranscript, disabled }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RealtimeClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const stop = useCallback(async () => {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      await audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (clientRef.current) {
        try {
          await clientRef.current.stopRecognition({ noTimeout: true });
        } catch {
          /* ignore — already closed */
        }
      }
    } finally {
      processorRef.current = null;
      sourceRef.current = null;
      audioCtxRef.current = null;
      streamRef.current = null;
      clientRef.current = null;
      setState("idle");
    }
  }, []);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      void stop();
    };
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setState("requesting-key");
    try {
      // 1. Mint JWT
      const keyRes = await fetch("/api/speechmatics/temp-key", { method: "POST" });
      if (!keyRes.ok) {
        const body = await keyRes.text();
        throw new Error(`Could not mint temp key: ${keyRes.status} ${body.slice(0, 200)}`);
      }
      const { jwt, ws_url } = (await keyRes.json()) as { jwt: string; ws_url: string };

      // 2. Open Speechmatics RT WebSocket via the SDK
      setState("connecting");
      const client = new RealtimeClient({ url: ws_url });
      clientRef.current = client;

      client.addEventListener("receiveMessage", (e) => {
        const data = e.data;
        if (!data || typeof data !== "object") return;
        const msg = (data as { message?: string }).message;
        if (msg === "AddPartialTranscript") {
          const t = joinResults((data as { results?: RecognitionResultLike[] }).results);
          if (t) onPartialTranscript(t);
        } else if (msg === "AddTranscript") {
          const t = joinResults((data as { results?: RecognitionResultLike[] }).results);
          if (t) onFinalTranscript(t);
        } else if (msg === "Error") {
          const reason = (data as { reason?: string }).reason || "unknown error";
          setError(`Speechmatics: ${reason}`);
          setState("error");
          void stop();
        }
      });

      await client.start(jwt, {
        transcription_config: {
          language: "en",
          enable_partials: true,
          max_delay: 1.5,
          operating_point: "enhanced",
        },
        audio_format: {
          type: "raw",
          encoding: "pcm_s16le",
          sample_rate: 16000,
        },
      });

      // 3. Mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Resample to 16kHz PCM_S16LE via a ScriptProcessor.
      // (AudioWorklet would be cleaner but ScriptProcessor avoids the
      // worklet-loader dance for a hackathon demo and works in all evergreens.)
      type AudioContextCtor = typeof AudioContext;
      const Ctx = (window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext) as AudioContextCtor;
      const audioCtx = new Ctx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const float = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float.length);
        for (let i = 0; i < float.length; i++) {
          const v = Math.max(-1, Math.min(1, float[i]));
          int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
        }
        try {
          client.sendAudio(int16.buffer);
        } catch {
          /* WS may have closed — outer stop handles state */
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      setState("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
      void stop();
    }
  }, [onPartialTranscript, onFinalTranscript, stop]);

  const onClick = useCallback(() => {
    if (state === "listening") void stop();
    else if (state === "idle" || state === "error") void start();
  }, [state, start, stop]);

  const label =
    state === "listening" ? "Stop"
    : state === "connecting" ? "Connecting…"
    : state === "requesting-key" ? "Authorizing…"
    : "🎙 Speak";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === "requesting-key" || state === "connecting"}
        className={
          "px-3 py-1.5 rounded-sm border text-sm font-medium transition-colors " +
          (state === "listening"
            ? "bg-red-700 text-white border-red-800 animate-pulse"
            : "bg-[var(--color-paper)] border-[var(--color-rule)]/40 hover:border-[var(--color-seal-deep)]")
        }
        title="Voice input powered by Speechmatics Realtime"
      >
        {label}
      </button>
      {error && (
        <span className="text-xs text-red-700">{error}</span>
      )}
      {state === "listening" && (
        <span className="text-xs text-[var(--color-ink-2)]">Listening — speak your question…</span>
      )}
    </div>
  );
}
