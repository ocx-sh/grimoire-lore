#!/usr/bin/env python3
"""Runnable checks for DOC-OBS-01..15 (docs-observability.md). Several of
this family's verifications target CI config or PR/issue templates rather
than markdown page content; those are still run here against the repo
checkouts (not fleet page markdown) and reported separately, per the
report's per-rule table.
"""
import re, os, sys, glob
import common as C

FLEET_REPOS = ["bob","creeptd-ng","grimoire","grimoire-indexer","grimoire-lore",
    "grimoire-vscode","kate-middlechild","ocx","ocx-catalog","ocx-indexbot","ocx-mcp",
    "ocx-mirror","ocx-mirror-sdk","ocx-save","ocx-sdk-python","rules_ocx",
    "grimoire-components","grimoire-index","setup-grimoire","setup-ocx","vscode-ocx","www-setup"]
DEV = "/home/mherwig/dev"

def run_obs03():
    """SHOULD -- docs/.meta/trigger-matrix.md exists with >=3 non-header
    rows, and the shipped template stays portable (no fleet path leaked)."""
    results = []
    for repo in FLEET_REPOS:
        p = os.path.join(DEV, repo, "docs", ".meta", "trigger-matrix.md")
        if os.path.isfile(p):
            text = C.read(p)
            rows = [l for l in text.split("\n") if re.match(r"^\s*\|", l) and not re.match(r"^\s*\|?[\s:|-]+\|?\s*$", l)]
            leaked = bool(re.search(r"(crates|services|packages)/", text))
            results.append((repo, f"exists, {len(rows)-1 if rows else 0} rows, portability-leak={leaked}"))
        else:
            results.append((repo, "no docs/.meta/trigger-matrix.md"))
    return results

def run_obs05_classification(files=None):
    """SHOULD (classification half only) -- pages that would classify as
    'runbook' via type: runbook frontmatter OR a docs/runbooks/** path."""
    hits = []
    for f in (files if files is not None else C.fleet_files()):
        text = C.read(f)
        fm = C.FRONTMATTER_RE.match(text)
        by_fm = bool(fm and re.search(r"^type:\s*runbook\s*$", fm.group(0), re.M))
        by_path = bool(re.search(r"/docs/runbooks/", f))
        if by_fm or by_path:
            hits.append((f, 1, f"frontmatter={by_fm} path={by_path}"))
    return hits

def run_obs07():
    """SHOULD -- docs/.meta/tthw.md, or tthw_minutes+tthw_measured
    frontmatter pair, on landing/tutorial pages (proxy: getting-started)."""
    hits = []
    for repo in FLEET_REPOS:
        p = os.path.join(DEV, repo, "docs", ".meta", "tthw.md")
        has_meta_file = os.path.isfile(p)
        if not has_meta_file:
            hits.append((repo, "meta", "no docs/.meta/tthw.md"))
    for f in C.fleet_files():
        if C.classify_path(f) not in ("getting-started", "landing/index"):
            continue
        text = C.read(f)
        fm = C.FRONTMATTER_RE.match(text)
        has_pair = bool(fm and re.search(r"tthw_minutes:", fm.group(0)) and re.search(r"tthw_measured:", fm.group(0)))
        if not has_pair:
            hits.append((f, "page", "no tthw_minutes/tthw_measured frontmatter pair"))
    return hits

def run_obs08(files):
    """MUST -- unmeasured metric grep, with denominator/channel/date check
    in the same paragraph."""
    pat = re.compile(r"[0-9]+%|\b(most|nearly all|the majority of) (users|readers|developers)\b", re.I)
    denom = re.compile(r"\b(of|/)\s*[0-9,]+\b|\bn\s*=\s*[0-9]+\b|20\d\d-\d\d-\d\d|\b(survey|GA4|analytics|benchmark)\b", re.I)
    hits = []
    for f in files:
        text = C.read(f)
        paras = re.split(r"\n\s*\n", text)
        for para in paras:
            for m in pat.finditer(para):
                if not denom.search(para):
                    line_offset = text.find(para)
                    line = text[:line_offset].count("\n") + 1 if line_offset >= 0 else 1
                    hits.append((f, line, m.group(0), para.strip()[:100]))
    return hits

def run_obs09():
    """SHOULD -- PR template carries Added:/Removed: keys."""
    results = []
    for repo in FLEET_REPOS:
        found = None
        for cand in ["PULL_REQUEST_TEMPLATE.md", ".github/PULL_REQUEST_TEMPLATE.md",
                     ".github/pull_request_template.md"]:
            p = os.path.join(DEV, repo, cand)
            if os.path.isfile(p):
                found = p
                break
        if not found:
            results.append((repo, "no PR template"))
            continue
        text = C.read(found)
        has_both = bool(re.search(r"Added:", text)) and bool(re.search(r"Removed:", text))
        results.append((repo, f"PR template exists, Added/Removed keys present={has_both}"))
    return results

def run_obs10():
    """CONSIDER -- docs/.meta/observability.md manifest, status/date/bias
    fields, date not stale vs stated cadence."""
    results = []
    for repo in FLEET_REPOS:
        p = os.path.join(DEV, repo, "docs", ".meta", "observability.md")
        results.append((repo, "exists" if os.path.isfile(p) else "no docs/.meta/observability.md"))
    return results

def run_obs11():
    """SHOULD -- issue template under .github/ISSUE_TEMPLATE/ with a
    labels: list containing docs."""
    results = []
    for repo in FLEET_REPOS:
        d = os.path.join(DEV, repo, ".github", "ISSUE_TEMPLATE")
        if not os.path.isdir(d):
            results.append((repo, "no .github/ISSUE_TEMPLATE/"))
            continue
        found_docs_label = False
        templates = glob.glob(os.path.join(d, "*"))
        for t in templates:
            if os.path.isfile(t):
                text = C.read(t)
                if re.search(r"labels:.*\bdocs\b", text, re.I) or re.search(r"^labels:\s*\n(\s*-\s*.*\n)*\s*-\s*docs\s*$", text, re.M):
                    found_docs_label = True
        results.append((repo, f"{len(templates)} templates, docs-labelled={found_docs_label}"))
    return results

def run_obs13_ci():
    """SHOULD -- grep docs CI config for stale/max-age gate keys."""
    pat = re.compile(r"days_since|stale_after|max_age", re.I)
    hits = []
    for repo in FLEET_REPOS:
        for cand in glob.glob(os.path.join(DEV, repo, ".github", "workflows", "*.y*ml")) + \
                     glob.glob(os.path.join(DEV, repo, "taskfile*.y*ml")) + \
                     glob.glob(os.path.join(DEV, repo, "taskfiles", "*.y*ml")):
            try:
                text = C.read(cand)
            except Exception:
                continue
            if pat.search(text):
                hits.append((cand, "matches days_since/stale_after/max_age"))
    return hits

def run_obs14(files):
    """SHOULD -- fork detector: paragraphs >=40 words, normalized, hashed;
    flag file pairs sharing >=3 identical paragraphs."""
    from collections import defaultdict
    para_to_files = defaultdict(set)
    for f in files:
        text = C.read(f)
        body = C.FRONTMATTER_RE.sub("", text)
        for para in re.split(r"\n\s*\n", body):
            norm = re.sub(r"\s+", " ", para.strip().lower())
            if len(C.WORD_RE.findall(norm)) >= 40:
                para_to_files[norm].add(f)
    from collections import Counter
    pair_counts = Counter()
    pair_paras = defaultdict(list)
    for norm, fs in para_to_files.items():
        if len(fs) >= 2:
            for a in fs:
                for b in fs:
                    if a < b:
                        pair_counts[(a, b)] += 1
                        pair_paras[(a, b)].append(norm[:80])
    forks = [(a, b, n, pair_paras[(a, b)][:3]) for (a, b), n in pair_counts.items() if n >= 3]
    return forks

def run_obs15():
    """SHOULD -- grep for 'tracked, not built|future gate|not implemented
    yet|TODO' over the fleet's docs-relevant AI-config rule files."""
    pat = re.compile(r"tracked, not built|future gate|not implemented yet|TODO", re.I)
    hits = []
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "fleet_docs_rule_files_filtered.txt")) as fh:
        rule_files = [l.strip() for l in fh if l.strip()]
    for f in rule_files:
        text = C.read(f)
        for i, ln in enumerate(text.split("\n"), start=1):
            if pat.search(ln):
                hits.append((f, i, ln.strip()[:90]))
    return hits

def main():
    fleet = C.fleet_files()
    research = C.research_files()
    want = sys.argv[1:] or ["03","05","07","08","09","10","11","13","14","15"]
    for r in want:
        if r == "03":
            print("\n=== DOC-OBS-03 (trigger-matrix.md presence) ===")
            for x in run_obs03(): print("  ", x)
        elif r == "05":
            hits = run_obs05_classification()
            print(f"\n=== DOC-OBS-05 classification === {len(hits)} pages classify as runbook")
            for h in hits: print("  ", h)
        elif r == "07":
            hits = run_obs07()
            print(f"\n=== DOC-OBS-07 === {len(hits)} misses")
            for h in hits[:15]: print("  ", h)
        elif r == "08":
            hits = run_obs08(fleet + research)
            print(f"\n=== DOC-OBS-08 === scanned {len(fleet)+len(research)} files, {len(hits)} hits")
            for h in hits[:15]: print("  ", h)
        elif r == "09":
            print("\n=== DOC-OBS-09 (PR template Added:/Removed:) ===")
            for x in run_obs09(): print("  ", x)
        elif r == "10":
            print("\n=== DOC-OBS-10 (observability.md manifest) ===")
            for x in run_obs10(): print("  ", x)
        elif r == "11":
            print("\n=== DOC-OBS-11 (docs-labelled issue template) ===")
            for x in run_obs11(): print("  ", x)
        elif r == "13":
            hits = run_obs13_ci()
            print(f"\n=== DOC-OBS-13 (CI stale-gate grep) === {len(hits)} hits")
            for h in hits: print("  ", h)
        elif r == "14":
            forks = run_obs14(fleet)
            print(f"\n=== DOC-OBS-14 (fork detector, >=3 shared 40+-word paragraphs) === {len(forks)} file pairs")
            for f in forks: print("  ", f)
        elif r == "15":
            hits = run_obs15()
            print(f"\n=== DOC-OBS-15 === {len(hits)} hits")
            for h in hits: print("  ", h)

if __name__ == "__main__":
    main()
