import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const lines = raw.split("\n");
const sets = { zi5: [], zi3: [] };
for (const rawline of lines) {
  const line = rawline.trim();
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/);
  if (!m) continue;
  const [, , simp, py, def] = m;
  if (/variant of|also written|old variant/.test(def)) continue;
  const syl = py.trim().split(/\s+/);
  const w = [...simp];
  if (w[w.length - 1] !== "子") continue;
  if (w.length < 2 || w.length > 4) continue;
  const last = syl[syl.length - 1];
  if (last === "zi5") sets.zi5.push({ w: simp, syl });
  else if (last === "zi3") sets.zi3.push({ w: simp, syl });
}
const tone = s => { const d = s.match(/(\d)$/); return d ? d[1] : "0"; };
const ton3 = arr => arr.filter(x => tone(x.syl[0]) === "3");
console.log("轻声子(zi5) 词条总数:", sets.zi5.length, " | 首字三声:", ton3(sets.zi5).length);
console.log("全声子(zi3) 词条总数:", sets.zi3.length, " | 首字三声:", ton3(sets.zi3).length);
console.log("\n--- 首字三声的轻声子(需 *3 *5 修) ---");
console.log(ton3(sets.zi5).map(x => x.w + "/" + x.syl.join(" ")).join("  "));
