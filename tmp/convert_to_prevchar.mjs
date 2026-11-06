// 把「三声+子(轻声)」的词级规则改写成「子前字」规则
// 前字规则形如：  X<TAB>*3<TAB>TEXT((X)子)
// 一条管所有以「X子」结尾的词（含词典外的生造词），同时删掉被它覆盖的词级规则
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// ── 1. 从 CC-CEDICT 取 182 个受害词的「子前字」集合 ─────────────────────
const raw = execSync("gzip -dc /tmp/cedict.gz", { maxBuffer: 1 << 28 }).toString("utf8");
const prevs = new Set();
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
  const t = (syl[syl.length - 2].match(/(\d)$/) || [, "0"])[1];
  if (t !== "3") continue;
  prevs.add(w[w.length - 2]);
}

// ── 2. 排除表 ────────────────────────────────────────────────────────────
const POLY = new Set(["卡", "角", "堡", "伯", "掸", "蹶", "色", "笼", "马", "尾", "崴", "挑", "把", "股"]);
const COVERED = new Set(["拶", "种", "爪", "本"]);
const RARE = new Set(["侉", "尕", "膙", "蟢", "虮", "趼", "馃", "饵", "袄", "埂", "广", "缕", "铆", "抿"]);
const skip = new Set([...POLY, ...COVERED, ...RARE]);
const convert = [...prevs].filter(c => !skip.has(c)).sort((a, b) => a.localeCompare(b, "zh"));

// vendor 里明显写错的规则（把“嗓”钉成轻声）
const REMOVE_VENDOR = ["嗓\tsang5\tTEXT((嗓)子)"];

// ── 3. 改写 rule_patch.txt ───────────────────────────────────────────────
const P = "conf/rule_patch.txt";
const lines = readFileSync(P, "utf8").split("\n");

const rmIdx = lines.findIndex(l => l.startsWith("移除:"));
const addIdx = lines.findIndex(l => l.startsWith("新增:"));
if (rmIdx < 0 || addIdx < 0) throw new Error("找不到 移除:/新增: 区块");

// 3a. 移除区块追加
let rmEnd = addIdx;
while (rmEnd - 1 > rmIdx && !lines[rmEnd - 1].trim()) rmEnd--; // 跳过尾部空行
const existingRm = new Set(lines.slice(rmIdx + 1, addIdx).map(l => l.trim()));
const toRemove = REMOVE_VENDOR.filter(l => !existingRm.has(l));
lines.splice(rmEnd, 0, ...toRemove);

// 3b. 删除被前字规则覆盖的词级规则（只在新增区块内找）
const conv = new Set(convert);
let removedWordRules = 0;
const out = [];
let inAdd = false;
for (const ln of lines) {
  if (ln.startsWith("新增:")) { inAdd = true; out.push(ln); continue; }
  if (inAdd && ln.trim() && !ln.startsWith("移除:") && !ln.startsWith("新增:")) {
    const parts = ln.split("\t");
    const key = parts[0] ?? "";
    const last = (parts[1] ?? "").split(/\s+/).filter(Boolean).pop() ?? "";
    if (key.length >= 2 && key.endsWith("子") && last === "*5" && conv.has(key[key.length - 2])) {
      removedWordRules++;
      continue;
    }
  }
  out.push(ln);
}

// 3c. 前字规则追加到末尾
const rules = convert.map(c => `${c}\t*3\tTEXT((${c})子)`);
writeFileSync(P, [...out, ...rules].join("\n"), "utf8");

console.log("前字规则新增: " + rules.length + " 条");
console.log("删除冗余词级规则: " + removedWordRules + " 条");
console.log("移除 vendor 行: " + toRemove.length + " 条");
console.log("前字清单: " + convert.join(" "));
