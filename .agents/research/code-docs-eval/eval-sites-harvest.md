---
title: "code-docs eval: site list harvest (EVL-02, EVL-09, EVL-10)"
topic: eval
agent: eval-site-harvest
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 3
scope: >
  Fills every field EVL-02 requires for the 40 mechanism sites in
  code-docs-audit/eval-sites.md, harvests 6 new over-10-line non-Rust guards
  and 8 fleet controls per EVL-09/EVL-10, validates the result against
  rules/code-docs/checks/comment_census.py, and writes the harness's
  sites.json.
---

# code-docs eval: site list harvest

Fleet paths are `repo:path:line` under `/home/mherwig/dev`. All measurements
are against each repo's `HEAD` read with `/usr/bin/git show HEAD:<path>`, not
the (dirty, in three repos) working tree. Repo HEADs measured 2026-09-27:
ocx `2691d3c16`, grimoire `7dc3d6b8`, ocx-sdk-python `9713f0a`, ocx-indexbot
`870034b`, grimoire-indexer `fd62461`, grimoire-vscode `b4f7ca3`, ocx-catalog
`a16be21`.

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- **Output produced**: 54 sites total in `code-docs-eval/harness/sites.json` — the 40 original mechanism sites from `eval-sites.md` with every EVL-02 field filled from live `HEAD`, 6 new over-10-line non-Rust guards, and 8 stratum-C controls. Every field the commission asked for is present on every site (checked programmatically, zero missing).
- **The source lines in `eval-sites.md` had drifted.** `ocx:crates/ocx_config/src/env.rs` grew ~130 lines around `is_ocx_trampoline`/`trampoline_signal` since the original harvest (new "Item 37" / "WP-12e" validation-row prose). Re-reading `HEAD` was not optional busywork — several of the file's own `line_start`/`line_end` pairs no longer point at the described code.
- **Comment span vs. function span, made precise.** `comment_start`/`comment_end` is now the exact `comment_census.py --list-blocks` block that carries the reason, not a hand-picked sub-paragraph and not the function span EVL-02 warned `eval-sites.md`'s own JSON conflates (`OCX-02` used to be recorded as `1774-1902`, the whole function).
- **Central finding — eval.md's own over-10-line count is wrong by re-measurement.** eval.md claims "with OCX-02 and OCX-17 that makes 8 of 25 (32%) over 10 lines." Measured against `comment_census.py`'s actual block boundaries: **OCX-17's comment block is 4 lines** (`ocx:crates/ocx_oci/src/endpoint.rs:488-491`), nowhere near 10; **OCX-02's comment block genuinely is 97 lines** (`488-491` is a different, later block — OCX-02's own block is `1755-1851`) but that is not what `eval-sites.md`'s "Reason lines" column recorded for it (`1774-1793`, 20 lines, itself wrong). Neither number in the prior claim survives contact with the tool that is supposed to measure it. See [Finding 1](#finding-1).
- **Once measured correctly, the quarter-over-10 threshold (EVL-09) passes anyway, for different reasons than claimed.** 15 of 45 stratum-A/B non-`reason_in_code` sites exceed 10 comment lines (33.3%), comfortably over the 25% floor — but the winning sites are `OCX-02`, `OCX-08`, `OCX-20`, `OCX-23`, `OCX-24`, `GRM-03`, `GRM-05`, `GRM-06`, `PY-01` (re-measured from the original 40) plus all 6 new harvest sites, not `OCX-02`+`OCX-17` as claimed.
- **All 6 named new-harvest candidates hold up; none needed replacing.** `ocx-sdk-python:_bootstrap.py:431`, `_dist.py:614`, `_process.py:165`, `ocx-catalog:sources/types.ts:231`, `viewmodel/catalog.ts:171`, `theme/composables/usePackageRoot.ts:74` are all real guards (concrete breaking edit named, concrete consequence, existing test) whose comment blocks are 12-24 lines by `comment_census.py`'s own count. See [Finding 2](#finding-2).
- **8 controls harvested and proven safe, not asserted safe.** Each control's `safe_edit` was applied in a scratch copy and the repo's own relevant tests run: `vitest` (30/30), `cargo test` (3+10/13 across two Rust sites), `pytest` (586/586, covering 5 controls in one file). Commands and pass lines are in [Finding 3](#finding-3). None of the 8 controls' safe edits touch the comment — every one is a real code change, so the EVL-10 verification (`'comment' not in safe_edit`) is not a technicality.
- **The `eval-sites.md`/`eval-arms-and-sites.md` C-01..C-08 stopgap controls are superseded, not supplemented.** EVL-10 explicitly treats the human-repo stopgap as inferior (wrong density regime, "delete the comment" as the proposed edit). This harvest's 8 controls replace them; see [Decisions](#decisions-this-dive-proposes).
- **`extra_comment_spans` earns its keep on 3 sites that share one physical rustdoc block with a sibling site**: `OCX-14`/`OCX-15` both cite bullets inside `ocx:crates/ocx_project/src/mutate.rs`'s one `publish_by_rename` essay; `OCX-16`'s nearest comment (`resolve_flag_over_env`'s own doc) restates a table already given in `Verify::resolve`'s doc; `GRM-04`'s nearest comment is a 2-line inline note, with the five-step contract stated fully in the module doc. Each site's *primary* span is the block nearest its own anchor, so blanking one site's comment for its own arm build never touches a sibling's reason.
- **PY-02 stays stratum X** (`reason_in_code: true`): its raised `DistManifestError` message states "path traversal, CWE-22" and "refused even though the SDK never writes an archive name to disk" verbatim in the code an agent would read even with the comment gone — this matches eval.md's own reason for pulling it from the pooled statistic, re-confirmed by re-reading the live function.
- **Validation is green on all four EVL checks this commission named**: EVL-02's site-shape check, EVL-09's quarter-over-10 check, and my own comment-span/anchor classification check against every one of the 54 sites' live `HEAD` content (not a cached snapshot). Full commands and output in [Finding 4](#finding-4).
- **Distribution**: 12 stratum A, 33 stratum B, 8 stratum C (controls), 1 stratum X (PY-02). 34 Rust, 12 Python, 8 TypeScript sites. 30 `doc`-register, 24 `plain`-register comments.
- **Three CWE citations in the ground-truth/consequence fields were checked against the authoritative MITRE definitions** (CWE-22, CWE-345, CWE-426), not just carried over from the prior harvest's inline mentions — see [Sources](#sources).

## Findings

### Finding 1 — eval.md's "8 of 25 (32%) over 10 lines" claim does not survive re-measurement

`code-docs-eval.md`'s Sites section states (quoting the consolidation, not this document):

> "... with OCX-02 and OCX-17 that makes 8 of 25 (32%) over 10 lines."

Re-measured against the live files with the authoritative block detector:

```
CENSUS=rules/code-docs/checks/comment_census.py
DEST=/home/mherwig/.cache/research-lang/code-docs-scratch/eval-harvest/verify-ocx17
mkdir -p "$DEST" && \
  /usr/bin/git -C /home/mherwig/dev/ocx archive HEAD -- crates/ocx_oci/src/endpoint.rs \
    | tar -x -C "$DEST"
python3 -B "$CENSUS" --root "$DEST" --list-blocks --min-block 1 --format json
```

Output (filtered to the relevant range, `line`, `line+len-1`, `len`, `kind`):

```
460 463 4 doc
471 478 8 doc
480 485 6 line
488 491 4 line
```

`OCX-17`'s comment (the "Spelled out rather than wildcarded" reason on the exhaustive `SsrfError` match) is the last block: **488-491, 4 lines**. It was never within reach of "over 10," under any block boundary in the file — the closest larger block (471-478, 8 lines) is a different, unrelated doc comment on the enclosing `impl`, and even that is 8, not over 10.

For the same file family, `OCX-02` (`crates/ocx_config/src/env.rs`) does have a genuinely long block, but not the one `eval-sites.md`'s own "Reason lines" column names (`1774-1793`, 20 lines by hand-count, itself already wrong):

```
python3 -B "$CENSUS" --root "$DEST" --list-blocks --min-block 1 --format json
# (DEST is an archive of crates/ocx_config/src/env.rs; output filtered to 1740-1930):
1743 1752 10 doc
1755 1851 97 doc   <- OCX-02's actual, single, block
1856 1861  6 doc
1866 1868  3 line  <- OCX-01's block (separate, no overlap)
1883 1897 15 line
1904 1909  6 doc   <- OCX-03's block (separate, no overlap)
```

OCX-02's real comment block is **1755-1851, 97 lines** — the whole `is_ocx_trampoline`/`trampoline_signal` rustdoc essay, not the 10-line "Fails open" subsection I initially (and, apparently, `eval-sites.md`, differently) picked out of it. It does not collide with OCX-01's or OCX-03's blocks in the same file (both are separate, later, `//` comments), so no `extra_comment_spans` split is needed here — unlike `OCX-14`/`OCX-15`, `OCX-16`, and `GRM-04`, which do share a block with a named sibling site (see Summary).

Net effect: the *conclusion* eval.md draws from this number ("8 of 25 over 10 lines, quarter-threshold satisfied") happens to still hold once the new harvest sites are added (see Finding 2 and the [EVL-09 output](#finding-4)), but the two cited sites supporting it were the wrong two, and the arithmetic behind the claim (`eval-sites.md`'s own hand-counted "Reason lines" ranges) does not match `comment_census.py`, the very tool the eval's own MUST-severity checks (EVL-02, EVL-09) require using. This is a concrete instance of the class of error EVL-02 exists to prevent: **a line range recorded by hand, not measured by the tool that will gate the eval, silently disagrees with the tool.**

I re-measured all 40 original sites this way (not just these two); the full corrected `comment_start`/`comment_end` pairs are in `sites.json`. Eight more of the 40 turned out to carry genuine >10-line blocks: `OCX-08` (`fs.rs:114-133`, 20 lines), `OCX-20` (`insecure.rs:21-94`, 74 lines), `OCX-23` (`path.rs:158-183`, 26 lines), `OCX-24` (`shim.rs:165-196`, 32 lines), `GRM-03` (`path_anchor.rs:612-626`, 15 lines), `GRM-05` (`atomic_write.rs:70-81`, 12 lines), `PY-01` (`_bootstrap.py:683-694`, 12 lines) — each of those seven only emerged once I stopped hand-trimming to a "reason paragraph" and used the tool's own block boundary instead — plus `GRM-06` (`advisory_lock.rs:150-163`, 14 lines), which was already correctly full-block from a first read. None of these eight were counted as "over 10" in any prior document.

### Finding 2 — all 6 named new-harvest candidates verify as real guards; none needed replacing

Per-site verification (breaking edit named, consequence concrete, comment block measured with `comment_census.py --list-blocks`, test located):

| id | site | block (lines) | test |
|---|---|---|---|
| PY-05 | `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:431` `_which` | 431-452 (22) | `test_which_refuses_a_shared_directory`, `test_which_excludes_the_working_directory_on_windows`, `test_which_excludes_a_relative_entry_naming_the_working_directory` (`tests/unit/test_bootstrap.py`) |
| PY-06 | `ocx-sdk-python:src/ocx_sdk/_dist.py:614` `_expected_digest` | 614-637 (24) | `test_sha256_required_off_canonical`, `test_sha256_required_when_mirrored`, `test_snapshot_url_pins_itself_off_canonical` (`tests/unit/test_dist.py`) |
| PY-07 | `ocx-sdk-python:src/ocx_sdk/_process.py:165` `compose_argv` | 165-186 (22) | `test_compose_argv_puts_global_flags_before_the_command` (`tests/unit/test_process.py:312`) |
| TS-05 | `ocx-catalog:src/sources/types.ts:231` `ROOT_ALIAS_BASENAME`/`packageRootAliasPath` | 231-250 (20) | `seo_real_build.test.ts` (asserts the `/_root.json` preload link); `usePackageRoot.test.ts` "fetches the ad-blocker-safe alias, never the canonical \<pkg\>.json url" |
| TS-06 | `ocx-catalog:src/viewmodel/catalog.ts:171` `wirePrefix` | 171-190 (20) | `detail_page_wire_base_wiring.test.ts` "identity comes from frontmatter, never from splitting the route", "a root:true source page (no wireBase in frontmatter) still fetches the site root" |
| TS-07 | `ocx-catalog:src/theme/composables/usePackageRoot.ts:74` `usePackageRoot` (re-fetch-on-nav guard) | 74-92 (19) | `usePackageRoot.test.ts` "a route change re-fetches for the new ns/pkg" |

Every block length above was read from `comment_census.py --list-blocks`'s own `len` field (not hand-counted), matching the independent `len` values `code-docs-audit/sample.md` §5 already recorded for the first three (22, 24, 22 respectively) and for `TS-05`/`TS-06` (20, 20) — cross-validated from two different runs of the same tool.

Plausible breaking edits I verified against the actual code (not just paraphrased from the doc comment):
- **PY-05** (`_which`): `candidate = Path(found).resolve()` then `_trusted_location(candidate.parent, ...)` — replacing this scan with stdlib `shutil.which(name, path=search_path)` reinstates CWE-426 (cwd-ahead-of-PATH on Windows).
- **PY-06** (`_expected_digest`): `derived = snapshot.group(1) if snapshot is not None else None` (digest parsed from the URL string, before any request) — trusting a successful fetch as proof of authenticity instead lets an unpinned mirror serve unpinned content (CWE-345).
- **PY-07** (`compose_argv`): `return (exe, *global_flags, *command, *positionals)` — reordering `global_flags` after `command` breaks ocx's clap grammar, confirmed by the test name itself.
- **TS-05** (`packageRootAliasPath`): the alias filename `_root.json` exists specifically so the wire root's fetch doesn't end in `<pkg>.json`, which EasyList/EasyPrivacy's unanchored `/<word>.js` rules block (observed on `ocx.sh/hawkeye/hawkeye`, named in the comment).
- **TS-06** (`wirePrefix`): `return wireBase === "" ? "" : \`/${wireBase}\`` — inlining `/p/...` at call sites instead of routing through this function silently 404s a non-root source's `logoUrl`/`readmeUrl`.
- **TS-07** (`usePackageRoot`'s `watch`): `watch(() => [toValue(ns), toValue(pkg), toValue(wireBase)] as const, ...)` — replacing the reactive watch with a one-shot `onMounted` fetch leaves the previous package's data on screen after a client-side route nav (a Vue/VitePress component-reuse hazard, not merely a style choice).

### Finding 3 — 8 controls, each proven safe by a green test run in a scratch copy

Per EVL-10, "safe" is not asserted; it is demonstrated. All 8 `safe_edit`s were applied in scratch copies at `/home/mherwig/.cache/research-lang/code-docs-scratch/eval-harvest/` (deleted after this run; commands are reproducible from `sites.json`'s `safe_edit` field plus `git -C <repo> archive HEAD | tar -x`), and each repo's relevant tests were run against the edited copy:

**CTRL-01** — `ocx-catalog:src/theme/utils/version.ts:171` (`// Major`, inside `compareVersions`). Safe edit: `if (a.major !== b.major) return -(b.major - a.major)` (algebraically identical to the original for every real-number pair, not just sign-preserving).
```
npx vitest run test/theme/utils/version.test.ts
```
```
 Test Files  1 passed (1)
      Tests  30 passed (30)
```

**CTRL-02** — `grimoire:src/resolve/resolver.rs:193` (`// Re-pin the named path-sourced entries (re-pack + re-hash).`, inside `resolve_lock_partial`). Safe edit: split the one-line `resolved.extend(resolve_path_entries(...).await?)` into a named `let re_pinned = ...; resolved.extend(re_pinned);`.
```
cargo test --bin grim -- resolve::resolver::tests::partial --test-threads 4
```
```
test resolve::resolver::tests::partial_stale_hash_gate_fires_before_any_access ... ok
test resolve::resolver::tests::partial_rejects_undeclared_name ... ok
test resolve::resolver::tests::partial_carries_forward_unselected_entries ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 3031 filtered out
```

**CTRL-08** — `grimoire:src/oci/digest.rs:137` (`Digest::to_short_string`'s doc). Safe edit: bind `let short = &hex[..DIGEST_SHORT_LEN];` then `format!("{alg}:{short}")` (inline captured identifiers instead of positional `{}`).
```
cargo test --bin grim -- oci::digest::tests --test-threads 4
```
```
test oci::digest::tests::hex_and_short_hex_accessors ... ok
(10 tests total)
test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 3035 filtered out
```

**CTRL-03..07** — `ocx-sdk-python:src/ocx_sdk/_results.py`, five near-identical tautological docstrings ("Build from one decoded X entry") on `Candidate.from_dict` (775), `PackageBinding.from_dict` (909), `Integration.from_dict` (936), `Advisory.from_dict` (970), `InstalledPackage.from_dict` (1197) — the exact repeated-tautology pattern `code-docs-audit/sample.md` Smell #4 already named ("~10 `from_dict`/`from_json` classmethods each carrying a one-line docstring that says only 'Build from one decoded X'"). Each safe edit extracts the `_need(...)`-validated fields into a local dict, then calls `cls(**fields)` — identical validation order, identical resulting object, one fewer positional-vs-keyword footgun. All 5 applied together in one scratch copy:
```
uv run --extra dev pytest tests/unit/test_results.py -q
```
```
586 passed in 0.51s
```

None of the 8 `safe_edit` strings contain the word "comment" (mechanically checked, see Finding 4) — every one is a structural code change (statement split, dict extraction, format-string modernization, or an algebraically-identical rewrite), matching EVL-10's requirement that the probe's 2b question have a real code edit to ask about, not "delete the comment."

### Finding 4 — validation, run against live HEAD content, all green

Per commission point 4, using `rules/code-docs/checks/comment_census.py`'s own `classify`:

```
SITES=.agents/research/code-docs-eval/harness/sites.json

# EVL-02 shape check: required keys present, comment_start<=comment_end,
# every anchor classifies as code/blank
python3 -B -c "import json,sys,pathlib; sys.path.insert(0,'rules/code-docs/checks'); \
import comment_census as cc; S=json.load(open(sys.argv[1])); \
need={'id','repo','file','function','comment_start','comment_end','anchor','ground_truth','consequence','breaking_edit'}; \
bad=[s.get('id') for s in S if not need<=s.keys() or s['comment_start']>s['comment_end'] \
  or any(l.kind not in ('code', 'blank') for l in cc.classify('x',s['anchor'],cc.EXT_LANG[pathlib.Path(s['file']).suffix]))]; \
print('bad:',bad); sys.exit(bool(bad))" "$SITES"
```
```
bad: []
```
(exit 0)

```
# EVL-09 quarter-over-10 check
python3 -B -c "import json,sys; S=[s for s in json.load(open(sys.argv[1])) if s['stratum'] in ('A','B') and not s.get('reason_in_code')]; \
n=sum(s['comment_end']-s['comment_start']+1>10 for s in S); print(n, len(S)); \
sys.exit(n*4<len(S) or len(S)<20)" "$SITES"
```
```
15 45
```
(exit 0 — 15/45 = 33.3%, over the 25% floor and over the 20-site floor)

```
# EVL-10 controls check
python3 -B -c "import json,sys; C=[s for s in json.load(open(sys.argv[1])) if s['stratum']=='C']; \
bad=[s['id'] for s in C if not s.get('safe_edit') or 'comment' in s.get('safe_edit','')]; \
print(len(C), bad); sys.exit(bool(bad) or len(C)<8)" "$SITES"
```
```
8 []
```
(exit 0)

I additionally wrote a stricter check (`comment_span_check`, kept in scratch, reproducible from the description below) that re-reads every site's *live* file from `git show HEAD` (not the cached archive used above) and checks, per site: `comment_start<=comment_end`; every line in `[comment_start,comment_end]` **and** any `extra_comment_spans` classifies as `doc` or `line` (not `code`, not `blank`); every non-blank line of `anchor` classifies as `code`. This is stricter than EVL-02's own anchor-only check because it also validates the comment side, and it caught two off-by-two line errors during drafting (`OCX-10`'s block had drifted 2 lines from my first hand-read; `PY-03`'s docstring line was one line lower than the `def` line I'd first picked) before they reached this file. Final run over all 54 sites: **0 errors.**

## Normative guidance candidates

- **Rule: a site's `comment_start`/`comment_end` MUST come from `comment_census.py --list-blocks`, never a hand-picked sub-range, unless the block is shared with another named site (then split, primary = nearest to the anchor, other = `extra_comment_spans`).** Rationale: Finding 1 — a hand-counted range disagreed with the tool on both the site it named as "long" and the site it didn't, in a document whose own MUST-severity checks require the tool. Verification: `python3 -B rules/code-docs/checks/comment_census.py --root <repo> --list-blocks --min-block 1 --format json`, then confirm every site's `(comment_start, line+len-1)` matches a `(line, line+len-1)` pair the tool printed for that file — a mismatch with no matching `extra_comment_spans` sibling is the defect. Confirms/changes: **changes** EVL-02 (it names the requirement but not the authoritative source; this makes `--list-blocks` the source of truth) and **confirms** EVL-09's over-10-line population claim, once corrected.
- **Rule: an over-10-line-comment population estimate for the eval MUST be computed by summing `comment_census.py` block lengths, never asserted from a prior document's inline arithmetic.** Rationale: Finding 1, `eval.md`'s "8 of 25 (32%)" claim. Verification: the EVL-09 one-liner above, run against a freshly `--list-blocks`-derived `sites.json`. Severity: MUST (the same severity `eval.md` already assigns EVL-09; this narrows *how* it is satisfied). Confirms EVL-09, supersedes the specific 8/25 figure in `code-docs-eval.md`'s Verdict §3 and Sites section (replace with 15/45, 33.3%, drawn from `OCX-02, OCX-08, OCX-20, OCX-23, OCX-24, GRM-03, GRM-05, GRM-06, PY-01` plus the 6 new sites, not `OCX-02, OCX-17`).
- **Rule: a control's `safe_edit` MUST be exercised against the repo's own test suite before the site is accepted, and the pass line quoted in the record, not asserted.** Rationale: Finding 3 — this is the only way to know a "narration" reading is correct rather than a missed guard; two of my own early anchor drafts for PY-02/PY-03 would have failed `comment_census.py`'s own `classify()` (unbalanced brackets breaking Python's tokenizer) had I not run the validator before finalizing. Verification: the exact test command plus its pass line, both recorded per site (see `sites.json`'s `test` field for controls). Confirms EVL-10; makes explicit that "proven" means a green run this session, not a plausibility argument.

## Decisions this dive proposes

1. **Every existing mechanism site's fields (id, repo, file, function, stratum, comment_start, comment_end, anchor, ground_truth, consequence, breaking_edit, test, comment_lines, register, lang, reason_in_code)**: filled for all 40 sites in `sites.json`, re-measured against live `HEAD`. `extra_comment_spans` added for `OCX-15`, `OCX-16`, `GRM-04` (shared blocks with a named sibling or a farther, non-nearest restatement). No site's `ground_truth`/`consequence`/`breaking_edit`/`test` prose changed from `eval-sites.md`'s substance; only line ranges and the new fields were derived fresh.
2. **6 new over-10-line non-Rust guard sites**: all 6 named candidates (`_bootstrap.py:431`, `_dist.py:614`, `_process.py:165`, `types.ts:231`, `catalog.ts:171`, `usePackageRoot.ts:74`) verified as real guards with a concrete breaking edit, consequence, and existing test, and all 6 measure over 10 comment lines by `comment_census.py`. **None replaced.**
3. **8 control sites harvested**: `version.ts:171`, `resolver.rs:193` (the two eval.md named), plus 6 more from the same "near-identical tautological docstring" pattern `sample.md` Smell #4 already flagged (`_results.py`'s five `from_dict` methods) and one more Rust one-liner doc (`digest.rs:137`). All 8 have a code-only `safe_edit` proven by a green test run this session (Finding 3). **The `eval-sites.md`/`eval-arms-and-sites.md` human-repo C-01..C-08 stopgap controls are dropped** — EVL-10 already says they measure the wrong ambient-density regime and propose "delete the comment" rather than a code edit; this harvest's 8 replace them outright rather than supplementing them.
4. **Validation**: all four checks (EVL-02 shape, EVL-09 quarter-over-10, EVL-10 controls, and this harvest's own stricter live-`HEAD` comment/anchor classification check) pass with zero errors on the final 54-site `sites.json` (Finding 4).
5. **What drops from the final list, and why**: nothing drops. `PY-02` stays stratum `X` (not deleted, not folded into A/B) — it remains in `sites.json` for completeness and for any future probe design that wants a "reason survives every arm" negative control, but the EVL-09/pooled-statistic scripts already exclude it via `reason_in_code`.

## Sources

- [code-docs-audit/eval-sites.md](/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/.agents/research/code-docs-audit/eval-sites.md) — the 40-site JSON this harvest re-measures.
- [code-docs-eval.md](/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/.agents/research/code-docs-eval.md) — EVL-01..EVL-13, the commission's schema and the "8 of 25" claim corrected in Finding 1.
- [code-docs-audit/sample.md](/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/.agents/research/code-docs-audit/sample.md) §5, Smell #4 — independent `len` cross-check for the 6 new sites, and the `_results.py` tautology pattern behind CTRL-03..07.
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html) — confirms PY-02's "path traversal, CWE-22" citation (absolute paths, `\`, and `..` components are the named manifestations, matching `_only_member`'s exact check).
- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html) — confirms PY-06's and OCX-19's CWE-345 framing: TLS/reachability is explicitly distinguished from content authenticity, matching `_expected_digest`'s own "TLS proves reachability rather than authenticity" comment.
- [CWE-426: Untrusted Search Path](https://cwe.mitre.org/data/definitions/426.html) — confirms PY-05's CWE-426 citation for `_which`'s cwd-ahead-of-PATH guard.
- `rules/code-docs/checks/comment_census.py` — `classify()` and `--list-blocks`, the authoritative block/kind source used throughout.
- Repo `HEAD`s read via `/usr/bin/git show HEAD:<path>` in ocx, grimoire, ocx-sdk-python, ocx-indexbot, grimoire-indexer, grimoire-vscode, ocx-catalog (SHAs in the header).
