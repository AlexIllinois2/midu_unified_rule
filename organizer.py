# -*- coding: utf-8 -*-
import sys
import os
import re
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


def update_session(removals, additions, removed_dup, final_counts):
    """刷新 SESSION.md 中 STATE_START/STATE_END 标记之间的「当前状态」区块。"""
    import datetime
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    lines_state = []
    lines_state.append("最后运行: %s (本地)" % now)
    lines_state.append("输入源: unified_rule.txt.bak（干净原始，不被修改）")
    lines_state.append("plan.txt 移除: %d 条" % len(removals))
    for r in sorted(removals):
        lines_state.append("  - " + r.replace("\t", " ⇥ "))
    lines_state.append("plan.txt 新增: %d 条" % len(additions))
    for a in additions:
        lines_state.append("  - " + a.replace("\t", " ⇥ "))
    lines_state.append("去重删除: %d 条" % removed_dup)
    total = sum(final_counts.values())
    lines_state.append("输出: %d 条" % total)
    grp = " / ".join("%s %d" % (k, final_counts[k])
                     for k in sorted(final_counts, key=lambda k: (final_counts[k], k)))
    lines_state.append("分组: " + grp)
    lines_state.append("输出文件: unified_rule.txt")

    block = "<!-- SESSION_STATE_START -->\n" + "\n".join(lines_state) + "\n<!-- SESSION_STATE_END -->"
    path = os.path.join(_HERE, "SESSION.md")
    marker_start = "<!-- SESSION_STATE_START -->"
    marker_end = "<!-- SESSION_STATE_END -->"

    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            content = f.read()
        if marker_start in content and marker_end in content:
            content = re.sub(re.escape(marker_start) + r".*?" + re.escape(marker_end),
                             block, content, flags=re.DOTALL)
        else:
            content = content.rstrip() + "\n\n" + block + "\n"
    else:
        content = ("# 项目会话状态 (SESSION)\n\n本文件由 organizer.py 自动维护「当前状态」区块。\n\n"
                   "## 当前状态\n" + block + "\n")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def parse_plan(path):
    """解析 plan.txt 中的 移除:/新增: 区块，返回 (removals 集合, additions 列表)。
    标题行（移除:/新增:/去重:/分组:/排序:/表单定义:/页面操作:）可能带说明文字，
    因此按“以标题前缀开头”判定，遇到任意标题即结束当前收集。"""
    removals = set()
    additions = []
    state = None
    header_prefixes = ["移除:", "新增:", "去重:", "分组:", "排序:", "表单定义:", "页面操作:"]
    with open(path, encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            hit = None
            for h in header_prefixes:
                if s == h or s.startswith(h):
                    hit = h
                    break
            if hit == "移除:":
                state = "remove"
                continue
            if hit == "新增:":
                state = "add"
                continue
            if hit is not None:  # 其它标题：结束当前收集
                state = None
                continue
            if state == "remove" and s:
                removals.add(line.rstrip("\n").rstrip())
            elif state == "add" and s:
                additions.append(line.rstrip("\n").rstrip())
    return removals, additions


def main():
    PLAN = os.path.join(_HERE, "plan.txt")
    removals, additions = parse_plan(PLAN)

    with open(BAK, "r", encoding="utf-8") as f:
        raw_lines = f.readlines()

    # 0) 基于 bak 应用 plan.txt：先移除指定行，再追加新增行
    removed_plan = 0
    lines = []
    for ln in raw_lines:
        if ln.strip() == "":
            continue
        key = ln.rstrip()
        if key in removals:
            removed_plan += 1
            continue
        lines.append(ln)
    for a in additions:
        lines.append(a + "\n")

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

    final_counts = {k: len(groups[k]) for k in groups}
    update_session(removals, additions, removed, final_counts)

    print("原始行数(非空):", len([l for l in raw_lines if l.strip()]))
    print("plan 移除:", removed_plan)
    print("plan 新增:", len(additions))
    print("去重删除:", removed)
    print("去重后:", len(deduped))
    print("分组数:", len(ordered_keys))
    for k in ordered_keys:
        print("  %-12s %d 条" % (k, len(groups[k])))
    print("输出总行数:", len(out))


if __name__ == "__main__":
    main()
