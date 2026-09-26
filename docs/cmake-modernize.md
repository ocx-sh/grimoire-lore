# cmake-modernize

A ten-step, once-per-repository procedure that takes a legacy
directory-scoped CMake tree to targets, then to installable and
`find_package`-consumable, each step closed by a command rather than a
rewrite. Not for a one-line `target_link_libraries` fix, which the
`cmake-build` rules cover without a procedure.

```sh
grim add ghcr.io/ocx-sh/lore/cmake-modernize
```

Run it on a tree that already configures and builds. It stops when the gated
round trip exits 0 on every CMake line CI runs, the as-subproject smoke
passes, and every inventory hit in the plan file is marked converted,
flagged-not-converted or vacuous.

## The gate runs from step 1, not step 8

Every configure this procedure runs, starting with the floor change in step
1, passes under the configure gate spelled for its binary: `-Werror=author`
on CMake 4.4 and newer, `-Werror=dev` on 4.3 and older. Passing
`-Werror=author` to a 3.31 or 4.3 leg exits 0 and does nothing, so the canary
runs on every leg before the procedure trusts any of it as evidence. Nothing
here is done because a build or an install went green: "done" is a command's
captured output, an exit code, a grep's lines, the round trip's last `_DIR`
line, written into the plan file next to the hit it closes.

## One target per diff, leaves first

Steps 2 through 4 move directory scope onto `target_*` commands one target at
a time, working from the leaves of the in-tree link graph upward, because a
parent's `PUBLIC` or `PRIVATE` choice is only decidable once the child is
already target-based. The floor change rides alone, never combined with a
content change, because a gate failure after a combined diff cannot be
bisected. Migrating a public command's argument parsing to `PARSE_ARGV`
changes what its callers get back: a multi-value keyword fed a variable that
itself holds a list keeps that list as one unflattened element under
`PARSE_ARGV`, where the legacy `${ARGN}` forward flattened it automatically,
so every such migration carries a flatten line right after the parse, or a
changelog entry naming the behaviour change.

## The round trip is the only proof of consumable

A green `cmake --install` is not the exit criterion for step 6. A missing
`find_dependency` in the Config template stays green through the exporter's
own build and install, and even through a `LANGUAGES NONE` smoke consumer,
and fails only when a compiled consumer runs its own Generate step. The four
install and export MUSTs the round trip depends on land together, in one
diff, because none of them alone produces a consumable package and the round
trip only means something run after all of them.

## What it refuses

Raising an existing `cmake_minimum_required` minimum: it reports the finding
and asks, the owner raises it in a diff of its own. Rewriting a file the
inventory did not name, or the whole tree in one pass. Touching a vendored
subtree, ever. Adding CPS export before the Config round trip is already
green on CMake 3.31. Adding `cmake-format` or `cmake-lint`. And editing a
`conanfile.*` or `vcpkg.json`: a Conan 1 token in the inventory stops the
procedure and hands off to `cpp-packaging` instead.

## Pinned defaults

The minimum stays as found. Only a three-dot `...<max>` is added, `<max>`
being the newest CMake the project's own CI runs, never the newest release.
The gate spelling splits at 4.4 as above. A migrated parse gets `PARSE_ARGV`
plus the flatten line. The plan file is `cmake-modernize-plan.md` at the
repository root, one row per inventory hit, unless the adopter names it
otherwise once.

## Siblings

`cmake-build`, whose rule text, rationale and verification back every rule
this procedure cites, and a disputed reading is settled there.
`cmake-dependency-triage` for a tree that does not configure yet, or that
resolves the wrong copy: this procedure assumes a working baseline and hands
off to it first. Bundled as `cmake-essentials` with both rules and
`cmake-dependency-triage`.
