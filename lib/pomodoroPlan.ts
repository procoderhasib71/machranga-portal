// Pomodoro ↔ to-do মেলানোর নিয়ম (pure: DB বা Firestore ছোঁয় না, শুধু বলে কী বদলাতে হবে)।
//
// - বট/পোর্টালের খোলা কাজ → Pomodoro তে টাস্ক (id: hermes-{todo id}), আর Pomodoro র নতুন খোলা টাস্ক → to-do
// - শেষ করা: যেদিকে বদল হয়েছে সেদিক জেতে (pomo_done = শেষ sync এ Pomodoro র অবস্থা)। বারবারের (repeat) টাস্কে
//   Pomodoro নিজে রোজ আবার খুলে দেয়, তাই ওগুলোয় সবসময় Pomodoro যা বলে তাই
// - মোছা: to-do তে status 'deleted' হলে Pomodoro থেকে মুছে সারিটা মুছি; Pomodoro তে না থাকলে to-do ও মুছি
// - নাম: সাধারণ কাজের নাম শুধু Pomodoro তেই বদলানো যায়, তাই ওখানকার নামই ঠিক
// - রুটিনের কাজ (lib/routineTodos.ts বানায়): ব্লকই আসল, তাই নাম আর দিন পোর্টাল → Pomodoro; মুছলে সারি মোছে না
//   (status 'deleted' থাকে, নইলে পরের sync আবার বানাত)
// - আগের ব্যবস্থার "routine-{block}-{YYYYMMDD}" টাস্কগুলো সরে যায় (শেষ করা থাকলে নতুন কাজটাও শেষ হয়)

export type PomoTask = {
  id: string; title: string; category?: string; duration?: number; completed: boolean;
  estimatedPomodoros?: number; completedPomodoros?: number; dueDate?: string | null; reminder?: string | null;
  repeat?: string | null; notes?: string | null; priority?: number; createdAt?: string; completedAt?: string | null; list?: string;
  [k: string]: unknown;
};

export type TodoRow = {
  id: number; task: string; due_date: string | null; priority: number; status: string;
  pomo_id: string | null; pomo_done: number | null;
  routine_id?: number | null; routine_date?: string | null;
};

export type BlockRow = { id: number; days: string; date?: string | null; start_time: string; end_time: string | null; title: string };

export type DbOp = { sql: string; args: (string | number | null)[] };

export type PlanInput = {
  masterId: string;
  todos: TodoRow[];
  tasks: PomoTask[];
  docExists: boolean;
  blocks: BlockRow[];
  today: string;      // 'YYYY-MM-DD' বাংলাদেশ
  dayCode: string;    // 'SAT'...'FRI'
  nowIso: string;     // Pomodoro এর createdAt/completedAt এর মতো ISO
  nowBd: string;      // 'YYYY-MM-DD HH:MM' (to-do এর done_at/created_at)
};

export type Plan = { tasks: PomoTask[]; tasksChanged: boolean; ops: DbOp[]; changed: number };

const LEGACY_REPEAT: Record<string, string> = { Daily: "daily", Weekly: "weekly", Weekdays: "satthu" };
const isRepeat = (t: PomoTask) => Boolean(t.repeat && (LEGACY_REPEAT[t.repeat] || ["daily", "satthu", "weekly"].includes(t.repeat)));

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** to-do এর তারিখ → Pomodoro র তালিকা (অ্যাপ নিজে যেভাবে রাখে: "আগামীকাল" মানে list Planned, dueDate Tomorrow) */
export function listFor(due: string | null, today: string): { list: string; dueDate: string | null } {
  if (!due) return { list: "Today", dueDate: null };
  if (due <= today) return { list: "Today", dueDate: "Today" };
  if (due === addDays(today, 1)) return { list: "Planned", dueDate: "Tomorrow" };
  if (due <= addDays(today, 6)) return { list: "This Week", dueDate: "This Week" };
  return { list: "Planned", dueDate: "Planned" };
}

function newTask(id: string, title: string, nowIso: string, extra: Partial<PomoTask> = {}): PomoTask {
  return {
    id, title, category: "", duration: 25, completed: false, estimatedPomodoros: 1, completedPomodoros: 0,
    createdAt: nowIso, completedAt: null, list: "Today", dueDate: null, priority: 0, reminder: null, repeat: null, notes: null,
    ...extra,
  };
}

const minutesOf = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export function plan(input: PlanInput): Plan {
  const { masterId, todos, docExists, blocks, today, nowIso, nowBd } = input;
  let tasks = input.tasks.map((t) => ({ ...t }));
  let tasksChanged = false;
  let changed = 0;
  const ops: DbOp[] = [];
  const byId = () => new Map(tasks.map((t) => [t.id, t]));
  const removeTask = (id: string) => { tasks = tasks.filter((t) => t.id !== id); tasksChanged = true; };

  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const extra = (todo: TodoRow): Partial<PomoTask> => {
    const b = todo.routine_id ? blockById.get(todo.routine_id) : undefined;
    if (!b) return {};
    const mins = b.end_time ? minutesOf(b.end_time) - minutesOf(b.start_time) : 25;
    return { category: "রুটিন", estimatedPomodoros: Math.max(1, Math.round(Math.max(mins, 25) / 25)),
      notes: `রুটিন: ${b.start_time}${b.end_time ? `–${b.end_time}` : ""}` };
  };

  // ০. আগের ব্যবস্থার রুটিন টাস্ক সরাই; শেষ করা থাকলে একই দিনের নতুন কাজটাও শেষ
  const legacyDone = new Set<number>();
  for (const t of [...tasks]) {
    const m = /^routine-(\d+)-(\d{4})(\d{2})(\d{2})$/.exec(t.id);
    if (!m && !t.id.startsWith("routine-")) continue;
    removeTask(t.id); changed++;
    if (!m || !t.completed) continue;
    const todo = todos.find((x) => x.routine_id === Number(m[1]) && x.routine_date === `${m[2]}-${m[3]}-${m[4]}` && x.status === "open");
    if (todo) {
      legacyDone.add(todo.id);
      ops.push({ sql: "UPDATE hermes_todos SET status = 'done', done_at = ? WHERE id = ? AND master_id = ?", args: [nowBd, todo.id, masterId] });
    }
  }

  const linked = new Set<string>();
  for (const todo of todos) {
    const map = byId();
    const routine = Boolean(todo.routine_id);
    // ১. to-do তে মোছা
    if (todo.status === "deleted") {
      if (todo.pomo_id && map.has(todo.pomo_id)) { removeTask(todo.pomo_id); changed++; }
      if (!routine) ops.push({ sql: "DELETE FROM hermes_todos WHERE id = ? AND master_id = ?", args: [todo.id, masterId] });
      else if (todo.pomo_id) ops.push({ sql: "UPDATE hermes_todos SET pomo_id = NULL, pomo_done = 0 WHERE id = ? AND master_id = ?", args: [todo.id, masterId] });
      continue;
    }
    // ২. এখনো Pomodoro তে যায়নি এমন খোলা কাজ
    if (!todo.pomo_id) {
      const done = legacyDone.has(todo.id);
      if (todo.status !== "open" && !done) continue;   // পুরনো শেষ করা কাজ পাঠাই না
      const id = `hermes-${todo.id}`;
      if (!map.has(id)) {
        const { list, dueDate } = listFor(todo.due_date, today);
        tasks.push(newTask(id, todo.task, nowIso, {
          list, dueDate, priority: todo.priority ? 3 : 0, ...extra(todo),
          ...(done ? { completed: true, completedAt: nowIso } : {}),
        }));
        tasksChanged = true; changed++;
      }
      linked.add(id);
      ops.push({ sql: "UPDATE hermes_todos SET pomo_id = ?, pomo_done = ? WHERE id = ? AND master_id = ?", args: [id, done ? 1 : 0, todo.id, masterId] });
      continue;
    }
    // ৩. দুই দিকেই আছে (বা থাকার কথা)
    linked.add(todo.pomo_id);
    const task = map.get(todo.pomo_id);
    if (!task) {
      if (docExists) {   // Pomodoro তে মুছে ফেলা হয়েছে
        ops.push(routine
          ? { sql: "UPDATE hermes_todos SET status = 'deleted', pomo_id = NULL, pomo_done = 0, done_at = ? WHERE id = ? AND master_id = ?", args: [nowBd, todo.id, masterId] }
          : { sql: "DELETE FROM hermes_todos WHERE id = ? AND master_id = ?", args: [todo.id, masterId] });
        changed++;
      } else if (todo.status === "open") {   // টাস্কের doc ই নেই (নতুন বা খালি): আবার বানাই
        const { list, dueDate } = listFor(todo.due_date, today);
        tasks.push(newTask(todo.pomo_id, todo.task, nowIso, { list, dueDate, priority: todo.priority ? 3 : 0, ...extra(todo) }));
        tasksChanged = true; changed++;
      }
      continue;
    }
    const hermesDone = todo.status === "done";
    const pomoDone = Boolean(task.completed);
    const pomoMoved = pomoDone !== Boolean(todo.pomo_done);
    let finalDone = pomoDone;
    if (hermesDone !== pomoDone) {
      if (isRepeat(task) || pomoMoved) {
        // Pomodoro তে বদল হয়েছে (বা বারবারের টাস্ক): to-do মেলাই
        ops.push(pomoDone
          ? { sql: "UPDATE hermes_todos SET status = 'done', done_at = ? WHERE id = ? AND master_id = ?", args: [nowBd, todo.id, masterId] }
          : { sql: "UPDATE hermes_todos SET status = 'open', done_at = NULL WHERE id = ? AND master_id = ?", args: [todo.id, masterId] });
      } else {
        // বট/পোর্টালে বদল হয়েছে: Pomodoro মেলাই
        Object.assign(task, { completed: hermesDone, completedAt: hermesDone ? nowIso : null });
        tasksChanged = true;
        finalDone = hermesDone;
      }
      changed++;
    }
    const title = String(task.title ?? "").trim();
    if (routine) {
      // রুটিনের কাজ: ব্লকই আসল, তাই নাম আর দিন এদিক থেকে যায়
      const { list, dueDate } = listFor(todo.due_date, today);
      if (title !== todo.task || task.list !== list || (task.dueDate ?? null) !== dueDate) {
        Object.assign(task, { title: todo.task, list, dueDate });
        tasksChanged = true; changed++;
      }
    } else if (title && title !== todo.task) {
      ops.push({ sql: "UPDATE hermes_todos SET task = ? WHERE id = ? AND master_id = ?", args: [title.slice(0, 300), todo.id, masterId] });
      changed++;
    }
    if (Boolean(todo.pomo_done) !== finalDone) {
      ops.push({ sql: "UPDATE hermes_todos SET pomo_done = ? WHERE id = ? AND master_id = ?", args: [finalDone ? 1 : 0, todo.id, masterId] });
    }
  }

  // ৪. Pomodoro র নতুন খোলা টাস্ক → to-do (রুটিনের টাস্ক বাদ)
  for (const t of tasks) {
    if (linked.has(t.id) || t.id.startsWith("routine-") || t.completed) continue;
    const title = String(t.title ?? "").trim();
    if (!title) continue;
    ops.push({
      sql: "INSERT INTO hermes_todos (master_id, task, due_date, priority, status, created_at, pomo_id, pomo_done) VALUES (?, ?, ?, ?, 'open', ?, ?, 0)",
      args: [masterId, title.slice(0, 300), (t.list === "Today" || !t.list) && t.dueDate === "Today" ? today : null, (t.priority ?? 0) > 0 ? 1 : 0, nowBd, t.id],
    });
    changed++;
  }

  return { tasks, tasksChanged, ops, changed };
}
