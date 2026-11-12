// পোর্টাল থেকে রুটিনের ব্লক যোগ/বদলের ইনপুট যাচাই (pure)। বটের tools/routine.py এর নিয়মের মতোই।
export const DAY_CODES = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];
export const MAX_BLOCKS = 60;

export type BlockInput = {
  title?: unknown; kind?: unknown; date?: unknown; days?: unknown;
  start_time?: unknown; end_time?: unknown; note?: unknown; remind?: unknown; focus?: unknown;
};
export type CleanBlock = { title: string; days: string; date: string | null; start_time: string; end_time: string | null; note: string | null; remind: number; focus: number | null };

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const time = (v: unknown) => {
  const m = HHMM.exec(String(v ?? "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
};

export function cleanBlock(input: BlockInput, today: string): { ok: true; value: CleanBlock } | { ok: false; error: string } {
  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "কী করবে সেটা লেখো" };
  const start = time(input.start_time);
  if (!start) return { ok: false, error: "শুরুর সময় দাও" };
  const endRaw = String(input.end_time ?? "").trim();
  const end = endRaw ? time(endRaw) : null;
  if (endRaw && !end) return { ok: false, error: "শেষের সময় ঠিক নেই" };
  if (end && end <= start) return { ok: false, error: "শেষের সময় শুরুর পরে হতে হবে" };

  let days: string;
  let date: string | null = null;
  if (input.kind === "date") {
    date = String(input.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, error: "তারিখ বেছে নাও" };
    if (date < today) return { ok: false, error: "এই তারিখটা পেরিয়ে গেছে" };
    days = "once";
  } else {
    const list = Array.isArray(input.days) ? input.days.map((d) => String(d).toUpperCase()) : [];
    const picked = DAY_CODES.filter((c) => list.includes(c));
    if (!picked.length) return { ok: false, error: "অন্তত একটা দিন বেছে নাও" };
    days = picked.length === 7 ? "daily" : picked.join(",");
  }
  const note = String(input.note ?? "").trim().slice(0, 300) || null;
  // focus: true/false = ইউজারের বাছাই, অন্য কিছু (null) = নিজে থেকে (lib/focus.ts)
  const focus = input.focus === true ? 1 : input.focus === false ? 0 : null;
  return { ok: true, value: { title, days, date, start_time: start, end_time: end, note, remind: input.remind === false ? 0 : 1, focus } };
}

/** "ভূগোল ২য় অধ্যায়: দিন ১" → "ভূগোল ২য় অধ্যায়" (একসাথে মোছার জন্য একই পরিকল্পনার ব্লকগুলো চেনা) */
export function planName(title: string): string {
  const i = title.indexOf(":");
  return (i > 0 ? title.slice(0, i) : title).trim();
}

const norm = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[\s\p{P}]+/gu, "");

/** একটা বারের সাপ্তাহিক ব্লকগুলো অন্য বারেও: নতুন কপি না বানিয়ে ব্লকের days এ বার যোগ (একই সময়ে একই কাজ আগে থাকলে সেই বার বাদ)।
 *  ফেরত: কোন ব্লকের নতুন days কী হবে। 'daily' ব্লক এমনিতেই সব দিনে, তাই ছোঁয় না। */
export function copyDayPlan(blocks: { id: number; days: string; title: string; start_time: string }[], from: string, to: string[]): { id: number; days: string }[] {
  const on = (b: { days: string }, code: string) => b.days === "daily" || b.days.split(",").includes(code);
  const targets = DAY_CODES.filter((c) => to.includes(c) && c !== from);
  const out: { id: number; days: string }[] = [];
  for (const b of blocks) {
    if (b.days === "daily" || b.days === "once" || !b.days.split(",").includes(from)) continue;
    const add = targets.filter((c) => !on(b, c) && !blocks.some((o) => o.id !== b.id && on(o, c) && o.start_time === b.start_time && norm(o.title) === norm(b.title)));
    if (!add.length) continue;
    const set = new Set([...b.days.split(","), ...add]);
    const days = DAY_CODES.filter((c) => set.has(c));
    out.push({ id: b.id, days: days.length === 7 ? "daily" : days.join(",") });
  }
  return out;
}
