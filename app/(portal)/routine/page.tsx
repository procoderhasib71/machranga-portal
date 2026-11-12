import { CalendarClock, CalendarDays, Repeat } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getRoutine } from "@/lib/data";
import { DAY_BN, DAY_ORDER, bnDigits, humanDate, nowBD, todayBD } from "@/lib/bn";
import { planName } from "@/lib/routineEdit";
import PageHeader, { Empty } from "@/components/PageHeader";
import { EditableBlock, NewBlockButton, PlanChip } from "@/components/RoutineEditor";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const mid = await requireMasterId();
  const all = await getRoutine(mid);
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
  const datedDays = [...new Set(dated.map((b) => b.date!))].map((date) => ({ date, rows: dated.filter((b) => b.date === date) }));
  const plans = [...dated.reduce((m, b) => m.set(planName(b.title), (m.get(planName(b.title)) ?? 0) + 1), new Map<string, number>())]
    .filter(([, n]) => n > 1);

  const subtitle = [
    blocks.length ? `সপ্তাহে ${bnDigits(blocks.length)}টা ব্লক` : "",
    datedDays.length ? `সামনের ${bnDigits(datedDays.length)} দিনের পরিকল্পনা` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader title="রুটিন" subtitle={subtitle ? `${subtitle} · ব্লক চাপলে বদলানো বা মোছা যায়` : undefined} Icon={CalendarClock}
        action={<NewBlockButton today={today} className="btn-primary shrink-0 py-2.5" />} />

      {datedDays.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={18} style={{ color: "var(--brand)" }} /> তারিখ অনুযায়ী পরিকল্পনা</h2>
          {plans.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-3">{plans.map(([name, n]) => <PlanChip key={name} name={name} count={n} />)}</ul>
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
                  <ul className="flex-1 min-w-0 space-y-2">{d.rows.map((b) => <EditableBlock key={b.id} b={b} today={today} />)}</ul>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {blocks.length === 0 && datedDays.length === 0 ? (
        <div className="card card-pad max-w-xl">
          <Empty text="এখনো কোনো রুটিন নেই। উপরের “নতুন ব্লক” দিয়ে নিজে যোগ করো, অথবা বটকে বলো — কথা বলে সাজিয়ে দেবে:"
            example="আমার একটা পড়ার রুটিন বানিয়ে দাও, রাতে ৩ ঘণ্টা সময় পাই" />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm muted">প্রতিটা দিনের ব্লক সেই দিনের কাজের লিস্টে আর Pomodoro তে চলে যায়। বদলাতে ব্লকটা চাপো, অথবা বটকে বলো।</p>
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
          <p className="text-sm muted mt-5">প্রতিটা ব্লক তার দিনে কাজের লিস্টে আর Pomodoro তে চলে যায়। বদলাতে ব্লকটা চাপো, অথবা বটকে বলো।</p>
        </section>
      )}
    </div>
  );
}
