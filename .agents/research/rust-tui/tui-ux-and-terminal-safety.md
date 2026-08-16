---
title: Terminal UI/UX Conventions, Accessibility, and Untrusted Text
topic: rust-tui
agent: inv-tui-ux
model: sonnet
date_researched: 2026-08
sources_count: 28
scope: >
  Covers keybinding conventions across reference TUIs (lazygit, k9s, htop, fzf,
  helix, atuin, yazi, gitui, btop), discoverability and progressive disclosure,
  colour/theme detection and degradation, accessibility (screen readers, motion,
  non-TUI fallback), latency/feedback budgets, and terminal safety for untrusted
  text (ANSI/OSC injection, Trojan Source, width/truncation correctness, non-TTY
  detection). Does NOT cover ratatui widget-by-widget API reference, general
  clap/CLI argument design, or non-terminal GUI accessibility (that's a different
  research subarea).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Keybinding conventions](#1-keybinding-conventions)
   2. [Discoverability](#2-discoverability)
   3. [Colour and theming](#3-colour-and-theming)
   4. [Accessibility](#4-accessibility)
   5. [Latency and feedback](#5-latency-and-feedback)
   6. [Terminal safety with untrusted text](#6-terminal-safety-with-untrusted-text)
   7. [Width and rendering of untrusted strings](#7-width-and-rendering-of-untrusted-strings)
   8. [Mouse support](#8-mouse-support)
   9. [Non-TTY and CI](#9-non-tty-and-ci)
   10. [Testing UX claims](#10-testing-ux-claims)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `Ctrl-C` must always exit or interrupt, even mid-operation; a TUI that swallows it to mean something else (e.g. "clear input") breaks a decades-old muscle memory and traps the user.
2. Every reference TUI (lazygit, k9s, gitui, fzf, atuin) treats `Esc` as universal "cancel/back one level," distinct from `q`/`Ctrl-C` which quit the whole app — collapsing the two loses the "step back" affordance.
3. `q` for quit and `?` for help are near-universal across lazygit, k9s, htop (`F1`/`h`/`?`), fzf-adjacent tools, and btop; inventing a different quit or help key costs users a lookup every session.
4. `/` for search/filter is the shared convention (k9s, lazygit, htop's `F3`, less, vim) — reuse it rather than a bespoke key.
5. Supporting both vim-style (`hjkl`, `j`/`k` scroll) and arrow-key navigation simultaneously, rather than picking one, is what lazygit, k9s (via aliasing), htop (`Alt-h/j/k/l` alongside arrows), gitui, and btop's `vim_keys` option all do — pick one only and you alienate half your users for free.
6. A persistent key-hint bar (lazygit, k9s footer, btop footer) plus a full `?` help overlay is the dominant discoverability pattern — neither alone is sufficient: the bar teaches by repetition, the overlay is the fallback when the bar truncates.
7. `NO_COLOR` (any non-empty value) must disable ANSI colour by default, but explicit user config or CLI flags should override it — don't let `NO_COLOR` win against a flag the user typed on purpose ([no-color.org](https://no-color.org/)).
8. Colour must never be the only channel for meaning (error vs. warning vs. success) — pair it with an icon, prefix, or text label so colour-blind and 16-colour-terminal users aren't locked out; WCAG 1.4.3 requires 4.5:1 contrast for normal text, 3:1 for large text, and neither is guaranteed on an arbitrary user terminal theme.
9. Text presented in a TUI is registry-controlled attacker input in a package manager (names, descriptions, error strings) — CWE-150 (Improper Neutralization of Escape, Meta, or Control Sequences) is the exact weakness class, and real attacks span hidden-text obfuscation, fake prompts, clipboard writes (OSC 52), and DNS-leak-class terminal bugs.
10. Never call `unicode-width`'s `width()` result "safe to trust for layout" without also stripping ANSI/OSC/control sequences first — raw untrusted text can both lie about its rendered width (escape sequences count 0 columns to the crate but move the cursor when interpreted by the real terminal) and corrupt fixed-width layout if not measured with `UnicodeWidthStr`.
11. Truncating a string by byte length or `char` count (not grapheme cluster, via `unicode-segmentation`) can split a combining sequence or a wide/emoji cluster, producing a corrupted glyph or replacement-character garbage in the layout — this is a distinct bug class from the escape-injection one and both are common in "just take the first N chars" code.
12. Bidi override characters (U+202E and friends — the Trojan Source class, CVE-2021-42574 / CVE-2021-42694) let attacker-controlled text visually reorder itself; a terminal UI rendering a registry-supplied package name or description must strip or escape bidi control characters, not just "regular" ANSI.
13. OSC 8 hyperlinks and OSC 52 clipboard writes are real terminal features (not always malicious) but both are attacker-abusable when the rendered text is untrusted: OSC 8 can show one URL and open another, OSC 52 can silently write to the clipboard.
14. `std::io::IsTerminal` (stable since Rust 1.70) is the standard, dependency-free way to detect a non-TTY stdout/stdin and refuse to launch a TUI (or auto-fall-back to a plain/line-oriented mode) when piped or run in CI.
15. Perceptible-response budgets are three tiers, not two: under 0.1s needs no feedback, up to ~1s needs none either but the user notices, and past ~10s an operation needs a percent-done indicator plus a cancel path — a bare spinner with no percentage is only appropriate in the 1–10s band, never past it, per Nielsen's classic thresholds.
16. Never block the input/event loop on network or filesystem I/O in a TUI — spawn it async and keep polling terminal events, or every keypress (including `Ctrl-C`) queues up invisibly until the I/O returns.
17. Mouse support is worth adding for scroll and click-to-select, but capturing the mouse (`EnableMouseCapture` in crossterm) breaks the terminal's native text selection/copy — always leave a documented way to temporarily disable mouse capture (or hold Shift, which most terminal emulators reserve to bypass app mouse mode).
18. Modern immediate-mode TUI frameworks that redraw the whole screen every frame (ratatui, Bubble Tea, Ink) are reported as actively hostile to screen readers because of aggressive cursor movement and full-screen repaint — the accessible fallback is a non-TUI, linear, append-only output mode for every TUI action, not an in-TUI "accessibility toggle."
19. `strip-ansi-escapes` (backed by the `vte` parser) removes CSI/OSC/etc. sequences from a byte stream but does not, by itself, address bidi overrides, zero-width characters, or confusable/mixed-script spoofing — that's a separate concern covered by crates like `unicode-security` (UTS #39 mixed-script/confusable detection).
20. `ansi-to-tui` explicitly silently ignores unknown/malformed escape sequences rather than erroring — convenient for rendering real ANSI output, but means it is not itself a security boundary: malformed-but-recognized sequences (e.g. valid OSC 52) still execute their effect if not filtered first.

## Findings

### 1. Keybinding conventions

Surveyed lazygit, k9s, htop, fzf, atuin, yazi, gitui, btop, and helix's keymap philosophy.

**Universal exits.** Every tool surveyed treats `Ctrl-C` (and usually `q`) as unconditional quit. k9s docs list `:q` or `ctrl-c` explicitly to "bail out" ([k9scli.io/topics/commands](https://k9scli.io/topics/commands/)). lazygit binds `q` or `Ctrl+C` to quit and `Esc` separately to cancel/close the current panel ([lazygit keybindings](https://raw.githubusercontent.com/jesseduffield/lazygit/master/docs/keybindings/Keybindings_en.md)). fzf's own default binds `CTRL-C`, `CTRL-G`, and `ESC` all to "exit without selection" ([fzf README](https://raw.githubusercontent.com/junegunn/fzf/master/README.md)). htop's `F10`/`q` quits ([htop(1) man page](https://man7.org/linux/man-pages/man1/htop.1.html)).

**Esc vs. quit are different affordances.** `Esc` closes the current mode/dialog/filter and steps back one level; `q`/`Ctrl-C` exits the whole program. Collapsing these into one binding removes the "step back without losing my place" behavior every surveyed tool provides.

**Vim-style AND arrows, not either/or.** htop binds both arrow keys and `Alt-h/j/k/l` to the same navigation ([htop(1)](https://man7.org/linux/man-pages/man1/htop.1.html)); btop has a `vim_keys` config flag that adds `h,j,k,l,g,G` alongside the default up/down arrows without removing them ([btop README](https://raw.githubusercontent.com/aristocratos/btop/main/README.md)); gitui supports switching its entire keymap to vim-like bindings via a config file rather than hardcoding one style ([gitui README](https://raw.githubusercontent.com/extrawurst/gitui/master/README.md)); lazygit binds `k`/`Ctrl-U` and `j`/`Ctrl-D` alongside `PgUp`/`PgDn`. helix goes further and is vim-inspired *modal* editing by design, explicitly telling new users "the modal editing paradigm" is the intended path, not an add-on ([helix keymap docs](https://docs.helix-editor.com/keymap.html)) — helix is the outlier that requires vim-style rather than merely supporting it, and that's a deliberate, documented trade-off for a text editor, not a TUI dashboard.

**`/` for search/filter is shared vocabulary.** k9s: `/` applies regex filtering, `/-f` fuzzy-finds ([k9scli.io](https://k9scli.io/topics/commands/)); lazygit: `/` searches the current view; htop: `F3`/`/` incrementally searches. This mirrors `less`/`vim`, so reusing it costs nothing and teaches nothing new.

**`?` for help is shared vocabulary.** k9s binds `?` to "show active keyboard mnemonics and help"; htop's `F1`/`h`/`?` opens help. Inventing a different help key (e.g. `Ctrl-H`) forces users to discover it via trial or the README instead of instinct.

**Tab/Shift-Tab for focus, not always present.** fzf uses `Tab`/`Shift-Tab` for multi-select (not focus) when `-m` is passed; lazygit uses `Tab` to flip between staged/unstaged sub-views and `]`/`[` to move between top-level tabs. There is no single universal Tab convention across all surveyed tools — treat it as "cycle within the current panel" and use a distinct key (or `]`/`[`) for top-level panel switching, matching lazygit.

**Cost of inventing bindings.** Every convention above is reused across independently-built tools with no coordination between authors — that convergence is the signal. A tool that binds `x` to quit or `s` to search pays a permanent per-user discovery tax that the shared vocabulary avoids.

### 2. Discoverability

- **Persistent hint bar + `?` overlay, not one or the other.** lazygit and k9s both show a footer/bottom bar of currently-valid keys for the focused panel, and both also have a full-screen `?` help view for the complete list. The bar teaches through repeated exposure (progressive disclosure); the overlay is the reference for the long tail the bar can't fit.
- **Context-sensitive help beats a static cheat sheet.** gitui advertises "no need to memorize tons of hot-keys" via context-based help ([gitui README](https://raw.githubusercontent.com/extrawurst/gitui/master/README.md)) — showing only the keys valid in the current mode/panel, not the full global list, reduces cognitive load.
- **State without a modal.** None of the surveyed tools pop a blocking dialog for "loading" or "connecting" states; they show it inline (a status line, a spinner glyph in a corner, a color change) so the keyboard stays live. A modal for a transient state blocks input for something the user didn't ask to confirm.
- **Confirmations reserved for destructive actions.** lazygit prompts before force-push, hard reset, and delete-branch style operations but not before navigation or read-only actions — the lesson is to gate confirmation on irreversibility, not on "this changes something."

### 3. Colour and theming

- **`NO_COLOR` semantics are precise.** The spec: "Command-line software which adds ANSI color to its output by default should check for a `NO_COLOR` environment variable" and disable color if it is present *and non-empty* — an empty `NO_COLOR=` must NOT disable color. Per-instance CLI flags and user config should still be able to override `NO_COLOR` if the user explicitly asked for color ([no-color.org](https://no-color.org/)). Software that has no default color has no obligation here.
- **Detection hierarchy in Rust.** The `supports-color` crate (Rust port of the sindresorhus npm package) checks `NO_COLOR`, terminal capability, and stream-specific support to return a `ColorLevel { has_basic, has_256, has_16m }`, letting an app pick 16-color, 256-color, or truecolor output per-stream (stdout vs stderr can differ, e.g. when one is piped) ([supports-color docs.rs](https://docs.rs/supports-color/latest/supports_color/)). `COLORTERM=truecolor` (or `24bit`) is the de facto (non-standardized but universally checked) signal for 24-bit support beyond `TERM`.
- **Never encode meaning in colour alone.** WCAG 1.4.3 requires 4.5:1 contrast for normal text and 3:1 for large text ([W3C WCAG 2.1 SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)) — but a TUI cannot guarantee *any* contrast ratio because it renders inside the user's own terminal palette, which the app does not control. The only reliable mitigation is redundant coding: an icon/prefix/text label alongside the colour, so a colour-blind user or a 16-color/no-color terminal still gets the information.
- **Colour-blind-safe palette reference.** The Okabe–Ito 8-color palette (black `#000000`, orange `#E69F00`, sky blue `#56B4E9`, bluish green `#009E73`, yellow `#F0E442`, blue `#0072B2`, vermillion `#D55E00`, reddish purple `#CC79A7`) is a commonly cited concrete palette for categorical distinctions that stays distinguishable across common color-vision deficiencies ([Okabe–Ito palette reference](https://siegal.bio.nyu.edu/color-palette/)).
- **Respect the user's theme; don't force one.** A TUI should use the terminal's own ANSI color slots (0–15) for anything semantic (success=green, error=red) rather than truecolor hex values it invents, because ANSI slot colors are exactly what the user has already themed (light or dark background) to be legible and pleasant. Truecolor is appropriate for accent/branding elements where exact hue matters, not for text-on-background contrast that must survive both light and dark user themes.
- **Light-background terminals are a real, distinct case, not a rare edge case** — hardcoding "white text" or "black background" assumptions (rather than relying on the terminal's own default foreground/background) breaks for every user running a light theme.

### 4. Accessibility

- **Screen readers and aggressive TUI redraw are in direct conflict.** Independent commentary converges on this: modern immediate-mode TUI frameworks (the article names Ink, Bubble Tea, and tcell-based stacks explicitly, and the same critique applies to ratatui's immediate-mode redraw model) are reported as "actively hostile to screen reader users" because full-screen repaint and aggressive cursor movement on every frame breaks the screen reader's ability to track what changed ([The Text Mode Lie](https://osnews.com/) summary of the argument, secondary source — treat as directional, not a citable spec). A screen reader wants stable, append-only, linearly-readable text; a TUI dashboard wants to redraw a fixed grid every tick. These are structurally opposed.
- **The practical mitigation is a non-TUI fallback path, not an in-TUI accessibility mode.** Every action available in the TUI (install, search, view details, confirm a destructive action) should also be reachable via a plain, line-oriented CLI subcommand or flag that prints normal scrollback text a screen reader can read like any other terminal output. This is the same mechanism as the non-TTY fallback in §9 — one implementation serves both needs.
- **Motion and refresh rate.** A TUI that redraws on a fixed timer (e.g. every 100ms for an animation or spinner) rather than only on state change generates continuous terminal output that can overwhelm a screen reader's speech queue or a slow SSH link. Redraw only on actual state change or user input, and keep any animation (spinners) to the minimum necessary, with a way to disable it (tie it to the same flag as reduced motion / `NO_COLOR`-style env var, or `--no-animation`).
- **No authoritative Rust-specific accessibility API exists for terminal UIs** — there is no equivalent of ARIA for a TTY. The non-TUI fallback is the only mechanism with real backward compatibility (screen readers already know how to read plain scrollback).

### 5. Latency and feedback

- **Nielsen's three response-time bands still apply verbatim to a terminal.** Under 0.1s: no feedback needed, feels instant. Up to ~1s: no special feedback required but the user notices a delay; keep it under this for anything that feels like "direct manipulation" (moving a selection cursor, filtering a list as you type). Past ~10s: a percent-done indicator (not just a spinner) is necessary, plus a way to cancel, both to reassure the user the process hasn't hung and to give a completion estimate ([Nielsen Norman Group, response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)).
- **Spinner vs. progress vs. nothing** — the practical mapping for a package-manager TUI: registry lookups and small file writes (typically well under 1s) need no feedback; a multi-second network fetch needs a spinner (indeterminate — you don't know total bytes ahead of the response); a large multi-file install with known total size or item count needs a real progress bar, not a spinner, once past the ~10s mark.
- **Never block the event loop on I/O.** A TUI must poll terminal input events on its own tick regardless of any in-flight network/filesystem operation; the standard pattern in an async TUI (tokio + crossterm/ratatui) is a `select!` between the terminal-event stream and the operation's future/channel, so `Ctrl-C` and other input are always responsive even mid-download.
- **Optimistic UI and cancellation** must be paired: if a state change renders immediately (optimistic) before the underlying operation confirms, the UI needs both a rollback path if it fails and an explicit cancel affordance if the user changes their mind before confirmation arrives — an optimistic update with no rollback is a state-corruption bug waiting to happen in a package manager (partially-applied install shown as fully applied).

### 6. Terminal safety with untrusted text

This is the security core of the subarea: a package manager renders registry-supplied names, descriptions, and error text that is attacker-controlled the moment a malicious package is published.

**The exact weakness class.** CWE-150, "Improper Neutralization of Escape, Meta, or Control Sequences," names this directly: software that fails to sanitize escape/control sequences before passing them to a downstream interpreter (here: the terminal emulator) lets an attacker "changing the color of console output" at the mild end and — in the CWE's own words — "in some contexts... execute arbitrary code" at the severe end, via arbitrary cursor movement, screen clearing, and fake prompts ([CWE-150](https://cwe.mitre.org/data/definitions/150.html)). The CWE entry specifically calls out LLM-generated output containing injected escape sequences as an emerging instance of this exact weakness — directly on point for any tool (like this one) that may render agent-composed or registry-composed text.

**Concrete attack techniques documented against real terminal-integrated tools:**
- Hidden text via cursor movement / backspace characters (`\b`) to visually overwrite what was just printed, so a human skimming the terminal sees something different from what was actually written to the scrollback buffer.
- OSC 52 clipboard writes — a rendered string can silently place attacker-chosen text on the user's clipboard, to be pasted (and potentially executed) later.
- OSC 8 hyperlinks that display one URL as clickable text while the actual link target (in the escape sequence's URI parameter) points elsewhere — the visible text and the acted-upon target are independently attacker-controlled.
- A macOS Terminal-specific DNS-leak vulnerability triggered by a crafted escape sequence.
- Denial-of-service via excessive repeated escape sequences.

(All from [Embrace The Red, "Terminal DiLLMa"](https://embracethered.com/blog/posts/2024/terminal-dillmas-prompt-injection-ansi-sequences/), which specifically studies LLM-adjacent tooling rendering untrusted generated text — the closest real-world analogue to a package manager rendering registry text.)

**The "invisible to human, visible to parser" class is separately documented for MCP tool descriptions**, where ANSI escapes hide malicious instructions from a human visually reviewing terminal output while the raw bytes (including the hidden instructions) are still fully present for a downstream text-processing consumer to read ([vulnerablemcp.info, ANSI Terminal Code Deception](https://vulnerablemcp.info/vuln/ansi-terminal-code-deception.html), disclosed by Trail of Bits researcher Keith Hoodlet, April 2025, demonstrated against Claude Code CLI). The mirror-image risk for a package manager: a malicious package description could hide text from the human reviewing `grim describe` output while still being fully present in a log file, a piped `--json` consumer, or an AI agent reading the same output.

**Real terminal-emulator CVEs, not hypothetical:**
- [CVE-2019-9535](https://nvd.nist.gov/vuln/detail/CVE-2019-9535) — iTerm2 ≤3.3.5: a flaw in how iTerm2 integrates with tmux's control-mode protocol let malicious terminal *output* (not user input) achieve remote code execution with no authentication and no user interaction (CVSS 9.8). This is the canonical proof that "just printing text to a terminal" is a real attack surface, not theoretical.
- [CVE-2021-27135](https://nvd.nist.gov/vuln/detail/CVE-2021-27135) — xterm before patch #366: a crafted UTF-8 combining-character sequence caused a buffer-handling flaw leading to crash or potential arbitrary code execution (CVSS 9.8). Directly relevant: this was triggered by *Unicode text content*, not classic `\x1b[` escape codes — width/combining-character handling is itself part of the terminal attack surface, not just SGR/OSC parsing.

**Trojan Source / bidi overrides.** Bidirectional control characters (e.g. U+202E RIGHT-TO-LEFT OVERRIDE) reorder how subsequent characters are *displayed* without changing their logical byte order — CVE-2021-42574 covers the core technique (early-return / comment-out / stretched-string tricks that make displayed code diverge from logical code), and CVE-2021-42694 covers a homoglyph/confusable variant ([trojansource.codes](https://trojansource.codes/)). For a TUI rendering a package name or description, an unterminated bidi override could make the visible text lie about what will actually be logged, matched, or passed to a shell — the recommended mitigation for a rendering surface (as opposed to a compiler) is to make such characters "perceptible with visual symbols or warnings," which in practice means stripping or visibly escaping them rather than passing them through raw.

**What Rust crates cover, and what they don't:**
- `strip-ansi-escapes` (backed by the `vte` VT100-class parser) strips CSI/OSC/etc. escape sequences from a byte or string stream via `strip()`/`strip_str()`/a `Writer` wrapper ([docs.rs/strip-ansi-escapes](https://docs.rs/strip-ansi-escapes/latest/strip_ansi_escapes/)). This addresses classic ANSI injection but says nothing about bidi overrides, zero-width characters, or confusables — those are Unicode-text-content attacks, not escape-sequence attacks, and pass straight through a pure ANSI stripper untouched.
- `unicode-security` implements Unicode Technical Standard #39: mixed-script detection, confusable-character detection, and identifier restriction levels ([docs.rs/unicode-security](https://docs.rs/unicode-security/latest/unicode_security/)) — this is the crate for the confusable/homoglyph half of Trojan Source (CVE-2021-42694-style), but its documented scope does not explicitly cover bidi override character detection, so an app still needs an explicit check/strip for bidi control characters (the `Cf` "format" Unicode category members like U+202A–U+202E, U+2066–U+2069) alongside it.
- `ansi-to-tui` converts SGR (color/style) escape sequences into ratatui `Text` and explicitly documents that "unknown or malformed escape sequences are ignored" ([docs.rs/ansi-to-tui](https://docs.rs/ansi-to-tui/latest/ansi_to_tui/)) — this is a rendering convenience, not a sanitizer: a well-formed OSC 52 or OSC 8 sequence is not "malformed," so it will not necessarily be dropped by a permissive parser the way a naive reading of "ignores malformed sequences" might suggest. Treat any ANSI-rendering crate as orthogonal to sanitization, not a substitute for it.

**What to actually sanitize with, in order:** (1) strip or reject all C0/C1 control and escape sequences except the small allowlist your own rendering intentionally emits (i.e., never forward attacker text's own escape sequences verbatim — re-emit style purely from your own trusted styling code, never pass through bytes the registry sent); (2) strip or visibly replace Unicode bidi format characters and other default-ignorable/zero-width code points before layout; (3) run mixed-script/confusable detection (`unicode-security`) on anything used as an identifier-like value (package names) rather than free text.

### 7. Width and rendering of untrusted strings

- **`unicode-width` is the correct tool, but it computes display width — not safety.** The crate determines per-`char`/`str` column width per Unicode Annex #11, correctly handling zero-width combining marks (width 0), most CJK/fullwidth characters (width 2), and documents that emoji ZWJ sequences and presentation sequences are context-dependent (width 1 or 2) ([docs.rs/unicode-width](https://docs.rs/unicode-width/latest/unicode_width/)). Ratatui's `Line::width()` uses exactly this via `UnicodeWidthStr` ([docs.rs/ratatui `Line`](https://docs.rs/ratatui/latest/ratatui/text/struct.Line.html)). The gap: `unicode-width` measures the *text*, but if the text still contains raw escape sequences (not stripped first), those bytes are not part of any `char`'s width calculation in the crate's model, yet the real terminal *will* interpret and act on them when it receives the rendered frame — width-correctness and escape-safety are two separate passes, and skipping either one independently breaks layout or security.
- **Truncation must cut on grapheme-cluster boundaries, not bytes or `char`s.** `unicode-segmentation`'s grapheme-cluster iterator exists specifically because a single user-perceived character can be multiple Unicode scalar values (base + combining marks); slicing by byte offset or by `char` count can separate a base character from its combining mark or split a multi-codepoint emoji sequence, producing garbage or a lone combining mark rendered on the next cell ([docs.rs/unicode-segmentation](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/)).
- **Correct vs incorrect truncation of untrusted registry text:**

  ```rust
  // WRONG: truncates by byte count — panics on non-UTF8-boundary,
  // and even when it doesn't panic, can split a combining sequence.
  fn truncate_bad(s: &str, max_bytes: usize) -> &str {
      &s[..max_bytes.min(s.len())]
  }

  // WRONG: truncates by `char` count — never panics, but a `char`
  // is a scalar value, not a user-perceived glyph; this can still
  // separate a base character from a combining accent it needs.
  fn truncate_still_bad(s: &str, max_chars: usize) -> String {
      s.chars().take(max_chars).collect()
  }

  // RIGHT: truncate on grapheme-cluster boundaries, and measure the
  // *display width* (not char/byte count) against the column budget,
  // after the text has already been through ANSI/bidi stripping.
  use unicode_segmentation::UnicodeSegmentation;
  use unicode_width::UnicodeWidthStr;

  fn truncate_for_display(clean: &str, max_cols: usize) -> String {
      let mut out = String::new();
      let mut cols = 0;
      for g in clean.graphemes(true) {
          let w = g.width();
          if cols + w > max_cols { break; }
          out.push_str(g);
          cols += w;
      }
      out
  }
  ```

- **Order of operations matters:** strip ANSI/control/bidi first, *then* measure width and truncate on grapheme boundaries. Measuring width before stripping lets an embedded escape sequence's literal bytes (interpreted by `unicode-width` as ordinary — mostly zero/ambiguous-width — characters) desynchronize your column budget from what the real terminal will do once it interprets those same bytes as commands rather than glyphs.

### 8. Mouse support

- **Worth it for:** scroll-to-navigate long lists, click-to-select/focus a panel, click a link-like element. All surveyed dashboards (k9s, btop, lazygit) support mouse scroll and click as an addition to, never a replacement for, keyboard navigation.
- **The trade-off: enabling mouse capture (`EnableMouseCapture` in crossterm, or the equivalent raw `\x1b[?1000h`-class sequence) hands the terminal's native click-drag text selection to the application** — the terminal emulator stops letting the user drag-select and system-copy text, and instead delivers click/drag events to the app as input. Users who want to copy an error message or a package name out of the TUI lose the ability to do so with a normal drag-select while mouse capture is active.
- **Mitigation used in practice:** most terminal emulators reserve holding `Shift` while dragging to bypass application mouse-capture and fall back to native selection — this is a terminal-emulator-side convention, not something the app implements, but it's worth documenting for users ("hold Shift to select text") since it is not discoverable on its own. An app-level mitigation is to make mouse capture togglable (a key to enable/disable it at runtime) rather than always-on, and to default it off if the primary workflow is more about reading/copying data (a package manager) than interactive dashboards.

### 9. Non-TTY and CI

- **`std::io::IsTerminal`, stable since Rust 1.70, is the standard mechanism** — no dependency needed. `stdout().is_terminal()` (or `stdin()`) returns `false` when piped, redirected to a file, or run under CI, and the trait is implemented for `Stdin`/`Stdout`/`Stderr` and their lock variants plus raw fd/handle types on Unix and Windows ([std::io::IsTerminal docs](https://doc.rust-lang.org/std/io/trait.IsTerminal.html)).
- **Correct pattern for a TUI entry point:**

  ```rust
  use std::io::{self, IsTerminal};

  fn main() -> anyhow::Result<()> {
      if !io::stdout().is_terminal() || cli.no_tui {
          return run_plain_mode(&cli); // line-oriented, scriptable, no raw mode
      }
      run_tui(&cli)
  }
  ```

  The check should gate on stdout (what's being rendered to), not just stdin — a TUI piped into `less` or redirected to a file has a non-terminal stdout even if stdin is still a live terminal.
- **A `--no-tui` (or equivalent) escape hatch is still needed even when stdout is a real TTY** — some users deliberately want scriptable/pipeable output from an interactive terminal (e.g. `grim search foo --no-tui | grep bar`), and auto-detection alone can't serve that case.
- **The piping story is the same fallback as the accessibility one (§4):** the plain/line-oriented mode that non-TTY detection triggers should be the *same* code path as the explicit accessibility fallback and the `--no-tui` flag — one implementation, three triggers (non-TTY, explicit flag, accessibility need), never three separate "simple mode" implementations that drift apart.
- **Never leave the terminal in raw mode / alternate screen on early exit.** If a TUI panics or hits an early return after entering raw mode/alternate screen, the user's shell is left broken until they type `reset` blind — this is a correctness bug, not just a UX one, and needs a guard (e.g. RAII drop guard restoring terminal state, or a panic hook that restores it before re-panicking) around every entry/exit path, not just the happy one.

### 10. Testing UX claims

- **Keyboard-driven walkthrough tests are the mechanical part.** Ratatui and crossterm both support headless/backend-injected testing (feeding synthetic key events into the event-handling function and asserting on the resulting rendered buffer or app state) — this validates that a documented keybinding actually does what the help text claims, that focus moves as expected, and that Esc/`q`/Ctrl-C really exit or cancel. This is scriptable and belongs in CI.
- **What must still be judged by a human:** whether a color scheme is actually legible against a real light-background terminal theme, whether a spinner's animation is distracting rather than reassuring, whether the help overlay is actually *findable* by someone who's never used the tool, and screen-reader behavior (no automated Rust tooling substitutes for running an actual screen reader against the actual terminal output). Automated tests can prove a keybinding works; they cannot prove a keybinding is discoverable or that a color choice reads as intended.

## Normative guidance candidates

1. **Bind `Ctrl-C` to immediate, unconditional exit/interrupt in every mode of the TUI; never repurpose it.** Rationale: it is the one binding every terminal user trusts to always work, across every tool surveyed. VERIFICATION: grep the event-handling match arms for `KeyCode::Char('c')` guarded by `KeyModifiers::CONTROL` and confirm the arm is reachable from every application mode/screen, not only the top-level one.

2. **Bind `Esc` to "cancel current mode / close current overlay / step back one level," distinct from quit.** Rationale: users expect Esc to be reversible and local; conflating it with quit removes the "back out safely" affordance every surveyed tool has. VERIFICATION: reading heuristic — for each modal/overlay/filter-input state in the state machine, confirm an `Esc` arm exists that returns to the previous state rather than exiting the process.

3. **Bind `?` to a full help overlay and keep a persistent key-hint bar in the primary view; don't ship only one.** Rationale: the bar teaches through repetition, the overlay is the fallback the bar can't fully cover. VERIFICATION: reading heuristic on the render module — confirm a help/overlay screen exists reachable via `?`, and confirm a status/footer widget renders context-relevant key hints in the default view.

4. **Support both vim-style (`hjkl`/`j`,`k`) and arrow-key navigation on every list/scroll surface, never only one.** Rationale: every actively-referenced tool in this survey (htop, btop, gitui, lazygit) supports both simultaneously; picking one alone is a gratuitous accessibility/preference regression. VERIFICATION: grep key-handling code for `KeyCode::Down`/`KeyCode::Up` and confirm the same handler (or an equivalent arm) also matches `Char('j')`/`Char('k')` in every list-navigation context.

5. **Never encode meaning in colour alone; pair every colour-coded state with a text label, icon, or prefix.** Rationale: WCAG 1.4.3 contrast cannot be guaranteed against an arbitrary user terminal theme, and colour-blind or 16-color/no-color users must still get the information. VERIFICATION: grep rendering code for `Style::default().fg(Color::` calls that carry semantic meaning (error/success/warning) and confirm each corresponding span also contains a non-color-only marker (glyph/prefix/text), not color alone.

6. **Check `NO_COLOR` (non-empty) and disable ANSI colour output by default when set, but let an explicit `--color` flag or user config override it.** Rationale: this is the documented standard, and the override clause matters — a blanket obey-and-never-override implementation breaks users who explicitly asked for color. VERIFICATION: `grep -rn "NO_COLOR" src/` and confirm the check happens before any hardcoded `Color::` styling is applied, and that a `--color=always`-style flag is checked first and short-circuits the `NO_COLOR` check.

7. **Never pass registry-supplied (or any externally-sourced) text through to the terminal without stripping C0/C1 control and escape sequences first — re-emit styling from trusted code only, never forward the source's own escape bytes.** Rationale: CWE-150 / real terminal-emulator RCEs (CVE-2019-9535, CVE-2021-27135) prove "just printing untrusted text" is a live attack surface, not theoretical. VERIFICATION: grep every call site that writes package/registry-sourced `String` data to a `Terminal`/`Frame`/stdout, and confirm each one passes through a sanitizer (e.g. `strip_ansi_escapes::strip`) before render — a `cargo` audit-style grep is `rg 'registry|Package.*description|manifest' src/tui/ | rg -v 'strip_ansi|sanitiz'` to surface unsanitized paths.

8. **Strip or visibly replace Unicode bidi format characters (U+202A–U+202E, U+2066–U+2069) and other default-ignorable code points in any externally-sourced text before layout, separately from ANSI stripping.** Rationale: `strip-ansi-escapes` does not cover this class (Trojan Source, CVE-2021-42574/CVE-2021-42694) — it's a Unicode-content attack, not an escape-sequence attack. VERIFICATION: unit test that feeds a string containing U+202E through the sanitizer and asserts the character is absent (or replaced) from the output, run as part of the sanitizer's own test module.

9. **Truncate any externally-sourced string on grapheme-cluster boundaries (`unicode-segmentation`) measured by display width (`unicode-width`), never by byte length or `char` count — and only after ANSI/control stripping.** Rationale: byte/char truncation can split a combining sequence or leave dangling escape-sequence fragments, corrupting layout or leaking partial control sequences. VERIFICATION: `rg '&s\[\.\.[a-zA-Z_]+\]' src/` and `rg '\.chars\(\)\.take\(' src/` to surface byte-slice or char-count truncation on any string that isn't a known-trusted literal; each hit on externally-sourced text is a finding.

10. **Refuse to launch the TUI (fall back to a plain, scriptable, line-oriented mode) when `stdout().is_terminal()` is false, and also expose an explicit `--no-tui` flag for the same fallback.** Rationale: `std::io::IsTerminal` is stable stdlib since Rust 1.70 — no excuse to reimplement or skip this — and CI/pipe usage must never hang on a raw-mode TUI. VERIFICATION: `grep -rn "is_terminal" src/` confirms the check exists at the TUI entry point; `command | cat` (forcing non-TTY stdout) exiting cleanly with plain output, not hanging or drawing escape codes into the pipe, is the runnable check.

11. **Guard every terminal raw-mode/alternate-screen entry with an unconditional restore on exit, including panics.** Rationale: a TUI that panics mid-render and leaves the shell in raw mode/alt-screen is a correctness bug that requires the user to blind-type `reset`. VERIFICATION: reading heuristic — confirm a `Drop` guard (or an installed `std::panic::set_hook` that restores terminal state before re-invoking the default hook) wraps every raw-mode-enable call, and that there is exactly one enable/disable pair, not one per code path.

12. **Never block the terminal-event polling loop on network or filesystem I/O; run such operations off the event thread/task and poll both concurrently.** Rationale: blocking input on I/O means `Ctrl-C` and every other keypress queue silently until the I/O call returns — the single worst latency violation for a TUI. VERIFICATION: reading heuristic on the main loop — confirm the event-read call (`crossterm::event::poll`/`read`, or its async equivalent) is inside a `select!`/similar construct alongside any in-flight operation future, never called after an `.await` on a blocking I/O call with no timeout/poll interleaving.

## AI-agent angle

- **An LLM will reach for `s[..n]` or `.chars().take(n)` to truncate a display string without prompting** — it is the shortest, most "obviously correct" code, and it is wrong for any string that might contain non-ASCII or (worse) unstripped escape sequences. Smallest mechanical check: `rg '&([a-zA-Z_]+)\[\.\.[0-9a-zA-Z_]+\]' -g'*.rs' src/` and `rg '\.chars\(\)\.take\(' -g'*.rs' src/`, then manually confirm each hit is either a known-ASCII-only literal or passes through grapheme-aware truncation.
- **An LLM asked to "render this package description" will write `write!(stdout, "{}", desc)` or push it straight into a ratatui `Line::raw(desc)` without sanitizing it first**, because nothing in the type system marks `desc: String` as untrusted. Smallest mechanical check: `rg -g'*.rs' 'Line::(raw|from)\(' src/tui/` cross-referenced against which of those call sites' argument traces back to a `Package`/`Manifest`/registry-deserialized struct field rather than a string literal the binary itself constructed — any such call site with no sanitizer call in between is a finding.
- **An LLM will implement `NO_COLOR` (or width/color detection generally) by hand rather than reaching for `supports-color`**, and hand-rolled implementations reliably miss the "non-empty" nuance (treating `NO_COLOR=` as unset) or skip the override-by-explicit-flag clause. Smallest mechanical check: `rg 'NO_COLOR' -g'*.rs' src/ Cargo.toml` — if `NO_COLOR` appears in source but `supports-color` (or equivalent) is absent from `Cargo.toml`, read the hand-rolled logic for the empty-string and override cases specifically.
- **An LLM will pick a single navigation style (arrows-only or vim-only) rather than both**, because supporting both means writing what looks like duplicate match arms — this reads as redundant to a model optimizing for "clean" code, so it gets collapsed to one. Smallest mechanical check: for every `KeyCode::Down`/`Up`/`Left`/`Right` handled in a navigation context, `rg -A2 -B2` around the match arm and confirm a `Char('j'/'k'/'h'/'l')` sibling arm exists; a lone arrow-only handler is the finding.
- **An LLM implementing a TUI entry point will often skip the `IsTerminal` check entirely** unless the task explicitly names CI/piping as a requirement, because the happy-path "just run the TUI" is the default it will produce first. Smallest mechanical check: `rg 'fn main' -A20 src/main.rs` (or the TUI entry point) and confirm `is_terminal()` (or a `--no-tui` flag check) gates the TUI launch before any `enable_raw_mode()`/`EnterAlternateScreen` call.
- **An LLM will not think to test "what happens if the terminal panics mid-render"** unless asked — raw-mode restore on panic is exactly the kind of unhappy-path correctness concern models underweight relative to the happy path. Smallest mechanical check: `rg 'enable_raw_mode|EnterAlternateScreen' -g'*.rs' src/` and, for each hit, confirm a matching `disable_raw_mode`/`LeaveAlternateScreen` exists in a `Drop` impl or a registered panic hook — not only at the bottom of `main()` after the event loop returns normally.

## Contested / evolving

- **Immediate-mode TUI frameworks vs. screen-reader accessibility is an unresolved, actively-argued tension, not a solved problem.** The critique that ratatui/Ink/Bubble-Tea-style full-repaint frameworks are structurally hostile to screen readers is recent (2025–2026 commentary) and there is no consensus fix within the immediate-mode model itself — the practical direction industry has converged on is "ship a non-TUI fallback for every action" rather than "fix the TUI's accessibility," because retrofitting accessible incremental-diff rendering into an immediate-mode redraw model is a deep architectural change, not a patch. Treat this as directional guidance, not a settled spec — there is no equivalent of ARIA for terminal apps yet.
- **`unicode-security`'s bidi-override coverage is unclear from its own docs** — the crate's documented surface is UTS #39 mixed-script/confusable/restriction-level detection, and it is not clear from the crate documentation alone whether it also flags bidi format characters (the Trojan Source mechanism itself, as opposed to the homoglyph variant). This needs direct verification against the crate's source/tests before relying on it as the single sanitizer for the full Trojan Source class — don't assume one crate covers both CVE-2021-42574 (bidi) and CVE-2021-42694 (confusables) without checking.
- **Mouse-capture-vs-native-selection trade-off has no universal fix** — the `Shift`-to-bypass convention is real but terminal-emulator-specific and not discoverable without documentation; some terminal emulators (and some SSH/multiplexer combinations) don't support it cleanly. There is no portable in-app solution beyond making mouse capture toggle-able; this remains an open UX cost of any mouse-capturing TUI as of 2026.
- **COLORTERM as a truecolor signal is a convention, not a standard** — widely checked (by `supports-color` and peers) but never formally specified the way `NO_COLOR` is; some terminals set it inconsistently or not at all despite supporting truecolor, so treat truecolor detection as best-effort and always keep a 256-color/16-color degradation path, never assume truecolor is safe to rely on unconditionally.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cwe.mitre.org/data/definitions/150.html](https://cwe.mitre.org/data/definitions/150.html) | CWE-150 official definition | v4.20, current | The exact weakness class for terminal escape-sequence injection; names LLM-output injection explicitly |
| [no-color.org](https://no-color.org/) | `NO_COLOR` standard | Living standard | Primary spec for the color-suppression env var and its override semantics |
| [trojansource.codes](https://trojansource.codes/) | Trojan Source academic research site | 2021, current | Primary source for CVE-2021-42574/CVE-2021-42694 bidi/homoglyph attack mechanics and mitigations |
| [gist.github.com/egmontkob/…](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) | OSC 8 hyperlink spec (de facto reference) | 2017, current | Primary spec for the exact escape sequence format and documented security considerations |
| [lazygit Keybindings_en.md](https://raw.githubusercontent.com/jesseduffield/lazygit/master/docs/keybindings/Keybindings_en.md) | Official lazygit keybinding reference | Current (2026) | Primary source for a widely-used git TUI's full keymap |
| [k9scli.io/topics/commands](https://k9scli.io/topics/commands/) | Official k9s docs | Current (2026) | Primary source for k9s's quit/help/search/filter bindings |
| [docs.helix-editor.com/keymap.html](https://docs.helix-editor.com/keymap.html) | Official Helix editor keymap docs | Current (2026) | Primary source establishing helix's deliberate modal-first design as the outlier case |
| [docs.rs/ratatui `Line`](https://docs.rs/ratatui/latest/ratatui/text/struct.Line.html) | ratatui crate API docs | Current stable | Primary source for `width()`/truncation behavior of the exact rendering primitive this project uses |
| [w3.org WCAG 2.1 SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) | W3C WCAG 2.1 standard | 2018, current | Primary source for the exact 4.5:1/3:1 contrast thresholds |
| [nvd.nist.gov CVE-2019-9535](https://nvd.nist.gov/vuln/detail/CVE-2019-9535) | NVD CVE record | 2019 | Primary evidence that malicious terminal output alone can achieve RCE (iTerm2/tmux) |
| [nvd.nist.gov CVE-2021-27135](https://nvd.nist.gov/vuln/detail/CVE-2021-27135) | NVD CVE record | 2021 | Primary evidence that Unicode/combining-character content, not just escape codes, is part of the terminal attack surface (xterm) |
| [fzf README](https://raw.githubusercontent.com/junegunn/fzf/master/README.md) | Official fzf project README | Current (2026) | Primary source for fzf's exit/navigation/multi-select bindings |
| [yazi README](https://raw.githubusercontent.com/sxyazi/yazi/main/README.md) | Official yazi project README | Current (2026) | Primary source confirming vim-style input philosophy in a modern Rust TUI file manager |
| [docs.rs/strip-ansi-escapes](https://docs.rs/strip-ansi-escapes/latest/strip_ansi_escapes/) | Rust crate API docs | Current stable | Primary source for the exact API and scope (vte-backed) of the standard ANSI-stripping crate |
| [embracethered.com, "Terminal DiLLMa"](https://embracethered.com/blog/posts/2024/terminal-dillmas-prompt-injection-ansi-sequences/) | Independent security research blog | 2024 | Primary, detailed catalogue of real ANSI/OSC injection techniques against LLM-integrated terminal tooling — closest real-world analogue to this project's threat model |
| [vulnerablemcp.info, ANSI Terminal Code Deception](https://vulnerablemcp.info/vuln/ansi-terminal-code-deception.html) | Vulnerability reference site | Disclosed Apr 2025 | Primary documentation of the hide-from-human/visible-to-parser ANSI attack class, with named researcher and disclosure date |
| [atuin README](https://raw.githubusercontent.com/atuinsh/atuin/main/README.md) | Official atuin project README | Current (2026) | Primary source for atuin's search-UI keybindings (Ctrl-R, filter-mode cycling) |
| [doc.rust-lang.org std::io::IsTerminal](https://doc.rust-lang.org/std/io/trait.IsTerminal.html) | Official Rust standard library docs | Stable since 1.70 | Primary source for the exact stdlib API and stability version for non-TTY detection |
| [nngroup.com, "Response Times: 3 Important Limits"](https://www.nngroup.com/articles/response-times-3-important-limits/) | Nielsen Norman Group UX research | Classic, still current | Primary source for the 0.1s/1s/10s perceptible-response thresholds this section's guidance is built on |
| [docs.rs/supports-color](https://docs.rs/supports-color/latest/supports_color/) | Rust crate API docs | Current stable | Primary source for the standard Rust color-capability-detection crate's API and env-var handling |
| [man7.org htop(1)](https://man7.org/linux/man-pages/man1/htop.1.html) | Official htop man page | Current | Primary source for htop's function-key and arrow/vim-alias navigation scheme |
| [docs.rs/unicode-width](https://docs.rs/unicode-width/latest/unicode_width/) | Rust crate API docs | Current stable | Primary source for exact display-width computation rules (Annex #11) and emoji/CJK caveats |
| [docs.rs/ansi-to-tui](https://docs.rs/ansi-to-tui/latest/ansi_to_tui/) | Rust crate API docs | Current stable | Primary source establishing this crate is a renderer, not a sanitizer (silently ignores malformed sequences) |
| [btop README](https://raw.githubusercontent.com/aristocratos/btop/main/README.md) | Official btop++ project README | Current (2026) | Primary source for btop's optional vim-keys toggle alongside default arrow navigation |
| [siegal.bio.nyu.edu, Okabe–Ito palette](https://siegal.bio.nyu.edu/color-palette/) | Reference page for the Okabe–Ito palette | Palette dates to 2008, page current | Primary source for the exact 8-color hex values of a widely-cited colorblind-safe palette |
| [docs.rs/unicode-segmentation](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/) | Rust crate API docs | Current stable | Primary source for grapheme-cluster segmentation (Annex #29) — the correct truncation primitive |
| [docs.rs/unicode-security](https://docs.rs/unicode-security/latest/unicode_security/) | Rust crate API docs | Current stable | Primary source for UTS #39 mixed-script/confusable detection, relevant to the Trojan-Source homoglyph variant |
