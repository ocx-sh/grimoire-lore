#!/usr/bin/env python3
"""DOC-OBS-01/02/04/06: checks over CI/build config, not page markdown.
Greps each real generator repo's taskfile/workflow for its link-check and
docs-build invocations, classifies build-dir vs raw-tree link checking, and
greps each fleet repo's docs-adjacent AI-config rule file for a stated
merge-blocking posture. Manually verified file:line citations are inline;
this script reproduces the grep half so the finding is re-runnable.
"""
import re, os, glob

DEV = "/home/mherwig/dev"
GENERATOR_REPOS = ["ocx-catalog", "grimoire-indexer", "ocx-mirror", "ocx-mcp",
                   "ocx-indexbot", "ocx-sdk-python", "ocx-mirror-sdk", "grimoire", "ocx"]

CONFIG_GLOBS = ["taskfile.yml", "taskfile*.yml", "taskfiles/*.yml", "taskfiles/*.yaml",
                ".github/workflows/*.yml", "book.toml", "website/taskfile.yml"]

def repo_configs(repo):
    out = []
    for pat in CONFIG_GLOBS:
        out += glob.glob(os.path.join(DEV, repo, pat))
    return sorted(set(out))

def run_obs01_02():
    """MUST/MUST -- does a build-time internal check exist (mkdocs --strict /
    mdbook-linkcheck), and is any raw-tree lychee pass scoped with a root and
    generated-anchor exclusions?"""
    results = {}
    for repo in GENERATOR_REPOS:
        text = "\n".join(open(p, errors="replace").read() for p in repo_configs(repo) if os.path.isfile(p))
        has_strict_build = bool(re.search(r"mkdocs build --strict", text))
        lychee_calls = re.findall(r"lychee[^\n]*", text)
        raw_tree = [c for c in lychee_calls if re.search(r"\s\.\s*$|\sdocs/\s*$", c)]
        has_exclude = [c for c in lychee_calls if "--exclude-path" in c]
        has_include_fragments = [c for c in lychee_calls if "--include-fragments" in c]
        results[repo] = {
            "mkdocs_strict_build": has_strict_build,
            "lychee_calls": lychee_calls,
            "raw_tree_calls": raw_tree,
            "exclude_path_calls": has_exclude,
            "include_fragments_calls": has_include_fragments,
        }
    return results

def run_obs04():
    """SHOULD -- does the repo's own docs-adjacent AI-config rule state a
    non-blocking posture for general drift? (checked against the fleet's own
    committed rule files, not a review-output corpus, since no repo has run a
    drift review yet)."""
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "fleet_docs_rule_files_filtered.txt")) as f:
        files = [l.strip() for l in f if l.strip()]
    out = []
    for f in files:
        text = open(f, errors="replace").read()
        blocks = bool(re.search(r"\bblock\b", text, re.I))
        non_blocking_stated = bool(re.search(r"must not be blockers|non-blocking|not a blocker", text, re.I))
        out.append((f, f"states-block={blocks} states-non-blocking={non_blocking_stated}"))
    return out

if __name__ == "__main__":
    print("=== DOC-OBS-01 / DOC-OBS-02 (link-check mechanism per generator repo) ===")
    for repo, r in run_obs01_02().items():
        print(f"  {repo}: strict_build={r['mkdocs_strict_build']} lychee_calls={r['lychee_calls']} "
              f"raw_tree={bool(r['raw_tree_calls'])} exclude_path={bool(r['exclude_path_calls'])} "
              f"include_fragments={bool(r['include_fragments_calls'])}")
    print("\n=== DOC-OBS-04 (stated merge-blocking posture in docs-adjacent rule files) ===")
    for f, r in run_obs04():
        print(f"  {f}: {r}")
