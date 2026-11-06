import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const rules = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.startsWith("观\t"))
  .map(l => { const p = l.split("\t"); const src = p.slice(2).join("\t").replace(/^TEXT\((.*)\)$/, "$1"); return { py: p[1], re: new RegExp(src, "g") }; });
function judge(s, pos) {
  const hits = [];
  for (const r of rules) {
    r.re.lastIndex = 0; let m;
    while ((m = r.re.exec(s))) {
      if (!m[0].length) { r.re.lastIndex++; continue; }
      if (m.index + m[0].indexOf("观") === pos) { hits.push({ py: r.py, len: m[0].length }); break; }
      if (r.re.lastIndex <= m.index) break;
    }
  }
  hits.sort((a, b) => b.len - a.len);
  return hits[0] ? hits[0].py : "guan1";
}
const freq = new Map();
for (const ln of readFileSync("/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt", "utf8").split("\n")) {
  const p = ln.trim().split(/\s+/); if (p.length >= 2) freq.set(p[0], parseInt(p[1], 10));
}
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const wrong = [], miss = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim(); if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/); if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  const idx = w.indexOf("观"); if (idx < 0 || w.length > 4) continue;
  const syl = py.trim().split(/\s+/); if (syl.length !== w.length) continue;
  const t = syl[idx]; if (!/^guan[14]$/.test(t)) continue;
  const got = judge(simp, idx);
  if (got === t) continue;
  const rec = { w: simp, want: t, got, f: freq.get(simp) || 0 };
  (t === "guan1" ? wrong : miss).push(rec);
}
wrong.sort((a, b) => b.f - a.f); miss.sort((a, b) => b.f - a.f);
console.log("【误伤】本该 guān 被改成 guàn:", wrong.length);
for (const r of wrong.slice(0, 25)) console.log("  ", r.w, "f=" + r.f);
console.log("\n【漏判】本该 guàn 仍走 guān:", miss.length);
for (const r of miss) console.log("  ", r.w, "f=" + r.f);
