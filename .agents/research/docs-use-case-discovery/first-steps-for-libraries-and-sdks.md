---
title: First steps for libraries and SDKs
topic: docs-use-case-discovery
group: docs-use-case-discovery
wave: 2
agent: docs-use-case-discovery-libraries-scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 28
scope: >
  Commission from the wave-1 critique's "Surfaces never studied" #7: no rule
  varies by product shape, and two fleet sites (ocx-sdk-python, ocx-mirror-sdk)
  are library/SDK docs where "reach a working command" is not the first-steps
  shape. Fetched 9 library quickstarts across Python, Rust and TypeScript
  (requests, httpx, pydantic, polars, serde, reqwest, tokio, zod, axios) plus
  Stripe's actual first-API-request page, and Google's and Microsoft's public
  guidance on client-library and API onboarding. Measured ocx-sdk-python and
  ocx-mirror-sdk against what those sources show.
revises:
  - .agents/research/docs-use-case-discovery.md
---

# First steps for libraries and SDKs

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The universal exit condition: a value, not a command](#1-the-universal-exit-condition-a-value-not-a-command)
  2. [The install-import-call budget, measured](#2-the-install-import-call-budget-measured)
  3. [Three library sub-shapes, and which one needs a precondition](#3-three-library-sub-shapes-and-which-one-needs-a-precondition)
  4. [How tiering works without a step count](#4-how-tiering-works-without-a-step-count)
  5. [How tested examples bind, and where the binding breaks](#5-how-tested-examples-bind-and-where-the-binding-breaks)
  6. [The reference contract for a wrapper SDK](#6-the-reference-contract-for-a-wrapper-sdk)
  7. [Google's and Microsoft's guidance is thinner than assumed](#7-googles-and-microsofts-guidance-is-thinner-than-assumed)
  8. [ocx-sdk-python measured against the result](#8-ocx-sdk-python-measured-against-the-result)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A library or SDK quickstart never ends at "a command ran." It ends at one printed, returned, or asserted value the reader can see. All 9 fetched examples (Python, Rust, TypeScript) end this way, with zero exceptions.
- The CLI/hosted-service step-count model does not transfer. 0 of 9 library quickstarts use a numbered list. DOC-DISC-15's ordered-list-item counter returns zero on every one of them. That is a silent false negative, not a pass.
- Word budget before the first command holds up as a proxy, but it must be counted from the nearest example-introducing heading, not the document top. Serde's front page runs 320 words before its first code block, all pitch and philosophy, because that page is landing and quickstart at once.
- Three library sub-shapes need three different preconditions. A pure library (pydantic, zod, serde's local structs) needs nothing but the install. A network library (requests, httpx, reqwest, axios) needs a live network call, so all four route their first example to a public sandbox endpoint (httpbin.org, jsonplaceholder.typicode.com). A wrapper SDK over a CLI or hosted service (ocx-sdk-python, Stripe) needs the wrapped thing present first and cannot reach a zero-setup first example at all.
- Stripe's actual first-API-request page is CLI-shaped, not library-shaped. It runs `stripe customers create ...` in a shell, not a language SDK snippet. This confirms the original CLI/hosted-service calibration was accurate for its own shape. The category error was applying it unmodified to libraries.
- ocx-mirror-sdk's flagship "fully runnable" examples are 5 of 6 broken today. A June 2026 breaking-change commit (`eca608f`) moved `list_releases` into `github`/`gitlab` submodules. The example files under `examples/` still import the old top-level name. Nobody has touched either file since. `mkdocs build --strict` runs on every change to `examples/**` and has never failed, because a strict markdown build checks links, not Python imports.
- ocx-sdk-python's docs, by contrast, run through Sybil on every pull request via a required `contract` CI job (`task test:contract`, gated by `OCX_SDK_CONTRACT=1`). Its equivalent example cannot silently rot the same way.
- Requests, httpx and pydantic write their first example as a REPL transcript (`>>>` or `#>`), so the shown output IS the executed output. This satisfies "show a printed value" for free, with no separate prose claim that can go stale.
- Two of ocx-sdk-python's own reference pages exist only as mkdocstrings directives (4 to 109 words). They read as stubs by the fleet's 150-word threshold but are not deletable, because their real content renders at build time. ocx-mirror-sdk has 7 more pages of the same shape, accounting for a chunk of its measured 94% stub rate.
- ocx-sdk-python's `reference/command-map.md` publishes a full command-to-method parity table with an explicit per-command support tier (T1 typed, T2 escape-hatch, T3 excluded by design, and a mark for never wrapped). This is the fleet's only instance of a wrapper-library reference contract and is worth codifying as a pattern, not just praising once.
- ocx-sdk-python's quickstart dodges the existing tab/code-group branching ban with plain prose. "or, with `pip`:" reads as a second install path with no `<Tabs>` or `::: code-group` syntax for the grep to catch.
- Google's public style guide page on code samples covers line-wrapping and comment conventions only. It says nothing about sample scope, minimal-first ordering, or showing output. The frame's hypothesis that big-company style guides "own" this territory does not hold for library-onboarding strategy specifically.
- Microsoft's public contributor guide no longer publishes a type-specific "how to write a quickstart" template page. The known URL pattern returns 404. Microsoft's REST API Guidelines govern wire-format API design, not client-library onboarding. Neither source yielded usable guidance here.
- Diataxis's tutorial contract (linear path, every step visible, tested with real users) applies to libraries exactly as written. Nothing about it is CLI-specific. It needed no library-specific carve-out.
- Pydantic annotates each line of its first example with a numbered comment (`# (1)`, `# (2)`) tied to a legend below the block. This replaces prose narration between steps. It is a usable alternative to a walked tutorial for a single-page quickstart that still chains two or three concepts.

## Findings

### 1. The universal exit condition: a value, not a command

Every one of the 9 fetched library/SDK quickstarts ends its first example
by printing, returning, or asserting a concrete value. None of them end by
stating that a command ran without error.

| Source | First observable value |
|---|---|
| [requests](https://requests.readthedocs.io/en/latest/user/quickstart/) | `>>> r.status_code` shows `200` |
| [httpx](https://www.python-httpx.org/quickstart/) | `>>> r` shows `<Response [200 OK]>` |
| [pydantic](https://pydantic.dev/docs/validation/latest/get-started/) | `print(user.id)` shows `#> 123` |
| [polars](https://docs.pola.rs/user-guide/getting-started/) | `print(df)` shows a rendered table |
| [serde](https://serde.rs/) | `println!(...)` shows `serialized = {"x":1,"y":2}` |
| [reqwest](https://docs.rs/reqwest/latest/reqwest/) | `println!("body = {body:?}")` |
| [tokio](https://tokio.rs/tokio/tutorial/hello-tokio) | `println!(...)` shows `result=Some(b"world")` |
| [zod](https://zod.dev/) | `console.log(data.name)` |
| [axios](https://axios.rest/pages/getting-started/first-steps) | `console.log(response.data)` |

This generalizes the CLI framing rather than replacing it. A CLI's "reach a
working command" and a hosted service's "get back an object with an `id`
field" (Stripe, see finding 3) are both specific instances of the same
underlying contract. Call it **one observable value, not a status message
and not silence.** DOC-DISC-18 already states this correctly at the rule
level ("a printed value, a new file or a rendered page is stated within
that step"), and nothing in it is CLI-specific. What was missing was naming
the library instance of the pattern at all, so an agent reading only
CLI/hosted-service worked examples (Twilio, Supabase, uv, ocx) would
reasonably conclude the pattern requires a terminal.

### 2. The install-import-call budget, measured

DOC-DISC-15's current verification counts `^\s*\d+\.` ordered-list items
plus shell fences from the H1 to the first success marker. Run that counter
against the 9 library pages and it returns **zero list items on 9 of 9**,
because none of them structure their first example as a numbered walkthrough.
They alternate prose and code blocks instead. The counter does not fail
loudly. It returns 0 and looks like a page with no measurable structure at
all: a silent false negative rather than a pass or a fail.

Counting fenced code blocks from the page's own example-introducing heading
to the first block whose output is shown gives a real, comparable number.

| Source | Words before first block | Code blocks to first shown output |
|---|---:|---:|
| httpx | ~10 | 2 |
| reqwest | 16 | 1 |
| pydantic | ~95 | 1 |
| polars | ~2 (language picker) plus install line | 2 |
| zod | ~160 | 1 |
| tokio | ~275 | 2 (Cargo.toml and main.rs) |
| axios | ~287 | 1 |
| serde | ~320 | 1 |
| ocx-sdk-python quickstart.md | 4 | 1 (install), then 1 (call) |

Two things fall out of this table. First, the code-block count never
exceeds 2 for a library's very first example. The DOC-DISC-15 "above nine
actions must name external systems" carve-out is not being tripped by any
library in this set, so the threshold itself does not need to move, only
the unit being counted. Second, the word count varies by 160x, from 2 to
320, because several of these pages are landing page and quickstart in one
document. Serde.rs and tokio.rs both open with philosophy and a feature
pitch before the first runnable line. Counting from the document's H1
would make serde's page look like a DOC-DISC-16 violation on a widely-cited,
well-regarded reference site. Counting from the nearest heading that
actually introduces the runnable snippet keeps the rule honest about what
it is actually measuring: runway before the command, not runway before the
pitch.

### 3. Three library sub-shapes, and which one needs a precondition

The 9 examples split cleanly into three sub-shapes by what has to be true
before the first call can succeed.

- **Pure library, zero external dependency.** pydantic, zod, and serde's
  local-struct example need nothing beyond the install. polars needs
  nothing beyond the install for its in-memory `DataFrame` construction.
  The entire budget fits in one code block after the install line.
- **Network library, needs a live endpoint but no account.** requests,
  httpx, reqwest and axios all route their first call to a public,
  unauthenticated, stable sandbox endpoint: `httpbin.org`,
  `jsonplaceholder.typicode.com`, or (reqwest) `rust-lang.org` itself. The
  reader needs network access and nothing else. No signup, no key.
- **Wrapper SDK over a CLI, service or runtime, needs that thing present
  first.** ocx-sdk-python wraps the `ocx` binary. Its simplest live call
  (`Ocx(); ocx.version()`) is explicitly conditioned in prose on "a pinned
  binary already on PATH" (`ocx-sdk-python/docs/guide/quickstart.md`), and
  the full bootstrap-to-exec journey above it is marked `python-no-run`
  (illustrative only, compile-checked, never executed) because it needs
  network access to fetch a real binary. Stripe's actual first-API-request
  page (`docs.stripe.com/get-started/api-request`, fetched 2026-09-05,
  served in German by default from this vantage point) needs a Stripe
  account and a generated secret key before any call, and its own worked
  example runs through the Stripe CLI or Stripe Shell, not a language SDK.
  Tokio's hello-world needs a running Mini-Redis server process before the
  client call succeeds, the same shape of precondition in Rust.

The load-bearing point: a rule that assumes every library quickstart can
reach a zero-setup verified result (the pure and network shapes) will
misfire on the third shape, which is exactly the shape ocx-sdk-python is,
and exactly the shape most SDKs over a hosted service are (Stripe, Twilio,
any cloud provider's client library). The correct rule names the
precondition explicitly rather than assuming it away.

### 4. How tiering works without a step count

ocx-sdk-python's structure is the clearest fleet instance of the three-tier
model (first steps, everyday, integration) applied to a library rather than
a CLI.

- **First steps**: `docs/index.md` (254 words, a landing/nav hybrid), then
  `docs/guide/quickstart.md` (443 words, the canonical CI journey: bootstrap,
  resolve, pull, exec).
- **Everyday**: `docs/guide/{bootstrap,projects,authoring,vendoring}.md`.
  Concept-organized guide pages, not more quickstarts.
- **Integration**: `docs/guide/hermetic-ci.md` (601 words, threat-model
  levers for an untrusted build) and `docs/guide/concepts/*` (compatibility,
  concurrency, errors-and-security).
- **Reference, addressable from any tier**: `docs/reference/{api,command-map,
  compatibility-checklist,environment}.md`.

This matches DOC-DISC-13's finding that tier and type are independent axes
and reference sits outside the progression. The library case needed no new
axis, only the confirmation that the axis holds up off a CLI.

The technique worth naming: instead of narrating two or three chained
concepts in prose between numbered steps (the tutorial-linearity shape),
pydantic annotates the first example inline with numbered comments (`# (1)`
through `# (10)`) tied to a legend immediately below the block
(`pydantic.dev/docs/validation/latest/get-started/`, fetched 2026-09-05).
ocx-sdk-python does the same thing structurally with a bullet list
immediately under its quickstart code block, one bullet per call
(`bootstrap.ensure()`, `Ocx(exe=...)`, `ocx.project(path)`,
`project.pull()`, `project.exec([...])`), each linking straight into the
reference page for that symbol. Both let a single quickstart page chain
multiple concepts without becoming a tutorial, because the explanation
sits beside the code rather than walking the reader through separate typed
commands one at a time.

### 5. How tested examples bind, and where the binding breaks

Two mechanisms exist in the fleet already (`tested-examples-mechanism.md`
section 3, reconfirmed here), and this commission adds one concrete
failure case neither wave 1 nor DOC-EX-01 measured directly: whether the
binding actually holds today.

**ocx-sdk-python** (`ocx-sdk-python/conftest.py:1-90`): Sybil wires five
markers over `docs/**/*.md` and `README.md`. `python` runs unconditionally.
`python-contract` is skipped unless `OCX_SDK_CONTRACT=1`. `python-acceptance`
is skipped unless `OCX_SDK_ACCEPTANCE=1`. `python-no-run` is compile-checked
only via `ast.parse`, for snippets that need infrastructure the test run
cannot provide. Doctest's own `>>>` blocks run through Sybil's
`DocTestParser`. The `contract` job in `.github/workflows/ci.yml:81-87` runs
`task test:contract` (`OCX_SDK_CONTRACT=1 pytest tests/contract docs
README.md`) on every pull request, `needs: verify`. So the gated tier is not
opt-in in practice. It runs on the required path, every time.

**ocx-mirror-sdk** has no equivalent binding at all. Its `docs.yml` workflow
rebuilds the static site (`mkdocs build --strict`) whenever `examples/**`
changes, and `mkdocs-material`'s `pymdownx.snippets` plugin
(`mkdocs.yml:126-127`, `base_path: [examples, docs/snippets, .]`) transcludes
those files verbatim into `docs/getting-started/first-generator.md` and
three of the four `docs/recipes/*.md` pages via `--8<-- "01_shellcheck_rest.py"`
syntax. A strict markdown build checks links and anchors. It does not import
the transcluded Python file. Verified directly:

```
$ cd ocx-mirror-sdk && .venv/bin/python examples/01_shellcheck_rest.py
Traceback (most recent call last):
  File ".../examples/01_shellcheck_rest.py", line 14, in <module>
    from ocx_mirror_sdk import IndexBuilder, list_releases
ImportError: cannot import name 'list_releases' from 'ocx_mirror_sdk'
```

Running all six files under `examples/` the same way, **5 of 6 fail**. Four
fail with `ImportError` (`01_shellcheck_rest.py`, `02_python_build_standalone_
graphql.py`, `04_combined_index.py`, `05_error_handling.py`) and one fails
with a `TypeError` (`06_gitlab_rest.py`, calling
`gitlab.list_releases("gitlab-org", "gitlab-runner")` against a function
that "takes 1 positional argument but 2 were given"). Only
`03_extract_urls_notes.py` runs clean, because it is the one example that
touches no network-facing symbol from the moved API.

`git log` on the failing file dates the break precisely. `eca608f` ("feat
(api)!: scope list_releases to github/gitlab subpackages", 2026-06-01)
moved the symbol the example imports. Neither `examples/01_shellcheck_rest.py`
nor `docs/getting-started/first-generator.md` has a commit since. Three
months, one required-looking green "docs" workflow, zero working "fully
runnable" examples out of four advertised on `docs/recipes/index.md:3`
("Each recipe is a fully runnable PEP 723 script, copy-paste and execute").

This is the concrete, dated instance behind DOC-EX-01's own rationale
("stops a documented command from drifting away from the tool it
demonstrates"), and it happened on a repo this program's own fleet audit
had already flagged for its stub rate without anyone running the code.

### 6. The reference contract for a wrapper SDK

`ocx-sdk-python/docs/reference/command-map.md` is the fleet's only instance
of a coverage table for a library that wraps something else. Every `ocx`
CLI command is listed against its SDK method (or lack of one) and a closed
support-tier enum:

```
T1 commands are typed and CI-covered. T2 commands are real but not yet
typed (reach them through invoke / invoke_async). T3 commands are
interactive, shell-session, or not-a-frozen-contract, and stay
invoke-only by design. A fourth mark means never wrapped.
```

This is a stronger, more falsifiable contract than a prose claim of "wraps
the CLI." An agent, or a human, can check any given command against exactly
four buckets, and the table format makes an unlisted command visible by its
absence. `ocx-mirror-sdk` has no equivalent for its wrapped surfaces
(GitHub REST/GraphQL, GitLab REST). Its `docs/api/index.md` lists public
symbols by module, which is closer to a plain export index than a coverage
claim, and it would not have caught the drift in finding 5 because the
table never asserted the two-argument call shape was wrong. It simply
never made the claim testable.

### 7. Google's and Microsoft's guidance is thinner than assumed

The frame's hypothesis 1 ("big-company style guides own most of what
matters") does not hold for library-onboarding strategy specifically.

**Google.** `developers.google.com/style/code-samples` (fetched
2026-09-05) covers line-wrapping ("Wrap lines at 80 characters"), how to
mark a code block as preformatted, and how to indicate omitted code ("Don't
use three dots or the ellipsis character"). It says nothing about sample
length, showing the smallest useful call first, or showing output.
`docs.cloud.google.com/apis/docs/client-libraries-explained` (redirected
from `cloud.google.com`, fetched 2026-09-05) describes the difference
between Cloud Client Libraries and Google API Client Libraries at a
marketing level and defers all quickstart content to "the documentation
for the specific Google Cloud product." Neither page contains the
onboarding-strategy guidance the frame's hypothesis predicted.

**Microsoft.** The known public URL pattern for a type-specific "how to
write a quickstart" contributor template
(`learn.microsoft.com/en-us/contribute/content/how-to-write-quickstart` and
two other guessed variants) returns HTTP 404 as of 2026-09-05. The current
public contributor guide index
(`learn.microsoft.com/en-us/contribute/content/`) covers account setup and
contribution mechanics only. It does not link a quickstart-writing
template. Microsoft's REST API Guidelines
(`github.com/microsoft/api-guidelines`, `azure/Guidelines.md`, fetched
2026-09-05) mention client libraries exactly once, in the context of how
API design choices (extensible string enums) aid client-library code
generation. It is a wire-format design document, not client-onboarding
guidance. Neither source yielded usable guidance for this commission, and
both absences are worth recording rather than silently substituting a
different source and implying it was asked for.

**Diataxis**, by contrast, needed zero library-specific adjustment. Its
tutorial contract (fetched and verified in wave 1: linear path, no
branching, every step produces a comprehensible result, tested with real
users) is stated at a level of abstraction that a Python REPL transcript
satisfies exactly as well as a CLI walkthrough. Nothing in this commission's
fetches contradicted it.

### 8. ocx-sdk-python measured against the result

| Contract element | ocx-sdk-python | Verdict |
|---|---|---|
| Install-import-call budget | 4 words to first fence (`docs/guide/quickstart.md`) | Best in the fleet, better than 7 of 9 external examples |
| First observable value | `print(ocx.version())` under a `python-contract` marker, executed in the required `contract` CI job | Present and gated correctly (finding 5) |
| Tiering (first steps, everyday, integration) | index, then quickstart, then guide/*, then guide/concepts/* and guide/hermetic-ci.md | Matches the three-tier model cleanly (finding 4) |
| Reference coverage contract | `reference/command-map.md`, T1/T2/T3/excluded | Exemplary. The pattern to codify (finding 6) |
| Branching ban (DOC-DISC-17) | "or, with `pip`:", a second install path in plain prose, no Tabs/code-group syntax | Evades the existing grep (item 4 below) |
| Tier/type frontmatter (DOC-DISC-13) | None on any page | Same fleet-wide gap `docs-use-case-discovery.md` already names, not new here |
| Stub exemption for generated reference (DOC-DISC-09/10) | `reference/api.md` is 109 words, a pure mkdocstrings stub | Currently only exempt if tiered `first-steps`. Needs the broader carve-out in item 6 below |

## Normative guidance candidates

1. **Declare a product shape (`cli`, `library`, `hosted-service`, or
   `framework`) once per repository, and read it before applying any
   first-steps threshold.**
   Rationale: DOC-DISC-15/16/17/18/19 were calibrated on CLI and
   hosted-service exemplars (Twilio, Supabase, uv, ocx) and misfire when
   applied unmodified to a library, per findings 2 and 3 above.
   Verification: unverified: reading heuristic. A reviewer confirms the
   project's docs config (`mkdocs.yml` extra, `pyproject.toml` tool table,
   or a `docs.toml`) states one of the four shape values, and that the
   thresholds below cite it.
   Severity: CONSIDER (argued: this program designed the mechanism, and no
   external source names a `product_shape` config key).
   Evidence: argued.
   NEW beside DOC-DISC-13.

2. **For `library` shape, count fenced code blocks from the nearest
   example-introducing heading to the first block with shown output,
   not ordered-list items.**
   Rationale: 0 of 9 fetched library quickstarts use a numbered list.
   DOC-DISC-15's current counter silently returns zero on all of them
   (finding 2).
   Verification: count ```` ```<lang> ```` fences between the nearest H2/H3
   that introduces the runnable example and the first fence whose output
   is shown (a following `#>`, a `>>>` result line, or a `println!`,
   `console.log` or `print` call). Flag when the count exceeds 4 without a
   named second external system.
   Severity: SHOULD (matches DOC-DISC-15's existing severity).
   Evidence: measured (finding 2 table, 9 of 9 sources).
   CHANGES DOC-DISC-15 (adds a library-shape verification branch. The
   underlying "verified result, not a step count" principle is unchanged).

3. **For `library` shape, measure the DOC-DISC-16 word budget from the
   section heading that introduces the first runnable snippet, not the
   document's H1.**
   Rationale: several library front pages are landing page and quickstart
   in one document. Counting from the document top flags well-regarded,
   widely-used docs (serde: 320 words, tokio: 275 words) as violations for
   running marketing copy before the pitch's own quickstart section, not
   before the command itself (finding 2).
   Verification: identify the nearest heading whose following block is a
   fenced code sample the reader is meant to run, then count words from
   that heading, not from the H1. Keep the existing ~100-word threshold.
   Severity: SHOULD (matches DOC-DISC-16's existing severity).
   Evidence: measured (serde and tokio counter-examples).
   CHANGES DOC-DISC-16 (counting method only).

4. **Broaden the DOC-DISC-17 branching grep to catch a prose-alternative
   install path, not only tab/code-group component syntax.**
   Rationale: `ocx-sdk-python/docs/guide/quickstart.md` presents `uv add
   ocx-sdk`, then "or, with `pip`:" as sequential prose. That is the same
   reader-facing choice DOC-DISC-17 exists to keep off a linear page, with
   no `<Tabs>` or `::: code-group` for the current grep to catch (finding 8).
   Verification: extend the existing pattern
   `(::: ?code-group|<Tabs|=== "|\{% tab)` with an alternation for
   `(?i)\b(or,? with|alternatively|if you (use|prefer))\b` appearing
   between two fenced blocks of the same language. Any hit on a page typed
   `tutorial` fails. The same text passes on a `how-to` or an untyped
   quickstart, matching DOC-DISC-17's existing `applies to` column.
   Severity: MUST (matches DOC-DISC-17's existing severity. This only
   closes a verification gap in an already-MUST rule).
   Evidence: measured (one live fleet instance).
   CHANGES DOC-DISC-17 (verification only).

5. **Accept a REPL/doctest-style output line as satisfying DOC-DISC-18's
   "a printed value is stated" test, without requiring a redundant prose
   sentence.**
   Rationale: requests, httpx and pydantic all write their first example
   as a transcript (`>>> r.status_code` shows `200`, or `print(user.id)`
   shows `#> 123`), where the output line itself is the proof, not a claim
   about it. A reviewer reading DOC-DISC-18's verification literally ("a
   printed value ... is stated within that step") could wrongly demand
   added prose next to an already-self-evident transcript (findings 1 and 5).
   Verification: reading heuristic (unchanged: still un-lintable), extended
   to explicitly count a `>>>`-prefixed result line, a `#>` comment line, or
   an inline `// prints ...` or `# Prints ...` comment as satisfying the
   check on its own.
   Severity: MUST (matches DOC-DISC-18's existing severity).
   Evidence: measured (requests, httpx, pydantic).
   CHANGES DOC-DISC-18 (verification scope, no threshold change).

6. **Exempt any reference page whose body is almost entirely a
   build-time generator directive from the stub half of the delete test,
   regardless of its declared tier.**
   Rationale: `ocx-sdk-python/docs/reference/api.md` (109 words, a
   `mkdocstrings` `:::` directive) and 7 of `ocx-mirror-sdk/docs/api/*.md`
   pages (4 to 139 words each, same `:::` pattern) read as stubs under the
   fleet's 150-word threshold, but they render a full API surface at build
   time. DOC-DISC-10 currently only exempts a page tiered `first-steps`.
   These are reference pages, a different tier, and would otherwise sit on
   the delete list they do not belong on (finding 8, table row 7).
   Verification: before applying the `<150 words` half of the delete
   intersection, grep the page for a generator directive
   (`^:::\s`, `\.\. auto(class|module|function)::`, or an
   `#\[doc\(...\)\]` or `impl_index!`-style re-export marker for a
   language-appropriate equivalent). A hit exempts the page from the stub
   half regardless of `tier`.
   Severity: SHOULD (matches DOC-DISC-10's existing severity).
   Evidence: measured (8 fleet pages across two repos).
   CHANGES DOC-DISC-10 (widens the exemption beyond `first-steps` tier).

7. **A wrapper library or SDK publishes a command/method (or
   endpoint/method) parity table with a closed, named support tier per
   entry, not prose describing what it wraps.**
   Rationale: `ocx-sdk-python/docs/reference/command-map.md`'s closed
   tier enum makes coverage falsifiable per command. `ocx-mirror-sdk`'s
   plain symbol-by-module index (`docs/api/index.md`) does not, and would
   not have caught the signature drift in finding 5, because it never made
   a per-symbol claim to check against (finding 6).
   Verification: grep the reference tree for a table whose header row
   contains a tier legend, and confirm every row's tier value is drawn from
   that closed enum (no free-text tier values). CONSIDER extending to a
   cross-check that every top-tier row names a symbol that actually
   appears in the package's public export list.
   Severity: SHOULD (measured from one exemplary instance, argued for
   generalizing past it, since no second fleet instance exists to confirm
   the pattern scales).
   Evidence: measured plus argued.
   NEW beside DOC-TYPE-18 (the existing OpenAPI-operation-list parity
   rule. This is the same shape of contract for a CLI-or-service wrapper
   instead of a REST surface).

8. **Every file a docs page transcludes (`--8<--`, `literalinclude`, or
   equivalent) sits inside the same required test gate as the docs tree
   itself, or the page states plainly that it is untested.**
   Rationale: `ocx-mirror-sdk`'s `pymdownx.snippets` plugin proves a
   transcluded file renders into the page. It proves nothing about whether
   that file runs. A strict `mkdocs build` has passed on every commit since
   the June 2026 breaking change that broke 5 of 6 transcluded examples,
   because a markdown build checks links and anchors, never a transcluded
   file's own correctness (finding 5).
   Verification: exact command. For every path referenced by the site's
   snippet plugin's `base_path` directories (`mkdocs.yml`'s
   `pymdownx.snippets.base_path`, or the equivalent config for another
   generator), run it as its declared language would run it (`python
   <file>`, `cargo build --example <name>`, and so on) and require a zero
   exit code as part of the same required check that gates the docs build.
   Reproduced today: `python examples/01_shellcheck_rest.py` through
   `examples/06_gitlab_rest.py` in `ocx-mirror-sdk`, 5 of 6 fail (finding 5).
   Severity: MUST.
   Evidence: measured (reproduced directly, dated to commit `eca608f`,
   2026-06-01, unfixed as of 2026-09-05).
   CHANGES DOC-EX-01 (adds an explicit transclusion-source clause. The
   existing rule already requires "one automated test in the same required
   gate." This closes the gap where a build step is mistaken for that
   test).

9. **Narrow DOC-DISC-22's scope to hosted-service and multi-tenant CLI
   quickstarts. A pure or network library has no dev/production mode to
   caveat.**
   Rationale: DOC-DISC-22 (state production scope of a dev-only quickstart)
   was calibrated on Supabase, where the quickstart's own hardcoded key
   literal is a dev-only default. None of pydantic, zod, serde, polars,
   requests, httpx, reqwest or ocx-sdk-python's own quickstart show an
   insecure or dev-only default. A pure library's API is identical in
   every environment, and ocx-sdk-python's SDK simply calls the one real
   `ocx` binary the same way in dev and CI.
   Verification: reading heuristic. A project declaring `library` shape
   with no environment-conditional default (test key, sandbox mode, or a
   `dev`/`prod` flag) in its first example is exempt from this rule by
   construction. A project declaring `hosted-service` or a multi-tenant
   `cli` is not.
   Severity: SHOULD (matches DOC-DISC-22's existing severity. This is a
   scope narrowing, not a strength change).
   Evidence: measured (0 of 8 pure/network library sources show a
   dev/prod distinction).
   CHANGES DOC-DISC-22 (`applies to` column narrows for library shape).

## AI-agent angle

Ranked by how often it bites when an agent writes or reviews a first-steps
page for a library or SDK.

1. **Imports the CLI's "reach a working command" framing wholesale onto a
   library.** An agent that has just read Twilio's or Supabase's quickstart
   writes a library first-steps page around a shell command instead of a
   printed value, because that is the shape it saw most recently. Caught by
   item 1's product-shape declaration plus DOC-DISC-18 read as
   value-agnostic (finding 1).
2. **Transcludes an example file into a docs page and calls that
   "tested."** The single most expensive failure measured here. An agent
   sees `--8<-- "example.py"` render correctly in a built site and
   concludes the example works, when the transclusion plugin only ever
   checked that the file exists and parses as markdown-embeddable text.
   Caught by item 8, actually executing every transcluded file in the
   required gate, the same check that would have caught `eca608f`'s drift
   within one PR instead of three-plus months later (finding 5).
3. **Flags a generated-reference stub for deletion.** An agent running
   the discovery procedure's stub test (DOC-DISC-09) against a 4-line
   `mkdocstrings`/autodoc directive page sees a word count under 150 and
   lists it for deletion, destroying the pointer to a full
   build-time-generated API surface. Caught by item 6's directive grep,
   run before the word-count check (findings 6 and 8).
4. **Writes "or, with pip:" instead of a Tabs component to sneak past a
   branching-ban grep it half-remembers.** Not necessarily deliberate
   evasion. An agent trained mostly on prose-heavy install sections
   reaches for prose first, and the existing DOC-DISC-17 grep happens not
   to fire on it. Caught by item 4's broadened pattern (finding 8).
5. **Invents a step-count or word-count violation on a page that is
   actually fine, because it counted from the document's H1 on a
   dual-purpose landing-and-quickstart page.** An agent auditing serde.rs
   or tokio.rs cold would flag 320 or 275 words as a DOC-DISC-16 violation
   without noticing the page is doing two jobs. Caught by item 3's
   heading-relative counting (finding 2).
6. **Assumes every library example can run standalone with no
   precondition, and writes a "just works" quickstart for a wrapper SDK
   that actually needs a live binary, key, or server first.** This
   produces a page whose own first example fails for every real reader,
   the inverse of the DOC-DISC-18 problem. Caught by naming the three
   sub-shapes explicitly (finding 3) and requiring the precondition to be
   stated before the call, the way ocx-sdk-python's own quickstart already
   does ("If a pinned binary is already on `PATH`...").

## Contested / evolving

**"Reach a working command" versus "reach an observable value."** The
commission's own framing named the CLI exit condition as the thing that
"is not the shape" for a library. Resolved in finding 1: the library case
does not need a new exit condition. It needs the existing DOC-DISC-18
contract (a stated, observable result) recognized as the general rule, of
which "a working command" was always only the CLI's specific instance. No
rule needs to be replaced. DOC-DISC-15/18's language should stop implying
a terminal is required.

**Fixed step/word budgets calibrated on Twilio and Supabase versus the
library evidence.** Resolved in finding 2: neither the CLI/hosted-service
calibration nor the library evidence is wrong on its own ground. The
counting mechanism must branch on declared product shape (ordered-list
items for CLI/hosted-service, fenced-code-blocks-from-the-nearest-heading
for library). The underlying principle, a verified result rather than an
arbitrary count, is shape-independent and unchanged.

**Does a passing docs build prove the examples work?** Not named by the
commission but surfaced directly by measurement. No. `ocx-mirror-sdk`'s
`mkdocs build --strict` job has been green through a breaking API change
that left 5 of 6 "fully runnable" examples broken for three-plus months.
Resolved in finding 5 and item 8: a docs-site build checks the site, not
the code inside it. Only executing the transcluded file, or the doctest
inside it, closes this gap, and no fleet repo currently does this for
`ocx-mirror-sdk` specifically, in contrast to `ocx-sdk-python`, which does.

**Does "install-plus-import-plus-call" always fit in one code block?**
No, resolved in finding 3. It does for a pure library (pydantic, zod) and
usually for a network library (requests, httpx), but a wrapper SDK over a
CLI, runtime, or hosted service (ocx-sdk-python, Stripe, Twilio, tokio's
own Mini-Redis example) needs a stated precondition first and cannot
promise zero setup. A rule that assumes otherwise will misfire specifically
on the sub-shape, the wrapper SDK, this commission was asked to look at.

**Do Google's and Microsoft's style guides own SDK-onboarding strategy, per
the frame's hypothesis 1?** No, for this specific slice. Resolved in
finding 7: both public sources found are either formatting-level (Google)
or absent (Microsoft's quickstart-template page returns 404, and its API
guidelines cover wire format, not client onboarding). Diataxis, not either
company style guide, is the source that transferred cleanly to libraries
with zero modification.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [requests.readthedocs.io/en/latest/user/quickstart/](https://requests.readthedocs.io/en/latest/user/quickstart/) | Requests (Python) quickstart | fetched 2026-09-05 | REPL-transcript style, `r.status_code` as the exit value |
| [python-httpx.org/quickstart/](https://www.python-httpx.org/quickstart/) | httpx (Python) quickstart | fetched 2026-09-05 | 2-line budget to a `<Response [200 OK]>` |
| [pydantic.dev/docs/validation/latest/get-started/](https://pydantic.dev/docs/validation/latest/get-started/) | Pydantic (Python) get-started | fetched 2026-09-05 | Numbered-comment annotation legend, `#>` output convention |
| [docs.pola.rs/user-guide/getting-started/](https://docs.pola.rs/user-guide/getting-started/) | Polars (Python/Rust) getting-started | fetched 2026-09-05 | Printed-dataframe exit value, dual-language framing |
| [serde.rs](https://serde.rs/) | Serde (Rust) overview/front page | fetched 2026-09-05 | Landing-plus-quickstart hybrid, 320-word runway before the example |
| [docs.rs/reqwest/latest/reqwest/](https://docs.rs/reqwest/latest/reqwest/) | reqwest (Rust) crate docs | fetched 2026-09-05 | Tightest budget measured (16 words) |
| [tokio.rs/tokio/tutorial/hello-tokio](https://tokio.rs/tokio/tutorial/hello-tokio) | Tokio (Rust) tutorial, first page | fetched 2026-09-05 | Runtime-as-library shape, needs a live Mini-Redis process first |
| [zod.dev](https://zod.dev/) | Zod (TypeScript) homepage | fetched 2026-09-05 | `.parse()` plus `console.log`, ~160-word runway |
| [axios.rest/pages/getting-started/first-steps](https://axios.rest/pages/getting-started/first-steps) | Axios (JavaScript) getting-started (redirected from axios-http.com) | fetched 2026-09-05 | `console.log(response.data)` exit value |
| [docs.stripe.com/get-started/api-request](https://docs.stripe.com/get-started/api-request) | Stripe first-API-request page | fetched 2026-09-05 | Confirms hosted-service shape is CLI-based, not SDK-based, at the very first step |
| [developers.google.com/style/code-samples](https://developers.google.com/style/code-samples) | Google Developer Documentation Style Guide, code samples page | fetched 2026-09-05 | Confirms Google's public guidance here is formatting-only |
| [docs.cloud.google.com/apis/docs/client-libraries-explained](https://docs.cloud.google.com/apis/docs/client-libraries-explained) | Google Cloud client-libraries overview (redirected from cloud.google.com) | fetched 2026-09-05 | Confirms Google defers onboarding strategy to per-product docs |
| [github.com/microsoft/api-guidelines (azure/Guidelines.md)](https://raw.githubusercontent.com/microsoft/api-guidelines/vNext/azure/Guidelines.md) | Microsoft REST API Guidelines | fetched 2026-09-05 | Confirms scope is wire-format design, not client onboarding |
| [learn.microsoft.com/en-us/contribute/content/](https://learn.microsoft.com/en-us/contribute/content/) | Microsoft Learn contributor guide index | fetched 2026-09-05 | Confirms the type-specific quickstart-template page is not publicly reachable as of this date |
| [diataxis.fr/tutorials/](https://diataxis.fr/tutorials/) | Diataxis, tutorials | verified 2026-09-05, reused from wave 1 | Every step produces a comprehensible result. Transfers to libraries with no change |
| [diataxis.fr/tutorials-how-to/](https://diataxis.fr/tutorials-how-to/) | Diataxis, tutorials vs how-to | verified 2026-09-05, reused from wave 1 | No-branching contract, source for item 4's grep |
| `/home/mherwig/dev/ocx-sdk-python/conftest.py` | Sybil wiring, 5 markers over docs and docstrings | repo state 2026-09-05 | The mechanism behind finding 5's positive case |
| `/home/mherwig/dev/ocx-sdk-python/docs/guide/quickstart.md` | ocx-sdk-python's first-steps page | repo state 2026-09-05 | 4-word budget, precondition-stated wrapper-SDK pattern, the prose-branching instance |
| `/home/mherwig/dev/ocx-sdk-python/docs/index.md` | ocx-sdk-python's landing/nav page | repo state 2026-09-05 | Landing-plus-nav hybrid, tier entry points |
| `/home/mherwig/dev/ocx-sdk-python/docs/reference/{api,command-map}.md` | ocx-sdk-python's reference tree | repo state 2026-09-05 | The stub-exemption case and the parity-table exemplar |
| `/home/mherwig/dev/ocx-sdk-python/.github/workflows/ci.yml`, `taskfile.yml` | ocx-sdk-python's CI config | repo state 2026-09-05 | Confirms the `contract` job runs on every PR, gating docs execution |
| `/home/mherwig/dev/ocx-mirror-sdk/docs/{index,getting-started/*,recipes/*,api/*}.md` | ocx-mirror-sdk's full docs tree | repo state 2026-09-05 | The stub-exemption case, the "fully runnable" claim, the broken transclusions |
| `/home/mherwig/dev/ocx-mirror-sdk/examples/*.py` plus `git log -p` on the affected files | ocx-mirror-sdk's transcluded example scripts and their history | repo state 2026-09-05 | Reproduced the 5-of-6 failure, dated to commit `eca608f` (2026-06-01) |
| `/home/mherwig/dev/ocx-mirror-sdk/src/ocx_mirror_sdk/{__init__,github/_router,gitlab/_rest}.py` | ocx-mirror-sdk's actual exported API | repo state 2026-09-05 | Confirms the examples' imports are genuinely broken, not an alternate valid signature |
| `.agents/research/docs-audit/docs-shape.md` (sections 2, 4, 5) | Wave-1 fleet measurement | 2026-09-05 | Stub-share and page-type baseline for both SDKs |
| `.agents/research/docs-use-case-discovery.md` (DOC-DISC-13 through 22) | Wave-1 consolidation this file revises | 2026-09-05 | The rule set every finding above changes or sits beside |
| `.agents/research/docs-examples.md` (DOC-EX-01 through 03) | Wave-1 tested-example rule family | 2026-09-05 | DOC-EX-01/03, changed and confirmed respectively |
