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
- **分组**：按规则首条件类型 → `WORD_INSIDE` / `PINYIN` / `TEXT`；组间用单个空行分隔。输出文件**不添加分组标题注释行**（`# ===== ... =====`），但**保留每行原有的行尾 `#` 注释**（如 `华 ... # 4. ...`），以保证规则文件可被正确加载。
- **组排序**：按条目数升序（少在前，多在后）。
- **组内排序**：一级按 key（第1列）字数（单字在前，多字词在后）；二级第2列为 `*` 非拼音标记的行排在前；三级按拼音（`*` 行用 key 转拼音带数字声调、轻声补 `5`，普通行用第2列原值）。
- **去重**：按整行 rstrip 判定，保留首次出现。
- **变更来源**：`plan.txt` 的 `移除:`（整行移除）与 `新增:`（追加行）区块，每次运行都基于 bak 重算，因此改 plan.txt 后重跑即生效。

## 当前状态
<!-- SESSION_STATE_START -->
最后运行: 2026-11-03 11:41 (本地)
输入源: unified_rule.txt.bak（干净原始，不被修改）
plan.txt 移除: 1 条
  - 芦 ⇥ lu5 ⇥ TEXT(宝葫(芦))
plan.txt 新增: 166 条
  - 葫芦 ⇥ hu2 lu5 ⇥ TEXT((葫芦))
  - 怂 ⇥ song2 ⇥ TEXT((怂))
  - 姐姐 ⇥ jie3 jie5 ⇥ TEXT((姐姐)) ⇥ # 这个都没有, 离谱
  - 娃娃 ⇥ wa2 wa5 ⇥ TEXT((娃娃))
  - 会儿 ⇥ huir4 none5 ⇥ TEXT((会儿))
  - 心思 ⇥ xin1 si5 ⇥ TEXT((心思))
  - 骨头 ⇥ gu2 tou5 ⇥ TEXT((骨头))
  - 蛤蟆 ⇥ ha2 ma5 ⇥ TEXT((蛤蟆))
  - 男人 ⇥ nan2 ren5 ⇥ TEXT((男人))
  - 吆喝 ⇥ yao1 he5 ⇥ TEXT((吆喝))
  - 嫌恶 ⇥ xian2 wu4 ⇥ TEXT((嫌恶))
  - 揣着 ⇥ chuai1 zhe5 ⇥ TEXT((揣着))
  - 学子 ⇥ xue2 zi3 ⇥ TEXT((学子))
  - 够呛 ⇥ gou4 qiang4 ⇥ TEXT((够呛))
  - 便宜 ⇥ pian2 yi4 ⇥ TEXT((便宜))
  - 便宜行事 ⇥ bian4 yi2 xing2 shi4 ⇥ TEXT((便宜行事))
  - 腾 ⇥ *5 ⇥ TEXT([折|扑|闹](腾))
  - 倒腾 ⇥ dao2 teng5 ⇥ TEXT((倒腾))
  - 打的 ⇥ da3 de5 ⇥ TEXT((打的))
  - 妻子 ⇥ qi1 zi3 ⇥ TEXT((妻子))
  - 傻子 ⇥ sha3 zi5 ⇥ TEXT((傻子))
  - 嗓子 ⇥ sang3 zi5 ⇥ TEXT((嗓子))
  - 骨子 ⇥ gu3 zi5 ⇥ TEXT((骨子))
  - 嫂子 ⇥ sao3 zi5 ⇥ TEXT((嫂子))
  - 口子 ⇥ kou3 zi5 ⇥ TEXT((口子))
  - 椅子 ⇥ yi3 zi5 ⇥ TEXT((椅子))
  - 小子 ⇥ xiao3 zi5 ⇥ TEXT((小子))
  - 李子 ⇥ li3 zi5 ⇥ TEXT((李子))
  - 母子 ⇥ mu3 zi3 ⇥ TEXT((母子))
  - 弟子 ⇥ di4 zi3 ⇥ TEXT((弟子))
  - 公子 ⇥ gong1 zi3 ⇥ TEXT((公子))
  - 王子 ⇥ wang2 zi3 ⇥ TEXT((王子))
  - 斧子 ⇥ fu3 zi3 ⇥ TEXT((斧子))
  - 夫子 ⇥ fu1 zi3 ⇥ TEXT((夫子))
  - 娘子 ⇥ niang2 zi3 ⇥ TEXT((娘子))
  - 领子 ⇥ ling3 zi5 ⇥ TEXT((领子))
  - 铲子 ⇥ chan3 zi5 ⇥ TEXT((铲子))
  - 枣子 ⇥ zao3 zi5 ⇥ TEXT((枣子))
  - 弃子 ⇥ qi4 zi3 ⇥ TEXT((弃子))
  - 肘子 ⇥ zhou3 zi5 ⇥ TEXT((肘子))
  - 脑子 ⇥ nao3 zi5 ⇥ TEXT((脑子))
  - 剪子 ⇥ jian3 zi5 ⇥ TEXT((剪子))
  - 宝子 ⇥ bao3 zi5 ⇥ TEXT((宝子))
  - 胆子 ⇥ dan3 zi5 ⇥ TEXT((胆子))
  - 毯子 ⇥ tan3 zi5 ⇥ TEXT((毯子))
  - 腿子 ⇥ tui3 zi5 ⇥ TEXT((腿子))
  - 靶子 ⇥ ba3 zi5 ⇥ TEXT((靶子))
  - 点子 ⇥ dian3 zi5 ⇥ TEXT((点子))
  - 童子 ⇥ tong2 zi3 ⇥ TEXT((童子))
  - 主子 ⇥ zhu3 zi5 ⇥ TEXT((主子))
  - 嫂嫂 ⇥ sao3 sao5 ⇥ TEXT((嫂嫂))
  - 爸爸 ⇥ ba4 ba5 ⇥ TEXT((爸爸))
  - 奶奶 ⇥ nai3 nai5 ⇥ TEXT((奶奶))
  - 哥哥 ⇥ ge1 ge5 ⇥ TEXT((哥哥))
  - 弟弟 ⇥ di4 di5 ⇥ TEXT((弟弟))
  - 妹妹 ⇥ mei4 mei5 ⇥ TEXT((妹妹))
  - 叔叔 ⇥ shu1 shu5 ⇥ TEXT((叔叔))
  - 婶婶 ⇥ shen3 shen5 ⇥ TEXT((婶婶))
  - 姑姑 ⇥ gu1 gu5 ⇥ TEXT((姑姑))
  - 舅舅 ⇥ jiu4 jiu5 ⇥ TEXT((舅舅))
  - 姨姨 ⇥ yi2 yi5 ⇥ TEXT((姨姨))
  - 婆婆 ⇥ po2 po5 ⇥ TEXT((婆婆))
  - 婆婆妈妈 ⇥ po2 po5 ma1 ma1 ⇥ TEXT((婆婆妈妈))
  - 公公 ⇥ gong1 gong5 ⇥ TEXT((公公))
  - 崽崽 ⇥ zai3 zai1 ⇥ TEXT((崽崽))
  - 慢慢来 ⇥ man4 man1 lai2 ⇥ TEXT((慢慢来))
  - 问问 ⇥ wen4 wen5 ⇥ TEXT((问问))
  - 闻闻 ⇥ wen2 wen5 ⇥ TEXT((闻闻))
  - 试试 ⇥ shi4 shi5 ⇥ TEXT((试试))
  - 星星点点 ⇥ xing1 xing1 dian3 dian3 ⇥ TEXT((星星点点))
  - 星星之火 ⇥ xing1 xing1 zhi1 huo3 ⇥ TEXT((星星之火))
  - 小手手 ⇥ xiao2 shou3 shou5 ⇥ TEXT((小手手))
  - 小脚脚 ⇥ xiao2 jiao3 jiao5 ⇥ TEXT((小脚脚))
  - 朝朝暮暮 ⇥ zhao1 zhao1 mu4 mu4 ⇥ TEXT((朝朝暮暮))
  - 朝秦暮楚 ⇥ zhao1 qin2 mu4 chu3 ⇥ TEXT((朝秦暮楚))
  - 朝三暮四 ⇥ zhao1 san1 mu4 si4 ⇥ TEXT((朝三暮四))
  - 曲子 ⇥ qu3 zi5 ⇥ TEXT((曲子))
  - 谱子 ⇥ pu3 zi5 ⇥ TEXT((谱子))
  - 地儿 ⇥ dir4 none5 ⇥ TEXT((地儿))
  - 重 ⇥ chong2 ⇥ TEXT((重)[启|瞳])
  - 削 ⇥ xiao1 ⇥ TEXT((削))
  - 削 ⇥ xue1 ⇥ TEXT((削)[弱|减|价|籍|正||债|支|足适履|尖脑袋|铁如泥|平诸侯|平群雄])
  - 削 ⇥ xue1 ⇥ TEXT(剥(削))
  - 数一数 ⇥ shu3 yi4 shu3 ⇥ TEXT((数一数))
  - 数数看 ⇥ shu3 shu3 kan4 ⇥ TEXT((数数看))
  - 你数数 ⇥ ni3 shu3 shu3 ⇥ TEXT((你数数))
  - 再数数 ⇥ zai4 shu3 shu3 ⇥ TEXT((再数数))
  - 玩意儿 ⇥ wan2 yir4 none5 ⇥ TEXT((玩意儿))
  - 劲儿 ⇥ jinr4 none5 ⇥ TEXT((劲儿))
  - 今儿 ⇥ jinr1 none5 ⇥ TEXT((今儿))
  - 弯儿 ⇥ wanr1 none5 ⇥ TEXT((弯儿))
  - 时辰 ⇥ shi2 chen5 ⇥ TEXT((时辰))
  - 功夫 ⇥ gong1 fu5 ⇥ TEXT((功夫))
  - 横行 ⇥ heng2 xing2 ⇥ TEXT((横行))
  - 好好说 ⇥ hao3 hao1 shuo1 ⇥ TEXT((好好说))
  - 舌头 ⇥ she2 tou5 ⇥ TEXT((舌头))
  - 模糊 ⇥ mo2 hu1 ⇥ TEXT((模糊))
  - 葡萄 ⇥ pu2 tao5 ⇥ TEXT((葡萄))
  - 压根儿 ⇥ ya4 genr1 none5 ⇥ TEXT((压根儿))
  - 嘶啦 ⇥ si1 la1 ⇥ TEXT((嘶啦))
  - 这儿 ⇥ zher4 none5 ⇥ TEXT((这儿))
  - 那儿 ⇥ nar4 none5 ⇥ TEXT((那儿))
  - 哪儿 ⇥ nar3 none5 ⇥ TEXT((哪儿))
  - 凡夫俗子 ⇥ fan2 fu1 su2 zi3 ⇥ TEXT((凡夫俗子))
  - 妖精 ⇥ yao1 jing5 ⇥ TEXT((妖精))
  - 唠 ⇥ lao4 ⇥ TEXT((唠))
  - 唠叨 ⇥ lao1 dao5 ⇥ TEXT((唠叨))
  - 唠唠叨叨 ⇥ lao1 lao1 dao1 dao1 ⇥ TEXT((唠唠叨叨))
  - 晃晃 ⇥ huang4 huang5 ⇥ TEXT((晃晃))
  - 没种 ⇥ mei2 zhong3 ⇥ TEXT((没种))
  - 旋转 ⇥ xuan2 zhuan3 ⇥ TEXT((旋转))
  - 踉跄 ⇥ liang4 qiang4 ⇥ TEXT((踉跄))
  - 累 ⇥ lei4 ⇥ TEXT((累))
  - 累累 ⇥ lei2 lei3 ⇥ TEXT((累累))
  - 屁股 ⇥ pi4 gu5 ⇥ TEXT((屁股))
  - 晕染 ⇥ yun4 ran3 ⇥ TEXT((晕染))
  - 气氛 ⇥ qi4 fen5 ⇥ TEXT((气氛))
  - 种 ⇥ zhong3 ⇥ TEXT((种))
  - 种 ⇥ zhong3 ⇥ TEXT([这|那](种))
  - 种种 ⇥ zhong2 zhong3 ⇥ TEXT((种种))
  - 种 ⇥ zhong4 ⇥ TEXT((种)[树|花|草|下|上|出|了])
  - 抵 ⇥ di3 ⇥ TEXT((抵))
  - 角 ⇥ jiao3 ⇥ TEXT((角))
  - 以为 ⇥ yi3 wei2 ⇥ TEXT((以为))
  - 倒 ⇥ dao3 ⇥ TEXT((倒)[下|地|台|了])
  - 倒 ⇥ dao4 ⇥ TEXT([反](倒)[是|打|好])
  - 假 ⇥ jia3 ⇥ TEXT((假))
  - 假 ⇥ jia4 ⇥ TEXT([放个|放|请个|请|春|暑|秋|寒](假)[期])
  - 无所事事 ⇥ wu2 suo3 shi4 shi4 ⇥ TEXT((无所事事))
  - 总得 ⇥ zong2 dei3 ⇥ TEXT(总得)
  - 得出 ⇥ de2 chu1 ⇥ TEXT(得出)
  - 点儿 ⇥ dianr3 none5 ⇥ TEXT(点儿)
  - 孩儿 ⇥ hair2 none5 ⇥ TEXT([男|女|小|大](孩儿))
  - 分子 ⇥ fen1 zi3 ⇥ TEXT(分子)
  - 长出 ⇥ chang2 chu1 ⇥ TEXT((长出)[了一口气|一口气])
  - 干干 ⇥ gan4 gan5 ⇥ TEXT(干干)
  - 干干 ⇥ gan1 gan1 ⇥ TEXT((干干)[净净|巴巴])
  - 哆嗦 ⇥ duo1 suo5 ⇥ TEXT(哆嗦)
  - 哆哆嗦嗦 ⇥ duo1 duo1 suo1 suo1 ⇥ TEXT(哆哆嗦嗦)
  - 盹儿 ⇥ dunr3 none5 ⇥ TEXT(盹儿)
  - 长 ⇥ chang2 ⇥ TEXT(长)
  - 长 ⇥ zhang3 ⇥ TEXT([成|疯|兄|仙|嫡](长)[兄|姐|姊|子|女|高|大|胖|成|出])
  - 鱼鱼 ⇥ yu2 yu5 ⇥ TEXT(鱼鱼)
  - 肉肉 ⇥ rou4 rou5 ⇥ TEXT(肉肉)
  - 肉肉的 ⇥ rou4 rou4 de5 ⇥ TEXT(肉肉的)
  - 类似的 ⇥ lei4 si4 de5 ⇥ TEXT(类似的)
  - 画儿 ⇥ huar4 none5 ⇥ TEXT(画儿)
  - 年龄 ⇥ nian2 ling5 ⇥ TEXT(年龄)
  - 背 ⇥ bei1 ⇥ TEXT([地](背)[起|着|好])
  - 背 ⇥ bei4 ⇥ TEXT([后|的|不|好|难|在](背)[上|了|过气|课|书|单词|知识|完|不完|景|影|面|阴])
  - 士 ⇥ shi5 ⇥ TEXT([战|将](士))
  - 小伙子 ⇥ xiao2 huo3 zi5 ⇥ TEXT(小伙子)
  - 歇歇 ⇥ xie1 xie5 ⇥ TEXT(歇歇)
  - 歇歇 ⇥ xie1 xie1 ⇥ TEXT([走走](歇歇)[停停])
  - 行 ⇥ xing2 ⇥ TEXT([不|能|可|飞](行)[走|路|为|不行|吧|了])
  - 行 ⇥ hang2 ⇥ TEXT([银|招|工|建|农|粮|四大](行)[间])
  - 嘟囔 ⇥ du1 nang5 ⇥ TEXT(嘟囔)
  - 嘟哝 ⇥ du1 nong5 ⇥ TEXT(嘟哝)
  - 咕哝 ⇥ gu1 nong5 ⇥ TEXT(咕哝)
  - 糊涂 ⇥ hu2 tu5 ⇥ TEXT(糊涂)
  - 幼稚 ⇥ you4 zhi5 ⇥ TEXT(幼稚)
  - 太阳 ⇥ tai4 yang5 ⇥ TEXT(太阳)
  - 扎实 ⇥ zha1 shi5 ⇥ TEXT(扎实)
  - 目的 ⇥ mu5 di5 ⇥ TEXT(目的)
  - 目的 ⇥ mu5 de5 ⇥ TEXT([项|数](目的))
  - 得了吗 ⇥ de5 liao3 ma1 ⇥ TEXT(得了吗)
去重删除: 41 条
输出: 1394 条
分组: PINYIN 2 / WORD_INSIDE 22 / TEXT 1370
输出文件: unified_rule.txt
<!-- SESSION_STATE_END -->

## 备注 / 已知坑
- `plan.txt` 标题行可能带说明文字（如 `分组: 词边界规则...`），解析按「前缀开头」判定标题，避免误把标题当新增行。
- 新增行使用真实汉字转拼音排序；若某些字希望用补丁指定读音参与排序，需在脚本加「字→拼音」映射表。
- `unified_rule.txt.bak` 切勿手动改；要改源数据请改 bak（或改 plan.txt 的移除/新增），再跑脚本。
