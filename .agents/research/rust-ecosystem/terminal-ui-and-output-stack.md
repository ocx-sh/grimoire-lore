---
title: Terminal Output and TUI Crate Stack
topic: terminal-ui-and-output-stack
agent: terminal-ui-researcher
model: sonnet
date_researched: 2026-08
sources_count: 16
scope: >
  ratatui API currency (0.26-0.30 breaking changes vs. what a pre-2026-trained
  model emits), the colour/styling stack (console vs anstream/anstyle, --color
  and NO_COLOR/CLICOLOR_FORCE ownership), and progress-bar/tracing/TUI
  interleaving, across ocx and grimoire as they exist in-tree today.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [ratatui API currency](#1-ratatui-api-currency)
   2. [What grimoire actually pins and writes](#2-what-grimoire-actually-pins-and-writes)
   3. [The colour stack](#3-the-colour-stack)
   4. [--color / NO_COLOR / CLICOLOR_FORCE ownership today](#4---color--no_color--clicolor_force-ownership-today)
   5. [The ASCII-help constraint's actual scope](#5-the-ascii-help-constraints-actual-scope)
   6. [Interleaving: progress bars, tracing, and the TUI](#6-interleaving-progress-bars-tracing-and-the-tui)
   7. [Non-TTY behaviour](#7-non-tty-behaviour)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

1. **Grimoire already runs the current ratatui API.** It pins `ratatui = "0.30"` / `crossterm = "0.29"` (`Cargo.lock`: ratatui 0.30.2) and its live code uses non-generic `Frame` (`fn draw_dialog(f: &mut Frame, ...)`) and `Terminal::new(CrosstermBackend::new(...))` — the current shape. There is nothing to migrate in grimoire's own TUI code today; the risk is entirely in what a model *adds* next.
2. **`Frame<'a, B: Backend>` (a generic backend parameter on `Frame`) is not a ratatui version regression to fix — it is `tui-rs`/pre-fork-era shape.** Verified: ratatui's `Frame` was already `Frame<'a>` (single lifetime, no backend generic) at 0.25.0 and remains `Frame<'a>` at 0.30.2. A model emitting `Frame<'_, B>` is reproducing the abandoned `tui-rs` crate's API (or a very old ratatui tutorial mirroring it), not a stale-but-valid ratatui version.
3. Ratatui 0.30 (June 2026) split the crate into a workspace (`ratatui-core`, `ratatui-widgets`, `ratatui-crossterm`, etc.), bumped MSRV to 1.86 + Rust 2024 edition, renamed `Alignment` → `HorizontalAlignment` (with a compat alias), changed `Backend` to require an associated `Error` type and `clear_region()`, and added `ratatui::run()` as a boilerplate-free terminal-setup entry point.
4. Ratatui 0.26 (Feb 2024) is the highest-density breaking release for old-model output: it introduced `WidgetRef` (render-by-reference: `frame.render_widget(&paragraph, area)` instead of consuming the widget), replaced `AsRef<Constraint>` layouts with `Into<Constraint>` (`Layout::vertical([1, 2, 3])` instead of `Layout::new(Direction::Vertical, [Constraint::Length(1), ...])`), and added `Flex` (default changed from legacy stretch-last to `Flex::Start`).
5. **The family's colour stack is already `console`, not `anstream`/`anstyle` — and that's the correct call, not a gap to close.** `anstream`/`anstyle` are present in both `Cargo.lock` files only as **transitive** dependencies of `clap_builder` 4.6.2 (confirmed: `clap_builder` deps include `anstream 1.0.0`, `anstyle 1.0.14`). Neither ocx nor grimoire adds them directly. Consolidating *onto* `anstream`/`anstyle` for runtime output would still leave clap's own internal use of the same crates untouched — they're already shared infrastructure at the byte level, just not at the API-surface level.
6. **ocx and grimoire independently hand-rolled the same `NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` precedence chain, in two separate files, with the same precedence order.** ocx: `ocx_lib::cli::options::color_mode::ColorModeConfig::from_env` (`crates/ocx_lib/src/cli/options/color_mode.rs`). grimoire: `grim::cli::color::resolve` (`src/cli/color.rs`). Both convert their resolved mode into `clap::ColorChoice`/`clap_builder::ColorChoice` and pre-scan `argv` for `--color` before clap parses, so clap's own `--help` rendering agrees with the app's runtime colouring. This is real, tested, duplicated logic — a shared crate-level helper would collapse two ~80-line modules (plus their near-identical unit tests) into one.
7. ocx's `--color` resolution applies to the **`console`** crate's global colour state (`console::set_colors_enabled` / `set_colors_enabled_stderr`); grimoire's resolution feeds **its own** JSON-colouring flag (`json_colored()`) plus clap's `Styles`, and does not use `console` at all for its own output (grimoire's stderr progress bar writes raw ANSI directly, no crate).
8. **The ASCII constraint in `quality-cli-help.md` is scoped to clap-rendered strings only** — enforced by `app::tests::cli_help_text_is_ascii`, which walks the built `Cli::command()` tree (help/about/usage text) plus a Python completion-byte test. It says nothing about, and is not enforced on, styled runtime output (progress bars, JSON colouring, TUI frames). Runtime output in both tools currently uses ANSI colour codes and Unicode box-drawing/ellipsis characters (`…`, `↳`) freely — there is no equivalent PowerShell-mojibake guard on that surface.
9. **grimoire already has a correct, tested fix for TUI/tracing interleaving; ocx already has a correct, tested fix for progress-bar/tracing interleaving; neither tool has the other's fix.** grimoire's alt-screen TUI redirects the global tracing writer to a log file for the session's duration (`src/log_switch.rs`, `SwitchableWriter` + `LogSinkGuard`, RAII-ordered to drop after the alt-screen exits). ocx's progress bars route the tracing `fmt` layer's writer through `ProgressManager`, which wraps every log flush in `indicatif::MultiProgress::suspend()` so a `tracing::warn!` never tears an active bar (`crates/ocx_lib/src/cli/progress.rs`, `log_settings.rs::init_with_progress`).
10. **grimoire's own stderr progress bar is raw hand-rolled ANSI (`\r...\x1b[K`), not `indicatif`, and its author has already documented the exact defect the brief asks about as an accepted, unfixed risk**: a `ponytail:` comment in `src/cli/progress.rs` states plainly that a `tracing::warn!` firing mid-bar "can smear one frame — cosmetic, redrawn on the next advance," and defers reaching for `indicatif::suspend()` until interleaving is frequent enough to matter. This is a real, reproducible, currently-live gap, not a hypothetical.
11. ocx deliberately does **not** use `tracing-indicatif`'s span-attached `IndicatifLayer` model; its progress bars are driven by plain `Arc`-backed `indicatif::ProgressBar` handles outside the tracing span registry (documented in-code as `ADR adr_progress_architecture`), specifically to avoid a concurrency failure mode under concurrent span close in `tracing_subscriber`'s sharded span registry.
12. `indicatif` (`ProgressDrawTarget::stderr()`/`stdout()`) auto-hides bars when the target stream is not user-attended or when `TERM` is unset/`dumb` — no manual `is_terminal()` gate is required for `indicatif`-driven bars. grimoire's hand-rolled bar has no such crate-provided behaviour and gates manually (`select_progress` checks `io::stderr().is_terminal()` itself).
13. `console` 0.16.x exposes an *independent* global colour switch (`console::set_colors_enabled[_stderr]`, `console::colors_enabled[_stderr]`) that an app must set explicitly from its own resolved colour decision — it does not itself read `NO_COLOR`/`CLICOLOR_FORCE`; ocx's `color_mode.rs` is exactly that missing glue, written by hand.
14. `NO_COLOR` per the spec (no-color.org, quoted verbatim in [Findings §3](#3-the-colour-stack)) disables colour on **presence of a non-empty value**, regardless of content (`NO_COLOR=0` still disables). Both ocx and grimoire implement this correctly (`is_ok_and(|v| !v.is_empty())`).
15. A model asked to add a new progress indicator to grimoire will, by pattern-matching the one example already in the crate, reach for the raw-ANSI `StderrBar` approach rather than `indicatif` — because grimoire has no `indicatif` dependency to imitate at all, only ocx does. That asymmetry is itself the highest-leverage thing to fix before adding any new progress surface to grimoire.
16. The `tracing-indicatif` writer-coordination primitives (`get_stderr_writer()`/`get_stdout_writer()`, `suspend_tracing_indicatif()`) exist and are documented, but neither ocx nor grimoire uses the crate — both built their own, smaller, span-free equivalents. This is a legitimate, deliberate divergence from the "obvious" crate, not an oversight, and should not be second-guessed by an agent that finds `tracing-indicatif` in a search and assumes it's missing.

---

## Findings

### 1. ratatui API currency

Ratatui's `Frame` type has **not** carried a generic backend parameter since at least 0.25.0 (the earliest version checked): `pub struct Frame<'a> { /* private fields */ }`, single lifetime, no `B: Backend` — confirmed identical at 0.25.0 and at the current 0.30.2 ([docs.rs 0.25.0](https://docs.rs/ratatui/0.25.0/ratatui/struct.Frame.html), [docs.rs latest](https://docs.rs/ratatui/latest/ratatui/struct.Frame.html)). The pattern `Frame<'_, B>` / `fn draw<B: Backend>(f: &mut Frame<B>, ...)` that a pre-2026 model reliably emits is the API of `tui-rs`, the original (now-unmaintained) crate ratatui forked from in 2023, or of ratatui tutorials written against that lineage — **it is not a version a supported ratatui release ever had while under the `ratatui` name in the range checked.** Treat any `Frame<'_, B>` sighting as "wrong crate/wrong era," not "old-but-valid ratatui."

Version-by-version breaking changes relevant to what an old model writes, primary-sourced:

| If a model writes... | ...it is on | Write instead | Changed in |
|---|---|---|---|
| `Frame<'_, B: Backend>`, `fn draw<B: Backend>(...)` | `tui-rs` / pre-ratatui era | `Frame<'_>` (no generic; `Terminal<B>` alone carries the backend) | Already true at ratatui 0.25 and earlier; current at 0.30 |
| `Layout::new(Direction::Vertical, [Constraint::Length(1), Constraint::Length(2)])` | ratatui < 0.26 | `Layout::vertical([1, 2])` (constructors take `Into<Constraint>`, so bare integers work) | [0.26.0](https://ratatui.rs/highlights/v026/) |
| `frame.render_widget(paragraph, area)` then re-rendering the same `paragraph` elsewhere (consumed by value) | ratatui < 0.26 | `frame.render_widget(&paragraph, area)` — `WidgetRef` lets shared/borrowed rendering work | [0.26.0](https://ratatui.rs/highlights/v026/) |
| `List::start_corner(Corner::...)` | ratatui < 0.27 | `List::direction(ListDirection::...)` — `Corner` was removed entirely | [0.27.0](https://ratatui.rs/highlights/v027/) |
| `.gauge_style(...)` on `LineGauge` | ratatui < 0.27 | `.filled_style(...)` / `.unfilled_style(...)` | [0.27.0](https://ratatui.rs/highlights/v027/) |
| `use ratatui::layout::Alignment` in code expecting a horizontal/vertical split | ratatui < 0.30 | `HorizontalAlignment` (new `VerticalAlignment` also exists); `Alignment` is now a compat alias, not the primary name | [0.30.0](https://ratatui.rs/highlights/v030/) |
| Custom `Backend` impl without an associated `Error` type or `clear_region()` | ratatui < 0.30 | Implement `Backend::Error` and `Backend::clear_region()` — both are now required | [0.30.0](https://ratatui.rs/highlights/v030/) |
| Manual `enable_raw_mode()` + `EnterAlternateScreen` + `Terminal::new(CrosstermBackend::new(stdout))` boilerplate | any version, but now avoidable | `ratatui::run()` for the common case | [0.30.0](https://ratatui.rs/highlights/v030/) |
| `Block::title(Title::from(...))` | ratatui < 0.30 | `Block::title(...)` now takes anything `Into<Line>` directly, no `Title` wrapper | [0.30.0](https://ratatui.rs/highlights/v030/) |

Also relevant, non-breaking but likely to appear in a stale model's output as *missing* rather than *wrong*: `ListState::select_next/previous/first/last` (0.27), `Line`/`Span` implementing `ToText`/`ToSpan`/`ToLine` via `Display` (0.27), Material/Tailwind colour palettes and `Color::from_u32`/`from_hsl` (0.26), `Rect::centered()`/`Rect::layout()`/`Rect::outer()` convenience methods (0.30) — a model unaware of these will hand-roll longer equivalents that still compile, so these are "prefer" items, not correctness bugs.

### 2. What grimoire actually pins and writes

`grimoire/Cargo.toml`: `ratatui = "0.30"`, `crossterm = "0.29"`, `unicode-width = "0.2"`, `fuzzy-matcher = "0.3"`; `Cargo.lock` resolves `ratatui` to `0.30.2`. Grep across `src/tui/*.rs` confirms the live code already matches the current shape:

```rust
// src/tui/init_dialog.rs
use ratatui::Frame;
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;
...
let backend = CrosstermBackend::new(io::stdout());
let mut terminal = Terminal::new(backend)?;
...
fn draw_dialog(f: &mut Frame, dialog: &InitDialog) { ... }
```

No `Frame<'_, B>`, no `impl Widget for` a type consumed by value where a reference would do (not exhaustively checked, but the construction path is current). **Conclusion: there is no ratatui migration debt in grimoire today** — the risk this research subarea is guarding against is prospective (a future agent adding TUI code from stale training data), not a backlog item.

### 3. The colour stack

Both `ocx/Cargo.toml` and `grimoire/Cargo.toml` were checked directly; neither lists `anstream` or `anstyle` as a direct dependency. Both `Cargo.lock` files contain them, and in both cases the sole dependent is `clap_builder`:

```
[[package]]
name = "clap_builder"
version = "4.6.2"
dependencies = [
 "anstream",
 "anstyle",
 "clap_lex",
 "strsim",
]
```

`anstream::AutoStream` is described in its own docs as IO-stream adapters that "gracefully degrade according to your terminal's capabilities" — accept ANSI unconditionally in application code, and it strips codes automatically for non-TTY targets, using `colorchoice` + `anstyle-query` under the hood for `NO_COLOR`/`CLICOLOR_FORCE` detection ([docs.rs/anstream](https://docs.rs/anstream/latest/anstream/)). `clap`'s `Command::color(ColorChoice)` is exactly this: `Auto`/`Always`/`Never`, defaulting to `Auto`, propagated to subcommands ([docs.rs/clap Command::color](https://docs.rs/clap/latest/clap/struct.Command.html#method.color)).

`console` 0.16.x, by contrast, is a synchronous terminal-abstraction crate (`Term`, styled-string helpers) with its own **separate**, explicitly-set global colour flags — `colors_enabled()`/`set_colors_enabled()` and the `_stderr` variants — that the *application* must wire up from its own environment resolution; the crate does not read `NO_COLOR`/`CLICOLOR_FORCE` itself ([docs.rs/console](https://docs.rs/console/latest/console/)). ocx's `color_mode.rs` is precisely that missing wiring, hand-written.

**Recommendation basis, not yet a decision the codebases have made**: `anstream`/`anstyle` are already linked into every binary via clap and correctly implement the `NO_COLOR`/`CLICOLOR_FORCE`/TTY chain once, as a library; `console`'s equivalent logic is currently duplicated by hand in two files across two repos with matching but independently-maintained precedence order. `unicode-width` and terminal-size query needs are already covered elsewhere (`crossterm::terminal::size()` in grimoire's own bar). The remaining reasons to keep `console` are: `console::Term` still offers cursor/line-clearing primitives `anstream` doesn't provide, and grimoire's non-TUI runtime output uses neither crate today, so a rewrite touches ocx only. See [Normative guidance candidates](#normative-guidance-candidates) for the concrete migration-cost call.

### 4. `--color` / `NO_COLOR` / `CLICOLOR_FORCE` ownership today

Confirmed by reading both implementations in full:

- **ocx**: `crates/ocx_lib/src/cli/options/color_mode.rs` — `ColorMode::from_args()` pre-scans `std::env::args()` for `--color`/`--color=`; `ColorModeConfig::from_env()` implements the precedence `NO_COLOR` (non-empty) → off, `CLICOLOR_FORCE` (non-empty, ≠ `"0"`) → on, `CLICOLOR=0` → off, `TERM=dumb` → off, else per-stream `console::Term::{stdout,stderr}().is_term()`; `ColorModeConfig::apply()` calls `console::set_colors_enabled[_stderr]`; `From<ColorMode> for clap_builder::ColorChoice` feeds clap's own renderer the same decision.
- **grimoire**: `src/cli/color.rs` — same precedence order, same four env vars, implemented independently against `std::io::IsTerminal` (no `console` dependency at all) and a `OnceLock<bool>`/`OnceLock<ColorMode>` pair (`STDOUT_COLORED`, `MODE`) instead of a struct; feeds `json_colored()` (for `colored_json` output) and `clap::ColorChoice`/`Styles` (applied *unconditionally* — the module doc explains anstream strips ANSI itself when the resolved choice is off, so there is deliberately no separate plain-styles branch).

Both tools **agree in behaviour** (same precedence, same env vars, same clap bridging trick of pre-scanning argv before clap parses so `--help` respects `--color`) but **disagree in implementation** — two independently written, independently tested ~80-line modules computing the identical function. Neither reuses the other; neither reuses a shared crate.

### 5. The ASCII-help constraint's actual scope

`ocx/.claude/rules/quality-cli-help.md` (`paths: crates/ocx_cli/src/**`) states the Block-tier rule: "Non-ASCII byte in help (Windows PowerShell 5.1 decodes captured completion/`--help` streams under the console codepage and mojibakes it)," enforced by `app::tests::cli_help_text_is_ascii`, which the rule itself documents as walking the **built `Cli::command()` tree** — i.e., clap `about`/`help`/`long_about` strings — plus a Python test asserting shell-completion and `self activate` output bytes are ASCII. Nothing in this rule, its enforcement test, or its neighbours governs runtime-styled output (progress-bar text, JSON colouring, TUI frame content). In-tree runtime output already uses non-ASCII where convenient: grimoire's `render_bar` ellipsizes with `…` (`src/cli/printer.rs::truncate_ellipsis`), and ocx's nested-bar prefix is `"  ↳ "` (`crates/ocx_lib/src/cli/progress.rs`). **This is consistent, not a bug**: PowerShell 5.1's mojibake risk is specific to *captured, parsed* output (help text feeding docs generation, completions), not to interactively-viewed colour/Unicode a human reads live in a real terminal.

### 6. Interleaving: progress bars, tracing, and the TUI

Three independent, already-built mechanisms exist across the two tools, none shared:

**(a) grimoire's TUI vs. tracing** — `src/log_switch.rs`. A `SwitchableWriter` (`Arc<Mutex<WriterTarget>>`, where `WriterTarget` is `Stderr` or `File`) is installed once as the global `tracing_subscriber::fmt::MakeWriter`. Entering the alt-screen TUI acquires a `LogSinkGuard` that swaps the target to `$GRIM_HOME/tui.log` (or an anonymous `tempfile` fallback); the guard's `Drop` restores `Stderr`. The module doc is explicit about *why*: "Any `tracing` output that leaks to `stderr` during that window overwrites the TUI frame and is never repainted over (ratatui uses a diff-based draw)." Ordering is enforced by declaring the `LogSinkGuard` **before** `TerminalGuard` so Rust's reverse-drop-order restores stderr logging only *after* the alt-screen is already exited. Tested (`writer_starts_with_stderr_and_toggles_to_file_and_back`, panic-safety test, async off-thread-open tests).

**(b) ocx's progress bars vs. tracing** — `crates/ocx_lib/src/cli/progress.rs` + `log_settings.rs`. `ProgressManager::stderr()` wraps one `indicatif::MultiProgress`; `LogSettings::init_with_progress` routes the `tracing_subscriber::fmt` layer's writer through `progress.writer()`, and the doc comment states the mechanism plainly: "Log lines are flushed inside `MultiProgress::suspend` so they never tear active progress bars... There is no `tracing-indicatif` layer: progress is driven by RAII guards, not spans (`ADR adr_progress_architecture`)." A `disabled`/`hidden` manager (non-TTY) writes straight through with no suspend overhead, so callers never branch on TTY state themselves.

**(c) grimoire's stderr progress bar vs. tracing — the one open gap.** `src/cli/progress.rs::StderrBar` writes raw ANSI (`\r{line}\x1b[K`) directly to a locked `io::stderr()`, with **no** `indicatif`, no suspend, no coordination with the tracing writer at all. The code says so itself:

> `// ponytail: raw ANSI (no indicatif dep); a rare `tracing::warn!` to stderr mid-pass can smear one frame — cosmetic, redrawn on the next advance. Reach for indicatif's `suspend()` only if logs interleave often enough to matter.`

This is exactly the defect class the brief asked to establish exists — confirmed present, confirmed acknowledged, confirmed unfixed, in the exact tool named in the brief.

**What `tracing-indicatif` would have offered, and why ocx opted out of it**: `tracing-indicatif::IndicatifLayer` ties one `ProgressBar` per active tracing span automatically and ships coordination writers (`get_stderr_writer()`, `suspend_tracing_indicatif()`) ([docs.rs](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/)). ocx's in-code ADR reference states it avoided this specifically to sidestep a concurrency failure under `tracing_subscriber`'s sharded span-registry ref-counting when many spans close concurrently — a real, named trade-off, not an oversight.

### 7. Non-TTY behaviour

`indicatif::ProgressDrawTarget::stderr()`/`stdout()` auto-detect: "if the terminal is not user attended the entire progress bar will be hidden... Progress bars will also be hidden if `TERM` is unset/`dumb`" ([docs.rs/indicatif ProgressDrawTarget](https://docs.rs/indicatif/latest/indicatif/struct.ProgressDrawTarget.html)). ocx's `ProgressManager` relies on exactly this — its `stderr()`/`hidden()`/`disabled()` constructors don't re-implement TTY detection; `indicatif` does it. grimoire's hand-rolled `StderrBar` has no such built-in and gates manually: `select_progress` checks `io::stderr().is_terminal()` before choosing `StderrBar` vs. `SilentProgress`. Both tools also expose an explicit machine-readable channel independent of TTY state — grimoire's `--progress json` emits NDJSON events (`{"event":"start","total":N}` etc., explicitly marked pre-1.0/unstable in `progress.rs`'s doc comment) to stderr regardless of TTY. `tracing`'s own output in both tools is controlled by `NO_COLOR`/`--color` for ANSI (both wire `with_ansi(ansi)` on the `fmt` layer from the same resolved colour decision — see [Findings §4](#4---color--no_color--clicolor_force-ownership-today)) but is never suppressed by non-TTY on its own; log volume is filtered by `RUST_LOG`/`OCX_LOG`/`OCX_LOG_CONSOLE`, not by terminal state.

---

## Normative guidance candidates

1. **One styling stack for the family: `console` for interactive TTY primitives (cursor control, TTY queries), `anstream`/`anstyle` left as clap-internal and not adopted for application code.** Rationale: `anstream`/`anstyle` are already present via clap and correctly implement the `NO_COLOR`/`CLICOLOR_FORCE` chain, but neither tool's runtime output currently goes through `AutoStream`, and `console::Term` provides cursor/line primitives `anstream` doesn't — a full anstream migration touches every `println!`/`eprintln!` call site in ocx (grimoire has none to migrate; it uses raw ANSI + `colored_json` already). **Migration cost: ocx only, moderate** — replace `console::set_colors_enabled` usage and any `console::style(...)` call sites with `anstyle` `Style`/`AnsiColor` constants wrapped in `anstream::AutoStream`; grimoire's `colored_json` + manual ANSI stays as-is either way since `colored_json` doesn't care which stack decided the boolean. VERIFICATION: `cargo tree -e normal -i anstream` shows only `clap_builder` as a dependent before migration, and the app's own crate after.
2. **Collapse ocx's and grimoire's independent `NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` precedence modules into one shared crate.** Rationale: the two implementations already agree byte-for-byte on precedence and are independently unit-tested for the same cases (`auto_no_color_beats_clicolor_force`, `auto_term_dumb_disables`, etc. exist near-verbatim in both `color_mode.rs` and `color.rs`) — duplicated logic that already drifted into two different storage strategies (`OnceLock` pair vs. a config struct). VERIFICATION: a future `cargo test -p <shared-crate>` running exactly the union of both existing test sets, with both `ocx_lib::cli::options::color_mode` and `grim::cli::color` reduced to thin wrappers.
3. **Any new stderr progress indicator in grimoire uses `indicatif::MultiProgress::suspend()` around its tracing writer, following ocx's `ProgressManager` pattern — never raw ANSI.** Rationale: grimoire's own code already documents the exact failure mode (`ponytail:` comment in `src/cli/progress.rs`) as accepted-but-unfixed; a second raw-ANSI bar anywhere in grimoire compounds a known gap instead of adopting the sibling tool's already-tested fix. VERIFICATION: a reproduction test that spawns a task emitting `tracing::warn!` at high frequency while `StderrBar::advance` runs in a loop against a `Cursor<Vec<u8>>` (or a PTY harness), asserting the captured byte stream contains no interleaved bar-fragment-then-log-then-partial-bar sequence — i.e., every `\x1b[K`-terminated bar write is immediately followed by either another bar write or nothing, never a bare log line spliced mid-sequence.
4. **A ratatui `Frame<'_, B>` generic-backend sighting in any diff is an automatic reject, not a style nit.** Rationale: confirmed above that ratatui's `Frame` has been non-generic since at least 0.25.0, and the family pins 0.30 — this shape does not compile against the pinned version at all, so it is a build break, not a preference. VERIFICATION: `grep -rn "Frame<.*Backend" src/` (or `Frame<'_, B` / `Frame<'a, B`) returns nothing; `cargo build` is the actual gate since the generic form fails to compile against ratatui 0.30 regardless.
5. **New ratatui layout code uses `Layout::vertical([..])`/`Layout::horizontal([..])` with bare integer/`Constraint` literals, never `Layout::new(Direction::.., [Constraint::Length(n), ..])`.** Rationale: the verbose form still compiles at 0.30 (it's not removed) but is the pre-0.26 idiom a stale model defaults to, and the codebase should read as one era. VERIFICATION: `grep -rn "Layout::new(Direction::" src/` returns nothing outside historical/vendored code.
6. **`--color`, `NO_COLOR`, `CLICOLOR_FORCE` resolution happens exactly once per process, before the first byte of output, and is fed to both the app's own colour decision and clap's `ColorChoice`/`Styles`** — already true in both tools; keep it true for any new binary added to the family (e.g. `ocx-mirror`, the Python-binding crate's CLI surface if any). Rationale: a second resolution point risks the help text and the runtime output disagreeing on colour, which both existing implementations went out of their way to prevent via argv pre-scan. VERIFICATION: `--color=never grim --help 2>&1 | grep -c $'\x1b['` and `--color=never grim <subcommand> 2>&1 | grep -c $'\x1b['` are both `0`; equivalent for `ocx`.
7. **The ASCII constraint in `quality-cli-help.md` stays scoped to clap-rendered strings; do not extend it to progress-bar or TUI runtime text.** Rationale: the PowerShell-mojibake failure mode is specific to *captured/parsed* streams (help text feeding doc generation, shell completions); Unicode ellipsis/box-drawing in live-viewed interactive output (already used by both tools: `…`, `↳`, ratatui border glyphs) is a legitimate, working feature, not latent risk of the same class. VERIFICATION: `cli_help_text_is_ascii`'s file scope (`app::tests` walking `Cli::command()`) stays unchanged; no equivalent test is added over `src/tui/**` or `src/cli/progress.rs`.
8. **Do not adopt `tracing-indicatif`'s `IndicatifLayer` without re-deriving ocx's already-documented concurrency objection.** Rationale: it is the "obvious" crate a search turns up, but ocx's in-tree ADR reference records a real failure mode (span-registry ref-count assertion under concurrent span close) that motivated the current span-free `ProgressManager` design instead. VERIFICATION: before introducing `IndicatifLayer` anywhere in the family, locate and re-read `adr_progress_architecture` (or its successor) and either refute or reconfirm the stated concurrency risk under the target tokio runtime's actual concurrency level.

---

## AI-agent angle

- **Frame<'_, B> and consuming-widget calls are the single highest-frequency wrong output.** A model trained before the ratatui fork stabilized (or trained mostly on `tui-rs` examples, which still dominate older blog posts/Stack Overflow) will write `fn draw<B: Backend>(f: &mut Frame<B>, ...)` and `frame.render_widget(some_owned_widget, area)` reflexively. Smallest mechanical check: `cargo build` (it simply fails to compile against the pinned 0.30), backed by a pre-commit grep for `Frame<.*Backend` / `Frame<'_, B` / `Frame<'a, B` so the failure is caught before a full build cycle.
- **A model asked to "add a progress bar" to grimoire has no in-crate `indicatif` example to imitate and will therefore extend the existing raw-ANSI `StderrBar`**, silently deepening the exact interleaving gap already flagged with a `ponytail:` comment, rather than reaching for the sibling tool's tested `MultiProgress::suspend()` pattern. Smallest mechanical check: a repo-wide grep for `indicatif` before writing progress code — its absence in grimoire's `Cargo.toml` is itself the signal to go read ocx's `progress.rs` first, not to write from scratch.
- **A model asked to "make `--color` respect `NO_COLOR`" will very plausibly re-derive the precedence chain from general CLI knowledge and diverge from the existing order** (e.g. checking `CLICOLOR=0` before `CLICOLOR_FORCE`, or treating `NO_COLOR=""` as "set"). Smallest mechanical check: point the model at the existing test module in `color.rs`/`color_mode.rs` first — the precedence is pinned there as executable examples (`auto_no_color_beats_clicolor_force`, `auto_clicolor_force_beats_lower_signals_and_non_tty`), and any new implementation must pass the same table.
- **A model will assume `anstream`/`anstyle` are "not in use" because they aren't in `Cargo.toml`, and either propose adding them redundantly or ignore that clap's own help output already goes through them.** Smallest mechanical check: `cargo tree -e normal -i anstream` before proposing to add it — it is already linked in, the only question is whether application code also uses it.
- **A model will not know that grimoire's TUI already solves log/TUI interleaving correctly** (`log_switch.rs`) and may propose re-solving it with a different mechanism (e.g. buffering, a custom `Drain`) when asked to fix a "logs corrupt the TUI" bug report — the actual bug, if one exists, is more likely a call site that logs *before* `LogSinkGuard::redirect` runs, or a background task that outlives the guard. Smallest mechanical check: confirm `LogSinkGuard::redirect` is acquired **before** `TerminalGuard::enter()` at the reported call site (declaration order = drop order = the invariant the module doc states) before writing any new interleaving-prevention code.

---

## Contested / evolving

- **`console` vs. `anstream`/`anstyle` for the family's own runtime styling is a live, unresolved choice, not settled practice** — both repos currently use `console` (ocx) or nothing/raw ANSI (grimoire) for their own output, while both link `anstream`/`anstyle` unknowingly via clap. The ecosystem direction (clap 4.x's own default) favours `anstream`, but neither tool has migrated, and `console` still offers primitives (`Term::move_cursor_up`, etc.) `anstream` doesn't replace one-for-one — this research recommends keeping `console` for now (see [Normative guidance candidate 1](#normative-guidance-candidates)) precisely because a full migration is a real, non-trivial diff with no functional bug forcing it today.
- **`tracing-indicatif`'s span-attached model vs. ocx's span-free `ProgressManager`** is an active, documented disagreement inside the family itself (ocx chose span-free specifically to avoid a concurrency bug the span-attached model is exposed to) — this is not settled upstream either; `tracing-indicatif` is still the more widely recommended pattern in the broader ecosystem, but ocx's in-tree ADR is a real, specific counter-data-point that should be re-verified (not assumed stale) before any future decision to adopt it.
- **ratatui's 0.30 workspace split** (`ratatui-core`/`ratatui-widgets`/`ratatui-crossterm`/etc.) is recent enough (June 2026) that most existing tutorials, blog posts, and even some crates.io ecosystem crates built against ratatui will still target the monolithic `ratatui` crate structure rather than depending on `ratatui-core` directly — expect friction integrating any *third-party* ratatui widget crate until that ecosystem catches up; this is a currency gap in the wider crates.io ecosystem, not in grimoire's own code (which is fine).
- **`Flex::SpaceAround`'s redefinition in 0.30** (previous behaviour moved to a new `Flex::SpaceEvenly`) is a silent-behaviour-change class of breaking change — code using `Flex::SpaceAround` before 0.30 continues to compile after upgrading to 0.30 but *renders differently*. Grimoire's TUI does not currently use `Flex` explicitly (not found in the grep pass), so this is not live risk today, but it's the kind of change a compiler can't catch and a model won't know to check for.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [ratatui.rs/highlights/v025](https://ratatui.rs/highlights/v025/) | Official ratatui release-highlights page | 0.25.0 era | Confirms baseline `Frame` shape and layout API just before the 0.26 breaking wave. |
| [ratatui.rs/highlights/v026](https://ratatui.rs/highlights/v026/) | Official ratatui release-highlights page | 0.26.0, Feb 2024 | Primary source for `WidgetRef`, `Flex`, `Into<Constraint>` layout constructors — the densest breaking-change release for old-model output. |
| [ratatui.rs/highlights/v027](https://ratatui.rs/highlights/v027/) | Official ratatui release-highlights page | 0.27.0 | `List::direction`/`Corner` removal, `LineGauge` style split, backend re-exports. |
| [ratatui.rs/highlights/v030](https://ratatui.rs/highlights/v030/) | Official ratatui release-highlights page | 0.30.0, June 2026 | The current release: workspace split, MSRV 1.86, `Backend::Error`/`clear_region`, `Alignment`→`HorizontalAlignment`, `ratatui::run()`. |
| [github.com/ratatui/ratatui releases/v0.26.0](https://github.com/ratatui/ratatui/releases/tag/v0.26.0) | GitHub release notes | 0.26.0 | Corroborates the highlights page with the maintainers' own breaking-change bullet list (`Table`/`Tabs` type-inference breaks, `Cell` `CompactString`). |
| [raw CHANGELOG.md, ratatui/ratatui](https://raw.githubusercontent.com/ratatui/ratatui/main/CHANGELOG.md) | Project changelog (attempted fetch) | current | Attempted as the canonical single source; page did not render cleanly, superseded by the per-version highlights pages above (all cross-checked against them instead). |
| [docs.rs/ratatui/0.25.0/.../Frame.html](https://docs.rs/ratatui/0.25.0/ratatui/struct.Frame.html) | Generated API docs, pinned version | 0.25.0 | Directly verifies `Frame<'a>` (no backend generic) predates the 0.26 wave — the load-bearing fact for the "this isn't a version, it's the wrong crate" claim. |
| [docs.rs/ratatui/latest/.../Frame.html](https://docs.rs/ratatui/latest/ratatui/struct.Frame.html) | Generated API docs, latest | 0.30.2 | Confirms the same `Frame<'a>` shape is still current at the version grimoire pins. |
| [docs.rs/console/latest](https://docs.rs/console/latest/console/) | Generated API docs | 0.16.4 | Establishes `console`'s colour-toggle API surface (`colors_enabled`/`set_colors_enabled[_stderr]`) and that it does **not** read `NO_COLOR`/`CLICOLOR_FORCE` itself. |
| [docs.rs/anstream/latest](https://docs.rs/anstream/latest/anstream/) | Generated API docs | 1.0.0 | Establishes `anstream`'s auto-degrading `AutoStream` model and its `colorchoice`/`anstyle-query` dependency chain for env-var detection. |
| [docs.rs/clap Command::color](https://docs.rs/clap/latest/clap/struct.Command.html#method.color) | Generated API docs | clap 4.x current | Confirms `ColorChoice::Auto/Always/Never` as clap's own colour API, the thing both tools' pre-scan tricks are targeting. |
| [docs.rs/tracing-indicatif/latest](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/) | Generated API docs | 0.3.14 | The "obvious" span-attached progress+tracing bridge — read to understand what ocx deliberately did *not* adopt, and why. |
| [docs.rs/tracing-indicatif IndicatifLayer](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/struct.IndicatifLayer.html) | Generated API docs | 0.3.14 | Detail on the span-lifecycle-attached bar model, contrasted with ocx's span-free `ProgressManager`. |
| [docs.rs/indicatif MultiProgress](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html) | Generated API docs | 0.18.6 | Source for `suspend()`'s exact semantics — the primitive ocx's `ProgressManager` wraps and grimoire's raw-ANSI bar lacks. |
| [docs.rs/indicatif ProgressDrawTarget](https://docs.rs/indicatif/latest/indicatif/struct.ProgressDrawTarget.html) | Generated API docs | 0.18.6 | Confirms automatic non-TTY / `TERM=dumb` hiding is built into `indicatif` itself, not something callers must reimplement. |
| [no-color.org](https://no-color.org/) | The NO_COLOR informal spec | ongoing | The normative source both tools' `is_ok_and(|v| !v.is_empty())` checks are implementing verbatim. |

**In-tree primary sources (not URLs, read in full during this research; cited throughout Findings above):** `ocx/.agents/worktrees/integration/crates/ocx_lib/src/cli/options/color_mode.rs`, `ocx/.agents/worktrees/integration/crates/ocx_lib/src/cli/progress.rs`, `ocx/.agents/worktrees/integration/crates/ocx_lib/src/cli/log_settings.rs`, `ocx/.claude/rules/quality-cli-help.md`, `grimoire/src/cli/color.rs`, `grimoire/src/cli/progress.rs`, `grimoire/src/log_switch.rs`, `grimoire/src/tui/init_dialog.rs`, `grimoire/src/tui/app.rs`, `grimoire/Cargo.toml` + `Cargo.lock`, `ocx/Cargo.toml` + `Cargo.lock`.
