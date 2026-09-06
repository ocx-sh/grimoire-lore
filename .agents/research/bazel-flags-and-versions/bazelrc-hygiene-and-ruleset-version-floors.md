---
title: "bazelrc hygiene and ruleset version floors"
topic: bazelrc-hygiene-and-ruleset-version-floors
group: bazel-flags-and-versions
family: BZL-FLAG
agent: bazel-flags-and-versions-worker
model: sonnet
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 16
settles:
  - M-H-07
  - M-H-08
  - M-H-10
  - M-H-11
  - M-H-12
  - M-H-13
  - M-H-14
builds_on:
  - BZL-LARK-28
  - BZL-MOD-06
  - BZL-MOD-13
  - BZL-HERM-01
  - BZL-HERM-04
  - BZL-CACHE-01
  - BZL-CACHE-03
  - BZL-CACHE-04
  - BZL-CACHE-23
scope: >
  What belongs in a committed .bazelrc versus a gitignored/try-imported one, the
  rc precedence and --config mechanism that makes that split enforceable, the
  community always-on flag list and what each flag actually costs, and how a
  repository tracks whether its six named language rulesets (rules_js, rules_ts,
  rules_python, rules_rust, rules_cc, rules_lint) are current. Does NOT cover the
  LTS stage/EOL lifecycle, the ordered 8-to-9 flag-flip checklist, or the
  authoritative-incompatible-flag-list mechanics in depth — that is
  lts-policy-and-incompatible-flag-churn's deliverable, cited here only where an
  rc line needs a version boundary. Does not re-derive credential placement,
  repo-rule env/getenv semantics, or the phantom remote-cache flags — inherited
  from BZL-CACHE and BZL-MOD by ID.
---

# bazelrc hygiene and ruleset version floors

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [RC file precedence and the import directives](#1-rc-file-precedence-and-the-import-directives)
   2. [The --config mechanism and the personal-config convention](#2-the---config-mechanism-and-the-personal-config-convention)
   3. [The community always-on flag list moved from a blog post to a maintained module](#3-the-community-always-on-flag-list-moved-from-a-blog-post-to-a-maintained-module)
   4. [The surprise: --sandbox_default_allow_network cannot break a repository-rule fetch](#4-the-surprise---sandbox_default_allow_network-cannot-break-a-repository-rule-fetch)
   5. [--credential_helper placement is already solved — inherited, not re-derived](#5---credential_helper-placement-is-already-solved--inherited-not-re-derived)
   6. [Numeric knobs need a rationale, illustrated by the fleet's --remote_timeout=60](#6-numeric-knobs-need-a-rationale-illustrated-by-the-fleets---remote_timeout60)
   7. [Ruleset version floors: three declare one, three don't](#7-ruleset-version-floors-three-declare-one-three-dont)
   8. ["Latest release" on GitHub is not a semver query](#8-latest-release-on-github-is-not-a-semver-query)
   9. [The "one major behind" check breaks on a 0.x ruleset](#9-the-one-major-behind-check-breaks-on-a-0x-ruleset)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- RC files are read system → workspace → home → `$BAZELRC` → `--bazelrc=`, in that order, each layer overriding the last; command-line flags always win over all of them ([bazel.build/run/bazelrc](https://bazel.build/run/bazelrc)).
- `import` fails the invocation if the target file is missing; `try-import` does not; `try-import-if-bazel-version >X.Y.Z path` gates an entire imported file on a semver comparison, including tilde ranges — the only built-in per-file version gate ([bazel.build/run/bazelrc](https://bazel.build/run/bazelrc)).
- Bazel's own docs recommend a leading underscore for `--config` names defined in a personal rc file, specifically to avoid colliding with shared/CI config names (M-H-10) — cheap to check, rare to matter in practice.
- The "community always-on flags" canon moved from a single 2022-04-28 blog post ([aspect.build/blog/bazelrc-flags](https://aspect.build/blog/bazelrc-flags)) to a versioned, per-flag-version-gated Starlark module ([bazel-contrib/bazelrc-presets](https://github.com/bazel-contrib/bazelrc-presets)); **6 of the 8 `--incompatible_*`/`--no*` flags the blog names by exact spelling return zero hits in the current `bazel help all --long` / CLI reference** — they are gone, not merely renamed.
- That module's own README states its explicit not-semver-safe stance in writing: preset changes "can cause behavior changes… or even break the build," so it must be vendored and code-reviewed on every bump, never auto-updated (M-H-08's premise).
- **The chase-the-surprise answer: `--sandbox_default_allow_network=false` cannot break an unsandboxed repository-rule fetch.** The flag is tagged `execution` and governs sandboxed build/test *actions* only; `repository_ctx.download`/`.execute()` run in the loading phase, outside that sandbox, by design — confirmed by the still-open 2019 feature request to add one ([bazelbuild/bazel#7764](https://github.com/bazelbuild/bazel/issues/7764)). The two mechanisms share no enforcement point.
- `--credential_helper` set from a repository-relative path in a committed `.bazelrc` lets a plain `bazel query` on a fresh clone execute an attacker-controlled binary with the full client environment, before the sandbox — filed, reproduced, and closed as **intended behavior under Bazel's documented trust model** ([bazelbuild/bazel#30439](https://github.com/bazelbuild/bazel/issues/30439)). Already a MUST at [BZL-CACHE-04](../bazel-caching-rbe.md); this dive generalizes the shape of the rule, not the specific flag.
- A numeric tuning knob (a timeout, a retry count, a parallelism limit) needs a comment stating why that number — a flag whose *name* already states its behavior (`--test_output=errors`) does not.
- Three of the six named rulesets declare `bazel_compatibility` in their released `MODULE.bazel` (rules_js `>=7.6.0`, rules_lint `>=7.6.0`); three declare **none** (rules_ts, rules_python, rules_rust) at their current pinned release, even though rules_ts's own `main` branch does (`>=7.7.0`, per [BZL-LARK verdict #8](../bazel-starlark-and-build.md)) — the released artifact and `main` can disagree.
- An undeclared `bazel_compatibility` is not "unrestricted": the real floor lives in the ruleset's own `.bazelci/presubmit.yml` matrix — measured at 7.x for rules_python and rules_cc, and **7.4.1** exactly for rules_rust (a named anchor, not a bucket).
- `gh api repos/<org>/<repo>/releases/latest` is not a semver query: measured live, `aspect-build/rules_js`'s "latest" release on 2026-09-05 is `v2.9.3` (a 2.x maintenance backport), published the same day as — and by API ordering, after — the actual current-major `v3.4.1`. An agent that trusts this one call reports the wrong major.
- "One major behind" does not translate cleanly to a pre-1.0 ruleset: rules_rust (0.74.0) and rules_cc (0.2.22) are semver 0.y.z, where `y` — not a nonexistent leading-digit bump — is the breaking-change counter. A check that only watches the first component never fires for either.
- The shipped baseline `.bazelrc` for a **new** Bazel-9-only repo omits `--incompatible_strict_action_env` entirely (already the 9.0+ default, per [BZL-HERM-01](../bazel-hermeticity-determinism.md)) but a repo that must also run a Bazel-8 leg — as `rules_ocx` does — needs it explicit, which is the concrete case for `try-import-if-bazel-version` or a `--config` split rather than one flat file.
- CI never reading a `try-import`ed developer rc file's *committed content* is not the only failure shape: `rules_ocx`'s CI recreates `.bazelrc.user` from scratch at runtime with a disjoint flag set (cache flags only) — worse than simple non-inheritance, because a reviewer who sees the same filename touched in both places can wrongly assume overlap.
- Fleet's own uncommented numeric knob: `--remote_timeout=60` appears in both `.bazelrc.user:9` and `.github/actions/remote-cache/action.yml:28` with no rationale, set 60× tighter than the community preset's own `common:ci` default of `3600` — no source states whether that gap is deliberate.

## Findings

### 1. RC file precedence and the import directives

Bazel reads configuration files in a fixed order, later files overriding earlier ones on a per-flag, per-command basis: the system rc (`/etc/bazel.bazelrc`, or `%ProgramData%\bazel.bazelrc` on Windows; skipped by `--nosystem_rc`), the workspace rc (`.bazelrc` at the repo root; skipped by `--noworkspace_rc`), the home rc (`$HOME/.bazelrc`; skipped by `--nohome_rc`), any file named by the `$BAZELRC` environment variable, and finally any `--bazelrc=<path>` flags in the order given (repeatable). Flags typed directly on the command line always win over every rc file ([bazel.build/run/bazelrc](https://bazel.build/run/bazelrc)).

Three import directives exist inside an rc file itself:

```
import %workspace%/tools/shared.bazelrc          # fails the invocation if missing
try-import %workspace%/.bazelrc.user             # silently skipped if missing
try-import-if-bazel-version >8.0.0 %workspace%/configs/post8.rc
try-import-if-bazel-version <8.0.0 %workspace%/configs/legacy.rc
```

`try-import-if-bazel-version` supports semver comparisons and tilde ranges (`~1.2.3` = `>=1.2.3 <1.3.0`) and is the *only* built-in mechanism for gating an entire block of flags on the running Bazel major without erroring on a version that doesn't recognize a newer flag. Options in an imported file take precedence over options that appear *before* the import line in the importing file, and the reverse for options placed *after* it — so where an `import`/`try-import` line sits inside the file is itself part of the precedence contract, not just what it points to.

One more precedence escape hatch: passing `/dev/null` to `--bazelrc` disables every subsequent `--bazelrc` flag —

```
--bazelrc=x.rc --bazelrc=y.rc --bazelrc=/dev/null --bazelrc=z.rc
```

only reads `x.rc` and `y.rc`; used for a "release" invocation that must ignore any user or CI-runner rc regardless of what got installed alongside it.

### 2. The `--config` mechanism and the personal-config convention

A named config groups flags under a `<command>:<name>` prefix and is activated with `--config=<name>`:

```
build:memcheck --strip=never --test_timeout=3600
```

`--config=foo` expands *in place* — the expanded flags inherit the precedence position of the `--config=foo` invocation itself, not the position of the `build:foo` line in the file. Configs nest: a config block may itself contain another `--config=`, expanded recursively across every rc file read.

`--enable_platform_specific_config` (default `True` in the community preset, off by default in bare Bazel) makes Bazel additionally pick up `build:linux`/`build:macos`/`build:windows` stanzas matching the host OS automatically — a *non-personal* use of the same named-config mechanism, worth distinguishing from the personal-config convention below.

Bazel's own docs state the personal-config convention directly: "In order to avoid name conflicts, we suggest that configs defined in personal rc files start with an underscore (`_`)" ([bazel.build/run/bazelrc](https://bazel.build/run/bazelrc)) — settling M-H-10. The map correctly grades this P3: it is real, documented, and a one-line grep away from checkable, but a collision is rare (it only bites when a developer's personal `_foo` accidentally matches, or a plain `foo` accidentally shadows, a name the shared rc or CI also defines) and no fleet instance was found.

### 3. The community always-on flag list moved from a blog post to a maintained module

The brief's named source, [aspect.build/blog/bazelrc-flags](https://aspect.build/blog/bazelrc-flags), is dated **2022-04-28** (byline Alex Eagle, confirmed from the page's own metadata) — four Bazel LTS majors old as of this research date. Checking its 15 named flags against the current CLI reference (`bazel.build/reference/command-line-reference`, fetched 2026-09-05) shows **6 of the 8 `--incompatible_*`/`--no*`-prefixed flags it names return zero hits**: `--incompatible_allow_tags_propagation`, `--noexperimental_check_output_files`, `--incompatible_default_to_explicit_init_py`, `--incompatible_remote_results_ignore_disk`, `--incompatible_exclusive_test_sandboxed`, and `--nolegacy_external_runfiles` are absent from the live flag surface — some flipped-and-deleted, some renamed. `--modify_execution_info`, `--remote_local_fallback`, `--sandbox_default_allow_network` and `--heap_dump_on_oom` are still live.

The maintained successor is [bazel-contrib/bazelrc-presets](https://github.com/bazel-contrib/bazelrc-presets) (formerly a feature of Aspect's `bazel-lib`, now maintained by the Rules Authors SIG), which ships as a Bazel module generating an rc file from a checked-in Starlark data structure (`flags.bzl`, ~35 entries across `FLAGS`, `MIGRATIONS` and `NON_RBE` dicts as fetched 2026-09-05). Its README states, in the project's own words, the not-semver-safe stance the brief asks to establish:

> "Preset changes can cause behavior changes in your repo that are undesirable or even break the build. Since vendoring is required, changes will be code-reviewed when they arrive in your repo, rather than as an invisible side-effect of updating the version of bazelrc-presets. For this reason, this rule does not strictly follow Semantic Versioning."

The install flow makes vendoring load-bearing, not incidental: a `bazelrc_preset()` target generates the rc file at `bazel run //tools:preset.update`, the caller commits the *generated file* (not a version pin to the generator), and a paired `preset.update_test` fails the build the moment the generator's output would differ from what's committed. This is the "vendored, code-reviewed snippet" shape the brief asks to justify — a rule can inherit an upstream flag decision, but only through a diff a human actually looks at, never through a version bump alone.

Each flag entry in `flags.bzl` carries its own `if_bazel_version` predicate baked into the data, which is the practical per-flag analogue of `try-import-if-bazel-version` at the file level:

```python
"incompatible_strict_action_env": struct(
    default = True,
    if_bazel_version = lt("9.0.0"),   # stops emitting the line once the floor is 9.0+
    ...
),
"module_mirrors": struct(
    default = "https://bcr.cloudflaremirrors.com",
    if_bazel_version = ge("8.4.0"),   # CloudFlare BCR mirror, added 8.4.0
    ...
),
"incompatible_enforce_starlark_utf8": struct(
    default = "error",
    if_bazel_version = ge("8.5.0"),
    ...
),
```

This reconciles directly with [BZL-HERM-01](../bazel-hermeticity-determinism.md)'s own guidance ("remove the line only once the floor is ≥9.0.0 everywhere the rc file applies") — the preset generator already encodes exactly that removal condition as data rather than as prose a human has to remember to act on later.

### 4. The surprise: `--sandbox_default_allow_network` cannot break a repository-rule fetch

Bazel's own current CLI reference gives the flag's full text: **`--[no]sandbox_default_allow_network`, default `true`** — "Allow network access by default for actions; this may not work with all sandboxing implementations." Tagged `execution` ([bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference)). The community preset recommends flipping it to `false` so an untagged, unhermetic test or build action cannot silently depend on a live network call — the failure then surfaces as an application-level network error inside the sandbox, with no console message from Bazel naming the cause.

The brief's specific question — does this break an unsandboxed repository-rule fetch — is settled by what the flag's own tag says it governs: **actions**, i.e. the execution-phase spawns Bazel makes for `cc_library` compiles, test runs, genrules, and similar declared build steps. A repository rule's implementation function (`repository_ctx.download()`, `.execute()`) runs earlier, in the **loading phase**, to materialize the external repository *before* any action can reference it — and that phase has never been sandboxed by default. The evidence is a still-open, seven-year feature request asking for exactly this to be added: [bazelbuild/bazel#7764](https://github.com/bazelbuild/bazel/issues/7764), "sandbox for repository rules," filed 2019, open through 2026, requesting an `inputs=` allowlist for `repository_ctx.execute()` "similar to the one used in `actions.run`" — a request that would be moot if the sandbox already covered it. `--sandbox_default_allow_network=false` and a repository rule's own network access are two different code paths with no shared gate.

This does not mean repository-rule network access is unconstrained by nothing — it means the constraint, where one exists, is a different flag surface entirely (e.g. an explicit `--repo_env`/allowlist pattern inside the rule itself, per [BZL-MOD](../bazel-bzlmod-and-repo-rules.md) Verdict #6: "`getenv()` is cache invalidation, not a sandbox… Remote execution is the only clean-room path and is not generally available for repo rules"). A rule that recommends `--sandbox_default_allow_network=false` *as* a repository-rule hermeticity control is simply wrong about which phase it reaches.

### 5. `--credential_helper` placement is already solved — inherited, not re-derived

The brief asks why `--credential_helper` must be configured from a non-repository rc file. [BZL-CACHE-04](../bazel-caching-rbe.md) already states the rule at MUST with full evidence, so this dive cites rather than restates it: `--credential_helper`'s value, when set from a workspace-relative path in a *committed* `.bazelrc`, is resolved and spawned by Bazel with the full client environment — before the sandbox engages, and before any distinction between "code I wrote" and "code a stranger's repository shipped." A plain, read-only `bazel query //...` on a just-cloned repository is enough to execute that binary. Filed as a security bug, reproduced against Bazel 9.2.0, and closed by the maintainers as **intended behavior under Bazel's documented threat model** — a workspace author is treated as fully trusted the moment its config is processed at all ([bazelbuild/bazel#30439](https://github.com/bazelbuild/bazel/issues/30439)). `--credential_helper` itself has been stable since 7.0 ([BZL-CACHE-03](../bazel-caching-rbe.md)); the placement constraint is independent of that stability and does not loosen on any future Bazel version, because the maintainers' answer was "working as designed," not "will fix."

What this dive adds is the *general* shape this specific case is one instance of (§ Decisions): any flag whose value is executed, or whose value is secret, must live in an rc file the repository does not ship — never merely an rc file the repository ignores by convention.

### 6. Numeric knobs need a rationale, illustrated by the fleet's `--remote_timeout=60`

`rules_ocx` sets `build --remote_timeout=60` in two places — the gitignored `.bazelrc.user:9` and, independently, `.github/actions/remote-cache/action.yml:28` — with no comment anywhere stating why 60 seconds. Every other flag in the same files is either self-explanatory from its name (`--test_output=errors`) or a documented idiom (`--enable_platform_specific_config`); a bare timeout is neither. For comparison, `bazel-contrib/bazelrc-presets`' own `remote_timeout` entry defaults to **3600** seconds specifically under `common:ci`, on the stated rationale of extending "the maximum amount of time to wait for remote execution and cache calls" — a value roughly 60× looser than the fleet's. Nothing in the fleet states whether 60 is a deliberate tight bound (fail fast rather than hang) or a value carried over from a context where it made sense (a local, low-latency cache) and never revisited for CI's higher-latency path.

### 7. Ruleset version floors: three declare one, three don't

Measured 2026-09-05 by fetching each ruleset's `MODULE.bazel` at its current release tag and its `.bazelci/presubmit.yml` where one exists:

| Ruleset | Current version (dated) | `bazel_compatibility` in released `MODULE.bazel` | CI-measured floor |
|---|---|---|---|
| `rules_js` | 3.4.1 (2026-08-21) | `[">=7.6.0"]` | matches |
| `rules_ts` | 3.10.1 (2026-08-21) | **none declared** | `main` carries `>=7.7.0` ([BZL-LARK verdict #8](../bazel-starlark-and-build.md)) — released artifact and `main` disagree |
| `rules_python` | 2.3.3 (2026-09-04) | **none declared** | `.bazelci/presubmit.yml:132` runs `[7.x, 8.x, 9.x]` |
| `rules_rust` | 0.74.0 (2026-08-28) | **none declared** | `.bazelci/presubmit.yml:2`: `minimum_bazel_version: &minimum_bazel_version "7.4.1"` — a named anchor, not a bucket |
| `rules_cc` | 0.2.22 (2026-07-07) | **none declared** | `.bazelci/presubmit.yml` runs a `7.x` leg |
| `rules_lint` | 2.9.0 (2026-09-03) | `[">=7.6.0"]` | matches |

An undeclared `bazel_compatibility` is not evidence of "no restriction" — it means the floor exists only as an artifact of what the ruleset's own CI happens to test, discoverable only by reading that CI configuration directly (settles M-H-14).

### 8. "Latest release" on GitHub is not a semver query

`gh api repos/aspect-build/rules_js/releases/latest` returned `v2.9.3` on 2026-09-05. Listing the full release history shows why: `aspect-build/rules_js` cuts a 2.x maintenance backport (`v2.9.3`) and the current 3.x release (`v3.4.1`) on the same day, and the GitHub API's "latest" is whichever non-prerelease release has the newest `published_at` timestamp — not the highest semver. `v3.4.1` was published two minutes *before* `v2.9.3` the same morning, so the maintenance backport won the "latest" flag purely on publish order:

```
v2.9.3   2026-08-21T02:59:15Z  ← releases/latest returns this
v3.4.1   2026-08-21T01:09:21Z  ← actual current major, published earlier the same day
```

The correct query lists releases (or tags) and sorts by semver — `gh api repos/<org>/<repo>/releases --jq '.[] | select(.prerelease == false) | .tag_name'` piped through a version sort — never the single `/releases/latest` call alone.

### 9. The "one major behind" check breaks on a 0.x ruleset

The brief's must-decide check — "not more than one major behind" — assumes a first-component major, which holds for `rules_js` (3.x), `rules_ts` (3.x), `rules_python` (2.x) and `rules_lint` (2.x). `rules_rust` (0.74.0) and `rules_cc` (0.2.22) are still pre-1.0 under semver, where the *second* component is the breaking-change counter — `0.73 → 0.74` is semver's equivalent of a major bump, not a patch. A check written as "first component changed by ≥ 2" will never fire for either ruleset, silently tolerating an arbitrarily stale pin, because the first component of a 0.y.z version essentially never moves (settles half of M-H-13, the other half being the version numbers themselves).

## Decisions

**Decision 1 — the shipped baseline `.bazelrc` for a new Bazel-9 repository, flag by flag.**

```bazelrc
# Auto-select build:linux / build:macos / build:windows stanzas by host OS.
common --enable_platform_specific_config

# Deny network access to sandboxed actions by default; tag the exceptions.
# (Does NOT reach repository-rule fetches — see Findings §4.)
build --sandbox_default_allow_network=false
test --sandbox_default_allow_network=false

# Fail Starlark files that are not UTF-8. Bazel 8.5.0+.
build --incompatible_enforce_starlark_utf8=error

# Fail loudly, and only in CI, if MODULE.bazel.lock is out of date.
# See BZL-MOD-02 — never set bare (unscoped) or developer builds cannot
# self-serve a routine dependency edit.
common:ci --lockfile_mode=error

# Diagnostics: cheap, no behavioral cost.
build --heap_dump_on_oom

# Personal machine overrides ONLY. Must be gitignored, must be last.
try-import %workspace%/.bazelrc.user
```

Evidence and the one-line reason per flag: `--enable_platform_specific_config` and `--sandbox_default_allow_network=false` are Findings §2 and §4; `--incompatible_enforce_starlark_utf8` is argued-only (one GitHub issue on the preset repo) so it ships CONSIDER, not MUST; `common:ci --lockfile_mode=error` is inherited from [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md) rather than re-derived; `--heap_dump_on_oom` has no measured or normative cost and is included on that basis alone (CONSIDER); `try-import %workspace%/.bazelrc.user` is Decision 2 below.

**Deliberately omitted, and why:**
- `--incompatible_strict_action_env` — already the Bazel-9.0+ default ([BZL-HERM-01](../bazel-hermeticity-determinism.md)); setting it explicitly is a no-op on a 9-only floor. A repository that must also run a Bazel-8 leg (as `rules_ocx` does) needs this line back, scoped with `try-import-if-bazel-version <9.0.0` or an equivalent `--config` split — the concrete case for "dated guidance for 8 and 9 side by side" (frame, orchestrator decision 2).
- `--credential_helper` — never in this file, at any severity. Configure it from an rc file the repository does not ship (§ Findings 5, [BZL-CACHE-04](../bazel-caching-rbe.md)).
- `--remote_timeout=<n>` — omitted from the baseline entirely rather than shipped with an unexplained number; a repository that needs one adds it with a comment stating the value's basis (§ Decision 3 below), scoped to `common:ci` per the preset's own convention.
- `--module_mirrors` — a single-incident-sourced convenience (CONSIDER, not baseline-default): useful once a repository has actually hit a flaky upstream CDN, not universal enough to ship unconditionally.

**Decision 2 — the split between committed and try-imported configuration.**

A flag belongs in a **committed** file (the root `.bazelrc`, or a checked-in named `--config`) when CI must apply it too, or when its absence would make one contributor's build silently diverge in a way a code reviewer should be able to see in the diff. A flag belongs in a **try-imported, gitignored** file only when it is host-specific (an absolute path, a locally-installed toolchain override), a credential or other secret, or a genuine personal preference that would be wrong to force on every other contributor. `--credential_helper` and any bearer-token `--remote_header=` line always fall in the second bucket regardless of how "small" the value looks (Finding 5).

The general rule this dive adds beyond "committed vs. try-imported" as a binary: **check which of two failure shapes CI has for the try-imported file, because they fail differently.** Either (a) CI never creates that filename at all — so anything a developer puts there is guaranteed never validated by CI, or (b) CI *recreates* the same filename from scratch with a different, non-overlapping flag set — which is worse to audit, because a reviewer who sees `action.yml` writing to `.bazelrc.user` can wrongly infer CI reads the developer's *committed* intent, when in fact it's an unrelated ephemeral file that merely shares a name. `rules_ocx` is case (b): its C-toolchain override (`CC=`, `-layering_check`) lives only in the developer's copy; `.github/actions/remote-cache/action.yml` synthesizes its own `.bazelrc.user` containing cache flags only, at CI runtime, before that job's Bazel invocation. Assumption named: this reasoning generalizes to any two-writer file (developer + CI-runtime generator) sharing one path, not just `.bazelrc.user` specifically.

**Decision 3 — a shipped rule requires a rationale comment for any numeric knob whose "right" value is context-dependent.**

Applies to timeouts, retry counts, worker/parallelism counts, and memory limits — values a reader cannot re-derive from the flag's own name or semantics. Does not apply to a flag whose value is self-explanatory from its name (`--test_output=errors`), nor to a value copied verbatim from a cited, versioned preset (the citation *is* the rationale). `--remote_timeout=60` in `.bazelrc.user:9` and `action.yml:28` fails this bar today; the community preset's own `remote_timeout=3600` under `common:ci` passes it, because its entry states the reason inline in `flags.bzl`.

**Decision 4 — the check that a ruleset pin is not more than one major behind.**

For a 1.0+ ruleset, compare the pinned `bazel_dep(..., version = "…")` value's leading component against the current release's leading component, found by listing and semver-sorting *all* non-prerelease releases (never `/releases/latest` alone — Finding 8). Two or more majors behind is a hard finding; exactly one major behind is a tracked item, not yet a finding, because LTS-aligned rulesets in this set ship a new major roughly annually while shipping minors every few weeks. For a pre-1.0 ruleset (`rules_rust`, `rules_cc` today), apply the same comparison to the *second* component instead of the first (Finding 9) — a check that only inspects the leading digit of a `0.y.z` version must be treated as broken, not merely lenient.

## Normative guidance candidates

1. **Read rc-file precedence off `--announce_rc`'s output, never off memory of the read order.**
   Rationale: the five-source precedence chain (system → workspace → home → `$BAZELRC` → `--bazelrc=`) is easy to state and easy to misremember under a real multi-file setup; `--announce_rc` prints every option Bazel actually applied and where it came from.
   Verify: `bazel build --announce_rc //some:target 2>&1 | grep '^INFO: Reading rc'` (or the community preset's `common:ci --announce_rc`, on by default there). Empty output on a build that has more than one rc file present is itself suspicious — check `--noworkspace_rc`/`--nohome_rc` are not silently in effect.
   Severity: SHOULD. Bazel 7/8/9; shapes A, F.

2. **Never version-gate a single flag inline in prose; use `try-import-if-bazel-version` (file-level) or a data-driven generator with a per-flag `if_bazel_version` predicate (module-level) — never a hand-maintained comment saying "remove this after upgrading."**
   Rationale: a comment is not enforced; a CI matrix spanning two majors (as this program's own artifacts require, per the frame) will silently run the wrong flag set on one leg the moment someone forgets the comment existed.
   Verify: for any `.bazelrc` line whose flag does not exist on every Bazel version in the CI matrix, grep for that flag name and confirm it sits inside a `try-import-if-bazel-version` block or an equivalently version-scoped `--config`. A flag known (from BZL-HERM-01/BZL-LARK-28-style checking) to differ by major, found bare in the shared rc file, is a finding.
   Severity: MUST. Bazel 8/9 (any multi-major matrix); shapes A, F.

3. **Prefix a personal `--config` name defined in a try-imported rc file with an underscore.**
   Rationale: Bazel's own docs recommend this specifically to avoid a personal config silently shadowing, or being shadowed by, a shared or CI-defined config of the same name.
   Verify: `grep -n '^[a-z]*:_' .bazelrc.user` for names that do start with `_`, then `grep -n '^[a-z]*:[a-zA-Z]' .bazelrc.user | grep -v ':_'` for ones that don't. Non-underscore hits in a personal file are the finding.
   Severity: CONSIDER (M-H-10 is P3 — real but rare). Bazel 7/8/9; shapes A, F.

4. **The only mechanism for a personal override is a `try-import`ed, `.gitignore`d file, imported as the last line of the committed `.bazelrc`.**
   Rationale: import position determines precedence — anything imported earlier can be overridden by a later line in the parent file, so a personal-override import placed anywhere but last can be silently defeated by a later shared flag.
   Verify: `tail -1 .bazelrc` must be the `try-import` line (or, if a trailer of comments follows, the last non-comment, non-blank line); `git check-ignore <the-imported-path>` must succeed.
   Severity: MUST. Bazel 7/8/9; shapes A, F.

5. **Determine, for every filename a `try-import` reads, whether CI never creates it or recreates it with a different content set — and document which.**
   Rationale: the two failure shapes look identical in the committed `.bazelrc` (one `try-import` line) but differ in what a reviewer can safely assume; the "CI recreates it disjointly" shape is the one that invites a false "CI must see this too" assumption.
   Verify: reading heuristic — grep CI workflow files for any step that writes the same path the `try-import` line names (`grep -rn '<basename>' .github/workflows/ .buildkite/`). No write anywhere = shape (a); a write with a flag set disjoint from the developer file = shape (b); document the answer next to the `try-import` line itself.
   Severity: MUST (as a documented fact); the omission itself, not a severity on the underlying config, is the finding. Bazel 7/8/9; shapes A, F.

6. **Never place `--credential_helper` in a file the repository ships, at any scope, including a `%workspace%`-relative path pointed at from a personal rc.**
   Rationale and verification: inherited in full from [BZL-CACHE-04](../bazel-caching-rbe.md) — cited, not restated.
   Severity: MUST (inherited). Bazel all (flag stable since 7.0). Depends on: BZL-CACHE-04, BZL-CACHE-03.

7. **Set `build --sandbox_default_allow_network=false` (and its `test` counterpart) as a committed default; never justify it, or its absence, as a repository-rule hermeticity control.**
   Rationale: Bazel's own default is `true` (network allowed) for sandboxed actions, so flipping it is a deliberate hardening step against untagged tests/actions reaching the network — but the flag's `execution` tag means it has no effect on repository-rule fetches, which run in the loading phase, unsandboxed by default (Finding 4).
   Verify: `grep -n 'sandbox_default_allow_network' .bazelrc*` for the flip; separately, `grep -rn 'sandbox_default_allow_network' <any repo-rule .bzl or its docs>` — any hit framing it as a fetch-time control is the second, distinct finding.
   Severity: SHOULD (flip); MUST (never mis-cite it for repo-rule hermeticity). Bazel 7/8/9 (default `true` throughout); shapes A, F. Settles: M-H-08.

8. **A numeric tuning value (timeout, retry count, worker count, memory limit) carries an adjacent comment stating why that number, unless it is copied verbatim from a cited, versioned source.**
   Rationale: `--remote_timeout=60` with no comment, sitting 60× tighter than the community preset's own cited `common:ci` default of `3600`, cannot be told apart from a typo, a stale local value, or a deliberate choice (Finding 6).
   Verify: for every rc line matching `=[0-9]+\s*$` (or a bare integer value), confirm a comment exists on the same or a preceding line explaining the number, or a citation to where the value came from. EMPTY comment above a numeric flag = FINDING.
   Severity: MUST (new configuration); SHOULD (retrofit onto an existing uncommented value — the fleet's own `--remote_timeout=60` is this case today). Bazel all; shapes A, F. Settles: M-H-11.

9. **A ruleset's absent `bazel_compatibility` field is read as "undocumented," never as "no floor" — check the ruleset's own CI presubmit matrix before claiming a version works.**
   Rationale: three of the six rulesets named in this program's own set (`rules_ts`, `rules_python`, `rules_rust`) ship with no `bazel_compatibility` in their currently-released `MODULE.bazel`, yet all three have a real, CI-tested floor documented only in `.bazelci/presubmit.yml` (Finding 7).
   Verify: `grep -n bazel_compatibility MODULE.bazel` at the ruleset's release tag (empty = undeclared, not unrestricted); then `curl -sL .../.bazelci/presubmit.yml | grep -n 'bazel:'` for the matrix, or read the pinned `minimum_bazel_version`-style anchor if the file defines one.
   Severity: MUST for anyone authoring adoption or upgrade guidance citing a floor; SHOULD for a reviewer spot-checking a `bazel_dep` bump. Bazel 7/8/9; shapes A, F. Settles: M-H-14.

10. **Never determine a ruleset's current major from a single `releases/latest` API call or "latest release" page badge; list all non-prerelease releases and sort by semver.**
    Rationale: measured live on 2026-09-05, `aspect-build/rules_js`'s `releases/latest` returns a 2.x maintenance backport (`v2.9.3`) published the same day as, and after, the actual current-major `v3.4.1` — an artifact of publish-timestamp ordering, not version ordering (Finding 8).
    Verify: `gh api repos/<org>/<repo>/releases --jq '.[] | select(.prerelease==false) | .tag_name'`, pipe through a semver sort (e.g. `sort -V` on the numeric portion), and compare the top of that list against whatever `releases/latest` returned. A mismatch is the tell that a ruleset runs parallel maintenance/current tracks.
    Severity: MUST for anyone authoring "current version" claims about a ruleset. All majors; shapes A, F. Settles: M-H-13 (in part).

11. **For a pre-1.0 (`0.y.z`) ruleset, compare the second version component, not the first, when checking "how many majors behind."**
    Rationale: semver treats `0.y.z`'s `y` as the breaking-change counter; `rules_rust` and `rules_cc` are both still pre-1.0 today, and a check written against the leading digit alone will never register drift on either (Finding 9).
    Verify: before diffing a pinned `bazel_dep` version against current, check whether the current release's leading component is `0`; if so, diff the second component instead and apply the same one-behind threshold to it.
    Severity: MUST for anyone building the version-drift check itself (Decision 4); it is a check-correctness bug, not a policy choice. All majors; rules_rust and rules_cc specifically at their current 0.x generation. Settles: M-H-13 (in part).

12. **Vendor a community rc-flag preset (or any equivalent generated `.bazelrc` fragment) as committed, generated output plus a diff-check test — never as a live version pin to the generator that regenerates silently on update.**
    Rationale: the preset generator's own README states its changes are not semver-safe and "can cause behavior changes… or even break the build" — the intended safety mechanism is that every change to the generated content is a reviewable diff in the consuming repository, not an invisible side effect of a version bump.
    Verify: the generated rc fragment must appear in `git ls-files`; a paired test target (or CI step) must fail when regenerating it produces a diff from what's committed. A bare `bazel_dep` version bump on the preset module with no regenerate-and-diff step in the same change is the finding.
    Severity: MUST when a repository adopts a generated preset at all; N/A otherwise. Bazel 7/8/9; shapes A, F.

13. **Scope `--lockfile_mode=error` to `common:ci` (or an explicit CI-only invocation), never as a bare `build` line in a file a developer's local build also reads.**
    Rationale and verification: inherited from [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md) — a bare `error` gate turns every legitimate dependency edit into a local failure a developer cannot self-serve.
    Severity: MUST (inherited). Bazel 7/8/9; shapes A, F. Depends on: BZL-MOD-02.

14. **A shipped `.bazelrc` targeting Bazel 9 only omits `--incompatible_strict_action_env`; a shipped `.bazelrc` that must also cover a Bazel-8 leg sets it explicitly and version-scopes the line so it does not carry into the 9 leg unnecessarily.**
    Rationale: the flag defaults `false` through all of 8.x and `true` from 9.0.0; an unpinned line is silently redundant on 9-only floors and silently load-bearing on mixed floors — the two cases need different files, not different comments on the same line.
    Verify: `grep -n incompatible_strict_action_env .bazelrc*`; if present, confirm a Bazel-8 leg exists somewhere in the CI matrix (`.bazelversion` or `USE_BAZEL_VERSION`) that needs it. Present with no 8.x leg anywhere = harmless but removable; absent with an 8.x leg present = FINDING (per BZL-HERM-01).
    Severity: MUST (inherited from BZL-HERM-01, restated here only as the shipped-baseline consequence). Bazel 8 (false) vs 9 (true); shapes A, F. Depends on: BZL-HERM-01.

15. **Treat an rc-generating community preset's own flag catalogue (e.g. `flags.bzl`) as CONSIDER-tier evidence for any individual flag it recommends, unless that flag's *mechanism* is independently documented by `bazel.build` itself — the preset's maintenance stance, not its content, is what's normative.**
    Rationale: per house standard, a claim resting only on an argued or asserted source is never a MUST; the preset repository documents its own content as subject to change and requiring review, which is a statement about process, not a guarantee that any single flag in it is universally correct for every repository.
    Verify: for a flag recommended only by the preset (not independently present in `bazel.build/reference/command-line-reference`'s description of a hermeticity or determinism property), grade any authored rule about it CONSIDER; promote to SHOULD/MUST only when a second, normative or measured source corroborates the specific claim (as done here for `--sandbox_default_allow_network`, whose *mechanism* is bazel.build-documented even though the *recommendation to flip it* is preset/blog-sourced).
    Severity: MUST (sourcing discipline, house rule). All majors; all shapes.

16. **A numeric knob's committed value must be re-checked against the currently pinned Bazel/ruleset version before being copied into a new repository's baseline rc — a value tuned for one era's default remote-cache latency is not portable by assumption.**
    Rationale: the community preset's own `remote_timeout` default changed from an unstated value to an explicit `3600` under `common:ci`; a value copied from an older example (or, as in the fleet, from an unremembered original context) carries no version marker of its own the way a flag name does.
    Verify: reading heuristic — any numeric rc value with no adjacent comment AND no adjacent citation to a source repo/commit is a finding regardless of what the number is (subsumes Candidate 8, stated here as the copy-forward failure mode specifically).
    Severity: SHOULD. All majors; shapes A, F.

17. **When authoring or refreshing a claim about which Bazel major a ruleset supports, name the specific mechanism checked — `bazel_compatibility` field, `.bazelci`/CI matrix, or neither found — rather than a bare "supports Bazel N".**
    Rationale: this dive found three of six rulesets in this exact set with no declared field at all; a bare "supports 7+" claim erases the difference between a resolver-enforced floor and an untested assumption.
    Verify: reading heuristic on any authored guidance file — a version-support claim about a ruleset must cite either the `bazel_compatibility` grep result or the CI matrix file:line it came from.
    Severity: SHOULD (documentation discipline). All majors; shapes A, F. Settles: M-H-14 (documentation half).

18. **Run the ruleset-drift check (Decision 4 / Candidates 10-11) on a schedule, not only when someone happens to touch `MODULE.bazel` — staleness accrues silently between edits.**
    Rationale: `rules_js`/`rules_ts` release a new minor every 2-4 weeks; a repository that only re-checks floors when editing an unrelated `bazel_dep` line can drift a full major before anyone notices, especially given Candidate 10's `releases/latest` trap makes even an active check unreliable without the semver-sort step.
    Verify: a scheduled CI job (weekly or monthly) exists that runs the Decision-4 comparison for every `bazel_dep` in `MODULE.bazel` against a language ruleset and reports (not necessarily blocks) drift. Absent = FINDING for a repository this program's guidance ships to.
    Severity: SHOULD. Bazel 7/8/9; shapes A, F.

## Fleet evidence

`rules_ocx` is the only fleet repository this family applies to directly (shape A).

- **Root `.bazelrc` (6 directives, all committed):** `common --enable_platform_specific_config` (`.bazelrc:2`, no comment); `startup --windows_enable_symlinks` and `common:windows --enable_runfiles` (`:4-6`, commented: "sh_test data needs a real runfiles tree, not just a manifest"); `build --incompatible_disallow_empty_glob` (`:8`, no comment — and, per the community preset's own `if_bazel_version = lt("8.0.0rc1")` gating, this line is a harmless no-op on the repo's actual 8.7.0/9.x/rolling matrix, since the flag has defaulted `true` since Bazel 8.0); `test --test_output=errors` (`:9`, self-explanatory); `try-import %workspace%/.bazelrc.user` (`:14`, last line — satisfies Candidate 4).
- **`.bazelrc.user` (gitignored, 9 lines):** `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` (`:2`) and `build --features=-layering_check --host_features=-layering_check` (`:3`) — both currently inert (0 `cc_*` targets exist in the repo), a latent trap rather than a live bug, per the frame's own correction. `build --remote_cache=…` (`:7`, safe to quote), `build --remote_header=authorization="Basic <credential>"` (`:8`, value never reproduced in any artifact), and `build --remote_timeout=60` (`:9`, **no stated rationale** — Candidate 8's fleet instance).
- **CI never reads the committed `.bazelrc.user` content — it recreates the file.** `.github/actions/remote-cache/action.yml` writes `build --remote_cache=…` (`:27`), `build --remote_timeout=60` (`:28`, the same uncommented value, independently duplicated rather than sourced from one place), a conditional `build --remote_header=…` (`:32`, push-to-`main` only) or `build --remote_upload_local_results=false` (`:34`, PRs/forks) — a disjoint flag set from the developer file, confirming shape (b) from Decision 2, not the simpler "CI just doesn't read this file" shape (a).
- **No `--incompatible_strict_action_env` anywhere in any rc file**, despite the CI matrix running 8.7.0 (default `false`) and 9.x/rolling (default `true`) side by side — exactly the gap Candidate 14 / BZL-HERM-01 names, with zero configuration difference between the legs to explain the divergent `PATH`/`LD_LIBRARY_PATH` inheritance.
- **`rules_ocx` itself declares no `bazel_compatibility`** in its own `MODULE.bazel` (`grep -c bazel_compatibility MODULE.bazel` → 0) even though it is a ruleset published to the BCR — the same undeclared-floor pattern as three of the six external rulesets this dive measured (Finding 7), just on the fleet's own side of the publishing relationship.
- **Example/e2e consumer modules never inherit the root rc at all** — each is a separate Bazel module via `local_path_override`, so `examples/{cross_platform,package,project}/.bazelrc` and `e2e/bzlmod/.bazelrc` are byte-identical four-line files carrying only the platform/runfiles/test-output flags, with no remote-cache line and no `try-import` of anything.
- **`--credential_helper` is not used at all** — the fleet's write credential rides a bare `--remote_header=authorization=…` line instead, which is `SHOULD`-severity (not MUST) under the owner's own pinned decision to keep the existing setup and track a migration item separately ([BZL-CACHE-03](../bazel-caching-rbe.md)); that tracked item does not currently exist in the repo's docs or issue tracker, which is itself the open finding.

## AI-agent angle

- **Copying the aspect.build 2022 blog post's flags verbatim into a new `.bazelrc`.** Six of its eight named `--incompatible_*`/`--no*` flags return zero hits against the current CLI reference (Finding 3) — a training-data-era memorized flag list will hard-fail Bazel with "unrecognized option" on at least some of them. Mechanical check: before writing any flag name into a shipped file, grep it against a freshly fetched `bazel.build/reference/command-line-reference` or `bazel help all --long` on the pinned version — the same discipline as [BZL-CACHE-23](../bazel-caching-rbe.md) and [BZL-LARK-28](../bazel-starlark-and-build.md), extended here from remote-cache flags and Starlark APIs to rc-file flags specifically.
- **Recommending `--sandbox_default_allow_network=false` as a fix for a non-hermetic repository-rule fetch.** The flag's own `execution` tag scopes it to build/test actions; an agent pattern-matching "sandbox" + "network" + "hermeticity" onto a repo-rule problem will ship a flag that does nothing for the stated goal (Finding 4). Mechanical check: does the finding under discussion originate in a `repository_rule`'s `implementation` function (loading phase) or a `rule()`'s action registration (`ctx.actions.run*`, analysis/execution phase)? Only the second is in scope for this flag.
- **Trusting `gh api .../releases/latest`, a cached training-data version string, or a "Latest release" badge for a ruleset's current major.** Measured wrong on `rules_js` itself (Finding 8): the API's own definition of "latest" is publish-timestamp order, not semver order, once a ruleset maintains a parallel maintenance branch. Mechanical check: list-and-sort, never single-call (Candidate 10).
- **Treating an undeclared `bazel_compatibility` as "works on any Bazel."** An agent that sees no field in `MODULE.bazel` and stops looking will recommend a floor the ruleset's own CI has never tested — three of the six rulesets in this exact set have exactly this gap (Finding 7). Mechanical check: `.bazelci/presubmit.yml` (or the ruleset's equivalent CI config) before any version-support claim ships.
- **Committing `--credential_helper` into a shipped `.bazelrc` because a quickstart example shows it that way.** Public RBE/remote-cache quickstarts routinely show `--credential_helper` in a project's committed rc for brevity; an agent reproducing that shape ships the exact vector `bazelbuild/bazel#30439` reports. Mechanical check: `grep -n credential_helper $(git ls-files | grep '\.bazelrc')` — any hit is the finding, independent of what value follows it ([BZL-CACHE-04](../bazel-caching-rbe.md)'s own verification).
- **Writing a bare, unscoped `build --lockfile_mode=error` from memory of "CI should catch a stale lockfile."** The instinct is correct; the scope is usually wrong on a first attempt, because most examples an agent has seen in passing don't show the `common:ci`/`test:ci` command-prefix convention distinguishing a CI-only flag from a global one — the result silently breaks every local dependency edit for every developer.
- **Assuming `try-import`'s "try" makes the imported file's content safe by construction.** `try-import` only controls whether a *missing* file causes a hard failure; it says nothing about what happens when the file *is* present with contents that diverge from what CI applies. An agent auditing "is this hermetic" by checking only for the word `try-import` and stopping there will miss the fleet's own shape-(b) CI-recreation trap (Decision 2).

## Contested / evolving

- **`PROJECT.scl`** is an emerging Bazel-9-era file format for mapping targets to flag sets, potentially displacing some of `.bazelrc`'s per-target `--config` conventions — deferred by the topic map (M-H-15) as "not settled," and this dive found no ruleset in the six-member set consuming it as of 2026-09-05. Direction: it exists in Bazel's own tooling surface today; promotion criterion per the map is "it appearing in a ruleset the fleet depends on," which has not happened yet.
- **The community always-on flag list itself is mid-migration** from prose (a blog post, individually maintained, aging silently) to code (a versioned Starlark module with per-flag version gates, explicitly not semver-safe and requiring vendored review). This dive's own measurement — 6 of 8 blog-named flags gone from the live CLI reference within four years — is itself evidence for why the migration is happening, not just a historical curiosity.
- **`bazel_compatibility` declaration is not yet a universal ruleset convention.** Half of the six rulesets in this set declare it in their released `MODULE.bazel`; half rely on an undocumented CI matrix instead, including at least one case (`rules_ts`) where the released artifact and its own `main` branch disagree on whether the field should be declared at all.
- **`--credential_helper`'s repository-relative-path exposure remains open as a documentation gap, not a code gap, as of 2026-09.** The maintainers' position — a workspace author is fully trusted, and `bazel query` on an unreviewed clone is not the safe operation many users assume it to be — is a real, defensible reading of Bazel's existing threat model, but the model's documentation has not yet been updated to say this explicitly for the benefit of anyone relying on the more casual assumption.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/run/bazelrc](https://bazel.build/run/bazelrc) | Official docs: rc precedence, import directives, `--config` mechanism, personal-config convention | Current, fetched 2026-09-05 | Primary source for Findings 1-2 and the personal-`--config` convention (M-H-10) |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official CLI reference (generated from source) | Current, fetched 2026-09-05 | Ground truth for exact flag defaults/text — `--sandbox_default_allow_network`, `--incompatible_strict_action_env`, `--credential_helper`, `--lockfile_mode`, `--repo_contents_cache`, and to check whether the 2022 blog's flags still exist |
| [bazel.build/release](https://bazel.build/release) | Official release-model page: LTS stage definitions, cadence, live support matrix | Current, fetched 2026-09-05 | Confirms the Bazel 9 Active / 8 Maintenance / 7 Maintenance / 6 Deprecated staging used throughout this program (deep LTS-lifecycle treatment is `lts-policy-and-incompatible-flag-churn`'s deliverable) |
| [bazel.build/release/backward-compatibility](https://bazel.build/release/backward-compatibility) | Official backward-compatibility policy page | Current, fetched 2026-09-05 | Confirms it names no specific flags and defers to the GitHub `incompatible-change` label — the premise this dive's sibling treats as its central finding |
| [raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml) | BCR's own live, tested incompatible-flag list | `main`, fetched 2026-09-05 | The narrow, actually-tested list contrasted with the broad GitHub-label list |
| [github.com/bazel-contrib/bazelrc-presets](https://github.com/bazel-contrib/bazelrc-presets) (README + `flags.bzl`) | The community-maintained rc-flag preset generator | `main`, fetched 2026-09-05 | Successor to the aspect.build blog; source of the not-semver-safe stance quote and the current, version-gated always-on flag data |
| [aspect.build/blog/bazelrc-flags](https://aspect.build/blog/bazelrc-flags) | The brief's named blog post on always-on flags | 2022-04-28 (dated from page metadata) | The historical source explicitly named in the brief; measured against current docs to show 6/8 named flags are gone |
| [github.com/bazelbuild/bazelisk](https://github.com/bazelbuild/bazelisk) (README) | Bazelisk's own docs | fetched 2026-09-05 | `--strict`/`--migrate`/`BAZELISK_INCOMPATIBLE_FLAGS` mechanism for testing a flag flip before the major that flips it lands |
| [github.com/bazelbuild/bazel/issues/7764](https://github.com/bazelbuild/bazel/issues/7764) | Open GitHub issue, "sandbox for repository rules" | filed 2019, open through 2026 | Direct evidence that repository-rule execution has never been sandboxed by default — settles the `--sandbox_default_allow_network` surprise |
| [github.com/bazelbuild/bazel/issues/30439](https://github.com/bazelbuild/bazel/issues/30439) | Closed (as intended) GitHub security issue on `--credential_helper` | reported/closed 2026 | Primary evidence for the credential_helper rc-placement rule; quoted for the "intended behavior under Bazel's documented threat model" determination |
| `aspect-build/rules_js` `MODULE.bazel` at `v3.4.1` (raw GitHub) and its releases API | Ruleset source + release history | fetched 2026-09-05 | `bazel_compatibility` declaration; the `releases/latest` vs. semver-sort discrepancy (Finding 8) |
| `aspect-build/rules_ts` `MODULE.bazel` at `v3.10.1` (raw GitHub) | Ruleset source | fetched 2026-09-05 | Confirms no `bazel_compatibility` in the released artifact, cross-checked against BZL-LARK's `main`-branch finding |
| `bazel-contrib/rules_python` `MODULE.bazel` at `2.3.3` and `.bazelci/presubmit.yml` (raw GitHub) | Ruleset source + CI config | fetched 2026-09-05 | No declared floor; CI matrix `[7.x, 8.x, 9.x]` as the real floor evidence |
| `bazelbuild/rules_rust` `MODULE.bazel` at `0.74.0` and `.bazelci/presubmit.yml` (raw GitHub) | Ruleset source + CI config | fetched 2026-09-05 | No declared floor; `minimum_bazel_version: "7.4.1"` anchor as the real floor evidence |
| `bazelbuild/rules_cc` `MODULE.bazel` at `0.2.22` and `.bazelci/presubmit.yml` (raw GitHub) | Ruleset source + CI config | fetched 2026-09-05 | No declared floor; `7.x` CI leg as the real floor evidence |
| `aspect-build/rules_lint` `MODULE.bazel` at `v2.9.0` (raw GitHub) | Ruleset source | fetched 2026-09-05 | Declares `bazel_compatibility = [">=7.6.0"]`, matching `rules_js` |
| `gh api repos/<org>/<repo>/releases` (six rulesets) | Measured command output, not a doc page | run 2026-09-05 | Ground truth for "current version, dated" per ruleset, and the source of the `releases/latest` discrepancy |
| `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-audit/build-contracts-and-ci-posture.md` | Fleet audit (wave 1) | 2026-09-05 | Every fleet rc-file flag, file:line, with rationale-present/absent already tabulated — the source for the entire Fleet evidence section |
| `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-bzlmod-and-repo-rules.md` and `/home/mherwig/dev/grimoire-lore/.agents/research/bazel-starlark-and-build.md` | Wave-2 consolidations (BZL-MOD, BZL-LARK) | 2026-09-05 | Source of every cited-not-restated rule ID (BZL-MOD-06/13, BZL-LARK-28) and the repo-rule hermeticity framing this dive builds on |
