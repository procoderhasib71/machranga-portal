// পরিকল্পনার সারাংশের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlans } from "../lib/plans.ts";

test("একই নামের দিনগুলো এক পরিকল্পনা: তারিখের পরিসর, প্রতিদিনের অবস্থা, পরের দিন", () => {
  const blocks = [
    { id: 1, date: "2026-11-11", title: "কার্ডিওলজি: দিন ১" },
    { id: 2, date: "2026-11-12", title: "কার্ডিওলজি: দিন ২" },
    { id: 3, date: "2026-11-13", title: "কার্ডিওলজি: দিন ৩" },
    { id: 4, date: "2026-11-14", title: "কার্ডিওলজি: দিন ৪" },
    { id: 9, date: "2026-11-20", title: "একা ব্লক" },
    { id: 7, date: "2026-11-01", title: "পুরনো: দিন ১" }, { id: 8, date: "2026-11-02", title: "পুরনো: দিন ২" },
  ];
  const p = buildPlans(blocks, new Map([["2|2026-11-12", "done"], ["1|2026-11-11", "open"]]), "2026-11-12");
  assert.equal(p.length, 1);
  assert.deepEqual([p[0].name, p[0].from, p[0].to, p[0].done, p[0].next], ["কার্ডিওলজি", "2026-11-11", "2026-11-14", 1, "2026-11-13"]);
  assert.deepEqual(p[0].days.map((d) => d.status), ["missed", "done", "upcoming", "upcoming"]);
});
