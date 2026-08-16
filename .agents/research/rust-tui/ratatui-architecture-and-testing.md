---
title: ratatui application architecture and testing
topic: rust-tui
agent: inv-tui-architecture
model: sonnet
date_researched: 2026-08
sources_count: 24
scope: >
  Covers ratatui's immediate-mode rendering model (0.30.x era), application
  architecture patterns (Elm/TEA, component, flux), the event loop (crossterm
  poll/read/EventStream, tokio integration, tick vs render decoupling),
  terminal-state safety (raw mode/alt screen RAII, panic hooks, signals),
  rendering correctness (unicode width, layout, large lists), resize/minimum
  size, and TDD/testing (TestBackend, insta snapshots). Does NOT cover
  non-ratatui TUI toolkits in depth, GPU/graphical terminal emulation, or the
  OCX/grim codebases themselves (that mapping is left to the calling agent).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The immediate-mode model](#1-the-immediate-mode-model)
   2. [Application architecture](#2-application-architecture)
   3. [The event loop](#3-the-event-loop)
   4. [Terminal state safety](#4-terminal-state-safety)
   5. [Rendering correctness and performance](#5-rendering-correctness-and-performance)
   6. [Resize and minimum viable size](#6-resize-and-minimum-viable-size)
   7. [Testing a TUI](#7-testing-a-tui)
   8. [Ecosystem and real-world source](#8-ecosystem-and-real-world-source)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- ratatui is immediate-mode: every `Terminal::draw()` closure must render the
  *entire* frame from current state; nothing persists across frames except
  what you explicitly redraw. [ratatui.rs/concepts/rendering/under-the-hood](https://ratatui.rs/concepts/rendering/under-the-hood/)
- ratatui double-buffers and diffs: it keeps a previous `Buffer`, diffs it
  against the new one, and only writes the changed cells to the real
  terminal — the "redraw everything" contract is cheap in practice because
  the I/O layer is incremental even though the app layer is not. [ratatui.rs/concepts/rendering/under-the-hood](https://ratatui.rs/concepts/rendering/under-the-hood/)
- ratatui ships three first-party architecture patterns — Elm/TEA
  (message → update → view), component (self-contained widgets with local
  state and their own event handling), and flux — and explicitly refuses to
  pick a winner: "the correct way is the one that works for you." [ratatui.rs/concepts/application-patterns](https://ratatui.rs/concepts/application-patterns/) · [component-architecture](https://ratatui.rs/concepts/application-patterns/component-architecture/) · [event-handling](https://ratatui.rs/concepts/event-handling/)
- ratatui is explicitly *not* an async library; adopting tokio is a decision
  about the rest of your app (network/registry calls), not about rendering
  itself. [ratatui.rs/faq](https://ratatui.rs/faq/)
- The dominant real-world pattern for decoupling input from a slow background
  task is N channels (crossterm/input, ticks, one per async subsystem) fed
  into a single `select!`/`Select` in the main loop — done with `tokio::select!`
  in async apps (ratatui's own templates, television, atuin) and with
  crossbeam's `Select` in sync apps (gitui). [templates event.rs](https://github.com/ratatui/templates) · [gitui app.rs](https://github.com/extrawurst/gitui) · [television app.rs](https://github.com/alexpasmantier/television)
- A long-running task (a registry pull) must run on its own spawned
  task/thread with a channel back to the UI loop; it must never be `.await`ed
  or blocking-polled inside the render loop itself, or input freezes for the
  duration of the pull.
- Raw mode and the alternate screen must be entered/left as a matched pair;
  the robust pattern is an RAII guard whose `Drop` calls the same restore
  code used on the happy path, *and* a `std::panic` hook that restores the
  terminal before re-invoking the original hook. [ratatui.rs/recipes/apps/panic-hooks](https://ratatui.rs/recipes/apps/panic-hooks/) · [terminal-and-event-handler](https://ratatui.rs/recipes/apps/terminal-and-event-handler/)
- `Drop` never runs across a `std::process::exit()` call — the Rust std docs
  say so in as many words — so any code path that reaches for `process::exit`
  after entering raw mode/alt-screen bypasses your RAII guard and leaves the
  user's shell broken. [doc.rust-lang.org std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html)
- SIGINT/SIGTERM are not caught by a `Drop` guard at all — a `Drop` guard only
  fires on unwind, and a signal by default kills the process without
  unwinding — so terminal-restoring cleanup for Ctrl-C must be wired
  explicitly (signal handler or a Ctrl-C channel event handled inside the
  normal event loop), not assumed to come for free.
- Crossterm sends **two** key events per keypress on Windows
  (`KeyEventKind::Press` and `Release`); code that reacts to every `KeyEvent`
  unconditionally double-fires on Windows only. Filter on
  `key.kind == KeyEventKind::Press`. [ratatui.rs/faq](https://ratatui.rs/faq/)
- Widgets can panic on out-of-bounds buffer writes; the fix is to intersect
  the widget's render `area` with `buf.area` (`area.intersection(buf.area)`)
  before indexing, not to trust the area you were handed. [ratatui.rs/faq](https://ratatui.rs/faq/)
- `unicode-width` computes per-*scalar-value* width (UAX #11), not
  per-grapheme-cluster width; combining marks, skin-tone-modified emoji, and
  other multi-codepoint clusters are measured codepoint-by-codepoint, which
  is not the same as "one visual glyph, one width." [docs.rs unicode-width](https://docs.rs/unicode-width/latest/unicode_width/)
- Layout constraint solving (Cassowary/kiwi) is not free per call: ratatui
  caches `Layout::split()` results in a thread-local LRU keyed on
  `(layout, area)`, default-sized at 500 entries — repeatedly calling
  `.split()` with the same layout+area inside a hot render loop is the
  supported, cheap pattern, not an anti-pattern. [docs.rs Layout](https://docs.rs/ratatui/latest/ratatui/layout/struct.Layout.html)
- `WidgetRef` (render-by-`&self`, enables `Box<dyn WidgetRef>` and rendering
  `Option<W>`) is gated behind the `unstable-widget-ref` feature and is
  explicitly documented as subject to change — do not build a public API
  around it without pinning. [docs.rs WidgetRef](https://docs.rs/ratatui/latest/ratatui/widgets/trait.WidgetRef.html)
- ratatui's official testing recipe is `TestBackend` + `insta`: render into a
  `Terminal<TestBackend>`, then `assert_snapshot!(terminal.backend())`; insta
  cannot assert on color/style as of the current recipe, only symbols. [ratatui.rs/recipes/testing/snapshots](https://ratatui.rs/recipes/testing/snapshots/)
- Real large TUIs keep the terminal-owning shell out of the async runtime's
  hot path by polling input on a **blocking** task with a short timeout
  (atuin: 250 ms `poll`) or a fixed frame budget (oha: `per_frame` sleep after
  a non-blocking `poll(Duration::from_secs(0))` drain), rather than trusting
  a bare `event::read()` not to stall everything else. [atuin interactive.rs](https://github.com/atuinsh/atuin) · [oha monitor.rs](https://github.com/hatoo/oha)

## Findings

### 1. The immediate-mode model

ratatui (latest published version **0.30.2**, per docs.rs as of this
research) is described in its own docs as an "immediate mode rendering
library" — the app does not build a persistent widget tree; it calls
`Terminal::draw(|frame| { ... })` every frame and inside that closure must
render everything it wants visible. [docs.rs/ratatui](https://docs.rs/ratatui/latest/ratatui/)

The mechanics, from ratatui's own "under the hood" page: [ratatui.rs/concepts/rendering/under-the-hood](https://ratatui.rs/concepts/rendering/under-the-hood/)

- `draw()` clears the current `Buffer` before your closure runs — there is no
  way to render "just the changed part" from the app's point of view.
- The closure gets a `Frame`, which wraps a `&mut Buffer` covering the
  terminal's viewport. The `Buffer` is a flat array of `Cell`s (symbol +
  style), roughly the terminal analogue of a pixel buffer, except a cell is
  ~2x taller than wide.
- After the closure returns, ratatui **diffs** the new buffer against the
  previous one and writes only the changed cells to the real terminal, then
  the two buffers swap for next frame. So: full redraw at the app layer,
  incremental write at the I/O layer.
- Order matters within one frame: later `render_widget` calls overwrite
  earlier ones in the same cells (there is no z-index).

Trait surface, from the crate docs: [docs.rs/ratatui](https://docs.rs/ratatui/latest/ratatui/)

- `Widget` — consumes `self` (`fn render(self, area, buf)`), the common case
  for stateless widgets built fresh each frame.
- `StatefulWidget` — takes `&mut State` alongside `self`, for widgets whose
  behavior depends on externally-owned state (scroll offset, selection).
- `WidgetRef` — renders by `&self` instead of consuming; gated behind the
  `unstable-widget-ref` feature, introduced 0.26, "could be changed or
  removed at any time." Exists specifically to let you store
  `Box<dyn WidgetRef>` or render `Option<W>` widgets without an ownership
  dance. Do not treat it as stable API. [docs.rs WidgetRef](https://docs.rs/ratatui/latest/ratatui/widgets/trait.WidgetRef.html)

Layout uses the Cassowary constraint solver over `Constraint` values
(`Length`, `Percentage`, `Ratio`, `Min`/`Max`, `Fill`); `Flex` controls how
leftover space distributes. Non-obvious performance fact: `Layout::split()`
is **cached** — a thread-local `LruCache` keyed on `(layout, area)`, default
500 entries, feature-gated as `layout-cache` for resizing that cache. This
means recomputing the same `Layout::default().constraints(...).split(area)`
every frame (the normal immediate-mode idiom) is the intended fast path, not
something to hand-optimize away with your own caching layer. [docs.rs Layout](https://docs.rs/ratatui/latest/ratatui/layout/struct.Layout.html) · [ratatui.rs/concepts/layout](https://ratatui.rs/concepts/layout/)

Cost/benefit of immediate mode, synthesized from the above: you get a
render function that is trivially a pure function of state (easy to reason
about, easy to snapshot-test — see §7) at the cost of paying full
widget-tree-construction cost every frame; the mitigation ratatui provides
is the diff-based terminal write plus the layout cache, not avoiding the
per-frame construction itself.

### 2. Application architecture

ratatui publishes three named patterns and deliberately does not rank them:
"the correct way, is the one that works for you and your current
application." [ratatui.rs/concepts/event-handling](https://ratatui.rs/concepts/event-handling/)

**Elm / TEA (Model–Update–View).** A `Model` struct holds all state, a
`Message` enum enumerates every possible state transition, `update(model,
msg) -> Option<Message>` is the only place state changes, and `view(model,
frame)` is a pure projection from model to widgets — "for a given state of
the model, the view function should always produce the same visual output."
`update` is documented as *not* mutating in place but "producing a new
instance of the model," though the shown code in fact does mutate through
`&mut Model` for practicality; the discipline being asked for is: state
changes only inside `update`, never inside `view` or inside event handling
directly. [ratatui.rs/concepts/application-patterns/the-elm-architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/)

```rust
// correct-shape TEA skeleton (from ratatui.rs)
fn update(model: &mut Model, msg: Message) -> Option<Message> {
    match msg {
        Message::Increment => {
            model.counter += 1;
            if model.counter > 50 { return Some(Message::Reset); }
        }
        Message::Decrement => model.counter -= 1,
        Message::Reset => model.counter = 0,
        Message::Quit => model.running_state = RunningState::Done,
    }
    None
}

fn view(model: &mut Model, frame: &mut Frame) {
    frame.render_widget(Paragraph::new(format!("Counter: {}", model.counter)), frame.area());
}
```

**Component architecture.** A `Component` trait owns *local* state and
handles *its own* events instead of routing everything through one global
`update`: [ratatui.rs/concepts/application-patterns/component-architecture](https://ratatui.rs/concepts/application-patterns/component-architecture/)

```rust
pub trait Component {
    fn init(&mut self) -> Result<()> { Ok(()) }
    fn handle_events(&mut self, event: Option<Event>) -> Action {
        match event {
            Some(Event::Quit) => Action::Quit,
            Some(Event::Key(key_event)) => self.handle_key_events(key_event),
            _ => Action::Noop,
        }
    }
    fn handle_key_events(&mut self, key: KeyEvent) -> Action { Action::Noop }
    fn update(&mut self, action: Action) -> Action { Action::Noop }
    fn render(&mut self, f: &mut Frame, rect: Rect);
}
```

This is the pattern real multi-screen apps converge on at scale: **gitui**
implements exactly this shape — a `Component` trait with `draw`,
`event`/`event_pump`, `show`/`hide`; tabs (Status, Revlog, Files, Stashing,
StashList) and 30+ popups all implement it, dispatched through
`event_pump(&ev, self.components_mut().as_mut_slice())`, with cross-component
signaling done by pushing an `InternalEvent` onto a shared `Queue` that
`process_queue()` drains sequentially — i.e. component-local event handling
plus a shared mailbox for effects that cross component boundaries. [gitui app.rs](https://github.com/extrawurst/gitui)

**When one `app.rs` stops being one file.** ratatui itself does not give a
LOC threshold; the empirical signal from real projects is: the split happens
along the *Component* boundary the moment there is more than one screen/tab/
popup that owns meaningfully different state and keybindings — gitui and
yazi both externalize screens into their own modules (`yazi-fm/src/{app,
mgr,tasks,cmp,help,confirm,input,pick,spot}/...` with top-level
`dispatcher.rs` / `executor.rs` / `renderer.rs` / `router.rs` / `signals.rs`
doing only routing) rather than keeping one giant match statement. [yazi-fm tree](https://github.com/sxyazi/yazi) A 7,563-line single `app.rs`
with the render/state/event concerns *already* separated into sibling files
(as in the grim TUI) is architecturally closer to yazi's split-by-concern
model than to a single monolithic match statement — the next lever is
splitting by *screen/feature* (functional-core files further divided by
which subsystem of the UI they serve), not by re-merging state/render/event.

**Flux/Redux-style** centralizes state and forces all mutation through
dispatched actions/reducers; ratatui documents it as a third named option
but the fetched page did not surface example code distinct in substance from
TEA — treat it as "TEA with an explicit store/dispatcher object" rather than
a fourth independent architecture.

### 3. The event loop

Backends: ratatui abstracts over four backends — `CrosstermBackend`,
`TermionBackend`, `TermwizBackend`, `TerminaBackend` — "each backend handles
raw mode differently." [ratatui.rs/concepts/backends/raw-mode](https://ratatui.rs/concepts/backends/raw-mode/) Crossterm is the de facto default across the
ecosystem (all cited real apps below use it).

ratatui's own FAQ is blunt about scope: "ratatui isn't a native async
library" — the decision to pull in tokio is a decision about *the rest of
the app* (network calls, background scans), and the FAQ frames it as a
binary choice between a single-threaded `Get Event → Update → Render` loop
and a multi-threaded/async one. [ratatui.rs/faq](https://ratatui.rs/faq/)

**Async two-channel/select shape**, from crossterm's own example and
ratatui's official async template — this is the canonical shape to reach
for:

```rust
// crossterm's own example: futures::select! racing a timer against EventStream
let mut reader = EventStream::new();
loop {
    let mut delay = Delay::new(Duration::from_millis(1_000)).fuse();
    let mut event = reader.next().fuse();
    select! {
        _ = delay => { /* tick */ },
        maybe_event = event => match maybe_event {
            Some(Ok(event)) => { /* handle */ }
            Some(Err(e)) => { /* log */ }
            None => break,
        }
    };
}
```
[crossterm event-stream-tokio.rs](https://github.com/crossterm-rs/crossterm)

ratatui's `event-driven-async` template generalizes this into a spawned
`EventTask` that owns a crossterm `EventStream` plus a `tokio::time::interval`
tick timer (`TICK_FPS = 30.0` ⇒ ~33 ms), and races three things in one
`select!`: the sender being closed (shutdown), the tick firing, and a
crossterm event arriving — forwarding everything onto one
`mpsc::UnboundedSender<Event>` that the render loop's `Receiver` drains. The
unbounded channel exists so the producer task never blocks on a full render
loop. [ratatui templates event.rs](https://github.com/ratatui/templates)

**Real-world confirmation, three different shapes:**

- **atuin** (tokio, async DB): the interactive-search loop is
  `'render: loop { terminal.draw(...); /* handle input */ }`, and inside it
  `tokio::select!`s three things — a **blocking** input-poll task re-armed
  every ~250 ms, a background update-check, and (on state change) an async
  history-count query against the local DB. Keeping the crossterm poll on a
  *blocking* spawned task, re-issued in a loop, rather than an `.await` in
  the same task as DB queries, is what keeps keystrokes responsive while a
  full-table-scan query is in flight. [atuin interactive.rs](https://github.com/atuinsh/atuin)
- **oha** (tokio, HTTP load generator): the monitor loop is fixed-frame-rate,
  not event-triggered — it drains a `kanal::Receiver<Result<RequestResult,
  ClientError>>` fed by the load-generating workers (`report_receiver.
  drain_into(&mut buf)`), draws, does a **non-blocking**
  `crossterm::event::poll(Duration::from_secs(0))` drain for keys, then
  sleeps for `per_frame - elapsed` where `per_frame = 1s / fps`. This is the
  "frame budget" shape: render on a clock, treat input and async results as
  things you drain, not things you block on. [oha monitor.rs](https://github.com/hatoo/oha)
- **gitui** (sync, no tokio): `select_event()` uses **crossbeam's `Select`**
  over six `Receiver`s at once — input, git-async-notify, app-async-notify, a
  5-second ticker, a filesystem-notify channel, and a spinner ticker — folding
  them into one `QueueEvent`. Proof that the two-channels-plus-select shape
  is not tokio-specific; crossbeam channels + `Select` give the same
  input/tick/background decoupling without an async runtime at all. [gitui app.rs](https://github.com/extrawurst/gitui)
- **television** runs three concurrent tokio tasks (render, event-producer at
  a configurable tick rate, an optional watch-timer) wired through four
  channel pairs (`action_tx/rx`, `event_rx`, `render_tx/rx`,
  `ui_state_tx/rx`), converts raw events to `Action`s via
  `convert_event_to_actions()` (mode-aware: Channel / RemoteControl /
  ActionPicker), and `handle_actions()` applies them — i.e., TEA's
  message/update split, but with the "message producer" itself split across
  dedicated async tasks instead of living in the main loop. [television app.rs](https://github.com/alexpasmantier/television)

**The concrete rule the grim/ocx TUI cares about most:** a long-running
future (a registry pull, an OCI blob download) must be `tokio::spawn`ed onto
its own task with a progress/result channel back into the event enum — never
awaited inline inside the function that also owns the render loop's
`select!`, or every keystroke queues up behind the network call.

### 4. Terminal state safety

The robust pattern, straight from ratatui's own recipe, is an RAII `Tui`
guard: [ratatui.rs/recipes/apps/terminal-and-event-handler](https://ratatui.rs/recipes/apps/terminal-and-event-handler/)

```rust
impl Drop for Tui {
    fn drop(&mut self) {
        self.exit().unwrap();
    }
}

pub fn exit(&mut self) -> Result<()> {
    self.stop()?;
    if crossterm::terminal::is_raw_mode_enabled()? {
        crossterm::execute!(std::io::stderr(), LeaveAlternateScreen, cursor::Show)?;
        crossterm::terminal::disable_raw_mode()?;
    }
    Ok(())
}
```

That covers normal exit and unwinding panics. It does **not** cover:

- **`std::process::exit()`.** The std docs are explicit: "because this
  function never returns, and that it terminates the process, no destructors
  on the current stack or any other thread's stack will be run." The
  documented fix is to never call it after terminal setup — return a
  `Result`/`ExitCode` from `main` instead, or from wherever the exit
  decision is made, and let unwinding run your `Drop`. [doc.rust-lang.org std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html) A leaked raw
  mode from a stray `process::exit(1)` call inside error-handling code
  leaves the user's real shell without echo/line-buffering until they run
  `reset` or `stty sane` manually — a visible, ugly bug class.
- **Panics.** Rust's default panic hook doesn't know to restore your
  terminal; you must install your own before any terminal setup, capture the
  previous hook, and call it after cleanup so the panic message still
  prints normally:
  ```rust
  pub fn init_panic_hook() {
      let original_hook = take_hook();
      set_hook(Box::new(move |panic_info| {
          let _ = restore_tui(); // ignore errors — don't mask the real panic
          original_hook(panic_info);
      }));
  }
  ```
  [ratatui.rs/recipes/apps/panic-hooks](https://ratatui.rs/recipes/apps/panic-hooks/) — this exact shape is also what gitui does:
  `panic::set_hook(...)` calls `shutdown_terminal()` (disable raw mode +
  leave alternate screen) before logging, wrapped with a `defer!` macro on
  the happy path too. [gitui main.rs](https://github.com/extrawurst/gitui)
- **SIGINT/SIGTERM.** Neither of the above catches a signal. A `Drop` guard
  only fires on unwind; a delivered SIGINT/SIGTERM by default terminates the
  process without unwinding the stack, so it skips `Drop` exactly like
  `process::exit` does. The apps in this survey handle Ctrl-C as a *normal
  input event* (crossterm reports it as `KeyCode::Char('c')` with
  `KeyModifiers::CONTROL` when raw mode is on, since raw mode disables the
  kernel's SIGINT-on-Ctrl-C translation) rather than relying on an OS signal
  at all — which is itself the practical mitigation: raw mode means Ctrl-C
  arrives as a key event routed through your normal event loop and its Quit
  action, so the RAII guard's own `exit()` runs. A real `kill -TERM` from
  outside still needs an explicit `signal-hook`/`ctrlc`-crate handler if you
  want it to restore the terminal rather than being caught by the process's
  default disposition.
- **Windows double key events.** Not a state-safety bug but adjacent:
  crossterm on Windows emits both `KeyEventKind::Press` and `::Release` for
  every key; macOS/Linux emit `Press` only. Unconditionally reacting to every
  `KeyEvent` fires actions twice on Windows. Guard with
  `if key.kind == KeyEventKind::Press`. [ratatui.rs/faq](https://ratatui.rs/faq/)

### 5. Rendering correctness and performance

**Width computation.** `unicode-width` implements UAX #11 over Unicode
*scalar values*, not grapheme clusters — it does account for canonical
equivalence (NFC/NFD forms of the same string get the same width) and has
special-cased handling for known emoji ZWJ/modifier/presentation sequences
and a few scripts (Arabic, Khmer, Tifinagh ligatures), but it is explicitly
not a general grapheme-cluster-aware width function. [docs.rs unicode-width](https://docs.rs/unicode-width/latest/unicode_width/) Practical
consequence: code that slices a `&str` by byte or `char` index to fit a
column budget, then separately asks `unicode-width` for the width of the
slice, can produce a cut that splits a combining sequence or a ZWJ emoji
mid-cluster — the visible result is a stray combining mark or a broken emoji
at the truncation boundary. Correct truncation walks grapheme clusters
(`unicode-segmentation`'s `UnicodeSegmentation::graphemes(true)`) and sums
`UnicodeWidthStr::width` per cluster, stopping at the first cluster that
would overflow the budget — not per `char`.

**Out-of-bounds panics.** Widgets that write to `buf` at coordinates derived
from `area` can panic if `area` extends past `buf.area` (e.g., after a
resize race, or a widget given a stale `Rect`). ratatui's own fix:
`let area = area.intersection(buf.area);` before any indexing, or use
`Rect::clamp`. [ratatui.rs/faq](https://ratatui.rs/faq/)

**Large lists / tables.** No ratatui API auto-virtualizes a `List`/`Table` —
its docs only note that item height is computed automatically, not that
off-screen rows are skipped cheaply. [docs.rs List](https://docs.rs/ratatui/latest/ratatui/widgets/struct.List.html) The safe assumption (not
independently confirmed against source in this pass) is that the app is
responsible for keeping the in-memory `Vec` handed to `List::new()` sized to
roughly what's visible plus scroll slack — a 10k-row `Vec<ListItem>`
reconstructed and handed to the widget every frame is a correctness-neutral
but potentially real perf cost, since ratatui still walks the full slice
during constraint/height computation even though only the on-screen window
paints. Treat "slice the backing data to the viewport before constructing
widgets" as the safe default for anything beyond a few hundred rows rather
than trusting the widget to do it.

**Layout caching** (see §1) means recomputing `Layout::split()` every frame
with the same layout+area is intended and cheap (thread-local LRU, 500
entries default). [docs.rs Layout](https://docs.rs/ratatui/latest/ratatui/layout/struct.Layout.html) The performance risk is the opposite direction —
constructing a *new* `Layout` object with different constraint values every
frame (e.g., interpolated during an animation) defeats the cache key and
pays full solver cost every time.

**Flicker/double buffering.** Handled by ratatui internally via the diff
against the previous `Buffer` (§1); this is not something the app needs to
implement — the failure mode instead is apps that bypass `Terminal::draw()`
to write directly to stdout for "fast paths," which reintroduces flicker
because it skips the diff entirely.

### 6. Resize and minimum viable size

Crossterm resize events surface as `Event::Resize(cols, rows)`; the standard
plumbing (confirmed in the ratatui template) is to forward this straight
into the same event enum the render loop already consumes:

```rust
CrosstermEvent::Resize(x, y) => { _event_tx.send(Event::Resize(x, y)).unwrap(); }
```
[ratatui.rs/recipes/apps/terminal-and-event-handler](https://ratatui.rs/recipes/apps/terminal-and-event-handler/)

`Terminal::draw()` re-reads the current backend size itself on each call, so
no manual `Rect` bookkeeping is required beyond triggering a redraw on
resize (some backends require an explicit `terminal.autoresize()`/redraw
kick; ratatui's `Terminal` handles this as part of `draw()` in current
versions). This survey found no first-party ratatui guidance on a minimum
viable terminal size or documented small-terminal behavior — that
responsibility is entirely app-side: layouts built from `Constraint::Min`/
`Percentage` degrade to zero-size areas gracefully (rendering nothing) rather
than panicking, but a genuinely usable minimum (e.g., "refuse to render
below 80x24, show a placeholder message instead") is something every
surveyed app implements itself, not something ratatui provides out of the
box.

### 7. Testing a TUI

**Official recipe: `TestBackend` + `insta`.**

```rust
#[cfg(test)]
mod tests {
    use super::App;
    use insta::assert_snapshot;
    use ratatui::{backend::TestBackend, Terminal};

    #[test]
    fn test_render_app() {
        let app = App::default();
        let mut terminal = Terminal::new(TestBackend::new(80, 20)).unwrap();
        terminal.draw(|frame| frame.render_widget(&app, frame.area())).unwrap();
        assert_snapshot!(terminal.backend());
    }
}
```
Setup: `cargo add insta --dev` + `cargo install cargo-insta`; review changed
snapshots with `cargo insta review`. Documented limitation: "asserting with
color is not supported as of now" — snapshots capture symbols, not
styles/colors, as of the current recipe. [ratatui.rs/recipes/testing/snapshots](https://ratatui.rs/recipes/testing/snapshots/)

**What this buys you, and what it doesn't.** Because `view`/`render` is a
pure function of state under both TEA and Component architectures (§2),
`TestBackend` snapshot tests exercise exactly that pure function with zero
terminal, zero I/O, zero async runtime — this is the cheapest, highest-value
test in a ratatui codebase and should be the default for "does this screen
render correctly" questions. It is a poor tool for style/color regressions
(documented gap above) and for genuine end-to-end behavior (does pressing
`j` three times actually move the selection) — those need direct calls into
the `update`/`handle_key_events` function with synthetic `KeyEvent`s,
asserting on the resulting `Model`/component state, not on a rendered
buffer. That state-transition-level test is what's "genuinely testable" for
input handling; anything downstream of a real terminal (actual raw-mode
byte sequences, actual resize signals from a real pty, actual double-Windows-key-event
timing) is not exercisable through `TestBackend` and needs either an
integration harness that spawns a pty (e.g. via `portable-pty` under a
separate test binary) or is accepted as untested and covered by manual/CI-pty
smoke tests instead.

**Property-testing the update function.** Because `update(model, msg) ->
Model` (or `-> Option<Message>` in the TEA recipe shown above) is a plain
pure function over an enum and a struct, it is directly `proptest`-able:
generate arbitrary sequences of `Message`/`Action` values, fold them through
`update`, and assert invariants that must hold for *any* reachable model
(e.g., "selection index is always `< list.len()`", "counter never exceeds
its documented clamp"). This was not found spelled out as a named recipe on
ratatui.rs in this pass, but follows directly from the TEA design ratatui
itself documents (§2) — pure `update` is what makes the technique available
at all, which is itself an argument for choosing TEA/Component over ad hoc
mutation.

### 8. Ecosystem and real-world source

| Crate | What it is | Take vs write your own |
|---|---|---|
| [`tui-realm`](https://github.com/veeso/tui-realm) | React/Elm-inspired framework on top of ratatui: components have props+state, communicate via Messages/Events, a managed `View` handles mount/unmount/focus routing. Monorepo of 5 crates (core, stdlib, derive, treeview, textarea). Actively maintained (983★, 941 commits at fetch time). | Take when you want the *framework* to own focus/mount/routing, not just widgets — it's a bigger commitment than ratatui's own Component pattern (§2), which is un-opinionated and dependency-free. Write your own Component trait (as gitui/television do) when you want the routing logic under your control. |
| [`tui-textarea`](https://github.com/rhysd/tui-textarea) | Full multi-line editor widget: undo/redo, Emacs-style bindings, regex search, selection, mouse scroll, multi-backend (crossterm/termion/termwiz). Pre-1.0, semver-via-minor. | Take for anything beyond a single-line input — undo/redo and search are exactly the kind of state machine not worth re-deriving. Write your own only for a single-line, feature-free input. |
| [`tui-tree-widget`](https://github.com/EdJoPaTo/tui-tree-widget) | Tree view widget (expand/collapse, selection) for ratatui. | Take if the tree state machine (open/closed set, flatten-for-render) is not already something the app maintains elsewhere; grim's own `tui/tree.rs` (3,397 LOC) suggests the OCX family already owns this logic and should be compared line-by-line against this crate before assuming a rewrite is warranted. |
| `throbber-widgets-tui` | Spinner/throbber widget. | Trivially small — only take the dependency to avoid maintaining a frame-index-to-glyph table; equally reasonable to inline given it is a handful of lines. |

**Reading real source, condensed:**

- **gitui** — sync, no tokio; `Component` trait; six-channel `crossbeam::
  Select` main loop; panic hook + `defer!`-guarded `shutdown_terminal()`.
  [github.com/extrawurst/gitui](https://github.com/extrawurst/gitui)
- **yazi** — async; splits `yazi-fm/src` by screen/feature
  (`app/mgr/tasks/cmp/help/confirm/input/pick/spot/...`) with top-level
  `dispatcher.rs`/`executor.rs`/`renderer.rs`/`router.rs`/`signals.rs` doing
  only routing — the clearest example in this survey of "split by feature,
  not by layer, once one file gets too big." [github.com/sxyazi/yazi](https://github.com/sxyazi/yazi)
- **atuin** — async; blocking-task input poll re-armed every 250 ms inside a
  `tokio::select!` alongside async DB queries, keeping keystrokes responsive
  during full-table scans. [github.com/atuinsh/atuin](https://github.com/atuinsh/atuin)
- **oha** — async; fixed-frame-budget loop (`per_frame = 1s/fps`),
  non-blocking `poll(Duration::from_secs(0))` for keys, `kanal` channel
  draining async HTTP worker results — render-on-clock rather than
  render-on-event. [github.com/hatoo/oha](https://github.com/hatoo/oha)
- **television** — async; three tokio tasks (render/event/watch-timer), four
  channel pairs, explicit `Action`/mode-aware event-to-action conversion —
  closest of the surveyed apps to a textbook actor-model TEA. [github.com/alexpasmantier/television](https://github.com/alexpasmantier/television)
- **bottom** — pull-based: `update_data()` iterates widget states and only
  refreshes ones flagged `force_update_data`, keeping periodic data
  collection and keyboard/mouse handlers (`on_char_key`, `on_left_mouse_up`,
  etc.) as separate code paths rather than funneling collection through the
  input event enum. [github.com/ClementTsang/bottom](https://github.com/ClementTsang/bottom)
- **ratatui's own templates repo** publishes exactly this decision tree as
  installable starting points: `hello-world`, `simple`, `simple-async`,
  `event-driven`, `event-driven-async`, `component`. [github.com/ratatui/templates](https://github.com/ratatui/templates)

## Normative guidance candidates

1. **Every screen render goes through one pure `view(&State, &mut Frame)` (or
   `Component::render`) function; no I/O, no mutation, inside it.**
   Rationale: this is what makes `TestBackend` snapshot testing possible at
   all (§7) and is ratatui's own documented contract for `view` in TEA. [the-elm-architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/)
   VERIFICATION: grep the render/view function body for `.await`,
   `std::fs`, `tokio::spawn`, or any `&mut self` mutation of fields other
   than transient render-local locals; any hit is a violation.

2. **State transitions happen only inside `update`/`handle_*_events`; never
   inside the terminal-owning main loop or inside render.** Rationale:
   keeps the event/update boundary testable independent of a real terminal
   (§7). VERIFICATION: `handle_key_events`/`update` functions should be the
   only call sites that assign to `self.state.*` fields — grep for direct
   field mutation outside those functions in the same module.

3. **No `.await` and no blocking I/O inside the function that also drives
   `Terminal::draw()` in the render loop.** Rationale: a stalled render loop
   is a stalled input loop — confirmed pattern in every async app surveyed
   (atuin, oha, television) keeping I/O off the render task. [atuin](https://github.com/atuinsh/atuin) · [oha](https://github.com/hatoo/oha) · [television](https://github.com/alexpasmantier/television)
   VERIFICATION: `rg -n '\.await' <event/render loop file>` and manually
   confirm every hit is a channel `recv()`/`select!` arm, not a network or
   filesystem call.

4. **A registry pull / OCI download is `tokio::spawn`ed with a result channel
   back into the event enum, never called synchronously from the input
   handler.** Rationale: same as #3, specific to this codebase's stated risk
   (a registry pull stalling input). VERIFICATION: grep the crate for
   registry/pull/fetch call sites and confirm each is reached via
   `tokio::spawn(async move { ... tx.send(...) })`, not a bare `.await` in
   an event-handling function.

5. **Terminal setup/teardown lives in one RAII guard type with `Drop`; the
   same restore function runs on the happy path, the panic-hook path, and
   `Drop`.** Rationale: three independent exit paths (normal, panic, Drop)
   restoring the terminal three different ways is how leaks happen; one
   function used from all three closes that gap. [ratatui.rs/recipes/apps/terminal-and-event-handler](https://ratatui.rs/recipes/apps/terminal-and-event-handler/) · [panic-hooks](https://ratatui.rs/recipes/apps/panic-hooks/)
   VERIFICATION: grep for `disable_raw_mode` / `LeaveAlternateScreen` — there
   should be exactly one call site of each (or one function wrapping both),
   invoked from `Drop::drop`, the panic hook, and nowhere else duplicated.

6. **No `std::process::exit()` (or `std::process::abort()`) call anywhere
   after raw mode / alternate screen has been entered.** Rationale:
   `process::exit` skips all `Drop`, per the Rust std docs — it silently
   defeats rule 5. [doc.rust-lang.org std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html)
   VERIFICATION: `rg -n 'process::exit|process::abort' src/tui/ src/main.rs`
   — any hit inside a function reachable after terminal setup is a bug;
   the fix is to return a value/`Result` up to a `main` that itself is
   outside the guard's lifetime.

7. **Ctrl-C is handled as a normal `KeyEvent` inside the existing event loop
   (raw mode already suppresses the kernel SIGINT translation); a real
   `SIGTERM`/external `kill` gets an explicit `signal-hook` handler that
   sends a Quit event through the same channel the rest of the app uses —
   never a bare `ctrlc::set_handler` that calls terminal-restore code
   directly from a signal context.** Rationale: signals bypass unwinding and
   thus bypass `Drop`; routing through the existing event channel means
   exactly one code path (rule 5's guard) ever restores the terminal.
   VERIFICATION: grep for any `signal_hook`/`ctrlc` usage and confirm the
   handler only sends into an existing `mpsc`/`crossbeam` channel, doing no
   direct terminal I/O itself.

8. **Every `KeyEvent` handler filters on `key.kind == KeyEventKind::Press`
   before acting.** Rationale: crossterm on Windows emits Press+Release for
   every key; unfiltered handlers double-fire on Windows only, a
   platform-specific bug class that won't show up on the Linux/macOS dev
   machine. [ratatui.rs/faq](https://ratatui.rs/faq/)
   VERIFICATION: `rg -n 'Event::Key\(' <event handling files>` and confirm a
   `KeyEventKind::Press` guard exists on the same code path (either in the
   match arm or immediately inside the branch body).

9. **Widget `render()` implementations intersect their `area` argument with
   `buf.area` (`area.intersection(buf.area)`) before indexing into `buf`,
   rather than trusting the caller's `Rect`.** Rationale: ratatui's own FAQ
   names this as the concrete fix for out-of-bounds buffer panics. [ratatui.rs/faq](https://ratatui.rs/faq/)
   VERIFICATION: for any hand-written `Widget`/`StatefulWidget` impl
   (not a plain built-in), grep for `buf.set_string`/`buf[...]`/direct
   indexing and confirm an `intersection`/`clamp` call precedes it.

10. **Text truncation/wrapping for terminal display walks grapheme clusters
    (`unicode-segmentation`), not `char`s, when summing width with
    `unicode-width`.** Rationale: `unicode-width` is scalar-value width, not
    cluster width; per-`char` slicing can split a combining sequence or ZWJ
    emoji mid-cluster. [docs.rs unicode-width](https://docs.rs/unicode-width/latest/unicode_width/)
    VERIFICATION: grep any manual truncation code (`.chars().take(`,
    byte-index slicing `&s[..n]`) that also calls `unicode_width` — flag for
    review; correct code calls `.graphemes(true)` first.

11. **Snapshot tests exist for every screen/major render state using
    `TestBackend` + `insta`, but color/style regressions are asserted
    separately (or accepted as untested) since insta cannot assert color as
    of the current recipe.** Rationale: this is the cheapest test class
    available (pure function, no terminal) and should be the default
    coverage for "does this render," per ratatui's own recipe. [ratatui.rs/recipes/testing/snapshots](https://ratatui.rs/recipes/testing/snapshots/)
    VERIFICATION: `cargo insta test` (or `cargo test` with `insta` present)
    passes and `.snap` files exist under each screen's test module; `rg -n
    'assert_snapshot!'` count roughly tracks the number of distinct render
    states.

12. **State-transition tests call `update`/`handle_key_events` directly with
    synthetic events and assert on the resulting struct fields — they do not
    go through a real `Terminal`/backend.** Rationale: this is the layer
    that's actually testable per ratatui's TEA design (§2, §7); routing
    through a real terminal for input-logic tests is both slower and
    untestable in CI without a pty. VERIFICATION: `rg -n 'TestBackend|
    Terminal::new'` inside test modules that are asserting keybinding
    behavior — a match means the test is exercising more machinery than the
    logic under test needs; prefer calling `update`/`handle_key_events`
    directly.

## AI-agent angle

An LLM writing ratatui code without a human in the loop reliably gets wrong,
in descending order of how often it shows up in generated code:

- **Mixing I/O into `view`/render.** Models default to "just fetch what's
  needed when rendering" because that's the natural imperative-UI reflex
  from web/GUI training data; ratatui's contract makes this both a
  correctness bug (blocks the render loop) and an architecture violation
  (§2, rule 1). Smallest mechanical check: `rg -n '\.await|std::fs::|
  tokio::spawn' <render/view fn body>` — any hit fails review.
- **Calling `process::exit()` for error handling inside a TUI.** Models
  reach for `std::process::exit(1)` as the generic "bail out" idiom learned
  from CLI code; inside a raw-mode session this leaks terminal state (rule 6)
  and the model has no built-in signal that a TUI's exit paths are special.
  Smallest mechanical check: `rg -n 'process::exit'` anywhere under the TUI
  module.
- **Reacting to every `KeyEvent` without filtering `KeyEventKind`.** Nothing
  about the type signature hints at the Windows double-fire; a model that
  hasn't specifically read the FAQ entry writes the naive match. Smallest
  mechanical check: rule 8's grep.
- **Assuming `unicode-width` handles emoji/CJK truncation correctly with
  `char`-based slicing.** A model reasons "width crate exists, therefore
  width is handled," and misses that scalar-value width and cluster-safe
  slicing are two different problems. Smallest mechanical check: rule 10's
  grep for `.chars().take(` co-occurring with any width call.
- **Handing the full backing collection to `List`/`Table` every frame.**
  Models default to passing the whole large `Vec` into `List::new()` and
  re-slicing every frame, because
  "unbounded works and I already have the whole Vec in memory" — this is
  correctness-neutral so it slips through functional review; the cost only
  shows up as measured frame-time regression, which an LLM without a
  benchmark harness cannot self-detect. Smallest mechanical check: none
  purely static — needs a perf test asserting frame render time under a
  10k-row fixture stays under a fixed budget (a form of rule 11's snapshot
  test, extended with `std::time::Instant` around the `terminal.draw()`
  call).
- **Writing a `Drop` guard but leaving a duplicate ad hoc
  `disable_raw_mode()` call elsewhere "just to be safe."** Models often
  layer belt-and-suspenders cleanup rather than trusting one guard, which
  actually increases the chance of a double-disable error path being
  swallowed silently. Smallest mechanical check: rule 5's grep for more than
  one call site of `disable_raw_mode`/`LeaveAlternateScreen`.

## Contested / evolving

- **`WidgetRef` stability.** Still gated behind `unstable-widget-ref` as of
  the fetched docs for the current release (0.30.2) despite having existed
  since 0.26 — this has been a multi-release "unstable" window; direction
  is toward eventual stabilization but there is no committed date in the
  fetched material. Do not depend on it in code an autonomous agent
  generates without an explicit human decision to accept the instability. [docs.rs WidgetRef](https://docs.rs/ratatui/latest/ratatui/widgets/trait.WidgetRef.html)
- **No single blessed architecture.** ratatui itself documents three
  patterns (Elm/TEA, Component, Flux) and explicitly declines to recommend
  one — this is a real, acknowledged-by-the-maintainers open question, not
  settled practice; the field convergence observed in this survey (large
  real apps trend toward Component-with-local-state, e.g. gitui, yazi, and
  the grim TUI's own render/state/event split) is empirical, not a ratatui
  recommendation. [ratatui.rs/concepts/application-patterns](https://ratatui.rs/concepts/application-patterns/)
- **Backend choice.** termion is Unix-only and effectively legacy next to
  crossterm's cross-platform support; termwiz and the newer `termina`
  backend exist but none of the seven real apps surveyed here use anything
  but crossterm — treat crossterm as the practical default and the others as
  historical/niche unless a specific platform constraint says otherwise.
- **No first-party minimum-terminal-size or virtualized-list API.** Both
  gaps (§5, §6) are filled ad hoc by every app surveyed; if ratatui adds
  either in a future release this document's guidance on "slice to viewport
  yourself" and "no minimum-size guard from the framework" should be
  re-checked against the current changelog.
- **insta color/style assertions.** Documented as unsupported "as of now" in
  the fetched recipe — phrasing that signals the ratatui docs authors expect
  this to change; re-verify before assuming style regressions are
  permanently untestable via snapshot. [ratatui.rs/recipes/testing/snapshots](https://ratatui.rs/recipes/testing/snapshots/)

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [ratatui.rs/concepts/rendering/under-the-hood](https://ratatui.rs/concepts/rendering/under-the-hood/) | Official docs, immediate-mode/diff mechanics | current (0.30.x era) | Primary source for the render-every-frame contract and double-buffer diffing |
| [ratatui.rs/concepts/application-patterns/the-elm-architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/) | Official docs, TEA pattern + code | current | Primary source for Model/Message/Update/View shape and its "pure view" rule |
| [ratatui.rs/concepts/application-patterns/component-architecture](https://ratatui.rs/concepts/application-patterns/component-architecture/) | Official docs, Component trait + code | current | Primary source for the Component trait shape used by gitui/television |
| [ratatui.rs/concepts/event-handling](https://ratatui.rs/concepts/event-handling/) | Official docs, three event-handling strategies | current | Primary source for "no single correct architecture" stance |
| [ratatui.rs/concepts/backends/raw-mode](https://ratatui.rs/concepts/backends/raw-mode/) | Official docs, raw mode across backends | current | Primary source enumerating the four backends and per-backend raw-mode differences |
| [ratatui.rs/recipes/apps/panic-hooks](https://ratatui.rs/recipes/apps/panic-hooks/) | Official recipe, panic hook code (crossterm + termion) | current | Primary source for the exact panic-hook restore pattern |
| [ratatui.rs/recipes/apps/terminal-and-event-handler](https://ratatui.rs/recipes/apps/terminal-and-event-handler/) | Official recipe, `Tui` RAII guard + async event task | current | Primary source for the RAII `Drop`-based terminal guard and resize plumbing |
| [ratatui.rs/recipes/testing/snapshots](https://ratatui.rs/recipes/testing/snapshots/) | Official recipe, `TestBackend` + `insta` | current | Primary source for the canonical snapshot-test pattern and its color-assertion limitation |
| [ratatui.rs/faq](https://ratatui.rs/faq/) | Official FAQ | current | Primary source for Windows double-key-events, out-of-bounds panics, async stance |
| [docs.rs/ratatui](https://docs.rs/ratatui/latest/ratatui/) | Crate root docs | 0.30.2, fetched 2026-08 | Primary source confirming current published version and Frame/Buffer/Terminal roles |
| [docs.rs WidgetRef](https://docs.rs/ratatui/latest/ratatui/widgets/trait.WidgetRef.html) | Trait docs | 0.30.2 | Primary source establishing `WidgetRef` is unstable-feature-gated |
| [docs.rs Layout](https://docs.rs/ratatui/latest/ratatui/layout/struct.Layout.html) | Struct docs | 0.30.2 | Primary source for the thread-local LRU layout cache, undocumented elsewhere |
| [docs.rs List](https://docs.rs/ratatui/latest/ratatui/widgets/struct.List.html) | Widget docs | 0.30.2 | Primary source confirming absence of documented virtualization guidance |
| [docs.rs unicode-width](https://docs.rs/unicode-width/latest/unicode_width/) | Crate docs | current | Primary source for scalar-value-vs-grapheme-cluster width semantics |
| [doc.rust-lang.org std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html) | Rust std library docs | stable, current | Primary source for "no destructors run" — the exact wording underlying rule 6 |
| [github.com/ratatui/templates](https://github.com/ratatui/templates) | Official templates repo | current | Primary source for the tokio `select!` two-channel async event task shape |
| [crossterm event-stream-tokio.rs example](https://github.com/crossterm-rs/crossterm) | Crossterm's own example | current | Primary source for the canonical `EventStream` + `futures::select!` shape |
| [github.com/extrawurst/gitui](https://github.com/extrawurst/gitui) | Real production TUI source (sync, crossbeam) | 2026-era `main` branch | Primary source: Component trait, six-channel crossbeam `Select`, panic-hook `defer!` cleanup |
| [github.com/sxyazi/yazi](https://github.com/sxyazi/yazi) | Real production TUI source (async) | 2026-era `main` branch | Primary source for splitting a large TUI by feature/screen rather than by layer |
| [github.com/ClementTsang/bottom](https://github.com/ClementTsang/bottom) | Real production TUI source (async) | 2026-era `main` branch | Primary source for pull-based periodic-data-vs-input separation |
| [github.com/atuinsh/atuin](https://github.com/atuinsh/atuin) | Real production TUI source (async) | 2026-era `main` branch | Primary source for blocking-task input polling alongside async DB queries |
| [github.com/hatoo/oha](https://github.com/hatoo/oha) | Real production TUI source (async) | 2026-era `master` branch | Primary source for fixed-frame-budget render loop decoupled from async load workers |
| [github.com/alexpasmantier/television](https://github.com/alexpasmantier/television) | Real production TUI source (async) | 2026-era `main` branch | Primary source for a textbook multi-task actor/TEA hybrid with four channel pairs |
| [github.com/veeso/tui-realm](https://github.com/veeso/tui-realm) | Framework README | current | Secondary source for the "framework vs write-your-own-Component-trait" tradeoff |
| [github.com/rhysd/tui-textarea](https://github.com/rhysd/tui-textarea) | Widget crate README | pre-1.0, current | Secondary source for when a rich widget crate earns its dependency weight |
