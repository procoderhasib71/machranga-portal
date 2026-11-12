// রুটিনের কোন ব্লক Pomodoro তে ফোকাসের কাজ হবে: ইউজার নিজে বললে (focus 1/0) সেটাই; নইলে নিজে থেকে —
// তারিখের পড়ার পরিকল্পনা সবসময় হ্যাঁ; পড়া/রিভিশন/লেকচার/বিষয়ের নাম থাকলে হ্যাঁ; ঘুম, খাওয়া, নামাজ, অফিস জাতীয় না।
const STUDY = /পড়া|পড়ার|পড়ব|পড়বো|রিভিশন|রিভিউ|লেকচার|অধ্যায়|চ্যাপ্টার|অনুশীলন|প্র্যাকটিস|মুখস্থ|পরীক্ষা|হোমওয়ার্ক|অ্যাসাইনমেন্ট|প্রজেক্ট|লেখালেখি|কোডিং|প্রোগ্রামিং|ফিজিক্স|পদার্থ|কেমিস্ট্রি|রসায়ন|বায়োলজি|জীববিজ্ঞান|গণিত|ম্যাথ|ইংরেজি|বাংলা ব্যাকরণ|অ্যানাটমি|ফিজিওলজি|বায়োকেমিস্ট্রি|কার্ডিও|মেডিসিন|সার্জারি|ফার্মাকোলজি|প্যাথলজি|MCQ|\b(?:study|studying|revision|revise|review|lecture|chapter|practice|exam|homework|assignment|project|coding|code|reading|physics|chemistry|biology|math|anatomy|physiology|medicine|surgery|cardio\w*|pharmacology|pathology|mcq)\b/i;
const LIFE = /ঘুম|খাওয়া|খাবার|নাস্তা|নামাজ|ফজর|জোহর|আসর|মাগরিব|এশা|ইশা|কুরআন|বিশ্রাম|ন্যাপ|অফিস|কলেজ|স্কুল|ওয়ার্ড|ডিউটি|হাঁটা|ব্যায়াম|জিম|বাজার|গোসল|ফ্রেশ|পরিবার|ঘরের কাজ|যাতায়াত|ট্রাভেল|\b(?:sleep|wake|breakfast|lunch|dinner|prayer|namaz|rest|nap|office|work|college|school|walk|exercise|gym|shower|family|commute|travel)\b/i;

export type FocusBlock = { title: string; date?: string | null; focus?: number | null };

export function autoFocus(title: string, dated = false): boolean {
  if (dated) return true;
  if (STUDY.test(title)) return true;
  return false;   // অচেনা বা দৈনন্দিন কাজ: Pomodoro তে ভিড় না করি
}

export const isFocus = (b: FocusBlock): boolean =>
  b.focus === 1 ? true : b.focus === 0 ? false : autoFocus(b.title, Boolean(b.date));

/** কেন নিজে থেকে বন্ধ, ফর্মে দেখানোর জন্য */
export const looksLikeLife = (title: string) => LIFE.test(title) && !STUDY.test(title);
