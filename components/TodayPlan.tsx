"use client";
// "আজ": রুটিনের ব্লক (সময় ধরে) আর সময় ছাড়া কাজ এক তালিকায়, টিক দিলে বট, পোর্টাল আর Pomodoro সবখানে শেষ।
// নতুন কাজ এখানেই যোগ হয় (কাজের আলাদা পেজ নেই)।
import { CalendarPlus, Check, Flame, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { humanDate, humanTime } from "@/lib/bn";
import type { TodayBlock, TodayTask } from "@/lib/todayPlan";

async function todo(payload: Record<string, unknown>) {
  const r = await fetch("/api/todo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? "হলো না");
}

const BURST = ["var(--brand)", "var(--accent)", "var(--ok)", "var(--brand)", "var(--accent)", "var(--ok)", "var(--brand)", "var(--accent)"];

function Tick({ done, live, onClick, disabled, label, accent, celebrate }: {
  done: boolean; live?: boolean; onClick: () => void; disabled?: boolean; label: string; accent?: boolean; celebrate: number;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={done} title={done ? "আবার খোলো" : "শেষ হলে চাপো"}
      data-done={done}
      className="tick z-10 mt-0.5 size-[27px] shrink-0 rounded-full border-2 flex items-center justify-center hover:bg-[var(--brand-soft)] disabled:cursor-default"
      style={{ borderColor: done || live ? "var(--brand)" : accent ? "var(--accent)" : "var(--faint)", background: done ? "var(--brand)" : "var(--surface)" }}>
      {done ? <Check key={celebrate} className="check" size={15} strokeWidth={3} style={{ color: "var(--brand-ink)" }} />
        : live ? <span className="size-2.5 rounded-full" style={{ background: "var(--brand)" }} /> : null}
      {done && celebrate > 0 && (
        <span key={`b${celebrate}`} aria-hidden>
          <span className="ring" />
          <span className="burst">{BURST.map((c, i) => <i key={i} style={{ "--a": `${i * 45}deg`, "--c": c } as React.CSSProperties} />)}</span>
        </span>
      )}
    </button>
  );
}

export default function TodayPlan({ blocks, tasks, today, canAdd = false }: { blocks: TodayBlock[]; tasks: TodayTask[]; today: string; canAdd?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState(false);

  // চাপলেই টিক বসে (সার্ভারের উত্তরের অপেক্ষা নেই); ব্যর্থ হলে আগের অবস্থায় ফেরে
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [party, setParty] = useState<Record<string, number>>({});
  const busy = useRef(new Set<string>());
  const isDone = (key: string, server: boolean) => local[key] ?? server;
  const toggle = (key: string, id: number, server: boolean) => {
    if (busy.current.has(key)) return;
    const next = !isDone(key, server);
    setLocal((m) => ({ ...m, [key]: next }));
    if (next) {
      setParty((m) => ({ ...m, [key]: (m[key] ?? 0) + 1 }));
      try { navigator.vibrate?.(12); } catch {}
    }
    busy.current.add(key);
    setError("");
    todo({ action: next ? "complete" : "reopen", id })
      .then(() => setTimeout(() => start(() => router.refresh()), 700))   // animation শেষ হলে তালিকা নতুন করে সাজাই
      .catch((e) => { setLocal((m) => ({ ...m, [key]: !next })); setError(e instanceof Error ? e.message : "হলো না"); })
      .finally(() => busy.current.delete(key));
  };

  const act = (payload: Record<string, unknown>) => start(async () => {
    setError("");
    try { await todo(payload); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "হলো না"); }
  });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    act({ action: "add", task, due_date: due || undefined, priority });
    setTask(""); setDue(""); setPriority(false);
  };

  return (
    <div>
      {blocks.length === 0 && tasks.length === 0 && (
        <p className="text-sm muted py-2">আজ রুটিনে কিছু নেই।{canAdd ? " নিচে কাজ লেখো, অথবা উপরের “নতুন ব্লক” দিয়ে সময়সহ যোগ করো।" : ""}</p>
      )}

      {blocks.length > 0 && (
        <ol className="relative space-y-1">
          <span className="absolute left-[13px] top-4 bottom-4 w-px" style={{ background: "var(--line)" }} />
          {blocks.map((b) => {
            const key = `b${b.id}`, done = isDone(key, b.done);
            return (
              <li key={b.id} className={`relative flex items-start gap-3 py-1.5 rounded-xl ${party[key] && done ? "done-row" : ""}`}
                style={{ opacity: b.past && !b.live && !done ? 0.6 : 1 }}>
                <Tick done={done} live={b.live} disabled={!b.todoId} celebrate={party[key] ?? 0} label={done ? `${b.title}: আবার খোলো` : `${b.title}: শেষ`}
                  onClick={() => b.todoId && toggle(key, b.todoId, b.done)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs num muted">
                    {humanTime(b.start_time)}{b.end_time ? ` – ${humanTime(b.end_time)}` : ""}
                    {b.live && !done && <span className="chip text-[11px] py-0 ml-2">এখন</span>}
                  </p>
                  <p className={`text-[15px] leading-snug break-words ${b.live && !done ? "font-semibold" : ""}`}>
                    <span className="strike" data-done={done}>{b.title}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {tasks.length > 0 && (
        <div className={blocks.length ? "mt-4 pt-3 border-t" : ""} style={{ borderColor: "var(--line)" }}>
          {blocks.length > 0 && <p className="eyebrow mb-1">সময় ছাড়া কাজ</p>}
          <ul>
            {tasks.map((t) => {
              const key = `t${t.id}`, done = isDone(key, t.done);
              return (
              <li key={t.id} className={`group flex items-start gap-3 py-1.5 rounded-xl ${party[key] && done ? "done-row" : ""}`}>
                <Tick done={done} accent={!!t.priority} celebrate={party[key] ?? 0} label={done ? `${t.task}: আবার খোলো` : `${t.task}: শেষ`}
                  onClick={() => toggle(key, t.id, t.done)} />
                <span className="flex-1 min-w-0 text-[15px] leading-snug pt-1 break-words"><span className="strike" data-done={done}>{t.task}</span></span>
                {!done && t.priority ? <span className="chip chip-accent mt-0.5 hidden sm:inline-flex"><Flame size={12} /> জরুরি</span> : null}
                {!done && t.overdue && <span className="chip chip-danger mt-0.5">{humanDate(t.due_date!)}</span>}
                {canAdd && (
                  <button type="button" onClick={() => act({ action: "delete", id: t.id })} disabled={pending} title="বাদ দাও" aria-label={`${t.task} বাদ`}
                    className="btn-ghost rounded-lg sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={16} /></button>
                )}
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {canAdd && (
        <form onSubmit={add} className="mt-4 space-y-2">
          <div className="shell">
            <Plus size={20} className="faint shrink-0" />
            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="নতুন কাজ লেখো, যেমন: বাজার করা" aria-label="নতুন কাজ" />
          </div>
          {task.trim() && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="shell h-10 !px-3 cursor-pointer" title="কোন দিনের (ফাঁকা থাকলে আজ)">
                <CalendarPlus size={16} className="faint shrink-0" />
                <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} aria-label="কোন দিনের" className="!py-0 text-sm num w-[8.5rem]" />
              </label>
              <button type="button" onClick={() => setPriority(!priority)} aria-pressed={priority} className="toggle h-10 gap-1"><Flame size={15} /> জরুরি</button>
              <button type="submit" disabled={pending} className="btn-primary ml-auto h-10 py-0">যোগ করো</button>
            </div>
          )}
        </form>
      )}
      {error && <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
