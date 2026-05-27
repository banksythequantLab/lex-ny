import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isTriggerwareConfigured,
  triggerwareCreate,
  triggerwareListTriggers,
  triggerwareDelete,
} from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Lex.NY watches — create, list, delete change-detection triggers.
 *
 * A "watch" is a Triggerware trigger that polls a query on a schedule
 * and tracks deltas. Lex.NY users create watches for ongoing research
 * topics — e.g. "new NY appellate decisions about consumer protection".
 */

const CreateSchema = z.object({
  name: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/i, "alphanumeric + - _ only"),
  description: z.string().min(8).max(500),
  scheduleSeconds: z.number().int().min(60).max(86400 * 7).optional(),
});

export async function POST(req: NextRequest) {
  if (!isTriggerwareConfigured()) {
    return NextResponse.json(
      { error: "Triggerware not configured. Set TRIGGERWARE_API_KEY in .env.local." },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
    }
    const trigger = await triggerwareCreate(parsed.data.name, parsed.data.description, {
      scheduleSeconds: parsed.data.scheduleSeconds,
    });
    return NextResponse.json({ provider: "triggerware", trigger });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!isTriggerwareConfigured()) {
    return NextResponse.json(
      { error: "Triggerware not configured", configured: false },
      { status: 503 }
    );
  }
  try {
    const triggers = await triggerwareListTriggers();
    return NextResponse.json({ provider: "triggerware", count: triggers.length, triggers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "?name= required" }, { status: 400 });
  }
  if (!isTriggerwareConfigured()) {
    return NextResponse.json({ error: "Triggerware not configured" }, { status: 503 });
  }
  try {
    await triggerwareDelete(name);
    return NextResponse.json({ ok: true, deleted: name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
