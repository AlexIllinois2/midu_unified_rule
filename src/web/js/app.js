// app.js — 页面整合：把各单一职责组件组装成完整功能
import { RuleForm } from "./ruleForm.js";
import { RuleOutput } from "./ruleOutput.js";
import { openDeviceDialog } from "./deviceDialog.js";
import { listDevices, applyRules, pushToDevice } from "./api.js";

const $ = id => document.getElementById(id);
const form = new RuleForm(document);
const output = new RuleOutput($("output"));

function hint(msg) {
  $("hint").textContent = msg;
}

/** 添加一条规则到内容区（若表单填写完整） */
function addRule() {
  if (!form.isComplete()) {
    hint("请先填写完整：中文字词、读音 两项必填（匹配值留空或 () 时自动使用中文字词完整值）。");
    return false;
  }
  hint("");
  output.add(form.buildLine());
  form.reset();
  form.focusKey();
  return true;
}

$("btnAdd").addEventListener("click", addRule);

/**
 * 应用完整流程：若表单已填写完整但未提交，先自动添加；
 * 内容区有规则则写入 conf/rule_patch.txt；然后无论如何都执行整理（organizer）。
 * @returns {Promise<boolean>} 成功返回 true
 */
async function applyPending() {
  if (form.isComplete()) addRule();
  const btn = $("btnApply");
  btn.disabled = true;
  hint("正在写入 conf/rule_patch.txt 并整理 conf/unified_rule.txt…");
  try {
    const lines = output.lines();
    const r = await applyRules(lines);
    const g = (r.stats.groups || []).map(x => x.name + " " + x.count).join(" / ");
    let msg = "已应用：新增 " + r.added + " 条，重复跳过 " + (r.duplicates ? r.duplicates.length : 0)
      + " 条，去重删除 " + r.stats.dedupRemoved + " 条，输出 " + r.stats.outputLines + " 条（" + g + "）";
    if (r.duplicates && r.duplicates.length) msg += "；重复: " + r.duplicates.join(" / ");
    // 显示补丁文件的真实落盘状态，用于确认本次应用到的是最新内容
    if (r.plan) {
      const t = new Date(r.plan.mtime);
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      const ss = String(t.getSeconds()).padStart(2, "0");
      msg += "；补丁 " + r.plan.lines + " 行 / " + r.plan.bytes + " 字节 @ " + hh + ":" + mm + ":" + ss;
    }
    if (r.retried) msg += "；⚠ 期间文件被外部改动，已按最新内容重算 " + r.retried + " 次";
    hint(msg);
    // 本次写入会改变 mtime，先把基线同步掉，避免状态条把自己的写入误报成“外部修改”
    if (r.plan) { planMtime = r.plan.mtime; settlePlan(r.plan); }
    output.clear();
    return true;
  } catch (e) {
    hint("应用失败：" + e.message + "（请确认已启动 npm start / bun run start:bun）");
    return false;
  } finally {
    btn.disabled = false;
  }
}

// 「应用」：内容区有规则则写入补丁，然后无论如何都执行整理
$("btnApply").addEventListener("click", applyPending);

// 「推送」：如有未应用的规则先自动应用，再推送并强制重启 app；多设备时弹选择框（可全选）
$("btnPush").addEventListener("click", async () => {
  const btn = $("btnPush");
  btn.disabled = true;
  hint("");
  try {
    if (!(await applyPending())) {
      hint("应用失败，已取消推送。");
      return;
    }
    const devices = await listDevices();
    const usable = devices.filter(d => d.state === "device");
    if (devices.length === 0) {
      hint("未检测到 adb 设备（请确认 adb 可用且设备已连接）。");
      return;
    }
    let serials;
    if (usable.length === 1) {
      serials = [usable[0].serial];
    } else if (usable.length > 1) {
      serials = await openDeviceDialog(usable);
      if (!serials) { hint("已取消推送。"); return; }
    } else {
      hint("没有状态为 device 的可用 adb 设备（" + devices.map(d => d.serial + ":" + d.state).join(", ") + "）。");
      return;
    }
    hint("正在推送到 " + serials.length + " 台设备…");
    const r = await pushToDevice(serials);
    const ok = r.results.filter(x => x.ok);
    const fail = r.results.filter(x => !x.ok);
    let msg = "已推送到 " + ok.length + " 台设备并强制重启 app。";
    if (fail.length) msg += "失败: " + fail.map(x => x.serial + "（" + x.error + "）").join(" / ");
    hint(msg);
  } catch (e) {
    hint("推送失败：" + e.message + "（请确认已启动 npm start / bun run start:bun 且 adb 可用）");
  } finally {
    btn.disabled = false;
  }
});

// 回车快捷提交（在输入框内按 Enter 即添加）
["key", "pinyin", "ruleCustom", "matchval", "comment"].forEach(id => {
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") addRule(); });
});

// 匹配规则切换逻辑由表单组件负责
form.bindRuleSwitch();

// ── 补丁文件状态条：显示 rule_patch.txt 的真实行数/字节/修改时间 ──────────
// 每次 2 秒心跳顺带回传文件 mtime，与上一次比对即可发现「文件被外部改动」，
// 不额外增加请求。用于提醒：编辑器保存后是否真的落盘、是否有别的东西动过补丁。
let planMtime = null;
let flashTimer = null;

function fmtTime(iso) {
  const t = new Date(iso);
  const p = n => String(n).padStart(2, "0");
  return p(t.getHours()) + ":" + p(t.getMinutes()) + ":" + p(t.getSeconds());
}

function setPlanBar(text, state) {
  $("planText").textContent = text;
  $("planDot").className = "dot" + (state ? " " + state : "");
  $("planbar").className = "planbar" + (state === "changed" || state === "stale" ? " " + state : "");
}

function settlePlan(plan) {
  setPlanBar("补丁 " + plan.lines + " 行 / " + plan.bytes + " 字节 · 最近修改 " + fmtTime(plan.mtime), "ok");
}

/** 用服务端回报的状态刷新状态条；mtime 变化即高亮提示外部改动 */
function updatePlan(plan) {
  if (!plan) { setPlanBar("补丁状态不可用", "stale"); return; }
  const changed = planMtime !== null && plan.mtime !== planMtime;
  planMtime = plan.mtime;
  if (!changed) { settlePlan(plan); return; }
  setPlanBar("⚠ 补丁被外部修改 → " + fmtTime(plan.mtime) + "（" + plan.lines + " 行 / " + plan.bytes + " 字节）", "changed");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => settlePlan(plan), 8000);
}

// 保活：每 2 秒向服务端发心跳，服务端在所有页面关闭（心跳超时）后自动停止服务
async function beat() {
  try {
    const res = await fetch("/api/alive", { method: "POST", keepalive: true });
    if (!res.ok) throw new Error("bad status");
    const d = await res.json().catch(() => ({}));
    updatePlan(d.plan);
  } catch {
    setPlanBar("服务未连接（请确认 npm start / bun run start:bun 正在运行）", "stale");
  }
}
beat();
setInterval(beat, 2000);
// 从后台切回时立即补一次心跳，避免被误判失联
document.addEventListener("visibilitychange", () => { if (!document.hidden) beat(); });
