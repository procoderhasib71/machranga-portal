// পরীক্ষার তারিখ থেকে উল্টো হিসাব করে দিনভিত্তিক পড়ার পরিকল্পনা (pure)। বটের tools/routine.py এর build_exam_plan এর হুবহু নিয়ম:
// পরীক্ষার আগের দিন পর্যন্ত, শেষে রিভিশন; বেশি অধ্যায় হলে এক দিনে কয়েকটা, কম হলে একটা অধ্যায়ে কয়েক দিন ("(১/২)")।
const BN = "০১২৩৪৫৬৭৮৯";
const bn = (n: number | string) => String(n).replace(/\d/g, (d) => BN[Number(d)]);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export type ExamDay = { date: string; title: string; topic: string };

const CODES = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];
/** 'YYYY-MM-DD' → 'SAT'…'FRI' */
export const dayCodeOf = (iso: string) => CODES[(new Date(`${iso}T00:00:00Z`).getUTCDay() + 1) % 7];
/** রুটিনের days ('daily' বা 'SAT,MON') → বারের তালিকা; ফাঁকা/'daily' = সব দিন */
export const weekdaysOf = (days: string | null | undefined) => (!days || days === "daily" || days === "once" ? null : days.split(","));

/** start থেকে end এর আগের দিন পর্যন্ত যেসব তারিখ weekdays এ পড়ে (weekdays না দিলে সব দিন) */
export function studyDates(start: string, end: string, weekdays?: string[] | null): string[] {
  const out: string[] = [];
  for (let d = start; d < end && out.length < 400; d = addDays(d, 1)) if (!weekdays || weekdays.includes(dayCodeOf(d))) out.push(d);
  return out;
}

/** weekdays: শুধু এই বারগুলোয় পড়া (রুটিনের "পড়ার সময়" এর দিন); না দিলে প্রতিদিন। */
export function buildExamPlan(name: string, topicsIn: string[], examDate: string, startDate: string, revisionDays = 1, weekdays?: string[] | null):
  { ok: true; days: ExamDay[]; studyDays: number; revision: number } | { ok: false; error: string } {
  name = name.trim().slice(0, 80) || "পড়া";
  const topics = topicsIn.map((t) => t.trim()).filter(Boolean).slice(0, 60);
  if (!topics.length) return { ok: false, error: "কোন কোন অধ্যায়/বিষয় পড়বে সেটা দাও" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return { ok: false, error: "তারিখ দাও" };
  if (examDate <= startDate) return { ok: false, error: "শেষের তারিখ শুরুর পরে হতে হবে" };
  const dates = studyDates(startDate, examDate, weekdays);
  const total = dates.length;
  if (total < 1) return { ok: false, error: "এই সময়ের মধ্যে পড়ার কোনো দিন পড়ছে না" };
  const revision = Math.max(0, Math.min(Math.floor(revisionDays || 0), total - 1));
  const study = total - revision;
  const n = topics.length;
  const parts: string[] = [];
  if (n >= study) {
    for (let i = 0; i < study; i++) parts.push(topics.slice(Math.floor((i * n) / study), Math.floor(((i + 1) * n) / study)).join(" + "));
  } else {
    topics.forEach((t, j) => {
      const k = Math.floor(study / n) + (j < study % n ? 1 : 0);
      for (let p = 0; p < k; p++) parts.push(k === 1 ? t : `${t} (${bn(p + 1)}/${bn(k)})`);
    });
  }
  const days: ExamDay[] = parts.map((what, i) => ({ date: dates[i], topic: what, title: `${name}: দিন ${bn(i + 1)} — ${what}`.slice(0, 200) }));
  for (let i = 0; i < revision; i++) {
    const topic = `রিভিশন${revision > 1 ? ` ${bn(i + 1)}` : ""}`;
    days.push({ date: dates[study + i], topic, title: `${name}: ${topic}` });
  }
  return { ok: true, days, studyDays: study, revision };
}

/** দেখানোর জন্য: পরপর একই অধ্যায়ের দিন এক সারিতে */
export function groupDays(days: { date: string; topic: string }[]): { from: string; to: string; topic: string }[] {
  const out: { from: string; to: string; topic: string }[] = [];
  for (const d of days) {
    const base = d.topic.replace(/\s*\([০-৯0-9]+\/[০-৯0-9]+\)$/, "").replace(/^রিভিশন.*/, "রিভিশন");
    const last = out.at(-1);
    if (last && last.topic === base) last.to = d.date;
    else out.push({ from: d.date, to: d.date, topic: base });
  }
  return out;
}

/** "একদিন পিছিয়ে দাও" পড়ার সময়ের বার ধরে: প্রতিটা তারিখ n টা পড়ার দিন পরে (weekdays না দিলে n দিন পরে) */
export function shiftOnDays(dates: string[], n: number, weekdays?: string[] | null): string[] {
  const next = (d: string) => {
    let x = addDays(d, 1);
    for (let k = 0; weekdays && !weekdays.includes(dayCodeOf(x)) && k < 7; k++) x = addDays(x, 1);
    return x;
  };
  return dates.map((d) => { let x = d; for (let i = 0; i < n; i++) x = next(x); return x; });
}
