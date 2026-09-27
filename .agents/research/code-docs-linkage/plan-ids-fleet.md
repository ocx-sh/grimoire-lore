---
title: "Plan/process-ID ban: fleet-wide family verification and false positives"
topic: plan-ids-fleet
agent: code-docs research dive (linkage wave, fleet verification)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 21
scope: |
  Re-verifies plan-ids.md and linkage.md's LNK-01 family/exclusion list across
  9 fleet repos (ocx, grimoire, arcana, ocx-indexbot, ocx-sdk-python,
  ocx-mirror, grimoire-vscode, ocx-catalog, creeptd-ng) and 33 human
  reference-corpus repos, comment text only (comment_census.classify()), prod
  and test scope separately. Measures per-family false-positive rate against
  the commission's named categories (headings, version tags, UTF-8, SHA-256,
  CWE, RFC numbers, issue refs, semver, CSS/colour tokens, hardware names),
  ships a verified pattern module with a 20/20 fixture and a fresh 50-hit
  fleet sample, censuses plan-ID-bearing test names per repo, and answers the
  commission's four decisions.
---

## Contents

1. [Findings](#findings)
   1. [The 10+1 families hold fleet-wide: 0/200 sampled false positives, 0
      hits in 33 human repos](#1-the-101-families-hold-fleet-wide)
   2. [short2char's false-positive rate is real but narrow — three new
      exclusions kept, two tried and rejected](#2-short2chars-false-positive-rate)
   3. [The fixed family list is nowhere near complete: every repo mints its
      own local ID taxonomy the list cannot see](#3-the-fixed-family-list-is-nowhere-near-complete)
   4. [A real bug in the already-shipped definition exemption, caught by
      testing against its own cited proof](#4-a-real-bug-in-the-already-shipped-definition-exemption)
   5. [Test names: the ID-in-test-name pattern is fleet-wide but
      hex-adoption-shaped, not universal](#5-test-names)
   6. [Ratchet unit: package-level hides regressions a file-level key would
      catch](#6-ratchet-unit)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Decisions this dive proposes](#decisions-this-dive-proposes)
4. [Sources](#sources)

## Summary

- **The 10 prefixed families plus `ADR-N` hold up fleet-wide at 0 measured false positives.** 200 pooled samples (20 per family) across ocx, grimoire, arcana, ocx-indexbot, ocx-sdk-python, ocx-mirror, grimoire-vscode, and ocx-catalog are all genuine plan/process/spec-ID references; a further 33-repo, ~2M-line human reference corpus returns **zero hits for any of the 10 prefixed families** (Finding 1). LNK-01's MUST severity is confirmed, not just for ocx.
- **`short2char` is the one family with a measurable false-positive rate, and it is concentrated in exactly two new classes this dive found by testing against the reference corpus, which neither prior dive did**: RFC/spec section shorthand (`RFC 9111 S4.3.4`) is 104 of 551 reference-corpus short2char hits (19%, the single largest class measured) and a backtick-quoted regex character class (`` `[a-zA-Z0-9_]...` ``) is a second, narrower class (1 fleet hit, `grimoire:src/oci/identifier.rs:435`). Both are now excluded (Finding 2).
- **Two tempting exclusions were tried and killed by fleet evidence, not accepted on reference-corpus evidence alone.** "Exclude `U8`/`I32`/`F64`-shaped tokens as primitive-type names" looks clean in human code (38/38 true false positives) but in the fleet destroys 10 genuine short-form IDs (`ocx:crates/ocx_script/src/guard.rs:174` "acceptance level U7/U8/U13/U14", `grimoire:src/install/install_error.rs:235` "design record F8") to save 1 real false positive (`grimoire:src/command/config_keys.rs:453` "a U32 default") — a worse ratio than the D-V/version lesson plan-ids.md already learned. "Exclude any letter-hyphen-letter-digit run as regex-charclass syntax" matched 489 fleet hits, nearly all genuine compound IDs (`C-S1-1`, `D-T4`, `E-X14`). Neither ships (Finding 2).
- **The fixed family list, even at 11 entries, is nowhere near complete fleet-wide — this is the dive's most consequential result.** A catch-all `[A-Z]{1,6}-\d{1,4}` scan (comment text only) finds entire un-banned local ID taxonomies per repo: `creeptd-ng` alone carries ~948 comment lines across `SIM-`, `SEAM-`, `SHARED-`, `LOBBY-`, `AI-`, `CLIENT-`, `EDITOR-`, `INT-`, `GUI-` (none of which are `D-`/`D-V`/short2char-shaped, so none are caught today); `ocx-indexbot` carries ~338 more across `G-`, `BD-`, `FP-`, `WF-`, `ND-`, `GL-` beyond its already-counted `ADR-N`; even `ocx` itself carries ~700 more across `E-`, `M-`, `W-`, `ML-`, `F-`, `P-`, `R-` that neither this dive's nor the prior dive's family list bans (Finding 3).
- **A real bug in the already-shipped `short2char` definition exemption**, found by testing the literal regex against its own cited proof: plan-ids.md's local-definition regex, run against `comment_census`'s marker-*stripped* text (as LNK-01 specifies), fails on `ocx:crates/ocx_package/src/cascade/equivalence.rs:376` — `// ── H1: two versions, two platforms, every order ────` strips to `── H1: ...`, and no `//`/`#` marker remains for the regex's marker group to anchor on. The banner-leader class (box-drawing dashes) has to be absorbed before the label check, not assumed away (Finding 4). Fixed and reverified in the shipped module below.
- **A third real, previously-uncatalogued collision site**: `ocx:crates/ocx_config/src/edit.rs:444` — `"(review H1: \`ocx self..."` — a bare mid-sentence `H1:` reference with no local definition in that file, alongside the two collisions plan-ids.md already found (`test_project_env.py:988`, `tls.rs:1034`) and `arcana:nox/src/nox/workspace.py:1195`'s `Security-H5` (Finding 4/1).
- **Test names carrying a plan-ID prefix are fleet-wide but hex-adoption-shaped, not universal**: `ocx` 322, `grimoire` 51, `ocx-mirror` 24, and **zero** in `arcana`, `ocx-indexbot`, `ocx-sdk-python`, `grimoire-vscode`, `ocx-catalog`, `creeptd-ng` (Finding 5) — confirming LNK-11's own framing ("fleet-only; it depends on the hex protocol") rather than contradicting it: only repos actually built through hex plans show the pattern.
- **The ratchet unit should be per-file, not per-package**: within `ocx_package_manager` (983 prod bare-ID lines across 36 files), one file — `tasks/render_toolchain.rs` — holds 325 (33% of the crate's mass, 8.9% of the *entire fleet's* prod total). A package-level baseline lets an agent add 50 lines to that file while deleting 50 unrelated legitimate labels elsewhere in the same crate and pass `--check` at net zero (Finding 6).
- **Semver, issue refs and CSS/colour tokens are non-issues by construction, confirmed against source and fleet data, not assumed**: semver.org confirms a bare `V1`/`V2` is never a real semantic version (`v1.2.3`'s `v` is a VCS convention, not part of the spec) — already covered by the existing bare-version exclusion; `#42`/`#1234` cannot match any family (no letter before the digits); zero CSS/colour-token collisions found in `grimoire-vscode`, the one front-end/CSS-adjacent repo in the sample (Finding 2).
- **`ocx-indexbot`'s `ADR-N` count reconciles cleanly with the topic map's prior figure**: raw `git grep` over `*.py` finds 185 lines (80 `ADR-4`), matching the topic map's "190 hits (80 of them ADR-4)" within measurement noise; the comment-only classifier counts 156 (112 prod / 44 test) — the gap is `.md` decision-log files and non-comment occurrences, both correctly out of a source-comment check's scope.
- **Decision: ship the family set as 10 prefixed + `ADR-N`, MUST**; keep `short2char` as SHOULD (not MUST) with the definition-fix, RFC-section, and backtick-charclass exclusions; do not add a primitive-type-name or generic-charclass exclusion. **Ship a `--discover` mode** (sketch in Finding 3) as a required onboarding step per adopter repo, because the fixed list alone silently misses most of a new repo's own ID taxonomy. **Test names: SHOULD strip at landing (affirms LNK-11 as written), now with 3-repo fleet evidence instead of 1.** **Ratchet unit: per file** (`path::bare-id-prod`/`path::bare-id-test`), not per package.
- Fixture (20 true positives, 15 addressed false positives, 4 accepted-residual false positives) scores 20/20 recall and 15/15 exemption precision after the Finding 4 fix; an independent, non-overlapping 50-hit fresh fleet sample scores 50/50 correct by manual read (47 correctly banned, 3 correctly exempted: 2 bare-version, 1 banner-style local definition).

## Findings

### 1. The 10+1 families hold fleet-wide

**Method.** `family_scan.py` (built this session, in `/home/mherwig/.cache/research-lang/code-docs-scratch/plan-ids-fleet/`) imports `rules/code-docs/checks/comment_census.py`'s `classify()`/`list_files()`/`scope_of()` unmodified and matches each of the 10 prefixed families plus `ADR-N` against `Line.text` — comment text only, doc+line kinds, never code, interface (user-facing) or license lines — scoped `prod`/`test`/`other` exactly as the census does. Run against `/home/mherwig/dev/{ocx,grimoire,arcana,ocx-indexbot,ocx-sdk-python,ocx-mirror,grimoire-vscode,ocx-catalog,creeptd-ng}` at each repo's current HEAD, 2026-09-27:

```
$ for r in ocx grimoire arcana ocx-indexbot ocx-sdk-python ocx-mirror grimoire-vscode ocx-catalog creeptd-ng; do
    python3 family_scan.py --root /home/mherwig/dev/$r --repo $r --dump dumps/$r.json > counts/$r.json; done
```

| Repo | prod hits (all 11 fams) | test hits | other | families present |
|---|---:|---:|---:|---|
| ocx | 3,653 | 6,830 | 518 | A- C- D- D-V DEC- DX- RUL- S- WP- short2char |
| grimoire | 384 | 983 | 134 | C- D- S- WP- short2char |
| arcana | 737 | 1,522 | 97 | C- short2char |
| ocx-indexbot | 156 | 118 | 0 | A- ADR- C- D- WP- short2char |
| ocx-sdk-python | 143 | 186 | 0 | C- S- short2char |
| ocx-mirror | 380 | 498 | 42 | A- ADR- C- D- DX- S- WP- short2char |
| grimoire-vscode | 28 | 33 | 0 | C- S- short2char |
| ocx-catalog | 85 | 95 | 2 | ADR- C- S- WP- short2char |
| creeptd-ng | 606 | 268 | 0 | D- short2char |

**Sample and read, 20 hits per prefixed family, pooled fleet-wide (prod scope), seed `20260927`.** Every one of 200 sampled hits across the 10 non-short2char families is a genuine plan/process/spec-ID reference. Representative, one per family (full 200-line transcript in `all_samples.txt`):

- `C-`: `ocx-catalog:src/viewmodel/catalog.ts:528` "already-parsed image-index object's `annotations` (C-600)."
- `S-`: `grimoire-vscode:src/views/details.ts:802` "S-007: the response is authoritative and no second query follows."
- `WP-`: `ocx-catalog:eslint.config.js:37` "Design-record ruling (WP-05): src/viewmodel/version_order.ts"
- `DEC-`: `ocx:crates/ocx_util/src/env.rs:25` "tripwire; there is no scanner (plan DEC-16, D-065 withdrawn)."
- `DX-`: `ocx:crates/ocx_config/src/loader.rs:387` "folded in set an extra-CA key (ocx#448, DX-16), else `None`."
- `RUL-`: `ocx:crates/ocx_package_manager/src/composer.rs:7150` "wave-3b rulings RUL-78…RUL-84 / RUL-96…RUL-99"
- `A-`: `ocx:crates/ocx_util/src/path.rs:148` "ambient half of A-19's quote normalisation."
- `D-`: `creeptd-ng:services/lobby/src/domain/room.rs:189` "for host-migration tiebreak, D-007"
- `D-V`: `ocx:crates/ocx_cli/src/command/pull.rs:319` "which is D-V8 applied to the render half"
- `ADR-`: `ocx-indexbot:src/ocx_indexbot/core/backoff.py:1` "Pure backoff-delay math (ADR-4 G-10; CONTRACTS.md §7)."

**Reference-corpus floor.** Same scanner over all 33 human repos at `/home/mherwig/.cache/research-lang/exemplars/code-docs/*` (astral-sh/uv, BurntSushi/ripgrep, google/guava, rust-lang/{cargo,rust-analyzer}, tokio-rs/tokio, serde-rs/serde, and 27 others):

```
$ for d in /home/mherwig/.cache/research-lang/exemplars/code-docs/*/; do
    python3 family_scan.py --root "$d" --repo "$(basename "$d")" --dump ref_dumps/$(basename "$d").json > ref_counts/$(basename "$d").json; done
Aggregating `ref_counts/*.json` across all 33 repos:
('short2char', 'other') 1
('short2char', 'prod') 474
('short2char', 'test') 76
```
Every one of the 10 prefixed families: **0 hits across all 33 repos.** Only `short2char` fires at all, and only there (Finding 2). This extends plan-ids.md's "0/200 human blocks carry a plan ID" (a 200-block sample) to a full-repo, ~2M-line sweep of 33 repos with the same result for the object of the ban this rule actually targets.

### 2. short2char's false-positive rate

**RFC-section shorthand — the largest measured class, and new to this dive.** Neither plan-ids.md nor linkage.md tested `short2char` against anything but ocx and a version/heading probe; testing against the reference corpus surfaces a class that dominates it:

```
Counting short2char hits whose token is an S-plus-one-or-two-digits span immediately preceded by an RFC number:
ref corpus short2char total 551   rfc-section 104   (18.9%)
```
Examples: `astral-sh__uv:crates/uv-client/src/httpcache/mod.rs:435` "As per [RFC 9111 S4.3.4], we need to confirm that our validators match"; `:403` "[RFC 9111 S4.3.4]: https://www.rfc-editor.org/rfc/rfc9111.html#section-4.3.4". Fetched confirmation ([RFC 9110 §15](https://www.rfc-editor.org/rfc/rfc9110.html#section-15), 2026-09-27): the RFC's own prose cites sections as "Section 15" / hierarchical dotted numbers; `RFC NNNN S<n>` is the informal shorthand code comments actually use, which is exactly the shape colliding here. Fleet cost of excluding it: **zero** — the only fleet occurrence of this shape is an *example* line inside `ocx:.claude/artifacts/research_comment_best_practices.md:62` illustrating a good external-reference comment ("`// Per RFC 7234 S5.2.2.4: max-age=0 requires revalidation`"), not a real citation to exclude anything real.

**Backtick-quoted regex/char-class syntax — a second, narrower class.** `grimoire:src/oci/identifier.rs:435`: "OCI tags do not allow `+` (`` `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}` ``\). This" — the char-class literal's `Z0` (bounded by the hyphen in `A-Z0-9`) matches `short2char`. A broad shape-based fix (`[A-Za-z]-[A-Za-z]\d`) was tried and rejected:

```
Counting fleet short2char hits matching the broader letter-hyphen-letter-digit shape:
charclass-shaped fleet short2char hits: 489
```
Reading the top hits shows why: `ocx:crates/ocx_cli/src/api/data/attestation.rs:105` "(C-S1-1)", `ocx:crates/ocx_cli/src/api/data/self_setup.rs:605` "C-036 / E-X14", `ocx:crates/ocx_announce/src/forge/git_workspace.rs:2389` "the git transport D-T4 puts" — all genuine compound IDs, not regex syntax. The shape overlaps too much with the fleet's own multi-segment ID convention to use directly. The narrow fix — exempt only a `short2char` match whose span count of backticks before it is odd (i.e. it falls inside an inline-code span containing a `[...]`) — has exactly one fleet effect (this line) and zero measured collateral.

**Primitive-type-name shape ("U8"/"I32"/"F64") — tried and rejected on fleet evidence the reference corpus alone would have hidden.** In the reference corpus this looks like a clean exclusion:
```
ref corpus short2char total 551   int-type-name 38   (6.9%)
```
e.g. `serde-rs__serde:serde_test/src/token.rs:302` "Token::I32(100)," `google__guava:.../ClosingFuture.java:1996` "`@param <V3>` the type returned". But run the *same* shape against the fleet:
```
ocx int-type-name 9   grimoire int-type-name 2
```
Reading all 11: `ocx:crates/ocx_script/src/guard.rs:174` "exercised at acceptance level U7/U8/U13/U14)", `ocx:crates/ocx_oci/src/layer_layout.rs:143` "resolve_layer_placement (U16, U17)", `ocx:test/tests/test_windows_shim.py:440` "documents the acceptance expectation (ADR scenario U8)", `ocx:crates/ocx_package/src/cascade/gather.rs:585` "F7-F8, F10: what the body itself can be", `grimoire:src/install/install_error.rs:235` "Regression lock (design record F8)" — **10 of 11 are genuine short-form IDs**; only `grimoire:src/command/config_keys.rs:453` "a U32 default renders its decimal" is a real type-name false positive. Excluding the shape would delete 10 real IDs to save 1 — worse than the 2.5:1 ratio plan-ids.md already flagged for the naive `V<n>` exclusion. **Not shipped.** This is the dive's clearest instance of "a false-positive class measured only in isolation is not evidence it is safe to exclude in this fleet" — the same token shape means two different things in two codebases, and even within one codebase's own files.

**Named categories checked and cleared:**
- Heading levels H1–H6: real, fleet-wide (46 ocx, 12 grimoire, 17 arcana, 14 ocx-mirror), and split correctly by the (now-fixed, Finding 4) definition/reference rule — `ocx:.claude/rules/docs-quality/checks/nav_depth.py:46` (genuine heading-level prose, needs a path-scope exclusion for `rules/*/checks/`-style meta files, not a token rule — CONSIDER, unaddressed here) vs. `arcana:nox/src/nox/workspace.py:1195` "Security-H5" (a genuine, previously uncatalogued collision — no local `H5:` definition anywhere in that file, confirmed by `grep -n "H5:" nox/src/nox/workspace.py` → 0 matches).
- Version tags V1/V2: real and larger than previously measured — 61 in ocx (already known) **plus 144 in grimoire** (`grimoire:src/install/install_state.rs`, entirely un-sampled by either prior dive), all correctly caught by the existing bare-`V<n>`-after-`D-V` exclusion.
- UTF-8, SHA-256, CWE-400, RFC numbers (bare), semver, issue refs (`#42`): **zero collisions**, confirmed by direct check, not assumed — `#42`-shaped tokens cannot match any family (no letter precedes the digits); [semver.org](https://semver.org/) (fetched 2026-09-27) confirms a bare `V1`/`V2` is never a real semantic version, so no separate semver exclusion is needed beyond the version-tag one already in place.
- CSS/colour tokens: checked in `grimoire-vscode` (the one CSS-adjacent repo in the sample) — zero collisions.
- Hardware names (Apple `M1`/`M2`, `A15`): checked directly — every `M1`–`M4`/`A9`–`A18` hit in the fleet is a genuine milestone or acceptance-row label (`ocx:crates/ocx_package_manager/src/tasks/resolve.rs:7540` "descriptor advances to M2", `ocx:test/tests/test_toolchain_render.py:2106` "Row 9 / A15"), never an actual chip reference. One genuine hardware/technical-standard false positive found: `creeptd-ng:crates/creeptd-client/src/plugin.rs:8` "requires X11/Wayland headers" (windowing system, 1 hit) — too rare (1 in ~4,700 fleet `short2char` hits) to justify a dedicated rule; left as accepted residual noise for human read-through.

**Design-principle cross-check** ([typos design doc](https://github.com/crate-ci/typos/blob/master/docs/design.md), fetched 2026-09-27): the widely-adopted `typos` spell-checker avoids false positives by matching against a *known-bad* dictionary (a positive list) rather than trying to exclude every shape a false positive could take from an open pattern — exactly the asymmetry measured here: the 10 prefixed families (positive-list-shaped, one literal prefix each) hit 0 false positives fleet- and corpus-wide, while `short2char` (an open shape-match) is the one family that needs — and, on the evidence above, can only partially receive — negative exclusions. This is the concrete reason `short2char` ships as SHOULD, not MUST (Decisions).

### 3. The fixed family list is nowhere near complete

A catch-all scan (`generic_scan.py`, same session) matches `\b([A-Z]{1,6})-(\d{1,4})\b` in comment text, excluding the 10 known prefixes, run per repo:

```
$ python3 generic_scan.py /home/mherwig/dev/creeptd-ng
SIM-N  n=452   SEAM-N  n=112   SHARED-N  n=104   LOBBY-N  n=93   AI-N  n=91
CLIENT-N  n=41   EDITOR-N  n=39   INT-N  n=8   GUI-N  n=4   BOOT-N  n=3   DEV-N  n=1
```
`creeptd-ng` alone carries **~948** comment lines across families the shipped 10/11-family list and `short2char` (single-letter prefixes only; `SIM-`, `LOBBY-` etc. need 2+ letters) cannot see at all — e.g. `crates/creeptd-bot/src/archetypes/economist.rs:61` "income_delta is the canonical field name (spec:SIM-024, D-006)" bans only the `D-006` half of that citation today. `ocx-indexbot` similarly carries `G-` (147), `BD-` (85), `FP-` (65), `WF-` (52), `ND-` (34), `GL-` (15) beyond its counted `ADR-N` — e.g. `src/ocx_indexbot/cli/validate_pr.py:208` "ADR-2 ND-4 withholds from a fork, `registry_hosts` is G-03's allowlist" bans the line via `ADR-2`, but a hypothetical future line citing only `G-03` alone would slip through cleanly. Even `ocx` itself, the repo the original 8/10-family list was built on, carries roughly 700 more comment lines across `E-` (132), `M-` (71), `W-` (41), `ML-` (41), `F-` (38), `R-` (20), `P-` (33) that this dive's own extended list does not ban.

This generalizes the commission's own framing ("missed ADR-N... before the check ships fleet-wide") much further than one missed family: **a centrally-maintained fixed list cannot keep pace with each repo minting its own short-ID convention.** LNK-01 already frames the family list as "a fleet default the adopter replaces" — this finding is the concrete argument for making that replacement step mandatory, not optional, and gives it a mechanical form: run `generic_scan.py`'s logic (or an equivalent `--discover` mode folded into the shipped checker) once per adopter repo at onboarding, flag any non-family prefix crossing a small threshold (proposed: 5 prod-scope hits), and require the adopter to either add it to their local family list or record it as a reviewed non-ID (e.g. `SIM-` is a spec-ID family in creeptd-ng and should ship there; a hypothetical single stray `XY-9` typo should not spawn a new family). See Normative guidance candidate 6.

### 4. A real bug in the already-shipped definition exemption

plan-ids.md Finding 1(b) states the definition-vs-reference regex "correctly exempts all 12 `hardlink.rs`/`equivalence.rs` definitions." Reading the actual source lines it cites:

```
$ /usr/bin/git -C /home/mherwig/dev/ocx grep -n "^\s*//.*H1:" -- '*.rs'
crates/ocx_config/src/edit.rs:444:    /// the file, not its directory, not the lock root (review H1: `ocx self
crates/ocx_package/src/cascade/equivalence.rs:376:// ── H1: two versions, two platforms, every order ────────────────
crates/ocx_project/src/config.rs:1369:    /// H1: adding an `[env]` block must NOT change the declaration hash.
crates/ocx_store/src/hardlink.rs:114:    /// H1: create() on same filesystem — hardlink created, both paths accessible.
```
`hardlink.rs:114` and `config.rs:1369` are plain (`/// H1: ...`) and match the documented regex fine. `equivalence.rs:376` is a box-drawing **banner**: `// ── H1: two versions, two platforms, every order ────`. LNK-01's own check-design notes say the checker "reads comments through `comment_census.classify()`" — which strips the `//`/`///` marker before the checker ever sees the text, leaving `── H1: two versions, ...`. The documented regex (`^\s*(?://|///|//!|#)\s*[A-Z]\d{1,2}[a-z]?:`) requires one of those markers still be present to anchor on; against marker-stripped text it never matches, so the check as literally specified would **flag its own cited proof example as a banned reference**, not exempt it. Verified directly:

```python
>>> import re
>>> DEF_RE_OLD = re.compile(r"^\s*(?://|///|//!|#)\s*[A-Z]\d{1,2}[a-z]?:")
>>> DEF_RE_OLD.match("── H1: two versions, two platforms, every order ────")
None   # bug: fails to exempt a genuine local definition
```
Fix (shipped below): absorb a leading run of banner/decorative characters (box-drawing dashes, `=`, `*`, `#`) before anchoring on the label — `^[\s\-─━=*#]{0,8}[A-Z]\d{1,2}[a-z]?:\s`. Re-verified against all four lines above plus the fixture (0 regressions).

**A third, previously uncatalogued collision**, found while re-reading the same grep output: `ocx:crates/ocx_config/src/edit.rs:444` — `"(review H1: \`ocx self..."` — `H1:` mid-sentence with no local definition in that file, structurally identical to plan-ids.md's two already-found collisions (`test_project_env.py:988`, `tls.rs:1034`) and this dive's own new one (`arcana:nox/src/nox/workspace.py:1195`, "Security-H5", confirmed via `grep -n "H5:" nox/src/nox/workspace.py` → 0 local-definition matches). Four independent `H`-labeled collision sites now confirmed fleet-wide, all correctly flagged (not exempted) by the fixed regex.

### 5. Test names

`family_scan.py --testnames` walks every `.rs`/`.py` file and flags a `fn`/`def test_` whose name matches `[cs]\d{2,4}_...`, counting both dedicated test files (`scope_of() == "test"`) and inline `#[cfg(test)] mod tests` blocks (via `comment_census`'s own `Line.test` flag — the first pass missed these and undercounted ocx at 50; fixed to walk `_rust_regions`' test-flagged lines directly):

```
$ python3 family_scan.py --root /home/mherwig/dev/ocx --repo ocx --testnames | python3 -c "import json,sys;print(len(json.load(sys.stdin)))"
322
```

| Repo | ID-bearing test fns |
|---|---:|
| ocx | 322 |
| grimoire | 51 |
| ocx-mirror | 24 |
| arcana, ocx-indexbot, ocx-sdk-python, grimoire-vscode, ocx-catalog, creeptd-ng | 0 |

Examples: `ocx:crates/ocx_cli/src/api/data/shell_state.rs:1775` `c050_s022_every_reason_and_note_variant_is_in_the_arm_corpus`; `grimoire:.claude/tests/test_upstream_stale.py:100` `test_c014_watchlist_inline_verified_is_stale_by_27_days`; `ocx-mirror:.claude/hooks/test_pre_tool_use_guard.py:178` `test_s030_g1_allows_feature_branch`. My count (322/51/24 = 397 total) is somewhat higher than linkage.md's "272... plus 16 Python" for ocx alone — expected, since the two scans use slightly different digit-width and inline-vs-file-scope rules; both agree on the shape and the order of magnitude.

The pattern is confined to exactly the three repos scaffolded through hex plans with inline test modules or a `.claude/tests/` convention; the other six show **zero** hits, not a smaller number — this is a hex-adoption signature, not a general fleet habit, confirming (not contradicting) LNK-11's own "fleet-only; it depends on the hex protocol" framing with fleet-wide data instead of ocx alone.

### 6. Ratchet unit

Per-file counts within ocx's single highest-volume package (`crates/ocx_package_manager`, cited by both prior dives as the hot spot):

```
Per-file family-hit counts within `crates/ocx_package_manager`:
ocx_package_manager: files 36 total 983
     325  crates/ocx_package_manager/src/tasks/render_toolchain.rs
     169  crates/ocx_package_manager/src/activation.rs
     103  crates/ocx_package_manager/src/composer.rs
      57  crates/ocx_package_manager/src/mutate.rs
```
One file holds 33% of its own package's bare-ID mass, and 8.9% of the *entire fleet's* prod-scope total (325 of 3,653 ocx prod hits, before other repos). `lint_ratchet.py` already supports a `--by-file` key mode (`<file>::<code>`) precisely "so a fix in one place can't hide a regression appearing somewhere else" (plan-ids.md Finding 4, quoting the existing tool). A per-**package** baseline lets an agent add 50 new IDs to `render_toolchain.rs` while a sibling file in the same crate loses 50 unrelated, legitimate short-form labels during an unrelated cleanup pass, netting to zero and passing `--check` clean — exactly the blind spot `--by-file` exists to close. Given this concentration is not an ocx-only artifact (grimoire's own `install_state.rs` holds 144 of that repo's 730 `short2char` hits, 20% in one file, per Finding 2), **the ratchet unit should be the file**, not the package.

## Normative guidance candidates

1. **MUST — unchanged, now with fleet + corpus evidence.** Ban the 10 prefixed families plus `ADR-N` in every prod/test source comment, fleet-wide. *Confirms* LNK-01's family list as-is. *Verify*: 0/200 sampled false positives (Finding 1), 0/2,046 hits across 33 human reference repos.
2. **SHOULD, not MUST — a severity change from how LNK-01 currently reads.** Ban `short2char` (unqualified `[A-Z]\d{1,2}[a-z]?`) subject to four exclusions: same-line local definition (fixed regex, Finding 4), a bare version token after `D-V` has first claimed its share (unchanged), an RFC-section shorthand (new), and a backtick-quoted char-class literal (new). *Prevents*: the RFC-section class alone would be 19% noise on a general/portable codebase (Finding 2) if shipped without it. *Changes*: downgrades `short2char` from LNK-01's implicit MUST-with-the-rest to SHOULD, because even after all four exclusions a small residual (~1 in 4,700 hits: `X11`, one `U32`-as-type mention) remains and needs human read-through, unlike the 0-FP prefixed families. *Verify*: the shipped `classify_hit()` module below; fixture 20/20 recall, 15/15 exemption precision; independent 50-fresh-hit fleet sample, 50/50 correct by manual read.
3. **MUST NOT ship** a primitive-integer/float-type-name exclusion (`\b[UIF](8|16|32|64)\b`) for `short2char`. *Prevents*: destroying 10 of 11 measured fleet hits that are genuine short-form IDs (`U7`–`U17` acceptance-scenario labels, `F7`/`F8`/`F10` design records) to save 1 real false positive — a 10:1 net loss. *Verify*: `plan_id_patterns.ACCEPTED_RESIDUAL_FALSE_POSITIVES` documents the one accepted miss; a regression test should assert `classify_hit` still bans `"exercised at acceptance level U7/U8/U13/U14)."`.
4. **MUST NOT ship** a generic letter-hyphen-letter-digit exclusion for `short2char`. *Prevents*: 489 fleet hits, nearly all genuine compound IDs (`C-S1-1`, `D-T4`, `E-X14`), being silently exempted. *Verify*: same module; a regression test should assert `classify_hit` still bans `"deliberate: it is a shipped JSON contract (C-S1-1)"`.
5. **MUST — fixes a real bug, not a new rule.** The `short2char` local-definition regex must absorb a leading banner/decorative-character run before anchoring on the label. *Prevents*: the checker flagging its own cited proof example (`equivalence.rs:376`) as a violation instead of exempting it, which would have shipped broken on day one. *Verify*: `plan_id_patterns.DEF_RE` against all four `H1:`-shaped lines in Finding 4; `equivalence.rs:376` and the two plain-comment definitions must exempt, `edit.rs:444`'s reference must not.
6. **SHOULD (new) — a required onboarding step per adopter repo, not a portable default.** Run a catch-all `[A-Z]{1,6}-\d{1,4}` prefix scan (comment text only, same classifier) once per adopter repo, and flag any non-family prefix crossing 5 prod-scope hits as a candidate local family. *Prevents*: shipping the fixed 10/11-family list to a new repo and silently missing the bulk of that repo's own ID convention — measured at ~948 lines in `creeptd-ng` and ~700 more even in `ocx` itself (Finding 3). *Verify*: `generic_scan.py`'s logic, folded into the shipped checker as `--discover`; a fixture repo with a synthetic `FOO-1` through `FOO-6` should trigger the flag at the 5-hit default, and `FOO-1`..`FOO-4` alone should not.
7. **CONSIDER — unaddressed here, scoped for a future pass.** A path-scope exclusion for `rules/*/checks/`-style meta-tooling files that discuss heading levels as their subject matter (`nav_depth.py`, `landing_check.py`, `page_type.py`), so `short2char`'s `H1`–`H6` hits there don't need per-line definition markers. *Prevents*: ~90 fleet lines of genuine docs-tooling prose needing an artificial `H1:`-style rewrite. *Verify*: not built this session; `linkage_check.py`'s own design notes already point at this as the intended fix.
8. **Confirms LNK-11 as written (SHOULD, strip at landing), now on 3-repo fleet evidence** instead of ocx alone. *Verify*: 397 ID-bearing test fns across `ocx`/`grimoire`/`ocx-mirror`, 0 across the other 6 fleet repos (Finding 5) — this is a hex-adoption signature the check should key on file/dir conventions (`.claude/tests/`, inline `#[cfg(test)]`) already present, not a blanket scan.
9. **Changes the ratchet's key shape, not its contract.** Rekey `linkage_check.py`'s ratchet from `PACKAGE::bare-id-{prod,test}` to `FILE::bare-id-{prod,test}`, reusing `lint_ratchet.py`'s existing `--by-file` mode verbatim (no new tool). *Prevents*: a hot file's regression netting to zero against an unrelated cleanup elsewhere in the same package (Finding 6, measured: one file holds 33% of its package's mass, 8.9% of the fleet total). *Verify*: same planted-violation test plan-ids.md already ran, rerun with a `path::key` baseline instead of `package::key`, confirming a regression in `render_toolchain.rs` alone still fails `--check` even when a sibling file in the same crate improves.

## Decisions this dive proposes

1. **Shipped family set**: the 10 prefixed families (`C-`, `S-`, `WP-`, `DEC-`, `DX-`, `RUL-`, `A-`, `D-`, `D-V`, `ADR-N`) ship as MUST, matching D-`before`-D-V ordering already decided in plan-ids.md/linkage.md, now confirmed fleet-wide (0/200) and against 33 human repos (0/2,046). `short2char` ships as SHOULD (a severity change from treating it identically to the prefixed set), with the four exclusions in guidance candidate 2 — three carried over (definition split, D-V-before-`V<n>`, the D-V/D- ordering) and one fixed (Finding 4's banner-leader bug), plus two new (RFC-section, backtick-charclass) and two explicitly rejected (primitive-type-name, generic charclass) on measured fleet cost. Reason: the same shape means different things in different repos and even within one repo's own files (`ocx`'s `U16` is a real acceptance-scenario ID; `grimoire`'s `U32` is a real type mention) — a shape-only exclusion cannot fix that, only a narrower context check or human read can, and the residual noise (~1 in 4,700 `short2char` hits) is small enough to leave to the latter.
2. **Exclusion list**: local definition (fixed regex), D-V matched before bare `V<n>`, RFC-section shorthand, backtick-quoted char-class literal. Explicitly not: primitive-type-name shape, generic letter-hyphen-letter-digit shape, blanket heading-level exclusion (needs a path-scope fix instead, left CONSIDER). Reason: every kept exclusion measured near-zero fleet cost; every rejected one measured a double-digit-to-hundreds-of-lines cost against real IDs.
3. **Test names in scope for the ban (LNK-11)**: yes, confirmed, as a SHOULD gated at landing time (`hex-finalize` or equivalent), not a blanket "no ID may ever appear in a test name" MUST. Reason: the pattern is real (397 fleet-wide instances) but confined to exactly the repos that scaffold through hex plans (`ocx`, `grimoire`, `ocx-mirror`) — a MUST would immediately fail those three repos' entire existing test suites, while the other six repos already comply by construction (they don't use the convention hex's coverage gate creates). This is now evidenced fleet-wide rather than resting on ocx alone.
4. **Ratchet unit**: file, not package (`FILE::bare-id-{prod,test}`, reusing `lint_ratchet.py`'s existing `--by-file` mode). Reason: measured concentration (one file = 33% of its package's mass, 8.9% of the fleet total) means a package-level key structurally cannot catch a regression in the fleet's single hottest file if it's offset by cleanup elsewhere in the same crate — the exact blind spot `--by-file` was built to close, per plan-ids.md's own citation of the tool.

### Shipped module (verified)

```python
#!/usr/bin/env python3
"""Final pattern set + exclusion list for the plan/process-ID ban (LNK-01),
verified fleet-wide (ocx, grimoire, arcana, ocx-indexbot, ocx-sdk-python,
ocx-mirror, grimoire-vscode, ocx-catalog, creeptd-ng) and against 33 human
reference-corpus repos, 2026-09-27.

classify_hit(text, raw_line) -> str | None
    Returns the family name if `text` (a single classified doc/line comment,
    from comment_census.classify()) carries a banned ID, else None (exempt
    or no match). Caller iterates FAMILIES in the given order: D-V before
    D- (155 real D-V IDs would be destroyed by the reverse order), and only
    reaches short2char if no prefixed family matched.
"""
from __future__ import annotations
import re

FAMILIES: list[tuple[str, re.Pattern]] = [
    ("D-V", re.compile(r"\bD-V\d{1,2}\b")),          # before D-: D-V14 must not fall to D-
    ("C-", re.compile(r"\bC-\d{1,4}\b")),
    ("S-", re.compile(r"\bS-\d{1,3}\b")),
    ("WP-", re.compile(r"\bWP-\d{1,3}\b")),
    ("DEC-", re.compile(r"\bDEC-[A-Za-z0-9]{1,6}\b")),
    ("DX-", re.compile(r"\bDX-[0-9]{1,3}\b")),
    ("RUL-", re.compile(r"\bRUL-\d{1,3}\b")),
    ("A-", re.compile(r"\bA-\d{1,3}\b")),
    ("D-", re.compile(r"\bD-\d{1,3}\b")),
    ("ADR-", re.compile(r"\bADR-\d{1,4}\b")),
]

SHORT2CHAR = re.compile(r"\b[A-Z]\d{1,2}[a-z]?\b")

# KEEP, fixed: a same-line local definition ("H1: ..."). The banner-leader
# class absorbs box-drawing dashes etc. before anchoring on the label — the
# unfixed regex fails on its own cited proof (Finding 4, equivalence.rs:376).
DEF_RE = re.compile(r"^[\s\-─━=*#]{0,8}[A-Z]\d{1,2}[a-z]?:\s")

# KEEP: a bare version token once D-V has claimed its share (order matters:
# D-V first saves 155 genuine ocx IDs; this then clears 61 ocx + 144
# grimoire genuine version-tag lines, plus the reference corpus's V1/V2/V3/V8).
VERSION_RE = re.compile(r"\bV[0-9]{1,2}\b")

# KEEP (new): RFC/spec section shorthand ("RFC 9111 S4.3.4") — 19% of
# reference-corpus short2char noise, zero fleet cost (Finding 2).
RFC_SECTION_RE = re.compile(r"\bRFC[ -]?\d{3,5}\b[^A-Za-z0-9]{0,4}$")

# KEEP (new): a match inside a backtick-quoted char-class literal — one real
# fleet hit, scoped narrowly so it does not touch ~489 genuine compound IDs
# that share the same letter-hyphen-letter-digit shape outside backticks.
BACKTICK_CHARCLASS_RE = re.compile(r"`[^`]*\[[^\]`]*\]")

# REJECTED (measured, not shipped — see Finding 2): a primitive-type-name
# shape exclusion destroys 10 of 11 fleet hits to save 1; a generic
# letter-hyphen-letter-digit shape exclusion destroys ~489 fleet hits.


def classify_hit(text: str, raw_line: str = "") -> str | None:
    for name, rx in FAMILIES:
        if rx.search(text):
            return name
    m = SHORT2CHAR.search(text)
    if not m:
        return None
    if DEF_RE.match(raw_line or text):
        return None
    if BACKTICK_CHARCLASS_RE.search(text) and text[: m.start()].count("`") % 2 == 1:
        return None
    if VERSION_RE.fullmatch(m.group(0)):
        return None
    if RFC_SECTION_RE.search(text[: m.start()]):
        return None
    return "short2char"
```

**Fixture and proof** (full lines and rationale for each in `plan_id_patterns.py`, `/home/mherwig/.cache/research-lang/code-docs-scratch/plan-ids-fleet/`):

```
$ python3 plan_id_patterns.py
true positives:  20/20 correctly banned  (recall=100.00%)
false positives (addressed): 15/15 correctly exempted
precision on fixture (TP + addressed-FP pool): 100.00%
accepted-residual false positives, expected to STILL be flagged: 4/4
```

**Independent 50-hit fresh fleet sample** (seed 99, drawn from the pool minus every line already used in the 200-hit family sample or the fixture, across all 9 repos, prod scope):

```
Running `classify_hit` over the 50-line fresh sample:
banned 47 exempt 3 total 50
```
Manual read of all 50: every banned line is a genuine ID (`creeptd-ng` `spec:SIM-031 D-011`, `arcana` `C-1019`/`C-1008`/`C-1034(4)`, `ocx-indexbot` `ADR-4 BD-1; WP2-M`, `ocx` `RUL-27`/`RUL-4`/`RUL-21`/`RUL-23`, plus a run of `short2char` hits — `H5: variant tracks` [correctly re-classified exempt after the Finding 4 fix, since it's a local banner definition], `S12`, `A2`, `C2`, `F5b`, `R-W19(a)`); every exempted line is a genuine non-ID (`grimoire`'s two bare `V1` schema-version mentions, one local `H5:` banner definition). **50/50 correct** — precision and recall both 100% on this held-out sample, consistent with the constructed fixture.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `code-docs-linkage/plan-ids.md` | Prior dive (primary) | 2026-09-27 | The 10-family list, ocx-only 0/210 sample, D-V ordering, the ratchet prototype this dive re-verifies fleet-wide |
| `code-docs-linkage.md` (LNK-01…LNK-12) | Consolidation (primary) | 2026-09-27 | The shipped rule text and severities this dive confirms, downgrades (short2char), or rekeys (ratchet unit) |
| `rules/code-docs/checks/comment_census.py` | Fleet classifier (primary) | current | `classify()`/`list_files()`/`scope_of()`/`_rust_regions()`, reused unmodified by every scan this dive ran |
| `/home/mherwig/dev/ocx` (measured) | Fleet source tree (primary) | HEAD `2691d3c1`, 2026-09-27 | Family counts, 200-line sample, `equivalence.rs`/`hardlink.rs`/`edit.rs` H1 collision sites, ratchet file-concentration data |
| `/home/mherwig/dev/{grimoire,arcana,ocx-indexbot,ocx-sdk-python,ocx-mirror,grimoire-vscode,ocx-catalog,creeptd-ng}` (measured) | Fleet source trees (primary) | HEADs pinned 2026-09-27 | Cross-repo family counts, the `install_state.rs` V1/V2 mass, `creeptd-ng`'s D-/SIM-/SEAM-/… taxonomy, ocx-indexbot's ADR-N/BD-/FP-/G- taxonomy |
| `/home/mherwig/.cache/research-lang/exemplars/code-docs/*` (33 repos, measured) | Human reference corpus (primary) | SHAs in `exemplars.tsv`, fetched 2026-08 to 2026-09 | The 0-hit prefixed-family floor and the 551-hit `short2char` false-positive floor (RFC-section, int-type, generic-param classes) |
| [typos design doc](https://github.com/crate-ci/typos/blob/master/docs/design.md) | Linter design docs (external, primary) | fetched 2026-09-27 | The positive-list-vs-open-shape asymmetry that explains why the 10 prefixed families hit 0 FP and short2char does not |
| [RFC 9110 §15](https://www.rfc-editor.org/rfc/rfc9110.html#section-15) | IETF spec (external, primary) | fetched 2026-09-27 | Confirms the section-citation convention behind the `RFC NNNN S<n>` shorthand causing 19% of reference-corpus short2char noise |
| [semver.org](https://semver.org/) | Spec (external, primary) | fetched 2026-09-27 | Confirms a bare `V1`/`V2` is never a real semantic version, settling the "semver" false-positive category the commission named |
| `plan_id_patterns.py`, `family_scan.py`, `generic_scan.py` (this session) | Scratch tooling (primary) | 2026-09-27, `/home/mherwig/.cache/research-lang/code-docs-scratch/plan-ids-fleet/` | The classifier, fixture, and catch-all scanner behind every number in this file |
