// ruleForm.js — 规则表单组件（单一职责：表单状态 + 生成一行规则）
// 可独立使用：new RuleForm(containerOrDocument) ，容器内需含
// key / pinyin / rule / ruleCustom / matchval / comment 六个输入项。
export class RuleForm {
  /**
   * @param {Document|HTMLElement} root 含各输入项的根（默认整个文档）
   */
  constructor(root = document) {
    this.root = root;
    this.$ = id => root.querySelector("#" + id);
  }

  /** 当前生效的匹配规则名（自定义输入优先） */
  activeRule() {
    const rule = this.$("rule");
    if (rule.value === "__custom__") return this.$("ruleCustom").value.trim() || "TEXT";
    return rule.value;
  }

  /**
   * 生成一行规则：key ⇥ 读音 ⇥ 规则(匹配值) [⇥ # 注释]
   * 匹配值为空或仅默认 "()" 时，自动使用中文字词(key)的完整值（含括号）。
   */
  buildLine() {
    const key = this.$("key").value.trim();
    const pinyin = this.$("pinyin").value.trim();
    const rule = (this.activeRule() || "TEXT").toUpperCase();
    const rawMatchval = this.$("matchval").value.trim();
    const comment = this.$("comment").value.trim();
    const matchval = (!rawMatchval || rawMatchval === "()") ? "(" + key + ")" : rawMatchval;

    let line = key + "\t" + pinyin + "\t" + rule + "(" + matchval + ")";
    if (comment) line += "\t# " + comment;
    return line;
  }

  /** 必填校验：中文字词、读音（匹配值可留空自动取 key） */
  isComplete() {
    return this.$("key").value.trim() && this.$("pinyin").value.trim();
  }

  /** 重置表单，保留默认规则 TEXT 与默认匹配值 "()" */
  reset() {
    this.$("key").value = "";
    this.$("pinyin").value = "";
    this.$("rule").value = "TEXT";
    this.$("ruleCustom").style.display = "none";
    this.$("ruleCustom").value = "";
    this.$("matchval").value = "()";
    this.$("comment").value = "";
  }

  focusKey() {
    this.$("key").focus();
  }

  /** 绑定匹配规则切换：非 TEXT 清空匹配值；切回 TEXT 且为空时补回默认 "()" */
  bindRuleSwitch() {
    const applyRuleToMatchval = r => {
      r = (r || "TEXT").toUpperCase();
      if (r === "TEXT") {
        if (this.$("matchval").value.trim() === "") this.$("matchval").value = "()";
      } else {
        this.$("matchval").value = "";
      }
    };
    this.$("rule").addEventListener("change", () => {
      if (this.$("rule").value === "__custom__") {
        this.$("ruleCustom").style.display = "";
        this.$("ruleCustom").focus();
      } else {
        this.$("ruleCustom").style.display = "none";
        this.$("ruleCustom").value = "";
        applyRuleToMatchval(this.$("rule").value);
      }
    });
    this.$("ruleCustom").addEventListener("input", () => applyRuleToMatchval(this.$("ruleCustom").value));
  }
}
