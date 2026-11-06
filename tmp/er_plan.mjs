import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// jieba 词频
const freq = new Map();
for (const ln of readFileSync("/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt", "utf8").split("\n")) {
  const p = ln.trim().split(/\s+/);
  if (p.length >= 2) freq.set(p[0], parseInt(p[1], 10));
}
const f = w => freq.get(w) || 0;

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const er2 = [], r5 = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 4 || w[w.length - 1] !== "儿") continue;
  const syl = py.trim().split(/\s+/);
  const last = syl[syl.length - 1];
  if (last === "er2") er2.push({ w: simp, syl, f: f(simp) });
  else if (last === "r5") r5.push({ w: simp, syl, f: f(simp) });
}
er2.sort((a, b) => b.f - a.f);
r5.sort((a, b) => b.f - a.f);
console.log("=== er2 全声(57) 按词频降序，前 40 ===");
console.log(er2.slice(0, 40).map(x => `${x.w}(${x.f})`).join(" "));
console.log("\n=== r5 儿化(358) 按词频降序，前 60 ===");
console.log(r5.slice(0, 60).map(x => `${x.w}(${x.f})`).join(" "));
console.log("\n=== r5 词频统计 ===");
for (const t of [3, 10, 50, 100, 300, 1000]) console.log(`  f>=${t}:`, r5.filter(x => x.f >= t).length);
