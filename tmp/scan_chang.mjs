import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const freq = new Map();
try {
  for (const ln of readFileSync("/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt", "utf8").split("\n")) {
    const p = ln.trim().split(/\s+/);
    if (p.length >= 2) freq.set(p[0], parseInt(p[1], 10));
  }
} catch (e) { console.error("jieba 未读到"); }
const f = w => freq.get(w) || 0;
const rows = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 3) continue;
  const idx = w.indexOf("长");
  if (idx < 0) continue;
  const syl = py.trim().split(/\s+/);
  if (syl.length !== w.length) continue;
  const t = syl[idx];
  if (!/^chang\d$|^zhang\d$/.test(t)) continue;
  rows.push({ w: simp, idx, t, syl, f: f(simp) });
}
const kind = t => t.startsWith("chang") ? "chang" : "zhang";
// 按「长后面那个字」统计
const stat = new Map();
for (const r of rows) {
  if (r.idx !== 0) continue;
  const nxt = r.w[1];
  if (!stat.has(nxt)) stat.set(nxt, { chang: 0, zhang: 0, ex: { chang: [], zhang: [] } });
  const s = stat.get(nxt);
  const k = kind(r.t);
  s[k]++;
  if (s.ex[k].length < 2) s.ex[k].push(r.w);
}
const pure = [...stat.entries()].filter(([, s]) => (s.chang === 0) !== (s.zhang === 0));
console.log("长开头词条总数:", rows.filter(r => r.idx === 0).length);
console.log("后字能唯一判定(纯 zhang):", pure.filter(([, s]) => s.zhang > 0).map(([c, s]) => c + "(" + s.ex.zhang.join("/") + ")").join(" "));
console.log("\n后字能唯一判定(纯 chang):", pure.filter(([, s]) => s.chang > 0).map(([c]) => c).join(""));
console.log("\n后字两种读法都有(真歧义):");
for (const [c, s] of [...stat.entries()].sort((a, b) => (b[1].chang + b[1].zhang) - (a[1].chang + a[1].zhang))) {
  if (s.chang > 0 && s.zhang > 0) console.log("  " + c, "zhang:", s.ex.zhang.join("/"), "| chang:", s.ex.chang.join("/"));
}
