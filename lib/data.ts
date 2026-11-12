// সব পড়ার কোয়েরি এক জায়গায়: প্রতিটা শুধু নিজের master_id এর ডাটা ছোঁয়
import { one, query } from "./db";
import { todayBD } from "./bn";
import type { PlanBlockRow, PlanRow } from "./plans";

export type User = {
  master_id: string; name: string | null; city: string | null; assistant_name: string | null; call_me: string | null;
  todo_digest: string | null; news_time: string | null; news_topics: string | null;
  mood_checkin: string | null; weekly_report: number | null; money_digest: number | null; prayer_alerts: string | null;
};

export async function getUser(mid: string): Promise<User | null> {
  return one<User>(
    "SELECT master_id, name, city, assistant_name, call_me, todo_digest, news_time, news_topics, mood_checkin, weekly_report, money_digest, prayer_alerts FROM hermes_users WHERE master_id = ?",
    [mid]);
}

export type Todo = { id: number; task: string; due_date: string | null; priority: number; status: string; done_at: string | null; routine_id: number | null };

export async function getTodos(mid: string): Promise<{ open: Todo[]; done: Todo[] }> {
  const open = await query<Todo>(
    "SELECT id, task, due_date, priority, status, done_at, routine_id FROM hermes_todos WHERE master_id = ? AND status = 'open' " +
    "ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date, priority DESC, id", [mid]);
  const done = await query<Todo>(
    "SELECT id, task, due_date, priority, status, done_at, routine_id FROM hermes_todos WHERE master_id = ? AND status = 'done' " +
    "ORDER BY done_at DESC LIMIT 20", [mid]);
  return { open, done };
}

export type RoutineBlock = { id: number; days: string; date: string | null; start_time: string; end_time: string | null; title: string; note: string | null; remind: number; focus: number | null };

export async function getRoutine(mid: string): Promise<RoutineBlock[]> {
  return query<RoutineBlock>(
    "SELECT id, days, date, start_time, end_time, title, note, remind, focus FROM hermes_routine_blocks " +
    "WHERE master_id = ? AND (date IS NULL OR date >= ?) ORDER BY COALESCE(date, ''), start_time, id", [mid, todayBD()]);
}

export type Reminder = { id: number; task: string; trigger_time: string; repeat_rule: string | null };

export async function getReminders(mid: string): Promise<Reminder[]> {
  return query<Reminder>(
    "SELECT id, task, trigger_time, repeat_rule FROM hermes_reminders WHERE master_id = ? AND status = 'pending' ORDER BY trigger_time LIMIT 20", [mid]);
}

export type HealthLog = { id: number; metric: string; value_json: string; unit: string | null; note: string | null; logged_at: string };

export async function getHealthLogs(mid: string, days = 30): Promise<HealthLog[]> {
  return query<HealthLog>(
    "SELECT id, metric, value_json, unit, note, logged_at FROM hermes_health_logs WHERE master_id = ? " +
    "AND logged_at >= date('now', ?) ORDER BY logged_at", [mid, `-${days} days`]);
}

export type Med = { name: string; dose: string | null; times: string | null; note: string | null };

export async function getMeds(mid: string): Promise<Med[]> {
  return query<Med>("SELECT name, dose, times, note FROM hermes_medications WHERE master_id = ? AND active = 1 ORDER BY id", [mid]);
}

export type MoodLog = { score: number; note: string | null; logged_at: string };

export async function getMoods(mid: string, days = 30): Promise<MoodLog[]> {
  return query<MoodLog>(
    "SELECT score, note, logged_at FROM hermes_mood_logs WHERE master_id = ? AND logged_at >= date('now', ?) ORDER BY logged_at",
    [mid, `-${days} days`]);
}

export type StudyDay = { day: string; total: number; correct: number };

export async function getStudyDays(mid: string, days = 14): Promise<StudyDay[]> {
  return query<StudyDay>(
    "SELECT substr(answered_at, 1, 10) AS day, COUNT(*) AS total, SUM(is_correct) AS correct FROM hermes_mcq_attempts " +
    "WHERE master_id = ? AND answered_at >= date('now', ?) GROUP BY day ORDER BY day", [mid, `-${days} days`]);
}

export async function getStudyTotals(mid: string, days = 30): Promise<{ total: number; correct: number }> {
  const row = await one<{ total: number; correct: number | null }>(
    "SELECT COUNT(*) AS total, SUM(is_correct) AS correct FROM hermes_mcq_attempts WHERE master_id = ? AND answered_at >= date('now', ?)",
    [mid, `-${days} days`]);
  return { total: row?.total ?? 0, correct: row?.correct ?? 0 };
}

export type Subscription = { plan: string; expires_at: string };

export async function getSubscription(mid: string): Promise<Subscription | null> {
  return one<Subscription>("SELECT plan, expires_at FROM hermes_subscriptions WHERE master_id = ?", [mid]);
}

/** ড্যাশবোর্ডের জন্য: আজ কোন রুটিন ব্লকগুলো আছে */
export function todaysBlocks(blocks: RoutineBlock[], dayCode: string, today: string = todayBD()): RoutineBlock[] {
  return blocks.filter((b) => (b.date ? b.date === today : b.days === "daily" || b.days.split(",").includes(dayCode)));
}

export function isOverdue(due: string | null): boolean {
  return !!due && due < todayBD();
}

/** মাসের ক্যালেন্ডারের জন্য: সাপ্তাহিক সব ব্লক + এই সময়ের তারিখের ব্লক, আর সেসব দিনের কাজের অবস্থা */
export async function getRoutineMonth(mid: string, from: string, to: string) {
  const [blocks, todos] = await Promise.all([
    query<RoutineBlock & { created_at: string | null }>(
      "SELECT id, days, date, start_time, end_time, title, note, remind, focus, created_at FROM hermes_routine_blocks " +
      "WHERE master_id = ? AND (date IS NULL OR date BETWEEN ? AND ?)", [mid, from, to]),
    query<{ routine_id: number; routine_date: string; status: string }>(
      "SELECT routine_id, routine_date, status FROM hermes_todos WHERE master_id = ? AND routine_id IS NOT NULL AND routine_date BETWEEN ? AND ?",
      [mid, from, to]),
  ]);
  const tasks = await query<{ id: number; task: string; due_date: string; status: string }>(
    "SELECT id, task, due_date, status FROM hermes_todos WHERE master_id = ? AND routine_id IS NULL AND status IN ('open', 'done') AND due_date BETWEEN ? AND ?",
    [mid, from, to]);
  return { blocks, tasks, statuses: new Map(todos.map((t) => [`${t.routine_id}|${t.routine_date}`, t.status])) };
}

/** পরিকল্পনার সারাংশের জন্য: গত ৬০ দিন থেকে সামনের তারিখের ব্লক আর সেসব দিনের কাজের অবস্থা */
export async function getPlanBlocks(mid: string) {
  const [plans, blocks, todos] = await Promise.all([
    query<PlanRow>("SELECT id, name, book, exam_date, start_time, end_time FROM hermes_plans WHERE master_id = ? AND (end_date IS NULL OR end_date >= date('now', '-60 days'))", [mid]),
    query<PlanBlockRow>(
      "SELECT id, date, title, plan_id, days, start_time, end_time, note, remind, focus FROM hermes_routine_blocks " +
      "WHERE master_id = ? AND date IS NOT NULL AND date >= date('now', '-60 days')", [mid]),
    query<{ routine_id: number; routine_date: string; status: string }>(
      "SELECT routine_id, routine_date, status FROM hermes_todos WHERE master_id = ? AND routine_id IS NOT NULL AND routine_date >= date('now', '-60 days')", [mid]),
  ]);
  const [revs, chapters] = await Promise.all([
    query<{ plan_id: number; topic: string; step: number; due_date: string; status: string | null; session_id: number | null }>(
      "SELECT v.plan_id, v.topic, v.step, v.due_date, t.status, v.session_id FROM hermes_revisions v LEFT JOIN hermes_todos t ON t.id = v.todo_id " +
      "WHERE v.master_id = ? ORDER BY v.step", [mid]),
    query<{ plan_id: number; topic: string; done_on: string; session_id: number | null }>(
      "SELECT plan_id, topic, done_on, session_id FROM hermes_chapter_done WHERE master_id = ?", [mid]),
  ]);
  const sessions = [...new Set([...revs, ...chapters].map((r) => r.session_id).filter((x): x is number => !!x))];
  const scores = new Map<number, { correct: number; total: number }>();
  if (sessions.length) {
    const rows = await query<{ session_id: number; correct: number; total: number }>(
      `SELECT session_id, SUM(is_correct) AS correct, COUNT(*) AS total FROM hermes_mcq_attempts WHERE session_id IN (${sessions.map(() => "?").join(",")}) GROUP BY session_id`,
      sessions);
    for (const r of rows) scores.set(Number(r.session_id), { correct: Number(r.correct ?? 0), total: Number(r.total) });
  }
  const progress: Record<string, ChapterProgress> = {};
  const key = (p: number, t: string) => `${p}|${t}`;
  for (const c of chapters) {
    progress[key(c.plan_id, c.topic)] = { doneOn: c.done_on, score: c.session_id ? scores.get(c.session_id) ?? null : null, revisions: [] };
  }
  for (const v of revs) {
    const k = key(v.plan_id, v.topic);
    progress[k] ??= { doneOn: null, score: null, revisions: [] };
    progress[k].revisions.push({ step: v.step, due: v.due_date, done: v.status === "done", score: v.session_id ? scores.get(v.session_id) ?? null : null });
  }
  return { plans, blocks, statuses: new Map(todos.map((t) => [`${t.routine_id}|${t.routine_date}`, t.status])), progress };
}

export type ChapterProgress = {
  doneOn: string | null;
  score: { correct: number; total: number } | null;
  revisions: { step: number; due: string; done: boolean; score: { correct: number; total: number } | null }[];
};

/** "আজ ছুটি": এই দিনগুলোতে সাপ্তাহিক রুটিন চলে না */
export async function getDaysOff(mid: string, from: string, to: string): Promise<Set<string>> {
  const rows = await query<{ date: string }>("SELECT date FROM hermes_day_off WHERE master_id = ? AND date BETWEEN ? AND ?", [mid, from, to]);
  return new Set(rows.map((r) => r.date));
}
