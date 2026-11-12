// কাজের আলাদা পেজ নেই: সব কাজ রুটিনের "আজ" আর "সামনের দিনগুলো" তে (পুরনো লিংক/বুকমার্ক এখানে আসে)
import { redirect } from "next/navigation";

export default function TodoPage() {
  redirect("/routine");
}
