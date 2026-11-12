import { BookOpen, CalendarClock, CalendarDays, CalendarRange, Columns3, List, Repeat, Sun } from "lucide-react";
import { FinishedPlan, NewPlanButton, PlanDetail } from "@/components/PlanViews";
import WeekPlanner from "@/components/WeekPlanner";
import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getDaysOff, getPlanBlocks, getRoutine, getRoutineMonth, getTodos, todaysBlocks } from "@/lib/data";
import { buildPlans } from "@/lib/plans";
import { buildToday, laterTasks } from "@/lib/todayPlan";
import { syncForRequest } from "@/lib/pomodoroSync";
import TodayPlan from "@/components/TodayPlan";
import { buildMonth, monthRange, validMonth } from "@/lib/calendar";
import MonthCalendar from "@/components/MonthCalendar";
import { DAY_BN, DAY_ORDER, bnDigits, fullDateBn, humanDate, nowBD, nowHHMM, todayBD } from "@/lib/bn";
import PageHeader, { Empty } from "@/components/PageHeader";
import { DayOff, EditableBlock, NewBlockButton, PlanCard } from "@/components/RoutineEditor";

export const dynamic = "force-dynamic";

export default async function RoutinePage({ searchParams }: { searchParams: Promise<{ view?: string; m?: string; d?: string; day?: string }> }) {
  const mid = await requireMasterId();
  const sp = await searchParams;
  const view = sp.view === "month" ? "month" : sp.view === "week" ? "week" : sp.view === "plans" ? "plans" : "list";
  const month = view === "month" ? validMonth(sp.m, todayBD().slice(0, 7)) : null;
  await syncForRequest(mid);   // রুটিন → কাজ এখনই, Pomodoro উত্তর পাঠানোর পরে
  const [all, todos, planData, offToday] = await Promise.all([getRoutine(mid), getTodos(mid), getPlanBlocks(mid), getDaysOff(mid, todayBD(), todayBD())]);
  const blocks = all.filter((b) => !b.date);   // সাপ্তাহিক
  const dated = all.filter((b) => b.date);     // নির্দিষ্ট তারিখের (আজ থেকে সামনের)
  const today = todayBD();
  const todayCode = DAY_ORDER[(nowBD().getDay() + 1) % 7];
  const days = DAY_ORDER.map((code) => ({
    code,
    rows: blocks.filter((b) => b.days === "daily" || b.days.split(",").includes(code)),
  }));
  // ফোনে আজকের দিনটা আগে
  const ordered = [...days.slice(days.findIndex((d) => d.code === todayCode)), ...days.slice(0, days.findIndex((d) => d.code === todayCode))];
  // আজ: রুটিনের ব্লক + সময় ছাড়া কাজ; সামনের দিন: তারিখের ব্লক + সেই দিনের কাজ
  const off = offToday.has(today);   // ছুটির দিনে সাপ্তাহিক ব্লক আজকের তালিকায় নেই
  const now = buildToday(todaysBlocks(all, todayCode, today).filter((b) => b.date || !off), [...todos.open, ...todos.done], today, nowHHMM());
  const later = laterTasks(todos.open, today);
  const datedDays = [...new Set([...dated.map((b) => b.date!).filter((d) => d > today), ...later.keys()])].sort()
    .map((date) => ({ date, rows: dated.filter((b) => b.date === date), tasks: later.get(date) ?? [] }));
  const allPlans = buildPlans(planData.plans, planData.blocks, planData.statuses, today);
  const plans = allPlans.filter((p) => !p.finished);

  const subtitle = [
    blocks.length ? `সপ্তাহে ${bnDigits(blocks.length)}টা ব্লক` : "",
    datedDays.length ? `সামনের ${bnDigits(datedDays.length)} দিনে পরিকল্পনা` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader title="রুটিন" subtitle={subtitle ? `${subtitle} · ব্লক চাপলে বদলানো বা মোছা যায়` : undefined} Icon={CalendarClock}
        action={<NewBlockButton today={today} className="btn-primary shrink-0 py-2.5" />} />

      <nav className="seg max-w-lg -mt-4" aria-label="দেখার ধরন">
        {([["list", "/routine", List, "তালিকা"], ["plans", "/routine?view=plans", BookOpen, "পরিকল্পনা"], ["week", "/routine?view=week", Columns3, "সপ্তাহ"], ["month", "/routine?view=month", CalendarRange, "মাস"]] as const).map(([key, href, Icon, label]) => {
          const active = view === key;
          return (
            <Link key={key} href={href} aria-current={active ? "page" : undefined}
              className="text-center rounded-[0.625rem] py-2 px-1 text-[13px] sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              style={active ? { background: "var(--surface)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}><Icon size={15} className="hidden sm:block" /> {label}</Link>
          );
        })}
      </nav>

      {view === "plans" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 -mt-2">
            <NewPlanButton today={today} className="btn-primary py-2.5" />
            <p className="text-sm muted flex-1 min-w-48">আগে লক্ষ্য (যেমন &ldquo;Davidson ১ মাসে&rdquo;), তারপর প্রতিদিনের পড়া নিজে রুটিনে বসে। বটকেও বলতে পারো।</p>
          </div>
          {allPlans.filter((p) => !p.finished).length === 0 ? (
            <div className="card card-pad max-w-xl">
              <Empty text="এখনো কোনো পরিকল্পনা নেই। উপরের বোতাম চাপো, অথবা বটকে বলো:" example="Davidson মেডিসিন ১ মাসে শেষ করার পরিকল্পনা বানাও, রাত ৯টা থেকে ১২টা পড়ব" />
            </div>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {allPlans.filter((p) => !p.finished).map((p) => <PlanDetail key={p.key} plan={p} today={today} />)}
            </ul>
          )}
          {allPlans.some((p) => p.finished) && (
            <section>
              <h2 className="font-semibold mb-2">শেষ হওয়া পরিকল্পনা</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">{allPlans.filter((p) => p.finished).map((p) => <FinishedPlan key={p.key} plan={p} />)}</ul>
            </section>
          )}
        </div>
      ) : view === "week" ? (
        <WeekPlanner blocks={blocks} today={today} todayCode={todayCode}
          selected={DAY_ORDER.includes(sp.day as (typeof DAY_ORDER)[number]) ? sp.day! : todayCode} />
      ) : month ? await (async () => {
        const { from, to } = monthRange(month);
        const [{ blocks: mb, statuses, tasks }, daysOff] = await Promise.all([getRoutineMonth(mid, from, to), getDaysOff(mid, from, to)]);
        return <MonthCalendar month={month} weeks={buildMonth(month, today, mb, statuses, tasks, daysOff)} selected={sp.d ?? null} />;
      })() : (<>

      <section className="card card-pad rise -mt-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Sun size={18} style={{ color: "var(--accent)" }} /> আজ · {fullDateBn()}</h2>
          <span className="flex items-center gap-1">
            {!off && <DayOff off={false} today={today} />}
            {now.total > 0 && <span className="chip chip-muted num">{bnDigits(now.done)}/{bnDigits(now.total)} শেষ</span>}
          </span>
        </div>
        {off && <DayOff off today={today} />}
        <TodayPlan blocks={now.blocks} tasks={now.tasks} today={today} canAdd />
      </section>

      {(datedDays.length > 0 || plans.length > 0) && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={18} style={{ color: "var(--brand)" }} /> সামনের দিনগুলো</h2>
          {plans.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">{plans.map((p) => <PlanCard key={p.key} plan={p} today={today} />)}</ul>
          )}
          <ol className="space-y-3">
            {datedDays.map((d, i) => {
              const isToday = d.date === today;
              return (
                <li key={d.date} className="card p-4 flex gap-4 items-start rise"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, ...(isToday ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand)" } : {}) }}>
                  <div className="w-16 shrink-0 text-center rounded-xl py-2" style={{ background: isToday ? "var(--brand)" : "var(--surface-2)", color: isToday ? "var(--brand-ink)" : "var(--ink)" }}>
                    <p className="text-[11px] font-medium opacity-80">{isToday ? "আজ" : humanDate(d.date).includes(" ") ? humanDate(d.date).split(" ")[1] : humanDate(d.date)}</p>
                    <p className="text-xl font-bold num leading-tight">{bnDigits(Number(d.date.slice(8)))}</p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {d.rows.length > 0 && <ul className="space-y-2">{d.rows.map((b) => <EditableBlock key={b.id} b={b} today={today} />)}</ul>}
                    {d.tasks.length > 0 && (
                      <TodayPlan blocks={[]} today={today}
                        tasks={d.tasks.map((t) => ({ id: t.id, task: t.task, due_date: t.due_date, priority: t.priority, done: false, overdue: false }))} />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {blocks.length === 0 && datedDays.length === 0 && now.total === 0 ? (
        <div className="card card-pad max-w-xl">
          <Empty text="এখনো কোনো রুটিন নেই। উপরের “নতুন ব্লক” দিয়ে নিজে যোগ করো, অথবা বটকে বলো — কথা বলে সাজিয়ে দেবে:"
            example="আমার একটা পড়ার রুটিন বানিয়ে দাও, রাতে ৩ ঘণ্টা সময় পাই" />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm muted">প্রতিটা দিনের ব্লক আর কাজ Pomodoro তেও চলে যায়, যেকোনো জায়গায় শেষ করলে সবখানে শেষ। ব্লক বদলাতে চাপো, অথবা বটকে বলো।</p>
      ) : (
        <section>
          {datedDays.length > 0 && <h2 className="font-semibold mb-3 flex items-center gap-2"><Repeat size={18} style={{ color: "var(--brand)" }} /> প্রতি সপ্তাহের রুটিন</h2>}
          {/* কম্পিউটার: সাত দিনের বোর্ড */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {days.map((d, i) => {
              const isToday = d.code === todayCode;
              return (
                <section key={d.code} className="card p-3 rise" style={{ animationDelay: `${i * 30}ms`, ...(isToday ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand)" } : {}) }}>
                  <h2 className="text-sm font-semibold mb-3 flex items-center justify-between">
                    {DAY_BN[d.code]}
                    {isToday && <span className="chip text-[11px] py-0">আজ</span>}
                  </h2>
                  {d.rows.length ? <ul className="space-y-2">{d.rows.map((b) => <EditableBlock key={b.id} b={b} today={today} />)}</ul>
                    : <p className="text-xs faint text-center py-4">ফাঁকা</p>}
                </section>
              );
            })}
          </div>
          {/* ফোন/ট্যাবলেট: আজ থেকে শুরু করে দিন ধরে */}
          <div className="lg:hidden space-y-3">
            {ordered.filter((d) => d.rows.length).map((d, i) => (
              <section key={d.code} className="card card-pad rise" style={{ animationDelay: `${i * 40}ms` }}>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  {DAY_BN[d.code]}বার {d.code === todayCode && <span className="chip text-xs">আজ</span>}
                </h2>
                <ul className="space-y-2">{d.rows.map((b) => <EditableBlock key={b.id} b={b} today={today} />)}</ul>
              </section>
            ))}
          </div>
          <p className="text-sm muted mt-5">প্রতিটা ব্লক আর কাজ Pomodoro তেও চলে যায়, যেকোনো জায়গায় শেষ করলে সবখানে শেষ। ব্লক বদলাতে চাপো, অথবা বটকে বলো।</p>
        </section>
      )}
      </>)}
    </div>
  );
}
