---
title: Churn crates drift for current-apis.md and neighbours (delta)
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 18
---

# Churn crates drift, 2026-08-14 to 2026-11-27

This is a delta update. Version dates come from the crates.io API (https://crates.io/api/v1/crates/<name>). Release content comes from each crate's changelog or GitHub releases page. Where a source did not give a detail, the claim is marked "could not determine".

## Version table

| Crate | Latest on 2026-08-14 | Latest on 2026-11-27 | Next major out? |
|---|---|---|---|
| rand | 0.10.2 (2026-07-02) | 0.10.4 (2026-11-15) | No. No 0.11. Parallel 0.8.8 (2026-08-25) and 0.9.5 (2026-07-11) are backports. |
| thiserror | 2.0.19 (2026-07-18) | 2.0.21 (2026-09-23) | No thiserror 3. |
| anyhow | 1.0.104 (2026-07-18) | 1.0.105 (2026-11-23) | No. |
| clap | 4.6.6 (2026-08-06) | 4.6.10 (2026-11-24) | No. A 5.0.0 section exists in the changelog, dated TBD, behind the `unstable-v5` feature. |
| syn | 3.0.3 (2026-07-22) | 3.0.10 (2026-11-09) | **syn 3 is already the current major**, first released 2026-07-18 (pre-baseline). The corpus still names syn 2. |
| reqwest | 0.13.4 (2026-05-25) | 0.13.5 (2026-09-08) | No 0.14. |
| rustls | 0.23.43 (2026-07-29) | 0.23.46 (2026-10-14); 0.24.0-dev.3 (2026-11-12) pre-release only | 0.24 not stable. |
| aws-lc-rs | 1.18.0 (2026-08-07) | 1.19.0 (2026-10-28) | No. Release content not fetched: could not determine. |
| secrecy | 0.10.3 (2024-10-09) | 0.10.3 | No change in window. |

## Per-crate release detail in the window

**rand.** 0.10.3 (2026-09-20): `WeightedIndex` returns `Error::Overflow` instead of panicking on an infinite weight sum. 0.10.4 (2026-11-15): fixes a panic when sampling a deserialized `Uniform<Duration>`. No renames, removals or default-feature changes. 0.10.2 (2026-07-02, pre-window) fixed a possible memory-safety issue in `UniformChar` deserialization. Source: https://github.com/rust-random/rand/blob/master/CHANGELOG.md

**thiserror.** 2.0.19 (2026-07-18) bumped its syn dependency to 3. 2.0.20 (2026-08-08) suppressed a `redundant_field_names` clippy lint in generated code. 2.0.21 (2026-09-23) fixed parsing of generic unit variants in display expressions. No API change. Source: https://github.com/dtolnay/thiserror/releases

**clap.** 4.6.4 (2026-07-21): internal move to syn 3. 4.6.6 (2026-08-06): adds `Command::get_overridden_usage`. 4.6.7 (2026-09-14): adds `#[command(defer = <bool>)]`, opt-in lazy subcommand initialization. 4.6.8 to 4.6.10 (Nov): performance and lint fixes. MSRV is 1.85 since 4.6.0 (2026-03-12). No rename or removal. Source: https://raw.githubusercontent.com/clap-rs/clap/master/CHANGELOG.md

**syn 3.** Releases 3.0.4 to 3.0.10 in the window are fixes and small additions (`Punctuated::retain` in 3.0.9, `safe fn` in `ForeignItemFn` in 3.0.4). The breaking changes were in 3.0.0 (2026-07-18), per https://github.com/dtolnay/syn/releases/tag/3.0.0:
- `Type::BareFn` renamed `Type::FnPtr`; `BareVariadic` renamed `FnPtrVariadic`; `BareFnArg` renamed `NamedArg`.
- `Type::Ptr` `const_token` and `mutability` merged into a `PointerMutability` enum.
- `Arm::guard` removed; replaced by a `Pat::Guard` variant.
- `Signature::unsafety` replaced by a `Safety` enum.
- `Expr::Closure` `or1_token` and `or2_token` renamed `inputs_begin` and `inputs_end`.
- `LitInt` and `LitFloat` no longer implement `From<proc_macro2::Literal>`; use `Lit::new`.
- `StrStyle` deleted. `Punctuated::pop` now drops trailing punctuation; `pop_pair` keeps the old behavior.
- `Lifetime` parse rejects keyword lifetimes; `Lifetime::parse_any` accepts them.
- Ten new non-exhaustive `*Modifiers` structs.
MSRV and feature-flag changes: could not determine (not on the page).

**reqwest.** 0.13.5 (2026-09-08): adds `Error::is_dns()`, TLS version in `TlsInfo`, and the `hickory-dns` feature uses the `Ipv6AndIpv4` strategy. No change to TLS backend, provider, defaults or timeouts. The changelog carries no dates; dates come from crates.io. Source: https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md

**rustls.** 0.23.44 (2026-09-07): ML-DSA certificate support enabled by default in the aws-lc-rs provider; `KeyLogFile` files owner-only. 0.23.45 (2026-09-14): security fix GHSA-2mjx-qc3c-rqvc, TLS 1.3 handshake messages accepted across encryption-level boundaries, affects 0.23.13 to 0.23.44. 0.23.46 (2026-10-14): security hardening, including session `Debug` output exposing secrets and ECH-rejection data leak. No default-provider change. 0.24.0-dev pre-releases exist; no notes found (the CHANGELOG file is a stub pointing to GitHub releases). Source: https://github.com/rustls/rustls/releases

## Claims at risk

**rand rows (lines 37-41).** Unchanged. 0.9 renames and 0.10 renames match the changelog exactly (`thread_rng`->`rng`, `gen*`->`random*`, `Standard`->`StandardUniform`, `distributions`->`distr`, `SliceRandom` split; 0.10.0 2026-02-08: `Rng`->`RngExt`, `OsRng`->`SysRng`, `os_rng`->`sys_rng`). No 0.11, no third rename wave. Wording nit, optional: the row's "`rand_core` renamed `RngCore`->`Rng`" is not stated in the rand changelog entry; I did not fetch rand_core, so "could not determine". Two additions from the 0.10.0 changelog the corpus does not carry: `choose_multiple` -> `sample` (also `_array`, `_weighted`, and `IteratorRandom::choose_multiple_fill` -> `sample_fill`), and `SeedableRng::from_os_rng` removed, `small_rng` feature removed (it was default-on in 0.9). Candidate row below.

**thiserror 2 rows and EVO-14.** Unchanged. No thiserror 3; 2.0.19 to 2.0.21 carry no API change. (The direct-dependency and `{r#type}` facts date from 2.0.0 and were not re-read from the 2.0.0 release page in this pass.)

**clap 4 row.** Unchanged. 4.6.10 is current; 5.0 is unreleased and gated behind `unstable-v5`.

**syn 2 row (line 46). CHANGED.** Old text: `syn 2 attr.parse_nested_meta(…), attr.meta | syn 2`. New fact: syn 3.0.0 shipped 2026-07-18 and is the current major; 3.0.10 is latest. `parse_nested_meta` and `attr.meta` are not listed among the 3.0.0 breaking changes, so the syn 2 attribute-walking advice appears to carry over, but this was not verified against the syn 3 docs ("could not determine"). Clap and thiserror have already moved to syn 3. Source: https://github.com/dtolnay/syn/releases/tag/3.0.0

**reqwest rows (lines 47-50).** Unchanged for 0.13.0 content, confirmed by the 0.13.0 changelog: `rustls` replaces `native-tls` as default; feature `rustls-tls` renamed `rustls`; rustls roots features removed in favour of `rustls-platform-verifier`; default provider aws-lc; `rustls-no-provider` exists; `query` and `form` opt-in. Two details differ from the corpus wording and need care:
1. The docs.rs 0.13.5 feature page lists default features as `http2`, `default-tls`, `charset`, `system-proxy`. The corpus says "`rustls` is the default backend"; that is true via `default-tls` selecting rustls, but the feature the pin uses is named `rustls`. The row is still correct.
2. "No `rustls-tls-ring` feature on 0.13": the docs.rs feature list shows only `rustls`, `rustls-no-provider` and `native-tls*` families, consistent with the claim. Source: https://docs.rs/reqwest/0.13.5/reqwest/index.html

**Pinned decisions paragraph, EVO-10.** Unchanged. No source shows the default provider leaving aws-lc-rs. `default-features = false, features = ["rustls"]` is still the documented shape. Verdict: the TLS pin text is still correct. `install_default()` at-most-once is not mentioned in the rustls release notes; "could not determine" from this window, and nothing there contradicts it.

**SEC-15 (`danger_accept_invalid_certs`). CHANGED (pre-window, newly noticed).** docs.rs 0.13.5 marks the unprefixed `ClientBuilder::danger_accept_invalid_certs` deprecated in favour of `tls_danger_accept_invalid_certs()` (0.13.0 soft-deprecated the old TLS method names). The SEC-15 grep must cover both spellings. Source: https://docs.rs/reqwest/0.13.5/reqwest/struct.ClientBuilder.html

**SEC-16.** Unchanged for `timeout`: docs.rs 0.13.5 says default no timeout. `connect_timeout` default was not captured: could not determine.

**SEC-18.** Partly confirmed: `ClientBuilder::dns_resolver<R: IntoResolve>` exists in 0.13.5. The trait path `reqwest::dns::Resolve` was not re-verified: could not determine.

**PKG-14, PKG-15.** Unchanged. `pool_max_idle_per_host` default is no limit (`usize::MAX`); `read_timeout` exists, resets after each successful read, default none.

**SEC-33, API-02, API-03, ERR-17 (secrecy).** Unchanged, and the open question is answered: secrecy has no release since 0.10.3 (2024-10-09). docs.rs for 0.10.3 lists `SecretBox`, `SecretString`, `SecretSlice`, `ExposeSecret`, `ExposeSecretMut`, `CloneableSecret`, `SerializableSecret`, and no `Secret<T>`. Pin to secrecy 0.10; `Secret<T>` is the pre-0.10 name. The iqlusioninc changelog fetch returned HTTP 503, so the exact release that removed `Secret<T>` is "could not determine". Source: https://docs.rs/secrecy/latest/secrecy/

**EVO-9 high-churn list.** Candidate: add `syn` (a major landed 2026-07-18 and reshaped `Type`, `Arm`, `Signature`, `Lit*` types) and `getrandom`-style sub-crates are out of scope. Do not add `clap`: only a gated 5.0 exists.

## Exact edits proposed

1. current-apis.md line 46, replace the syn row with: ``| `syn::Meta`/`NestedMeta` attribute walking, `syn::export` | syn 2+ `attr.parse_nested_meta(…)`, `attr.meta` (syn 3, 2026-07-18, renames `Type::BareFn`->`FnPtr`, drops `Arm::guard`, `Signature::unsafety`->`Safety`; read the pinned version's docs) | syn 2 / syn 3 | proc-macro crate that will not build against the pinned syn |``
2. Add a row: ``| `choose_multiple`, `choose_multiple_array`, `choose_multiple_weighted`, `SeedableRng::from_os_rng`, the `small_rng` default | `sample`, `sample_array`, `sample_weighted`, `sys_rng`-based seeding (`from_os_rng` removed), `small_rng` feature removed | **rand 0.10**, Feb 2026 | method not found on `IndexedRandom` |``
3. EVO-9: change the list to (`rand`, `thiserror`, `reqwest`, `rustls`, `clap`, `syn`).
4. SEC-15: extend the grep to `-e 'danger_accept_invalid_certs' -e 'tls_danger_accept_invalid_certs'`. Rationale: the 0.13 API deprecates the old name; a check for one spelling misses the other. Verification: `git grep -n -e danger_accept_invalid -- '*.rs'` returns nothing.
5. Add a date stamp "verified 2026-11-27" to the rand rows. Rationale: the corpus's own warning that rand renamed twice in 13 months. Verification: `grep -n 'rand 0.10' current-apis.md` shows the stamp.
6. Secrecy rows: state the pinned major as "secrecy 0.10". Verification: `grep -n '^name = "secrecy"' -A1 Cargo.lock` shows 0.10.x.

## Not covered

rand_core rename details, 2.0.0 thiserror release text re-read, aws-lc-rs release notes, rustls 0.24 content, reqwest `connect_timeout` default and `dns::Resolve` trait path, syn 3 MSRV and feature changes, secrecy changelog (503).
