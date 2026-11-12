import { redirect } from "next/navigation";

// পুরনো ঠিকানা: এখন লগইন পেজেই সব উপায় আছে
export default function ExpiredPage() {
  redirect("/signin");
}
