import { ListChecks } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getTodos } from "@/lib/data";
import { todayBD } from "@/lib/bn";
import PageHeader from "@/components/PageHeader";
import TodoList from "@/components/TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const mid = await requireMasterId();
  const { open, done } = await getTodos(mid);
  return (
    <div className="max-w-3xl">
      <PageHeader title="কাজের লিস্ট" subtitle="এখানে বদলালে বটও সাথে সাথে জানে" Icon={ListChecks} />
      <TodoList open={open} done={done} today={todayBD()} />
    </div>
  );
}
