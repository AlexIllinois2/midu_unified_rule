import { execSync } from "node:child_process";
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const sets = { er2: [], er5: [], r5: [], other: [] };
for (const rl of raw.split("\n")) {
  const line = rl.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const w = [...simp];
  if (w.length < 2 || w.length > 4) continue;
  if (w[w.length - 1] !== "儿") continue;
  const syl = py.trim().split(/\s+/);
  const last = syl[syl.length - 1];
  if (last === "er2") sets.er2.push({ w: simp, syl });
  else if (last === "er5") sets.er5.push({ w: simp, syl });
  else if (last === "r5") sets.r5.push({ w: simp, syl });
  else sets.other.push({ w: simp, syl });
}
console.log("末字为「儿」的 2-4 字词条统计（排除异体）:");
console.log("  er2 全声 ér :", sets.er2.length);
console.log("  er5 轻声 er :", sets.er5.length);
console.log("  r5 儿化韵   :", sets.r5.length);
console.log("  其他读音    :", sets.other.length, sets.other.slice(0,10).map(x=>x.w+"["+x.syl.join(" ")+"]").join(" "));
const tone = s => (s.match(/(\d)$/) || [, "0"])[1];
const prev3 = arr => arr.filter(x => tone(x.syl[x.syl.length - 2]) === "3");
console.log("\ner2 中「儿前音节是三声」(会被三三变调再误伤):", prev3(sets.er2).length,
  " →", prev3(sets.er2).map(x => x.w).join(" "));
console.log("\ner2 全声词条（前 60）:");
console.log(sets.er2.slice(0, 60).map(x => x.w + "[" + x.syl.join(" ") + "]").join("  "));
