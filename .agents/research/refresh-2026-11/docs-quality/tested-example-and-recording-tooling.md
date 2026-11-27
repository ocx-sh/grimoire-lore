---
title: Tested-example and recording tooling, delta 2026-09-05 to 2026-11-27
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 21
---

## Summary

- Delta update of the "Mechanism by language" table in `skills/docs-quality-reference/examples.md`. The baseline status date is September 2026.
- No new language-native Markdown doctest runner was found, so the DOC-EX-03 table keeps its shape.
- Two table rows are now stale and need a version bump: Sybil (10.1.0 is now 10.2.0) and Deno (2.9.6 is now 2.9.8). The `@shikijs/vitepress-twoslash` version is now 4.6.0.
- One claim is imprecise rather than outdated: Node type stripping is "stable since Node 23.6", but 23.6 only enabled it by default. Stability came in 24.12 and 25.2.
- Every other claim at risk is unchanged. The asciicast v3 parser branch still exists, and the DOC-EX-09 `Path.match` behavior is unchanged.

## Findings

Each row gives the claim, a verdict (unchanged, changed, or could not determine), the new fact, the source URL, and the date of the upstream change.

| # | Claim in examples.md | Verdict | Fact and source |
|---|---|---|---|
| 1 | "Sybil 10.1.0" | changed | Sybil 10.2.0 was released on 2026-11-22. It adds `NamespacePackageDocument` for examples in source files inside PEP 420 namespace packages, and fixes a pytest `IndexError` on chained exceptions. 10.1.0 was 2026-06-13. The 10.x line needs Python 3.11 or newer. Source: https://sybil.readthedocs.io/en/latest/changes.html |
| 2 | "`should_parse` calls `pathlib.Path.match`, so `**` matches one level" (DOC-EX-09) | unchanged | Sybil `main` still has `if any(path.match(p) for p in self.patterns)` in `should_parse` (https://raw.githubusercontent.com/simplistix/sybil/main/src/sybil/sybil.py). CPython docs say `PurePath.match()` treats `**` like non-recursive `*`. Python 3.13 added `PurePath.full_match()`, which does recurse, but no change to `match()` is listed for 3.13 or 3.14, and Sybil does not call `full_match`. Source: https://docs.python.org/3/library/pathlib.html. Optional addition: name `full_match` (3.13+) as the recursive alternative. |
| 3 | "Twoslash 0.3.9" published 2026-06-22 | unchanged | npm `dist-tags.latest` is 0.3.9, with time 2026-06-22T04:02:21Z. No newer version. Source: https://registry.npmjs.org/twoslash |
| 4 | "`@shikijs/vitepress-twoslash` 4.4.3", published 2026-08-10 | changed | Two later releases exist: 4.5.0 on 2026-10-01 (swapped lz-string for lz-string-es) and 4.6.0 on 2026-11-02 (floating-vue 5.4 drag guard). `latest` is 4.6.0. 4.4.3 was published 2026-08-10, which is correct. Sources: https://registry.npmjs.org/@shikijs%2fvitepress-twoslash, https://github.com/shikijs/shiki/releases |
| 5 | "Deno 2.9.6", released 2026-08-27 | changed | The latest release is Deno 2.9.8 (2026-10-21). 2.9.7 was 2026-09-17. Neither release's notes mention `deno test --doc` or `deno check --doc-only`. The release page was read only to character 100000 of 115232, so a later entry on the tail could be missed. Source: https://github.com/denoland/deno/releases |
| 6 | "`node <file>.ts`, type-stripping only, stable since Node 23.6" | changed (imprecision) | Node's history table: enabled by default in 23.6.0 and 22.18.0, experimental warning dropped in 24.3.0 and 22.18.0, "Stability: 2 (Stable)" from 25.2.0 and 24.12.0. `--experimental-transform-types` was removed in 26.0.0. Current Node is 26.13.1. The row's behavior claim holds, but "stable since 23.6" should read "on by default since 23.6, stable since 24.12 and 25.2". Source: https://nodejs.org/docs/latest/api/typescript.html |
| 7 | "`embedmd` pushed 2026-04-11" | unchanged | The latest commit on `campoy/embedmd` master is 2026-04-11T18:04:55Z. No releases or tags. Source: GitHub commits API for campoy/embedmd, read through `gh api`. |
| 8 | "No native Markdown-fence runner exists" (Go) | unchanged | The Go release page shows the latest as 1.27.4 (2026-11-10), and 1.27.0 as 2026-08-19. The Go 1.27 notes list only a `stdversion` vet default, `go test -json` `OutputType`, and `go doc -ex` plus `go doc <pkg>.ExampleX`. No Markdown runner. Sources: https://go.dev/doc/devel/release, https://go.dev/doc/go1.27. The 1.26 notes were not opened. |
| 9 | Five dead JS tools, `@power-doctest/markdown` (2025-07) | unchanged | npm shows `@power-doctest/markdown` latest 6.0.0, last modified 2025-07-08. Source: https://registry.npmjs.org/@power-doctest%2fmarkdown. The other four tools (`jsdoctest`, `markdown-doctest`, `tsdoc-testify`, `bashup/mdsh`) were not re-checked. Verdict for those: could not determine. |
| 10 | "Vitest in-source testing tests source files" and "Bun ships a Markdown parser with no doctest feature" | could not determine | Neither the Vitest nor the Bun docs were fetched in this run. |
| 11 | `cargo test --doc` | unchanged | The rustdoc book still documents `cargo test --doc`. Notable already-present facts: from the 2024 edition compatible doctests are merged into one compile, `standalone_crate` opts out, and 1.88.0 changed `ignore-<target>` precedence. These could be worth a line, but they are not a change to the row. Source: https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html |
| 12 | `mdbook test` | unchanged | The mdBook test page still says "only Rust tests are supported". The latest mdBook release is v0.5.4 (2026-07-06), before the window. Sources: https://rust-lang.github.io/mdBook/cli/test.html, `gh release list -R rust-lang/mdBook` |
| 13 | "Set `#![doc(html_playground_url = ...)]`" and "without the attribute there are no Run buttons" | unchanged | The rustdoc book still says "If you don't use this attribute, there will be no run buttons." Source: https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html. Side note: mdBook's `[output.html.playground] runnable` defaults to true, a separate mechanism. |
| 14 | DOC-EX-14: asciicast v3 and the player's `parseAsciicastVN` branch | unchanged | `asciinema-player` `src/parser/asciicast.js` still has `parseAsciicastV1`, `V2` and `V3`, with V3 dispatched. The player is now 3.19.0 (2026-11-22), after 3.18.0 (2026-11-05) and 3.18.1 (2026-11-15). Its 3.18.0 notes add stricter option validation and a new terminal emulator. The asciinema CLI is still 3.2.1 (2026-06-16). The asciicast v3 spec page (docs/v3.md on the spec repo) returned 404 at the guessed raw URL, so the spec was not re-read. Sources: https://raw.githubusercontent.com/asciinema/asciinema-player/develop/src/parser/asciicast.js, `gh release list` for both repos. If a pinned player version appears in the examples text, it is below 3.19.0. |
| 15 | VHS `.tape` (DOC-EX-18) | unchanged | VHS v0.12.0 (2026-09-09) added `Set Rows` and `Set Cols` as an alternative to pixel size. v0.12.1 (2026-09-24) fixed encoder error reporting. The `.tape` format is unchanged. Source: `gh release view` for charmbracelet/vhs. |
| 16 | DOC-EX-27: WebContainers "Chromium-only at full strength" | unchanged | The browser-support page still says Chromium is fully supported, Firefox is alpha, Safari beta (16.4 and later), and that embedding arbitrary resources needs a cross-origin isolation mode only Chromium enables. The page contradicts itself on Firefox (beta in the summary, alpha in the section). Source: https://webcontainers.io/guides/browser-support |

## Normative guidance candidates

1. Bump the Sybil row to 10.2.0, the Deno row to 2.9.8, and the VitePress Twoslash version to 4.6.0, with their dates. Rationale: table rows are dated, and stale versions mislead. Verification: `grep -n "Sybil 10\|Deno 2\.\|vitepress-twoslash" skills/docs-quality-reference/examples.md` shows the new versions.
2. Reword the Node row to "on by default since Node 23.6, stable since 24.12 and 25.2". Rationale: the current wording asserts stability a version too early. Verification: read the row against the Node history table.
3. In DOC-EX-09, add that `PurePath.full_match` (Python 3.13+) recurses, while `match` does not. Rationale: gives the reader the fix, not only the trap. Verification: reading heuristic, the rule names both methods.
4. Do not add any new language-native Markdown doctest runner. None was found. Verification: DOC-EX-03's grep block still lists the same tools.

## AI-agent angle

- An agent will cite "Node type stripping stable since 23.6" from older articles. The mechanical check is the Node API doc history table.
- An agent will assume `Path.match("**/*.md")` recurses. The check is DOC-EX-09's two-levels-deep fixture.

## Contested / evolving

- Python 3.13 `full_match` could let Sybil change `should_parse` later. No sign of it as of 2026-11-27.
- The asciinema player moves fast (three releases in November), so a pinned version in docs goes stale quickly.

## Sources

| URL | What | Date |
|---|---|---|
| https://sybil.readthedocs.io/en/latest/changes.html | Sybil changelog | 2026-11-22 |
| https://raw.githubusercontent.com/simplistix/sybil/main/src/sybil/sybil.py | Sybil `should_parse` | main, 2026-11-27 |
| https://docs.python.org/3/library/pathlib.html | pathlib `match` and `full_match` | 3.13/3.14 docs |
| https://registry.npmjs.org/twoslash | twoslash versions | 2026-06-22 |
| https://registry.npmjs.org/@shikijs%2fvitepress-twoslash | vitepress-twoslash versions | 2026-11-02 |
| https://github.com/shikijs/shiki/releases | shiki release notes | 2026-11-02 |
| https://github.com/denoland/deno/releases | Deno releases | 2026-10-21 |
| https://nodejs.org/docs/latest/api/typescript.html | Node type stripping stability | Node 26.13.1 |
| https://github.com/campoy/embedmd | embedmd repo, commits via gh api | 2026-04-11 |
| https://go.dev/doc/devel/release | Go release history | 2026-11-10 |
| https://go.dev/doc/go1.27 | Go 1.27 notes | 2026-08-19 |
| https://registry.npmjs.org/@power-doctest%2fmarkdown | npm record | 2025-07-08 |
| https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html | rustdoc doctests | current |
| https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html | `html_playground_url` | current |
| https://rust-lang.github.io/mdBook/cli/test.html | mdbook test | current |
| https://raw.githubusercontent.com/asciinema/asciinema-player/develop/src/parser/asciicast.js | player parser | 3.19.0 |
| GitHub releases for asciinema, asciinema-player, charmbracelet/vhs, rust-lang/mdBook (via gh) | release lists | 2026-11 |
| https://webcontainers.io/guides/browser-support | WebContainers support | current |
