#!/usr/bin/env python3
"""Structural checks for AI-config artifacts (skills, rules) and research corpora.

Run this before publishing. It checks the contract, never the content:
name parity, context budgets, link resolution, table-of-contents presence,
description hygiene, rule-table completeness, and glob liveness.

    ./check-artifacts.py PATH [PATH ...] [--root DIR] [--forbid STRING ...]
    ./check-artifacts.py --self-test

PATH may be a skill directory (contains SKILL.md), a rule .md file, a
directory of rule files, or a research corpus directory. Exit 0 = clean,
1 = findings, 2 = bad invocation. Dependencies: python3 only (PyYAML is
used when importable, otherwise a minimal frontmatter parser is used).
"""

from __future__ import annotations

import argparse
import re
import shlex
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

SKILL_BODY_MAX = 500
RULE_BODY_MAX = 200
TOC_REQUIRED_OVER = 100
DESCRIPTION_MAX = 1024
NAME_RE = re.compile(r"^[a-z0-9]+([.-][a-z0-9]+)*$")
# Verbs that, when they open a description, describe the artifact's own
# procedure instead of when to load it (the CSO violation).
WORKFLOW_VERBS = {
    "dispatches",
    "runs",
    "iterates",
    "orchestrates",
    "performs",
    "executes",
    "handles",
    "generates",
    "creates",
    "builds",
}
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)#\s]+)(?:#[^)]*)?\)")
_ID = r"[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+"
ID_RE = re.compile(rf"^\|\s*({_ID})\s*\|")
# A prose mention of a rule ID anywhere but its own defining row.
CITE_RE = re.compile(rf"\b({_ID})\b")
# A backtick-delimited code span; in a table row these are runnable commands.
CODE_SPAN_RE = re.compile(r"`([^`]+)`")
# `-tn rust` reads as --type n, not --type-not; rg exits 2.
BAD_TYPE_RE = re.compile(r"-tn\s")
# A single-quoted argument — for rg and grep, the search pattern.
QUOTED_RE = re.compile(r"'([^']*)'")
# An unsubstituted template inside a search pattern: matches nothing, always.
TEMPLATE_RE = re.compile(r"<[a-zA-Z][\w -]*>")
# …but a search pattern legitimately contains a generic argument. These are
# types, not placeholders the reader is expected to fill in.
NOT_A_TEMPLATE = re.compile(
    r"^(?:[uif](?:8|16|32|64|128|size)|bool|char|str|String|Self|T|K|V|E"
    r"|Path|PathBuf|OsStr|OsString|dyn .*)$"
)
# A shell glob in a bare path operand. `crates/*/Cargo.toml` is expanded by the
# shell, so it aborts the whole command on a repo with no `crates/`.
BARE_GLOB_RE = re.compile(r"(?<![\w'\"/-])(?:[\w.-]+/)+\*")
# Command substitution: when the inner command finds nothing the outer one is
# left with zero path operands, which inverts or hangs it.
SUBST_RE = re.compile(r"\$\(")
# ripgrep flags that consume the following arg, so it is not a path operand.
RG_VALUED = {
    "-e",
    "--regexp",
    "-g",
    "--glob",
    "--iglob",
    "-t",
    "--type",
    "-T",
    "--type-not",
    "-A",
    "--after-context",
    "-B",
    "--before-context",
    "-C",
    "--context",
    "-m",
    "--max-count",
    "-f",
    "--file",
    "--pre",
    "--sort",
    "--sortr",
    "-M",
    "--max-columns",
    "--max-filesize",
    "-d",
    "--max-depth",
    "--replace",
    "-r",
}
# ID prefixes are collected from what the corpus defines, so a citation is
# only checked against families this run actually saw a definition for —
# an artifact set that legitimately references a sibling package's IDs is
# not punished for it.
CITED: dict[str, Path] = {}


@dataclass
class Finding:
    path: Path
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def split_frontmatter(text: str) -> tuple[dict, str]:
    """Return (frontmatter dict, body). Missing frontmatter yields ({}, text)."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    raw = text[3:end]
    body = text[end + 4 :]
    try:
        import yaml  # type: ignore  # noqa: PLC0415 - optional dep, probed at call time

        return yaml.safe_load(raw) or {}, body
    except Exception:
        return _mini_yaml(raw), body


def _mini_yaml(raw: str) -> dict:
    """Enough YAML for frontmatter: scalars, one nested map, one list."""
    out: dict = {}
    key = None
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indented = line[0] in " \t"
        stripped = line.strip()
        if indented and stripped.startswith("- ") and key:
            # A valueless key below parsed as `{}` because a map was the more
            # common case; the first `- ` item is what proves it is a list.
            # Committing to the dict here silently dropped every item, which
            # made `check_globs` skip its `isinstance(..., list)` guard and
            # report no dead globs at all wherever PyYAML was absent.
            if not isinstance(out.get(key), list):
                out[key] = []
            out[key].append(stripped[2:].strip().strip("\"'"))
            continue
        if indented and ":" in stripped and key:
            sub, _, val = stripped.partition(":")
            if isinstance(out.get(key), dict):
                out[key][sub.strip()] = val.strip().strip("\"'")
            continue
        if ":" in stripped:
            key, _, val = stripped.partition(":")
            key = key.strip()
            val = val.strip()
            out[key] = val.strip("\"'") if val else {}
    return out


def check_description(path: Path, desc: object, findings: list[Finding]) -> None:
    if not isinstance(desc, str) or not desc.strip():
        findings.append(Finding(path, "description is missing or empty"))
        return
    if len(desc) > DESCRIPTION_MAX:
        findings.append(Finding(path, f"description is {len(desc)} chars (max {DESCRIPTION_MAX})"))
    if "\n" in desc.strip():
        findings.append(Finding(path, "description spans multiple lines — keep it one line"))
    first = desc.strip().split(" ", 1)[0].rstrip(".,").lower()
    if first in WORKFLOW_VERBS:
        findings.append(
            Finding(
                path,
                f"description opens with the workflow verb '{first}' — say when to use it, not what it does",
            )
        )
    if re.match(r"^(i |i'|we |you can |this skill )", desc.strip(), re.IGNORECASE):
        findings.append(Finding(path, "description is not third person"))
    if "use when" not in desc.lower():
        findings.append(Finding(path, "description has no 'Use when' trigger clause"))


def check_toc(path: Path, body: str, findings: list[Finding]) -> None:
    """Long files need a map. An index file may carry it as a routing table."""
    lines = body.splitlines()
    if len(lines) <= TOC_REQUIRED_OVER:
        return
    head = "\n".join(lines[:40]).lower()
    if "contents:" in head or "## contents" in head or "table of contents" in head:
        return
    # Root-as-index files (SKILL.md, a rule index) route via a table of links
    # rather than an anchor list; accept that anywhere in the file.
    is_index = path.name == "SKILL.md" or path.with_suffix("").is_dir()
    routes = (
        re.search(r"^\|\s*\[?read", body, re.IGNORECASE | re.MULTILINE)
        or body.lower().count("](references/") >= 2
        or body.lower().count(f"]({path.stem}/") >= 2
    )
    if is_index and routes:
        return
    findings.append(Finding(path, f"{len(lines)} lines but no table of contents or routing table"))


def check_links(path: Path, body: str, findings: list[Finding]) -> None:
    for target in LINK_RE.findall(body):
        if target.startswith(("http://", "https://", "mailto:")):
            continue
        if not (path.parent / target).exists():
            findings.append(Finding(path, f"broken relative link: {target}"))


def rg_path_operands(span: str) -> list[str] | None:
    """The path arguments of an `rg` command, or None if it is not one.

    ``rg PATTERN`` with no path searches **stdin**, not the working directory,
    whenever stdin is not a TTY. A human testing the command in a terminal gets
    a recursive search and concludes it works; an agent — whose shell always has
    stdin on a pipe — gets an empty read, exit 1, and no output. The check reads
    as clean and can never fail. Every rg command therefore needs an explicit
    path operand, `.` at minimum.
    """
    if not span.startswith("rg "):
        return None
    try:
        tokens = shlex.split(span)
    except ValueError:
        return None
    operands, index, used_e = [], 1, False
    while index < len(tokens):
        arg = tokens[index]
        if arg in RG_VALUED:
            used_e = used_e or arg in ("-e", "--regexp")
            index += 2
            continue
        if arg.startswith("-") and arg != "-":
            index += 1
            continue
        operands.append(arg)
        index += 1
    # Without -e the first bare arg is the pattern; with it, every bare arg
    # is a path.
    return operands if used_e else operands[1:]


def check_runnable_spans(path: Path, line: str, lineno: int, findings: list[Finding]) -> None:
    """A command in a table cell must survive being pasted into a shell.

    A Markdown table cell cannot hold a bare ``|``, so an author writes
    ``\\|``. Rendered, that is a pipe. But an agent reads the *raw* file:
    it copies ``rg 'a\\|b'``, which the regex engine reads as a literal
    ``|``, so the alternation silently becomes a search for a string that
    does not occur. The command exits 1, reads as "clean", and can never
    go red — a verification that cannot fail is worse than none.

    There is no escaping that fixes this, because the two readers disagree.
    Restate the command without a pipe: ``rg -e 'a' -e 'b'``.
    """
    for span in CODE_SPAN_RE.findall(line):
        if "|" in span:
            findings.append(
                Finding(
                    path,
                    f"line {lineno}: command span in a table cell contains a pipe, "
                    f"which an agent pastes as a literal: `{span[:70]}`",
                )
            )
        if BAD_TYPE_RE.search(span):
            findings.append(
                Finding(
                    path,
                    f"line {lineno}: `-tn <lang>` is not --type; rg parses it as type 'n' "
                    f"and exits 2. Use `--type <lang>`: `{span[:70]}`",
                )
            )
        operands = rg_path_operands(span)
        if operands is not None and not operands:
            findings.append(
                Finding(
                    path,
                    f"line {lineno}: rg command has no path operand, so it searches stdin "
                    f"rather than the tree whenever stdin is not a TTY — which is always, "
                    f"for an agent. Append ` .`: `{span[:70]}`",
                )
            )
        if not span.startswith(("rg ", "grep ", "git grep ")):
            continue
        for quoted in QUOTED_RE.findall(span):
            template = next(
                (
                    m
                    for m in TEMPLATE_RE.finditer(quoted)
                    if not NOT_A_TEMPLATE.match(m.group(0)[1:-1])
                ),
                None,
            )
            if template:
                findings.append(
                    Finding(
                        path,
                        f"line {lineno}: search pattern contains the unsubstituted template "
                        f"{template.group(0)!r} — it matches nothing and the check reads as "
                        f"clean: `{span[:70]}`",
                    )
                )
        if SUBST_RE.search(span):
            findings.append(
                Finding(
                    path,
                    f"line {lineno}: command substitution supplies the path operands; when it "
                    f"is empty the command scans everything or blocks on stdin, inverting the "
                    f"check. Pipe through `xargs -r`, or drop it: `{span[:70]}`",
                )
            )
        stripped = QUOTED_RE.sub("''", span)
        glob = BARE_GLOB_RE.search(stripped)
        if glob and "--glob" not in stripped and " -g " not in stripped:
            findings.append(
                Finding(
                    path,
                    f"line {lineno}: shell glob {glob.group(0)!r} in a bare path operand — the "
                    f"shell aborts the command on a repo without that directory. Use "
                    f"`--glob '**/…'`: `{span[:70]}`",
                )
            )


def check_rule_tables(path: Path, body: str, findings: list[Finding], seen_ids: dict) -> None:
    """Rows in a table with a Verification column must fill that column.

    Also indexes rule IDs: definitions (a leading table cell) into
    ``seen_ids``, prose mentions into ``CITED``, so ``check_citations``
    can report an ID that is cited but defined nowhere.
    """
    columns: list[str] | None = None
    verify_at: int | None = None
    for lineno, line in enumerate(body.splitlines(), 1):
        for cite in CITE_RE.findall(line):
            CITED.setdefault(cite, path)
        if not line.startswith("|"):
            columns, verify_at = None, None
            continue
        check_runnable_spans(path, line, lineno, findings)
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if columns is None:
            columns = [c.lower() for c in cells]
            verify_at = next((i for i, c in enumerate(columns) if "verif" in c), None)
            continue
        if set("".join(cells)) <= set("-: "):
            continue
        match = ID_RE.match(line)
        if match:
            rule_id = match.group(1)
            if rule_id in seen_ids and seen_ids[rule_id] != path:
                findings.append(
                    Finding(path, f"rule id {rule_id} also defined in {seen_ids[rule_id]}")
                )
            seen_ids[rule_id] = path
        if verify_at is not None and verify_at < len(cells) and not cells[verify_at]:
            label = cells[0][:40]
            findings.append(Finding(path, f"rule row '{label}' has an empty verification cell"))


def check_globs(
    path: Path, paths_value: object, root: Path | None, findings: list[Finding]
) -> None:
    if root is None or not isinstance(paths_value, list):
        return
    for glob in paths_value:
        if not isinstance(glob, str):
            continue
        pattern = glob.removeprefix("**/")
        if not any(root.rglob(pattern)):
            findings.append(Finding(path, f"dead glob: '{glob}' matches no file under {root}"))


def check_forbidden(path: Path, text: str, forbid: list[str], findings: list[Finding]) -> None:
    for needle in forbid:
        if needle in text:
            findings.append(Finding(path, f"forbidden string present: {needle!r}"))


def check_skill(
    directory: Path, root: Path | None, forbid: list[str], findings: list[Finding], seen_ids: dict
) -> None:
    index = directory / "SKILL.md"
    text = index.read_text(encoding="utf-8")
    front, body = split_frontmatter(text)
    if not front:
        findings.append(Finding(index, "no YAML frontmatter"))
    name = front.get("name")
    if name != directory.name:
        findings.append(
            Finding(index, f"frontmatter name {name!r} != directory name {directory.name!r}")
        )
    if isinstance(name, str) and not NAME_RE.match(name):
        findings.append(
            Finding(index, f"name {name!r} violates the [a-z0-9] + single separator charset")
        )
    check_description(index, front.get("description"), findings)
    if len(body.splitlines()) > SKILL_BODY_MAX:
        findings.append(
            Finding(index, f"body is {len(body.splitlines())} lines (max {SKILL_BODY_MAX})")
        )
    for md in sorted(directory.rglob("*.md")):
        inner = md.read_text(encoding="utf-8")
        _, inner_body = split_frontmatter(inner)
        check_toc(md, inner_body, findings)
        check_links(md, inner_body, findings)
        check_rule_tables(md, inner_body, findings, seen_ids)
        check_forbidden(md, inner, forbid, findings)
        if md != index and not any(
            md.name in other.read_text(encoding="utf-8")
            for other in directory.rglob("*.md")
            if other != md
        ):
            findings.append(
                Finding(md, "bundled file is never referenced from another file in the skill")
            )


def check_rule(
    path: Path, root: Path | None, forbid: list[str], findings: list[Finding], seen_ids: dict
) -> None:
    text = path.read_text(encoding="utf-8")
    front, body = split_frontmatter(text)
    stem = path.stem
    if not NAME_RE.match(stem):
        findings.append(Finding(path, f"file stem {stem!r} violates the name charset"))
    if len(body.splitlines()) > RULE_BODY_MAX:
        findings.append(
            Finding(
                path,
                f"body is {len(body.splitlines())} lines (max {RULE_BODY_MAX}) — move depth into the support directory",
            )
        )
    metadata = front.get("metadata")
    if isinstance(metadata, dict):
        for key in ("summary", "keywords", "repository"):
            if key in metadata:
                findings.append(
                    Finding(
                        path, f"'{key}' belongs at the top level of a rule, not inside metadata"
                    )
                )
    check_globs(path, front.get("paths"), root, findings)
    check_toc(path, body, findings)
    check_links(path, body, findings)
    check_rule_tables(path, body, findings, seen_ids)
    check_forbidden(path, text, forbid, findings)
    support = path.with_suffix("")
    if support.is_dir():
        for md in sorted(support.rglob("*.md")):
            inner_text = md.read_text(encoding="utf-8")
            _, inner_body = split_frontmatter(inner_text)
            check_toc(md, inner_body, findings)
            check_links(md, inner_body, findings)
            check_rule_tables(md, inner_body, findings, seen_ids)
            check_forbidden(md, inner_text, forbid, findings)
            if md.name not in text:
                findings.append(Finding(md, "support file is not routed to from the rule index"))


def walk(
    target: Path, root: Path | None, forbid: list[str], findings: list[Finding], seen_ids: dict
) -> None:
    if target.is_dir():
        if (target / "SKILL.md").exists():
            check_skill(target, root, forbid, findings, seen_ids)
            return
        for child in sorted(target.iterdir()):
            if child.name.startswith("."):
                continue
            if child.is_dir() and child.with_suffix(".md").exists():
                continue  # rule support dir, covered by its index
            walk(child, root, forbid, findings, seen_ids)
        return
    if target.suffix == ".md":
        check_rule(target, root, forbid, findings, seen_ids)


def check_citations(seen_ids: dict, findings: list[Finding]) -> None:
    """An ID cited in prose but defined in no rule table is a dead pointer.

    Only families with at least one definition in this run are checked, so
    a citation of an ID owned by another package is left alone.
    """
    families = {rule_id.rsplit("-", 1)[0] for rule_id in seen_ids}
    for rule_id, path in sorted(CITED.items()):
        if rule_id in seen_ids or rule_id.rsplit("-", 1)[0] not in families:
            continue
        findings.append(Finding(path, f"cites {rule_id}, which no rule table defines"))


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        skill = base / "bad-skill"
        skill.mkdir()
        (skill / "SKILL.md").write_text(
            "---\nname: wrong-name\ndescription: Runs the thing and fixes it.\n---\n\n"
            "# Bad\n\n[dangling](references/nope.md)\n",
            encoding="utf-8",
        )
        rule = base / "bad-rule.md"
        rule.write_text(
            '---\npaths:\n  - "**/*.nonexistent"\nmetadata:\n  summary: misplaced\n---\n\n'
            "| ID | Rule | Verification |\n|---|---|---|\n| X-01 | do a thing, see X-99 |  |\n",
            encoding="utf-8",
        )
        findings: list[Finding] = []
        seen: dict = {}
        CITED.clear()
        walk(base, base, [], findings, seen)
        check_citations(seen, findings)
        messages = " ".join(f.message for f in findings)
        assert "!= directory name" in messages, messages
        assert "workflow verb" in messages, messages
        assert "broken relative link" in messages, messages
        assert "dead glob" in messages, messages
        assert "belongs at the top level" in messages, messages
        assert "empty verification cell" in messages, messages
        assert "cites X-99" in messages, messages

        good = base / "good-skill"
        good.mkdir()
        (good / "SKILL.md").write_text(
            "---\nname: good-skill\ndescription: Checks widget manifests for drift. "
            "Use when reviewing a widget manifest or when the user mentions widget drift.\n---\n\n"
            "# Good\n\nNothing to see.\n",
            encoding="utf-8",
        )
        clean: list[Finding] = []
        CITED.clear()
        walk(good, base, [], clean, {})
        assert not clean, [str(f) for f in clean]
    print("self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "paths", nargs="*", type=Path, help="skill dirs, rule files, or directories of them"
    )
    parser.add_argument(
        "--root", type=Path, default=None, help="repository root used to test glob liveness"
    )
    parser.add_argument(
        "--forbid",
        action="append",
        default=[],
        metavar="STRING",
        help="fail if this string appears in any artifact (repeatable)",
    )
    parser.add_argument("--self-test", action="store_true", help="run the built-in checks and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if not args.paths:
        parser.error("give at least one PATH, or --self-test")

    findings: list[Finding] = []
    seen_ids: dict = {}
    for target in args.paths:
        if not target.exists():
            print(f"error: no such path: {target}", file=sys.stderr)
            return 2
        walk(target, args.root, args.forbid, findings, seen_ids)
    check_citations(seen_ids, findings)

    for finding in findings:
        print(finding)
    print(f"\n{len(findings)} finding(s)" if findings else "\nclean")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
