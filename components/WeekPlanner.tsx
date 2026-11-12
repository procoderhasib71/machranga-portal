// সাপ্তাহিক প্ল্যানার: একবার সাজালে প্রতি সপ্তাহে নিজে চলে। ফোনে বারের ট্যাব + সেই বারের সময়রেখা, কম্পিউটারে সাত দিন পাশাপাশি।
// প্রতিটা বারে "+" (সেই বার বাছা থাকে) আর "অন্য বারে কপি"।
import Link from "next/link";
import { DAY_BN, DAY_ORDER, bnDigits } from "@/lib/bn";
import type { RoutineBlock } from "@/lib/data";
import { CopyDayButton, EditableBlock, NewBlockButton } from "./RoutineEditor";

const on = (b: RoutineBlock, code: string) => b.days === "daily" || b.days.split(",").includes(code);

function DayList({ code, blocks, today }: { code: string; blocks: RoutineBlock[]; today: string }) {
  const rows = blocks.filter((b) => on(b, code)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  return rows.length ? (
    <ul className="space-y-2">{rows.map((b) => <EditableBlock key={b.id} b={b} today={today} />)}</ul>
  ) : (
    <p className="text-sm muted py-3 text-center">এই বারে কিছু নেই</p>
  );
}

export default function WeekPlanner({ blocks, today, todayCode, selected }: { blocks: RoutineBlock[]; today: string; todayCode: string; selected: string }) {
  const count = (code: string) => blocks.filter((b) => on(b, code)).length;
  return (
    <div className="space-y-4">
      <p className="text-sm muted -mt-2">
        একবার সাজিয়ে রাখলে প্রতি সপ্তাহে নিজে চলে: সকালে আজকের প্ল্যান, শুরুতে মনে করানো, শেষে ✅, আর Pomodoro তে কাজ।
        একটা বার সাজিয়ে &ldquo;অন্য বারে কপি&rdquo; চাপলেই পুরো সপ্তাহ।
      </p>

      {/* ফোন/ট্যাবলেট: বারের ট্যাব আর বাছা বারের তালিকা */}
      <div className="lg:hidden space-y-3">
        <nav className="grid grid-cols-7 gap-1" aria-label="বার">
          {DAY_ORDER.map((c) => {
            const active = c === selected;
            return (
              <Link key={c} href={`/routine?view=week&day=${c}`} scroll={false} aria-current={active ? "page" : undefined}
                className="rounded-xl py-2 text-center text-xs font-semibold transition-colors"
                style={active ? { background: "var(--brand)", color: "var(--brand-ink)" } : { background: "var(--surface-2)", color: c === todayCode ? "var(--brand)" : "var(--muted)" }}>
                {DAY_BN[c]}
                <span className="block text-[10px] font-medium num opacity-80 mt-0.5">{count(c) ? `${bnDigits(count(c))}টা` : "—"}</span>
              </Link>
            );
          })}
        </nav>
        <section className="card card-pad rise">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {DAY_BN[selected]}বার {selected === todayCode && <span className="chip text-xs">আজ</span>}
            </h2>
          </div>
          <DayList code={selected} blocks={blocks} today={today} />
          <div className="flex gap-2 mt-4">
            <NewBlockButton today={today} kind="weekly" days={[selected]} label="এই বারে যোগ" className="btn-primary flex-1 py-2.5" />
            <CopyDayButton from={selected} className="btn-outline flex-1 py-2.5" />
          </div>
        </section>
      </div>

      {/* কম্পিউটার: সাত দিন পাশাপাশি */}
      <div className="hidden lg:grid grid-cols-7 gap-3">
        {DAY_ORDER.map((c, i) => (
          <section key={c} className="card p-3 rise flex flex-col" style={{ animationDelay: `${i * 30}ms`, ...(c === todayCode ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand)" } : {}) }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center justify-between">
              {DAY_BN[c]}বার
              {c === todayCode && <span className="chip text-[11px] py-0">আজ</span>}
            </h2>
            <div className="flex-1"><DayList code={c} blocks={blocks} today={today} /></div>
            <div className="flex gap-1 mt-3 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
              <NewBlockButton today={today} kind="weekly" days={[c]} label="যোগ" className="btn-ghost text-xs rounded-lg flex-1 !px-1" />
              <CopyDayButton from={c} className="btn-ghost text-xs rounded-lg flex-1 !px-1" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
