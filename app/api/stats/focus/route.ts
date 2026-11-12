// বটের শুক্রবারের রিপোর্টের জন্য: গত কয়েক দিনের Pomodoro ফোকাস মিনিট (চাবি: sync এর মতোই)
import { NextRequest, NextResponse } from "next/server";
import { validSyncToken } from "@/lib/pomodoroSync";
import { getFocusByDay, lastDays } from "@/lib/progress";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!validSyncToken(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const mid = String(body.master_id ?? "");
  if (!mid) return NextResponse.json({ ok: false, error: "master_id দাও" }, { status: 400 });
  const days = lastDays(Math.max(1, Math.min(Number(body.days) || 7, 60)));
  const { linked, byDay } = await getFocusByDay(mid, days);
  const minutes = Math.round([...byDay.values()].reduce((a, b) => a + b, 0));
  return NextResponse.json({ ok: true, linked, minutes, byDay: Object.fromEntries(byDay) });
}
