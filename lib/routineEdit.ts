// পোর্টাল থেকে রুটিনের ব্লক যোগ/বদলের ইনপুট যাচাই (pure)। বটের tools/routine.py এর নিয়মের মতোই।
export const DAY_CODES = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];
export const MAX_BLOCKS = 60;

export type BlockInput = {
  title?: unknown; kind?: unknown; date?: unknown; days?: unknown;
  start_time?: unknown; end_time?: unknown; note?: unknown; remind?: unknown;
};
export type CleanBlock = { title: string; days: string; date: string | null; start_time: string; end_time: string | null; note: string | null; remind: number };

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
  return { ok: true, value: { title, days, date, start_time: start, end_time: end, note, remind: input.remind === false ? 0 : 1 } };
}

/** "ভূগোল ২য় অধ্যায়: দিন ১" → "ভূগোল ২য় অধ্যায়" (একসাথে মোছার জন্য একই পরিকল্পনার ব্লকগুলো চেনা) */
export function planName(title: string): string {
  const i = title.indexOf(":");
  return (i > 0 ? title.slice(0, i) : title).trim();
}
