import { requireMasterId } from "@/lib/session";
import { getTodos } from "@/lib/data";
import { todayBD } from "@/lib/bn";
import TodoList from "@/components/TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const mid = await requireMasterId();
  const { open, done } = await getTodos(mid);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📝 কাজের লিস্ট</h1>
      <TodoList open={open} done={done} today={todayBD()} />
    </div>
  );
}
