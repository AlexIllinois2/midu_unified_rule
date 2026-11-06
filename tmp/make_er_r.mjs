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
const r5 = [];
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
  if (syl[syl.length - 1] !== "r5") continue;
  r5.push({ w: simp, syl, f: f(simp) });
}

const patch = readFileSync("conf/rule_patch.txt", "utf8");
const vendor = readFileSync("conf/unified_rule_vendor.txt", "utf8");
const exist = new Set(
  (patch + "\n" + vendor).split("\n").filter(l => l.includes("\t")).map(l => l.split("\t")[0])
);
// 已在补丁里以「儿」字出现的词也算已处理
const patchText = patch;

r5.sort((a, b) => b.f - a.f);
const MINF = parseInt(process.argv[2] || "50", 10);
let n = 0;
const skipped = [];
for (const x of r5) {
  if (x.f < MINF) continue;
  if (exist.has(x.w)) { skipped.push(x.w); continue; }
  if (/[一不]/.test(x.w)) { skipped.push(x.w + "(变调)"); continue; }
  const syl = x.syl;
  // 倒数第二音节是「儿」本身（如 女儿 r5 变体）则跳过
  if (syl[syl.length - 2] === "er" || /^r/.test(syl[syl.length - 2])) { skipped.push(x.w + "(异常)"); continue; }
  // 词的字数必须等于音节数
  if ([...x.w].length !== syl.length) { skipped.push(x.w + "(音节数不符)"); continue; }
  // 儿化写拼音：把前一个音节加 r，儿本身 none5
  const prev = syl[syl.length - 2];
  if (/[5]$/.test(prev)) { skipped.push(x.w + "(前字轻声)"); continue; }
  const body = prev.slice(0, -1) + "r" + prev.slice(-1);
  const tones = [...syl.slice(0, -2), body, "none5"];
  n++;
  console.log(x.w + "\t" + tones.join(" ") + "\tTEXT((" + x.w + "))\t# " + x.f);
}
console.error(`f>=${MINF}：生成 ${n} 条，跳过 ${skipped.length} 条 → ${skipped.join(" ")}`);
