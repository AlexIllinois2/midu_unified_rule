// 校验：182 个受害词现在是否都被「词级规则」或「子前字规则」覆盖
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const victims = [];
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
  if (syl[syl.length - 1] !== "zi5") continue;
  if ((syl[syl.length - 2].match(/(\d)$/) || [, "0"])[1] !== "3") continue;
  victims.push({ w: simp, prev: w[w.length - 2] });
}

const out = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(Boolean);
const wordKeys = new Set();
const prevRule = new Set();
for (const ln of out) {
  const p = ln.split("\t");
  const k = p[0], v = p[1] ?? "", c = p.slice(2).join("\t");
  if (k.endsWith("子")) wordKeys.add(k);
  if (k.length === 1 && v.trim() === "*3" && c.includes(`((${k})子)`)) prevRule.add(k);
}
const miss = victims.filter(v => !wordKeys.has(v.w) && !prevRule.has(v.prev));
console.log("受害词 " + victims.length);
console.log("词级规则覆盖 " + victims.filter(v => wordKeys.has(v.w)).length);
console.log("前字规则覆盖 " + victims.filter(v => !wordKeys.has(v.w) && prevRule.has(v.prev)).length);
console.log("仍未覆盖 " + miss.length + ": " + miss.map(v => v.w).join(" "));
