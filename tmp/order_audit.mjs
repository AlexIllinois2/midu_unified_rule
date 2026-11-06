import { readFileSync } from "node:fs";

const lines = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.trim());

function parse(ln) {
  const p = ln.split("\t");
  const key = p[0];
  const rest = p.slice(2).join("\t").split("#")[0].trim();
  if (!rest) return null;
  const tok = rest.split(/\s+/)[0].replace(/^!+/, "");
  return { key, type: tok.split("(")[0], cond: rest, line: ln };
}

const groups = new Map();
for (const ln of lines) {
  const r = parse(ln);
  if (!r) continue;
  if (!groups.has(r.key)) groups.set(r.key, []);
  groups.get(r.key).push(r);
}

/** 纯通配：TEXT((X)) —— 括号里没有任何上下文，只有它自己 */
function isBare(cond, key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = cond.match(/^TEXT\((.*)\)$/s);
  if (!m) return false;
  return new RegExp("^\\(+\\s*" + esc + "\\s*\\)+$").test(m[1].trim());
}

const risky = [];
for (const [key, arr] of groups) {
  const texts = arr.filter(r => r.type === "TEXT");
  if (texts.length < 2) continue;
  const bareIdx = texts.findIndex(r => isBare(r.cond, key));
  if (bareIdx < 0) continue;
  const after = texts.slice(bareIdx + 1);
  if (!after.length) continue; // 通配在最后，安全
  // 后面是否还有「具体」规则
  const specific = after.filter(r => !isBare(r.cond, key));
  if (specific.length) risky.push({ key, bare: texts[bareIdx], specific });
}

risky.sort((a, b) => b.specific.length - a.specific.length);
console.log("=== 危险顺序：纯通配 TEXT((X)) 排在具体上下文规则之前 ===\n");
let total = 0;
for (const r of risky) {
  total += r.specific.length;
  console.log(`【${r.key}】通配：${r.bare.line.trim()}`);
  for (const s of r.specific.slice(0, 4)) console.log("    ⚠ " + s.line.trim());
  if (r.specific.length > 4) console.log(`    …另 ${r.specific.length - 4} 条`);
  console.log();
}
console.log(`合计 ${risky.length} 个 key、${total} 条具体规则可能被通配遮蔽`);
