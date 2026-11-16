"use client";
// স্বাস্থ্যের পাতায় লেখা/বাদ: মাপ যোগ, ভুল মাপ মোছা, ওষুধ যোগ/বন্ধ, আজকের মন
import { Pill, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

async function call(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; red?: boolean }> {
  try {
    const r = await fetch("/api/health-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await r.json();
  } catch { return { ok: false, error: "নেট নেই, আবার চেষ্টা করো" }; }
}

const METRICS: [string, string][] = [["bp", "🫀 প্রেশার"], ["sugar", "🩸 সুগার"], ["weight", "⚖️ ওজন"], ["sleep", "😴 ঘুম"], ["water", "💧 পানি"], ["symptom", "🤒 উপসর্গ"]];
const UNITS: Record<string, string[]> = { sugar: ["mmol/L", "mg/dL"], weight: ["কেজি"], sleep: ["ঘণ্টা"], water: ["গ্লাস", "লিটার"] };
const MOODS = ["😞", "🙁", "😐", "🙂", "😄"];

/** মাপ যোগ করার ফর্ম + আজকের মন */
export function AddLog() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [metric, setMetric] = useState("bp");
  const [v, setV] = useState({ sys: "", dia: "", value: "", unit: "", text: "", note: "", at: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await call({ action: "log", metric, ...v, unit: v.unit || UNITS[metric]?.[0] || "" });
      if (r.ok) {
        setV({ sys: "", dia: "", value: "", unit: v.unit, text: "", note: "", at: "" });
        setMsg({ ok: true, text: r.red ? "⚠️ সেভ হলো। প্রেশার অনেক বেশি: ৫ মিনিট বসে আবার মাপো, আর আজই ডাক্তার দেখাও।" : "✅ সেভ হলো" });
        router.refresh();
      } else setMsg({ ok: false, text: r.error || "সেভ হয়নি" });
    });
  };

  const mood = (score: number) => start(async () => {
    const r = await call({ action: "mood", score });
    setMsg(r.ok ? { ok: true, text: `✅ আজকের মন ${MOODS[score - 1]} লেখা হলো` } : { ok: false, text: r.error || "সেভ হয়নি" });
    if (r.ok) router.refresh();
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRICS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setMetric(k); setMsg(null); setV({ ...v, unit: "" }); }}
            className={`chip ${metric === k ? "chip-accent" : "chip-muted"}`} style={{ cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        {metric === "bp" ? (
          <>
            <label className="text-xs muted">উপরেরটা<input className="field field-sm num w-24" inputMode="numeric" placeholder="120" value={v.sys} onChange={(e) => setV({ ...v, sys: e.target.value })} required /></label>
            <span className="pb-2">/</span>
            <label className="text-xs muted">নিচেরটা<input className="field field-sm num w-24" inputMode="numeric" placeholder="80" value={v.dia} onChange={(e) => setV({ ...v, dia: e.target.value })} required /></label>
          </>
        ) : metric === "symptom" ? (
          <label className="text-xs muted flex-1 min-w-[220px]">কী হচ্ছে<input className="field field-sm" placeholder="যেমন: মাথাব্যথা, সকাল থেকে" value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} required /></label>
        ) : (
          <>
            <label className="text-xs muted">মান<input className="field field-sm num w-28" inputMode="decimal" value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} required /></label>
            {UNITS[metric].length > 1 ? (
              <select className="field field-sm" value={v.unit || UNITS[metric][0]} onChange={(e) => setV({ ...v, unit: e.target.value })}>
                {UNITS[metric].map((u) => <option key={u}>{u}</option>)}
              </select>
            ) : <span className="pb-2 text-sm muted">{UNITS[metric][0]}</span>}
          </>
        )}
        <label className="text-xs muted">কখন (ফাঁকা = এখন)<input type="datetime-local" className="field field-sm" value={v.at} onChange={(e) => setV({ ...v, at: e.target.value })} /></label>
        <button type="submit" disabled={pending} className="btn-primary"><Plus size={16} /> যোগ করো</button>
      </form>
      <div className="flex items-center gap-2 pt-1">
        <span className="text-sm font-medium">আজ মন কেমন?</span>
        {MOODS.map((m, i) => (
          <button key={m} type="button" disabled={pending} onClick={() => mood(i + 1)} aria-label={`মন ${i + 1}`}
            className="text-2xl rounded-xl px-1.5 transition-transform hover:scale-110">{m}</button>
        ))}
      </div>
      {msg && <p className="text-sm" style={{ color: msg.ok ? undefined : "var(--danger)" }}>{msg.text}</p>}
    </div>
  );
}

/** শেষ মাপগুলো, পাশে মোছার বোতাম */
export function RecentLogs({ items }: { items: { id: number; label: string; time: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const del = (id: number) => {
    if (!confirm("এই মাপটা মুছে ফেলবো?")) return;
    start(async () => { await call({ action: "delete_log", id }); router.refresh(); });
  };
  if (!items.length) return <p className="text-sm muted">এখনো কিছু লেখা হয়নি।</p>;
  return (
    <ul className="divide-y divide-[var(--line)]">
      {items.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
          <span className="min-w-0"><span className="font-medium">{l.label}</span><span className="block text-xs muted">{l.time}</span></span>
          <button onClick={() => del(l.id)} disabled={pending} className="btn-ghost rounded-lg" aria-label="মুছে ফেলো" title="মুছে ফেলো"><Trash2 size={16} /></button>
        </li>
      ))}
    </ul>
  );
}

/** চালু ওষুধ: যোগ, বন্ধ। সময় দিলে বট প্রতিদিন মনে করায় */
export function MedsEditor({ meds }: { meds: { id: number; name: string; dose: string | null; times: string | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", dose: "", times: ["08:00"] as string[] });
  const [err, setErr] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await call({ action: "med_add", ...f, times: f.times.filter(Boolean) });
      if (r.ok) { setF({ name: "", dose: "", times: ["08:00"] }); setOpen(false); setErr(""); router.refresh(); }
      else setErr(r.error || "সেভ হয়নি");
    });
  };
  const stop = (id: number, name: string) => {
    if (!confirm(`${name} বন্ধ করবো? এর রিমাইন্ডারও বন্ধ হবে।`)) return;
    start(async () => { await call({ action: "med_stop", id }); router.refresh(); });
  };

  return (
    <div className="space-y-3">
      {meds.length === 0 && !open && <p className="text-sm muted">কোনো চালু ওষুধ নেই।</p>}
      <ul className="space-y-3">
        {meds.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-3">
            <span><b>{m.name}</b>{m.dose && <span className="muted"> · {m.dose}</span>}
              {m.times && <span className="block text-xs muted num">{m.times.split(",").join(", ")}</span>}</span>
            <button onClick={() => stop(m.id, m.name)} disabled={pending} className="btn-ghost rounded-lg text-xs" title="বন্ধ করো"><X size={16} /> বন্ধ</button>
          </li>
        ))}
      </ul>
      {open ? (
        <form onSubmit={add} className="space-y-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input className="field field-sm" placeholder="ওষুধের নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            <input className="field field-sm" placeholder="ডোজ (যেমন ১টা)" value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs muted">খাওয়ার সময়:</span>
            {f.times.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                <input type="time" className="field field-sm num" value={t} onChange={(e) => setF({ ...f, times: f.times.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button type="button" className="btn-ghost rounded-lg" aria-label="সময় বাদ" onClick={() => setF({ ...f, times: f.times.filter((_, j) => j !== i) })}><X size={14} /></button>
              </span>
            ))}
            <button type="button" className="chip chip-muted" style={{ cursor: "pointer" }} onClick={() => setF({ ...f, times: [...f.times, "21:00"] })}>+ সময়</button>
          </div>
          {err && <p className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary">সেভ</button>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>বাতিল</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-outline"><Pill size={16} /> ওষুধ যোগ করো</button>
      )}
    </div>
  );
}
