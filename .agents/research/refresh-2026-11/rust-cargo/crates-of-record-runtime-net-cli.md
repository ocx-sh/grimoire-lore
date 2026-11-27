---
title: Crates of record delta - CLI, terminal, async, network, security, credential rows
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 24
---

# Crates of record delta, 2026-08-14 to 2026-11-27

Scope: the CLI, terminal, async, network, security and credential rows of `skills/rust-cargo-reference/crates-of-record.md`. This is a delta against the baseline research, not a re-creation. Every fact below was read from crates.io JSON API responses (fetched 2026-11-27 with a User-Agent header), crate source tarballs on static.crates.io, upstream changelogs and release pages, docs.rs, or rustsec.org. Nothing is from memory.

## Summary

- Two cells are wrong and need new text: the `console` cell (it does read the colour environment variables; this is a correction of a baseline error, not drift in the window) and the `hyper` cell (hyper 1.0 shipped 2023-11-15, not 2025-01).
- Two cells need an addendum, not a reversal: the `rustls` cell (0.24 development releases split providers into separate crates, still pre-release) and the `reqwest` cell (0.13 made rustls plus aws-lc the default).
- Everything else is unchanged or a version bump only. No `ratatui` 0.31 or 1.0 exists. No `keyring` or `keyring-core` decision reversed.
- Six new RustSec advisories fall in the window against rows in scope (tokio, rustls, rustls-webpki, h2). None changes a crate of record. Proposed Sources additions are listed at the end.

## Per-row verdicts

| Row | Verdict |
|---|---|
| CLI parsing (`clap`) | version bump only |
| Completions, man pages | unchanged |
| Terminal styling (`console`, `anstream`/`anstyle`) | anstream/anstyle claim unchanged; console cell is changed (correction) |
| Colour resolution | changed (correction) |
| TUI (`ratatui`) | version bump only |
| Progress (`indicatif`) | unchanged |
| Progress under logging (`tracing-indicatif`) | could not determine the concurrency question; no new release |
| Async runtime (`tokio`, `async-std`) | unchanged; advisories noted |
| HTTP client (`reqwest`, `hyper`) | changed (date correction), plus reqwest TLS note |
| TLS (`rustls`) | unchanged for stable; addendum for 0.24 pre-release |
| OCI registry (`oci-client`) | version bump only |
| Secrets (`secrecy`) | unchanged |
| OS keychain (`keyring-core`, `keyring`) | version bump only |
| HTTP test doubles (`wiremock`, `mockito`) | unchanged |

## Findings

### 1. clap, clap_complete, clap_mangen, clap_complete_nushell

Verdict: unchanged for the Nushell claim; version bump only otherwise.

- crates.io API: `clap` 4.6.10 (2026-11-24), `clap_builder` 4.6.10, `clap_complete` 4.6.12 (2026-11-16), `clap_mangen` 0.3.4 (2026-11-16), `clap_complete_nushell` 4.6.3 (2026-11-16). Source: https://crates.io/api/v1/crates/clap_complete_nushell
- `clap_complete_nushell` is still a separate crate that depends on `clap_complete` ^4.5.51, so "Nushell needs `clap_complete_nushell` separately" holds. Its changelog shows 4.6.3 (2026-11-16) with no entries, and 4.6.2 (2026-08-11) completing `ValueHint::Directory` as a directory. Source: https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete_nushell/CHANGELOG.md
- `anstream`/`anstyle` via `clap_builder`: `clap_builder` 4.6.10 depends on `anstyle` ^1.0.14 unconditionally and on `anstream` ^1.0.0 as an optional dependency (the `color` feature, in clap's default set). The claim holds, with the nuance that `anstream` arrives only while the `color` feature is on. `anstream` is now 1.0.0 (2026-02-11), `anstyle` 1.0.14 (2026-03-13). Source: https://crates.io/api/v1/crates/clap_builder/4.6.10/dependencies

### 2. console and colour resolution

Verdict: changed. This is a correction of a baseline error, verified against the source of console 0.16.0 (2025-06-27) and 0.16.6 (2026-09-10). Both behave the same, so the error predates the window and nothing in the window changed it.

Old text (Colour resolution row): "`console` 0.16 has an independent global switch and reads none of those variables. The application wires them".

New fact: `console` 0.16 does read the environment.
- `src/utils.rs` `default_colors_enabled`: colours on when the terminal supports colour and `CLICOLOR` is not `0`, or when `CLICOLOR_FORCE` is set to anything other than `0`. `CLICOLOR_FORCE` therefore overrides everything, including `NO_COLOR`.
- `src/unix_term.rs` and `src/windows_term/mod.rs` `is_a_color_terminal`: returns false when not a TTY, false when `NO_COLOR` is set at all (set-and-empty also disables, unlike the NO_COLOR spec which ignores an empty value), false when `TERM` is `dumb`.
- 0.16.4 (2026-07-01) added a public `console::is_dumb()` (the `TERM` check), which `indicatif` 0.18.6 now imports.
- The global switch (`console::set_colors_enabled`) still exists and overrides the environment defaults once called.
- `console` 0.16.5 (2026-08-13, OSC/DCS stripping for OSC 8 over tmux) and 0.16.6 (2026-09-10, `truncate_str` fixes) are version bumps only.

Sources: https://static.crates.io/crates/console/console-0.16.0.crate and https://static.crates.io/crates/console/console-0.16.6.crate (unpacked, grep of `CLICOLOR|NO_COLOR|TERM`); https://github.com/console-rs/console/releases (read 2026-11-27).

Replacement text, Terminal styling row, "What changed" cell: "`ansi_term` unmaintained since 2019-09. `anstyle` always arrives transitively via `clap_builder`, and `anstream` with clap's default `color` feature — check before 'adding' them".

Replacement text, Colour resolution row, "What changed" cell: "`console` 0.16 has its own global switch (`set_colors_enabled`) and, at initialisation, reads `CLICOLOR`, `CLICOLOR_FORCE`, any-value `NO_COLOR` and `TERM=dumb`, with `CLICOLOR_FORCE` overriding `NO_COLOR`. An empty `NO_COLOR` disables colour, contrary to the NO_COLOR spec. The application still resolves the chain once, so the spec's precedence and the empty-value rule hold, and then sets the switch explicitly".

If the skill wants to keep the "application wires them" stance, it is still sound as a design rule; only the factual premise ("reads none") must go.

### 3. ratatui

Verdict: version bump only. No 0.31 or 1.0 exists as of 2026-11-27.

- crates.io: max version 0.30.2 (2026-06-19); 0.30.1 on 2026-06-05; 0.30.0 on 2025-12-26 (betas from 2025-10-31). Source: https://crates.io/api/v1/crates/ratatui
- The changelog for 0.30.2 adds a Termina backend crate; no breaking changes beyond those already listed. Source: https://raw.githubusercontent.com/ratatui/ratatui/main/CHANGELOG.md
- The `Alignment` to `HorizontalAlignment` rename is confirmed in `BREAKING-CHANGES.md` (PR #1735). New nuance: a type alias keeps `Alignment` compiling, and the maintainers say they do not expect to remove or deprecate it soon, so the old name is not an error but glob imports of the variants can still break. Source: https://raw.githubusercontent.com/ratatui/ratatui/main/BREAKING-CHANGES.md
- Suggested cell edit: change "`ratatui` 0.30" to "`ratatui` 0.30 (0.30.2 current)" and "0.30 renamed `Alignment` → `HorizontalAlignment`" to "0.30 renamed `Alignment` → `HorizontalAlignment`, keeping an `Alignment` alias". Optional.

### 4. indicatif and tracing-indicatif

indicatif: unchanged. `indicatif` 0.18.6 (2026-07-01). `ProgressDrawTarget::term()` (which `stderr()` builds on) hides the target when `!term.is_term() || is_dumb()`, and its docs say bars are hidden if `TERM` is unset or `dumb`. Source: indicatif-0.18.6 `src/draw_target.rs` lines 76-80, from https://static.crates.io/crates/indicatif/indicatif-0.18.6.crate

tracing-indicatif: could not determine whether open question 8 (the sharded-registry concurrency objection) still holds. Evidence: latest release 0.3.14 on 2025-12-03, before the window, depending on `indicatif` ^0.18.3 and `tracing-subscriber` ^0.3.22. The open-issue list (10 issues, newest 2026-10-05, #34 "Allow temporarily hiding the progress bar") has none about concurrency, deadlock, panic or sharded registry, but an absence of issues does not show the objection resolved, and the source was not reproduced. The decision text in the table is a local decision, so it stays. Sources: https://crates.io/api/v1/crates/tracing-indicatif, https://github.com/emersonford/tracing-indicatif/issues

### 5. tokio and async-std

Verdict: unchanged for the decisions; version bump and advisories.

- `tokio` 1.54.1 (2026-10-21). 1.54.0 (2026-10-19) was yanked. Source: https://crates.io/api/v1/crates/tokio and https://rustsec.org/advisories/RUSTSEC-2026-0384.html
- `async-std` 1.13.2 (2025-08-15), description still "Deprecated in favor of `smol`"; `smol` 2.0.2 (2024-09-07). The quoted description is exact. Source: https://crates.io/api/v1/crates/async-std
- New advisories: RUSTSEC-2026-0384 (2026-10-22, race in `tokio::time::Interval` on the multi-threaded runtime, affects 1.54.0 only, patched 1.54.1); RUSTSEC-2026-0386 (2026-10-23, INFO, `AsyncFd::new` and related constructors violate I/O safety). Source: https://rustsec.org/advisories/ (list read), individual advisory 0384 read in full; 0386 title and date from the list only.

### 6. reqwest and hyper

Verdict: changed (date correction), plus a reqwest TLS note.

- hyper 1.0.0 was published 2023-11-15 (1.0.1 on 2023-11-16); release candidates ran 2022-10-26 to 2023-07-10. The baseline "hyper 1.0 (2025-01)" is wrong. Source: crates.io versions list at https://crates.io/api/v1/crates/hyper. hyper is now 1.13.0 (2026-11-23). The substantive claim (1.0 removed the high-level `Client` and `Server`) is unchanged and consistent with the hyper-util split; I did not re-fetch the 1.0 announcement in this pass, so treat that part as carried over.
- Replacement text, HTTP client row, "What changed": "hyper 1.0 (2023-11) removed the high-level client and server most training data assumes".
- reqwest 0.13.0 (2025-12-30, before the window but newer than the baseline wording) is breaking: `rustls` is now the default TLS backend instead of `native-tls`; the rustls provider defaults to aws-lc instead of `ring`; the feature `rustls-tls` is renamed `rustls`; root-certificate features are removed and `rustls-platform-verifier` is used by default (own roots via `tls_certs_only`); `rustls-no-provider` exists for a different provider; `query` and `form` became opt-in features. In the window: 0.13.4 (TLS 1.3 for native-tls, redirect handling strips sensitive headers on a scheme change) and 0.13.5 (2026-09-08). Source: https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md
- Consequence for the Root certificates row: reqwest 0.13 defaults to the platform verifier, so "bundled roots merged as extra roots" must be written against `rustls-platform-verifier` rather than a roots feature. Suggested addition to the HTTP client "What changed" cell: "reqwest 0.13 defaults to rustls with aws-lc and the platform verifier; its old `rustls-tls` feature is now `rustls`". Reviewers should treat this as unverified against the repo's own manifest.

### 7. rustls

Verdict: unchanged for the stable line; addendum for the 0.24 pre-release.

- Latest stable 0.23.46 (release page dated 14 Oct 2026; crates.io `max_stable_version` 0.23.46). Its default features still contain `aws_lc_rs`, and `ring` is an opt-in feature, so "default moved `ring` → `aws-lc-rs`" still describes stable. Pluggable providers date from 0.23.0, 2024-02-29. Sources: https://crates.io/api/v1/crates/rustls, https://github.com/rustls/rustls/releases
- 0.24.0-dev.0 (2026-01-28) through dev.3 (2026-11-12) exist. In dev.3 the `rustls` crate has no `aws_lc_rs` or `ring` features and its default features are `std`, `tracing`, `webpki`. New crates `rustls-aws-lc-rs` and `rustls-ring`, both 0.24.0-dev.3 (2026-11-12), carry the providers. This is a pre-release, not stable, so the decision does not change yet. It will matter at 0.24 stable, when "one explicit provider" becomes mandatory rather than a default. Sources: https://crates.io/api/v1/crates/rustls (features of 0.24.0-dev.3), https://crates.io/api/v1/crates?q=rustls-aws-lc-rs. No 0.24 release notes were found on the GitHub releases page or the CHANGELOG stub, so the plan is inferred from the manifests only.
- Suggested addendum for the TLS row: "At 0.24 (pre-release as of 2026-11) the providers move to `rustls-aws-lc-rs` and `rustls-ring` crates and the `rustls` crate stops selecting one".
- New advisories, all fixed by 0.23.46 or later: RUSTSEC-2026-0346 (2026-10-14, MEDIUM, `Debug` on client session values exposes TLS secrets, patched >=0.23.46, read in full), and RUSTSEC-2026-0347, 0348, 0349 (2026-10-14, LOW; ECH rejection data leak, Brotli decompression up to 1 GiB, ServerHello downgrade to classical key exchange; titles from the list only). RUSTSEC-2026-0382 (2026-10-20, `rustls-webpki` accepts distrusted emSign intermediates, patched 0.103.16 and 0.104.0-alpha.8; read in full). Related, not in the table: RUSTSEC-2026-0381 `webpki-roots`, RUSTSEC-2026-0383 `webpki-root-certs` (2026-10-20). Source: https://rustsec.org/advisories/
- Transport advisory: RUSTSEC-2026-0258 (2026-08-18, `h2` unbounded empty DATA frames, patched >=0.4.16, low). Read in full.

### 8. oci-client and secrecy

- `oci-client`: version bump only. 0.15.0 (2025-05-15), 0.16.0 (2026-01-27), 0.16.1 (2026-03-05), 0.17.0 (2026-05-19), 0.18.0 (2026-09-18). Repository https://github.com/oras-project/rust-oci-client. Its features `rustls-tls` map to `reqwest/rustls` and `rustls-tls-no-provider` to `reqwest/rustls-no-provider`. The rename claim is unchanged. Source: https://crates.io/api/v1/crates/oci-client and the 0.18.0 `Cargo.toml` from https://static.crates.io/crates/oci-client/oci-client-0.18.0.crate. The CHANGELOG was not available, so the content of 0.16 to 0.18 is not summarised. 0.x minor bumps are breaking under semver.
- `secrecy`: unchanged. Latest 0.10.3, last updated 2024-10-09, before the baseline. No newer major. I did not re-read the docs.rs `SecretString` page in this pass, so "SecretString API unchanged" rests on the absence of any release since 2024-10-09. Source: https://crates.io/api/v1/crates/secrecy

### 9. keyring and keyring-core

Verdict: version bump only; the decision stands.

- `keyring-core`: 1.0.0 (2026-04-21, no code changes, tells keyring 3.x users to move to it), 1.0.1 (2026-10-13, tests and CI only), 1.1.0 (2026-11-20, additive: `Entry::new_in_store`, `new_in_store_with_modifiers`, `new_in_named_store`, `new_in_named_store_with_modifiers`, `add_named_store`, `drop_named_store`). No breaking change flagged. Source: https://github.com/open-source-cooperative/keyring-core/releases
- `keyring`: 4.1.6 (2026-08-01) is superseded by 4.2.0 (2026-08-29). Its docs show `keyring-core` ^1.0.0 as a regular dependency, a default `v1` feature giving the old v1-style API, a `cli` feature, and optional store crates as separate dependencies (`db-keystore`, `dbus-secret-service-keyring-store`, `zbus-secret-service-keyring-store`, `apple-native-keyring-store`, `android-native-keyring-store`, `linux-keyutils-keyring-store`, `windows-native-keyring-store`). The docs and README both say applications wanting control should depend on `keyring-core` plus the store crates they need. So "keyring 4.x is a compat wrapper, backends ship as separate crates" holds. Sources: https://docs.rs/keyring/4.2.0/keyring/, https://github.com/open-source-cooperative/keyring-rs, https://crates.io/api/v1/crates/keyring. What changed in 4.2.0 itself could not be determined (no changelog found).
- Suggested cell edit: "`keyring-core` 1.x (1.1.0 current)" in place of "1.0".

### 10. wiremock and mockito

Unchanged. `wiremock` 0.6.5 (2025-08-24, no release in the window); `mockito` 1.7.2 (2026-02-02). No advisory. The "async-only and Tokio-native" characterisation of wiremock was not re-verified in this pass. Source: https://crates.io/api/v1/crates/wiremock, https://crates.io/api/v1/crates/mockito

## Normative guidance candidates

1. Rule: the Colour resolution row must state that `console` reads `CLICOLOR`, `CLICOLOR_FORCE`, `NO_COLOR` and `TERM=dumb` itself. Rationale: the "reads none" premise is false in 0.16.0 through 0.16.6, and an agent trusting it would double-wire the variables or skip testing the real precedence. Verification: `grep -rn -E 'CLICOLOR|NO_COLOR|"TERM"' ~/.cargo/registry/src/*/console-0.16.*/src` shows the reads; a test that sets `NO_COLOR=1 CLICOLOR_FORCE=1` and asserts the application's chosen outcome.
2. Rule: dates in the table are re-checked against the crates.io `versions[].created_at` field, never recalled. Rationale: the hyper 1.0 date was wrong by about 14 months. Verification: `curl -sSL -A dep-check https://crates.io/api/v1/crates/hyper | jq -r '.versions[]|select(.num=="1.0.0")|.created_at'` prints `2023-11-15T...`.
3. Rule: a project on `reqwest` >= 0.13 names the rustls feature as `rustls`, not `rustls-tls`, and a project that also links `oci-client` checks its `rustls-tls` mapping. Rationale: the feature rename is breaking in 0.13. Verification: `cargo tree -e features -i reqwest` and `grep -n 'rustls-tls' Cargo.toml` (hits on a reqwest 0.13 dependency are the finding).
4. Rule: pin `tokio` to `>=1.54.1`. Rationale: 1.54.0 is yanked and vulnerable to RUSTSEC-2026-0384. Verification: `cargo deny check advisories`, or `grep -A1 'name = "tokio"' Cargo.lock`.
5. Rule: pin `rustls` to `>=0.23.46` and `rustls-webpki` to `>=0.103.16`. Rationale: RUSTSEC-2026-0346 and RUSTSEC-2026-0382. Verification: `cargo deny check advisories`.

## AI-agent angle

- An agent reading the old table will wire `NO_COLOR` itself on top of `console` and believe `console` ignores it; the failure is a double-handling bug, not a compile error. Catch: the unit test in candidate 1.
- An agent will write "hyper 1.0 (2025-01)" or reason that hyper 0.14 is current for code dated before 2025. Catch: candidate 2.
- An agent trained before reqwest 0.13 emits `features = ["rustls-tls"]` and expects `native-tls` default semantics. Catch: `cargo check` fails on the unknown feature, and `cargo tree -e features`.
- An agent seeing `rustls = "0.24.0-dev.3"` in a search result may adopt a pre-release. Catch: `grep -n -E 'rustls.*dev' Cargo.toml` returns nothing.

## Contested / evolving

- rustls 0.24: provider split into separate crates; pre-release as of 2026-11-12, no stable date known. Trend: explicit provider choice becomes mandatory.
- reqwest default TLS stack: rustls plus aws-lc plus platform verifier since 2025-12-30; stable.
- tracing-indicatif concurrency: no evidence either way; maintainer activity is visible only through issues.
- keyring: store crates are separate, and keyring-core 1.1.0 adds runtime named stores (2026-11-20); trending away from the compat wrapper for application use.

## Proposed Sources-line additions

- RUSTSEC-2026-0384 (tokio `Interval` race, 1.54.0 only)
- RUSTSEC-2026-0346 (rustls session `Debug` leak)
- RUSTSEC-2026-0382 (rustls-webpki distrusted emSign intermediates)
- RUSTSEC-2026-0258 (h2 empty DATA frames), optional because hyper depends on `h2`
- No new bullet is needed for 0347 to 0349 or 0386 unless the family wants a complete rustls list.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://crates.io/api/v1/crates/clap, clap_builder, clap_complete, clap_mangen, clap_complete_nushell | crates.io JSON API | read 2026-11-27 | versions and dates |
| https://crates.io/api/v1/crates/clap_builder/4.6.10/dependencies | dependency list | 2026-11-24 | anstream/anstyle claim |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete_nushell/CHANGELOG.md | changelog | 2026-11-16 | nushell crate state |
| https://crates.io/api/v1/crates/console | crates.io API | 2026-09-10 | versions |
| https://static.crates.io/crates/console/console-0.16.0.crate, console-0.16.6.crate | source tarballs | 2025-06-27, 2026-09-10 | env var reads |
| https://github.com/console-rs/console/releases | release notes | 2025-12 to 2026-09 | 0.16.2 to 0.16.6 |
| https://crates.io/api/v1/crates/ratatui | crates.io API | 2026-06-19 | no 0.31 or 1.0 |
| https://raw.githubusercontent.com/ratatui/ratatui/main/CHANGELOG.md, BREAKING-CHANGES.md | changelog, migration | 2026-06-19 | rename and alias |
| https://static.crates.io/crates/indicatif/indicatif-0.18.6.crate | source | 2026-07-01 | non-TTY hiding |
| https://crates.io/api/v1/crates/tracing-indicatif | crates.io API | 2025-12-03 | no new release |
| https://github.com/emersonford/tracing-indicatif/issues | issue list | to 2026-10-05 | open question 8 |
| https://crates.io/api/v1/crates/tokio, async-std, smol | crates.io API | 2026-10-21, 2025-08-15 | runtime state |
| https://crates.io/api/v1/crates/hyper, reqwest | crates.io API | 2023-11-15, 2026-09-08 | hyper 1.0 date |
| https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md | changelog | 2025-12-30 to 2026-09-08 | 0.13 breaking changes |
| https://crates.io/api/v1/crates/rustls | crates.io API incl. features | 2026-11-12 | 0.23 defaults, 0.24 dev |
| https://github.com/rustls/rustls/releases | release page | to 2026-10-14 | latest stable |
| https://crates.io/api/v1/crates?q=rustls-aws-lc-rs | search | 2026-11-12 | provider crates |
| https://crates.io/api/v1/crates/oci-client, secrecy, wiremock, mockito | crates.io API | various | versions |
| https://static.crates.io/crates/oci-client/oci-client-0.18.0.crate | source | 2026-09-18 | feature mapping |
| https://github.com/open-source-cooperative/keyring-core/releases | release notes | 2026-04 to 2026-11 | keyring-core 1.x |
| https://docs.rs/keyring/4.2.0/keyring/ and https://github.com/open-source-cooperative/keyring-rs | docs, README | 2026-08-29 | wrapper and stores |
| https://crates.io/api/v1/crates/keyring, keyring-core | crates.io API | 2026-08-29, 2026-11-20 | versions |
| https://rustsec.org/advisories/ and individual pages 0384, 0346, 0382, 0258 | advisory database | 2026-08-18 to 2026-11-25 | new advisories |
