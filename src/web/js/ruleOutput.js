// ruleOutput.js — 规则输出组件（单一职责：内容区的行管理）
// 可独立使用：new RuleOutput(textareaElement)
export class RuleOutput {
  /**
   * @param {HTMLTextAreaElement} el 内容区 textarea
   */
  constructor(el) {
    this.el = el;
  }

  /** 追加一行（首次添加不产生前导空行） */
  add(line) {
    this.el.value = this.el.value ? this.el.value + "\n" + line : line;
  }

  /** 当前所有行（去空行） */
  lines() {
    return this.el.value.split("\n").filter(l => l.trim() !== "");
  }

  get count() {
    return this.lines().length;
  }

  get isEmpty() {
    return this.el.value.trim() === "";
  }

  clear() {
    this.el.value = "";
  }
}
