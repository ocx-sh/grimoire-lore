#!/usr/bin/env python3
"""Planted-violation confirmations for the runnable DOC-DISC and DOC-OBS
checks: clean fixture -> 0 hits, violated fixture -> goes red."""
import os, re
import common as C
import check_doc_disc as d
import check_doc_obs as o

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "dev", "fakerepo2")

def write(rel, content):
    p = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)
    return p

def check(name, clean_path, violated_path, fn):
    clean_hits = fn([clean_path])
    violated_hits = fn([violated_path])
    ok = len(clean_hits) == 0 and len(violated_hits) > 0
    print(f"{'PASS' if ok else 'FAIL':4} {name:16} clean={len(clean_hits)} violated={len(violated_hits)}")

# DOC-DISC-13: tier frontmatter
p1 = write("docs/a13c.md", "---\ntier: first-steps\n---\n# T\n")
p2 = write("docs/a13v.md", "# T\n")
check("DOC-DISC-13", p1, p2, d.run_disc13)

# DOC-DISC-15: step budget (getting-started proxy)
p1 = write("docs/getting-started/a15c.md", "# Start\n\n1. Install\n2. Run\n")
p2 = write("docs/getting-started/a15v.md", "# Start\n\n" + "\n".join(f"{i}. step" for i in range(1, 12)) + "\n")
check("DOC-DISC-15", p1, p2, d.run_disc15)

# DOC-DISC-16: word budget before first fence
p1 = write("docs/getting-started/a16c.md", "# Start\n\nOne line.\n\n```sh\ninstall\n```\n")
p2 = write("docs/getting-started/a16v.md", "# Start\n\n" + ("word " * 150) + "\n\n```sh\ninstall\n```\n")
check("DOC-DISC-16", p1, p2, d.run_disc16)

# DOC-DISC-17: tab syntax on a page that declares doc_type: tutorial
p1 = write("docs/tutorial/a17c.md", "<!-- doc_type: tutorial -->\n# Learn\n\nOne path only.\n")
p2 = write("docs/tutorial/a17v.md", "<!-- doc_type: tutorial -->\n# Learn\n\n::: code-group\n```sh [A]\n```\n:::\n")
check("DOC-DISC-17 (scoped)", p1, p2, lambda fs: d.run_disc17(fs, scoped=True))

# DOC-DISC-22: dev-only trigger without production scope sentence
p1 = write("docs/how-to/a22c.md", "# Quickstart\n\n```js\nconst key = process.env.KEY\n```\n\nNot for production; rotate the key before you ship.\n")
p2 = write("docs/how-to/a22v.md", "# Quickstart\n\n```js\nconst key = 'sk_test_abc123'\n```\n")
check("DOC-DISC-22", p1, p2, d.run_disc22)

# DOC-OBS-05 classification: frontmatter or path glob
p1 = write("docs/guide/a05c.md", "# Guide\n")
p2 = write("docs/runbooks/a05v.md", "# Runbook\n")
check("DOC-OBS-05 (classify)", p1, p2, lambda fs: o.run_obs05_classification(fs))

# DOC-OBS-08: unmeasured metric
p1 = write("docs/a08c.md", "The install step downloads one binary and verifies its digest.\n")
p2 = write("docs/a08v.md", "Most users finish onboarding in under five minutes.\n")
check("DOC-OBS-08", p1, p2, lambda fs: o.run_obs08(fs))

# DOC-OBS-14: fork detector (need 3+ shared >=40-word paragraphs)
para = ("This section explains how the installer resolves a platform binary from a manifest "
        "and why a digest pin is stronger than a floating tag when a CI runner caches results "
        "across many unrelated jobs on shared infrastructure that nobody fully controls today.")
para2 = ("The uninstall path removes the binary and any cached manifest entries it wrote, "
        "leaving the lock file untouched so a future install can restore the exact same version "
        "without re-resolving anything from the registry, which keeps offline installs cheap indeed.")
para3 = ("Environment variables override the config file only for the duration of one process "
        "invocation, never persisting to disk, so a CI job can safely export a temporary "
        "registry override without editing any file that another job or a human might read.")
clean_content = "# Clean\n\n" + para + "\n\n" + "A completely different unique paragraph goes here instead, with its own point.\n"
fork_a = "# A\n\n" + para + "\n\n" + para2 + "\n\n" + para3 + "\n"
fork_b = "# B\n\n" + para + "\n\n" + para2 + "\n\n" + para3 + "\n"
p_clean_dir = write("docs/a14_other.md", "# Other\n\nSomething else entirely, unrelated to the fork pair below.\n")
pA = write("docs/a14A.md", fork_a)
pB = write("docs/a14B.md", fork_b)
clean_forks = o.run_obs14([p_clean_dir, pA])
violated_forks = o.run_obs14([pA, pB])
print(f"{'PASS' if (len(clean_forks)==0 and len(violated_forks)>0) else 'FAIL':4} {'DOC-OBS-14':16} clean_pairs={len(clean_forks)} violated_pairs={len(violated_forks)}")

print("\ndone")
