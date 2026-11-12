import { requireMasterId } from "@/lib/session";
import { getRoutine, type RoutineBlock } from "@/lib/data";
import { DAY_BN, DAY_ORDER, humanTime } from "@/lib/bn";

export const dynamic = "force-dynamic";

function Block({ b }: { b: RoutineBlock }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="text-sm font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
        {humanTime(b.start_time)}{b.end_time ? `–${humanTime(b.end_time)}` : ""}
      </span>
      <span className="flex-1">
        {b.title}{!b.remind && <span title="মনে করানো বন্ধ"> 🔕</span>}
        {b.note && <span className="block text-sm" style={{ color: "var(--muted)" }}>💡 {b.note}</span>}
      </span>
    </li>
  );
}

export default async function RoutinePage() {
  const mid = await requireMasterId();
  const blocks = await getRoutine(mid);
  const daily = blocks.filter((b) => b.days === "daily");
  const byDay = DAY_ORDER.map((code) => ({
    code,
    rows: blocks.filter((b) => b.days !== "daily" && b.days.split(",").includes(code)),
  })).filter((d) => d.rows.length > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📅 রুটিন</h1>
      {blocks.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-4xl">🗓️</p>
          <p style={{ color: "var(--muted)" }}>
            এখনো কোনো রুটিন নেই। বটকে বলো: <b>&quot;আমার একটা পড়ার রুটিন বানিয়ে দাও&quot;</b> —
            তোমার সাথে কথা বলে সাজিয়ে দেবে, আর প্রতিটা ব্লক শুরুর সময়ে মনে করিয়ে দেবে।
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {daily.length > 0 && (
            <section className="card p-5">
              <h2 className="font-semibold mb-2">🔁 প্রতিদিন</h2>
              <ul className="divide-y" style={{ borderColor: "var(--line)" }}>{daily.map((b) => <Block key={b.id} b={b} />)}</ul>
            </section>
          )}
          {byDay.map((d) => (
            <section key={d.code} className="card p-5">
              <h2 className="font-semibold mb-2">📌 {DAY_BN[d.code]}বার</h2>
              <ul className="divide-y" style={{ borderColor: "var(--line)" }}>{d.rows.map((b) => <Block key={b.id} b={b} />)}</ul>
            </section>
          ))}
        </div>
      )}
      {blocks.length > 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>রুটিন বদলাতে বটকে সাধারণ কথায় বলো — &quot;শনিবারের ব্লকটা বাদ দাও&quot;, &quot;নতুন করে বানাও&quot;।</p>
      )}
    </div>
  );
}
