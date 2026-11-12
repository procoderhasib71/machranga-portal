// বটের scheduler প্রতি মিনিটে ডাকে: Pomodoro যুক্ত সবার to-do আর রুটিন sync
import { NextRequest, NextResponse } from "next/server";
import { syncAll, validSyncToken } from "@/lib/pomodoroSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!validSyncToken(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const r = await syncAll();
  return NextResponse.json({ ok: r.errors.length === 0, ...r, error: r.errors[0] });
}
