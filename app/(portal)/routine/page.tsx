import { BellOff, CalendarClock } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getRoutine, type RoutineBlock } from "@/lib/data";
import { DAY_BN, DAY_ORDER, bnDigits, humanTime, nowBD } from "@/lib/bn";
import PageHeader, { Empty } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

function Block({ b }: { b: RoutineBlock }) {
  return (
    <li className="rounded-xl px-3 py-2.5" style={{ background: b.days === "daily" ? "var(--surface-2)" : "var(--brand-soft)" }}>
      <p className="text-xs num muted flex items-center gap-1">
        {humanTime(b.start_time)}{b.end_time ? ` – ${humanTime(b.end_time)}` : ""}
        {!b.remind && <BellOff size={12} aria-label="মনে করানো বন্ধ" />}
      </p>
      <p className="text-sm font-medium leading-snug mt-0.5">{b.title}</p>
      {b.note && <p className="text-xs muted mt-1">💡 {b.note}</p>}
    </li>
  );
}

export default async function RoutinePage() {
  const mid = await requireMasterId();
  const blocks = await getRoutine(mid);
  const todayCode = DAY_ORDER[(nowBD().getDay() + 1) % 7];
  const days = DAY_ORDER.map((code) => ({
    code,
    rows: blocks.filter((b) => b.days === "daily" || b.days.split(",").includes(code)),
  }));
  // ফোনে আজকের দিনটা আগে
  const ordered = [...days.slice(days.findIndex((d) => d.code === todayCode)), ...days.slice(0, days.findIndex((d) => d.code === todayCode))];

  return (
    <div>
      <PageHeader title="রুটিন" subtitle={blocks.length ? `সপ্তাহে ${bnDigits(blocks.length)}টা ব্লক · শুরুর সময়ে বট মনে করিয়ে দেয়` : undefined} Icon={CalendarClock} />
      {blocks.length === 0 ? (
        <div className="card card-pad max-w-xl">
          <Empty text="এখনো কোনো রুটিন নেই। বটকে বলো — তোমার সাথে কথা বলে সাজিয়ে দেবে, আর প্রতিটা ব্লক শুরুর সময়ে মনে করিয়ে দেবে:"
            example="আমার একটা পড়ার রুটিন বানিয়ে দাও, রাতে ৩ ঘণ্টা সময় পাই" />
        </div>
      ) : (
        <>
          {/* কম্পিউটার: সাত দিনের বোর্ড */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {days.map((d, i) => {
              const today = d.code === todayCode;
              return (
                <section key={d.code} className="card p-3 rise" style={{ animationDelay: `${i * 30}ms`, ...(today ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand)" } : {}) }}>
                  <h2 className="text-sm font-semibold mb-3 flex items-center justify-between">
                    {DAY_BN[d.code]}
                    {today && <span className="chip text-[11px] py-0">আজ</span>}
                  </h2>
                  {d.rows.length ? <ul className="space-y-2">{d.rows.map((b) => <Block key={b.id} b={b} />)}</ul>
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
                <ul className="space-y-2">{d.rows.map((b) => <Block key={b.id} b={b} />)}</ul>
              </section>
            ))}
          </div>
          <p className="text-sm muted mt-5">রুটিন বদলাতে বটকে সাধারণ কথায় বলো — &ldquo;শনিবারের ব্লকটা বাদ দাও&rdquo;, &ldquo;নতুন করে বানাও&rdquo;।</p>
        </>
      )}
    </div>
  );
}
