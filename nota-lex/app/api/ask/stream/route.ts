import { NextRequest } from "next/server";
import { answerStream } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * /api/ask/stream — SSE-streamed version of /api/ask.
 *
 * Same setup pipeline (retrieve + Bright Data + GraphRAG), but emits
 * Server-Sent Events as work progresses:
 *
 *   event: meta        → retrieval timings, provider flags
 *   event: citations   → full citation list (UI renders the strip immediately)
 *   event: delta       → LLM token chunks (one per chunk)
 *   event: done        → final timings
 *   event: error       → if anything fails (stream closes after this)
 *
 * Each event has a JSON data: payload. Frontend consumes via EventSource
 * or fetch+ReadableStream.
 *
 * Why this exists: the non-streaming endpoint takes 4-11 seconds end-to-end
 * because retrieval is slow at the new corpus scale (1.32M opinions, ivfflat
 * with 100 lists). With streaming, the user sees citations within 2 seconds
 * and text starts flowing right after. Makes the demo feel snappy.
 */

interface AskRequest {
  question?: string;
  use_live_serp?: boolean;
  session_id?: string;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: AskRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const question = (body.question || "").trim();
  if (!question) {
    return new Response(
      JSON.stringify({ error: "Missing required field: question" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const useLiveSerp = body.use_live_serp !== false;
  const session_id = body.session_id;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Open the SSE stream with a heartbeat so the client knows the
        // connection is alive while retrieval (~30s) is happening.
        controller.enqueue(encoder.encode(":ok\n\n"));

        for await (const event of answerStream(question, {
          useLiveSerp,
          session_id,
        })) {
          controller.enqueue(encoder.encode(sseEvent(event.type, event)));
          // After 'done' or 'error', close the stream.
          if (event.type === "done" || event.type === "error") {
            controller.close();
            return;
          }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            sseEvent("error", {
              type: "error",
              message: e instanceof Error ? e.message : String(e),
            })
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
