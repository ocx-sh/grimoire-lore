---
title: Dependency Liveness Verification and the Deprecated-Crate Denylist
topic: dependency-liveness-and-deprecated-crates
agent: rust-ecosystem-researcher
model: sonnet
date_researched: 2026-08
sources_count: 19
scope: >
  How an autonomous coding agent decides whether a Rust crate or cargo-subcommand is alive
  before recommending or adding it, plus a concrete denylist for the OCX/Grimoire family
  (grim, ocx, ocx-mirror, ocx-sdk-python's Rust core). Boundary: this topic owns crate/tool
  SELECTION (should we depend on X at all, is X dead, what replaces it). It does NOT own
  stale API call sites inside crates that are otherwise fine (e.g. `rng.gen()` on a current
  `rand`, `LazyLock` migration, hyper 0.14→1.x body-trait churn) — that is
  `edition-2024-and-stale-api-recall`'s territory. If a crate is alive but its API surface
  used in-tree is outdated, route it there; if the crate itself should not be used, it
  belongs here.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `https://crates.io/api/v1/crates/<name>` returns real JSON (`newest_version`,
   `max_stable_version`, `updated_at`, `downloads`, `description`, `yanked` per version)
   with no auth, no rate-limit wall for single lookups, and no JS execution required.
2. `https://crates.io/crates/<name>` (the human URL) is a client-rendered Ember SPA — a
   fetch/curl against it returns an empty shell with only a `<title>` tag; an agent must
   never treat "I fetched the crates.io page" as evidence without using the `/api/v1/` form.
3. lib.rs adds three things the raw JSON API does not: an explicit "unmaintained" /
   "deprecated" banner with the reason, a curated "See also" list of replacement crates, and
   monthly/weekly download-trend numbers — but lib.rs is HTML-only with no documented JSON
   or feed endpoint, so it costs an HTML fetch-and-read per crate, not a cheap API call.
4. Two of the JSON API's own fields double as a free deprecation signal with zero HTML
   parsing: a `newest_version` string ending in the literal `+deprecated` suffix (e.g.
   `serde_yaml` → `"0.9.34+deprecated"`), and a `description` field that sometimes states
   the deprecation outright (e.g. `async-std` → `"Deprecated in favor of \`smol\`"`).
5. Download count measures historical adoption, never current maintenance. `cargo-husky`
   has 3.23M lifetime downloads and a last release of 2020-01-21; `cross` has 6.17M and a
   last crates.io release of 2023-02-04; both numbers keep climbing from transitive/CI reuse
   of old lockfiles long after the source went quiet.
6. Staleness thresholds are category-dependent, not a single number. A fast-moving CLI
   category (file watchers, task runners, formatters, async runtimes) going 18+ months
   without a release is a real signal given how fast their surrounding ecosystem (Rust
   toolchain, OS APIs, competing tools) moves. A small, API-stable instrumentation/utility
   library — `dhat` (heap profiler, last release 2024-02-04, ~2.5 years old as of
   2026-08) — has nothing left to change; age alone is not evidence there.
7. `serde_yaml` (the dtolnay original) is archived and its README says verbatim "This
   project is no longer maintained," last published 2024-03-25. `grimoire/Cargo.toml`
   still declares `serde_yaml = "0.9"`; `ocx/Cargo.toml` already migrated to
   `serde_yaml_ng = "0.10.0"`.
8. `serde_yaml_ng` is a maintained, API-compatible fork (creator states the explicit goal
   "to be compatible as much as possible with David Tolnay's original library"). Grimoire's
   only serde_yaml usage is plain frontmatter parsing (`serde_yaml::from_str`/`to_string`
   on structs and a `BTreeMap<String, serde_yaml::Value>`, plus building `serde_yaml::Value`
   trees for vendor-config emission) — no multi-document YAML, no custom tag handling — so
   the migration is a drop-in.
9. The lowest-diff migration path for grimoire is Cargo's package-rename syntax —
   `serde_yaml = { package = "serde_yaml_ng", version = "0.10" }` — which needs zero source
   edits because every `serde_yaml::` call site keeps compiling under the renamed local
   crate name. ocx did not use this trick (it imports `serde_yaml_ng::` directly); either
   approach works, but the rename trick is the smaller diff for grimoire specifically.
10. `serde_yaml` does not re-enter either tree transitively: grimoire's own `Cargo.lock`
    shows exactly one entry (`serde_yaml 0.9.34+deprecated`, the direct dependency itself);
    ocx's `Cargo.lock` has no `serde_yaml` entry at all, only `serde_yaml_ng`.
11. The YAML-fork ecosystem is fragmented, not settled: `serde_yaml_ng` (Acatton, first
    release 2024-05, still-current 0.10.0) and `serde_norway` (cafkafk, hard fork,
    0.9.42 released 2024-12-21) are both live, both API-compatible, and lib.rs lists them
    as alternatives to each other rather than one being the anointed successor. Recommend
    grimoire match ocx's existing choice (`serde_yaml_ng`) for family consistency, and flag
    `serde_norway` as worth re-checking in a future sweep, not switch to now.
12. `bincode` is a genuinely surprising case: crates.io shows a fresh `3.0.0` release dated
    2025-12-16, which looks alive — but that release is a deliberate poison pill (docs-only,
    a compiler error on use) shipped because "the bincode team has taken the decision to
    cease development permanently" after a doxxing/harassment incident against the
    maintainer. Confirmed independently via RustSec `RUSTSEC-2025-0141` (issued
    2026-01-07) and lib.rs. Recency of a release is not proof of health — read what the
    release actually contains.
13. Recommended `bincode` replacements per the RustSec advisory: `wincode`, `postcard`,
    `bitcode`, `rkyv` (rkyv for zero-copy/IPC use cases specifically).
14. `cross` (cross-rs/cross) had its last crates.io publish on 2023-02-04 per two
    independent primary sources (crates.io API `updated_at`, and lib.rs's own last-release
    field) despite 6.17M downloads and an active-looking GitHub org — treat GitHub commit
    activity and crates.io publish cadence as two separate signals; a tool can look alive on
    GitHub while its published binary/crate is stale.
15. Not every crate on the raw candidate list is actually dead. `cargo-license` (last
    release 2025-07-29) and `cargo-bloat` (2024-05-10) both show ongoing releases with no
    unmaintained notice on lib.rs or GitHub — they are candidates for "redundant with a tool
    already in this repo" (cargo-deny already covers license auditing) or "verify before
    adding, don't hard-ban," not for the denylist proper. `cargo-make` (last release
    2025-01-18) is similarly alive-but-slow; the actual reason to avoid it here is that this
    family already standardized on Taskfile, not that cargo-make is unmaintained.
16. `cargo-watch` is unambiguously dead: GitHub-archived 2025-01-18, README states "Cargo
    Watch is on life support: it will not receive further updates." Maintainer's own
    recommended successors: `bacon` (Cargo-aware, richer TUI/pager) or `watchexec`
    (general-purpose file watcher).
17. `tui-rs` (crate name `tui` on crates.io) last released 2022-08-14; its own README says
    "I'm actively looking for help maintaining this crate" — a maintainer distress signal,
    weaker than an explicit deprecation but still disqualifying for new adoption. Replacement:
    `ratatui`, the community fork already implied by this family's toolchain (ratatui is
    already in the project's declared stack).
18. `structopt` is not abandoned so much as absorbed: its own docs say "structopt is now in
    maintenance mode" because "structopt features are integrated into" clap v3. Replacement
    is clap's `derive` feature, not a third-party crate.
19. `fs2` (last release 2018-01-06) has no explicit deprecation notice but is 8+ years stale
    with a listed successor, `fs4`, that adds async-runtime support fs2 never gained.
20. `dotenv` (last release 2019-10-21) is explicitly marked unmaintained on lib.rs;
    `dotenvy` is the maintained fork and is the crates.io-listed direct successor.

## Findings

### 1. The crates.io JSON API vs. the human SPA

`curl -s https://crates.io/api/v1/crates/serde_yaml` returns a full JSON document with
`crate.newest_version`, `crate.max_stable_version`, `crate.updated_at`,
`crate.downloads`, `crate.description`, and a `versions[]` array carrying `yanked` per
version — no authentication, no headers beyond a `User-Agent`, confirmed live against
14+ crate names during this research
([crates.io API, `serde_yaml`](https://crates.io/api/v1/crates/serde_yaml)).

By contrast, `curl -s https://crates.io/crates/serde_yaml` (the page a human clicks
through to) returns an HTML document under 200 bytes containing only a `<title>` tag and
no `<script>` tags in the raw response — confirmed by direct `curl` in this research and
independently by fetching the same URL through a rendering fetch tool, which reported the
page as "an empty JavaScript application shell" with data populated client-side after
load. An agent that fetches the human URL and finds no version string must not conclude
the crate doesn't exist — it must retry against `/api/v1/crates/<name>`.

### 2. What lib.rs adds, and its cost

lib.rs aggregates crates.io data plus curation: an explicit maintenance banner text
("This project is no longer maintained," or narrower phrasing like tui-rs's "I'm actively
looking for help maintaining this crate"), a "See also" list of comparable/successor
crates, and download-trend numbers (weekly/monthly, not just lifetime total). Example for
`serde_yaml`: banner "This project is no longer maintained," See-also list including
`serde_yaml_ng`, `serde-saphyr`, `serde_norway`, `ron`
([lib.rs, `serde_yaml`](https://lib.rs/crates/serde_yaml)).

lib.rs's own about page states the site design goal as "There's no JavaScript anywhere"
and describes no JSON/feed API — it is HTML-only
([lib.rs, About](https://lib.rs/about)). This means lib.rs is a per-crate HTML fetch
(one WebFetch call each), not a batchable API call the way crates.io is. For a denylist
sweep across many candidate crates, check the crates.io JSON fields first (cheap,
scriptable) and only fetch lib.rs for crates that need the qualitative "why" and "what
replaces it" that raw JSON doesn't carry.

Two crates.io JSON fields double as a free deprecation signal, no lib.rs fetch needed:
- `newest_version` ending in the literal string `+deprecated` — this is dtolnay's own
  convention; `serde_yaml`'s `newest_version` is literally `"0.9.34+deprecated"`.
- `description` stating the deprecation directly — `async-std`'s crates.io `description`
  field is `"Deprecated in favor of \`smol\` - Async version of the Rust standard library"`.

docs.rs surfaces the same deprecation notice on its crate landing page
(`https://docs.rs/crate/serde_yaml/latest` shows "(This project is no longer
maintained.)" and titles the page with the `+deprecated` suffix) — a third confirming
source with the same zero-auth-fetch profile as crates.io.

### 3. Staleness thresholds by category

No single "N months = dead" number holds across categories; the evidence gathered here
splits cleanly into two behaviors:

- **Fast-moving CLI tooling** (file watchers, task runners, formatters, cross-compilers):
  these track a moving target — new Rust editions, new OS APIs, competitors shipping
  features. `cargo-watch` went from actively maintained to GitHub-archived with an
  explicit "life support" README within a definable window; `cross`'s crates.io silence
  since 2023-02-04 while GitHub issues keep accumulating is the shape of decline to watch
  for. For this category, 12–18 months without a release plus any maintainer-distress
  language ("looking for help maintaining," open PRs unmerged for a year) is a strong
  signal worth an agent pausing on.
- **Small, API-stable libraries** (instrumentation, single-purpose utility crates):
  `dhat` last released 2024-02-04 (~2.5 years stale as of 2026-08) with zero maintenance
  drama, no lib.rs unmaintained banner, and a description matching a scoped, finished
  tool — heap-profiling hookups don't need quarterly churn. Age here is not a signal; the
  check that matters is whether the crate still builds against the current toolchain, not
  whether it shipped recently
  ([crates.io API, `dhat`](https://crates.io/api/v1/crates/dhat)).

The actionable split: check the *category* before applying an age threshold. A CLI
dev-dependency with no releases in 18 months and no open-source successor in active
development is a stronger red flag than a leaf instrumentation crate with the same gap.

### 4. The download-count trap, worked examples

`cargo-husky`: crates.io shows `downloads: 3228069`, `updated_at: 2020-01-21`. lib.rs
confirms the same last-release date and adds that it's still used by "540 crates" at
"~236,033 monthly downloads" — the download count keeps climbing purely from downstream
crates re-resolving an already-pinned dependency, not from any new activity upstream
([crates.io API, `cargo-husky`](https://crates.io/api/v1/crates/cargo-husky);
[lib.rs, `cargo-husky`](https://lib.rs/crates/cargo-husky)).

`cross`: crates.io shows `downloads: 6168747`, `updated_at: 2023-02-04T17:28:19Z` for the
current `0.2.5`. lib.rs independently reports the same last-release date and ~100k
downloads/month ongoing
([crates.io API, `cross`](https://crates.io/api/v1/crates/cross);
[lib.rs, `cross`](https://lib.rs/crates/cross)). Two independent primary sources agree on
the same stale date despite continuing high download volume — this is the clean
worked example that "downloads" is a lagging measure of *past* adoption, and the field to
actually check for currency is `updated_at` / last-release date.

### 5. The denylist, confirmed against primary sources

| Crate/tool | Status (primary source) | Last release | Replacement |
|---|---|---|---|
| `serde_yaml` | Archived, "no longer maintained" ([GitHub](https://github.com/dtolnay/serde-yaml); [crates.io](https://crates.io/api/v1/crates/serde_yaml)) | 2024-03-25 | `serde_yaml_ng` (family already uses it in ocx) |
| `bincode` | Unmaintained per maintainer decision post-harassment incident; `RUSTSEC-2025-0141` ([RustSec](https://rustsec.org/advisories/RUSTSEC-2025-0141.html); [GitHub](https://github.com/bincode-org/bincode)) | 3.0.0 tag 2025-12-16 is a poison-pill docs-only release | `postcard`, `bitcode`, `rkyv`, `wincode` |
| `async-std` | crates.io description itself: "Deprecated in favor of `smol`" ([crates.io](https://crates.io/api/v1/crates/async-std); [lib.rs](https://lib.rs/crates/async-std)) | 1.13.2 / 2025-08-15 | `smol`, or `tokio` (already the family standard) |
| `ansi_term` | lib.rs: `[unmaintained]` | 2019-09-02 | `anstyle`/`anstream`, `owo-colors`, or `nu-ansi-term` |
| `dotenv` | lib.rs: "unmaintained" | 2019-10-21 | `dotenvy` |
| `tui-rs` (`tui`) | README: "actively looking for help maintaining this crate" ([lib.rs](https://lib.rs/crates/tui)) | 2022-08-14 | `ratatui` |
| `structopt` | Own docs: "now in maintenance mode," folded into clap v3 | 2022-01-18 | `clap` derive |
| `fs2` | No notice, but 8-year gap and listed successor | 2018-01-06 | `fs4` |
| `cargo-watch` | GitHub-archived 2025-01-18, "on life support" ([GitHub](https://github.com/watchexec/cargo-watch)) | 8.5.3 / 2024-10-02 | `bacon` or `watchexec` |
| `cargo-make` | No notice; alive but slow, redundant with this family's Taskfile | 2025-01-18 | Taskfile (already in use) |
| `cargo-husky` | No notice; 6-year release gap, downstream churn only | 2020-01-21 | `lefthook`, `rusty-hook` |
| `cargo-license` | No notice; alive, but redundant here | 2025-07-29 | `cargo-deny` (already in use) |
| `cargo-bloat` | No notice; alive, ~2yr gap, no direct successor for its non-WASM use case | 2024-05-10 | verify-before-use, no forced replacement |
| `cross` | Crates.io publish stale since 2023-02-04 despite active GitHub org ([crates.io](https://crates.io/api/v1/crates/cross); [lib.rs](https://lib.rs/crates/cross)) | 0.2.5 / 2023-02-04 | verify GitHub HEAD vs. crates.io release before depending on published crate; consider `cargo-zigbuild` for the family's cross-compile needs |

Note the last five rows are not all "dead" — `cargo-license`, `cargo-bloat`, and
`cargo-make` show no maintenance-status notice on either GitHub or lib.rs and continue to
release. They belong in this table because the family already has an equivalent tool
in-tree (cargo-deny, Taskfile) or because their staleness needs a human/agent check before
adoption, not because a primary source calls them dead. Only `serde_yaml`, `bincode`,
`async-std`, `ansi_term`, `dotenv`, `tui-rs`, `structopt`, `cargo-watch`, and `cross` (via
the download-count trap, §4) carry an explicit maintainer-stated or archived status.

### 6. The live defect: `serde_yaml` in grimoire

`grimoire/Cargo.toml:32` declares `serde_yaml = "0.9"`. `grimoire/Cargo.lock` resolves it
to `serde_yaml 0.9.34+deprecated` — the deprecation is baked into the resolved version
string, visible in `cargo tree` output without any network call. `ocx/Cargo.toml:69`
already declares `serde_yaml_ng = "0.10.0"`, used directly as `serde_yaml_ng::from_str`
in `ocx/crates/ocx_lib/src/package/description.rs:165`.

grimoire's serde_yaml usage (10 source files) is entirely: parsing YAML frontmatter
blocks into typed structs (`RuleFrontmatter`, `SkillFrontmatter`, `AgentFrontmatter`) via
`serde_yaml::from_str`, round-tripping via `serde_yaml::to_string`, an `extra: BTreeMap<String,
serde_yaml::Value>` catch-all field, and building `serde_yaml::Value` trees to emit
vendor-specific config (opencode, copilot, cursor, gemini, codex, kiro, antigravity
installers). No multi-document streams, no custom `!tag` handling, no
`serde_yaml::with::singleton_map` or other 0.9-specific escape hatches were found in the
grep. This is exactly the surface `serde_yaml_ng` targets for compatibility.

`grimoire/Cargo.lock` contains exactly one `serde_yaml` entry (the direct dependency
itself) — no other crate in grimoire's dependency graph pulls the deprecated crate in
transitively. `ocx/Cargo.lock` has zero `serde_yaml` entries, only `serde_yaml_ng` — full
confirmation neither tree carries a hidden second copy.

Migration cost: change `grimoire/Cargo.toml:32` to
`serde_yaml = { package = "serde_yaml_ng", version = "0.10" }` (Cargo's dependency-rename
syntax) — every existing `serde_yaml::…` call site in the 10 affected files keeps
compiling unmodified, because the local crate name `serde_yaml` is preserved while the
resolved package changes. This is a one-line Cargo.toml diff plus a `cargo update -p
serde_yaml_ng` (or fresh lock regen), no source-file edits, no behavior differences
expected given the usage pattern confirmed above. Alternatively, mirror ocx exactly
(`serde_yaml_ng = "0.10"` + rename call sites to `serde_yaml_ng::`) for textual
consistency with ocx's source, at the cost of touching 10 files instead of one line.

### 7. `bincode` re-confirmed against a second primary source

crates.io alone would mislead here: `newest_version: "3.0.0"`, `updated_at:
"2025-12-16T21:34:14Z"` looks like a live, recent release. The GitHub repo confirms it's
archived (`"archived by the owner on Aug 15, 2025"`) and states the true 3.0.0 payload is
a documentation-only release with a deliberate compiler error, migrated to a sourcehut
mirror. The independent second primary source, the RustSec Advisory Database, carries
`RUSTSEC-2025-0141` ("Bincode is unmaintained"), issued 2026-01-07, last modified
2026-01-16, classification `INFO`, affected versions "all," with the description: "Due to
a doxxing and harassment incident, the bincode team has taken the decision to cease
development permanently," and lists `wincode`, `postcard`, `bitcode`, `rkyv` as
alternatives ([RustSec RUSTSEC-2025-0141](https://rustsec.org/advisories/RUSTSEC-2025-0141.html);
[GitHub bincode-org/bincode](https://github.com/bincode-org/bincode); [lib.rs
`bincode`](https://lib.rs/crates/bincode)). Two independent primary sources (GitHub repo
state + RustSec advisory DB) agree; the crate-defaults scout's surprise was warranted —
"most recent release date" alone is actively misleading for this specific crate.

## Normative guidance candidates

1. **Before adding any new Rust dependency, query
   `https://crates.io/api/v1/crates/<name>` and read `updated_at`, `newest_version`,
   and `description` — never fetch the human `crates.io/crates/<name>` URL and treat an
   empty result as "crate not found."**
   Rationale: the human URL is a JS SPA; a fetch tool without JS execution gets a
   near-empty shell, which an agent could misread as the crate not existing.
   VERIFICATION: `curl -s https://crates.io/crates/<name> | wc -c` returns well under
   1KB and contains no version string; the same crate's `/api/v1/crates/<name>` returns
   valid JSON with a `crate.newest_version` field.

2. **Treat `newest_version` ending in `+deprecated`, or a `description` containing
   "deprecated"/"unmaintained", as an immediate hard stop — do not add the crate,
   regardless of download count.**
   Rationale: this is the maintainer's own explicit signal, not an inference from
   staleness.
   VERIFICATION: `curl -s https://crates.io/api/v1/crates/<name> | grep -Eio
   '"newest_version":"[^"]*deprecated[^"]*"|"description":"[^"]*(deprecat|unmaintain)[^"]*"'`
   is non-empty.

3. **Never cite `downloads` as evidence of current maintenance; cite `updated_at` /
   last-release date instead.**
   Rationale: `cargo-husky` (3.23M downloads, dead since 2020) and `cross` (6.17M
   downloads, no crates.io release since 2023-02-04) both show downloads keep climbing
   long after the source went quiet — it measures the install base, not the pulse.
   VERIFICATION: for any dependency justified in a PR description by a download number,
   the same PR must also cite `updated_at` from the API response.

4. **Apply staleness thresholds by category, not one number: ≥12–18 months with no
   release AND maintainer-distress language ("looking for help maintaining," archived,
   "life support") is disqualifying for fast-moving CLI/tooling categories (watchers,
   task runners, formatters, cross-compilers, async runtimes). The same age alone is not
   disqualifying for small API-stable single-purpose libraries with no open
   maintenance-status flag.**
   Rationale: `dhat` (2.5 years stale, no flag, scoped stable API) vs. `cargo-watch`
   (archived, explicit "life support" notice) show the same "months since release"
   metric means different things by category.
   VERIFICATION: before flagging a crate as stale on age alone, check lib.rs or GitHub
   for an explicit maintenance-status statement; age without a stated reason is not
   sufficient grounds to reject a leaf utility crate.

5. **Denylist the following crates/tools outright — do not add them to any Cargo.toml
   or CI/Taskfile step in this family — using the greps below to catch existing or
   attempted use:**
   Rationale: table in Findings §5 confirms each against a primary source with a named
   maintained replacement.
   VERIFICATION (run each grep from repo root; a non-empty result is a finding to fix):
   - `serde_yaml` → `grep -rn '^serde_yaml[[:space:]]*=' $(find . -name Cargo.toml)`
   - `bincode` → `grep -rn '^bincode[[:space:]]*=' $(find . -name Cargo.toml)`
   - `async-std` → `grep -rn '^async-std[[:space:]]*=' $(find . -name Cargo.toml)`
   - `ansi_term` → `grep -rn '^ansi_term[[:space:]]*=' $(find . -name Cargo.toml)`
   - `dotenv` (not `dotenvy`) → `grep -rn '^dotenv[[:space:]]*=' $(find . -name Cargo.toml)`
   - `tui-rs` (crate name `tui`) → `grep -rn '^tui[[:space:]]*=' $(find . -name Cargo.toml)`
   - `structopt` → `grep -rn '^structopt[[:space:]]*=' $(find . -name Cargo.toml)`
   - `fs2` → `grep -rn '^fs2[[:space:]]*=' $(find . -name Cargo.toml)`
   - `cargo-watch` → `grep -rln 'cargo-watch\|cargo watch' .github Taskfile.yml 2>/dev/null`
   - `cargo-make` → `grep -rln 'cargo-make\|cargo make' .github Taskfile.yml 2>/dev/null`
   - `cargo-husky` → `grep -rn '^cargo-husky[[:space:]]*=' $(find . -name Cargo.toml)`
   - `cargo-license` → `grep -rln 'cargo-license\|cargo license' .github Taskfile.yml 2>/dev/null`
   - `cargo-bloat` → `grep -rln 'cargo-bloat\|cargo bloat' .github Taskfile.yml 2>/dev/null`
   - `cross` → `grep -rln 'cross build\|cross test\|cargo install cross\b' .github Taskfile.yml 2>/dev/null` (or check for a `Cross.toml` file)

6. **Fix the live `serde_yaml` defect in grimoire: change `grimoire/Cargo.toml:32` to
   `serde_yaml = { package = "serde_yaml_ng", version = "0.10" }`, matching ocx's
   already-chosen fork.**
   Rationale: zero source-file edits needed given grimoire's usage is plain
   struct/Value frontmatter parsing with no 0.9-specific escape hatches; keeps both
   trees on the same fork for family consistency.
   VERIFICATION: `cargo build -p grimoire` succeeds with no source changes beyond
   Cargo.toml/Cargo.lock, and `grep -rn '"serde_yaml"' grimoire/Cargo.lock` shows no
   entry for the plain (non-`_ng`) package.

7. **When a crate looks alive on crates.io because of a recent version bump, check what
   that release actually contains (changelog/diff) before trusting the date — a fresh
   tag is not proof of a real release.**
   Rationale: `bincode` 3.0.0 (2025-12-16) is a docs-only poison-pill release announcing
   permanent cessation, confirmed by RustSec `RUSTSEC-2025-0141` and the GitHub archive
   notice — trusting `updated_at` alone here gives a false "alive" signal.
   VERIFICATION: for any crate whose sole liveness evidence is a recent `updated_at`,
   also check `https://rustsec.org/advisories/` (search by crate name) and the crate's
   GitHub repo for an "Archived" banner before relying on the date.

8. **Cross-check GitHub activity against crates.io publish cadence separately; do not
   infer one from the other.**
   Rationale: `cross-rs/cross` shows ongoing GitHub org activity while its last
   crates.io publish is 2023-02-04 per two independent primary sources — a tool can look
   maintained on GitHub while the artifact an agent would actually `cargo add` is stale.
   VERIFICATION: compare `crates.io/api/v1/crates/<name>` `updated_at` against the
   GitHub repo's latest release/tag date; a gap of a year or more between them is a
   finding to report, not silently resolve either way.

9. **Do not add a new dev-tool dependency that duplicates a tool already in this
   family's toolchain (cargo-deny, git-cliff, cocogitto, Taskfile, hawkeye,
   cargo-nextest) even if the new tool itself is alive.**
   Rationale: `cargo-license` (alive, last release 2025-07-29) and `cargo-make` (alive,
   last release 2025-01-18) are not denylisted for being dead — they're denylisted here
   because cargo-deny and Taskfile already cover the same job.
   VERIFICATION: before adding a dev-dependency or CI step, `grep -rn '<capability
   keyword>' Taskfile.yml deny.toml .github/workflows/` for an existing tool already
   doing that job.

## AI-agent angle

An LLM asked to add a YAML/config dependency defaults to `serde_yaml` because it's the
name most present in its training data and in countless tutorials/Stack Overflow answers
predating the 2024 archival — the deprecation postdates a large fraction of the model's
training corpus, so the model's prior is stale by construction, not by carelessness. The
same applies to `dotenv` (vs. `dotenvy`), `structopt` (vs. clap derive), `tui-rs` (vs.
`ratatui`), and `ansi_term` — all were the canonical answer for years before their
replacement became the canonical answer, and an LLM's training-frequency prior lags the
ecosystem's actual state by roughly the training cutoff minus the deprecation date.

A second, subtler failure: an LLM asked to "check if X is maintained" will often fetch
`crates.io/crates/X` (the human URL humans paste into chat), get the empty SPA shell, and
one of two bad things happens — it either hallucinates plausible-sounding version/date
content to fill the gap, or it gives up and defaults to "looks fine, no data to the
contrary." Neither is a real check. The smallest mechanical check that catches both
failure modes: force the API URL form (`/api/v1/crates/` prefix) and require the response
to parse as JSON with a non-null `newest_version` before treating a liveness check as
having actually run.

A third failure mode specific to this research: trusting a recent `updated_at` alone
(the `bincode` case). The mechanical check that catches it — grep the fetched JSON's
`description` and the crate's GitHub README for "unmaintained"/"archived"/"deprecated"
even when the date looks fresh; a poison-pill release still updates the timestamp.

## Contested / evolving

- **The YAML-fork successor is not settled.** `serde_yaml_ng` and `serde_norway` are
  both active, both claim compatibility, and neither is crates.io's or lib.rs's
  officially blessed successor — lib.rs lists them as alternatives to each other. This
  family should follow ocx's existing choice (`serde_yaml_ng`) for consistency now, but
  should re-check this pairing on the next research refresh; if `serde_norway` pulls
  ahead in adoption or `serde_yaml_ng`'s informal-maintenance stance ("don't expect
  professional support") becomes a problem, the recommendation could flip.
- **`bincode`'s situation is recent and still resolving** (advisory issued 2026-01-07,
  last modified 2026-01-16 — one month before this research). The RustSec entry may
  gain a "obsolete"/patched-version marker later if a community fork adopts the
  `bincode` name, or the ecosystem may permanently settle on `postcard`/`rkyv`/`bitcode`
  as parallel non-drop-in replacements. Recheck before the next major research refresh.
- **`cargo-bloat` and `cargo-make` are alive with no maintainer distress signal** — they
  are excluded here on redundancy/category grounds, not on liveness grounds. If this
  family's toolchain choices change (e.g., drops Taskfile), `cargo-make`'s exclusion
  rationale would need to be re-argued on its own merits, not inherited from this list.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [crates.io API — `serde_yaml`](https://crates.io/api/v1/crates/serde_yaml) | Primary, JSON API | fetched 2026-08-14 | Confirms `+deprecated` version suffix and 2024-03-25 last publish |
| [crates.io API — `bincode`](https://crates.io/api/v1/crates/bincode) | Primary, JSON API | fetched 2026-08-14 | Shows the misleading-fresh `3.0.0` / 2025-12-16 timestamp |
| [crates.io API — `dhat`](https://crates.io/api/v1/crates/dhat) | Primary, JSON API | fetched 2026-08-14 | Counter-example: stale date, healthy crate |
| [crates.io API — `cross`](https://crates.io/api/v1/crates/cross) | Primary, JSON API | fetched 2026-08-14 | Confirms 2023-02-04 last publish despite high downloads |
| [GitHub — dtolnay/serde-yaml](https://github.com/dtolnay/serde-yaml) | Primary, source repo | fetched 2026-08-14 | Verbatim "no longer maintained" README notice |
| [GitHub — bincode-org/bincode](https://github.com/bincode-org/bincode) | Primary, source repo | fetched 2026-08-14 | Archive notice + sourcehut migration + doxxing context |
| [RustSec — RUSTSEC-2025-0141](https://rustsec.org/advisories/RUSTSEC-2025-0141.html) | Primary, security advisory DB | issued 2026-01-07 | Second independent source confirming bincode's cessation and reason |
| [GitHub — watchexec/cargo-watch](https://github.com/watchexec/cargo-watch) | Primary, source repo | fetched 2026-08-14 | Archived 2025-01-18, explicit successor recommendations (bacon, watchexec) |
| [GitHub — cross-rs/cross releases](https://github.com/cross-rs/cross/releases) | Primary, release list | fetched 2026-08-14 | Cross-checked crates.io publish date against GitHub release history |
| [GitHub — rhysd/cargo-husky commits](https://github.com/rhysd/cargo-husky/commits/master) | Primary, commit history | fetched 2026-08-14 | Confirms last commit 2023-07-02, no functional changes since |
| [ocx/crates/ocx_lib/Cargo.toml (local)](file:///home/mherwig/dev/ocx/crates/ocx_lib/Cargo.toml) | Primary, in-tree manifest | current | Confirms ocx's existing `serde_yaml_ng` migration |
| [grimoire/Cargo.toml (local)](file:///home/mherwig/dev/grimoire/Cargo.toml) | Primary, in-tree manifest | current | Confirms the live `serde_yaml = "0.9"` defect |
| [lib.rs — `serde_yaml`](https://lib.rs/crates/serde_yaml) | Secondary aggregator | fetched 2026-08-14 | Deprecation banner + "See also" replacement list |
| [lib.rs — `async-std`](https://lib.rs/crates/async-std) | Secondary aggregator | fetched 2026-08-14 | Explicit "use smol instead" successor guidance |
| [lib.rs — `bincode`](https://lib.rs/crates/bincode) | Secondary aggregator | fetched 2026-08-14 | Corroborates RustSec advisory with replacement list |
| [lib.rs — `tui`](https://lib.rs/crates/tui) | Secondary aggregator | fetched 2026-08-14 | Maintainer-distress language, ratatui as replacement |
| [lib.rs — `cross`](https://lib.rs/crates/cross) | Secondary aggregator | fetched 2026-08-14 | Second-source confirmation of 2023-02-04 stale publish |
| [lib.rs — `serde_norway`](https://lib.rs/crates/serde_norway) | Secondary aggregator | fetched 2026-08-14 | Documents the unsettled fork landscape |
| [lib.rs — About](https://lib.rs/about) | Primary, site self-description | fetched 2026-08-14 | Confirms HTML-only, no JSON/feed API |
| [docs.rs — `serde_yaml`](https://docs.rs/crate/serde_yaml/latest) | Primary, doc host | fetched 2026-08-14 | Third independent confirmation of the deprecation banner |
