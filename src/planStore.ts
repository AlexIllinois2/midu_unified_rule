// planStore.ts — conf/rule_patch.txt 的读写（单一职责：把新增规则行追加到「新增:」区块，带去重）
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLAN = join(HERE, "..", "conf", "rule_patch.txt");

// 与 organizer.ts 保持一致的标题前缀
const HEADER_PREFIXES = ["移除:", "新增:", "去重:", "分组:", "排序:", "表单定义:", "页面操作:"];

const headerOf = (line: string): string | null => {
  const s = line.trim();
  for (const h of HEADER_PREFIXES) if (s === h || s.startsWith(h)) return h;
  return null;
};

export interface AppendResult {
  added: string[];       // 实际追加的行
  duplicates: string[];  // 已存在而被跳过的行
}

/** 把规则行追加到 rule_patch.txt 的「新增:」区块（无该区块则建在文件末尾），按整行去重。 */
export function appendPlanAdditions(rules: string[], planPath: string = PLAN): AppendResult {
  const text = existsSync(planPath) ? readFileSync(planPath, "utf8") : "";
  const linesArr = text.split("\n");

  const addIdx = linesArr.findIndex(l => headerOf(l) === "新增:");
  const added: string[] = [];
  const duplicates: string[] = [];

  if (addIdx === -1) {
    // 无「新增:」区块：文件末尾新建
    const existing = new Set(linesArr.map(l => l.replace(/\s+$/, "")).filter(Boolean));
    const block = ["", "新增:"];
    for (const r of rules) {
      if (existing.has(r)) { duplicates.push(r); continue; }
      block.push(r);
      added.push(r);
    }
    const out = text.replace(/\s*$/, "") + "\n" + block.join("\n") + "\n";
    writeFileSync(planPath, out, "utf8");
    return { added, duplicates };
  }

  // 区块结束位置：下一个标题行
  let endIdx = linesArr.length;
  for (let i = addIdx + 1; i < linesArr.length; i++) {
    if (headerOf(linesArr[i]) !== null) { endIdx = i; break; }
  }

  // 已有内容集合（含整个文件，避免与其他区块重复）
  const existing = new Set(linesArr.map(l => l.replace(/\s+$/, "")).filter(Boolean));

  // 区块内最后一个非空行之后插入
  let insertAt = addIdx + 1;
  for (let i = endIdx - 1; i > addIdx; i--) {
    if (linesArr[i].trim() !== "") { insertAt = i + 1; break; }
  }

  for (const r of rules) {
    if (existing.has(r)) { duplicates.push(r); continue; }
    linesArr.splice(insertAt, 0, r);
    insertAt += 1;
    added.push(r);
  }

  writeFileSync(planPath, linesArr.join("\n"), "utf8");
  return { added, duplicates };
}
