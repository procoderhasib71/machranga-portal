// পোর্টাল থেকে রিমাইন্ডার রাখা (pure যাচাই): বটের tools/reminders.py এর নিয়মের মতোই, একই hermes_reminders টেবিলে।
// platform ফাঁকা রাখি, তাই বট যুক্ত সব অ্যাকাউন্টে (Telegram/Discord DM) পাঠায়।
export const MAX_PENDING = 50;
const ORDER = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];   // বটের _DAY_ORDER
const JS_DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];  // Date.getUTCDay ক্রম

export type ReminderInput = { task?: unknown; date?: unknown; time?: unknown; repeat?: unknown; days?: unknown };
export type CleanReminder = { task: string; trigger_time: string; rule: string };

const at = (s: string) => new Date(`${s.replace(" ", "T")}:00Z`);   // বাংলাদেশের সময়কে UTC ধরে শুধু তারিখ গোনা
const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

/** 'once' | 'daily' | 'weekly' | 'days' (+ days) → বটের repeat_rule ('', 'daily', 'weekly', 'days:SAT,MON') */
export function ruleOf(repeat: unknown, days: unknown): string | null {
  const r = String(repeat ?? "once");
  if (r === "once" || r === "") return "";
  if (r === "daily" || r === "weekly") return r;
  if (r === "days") {
    const list = Array.isArray(days) ? days.map((d) => String(d).toUpperCase()) : [];
    const picked = ORDER.filter((c) => list.includes(c));
    if (!picked.length) return null;
    return picked.length === 7 ? "daily" : `days:${picked.join(",")}`;
  }
  return null;
}

function next(d: Date, rule: string): Date {
  const n = new Date(d);
  if (rule === "weekly") { n.setUTCDate(n.getUTCDate() + 7); return n; }
  if (rule === "daily") { n.setUTCDate(n.getUTCDate() + 1); return n; }
  const wanted = rule.slice(5).split(",");
  for (let i = 1; i <= 7; i++) {
    n.setUTCDate(n.getUTCDate() + 1);
    if (wanted.includes(JS_DAY[n.getUTCDay()])) return n;
  }
  return n;
}

/** nowBd: 'YYYY-MM-DD HH:MM' (বাংলাদেশ)। নিয়মিত রিমাইন্ডারে সময় পেরিয়ে গেলে বা দিন না মিললে পরের বার থেকে শুরু। */
export function cleanReminder(input: ReminderInput, nowBd: string): { ok: true; value: CleanReminder } | { ok: false; error: string } {
  const task = String(input.task ?? "").trim().slice(0, 300);
  if (!task) return { ok: false, error: "কী মনে করাতে হবে লেখো" };
  const time = String(input.time ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "সময় দাও" };
  const date = String(input.date ?? "").trim() || nowBd.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(at(`${date} ${time}`).getTime())) return { ok: false, error: "তারিখ ঠিক নেই" };
  const rule = ruleOf(input.repeat, input.days);
  if (rule === null) return { ok: false, error: "কোন কোন দিন মনে করাবে, বেছে নাও" };

  let when = at(`${date} ${time}`);
  const now = at(nowBd);
  if (rule.startsWith("days:") && !rule.slice(5).split(",").includes(JS_DAY[when.getUTCDay()])) when = next(when, rule);
  while (rule && when <= now) when = next(when, rule);
  if (when <= now) return { ok: false, error: "এই সময়টা পেরিয়ে গেছে, সামনের সময় দাও" };
  return { ok: true, value: { task, trigger_time: fmt(when), rule } };
}

/** 'days:SAT,MON' → ['SAT','MON'] (ফর্মে আগের মান বসাতে) */
export function ruleDays(rule: string | null): string[] {
  return rule?.startsWith("days:") ? rule.slice(5).split(",") : rule === "daily" ? [...ORDER] : [];
}
