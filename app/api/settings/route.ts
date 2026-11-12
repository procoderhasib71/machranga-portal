// সেটিংস: বটের hermes_users এর একই কলাম, তাই এখানে বদলালে বটও সেটাই মানে
import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
import { getMasterId } from "@/lib/session";

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function cleanTime(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (s === "") return "";
  if (!HHMM.test(s)) return null;
  const [h, m] = s.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return NextResponse.json({ ok: false, error: "লগইন নেই" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const sets: string[] = [];
  const args: (string | number)[] = [];

  for (const field of ["todo_digest", "news_time", "mood_checkin"] as const) {
    if (field in body) {
      const t = cleanTime(body[field]);
      if (t === null) return NextResponse.json({ ok: false, error: "সময় হবে HH:MM (২৪ ঘণ্টা)" }, { status: 400 });
      sets.push(`${field} = ?`); args.push(t);
    }
  }
  if ("news_topics" in body) {
    sets.push("news_topics = ?");
    args.push(String(body.news_topics ?? "").split(/[,;]+/).map((t) => t.trim()).filter(Boolean).join(", ").slice(0, 200));
  }
  for (const field of ["weekly_report", "money_digest"] as const) {
    if (field in body) { sets.push(`${field} = ?`); args.push(body[field] ? 1 : 0); }
  }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: "কিছু বদলানো হয়নি" }, { status: 400 });

  await exec(`UPDATE hermes_users SET ${sets.join(", ")} WHERE master_id = ?`, [...args, mid]);
  return NextResponse.json({ ok: true });
}
