// planStore.ts — conf/rule_patch.txt 的读写（单一职责：把新增规则行追加到「新增:」区块，带去重）
//
// 关于「手改文件后内容丢失」：本模块每次调用都重新 readFileSync，不持有 fd、不做缓存，
// 所以不存在「读到旧文件」的问题。真正的丢失来自三处，这里逐一处理：
//   1. read→write 之间文件被外部（编辑器 / 另一个请求）改写 → 写前逐字比对，发现变化就重算重试
//   2. writeFileSync 直接截断重写，进程被杀会留半截文件 → 先写临时文件再 rename（原子替换）
//   3. 覆盖后旧内容不可追回 → 每次覆盖前把旧内容存一份 conf/.rule_patch.bak
import { readFileSync, writeFileSync, existsSync, renameSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLAN = join(HERE, "..", "conf", "rule_patch.txt");
export const PLAN_BACKUP = join(HERE, "..", "conf", ".rule_patch.bak");

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
  retried: number;       // 因检测到外部改动而重算的次数
  planLines: number;     // 写入后补丁文件的行数
  planBytes: number;     // 写入后补丁文件的字节数
  planMtime: string;     // 写入后补丁文件的修改时间（ISO）
}

/** 读取文件全文；不存在时返回空串。每次都直接读盘，不复用句柄。 */
function readPlan(planPath: string): string {
  return existsSync(planPath) ? readFileSync(planPath, "utf8") : "";
}

/** 原子写：先写同目录临时文件，再 rename 覆盖，避免读到/留下半截文件。 */
function writeAtomic(planPath: string, content: string): void {
  const tmp = `${planPath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, planPath);
}

/** 覆盖前把旧内容留一份，供误覆盖后手动恢复。 */
function backup(planPath: string, prevText: string): void {
  try {
    if (prevText && planPath === PLAN) writeFileSync(PLAN_BACKUP, prevText, "utf8");
  } catch {
    // 备份失败不影响主流程
  }
}

/** 纯函数：在文本的「新增:」区块内插入规则行，返回新文本与统计。 */
function compute(text: string, rules: string[]): { out: string; added: string[]; duplicates: string[] } {
  const linesArr = text.split("\n");
  const addIdx = linesArr.findIndex(l => headerOf(l) === "新增:");
  const added: string[] = [];
  const duplicates: string[] = [];
  const existing = new Set(linesArr.map(l => l.replace(/\s+$/, "")).filter(Boolean));

  if (addIdx === -1) {
    // 无「新增:」区块：文件末尾新建
    const block = ["", "新增:"];
    for (const r of rules) {
      if (existing.has(r)) { duplicates.push(r); continue; }
      block.push(r);
      existing.add(r);
      added.push(r);
    }
    const base = text.replace(/\s*$/, "");
    const out = base ? base + "\n" + block.join("\n") + "\n" : block.join("\n").replace(/^\n/, "") + "\n";
    return { out, added, duplicates };
  }

  // 区块结束位置：下一个标题行
  let endIdx = linesArr.length;
  for (let i = addIdx + 1; i < linesArr.length; i++) {
    if (headerOf(linesArr[i]) !== null) { endIdx = i; break; }
  }

  // 区块内最后一个非空行之后插入
  let insertAt = addIdx + 1;
  for (let i = endIdx - 1; i > addIdx; i--) {
    if (linesArr[i].trim() !== "") { insertAt = i + 1; break; }
  }

  for (const r of rules) {
    if (existing.has(r)) { duplicates.push(r); continue; }
    linesArr.splice(insertAt, 0, r);
    insertAt += 1;
    existing.add(r);
    added.push(r);
  }

  return { out: linesArr.join("\n"), added, duplicates };
}

export interface PlanMeta {
  lines: number;   // 非空行数
  bytes: number;   // 字节数
  mtime: string;   // 修改时间（ISO）
}

/** 读取补丁文件的当前状态（行数/字节/修改时间），供页面显示“文件是否被外部改动”。 */
export function planMeta(planPath: string = PLAN): PlanMeta {
  const text = readPlan(planPath);
  let bytes = 0;
  let mtime = new Date(0).toISOString();
  try {
    const st = statSync(planPath);
    bytes = st.size;
    mtime = new Date(st.mtimeMs).toISOString();
  } catch {
    // 文件不存在：保持默认值
  }
  return { lines: text ? text.split("\n").filter(l => l.trim() !== "").length : 0, bytes, mtime };
}

/**
 * 把规则行追加到 rule_patch.txt 的「新增:」区块（无该区块则建在文件末尾），按整行去重。
 *
 * 采用「读—算—写前复核—原子替换」流程：若在读取之后文件被外部改过（编辑器保存、
 * 另一个请求写入），则丢弃本次结果，基于最新内容重新计算，最多重试 3 次。
 */
export function appendPlanAdditions(rules: string[], planPath: string = PLAN): AppendResult {
  const MAX_RETRY = 3;
  let retried = 0;
  let last: { out: string; added: string[]; duplicates: string[] } | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const before = readPlan(planPath);
    const { out, added, duplicates } = compute(before, rules);
    last = { out, added, duplicates };

    // 写前复核：磁盘内容是否还是我们读到的这一份
    const now = readPlan(planPath);
    if (now !== before) {
      retried += 1;
      continue;
    }

    // 无变化则不写盘（避免无意义地刷新 mtime）
    if (out === before) break;

    backup(planPath, before);
    writeAtomic(planPath, out);
    break;
  }

  const meta = planMeta(planPath);

  return {
    added: last?.added ?? [],
    duplicates: last?.duplicates ?? [],
    retried,
    planLines: meta.lines,
    planBytes: meta.bytes,
    planMtime: meta.mtime,
  };
}
