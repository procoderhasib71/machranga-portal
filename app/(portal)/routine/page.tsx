import { BellOff, CalendarClock, CalendarDays, Repeat } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getRoutine, type RoutineBlock } from "@/lib/data";
import { DAY_BN, DAY_ORDER, bnDigits, humanDate, humanTime, nowBD, todayBD } from "@/lib/bn";
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

  const subtitle = [
    blocks.length ? `সপ্তাহে ${bnDigits(blocks.length)}টা ব্লক` : "",
    datedDays.length ? `সামনের ${bnDigits(datedDays.length)} দিনের পরিকল্পনা` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader title="রুটিন" subtitle={subtitle ? `${subtitle} · শুরুর সময়ে বট মনে করিয়ে দেয়` : undefined} Icon={CalendarClock} />

      {datedDays.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays size={18} style={{ color: "var(--brand)" }} /> তারিখ অনুযায়ী পরিকল্পনা</h2>
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
                  <ul className="flex-1 min-w-0 space-y-2">{d.rows.map((b) => <Block key={b.id} b={b} />)}</ul>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {blocks.length === 0 && datedDays.length === 0 ? (
        <div className="card card-pad max-w-xl">
          <Empty text="এখনো কোনো রুটিন নেই। বটকে বলো — তোমার সাথে কথা বলে সাজিয়ে দেবে, আর প্রতিটা ব্লক শুরুর সময়ে মনে করিয়ে দেবে:"
            example="আমার একটা পড়ার রুটিন বানিয়ে দাও, রাতে ৩ ঘণ্টা সময় পাই" />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm muted">রুটিন বদলাতে বটকে সাধারণ কথায় বলো — &ldquo;দিন ৩ এর ব্লকটা বাদ দাও&rdquo;, &ldquo;নতুন করে বানাও&rdquo;।</p>
      ) : (
        <section>
          {datedDays.length > 0 && <h2 className="font-semibold mb-3 flex items-center gap-2"><Repeat size={18} style={{ color: "var(--brand)" }} /> প্রতি সপ্তাহের রুটিন</h2>}
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
        </section>
      )}
    </div>
  );
}
