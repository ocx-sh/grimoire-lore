#!/usr/bin/env python3
"""Smallest floor: run every doc example as a subprocess, in the language it needs.

Add a language by adding one line to RUNNERS. Each example file declares its
own binding to a page and its own expected exit code in a two-line header:

    # doc: <slug the page cites>
    # title: <human title, shown on failure>
    # expect_exit: <int, default 0>

No test framework, no per-language plugin. This is the DOC-EX-04 floor: the
harness a project reaches for before it needs Sybil, cargo test --doc, or a
bespoke acceptance-script tree with registry/PTY side effects.
"""
import subprocess
import sys
from pathlib import Path

RUNNERS = {
    ".ts": ["node"],       # Node >=23.6 strips types natively, no install needed
    ".mts": ["node"],
    ".sh": ["bash"],
    ".py": ["python3"],
}


def read_header(path: Path) -> dict:
    meta = {"doc": None, "title": path.name, "expect_exit": 0}
    for line in path.read_text().splitlines()[:10]:
        line = line.strip().lstrip("#/").strip()  # strip '#' (sh/py) or '//' (ts/js)
        if line.startswith("doc:"):
            meta["doc"] = line.split(":", 1)[1].strip()
        elif line.startswith("title:"):
            meta["title"] = line.split(":", 1)[1].strip()
        elif line.startswith("expect_exit:"):
            meta["expect_exit"] = int(line.split(":", 1)[1].strip())
    return meta


def main(example_dir: str) -> int:
    root = Path(example_dir)
    files = sorted(p for p in root.rglob("*") if p.suffix in RUNNERS)
    if not files:
        print(f"no doc examples found under {root}", file=sys.stderr)
        return 1

    failures = []
    for path in files:
        meta = read_header(path)
        runner = RUNNERS[path.suffix]
        proc = subprocess.run(runner + [str(path)], capture_output=True, text=True)
        ok = proc.returncode == meta["expect_exit"]
        status = "ok" if ok else "FAIL"
        print(f"[{status}] {meta['title']} (doc: {meta['doc']}, file: {path})")
        if not ok:
            print(f"  expected exit {meta['expect_exit']}, got {proc.returncode}")
            if proc.stderr:
                print("  stderr:", proc.stderr.strip().splitlines()[-1])
            failures.append(path)

    print(f"\n{len(files) - len(failures)}/{len(files)} doc examples passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "doc_examples"))
