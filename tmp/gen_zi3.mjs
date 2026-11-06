// 枚举「X子」中"子"应为全三声(zǐ)的词语：*2 *3 / *4 *3 / *1 *3 …
import { readFileSync } from "node:fs";
import { pinyin } from "pinyin-pro";

const DICT = "/home/v/.local/lib/python3.14/site-packages/jieba/dict.txt";
const PATCH = "/home/v/.local/project/midu_unified_rule/conf/rule_patch.txt";
const VENDOR = "/home/v/.local/project/midu_unified_rule/conf/unified_rule_vendor.txt";

const freq = new Map();
for (const line of readFileSync(DICT, "utf8").split("\n")) {
  const p = line.split(" ");
  if (p.length < 2) continue;
  freq.set(p[0], Number(p[1]) || 0);
}
const existing = new Set();
for (const f of [PATCH, VENDOR]) {
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const key = line.split("\t")[0]?.trim();
    if (key && key.length >= 2 && !key.startsWith("#") && !key.startsWith("移除") && !key.startsWith("新增")) existing.add(key);
  }
}

const rows = [];
for (const [word, f] of freq) {
  if (word.length !== 2 || !word.endsWith("子")) continue;
  if (!/^[\u4e00-\u9fff][\u4e00-\u9fff]$/.test(word)) continue;
  const syl = pinyin(word, { toneType: "num", type: "array", heteronym: false });
  if (syl.length !== 2) continue;
  const t1 = Number(syl[0].slice(-1)), t2 = Number(syl[1].slice(-1));
  if (t2 !== 3) continue;              // 只取"子"读全三声的
  rows.push({ word, f, p1: syl[0], t1, p2: syl[1], dup: existing.has(word) });
}
rows.sort((a, b) => b.f - a.f);
console.log("候选总数:", rows.length);
for (const r of rows) console.log(`${r.word}\t${r.f}\t${r.p1} ${r.p2}\t${r.dup ? "已存在" : ""}`);
