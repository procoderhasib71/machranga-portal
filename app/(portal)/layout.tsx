import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import { MobileBar, Sidebar, TabBar } from "@/components/Nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const mid = await requireMasterId();
  const user = await getUser(mid);
  const name = user?.call_me || user?.name || "বন্ধু";
  return (
    <div className="min-h-screen">
      <Sidebar name={name} />
      <MobileBar />
      <div className="lg:pl-64">
        <main className="max-w-6xl mx-auto min-w-0 overflow-x-clip px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-tabbar">{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
