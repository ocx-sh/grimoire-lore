# Corpus Map

You loaded this file because you need to know *what to survey* for a
given language — the five corpora a scout wave covers, and where each one
lives per ecosystem.

Contents: [The Five Corpora](#the-five-corpora) ·
[Finding a Corpus for Any Language](#finding-a-corpus-for-any-language) ·
[Rust](#rust) · [Python](#python) · [TypeScript / JavaScript](#typescript--javascript) ·
[Go](#go) · [Domain Corpora](#domain-corpora) ·
[Source Quality](#source-quality)

## The Five Corpora

| Corpus | What it yields | Why it is irreplaceable |
|---|---|---|
| Canonical guides | The curriculum: every chapter, item, and checklist ID | Defines the shape of the field; a table of contents is a topic list somebody already ranked |
| Practitioner writing | Argued positions, with the reasoning | Where the real tradeoffs get stated; books state the rule, blogs state when it is wrong |
| Codified practice | Rules an organisation thought worth *enforcing* | The intersection of "true" and "checkable" — exactly what a rule file needs |
| Failure corpus | Antipatterns, review objections, postmortems | Finds the topics no curriculum lists, because they are only visible after something broke |
| Recent shifts | What changed, and what advice it invalidated | The model's training data is old; this corpus is the only defence against confidently stale rules |

Skipping the failure corpus produces a textbook. Skipping recent shifts
produces a textbook from three years ago.

## Finding a Corpus for Any Language

Mechanical recipe when the language is not listed below:

1. **Canonical**: the official book/tour, the language reference, the
   standard-library API guidelines, the official style guide, and the
   two or three universally-cited third-party books. Fetch their tables
   of contents.
2. **Codified**: search `<language> style guide` scoped to
   google.github.io, engineering blogs of large adopters, and national
   security agencies; then the language's dominant linter's **complete
   rule index** — the rule list is a taxonomy of what goes wrong, and
   every rule exists because the mistake was common.
3. **Practitioner**: find the 8–12 authors the community cites by name —
   they surface fast in "best `<language>` blogs" plus the language's
   weekly newsletter archives and conference talk indexes.
4. **Failure**: `<language> antipatterns`, `<language> mistakes`, "things
   I wish I knew", plus **merged pull-request review threads in two or
   three flagship repositories** — the recurring reviewer objection is
   the project's real rule set, and it is rarely written down anywhere
   else.
5. **Shifts**: release notes for the last four to six versions, the
   deprecation list, and the "X is dead, use Y" churn in the package
   ecosystem. Produce a `use X not Y in <year>` table.

## Rust

- **Canonical**: The Rust Book, the Reference, the Rustonomicon, the
  Style Guide, the Cargo Book, the Edition Guide; the **Rust API
  Guidelines** C-* checklist; the **Rust Design Patterns** book
  (`rust-unofficial/patterns`) with its idiom / pattern / **anti-pattern**
  sections; *Effective Rust* (all items), *Rust for Rustaceans*, *Rust
  Atomics and Locks*, *Zero to Production*, *Programming Rust*; the Async
  Book and the Tokio topic list.
- **Codified**: the **complete clippy lint index by group** (correctness
  / suspicious / style / complexity / perf / pedantic / nursery /
  restriction / cargo) and the rustc lint list; Google's Rust style
  guide, Android's Rust guidelines, Fuchsia's rubric; the Rust Secure
  Code WG and RustSec; a national-agency secure-coding guide; the
  Safety-Critical Rust Consortium's coding guidelines; `cargo-deny` /
  `cargo-vet` docs as policy-as-config.
- **Practitioner**: matklad, fasterthanlime, Alice Ryhl, withoutboats,
  Niko Matsakis, Jon Gjengset, Yosh Wuyts, Predrag Gruevski, Mara Bos,
  Pascal Hertleif, corrode.dev, Luca Palmieri; RustConf/EuroRust talks;
  engineering blogs from Cloudflare, Discord, Astral, Deno, Zed, AWS.
- **Failure**: the anti-patterns section of the patterns book; review
  threads in `rust-lang/cargo`, `tokio-rs/tokio`, `astral-sh/uv`,
  `rust-lang/rust-analyzer`; production postmortems (unbounded channels,
  blocking the runtime, release-mode overflow, path/unicode bugs).
- **Shifts**: edition 2024 changes; AFIT/RPITIT, async closures,
  let-else, `LazyLock`, `unsafe_op_in_unsafe_fn`, `static mut`
  restrictions; MSRV-aware resolver, `[lints]`, workspace inheritance;
  ecosystem churn (hyper/http 1.0, thiserror 2, syn 2, clap 4, rustls
  default, `lazy_static`/`structopt`/`error-chain` retired).

## Python

- **Canonical**: the language reference and data model, PEP 8 / 484 /
  557 / 604 / 695, the typing spec, *Fluent Python*, *Effective Python*,
  *Architecture Patterns with Python*; the stdlib docs for
  `asyncio`, `contextlib`, `dataclasses`, `pathlib`.
- **Codified**: the **ruff rule index** (it subsumes flake8 plugin
  families, so it doubles as a taxonomy of Python mistakes), pylint's
  message index, mypy/pyright strictness settings, bandit's checks,
  Google's Python style guide.
- **Failure**: mutable default arguments, late binding closures, the GIL
  and threads-vs-processes, `asyncio` blocking, packaging and import
  shadowing, `__del__`, circular imports, pickle security.
- **Shifts**: uv/ruff displacing pip-tools/black/flake8/isort;
  free-threaded builds; the typing generics syntax; `pyproject.toml` as
  the single manifest.

## TypeScript / JavaScript

- **Canonical**: the TypeScript handbook and release notes, MDN, the
  Node.js docs (streams, worker threads, ESM), *Effective TypeScript*,
  the type-challenges corpus.
- **Codified**: the **typescript-eslint rule index** and its
  type-aware rule set, Biome's rules, `tsconfig` strictness flags
  (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  Google/Airbnb style guides.
- **Failure**: `any` leakage, structural-typing surprises, `unknown` vs
  `any`, enum pitfalls, ESM/CJS interop, floating promises, `this`
  binding, date/timezone handling, supply-chain incidents in npm.
- **Shifts**: ESM-only packages, Node's built-in test runner and type
  stripping, the bundler/runtime churn, `satisfies`, const type
  parameters.

## Go

- **Canonical**: Effective Go, the spec, the Go Blog's design posts, the
  standard library's own code as style reference, *Learning Go*.
- **Codified**: `go vet` checks, staticcheck's complete check index,
  golangci-lint's linter roster, Google's Go style guide (its
  decisions/best-practices split is unusually explicit and portable).
- **Failure**: loop-variable capture (and its language fix), nil
  interface vs nil pointer, goroutine leaks, context misuse, error
  wrapping, slice aliasing, `defer` in loops.
- **Shifts**: generics adoption patterns, `log/slog`, structured
  concurrency proposals, toolchain and workspace mode.

## Domain Corpora

The same five-corpus shape works beyond languages. Substitute:

| Domain | Canonical | Codified | Failure |
|---|---|---|---|
| Infrastructure as code | Provider docs, the module registry's conventions | `tflint`/`checkov`/`conftest` rule sets, cloud well-architected frameworks | Post-incident writeups, drift and state-corruption stories |
| SQL / data | The engine's manual, query-planner docs | Linter rule sets, index-design guides | Slow-query and migration postmortems |
| Frontend | Framework docs, platform specs | Accessibility rule sets (axe/WCAG), performance budgets | Core Web Vitals field data, a11y audit findings |

## Source Quality

Rank sources when they conflict:

1. **Normative**: the language spec, the standard library docs, an
   accepted RFC, the tool's own documentation.
2. **Measured**: a benchmark, a study, an incident report with numbers.
3. **Codified**: a lint rule or an organisational style guide — evidence
   that somebody enforces it at scale.
4. **Argued**: a well-reasoned blog post from a recognised practitioner.
5. **Asserted**: everything else, including the model's own priors.

A rule that rests only on level 4 or 5 ships as CONSIDER, never MUST.
When levels 1 and 4 disagree, the disagreement itself is the finding —
record it under "Contested" rather than silently picking one.

### Sweep a Catalogue; Do Not Cite It

A curated catalogue — the language's patterns/anti-patterns book, its
linter's rule index, its API-guidelines checklist — is a **coverage
instrument**, not a source to quote from. Dives cite the two or three
pages they already needed, which produces citations and no coverage
evidence: the pages nobody thought to open are exactly the uncovered
topics the catalogue exists to reveal.

Commission one worker per catalogue whose deliverable is a full
enumeration, fetched from the book's own index or `SUMMARY.md` rather
than recalled, as a table: *page · what it says in one line · still
correct today? · already reflected in our rules (yes/partial/no) · worth
adopting?* Hand it the list of rule families already published so
"already reflected" means checked, not guessed. The **no** rows are the
deliverable; every one becomes a candidate rule or an explicit decision
not to have one.

Two things fall out of the sweep that nothing else finds. Community
catalogues are unevenly maintained, so a page written years ago and
never revised is now confident bad advice an agent will quote — the
sweep dates each page against the current language version. And a whole
section nobody's dives touched is a structural gap in the rule set, which
is a finding even when the decision is to leave it uncovered.
