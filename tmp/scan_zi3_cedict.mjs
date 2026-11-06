// 用 CC-CEDICT 扫出所有「末字子读 zi3」的词，生成词级规则
// 规则：仅收录 CC-CEDICT 中该词的所有读音都标 zi3 的（排除本身有歧义的）
// 声调按表层实际读音给（三三相连前字变二声，因为规则跑在变调之后）
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DICT = "/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt";
const PATCH = "/home/v/.local/project/midu_unified_rule/conf/rule_patch.txt";
const VENDOR = "/home/v/.local/project/midu_unified_rule/conf/unified_rule_vendor.txt";

const freq = new Map();
for (const line of readFileSync(DICT, "utf8").split("\n")) {
  const p = line.split(" ");
  if (p.length >= 2) freq.set(p[0], Number(p[1]) || 0);
}

const existing = new Set();
for (const f of [PATCH, VENDOR]) {
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const key = line.split("\t")[0]?.trim();
    if (key && key.length >= 2 && !key.startsWith("#") && !key.includes(":") && !key.includes(" ")) existing.add(key);
  }
}

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString();
// 词 -> 该词所有读音的第二音节真实声调集合
const toneSets = new Map();
const sylls = new Map();
for (const line of raw.split("\n")) {
  if (line.startsWith("#") || !line.trim()) continue;
  const m = line.trim().match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const def = m[4];
  if (/variant of|old variant|archaic variant|also written/i.test(def)) continue; // 跳过异体/别名条目
  const simp = m[2];
  const py = m[3].split(/\s+/);
  if (py.length !== simp.length) continue;           // 跳过儿化/多音不确定的
  if (!simp.endsWith("子")) continue;
  if (simp.length < 2 || simp.length > 4) continue;
  const last = py[py.length - 1];
  const t = Number(last.slice(-1));
  if (!toneSets.has(simp)) toneSets.set(simp, new Set());
  if (!sylls.has(simp)) sylls.set(simp, new Set());
  toneSets.get(simp).add(t);
  sylls.get(simp).add(py.join(" "));
}

const cand = [];
for (const [word, tones] of toneSets) {
  if (tones.size !== 1 || !tones.has(3)) continue;    // 只认唯一读音 zi3
  const patterns = [...sylls.get(word)];
  const py = patterns[0].split(" ");
  const base = py.map(s => Number(s.slice(-1)));
  // 三三变调：前字变二声（表层）
  for (let i = 0; i < base.length - 1; i++) if (base[i] === 3 && base[i + 1] === 3) base[i] = 2;
  cand.push({ word, f: freq.get(word) ?? 0, tones: base.map(t => `*${t}`).join(" "), py: py.join(" ") });
}

const inDict = cand.filter(c => c.f >= 3);
inDict.sort((a, b) => b.f - a.f);
// 过滤：若词尾两字本身在 Cedict 里是轻声(5)，说明该复合词标注可疑，跳过
const lastTwo = (w) => w.slice(-2);
const final = inDict.filter(c => {
  if (c.word.length <= 2) return true;
  const t = toneSets.get(lastTwo(c.word));
  return !(t && t.has(5));
});
console.log("CC-CEDICT 中 zi3 结尾词:", cand.length, " jieba收录:", inDict.length, " 过滤后:", final.length);
let added = 0, skipped = 0;
for (const c of final) {
  if (existing.has(c.word)) { skipped++; continue; }
  added++;
  console.log(`${c.word}\t${c.tones}\tTEXT((${c.word}))\t# ${c.py}\t${c.f}`);
}
console.error(`待新增 ${added} 条，已存在跳过 ${skipped} 条`);
