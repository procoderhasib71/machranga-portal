// পড়ার পরিকল্পনা (pure): আগে plan ("Davidson মেডিসিন ১ মাসে"), তার অধীনে দিন ধরে ব্লক (plan_id)।
// পুরনো ব্লকে plan_id না থাকলে একই নামের ("কার্ডিওলজি: দিন ১", "দিন ২" …) ব্লকগুলো এক পরিকল্পনা ধরি।
// প্রতিটা দিনের অবস্থা: শেষ/মিস/আজ/সামনে; অগ্রগতি, পরের দিন, পরীক্ষার কত দিন বাকি।
import { planName } from "./routineEdit.ts";

export type PlanDayStatus = "done" | "missed" | "today" | "upcoming";
export type PlanBlockRow = {
  id: number; date: string; title: string; plan_id: number | null; days: string; start_time: string;
  end_time: string | null; note: string | null; remind: number; focus: number | null;
};
export type PlanRow = { id: number; name: string; book: string | null; exam_date: string | null; start_time: string | null; end_time: string | null };
export type PlanDay = { date: string; status: PlanDayStatus; topic: string; block: PlanBlockRow };
export type PlanSummary = {
  id: number | null; key: string; name: string; book: string | null; examDate: string | null;
  from: string; to: string; days: PlanDay[]; done: number; next: string | null; finished: boolean;
};

/** "মেডিসিন: দিন ৩ — Cardiology (২/৩)" → "Cardiology (২/৩)"; "দিন ১" ধরনের হলে নামের পরের অংশ */
export function topicOf(title: string): string {
  const dash = title.indexOf(" — ");
  if (dash >= 0) return title.slice(dash + 3).trim();
  const colon = title.indexOf(":");
  return (colon > 0 ? title.slice(colon + 1) : title).trim();
}

export function buildPlans(plans: PlanRow[], blocks: PlanBlockRow[], statuses: Map<string, string>, today: string): PlanSummary[] {
  const byPlan = new Map<string, { plan: PlanRow | null; name: string; rows: PlanBlockRow[] }>();
  for (const p of plans) byPlan.set(`p${p.id}`, { plan: p, name: p.name, rows: [] });
  for (const b of blocks) {
    const key = b.plan_id && byPlan.has(`p${b.plan_id}`) ? `p${b.plan_id}` : `n${planName(b.title)}`;
    if (!byPlan.has(key)) byPlan.set(key, { plan: null, name: planName(b.title), rows: [] });
    byPlan.get(key)!.rows.push(b);
  }
  const out: PlanSummary[] = [];
  for (const [key, { plan, name, rows }] of byPlan) {
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    const dates = [...new Set(rows.map((r) => r.date))];
    if (dates.length < 2 && !plan) continue;   // নামহীন একক ব্লক পরিকল্পনা না
    if (!dates.length) continue;
    const days = rows.map((r): PlanDay => {
      const s = statuses.get(`${r.id}|${r.date}`);
      const status: PlanDayStatus = s === "done" ? "done" : r.date === today ? "today" : r.date > today ? "upcoming" : "missed";
      return { date: r.date, status, topic: topicOf(r.title), block: r };
    });
    const to = dates.at(-1)!;
    out.push({
      id: plan?.id ?? null, key, name, book: plan?.book ?? null, examDate: plan?.exam_date ?? null,
      from: dates[0], to, days, done: days.filter((d) => d.status === "done").length,
      next: days.find((d) => d.status === "today" || d.status === "upcoming")?.date ?? null,
      finished: to < today,
    });
  }
  return out.sort((a, b) => Number(a.finished) - Number(b.finished) || a.from.localeCompare(b.from));
}

/** আজ থেকে কত দিন বাকি (পরীক্ষা বা শেষ দিন) */
export function daysLeft(target: string, today: string): number {
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}
