---
title: "Nix / Nix flakes — failure corpus: antipatterns, review objections, postmortems, CVEs"
corpus: failure
agent: research-lang-scout-failure
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 24
scope: |
  Covers nix.dev's documented anti-patterns, the highest-reaction NixOS/nix
  "flakes"-labelled issues, nixpkgs packaging foot-guns (hash drift, infinite
  recursion, darwin SDK), Nix security advisories/CVEs 2024-2026, the nixpkgs
  package-review checklist as the codified form of recurring reviewer
  objections, home-manager/nix-darwin top issues, two contrarian/postmortem
  blog posts, and the flake-checker tool's own health-check taxonomy.
  Does NOT cover: generic CI mechanics (bazel-quality), generic Rust/Go/Python
  packaging internals (owned by rust-quality/go-quality/python-packaging), or
  the ocx-index-to-flake generator design itself (a different scout's brief) —
  flagged inline as "covered-elsewhere" or "adjacent" where it comes up.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- nix.dev's own anti-patterns page names five: `rec` self-reference (infinite
  recursion), top-level `with`, lookup paths (`<nixpkgs>`), impure
  `import <nixpkgs> {}`, and `src = ./.;` (irreproducible store path from
  directory name) — the fix for the last is `builtins.path { path = ./.; name
  = "..."; }`.
- The single highest-reaction NixOS/nix flakes-labelled issue open today is
  `nix build --all` (214 reactions, [#7165](https://github.com/NixOS/nix/issues/7165)); the highest of all flake-adjacent
  issues in the tracker is **"Lazy trees"** ([#6530](https://github.com/NixOS/nix/issues/6530), 372 reactions) — a
  redesign of how flake inputs are copied to the store, already shipped in
  Determinate Nix 3.5, not yet in upstream CppNix 2.35.
- "Copy local flakes to the store lazily" (184 reactions, [#3121](https://github.com/NixOS/nix/issues/3121)) and
  "untracked files invisible" (99 reactions, [#7107](https://github.com/NixOS/nix/issues/7107)) are the two most-felt
  consequences of the same underlying mechanism: a flake's `self` is the git
  index, not the working tree.
- `accept-flake-config = true` is confirmed (by NixOS/nix maintainers, in
  [#9649](https://github.com/NixOS/nix/issues/9649)) to grant a flake's build **root-equivalent** command execution via
  `nix.conf` settings like `post-build-hook` — this is "intended behavior,"
  not a bug, and the manual under-documents the severity.
- Two real CVEs against the Nix sandbox landed in 2024-2026, and one is a
  **fix that failed**: CVE-2026-39860 (critical, GHSA-g3g9) is a bypass of
  the earlier fix for CVE-2024-27297 — a symlink at the fixed-output-derivation
  `.tmp` copy destination let any daemon user overwrite arbitrary root-owned
  files, patched again in 2.34.5/2.33.4/2.32.7/2.31.4/2.30.4/2.29.3/2.28.6.
- The nixpkgs `pkgs/README.md` **is** the codified list of recurring reviewer
  objections: preferred hash type is `sha256` (attribute name `hash`, not
  `sha256`), fetch by full commit hash never a short one (GitHub returns 404
  on an ambiguous short hash, and short-hash spam is a documented DoS vector),
  prefer `fetchFromGitHub` over `fetchgit` over `git://`, `meta.mainProgram`
  required when exactly one main executable exists, `meta.license` must match
  upstream exactly, and every non-default build choice (disabled check,
  pinned version, patch) must carry a comment explaining why.
- The March 2024 `xz` backdoor (CVE-2024-3094) produced a same-day nixpkgs
  revert PR ([#300028](https://github.com/NixOS/nixpkgs/pull/300028), 73 reactions, merged within hours) — the closest
  thing this corpus has to a documented supply-chain postmortem, and it shows
  the nixpkgs response pattern (revert-first, investigate-after) rather than
  a lockfile-pin mechanism catching it.
- "1000 instances of nixpkgs" (Discourse, still cited in 2026 guides) is a
  concrete lock-file pathology: when N sibling flakes each pull `nixpkgs`
  without `follows`, `nix flake lock` resolves name collisions by appending
  `_2`, `_3`, ... and the corpus recorded a real case reaching a thousand.
  `follows` is the only fix; there is no automatic dedup.
- `nix flake check` evaluates every system's outputs (even ones it cannot
  build on the current host) and IFD there can trigger a real remote build
  attempt, producing a confusing "wrong platform" error instead of a clean
  skip ([#4265](https://github.com/NixOS/nix/issues/4265), open since 2020, still unresolved in 2.35).
  `--no-build` does not save you from this because evaluation, not building,
  is what breaks.
- `follows` itself has a decade-long tail of correctness bugs still open:
  transitive follows not resolved to absolute paths ([#6036](https://github.com/NixOS/nix/issues/6036)), `follows`
  removal not respecting the dependency's own `flake.lock` ([#14339](https://github.com/NixOS/nix/issues/14339)), and a
  reported segfault when an input accidentally follows itself ([#5393](https://github.com/NixOS/nix/issues/5393)).
- `cargoHash`/`vendorHash` drift is real but overstated as an "unstable
  hash" problem in folk wisdom — the recorded nixpkgs cases are Linux/Darwin
  hash divergence ([#308089](https://github.com/NixOS/nixpkgs/issues/308089), [#371272](https://github.com/NixOS/nixpkgs/pull/371272)) and Python-version-dependent
  hash variance ([#110580](https://github.com/NixOS/nixpkgs/pull/110580)), not silent nondeterminism per se.
- Darwin SDK breakage is a recurring, high-reaction category on its own
  ([#346043](https://github.com/NixOS/nixpkgs/issues/346043), 146 reactions, "darwin: change the SDK pattern, update the
  SDKs...") — distinct from ordinary hash mismatches, tied to Apple's SDK
  distribution changes outside Nix's control.
- nixfmt's status **changed under this program's own era window**: as of
  nixpkgs 25.11/26.11, `pkgs.nixfmt` **is** the RFC-166 formatter (stable);
  `pkgs.nixfmt-rfc-style` is now the deprecated transitional name, and
  `pkgs.nixfmt-classic` is the pre-RFC-166 formatter kept only for stragglers
  — the reverse of what most existing tutorials still say.
- `nixpkgs-fmt` (the nix-community tool, distinct from nixfmt) was archived
  2024-07-24; any AI-emitted reference to `nixpkgs-fmt` as current tooling is
  stale by definition.
- home-manager's top-reaction issues are almost entirely missing-feature
  requests (copy-not-symlink `home.file`, `outOfStoreSymlink`), not defects —
  a sign the module system itself is stable but its file-management model is
  felt as limiting.
- Two contrarian primary sources are worth weighing directly: jade.fyi's
  "Flakes aren't real and cannot hurt you" argues flakes wrongly couple
  version control, dependency management and lock-filing, and that
  `packages.${system}` cannot express cross-compilation; goldstein.lol's
  flake-implementation compatibility study evaluates real-world flakes
  against CppNix, Lix and an alternative resolver and finds evaluation-level
  breakage that "flake check" style testing would not have caught.
- The `flake-checker` tool (Determinate Systems) operationalizes exactly
  three lock-file health checks by default — `--check-outdated`,
  `--check-owner` (nixpkgs input's GitHub owner must be `NixOS`),
  `--check-supported` (ref must be a maintained branch: `rolling`, `beta`,
  `stable`, vs. `deprecated`/`unmaintained`) — plus an opt-in
  `--condition "numDaysOld < N"`; it always exits 0 in CI by design so it
  never fails a workflow on its own.

## Survey

### 1. nix.dev — anti-patterns / best practices ([nix.dev/anti-patterns/language](https://nix.dev/anti-patterns/language))

The canonical short list, confirmed by direct fetch 2026-09-27 (redirects
transparently from `/guides/best-practices.html`):

- **URLs**: always quote them.
- **`rec`**: `let a = 1; in rec { a = a; }` self-shadows and can produce
  infinite recursion; prefer `let ... in { ... }`, or for genuine
  self-reference `let argset = { a = 1; b = argset.a + 2; }; in argset`.
- **`with` at top level**, especially `with (import <nixpkgs> {});` —
  "static analysis can't reason about the code," multiple `with`s make name
  origin ambiguous, and Nix's `with` scoping rules are non-intuitive.
  Preferred: `let pkgs = import <nixpkgs> {}; inherit (pkgs) curl jq; in ...`
  or `buildInputs = builtins.attrValues { inherit (pkgs) curl jq; };`.
- **Lookup paths (`<nixpkgs>`)**: depend on `$NIX_PATH`, so "the same Nix
  expression can produce different results" machine to machine. Recommended
  only in minimal examples; otherwise pin explicitly. If lookup paths must
  stay, pin `$NIX_PATH` centrally under version control (NixOS:
  `nix.nixPath`).
- **`import <nixpkgs> {}`** with no args impurely reads config from the
  filesystem; always pass `{ config = {}; overlays = []; }` explicitly.
- **Shallow `//` on nested attrsets** silently drops keys
  (`{a.b=1;} // {a.c=3;}` loses `b`); use `pkgs.lib.recursiveUpdate`.
- **`src = ./.;`**: the resulting store path's symbolic name is derived from
  the parent directory name, so the same content in two differently-named
  checkouts produces different store paths and needless rebuilds. Fix:
  `src = builtins.path { path = ./.; name = "myproject"; };`.

### 2. NixOS/nix issue tracker, `label:flakes`, top 30 by reaction count ([search](https://github.com/NixOS/nix/issues?q=repo%3ANixOS%2Fnix+label%3Aflakes+sort%3Areactions-desc))

Fetched via `gh api search/issues?q=repo:NixOS/nix+label:flakes+is:issue`.
Highest-signal, still open as of 2026-09-27 unless noted:

- [#7165](https://github.com/NixOS/nix/issues/7165) `nix build --all` (214) — no shorthand to build every flake output; still requested.
- [#8881](https://github.com/NixOS/nix/issues/8881) "Run a single flake check" (200) — `nix flake check` is all-or-nothing.
- [#3121](https://github.com/NixOS/nix/issues/3121) "Copy local flakes to the store lazily" (184) — root cause of slow local
  iteration; superseded in direction by Lazy Trees (#6530).
- [#3920](https://github.com/NixOS/nix/issues/3920) "Support flake references to patches" (159) — now implemented (see
  Lazy Trees changelog: `fetchTree { patches = [...] }`).
- [#3843](https://github.com/NixOS/nix/issues/3843) "Make handling system parameter more ergonomic" (132) — the root
  demand behind flake-utils / flake-parts existing at all.
- [#5663](https://github.com/NixOS/nix/issues/5663) "Allow plain Nix expressions as flake inputs" (117).
- [#3978](https://github.com/NixOS/nix/issues/3978) "Allow flakes to refer to other flakes by relative path" (104) — still
  open; relative-path input support is fragmented (see #10089, #12281,
  #14762 below).
- [#7107](https://github.com/NixOS/nix/issues/7107) "Flakes: Not including untracked files is confusing for unaware
  users" (99) — full text: flakes copy the **git-tracked tree**, so an
  unstaged new file is invisible to the build with no error, "manifests
  with users being very confused why their shiny new code seems to not
  exist at all." The reporter explicitly does not want this changed (it
  prevents accidental copies of `result` symlinks / build artifacts into
  the store) — it is a discoverability problem, not a design flaw.
- [#8013](https://github.com/NixOS/nix/issues/8013) "Flake not accessible through symlink" (80).
- [#3872](https://github.com/NixOS/nix/issues/3872) "Nix flakes should not cache evaluation errors" (60) — eval-cache can
  hide a fixed error until `--eval-cache false` or `--refresh`.
- [#4265](https://github.com/NixOS/nix/issues/4265) "nix flake check breaks on IFD in multi-platform flake" (49) — full
  repro: a `checks` output built via `eachDefaultSystem` tries to *evaluate*
  every system's IFD-based check even when it will only build the current
  platform's, producing `a 'aarch64-linux' ... is required ... but I am a
  'x86_64-linux'` instead of skipping. Open since 2020.
- [#7422](https://github.com/NixOS/nix/issues/7422) "Remove the flake registry or diminish its role" (46) — registry
  entries (e.g. bare `nixpkgs` resolving via `github:NixOS/nixpkgs`) are an
  impurity/surprise vector many maintainers want gone or opt-in only.
- [#5551](https://github.com/NixOS/nix/issues/5551) "avoid copying local flake to the store when `self` arg is omitted"
  (43) — cost of touching `self` even when unused.
- [#10815](https://github.com/NixOS/nix/issues/10815) "'lock file contains unlocked input' when using (dirty) git+file://
  input" (26) — dirty-tree handling interacting badly with lock validation.

### 3. NixOS/nix — `follows`, dirty trees, relative paths, submodules (targeted searches)

- **`follows` bugs**, still open in 2026: [#6036](https://github.com/NixOS/nix/issues/6036) nested follows not resolved
  to absolute paths; [#8325](https://github.com/NixOS/nix/issues/8325) can't override a transitive follows without
  overriding its flakeref; [#5393](https://github.com/NixOS/nix/issues/5393) "if input accidentally follows itself, nix
  will segfault"; [#14339](https://github.com/NixOS/nix/issues/14339) "Removing `follows` does not respect dependency's
  own `flake.lock`" — i.e. deleting a `follows` line does not restore the
  pin the dependency itself wanted, it leaves the previously-resolved value.
- **Dirty trees**: [#10815](https://github.com/NixOS/nix/issues/10815) (above); [#9292](https://github.com/NixOS/nix/issues/9292) `builtins.fetchGit` dirty mode
  "almost unusable" in pure eval mode; [#9885](https://github.com/NixOS/nix/issues/9885) `warn-dirty = false` in
  `nixConfig` silently not honored; [#5302](https://github.com/NixOS/nix/issues/5302) flakes always think a worktree is
  dirty inside GitHub Actions PR builds (shallow clone / detached HEAD
  artifact — a CI-specific footgun).
- **Relative path inputs** remain genuinely unfinished: [#10089](https://github.com/NixOS/nix/issues/10089) "Improve
  support for relative path inputs"; [#12281](https://github.com/NixOS/nix/issues/12281) `git+file:relative/path` handling;
  [#14762](https://github.com/NixOS/nix/issues/14762) "Incorrect handling of relative path flake input in nested
  subflake setups"; [#12438](https://github.com/NixOS/nix/issues/12438) a 2.26 regression in `nix flake archive` fetching
  relative `path:` inputs. Net: monorepo-style flake composition via
  relative paths is still an evolving, bug-prone area in 2.35, not a solved
  pattern to teach as stable.
- **Submodules**: [#7862](https://github.com/NixOS/nix/issues/7862) "support managing submodules via inputs.self";
  [#5497](https://github.com/NixOS/nix/issues/5497) "a different take on git submodule support for flakes" — submodule
  content is, like untracked files, invisible to a flake's source copy
  unless explicitly fetched; there is no first-class `submodules = true`
  equivalent for a flake's own `self` the way `fetchGit` has one for inputs.

### 4. NixOS/nix — Lazy trees ([#6530](https://github.com/NixOS/nix/issues/6530), 372 reactions — highest in this corpus)

Read in full via `gh api`. This is a from-the-ground-up redesign of how
flake inputs reach the evaluator, and it directly resolves #3121 and
partially #3920:

- **Change**: an operation like `nix build nixpkgs#hello` "no longer copies
  the `nixpkgs` flake to the Nix store" — only `src = ./.;` or
  `nix.registry.nixpkgs.flake = nixpkgs;` still force a full copy.
- **New mechanism**: `fetchTree` returns a lazy tree; a `SourcePath` is now
  a tuple of an `InputAccessor` and a relative path, not a store path
  directly. `ZipInputAccessor` reads GitHub inputs straight out of a `.zip`
  without unpacking to disk (measured: an unpacked Nixpkgs tree is 252 MiB
  on ext4 vs 43 MiB as a zip).
- **`patches` on `fetchTree`** ("Support flake references to patches", #3920)
  is now real: `fetchTree { ...; patches = [ ./foo.patch ]; }`, applied
  in-memory.
- **Breaking change documented in the issue itself**: `fetchTree`'s
  `outPath` is no longer necessarily a store path but a `SourcePath`; NixOS's
  `nix.registry.nixpkgs.flake = nixpkgs;` broke with `A definition for
  option 'nix.registry.nixpkgs.to.path' is not of type ...` and needed
  rewriting to `nix.registry.nixpkgs.flake = "${nixpkgs}";` to force
  string coercion back to a store path.
- **Status as of 2026-09-27**: shipped in **Determinate Nix 3.5** (per
  Lobsters discussion), explicitly **not adopted by Lix**, which "does not
  intend to use the upstream implementation of lazy trees" and plans "a
  functionally equivalent replacement." Not yet in upstream CppNix 2.35.2
  per the frame's measured version. This is a live three-way divergence
  point for anything claiming a single "how flakes copy sources" behavior.

### 5. NixOS/nix security advisories ([github.com/NixOS/nix/security/advisories](https://github.com/NixOS/nix/security/advisories))

Fetched the full list via `gh api repos/NixOS/nix/security-advisories`
(11 advisories total, all severities). Read in detail:

- **GHSA-g3g9-5vj6-r3gj / CVE-2026-39860** (critical, published 2026-04-07):
  "Sandbox escape: file write via symlink at FOD `.tmp` copy destination."
  A bug in the *fix* for CVE-2024-27297: the temporary output copy for a
  fixed-output derivation lived inside the build chroot; a malicious builder
  plants a symlink there pointing anywhere in the filesystem, and the
  host-namespace Nix process (root, in multi-user installs) follows it
  during output registration and overwrites the target with the
  derivation's contents. Any user allowed to submit builds
  (`allowed-users`, default: all) can escalate to root. Fixed again in
  2.34.5 / 2.33.4 / 2.32.7 / 2.31.4 / 2.30.4 / 2.29.3 / 2.28.6, this time by
  moving the temp copy to a store-internal directory inaccessible to other
  users, plus abstract-Unix-socket hardening effective only on kernel
  ≥ 6.12 with landlock enabled. **Sandboxed macOS builds are unaffected.**
  Workaround given: don't allow untrusted users to submit builds at all.
- **GHSA-jm6c-h95p-6qhj** (medium): unprivileged local users can poison
  content-addressed derivation realisations via `RegisterDrvOutput` when
  the experimental `ca-derivations` feature is enabled — daemon does not
  verify signatures on submitted realisation objects. Fix not backported;
  workaround is simply not enabling `ca-derivations`.
- **GHSA-h4vv-h3jq-v493** (critical): "Unsafe NAR unpacking."
- **GHSA-vh5x-56v6-4368** (high): coroutine stack-to-heap overflow via
  unbounded recursion in the NAR directory parser — a malicious/corrupt NAR
  can crash or worse.
- **GHSA-gr92-w2r5-qw5p** (medium): absolute path traversal unpacking
  archives to disk.
- **GHSA-6fjr-mq49-mm2c** (medium): credential leak when credentials are
  used with `<nix/fetchurl.nix>`.
- **GHSA-2ffj-w4mj-pg37** (medium): corruption of fixed-output derivations.
- Others (low/medium): macOS privilege-drop breakage (GHSA-qc7j),
  recursive-nix arbitrary file truncation (GHSA-6h4g), a plain sandbox
  escape (GHSA-q82p), macOS sandbox escape via built-in builders
  (GHSA-wf4c).
- **Pattern across the list**: the sandbox boundary (FODs, NAR parsing,
  recursive-nix) is where severity concentrates; flake-specific code itself
  has produced no CVE in this list — the risk flakes add is trust-model
  (nixConfig, substituters), not memory/sandbox safety.

### 6. NixOS/nixpkgs — packaging foot-guns (targeted issue searches)

- **Infinite recursion** is overwhelmingly a **module-system / overlay /
  `finalAttrs` self-reference** problem, not a language-level `rec` problem
  in practice: recent hits include `check-meta: infinite recursion when
  Nixpkgs config is a function of pkgs (aarch64-darwin)` ([#550879](https://github.com/NixOS/nixpkgs/issues/550879)),
  `nixos: Avoid infinite recursion through environment variables`
  ([#428328](https://github.com/NixOS/nixpkgs/pull/428328)), `fetchurl: possible infinite recursion through cacert`
  ([#505179](https://github.com/NixOS/nixpkgs/pull/505179)), and historically Haskell overlays ([#83098](https://github.com/NixOS/nixpkgs/issues/83098)). nixpkgs
  itself is now adding **module-system error contexts specifically for
  infinite-recursion diagnosis** in `imports` and module arguments
  ([#370967](https://github.com/NixOS/nixpkgs/pull/370967)) — an implicit admission the existing error message
  ("infinite recursion encountered") is not actionable on its own.
- **Hash mismatch / drift**: the generic "how do I even reproduce this
  sha256" question ([#191128](https://github.com/NixOS/nixpkgs/issues/191128), 57 reactions) outranks any specific drift
  bug — meaning the *workflow* of regenerating a fetcher hash is the actual
  pain point, not the drift mechanism itself. `nix-update`/`nurl` exist
  precisely to remove this workflow from humans.
- **cargoHash/vendorHash drift**: concrete, narrow cases, not a generic
  "hashes are unstable" phenomenon: Linux/Darwin divergence for the same
  crate ([#308089](https://github.com/NixOS/nixpkgs/issues/308089), [#371272](https://github.com/NixOS/nixpkgs/pull/371272) "atuin: make cargoHash the same on Linux
  and Darwin"), Python-interpreter-version-dependent hash for a Rust wheel
  build ([#110580](https://github.com/NixOS/nixpkgs/pull/110580)), and outright non-determinism per build reported for
  one package in 2026 ([#525097](https://github.com/NixOS/nixpkgs/issues/525097) "restate: cargoHash produces different
  hashes on each build", resolved by switching to `cargoLock` in
  [#525262](https://github.com/NixOS/nixpkgs/pull/525262) — i.e. the fix for real cargoHash nondeterminism is often
  "stop using `cargoHash`, vendor via `Cargo.lock` instead").
  Covered-elsewhere note: the buildRustPackage mechanics themselves belong
  to `rust-quality`/`rust-cargo`; the Nix-specific edge is only the
  hash-attribute-drift interaction with nixpkgs review.
- **Darwin SDK breakage**: its own high-reaction category, distinct from
  ordinary hash mismatches — [#346043](https://github.com/NixOS/nixpkgs/issues/346043) "darwin: change the SDK pattern,
  update the SDKs, and update source releases" (146 reactions) — driven by
  Apple changing SDK distribution/licensing terms outside nixpkgs' control,
  not a Nix defect. Historically also a large infinite-recursion source for
  cross-compiling to Darwin/iOS ([#107241](https://github.com/NixOS/nixpkgs/issues/107241), [#177557](https://github.com/NixOS/nixpkgs/issues/177557)).
- **IFD and `nix flake check`**: see #4265 above — the check command
  evaluates foreign-system outputs it will never build, and if those
  outputs use IFD, evaluation alone can attempt (and fail) a foreign build.

### 7. nixpkgs `pkgs/README.md` — the canonical, codified review checklist ([raw](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md))

Fetched in full (1325 lines). This *is* the nixpkgs project's own answer to
"what do reviewers object to," more reliable than sampling individual PR
threads:

- **Sources**: "Always fetch source files using Nixpkgs fetchers. Use
  reproducible sources with a high degree of availability. Prefer protocols
  that support proxies." "The preferred source hash type is `sha256`" —
  meaning the attribute name `hash = "sha256-...";`, not the older
  `sha256 = "...";` attribute name. Explicit bad→better→best ladder:
  `fetchgit` over `git://` (bad, no proxy) → `fetchgit` over `https://`
  (better, still slower) → `fetchFromGitHub` with `rev` + `hash` (best,
  fetches a snapshot archive). **Always reference GitHub revisions by full
  commit hash**: "GitHub shares commit hashes among all forks and returns
  `404 Not Found` when a short commit hash is ambiguous" — and the README
  cites a real prior incident of exactly this happening in nixpkgs with
  6-character hashes, plus links a documented attack ("Pushing large
  amounts of auto generated commits into forks is a practical vector for a
  denial-of-service attack... demonstrated against GitHub Actions Beta").
- **Patches**: prefer `fetchpatch2` for already-merged/published patches
  over vendoring them; patch names or comments must state *why*, not just
  what; a patch containing short commit hashes (`index 0c97fcc35..f533e464a
  100644`) must use `fetchpatch` instead of `fetchpatch2` (tracking issue
  [#257446](https://github.com/NixOS/nixpkgs/issues/257446)) unless the URL is expanded (`?full_index=1`).
- **`meta` requirements** (new-package review checklist, verbatim
  attribute names): `meta.license` must match upstream exactly (default
  `lib.licenses.unfree` if none is stated); `meta.mainProgram` **must** be
  set when exactly one executable exists under `$bin/bin` or `$out/bin`
  (worked example: `ripgrep.meta.mainProgram = "rg"`), and must **not** be
  set when there are zero or multiple candidate executables (counter-
  examples given: `polkit_gnome`, `e2fsprogs`); `meta.platforms` must be set
  or the package gets no binary substitutes; `meta.maintainers` must be set.
- **`passthru.updateScript`**: documented value shapes — a path
  (`./update.sh`), a `writeScript` derivation, an attribute-set form with
  `command`/`attrPath`, and for the common case just
  `passthru.updateScript = nix-update-script { };` inside a `finalAttrs:`
  pattern. This is what lets `nixpkgs-update`'s automation (seen live in the
  survey: PR authored by bot `r-ryantm`, reviewed and merged same-day for a
  Python package bump) find and apply a version bump without a human
  diffing the derivation by hand.
- **Verbatim new-package review checklist** (the literal reviewer template
  nixpkgs ships): `package path fits guidelines`, `package name fits
  guidelines`, `package version fits guidelines`, `package builds on
  ARCHITECTURE`, `executables tested on ARCHITECTURE`, `meta.description is
  set and fits guidelines`, `meta.license fits upstream license`,
  `meta.platforms is set`, `meta.maintainers is set`, `meta.mainProgram is
  set, if applicable`, `build time only dependencies are declared in
  nativeBuildInputs`, `source is fetched from an official or trusted
  location`, `source is fetched using the appropriate function`, `the
  motives for any special packaging choices are documented`, `the list of
  phases is not overridden`, `when a phase ... is overridden it starts with
  runHook preInstall and ends with runHook postInstall`, `patches have a
  comment describing either the upstream URL or a reason why the patch
  wasn't upstreamed`, `patches that are remotely available are fetched
  rather than vendored`.
- **Package-update review checklist** adds: verify any upstream-location
  change (e.g. PyPI→GitHub) actually targets the official repo, or that a
  fork switch has community consensus from other package repositories;
  document why a pinned special version can't yet be unpinned.
- Recommends `nixpkgs-review` (`nix-shell -p nixpkgs-review --run
  "nixpkgs-review pr PRNUMBER"`) as the practical single-command reviewer
  workflow, plus a documented rebase recipe onto `nixos-unstable` for
  easier local review of a PR targeting a stale base branch.

### 8. nixpkgs `CONTRIBUTING.md` ([raw](https://raw.githubusercontent.com/NixOS/nixpkgs/master/CONTRIBUTING.md)) and `pkgs/by-name/README.md` ([raw](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/README.md))

967 and 219 lines respectively, fetched in full. Confirms commit-convention
review gate (commits must "make sense together," `git cherry-pick -x` for
obvious-reason backports vs. `-xe` with an explicit written reason for
non-obvious ones) and shows the modern idiomatic shape nixpkgs itself now
recommends for `by-name` packages: `stdenv.mkDerivation (finalAttrs: {
...; passthru.tests.example = callPackage ./example.nix { my-package =
finalAttrs.finalPackage; }; ...})` — i.e. `finalAttrs.finalPackage`, not a
self-referential `rec`, is the current idiom for a package that needs to
refer to its own final derivation (e.g. for its own test suite).

### 9. Determinate Systems `flake-checker` ([raw README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md), v0.2.15 per frame)

A tool, not an issue tracker, but it operationalizes what the *maintainers
of a flake-lint tool* consider the recurring lock-file health problems
worth automating: by default it verifies three things about a `flake.lock`'s
root-level nixpkgs inputs — `--check-outdated` (age), `--check-owner`
(GitHub owner of the input must literally be `NixOS`, catching forks/typo-
squats), `--check-supported` (the ref must map to a maintained branch
status: `rolling`, `beta`, `stable`, vs. `deprecated`/`unmaintained`). An
opt-in `--condition "numDaysOld < 365"` lets a team set its own staleness
bar. Ships telemetry by default (`--no-telemetry` / `FLAKE_CHECKER_NO_TELEMETRY=true`
to disable). Its own GitHub Action variant **always exits 0** — "and thus
never fails your workflows" — meaning teams that add it expecting a hard
CI gate get a Markdown summary instead, silently.

### 10. Discourse — "1000 instances of nixpkgs" ([thread](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347))

Mechanism, confirmed by direct fetch: when sibling flakes in a dependency
graph each declare their own `nixpkgs` input and none of them declares
`inputs.<name>.inputs.nixpkgs.follows = "nixpkgs"` up the chain, `nix flake
lock` must give every node a unique name and resolves collisions by
appending `_2`, `_3`, ... — the thread's title case reached roughly a
thousand such suffixes in one real project's lock file. Consequences:
redundant nixpkgs evaluation (each instance is a full re-evaluation of
nixpkgs' fixed point), a bloated and unreadable `flake.lock`, and — because
overlays only apply within the instance they're attached to — silent
divergence in which packages actually see a given overlay. The only fix is
`follows`; there is no automatic deduplication by content hash.

### 11. jade.fyi — "Flakes aren't real and cannot hurt you" ([post](https://jade.fyi/blog/flakes-arent-real/))

A named, still-current (author active on Lix-adjacent work) contrarian
primary source, read in full via fetch. Core claims: flakes wrongly
"couple version control integration, dependency management and lockfile
management" into one mechanism; `packages.${system}` as a schema has no
slot for cross-compilation, so a downstream consumer cannot ask a flake for
"build this package *for* aarch64 *from* x86_64" without the flake author
having anticompatibly hand-rolled it; flake input fetchers "block further
evaluation while fetching," serializing what could be parallel downloads.
Recommended pattern: treat the flake as a thin *entry point* only — real
composition (overlays, `callPackage`, `makeScope` for self-referential
packages) stays in plain Nix files following ordinary nixpkgs conventions,
so the flake layer stays swappable/optional rather than becoming the load-
bearing composition mechanism.

### 12. goldstein.lol — flake-implementation compatibility study ([post](https://goldstein.lol/posts/great-nix-flake-check/))

A large-scale empirical test across real-world flakes: strip the lockfile,
regenerate it with `nix flake lock` (CppNix), Lix, and an alternative
resolver ("unflake"), then `nix-instantiate --eval` a fixed set of
attributes (`devShells`, `packages`/`legacyPackages`, `checks`,
`nixosConfigurations.*.config.system.build.toplevel`) rather than building
everything ("would take forever"). This is evidence-based support for
treating implementation choice (CppNix vs. Lix) as something that can
change which flakes evaluate cleanly, independent of `nix flake check`
passing on the author's own machine.

### 13. nixpkgs supply-chain incident — xz backdoor response ([PR #300028](https://github.com/NixOS/nixpkgs/pull/300028))

CVE-2024-3094 (not a Nix CVE — an upstream xz-utils supply-chain attack).
Read the merge record: nixpkgs's own revert PR body states plainly "The
upstream tarball has been tampered with and includes a backdoor for which
we cannot completely rule out, whether we are affected," links the
`oss-security` disclosure, and was merged same-day (2024-03-29). This is
the shape of a real nixpkgs supply-chain incident response: revert the
specific version bump immediately, investigate blast radius after — there
is no automated lock-file-level "known-bad version" gate that caught it
first; a human/maintainer reaction did.

### 14. Nix formatter status — RFC 166 / nixfmt ([README](https://raw.githubusercontent.com/NixOS/nixfmt/master/README.md), [Enforcing Nix formatting in Nixpkgs](https://discourse.nixos.org/t/enforcing-nix-formatting-in-nixpkgs/49506))

Direct fetch of the nixfmt README plus the enforcement announcement. As of
the nixpkgs 25.11/26.11 era (this program's measured era): `pkgs.nixfmt` is
now the **stable** RFC-166 formatter; `pkgs.nixfmt-rfc-style` is the
transitional/deprecated attribute name kept for compatibility;
`pkgs.nixfmt-classic` is the pre-RFC-166 formatter, retained "for some more
time" for stragglers. `nixfmt-tree` packages a pre-configured `treefmt`
instance wired to nixfmt. Separately, `nixpkgs-fmt` (a different,
nix-community-maintained tool, easily confused with `nixfmt` by name) was
archived 2024-07-24 and is fully superseded — any current guidance still
recommending `nixpkgs-fmt` is stale.

### 15. FlakeHub best practices and semver ([best-practices](https://docs.determinate.systems/flakehub/best-practices/), [semver](https://docs.determinate.systems/flakehub/concepts/semver/))

Determinate Systems' own docs, fetched via search+summarize. Two supported
release shapes, both nominally SemVer-conformant: **tagged** releases
(author-chosen SemVer scheme, git tag must be literally `v` + SemVer, e.g.
`v0.1.1`) for projects with a defined release cadence, and **rolling**
releases for a constant commit stream. Explicit unit-of-publishing
guidance: "publish one flake per versioned thing" — a CLI tool, a NixOS
service configuration, a Home Manager configuration series, etc., each as
its own flake rather than one monolithic flake bundling unrelated
versioned artifacts.

### 16. Lix — flake stability stance ([about](https://lix.systems/about/), [flake stabilisation proposal](https://wiki.lix.systems/books/development/page/flake-stabilisation-proposal))

Lix (a CppNix fork) explicitly does **not** intend to drop flakes ("flakes
are the way that the majority of people use Nix today") but does intend to
make parts of the schema *stricter* rather than looser: `inputs` is
characterized in Lix's own docs as "super static" (changing anything about
its shape breaks a lot downstream), while `outputs` is explicitly
extensible but changing its *predefined* attributes is flagged as
dangerous. Net position: Lix is trying to stabilize a subset of the
existing flake schema rather than either freezing CppNix's exact current
behavior or replacing flakes outright — a third position distinct from
both "flakes are permanently experimental" (CppNix's own manual language)
and "flakes aren't real" (jade.fyi, above).

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| When does a flake silently ignore an untracked file, and what's the one-command check before debugging further? | #1 confusion source for new flake users; no error, just absence | [NixOS/nix#7107](https://github.com/NixOS/nix/issues/7107) | no | flake-schema, consumer-ux | P0 |
| What exactly does `accept-flake-config = true` grant a flake author, and when is it safe to set vs. never? | Confirmed root-equivalent command execution, not a hardening knob | [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) | no | security, publishing | P0 |
| When must a flake input declare `inputs.nixpkgs.follows`, how do you detect duplicate nixpkgs instances already in `flake.lock`, and what breaks (build time, overlay reach) when `follows` is missing? | The single largest documented lock-file pathology ("1000 instances") | [Discourse #17347](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347) | no | inputs-lock | P0 |
| What is the correct `hash =` value and fetcher choice for a GitHub source, and why must the `rev` always be a full commit hash, never abbreviated? | Codified nixpkgs review requirement; short-hash 404s and is a documented DoS vector | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | packaging, fetchers | P0 |
| Which attributes does the nixpkgs new-package review checklist require verbatim (`meta.mainProgram`, `meta.license`, `meta.platforms`, `meta.maintainers`, `nativeBuildInputs` vs `buildInputs`, `runHook pre/postInstall`), and how does an agent self-check them before opening a PR? | This *is* nixpkgs's own operationalized reviewer-objection list | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | packaging | P0 |
| What does `nix flake check` actually evaluate for a foreign system, and why can IFD there fail the check with a misleading "wrong platform" error instead of skipping? | Open since 2020, still current on 2.35.2; false-negative CI green / false-positive local red | [NixOS/nix#4265](https://github.com/NixOS/nix/issues/4265) | no | checks-ci, flake-schema | P0 |
| Which sandbox/FOD CVEs are relevant to a self-hosted or CI Nix daemon in 2026, and does the workaround ("don't allow untrusted builds") apply to your setup? | A *fix* for a 2024 CVE was itself broken until April 2026 (critical) | [GHSA-g3g9](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) | no | security | P0 |
| What is `pkgs.nixfmt` today (26.11 era) vs. `nixfmt-rfc-style` vs. `nixfmt-classic` vs. the archived `nixpkgs-fmt`, and which one should a new flake's `formatter` output point to? | Direct H1 test: agents emit the wrong, now-superseded name | [nixfmt README](https://raw.githubusercontent.com/NixOS/nixfmt/master/README.md) | no | formatter-lint | P0 |
| How does `passthru.updateScript` work (path / derivation / attrset form / `nix-update-script {}`), and what breaks a package's automated-update eligibility? | Determines whether a package can be bumped by bot automation at all | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | packaging, release-versioning | P1 |
| Why does a relative `path:` or `git+file:relative/path` flake input still misbehave in nested subflake setups on Nix 2.35, and what's the safest current pattern for a monorepo? | Multiple still-open bugs across versions; not a solved pattern | [NixOS/nix#10089](https://github.com/NixOS/nix/issues/10089), [#12281](https://github.com/NixOS/nix/issues/12281), [#14762](https://github.com/NixOS/nix/issues/14762) | no | inputs-lock | P1 |
| What does Lazy Trees change about how a flake input is copied to the store, and does it apply to the Nix build in this fleet's toolchain (CppNix 2.35.2), Lix, or only Determinate Nix? | 372-reaction issue; a genuine three-way implementation divergence right now | [NixOS/nix#6530](https://github.com/NixOS/nix/issues/6530) | no | impls, fetchers | P0 |
| Under what conditions does `nix flake lock` produce `nixpkgs_2`, `_3`, ... suffixes, and what's the grep to detect it in an existing `flake.lock` before it reaches 1000? | Concrete, greppable failure signature | [Discourse #17347](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347) | no | inputs-lock | P1 |
| Is a git submodule visible to a flake's own `self`, and what must a flake author do differently from a non-flake checkout to include one? | No first-class equivalent of `fetchGit { submodules = true; }` for self | [NixOS/nix#7862](https://github.com/NixOS/nix/issues/7862), [#5497](https://github.com/NixOS/nix/issues/5497) | no | flake-schema | P1 |
| When does `git+file://` treat a working tree as "dirty," what warning does that suppress or add (`?dirty` suffix, `nix flake metadata` warning), and can `warn-dirty = false` in `nixConfig` be trusted to silence it? | `nixConfig`-level setting confirmed not always honored | [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885) | no | flake-schema, consumer-ux | P2 |
| Why does a shallow-cloned CI checkout (e.g. GitHub Actions PR builds) make Nix think a flake's own tree is dirty even with no local changes, and what checkout depth/ref avoids it? | CI-specific, silently makes every CI build "dirty" | [NixOS/nix#5302](https://github.com/NixOS/nix/issues/5302) | no | checks-ci | P1 |
| What is the actual attack surface of the nixpkgs flake `nixConfig` block (extra substituters, trusted keys) for a consumer who runs `nix build` without `--accept-flake-config`, versus one who has it globally enabled? | Directly ties #9649 to a publishing-side decision: should a public flake even set `nixConfig`? | [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) | no | security, publishing | P0 |
| cargoHash/vendorHash: when is a Linux/Darwin or Python-version hash divergence expected vs. a sign of real non-determinism that should be fixed by switching to `cargoLock`? | Real recorded cases of both; not the same bug | [nixpkgs#308089](https://github.com/NixOS/nixpkgs/issues/308089), [#525097](https://github.com/NixOS/nixpkgs/issues/525097)/[#525262](https://github.com/NixOS/nixpkgs/pull/525262) | partial (rust-quality owns buildRustPackage mechanics) | packaging, fetchers | P1 |
| What is nixpkgs's own documented workaround pattern when an upstream release turns out to be a supply-chain compromise (the xz precedent), and does it generalize to a lock-file-level "known-bad" gate? | Only real recorded nixpkgs supply-chain incident; answer is "no automated gate, a human reverted it same day" | [nixpkgs PR#300028](https://github.com/NixOS/nixpkgs/pull/300028) | no | security | P1 |
| How does `flake-checker`'s default `--check-owner`/`--check-supported`/`--check-outdated` triad work, why does its GitHub Action always exit 0, and what does a team need to add to make it a real CI gate? | Silent non-enforcement is a specific, checkable footgun | [flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | no | checks-ci, cache | P1 |
| Does `meta.mainProgram` need to be set for this package, using the exact nixpkgs decision rule (one executable → yes, zero or many → no)? | Concrete, mechanically checkable rule, frequently gotten wrong | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | packaging | P1 |
| Why does `finalAttrs.finalPackage` (the current idiom) differ from a self-referential `rec { }` for a package that needs to reference its own final derivation (e.g. in `passthru.tests`)? | Directly contradicts H1's assumption that `rec` is simply avoided — nixpkgs itself now recommends `finalAttrs:` as the *replacement* mechanism for the legitimate self-reference case | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | lang, packaging | P1 |
| What does Apple's SDK distribution/licensing churn (2025-2026) break in Darwin builds, and is there a stable current SDK-pinning pattern in nixpkgs, or is this an ongoing moving target? | High-reaction (146), maintainer-acknowledged as not fully resolved | [nixpkgs#346043](https://github.com/NixOS/nixpkgs/issues/346043) | no | packaging, darwin-linux | P2 |
| Is "infinite recursion encountered" almost always a module-system/overlay self-reference problem rather than a plain-`rec` problem in current (2026) nixpkgs, and what's the fastest way to localize it (the new module-system error contexts)? | Directly tests/refines H1; nixpkgs is adding dedicated diagnostics for this, implying the plain error is not actionable | [nixpkgs#370967](https://github.com/NixOS/nixpkgs/pull/370967), [#550879](https://github.com/NixOS/nixpkgs/issues/550879) | no | module-system, lang | P0 |
| What's the current stable name for the RFC-166 formatter (`nixfmt` vs `nixfmt-rfc-style` vs `nixfmt-classic`), and is `nixpkgs-fmt` (archived 2024-07-24) still referenced anywhere it shouldn't be? | Direct check against dated-idiom emission (H1) | [nixfmt README](https://raw.githubusercontent.com/NixOS/nixfmt/master/README.md) | no | formatter-lint | P0 |
| What SemVer tag format does FlakeHub require for a "tagged" release (`v` + SemVer, exact), and how does "rolling" release semantics differ for a project without a defined cadence? | Only channel in this corpus with a real semver-resolving mechanism (H4) | [FlakeHub semver docs](https://docs.determinate.systems/flakehub/concepts/semver/) | no | release-versioning, publishing | P1 |
| Should a single repo publish one flake per "versioned thing," and what does violating that (one flake, many unrelated versioned artifacts) break for a consumer pinning a specific version? | Explicit FlakeHub guidance, directly informs the ocx-generated-flake shape | [FlakeHub best practices](https://docs.determinate.systems/flakehub/best-practices/) | no | publishing, generated-flakes | P1 |
| Given jade.fyi's cross-compilation critique, can `packages.${system}` express "build for aarch64 from x86_64," or does a flake need a different attribute shape (and what does nixpkgs's own cross story recommend instead)? | A named, credible contrarian claim worth testing against nixpkgs cross docs directly, not taking on faith | [jade.fyi](https://jade.fyi/blog/flakes-arent-real/) | no | flake-schema, systems | P2 |
| Does CppNix 2.35.2, Lix, and Determinate Nix each evaluate the same flake's `devShells`/`packages`/`checks` identically, or does implementation choice change what's a clean eval vs. a break? | Empirically demonstrated divergence across implementations | [goldstein.lol study](https://goldstein.lol/posts/great-nix-flake-check/) | no | impls, checks-ci | P1 |
| Is `nix flake check`'s green result sufficient evidence a flake is publishable, or does it miss non-derivation `packages` outputs, un-evaluated foreign systems, and IFD-triggered foreign builds (H3)? | Directly tests H3 against #4265 and the goldstein.lol methodology | [NixOS/nix#4265](https://github.com/NixOS/nix/issues/4265) | no | checks-ci | P0 |
| What exact reactions/objections show up when nixpkgs reviewers request `strictDeps`/`versionCheckHook`/`nativeBuildInputs` corrections, and is there a lint (statix/deadnix) that catches any of them today? | Confirmed via toolchain: statix's 17 lints (W01-W23) are Nix-language-level only; none of them check `meta.*`, `nativeBuildInputs` placement, or `versionCheckHook` — a real gap between "lints clean" and "review-ready" | statix `list` output (toolchain run) | no | formatter-lint, packaging | P1 |
| What do statix's 17 lints (`W01 bool_comparison` … `W23 empty_list_concat`) actually catch, and which common review objections (hash type, meta fields, tag vs rev) do they explicitly NOT catch? | Confirmed by direct toolchain run; sets expectations for what "lints pass" can and can't promise | statix `list` (toolchain run, confirmed 2026-09-27, statix in nix-tools) | no | formatter-lint | P1 |
| What does `deadnix`'s `--no-lambda-pattern-names` flag exist to prevent, and why would naively running deadnix with defaults break a nixpkgs `callPackage`-style file? | Confirmed via toolchain `--help`; a real "the linter's default breaks the idiom it's supposed to lint" trap | deadnix `--help` (toolchain run, confirmed 2026-09-27) | no | formatter-lint, packaging | P2 |
| Should a `flake.nix` set `nixConfig.extra-substituters` for a convenience cache, given it's ignored for untrusted callers and prompts (or silently applies, if `accept-flake-config` is set) for everyone else? | Directly informs whether the ocx-generated flake or fleet flakes should ever ship `nixConfig` | [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) | no | security, consumer-ux | P0 |
| When home-manager issues ask for `home.file.<name>.mode`-style copy-instead-of-symlink or `outOfStoreSymlink`, what does that reveal about assumptions a generated/templated flake's file-management should NOT make (e.g. never assume `home.file` targets are safely overwritable)? | Top home-manager issues are feature gaps in the file-linking model, not bugs — informs any module authored downstream | [home-manager#3090](https://github.com/nix-community/home-manager/issues/3090), [#3514](https://github.com/nix-community/home-manager/issues/3514) | covered-elsewhere (home-manager module authoring is its own depth topic, not failure-corpus core) | module-system | P3 |
| Is there a documented case of a nixpkgs `unfree`/`insecure` package gate (`config.allowUnfree`, `permittedInsecurePackages`) silently blocking a flake evaluation in pure/`--no-write-lock-file` mode, and what's the minimal reproducible fixture? | Named directly in the brief's exhaustive list; needs a planted-fixture confirmation, not yet done in this wave | (not yet directly sourced this wave — flag for a dive wave) | no | flake-schema, systems | P2 |
| Does `nix flake show`/`nix flake check` distinguish a non-derivation `packages.<system>.foo` from a real derivation before a consumer's `nix build` fails, or does it surface only at build time (testing H3's "expose non-derivations under packages" claim)? | Directly names H3; needs a planted fixture to confirm the failure mode and its exact error text | (flagged for a grounding/dive wave — this scout read issues, did not plant the fixture) | no | checks-ci, flake-schema | P1 |
| What generic verification catches a generated flake (e.g. from an OCI package index) pinning a content digest that upstream then deletes or rewrites — is this the same failure class as GitHub's short-hash 404/rewrite risk, and does `ghcr.io`'s token-gated blob fetch add its own trust-boundary question distinct from `fetchFromGitHub`? | Directly ties the failure corpus's fetcher-integrity findings to the ocx generated-flake use case named in the brief | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) (short-hash DoS precedent), extrapolated | no | generated-flakes, ocx, fetchers | P1 |
| Given `follows`' still-open correctness bugs (segfault on self-follow, transitive-follows-not-absolute, follows-removal-ignoring-dependency-lock), what's the minimal `nix flake metadata`/`nix flake lock` command a rule can tell an agent to run before trusting a lock file's `follows` graph? | Turns four separate open bugs into one checkable habit | [NixOS/nix#6036](https://github.com/NixOS/nix/issues/6036), [#5393](https://github.com/NixOS/nix/issues/5393), [#14339](https://github.com/NixOS/nix/issues/14339) | no | inputs-lock | P1 |
| Does the fixed nixfmt (`pkgs.nixfmt`, RFC 166) reformat existing "already nixfmt-rfc-style-formatted" files identically, or is there a breaking diff between the transitional and stable formatter on real code? | Directly checkable with the toolchain (`nixfmt --version`/diff against a fixture); flagged as untested this wave | (not yet run this wave — flag for grounding/dive wave with the toolchain) | no | formatter-lint | P2 |
| What CI pattern (checkout depth, ref, `actions/checkout` options) avoids the "flake always thinks worktree is dirty in GitHub Actions PR builds" failure, and does it generalize to other CI providers with shallow clones? | Concrete, actionable, CI-specific | [NixOS/nix#5302](https://github.com/NixOS/nix/issues/5302) | no | checks-ci | P1 |
| Is `passthru.updateScript = nix-update-script { }` sufficient for a package with non-standard version-detection needs, or does the ocx-generated-flake use case need the attribute-set form (`command`/`attrPath`) instead, and why? | Directly informs the ocx nix-generated-flakes artifact's update mechanism | [nixpkgs pkgs/README.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | no | generated-flakes, release-versioning, ocx | P1 |

## Recent shifts seen in this corpus

- **Lazy trees** (Nix 2.35 era / Determinate Nix 3.5, not yet upstream
  CppNix): fundamentally changes what "copying a flake input to the store"
  means and costs; invalidates any advice premised on "flakes always fully
  copy their inputs to the store" as a blanket truth. Lix has stated it will
  **not** adopt the same implementation. Anyone writing "how flakes handle
  sources" guidance in 2026 must say *which implementation* it's true for.
- **nixfmt reached stable, RFC 166 status** (nixpkgs 25.11/26.11): `pkgs.nixfmt`
  is now what `pkgs.nixfmt-rfc-style` used to name; the old pre-RFC-166 tool
  is `pkgs.nixfmt-classic`. Guidance written before this window that says
  "use `nixfmt-rfc-style`" is now pointing at the deprecated transitional
  name, not the current stable one. `nixpkgs-fmt` (archived 2024-07-24) is
  now purely historical.
- **A 2024 CVE fix was itself broken until April 2026**: CVE-2026-39860
  shows that "patched two years ago" is not evidence a sandbox-escape class
  of bug is actually closed — the fix relocated the vulnerable temp file but
  left it reachable by symlink-following in the same trust boundary. Any
  "Nix sandbox is safe because of CVE-2024-27297's fix" claim was falsified
  for roughly two years without anyone noticing until the follow-up
  advisory.
- **Module-system infinite-recursion diagnostics are being actively added**
  (nixpkgs#370967, 2025-2026 era): confirms that "infinite recursion
  encountered" was widely felt as under-diagnosed enough that nixpkgs
  itself is investing in better error contexts, rather than the community
  fully solving it via convention (`finalAttrs:` over `rec`) alone.
- **`finalAttrs:` is now the documented, canonical nixpkgs idiom** for
  self-referential derivations (README.md's own worked example), not merely
  a community convention — this sharpens H1's "agents emit `rec`" finding:
  the fix nixpkgs recommends is specifically `finalAttrs:`, not just
  "avoid `rec`," and an agent that avoids `rec` but doesn't know
  `finalAttrs.finalPackage` will still reach for awkward workarounds.
- **`--check-owner`/`--check-supported`/`--check-outdated` is a 2024-era
  DeterminateSystems answer to lock-file staleness** (flake-checker 0.2.15,
  matching the frame's measured version) — but its own GitHub Action
  variant deliberately never fails CI by exit code, only posts a summary,
  which is easy to mistake for a hard gate when adopting it.

## Contested

- **Are flakes the right load-bearing composition mechanism, or should they
  stay a thin entry point over plain-Nix composition?** jade.fyi argues
  forcefully for the latter (version control + dependency management +
  lock-filing shouldn't be one mechanism; `packages.${system}` can't express
  cross-compilation). The Lix project's own stance is closer to "flakes
  stay, but the schema gets stricter, not replaced" — a middle position.
  Trend: no consensus visible in this corpus; both stances are held by
  people actively shipping Nix tooling in 2026, and the direction (more
  strictness vs. thin-entry-point-only) is unresolved.
- **Is `nix flake check` a meaningful publish-gate, or mostly theater?**
  #4265 (IFD breaking multi-platform check, open since 2020) and the
  goldstein.lol study (implementation-dependent eval breakage that `check`
  wouldn't surface) both point toward "insufficient by itself." No source
  in this corpus argues `nix flake check` alone is sufficient; the
  disagreement is only about how much more (matrix builds across
  implementations? per-system CI runners?) is actually necessary versus
  diminishing-returns effort.
- **Should `nixConfig` ever ship in a published flake at all?** The
  manual documents it as a supported mechanism; #9649's root-equivalent-
  execution finding and the trust-model discussion in #8248/#6672 argue it
  is close to unsafe-by-default for any flake whose users might have
  `accept-flake-config = true` set anywhere. This corpus did not find a
  source arguing affirmatively "yes, always ship `nixConfig`" — the
  disagreement observed is between "never" and "only for substituters, with
  loud warnings," not a genuine three-sided debate.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix.dev/anti-patterns/language](https://nix.dev/anti-patterns/language) | nix.dev official docs (Sphinx site), "Best practices" / anti-patterns page | current, fetched 2026-09-27 | Primary, canonical, short list of language-level antipatterns with the exact recommended fix for each |
| [NixOS/nix issues, `label:flakes` sorted by reactions](https://github.com/NixOS/nix/issues?q=repo%3ANixOS%2Fnix+label%3Aflakes+sort%3Areactions-desc) | GitHub issue tracker search (top 30 read) | ongoing, some issues open since 2019-2020, fetched 2026-09-27 | Primary; the community's own ranked list of what hurts most about flakes today |
| [NixOS/nix security advisories](https://github.com/NixOS/nix/security/advisories) | GitHub Security Advisories (11 total) | 2023-2026, fetched 2026-09-27 | Primary; only authoritative CVE/severity source for the sandbox/FOD trust boundary |
| [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) | Single issue, `accept-flake-config` root-execution report | opened 2023, still open 2026-09-27 | Primary; concrete demo repo linked, maintainer-confirmed "intended behavior" |
| [NixOS/nix#7107](https://github.com/NixOS/nix/issues/7107) | Single issue, untracked-files-invisible | opened ~2022, still open 2026-09-27 | Primary; author's own framing of the tradeoff (safety vs. discoverability) |
| [NixOS/nix#6530 "Lazy trees"](https://github.com/NixOS/nix/issues/6530) | Single issue, 372 reactions, design doc pasted in the issue body | 2022-2026, still open, fetched in full | Primary; the largest live implementation-divergence point in the whole corpus |
| [NixOS/nix#4265](https://github.com/NixOS/nix/issues/4265) | Single issue, `nix flake check` + IFD | opened 2020, still open 2026-09-27 | Primary; concrete repro flake and exact error text |
| [nixpkgs `pkgs/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/README.md) | nixpkgs's own contributor/reviewer guide, raw markdown (1325 lines) | current as of nixpkgs master, fetched 2026-09-27 | Primary; the codified, canonical form of "what reviewers object to" — more reliable than sampling PR threads |
| [nixpkgs `CONTRIBUTING.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/CONTRIBUTING.md) | nixpkgs contributor guide, raw markdown (967 lines) | current, fetched 2026-09-27 | Primary; commit-convention and backport (`cherry-pick -x`/`-xe`) review gates |
| [nixpkgs `pkgs/by-name/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/README.md) | by-name packaging convention doc, raw markdown | current, fetched 2026-09-27 | Primary; shows `finalAttrs:` as the current canonical self-reference idiom |
| [nixpkgs PR #300028](https://github.com/NixOS/nixpkgs/pull/300028) | The xz-backdoor revert PR (CVE-2024-3094 response) | merged 2024-03-29, fetched 2026-09-27 | Primary; the one recorded real supply-chain incident and nixpkgs's actual response shape |
| [nixfmt README](https://raw.githubusercontent.com/NixOS/nixfmt/master/README.md) | Tool's own repository README, raw markdown | current, fetched 2026-09-27 | Primary; disambiguates `nixfmt`/`nixfmt-rfc-style`/`nixfmt-classic` naming as of this era |
| [Discourse: Enforcing Nix formatting in Nixpkgs](https://discourse.nixos.org/t/enforcing-nix-formatting-in-nixpkgs/49506) | Official announcement thread from the Nix Formatting team | 2024, cited via search | Primary-adjacent; documents when/how RFC 166 enforcement actually landed |
| [flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | Tool's own repository README, raw markdown (v0.2.15, matches frame's measured version) | current, fetched 2026-09-27 | Primary; exact flags/env-vars/behavior including the "always exits 0 in CI" caveat |
| [Discourse: 1000 instances of nixpkgs](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347) | Community discussion thread | ongoing reference point, still cited in 2026 guides, fetched 2026-09-27 | Primary community source; the canonical name for the duplicate-nixpkgs-instance pathology |
| [Discourse: NixOS and Flakes for beginners sucks!](https://discourse.nixos.org/t/nixos-and-flakes-for-beginners-sucks/62968) | Community discussion thread, real beginner failure narrative | fetched 2026-09-27 | Primary; concrete CLI-parsing confusion (`--extra-experimental-features` syntax) as lived by a real new user |
| [jade.fyi: Flakes aren't real and cannot hurt you](https://jade.fyi/blog/flakes-arent-real/) | Named author's technical blog post, contrarian design critique | author active in Lix-adjacent work, fetched 2026-09-27 | Primary; the sharpest documented critique of flakes-as-composition-mechanism, worth weighing rather than dismissing |
| [goldstein.lol: The Great Nix Flake Check](https://goldstein.lol/posts/great-nix-flake-check/) | Technical blog post, empirical cross-implementation study | fetched 2026-09-27 | Primary; actual measured evaluation-compatibility data across CppNix/Lix/alternative resolvers |
| [Lix: About](https://lix.systems/about/) and [flake stabilisation proposal](https://wiki.lix.systems/books/development/page/flake-stabilisation-proposal) | Project's own docs/wiki | current, fetched via search 2026-09-27 | Primary; the implementation's own stated position on flake schema stability |
| [FlakeHub: best practices](https://docs.determinate.systems/flakehub/best-practices/) and [semver](https://docs.determinate.systems/flakehub/concepts/semver/) | Vendor docs, Determinate Systems | current, fetched via search 2026-09-27 | Primary; only documented SemVer-resolving flake distribution channel found in this corpus |
| home-manager and nix-darwin issue trackers, sorted by reactions | GitHub issue tracker search (top 15 each read) | ongoing, fetched 2026-09-27 | Primary; shows these projects' top pain is feature-gap, not defect-density |
| statix `list` / deadnix `--help` / `nix flake --help` / `nix config show` | Direct toolchain command output via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, Nix 2.35.2 | run 2026-09-27 | Primary, first-hand confirmation of exact lint IDs, flags, and the "experimental" warning banner still present in 2.35.2 |
| nixpkgs infinite-recursion / cargoHash / darwin-SDK issue searches | GitHub issue tracker search (multiple targeted queries) | fetched 2026-09-27 | Primary; ranked evidence for what "infinite recursion" and "hash drift" actually mean in practice, vs. folk generalization |

**Not independently verified this wave (flagged for a grounding/dive
wave with the toolchain, per the candidate table above):** the exact error
text nixpkgs's `unfree`/`insecure` gates produce under `--no-write-lock-file`
pure evaluation, and whether `nix flake check`/`nix flake show` actually
distinguish a non-derivation `packages.<system>.foo` before build time (H3).
Both are stated as candidates, not answered, because this scout's brief was
issue/blog/advisory survey, not fixture planting.
