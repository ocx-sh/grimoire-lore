# code-docs-cleanup

A procedure for shortening the comments in existing source files without
losing a guard. A guard is the clause that says why a non-obvious line must
stay as it is, and what breaks if it changes. The skill runs on the files a
change already edits, or as a sweep of named files, one file per commit.

```sh
grim add ghcr.io/ocx-sh/lore/code-docs-cleanup
```

It stops when three things hold. `cleanup_check.py` exits 0 against the base.
Every shortened guard has a proof, either an owner that failed on its breaking
edit or a cold re-check that recovered the reason. The commit holds prose only.

## Guard first, clause by clause

There are ten steps. The first seven edit prose and the last three prove it.
Every block is split into clauses, and each clause is tagged before anything
is cut. In agent-written code most comment lines are guards and contracts, so
deleting by category or by length deletes guards.

- A clause is deleted outright only when it is positively identified. That
  means narration, tautology, a banner, a bare ID, or provenance that holds
  nothing in place.
- A guard is rewritten as its constraint plus its consequence. It gets one
  sentence per breaking edit, at the line it guards.
- An argument moves to a decision record, and one pointer stays behind.
- A clause that fits no row stays.

## A pointer has to earn it

A guard shrinks to a one-line pointer only when every breaking edit it names
has an owner that was watched to fail. The edit is applied in a scratch
worktree, the named test runs, and its red result is read.

Three things are never owners. A test that only shares the guard's nouns is
one. A compile error from an orphaned import is another. A check that merely
demands a comment is the third.

## The editing agent is not the judge

The agent's own sense that the meaning survived counts for nothing. The
structural check derives everything from the diff, so the agent never writes
its own grading input. It fails a changed code line, help string or directive.
It fails a paraphrase left beside its pointer, and any touched test, lock or
generated file.

Each shortened guard then gets a fresh read-only session. That session is
asked the unled question first ("Why is it written this way? Could it be
written differently without changing anything that matters?"), and only then
the led one.

## What is in it

The procedure body is 405 lines. It holds the ten steps, a never-touch
table and the eight cleanup-safety rules (CLN-01 to CLN-08) it owns. It
restates the thirteen merge-blocking findings it surfaces, each with its rule
ID. Three references sit beside it: the clause decision list, the
reason re-check prompts and scoring, and the failure modes with their tells.

## What it does not cover

The comment standards themselves are the `code-docs` rule's. Text that renders
to users is out of scope, because changing it is an interface change. That
covers `--help`, JSON Schema, MCP tool descriptions and published API docs.
User-facing documentation pages belong to `docs-quality`. Commented-out code,
a type that could own a guard, and a lint to enable are each reported for a
change of their own.

## Sibling

It needs the `code-docs` rule installed, because the checks it runs ship in
that rule's `checks/` directory. The Rust, Python, TypeScript, Go and JVM
essentials bundles install both.
