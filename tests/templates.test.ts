// সাপ্তাহিক টেমপ্লেটের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { TEMPLATES, templateRows, validDays } from "../lib/templates.ts";

test("প্রতিটা টেমপ্লেটের বার আর সময় ঠিক, একই বারে একই সময়ে দুটো ব্লক নেই", () => {
  for (const t of TEMPLATES) {
    for (const b of t.blocks) {
      assert.ok(validDays(b.days), `${t.id}: ${b.days}`);
      assert.match(b.start, /^([01]\d|2[0-3]):[0-5]\d$/);
      if (b.end) assert.ok(b.end > b.start, `${t.id}: ${b.title}`);
    }
    for (const code of ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"]) {
      const starts = t.blocks.filter((b) => b.days === "daily" || b.days.split(",").includes(code)).map((b) => b.start);
      assert.equal(new Set(starts).size, starts.length, `${t.id} ${code}: একই সময়ে দুটো`);
    }
  }
});

test("পাশে যোগ করলে আগে থাকা একই ব্লক বাদ যায়", () => {
  const t = TEMPLATES.find((x) => x.id === "light")!;
  const rows = templateRows(t, [{ days: "daily", start_time: "23:00", title: "ঘুম" }], "add");
  assert.equal(rows.length, t.blocks.length - 1);
  assert.equal(templateRows(t, [{ days: "daily", start_time: "23:00", title: "ঘুম" }], "replace").length, t.blocks.length);
});
