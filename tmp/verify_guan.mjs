import { readFileSync } from "node:fs";
const rules = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.startsWith("观\t"))
  .map(l => { const p = l.split("\t"); const src = p.slice(2).join("\t").replace(/^TEXT\((.*)\)$/, "$1"); return { py: p[1], src, re: new RegExp(src, "g") }; });
console.log("观规则:", rules.length, "条（无通配，未命中即词典默认 guān）");
function judge(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "观") continue;
    const hits = [];
    for (const r of rules) {
      r.re.lastIndex = 0; let m;
      while ((m = r.re.exec(s))) {
        if (!m[0].length) { r.re.lastIndex++; continue; }
        if (m.index + m[0].indexOf("观") === i) { hits.push({ py: r.py, len: m[0].length }); break; }
        if (r.re.lastIndex <= m.index) break;
      }
    }
    hits.sort((a, b) => b.len - a.len);
    out.push(`#${i}=${hits[0] ? (hits[0].py === "guan4" ? "guàn" : "guān") : "guān(默认)"}`);
  }
  return out.join(" ");
}
const cases = [
  ["他走进道观中", "guàn"], ["他走进观中", "guàn"], ["观外的松林一片漆黑", "guàn"],
  ["在观外等他", "guàn"], ["清虚观里空无一人", "guàn"], ["玄都观中香火缭绕", "guàn"],
  ["山坳里有一座观", "guàn"], ["这座观的香火很旺", "guàn"], ["白云观", "guàn"],
  ["宫观林立", "guàn"], ["寺观", "guàn"], ["道观后墙", "guàn"],
  ["众人围观中，他走了出来", "guān"], ["展览正在参观中", "guān"],
  ["参观内容如下", "guān"], ["参观门票十元", "guān"], ["观后感", "guān"],
  ["主观主义要不得", "guān"], ["在乐观中带着一丝忧虑", "guān"],
  ["他仔细观察", "guān"], ["观众席", "guān"], ["宏伟壮观", "guān"], ["观主缓缓说道", "guàn"], ["主观主义要不得", "guān"], ["可观的收入", "guān"], ["外观的颜色", "guān"],
];
for (const [s, want] of cases) console.log(want.padEnd(6), s.padEnd(22, "　"), judge(s));
