"use client";
// রিমাইন্ডার: তালিকা, নতুন রাখা, চাপলে বদলানো/বাদ। বট নিজের সময়ে Telegram/Discord এ পাঠায়।
import { BellPlus, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DAY_BN, DAY_ORDER, humanDateTime } from "@/lib/bn";
import { ruleDays } from "@/lib/reminderEdit";
import { Sheet } from "./RoutineEditor";

export type ReminderRow = { id: number; task: string; trigger_time: string; repeat_rule: string | null };
type Repeat = "once" | "daily" | "weekly" | "days";

const REPEATS: [Repeat, string][] = [["once", "একবার"], ["daily", "প্রতিদিন"], ["days", "কিছু বারে"], ["weekly", "সাপ্তাহিক"]];

function ruleBn(rule: string | null): string {
  if (!rule) return "";
  if (rule === "daily") return "প্রতিদিন";
  if (rule === "weekly") return "প্রতি সপ্তাহে";
  return ruleDays(rule).map((c) => DAY_BN[c]).join(", ");
}

const nowBd = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });

function ReminderForm({ row, onClose, onDelete }: { row?: ReminderRow; onClose: () => void; onDelete?: (id: number) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const rule = row?.repeat_rule ?? "";
  const soon = new Date(Date.now() + 60 * 60000).toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // এক ঘণ্টা পরে
  const [task, setTask] = useState(row?.task ?? "");
  const [date, setDate] = useState((row?.trigger_time ?? soon).slice(0, 10));
  const [time, setTime] = useState(row ? row.trigger_time.slice(11, 16) : `${soon.slice(11, 13)}:00`);
  const [repeat, setRepeat] = useState<Repeat>(!rule ? "once" : rule === "daily" ? "daily" : rule === "weekly" ? "weekly" : "days");
  const [days, setDays] = useState<string[]>(ruleDays(rule).length ? ruleDays(rule) : ["SAT", "SUN", "MON", "TUE", "WED", "THU"]);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  const send = (payload: Record<string, unknown>) => start(async () => {
    setError("");
    const r = await fetch("/api/reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { setError((await r.json().catch(() => ({})))?.error ?? "হলো না"); return; }
    onClose();
    router.refresh();
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send({ action: row ? "update" : "add", id: row?.id, task, date, time, repeat, days });
  };

  return (
    <Sheet title={row ? "রিমাইন্ডার বদলাও" : "নতুন রিমাইন্ডার"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="label">কী মনে করাবে
          <input className="field" value={task} onChange={(e) => setTask(e.target.value)} required maxLength={300}
            placeholder="যেমন: ওষুধ খাও, পড়তে বসো" autoFocus={!row} />
        </label>

        <div>
          <span className="label mb-1.5">কতবার</span>
          <div className="seg">
            {REPEATS.map(([k, label]) => <button key={k} type="button" aria-pressed={repeat === k} onClick={() => setRepeat(k)}>{label}</button>)}
          </div>
        </div>

        {repeat === "days" && (
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((c) => (
              <button key={c} type="button" className="toggle" aria-pressed={days.includes(c)}
                onClick={() => setDays((ds) => (ds.includes(c) ? ds.filter((d) => d !== c) : [...ds, c]))}>{DAY_BN[c]}</button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {(repeat === "once" || repeat === "weekly") && (
            <label className="label">{repeat === "weekly" ? "প্রথম দিন" : "তারিখ"}
              <input className="field" type="date" value={date} min={nowBd().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required />
            </label>
          )}
          <label className="label">সময়
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
        </div>

        {error && <p className="text-sm rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {row && (confirm ? (
            <button type="button" disabled={pending} onClick={() => (onDelete ? onDelete(row.id) : send({ action: "delete", id: row.id }))} className="btn-danger"><Trash2 size={16} /> নিশ্চিত, বাদ দাও</button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="btn-ghost rounded-xl px-3" aria-label="রিমাইন্ডার বাদ দাও"><Trash2 size={18} /></button>
          ))}
          <button type="button" onClick={onClose} className="btn-outline ml-auto">থাক</button>
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "রাখছি…" : row ? "বদলাও" : "রাখো"}</button>
        </div>
        <p className="text-xs muted">সময় হলে বট Telegram (আর Discord যুক্ত থাকলে সেখানেও) মেসেজ দেবে।</p>
      </form>
    </Sheet>
  );
}

export function AddReminderButton({ className = "link" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><BellPlus size={16} /> নতুন</button>
      {open && <ReminderForm onClose={() => setOpen(false)} />}
    </>
  );
}

export default function Reminders({ rows }: { rows: ReminderRow[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<ReminderRow | null>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  // বাদ দিলে সাথে সাথে তালিকা থেকে সরাই; সার্ভার পেছনে, ব্যর্থ হলে ফিরিয়ে আনি
  const remove = (id: number) => {
    setEdit(null);
    setHidden((h) => [...h, id]);
    fetch("/api/reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) })
      .then((r) => { if (!r.ok) throw new Error(); router.refresh(); })
      .catch(() => { setHidden((h) => h.filter((x) => x !== id)); alert("বাদ দেওয়া গেল না, আবার চেষ্টা করো"); });
  };
  return (
    <>
      <ul className="space-y-1">
        {rows.filter((r) => !hidden.includes(r.id)).map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setEdit(r)} title="বদলাতে বা বাদ দিতে চাপো"
              className="w-full flex items-center gap-3 text-left rounded-xl px-2 py-2 -mx-2 hover:bg-[var(--surface-2)] transition-colors">
              <span className="chip chip-accent num shrink-0">{humanDateTime(r.trigger_time)}</span>
              <span className="flex-1 min-w-0 truncate">{r.task}</span>
              {r.repeat_rule ? <span className="text-xs faint shrink-0 inline-flex items-center gap-1" title={ruleBn(r.repeat_rule)}><Repeat size={13} /> <span className="hidden sm:inline">{ruleBn(r.repeat_rule)}</span></span> : null}
            </button>
          </li>
        ))}
      </ul>
      {edit && <ReminderForm row={edit} onClose={() => setEdit(null)} onDelete={remove} />}
    </>
  );
}
