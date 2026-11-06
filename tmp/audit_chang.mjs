import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const rules = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.startsWith("长\t"))
  .map(l => { const p = l.split("\t"); const src = p.slice(2).join("\t").replace(/^TEXT\((.*)\)$/, "$1"); return { py: p[1], re: new RegExp(src, "g"), wild: src === "(长)" }; });
function judge(s, pos) {
  const hits = [];
  for (const r of rules) {
    r.re.lastIndex = 0; let m;
    while ((m = r.re.exec(s))) {
      if (!m[0].length) { r.re.lastIndex++; continue; }
      if (m.index + m[0].indexOf("长") === pos) { hits.push({ py: r.py, len: m[0].length, wild: r.wild }); break; }
      if (r.re.lastIndex <= m.index) break;
    }
  }
  hits.sort((a, b) => (a.wild ? 1 : 0) - (b.wild ? 1 : 0) || b.len - a.len);
  return hits[0] ? hits[0].py : null;
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
  const w = [...simp]; if (w.length < 2 || w.length > 3) continue;
  const idx = w.indexOf("长"); if (idx !== 0) continue;
  const syl = py.trim().split(/\s+/); if (syl.length !== w.length) continue;
  const t = syl[0]; if (!/^(chang|zhang)\d$/.test(t)) continue;
  const got = judge(simp, 0);
  if (!got) continue;
  if (got !== t) {
    const rec = { w: simp, want: t, got, f: freq.get(simp) || 0 };
    if (t.startsWith("chang")) wrong.push(rec); else miss.push(rec);
  }
}
wrong.sort((a, b) => b.f - a.f); miss.sort((a, b) => b.f - a.f);
console.log("【误伤】本该 cháng 却被改成 zhǎng:", wrong.length);
for (const r of wrong) console.log("  ", r.w, "want", r.want, "got", r.got, "f=" + r.f);
console.log("\n【漏判】本该 zhǎng 但仍走 cháng:", miss.length);
for (const r of miss) console.log("  ", r.w, "want", r.want, "got", r.got, "f=" + r.f);
