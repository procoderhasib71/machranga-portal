// পেজ বদলের সময় সাথে সাথে দেখানো কঙ্কাল: চাপলেই বোঝা যায় পেজ আসছে (ডাটা পরে ভরে যায়)
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="flex items-center gap-3">
        <span className="skeleton size-11 rounded-2xl" />
        <div className="space-y-2">
          <span className="skeleton block h-6 w-36 rounded-lg" />
          <span className="skeleton block h-3.5 w-56 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => <div key={i} className={`card card-pad ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}><span className="skeleton block h-3 w-20 rounded" /><span className="skeleton block h-7 w-16 rounded-lg mt-3" /></div>)}
      </div>
      <div className="card card-pad space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="skeleton size-[27px] rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <span className="skeleton block h-3 w-24 rounded" />
              <span className="skeleton block h-4 rounded-md" style={{ width: `${70 - i * 12}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
