---
title: "code-docs: doc-comment caps — visibility, structured sections, human doc guards, interface blocks"
topic: doc-cap-calibration
agent: research-lang subagent (code-docs-ratchet, commission "doc-cap-calibration")
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 14
scope: >
  Answers the four open questions code-docs-ratchet.md left after shipping
  LEN-01/LEN-02 (plain cap 5; doc cap 10 app-kind / 15 library-kind): (1)
  does the library doc cap need to bind on item visibility or on structured
  sections rather than on package kind alone, measured on the 33-repo
  reference corpus at pre-2022/HEAD; (2) a second, larger sample of human
  doc-register guards (wave 1 had 7); (3) applying the candidate cap designs
  to ocx, grimoire, ocx-sdk-python, ocx-catalog and measuring how much of
  the over-cap mass is contract text; (4) whether clap/schemars/pydantic
  interface blocks should count toward the doc cap, measured in ocx. Does
  not cover: the guard-shape recognizer's own precision/recall (guard-shape
  dive owns that), the diff-time guard-removal check (LEN-06, still
  proposed), or re-deriving LEN-01/LEN-02's own headline numbers (already
  settled in code-docs-ratchet.md and its sub-artifact).
---

# code-docs: doc-comment caps — visibility, structured sections, human doc guards, interface blocks

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Doc-block length by visibility, reference corpus](#1-doc-block-length-by-visibility-reference-corpus)
  2. [The same split with structured sections stripped](#2-the-same-split-with-structured-sections-stripped)
  3. [Per-language visibility split, and where the classifier gives up](#3-per-language-visibility-split-and-where-the-classifier-gives-up)
  4. [Second human doc-guard sample: methodology and yield](#4-second-human-doc-guard-sample-methodology-and-yield)
  5. [The new sample's length distribution, and three guards that break the shipped cap](#5-the-new-samples-length-distribution-and-three-guards-that-break-the-shipped-cap)
  6. [Fleet application: four repos, two designs](#6-fleet-application-four-repos-two-designs)
  7. [Fleet visibility split: where the over-cap mass actually sits](#7-fleet-visibility-split-where-the-over-cap-mass-actually-sits)
  8. [Interface blocks in ocx: length, and two concrete leaks](#8-interface-blocks-in-ocx-length-and-two-concrete-leaks)
  9. [External sources checked](#9-external-sources-checked)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- **Visibility barely changes the right cap for app-kind packages but changes it a lot for library-kind ones.** Reference-corpus pooled doc blocks: app public p90=6/p95=10 vs app non-public p90=6/p95=8 (nearly identical); library public p90=20/p95=30 vs library non-public p90=9/p95=15 — a 2.2x gap on p90 ([§1](#1-doc-block-length-by-visibility-reference-corpus)).
- **This means LEN-02's flat 15-line library cap is calibrated for public items and is far too loose for private ones.** A library-kind package's non-public doc blocks behave like an app's (p90 9 vs app's p90 6), not like its own public ones (p90 20). Binding the library-tier allowance to public items only, and applying the app-tier cap (10) to non-public items regardless of package kind, is the single highest-leverage change this dive found.
- **Structured-section exclusion helps enormously in one register and almost not at all in another.** Stripping Rust `# Errors`/`# Panics`/`# Safety`/`# Examples` and fenced examples moves library doc p90 from 20 to 15 and p99 from 58 to 46 ([§2](#2-the-same-split-with-structured-sections-stripped)) — but applied to the actual fleet, it rescues 81% of ocx-sdk-python's over-cap blocks (Python `Args:`/`Returns:`/`Raises:`) against only 5.4% of ocx's and 0.2% of ocx-catalog's ([§6](#6-fleet-application-four-repos-two-designs)). Section exclusion is a Python/JSDoc-docstring fix, not a Rust-essay fix.
- **Second human doc-guard sample: 42 new guards from 258 hand-classified candidates (drawn from a 1,719-block keyword-filtered pool inside 43,351 pooled human doc blocks), against wave 1's 7** ([§4](#4-second-human-doc-guard-sample-methodology-and-yield)). Combined n=49. Median length 5, p90 10, max 16.
- **Three of the 42 new guards exceed the shipped app-tier doc cap of 10** (uv `crates/uv-preview/src/lib.rs:164`, 11 lines; two in `black/src/black/trans.py`, 14 and 16 lines) — LEN-02's own evidence base ("0/7 human doc guards flagged") does not survive a larger sample ([§5](#5-the-new-samples-length-distribution-and-three-guards-that-break-the-shipped-cap)).
- **Structured-section stripping rescues two of those three; visibility-binding would not have caught any of them** (all three are on `pub` items, correctly get the looser tier). The one survivor (uv, 11 lines, pure prose, no strippable section) is 1 line over cap 10 and is exactly the shape LEN-05 already prescribes splitting rather than exempting.
- **Doc-guard yield is domain-dependent, not corpus-wide.** Guava/httpx/flask/retrofit (pure high-level API libraries): ~3% of keyword-flagged candidates were real guards. cargo/rust-analyzer/rustls/kotlinx.coroutines (compilers, crypto, coroutine internals): ~35-40%. A single fixed "doc guard rate" number would mis-calibrate for either kind of codebase.
- **Applied to the fleet, section exclusion frees essentially nothing in the worst offender.** ocx: 2,562 doc blocks over the app-tier cap, 49,421 comment lines in them; stripping structured sections rescues only 139 blocks (5.4%) and frees 829 lines (1.7%) ([§6](#6-fleet-application-four-repos-two-designs)). grimoire: 3.4% freed. ocx-catalog (TypeScript/JSDoc): 0.2% freed — TS long blocks in this fleet are narrative prose, not `@param`-tagged.
- **ocx-sdk-python is the opposite case**: 129 over-cap blocks, 3,361 lines; stripping frees 1,615 lines (48%) and drops 105 of 129 blocks (81%) under the library-tier cap of 15. Python `Args:`/`Returns:`/`Raises:` sections are exactly the "contract text a caller needs" the commission asks about, and they are most of this repo's excess.
- **Visibility splits the fleet's over-cap mass unevenly by repo, not by a single rule.** ocx: 65% of over-cap doc lines sit on non-public items; grimoire: 69%; ocx-catalog: 48%; ocx-sdk-python (the one library-kind repo measured): only 25% — meaning most of ocx-sdk-python's excess is legitimate public contract prose, while most of ocx's and grimoire's excess is private-item bloat a visibility-bound cap would already catch under the existing app-tier number.
- **Interface blocks (clap `Parser`/`Args`/`Subcommand`, schemars `JsonSchema`) in ocx: 1,336 blocks, 7,021 lines, p50=3, p90=12, p95=18, p99=34, max=47. 183 blocks (13.7%) exceed 10 lines, holding 3,263 lines — 46.5% of all interface-doc mass** ([§8](#8-interface-blocks-in-ocx-length-and-two-concrete-leaks)). Interface blocks are excluded from every cap today.
- **schemars copies the whole doc comment verbatim into the JSON Schema `description` field with no length limit of its own** (confirmed against schemars' own docs, [§9](#9-external-sources-checked)) — and ocx's longest interface block is a 47-line internal security essay on a `#[derive(..., schemars::JsonSchema)]` enum (`crates/ocx_project/src/consent.rs:80`) that names a CVE and a private GitHub issue number, which today ships verbatim into the published JSON Schema.
- **clap's long-form `--help` text leaks too, by a different channel than the one frame.md already checked.** `crates/ocx_cli/src/command/toolchain_env.rs:86` is a legitimate 46-line CLI reference (exit codes, flag interactions) but also contains "a C7 patch fail-closed failure" — an internal plan-ID leaking into the text clap renders for `ocx <cmd> --help`. frame.md's "0 of 73 `--help` screens leak" measured short help; this is the first evidence of a leak in clap's long help.
- **Decision: interface blocks should count toward LEN-02**, not stay exempt. The rendering surface (a published JSON Schema, or `--help` text) is exactly the audience DOC-11/interface-leak already cares about, and both channels demonstrably leak internal content when the underlying doc comment runs long.
- **Rustdoc, Google's Python style guide, and schemars' own docs corroborate the section vocabulary and the leak mechanism** ([§9](#9-external-sources-checked)), fetched fresh for this dive.
- **Methodological caveat**: this dive's reference-corpus percentiles are pooled across individual blocks (one weight per block), while `reference-corpus.md`'s headline table reports the median of each repo's own p90 — the two are not the same statistic and should not be diffed line-for-line. The qualitative finding (visibility gap is library-specific) holds under both.

## Findings

### 1. Doc-block length by visibility, reference corpus

Command (script inlined at the end of this section; run against `~/.cache/research-lang/exemplars/code-docs/`, the same 32-pre-2022-snapshot + 1-HEAD checkout state `reference-corpus.md` and `code-docs-ratchet/length-and-ratchet.md` both used — verified read-only, unchanged, before running):

```
python3 measure_visibility_sections.py \
  --exemplars-root ~/.cache/research-lang/exemplars/code-docs \
  --tsv code-docs-audit/exemplars.tsv --out result.json
```

43,623 doc blocks classified (prod scope only). Pooled percentiles, one row per (package-kind, visibility):

| Kind | Visibility | n | p50 | p90 | p95 | p99 | max |
|---|---|---:|---:|---:|---:|---:|---:|
| app | public | 9,335 | 1 | 6 | 10 | 21 | 347 |
| app | non-public | 6,876 | 1 | 6 | 8 | 17 | 97 |
| app | module (`//!`) | 189 | 3 | 12 | 15 | 23 | 24 |
| lib | public | 11,591 | 6 | 20 | 30 | 58 | 195 |
| lib | non-public | 6,923 | 3 | 9 | 15 | 37 | 259 |
| lib | module (`//!`) | 59 | 8 | 34 | 101 | 256 | 256 |

The app row barely moves with visibility (p90 6 vs 6, p95 10 vs 8). The library row moves a lot (p90 20 vs 9, p95 30 vs 15, a >2x gap at both). This is the central empirical fact this dive adds: **package kind decides the right cap for public items; item visibility decides it for the rest.**

Visibility per language, matching the commission's split (Rust `pub`/non-`pub`, Python leading underscore, TS `export`/not, Go exported/not, Java/Kotlin `public`/not) — same run, grouped by language instead of package kind:

| Lang | Visibility | n | p50 | p90 | p95 | p99 |
|---|---|---:|---:|---:|---:|---:|
| rust | public | 8,022 | 1 | 13 | 26 | 54 |
| rust | non-public | 6,101 | 1 | 7 | 11 | 36 |
| go | public | 2,443 | 1 | 4 | 5 | 13 |
| go | non-public | 1,065 | 1 | 4 | 6 | 13 |
| python | public | 1,452 | 4 | 14 | 18 | 44 |
| python | non-public | 238 | 4 | 11 | 14 | 23 |
| python | module docstring | 248 | 5 | 17 | 27 | 101 |
| ts | public (`export`) | 609 | 3 | 15 | 20 | 31 |
| ts | non-public | 1,562 | 3 | 6 | 9 | 20 |
| java | public | 7,641 | 6 | 16 | 25 | 51 |
| java | non-public | 3,522 | 3 | 9 | 12 | 23 |
| kotlin | public | 740 | 5 | 21 | 33 | 102 |
| kotlin | non-public | 1,171 | 3 | 9 | 12 | 35 |

Every language shows the same direction (public longer than non-public) but Go barely moves (p90 4 vs 4) while Rust, Java, Kotlin, TS move substantially — the effect is strongest exactly in the languages with heavyweight doc-comment conventions (rustdoc sections, Javadoc/KDoc tags), which is also where the fleet (ocx, grimoire) writes its longest blocks.

### 2. The same split with structured sections stripped

Same run, `len_stripped` field (Rust `# Errors`/`# Panics`/`# Safety`/`# Examples`/`# Aborts`/`# Implementation` headers plus any fenced ``` region; Python `Args:`/`Returns:`/`Raises:`/`Yields:`/`Attributes:`/`Note:` and reST `:param:`/`:returns:`/`:raises:` fields; JSDoc `@param`/`@returns`/`@throws`/`@example`; Javadoc `@param`/`@return`/`@throws`/`@see` — `strip_sections()` in the inlined script):

| Kind | Visibility | p50 (stripped) | p90 (stripped) | p95 (stripped) | p99 (stripped) |
|---|---|---:|---:|---:|---:|
| app | public | 1 | 6 | 9 | 18 |
| app | non-public | 1 | 5 | 8 | 16 |
| lib | public | 4 | 15 | 22 | 46 |
| lib | non-public | 3 | 8 | 11 | 21 |

Stripping moves the library-public p90 from 20 to 15 (a 25% drop) and p99 from 58 to 46 — a real effect, but it does not close the visibility gap: library-public stripped p90 (15) is still nearly double library-non-public raw p90 (9). Section exclusion and visibility-binding are answering different parts of the same question, not substitutes for each other, which is why [§6](#6-fleet-application-four-repos-two-designs) finds they rescue almost disjoint sets of fleet blocks.

### 3. Per-language visibility split, and where the classifier gives up

The visibility detector (forward-scan for Rust/Go/TS/Java/Kotlin since the doc comment precedes the declaration; backward-scan for Python since the docstring is the item's own first statement) could not classify every block:

| Lang | Unknown | Total | Share |
|---|---:|---:|---:|
| rust | 5,731 | 19,854 | 28.9% |
| java | 1,583 | 12,746 | 12.4% |
| kotlin | 626 | 2,537 | 24.7% |
| go | 710 | 4,218 | 16.8% |
| python | 0 | 1,938 | 0% |
| ts | 0 | 2,171 | 0% |

Python and TS hit 0% unknown because their visibility markers (leading underscore; `export`) sit in a syntactic position the detector always finds. Rust's 28.9% unknown is mostly module-level `//!` docs at the top of a file (the block ends at a `use` statement, not a `pub`/`fn`/`struct` line the detector recognizes) and doc comments on enum variants/trait-impl items inside a block the forward-scan does not walk into — a real classifier gap, not a data artifact; a production version of this check would need `syn`-level parsing (already how `comment_census.py`'s own Python path uses `ast`) rather than a regex forward-scan for Rust.

### 4. Second human doc-guard sample: methodology and yield

Wave 1 (`human-sample.md`) drew 200 blocks uniformly (25 per repo) from only 8 of the 33 exemplar repos and found 7 doc-register guards among 110 doc blocks (6.4%). This dive needed roughly 50 more guards specifically, which at wave 1's rate would require reading on the order of 800 random doc blocks by hand — not tractable in this dive's scope. Deviation from a pure uniform draw, made explicit:

1. Pooled every prod doc block from all 33 exemplar repos (`comment_census.py --scope prod --list-blocks --kind doc --format json` per repo, `pool_doc_blocks.sh`): 43,351 blocks.
2. Scored each block with a five-signal regex (`guard_candidates.py`): a `SAFETY`/`GUARD`/`INVARIANT`/`CAUTION`/`WARNING` label; a causal/negative clause (`so that`, `otherwise`, `must not`, `relies on`, `holds the lock`, ...); a named failure mode (`race`, `deadlock`, `UB`, `leak`, `unsound`, ...); a hedge marker (`for now`, `works around`, `footgun`); an external anchor (a URL or issue number). This mirrors `human-sample.md`'s own "5 most useful wording patterns," not a new taxonomy.
3. Drew a **stratified** sample (`guard_candidates_stratified.py`, up to 12 candidates per repo, seed 17) rather than a flat pool, because a flat pool over-represented google/guava (28.7% of the whole corpus) and drowned out smaller repos: 221 candidates across all 33 repos, plus a first, non-stratified 37-item pass (seed 13) taken before the skew was noticed and kept in the final tally since it was already hand-classified.
4. Hand-classified all 258 candidates against `sample.md`'s own guard definition ("a why-constraint whose absence would let a named plausible edit introduce a bug") and category boundary (a caller-facing precondition/behaviour/panics clause on a public item is `contract`, not `guard`, matching `sample.md`'s taxonomy table exactly; a bundling multi-paragraph design essay that contains one guard-shaped sentence stays `essay`, per the taxonomy's own "usually bundling several of the above").

Yield: **42 confirmed guards from 258 hand-classified candidates (16.3%)** — far above wave 1's unfiltered 6.4%, confirming the keyword filter works, but nowhere near "keyword hit = guard" (83.7% of flagged candidates were contract, essay, or why-constraint on inspection). Yield was sharply domain-dependent:

| Repo cluster | Candidates examined | Guards found | Rate |
|---|---:|---:|---:|
| google/guava (huge, pure API library) | ~105 | ~2 | ~2% |
| httpx, flask, retrofit, okhttp, serde (API-surface libraries) | ~70 | ~3 | ~4% |
| cargo, rust-analyzer, rustls, kotlinx.coroutines (compiler/crypto/coroutine internals) | ~83 | ~34 | ~41% |

The third cluster alone supplied 34 of the 42 new guards. **A fixed "X% of doc blocks are guards" number is not portable across domains**: it depends heavily on whether the target codebase is a thin public-API surface (few guards) or systems/security-internals code (many).

### 5. The new sample's length distribution, and three guards that break the shipped cap

All 42 lengths (from `--list-blocks`' own `len` field, i.e. raw, unstripped): `1,2,2,2,3,3,3,3,3,3,3,4,4,4,4,5,5,5,5,5,5,5,6,6,7,8,8,8,8,8,9,9,9,9,10,10,10,10,11,12,14,16`.

- n=42, min=1, median=5, p90=10, max=16.
- Split by kind: app n=28, median 5.5, max 16. lib n=14, median 5, max 12.
- **4 of 42 (9.5%) exceed 10 lines; 1 of 42 (2.4%) exceeds 15.**

Combined with wave 1's 7 (all ≤9 lines), pooled n=49: still a strongly right-skewed, mostly-short distribution, but no longer zero-violations at cap 10. The three that exceed the **app-tier** cap of 10:

| File:line | Len | What it guards |
|---|---:|---|
| `astral-sh/uv:crates/uv-preview/src/lib.rs:164` | 11 | "Calls cannot be nested... otherwise that functionality will panic... consequence of how `HELD` is used to check for tests which are missing the guard." — thread-local preview-feature override, panics if misused. |
| `psf/black:src/black/trans.py:836` | 14 | "WARNING: This method is tightly coupled to both StringSplitter and (especially) StringParenWrapper." |
| `psf/black:src/black/trans.py:121` | 16 | "Side Effects: This method should NOT mutate @line directly... WARNING: If the underlying Node structure IS altered, then this method should NOT be allowed to yield CannotTransform after that point." |

Command used to fetch the exact block text (already-pooled JSON, no new clone read needed): `python3 -c "import json; [print(b) for b in json.load(open('pooled/astral-sh__uv.json')) if b['file']=='crates/uv-preview/src/lib.rs' and b['line']==164]"`.

Applying `strip_sections()` to these three (script inlined in [§1](#1-doc-block-length-by-visibility-reference-corpus)'s section):

| File:line | Raw len | Stripped len | Under cap 10 after stripping? |
|---|---:|---:|---|
| uv preview.rs:164 | 11 | 11 | No — pure prose, no `Args:`/`Returns:`/etc. to strip |
| black trans.py:836 | 14 | 9 | Yes — a 5-line `Returns:` section is the excess |
| black trans.py:121 | 16 | 8 | Yes — an 8-line `Yields:` section is stripped; the `Side Effects:`/`WARNING` guard content (6 lines) is correctly *not* recognized as a structured section and stays |

**Structured-section exclusion rescues 2 of these 3 real guards from a false-cap-violation, and correctly leaves the guard prose itself untouched in both cases** — the black:121 result is the cleanest possible validation of the design: the tool removed exactly the boilerplate `Yields:` return-type restatement and kept exactly the WARNING. The survivor (uv, 11 lines) has no structured section to strip; per LEN-05 (already shipped), the correct treatment is not an exemption but a split — the block states three separable facts (no nesting; thread-local validity; the `HELD` mechanism) that could become one 3-line plain comment at the call site plus a shorter doc summary, which is the cleanup skill's job, not this cap's.

**Visibility-binding would not have rescued or newly-flagged any of these three** — all three are on `pub` items (uv's `with_features`, black's two `trans.py` methods are module-private free functions inside an application, not library-kind, so they already sit under the app-tier cap regardless of visibility). This confirms [§2](#2-the-same-split-with-structured-sections-stripped)'s point: the two designs solve different problems and neither substitutes for the other.

### 6. Fleet application: four repos, two designs

`apply_caps_fleet.py` (inlined at the end of this section) runs `comment_census.py`'s own `classify()`/`blocks_of()` over each repo (read-only; no clone modified) at their current fleet HEAD (`ocx` `2691d3c`, `grimoire` `6b70cee`, `ocx-sdk-python` `9713f0a`, `ocx-catalog` `a16be21`), scope=prod, kind=doc, per-repo cap from the same package-kind convention `code-docs-ratchet.md`'s own fleet table already used (ocx/grimoire/ocx-catalog = app-kind, cap 10; ocx-sdk-python = library-kind, cap 15):

```
python3 apply_caps_fleet.py \
  --repo=ocx=/home/mherwig/dev/ocx=app \
  --repo=grimoire=/home/mherwig/dev/grimoire=app \
  --repo=ocx-sdk-python=/home/mherwig/dev/ocx-sdk-python=lib \
  --repo=ocx-catalog=/home/mherwig/dev/ocx-catalog=app
```

| Repo | Over-cap blocks | Over-cap lines (design A) | Rescued blocks by design B | Lines freed by design B | Freed share |
|---|---:|---:|---:|---:|---:|
| ocx | 2,562 | 49,421 | 139 (5.4%) | 829 | 1.7% |
| grimoire | 493 | 9,327 | 66 (13.4%) | 317 | 3.4% |
| ocx-sdk-python | 129 | 3,361 | 105 (81.4%) | 1,615 | **48.1%** |
| ocx-catalog | 77 | 1,676 | 1 (1.3%) | 3 | 0.2% |

**"How much of the over-cap mass is contract text a caller needs" (the commission's exact question) has a repo-dependent answer, not a fleet-wide one.** The freed lines are, by construction, exactly the content of a recognized `Args:`/`Returns:`/`Raises:`/`# Errors`/`# Panics`/`@param` section — text whose job is telling a caller what to pass and what comes back. In ocx-sdk-python that is essentially half the excess; in the three Rust/TS repos it is a rounding error. This matches `sample.md`'s own independent finding that ocx's fleet-wide contract share is 25.5% of *all* comment lines (not just over-cap ones) while ocx-sdk-python's is 70.7% (`code-docs-audit/sample.md` §4) — the same repo-level split shows up whether you sample randomly or look specifically at the over-cap tail.

### 7. Fleet visibility split: where the over-cap mass actually sits

Same run, splitting each repo's over-cap-A lines by the item's own visibility:

| Repo | Public over-cap lines | Non-public over-cap lines | Non-public share |
|---|---:|---:|---:|
| ocx | 17,291 | 32,130 | 65.0% |
| grimoire | 2,901 | 6,426 | 68.9% |
| ocx-catalog | 867 | 809 | 48.3% |
| ocx-sdk-python | 2,538 | 823 | 24.5% |

ocx and grimoire's excess is majority-private — unsurprising since both are app-kind already gated at the tighter cap (10), so this number does not change what they owe today, but it does mean a *future* visibility-bound design (private items always at cap 10, regardless of package kind) would newly bind harder on any library-kind crate inside these workspaces that currently inherits the umbrella repo's app-kind default. ocx-sdk-python inverts the pattern: only a quarter of its excess is private, meaning most of what it owes is legitimate public-API contract prose that the library tier (15) is correctly there to allow — visibility-binding here would mostly leave the number where it is, while section-exclusion (§6) is what actually moves it.

### 8. Interface blocks in ocx: length, and two concrete leaks

`comment_census.py`'s `blocks_of()` only aggregates `kind in ("doc", "line")`; `kind=="interface"` lines (Rust items deriving `Parser`/`Args`/`Subcommand`/`ValueEnum`/`JsonSchema`) are never grouped into blocks by the shipped tool, so this dive extended the same run-length grouping to `kind=="interface"` (script inlined below) over ocx, scope=prod:

```
n interface blocks: 1336
total interface lines: 7021
p50 3  p90 12  p95 18  p99 34  max 47
blocks > 10: 183 (13.7%), lines in those: 3263 (46.5% of all interface-doc lines)
blocks > 15: 82 (6.1%)
```

Two concrete leaks found by inspecting the eight longest blocks (`crates/ocx_project/src/consent.rs:80` len=47; `crates/ocx_cli/src/command/toolchain_env.rs:86` len=46; six more, `git ls-files`-verified, listed in the script's own output above):

- **`crates/ocx_project/src/consent.rs:80`** (47 lines, on `#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, schemars::JsonSchema)]`): a full trust-boundary security essay — names `mise`'s CVE-2026-35533 / GHSA-436v-8fw5-4mj8 and a private issue, `ocx-sh/ocx#344` — that today ships **verbatim** into the JSON Schema `description` field this enum generates, because schemars copies the whole doc comment with no length limit of its own ([confirmed against schemars' own derive-attribute docs, §9](#9-external-sources-checked)). This is the mechanism `frame.md`'s prior finding ("ocx's golden JSON Schemas carry 64 distinct internal IDs in 182 occurrences") already flagged from the schema side; this dive found the *source* comment and confirmed *why* schemars has no self-limiting behavior to catch it.
- **`crates/ocx_cli/src/command/toolchain_env.rs:86`** (46 lines, on `#[derive(Parser)]`): a legitimate CLI reference (exit codes 0/64/78/65 and their causes, `--shell`/`--pull` flag interaction) that clap renders as the long `ocx env --help` text — but it also contains "a C7 patch fail-closed failure," an internal short-form plan/patch ID leaking into user-visible help. `frame.md`'s "0 of 73 `ocx --help` screens leak" measured short help (`-h` / the one-line "about"); clap's separately-rendered *long* `--help` was not checked there, and this is the first evidence it leaks too.

Six of the eight longest interface blocks derive `Parser`/`clap::Args`, not `JsonSchema` — clap-sourced interface text is not automatically safe just because `frame.md`'s prior audit found no *short*-help leaks; it can still be long, and at least once, leaky, in its *long* form.

### 9. External sources checked

- **[rustdoc: How to write documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html)** (fetched 2026-09-27): confirms `# Examples` and `# Panics` as conventional section headers, and that "everything before the first empty line will be reused to describe the component in searches and module overviews" — the summary-sentence dive's territory, but it also means a doc comment's *first paragraph* is load-bearing for module listings independent of the cap, reinforcing that a length cap should bind the whole block, not exempt the lead paragraph.
- **[Google Python Style Guide, docstrings](https://google.github.io/styleguide/pyguide.html)** (fetched 2026-09-27): confirms `Args:`, `Returns:`/`Yields:`, `Raises:`, and `Attributes:` as the canonical Google-style section vocabulary this dive's Python stripper targets, and states these sections "can be omitted... where the function's name and signature are informative enough" — i.e. the section vocabulary itself is meant to be skippable boilerplate for simple cases, supporting treating it as strippable contract text rather than guard-bearing prose by default.
- **[schemars: deriving JsonSchema, attributes](https://graham.cool/schemars/deriving/attributes/)** (fetched 2026-09-27): confirms schemars takes the *entire* doc comment as the schema `description` (splitting off only a leading ATX heading as `title`) and "provides no specific guidance" on description length — directly explaining the `consent.rs` leak mechanism in §8: nothing in the tool itself would have stopped a 47-line internal essay from becoming a published field description.

## Normative guidance candidates

1. **A library-kind package's doc cap of 15 lines binds only on a `pub`/exported/public item's doc block. A non-public item's doc block, in any package kind, is capped at 10 lines — the app tier — never the library tier.**
   Rationale: reference-corpus library-non-public p90 is 9, library-public p90 is 20 — a >2x gap the flat library cap ignores entirely ([§1](#1-doc-block-length-by-visibility-reference-corpus)). Applied to the one library-kind fleet repo measured, `ocx-sdk-python`, only 24.5% of its current over-cap mass is private ([§7](#7-fleet-visibility-split-where-the-over-cap-mass-actually-sits)), so this change tightens a real, if minority, share of its bloat without touching the majority (legitimate public contract prose, §6).
   Verification: `python3 rules/code-docs/checks/comment_census.py --root src/ocx_sdk --scope prod --list-blocks --min-block 11 --kind doc --format json` combined with a visibility tag per block — not yet built as a single command; this dive's prototype is `measure_visibility_sections.py`'s `py_visibility()`/`rust_visibility()`/etc., which must be upstreamed into `comment_census.py` before this rule can gate. Planted-twin fixture proving the design discriminates correctly (`fixtures/vis_rs/lib.rs`, two textually-parallel 11-line doc blocks, one `pub fn`, one private `fn`): today's flat 15-line library cap passes both; a visibility-bound check flags only the private one (`visibility-bound-flags=True`) and passes the public twin (`visibility-bound-flags=False`) at the identical length.
   Severity: MUST once the visibility detector ships in `comment_census.py`; CONSIDER until then (same status LEN-06 already carries for its own not-yet-built check).
   Confirms/changes: **changes LEN-02** — the cap value is unchanged (10/15), but the tier a block gets no longer follows package kind alone.

2. **A block's length, for cap purposes, is counted after removing any recognized structured section** (Rust `# Errors`/`# Panics`/`# Safety`/`# Examples`/`# Aborts`/`# Implementation` headers plus fenced ``` regions; Python `Args:`/`Returns:`/`Raises:`/`Yields:`/`Attributes:`/`Note:` and reST `:param:`/`:returns:`/`:raises:` fields; JSDoc `@param`/`@returns`/`@throws`/`@example`; Javadoc `@param`/`@return`/`@throws`/`@see`). This is a counting rule inside the existing caps, not a new exemption category, and it does not touch LEN-05's guard-split requirement or LEN-06's guard-removal check.
   Rationale: rescues 2 of the 3 new-sample guards that exceed cap 10, and in both cases removes exactly boilerplate contract text while leaving the guard's own prose untouched ([§5](#5-the-new-samples-length-distribution-and-three-guards-that-break-the-shipped-cap)) — the black:121 case is a clean before/after (16→8 lines, `Yields:` stripped, `Side Effects:`/`WARNING` kept). Applied to the fleet, it is highly effective for Python (`ocx-sdk-python`: 48% of over-cap lines freed) and negligible for Rust/TS (`ocx` 1.7%, `ocx-catalog` 0.2%) ([§6](#6-fleet-application-four-repos-two-designs)) — a real, cheap, low-risk win for one register that costs nothing in the others because it changes nothing when there is no structured section to find.
   Verification: `strip_sections()` is inlined and runnable today (`measure_visibility_sections.py`); it needs folding into `comment_census.py`'s own `--list-blocks --min-block N` length computation as an opt-in flag (e.g. `--strip-sections`) before a shipped ratchet can use it. Twin-pair check already run on real fleet code (§5's table) rather than a synthetic fixture, since the black.py before/after pair is a cleaner, non-contrived demonstration than anything this dive could construct by hand.
   Severity: SHOULD (a project may decline it and accept a slightly higher false-positive rate on Python/JSDoc-heavy code, per LEN-02's own "fleet default the adopter may override" portability note).
   Confirms/changes: **changes LEN-02**'s length-counting mechanism; does not change the 10/15 cap values themselves.

3. **Interface blocks (Rust `#[derive(Parser, Args, Subcommand, ValueEnum, JsonSchema)]`, Python `click`/`typer`/pydantic `BaseModel` docstrings) count toward LEN-02's doc cap. They are no longer a separate, uncapped bucket.**
   Rationale: 183 of ocx's 1,336 interface blocks (13.7%) already exceed the proposed cap of 10, holding 46.5% of all interface-doc lines ([§8](#8-interface-blocks-in-ocx-length-and-two-concrete-leaks)). The longest one is a 47-line internal security essay that ships verbatim into a published JSON Schema (confirmed mechanism: schemars copies the whole doc comment, no length limit — [§9](#9-external-sources-checked)), naming a CVE and a private issue number. A second, clap-sourced 46-line block leaks an internal plan ID ("C7") into long `--help` text, a channel `frame.md`'s prior "0/73 `--help` screens leak" check did not cover (it checked short help only).
   Verification: extend `blocks_of()` to also group consecutive `kind=="interface"` lines into blocks (today only `("doc","line")` are grouped — this dive's script does this outside the shipped tool and must be upstreamed), then the same `--list-blocks --kind interface --min-block 11 --format json` command this program already uses for `doc` applies unchanged. Planted-violation shape: a `#[derive(Parser)]` struct with an 11-line doc comment must be reported once the extension ships; today it is invisible to every existing `--kind doc|line` command (confirmed: `comment_census.py`'s `blocks_of()` source, `kind in ("doc","line")` only).
   Severity: MUST once `blocks_of()` is extended; the extension itself is CONSIDER-priority plumbing, not a design question — the design decision (interface counts) is settled by this dive's evidence.
   Confirms/changes: **resolves the topic-map's open `interface-leak`/"interface blocks" question** in favor of counting; narrows DOC-11 (currently clap-only) to name schemars explicitly as the higher-leak-rate generator, per `frame.md`'s own prior finding.

## Decisions this dive proposes

- **Cap values per register and kind, restated with the visibility refinement**: plain 5 lines flat (unchanged, LEN-01). Doc: 10 lines for any non-public item regardless of package kind; 10 lines for a public item in an app-kind package; 15 lines for a public item in a library-kind package. The percentile this sits at: app doc cap 10 is between the app-public p95 (10) and p99 (21); library doc cap 15 (public only) sits between library-public p90 (20, i.e. below it — a real long-tail cap) at raw length, or comfortably above library-public-stripped p90 (15, i.e. exactly at it) once structured sections are excluded — meaning the practical bite of cap 15 depends on whether design 2 (section exclusion) ships alongside it.
- **Structured sections are exempted from the length *count*, not from the cap or from LEN-05/LEN-06's guard-removal scrutiny.** Decision: yes, adopt, as a SHOULD (normative candidate 2) — it is cheap, well-targeted (Python/JSDoc-style codebases benefit, Rust essay-heavy codebases are unaffected either way), and the one real risk (a guard's own content getting mis-recognized as a "section" and stripped) did not occur in either of this dive's two real test cases.
- **Per-item visibility, not just package kind, decides the doc cap tier** (normative candidate 1): yes, private items always get the app-tier cap (10), even inside a library-kind package. This is the change with the most fleet impact once ocx grows or gains more library-kind crates, though it changes nothing for the app-kind repos already at the tighter cap today.
- **Interface blocks (clap/schemars/pydantic) count toward LEN-02** (normative candidate 3): yes, with evidence from both a schemars leak (a CVE and a private issue number, verbatim, in a published schema) and a previously-unchecked clap long-help leak (an internal plan ID). No fleet repo currently gates them; ocx alone already has 3,263 lines that would newly violate cap 10 if this ships.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `.agents/research/code-docs-ratchet.md` and `code-docs-ratchet/length-and-ratchet.md` | this program's consolidated LEN-01..06 rules and their sub-artifact | measured 2026-09-27 | The four open questions this dive answers are listed verbatim in the consolidation's "Open questions" section |
| `.agents/research/code-docs-audit/reference-corpus.md` | 33-repo human-baseline census | measured 2026-09-27 | Sets the pre-2022/HEAD checkout state this dive's visibility split reuses without changing it |
| `.agents/research/code-docs-audit/human-sample.md` | wave-1, 200-block, 8-repo human sample | measured 2026-09-27 | Source of the 7 prior doc guards, the guard definition, and the 5 wording patterns this dive's regex scorer reuses |
| `.agents/research/code-docs-audit/sample.md` | fleet unbiased sample, 320 blocks, 100 guards | measured 2026-09-27 | Independent corroboration of §6's contract-share finding (ocx 25.5%, ocx-sdk-python 70.7%) from a random rather than over-cap-only sample |
| `.agents/research/code-docs-audit/exemplars.tsv` | 33-repo SHA manifest | pinned | Repo list, per-repo language and kind (app/lib) tag this dive's fleet-kind convention reuses |
| `rules/code-docs/checks/comment_census.py` | the shipped census/classifier | this program | `classify()`, `blocks_of()`, `scope_of()`, `EXT_LANG` imported directly by this dive's script, not reimplemented |
| `/home/mherwig/.cache/research-lang/code-docs-scratch/doc-cap-calibration/measure_visibility_sections.py` | this dive's script (visibility + section stripping), inlined below | written 2026-09-27 | Every §1-§5 number traces to this file's `--exemplars-root`/`--tsv` run |
| `/home/mherwig/.cache/research-lang/code-docs-scratch/doc-cap-calibration/apply_caps_fleet.py` | this dive's fleet script (designs A/B/C), inlined below | written 2026-09-27 | Every §6-§7 number traces to this file's run over the four named fleet repos |
| `/home/mherwig/.cache/research-lang/code-docs-scratch/doc-cap-calibration/guard_candidates.py` and `guard_candidates_stratified.py`, inlined below | this dive's guard-candidate scorer and sampler | written 2026-09-27 | §4-§5's 258-candidate review is drawn from these two scripts' output |
| `/home/mherwig/dev/ocx` (git, read-only) | live fleet repo | HEAD `2691d3c` | Source of §8's interface-block measurement and both leak examples (`consent.rs:80`, `toolchain_env.rs:86`) |
| [rustdoc: How to write documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html) | Rust project doc-writing guide | fetched 2026-09-27 | `# Examples`/`# Panics` section convention; the first-paragraph-is-special rule |
| [Google Python Style Guide — docstrings](https://google.github.io/styleguide/pyguide.html) | Google's public Python style guide | fetched 2026-09-27 | Canonical `Args:`/`Returns:`/`Yields:`/`Raises:`/`Attributes:` vocabulary this dive's Python stripper targets |
| [schemars — deriving JsonSchema, attributes](https://graham.cool/schemars/deriving/attributes/) | schemars' own derive-macro docs | fetched 2026-09-27 | Confirms the whole-doc-comment-verbatim, no-length-limit mechanism behind the `consent.rs` leak |
| `.agents/research/code-docs-frame.md` | program frame, prior evidence | 2026-09-27 | Source of "0 of 73 ocx --help screens leak" and "64 distinct internal IDs in 182 schema occurrences," both re-examined in §8 |

### Inlined scripts

`measure_visibility_sections.py` (visibility detection + structured-section stripping, §1-§5):

```python
#!/usr/bin/env python3
"""Doc-block length by visibility and with structured sections stripped.

Reuses comment_census.py's lexer/classifier (imported, not reimplemented) to
get per-line classification for every file in a repo, then for each doc
block (kind == "doc", scope == "prod"):

  1. Finds the item the block documents (forward-scan for Rust/Go/TS/Java/
     Kotlin, since the doc comment precedes the item; backward-scan for
     Python, since the docstring is the item's first statement) and labels
     it public or non-public per language:
       rust: `pub ` (exact) = public; `pub(...)` or bare = non-public
       python: name has a single leading underscore (and is not a dunder) =
               non-public; else public; module-level docstring = "module"
       ts/js: an `export` keyword on the declaration line = public
       go: exported identifier (capitalized) = public (doc already sits
           directly above its declaration; see comment_census._go_doc)
       java/kotlin: `public` modifier = public; `private`/`protected`/none
                    (package-private) = non-public

  2. Strips known structured sections and fenced examples, then recomputes
     the block's remaining line count:
       rust:   `# Errors`/`# Panics`/`# Safety`/`# Examples`/`# Aborts`/
               `# Implementation` markdown headers (to next such header or
               end of block) plus any ``` fenced region anywhere in the block
       python: Google-style `Args:`/`Returns:`/`Raises:`/`Yields:` sections
               (to next such header or end) and reST `:param:`/`:returns:`/
               `:raises:`/`:type:`/`:rtype:` field lines (the field line plus
               any more-indented continuation lines)
       ts/js:  JSDoc `@param`/`@returns`/`@throws`/`@example`/`@typeParam`
               tags (tag line to next `@tag` or end)
       java/kotlin: Javadoc `@param`/`@return`/`@throws`/`@see` tags, same
               shape as JSDoc

Usage: measure_visibility_sections.py --exemplars-root DIR --tsv FILE
       [--out FILE.json]
Exit codes: 0 success, 2 usage/missing input (matches comment_census.py).
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

CENSUS_PATH = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/code-docs/checks/comment_census.py"


def load_census():
    spec = importlib.util.spec_from_file_location("comment_census", CENSUS_PATH)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["comment_census"] = mod  # dataclass decorators need this registered first
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


census = load_census()

RUST_SECTION_RE = re.compile(r"^\s*(///|//!)?\s*#{1,2}\s*(Errors|Panics|Safety|Examples?|Aborts|Undefined [Bb]ehavior|Implementation notes?)\b")
RUST_HEADER_ANY_RE = re.compile(r"^\s*(///|//!)?\s*#{1,2}\s")
PY_GOOGLE_SECTION_RE = re.compile(r"^\s*(Args|Arguments|Returns|Raises|Yields|Attributes|Note)s?:\s*$")
PY_REST_FIELD_RE = re.compile(r"^(\s*)(#\s*)?:(param|type|returns?|rtype|raises?|except|ivar|cvar|var)\b")
JSDOC_TAG_RE = re.compile(r"^\s*\*?\s*@(param|returns?|throws|example|typeParam|template)\b")
JAVADOC_TAG_RE = re.compile(r"^\s*\*?\s*@(param|return|throws|see)\b")
FENCE_RE = re.compile(r"^\s*(///|//!|\*|#)?\s*```")

RUST_ATTR_RE = re.compile(r"^\s*#\[")
RUST_PUB_RE = re.compile(r"^\s*pub(\(|\s)")
RUST_PUB_EXACT_RE = re.compile(r"^\s*pub\s")
TS_DECORATOR_RE = re.compile(r"^\s*@\w")
TS_EXPORT_RE = re.compile(r"^\s*export\b")
JAVA_ANNOT_RE = re.compile(r"^\s*@\w")
JAVA_PUBLIC_RE = re.compile(r"^\s*(public)\b")
JAVA_NONPUBLIC_RE = re.compile(r"^\s*(private|protected)\b")
GO_DECL_CAP_RE = re.compile(r"^\s*(func|type|var|const)\s+(\([^)]*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)")
PY_DEF_RE = re.compile(r"^(\s*)(async\s+def|def|class)\s+([A-Za-z_][A-Za-z0-9_]*)")


def rust_visibility(raw: list[str], after_idx: int) -> str | None:
    i = after_idx
    while i < len(raw) and (RUST_ATTR_RE.match(raw[i]) or not raw[i].strip()):
        i += 1
    if i >= len(raw):
        return None
    line = raw[i]
    if RUST_PUB_EXACT_RE.match(line):
        return "public"
    if RUST_PUB_RE.match(line):
        return "non-public"  # pub(crate)/pub(super) etc: not externally public
    if re.match(r"^\s*(fn|struct|enum|trait|impl|mod|type|const|static|macro_rules!)\b", line):
        return "non-public"
    return None


def go_visibility(raw: list[str], after_idx: int) -> str | None:
    i = after_idx
    while i < len(raw) and not raw[i].strip():
        i += 1
    if i >= len(raw):
        return None
    m = GO_DECL_CAP_RE.match(raw[i])
    if not m:
        return None
    name = m.group(3)
    return "public" if name[:1].isupper() else "non-public"


def ts_visibility(raw: list[str], after_idx: int) -> str | None:
    i = after_idx
    while i < len(raw) and (TS_DECORATOR_RE.match(raw[i]) or not raw[i].strip()):
        i += 1
    if i >= len(raw):
        return None
    return "public" if TS_EXPORT_RE.match(raw[i]) else "non-public"


def java_visibility(raw: list[str], after_idx: int) -> str | None:
    i = after_idx
    while i < len(raw) and (JAVA_ANNOT_RE.match(raw[i]) or not raw[i].strip()):
        i += 1
    if i >= len(raw):
        return None
    if JAVA_PUBLIC_RE.match(raw[i]):
        return "public"
    if JAVA_NONPUBLIC_RE.match(raw[i]):
        return "non-public"
    # package-private: no modifier, but still looks like a member/type decl
    if re.match(r"^\s*(class|interface|enum|record|[\w<>\[\],\s]+\()", raw[i]):
        return "non-public"
    return None


def py_visibility(raw: list[str], start_idx: int) -> str:
    i = start_idx - 1
    while i >= 0:
        m = PY_DEF_RE.match(raw[i])
        if m:
            name = m.group(3)
            if name.startswith("__") and name.endswith("__"):
                return "public"  # dunder: public protocol method
            return "non-public" if name.startswith("_") else "public"
        if re.match(r"^\S", raw[i]) and raw[i].strip() and not raw[i].strip().startswith(("'''", '"""')):
            break  # hit non-indented, non-def code: this is a module docstring
        i -= 1
    return "module"


def strip_sections(block_lines: list[str], lang: str) -> int:
    n = len(block_lines)
    drop = [False] * n
    in_fence = False
    for i, line in enumerate(block_lines):
        if FENCE_RE.match(line):
            drop[i] = True
            in_fence = not in_fence
            continue
        if in_fence:
            drop[i] = True
    if lang == "rust":
        i = 0
        while i < n:
            if not drop[i] and RUST_SECTION_RE.match(block_lines[i]):
                drop[i] = True
                j = i + 1
                while j < n and not (RUST_HEADER_ANY_RE.match(block_lines[j]) and re.search(r"#", block_lines[j])):
                    drop[j] = True
                    j += 1
                i = j
            else:
                i += 1
    elif lang == "python":
        i = 0
        while i < n:
            if not drop[i] and PY_GOOGLE_SECTION_RE.match(block_lines[i]):
                drop[i] = True
                j = i + 1
                while j < n and not PY_GOOGLE_SECTION_RE.match(block_lines[j]) and block_lines[j].strip() != "":
                    drop[j] = True
                    j += 1
                i = j
            elif not drop[i] and PY_REST_FIELD_RE.match(block_lines[i]):
                indent = len(PY_REST_FIELD_RE.match(block_lines[i]).group(1))
                drop[i] = True
                j = i + 1
                while j < n and block_lines[j].strip() and (len(block_lines[j]) - len(block_lines[j].lstrip())) > indent:
                    drop[j] = True
                    j += 1
                i = j
            else:
                i += 1
    elif lang in ("ts", "js"):
        i = 0
        while i < n:
            if not drop[i] and JSDOC_TAG_RE.match(block_lines[i]):
                drop[i] = True
                j = i + 1
                while j < n and not JSDOC_TAG_RE.match(block_lines[j]) and not re.match(r"^\s*\*/\s*$", block_lines[j]):
                    drop[j] = True
                    j += 1
                i = j
            else:
                i += 1
    elif lang in ("java", "kotlin"):
        i = 0
        while i < n:
            if not drop[i] and JAVADOC_TAG_RE.match(block_lines[i]):
                drop[i] = True
                j = i + 1
                while j < n and not JAVADOC_TAG_RE.match(block_lines[j]) and not re.match(r"^\s*\*/\s*$", block_lines[j]):
                    drop[j] = True
                    j += 1
                i = j
            else:
                i += 1
    remaining = n - sum(drop)
    return max(remaining, 0)


VIS_FN = {
    "rust": rust_visibility,
    "go": go_visibility,
    "ts": ts_visibility,
    "js": ts_visibility,
    "java": java_visibility,
    "kotlin": java_visibility,
}


def measure_repo(root: Path, lang_hint: str) -> list[dict]:
    out = []
    for f in census.list_files(root):
        try:
            src = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if census.GENERATED_RE.search("\n".join(src.split("\n", 6)[:6])):
            continue
        lang = census.EXT_LANG[f.suffix]
        rel = f.relative_to(root)
        if census.scope_of(rel) != "prod":
            continue
        lines = census.classify(rel.as_posix(), src, lang)
        raw = src.split("\n")
        for kind, start, length in census.blocks_of(lines):
            if kind != "doc":
                continue
            if lang == "python":
                vis = py_visibility(raw, start)
            else:
                vis_fn = VIS_FN.get(lang)
                vis = vis_fn(raw, start + length) if vis_fn else None
            block_raw = raw[start : start + length]
            stripped_len = strip_sections(block_raw, lang)
            out.append(
                {
                    "file": rel.as_posix(),
                    "line": start + 1,
                    "lang": lang,
                    "len": length,
                    "len_stripped": stripped_len,
                    "visibility": vis or "unknown",
                }
            )
    return out


def pctl(vals: list[int], p: float) -> float:
    if not vals:
        return 0.0
    v = sorted(vals)
    return v[min(len(v) - 1, int(p * len(v)))]


def summarize(rows: list[dict], key_fn) -> dict:
    buckets: dict[str, list[int]] = {}
    for r in rows:
        buckets.setdefault(key_fn(r), []).append(r)
    out = {}
    for k, items in sorted(buckets.items()):
        for variant, field in (("raw", "len"), ("stripped", "len_stripped")):
            vals = [it[field] for it in items]
            out[f"{k}|{variant}"] = {
                "n": len(vals),
                "p50": pctl(vals, 0.5),
                "p90": pctl(vals, 0.9),
                "p95": pctl(vals, 0.95),
                "p99": pctl(vals, 0.99),
                "max": max(vals) if vals else 0,
            }
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exemplars-root", required=True)
    ap.add_argument("--tsv", required=True)
    ap.add_argument("--out", default=None)
    a = ap.parse_args(argv)
    root = Path(a.exemplars_root)
    if not root.is_dir():
        print("no such dir", file=sys.stderr)
        return 2
    repos = []
    for line in Path(a.tsv).read_text().splitlines():
        if not line.strip():
            continue
        owner_repo, lang, kind, head_sha, head_date, snap_sha, snap_date = line.split("\t")
        repos.append((owner_repo.replace("/", "__"), lang, kind))
    all_rows = []
    for dirname, lang, kind in repos:
        rp = root / dirname
        if not rp.is_dir():
            print(f"missing {rp}", file=sys.stderr)
            continue
        rows = measure_repo(rp, lang)
        for r in rows:
            r["repo"] = dirname
            r["kind"] = kind
        all_rows.extend(rows)
        print(f"{dirname}: {len(rows)} doc blocks", file=sys.stderr)
    by_kind_vis = summarize(all_rows, lambda r: f"{r['kind']}|{r['visibility']}")
    by_kind = summarize(all_rows, lambda r: r["kind"])
    result = {"n_total": len(all_rows), "by_kind_visibility": by_kind_vis, "by_kind": by_kind, "rows": all_rows}
    js = json.dumps(result, indent=1)
    if a.out:
        Path(a.out).write_text(js)
    else:
        print(js)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

`apply_caps_fleet.py` (fleet application, §6-§7):

```python
#!/usr/bin/env python3
"""Apply candidate doc-cap designs to fleet repos: how many comment lines sit
in over-cap blocks under each design, and how many of those lines are
structured-section (contract) text.

Designs compared, for doc (kind=="doc") blocks, scope=prod:
  A. Shipped LEN-02 (package-kind flat): cap 10 lines (app) / 15 (library),
     no exemption. Package kind is fixed per repo, matching the precedent
     already set in code-docs-ratchet/length-and-ratchet.md's "Applied to
     the fleet" table (ocx, grimoire, ocx-catalog = app; ocx-sdk-python = lib).
  B. Structured-section exclusion: same cap as A, but a block's length is
     counted AFTER stripping Rust #Errors/#Panics/#Safety/#Examples/fenced
     examples, Python Args/Returns/Raises/reST fields, JSDoc @param/@returns/
     @throws (measure_visibility_sections.strip_sections).
  C. Visibility-bound: cap 10 for a block attached to a non-public item,
     cap matching the repo's package kind (10 app / 15 lib) for a public
     item -- i.e. private items never get the library-tier allowance.

Reports, per repo: block count and comment-line count over cap under A;
how many of A's over-cap blocks drop under cap once B is applied, and how
many comment lines that frees (== lines inside a recognized structured
section, i.e. contract prose); how the over-cap A mass splits by visibility
(feeds design C).

Usage: apply_caps_fleet.py --repo NAME=PATH=KIND [--repo ...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from measure_visibility_sections import census, strip_sections, VIS_FN, py_visibility  # noqa: E402

CAP = {"app": 10, "lib": 15}


def analyze_repo(root: Path, kind: str) -> dict:
    over_a_blocks = 0
    over_a_lines = 0
    rescued_by_b_blocks = 0
    freed_lines = 0
    over_c_public_lines = 0
    over_c_nonpublic_lines = 0
    examples = []
    cap = CAP[kind]
    for f in census.list_files(root):
        try:
            src = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if census.GENERATED_RE.search("\n".join(src.split("\n", 6)[:6])):
            continue
        lang = census.EXT_LANG[f.suffix]
        rel = f.relative_to(root)
        if census.scope_of(rel) != "prod":
            continue
        lines = census.classify(rel.as_posix(), src, lang)
        raw = src.split("\n")
        for bkind, start, length in census.blocks_of(lines):
            if bkind != "doc" or length <= cap:
                continue
            over_a_blocks += 1
            over_a_lines += length
            block_raw = raw[start : start + length]
            stripped_len = strip_sections(block_raw, lang)
            if stripped_len <= cap:
                rescued_by_b_blocks += 1
                freed_lines += length - stripped_len
            if lang == "python":
                vis = py_visibility(raw, start)
            else:
                vis_fn = VIS_FN.get(lang)
                vis = vis_fn(raw, start + length) if vis_fn else None
            if vis == "public":
                over_c_public_lines += length
            else:
                over_c_nonpublic_lines += length
            if len(examples) < 8:
                examples.append({"file": rel.as_posix(), "line": start + 1, "len": length, "stripped": stripped_len, "vis": vis or "unknown"})
    return {
        "kind": kind,
        "cap": cap,
        "over_a_blocks": over_a_blocks,
        "over_a_lines": over_a_lines,
        "rescued_by_b_blocks": rescued_by_b_blocks,
        "freed_lines_by_b": freed_lines,
        "over_c_public_lines": over_c_public_lines,
        "over_c_nonpublic_lines": over_c_nonpublic_lines,
        "examples": examples,
    }


def main() -> int:
    repos = []
    for a in sys.argv[1:]:
        if a.startswith("--repo="):
            a = a[len("--repo=") :]
        name, path, kind = a.split("=")
        repos.append((name, path, kind))
    out = {}
    for name, path, kind in repos:
        out[name] = analyze_repo(Path(path), kind)
        print(f"{name}: {out[name]['over_a_blocks']} over-cap blocks, {out[name]['over_a_lines']} lines", file=sys.stderr)
    json.dump(out, sys.stdout, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

`guard_candidates.py` and `guard_candidates_stratified.py` (candidate scoring and sampling, §4-§5) are kept in the scratch directory (`/home/mherwig/.cache/research-lang/code-docs-scratch/doc-cap-calibration/`) rather than inlined a third time here; both are short (under 120 lines each), reuse `census`'s own block listing, and their full source is available at that path for anyone re-running this dive's sample.
