# code-docs held-out round: check behavior on 4 untouched repos

Repos (read-only clones, `/usr/bin/git clone --no-local` into
`~/.cache/research-lang/code-docs-heldout/<repo>`): `bob` (Rust, 11 `.rs`
files), `obere-heide-planer` (TS/Astro, 73 `.ts` + 10 `.astro`),
`kate-middlechild` (TS/Astro, 22 `.tsx` + 22 `.ts` + 8 `.astro`),
`ocx-mirror-sdk` (Python, 34 `.py`, a published PyPI SDK). None of the four
had a `.code-docs.json` or `.code-docs-linkage-config.json` — every run used
shipped defaults, as a first-time adopter would see them.

`--self-test`: all five checks pass (`comment_census` 4/4 fixtures,
`linkage_check` ok, `interface_leak` ok, `guard_recogniser` TP=43 FP=23 FN=57
TN=197 precision=0.652 recall=0.430, `cleanup_check` 28/28).

## Per-repo findings

| Check | bob | obere-heide-planer | kate-middlechild | ocx-mirror-sdk | total |
|---|---:|---:|---:|---:|---:|
| `comment_census --over-cap` | 17 | 28 | 23 | 5 | 73 |
| `linkage_check ids` (bare-id + short-label) | 6 | 12 | 14 | 0 | 32 |
| `linkage_check ids --discover` | 0 undecided | 0 undecided | 0 undecided | 0 undecided | 0 |
| `linkage_check pointers` | 0 | 0 | 0 | 0 | 0 |
| `interface_leak --source` (`--published` also run on ocx-mirror-sdk) | 0 | 0 | 0 | 0 | 0 |
| `guard_recogniser --root` (tree-wide carve-out flags) | 34 | 61 | 12 | 6 | 113 |
| ∩ of the above with `--over-cap` blocks (same file:line) | 9/17 | 9/28 | 6/23 | 0/5 | 24/73 |

`linkage_check.py records` was run once, illustratively, on bob only (not
part of the required matrix): `{"records": 0}` against a repo whose source
cites `AGENTS.md` 7 times and `docs/design/decisions.md` (a real D1–D14
decision log) — see LNK-06 gap below.

## Samples labelled

**comment_census `--over-cap`** — 18 of 73 read against source, spread over
all 4 repos and 13 files. Block boundaries and line counts were correct in
all 18 (no wrong-span cases). Whether the *cap tier applied* was deserved:

| Verdict | Count | Why |
|---|---:|---|
| TP — genuinely over its deserved cap | 9 | bob `bob_cas/lib.rs:102,151,232`, `bob_cli/main.rs:1`, `bob_engine/lib.rs:281`; kate-middlechild `dietary.ts:53`, `map.ts:1`, `FilterChip.tsx:1`; obere-heide `geo.ts:11` |
| FP — plain cap applied to a TS/JS `//` module header that functions as a module doc | 4 | obere-heide `schema.ts:1` (23 vs cap 5), `catalog/index.ts:1` (12 vs 5), `hooks.ts:1` (10 vs 5), `menu.ts:1` (6 vs 5) |
| FP — app-kind cap applied to a whole-repo published library with no `.code-docs.json` | 5 | ocx-mirror-sdk `cache.py:4`, `github/_rest.py:4`, `gitlab/_auth.py:4`, `gitlab/_auth.py:27`, `gitlab/_rest.py:4` |

Mechanical precision (span/count correctness): 18/18. Tier-assignment
precision (is the *applied* cap the right one): 9/18 (50%).

**`linkage_check ids` (LNK-13 short label)** — full population, 32/32 read.
6 TP, 26 FP. Precision 6/32 ≈ 19%.
- TP (6): bob `bob_cli/main.rs:105`, `bob_engine/lib.rs:343`,
  `bob_engine/tests/incremental.rs:507`, `bob_expander_script/{api.rs:3,
  lib.rs:5}` citing bare `D1`/`D3`/`D8` — bob really does run a `D1`…`D14`
  decision log (`docs/design/decisions.md`) and these are legitimate
  citation-hygiene hits (should be `decisions.md#d1`, not bare `D1`).
- FP (26): obere-heide-planer 12/12 — every hit (`J7`, `S8`, `K2`, `U7`,
  `S1`, `P1`, `K1`, `J5`, `Z1` in `tests/e2e/*.spec.ts`,
  `tests/unit/*.test.ts`) is a map-fixture/grid-coordinate label
  (`clickMap(page, 700, 300); // J7, shaft with splice box`), never a
  decision-record reference. kate-middlechild 14/14 — 13 are `R3`, an
  undefined dietary-risk shorthand used 12× in `dietary.ts`/`fixtures.ts`
  with no `R3:`-prefixed definition anywhere in the repo (the check's
  wording "cited outside the block that defines it" is misleading here,
  since no defining block exists at all), and 1 is `H3` in
  `RecipeCard.tsx:8`, which is an HTML heading level
  (`- H3 dish name (Newsreader 24px/500)`), not a label.
- 0 bare-id (LNK-01) findings anywhere; independently confirmed with a raw
  `grep -nE '(^|[^A-Za-z0-9_-])(C-[0-9]|S-[0-9]|WP-[0-9]|DEC-[0-9]|DX-[0-9]|RUL-[0-9]|A-[0-9]|D-[0-9]|ADR-[0-9])'`
  across all 4 repos — 0 hits, matching the tool (true negative, not a miss).

**`linkage_check pointers`** — 0 findings on all 4 repos. Verified this is
real (not a miss): kate-middlechild source cites `subsystem-tooling.md`,
`subsystem-web.md` (matching the `subsystem` record stem) from
`.claude/tests/config-parity.test.ts`, `LanguagePicker.tsx:9`; both files
exist under `.claude/rules/`, so they correctly resolve and produce no
finding. No repo in the set uses the pointer form (`path.md#anchor`) for a
genuine ADR/decision citation, so LNK-02/03/07 got no positive exercise here.

**`interface_leak`** — 0 findings, `--source`, `--published` (ocx-mirror-sdk)
and plain `--source` on the other three. Confirmed by construction, not a
miss: none of the 4 repos uses clap, schemars, argparse, click, typer,
pydantic or commander (`grep -rlE` for all of them across all 4 repos: 0
hits). SRF-01/SRF-03/LEN-08 got no real exercise in this held-out set.

**`guard_recogniser`** — 113 tree-wide flags; 24 coincide with an over-cap
block. Read ~10 flagged blocks in bob plus 5 direct sentence probes against
kate-middlechild's `dietary.ts:53` doc block (a 20-line "Rule matrix" of
diet-derivation rules): every individual rule-matrix line
(`"vegan = no meat, no seafood, no dairy"`) came back `quiet` (correctly not
guard-shaped), while the one real prohibition sentence in the same block
(`"...must be documented (never silently set in content)."`) came back
`FIRE prohibition+consequence`. No false positive found in this sample;
behavior is consistent with the shipped self-test numbers. No new failure
class identified for this check beyond its documented ~43% recall.

**`cleanup_check`** — dedicated test on bob (only clone used for this, per
task instructions): two comment-only commits on top of `14817b4`.
1. `4b142d1` — shortened `crates/bob_cas/src/lib.rs`'s `put()` trust-the-path
   guard (base lines 151–160, 10 lines) to 4 lines, keeping the constraint,
   the consequence and the `ponytail:` marker.
2. `fff5ed5` — deleted the two hazard paragraphs (EXDEV, fsync-fatal) from
   `write_durable`'s doc comment (base lines 102–112), keeping only its
   first sentence.

`cleanup_check.py --base <parent>` result for commit 2 was correct: `CLN-02
review: guard block (base lines 102-112) was shortened and its
recogniser-firing sentences fell from 1 to 0` — right file, right lines,
right verdict. Commit 1's result was **wrong**: same message, same
"base lines 102-112", same "fell from 1 to 0" — but `write_durable` (lines
102–112) is byte-identical between `14817b4` and `4b142d1` (verified with
`git show 4b142d1:... | sed -n '100,113p'`); the actual edit was 40+ lines
away, in `put()`. The tool fabricated a shortening finding for an untouched
block and never mentioned the block that really shrank. Reproduced cleanly:
single file, single hunk, single commit — see the two commits above.

## Failure classes

1. **LNK-13 short-label regex collides with ordinary alphanumeric domain
   vocabulary.** `SHORT_RE = r"\b[A-Z]\d{1,2}[a-z]?\b"` matches map/grid
   coordinates, test-fixture IDs and HTML heading levels as readily as ADR
   labels. Instance: `obere-heide-planer/tests/e2e/edit.spec.ts:78`
   (`// J7, shaft with splice box`), check `linkage_check.py ids`. 26/32
   (81%) of this check's findings in the sample are this class. At fault:
   the check (regex too broad) and the rule text (no allow-list mechanism
   for LNK-13 the way `non_ids` exists for LNK-01/LNK-14). Fix: give LNK-13
   a config allow-list, or require ≥2 hits of the *same* label across
   *different* files before flagging (single-file coordinate labels like
   `J7` never collide by definition).

2. **TS/JS module-header prose written as `//` gets the plain cap (5) instead
   of a doc cap (10/15), because classification is syntax-only (`/**` = doc,
   `//` = plain) and TS/JS has no dedicated module-doc marker.** Instance:
   `obere-heide-planer/src/catalog/schema.ts:1`, 23 lines flagged
   `LEN-01 ... over the cap of 5` (4.6× the cap) for content that would sit
   fine under LEN-02's 10-line doc cap. Check: `comment_census.py`. At fault:
   rule text (length.md never tells a TS/JS adopter that a top-of-file `//`
   block is judged as a *plain* comment, so the idiom used by 4 of 4 sampled
   module headers in this repo produces disproportionate over-cap
   magnitudes). Fix: note in length.md that a module-level explanation in
   TS/JS needs `/**` to get doc-tier, or have the census recognize a
   file-initial `//` block preceding the first import/statement as a module
   doc.

3. **Library-kind is manual-only with no heuristic assist, so a whole-repo
   published package silently gets the app-kind (10-line) cap instead of the
   library cap (15) until an adopter writes `.code-docs.json`.** Instance:
   `ocx-mirror-sdk/src/ocx_mirror_sdk/cache.py:4`, a 25-line module docstring
   flagged against cap 10; the package is a PyPI SDK by its own
   `pyproject.toml` description, single-package repo. Check:
   `comment_census.py`. At fault: rule text (adopting section never prompts
   "is this whole repo a library?", unlike the explicit publish/private
   check the rule's own prose describes). Fix: have the adopting walkthrough
   check `pyproject.toml`/`package.json`/`Cargo.toml` for publish signals and
   suggest a `.code-docs.json` before the first baseline.

4. **LNK-06's default `records` globs are `.claude/`- and `docs/adr`-shaped
   only, so a repo with a real decision log elsewhere gets a silent, false
   "clean" result.** Instance: bob's `docs/design/decisions.md` (D1–D14,
   actively cited from 5+ source files) and root `AGENTS.md` (cited 7
   times) match none of the default globs;
   `linkage_check.py records --base <root-commit>` returns
   `{"records": 0}` — zero records tracked, zero protection, no warning.
   Check: `linkage_check.py records`. At fault: rule text (default globs).
   Fix: warn on a `records: 0` result ("0 protected records found — check
   your `records` glob against this repo's actual decision-log location")
   instead of exiting 0 silently.

5. **`cleanup_check.py` CLN-02 misattributes which comment block changed
   when a file holds multiple thematically similar guard-shaped blocks.**
   Instance: `bob/crates/bob_cas/src/lib.rs`, commit `4b142d1` (shortens
   `put()`'s guard at base lines 151–160) is reported as
   `guard block (base lines 102-112) was shortened ... fell from 1 to 0` —
   lines 102–112 are `write_durable`'s doc comment, unmodified by that
   commit. Reproduced with a single-file, single-hunk diff. Likely
   mechanism: `align()`'s top-level line diff
   (`SequenceMatcher(None, pre.raw, post.raw).get_opcodes()`, line ~242)
   omits `autojunk=False`, unlike every other `SequenceMatcher` call in the
   same file; `write_durable` and `put()`'s comments share enough
   vocabulary ("torn write", "rewrite", "lost update"/crash-safety) that a
   misaligned or oversized opcode plausibly pairs the wrong block. A
   two-block, 11-line synthetic repro did not reproduce it; a 372-line
   padded repro with 60 unrelated helper functions also did not — so the
   trigger needs the real file's density of similar-vocabulary guard blocks,
   not merely file size. At fault: the check (implementation bug). Fix: add
   `autojunk=False` to the line-1 `SequenceMatcher` call and re-run the
   reproduction above as a regression fixture; if it persists, the
   block-to-opcode association (`op_blocks`/`ops = {d.op_of_pre[i] ...}`)
   needs a tie-break that prefers the block whose own tokens actually sit
   inside the changed opcode range.

6. **LNK-13's message wording assumes a definition exists elsewhere, even
   when it doesn't.** Instance: `kate-middlechild/packages/core/src/dietary.ts:7`,
   message `short label R3 cited outside the block that defines it` — `R3`
   has no defining comment anywhere in the repo (`grep -rn "R3"` across the
   package: every hit is a parenthetical citation, never `R3:` at a line
   start). Check: `linkage_check.py ids`. At fault: the check (message
   text). Fix: distinguish "defined once, cited elsewhere" from "never
   defined in this repo" in the message.

7. **`.astro` files (and by extension other framework single-file-component
   formats) are entirely outside both the rule's `paths:` frontmatter and
   `comment_census.py`'s `EXT_LANG`, so real over-cap blocks in them are
   never seen by any of the five checks.** Instance:
   `kate-middlechild/packages/web/src/components/TopBar.astro:2`, a 20-line
   `/** */` doc block (app-kind cap 10) that would be a LEN-02 finding if
   scanned; `obere-heide-planer/src/pages/planner.astro:2` also carries a
   real module-header comment. 2 of the 4 held-out repos are Astro apps (10
   and 8 `.astro` files respectively) with zero coverage. At fault: both the
   rule text (`rules/code-docs.md` `paths:` list) and the check (`EXT_LANG`
   dict in `comment_census.py`, and presumably the same gap in
   `linkage_check.py`/`guard_recogniser.py`, which share the same file
   classifier). Fix: add `**/*.astro`, `**/*.vue`, `**/*.svelte` to `paths:`
   and teach the classifier to treat the frontmatter fence (`---`-delimited
   in Astro) as embedded TS.

8. **Whole rule families got zero real exercise on this held-out set, which
   a bare "0 findings" table doesn't distinguish from "verified clean."**
   `interface_leak` (SRF-01/03), LNK-01 (bare banned IDs), and LNK-02/03/07
   (pointer resolution) all reported 0 findings on all 4 repos because none
   of the repos ships a clap/schemars/argparse/click/typer/pydantic/
   commander surface, carries a banned-family ID, or uses the pointer form
   at all — confirmed independently by grep, not a check defect. Not a bug,
   but worth flagging: this held-out round validates comment_census/LNK-13/
   cleanup_check far more than it validates interface_leak or LNK-01/02.
