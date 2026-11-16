// রুটিনের "পড়ার সময়" (pure): সাপ্তাহিক ব্লকে study_slot = 1, আর পড়ার পরিকল্পনা (hermes_plans.slot_id) সেই সময়ের সাথে যুক্ত।
// যেদিন যুক্ত পরিকল্পনার অধ্যায় আছে, সেদিন সাধারণ "পড়া" ব্লকটা আলাদা দেখাই না — অধ্যায়গুলোই সেই সময়ের নিচে দেখায়,
// কাজের লিস্ট আর Pomodoro তেও সাধারণ "পড়া" যায় না, অধ্যায়ের নাম যায়।

export type SlotAware = { id: number; date: string | null; start_time: string; end_time: string | null; title: string; study_slot?: number | null; slot_id?: number | null };
export type SlotGroup = { id: number; title: string; start_time: string; end_time: string | null };

/** day তারিখে কোন কোন পড়ার সময়ে পরিকল্পনার অধ্যায় বসেছে */
export function coveredSlots(blocks: SlotAware[], day: string): Set<number> {
  return new Set(blocks.filter((b) => b.date === day && b.slot_id).map((b) => b.slot_id!));
}

/** একদিনের ব্লক (আগেই ঐ দিনের জন্য বাছা) থেকে: অধ্যায় থাকা পড়ার সময়ের সাধারণ ব্লক বাদ, অধ্যায়গুলোয় group (পড়ার সময়ের নাম/সময়) */
export function mergeSlots<T extends SlotAware>(blocks: T[], day: string): (T & { group?: SlotGroup })[] {
  const covered = coveredSlots(blocks, day);
  const slots = new Map(blocks.filter((b) => !b.date && b.study_slot && covered.has(b.id)).map((b) => [b.id, b]));
  return blocks
    .filter((b) => !slots.has(b.id))
    .map((b) => {
      const s = b.date && b.slot_id ? slots.get(b.slot_id) : undefined;
      return s ? { ...b, group: { id: s.id, title: s.title, start_time: s.start_time, end_time: s.end_time } } : b;
    });
}
