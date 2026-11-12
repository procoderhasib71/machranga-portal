"use client";
import { Check, CircleCheck, Flame, Plus, RotateCcw, Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-2 sm:p-2.5 flex flex-wrap items-center gap-2 rise">
        <span className="pl-2.5 faint"><Plus size={20} /></span>
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="নতুন কাজ লেখো, যেমন: বাজার করা"
          aria-label="নতুন কাজ" className="flex-1 min-w-40 bg-transparent outline-none py-2 text-[15px]" />
        <div className="flex items-center gap-2 w-full sm:w-auto pl-2 sm:pl-0">
          <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} aria-label="কবের মধ্যে"
            className="bg-transparent outline-none px-2.5 py-2 rounded-lg border text-sm muted" style={{ borderColor: "var(--line)" }} />
          <button type="button" onClick={() => setPriority(!priority)} aria-pressed={priority}
            className={`chip ${priority ? "chip-accent" : "chip-muted"} cursor-pointer py-1.5`}><Flame size={14} /> জরুরি</button>
          <button type="submit" disabled={pending || !task.trim()} className="btn-primary ml-auto py-2">যোগ করো</button>
        </div>
      </form>
      {error && <p className="text-sm rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

      <section className="card card-pad rise" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">খোলা কাজ</h2>
          {open.length > 0 && <span className="chip chip-muted num">{bnDigits(open.length)}টা</span>}
        </div>
        {open.length === 0 ? (
          <div className="py-8 text-center">
            <CircleCheck size={36} className="mx-auto" style={{ color: "var(--ok)" }} />
            <p className="font-semibold mt-2">সব শেষ! 🎉</p>
            <p className="text-sm muted">নতুন কাজ উপরে লেখো, অথবা বটকে বলো।</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {open.map((t) => (
              <li key={t.id} className="group flex items-center gap-3 py-3">
                <button disabled={pending} onClick={() => act({ action: "complete", id: t.id })} aria-label={`${t.task} শেষ`}
                  className="size-[22px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors hover:bg-[var(--brand-soft)]"
                  style={{ borderColor: t.priority ? "var(--accent)" : "var(--faint)" }} title="শেষ হলে চাপো">
                  <Check size={13} className="opacity-0 group-hover:opacity-60" style={{ color: "var(--brand)" }} />
                </button>
                <span className="flex-1 min-w-0 text-[15px]">{t.task}</span>
                {t.priority ? <span className="chip chip-accent hidden sm:inline-flex"><Flame size={12} /> জরুরি</span> : null}
                {t.due_date && (
                  <span className={`chip ${t.due_date < today ? "chip-danger" : "chip-muted"}`}>{humanDate(t.due_date)}</span>
                )}
                <button onClick={() => act({ action: "delete", id: t.id })} disabled={pending}
                  className="btn-ghost rounded-lg sm:opacity-0 sm:group-hover:opacity-100" title="একেবারে বাদ" aria-label={`${t.task} বাদ`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
