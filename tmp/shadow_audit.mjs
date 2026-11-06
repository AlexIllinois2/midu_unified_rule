import { readFileSync } from "node:fs";

const lines = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.trim());

function parse(ln) {
  const p = ln.split("\t");
  const key = p[0];
  const py = (p[1] || "").trim();
  const rest = p.slice(2).join("\t").split("#")[0].trim();
  if (!rest) return { key, py, type: "NONE", cond: "" };
  const tok = rest.split(/\s+/)[0].replace(/^!+/, "");
  return { key, py, type: tok.split("(")[0], cond: rest };
}

const groups = new Map();
for (const ln of lines) {
  const r = parse(ln);
  if (!r.key) continue;
  if (!groups.has(r.key)) groups.set(r.key, []);
  groups.get(r.key).push({ ...r, line: ln });
}

/**
 * 宽条件判定：WORD_INSIDE(-1)/其它位置，且【不】含「WORD_INSIDE(0)」这种单字词限定，
 * 也不含 PINYIN/POS 附加条件。只有这种才是「词尾通吃」。
 */
function isBroad(cond) {
  if (!/WORD_INSIDE\(-?\d+\)/.test(cond)) return false;
  if (/PINYIN\(|POS\(/.test(cond)) return false;
  // 出现非否定的 WORD_INSIDE(0) => 单字词限定，窄条件
  if (/(^|\t| )WORD_INSIDE\(0\)/.test(cond)) return false;
  return true;
}

/** 判断 TEXT 规则里 key 是否处于「末位」（其后无实字符）→ 才会被末位宽规则遮蔽 */
function keyAtTail(key, cond) {
  const m = cond.match(/^TEXT\((.*)\)$/s);
  if (!m) return null; // 非 TEXT
  const body = m[1];
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("\\(" + esc + "\\)");
  const idx = body.search(re);
  if (idx < 0) return null; // 找不到 (key)
  const after = body.slice(idx + key.length + 2);
  // 去掉结尾的多余右括号后看是否还有内容
  const tail = after.replace(/\)+$/, "");
  if (tail.trim() === "") return true;
  // 若只剩 |或) 也算空
  return false;
}

const report = [];
for (const [key, arr] of groups) {
  if (arr.length < 2) continue;
  const bIdx = arr.findIndex(r => r.type === "WORD_INSIDE" && isBroad(r.cond));
  if (bIdx < 0) continue;
  const broad = arr[bIdx];
  const shadow = [];
  const alive = [];
  for (let i = bIdx + 1; i < arr.length; i++) {
    const r = arr[i];
    if (r.type !== "TEXT") continue;
    const tail = keyAtTail(key, r.cond);
    if (tail === true) shadow.push(r);
    else alive.push(r);
  }
  if (!shadow.length) continue;
  report.push({ key, broad, shadow, alive });
}

report.sort((a, b) => b.shadow.length - a.shadow.length);
let total = 0, aliveTotal = 0;
console.log("=== 真正被遮蔽的死规则（目标字在末位、且宽规则无单字词限定）===\n");
for (const r of report) {
  total += r.shadow.length;
  aliveTotal += r.alive.length;
  console.log(`【${r.key}】${r.broad.line.trim()}`);
  console.log(`  真死 ${r.shadow.length} 条：`);
  for (const s of r.shadow) console.log("    ✗ " + s.line.trim());
  if (r.alive.length) {
    console.log(`  仍有效 ${r.alive.length} 条（目标字不在末位，不冲突）：`);
    for (const s of r.alive.slice(0, 5)) console.log("    ✓ " + s.line.trim());
    if (r.alive.length > 5) console.log(`    …另 ${r.alive.length - 5} 条`);
  }
  console.log();
}
console.log(`合计死规则 ${total} 条（涉及 ${report.length} 个 key），误报排除的有效规则 ${aliveTotal} 条`);
