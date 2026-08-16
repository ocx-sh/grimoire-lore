# Lore Hardcoding — How Tied to OCX Is the Published Corpus?

Measurement of every file under `rules/`, `skills/`, and `bundles/` in
`grimoire-lore`, scored against four hardcoding categories, then bucketed
into universal / layout-dependent / policy-bearing.

## Snapshot measured

`rules/`, `skills/`, `bundles/` are **entirely untracked** (`git status`
shows `??` on all three directories — this content has never been
committed). The tree was also being edited live by sibling agents in this
session while this measurement ran: `rules/rust-cli-contract.md` was
moved to `rules/rust-quality/cli-contract.md` and a new file,
`rules/rust-cargo/crates-of-record.md`, was added partway through. All
counts below are against the **final observed state**: 27 files, 3,879
lines. The file list is reproducible with:

```bash
find rules skills bundles -type f | sort
```

## Methodology

Every count is a Python regex scan (the sandbox's `grep` is transparently
rewritten by an installed hook — `rtk`/`ugrep` — into a non-standard
output format that breaks `wc -l` piping; `python3 -c "import re; ..."`
was used instead so the patterns below are exact and independently
re-runnable). Each pattern is given so a plain `grep -E` reproduces it on
a real shell:

| Category | Pattern | Notes |
|---|---|---|
| Layout literals | `\bsrc/\|\bcrates/\|\.github/(workflows/?)?\|\btaskfiles/\|\.cargo/\|\bscripts/\|\bxtask\b` | Directory names implying a specific repo shape |
| Angle placeholders | `<[a-z][a-z0-9_]*>` | Lower-case-only, to exclude Rust generic params (`<T>`, `<K, V>`) which are uppercase by convention |
| Named project artifacts | `\bocx\b\|\bgrim\b\|ocx-mirror\|ghcr\.io\|\bExitCode\b\|ClassifyExitCode\|BatchReport\|\bLockFile\b\|error\.rs\|exit_code\.rs\|classify\.rs\|cache\.rs\|digest\.rs\|canonical\.rs\|OciTransport\|OciAccess\|CredentialStore\|GuardedResolver\|InstallError\|PackageError\|LockVersion\|grimoire-lore\|grimoire\.lock` | Curated list, verified against the actual corpus (see below) |
| Pinned policy values | five sub-patterns, see next section | Exit-code numbers, the 25/2 method ceiling, MSRV, toolchain, the named lint set |

**Exit-code numbers** needed a boundary fix: a naive `\b(64\|65\|...\|82)\b`
matches inside `u64`, `AtomicU64`, `1.82`, `x86_64` (Rust's `\b` sits
between the digit and the adjoining letter/dot only when one side is a
digit — a preceding `1.` or `u` still leaves a false boundary at the
number's edge). The corrected pattern requires no adjoining word
character or dot on either side:

```
(?<![\w.])(64|65|69|74|75|77|78|79|80|81|82)(?![\w.])
```

Two remaining hits were hand-verified as false positives and excluded:
`data-and-formats.md:90` (`[u8; 64]`, a SHA-256 byte-array size, not an
exit code) and `package-manager-domain.md:45` (`u64 as usize is correct
on 64-bit`, a bit-width). **`current-apis.md`'s raw hits were entirely
version-number noise** (`1.75`, `1.80`, `1.81`, `1.82`, `1.87`, `1.88`)
before the boundary fix — worth flagging because it is the file where a
naive grep would most mislead a reviewer into thinking Rust-chronology
prose is exit-code coupling.

**Pinned policy values**, five sub-patterns summed:
`exitcode-numbers` (above) + `method/impl-block ceiling` (`\*\*2\*\*
inherent|...25...method...`) + `MSRV`/`rust-version` + `rust-toolchain.toml`/
`channel = `/`toolchain` + the fourteen named LINT-05 restriction lints
plus `pedantic`, `await_holding_lock`, `await_holding_refcell_ref`,
`unreachable_pub`. This is a **floor**, not a ceiling: files that
self-declare a "Pinned Decisions" section in prose (`async.md`,
`performance.md`, `security.md`, `tui.md`) contain genuine pins — a
runtime-flavor choice, a hasher choice, a TLS-backend choice — that no
regex here catches because they aren't numeric or from the fixed lint
list. Where the mechanical count and the file's own self-labelling
disagree, the bucket classification below follows the self-labelling,
not the regex.

## Per-file table

| File | Lines | Layout literals | Angle placeholders | Named artifacts | Pinned values |
|---|---:|---:|---:|---:|---:|
| `bundles/rust-essentials.toml` | 26 | 0 | 1 | 5 | 1 |
| `rules/rust-cargo.md` | 187 | 20 | 7 | 2 | 70 |
| `rules/rust-cargo/crates-of-record.md` | 107 | 2 | 5 | 0 | 0 |
| `rules/rust-quality.md` | 111 | 0 | 1 | 3 | 5 |
| `rules/rust-quality/api-and-idioms.md` | 152 | 1 | 24 | 0 | 2 |
| `rules/rust-quality/architecture.md` | 139 | 7 | 22 | 0 | 6 |
| `rules/rust-quality/async.md` | 133 | 14 | 0 | 0 | 6 |
| `rules/rust-quality/cli-contract.md` | 150 | 7 | 5 | 18 | 19 |
| `rules/rust-quality/current-apis.md` | 120 | 2 | 5 | 0 | 8 |
| `rules/rust-quality/data-and-formats.md` | 133 | 0 | 6 | 6 | 0 |
| `rules/rust-quality/docs-and-tracing.md` | 168 | 11 | 0 | 0 | 1 |
| `rules/rust-quality/durable-state.md` | 169 | 0 | 13 | 0 | 0 |
| `rules/rust-quality/errors.md` | 132 | 19 | 1 | 13 | 8 |
| `rules/rust-quality/package-manager-domain.md` | 136 | 11 | 10 | 5 | 2 |
| `rules/rust-quality/performance.md` | 157 | 2 | 1 | 11 | 3 |
| `rules/rust-quality/platform-and-paths.md` | 169 | 3 | 35 | 0 | 0 |
| `rules/rust-quality/security.md` | 170 | 3 | 2 | 0 | 0 |
| `rules/rust-quality/testing.md` | 161 | 24 | 2 | 4 | 0 |
| `rules/rust-quality/tui.md` | 156 | 10 | 2 | 0 | 0 |
| `skills/rust-restructure/SKILL.md` | 173 | 3 | 0 | 2 | 2 |
| `skills/rust-restructure/references/parity-harness.md` | 136 | 0 | 1 | 0 | 0 |
| `skills/rust-restructure/references/transforms.md` | 159 | 1 | 3 | 0 | 3 |
| `skills/rust-restructure/references/work-packages.md` | 137 | 0 | 1 | 0 | 0 |
| `skills/rust-review/SKILL.md` | 171 | 3 | 0 | 3 | 0 |
| `skills/rust-review/references/diff-integrity.md` | 85 | 1 | 0 | 0 | 3 |
| `skills/rust-review/references/dimensions.md` | 223 | 0 | 0 | 0 | 1 |
| `skills/rust-review/references/evidence-and-severity.md` | 119 | 0 | 7 | 0 | 0 |
| **TOTAL** | **3,879** | **144** | **154** | **72** | **140** |

Pinned-value sub-breakdown across the corpus: 21 real exit-code-number
hits (all in `cli-contract.md` and `package-manager-domain.md`; the false
positives are already excluded above), 6 method/impl-ceiling hits, 10
MSRV hits, 26 toolchain hits, 77 named-lint hits (49 of those in
`rust-cargo.md` alone, from the LINT-05 restriction list and the lints
stanza).

**Two of the task's own example tokens do not occur in the corpus at
all**: `ocx_lib`, `ocx_cli`, and `PackageManager` — zero hits, verified by
direct search. `classify.rs` likewise does not occur (the exit-code
classifier is discussed as a concept, never as a filename). Report this
plainly rather than silently substituting a token that does appear: the
example list in the brief was illustrative, not a verified inventory.

## Angle-bracket placeholders

39 distinct placeholders occur, 154 times total:

```
<artifact> <bin> <builder> <class> <classifier> <code> <commit> <crate>
<crate_underscored> <diff> <dimension> <field> <file> <finding> <format>
<id> <ingest> <int> <invariant> <lib> <line> <lint> <method> <mod>
<module> <name> <new_crate> <one> <path> <pid> <reason> <slug> <src>
<store> <target> <test> <u8> <version> <why>
```

**None of the 27 files ever defines what a placeholder means.** Checked
directly: every occurrence of `<src>` (the single most common one, used
as a bare argument to `rg`/`grep` in a verification cell — e.g.
`` rg -n '\.join\(' <src> `` in `platform-and-paths.md`) appears with zero
surrounding gloss. A corpus-wide search for defining language
(`placeholder`, `substitute`, `stands for`, `means your`) turns up only
unrelated prose uses of those words (`api-and-idioms.md`'s "the
placeholder allocates nothing", `tui.md`'s "render a placeholder"). The
reader is expected to infer, from context alone, that `<src>` means
"this crate's source root," `<diff>` means "the diff under review,"
`<store>` means "the CAS root," etc. — a convention every file uses and
no file states.

## Named project artifacts, verified

Not every candidate from the prompt's own example list survives contact
with the text. Verified occurrence counts:

| Token | Count | Where |
|---|---:|---|
| `ExitCode` | 26 (corpus) | Overwhelmingly `cli-contract.md`; std's own `std::process::ExitCode` shares the bare word, so this figure over-counts the project-specific enum slightly — the two are never ambiguous in context |
| `ocx` (bare word) | 15 | `cli-contract.md`, `performance.md` |
| `grimoire` / `grimoire-lore` | 7 | Almost entirely the `repository:` frontmatter field (self-referential — this package's own source URL, not coupling to a *different* downstream project) |
| `grim` (bare word) | 4 | `cli-contract.md`, `performance.md` |
| `ocx-mirror` | 3 | `cli-contract.md`, `performance.md` |
| `ghcr.io` | 3 | `bundles/rust-essentials.toml` (this package's own publish target), `performance.md` ×2 (the downstream registry OCX pulls from) |
| `ClassifyExitCode` | 1 | `errors.md`, offered as one of two acceptable shapes, not mandated |
| `BatchReport` | 2 | `package-manager-domain.md`, the mandated batch-report type name |
| `ocx_lib`, `ocx_cli`, `PackageManager`, `classify.rs` | 0 | Do not occur — see above |

The `repository:` frontmatter line (`https://github.com/ocx-sh/grimoire-lore`)
appears in six files' YAML/TOML headers. This is the artifact identifying
its own source, the same as a `package.json` `repository` field — it is
not evidence of coupling to a *consuming* project and is excluded from
the "worst offender" judgment below.

## The 3 worst offending lines (verbatim)

**1. `rules/rust-cargo.md:54`** — twelve pinned lint names on one line,
the single densest policy line in the corpus:

> `| LINT-05 | Name these restriction lints individually at `warn`: `unwrap_used`, `expect_used`, `indexing_slicing`, `panic_in_result_fn`, `unwrap_in_result`, `get_unwrap`, `dbg_macro`, `todo`, `unimplemented`, `mem_forget`, `string_slice`, `integer_division`. `arithmetic_side_effects` is deferred to LINT-19 wave 4 and, when it lands, is scoped by an `arithmetic-side-effects-allowed` per-type list rather than blanket-suppressed — clippy's own tracker calls it really noisy. | `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` exits 0; if `arithmetic_side_effects` is on, `clippy.toml` carries a non-empty `arithmetic-side-effects-allowed` | MUST |`

**2. `rules/rust-quality/errors.md:89`** — the exit-code type leaking
into a *different* file, three times in one line:

> `| ERR-12 | One `#[repr(u8)] #[non_exhaustive] ExitCode` enum per workspace, sysexits-aligned, with `From<ExitCode> for std::process::ExitCode`. A separate binary with its own taxonomy needs an ADR. | `rg -n 'ExitCode::from\([0-9]' src/` empty; one `enum ExitCode` per workspace | MUST |`

**3. `rules/rust-cargo.md:106`** — MSRV and toolchain-pin policy
compressed into one sentence:

> `| TOOL-02 | Declare `rust-version` in `[workspace.package]` equal to the pinned channel. Add no MSRV matrix job — this project distributes binaries, not source, so an MSRV floor below the pinned channel is a fiction nobody consumes. | `rg -n 'rust-version' Cargo.toml` matches the toolchain channel | SHOULD |`

## Bucket classification

Every rule/skill file explicitly frames itself, in its own opening
paragraphs, as "mechanism" (portable) vs. "pinned decision" (this
project's call) — 25 of the 26 rule/skill files use that framing or an
equivalent "Pinned Decisions" header; `durable-state.md` is the sole file
that never uses the word "pinned" at all. That self-labelling, not the
raw regex counts, is what decides the bucket below — the regex counts
under-detect qualitative pins (a runtime-flavor choice, a TLS-backend
choice, a hasher choice) that carry no number or fixed name to grep for.

### A. Genuinely universal (7 files, 1,018 lines)

Would be correct verbatim in any Rust repo; no OCX-specific *value* is
required to use them.

- `rules/rust-quality/api-and-idioms.md` — its one self-declared pin is a
  *principle* ("eager-derive is MUST at any serialization boundary"), not
  a project-specific value.
- `rules/rust-quality/durable-state.md` — zero self-declared pins; CAS/
  durable-write engineering is the same problem in any tool with a
  content-addressed store.
- `rules/rust-quality/docs-and-tracing.md` — rustdoc contract and comment
  registers are universal; OBS-20's `oci.*` field-naming convention is
  the one domain-specific pocket (irrelevant, not wrong, for a non-OCI
  tool).
- `rules/rust-quality/platform-and-paths.md` — cross-platform path/
  filesystem facts (Windows reparse points, NTFS case-folding, the
  1023-hardlink cap) are OS facts, not OCX policy.
- `rules/rust-quality/data-and-formats.md` — its pin is a *decision axis*
  ("strict vs. tolerant by producer, not per-project"), portable as
  written.
- `rules/rust-quality/current-apis.md` — Rust/crate-ecosystem chronology
  (when `rand::gen()` was renamed, when edition 2024 shipped); the one
  pin (accept aws-lc-rs) is a single flagged paragraph, not the file's
  substance.
- `rules/rust-cargo/crates-of-record.md` — the ECO-01…08 selection
  methodology is fully general; most of "the table" is current
  Rust-ecosystem consensus (clap over structopt, rustls over native-tls)
  that would serve any Rust CLI, with a handful of OCI-specific rows.

### B. Layout-dependent only (8 files, 1,203 lines)

The methodology is universal; only the illustrative paths (`src/`,
`crates/`) and, for the review skill, its companion rule-ID citations
(`ARCH-01`, `ERR-19`, …) would need retargeting. These are the
templating candidates.

- `skills/rust-restructure/SKILL.md` + `references/parity-harness.md`,
  `references/transforms.md`, `references/work-packages.md` — building a
  parity oracle, sizing work packages, and the four transform recipes
  apply to restructuring any Rust codebase; every shell example hardcodes
  `src/`.
- `skills/rust-review/SKILL.md` + `references/diff-integrity.md`,
  `references/dimensions.md`, `references/evidence-and-severity.md` —
  the review process (scope, find, verify, diff-integrity, report) is
  general; `dimensions.md` additionally cites this corpus's own rule IDs
  throughout, which is a real (if narrow) coupling beyond pure layout —
  a fork of the checklist for a project without those IDs would need to
  either adopt the rule corpus too or strip the citations.

### C. Policy-bearing (11 files, 1,632 lines)

The content itself encodes an OCX decision; a different project needs a
different *value*, not a different path.

- `rules/rust-quality/cli-contract.md` — the flagship: the pinned
  0/1/64–82/128+N exit-code table.
- `rules/rust-cargo.md` — the pinned lint selection (wholesale pedantic,
  the 14 named restriction lints), exact toolchain pinning, the
  CI/release specifics.
- `rules/rust-quality.md` — the index, but its "Non-Negotiables" restate
  two of the pins as blocking rules directly (`ExitCode`, the 25-method/
  2-impl-block ceiling), not merely link to them.
- `rules/rust-quality/architecture.md` — ARCH-03's 25-method/2-impl-block
  ceiling and the ARCH-19–21 `crates/<name>-types/…` shape are both
  explicitly self-labelled "a pinned decision, not a per-project
  derivation"; the rest of the file (dispatch ladder, trait rules,
  visibility) is closer to bucket A.
- `rules/rust-quality/errors.md` — "thiserror + anyhow and nothing else"
  is an explicit pin (ERR-25 names and bans the alternatives: eyre,
  miette, snafu, error-stack), plus direct exit-code cross-references
  (101, 128+N).
- `rules/rust-quality/async.md` — explicit "Pinned Decisions" header:
  `multi_thread` runtime default, `std::sync` lock default, no
  `parking_lot`.
- `rules/rust-quality/security.md` — explicit pinned-decisions list:
  `unsafe_code = "forbid"`, rustls-only, `cargo deny check` as the sole
  advisory gate, `overflow-checks = true`, digest-verification-without-
  signature-verification.
- `rules/rust-quality/testing.md` — explicit pinned crate set (rstest,
  assert_cmd, wiremock, proptest, cap-std) with a named exclusion list
  (insta, trycmd, serial_test, mockall, loom…).
- `rules/rust-quality/performance.md` — explicit "Pinned Decisions"
  header (hyperfine as harness, `opt-level = "s"` over `3`, `panic =
  "abort"` banned, keep SipHash, no mmap/BLAKE3) plus measured numbers
  presented as this project's evidence (33.4 MB → 18.6 MB, etc.).
- `rules/rust-quality/package-manager-domain.md` — explicit pinned
  decisions (continue-and-collect batch default, no partial-success exit
  code) plus direct exit-code cross-references (`TempFail`, 75;
  `NotFound`, 79).
- `rules/rust-quality/tui.md` — explicit four pinned decisions (TEA
  architecture, `EventStream` + `select!`, no `insta`, strip U+200D).

### Unclassified: `bundles/rust-essentials.toml`

Not a Rust-quality rule at all — it is grimoire/grim bundle-manifest
metadata (which rules and skills ship together, and the "members carry
no tag" packaging policy). Its `ghcr.io`/`grimoire.lock` references are
about *this artifact's own* distribution mechanism, not about the
downstream Rust project the rules are written for. Excluded from A/B/C
because the question the bucket answers ("would this be correct in a
different Rust repo?") doesn't apply to it.

## Bottom line

3,879 lines, 27 files. 144 filesystem-layout literals, 154 angle-bracket
placeholders (39 distinct, never once defined), 72 named-project-artifact
references (two of the brief's own example tokens — `ocx_lib`/`PackageManager`
— don't occur at all), 140 pinned-policy-value hits by mechanical count
(undercounting the qualitative pins the files' own prose self-declares).
By file count the corpus splits roughly 26% universal (A), 30% layout-only
(B), 41% policy-bearing (C), plus one non-rule metadata file (1,018 /
1,203 / 1,632 / 26 lines respectively — 26% / 31% / 42% / 1% by line
count, essentially the same split: the policy-bearing files are not just
more numerous, they also run long). This is not a 12-lines-in-2-files problem:
the exit-code table is one flagship, but ten more files each carry a
self-declared, non-trivial pinned decision, and the review/restructure
skills carry a lighter but real layout dependency across all eight of
their files.
