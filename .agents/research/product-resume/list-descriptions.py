#!/usr/bin/env python3
"""Print 'name: description' for every skill in the catalog, as a router sees them.

Reads only the frontmatter of skills/*/SKILL.md. Handles a plain, a quoted and a
folded or literal block description. Run from the repository root.
"""

import pathlib
import re
import sys


def description(front: str) -> str:
    lines = front.split("\n")
    for i, line in enumerate(lines):
        if not line.startswith("description:"):
            continue
        value = line[len("description:") :].strip()
        if value[:1] in (">", "|"):
            block = []
            for nxt in lines[i + 1 :]:
                if nxt and not nxt.startswith((" ", "\t")):
                    break
                block.append(nxt.strip())
            return " ".join(b for b in block if b)
        if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
        return value
    return ""


def main() -> int:
    root = pathlib.Path("skills")
    if not root.is_dir():
        print("run from the repository root", file=sys.stderr)
        return 2
    for skill in sorted(root.glob("*/SKILL.md")):
        match = re.match(r"---\n(.*?)\n---\n", skill.read_text(encoding="utf-8"), re.S)
        text = description(match.group(1)) if match else ""
        print(f"{skill.parent.name}: {text}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
