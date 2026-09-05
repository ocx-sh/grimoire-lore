"""Shared helpers for wave2 calibration checks (DOC-TYPE / DOC-DISC / DOC-OBS).

Loads the fleet manifest (248 pages, 22 distinct repos with markdown) and the
program's own docs-research corpus (34 files), and provides the same
path-based type classifier used by docs-shape.md's docs_shape.py, since 0 of
248 fleet pages carry any doc_type/tier declaration -- every family-scoped
check in this wave needs a proxy scope and this keeps it consistent with the
wave-1 measurement.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FLEET_MANIFEST = os.path.join(HERE, "fleet_manifest.txt")
RESEARCH_MANIFEST = os.path.join(HERE, "research_corpus.txt")

def load_list(path):
    with open(path) as f:
        return [l.strip() for l in f if l.strip()]

def fleet_files():
    return load_list(FLEET_MANIFEST)

def research_files():
    return load_list(RESEARCH_MANIFEST)

def read(path):
    with open(path, "r", errors="replace") as f:
        return f.read()

CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)")
FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")
TABLE_SEP_RE = re.compile(r"^\s*\|?[\s:|-]+\|?\s*$")
WORD_RE = re.compile(r"[A-Za-z']+")

def lines_no_fence(text):
    """Yield (line_no, line) for every line outside a code fence."""
    in_fence = False
    for i, ln in enumerate(text.split("\n"), start=1):
        if CODE_FENCE_RE.match(ln):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        yield i, ln

def strip_code_fences(text):
    return "\n".join(ln for _, ln in lines_no_fence(text))

def headings(text):
    """[(line_no, level, text)] outside fences."""
    out = []
    for i, ln in lines_no_fence(text):
        m = ATX_HEADING_RE.match(ln)
        if m:
            out.append((i, len(m.group(1)), m.group(2).strip()))
    return out

def first_h1_to_first_h2(text):
    """Return the text block between the first H1 and the first H2 (or EOF)."""
    hs = headings(text)
    h1 = next((h for h in hs if h[1] == 1), None)
    if not h1:
        return ""
    h2 = next((h for h in hs if h[1] == 2 and h[0] > h1[0]), None)
    lines = text.split("\n")
    start = h1[0]
    end = (h2[0] - 1) if h2 else len(lines)
    return "\n".join(lines[start:end])

def block_before_first_heading_or_fence(text):
    """Lead-in prose before the first heading of any level or the first fence."""
    out = []
    for ln in text.split("\n"):
        if ATX_HEADING_RE.match(ln) or CODE_FENCE_RE.match(ln):
            break
        out.append(ln)
    return "\n".join(out)

def word_count(s):
    return len(WORD_RE.findall(s))

# ---- path-type classifier, identical to docs_shape.py TYPE_RULES/classify() ----
TYPE_RULES = [
    ("changelog",    re.compile(r"changelog|changes|history|release[-_]?notes")),
    ("contributing", re.compile(r"contributing|code[-_]of[-_]conduct|security\.md$")),
    ("faq",          re.compile(r"\bfaq\b")),
    ("getting-started", re.compile(r"getting[-_]started|quick[-_]?start|installation|\binstall\b|\bsetup\b|\bonboarding\b")),
    ("tutorial",     re.compile(r"tutorial|walkthrough|\bfirst[-_]")),
    ("how-to",       re.compile(r"how[-_]?to|\bguides?\b|\brecipes?\b|cookbook|\btask")),
    ("reference",    re.compile(r"reference|\bapi\b|\bcli\b|schema|config(uration)?|options|commands?/")),
    ("concept",      re.compile(r"explanation|concept|architecture|design|overview|why[-_]|model\b")),
]

def surface_depth(abspath):
    """Path depth below the repo root (docs_shape.py's `depth`), so
    docs/index.md is depth 1 and docs/guide/index.md is depth 2."""
    parts = abspath.split("/")
    try:
        i = parts.index("dev")
        rel = parts[i+2:]  # drop /home/.../dev/<repo>/
        return len(rel) - 1
    except ValueError:
        return len(parts) - 1

def classify_path(abspath):
    """Identical order to docs_shape.py's classify(): keyword rules first,
    then an unconditional index/readme fallback to 'landing/index'. An
    early version of this file checked index/readme FIRST, which wrongly
    classified every section-hub index (ops/index.md, reference/index.md,
    how-to/index.md...) as a site landing page and inflated hit counts on
    DOC-TYPE-10/11/12/13/16 -- see report for the false positives that
    produced (kate-middlechild/docs/research/README.md,
    ocx-mirror-sdk/docs/getting-started/index.md)."""
    low = abspath.lower()
    base = os.path.basename(low)
    stem = re.sub(r"\.(md|mdx)$", "", base)
    depth = surface_depth(abspath)
    if stem in ("index", "readme") and depth <= 1:
        return "landing/index"
    for label, pat in TYPE_RULES:
        if pat.search(low):
            return label
    if stem in ("index", "readme"):
        return "landing/index"
    return "other"

def repo_of(abspath):
    parts = abspath.split("/")
    try:
        i = parts.index("dev")
        return parts[i+1]
    except ValueError:
        return "?"
