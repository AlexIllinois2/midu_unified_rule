// 比较两套方案在规则条数上的真实差距
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const zi5 = [], zi3 = [];
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const simp = m[2], py = m[3], def = m[4];
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 4 || w[w.length - 1] !== "子") continue;
  const syl = py.trim().split(/\s+/);
  if (syl.length !== w.length) continue;
  const item = { w: simp, syl, prev: w[w.length - 2] };
  if (syl[syl.length - 1] === "zi5") zi5.push(item);
  if (syl[syl.length - 1] === "zi3") zi3.push(item);
}
const tone = s => (s.match(/(\d)$/) || [, "0"])[1];

const prevOf5 = new Set(zi5.map(x => x.prev));          // 合并字符表需要多少字
const victims = zi5.filter(x => tone(x.syl[x.syl.length - 2]) === "3"); // 三三受害
const conflict = zi3.filter(x => prevOf5.has(x.prev));   // 字符表会误伤的 zǐ 词

console.log("A方案（留厂商规则）需要写：");
console.log("  轻声受害 @" + victims.length + " + 全声子 " + zi3.length + " = " + (victims.length + zi3.length) + " 条");
console.log("\nB方案（删厂商规则 + 合并字符表）需要写：");
console.log("  1 条字符表规则，表内字数 = " + prevOf5.size);
console.log("  但表会误伤 " + conflict.length + "/" + zi3.length + " 个 zǐ 词 → 仍需 " + conflict.length + " 条例外规则");
console.log("  三三受害 " + victims.length + " 条字符表救不了 → 仍需 " + victims.length + " 条");
console.log("  合计 " + (1 + conflict.length + victims.length) + " 条");
