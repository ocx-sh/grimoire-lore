import re, sys
sys.path.insert(0, "/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/8bb14db0-1b44-4e91-a3af-347b496cfdc4/scratchpad/wave2/wave2-calibration-b")
from strip_prose import strip

TIME_RE = re.compile(r"\b(as of this writing|currently|does not yet|eventually|in the future|latest|newer|newest|now|older|presently|at present|soon)\b", re.IGNORECASE)
MKT_RE = re.compile(r"\b(powerful|seamlessly?|revolutionary|game.chang\w*|supercharge\w*|unlock\w*|empower\w*|cutting.edge|robust|effortless\w*)\b", re.IGNORECASE)

files = open(sys.argv[1]).read().split()
n = 0
for path in files:
    try:
        raw = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        continue
    stripped = strip(raw)
    pat = TIME_RE if sys.argv[2] == "time" else MKT_RE
    for m in pat.finditer(stripped):
        start = max(0, m.start()-60)
        end = min(len(stripped), m.end()+60)
        ctx = stripped[start:end].replace("\n", " ")
        line_no = stripped.count("\n", 0, m.start()) + 1
        print(f"{path}:{line_no}  [{m.group(0)}]  ...{ctx}...")
        n += 1
print(f"TOTAL: {n}", file=sys.stderr)
