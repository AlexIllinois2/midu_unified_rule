import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

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
  if (syl.length !== w.length) continue; // erhua/ü 记法导致的错位跳过
  const last = syl[syl.length - 1];
  if (last === "zi5") zi5.push({ w: simp, syl });
  if (last === "zi3") zi3.push({ w: simp, syl });
}

const patch = readFileSync("conf/rule_patch.txt", "utf8").split("\n");
const keys = new Set(patch.filter(l => l.includes("\t")).map(l => l.split("\t")[0]));
const tone = s => { const d = s.match(/(\d)$/); return d ? d[1] : "0"; };

// 受害条件：子前一个音节是三声（三三变调才触发）
const victim = zi5.filter(x => tone(x.syl[x.syl.length - 2]) === "3");
const miss = victim.filter(x => !keys.has(x.w));
const chars = new Set(victim.map(x => [...x.w][x.w.length - 2]));

console.log("【A】轻声子词条总数 (zi5): " + zi5.length);
console.log("【B】其中子前音节为三声 = 真正被三三变调误伤: " + victim.length + "  已覆盖 " + (victim.length - miss.length) + "  未覆盖 " + miss.length);
console.log("【C】全声子词条总数 (zi3): " + zi3.length + "  已覆盖 " + (zi3.length - zi3.filter(x => !keys.has(x.w)).length) + "  未覆盖 " + zi3.filter(x => !keys.has(x.w)).length);
console.log("【D】B 集合里不重复的「子前字」个数: " + chars.size);
console.log("\n未覆盖的 B 集词: " + miss.map(x => x.w).join(" "));
