---
rule_version: code-docs procedure v0 (2026-09-27)
frozen_for: reason-recovery eval, rules arm
sources: code-docs-guards.md, code-docs-cleanup.md, code-docs-routing.md, code-docs-ratchet.md, code-docs-linkage.md
---

# Comment cleanup procedure, v0

You rewrite ONE comment block. Every line outside the block stays byte-identical,
including code, tool directives, licence headers and fenced code inside doc comments.
Your output replaces the block in place: same position, same indentation.

## 1. Split the block into clauses and tag each

| Tag | Test | Action |
|---|---|---|
| guard | Names a constraint whose breach a plausible edit would cause, with or without the consequence | Keep (step 2) |
| contract | What a caller must know without opening the body: behaviour, errors, panics, preconditions, units | Keep, 1-3 lines |
| why | A non-obvious local reason that is not a guard (why this approach, why this value) | Keep, one sentence |
| pointer | Names a tracked file, a symbol, an RFC or spec section, an issue URL | Keep if it resolves; drop if the target is untracked or missing |
| argument | Weighs alternatives, tells the design story, restates a decision record | Drop; if a tracked record already holds it, keep one pointer to that record |
| narration | The next code line already says it | Drop |
| tautology | The item's name and type already say it | Drop |
| process ID | A bare plan, contract, work-package, review-round or decision ID with no file | Drop the ID; keep the constraint it labelled |
| provenance | Past tense, no present obligation, no number | Drop; if it guards against a regression, rewrite it as a present-tense guard |
| banner | Section markers, decorations | Drop |

A clause that fits no row stays. When unsure between guard and anything else, it is a guard.

## 2. Write each guard as fact plus consequence

- State the constraint and the concrete consequence of breaking it: "X must hold, or Y happens."
  Name the tempting edit only when the constraint does not imply it, and name the sibling it
  must not be unified with when that is the risk.
- Present tense. A fact, never a command to the reader ("do not", "never touch" become "X is
  required because Y").
- One sentence per breaking edit. Never merge several guards into one vague line; every edit
  the original forbade keeps its own sentence.
- A test may replace a guard only when it is named in the original block AND the block says
  the test fails on the breaking edit. Then keep one line naming the test function.
- No marker prefix. `SAFETY:` stays where the language uses it.

## 3. Pick the register

- Doc comment (`///`, docstring, `/** */`): only what a caller who never opens the body needs.
- Plain comment (`//`, `#`): implementation hazards. When a doc block holds an implementation
  hazard, the rewritten block may turn it into a plain comment at the same position.

## 4. Length caps

- Plain comment block: at most 5 lines.
- Doc comment block: at most 10 lines in an application package, 15 in a library package.
- If the guard clauses alone exceed the cap, keep them all; tighten wording, never drop a guard.

## 5. Output

Return the replacement lines exactly as they will appear in the file, with the original
indentation and comment syntax, or an empty list when every clause is dropped.
