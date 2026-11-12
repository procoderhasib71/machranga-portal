// সাপ্তাহিক প্ল্যানারে দিন কপির টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { copyDayPlan } from "../lib/routineEdit.ts";

test("শনিবারের ব্লক রবি–বৃহস্পতিতে: days এ বার যোগ হয়, daily আর অন্য বারের ব্লক ছোঁয় না", () => {
  const blocks = [
    { id: 1, days: "SAT", title: "কলেজ", start_time: "08:00" },
    { id: 2, days: "daily", title: "ফজর", start_time: "06:00" },
    { id: 3, days: "MON", title: "জিম", start_time: "18:00" },
    { id: 4, days: "SAT,FRI", title: "পড়া", start_time: "20:00" },
  ];
  const out = copyDayPlan(blocks, "SAT", ["SUN", "MON", "TUE", "WED", "THU"]);
  assert.deepEqual(out, [{ id: 1, days: "SAT,SUN,MON,TUE,WED,THU" }, { id: 4, days: "daily" }]);
});

test("একই সময়ে একই কাজ সেই বারে আগেই থাকলে সেই বার বাদ", () => {
  const blocks = [
    { id: 1, days: "SAT", title: "Physics & Chem", start_time: "20:00" },
    { id: 2, days: "SUN", title: "physics and chem", start_time: "20:00" },
  ];
  assert.deepEqual(copyDayPlan(blocks, "SAT", ["SUN", "MON"]), [{ id: 1, days: "SAT,MON" }]);
});
