"use client";
// "পরিকল্পনা" ভিউ: আগে plan, তার অধীনে দিন ধরে পড়া। প্রতিটা plan এর অগ্রগতি, অধ্যায়ের তালিকা (শেষ/মিস/আজ/সামনে),
// এক চাপে পিছিয়ে দেওয়া, অধ্যায় অদলবদল/বদলানো, আর পোর্টাল থেকেই নতুন plan (বই বাছলে অধ্যায় নিজে বসে)।
import { ArrowDown, ArrowUp, BookOpen, CalendarClock, Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { bnDigits, humanTime } from "@/lib/bn";
import { BOOKS } from "@/lib/books";
import { buildExamPlan, groupDays } from "@/lib/examPlan";
import { daysLeft, type PlanDay, type PlanSummary } from "@/lib/plans";
import type { RoutineBlock } from "@/lib/data";
import { BlockForm, Sheet, call } from "./RoutineEditor";

const MONTHS = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলাই", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const dm = (iso: string) => `${bnDigits(Number(iso.slice(8)))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const range = (a: string, b: string) => (a === b ? dm(a) : a.slice(0, 7) === b.slice(0, 7) ? `${bnDigits(Number(a.slice(8)))}–${dm(b)}` : `${dm(a)} – ${dm(b)}`);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const STATUS = {
  done: { icon: <Check size={13} strokeWidth={3} />, bg: "var(--ok)", fg: "#fff", label: "শেষ" },
  missed: { icon: <X size={13} strokeWidth={3} />, bg: "var(--danger-soft)", fg: "var(--danger)", label: "মিস" },
  today: { icon: <span className="size-2 rounded-full" style={{ background: "currentColor" }} />, bg: "var(--brand)", fg: "var(--brand-ink)", label: "আজ" },
  upcoming: { icon: null, bg: "var(--surface-2)", fg: "var(--muted)", label: "সামনে" },
};

function useApi() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (payload: Record<string, unknown>, after?: () => void) => start(async () => {
    setError("");
    try { await call(payload); after?.(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "হলো না"); }
  });
  return { pending, error, run };
}

function DayRow({ d, i, today, prev, next }: { d: PlanDay; i: number; today: string; prev?: PlanDay; next?: PlanDay }) {
  const [edit, setEdit] = useState(false);
  const { pending, run } = useApi();
  const s = STATUS[d.status];
  const movable = (x?: PlanDay) => x && x.date >= today && x.status !== "done";
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="num text-xs muted w-14 shrink-0 text-right">{dm(d.date)}</span>
      <span className="size-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: s.bg, color: s.fg }} title={s.label}>{s.icon}</span>
      <button type="button" onClick={() => setEdit(true)} title="বদলাতে চাপো"
        className={`flex-1 min-w-0 text-left text-[15px] leading-snug truncate hover:underline ${d.status === "done" ? "faint" : d.status === "today" ? "font-semibold" : ""}`}>
        <span className="muted text-xs mr-1.5 num">দিন {bnDigits(i + 1)}</span>{d.topic}
      </button>
      {movable(d) && (
        <span className="flex shrink-0">
          <button type="button" disabled={pending || !movable(prev)} onClick={() => prev && run({ action: "swap_days", a: d.block.id, b: prev.block.id })}
            className="btn-ghost rounded-lg !p-1 disabled:opacity-20" aria-label="আগের দিনের সাথে অদলবদল"><ArrowUp size={15} /></button>
          <button type="button" disabled={pending || !movable(next)} onClick={() => next && run({ action: "swap_days", a: d.block.id, b: next.block.id })}
            className="btn-ghost rounded-lg !p-1 disabled:opacity-20" aria-label="পরের দিনের সাথে অদলবদল"><ArrowDown size={15} /></button>
        </span>
      )}
      {edit && <BlockForm block={d.block as unknown as RoutineBlock} today={today} onClose={() => setEdit(false)} />}
    </li>
  );
}

/** একটা plan এর বিস্তারিত */
export function PlanDetail({ plan, today }: { plan: PlanSummary; today: string }) {
  const [all, setAll] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useApi();
  const total = plan.days.length;
  const pct = Math.round((plan.done / total) * 100);
  const target = plan.examDate ?? plan.to;
  const left = daysLeft(target, today);
  const missed = plan.days.filter((d) => d.status === "missed").length;
  // লম্বা তালিকায় শুরুতে: মিস হওয়া, আজ আর সামনের ৭ দিন
  const firstOpen = Math.max(0, plan.days.findIndex((d) => d.date >= today) - 2);
  const shown = all ? plan.days : plan.days.slice(firstOpen, firstOpen + 9);
  const blocks = plan.days[0]?.block;
  return (
    <li className="card card-pad rise">
      <div className="flex items-start gap-3">
        <span className="icon-badge size-10 rounded-xl"><BookOpen size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-lg leading-tight break-words">{plan.name}</h3>
          <p className="text-sm muted mt-0.5">
            {plan.book ? `${plan.book} · ` : ""}{range(plan.from, plan.to)}
            {blocks ? ` · ${humanTime(blocks.start_time)}${blocks.end_time ? `–${humanTime(blocks.end_time)}` : ""}` : ""}
          </p>
        </div>
        {confirm ? (
          <span className="flex items-center gap-1 shrink-0">
            <button type="button" disabled={pending} onClick={() => run(plan.id ? { action: "delete_plan", plan_id: plan.id } : { action: "delete_plan", plan: plan.name })}
              className="btn-danger text-xs py-1.5 px-2.5 rounded-lg">পুরো plan মুছো</button>
            <button type="button" onClick={() => setConfirm(false)} className="btn-ghost rounded-lg" aria-label="থাক"><X size={15} /></button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="btn-ghost rounded-lg shrink-0" aria-label="পরিকল্পনা মুছো"><Trash2 size={16} /></button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="rounded-xl py-2" style={{ background: "var(--surface-2)" }}>
          <p className="num text-xl font-bold">{bnDigits(plan.done)}/{bnDigits(total)}</p><p className="text-[11px] muted">দিন শেষ</p>
        </div>
        <div className="rounded-xl py-2" style={{ background: missed ? "var(--danger-soft)" : "var(--surface-2)" }}>
          <p className="num text-xl font-bold" style={{ color: missed ? "var(--danger)" : undefined }}>{bnDigits(missed)}</p><p className="text-[11px] muted">মিস</p>
        </div>
        <div className="rounded-xl py-2" style={{ background: "var(--brand-soft)" }}>
          <p className="num text-xl font-bold" style={{ color: "var(--brand)" }}>{left > 0 ? bnDigits(left) : "০"}</p>
          <p className="text-[11px] muted">{plan.examDate ? "দিন পরে পরীক্ষা" : "দিন বাকি"}</p>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden mt-3" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--ok)" }} />
      </div>

      <ol className="mt-4">
        {shown.map((d) => {
          const i = plan.days.indexOf(d);
          return <DayRow key={d.block.id} d={d} i={i} today={today} prev={plan.days[i - 1]} next={plan.days[i + 1]} />;
        })}
      </ol>
      {plan.days.length > shown.length && (
        <button type="button" onClick={() => setAll(true)} className="link text-sm mt-2"><ChevronDown size={15} /> সব {bnDigits(total)} দিন দেখাও</button>
      )}

      {error && <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
      {plan.id && !plan.finished && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
          <button type="button" disabled={pending} onClick={() => run({ action: "shift_plan", plan_id: plan.id, days: 1 })} className="btn-outline py-2 text-sm">
            <CalendarClock size={16} /> আজ থেকে একদিন পিছিয়ে দাও
          </button>
          <span className="text-xs muted self-center">শেষ হবে {dm(addDays(plan.to, 1))} এ</span>
        </div>
      )}
    </li>
  );
}

/** শেষ হওয়া plan: কত দিন মেনে চলা হলো */
export function FinishedPlan({ plan }: { plan: PlanSummary }) {
  const total = plan.days.length;
  const pct = Math.round((plan.done / total) * 100);
  return (
    <li className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "var(--surface-2)" }}>
      <span className="text-xl" aria-hidden>{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📘"}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold truncate">{plan.name}</span>
        <span className="block text-xs muted num">{range(plan.from, plan.to)} · {bnDigits(plan.done)}/{bnDigits(total)} দিন ({bnDigits(pct)}%)</span>
      </span>
    </li>
  );
}

/** নতুন plan: নাম, বই (অধ্যায় নিজে বসে), শুরু, শেষ (পরীক্ষার তারিখ বা কত দিনে), সময়, রিভিশন → দেখে তারপর রাখা */
export function NewPlanButton({ today, className = "btn-primary" }: { today: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [book, setBook] = useState("");
  const [topics, setTopics] = useState("");
  // আজকের পড়ার সময় পেরিয়ে গেলে কাল থেকে (নইলে প্রথম দিনই "মিস")
  const nowHM = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(11, 16);
  const [start, setStart] = useState(() => (nowHM() >= "21:00" ? addDays(today, 1) : today));
  const [mode, setMode] = useState<"days" | "exam">("days");
  const [daysN, setDaysN] = useState(30);
  const [exam, setExam] = useState(addDays(today, 30));
  const [st, setSt] = useState("21:00");
  const [et, setEt] = useState("23:00");
  const [rev, setRev] = useState(2);
  const { pending, error, run } = useApi();

  const examDate = mode === "days" ? addDays(start, Math.max(1, daysN)) : exam;
  const preview = useMemo(() => buildExamPlan(name || "পড়া", topics.split(/\n|,|;/), examDate, start, rev), [name, topics, examDate, start, rev]);
  const pickBook = (id: string) => {
    setBook(id);
    const b = BOOKS.find((x) => x.id === id);
    if (b) { setTopics(b.chapters.join("\n")); if (!name) setName(b.subject); }
  };
  const save = () => run({
    action: "create_plan", name, book: BOOKS.find((b) => b.id === book)?.name ?? "", topics, start_date: start, exam_date: examDate, is_exam: mode === "exam",
    start_time: st, end_time: et, revision_days: rev,
  }, () => setOpen(false));
  const count = topics.split(/\n|,|;/).filter((t) => t.trim()).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><Plus size={18} /> নতুন পরিকল্পনা</button>
      {open && (
        <Sheet title="নতুন পড়ার পরিকল্পনা" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <label className="label">বই <span className="font-normal muted">(বাছলে অধ্যায় নিজে বসবে)</span>
              <select className="field" value={book} onChange={(e) => pickBook(e.target.value)}>
                <option value="">নিজে অধ্যায় লিখব</option>
                {BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="label">পরিকল্পনার নাম
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: মেডিসিন, ফিজিক্স ১ম পত্র" maxLength={80} />
            </label>
            <label className="label">অধ্যায় <span className="font-normal muted num">· প্রতি লাইনে একটা{count ? ` · ${bnDigits(count)}টা` : ""}</span>
              <textarea className="field" rows={5} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={"Cardiology\nRespiratory\nGIT"} />
            </label>
            <div>
              <span className="label mb-1.5">কবে শেষ</span>
              <div className="seg">
                <button type="button" aria-pressed={mode === "days"} onClick={() => setMode("days")}>কত দিনে</button>
                <button type="button" aria-pressed={mode === "exam"} onClick={() => setMode("exam")}>পরীক্ষার তারিখ</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">শুরু
                <input className="field" type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
              </label>
              {mode === "days" ? (
                <label className="label">কত দিনে
                  <input className="field num" type="number" min={2} max={180} value={daysN} onChange={(e) => setDaysN(Number(e.target.value) || 0)} />
                </label>
              ) : (
                <label className="label">পরীক্ষা
                  <input className="field" type="date" value={exam} min={addDays(start, 1)} onChange={(e) => setExam(e.target.value)} />
                </label>
              )}
              <label className="label">পড়া শুরু
                <input className="field" type="time" value={st} onChange={(e) => setSt(e.target.value)} />
              </label>
              <label className="label">শেষ
                <input className="field" type="time" value={et} onChange={(e) => setEt(e.target.value)} />
              </label>
            </div>
            <label className="label">শেষে রিভিশনের দিন
              <input className="field num" type="number" min={0} max={14} value={rev} onChange={(e) => setRev(Math.max(0, Number(e.target.value) || 0))} />
            </label>

            {preview.ok && count > 0 && (
              <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs muted mb-2 num">{bnDigits(preview.studyDays)} দিন পড়া + {bnDigits(preview.revision)} দিন রিভিশন · প্রতিদিন {humanTime(st)}–{humanTime(et)}</p>
                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1 text-sm">
                  {groupDays(preview.days).map((g) => (
                    <li key={g.from} className="flex gap-3"><span className="num muted w-24 shrink-0">{range(g.from, g.to)}</span><span className="font-medium">{g.topic}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {!preview.ok && count > 0 && <p className="text-sm" style={{ color: "var(--danger)" }}>{preview.error}</p>}
            {error && <p className="text-sm rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-outline ml-auto">থাক</button>
              <button type="button" disabled={pending || !preview.ok || !count || !name.trim()} onClick={save} className="btn-primary">
                {pending ? "রাখছি…" : "পরিকল্পনা রাখো"}
              </button>
            </div>
            <p className="text-xs muted">প্রতিটা দিন রুটিনে নিজের তারিখে বসবে, শুরুতে মনে করাবে, শেষে ✅ চাইবে, আর Pomodoro তে যাবে।</p>
          </div>
        </Sheet>
      )}
    </>
  );
}
