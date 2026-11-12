"use client";
import { CalendarClock, CalendarPlus, Check, CircleCheck, Flame, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bnDigits, humanDate } from "@/lib/bn";
import type { Todo } from "@/lib/data";

async function call(payload: Record<string, unknown>) {
  const r = await fetch("/api/todo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? "হলো না");
}

export default function TodoList({ open, done, today }: { open: Todo[]; done: Todo[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState(false);
  const [error, setError] = useState("");

  const act = (payload: Record<string, unknown>) =>
    start(async () => {
      setError("");
      try {
        await call(payload);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "হলো না");
      }
    });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    act({ action: "add", task, due_date: due || undefined, priority });
    setTask(""); setDue(""); setPriority(false);
  };

  // আজ/দেরি/তারিখ ছাড়া কাজ উপরে; সামনের তারিখের কাজ দিন ধরে নিচে
  const now = open.filter((t) => !t.due_date || t.due_date <= today);
  const later = open.filter((t) => t.due_date && t.due_date > today);
  const laterDays = [...later.reduce((m, t) => m.set(t.due_date!, [...(m.get(t.due_date!) ?? []), t]), new Map<string, Todo[]>())];

  const Row = ({ t }: { t: Todo }) => (
    <li className="group flex items-center gap-3 py-3">
      <button disabled={pending} onClick={() => act({ action: "complete", id: t.id })} aria-label={`${t.task} শেষ`}
        className="size-[22px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors hover:bg-[var(--brand-soft)]"
        style={{ borderColor: t.priority ? "var(--accent)" : t.routine_id ? "var(--brand)" : "var(--faint)" }} title="শেষ হলে চাপো">
        <Check size={13} className="opacity-0 group-hover:opacity-60" style={{ color: "var(--brand)" }} />
      </button>
      <span className="flex-1 min-w-0 text-[15px]">{t.task}</span>
      {t.routine_id ? <span className="chip hidden sm:inline-flex" title="রুটিন থেকে"><CalendarClock size={12} /> রুটিন</span> : null}
      {t.priority ? <span className="chip chip-accent hidden sm:inline-flex"><Flame size={12} /> জরুরি</span> : null}
      {t.due_date && t.due_date <= today && (
        <span className={`chip ${t.due_date < today ? "chip-danger" : "chip-muted"}`}>{humanDate(t.due_date)}</span>
      )}
      <button onClick={() => act({ action: "delete", id: t.id })} disabled={pending}
        className="btn-ghost rounded-lg sm:opacity-0 sm:group-hover:opacity-100" title={t.routine_id ? "এই দিনের কাজটা বাদ (রুটিন থাকবে)" : "একেবারে বাদ"} aria-label={`${t.task} বাদ`}>
        <Trash2 size={16} />
      </button>
    </li>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-3 sm:p-4 space-y-3 rise">
        <div className="shell">
          <Plus size={20} className="faint shrink-0" />
          <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="নতুন কাজ লেখো, যেমন: বাজার করা" aria-label="নতুন কাজ" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="shell h-10 !px-3 cursor-pointer" title="কবের মধ্যে">
            <CalendarPlus size={16} className="faint shrink-0" />
            <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} aria-label="কবের মধ্যে"
              className="!py-0 text-sm num w-[8.5rem]" />
          </label>
          <button type="button" onClick={() => setPriority(!priority)} aria-pressed={priority} className="toggle h-10 gap-1">
            <Flame size={15} /> জরুরি
          </button>
          <button type="submit" disabled={pending || !task.trim()} className="btn-primary ml-auto h-10 py-0">যোগ করো</button>
        </div>
      </form>
      {error && <p className="text-sm rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

      <section className="card card-pad rise" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">আজ আর বাকি কাজ</h2>
          {now.length > 0 && <span className="chip chip-muted num">{bnDigits(now.length)}টা</span>}
        </div>
        {now.length === 0 ? (
          <div className="py-8 text-center">
            <CircleCheck size={36} className="mx-auto" style={{ color: "var(--ok)" }} />
            <p className="font-semibold mt-2">সব শেষ! 🎉</p>
            <p className="text-sm muted">নতুন কাজ উপরে লেখো, অথবা বটকে বলো।</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">{now.map((t) => <Row key={t.id} t={t} />)}</ul>
        )}
      </section>

      {later.length > 0 && (
        <section className="card card-pad rise" style={{ animationDelay: "90ms" }}>
          <h2 className="font-semibold mb-1">সামনের দিনগুলো</h2>
          <p className="text-xs muted mb-2">রুটিনের প্রতিটা দিনের কাজ সেই দিনে &ldquo;আজ&rdquo; এ চলে আসবে।</p>
          {laterDays.map(([day, rows]) => (
            <div key={day} className="pt-3">
              <h3 className="eyebrow flex items-center gap-2">{humanDate(day)}<span className="flex-1 h-px" style={{ background: "var(--line)" }} /></h3>
              <ul className="divide-y divide-[var(--line)]">{rows.map((t) => <Row key={t.id} t={t} />)}</ul>
            </div>
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="card card-pad rise" style={{ animationDelay: "120ms" }}>
          <h2 className="font-semibold mb-2">সম্প্রতি শেষ করা</h2>
          <ul className="divide-y divide-[var(--line)]">
            {done.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="size-[22px] rounded-full shrink-0 flex items-center justify-center" style={{ background: "var(--brand)" }}>
                  <Check size={13} style={{ color: "var(--brand-ink)" }} strokeWidth={3} />
                </span>
                <span className="flex-1 min-w-0 line-through faint">{t.task}</span>
                <button onClick={() => act({ action: "reopen", id: t.id })} disabled={pending} className="link">
                  <RotateCcw size={14} /> আবার খোলো
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
