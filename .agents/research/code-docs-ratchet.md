---
title: "code-docs: length caps and the per-package ratchet (consolidated)"
topic: ratchet
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-ratchet/length-and-ratchet.md
  - .agents/research/code-docs-ratchet/doc-cap-calibration.md
  - .agents/research/code-docs-ratchet/gate-replays.md
cross_checked:
  - .agents/research/code-docs-audit/reference-corpus.md
  - .agents/research/code-docs-audit/census.md
  - .agents/research/code-docs-audit/sample.md
  - .agents/research/code-docs-audit/human-sample.md
  - .agents/research/code-docs-audit/exemplars.tsv
  - .agents/research/code-docs-guards/guard-shape.md
  - .agents/research/code-docs-guards.md
  - .agents/research/code-docs-routing/routing-table.md
  - .agents/research/code-docs-eval/eval-scoring.md
  - .agents/research/code-docs-topic-map.md
date: 2026-09-27
revised: 2026-09-27
---

# code-docs: length caps and the per-package ratchet

Question: which block-length caps and which ratchet metric hold the line
without being met by deleting guards? Paths are relative to the worktree
`/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs` unless absolute.
Fleet SHAs measured 2026-09-27: ocx `2691d3c`, grimoire `7b180c4`,
ocx-sdk-python `9713f0a`, ocx-mirror `a1d0737`, ocx-indexbot `870034b`,
ocx-catalog `a16be21`, grimoire-vscode `b4f7ca3`, grimoire-indexer `fd62461`,
arcana `8635f09`, creeptd-ng `a58c8be`. The revision's re-measurements ran at
the same SHAs except grimoire `be3a738` and ocx-mirror `71bb1c2`; their scripts
are in `/home/mherwig/.cache/research-lang/code-docs-scratch/ratchet-revise/`.

## Verdict

1. **Caps: plain 5 lines everywhere; doc 10, except a public item in a library-kind package, which gets 15.**
   - Plain: 5 flags 0 of 30 resolvable human plain guards.
   - Doc: 3 of 49 human doc guards exceed the tier that applies to them (6.1%). With LEN-07, 1 of 49 does: an 11-line uv prose guard, which LEN-05 splits.
   - The earlier claim that these caps "flag none of the human guards" rested on 7 doc guards. It did not survive a 49-guard sample and is withdrawn.
   - Share of human blocks flagged at these caps:

     | Block type | Cap | Flagged |
     |---|---:|---:|
     | App plain | 5 | 4.5% |
     | Library plain | 5 | 6.0% |
     | App doc | 10 | 3.8% |
     | Library doc, non-public | 10 | 8.2% |
     | Library doc, public | 15 | 14.3% (9.3% with LEN-07) |
2. **A block runs across blank lines.** Today the census splits a comment at every blank line. One blank line therefore turns a 6-line block into two 3-line blocks that both pass. Counting across blank lines changes the human calibration by 0.1-0.2 points and changes no human guard's length (measured here).
3. **The gated metric is the count of comment lines in over-cap blocks. It is an absolute count, keyed per file and rolled up per package.**
   - It is not per kLOC (the sub-artifact's pick) and it is not the ratio.
   - Deleting a guard that is within the cap earns no credit (planted case A: bit-for-bit unchanged).
   - Compressing an over-cap guard to within the cap earns the same credit as deleting it: the 39-line `github.rs` guard gives −39 either way. Deletion never earns more credit than compression. It does earn the same credit for less work, and item 9 records what that leaves open.
   - Under the ratio, deletion always pays more than compression.
4. **The per-kLOC form is rejected.** It lets new code arrive at the baseline's own rate, which is 461 lines/kLOC in ocx. That is continued inflation, not a held line. It is also the only source of the tiny-crate noise, so the dive's 500-line floor rule is dropped with it. The absolute, per-file form is what ocx's own `scripts/lint_ratchet.py` already does.
5. **No ratio is gated and no ratio target is shipped.** Ratio and char ratio appear in the report next to the human bands as context. The rule states that the cap binds whatever the surrounding file's density is. Claude Code's prompt says "match its comment density", and ocx's marginal long-block rate went from 173 to 728 lines/kLOC in six months.
6. **Guards get no exemption from the cap, whether the check recognises them or the source marks them.** An over-cap guard is split to its risk sites and compressed. This overrules the dive's "unless recognised as a guard" clause and routing-table's "every remaining line is guard" carve-out, for two reasons:
   - The recogniser finds only 43% of the fleet's guards, and guards are 48% of fleet lines.
   - An exemption would pay agents to inflate markers. For the same reason, LEN-07 never strips a `# Safety` heading or a free-prose heading.
7. **The guard carve-out is a diff-time review list. It is not a gate and not a metric exemption.**
   - LEN-06 lists the removed blocks the recogniser fired on, and review decides.
   - A faithful hunk-level build of the check was replayed over 200 ocx commits. It flagged 12 blocks, and none was a real guard loss (gate-replays §7-8).
   - Google's static-analysis bar allows under 10% false flags even for a review-time warning. A check that is wrong on everything it flags cannot block a diff.
8. **Holding the line needs no eval; cutting legacy guards to the cap does.** LEN-01..04 and LEN-07 bind new and grown blocks now. LEN-08 binds them as soon as the census groups interface lines. The cleanup may cut existing guards to the cap only after the eval's rules arm (and a mechanical capped arm) passes non-inferiority.
9. **Documented gap: nothing mechanical stops a guard deletion.** The ratchet holds the line on length. It does not guarantee that guards survive.
   - A within-cap guard that is deleted is invisible to LEN-03 (planted case A).
   - An over-cap guard that is deleted earns the same credit as one that is compressed, and deletion is less work.
   - LEN-06 sees a removed guard only when the recogniser fires (recall 0.43).
   - LEN-06's one replay exempted any commit that added any test or `.md` path, and it skipped 1-line blocks. Its recall on real deletions is therefore unmeasured: the replay contained no real deletion.
   - Guards rest on review and on the eval gate for legacy cuts.
10. **Structured sections do not count toward a doc cap (LEN-07); interface blocks do (LEN-08).**
    - Section stripping helps Python and JSDoc code: 47% of ocx-sdk-python's over-cap lines. It barely touches Rust essays: 2.1% of ocx's.
    - Interface blocks are uncapped today. ocx's longest ones carry a CVE essay into a published JSON Schema and a plan ID into long `--help`.

## The ruleset

Eight rules: five MUST, three SHOULD. "Over cap" means a plain block longer
than 5 lines, or a doc block longer than its LEN-02 tier after the LEN-07
count.

### LEN-01 — plain-comment cap

- **Rule:** Keep every plain (`//`, `#`) comment block to 5 lines or fewer in every package kind.
  - A block is the consecutive plain comment lines with only blank lines between them.
  - No exemption for guards or `SAFETY:`/`GUARD:` markers.
- **Rationale:** Prevents the fleet's long plain blocks (ocx 20.7% of plain blocks over 5 lines, against 4.46% for human apps). It also prevents the blank-line split that currently lets any long comment pass the cap as several short blocks.
- **Evidence:**
  - Cap 3 (the corpus p90) flags 5 of 32 human plain guards; cap 5 flags 0 ([sub-artifact §1](code-docs-ratchet/length-and-ratchet.md#1-the-three-candidate-plain-caps-against-39-human-guards)).
  - Re-measured across blank lines, 30 of 30 resolvable plain guards keep their length. The 2 pip `_vendor` guards sit in skipped trees.
  - App plain >5 goes from 4.46% to 4.59% across blank lines.
  - Library plain >5 is 5.96% (6.18% across blank lines) once deno std is excluded.
- **Verification:**
  - `REPO=/home/mherwig/dev/ocx; python3 rules/code-docs/checks/comment_census.py --root "$REPO" --scope prod --list-blocks --min-block 6 --kind line --format json | python3 -c 'import json,sys; b=json.load(sys.stdin); print(len(b)); sys.exit(1 if b else 0)'`
  - Blank-line fixture for the census self-test: `S=$(mktemp -d); printf 'fn f() {\n    // one\n    // two\n    // three\n\n    // four\n    // five\n    // six\n    let x = 1;\n}\n' > "$S/a.rs"; python3 rules/code-docs/checks/comment_census.py --root "$S" --scope all --list-blocks --kind line`. It must print one `x6` block. Today it prints two `x3` blocks: `blocks_of()` still splits at blank lines (re-checked for this revision), so it needs the fix before this rule ships.
- **Severity:** MUST for new and grown blocks, enforced through LEN-03. Cutting legacy blocks to the cap waits for the eval (see Decisions for the eval).
- **Portability:** portable. The number comes from a 33-repo, 7-language human corpus and does not vary by kind.

### LEN-02 — doc-comment cap by package kind and item visibility

- **Rule:** Keep every doc-comment block to 10 lines or fewer. The one exception: a public item's doc block in a library-kind package may run to 15.
  - **Public** means reachable from outside the package:
    - Rust: `pub` with no restriction.
    - Python: a name with no leading underscore.
    - TS/JS: an exported declaration, or a member of one.
    - Go: an exported identifier.
    - Java: `public`, or a member of an interface.
    - Kotlin: `public` or no modifier.
  - **Non-public** means everything else, including `pub(crate)` and Kotlin `internal`. It gets 10 in every package kind.
  - A block whose item the detector cannot place gets its package kind's tier.
  - **Library kind** is declared per package in the ratchet config. It is a package with a consumer outside its own repo: `publish` not false, npm without `"private": true`, or a Python package other packages install. Undeclared packages are app-kind.
  - Count blocks and exemptions as in LEN-01, and apply LEN-07's section rule to the count.
- **Rationale:** Prevents ocx-style doc essays: 21.5% of ocx doc blocks run past 10 lines, against 3.75% for human apps.
  - The library tier stops the cap from flagging ordinary published-contract prose.
  - The visibility test stops private helpers in a library from writing to public-contract length. Human library private docs sit near app length, while public ones run twice as long. One fleet example is the private `_which` with a 21-line docstring (`ocx-sdk-python:src/ocx_sdk/_bootstrap.py:430-451`).
- **Evidence:**
  - **Human doc guards, 49 in all.** Wave 1 found 7. doc-cap-calibration added 42, hand-classified from 258 keyword-flagged candidates ([doc-cap-calibration §4-5](code-docs-ratchet/doc-cap-calibration.md#5-the-new-samples-length-distribution-and-three-guards-that-break-the-shipped-cap)). Three exceed their tier, all app-kind:

    | Guard | Lines | After LEN-07 |
    |---|---:|---:|
    | `astral-sh/uv:crates/uv-preview/src/lib.rs:164` | 11 | 11 |
    | `psf/black:src/black/trans.py:836` | 14 | 9 |
    | `psf/black:src/black/trans.py:121` | 16 | 8 |

    - LEN-07 strips black's `Returns:` and `Yields:` sections and keeps the `WARNING` guard text.
    - The keyword filter likely favours longer blocks, so 6.1% is an upper-side estimate.
    - The dive did not report the visibility of its library guards. The longest is 12 lines and would be flagged under the non-public tier if its item is private.
  - **Visibility**, measured on the 33-repo corpus, pooled per block, prod lines ([doc-cap-calibration §1-2](code-docs-ratchet/doc-cap-calibration.md#1-doc-block-length-by-visibility-reference-corpus), re-run here without `#[cfg(test)]` regions: 272 blocks dropped, no percentile moved):

    | Kind and visibility | p90 | p95 |
    |---|---:|---:|
    | Library public | 20 | 30 |
    | Library non-public | 9 | 15 |
    | App public | 6 | 10 |
    | App non-public | 6 | 8 |

    Flag rates at the revised tiers:

    | Kind and visibility | Cap | Flagged | With LEN-07 |
    |---|---:|---:|---:|
    | App public | 10 | 4.47% | n/a |
    | App non-public | 10 | 3.22% | n/a |
    | Library non-public | 10 | 8.19% | 5.32% |
    | Library public | 15 | 14.33% | 9.25% |

    - The prototype detector counts Kotlin default-public members, Java interface members and TS members of exported classes as non-public. That inflates the non-public bucket, so the real gap is at least this large.
  - **Earlier caps.** Doc cap 6 flags 2 of the 7 wave-1 doc guards ([§2-3](code-docs-ratchet/length-and-ratchet.md#2-the-four-candidate-doc-caps-against-the-same-guards)).
  - **Cap 15 rather than 20.** Cap 20 buys no guard headroom, since the longest human library doc guard is 12 lines.
  - **An adopter who declines LEN-07 should take the library-20 override.** Without LEN-07, cap 15 flags 14.3% of human public library docs, above every long-tail rate this ruleset accepts elsewhere.
- **Verification:**
  - `REPO=/home/mherwig/dev/ocx; python3 rules/code-docs/checks/comment_census.py --root "$REPO" --scope prod --list-blocks --min-block 11 --kind doc --format json | python3 -c 'import json,sys; b=json.load(sys.stdin); print(len(b)); sys.exit(1 if b else 0)'`. For public items in library-kind packages, use `--min-block 16`.
  - The visibility tier needs a detector upstreamed into `comment_census.py`. The prototype is `measure_visibility_sections.py` in `code-docs-scratch/doc-cap-calibration/`. The shipped detector must apply the public definitions above; the prototype's Kotlin, Java-interface and TS-member errors would cap public contract at 10.
  - Planted twin in a library-kind scratch crate: two 11-line doc blocks, one on `pub fn` and one on `fn`. Only the private one may be listed.
- **Severity:** MUST for new and grown blocks, enforced through LEN-03. Legacy blocks wait for the eval. The visibility tier binds once the detector ships. Until then every block is unplaced and gets its package tier, which is today's behaviour.
- **Portability:** fleet default the adopter may override. The app/library line, 15 versus 20, and the per-language public definitions are judgment calls.

### LEN-03 — the ratchet

- **Rule:** Gate on the number of comment lines in over-cap blocks, as an absolute count.
  - Scope: prod only.
  - Keys: one per file, rolled up per package in the report.
  - Baseline: a checked-in JSON file. An absent key counts as 0.
  - `--check` fails on any rise.
  - `--update` writes decreases freely and refuses rises. A rise needs `--update --allow-regression`, which prints every raised key.
  - A baseline key whose file still exists in `git ls-files` but is missing from the run fails. It does not read as a decrease.
  - The report shows, per key, the lines LEN-07 stripped beside the counted lines.
- **Rationale:** The metric never pays more for deleting a guard than for compressing it (Verdict 9 covers what it cannot see).
  - A within-cap guard is invisible to the metric.
  - Compressing an over-cap guard earns the same credit as deleting it.
  - Per-file keys stop one file's new essay from hiding behind another file's cut.
  - The missing-file rule stops a partial run, or an added `DO NOT EDIT` header (which the census skips), from reading as improvement.
- **Evidence:**
  - Planted case A: deleting a real 3-line guard leaves the metric unchanged (`ocx_cli/src/options/completion.rs:38-40`, [§6](code-docs-ratchet/length-and-ratchet.md#6-gaming-three-planted-diffs-against-all-four-metrics)).
  - `lint_ratchet.py` keys per file because "a bare per-code count lets one broken link be fixed while another appears elsewhere". Its truncation guard exists because "erasure by truncation arrives as decreases" (`/home/mherwig/dev/ocx/scripts/lint_ratchet.py:31-67`).
- **Verification:**
  - The metric runs today: `REPO=/home/mherwig/dev/ocx; python3 rules/code-docs/checks/comment_census.py --root "$REPO" --scope prod --list-blocks --format json | python3 -c 'import json,sys; c={}; [c.__setitem__(b["file"], c.get(b["file"],0)+b["len"]) for b in json.load(sys.stdin) if (b["kind"]=="line" and b["len"]>5) or (b["kind"]=="doc" and b["len"]>10)]; json.dump(dict(sorted(c.items())), sys.stdout, indent=1)'`.
  - On ocx it gives 466 keys and 47,502 lines. LEN-08 adds 182 interface blocks (3,252 lines) once interface lines are grouped.
  - The `--check`/`--update` wrapper is still to build, as `rules/code-docs/checks/length_ratchet.py`. Its tests should mirror `/home/mherwig/dev/ocx/scripts/tests/test_lint_ratchet.py`:
    - a planted rise exits 1;
    - a planted drop exits 0;
    - a file deleted from the run that still exists exits 1.
- **Severity:** MUST.
- **Portability:** The mechanism is portable. Per-file keys are a fleet default the adopter may override: a repo with heavy file churn may key per package.

### LEN-04 — no ratio target; the cap ignores the room

- **Rule:** State no comment:code target anywhere in the rule. Report ratio and char ratio only as context beside the human bands. Say in the rule index that the length caps bind whatever the surrounding file's density is, while idiom and naming still follow the file.
- **Rationale:** Prevents two failures.
  - A ratio target (or ratio ratchet) taxes every new within-cap guard and always pays more for deleting than for compressing.
  - "Match its comment density" feeds on an already-inflated file. ocx's marginal long-block rate rose from 173 to 728 lines/kLOC of new code between Apr and Sep 2026 ([§8](code-docs-ratchet/length-and-ratchet.md#8-ambient-matching-match-its-comment-density-and-ocxs-accelerating-rate)). Over the same years, human repos shifted only +0.005 in median ratio (`code-docs-audit/reference-corpus.md`).
- **Verification:** `rg -n -e '1:[0-9]' -e 'target ratio' -e 'aim for' -e 'match its comment density' rules/code-docs/` must return nothing outside the reference-bands citation. As a reading check, the index must contain the sentence saying the caps ignore the surrounding density.
- **Severity:** MUST.
- **Portability:** portable.

### LEN-05 — an over-cap guard is split, never exempted or kept whole

- **Rule:** Bring an over-cap guard under the cap in three steps:
  1. Split it into one comment per breaking edit, placed at that edit's own line.
  2. Keep caller-visible preconditions in the doc block and implementation hazards as plain comments.
  3. Move the rest to a file-qualified pointer.

  Never keep a duplicate of a guard that already sits at its line.
- **Rationale:** Prevents the "it is a guard, so it may be long" failure.
  - Guard-shape's 20 rewrites fit these caps: plain rewrites are 1-4 lines, and doc rewrites are 3-9 lines apart from two Python contract docstrings ([guard-shape §2](code-docs-guards/guard-shape.md#2-twenty-fleet-guards-rewritten-to-human-shape)).
  - ocx's 97-line trampoline doc repeats guards that already sit at their lines. `ocx:crates/ocx_config/src/env.rs:1820-1825` restates the FIFO guard at `:1866-1868`. `:1771-1780` restates the line-2 anchor at `:1887-1894`. `:1812-1814` restates the Windows content note at `:1907-1909`.
  - LEN-05 fits the one human doc guard still over its tier after LEN-07. uv's 11-line `with_features` doc states three separable facts: no nesting, thread-local validity, and the `HELD` check. They split into a short call-site comment and a shorter doc ([doc-cap-calibration §5](code-docs-ratchet/doc-cap-calibration.md#5-the-new-samples-length-distribution-and-three-guards-that-break-the-shipped-cap)).
- **Verification:**
  - Reading heuristic: for each over-cap block the recogniser flags, count how many distinct breaking edits it names. More than one means split it, not shrink it (guard-shape rule 4). Grep the enclosing function for a plain comment that restates the same edit; a hit means delete the doc copy.
  - Planted fixture: a 12-line `// SAFETY:` block in a scratch directory must be listed by `comment_census.py --root "$S" --scope all --list-blocks --min-block 6 --kind line`, proving there is no exemption path.
- **Severity:** SHOULD.
- **Portability:** portable.

### LEN-06 — diff-time guard-removal review list

- **Rule:** A diff should add a replacement when it removes a comment block the recogniser fired on, or shrinks one so the recogniser no longer fires on the new text.
  - The replacement names the same constraint: a file-qualified pointer, a test covering the behaviour, or a lint-owned form.
  - List every such block for review, and every other removed block of 3 or more lines. The list informs review and never fails the diff.
- **Rationale:** Covers the residue LEN-03 cannot see. Deleting is less work than compressing for the same ratchet credit. A 39-line guard deletion and a 57-line essay relocation move every volume metric the same way (planted cases B and C, [§6](code-docs-ratchet/length-and-ratchet.md#6-gaming-three-planted-diffs-against-all-four-metrics)).
- **Limits:**
  - The recogniser misses more guards than it finds.

    | Build | Recall | Precision |
    |---|---:|---:|
    | Guard-shape original | 0.432 | 0.714 |
    | Rebuild from the published rule table | 0.429 | 0.594 (32 hand-read fires) |

    The original's source is lost, and its precision did not reproduce ([gate-replays §4-6](code-docs-ratchet/gate-replays.md#6-precision-on-100-random-previously-unlabelled-ocx-blocks)). A miss is "unclassified", never "safe".
  - The "shrunk but still fires" pass keeps guard-shape's intended 42→5 compressions legal. The sub-artifact's "shrunk by more than half" trigger would have blocked them.
- **Evidence:** A hunk-level `guard_removal.py` was replayed over ocx's last 200 commits ([gate-replays §7-8](code-docs-ratchet/gate-replays.md#8-hand-read-verdicts-on-all-12-len-06-candidates)):

  | Outcome | Hunks |
  |---|---:|
  | Recogniser fired before the edit | 79 |
  | Still fired after the edit | 34 |
  | Exempt, because the commit added some pointer, test or lint form anywhere | 33 |
  | Flagged | 12 |

  - Hand-reading all 12 found no real guard loss:
    - 2 were pairing artifacts, one of them a guard moved verbatim within its hunk.
    - 7 were consolidations, dedups or bug-fix rewrites whose fact survives elsewhere.
    - 3 were rewrites the recogniser does not fire on.
  - By those verdicts, whole-commit similarity pairing (the dive's fix) clears the verbatim moves only. Two dedups point at a copy that predates the commit, and three rewrites stay flagged.
- **Verification:**
  - The prototype is `/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/guard_removal.py`. Before it runs in CI:
    - pair removed and added blocks across the whole commit and against the post-image tree, using `difflib.SequenceMatcher` with `git diff --color-moved=blocks --diff-algorithm=histogram` as a pre-filter;
    - tie each exemption to the removed block, not to any test or `.md` anywhere in the commit;
    - include 1-line blocks.
  - Two planted fixtures must pass: a guard moved verbatim to another function is not listed, and the same guard deleted with no replacement is listed.
  - It needs the recogniser committed under `rules/code-docs/checks/` with its fixture (GRD-06).
- **Severity:** SHOULD, as a review list.
  - Not wired into CI until a redesigned check measures under 10% false flags on a replay. That is Tricorder's bar for any review-time warning ([SWE at Google ch. 20](https://abseil.io/resources/swe-book/html/ch20.html)).
  - MUST needs near-zero false flags. A check keyed on a recogniser at about 0.6 precision and 0.43 recall is unlikely to reach that.
- **Portability:** portable.

### LEN-07 — structured sections do not count toward a doc cap

- **Rule:** When measuring a doc block against LEN-02, skip the lines inside a section that restates the signature or gives examples.
  - **Sections skipped:**
    - Rust: `# Errors`, `# Panics`, `# Examples` and `# Aborts`, plus fenced code.
    - Python: `Args:`, `Returns:`, `Raises:`, `Yields:` and `Attributes:`, plus reST `:param:`, `:returns:`, `:raises:`, `:type:` and `:rtype:` fields.
    - JSDoc: `@param`, `@returns`, `@throws` and `@example`.
    - Javadoc: `@param`, `@return`, `@throws` and `@see`.
  - **Always counted:** `# Safety`, `# Undefined behavior`, `# Implementation notes`, `Note:` and `WARNING` text. These headings carry guards and free prose, and a heading that buys length is a marker exemption (LEN-01).
  - LEN-03's report shows the stripped lines.
- **Rationale:** Prevents the cap from taxing the contract vocabulary a caller needs. Two of the three human doc guards over their tier are over only because of such a section.
- **Evidence:**
  - black `trans.py:121` goes from 16 lines to 8 once its `Yields:` section is stripped, and the `WARNING` guard stays counted. black `:836` goes from 14 to 9.
  - Fleet effect, prod lines:

    | Repo | Over-cap blocks brought under | Over-cap lines freed |
    |---|---:|---:|
    | ocx-sdk-python (library) | 104 of 129 | 1,588 of 3,361 (47.2%) |
    | ocx | 139 of 1,844 | 829 of 38,642 (2.1%) |
    | grimoire (`be3a738`) | 66 | 317 of 8,860 (3.6%) |
    | ocx-catalog | 1 | 3 lines (0.2%) |
  - The dive's vocabulary also stripped `# Safety`, `# Undefined behavior`, `# Implementation notes` and `Note:`. Removing those changes only ocx-sdk-python, by 1 block and 27 lines (measured here).
- **Verification:**
  - Fold the prototype's `strip_sections()` (`code-docs-scratch/doc-cap-calibration/measure_visibility_sections.py`) into `comment_census.py` as `--strip-sections`, with the vocabulary above.
  - Planted fixtures:
    - a Python docstring with a 6-line summary and an 8-line `Args:` section counts 6;
    - a Rust doc with 12 lines under `# Safety` counts 12 or more.
- **Severity:** SHOULD. An adopter who declines it takes more flags on Python and JSDoc code and should take the library-20 override (LEN-02).
- **Portability:** portable. The per-language vocabulary is a fleet default.

### LEN-08 — interface blocks count toward the doc cap

- **Rule:** Count a doc block that renders into a user surface as a doc block under LEN-02 and LEN-03.
  - Such blocks are items deriving clap `Parser`, `Args`, `Subcommand` or `ValueEnum`, or schemars `JsonSchema`, plus click/typer command docstrings and pydantic model docstrings.
  - Interface items are public for LEN-02's tier.
  - User reference longer than the cap moves into the generator's explicit text attribute (`long_about`, `long_help`, `after_long_help`, `#[schemars(description = ...)]`), where docs-quality owns it.
  - Maintainer rationale moves to a plain comment or a record, never into the user surface.
- **Rationale:** Prevents two failures.
  - The census's interface bucket is uncapped today, so any essay on a derived item escapes LEN-02.
  - clap and schemars render the whole doc comment, so that essay also ships to users.
- **Evidence:**
  - ocx, prod lines: 1,333 interface blocks with p90 12. 182 run past 10 lines and hold 3,252 lines, 46% of all interface lines ([doc-cap-calibration §8](code-docs-ratchet/doc-cap-calibration.md#8-interface-blocks-in-ocx-length-and-two-concrete-leaks)).
  - `ocx:crates/ocx_project/src/consent.rs:80`: 47 lines on a `schemars::JsonSchema` enum. It names CVE-2026-35533, GHSA-436v-8fw5-4mj8 and `ocx-sh/ocx#344`, and all of it lands in the published schema. schemars takes the whole doc comment as `description` and sets no length limit.
  - `ocx:crates/ocx_cli/src/command/toolchain_env.rs:86`: 46 lines on a `Parser`. It carries "a C7 patch fail-closed failure" into long `--help`. frame.md's 0-of-73 leak check covered short help only. Both leaks were re-verified at `2691d3c` for this revision.
  - Human calibration (measured here): uv, at HEAD, is the one corpus repo with substantial clap-derive text.
    - It has 797 interface blocks. 47 run past 10 lines (5.9%) and 19 past 15.
    - The longest, `crates/uv-cli/src/lib.rs:480` (41 lines), is deliberate user reference for `uv python --help`. The explicit attribute is its compliant home.
    - 5.9% sits in the long-tail band this ruleset already accepts (library plain is 6.0% at cap 5).
  - Other fleet repos have few long interface blocks: grimoire 13 of 409 past 10, ocx-mirror 1 of 94.
  - ocx's rate is 2.3 times uv's, against 5.7 times for ordinary doc blocks. For interface text, length is the weaker signal. The leak content stays with the interface-leak check.
- **Verification:**
  - Today `blocks_of()` groups only `doc` and `line` runs (`rules/code-docs/checks/comment_census.py:522-534`), so interface blocks are invisible to every cap command.
  - Extend it to group `interface` runs and add `interface` to `--kind`. Then this must list ocx's 182 blocks: `REPO=/home/mherwig/dev/ocx; python3 rules/code-docs/checks/comment_census.py --root "$REPO" --scope prod --list-blocks --min-block 11 --kind interface --format json`.
  - The interim measurement is `code-docs-scratch/ratchet-revise/iface_blocks.py`.
- **Severity:** MUST for new and grown blocks through LEN-03, once `blocks_of()` groups interface lines. That is the same kind of pre-ship fix as LEN-01's blank-line one.
- **Portability:** portable.

**Dropped from the sub-artifacts:**

- Rule 4 (the 500-line per-package floor): it only existed because of per-kLOC noise.
- The "cap unless recognised as a guard" clause of rules 1-2.
- The "pointer credit counts only the local remainder" note: the census already counts only local lines, so it needs no rule.
- The longest-quartile human sign-off: low yield, and LEN-06 covers it.
- doc-cap-calibration's `# Safety`, `# Undefined behavior`, `# Implementation notes` and `Note:` entries in the strip vocabulary. They buy length with a marker.
- gate-replays' promotion of LEN-06 to MUST after similarity pairing: by the replay's own verdicts, pairing alone leaves most flags false.

**Out of this group:**

- The 200-character first-paragraph cap belongs to rendered-summary (`code-docs-surfaces/rendered-summary.md`).
- Guard content and register belong to guard-shape. LEN-05 cites them rather than restating them.
- Two gate-replays findings belong to linkage, not this group: the LNK-06 fix (a per-citation staleness test, since the whole-file test missed `adr_toolchain_activation.md`) and the 300-commit replay (3 fires, all real).
- The recogniser precision gap (0.594 against 0.714) belongs to GRD-06 in guards. It is used here only for LEN-06's limits.
- The leak content in interface text belongs to interface-leak and DOC-11. doc-cap-calibration §8 adds clap's long `--help` as a channel that the short-help check in frame.md did not cover.

## Applied to the fleet

Measured 2026-09-27 with `comment_census.py --scope prod --list-blocks` at the SHAs above. The
human row comes from the 33-repo reference corpus, pooled, with deno std excluded from the library figures (its doc text is classified as plain; see `reference-corpus.md` Caveats).

| Repo | Plain >5 (share of plain blocks) | Doc >10 (share of doc blocks) | Comment lines in over-cap blocks | Status |
|---|---:|---:|---:|---|
| human apps / libs | 4.46% / 5.96% | 3.75% / 17.47% (>15: 10.66%) | n/a | reference |
| ocx | 904 of 4,376 (20.7%) | 1,844 of 8,569 (21.5%) | 59% (47,502 lines, 466 files) | violates LEN-01, LEN-02, LEN-05, LEN-08 |
| grimoire | 245 of 1,825 (13.4%) | 458 of 3,756 (12.2%) | 44% | violates LEN-01, LEN-02 |
| ocx-mirror | 97 of 778 (12.5%) | 305 of 1,833 (16.6%) | 48% | violates LEN-01, LEN-02 |
| ocx-indexbot | 16 of 87 (18.4%) | 165 of 392 (42.1%) | 73% | violates LEN-01, LEN-02 |
| ocx-catalog | 32 of 118 (27.1%) | 77 of 322 (23.9%) | 62% | violates LEN-01, LEN-02 |
| grimoire-vscode | 96 of 572 (16.8%) | 64 of 756 (8.5%) | 33% | violates LEN-01, LEN-02 |
| grimoire-indexer | 67 of 390 (17.2%) | 71 of 517 (13.7%) | 44% | violates LEN-01, LEN-02 |
| arcana | 34 of 171 (19.9%) | 252 of 340 (74.1%) | 89% | violates LEN-02 hardest in the fleet |
| ocx-sdk-python (library) | 3 of 37 (8.1%) | 195 over 10; 3,361 lines in blocks over 15 | 81% | violates LEN-02 at the library cap; LEN-07 frees 47% |
| creeptd-ng | 83 of 1,871 (4.4%) | 170 of 2,118 (8.0%) | 35% | **satisfies LEN-01 at the human rate**; doc runs 2x the human app rate |

The revision's new rules, applied to doc blocks over their tier, on prod lines:

| Repo | Over-cap doc blocks (lines) | Freed by LEN-07 | Non-public or unplaced share | Interface blocks over 10 (LEN-08) |
|---|---:|---:|---:|---:|
| ocx | 1,844 (38,642) | 829 (2.1%) | 55.3% | 182 (3,252 lines) |
| grimoire (`be3a738`) | 462 (8,860) | 317 (3.6%) | 67.3% | 13 (214 lines) |
| ocx-sdk-python (library) | 129 (3,361) | 1,588 (47.2%) | 24.5% | 0 |
| ocx-catalog | 77 (1,676) | 3 (0.2%) | 48.3% | n/a (TS) |

doc-cap-calibration's fleet table reported 2,562 blocks and 49,421 lines for
ocx. It counted doc blocks inside `#[cfg(test)]` regions of prod files: 718
blocks and 10,779 lines. The figures above drop them, matching the census's
prod scope.

**Satisfied today:**

- **LEN-04 (no ratio target anywhere).** No lore rule or fleet config states a comment:code target or a length number. No rule file under `rules/` matches `comment density`, `comment:code` or `one short line`; the only hit is the census docstring's definition. ocx's local rule says only "Code = *what*; comments = *why*" (`ocx:.claude/rules/quality-rust.md:283-300`), and ocx's `CLAUDE.md:140` says the same.
- **Within-cap guards already exist and are the target shape.** Examples: `ocx:crates/ocx_cli/src/options/completion.rs:38-40` (3 lines, plain) and ocx's `SAFETY: geteuid` guard (`ocx:crates/ocx_config/src/lib.rs:1590-1591`, 2 lines).
- **The LEN-03 mechanism already exists in ocx for clippy and rustdoc.** It lives in `ocx:scripts/lint_ratchet.py`, with `clippy-warn-baseline.json` and `rustdoc-warn-baseline.json`. The comment ratchet reuses its shape rather than inventing one.

**Violated today:**

- **LEN-01/02 in every fleet repo.** Every repo's over-cap share runs 3-20x the human rate. The worst single blocks are the 97-line trampoline doc (`ocx:crates/ocx_config/src/env.rs:1755-1851`), the 57-line `--env` grammar doc (`ocx:crates/ocx_cli/src/options/env_override.rs:61-117`) and the 39-line push-access guard (`ocx:crates/ocx_announce/src/forge/github.rs:791-829`).
- **LEN-05: duplicated guards.** The doc block restates guards that already sit at their lines (`ocx:crates/ocx_config/src/env.rs:1820` next to `:1866`, `:1771` next to `:1887`, `:1812` next to `:1907`).
- **LEN-02 in the library tier.** The private helper `_which` carries a 21-line docstring whose `Args:` entries restate the signature (`ocx-sdk-python:src/ocx_sdk/_bootstrap.py:430-451`). It is over both the non-public tier and the old flat 15.
- **LEN-08 in ocx.** 182 interface blocks run past 10 lines. The two longest carry a CVE essay into the published JSON Schema (`consent.rs:80`) and a plan ID into long `--help` (`toolchain_env.rs:86`).

**New commitments:**

- The blank-line fix to `blocks_of()` (LEN-01).
- The per-file comment baseline and `length_ratchet.py` (LEN-03). ocx's first baseline is 466 keys and 47,502 lines, plus 3,252 interface lines once LEN-08 ships.
- The kind declaration per package (LEN-02). ocx-sdk-python is library-kind; everything else is app-kind by default.
- The visibility detector in `comment_census.py`, with the per-language public definitions (LEN-02).
- `--strip-sections` with the narrowed vocabulary (LEN-07).
- Interface grouping in `blocks_of()` and `--kind interface` (LEN-08).
- `guard_removal.py` as a review list, with the redesign LEN-06 names before any CI use.
- The one "caps ignore the room" sentence in the index (LEN-04).

## AI-agent failure modes

Ranked by how often each bites. The first two are measured; 10 is observed in
shape; the rest are predicted from the planted diffs and precedent.

1. **Matching the room.** The agent reads a file's 18-line doc blocks as the norm and writes to that norm. This happens on every edit in a dense file. ocx's new code arrives at 561-728 lines/kLOC in long blocks, above its own 461 average ([§8](code-docs-ratchet/length-and-ratchet.md#8-ambient-matching-match-its-comment-density-and-ocxs-accelerating-rate)). Countered by LEN-03 (a check, not a prompt) and LEN-04.
2. **Writing a guard long and in the doc register.** Fleet guards have a median of 6 lines, 53% sit in doc comments and 33 of 100 run past 10 lines. Human guards have a median of 2 across all 39 wave-1 guards. Human doc guards have a median of 5 across 49, and 3 run past their tier (`code-docs-audit/sample.md` §5, `human-sample.md`, doc-cap-calibration §5). Countered by LEN-01, LEN-02 and LEN-05.
3. **Deleting instead of compressing when the ratchet goes red.** Deleting is less work for identical credit, and planted case B shows every volume metric rewards it. LEN-03 removes the extra reward the ratio would pay. Nothing gates the deletion itself. LEN-06 only lists it for review, and it lists it only when the recogniser fires, about 43% of the time. This is Verdict 9's documented gap.
4. **"It is a guard, so it may stay long."** An agent keeps an over-cap block by recognising it as a guard or by adding a marker. routing-table proposed exactly this carve-out, and `env.rs` shows the duplicates it would protect. Countered by LEN-05, the no-exemption clause in LEN-01/02, and LEN-07's never-stripped headings. Guard-shape's clippy precedent (`UNNECESSARY_SAFETY_COMMENT`) is the reason a marker never buys an exemption.
5. **Reaching for `--update`, or `--allow-regression`, when red.** This is `lint_ratchet.py`'s stated reason for refusing rises under plain `--update`. Countered by LEN-03, and the raised keys are visible in review.
6. **Splitting a block with a blank line.** The census accepts it today; this was demonstrated on a fixture and is unobserved in the fleet only because no cap exists yet. Countered by the block definition in LEN-01.
7. **Moving an essay verbatim to a record.** This satisfies "moved, not deleted" but reduces nothing. The metric credits only local lines, so it cannot game LEN-03; the cleanup skill owns making the moved text shorter.
8. **Escaping the census by scope or generated marker.** An agent adds a `DO NOT EDIT` header or moves a file into a skipped tree. Only one fleet file matches the generated regex today (`ocx-catalog/test/ci/header.test.ts`). Countered by LEN-03's missing-file rule.
9. **Hiding prose under a stripped heading.** An agent writes a long `Returns:` or `# Examples` section to stay under the cap. Countered by LEN-07's narrow vocabulary and by LEN-03 reporting the stripped lines beside the count.
10. **Writing a maintainer essay on an interface item.** The interface bucket is uncapped, so a doc essay on a `JsonSchema` or `Parser` item escapes LEN-02 and ships to users. ocx already has the 47-line `consent.rs` essay, whether or not it was written to escape. Countered by LEN-08.

## Decisions for the eval

- **The group defines one new arm, `capped`.** It is built mechanically in `build_arms.py` next to `oneline`: each over-cap block in a site file is truncated to its cap by raw length. It is built twice, at 5/10 (LEN caps) and at 3/6 (the human p90 caps rejected here on guard evidence).
  - `capped` tells us whether the caps are safe under a careless cut.
  - `rules` tells us whether they are safe under guard-shape compression.
  - If 3/6 passes non-inferiority, the caps can tighten. If 5/10 fails but `rules` passes, the caps are only safe behind the cleanup skill's rewrite.
- **The group sharpens the `rules` arm.** The agent writes it under frozen text:
  - LEN-01;
  - LEN-02, with the visibility tier;
  - LEN-05 and LEN-07;
  - guard-shape's content rule.

  There is no guard exemption, and guards are split to their risk sites.
- **Site properties this group needs:**
  - Whether the site's original block is over or within the cap, by register. Only over-cap sites differ between `original` and `capped`, so strata must cut at 1-2, 3-5, 6-10 and over 10 lines, not the planned 1-2, 3-10, over 10.
  - Where the consequence clause sits: before or after the cap line. Truncation keeps the first lines, and fleet guards often put the consequence last.
- **Confirm before MUST: applying LEN-01, LEN-02 and LEN-08 to legacy blocks.** This is the cleanup cutting existing guards to the cap. It ships as MUST only after `rules` (and ideally `capped` at 5/10) passes eval-scoring's paired non-inferiority test: 5-point margin, one-sided 90% CI, a reason-recovery floor, and at least 3 reps.
- **No eval needed:**
  - LEN-03 and LEN-04: holding the line deletes nothing.
  - LEN-07: it only changes how lines are counted.
  - LEN-08 for new and grown blocks.
  - LEN-06: a recogniser-precision question, not a reason-recovery one.
- **Cross-group change:** eval-scoring's tie-break "prefer the lower comment:code ratio" should use lines in over-cap blocks instead. That is the gated metric, and a ratio tie-break re-introduces the ratio as a target.

## Open questions

**Human decision (one-way doors only):**

- **Approve the cap numbers (5 / 10 / 15) and the visibility tier before the first publish.** Lore publishes on merge to main. Adopters then build baselines keyed to these caps, and a later change would re-key every adopter's baseline.
  - Known cost: 3 of 49 human doc guards exceed their tier (1 of 49 with LEN-07), and each takes a LEN-05 split.
  - Default: ship 5/10/15 with LEN-07. Library 20 is the documented override for adopters who decline LEN-07.

**Another research round:**

- **LEN-06 redesign, re-measured.** Pair removed and added blocks across the whole commit and against the post-image tree, tie exemptions to the removed block, and include 1-line blocks. Then replay again for the false-flag rate. Separately, measure recall on planted guard deletions: the 200-commit replay held none, so recall on real deletions is unknown.
- **Python module docstrings.** Human app module docstrings run past 10 lines at 12.7% (n=189), and library ones at 33.9% (n=59). Item docs run at 3-8%. Under LEN-02 they fall back to the package tier. Decide whether module docs need their own tier or belong to rendered-summary.

## Sub-artifacts

- [code-docs-ratchet/length-and-ratchet.md](code-docs-ratchet/length-and-ratchet.md) covers:
  - cap sweeps against the 39 human guards;
  - the six-month ocx replay of four metrics;
  - three planted diffs;
  - the ambient-matching analysis;
  - the arch-go, revive and PMD prior art;
  - the `lint_ratchet.py` design reuse.
- [code-docs-ratchet/doc-cap-calibration.md](code-docs-ratchet/doc-cap-calibration.md) covers:
  - doc-block length by visibility and with structured sections stripped;
  - 42 new human doc guards;
  - the fleet application of both designs;
  - ocx's interface blocks and their two leaks.
- [code-docs-ratchet/gate-replays.md](code-docs-ratchet/gate-replays.md) covers:
  - the LNK-06 replays, which belong to linkage;
  - the rebuilt recogniser's recall and precision;
  - the LEN-06 200-commit replay and hand-read verdicts on all 12 flags.

## Key sources

- [code-docs-ratchet/length-and-ratchet.md](code-docs-ratchet/length-and-ratchet.md): the sub-artifact, with sweeps, replay and planted diffs.
- [code-docs-ratchet/doc-cap-calibration.md](code-docs-ratchet/doc-cap-calibration.md): visibility and section splits, the 49-guard evidence, interface blocks.
- [code-docs-ratchet/gate-replays.md](code-docs-ratchet/gate-replays.md): the LEN-06 replay and recogniser re-measurement.
- `/home/mherwig/.cache/research-lang/code-docs-scratch/ratchet-revise/`: this revision's re-measurements. The scripts:
  - `refvis.py`: the corpus visibility split on prod lines;
  - `prodonly.py`: fleet LEN-07 and visibility on prod lines;
  - `testscope.py`: the `#[cfg(test)]` correction;
  - `narrow_vocab.py`: the vocabulary narrowing;
  - `iface_blocks.py`: interface blocks in uv, grimoire, ocx-mirror and ocx.
- `code-docs-audit/reference-corpus.md`: human bands, block p90s, and H3's +0.005 median shift.
- `code-docs-audit/human-sample.md` "How humans write guards": the 39 wave-1 guard lengths.
- `code-docs-audit/census.md` §2 and `code-docs-audit/sample.md` §4-5: fleet block distributions, the sweep list, and the 100 fleet guards.
- [code-docs-guards/guard-shape.md](code-docs-guards/guard-shape.md) §2 and §4: the 20 guard rewrites (fit the caps) and recogniser precision 0.714 / recall 0.432 (rebuilt: 0.594 / 0.429).
- `rules/code-docs/checks/comment_census.py`: the census functions.
  - `blocks_of()` splits at blank lines and groups only `doc` and `line`.
  - `--list-blocks` and `--min-block` list blocks by length.
- `/home/mherwig/dev/ocx/scripts/lint_ratchet.py:1-67`: absolute counts, per-file keys, the `--allow-regression` asymmetry and the truncation guard.
- `/home/mherwig/dev/ocx/crates/ocx_config/src/env.rs:1755-1935`: the 97-line doc that duplicates line-level guards.
- `/home/mherwig/.cache/research-lang/exemplars/code-docs/astral-sh__uv/crates/uv-cli/src/lib.rs:480`: a 41-line human interface block, deliberate user reference.
- [charlesjones.dev: Claude Code system prompt changes, 2026-07-24](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete): "match its comment density, naming, and idiom" (re-fetched and verified 2026-09-27).
- [PMD `CommentSize`](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html) and [pmd/pmd#1607](https://github.com/pmd/pmd/issues/1607): the one shipped block cap (6 lines) and its parameter-list false positives.
- [revive `comments-density`](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md): the nearest shipped ratio lint, a floor that is disabled by default.
- [clippy `undocumented_unsafe_blocks.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs): a marker check shipped together with its anti-inflation twin.
- [rust-clippy PR #12993](https://github.com/rust-lang/rust-clippy/pull/12993): the first-paragraph cap, a separate axis owned by rendered-summary.
- [schemars: deriving JsonSchema, attributes](https://graham.cool/schemars/deriving/attributes/): the whole doc comment becomes `description`, with no length limit.
- [Google Python Style Guide, docstrings](https://google.github.io/styleguide/pyguide.html): the `Args:`/`Returns:`/`Raises:`/`Yields:` vocabulary LEN-07 strips.
- [Software Engineering at Google, ch. 20](https://abseil.io/resources/swe-book/html/ch20.html): Tricorder's under-10% false-positive bar, and near zero for gating.
- [git-diff](https://git-scm.com/docs/git-diff) (`--color-moved=blocks`, `--diff-algorithm=histogram`) and [difflib](https://docs.python.org/3/library/difflib.html) (`SequenceMatcher`): the move-detection pieces LEN-06's redesign needs.
- `code-docs-routing/routing-table.md` (trampoline essay split): the carve-out proposal LEN-05 overrules.

## Revision log

2026-09-27, from doc-cap-calibration (DCC) and gate-replays (GR):

- **LEN-02 rule, visibility tier (DCC §1-2, re-measured here on prod lines).** The library tier of 15 now binds only public items. Non-public items get 10 in every package kind, and unplaced items keep their package tier. Why: human library public p90 is 20, non-public 9.
- **LEN-02 evidence and Verdict 1, zero-flag claim withdrawn (DCC §4-5).** The claim that the caps flag no human doc guard is gone. Now: 3 of 49 exceed their tier, and 1 of 49 with LEN-07.
- **LEN-02, longest library doc guard (DCC §5).** The longest human library doc guard is 12 lines, not 9. The 15-over-20 choice stands.
- **LEN-02, library-20 override (measured here).** An adopter declining LEN-07 should take it. Why: cap 15 flags 14.3% of human public library docs raw.
- **LEN-07 added, SHOULD (DCC §2, §5-6).** Signature-restating sections do not count toward a doc cap. The vocabulary is narrower than the dive's: it drops `# Safety`, `# Undefined behavior`, `# Implementation notes` and `Note:`. Why: those would buy length with a marker. The narrowing costs 1 block in ocx-sdk-python (measured here).
- **LEN-08 added, MUST once `blocks_of()` groups interface lines (DCC §8-9, plus a human calibration on uv measured here).** Interface blocks count toward LEN-02. uv has 5.9% of its interface blocks past 10 lines, against 13.7% for ocx.
- **LEN-06 rule text (GR §7-8).** "Fail a diff" became "list for review", and "must add" became "should add". Why: the replay flagged 12 blocks over 200 commits, and none was a real loss.
- **LEN-06 severity (GR §8-9).** The old criterion, "MUST once a false-positive rate is measured", is replaced. Now: no CI until a redesigned check measures under 10% false flags, and MUST only near zero. The measured rate was 12 of 12.
- **LEN-06 limits (GR §4-6).** The rebuilt recogniser's precision (0.594) and recall (0.429) are added beside guard-shape's 0.714 and 0.432.
- **LEN-06 evidence (GR §8).** The 12-flag breakdown follows the dive's table: 2 pairing artifacts, 7 surviving-fact consolidations or rewrites, and 3 recogniser misses. The dive's summary said 1, 6 and 3, which does not add up to 12.
- **LEN-06 verification (GR §7, §9, and a code read of `guard_removal.py:117-139`).** Whole-commit and post-image pairing, per-block exemptions and 1-line blocks are now required.
- **LEN-03 rule and verification (DCC §2, §8).** The report shows LEN-07's stripped lines, and the ocx baseline notes LEN-08's additional 3,252 lines.
- **Verdict 3 (GR §7-8).** "Deletion is never the cheaper way" became "never more credit; the same credit for less work". Why: no mechanical backstop exists.
- **Verdict 6 (GR §5; DCC).** The recogniser's coverage is now stated as 43%, not "about half", and LEN-07's never-stripped headings are added.
- **Verdict 7 (GR §7-9).** The carve-out is a review list, not a gate.
- **Verdict 9 added (GR §7-8 and planted case A).** Documented gap: nothing mechanical stops a guard deletion, and LEN-06's recall on real deletions is unmeasured.
- **Verdict 10 added (DCC §6, §8).** Summarises LEN-07 and LEN-08.
- **Applied to the fleet (measured here).** DCC §6-7's ocx figures included `#[cfg(test)]` regions: 718 blocks and 10,779 lines. They are restated on prod lines as 1,844 blocks and 38,642 lines. The non-public-or-unplaced share falls from 65.0% to 55.3%. DCC's reference-corpus percentiles are unaffected.
- **Failure modes (GR; DCC §8).** Mode 3 now records the gap. Modes 9 (hiding prose under a stripped heading) and 10 (an essay on an interface item) are added.
- **Decisions for the eval.** The `rules` arm is frozen under the visibility tier and LEN-07, and `capped` truncates by raw length. LEN-08 joins the legacy-cut MUST gate. LEN-07 and new-block LEN-08 need no eval.
- **Open questions (DCC; GR).** Four answered questions are removed: library cap and sections, doc-guard evidence, interface blocks, and the LEN-06 replay. Two are added: the LEN-06 redesign re-measure and the Python module docstring tier. The cap-approval default now names the known guard cost.
- **Out of this group (GR §1-3, §6).** gate-replays' LNK-06 findings are routed to code-docs-linkage, and its recogniser-precision finding to GRD-06.
- **Frontmatter.** The consolidates list now includes both follow-ups, with `revised: 2026-09-27`.
