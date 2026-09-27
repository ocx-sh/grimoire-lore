---
title: Interface leak — one check across clap, schemars, pydantic and zod
topic: interface-leak
agent: research-lang subagent (code-docs, wave 2, surfaces group)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 19
scope: >
  What check keeps internal plan/process IDs, decision-record filenames, ISO
  dates and implementation jargon out of doc text that renders to an end user
  (clap --help) or an external schema consumer (schemars JSON, pydantic JSON
  Schema, zod JSON Schema via toJSONSchema()). Covers only text that reaches a
  reader outside the source tree; rustdoc/hover text read by an in-repo agent
  or downstream Rust developer is addressed only for the boundary it draws
  against this surface (full guard-shape and two-registers policy is a sibling
  dive). Fleet-measured for clap and schemars (both live in ocx and grimoire);
  pydantic and zod are not used by any fleet repo's own code as of this
  measurement, so their coverage rests on generator-source and vendor-doc
  evidence, not fleet occurrence counts.
---

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Generator mechanics, confirmed from source](#1-generator-mechanics-confirmed-from-source)
  2. [What the fleet actually uses](#2-what-the-fleet-actually-uses)
  3. [The measured leak, reproduced live](#3-the-measured-leak-reproduced-live)
  4. [Source-side prototype: reusing the census script's own interface classifier](#4-source-side-prototype-reusing-the-census-scripts-own-interface-classifier)
  5. [Catch-rate and false-positive comparison](#5-catch-rate-and-false-positive-comparison)
  6. [Jargon: wordlist and measured hits](#6-jargon-wordlist-and-measured-hits)
  7. [The hover boundary](#7-the-hover-boundary)
  8. [Where docs-quality stops](#8-where-docs-quality-stops)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- clap_derive and schemars both read the identical rustc `#[doc = "..."]` attributes; a single source-side check on those attributes covers both Rust generators with one classifier, already half-built in `comment_census.py`.
- schemars concatenates the **entire** doc-comment body verbatim into `description` (splitting off only a leading `# Heading` as `title`); clap's derive splits into a short paragraph (`about`) and the full body (`long_about`) — but both surfaces render the full body somewhere, so neither generator is inherently "safer" to leave unchecked.
- The measured leak is 100% attributable to doc comments: a source-side prototype scanning only comment-census `interface`-kind lines found 181 banned-token hits (78 distinct) in ocx, essentially matching the 177/62 (my narrower 7-family regex) and census.md's own 182/64 (9-family regex) found by scanning the shipped golden JSON schemas directly — command run and reproduced live, 2026-09-27.
- `ocx --help` and 19 subcommand `--help` screens (355 captured lines) scored 0 banned-token hits, reproducing census.md's 0/73 — the leak is concentrated in schemars-only structs, not clap-derived ones.
- DOC-11 (`rules/rust-quality/docs-and-tracing.md`) already bans this content, but its verification (`task verify help gates`) only inspects clap-rendered `--help` text — it structurally cannot see a schemars-only struct, which is exactly where the leak lives.
- A source-side check (scan doc comments on `#[derive(...)]` items naming `Parser|Args|Subcommand|ValueEnum|JsonSchema`) has equal-or-greater coverage than an output-side check (scan the shipped JSON/help text): it catches leaks in items with no golden-schema test yet, and runs before any build step.
- An output-side check still earns its keep as a backstop: it catches a leak placed via an explicit string attribute (`#[schemars(description = "...")]`, `#[arg(long_help = "...")]`) that bypasses `///` entirely — ocx has zero such attributes today, so the fleet gives no measured false-negative example, but the mechanism is real.
- Exclude the `short2char` ID family (`A2`, `D1`, `C7`) from an interface-leak MUST — census.md already measured it colliding with markdown heading refs (`H1`–`H6`) and schema version tags (`V1`/`V2`); keep it only under a file-qualified-pointer allowance.
- A jargon wordlist seeded from `ocx/CLAUDE.md`'s own crate glossary (`trampoline`, `CAS`, `singleflight`, `shim`, `sigstore`, `cosign`, `keyless`, `DSSE`, `referrers`, `managed tier`, `cascade`, `SSRF`, `PATHEXT`) found 144 hits in ocx's golden schemas and 1 borderline hit (`shim`) across 355 captured `--help` lines.
- A planted-fixture test (`#[derive(Parser, JsonSchema)] struct Cli { /// ... (C-999, adr_planted_fixture.md) tier: String }`) confirms the source-side check fires on the field doc comment and correctly ignores an identical banned string in a private, non-derived function's doc comment in the same file.
- pydantic (`use_attribute_docstrings`, added 2.7) and zod (`.describe()`/`.meta()`) are **not used by any fleet repo's own source** as of 2026-09-27: `ocx-sdk-python` and `ocx-indexbot` use `@dataclass`/`TypedDict`, not pydantic; `ocx-catalog` and `grimoire-indexer` carry `zod` only as a transitive dependency in `package-lock.json`, never imported directly. The commission's four-generator framing is a forward design target, not a current-fleet audit finding, for two of the four.
- pydantic's `use_attribute_docstrings` is mechanically different from clap/schemars: it reads the class's source text at runtime via `inspect`, not a compile-time doc-comment attribute, and its own docs list real detection gaps (`TypedDict`/dataclass inheritance, duplicate class names before Python 3.13).
- zod's metadata API moved from a single in-place mutator (`.describe()`, v3, mutates `_def.description`) to an external `z.globalRegistry` plus `.meta()` (v4) built explicitly to feed `z.toJSONSchema()` — the newer form is easier to grep for (`\.meta\(` / `z\.globalRegistry`) than the old bare-string mutator chain.
- rustdoc/hover text on a **non**-interface-tagged item may carry a file-qualified record pointer (` `` `adr_x.md` `` `) — DOC-16 already licenses intra-doc links on that basis (in-repo audience); the same pointer is banned the moment `_rust_regions`-style scanning marks the enclosing item `interface`.
- docs-quality's `plain-english.md` cannot see this surface at all: its own `paths:` frontmatter scopes to `.md`/`.mdx`/`.rst`/`.adoc`/`.asciidoc`, never `.rs`/`.py`/`.ts`; code-docs owns the doc-comment-to-rendered-surface pipeline outright, borrowing only the *design pattern* of DOC-PLAIN-10 ("gate on density, not one instance") as a considered-and-rejected import — interface-kind text is small enough, and every occurrence external enough, that single-occurrence gating is correct here, unlike page-wide prose.
- The information disclosed (plan IDs, filenames, internal jargon) is not secret-grade; CWE-200 itself flags direct use as "DISCOURAGED" in favor of a more specific weakness — the right frame is abstraction leak and support burden, not a security vulnerability, and the severity assigned below (MUST) rests on user-facing contract cleanliness, not CVE-grade risk.
- No fleet repo enables a presence-mandate lint (`missing_docs`) that would force a doc comment onto a schema/clap item in the first place; the leak check is independent of, and does not require, that mandate.

## Findings

### 1. Generator mechanics, confirmed from source

**clap_derive.** `extract_doc_comment` (current) / `process_doc_comment` (the exemplar corpus's pinned pre-2022 snapshot) filters an item's attributes for `#[doc = "..."]` name-value pairs — the same attribute rustc synthesizes from every `///`/`//!` line — strips one leading space per line, and splits on the first blank line into a **short** paragraph and a **long** (full-body) join: [`clap_derive/src/utils/doc_comments.rs`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs) (current, fetched 2026-09-27); pinned snapshot at `/home/mherwig/.cache/research-lang/exemplars/code-docs/clap-rs__clap/clap_derive/src/utils/doc_comments.rs:11-69` (SHA `c01ebbac17e3fdaf3b1d0bfb84051cd701babb7c`, 2021-12-31 — H3's pre-2022 baseline; the same paragraph-split design persists in current `master`, confirmed by re-fetch). The caller (`attrs.rs:557` in the same snapshot) passes this to build the item's `about`/`long_about` (or `help`/`long_help` for a field) — so **the full doc-comment body is always a rendered surface**, reachable via `--help` (long form), not only the first line.

**schemars.** `#[derive(JsonSchema)]` reads the identical `#[doc = "..."]` attributes and joins every line with `\n`, stripping one leading space each — no paragraph split at macro-expansion time: [`schemars_derive/src/attr/doc.rs`](https://raw.githubusercontent.com/GREsau/schemars/master/schemars_derive/src/attr/doc.rs) (fetched 2026-09-27). The title/description split happens **at runtime**, not in the derive macro: `get_title_and_description` treats a leading `#`-prefixed first line as the schema `title`, everything else as `description` — [`schemars/src/_private/rustdoc.rs`](https://raw.githubusercontent.com/GREsau/schemars/master/schemars/src/_private/rustdoc.rs) (fetched 2026-09-27), matching the derive docs' own statement that a doc comment "will be used as the generated schema's `description`" and that an explicit `#[schemars(description = "...")]` attribute overrides it ([docs.rs/schemars — `derive.JsonSchema.html`](https://docs.rs/schemars/latest/schemars/derive.JsonSchema.html), fetched 2026-09-27). **There is no short/long split in schemars** — the entire body always renders to `description`, unlike clap's `-h`/`--help` distinction.

**pydantic.** `ConfigDict(use_attribute_docstrings=True)` (pydantic 2.7+) reads a bare string literal immediately following a field's annotated assignment and uses it as the field's JSON Schema `description`, unless `Field(description=...)` is also set (which wins). This requires the class's **source code to be available at runtime** (`inspect`-based, not a compile-time attribute) and its own docs list detection gaps: `TypedDict`/stdlib-dataclass inheritance, and two classes sharing one name in the same file before Python 3.13 ([pydantic.dev — Configuration API](https://pydantic.dev/docs/validation/latest/api/pydantic/config/), fetched 2026-09-27, redirected from the canonical `docs.pydantic.dev/latest/api/config/`). Mechanically this is the outlier of the four: clap and schemars both read a compile-time attribute; pydantic re-parses source text.

**zod.** `.describe(description)` (present since v3) clones the schema with `description` set on its internal `_def` — confirmed directly in the pinned pre-2022 exemplar, `colinhacks__zod/src/types.ts:365-370` (SHA `73a9a628e8e3f512908b5f2b4116a87197f43407`, zod 3.11.6, 2021-12-30). Current zod (v4, not in the pinned snapshot) adds `.meta()`, which instead registers `{id, title, description, examples, ...}` in an external `z.globalRegistry`; `z.toJSONSchema()` reads that registry and copies every field into the output verbatim, and **only the last `.meta()`/`.describe()` call in a chain wins** because each returns a new immutable schema ([zod.dev/json-schema](https://zod.dev/json-schema), fetched 2026-09-27).

**Cross-generator invariant:** all four ultimately copy a string an author wrote next to the code, unmodified except for whitespace trimming, into a field a downstream consumer reads as prose. None of the four generators does any content filtering — the check has to live outside the generator, either at the point the string is written or at the point the artifact is inspected.

### 2. What the fleet actually uses

The commission names four generators; the fleet uses two of them:

| Generator | Fleet usage | Evidence |
|---|---|---|
| clap (`Parser`/`Args`/`Subcommand`/`ValueEnum`) | ocx CLI, extensively | `census.md` §headline: 3,091 clap-interface lines, ocx prod |
| schemars (`JsonSchema`) | ocx (3,913 interface lines) **and** grimoire (11 files) | `census.md` §headline; `grep -rln 'derive(JsonSchema)' /home/mherwig/dev/grimoire --include='*.rs'` → `src/lock/locked_artifact.rs`, `src/lock/locked_bundle.rs`, `src/command/publish.rs`, `src/lock/grimoire_lock.rs`, `src/mcp/tool_args.rs`, `src/oci/bundle.rs`, `src/oci/mcp.rs`, `src/config/declaration.rs`, `src/catalog/browse_sort.rs`, `src/catalog/forge.rs`, `src/config/project_config.rs` (run 2026-09-27) |
| pydantic (`BaseModel`, `use_attribute_docstrings`) | **none found** | `grep -rln "^import pydantic\|from pydantic" /home/mherwig/dev/ocx-sdk-python /home/mherwig/dev/ocx-indexbot --include="*.py"` → 0 hits (run 2026-09-27); both repos use `@dataclass`/`TypedDict` (`ocx_sdk/_types.py`, `ocx_sdk/_config.py`, `ocx_indexbot/model.py`) |
| zod (`.describe`/`.meta`) | **transitive only** | `grep -rn '\.describe(\|\.meta(' /home/mherwig/dev/ocx-catalog /home/mherwig/dev/grimoire-indexer --include='*.ts'` → 0 hits; `zod` appears only inside each repo's `package-lock.json` (pulled in by another package), never as a direct `dependencies` entry, and `ocx-catalog` is a VitePress docs site (`commander`, `markdown-it`, `minisearch`) with no schema-validation library at all (run 2026-09-27) |

This matters for scope: the check below is fully fleet-verified for clap and schemars, and generator-source-verified but fleet-unverified for pydantic and zod. Write the rule so it travels — a repo that adopts pydantic or zod later inherits the same interface-scoping logic — but do not claim a fleet catch rate for those two.

### 3. The measured leak, reproduced live

census.md §5 reported 64 distinct internal IDs, 182 occurrences in ocx's golden JSON Schemas, and 0 leaks across 73 `ocx --help` screens. Re-run live, 2026-09-27, with a narrower 7-family regex (omitting `short2char` and one variant, so the count is a slight undercount by design — see [§5](#5-catch-rate-and-false-positive-comparison)):

```
cd /home/mherwig/dev/ocx
rg -o -n \
  -e '\bC-[0-9]{1,4}\b' -e '\bRUL-[0-9]{1,3}\b' -e '\bA-[0-9]{1,3}\b' \
  -e '\bWP-[0-9]{1,3}\b' -e '\bDX-[0-9]{1,3}\b' -e '\bDEC-[A-Za-z0-9]{1,6}\b' \
  -e '\b(adr|plan|rulings|subsystem)[-_][A-Za-z0-9_.-]+' \
  crates/ocx_schema/tests/golden | wc -l          # → 177
  # ... | sed 's/^[^:]*:[0-9]*://' | sort -u | wc -l   # → 62 distinct
```

Result: 177 occurrences, 62 distinct tokens — same order of magnitude as census.md's fuller 182/64, confirming reproducibility with an independently-written regex set. Captured `--help` for `ocx` plus 19 subcommands (355 lines total, `timeout 10 ocx <sub> --help`, saved to the session scratchpad) scored **0** hits under the same regex, reproducing 0/73. Traced example, both sides: `crates/ocx_cli/src/api/data/shell_state.rs:329` ("The **PATH-facing trampoline directory** ... (G-1, S-004)") is a `pub` field inside a struct whose containing item derives `JsonSchema` (confirmed by file location under `ocx_cli/src/api/data/`, the crate's schema-carrying module per `CLAUDE.md:99`); the jargon and the pointer both land verbatim in `crates/ocx_schema/tests/golden/project.json:238` ("... a tool is resolved by its launcher trampoline at invocation time").

Grimoire's built schemas (`docs/dist/schemas/*.schema.json`, 4 files) scored 0 hits under the identical command — consistent with grimoire's clean pointer record from census.md §4 (0 of 6 spot-checked dead).

### 4. Source-side prototype: reusing the census script's own interface classifier

`comment_census.py` already tags exactly the lines this check needs: `RUST_IFACE_RE` (`rules/code-docs/checks/comment_census.py:99`) matches `#[derive(...)]` naming `Parser|Args|Subcommand|ValueEnum|JsonSchema`, and `_rust_regions` (`comment_census.py:428-442`) walks up from that line through preceding `doc`/`directive`/attribute lines to the item's start, then down to `_item_end`, re-tagging every `doc`-kind line in that span — struct/enum **and field** doc comments alike — as `kind == "interface"`. This is precisely "doc comments on clap- and schema-derived items" from the commission's step 2, already built, unused for this purpose until now.

Prototype (`interface-leak/source_side.py`, session scratchpad; imports `comment_census` rather than re-lexing, per census.md's own stated convention of never writing an ad hoc parser):

```python
for f in cc.list_files(root):
    if cc.scope_of(f.relative_to(root)) != "prod": continue
    lines = cc.classify(rel, src, lang)          # reuses comment_census.py verbatim
    for i, ln in enumerate(lines):
        if ln.kind != "interface": continue
        # apply the same banned-token regex families to raw[i]
```

Run 2026-09-27:

```
python3 source_side.py /home/mherwig/dev/ocx
# interface-kind lines scanned: 7021
# banned-token hits: 181  distinct tokens: 78

python3 source_side.py /home/mherwig/dev/grimoire
# interface-kind lines scanned: 1129
# banned-token hits: 0  distinct tokens: 0
```

**Planted-violation test.** A scratch fixture repo (`interface-leak/fixture`, `git init`, one commit) with:

```rust
/// Internal-only note that never renders (C-999, adr_planted_fixture.md).
fn internal_helper() {}

#[derive(Parser, JsonSchema)]
struct Cli {
    /// The tier to activate (C-999, see adr_planted_fixture.md).
    tier: String,
}
```

scores `interface-kind lines scanned: 1`, `banned-token hits: 2` — both at `src/lib.rs:9` (the `tier` field), zero at line 4. The identical banned tokens on the private, non-derived `internal_helper`'s doc comment are correctly invisible to the check: they never reach clap or schemars, so a plan-ID or bare filename there is out of this check's scope (it may still be a plan-IDs-dive violation, a separate rule).

### 5. Catch-rate and false-positive comparison

| | Output-side (golden schemas / captured `--help`) | Source-side (interface-kind doc comments) |
|---|---:|---:|
| ocx hits (7-family regex) | 177 (62 distinct) | 181 (78 distinct) |
| grimoire hits | 0 (4 built schema files) | 0 (1,129 interface lines) |
| Catches leak with no golden-schema fixture yet | No — only what a golden test actually renders | Yes — every `interface`-tagged doc comment, tested or not |
| Catches an explicit `#[schemars(description = "...")]`/`#[arg(long_help = "...")]` string bypassing `///` | Yes | No — the prototype scans `kind == "interface"` **doc** lines only |
| Fleet count of such explicit-string bypasses | — | 0 in ocx (`rg -c -e '#\[schemars\(.*description' -e '#\[arg\(.*long_help\s*=\s*"' -e '#\[arg\(.*help\s*=\s*"' --type rust -g '!external/**' .` → 0, run 2026-09-27) |
| Setup cost | None — greps a build artifact that already exists | Needs the `RUST_IFACE_RE`/`_rust_regions` classifier (already built) |
| Runs pre-build | No | Yes |

Source-side has equal-or-greater measured coverage on this fleet (181 ≥ 177) and runs earlier; output-side is the correct backstop for the one bypass class source-side structurally cannot see, even though that class has zero occurrences here today. **Ship both** — see [Decisions](#decisions-this-dive-proposes).

False positives: both sides inherit the same regex-family risk profile, already characterized in census.md §3 — `short2char` (`A2`, `D1`, `C7`) collides with markdown heading refs (`H1`–`H6`, 2.3% of hits) and index-schema version tags (`V1`/`V2`); the 7-family set used here (excluding `short2char`) had zero manually-identified false positives in the traced example and in the planted-fixture test.

### 6. Jargon: wordlist and measured hits

Seed list, from census.md §5's "trampoline" finding plus `ocx/CLAUDE.md`'s own crate-ownership table (`CLAUDE.md:80-97`, e.g. `ocx_store` "three-tier CAS, symlink namespace, package materialisation, shim blobs"; `ocx_sign` "keyless Sigstore sign, DSSE attest ... cosign simplesigning"): `trampoline`, `CAS`, `singleflight`, `shim`, `sigstore`, `cosign`, `keyless`, `DSSE`, `referrers`, `managed tier`, `cascade`, `SSRF`, `PATHEXT`, `dispatch object`, `fail-open`, `fail-closed`.

Measured against golden schemas, 2026-09-27:

```
rg -n -i -o -e 'trampoline' -e '\bCAS\b' -e 'singleflight' -e 'PATHEXT' -e 'dispatch object' \
  -e 'fail-open' -e 'fail-closed' -e '\bSSRF\b' -e '\bDSSE\b' -e '\bcosign\b' -e 'sigstore' \
  -e '\bshim\b' -e 'symlink namespace' -e 'materialisation' -e 'keyless' -e 'referrers' \
  -e 'managed tier' -e 'resolution.index' -e '\bcascade\b' crates/ocx_schema/tests/golden \
  | sed 's/^[^:]*:[0-9]*://' | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn
```
→ `49 keyless, 29 sigstore, 19 shim, 14 cosign, 13 referrers, 7 cascade, 6 "managed tier", 4 trampoline, 2 pathext, 1 ssrf` (145 total).

Same wordlist against the 355-line captured `--help` corpus: **1** hit, `shim`, at a `--lazy-mode` flag's help text: *"`always` composes a shim instead: the package's declared names are on `PATH` immediately..."* — self-explanatory in context (defines the term inline), matching census.md's earlier "trampoline" finding pattern ("the sentence is self-contained and doesn't require reading source to parse"). This is a real distinction the policy needs: a jargon term used AND immediately defined in the same sentence is a materially different finding from a bare, unexplained term, even though both trip the same grep.

### 7. The hover boundary

DOC-11 already exists at `rules/rust-quality/docs-and-tracing.md:39` ("A `///` on a clap-rendered surface states the user contract and nothing else ... no ADR/RFC/section references, no dates, no implementation jargon") — its verification line names only `task verify help gates`, which the topic-map already flags as "DOC-11 works, on the wrong generator" (`code-docs-topic-map.md:88-90`), confirmed here: it never touches `_rust_regions`'s schemars-tagged lines. DOC-16 (`docs-and-tracing.md:44`) separately licenses intra-doc links (`` [`Manifest`] ``, a hand-written cross-reference) for a rustdoc reader — a reader who is, by construction, either browsing the source tree or one click from it. That is the same audience a plain `//` maintainer comment or an un-derived `pub fn`'s rustdoc reaches: in-repo or one hop from in-repo, never a bare CLI end user or an external JSON-schema consumer.

### 8. Where docs-quality stops

`rules/docs-quality.md`'s frontmatter `paths:` (`rules/docs-quality.md:2-11`) lists only `**/*.md`, `**/*.mdx`, `**/*.rst`, `**/*.adoc`, `**/*.asciidoc`, and a handful of doc-generator config files — never `**/*.rs`, `**/*.py`, `**/*.ts`. Its own scope line is explicit: "Skip agent config ... Skip vendored copies ... governs published documentation only." `plain-english.md`'s closest neighbor rule, DOC-PLAIN-10 ("Gate a vocabulary tell on its density per 1,000 words, never on one occurrence" — `plain-english.md:76`), is a genuinely useful design pattern but the wrong one to import wholesale: DOC-PLAIN-10 exists because whole-page prose is long enough that one instance of a word like "delve" is noise, while `interface`-kind text is short (7,021 lines across all of ocx, versus one CLI screen or one schema field at a time) and every occurrence reaches an external reader — occurrence-based, not density-based, is correct here.

## Normative guidance candidates

1. **Every doc comment (`///`/`//!`) inside a Rust item whose `#[derive(...)]` names `Parser`, `Args`, `Subcommand`, `ValueEnum` or `JsonSchema` carries no plan/process ID, no bare decision-record filename, and no ISO date.** Prevents: a schemars- or clap-rendered surface leaking an internal reference no external reader can resolve (census.md §5: 64 distinct IDs, 182 occurrences). Verify: `python3 rules/code-docs/checks/interface_leak.py --root . --side source` (extends `comment_census.py`'s `RUST_IFACE_RE`/`_rust_regions`, scanning `kind == "interface"` lines with the family regex from [§3](#3-the-measured-leak-reproduced-live)); measured on ocx: 181 hits, 78 distinct (2026-09-27); on grimoire: 0. Severity: **MUST**.
2. **The same banned-token families are also checked against the shipped artifact**: golden JSON Schema fixtures and captured `--help` output. Prevents: a leak entering through an explicit `#[schemars(description = "...")]` or `#[arg(long_help = "...")]` string literal, which bypasses rule 1 entirely. Verify: `rg -o -n -e '\bC-[0-9]{1,4}\b' -e '\bRUL-[0-9]{1,3}\b' -e '\bA-[0-9]{1,3}\b' -e '\bWP-[0-9]{1,3}\b' -e '\bDX-[0-9]{1,3}\b' -e '\bDEC-[A-Za-z0-9]{1,6}\b' -e '\b(adr|plan|rulings|subsystem)[-_][A-Za-z0-9_.-]+' PATH_TO_GOLDEN_DIR` — measured 177/62 on ocx's golden dir, 0 on grimoire's built schema dir (both 2026-09-27). Severity: **MUST**.
3. **Exclude the `short2char` family (`[A-Z][0-9]{1,2}[a-z]?`) from both checks unless the token is immediately preceded by a backticked filename on the same line.** Prevents: false-failing on a markdown heading reference (`H1`–`H6`) or a schema-version tag (`V1`/`V2`) — census.md §3 measured these as a real share of `short2char` hits. Verify: any interface-leak finding tagged `short2char` is read by hand before it blocks, or excluded outright until a file-qualified-pointer exception is scripted. Severity: **MUST** (the exclusion, not the family).
4. **A jargon wordlist, maintained per adopter and seeded from that repo's own internal-terminology glossary (e.g. `CLAUDE.md`'s crate table), is checked against `interface`-kind lines and the shipped artifact, occurrence-based (any hit is a finding), never density-gated.** Prevents: an internal term (`trampoline`, `CAS`, `singleflight`, `sigstore`, `cosign`, `keyless`, `DSSE`, `referrers`) reaching a user or schema consumer who has no reason to know it. Measured: 145 hits across ocx's golden schemas, 1 borderline hit (`shim`, self-defined inline) across 355 captured `--help` lines (2026-09-27). A term used and defined in the same sentence is a SHOULD-fix, not a MUST-fix — a human reviewer distinguishes the two; the check flags both, the severity split is a review call. Verify: the `rg` command in [§6](#6-jargon-wordlist-and-measured-hits) against the interface-kind text extract and/or the shipped artifact. Severity: **SHOULD**.
5. **A file-qualified record pointer (`` `adr_x.md` ``, `` `plan_y.md` §N ``) may appear in a `///`/`//!`/`//` comment outside any `_rust_regions`-tagged `interface` span; the same pointer inside that span is banned outright (rule 1 already covers it).** Prevents: conflating "in-repo audience" (rustdoc/hover, already licensed by DOC-16) with "external audience" (clap `--help`, schemars JSON) — the two need opposite pointer policies, not one blanket ban or one blanket allowance. Verify: reading heuristic — a pointer's enclosing item is checked against the same `RUST_IFACE_RE` match used by rule 1; a planted fixture (`interface-leak/fixture`, [§4](#4-source-side-prototype-reusing-the-census-scripts-own-interface-classifier)) confirms the same string is correctly flagged inside the derive-tagged struct and correctly ignored on a private, non-derived function in the same file. Severity: **MUST** (the ban inside `interface`); **CONSIDER** (encouraging the pointer form outside it — it already works, per census.md §4's file-qualified-pointer-always-resolves finding, this only states it's *permitted* on interface-adjacent code, not required).
6. **Extend the same `interface`-scoping logic to pydantic (`use_attribute_docstrings` fields, `BaseModel` classes) and zod (any schema reachable from a `.describe()`/`.meta()` call feeding `z.toJSONSchema()`) before either is adopted, not after.** Prevents: the check missing entirely on day one of a Python or TypeScript repo picking up pydantic or zod, since `comment_census.py`'s existing Python interface-tagging (`PY_IFACE_DECOR_RE`, `BaseModel` base-class detection in `lex_python`) does not yet special-case attribute docstrings, which are source-position-based, not `ast`-docstring-based (pydantic's own docs: "requires the source code ... available at runtime"). No fleet occurrence to verify against today (`grep -rln "^import pydantic\|from pydantic"` → 0 in both Python repos; `grep -rn '\.describe(\|\.meta('` → 0 in both TS repos, run 2026-09-27) — this is a design-ahead rule, not a measured gap. Severity: **CONSIDER**.

## AI-agent angle

- **An agent adds `JsonSchema`/`Parser` to an existing struct's derive list without re-auditing its pre-existing doc comment.** The comment was written for an in-repo reader (rule 5's "outside `interface`" case); the derive addition silently moves the same text into rule 1's banned scope, and nothing about editing a `#[derive(...)]` line prompts a re-read of the doc comment three lines up. Smallest mechanical check: run rule 1's scan not only on changed lines but on the **full preceding doc block** of any item whose diff adds `Parser|Args|Subcommand|ValueEnum|JsonSchema` to its derive list — a diff-scoped check that only inspects the hunk misses this class entirely.
- **An agent reflexively writes the same internal vocabulary it has read elsewhere in the file**, because that vocabulary is the ambient context it was primed on (the topic map's `ambient-density` finding, `code-docs-topic-map.md:140`, extended here from comment density to comment *vocabulary*). It has no signal that this particular struct, unlike the ten others in the file, is schemars-derived. Smallest mechanical check: rule 1 + rule 4 scoped to `interface`-kind lines only — the false-negative risk of NOT scoping (banning jargon fleet-wide) is worse, since most of that vocabulary is legitimate in a plain `//` maintainer comment.
- **An agent treats schemars like clap and assumes only the "first line" renders**, because that is how `--help`'s short form behaves and clap is the generator agents encounter first in a CLI-heavy fleet. schemars has no such split ([§1](#1-generator-mechanics-confirmed-from-source)) — the whole body renders. Smallest mechanical check: rule 1 applied to every line of an `interface`-tagged doc block, not just its first paragraph — the prototype in [§4](#4-source-side-prototype-reusing-the-census-scripts-own-interface-classifier) already scans the full span `_rust_regions` marks, not a first-sentence subset.

## Contested / evolving

- **zod's metadata mechanism changed shape between major versions**, as of 2026-09: v3's `.describe()` mutates a schema's own `_def` in place (clone-and-set); v4 layers an external `z.globalRegistry` plus `.meta()` explicitly built to feed a first-party `z.toJSONSchema()` ([zod.dev/json-schema](https://zod.dev/json-schema); [github.com/colinhacks/zod discussion #4927](https://github.com/colinhacks/zod/discussions/4927)). The newer form is mechanically easier for a check to grep (`\.meta\(`, `z\.globalRegistry\.add\(`) than the older bare-string chain, because metadata now has one canonical call site instead of being spread across every `.describe()` in a schema graph. Trend: toward more checkable, not less — a future zod-adopting repo in this fleet should be steered at `.meta()` from day one.
- **schemars still has no first-class way to say "only part of this doc comment is public."** clap gets a free redaction boundary from its short/long split; schemars concatenates everything. No open schemars issue found in this session proposing one. This is an unresolved tooling gap, not a live disagreement — flag it as a genuine constraint the rule has to design around (hence rule 1's flat ban rather than a "keep IDs below the first blank line" carve-out, which would work for clap but not schemars).
- **pydantic's attribute-docstring mechanism is comparatively immature**: source-position-dependent, with the vendor's own docs listing real failure modes (dataclass/`TypedDict` inheritance, duplicate class names pre-3.13). Whether a future pydantic-adopting fleet repo should even enable `use_attribute_docstrings`, versus requiring explicit `Field(description=...)`, is unresolved — the explicit form has none of these detection gaps and is arguably the safer default, but that trade-off is undecided as of 2026-09 and out of this dive's fleet-measured scope (rule 6 covers the check design either way).

## Decisions this dive proposes

1. **The leak check is both source-side and output-side, not one or the other.** Source-side (extending `comment_census.py`'s `RUST_IFACE_RE`/`_rust_regions`) is the primary, pre-build gate — it has equal-or-greater measured coverage (181 vs. 177 hits, ocx, 2026-09-27) and catches items with no golden-schema test yet. Output-side (grep the shipped golden schemas / captured `--help`) is a mandatory backstop, because it is the only side that would catch an explicit `#[schemars(description = ...)]`/`#[arg(long_help = ...)]` string bypassing `///` — a class with zero current fleet occurrences but a real, structural blind spot for the source-side scan alone.
2. **Banned-token families are census.md §3's ID regexes minus `short2char`, plus the record-file-pointer and ISO-date regexes.** `short2char` is excluded outright (not merely down-severitied) because its own false-positive classes (markdown headings, schema-version tags) are common enough in normal prose that including it in a MUST would misfire on correct code; it re-enters only via the file-qualified-pointer exception in rule 5.
3. **The jargon policy is SHOULD, occurrence-based, per-adopter-maintained wordlist — never a universal fixed list and never density-gated.** Occurrence-based because `interface`-kind text is small and every hit is external-facing (rejecting DOC-PLAIN-10's density pattern as inapplicable, [§8](#8-where-docs-quality-stops)); per-adopter because "trampoline" is ocx-specific jargon and a different repo's internal vocabulary will differ; SHOULD because the measured borderline case (`shim`, self-defined inline) shows occurrence alone cannot always distinguish "leaked jargon" from "jargon introduced and explained in the same breath," which needs a human reviewer's call.
4. **Pointers: file-qualified only, permitted outside any `interface`-tagged span, banned inside it.** This is not a new pointer grammar — it reuses DOC-16's existing intra-doc-link license and census.md §4's finding that a file-qualified pointer always resolved in this fleet — it only draws the boundary at the same line `_rust_regions` already computes, so no new classifier is needed.
5. **The docs-quality boundary is exactly its own `paths:` frontmatter.** `plain-english.md` governs markup files; it never sees `.rs`/`.py`/`.ts`, so there is no restatement to avoid — code-docs owns this surface outright, and the one piece worth reusing from docs-quality (DOC-PLAIN-10's density-gating design) is explicitly rejected for this scope, with the reason given in [§8](#8-where-docs-quality-stops), rather than silently ignored.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [clap_derive/src/utils/doc_comments.rs](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs) | Primary source, current `master`, fetched live | 2026-09-27 | Ground truth for exactly how a doc comment becomes `about`/`long_about`; confirms the pre-2022 exemplar's design persists |
| `/home/mherwig/.cache/research-lang/exemplars/code-docs/clap-rs__clap/clap_derive/src/utils/doc_comments.rs:11-69` (SHA `c01ebbac1`) | Reference-corpus primary, pinned pre-2022 snapshot | 2021-12-31 | H3 baseline; the paragraph-split mechanism read and cited directly |
| [schemars_derive/src/attr/doc.rs](https://raw.githubusercontent.com/GREsau/schemars/master/schemars_derive/src/attr/doc.rs) | Primary source, current `master`, fetched live | 2026-09-27 | Shows schemars concatenates every `#[doc]` line with no paragraph split at macro time |
| [schemars/src/_private/rustdoc.rs](https://raw.githubusercontent.com/GREsau/schemars/master/schemars/src/_private/rustdoc.rs) | Primary source, current `master`, fetched live | 2026-09-27 | `get_title_and_description` — the runtime title/description split, the key contrast with clap |
| [docs.rs/schemars — derive.JsonSchema.html](https://docs.rs/schemars/latest/schemars/derive.JsonSchema.html) | Official generated docs | current, fetched 2026-09-27 | States the doc-comment-to-description rule and the `#[schemars(description=...)]` override in the maintainer's own words |
| [zod.dev/json-schema](https://zod.dev/json-schema) | Official docs, v4 | current, fetched 2026-09-27 | `.meta()`, `z.globalRegistry`, `z.toJSONSchema()` mechanics and the "last call wins" caveat |
| `/home/mherwig/.cache/research-lang/exemplars/code-docs/colinhacks__zod/src/types.ts:365-370` (SHA `73a9a628e`) | Reference-corpus primary, pinned pre-2022 snapshot, zod 3.11.6 | 2021-12-30 | `.describe()`'s actual v3 implementation, contrasted against v4 in Contested/evolving |
| [github.com/colinhacks/zod discussion #4927](https://github.com/colinhacks/zod/discussions/4927) | Maintainer/community discussion | fetched 2026-09-27 | Confirms `.describe()`/`.meta()` are both first-class inputs to `toJSONSchema()` |
| [pydantic.dev/docs/validation/latest/api/pydantic/config/](https://pydantic.dev/docs/validation/latest/api/pydantic/config/) | Official docs (redirected from `docs.pydantic.dev/latest/api/config/`) | current, fetched 2026-09-27 | `use_attribute_docstrings` definition, version (2.7+), precedence vs. `Field(description=...)`, and the maintainer's own listed detection limitations |
| [cwe.mitre.org/data/definitions/200.html](https://cwe.mitre.org/data/definitions/200.html) | CWE catalog entry | fetched 2026-09-27 | Grounds the severity framing — and its own text flags direct CWE-200 mapping as discouraged, supporting this dive's "abstraction leak, not a CVE" framing |
| `.agents/research/code-docs-audit/census.md` §§3-5 | Fleet measurement, this program | 2026-09-27 | Primary source for every reused ID family, the golden-schema leak trace, and the 0/73 `--help` finding this dive re-runs |
| `rules/rust-quality/docs-and-tracing.md:39,44` (DOC-11, DOC-16) | Shipped lore rule | current | The existing, narrower rule this dive extends and the intra-doc-link precedent the hover boundary reuses |
| `rules/docs-quality.md:2-11` and `rules/docs-quality/plain-english.md:76` | Shipped lore rule | current | Establishes the scope boundary this dive draws in §8 |
| `rules/code-docs/checks/comment_census.py:99,428-442` | This program's own check | current | `RUST_IFACE_RE`/`_rust_regions` — the existing classifier this dive's prototype reuses rather than re-implements |
| `/home/mherwig/dev/ocx/CLAUDE.md:76-99` | Fleet primary, adopter config | 2026-09-27 | Source of the jargon wordlist (crate-ownership glossary: CAS, trampoline, singleflight, sigstore, cosign, keyless, DSSE) |
| `/home/mherwig/dev/ocx/crates/ocx_cli/src/api/data/shell_state.rs:329` and `crates/ocx_cli/src/command/toolchain_exec.rs:1136-1141` | Fleet primary | 2026-09-27 | The traced source of both the ID leak and the jargon leak, end to end to the golden schema |
| `crates/ocx_schema/tests/golden/project.json`, `reports.json` (7 files) | Fleet primary, shipped artifact | 2026-09-27 | The actually-leaking output, independently re-scanned live in this dive |
| Live commands against `/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` (golden-schema grep, 20 captured `--help` screens, source-side prototype, planted fixture) | Fleet primary, this dive's own measurement | 2026-09-27 | All numbers in §§3-6 are freshly run, not carried over from census.md |
| `.agents/research/code-docs-topic-map.md:88-90,140,481-500` | This program's synthesis | 2026-09-27 | The commission itself and the prior wave's framing of "DOC-11 works, on the wrong generator" |

Fleet grep for pydantic/zod usage (`ocx-sdk-python`, `ocx-indexbot`, `ocx-catalog`, `grimoire-indexer` package manifests and source, run 2026-09-27) counts as primary evidence for [§2](#2-what-the-fleet-actually-uses) but is not separately tabled above; commands are given inline where the finding is stated.
