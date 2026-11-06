// 枚举「三声字 + 子」的正常词语，生成 word 级规则候选（只打印，不写文件）
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

// 补丁/vendor 里已有的词级规则 key
const existing = new Set();
for (const f of [PATCH, VENDOR]) {
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const key = line.split("\t")[0]?.trim();
    if (key && key.length >= 2 && !key.startsWith("#")) existing.add(key);
  }
}

const seen = new Set();
const rows = [];
for (const [word, f] of freq) {
  if (word.length !== 2 || !word.endsWith("子")) continue;
  const ch = word[0];
  if (!/[\u4e00-\u9fff]/.test(ch)) continue;
  if (seen.has(word)) continue;
  seen.add(word);
  const syl = pinyin(word, { toneType: "num", type: "array", heteronym: false });
  if (syl.length !== 2) continue;
  const t1 = Number(syl[0].slice(-1));
  if (t1 !== 3) continue;                       // 只取三声开头
  if (!/^[a-z]+5?$/.test(syl[1].replace(/\d/g, ""))) continue;
  rows.push({ word, f, first: syl[0], second: syl[1] });
}

rows.sort((a, b) => b.f - a.f);
console.log("候选总数:", rows.length);
for (const r of rows) {
  console.log(`${r.word}\t${r.f}\t${r.first}\t${r.second}\t${existing.has(r.word) ? "已存在" : ""}`);
}
