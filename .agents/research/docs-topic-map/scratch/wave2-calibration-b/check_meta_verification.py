#!/usr/bin/env python3
"""DOC-PLAIN-17 / DOC-AGENT-16 self-audit: for every rule row in the four
family files, does the Verification cell carry a backtick-quoted command
fragment, the literal marker "unverified: reading heuristic" (any case), or
neither (a DOC-PLAIN-17 / DOC-AGENT-16 finding)?

Table-format files (docs-plain-english.md, docs-navigation-search.md,
docs-examples.md): one row per rule, columns split on unescaped ` | `.
Bullet-format file (docs-machine-readers-and-prior-art.md): **DOC-AGENT-NN.**
block with a *Verification:* line.
"""
import re, sys, json

MARKER_RE = re.compile(r"unverified:\s*reading heuristic", re.IGNORECASE)
BACKTICK_RE = re.compile(r"`[^`]+`")
ID_RE = re.compile(r"^(DOC-[A-Z]+-\d+)$")


def classify(text):
    has_marker = bool(MARKER_RE.search(text))
    has_command = bool(BACKTICK_RE.search(text))
    return has_marker, has_command


def parse_table_file(path):
    rows = []
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        if ID_RE.match(cells[0]):
            # Verification column position varies by table (5 vs 7 cols);
            # find the cell that looks like a Verification cell by content,
            # or fall back to a fixed index if the header said so.
            rows.append((cells[0], cells))
    return rows


def find_verification_col(path):
    """Read the header row nearest above each rule block to find which
    column index is 'Verification'."""
    header = None
    idx = None
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if line.startswith("| ID |") or line.startswith("|ID|") or " ID " in line.split("|")[1:2][0:1].__str__():
            pass
        if line.startswith("|") and "Verification" in line:
            cells = [c.strip() for c in line.strip("|").split("|")]
            if "Verification" in cells:
                idx = cells.index("Verification")
    return idx


def audit_table_file(path):
    col = find_verification_col(path)
    findings = []
    for rid, cells in parse_table_file(path):
        vcell = cells[col] if col is not None and col < len(cells) else ""
        marker, command = classify(vcell)
        if not marker and not command:
            findings.append((rid, "NO_COMMAND_NO_MARKER", vcell[:80]))
        elif marker and command:
            findings.append((rid, "AMBIGUOUS_BOTH", vcell[:80]))
    return findings


def audit_bullet_file(path):
    text = open(path, encoding="utf-8").read()
    blocks = re.split(r"(?=\*\*DOC-AGENT-\d+\.\*\*)", text)
    findings = []
    for b in blocks:
        m = re.match(r"\*\*(DOC-AGENT-\d+)\.\*\*", b)
        if not m:
            continue
        rid = m.group(1)
        vm = re.search(r"\*Verification:\*(.*?)(?=\n\*Severity|\Z)", b, re.DOTALL)
        vtext = vm.group(1).strip() if vm else ""
        marker, command = classify(vtext)
        if not marker and not command:
            findings.append((rid, "NO_COMMAND_NO_MARKER", vtext[:80].replace("\n", " ")))
        elif marker and command:
            findings.append((rid, "AMBIGUOUS_BOTH", vtext[:80].replace("\n", " ")))
    return findings


def main():
    files = {
        "docs-plain-english.md": "/home/mherwig/dev/grimoire-lore/.agents/research/docs-plain-english.md",
        "docs-navigation-search.md": "/home/mherwig/dev/grimoire-lore/.agents/research/docs-navigation-search.md",
        "docs-examples.md": "/home/mherwig/dev/grimoire-lore/.agents/research/docs-examples.md",
    }
    out = {}
    total_rows = 0
    total_findings = 0
    for name, path in files.items():
        rows = parse_table_file(path)
        findings = audit_table_file(path)
        out[name] = {"rows": len(rows), "findings": findings}
        total_rows += len(rows)
        total_findings += len(findings)
    bpath = "/home/mherwig/dev/grimoire-lore/.agents/research/docs-machine-readers-and-prior-art.md"
    btext = open(bpath, encoding="utf-8").read()
    brows = len(re.findall(r"\*\*(DOC-AGENT-\d+)\.\*\*", btext))
    bfindings = audit_bullet_file(bpath)
    out["docs-machine-readers-and-prior-art.md"] = {"rows": brows, "findings": bfindings}
    total_rows += brows
    total_findings += len(bfindings)
    out["_totals"] = {"rows": total_rows, "findings": total_findings}
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
