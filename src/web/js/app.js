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
 * 应用待应用内容：若表单已填写完整但未提交，先自动添加；
 * 然后把内容区所有规则写入 conf/rule_patch.txt 并整理。
 * @returns {Promise<boolean>} 没有待应用内容或应用成功时返回 true
 */
async function applyPending() {
  if (form.isComplete()) addRule();
  if (output.isEmpty) return true;
  const btn = $("btnApply");
  btn.disabled = true;
  hint("正在写入 conf/rule_patch.txt 并整理 conf/unified_rule.txt…");
  try {
    const r = await applyRules(output.lines());
    const g = (r.stats.groups || []).map(x => x.name + " " + x.count).join(" / ");
    let msg = "已应用：新增 " + r.added + " 条，重复跳过 " + (r.duplicates ? r.duplicates.length : 0)
      + " 条，去重删除 " + r.stats.dedupRemoved + " 条，输出 " + r.stats.outputLines + " 条（" + g + "）";
    if (r.duplicates && r.duplicates.length) msg += "；重复: " + r.duplicates.join(" / ");
    hint(msg);
    output.clear();
    return true;
  } catch (e) {
    hint("应用失败：" + e.message + "（请确认已启动 npm start / bun run start:bun）");
    return false;
  } finally {
    btn.disabled = false;
  }
}

// 「应用」：应用内容区所有规则
$("btnApply").addEventListener("click", () => {
  if (output.isEmpty && !form.isComplete()) hint("内容区为空，没有可应用的规则。");
  else applyPending();
});

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

// 保活：每 2 秒向服务端发心跳，服务端在所有页面关闭（心跳超时）后自动停止服务
function beat() {
  fetch("/api/alive", { method: "POST", keepalive: true }).catch(() => {});
}
beat();
setInterval(beat, 2000);
// 从后台切回时立即补一次心跳，避免被误判失联
document.addEventListener("visibilitychange", () => { if (!document.hidden) beat(); });
