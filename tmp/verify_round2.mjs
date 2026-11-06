// 本轮（了/弹/几/主）规则的误伤回归测试
import { readFileSync } from "node:fs";

const rules = [];
for (const line of readFileSync("/home/v/.local/project/midu_unified_rule/conf/unified_rule.txt", "utf8").split("\n")) {
  const c = line.split("\t");
  if (c.length < 3) continue;
  if (!["了", "弹", "几", "主"].includes(c[0])) continue;
  const m = c[2].trim().match(/^TEXT\((.*)\)$/);
  if (!m) continue;
  rules.push({ key: c[0], pinyin: c[1], pat: m[1] });
}

function hits(text, key) {
  const out = [];
  const idx = text.indexOf(key);
  if (idx < 0) return out;
  for (const r of rules) {
    if (r.key !== key) continue;
    let re;
    try { re = new RegExp(r.pat); } catch { continue; }
    const g = new RegExp(re.source, "g");
    let m;
    while ((m = g.exec(text))) {
      if (m[0].length === 0) { g.lastIndex++; continue; }
      if (m.index <= idx && m.index + m[0].length >= idx + key.length) {
        out.push(r.pinyin);
        break;
      }
      if (m.index > idx) break;
    }
  }
  return out;
}

const cases = [
  // [句子, 字, 期望拼音 | null=不应命中任何 TEXT 规则]
  ["一曲终了", "了", "liao3"],
  ["临了也没说", "了", "liao3"],
  ["末了还是走了", "了", "liao3"],
  ["他走了", "了", null],
  ["天亮了", "了", null],
  ["吃了一碗饭", "了", null],
  ["这一曲弹的是钢琴", "弹", "tan2"],
  ["他弹着吉他", "弹", "tan2"],
  ["弹了一曲", "弹", "tan2"],
  ["弹奏起来", "弹", "tan2"],
  ["子弹着火了", "弹", null],
  ["炸弹的威力", "弹", null],
  ["一箱子子弹", "弹", null],
  ["导弹", "弹", null],
  ["行情反弹", "弹", "tan2"],
  ["几近完美", "几", "ji1"],
  ["几乎", "几", "ji1"],
  ["几率很低", "几", "ji1"],
  ["茶几上", "几", "ji1"],
  ["几个", "几", null],
  ["几何", "几", null],
  ["好主意", "主", "*2"],
  ["别打这种主意", "主", "*2"],
  ["主子", "主", "*3"],
  ["民主", "主", null],
];

let bad = 0;
for (const [text, key, want] of cases) {
  const h = hits(text, key);
  const ok = want === null ? h.length === 0 : h.includes(want);
  if (!ok) {
    bad++;
    console.log(`✗ ${text}  字=${key}  期望=${want ?? "不命中"}  实际=${h.join(",") || "不命中"}`);
  } else {
    console.log(`✓ ${text}  字=${key}  → ${h.join(",") || "不命中"}`);
  }
}
console.log(bad === 0 ? "\n全部通过" : `\n${bad} 条不通过`);
