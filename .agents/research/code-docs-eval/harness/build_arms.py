#!/usr/bin/env python3
"""Build eval arms: one history-free snapshot per (arm, site), differing only in the site's comment span.

Arms:
  original  HEAD as-is (one snapshot per repo, shared by its sites)
  rules     span replaced by the frozen cleanup rewrite   (fixtures/rewrites.json, key "rules")
  pointer   span replaced by a one-line pointer, plus an optional record file (key "pointer")
  oneline   span cut to its first content line (mechanical)
  deleted   span removed (mechanical)
  history   deleted, plus the full git history with the span's text redacted from every blob
            of every file with the same extension, over all history (git-filter-repo); Tier A only

Snapshots are hardlinked copies of one extracted base tree; the edited file is unlinked before it
is written, so the base never changes. Each snapshot gets a fresh one-commit git repo, except
history. The build fails when any code line of the site file changes.

Usage: build_arms.py --sites sites.json --fixtures fixtures/rewrites.json --out DIR [--arms a,b] [--only id,id]
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

CHECKS = Path(__file__).resolve().parents[4] / "rules/code-docs/checks"
sys.path.insert(0, str(CHECKS))
import comment_census as cc  # noqa: E402

DEV = Path("/home/mherwig/dev")
GIT = "/usr/bin/git"
ENV = {
    "GIT_AUTHOR_NAME": "eval",
    "GIT_AUTHOR_EMAIL": "eval@localhost",
    "GIT_COMMITTER_NAME": "eval",
    "GIT_COMMITTER_EMAIL": "eval@localhost",
    "PATH": "/usr/bin:/bin:/home/mherwig/.local/bin",
    "HOME": str(Path.home()),
}


def run(cmd, cwd=None, **kw):
    return subprocess.run(cmd, cwd=cwd, check=True, env=ENV, **kw)


def base_tree(out: Path, repo: str) -> Path:
    dest = out / "_base" / repo
    if not dest.exists():
        dest.mkdir(parents=True)
        arc = subprocess.run([GIT, "-C", str(DEV / repo), "archive", "HEAD"], capture_output=True, check=True)
        subprocess.run(["tar", "-x", "-C", str(dest)], input=arc.stdout, check=True)
    return dest


def span_lines(site: dict, lines: list[str]) -> tuple[int, int]:
    return site["comment_start"] - 1, site["comment_end"]  # [s, e) zero-based


def oneline(span: list[str]) -> list[str]:
    first = span[0].strip()
    if len(span) == 1:
        return span
    if first in ("/**", "/*", "/*!"):
        close = [span[-1]] if span[-1].strip().endswith("*/") else []
        return [span[0], span[1], *close]
    if first.startswith("/*"):
        close = [span[-1]] if span[-1].strip().endswith("*/") else []
        return [span[0], *close]
    for q in ('"""', "'''"):
        if first.startswith(q):
            indent = span[0][: len(span[0]) - len(span[0].lstrip())]
            body = first[3:].strip() or (span[1].strip() if len(span) > 1 else "")
            body = body.replace(q, "").rstrip()
            return [f"{indent}{q}{body}{q}"]
    return [span[0]]


def edit(site: dict, src: str, arm: str, fixtures: dict) -> str:
    lines = src.split("\n")
    s, e = span_lines(site, lines)
    span = lines[s:e]
    if arm == "original":
        new = span
    elif arm in ("deleted", "history"):
        new = []
    elif arm == "oneline":
        new = oneline(span)
    elif arm == "rules":
        new = fixtures[site["id"]]["rules"]
    elif arm == "pointer":
        new = fixtures[site["id"]]["pointer"]["lines"]
    else:
        raise SystemExit(f"unknown arm {arm}")
    return "\n".join(lines[:s] + list(new) + lines[e:])


def code_seq(src: str, lang: str) -> list[str]:
    raw = src.split("\n")
    return [raw[i].strip() for i, ln in enumerate(cc.classify("x", src, lang)) if ln.kind == "code"]


def check_code(site: dict, before: str, after: str) -> None:
    lang = cc.EXT_LANG[Path(site["file"]).suffix]
    b, a = code_seq(before, lang), code_seq(after, lang)
    if b != a:
        # a Python function whose only statement was the docstring gains a pass
        extra = [x for x in a if x not in b]
        if not (lang == "python" and extra == ["pass"]):
            raise SystemExit(f"code changed in {site['id']}: {len(b)} -> {len(a)} code lines")


def snapshot(base: Path, dest: Path, rel: str, text: str | None, record: dict | None) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(["cp", "-al", str(base), str(dest)])
    if text is not None:
        target = dest / rel
        target.unlink()
        target.write_text(text, encoding="utf-8")
    if record:
        rp = dest / record["path"]
        rp.parent.mkdir(parents=True, exist_ok=True)
        if rp.exists():
            rp.unlink()
        rp.write_text(record["text"], encoding="utf-8")
    for cmd in ([GIT, "init", "-q"], [GIT, "add", "-A"], [GIT, "commit", "-q", "-m", "snapshot"]):
        run(cmd, cwd=dest)


def history_arm(site: dict, dest: Path, deleted_text: str, span: list[str]) -> dict:
    """Full clone, then redact the span's lines from every historical blob of the file."""
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    run([GIT, "clone", "-q", "--no-local", str(DEV / site["repo"]), str(dest)])
    paths = subprocess.run(
        [GIT, "-C", str(dest), "log", "--follow", "--name-only", "--format=", "--", site["file"]], capture_output=True, text=True, check=True
    ).stdout.split()
    paths = sorted(set(paths) | {site["file"]})
    kill = [ln.strip().encode() for ln in span]
    script = Path(dest.parent, f"{site['id']}.callback.py")
    # Remove runs of consecutive lines that equal a run of the span (length >= min(3, len(span)),
    # holding at least one line over 25 chars),
    # plus single long span lines (> 50 chars) that survive rewording elsewhere in history.
    script.write_text(
        "EXT = %r\nKILL = %r\n" % (Path(site["file"]).suffix.encode(), kill)
        + "if filename.endswith(EXT):\n"
        "    contents = value.get_contents_by_identifier(blob_id)\n"
        "    lines = contents.split(b'\\n')\n"
        "    st = [l.strip() for l in lines]\n"
        "    need = min(3, len(KILL))\n"
        "    drop = set()\n"
        "    i = 0\n"
        "    while i < len(st):\n"
        "        best = 0\n"
        "        for j in range(len(KILL)):\n"
        "            k = 0\n"
        "            while i + k < len(st) and j + k < len(KILL) and st[i + k] == KILL[j + k]:\n"
        "                k += 1\n"
        "            best = max(best, k)\n"
        "        if best >= need and any(len(x) > 25 for x in st[i:i + best]):\n"
        "            drop.update(range(i, i + best))\n"
        "            i += best\n"
        "            continue\n"
        "        if len(st[i]) > 50 and st[i] in KILL:\n"
        "            drop.add(i)\n"
        "        i += 1\n"
        "    if drop:\n"
        "        blob_id = value.insert_file_with_contents(b'\\n'.join(l for n, l in enumerate(lines) if n not in drop))\n"
        "return (filename, mode, blob_id)\n"
    )
    run(["git-filter-repo", "--force", "--quiet", "--file-info-callback", script.read_text()], cwd=dest)
    # the HEAD file must now equal the deleted arm's text, code-wise
    head = (dest / site["file"]).read_text(encoding="utf-8")
    check_code(site, deleted_text, head)
    phrases = sorted({k.decode() for k in kill if len(k) > 20}, key=len, reverse=True)[:3]
    log = subprocess.run([GIT, "-C", str(dest), "log", "--all", "-p", "--no-renames", "--format="], capture_output=True, text=True, check=True).stdout
    leaks = {p: log.count(p) for p in phrases}
    return {"paths": paths, "leaks": leaks}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sites", required=True)
    ap.add_argument("--fixtures", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--arms", default="original,rules,pointer,oneline,deleted,history")
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    sites = json.loads(Path(a.sites).read_text())
    if a.only:
        keep = set(a.only.split(","))
        sites = [s for s in sites if s["id"] in keep]
    sites = [s for s in sites if s.get("pooled") or s.get("extra_b") or s.get("stratum") == "C"]
    fixtures = {}
    for f in a.fixtures.split(",") if a.fixtures else []:
        for k, v in json.loads(Path(f).read_text()).items():
            if isinstance(v, dict):
                fixtures.setdefault(k, {}).update(v)
    out = Path(a.out)
    rp = out / "arms-report.json"
    report = json.loads(rp.read_text()) if rp.exists() else {}
    for arm in a.arms.split(","):
        for site in sites:
            if arm in ("rules", "pointer", "oneline") and not site.get("pooled"):
                continue
            if arm == "history" and site.get("stratum") != "A":
                continue
            base = base_tree(out, site["repo"])
            src = (base / site["file"]).read_text(encoding="utf-8")
            if arm == "original":
                dest = out / "original" / site["repo"]
                if not dest.exists():
                    snapshot(base, dest, site["file"], None, None)
                continue
            new = edit(site, src, arm, fixtures)
            check_code(site, src, new)
            dest = out / arm / site["id"]
            if arm == "history":
                report[f"history|{site['id']}"] = history_arm(site, dest, new, src.split("\n")[site["comment_start"] - 1 : site["comment_end"]])
            else:
                rec = fixtures.get(site["id"], {}).get("pointer", {}).get("record") if arm == "pointer" else None
                snapshot(base, dest, site["file"], new, rec)
            lang = cc.EXT_LANG[Path(site["file"]).suffix]
            count = lambda t: sum(x.kind in ("doc", "line") for x in cc.classify("x", t, lang))  # noqa: E731
            report.setdefault(f"{arm}|{site['id']}", {}).update({"comments_before": count(src), "comments_after": count(new)})
            print(f"built {arm}/{site['id']}", flush=True)
    Path(out, "arms-report.json").write_text(json.dumps(report, indent=1))
    leaks = {k: v["leaks"] for k, v in report.items() if k.startswith("history|") and any(v["leaks"].values())}
    if leaks:
        print("HISTORY LEAKS:", json.dumps(leaks), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
