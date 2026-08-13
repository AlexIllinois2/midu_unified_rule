# -*- coding: utf-8 -*-
import sys
import os
from pypinyin import pinyin as _pinyin, Style as _Style

# 汉字 -> 带数字声调拼音 的缓存（轻声补 5，与补丁记法一致）
_PINYIN_CACHE = {}


def key_pinyin(char):
    """把第一列汉字转为带数字声调的拼音（多字词空格分隔），轻声补 '5'。"""
    if char in _PINYIN_CACHE:
        return _PINYIN_CACHE[char]
    syls = _pinyin(char, style=_Style.TONE3, heteronym=False)
    out = []
    for syl in syls:
        p = syl[0]
        if not p:
            continue
        if p[-1] not in "12345":  # TONE3 轻声不带数字，补 5
            p = p + "5"
        out.append(p)
    res = " ".join(out)
    _PINYIN_CACHE[char] = res
    return res

# 路径取脚本所在目录，方便随文件夹移动
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(_HERE, "unified_rule.txt")
BAK = SRC + ".bak"  # 始终从干净备份读入，避免分组标题被误判

# 分组显示名与排序优先级
GROUP_ORDER = ["WORD_INSIDE", "PINYIN", "TEXT"]
GROUP_DESC = {
    "WORD_INSIDE": "词边界规则",
    "PINYIN": "拼音模式规则",
    "TEXT": "上下文规则",
}


def first_cond_type(rest):
    """rest 为去掉内联注释后的条件部分，返回首个条件类型(取 '(' 之前，并去掉前导 '!')。"""
    s = rest.strip()
    if not s:
        return "OTHER"
    token = s.split()[0]
    token = token.lstrip("!")
    if "(" in token:
        return token[: token.index("(")]
    return token


def parse(line):
    """返回 (char, pinyin, cond_type, raw)"""
    raw = line.rstrip("\n")
    # 去掉行尾空白用于展示，但保留原始结构
    parts = raw.split("\t")
    char = parts[0]
    pinyin = parts[1] if len(parts) > 1 else ""
    rest_all = "\t".join(parts[2:]) if len(parts) > 2 else ""
    cond_part = rest_all.split("#")[0]  # 去掉内联注释
    ctype = first_cond_type(cond_part)
    return char, pinyin, ctype, raw


def main():
    with open(BAK, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # 1) 去重（按整行 rstrip 后去重，保留首次出现）
    seen = set()
    deduped = []
    removed = 0
    for ln in lines:
        if ln.strip() == "":
            continue  # 跳过纯空行
        key = ln.rstrip()
        if key in seen:
            removed += 1
            continue
        seen.add(key)
        deduped.append(ln.rstrip("\n"))

    # 2) 分组
    groups = {}
    for ln in deduped:
        char, pinyin, ctype, raw = parse(ln)
        groups.setdefault(ctype, []).append((char, pinyin, raw))

    # 3) 排序：
    #    一级 按 key(第一列)字数；
    #    二级 第2列为 *5/*3 等非拼音标记的排在前；
    #    三级 按拼音——非拼音标记者用 key 转拼音(带数字声调)，其余用第2列发音
    def sort_key(t):
        char, pinyin, raw = t
        special = pinyin.lstrip().startswith("*")
        sp = key_pinyin(char) if special else pinyin
        return (len(char), 0 if special else 1, sp, char, raw)

    for k in groups:
        groups[k].sort(key=sort_key)

    # 4) 组排序：按条目数升序（少在前，多在后），同数按组名
    ordered_keys = sorted(groups.keys(), key=lambda k: (len(groups[k]), k))

    out = []
    for gi, k in enumerate(ordered_keys):
        desc = GROUP_DESC.get(k, "其他规则")
        out.append("# ===== %s %s (%d 条) =====" % (k, desc, len(groups[k])))
        out.append("")
        for char, pinyin, raw in groups[k]:
            out.append(raw)
        if gi != len(ordered_keys) - 1:
            out.append("")  # 组间空行

    with open(SRC, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")

    print("原始行数(非空):", len([l for l in lines if l.strip()]))
    print("去重删除:", removed)
    print("去重后:", len(deduped))
    print("分组数:", len(ordered_keys))
    for k in ordered_keys:
        print("  %-12s %d 条" % (k, len(groups[k])))
    print("输出总行数:", len(out))


if __name__ == "__main__":
    main()
