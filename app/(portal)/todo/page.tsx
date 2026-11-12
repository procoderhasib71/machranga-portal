import { ListChecks } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getTodos } from "@/lib/data";
import { one } from "@/lib/db";
import { syncMasterQuietly } from "@/lib/pomodoroSync";
import { todayBD } from "@/lib/bn";
import PageHeader from "@/components/PageHeader";
import TodoList from "@/components/TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const mid = await requireMasterId();
  const pomodoro = await one("SELECT 1 AS x FROM hermes_site_links WHERE master_id = ? AND site = 'pomodoro'", [mid]);
  if (pomodoro) await syncMasterQuietly(mid);   // Pomodoro র সর্বশেষ অবস্থা আগে মিলিয়ে নিই
  const { open, done } = await getTodos(mid);
  return (
    <div className="max-w-3xl">
      <PageHeader title="কাজের লিস্ট"
        subtitle={pomodoro ? "🍅 বট আর Pomodoro অ্যাপের সাথে মেলানো — যেকোনো জায়গায় বদলালে সবখানে" : "এখানে বদলালে বটও সাথে সাথে জানে"}
        Icon={ListChecks} />
      <TodoList open={open} done={done} today={todayBD()} />
      {!pomodoro && (
        <p className="text-xs muted mt-4">🍅 Pomodoro অ্যাপ বটের সাথে যুক্ত করলে এই লিস্ট আর আজকের রুটিন ওখানেও চলে আসবে (অ্যাপে প্রোফাইল → &ldquo;মাছরাঙা বট যুক্ত করো&rdquo;)।</p>
      )}
    </div>
  );
}
