// api.js — 后端接口封装（单一职责：与本地 server 通信）
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败 (" + res.status + ")");
  return data;
}

/** 列出 adb 设备 */
export async function listDevices() {
  const res = await fetch("/api/devices");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "获取设备失败 (" + res.status + ")");
  return data.devices || [];
}

/** 应用规则：写入 conf/rule_patch.txt 新增区块并整理 conf/unified_rule.txt */
export async function applyRules(rules) {
  return postJson("/api/apply", { rules });
}

/** 推送 unified_rule.txt 到指定设备并强制重启 app */
export async function pushToDevice(serials) {
  return postJson("/api/push", { serials });
}
