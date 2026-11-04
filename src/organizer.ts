// organizer.ts — 整理主脚本（organizer.py 的 TypeScript 重写，逻辑保持一致）：
// 基于 conf/unified_rule_vendor.txt 读入，应用 conf/rule_patch.txt 的 移除/新增，
// 去重、分组、排序，写出 conf/unified_rule.txt。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin } from "pinyin-pro";

// 路径基于脚本所在目录（src/）的上一级，方便随文件夹移动
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
export const SRC = join(ROOT, "conf", "unified_rule.txt");
export const VENDOR = join(ROOT, "conf", "unified_rule_vendor.txt"); // 干净原始源文件，不被修改
export const PATCH = join(ROOT, "conf", "rule_patch.txt"); // 补丁：移除/新增 区块

// 汉字 -> 带数字声调拼音 的缓存（轻声补 5，与补丁记法一致）
const pinyinCache = new Map<string, string>();

/** 把第一列汉字转为带数字声调的拼音（多字词空格分隔），轻声补 '5'。 */
export function keyPinyin(key: string): string {
  const cached = pinyinCache.get(key);
  if (cached !== undefined) return cached;
  const syls: string[] = pinyin(key, { toneType: "num", type: "array", heteronym: false });
  const out: string[] = [];
  for (let s of syls) {
    s = (s || "").trim();
    if (!s) continue;
    const last = s[s.length - 1];
    if (!"12345".includes(last)) s = s + "5"; // 轻声不带数字，补 5
    out.push(s);
  }
  const res = out.join(" ");
  pinyinCache.set(key, res);
  return res;
}

/** rest 为去掉内联注释后的条件部分，返回首个条件类型(取 '(' 之前，并去掉前导 '!')。 */
function firstCondType(rest: string): string {
  const s = rest.trim();
  if (!s) return "OTHER";
  let token = s.split(/\s+/)[0];
  token = token.replace(/^!+/, "");
  const i = token.indexOf("(");
  return i >= 0 ? token.slice(0, i) : token;
}

/** 返回 (char, pinyin, condType, raw) */
function parse(line: string): [string, string, string, string] {
  const raw = line.replace(/\n$/, "");
  const parts = raw.split("\t");
  const char = parts[0] ?? "";
  const pinyinCol = parts.length > 1 ? parts[1] : "";
  const restAll = parts.length > 2 ? parts.slice(2).join("\t") : "";
  const condPart = restAll.split("#")[0]; // 去掉内联注释
  const ctype = firstCondType(condPart);
  return [char, pinyinCol, ctype, raw];
}

// 标题行（移除:/新增:/去重: 等）可能带说明文字，
// 因此按「以标题前缀开头」判定，遇到任意标题即结束当前收集。
const HEADER_PREFIXES = ["移除:", "新增:", "去重:", "分组:", "排序:", "表单定义:", "页面操作:"];

/** 解析 rule_patch.txt 中的 移除:/新增: 区块，返回 (removals 集合, additions 列表)。 */
export function parsePlan(path: string = PATCH): { removals: Set<string>; additions: string[] } {
  const removals = new Set<string>();
  const additions: string[] = [];
  let state: "remove" | "add" | null = null;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const s = line.trim();
    let hit: string | null = null;
    for (const h of HEADER_PREFIXES) {
      if (s === h || s.startsWith(h)) { hit = h; break; }
    }
    if (hit === "移除:") { state = "remove"; continue; }
    if (hit === "新增:") { state = "add"; continue; }
    if (hit !== null) { state = null; continue; } // 其它标题：结束当前收集
    if (state === "remove" && s) removals.add(line.replace(/\n$/, "").replace(/\s+$/, ""));
    else if (state === "add" && s) additions.push(line.replace(/\n$/, "").replace(/\s+$/, ""));
  }
  return { removals, additions };
}

export interface OrganizeStats {
  rawCount: number;
  planRemoved: number;
  planAdded: number;
  dedupRemoved: number;
  afterDedup: number;
  groups: Array<{ name: string; count: number }>;
  outputLines: number;
  removals: string[];
  additions: string[];
}

/** 主流程：应用 rule_patch.txt 并整理 unified_rule.txt。 */
export function applyPlan(): OrganizeStats {
  const { removals, additions } = parsePlan();

  const rawLines = readFileSync(VENDOR, "utf8").split("\n");
  if (rawLines.length && rawLines[rawLines.length - 1] === "") rawLines.pop();
  const rawNonEmpty = rawLines.filter(l => l.trim() !== "");

  // 0) 基于 vendor 应用 rule_patch.txt：先移除指定行，再追加新增行
  let removedPlan = 0;
  const lines: string[] = [];
  for (const ln of rawLines) {
    if (ln.trim() === "") continue;
    const key = ln.replace(/\s+$/, "");
    if (removals.has(key)) { removedPlan += 1; continue; }
    lines.push(ln);
  }
  for (const a of additions) lines.push(a);

  // 1) 去重（按整行 rstrip 后去重，保留首次出现）
  const seen = new Set<string>();
  const deduped: string[] = [];
  let dedupRemoved = 0;
  for (const ln of lines) {
    if (ln.trim() === "") continue; // 跳过纯空行
    const key = ln.replace(/\s+$/, "");
    if (seen.has(key)) { dedupRemoved += 1; continue; }
    seen.add(key);
    deduped.push(ln.replace(/\n$/, ""));
  }

  // 2) 分组
  const groups = new Map<string, Array<[string, string, string]>>();
  for (const ln of deduped) {
    const [char, pinyinCol, ctype, raw] = parse(ln);
    if (!groups.has(ctype)) groups.set(ctype, []);
    groups.get(ctype)!.push([char, pinyinCol, raw]);
  }

  // 3) 排序：
  //    一级 按 key(第一列)字数；
  //    二级 第2列为 *5/*3 等非拼音标记的排在前；
  //    三级 按拼音——非拼音标记者用 key 转拼音(带数字声调)，其余用第2列发音
  const sortKey = (t: [string, string, string]): [number, number, string, string, string] => {
    const [char, pinyinCol] = t;
    const special = pinyinCol.trimStart().startsWith("*");
    const sp = special ? keyPinyin(char) : pinyinCol;
    return [char.length, special ? 0 : 1, sp, char, t[2]];
  };
  for (const arr of groups.values()) arr.sort((a, b) => {
    const ka = sortKey(a), kb = sortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });

  // 4) 组排序：按条目数升序（少在前，多在后），同数按组名
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    const ca = groups.get(a)!.length, cb = groups.get(b)!.length;
    return ca - cb || a.localeCompare(b);
  });

  const out: string[] = [];
  orderedKeys.forEach((k, gi) => {
    for (const [, , raw] of groups.get(k)!) out.push(raw);
    if (gi !== orderedKeys.length - 1) out.push(""); // 组间用空行分隔（不加分组标题注释行）
  });

  writeFileSync(SRC, out.join("\n") + "\n", "utf8");

  const stats: OrganizeStats = {
    rawCount: rawNonEmpty.length,
    planRemoved: removedPlan,
    planAdded: additions.length,
    dedupRemoved,
    afterDedup: deduped.length,
    groups: orderedKeys.map(k => ({ name: k, count: groups.get(k)!.length })),
    outputLines: out.length,
    removals: [...removals],
    additions,
  };
  return stats;
}

/** 命令行入口：bun src/organizer.ts / npx tsx src/organizer.ts */
const entry = (process.argv[1] || "").replace(/\\/g, "/");
if (import.meta.main === true || entry.endsWith("organizer.ts")) {
  const s = applyPlan();
  console.log("原始行数(非空):", s.rawCount);
  console.log("补丁 移除:", s.planRemoved);
  console.log("补丁 新增:", s.planAdded);
  console.log("去重删除:", s.dedupRemoved);
  console.log("去重后:", s.afterDedup);
  console.log("分组数:", s.groups.length);
  for (const g of s.groups) console.log(`  ${g.name.padEnd(12)} ${g.count} 条`);
  console.log("输出总行数:", s.outputLines);
}
