// 生成「X子 *3 *5」规则行（按首字拼音排序）
import { pinyin } from "pinyin-pro";

const words = `椅子 脑子 影子 嫂子 嗓子 口子 谷子 果子 饺子 鬼子 主子 婊子 李子 婶子 矮子 帖子 碾子 股子 剪子 奶子 拐子 幌子 爪子 靶子 膀子 卵子 苇子 把子 馆子 枣子 毯子 海子 领子 款子 篓子 引子 跛子 筒子 崽子 痞子 顶子 捻子 里子 脸子 肘子 起子 猛子 码子 茧子 褶子 馓子 坎子 疹子 麂子 谱子 黍子 岗子 滚子 笋子 网子 铁子 桶子 榫子 檩子 狗子 秕子 舀子 颈子 种子 法子`.split(/\s+/);

const rows = words.map(w => {
  const py = pinyin(w, { toneType: "num", type: "array", heteronym: false });
  return { w, key: py.join(" ") };
});
rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
console.log(`共 ${rows.length} 条`);
for (const r of rows) console.log(`${r.w}\t*3 *5\tTEXT((${r.w}))`);
