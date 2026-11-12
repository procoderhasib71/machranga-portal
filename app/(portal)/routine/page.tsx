// রুটিন: তিনটা ট্যাব, প্রতিটার একটাই কাজ — আজ (আজকের তালিকা), সপ্তাহ (প্রতি সপ্তাহে ঘুরে আসা রুটিন), পরিকল্পনা (বই/পরীক্ষার plan)।
// মাসের ক্যালেন্ডার পরিকল্পনার ভেতর থেকে খোলে।
import { BookOpen, CalendarRange, ChevronDown, ChevronLeft, Columns3, Sun } from "lucide-react";
import Link from "next/link";
import { FinishedPlan, NewPlanButton, PlanDetail } from "@/components/PlanViews";
import WeekPlanner from "@/components/WeekPlanner";
import TodayPlan from "@/components/TodayPlan";
import MonthCalendar from "@/components/MonthCalendar";
import PageHeader, { Empty } from "@/components/PageHeader";
import { DayOff } from "@/components/RoutineEditor";
import { requireMasterId } from "@/lib/session";
import { getDaysOff, getPlanBlocks, getRoutine, getRoutineMonth, getTodos, todaysBlocks } from "@/lib/data";
import { buildPlans } from "@/lib/plans";
import { buildToday } from "@/lib/todayPlan";
import { syncForRequest } from "@/lib/pomodoroSync";
import { buildMonth, monthRange, validMonth } from "@/lib/calendar";
import { DAY_ORDER, bnDigits, fullDateBn, humanTime, nowBD, nowHHMM, todayBD } from "@/lib/bn";

export const dynamic = "force-dynamic";

type View = "today" | "week" | "plans" | "month";
const TABS = [["today", "/routine", Sun, "আজ"], ["week", "/routine?view=week", Columns3, "সপ্তাহ"], ["plans", "/routine?view=plans", BookOpen, "পরিকল্পনা"]] as const;

export default async function RoutinePage({ searchParams }: { searchParams: Promise<{ view?: string; m?: string; d?: string; day?: string }> }) {
  const mid = await requireMasterId();
  const sp = await searchParams;
  const view: View = sp.view === "week" ? "week" : sp.view === "plans" ? "plans" : sp.view === "month" ? "month" : "today";
  await syncForRequest(mid);   // রুটিন → কাজ এখনই, Pomodoro উত্তর পাঠানোর পরে
  const today = todayBD();
  const todayCode = DAY_ORDER[(nowBD().getDay() + 1) % 7];
  const weekly = view === "week" || view === "today" ? (await getRoutine(mid)) : [];

  const tab = view === "month" ? "plans" : view;
  // প্রতিটা ট্যাবে একটাই মূল বোতাম: পরিকল্পনায় "নতুন পরিকল্পনা"; সপ্তাহে প্রতিটা বারেই "যোগ", আজ এ নিচের কাজের বক্স
  const action = view === "plans" ? <NewPlanButton today={today} className="btn-primary shrink-0 py-2.5" /> : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="রুটিন" Icon={view === "plans" || view === "month" ? BookOpen : view === "week" ? Columns3 : Sun} action={action} />

      <nav className="seg max-w-md -mt-3" aria-label="রুটিনের ভাগ">
        {TABS.map(([key, href, Icon, label]) => (
          <Link key={key} href={href} aria-current={tab === key ? "page" : undefined}
            className="text-center rounded-[0.625rem] py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            style={tab === key ? { background: "var(--surface)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
            <Icon size={15} /> {label}
          </Link>
        ))}
      </nav>

      {view === "today" && await TodayView({ mid, all: weekly, today, todayCode })}
      {view === "week" && (
        <WeekPlanner blocks={weekly.filter((b) => !b.date)} today={today} todayCode={todayCode}
          selected={DAY_ORDER.includes(sp.day as (typeof DAY_ORDER)[number]) ? sp.day! : todayCode} />
      )}
      {view === "plans" && await PlansView({ mid, today })}
      {view === "month" && await MonthView({ mid, today, m: sp.m, d: sp.d })}
    </div>
  );
}

/** আজ: আজকের রুটিন আর কাজ টিকসহ, নিচে ভাঁজ করা "কাল কী আছে" */
async function TodayView({ mid, all, today, todayCode }: { mid: string; all: Awaited<ReturnType<typeof getRoutine>>; today: string; todayCode: string }) {
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const tomorrowCode = DAY_ORDER[(DAY_ORDER.indexOf(todayCode as (typeof DAY_ORDER)[number]) + 1) % 7];
  const [todos, offDays] = await Promise.all([getTodos(mid), getDaysOff(mid, today, tomorrow)]);
  const off = offDays.has(today);
  const now = buildToday(todaysBlocks(all, todayCode, today).filter((b) => b.date || !off), [...todos.open, ...todos.done], today, nowHHMM());
  const next = todaysBlocks(all, tomorrowCode, tomorrow).filter((b) => b.date || !offDays.has(tomorrow)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nextTasks = todos.open.filter((t) => !t.routine_id && t.due_date === tomorrow);

  return (
    <>
      <section className="card card-pad rise">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">{fullDateBn()}</h2>
          <span className="flex items-center gap-1">
            {now.total > 0 && <span className="chip chip-muted num">{bnDigits(now.done)}/{bnDigits(now.total)} শেষ</span>}
            {!off && <DayOff off={false} today={today} />}
          </span>
        </div>
        {off && <DayOff off today={today} />}
        <TodayPlan blocks={now.blocks} tasks={now.tasks} today={today} canAdd />
        {now.total === 0 && (
          <p className="text-sm muted mt-3">
            রোজকার রুটিন সাজাতে <Link href="/routine?view=week" className="link">সপ্তাহ</Link>, বই বা পরীক্ষার পড়ার জন্য <Link href="/routine?view=plans" className="link">পরিকল্পনা</Link>।
          </p>
        )}
      </section>

      {(next.length > 0 || nextTasks.length > 0) && (
        <details className="card group">
          <summary className="card-pad flex items-center justify-between cursor-pointer list-none font-semibold">
            কাল কী আছে <span className="flex items-center gap-2 text-sm muted font-normal num">{bnDigits(next.length + nextTasks.length)}টা <ChevronDown size={18} className="transition-transform group-open:rotate-180" /></span>
          </summary>
          <ul className="px-5 sm:px-6 pb-5 -mt-2 space-y-2 text-[15px]">
            {next.map((b) => (
              <li key={b.id} className="flex gap-3"><span className="num muted text-sm w-28 shrink-0">{humanTime(b.start_time)}</span><span className="min-w-0">{b.title}</span></li>
            ))}
            {nextTasks.map((t) => (
              <li key={t.id} className="flex gap-3"><span className="muted text-sm w-28 shrink-0">কাজ</span><span className="min-w-0">{t.task}</span></li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

/** পরিকল্পনা: চালু plan গুলো বিস্তারিত, শেষ হওয়াগুলো নিচে; ক্যালেন্ডারে দেখার বোতাম */
async function PlansView({ mid, today }: { mid: string; today: string }) {
  const data = await getPlanBlocks(mid);
  const all = buildPlans(data.plans, data.blocks, data.statuses, today);
  const active = all.filter((p) => !p.finished);
  const done = all.filter((p) => p.finished);
  return (
    <div className="space-y-5">
      {active.length === 0 ? (
        <div className="card card-pad max-w-xl">
          <Empty text="কোনো পরিকল্পনা নেই। উপরের বোতাম চাপো, অথবা বটকে বলো:" example="Davidson মেডিসিন ১ মাসে শেষ করার পরিকল্পনা বানাও" />
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {active.map((p) => <PlanDetail key={p.key} plan={p} today={today} progress={data.progress} />)}
        </ul>
      )}
      <Link href="/routine?view=month" className="btn-outline py-2 text-sm"><CalendarRange size={16} /> ক্যালেন্ডারে দেখো</Link>
      {done.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">শেষ হওয়া</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">{done.map((p) => <FinishedPlan key={p.key} plan={p} />)}</ul>
        </section>
      )}
    </div>
  );
}

async function MonthView({ mid, today, m, d }: { mid: string; today: string; m?: string; d?: string }) {
  const month = validMonth(m, today.slice(0, 7));
  const { from, to } = monthRange(month);
  const [{ blocks, statuses, tasks }, daysOff] = await Promise.all([getRoutineMonth(mid, from, to), getDaysOff(mid, from, to)]);
  return (
    <div className="space-y-3">
      <Link href="/routine?view=plans" className="link text-sm"><ChevronLeft size={16} /> পরিকল্পনায় ফেরো</Link>
      <MonthCalendar month={month} weeks={buildMonth(month, today, blocks, statuses, tasks, daysOff)} selected={d ?? null} />
    </div>
  );
}
