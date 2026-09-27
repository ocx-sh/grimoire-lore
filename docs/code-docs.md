# code-docs

Comment standards for code that AI agents mostly write and read. Blocks stay
short, and none loses the clause that says why a non-obvious line is written
that way and what breaks if it changes. The set holds the gate, fifteen
merge-blocking non-negotiables, five depth files routed to by task, and five
checks.

```sh
grim add ghcr.io/ocx-sh/lore/code-docs
```

It loads on every source extension its census reads. That is Rust, Python
and its .pyi stubs (loaded, not measured), TypeScript and JavaScript, Go,
Java, Kotlin, Swift, C#, Scala, C and C++, plus the script blocks of Vue,
Svelte and Astro files. The index is 199 lines and always present. A depth file is read
only when the work calls for it.

## Two failures, in opposite directions

Left alone, an agent writes a six-line guard where a human writes two. It puts
the guard in the doc comment that every caller's hover shows. It bundles
several guards into one essay and tops it with the plan ID it was working on.
Told to shorten, it cuts the consequence clause first, because that clause
reads like padding.

So this set does not ask for fewer comments. It holds a floor and a ceiling at
once. A comment that protects a line keeps its constraint and the concrete
consequence of breaking it, through every edit. Every other clause is capped,
moved to where it belongs, or deleted. A decision record, a test's doc comment
and a path-scoped rule are the usual homes.

## What agents get wrong by default, measured

Measured on agent-written and human-written code in September 2026:

- **Guards are the mass, not essays.** Guards and contracts carry most agent
  comment lines. Agent guards run a median of 6 lines against 2 for human
  ones. A third of agent guards run past 10 lines, against none of 39 human
  ones.
- **Agents put guards in the wrong register.** Half of agent guards sit in doc
  comments, against under a fifth of human ones.
- **Deleting by category buys almost nothing.** Narration, tautology, bare IDs
  and provenance are under 3% of agent comment lines. Cutting by length or by
  a history phrase hits live guards as often as dead text.
- **Plan vocabulary leaks.** An agent working on a plan item writes the item's
  ID into the comment. From there it reaches `--help`, JSON Schema and MCP tool
  descriptions, where a user cannot resolve it.
- **Named tests are not proven owners.** Crediting a test by its name was
  wrong or incomplete at 7 of 22 guards once the breaking edit was applied.
- **The human reference is short.** Plain blocks have a 90th percentile of 3
  lines in apps and libraries alike. Doc blocks run 6 lines in apps and 13.5
  in libraries.
- **A cut is safe only as a rewrite.** In a blind eval, cold agents were
  asked why 25 real guarded lines are written that way. Rewriting each guard
  to its constraint and consequence halved the comment lines and lost no
  recovered reason. Deleting the comment, truncating it to its first line,
  replacing it with a record pointer, or leaving a test to carry it alone
  each lost 10 to 31 points of recovery.

## What is in it

The index carries the gate, the fifteen non-negotiables, the caps, and a table
that routes every clause a comment can hold. There are 51 rules in total. Of
those, 22 block a merge, 26 warn and 3 suggest.

| Depth file | Owns | Rules |
|---|---|---|
| `guards.md` | What a protecting comment says, its register, and when a test, lint or type may own it | 12 |
| `routing.md` | Where each clause goes, and when a test carries a guard | 12 |
| `linkage.md` | Process IDs, the one record-pointer form, and records that cite moved code | 14 |
| `surfaces.md` | Doc text a generator copies into help, schemas, tool lists and API docs | 5 |
| `length.md` | The caps, how the census counts a block, and the per-file ratchet | 8 |

The `checks/` directory ships five Python scripts that need only the standard
library. Each has its own `--self-test`.

| Script | Checks |
|---|---|
| `comment_census.py` | The caps, the ratchet, and a density report |
| `linkage_check.py` | Process IDs, record pointers, and records that cite moved paths |
| `interface_leak.py` | Text rendered into help and schemas |
| `guard_recogniser.py` | Likely guards, so nothing auto-cuts them. It never passes or fails an edit |
| `cleanup_check.py` | The structural diff gate the cleanup skill runs |

## Pinned decisions

The ratchet counts the lines in over-cap blocks per file, in production code.
It only ever goes down. New and grown blocks meet the caps outright. There is
no comment-to-code ratio target, because a ratio pays more for deleting a
guard than for shortening it.

Each default below is one an adopter overrides once, with the reason
recorded, never per file.

- The caps: 5 lines for a plain block, 10 for a doc block, and 15 for a public
  item in a library-kind package. The last is 20 for an adopter who declines
  section stripping.
- No package is library-kind until it is declared in `.code-docs.json`.
- Ten ID families are banned, and a repo adds its own.
- Which files count as decision records.

## What it does not cover

Language syntax stays with the language sets. That means rustdoc section
headers, docstring and JSDoc tag conventions, and the lints that demand a doc.
Markup files and user-facing pages belong to `docs-quality`. Shortening an
existing tree in bulk is a procedure, so it ships as a skill.

## Siblings

`code-docs-cleanup` shortens existing comments clause by clause, guard first.
It runs this set's checks as its gate. `docs-quality` owns markup and its
plain-English limits, which interface text here follows. The language quality
sets point here for comment length, placement and cuts. In `rust-quality`,
DOC-18 to DOC-20 defer to this set.

The Rust, Python, TypeScript, Go and JVM essentials bundles each include it.
