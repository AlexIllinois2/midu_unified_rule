// 统计 182 个「三声+子(轻声)」受害词的“子前字”，并检查是否已有同字规则
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const victims = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const simp = m[2], py = m[3], def = m[4];
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 4 || w[w.length - 1] !== "子") continue;
  const syl = py.trim().split(/\s+/);
  if (syl.length !== w.length) continue;
  if (syl[syl.length - 1] !== "zi5") continue;
  const prev = w[w.length - 2];
  const t = (syl[syl.length - 2].match(/(\d)$/) || [, "0"])[1];
  if (t !== "3") continue;
  victims.push({ w: simp, prev, py: syl.join(" ") });
}

// 现有规则里按「字」为 key 的条目
const existing = new Map();
for (const f of ["conf/unified_rule_vendor.txt", "conf/rule_patch.txt"]) {
  for (const ln of readFileSync(f, "utf8").split("\n")) {
    if (!ln.trim() || ln.startsWith("移除:") || ln.startsWith("新增:")) continue;
    const k = ln.split("\t")[0];
    if (k.length === 1) {
      if (!existing.has(k)) existing.set(k, []);
      existing.get(k).push(ln.trim());
    }
  }
}

const byPrev = new Map();
for (const v of victims) {
  if (!byPrev.has(v.prev)) byPrev.set(v.prev, []);
  byPrev.get(v.prev).push(v.w);
}
const rows = [...byPrev.entries()].sort((a, b) => b[1].length - a[1].length);
console.log("受害词 " + victims.length + " 个，子前字 " + rows.length + " 个\n");
for (const [c, ws] of rows) {
  const ex = existing.get(c);
  console.log(c + "\t" + ws.length + "\t" + (ex ? "已有规则:" + ex.join(" ‖ ") : ""));
}
