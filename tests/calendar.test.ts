// রুটিনের মাসের ক্যালেন্ডারের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMonth, monthRange, shiftMonth, validMonth, type CalBlock } from "../lib/calendar.ts";

const b = (o: Partial<CalBlock>): CalBlock => ({ id: 1, days: "daily", date: null, start_time: "20:00", end_time: null, title: "পড়া", ...o });

test("মাস বদল আর যাচাই", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(validMonth("2026-13", "2026-11"), "2026-11");
  assert.equal(validMonth("2026-02", "2026-11"), "2026-02");
});

test("নভেম্বর ২০২৬: শনিবার থেকে সপ্তাহ, পুরো সপ্তাহ ভরাট", () => {
  // ১ নভেম্বর ২০২৬ রবিবার → আগের শনিবার ৩১ অক্টোবর থেকে শুরু
  assert.deepEqual(monthRange("2026-11"), { from: "2026-10-31", to: "2026-12-04" });
  const weeks = buildMonth("2026-11", "2026-11-12", [], new Map());
  assert.equal(weeks.length, 5);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks[0][0].inMonth, false);
  assert.ok(weeks.flat().find((c) => c.date === "2026-11-12")!.isToday);
});

test("অবস্থা: শেষ, মিস, আজ, সামনে; সাপ্তাহিক ব্লক তৈরির আগে নেই", () => {
  const blocks = [b({ id: 1, days: "daily", created_at: "2026-11-10 09:00" }), b({ id: 2, days: "once", date: "2026-11-15", title: "দিন ৪" })];
  const st = new Map([["1|2026-11-10", "done"], ["1|2026-11-11", "open"]]);
  const cell = (d: string) => buildMonth("2026-11", "2026-11-12", blocks, st).flat().find((c) => c.date === d)!;
  assert.equal(cell("2026-11-09").items.length, 0);
  assert.equal(cell("2026-11-10").items[0].status, "done");
  assert.equal(cell("2026-11-11").items[0].status, "missed");
  assert.equal(cell("2026-11-12").items[0].status, "today");
  assert.deepEqual(cell("2026-11-15").items.map((i) => [i.title, i.status]), [["পড়া", "upcoming"], ["দিন ৪", "upcoming"]]);
});
