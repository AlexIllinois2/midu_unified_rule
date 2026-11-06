// 扫「裸词掉默认读法」隐患：厂商规则只在「词+后缀」长模式里生效，
// 该词单独出现时没有规则覆盖，于是回落到词典默认读音。
// 典型：娜 nuo2 TEXT(婀(娜)多姿) —— 裸的「婀娜」无人管 → e1 na4
import { readFileSync } from "node:fs";

const ROOT = "/home/v/.local/project/midu_unified_rule";
const FILES = [`${ROOT}/conf/unified_rule_vendor.txt`, `${ROOT}/conf/rule_patch.txt`];
const DICT = "/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt";

const freq = new Map();
for (const line of readFileSync(DICT, "utf8").split("\n")) {
  const p = line.split(" ");
  if (p.length >= 2) freq.set(p[0], Number(p[1]) || 0);
}

const HAN = /[\u4e00-\u9fa5]/;
const lines = [];
for (const f of FILES) {
  const src = f.includes("patch") ? "patch" : "vendor";
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim() || line.startsWith("#")) return;
    const c = line.split("\t");
    if (c.length < 3) return;
    const key = c[0].trim();
    const pinyin = c[1].trim();
    const m = c[2].trim().match(/^TEXT\((.*)\)$/);
    if (!m) return;
    lines.push({ src, no: i + 1, key, pinyin, pat: m[1], raw: line });
  });
}

// 模式 → 可运行正则（捕获组转非捕获，用于覆盖判定）
function toRegex(pat) {
  try {
    return new RegExp(pat.replace(/\((?!\?)/g, "(?:"));
  } catch {
    return null;
  }
}

const compiled = lines.map((r) => ({ ...r, re: toRegex(r.pat) }));

// 判定：字符串 s 中 idx 位置的 key 是否被某条规则覆盖
function covered(s, idx, key) {
  for (const r of compiled) {
    if (!r.re) continue;
    if (r.key !== key && !s.startsWith(r.key, idx)) continue;
    if (r.key !== key) continue;
    r.re.lastIndex = 0;
    let m;
    const re = new RegExp(r.re.source, "g");
    while ((m = re.exec(s))) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (m.index <= idx && m.index + m[0].length >= idx + key.length) return r;
      if (m.index > idx) break;
    }
  }
  return null;
}

const hits = [];
for (const r of lines) {
  const kp = r.pat.indexOf(`(${r.key})`);
  if (kp < 0) continue;
  const before = r.pat.slice(0, kp);
  const after = r.pat.slice(kp + r.key.length + 2);

  // 取 (key) 前紧邻的连续汉字
  let p = before.length;
  while (p > 0 && HAN.test(before[p - 1])) p--;
  const prefix = before.slice(p);
  if (!prefix) continue;
  if (/[\[\]|?*{}^$\\]/.test(prefix)) continue; // 前缀含正则元字符，跳过
  // 前缀前一个字符若是 ']' 说明来自字符表，跳过
  if (p > 0 && /[\]|]/.test(before[p - 1])) continue;

  // (key) 之后必须还有内容，才是「词+后缀」结构
  const tail = after.replace(/^\?\)?/, "").replace(/^\?/, "");
  if (!/[\]\)\u4e00-\u9fa5\[\]|]/.test(tail)) continue;
  // 尾部只是锚点/纯量词则跳过
  if (/^[\)\?\[\]\|\^\$]*$/.test(tail)) continue;

  const cand = prefix + r.key;
  if (!cand || cand.length < 2 || cand.length > 4) continue;
  if (!/^[\u4e00-\u9fa5]+$/.test(cand)) continue;
  const fq = freq.get(cand) || 0;
  if (fq <= 0) continue; // 词典里不是独立词

  // 该候选词里 key 的位置
  const idx = cand.lastIndexOf(r.key);
  if (idx < 0) continue;
  const cover = covered(cand, idx, r.key);
  if (cover) continue; // 已有规则覆盖其裸形

  hits.push({ cand, key: r.key, pinyin: r.pinyin, fq, src: r.src, no: r.no, pat: r.pat, raw: r.raw });
}

hits.sort((a, b) => b.fq - a.fq);
console.log(`候选总数: ${hits.length}\n`);
for (const h of hits.slice(0, 80)) {
  console.log(`${h.cand}\t${h.key}=${h.pinyin}\tfreq=${h.fq}\t[${h.src}:${h.no}] ${h.pat}`);
}
