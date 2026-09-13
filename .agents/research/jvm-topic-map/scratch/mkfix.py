"""Build jvm-fix-<batch>.mjs from a review receipt.

usage: python3 mkfix.py <batch> <review-output.json> [--min fix|nit]
Groups findings by file; opus when any blocker, else sonnet. Nits are
included only with --min nit.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path("/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake")
HERE = Path(__file__).parent
batch, receipt = sys.argv[1], sys.argv[2]
min_sev = sys.argv[sys.argv.index("--min") + 1] if "--min" in sys.argv else "fix"
rank = {"blocker": 0, "fix": 1, "nit": 2}
raw = Path(receipt).read_text()
d = json.loads(raw[raw.index("{") : raw.rindex("}") + 1])
findings = d["result"]["findings"] if "result" in d else d["findings"]
if "--extra" in sys.argv:
    findings += json.loads(Path(sys.argv[sys.argv.index("--extra") + 1]).read_text())
# a fix whose text names a second artifact file is split: the second file's fixer
# gets a copy scoped to its own part, so no fixer edits a file that is not its own
split = []
for f in findings:
    here = f["file"].split("/")[-1]
    for other in set(re.findall(r"(?:rules|skills)/[A-Za-z0-9_./-]+\.md", f["fix"])):
        if other.split("/")[-1] != here:
            g = dict(f)
            g["file"] = str(ROOT / other)
            g["line"] = 1
            g["finding"] = "(split from a finding on " + here + ") " + f["finding"]
            g["fix"] = "Apply ONLY the part of this fix that names YOUR file (" + other + "), nothing else: " + f["fix"]
            split.append(g)
findings += split
for f in findings:
    if not f["file"].startswith("/"):
        f["file"] = str(ROOT / f["file"])
by = {}
for f in findings:
    if rank[f["severity"]] > rank[min_sev]:
        continue
    by.setdefault(f["file"], []).append(f)


def target(path):
    rel = path.replace(str(ROOT) + "/", "")
    if rel.startswith("skills/"):
        return "/".join(rel.split("/")[:2])
    if rel.startswith("rules/"):
        parts = rel.split("/")
        return f"rules/{parts[1].removesuffix('.md')}.md"
    return rel


files = [
    {
        "file": path,
        "model": "opus" if any(f["severity"] == "blocker" for f in fs) else "sonnet",
        "checker_target": target(path),
        "findings": sorted(fs, key=lambda f: f["line"]),
    }
    for path, fs in sorted(by.items())
]
tpl = (HERE / "jvm-fix.template.mjs").read_text()
out = tpl.replace("__BATCH__", batch).replace("__FILES__", json.dumps(files, indent=1))
assert "`" not in json.dumps(files) or True  # fix text may contain backticks; they sit inside a JSON string literal, which is safe
(HERE / f"jvm-fix-{batch}.mjs").write_text(out)
print(f"{len(files)} files, {sum(len(x['findings']) for x in files)} findings, opus={sum(x['model']=='opus' for x in files)}")
