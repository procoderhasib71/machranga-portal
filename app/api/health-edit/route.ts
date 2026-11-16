// পোর্টাল থেকে স্বাস্থ্যের মাপ, ওষুধ আর মন লেখা/বাদ। নিয়ম বটের tools/health.py, meds.py, mood.py র মতোই, একই টেবিলে।
import { NextRequest, NextResponse } from "next/server";
import { db, exec, one } from "@/lib/db";
import { getMasterId } from "@/lib/session";

const bdNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // 'YYYY-MM-DD HH:MM:SS'
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))); return Number.isFinite(n) ? n : NaN; };
const clean = (x: number) => (Number.isInteger(x) ? x : Math.round(x * 10) / 10);
const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

type Metric = { unit: string; units: string[]; range: [number, number] | null };
const METRICS: Record<string, Metric> = {
  bp: { unit: "mmHg", units: ["mmHg"], range: null },
  sugar: { unit: "mmol/L", units: ["mmol/L", "mg/dL"], range: null },
  weight: { unit: "কেজি", units: ["কেজি"], range: [10, 300] },
  sleep: { unit: "ঘণ্টা", units: ["ঘণ্টা"], range: [0, 24] },
  water: { unit: "গ্লাস", units: ["গ্লাস", "লিটার"], range: [0, 30] },
  symptom: { unit: "", units: [""], range: null },
};

/** 'YYYY-MM-DDTHH:MM' (ব্রাউজারের datetime-local) → 'YYYY-MM-DD HH:MM:00'; ফাঁকা হলে এখন */
function when(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return bdNow();
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})$/.exec(s);
  if (!m) return null;
  const out = `${m[1]} ${m[2]}:00`;
  return out > bdNow() ? null : out;
}

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return fail("লগইন নেই", 401);
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "log") {
    const metric = String(b.metric ?? "");
    const M = METRICS[metric];
    if (!M) return fail("কোন মাপ?");
    const at = when(b.at);
    if (!at) return fail("সময়টা ঠিক নেই (ভবিষ্যতের সময় দেওয়া যায় না)");
    const note = String(b.note ?? "").trim().slice(0, 300);
    let data: Record<string, unknown>, unit = M.unit;
    if (metric === "bp") {
      const sys = num(b.sys), dia = num(b.dia);
      if (!(sys >= 50 && sys <= 300 && dia >= 30 && dia <= 200 && dia < sys)) return fail("প্রেশারের দুটো সংখ্যা ঠিক নেই, যেমন ১২০/৮০");
      data = { sys: Math.round(sys), dia: Math.round(dia) };
    } else if (metric === "symptom") {
      const text = String(b.text ?? "").trim().slice(0, 300);
      if (!text) return fail("কী উপসর্গ সেটা লেখো");
      data = { text }; unit = "";
    } else {
      const x = num(b.value);
      unit = M.units.includes(String(b.unit)) ? String(b.unit) : M.unit;
      const [lo, hi] = metric === "sugar" ? (unit === "mg/dL" ? [20, 700] : [1, 40]) : M.range!;
      if (!(x >= lo && x <= hi) || (x <= 0 && metric !== "sleep")) return fail("সংখ্যাটা সম্ভব মনে হচ্ছে না, আবার দেখো");
      data = { value: clean(x) };
    }
    await exec("INSERT INTO hermes_health_logs (master_id, metric, value_json, unit, note, logged_at) VALUES (?, ?, ?, ?, ?, ?)",
      [mid, metric, JSON.stringify(data), unit || null, metric === "symptom" ? null : note || null, at]);
    const red = metric === "bp" && ((data.sys as number) >= 180 || (data.dia as number) >= 120);
    return NextResponse.json({ ok: true, red });
  }

  if (action === "delete_log") {
    const n = await exec("DELETE FROM hermes_health_logs WHERE id = ? AND master_id = ?", [Number(b.id) || 0, mid]);
    return n ? NextResponse.json({ ok: true }) : fail("পাওয়া যায়নি", 404);
  }

  if (action === "mood") {
    const score = Math.round(num(b.score));
    if (!(score >= 1 && score <= 5)) return fail("মন ১ থেকে ৫ এর মধ্যে");
    await exec("INSERT INTO hermes_mood_logs (master_id, score, note, logged_at) VALUES (?, ?, ?, ?)",
      [mid, score, String(b.note ?? "").trim().slice(0, 300) || null, bdNow()]);
    return NextResponse.json({ ok: true });
  }

  if (action === "med_add") {
    const name = String(b.name ?? "").trim().slice(0, 80), dose = String(b.dose ?? "").trim().slice(0, 60);
    if (!name) return fail("ওষুধের নাম লাগবে");
    const raw = Array.isArray(b.times) ? b.times.map(String) : String(b.times ?? "").split(",");
    const times = [...new Set(raw.map((t: string) => t.trim()).filter(Boolean))] as string[];
    if (times.some((t) => !HHMM.test(t))) return fail("সময় হবে HH:MM");
    const slots = times.map((t) => { const [h, m] = t.split(":"); return `${h.padStart(2, "0")}:${m}`; }).sort();
    await stopMed(mid, name);   // একই নামের পুরনোটা বদলে দিই (বটের মতো)
    const now = bdNow(), today = now.slice(0, 10), label = `${name} ${dose}`.trim();
    const ids: string[] = [];
    for (const s of slots) {
      // আজকের সময় পেরিয়ে গেলে কাল থেকে
      const first = `${today} ${s}` > now.slice(0, 16) ? `${today} ${s}` : `${nextDay(today)} ${s}`;
      const r = await db().execute({ sql: "INSERT INTO hermes_reminders (master_id, platform, channel_id, task, trigger_time, repeat_rule, status, created_at, style) VALUES (?, NULL, NULL, ?, ?, 'daily', 'pending', ?, '')",
        args: [mid, `💊 ওষুধ খাওয়ার সময়: ${label}`, first, now] });
      if (r.lastInsertRowid !== undefined) ids.push(String(r.lastInsertRowid));
    }
    await exec("INSERT INTO hermes_medications (master_id, name, dose, times, note, reminder_ids, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
      [mid, name, dose || null, slots.join(",") || null, String(b.note ?? "").trim().slice(0, 200) || null, ids.join(",") || null, now]);
    return NextResponse.json({ ok: true });
  }

  if (action === "med_stop") {
    return (await stopMed(mid, "", Number(b.id) || 0)) ? NextResponse.json({ ok: true }) : fail("পাওয়া যায়নি", 404);
  }
  return fail("action ঠিক নেই");
}

function nextDay(d: string): string {
  const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

async function stopMed(mid: string, name: string, id = 0): Promise<boolean> {
  const row = id
    ? await one<{ id: number; reminder_ids: string | null }>("SELECT id, reminder_ids FROM hermes_medications WHERE id = ? AND master_id = ? AND active = 1", [id, mid])
    : await one<{ id: number; reminder_ids: string | null }>("SELECT id, reminder_ids FROM hermes_medications WHERE master_id = ? AND active = 1 AND lower(name) = lower(?)", [mid, name]);
  if (!row) return false;
  const rids = (row.reminder_ids || "").split(",").filter((x) => /^\d+$/.test(x));
  await db().batch([
    ...rids.map((r) => ({ sql: "UPDATE hermes_reminders SET status = 'cancelled' WHERE id = ? AND master_id = ? AND status = 'pending'", args: [Number(r), mid] })),
    { sql: "UPDATE hermes_medications SET active = 0, stopped_at = ? WHERE id = ?", args: [bdNow(), row.id] },
  ], "write");
  return true;
}
