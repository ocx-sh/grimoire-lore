# code-docs-cleanup: held-out confirmation round

Date: 2026-09-27. Driver: opus, acting as an adopter who has only the shipped
artifacts (`skills/code-docs-cleanup/`, `rules/code-docs.md`,
`rules/code-docs/`). Mode: sweep, one file per commit, BASE=HEAD before each
file. Clones (`/usr/bin/git clone --no-local`, never pushed):
`~/.cache/research-lang/code-docs-heldout/confirm/{kate-middlechild,ocx-mirror-sdk}`,
branch `code-docs-sweep`.

**Verdict:** the procedure ran end to end on both repos. The structural gate
blocked one edit, and that block was a false positive. Of the 4 re-check
probes, 2 passed. The other 2 matched their base version, so the rewrite stays
and a human reviews them. There are 16 defects: 1 blocker, 6 fix, 9 nit. The
blocker is the vendoring step. Copied into `.claude/rules/` as the skill
instructs, the rule loads about 104 KB of depth files, plus 40 fixture ADRs,
as always-on project rules.

## Setup (both repos)

- Setup step 1's `find` found no installed rule. The adopter followed the
  fallback: copy `code-docs.md` and `code-docs/` into `.claude/rules/`, then
  commit that alone (`4b83147` in kate, `cf505b3` in ocx). The copy carried 6
  `.pyc` files from the source tree's `__pycache__`; they were removed by hand
  before the commit (D10).
- Step 2: both self-tests exit 0 (cleanup_check has 37 cases and 0
  mismatches; the recogniser measures P=0.652 and R=0.430). Neither run wrote
  bytecode.
- Step 3: `git status --porcelain` is clean.
- Scope in-flight check: the clones' remotes are local paths, so `gh` prints
  `in-flight check unavailable` for every file. Checked by hand instead:
  - kate's original has a single worktree, one branch and no remote;
  - ocx upstream (`gh pr list -R ocx-sh/ocx-mirror-sdk`) has no open PR;
  - no ocx branch touches the scoped files.

## kate-middlechild (TypeScript, Astro)

Files in scope (top 3 by over-cap lines; tie at 33):

| File | Comment lines before → after | Over-cap lines before → after |
|---|---:|---:|
| `packages/core/src/map.ts` | 117 → 83 | 63 → 0 |
| `packages/core/src/dietary.ts` | 61 → 48 | 33 → 0 |
| `packages/web/src/islands/RecipeFilter.tsx` | 57 → 39 | 33 → 0 |
| **total** | **235 → 170** | **129 → 0** |

Comment lines are the census block lengths, prod scope. Commits:

- `ea8a9b3` map.ts
- `9b55303` dietary.ts
- `03225fc` RecipeFilter.tsx

### Guards

The worklist holds 14 guard rows.

**Shortened: 10**

- the union dissolve doc copies: both doc copies were cut, and the plain guard
  at its line stayed byte-identical;
- serializable result;
- the 560 px default;
- veganAdaptable;
- the override wins;
- filter predicates read only canonical fields;
- search against the resolved name;
- the sort comparator mirrors `sortDishes`;
- hydration;
- chip icon equals the DietBadge icon.

**Kept verbatim: 4**

- "Zero DOM / Astro / React / Node-only imports". It states no consequence, so
  a rewrite would have to invent one.
- "must be documented (never silently set in content)", for the same reason.
- The IngredientProperties note. Only the `R3` label was dropped; the stale
  field names are reported below.
- The `#explore` anchor guard. It is within the cap and untouched.

**Owned by a proven test** (planted edit in a scratch worktree, each red test
then run alone):

| Planted edit | Result |
|---|---|
| `union(polys)` replaced by `polys` | Red: "an admin region fully enclosed … does not become a hole" and "two adjacent admin regions … merge into one silhouette" |
| override spread order swapped | Red: 3 override-layer tests |
| `!hasGluten` dropped | All green: no owner |
| search `dish.slug` instead of `dish.name` | RecipeFilter browser suite green: no owner |
| vegan chip icon changed | Unit and browser suites green: no owner. e2e was not run on this edit |

None was shrunk to a pointer; the prose stays in every case.

### Re-check (step 9, 2 guards)

| Guard | Unled level | Led | Result |
|---|---|---|---|
| G-M1 union dissolve (`map.ts:232`) | Mechanism plus consequence. It names the Cordillera enclave hole and internal borders; evidence is the line comment, `map.test.ts` and `subsystem-core.md` | keep | **pass** |
| G-R2 search on the resolved name (`RecipeFilter.tsx:89`) | Literal run: the evidence cites commit `03225fc`'s body, so the run is void (D3). Rerun with Bash denied: Mechanism only | keep | **not passed**. The base probe (`9b55303`, Bash denied) scored lower (`CONSTRAINT: none`), so the rewrite stays and a human reviews it |

### Check results

- `cleanup_check.py`:
  - map.ts: a first run blocked on CLN-04 ("89% … reappears here"), a false
    positive (D2). Exit 0 after the original clause order was restored.
  - dietary.ts: exit 0, 0 review items.
  - RecipeFilter.tsx: exit 0 with one `CLN-02 review` item. The firing
    sentence was the deferred "Phase-1" note; its trigger and upgrade path
    survive.
  - Whole sweep against `4b83147`: exit 0, with the same 1 review item.
- GRD-11 `comm`: empty.
- `linkage_check.py ids`: `short_label_lines` 18 → 14 (the `R3` labels in
  dietary.ts).
- Chain, green at base and after every file:
  - biome lint and format check;
  - `tsc`, `astro check`;
  - `bun test` (149);
  - `astro build`;
  - vitest browser (158);
  - Playwright e2e (52).

  The e2e at base first timed out, for an environmental reason: an unrelated
  server already listened on port 4321. The e2e ran through a copy of the
  config on port 4399, kept in `.git/`. Nothing in the chain was red at base.
- Lefthook pre-commit (`biome check --write`, typecheck) passed on every commit
  and rewrote no prose.

### Left for another change

- dietary.ts: the IngredientProperties note names fields that do not exist
  (`containsShellfish`, `containsFish`).
- dietary.ts: the module doc calls patis "not halal", while `isNonHalal`'s doc
  calls fish halal.
- RecipeFilter.tsx: the doc says "Sort follows `sortDishes()`" and lists a
  `tags` filter, but `applySort` is local and no tag filter exists.
- The `R3` label remains in 4 comments in `fixtures.ts` and in the test file.
- `subsystem-core.md` already carries the dissolve rule (RTE-07). No per-file
  copy was deleted, because the at-line comment stays.

## ocx-mirror-sdk (Python, published SDK)

The package is published, but the default app caps were used (see D5).

| File | Comment lines before → after | Over-cap lines before → after |
|---|---:|---:|
| `src/ocx_mirror_sdk/gitlab/_auth.py` | 26 → 17 | 26 → 0 |
| `src/ocx_mirror_sdk/cache.py` | 74 → 72 | 25 → 23 |
| `src/ocx_mirror_sdk/github/_rest.py` | 53 → 49 | 14 → 0 |
| **total** | **153 → 138** | **65 → 23** |

cache.py stays over the cap, because its `Typical usage::` example is code
(D4). Commits:

- `b0e4d5e` _auth.py
- `2c17fe4` cache.py
- `d206f90` github/_rest.py

### Guards

The worklist holds 7 guard rows.

**Shortened (reworded): 7**

- `GITLAB_TOKEN` precedence;
- header mapping;
- a miss returns None, and only abnormal events raise;
- mtime freshness;
- small-page fallback on 502/503/504 or timeout;
- `per_page=100` default;
- inline assets.

**Kept verbatim: 0.**

**Owned by a proven test** (each red test then run alone):

| Planted edit | Red tests |
|---|---|
| precedence swapped | `test_list_releases_prefers_private_token_over_job_token` |
| fallback re-raises | 7 ids in 5 functions: `test_falls_back_to_small_page_on_overload[502/503/504]`, `test_timeout_at_default_page_falls_back`, `test_intermittent_page_504_at_fallback_size_retries_then_succeeds`, `test_page_504_exhausts_retries_then_raises`, `test_mid_body_connection_drop_retries_then_succeeds` |
| `_DEFAULT_PER_PAGE = 5` | 6 of the same ids, which fail for a fallback reason, not a request-count reason (D15) |

The scratch venv resolved to the scratch source (checked through
`__file__`). None was shrunk to a pointer, and the prose stays in every case.
The 504 mechanism also stays because the `_FALLBACK_PER_PAGE` comment says
"see module docstring" (D9).

### Re-check (step 9, 2 guards)

| Guard | Unled level | Led | Result |
|---|---|---|---|
| O-A1 precedence (`_auth.py:31`) | Mechanism plus consequence: an ambient `CI_JOB_TOKEN` silently overrides a deliberately set `GITLAB_TOKEN`. Evidence: the edited docstring | keep | **pass** |
| O-R1 fallback, 2 edits (`_rest.py:203`) | Mechanism. The answer explains `retries=0` and the `_is_overload` re-raise, but names neither the asset-heavy failure nor the request count unled | keep, keep. Both led answers name the consequences from the edited docstring | **not passed**. The base probe (`2c17fe4`) got the same level, so the rewrite stays and a human reviews it |

### Check results

- `cleanup_check.py`: exit 0 on every file with 0 review items; exit 0 over
  the whole sweep against `cf505b3`.
- GRD-11 `comm`: empty.
- Chain (`task verify`, plus `docs:build --strict` from CI), green at base and
  after every file:
  - ruff format check and ruff check;
  - pyright;
  - pytest (158);
  - coverage report;
  - mkdocs build.
- Doctests: the repo does not run `--doctest-modules`.

### Left for another change

- cache.py's usage example: move it to the caching guide, or change what LEN
  exempts (D4).
- Declaring the package library-kind (D5).

## Re-check summary

2 of 4 probes passed on the first run (km1, oa1). The other two (kr2, or1)
scored below the top, and their base versions scored no higher, so the rewrites
stay and a human reviews them. The kr2 literal run is void because its
evidence was a commit body (D3).

Each turn cost 0.39 to 0.70 USD, with sonnet and a 2 USD cap per turn.

## Defects

Severity: **blocker** must be fixed before ship, **fix** is a real
misdirection or misfire, **nit** is friction or a wording gap. "Known" names
the class from the first round.

### D1 · Setup step 1 (vendoring) · blocker · known class (fixtures tripping linters), new form: the client's rule loader

The skill says to copy `code-docs.md` and `code-docs/` into `.claude/rules/`.
Claude Code then loads every `.md` under `.claude/rules/` recursively.

- The 5 depth files have no `paths:` frontmatter, so they load
  unconditionally: about 104 KB, roughly 26k tokens, in every session.
- The 40 fixture `.md` files load as well. They are fake ADRs and decision
  records with text such as "owner decision 2026-07-18".

Verified: a fresh `claude -p --setting-sources project,local` session in the
kate clone listed the 5 depth files and quoted the fixture
`adr_index.md`'s heading ("# Index indirection") from its loaded context.
The step 9 probes therefore ran in a context no ordinary agent in the repo
would have. It was not checked whether a `grim add` install puts the files in
the same place.

**Smallest fix:** in the fallback, vendor the checks outside the rules
directory, for example `tools/code-docs/checks/` (Setup's `find` already
locates them anywhere). Keep `fixtures/` out of the installed artifact. Give
each depth file a `paths:` list matching the index's.

### D2 · CLN-04 (`cleanup_check.py` gone check) · fix · new

A kept clause that moves to a new position inside the same block fails as
"moved within the file". In map.ts, the `projectRegions` doc placed
"Consumes the baked …json file." after "Called at build time…". Both clauses
were kept, in the same block. The check blocked:

> 89% of the prose removed at base line 220 reappears here

Restoring the original order was the only way through. The skill's text says
"elsewhere in the same file", but the check never compares the block index. A
blocking false positive on kept text pushes an adopter toward deleting it.

**Smallest fix:** skip reappearance inside the post-edit block that replaced
the run's own block. Add a `clause-reordered-in-block` fixture with expect 0.

### D3 · Step 10 with step 9 and the reason-recheck tool list · fix · new

Step 10 puts every shortened guard and its proof in the commit body. In a
sweep, step 9 runs after those commits, and `git log` and `git show` are
allowed tools. The kr2 probe cited commit `03225fc`'s body as EVIDENCE. That
body restates "the user types in the active locale" and the planted-edit
result. The reference voids evidence from the base version only, so this leak
is scored as valid. A rerun with Bash denied dropped the answer to Mechanism.

**Smallest fix:** in reason-recheck "Mistakes that void the re-check", add
"evidence from a cleanup commit's body". Either score it like base-version
evidence, or deny `git log` and `git show` in sweep probes.

### D4 · LEN-07 (census) and CLN-03 (cleanup_check), no decision-list row · fix · new

Python example forms are neither exempt from the count nor frozen:

- **The census strips too little.** It exempts Rust `# Examples`, JSDoc
  `@example` and ``` fences. It does not exempt a Google `Example:` or
  `Examples:` section, or a reST `::` literal block.
- **`cleanup_check` freezes too little.** It freezes ``` fences and `>>>`
  lines only.

The consequences in this round:

- cache.py's 13-line `Typical usage::` block keeps its module doc at 23 lines
  against a cap of 10.
- No decision-list row licenses deleting a usage example.
- A probe deleting 3 lines of the example code passed `cleanup_check` with 0
  findings.

**Smallest fix:** add `Examples?` to the Python stripped headings. In both
scripts, treat the indented run after a line ending in `::` as fenced code.
Add one fixture.

### D5 · Setup (caps) and Scope · fix · new

`--report` prints that `.` looks published but is undeclared, so it gets app
caps. The skill never says whether a sweep declares the package first (as its
own commit) or runs at app caps. The choice changes the scope:

- at app caps, ocx has 5 over-cap blocks in 4 files (26/25/14/12 lines);
- declared library-kind, it has 2 (cache.py 25 over a cap of 15, and one
  non-public 13-line block).

At app caps, the sweep cuts a published SDK's docs 5 lines tighter than the
rule intends.

**Smallest fix:** Setup, under Caps, add: "Resolve every `looks published`
note before ranking: declare the package in `.code-docs.json` in its own
commit, or record why it stays app-kind."

### D6 · Step 1 reader grep, `git grep -F "${FILE##*/}"` · fix · known classes (comment text asserted by a repo tool; interface files)

The basename grep misses readers that name the module by its import path:

- TypeScript ESM `./map.js` specifiers for `map.ts`;
- Python dotted imports (`ocx_mirror_sdk.cache`);
- mkdocstrings `::: ocx_mirror_sdk.cache.FileCache` directives, which render
  docstrings into the published API reference. These sit in `*.md`, which the
  command excludes.

It also false-hits substrings: `_rest.py` matched `01_shellcheck_rest.py`.

Nothing in the flow then flags that ocx's `FileCache` and `configure`
docstrings are rendered interface text, and `cleanup_check` does not freeze
them unless they are declared.

**Smallest fix:** grep the import path too: the dotted module for Python, the
`.js` specifier for TypeScript. Do not exclude `*.md` for `:::` and autodoc
directives. Tell the adopter to declare the files those directives render
under `interface_files`.

### D7 · reason-recheck scoring · fix · known class (multi-consequence scoring)

A guard with 2 breaking edits gets one unled turn, and its scoring target is
undefined. "Every consequence recorded for that edit" presumes one edit. The
case here is or1: removing the fallback breaks asset-heavy repos; default page
5 costs many requests on normal repos.

**Smallest fix:** "Score the unled turn against every consequence of every
edit the guard names; for a guard whose edits sit on different lines, run one
session per line."

### D8 · LEN-02 and decision-list section 4 · nit · new

The census counts every physical line of a doc block: JSDoc `/**`, `*/` and
empty ` *` lines, and a docstring's closing `"""`. Neither the rule nor the
decision list says so. A rewrite of 10 text lines measured 11 or 12 and needed
a second pass.

**Smallest fix:** add one sentence: "every physical line counts, delimiters
and empty separator lines included".

### D9 · Step 1 and GRD-11 · nit · known class (pointer detection)

A same-file inbound reference points at the block being shortened: github
`_rest.py`'s `_FALLBACK_PER_PAGE` comment says "see module docstring". GRD-11
tracks only `.md` pointers, and step 1 greps other files only. The mechanism
was kept by judgement, not by any check.

**Smallest fix:** in step 1, add
`git grep -n -i -e 'see .*docstring' -e 'see above' -e 'see below' -- "$FILE"`
and treat a hit into an edited block as a reader of its text.

### D10 · Setup step 1 copy · nit · known class (bytecode), partly fixed

The checks no longer write `__pycache__`. But the rule's source tree holds
stale `cpython-311` and `cpython-314` `.pyc` files, and the copy took them
along. kate does not ignore `__pycache__`, so `git add` staged 6 `.pyc` files.

**Smallest fix:** copy tracked files only (`git ls-files` or the grim
package), or exclude `__pycache__` in the copy command.

### D11 · Decision-list section 1 · nit · new

There is no row for a clause the code contradicts. This round found stale
field names, "Sort follows `sortDishes()`" while `applySort` is local, a
`tags` filter that does not exist, and contradictory halal statements. "Fits
no row, stays" keeps false text, and the Report list has no slot for it.

**Smallest fix:** add a row: "stale: contradicted by the code | keep verbatim,
list in the report".

### D12 · LNK-05 against index row 6 and skill step 7 · nit · new

linkage.md's LNK-05 allows a pointer when a bare ID is removed, if the record
is passed with `--cites`. The index row 6 and skill step 7 allow one only when
the block already names the file.

**Smallest fix:** align them. Either drop the `--cites` path from LNK-05, or
add it to row 6 and step 7.

### D13 · Step 5 TypeScript recipe · nit · new

`ln -s "$PWD/node_modules" "$SCRATCH/node_modules"` resolves bun and npm
workspace links (`node_modules/@lutong/core -> ../../packages/core`) back to
the main tree. That is the trap the next paragraph warns about, for any edit
in a package that another package's test imports. It did not bite here, since
each edit and its test were in the same package.

**Smallest fix:** "in a workspace, install in the scratch copy instead of
linking".

### D14 · reason-recheck "What to probe" · nit · new

It is unclear whether a guard counts as shortened when its doc copies are
deleted while the at-line copy stays byte-identical (G-M1). The guard was
probed here, and passed.

**Smallest fix:** "deleting any copy of a guard counts as shortening it".

### D15 · CLN-07 and GRD-07 · nit · known class (test credit)

A test that fails for an incidental reason counts as a proven owner. Default
page 5 turned 6 fallback tests red, and none of them asserts the request
count. Shrinking to that pointer would drop the only statement of the reason.

**Smallest fix:** "when no failing assertion concerns the stated consequence,
keep the consequence clause beside the owner line".

### D16 · Decision-list narration test · nit · new

The test is "the next code line already says it". A module doc's copy of a
table the code holds 15 lines lower (the PSGC table) does not pass it. The
routing.md worked split deletes the same case as narration.

**Smallest fix:** "code in this file already says it".

### Known classes checked but not reproduced

- **Pointer paths:** no pointer in scope.
- **Data-file guards:** none found.
- **File-level guards:** G-M2 was kept verbatim; per the reference, a guard
  with no anchor line is not probed.
- **Gate red at base:** both chains green, except the environmental port
  clash.
- **Fixtures tripping linters:** biome ignores `.claude/**`, and ruff and
  pyright are scoped to `src` and `tests`. The loader form is D1.
- **Interface files:** see D6.
