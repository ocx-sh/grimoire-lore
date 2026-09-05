#!/usr/bin/env python3
"""Runnable checks for DOC-TYPE-01..21 (docs-page-types.md), over the fleet's
248-page manifest and the program's own 34-file research corpus.

Usage: python3 check_doc_type.py [rule_id ...]   (default: all)
Prints, per rule: files scanned, hit count, and up to 10 sampled hits with
file:line + a one-line context snippet, for manual TP/FP classification.
"""
import re, sys, os
import common as C

DOC_TYPE_ENUM = "tutorial|how-to|reference|explanation|troubleshooting|landing"

def sample(hits, n=10):
    return hits[:n]

def run_type01(files):
    """MUST -- grep -L -m1 -E '^<!-- doc_type: (...) -->' : file FAILS (is
    listed) when its first line does not match."""
    pat = re.compile(r"^<!-- doc_type: (%s) -->$" % DOC_TYPE_ENUM)
    hits = []
    for f in files:
        text = C.read(f)
        first = text.split("\n", 1)[0] if text else ""
        if not pat.match(first):
            hits.append((f, 1, first[:60]))
    return hits

def run_type03(files):
    """MUST -- tutorial/how-to conflation: both signatures non-zero on the
    same page (proxy scope: path-classified tutorial/how-to/getting-started)."""
    sigA = re.compile(r"\b(we'll|we're going to|let's (build|create|set up|walk))\b", re.I)
    sigB = re.compile(r"if you (want|need|prefer)\b.{0,40}?\b(run|use|pass|do)\b", re.I)
    hits = []
    for f in files:
        t = C.classify_path(f)
        if t not in ("tutorial", "how-to", "getting-started"):
            continue
        prose = C.strip_code_fences(C.read(f))
        a = len(sigA.findall(prose))
        b = len(sigB.findall(prose))
        if a and b:
            # locate a line for citation
            for i, ln in C.lines_no_fence(C.read(f)):
                if sigA.search(ln) or sigB.search(ln):
                    hits.append((f, i, ln.strip()[:80]))
                    break
    return hits

def run_type04(files):
    """MUST -- reference prose typing: first-person/narrative pattern
    anywhere, or problem-framing words in the first paragraph. Proxy scope:
    path-classified reference pages."""
    pat1 = re.compile(r"\blet's\b|\bnow that we\b|\byou'll want to\b|\b(we|our)\b", re.I)
    pat2 = re.compile(r"problem|pain point|frustrat|annoying|wasteful|struggle|tedious", re.I)
    hits = []
    for f in files:
        if C.classify_path(f) != "reference":
            continue
        text = C.read(f)
        prose = C.strip_code_fences(text)
        # first paragraph = text up to first blank line, after frontmatter/H1
        body = C.FRONTMATTER_RE.sub("", prose)
        paras = re.split(r"\n\s*\n", body.strip())
        first_para = paras[0] if paras else ""
        m1 = pat1.search(prose)
        m2 = pat2.search(first_para)
        if m1 or m2:
            snippet = (m1.group(0) if m1 else m2.group(0))
            for i, ln in C.lines_no_fence(text):
                if m1 and pat1.search(ln):
                    hits.append((f, i, ln.strip()[:80])); break
                if m2 and pat2.search(ln):
                    hits.append((f, i, ln.strip()[:80])); break
    return hits

def run_type05(files):
    """SHOULD -- opinion/recommendation grep, on non-explanation/concept pages."""
    pat = re.compile(r"\b(is|are) (better|worse|preferable) (than|to)\b|\bwe recommend\b", re.I)
    hits = []
    for f in files:
        if C.classify_path(f) == "concept":
            continue
        text = C.read(f)
        for i, ln in C.lines_no_fence(text):
            if pat.search(ln):
                hits.append((f, i, ln.strip()[:90]))
    return hits

def run_type06(files):
    """SHOULD -- approximate: named package-manager/tool analogy terms in
    prose, then check containment (admonition/explanation) + adjacent link."""
    tools = re.compile(r"\b(Nix( store)?|APT|apt-get|Homebrew|brew|Cellar|SDKMAN|"
                        r"Chocolatey|choco|yum|dnf|pacman|scoop|npm|pip|cargo|apk)\b")
    admonition = re.compile(r"^(:::|!!!|>\s*\[!|<Aside)")
    link = re.compile(r"\[[^\]]*\]\([^)]+\)")
    hits = []
    for f in files:
        text = C.read(f)
        is_explanation_like = C.classify_path(f) == "concept"
        lines = text.split("\n")
        in_admonition = False
        for i, ln in enumerate(lines, start=1):
            if admonition.match(ln.strip()):
                in_admonition = True
            m = tools.search(ln)
            if m:
                has_link = bool(link.search(ln)) or bool(link.search(lines[i] if i < len(lines) else ""))
                contained = is_explanation_like or in_admonition
                if not (contained and has_link):
                    hits.append((f, i, ln.strip()[:90]))
    return hits

def run_type07(files):
    """CONSIDER -- concept preamble cap: >100 words between H1 and first H2,
    proxy scope how-to/reference."""
    hits = []
    for f in files:
        t = C.classify_path(f)
        if t not in ("how-to", "reference"):
            continue
        text = C.read(f)
        block = C.first_h1_to_first_h2(text)
        wc = C.word_count(C.strip_code_fences(block))
        if wc > 100:
            hits.append((f, 1, f"{wc} words between H1 and first H2"))
    return hits

def run_type08(files):
    """MUST -- troubleshooting entry shape. Proxy scope: path-classified
    pages under a troubleshooting-ish path (reuses 'how-to' heuristic is too
    broad; use filename/path containing 'troubleshoot')."""
    hits = []
    for f in files:
        if "troubleshoot" not in f.lower():
            continue
        text = C.read(f)
        hs = [h for h in C.headings(text) if 2 <= h[1] <= 4]
        err_heads = [h for h in hs if re.match(r"^(Error|Warning):", h[2])]
        occurs = len(re.findall(r"This issue occurs when", text))
        entry_count = len(hs)  # approximation: all H2-4 headings as "entries"
        if not err_heads or not occurs or occurs != len(err_heads) or len(err_heads) != entry_count:
            hits.append((f, hs[0][0] if hs else 1,
                         f"entries={entry_count} error/warning-titled={len(err_heads)} 'occurs when'={occurs}"))
    return hits

def run_type09(files):
    """SHOULD -- troubleshooting entries last / split at 5+. Proxy scope:
    path contains 'troubleshoot' OR how-to/reference (broad per rule's
    applies-to)."""
    hits = []
    for f in files:
        text = C.read(f)
        hs = C.headings(text)
        err_heads = [h for h in hs if 2 <= h[1] <= 4 and re.match(r"^(Error|Warning):", h[2])]
        if len(err_heads) > 4:
            hits.append((f, err_heads[0][0], f"{len(err_heads)} Error/Warning headings (>4)"))
        elif err_heads:
            other_h2 = [h for h in hs if h[1] == 2 and h not in err_heads]
            if other_h2 and err_heads[0][0] < max(h[0] for h in other_h2):
                hits.append((f, err_heads[0][0], "troubleshooting heading precedes a non-troubleshooting H2"))
    return hits

def run_type10(files):
    """SHOULD -- landing lead-in cap: >30 words or >1 sentence terminator.
    The rule text says 'before the first heading or fenced block' literally,
    but a literal reading breaks on any page with an H1 title (the lead-in
    tagline sits AFTER the H1): block_before_first_heading_or_fence()
    returns '' on setup-grimoire/README.md's H1, and would silently pass
    every H1-having page (a false negative), while it read that file's
    pre-H1 <div>/<img> wrapper as if it were the tagline (right hit count,
    wrong reason). Fixed reading: text between the H1 (if any) and the
    first H2 or fence -- this is what DOC-TYPE-07 already does for H1->H2,
    reused here for consistency."""
    hits = []
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        text = C.read(f)
        body = C.FRONTMATTER_RE.sub("", text)
        hs = C.headings(body)
        h1 = next((h for h in hs if h[1] == 1), None)
        if h1:
            block = C.first_h1_to_first_h2(body)
        else:
            block = C.block_before_first_heading_or_fence(body)
        wc = C.word_count(block)
        terms = len(re.findall(r"[.!?]", block))
        if wc > 30 or terms > 1:
            hits.append((f, 1, f"{wc} words, {terms} sentence terminators (lead-in block)"))
    return hits

def run_type11(files):
    """MUST -- landing CTA before first ##. Generalized, generator-neutral
    reading: fenced block or markdown link before the first H2 (no
    VitePress-only slot parse -- see commission note on portability)."""
    hits = []
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        text = C.read(f)
        hs = C.headings(text)
        h2 = next((h for h in hs if h[1] == 2), None)
        cutoff = h2[0] if h2 else len(text.split("\n"))
        head_block = "\n".join(text.split("\n")[:cutoff])
        has_fence = "```" in head_block or "~~~" in head_block
        # v2: any inline or ref-style link counts as a CTA -- this v1 attempt
        # is kept for the report (it false-negatives on both known fleet
        # violations, see findings). v3 below tightens to an actionable link.
        has_any_link = bool(re.search(r"\[[^\]]*\]\([^)]+\)", head_block)) or \
                        bool(re.search(r"\[[^\]]+\]\[[^\]]*\]", head_block))
        if not (has_fence or has_any_link):
            hits.append((f, cutoff, "no fenced block or link before first ##"))
    return hits

def run_type11_v3(files):
    """MUST -- v3: same generator-neutral scan, but a link only counts as a
    CTA when its own reference-style/inline target or visible text looks
    actionable (install/start/quickstart/download/get), or it is a fenced
    command. A caveat-adjacent 'watch the release notes' link should not
    satisfy the rule -- v1/v2 above showed it does."""
    action_word = re.compile(r"install|getting[-_]?start|quickstart|quick[-_]?start|download|\bget[-_]?start", re.I)
    hits = []
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        text = C.read(f)
        hs = C.headings(text)
        h2 = next((h for h in hs if h[1] == 2), None)
        cutoff = h2[0] if h2 else len(text.split("\n"))
        head_block = "\n".join(text.split("\n")[:cutoff])
        has_fence = "```" in head_block or "~~~" in head_block
        inline_links = re.findall(r"\[([^\]]*)\]\(([^)]+)\)", head_block)
        ref_uses = re.findall(r"\[([^\]]+)\]\[([^\]]*)\]", head_block)
        ref_defs = dict(re.findall(r"^\s*\[([^\]]+)\]:\s*(\S+)", head_block, re.M))
        has_action_link = any(action_word.search(t) or action_word.search(u) for t, u in inline_links)
        for t, r in ref_uses:
            u = ref_defs.get(r or t, "")
            if action_word.search(t) or action_word.search(u):
                has_action_link = True
        if not (has_fence or has_action_link):
            hits.append((f, cutoff, "no runnable command and no action-shaped link before first ##"))
    return hits

def run_type12(files):
    """SHOULD -- VitePress-only: parse frontmatter hero.actions / features
    arrays. Reports 'no CTA slot found' (never a silent pass) on every page
    without that exact shape."""
    hits = []
    checked = 0
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        checked += 1
        text = C.read(f)
        fm = C.FRONTMATTER_RE.search(text)
        if not fm or "hero" not in fm.group(0):
            hits.append((f, 1, "no CTA slot found (no hero/features frontmatter)"))
            continue
        block = fm.group(0)
        actions = len(re.findall(r"^\s*-\s*theme:", block, re.M))
        features = len(re.findall(r"^\s*-\s*title:", block, re.M))
        if actions > 2 or features > 9:
            hits.append((f, 1, f"{actions} actions, {features} features"))
    return hits, checked

def run_type13(files):
    """SHOULD -- true-zero-case only: does at least one task-phrased grid or
    reader-naming sentence exist, on landing pages?"""
    reader_sentence = re.compile(r"\bfor (developers|users|teams|beginners|newcomers) who\b|\bif you (are|'re) (a|an)\b", re.I)
    hits = []
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        text = C.read(f)
        if not reader_sentence.search(text):
            hits.append((f, 1, "no reader-naming sentence found (grid task-phrasing not classified, reading heuristic)"))
    return hits

def run_type14(files):
    """MUST -- placeholder text."""
    pat = re.compile(r"lorem ipsum|placeholder text|TODO: write|coming soon", re.I)
    hits = []
    for f in files:
        text = C.read(f)
        for i, ln in enumerate(text.split("\n"), start=1):
            if pat.search(ln):
                hits.append((f, i, ln.strip()[:90]))
    return hits

def run_type15(files):
    """MUST -- unsourced trust claim."""
    pat = re.compile(r"trusted by|used by (thousands|leading)|[0-9,]+\+? (companies|developers|teams)", re.I)
    link = re.compile(r"\[[^\]]*\]\([^)]+\)")
    hits = []
    for f in files:
        text = C.read(f)
        lines = text.split("\n")
        for i, ln in enumerate(lines, start=1):
            if pat.search(ln):
                window = " ".join(lines[max(0,i-2):i+1])
                if not link.search(window):
                    hits.append((f, i, ln.strip()[:90]))
    return hits

def run_type16(files):
    """SHOULD -- landing: ordered list >2 items, or table >3 rows."""
    hits = []
    for f in files:
        if C.classify_path(f) != "landing/index":
            continue
        text = C.read(f)
        ordered = len(re.findall(r"^\s*\d+\.\s", text, re.M))
        table_rows = len(re.findall(r"^\s*\|.*\|\s*$", text, re.M))
        if ordered > 2:
            hits.append((f, 1, f"{ordered} ordered-list items"))
        if table_rows > 3:
            hits.append((f, 1, f"{table_rows} table rows"))
    return hits

def run_type17(files):
    """MUST -- approximate schema script per reference entry: description +
    syntax block + parameter table + remarks + errors + example."""
    hits = []
    for f in files:
        if C.classify_path(f) != "reference":
            continue
        text = C.read(f)
        hs = [h for h in C.headings(text) if h[1] in (2, 3)]
        lines = text.split("\n")
        for idx, h in enumerate(hs):
            start = h[0]
            end = hs[idx+1][0]-1 if idx+1 < len(hs) else len(lines)
            body = "\n".join(lines[start:end])
            has_fence = "```" in body
            has_table = bool(re.search(r"^\s*\|.*\|", body, re.M))
            has_remarks = bool(re.search(r"\bnote\b|\bremark|\bbehav", body, re.I))
            has_errors = bool(re.search(r"\berror|\bexception|\bfail", body, re.I))
            has_example = bool(re.search(r"\bexample\b", body, re.I)) and has_fence
            missing = [n for n, v in [("syntax", has_fence), ("table", has_table),
                       ("remarks", has_remarks), ("errors", has_errors), ("example", has_example)] if not v]
            if missing:
                hits.append((f, h[0], f"entry '{h[2][:30]}' missing: {','.join(missing)}"))
    return hits

def run_type19(files):
    """SHOULD -- H5 present, or >15/>20 top-level entries, on reference pages."""
    hits = []
    for f in files:
        if C.classify_path(f) != "reference":
            continue
        text = C.read(f)
        hs = C.headings(text)
        h5 = [h for h in hs if h[1] == 5]
        top = [h for h in hs if h[1] == 2]
        if h5:
            hits.append((f, h5[0][0], "H5 heading present"))
        if len(top) > 20:
            hits.append((f, 1, f"{len(top)} top-level entries (>20, FAIL)"))
        elif len(top) > 15:
            hits.append((f, 1, f"{len(top)} top-level entries (>15, WARN)"))
    return hits

def run_type20(files):
    """MUST -- generation directive framing floor: <100 words of prose
    outside the directive, on any page containing a directive marker."""
    directive = re.compile(r"^\s*:::\s*[\w.]+|Auto-generated|mkdocstrings|\{\{.*\}\}", re.I | re.M)
    hits = []
    for f in files:
        text = C.read(f)
        if not directive.search(text):
            continue
        prose = C.strip_code_fences(text)
        prose_no_directive = re.sub(r"^\s*:::.*$", "", prose, flags=re.M)
        wc = C.word_count(prose_no_directive)
        if wc < 100:
            hits.append((f, 1, f"{wc} words of framing prose around a generation directive"))
    return hits

RULES = {
    "DOC-TYPE-01": run_type01, "DOC-TYPE-03": run_type03, "DOC-TYPE-04": run_type04,
    "DOC-TYPE-05": run_type05, "DOC-TYPE-06": run_type06, "DOC-TYPE-07": run_type07,
    "DOC-TYPE-08": run_type08, "DOC-TYPE-09": run_type09, "DOC-TYPE-10": run_type10,
    "DOC-TYPE-11": run_type11, "DOC-TYPE-13": run_type13, "DOC-TYPE-14": run_type14,
    "DOC-TYPE-15": run_type15, "DOC-TYPE-16": run_type16, "DOC-TYPE-17": run_type17,
    "DOC-TYPE-19": run_type19, "DOC-TYPE-20": run_type20,
}

def main():
    want = sys.argv[1:] or list(RULES.keys())
    fleet = C.fleet_files()
    research = C.research_files()
    both = fleet + research
    for rid in want:
        if rid == "DOC-TYPE-12":
            hits, checked = run_type12(fleet)
            print(f"\n=== {rid} === scanned {checked} landing pages")
            for h in sample(hits): print("  ", h)
            print(f"  total hits: {len(hits)}")
            continue
        fn = RULES.get(rid)
        if not fn:
            print(f"\n=== {rid} === no runnable check implemented"); continue
        corpus = both if rid in ("DOC-TYPE-05", "DOC-TYPE-14") else fleet
        hits = fn(corpus)
        print(f"\n=== {rid} === scanned {len(corpus)} files, {len(hits)} hits")
        for h in sample(hits):
            print("  ", h)

if __name__ == "__main__":
    main()
