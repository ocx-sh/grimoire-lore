---
title: Wave 4 — the 4.0/4.1/4.2 matrix fill
date: 2026-09-26
versions: [3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2]
---

# Wave 4 — the 4.0/4.1/4.2 matrix fill

The corpus believed CMake 4.0, 4.1 and 4.2 were not provisionable, so every
version-specific claim in `cmake-build.md`, `versions-and-policies.md`,
`presets-and-ci.md`, `install-and-export.md` and `dependencies.md` was
measured only on 3.31.12, 4.3.4 and 4.4.2. They are provisionable
(`ocx package exec kitware/cmake:4.0 -- cmake --version` etc.). This ledger
fills the matrix on 4.0.7, 4.1.6 and 4.2.7, with 3.31.12/4.3.4/4.4.2 re-run
alongside as the control.

Scratch: `/home/mherwig/.cache/cmake-measure-scratch/w4/era-4x/` — `fixtures/`
(kept) and `run.sh` (reproduces every row below from a clean checkout; a
`sh run.sh` before and after cleanup produced byte-identical `rc=`/`count=`
lines). Build trees were deleted after each measurement.

## 1. The index gate: canary exit codes, `-Werror=dev` vs `-Werror=author`

Fixture: `fixtures/gate/` (`CMakePresets.json` schema 6, preset `ci`),
`canary.cmake` = `message(AUTHOR_WARNING "gate canary")`, `canary-dep.cmake` =
`message(DEPRECATION "gate canary")`. Command: `cmake --preset ci --fresh -B
<dir> -Werror=<spelling> -DCMAKE_PROJECT_INCLUDE=<canary>.cmake`.

| CMake | `-Werror=dev`, AUTHOR_WARNING | `-Werror=dev`, DEPRECATION | `-Werror=author`, AUTHOR_WARNING | `-Werror=author`, DEPRECATION |
|---|---|---|---|---|
| 3.31.12 | exit 1 | exit 1 | exit 0 (silently ignored) | exit 0 (silently ignored) |
| 4.0.7 | exit 1 | exit 1 | exit 0 (silently ignored) | exit 0 (silently ignored) |
| 4.1.6 | exit 1 | exit 1 | exit 0 (silently ignored) | exit 0 (silently ignored) |
| 4.2.7 | exit 1 | exit 1 | exit 0 (silently ignored) | exit 0 (silently ignored) |
| 4.3.4 | exit 1 | exit 1 | exit 0 (silently ignored) | exit 0 (silently ignored) |
| 4.4.2 | exit 1 (with "The error=dev option is deprecated" note, remapped to `author`) | exit 1 (remapped) | exit 1 | exit 1 |

**Which spelling fails the configure on which line**: `-Werror=dev` fails the
configure (exit 1) on all six binaries, both canaries. `-Werror=author` fails
only on 4.4.2; on the other five it is a no-op (exit 0, warning text still
printed but not promoted to error). This is an exact extension of the
existing claim — **consistent**, no new boundary anywhere in 4.0–4.2.

### 1b. Preset `"warnings": {"deprecated": false}` vs `-Werror=dev`

Fixture: `fixtures/gate/devfalse/` (same preset, `warnings.deprecated=false`
added). Command: `cmake --preset ci --fresh -Werror=dev
-DCMAKE_PROJECT_INCLUDE=canary-dep.cmake`.

| CMake | exit code |
|---|---|
| 3.31.12 | 0 (preset wins, deprecation let through) |
| 4.0.7 | 0 |
| 4.1.6 | 0 |
| 4.2.7 | 0 |
| 4.3.4 | 0 |
| 4.4.2 | 1 (`-Werror=dev` remaps to `author`, which does not read the schema-6 `warnings.deprecated` the way `dev` used to; the deprecation is caught) |

The AUTHOR_WARNING canary against the same preset is unaffected on all six
(exit 1 throughout) — the preset field only silences the `deprecated`
category. **Consistent** with CMK-CORE-01's rationale in `cmake-build.md:132`
("measured 2026-09-26 on 3.31.12 and 4.3.4"), now extended to 4.0–4.2 with an
identical result.

## 2. Every Verification cell in `versions-and-policies.md`

| ID | Fixture / command | 3.31.12 | 4.0.7 | 4.1.6 | 4.2.7 | 4.3.4 | 4.4.2 | Verdict |
|---|---|---|---|---|---|---|---|---|
| CMK-VER-01 | `cmake_minimum_required(VERSION 3.15..4.3)` + `cmake_policy(GET CMP0126 v)` + `cmake_policy(GET CMP0140 v)`, gated configure | both unset, exit 0 | unset, exit 0 | unset, exit 0 | unset, exit 0 | unset, exit 0 | unset, exit 0 | **Consistent**, extends to 4.0–4.2 |
| CMK-VER-05 (< 3.5) | `cmake_minimum_required(VERSION 3.4)`, ungated | exit 0 (deprecation only) | exit 1 ("removed from CMake") | exit 1 | exit 1 | exit 1 | exit 1 | **Consistent** — "CMake 4.x" already covers 4.0–4.2 |
| CMK-VER-05 (3.5–3.9) | `cmake_minimum_required(VERSION 3.7)`, gated vs ungated | gated 1 / ungated 0 | gated 1 / ungated 0 | gated 1 / ungated 0 | gated 1 / ungated 0 | gated 1 / ungated 0 | gated 1 / ungated 0 | **Consistent** |
| CMK-VER-07 | `cmake_policy(SET CMP0155 OLD)`, pinned gate per binary | exit 0 | exit 0 | exit 0 | exit 0 | exit 0 | **exit 1** | **Inconsistent on 4.4.2** — see below |
| CMK-VER-09 | `Help/dev/experimental.rst` at the matching tag (not shipped in the binary distribution; fetched from `github.com/Kitware/CMake` at the exact release tag instead) | — | — | — | — | — | — | table below |

### CMK-VER-07 in full: an already-wrong claim, now caught while extending it

`versions-and-policies.md:46` (CMK-VER-07 rationale): *"An unset policy is a
gate error, but an explicit OLD passes the gate silently on 3.31.12, 4.3.4 and
4.4.2 (measured 2026-09-26)."* The worked example at `versions-and-policies.md:49-51`
is `cmake_policy(SET CMP0155 OLD)` under a two-dot floor. `versions-and-policies.md:145-146`
("What Agents Get Wrong Here" #4): *"Silencing a policy gate error with `SET …
OLD`, which the gate never reports. The CMK-VER-07 grep is the only check."*

Running that exact call (`cmake_policy(SET CMP0155 OLD)`, `cmake_minimum_required(VERSION
3.25...4.4)`, no guard) under each binary's pinned gate spelling:

```
tag=3.31 gate=dev    rc=0
tag=4.0  gate=dev    rc=0
tag=4.1  gate=dev    rc=0
tag=4.2  gate=dev    rc=0
tag=4.3  gate=dev    rc=0
tag=4.4  gate=author rc=1
```

On 4.4.2, ungated, this is even a plain warning, not silence:

```
CMake Warning (deprecated) at CMakeLists.txt:3 (cmake_policy):
  The OLD behavior for policy CMP0155 will be removed from a future version
  of CMake.
```

Under the pinned `-Werror=author`, that warning becomes `CMake Error
(deprecated)` and the configure fails. This is not a 4.0–4.2 artifact — the
same call was already silent on 4.3.4 and loud on 4.4.2 before this wave; the
original CMK-VER-07 measurement pass on 4.4.2 evidently used a different
policy or checked exit code without noticing the interaction with the
`author` gate's `deprecated` child. `cmake-build.md:132` (CMK-CORE-01) already
documents that `-Werror=author` on 4.4.2 "maps onto `author`, whose children
`deprecated`, `experimental`, `policy` and `install-absolute-destination` it
also fails" — so the two rule files already contradicted each other before
this measurement; this just proves which one is right, using their own
worked example. Confirmed policy-age-dependent: `cmake_policy(SET CMP0177
OLD)` (introduced 3.31, much closer to 4.4) stays silent (exit 0) on both
4.3.4 and 4.4.2, while `cmake_policy(SET CMP0126 OLD)` (introduced 3.21, much
older) is already a loud `CMake Deprecation Error` on **every** binary from
3.31.12 up, gate or no gate. CMake escalates a policy's own OLD-is-deprecated
diagnostic once the policy is old enough relative to the running version,
independent of any project floor; CMP0155 crosses that threshold between
4.3.4 and 4.4.2.

**Practical effect**: the CMK-VER-07 grep is not "the only check" — for a
policy old enough relative to the pinned binary, the gate itself now catches
an unguarded `OLD` on CMake ≥ 4.4 (as an error) and even ungated on 4.4.2 (as
a warning). The grep is still necessary (a policy that is not yet "old
enough", like CMP0177, still passes every gate silently), but the rationale
and the "what agents get wrong" item overstate it.

### CMK-VER-09: the experimental UUID table, ground-truthed against 4.0–4.2

The binary distribution does not ship `Help/dev/`, so the UUIDs were read
from `raw.githubusercontent.com/Kitware/CMake/<tag>/Help/dev/experimental.rst`
at each release tag (a `strings`-over-the-binary reverse-engineering attempt
was tried first and discarded: the human-readable disclaimer paragraph is
shared/interned by the linker across entries, which desynchronizes naive
positional pairing of name→message→UUID; the two methods gave different
answers for `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` and the source-tree text
is what settled it).

| CMake | `CXX_IMPORT_STD` | `FIND_CPS_PACKAGES` (import) | `EXPORT_PACKAGE_INFO` / `MAPPED_PACKAGE_INFO` (export) |
|---|---|---|---|
| 3.31.12 | `d0edc3af-4c50-42ea-a356-e2862fe7a444` | *(gate does not exist yet)* | `b80be207-778e-46ba-8080-b23bba22639e` |
| 4.0.7 | `d0edc3af-4c50-42ea-a356-e2862fe7a444` (unchanged) | `e82e467b-f997-4464-8ace-b00808fff261` | `b80be207-778e-46ba-8080-b23bba22639e` (unchanged) |
| 4.1.6 | `d0edc3af-4c50-42ea-a356-e2862fe7a444` (unchanged) | `e82e467b-f997-4464-8ace-b00808fff261` (unchanged) | `b80be207-778e-46ba-8080-b23bba22639e` (unchanged) |
| 4.2.7 | `d0edc3af-4c50-42ea-a356-e2862fe7a444` (unchanged) | `e82e467b-f997-4464-8ace-b00808fff261` (unchanged) | `b80be207-778e-46ba-8080-b23bba22639e` (unchanged) |
| 4.3.4 | `451f2fe2-a8a2-47c3-bc32-94786d8fc91b` (rotated) | *(retired, ungated from here)* | `ababa1b5-…` renamed to `MAPPED_PACKAGE_INFO` (rotated + renamed) |
| 4.4.2 | `f35a9ac6-8463-4d38-8eec-5d6008153e7d` (rotated) | *(retired)* | `ababa1b5-7099-495f-a9cd-e22d38f274f2` (unchanged from 4.3.4) |

`versions-and-policies.md:104` claimed "CXX_IMPORT_STD is d0edc3af… on
3.31.12 (unchanged through 4.2.0), 451f2fe2… on 4.3.4 and f35a9ac6… on
4.4.2." — **this is exactly right**, source-confirmed, including the "unchanged
through 4.2.0" claim that nobody had actually measured before this wave.
**Newly confirmed true**, not a guess: `d0edc3af…` really is unchanged across
3.31.12/4.0.7/4.1.6/4.2.7, and only rotates once CMake reaches 4.3.

## 3. Presets schema ceiling and the `dev`→`author` boundary

Command: write `CMakePresets.json` at each schema, run `cmake --list-presets`.

| Schema | needs | 3.31.12 | 4.0.7 | 4.1.6 | 4.2.7 | 4.3.4 | 4.4.2 |
|---|---|---|---|---|---|---|---|
| 9 | 3.30 | ok | ok | ok | ok | ok | ok |
| 10 | 3.31 | ok | ok | ok | ok | ok | ok |
| 11 | 4.3 | reject | reject | reject | reject | **ok** | ok |
| 12 | 4.4 | reject | reject | reject | reject | reject | **ok** |
| 13 | not released | reject | reject | reject | reject | reject | reject |

Schema 10 with `"errors": {"dev": true}` accepts and gates cleanly on
3.31.12/4.0.7/4.1.6/4.2.7. Schema 11 with `errors.dev` accepts and gates on
4.3.4 **and** 4.4.2 (the `dev`→`author` rename is not a schema-11 thing).
Schema 12 with `errors.dev` on 4.4.2: `CMake Error: File version must be 11 or
lower for errors.dev support` — `errors.author` at schema 12 works. **Fully
consistent** with `CMK-CI-01`/`CMK-CORE-02`; 4.0–4.2 cap at schema 10, exactly
like 3.31.12, and the `dev`→`author` cutover is schema-12-only on every
binary, confirmed rather than assumed.

## 4. The `CMake 4\.[012]` grep

```
grep -rn -P 'CMake 4\.[012](?![.0-9])' rules skills
```

Three hits, all read and checked:

1. `cpp-packaging/vcpkg.md:133` — "the `CMAKE_POLICY_VERSION_MINIMUM` of 3.5
   that vcpkg exports on CMake 4.0 and later is enough". Tested: `set(dep
   CMAKE_POLICY_VERSION_MINIMUM 3.5)` around a `VERSION 3.4` `add_subdirectory`,
   ungated, on 4.0.7/4.1.6/4.2.7 — clears the hard error on all three, same
   as 4.3.4/4.4.2. **Consistent.**
2. `versions-and-policies.md:89` (CMK-VER-05) — "Floor: CMake 4.0 for the hard
   error below 3.5". Confirmed identical on 4.0.7/4.1.6/4.2.7 (§2 above).
   **Consistent.**
3. `skills/cmake-dependency-triage/SKILL.md:57,136` — "`find_package-v1`
   events, on CMake 4.1 and newer only. 3.31.12 writes none." Measured
   `CMakeFiles/CMakeConfigureLog.yaml` after a `--fresh` `find_package`
   configure: count 0 on 3.31.12 **and** 4.0.7, count 1 on 4.1.6, 4.2.7,
   4.3.4, 4.4.2. **Newly confirmed true at the exact boundary** — 4.0 was
   never measured before and it lands on the "3.x-like" side, precisely as
   the "4.1 and newer" phrasing already implied.

## 5. CPS import and export on 4.0–4.2

Reference package: a real `install(EXPORT)` Config package plus a real
`install(PACKAGE_INFO)` `.cps`, built and installed once on 4.3.4
(`fixtures/cps/`, target `run.sh` step 6b). `widget.cps` content:

```json
{ "components": { "widget": { "includes": [ "@prefix@/include" ], "type": "archive" } },
  "cps_path": "@prefix@/lib/cps/widget", "cps_version": "0.14.1", "name": "widget", "version": "1.0.0" }
```

**Import** (`find_package(widget)` against the shared prefix, resolved file
via `widget_DIR`):

| CMake | no gate | `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES=e82e467b-…` |
|---|---|---|
| 3.31.12 | `.../lib/cmake/widget` (Config; gate doesn't exist) | n/a |
| 4.0.7 | `.../lib/cmake/widget` (Config) | `.../lib/cps/widget` (**.cps wins**) |
| 4.1.6 | `.../lib/cmake/widget` | `.../lib/cps/widget` (**.cps wins**) |
| 4.2.7 | `.../lib/cmake/widget` | `.../lib/cps/widget` (**.cps wins**) |
| 4.3.4 | `.../lib/cps/widget` (**.cps wins, no gate needed**) | n/a (gate retired, silently accepted as unused) |
| 4.4.2 | `.../lib/cps/widget` (**.cps wins**) | n/a |

**Export** (`install(PACKAGE_INFO widget EXPORT widgetTargets VERSION 1.0.0)`):

| CMake | no gate | `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO=b80be207-…` |
|---|---|---|
| 3.31.12 | `CMake Error: install does not recognize sub-command PACKAGE_INFO` | configures (dev warning), `.cps` written |
| 4.0.7 | same hard error | configures, `.cps` written |
| 4.1.6 | same hard error | configures, `.cps` written |
| 4.2.7 | same hard error | configures, `.cps` written |
| 4.3.4 | configures unconditionally, `.cps` written | n/a (gate retired) |
| 4.4.2 | configures unconditionally | n/a |

**Newly measured** (the corpus never ran this on 4.0–4.2, and export on
3.31.12 was not exercised before either): both directions of CPS are real,
working, experimental features from 3.31.12 (export) / 4.0.7 (import) onward,
correctly gated, and both go unconditional at 4.3 exactly as
`dependencies.md:213`'s "The 4.0 to 4.2 import gate is silently ignored from
4.3" already implied (now positively confirmed rather than inferred) — the
retired UUID on 4.3.4 is a harmless unused-variable warning, not an error.

### Inconsistency: `install-and-export.md:158` overstates CPS's lower bound

`install-and-export.md:158` (CMK-INST-13 rationale): *"CPS import exists only
on 4.3 and later, so a 3.x consumer cannot read a CPS-only package."* Measured
truth: CPS **import** exists, gated, from 4.0.7 (confirmed above), and CPS
**export** exists, gated, from at least 3.31.12 (`install(PACKAGE_INFO)`
configures cleanly on 3.31.12 with the correct
`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` UUID and writes a real `.cps`). Only
3.x truly has no import path (`Help/dev/experimental.rst` at `v3.31.12` lists
no `FIND_CPS_PACKAGES` gate at all) — the second half of the sentence is
right, the first half's "4.3" is wrong for both directions. This also
contradicts `dependencies.md:213`'s own "4.0 to 4.2 import gate" phrasing in
the same rule set, which correctly implies the gate (and the feature) existed
pre-4.3. Proposed replacement for `install-and-export.md:158`: *"CPS import
exists, gated, from 4.0 (`CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`), and
unconditionally from 4.3; CPS export exists, gated, from 3.31 or earlier
(`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO`/`CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`
from 4.3), and unconditionally from 4.3. A 3.x consumer has no import path at
all, gated or not."*

## 6. `CMAKE_POLICY_VERSION_MINIMUM` and the < 3.5 hard error

Fixture: a `VERSION 3.4` sub-project, `add_subdirectory`d from a
`3.25...4.4`-floored parent that sets `CMAKE_POLICY_VERSION_MINIMUM` around
the call, ungated.

| CMake | no fix | `=3.10` | `=3.5` |
|---|---|---|---|
| 3.31.12 | configures (deprecation notice only; variable unknown to 3.31) | configures, notice gone | configures |
| 4.0.7 | `Compatibility with CMake < 3.5 has been removed`, exit 1 | configures clean | configures (3.5–3.9 deprecation notice, no hard error) |
| 4.1.6 | same hard error | configures clean | configures |
| 4.2.7 | same hard error | configures clean | configures |
| 4.3.4 | same hard error | configures clean | configures |
| 4.4.2 | same hard error | configures clean | configures |

**Consistent** on every axis: the hard error is uniform across all four 4.x
binaries (not 4.3+-only), and both the pinned `3.10` remedy (`CMK-DEP-15`/
`CMK-DEP-30`) and vcpkg's `3.5` port-tool exception work identically on
4.0–4.2 as on 4.3/4.4.

## Inconsistencies with shipped text

| # | File:line | Quoted text | Measured truth | Proposed replacement |
|---|---|---|---|---|
| 1 | `cmake-build/versions-and-policies.md:46` (CMK-VER-07), also `:49` and `:145-146` | "an explicit OLD passes the gate silently on 3.31.12, 4.3.4 and 4.4.2" / "which the gate never reports. The CMK-VER-07 grep is the only check." | `cmake_policy(SET CMP0155 OLD)` — the rule's own worked example — passes silently on 3.31.12/4.0.7/4.1.6/4.2.7/4.3.4 but is a `CMake Error (deprecated)` under the pinned `-Werror=author` on 4.4.2 (and a plain warning even ungated). The escalation is policy-age-dependent, not universal: `CMP0177` (3.31) still passes silently on 4.4.2; `CMP0126` (3.21) is already loud on every binary from 3.31.12 up. | Replace "passes the gate silently on 3.31.12, 4.3.4 and 4.4.2" with "passes the gate silently while the policy is recent enough — confirmed for CMP0155 through 4.3.4 — but CMake's own age-based policy-deprecation warning can turn an unguarded OLD into a gate failure once the policy is old enough relative to the running binary (CMP0155 crosses this on 4.4.2; CMP0126 already crosses it on 3.31.12)." Drop "the CMK-VER-07 grep is the only check" from the agents-get-wrong list, or qualify it the same way. |
| 2 | `cmake-build/install-and-export.md:158` (CMK-INST-13) | "CPS import exists only on 4.3 and later, so a 3.x consumer cannot read a CPS-only package." | CPS import exists, gated behind `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`, from 4.0.7 (confirmed working end-to-end); CPS export exists, gated, from at least 3.31.12. Only 3.x has genuinely no import path. | See the full replacement text proposed in §5 above. |

Two inconsistencies, both concentrated in the CMake-4-era-boundary claims —
exactly the seam this wave was built to stress. Neither is caused by 4.0–4.2
being newly measured per se; both were latent defects in text already
claiming 4.3.4/4.4.2 coverage, surfaced because filling the 4.0–4.2 cells
required re-running the exact fixtures the existing rows cite.

## Candidate new failure modes

- Reverse-engineering an experimental-feature UUID from `strings <cmake
  binary>` positional adjacency is unreliable: the shared disclaimer
  paragraph gets string-pool-deduplicated by the linker, which desynchronizes
  naive `[name, message, uuid]` triple-matching and can attribute one
  feature's real UUID to its neighbour. (Not worth a rule row on its own —
  CMK-VER-09 already tells authors to read `Help/dev/experimental.rst` at the
  matching tag rather than grep the binary for the value; this is a note for
  whoever next tries the binary-forensics shortcut, not a new MUST.)

## Candidate new MUST rows

None. Every version-specific claim this wave re-measured on 4.0.7, 4.1.6 and
4.2.7 landed exactly where the existing 3.x/4.3/4.4 rows already put it — no
4.0–4.2-only behaviour surfaced that isn't already covered by a rule keyed to
"CMake 4.x" or "≥ 4.0". The two inconsistencies above are corrections to
existing rows, not gaps calling for new ones. This wave adds no new MUST rule
and no new failure mode outside the note above — the signal that matters for
convergence is that extending coverage to 4.0–4.2 confirmed the shape of the
rule set rather than expanding it.

## Wave 4 applied (2026-09-26)

Spot-checks re-run from a fresh copy of the fixtures, scratch
`/home/mherwig/.cache/cmake-measure-scratch/w4/era-4x-apply/` (`run.sh`
reproduces every line below, run from the repository root; build trees
deleted). Binaries: 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2 (`cmake
--version` per tag). Gate per binary: `-Werror=author` on 4.4, `-Werror=dev`
otherwise.

| Claim | Command (per `run.sh`) | Result | Verdict |
|---|---|---|---|
| CMK-VER-07: `cmake_policy(SET CMP0155 OLD)` fails the 4.4.2 gate | `cmake -S ver07 -B b -G Ninja --fresh -Werror=<gate>` | rc 0 on 3.31/4.0/4.2/4.3, rc 1 on 4.4 (`CMake Error (deprecated) at CMakeLists.txt:3 (cmake_policy)`). Ungated rc 0 everywhere, 4.4 prints `CMake Warning (deprecated)` | Reproduced |
| same, CMP0177 and CMP0126 | `ver07b`, `ver07c`, same command | CMP0177: rc 0 on all five, gated and ungated. CMP0126: gated rc 1 on all five (`CMake Deprecation Error`, 4.4 `CMake Error (deprecated)`), ungated rc 0 with a warning | Reproduced. Correction: the ledger's "CMP0126 loud ... gate or no gate" is an error only under the gate, a warning without it |
| New: a guarded temporary OLD (`if(POLICY CMP0155)` plus reason-and-exit comment, the form CMK-VER-07 permits) | `ver07g`, same command | rc 0 on 4.3.4, rc 1 on 4.4.2 under `-Werror=author` and under `-Werror=dev` | The row's own exception breaks the 4.4 gate |
| CPS import gated on 4.0 to 4.2 | `cps-consumer` against a 4.3.4-installed prefix holding Config and `.cps` | ungated: `lib/cmake/widget` on 3.31/4.0/4.2, `lib/cps/widget` on 4.3. With `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES=e82e467b-…`: `lib/cps/widget` on 4.0 and 4.2 | Reproduced |
| Retired import gate on 4.3/4.4 | same, gate set, under the pinned gate | rc 0, unused-variable warning only, `lib/cps/widget` on both | Newly measured (the ledger's run.sh had no such step) |
| CPS export gated from 3.31 | `cps-export40` with and without `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO=b80be207-…` | ungated rc 1 (`install does not recognize sub-command PACKAGE_INFO`) on 3.31 and 4.0, gated rc 0 and `widget.cps` plus `widget@noconfig.cps` installed | Reproduced |

Changed (IDs kept, no severity change, no verification change):

- CMK-VER-07 (`versions-and-policies.md`): rule text gains "once a leg's
  binary reports that OLD as deprecated, the guarded OLD fails that leg's gate
  too, so its exit has arrived: migrate". Rationale replaces "passes the gate
  silently on 3.31.12, 4.3.4 and 4.4.2" with the measured policy-dependent
  split (CMP0177, CMP0155, CMP0126). Worked-example comment no longer says OLD
  passes silently. What Agents Get Wrong #4 now says the gate reports an OLD
  only once the binary deprecates it and the grep is the only check that sees
  every one.
- CMK-VER-09: "unchanged through 4.2.0" becomes "unchanged through 4.2.7, read
  at each tag".
- CMK-INST-13 (`install-and-export.md`): "CPS import exists only on 4.3 and
  later" replaced with the measured gated-import (4.0.7 to 4.2.7), no import
  on 3.31.12, and gated export from 3.31.12. Floor 4.3 and MUST unchanged,
  since pinned decision 4 gates export rows at 4.3.
- CMK-DEP-11 (`dependencies.md`): "silently ignored from 4.3" replaced by the
  measured behaviour (unused-variable warning, exit 0, `.cps` still wins).
- CMK-CORE-01 (`cmake-build.md`): `-Werror=author` no-op extended to 4.0.7,
  4.1.6 and 4.2.7, `-Werror=dev` "fails on all six" (ledger section 1).
- `presets-and-ci.md` schema-ceiling paragraph: 4.0.7 to 4.2.7 accept up to
  10 (ledger section 3).

Added: no MUST row, no new failure mode.

Rejected:

- `strings`-based UUID reverse-engineering failure mode: not an agent
  behaviour any shipped text invites. CMK-VER-09 already sources UUIDs from
  `Help/dev/experimental.rst` at the tag and its count check does not pair
  positions.
- A new row for gated CPS export on 3.31 to 4.2: pinned decision 4 gates
  export at 4.3, and CMK-INST-13's grep already flags both retired gates.
- A new row for the guarded-OLD gate failure: it is a limit of CMK-VER-07's
  own exception, so it went into that row.
- Rows for 4.0/4.1/4.2 gate spellings, presets ceiling, `< 3.5` hard error,
  `CMAKE_POLICY_VERSION_MINIMUM` and `find_package-v1` boundary: confirmations
  of existing rows, no text change beyond the version lists above.
