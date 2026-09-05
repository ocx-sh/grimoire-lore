---
title: Tested examples beyond shell, Python and Rust
topic: tested-examples-beyond-shell-python-rust
group: docs-examples
wave: 2
agent: wave2-tested-examples-beyond-shell-python-rust
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 22
scope: >
  Wave 1 commission from wave1-critique.md: what runs a TypeScript or
  JavaScript documentation example in September 2026, Go's Example tests as a
  pattern reference, the generic subprocess-per-fence runner shape, a
  shipped-and-tested harness file for DOC-EX-04, a measured answer to whether
  tier-suffixed fence languages (python-no-run, shell-tier2, ts twoslash)
  survive MkDocs Material, VitePress and mdBook, and a re-measurement of the
  recording-cost-current count at 35 scripts. Does NOT cover: the recording
  and cast layer (owned by recording-layer-and-interactivity.md), page-type
  contracts, or any language already covered by tested-example-gate.md
  (shell, Python, Rust).
revises:
  - .agents/research/docs-examples.md
  - .agents/research/docs-examples/tested-example-gate.md
---

# Tested examples beyond shell, Python and Rust

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [TypeScript has two native mechanisms, not zero](#1-typescript-has-two-native-mechanisms-not-zero)
  2. [Two commission items were not real mechanisms](#2-two-commission-items-were-not-real-mechanisms)
  3. [The dead ecosystem: five abandoned JS doctest tools](#3-the-dead-ecosystem-five-abandoned-js-doctest-tools)
  4. [Go tests its Example functions, not its markdown](#4-go-tests-its-example-functions-not-its-markdown)
  5. [The generic subprocess-per-fence shape, four current tools](#5-the-generic-subprocess-per-fence-shape-four-current-tools)
  6. [DOC-EX-04 shipped and tested: run_doc_examples.py](#6-doc-ex-04-shipped-and-tested-run_doc_examplespy)
  7. [Fence-tier rendering, measured on all three generators](#7-fence-tier-rendering-measured-on-all-three-generators)
  8. [recording-cost-current re-measured at 35 scripts](#8-recording-cost-current-re-measured-at-35-scripts)
  9. [The decided mechanism table rows](#9-the-decided-mechanism-table-rows)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- TypeScript has two real native mechanisms in September 2026, not zero. Twoslash type-checks a fenced sample at doc-build time. `deno test --doc` executes or type-checks fenced Markdown and JSDoc directly. DOC-EX-03's TypeScript gap is closeable, not a dead end.
- Twoslash (`twoslash` 0.3.9, 2026-06-22) throws a real error, `TwoslashError`, when a sample has a compiler error not declared with `// @errors: <code>`. This is a build-time gate, not a cosmetic renderer. Verified by reading `packages/twoslash/src/validation.ts` directly.
- `deno test --doc` runs fenced blocks tagged `js`, `javascript`, `mjs`, `cjs`, `jsx`, `ts`, `typescript`, `mts`, `cts` or `tsx` straight out of a Markdown file. A fence marked ` ```ts ignore ` is skipped. `deno check --doc-only` does the type-check-only version.
- Node itself runs a `.ts` file directly with no install. This has been stable since Node 23.6, confirmed stable at 25.2/24.12. It strips types, it does not check them. This is the zero-dependency runner behind the shipped TypeScript harness.
- Vitest's in-source testing (`import.meta.vitest`) is not a documentation-example mechanism. It tests source files, not fenced Markdown. The commission's premise here was wrong, and this corrects it.
- Bun ships a native Markdown parser (`Bun.markdown`, 1.3.8, January 2026) but no doctest feature. There is no first-party Bun mechanism to name.
- Five JS/TS doctest tools are dead: `jsdoctest` (1.7.1, 2017), `markdown-doctest` (1.1.0, 2020), `tsdoc-testify` (0.0.3, 2019), `@power-doctest/markdown` (6.0.0, mid-2025), and `bashup/mdsh` (last pushed 2022). None should be named as a live recommendation.
- Go's `testing` package Example functions are the pattern reference the commission asked for. No fleet repo is Go. `go test` compiles every Example, and only executes and checks the ones with a trailing `Output:` or `Unordered output:` comment. This tests Go source, not a Markdown fence.
- For a Go code sample inside a docs-site page, the tested answer is transclusion, not a fresh fence. Pull the real, tested Example's source into the page with `embedmd` (807 stars, pushed 2026-04-11), so the page can never hold an untested copy.
- The generic subprocess-per-fence shape is alive in four current tools across four languages. MDCR (Rust) opts a fence out with `mdcr-skip` and has a `--check` CI mode. `markdown-code-runner` (Python) rewrites blocks in place. `runme` (Go) runs cell-based notebook execution. `mq-task` (Rust) is section-based and marked under active development.
- Those four tools split into two different contracts. A rewrite-in-place runner (`markdown-code-runner`, `embedmd`, `mdsh`) regenerates the page's own text from a live command. A bind-and-assert runner (ocx's mechanism, MDCR's `--check` mode, the shipped harness below) leaves the page alone and fails a separate test instead. Treating the two as interchangeable is a real risk. A rewrite tool that is also the only check will silently accept whatever a flaky command prints as the new expected output.
- DOC-EX-04's missing half is now shipped, not argued. `run_doc_examples.py` is a 55-line, zero-dependency Python script. It globs an example tree, dispatches each file to its language's interpreter, and asserts an exit code. Tested against a passing fixture and a deliberately broken one, both directions confirmed.
- Fence-tier rendering was measured, not read about, on real builds of all three generators. The result overturns the critique's own guess.
- A hyphen-joined single-token tier tag (`python-no-run`, `shell-tier2`) degrades safely everywhere. MkDocs Material 9.7.7 falls back to Pygments' `text` lexer. mdBook falls back to highlight.js's `no-highlight` mode. VitePress falls back to Shiki's `txt` with a build warning. No generator loses content.
- A space-separated fence attribute (`ts twoslash`, the tool-native Twoslash and Deno convention) corrupts the page under MkDocs Material 9.7.7. `pymdownx.superfences` does not recognize a fence with whitespace in its info string as an opening fence at all. Everything after it, including a later real fence's own backticks, gets swallowed into one wrongly-classed code block. Measured directly, reproduced in isolation.
- mdBook and VitePress both tolerate the space form. mdBook's highlight.js pulls the first token out of a multi-class attribute with its own regex. VitePress's markdown-it splits the fence's meta string per the CommonMark spec. Only MkDocs Material breaks, and 7 of the fleet's 9 real sites run it, so the space form is not a portable convention.
- The critique guessed that "an attribute-based marking is the better shape" if highlighting breaks. The measurement says the opposite. The hyphenated single token is strictly safer, because the attribute form is unsafe on most of the fleet.
- `recording-cost-current` was re-measured at the current count. It is exactly 35 `cast: true` scripts, confirmed both by grep and by a side-effect-free `pytest --collect-only` run against ocx's real `recordings/` test tree. The 59% growth over the 22-script baseline is confirmed current and stable, not a further-stale estimate.
- The pipeline's wall-clock cost was not independently re-timed. Re-running it means real OCI registry pushes and a live Sigstore stack already in shared use by other concurrent work in this fleet. Doing so would also write generated files into another repo's tree, outside this program's scope. This is stated as a gap, not papered over.

## Findings

### 1. TypeScript has two native mechanisms, not zero

`tested-example-gate.md` §4 named TypeScript as the one language with "no mainstream doctest tool," a claim the commission asked to re-check. It is out of date. Two exist, and they answer two different questions.

**Twoslash** type-checks a fenced sample using the real TypeScript compiler, at doc-build time. It does not execute the code or capture output. `twoslash` (the core package) is at 0.3.9, published 2026-06-22 ([npm registry](https://registry.npmjs.org/twoslash)). Its Shiki integration, `@shikijs/twoslash`, is at 4.4.3, published 2026-08-10, and the VitePress-specific wrapper, `@shikijs/vitepress-twoslash`, is at the same version and date. The project (`twoslashes/twoslash` on GitHub) is not archived, last pushed 2026-06-22, 938 stars ([repo metadata](https://github.com/twoslashes/twoslash)). Its predecessor, `shikijs/twoslash`, was archived 2025-05-16 with development moved to the current org, which is worth knowing before citing the old package name.

The enforcement is real, not cosmetic. Reading `packages/twoslash/src/validation.ts` directly:

```ts
if (unspecifiedErrors.length) {
  ...
  const newErr = new TwoslashError(
    `Errors were thrown in the sample, but not included in an error tag`,
    `These errors were not marked as being expected: ${errorsFound}. ${missing}`,
    `Compiler Errors:\n\n${allMessages}`,
  )
  throw newErr
}
```

Any compiler error in a fenced sample that is not declared with `// @errors: <code>` throws, and the message names the exact codes to add. `// @noErrors` suppresses this deliberately, per-fence. A site wired with `@shikijs/vitepress-twoslash` fails its build the moment a `ts twoslash`-tagged sample stops type-checking, exactly the DOC-EX-01 shape ocx already runs for shell.

The enabling convention, confirmed against the plugin's own docs, is the fence info string ` ```ts twoslash `, space-separated ([shiki.style/packages/vitepress](https://shiki.style/packages/vitepress)). Section 7 below is why this convention cannot be the shared fleet-wide tier tag.

**`deno test --doc`** runs fenced code directly out of Markdown and JSDoc, no separate test file. Confirmed against `docs.deno.com/runtime/test/doc_tests/`: the recognized tags are `js`, `javascript`, `mjs`, `cjs`, `jsx`, `ts`, `typescript`, `mts`, `cts` and `tsx`. A block is skipped with the `ignore` attribute, again space-separated: ` ```ts ignore `. `deno check --doc-only` does the same extraction but only type-checks, it does not run the code. Deno itself is current, 2.9.6 released 2026-08-27 ([GitHub releases](https://github.com/denoland/deno/releases)).

This is the direct TypeScript equivalent of Sybil for Python and `cargo test --doc` for Rust: a first-party runtime with a doctest mode built in, adding only the Deno binary, no framework. The cost is real for a Node-only project: fenced code that calls a Node-specific API (`fs`, `process`, a native addon) may not run the same way under Deno's runtime as it does in the project's own Node environment, since `deno test --doc` executes under Deno, not Node. Type-checking with `deno check --doc-only` has no such gap, since it never executes anything.

**Choosing between them** follows the same rule DOC-EX-03 already states for other languages: match the mechanism to what the example needs. A sample that only claims a type is correct (an API-usage snippet, a type-level example) is Twoslash's job, and it is the natural fit for the fleet's one VitePress site, since it is the same JS toolchain the site already runs. A sample that must actually execute and produce real output is `deno test --doc`'s job, or, when neither tool is wanted, the subprocess-per-example fallback in §6.

### 2. Two commission items were not real mechanisms

The commission's list named "vitest in-source and doc tests" and Bun as things to check. Reading their own docs directly turns up something the list assumed away.

**Vitest's in-source testing** (confirmed against `vitest.dev/guide/in-source.html`) means writing tests inside a source file behind an `if (import.meta.vitest)` guard, so the test can share closures and private state with the implementation next to it, "similar to Rust's module tests." It has nothing to do with Markdown, JSDoc, or fenced examples. There is no Vitest feature that runs a documentation example as a test. Any rule that assumes one exists would be unimplementable.

**Bun** shipped a native Markdown parser in 1.3.8 (January 2026, `Bun.markdown`, a Zig port of md4c) that converts Markdown to HTML in one call. It is a renderer, not a test runner, and Bun has no first-party doctest feature. The community answer for testing JS code in Markdown predates Bun and is one of the dead tools in §3.

### 3. The dead ecosystem: five abandoned JS doctest tools

Confirmed by direct npm registry query (`registry.npmjs.org/<package>`, `dist-tags.latest` and its publish timestamp) and, for `mdsh`, a GitHub API repo query for `pushed_at`:

| Tool | Latest version | Last published | Status |
|---|---|---|---|
| `jsdoctest` | 1.7.1 | 2017-08-14 | Dead, 9 years stale |
| `markdown-doctest` | 1.1.0 | 2020-10-07 | Dead, 6 years stale |
| `tsdoc-testify` | 0.0.3 | 2019-12-06 | Dead, 6+ years stale |
| `@power-doctest/markdown` | 6.0.0 | 2025-07-08 | Stale, 14 months, not actively maintained |
| `bashup/mdsh` | n/a (GitHub only) | 2022-07-01 | Dead, 4+ years stale |

None of these should be named as a live recommendation in a shipped rule. `zimbatm/mdsh`, a different project despite the same name, is current (pushed 2026-07-23, 173 stars) but is a shell pre-processor for README automation, not a doctest runner, and belongs in §5 instead.

### 4. Go tests its Example functions, not its markdown

No fleet repo is Go, so this is pattern reference only, the same status `tested-example-gate.md` §4 already gives Elixir's `ExUnit.DocTest`.

Confirmed against `pkg.go.dev/testing#hdr-Examples` directly:

> "Example functions without output comments are compiled but not executed."

> "Example functions may include a concluding line comment that begins with 'Output:' and is compared with the standard output of the function when the tests are run" (comparison ignores leading and trailing space), and "'Unordered output:' is like 'Output:', but matches any line order."

The naming convention is `func Example()`, `func ExampleF()`, `func ExampleT()`, `func ExampleT_M()`, each additional example for the same target needing a distinct lower-case-starting suffix. `go test` compiles every Example (a free syntax and reference check even with no Output comment) and only executes and diffs the ones that declare one. `pkg.go.dev` then renders the Example, with its Output comment, on the package's own documentation page.

The key limitation for this program: this tests Go **source files**, specifically `_test.go` files sitting next to the package they document. It has no concept of a Markdown fence in a `docs/` site. A project with a `.md` page that shows a Go usage sample gets nothing from `go test` unless that sample is transcluded, not retyped.

`embedmd` (807 stars, not archived, pushed 2026-04-11, confirmed via GitHub API) is the current tool for that transclusion:

```Markdown
[embedmd]:# (path/to/real_test.go go /func ExampleFoo/ /^}/)
```

It pulls the named region of a real file into the Markdown page and keeps it in sync ([`campoy/embedmd` README](https://raw.githubusercontent.com/campoy/embedmd/master/README.md)). It does not execute anything itself, the correctness guarantee is entirely inherited from the `go test` Example it points at. This is the same "declared == canonical(provisioned)" idea `tested-example-gate.md` §5 already names for ocx's isolation-prefixed values, applied one step earlier: the page is never given the chance to hold its own untested copy of the example, because it never authors one.

### 5. The generic subprocess-per-fence shape, four current tools

The commission asked to cover "the generic subprocess-per-fence runner shape" directly, not only per-language tools. Four current, maintained tools show what that shape looks like once it is generalized past one language:

| Tool | Language | Status | Shape |
|---|---|---|---|
| [MDCR](https://github.com/drupol/markdown-code-runner) (`drupol/markdown-code-runner`) | Rust | Not archived, pushed 2026-07-23 | Per-language command table in TOML, executes fences via external commands, optional in-place block rewrite, `--check` mode for CI, opt-out via a literal `mdcr-skip` flag on the fence |
| [markdown-code-runner](https://github.com/basnijholt/markdown-code-runner) (`basnijholt/markdown-code-runner`) | Python | Not archived, pushed 2026-08-14 | Executes Python and Bash fences (any language via Bash), rewrites the block's output in place between named section markers, built for generating tables and plots into a README |
| [runme](https://github.com/runmedev/runme) | Go | Not archived, pushed 2026-09-03, 2160 stars | Cell-based execution, the Markdown file itself is the executable unit, ships a CLI and a GitHub Action, already the fleet's own key source for the recording layer |
| [mq-task](https://github.com/harehare/mq-task) | Rust | Not archived, pushed 2026-09-03, marked "under active development" | Section-title-scoped task runner built on the `mq` Markdown query language, TOML config, task dependency ordering |

These four split into two contracts that must not be treated as one:

**Rewrite-in-place.** `markdown-code-runner`, `embedmd`, and `zimbatm/mdsh` all regenerate part of the page's own text from a live command's output. This is the right tool for a README table, a generated changelog snippet, or a transcluded source region: the page is the artifact, always current, and a `git diff` shows exactly what changed.

**Bind-and-assert.** ocx's own mechanism, MDCR's `--check` mode, and the harness shipped in §6 all leave the authored page alone and run a separate check that fails when the example breaks. This is the right tool for prose the author wrote on purpose: a how-to's numbered steps, a reference page's usage example, anything where the words around the code matter as much as the code.

The failure mode of confusing them: a rewrite-in-place tool used as if it were the only test silently accepts whatever a flaky, non-deterministic, or newly-broken command happens to print as the new "expected" output, because rewriting and asserting are the same step. A project that wants both properties needs both: rewrite to keep the page current, then a second, independent bind-and-assert pass (or a `--check`-mode dry run compared against committed output) to catch a rewrite nobody reviewed.

### 6. DOC-EX-04 shipped and tested: `run_doc_examples.py`

`tested-example-gate.md` §7 already states the target: "one test file that globs a doc-example directory, runs each file as a subprocess... and asserts exit code." The commission asked for that file to actually exist, not stay a description. It now does, and it was run, not just written.

```python
#!/usr/bin/env python3
"""Smallest floor: run every doc example as a subprocess, in the language it needs.

Add a language by adding one line to RUNNERS. Each example file declares its
own binding to a page and its own expected exit code in a two-line header:

    # doc: <slug the page cites>
    # title: <human title, shown on failure>
    # expect_exit: <int, default 0>

No test framework, no per-language plugin. This is the DOC-EX-04 floor: the
harness a project reaches for before it needs Sybil, cargo test --doc, or a
bespoke acceptance-script tree with registry/PTY side effects.
"""
import subprocess
import sys
from pathlib import Path

RUNNERS = {
    ".ts": ["node"],       # Node >=23.6 strips types natively, no install needed
    ".mts": ["node"],
    ".sh": ["bash"],
    ".py": ["python3"],
}


def read_header(path: Path) -> dict:
    meta = {"doc": None, "title": path.name, "expect_exit": 0}
    for line in path.read_text().splitlines()[:10]:
        line = line.strip().lstrip("#/").strip()  # strip '#' (sh/py) or '//' (ts/js)
        if line.startswith("doc:"):
            meta["doc"] = line.split(":", 1)[1].strip()
        elif line.startswith("title:"):
            meta["title"] = line.split(":", 1)[1].strip()
        elif line.startswith("expect_exit:"):
            meta["expect_exit"] = int(line.split(":", 1)[1].strip())
    return meta


def main(example_dir: str) -> int:
    root = Path(example_dir)
    files = sorted(p for p in root.rglob("*") if p.suffix in RUNNERS)
    if not files:
        print(f"no doc examples found under {root}", file=sys.stderr)
        return 1

    failures = []
    for path in files:
        meta = read_header(path)
        runner = RUNNERS[path.suffix]
        proc = subprocess.run(runner + [str(path)], capture_output=True, text=True)
        ok = proc.returncode == meta["expect_exit"]
        status = "ok" if ok else "FAIL"
        print(f"[{status}] {meta['title']} (doc: {meta['doc']}, file: {path})")
        if not ok:
            print(f"  expected exit {meta['expect_exit']}, got {proc.returncode}")
            if proc.stderr:
                print("  stderr:", proc.stderr.strip().splitlines()[-1])
            failures.append(path)

    print(f"\n{len(files) - len(failures)}/{len(files)} doc examples passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "doc_examples"))
```

Verified with a passing fixture and a deliberately broken one, both TypeScript, run under plain `node` with no install (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/harness-test/`):

```
[ok] Print a greeting (doc: getting-started/hello, file: doc_examples/getting-started__hello.ts)
[FAIL] Deliberately broken example (doc: user-guide/broken, file: doc_examples/user-guide__broken.ts)
  expected exit 0, got 1
  stderr: Node.js v24.14.0

1/2 doc examples passed
```

Fixing the broken fixture and re-running flips the same line to `[ok]` and the exit code to 0, the exact DOC-EX-01 break-one-command probe applied to the harness itself. This is the missing half the commission named: not a reading heuristic pointing at ocx's 7,925-line worked example, an actual 55-line file that runs today.

One honest limit worth stating in the shipped guidance: this harness only asserts exit code. It catches a broken runtime example, the same failure mode as ocx's shell scripts. It does not type-check TypeScript, since plain `node` only strips types, it does not read them (confirmed in §1). A project wanting type-checking on top of this floor adds `tsx` or a `tsc --noEmit` step, or reaches for Twoslash instead, per §1's decision rule.

### 7. Fence-tier rendering, measured on all three generators

`docs-examples.md`'s open question `fence-tier-rendering` asked whether tier-suffixed fence languages degrade to plain text or break rendering. This was measured directly, not inferred, by building the same test page under all three of the fleet's real generators.

Test page (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/fence-tags.md`), six fences: a known language (`python`), a hyphen-tiered language (`python-no-run`), a second hyphen-tiered language (`shell-tier2`), a space-separated attribute (`ts twoslash`), a bogus tag (`boguslang`), and no tag at all.

**mdBook 0.5.3** (the installed binary, matching grimoire's own toolchain): built clean, no errors. Every fence's info string, however it was written, became the `<code>` element's `class` attribute verbatim: `class="language-python-no-run"`, `class="language-ts twoslash"` (one attribute value containing a literal space, which HTML then parses as two separate class tokens: `language-ts` and `twoslash`). mdBook bundles highlight.js **10.1.1** (an old release, current is 11.12.0, see below). highlight.js's own `blockLanguage` function, read directly from its current source:

```js
const match = options.languageDetectRe.exec(classes);   // /\blang(?:uage)?-([\w-]+)\b/i
if (match) {
  const language = getLanguage(match[1]);
  if (!language) {
    logger.warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
    logger.warn("Falling back to no-highlight mode for this block.", block);
  }
  return language ? match[1] : 'no-highlight';
}
```

For `language-python-no-run`, the whole hyphenated string is one regex capture, unregistered, so highlighting is explicitly skipped: plain text, deterministic, logged. For `language-ts twoslash`, the regex's `\b` word boundary stops at the space, capturing only `ts`, a registered language, so it highlights correctly and `twoslash` survives as an inert, harmless second class. A **completely untagged** fence is different again: with no `language-*` class to match at all, `blockLanguage` falls through to `classes.split(/\s+/).find(...)`, and `highlightElement` then calls `highlightAuto(text)`, guessing a language rather than leaving the block alone. So under mdBook, a bare fence with no tag is less predictable than an intentionally hyphen-tagged unknown one, an argument for always tagging even a not-yet-real tier name.

**MkDocs Material 9.7.7** (`uvx --from mkdocs-material==9.7.7 mkdocs build`, the fleet's own pinned version, config matching `ocx-catalog/mkdocs.yml`'s `pymdownx.superfences` block with no `custom_fences`): the hyphen-tiered fences built clean, falling back to Pygments' generic `text` lexer (`<div class="language-text highlight">`), no color, no corruption. The space-separated fence did not. It corrupted the rest of the page:

```
<p>Twoslash-style space-attribute (Deno / Twoslash convention):</p>
<p>```ts twoslash
const x: number = 1
<div class="language-text highlight"><pre>...After, this paragraph must render normally.
```python
print("still fine after")
```
</pre></div></p>
```

`pymdownx.superfences` does not recognize ` ```ts twoslash ` as an opening fence at all, because its info string contains whitespace. The literal three backticks print as text, and everything that follows, including the next paragraph and the next real fence's own opening and closing backticks, gets swallowed into one wrongly-classed code block until an unrelated later `` ``` `` happens to close it. Reproduced in isolation with a two-fence minimal file to rule out interaction with the other five test fences: the same corruption, the same swallowed paragraph.

**VitePress 1.6.4** (`npx vitepress@latest build`) and, to match ocx's actual pin, **VitePress 2.0.0-alpha.16**: both built clean, with an explicit console warning per unknown language (`The language 'python-no-run' is not loaded, falling back to 'txt' for syntax highlighting.`), and no warning at all for the space-separated fence, because markdown-it (VitePress's Markdown engine) is CommonMark-compliant: the fence info string's first whitespace-delimited token is always the language, and Shiki always highlights it if it recognizes that first token, regardless of what follows. The rendered class for `ts twoslash` was `language-ts`, fully highlighted, with `twoslash` dropped as an inert meta string (this is exactly the hook `@shikijs/vitepress-twoslash` reads to decide whether to run Twoslash on that block, not installed in this test).

The fleet runs 7 MkDocs Material sites, 1 mdBook site, 1 VitePress site. A convention only 2 of 3 generators tolerate corrupts most of the fleet. See [Contested / evolving](#contested--evolving) for the decision this drives.

### 8. `recording-cost-current` re-measured at 35 scripts

`tested-examples-mechanism.md` §5 flagged its own cost estimate as dated: measured at a 22-script baseline, never re-run at the current 35. This was re-checked directly against ocx's real test tree, not re-estimated.

```
$ grep -rn "# cast:" test/doc_scripts --include="*.sh" | grep -c "true"
35
$ find test/doc_scripts -name "*.sh" | wc -l
66
```

Confirmed a second way with a side-effect-free collection run (no real command executes, no registry or Sigstore container touched):

```
$ uv run pytest recordings/ --collect-only -q
...
50 tests collected in 0.02s
$ uv run pytest recordings/ --collect-only -q | grep -c "test_record\["
35
```

The count is exactly 35, confirming `docs-examples.md`'s own already-stated figure is current and has not drifted further since it was written. The 59% growth over the 22-script baseline stands as measured, not as a further-stale estimate.

The pipeline's **wall-clock** cost was not independently re-timed, and that gap is stated rather than papered over. Re-running the real recording pipeline means real OCI registry pushes and a live six-container Sigstore stack (`fulcio`, `rekor`, `dex`, two Trillian processes, a CT log), the same containers were already running under `docker ps` at measurement time from other concurrent work in this fleet, and doing so would write 35 generated `.cast` files into ocx's own tree, outside this program's file scope. A future pass with dedicated infrastructure should re-time it. This pass could only, and did, re-confirm the count.

### 9. The decided mechanism table rows

To merge into `tested-example-gate.md` §4's per-language mechanism table:

| Language / surface | Native mechanism | Fleet instance | Verified detail |
|---|---|---|---|
| TypeScript/JavaScript, a type-level claim in a fenced sample rendered by Shiki | **Twoslash** (`twoslash` 0.3.9, 2026-06-22, `@shikijs/vitepress-twoslash` 4.4.3, 2026-08-10 for VitePress) | none, ocx's VitePress site is the natural adopter | Type-checks the real compiler over the sample at doc-build time, throws `TwoslashError` on an undeclared compiler error. Confirmed reading `packages/twoslash/src/validation.ts`. Does not execute or capture output. |
| TypeScript/JavaScript, a sample that must execute and produce output | **`deno test --doc`** (execute) or **`deno check --doc-only`** (type-check only), Deno 2.9.6, 2026-08-27 | none | Runs fenced `js`/`javascript`/`mjs`/`cjs`/`jsx`/`ts`/`typescript`/`mts`/`cts`/`tsx` blocks straight from a Markdown file. ` ```ts ignore ` skips a block. Runs under the Deno runtime, a real gap for Node-specific code. |
| TypeScript/JavaScript, no doctest tool wanted | Subprocess-per-example: plain `node <file>.ts` (type-stripping only, no install, stable since Node 23.6) or `npx tsx` (4.23.13, 2026-08-30) when full type support is needed | Shipped and tested here as `run_doc_examples.py` | Same shape as ocx's shell harness. Asserts exit code only, no type-checking without an added `tsc`/`tsx` step. |
| Go, an API-usage sample that lives with its source | `go test`'s **Example functions**, `func ExampleFoo()` with an optional trailing `// Output:` or `// Unordered output:` comment | none, no fleet repo is Go, pattern reference only | `pkg.go.dev/testing#hdr-Examples`: examples with no Output comment "are compiled but not executed." An Output comment makes it execute and diff stdout. Tests Go source, not a Markdown fence. |
| Go, a fenced `go` sample inside a docs-site `.md` page | No native Markdown-fence runner. Transclude the tested Example's real source with **`embedmd`** (807 stars, pushed 2026-04-11) | none | `embedmd` keeps the page byte-identical to the source region it points at. Correctness is inherited entirely from the `go test` Example, the page never holds its own untested copy. |

## Normative guidance candidates

1. **Reach for Twoslash on a VitePress site, or `deno test --doc`/`deno check --doc-only` anywhere else, before building a bespoke TypeScript harness.** Rationale: closes the dead end DOC-EX-03's current MUST sends an agent into. It is the same reflex the rule already forbids for Python and Rust. Verification: before adding any TypeScript doc-example test module, grep the project's dependency manifest and VitePress config for `twoslash`, `@shikijs/vitepress-twoslash`, or a `deno` binary in CI. A new harness with no external system in scope and no such grep hit is the finding. Evidence: normative (both tools' own documented and coded behavior, confirmed by direct source read). Severity: MUST. CHANGES DOC-EX-03 (extends its "unless it needs a real external system" test to name the two TypeScript-native options first).

2. **Ship the doc-example harness as an actual file, not a description of one.** Rationale: a reading heuristic pointing at a 7,925-line worked example gives an adopting project no floor to start from. That gap is exactly what the commission was raised to close. Verification: run the shipped `run_doc_examples.py` against a fixture pair, one passing and one deliberately broken (both included in the harness's own test scaffold). Confirm the exit codes are 0 and 1. Evidence: measured (run twice, in both directions, in this research pass). Severity: SHOULD. Still not a MUST, since a project may legitimately need a different shape, but this rule's verification is no longer a reading heuristic. CHANGES DOC-EX-04 (its verification upgrades from "reading heuristic, the one-file floor" to the command above).

3. **A fence's tier suffix must be one whitespace-free token, joined to the language with a hyphen (`python-no-run`, `shell-tier2`), never a space before a second attribute word.** Rationale: a space-separated fence info string is not just unhighlighted, it is unparsed. `pymdownx.superfences` (MkDocs Material, the fleet's most common generator) does not recognize such a line as an opening fence at all, and the corruption spreads past the one fence, swallowing later content up to the next accidental close. Verification: build a two-fence fixture, one hyphen-tagged and one space-tagged, under `pymdownx.superfences` with default config. Confirm the space-tagged one breaks the page while the hyphen-tagged one does not. (This exact fixture and result are in Finding 7 above.) Evidence: measured, reproduced in isolation. Severity: MUST, raised from DOC-EX-05's current SHOULD, because the failure reaches beyond the tagged fence itself into unrelated page content. CHANGES DOC-EX-05 (adds this as its separator rule. The existing markdownlint MD040 verification stays for the tag-presence half).

4. **A tool whose own convention uses a space-separated fence attribute (Twoslash's `ts twoslash`, Deno's `ts ignore`) may be used as written only on a page that will never render under MkDocs Material.** Rationale: the tool-native form is genuinely fine on VitePress and mdBook. Banning it outright would cost real functionality, Twoslash's own hover and error-checking, for no reason on those two generators. Verification: grep the docs site's generator config file (see the frame's glob decision) for `mkdocs.yml`. If present, grep touched pages for a fence info string containing a space, and fail the check. Evidence: measured (same build as #3). Severity: SHOULD. This is a portability convenience, not itself the source of corruption. That role belongs to rule 3. NEW beside DOC-EX-05.

5. **When a docs page shows Go code, transclude it from a real, tested `Example` function rather than authoring a fresh standalone fence.** Rationale: Go has no native Markdown-fence runner, so an authored fence is untested by construction. This is exactly the gap DOC-EX-03 exists to close for every other language. Verification: for a page with a `go` fence, grep the cited source file for a matching `func Example...` with a trailing `// Output:` or `// Unordered output:` comment. Also grep the docs build for an `embedmd` (or equivalent include-and-sync) directive pointing at it. Evidence: normative (`pkg.go.dev/testing#hdr-Examples`, `embedmd`'s own README). Severity: SHOULD, since no fleet repo is Go today and this is pattern reference. CHANGES DOC-EX-03 (extends "reach for the language's own doctest runner first" with Go's own shape: source-side testing plus page-side transclusion, not direct fence execution).

6. **Never let the same tool both rewrite a page's fenced output and serve as that example's only correctness check.** Rationale: a rewrite-in-place runner (`markdown-code-runner`, `embedmd`, `mdsh`) regenerates the page from whatever the command just printed. If that command is flaky or has silently regressed, the "test" passes by definition. It just captured the new wrong answer as the new expected one. Verification: for any fence with a rewrite-in-place directive, grep for a second, independent check. Either a committed copy of the last-known-good output diffed in CI, or a bind-and-assert test (§6) running the same command against a fixed expectation. Evidence: argued. No single fleet instance combines these today. This is a reasoned failure mode, not a measured one. Severity: CONSIDER. NEW beside DOC-EX-01 and DOC-EX-08.

## AI-agent angle

1. **Reaches for a JS test framework it already knows (Jest, Vitest) to "test the docs," and writes a bespoke Markdown-parsing harness, because it does not know Twoslash or `deno test --doc` exist.** Both are one dependency line, not a framework to build. → rule 1.
2. **Copies the Twoslash/Deno `lang attribute` convention (` ```ts twoslash `, ` ```ts ignore `) into a project's own tier-tagging scheme, because that is the syntax visible in the tool's own docs, without checking what the project's actual generator does with a space.** This is the single most consequential mistake this research found: it is invisible until the very next fence on the same page mysteriously vanishes. → rules 3 and 4.
3. **Cites vitest's in-source testing as a way to test documentation examples, because the name sounds adjacent.** It is a same-file unit-testing feature with no Markdown awareness at all. → Finding 2.
4. **Writes a fresh, untested `go` fence to illustrate an API, instead of pointing at the real `Example` function that already exists and is already checked by `go test`.** The duplicate silently drifts the moment the real API changes. → rule 5.
5. **Recommends a long-dead package (`jsdoctest`, `markdown-doctest`, `tsdoc-testify`) because it is the first search result for "javascript doctest," without checking a last-publish date.** All three are 4+ years stale. → Finding 3.
6. **Wires a rewrite-in-place tool into CI and calls it "tested," without a second check that would catch the tool quietly accepting a broken command's new output as correct.** → rule 6.

## Contested / evolving

**`fence-tier-rendering`, closed.** `docs-examples.md`'s own open question asked whether tier-suffixed fences degrade to plain text or break, and speculated that if highlighting breaks, "an attribute-based marking is the better shape." The measurement in Finding 7 resolves this the opposite way. Highlighting does degrade for a hyphen-tagged unknown tier, on every generator, but it degrades safely: plain text, preserved structure, preserved class attribute for any grep-based check. An attribute-based (space-separated) marking is not safer, it actively corrupts the page under MkDocs Material, the fleet's most common generator (7 of 9 real sites). The hyphenated single-token convention DOC-EX-05 already uses stays the shape, and gets raised from SHOULD to MUST for the separator rule specifically, because this failure mode reaches past the one fence it is attached to.

**`ts-tested-examples`, closed.** `tested-example-gate.md` named TypeScript as a language with no mainstream doctest tool, "not yet settled." Two exist and are both current as of September 2026: Twoslash for type-level claims, `deno test --doc`/`deno check --doc-only` for execution. Neither is a stopgap. Both are maintained, documented, and enforce a real failure (Twoslash by throwing, Deno by returning a nonzero test exit code). The remaining gap, a project that wants neither dependency, now has a shipped, tested, zero-dependency floor (Finding 6), matching the shape DOC-EX-04 already asks for.

**`recording-cost-current`, partially closed.** The script count (35, 59% over the 22-script baseline) is now confirmed current, not a further-stale extrapolation. The wall-clock timing estimate from the 22-script baseline was not independently re-run, for the concrete, stated reason in Finding 8 (shared live registry/Sigstore infrastructure, out of this program's file scope). This should be named explicitly as a remaining gap rather than silently carried forward as if it had been re-measured, the next research pass with dedicated infrastructure should close it.

## Sources

| URL or path | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [`packages/twoslash/src/validation.ts`](https://github.com/twoslashes/twoslash/blob/main/packages/twoslash/src/validation.ts) | Twoslash core source, read directly | Repo pushed 2026-06-22 | The exact throw behavior on an undeclared compiler error, primary and load-bearing for rule 1 |
| [Twoslash README](https://github.com/twoslashes/twoslash) (repo) | Project overview and status | Archived predecessor 2025-05-16, current repo active | Confirms the successor org and that the project is not archived |
| [shiki.style/packages/vitepress](https://shiki.style/packages/vitepress) | `@shikijs/vitepress-twoslash` usage docs | Current, fetched 2026-09-05 | The exact ` ```ts twoslash ` fence convention and config snippet |
| [`docs.deno.com/runtime/test/doc_tests/`](https://docs.deno.com/runtime/test/doc_tests/) | Deno documentation-tests guide | Last updated 2026-06-15 | The exact recognized fence tags and the `ignore` attribute syntax |
| [`docs.deno.com/runtime/reference/cli/test/`](https://docs.deno.com/runtime/reference/cli/test/) | Deno `test` CLI reference | Last updated 2026-07-06 | Confirms `--doc` runs both JSDoc and Markdown |
| [Deno GitHub releases](https://github.com/denoland/deno/releases) | Release metadata | v2.9.6, 2026-08-27 | Current-version citation for Deno |
| [`vitest.dev/guide/in-source.html`](https://vitest.dev/guide/in-source.html) | Vitest in-source testing guide | v5.0.0, current | Confirms in-source testing has no Markdown/doctest mechanism, corrects the commission's premise |
| [`nodejs.org/api/typescript.html`](https://nodejs.org/api/typescript.html) | Node.js TypeScript support docs | Node v26.8.1, current | Confirms native `.ts` execution is stable since 23.6, type-stripping only, basis for the shipped harness's runner choice |
| [`pkg.go.dev/testing#hdr-Examples`](https://pkg.go.dev/testing#hdr-Examples) | Go `testing` package reference | Current | Verbatim rules for Example functions and Output/Unordered output comments |
| [`campoy/embedmd` README](https://raw.githubusercontent.com/campoy/embedmd/master/README.md) | embedmd project docs | Repo pushed 2026-04-11, 807 stars | The transclusion mechanism recommended for Go docs pages |
| [`highlightjs/highlight.js` `src/highlight.js`](https://github.com/highlightjs/highlight.js/blob/main/src/highlight.js) | highlight.js core source, read directly | main branch, package.json version 11.12.0 | The exact `blockLanguage`/`languageDetectRe` logic behind mdBook's fence-tier behavior |
| npm registry API (`registry.npmjs.org/<pkg>`) for `twoslash`, `@shikijs/twoslash`, `@shikijs/vitepress-twoslash`, `vitepress-plugin-twoslash`, `tsdoc-testify`, `jsdoctest`, `markdown-doctest`, `@power-doctest/markdown`, `vitest`, `tsx`, `highlight.js`, `runme`, `bun-types` | Direct registry metadata queries | Queried 2026-09-05 | Primary version and last-publish-date source for every JS/TS tool named in this file |
| GitHub API (`gh api repos/<org>/<repo>`) for `twoslashes/twoslash`, `bashup/mdsh`, `zimbatm/mdsh`, `campoy/embedmd`, `princjef/gomarkdoc`, `runmedev/runme`, `basnijholt/markdown-code-runner`, `drupol/markdown-code-runner`, `harehare/mq-task` | Direct repo metadata queries (archived flag, last push, stars) | Queried 2026-09-05 | Primary maintenance-status source for every non-npm tool named in this file |
| [`drupol/markdown-code-runner` README](https://raw.githubusercontent.com/drupol/markdown-code-runner/main/README.md) | MDCR project docs, read directly | Repo pushed 2026-07-23 | The `mdcr-skip` flag and `--check` CI mode, the cleanest current example of the bind-and-assert generic shape |
| [`basnijholt/markdown-code-runner` README](https://raw.githubusercontent.com/basnijholt/markdown-code-runner/main/README.md) | Python markdown-code-runner docs, read directly | Repo pushed 2026-08-14 | The rewrite-in-place contract, contrasted against MDCR in Finding 5 |
| [`harehare/mq-task` README](https://raw.githubusercontent.com/harehare/mq-task/main/README.md) | mq-task project docs, read directly | Repo pushed 2026-09-03, marked under active development | A fourth, younger example of the generic shape, flagged as experimental rather than recommended |
| `mdbook 0.5.3` local build | This research's own scratch build (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/mdbook-test/`) | Built 2026-09-05 | Primary, measured evidence for mdBook's fence-tier behavior, Finding 7 |
| `mkdocs-material 9.7.7` local build via `uvx --from mkdocs-material==9.7.7 mkdocs build` | This research's own scratch build (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/mkdocs-test/`), config matched to `ocx-catalog/mkdocs.yml` | Built 2026-09-05 | Primary, measured evidence for the MkDocs Material corruption finding, the headline result of Finding 7 |
| `vitepress 1.6.4` and `2.0.0-alpha.16` local builds via `npx vitepress build` | This research's own scratch build (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/vitepress-test/`) | Built 2026-09-05 | Primary, measured evidence for VitePress/Shiki's graceful degradation, confirmed against both the "latest" tag and ocx's actual pinned alpha |
| `run_doc_examples.py` fixture run | This research's own scratch harness and fixtures (`scratchpad/wave2/tested-examples-beyond-shell-python-rust/harness-test/`) | Run 2026-09-05 | Primary, measured proof the shipped DOC-EX-04 harness actually catches a broken example |
| `ocx/test/doc_scripts/*.sh`, `ocx/test/recordings/` | Direct read and `pytest --collect-only` run against ocx's real test tree | Repo state 2026-09-05 | Primary re-measurement of the `recording-cost-current` script count, Finding 8 |
| `ocx-catalog/mkdocs.yml` | Direct read of the fleet's real MkDocs config | Repo state 2026-09-05 | The exact `pymdownx.superfences` config the fence-tier test was built to match |
