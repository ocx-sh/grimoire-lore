---
title: Lint and link-checker config schemas, delta 2026-09-05 to 2026-11-27
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 17
---

# Lint and link-checker config schemas, delta update

## Summary

Question: between 2026-09-05 and 2026-11-27, did markdownlint, markdownlint-cli2, lychee, Vale or the Google style package change a rule name, config key, default or CLI flag that this pair uses?

Answer: nothing in the window broke the pair. One file does fail validation today, but the break dates from before the baseline: `checks/lychee.toml` fails on lychee 0.24.x for two reasons that were already true at the baseline (`base` and `include_fragments = true`).

- markdownlint 0.42.0 (2026-10-15), 0.42.1 (2026-11-07) and 0.42.2 (2026-11-18) and markdownlint-cli2 0.23.3 to 0.24.2 changed no rule name, key or default that `checks/markdownlint.jsonc` uses. The pin still holds. Latest is markdownlint-cli2 0.24.2 (2026-11-20).
- lychee has no stable release in the window. The latest stable is lychee-v0.24.2 (2026-04-30 changelog, 2026-05-01 release). `checks/lychee.toml` is stale against it, as described in section 3.
- Vale had eight releases in the window (v3.24.0 to v3.29.0), all additive. The Google package has v0.7.0 to v0.7.2, all rule-content fixes. The pinned v0.5.0 zip still downloads, and the four named rules are unchanged.
- The repositories moved from the `errata-ai` org to `vale-cli`. The old `errata-ai` URL still redirects and downloads. The comment "Pin a package by org and repo" in `vale.ini` is now misleading for the Google URL.
- The "two packages both ship as vale-ai-tells" claim still holds. One count changed: the all-error package grew from about 111 to 134 rules.

## Table of contents

1. Method and baseline facts
2. markdownlint and markdownlint-cli2
3. lychee
4. Vale and the Google package
5. Per-file failure list with replacements
6. Pins
7. Normative guidance candidates
8. AI-agent angle
9. Contested and evolving
10. Sources

## 1. Method and baseline facts

Release dates came from the npm registry (`registry.npmjs.org`) and `gh api repos/<org>/<repo>/releases`. Rule docs were fetched from the raw files at the release tags. Docs for MD001, MD003, MD025, MD036, MD040, MD041 and MD054 are byte-identical between v0.41.1 and v0.42.2, measured by md5 of the raw `doc/md0xx.md` files. Only MD045 differs, and only in its prose links (a Phase2 Technology link was removed from the "further reading" sentence). No rule semantics changed.

The pair measured DOC-PLAIN-13 on markdownlint-cli2 v0.23.2 (released 2026-07-27, before the baseline). Two newer cli2 releases did ship in the window. Their changelog entries say only "Update dependencies (including `markdownlint`)" for 0.24.0, 0.24.1 and 0.24.2, and "Update dependencies" for 0.23.3 ([cli2 CHANGELOG](https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md)).

## 2. markdownlint and markdownlint-cli2

| Claim at risk | Status | Evidence |
|---|---|---|
| DOC-PLAIN-13, "Measured on markdownlint-cli2 v0.23.2"; MD025 `front_matter_title` set to `""` | unchanged | [md025.md at v0.42.2](https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md025.md): `front_matter_title` is a string, default `^\s*title\s*[:=]`, and "To disable the use of front matter by this rule, specify `""`". The doc is identical to v0.41.1, the version bundled before the window. The measurement was not re-run on 0.24.2. |
| MD054 per-style booleans, no `style` key; keys `autolink`, `inline`, `full`, `collapsed`, `shortcut`, `url_inline` | unchanged | [md054.md at v0.42.2](https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md054.md) lists exactly those six boolean keys, each default `true`. The 0.42.1 entry "Improve MD042/MD054" (2026-11-07) is an implementation fix. It touched no key. The doc file is unchanged. |
| MD040 `allowed_languages` with `language_only` | unchanged | [md040.md at v0.42.2](https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md040.md): `allowed_languages` is `string[]`, default `[]`. `language_only` is boolean, default `false`. Matching is case-sensitive, so `bash-run` stays a separate value. |
| MD041 off, MD001, MD003 `style: atx`, MD036, MD045 | unchanged | md001, md003 (`style`, default `consistent`, values include `atx`), md036 docs byte-identical. md045 prose-only edit. MD041 still has `front_matter_title` and `level`. |
| `markdownlint-cli2 --config checks/markdownlint.jsonc` | unchanged | [cli2 README at v0.24.2](https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/v0.24.2/README.md) still lists `--config file`, `--configPointer`, `--fix`, `--format`, `--no-globs`. |

markdownlint 0.42.0 (2026-10-15) also added "regular expression denial of service protection" and "support for reporting issues with front matter" ([markdownlint CHANGELOG](https://raw.githubusercontent.com/DavidAnson/markdownlint/main/CHANGELOG.md)). The second item concerns custom rules reporting on front matter lines, so it does not touch the shipped config. A regression test for it landed 2026-10-25 ([commit](https://github.com/DavidAnson/markdownlint/commits/main)). The ReDoS protection could in theory reject a pathological `front_matter_title` regex, but `""` and the default are both fine. This was not tested.

## 3. lychee

Latest stable: lychee-v0.24.2. The GitHub releases list shows only that and a rolling `nightly` tag (2026-11-13) after v0.24.0. The lychee-bin CHANGELOG shows no entry after 0.24.2 ([lychee-bin CHANGELOG](https://github.com/lycheeverse/lychee/blob/master/lychee-bin/CHANGELOG.md)). Master moved in the window (per-host accept codes 2026-09-20 in [63bfe23d](https://github.com/lycheeverse/lychee/commit/63bfe23d), `cache_location` 2026-08-18), both additive and unreleased.

Evidence for current keys: [lychee.example.toml on master](https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee.example.toml) and the Config struct in [lychee-bin/src/config/mod.rs](https://github.com/lycheeverse/lychee/blob/master/lychee-bin/src/config/mod.rs). The struct carries `#[serde(deny_unknown_fields)]`, so an unknown key is a hard config error, not a silent ignore.

| Key in `checks/lychee.toml` | Status | Detail |
|---|---|---|
| `base = "site"` | changed, before baseline | `base` was renamed `base_url` by [PR #1629](https://github.com/lycheeverse/lychee/pull/1629) (CHANGELOG, in the 0.19 to 0.20 era, early 2025). The 0.23.0 and 0.24.2 example tomls have no `base`. With `deny_unknown_fields` it fails. A relative local `base_url` was also made invalid by [PR #1857](https://github.com/lycheeverse/lychee/pull/1857) ("disallow relative local base"). `base_url` now means a URL such as `"https://example.com"`. The right key for root-relative hrefs in built output is `root_dir`, which "must be an absolute path". |
| `include_fragments = true` | changed, before baseline | The 0.23.0 example had `include_fragments = true`. The 0.24.0 release (2026-04-24, "Check text fragments", [#2138](https://github.com/lycheeverse/lychee/pull/2138)) turned it into an enum `none`, `anchor-only`, `text-only`, `full`. A TOML boolean no longer deserialises. The example now says `include_fragments = "full"`. |
| `offline = true` | unchanged | Still `offline: Option<bool>`. |
| `max_retries = 2`, `max_concurrency = 8`, `timeout = 20` | unchanged | Same names and types. Since [#2145](https://github.com/lycheeverse/lychee/pull/2145) `max_concurrency = 0` is rejected, and 8 is fine. |
| `exclude`, `exclude_path` | unchanged | Both `Vec<String>`, "treated as regular expressions". `exclude_path` became regex in [#1766](https://github.com/lycheeverse/lychee/pull/1766) (the 0.18 to 0.19 era, early 2025). The shipped value `"site/reference/api"` works as an unanchored regex that matches the substring, so the semantics shift to regex matching is harmless. No semantics change happened in the window. |

CLI: `lychee --include-fragments` with no value still parses. Its `default_missing_value` is `anchor-only`, and a value needs `=`: `--include-fragments=full`. The doc comment states "If provided without a value, defaults to `anchor-only`." So the verification command in `checks.md` and `observability.md` still runs. It selects anchor-only checking. Whether the bare CLI flag overrides `include_fragments = "full"` in the config is not documented, and I did not test it. Treat the flag as redundant once the config sets the key.

The "base" question answered: it was renamed to `base_url` and split. `base_url` is for the URL origin. `root_dir` is the filesystem root for absolute local links. The two can be combined. This happened before the baseline, so the earlier research missed it. It is not new in the window.

## 4. Vale and the Google package

Org move: both repositories now live under `vale-cli` (`gh api repos/errata-ai/Google` returns full name `vale-cli/Google`, likewise `vale-cli/vale`). `https://github.com/errata-ai/Google/releases/download/v0.5.0/Google.zip` still answers 200 after redirect, so the pin works. The Vale docs use `vale-cli` for the same example: `Packages = https://github.com/vale-cli/Google/releases/download/v0.7.0/Google.zip` ([Packages key](https://docs.vale.sh/keys/packages)).

| Claim at risk | Status | Evidence |
|---|---|---|
| `Packages = .../errata-ai/Google/releases/download/v0.5.0/Google.zip` | unchanged in behaviour, stale in naming | URL redirects and downloads. Newest release is v0.7.2 (2026-11-12). v0.7.0 (2026-07-30) fixes the OAuth 2.0 word-list regex. v0.7.1 (2026-08-04) has no notes. v0.7.2 changes `OxfordComma` so it no longer flags a comma closing a fronted prepositional phrase, or one before `such as`, `for example`, `including` or `in order to` ([releases](https://github.com/vale-cli/Google/releases)). |
| `Google.Headings`, `Google.Ellipses`, `Google.Parens`, `Google.Passive` exist | unchanged | I unzipped both the v0.5.0 and v0.7.2 archives. All four files are present in both with identical levels: Headings `warning`, Ellipses `warning`, Parens `suggestion`, Passive `suggestion`. The two archives have 34 entries each. `meta.json` still says `vale_version >=1.0.0`. |
| `MinAlertLevel`, default severity "suggestion" | unchanged | [MinAlertLevel](https://docs.vale.sh/keys/minalertlevel): "The supported levels are `suggestion` (default), `warning`, and `error`." `--minAlertLevel` overrides it. |
| Two packages both ship as "vale-ai-tells" | still true, one number changed | [vale.sh/explorer/ai-tells](https://vale.sh/explorer/ai-tells): `tbhb/vale-ai-tells`, v1.37.0 (2026-09-15), 134 rules, all `error`, install `Packages = ai-tells`. [vale.sh/explorer/AiTells](https://vale.sh/explorer/AiTells): `krishnasunkam/vale-ai-tells`, v1.0.0 (2026-08-25), 17 rules, 6 `error` and 11 `suggestion`, install `Packages = AiTells`. The "about 111" figure is now 134. |

Vale releases in the window, none affecting the config keys used: v3.24.0 (2026-10-01) `vale test` and `BasedOnStyles = NONE`. v3.25.x `.config/vale.ini` discovery. v3.26.0 WebAssembly. v3.27.0 French, German, Spanish `Lang`. v3.28.x Markdoc, in-process reST and AsciiDoc. v3.29.0 (2026-11-26) `IgnoredPaths`, LaTeX, Typst and package digest pinning ([releases](https://github.com/vale-cli/vale/releases)). Digest pinning syntax from the Packages doc: `Packages = <zip URL>#sha256:<hex>`, "Vale older than v3.29.0 ignores the digest and installs the archive unchecked", so a digest is only a pin when Vale is at least 3.29.0. Directory-ish detail not verified: the v3.27.0 grammar change only affects source-code linting, not Markdown.

## 5. Per-file failure list with replacements

`checks/markdownlint.jsonc`: no line fails schema validation or changes behaviour. No edit.

`checks/vale.ini`: no line fails. Optional edits only.
- Line `Packages = https://github.com/errata-ai/Google/releases/download/v0.5.0/Google.zip` still works. To follow the current org, use `https://github.com/vale-cli/Google/releases/download/v0.5.0/Google.zip`, or move to `v0.7.2` and re-run the rule-count check. The four overridden rules are identical in v0.7.2. Source: [Packages key](https://docs.vale.sh/keys/packages), Google release assets.
- Comment "about 111 rules all at error": replace "about 111" with "134" (tbhb, v1.37.0). Source: vale.sh explorer.
- Comment "Pin a package by org and repo": still sound, but note the org is `vale-cli` now. Optional: add `#sha256:<digest>` after the zip URL, valid only on Vale 3.29.0 or later.

`checks/lychee.toml` (these fail today on lychee 0.24.x):

```toml
# was
base = "site"
include_fragments = true
# now
root_dir = "/absolute/path/to/site"
include_fragments = "full"
```

- `base = "site"` aborts with an unknown-field error. Replace with `root_dir`, which must be absolute. The relative `site` cannot be used, so the run command has to supply the path (for example `lychee --root-dir "$PWD/site" ...`, or the config gets generated). Source: [lychee.example.toml](https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee.example.toml) and `config/mod.rs` doc comment for `root_dir`.
- `include_fragments = true` fails to deserialise. Use `"anchor-only"` for the current behaviour of the pair (heading anchors only), or `"full"` to also check text fragments, which is what the upstream example uses. Anchor-only is the behaviour closest to what the file's comment describes, so prefer it.
- The comment "Without this a raw pass reports every /docs/... link as dead" still describes `root_dir` correctly.
- I did not run lychee. The verdict rests on the source and the example file, not on an observed failure. Install 0.24.2 and run the config once to confirm before editing.

`checks.md` row for `lychee.toml` and `observability.md` DOC-OBS-01: the command `lychee --include-fragments --config checks/lychee.toml <build-dir>` still runs. No edit needed, except that the bare flag means anchor-only.

`plain-english.md` DOC-PLAIN-13: text stays valid. Update "Measured on markdownlint-cli2 v0.23.2" only if the measurement is repeated on 0.24.2. The doc facts did not change.

## 6. Pins

- markdownlint-cli2: pin holds. Newest is 0.24.2 (2026-11-20, bundles markdownlint 0.42.2). 0.23.2 remains valid for what was measured. If bumping, no config change is required.
- lychee: pin to 0.24.2 (the latest stable) and fix the two keys above first. The config is invalid on 0.24.x already.
- Vale: no stated pin in the files. Current is v3.29.0 (2026-11-26).
- Google package: `v0.5.0` pin holds. Newest is v0.7.2 (2026-11-12).

## 7. Normative guidance candidates

1. Rule: `checks/lychee.toml` uses `root_dir` (absolute), not `base`. Rationale: `Config` denies unknown fields, so `base` aborts the run. Verify: `lychee --config checks/lychee.toml --dump-inputs` or any run, expecting no unknown-field error. Grep: `grep -n '^base =' checks/lychee.toml` returns nothing.
2. Rule: `include_fragments` takes `none`, `anchor-only`, `text-only` or `full`, never a boolean. Rationale: boolean support ended at 0.24.0. Verify: `grep -nE '^include_fragments = (true|false)' checks/lychee.toml` returns nothing.
3. Rule: name the lychee version the config was validated on in the file header. Rationale: key names changed twice in 18 months. Verify: a header line `# Validated on lychee 0.24.2` exists.
4. Rule: comment in `vale.ini` gives the rule count of the all-error package as 134. Rationale: the figure is evidence for DOC-PLAIN-21. Verify: read the explorer page.
5. Rule: reference the Google package under `vale-cli`, and add a digest only for Vale 3.29.0 or later. Rationale: older Vale ignores the digest silently. Verify: `vale --version`.

## 8. AI-agent angle

- A model trained before 2025 writes `base = "..."` for lychee, and `include_fragments = true`. Both now abort. Cheapest check: run `lychee --config checks/lychee.toml --dump-inputs`, or the grep lines above.
- A model writes MD054 with a `style` key, or MD040 `allowed_languages` as a string. The first is still unknown and ignored, the second misvalidates. Check: markdownlint-cli2 on a fixture file.
- A model treats `errata-ai` as the current owner and rewrites links to `github.com/errata-ai/...` as canonical. They redirect, so nothing fails. Grep for the org only to keep the files consistent.

## 9. Contested and evolving

- lychee config keys have moved in every recent minor release (0.20 `base_url`, 0.24 fragment enum). Expect more churn. `lychee --generate config-schema` emits a JSON schema, which validates the file mechanically. I did not run it. Trend: toward stricter enums.
- Vale is moving fast (eight releases in 12 weeks) but every change was additive. Trend: stable config surface.
- The two vale-ai-tells packages are independent and drift separately. As of 2026-11-27 one has 134 error-level rules and one 17 tiered rules.

## 10. Sources

| URL | What it is | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md | cli2 changelog | to 0.24.2 | Primary, window releases |
| https://raw.githubusercontent.com/DavidAnson/markdownlint/main/CHANGELOG.md | markdownlint changelog | to 0.42.2 | Primary |
| https://registry.npmjs.org/markdownlint-cli2 and /markdownlint | npm release dates | 2026-11-20, 2026-11-18 | Primary, release dates |
| https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md054.md | MD054 doc | 0.42.2 | Primary |
| https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md025.md | MD025 doc | 0.42.2 | Primary |
| https://raw.githubusercontent.com/DavidAnson/markdownlint/v0.42.2/doc/md040.md | MD040 doc | 0.42.2 | Primary |
| https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/v0.24.2/README.md | cli2 flags | 0.24.2 | Primary |
| https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee.example.toml | lychee example config | master, Nov 2026 | Primary |
| https://github.com/lycheeverse/lychee/blob/master/lychee-bin/CHANGELOG.md | lychee-bin changelog | to 0.24.2 | Primary |
| https://github.com/lycheeverse/lychee/blob/master/lychee-bin/src/config/mod.rs | Config struct | master | Primary, `deny_unknown_fields`, FragmentMode |
| https://github.com/lycheeverse/lychee/releases | lychee releases | 2026-05-01 latest stable | Primary |
| https://github.com/vale-cli/vale/releases | Vale v3.24 to v3.29 notes | 2026-10-01 to 2026-11-26 | Primary |
| https://github.com/vale-cli/Google/releases | Google v0.7.0 to v0.7.2 | 2026-07-30 to 2026-11-12 | Primary |
| https://docs.vale.sh/keys/minalertlevel | MinAlertLevel doc | current | Primary |
| https://docs.vale.sh/keys/packages | Packages doc | current | Primary |
| https://vale.sh/explorer/ai-tells | tbhb package | 2026-09-15 | Primary registry |
| https://vale.sh/explorer/AiTells | krishnasunkam package | 2026-08-25 | Primary registry |

Primary sources: 17. I also read the v0.5.0 and v0.7.2 Google zip archives directly.
