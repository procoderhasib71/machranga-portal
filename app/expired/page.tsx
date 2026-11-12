export default function ExpiredPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">🐦</div>
        <h1 className="text-2xl font-bold">মাছরাঙা পোর্টাল</h1>
        <p style={{ color: "var(--muted)" }}>
          এখানে কোনো পাসওয়ার্ড নেই — ঢুকতে তোমার মাছরাঙা বটকে (Telegram বা Discord এ) শুধু লেখো:
        </p>
        <p className="text-xl font-semibold" style={{ color: "var(--teal)" }}>portal</p>
        <p style={{ color: "var(--muted)" }}>
          বট একটা লিংক দেবে, সেটায় ক্লিক করলেই তুমি ভেতরে। লিংকটা ১৫ মিনিট চলে আর একবারই ঢোকা যায়।
        </p>
      </div>
    </main>
  );
}
