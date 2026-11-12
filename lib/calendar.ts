// রুটিনের মাসের ক্যালেন্ডার (pure): কোন দিনে কোন ব্লক, আর সেটা শেষ/মিস/আজ/সামনে।
// সপ্তাহ শনিবার থেকে (বাংলাদেশের মতো)। সাপ্তাহিক ব্লক তৈরির আগের দিনগুলোতে দেখাই না।

export type CalBlock = { id: number; days: string; date: string | null; start_time: string; end_time: string | null; title: string; created_at?: string | null };
export type CalStatus = "done" | "missed" | "today" | "upcoming" | "past";
export type CalItem = { id: number; title: string; start_time: string; end_time: string | null; status: CalStatus; dated: boolean; kind: "block" | "task" };
/** সময় ছাড়া কাজ (বট, পোর্টাল বা Pomodoro থেকে), যেদিনের তারিখ সেদিনে */
export type CalTask = { id: number; task: string; due_date: string; status: string };
export type CalCell = { date: string; day: number; inMonth: boolean; isToday: boolean; off: boolean; items: CalItem[] };

const CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];   // JS getUTCDay ক্রম
const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T00:00:00Z`);

/** '2026-11' → আগের/পরের মাস */
export function shiftMonth(month: string, by: number): string {
  const d = at(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return iso(d).slice(0, 7);
}

export function validMonth(m: string | undefined, fallback: string): string {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : fallback;
}

/** ক্যালেন্ডারে যে দিনগুলো দেখা যায় (আগের/পরের মাসের ভরাট দিনসহ), প্রথম আর শেষ তারিখ */
export function monthRange(month: string): { from: string; to: string } {
  const first = at(`${month}-01`);
  const start = new Date(first); start.setUTCDate(1 - ((first.getUTCDay() + 1) % 7));
  const last = at(`${shiftMonth(month, 1)}-01`); last.setUTCDate(0);
  const end = new Date(last); end.setUTCDate(last.getUTCDate() + (6 - ((last.getUTCDay() + 1) % 7)));
  return { from: iso(start), to: iso(end) };
}

/** statuses: `${block id}|${তারিখ}` → সেই দিনের কাজের status ('open' | 'done' | 'deleted') */
export function buildMonth(month: string, today: string, blocks: CalBlock[], statuses: Map<string, string>, tasks: CalTask[] = [], daysOff: Set<string> = new Set()): CalCell[][] {
  const { from, to } = monthRange(month);
  const weeks: CalCell[][] = [];
  for (let d = at(from); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = iso(d);
    const code = CODES[d.getUTCDay()];
    const items = blocks
      .filter((b) => b.date ? b.date === date
        : !daysOff.has(date) && (b.days === "daily" || b.days.split(",").includes(code)) && (!b.created_at || b.created_at.slice(0, 10) <= date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((b): CalItem => {
        const s = statuses.get(`${b.id}|${date}`);
        const status: CalStatus = s === "done" ? "done"
          : date === today ? "today"
          : date > today ? "upcoming"
          : s ? "missed" : "past";
        return { id: b.id, title: b.title, start_time: b.start_time, end_time: b.end_time, status, dated: Boolean(b.date), kind: "block" };
      })
      .concat(tasks.filter((t) => t.due_date === date).map((t): CalItem => ({
        id: -t.id, title: t.task, start_time: "", end_time: null, dated: true, kind: "task",
        status: t.status === "done" ? "done" : date === today ? "today" : date > today ? "upcoming" : "missed",
      })));
    if (!weeks.length || weeks.at(-1)!.length === 7) weeks.push([]);
    weeks.at(-1)!.push({ date, day: d.getUTCDate(), inMonth: date.startsWith(month), isToday: date === today, off: daysOff.has(date), items });
  }
  return weeks;
}
