import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const er2 = [];
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
  if (syl[syl.length - 1] === "er2") er2.push({ w: simp, syl });
}
const patch = readFileSync("conf/rule_patch.txt", "utf8");
const vendor = readFileSync("conf/unified_rule_vendor.txt", "utf8");
// 已被 TEXT 上下文规则里的字符表"疑似覆盖"的字（粗判：儿前面那个字出现在某条 儿 er2 规则的字符表里）
const ctx = [...patch.matchAll(/^儿\ter2\tTEXT\(\((.*)\)$/gm)].map(m => m[1]).join("");
console.log("补丁现有「儿 er2」上下文规则:", ctx ? "有 " + (ctx.length) + " 字符的描述" : "无");
console.log("\n=== 57 条 er2 词：是否有任何 儿 规则把它救回来 ===");
const ruleKeys = new Set((patch + "\n" + vendor).split("\n").filter(l => l.includes("\t")).map(l => l.split("\t")[0]));
const covered = [], miss = [];
for (const e of er2) {
  if (ruleKeys.has(e.w)) covered.push(e.w); else miss.push(e);
}
console.log("有词级规则:", covered.length, covered.join(" "));
console.log("\n无词级规则:", miss.length);
console.log(miss.map(x => x.w + "[" + x.syl.join(" ") + "]").join("  "));
