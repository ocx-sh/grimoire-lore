---
title: Spillover check for rust-quality
target: rust-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md
  - https://doc.rust-lang.org/rustdoc/lints.html
  - https://nexte.st/changelog/
---

Evidence for all four items was read in the originating pairs' artifacts (code-docs/recent-shifts.md, code-docs.md line 329, rust-cargo/recent-shifts.md line 67, rust-cargo/cargo-rustc-rustfmt-rustup.md line 67, rust-cargo/release-and-cargo-tools.md line 70). Target files: /home/mherwig/dev/ocx-sh/grimoire-lore/rules/rust-quality.md and skills/rust-quality-reference/.

## 1. rustdoc `invalid_markdown_table` (1.100.0, warn) and `unused_footnote_definition` (1.99.0)

Verdict: confirmed by primary source (existence and versions); the `warn` default is confirmed for `invalid_markdown_table` only. The default level of `unused_footnote_definition` could not be confirmed: neither RELEASES.md nor the rustdoc lints page states it.

Sources: Rust RELEASES.md, https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md (1.100.0 dated 2026-11-12: "Add new `invalid_markdown_table` rustdoc lint"; 1.99.0 dated 2026-10-01: "Add new `unused_footnote_definition` rustdoc lint"). rustdoc book, https://doc.rust-lang.org/rustdoc/lints.html (undated): "This lint is warn-by-default. It detects unescaped pipes (`|`) in table rows"; the page does not list `unused_footnote_definition`.

Affected text in target (skills/rust-quality-reference/docs-and-tracing.md, DOC-09): "CI runs `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features`. rustdoc's link lints only *warn*; `cargo doc` "succeeds" while emitting dead intra-doc links." The target names no rustdoc lint list and says nothing about these two lints. DOC-09 stays true, because `-D warnings` already turns both into errors.

Smallest change: none required. Optional: append to DOC-09 "The same flag also fails the build on `invalid_markdown_table` (an unescaped `|` in a table cell, warn by default since Rust 1.100) and `unused_footnote_definition` (since 1.99)."

## 2. Never-type fallback changes to `!` in all editions (Rust 1.100)

Verdict: confirmed by primary source; target already correct.

Source: RELEASES.md, 1.100.0 (2026-11-12), Compatibility Notes: "The never type fallback was changed to `!` on all editions". The Rust 1.100.0 blog post (https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/) is cited by the target; I did not fetch it.

Affected text (skills/rust-quality-reference/current-apis.md line 37): "code leaning on `()` never-type fallback | `!` is stable and `Infallible` is an alias of it; never-type fallback is `!` on every edition | 1.100 | new unreachable-code warnings or inference errors after bumping a pre-2024 crate to 1.100 — a real signal, never an `#[allow]` (EVO-7)". This states the change and the bump warning already.

Smallest change: none. The `rust-cargo` item concerns the TOOL-03 bump commit; that belongs in the rust-cargo target, not here.

## 3. `dead_code_pub_in_binary` (Rust 1.97, allow-by-default)

Verdict: confirmed by primary source.

Source: RELEASES.md, 1.97.0 (2026-07-09), Language: "Add allow-by-default `dead_code_pub_in_binary` lint for unused pub items in binary crates".

Affected text: the target never mentions it. The nearest text is the `unreachable_pub = "warn"` entry in skills/rust-quality-reference/architecture.md (line 149) and ARCH-15 ("Default every item to private. Widen to `pub(crate)` for cross-module use, bare `pub` **only** for a crate's genuine external contract."). An allow-by-default lint makes no existing claim false.

Smallest change: none required. Optional one sentence after the `unreachable_pub` snippet in architecture.md: "For a binary-only crate, the allow-by-default `dead_code_pub_in_binary` lint (Rust 1.97) flags unused `pub` items that `unreachable_pub` does not."

## 4. nextest 0.9.150 security fix GHSA-vc25-qg58-w57c and `nextest-version = "0.9.150"`

Verdict: confirmed by primary source (the project's own changelog).

Source: nextest changelog, https://nexte.st/changelog/, "Version 0.9.150 (2026-10-26)": with the experimental run recording feature enabled, a malicious portable recording could make `cargo nextest run --rerun` run arbitrary code during the build (GHSA-vc25-qg58-w57c); advice: set `nextest-version = "0.9.150"` in `.config/nextest.toml`. I did not open the GitHub advisory page itself. Version 0.9.152 (2026-11-13) is the latest the pair artifact lists.

Affected text: the target says nothing about nextest versions, recordings or `nextest-version`. Nearest: rules/rust-quality.md line 36 "cargo nextest run --workspace --locked" and TEST-22/TEST-23 in skills/rust-quality-reference/testing.md, which concern CI profiles and retries only. The exposure needs the experimental recording feature and `--rerun`, so no existing claim is false.

Smallest change: none required. Optional: add to TEST-22 "Pin `nextest-version = "0.9.150"` or later in `.config/nextest.toml` (fixes GHSA-vc25-qg58-w57c, `--rerun` with a malicious recording)." This also fits the rust-cargo target (tool pinning).
