#!/usr/bin/env python3
"""Runnable checks for DOC-DISC-13..22 (docs-use-case-discovery.md), the
tier-model half of the family. DOC-DISC-01..12 verify a discovery-procedure
ARTIFACT (needs.txt, a friction log, a coverage table) that no repo in the
fleet has ever produced -- there is no markdown corpus to run those against,
so they are reported as non-runnable rows in the main report, except
DOC-DISC-03 which the commission names explicitly and which this script
simulates using real fleet tokens against synthetic need sentences.
"""
import re, os, sys
import common as C

def run_disc03_simulation():
    """MUST -- 'Reject a user need whose need/outcome clause names a page,
    command or flag.' No needs.txt exists anywhere in the fleet, so this
    builds the token file the rule specifies (every fleet docs heading, plus
    a real CLI's flag/subcommand names) and tests it against a set of
    hand-written but realistic need sentences -- half clearly legitimate,
    half deliberately naming a product term -- to measure the admitted
    false-positive concern directly."""
    tokens = set()
    for f in C.fleet_files():
        text = C.read(f)
        for _, _, htext in C.headings(text):
            for w in re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", htext):
                tokens.add(w.lower())
    # a real CLI's flag/subcommand names -- ocx's reference page
    cli_ref = "/home/mherwig/dev/ocx/website/src/docs/reference/command-line.md"
    cli_text = C.read(cli_ref)
    for m in re.finditer(r"`(--?[a-zA-Z][a-zA-Z0-9-]*)`", cli_text):
        tokens.add(m.group(1).lstrip("-").lower())
    for _, lvl, htext in C.headings(cli_text):
        if lvl == 3:
            m = re.match(r"`(\w[\w-]*)`", htext)
            if m:
                tokens.add(m.group(1).lower())

    # Realistic need sentences an agent running discovery might write.
    # Each is (legitimate?, sentence). "legitimate" ones are genuinely about
    # a real user goal and SHOULD pass; they were not written to dodge the
    # filter, they are what a first-time user need plausibly reads like.
    needs = [
        (True,  "As a developer new to the tool, I need to get a working install fast, so that I can try it before committing."),
        (True,  "As a CI engineer, I need every build to produce the same binary regardless of which machine ran it, so that a security audit can trust the artifact."),
        (True,  "As a platform maintainer, I need to see who is allowed to change what, so that I can grant the right level of trust to a new contributor."),
        (True,  "As an operator, I need to know when a package version moves, so that our deployments do not silently drift."),
        (True,  "As a newcomer, I need one place that tells me what this project is for, so that I can decide if it fits my problem."),
        (False, "As a user, I need to run add to install a package, so that I get the binary on PATH."),
        (False, "As a user, I need to configure the lock file, so that pull resolves the right digest."),
        (False, "As a maintainer, I need the reference page to list every option, so that users do not have to guess a flag."),
        (False, "As a user, I need push to work reliably, so that CI does not fail."),
        (False, "As a contributor, I need the troubleshooting page to explain errors, so that I stop filing duplicate issues."),
    ]
    tp = fp = tn = fn = []
    results = []
    for legit, sentence in needs:
        hit_tokens = [t for t in tokens if re.search(r"\b%s\b" % re.escape(t), sentence.lower())]
        # the rule's own script: rg -iof tokens.txt needs.txt -- any token
        # match anywhere in the sentence fails it, whole-line grep semantics
        flagged = len(hit_tokens) > 0
        results.append((legit, flagged, sentence, hit_tokens[:5]))
    return results, len(tokens)

def run_disc13(files):
    """MUST -- rg -L '^tier: (first-steps|everyday|integration)$' over docs
    pages: lists every page with no matching tier frontmatter line."""
    pat = re.compile(r"^tier:\s*(first-steps|everyday|integration)\s*$")
    hits = []
    for f in files:
        text = C.read(f)
        fm = C.FRONTMATTER_RE.match(text)
        block = fm.group(0) if fm else ""
        if not any(pat.match(ln.strip()) for ln in block.split("\n")):
            hits.append((f, 1, "no 'tier:' frontmatter line"))
    return hits

def run_disc15(files):
    """SHOULD -- first-steps page step budget: ordered-list items + shell
    fences from H1 to EOF (proxy: no success-marker mechanism exists in the
    fleet, so this counts the whole page rather than 'to the first success
    marker'). Proxy scope: getting-started/tutorial path-classified pages."""
    hits = []
    for f in files:
        t = C.classify_path(f)
        if t not in ("getting-started", "tutorial"):
            continue
        text = C.read(f)
        n_steps = len(re.findall(r"^\s*\d+\.\s", text, re.M))
        n_shell = len(re.findall(r"^\s*```(sh|shell|bash|console|zsh)\b", text, re.M))
        total = n_steps + n_shell
        if total > 9:
            names_systems = bool(re.search(r"external system|requires (a|an|your)\b", text, re.I))
            if not names_systems:
                hits.append((f, 1, f"{total} steps/fences (>9) with no external-systems justification"))
    return hits

def run_disc16(files):
    """SHOULD -- first-steps page word budget before first fence, and flag
    an early callout that could be deferred past it."""
    hits = []
    for f in files:
        t = C.classify_path(f)
        if t not in ("getting-started", "tutorial"):
            continue
        text = C.read(f)
        hs = C.headings(text)
        h1 = next((h for h in hs if h[1] == 1), None)
        lines = text.split("\n")
        start = h1[0] if h1 else 0
        fence_line = next((i for i, ln in enumerate(lines) if i > start and re.match(r"^\s*```", ln)), len(lines))
        block = "\n".join(lines[start:fence_line])
        wc = C.word_count(block)
        callout = bool(re.search(r"^(:::\s*tip|>\s*\[!NOTE\]|!!!\s|<Aside)", block, re.M))
        if wc > 100:
            hits.append((f, 1, f"{wc} words before first fence (>100){' with a deferrable callout' if callout else ''}"))
    return hits

def run_disc17(files, scoped=True):
    """MUST -- branching-choice ban: code-group/Tabs/tab syntax on a page
    typed as tutorial. 0/248 pages declare doc_type: tutorial (DOC-TYPE-01
    is violated fleet-wide), so scoped=True returns an empty precondition
    result; scoped=False runs the pattern over every getting-started/
    tutorial-classified page as an informational proxy."""
    pat = re.compile(r"(:::\s*code-group|<Tabs|===\s*\"|\{%\s*tab)")
    hits = []
    for f in files:
        if scoped:
            text = C.read(f)
            if not re.search(r"^\s*(<!--\s*)?doc_type:\s*tutorial", text, re.M):
                continue
        else:
            if C.classify_path(f) not in ("getting-started", "tutorial"):
                continue
        text = C.read(f)
        m = pat.search(text)
        if m:
            line = text[:m.start()].count("\n") + 1
            hits.append((f, line, m.group(0)))
    return hits

def run_disc21(files):
    """SHOULD -- read the generator nav config; confirm first-steps pages
    and the everyday hub sit in different top-level nav groups. Skips a
    repo with no generator config, per the rule's own precondition."""
    import glob
    results = []
    seen_repos = set()
    for f in files:
        parts = f.split("/")
        try:
            i = parts.index("dev")
            repo = parts[i+1]
        except ValueError:
            continue
        if repo in seen_repos:
            continue
        seen_repos.add(repo)
        repo_root = "/".join(parts[:i+2])
        mkdocs = os.path.join(repo_root, "mkdocs.yml")
        summary = None
        for cand in glob.glob(os.path.join(repo_root, "docs", "src", "SUMMARY.md")):
            summary = cand
        if os.path.isfile(mkdocs):
            text = C.read(mkdocs)
            nav_m = re.search(r"^nav:\n((?:^[ \t]+.*\n?)+)", text, re.M)
            if not nav_m:
                results.append((repo, "mkdocs.yml has no top-level nav: block", None))
                continue
            nav_block = nav_m.group(1)
            top_level_indent = min(len(l) - len(l.lstrip(" ")) for l in nav_block.split("\n") if l.strip())
            top_entries = [l.strip() for l in nav_block.split("\n")
                           if l.strip() and (len(l) - len(l.lstrip(" "))) == top_level_indent]
            results.append((repo, f"{len(top_entries)} top-level nav groups", top_entries[:8]))
        elif summary:
            text = C.read(summary)
            top_headers = re.findall(r"^#\s+.+$", text, re.M)
            results.append((repo, f"SUMMARY.md, {len(top_headers)} top-level headers, flat list below" if not top_headers
                             else f"SUMMARY.md has {len(top_headers)} H1 groups", None))
        else:
            results.append((repo, "no generator nav config found -- skip (rule's own precondition)", None))
    return results

def run_disc22(files):
    """SHOULD -- dev-only trigger present (hardcoded test key, disabled
    auth) without an adjacent production-scope sentence, on
    tutorial/how-to pages."""
    trigger = re.compile(r"sk_test_|pk_test_|anon[_-]?key|service_role|your-api-key-here|auth:\s*false|disable.?auth", re.I)
    scope = re.compile(r"\bproduction\b", re.I)
    hits = []
    for f in files:
        if C.classify_path(f) not in ("getting-started", "tutorial", "how-to"):
            continue
        text = C.read(f)
        m = trigger.search(text)
        if m and not scope.search(text):
            line = text[:m.start()].count("\n") + 1
            hits.append((f, line, m.group(0)))
    return hits

RULES = {
    "DOC-DISC-13": run_disc13, "DOC-DISC-15": run_disc15, "DOC-DISC-16": run_disc16,
    "DOC-DISC-22": run_disc22,
}

def main():
    fleet = C.fleet_files()
    want = sys.argv[1:] or list(RULES.keys()) + ["DOC-DISC-17", "DOC-DISC-21", "DOC-DISC-03"]
    for rid in want:
        if rid == "DOC-DISC-03":
            results, n_tokens = run_disc03_simulation()
            print(f"\n=== {rid} (simulated) === {n_tokens} tokens from fleet headings + ocx CLI flags")
            for legit, flagged, sentence, toks in results:
                verdict = "FP" if (legit and flagged) else ("TP" if (not legit and flagged) else ("FN" if (not legit and not flagged) else "TN"))
                print(f"  [{verdict}] legit={legit} flagged={flagged} tokens={toks}\n        {sentence}")
            continue
        if rid == "DOC-DISC-17":
            print(f"\n=== {rid} (scoped: doc_type=tutorial declared) === 0 pages declare doc_type:tutorial fleet-wide")
            for h in run_disc17(fleet, scoped=True): print("  ", h)
            print(f"=== {rid} (informational: getting-started/tutorial path proxy) ===")
            for h in run_disc17(fleet, scoped=False): print("  ", h)
            continue
        if rid == "DOC-DISC-21":
            print(f"\n=== {rid} ===")
            for r in run_disc21(fleet): print("  ", r)
            continue
        fn = RULES.get(rid)
        if not fn:
            print(f"\n=== {rid} === no runnable check implemented"); continue
        hits = fn(fleet)
        print(f"\n=== {rid} === scanned {len(fleet)} files, {len(hits)} hits")
        for h in hits[:10]:
            print("  ", h)

if __name__ == "__main__":
    main()
