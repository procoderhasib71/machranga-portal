"use client";
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
      <form onSubmit={add} className="card p-4 flex flex-wrap items-center gap-3">
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="নতুন কাজ লেখো…"
          className="flex-1 min-w-48 bg-transparent outline-none px-2 py-1.5 rounded-lg border" style={{ borderColor: "var(--line)" }} />
        <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)}
          className="bg-transparent outline-none px-2 py-1.5 rounded-lg border text-sm" style={{ borderColor: "var(--line)", color: "var(--muted)" }} />
        <label className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} /> জরুরি
        </label>
        <button type="submit" disabled={pending || !task.trim()}
          className="px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>
          যোগ করো
        </button>
      </form>
      {error && <p style={{ color: "var(--red)" }}>⚠️ {error}</p>}

      <section className="card p-5">
        <h2 className="font-semibold mb-3">খোলা কাজ {open.length > 0 && <span style={{ color: "var(--muted)" }}>({bnDigits(open.length)})</span>}</h2>
        {open.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>সব শেষ! 🎉</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {open.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <input type="checkbox" className="size-5 accent-[var(--teal)]" disabled={pending}
                  onChange={() => act({ action: "complete", id: t.id })} title="শেষ হলে টিক দাও" />
                <span className="flex-1">{t.priority ? <b>❗ {t.task}</b> : t.task}</span>
                {t.due_date && (
                  <span className="text-sm" style={{ color: t.due_date < today ? "var(--red)" : "var(--muted)" }}>
                    {t.due_date < today ? "⚠️ " : ""}{humanDate(t.due_date)}
                  </span>
                )}
                <button onClick={() => act({ action: "delete", id: t.id })} disabled={pending}
                  className="text-sm px-2" style={{ color: "var(--muted)" }} title="একেবারে বাদ">✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">সম্প্রতি শেষ করা</h2>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {done.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5" style={{ color: "var(--muted)" }}>
                <span className="flex-1 line-through">{t.task}</span>
                <button onClick={() => act({ action: "reopen", id: t.id })} disabled={pending}
                  className="text-sm font-medium" style={{ color: "var(--teal)" }}>আবার খোলো</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
