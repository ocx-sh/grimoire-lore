---
title: "Terminal UIs in Rust: architecture, terminal safety, and TUI UX"
topic: rust-tui
model: opus
consolidates:
  - rust-tui/ratatui-architecture-and-testing.md
  - rust-tui/tui-ux-and-terminal-safety.md
  - ocx-codebase-audit/crate-architecture.md
  - rust-cli-contract.md
  - rust-async.md
date: 2026-08
---

# Terminal UIs in Rust

## Verdict

1. **Keep grim's functional-core / imperative-shell split. It is the right architecture and it
   is already better than what ratatui recommends** — ratatui explicitly declines to pick among
   TEA, Component and Flux ([application-patterns](https://ratatui.rs/concepts/application-patterns/)),
   and grim independently landed on TEA with a *stronger* purity guarantee: `tui/state.rs` is
   documented "free of ratatui, crossterm, and std::io", `tui/render.rs` calls `frame` "a pure
   function", `tui/event.rs` has "no terminal imports"
   ([crate-architecture.md:142-149](ocx-codebase-audit/crate-architecture.md)). That split is
   what makes `TuiInput`/`TuiAction`/`handle()` unit-testable without a terminal, and it is why
   `tui/event.rs` carries dense inline tests while `app.rs` cannot. **Do not re-merge the layers.**
2. **What the split is missing is on the shell side, not the core side.** `tui/app.rs` is 7,563
   LOC with 76 free functions threading the same `(&TuiContext, &mut TuiState, &mut UpdateChecker)`
   triple ([crate-architecture.md:194](ocx-codebase-audit/crate-architecture.md)). The next lever
   is yazi's: split the *shell* by feature (event-source task, background-check scheduler,
   catalog loader, session lifecycle), each owning its channel and its state, not by re-layering.
   A second missing piece: `map_key` (`app.rs:1026`) is the only crossterm-aware decision in the
   codebase — correct design — but it **discards `key.modifiers` entirely**, which is how Ctrl-C
   became a bug (see §Applied).
3. **The event loop must become `EventStream` + `tokio::select!`.** grim's current loop calls
   blocking `event::poll(200ms)` and `event::read()` directly inside an `async fn`
   (`app.rs:293-296`) and `.await`s the catalog reload inline in the `Refresh` arm
   (`app.rs:334`). That is simultaneously a TUI freeze (every keystroke, including the quit key,
   queues behind a registry pull) and an ASYNC-01 violation (200 ms of blocking per tick on a
   `multi_thread` worker). Three shapes were surveyed — `select!` over an `EventStream`
   (ratatui templates, television), blocking-poll-on-a-spawned-task (atuin), and fixed frame
   budget (oha). **Take the first**: it is the only one where an in-flight registry pull and a
   keypress are branches of the same `select!` rather than one blocking the other. The 200 ms
   drain tick becomes a `tokio::time::interval` branch; `load_into`/`reload_into` become
   `tokio::spawn`ed tasks whose results arrive as events, exactly like `UpdateChecker` already
   does (`update_check.rs:132-232`, cited in [rust-async.md](rust-async.md) as the best local
   example of the pattern).
4. **Terminal restore needs three doors closed, and grim has closed one.** `TerminalGuard`
   (`tui/terminal_guard.rs:32-36`) covers normal return and unwinding panic. There is **no panic
   hook** anywhere in the crate, so a panic prints its message *into the alternate screen* which
   the `Drop` then tears down — the user sees a restored shell and no error. And nothing covers
   an external `SIGTERM`. The guarantee is: **one restore function, called from `Drop`, from a
   panic hook installed before `enter()`, and from a signal handler that only sends into the
   event channel.** `std::process::exit` after entry is banned outright — it skips every
   destructor ([std docs](https://doc.rust-lang.org/std/process/fn.exit.html)), which is also
   already EXIT-02 in [rust-cli-contract.md](rust-cli-contract.md).
5. **Registry-controlled text is sanitised at the display boundary, stored raw, and grim's
   existing `sanitize_member_label` is the reference implementation** (`tui/render.rs:98-138`):
   one linear pass stripping C0/C1 controls, ESC/CSI sequences, bidi overrides and isolates
   (U+202A–U+202E, U+2066–U+2069), and zero-width code points (U+200B–U+200D, U+FEFF). The
   threat is not hypothetical — CWE-150, [CVE-2019-9535](https://nvd.nist.gov/vuln/detail/CVE-2019-9535)
   (iTerm2 RCE from terminal *output*), [CVE-2021-27135](https://nvd.nist.gov/vuln/detail/CVE-2021-27135)
   (xterm, triggered by combining characters, not escapes), and Trojan Source. Two decisions
   fall out. **First: stripping U+200D is correct even though it mangles emoji ZWJ sequences** —
   the width doc warns that ZWJ clusters are context-dependent width, and a package manager
   trades one glyph's fidelity for a predictable column budget without argument. **Second: the
   sanitiser is not enough on its own** — it currently reaches only bundle-member labels
   (`detail.rs`, `tree.rs`), while every other registry-sourced string in the tree, detail pane
   and status line goes to the terminal raw. Coverage, not the algorithm, is the gap.
6. **Width and truncation are a second pass, after sanitising, and grim fails it.** `fit()`
   (`render.rs:68-76`) truncates by `chars().count()` — scalar values, not grapheme clusters, and
   not display width. A CJK package name is measured at half its rendered width and skews the
   table; a combining sequence can be cut mid-cluster. The fix is the documented one: strip →
   walk `unicode-segmentation` graphemes → sum `unicode-width` per cluster → stop before the
   budget. `unicode-width` is already a dependency; `unicode-segmentation` is not, and should be.
7. **A TUI test suite is four things, and grim has two.** (a) `TestBackend` render tests per
   screen state at ≥2 widths — grim has these (`render.rs:1721-1821`, `install_progress.rs:144`).
   (b) State-transition tests calling `handle()` with synthetic `TuiInput`, never through a
   `Terminal` — grim has these densely in `event.rs`. (c) A sanitiser corpus with one case per
   attack class (CSI, OSC 8, OSC 52, bidi, zero-width, CJK width, emoji cluster) — partial.
   (d) A proptest folding arbitrary `TuiInput` sequences through `handle` and asserting model
   invariants (selection index in range, scroll clamped, no mode is a trap) — absent, and the
   cheapest remaining win, because `handle` is already a pure function over an enum.
   **Do not add `insta`.** ratatui's official recipe reaches for it
   ([snapshots](https://ratatui.rs/recipes/testing/snapshots/)), but grim's hand-written
   assertions state *what must be true* and survive a layout tweak; `.snap` files turn every
   cosmetic change into a review of generated text, and insta cannot assert colour anyway.
8. **The stream contract and the TUI do not conflict, because they never run at the same time.**
   CLI-01/CLI-08 ([rust-cli-contract.md](rust-cli-contract.md)) govern stdout/stderr; inside the
   alternate screen the whole terminal is the app's canvas. The binding rule is temporal: between
   `TerminalGuard::enter()` and its `Drop`, **nothing** writes to stdout or stderr except through
   `Terminal::draw`. Every `eprintln!`, every `tracing` writer, every progress bar must be
   suppressed or buffered for the duration, or it corrupts the frame.
9. **The accessibility answer is the non-TTY answer is the `--no-tui` answer — one code path,
   three triggers.** Immediate-mode full-repaint TUIs are structurally hostile to screen readers
   and no in-TUI toggle fixes that. grim already gates on `stdout().is_terminal()`
   (`command/tui.rs:67`), but the message it prints is a dead end rather than a fallback, and
   there is no `--no-tui` flag at all. Every action the TUI offers must be reachable from a plain
   subcommand that prints linear scrollback.

## The ruleset

Numbered TUI-*. Severity: MUST (a violation is a defect), SHOULD (a violation needs a written
reason), CONSIDER (judgement, but the default is stated).

### Architecture and the event loop

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TUI-01 | The pure core (`state`, `render`, `event`, `tree`) imports no `crossterm`, no `ratatui::Terminal`/backend, no `std::io`, no `tokio`, and does no I/O. Terminal ownership, raw mode and the runtime live in exactly one shell module. | This split is the only reason any of the state or key-handling logic is testable without a pty; it is already grim's documented design and must not erode. | `grep -rn 'crossterm\|std::io\|tokio::\|\.await' src/tui/{state,event,render,tree}.rs` — every hit is a finding. | MUST |
| TUI-02 | Rendering is one pure `view(&Model, &mut Frame)`; it mutates nothing outside render-local temporaries and performs no I/O. | ratatui's own TEA contract: "for a given state of the model, the view function should always produce the same visual output" — and it is what makes `TestBackend` tests deterministic. | Inspect the render entry point and its callees for `&mut` state parameters, `.await`, `std::fs`, `tokio::spawn`. | MUST |
| TUI-03 | State changes happen only inside the `handle`/`update` function, which returns an action enum. The shell applies actions; it never assigns to model fields directly. | A shell that mutates state makes every transition reachable only through a real terminal. grim's `TuiInput → handle → TuiAction` shape is the reference. | The shell module must contain no `state.<field> =` and no calls to `&mut self` state setters outside the action-application match. | MUST |
| TUI-04 | The event loop never blocks and never `.await`s I/O. Terminal input, the tick, and every background result are branches of one `tokio::select!` (or a `crossbeam::Select` in a sync app); long operations are `tokio::spawn`ed with a channel back into the event enum. | A stalled render loop is a stalled input loop: a registry pull awaited inline queues every keystroke — including the quit key — for its whole duration. Confirmed shape in atuin, oha, television and ratatui's own async template. | `grep -n '\.await' <shell module>` — every hit must be a channel `recv`, a `select!` arm, or an `interval.tick()`. Any network/filesystem await is a finding. | MUST |
| TUI-05 | Never call blocking `crossterm::event::poll`/`event::read` inside an `async fn`. Use `crossterm::event::EventStream`, or a dedicated `spawn_blocking` poll task re-armed in a loop. | A 200 ms blocking poll per tick parks a `multi_thread` worker; this is ASYNC-01 with a terminal attached. | `grep -rn 'event::poll\|event::read' src/` — any hit inside an `async fn` body is a finding. | MUST |
| TUI-06 | Once the shell exceeds one screen's worth of concerns, split it **by feature** (event source, background scheduler, data loader, session lifecycle) — never by re-merging state/render/event back together. | yazi's `dispatcher/executor/renderer/router/signals` split is the field's answer to a large shell; layer-merging destroys TUI-01. | Review: a shell module >2 kLOC with ≥3 unrelated concerns and repeated `(ctx, state, checker)` parameter triples is the signal. | SHOULD |
| TUI-07 | Every `tokio::spawn`ed background task carries a generation/epoch token, and results whose generation is stale are discarded on receipt. | The user can refresh or change scope while a fetch is in flight; without an epoch the late result overwrites fresher state. grim's `bundle_checker.bump_generation()` is the reference. | For each background result channel, confirm the receiving arm compares a generation before applying. | SHOULD |

### Terminal-state guarantees

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TUI-08 | One RAII guard type owns raw mode and the alternate screen, and one restore function is called from its `Drop`, from a `std::panic` hook installed **before** the first `enter()`, and from nowhere else. The panic hook restores, then re-invokes the previously-installed hook. | `Drop` alone loses the panic message: it prints into the alternate screen the `Drop` then tears down, so the user sees a clean shell and no error. Three exit paths restoring three ways is how leaks happen. | `grep -rn 'disable_raw_mode\|LeaveAlternateScreen'` — exactly one call site each, inside the guard. `grep -rn 'panic::set_hook'` — must exist and must call the guard's restore. | MUST |
| TUI-09 | No `std::process::exit` or `std::process::abort` is reachable after the guard is entered. Exit decisions return a value up to a `main` outside the guard's lifetime. | `exit()` runs no destructors on any thread, so it bypasses the guard and leaves the user's shell without echo until they blind-type `reset`. Same rule as EXIT-02. | `grep -rn 'process::exit\|process::abort' src/tui/ src/command/tui.rs` — any hit is a finding. | MUST |
| TUI-10 | A caught `SIGINT`/`SIGTERM` handler does terminal I/O never; it sends a Quit event into the existing channel and lets the normal path run the guard. The reported status derives from the signal actually received. | Signals do not unwind, so they skip `Drop` exactly like `exit()`. Routing through the event channel keeps exactly one restore path. Hardcoding 130 lies to systemd about SIGTERM (EXIT-11). | `grep -rn 'signal_hook\|ctrlc\|signal::' src/` — the handler body must contain only a channel send. | SHOULD |
| TUI-11 | Gate the TUI on `std::io::stdout().is_terminal()` **and** an explicit `--no-tui` flag, both falling through to the *same* plain, line-oriented code path — not to an error message. | One implementation, three triggers: piped/CI, explicit opt-out, and screen-reader users. A TUI that only refuses to run in a pipe has no fallback at all. | `grep -rn 'is_terminal' <tui entry>` before any `enable_raw_mode`; runnable check: `<bin> tui | cat` prints usable plain output and exits 0. | MUST |
| TUI-12 | Between guard entry and guard drop, nothing writes to stdout or stderr except `Terminal::draw`. Logging, progress bars and `eprintln!` are suppressed or buffered for the session's duration. | A stray write lands mid-frame and corrupts the alternate screen with no way for the diff to repair it. | `grep -rn 'println!\|eprintln!\|print!\|ProgressBar' src/tui/` — any hit outside a test is a finding; confirm the tracing writer is disabled for the session. | MUST |

### Untrusted text

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TUI-13 | Every registry-, manifest- or network-sourced string passes the sanitiser at the *display* boundary. State and caches store the raw value; sanitisation is never persisted. | The two-boundary invariant grim already documents (`tui/tree.rs:240-245`): sanitising on ingest corrupts the value used for matching and logging; sanitising on display is the only place it is unambiguously correct. | For each `Span`/`Line`/`Paragraph` constructed from a `Package`/`Manifest`/`Catalog` field, confirm a sanitiser call in between. A `Line::raw(<registry field>)` with no sanitiser is a finding. | MUST |
| TUI-14 | The sanitiser strips, in one pass: all C0/C1 controls, ESC-introduced CSI/OSC sequences, bidi overrides and isolates (U+202A–U+202E, U+2066–U+2069), and zero-width code points (U+200B–U+200D, U+FEFF). Styling is re-emitted from trusted code only — attacker escape bytes are never forwarded. | CWE-150 plus real terminal RCEs; `strip-ansi-escapes` alone misses the bidi and zero-width classes, which are Unicode-content attacks, not escape-sequence attacks. `ansi-to-tui` is a renderer, not a sanitiser — a well-formed OSC 52 is not "malformed". | One unit test per stripped class asserting absence from the output; a test asserting the function is not O(n²). | MUST |
| TUI-15 | Truncate for display by walking grapheme clusters (`unicode-segmentation`) and summing `unicode-width` per cluster, stopping before the column budget — never by byte slice or `chars().take(n)`, and only after sanitising. | `unicode-width` is scalar-value width, not cluster width; `chars().count()` measures a CJK name at half its rendered width and skews every fixed-width column, and can cut a combining sequence in half. Measuring before stripping desynchronises the budget from what the terminal will actually do. | `grep -rn '\.chars()\.take(\|\.chars()\.count()\|&[a-z_]*\[\.\.' src/` — each hit on non-literal text is a finding. | MUST |
| TUI-16 | A hand-written `Widget`/`StatefulWidget` impl intersects its `area` with `buf.area` before indexing into the buffer. | Out-of-bounds buffer writes panic — inside raw mode, which means the panic message is eaten unless TUI-08 holds. ratatui's own FAQ names `area.intersection(buf.area)` as the fix. | For every `impl Widget`/`StatefulWidget`, confirm an `intersection`/`clamp` precedes any `buf.set_*`/index. | MUST |

### Interaction and presentation

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TUI-17 | `Ctrl-C` quits from every mode, unconditionally. The key mapper must therefore inspect `KeyEvent::modifiers`, not `KeyCode` alone. | Raw mode disables the kernel's SIGINT translation, so Ctrl-C arrives as an ordinary key event — a mapper that drops modifiers silently rebinds the one key every terminal user trusts. | `grep -n 'modifiers' <key mapper>` — a mapper matching only on `key.code` is a finding. Test: synthetic `Char('c') + CONTROL` in each mode returns the Quit action. | MUST |
| TUI-18 | `Esc` cancels the current mode/overlay/filter and steps back one level; it never exits the process. `q` and `Ctrl-C` exit. | Collapsing the two removes the "back out without losing my place" affordance every surveyed TUI provides. | For each modal/overlay/input state in the model, a test asserting `Esc` returns to the previous state. | MUST |
| TUI-19 | Every key event handler filters on `key.kind == KeyEventKind::Press` (or explicitly skips `Release`). | crossterm emits Press *and* Release per keypress on Windows only; unfiltered handlers double-fire on a platform the developer is not testing on. | `grep -rn 'Event::Key(' src/` — each must have a `KeyEventKind` guard on the same path. | MUST |
| TUI-20 | Every list/scroll surface accepts both arrow keys and vim keys (`j`/`k`, and `h`/`l` where lateral movement exists). | htop, btop, gitui and lazygit all ship both simultaneously; supporting one is a free loss of half the audience, and it costs one extra match arm. | For each `KeyCode::Up`/`Down` arm in a navigation context, confirm a `Char('k')`/`Char('j')` sibling. | SHOULD |
| TUI-21 | Ship both a persistent context-relevant key-hint bar in the primary view and a full `?` help overlay. Neither alone. | The bar teaches by repetition; the overlay is the reference for the long tail the bar cannot fit. `?` for help and `/` for search are shared vocabulary — inventing alternatives costs a lookup every session. | Confirm a footer/hint widget in the default render path and a `?`-reachable overlay state. | SHOULD |
| TUI-22 | Colour is never the only channel for meaning: every colour-coded state also carries a glyph, prefix or label. Semantic colours use terminal ANSI slots, not invented truecolor or hardcoded `Color::White`/`Color::Black`. `NO_COLOR` (non-empty) degrades the TUI to an uncoloured render, overridable by an explicit `--color` flag. | A TUI renders inside the user's palette, so no contrast ratio can be guaranteed (WCAG 1.4.3 needs 4.5:1) — redundant coding is the only reliable mitigation. Hardcoded white text is unreadable on a light-background terminal. | `grep -rn 'Color::White\|Color::Black\|Color::Rgb' src/tui/` — each hit is a finding. Confirm the TUI's colour resolver consults the same `NO_COLOR` policy the CLI printer uses. | MUST |
| TUI-23 | Feedback scales with duration: under ~1 s nothing, 1–10 s an indeterminate spinner, past ~10 s a determinate progress indicator **and** a cancel path. Never a modal that blocks input for a state the user did not ask to confirm. | Nielsen's thresholds apply verbatim to a terminal; a bare spinner past 10 s reads as a hang, and a blocking modal for a transient state makes the keyboard dead. | Review each operation that can exceed 10 s (registry resolve, multi-artifact install) for a determinate indicator and a cancel key. | SHOULD |
| TUI-24 | Handle `Event::Resize` as a normal event that re-clamps scroll offsets and redraws. State a minimum usable size and render a placeholder below it rather than a mangled layout. | ratatui provides no minimum-size API; `Constraint::Min`/`Percentage` degrade to zero-height areas silently, which reads as a broken app rather than a small window. | Test: drive the model to a 20×5 size and assert the render is a legible placeholder, not a panic and not an empty frame. | SHOULD |
| TUI-25 | Leave mouse capture off by default. If enabled, make it runtime-togglable and document the Shift-to-select bypass. | `EnableMouseCapture` takes the terminal's native drag-select away — for a package manager whose users copy package names and error text out of the UI, that is a net loss. | `grep -rn 'EnableMouseCapture' src/` — a hit with no toggle is a finding. | CONSIDER |

### Testing

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TUI-26 | Every screen and major render state has a `TestBackend` render test asserting content, at a narrow and a wide width. Prefer explicit assertions over `insta` snapshots. | The render function is pure, so this is the cheapest test in the codebase. Snapshots turn every cosmetic change into a diff review and cannot assert colour anyway; explicit assertions state the invariant. | `grep -rn 'TestBackend' src/` — count should track the number of distinct screens; each test asserts on buffer content, not just that `draw` returned `Ok`. | MUST |
| TUI-27 | Keybinding and state-transition tests call `handle`/`update` directly with synthetic input values and assert on model fields. They do not construct a `Terminal`. | This is the layer the architecture made testable; routing through a backend tests more machinery than the logic under test and hides which layer broke. | A test asserting keybinding behaviour that constructs a `Terminal` is a finding. | MUST |
| TUI-28 | The sanitiser has a test corpus with one case per attack class: CSI colour, cursor-move, OSC 8 hyperlink, OSC 52 clipboard write, U+202E bidi override, U+2066 isolate, zero-width joiner, BOM, a CJK string, and a multi-codepoint emoji cluster. | Each class fails differently, and a sanitiser that handles CSI but not bidi passes any test written from a single example. | The corpus exists as a table-driven test next to the sanitiser; each row asserts both the stripped output and the resulting display width. | MUST |
| TUI-29 | A property test folds arbitrary sequences of the input alphabet through `handle` and asserts model invariants that must hold for every reachable state (selection index in range, scroll clamped to content, every mode reachable by `Esc` back to the root). | `handle` is a pure function over an enum — proptest is available for free, and no example-based suite finds the mode that traps the user. | A `proptest!` over `Vec<TuiInput>` exists and asserts at least the three invariants named. | SHOULD |

## Applied to OCX

**Already satisfied**

- **TUI-01/TUI-02/TUI-03** — the functional-core split is real and documented per file:
  `tui/state.rs` (3,978 LOC) "free of ratatui, crossterm, and std::io"; `tui/render.rs` (3,729)
  documents `frame` as "a pure function"; `tui/event.rs` (2,386) "no terminal imports"
  ([crate-architecture.md:142-149](ocx-codebase-audit/crate-architecture.md)). `map_key`
  (`grimoire/src/tui/app.rs:1026`) is explicitly "the *only* crossterm-aware decision in the
  codebase". This is the strongest architectural asset in the topic.
- **TUI-14** — `sanitize_member_label` (`grimoire/src/tui/render.rs:98-138`) strips C0/C1, ESC/CSI,
  U+202A–U+202E, U+2066–U+2069, U+200B–U+200D and U+FEFF in a single documented linear pass, with
  a non-O(n²) requirement written into its contract.
- **TUI-13 (invariant, not coverage)** — the two-boundary rule is documented and enforced where it
  is applied: `tui/tree.rs:240-245` ("Raw member name — sanitize before terminal output"),
  `tui/detail.rs:227-237` sanitises defensively at the display boundary including `member_repo`.
- **TUI-19** — both loops filter `KeyEventKind::Release` (`app.rs:312`, `init_dialog.rs:239`).
- **TUI-20** — `event.rs:236-240` binds `Up`/`Char('k')` and `Down`/`Char('j')` to the same arms;
  `event.rs:398` adds `j`/`k` detail-pane scrolling.
- **TUI-21** — `?` opens a help overlay (`event.rs:681`), sized to fit 80×24 with a scroll fallback
  (`render.rs:1534`).
- **TUI-24 (partial)** — `Event::Resize` re-clamps and redraws with an explicit `terminal.clear()`
  to erase stale cells (`app.rs:302-306`).
- **TUI-25** — mouse capture is never enabled anywhere; native text selection is preserved.
- **TUI-26/TUI-27** — `TestBackend` render tests at multiple widths (`render.rs:1721-1821`,
  `install_progress.rs:144-187`) and dense direct `handle()` transition tests throughout
  `event.rs` — 2,687 test functions across the crate.

**Violated**

- **TUI-17 — Ctrl-C does not quit the grim TUI; it clears marks.** `map_key`
  (`grimoire/src/tui/app.rs:1026-1039`) matches on `key.code` only and discards `key.modifiers`,
  so `Ctrl-C` arrives as `KeyCode::Char('c')` → `TuiInput::Char('c')` → `event.rs:575`
  `state.clear_marks()`. The pre-session dialog handles it correctly
  (`init_dialog.rs:243`), which makes the main loop's omission a genuine oversight rather than a
  policy. **Highest-severity finding in this topic** — the user's only remaining exit is `q`, and
  a user who does not know that will `kill` the process, taking the SIGTERM path that TUI-10 also
  does not cover.
- **TUI-08 — no panic hook exists.** `grep 'panic::set_hook'` over `grimoire/src` returns nothing;
  the only `std::panic::` uses are `resume_unwind` on join errors. `TerminalGuard`
  (`tui/terminal_guard.rs:32-36`) restores on unwind, so a panic mid-session tears down the
  alternate screen *after* the message was painted into it — the user gets a clean shell and a
  silent crash. Compounded by `app.rs:275` deliberately swallowing background-task panics "in raw
  mode".
- **TUI-04/TUI-05 — the event loop blocks and awaits I/O inline.** `app.rs:293` calls
  `event::poll(Duration::from_millis(200))` and `app.rs:296` `event::read()`, both blocking, inside
  an `async fn` on the `multi_thread` runtime; `app.rs:334` `.await`s `reload_into` in the
  `TuiAction::Refresh` arm, freezing input for the entire registry round-trip. This is the same
  defect [rust-async.md](rust-async.md) ASYNC-01 names, with a UI attached.
- **TUI-15 — `fit()` truncates by scalar count.** `grimoire/src/tui/render.rs:68-76` uses
  `s.chars().count()` and `s.chars().take(width - 1)`, then pads with `{s:<width$}` — which also
  pads by `char` count. A CJK or emoji package name renders at up to double the intended column
  width and skews the whole table. `unicode-segmentation` is not a dependency
  (`grimoire/Cargo.toml:70` has `unicode-width` only). Same defect at
  `grimoire/src/cli/printer.rs:170`.
- **TUI-13 (coverage) — the sanitiser reaches only bundle-member labels.**
  `grep -rl 'sanitize_member_label('` returns exactly `tui/render.rs`, `tui/tree.rs`,
  `tui/detail.rs` — 4 call sites. Package names, descriptions, tags, and registry error strings
  rendered in the tree rows, the detail pane's other fields and the status line are not routed
  through it. Same threat model as CLI-03, which
  [rust-cli-contract.md](rust-cli-contract.md) already rates HIGH against grim's unsanitised
  `{err:#}` at `grim/main.rs:326`.
- **TUI-22 — hardcoded absolute colours and no `NO_COLOR` in the TUI.** `tui/init_dialog.rs`
  hardcodes `Color::White` at lines 278, 282, 287, 297 — invisible on a light-background terminal.
  `src/cli/color.rs:75` implements the full `NO_COLOR`/`CLICOLOR_FORCE`/`TERM=dumb` precedence
  correctly for CLI output, but `render.rs:1611 fn color_for` never consults it. The redundant-coding
  half of the rule *is* satisfied: every `ArtifactState` carries a glyph and a text label alongside
  its `ColorKey` (`render.rs:53-62`).
- **TUI-11 — no `--no-tui` flag, and the non-TTY path is a dead end.** `command/tui.rs:67` detects
  the non-TTY case and prints "grim tui requires an interactive terminal", then exits 0. Correct
  refusal, no fallback: there is no plain-mode render of the catalog tree, and `grep -rn 'no_tui'`
  finds nothing.
- **TUI-06 — `tui/app.rs` is 7,563 LOC with 76 free functions** threading
  `(&TuiContext, &mut TuiState, &mut UpdateChecker)` through
  `arm_background_checks`/`schedule_row_checks`/`recheck_rows`/`drain_checks`/
  `drain_bundle_member_checks`/`drain_catalog_ready`
  ([crate-architecture.md:194](ocx-codebase-audit/crate-architecture.md)). Feature-split, not
  layer-merge.

**New commitments** (nothing in the codebase does these today)

- TUI-10: no signal handling exists in grimoire at all
  ([rust-async.md](rust-async.md) "Applied to OCX", smell #9) — SIGTERM currently kills the process
  with raw mode still enabled.
- TUI-12: no audit has been done of what writes to stdout/stderr while the guard is live; the
  tracing writer's behaviour during a TUI session is unverified.
- TUI-16: grim defines no custom `Widget`/`StatefulWidget` impls today, so the rule is preventive.
- TUI-28: the sanitiser's tests exist but were not written as a per-attack-class corpus with width
  assertions.
- TUI-29: no property test over `TuiInput` sequences exists, despite `handle` being a pure function
  over an enum and `proptest` being the obvious fit.
- TUI-07: generation tokens exist for bundle-member fetches (`bump_generation`) but not for the
  main catalog reload path.

## AI-agent failure modes

Ranked by how often they bite a codebase of this shape.

1. **Awaiting a registry call inline in the event loop.** The model sees an `async fn` and an
   operation to perform, and writes `.await`. It compiles, works on a fast local registry, and
   freezes the UI for the whole round-trip in production. This is the defect actually present at
   `app.rs:334`, which is the strongest evidence of how natural it is.
2. **`chars().take(n)` for truncation.** The shortest obviously-correct-looking code, wrong for
   any non-ASCII string and doubly wrong on unsanitised text. Present twice in grim.
3. **`std::process::exit(1)` as the bail-out inside a TUI**, learned from CLI training data. Skips
   the guard, leaves the shell in raw mode, and nothing in the type system objects.
4. **Writing a `Drop` guard and stopping there** — treating panic-restore as covered because the
   guard exists. The panic hook is a separate mechanism and the failure is invisible in testing
   (the shell *is* restored; only the error message is lost).
5. **Rendering a registry string with `Line::raw(desc)`.** Nothing marks `desc: String` as
   untrusted, so no signal fires. Agents will sanitise the field the task names and no other,
   producing exactly grim's current partial coverage.
6. **Matching on `key.code` and ignoring `key.modifiers`.** The mapper looks complete and passes
   every test written from the plain keys — this is precisely how the Ctrl-C bug got in.
7. **Omitting the `KeyEventKind::Press` filter.** Nothing in the type signature hints at the
   Windows double-fire, and the developer's machine never reproduces it.
8. **Collapsing vim keys and arrow keys to one style**, because the duplicate match arms read as
   redundant to a model optimising for "clean".
9. **Skipping `is_terminal()` at the entry point** unless CI or piping is named in the task; the
   happy path is what gets written first.
10. **Belt-and-suspenders cleanup** — adding a second `disable_raw_mode()` "just to be safe"
    alongside the guard, which turns one deterministic restore into two racing ones.
11. **Reaching for `insta` because it is the documented recipe**, adding a `.snap` corpus and a
    `cargo-insta` dependency where three explicit assertions would have said more.
12. **Hardcoding `Color::White`/`Color::Black`** rather than the terminal's default foreground,
    because dark-background terminals are what the training data assumes.
13. **Handing the full backing `Vec` to `List`/`Table` every frame.** Correctness-neutral, so it
    passes review; the cost only appears as measured frame time, which an agent cannot self-detect
    without a benchmark.
14. **Using `WidgetRef`** because it appears in the docs, without noticing it is gated behind
    `unstable-widget-ref` and documented as subject to change.

## Open questions

1. **Does the grim TUI event loop get rewritten to `EventStream` + `select!`, or does it get the
   cheaper atuin fix — the blocking poll moved to a `spawn_blocking` task feeding a channel?** The
   second is a much smaller diff against a 7,563-line file and removes the runtime-starvation half
   of the problem, but leaves `reload_into` awaited inline. Recommendation: do both, in that order,
   as separate changes. **This is the one subarea that deserves another research round** — a
   concrete migration plan for a large existing poll-based loop, rather than the greenfield shape
   the templates document.
2. **What is the sanitiser's real coverage boundary?** "Every registry-sourced string" is the rule;
   enumerating which model fields are registry-derived across `TuiState`, `tree.rs` and `detail.rs`
   is an audit nobody has run. A type-level answer (a `Untrusted<String>` newtype whose only
   `Display` goes through the sanitiser) would make it mechanical instead of a grep — but that is a
   refactor across the whole state module.
3. **Should `--no-tui` render the catalog tree as plain text, or should it just point at
   `grim search`/`grim status`?** The accessibility argument wants feature parity; the ponytail
   argument says the existing subcommands already cover every action and a second renderer is a
   second thing to keep in sync.
4. **Does confusable/mixed-script detection (`unicode-security`, UTS #39) belong on package names
   at the display boundary, or at the data boundary in `SkillName::parse`?** The UX research flags
   the homoglyph half of Trojan Source as uncovered by the current sanitiser, and it is not clear
   the crate covers bidi at all — that needs verification against its source, not its docs.
5. **Is there a measurable frame-time problem with the catalog list at realistic sizes?** The
   virtualization guidance is speculative until someone times `terminal.draw()` against a 10k-row
   fixture. Do not slice-to-viewport on principle.
6. **Windows.** Every Windows-specific hazard here (double key events, backend raw-mode differences)
   is handled from documentation, not from a Windows CI run of the TUI. Whether the TUI is exercised
   on Windows at all is unverified.

## Sub-artifacts

- [rust-tui/ratatui-architecture-and-testing.md](rust-tui/ratatui-architecture-and-testing.md) —
  the immediate-mode/diff model, TEA vs Component vs Flux, event-loop shapes across gitui, yazi,
  atuin, oha, television and bottom, RAII/panic/signal terminal safety, layout caching, unicode
  width, resize and minimum size, `TestBackend` + `insta`, and the widget-crate ecosystem.
- [rust-tui/tui-ux-and-terminal-safety.md](rust-tui/tui-ux-and-terminal-safety.md) — keybinding
  conventions across lazygit/k9s/htop/fzf/helix/btop, discoverability, `NO_COLOR` and colour
  degradation, screen-reader accessibility and the non-TUI fallback, Nielsen latency bands,
  CWE-150/Trojan Source/OSC 52 terminal attacks, grapheme-safe truncation, mouse capture, and
  non-TTY detection.
- [ocx-codebase-audit/crate-architecture.md](ocx-codebase-audit/crate-architecture.md) — the
  measured shape of grim's TUI modules and the documented functional-core intent behind each.

## Key sources

| URL | Why |
|---|---|
| [ratatui.rs — rendering under the hood](https://ratatui.rs/concepts/rendering/under-the-hood/) | The immediate-mode contract and the buffer diff that makes full redraw cheap |
| [ratatui.rs — the Elm architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/) | The pure-`view` contract grim's split already exceeds |
| [ratatui.rs — terminal and event handler recipe](https://ratatui.rs/recipes/apps/terminal-and-event-handler/) | The RAII `Tui` guard and resize plumbing, verbatim |
| [ratatui.rs — panic hooks](https://ratatui.rs/recipes/apps/panic-hooks/) | The exact take-hook/restore/re-invoke shape TUI-08 requires |
| [ratatui.rs — FAQ](https://ratatui.rs/faq/) | Windows double key events, out-of-bounds buffer panics, and ratatui's "not an async library" stance |
| [ratatui.rs — snapshot testing](https://ratatui.rs/recipes/testing/snapshots/) | The official `TestBackend`+insta recipe, including its documented inability to assert colour |
| [std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html) | "No destructors on the current stack or any other thread's stack will be run" — the wording behind TUI-09 |
| [std::io::IsTerminal](https://doc.rust-lang.org/std/io/trait.IsTerminal.html) | Stable since 1.70; the dependency-free non-TTY gate |
| [CWE-150](https://cwe.mitre.org/data/definitions/150.html) | The exact weakness class for terminal escape injection, and it names LLM-generated output explicitly |
| [CVE-2019-9535 (iTerm2)](https://nvd.nist.gov/vuln/detail/CVE-2019-9535) | Proof that printing untrusted text to a terminal is an RCE surface, CVSS 9.8, no interaction |
| [CVE-2021-27135 (xterm)](https://nvd.nist.gov/vuln/detail/CVE-2021-27135) | Proof that Unicode combining-character *content*, not just escapes, is part of that surface |
| [trojansource.codes](https://trojansource.codes/) | CVE-2021-42574/42694 bidi and homoglyph mechanics, and the "make them perceptible" mitigation |
| [Embrace The Red — Terminal DiLLMa](https://embracethered.com/blog/posts/2024/terminal-dillmas-prompt-injection-ansi-sequences/) | Catalogued OSC 8 / OSC 52 / hidden-text attacks against tools rendering untrusted generated text |
| [docs.rs/unicode-width](https://docs.rs/unicode-width/latest/unicode_width/) | Scalar-value width vs grapheme-cluster width — the distinction `fit()` misses |
| [docs.rs/unicode-segmentation](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/) | The grapheme-cluster iterator TUI-15 requires and grim does not yet depend on |
| [no-color.org](https://no-color.org/) | The presence-and-non-empty semantics plus the explicit-flag override clause |
| [nngroup — response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | The 0.1 s / 1 s / 10 s bands behind TUI-23 |
| [github.com/ratatui/templates](https://github.com/ratatui/templates) | The canonical spawned-`EventTask` + `tokio::select!` shape TUI-04 mandates |
| [github.com/sxyazi/yazi](https://github.com/sxyazi/yazi) | The reference for splitting a large TUI shell by feature rather than by layer |
| [github.com/atuinsh/atuin](https://github.com/atuinsh/atuin) | Blocking input poll on a spawned task alongside async queries — the cheaper migration path in Open question 1 |
