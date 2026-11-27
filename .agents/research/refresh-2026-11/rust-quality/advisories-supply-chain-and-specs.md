---
title: Advisories, supply-chain tooling, sanitizer crates and OCI specs drift for rust-quality (delta)
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 21
---

# Advisories, supply chain and specs, 2026-08-14 to 2026-11-27

This is a delta update of the existing rust-quality research. Anything not listed as "changed" below is unchanged since the baseline. Events dated 2026-08-01 or later were treated as in-window.

Method and limits. The RustSec advisory database was cloned (shallow, HEAD dated 2026-11-26) and every advisory file for the pair's crates was read directly. The GitHub Advisory Database API was rate-limited, so only the first page of the web listing was read (it showed only the three zip advisories GHSA-9hj8-73fh-9963, GHSA-hjqx-j4rw-g7xv and GHSA-8hxf-qr8p-62x4, all dated 2026-10-29). RustSec carries the GHSA aliases for every advisory below, so the GHSA gap is judged small but is not closed. Version dates come from the crates.io API.

## Summary of verdicts

| Claim | Verdict |
|---|---|
| SEC-07 `zip >= 2.3.0` | CHANGED. Raise to `zip >= 9.0.5`. Seven new RUSTSEC zip advisories are patched only in 9.0.0, one in 9.0.5. |
| SEC-07 `tar >= 0.4.45`, PKG-12 | Unchanged. No new tar advisory in the window. Latest tar is 0.4.46 (2026-05-18, before the window). |
| Other crates (advisory sweep) | CHANGED for tokio, rustls, h2 and rustls-webpki (new floors below). No hit for reqwest, hyper, aws-lc-rs, flate2, tempfile, ratatui, crossterm, tracing-subscriber, strip-ansi-escapes, vte, console, anstream, cap-std, secrecy. |
| SEC-25 `unsound = "all"`, `unmaintained = "workspace"`, `[sources]` keys, `[[bans.deny]]` | Unchanged and still valid. Default of `unmaintained` changed to `workspace`. New keys exist. |
| "cargo deny check is the single gate; cargo audit survives only as cargo audit bin" | Unchanged. cargo-audit 0.23.0 did not alter `bin` (could not determine beyond the release notes). |
| SEC-29 cargo-auditable, Artifact Attestations, `gh attestation verify` | Unchanged. Doc now names `actions/attest@v4`. |
| security.md open question 2 (sigstore-rs) | Unchanged. Still 0.x (0.15.1, 2026-11-22), no 1.0. |
| SEC-34, TUI-14 sanitizer coverage | Unchanged for strip-ansi-escapes and vte. Changed for `console`. unicode-security still has no bidi coverage. |
| SEC-40 `anstream::StripStream` | Unchanged. |
| SEC-06, TEST-21 Miri | Unchanged in substance, one nuance. |
| OCI claims | Unchanged. No new release of either spec. Two main-branch clarifications noted. ghcr.io conditional PUT: could not determine. |

## Findings

### 1. zip floor, SEC-07 (changed)

Old text: "Pin explicit version floors `tar >= 0.4.45` and `zip >= 2.3.0`". The 2.3.0 floor comes from [RUSTSEC-2025-0168](https://github.com/rustsec/advisory-db/blob/main/crates/zip/RUSTSEC-2025-0168.md), alias GHSA-94vh-gphv-8pm8 and CVE-2025-29787, still patched at `>= 2.3.0`.

New fact: eight further RustSec zip advisories were published between 2026-10-09 and 2026-10-22 (read in the advisory-db clone, `crates/zip/`). Each is patched at `>= 9.0.0`, except RUSTSEC-2026-0548 at `>= 9.0.5`. zip 9.0.0 was released 2026-10-09 and 9.0.5 on 2026-10-17 (crates.io API). zip 9.0.0 follows 9.0.0-pre1 to pre3 (2026-05 to 2026-08).

| Advisory | Aliases | Date | Class | Patched |
|---|---|---|---|---|
| RUSTSEC-2026-0367 | GHSA-vv5m-jxxh-4627 | 2026-10-09 | SUID/SGID bits preserved on extract | >= 9.0.0 |
| RUSTSEC-2026-0368 | GHSA-4v9h-p7m9-rh26 | 2026-10-09 | `extract` creates symlinks with targets outside the destination (9.0.0-pre2) | >= 9.0.0 |
| RUSTSEC-2026-0369 | GHSA-4684-h2q9-2vcp | 2026-10-10 | `ZipStreamReader::extract`/`ZipArchive::extract` apply permissions through symlinks | >= 9.0.0 |
| RUSTSEC-2026-0429 | CVE-2026-115909, GHSA-q7v9-x93c-xqv3 | 2026-10-22 | `extract` aborts on a symlink entry with a huge declared size (alloc abort, not a panic) | >= 9.0.0 |
| RUSTSEC-2026-0545 | CVE-2026-115906, GHSA-8hxf-qr8p-62x4 | 2026-10-22 | AES entry HMAC not checked on early EOF or empty data | >= 9.0.0 (affects `aes-crypto`) |
| RUSTSEC-2026-0546 | CVE-2026-115908, GHSA-hjqx-j4rw-g7xv | 2026-10-22 | `extract` writes outside destination via absolute or chained symlinks (unaffected below 7.2.0) | >= 9.0.0 |
| RUSTSEC-2026-0547 | CVE-2026-115907, GHSA-9hj8-73fh-9963 | 2026-10-22 | legacy Shrink/Reduce/Implode decoders preallocate declared size (`legacy-zip` feature only) | >= 9.0.0 |
| RUSTSEC-2026-0548 | CVE-2026-115905, GHSA-m665-v7pm-7grj | 2026-10-17 | `ZipStreamReader` extracts under local-header names that differ from the central directory | >= 9.0.5, and needs opt-in `enforce_header_consistency(true)` |

Consequence for the existing SEC-07 rationale ("symlink-driven escapes in their documented-safe entry points"): it is now stronger, since RUSTSEC-2026-0546 is a second escape in `ZipArchive::extract`, the documented-safe entry. The migration cost from 2.x to 9.x is a major API move; whether the public API the pair's patterns use (`ZipArchive`, `enclosed_name`, `extract`) changed shape in 9.0.0 could not be determined from the sources read.

### 2. tar floor, SEC-07 and PKG-12 (unchanged)

`crates/tar/` in the advisory database holds only RUSTSEC-2018-0002, RUSTSEC-2021-0080, [RUSTSEC-2026-0067](https://github.com/rustsec/advisory-db/blob/main/crates/tar/RUSTSEC-2026-0067.md) and [RUSTSEC-2026-0068](https://github.com/rustsec/advisory-db/blob/main/crates/tar/RUSTSEC-2026-0068.md) (both dated 2026-03-19, patched `>= 0.4.45`). No tar advisory dated 2026-08-01 or later. Neither floor is raised. Related, not named by the pair: [RUSTSEC-2026-0440](https://github.com/rustsec/advisory-db/blob/main/crates/astral-tokio-tar/RUSTSEC-2026-0440.md) (2026-11-03) marks `astral-tokio-tar` unmaintained (all versions); Astral points to `tar-codec`. Relevant only if an adopting codebase uses it.

### 3. Advisory sweep of the named crates (changed for four)

All dates are advisory dates in the RustSec files.

| Crate | Advisory | Date | Patched | Effect on this pair |
|---|---|---|---|---|
| tokio | [RUSTSEC-2026-0384](https://github.com/rustsec/advisory-db/blob/main/crates/tokio/RUSTSEC-2026-0384.md), GHSA-5wjr-9356-4wc8 | 2026-10-21 | `>= 1.54.1`, unaffected `< 1.54.0` | Use-after-free race in `tokio::time::Interval` on 1.54.0, which was yanked. Do not pin 1.54.0. |
| tokio | [RUSTSEC-2026-0386](https://github.com/rustsec/advisory-db/blob/main/crates/tokio/RUSTSEC-2026-0386.md) (informational unsound) | 2026-10-13 | `>= 1.51.6, < 1.52.0` or `>= 1.53.3` | `AsyncFd::new`, `with_interest`, `try_new`, `try_with_interest` violate I/O safety. Deprecated in favour of the `unsafe` `AsyncFd::register`. Triggers `unsound = "all"` for direct users. |
| h2 | [RUSTSEC-2026-0258](https://github.com/rustsec/advisory-db/blob/main/crates/h2/RUSTSEC-2026-0258.md), GHSA-q83h-524g-xf6h | 2026-08-17 | `>= 0.4.16` | Unbounded empty DATA frames (hyper's HTTP/2 dependency, so reachable through reqwest). |
| rustls | [RUSTSEC-2026-0285](https://github.com/rustsec/advisory-db/blob/main/crates/rustls/RUSTSEC-2026-0285.md) | 2026-09-14 | `>= 0.23.45` | TLS 1.3 handshake messages accepted across encryption levels. |
| rustls | RUSTSEC-2026-0346, -0347, -0348, -0349 | 2026-10-14 | `>= 0.23.46` | `Debug` leaks of session secrets (0346), ECH-rejection data leak (0347), Brotli cert decompression 1 GiB alloc, `brotli` feature only (0348), unauthenticated ServerHello downgrade to classical key exchange (0349). |
| rustls-webpki | [RUSTSEC-2026-0382](https://github.com/rustsec/advisory-db/blob/main/crates/rustls-webpki/RUSTSEC-2026-0382.md) | 2026-10-20 | `>= 0.103.16` (or `>= 0.104.0-alpha.8`) | Accepts distrusted emSign intermediates. |
| zip | see finding 1 | 2026-10 | `>= 9.0.5` | see finding 1 |
| reqwest, hyper, aws-lc-rs, flate2, tempfile, ratatui, crossterm, tracing-subscriber, strip-ansi-escapes, vte, console, anstream, cap-std, secrecy, tar | none dated 2026-08-01 or later | | | No change. (aws-lc-sys files were only modified, not newly issued.) |

Current latest versions on 2026-11-27 (crates.io): tokio 1.54.1, hyper 1.13.0, reqwest 0.13.5, rustls 0.23.46, aws-lc-rs 1.19.0, flate2 1.1.11, cap-std 4.0.3, console 0.16.6, zip 9.8.2.

### 4. cargo-deny keys (SEC-25, EVO-12)

Source: [cargo-deny CHANGELOG](https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md) and the [advisories](https://embarkstudios.github.io/cargo-deny/checks/advisories/cfg.html), [sources](https://embarkstudios.github.io/cargo-deny/checks/sources/cfg.html) and [bans](https://embarkstudios.github.io/cargo-deny/checks/bans/cfg.html) config pages. cargo-deny is now 0.22.1 (2026-11-24).

- `unsound = "all"` unchanged and valid. The config page still documents `all | workspace | transitive | none`, with `workspace` as the default. The page also carries a stale line "unsound - Removed, all unsound advisories now emit errors"; that refers to the old v1 boolean and sits under the legacy-fields note, not the current enum. No changelog entry removes the enum.
- `unmaintained = "workspace"` unchanged and valid. 0.22.0 (2026-11-19, PR 924) changed the default from `all` to `workspace`, so the explicit key is now equal to the default. The rule text "gating unmaintained as hard as unsound produces noise" fits this direction.
- 0.22.1 (2026-11-24, PR 929) fixed `unsound`/`unmaintained` scoping when a workspace has several versions of a crate. Before 0.22.1 a later semver could be silently suppressed. Floor the tool at 0.22.1.
- `[sources] unknown-registry = "deny"` and `unknown-git = "deny"` unchanged. The documented defaults are `unknown-registry = "allow"` and `unknown-git = "deny"`, so the explicit `unknown-registry = "deny"` remains necessary.
- `[[bans.deny]]` unchanged. The `deny` array with `crate`, `wrappers`, `deny-multiple-versions` and `reason` is still documented.
- New keys the rule could adopt (0.21.0, 2026-11-16, PR 904): `advisories.ignore-expiry` (duration such as `"P90D"` or an absolute date), `advisories.ignore.expiry` per entry, and `advisories.ignore.allow` (restricts which crates may depend on the ignored crate). 0.22.1 (PR 934) adds `advisories.patched`, which warns or errors when an ignored advisory has a semver-compatible patch. 0.22.0 (PR 923) adds the `advisory-withdrawn` diagnostic.
- Deprecated: `advisories.git-fetch-with-cli` (0.21.0, PR 903; no effect since PR 830). 0.20.0 (2026-07-09, PR 881) refactored the CLI and removed several deprecated flags; the full list was not read (could not determine). `cargo deny check` itself remains.
- Config is now also searched under `.config` (0.21.0, PR 899).

### 5. cargo audit and cargo-auditable (SEC-29, pinned decision)

- cargo-audit 0.23.0 (2026-11-10, [release notes](https://github.com/rustsec/rustsec/releases/tag/cargo-audit%2Fv0.23.0)) adds an `update-db` subcommand, suggestions of unaffected newer versions, JSON reporting of `--deny`-promoted warnings, drops the abscissa dependency, and carries one breaking fix: the `advisory-db..lock` file name had an extra dot. It does not mention `cargo audit bin`. The pinned decision (`cargo deny check` single gate, `cargo audit bin` for artifacts) is unchanged.
- cargo-auditable 0.7.8 (2026-11-25, [CHANGELOG](https://github.com/rust-secure-code/cargo-auditable/blob/master/cargo-auditable/CHANGELOG.md)) fixes audit data not embedding on Windows with Rust 1.100 or later in large projects (argfile) and writes format revision 2 when proc-macro test targets are excluded. `cargo auditable build` unchanged. For SEC-29, floor `cargo-auditable >= 0.7.8` is worth stating for Windows builds.
- GitHub Artifact Attestations ([docs](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)): `gh attestation verify PATH -R ORG/REPO` and `gh attestation verify oci://ghcr.io/ORG/IMAGE:tag -R ORG/REPO` unchanged. The page generates attestations with `actions/attest@v4` and needs `id-token: write`, `contents: read`, `attestations: write`. The page does not mention `actions/attest-build-provenance` or any deprecation (could not determine whether the older action is retired).

### 6. sigstore-rs (security.md open question 2)

Unchanged. Latest is 0.15.1 (2026-11-22, [releases](https://github.com/sigstore/sigstore-rs/releases)); 0.15.0 (2026-11-05) and 0.14.0 (2026-05-22) both carry breaking changes. The [README](https://github.com/sigstore/sigstore-rs/blob/main/README.md) says "This crate is under active development and will not be considered stable until the 1.0 release." The README does not use the word "experimental"; the existing text "self-declared experimental and API-unstable" is a paraphrase, so rewording to "not stable until 1.0" is more exact. No 1.0 exists.

### 7. Sanitizer crates (SEC-34, TUI-14, SEC-40)

- `strip-ansi-escapes`: latest still 0.2.1 (2025-01-14). `vte`: latest 0.15.0 (2025-02-02); unreleased main adds `Parser::is_idle` ([CHANGELOG](https://github.com/alacritty/vte/blob/master/CHANGELOG.md)). Nothing in the window. The claim that it misses bidi and zero-width classes stands.
- `console`: 0.16.4 (2026-07-01), 0.16.5 (13 Aug, GitHub release "Strips OSC and DCS escape sequences, so features like OSC 8 hyperlinks work over tmux", PR 280), 0.16.6 (2026-09-10: `truncate_str` no longer panics when cutting a multi-byte character, tail measured in visible columns, faster ASCII width) ([releases](https://github.com/console-rs/console/releases)). Version 0.16.5 is not listed on crates.io (versions list jumps from 0.16.4 to 0.16.6), so the OSC/DCS stripping reaches users through 0.16.6. The notes do not mention bidi or zero-width characters, so SEC-34's "then drop bidi and zero-width" remains a separate step even with `console::strip_ansi_codes`. Floor candidate: `console >= 0.16.6` for any use of `truncate_str` on untrusted text (the panic fix is a robustness fix on attacker-supplied strings).
- `anstream`: 1.0.0 released 2026-02-11 (before the window; [CHANGELOG](https://github.com/rust-cli/anstyle/blob/main/crates/anstream/CHANGELOG.md) lists no content). Nothing in the window. The `StripStream` claim is unchanged; its behaviour was not re-tested here.
- `unicode-security`: 0.1.3 published 2026-11-02 (crates.io). The GitHub releases page has no notes, and the [docs.rs 0.1.3 page](https://docs.rs/unicode-security/0.1.3/unicode_security/) lists only `confusable_detection`, `general_security_profile`, `mixed_script`, `restriction_level` and `GeneralSecurityProfile`. No bidi-control coverage. Answer to the TUI open question: it does not cover bidi overrides or isolates; it implements UTS #39 identifier and confusable checks.

### 8. Miri (SEC-06, TEST-21)

[Miri README](https://github.com/rust-lang/miri/blob/master/README.md): it "has no access to most platform-specific APIs or FFI", networking is unsupported, basic file system access works, and unsupported calls stop with "can't call foreign function". Nuance: the experimental, unsound `-Zmiri-native-lib` flag (Unix only) can call native functions via FFI. "Cannot execute syscalls or FFI" remains right as a default and for review heuristics; add "without the experimental `-Zmiri-native-lib` flag" if the text must be exact. The README does not carry a date, so whether the flag changed in the window could not be determined.

### 9. OCI specs

Neither spec has a new release. distribution-spec latest tag is v1.1.1 (2025-01-29); image-spec latest is v1.1.1 (2025-03-03) (read from `git for-each-ref` on bare clones). Main-branch commits in the window:

- distribution-spec PR 619 (merged 2026-08-27, commit 4f7750b): `<blob-push-location>` is no longer required to be a UUID path; it MAY be served by another host; the `PUT` finalisation URL "MUST match exactly the `<blob-push-location>` obtained from the `POST`" and "MUST NOT be assembled manually" (previously SHOULD / SHOULD NOT). Registries MUST support concurrent uploads. This is unreleased main text, not a tagged release.
- image-spec PR 1336 (merged 2026-10-22): `ImageID` in `config.md` is demoted to a historical reference and the spec "no longer defines how implementations create this value".
- Claims checked against main: `descriptor.md` still says "`[A-F]` MUST NOT be used here" for sha256, sha512 and blake3 (DATA-DIG-02 unchanged). `spec.md` still says an out-of-order chunk "MUST" get `416 Requested Range Not Satisfiable` (PKG-17 unchanged), and still offers `GET` on the location for status after a 416. No `descriptor.md` change in the window, so SEC-19 size-before-hash is unchanged. `spec.md` contains no request-ID header (OBS-23 unchanged), and no `If-Match`/`If-None-Match`/`412` text.
- ghcr.io conditional manifest PUT: could not determine. A web search found no GHCR documentation on conditional headers for manifest PUT, and the spec text does not define one. Only a live test (PUT with `If-None-Match: *` against an existing tag, look for `412`) would settle it; it was not run.

## Normative guidance candidates

1. Raise the zip floor in SEC-07 to `zip >= 9.0.5` and cite RUSTSEC-2026-0367, -0368, -0369, -0429, -0545, -0546, -0547 and -0548 next to RUSTSEC-2025-0168 / GHSA-94vh-gphv-8pm8. Rationale: eight advisories since 2026-10-09 patch extraction escapes, SUID preservation and parser differentials; 9.0.5 is the first release fixing all of them. Verification: `cargo tree -i zip` shows >= 9.0.5; `cargo deny check advisories` clean. Keep `tar >= 0.4.45`.
2. Add to SEC-07 or SEC-09: when reading untrusted zip archives with `ZipStreamReader`, enable `enforce_header_consistency(true)` (`ZipReadOptions::enforce_header_consistency(true)`), and never inspect with `ZipArchive` then extract with `ZipStreamReader`. Rationale: RUSTSEC-2026-0548 is a parser differential, the same class as PKG-12. Verification: grep for `ZipStreamReader` and require the option at the same call site.
3. Add a runtime-floor rule or table row: `tokio >= 1.54.1` (never 1.54.0, yanked), `rustls >= 0.23.46`, `rustls-webpki >= 0.103.16`, `h2 >= 0.4.16`. Rationale: RUSTSEC-2026-0384, -0346 to -0349, -0382, -0258. Verification: `cargo tree -i tokio -i rustls -i rustls-webpki -i h2` and `cargo deny check advisories`.
4. Add to async or security guidance: do not construct `tokio::io::unix::AsyncFd` with the safe constructors (`new`, `with_interest`, `try_new`, `try_with_interest`); use the `unsafe` `register` constructors with an ownership comment, and make sure `tokio` is `>= 1.53.3` (or `>= 1.51.6, < 1.52.0`). Rationale: RUSTSEC-2026-0386 is informational unsound, and `unsound = "all"` will flag it. Verification: grep `AsyncFd::(new|with_interest|try_new|try_with_interest)`.
5. SEC-25: state the cargo-deny floor `>= 0.22.1` (scoping fix for `unsound` and `unmaintained`), keep `unsound = "all"` and `unmaintained = "workspace"`, and add `ignore-expiry` (for example `"P90D"`) plus `[advisories] patched = "deny"` so a stale ignore that has a compatible patch fails. Rationale: the existing text already requires a machine-checkable removal condition on every ignore; these keys are that condition. Verification: `cargo deny check advisories`; grep `[advisories]` for `ignore-expiry` and every `ignore` entry for `expiry` or a `reason`. Drop any use of `git-fetch-with-cli`.
6. SEC-29: add `cargo-auditable >= 0.7.8` for Windows builds and name `actions/attest@v4` with the three permissions. Verification: `cargo audit bin <artifact>` returns dependency data on a Windows artifact.
7. SEC-34: keep the second step (drop bidi and zero-width after VT stripping) and note `console >= 0.16.6` when `console::strip_ansi_codes` or `truncate_str` is used on registry text. Verification: the existing table-driven corpus, including OSC 8 and DCS passthrough cases, run against the pinned `console` version.
8. security.md open question 2: change the wording to "sigstore-rs states it is not stable until 1.0; latest 0.15.1 (2026-11-22) still ships breaking changes". TUI open question: record "`unicode-security` does not cover bidi controls; it covers UTS #39 confusables, mixed-script and restriction levels."
9. PKG-17 (optional): the distribution-spec main text now says the upload `Location` MUST be used as returned; add "use the `Location` returned by the previous response verbatim for the next `PATCH` and the final `PUT`, resolving it against the registry URL but never rebuilding it from a UUID". Verification: grep for format strings that build `/blobs/uploads/{uuid}`. This tracks unreleased main text, so mark it SHOULD.

## AI-agent angle

- An agent copying `zip = "2.3"` from the old rule or from training data will pass the old floor. Mechanical check: `cargo tree -i zip` against 9.0.5, and a `deny.toml` advisory run.
- Agents reach for `AsyncFd::new` from older tokio examples. The deprecation warning appears on `tokio >= 1.53.3`; `cargo clippy -- -D warnings` (which denies deprecated) catches it.
- Agents write `unmaintained = "all"` or `"transitive"` from older docs. The default is now `workspace`; grep `deny.toml`.
- Agents treat `console::strip_ansi_codes` as sufficient. It leaves bidi and zero-width codepoints; the SEC-34 corpus with `U+202E` and `U+2066` catches it.

## Contested / evolving

- The zip 9.x series is moving fast (9.8.2 on 2026-11-23, six releases between 2026-11-19 and 2026-11-23). The floor is 9.0.5; whether to require a later minor is not decided by any advisory.
- cargo-deny moved three minor versions in two weeks of November (0.21.0, 0.22.0, 0.22.1). The `ignore-expiry` and `patched` keys are new and may change shape; treat them as SHOULD.
- Distribution-spec `blob-push-location` text is on main and unreleased; the next tagged release may change it.
- GHSA coverage here is partial (rate limit); a re-run of the GitHub advisory listing for the named crates would close it.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/rustsec/advisory-db (cloned, `crates/zip`, `crates/tar`, `crates/tokio`, `crates/rustls`, `crates/rustls-webpki`, `crates/h2`, `crates/astral-tokio-tar`) | RustSec advisory files (primary) | HEAD 2026-11-26 | Source of every advisory ID, date and patched range above |
| https://github.com/advisories?query=ecosystem%3Arust+type%3Areviewed+published%3A%3E2026-08-01 | GitHub Advisory Database listing, first page only | 2026-11-27 | Confirms the three zip GHSA IDs, no hit for other crates on that page |
| https://crates.io/api/v1/crates/zip/versions (and tokio, rustls, console, sigstore, cargo-deny, cargo-audit, cargo-auditable, unicode-security, others) | Version and publish dates | 2026-11-27 | Release dates for 9.0.0, 9.0.5, tokio 1.54.1, console 0.16.6 |
| https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md | cargo-deny changelog (primary) | 0.20.0 to 0.22.1, 2026-07 to 2026-11 | Default change, new keys, deprecation |
| https://embarkstudios.github.io/cargo-deny/checks/advisories/cfg.html | advisories config reference | current | `unsound`, `unmaintained`, `ignore-expiry`, `patched` |
| https://embarkstudios.github.io/cargo-deny/checks/sources/cfg.html | sources config reference | current | `unknown-registry` / `unknown-git` defaults |
| https://embarkstudios.github.io/cargo-deny/checks/bans/cfg.html | bans config reference | current | `[[bans.deny]]` shape |
| https://github.com/rustsec/rustsec/releases/tag/cargo-audit%2Fv0.23.0 | cargo-audit 0.23.0 release notes (primary) | 2026-11-10 | `update-db`, lock-file name fix |
| https://github.com/rust-secure-code/cargo-auditable/blob/master/cargo-auditable/CHANGELOG.md | cargo-auditable changelog (primary) | 0.7.5 to 0.7.8, 2026 | Windows argfile fix |
| https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations | GitHub attestation how-to (primary) | current | `actions/attest@v4`, `gh attestation verify` forms |
| https://github.com/sigstore/sigstore-rs/releases | sigstore-rs releases (primary) | 0.14.0 to 0.15.1 | No 1.0, breaking changes continue |
| https://github.com/sigstore/sigstore-rs/blob/main/README.md | sigstore-rs README (primary) | current | "not stable until the 1.0 release" |
| https://github.com/console-rs/console/releases | console release notes (primary) | 0.16.4 to 0.16.6, 2026-07 to 2026-09 | OSC/DCS stripping, `truncate_str` fix |
| https://github.com/rust-cli/anstyle/blob/main/crates/anstream/CHANGELOG.md | anstream changelog (primary) | 1.0.0 2026-02-11 | No in-window change |
| https://github.com/alacritty/vte/blob/master/CHANGELOG.md | vte changelog (primary) | 0.15.0 | No in-window release |
| https://docs.rs/unicode-security/0.1.3/unicode_security/ | unicode-security API docs | 0.1.3, 2026-11-02 | No bidi API |
| https://github.com/rust-lang/miri/blob/master/README.md | Miri README (primary) | current | FFI and syscall limits, `-Zmiri-native-lib` |
| https://github.com/opencontainers/distribution-spec (bare clone, tags and `git log`) | distribution-spec history (primary) | to 2026-08-31 | No release; blob-push-location commit |
| https://github.com/opencontainers/image-spec (bare clone, tags and `git log`) | image-spec history (primary) | to 2026-10-22 | No release; ImageID commit; `descriptor.md` digest rule |
| https://github.com/opencontainers/distribution-spec/releases and https://github.com/opencontainers/image-spec/releases | spec release pages | current | Confirms v1.1.1 is latest for both |
