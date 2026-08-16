---
title: Rendering Untrusted Text Safely — ANSI Injection, Bidi, Unicode
topic: terminal-injection-and-untrusted-text
agent: rust-security-researcher
model: sonnet
date_researched: 2026-08
sources_count: 22
scope: |
  Covers ANSI/CSI/OSC/DCS escape injection into terminals and TUIs from
  registry-controlled strings (names, descriptions, tags, error text, paths);
  Trojan Source / bidi overrides and Unicode confusables; grapheme/width-safe
  truncation; the Rust crate landscape for sanitization (strip-ansi-escapes,
  console, anstream, unicode-width, unicode-segmentation, unicode-security);
  and ratatui's specific (partial) protections. Does NOT cover terminal
  emulator implementation hardening, shell-metacharacter injection into
  subprocess argv (a different trust boundary), or general Unicode
  normalization for string equality/search.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The attack class: what escape sequences let an attacker do](#1-the-attack-class-what-escape-sequences-let-an-attacker-do)
   2. [Named CVEs and what each required](#2-named-cves-and-what-each-required)
   3. [CWE framing and where authoritative guidance lives](#3-cwe-framing-and-where-authoritative-guidance-lives)
   4. [Trojan Source, bidi overrides, and what rustc's lint actually covers](#4-trojan-source-bidi-overrides-and-what-rustcs-lint-actually-covers)
   5. [Unicode width/grapheme handling as a correctness problem](#5-unicode-widthgrapheme-handling-as-a-correctness-problem)
   6. [The Rust crate landscape](#6-the-rust-crate-landscape)
   7. [Where the boundary belongs: ingest vs. render vs. both](#7-where-the-boundary-belongs-ingest-vs-render-vs-both)
   8. [ratatui specifics: what buffering neutralizes and what it doesn't](#8-ratatui-specifics-what-buffering-neutralizes-and-what-it-doesnt)
   9. [The pass-through case](#9-the-pass-through-case)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. An attacker who controls a string your tool prints — a package name, tag, description, error message, or file path — controls terminal state: cursor position, screen contents, scrollback, window/tab title, and (via OSC 52) the system clipboard. This is not theoretical; it is CWE-150, a named weakness class with a live CVE stream through 2026.
2. The canonical framing is CWE-150 (Improper Neutralization of Escape, Meta, or Control Sequences), a child of CWE-138 → CWE-116 (Improper Encoding/Escaping of Output) → CWE-707. Its own demonstrative example is an LLM/agent pipeline printing untrusted model output to a terminal — this is exactly the shape of the grim/ocx problem.
3. Recent, directly analogous CVEs (2025–2026) exist for tools structurally identical to grim/ocx: **Soft Serve** ([GHSA-fv2r-r8mp-pg48](https://github.com/advisories/GHSA-fv2r-r8mp-pg48)) leaked ANSI injection through six fields — repo descriptions, project names, commit author names, commit messages, token names, webhook URLs — i.e. exactly the "registry metadata" surface this project has. **Oh My Posh** ([GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h)) wrote raw C0/C1 control bytes verbatim from directory names and git metadata; fix was "neutralize control characters in untrusted segment data, applying the filtering already used for console titles" — i.e. the exact one-sanitizes/one-doesn't divergence this project is being audited for.
4. **Rails Active Record** ([GHSA-76r7-hhxj-r776](https://github.com/advisories/GHSA-76r7-hhxj-r776), CVE-2025-55193) shows the boundary is not just interactive TUIs: unsanitized IDs reaching a **logger** is the same CWE-150 bug. Anything that becomes terminal bytes eventually — including log files a human later `cat`s or `tail`s — is in scope.
5. **RUSTSEC-2025-0055** (`tracing-subscriber`, fixed in 0.3.20, September 2025) is the same bug in the Rust ecosystem specifically: logging user input could poison logs with ANSI escapes that "manipulate terminal title bars, clear screens, or modify terminal display." This is the most directly applicable Rust-ecosystem precedent for this project.
6. The historical high-water mark is **CVE-2019-9535** (iTerm2 + tmux integration, CVSSv3 9.8): a program printing attacker-controlled output — reachable via "commands generally considered safe" like `curl` or `tail` — could achieve remote code execution through tmux's `-CC` control-mode protocol embedded in escape sequences. Mozilla funded the audit that found it; the lesson generalizes: "an attacker who can produce output to the terminal can, in many cases, execute commands on the user's computer."
7. **CVE-2003-0063** (xterm) is the canonical query/response-injection primitive: a crafted escape sequence sets the window title, then a *second* sequence causes the terminal to re-inject that title as if it were typed at the shell prompt — turning "printed text" into "executed commands" with zero user action beyond viewing the text.
8. **CVE-2003-0020** (Apache) establishes that log/error text is the same trust boundary as interactive terminal output: Apache didn't filter escape sequences from its error log, so anyone viewing the log in a vulnerable terminal emulator inherited the terminal's escape-sequence bugs. This directly covers grim/ocx's error-text and log-output paths, not just the TUI.
9. Bidi overrides (CVE-2021-42574, "Trojan Source") let a string display in an order that doesn't match its logical/byte order. rustc added two **deny-by-default** lints — `text_direction_codepoint_in_comment` and `text_direction_codepoint_in_literal` — but both fire only on Rust **source code** (string/char literals and comments) at compile time. They do nothing for a bidi override character arriving at runtime inside a registry response string; that data never touches the lexer.
10. Unicode confusables (the homoglyph half of Trojan Source, CVE-2021-42694) are a *display* problem distinct from bidi: two visually-identical package names can be different byte strings. The `unicode-security` crate implements UTS #39 (`skeleton()`, `MixedScript`, `GeneralSecurityProfile`) for exactly this, but it must be invoked deliberately — nothing in std or the compiler does it for runtime strings.
11. `strip-ansi-escapes` (backed by the real `vte` VT-parser state machine, the same parser Alacritty uses) and `console::strip_ansi_codes` (its own DFA/regex) both strip CSI, OSC, and DCS sequences — not just SGR color codes — and both correctly consume the terminator variants (`BEL`, `ST`, `ESC\`). `console`'s implementation explicitly handles the tmux DCS-passthrough wrapping pattern (`\x1bPtmux;...`) that a naive "strip `ESC[...m`" regex would miss — a real historical bypass class against unsophisticated strippers.
12. `unicode-width` (`UnicodeWidthStr`/`UnicodeWidthChar`, UAX #11) and `unicode-segmentation` (`.graphemes(true)`, UAX #29) are the two crates that make truncation and column-layout of a hostile string safe: width because a string's `.len()` or `.chars().count()` is not its terminal column width, and graphemes because slicing by byte or `char` index can split a multi-codepoint cluster (combining marks, ZWJ emoji sequences) and, more dangerously, can split an escape sequence in half — turning a stripped-then-truncated string back into a live partial sequence if truncation happens *before* stripping, or re-exposing an unterminated sequence if it happens *after*.
13. `anstream`/`anstyle` are for the opposite problem — auto-adapting *your own* styled output to the terminal's declared capabilities — and are not a sanitizer for untrusted input; `anstream::StripStream` only strips when the destination isn't a color-capable TTY, which is the wrong trigger for a security boundary (a color-capable terminal is exactly the one you need to sanitize *for*, not skip sanitizing *because of*).
14. ratatui does **not** interpret raw bytes: `Buffer::set_string`/`set_stringn` iterate the input with `unicode-segmentation` and drop any grapheme cluster containing a `char::is_control` character (which includes ESC 0x1B and other C0/C1 controls) — confirmed by reading `ratatui-core/src/buffer/buffer.rs` directly, including a test named `control_sequence_rendered_full` where an embedded `\x1b[0;36m` survives as the *literal printable text* `[0;36m` because only the ESC byte itself was dropped.
15. That protection is scoped to the `set_string` family only. `Buffer`/`Cell::set_symbol()` called directly (as custom widgets and low-level rendering code do) performs no such filtering, and the backend's actual terminal write — confirmed in `ratatui-crossterm/src/lib.rs` — is `queue!(self.writer, Print(cell.symbol()))?` with **no sanitization at all**: whatever string ends up as a cell's symbol is written verbatim. ratatui's buffering is an accidental partial mitigation on one code path, not a designed security boundary — it must not be treated as "the TUI is already safe because it uses ratatui."
16. OSC 8 hyperlinks have an explicitly **unsettled** security stance from the spec's own author: the canonical [egmontkob gist](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) states the feature "doesn't have security aspects to worry about" beyond ordinary web browsing, while naming custom-URI-scheme handoff and social-engineering-via-automated-link-opening as open risks the spec pushes onto *terminal emulators* to mitigate (confirmation dialogs, scheme allowlists) — it gives **no** guidance to applications emitting links from untrusted data. Treat that gap as your problem, not a solved one.
17. OSC 52 (clipboard write) is disabled-by-default-to-`external`-mode in tmux specifically because "any application running inside tmux can create a tmux paste buffer and set the system clipboard" — including through `su`/`sudo` — and the tmux maintainers' own guidance is "great care must be taken with untrusted commands." Never construct an OSC 52 sequence from or around untrusted text.
18. Bracketed paste (`ESC[200~`/`ESC[201~`) is a defense *for* pasted text, not printed text — but a hostile printed string can itself contain those markers, and printing an unterminated or forged bracket can desynchronize a downstream reader's paste-vs-typed state, which is the mechanism (not a specific 2026 CVE) behind "terminal answerback"-class attacks alongside query/response injection (CPR, DA).
19. The industry answer to "ingest vs. render boundary" is **render/output boundary as the single mandatory choke point**, because ingest-time sanitization is easy to bypass by adding a new data path later (a second API call, a second cache format, a TUI code path that reads the cache directly) — which is precisely the "one tool sanitizes at the exit boundary, the other does not" divergence this project was commissioned to fix. Ingest-time normalization (e.g., rejecting bidi overrides in a package name at publish time) is a *useful additional* control, never a substitute for render-boundary stripping.
20. For the pass-through case (deliberately forwarding a child process's colored output), the correct model is: use `anstream`/terminal-capability detection to decide *whether* to preserve color, but do not conflate "this is already ANSI from a subprocess" with "this is safe" — child-process output (docker build logs, downloaded build tool output, `git` output) is *also* untrusted data from the tool's own trust-boundary perspective and can carry the same CWE-150 payloads; only pass through unsanitized (or sanitize) based on your trust model for that specific child, not based on the mere presence of existing ANSI codes.

## Findings

### 1. The attack class: what escape sequences let an attacker do

A terminal emulator treats `ESC` (0x1B) as a mode switch: everything that follows until a recognized terminator is a **control sequence**, not text to display. The categories relevant to a package-manager CLI/TUI printing registry-controlled strings:

- **CSI (`ESC [`)**: cursor movement, screen/line clearing (`\x1b[2J`, `\x1b[K`), scrollback manipulation, SGR color/style — the baseline "make my fake text look real" primitive.
- **OSC (`ESC ]`)**: window/tab **title** setting (`\x1b]0;...\x07`), OSC 8 hyperlinks (rewrite what a printed URL actually points to), OSC 52 **clipboard write** (silently place attacker-chosen text on the system clipboard — a classic pivot into "poisoned paste" if the victim's next action is pasting a "helpful command" from your tool's own output).
- **DCS (`ESC P`)**: device control strings, notably tmux's `-CC` control-mode protocol — the vector for CVE-2019-9535 — and a documented smuggling wrapper (`\x1bPtmux;...`) that lets an attacker nest a second escape sequence inside one that a naive stripper only partially recognizes.
- **Query/response sequences** (Device Attributes `ESC[c`, Cursor Position Report `ESC[6n`): the terminal *replies on stdin*. If your program (or a program reading the same terminal, e.g. the shell after your process exits) is concurrently reading stdin expecting user input, the injected reply is indistinguishable from typed input — the mechanism behind CVE-2003-0063's title-reinjection and the general "terminal answerback" attack class.
- **Bracketed paste markers** (`ESC[200~` / `ESC[201~`): printed text that forges or fails to terminate these markers can desynchronize a downstream terminal/shell's paste-vs-typed tracking.

Source: [Wikipedia — ANSI escape code](https://en.wikipedia.org/wiki/ANSI_escape_code) (general reference, corroborated against CWE/CVE primary sources below — treat as secondary, not authoritative alone).

### 2. Named CVEs and what each required

| CVE / advisory | What it required | Impact |
|---|---|---|
| [CVE-2003-0063](https://nvd.nist.gov/vuln/detail/CVE-2003-0063) — xterm (XFree86 ≤4.2.0) | Victim views a file/output containing a crafted escape sequence that sets the window title, then a follow-up sequence that requests the title be reinjected onto the command line | Arbitrary command execution via reinjected title text |
| [CVE-2003-0020](https://www.tenable.com/cve/CVE-2003-0020) — Apache | Apache doesn't filter escape sequences from its error log; a later viewer opens the log in a vulnerable terminal | Attacker-controlled log lines become live escape sequences for whoever reads the log |
| [CVE-2019-9535](https://www.tenable.com/cve/CVE-2019-9535) — iTerm2 tmux integration (≤3.3.5), CVSSv3 9.8 | Program prints attacker-controlled output while the user is inside iTerm2's tmux integration (`tmux -CC`); reachable via ordinary commands like `curl`/`tail` against a malicious/compromised source | Remote code execution on the victim's machine ([Mozilla MOSS audit writeup](https://blog.mozilla.org/security/2019/10/09/iterm2-critical-issue-moss-audit/)) |
| [CVE-2021-42574](https://nvd.nist.gov/vuln/detail/CVE-2021-42574) — Unicode bidi algorithm (Trojan Source) | Source (or any displayed text) contains bidi override control characters; a human reviews the visual rendering, a machine processes the logical/byte order | Visual/logical mismatch — code review bypass, or (for this project's use case) a package name that *displays* as one thing and *is* another byte string |
| CVE-2021-42694 — Trojan Source homoglyph variant | Confusable/near-identical characters used in identifiers | Visual spoofing of identifiers/imports |
| [GHSA-fv2r-r8mp-pg48](https://github.com/advisories/GHSA-fv2r-r8mp-pg48) — Soft Serve, CVE-2025-64494 (2025) | Attacker sets repo description/project name/commit author/commit message/token name/webhook URL to contain ANSI | "Fake alerts," terminal display manipulation for any user viewing that metadata |
| [GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) — Oh My Posh, CVE-2026-73506 | Directory name, git commit metadata (subject, author, upstream URL) rendered into a shell prompt segment | Raw C0/C1 (ESC, BEL) written verbatim by `write(s rune)` — clipboard hijack via OSC 52, prompt spoofing, terminal DoS, title manipulation |
| [GHSA-76r7-hhxj-r776](https://github.com/advisories/GHSA-76r7-hhxj-r776) — Rails Active Record, CVE-2025-55193 | An ID value reaching `find()`/similar gets logged unescaped | ANSI-poisoned log lines |
| [RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html) — `tracing-subscriber` <0.3.20 | User input logged through `tracing-subscriber`'s formatter | "Manipulate terminal title bars, clear screens, or modify terminal display" for anyone viewing the log |

Also on record from the same advisory sweep but not fetched in full detail here: `GHSA-3439-vqgj-2gcf` (Mattermost, CVE-2026-3108, admin terminals via crafted chat messages), `GHSA-4c3c-r6p8-c863` (flawfinder, CVE-2026-48813, untrusted filenames/source text), `GHSA-q6jf-93cp-9xwf` (diff-so-fancy, CVE-2026-50642, non-SGR sequences unsanitized), `GHSA-34r5-6j7w-235f` (Inspektor Gadget, CVE-2026-25996, columns output mode) — all CWE-150, all 2025–2026, all "tool renders attacker-influenced field to a terminal." This is not a cold or historical category; it is an actively-reported bug class in exactly this shape of tool, right now.

### 3. CWE framing and where authoritative guidance lives

The authoritative entry is [CWE-150: Improper Neutralization of Escape, Meta, or Control Sequences](https://cwe.mitre.org/data/definitions/150.html) (`ChildOf` CWE-138 → CWE-116 [Improper Encoding or Escaping of Output](https://cwe.mitre.org/data/definitions/116.html) → CWE-707). Its own demonstrative example is, verbatim in substance: an AI agent using LLM output derived from untrusted training/inference data, displayed in a terminal, where injected escape codes can change colors, reposition the cursor, clear the screen, or (documented case) trigger OSC sequences that cause DNS lookups to adversary-controlled domains for information leakage. Mitigations named: allowlist-based input validation, output encoding restricted to printable characters, and for LLM-adjacent systems specifically, stripping escape codes before terminal output.

### 4. Trojan Source, bidi overrides, and what rustc's lint actually covers

[trojansource.codes](https://trojansource.codes/) documents three techniques (early-return-in-comment, comment-out-via-reorder, stretched-strings) plus a homoglyph variant, spanning CVE-2021-42574 (bidi) and CVE-2021-42694 (homoglyphs). Recommended tool-level mitigations: reject unterminated bidi control characters in comments/string literals, flag mixed-script-confusable identifiers, make the characters visually perceptible in editors/frontends.

rustc's response is two **deny-by-default** lints (Rust ≥1.56-era, per the 2021-11-01 CVE announcement; confirmed current in the lint listing): [`text_direction_codepoint_in_comment`](https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html) and `text_direction_codepoint_in_literal`, both matching `\u{202A}`, `\u{202B}`, `\u{202D}`, `\u{202E}`, `\u{2066}`, `\u{2067}`, `\u{2068}`, `\u{202C}`, `\u{2069}`.

**Why this doesn't help at runtime**: both lints run at parse/lex time over the literal text of *your source code*. A bidi override character arriving inside a `String` at runtime — e.g. deserialized from a registry API JSON response — never passes through the lexer as a literal. `cargo build` will happily compile a program that does zero bidi filtering on `response.name`, because there is no source-level literal for the lint to see. No clippy lint fills this gap as of this research (see Contested/evolving). This must be handled as an explicit runtime check, not inherited from the compiler.

### 5. Unicode width and grapheme handling as a correctness and layout problem

Two distinct measurements, both needed, from two crates:

- **Width** ([`unicode-width`](https://docs.rs/unicode-width/latest/unicode_width/), UAX #11): `UnicodeWidthStr`/`UnicodeWidthChar::width()` (and `width_cjk()` behind the `cjk` feature) give the terminal-column count. Zero-width/combining/`Default_Ignorable` codepoints correctly report width 0; East-Asian-Width=Ambiguous characters report 1 or 2 depending on context (`width()` vs `width_cjk()`), and the crate's behavior is pinned to a specific Unicode version (`UNICODE_VERSION` const) — mixing a width crate and a segmentation crate built against different Unicode table versions is a latent bug source worth pinning together.
- **Clusters** ([`unicode-segmentation`](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/), UAX #29): `.graphemes(true)` is the only correct unit for truncation. Byte slicing (`&s[..n]`) can panic on a non-char-boundary; `.chars().take(n)` can split a combining-mark sequence or a ZWJ emoji sequence into orphaned codepoints that render as mojibake or a replacement glyph, changing what's displayed without changing what a naive length check measured.

**The escape-sequence-specific failure mode**: truncating a raw (unstripped) string at a byte or char offset can bisect a live CSI/OSC sequence, leaving a dangling, unterminated escape sequence in the output — some terminals will then treat *subsequent* unrelated output (your tool's next line, a following field) as continuation parameters of that dangling sequence. This is why order matters: **strip before you truncate**, never the reverse — a truncation performed on unstripped input can turn a fully-formed (strippable) sequence into a malformed dangling one that's harder to reason about and that different terminals may resync from differently.

```rust
// WRONG — truncates raw bytes/chars, can split a grapheme AND can bisect
// an embedded escape sequence, leaving a dangling unterminated CSI/OSC.
let shown: String = registry_name.chars().take(40).collect();

// WRONG — strip after truncate: if the truncation point falls mid-sequence,
// the stripper may not recognize the now-incomplete sequence and leaves
// stray printable bytes (the trailing "[38;5;196m"-shaped garbage) behind.
let truncated: String = registry_name.chars().take(40).collect();
let shown = strip_ansi_escapes::strip_str(&truncated);

// RIGHT — strip first (full string, so the stripper sees complete
// sequences), THEN truncate on grapheme boundaries by measured width.
let clean = strip_ansi_escapes::strip_str(registry_name);
let shown: String = clean
    .graphemes(true)
    .scan(0usize, |w, g| {
        *w += g.width();
        (*w <= 40).then_some(g)
    })
    .collect();
```

### 6. The Rust crate landscape

| Crate | Removes / provides | What it misses |
|---|---|---|
| [`strip-ansi-escapes`](https://docs.rs/strip-ansi-escapes/latest/strip_ansi_escapes/) (0.2.x) | `strip()`/`strip_str()`/`Writer` — full VT-parser (`vte` crate, same engine as Alacritty) state machine, so it correctly parses CSI/OSC/DCS including multi-byte and unterminated forms | No confusable/bidi handling (different problem — it's a byte-level parser, not a Unicode-security tool); doesn't validate/re-check UTF-8 |
| [`console`](https://docs.rs/console/latest/console/) (`strip_ansi_codes`, `measure_text_width`, `truncate_str`, `AnsiCodeIterator`) | Own DFA/regex parser that explicitly recognizes CSI, OSC (BEL/ST-terminated), DCS, and the tmux DCS-passthrough wrapper pattern (`\x1bPtmux;...`) — confirmed reading [`console-rs/console/src/ansi.rs`](https://github.com/console-rs/console/blob/master/src/ansi.rs); also gives ANSI-aware width measurement/truncation in one call, useful when you want "strip and measure" together | Still a stripper, not an allowlist — same class of gap as any denylist tool: a sequence grammar it doesn't recognize passes through unstripped |
| [`anstream`](https://docs.rs/anstream/latest/anstream/) / `anstyle` | Auto-adapting output streams that add/strip *your own* SGR styling based on detected terminal capability (`StripStream`) | Not a security boundary: it strips based on "does this destination look like a color-capable terminal," which is backwards for untrusted input — the color-capable terminal is exactly the vulnerable target, not the safe case to skip |
| [`unicode-width`](https://docs.rs/unicode-width/latest/unicode_width/) | Column-width per UAX #11 | Not a sanitizer at all — feed it stripped, but not necessarily "safe," text |
| [`unicode-segmentation`](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/) | Grapheme/word/sentence boundaries per UAX #29 | Same — a correctness tool, not a security filter; a control character can still be its own "grapheme" and get truncation-preserved if you don't also strip |
| [`unicode-security`](https://docs.rs/unicode-security/latest/unicode_security/) | UTS #39: `skeleton()` (confusable-detection normal form), `MixedScript`, `GeneralSecurityProfile`, `is_potential_mixed_script_confusable_char()` | Homoglyph/identifier-spoofing detection only — irrelevant to raw escape-sequence injection; use it at name-comparison/collision-warning points, not as a terminal sanitizer |

**Allowlist vs. denylist**: every crate above is a denylist (recognize known-dangerous grammar, remove it) or a measurement tool. CWE-150's own mitigation guidance prefers an allowlist ("restrict output to printable characters and allowable whitespace") precisely because a denylist stripper can only be as complete as its grammar — the tmux DCS-passthrough smuggling case is the concrete historical proof that a partial denylist implementation misses real attacks. For this project: prefer stripping with a real state-machine parser (`strip-ansi-escapes`/`vte`, or `console`'s DFA, both of which do implement the full grammar including nesting) over hand-rolled regex, and where the exit boundary can afford it, consider an explicit allowlist (printable Unicode + `\n`/`\t`, nothing else) rather than "strip known-bad" as the final gate.

### 7. Where the boundary belongs: ingest vs. render vs. both

Ingest-time sanitization (reject/normalize at the moment a registry response is parsed) is attractive because it's one call site per API client — but it fails structurally the moment a *second* path reaches the terminal without going through that client (a cache read, a different binary in the workspace, a TUI widget that pulls from a different struct field, exactly the "one tool sanitizes at the exit boundary, the other does not" divergence this research was commissioned over). Render-boundary sanitization (strip immediately before the bytes leave the process — the `println!`/`write!`/ratatui-`Cell` call) is the only point every path is structurally forced through, provided it's actually the *only* function permitted to touch stdout/stderr/the ratatui buffer.

The practical answer, consistent with how the CWE-150 mitigation text and the fixed advisories above frame it ("neutralize... applying the filtering already used for console titles" — Oh My Posh's fix was explicitly to extend one already-correct choke point to the paths that bypassed it): **do both, but make render-boundary sanitization the one that's load-bearing**, and prove it survives refactors structurally rather than by code review — see Normative guidance §1 for the specific mechanism (a newtype the raw registry type cannot reach stdout without passing through).

### 8. ratatui specifics: what buffering neutralizes and what it doesn't

Read directly from `ratatui-core/src/buffer/buffer.rs` (main branch): `Buffer::set_stringn` segments the input with `unicode-segmentation` and applies `.filter(|symbol| !symbol.contains(char::is_control))` before ever calling `.set_symbol()` on a cell — so a lone ESC byte (`0x1B`, which `char::is_control()` reports `true` for, along with the rest of C0/C1) never becomes part of a stored cell symbol. The crate's own test `control_sequence_rendered_full` demonstrates the resulting behavior directly: an input containing `\x1b[0;36m` is *not* interpreted as a color code and is *not* silently dropped either — the ESC byte is removed, and the remaining printable characters (`[0;36m`) are stored and rendered as literal visible text. That is real, verified neutralization of the *triggering byte* for anything that goes through `set_string`/`set_stringn` — which covers `Paragraph`, `Line`, `Span::raw`/`Span::styled` when built through the normal widget APIs, and Ratatui built-in borders/titles set via strings.

But — confirmed by reading `ratatui-crossterm/src/lib.rs` — the backend's actual terminal write is `queue!(self.writer, Print(cell.symbol()))?`, with no sanitization at that layer at all: **whatever string is in `cell.symbol()` reaches the terminal verbatim.** The `set_stringn` filter is therefore the *only* gate, and it is bypassable by:

- Any code that builds a `Cell` and calls `cell.set_symbol(s)` directly rather than going through `Buffer::set_string`/`set_stringn` (custom widget `render()` implementations that index the buffer manually are exactly this).
- Any direct terminal write outside the buffer/widget render cycle — a splash screen, a raw-mode setup/teardown message, an inline `eprintln!` for an error path that fires from inside the TUI event loop, before/after `Terminal::draw`.
- Multi-codepoint grapheme clusters where a control character is combined with otherwise-printable codepoints in the *same* cluster: the filter drops the whole cluster in that case (fail-safe, not fail-open, for that specific shape) — but this means such input silently vanishes rather than being cleanly sanitized, which is a display-correctness surprise worth knowing about even though it isn't a security hole.

The correct framing for this project: **ratatui's `set_string` path is an accidental, partial mitigation for one call shape, not a designed trust boundary.** Sanitize explicitly before any string — including widget titles, list items, table cells — reaches ratatui, exactly as you would for a raw terminal write. Do not let "we use ratatui, so raw escapes can't reach the terminal" stand as an argument in review; it is empirically false for any code path that doesn't route through `set_string`.

### 9. The pass-through case

When a tool intentionally forwards a child process's own colored output (e.g., streaming a build tool's or `docker`'s stdout so its existing ANSI coloring survives), the correct tool is `anstream`/terminal-capability detection to decide whether to *preserve or strip* color based on the destination (real TTY vs. redirected file/pipe) — this is a UX decision, not a security one, and `anstream` is built for exactly it. The security question is separate and easy to get backwards: existing ANSI codes in a child's output do not mean that output is *safe* to forward unsanitized — the child process is itself often relaying data from a further-upstream untrusted source (a registry, a downloaded manifest, a remote build log) and can carry the same CWE-150 payloads the child never intended. Decide pass-through safety by the trust model of *that specific child and its inputs*, not by whether ANSI bytes are already present.

## Normative guidance candidates

1. **Sanitize at exactly one render-boundary choke point; make the raw registry type unable to reach stdout/stderr/the ratatui buffer without passing through it.**
   Rationale: this is the only structural fix for the "one tool sanitizes, one doesn't" divergence — code review alone will not catch a new bypass path added six months later.
   VERIFICATION: introduce a newtype (e.g. `SafeDisplay(String)`) produced only by the sanitizer function; `cargo clippy` combined with a repo grep test asserting `rg 'println!|eprintln!|write!\(.*stdout|Span::raw|Line::from' -g '*.rs'` call sites that touch a raw registry-response field (not `SafeDisplay`) return zero matches, run as a `#[test]` that fails the build if a new bypass is added. (A `Drop`/must-use marker on the raw type reaching a write call is a stronger version if the type boundary allows it.)

2. **Strip before truncating, never truncate before stripping.**
   Rationale: truncating raw text can bisect a live CSI/OSC/DCS sequence, leaving a dangling unterminated sequence whose resync behavior varies by terminal.
   VERIFICATION: grep the sanitizer/truncation call sites; the stripping call (`strip_ansi_escapes::strip_str` / `console::strip_ansi_codes`) must appear textually before any `.graphemes(...)`/width-based truncation on the same value. A unit test with a string containing a truncation-boundary-straddling `\x1b[38;5;196m...` sequence should assert the sanitized+truncated output contains no `\x1b` and no dangling `[` + digits fragment.

3. **Use a real escape-grammar parser (`strip-ansi-escapes` or `console::strip_ansi_codes`) — never a hand-rolled `ESC\[[0-9;]*m` regex.**
   Rationale: SGR-only regexes miss OSC/DCS entirely and are the documented bypass class (tmux DCS-passthrough smuggling); a real VT-parser state machine (`vte`-backed) handles nesting and all terminator forms (`BEL`, `ST`, `ESC\`).
   VERIFICATION: `cargo tree | grep -E 'strip-ansi-escapes|^console '` shows the dependency is present; grep for any local regex literal matching `\\x1b\[` outside of test fixtures — flag for replacement.

4. **Truncate on grapheme boundaries with measured display width, not `.len()`, `.chars().count()`, or byte slicing.**
   Rationale: byte/char slicing panics on non-boundary offsets or splits combining marks and ZWJ sequences, corrupting both the string and the layout math a TUI depends on for column alignment.
   VERIFICATION: `rg '&\w+\[\.\.\d|\.chars\(\)\.take\(' -g '*.rs'` on any function whose input includes a registry-controlled name/description/tag — each hit should instead call `.graphemes(true)` + `unicode-width`'s `.width()`, or `console::truncate_str`.

5. **Treat bidi override codepoints (U+202A–U+202E, U+2066–U+2069) as forbidden in any runtime string rendered to a terminal, independent of rustc's lints.**
   Rationale: `text_direction_codepoint_in_{comment,literal}` are compile-time, source-literal-only lints; they provide zero coverage for a bidi character arriving inside a deserialized registry response.
   VERIFICATION: the sanitizer function has a unit test asserting a string containing `\u{202E}` is stripped or rejected; `cargo clippy` will *not* catch a missing runtime check here — do not rely on it as evidence of safety.

6. **Never build an OSC 8 hyperlink or OSC 52 clipboard-write sequence by concatenating untrusted text into the URI/payload segment.**
   Rationale: OSC 8's own spec author explicitly declines to provide application-side sanitization guidance and defers all mitigation to the terminal emulator; OSC 52 lets any process that can write to the terminal set the system clipboard (tmux disables it by default for this reason).
   VERIFICATION: grep for `\x1b]8;` and `\x1b]52;` construction sites; each must interpolate only tool-generated (not registry-sourced) values, or must not exist for registry-sourced text at all.

7. **Do not treat "renders through ratatui" as evidence of safety; sanitize before any string reaches a `Cell`, `Span`, `Line`, or widget title/border, exactly as for a raw terminal write.**
   Rationale: `Buffer::set_stringn`'s `char::is_control` filter is real but scoped to that one call path; `Cell::set_symbol()` calls and the backend's `Print(cell.symbol())` write have zero sanitization.
   VERIFICATION: grep TUI code for `.set_symbol(` calls outside `ratatui-core` itself — each must sit downstream of the project's own sanitizer, not rely on ratatui's internal filter. Add a regression test rendering a `Buffer` from a string containing `\x1b[31m` via each custom widget's `render()` and asserting no cell symbol contains `\x1b`.

8. **When forwarding child-process output, choose color-preservation via `anstream`'s TTY detection, but choose sanitization via the child's own trust model — not via "it already has ANSI codes."**
   Rationale: conflating "has ANSI" with "is safe" is the exact reasoning gap that produces pass-through vulnerabilities when the child itself relays untrusted upstream data (e.g. a build tool echoing a remote manifest field).
   VERIFICATION: for every pass-through call site (`std::process::Command` output streamed to stdout), document in a comment which upstream source feeds that child and why it is/isn't trusted; if untrusted, the pass-through must go through the same sanitizer as direct registry text, not a bypass.

9. **Reserve `unicode-security` (UTS #39 confusable/mixed-script detection) for identity-adjacent decisions (name-collision warnings, "did you mean"), not as a terminal sanitizer.**
   Rationale: it solves a different problem (two different byte strings that look identical) than escape injection (one byte string that isn't what it displays as); conflating them leaves one class unaddressed.
   VERIFICATION: grep for `unicode_security` usage; each call site should be near a name/identifier-comparison function, not near a `println!`/render call.

10. **Pin `unicode-width` and `unicode-segmentation` (and any Unicode-table-driven crate) to compatible Unicode-version releases, and re-check after bumping either.**
    Rationale: width and grapheme-boundary decisions must agree with each other, and a version skew can put a boundary a caller trusted as "safe to split here" in a different place than the width crate assumed when it counted columns.
    VERIFICATION: `cargo tree -i unicode-width -i unicode-segmentation` (or check `Cargo.lock`) after any dependency bump; diff the reported Unicode versions.

## AI-agent angle

An LLM writing this code by default reaches for `println!("{}", pkg.name)` or, in a TUI, `Line::from(pkg.description.clone())` — treating any `String` as inherently displayable, because in the training distribution almost all example strings *are* safe. It also reliably reaches for `.chars().take(n)` or direct byte slicing for "truncate to fit the column," which is exactly the pattern that splits escape sequences and grapheme clusters (Findings §5). It will confidently cite "ratatui doesn't write raw bytes, it's a buffer" as a reason sanitization is unnecessary in the TUI — which Findings §8 shows is only true for one call path, not the backend write. And it will treat rustc's bidi lints as coverage for "the Trojan Source thing," missing that those lints never see runtime data (Findings §4).

The smallest mechanical checks that catch each of these without requiring the reviewer to reason about terminal semantics:

- `rg '\{[a-zA-Z_.]*name|\{[a-zA-Z_.]*desc' -g '*.rs' -- --context 2` around any `println!`/`write!`/`Line::from`/`Span::raw` call, then confirm the interpolated value is `SafeDisplay`-typed, not a raw `String` field from a deserialized API response struct.
- `rg '\.chars\(\)\.take\(|&\w+\[\.\.\d' -g '*.rs'` — any hit touching a struct field sourced from `serde`-deserialized registry data is wrong by default.
- `rg 'set_symbol\(' -g '*.rs'` outside of `~/.cargo/registry/**/ratatui*` — every hit is a bypass of ratatui's only filter and needs its own sanitization.
- Ask the agent to name, out loud, which single function is the "only way untrusted text reaches a terminal" in the codebase it just touched — if it names more than one, or can't name any, the render-boundary choke point (rule 1) isn't in place yet.

## Contested / evolving

- **OSC 8 hyperlink safety is explicitly unresolved by its own spec.** The [egmontkob gist](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) takes the position that the feature carries no security burden beyond ordinary web browsing, while simultaneously naming custom-URI-scheme handoff and social-engineering-via-automation as real open risks and pushing all mitigation onto terminal emulators (confirmation dialogs, scheme allowlists) rather than onto applications. There is no consensus sanitization guidance for applications; treat any registry-controlled text destined for an OSC 8 payload as high-risk pending that consensus, not as "the spec says it's fine."
- **No clippy lint exists (as of this research) for bidi/control characters in runtime string data**, only the compile-time source-literal lints (Findings §4). Given the March-2025-era RUSTSEC advisory for `tracing-subscriber` and the 2025–2026 CVE cluster (Findings §2), pressure toward a `clippy::disallowed_methods`-style pattern or a dedicated lint for "unsanitized external string reaches a `Display`/write call" is plausible but not yet landed — this project cannot currently outsource this check to tooling and must enforce it with the structural test in rule 1.
- **The ingest-vs-render boundary debate is trending toward "render-only, ingest is optional defense-in-depth,"** based on how the 2025–2026 fixes above were actually shipped (Oh My Posh's fix explicitly extended an existing render-time filter to more paths rather than adding ingest-time validation; Rails' fix targeted the logger, the render boundary, not the ID's origin). Treat ingest-time rejection (e.g., refusing to cache a package name containing bidi overrides) as a nice-to-have UX improvement, not a substitute for rule 1.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cwe.mitre.org/data/definitions/150.html](https://cwe.mitre.org/data/definitions/150.html) | CWE-150, authoritative weakness definition | v4.20 (current) | Primary framing for the whole problem class; demonstrative example is an LLM-output-to-terminal scenario |
| [cwe.mitre.org/data/definitions/116.html](https://cwe.mitre.org/data/definitions/116.html) | CWE-116, parent weakness | v4.20 (current) | Establishes CWE-150's place in the encoding/escaping hierarchy |
| [trojansource.codes](https://trojansource.codes/) | Original Trojan Source disclosure site | 2021, still current | Primary source for CVE-2021-42574/-42694 mechanics and cross-tool mitigation guidance |
| [nvd.nist.gov/vuln/detail/CVE-2021-42574](https://nvd.nist.gov/vuln/detail/CVE-2021-42574) | NVD CVE record | 2021, DISPUTED status noted | Official description + CVSS 8.3; documents Unicode Consortium's dispute of the framing |
| [nvd.nist.gov/vuln/detail/CVE-2003-0063](https://nvd.nist.gov/vuln/detail/CVE-2003-0063) | NVD CVE record, xterm | 2003, historical but still-live mechanism | Canonical query/response title-reinjection primitive |
| [tenable.com/cve/CVE-2003-0020](https://www.tenable.com/cve/CVE-2003-0020) | CVE record, Apache error log | 2003, historical | Establishes log/error text as the same trust boundary as interactive terminal output |
| [tenable.com/cve/CVE-2019-9535](https://www.tenable.com/cve/CVE-2019-9535) | CVE record, iTerm2 + tmux | 2019 | Highest-severity real-world instance (CVSSv3 9.8) of "printing attacker output" → RCE |
| [blog.mozilla.org/security/2019/10/09/iterm2-critical-issue-moss-audit](https://blog.mozilla.org/security/2019/10/09/iterm2-critical-issue-moss-audit/) | Mozilla MOSS security-audit writeup | 2019 | Primary narrative source for CVE-2019-9535's real-world reachability |
| [doc.rust-lang.org/rustc/lints/listing/deny-by-default.html](https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html) | rustc lint documentation | current (edition 2024 era) | Exact names/scope of `text_direction_codepoint_in_{comment,literal}`; proves compile-time-only scope |
| [docs.rs/strip-ansi-escapes/latest](https://docs.rs/strip-ansi-escapes/latest/strip_ansi_escapes/) | Crate docs, `strip-ansi-escapes` 0.2.x | current | Primary API reference; confirms `vte`-backed real parser |
| [docs.rs/console/latest](https://docs.rs/console/latest/console/) | Crate docs, `console` | current | API for `strip_ansi_codes`/`measure_text_width`/`truncate_str` |
| [github.com/console-rs/console/blob/master/src/ansi.rs](https://github.com/console-rs/console/blob/master/src/ansi.rs) | Source code | current | Verified exact grammar handled (CSI/OSC/DCS + tmux passthrough), not just doc claims |
| [docs.rs/unicode-width/latest](https://docs.rs/unicode-width/latest/unicode_width/) | Crate docs, `unicode-width` | current | UAX #11 width semantics, zero-width handling, ambiguous-width caveat |
| [docs.rs/unicode-segmentation/latest](https://docs.rs/unicode-segmentation/latest/unicode_segmentation/) | Crate docs, `unicode-segmentation` | current | UAX #29 grapheme API used for safe truncation |
| [docs.rs/unicode-security/latest](https://docs.rs/unicode-security/latest/unicode_security/) | Crate docs, `unicode-security` | current | UTS #39 implementation surface (`skeleton`, `MixedScript`) |
| [docs.rs/anstream/latest](https://docs.rs/anstream/latest/anstream/) | Crate docs, `anstream` | current | Clarifies anstream/anstyle solve a UX-adaptation problem, not a sanitization one |
| [github.com/ratatui/ratatui/blob/main/ratatui-core/src/buffer/buffer.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-core/src/buffer/buffer.rs) | Source code, `Buffer::set_stringn` | current (`main`) | Read directly to confirm the `char::is_control` filter and its exact scope |
| [github.com/ratatui/ratatui/blob/main/ratatui-crossterm/src/lib.rs](https://github.com/ratatui/ratatui/blob/main/ratatui-crossterm/src/lib.rs) | Source code, backend draw loop | current (`main`) | Read directly to confirm `Print(cell.symbol())` performs zero sanitization at write time |
| [rustsec.org/advisories/RUSTSEC-2025-0055.html](https://rustsec.org/advisories/RUSTSEC-2025-0055.html) | RustSec advisory, `tracing-subscriber` | September 2025 | Most directly applicable Rust-ecosystem CWE-150 precedent |
| [unicode.org/reports/tr39](https://www.unicode.org/reports/tr39/) | UTS #39 spec | v17.0.0, 2025-09-04 | Authoritative source behind the `unicode-security` crate |
| [gist.github.com/egmontkob/…](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) | OSC 8 spec (canonical, VTE maintainer) | ongoing | Confirms OSC 8's security stance is unresolved and app-side guidance is absent |
| [github.com/tmux/tmux/wiki/Clipboard](https://github.com/tmux/tmux/wiki/Clipboard) | tmux wiki | current | Explains why OSC 52 defaults to restricted mode and the exact risk |
| [github.com/advisories/GHSA-fv2r-r8mp-pg48](https://github.com/advisories/GHSA-fv2r-r8mp-pg48) · [GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) · [GHSA-76r7-hhxj-r776](https://github.com/advisories/GHSA-76r7-hhxj-r776) | GitHub Security Advisories (Soft Serve, Oh My Posh, Rails Active Record) | 2025–2026 | Structurally identical vulnerabilities in tools of the same shape as grim/ocx, all currently active |
