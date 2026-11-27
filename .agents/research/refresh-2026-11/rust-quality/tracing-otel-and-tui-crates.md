---
title: Tracing, OpenTelemetry and TUI crates drift for docs-and-tracing.md, tui.md and security.md (delta)
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 21
---

# Tracing, OpenTelemetry and TUI crates, 2026-08-14 to 2026-11-27

This is a delta update. Anything not listed as changed stays as it is. Release dates come from the crates.io API (https://crates.io/api/v1/crates/<name>), GitHub release Atom feeds and the changelogs named under each verdict. Where I read a changelog but not the docs page that carries the claim, I say so. "Unchanged" means: no release or changelog entry in the window touches the claim. It does not mean I re-proved the claim from the docs.

## Headline

Almost nothing moved in the window. The whole tracing family, ratatui, crossterm, human-panic and tracing-indicatif shipped no release between 2026-08-14 and 2026-11-27. Four things did move or were found stale:

1. **OpenTelemetry semantic conventions v1.45.0 (2026-08-04)** is the only conventions release in the window. It restored `AWSAccessKeyId` and `Signature` to the default sensitive query-parameter list used when redacting `url.full`. None of the field names OBS-20 pins changed.
2. **opentelemetry-rust 0.33.0 (2026-09-18) and 0.33.1 (2026-10-08).** Still pre-1.0. Traces API and SDK are "Beta". 0.33.1 has a breaking `TraceState` validation change.
3. **vergen 10.0.3 (2026-08-24), 10.0.4 (2026-11-19) and 10.1.0 (2026-11-25).** Major 10 first shipped 2026-06-08, before the baseline. Release content not readable, so "could not determine" for API changes.
4. **unicode-width 0.2.3 (2026-10-28).** The corpus claim "`unicode-width` is scalar-value width" is imprecise, and has been since 0.2.0 (2024-09-19). `str::width()` is sequence-aware. This is a stale claim, not an in-window change.

Also found stale (before the window, still wrong in the corpus): `tracing-subscriber` has escaped ESC and other control bytes in the default formatters since 0.3.20 (2025-08-29).

## Version table

| Crate | Latest on 2026-08-14 | Latest on 2026-11-27 | Note |
|---|---|---|---|
| tracing | 0.1.44 (2025-12-18) | 0.1.44 | No release in window. |
| tracing-core | 0.1.36 (2025-12-18) | 0.1.36 | No release in window. |
| tracing-subscriber | 0.3.23 (2026-03-13) | 0.3.23 | No release in window. |
| tracing-appender | 0.2.5 (2026-04-17) | 0.2.5 | No release in window. |
| tracing-log | 0.2.0 (2023-10-25) | 0.2.0 | No release in window. |
| tracing-test | 0.2.6 (2026-02-07) | 0.2.6 | No release in window. |
| tracing-indicatif | 0.3.14 (2025-12-03) | 0.3.14 | No release in window. |
| tracing-opentelemetry | 0.33.0 (2026-05-18) | 0.34.0 (2026-09-23) | Release content not fetched: could not determine. |
| opentelemetry | 0.32.0 (2026-05-08) | 0.33.1 (2026-10-09 on crates.io; the changelog says 2026-Oct-08) | Not 1.0. |
| human-panic | 2.0.8 (2026-04-02) | 2.0.8 | No release in window. |
| vergen | 10.0.2 (2026-08-03) | 10.1.0 (2026-11-25) | Changelog not at the repository paths I tried (404): could not determine. |
| ratatui | 0.30.2 (2026-06-19) | 0.30.2 | No release in window. Corpus freeze "0.30.2" is still current. |
| crossterm | 0.29.0 (2025-04-05) | 0.29.0 | No release in window. `Unreleased` section holds breaking changes (see TUI-05 below). |
| unicode-width | 0.2.2 (2025-10-06) | 0.2.3 (2026-10-28) | Release notes empty. Could not determine the content of 0.2.3. |
| unicode-segmentation | 1.13.3 (2026-06-01) | 1.13.3 | No release in window. Its changelog path 404ed, so no content read. |
| semantic-conventions | v1.44.0 (2026-07-03) | v1.45.0 (2026-08-04) | Only release in window. |

## Observability claims (docs-and-tracing.md)

**OBS-03 `Span::enter` across `.await`; OBS-04 eager `fields(...)`; OBS-11 JSON "documents no schema stability".** Unchanged. Neither `tracing` nor `tracing-subscriber` has a release after 2026-03-13. The 0.3.23 entry is a single fix (ANSI sanitization can be disabled), and the `tracing` 0.1.44 changelog head is dated 2025-12-18. I did not re-read the docs pages for these three claims. Sources: https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing-subscriber/CHANGELOG.md and https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing/CHANGELOG.md.

**SEC-31 and OBS-10 "`tracing-subscriber` passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal".** Unchanged in the window, but the sentence is incomplete and invites a wrong inference.
- Old text: "`tracing-subscriber` passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal (CWE-150)".
- Current fact: since 0.3.20 (2025-08-29, PR https://github.com/tokio-rs/tracing/pull/3368) the default and pretty formatters escape message content and error `Display` content. On main, `tracing-subscriber/src/fmt/format/escape.rs` escapes ESC, BEL, BS, FF, DEL and the C1 range U+0080 to U+009F. It does not touch `\n`, `\r`, NUL or Cf bidi characters, so the claim as written is still true. 0.3.23 (2026-03-13, https://github.com/tokio-rs/tracing/pull/3484) added `with_ansi_sanitization` to turn the escaping off, default on. Source: https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing-subscriber/src/fmt/format/escape.rs. I read main, not the 0.3.23 tag.
- Both dates fall before the window. Recommended rewording is below under candidates.

**OBS-12 "opentelemetry-rust own docs warn of ongoing breaking changes". Has it reached 1.0?** Not 1.0. Current is 0.33.1 (2026-10-08). The README status table (https://raw.githubusercontent.com/open-telemetry/opentelemetry-rust/main/README.md) lists Logs and Metrics as Stable, Context and Propagators as Beta, Baggage as RC, and Traces API, Traces SDK and Traces OTLP exporter as Beta. 0.33.1 carries a "**Breaking**" `TraceState` validation change and 0.33.0 added experimental feature-gated APIs. Verdict: the "ongoing breaking changes" intent holds. I did not find that exact wording in the README, so if a rule quotes it, quote it as paraphrase. Changelog: https://raw.githubusercontent.com/open-telemetry/opentelemetry-rust/main/opentelemetry/CHANGELOG.md. Unreleased `vNext` also holds another **Breaking** item (baggage wire-format processing moved to `opentelemetry-sdk`).

**OBS-20 field names `error.type`, `url.full`, `server.address`, `http.response.status_code`, `http.request.resend_count`, `oci.manifest.digest`; "OCI concepts OTel has not standardized".** Unchanged for all six names. Checked against v1.45.0 (2026-08-04): `url.full` is Stable; `http.request.resend_count` is Stable and "Recommended if and only if request was retried"; `error.type` is still used with the same SHOULD wording on HTTP spans. v1.45.0 has no OCI registry or `oci.*` entry. Its only "OCI" hit in the changelog is the older `oracle_cloud.realm` (Oracle Cloud Infrastructure, unrelated, added before the window). The claim "OTel has not standardized OCI concepts" stands. Note that v1.45.0 renamed `rpc.response.status_code` to `rpc.status_code` and made RPC spans stable; the corpus does not pin those. Sources: https://raw.githubusercontent.com/open-telemetry/semantic-conventions/main/CHANGELOG.md, https://raw.githubusercontent.com/open-telemetry/semantic-conventions/v1.45.0/docs/http/http-spans.md and the registry page .../docs/registry/attributes/url.md at the same tag. I did not separately open the registry pages for `http.response.status_code`, `server.address` or `error.type`, and the v1.45.0 changelog section has no entry that touches them.

**OBS-22 "OTel makes a credential-free `url.full` a MUST".** Unchanged, with one in-window addition. The spec text is "`url.full` MUST NOT contain credentials passed via URL in form of `https://username:password@www.example.com/`" (http-spans.md and url.md at v1.45.0). In-window change (v1.45.0, 2026-08-04, issue https://github.com/open-telemetry/semantic-conventions/issues/3989): "`url`: Restore `AWSAccessKeyId` and `Signature` to the default list of sensitive query parameter keys." The same pages list `X-Amz-Credential` among sensitive query keys. Query-string redaction in the spec is a SHOULD with a default key list, which OBS-22 should not present as a MUST. If OBS-22 enumerates the default sensitive keys, it should add `AWSAccessKeyId` and `Signature`. I did not check whether OBS-22 enumerates them.

**OBS-06 `WorkerGuard`, OBS-14 `tracing_log::LogTracer::init()`, OBS-16 `tracing_test::traced_test`, OBS-13 `human_panic::setup_panic!()`, OBS-24 `tracing-indicatif`, OBS-25 `max_level_*` features.** Unchanged. `tracing-appender` 0.2.5 (2026-04-17), `tracing-log` 0.2.0, `tracing-test` 0.2.6, `human-panic` 2.0.8 and `tracing-indicatif` 0.3.14 all predate the window, and `tracing` has no release after 2025-12-18. No API rename evidence. I did not open per-crate docs.

**OBS-15 vergen.** Could not determine. Three releases in the window (10.0.3, 10.0.4, 10.1.0) and I could not read their notes: the changelog is not at `vergen/CHANGELOG.md` or `CHANGELOG.md` on the `master` branch of https://github.com/rustyhorde/vergen (both 404). If OBS-15 shows a vergen API or a `vergen` major, re-check against the crate docs.

**Agent-failure item 17 "`RUST_LOG`'s `{field=value}` ... matches *spans* only".** Unchanged by changelog evidence: no `EnvFilter` change in 0.3.23 or any later release. Not re-read from the docs.

## TUI claims (tui.md, security.md)

**"ratatui explicitly declines to pick among TEA, Component and Flux"; "`insta` is ratatui's official recipe".** Could not determine from the sources I fetched, because I did not open the ratatui.rs recipes pages. ratatui has no release in the window, so any change would be a docs-only edit. Re-fetch https://ratatui.rs/ before changing either sentence.

**TUI-08 hand-rolled take-hook/restore shape.** Unchanged; check the rule's wording. `ratatui::init` installs the hook itself: "A panic hook is installed that restores the terminal before panicking", and the docs say to call `init` after installing any other hook so restoration runs first (https://docs.rs/ratatui/0.30.2/ratatui/fn.init.html). `try_init` is the fallible variant. This helper is not new in the window (0.30.2 is 2026-06-19). If TUI-08 presents the hand-rolled `take_hook` + `restore` pattern as the default, it is the older shape. The helper only covers the default hook; a custom hook must still be chained.

**TUI-19 "crossterm emits Press *and* Release per keypress on Windows only".** Unchanged by release evidence (no crossterm release in window; 0.29.0 is 2025-04-05). Not re-verified against docs.

**TUI-05 `EventStream`.** Unchanged in a released version. Unreleased crossterm main, per https://raw.githubusercontent.com/crossterm-rs/crossterm/master/CHANGELOG.md, queues breaking changes for the next release: MSRV 1.63 to 1.85, `IsTty` removed (use `std::io::IsTerminal`), the `libc` and `derive-more` features removed, `Event` no longer `Copy` and `#[non_exhaustive]`, and `KeyCode`, `MediaKeyCode`, `ModifierKeyCode`, `MouseEventKind`, `MouseButton`, `KeyEvent` and `MouseEvent` all `#[non_exhaustive]`. Any rule or example that matches on `Event`, `KeyCode` or builds `KeyEvent { .. }` by struct literal needs a wildcard arm or `KeyEvent::new` on the next crossterm bump. Not a window event: nothing is released. I did not check whether `EventStream` itself changed in that unreleased list.

**TUI-24 "ratatui has no minimum-size API"; `WidgetRef` gated behind `unstable-widget-ref`; SEC-38 `Buffer::set_stringn` / `Cell::set_symbol`.** Unchanged for released 0.30.2. The unreleased v0.31.0 section of https://raw.githubusercontent.com/ratatui/ratatui/main/BREAKING-CHANGES.md still gates `WidgetRef` and `FrameExt` behind `unstable-widget-ref`, and a grep of that file finds no minimum-size API, no `set_stringn` or `set_symbol` change and no `EventStream` mention. That is a keyword grep of unreleased notes, not a read of the API docs, so the "no minimum-size API" and SEC-38 verdicts rest on the absence of any changelog entry.

**Unreleased ratatui 0.31.0 (not released, no date).** BREAKING-CHANGES.md on main lists, among others: `Flex::SpaceBetween` with a single item preserves fixed-size constraints, the `Scrollbar` thumb reaches the end of the track, `Backend` gains default `save_cursor_position` and `restore_cursor_position`, the calendar widget moves from `time` to `jiff` dates, and `Widget` is implemented for `&Box<W>` with `WidgetRef` for `Box<W>`. None contradicts a pinned claim. Do not pin 0.31 until it ships.

**TUI-15 and SEC-36 "`unicode-width` is scalar-value width".** Changed; the claim was already wrong at the baseline.
- Old text (tui.md TUI-15): "`unicode-width` is scalar-value width: `chars().count()` measures a CJK name at half its rendered width and can cut a combining sequence in half."
- New fact: since 0.2.0 (2024-09-19) the docs state that `str` width follows sequence rules first: `"\r\n"` is width 1; ZWJ, modifier and emoji-presentation sequences are width 2; some variation-selector, Arabic, Hebrew, Khmer and other ligature sequences are treated as units; otherwise width is the sum of char widths. Source: https://docs.rs/unicode-width/0.2.3/unicode_width/ ("Rules for determining width"). The README still warns that complex scripts such as Devanagari may not match rendered width, and that `\n` is width 1 since 0.2.0 (https://raw.githubusercontent.com/unicode-rs/unicode-width/master/README.md).
- In-window release 0.2.3 (2026-10-28): GitHub release page has no notes and the crate changelog path 404ed, so I could not determine its content. Source for date: crates.io API.
- The recipe (walk grapheme clusters with `unicode-segmentation`, sum per-cluster width) is still sound. The misleading part is the gloss. `UnicodeWidthChar::width` is per scalar value; `UnicodeWidthStr::width` is sequence-aware. Summing `str::width` per grapheme cluster is correct, and calling `char::width` per char is the defective form. Also note TUI-15's reviewing-a-diff.md counterpart line 239 says only "computed with `unicode-width` rather than `len()`" and needs no change.

## Rules whose grep needle names a renamed or removed API

None found in the window. Candidates to watch on the next bump, not renamed yet:
- crossterm `IsTty` trait (removed on unreleased main). Any needle for `IsTty` in the pair goes stale at the next crossterm release.
- crossterm `Event` and `KeyEvent` struct-literal patterns (becoming `#[non_exhaustive]`).
- In semantic-conventions v1.45.0 the renamed attributes are `rpc.response.status_code` to `rpc.status_code`, `messaging.system` to `messaging.system.name`, `system.device` to `system.device.name`, `db.client.connection.max` to `db.client.connection.limit` and the faas invocation attributes. I did not find any of these in the claim list, but a grep over the pair for those names would confirm. I did not run that grep.

## Normative candidates

1. **Reword the `tracing-subscriber` sanitization sentence in SEC-31 and OBS-10.**
   - Rationale: the current sentence implies no sanitization exists; since 0.3.20 ESC, BEL, BS, FF, DEL and C1 are escaped by default, and a reviewer who sees ESC escaped may wrongly conclude the log path is safe. `\n`, `\r`, NUL and Cf bidi still pass.
   - Proposed text: "`tracing-subscriber` (0.3.20 and later) escapes ESC, BEL, BS, FF, DEL and C1 controls by default, but still passes `\n`, `\r`, NUL and the `Cf` bidi set straight through, so the SEC-34 sanitizer remains mandatory."
   - Verification: grep `escape.rs` in the pinned `tracing-subscriber` tag for the match arms (`git clone` the tag, `rg "'\\\\x1b'" tracing-subscriber/src/fmt/format/escape.rs`), and a unit test that logs `"a\nb‮"` and asserts the bytes on the writer. I did not run this test.
2. **Fix the `unicode-width` gloss in TUI-15 (and the matching phrase in SEC-36 if present).**
   - Rationale: the "scalar-value width" claim is false for `str::width()` since 0.2.0 and makes agents distrust the correct tool.
   - Proposed text: "`UnicodeWidthChar::width` is per scalar value; `UnicodeWidthStr::width` applies the crate's sequence rules (`\r\n`, ZWJ and emoji sequences, some ligatures). It is not a font-accurate width, so still truncate by grapheme cluster."
   - Verification: a test asserting `"👨‍👩‍👧".width() == 2` while the same string's per-char width sum is larger (`s.chars().filter_map(UnicodeWidthChar::width).sum::<usize>() > 2`). I did not run it.
3. **Add `AWSAccessKeyId` and `Signature` to any OBS-22 list of sensitive query keys, and state the key list is a SHOULD (default list), the credential-free userinfo rule a MUST NOT.**
   - Rationale: v1.45.0 restored these defaults (issue 3989).
   - Verification: re-read the OBS-22 text for its enumerated key list; `rg -n "X-Amz|Signature|AWSAccessKeyId" skills/rust-quality-reference/docs-and-tracing.md`.
4. **Note in tui.md that `ratatui::init`/`restore` install the panic hook, and demote TUI-08's hand-rolled shape to "only when a custom hook must chain".**
   - Rationale: the helper has been available since before 0.30.2 and removes a class of mis-ordered-hook defects.
   - Verification: `rg -n "take_hook" skills/rust-quality-reference/tui.md`, then confirm each hit is justified by a custom hook.
5. **Add a one-line forward warning for the next crossterm release** (`Event`, `KeyCode`, `KeyEvent` `#[non_exhaustive]`; `IsTty` removed; MSRV 1.85). Rationale: it is a hard break for any example matching exhaustively. Verification: after the bump, `cargo check` on the examples and `rg -n "IsTty|KeyEvent \{" skills/`. Only worth writing if the pair pins crossterm examples.

## Sources fetched

1. https://crates.io/api/v1/crates/ for tracing, tracing-subscriber, tracing-core, tracing-appender, tracing-log, tracing-test, human-panic, vergen, tracing-indicatif, opentelemetry, tracing-opentelemetry, ratatui, crossterm, unicode-width, unicode-segmentation (counted as one source)
2. https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing-subscriber/CHANGELOG.md
3. https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing/CHANGELOG.md
4. https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing-subscriber/src/fmt/format/escape.rs
5. https://github.com/tokio-rs/tracing/pull/3368
6. https://github.com/tokio-rs/tracing/releases.atom
7. https://raw.githubusercontent.com/open-telemetry/opentelemetry-rust/main/opentelemetry/CHANGELOG.md
8. https://raw.githubusercontent.com/open-telemetry/opentelemetry-rust/main/README.md
9. https://github.com/open-telemetry/opentelemetry-rust/releases.atom
10. https://raw.githubusercontent.com/open-telemetry/semantic-conventions/main/CHANGELOG.md
11. https://github.com/open-telemetry/semantic-conventions/releases.atom
12. https://raw.githubusercontent.com/open-telemetry/semantic-conventions/v1.45.0/docs/registry/attributes/url.md
13. https://raw.githubusercontent.com/open-telemetry/semantic-conventions/v1.45.0/docs/http/http-spans.md
14. https://raw.githubusercontent.com/ratatui/ratatui/main/CHANGELOG.md
15. https://raw.githubusercontent.com/ratatui/ratatui/main/BREAKING-CHANGES.md
16. https://docs.rs/ratatui/0.30.2/ratatui/fn.init.html
17. https://raw.githubusercontent.com/crossterm-rs/crossterm/master/CHANGELOG.md
18. https://docs.rs/unicode-width/0.2.3/unicode_width/
19. https://raw.githubusercontent.com/unicode-rs/unicode-width/master/README.md
20. https://github.com/unicode-rs/unicode-width/releases/tag/v0.2.3 (empty notes)
21. https://github.com/ratatui/ratatui/releases.atom and https://github.com/crossterm-rs/crossterm/releases.atom

Not fetched or failed: ratatui.rs recipes pages (not opened), vergen changelog (404 at both tried paths), unicode-segmentation and unicode-width CHANGELOG.md (404), tracing-opentelemetry 0.34.0 notes (not opened), GitHub REST API (rate limited).
