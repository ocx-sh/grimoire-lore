---
title: Python packaging and pyproject.toml manifest rules
topic: python-packaging
agent: ground-tooling
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 17
scope: >
  What a `pyproject.toml` must and must not claim for four shapes — shipped
  PyPI package, internal CLI application, never-published test harness — plus
  the build/lock/publish chain around it (build backends, PEP 735 dependency
  groups, PEP 751 lockfiles, PyPI Trusted Publishing, deptry). Does NOT cover
  ruff/pyright rule selection (see `tooling-posture.md`) or the
  requires-python floor mechanics (see `version-floor.md`) beyond citing them
  where the packaging rule depends on that finding.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The manifest: what's mandatory, by shape](#1-the-manifest-whats-mandatory-by-shape)
   2. [PEP 735 dependency groups vs. optional-dependencies](#2-pep-735-dependency-groups-vs-optional-dependencies)
   3. [Build backends](#3-build-backends)
   4. [Layout: src vs. flat](#4-layout-src-vs-flat)
   5. [Lockfiles and reproducibility](#5-lockfiles-and-reproducibility)
   6. [Publishing and supply chain](#6-publishing-and-supply-chain)
   7. [Tool configuration location](#7-tool-configuration-location)
   8. [The metadata that is a lie](#8-the-metadata-that-is-a-lie)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Applied to this fleet](#applied-to-this-fleet)
7. [Sources](#sources)

## Summary

- `name` is the only truly required `[project]` key; `version` is required but may be `dynamic` instead of static — most other keys are optional, and which ones matter depends entirely on whether the thing ships to PyPI ([packaging.python.org][pyproject-spec]).
- License metadata has a new normative form: `license = "<SPDX expr>"` (a string) plus `license-files = [<globs>]`; the old `{text=...}`/`{file=...}` table and `License ::` trove classifiers are deprecated and PyPI will not accept new license classifiers ([PEP 639][pep639]).
- One classifier is not decorative: `Private :: Do Not Upload` is enforced server-side by PyPI — every other classifier is search/filter metadata only, unvalidated ([pypi.org/classifiers][pypi-classifiers]).
- Libraries should declare lower-bound floors and avoid upper-bound caps unless a specific incompatibility is known — capping "just in case" is what causes downstream resolver deadlock, per the PyPA's own guide ([packaging.python.org][install-requires]).
- PEP 735 `[dependency-groups]` are for dev-only tooling that must never reach a published wheel's metadata — build backends are required to omit them from built distributions, unlike `[project.optional-dependencies]` extras, which do ship and are pip-installable by consumers ([PEP 735][pep735]).
- `deptry` (0.25.1) already understands PEP 735: everything under `[dependency-groups]` is dev-classified by default; `[project.optional-dependencies]` groups are NOT dev-classified by default and need `--optional-dependencies-dev-groups` — get this backwards and every legitimate dev-tool import floods false positives (measured firsthand, below).
- hatchling auto-discovers a src-layout package with zero config when the directory matches the normalized project name (`src/<name>/__init__.py`); explicit `packages = [...]` is only required for a flat layout, a mismatched directory name, or multiple packages ([hatch.pypa.io][hatch-wheel]).
- The specific failure src-layout prevents: without it, a bare `pytest` run from the repo root imports the *working-tree* copy (cwd goes first on `sys.path`), so tests can pass against source that a broken packaging config would never actually ship in the wheel ([packaging.python.org][src-layout]).
- `uv.lock` is not yet a standard format; PEP 751 `pylock.toml` is Final (2025-03-31) and is explicitly designed as an *export target* other tools already have their own lock format for — `uv export --format pylock.toml` and `--format cyclonedx1.5` both work today (verified locally, uv 0.12.1) ([PEP 751][pep751]).
- PyPI Trusted Publishing (OIDC, `id-token: write`, 15-minute tokens) is the recommended posture over long-lived API tokens — both `ocx-sdk-python` and `ocx-mirror-sdk` already use it correctly ([docs.pypi.org][trusted-publishers]).
- PEP 740 index attestations are Final (2024-07-17) and PyPI has deployed them, but nothing in this fleet's release workflows requests one explicitly — it isn't automatic just from Trusted Publishing without confirming the action version supports it.
- `uv init` now defaults new scaffolds to uv's own `uv_build` backend (not hatchling) as of mid-2026 — none of this fleet's three built packages use it; they all predate that default and use hatchling, which remains the more capable choice for anything beyond pure-Python.
- Ruff config location is a hard requirement, not a style choice, the moment a project has no `pyproject.toml` at all: `grimoire-lore` (PEP 723 scripts, no `[project]` table) *must* use standalone `ruff.toml`; `.ruff.toml` beats `ruff.toml` beats `[tool.ruff]` in pyproject.toml when more than one is present in the same directory ([docs.astral.sh/ruff][ruff-config]).
- `deptry` run correctly (self-package declared via `--known-first-party`, `[project.optional-dependencies]` dev groups declared via `--optional-dependencies-dev-groups`, `DEP004` suppressed because it only makes sense when tests are excluded from the scan — see Finding 8) found **zero real dependency defects** in `ocx-sdk-python` and `index/bot`; a first, naively-invoked pass produced 67 and 34 false positives respectively, entirely attributable to three flag mistakes (documented below so nobody repeats them).
- License-vs-LICENSE-file cross-check: `ocx-sdk-python` and `ocx-mirror-sdk` both declare `license = "Apache-2.0"` and both `LICENSE` files are genuinely Apache-2.0 — no lie there. `ocx-mirror-sdk` does carry a stale, deprecated `License :: OSI Approved :: Apache Software License` classifier alongside the modern SPDX string (PEP 639 says tools MAY warn on this).
- `ocx-mirror-sdk`'s single Python-version classifier (`3.13`) is unverified — carried forward from the version-floor audit: CI never pins any specific interpreter for this subject at all.
- This repo's own `.github/workflows/publish.yml` (ghcr.io, not PyPI) already follows the Trusted-Publishing *spirit* even though GHCR has no OIDC trusted-publisher concept: it defaults to the ephemeral, auto-rotated `secrets.GITHUB_TOKEN` and only falls back to a long-lived `GRIM_REGISTRY_TOKEN` PAT when publishing somewhere GHCR-incompatible — the credential posture matches what's recommended.

## Findings

### 1. The manifest: what's mandatory, by shape

Per the core metadata spec, `[project]` has exactly one hard-required key,
`name`; `version` is required but may be satisfied by listing it under
`dynamic` instead of a literal value ([packaging.python.org][pyproject-spec]).
Everything else — `authors`, `dependencies`, `classifiers`, `readme`,
`urls`, `scripts` — is optional at the spec level. What's actually
*load-bearing* depends on the shape:

- **Shipped PyPI package** (`ocx-sdk-python`, `ocx-mirror-sdk`): `name`,
  `version`, `requires-python`, `license`+`license-files`, `dependencies`
  (even if empty), `readme`, and `[project.urls]` are all doing real work —
  they appear on the PyPI project page and drive the resolver. Both subjects
  have all of them (`ocx-sdk-python/pyproject.toml:1-25`,
  `ocx-mirror-sdk/pyproject.toml:1-24`).
- **Internal application, never on PyPI** (`index/bot`): the same keys exist
  (`index/bot/pyproject.toml:1-13`) but `license`/`license-files` are
  *absent* — harmless today because nothing distributes it, but the key
  becomes load-bearing the moment it's ever published anywhere, including an
  internal artifact registry that inspects wheel metadata.
- **Never-published test harness** (`ocx/test`, `grimoire/test`,
  `ocx-save/test`, `grimoire/.claude/tests`, `ocx/.claude/tests`): `name`,
  `version`, `requires-python` are present purely because `uv`/pytest need
  *a* project root — `version = "0.0.0"` in every one of them
  (`ocx/test/pyproject.toml:3`) is a tell that nobody expects this number to
  mean anything. `license`, `classifiers`, `[project.urls]` would be pure
  noise here; correctly, none of the five have them.
- **Stdlib single-file tools** (`grimoire-lore/scripts/`,
  `.claude/hooks/*.py`): no `[project]` table at all — PEP 723 inline script
  metadata (or nothing) is the only manifest concept that applies, and (per
  the version-floor audit) `grimoire-lore/scripts/` doesn't even have that.

`dynamic` was checked across all three published/CI-tracked pyproject.toml
files (`ocx-sdk-python`, `ocx-mirror-sdk`, `index/bot`) — none use it; every
`version` is a static string kept honest by each release workflow's own
"Verify tag matches pyproject.toml version" step
(`ocx-sdk-python/.github/workflows/release.yml:14-21`,
`ocx-mirror-sdk/.github/workflows/release.yml:14-21`) rather than by a
build-time dynamic-version plugin.

On version specifiers: the PyPA's own guide states plainly that pinning
exact versions or adding upper bounds without a known incompatibility "is
overly-restrictive, and prevents the user from gaining the benefit of
dependency upgrades" ([packaging.python.org][install-requires]). This fleet
already follows that: `ocx-sdk-python`'s `dependencies = []` (zero runtime
deps — the smallest possible surface,
`ocx-sdk-python/pyproject.toml:19`), and `ocx-mirror-sdk`'s only dependency
is `"httpx>=0.28"` — a floor, no cap (`ocx-mirror-sdk/pyproject.toml:19`).

### 2. PEP 735 dependency groups vs. optional-dependencies

PEP 735 exists because `[project.optional-dependencies]` extras have two
properties that are wrong for dev tooling: installing an extra always also
installs the base package, and — because extras are part of published wheel
metadata — a `dev` extra becomes part of a shipped package's public
interface forever. Dependency groups fix both: "installation of a dependency
group does not imply installation of a package's dependencies," and build
backends "MUST NOT include Dependency Group data in built distributions as
package metadata" ([PEP 735][pep735], Final 2024-10-10). Groups can also
nest via `{include-group = "..."}`.

This fleet already has both patterns in use, split cleanly by whether the
project publishes:

| Subject | Mechanism | Publishes to PyPI? |
|---|---|---|
| `ocx/test`, `grimoire/test`, `ocx-save/test`, `index/bot` | `[dependency-groups]` | No |
| `ocx-sdk-python`, `ocx-mirror-sdk` | `[project.optional-dependencies]` (`dev`, `docs`) | **Yes** |

That split is *not* obviously correct on inspection, and worth a second
look: PEP 735's own reasoning ("dev tooling should never be part of the
published interface") argues the two shipped SDKs' `dev`/`docs` extras are
in the wrong table too — nobody is meant to `pip install ocx-sdk[dev]`. The
counter-argument is `docs`: `ocx-sdk-python`'s `docs` extra
(`mkdocs-material`, `mkdocstrings`, etc.) plausibly IS meant to be
installable by someone building the documentation site outside this
repository's own dev loop, which is a legitimate optional *feature*, not
internal tooling — so `docs` staying an extra is defensible, `dev` staying
one is not. See Normative Guidance §5.

### 3. Build backends

The official packaging tutorial defaults to hatchling for a new pure-Python
package, noting it "works identically with Setuptools, Flit, PDM, and
others that support the `[project]` table"
([packaging.python.org][packaging-tutorial]) without asserting hatchling is
technically superior for the simple case — the real differentiator is scope:
hatchling supports build hooks, versioning plugins, and non-pure-Python
artifacts that setuptools also supports but with more configuration
surface, while `flit-core` is deliberately minimal (pure-Python only, no
plugin system).

As of mid-2026, `uv init` defaults new scaffolds to **`uv_build`**, uv's own
backend, not hatchling: `uv` documents it as "a great choice for most Python
projects" with "reasonable defaults" and "very fast," but explicitly "only
supports pure Python code" — anything needing build scripts or a
non-standard layout is told to use hatchling instead
([docs.astral.sh/uv][uv-build-backend]).

All three of this fleet's built packages use hatchling
(`[build-system] requires = ["hatchling"]` in `ocx-sdk-python/pyproject.toml:31-32`,
`ocx-mirror-sdk/pyproject.toml:32-33`, `index/bot/pyproject.toml:11-12`) —
predating `uv_build`'s existence as the default, and correctly, since
`ocx-sdk-python`'s `docs` build (mkdocs, griffe) and `index/bot`'s
`[tool.hatch.build.targets.wheel]` package selection
(`index/bot/pyproject.toml:13-14`) are exactly the kind of thing `uv_build`
still declines to do. **Decision for this fleet: stay on hatchling.** It's
already the standard here, all three subjects are proven working, and
nothing about switching to `uv_build` buys anything beyond marginal build
speed for projects that never showed build speed as a bottleneck. Revisit
only if a *new* pure-Python-only package is started from scratch and the
author wants one fewer moving part — even then, `uv_build`'s "currently
only supports pure Python code" caveat means this decision needs re-checking
against uv's release notes at that time, not assumed permanent.

### 4. Layout: src vs. flat

The specific failure src-layout prevents: "if an import package exists in
the current working directory with the same name as an installed import
package, the variant from the current working directory will be used"
([packaging.python.org][src-layout]) — a flat-layout project run from its
own repo root will always test the working tree, silently masking a
packaging misconfiguration that drops files from the built wheel, because
the broken wheel is never what pytest actually imports.

The check that detects this (the layout is a means, not the property to
verify) is: **run the test suite against an installed wheel in an isolated
environment**, not against the source tree:

```bash
# from the project root — proves the WHEEL works, not the working tree
rm -rf dist && uv build && uv run --isolated --with dist/*.whl --no-project \
  python -c "import ocx_sdk; print(ocx_sdk.__file__)"
```
Empty/successful output naming a path under a temp env's `site-packages`
(not this repo) is a pass; an `ImportError` or a path under this repo's own
`src/` is the failure this check exists to catch. **None of this fleet's
release workflows do this today** — `ocx-sdk-python/.github/workflows/release.yml`
and `ocx-mirror-sdk`'s twin run `task verify` (tests against the source tree
via `uv run pytest`, `ocx-sdk-python/taskfile.yml:40-43`) and only *build*
the wheel afterward (`task build`), never importing from it. Given both
subjects already use src-layout correctly (below), this is a low-severity
gap — the layout already prevents the accidental-pass case; the missing
check would only catch a *build-config* regression (a file silently dropped
from `[tool.hatch.build.targets.wheel]`), not an import-shadowing one.

Layout survey (excludes the acceptance harnesses' `src/`, which holds test
support code with no `[build-system]` at all, not a built package):

| Subject | Layout | Package dir |
|---|---|---|
| `ocx-sdk-python` | src | `src/ocx_sdk/` |
| `ocx-mirror-sdk` | src | `src/ocx_mirror_sdk/` |
| `index/bot` | src | `src/indexbot/` |

All three built packages already use src-layout. Consistent, no finding.

### 5. Lockfiles and reproducibility

`uv.lock` is uv's own format, not yet a PEP-standard one. PEP 751
`pylock.toml` reached Final status 2025-03-31 and is explicitly scoped as an
interoperability *export* target — "designed... as an export target for
tools which have their own internal lock file format," not a replacement
demanding migration ([PEP 751][pep751]). Confirmed locally that `uv` (0.12.1,
installed in this session) already implements the export:

```
$ cd ocx-sdk-python && uv export --format pylock.toml -o pylock.toml
Resolved 54 packages in 0.87ms
$ head -3 pylock.toml
lock-version = "1.0"
created-by = "uv"
requires-python = ">=3.12"
```
uv also enforces PEP 751's naming rule at the CLI level — attempting a
different filename fails outright:
```
$ uv export --format pylock.toml -o test-pylock.toml
error: Expected the output filename to be `pylock.toml` or `pylock.<name>.toml`,
where `<name>` is non-empty and contains no dots; found `test-pylock.toml`
```
And a CycloneDX 1.5 SBOM export works the same way (`uv export --format
cyclonedx1.5`, verified locally, produces valid `bomFormat: "CycloneDX"`
JSON naming `uv 0.12.1` as the generating tool) — relevant to §6 below.

**Should a library commit a lock at all?** The three never-published
harnesses and the two internal CLIs all correctly commit `uv.lock` — that's
right for anything with a reproducible CI run. For the two *published*
libraries, the committed `uv.lock` pins the *dev environment* (what
contributors and CI run tests against), which is correct and standard;
it does not and should not constrain what version range a downstream
*consumer* of the published wheel resolves to — that's still governed by
`dependencies = [...]`'s floors (§1), not the lock.

Carrying forward rather than re-deriving: the prior tooling-posture audit
already established that every `uv.lock` in this fleet passes `uv lock
--check` (all 7, all git-tracked) and that `ocx.toml`'s `ruff:latest` is not
actually a reproducibility gap because `ocx.lock` resolves it to a concrete
digest — the same lockfile-over-manifest-tag pattern PEP 751 itself is built
on (a human-editable, loose manifest; a machine-resolved, exact lock).
Hash-checking: `uv.lock` records exact versions but is *not* itself a
hash-pinned `requirements.txt` — `uv export --format requirements.txt
--no-hashes` is the default; hashes require `--generate-hashes` explicitly,
untested against this fleet since none of the subjects export to
requirements.txt at all (they consume `uv.lock` directly via `uv sync`).

### 6. Publishing and supply chain

PyPI Trusted Publishing uses OIDC: CI presents a short-lived identity token,
PyPI validates it against a pre-registered publisher (repo + workflow file),
and mints a 15-minute API token for that single run — no secret ever stored
("PyPI's normal API tokens are long-lived, meaning that an attacker who
compromises a package's release token can use it until its legitimate user
notices and manually revokes it" — this is exactly what Trusted Publishing
removes, [docs.pypi.org][trusted-publishers]). `uv publish` needs zero
credentials configured when running under a Trusted Publisher
([docs.astral.sh/uv][uv-package-guide]).

**Applied**: `ocx-sdk-python/.github/workflows/release.yml:60-73` and
`ocx-mirror-sdk`'s twin both do this correctly —
```yaml
publish-pypi:
  environment:
    name: pypi
    url: https://pypi.org/p/ocx-sdk
  permissions:
    id-token: write  # PyPI Trusted Publishing (OIDC) — no tokens stored
  steps:
    - uses: pypa/gh-action-pypi-publish@dc37677b2e1c63e2034f94d8a5b11f265b73ba33  # v1.14.2
```
`id-token: write`, a scoped `environment:`, and a pinned-by-digest action —
this is the textbook-correct posture. **No finding against these two.**

**Applied to this repo's own publish job**: `grimoire-lore` doesn't publish
to PyPI at all — `.github/workflows/publish.yml` pushes OCI artifacts to
`ghcr.io` via `grim publish --announce`
(`grimoire-lore/publish.toml:8`). GHCR has no OIDC Trusted-Publisher concept
the way PyPI does, so the literal PyPI mechanism doesn't apply — but the
*credential-posture question* ("ephemeral, scoped, auto-rotated" vs.
"long-lived static secret") does, and the job answers it the same way
Trusted Publishing does:
```yaml
env:
  REGISTRY_TOKEN: ${{ secrets.GRIM_REGISTRY_TOKEN || secrets.GITHUB_TOKEN }}
```
(`grimoire-lore/.github/workflows/publish.yml:80`) — the default is
`secrets.GITHUB_TOKEN`, GitHub's own per-job, auto-expiring, auto-scoped
token; a long-lived PAT (`GRIM_REGISTRY_TOKEN`) is only pulled in as an
escape hatch for a non-GHCR registry the built-in token can't reach.
Permissions are default-deny at the top (`permissions: {}`,
`grimoire-lore/.github/workflows/publish.yml:29`) with each capability
granted at the job level and commented with *why* (`contents: write`
because `--announce` pushes a branch before opening a PR — narrowing
permissions can't be undone by a repo-level `write` default, documented
in-file at lines 40-46). The binary install (`grim` itself) is
checksum-verified before execution (`sha256sum -c`,
`grimoire-lore/.github/workflows/publish.yml:60`), and the curl fetching it
pins `--proto '=https' --tlsv1.2`
(`grimoire-lore/.github/workflows/publish.yml:57-58`).

**Verdict: this job's credential posture matches what's recommended.**
The one caveat is already self-documented in the file, not a new finding:
the PR `--announce` opens is unreviewed by CI ("GitHub runs no workflows on
a pull request opened with the built-in token, so `validate` never fires on
it," `grimoire-lore/.github/workflows/publish.yml:99-101`) — a standing,
acknowledged cost of the built-in-token approach, not a credential-handling
mistake.

**SBOM**: no Python subject in this fleet generates one today (grepped
every `.github/workflows/*.yml` under `ocx-sdk-python`, `ocx-mirror-sdk`,
`index` for `sbom|cyclonedx|spdx` — zero hits). The Rust side already has
the convention (`ocx/scripts/sbom-to-markdown.py` renders a CycloneDX SBOM
to the docs site) — extending it to the Python SDKs is one `uv export
--format cyclonedx1.5` away, verified working above; there's no tooling gap,
only an unclaimed opportunity.

**Attestations**: PEP 740 is Final (2024-07-17) and PyPI has deployed
index-hosted attestation support ("PyPI allows the following attestation
predicates: SLSA Provenance and PyPI Publish,"
[docs.pypi.org/attestations][pypi-attestations]) — but attestation
generation is not automatically implied merely by using Trusted Publishing;
it depends on the publish action's own version supporting it. Not verified
against `pypa/gh-action-pypi-publish@v1.14.2`'s specific behavior here — flagged
as open in Contested/evolving rather than asserted either way.

### 7. Tool configuration location

Ruff's own precedence rule, quoted exactly: "If Ruff detects multiple
configuration files in the same directory, the `.ruff.toml` file will take
precedence over the `ruff.toml` file, and the `ruff.toml` file will take
precedence over the `pyproject.toml` file"
([docs.astral.sh/ruff][ruff-config]). Astral documents no stylistic
recommendation between `ruff.toml` and `[tool.ruff]` — but the choice isn't
actually free for every subject in this fleet, because one of them has no
`pyproject.toml` to put `[tool.ruff]` in.

**Decision**: `[tool.ruff]` inside the existing `pyproject.toml` for any
subject that already has one (`ocx-sdk-python`, `ocx-mirror-sdk`,
`index/bot`, and the three acceptance harnesses if they ever add ruff config)
— one file instead of two, discoverable next to every other project
setting. `grimoire-lore` is the sole exception, and it isn't a style
choice: it has no `[project]` table at all (PEP 723 scripts only), so a
standalone `ruff.toml` (`grimoire-lore/ruff.toml`) is the *only* way to
configure ruff for it — this is exactly what it already does, correctly.

### 8. The metadata that is a lie

Enumerating manifest claims nothing verifies, and the exact command that
catches each. **State per command whether empty output is the pass or the
finding**, as required.

**8a. `requires-python` never exercised in CI.** Carried forward from the
version-floor audit (`version-floor.md`) rather than re-derived: `ocx/test`
and `grimoire/test` declare `>=3.10` and provably cannot even be collected
on 3.10 (`ModuleNotFoundError: No module named 'tomllib'`); `ocx-mirror-sdk`
declares `>=3.13` and CI never pins any version at all. Generalized as
`check-floor-tested.sh`:

```bash
#!/usr/bin/env bash
# check-floor-tested.sh <project-dir> <repo-root>  — empty output = pass
set -euo pipefail
proj="$1" root="$2"
py="$proj/pyproject.toml"
[ -f "$py" ] || { echo "SKIP: no pyproject.toml at $proj"; exit 0; }
floor=$(grep -oE 'requires-python[[:space:]]*=[[:space:]]*"[^"]*"' "$py" \
  | grep -oE '[0-9]+\.[0-9]+' | head -1)
[ -n "$floor" ] || { echo "SKIP: no requires-python declared at $proj"; exit 0; }
ci_versions=$(
  { grep -rhE 'python-version|python:' "$root/.github/workflows" 2>/dev/null \
      | grep -oE '[0-9]+\.[0-9]+';
    cat "$proj/.python-version" 2>/dev/null || true; } | sort -u
)
echo "$ci_versions" | grep -qx "$floor" && exit 0
seen=$(echo "$ci_versions" | tr '\n' ' ' | sed 's/ $//'); [ -n "$seen" ] || seen="none"
echo "VIOLATION: $proj declares requires-python>=$floor but CI never pins/matrices $floor (versions actually seen: $seen)"
```
Note on this specific rerun: the first draft of the version-extraction regex
anchored to `python:` per line, which finds only the *first* version token
on a multi-version matrix line and silently drops the rest — invisible on
`ocx/test`/`grimoire/test` (no matrix at all, so it never mattered) but it
would have produced a false negative on any project with a real multi-version
matrix. Caught while building the sibling check below (8b) and fixed here
too: select the line, then extract every version token from it, not one
regex anchoring both jobs at once. Watched red (unchanged from the
version-floor audit): `ocx/test`, `grimoire/test`, `ocx-mirror-sdk` all
still fire; `ocx-sdk-python`, `index/bot` still silent.

**8b. Classifiers listing untested versions.** New check, same shape,
different source field:
```bash
#!/usr/bin/env bash
# check-classifiers-tested.sh <project-dir> <repo-root>  — empty output = pass
set -euo pipefail
proj="$1" root="$2"
py="$proj/pyproject.toml"
[ -f "$py" ] || { echo "SKIP: no pyproject.toml at $proj"; exit 0; }
classifiers=$(grep -oE 'Programming Language :: Python :: [0-9]+\.[0-9]+' "$py" \
  | grep -oE '[0-9]+\.[0-9]+' | sort -u)
[ -n "$classifiers" ] || { echo "SKIP: no versioned Python classifiers at $proj"; exit 0; }
ci_versions=$(
  { grep -rhE 'python-version|python:' "$root/.github/workflows" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+';
    cat "$proj/.python-version" 2>/dev/null || true; } | sort -u
)
for v in $classifiers; do
  echo "$ci_versions" | grep -qx "$v" || echo "VIOLATION: $proj classifies Python $v as supported but CI never pins/matrices $v"
done
```
Watched red on a real subject:
```
$ ./check-classifiers-tested.sh ocx-mirror-sdk ocx-mirror-sdk
VIOLATION: /home/mherwig/dev/ocx-mirror-sdk classifies Python 3.13 as supported but CI never pins/matrices 3.13
```
Silent (pass) on `ocx-sdk-python`, which classifies 3.12/3.13/3.14 and
matrices exactly those three — verified only after fixing the same
multi-version-per-line regex bug described in 8a; the buggy first version of
this check produced a **false VIOLATION on `ocx-sdk-python` itself**
(claiming 3.13 and 3.14 were untested when the matrix plainly lists
`['3.12', '3.13', '3.14']`, `ocx-sdk-python/.github/workflows/ci.yml:55`) —
a reminder that a verification script that has never itself been checked
against a known-good subject is exactly as untrustworthy as the code it's
meant to police.

**8c. `license` not matching the LICENSE file.** No single ubiquitous
automated tool for this (a real gap — `licensecheck`/`pip-licenses` exist
but weren't verified here); the manual command that's precise enough to be
worth running as a check:
```bash
$ grep -m1 '^license' pyproject.toml && head -1 LICENSE
```
Run against both published SDKs — both pass (empty diff between claim and
file, `license = "Apache-2.0"` against an actual `Apache License Version
2.0` file, verified for `ocx-sdk-python` and `ocx-mirror-sdk`). Not a
violation-detection command in the same sense as the others (no automatic
pass/fail), so "empty output" doesn't apply here — this one needs a human
or an SPDX-normalizing tool to compare the two outputs.

**8d. Declared-but-unused / undeclared-but-imported dependencies —
`deptry`.** Real counts below (§ "deptry, in detail").

**8e. Redundant/conflicting license declaration.** `ocx-mirror-sdk`
declares both the modern SPDX string and the deprecated classifier:
```
$ grep -n 'License ::' ocx-mirror-sdk/pyproject.toml
14:    "License :: OSI Approved :: Apache Software License",
```
Empty output would be the pass; this fires. PEP 639 says tools "MAY issue a
warning" for exactly this coexistence, and a future PyPI/build-backend
version "MAY raise an error." `ocx-sdk-python` has no such classifier — the
same fix (remove the `License ::` line) applies to `ocx-mirror-sdk` alone.

#### deptry, in detail

`deptry` 0.25.1 was run three ways against `ocx-sdk-python` and `index/bot`;
the first two are documented as a warning, not a recommendation, because
the failure mode is entirely mine and easy to repeat:

1. **`uvx deptry .` (bare default)** — 10 DEP002 "unused dependency" hits on
   `ocx-sdk-python` (`ruff`, `pyright`, `coverage`, `pytest-asyncio`,
   `mkdocs-material`, and 5 more doc-tool packages). All false: deptry's
   default `--exclude` already drops `tests`, and by *default*
   `[project.optional-dependencies]` groups are treated as regular
   (production) dependencies unless told otherwise — so a tool that's
   legitimately dev-only and only ever invoked from `tests/`/CI, never
   `import`ed from `src/`, reads as "unused."
2. **Same command, but with `--exclude '\.venv|\.git'`** (to make deptry
   scan `tests/` and catch real missing-dependency bugs there) — this
   *overwrites* deptry's default exclude list rather than extending it, so
   `tests/` is now scanned as if it were production code, and every
   legitimate dev-dependency import inside a test file (`import pytest`,
   `import respx`) fires DEP004 "misplaced dev dependency." 67 findings on
   `ocx-sdk-python`, 34 on `index/bot` (32 of which are `pytest`/`respx`/
   `hypothesis` imports inside `tests/`) — again, entirely an artifact of
   the flag, not the codebase.
3. **Correct invocation**, combining the project's own package as
   known-first-party, the optional-dependencies dev groups declared
   explicitly (only needed for the `[project.optional-dependencies]`
   subjects — `[dependency-groups]` subjects don't need this flag, PEP 735
   is dev-classified by default), tests scanned, DEP004 suppressed (because
   DEP004 by definition only makes sense when tests are *excluded* — see
   deptry's own rule text, "development dependencies... imported from
   **production code**," [deptry.com/rules-violations][deptry-rules]):
   ```bash
   # ocx-sdk-python (uses [project.optional-dependencies])
   deptry . --known-first-party ocx_sdk \
     --optional-dependencies-dev-groups dev,docs \
     --exclude '\.venv|\.direnv|\.git|setup\.py' --ignore DEP004
   # → Found 5 dependency issues (all: `_helpers` — a local sibling test
   #   module in tests/contract/, misread as third-party; zero real hits)

   # index/bot (uses [dependency-groups], auto-dev, no -oddg needed)
   deptry . --known-first-party indexbot \
     --exclude '\.venv|\.direnv|\.git|setup\.py' --ignore DEP004
   # → Found 1 dependency issue (`fakes` — same local-sibling-module class)
   ```
   **Real, defensible count: 0 genuine dependency defects in either
   subject.** Both remaining hits are the identical false-positive class
   (a local test-support package deptry can't resolve without
   `--experimental-namespace-package` or a proper `__init__.py`-rooted
   import — `index/bot/tests/fakes/` does have one and still misreads,
   which is a deptry limitation, not a fixable manifest problem).

Watched deptry go red on a planted, real violation, to prove the correctly-
flagged invocation actually catches something (not just silent by
misconfiguration): a synthetic package declaring `requests` as a dependency
but never importing it, and importing `yaml` without declaring it —
```
$ deptry . --known-first-party plantedpkg
pyproject.toml: DEP002 'requests' defined as a dependency but not used in the codebase
src/plantedpkg/__init__.py:2:8: DEP001 'yaml' imported but missing from the dependency definitions
Found 2 dependency issues.
```
Both fire correctly. **Is deptry worth requiring?** Yes, but only pinned to
the exact flag set above (and ideally captured in `[tool.deptry]` in each
project's own `pyproject.toml` rather than re-derived per invocation) — a
bare `deptry .` on this fleet's own subjects is worse than not running it at
all, since a 67-line false-positive wall trains reviewers to ignore the
tool.

## Normative guidance candidates

1. **Rule**: Every `pyproject.toml` that builds a wheel declares
   `requires-python` matching a version CI actually pins or matrices at
   least once. **Rationale**: an unverified floor is a claim, not a fact —
   proven false twice in this fleet already. **Verification**:
   `check-floor-tested.sh <project> <repo-root>` (§8a); empty output = pass.
2. **Rule**: Every `Programming Language :: Python :: 3.NN` classifier
   names a version CI actually tests. **Rationale**: classifiers are what a
   consumer reads on PyPI before `requires-python` even gets checked by
   their resolver — an untested one is a false promise on the package page
   itself. **Verification**: `check-classifiers-tested.sh` (§8b).
3. **Rule**: `license` is an SPDX string plus `license-files`, never the
   old `{text=...}` table, never coexisting with a `License ::` classifier.
   **Rationale**: PEP 639 deprecates both old forms and a future tool MAY
   error on the coexistence. **Verification**: `grep -c 'License ::'
   pyproject.toml` is 0, and `grep -c '^license = "' pyproject.toml` is 1.
4. **Rule**: A shipped library's `dependencies` carry lower bounds only,
   unless a specific version is known-incompatible — no upper caps "just in
   case." **Rationale**: PyPA's own guidance; upper caps are what cause
   downstream resolver deadlock. **Verification**: `grep -E '[a-z_-]+<[0-9]'
   pyproject.toml` — any hit needs a comment naming the incompatibility it
   guards against, or it's a smell.
5. **Rule**: Dev-only tooling (ruff, pyright, coverage, pytest plugins used
   only by the test runner itself) goes in `[dependency-groups]`, not
   `[project.optional-dependencies]`, unless the group is a genuinely
   installable end-user feature (this fleet's `docs` extras are the
   defensible exception; `dev` extras are not). **Rationale**: PEP 735 —
   dependency groups never leak into published wheel metadata; optional
   extras always do. **Verification**: for each `[project.optional-
   dependencies]` group, ask "would a consumer of the published wheel ever
   run `pip install pkg[<group>]`?" — no for `dev`, arguably yes for `docs`.
6. **Rule**: A project with no `pyproject.toml` at all uses standalone
   `ruff.toml`; a project that has one uses `[tool.ruff]` inside it, never
   both. **Rationale**: `ruff.toml` silently wins over `[tool.ruff]` in the
   same directory if both exist — a stray second file is a trap, not
   flexibility. **Verification**: `find . -maxdepth 1 -name 'ruff.toml' -o
   -maxdepth 1 -name '.ruff.toml'` returns non-empty only when there is no
   `pyproject.toml`, or is empty.
7. **Rule**: `uv.lock` (or the project's chosen lockfile) is git-tracked and
   passes `uv lock --check` in CI, for every subject with a `pyproject.toml`
   — published library or not. **Rationale**: this is what makes "declared
   floor" and "classifier version" claims checkable at all; an unlocked or
   stale-locked project can't be verified by anything in this list.
   **Verification**: `git ls-files uv.lock` non-empty, and `uv lock --check`
   exits 0 — already true for all 7 lockfiles in this fleet (carried
   forward, not re-derived).
8. **Rule**: PyPI publishing uses Trusted Publishing (`id-token: write`,
   `environment:`, `pypa/gh-action-pypi-publish` pinned by digest) — never a
   stored `PYPI_API_TOKEN` secret. **Rationale**: OIDC tokens expire in 15
   minutes; a leaked long-lived token is a standing compromise until someone
   notices. **Verification**: `grep -L 'id-token: write'
   .github/workflows/release.yml` on any repo that publishes — empty output
   (the file IS found, meaning it DOES have the permission) is the pass;
   already true for both `ocx-sdk-python` and `ocx-mirror-sdk`.
9. **Rule**: `deptry` runs in CI, but only with `--known-first-party
   <pkg>`, the correct `--optional-dependencies-dev-groups` for that
   project's dependency-declaration style, and `DEP004` either suppressed
   or the exclude list left at its default (never `--exclude` overridden to
   scan `tests/` without also suppressing DEP004). **Rationale**: measured
   directly — the wrong three-flag combination turns a 0-real-issue
   codebase into a 67-line false-positive wall. **Verification**: the exact
   commands in "deptry, in detail" above; `Found 0 dependency issues` (after
   subtracting known local-sibling-module false positives) is the pass.
10. **Rule**: for a `src`-layout published package, verify the *built
    wheel* imports cleanly in an isolated environment at least once per
    release, not just the source tree via `pytest`. **Rationale**: src
    layout prevents the common accidental-pass, but only a wheel-import
    check catches a build-config regression that drops a real file.
    **Verification**: the `uv build && uv run --isolated --with dist/*.whl`
    snippet in Finding 4; a clean `import` and printed installed path
    (not this repo's `src/`) is the pass. **Not currently done anywhere in
    this fleet — a new commitment, not a restatement of existing practice.**

## AI-agent angle

- **Caps "for safety."** An agent asked to add a dependency defaults to
  `package>=X,<Y+1` out of habit (mirroring a pattern it's seen in
  application-style requirements files). For a *library*'s `dependencies`,
  that's backwards — check: does `pyproject.toml`'s `dependencies` list
  contain any `<` without an adjacent comment naming the specific
  incompatibility? If yes and no comment, it's agent-shaped over-caution,
  not a deliberate constraint.
- **`[project.optional-dependencies].dev` as the default reach.** An agent
  scaffolding a new pyproject.toml reaches for `optional-dependencies` for
  everything, including tooling, because that's the older/more-documented
  pattern it's seen more of in training data. Check: `grep -A5
  '\[project.optional-dependencies\]' pyproject.toml | grep -E 'ruff|pytest|
  pyright|mypy|coverage'` — a hit means dev tooling landed in the
  published-metadata table instead of `[dependency-groups]`.
2. **Silent classifier drift.** An agent bumping `requires-python` to widen
  support rarely also updates the `Programming Language :: Python ::`
  classifiers (they're two unrelated-looking lists in the same file, easy
  to touch one and miss the other). Check: `check-classifiers-tested.sh`
  (§8b) — but also simpler, `diff <(grep classifiers... )` vs `requires-
  python` directly inside the manifest, no CI needed.
- **Both license forms at once.** An agent asked to "add a license" often
  finds an old StackOverflow-shaped example using the classifier list and
  adds `License :: OSI Approved :: ...`, then *also* adds the modern
  `license = "..."` string because a more recent example showed that too —
  landing both, which is exactly `ocx-mirror-sdk`'s current state. Check:
  §8e's one-liner.
- **Bare `deptry .` as "the fix."** An agent told to "add dependency
  hygiene checking" runs the tool with zero flags and either (a) reports a
  false-positive wall as real findings, or (b) gets discouraged by the wall
  and doesn't configure it correctly, so the check never lands. Check: does
  the CI invocation include `--known-first-party` naming the project's own
  top-level package? Its absence is visible in the workflow YAML itself,
  no execution needed.
- **`src/` layout without ever testing the wheel.** An agent sets up
  `src/`-layout correctly (it's the more commonly-modeled pattern now) but
  never adds the isolated-wheel-import step, because src-layout alone
  *feels* like the complete fix for "test what you ship" — it only fixes
  the accidental-pass case, not a build-config regression. Check:
  Normative rule 10.
- **Copying a Trusted-Publishing snippet without the `environment:` block.**
  `id-token: write` alone is necessary but the `environment:` gate is what
  lets a human require manual approval before a release publishes — an
  agent pattern-matching just the permission line from a snippet, without
  the environment, ships something that technically works but removes a
  safety gate nobody asked to remove. Check: `id-token: write` present AND
  an `environment:` block present in the same job.

## Contested / evolving

- **`uv_build` vs. hatchling as the default new-project backend.** `uv
  init` switched its own default to `uv_build` sometime before mid-2026
  (version `uv_build>=0.12.5,<0.13` referenced in current uv docs,
  [docs.astral.sh/uv][uv-build-backend]); the official packaging tutorial
  still shows hatchling as of this research
  ([packaging.python.org][packaging-tutorial], no visible update date on
  the fetched page). Trending toward `uv_build` for anything simple enough
  to qualify (pure Python, no build hooks), but "currently only supports
  pure Python code" is a live limitation, not a settled non-issue — worth
  re-checking uv's changelog before treating this as resolved.
- **PEP 751 `pylock.toml` adoption.** Final since 2025-03-31, uv already
  exports to it, but nothing found in this research (or in this fleet)
  treats it as a *primary* lock format yet — every subject still commits
  `uv.lock` as the source of truth and would only ever `export` to
  `pylock.toml` for interop with a tool that doesn't understand `uv.lock`
  natively. Whether the ecosystem converges on `pylock.toml` as the one
  lock format tools read (not just export to) is unresolved as of this
  research.
- **PEP 740 attestations: deployed vs. automatic.** PyPI has deployed
  index-hosted attestation support ([docs.pypi.org/attestations][pypi-attestations]),
  but whether `pypa/gh-action-pypi-publish@v1.14.2` (the pinned version this
  fleet uses) generates one automatically under Trusted Publishing, or needs
  explicit opt-in, was not confirmed by the sources fetched here — flagged
  open rather than guessed.
- **`dev` extras vs. dependency groups for the two shipped SDKs.** Finding 2
  makes the PEP-735-purist case that `dev` belongs in `[dependency-groups]`
  even for a published package; this fleet currently keeps it in
  `[project.optional-dependencies]` for both `ocx-sdk-python` and
  `ocx-mirror-sdk`. Not flagged as a hard violation above because plenty of
  real-world published libraries still do this and tooling support for mixed
  `[dependency-groups]` + `[project.optional-dependencies]` in one manifest
  is newer than either spec alone — a live judgment call, not settled
  either way by the sources read.

## Applied to this fleet

| Subject | Satisfied | Violated | New commitment (not yet true) |
|---|---|---|---|
| `ocx-sdk-python` | SPDX license+license-files; zero-cap deps; hatchling src-layout; Trusted Publishing; `dependency-groups` not needed (uses optional-deps deliberately for a published lib — defensible); deptry-clean (0 real issues); classifiers match CI matrix exactly | — | Wheel-import verification step in release.yml (Normative #10); consider moving `dev` extra to `[dependency-groups]` (Contested) |
| `ocx-mirror-sdk` | SPDX license+license-files; hatchling src-layout; Trusted Publishing; deptry-clean | **Stale `License ::` classifier alongside SPDX string** (`pyproject.toml:14`, §8e); `requires-python>=3.13` and the `3.13` classifier both untested in CI (carried forward + §8b) | Same wheel-import step; drop the classifier line |
| `index/bot` | `[dependency-groups]` used correctly (never published, correct table); hatchling src-layout; `.python-version` pins the declared floor; deptry-clean | No `license`/`license-files` key at all (low priority — never published) | — |
| `ocx/test`, `grimoire/test`, `ocx-save/test`, `grimoire/.claude/tests`, `ocx/.claude/tests` | `[dependency-groups]` used correctly; `version="0.0.0"` honestly signals "not a real version" | `requires-python` floor unverified/wrong for `ocx/test` (3.12 needed) and `grimoire/test` (3.11 needed) — carried forward, not re-derived | — |
| `grimoire-lore` (`ruff.toml`, no `pyproject.toml`) | Standalone `ruff.toml` is correct here, not optional (Finding 7) | — | — |
| `grimoire-lore/.github/workflows/publish.yml` (ghcr.io, not PyPI) | Credential posture matches Trusted-Publishing's spirit: ephemeral `GITHUB_TOKEN` default, PAT only as opt-in escape hatch, default-deny permissions, checksum-verified binary install | — | — |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [packaging.python.org/en/latest/specifications/pyproject-toml/][pyproject-spec] | PyPA core metadata spec | current, versioned | Defines exactly which `[project]` keys are required vs optional |
| [peps.python.org/pep-0639/][pep639] | PEP 639, Final | Final 2024 (era) | Canonical license/license-files form, classifier deprecation |
| [peps.python.org/pep-0735/][pep735] | PEP 735, Final | Final 2024-10-10 | Dependency Groups spec, why they never publish |
| [peps.python.org/pep-0751/][pep751] | PEP 751, Final | Final 2025-03-31 | pylock.toml — lockfile standardization status |
| [peps.python.org/pep-0740/][pep740] | PEP 740, Final | Final 2024-07-17 | Index attestations spec |
| [packaging.python.org/.../src-layout-vs-flat-layout/][src-layout] | PyPA packaging guide | current | The exact cwd-import-shadowing failure src-layout prevents |
| [packaging.python.org/.../install-requires-vs-requirements/][install-requires] | PyPA packaging guide | current | Official floors-not-caps guidance for library dependencies |
| [packaging.python.org/.../tutorials/packaging-projects/][packaging-tutorial] | Official packaging tutorial | current | hatchling as the tutorial's default build backend |
| [docs.astral.sh/uv/guides/package/][uv-package-guide] | uv official docs | current, uv 0.12.x era | `uv build`/`uv publish`, Trusted Publishing zero-config claim |
| [docs.astral.sh/uv/concepts/build-backend/][uv-build-backend] | uv official docs | current, references uv_build 0.12.5 (2026-08-14) | uv's own build backend, its pure-Python-only limitation |
| [docs.pypi.org/trusted-publishers/][trusted-publishers] | PyPI official docs | current | OIDC mechanism, 15-minute token lifetime, why over API tokens |
| [docs.pypi.org/attestations/][pypi-attestations] | PyPI official docs | current | Confirms PEP 740 is deployed, not just specified |
| [hatch.pypa.io/latest/plugins/builder/wheel/][hatch-wheel] | Hatchling official docs | current | Exact zero-config package-discovery heuristic order |
| [pypi.org/classifiers/][pypi-classifiers] | PyPI classifier list + policy | current | `Private :: Do Not Upload` is the one server-enforced classifier |
| [docs.astral.sh/ruff/configuration/][ruff-config] | Ruff official docs | current | Exact `.ruff.toml` > `ruff.toml` > `[tool.ruff]` precedence |
| [deptry.com/usage/][deptry-usage] | deptry official docs | current, deptry 0.25.1 era | Default `--exclude` includes `tests`; PEP 735 vs optional-deps handling |
| [deptry.com/rules-violations/][deptry-rules] | deptry official docs | current, deptry 0.25.1 era | Exact DEP001-004 definitions, DEP004's production-code-only scope |
| local: `uv --version` / `uv export --help` / live `deptry` runs against this fleet and a planted-violation fixture | first-party measurement | 2026-08-23 | Verified rather than assumed: pylock.toml export, CycloneDX export, deptry's real false-positive/true-positive behavior |

[pyproject-spec]: https://packaging.python.org/en/latest/specifications/pyproject-toml/
[pep639]: https://peps.python.org/pep-0639/
[pep735]: https://peps.python.org/pep-0735/
[pep751]: https://peps.python.org/pep-0751/
[pep740]: https://peps.python.org/pep-0740/
[src-layout]: https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
[install-requires]: https://packaging.python.org/en/latest/discussions/install-requires-vs-requirements/
[packaging-tutorial]: https://packaging.python.org/en/latest/tutorials/packaging-projects/
[uv-package-guide]: https://docs.astral.sh/uv/guides/package/
[uv-build-backend]: https://docs.astral.sh/uv/concepts/build-backend/
[trusted-publishers]: https://docs.pypi.org/trusted-publishers/
[pypi-attestations]: https://docs.pypi.org/attestations/
[hatch-wheel]: https://hatch.pypa.io/latest/plugins/builder/wheel/
[pypi-classifiers]: https://pypi.org/classifiers/
[ruff-config]: https://docs.astral.sh/ruff/configuration/
[deptry-usage]: https://deptry.com/usage/
[deptry-rules]: https://deptry.com/rules-violations/
