import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import { one } from "@/lib/db";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mid = await requireMasterId();
  const user = await getUser(mid);
  const moneyLink = await one("SELECT 1 AS x FROM hermes_site_links WHERE master_id = ? AND site = 'money'", [mid]);
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">⚙️ সেটিংস</h1>
      <SettingsForm
        todoDigest={user?.todo_digest ?? ""}
        newsTime={user?.news_time ?? ""}
        newsTopics={user?.news_topics ?? ""}
        moodCheckin={user?.mood_checkin ?? ""}
        weeklyReport={(user?.weekly_report ?? 1) === 1}
        moneyDigest={(user?.money_digest ?? 1) === 1}
        moneyLinked={!!moneyLink}
      />
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        নামাজের রিমাইন্ডার, বটের নাম বদলানো এসব বটেই বলো — &quot;নামাজের রিমাইন্ডার দিও&quot;, &quot;তোমার নাম ময়না&quot; 🙂
      </p>
    </div>
  );
}
