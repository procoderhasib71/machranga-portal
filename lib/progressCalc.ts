// অগ্রগতির pure হিসাব (টেস্ট করা যায়, DB/Firestore ছোঁয় না)
export const bdDay = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(0, 10);

/** আজ থেকে পেছনে n দিনের তারিখ (পুরনো → নতুন) */
export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => bdDay(new Date(now.getTime() - (n - 1 - i) * 86400000)));
}

/** শেষ দিন থেকে পেছনে টানা কয় দিন কিছু পড়া হয়েছে; আজ এখনো না হলেও গতকাল পর্যন্ত গোনা চলে */
export function streak(days: string[], active: (day: string) => boolean): number {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (active(days[i])) n++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return n;
}
