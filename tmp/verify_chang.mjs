import { readFileSync } from "node:fs";
const all = readFileSync("conf/unified_rule.txt", "utf8").split("\n").filter(l => l.startsWith("长\t"));
const rules = all.map(l => { const p = l.split("\t"); const src = p.slice(2).join("\t").replace(/^TEXT\((.*)\)$/, "$1"); return { py: p[1], src, re: new RegExp(src, "g"), wild: src === "(长)" }; });
console.log("参与判定的 长 规则:", rules.length, "（通配垫底、最长匹配优先）");
function judge(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "长") continue;
    const hits = [];
    for (const r of rules) {
      r.re.lastIndex = 0; let m;
      while ((m = r.re.exec(s))) {
        if (m[0].length === 0) { r.re.lastIndex++; continue; }
        if (m.index + m[0].indexOf("长") === i) { hits.push({ py: r.py, len: m[0].length, wild: r.wild, src: r.src }); break; }
        if (r.re.lastIndex <= m.index) break;
      }
    }
    hits.sort((a, b) => (a.wild ? 1 : 0) - (b.wild ? 1 : 0) || b.len - a.len);
    const w = hits[0];
    out.push(`#${i}=${w ? (w.py === "zhang3" ? "zhǎng" : "cháng") : "?"}`);
  }
  return out.join(" ");
}
const cases = [
  ["爹娘说他是个投胎的时候忘了长屁股的", "zhǎng"],
  ["这小子几个月没见，长高了不少", "zhǎng"],
  ["你到底长不长个儿啊", "zhǎng 两个"],
  ["孩子们正在长身体", "zhǎng"],
  ["这绳子长不长", "cháng 两个"],
  ["时间还长着呢", "cháng"],
  ["长长的睫毛垂下来", "cháng 两个"],
  ["他长着一颗泪痣", "zhǎng"],
  ["万里长城", "cháng"],
  ["他长出一口气，瘫在椅子上", "cháng"],
  ["他长出了一口气", "cháng"],
  ["树上长出了嫩芽", "zhǎng"],
  ["这孩子长得真快", "zhǎng"],
  ["他比我年长三岁", "zhǎng"],
  ["长安城外的驿道", "cháng"],
  ["长期在外，长相都忘了", "cháng + zhǎng"],
  ["这根竹竿长两米", "cháng"],
  ["他白长了这么大个子", "zhǎng"],
  ["他长胖了十斤", "zhǎng"],
  ["新苗长得比人还高", "zhǎng"],
  ["这块地长满了荒草", "zhǎng"],
  ["他部长得很精神", "cháng? 部长"],
];
for (const [s, want] of cases) console.log((want).padEnd(14), s.padEnd(24, "　"), judge(s));
