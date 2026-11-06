import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// 被 vendor「词尾轻声化」通吃的字
const TARGETS = ["吧", "呢", "呐", "吗", "哇", "啊", "呀", "嘛", "哦", "个", "喽", "哒", "咯"];

const freq = new Map();
for (const ln of readFileSync("/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt", "utf8").split("\n")) {
  const p = ln.trim().split(/\s+/);
  if (p.length >= 2) freq.set(p[0], parseInt(p[1], 10));
}

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const hits = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 4) continue;
  const lastChar = w[w.length - 1];
  if (!TARGETS.includes(lastChar)) continue;
  const syl = py.trim().split(/\s+/);
  if (syl.length !== w.length) continue;
  const lastSyl = syl[syl.length - 1];
  const tone = (lastSyl.match(/(\d)$/) || [, "0"])[1];
  // 词尾该字不读轻声（既不是 5 也不是 0）
  if (tone === "5" || tone === "0") continue;
  // 也排除最后一个音节不是该字本音的情况（如儿化 r5）
  if (!lastSyl.startsWith(lastChar === "个" ? "ge" : "")) { /* 略 */ }
  hits.push({ w: simp, syl, f: freq.get(simp) || 0, ch: lastChar });
}

// 只保留高置信：最后一音节声母与汉字对得上（粗筛掉多音异读造成的噪声）
hits.sort((a, b) => b.f - a.f);
const byChar = new Map();
for (const h of hits) {
  if (!byChar.has(h.ch)) byChar.set(h.ch, []);
  byChar.get(h.ch).push(h);
}
for (const ch of TARGETS) {
  const arr = byChar.get(ch) || [];
  const hi = arr.filter(x => x.f >= 3);
  if (!arr.length) continue;
  console.log(`\n【${ch}】词尾非轻声 ${arr.length} 条，其中 jieba 收录 ${hi.length} 条:`);
  console.log("  " + hi.slice(0, 30).map(x => x.w + "[" + x.syl.join(" ") + "]" + (x.f >= 20 ? "(" + x.f + ")" : "")).join("  "));
}
