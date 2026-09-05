#!/usr/bin/env python3
"""checks/nav_depth.py -- DOC-NAV-02/03/04 in one script, per the severity
ledger's "same unwritten script" note. Covers MkDocs Material (nav: mapping,
via PyYAML), VitePress (regex-based items/collapsed depth, since config.mts
is TypeScript, not JSON -- ponytail: no JS parser, add a real AST parse if
config shapes get more exotic than nested object literals), and mdBook
(SUMMARY.md indent depth, with '# Part Title' as a zero-depth grouping, per
the mdBook SUMMARY.md format).

Usage: python3 nav_depth.py <repo-root>
Prints: max depth, whether the deepest level is collapsed, whether the
top level is grouped (DOC-NAV-03, >=8 flat entries), and a breadcrumb
verdict for DOC-NAV-04.
"""
import re
import sys
from pathlib import Path

try:
    import yaml

    class _PermissiveLoader(yaml.SafeLoader):
        """mkdocs.yml routinely carries custom tags a naive safe_load cannot
        resolve: !ENV [VAR, default] (mkdocs-material env substitution) and
        !!python/name:... (pymdownx emoji/twemoji index functions). A script
        that only handles the nav: key does not need to resolve either --
        pass every unknown tag through as its raw scalar/sequence value.
        Measured need: 4 of 7 fleet mkdocs.yml files use one or both tags,
        and yaml.safe_load hard-fails on all four without this.
        """

    def _passthrough(loader, tag_suffix, node):
        if isinstance(node, yaml.ScalarNode):
            return loader.construct_scalar(node)
        if isinstance(node, yaml.SequenceNode):
            return loader.construct_sequence(node)
        return loader.construct_mapping(node)

    _PermissiveLoader.add_multi_constructor("!", _passthrough)
    _PermissiveLoader.add_multi_constructor("tag:", _passthrough)
except ImportError:
    yaml = None


def mkdocs_depth(nav, level=1):
    """nav is the parsed YAML value of the top-level `nav:` key -- a list of
    single-key dicts (page) or dicts whose value is a nested list (group)."""
    max_depth = level
    third_level_expanded = False
    for item in nav:
        if isinstance(item, dict):
            for _key, val in item.items():
                if isinstance(val, list):
                    d, exp = mkdocs_depth(val, level + 1)
                    max_depth = max(max_depth, d)
                    third_level_expanded = third_level_expanded or exp
    return max_depth, third_level_expanded


def check_mkdocs(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    if yaml is None:
        return None
    try:
        data = yaml.load(text, Loader=_PermissiveLoader)
    except yaml.YAMLError as e:
        return {"error": f"YAML parse failed: {e}"}
    nav = data.get("nav") if isinstance(data, dict) else None
    if not nav:
        return {"error": "no nav: key"}
    depth, _ = mkdocs_depth(nav)
    top_entries_no_children = sum(
        1 for item in nav if isinstance(item, dict)
        for _k, v in item.items() if not isinstance(v, list)
    )
    has_path = bool(re.search(r"navigation\.path", text))
    return {
        "generator": "mkdocs",
        "max_depth": depth,
        "top_level_bare_entries": top_entries_no_children,
        "flat_at_8plus": top_entries_no_children >= 8,
        "breadcrumb_configured": has_path,
        "depth3_needs_breadcrumb_and_has_it": (depth < 3) or has_path,
    }


def _slice_balanced(text, start):
    """Return text from `start` (must point at an opening bracket) to its
    matching close, inclusive."""
    open_ch, close_ch = text[start], {"{": "}", "[": "]"}[text[start]]
    depth = 0
    for i in range(start, len(text)):
        if text[i] == open_ch:
            depth += 1
        elif text[i] == close_ch:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return text[start:]


def check_vitepress(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    # VitePress depth as this fleet counts it (per docs-navigation-search.md's
    # own read of ocx): level 1 is the top nav bar (`nav: [...]`), level 2 is
    # the sidebar's own flat entry list, level 3 is a group's `items: [...]`.
    # config.mts is TypeScript, not JSON, so this is a bracket-balanced slice
    # plus regex, not a real parser -- ponytail: good enough for one shape,
    # reach for a real TS/JSON5 parser if a site nests items two levels deep.
    has_top_navbar = bool(re.search(r"\bnav:\s*\[", text))
    m = re.search(r"\bsidebar:\s*(\{|\[)", text)
    if not m:
        return {"generator": "vitepress", "error": "no sidebar: key found"}
    sidebar_block = _slice_balanced(text, m.start(1))
    # Max nesting of "items: [" *inside the sidebar block only*.
    items_depth = 0
    max_items_depth = 0
    for tok in re.finditer(r"(items:\s*\[)|(\[)|(\])", sidebar_block):
        if tok.group(1):
            items_depth += 1
            max_items_depth = max(max_items_depth, items_depth)
        elif tok.group(3) and items_depth > 0:
            items_depth -= 1
    base = (1 if has_top_navbar else 0) + 1  # navbar (if any) + sidebar's own flat list
    max_depth = base + max_items_depth
    collapsed_groups = len(re.findall(r"collapsed:\s*true", sidebar_block))
    groups_with_items = len(re.findall(r"items:\s*\[", sidebar_block))
    has_navpath_component = "navigation.path" in text or "Breadcrumb" in text
    return {
        "generator": "vitepress",
        "max_depth": max_depth,
        "groups_with_items": groups_with_items,
        "collapsed_group_count": collapsed_groups,
        "third_level_all_collapsed": max_depth < 3 or collapsed_groups >= groups_with_items,
        "breadcrumb_component_present": has_navpath_component,
        "depth3_needs_breadcrumb_and_has_it": (max_depth < 3) or has_navpath_component,
    }


def check_mdbook(path):
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    max_indent_level = 0
    top_level_bullets = 0
    part_titles = 0
    # The mdBook SUMMARY.md format requires the file's own first line to be
    # "# Summary" -- that is the document's mandated title, not a grouping
    # divider. A naive "any # line counts as a Part Title" miscounts a
    # completely flat file as grouped. Measured against grimoire's real
    # SUMMARY.md: without this exclusion the check reports 1 divider and
    # calls a 20-item flat list "grouped".
    seen_first_heading = False
    for ln in lines:
        if re.match(r"^#\s+\S", ln):
            if not seen_first_heading:
                seen_first_heading = True
                continue
            part_titles += 1
            continue
        m = re.match(r"^(\s*)-\s+\[", ln)
        if not m:
            continue
        indent = len(m.group(1))
        level = indent // 2 + 1  # mdBook SUMMARY.md uses 2-space indents per level
        max_indent_level = max(max_indent_level, level)
        if level == 1:
            top_level_bullets += 1
    return {
        "generator": "mdbook",
        "max_depth": max_indent_level,
        "top_level_bullets": top_level_bullets,
        "part_title_dividers": part_titles,
        "flat_at_8plus_with_no_dividers": top_level_bullets >= 8 and part_titles == 0,
    }


def main():
    root = Path(sys.argv[1])
    mkdocs_yml = root / "mkdocs.yml"
    vitepress_cfg = None
    for cand in ["website/.vitepress/config.mts", "website/.vitepress/config.ts",
                 ".vitepress/config.mts", ".vitepress/config.ts"]:
        p = root / cand
        if p.exists():
            vitepress_cfg = p
            break
    summary_md = None
    for cand in ["docs/src/SUMMARY.md", "docs/SUMMARY.md"]:
        p = root / cand
        if p.exists():
            summary_md = p
            break

    if mkdocs_yml.exists():
        print(root.name, check_mkdocs(mkdocs_yml))
    elif vitepress_cfg:
        print(root.name, check_vitepress(vitepress_cfg))
    elif summary_md:
        print(root.name, check_mdbook(summary_md))
    else:
        print(root.name, {"error": "no generator config found, not applicable (DOC-NAV-01)"})


if __name__ == "__main__":
    main()
