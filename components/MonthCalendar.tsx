// রুটিনের মাসের ক্যালেন্ডার: প্রতিটা দিনে কোন ব্লক, শেষ (সবুজ) / মিস (লাল) / বাকি; দিন চাপলে নিচে বিস্তারিত
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DAY_BN, DAY_ORDER, bnDigits, fullDateBn, humanTime } from "@/lib/bn";
import { shiftMonth, type CalCell, type CalStatus } from "@/lib/calendar";

const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const TONE: Record<CalStatus, { dot: string; bg: string; label: string }> = {
  done: { dot: "var(--ok)", bg: "color-mix(in srgb, var(--ok) 14%, transparent)", label: "শেষ" },
  missed: { dot: "var(--danger)", bg: "var(--danger-soft)", label: "মিস" },
  today: { dot: "var(--brand)", bg: "var(--brand-soft)", label: "আজ" },
  upcoming: { dot: "var(--faint)", bg: "var(--surface-2)", label: "সামনে" },
  past: { dot: "var(--line)", bg: "var(--surface-2)", label: "" },
};

const href = (m: string, d?: string) => `/routine?view=month&m=${m}${d ? `&d=${d}` : ""}`;

export default function MonthCalendar({ month, weeks, selected }: { month: string; weeks: CalCell[][]; selected: string | null }) {
  const [y, mo] = month.split("-").map(Number);
  const cells = weeks.flat();
  const sel = cells.find((c) => c.date === selected) ?? cells.find((c) => c.isToday && c.inMonth) ?? null;
  const inMonth = cells.filter((c) => c.inMonth);
  const count = (s: CalStatus) => inMonth.reduce((n, c) => n + c.items.filter((i) => i.status === s).length, 0);

  return (
    <div className="space-y-4">
      <section className="card p-3 sm:p-5 rise">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Link href={href(shiftMonth(month, -1))} className="btn-ghost rounded-full" aria-label="আগের মাস"><ChevronLeft size={20} /></Link>
          <h2 className="font-bold text-lg">{MONTHS[mo - 1]} {bnDigits(y)}</h2>
          <Link href={href(shiftMonth(month, 1))} className="btn-ghost rounded-full" aria-label="পরের মাস"><ChevronRight size={20} /></Link>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {DAY_ORDER.map((c) => <div key={c} className="eyebrow pb-1">{DAY_BN[c]}</div>)}
          {cells.map((c) => {
            const isSel = sel?.date === c.date;
            return (
              <Link key={c.date} href={href(month, c.date)} scroll={false} aria-label={`${c.date}: ${c.items.length}টা`}
                className="rounded-xl p-1 sm:p-1.5 min-h-[52px] sm:min-h-[92px] text-left flex flex-col transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  opacity: c.inMonth ? 1 : 0.4,
                  border: `1.5px solid ${isSel ? "var(--brand)" : c.isToday ? "color-mix(in srgb, var(--brand) 45%, transparent)" : "transparent"}`,
                  background: isSel ? "var(--brand-soft)" : undefined,
                }}>
                <span className={`num text-xs sm:text-sm text-center sm:text-left ${c.isToday ? "font-bold" : "font-medium"}`}
                  style={{ color: c.isToday ? "var(--brand)" : undefined }}>{bnDigits(c.day)}{c.off ? " 🌴" : ""}</span>
                {/* ফোনে বিন্দু, বড় পর্দায় নাম */}
                <span className="flex flex-wrap justify-center gap-[3px] mt-1 sm:hidden">
                  {c.items.slice(0, 4).map((i) => <span key={i.id} className="size-[6px] rounded-full" style={{ background: TONE[i.status].dot }} />)}
                </span>
                <span className="hidden sm:flex flex-col gap-0.5 mt-1 min-w-0">
                  {c.items.slice(0, 2).map((i) => (
                    <span key={i.id} className="text-[11px] leading-tight truncate rounded px-1 py-0.5" style={{ background: TONE[i.status].bg }} title={i.title}>
                      {i.title}
                    </span>
                  ))}
                  {c.items.length > 2 && <span className="text-[10px] faint px-1">+{bnDigits(c.items.length - 2)}টা</span>}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs muted">
          {(["done", "missed", "upcoming"] as CalStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: TONE[s].dot }} />{TONE[s].label}</span>
          ))}
          <span className="ml-auto num">এই মাসে {bnDigits(count("done"))}টা শেষ · {bnDigits(count("missed"))}টা মিস</span>
        </div>
      </section>

      {sel && (
        <section className="card card-pad rise">
          <h3 className="font-semibold mb-3">{fullDateBn(new Date(`${sel.date}T00:00:00`))}{sel.off ? " · 🌴 ছুটি (সাপ্তাহিক রুটিন বন্ধ)" : ""}</h3>
          {sel.items.length === 0 ? <p className="text-sm muted">এই দিনে কিছু নেই।</p> : (
            <ul className="space-y-2">
              {sel.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: TONE[i.status].bg }}>
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: TONE[i.status].dot }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs num muted">{i.kind === "task" ? "কাজ" : <>{humanTime(i.start_time)}{i.end_time ? ` – ${humanTime(i.end_time)}` : ""}{i.dated ? "" : " · প্রতি সপ্তাহে"}</>}</span>
                    <span className="block text-sm font-medium">{i.title}</span>
                  </span>
                  {TONE[i.status].label && <span className="chip chip-muted text-xs shrink-0">{TONE[i.status].label}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
