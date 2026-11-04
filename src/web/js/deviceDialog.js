// deviceDialog.js — adb 设备选择弹框组件（单一职责：多设备选择，支持全选）
// 可独立使用：openDeviceDialog(devices) → Promise<string[] | null>（取消返回 null）
/**
 * @param {Array<{serial: string, state: string}>} devices 设备列表
 * @param {Document} doc 文档（默认 document）
 * @returns {Promise<string[]|null>} 选中的 serial 列表；取消返回 null
 */
export function openDeviceDialog(devices, doc = document) {
  return new Promise(resolve => {
    // 遮罩
    const overlay = doc.createElement("div");
    overlay.className = "dlg-overlay";

    const box = doc.createElement("div");
    box.className = "dlg-box";

    const title = doc.createElement("div");
    title.className = "dlg-title";
    title.textContent = "检测到多个 adb 设备，请选择推送目标：";
    box.appendChild(title);

    // 全选
    const selRow = doc.createElement("label");
    selRow.className = "dlg-row dlg-all";
    const selAll = doc.createElement("input");
    selAll.type = "checkbox";
    selAll.checked = true;
    selRow.appendChild(selAll);
    selRow.appendChild(doc.createTextNode(" 全选"));
    box.appendChild(selRow);

    // 设备列表
    const checkboxes = [];
    for (const d of devices) {
      const row = doc.createElement("label");
      row.className = "dlg-row";
      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.value = d.serial;
      cb.checked = true;
      cb.addEventListener("change", () => {
        selAll.checked = checkboxes.every(c => c.checked);
      });
      checkboxes.push(cb);
      row.appendChild(cb);
      row.appendChild(doc.createTextNode(" " + d.serial + (d.state !== "device" ? "（" + d.state + "）" : "")));
      box.appendChild(row);
    }

    selAll.addEventListener("change", () => {
      for (const cb of checkboxes) cb.checked = selAll.checked;
    });

    // 按钮
    const btnRow = doc.createElement("div");
    btnRow.className = "dlg-btns";
    const btnOk = doc.createElement("button");
    btnOk.textContent = "推送";
    btnOk.className = "add";
    const btnCancel = doc.createElement("button");
    btnCancel.textContent = "取消";
    btnCancel.className = "dlg-cancel";
    btnRow.appendChild(btnOk);
    btnRow.appendChild(btnCancel);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    doc.body.appendChild(overlay);

    const close = result => {
      overlay.remove();
      resolve(result);
    };
    btnOk.addEventListener("click", () => {
      const picked = checkboxes.filter(c => c.checked).map(c => c.value);
      close(picked.length ? picked : null);
    });
    btnCancel.addEventListener("click", () => close(null));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(null); });
  });
}
