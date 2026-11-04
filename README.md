# midu_unified_rule

MultiTTS 字节语音包读音补丁项目，解决字节语音包（豆包/midu）读音不准确的问题。

读音配置文件: `src/conf/unified_rule.txt`

设备内路径: `/storage/emulated/0/Android/data/org.nobody.multitts/files/voice/bytedance/midu/zh-cn/frontend/g2p/mnc/unified_rule.txt`

使用方法: 替换上述路径的文件（或用本项目一键推送）。理论上替换语音包里的源文件再导入也行，没试过🤓

## 项目结构

```
midu_unified_rule/
├── midu_rule_updater.ts    # 启动入口：本地服务（npm start / bun midu_rule_updater.ts）
├── src/
│   ├── organizer.ts        # 整理主脚本：vendor + 补丁 → 去重/分组/排序 → 输出
│   ├── planStore.ts        # conf/rule_patch.txt 追加逻辑（去重）
│   ├── conf/               # 配置与产物
│   │   ├── unified_rule_vendor.txt  # 上游原始文件（只读真相源，不被修改）
│   │   ├── rule_patch.txt           # 补丁：移除/新增 区块（人工或页面「应用」写入）
│   │   └── unified_rule.txt         # 整理输出 = 最终推送的规则文件
│   └── web/                # 工具页前端源码（表单组件 / 规则输出 / 设备选择弹框 / API 封装）
├── doc/plan/               # 历史任务规划（plan0-2）
├── test/test_text.txt      # 朗读测试文本
├── tmp/old/                # 归档（旧 organizer.py、deploy.sh、截图）
└── package.json
```

## 工具页（推荐）

```bash
bun midu_rule_updater.ts   # 或 npm start（tsx）
```

启动后自动用默认浏览器打开 http://127.0.0.1:8899/：

- **生成**：填表单（中文字词 / 读音 / 规则类型 / 匹配值 / 注释）生成规则行；匹配值留空或为 `()` 时自动使用中文字词的完整值
- **应用**：把内容区规则写入 `conf/rule_patch.txt` 新增区块（自动去重）并重新整理输出
- **推送**：如有未应用规则会先自动应用，然后 `adb push` 到设备并强停 app（重新打开即生效）；多设备时弹选择框，可全选

页面全部关闭后服务自动停止（心跳检测，约 1 分钟后退出）。

环境变量：
- `PORT`（默认 8899）
- `ALIVE_TIMEOUT`（页面关闭判定阈值，默认 70000ms，需大于浏览器后台标签的定时器节流间隔）
- `NO_OPEN=1` 不自动打开浏览器

## 命令行整理

```bash
bun run organize:bun   # 或 npm run organize（tsx）
```

读取 `src/conf/unified_rule_vendor.txt`，应用 `src/conf/rule_patch.txt` 的 移除/新增，去重、按拼音分组排序后写出 `src/conf/unified_rule.txt`。

## 依赖

- 运行：[Bun](https://bun.sh) 或 Node + tsx
- 依赖包：`pinyin-pro`（拼音分组排序）
- 推送功能需要 `adb` 在 PATH 中
