"use client";
// রুটিন পেজের বদলানোর অংশ: ব্লক চাপলে ফর্ম খোলে (বদলাও/মুছো), নতুন ব্লক, আর পুরো পরিকল্পনা একসাথে মোছা
import { BellOff, CalendarDays, Copy, LayoutTemplate, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { DAY_BN, DAY_ORDER, bnDigits, daysBn, humanTime } from "@/lib/bn";
import type { RoutineBlock } from "@/lib/data";
import type { PlanDayStatus, PlanSummary } from "@/lib/plans";
import { TEMPLATES, type Template } from "@/lib/templates";
import Switch from "./Switch";
import { autoFocus, isFocus } from "@/lib/focus";

async function call(payload: Record<string, unknown>) {
  const r = await fetch("/api/routine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? "হলো না, আবার চেষ্টা করো");
}

function useAction(onDone?: () => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (payload: Record<string, unknown>) =>
    start(async () => {
      setError("");
      try {
        await call(payload);
        onDone?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "হলো না");
      }
    });
  return { pending, error, run };
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = overflow; };
  }, [onClose]);
  // body তে বসাই: কার্ডের animation (transform) এর ভেতরে থাকলে fixed শিট কার্ডেই আটকে যায়
  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost rounded-full" aria-label="বন্ধ করো"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// focus: null = নিজে থেকে (নাম দেখে), true/false = ইউজার সুইচ বদলেছে
type FormState = { title: string; kind: "date" | "weekly"; date: string; days: string[]; start_time: string; end_time: string; note: string; remind: boolean; focus: boolean | null };

function initial(b: RoutineBlock | undefined, today: string, kind: "date" | "weekly", presetDays?: string[]): FormState {
  if (!b) return { title: "", kind, date: today, days: presetDays?.length ? presetDays : [...DAY_ORDER], start_time: "20:00", end_time: "21:00", note: "", remind: true, focus: null };
  return {
    title: b.title, kind: b.date ? "date" : "weekly", date: b.date ?? today,
    days: b.date ? [...DAY_ORDER] : b.days === "daily" ? [...DAY_ORDER] : b.days.split(","),
    start_time: b.start_time, end_time: b.end_time ?? "", note: b.note ?? "", remind: Boolean(b.remind),
    focus: b.focus === 1 ? true : b.focus === 0 ? false : null,
  };
}

function BlockForm({ block, today, kind = "date", days, onClose }: { block?: RoutineBlock; today: string; kind?: "date" | "weekly"; days?: string[]; onClose: () => void }) {
  const [f, setF] = useState(() => initial(block, today, kind, days));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, error, run } = useAction(onClose);
  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));
  const toggleDay = (c: string) => setF((s) => ({ ...s, days: s.days.includes(c) ? s.days.filter((d) => d !== c) : [...s.days, c] }));
  const allDays = f.days.length === 7;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run({ action: block ? "update" : "add", id: block?.id, ...f });
  };

  return (
    <Sheet title={block ? "ব্লক বদলাও" : "নতুন ব্লক"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="label">কী করবে
          <input className="field" value={f.title} onChange={(e) => set({ title: e.target.value })} required maxLength={200}
            placeholder="যেমন: ভূগোল ২য় অধ্যায়: দিন ১" autoFocus={!block} />
        </label>

        <div>
          <span className="label mb-1.5">কখন</span>
          <div className="seg">
            <button type="button" aria-pressed={f.kind === "date"} onClick={() => set({ kind: "date" })}>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> নির্দিষ্ট তারিখে</span>
            </button>
            <button type="button" aria-pressed={f.kind === "weekly"} onClick={() => set({ kind: "weekly" })}>
              <span className="inline-flex items-center gap-1.5"><Repeat size={15} /> প্রতি সপ্তাহে</span>
            </button>
          </div>
        </div>

        {f.kind === "date" ? (
          <label className="label">তারিখ
            <input className="field" type="date" value={f.date} min={today} onChange={(e) => set({ date: e.target.value })} required />
          </label>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="label">কোন কোন দিন</span>
              <button type="button" className="link text-xs" onClick={() => set({ days: allDays ? [] : [...DAY_ORDER] })}>
                {allDays ? "সব বাদ" : "প্রতিদিন"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAY_ORDER.map((c) => (
                <button key={c} type="button" className="toggle" aria-pressed={f.days.includes(c)} onClick={() => toggleDay(c)}>{DAY_BN[c]}</button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="label">শুরু
            <input className="field" type="time" value={f.start_time} onChange={(e) => set({ start_time: e.target.value })} required />
          </label>
          <label className="label">শেষ <span className="font-normal muted">(ঐচ্ছিক)</span>
            <input className="field" type="time" value={f.end_time} onChange={(e) => set({ end_time: e.target.value })} />
          </label>
        </div>

        <label className="label">টিপস <span className="font-normal muted">(ঐচ্ছিক)</span>
          <textarea className="field" rows={2} value={f.note} onChange={(e) => set({ note: e.target.value })} maxLength={300}
            placeholder="যেমন: আগে ছবিগুলো দেখে নাও" />
        </label>

        <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: "var(--surface-2)" }}>
          <span className="text-sm">
            <span className="font-semibold block">🍅 Pomodoro তে ফোকাস</span>
            <span className="muted text-xs">
              {f.focus === null ? "নাম দেখে নিজে ঠিক হয়েছে · " : ""}{(f.focus ?? autoFocus(f.title, f.kind === "date")) ? "টাইমার চালানোর কাজ হয়ে যাবে" : "শুধু এখানে থাকবে, Pomodoro তে যাবে না"}
            </span>
          </span>
          <Switch on={f.focus ?? autoFocus(f.title, f.kind === "date")} onChange={(v) => set({ focus: v })} label="Pomodoro তে ফোকাস" />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: "var(--surface-2)" }}>
          <span className="text-sm">
            <span className="font-semibold block">শুরুর সময়ে মনে করাবে</span>
            <span className="muted text-xs">বট মেসেজ দেবে</span>
          </span>
          <Switch on={f.remind} onChange={(v) => set({ remind: v })} label="মনে করানো" />
        </div>

        {error && <p className="text-sm rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {block && (confirmDelete ? (
            <button type="button" disabled={pending} onClick={() => run({ action: "delete", id: block.id })} className="btn-danger">
              <Trash2 size={16} /> নিশ্চিত, মুছো
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost rounded-xl px-3" aria-label="ব্লকটা মুছো">
              <Trash2 size={18} />
            </button>
          ))}
          <button type="button" onClick={onClose} className="btn-outline ml-auto">থাক</button>
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "রাখছি…" : block ? "বদলাও" : "যোগ করো"}</button>
        </div>
        {block && <p className="text-xs muted">আজকের তালিকা আর Pomodoro তেও সাথে সাথে বদলে যাবে।</p>}
      </form>
    </Sheet>
  );
}

/** রুটিনের একটা ব্লক; চাপলে বদলানোর ফর্ম */
export function EditableBlock({ b, today }: { b: RoutineBlock; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} title="বদলাতে বা মুছতে চাপো"
        className="group w-full text-left rounded-xl px-3 py-2.5 transition-shadow hover:shadow-[0_0_0_1.5px_var(--brand)]"
        style={{ background: b.days === "daily" ? "var(--surface-2)" : "var(--brand-soft)" }}>
        <p className="text-xs num muted flex items-center gap-1">
          {humanTime(b.start_time)}{b.end_time ? ` – ${humanTime(b.end_time)}` : ""}
          {isFocus(b) && <span title="Pomodoro তে ফোকাসের কাজ" aria-label="Pomodoro তে ফোকাস">🍅</span>}
          {!b.remind && <BellOff size={12} aria-label="মনে করানো বন্ধ" />}
          <Pencil size={12} className="ml-auto opacity-40 group-hover:opacity-100" style={{ color: "var(--brand)" }} />
        </p>
        <p className="text-sm font-medium leading-snug mt-0.5">{b.title}</p>
        {b.note && <p className="text-xs muted mt-1">💡 {b.note}</p>}
      </button>
      {open && <BlockForm block={b} today={today} onClose={() => setOpen(false)} />}
    </li>
  );
}

export function NewBlockButton({ today, kind = "date", days, label = "নতুন ব্লক", className = "btn-primary" }: {
  today: string; kind?: "date" | "weekly"; days?: string[]; label?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><Plus size={18} /> {label}</button>
      {open && <BlockForm today={today} kind={kind} days={days} onClose={() => setOpen(false)} />}
    </>
  );
}

/** সাপ্তাহিক প্ল্যানার: একটা বারের রুটিন অন্য বারগুলোতেও (এক চাপে পুরো সপ্তাহ) */
export function CopyDayButton({ from, className = "btn-outline" }: { from: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const others = DAY_ORDER.filter((c) => c !== from);
  const [to, setTo] = useState<string[]>(others.filter((c) => c !== "FRI"));
  const { pending, error, run } = useAction(() => setOpen(false));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><Copy size={16} /> অন্য বারে কপি</button>
      {open && (
        <Sheet title={`${DAY_BN[from]}বারের রুটিন কপি`} onClose={() => setOpen(false)}>
          <p className="text-sm muted mb-3">{DAY_BN[from]}বারের সব ব্লক নিচের বারগুলোতেও চলবে (প্রতিদিনের ব্লক এমনিতেই সব দিনে থাকে)।</p>
          <div className="flex items-center justify-between mb-2">
            <span className="label">কোন কোন বারে</span>
            <button type="button" className="link text-xs" onClick={() => setTo(to.length === others.length ? [] : others)}>
              {to.length === others.length ? "সব বাদ" : "সব বার"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {others.map((c) => (
              <button key={c} type="button" className="toggle" aria-pressed={to.includes(c)}
                onClick={() => setTo((t) => (t.includes(c) ? t.filter((d) => d !== c) : [...t, c]))}>{DAY_BN[c]}</button>
            ))}
          </div>
          {error && <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
          <div className="flex items-center gap-2 mt-5">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline ml-auto">থাক</button>
            <button type="button" disabled={pending || !to.length} onClick={() => run({ action: "copy_day", from, to })} className="btn-primary">
              {pending ? "কপি হচ্ছে…" : `${to.length ? to.length.toLocaleString("bn-BD") : ""} বারে কপি করো`}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

const MONTHS_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলাই", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const DAY_TONE: Record<PlanDayStatus, { bg: string; fg: string; border: string; label: string }> = {
  done: { bg: "var(--ok)", fg: "#fff", border: "var(--ok)", label: "শেষ" },
  missed: { bg: "var(--danger-soft)", fg: "var(--danger)", border: "transparent", label: "মিস" },
  today: { bg: "var(--brand-soft)", fg: "var(--brand)", border: "var(--brand)", label: "আজ" },
  upcoming: { bg: "var(--surface-2)", fg: "var(--muted)", border: "transparent", label: "সামনে" },
};
const dm = (iso: string) => ({ d: Number(iso.slice(8)), m: Number(iso.slice(5, 7)) - 1 });

/** "১৩ – ১৬ নভে" বা মাস আলাদা হলে "২৯ অক্টো – ৩ নভে" */
function rangeBn(from: string, to: string): string {
  const a = dm(from), b = dm(to);
  return a.m === b.m ? `${bnDigits(a.d)} – ${bnDigits(b.d)} ${MONTHS_SHORT[b.m]}` : `${bnDigits(a.d)} ${MONTHS_SHORT[a.m]} – ${bnDigits(b.d)} ${MONTHS_SHORT[b.m]}`;
}

/** তারিখের পরিকল্পনা ("কার্ডিওলজি: দিন ১…৪"): কবে থেকে কবে, প্রতিটা দিনের অবস্থা, আর একসাথে মোছা */
export function PlanCard({ plan, today }: { plan: PlanSummary; today: string }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useAction(() => setConfirm(false));
  const total = plan.days.length;
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const next = !plan.next ? "সব দিন পেরিয়েছে" : plan.next === today ? "আজ পড়ার দিন" : plan.next === tomorrow ? "পরেরটা কাল" : `পরেরটা ${bnDigits(dm(plan.next).d)} ${MONTHS_SHORT[dm(plan.next).m]}`;
  return (
    <li className="card p-4 rise">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug break-words">{plan.name}</p>
          <p className="text-sm muted num mt-0.5">{rangeBn(plan.from, plan.to)} · {bnDigits(total)} দিন</p>
        </div>
        {confirm ? (
          <span className="flex items-center gap-1 shrink-0">
            <button type="button" disabled={pending} onClick={() => run({ action: "delete_plan", plan: plan.name })} className="btn-danger text-xs py-1.5 px-2.5 rounded-lg">সব মুছো</button>
            <button type="button" onClick={() => setConfirm(false)} className="btn-ghost rounded-lg" aria-label="থাক"><X size={15} /></button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="btn-ghost rounded-lg shrink-0 -mr-1 -mt-1" title="পুরো পরিকল্পনা মুছো" aria-label={`${plan.name} মুছো`}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <ol className="flex flex-wrap gap-1.5 mt-3" aria-label="প্রতিটা দিনের অবস্থা">
        {plan.days.map((d, i) => {
          const tone = DAY_TONE[d.status];
          return (
            <li key={d.date} title={`দিন ${i + 1} · ${tone.label}`}
              className="w-9 rounded-lg py-1 text-center leading-none num"
              style={{ background: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1.5px ${tone.border}` }}>
              <span className="block text-[13px] font-semibold">{bnDigits(dm(d.date).d)}</span>
              <span className="block text-[9px] mt-0.5 opacity-80">{MONTHS_SHORT[dm(d.date).m]}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3 mt-3">
        <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round((plan.done / total) * 100)}%`, background: "var(--ok)" }} />
        </div>
        <span className="text-xs muted num shrink-0">{bnDigits(plan.done)}/{bnDigits(total)} দিন শেষ · {next}</span>
      </div>
      {error && <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
    </li>
  );
}

/** "আজ ছুটি": সেই দিনে সাপ্তাহিক রুটিন বন্ধ (মনে করানো, ✅ খোঁজ, Pomodoro র কাজ)। তারিখের পড়ার পরিকল্পনা চলে। */
export function DayOff({ off, today }: { off: boolean; today: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const { pending, error, run } = useAction(() => setOpen(false));
  if (off) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3.5 py-3 mb-3" style={{ background: "var(--accent-soft)" }}>
        <span className="text-xl" aria-hidden>🌴</span>
        <p className="flex-1 min-w-0 text-sm"><b>আজ ছুটি।</b> <span className="muted">সাপ্তাহিক রুটিন বন্ধ, কাল থেকে আবার চলবে।</span></p>
        <button type="button" disabled={pending} onClick={() => run({ action: "day_off", date: today, off: false })} className="btn-outline text-sm py-1.5 px-3 shrink-0">
          ছুটি বাতিল
        </button>
      </div>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-sm rounded-lg px-2.5 py-1.5" title="এক দিনের জন্য সাপ্তাহিক রুটিন বন্ধ">
        🌴 ছুটি
      </button>
      {open && (
        <Sheet title="ছুটির দিন" onClose={() => setOpen(false)}>
          <p className="text-sm muted mb-4">
            সেদিন সাপ্তাহিক রুটিনের মনে করানো, শেষের ✅ খোঁজ আর Pomodoro র কাজ বন্ধ থাকবে; পরদিন থেকে আবার চলবে।
            তারিখের পড়ার পরিকল্পনা (যেমন &ldquo;দিন ৩&rdquo;) থামবে না।
          </p>
          <label className="label">কোন দিন
            <input className="field" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          {error && <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
          <div className="flex items-center gap-2 mt-5">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline ml-auto">থাক</button>
            <button type="button" disabled={pending} onClick={() => run({ action: "day_off", date, off: true })} className="btn-primary">
              🌴 {date === today ? "আজ ছুটি" : "ছুটি দাও"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** তৈরি টেমপ্লেট থেকে সাপ্তাহিক রুটিন: বেছে নাও → পুরো সপ্তাহ দেখো → আগেরটার জায়গায় বা পাশে রাখো */
export function TemplatePicker({ hasWeekly, className = "btn-outline" }: { hasWeekly: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Template | null>(null);
  const [mode, setMode] = useState<"replace" | "add">(hasWeekly ? "replace" : "add");
  const { pending, error, run } = useAction(() => { setOpen(false); setPick(null); });
  const close = () => { setOpen(false); setPick(null); };
  // একই বারের ব্লকগুলো একসাথে: "শনি–বৃহস্পতি", "প্রতিদিন", "শুক্র"
  const groups = pick ? [...pick.blocks.reduce((m, b) => m.set(b.days, [...(m.get(b.days) ?? []), b]), new Map<string, Template["blocks"]>())] : [];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><LayoutTemplate size={16} /> টেমপ্লেট</button>
      {open && (
        <Sheet title={pick ? `${pick.emoji} ${pick.name}` : "তৈরি সাপ্তাহিক রুটিন"} onClose={close}>
          {!pick ? (
            <>
              <p className="text-sm muted mb-3">একটা বেছে নাও, পরে যেকোনো ব্লকের সময় বা নাম বদলাতে পারবে।</p>
              <ul className="space-y-2">
                {TEMPLATES.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setPick(t)}
                      className="w-full text-left rounded-xl p-3.5 flex gap-3 items-start transition-colors hover:bg-[var(--brand-soft)]" style={{ background: "var(--surface-2)" }}>
                      <span className="text-2xl leading-none" aria-hidden>{t.emoji}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{t.name} <span className="muted font-normal text-xs num">· {bnDigits(t.blocks.length)}টা ব্লক</span></span>
                        <span className="block text-sm muted mt-0.5">{t.desc}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="space-y-3 max-h-[45dvh] overflow-y-auto pr-1">
                {groups.map(([days, rows]) => (
                  <div key={days}>
                    <p className="eyebrow mb-1">{daysBn(days)}</p>
                    <ul className="space-y-1">
                      {rows.sort((a, b) => a.start.localeCompare(b.start)).map((b) => (
                        <li key={b.title + b.start} className="flex gap-3 text-sm rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
                          <span className="num muted shrink-0 w-[7.5rem]">{humanTime(b.start)}{b.end ? `–${humanTime(b.end).split(" ")[1]}` : ""}</span>
                          <span className="font-medium">{b.title}{b.focus ? " 🍅" : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {hasWeekly && (
                <div className="seg mt-4">
                  <button type="button" aria-pressed={mode === "replace"} onClick={() => setMode("replace")}>আগেরটার জায়গায়</button>
                  <button type="button" aria-pressed={mode === "add"} onClick={() => setMode("add")}>পাশে যোগ</button>
                </div>
              )}
              <p className="text-xs muted mt-2">
                {hasWeekly && mode === "replace" ? "আগের সাপ্তাহিক রুটিন সরে যাবে; তারিখের পড়ার পরিকল্পনা থাকবে।" : "আগের রুটিন থাকবে, একই ব্লক দুবার বসবে না।"}
                {" "}🍅 = Pomodoro তে ফোকাসের কাজ।
              </p>
              {error && <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
              <div className="flex items-center gap-2 mt-4">
                <button type="button" onClick={() => setPick(null)} className="btn-ghost rounded-xl px-3">← অন্যটা</button>
                <button type="button" disabled={pending} onClick={() => run({ action: "apply_template", id: pick.id, mode })} className="btn-primary ml-auto">
                  {pending ? "রাখছি…" : "এই রুটিন রাখো"}
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
