// তারিখের পরিকল্পনার সারাংশ (pure): একই নামের ব্লকগুলো ('কার্ডিওলজি: দিন ১', 'দিন ২' …) এক পরিকল্পনা,
// কবে থেকে কবে, প্রতিটা দিনের অবস্থা (শেষ/মিস/আজ/সামনে), আর পরের দিন কবে।
import { planName } from "./routineEdit.ts";

export type PlanDayStatus = "done" | "missed" | "today" | "upcoming";
export type PlanDay = { date: string; status: PlanDayStatus };
export type PlanSummary = { name: string; from: string; to: string; days: PlanDay[]; done: number; next: string | null };

export function buildPlans(blocks: { id: number; date: string; title: string }[], statuses: Map<string, string>, today: string): PlanSummary[] {
  const groups = new Map<string, { id: number; date: string }[]>();
  for (const b of blocks) groups.set(planName(b.title), [...(groups.get(planName(b.title)) ?? []), b]);
  const out: PlanSummary[] = [];
  for (const [name, rows] of groups) {
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    if (dates.length < 2 || dates.at(-1)! < today) continue;   // এক দিনের ব্লক বা শেষ হয়ে যাওয়া পরিকল্পনা না
    const days = dates.map((date): PlanDay => {
      const all = rows.filter((r) => r.date === date).map((r) => statuses.get(`${r.id}|${date}`));
      const done = all.length > 0 && all.every((s) => s === "done");
      return { date, status: done ? "done" : date === today ? "today" : date > today ? "upcoming" : "missed" };
    });
    out.push({ name, from: dates[0], to: dates.at(-1)!, days, done: days.filter((d) => d.status === "done").length,
      next: days.find((d) => d.status === "today" || d.status === "upcoming")?.date ?? null });
  }
  return out.sort((a, b) => a.from.localeCompare(b.from));
}
