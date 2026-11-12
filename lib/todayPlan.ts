// "আজ" এর তালিকা (pure): আজকের রুটিন ব্লক (টিকসহ) আর সময় ছাড়া কাজ (বট, পোর্টাল বা Pomodoro থেকে যোগ করা)।
// কাজের আলাদা পেজ নেই; সব রুটিনের ভেতরে। রুটিনের ব্লকের নিজের কাজ (routine_id) ব্লকের টিক হিসেবে দেখাই, আলাদা না।

export type PlanBlock = { id: number; start_time: string; end_time: string | null; title: string; note: string | null };
export type PlanTodo = { id: number; task: string; due_date: string | null; priority: number; status: string; done_at: string | null; routine_id: number | null };

export type TodayBlock = PlanBlock & { todoId: number | null; done: boolean; live: boolean; past: boolean };
export type TodayTask = { id: number; task: string; due_date: string | null; priority: number; done: boolean; overdue: boolean };

export function buildToday(blocks: PlanBlock[], todos: PlanTodo[], today: string, hhmm: string) {
  const routineTodo = new Map(todos.filter((t) => t.routine_id && t.due_date === today).map((t) => [t.routine_id!, t]));
  const items: TodayBlock[] = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((b) => {
    const t = routineTodo.get(b.id);
    const live = b.start_time <= hhmm && (b.end_time ? hhmm < b.end_time : false);
    return { ...b, todoId: t?.id ?? null, done: t?.status === "done", live, past: (b.end_time ?? b.start_time) <= hhmm };
  });
  const tasks: TodayTask[] = todos
    .filter((t) => !t.routine_id && (t.status === "open"
      ? !t.due_date || t.due_date <= today
      : t.status === "done" && (t.done_at ?? "").startsWith(today)))
    .map((t) => ({ id: t.id, task: t.task, due_date: t.due_date, priority: t.priority, done: t.status === "done", overdue: !!t.due_date && t.due_date < today }))
    .sort((a, b) => Number(a.done) - Number(b.done) || b.priority - a.priority || Number(b.overdue) - Number(a.overdue));
  const total = items.length + tasks.length;
  const done = items.filter((b) => b.done).length + tasks.filter((t) => t.done).length;
  return { blocks: items, tasks, total, done, next: items.find((b) => b.start_time > hhmm) ?? null, current: items.find((b) => b.live) ?? null };
}

/** সামনের দিনের সময় ছাড়া কাজ (রুটিনের ব্লকের নিজের কাজ বাদ), তারিখ ধরে */
export function laterTasks(todos: PlanTodo[], today: string): Map<string, PlanTodo[]> {
  const m = new Map<string, PlanTodo[]>();
  for (const t of todos) {
    if (t.routine_id || t.status !== "open" || !t.due_date || t.due_date <= today) continue;
    m.set(t.due_date, [...(m.get(t.due_date) ?? []), t]);
  }
  return m;
}
