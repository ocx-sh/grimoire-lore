# Validation

You loaded this file because the artifacts are written and you are about
to publish or install them.

Contents: [The Two Halves](#the-two-halves) ·
[Machine Checks](#machine-checks) · [The Script](#the-script) ·
[Trigger Evals](#trigger-evals) · [Content Review](#content-review) ·
[Publishing Gate](#publishing-gate)

## The Two Halves

Structure is machine-checkable; behaviour is not. Run both.

| Half | Question | How |
|---|---|---|
| Structure | Will this load at all? | `scripts/check-artifacts.py`, plus the packager's own validator |
| Behaviour | Does it fire, and does it change the diff? | Trigger evals and a baseline run |

The two failures look identical from the outside: nothing happens. A rule
with a dead glob and a skill with a weak description are both content
nobody loads.

## Machine Checks

| Invariant | Failure it catches |
|---|---|
| Frontmatter `name` == directory name; charset legal | The artifact silently never registers |
| Description ≤ 1024 chars, one line, third person, has a "Use when" clause, does not open with a workflow verb | Undertriggering, or the description replacing the body |
| Skill body < 500 lines; rule body < 200 | Context bloat that degrades adherence to everything else |
| Any file over 100 lines has a table of contents | Partial reads that miss half the file |
| Every relative link resolves | Depth the agent is told to read and cannot |
| Every bundled file is referenced from somewhere | Dead weight nobody routes to |
| Every scoped glob matches ≥ 1 real file | The dead-glob hazard after a rename — silent, no error |
| Rule IDs unique across the package | Review output citing an ambiguous ID |
| Every rule ID cited in prose is defined by some rule table | A cross-reference to a rule that was renamed, merged, or left behind in the research — reads authoritative, resolves to nothing |
| Every rule row has a non-empty verification cell | Unenforceable advice that looks enforced |
| Catalog keys in the right place for the artifact kind | Metadata silently absent from the catalog |
| No project-internal strings in a shareable artifact | Leaking paths, hostnames, or internal tool names |

## The Script

`scripts/check-artifacts.py` implements the table above. Run it; do not
read it.

```sh
# Everything in one pass, with glob liveness resolved against the repo
./scripts/check-artifacts.py skills/ rules/ --root .

# A shareable package: also fail on internal names
./scripts/check-artifacts.py skills/my-skill --forbid acme-internal --forbid /home/

# Verify the checker itself still works
./scripts/check-artifacts.py --self-test
```

Exit 0 is clean, 1 is findings, 2 is a bad invocation. It needs python3
and nothing else. It understands a skill directory (a directory holding
`SKILL.md`), a rule file with an optional sibling support directory, and
a directory containing either.

Wire it into CI on every change to the artifacts. A structural check that
runs only when someone remembers is a structural check that does not run.

## Trigger Evals

Structure passing means it loads. It does not mean it fires.

For each skill, before publishing:

1. **Three should-trigger phrasings**, written as real user utterances,
   not as the skill's own vocabulary. If the only phrasing that triggers
   it is the description read back, the description is a tautology.
2. **One should-not-trigger neighbour** — a nearby task that must stay
   quiet. Overtriggering is as expensive as undertriggering.
3. **A baseline without the artifact.** If the model does the task
   correctly anyway, the artifact is not earning its tokens. Delete it or
   sharpen it to the part that actually failed.

For each rule, the equivalent: open a file the glob claims to cover, in a
fresh session, and confirm the rule's content is present in context.
Scoped rules on most clients fire on *read*, not on *create* — a
convention for new files needs a different carrier.

Run the evals against every model tier you target. Smaller models need
more explicit guidance; a rule tuned only against the strongest one will
under-perform where it is most needed.

## Content Review

Machine checks and evals both pass on well-formed nonsense. Read the
artifacts once with these questions:

- **Deletion test, per line**: would removing it cause a mistake?
- **Contradiction sweep**: does any rule conflict with a sibling, or with
  the always-on file? Two contradicting rules are worse than neither.
- **Verification honesty**: does each verification command actually
  detect the violation? Run one or two against a deliberately broken
  file and confirm they fail — a check that cannot go red proves nothing.
- **Single source of truth**: does any fact appear in two files? The
  copies will diverge. Designate an owner and link.
- **Era check**: is anything version-specific unlabelled?

## Publishing Gate

Order matters — each step catches a class the next one would only find
later:

1. Machine checks clean.
2. Trigger evals pass, including the should-not-trigger neighbour.
3. Content review done, contradictions resolved.
4. The packager's own validator run and its *warnings* read, not just its
   exit code — warn-and-drop keys are silent data loss once shipped.
5. A dry run that prints exactly what would be published, reviewed
   before the real one.
6. Catalog metadata present and in the right location for the kind.

Then publish. Re-run step 1 in CI forever after.
