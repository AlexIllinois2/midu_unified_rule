// 本轮新增规则的误伤回归测试：正例必须命中，反例必须不命中
import { readFileSync } from "node:fs";

const SRC = "/home/v/.local/project/midu_unified_rule/conf/conf_tmp_check.txt";

// 从 unified_rule.txt 里取出这几条规则，用 JS 正则模拟 find 语义
const rules = [];
for (const line of readFileSync("/home/v/.local/project/midu_unified_rule/conf/unified_rule.txt", "utf8").split("\n")) {
  const c = line.split("\t");
  if (c.length < 3) continue;
  if (!["跑", "虎", "撮", "小", "若", "牟", "尺", "刹", "埔", "娜"].includes(c[0])) continue;
  const m = c[2].trim().match(/^TEXT\((.*)\)$/);
  if (!m) continue;
  rules.push({ key: c[0], pinyin: c[1], pat: m[1] });
}

function hit(text) {
  const out = [];
  for (const r of rules) {
    let re;
    try { re = new RegExp(r.pat); } catch { continue; }
    const idx = text.indexOf(r.key);
    if (idx < 0) continue;
    const m = re.exec(text);
    if (!m) continue;
    if (m.index <= idx && m.index + m[0].length >= idx + r.key.length) out.push(`${r.key}=${r.pinyin}  << ${r.pat}`);
  }
  return out;
}

const cases = [
  // [文本, 期望命中的 key（null = 不应命中任何规则）]
  ["那只老虎跑山里去了", null],
  ["老虎跑了", null],
  ["老虎跑得快", null],
  ["小虎跑过来", null],
  ["虎跑泉的水很甜", "跑"],
  ["我们去虎跑吧", "跑"],
  ["虎跑是个好地方", "跑"],
  ["在虎跑住了一晚", "跑"],
  ["一小撮盐", "撮"],
  ["一小撮。", "撮"],
  ["统一撮合他们", null],
  ["一撮毛", "撮"],
  ["兰若寺的钟声", "若"],
  ["他住进了兰若", "若"],
  ["木兰若是知道", null],
  ["木兰若干年后", null],
  ["阿兰若", "若"],
  ["中牟县", "牟"],
  ["途中牟取暴利", null],
  ["中牟人", "牟"],
  ["工尺谱", "尺"],
  ["施工尺寸要求高", null],
  ["工尺的记法", "尺"],
  ["婀娜多姿", "娜"],
  ["刹那", "刹"],
  ["古刹", "刹"],
  ["急刹车", null],
  ["黄埔军校", "埔"],
  ["广东大埔", null],
];

let bad = 0;
for (const [text, want] of cases) {
  const h = hit(text);
  const keys = h.map((x) => x.split("=")[0]);
  const ok = want === null ? keys.length === 0 : keys.includes(want);
  if (!ok) {
    bad++;
    console.log(`✗ ${text}  期望=${want ?? "无规则"}  实际=${keys.join(",") || "无"}`);
    h.forEach((x) => console.log(`    ${x}`));
  } else {
    console.log(`✓ ${text}  → ${keys.join(",") || "无规则"}`);
  }
}
console.log(bad === 0 ? "\n全部通过" : `\n${bad} 条不通过`);
