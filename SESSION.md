# 项目会话状态 (SESSION)

> 本文件是项目的「自带状态」。即使 AI 没有跨会话记忆，阅读本文件即可完整理解项目、文件结构与当前状态。
> 每次运行 `organizer.py` 会自动更新下方「当前状态」区块（由一对状态标记包裹，请勿手动改动该区块之间内容），其余内容为项目说明，可人工维护。

## 项目说明
- 这是 **multitts 语音包（字节跳动 midu zh-cn）发音补丁 `unified_rule.txt`** 的整理/维护工具集。
- 目标：对混乱的补丁做 **去重、移除、新增、分组、排序**，生成可直接使用的规则文件。
- 规则行格式（Tab 分隔）：`key ⇥ 读音 ⇥ 规则(匹配值) [⇥ # 注释]`
  - **key**：中文字词（如 `吧` / `仁儿` / `小满`）
  - **读音**：拼音；可为 `*5` 这类轻声标记，或 `renr4 NONE` / `tangr4 none5` / `xiao6 man3` 这类多音节（含空格）
  - **规则**：`TEXT` / `WORD_INSIDE` / `PINYIN` / `POS` 等，其后括号里是匹配值
  - **注释**：可选

## 文件清单
- `organizer.py` —— 主脚本。读取 `unified_rule.txt.bak` + `plan.txt`，应用移除/新增，再去重/分组/排序，写出 `unified_rule.txt`。路径基于脚本自身所在目录（可随文件夹移动）。
- `unified_rule.txt` —— 整理后的输出（最终规则文件）。
- `unified_rule.txt.bak` —— 干净原始源文件（1270 行）。脚本基于它运行，**不被修改**，是唯一的真相源。
- `plan.txt` —— 人工规划笔记，含 `移除:` / `新增:` 区块（脚本据此应用变更）。
- `generator.html` —— 浏览器规则生成页面（填表单 → 生成规则行 → 复制）。
- `SESSION.md` —— 本文件（项目状态/会话）。

## 运行方式
```bash
cd <本目录>
python3 organizer.py
```
依赖：`pypinyin`（用于 `*` 标记行按汉字转拼音、带数字声调排序）。
安装：`python3 -m pip install -i https://mirrors.aliyun.com/pypi/simple/ pypinyin`

## 处理约定（已固化在脚本中）
- **分组**：按规则首条件类型 → `WORD_INSIDE` / `PINYIN` / `TEXT`；组间用空行 + 注释标题分隔。
- **组排序**：按条目数升序（少在前，多在后）。
- **组内排序**：一级按 key（第1列）字数（单字在前，多字词在后）；二级第2列为 `*` 非拼音标记的行排在前；三级按拼音（`*` 行用 key 转拼音带数字声调、轻声补 `5`，普通行用第2列原值）。
- **去重**：按整行 rstrip 判定，保留首次出现。
- **变更来源**：`plan.txt` 的 `移除:`（整行移除）与 `新增:`（追加行）区块，每次运行都基于 bak 重算，因此改 plan.txt 后重跑即生效。

## 当前状态
<!-- SESSION_STATE_START -->
最后运行: 2026-08-13 11:14 (本地)
输入源: unified_rule.txt.bak（干净原始，不被修改）
plan.txt 移除: 1 条
  - 芦 ⇥ lu5 ⇥ TEXT(宝葫(芦))
plan.txt 新增: 7 条
  - 葫芦 ⇥ hu2 lu5 ⇥ TEXT((葫芦))
  - 姐姐 ⇥ jie3 jie5 ⇥ TEXT((姐姐)) ⇥ # 这个都没有, 离谱
  - 怂 ⇥ song2 ⇥ TEXT((怂))
  - 娃娃 ⇥ wa2 wa5 ⇥ TEXT((娃娃))
  - 一会儿 ⇥ yi4 huir3 none5 ⇥ TEXT((一会儿))
  - 心思 ⇥ xin1 si5 ⇥ TEXT((心思))
  - 短打的 ⇥ duan3 da3 de5 ⇥ TEXT((短打的))
去重删除: 41 条
输出: 1235 条
分组: PINYIN 2 / WORD_INSIDE 22 / TEXT 1211
输出文件: unified_rule.txt
<!-- SESSION_STATE_END -->

## 备注 / 已知坑
- `plan.txt` 标题行可能带说明文字（如 `分组: 词边界规则...`），解析按「前缀开头」判定标题，避免误把标题当新增行。
- 新增行使用真实汉字转拼音排序；若某些字希望用补丁指定读音参与排序，需在脚本加「字→拼音」映射表。
- `unified_rule.txt.bak` 切勿手动改；要改源数据请改 bak（或改 plan.txt 的移除/新增），再跑脚本。
