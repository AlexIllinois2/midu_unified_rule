import { readFileSync } from "node:fs";

// 词 -> 调值序列（严格全声 ér 的「人」类，排除口语儿化词）
const list = [
  ["女儿", "3 2"], ["婴儿", "1 2"], ["幼儿", "4 2"], ["孤儿", "1 2"], ["胎儿", "1 2"],
  ["侄儿", "2 2"], ["小儿", "3 2"], ["少儿", "4 2"], ["男儿", "2 2"], ["孙儿", "1 2"],
  ["妻儿", "1 2"], ["患儿", "4 2"], ["健儿", "4 2"], ["宠儿", "3 2"], ["育儿", "4 2"],
  ["托儿", "1 2"], ["产儿", "3 2"], ["乳儿", "3 2"], ["乞儿", "3 2"], ["幺儿", "1 2"],
  ["干儿", "1 2"], ["徒儿", "2 2"], ["新生儿", "1 1 2"], ["婴幼儿", "1 4 2"],
  ["干女儿", "1 3 2"], ["幸运儿", "4 4 2"], ["混血儿", "4 4 2"], ["畸形儿", "1 2 2"],
  ["早产儿", "3 3 2"], ["低能儿", "1 2 2"], ["流浪儿", "2 4 2"], ["试管婴儿", "4 3 1 2"],
  ["科学育儿", "1 2 4 2"], ["黄花女儿", "2 1 3 2"], ["唐氏儿", "2 4 2"], ["喜憨儿", "3 1 2"],
];

const patch = readFileSync("conf/rule_patch.txt", "utf8");
const vendor = readFileSync("conf/unified_rule_vendor.txt", "utf8");
const exist = new Set(
  (patch + "\n" + vendor).split("\n").filter(l => l.includes("\t")).map(l => l.split("\t")[0])
);

let n = 0;
const skip = [];
for (const [w, t] of list) {
  const tones = t.split(" ");
  if ([...w].length !== tones.length) {
    console.error("字数不符:", w, t);
    continue;
  }
  if (exist.has(w)) { skip.push(w); continue; }
  n++;
  console.log(w + "\t" + tones.map(x => "*" + x).join(" ") + "\tTEXT((" + w + "))");
}
console.error("生成 " + n + " 条，已存在跳过 " + skip.length + " 条" + (skip.length ? "：" + skip.join(" ") : ""));
