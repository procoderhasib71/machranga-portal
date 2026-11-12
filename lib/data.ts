// সব পড়ার কোয়েরি এক জায়গায়: প্রতিটা শুধু নিজের master_id এর ডাটা ছোঁয়
import { one, query } from "./db";
import { todayBD } from "./bn";

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

export type RoutineBlock = { id: number; days: string; date: string | null; start_time: string; end_time: string | null; title: string; note: string | null; remind: number };

export async function getRoutine(mid: string): Promise<RoutineBlock[]> {
  return query<RoutineBlock>(
    "SELECT id, days, date, start_time, end_time, title, note, remind FROM hermes_routine_blocks " +
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
      "SELECT id, days, date, start_time, end_time, title, note, remind, created_at FROM hermes_routine_blocks " +
      "WHERE master_id = ? AND (date IS NULL OR date BETWEEN ? AND ?)", [mid, from, to]),
    query<{ routine_id: number; routine_date: string; status: string }>(
      "SELECT routine_id, routine_date, status FROM hermes_todos WHERE master_id = ? AND routine_id IS NOT NULL AND routine_date BETWEEN ? AND ?",
      [mid, from, to]),
  ]);
  return { blocks, statuses: new Map(todos.map((t) => [`${t.routine_id}|${t.routine_date}`, t.status])) };
}
