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
  const args: (string | number | null)[] = [];

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
  // প্রোফাইল: বটের update_user এর একই কলাম (ফাঁকা দিলে ডিফল্টে ফেরত)
  for (const field of ["name", "call_me", "city", "assistant_name"] as const) {
    if (field in body) {
      const v = String(body[field] ?? "").replace(/\s+/g, " ").trim().slice(0, field === "city" ? 40 : 30);
      sets.push(`${field} = ?`); args.push(v || null);
    }
  }
  // নামাজের রিমাইন্ডার: বটের tools/prefs.py র মতো JSON {"prayers": [...], "before": মিনিট}, বন্ধ হলে ''
  if ("prayer_alerts" in body) {
    const pa = body.prayer_alerts;
    if (!pa) { sets.push("prayer_alerts = ''"); }
    else {
      const ALL = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
      const picked = ALL.filter((x) => Array.isArray(pa.prayers) && pa.prayers.includes(x));
      const before = Math.max(0, Math.min(60, Math.round(Number(pa.before) || 0)));
      sets.push("prayer_alerts = ?"); args.push(JSON.stringify({ prayers: picked.length ? picked : ALL, before }));
    }
  }
  if ("mood_checkin" in body) sets.push("mood_misses = 0");
  if (sets.length === 0) return NextResponse.json({ ok: false, error: "কিছু বদলানো হয়নি" }, { status: 400 });

  await exec(`UPDATE hermes_users SET ${sets.join(", ")} WHERE master_id = ?`, [...args, mid]);
  return NextResponse.json({ ok: true });
}
