---
title: "Nix topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, waves 3-4 staged"
phase: 3
model: opus
date: 2026-09-27
wave: "1 consolidated → 2 commissioned, 3-4 staged"
sources_surveyed: 9
candidates_deduplicated: 172
---

# Nix topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject area — a question a later rule
   answers with a named verification. "Flake inputs" is a wave; "when must an
   input follow the consumer's nixpkgs, given that following a
   binary-cache-backed input throws away its cache hits" is a row.

2. **Coverage is measured against the sibling lore sets, never against a fleet
   codebase — there is no fleet Nix code and no Nix configuration in the
   catalog.** The frame measured zero `*.nix` and `flake.lock` files under
   `/home/mherwig/dev` ([frame](nix-frame.md)). Map-time measurement M2 found
   exactly two catalog lines that mention Nix, both an incidental analogy in
   `rules/rust-quality/durable-state.md:113,120`. So `uncovered` is the default
   and needs no key; `partial` names the sibling that owns the **shape** but
   none of the Nix mechanism (`rust-cargo` for Cargo and cargo-dist releases,
   `python-packaging` for pyproject, `go-modules` for the Go toolchain,
   `docs-quality` for README and CHANGELOG, `bazel-quality` for hermeticity);
   `covered` means a sibling already owns the content under its own glob.

3. **Priority is against this program's consumers**, in order:
   **(a)** the fleet's future flakes — the Rust CLIs `ocx` (17 `-sys` crates)
   and `grimoire`/`grim` (10), the zero-dependency Python SDK, and the
   `setup-ocx` GitHub Action — which must be publishable at a high bar
   ([ocx](nix-audit/ocx-index-and-fleet.md) §4);
   **(b)** a flake generated from the ocx index (125 packages, 1,720 stored
   image indexes, layers on ghcr.io behind a token and an expiring redirect,
   [ocx](nix-audit/ocx-index-and-fleet.md) §1-§3);
   **(c)** the general Nix adopter who installs these artifacts.
   A topic that is P0 in Nix-in-general and irrelevant to all three is P2 here
   (NixOS module option design); the reverse also happens (the OCI layer
   digest doubling as a fixed-output hash, M-E-04, is invisible to most Nix
   writing and decisive for (b)).

4. **SURFACE legend** — `lang` · `module-system` · `packaging` · `fetchers` ·
   `flake-schema` · `inputs-lock` · `systems` · `devshell` · `formatter-lint` ·
   `checks-ci` · `cache` · `release-versioning` · `publishing` · `consumer-ux` ·
   `security` · `impls` (CppNix / Lix / Determinate Nix divergence) ·
   `generated-flakes` · `prebuilt-binaries` · `ocx`.

5. **Flake-shape legend** (named from the two exemplar audits; a repo may carry
   two letters):
   **A** = app flake packaging its own source (the fleet CLIs; helix, jj,
   ghostty, zed, yazi, direnv, nixpkgs-review, nix-installer, flake-checker,
   devenv, cachix, NixOS/nix, nixd, treefmt, nil, nix-index) ·
   **B** = library or framework flake (flake-parts, flake-utils, treefmt-nix,
   blueprint, git-hooks.nix, crane, nix-systems) ·
   **C** = module flake (home-manager, nix-darwin, disko, sops-nix) ·
   **D** = generated or index-driven flake (zig-overlay, rust-overlay, fenix,
   nix-index-database, nix-vscode-extensions, llm-agents.nix,
   nixpkgs-terraform, nixpkgs-python — and the ocx-index flake) ·
   **E** = template (NixOS/templates, the-nix-way/dev-templates) ·
   **F** = nixpkgs itself (its conventions; the upstreaming target) ·
   `all` = binds every shape.

6. **Source keys**, all links, 9 of 9 wave-1 workers returned (none dropped):
   [frame](nix-frame.md) ·
   [ocx](nix-audit/ocx-index-and-fleet.md) ·
   [shape](nix-audit/exemplar-flake-shape.md) ·
   [runs](nix-audit/exemplar-tool-runs.md) ·
   [canon](nix-topic-map/canonical.md) ·
   [cod](nix-topic-map/codified.md) ·
   [prac](nix-topic-map/practitioner.md) ·
   [fail](nix-topic-map/failure.md) ·
   [shift](nix-topic-map/shifts.md) ·
   [gen](nix-topic-map/generated-flakes.md) ·
   **[map]** = a read-only measurement taken while writing this map, listed in
   point 9 with its command. Exemplar citations are
   `<owner>/<repo>@<sha12>:<path>:<line>` at the SHAs in
   `~/.cache/research-lang/exemplars/nix-fetch.log`.

7. **Every P0 names a check** in its priority cell: a command, a lint, a grep,
   a `nix eval` expression, or a named reading heuristic. Long commands are
   named `Q1`..`Q20` in point 10 so no table cell carries a pipe. A P0 that
   could not name one was demoted.

8. **Era.** Unless a row names another version or implementation, every fact
   is **CppNix 2.35.2 + nixpkgs 26.11pre (rev `8d5d2709`) + nixfmt 1.5.0,
   deadnix 1.3.2, flake-checker 0.2.15, measured 2026-09-27**. Rows that
   depend on another version say so (Lix 2.95.2, Determinate Nix 3.22.5,
   nixpkgs 25.05/25.11/26.05, Nix 2.19/2.26/2.27/2.30/2.32).

9. **Map-time measurements** (read-only; the index checkout is
   `/home/mherwig/dev/index`, the exemplar root `~/.cache/research-lang/exemplars/nix`):
   - **M1 — the toolchain is contended right now.**
     `timeout 60 ~/.cache/research-lang/nix-tools/run.sh nix --version` exited
     124 twice, while nix-portable's own bootstrap (`nix-portable nix --version`
     → `nix (Nix) 2.20.6`) answered at once. `ps` shows the wave-1
     tool-runs batch still running (`bash worker.sh nix-community/home-manager
     …`, with `nix flake show github:Mic92/sops-nix/…` and
     `nix flake metadata github:nix-community/home-manager/…` children) on the
     single-user store. The three probes this map started were stopped. This is
     a wave-2 precondition (see "Selected for wave 2").
   - **M2 — catalog coverage.**
     `rtk proxy grep -rn -w -e nix -e Nix -e nixpkgs -e flake.nix rules skills bundles`
     → 2 hits, `rules/rust-quality/durable-state.md:113` and `:120`. No Nix
     rule, skill or bundle exists.
   - **M3 — index basenames collide, and the fleet is already in the index.**
     `find p -mindepth 2 -maxdepth 2 -name '*.json' | sed 's#.*/##; s#\.json$##' | sort | uniq -d`
     → `cli`, which is `p/github/cli.json`, `p/gitlab/cli.json`,
     `p/grimoire/cli.json` and `p/ocx/cli.json`. ocx and grimoire ship as
     prebuilt binaries in their own index.
   - **M4 — libc shape of every package's `latest` linux/amd64 offer.** For
     each root, the `latest` digest's image index filtered to
     `os=="linux" and architecture=="amd64"`: 104/125 offer a bare
     (no `os.features`) manifest, 19 offer only `libc.glibc` (and some also
     `libc.musl`), 0 offer only musl, 2 offer no linux/amd64 at all
     (`docker/docker-credential-osxkeychain`, `docker/docker-credential-wincred`).
     The glibc-only set is amazon/corretto, anomalyco/opencode,
     astral-sh/python-build-standalone, bazelbuild/bazel, bazel-lsp/bazel-lsp,
     denoland/deno, docker/docker-credential-secretservice, duckdb/duckdb,
     gohugoio/hugo, kitware/cmake, neovim/neovim, ninja-build/ninja,
     nodejs/node, oven-sh/bun, pdm-project/pdm, pnpm/pnpm, powershell/powershell,
     pulumi/pulumi, tailwindlabs/tailwindcss — several share a name with a
     nixpkgs attribute (`cmake`, `ninja`, `node`).
   - **M5 — Nix-required and tool-required file names in the corpus.**
     `rtk proxy find . -name statix.toml -not -path '*/.git/*'` →
     `nix-community__disko/statix.toml`, `nix-community__home-manager/statix.toml`;
     `find . -maxdepth 2 -name .envrc | wc -l` → 19; `treefmt.toml` → the same
     two repos. disko carries `flake.nix`, `flake.lock`, `*.nix` and
     `statix.toml` together.

10. **Named checks** cited by the priority cells. They are candidates: every
    dive that owns one runs it verbatim, watches it red on a bad twin, and
    either keeps or replaces it.

    ```sh
    # Q1 duplicate nixpkgs nodes in a lock (output > 1 = finding)
    jq -r '[.nodes | to_entries[] | select((.value.locked.repo // "") == "nixpkgs" or (.value.original.id // "") == "nixpkgs") | .key] | length' flake.lock
    # Q2 flake-utils in new code (empty = pass)
    grep -rn -e 'eachDefaultSystem' -e 'eachSystem' -e 'flake-utils' --include='*.nix' .
    # Q3 per-output nixpkgs imports (every hit must be the one named pkgsFor binding)
    grep -rn -e 'import nixpkgs' -e 'import inputs.nixpkgs' --include='*.nix' .
    # Q4 the nixpkgs 26.11 system-rename warning (0 = pass)
    nix eval .#packages.x86_64-linux --apply builtins.attrNames 2>&1 | grep -c -e "has been renamed to/replaced by 'stdenv.hostPlatform.system'"
    # Q5 schema check without builds and without IFD (exit 0 = pass)
    nix flake check --no-build --option allow-import-from-derivation false .
    # Q6 nothing the build reads is untracked (empty = pass)
    git status --porcelain --untracked-files=all .
    # Q7 meta minimum (exit 0 = pass)
    nix eval --json .#packages.x86_64-linux.default.meta | jq -e '.description and .license and .mainProgram and .platforms'
    # Q8 legacy hash attributes (empty = pass)
    grep -rn -e 'sha256 = "' -e 'cargoSha256' -e 'vendorSha256' --include='*.nix' .
    # Q9 stale commands in docs and scripts (empty = pass)
    grep -rn -e '--update-input' -e 'nix profile install' -e 'nix-env -i' .
    # Q10 dead formatter names (empty = pass)
    grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' .
    # Q11 dead code, callPackage formals exempt (exit 0 = pass)
    deadnix --fail --no-lambda-pattern-names .
    # Q12 nixConfig allowlist (exit 0 = pass)
    nix eval --impure --json --expr '(import ./flake.nix).nixConfig or { }' | jq -e 'keys - ["extra-substituters","extra-trusted-public-keys"] | length == 0'
    # Q13 accept-flake-config anywhere (every hit must be a warning against it)
    grep -rn -e 'accept-flake-config' .
    # Q14 package version equals the manifest (compare the two outputs)
    nix eval --raw .#packages.x86_64-linux.default.version
    # Q15 unrelated edits do not change the derivation (run, touch README.md, git add, run again: identical)
    nix eval --raw .#packages.x86_64-linux.default.drvPath
    # Q16 declared systems against the pinned branch (read together)
    grep -rn -e 'x86_64-darwin' --include='*.nix' .
    # Q17 the era, read first
    nix --version; jq -r '.nodes.nixpkgs.original.ref // .nodes.nixpkgs.original.url // "unpinned"' flake.lock
    # Q18 the FOD hash of an OCI layer, from its digest alone (actionlint's linux/amd64 layer)
    nix hash convert --hash-algo sha256 --to sri 26716a01d50c9492fa993d189f3aec1ea938bcd1985db4c8445bea67070c45cd
    # Q19 floating or Determinate-by-default installers in CI (empty = pass)
    grep -rn -e '@main' -e 'nix-installer-action' .github/workflows
    # Q20 an overlay adds exactly one namespace attribute
    nix eval --impure --json --expr 'builtins.attrNames ((builtins.getFlake (toString ./.)).overlays.default { } { })'
    ```

## Conflicts resolved

Twenty-two places where two wave-1 artifacts disagree, or where an artifact
disagrees with the frame or with H1-H9. Evidence is ranked **normative** (the
Nix or nixpkgs manual, release notes, an accepted RFC, a tool's own source or
`--help`) > **measured** (a count over the exemplar corpus or the index, or a
tool run with its command) > **codified** (a shipped linter default or rule
catalogue) > **argued** (a named practitioner with a reason) > **asserted**.

**1. Systems iteration: hand-rolled `lib.genAttrs` over an explicit list is the
default; flake-parts is accepted; flake-utils is never introduced.** H1 named
`eachDefaultSystem` as the dated idiom. Measured: `genAttrs`/`forAllSystems`
29/37, flake-parts 12/37, nix-systems 9/37, flake-utils 7/37, blueprint 5/37
([shape](nix-audit/exemplar-flake-shape.md) §3). Maintenance: flake-utils' last
commit is 2024-11-13 and issue #86 debates its deprecation
([shift](nix-topic-map/shifts.md) §12). Argued: ayats.org and nixcademy (the
default system set is hidden; 4,100+ locks carry duplicate flake-utils nodes)
([prac](nix-topic-map/practitioner.md) §6-7); nix-systems makes the list
consumer-overridable (§28). No canonical source takes a side
([canon](nix-topic-map/canonical.md) Contested). The one measured failure of a
hand-rolled helper — helix's `pkgsFor` recursing on `x86_64-freebsd` under
`--all-systems` ([runs](nix-audit/exemplar-tool-runs.md) Axis 3) — was a system
the flake never tested, which argues for an explicit list, not against
`genAttrs`. **Resolved:** A, D and E flakes iterate `nixpkgs.lib.genAttrs` over
a literal system list (or `import inputs.systems` where consumer override is a
feature), mapping each system to `nixpkgs.legacyPackages.<system>`; that adds no
input, so consumers pay no lock nodes. flake-parts is accepted when the flake
imports flake-parts modules (treefmt-nix, git-hooks.nix) or exports a
`flakeModule`, and a reviewer never flags it. flake-utils is never added to a
new flake; an existing use is a SHOULD migration. blueprint is recognized, not
recommended (its README badge says "experimental", [prac](nix-topic-map/practitioner.md) §27).
`flakes/systems-and-instantiation` pins the skeleton and measures consumer lock growth.

**2. One nixpkgs instance per system; the rule targets the idiom, not a
count.** [shape](nix-audit/exemplar-flake-shape.md) §4: per-output
`import nixpkgs { … }` is concentrated in test fixtures (crane's 10 files sit
under `examples/`), so "1000 instances" does not hold at exemplar scale.
[runs](nix-audit/exemplar-tool-runs.md) headline: the idiom at
`DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45` is behind 56/56
`'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'`
warnings on nixpkgs 26.11, and devenv's four nixpkgs-shaped inputs cost a
95.6 s cold eval that includes a real build (Axis 6). nix.dev's
`import <nixpkgs> { config = {}; overlays = []; }`
([canon](nix-topic-map/canonical.md) survey 5) is advice for non-flake code; a
flake evaluates purely and never reads `~/.config/nixpkgs` (survey 3). Both
audits are right about what they measured. **Resolved:** the default is
`nixpkgs.legacyPackages.<system>`. A configured instance (unfree, an overlay
the flake itself needs) is created at most once per system, in one named
binding, never inside an output attribute, with whichever argument spelling
(`system`, `localSystem` or `hostPlatform`) emits no warning on nixpkgs 26.11 —
the systems dive traces the warning to its exact expression (M-A-04).

**3. Who pins nixpkgs, and when a consumer follows: decided by shape and by
how the input is consumed.** H2 and four scouts treat
`inputs.x.inputs.nixpkgs.follows = "nixpkgs"` as hygiene. Against it:
nixpkgs-python tells consumers not to override its nixpkgs because its cache is
tied to its pin ([gen](nix-topic-map/generated-flakes.md) §8); fzakaria finds
3,261 nixpkgs revisions among 10,754 flakes and calls following "time-travel",
with revision-age delta as the real safety signal
([prac](nix-topic-map/practitioner.md) §11); four follows bugs are open
(#5393, #6036, #8325, #14339, [fail](nix-topic-map/failure.md) §3); Lix
proposes removing follows ([cod](nix-topic-map/codified.md) §15). Measured
library practice: crane has zero inputs, flake-parts one (`nixpkgs-lib`),
flake-utils one ([shape](nix-audit/exemplar-flake-shape.md) §2). **Resolved:**
B flakes give their library code no nixpkgs input (functions take `pkgs`,
crane's pattern) and at most `nixpkgs-lib`; C flakes' modules use the
consumer's `pkgs` module argument and keep nixpkgs only for their own checks;
A and D flakes pin nixpkgs and say in the README whether following is
supported. A consumer follows nixpkgs for inputs it consumes as libraries,
modules or overlays, and does not follow inputs whose packages it wants from
the author's cache; either way it runs Q1 after every lock change.
flake-checker crashing on flakes without a root `nixpkgs` input (4/36,
[runs](nix-audit/exemplar-tool-runs.md) Axis 4) is a tool limitation, never a
reason to add one.

**4. `packages` is the export of record; an overlay is an extra export built
from the same file.** [shape](nix-audit/exemplar-flake-shape.md) §5: packages
29/37, overlays 20/37. fenix's README: an overlay builds against the consumer's
nixpkgs, which may not be cached ([gen](nix-topic-map/generated-flakes.md) §3).
jade.fyi: keep packaging in `callPackage`d files and the flake thin
([prac](nix-topic-map/practitioner.md) §9). **Resolved:**
`packages.<system>.<name>` is what `nix run`, `nix build` and `nix profile add`
resolve and what the author's cache serves. A flake whose packages should join
a consumer's package set also exports
`overlays.default = final: prev: { name = final.callPackage ./package.nix { }; }`,
and `packages` calls the same `package.nix` through
`legacyPackages.<system>.callPackage` — one source of truth, never a second
`import nixpkgs` just to apply its own overlay. A generated flake's overlay
adds exactly one namespace attribute (M-E-08, Q20).

**5. Formatter of record: nixfmt, attribute `pkgs.nixfmt`; an alejandra
repository keeps alejandra.** Normative: RFC 166 merged, nixpkgs CI enforces
nixfmt through treefmt ([cod](nix-topic-map/codified.md) §6, §12). The scouts
date the rename differently: [cod](nix-topic-map/codified.md) to nixfmt 1.3.0
(2026-05-26, the tool's docs), [shift](nix-topic-map/shifts.md) §5 and
[fail](nix-topic-map/failure.md) §14 to nixpkgs 25.11 (the attribute). Both
are true: the nixpkgs attribute moved in 25.11 and the tool's documentation
followed in 1.3.0; rules cite the attribute. Measured: of 9 declared
formatters, alejandra 3, nixfmt 2, nixfmt-tree 2, nixfmt-rfc-style 1,
nixpkgs-fmt 1; 27/36 declare none ([runs](nix-audit/exemplar-tool-runs.md)
Axis 5). alejandra is maintained (last commit 2026-09-11,
[shift](nix-topic-map/shifts.md) §11); nixpkgs-fmt is archived (2024-07-24).
**Resolved:** new flakes format with nixfmt through the `formatter` output;
`nixfmt-rfc-style`, `nixfmt-classic` and `nixpkgs-fmt` are findings in new code
(Q10). One formatter, declared and checked, is the rule; a repository already on
alejandra keeps it, and switching is its own change. Which formatter *output*
(`pkgs.nixfmt-tree`, `pkgs.nixfmt`, a treefmt-nix wrapper) makes a bare
`nix fmt` format the tree on Nix 2.35 is `gates/format-and-lint`'s decision.

**6. nixfmt gates; deadnix gates with `--no-lambda-pattern-names`; statix
advises.** Measured noise ([runs](nix-audit/exemplar-tool-runs.md) Axis 5):
statix 2,230 findings (1,111 without nil) led by W08 useless parentheses 749,
W20 repeated keys 442, W04 254; deadnix 1,914, of which 908 are unused
lambda-pattern names — the `callPackage` formal-argument class that
`--no-lambda-pattern-names` exists for ([cod](nix-topic-map/codified.md) §2) —
and 670 parse errors on nil's deliberately malformed `test_data/`; nixfmt
rejects 1,358/7,012 files, mostly in alejandra repositories by design. Both
tools are maintained ([shift](nix-topic-map/shifts.md) §11), contra a staleness
assumption. **Resolved:** the formatter check is a MUST gate. deadnix runs as
Q11 over tracked files, excluding generated data and parser fixtures; SHOULD
until `gates/format-and-lint` measures at most one real false positive per
1,000 lines on five or more exemplars, then MUST. statix is advisory: a statix
code backs a rule only if the dive classifies it as a defect detector
(candidates: W12 unquoted URI, W17/W19 deprecated builtins, W05 legacy `let`);
style codes (W08, W03/W04, W20) are off or CONSIDER.

**7. `nixConfig`: discouraged, with a hard allowlist; `accept-flake-config`
never.** H8 called it a trap. Live: `warning: ignoring untrusted flake
configuration setting 'extra-substituters'` fires on every invocation for all
6 measured declarers ([runs](nix-audit/exemplar-tool-runs.md) headline).
Normative: only `bash-prompt`, `bash-prompt-prefix`, `bash-prompt-suffix`,
`flake-registry` and `commit-lock-file-summary` apply without
`accept-flake-config` ([canon](nix-topic-map/canonical.md) survey 3). NixOS/nix#9649:
accepting flake configuration grants root-equivalent command execution through
settings such as `post-build-hook`, confirmed as intended
([fail](nix-topic-map/failure.md) Summary). Practice: 11/37 declare it, every
one a cache pair for the project's own cache
([shape](nix-audit/exemplar-flake-shape.md) §6); 3/8 generators ship it
without apology ([gen](nix-topic-map/generated-flakes.md) Contested).
**Resolved:** a published flake SHOULD NOT carry `nixConfig`. If it does, it
MUST contain only `extra-substituters` and `extra-trusted-public-keys` for the
project's own cache (Q12), and the README repeats the pair in `nix.conf` form.
No flake, README, script or agent sets or passes `accept-flake-config` (MUST, Q13).

**8. A flake-built package's `version` comes from the project's own
manifest.** Measured: `fromTOML` in 10 repos, the `self.shortRev` family in 10,
hardcoded version literals 259 in 16 ([shape](nix-audit/exemplar-flake-shape.md)
§4). nixpkgs: versions start with a digit, snapshots are
`<last>-unstable-YYYY-MM-DD` (§12, `pkgs/README.md:467-475`). H4 expected
`self.shortRev or "dirty"`. [shift](nix-topic-map/shifts.md) asks whether 2.35's
lazy copies change when `self` metadata is available. **Resolved:** an A
flake reads `version` from `Cargo.toml` (`[workspace.package]` or `[package]`,
via `lib.importTOML`) or `pyproject.toml` `[project]`, never a duplicated
literal, so at a release tag the Nix version equals the tag (Q14). The VCS
revision is metadata, not version: a build that wants it receives
`self.shortRev or self.dirtyShortRev or "unknown"` through an env var or flag,
accepting a rebuild per commit. D flakes use the upstream version. Generated
per-package files that must stay `nix-update`-editable carry inline literals
(llm-agents.nix) — not a finding. `release/versioning-and-tags` verifies each
`self` attribute under 2.35.

**9. Release tags, not FlakeHub, and not only the lock.** H4 said FlakeHub is
the only semver channel: contradicted on consumption — three exemplars take
`https://flakehub.com/f/NixOS/nixpkgs/0.1` as an input
([shape](nix-audit/exemplar-flake-shape.md) §2). Tag practice has no
convention: 10/37 never tagged; `vX.Y.Z`, bare semver, dates and bot
timestamps coexist (§10). FlakeHub resolves highest-semver-wins, so every
rolling `0.1.N` published after a real tag ≥0.2.0 is invisible to unpinned
consumers (imTHAI/nix-packages, July 2026,
[gen](nix-topic-map/generated-flakes.md) §12). The fleet already tags
`vX.Y.Z` through cargo-dist ([ocx](nix-audit/ocx-index-and-fleet.md) §4).
**Resolved:** a fleet flake is versioned by the project's existing `vX.Y.Z`
tags; consumers pin `github:<owner>/<repo>/vX.Y.Z` or rely on their lock; the
flake invents no version of its own. FlakeHub is owner Q1 (default: no); if
adopted, tagged releases only. Fleet flakes never take FlakeHub URLs as inputs.
A generated flake has no release cadence: its lock revision is its version.

**10. Non-flake users: flake-compat, never from the historical org.**
`default.nix` 27/37, flake-compat 12/37 from three sources — edolstra 10,
NixOS 2-3, nix-community 2 ([shape](nix-audit/exemplar-flake-shape.md) §8).
nix.dev names flake-compat as the bridge ([canon](nix-topic-map/canonical.md)
survey 10); nixpkgs-python shows the canonical `default.nix`
([gen](nix-topic-map/generated-flakes.md) §8). **Resolved:** A and D flakes
SHOULD ship `default.nix` via flake-compat; new code never cites
`edolstra/flake-compat`; `release/publishing-and-consumer-ux` picks between the
NixOS and nix-community sources on maintenance and lock-reading behaviour. A
`callPackage`-able `package.nix` is the cheaper half and is required anyway
(M-D-01).

**11. Implementation matrix: CppNix is the gate of record, Lix an advisory
evaluation leg, Determinate Nix not a required leg.** Divergence is confirmed
by every scout ([canon](nix-topic-map/canonical.md) survey 17,
[cod](nix-topic-map/codified.md) §15, [prac](nix-topic-map/practitioner.md)
§19/§24, [shift](nix-topic-map/shifts.md) §7-8). H9's test plan is stale:
`nixVersions.nix_2_24` throws "has been removed. use nix_2_31" in nixpkgs 26.11,
and the cross-implementation reruns landed inconclusive under store contention
([runs](nix-audit/exemplar-tool-runs.md) Axis 7).
`DeterminateSystems/nix-installer-action` installs Determinate Nix by default
([shift](nix-topic-map/shifts.md) §10). Lock resolution succeeds ~70% under
CppNix, ~68% under Lix on the same corpus (goldstein.lol,
[cod](nix-topic-map/codified.md) §15). **Resolved:** CI of record installs
upstream CppNix at a pinned version. A published A, B or D flake adds a
non-blocking Lix leg running `nix flake check --no-build` (it catches the
Lix 2.95 rejections, M-C-09) and a floor leg on the oldest non-stub
`nixVersions.nix_2_*` in the pinned channel — a relative floor, never a
hardcoded number. No flake relies on a Determinate-only feature (lazy trees,
`schemas`, parallel eval). `gates/check-ci-and-impls` reruns Axis 7
sequentially and decides whether the Lix leg becomes blocking.

**12. Installer and cache of record.** Measured: `cachix/install-nix-action`
in 24/37 (about half SHA-pinned), `determinate-nix-action` 4 (all `@main`),
`nix-installer-action` 3; caches `cachix-action` 13, `flakehub-cache-action` 3,
`magic-nix-cache` 1 ([shape](nix-audit/exemplar-flake-shape.md) §9).
magic-nix-cache's free tier ended 2025-02-01 and a community revival ships v15
(2026-09-09) ([shift](nix-topic-map/shifts.md) §9; [prac](nix-topic-map/practitioner.md)
§20 reads it as a durability lesson). **Resolved:** the installer of record is
`cachix/install-nix-action` pinned by full commit SHA with an explicit Nix
version; a Determinate installer only where Determinate Nix is the stated
intent, never at `@main` (Q19). No cache is required for correctness; a fleet
flake's CI uses a GitHub-Actions-backed store cache (`cache-nix-action` or
`magic-nix-cache-action` ≥v11 — the check-ci dive picks after testing both
against the post-2025 cache API) and no public substituter until owner Q2 says
otherwise.

**13. Distribution: in-repo flake first, nixpkgs second, the generated flake's
prebuilt binaries third.** `pkgs/by-name` gives maintainers self-service merge
rights ([cod](nix-topic-map/codified.md) §12); r-ryantm's update automation
exists only inside nixpkgs ([gen](nix-topic-map/generated-flakes.md) §12); no
practitioner argues the choice ([prac](nix-topic-map/practitioner.md) row,
P3). ocx and grimoire are already prebuilt packages in the ocx index ([map]
M3). **Resolved:** each fleet CLI ships its flake in its own repository,
release-coupled (`nix run github:ocx-sh/ocx`), with a `package.nix` written
by-name-ready so a nixpkgs submission is a copy; submitting is owner Q3
(default: after the CLI's first stable release, outside this program). A
`-bin` package from the generated flake is an extra channel, never a
substitute for the source build (M-G-16).

**14. IFD is forbidden wherever others evaluate the flake; `pure-eval` does
not forbid it.** [canon](nix-topic-map/canonical.md) Summary asserts that
`pure-eval` forbids IFD unconditionally. Measured otherwise: devenv's flake,
evaluated purely, builds `devenv-nixpkgs-patched.drv` during `nix eval`
(95.6 s, [runs](nix-audit/exemplar-tool-runs.md) Axis 6), and the cabal2nix
flakes fail `--no-build` only because building is off (Axis 3).
`allow-import-from-derivation` defaults to true in 2.35 (measured,
[canon](nix-topic-map/canonical.md) survey 3). nixpkgs bans IFD and commits
generated files instead ([cod](nix-topic-map/codified.md) §11,
[shape](nix-audit/exemplar-flake-shape.md) §12); reading a committed JSON with
`builtins.fromJSON (builtins.readFile ./data.json)` is not IFD
([cod](nix-topic-map/codified.md) Summary); IFD is tolerable in a leaf app and
compounding in shared infrastructure ([prac](nix-topic-map/practitioner.md)
§8); NixOS/nix#4265 ([fail](nix-topic-map/failure.md) §2). **Resolved:** B, C
and D flakes and anything aimed at nixpkgs MUST pass Q5. An A flake may use IFD
only where its builder requires it, says so in a comment, and builds that path
in CI.

**15. Era rows the recent-shifts scout overturned, and two scouts it
contradicted.**
- **Lazy copying is three mechanisms.** CppNix 2.35 hashes a source without
  copying it when its `outPath` never becomes a derivation input
  ([shift](nix-topic-map/shifts.md) §1, [cod](nix-topic-map/codified.md) §15);
  Determinate Nix's lazy trees (a virtual filesystem, 3.5.2/3.6.7) are
  Determinate-only ([prac](nix-topic-map/practitioner.md) §19); Lix plans its
  own ([fail](nix-topic-map/failure.md) §4). "Not yet upstream" in
  [fail](nix-topic-map/failure.md) and "PR open" in [prac](nix-topic-map/practitioner.md)
  describe lazy trees; "landed in 2.35" in [shift](nix-topic-map/shifts.md)
  describes lazy copies. Rows name the mechanism and the implementation.
- **`inputs.self.submodules`/`inputs.self.lfs` exist since Nix 2.27**
  (release notes, [shift](nix-topic-map/shifts.md) §1,
  [canon](nix-topic-map/canonical.md) survey 2).
  [fail](nix-topic-map/failure.md) §3's "no first-class equivalent for self"
  is stale.
- **Commands:** `nix flake update <input>` replaced `nix flake lock
  --update-input` in 2.19; `nix profile add` replaced `install` in 2.30 (Q9).
- **Builders:** `cargoSha256` hard-errors and `fetchCargoVendor` is the default
  since nixpkgs 25.05, so every `cargoHash` changed; direct `CGO_ENABLED`
  hard-errors since 25.11 ([shift](nix-topic-map/shifts.md) §5).
- **x86_64-darwin:** [shift](nix-topic-map/shifts.md) read 25.11's "expected
  to be dropped by 26.11"; [shape](nix-audit/exemplar-flake-shape.md) and
  [runs](nix-audit/exemplar-tool-runs.md) measured the drop live
  (`lib/trivial.nix:1003` throws; `rl-2611.section.md:43-49`). Measured wins.
- **`nix flake check` skips substitutable derivations since 2.32**
  ([shift](nix-topic-map/shifts.md) §1): a green check may mean "the cache had
  it".
- **magic-nix-cache** "died" ([prac](nix-topic-map/practitioner.md) §20) and
  "revived, v15" ([shift](nix-topic-map/shifts.md) §9) are both true, in that
  order; the current state is revived and community-maintained.
- **flake-checker's supported branches:** its README lists 25.11 branches
  ([canon](nix-topic-map/canonical.md) survey 18); the 0.2.15 binary's own
  message lists only the 26.05 and unstable branches
  ([runs](nix-audit/exemplar-tool-runs.md) Axis 4). The binary wins.

**16. ocx fetch: a fixed-output derivation hashed by the layer digest,
transport decided by a live build.** H6 said a bearer token blocks `fetchurl`.
Measured: a bare blob GET is 401; an anonymous token comes from one
unauthenticated GET; the blob answers 307 to a SAS URL on
`pkg-containers.githubusercontent.com` that expires in about ten minutes;
`nix-prefetch-url` gets 401; the downloaded layer's sha256 equals the
manifest's digest ([ocx](nix-audit/ocx-index-and-fleet.md) §3).
`dockerTools.pullImage` delegates registry auth to skopeo inside an FOD
([gen](nix-topic-map/generated-flakes.md) §9). **Nobody tested the cheapest
path:** zig-overlay fetches Homebrew bottles — which are ghcr.io blobs — with
plain nixpkgs `fetchurl` and `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]`
([gen](nix-topic-map/generated-flakes.md) §1). **Resolved (direction; the
mechanism is the prototype's):** the FOD's `outputHash` is the OCI layer
digest in SRI form (Q18) — no prefetch, content-addressed end to end; the SAS
URL is never recorded; builtin fetchers and header-less `fetchurl` are ruled
out. Transport is tried in order — `fetchurl` with the anonymous header, a
curl token-exchange FOD, skopeo — and the first that builds in the sandbox
wins. If none does, the ocx ADR asks for a stable public blob URL.

**17. Generation architecture: committed data, generated in CI by ocx code; no
eval-time index reader until the index carries layer digests.** The options:
(a) a flake repository with committed data, a small reader and a scheduled
updater — the shape of all eight exemplars ([gen](nix-topic-map/generated-flakes.md)
Summary, [shape](nix-audit/exemplar-flake-shape.md) §11); (b) an `ocx`
subcommand that emits Nix; (c) a Nix library that reads the index JSON at eval
time, e.g. the index repository as a `flake = false` input. (c) fails as
specified: the index holds image-index → manifest digests, but the layer digest
an FOD needs lives in each per-platform manifest, one registry fetch away
([ocx](nix-audit/ocx-index-and-fleet.md) §5), and reading a fetched manifest at
eval time is IFD, which conflict 14 forbids for D. The platform relation exists
once, at `ocx_oci/src/platform.rs:416`; a second implementation is the
duplicate-knowledge smell already present in setup-ocx
([ocx](nix-audit/ocx-index-and-fleet.md) smell 4). **Resolved:** (a) is the
shape, and its generator is ocx code — a subcommand that resolves manifests
with ocx's registry client and platform scoring and writes the data file — run
by CI in the flake repository. (b) is a later per-project UX layer. (c)
becomes viable only if the index publishes a resolved projection with layer
digests (M-E-29, an ADR request); `generated-flakes/index-data-model` tests it
anyway.

**18. Attribute shape: namespaced latest in `packages`, versions in
`legacyPackages`.** 125 packages, median 13 tags, 56.7% aliases
([ocx](nix-audit/ocx-index-and-fleet.md) §1.3-1.4); the basename `cli` exists in
four namespaces ([map] M3), so `packages.<system>.<pkg>` collides; `nix flake
check` requires every `packages.<system>.<name>` to be a derivation
([cod](nix-topic-map/codified.md) §7), so version trees cannot nest there;
terraform and python generators expose `"X.Y.Z"` plus `"X.Y"` aliases and
inflict `#"1.2.3"` quoting ([gen](nix-topic-map/generated-flakes.md) rows).
**Resolved (default for the data-model dive to confirm or overturn):**
`packages.<system>.<ns>-<pkg>` is the latest version;
`legacyPackages.<system>.<ns>.<pkg>."<version>"` holds every canonical version
plus float aliases, without `recurseForDerivations` so neither `nix flake
check` nor `nix flake show` walks it; the overlay adds `final.ocx.<ns>.<pkg>`.

**19. Formatter census.** [shape](nix-audit/exemplar-flake-shape.md) §7
grepped formatter names anywhere in `flake.nix` (20 of 37 named one);
[runs](nix-audit/exemplar-tool-runs.md) Axis 5 spot-read the `formatter`
output itself (9/36 declare one, 27/36 none), and `nix flake show` found
`formatter` in 9 of 20 successful shows, some through flake-parts.
**Resolved:** the stricter count stands — about three quarters of exemplars
expose no `formatter`; "no `formatter` output" is a SHOULD finding for A, D
and E.

**20. `rec` and `with pkgs;`, narrowed from H1.** [canon](nix-topic-map/canonical.md)
and [cod](nix-topic-map/codified.md) rank both P0.
[shape](nix-audit/exemplar-flake-shape.md) §4 counts 1,264 `rec {` —
spot-read, mostly legitimate `pname`/`version` interpolation — and 175
`with pkgs;`; nixpkgs' own worked example uses `finalAttrs`
([fail](nix-topic-map/failure.md) §8). **Resolved:** `mkDerivation rec {` in
new code is a SHOULD finding (use `finalAttrs`); a plain `rec { }` attrset is
CONSIDER unless it self-shadows; `with` at file or module scope is a SHOULD
finding; list-scoped `with pkgs; [ … ]` is tolerated.

**21. flake-checker is an advisory CLI step, never a MUST gate.** Its Action
always exits 0 ([cod](nix-topic-map/codified.md) §8,
[fail](nix-topic-map/failure.md) §9); the CLI crashes on 4/36 exemplars with
a non-zero exit that looks like findings ([runs](nix-audit/exemplar-tool-runs.md)
Axis 4); none of the eight generators run it
([gen](nix-topic-map/generated-flakes.md) shifts). **Resolved:** A and D flakes
with a root `nixpkgs` input run it as an advisory step that separates a crash
(stderr `Error: Invalid(` or `Error: FlakeLock(`) from findings; lock
freshness is a SHOULD with the CEL condition `inputs/follows-and-lock-hygiene`
picks.

**22. The frame's ocx numbers.** [frame](nix-frame.md) says 2,011 stored image
indexes; [ocx](nix-audit/ocx-index-and-fleet.md) §1.2 measured 1,720 (the
125-package, 98-namespace counts agree). Measured wins.

## The map

172 rows after dedup, from 325 raw candidates: 286 candidate-table rows across
the six scouts (canonical 48, codified 51, practitioner 51, failure 41,
shifts 47, generated-flakes 48) and 39 smells, patterns and generator gaps
across the three audits. Sections are lettered by the depth file or skill that
will own them (the Artifact set decision names each). Merged rows say what they
merged. `uncovered` needs no key ([map] M2); `partial` names the sibling.

### A. Flake structure and outputs — 18 rows (`nix-quality/flakes.md`, NIX-FLK)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-A-01 | How does a flake iterate systems — hand-rolled `lib.genAttrs` over a literal list, a `nix-systems` input, flake-parts `perSystem`, blueprint, or flake-utils `eachDefaultSystem` — and which does the rule teach per shape? Merges the systems rows of all six scouts. | systems | all | uncovered | P0 — split 29/12/9/7/5 of 37 ([shape](nix-audit/exemplar-flake-shape.md) §3); flake-utils stalled since 2024-11-13 ([shift](nix-topic-map/shifts.md) §12) (conflict 1); check Q2 | NIX-FLK |
| M-A-02 | Which systems does a flake declare in late 2026, now that nixpkgs 26.11 throws on any `x86_64-darwin` attribute while nixos-26.05 supports it until end-2026? | systems | all | uncovered | P0 — 17/37 exemplars hardcode it; live throw at `lib/trivial.nix:1003` ([runs](nix-audit/exemplar-tool-runs.md) headline, [shape](nix-audit/exemplar-flake-shape.md) Contradictions); check Q16 read against Q17, then `nix flake check --no-build --all-systems` | NIX-FLK |
| M-A-03 | How many nixpkgs instances does a flake create per system — `legacyPackages.<system>` once, or `import nixpkgs { inherit system; }` per output — and when is one configured import (overlays, `config.allowUnfree`) justified? Merges the "1000 instances" rows of canon, cod, prac, fail. | systems, lang | A·D·E | uncovered | P0 — 17/37 repos, 44 files ([shape](nix-audit/exemplar-flake-shape.md) §4); devenv's four instances cost a 95.6 s cold eval ([runs](nix-audit/exemplar-tool-runs.md) Axis 6) (conflict 2); check Q3 | NIX-FLK |
| M-A-04 | Which expression emits nixpkgs 26.11's `'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` — the `system` import argument, `pkgs.system`, or `stdenv.system` — and what is the warning-free spelling? | systems, lang | all | uncovered | P0 — 56/56 warnings traced to `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45` ([runs](nix-audit/exemplar-tool-runs.md) headline); every consumer eval inherits the noise; check Q4 | NIX-FLK |
| M-A-05 | Which outputs must be derivations, apps, templates, overlays, modules or bundlers for `nix flake check`, and which failures are hard (non-derivation under `packages`/`checks`) versus soft (an unknown top-level output is a warning; `formatter`'s shape is unlisted)? | flake-schema, checks-ci | all | uncovered | P0 — schema from `nix flake check --help` 2.35.2, hard/soft boundary fixture-verified ([cod](nix-topic-map/codified.md) §7); `numtide/blueprint@06ee7190:lib/default.nix:143` puts a non-derivation under `checks` ([runs](nix-audit/exemplar-tool-runs.md) smell 4e); check `nix flake check --no-build` on planted twins | NIX-FLK |
| M-A-06 | Does generated code still emit the seven pre-2021 singular outputs (`defaultPackage`, `defaultApp`, `defaultTemplate`, `defaultBundler`, `overlay`, `devShell`, `nixosModule`) that `nix flake check` rewrites with a warning? | flake-schema | all | uncovered | P1 — enumerated in the 2.35 manual ([canon](nix-topic-map/canonical.md) survey 2, [cod](nix-topic-map/codified.md) §7); agents trained on 2020-21 posts | NIX-FLK |
| M-A-07 | Is `packages.<system>.*` the export of record, is `overlays.default` derived from the same `package.nix` via `callPackage`, and does `packages` avoid re-importing nixpkgs to apply its own overlay? | flake-schema, packaging | A·B·D | uncovered | P0 — packages 29 vs overlays 20 ([shape](nix-audit/exemplar-flake-shape.md) §5); fenix's overlay cache footgun ([gen](nix-topic-map/generated-flakes.md) §3) (conflict 4); check: a planted consumer applies the overlay and builds, plus Q3 | NIX-FLK |
| M-A-08 | When does a flake need an `apps` output, and when do `packages.default` plus a hardcoded `meta.mainProgram` make `nix run` work? | consumer-ux, flake-schema | A·D | uncovered | P1 — `apps` in 6/37 ([shape](nix-audit/exemplar-flake-shape.md) §5); nixpkgs forbids deriving `mainProgram` from `pname` (`pkgs/README.md:508-515`) | NIX-FLK |
| M-A-09 | Why is a git-untracked file invisible to a flake evaluated from a working tree (no error, just absence), what is the scope (Git repository, `path:`, plain directory), and what is the one-command check? | flake-schema, consumer-ux | all | uncovered | P0 — the most-felt first-contact failure: NixOS/nix#7107, 99 reactions ([fail](nix-topic-map/failure.md) §2); Julia Evans ([prac](nix-topic-map/practitioner.md) §10); nix.dev warning ([canon](nix-topic-map/canonical.md) survey 7); check Q6 | NIX-FLK |
| M-A-10 | How should a flake alias its default package, given `default = self.packages.<system>.<name>` failed `nix flake check --no-build` by remote ref with `error: path '…-source' is not valid` in 2/20 repos — is the cause the alias or `src = self`? | flake-schema, checks-ci | A | uncovered | P1 — `DeterminateSystems/flake-checker@cddc8afc:flake.nix:60`, `sxyazi/yazi@0ea4c5d9:flake.nix:51` ([runs](nix-audit/exemplar-tool-runs.md) smell 3) | NIX-FLK |
| M-A-11 | What does a `devShells.<system>.default` need — `mkShell { packages = …; }` rather than `buildInputs`, `inputsFrom` the package — and do fleet repos default to plain devShells plus nix-direnv, or devenv? | devshell | A·E | uncovered | P1 — devShells 21/37, `.envrc` with `use flake` 16/37 ([shape](nix-audit/exemplar-flake-shape.md) §5, §8); devenv's argued position ([prac](nix-topic-map/practitioner.md) §29); stale-lock direnv symptom ([canon](nix-topic-map/canonical.md) row) | NIX-FLK |
| M-A-12 | Which of `formatter`, `checks`, `devShells`, `templates`, `lib`, `legacyPackages` does each shape expose, and is "no `formatter` output" a finding? | flake-schema | all | uncovered | P1 — 27/36 declare no formatter ([runs](nix-audit/exemplar-tool-runs.md) Axis 5) (conflict 19); checks 21/37 ([shape](nix-audit/exemplar-flake-shape.md) §5) | NIX-FLK |
| M-A-13 | When do flake-parts or blueprint hide outputs from a `flake.nix`-only scan, and must reviewers enumerate outputs with `nix flake show --json` instead? | flake-schema, checks-ci | all | uncovered | P2 — blueprint, treefmt and zed show zero outputs in `flake.nix` ([shape](nix-audit/exemplar-flake-shape.md) §1, §5) | NIX-FLK |
| M-A-14 | What must a `templates.<name>` output carry (`path`, `description`, `welcomeText`) for `nix flake init -t`, and should the fleet publish a template for its own new flakes? | flake-schema, publishing | E | uncovered | P2 — [canon](nix-topic-map/canonical.md) row; NixOS/templates ships lockless by design ([runs](nix-audit/exemplar-tool-runs.md) Axis 4) | NIX-FLK |
| M-A-15 | May a flake declare a `schemas` output, given CppNix 2.35 warns `unknown flake output 'schemas'` and only Determinate Nix ≥3.17.0 reads it? | flake-schema, impls | all | uncovered | P2 — [prac](nix-topic-map/practitioner.md) §17, [shift](nix-topic-map/shifts.md) §8 | NIX-FLK |
| M-A-16 | How is a monorepo's flake layered — one root flake with `callPackage`d subdirectories, or sub-flakes through `path:./sub` (lock format needs Nix ≥2.26)? | flake-schema, inputs-lock | A | uncovered | P2 — unsettled on Discourse ([prac](nix-topic-map/practitioner.md) §25); relative-path bugs #10089, #12281, #14762, #12438 open ([fail](nix-topic-map/failure.md) §3) | NIX-FLK |
| M-A-17 | Should `flake.nix` be a thin entry point over plain `package.nix`/`default.nix` files (jade.fyi), or carry the composition itself (flake-parts' dendritic pattern)? | flake-schema | A·B·D | uncovered | P1 — [prac](nix-topic-map/practitioner.md) §9, [canon](nix-topic-map/canonical.md) survey 10, [fail](nix-topic-map/failure.md) §11; reading heuristic "derivation bodies inside `flake.nix`" | NIX-FLK |
| M-A-18 | When is a flake the wrong tool — npins plus `default.nix`, NixOS 26.05's `system.nix` — and does the rule say so rather than assuming every project wants one? | consumer-ux | all | uncovered | P2 — nix.dev's official framing ([canon](nix-topic-map/canonical.md) survey 10-11); Discourse's settled middle ([prac](nix-topic-map/practitioner.md) §26) | NIX-FLK |

### B. Inputs and the lock — 16 rows (`nix-quality/inputs.md`, NIX-INP)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-B-01 | When must an input declare `inputs.<x>.inputs.nixpkgs.follows = "nixpkgs"`, when must it not (inputs consumed as packages from the author's cache; nixpkgs-python), and is revision age the safety signal? Merges canon, cod, prac, fail, gen rows. | inputs-lock | all | uncovered | P0 — 50 `follows` in 37 repos ([shape](nix-audit/exemplar-flake-shape.md) §2); 3,261 revisions in 10,754 flakes ([prac](nix-topic-map/practitioner.md) §11); "do not override" ([gen](nix-topic-map/generated-flakes.md) §8) (conflict 3); check Q1 plus reading heuristic "a follows on an input consumed only as `packages`" | NIX-INP |
| M-B-02 | What single command lists every nixpkgs-shaped node in `flake.lock` (including `_2`/`_3` suffixes) so duplicates are caught before they multiply? | inputs-lock, consumer-ux | all | uncovered | P0 — 3/37 multi-node locks ([shape](nix-audit/exemplar-flake-shape.md) §2), 3/19 by metadata ([runs](nix-audit/exemplar-tool-runs.md) Axis 1); no canonical command exists ([shift](nix-topic-map/shifts.md) row); check Q1, watched red on a planted two-nixpkgs consumer | NIX-INP |
| M-B-03 | Should a library, framework or module flake take a `nixpkgs` input at all, pin only `nixpkgs-lib`, or take `pkgs` as an argument (crane: zero inputs)? | inputs-lock, flake-schema | B·C | uncovered | P0 — crane 0 inputs, flake-parts 1, flake-utils 1 ([shape](nix-audit/exemplar-flake-shape.md) §2); composition over inheritance ([prac](nix-topic-map/practitioner.md) §5) (conflict 3); check `jq '.nodes.root.inputs' flake.lock` per shape, plus reading heuristic "a `lib` function that imports nixpkgs itself" | NIX-INP |
| M-B-04 | Which nixpkgs branch does a published flake track (`nixos-unstable`, `nixpkgs-unstable`, `nixos-26.05`), and which does flake-checker 0.2.15 accept? | inputs-lock | A·D | uncovered | P1 — 12/9/2/1/1 split ([shape](nix-audit/exemplar-flake-shape.md) §2); the binary's list omits 25.11 (conflict 15) | NIX-INP |
| M-B-05 | How fresh must the lock be (flake-checker's `numDaysOld < 30`), and how is refreshing automated — `update-flake-lock` action or a cron running `nix flake update --commit-lock-file`, as a PR or a push? | inputs-lock, release-versioning | A·D | uncovered | P1 — median nixpkgs lock age 65 days, max 566; 3/37 have an update workflow ([shape](nix-audit/exemplar-flake-shape.md) §2, §9); 20/31 outdated ([runs](nix-audit/exemplar-tool-runs.md) Axis 4) | NIX-INP |
| M-B-06 | Is `nix flake update <input>` used, never `nix flake lock --update-input` (gone since Nix 2.19), and does a script know `lock` only adds while `update` rewrites? | inputs-lock | all | uncovered | P0 — stale muscle memory from pre-2023 material ([shift](nix-topic-map/shifts.md) §1); `lock` vs `update` contract ([canon](nix-topic-map/canonical.md) survey 2); check Q9 | NIX-INP |
| M-B-07 | How does CI tell flake-checker's crash (`Error: Invalid("no nixpkgs dependency found…")`, `root node was not a Root node`) from a real finding? | checks-ci, inputs-lock | B·D | uncovered | P1 — crashes on 4/36 ([runs](nix-audit/exemplar-tool-runs.md) smell 1); the Action always exits 0 ([cod](nix-topic-map/codified.md) §8) (conflict 21) | NIX-INP |
| M-B-08 | When is an input `flake = false`, and what does a large set of them cost at eval time? | inputs-lock | all | uncovered | P2 — 22 `flake = false` corpus-wide ([shape](nix-audit/exemplar-flake-shape.md) §2); helix's ~100 tree-sitter inputs make eval network-bound, 300 s ([runs](nix-audit/exemplar-tool-runs.md) smell 6) | NIX-INP |
| M-B-09 | Should a flake declare `inputs.self.submodules = true` / `inputs.self.lfs = true` (Nix ≥2.27) instead of telling consumers `?submodules=1`, and what do older consumers silently get (LFS pointer text)? | inputs-lock, consumer-ux | A | uncovered | P1 — [shift](nix-topic-map/shifts.md) §1 rl-2.27; [prac](nix-topic-map/practitioner.md) §30 (conflict 15) | NIX-INP |
| M-B-10 | Do relative `path:./sub` inputs (Nix ≥2.26) make the lock unreadable to older Nix, and what is the safe pattern today? | inputs-lock | A | uncovered | P1 — lock-format break ([shift](nix-topic-map/shifts.md) §1 rl-2.26); open bugs ([fail](nix-topic-map/failure.md) §3) | NIX-INP |
| M-B-11 | Which input URL schemes may a published flake use (`github:`, tarball URLs, FlakeHub `/f/…`, registry-indirect names), and why is a bare registry name or a `channels.nixos.org/…/nixexprs.tar.xz` URL (discontinued after 27.05) a liability? | inputs-lock | all | uncovered | P1 — github 81, tarball 12, indirect 1 of 94 direct inputs ([shape](nix-audit/exemplar-flake-shape.md) §2); NixOS/nix#7422 ([fail](nix-topic-map/failure.md) §2); `.tar.xz` end date ([shift](nix-topic-map/shifts.md) §5) | NIX-INP |
| M-B-12 | Which open `follows` bugs (self-follow segfault #5393, transitive not absolute #6036, override needs flakeref #8325, removal ignores the dependency's lock #14339) must an agent guard against, and what command re-validates the graph after an edit? | inputs-lock | all | uncovered | P1 — [fail](nix-topic-map/failure.md) §3; stale-lock-after-follows-edit row ([shift](nix-topic-map/shifts.md)) | NIX-INP |
| M-B-13 | Does Lix's proposal to drop `follows` (flake.lick/flake.lix) change how much a published flake should lean on it? | inputs-lock, impls | all | uncovered | P3 — proposal only, not shipped ([cod](nix-topic-map/codified.md) §15) | NIX-INP |
| M-B-14 | How does a consumer evaluate a third-party flake without mutating its lock (`--no-write-lock-file`), and when is `--override-input nixpkgs …` a test tool (fenix's CI matrix) rather than a fix? | inputs-lock, checks-ci | all | uncovered | P2 — [shift](nix-topic-map/shifts.md) row; fenix CI matrix ([gen](nix-topic-map/generated-flakes.md) §3) | NIX-INP |
| M-B-15 | How does a lock with thousands of inputs scale (the quadratic `_N` collision search fixed in NixOS/nix#16387)? | inputs-lock, generated-flakes | D | uncovered | P3 — omniflake ([prac](nix-topic-map/practitioner.md) §12); moot once packages are never inputs (conflict 17) | NIX-INP |
| M-B-16 | What do `?dirty`, `warn-dirty`, and "lock file contains unlocked input" mean for a dirty `git+file` tree, and is `warn-dirty = false` in `nixConfig` honoured? | inputs-lock, consumer-ux | all | uncovered | P1 — #10815, #9885 ([fail](nix-topic-map/failure.md) §3) | NIX-INP |

### C. The Nix language — 15 rows (`nix-quality/language.md`, NIX-LANG)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-C-01 | When is a `rec { }` attrset legitimate (nixpkgs still permits `pname`/`version` interpolation) and when does it self-shadow into infinite recursion? | lang | all | uncovered | P1 — 1,264 occurrences, spot-read mostly legitimate ([shape](nix-audit/exemplar-flake-shape.md) §4) (conflict 20); nixf `sema-extra-rec` ([cod](nix-topic-map/codified.md) §3) | NIX-LANG |
| M-C-02 | Where does `with` hide names from static analysis and scoping — file or module scope versus a list-scoped `with pkgs; [ … ]` — and what replaces it? | lang | all | uncovered | P1 — 175 occurrences in 24 repos ([shape](nix-audit/exemplar-flake-shape.md) §4); nix.dev anti-pattern ([canon](nix-topic-map/canonical.md) survey 5); nixf `sema-extra-with` (conflict 20) | NIX-LANG |
| M-C-03 | When should `a = a;` / `a = ns.a;` become `inherit a;` / `inherit (ns) a;` (statix W03/W04) — style or signal? | lang, formatter-lint | all | uncovered | P3 — 254 + 32 findings ([runs](nix-audit/exemplar-tool-runs.md) Axis 5); style (conflict 6) | NIX-LANG |
| M-C-04 | Does a shallow `//` silently drop nested keys where `lib.recursiveUpdate` is meant, and when is replacing a whole subtree the intent? | lang | all | uncovered | P1 — [canon](nix-topic-map/canonical.md) survey 5, [fail](nix-topic-map/failure.md) §1; reading heuristic "`//` whose right side sets a nested path the left side also sets" | NIX-LANG |
| M-C-05 | When does interpolating a path (`"${./.}"`, `toString ./dir`) copy it into the store and attach string context, and when does a bare path stay a path? | lang, fetchers | all | uncovered | P1 — [cod](nix-topic-map/codified.md) row; [canon](nix-topic-map/canonical.md) survey 7 | NIX-LANG |
| M-C-06 | What is string context, when is `builtins.unsafeDiscardStringContext` legitimate, and which bug follows from misusing it? | lang | A·D | uncovered | P2 — [canon](nix-topic-map/canonical.md), [cod](nix-topic-map/codified.md) rows | NIX-LANG |
| M-C-07 | Are `<nixpkgs>`, `$NIX_PATH`, `builtins.currentSystem` and `builtins.getEnv` absent from flake code (unavailable or impure under pure evaluation), and what replaces each? | lang | all | uncovered | P0 — H1 idioms; pure eval disables them ([canon](nix-topic-map/canonical.md) survey 3); in the corpus they survive only in compat shims and VM tests ([shape](nix-audit/exemplar-flake-shape.md) §4); check `grep -rn -e '<nixpkgs>' -e 'currentSystem' -e 'getEnv' --include='*.nix' .` empty outside `default.nix`/`shell.nix` shims | NIX-LANG |
| M-C-08 | Where does "infinite recursion encountered" come from in 2026 practice — an overlay reading `final` where `prev` is required, `imports` computed from `config`, a per-system `pkgsFor` helper — and how is it localized (`--show-trace`, nixpkgs' new module error contexts)? | lang, module-system | all | uncovered | P0 — helix's own helper on `x86_64-freebsd`, nixd's inside nixpkgs `cpython/default.nix:472` ([runs](nix-audit/exemplar-tool-runs.md) Axis 3); nixpkgs#370967 ([fail](nix-topic-map/failure.md) §6); check `nix eval --show-trace` on planted twins, routed to nix-diagnose | NIX-LANG |
| M-C-09 | Which Lix 2.95 language changes reject code CppNix 2.35 accepts (`rec`-set merges and dynamic attrs, `.5` floats, `or` as a keyword, token whitespace), and how is a published flake tested for them? | lang, impls | A·B·D | uncovered | P1 — [shift](nix-topic-map/shifts.md) §7; the Lix leg of conflict 11 | NIX-LANG |
| M-C-10 | Are URLs quoted (RFC 45; statix W12, nixf `deprecated-url-literal`, Nix 2.34's `lint-url-literals`)? | lang | all | uncovered | P2 — 1 finding corpus-wide ([runs](nix-audit/exemplar-tool-runs.md) Axis 5); stabilized in 2.34 ([shift](nix-topic-map/shifts.md) §1) | NIX-LANG |
| M-C-11 | Is legacy `let { body = …; }` syntax or deprecated `builtins.toPath` present (statix W05/W17)? | lang | all | uncovered | P3 — 1 and 4 findings ([runs](nix-audit/exemplar-tool-runs.md) Axis 5) | NIX-LANG |
| M-C-12 | What does nixf's static `sema-undefined-variable` catch that Nix's lazy runtime error reports only when forced, and does an agent run nixd or nixf-diagnose while writing? | lang, formatter-lint | all | uncovered | P2 — 41 nixf diagnostics ([cod](nix-topic-map/codified.md) §3) | NIX-LANG |
| M-C-13 | When do repeated attrset keys (statix W20, nixf `sema-duplicated-attrname`) merge silently versus error, and what does merging a `rec` with a non-`rec` set do (`merge-diff-rec`) — the generated-attrset failure mode? | lang, generated-flakes | all | uncovered | P1 — 442 W20 findings, unclassified ([runs](nix-audit/exemplar-tool-runs.md) Axis 5); [cod](nix-topic-map/codified.md) row | NIX-LANG |
| M-C-14 | When is `lib.warn` / `builtins.warn` (Nix ≥2.23) the deprecation channel rather than `builtins.trace`, and does `abort-on-warn` make warnings fatal in CI? | lang, release-versioning | all | uncovered | P2 — [cod](nix-topic-map/codified.md) §14; rl-2.23 ([shift](nix-topic-map/shifts.md) §1) | NIX-LANG |
| M-C-15 | What evaluation determinism does Nix guarantee when one host evaluates every system's outputs? | lang | all | uncovered | P3 — [prac](nix-topic-map/practitioner.md) row | NIX-LANG |

### D. Packaging — 26 rows (`nix-quality/packaging.md`, NIX-PKG)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-D-01 | Does every derivation live in a `callPackage`-able `package.nix` with explicit formals, written `pkgs/by-name`-ready (no `../` references, no symlinks), so upstreaming is a copy? | packaging | A·D·F | uncovered | P1 — RFC 140 and nixpkgs-vet rules ([cod](nix-topic-map/codified.md) §4); [prac](nix-topic-map/practitioner.md) §23 (conflicts 4, 13) | NIX-PKG |
| M-D-02 | Does `mkDerivation (finalAttrs: { … })` replace `rec`, with `finalAttrs.finalPackage` feeding `passthru.tests`? | packaging, lang | A·D·F | uncovered | P1 — `finalAttrs` in 10/37 repos, 95 files ([shape](nix-audit/exemplar-flake-shape.md) §4); nixpkgs' worked example ([fail](nix-topic-map/failure.md) §8) (conflict 20) | NIX-PKG |
| M-D-03 | Which `meta` does a published package set — `description` (nixpkgs grammar), `license` (`lib.licenses`, explicit `…Only`/`…Plus`), `mainProgram` (hardcoded, only with exactly one executable), `platforms`, `sourceProvenance` for binaries, `homepage`, `changelog` — and which fail silently when missing? | packaging, consumer-ux | A·D·F | uncovered | P0 — normative `pkgs/README.md:494-516` ([shape](nix-audit/exemplar-flake-shape.md) §12); `mainProgram` in 22/37 (§4); hammering `unclear-gpl` ([cod](nix-topic-map/codified.md) §5); `mainProgram` now feeds `NIX_MAIN_PROGRAM` (nixpkgs 25.11, [shift](nix-topic-map/shifts.md) §5); check Q7 | NIX-PKG |
| M-D-04 | Is every fetch a nixpkgs fetcher with an SRI `hash = "sha256-…"` (never `sha256 =`, `cargoSha256`, `vendorSha256`), a full 40-hex `rev` or a `tag` (never a branch or a short hash), and `tag` preferred where a branch shares the name? Merges three llm-agents lint rows. | fetchers, packaging | all | uncovered | P0 — fetch ladder and the short-hash 404/DoS incident ([cod](nix-topic-map/codified.md) §11, [fail](nix-topic-map/failure.md) §7); `no-legacy-sha256`, `no-unpinned-rev`, `prefer-tag-over-rev` ([gen](nix-topic-map/generated-flakes.md) §6); `cargoSha256` hard error since nixpkgs 25.05; check Q8 plus reading heuristic "`rev` shorter than 40 hex or naming a branch" | NIX-PKG |
| M-D-05 | How is a fetcher hash obtained and refreshed — `nurl`, `nix-prefetch-url`, `lib.fakeHash` and the mismatch message, `nix-update` — never guessed? | fetchers, release-versioning | all | uncovered | P0 — "how do I reproduce this sha256" is the top hash complaint (nixpkgs#191128, [fail](nix-topic-map/failure.md) §6); agents invent hashes; check: `nix build` from a clean clone — a guessed hash fails with `hash mismatch in fixed-output derivation` | NIX-PKG |
| M-D-06 | When does a fixed-output hash drift (re-tagged upstream, regenerated GitHub archive, `fetchpatch` vs `fetchpatch2` with short index hashes), and how does an agent react to a mismatch? | fetchers | all | uncovered | P1 — [canon](nix-topic-map/canonical.md), [cod](nix-topic-map/codified.md) §11, [fail](nix-topic-map/failure.md) §7 | NIX-PKG |
| M-D-07 | Which fetches run at eval time outside the build graph (`builtins.fetchurl`, `fetchTarball`, `fetchGit`, `fetchTree`) and which are substitutable FODs (`fetchurl`, `fetchFromGitHub`), and which belongs in a `src`? | fetchers | all | uncovered | P1 — the manual's builtin-vs-nixpkgs distinction ([canon](nix-topic-map/canonical.md) survey 12); crux for (b) ([canon](nix-topic-map/canonical.md) row) | NIX-PKG |
| M-D-08 | When must `src` be `lib.fileset.toSource { root; fileset; }` (with `gitTracked`, `fileFilter`, `maybeMissing`) instead of `./.`, `self` or `cleanSourceWith`, and which rebuilds does the naive form cause? | packaging, fetchers | A | uncovered | P0 — [canon](nix-topic-map/canonical.md) survey 7, [prac](nix-topic-map/practitioner.md) §4, [fail](nix-topic-map/failure.md) §1; filtering in 21/37 repos ([shape](nix-audit/exemplar-flake-shape.md) §4); check Q15 | NIX-PKG |
| M-D-09 | Are build tools in `nativeBuildInputs` and runtime libraries in `buildInputs`, with `strictDeps = true` and `__structuredAttrs = true` from day one (the nixpkgs-vet ratchets)? | packaging | A·D·F | uncovered | P1 — ratchets ([cod](nix-topic-map/codified.md) §4); hammering `build-tools-in-build-inputs` (§5) | NIX-PKG |
| M-D-10 | Do overridden phases run `runHook preX`/`postX`, is the phase list left alone, and do environment variables sit under `env` (no lists) rather than as top-level attributes? | packaging | A·D·F | uncovered | P1 — review checklist ([fail](nix-topic-map/failure.md) §7); hammering `missing-phase-hooks`, `environment-variables-go-to-env`, `no-flags-array` ([cod](nix-topic-map/codified.md) §5) | NIX-PKG |
| M-D-11 | Does `substituteInPlace` use `--replace-fail` (or `--replace-warn`), never the deprecated bare `--replace`? | packaging | A·D·F | uncovered | P1 — nixpkgs#356002, ~7,000 in-tree holdouts, not yet removed ([shift](nix-topic-map/shifts.md) §13) | NIX-PKG |
| M-D-12 | What do `passthru.tests`, `versionCheckHook` and `installCheckPhase` prove, and which does a fleet CLI need? | packaging, checks-ci | A·D | uncovered | P1 — [fail](nix-topic-map/failure.md) §7-8 | NIX-PKG |
| M-D-13 | What does `passthru.updateScript = nix-update-script { }` require (inline `version`/`hash`), and when does a package need the attrset form or a script? | packaging, release-versioning | A·D | uncovered | P1 — [fail](nix-topic-map/failure.md) §7; nix-update cannot edit JSON-backed data ([gen](nix-topic-map/generated-flakes.md) §10); Python default switched in nixpkgs 25.11 ([shift](nix-topic-map/shifts.md) §5) | NIX-PKG |
| M-D-14 | Is `overrideAttrs` fine in a downstream or generated flake although nixpkgs bans new in-tree uses? | packaging | A·D | uncovered | P2 — a scope easily over-generalized ([cod](nix-topic-map/codified.md) §11, Contested) | NIX-PKG |
| M-D-15 | How do `config.allowUnfree`, `allowUnfreePredicate` and `permittedInsecurePackages` work in a flake (no user config under pure eval), and does a flake re-exporting unfree software gate it per version with a warning (nixpkgs-terraform)? | packaging, consumer-ux, security | A·D | uncovered | P1 — `allowUnfree` in 9/37 ([shape](nix-audit/exemplar-flake-shape.md) §4); terraform's BSL flip ([gen](nix-topic-map/generated-flakes.md) §7); `requireFile` defaults to unfree in 26.11 ([shift](nix-topic-map/shifts.md) §5) | NIX-PKG |
| M-D-16 | Rust: `buildRustPackage` with `cargoHash` (fetchCargoVendor default since nixpkgs 25.05), with `cargoLock.lockFile`, or crane — for a workspace CLI, and which hash moves on a nixpkgs bump? | packaging | A | partial (`rust-cargo` owns Cargo, not the Nix builder) | P0 — the fleet's two Rust CLIs ([ocx](nix-audit/ocx-index-and-fleet.md) §4); cargoHash nondeterminism fixed by `cargoLock` (nixpkgs#525097/#525262, [fail](nix-topic-map/failure.md) §6); check `nix build .#default` then `nix build .#default --rebuild` on the fixture | NIX-PKG |
| M-D-17 | Rust `-sys` crates in the sandbox: what do `aws-lc-sys`, `clang-sys`/bindgen (`rustPlatform.bindgenHook`), `zstd-sys` and `liblzma-sys` need, and can they link nixpkgs libraries instead of vendoring? | packaging | A | uncovered | P0 — 17 `-sys` crates in ocx, 10 in grimoire, "the largest unknown" ([ocx](nix-audit/ocx-index-and-fleet.md) §4-5); check: `nix build` of grimoire recording the first failure | NIX-PKG |
| M-D-18 | Does the pinned nixpkgs `rustc` meet `rust-toolchain.toml`'s `channel = "1.95.0"` (both fleet CLIs), or must the flake take a toolchain from rust-overlay or fenix — and does `buildRustPackage` read that file at all? | packaging, inputs-lock | A | uncovered | P0 — chase item; the pin is measured ([ocx](nix-audit/ocx-index-and-fleet.md) §4); check `nix eval --raw nixpkgs#rustc.version` against the file | NIX-PKG |
| M-D-19 | Python: `buildPythonPackage { pyproject = true; build-system = …; }`, or uv2nix/pyproject.nix from `uv.lock`, for a zero-dependency SDK? | packaging | A | partial (`python-packaging` owns pyproject) | P1 — ocx-sdk-python: no runtime deps, `uv.lock` present ([ocx](nix-audit/ocx-index-and-fleet.md) §4) | NIX-PKG |
| M-D-20 | Go: `buildGoModule` `vendorHash`, `env.CGO_ENABLED` (hard error since nixpkgs 25.11), `buildGoPackage` removed (25.05). | packaging | A | partial (`go-modules`) | P2 — [shift](nix-topic-map/shifts.md) §5; no fleet Go CLI yet | NIX-PKG |
| M-D-21 | Does a bun/TypeScript GitHub Action repository need more than a devShell pinning `bun` and `node`? | devshell | A | uncovered | P3 — setup-ocx is not a Nix packaging target ([ocx](nix-audit/ocx-index-and-fleet.md) §4) | NIX-PKG |
| M-D-22 | How does cross-compilation map onto a flake (`pkgsCross`, `hostPlatform` vs `buildPlatform`, `depsBuildBuild`), given `packages.<system>` has no slot for cross targets? | packaging, systems | A | uncovered | P2 — [canon](nix-topic-map/canonical.md) survey 8; jade.fyi ([prac](nix-topic-map/practitioner.md) §9, [fail](nix-topic-map/failure.md) §11) | NIX-PKG |
| M-D-23 | What changes on Darwin — minimum macOS Sonoma 14.0 and SDK 14.4 (nixpkgs 25.11), the SDK rework (24.11), frameworks for `security-framework-sys` and `core-foundation-sys` — and how thin is aarch64-darwin CI by design? | packaging, systems | A | uncovered | P2 — [shift](nix-topic-map/shifts.md) §5-6; nixpkgs builds only `shell` on aarch64-darwin ([cod](nix-topic-map/codified.md) §12); nixpkgs#346043 ([fail](nix-topic-map/failure.md) §6) | NIX-PKG |
| M-D-24 | What do `SOURCE_DATE_EPOCH` and `self.lastModified` mean for builds of local sources (epoch 1)? | packaging, release-versioning | A | uncovered | P3 — [prac](nix-topic-map/practitioner.md) row | NIX-PKG |
| M-D-25 | Which items of nixpkgs' verbatim new-package review checklist does no linter check (statix and deadnix are language-only), so a reading heuristic must? | packaging, formatter-lint | F | uncovered | P1 — checklist ([fail](nix-topic-map/failure.md) §7); the statix gap row | NIX-PKG |
| M-D-26 | Are patches fetched with `fetchpatch2` when published upstream, vendored only when nixpkgs-specific, and commented with why? | packaging | A·F | uncovered | P2 — [cod](nix-topic-map/codified.md) §11, [fail](nix-topic-map/failure.md) §7 | NIX-PKG |

### E. Generated flakes, prebuilt binaries and the ocx index — 30 rows (`nix-quality/generated-flakes.md`, NIX-GEN)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-E-01 | Which data architecture fits an index-driven flake — generated `.nix` per version (rust-overlay), latest-only JSON per channel (fenix), full-history JSON (zig-overlay, terraform, python), a raw upstream dump with lazy per-entry fetch (nix-vscode-extensions), or inline per-package files (llm-agents.nix)? | generated-flakes, ocx | D | uncovered | P0 — three measured architectures ([shape](nix-audit/exemplar-flake-shape.md) §11); H5 confirmed ([gen](nix-topic-map/generated-flakes.md) Summary) (conflict 17); check Q5 on the prototype | NIX-GEN |
| M-E-02 | Can the flake read the ocx index at eval time as a `flake = false` input instead of committing data, given the index lacks layer digests? | generated-flakes, ocx | D | uncovered | P0 — layer digests live only in per-platform manifests ([ocx](nix-audit/ocx-index-and-fleet.md) §5); a fetched manifest read at eval time is IFD ([cod](nix-topic-map/codified.md) Summary) (conflict 17); check Q5 against the eval-time variant | NIX-GEN |
| M-E-03 | How does an FOD fetch an ocx layer from ghcr.io, given bare 401, an anonymous token, and a 307 to a SAS URL expiring in ~10 minutes — `fetchurl` with `curlOptsList = [ "-H" "Authorization: Bearer QQ==" ]`, a curl token-exchange FOD, or skopeo? | ocx, fetchers | D | uncovered | P0 — H6 measured, `nix-prefetch-url` 401 ([ocx](nix-audit/ocx-index-and-fleet.md) §3); the QQ== convention on ghcr-hosted Homebrew bottles ([gen](nix-topic-map/generated-flakes.md) §1); `pullImage` ([gen](nix-topic-map/generated-flakes.md) §9) (conflict 16); check: `nix build` of actionlint's layer, watched red without the header | NIX-GEN |
| M-E-04 | Is the FOD `outputHash` the OCI layer digest converted to SRI with `outputHashMode = "flat"`, so generation never downloads a blob? | ocx, fetchers | D | uncovered | P0 — layer sha256 equals the manifest digest ([ocx](nix-audit/ocx-index-and-fleet.md) §3d); check Q18 equals the FOD's hash and the build succeeds | NIX-GEN |
| M-E-05 | Which manifest does each Nix system map to, given bare and `+libc.glibc` manifests coexist for one (os, arch) and ocx scores them with a directed relation that refuses ties (`ocx_oci/src/platform.rs:416`)? | ocx, systems, prebuilt-binaries | D | uncovered | P0 — naive (os, arch) dedup picks wrongly ([ocx](nix-audit/ocx-index-and-fleet.md) smell 2); 104/125 latest offer bare, 19 glibc-only ([map] M4); check: generator test over `astral-sh/ruff`'s two-manifest index | NIX-GEN |
| M-E-06 | How does a generator collapse 2,985 tags onto 1,293 digests, pick one canonical version per digest (full semver over `x.y.z_YYYYMMDD`, floats and `latest`), and expose floats as aliases? | ocx, release-versioning | D | uncovered | P0 — 56.7% aliases ([ocx](nix-audit/ocx-index-and-fleet.md) §1.3-1.4, smell 1); check: per package, attributes emitted equal unique digests (jq over the data file) | NIX-GEN |
| M-E-07 | Which attribute shape exposes many versions — `packages.<system>.<ns>-<pkg>` for latest plus `legacyPackages.<system>.<ns>.<pkg>."<version>"` — given `cli` collides across four namespaces and `packages.<system>.<name>` must be a derivation? | ocx, flake-schema, consumer-ux | D | uncovered | P0 — [map] M3; version-alias quoting papercut ([gen](nix-topic-map/generated-flakes.md) rows) (conflict 18); check Q5 plus a time bound on `nix flake show` | NIX-GEN |
| M-E-08 | Does the generated overlay add exactly one namespace attribute, so an index package can never shadow a nixpkgs name (`cmake`, `ninja`, `node`)? | ocx, flake-schema | D | uncovered | P0 — index names overlap nixpkgs ([map] M4); an overlay applies to the consumer's whole package set (conflict 4); check Q20 | NIX-GEN |
| M-E-09 | What does a prebuilt Linux binary need — nothing (static, no `PT_INTERP`), `autoPatchelfHook` with `stdenv.cc.cc.lib`, `runtimeDependencies` for `dlopen`, or `buildFHSEnv` — and does ocx's "bare" promise static? | prebuilt-binaries, ocx | D | uncovered | P0 — H7 half open: actionlint static confirmed, glibc unprobed ([ocx](nix-audit/ocx-index-and-fleet.md) §3f, Gaps); hook knobs ([gen](nix-topic-map/generated-flakes.md) §9); check `readelf -l` then `nix build` and `--version` for ninja-build/ninja | NIX-GEN |
| M-E-10 | What does a prebuilt Darwin binary need (`install_name_tool` rpath rewriting, ad-hoc `codesign -f -s -`), and what can be verified with no Darwin builder? | prebuilt-binaries | D | uncovered | P1 — zig-overlay's `mkBrewInstall` ([gen](nix-topic-map/generated-flakes.md) §1); eval-only here | NIX-GEN |
| M-E-11 | How are ocx `env` (path/constant/list), `entrypoints`, dependency visibility and `binaries` translated — `makeWrapper --prefix`/`--set`, `propagatedBuildInputs`, `meta.mainProgram` only with exactly one binary — given `binaries` lives in the per-platform config blob, not the index? | ocx, packaging | D | uncovered | P0 — the mapping table ([ocx](nix-audit/ocx-index-and-fleet.md) §2.3); location gap (§5); check `nix run .#<ns>-<pkg> -- --version` resolves through `mainProgram` | NIX-GEN |
| M-E-12 | Does every generated package set `meta.sourceProvenance = [ lib.sourceTypes.binaryNativeCode ]` and a `meta.license` mapped from the free-text `org.opencontainers.image.licenses` annotation, and what does an unmapped or missing license (7.4% of indexes) become? | ocx, prebuilt-binaries, security | D | uncovered | P0 — nixpkgs MUST for non-source packages (`pkgs/README.md:506-507`, [shape](nix-audit/exemplar-flake-shape.md) §12); 128/1,720 indexes lack a license ([ocx](nix-audit/ocx-index-and-fleet.md) §1.8); check: `nix eval` of meta over every generated package, count of missing fields = 0 | NIX-GEN |
| M-E-13 | How does the update loop run — cadence, `GITHUB_TOKEN` vs a GitHub App token, direct push vs reviewed PR vs a staging relay, `nix flake check --all-systems --no-build` plus a smoke build before commit? | generated-flakes, checks-ci, publishing | D | uncovered | P1 — cadences hourly to weekly ([shape](nix-audit/exemplar-flake-shape.md) §9, §11); App token 3/8, fenix relay, terraform review ([gen](nix-topic-map/generated-flakes.md) §2-8) | NIX-GEN |
| M-E-14 | What happens when upstream deletes, re-tags or yanks an entry, or an image-index digest is garbage-collected — keep, drop with `throw`, or warn? | generated-flakes, release-versioning | D | uncovered | P1 — never-delete (zig-overlay) vs `removed.nix` ([gen](nix-topic-map/generated-flakes.md) Summary); `yanked`/`deprecated` unused so far ([ocx](nix-audit/ocx-index-and-fleet.md) §1.5); index-digest GC (§2.1) | NIX-GEN |
| M-E-15 | How much history does the flake keep — never prune or a rolling window — and what does each cost at 1,720 indexes × 5.3 platforms? | generated-flakes | D | uncovered | P1 — rust-overlay's window ([gen](nix-topic-map/generated-flakes.md) §2); zig-overlay's 2.2 MB file ([shape](nix-audit/exemplar-flake-shape.md) §11) | NIX-GEN |
| M-E-16 | How is the data file kept compact (rust-overlay's positional hash arrays) and deterministic (sorted keys, stable formatting) so an update diff is reviewable? | generated-flakes | D | uncovered | P2 — [shape](nix-audit/exemplar-flake-shape.md) Patterns | NIX-GEN |
| M-E-17 | Does a declarative per-package updater schema (llm-agents.nix `passthru.updater` kinds, validated at eval) fit ocx, or does one index walk generate everything? | generated-flakes, ocx | D | uncovered | P1 — [shape](nix-audit/exemplar-flake-shape.md) Patterns, [gen](nix-topic-map/generated-flakes.md) §6 | NIX-GEN |
| M-E-18 | Where does the generator live — a script in the flake repository, or an `ocx` subcommand reusing `platform.rs` scoring and ocx's registry client — and does it emit JSON or Nix? | ocx | D | uncovered | P0 — a second platform-scoring implementation repeats the setup-ocx smell ([ocx](nix-audit/ocx-index-and-fleet.md) smell 4, §5) (conflict 17); check: reading heuristic "the generator contains no platform-compatibility logic of its own" | NIX-GEN |
| M-E-19 | Does the generated flake need its own binary cache, when each package is a fetched blob plus an unpack? | cache, ocx | D | uncovered | P2 — [gen](nix-topic-map/generated-flakes.md) rows | NIX-GEN |
| M-E-20 | Should the flake verify publisher signatures beyond the content digest, as zig-overlay verifies minisign before trusting a hash? | security, ocx | D | uncovered | P1 — the digest proves integrity against the index, not the index's authenticity ([gen](nix-topic-map/generated-flakes.md) §1); an ADR question | NIX-GEN |
| M-E-21 | Does the generated flake carry a conventional root `nixpkgs` input (so flake-checker runs) and a flake-compat `default.nix`? | generated-flakes, consumer-ux | D | uncovered | P2 — flake-checker crash class ([runs](nix-audit/exemplar-tool-runs.md) Patterns); flake-compat ([gen](nix-topic-map/generated-flakes.md) §8) | NIX-GEN |
| M-E-22 | How are packages with no Nix-mappable platform (Windows- or Darwin-only), Windows manifests, and `darwin/amd64` under nixpkgs 26.11 handled? | ocx, systems | D | uncovered | P1 — two packages have no linux/amd64 at all ([map] M4); the 26.11 drop (conflict 15) | NIX-GEN |
| M-E-23 | How are variant-prefixed tags (`slim-*`, `server-*`, `client-*`) handled, given the schema's `variants` field is empty in 0/125 roots? | ocx | D | uncovered | P2 — [ocx](nix-audit/ocx-index-and-fleet.md) §1.6 | NIX-GEN |
| M-E-24 | How are tar+xz layers unpacked with `strip_components`, and how are multi-layer and config-only packages handled? | ocx, prebuilt-binaries | D | uncovered | P1 — [ocx](nix-audit/ocx-index-and-fleet.md) §2.1, Gaps | NIX-GEN |
| M-E-25 | What is the consumer UX — `nix run github:<org>/<flake>#<ns>-<pkg>`, a version pin through `legacyPackages`, a devShell emitted per project from an ocx project file? | consumer-ux, ocx | D | uncovered | P1 — quoting papercut ([gen](nix-topic-map/generated-flakes.md) rows); option (b) of conflict 17 | NIX-GEN |
| M-E-26 | Are nix2container, nix-snapshotter and nixhub/devbox relevant prior art? (No: they push Nix into OCI, or index nixpkgs' own history.) | ocx | D | not applicable | P3 — settled by [gen](nix-topic-map/generated-flakes.md) §11-12; recorded so no wave re-derives it | NIX-GEN |
| M-E-27 | Since `nix flake check --all-systems --no-build` never validates a fixed-output hash, which cheap smoke build per update catches a wrong digest? | checks-ci, generated-flakes | D | uncovered | P1 — [gen](nix-topic-map/generated-flakes.md) Summary; nix-index-database's comment | NIX-GEN |
| M-E-28 | Are per-item failures (one blob 404s) non-fatal with a structured report (nixpkgs-python), and does the updater run sandboxed (llm-agents.nix bwrap)? | checks-ci, security | D | uncovered | P2 — [gen](nix-topic-map/generated-flakes.md) §6, §8 | NIX-GEN |
| M-E-29 | Should the index publish a resolved projection (per-platform layer digest, size, binaries, license) so any consumer — including an eval-time reader — skips registry round-trips, and should it stop relying on the unresolved desc-blob contract? | ocx | D | uncovered | P1 — [ocx](nix-audit/ocx-index-and-fleet.md) §1.1, §5; an ADR request | NIX-GEN |
| M-E-30 | Is the token-and-redirect dance a credential boundary (curl must not forward `Authorization` to the redirect host; GHSA-6fjr credential leak in `<nix/fetchurl.nix>`)? | security, ocx | D | uncovered | P1 — [ocx](nix-audit/ocx-index-and-fleet.md) §3c; [fail](nix-topic-map/failure.md) §5 | NIX-GEN |

### F. The gate, CI and implementations — 20 rows (`nix-quality/gates.md`, NIX-GATE)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-F-01 | What ordered command block must every Nix change pass (format check, deadnix, statix, Q5, a build, an `--all-systems` eval), and what does each exit status mean? | checks-ci, formatter-lint | all | uncovered | P0 — only 14/37 CIs run `nix flake check` ([shape](nix-audit/exemplar-flake-shape.md) §9); no two exemplars run the same set; check: the block itself, red and green on fixtures | NIX-GATE |
| M-F-02 | Which `formatter` output makes a bare `nix fmt` format the whole tree on Nix 2.35 — `pkgs.nixfmt-tree`, `pkgs.nixfmt`, or a treefmt-nix wrapper — and which command checks without writing? | formatter-lint | all | uncovered | P0 — 27/36 declare no formatter; `nixfmt-tree` in 2/36 ([runs](nix-audit/exemplar-tool-runs.md) Axis 5); nixfmt formats one file at a time by design ([cod](nix-topic-map/codified.md) §6); check: the check command exits non-zero on a planted misformatted file | NIX-GATE |
| M-F-03 | Is the formatter nixfmt (`pkgs.nixfmt`, RFC 166) — never `nixfmt-rfc-style` (deprecated alias since nixpkgs 25.11), `nixfmt-classic`, or the archived `nixpkgs-fmt` — and is an alejandra repository left alone? | formatter-lint | all | uncovered | P0 — H1 naming; nixpkgs-fmt archived 2024-07-24 ([shift](nix-topic-map/shifts.md) §11) (conflict 5); check Q10 | NIX-GATE |
| M-F-04 | Does deadnix gate as Q11, excluding generated data and parser fixtures, and what is its false-positive rate? | formatter-lint | all | uncovered | P0 — 908 unused-pattern findings from `callPackage` formals ([runs](nix-audit/exemplar-tool-runs.md) Axis 5, [cod](nix-topic-map/codified.md) §2) (conflict 6); check Q11 on planted twins | NIX-GATE |
| M-F-05 | Which statix codes detect defects rather than style (W08 749, W20 442, W04 254), should statix gate or advise, and what goes in `statix.toml`'s `disabled` list? | formatter-lint | all | uncovered | P1 — histogram ([runs](nix-audit/exemplar-tool-runs.md) Axis 5); W09 present in source, off in the binary; statix's fork migration ([cod](nix-topic-map/codified.md) §1) (conflict 6) | NIX-GATE |
| M-F-06 | Does nixf-diagnose (nixd's 41 diagnostics, including `sema-undefined-variable` and `sema-extra-with`) join the gate, and is it in nixpkgs 26.11? | formatter-lint | all | uncovered | P1 — [cod](nix-topic-map/codified.md) §3; shipped by treefmt-nix and git-hooks.nix (§9-10) | NIX-GATE |
| M-F-07 | How do format and lint gates exclude generated data and deliberately malformed fixtures (`test_data/`, `tests/fixtures/`)? | formatter-lint | all | uncovered | P1 — nil alone is 45% of statix and 32% of deadnix findings ([runs](nix-audit/exemplar-tool-runs.md) smell 2); treefmt `excludes` ([cod](nix-topic-map/codified.md) §9) | NIX-GATE |
| M-F-08 | What can `nix flake check --no-build` not run — IFD (`path … is not valid`), self-referential defaults by remote ref, foreign-system IFD (#4265) — and how does a reader tell a checker limit from a defect? | checks-ci | all | uncovered | P0 — 4/20 home-system failures are checker limits ([runs](nix-audit/exemplar-tool-runs.md) Axis 3, smell 3); #4265 open since 2020 ([fail](nix-topic-map/failure.md) §2); check: each error string reproduced on a planted fixture | NIX-GATE |
| M-F-09 | What does `--all-systems` add, and how is a red result triaged across its six measured causes (darwin-poisoned nixpkgs, platform-restricted dependency, recursion inside nixpkgs, toolchain platform limit, non-derivation output, the flake's own recursion) — only two the author's? | checks-ci, systems | all | uncovered | P0 — 10/20 failed, 2 authoring defects ([runs](nix-audit/exemplar-tool-runs.md) smell 4, Patterns); check: the taxonomy table applied to the fixture set | NIX-GATE |
| M-F-10 | Since Nix 2.32 skips substitutable derivations in `nix flake check`, what does a green check prove, and when must CI `nix build` explicitly? | checks-ci | all | uncovered | P1 — rl-2.32 ([shift](nix-topic-map/shifts.md) §1) (conflict 15) | NIX-GATE |
| M-F-11 | Which installer is of record — `cachix/install-nix-action` (upstream CppNix) pinned by commit SHA, not `nix-installer-action` (Determinate Nix by default) or `determinate-nix-action@main` — and how is the Nix version pinned? | checks-ci, impls | all | uncovered | P0 — 24/37 cachix, half SHA-pinned; 4 Determinate at `@main` ([shape](nix-audit/exemplar-flake-shape.md) §9); the default flip ([shift](nix-topic-map/shifts.md) §10) (conflict 12); check Q19 | NIX-GATE |
| M-F-12 | Which CI cache does a fleet flake use after magic-nix-cache's free tier ended (2025-02-01) and its community revival (v15, 2026-09-09) — none, cache-nix-action, magic-nix-cache ≥v11, Cachix, FlakeHub Cache — and does the GitHub cache-API change threaten each? | cache, checks-ci | A·D | uncovered | P1 — [shift](nix-topic-map/shifts.md) §9, [prac](nix-topic-map/practitioner.md) §20, [shape](nix-audit/exemplar-flake-shape.md) §9 (conflict 12) | NIX-GATE |
| M-F-13 | Which runner matrix does a published flake need (`ubuntu-24.04`, `ubuntu-24.04-arm`, `macos-14`/`15`), given no exemplar runs Nix on Windows and nixpkgs builds only `shell` on aarch64-darwin? | checks-ci, systems | A·D | uncovered | P1 — 0 Windows Nix jobs ([shape](nix-audit/exemplar-flake-shape.md) §9); [cod](nix-topic-map/codified.md) §12 | NIX-GATE |
| M-F-14 | Which implementations and versions does a published flake test against — current CppNix (required), Lix 2.95 (advisory), the oldest non-stub `nixVersions.nix_2_*` (the floor) — and is Determinate Nix a leg? | impls, checks-ci | A·B·D | uncovered | P0 — `nix_2_24` is a stub throw in 26.11 ([runs](nix-audit/exemplar-tool-runs.md) Axis 7); Lix strictness ([shift](nix-topic-map/shifts.md) §7) (conflict 11); check: the CI matrix runs Q5 under each named implementation | NIX-GATE |
| M-F-15 | Why does a GitHub Actions PR checkout make a flake look dirty (#5302), and which checkout settings avoid it? | checks-ci | all | uncovered | P1 — [fail](nix-topic-map/failure.md) §3 | NIX-GATE |
| M-F-16 | Does flake-checker run in CI as an advisory step with a crash-aware wrapper, and with which CEL condition? | checks-ci, inputs-lock | A·D | uncovered | P1 — [cod](nix-topic-map/codified.md) §8, [fail](nix-topic-map/failure.md) §9; none of the generators run it ([gen](nix-topic-map/generated-flakes.md)) (conflict 21) | NIX-GATE |
| M-F-17 | Are the actions in a Nix CI job pinned by full SHA rather than `@v31` or `@main`? | checks-ci, security | all | uncovered | P1 — [shape](nix-audit/exemplar-flake-shape.md) smell 5 | NIX-GATE |
| M-F-18 | What eval-time budget is acceptable for `nix flake show`/`check` (helix 300 s network-bound, treefmt-nix 212 s), and how is eval cost measured? | checks-ci, consumer-ux | all | uncovered | P2 — [runs](nix-audit/exemplar-tool-runs.md) Axis 2, 6 | NIX-GATE |
| M-F-19 | Does git-hooks.nix or treefmt-nix wire the gate locally, and which hook names are current (`nixfmt`, not the legacy `nixfmt-rfc-style`/`nixfmt-classic` hooks)? | formatter-lint, devshell | A | uncovered | P2 — [cod](nix-topic-map/codified.md) §9-10 | NIX-GATE |
| M-F-20 | Which language server does a devShell or editor config default to — nixd (more active) or nil? | devshell | all | uncovered | P3 — both maintained ([shift](nix-topic-map/shifts.md) §11) | NIX-GATE |

### G. Release, versioning and publishing — 16 rows (`nix-quality/release.md`, NIX-REL)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-G-01 | Is a flake-built package's `version` read from the project's manifest (`lib.importTOML ./Cargo.toml`, `pyproject.toml`), never a duplicated literal, with the revision kept out of `version`? | release-versioning, packaging | A | partial (`rust-cargo` owns the Cargo version) | P0 — `fromTOML` 10 repos, `self.shortRev` 10, 259 literals ([shape](nix-audit/exemplar-flake-shape.md) §4) (conflict 8); check Q14 against the manifest | NIX-REL |
| M-G-02 | What do `self.rev`, `shortRev`, `dirtyShortRev`, `lastModified(Date)` and `revCount` evaluate to for a clean tag, a dirty tree, a `github:` ref, `path:` and a tarball, under Nix 2.35's lazy source copies? | release-versioning | A | uncovered | P1 — [shift](nix-topic-map/shifts.md) row on 2.33/2.35 | NIX-REL |
| M-G-03 | How is a flake released — the project's `vX.Y.Z` tag pinned as `github:<owner>/<repo>/vX.Y.Z`, FlakeHub tagged, FlakeHub rolling, or the lock alone — and what does a consumer gain from each? | release-versioning, publishing | A·B·C·D | partial (`rust-cargo` owns the tag scheme) | P0 — 10/37 never tagged, four tag styles ([shape](nix-audit/exemplar-flake-shape.md) §10); FlakeHub the only semver resolver ([prac](nix-topic-map/practitioner.md) §15) (conflict 9); check: `nix flake metadata github:<owner>/<repo>/vX.Y.Z` resolves and Q14 equals `X.Y.Z` | NIX-REL |
| M-G-04 | If FlakeHub is used, why must tagged and rolling releases never mix, and does a `https://flakehub.com/f/…` input couple a consumer to one vendor's resolver? | publishing | all | uncovered | P1 — the July 2026 invisibility case ([gen](nix-topic-map/generated-flakes.md) §12); 3 exemplars consume FlakeHub URLs ([shape](nix-audit/exemplar-flake-shape.md) §2) | NIX-REL |
| M-G-05 | Is the lock refreshed before a release, in its own change, never at tag time? | release-versioning, inputs-lock | A | uncovered | P1 — lock churn rows ([cod](nix-topic-map/codified.md)); lock ages ([shape](nix-audit/exemplar-flake-shape.md) §2) | NIX-REL |
| M-G-06 | How is an output renamed or removed without breaking consumers — `lib.warn` on the old attribute (nix-index-database's `hmModules`), `lib.derivations.warnOnInstantiate`, a one-cycle alias with `builtins.warn` (terraform), a dated `throw`? | release-versioning | all | uncovered | P1 — [gen](nix-topic-map/generated-flakes.md) §4, §7; [cod](nix-topic-map/codified.md) §14 | NIX-REL |
| M-G-07 | What install block does a README give — `nix run github:<owner>/<repo>`, `nix profile add` (renamed from `install` in Nix 2.30), a flake-input snippet with follows guidance — and never `nix-env -i`? | consumer-ux | A·D | partial (`docs-quality` owns README style) | P1 — 20/37 READMEs give no greppable hint ([shape](nix-audit/exemplar-flake-shape.md) §10); Q9 | NIX-REL |
| M-G-08 | Does a published flake ship a flake-compat `default.nix`, and from which source (NixOS or nix-community, never `edolstra/flake-compat` in new code)? | consumer-ux, inputs-lock | A·D | uncovered | P1 — 12/37 across three sources ([shape](nix-audit/exemplar-flake-shape.md) §8) (conflict 10) | NIX-REL |
| M-G-09 | Should a fleet CLI also be upstreamed to nixpkgs (`pkgs/by-name`, r-ryantm updates, cache.nixos.org substitutes), and what makes the in-repo `package.nix` upstream-ready, including the `pkg: old -> new` commit convention? | publishing | A·F | uncovered | P1 — merge-bot payoff and commit-scoped CI builds ([cod](nix-topic-map/codified.md) §11-12); r-ryantm only in-tree ([gen](nix-topic-map/generated-flakes.md) §12) (conflict 13) | NIX-REL |
| M-G-10 | Does the project publish a binary cache for consumers, and how is it documented given `nixConfig` substituters are ignored for untrusted users? | cache, publishing, security | A·D | uncovered | P1 — [runs](nix-audit/exemplar-tool-runs.md) smell 5; caches only help near the pinned nixpkgs ([gen](nix-topic-map/generated-flakes.md) Summary) (conflicts 7, 12) | NIX-REL |
| M-G-11 | What compatibility promise can a flake make about its outputs and lock while flakes stay experimental (RFC 136 defers them; 2.19 and 2.26 broke things)? | release-versioning, impls | all | uncovered | P1 — [shift](nix-topic-map/shifts.md) §2; RFC 49 never accepted ([canon](nix-topic-map/canonical.md) survey 19) | NIX-REL |
| M-G-12 | Does "one flake per versioned thing" apply to a repository shipping several binaries (`ocx`, `ocx-shim`) and to the generated flake? | publishing | A·D | uncovered | P2 — FlakeHub best practice ([prac](nix-topic-map/practitioner.md) §16, [fail](nix-topic-map/failure.md) §15) | NIX-REL |
| M-G-13 | What does a CHANGELOG entry for a flake change (renamed outputs, dropped systems, changed inputs) say? | release-versioning | all | partial (`docs-quality`) | P3 | NIX-REL |
| M-G-14 | How does one nixpkgs bump regenerate hashes across ecosystems (`cargoHash`, `vendorHash`, `npmDepsHash`), and how does a release sequence it? | release-versioning, packaging | A | uncovered | P2 — [shift](nix-topic-map/shifts.md) row | NIX-REL |
| M-G-15 | How is `nix-update --flake` used at release time to bump an in-repo package's version and hashes? | release-versioning | A | uncovered | P1 — flags `--build`, `--test`, `--review`, `--generate-lockfile` measured ([canon](nix-topic-map/canonical.md) survey 19); inline requirement ([gen](nix-topic-map/generated-flakes.md) §10) | NIX-REL |
| M-G-16 | Should a fleet CLI's flake build from source, or wrap its own cargo-dist release binaries as a `-bin` package, given ocx and grimoire are already in the ocx index? | publishing, prebuilt-binaries | A·D | uncovered | P1 — [map] M3; `-sys` build risk ([ocx](nix-audit/ocx-index-and-fleet.md) §4) (conflict 13) | NIX-REL |

### H. Security and trust — 10 rows (`nix-quality/security.md`, NIX-SEC)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-H-01 | Which `nixConfig` keys may a published flake carry — only its own `extra-substituters` / `extra-trusted-public-keys` pair, if any — and which are forbidden (`post-build-hook`, `sandbox`, `allow-import-from-derivation`, `trusted-users`)? | security, flake-schema | all | uncovered | P0 — 11/37 declare it ([shape](nix-audit/exemplar-flake-shape.md) §6); warning on every run ([runs](nix-audit/exemplar-tool-runs.md) headline); five settings apply unprompted ([canon](nix-topic-map/canonical.md) survey 3) (conflict 7); check Q12 | NIX-SEC |
| M-H-02 | Is `accept-flake-config` ever set globally, passed by an agent, or recommended in a README, given it grants root-equivalent execution (NixOS/nix#9649)? | security | all | uncovered | P0 — maintainer-confirmed intended behaviour ([fail](nix-topic-map/failure.md) Summary); check Q13 | NIX-SEC |
| M-H-03 | Where do `access-tokens` live (local or CI `nix.conf`, `NIX_CONFIG`), and why never in a flake, a committed `nix.conf`, or a derivation? | security | all | uncovered | P0 — plain-text `host=token` setting ([canon](nix-topic-map/canonical.md) survey 3); the research toolchain itself passes it through `NIX_CONFIG` ([frame](nix-frame.md) `run.sh`); check `grep -rn -e 'access-tokens' -e 'ghp_' -e 'github_pat_' .` empty outside docs | NIX-SEC |
| M-H-04 | Which secret-bearing values reach the world-readable store (tokens in `env`, a secret read with `builtins.readFile`, interpolated credentials)? | security | all | uncovered | P1 — wiki warning ([canon](nix-topic-map/canonical.md) survey 15); `types.pathWith { inStore = false; }` (survey 14) | NIX-SEC |
| M-H-05 | Which Nix versions may a CI or self-hosted daemon run after CVE-2026-39860 (fixed in 2.34.5, 2.33.4, 2.32.7, 2.31.4, 2.30.4, 2.29.3, 2.28.6) and the other advisories, and who may submit builds? | security, checks-ci | all | uncovered | P1 — [fail](nix-topic-map/failure.md) §5 | NIX-SEC |
| M-H-06 | Does an FOD's network access (`impureEnvVars` proxies) or skopeo's `--insecure-policy` weaken anything when the output hash is pinned? | security, fetchers | D | uncovered | P2 — [gen](nix-topic-map/generated-flakes.md) §9 | NIX-SEC |
| M-H-07 | What does a flake author do on an upstream compromise, given no lock-level gate caught the xz backdoor and nixpkgs reverted the same day (#300028)? | security | all | uncovered | P2 — [fail](nix-topic-map/failure.md) §13 | NIX-SEC |
| M-H-08 | Are inputs pointing at forks or typo-squatted owners detected (flake-checker `--check-owner`)? | security, inputs-lock | all | uncovered | P2 — [canon](nix-topic-map/canonical.md) survey 18 | NIX-SEC |
| M-H-09 | Should an agent evaluate an untrusted flake at all, and with which flags (`--no-write-lock-file`, `--option allow-import-from-derivation false`, never `--accept-flake-config`)? | security | all | uncovered | P1 — IFD defaults to true ([canon](nix-topic-map/canonical.md) survey 3); [shift](nix-topic-map/shifts.md) row | NIX-SEC |
| M-H-10 | Is `ca-derivations` (realisation poisoning, GHSA-jm6c) or `recursive-nix` enabled anywhere? | security | all | uncovered | P3 — [fail](nix-topic-map/failure.md) §5 | NIX-SEC |

### I. Modules a flake exports — 8 rows (`nix-quality/modules.md`, NIX-MOD, conditional)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-I-01 | How are options declared (`mkOption` with `type`, `description`, `default`/`defaultText`), and when are `mkEnableOption` and `mkPackageOption` the idiom? | module-system | C | uncovered | P2 — NixOS manual ([canon](nix-topic-map/canonical.md) survey 14) | NIX-MOD |
| M-I-02 | What do `mkIf`, `mkMerge`, `mkDefault`, `mkForce` and `mkOverride` do, and which types skip merging (`types.raw`)? | module-system | C | uncovered | P2 — [canon](nix-topic-map/canonical.md) survey 14 | NIX-MOD |
| M-I-03 | Does a module expose settings RFC-42 style (`pkgs.formats.<fmt> { }` plus `freeformType`) rather than a stringly `extraConfig`? | module-system | C | uncovered | P2 — [cod](nix-topic-map/codified.md) §13 | NIX-MOD |
| M-I-04 | Which path type is right for a secret (`types.path`, `pathInStore`, `externalPath`, `pathWith { inStore = false; }`)? | module-system, security | C | uncovered | P2 — [canon](nix-topic-map/canonical.md) survey 14 | NIX-MOD |
| M-I-05 | How are options deprecated (`mkRenamedOptionModule`, `mkRemovedOptionModule`, `mkAliasOptionModule`, `mkChangedOptionModule`)? | module-system, release-versioning | C | uncovered | P2 — [cod](nix-topic-map/codified.md) §14 | NIX-MOD |
| M-I-06 | Does an exported module use the consumer's `pkgs`, never the flake's own nixpkgs, and index `self.packages` by `pkgs.stdenv.hostPlatform.system` (the 26.11 rename)? | module-system, inputs-lock | C | uncovered | P1 — conflict 3; M-A-04's warning | NIX-MOD |
| M-I-07 | When does a module need an extensible option type (the enum-placeholder pattern)? | module-system | C | uncovered | P3 — [canon](nix-topic-map/canonical.md) survey 14 | NIX-MOD |
| M-I-08 | What makes a flake-parts module (`flakeModules.default`) consumable? | module-system | B | uncovered | P2 — [canon](nix-topic-map/canonical.md) survey 16 | NIX-MOD |

### J. The `nix-quality` index — 7 rows (`nix-quality.md`, NIX-CORE)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-J-01 | What single gate block does the index carry, and what proves a change done (a command, its exit status, the tree it ran against)? | checks-ci | all | uncovered | P0 — house convention of every sibling index (`rules/go-quality.md` "The Gate"); check: the block from M-F-01 | NIX-CORE |
| M-J-02 | Never weaken a check (no disabled lint, no `--no-verify`, no skipped system) to get green. | checks-ci | all | covered (house `*-CORE-01`) | P1 — sibling indexes | NIX-CORE |
| M-J-03 | Watch a check red before trusting it green, and state what empty output means. | checks-ci | all | covered (house `*-CORE-02/03`) | P1 — sibling indexes | NIX-CORE |
| M-J-04 | Read the era first — Nix version and implementation, the pinned nixpkgs branch — before choosing an idiom (x86_64-darwin, nixfmt naming, cargoHash, `nix profile add` are all era-gated). | lang | all | uncovered | P0 — the X/Y table ([shift](nix-topic-map/shifts.md)); check Q17 | NIX-CORE |
| M-J-05 | Identify the flake's shape (A-F) first, since library flakes do not pin nixpkgs, apps do, and generated flakes never IFD. | flake-schema | all | uncovered | P0 — conflicts 3, 4, 14 are shape-dependent; check: reading heuristic "`packages`/`apps` → A; `lib`/`flakeModules` only → B; `nixosModules`/`homeModules` → C; committed data plus an updater → D; `templates` → E" | NIX-CORE |
| M-J-06 | How are generated Nix and data files marked and kept out of hand edits and formatters? | generated-flakes, formatter-lint | D | uncovered | P1 — nix-index-database's "autogenerated" header ([gen](nix-topic-map/generated-flakes.md) §4); nixpkgs' `manual-file-edits` job ([cod](nix-topic-map/codified.md) §12) | NIX-CORE |
| M-J-07 | Which non-glob files (`.envrc`, Nix jobs in `.github/workflows/`, `treefmt.toml`, README install blocks) does the index route to by task? | any | all | uncovered | P1 — rule-distillation "Narrow the Glob Only When It Cannot Miss"; [map] M5 | NIX-CORE |

### K. Procedures for the skills — 6 rows

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-K-01 | What is the procedure to add a flake to an existing repository — choose the shape, write `package.nix` with the right builder and a real hash (`nurl`, `lib.fakeHash`), the skeleton, devShell, formatter and checks, `git add`, the gate, a CI job, a README block — for ocx, grimoire, ocx-sdk-python and setup-ocx, including a "modernize an existing flake" branch? | all | A | uncovered | P1 — rows A, D, F, G compose into it ([ocx](nix-audit/ocx-index-and-fleet.md) §4) | skill: nix-flake-adopt |
| M-K-02 | What is the procedure to cut a flake release — gate plus `--all-systems` plus build matrix plus Lix leg, version sync, lock policy, tag, `nix run github:<owner>/<repo>/vX.Y.Z` from a clean store, optional cache push, optional nixpkgs bump? | release | A·D | uncovered | P1 — rows F, G | skill: nix-flake-release |
| M-K-03 | What is the triage runbook — verbatim error strings (untracked-file absence, `hash mismatch in fixed-output derivation`, `infinite recursion encountered`, `path … is not valid`, `is not a derivation`, `Nixpkgs 26.11 has dropped support for x86_64-darwin`, `Refusing to evaluate package … not available on the requested hostPlatform`, unfree refusals, `ignoring untrusted flake configuration setting`, flake-checker's `Error: Invalid(`, stale eval cache #3872, CI dirty tree #5302) → cause → first command → fix? | all | all | uncovered | P0 — verbatim-matchable strings ([runs](nix-audit/exemplar-tool-runs.md) Patterns), [fail](nix-topic-map/failure.md) §2; check: each string reproduced on a planted fixture | skill: nix-diagnose |
| M-K-04 | What is the procedure to update a generated flake (run the generator, review the diff, smoke-build, commit)? | generated-flakes | D | uncovered | P2 — owned by the ocx handoff's update loop (M-E-13), not a lore skill | deferred |
| M-K-05 | How does nix-flake-adopt modernize an existing flake (flake-utils → `genAttrs`, `nixfmt-rfc-style` → `nixfmt`, `defaultPackage` → `packages.default`, x86_64-darwin removal)? | all | A·B | uncovered | P2 — conflicts 1, 5, 15 | skill: nix-flake-adopt |
| M-K-06 | Does the Nix set need its own review skill? | any | all | uncovered | P3 — no language set has one yet | deferred |

## Artifact set decision

One rule with an index and eight depth files (a ninth conditional), three
skills, one untagged bundle, and an ocx handoff of three parts. This keeps the
frame's shape with four changes: `statix.toml` joins the glob list; the
generated-flake material is a depth file plus a handoff, not a skill;
`nix-flake-adopt` joins the skills; and inputs, packaging and security get
their own depth files.

### The rules and their glob lists

| Rule | `paths` | Index-owned family | Depth files (family) |
|---|---|---|---|
| `nix-quality` | `"**/*.nix"`, `"**/flake.lock"`, `"**/statix.toml"` | NIX-CORE (section J) | `flakes.md` (NIX-FLK), `inputs.md` (NIX-INP), `packaging.md` (NIX-PKG), `generated-flakes.md` (NIX-GEN), `gates.md` (NIX-GATE), `release.md` (NIX-REL), `language.md` (NIX-LANG), `security.md` (NIX-SEC); conditional `modules.md` (NIX-MOD) |

**Why these three globs, and why one rule.** *Assumption: a coding agent
loads a rule when it edits a file its glob matches.*
- `**/*.nix` is the language's own extension, and it covers every file name
  Nix or nixpkgs requires or conventionally reads: `flake.nix` (required by
  flakes), `default.nix` and `shell.nix` (read by `nix-build`/`nix-shell`),
  `package.nix` (required under `pkgs/by-name`).
- `**/flake.lock` is the one non-`.nix` name Nix itself requires; it loads the
  rule on every lock bump, which is exactly when the NIX-INP rows apply.
- `**/statix.toml` is statix's discovery name. Only Nix projects carry it
  (2/37 exemplars, [map] M5), so it cannot over-match; it loads the rule when
  someone edits the lint configuration.
- A second rule would need a genuinely different glob. `flake.nix` is both
  code and manifest, so a `flake-*` rule would load alongside `nix-quality`
  on every flake edit — the monolith with extra steps. Same glob, same rule.

**Unsafe globs, rejected.** `**/.envrc` (direnv's name, used by non-Nix
projects: 19 exemplars, but also every dotenv user), `**/.github/workflows/*.yml`
(every CI file in every language), `**/treefmt.toml` (treefmt serves non-Nix
formatters), and generated data names (`sources.json`, `versions.json`,
`data/*.json` — generic). Each is routed by task from the index (M-J-07), and a
data file is regenerated by a bot, not hand-edited.

**Checker.** `check-artifacts.py --root ~/.cache/research-lang/exemplars/nix/nix-community__disko`,
behind an `if [ -d … ]` guard: disko carries `flake.nix`, `flake.lock`,
`*.nix` and `statix.toml` ([map] M5), so no glob needs `--allow-absent`.

**Index shape (`nix-quality.md`, under 200 lines).** It holds:
- the gate block (M-J-01, from NIX-GATE's ordered commands);
- NIX-CORE-01..03, the house trio: never weaken a check, watch it red, the
  meaning of empty output (M-J-02, M-J-03);
- NIX-CORE-04, read the era first (M-J-04, Q17);
- NIX-CORE-05, identify the flake shape first (M-J-05);
- NIX-CORE-06, generated files (M-J-06);
- the non-negotiables list (a curated cross-family subset, each line ending in
  its rule ID);
- the routing table by task, below;
- the Siblings: `rust-cargo` (Cargo and cargo-dist), `python-packaging`,
  `go-modules`, `docs-quality` (README and CHANGELOG prose), `bazel-quality`
  (hermeticity; `rules_nixpkgs` users).

**Routing table (by task, never by topic name).**

| When you are… | Read |
|---|---|
| writing or restructuring `flake.nix` outputs, iterating systems, instantiating nixpkgs, adding packages, overlays, apps, devShells, formatter, checks or templates | `flakes.md` |
| adding, removing or retargeting an input, writing `follows`, bumping or reviewing `flake.lock`, using submodules, LFS or sub-flakes | `inputs.md` |
| writing or editing a derivation or `package.nix`: fetchers and hashes, `src` filtering, meta, phases, Rust, Python or Go builders | `packaging.md` |
| packaging a binary you did not build, or generating packages from an external index (committed data, reader, updater), including the ocx index | `generated-flakes.md` |
| running or wiring the gate: formatter, deadnix, statix, `nix flake check`, the CI job, installer, cache, implementation matrix | `gates.md` |
| choosing a version string, tagging or publishing, deprecating an output, writing install instructions, supporting non-flake users, upstreaming to nixpkgs | `release.md` |
| writing Nix expressions: `rec`, `let`, `with`, `inherit`, `//`, paths and string context, impure builtins, an infinite recursion | `language.md` |
| touching `nixConfig`, tokens, secrets, substituters or trusted keys, FOD network access, or evaluating someone else's flake | `security.md` |
| writing a NixOS, home-manager, nix-darwin or flake-parts module that a flake exports (only if `modules.md` ships) | `modules.md` |
| editing `.envrc`, a Nix job in `.github/workflows/`, `treefmt.toml` or a README install block | the file named for that task above (`flakes.md`, `gates.md`, `release.md`) |

### ID families

NIX-CORE (index), NIX-FLK, NIX-INP, NIX-PKG, NIX-GEN, NIX-GATE, NIX-REL,
NIX-LANG, NIX-SEC, and NIX-MOD (allocated; it ships only if wave 4's
`modules/module-authoring` produces rows that pass the four selection tests,
otherwise its surviving rows fold into NIX-FLK and the prefix is never used).
One family per depth file; a prefix belongs to one file forever.

### Skills

| Skill | Procedure | Draws on |
|---|---|---|
| `nix-flake-adopt` | Add a flake to an existing repository, or modernize one: identify the shape, pick the builder and get real hashes, write `package.nix` and the skeleton, devShell, formatter, checks, `git add`, run the gate, add the CI job and README block. | NIX-FLK, NIX-PKG, NIX-GATE, NIX-REL, M-K-01, M-K-05 |
| `nix-flake-release` | Cut a release of a flake-bearing project: gate plus `--all-systems` plus build and implementation legs, version sync with the manifest, lock policy, tag, verify `nix run` of the tag from a clean store, optional cache and FlakeHub push, optional nixpkgs bump, output deprecations. | NIX-REL, NIX-GATE, NIX-INP, M-K-02 |
| `nix-diagnose` | Triage an evaluation, build or check failure from its verbatim error string: cause, first command, fix, and the known checker limitations that are not defects. | NIX-LANG, NIX-GATE, NIX-FLK, NIX-PKG, M-K-03 |

**Dropped:**
- `nix-flake-generate`: generating a flake from an index is a design pattern
  (the depth file) plus ocx product code (the handoff), not a procedure a
  general adopter runs; the generated flake's update loop runs in CI.
- `nix-generated-flakes` as a skill (the frame's alternative): same reason.
- A review skill: deferred (M-K-06).

### Bundle

`nix-essentials` has the members `nix-quality`, `nix-flake-adopt`,
`nix-flake-release` and `nix-diagnose`. Every member is untagged; bundles never
pin, and `latest` counts as a pin.

### The ocx handoff

Three parts, in order; none is a lore artifact beyond the depth file.
1. **The research artifact**: the wave-2 consolidation `nix-generated-flakes.md`
   (NIX-GEN ruleset, the fetch-path evidence, the data-model measurements), with
   the two prototype fixtures copied, small, into `nix-generated-flakes/prototype/`.
2. **A prototype generator and flake** that evaluates and builds real index
   packages with the local toolchain (wave 2 builds it; if the fetch is
   infeasible, the prototype stops at the data model and the ADR carries the
   blocker).
3. **An ADR draft for the ocx repository** (`adr_nix_flake_generation.md`,
   drafted at authoring time from the consolidation). It must settle: where the
   generator lives (an `ocx` subcommand reusing `platform.rs:416` and the
   registry client, per conflict 17); where the generated flake is published and
   under what name; the fetch mechanism, and whether ocx or the index must
   provide a stable blob URL or a resolved projection with layer digests
   (M-E-29); the attribute shape and version/alias rules; the libc-to-derivation
   template; the license and `sourceProvenance` mapping, and the unmapped-license
   policy; signature verification beyond digests (M-E-20); update cadence,
   token, review model and yanked/removed handling; supported systems.

The portable subset — any index-driven or prebuilt-binary flake — ships as
`rules/nix-quality/generated-flakes.md`, with ocx as the worked example stripped
to a mechanism (rule-distillation, Portability).

### Explicitly not in scope

| Excluded | Why |
|---|---|
| NixOS system configuration management (`nixosConfigurations` authoring, `configuration.nix`, `system.nix`) | Operating-system administration, not flake publishing; no consumer (a)-(c) asks for it. |
| home-manager dotfiles and user configuration | Personal environment management; its top issues are file-model feature requests ([fail](nix-topic-map/failure.md)). |
| Deployment tools (deploy-rs, colmena, NixOps, nixos-anywhere) | Operations, not authoring or publishing. |
| Hydra operation | Only nixpkgs runs it; `hydraJobs` appears in 2/37 exemplars ([shape](nix-audit/exemplar-flake-shape.md) §5). |
| Nix daemon administration beyond the CI version floor (M-H-05) | Host administration. |
| Building container images with Nix (`dockerTools.buildImage`, nix2container, nix-snapshotter) | The reverse direction of the ocx goal ([gen](nix-topic-map/generated-flakes.md) §11). |
| NixOS VM integration tests | At most a pointer from `checks` (M-D-12). |
| Guix | Out of scope. |
| Cargo, pyproject and Go module semantics; README and CHANGELOG prose; generic CI shape | Owned by `rust-cargo`, `python-packaging`, `go-modules`, `docs-quality`, and the release material of those sets. |
| Bazel's `rules_nixpkgs` | `bazel-quality` owns Bazel. |

## Selected for wave 2

Three groups, six dives, chosen in the phase-3 order: cross-cutting decisions
first, then uncovered (all but eight rows are), then leverage for (a)-(c), then
areas where agents demonstrably get it wrong, then whether a rule can check it.

**Cross-cutting decisions come first.** `flakes` decides the skeleton and the
output contract every fleet flake, template and generated flake builds on.
`gates` decides the formatter, lint flags and check commands that every other
family's verification cells cite. `generated-flakes` is the brief's concrete
product question, and its answer — whether ghcr.io layers can be fetched at
all — decides the shape of the ocx ADR, so it cannot wait.

**Precondition (orchestrator, before launch).** [map] M1: the wave-1
tool-runs batch (`bash worker.sh …` and its `nix flake show`/`metadata`
children) still holds the single-user store, and `run.sh nix --version` timed
out twice. Let it finish or stop it, confirm `timeout 60 run.sh nix --version`
prints 2.35.2, and expect six dives to serialize on the store: every brief caps
calls at `timeout 300` and forbids `--all-systems` on large exemplars.

**Chase-the-surprise items.** Each is something the frame did not name and
that is load-bearing:

| Surprise | Where it is chased |
|---|---|
| Homebrew's anonymous `Authorization: Bearer QQ==` fetches ghcr.io blobs with plain `fetchurl` (zig-overlay) — may collapse H6 | oci-fetch-prototype |
| An OCI layer digest is already a valid FOD hash — generation never downloads a blob | oci-fetch-prototype |
| nixpkgs 26.11's `'system' has been renamed` warning, traced to `import nixpkgs { inherit system; }` | systems-and-instantiation |
| nixpkgs 26.11 throws on every `x86_64-darwin` attribute; 17/37 exemplars list it | systems-and-instantiation |
| `default = self.packages…` fails `--no-build` by remote ref (alias or `src = self`?) | outputs-contract |
| `nix fmt` with nixfmt formats one file at a time; which `formatter` output formats the tree? | format-and-lint |
| deadnix's 908 `callPackage`-formal false positives | format-and-lint |
| `pure-eval` does not forbid IFD (measured), contra the canonical scout | check-ci-and-impls |
| `nix_2_24` is gone; `nix-installer-action` silently installs Determinate Nix; 2.32 skips substitutable checks | check-ci-and-impls |
| `cli` collides across four namespaces; index packages shadow `cmake`, `ninja`, `node` | index-data-model |
| ocx and grimoire are already packaged in their own index | index-data-model (and wave-3 fleet-builders) |

Every brief ends with the same environment footer. Each proposed check must be
watched red on a planted fixture before it may back a MUST.

### 1. `flakes` — flake structure and outputs (NIX-FLK)

**Dive `systems-and-instantiation`** · family `NIX-FLK` · label "Systems iteration, the nixpkgs instance, and the skeleton every shape starts from"

```text
Decide the flake skeleton every shape starts from: how systems are iterated, which systems are declared, how many nixpkgs instances exist.
Rows: M-A-01..04, M-A-17, M-B-03, M-J-05 (nix-topic-map.md); conflicts 1, 2 and 3 are the direction to confirm or overturn with measurements.
Fetch: ayats.org/blog/no-flake-utils; nixcademy.com/posts/1000-instances-of-flake-utils; zimbatm.com/notes/1000-instances-of-nixpkgs;
github.com/nix-systems/nix-systems; flake.parts/options/flake-parts; github.com/numtide/flake-utils/issues/86; jade.fyi/blog/flakes-arent-real;
nixpkgs doc/release-notes/rl-2611.section.md and rl-2511.section.md, lib/systems/flake-systems.nix, pkgs/top-level/impure.nix (read in the
NixOS__nixpkgs exemplar clone at 9cab9ed8).
Test against: DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45 (56 warnings "'system' has been renamed to/replaced by
'stdenv.hostPlatform.system'"); helix-editor/helix@079a789e8cb0 pkgsFor helper (infinite recursion on packages.x86_64-freebsd.helix);
ipetkov/crane@73b980519cef (zero inputs; library takes pkgs); cachix/devenv@6d76db3889de (four nixpkgs-shaped inputs, 95.6 s cold eval).
Plant in fixtures/systems-and-instantiation/ one flake per variant, each exposing packages.default = hello: flake-utils eachDefaultSystem;
nixpkgs.lib.genAttrs over a literal list with legacyPackages; a nix-systems input; flake-parts perSystem; import nixpkgs with inherit system
inside each output; a reference to pkgs.system; x86_64-darwin in the list against nixos-unstable and against nixos-26.05. Add a consumer
flake taking each variant as an input, with and without follows.
Record per variant: lock node count (jq over .nodes), the consumer's node growth, exit status and first error of nix flake check --no-build
--all-systems, wall time of nix eval .#packages.x86_64-linux --apply builtins.attrNames, and every warning line verbatim.
Chase: the exact expression that emits the 'system' rename warning (import argument, pkgs.system, or stdenv.system) and the warning-free
spelling of one configured import on nixpkgs 26.11 (system vs localSystem vs hostPlatform).
Decide: the default skeleton per shape A, B, C, D, E (verbatim, at most 25 lines each); when flake-parts is justified; the system list and
how it survives the x86_64-darwin drop; the one sanctioned configured-import form; a grep or nix eval check for every rule.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `outputs-contract`** · family `NIX-FLK` · label "Output schema: packages versus overlays, apps, devShells, formatter, checks, and what nix flake check enforces"

```text
Decide the output contract per flake shape and exactly what nix flake check enforces on CppNix 2.35.2.
Rows: M-A-05..15 (nix-topic-map.md); conflicts 4 and 19 are the direction to confirm or overturn.
Fetch: nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check and nix3-flake (self attributes, untracked files);
wiki.nixos.org/wiki/Flakes; nix.dev/tutorials/working-with-local-files; github.com/NixOS/nix/issues/7107;
determinate.systems/blog/flake-schemas; nix-community/fenix README (overlay cache footgun); nixpkgs pkgs/README.md:508-515 in the clone.
Test against: numtide/blueprint@06ee7190:lib/default.nix:143 (non-derivation under checks); DeterminateSystems/flake-checker@cddc8afc:
flake.nix:60 and sxyazi/yazi@0ea4c5d9:flake.nix:51 (default aliased through self.packages; --no-build by github ref fails with "path ... is
not valid"); zed-industries/zed@bda9c0bd43a8:nix/modules/ (outputs invisible to a flake.nix grep); ghostty-org/ghostty@b40acce:flake.nix:127.
Plant in fixtures/outputs-contract/: a non-derivation under packages and under checks; an unknown top-level output; each legacy singular name
(defaultPackage, defaultApp, defaultTemplate, defaultBundler, overlay, devShell, nixosModule); formatter set to a string; a default aliased
through self.packages evaluated as path:, git+file: and a git-archive tarball, and separately src = self, to isolate what breaks --no-build;
an untracked file the build reads; one package.nix exported both as packages (legacyPackages callPackage) and as overlays.default and applied
by a consumer; an overlay that shadows hello; nix run with and without meta.mainProgram, and with an apps output; a devShell using packages
versus buildInputs, with inputsFrom; a schemas output under CppNix.
Record for each: nix flake check --no-build exit status and exact first error line; nix flake show --json keys; the nix run result.
Decide: MUST and SHOULD outputs per shape A-E; the overlay-versus-packages pattern; the default-alias spelling; the untracked-file check;
a hard-versus-soft table with verbatim error strings for nix-diagnose; whether a schemas output is allowed; the devShell attribute rules.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 2. `gates` — what fails the build (NIX-GATE)

**Dive `format-and-lint`** · family `NIX-GATE` · label "Formatter of record, and which lint findings may back a MUST"

```text
Decide the formatter of record, the exact formatter output, and which lint findings may back a MUST.
Rows: M-F-02..07, M-F-19, M-C-03, M-C-13 (nix-topic-map.md); conflicts 5 and 6 are the direction to confirm or overturn.
Fetch: github.com/NixOS/nixfmt README, standard.md, CHANGELOG 1.3.0-1.5.0; RFC 166; nixpkgs doc/release-notes/rl-2511.section.md;
nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-fmt (what a bare nix fmt passes); nixpkgs pkgs/by-name/ni/nixfmt-tree/package.nix;
oppiliappan/statix readme and lib/src/lints/*.rs; astro/deadnix README; nix-community/nixd libnixf/src/Basic/diagnostic.py;
numtide/treefmt-nix README (settings.formatter excludes); cachix/git-hooks.nix modules/hooks.nix.
Baseline: nix-audit/exemplar-tool-runs.md Axis 5 (statix 2230 findings, 1111 without nil; deadnix 1914 with 908 unused lambda patterns;
nixfmt 1358 of 7012 files) and its raw JSON under /home/mherwig/.cache/research-lang/nix-tools/fixtures/tool-runs/.
Measure: hand-classify every statix and deadnix finding (defect, style, false positive) on numtide/treefmt@d68dddf6ac3a,
sxyazi/yazi@0ea4c5d9ef75, Mic92/nixpkgs-review@c8982ae494f6, nix-community/disko@725ea35e410a, hercules-ci/flake-parts@31729ca8cbdb,
DeterminateSystems/nix-installer@76f61b5202e2; run deadnix with and without --no-lambda-pattern-names; report findings per 1,000 lines.
Plant in fixtures/format-and-lint/: a misformatted file; three flakes whose formatter is pkgs.nixfmt, pkgs.nixfmt-tree and a treefmt-nix
wrapper, each run as a bare nix fmt and in check mode, recording files changed and exit status; pkgs.nixfmt-rfc-style referenced (warning or
throw on 26.11?); a callPackage file with an unused formal; an unused let binding; a repeated key; a rec merge; a nixfmt:disable region;
a generated data file that must be excluded.
Decide: the formatter output and the CI check command with its exit contract; deadnix flags and severity; the statix disabled list and
which codes, if any, back a SHOULD; whether nixf-diagnose is in nixpkgs 26.11 and joins the gate; the exclusion globs. Deliver a table:
tool, code, findings per 1,000 lines, false-positive rate, MUST/SHOULD/off.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `check-ci-and-impls`** · family `NIX-GATE` · label "What nix flake check proves, the CI job, the installer and cache of record, and the implementation matrix"

```text
Decide the ordered gate block, what nix flake check proves, the CI job, and the implementation matrix a published flake is tested against.
Rows: M-F-01, M-F-08..18, M-B-07, M-H-05, M-J-01, M-J-04 (nix-topic-map.md); conflicts 11, 12, 14 and 21 are the direction to confirm.
Fetch: nix3-flake-check for 2.35; Nix release notes rl-2.32 and rl-2.35; NixOS/nix issues 4265, 5302, 3872; cachix/install-nix-action README
and releases; DeterminateSystems/nix-installer-action and determinate-nix-action READMEs; magic-nix-cache-action releases;
nix-community/cache-nix-action README; determinate.systems/blog/magic-nix-cache-free-tier-eol; lix.systems/blog/2026-03-25-lix-2.95-release;
goldstein.lol/posts/great-nix-flake-check; DeterminateSystems/flake-checker README; github.com/NixOS/nix/security/advisories.
Test against: nix-audit/exemplar-tool-runs.md Axis 3 failure taxonomy; jj-vcs/jj@f01e70f8e375:.github/workflows/ci.yml:129-144 (the Nix job);
nix-community/nix-index-database@9ad722673ab3 update.yml; nix-community/fenix@5f7e7d793cb2 ci.yml (override-input matrix).
Rerun, sequentially with an idle store, the inconclusive Axis 7: nix flake check --no-build under nixVersions.nix_2_31, the oldest non-stub
nixVersions.nix_2_* and lix from the pinned nixpkgs, against jj-vcs/jj@f01e70f8e375, mitchellh/zig-overlay@95d96b17b711, sxyazi/yazi@0ea4c5d9ef75.
Plant in fixtures/check-ci/: an IFD derivation checked with --no-build and with --option allow-import-from-derivation false, and proof that
pure evaluation alone does not forbid IFD; foreign-system IFD (issue 4265); a package substitutable from cache.nixos.org (does check build
it?); a flake without a root nixpkgs input under flake-checker (exit code and stderr versus a real finding); a Lix-only rejection (a .5
float, a rec merge) that CppNix accepts; a detached shallow checkout like a GitHub Actions PR build (does it read as dirty?).
Decide: the gate block verbatim, in order, with exit semantics; the CI job (installer pinned by SHA, Nix version pin, runners, the cache
choice after the 2025 cache-API break); the --all-systems triage table; required and advisory implementation legs and the floor rule;
flake-checker's role and CEL condition. Emit every verbatim error string you hit, with its cause, for the nix-diagnose skill.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 3. `generated-flakes` — flakes generated from the ocx index (NIX-GEN)

**Dive `oci-fetch-prototype`** · family `NIX-GEN` · label "Fetching ocx layers from ghcr.io into Nix, and a prototype flake that builds three real index packages"

```text
Decide how a Nix fixed-output derivation fetches an ocx layer from ghcr.io, and prove it with a prototype flake that builds three index packages.
Rows: M-E-03, M-E-04, M-E-09..12, M-E-24, M-E-30, M-D-07 (nix-topic-map.md); conflict 16 is the direction to confirm or overturn.
Known (nix-audit/ocx-index-and-fleet.md section 3): bare blob GET is 401; anonymous token from ghcr.io/token, scope repository:ocx-contrib/NS/PKG:pull;
the blob then 307s to a SAS URL on pkg-containers.githubusercontent.com expiring in ~10 minutes; nix-prefetch-url gets 401; layer sha256 = digest.
Fetch: nixpkgs pkgs/build-support/fetchurl/default.nix (curlOptsList), docker/default.nix (pullImage), lib/fetchers.nix, doc/hooks/
autopatchelf.section.md, doc/stdenv/meta.chapter.md; zig-overlay@95d96b17b711 default.nix mkBrewInstall (Homebrew bottles are ghcr.io blobs,
fetched with the header Authorization: Bearer QQ==); OCI distribution-spec pull; /home/mherwig/dev/ocx/website/src/docs/reference/metadata.md
(env, entrypoints, binaries, strip_components) and platforms.md:154-172.
Packages: actionlint/actionlint (static Go, layer sha256:26716a01d50c..., 1.95 MB); ninja-build/ninja (glibc-only on linux/amd64); one package
under 60 MB whose config blob declares env or entrypoints (read the neovim/neovim and kitware/cmake config blobs first).
Try in order, each as an FOD built in the sandbox: (1) nixpkgs fetchurl on ghcr.io/v2/ocx-contrib/NS/PKG/blobs/sha256:HEX with hash = the SRI
of HEX (nix hash convert --hash-algo sha256 --to sri) and curlOptsList carrying the QQ== header; watch it red without the header and confirm
curl does not forward the header to the redirect host; (2) a runCommand FOD with curl, jq and cacert doing the token exchange; (3) skopeo copy
of the manifest digest into an oci: layout (does it accept artifactType application/vnd.sh.ocx.package.v1?).
Build fixtures/oci-fetch-prototype/: a committed data.json, a reader, packages.x86_64-linux.NS-PKG with tar+xz unpack and strip_components,
autoPatchelfHook plus stdenv.cc.cc.lib for glibc, makeWrapper for env, meta.mainProgram from the config blob's binaries, meta.license from the
licenses annotation, sourceProvenance binaryNativeCode; nix run each with --version; nix eval the aarch64-darwin drvPath.
Decide: the fetch mechanism with evidence for every path tried; whether generation needs registry access; the derivation template per libc
class; the meta mapping and the unmapped-license policy; every gap the ocx ADR must request.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `index-data-model`** · family `NIX-GEN` · label "From 125 packages and 1,720 image indexes to a Nix attribute tree: data model, versions, platforms, names, update loop"

```text
Decide how 125 packages and 1,720 image indexes become a Nix attribute tree: data file, versions, platforms, names, and the update loop.
Rows: M-E-01, M-E-02, M-E-05..08, M-E-13..23, M-E-25, M-E-27..29, M-J-06 (nix-topic-map.md); conflicts 17 and 18 are the direction to confirm.
Inputs: /home/mherwig/dev/index (p/NS/PKG.json, p/NS/PKG/o/sha256/*.json, schema/*.schema.json, .claude/rules/product-context.md);
/home/mherwig/dev/ocx/crates/ocx_oci/src/platform.rs:416 (is_compatible and scoring) and website/src/docs/reference/platforms.md:154-172.
Prior art: oxalica/rust-overlay@4e9bb05a9ab6 scripts/fetch.py and manifests/targets.nix; nix-community/fenix@5f7e7d793cb2 data/ and
workflows; stackbuilders/nixpkgs-terraform@a5893ca82ec3 versions.json and lib/default.nix; cachix/nixpkgs-python@4d2bd16c09ba;
numtide/llm-agents.nix@efb10f28f724 lib/mk-updater.nix and lib/platform-source.nix; nix-community/nix-index-database@9ad722673ab3 update.yml;
nix-community/nix-vscode-extensions@329083cd32e0 nix/removed.nix; nixpkgs pkgs/by-name/README.md and pkgs/README.md:433-475 (names, versions).
Measure with jq over the index: basename collisions (cli exists in github, gitlab, grimoire and ocx); index packages that shadow nixpkgs names
(cmake, ninja, node); tags collapsed to digests and a canonical-version rule with its exceptions (x.y.z_YYYYMMDD, corretto build numbers,
jdx/mise timestamps, slim-/server-/client- variants); the platform-to-system mapping under the directed relation (bare versus libc.glibc,
darwin/amd64 under nixpkgs 26.11, Windows-only packages); projected data size for all digests, latest only, and latest per minor.
Build fixtures/index-data-model/: a generator (Python stdlib or jq) that emits the data file for all 125 packages, filling layer digests for
five packages with the anonymous-token curl; a reader exposing packages.SYSTEM.NS-PKG (latest) and legacyPackages.SYSTEM.NS.PKG."VERSION";
time and memory of nix flake show and of nix flake check --no-build --option allow-import-from-derivation false. Also try the eval-time
alternative: the index repository as a flake = false input read with builtins.fromJSON, and record what breaks without layer digests.
Decide: the architecture (committed data, eval-time read, or ocx subcommand emission) and where the generator lives; attribute names and
aliases; the overlay namespace; history policy; the update loop (cadence, token, PR or push, smoke build); yanked and removed entries;
the exact index or ocx changes the ADR must request.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

## Staged for wave 3

Three groups, six dives. Every brief that consumes a wave-2 verdict carries a
**REVISE AFTER WAVE 2** first line; before launch, the orchestrator replaces
that line with the verdict it names and deletes any `Rows:` entry a wave-2
consolidation already settled. `packaging/fleet-builders` has no wave-2
dependency and may launch as soon as the store is free.

| Group | Dive | Revise after wave 2? | Depends on |
|---|---|---|---|
| `inputs` | `follows-and-lock-hygiene` | **yes** | flakes/systems-and-instantiation, gates/check-ci-and-impls |
| `inputs` | `input-types-and-sources` | **yes** | flakes, gates |
| `packaging` | `derivation-conventions` | **yes** | gates/format-and-lint, flakes/outputs-contract |
| `packaging` | `fleet-builders` | no | — |
| `release` | `versioning-and-tags` | **yes** | flakes/outputs-contract, gates/check-ci-and-impls |
| `release` | `publishing-and-consumer-ux` | **yes** | all wave-2 groups |

**Contingency.** If `generated-flakes/oci-fetch-prototype` finds no fetch
path that builds, replace `release/publishing-and-consumer-ux` with
`generated-flakes/fetch-fallback` and push publishing to wave 4:
*"Decide the minimum change to ocx or the index that makes ocx layers fetchable
by a plain Nix FOD (a stable public blob URL, a redirecting mirror under
index.ocx.sh, a resolved projection with layer digests), prototype the chosen
one against a local HTTP server serving actionlint's layer by digest, and draft
the ADR section; rows M-E-03, M-E-29; env footer as above."* The ocx work
stays in wave 3 either way.

### 4. `inputs` — inputs and the lock (NIX-INP)

**Dive `follows-and-lock-hygiene`** · family `NIX-INP` · label "Follows etiquette by consumption, duplicate-nixpkgs detection, lock freshness and updates"

```text
REVISE AFTER WAVE 2: take the skeleton from flakes/systems-and-instantiation and flake-checker's role from gates/check-ci-and-impls.
Decide follows etiquette by how an input is consumed, the duplicate-nixpkgs check, and the lock freshness and update policy.
Rows: M-B-01, M-B-02, M-B-04..06, M-B-12, M-B-14 (nix-topic-map.md); conflict 3 is the direction to confirm or overturn.
Fetch: fzakaria.com/2026/08/31/how-safe-is-follows; zimbatm.com/notes/1000-instances-of-nixpkgs; nix3-flake (follows, lock schema version 7),
nix3-flake-update and nix3-flake-lock for 2.35; NixOS/nix issues 5393, 6036, 8325, 14339; discourse.nixos.org/t/71174;
DeterminateSystems/update-flake-lock README; DeterminateSystems/flake-checker README (CEL condition); cachix/nixpkgs-python README.
Test against: cachix/devenv@6d76db3889de (13 nodes, rolling branch, three flake-checker findings); DeterminateSystems/nix-installer
@76f61b5202e2 (four nixpkgs-shaped nodes); numtide/llm-agents.nix@efb10f28f724 (6 follows, lock 0 days old); numtide/blueprint@8be75245e274
(566 days old).
Plant in fixtures/follows-and-lock-hygiene/: a consumer with three inputs that each carry nixpkgs, with and without follows; count nodes,
time the eval, and compare substitution of an input's package with and without follows (nix build --dry-run); an input that follows itself;
a removed follows line (does the lock restore the dependency's own pin?); nix flake update NAME versus nix flake lock after editing a follows.
Decide: the follows rule per consumed-as (package from the author's cache, library, module, overlay); the jq that lists nixpkgs-shaped nodes
and its exit contract; the branch to track; the freshness bar and the update workflow (action or cron, commit or PR, cadence).
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `input-types-and-sources`** · family `NIX-INP` · label "Input kinds and URL schemes, submodules and LFS, relative paths, monorepos, dirty trees"

```text
REVISE AFTER WAVE 2: reuse the skeleton and the gate block from the wave-2 flakes and gates consolidations.
Decide which input kinds and URL schemes a published flake may use, and how submodules, LFS, relative paths and dirty trees behave.
Rows: M-B-08..11, M-B-16, M-A-16 (nix-topic-map.md).
Fetch: nix3-flake for 2.35 (URL types, flake = false, self.submodules, self.lfs); Nix release notes rl-2.26 (relative path inputs, lock
format), rl-2.27 (self.submodules, lfs), rl-2.33 (shallow, revCount); the tarball-fetcher protocol page; NixOS/nix issues 7422, 10089, 12281,
14762, 12438, 10815, 9885; nixpkgs doc/release-notes/rl-2611.section.md (nixexprs.tar.xz discontinuation); discourse.nixos.org/t/78428.
Test against: helix-editor/helix@079a789e8cb0 (about 100 flake = false tree-sitter inputs, network-bound eval); nix-community/nix-index
@dd6792b23059:flake.nix:5 (indirect registry input); NixOS/nix@209d2bc44288:flake.nix:4 and ghostty-org/ghostty@b40acce58dcf:flake.nix:12
(channel tarballs).
Plant in fixtures/input-types-and-sources/: a repository with a git submodule, evaluated with and without inputs.self.submodules; an
LFS-tracked file with and without inputs.self.lfs (what does the build see?); a monorepo with a path:./sub input whose lock is then read by
the oldest non-stub nixVersions.nix_2_* in the channel; an indirect registry input; a dirty tree (what do nix flake metadata and the lock say?).
Decide: allowed schemes per input kind; the submodule and LFS rule with its version floor; the monorepo pattern; the dirty-tree guidance.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 5. `packaging` — derivations and the fleet's builders (NIX-PKG)

**Dive `derivation-conventions`** · family `NIX-PKG` · label "Derivation conventions: fetchers and hashes, src filtering, meta, phases, finalAttrs"

```text
REVISE AFTER WAVE 2: take formatter and deadnix decisions from gates/format-and-lint and the output contract from flakes/outputs-contract.
Decide the derivation conventions a flake-built package must meet so it is reproducible, reviewable, and upstreamable as a copy.
Rows: M-C-01, M-D-01..06, M-D-08..15, M-D-25, M-D-26 (nix-topic-map.md); conflict 20 is the direction to confirm or overturn.
Fetch: nixpkgs pkgs/README.md (sources, meta, versions, review checklist), CONTRIBUTING.md, pkgs/by-name/README.md, doc/stdenv/*.md,
doc/build-helpers/fetchers.chapter.md (exemplar clone at 9cab9ed8); NixOS/nixpkgs-vet README; jtojnar/nixpkgs-hammering explanations/;
nix.dev/tutorials/working-with-local-files; NixOS/nixpkgs issue 356002; Mic92/nix-update and nix-community/nurl READMEs;
numtide/llm-agents.nix rules/no-legacy-sha256.yml, no-unpinned-rev.yml and prefer-tag-over-rev.yml.
Test against: NixOS/nix@209d2bc44288 (35 finalAttrs files); numtide/llm-agents.nix@efb10f28f724 packages/*/package.nix (inline versions,
rec interpolation); nix-community/home-manager@7b4c5ec4beda (102 hardcoded versions).
Plant in fixtures/derivation-conventions/: src = ./. versus lib.fileset.toSource (touch README, git add, compare nix eval .#default.drvPath);
rec versus finalAttrs with passthru.tests using finalAttrs.finalPackage; an installPhase without runHook; substituteInPlace --replace versus
--replace-fail on a missing string; a legacy sha256 attribute; a short rev; a wrong hash (record the mismatch message); lib.fakeHash; meta
missing each of description, license, mainProgram and platforms; strictDeps with a build tool in buildInputs; __structuredAttrs with a
list-valued env entry.
Decide: the packaging ruleset (MUST/SHOULD/CONSIDER, each with a check); the meta minimum per shape; the fetcher and hash rules; the
hash-acquisition procedure for nix-flake-adopt; a verbatim by-name-ready package.nix skeleton.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `fleet-builders`** · family `NIX-PKG` · label "Building the fleet under Nix: ocx and grimoire (Rust, -sys crates, toolchain pin), the Python SDK, the Action"

```text
Decide how the fleet's own repositories build under Nix: the Rust CLIs ocx and grimoire, the Python SDK, and the GitHub Action.
Rows: M-D-16..19, M-D-23, M-G-16 (nix-topic-map.md).
Known (nix-audit/ocx-index-and-fleet.md section 4): ocx has 17 -sys crates (aws-lc-sys, clang-sys, zstd-sys, liblzma-sys among them) and
grimoire 10 (aws-lc-sys); both pin rust-toolchain.toml channel 1.95.0 and release with cargo-dist; ocx-sdk-python has zero runtime
dependencies and a uv.lock; setup-ocx is bun and TypeScript; ocx and grimoire already ship as prebuilt binaries in the ocx index
(p/ocx/cli.json, p/grimoire/cli.json).
Fetch: nixpkgs doc/languages-frameworks/rust.section.md (buildRustPackage, cargoHash, cargoLock, fetchCargoVendor, bindgenHook);
ipetkov/crane docs; nixpkgs doc/release-notes/rl-2505.section.md; NixOS/nixpkgs issues 525097 and 525262; aws/aws-lc-rs build docs;
nixpkgs doc/languages-frameworks/python.section.md (pyproject = true); pyproject-nix and uv2nix docs.
Chase first: nix eval --raw of the pinned nixpkgs rustc.version against 1.95.0; if lower, which toolchain source (rust-overlay, fenix) works
with buildRustPackage or crane, and does either builder read rust-toolchain.toml?
Build one at a time, copied into fixtures/fleet-builders/ (never in place): grimoire from /home/mherwig/dev/grimoire with buildRustPackage
and cargoLock, recording the first failure and the minimal nativeBuildInputs for aws-lc-sys; the same with crane; cargo tree -i clang-sys in
/home/mherwig/dev/ocx to find who needs libclang; ocx-sdk-python with buildPythonPackage and pyproject = true; nix build --rebuild on each.
Decide: the builder per repository; the hash attribute (cargoHash or cargoLock); the toolchain source; the -sys recipe; whether a from-source
ocx build fits CI time; package.nix templates for nix-flake-adopt; the source build versus a -bin package from the generated flake.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 6. `release` — versioning and publishing (NIX-REL)

**Dive `versioning-and-tags`** · family `NIX-REL` · label "Version strings, self metadata under 2.35, tags and pins, FlakeHub, lock policy at release"

```text
REVISE AFTER WAVE 2: reuse the output contract from flakes/outputs-contract and the gate block from gates/check-ci-and-impls.
Decide the version string of a flake-built package, the tag and pin syntax consumers use, the FlakeHub stance, and the lock policy at release.
Rows: M-G-01..05, M-G-11, M-G-14, M-G-15 (nix-topic-map.md); conflicts 8 and 9 are the direction to confirm or overturn.
Fetch: nix3-flake for 2.35 (flake references with refs and tags, self attributes); Nix release notes rl-2.33 and rl-2.35 (revCount, lazy
source copies); nixpkgs pkgs/README.md:467-475; docs.determinate.systems/flakehub/concepts/semver and /flakehub/best-practices;
github.com/imTHAI/nix-packages (the July 2026 rolling-release invisibility case); DeterminateSystems/flakehub-push README; RFC 136.
Test against: nix-audit/exemplar-flake-shape.md section 10 tag table; Mic92/nixpkgs-review@c8982ae494f6 (bare semver tags);
nix-community/nix-index-database@9ad722673ab3 (timestamp tags); ipetkov/crane@73b980519cef (flakehub-push workflow);
sxyazi/yazi@0ea4c5d9ef75 (version read with fromTOML).
Plant in fixtures/versioning-and-tags/: a Rust workspace flake reading its version with lib.importTOML, including workspace.package
inheritance; evaluate self.rev, shortRev, dirtyRev, dirtyShortRev, lastModified, lastModifiedDate and revCount for a clean tagged commit, a
dirty tree, path:, git+file: and a git-archive tarball; show drvPath churn per commit with the revision in version versus in an env var;
pin the flake by a tag ref from a consumer.
Decide: the version rule (manifest source, revision placement, snapshot suffix); the tag format and consumer pin syntax; FlakeHub yes or no,
and if yes how; the lock policy around a release; the compatibility-promise wording while flakes stay experimental.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `publishing-and-consumer-ux`** · family `NIX-REL` · label "Install instructions, non-flake users, output deprecation, binary caches, nixpkgs upstreaming, and the adopt/release procedures"

```text
REVISE AFTER WAVE 2: take output and gate decisions from the wave-2 consolidations; this dive also drafts the adopt and release procedures.
Decide install instructions, non-flake support, output deprecation, binary-cache publishing, and the nixpkgs upstreaming path.
Rows: M-G-06..10, M-G-12, M-A-18, M-K-01, M-K-02, M-K-05 (nix-topic-map.md); conflicts 10 and 13 are the direction to confirm or overturn.
Fetch: NixOS/flake-compat and nix-community/flake-compat READMEs; nix.dev/concepts/flakes and guides/recipes/dependency-management (npins);
nixpkgs lib/modules.nix and lib/derivations.nix (warnOnInstantiate); nix-community/nix-index-database flake.nix (lib.warn on hmModules);
nixpkgs CONTRIBUTING.md (commit convention, merge bot, by-name); nix-community.github.io/nixpkgs-update; nix.dev guides/recipes/
add-binary-cache; the Cachix open-source plan terms.
Test against: nix-audit/exemplar-flake-shape.md sections 8 and 10 (three flake-compat sources; 20 README install hints unclassified,
classify them from the clones).
Plant in fixtures/publishing-and-consumer-ux/: a default.nix from each flake-compat source, evaluated with nix-build and nix-shell on 2.35;
an output renamed with lib.warn and a package wrapped with warnOnInstantiate (does the warning fire on nix flake show, nix build, nix flake
check?); a README install block run verbatim from a clean store (nix run, nix profile add, a flake-input snippet).
Decide: the README install template; the non-flake rule and its source; the deprecation mechanism per output kind; the binary-cache
stance; the upstreaming readiness checklist; the numbered procedures for nix-flake-adopt and nix-flake-release, each step citing a row.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

## Staged for wave 4

Three groups, four dives. The two language briefs consume wave-2 and wave-3
verdicts (**REVISE AFTER WAVE 3**); security and modules do not and may launch
early if a slot opens.

| Group | Dive | Revise? | Depends on |
|---|---|---|---|
| `language` | `idioms-and-scope` | **yes, after wave 3** | gates/format-and-lint, packaging/derivation-conventions |
| `language` | `evaluation-failures` | **yes, after wave 3** | every dive's recorded error strings |
| `security` | `trust-boundaries` | no | — |
| `modules` | `module-authoring` | no | — |

### 7. `language` — the Nix language (NIX-LANG)

**Dive `idioms-and-scope`** · family `NIX-LANG` · label "Idioms generated Nix gets wrong: with, rec, //, paths and string context, impure builtins"

```text
REVISE AFTER WAVE 3: take lint severities from gates/format-and-lint and the rec/finalAttrs verdict from packaging/derivation-conventions.
Decide which Nix language idioms generated code gets wrong, and the rule plus check for each.
Rows: M-C-02, M-C-04..07, M-C-10, M-C-14 (nix-topic-map.md); conflict 20 is the direction to confirm or overturn.
Fetch: nix.dev/guides/best-practices (anti-patterns); nix.dev/manual/nix/2.35/language/ (string context, types, lookup paths, builtins);
nix-community/nixd libnixf/src/Basic/diagnostic.py (sema-extra-with, deprecated-url-literal); Nix release notes rl-2.23 (builtins.warn)
and rl-2.34 (lint-url-literals); nixpkgs lib/trivial.nix (warn) and lib/attrsets.nix (recursiveUpdate) in the exemplar clone.
Measure over the exemplars, excluding test_data and fixture directories: with at file scope versus list scope; the operator // on nested
sets; path interpolation into strings; <nixpkgs>, currentSystem and getEnv outside default.nix and shell.nix compat shims.
Plant in fixtures/idioms-and-scope/: each idiom as a bad and a good twin; a path interpolated into a string (does nix eval show a store
path, and is the directory copied?); string context lost through unsafeDiscardStringContext; builtins.warn under abort-on-warn.
Decide: the language ruleset (MUST/SHOULD/CONSIDER, each with a check and its measured frequency).
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

**Dive `evaluation-failures`** · family `NIX-LANG` · label "Localizing evaluation failures, Lix divergence, and the verbatim error catalog for nix-diagnose"

```text
REVISE AFTER WAVE 3: merge the verbatim error strings recorded by every wave-2 and wave-3 dive before planting new ones.
Decide how an agent localizes an evaluation failure, and assemble the verbatim error catalog the nix-diagnose skill reads.
Rows: M-C-08, M-C-09, M-C-12, M-K-03 (nix-topic-map.md).
Fetch: NixOS/nixpkgs PR 370967 and issue 550879 (module error contexts, check-meta recursion); lix.systems/blog/2026-03-25-lix-2.95-release;
nix-community/nixd libnixf/src/Basic/diagnostic.py; NixOS/nix issues 3872 (cached evaluation errors) and 8013 (flake through a symlink).
Test against: helix-editor/helix@079a789e8cb0 (its own pkgsFor recursion); nix-community/nixd@77bb1cacfa8a (recursion inside nixpkgs
cpython/default.nix:472); nix-audit/exemplar-tool-runs.md smells 3 and 4.
Plant in fixtures/evaluation-failures/: an overlay reading final where prev is required; imports computed from config; a per-system helper
that recurses on an unsupported system; an undefined variable reached only when forced; each Lix 2.95 rejection evaluated under CppNix and
under lix from the pinned nixpkgs; a stale eval-cache error after the fix; an unfree package refused; a platform-unavailable dependency.
Decide: the localization procedure (show-trace, eval-cache off, nix repl, nixf-diagnose); the catalog as rows of error string, cause, first
command, fix, rule ID — at least 25 rows, each reproduced on a fixture.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 8. `security` — trust boundaries (NIX-SEC)

**Dive `trust-boundaries`** · family `NIX-SEC` · label "nixConfig, accept-flake-config, tokens, secrets in the store, and evaluating untrusted flakes"

```text
Decide the trust boundaries of a published flake and of an agent evaluating one: nixConfig, tokens, secrets, substituters, daemons.
Rows: M-H-01..04, M-H-06..09 (nix-topic-map.md); conflict 7 is the direction to confirm or overturn.
Fetch: nix.dev/manual/nix/2.35/command-ref/conf-file (accept-flake-config, access-tokens, trusted-users, trusted-substituters); nix3-flake
(nixConfig); NixOS/nix issues 9649, 6752, 9788; github.com/NixOS/nix/security/advisories (GHSA-g3g9-5vj6-r3gj, GHSA-6fjr-mq49-mm2c);
wiki.nixos.org/wiki/Flakes (secrets); NixOS/nixpkgs PR 300028 (the xz response); DeterminateSystems/flake-checker README (check-owner).
Test against: the 11 nixConfig-bearing exemplars in nix-audit/exemplar-flake-shape.md section 6; nix-audit/exemplar-tool-runs.md headline
(the untrusted-setting warning on every run).
Plant in fixtures/trust-boundaries/: a flake whose nixConfig carries extra-substituters, a post-build-hook and allow-import-from-derivation,
evaluated as the untrusted single user with and without accept-flake-config (record prompts, warnings and effects); the allowlist check
nix eval --impure --json --expr over (import ./flake.nix).nixConfig; a secret read with builtins.readFile that lands in the store (show the
world-readable path); access-tokens supplied through NIX_CONFIG versus a committed nix.conf.
Decide: the nixConfig allowlist and its severity; the accept-flake-config rule; token and secret placement; the safe flags for evaluating
an untrusted flake; daemon version floors for CI and self-hosted builders.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

### 9. `modules` — modules a flake exports (NIX-MOD)

**Dive `module-authoring`** · family `NIX-MOD` · label "Writing the NixOS, home-manager, nix-darwin and flake-parts modules a flake exports"

```text
Decide how a flake that exports NixOS, home-manager, nix-darwin or flake-parts modules writes them so consumers can compose them.
Rows: M-I-01..06, M-I-08 (nix-topic-map.md).
Fetch: nixos.org/manual/nixos/unstable (Writing NixOS Modules, Option Types, Extensible Option Types); nix.dev/tutorials/module-system/
deep-dive; RFC 42 (rfcs/0042-config-option.md); nixpkgs lib/modules.nix (mkRenamedOptionModule, mkRemovedOptionModule, mkAliasOptionModule,
mkChangedOptionModule) and lib/options.nix (mkPackageOption); flake.parts module-authoring docs.
Test against: Mic92/sops-nix@2bd00bd9bb35, nix-community/disko@725ea35e410a and nix-community/home-manager@7b4c5ec4beda modules: how they take
pkgs, and whether any reads the flake's own nixpkgs or indexes self.packages by pkgs.system.
Plant in fixtures/module-authoring/: a module with mkOption, mkEnableOption, mkPackageOption and a settings option through pkgs.formats.json;
a module indexing self.packages by pkgs.system (does it hit the nixpkgs 26.11 system-rename warning?); each deprecation helper evaluated;
a secret path option typed with types.pathWith and inStore = false.
Decide: the module ruleset for published flakes; the pkgs-source rule; the settings pattern; the deprecation mechanism; whether modules.md
ships or its surviving rows fold into flakes.md.
Env: Nix only via /home/mherwig/.cache/research-lang/nix-tools/run.sh (CppNix 2.35.2, nixpkgs 26.11pre 8d5d2709, nixfmt 1.5.0, deadnix 1.3.2,
flake-checker 0.2.15, statix, nixd, nil, nix-update, nurl, treefmt, skopeo, jq), each call under timeout 300; one heavy eval at a time, the
store is shared. Fixtures under /home/mherwig/.cache/research-lang/nix-tools/fixtures/ (never /tmp), git init -q and git add -A before eval;
exemplars read-only under ~/.cache/research-lang/exemplars/nix/ (SHAs in nix-fetch.log); pipe grep/find through rtk proxy. Every check runs
verbatim (directory operand, one -e per alternative, xargs -r, no placeholders), goes red on the bad twin and green on the good, and states
what empty output means and the versions it was measured on.
```

## Deferred

**18 of the 172 rows are deferred: no wave 2-4 brief names them.** The other
154 are each named in exactly one brief's `Rows:` line.

### Ready to author from wave-1 evidence — no dive needed (5 rows)

| M-IDs | Why no dive |
|---|---|
| M-J-02, M-J-03 | House conventions `*-CORE-01..03`, copied from the sibling indexes. |
| M-J-07 | An authoring decision already made in the Artifact set decision (routing table), backed by [map] M5. |
| M-E-26 | Settled: nix2container, nix-snapshotter and nixhub/devbox solve the reverse problem ([gen](nix-topic-map/generated-flakes.md) §11-12). |
| M-K-04 | The generated flake's update procedure belongs to the ocx handoff's update loop (M-E-13), not to a lore skill. |

### Genuinely deferred (13 rows)

| M-IDs | Why, and what would promote it |
|---|---|
| M-B-13 | Lix's follows removal is a proposal. Promote when Lix ships `flake.lick`. |
| M-B-15 | Thousands of inputs. Promote only if a generated flake ever takes packages as inputs (conflict 17 says it will not). |
| M-C-11 | Legacy `let` and `toPath`: 1 and 4 corpus hits; statix's default set already flags them. Promote if a wave finds them in generated code. |
| M-C-15 | Cross-system eval determinism. Promote if the check-ci taxonomy finds a host-dependent evaluation. |
| M-D-20 | Go builders: no fleet Go CLI; `go-modules` owns the Go side. Promote when a fleet Go CLI ships a flake. |
| M-D-21 | bun/TypeScript Action devShell. Promote if setup-ocx adopts a flake. |
| M-D-22 | Cross-compilation. Promote when a fleet artifact needs a non-native target from Nix (native runners cover today's systems). |
| M-D-24 | `SOURCE_DATE_EPOCH` for local sources. Promote if a reproducibility check fails on it. |
| M-F-20 | nixd versus nil. Promote if the adopt skill needs an editor default. |
| M-G-13 | CHANGELOG entries: `docs-quality` owns them. |
| M-H-10 | `ca-derivations`/`recursive-nix`: experimental features no consumer enables. |
| M-I-07 | Extensible option types: P3 module detail. |
| M-K-06 | A Nix review skill. Revisit once the rule families exist; no language set has one yet. |

## Questions for the owner

Each default applies if there is no answer before the wave-2 consolidations
are authored.

1. **FlakeHub.** Publish fleet flakes to FlakeHub? **Default:** no — releases
   are the existing `vX.Y.Z` git tags on GitHub; fleet flakes never take
   FlakeHub URLs as inputs (conflict 9).
2. **Public binary cache for fleet flakes.** **Default:** none in v1. CI uses
   a GitHub-Actions-backed store cache; READMEs say `nix run` builds from
   source and point at the generated flake's prebuilt package for a fast path
   (conflicts 7, 12).
3. **Upstreaming fleet CLIs to nixpkgs.** **Default:** write every
   `package.nix` by-name-ready now; propose `ocx` and `grim` to nixpkgs after
   each CLI's first stable release, outside this program (conflict 13).
4. **Home and ownership of the generated flake.** **Default:** a new repository
   `ocx-sh/ocx-nix`, generated by CI from `ocx-sh/index`; the generator is an
   `ocx` subcommand; the ADR confirms (conflict 17).
5. **Scope of the generated set.** **Default:** every package and every
   distinct digest (history kept, never pruned) until the data file passes
   20 MB, then a rolling window; `packages` carries latest only (M-E-15,
   conflict 18).
6. **Implementation promise.** **Default:** CppNix is supported and gated; Lix
   is an advisory CI leg; Determinate Nix is untested but must not be broken by
   anything the flake does (conflict 11).
7. **Exported modules.** Does any fleet flake plan to export a NixOS or
   home-manager module (e.g. `programs.ocx`)? **Default:** none planned; wave 4
   researches module authoring at low priority, and `modules.md` ships only if
   its rows pass selection.
8. **Minimum Nix for consumers.** **Default:** the oldest non-stub
   `nixVersions.nix_2_*` in the pinned nixpkgs — today 2.31, the version
   nixpkgs 26.11's own throw message recommends — and no flake feature newer
   than that floor without a README note (conflict 11,
   [runs](nix-audit/exemplar-tool-runs.md) Axis 7).

## Explicitly not a defect

An agent or a reviewer would flag each of these. The evidence says leave them
alone.

**Checker limitations, not flake defects:**
- **flake-checker crashing** on flakes with no root `nixpkgs` input
  (nix-index, flake-parts, flake-utils) or an empty lock (crane)
  ([runs](nix-audit/exemplar-tool-runs.md) Axis 4).
- **`nix flake check --no-build` failing with `path '…' is not valid`** on
  IFD (cabal2nix: cachix, devenv) or on a self-referencing default evaluated by
  remote ref (flake-checker, yazi) ([runs](nix-audit/exemplar-tool-runs.md)
  smell 3).
- **`--all-systems` failures caused by nixpkgs**: the x86_64-darwin throw,
  `iproute2` unavailable on a platform (jj), recursion inside nixpkgs'
  `cpython/default.nix:472` (nixd), GHC unable to bootstrap on `armv6l` (nil)
  ([runs](nix-audit/exemplar-tool-runs.md) smell 4).
- **nil's statix W00 and deadnix parse errors**: its own malformed parser
  fixtures under `crates/syntax/test_data/` ([runs](nix-audit/exemplar-tool-runs.md) Axis 5).
- **NixOS/templates having no `flake.lock`**: templates ship lockless by
  design.

**Style and idiom:**
- **`rec` for `pname`/`version` interpolation** in package files
  (llm-agents.nix): permitted by nixpkgs ([shape](nix-audit/exemplar-flake-shape.md) §4).
- **Hardcoded `version` literals in per-package files** that `nix-update`
  must edit inline (llm-agents.nix's 107): the nix-update contract
  ([gen](nix-topic-map/generated-flakes.md) §10).
- **`import nixpkgs` inside test or example fixtures** (crane's `examples/`)
  ([shape](nix-audit/exemplar-flake-shape.md) §4).
- **`with import <nixpkgs>` in `default.nix`/`shell.nix` compat shims and
  NixOS VM tests** (7 files, [shape](nix-audit/exemplar-flake-shape.md) §4, §8).
- **alejandra-formatted repositories failing `nixfmt --check`** (jj, ghostty,
  zig-overlay): the declared formatter working as intended
  ([runs](nix-audit/exemplar-tool-runs.md) Axis 5).
- **deadnix's unused `callPackage` formals**: intentional formal arguments
  ([cod](nix-topic-map/codified.md) §2).
- **`overrideAttrs` in a downstream or generated flake**: nixpkgs' ban is
  in-tree only ([cod](nix-topic-map/codified.md) §11).
- **flake-utils in an existing flake**: it works; migration is a SHOULD
  (conflict 1).

**Inputs, versions and trust:**
- **nixpkgs-terraform's three nixpkgs pins**: deliberate, one per
  Terraform version range ([shape](nix-audit/exemplar-flake-shape.md) §2).
- **nix-index-database's 288 timestamp tags**: one bot release per database
  refresh, not versioning chaos ([shape](nix-audit/exemplar-flake-shape.md) §10).
- **A `nixConfig` naming only the project's own substituter and key**: ignored
  for untrusted users, not an exploit by itself (conflict 7).
- **x86_64-darwin in a flake pinned to nixos-26.05**: still supported until
  end-2026 (M-A-02).
- **No Windows leg in Nix CI**: Nix does not run natively on Windows
  ([shape](nix-audit/exemplar-flake-shape.md) §9).
- **`magic-nix-cache-action` at ≥v11**: revived and maintained
  ([shift](nix-topic-map/shifts.md) §9).
- **typst having dropped its flake** ([frame](nix-frame.md),
  [shape](nix-audit/exemplar-flake-shape.md) headline).

**The ocx index:**
- **A bare and a `+libc.glibc` manifest for the same (os, arch)**: ocx's
  intentional scoring (`platforms.md:154-172`), not duplicate data
  ([ocx](nix-audit/ocx-index-and-fleet.md) §1.7).
- **An empty `variants` field in every root**: schema-ready, not broken
  ([ocx](nix-audit/ocx-index-and-fleet.md) §1.6).
- **setup-ocx as a Nix packaging target**: it is CI glue; a devShell at most
  ([ocx](nix-audit/ocx-index-and-fleet.md) §4).
- **`stdenv.lib` and `cargoSha256`**: extinct in the corpus (0 hits); a grep
  (Q8) is enough, no investigation ([shape](nix-audit/exemplar-flake-shape.md) headline).

## Frame corrections

Every premise of [frame](nix-frame.md) that the audits, the scouts or the
map-time measurements overturned or sharpened. Append verbatim.

**Hypotheses:**
- **H1 narrowed.** `stdenv.lib` and `cargoSha256` occur 0 times in 37 repos; the surviving dated idioms are `with pkgs;` (175 in 24 repos), `rec {` (1,264, mostly legitimate interpolation) and hardcoded versions (259) ([shape](nix-audit/exemplar-flake-shape.md) §4, Contradictions).
- **H1's "1000 instances" is not exemplar-scale** (worst: crane, 10 files, all under `examples/`) ([shape](nix-audit/exemplar-flake-shape.md) §4) **but the idiom is live-harmful**: 56/56 nixpkgs 26.11 `'system' has been renamed` warnings trace to `import nixpkgs { inherit system; }`, and devenv's four instances cost a 95.6 s cold eval ([runs](nix-audit/exemplar-tool-runs.md) headline, Axis 6).
- **H2 confirmed and qualified.** Duplicate nixpkgs nodes in 3/37 locks; `follows` is not universally correct — nixpkgs-python forbids overriding its nixpkgs, and following time-travels an input onto an untested nixpkgs ([shape](nix-audit/exemplar-flake-shape.md) §2, [gen](nix-topic-map/generated-flakes.md) §8, [prac](nix-topic-map/practitioner.md) §11).
- **H3 corrected.** 27/36 lack a `formatter` (true) but `checks` exist in 21/37 (not missing for most); only 14/37 CIs run `nix flake check`; home-system check passes 14/20, `--all-systems` 8/20, and only 2/20 failures are the flake author's defects ([runs](nix-audit/exemplar-tool-runs.md) Axis 3, 5; [shape](nix-audit/exemplar-flake-shape.md) §5, §9).
- **H4 partly contradicted.** FlakeHub is also consumed as an input source (3 repos); tag practice has no convention (10/37 never tagged); FlakeHub rolling releases become invisible after any tag ≥0.2.0 ([shape](nix-audit/exemplar-flake-shape.md) §2, §10; [gen](nix-topic-map/generated-flakes.md) §12).
- **H5 confirmed and refined.** Three data architectures plus llm-agents.nix's inline per-package files; `nix-update` cannot drive JSON-backed data ([shape](nix-audit/exemplar-flake-shape.md) §11, [gen](nix-topic-map/generated-flakes.md) §10).
- **H6 confirmed and sharpened.** The token is one anonymous GET; the real obstacle is a 307 to a SAS URL expiring in ~10 minutes; `nix-prefetch-url` gets 401 ([ocx](nix-audit/ocx-index-and-fleet.md) §3). Untested escape: nixpkgs `fetchurl` with Homebrew's anonymous `Bearer QQ==` header ([gen](nix-topic-map/generated-flakes.md) §1). The layer digest is itself a valid FOD hash.
- **H7 half confirmed.** Static half confirmed (actionlint, no `PT_INTERP`); the dynamic-glibc half is unprobed; 19/125 packages' latest linux/amd64 offer is glibc-only ([ocx](nix-audit/ocx-index-and-fleet.md) §3f, [map] M4).
- **H8 confirmed live and extended**: the untrusted-setting warning fires on every invocation, and `accept-flake-config` grants root-equivalent execution (NixOS/nix#9649) — **but contested in practice**: 11/37 exemplars and 3/8 generators ship `nixConfig` ([runs](nix-audit/exemplar-tool-runs.md) headline, [fail](nix-topic-map/failure.md), [shape](nix-audit/exemplar-flake-shape.md) §6, [gen](nix-topic-map/generated-flakes.md)).
- **H9 confirmed; its test plan is stale.** `nixVersions.nix_2_24` is a removed-stub in nixpkgs 26.11 (use `nix_2_31`); `nix-installer-action` installs Determinate Nix by default; Lix 2.95 rejects code CppNix accepts ([runs](nix-audit/exemplar-tool-runs.md) Axis 7, [shift](nix-topic-map/shifts.md) §7, §10).

**New findings the frame did not name:**
- **nixpkgs 26.11 unstable dropped x86_64-darwin** and throws on any attribute under it (`lib/trivial.nix:1003`, `rl-2611.section.md:43-49`); 17/37 exemplars list the system ([shape](nix-audit/exemplar-flake-shape.md) Contradictions, [runs](nix-audit/exemplar-tool-runs.md) headline).
- **`pure-eval` does not forbid IFD** (devenv builds during `nix eval` of its flake), contra the canonical scout; `allow-import-from-derivation` defaults to true ([runs](nix-audit/exemplar-tool-runs.md) Axis 6, conflict 14).
- **`nix flake check` skips substitutable derivations since Nix 2.32** ([shift](nix-topic-map/shifts.md) §1).
- **ocx and grimoire are already packaged in the ocx index**, and the basename `cli` collides across four namespaces ([map] M3).

**Era facts:**
- **`nixfmt-rfc-style` became `nixfmt` in nixpkgs 25.11** (the tool's docs followed in 1.3.0); `nixpkgs-fmt` is archived (2024-07-24) ([shift](nix-topic-map/shifts.md) §5, §11; [cod](nix-topic-map/codified.md) §6).
- **flake-checker 0.2.15's supported-branch list** covers only the 26.05 and unstable branches (the README still lists 25.11) ([runs](nix-audit/exemplar-tool-runs.md) Axis 4).
- **flake-utils is stalled** (last commit 2024-11-13, issue #86) ([shift](nix-topic-map/shifts.md) §12).

**The ocx data:**
- **1,720 stored image indexes, not 2,011** ([ocx](nix-audit/ocx-index-and-fleet.md) §1.2); the `variants` field is populated in 0/125 roots (§1.6); no `mainProgram`-like key exists at the index layer and 7.4% of indexes carry no license (§1.8).

**Artifact set:**
- **`nix-generated-flakes` is a depth file plus an ocx handoff, not a skill;** the skills are `nix-flake-adopt`, `nix-flake-release`, `nix-diagnose`.
- **The glob list adds `**/statix.toml`** (Nix-only by construction); `.envrc`, workflow files and `treefmt.toml` are routed, never globbed ([map] M5).
- **Depth files split inputs, packaging and security out of the frame's single `nix-quality` scope**, with NIX-MOD conditional.

**Measurement environment:**
- **The wave-1 tool-runs batch is still running** and contends for the single-user store; `run.sh nix --version` timed out at 60 s twice during the map ([map] M1). Parallel dives serialize on the store.

## Wave 2 landed (2026-09-27)

Phase 6 harvest of wave 2 (three groups, six dives, three consolidations).
Source keys added for this section: **[flk]** = [nix-flakes.md](nix-flakes.md),
**[gate]** = [nix-gates.md](nix-gates.md), **[gen]** =
[nix-generated-flakes.md](nix-generated-flakes.md); dive files are linked by
path. Nothing above this heading was edited; where this section contradicts an
earlier one, this section wins and says so.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| `flakes` | [nix-flakes.md](nix-flakes.md) | 18 (NIX-FLK-01..18) | 11 (01, 02, 03, 04 new code, 07, 08, 09, 12, 13, 15, 16) | 8 | 6: nix-installer's 56 warnings; builders × cold-store reads; Lix output table; smallest module check; devShells under `nix develop`; monorepo sub-flakes |
| `gates` | [nix-gates.md](nix-gates.md) | 16 (NIX-GATE-01..16) | 10 (01, 02, 03, 04, 05, 08, 09, 10, 12, 13) | 14 | 4: ci-live on real runners; eval budget (M-F-18); adopt V15 into NIX-FLK; stale-lock guard for run.sh |
| `generated-flakes` | [nix-generated-flakes.md](nix-generated-flakes.md) | 18 (NIX-GEN-01..18) | 15 (01..15) | 11 | 4: Darwin prebuilt binaries (M-E-10); env/entrypoints/deps (M-E-11); scale at 1,293 versions; wedged shared store |
| **Total** | 3 files | **52** | **36** | 33 | 14 |

Every consolidation re-ran its dives' verifications itself: the dives had run
almost nothing (outputs-contract 0, format-and-lint 0, check-ci-and-impls 1;
the systems dive ran on nix-portable's Nix 2.20.6, not 2.35.2). [flk] re-ran
both batteries on 2.35.2 and 2.31.5, [gate] ran V1-V22, and [gen] ran its
rows in a private store at the same nixpkgs revision.

### (b) Surprises, one verdict each

Numbered in receipt order. **fold** = absorbed into an existing rule or brief (named). **promote** = a next-wave or rerun commission. **defer** = kept in the backlog under an M-ID. **reject** = not a finding, with the reason.

- **S1** A minimal `import nixpkgs { inherit system; }` emits zero rename warnings; reading `pkgs.system` (`pkgs/top-level/aliases.nix:2498`) is the trigger. **Fold → NIX-FLK-12**, re-confirmed on 2.35.2 (3 vs 0, [flk] conflict 2). The residue is which expression in nix-installer emits its 56 warnings. **Promote → packaging/fleet-builders** (does crane or rustPlatform read `pkgs.system`?).
- **S2, S11, S17, S19, S28, S35** "Store contention". **Reject as a research finding.** It was an environment fault: a stale SQLite dotfile lock ([gate] header) plus nix-portable's launcher forcing `use-sqlite-wal = false` (orchestrator fix, 2026-09-27). Blocked verifications are unfinished work → rerun wave (g).
- **S3** `nix-systems/default` still lists `x86_64-darwin`. **Fold → NIX-FLK-08**, which narrows map conflict 1.
- **S4** nixos-26.05 prints a "last release to support x86_64-darwin" warning. **Fold → NIX-FLK-09.** Dated re-check at 26.05 end of life (end-2026).
- **S5** A relative `path:../sibling` input fails across separate git repositories, measured on 2.20.6 only. **Promote → inputs/input-types-and-sources** (M-A-16, M-B-10): re-measure on 2.35.2 and on the 2.31.5 floor.
- **S6** flake-parts costs about 10× per eval. **Reject:** on 2.35.2 it is 0.171 s vs 0.062 s CPU ([flk] conflict 5). NIX-FLK-10 rests on lock nodes and opacity instead.
- **S7** `nixosModules` is not shape-checked (`checkModule` = `forceValue`). **Fold → NIX-FLK-06.** The smallest module-evaluating check → staged wave-4 modules/module-authoring (owner Q7 default: no fleet modules).
- **S8** `formatter` must be a derivation although the manual omits it. **Fold → NIX-FLK-01** (watched red).
- **S9** `checkApp` never checks `type == "app"`. **Reject as a rule:** agents write `type = "app"` anyway, so no diff changes. It becomes a note in the nix-diagnose catalogue.
- **S10** The `FIXME: check meta attributes` in `flake.cc:419`. **Fold → NIX-FLK-15** (`nix run` proof).
- **S12** flake-checker's and yazi's failures share one mechanism, which the dive attributed to lazy copies. **Fold, mechanism corrected → NIX-FLK-07:** an eval-time read through the flake's own source store path, red on 2.31.5 too, so not lazy copies.
- **S13** statix W20 is a false-positive class. **Reject as a defect class:** W20 targets dotted paths by design, and a literal duplicate key is a hard eval error (V10). **Fold →** NIX-GATE-06's disabled list.
- **S14** statix W10 fires on flake-parts' `{ ... }:`. **Fold → NIX-GATE-06** (`empty_pattern` disabled).
- **S15** deadnix's formal-argument false positives also appear in flake-parts module arguments. **Fold → NIX-GATE-05** (`-L`).
- **S16** git-hooks.nix live master exposes 7 Nix hooks; the rfc-style and classic hooks are gone. **Fold → NIX-GATE-03**, whose grep covers hook names. Dated re-check.
- **S18** statix W04 has no false positives. **Defer M-C-03 (P3):** real is not a defect, it is style, and NIX-GATE-06 disables it.
- **S20** nix-index-database's CI already runs `--all-systems --no-build`. **Fold → NIX-GATE-09** (Applied) **and NIX-GEN-15** (necessary, never sufficient).
- **S21** fenix runs an `--override-input nixpkgs …nixpkgs-unstable` CI leg. **Promote → inputs/follows-and-lock-hygiene** (M-B-14): SHOULD or CONSIDER.
- **S22** jj uses `fetch-depth: 0` against #5302. **Reject as a rule:** V22 shows a shallow detached clone is not dirty on 2.35.2. M-F-15 is settled with no checkout rule.
- **S23** flake-checker's README lists branches that its binary rejects. **Fold → NIX-GATE-11** (the binary wins). Dated re-check.
- **S24** Lix freezes flakes and moves them into a plugin (2.95). **Fold → NIX-GATE-16** (the leg stays non-blocking). Dated re-check at the next Lix release.
- **S25** `Authorization: Bearer QQ==` works for any public ghcr.io org. **Fold → NIX-GEN-08** (sandboxed red/green). **Dated re-check:** this is observed behaviour, not a documented contract.
- **S26** Generation takes two registry hops per (package, platform). **Fold → NIX-GEN-05.**
- **S27** env differs per platform (cmake `PATH`). **Fold → NIX-GEN-05.** Translating the other env kinds (M-E-11) → **promote into the generated-flakes rerun**, as prototype completion.
- **S29** cmake has no `libstdc++` NEEDED entry while ninja does. **Fold → NIX-GEN-11** (hook plus `cc.lib` on every Linux package).
- **S30** cmake declares five binaries. **Fold → NIX-GEN-13**, which forces contradiction E6 below.
- **S31** 79-83% of index basenames shadow nixpkgs names. **Fold → NIX-GEN-07** (MUST). It is a map scale correction (d).
- **S32** Only `cli` collides inside the index. **Fold → NIX-GEN-06** (`<ns>-<pkg>`), confirming map M3.
- **S33** All digests come to about 2.1 MiB. **Fold → NIX-GEN-17.** Owner Q5's default holds.
- **S34** The eval-time reader breaks because the manifest fetch cannot be an FOD, so it gets no network. **Fold → NIX-GEN-01** (watched: builder exit 6).
- **S36** A live anonymous probe of five packages worked. **Fold → NIX-GEN-04** evidence.

### (c) Map rows affected

**Settled by a wave-2 rule.** Each row cites the rule ID that now answers it:
- **A:** M-A-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12, 13, 15 and 17 → NIX-FLK-01..17.
  - M-A-10 is answered: the cause is an eval-time read, not the alias (NIX-FLK-07).
  - M-A-14 and M-A-18 take owner defaults ([flk] Open questions).
- **F:** M-F-01 (the gate block), M-F-02..10, M-F-11, M-F-14, M-F-15 (V22: no rule), M-F-16 and M-F-17 → NIX-GATE-01..16.
- **Other families:**
  - M-B-07 → NIX-GATE-11.
  - M-C-03 is style (deferred, S18).
  - M-J-01 and M-J-04 → the [gate] block, plus Q17.
- **E:** M-E-01..09, 12, 13, 15..18, 21, 22, 24, 25, 27, 28 and 30 → NIX-GEN-01..17.
  - M-E-19 is settled: no cache, no `nixConfig`.
  - M-E-20 and M-E-29 become ADR items (defaults in [gen]).

**Partially settled; the residue is commissioned:**
- M-A-11 (devShell rule verified? devenv vs nix-direnv) → flakes rerun.
- M-B-03 (`nixpkgs-lib` or nothing for B) → inputs/follows-and-lock-hygiene.
- M-C-09 (V19 found one real Lix rejection; the float is a warning only) → flakes rerun (Lix output table), then wave-4 language.
- M-C-13 (W20 is style; `//` over `rec` is unrun: `format-and-lint/lint-cases/rec-merge.nix`) → wave-4 language/idioms-and-scope.
- M-E-11 (only `PATH` was prototyped) → generated-flakes rerun.
- M-E-14 (NIX-GEN-18 waits on `status`) → residue.
- M-F-12 and M-F-13 (cache and runners unmeasured on real runners; GATE-14 and GATE-15 stay SHOULD) → residue.
- M-F-18 (eval budget) → inputs/input-types-and-sources (helix, nix-installer) and generated-flakes rerun (D scale).
- M-F-19 (7 hooks) → settled by S16.
- M-H-05 (GATE-16's floor 2.31.5 sits above the 2.31.4 patch) → staged wave-4 security confirms.
- M-J-05 (the shape bindings in [flk] Verdict 9) → authoring.
- M-J-06 (NIX-GEN-17's deterministic data) → authoring.

**Map checks retired or replaced:**
- **Q4** → NIX-FLK-12's `--all-systems` warning count.
- **Q6** → NIX-FLK-16's `git ls-files --others --exclude-standard .`
- **Q7** → a per-shape check: mainProgram unconditional for A (NIX-FLK-15), conditional for D (NIX-GEN-13); packaging/derivation-conventions writes it.
- **Q11** → gains `--fail` and the NIX-GATE-04 excludes.
- **Q18** is retired: the digest is used verbatim (NIX-GEN-09).
- **Q19** gains `magic-nix-cache-action@v[0-9]\b` (NIX-GATE-13).
- **Q20** → NIX-GEN-07's pure `--apply` form.
- **Q1** stands in its `.nodes` form ([flk] conflict 3).
- **Q5** stands as the gate's IFD step (NIX-GATE-08).

**Earlier map text now wrong:**
- **Conflict 2**'s "whichever argument spelling emits no warning": the spelling is not a lint target (NIX-FLK-12).
- **Conflict 4**'s overlay spelling `final: prev:` → `final: _prev:` (NIX-FLK-02, because of deadnix).
- **Conflict 5**'s "attribute `pkgs.nixfmt`" as the formatter output → `pkgs.nixfmt-tree` (NIX-GATE-01). `pkgs.nixfmt` stays the tool's name.
- **Conflict 6**'s deadnix SHOULD → MUST (NIX-GATE-05). Its statix candidates → only W12 and W17.
- **Conflict 12**'s cache choice → cache-nix-action v7 (NIX-GATE-14, not runner-measured).
- **Conflict 16**'s transport ladder → `fetchurl` plus QQ== settled (NIX-GEN-08).
- **Conflict 18** is confirmed with no extra `ocx` level in `legacyPackages` (NIX-GEN-06).
- **"Explicitly not a defect", bullet 2:** the remote-ref `path '…' is not valid` on a "self-referencing default" is **not** an alias limitation. It is NIX-FLK-07's eval-time read, an author defect; see E1.
- **M-E-08**'s "cmake, ninja, node": understated by an order of magnitude (S31).

**New rows discovered:** none. Every wave-2 finding landed on an existing row. The new material is two failure classes, C3 and C7 in (f).

### (d) Frame corrections

- **H1, corrected again.** The 56 `'system' has been renamed` warnings do **not** trace to `import nixpkgs { inherit system; }`. A minimal import emits none; the trigger is a `pkgs.system` read ([flk] conflict 2; NIX-FLK-12). The frame correction appended after wave 1 (frame line 176) and map point 9's use of it are wrong on this point. What nix-installer reads is still open (packaging/fleet-builders).
- **H1, "1000 instances".** No warning or error was measured at fixture scale. Demoted to SHOULD (NIX-FLK-11).
- **H6, settled.** Plain nixpkgs `fetchurl` with `Authorization: Bearer QQ==` fetches any public ghcr.io blob in the sandbox; the no-header twin gives 401. `hash` is the layer digest verbatim; no SRI conversion, because Lix 2.95.2 lacks `builtins.convertHash` (NIX-GEN-08, NIX-GEN-09).
- **H7, refined.** "Bare" does not mean static, because libc tagging drifts. `autoPatchelfHook` on a static ELF is a measured no-op, so every Linux package gets it (NIX-GEN-11).
- **H9, sharpened.**
  - The Lix leg caught a real divergence (rec/non-rec merge, V19); `.5` floats only warn.
  - Lix flakes are frozen and moving into a plugin.
  - The non-stub floor set in 26.11pre is `nix_2_31`, `nix_2_34`, `nix_2_35`; `nix_2_30` also throws (V20).
- **New: `--no-build` depends on store state.** It passes an IFD flake on a warm store and fails it cold (V13). The same holds for eval-time reads through the source store path (NIX-FLK-07) and for FOD transport changes without `--rebuild` ([gen] failure mode 2).
- **New:** `nix flake check` does not shape-check `nixosModules` (NIX-FLK-06). A literal duplicate attribute is already a hard eval error (V10).
- **ocx data.** 96 of 122 basenames exist in nixpkgs `pkgs/by-name`, 101 of 122 with the legacy tree (S31). All digests on all platforms come to about 2.1 MiB. 231 of 1,720 license annotations are SPDX expressions (NIX-GEN-14). `p/ocx/cli` and `p/grimoire/cli` carry no license annotation.
- **Era.**
  - `nixfmt-classic` throws on 26.11pre (converted 2026-07-01), and `nixfmt-rfc-style` is a `warnAlias`.
  - nixfmt 1.5.0's directory mode is deprecated but still works.
  - statix in nixpkgs builds from the molybdenumsoftware fork.
  - `nixf-diagnose` 0.1.4 is in 26.11pre.
  - install-nix-action v31.11.1 hardcodes Nix 2.35.2.
  - cache-nix-action is at v7.
- **Measurement environment, superseding the frame's last correction and map M1.**
  - The "contention" in waves 1 and 2 was a stale SQLite dotfile lock plus WAL forced off by the nix-portable launcher.
  - `run.sh` now enters the store through bwrap with WAL on, and ten parallel builds were measured to succeed (orchestrator).
  - Dives no longer need to serialize. A hang is an environment fault to report, not a wait.

### (e) Cross-consolidation contradictions

Every ruleset on disk was read against every other ruleset. The drafters keep the named ID's text and edit the other to cite it.

- **E1. NIX-FLK-07 vs NIX-GATE-09 triage row and [gate] Verdict 5, on `path '/nix/store/…-source' is not valid`.**
  - [gate] calls it "a checker limit, not a defect; run the gate from the checkout".
  - [flk] isolated the cause with twins. Alias-only and self-source-without-read fixtures are green on four ref schemes. `read-via-storepath` is red **from the local checkout** on a cold store, on 2.35.2 and on 2.31.5. yazi, the case behind V15, carries exactly that read (`nix/yazi-unwrapped.nix:32`).
  - **Resolution:** it is an author defect with a known fix, surfaced by `--no-build` on a cold store. **NIX-FLK-07 keeps the text.** GATE-09's row reads "eval-time read through the flake's own source store path (NIX-FLK-07); author's fix: read the source-tree path". [gate] Verdict 5's "checker limit" applies to IFD only (NIX-GATE-08). Map "Explicitly not a defect" bullet 2 is withdrawn for this case.
- **E2. NIX-FLK-02 vs map conflict 4, and the NIX-GEN template's overlay spelling.** `final: prev:` with an unused `prev` fails NIX-GATE-05. **NIX-FLK-02 keeps the text** (`final: _prev:`). NIX-GEN-07 cites it, and the generator emits `final: _prev:`.
- **E3. NIX-FLK-17 vs NIX-GATE-01 (formatter).** They overlap, with no conflict in substance. FLK-17 keeps "expose `formatter` and `checks`" (SHOULD, A/D/E). GATE-01 keeps the formatter *package* (`nixfmt-tree`, MUST once declared). The fleet-wide "MUST declare" in [gate] Applied is a project commitment and goes in the adopt skill, not in the portable rule.
- **E4. NIX-GATE-10 ("build every package the flake defines", MUST for A and D) vs NIX-GEN-15 (smoke-build each changed package) and [gate] Applied ("a sampled subset… owned by NIX-GEN").** Building 1,293 versions per push is not what D needs. **Resolution:** GATE-10 applies to A as written. For D, **NIX-GEN-15 keeps the text**: every package whose data changed is built and executed on the update PR. GATE-10 gets a one-line D clause citing GEN-15.
- **E5. NIX-GATE-15 (an Apple-silicon runner when `aarch64-darwin` is declared) vs [gen]'s default (export `aarch64-darwin`, evaluated in CI but not built, marked in the README).** GATE-15 is a SHOULD, and [gen] states the reason: there is no Darwin smoke leg until M-E-10 is answered. **GATE-15 keeps the text**, and D's deviation is recorded in the generated-flakes depth file as the stated reason.
- **E6. NIX-FLK-15 (MUST hardcode `meta.mainProgram` for every runnable package; its Applied row says the generator "must derive and verify one") vs NIX-GEN-13 (set it only for exactly one binary; never guess).**
  - kitware/cmake has five peer binaries (S30), and `pkgs/README.md:508-515` backs GEN-13.
  - **Resolution:** NIX-GEN-13 keeps the D text. NIX-FLK-15 keeps the A text and adds one exception clause: "a prebuilt package with several peer binaries and no main one omits it (NIX-GEN-13); `nix run` of it is not promised". [flk]'s Applied note "derive and verify one" is superseded.
- **E7. NIX-FLK-13 (one `package.nix` per derivation; drvPath equality through `.extend overlays.default`) vs NIX-GEN-07 (the overlay adds only `ocx`) and the D builder shape.** D satisfies FLK-13 through one shared builder file called per data entry. Its equality check compares `packages.<sys>.<ns>-<pkg>` with `(… .extend overlays.default).ocx.<ns>.<pkg>`. **FLK-13 keeps the rule**, and the D depth file states the D attribute path.
- **E8. The gate block (step 4, Q5 with `allow-import-from-derivation false`) vs [flk] Check 1 (`nix flake check --no-build --no-write-lock-file .`).** These are the same check twice. **The [gate] block is canonical** and lives in the index; FLK rows cite "gate step 4". `--no-write-lock-file` is added only when checking someone else's flake (NIX-SEC, wave 4).
- **E9. Map Q7 (unconditional `.mainProgram`), Q18 (SRI conversion) and Q20 (`getFlake --impure`) vs NIX-GEN-13, 09 and 07.** The GEN rules win and the map checks are retired (c). This is recorded so no drafter copies a Q-check.
- **No conflict found** in these pairs:
  - FLK-08 or FLK-09 vs GEN-04 or GATE-15: the same system set, three angles.
  - GATE-11 vs GEN's root `nixpkgs`.
  - GATE-16 vs GEN-09: Lix is the reason for "no `convertHash`".
  - FLK-12 vs GEN.
  - GATE-04 vs GEN-17: `data.json` is not `.nix`, so nixfmt never touches it; the exclude matters only for generated `.nix`.

### (f) Convergence

**Failure classes.** Every failure mode in the three consolidations is listed once below, grouped by mechanism. Each class names the check that catches it. "New" means no wave-1 row or conflict named the mechanism.

- **C1. Checker-contract shape violation.** A value is not the kind the output demands.
  - Instances: non-derivation under `packages`, `checks`, `devShells` or `formatter`; `self: super:` or formal-argument overlays; extra keys in `apps` or `templates`; versions nested under `packages` ([flk] failure modes 2 and 6, [gen] 5).
  - Check: gate step 4 (`nix flake check --no-build`).
  - Known (M-A-05).
- **C2. Hidden default scope.** A helper's implicit list or merge brings in untested territory.
  - Instances: flake-utils, `flakeExposed` and `nix-systems/default` add systems; a flat overlay merges generated names into `pkgs` ([flk] 1, [gen] 4).
  - Checks: `--all-systems` (gate step 5) plus the NIX-FLK-08 grep; NIX-GEN-07's jq.
  - Known (M-A-01, M-A-02, M-E-08).
- **C3. The result depends on store state: a warm store masks a cold failure.**
  - Instances: `--no-build` as an IFD ban (V13); an eval-time read through the flake's own source store path, green on a warm laptop and red on CI (NIX-FLK-07); an FOD transport change invisible until `--rebuild` ([gen] 2); `nix flake check` skipping substitutable derivations (GATE-10).
  - Checks: `--option allow-import-from-derivation false`, a cold-runner `--no-build`, `nix build --rebuild` on changed FODs, an explicit `nix build`.
  - **New this wave.** Wave 1 had the instances only as isolated era facts or as checker limits.
- **C4. A green gate that does not exercise the property.**
  - Instances: `nix run` never checked (NIX-FLK-15); modules only forced (NIX-FLK-06); FOD hashes never realised by `--no-build` (NIX-GEN-15); deadnix without `--fail` and flake-checker exiting 0 on findings (GATE-05, GATE-11); CI running `nix flake check` alone ([gate] 1).
  - Check: an exercising step, such as `nix run -- --version`, the smoke build, `--fail` or `--fail-mode`, or a module eval.
  - Known (M-A-08, M-E-27, M-B-07, M-F-10). New instances only.
- **C5. The source set differs from the working tree.**
  - Instances: an untracked or ignored file is silently absent (NIX-FLK-16); `path:../sibling` resolves against the store copy (S5).
  - Check: `git ls-files --others --exclude-standard .`
  - Known (M-A-09, M-A-16).
- **C6. Era drift: a renamed, removed or deprecated name.**
  - Instances: `nixfmt-rfc-style`, `nixfmt-classic`, `nixpkgs-fmt`; `pkgs.system`; the seven singular outputs; `nix_2_24`/`nix_2_30`; magic-nix-cache below v11; x86_64-darwin on 26.11.
  - Checks: Q10, the NIX-FLK-12 count, the NIX-FLK-04 count, the V20 floor expression, the Q19 grep.
  - Known (H1, shifts).
- **C7. A misattributed diagnostic: the error names a symptom far from its cause, and agents (and this map) blame the nearest expression.**
  - Instances: the alias blamed for NIX-FLK-07's read; the `import` spelling blamed for `pkgs.system`; a wrong digest expected to give "hash mismatch" but giving 404 (NIX-GEN-15); statix W20 read as a shadowing bug; an untracked file surfacing as a downstream build error.
  - Check: isolate on planted twins before writing the fix, and match the verbatim catalogue (nix-diagnose; wave-4 language/evaluation-failures).
  - **New this wave.** The map itself committed two instances (the M-A-04 and M-A-10 framings).
- **C8. A floating reference.**
  - Instances: `@main` or `@vN` actions; an installer that is Determinate by default; a Nix version implied by the action SHA.
  - Checks: the NIX-GATE-12 grep, Q19, `install_url` reading.
  - Known (M-F-11, M-F-17).
- **C9. A tool mode that does not do what its name implies.**
  - Instances: bare `nix fmt` with nixfmt reads stdin; nixfmt directory mode; deadnix without `-L`, and `--edit` deleting formals; nixf-diagnose exiting 1 on an unused `self`.
  - Check: a planted misformatted or dead-code fixture, followed by `git status --porcelain`.
  - Known (M-F-02, M-F-04).
- **C10. Cross-implementation divergence.**
  - Instances: Lix rejecting rec/non-rec merges; `builtins.convertHash` missing in Lix.
  - Checks: the Lix leg (GATE-16) and `builtins ? convertHash`.
  - Known (H9, M-C-09).
- **C11. The sandbox and network boundary.**
  - Instances: an eval-time fetch is a non-FOD with no network; a header-less ghcr.io fetch gets 401; IFD.
  - Checks: Q5 and a sandboxed `--rebuild`.
  - Known (conflicts 14, 16, 17).
- **C12. Prebuilt runtime linkage.**
  - Instances: a missing ELF interpreter; libc tag drift; Darwin `install_name` (untested).
  - Checks: the smoke run and `readelf` for the interpreter.
  - Known (M-E-09, M-E-10).
- **C13. Consumer-visible evaluation noise and metadata loss.**
  - Instances: SPDX-expression license warnings on every eval; a guessed `mainProgram`; missing `sourceProvenance`; one platform's env copied onto another.
  - Checks: `--option abort-on-warn true` over `meta`, the `sourceProvenance` filter, per-platform config fetches.
  - Known (M-A-04, M-E-11, M-E-12). The `abort-on-warn` check itself is new.
- **C14. A second source of truth that drifts.**
  - Instances: two derivation bodies; an SRI copy next to the digest; a second platform relation; tags walked as versions.
  - Checks: drvPath equality (FLK-13), store once (GEN-09), the generator grep (GEN-02), the digest count (GEN-03).
  - Known (M-A-07, M-E-18, M-E-06).
- **C15. A credential or URL boundary.**
  - Instances: a committed SAS URL; `--location-trusted`.
  - Check: the NIX-GEN-10 grep.
  - Known (M-E-30).
- **C16. A style lint treated as a defect.**
  - Instances: statix W20, W10 and W04; nixf warnings.
  - Check: the `statix.toml` disabled list, then `nix eval` on the file.
  - Known (conflict 6).

**Result.** Wave 2 added **36 new MUST rules**, **two new failure classes (C3, C7)**, and opened only 3 of 9 families. NIX-INP, NIX-PKG, NIX-REL, NIX-LANG, NIX-SEC and conditional NIX-MOD have no consolidation. By the wave-plan stop condition, the program has **not converged**.

**MUSTs resting on a verification that has not been watched red** (flagged for the reviser and the drafters):
- **NIX-GEN-02, 04, 05**: MUST by reading heuristic, because the generator they bind does not exist yet ([gen] E-block). NIX-GEN-04 is measured live, not planted.
- **NIX-GEN-13**: green only; no red twin was planted.

Every other MUST in the three files was watched red and green by its consolidation. None of the 36 rests on a run the dives recorded as NOT RUN.

**Open questions, classified.** Every question in the three "Open questions" sections, plus the dated items:

- **Answerable now, and load-bearing → commissioned in (g):**
  - nix-installer's 56 warnings and FLK-12's blind spot → packaging/fleet-builders.
  - builders × cold-store reads → packaging/fleet-builders.
  - the Lix output table → flakes rerun.
  - devShells under `nix develop` → flakes rerun.
  - monorepo and sibling relative paths → inputs/input-types-and-sources.
  - the eval budget → input-types-and-sources plus the generated-flakes rerun.
  - env/entrypoints/deps (M-E-11) → generated-flakes rerun.
  - scale at 1,293 versions → generated-flakes rerun.
  - the flake-checker CEL condition → inputs/follows-and-lock-hygiene.
- **Answerable now, but low priority by owner default → staged wave 4:** the smallest module-evaluating check (Q7: no fleet modules).
- **Closed by this wave:**
  - Adopting V15 into NIX-FLK: done, NIX-FLK-07 ([flk] conflict 1), refined by E1.
  - The run.sh stale-lock guard: done by the orchestrator (bwrap, WAL on).
  - The wedged shared store: same fix.
- **A measurement the corpus cannot supply:**
  - gates/ci-live (cache restore speed within the 10 GB cap; arm64 and macOS runners within budget). This needs real GitHub runners on a repository the owner provides. GATE-14 and GATE-15 stay SHOULD.
  - Prebuilt Darwin binaries needing `install_name_tool` or `codesign` (M-E-10). This needs an aarch64-darwin builder, and the host is WSL. Default: eval-only Darwin with a README mark.
- **Owner decisions (default applied):**
  - The fleet system list: x86_64-linux, aarch64-linux, aarch64-darwin.
  - Export `overlays.default`: yes.
  - `apps` for `ocx-shim`: no.
  - `templates.default`: no.
  - When is a flake the wrong tool: every fleet repo except setup-ocx.
  - Q2: no public cache.
  - Q6: CppNix gated, Lix and floor advisory.
  - An allowlist of accepted `--all-systems` reds: no.
  - A missing license: omit it, and the ADR asks the index to require it.
  - Signature verification: reviewed-PR updates until M-E-20.
  - The Darwin claim: eval-only.
  - musl: drop.
  - A resolved projection: an ADR request.
  - The generated flake's home: Q4, `ocx-sh/ocx-nix`.
- **Dated re-checks** (recorded with their date and rechecked at authoring or release):
  - QQ== anonymous pull (2026-09-27).
  - x86_64-darwin on 26.05 until its end of life (end-2026).
  - flake-checker's supported branches (0.2.15).
  - magic-nix-cache v15 revival status.
  - nixfmt directory mode "unsupported soon" (1.5.0).
  - Lix's flakes plugin extraction (2.95).
  - install-nix-action's implied Nix version (v31.11.1 → 2.35.2).
  - The computed floor (`nix_2_31` today).
  - git-hooks.nix's hook list (live master 2026-09-27).

### (g) Next wave

**Wave 3 (next_wave): the staged wave-3 set, revised, with the promoted follow-ups folded in.** That makes six dives in three groups, all new families, so no revision contends with them. Cross-cutting first:

1. **inputs/follows-and-lock-hygiene** (NIX-INP). Follows by consumed-as, Q1's exit contract, lock freshness plus the flake-checker CEL condition (left open by map conflict 21), and fenix's unstable override leg (S21). It also covers following a generated-flake input: does only the wrapper rebuild? P0 rows M-B-01, 02 and 06, with no consolidation yet.
2. **inputs/input-types-and-sources** (NIX-INP). Schemes, submodules, LFS, dirty trees and the monorepo pattern. Adds S5 (sibling `path:` on 2.35.2 and 2.31.5) and M-F-18's eval budget (network-bound vs hang, measured on helix and nix-installer).
3. **packaging/derivation-conventions** (NIX-PKG). The package.nix conventions. It inherits GATE-01/02/05/06 and FLK-07/13/15, and must write the per-shape meta check that replaces Q7 (E6, E9).
4. **packaging/fleet-builders** (NIX-PKG). Builds ocx, grim and the SDK. Adds the two NIX-FLK seams: each builder's cold `--no-build`-safe spelling (FLK-07), and the `pkgs.system` warning source in crane or rustPlatform, traced with `abort-on-warn` plus `--show-trace` (FLK-12). Nothing fleet-facing can be written without it.
5. **release/versioning-and-tags** (NIX-REL). Versions from the manifest, `self` metadata, tags and the lock around a release. Adds the rule that `importTOML` reads `./Cargo.toml`, never through `src` (FLK-07), and that the compatibility-promise floor is GATE-16's computed floor.
6. **release/publishing-and-consumer-ux** (NIX-REL). Install blocks, flake-compat, deprecation mechanics (FLK-04's `builtins.warn` shim, GEN-18's `lib.warn`), the cache stance (Q2) and upstreaming. It drafts the nix-flake-adopt and nix-flake-release procedures citing rule IDs from all three wave-2 consolidations.

**Rerun wave (rerun_wave): one dive per group whose NOT RUN verifications no run has closed.**
- **flakes/verification-rerun-w2.** outputs-contract's unrun rows:
  - `devshell-{packages,buildinputs,inputsfrom}`, which decide FLK-18's verified form plus devenv vs nix-direnv (M-A-11).
  - `run-apps-output`.
  - `package-both` producer/consumer.
  - candidate 9 (`show --json` vs grep).
  - the `.checks` half of FLK-17.
  - battery1 under Lix 2.95.2 and nix_2_31 (the implementation table).
- **generated-flakes/verification-rerun-w2.** index-data-model's #4, #6 (the 125-package compliant flake, which doubles as the scale measurement) and #7. It also covers:
  - a red twin for GEN-13;
  - GEN-17's `cmp`;
  - the prototype built cold with `--rebuild` for actionlint, ninja and cmake, plus Darwin eval;
  - M-E-11's env and dependency translation on amazon/corretto;
  - copying the prototype into `nix-generated-flakes/prototype/` (handoff part 1).
- **gates: no rerun dive.** V1-V22 ran every check-ci-and-impls and format-and-lint verification except `format-and-lint/lint-cases/rec-merge.nix` (`//` over `rec`, M-C-13). That is a NIX-LANG question, carried into wave-4 language/idioms-and-scope below.

**Amendments to the staged wave-4 briefs** (append-only; applied when wave 4 is revised):
- **language/idioms-and-scope:**
  - evaluate `fixtures/nix-gates/format-and-lint/lint-cases/rec-merge.nix` against its twin;
  - adopt `--option abort-on-warn true` as the general consumer-noise check (C13, M-C-14);
  - add `lint-url-literals fatal` (V11b) as the native W12.
- **language/evaluation-failures:**
  - seed the catalogue from the verbatim strings in [flk] (battery logs), [gate] V1-V22 and [gen] (401, 404, builder exit 6, hash-mismatch drift, `abort-on-warn` license error);
  - add a "misattributed diagnostics" section for class C7;
  - add the E1 row.
- **security/trust-boundaries:**
  - test `nix-vscode-extensions/flake.nix:46-50` (`extra-trusted-substituters`, `hydra.iohk.io`) and `llm-agents.nix/flake.nix:3-7` (`allow-import-from-derivation` in `nixConfig`) against conflict 7's allowlist ([gen] Applied);
  - reconcile the CVE-2026-39860 floor with GATE-16's computed floor (2.31.5).
- **modules/module-authoring:** the smallest `checks` entry that evaluates `nixosModules.default`. `nixosModules.default = 42` passes `nix flake check` (NIX-FLK-06, S7).

**Environment footer for every wave-3 and wave-4 brief (replaces "one heavy eval at a time, the store is shared").** `run.sh` now enters the store through bwrap with SQLite WAL on, and parallel dives are fine. If `timeout 60 run.sh nix --version` fails, the dive writes ENVIRONMENT FAULT as its artifact's first line and stops its Nix work; it never parks a verification as "blocked by contention". Every `--no-build` or fetcher result states whether the store was cold or warm, and FODs are rebuilt with `--rebuild` (class C3).

**Verdict: needs another round.**

## Wave 3 landed (2026-09-27)

Phase 6 harvest of wave 3 (three new groups, six dives, three consolidations)
and of the two wave-2 verification reruns that landed beside it (each folded
into a revision of its consolidation). Source keys added for this section:
**[inp]** = [nix-inputs.md](nix-inputs.md), **[pkg]** =
[nix-packaging.md](nix-packaging.md), **[rel]** = [nix-release.md](nix-release.md);
**[flk]**, **[gate]**, **[gen]** as in the wave-2 section. Dive files are linked
by path. Nothing above this heading was edited; where this section contradicts
an earlier one, this section wins and says so.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| `inputs` (new) | [nix-inputs.md](nix-inputs.md) | 12 (NIX-INP-01..12) | 4 (04, 05, 07, 09) | 9 | 5: eval-budget watchdog; lazy fetch of unaccessed lock nodes (decides INP-02's severity); #14339 on a floating ref; `self.lfs` over HTTPS plus 2.31.5 and Lix; Lix follows tracking |
| `packaging` (new) | [nix-packaging.md](nix-packaging.md) | 18 (NIX-PKG-01..18) | 11 (02, 03, 04, 05, 07, 08, 09, 11, 12, 13, 15) | 11 | 4: ocx source build with timings; darwin and aarch64 `-sys` builds; Python library export; `self.submodules` fetched remotely |
| `release` (new) | [nix-release.md](nix-release.md) | 16 (NIX-REL-01..16) | 6 (01, 02, 06, 07, 11, 16) | 10 | 4: nix-update hash write-back; implementation matrix for REL-05/09/16; vergen and `SOURCE_DATE_EPOCH`; FlakeHub rolling (only if Q1 flips) |
| `flakes` (revision: rerun-w2 folded) | [nix-flakes.md](nix-flakes.md) | 19 (+ FLK-19) | 12 (+ FLK-19) | 14 in total, 6 new (9-14) | 5, of which 4 are now closed (see (f)) |
| `generated-flakes` (two revisions: rerun-w2, then its consolidation) | [nix-generated-flakes.md](nix-generated-flakes.md) | 20 (+ GEN-19, GEN-20) | 17 (+ GEN-19, GEN-20) | 8 in the second revision | 3 (Darwin prebuilt; entrypoints; token grammar) |
| `gates` (unchanged since wave 2) | [nix-gates.md](nix-gates.md) | 16 | 10 | — | — |
| **Total on disk** | 6 files | **101** | **60** | | |

Wave 3 added **21 new MUST rules**; the wave-2 reruns added **3** (NIX-FLK-19,
NIX-GEN-19, NIX-GEN-20). Every wave-3 dive and consolidation ran through
`run.sh` with WAL on and none recorded contention. Exactly one verification was
blocked by the environment: nix-update's hash write-back inside nested bwrap
(`error (ignored): filesystem error: cannot rename: Permission denied`,
[versioning-and-tags](nix-release/versioning-and-tags.md) §7). Every other
NOT RUN row was a budget or scope choice; all are listed in (f) and commissioned
in (g).

### (b) Surprises, one verdict each

**fold** = absorbed into a named rule. **promote** = a next-wave or rerun
commission. **defer** = backlog under an M-ID. **reject** = not a finding, with
the reason. T-numbers follow the wave-3 receipt; U-numbers the wave-2 reruns.

*inputs/follows-and-lock-hygiene*
- **T1** #5393's self-follow segfault is gone on 2.35.2. **Fold → NIX-INP-08** ([inp] conflict 3: clean `follow cycle detected` on 2.31.5 and 2.35.2, `stack overflow` on Lix 2.95.2). Map M-B-12's "live guard" is corrected (c). Lix: dated re-check.
- **T2** #14339 bites only when the dependency's own input floats. **Fold → NIX-INP-03, 08.** The floating case was read from the issue, never re-derived → **promote → inputs/verification-rerun-w3** item 2.
- **T3** Plain `nix flake lock` keeps a stale `narHash` for an edited `path:` input. **Fold → NIX-INP-07** (MUST). Class C9.
- **T4** flake-checker 0.2.15's binary list is stricter than its README (third confirmation). **Fold → NIX-INP-06, NIX-GATE-11.** Dated re-check at every flake-checker bump.
- **T5** Three byte-identical nixpkgs pins give 4 lock nodes: the lock never dedups by content. **Fold → NIX-INP-01** (Q1-transitive).
- **T6** The first FOD-plus-wrapper fixture was a false positive (`pkgs.hello.src` changed because hello's version changed). **Reject as a finding**; it is a class C22 instance. The corrected result (the layer FOD's `outPath` is invariant under follows) folds into [inp] Verdict 9 and [gen] Applied.

*inputs/input-types-and-sources*
- **T7** helix's "~100 tree-sitter inputs" are 303 eval-time `builtins.fetchTree` calls. **Fold → NIX-INP-10**; map M-B-08 is reframed (c). Class C11, plus C7 (the cost was blamed on inputs).
- **T8** The cross-repo `path:../` error text changed between 2.20.6 and 2.31.5. **Fold →** [inp] AI failure mode 9. **New class C20** (diagnostic drift) → **promote → language/evaluation-failures** (the catalogue is keyed by input shape and version, never by string alone).
- **T9** Nix's LFS client speaks only HTTP(S) batch; a `file://` mirror fails distinctly. **Fold → NIX-INP-09.** The HTTPS half is unrun → **promote → inputs rerun** item 3.
- **T10** `nixConfig.warn-dirty = false` is inert without `accept-flake-config`. **Fold →** [inp] failure mode 10 and the NIX-SEC allowlist (security dive cites it). **New class C19** instance.
- **T11** An indirect nixpkgs input locks to a `releases.nixos.org` tarball. **Fold → NIX-INP-05** (read `locked.type`).
- **T12** Monorepo layering is unsettled community practice. **Reject as a rule topic:** no fleet repository is a monorepo of flakes; same-tree `path:./sub` is allowed (NIX-INP-04) and nothing else needs deciding. M-A-16 closes.

*packaging/fleet-builders*
- **T13** flake-checker's red is the `builtins.path { path = self; }` read, not crane. **Fold → NIX-PKG-15, NIX-FLK-07** (confirms map E1).
- **T14** grimoire's submodules are empty under the default fetch and break even a local `nix build .`. **Fold → NIX-INP-09**, [pkg] Verdict 5 (P12: CppNix says `not tracked by Git` locally; Lix needs `flake-self-attrs`). The remote fetch is unrun → **promote → inputs rerun** item 4.
- **T15** A retracted "rustc 1.98 breaks grimoire" came from `rsync --exclude=catalog`. **Reject as a finding**; class C22; [pkg] failure mode 12 carries the check.
- **T16** aws-lc-sys built without a `cmake` binary although the `cmake` crate compiled. **Promote → packaging rerun** item 4: it decides whether NIX-PKG-17's "pkg-config only" is target-independent.
- **T17** `clang-sys` is in ocx's lock but inactive on the host. **Fold → NIX-PKG-17** (`cargo tree --target all -i`). Class C19 (presence read as requirement).
- **T18** Explicit `cargoToml`/`cargoLock` over `cleanCargoSource ./.` changes nothing. **Fold → NIX-PKG-15**'s accepted crane spelling; no rule.

*packaging/derivation-conventions*
- **T19** A read through a `lib.fileset.toSource` path looked cold-safe. **Reject:** [pkg] conflict 3 re-ran it red by tarball and locally (P10); the dive's cold run was a content-identical store hit. Class C3 and C22. NIX-FLK-07 stands without exemption.
- **T20** A 7-hex short rev built. **Fold → NIX-PKG-02** after [pkg] conflict 1: the "full" baseline was 39 hex and every build was a store hit; the grep, watched red, is the gate. Class C22.
- **T21** `lib.fakeHash` is the all-`A` SRI literal. **Fold → NIX-PKG-03.**
- **T22** `__structuredAttrs` does not loosen `env`'s types. **Fold → NIX-PKG-10.**
- **T23** Legacy `sha256 =` still builds on 26.11pre. **Fold → NIX-PKG-01**, demoted to SHOULD.
- **T24** Bare `--replace` still exits 0 on no match. **Fold → NIX-PKG-12.** Dated re-check of nixpkgs#356002.

*release/versioning-and-tags*
- **T25** `nix eval --json` collapses any attrset carrying `outPath` to that string. **Fold →** nix-diagnose catalogue → **promote → language/evaluation-failures** as new row M-C-16. Class C9.
- **T26** A `${src}` manifest read attempts a live fetch under IFD-allowed eval. **Fold → NIX-REL-01** (Q5 as its verification) and NIX-FLK-07. Classes C3, C11.
- **T27** Moving the revision into an env var churns the `drvPath` too. **Fold → NIX-REL-03**; overturns map conflict 8. Class C18.
- **T28** yazi's version differs from its tag at the tagged commit. **Fold → NIX-REL-02** (violator row) and [rel] failure mode 1.
- **T29** An archive-tarball URL carries less `self` metadata than `github:`. **Fold → NIX-REL-04.**
- **T30** nix-update found the right hash but did not write it back in nested bwrap. **Promote → release/verification-rerun-w3** item 1 (environment-blocked, not evidence against REL-13).

*release/publishing-and-consumer-ux*
- **T31** nix-community/flake-compat declares itself unmaintained. **Fold → NIX-REL-05**; map conflict 10 collapses to NixOS/flake-compat. Dated re-check.
- **T32** `warnOnInstantiate` is silent on `nix flake show`, `lib.warn` is not; both fire on `check --no-build`. **Fold → NIX-REL-10.**
- **T33** `nix flake show` swallows `abort-on-warn` (exit 0). **Fold → NIX-REL-11** (MUST). Class C9.
- **T34** The shape audit's README counts disagree (20 vs 17). **Fold →** [rel] conflict 9; REL-09 is conditioned on shape.
- **T35** `nix shell <ref>#pkg` and `nix flake init -t` were missed by the audit grep. **Fold → NIX-REL-09** (E flakes get `init -t`); `nix shell` adds no README line.
- **T36** `edolstra/flake-compat` is a 301 to NixOS/flake-compat. **Fold → NIX-REL-05** (stale-URL finding, not a compatibility risk).

*flakes/verification-rerun-w2*
- **U1** Two planted fixtures wrote to `/bin`. **Reject as findings**; class C22; [flk] failure mode 14.
- **U2** skeleton-a's `nix develop` proved nothing about `inputsFrom`. **Fold → NIX-FLK-18** (`nix develop -i … command -v`). Classes C19 (`inputsFrom` never forwards the package) and C22.
- **U3** Lix accepts `self: super:` overlays and a string `formatter`. **Fold → NIX-FLK-01, 02** and new MUST **NIX-FLK-19**. Class C10.
- **U4** A relative `path:../producer` fails once the consumer is its own repository. **Fold → NIX-INP-04** and NIX-FLK-13's cross-flake form.
- **U5** The existing flake-parts fixture declared outputs inline. **Fold → NIX-FLK-17** (new fixture); class C22.
- **U6** A blueprint-style directory loader defeats a recursive grep. **Defer** as [flk] Verdict 11's documented gap; `nix flake show --json` is the only enumeration.

*generated-flakes/verification-rerun-w2*
- **U7** `autoPatchelfHook` fails the whole cmake derivation over `cmake-gui`. **Fold →** new MUST **NIX-GEN-19**. Class C12.
- **U8** The consolidation's own `good/data.json` fails NIX-GEN-17. **Fold →** [gen] Verdict 10 → **promote → generated-flakes/verification-rerun-w3** item 2 (make the handoff prototype compliant).
- **U9** `list` env and `dependencies` are 0% used in the live index. **Fold →** [gen] Verdict 8 (documented gap). The token-form census → **promote → generated-flakes rerun** item 3.
- **U10** Pure evaluation refuses an absolute-path read before IFD applies. **Fold → NIX-GEN-01.**
- **U11** amazon/corretto has glibc and musl offers and no bare one. **Fold → NIX-GEN-04** → planted twin **promoted → generated-flakes rerun** item 1.
- **U12** `lib.escapeShellArgs` blocks `$installPath`; a wrapper moved onto its own target execs itself forever. **Fold → NIX-GEN-20** (corrected to segment escaping in the second revision: **new class C21**) and [gen] failure mode 15 (C12).

### (c) Map rows affected

**Settled by a wave-3 rule** (each row cites the rule that now answers it):
- **B:** M-B-01 → INP-01; M-B-02 → Q1-transitive (INP Check A); M-B-03 → INP-02; M-B-04 → INP-06; M-B-05 → INP-06, INP-11; M-B-06 → INP-07; M-B-08 → INP-10 (reframed: eval-time fetchers, not `flake = false` inputs); M-B-09 → INP-09; M-B-10 and M-A-16 → INP-04; M-B-11 → INP-05; M-B-12 → INP-08; M-B-14 → INP-12; M-B-16 → INP-04 plus [inp] failure mode 10. M-B-15 stays moot (conflict 17).
- **D:** M-D-01 → PKG-06 (with FLK-13); M-D-02 and M-C-01 for `mkDerivation` → PKG-14; M-D-03 → PKG-07 (with FLK-15, GEN-12, GEN-13); M-D-04 → PKG-01, 02; M-D-05 → PKG-03; M-D-06 → PKG-04; M-D-07 → PKG-01 and INP-10; M-D-08 → PKG-05; M-D-09 → PKG-09, 10; M-D-10 → PKG-10, 11; M-D-11 → PKG-12; M-D-12 → PKG-13; M-D-16 → PKG-15; M-D-18 → PKG-16; M-D-19 → PKG-18. Dropped with reasons in [pkg]: M-D-13 (updateScript lives in REL-14 at CONSIDER), M-D-14 (not a finding), M-D-15 (FLK-11 owns the configured instance), M-D-25 (not a behaviour), M-D-26 (no consumer patches).
- **G:** M-G-01 → REL-01, 02; M-G-02 → REL-04 (the metadata matrix); M-G-03 → REL-07; M-G-04 → REL-06; M-G-05 → REL-08; M-G-06 → REL-10; M-G-07 → REL-09; M-G-08 → REL-05; M-G-09 → REL-14; M-G-10 → REL-15; M-G-11 → REL-12; M-G-15 → REL-13; M-G-16 → [pkg] Verdict 9. M-G-12 dropped (one flake, two packages, one tag). M-G-14 is a sequencing fact inside [rel], owned by the Cargo sibling.
- **K:** M-K-01, M-K-02 and M-K-05 have draft procedures in [publishing-and-consumer-ux](nix-release/publishing-and-consumer-ux.md); they are authoring inputs, not rules.

**Partially settled; the residue is commissioned:**
- M-D-17 (ocx unbuilt; aws-lc-sys `cmake` mechanism) → packaging rerun.
- M-D-24 (`SOURCE_DATE_EPOCH`, promoted from Deferred by [rel]'s vergen question) → packaging rerun.
- M-F-18 (eval budget; the watchdog was never run) → inputs rerun.
- M-E-11 remainder (entrypoints, token grammar) → generated-flakes rerun.
- M-B-13 (Lix follows removal) stays a dated re-check.
- M-D-23 and M-E-10 (Darwin builds) → a measurement the corpus cannot supply (f).

**New rows discovered:**
- **M-B-17** — does a transitive lock node that nothing accesses cost a consumer a fetch under CppNix 2.35's lazy copies (nix-installer's `nixpkgs-regression`; a `flake = false` flake-compat input)? P1: it sets NIX-INP-02's severity and REL-05's input cost. → inputs rerun.
- **M-C-16** — `nix eval --json` over an attrset with `outPath` prints only that string. P2, a debugging trap. → language/evaluation-failures.
- **M-D-27** — how a Python *library* flake exports itself (`pythonPackagesExtensions` overlay vs a top-level attribute bound to one interpreter). P1 for ocx-sdk-python. → packaging rerun.
- **M-E-31** — where a generated package's `meta.description` and `homepage` come from (OCI `description`, `url`, `source` annotations), given NIX-PKG-07 makes description presence a MUST. P1. → generated-flakes rerun.

**Earlier map text now wrong:**
- **Conflict 3 / M-B-12:** "#5393 self-follow segfault" is historical on CppNix ≥2.31.5 (T1).
- **Conflict 8:** "the revision goes into an env var, accepting a rebuild" is overturned; the default package reads no revision (NIX-REL-03, T27).
- **Conflict 10:** the flake-compat choice collapsed to `NixOS/flake-compat` (NIX-REL-05).
- **Conflict 13:** "a nixpkgs submission is a copy" → a copy plus a three-attribute swap (`version`, `src`, dependency hash) ([pkg] conflict 9, [rel] conflict 7).
- **Conflict 15 and M-B-06:** "`--update-input` gone since 2.19" is wrong for CppNix (a deprecated alias on 2.31.5 and 2.35.2) and right for Lix 2.95.2 ([inp] conflict 2).
- **Conflict 20:** `mkDerivation rec {` is not a SHOULD finding by itself; `finalAttrs` is for self-reference only, because an unused `finalAttrs` fails deadnix (NIX-PKG-14).
- **Q1:** its filter misses FlakeHub and channel-tarball nixpkgs; replaced by Q1-transitive ([inp] conflict 1). The wave-2 note "Q1 stands" is withdrawn.
- **Q7:** retired for every shape: PKG-07's set-wide jq owns description, license, platforms; FLK-15 and GEN-13 own `mainProgram`.
- **Q8:** its `sha256 = "` term backs a SHOULD (NIX-PKG-01), not a MUST.
- **Q9:** its `nix profile install` term would flag NIX-REL-09's mandated fallback comment (E20); the README half moves to REL-09's greps.
- **M-B-08:** helix has 2 inputs and 0 `flake = false`; the cost is 303 eval-time fetchers (T7).
- **Deferred M-D-24** is promoted (above).

### (d) Frame corrections

- **H2, sharpened.** Follows is decided by how an input is consumed; the Nix manual itself calls a transitive nixpkgs "usually irrelevant" for modules and overlays. The lock never deduplicates by content: three byte-identical pins give 4 nodes (NIX-INP-01). Library flakes leak test inputs into every consumer's lock (NIX-INP-02; NixOS/nix's `nixpkgs-regression` measured inside nix-installer's lock).
- **H4, confirmed and extended.** `self` carries no tag or ref at a tag ref ([rel] C2), so no conditional version suffix can be written; yazi ships `26.9.1pre20260901_8dd895c` at `v26.9.1` (NIX-REL-02). Fleet flakes use their existing `vX.Y.Z` tags.
- **H1, dated idioms, extended.** `self.shortRev or "dirty"` discards the hash (NIX-REL-04); bare `--replace` still exits 0 (NIX-PKG-12); `cargoLock.lockFile = "${src}/Cargo.lock"` is the Rust form of NIX-FLK-07 (NIX-PKG-15); `buildRustPackage` never reads `rust-toolchain.toml` (NIX-PKG-16). `--update-input` is a deprecated alias on CppNix, not gone.
- **H9, sharpened again.** Lix 2.95.2 also rejects `nix flake lock --update-input` and `nix profile add`, gates `inputs.self.*` behind `flake-self-attrs`, and reports a follow cycle as `stack overflow` ([inp], [pkg] P12, [rel] C3).
- **New: a warm store hides fetcher edits for every shape, not only D.** A bumped `rev` with a stale hash and a nurl-copied `tag = "<hex>"` that 404s both "build" until `--rebuild` (NIX-PKG-04; nurl 0.4.1 emits `tag =` for any non-40-hex argument).
- **New: a derivation that reads `self.rev` churns its `drvPath` on every commit wherever the revision goes** (NIX-REL-03).
- **Era.** `nixexprs.tar.xz` ends after 2027-12-31 and `.tar.zst` channels exist (NIX-INP-05); nixpkgs rustc is 1.98.1 against the fleet's channel 1.95.0 (NIX-PKG-16); `nix profile install` is a deprecated alias on CppNix 2.35.2; nix-community/flake-compat is unmaintained and edolstra/flake-compat redirects (NIX-REL-05).
- **Fleet data.** ocx's workspace version is `0.6.3` with two binaries (`ocx`, `ocx-shim`); grimoire is `0.14.2` with two forked submodules (`external/docker_credential`, `external/rust-oci-client`); ocx-sdk-python is `0.2.0` with `dependencies = []` and a hatchling backend. grimoire's remote is `github:grimoire-rs/grimoire`, not `ocx-sh/grimoire` as [pkg] Open questions writes (measured: `git -C /home/mherwig/dev/grimoire remote -v`). `clang-sys` in ocx's lock is aws-lc-sys's optional bindgen dependency, inactive on Linux targets.

### (e) Cross-consolidation contradictions

Every ruleset on disk (FLK, GATE, GEN, INP, PKG, REL) was read against every other. Numbering continues the wave-2 list (E1-E9). The drafters keep the named ID's text and edit the other to cite it; no consolidation was edited here.

- **E10. NIX-REL cites the wrong NIX-PKG IDs.** REL-01, REL-14, [rel] Verdict 8 and its Dropped list cite "NIX-PKG-01" for the by-name, no-`../` `package.nix`; that rule is **NIX-PKG-06** (PKG-01 is fetchers and SRI hashes). REL-14 and the Dropped list cite "NIX-PKG-13" for `passthru.updateScript`; PKG-13 is `versionCheckHook`, and [pkg] dropped updateScript. **Resolution:** PKG-06 keeps the by-name text; **REL-14 keeps the updateScript text** (CONSIDER, nixpkgs copy only) and cites no PKG rule. Drafters rewrite every citation.
- **E11. E1 is still unapplied in [gate].** [gate] Verdict 5 and NIX-GATE-09's triage row still call `path '/nix/store/…-source' is not valid` "a checker limit, not a defect; run the gate from the checkout". Wave 3 adds two more reproductions of the author defect (PKG-15's P10 red by tarball *and* locally; REL-01's `${src}` read). **NIX-FLK-07 keeps the text.** GATE-09's row reads "eval-time read through the flake's own source store path (NIX-FLK-07, NIX-PKG-15): author's fix, read the source-tree path"; Verdict 5's "checker limit" is confined to IFD (GATE-08).
- **E12. NIX-GATE-16's Lix leg vs NIX-INP-09 and [pkg] Verdict 5.** The leg `nix shell nixpkgs#lix --command nix flake check --no-build` fails on every flake that declares `inputs.self.submodules` or `lfs` (P12: `experimental Lix feature 'flake-self-attrs' is disabled`). **GATE-16 keeps the leg** and its command gains `--extra-experimental-features flake-self-attrs` when `flake.nix` declares `inputs.self`; INP-09 cites it.
- **E13. The gate block's step 7 vs NIX-INP-06.** Step 7 runs `flake-checker --no-telemetry --fail-mode flake.lock` with the default checks; INP-06 decides the CEL condition. **INP-06 keeps the condition** and step 7 becomes INP-06's full command; **GATE-11 keeps the crash classification**.
- **E14. NIX-PKG-08 ("evaluate your own packages in CI with `abort-on-warn`") vs NIX-REL-11 (never on a whole-flake check or build).** PKG-08's own verification is already attribute-scoped. **REL-11 keeps the scope text**; PKG-08's text narrows to "named current packages' `meta.license`". The same scope binds GEN-14 (over `packages` only, never `legacyPackages`) and the wave-2 amendment that made `abort-on-warn` "the general consumer-noise check" for language/idioms-and-scope (revised in (g)).
- **E15. NIX-PKG-07 (license presence MUST for every package; [pkg] Applied applies it to D) vs NIX-GEN-14 (omit `meta.license` when the annotation is missing; 128 indexes, 8 latest).** PKG-07's check would fail the generated flake by design. **GEN-14 keeps the D text**; PKG-07's license-presence clause binds packages built from source, and the D depth file states the exception. PKG-07's description clause has no measured source for D (new row M-E-31) → generated-flakes rerun; until it lands, the D description rule is unverified.
- **E16. NIX-FLK-07's example `../Cargo.toml` vs NIX-PKG-06 (no `../` in `package.nix`) and NIX-REL-01 (`package.nix` beside the manifest).** **PKG-06 keeps its text.** FLK-07 keeps the rule; its example becomes `./Cargo.toml`.
- **E17. [inp] Applied ("the README says consumers may follow nixpkgs, at the cost of cache hits") vs owner Q2 (no public cache) and NIX-REL-09.** A fleet A flake has no author cache, so following costs no cache hits; the real cost is an untested nixpkgs. **REL-09 keeps the wording** ("builds against your nixpkgs, which this flake did not test"). The D flake's README says following is safe because layer FODs are invariant ([gen] Applied).
- **E18. NIX-INP-05's FlakeHub clause vs NIX-REL-06.** Two MUSTs over the same `flakehub.com/f/` grep. **REL-06 keeps the FlakeHub text** (inputs and publish steps); INP-05 keeps the scheme rule and cites REL-06.
- **E19. NIX-INP-10 vs NIX-PKG-01's builtin-fetcher half.** **INP-10 keeps the builtin-fetcher text** (it has the behavioural check, `--no-build` downloads nothing); PKG-01 keeps SRI `hash =` and the legacy attributes and cites INP-10.
- **E20. NIX-INP-07's grep vs NIX-REL-09.** INP-07's `-e 'nix profile install' -e 'nix-env -i'` over `.` hits REL-09's mandated fallback comment `# Lix, or Nix < 2.30: nix profile install`. **REL-09 keeps the README text and greps** (`grep -c -e '^ *nix profile install'` = 0 allows the comment); INP-07's grep keeps only `--update-input` and `--recreate-lock-file`. Map Q9 is retired likewise.
- **E21. NIX-PKG-15 accepts crane vs NIX-PKG-16 rejecting rust-overlay for its consumer lock cost and [inp]'s one-input fleet commitment.** The same argument applies to crane. **PKG-15 keeps its text** for the general adopter (crane is not a finding); the fleet clause "never introduce crane or rust-overlay into a fleet flake" goes into the nix-flake-adopt skill, citing [inp] Applied.
- **E22. NIX-REL-05 (`inputs.flake-compat = { url = "github:NixOS/flake-compat"; flake = false; }`) vs [inp] Applied ("the root takes one input, nixpkgs").** **REL-05 keeps its text**; the fleet skeleton's inputs become nixpkgs plus flake-compat. Whether that node costs flake consumers a fetch is M-B-17 (inputs rerun).
- **E23. NIX-INP-02 ("a same-tree `path:..` parent reference from `test/` is also legal (NIX-INP-04)") vs NIX-INP-04 ("the only relative form allowed is same-tree `path:./sub`") and its `path:\.\./` candidate grep.** Internal to [inp], and the `path:..` form was never run. **INP-04 keeps the text** until the inputs rerun (item 6) measures the parent form; then INP-04 reads "a relative `path:` that stays inside the flake's own git tree".
- **E24. NIX-REL-13 (`rev = "v${finalAttrs.version}"`) vs NIX-PKG-02 and [pkg]'s nixpkgs-copy swap (`tag = "v${finalAttrs.version}"`).** nixpkgs prefers `tag` for a real tag (`fetchers.chapter.md:864-877`); nix-update was measured only on the `rev` form. **PKG-02 keeps the tag-versus-rev text; REL-13 keeps the interpolation requirement**, and its example becomes the `tag` form once the release rerun (item 1) runs nix-update on it.
- **E25. [pkg] Applied puts the NIX-PKG-16 floor check "in `checks`"; PKG-16's verification is a shell pipeline, not a derivation.** Unverified placement. **PKG-16 keeps the text** and the check ships as a CI step until the packaging rerun (item 5) watches a `checks` derivation form red and green.
- **E26. [gen] Verdict 3 and Applied cite `nix run <flake>#kitware.cmake."4.4.2"` as resolving, while NIX-GEN-13 and NIX-FLK-15's exception say cmake (five binaries) has no `mainProgram` and promises no `nix run`.** **GEN-13 keeps the text**; the example moves to a single-binary package (generated-flakes rerun item 5).
- **E27. The gate block's step 6 (`nix build .#default`) vs NIX-GATE-10 ("every package the flake itself defines").** Internal to [gate]. **GATE-10 keeps the text**; step 6 builds every own package.
- **No conflict found** in these pairs (recorded so no drafter re-litigates them):
  - INP-11 vs REL-08: REL-08 cites INP for the cadence; the D flake's lock rides GEN-16's PR.
  - PKG-13 vs FLK-15 vs REL-16: three layers (sandbox, CI, released tag), bounded duplication.
  - INP-01 vs [gen] Applied: D has no cache, so following its nixpkgs is safe.
  - INP-07 (MUST on Lix evidence) vs GATE-16 (Lix advisory): CppNix also warns the alias is deprecated.
  - REL-12's floor vs INP-04 (≥2.26) and INP-09 (≥2.27): both sit below 2.31.5.
  - PKG-04 vs GEN-08, GEN-15: PKG-04 generalizes the `--rebuild` rule to every shape.
  - PKG-14 vs map conflict 20: PKG-14 supersedes it for `mkDerivation`.
  - GATE-13 vs REL-12: the 2.31.5 floor sits above the CVE-2026-39860 patch (2.31.4).

### (f) Convergence

**Failure classes.** Every failure mode in the six consolidations, grouped by mechanism, each with the check that catches it. C1-C16 are the wave-2 classes; only new instances are listed for them. "New" means no wave-1 row, no conflict and no wave-2 class named the mechanism.

- **C1** Checker-contract shape violation. New instances: none this wave (FLK-19 scopes it to CppNix). Check: gate step 4.
- **C2** Hidden default scope. New instance: flake-parts' +2 lock nodes (NIX-FLK-10). Check: `--all-systems`, the FLK-08 grep.
- **C3** A warm store masks a cold failure. New instances: a bumped `rev` with a stale hash (PKG-04, P1); nurl's `tag = "<hex>"` 404 (P2); `${finalAttrs.src}/Cargo.lock` over a fileset (P10); `${src}` manifest reads (REL-01). Check: `nix build --rebuild .#<pkg>.src`, `--no-build` against a fresh `git archive` tarball.
- **C4** A green gate that does not exercise the property. New instances: meta, `runHook` and binary mismatches pass `nix flake check` (PKG-07, 11, 13). Check: the PKG-07 jq, `versionCheckHook`, the override-marker build.
- **C5** The source set differs from the working tree. New instances: an empty submodule directory and LFS pointer text (INP-09); a committed absolute `path:` or `git+file:` input (INP-04). Checks: the `.gitmodules`/`.gitattributes` greps, the local-input jq.
- **C6** Era drift. New instances: `--update-input`, `nix profile install`, `sha256 =`, `nixexprs.tar.xz`, edolstra and nix-community flake-compat, bare `--replace`. Checks: INP-05, INP-07, PKG-01, PKG-12, REL-05 greps.
- **C7** A misattributed diagnostic. New instances: helix's cost blamed on inputs (T7); crane blamed for the self-read (T13). Check: planted twins, then the verbatim catalogue.
- **C8** A floating reference. New instances: an indirect registry input (INP-05); FlakeHub `/*` wildcard inputs (REL-06). Check: the indirect jq, the REL-06 grep.
- **C9** A command or mode that exits 0 without doing what its name implies. New instances: `nix flake update` on a rev-in-`url` input (INP-03); `nix flake lock` after a `path:` edit (INP-07); nix-update rewriting only `version` (REL-13); `nix flake show` swallowing `abort-on-warn` (REL-11); `nix eval --json` collapsing to `outPath` (M-C-16). Check: a diff of the expected effect (`git diff`, `narHash`, rev) after the command.
- **C10** Cross-implementation divergence. New instances: Lix rejects `--update-input` and `nix profile add`, gates `inputs.self.*`, overflows on a follow cycle, and accepts `self: super:` and a string `formatter`. Checks: the Lix leg (GATE-16, E12), FLK-19's CppNix rerun.
- **C11** The sandbox and network boundary. New instances: 303 eval-time `fetchTree` calls (INP-10); a `${src}` read fetching during eval (REL-01). Check: `nix flake check --no-build` downloads nothing; Q5.
- **C12** Prebuilt runtime linkage and wrapping. New instances: `autoPatchelfHook` failing the whole derivation (GEN-19); a wrapper execing itself (GEN failure 15). Check: the smoke build under `timeout`, the GEN-19 jq.
- **C13** Consumer-visible evaluation noise. New instance: a compound SPDX id in a fleet package (PKG-08). Check: attribute-scoped `abort-on-warn` (REL-11).
- **C14** A second source of truth that drifts. New instances: version literals beside the manifest (REL-01, the fleet-builders dive's own literals); a `nix/package.nix` with `root = ../.` (PKG-06). Checks: the REL-01 comparison, the PKG-06 grep.
- **C15** A credential or trust boundary. New instances: `--accept-flake-config` in a README, a CI job and an `AGENTS.md` (REL-09, crane `test.yml:104`, llm-agents `AGENTS.md:13`). Check: Q13 (owned by NIX-SEC, wave 4).
- **C16** A style lint treated as a defect. No new instance.
- **C17** Consumer-graph leakage: an author-side input declaration multiplies every consumer's lock nodes, fetches or rebuilds. Instances: test inputs at a library root (INP-02); a missing follows on a library input, since the lock never dedups by content (INP-01); a follows on a cache-backed input (INP-01); flake-parts' extra nodes (FLK-10). Check: Q1-transitive, `has("nixpkgs")` on a B flake. **Known** (map conflict 3, M-B-01..03); first consolidated this wave.
- **C18** Derivation-identity churn: a derivation reads something unrelated to its output, so its `drvPath` changes on unrelated commits. Instances: unfiltered `src` (PKG-05); `self.rev` in `version` *or* in an env var (REL-03). Check: `drvPath` before and after a README-only commit. **Known** (M-D-08, Q15); the env-var instance is new and overturns conflict 8.
- **C19** An ignored declaration: the author writes a setting, file or attribute that nothing reads, so nothing errors and nothing happens. Instances: `rust-toolchain.toml` under `buildRustPackage` (PKG-16); `nixConfig.warn-dirty` without `accept-flake-config` (T10); a tag or ref expected on `self` (REL-02); `inputsFrom` expected to put the package on `PATH` (FLK-18); an overridden phase without `runHook` silently dropping a downstream `postInstall` (PKG-11); a `-sys` crate's presence in `Cargo.lock` read as a build requirement (PKG-17). Check: probe the effect, never the declaration (the PKG-16 floor command, `nix develop -i … command -v`, the MARKER override build, `cargo tree --target all -i`). **New this wave.**
- **C20** Diagnostic drift: the same fault prints different text across Nix versions and implementations, so a string-keyed diagnosis silently stops matching. Instances: `points outside of its parent's store path` (2.20.6) vs `access to absolute path … is forbidden in pure evaluation mode` (2.31.5, 2.35.2); `follow cycle detected` (CppNix) vs `stack overflow` (Lix); `is not valid` (CppNix) vs `did not exist in the store during evaluation` (Lix). Check: catalogue rows keyed by input shape and dated per implementation. **New this wave.**
- **C21** Untrusted data interpolated into a build script. Instances: registry `env` values double-quoted into the builder execute `$(…)` at build time and turn ocx's `$${` into a PID (GEN-20, second revision). Check: GEN-20's literal-line wrapper test on a planted hostile value. **New** (landed with the wave-2 rerun revision, after the wave-2 harvest).
- **C22** Broken evidence: a fixture or measurement defect credited to the property under test. Instances: `installPhase` writing to `/bin` (U1); an undefined `${system}` in a `description` (FLK conflict 11); `rsync --exclude=catalog` deleting `src/catalog` (T15); a 39-hex "full" rev and store hits counted as builds (T20); `pkgs.hello.src` changing with hello's version (T6); a fileset read "cold" that was a content-identical store hit (T19). Check: confirm the twin evaluates and builds, diff the fixture's file list against `git ls-files`, vary one variable per twin, rebuild with `--rebuild`. **New this wave** as a class (FLK failure mode 14 named the first instance in the wave-2 rerun revision). It binds agents debugging a failure as much as it binds this program.
- **C23** A fabricated or truncated identifier: a hash, rev or tag written by hand or copied from a tool's mis-emission. Instances: a guessed hash (PKG-03); a short or 39-hex rev; nurl's `tag = "<hex>"` (PKG-02); a non-blessed fake hash that turns on curl `--insecure` (PKG-03). Checks: the PKG-02 grep, the fake-hash procedure, PKG-04's `--rebuild`. **Known** (M-D-04, M-D-05); nurl's mis-emission is a new instance.
- **C24** A dependency in the wrong role. Instances: a build tool in `buildInputs` under `strictDeps` (PKG-09); a list under `env` (PKG-10); ocx visibility mapped to the wrong input kind (GEN-20). Checks: a `strictDeps` build, eval of `env`, the synthetic visibility chain. **Known** (M-D-09, M-D-10).

**Result.** Wave 3 added **21 MUST rules** (plus 3 from the wave-2 reruns) and **four new failure classes (C19, C20, C21, C22)**; NIX-LANG, NIX-SEC and conditional NIX-MOD still have no consolidation. By the wave-plan stop condition the program has **not converged**.

**MUSTs resting on a verification that has not been watched red** (flagged for the revisers and the drafters):
- **NIX-GEN-02, 04, 05**: MUST by reading heuristic; no generator exists. The generated-flakes rerun plants twins.
- **NIX-INP-09**: MUST on the watched mechanism (empty submodule dir, pointer text); its "test LFS over an https remote" clause and its 2.31.5 and Lix behaviour are unrun → inputs rerun.
- **NIX-PKG-07**: presence watched on A fixtures only; its license clause conflicts with GEN-14 for D (E15) and its description clause has no measured D source → generated-flakes rerun.
- **NIX-PKG-13, NIX-PKG-15**: watched on fixtures and on grimoire; ocx, the harder fleet CLI, is unbuilt → packaging rerun. The severity is not at risk; the fleet template is.
- **NIX-FLK-03**: watched on 2.35.2 only; 2.31.5 and Lix never ran on the `apps`/`templates` fixtures → language/evaluation-failures reproduces those strings on both.
- **NIX-REL-16**: watched on a `git+file` tag ref, not a pushed `github:` tag → release rerun item 3.

No MUST rests on the one environment-blocked run: nix-update's write-back backs NIX-REL-13, a SHOULD.

**Open questions, classified.** Every question in the six "Open questions" sections, plus the dated items:

- **Answerable now and load-bearing → commissioned in (g):**
  - ocx builds end to end, with timings and determinism (M-D-17, M-D-24; GATE-10's cost) → packaging rerun.
  - Python library export (M-D-27) → packaging rerun.
  - aws-lc-sys's `cmake` mechanism (T16) → packaging rerun.
  - lazy fetch of unaccessed lock nodes (M-B-17; INP-02's severity, REL-05's input) → inputs rerun.
  - #14339 on a floating ref, and the exactness of INP-08's restore → inputs rerun.
  - `inputs.self.submodules` fetched remotely, and on 2.31.5 and Lix → inputs rerun.
  - the eval-budget watchdog (M-F-18) → inputs rerun.
  - nix-update write-back, and the `tag` form (E24) → release rerun.
  - REL-05, 09, 16 on Lix and 2.31.5 → release rerun.
  - GEN-02/04/05/16 twins; a compliant handoff prototype; the token and entrypoint census (M-E-11); the D description source (M-E-31) → generated-flakes rerun.
  - the verbatim catalogue, keyed by shape and version (C20, M-C-16, M-K-03) → language/evaluation-failures.
  - the language ruleset (M-C-01..14) → language/idioms-and-scope.
  - the trust boundaries (M-H-01..09) → security/trust-boundaries.
- **Answerable now, low priority by owner default → next wave, last in order:** module authoring and whether `modules.md` ships (Q7 default: no fleet modules).
- **A measurement the corpus cannot supply:**
  - aarch64-darwin and aarch64-linux builds of the `-sys` crates (M-D-23) and prebuilt Darwin binaries (M-E-10): no Darwin builder, and the host is WSL on x86_64. Default: eval-only for those systems with a README mark; PKG-17 is scoped to x86_64-linux.
  - gates/ci-live (cache restore within 10 GB, arm64 and macOS runner budgets): needs GitHub runners on an owner repository. GATE-14 and GATE-15 stay SHOULD.
  - Determinate Nix 3.22.5 behaviour, unless the pinned nixpkgs builds it (release rerun records which). Q6 default: untested, never deliberately broken.
  - `self.lfs` over HTTPS, if no public LFS-carrying repository is reachable (inputs rerun records which).
- **Owner decisions (default applied):**
  - Q1 FlakeHub: no (REL-06 MUST for the fleet); FlakeHub rolling is not prototyped.
  - Q2 public cache: none (REL-15).
  - Q3 upstreaming: later (REL-14 stays CONSIDER).
  - Git SHA in `ocx version` for Nix builds: omitted (REL-03).
  - Weekly lock-bump token: the GEN-16 GitHub App; fallback a fine-grained PAT (INP-11).
  - Fleet nixpkgs branch: `nixos-unstable` (INP-06).
  - Upstream PRs for NixOS/nix's and nixd's `.tar.xz` inputs: none from this program.
  - grimoire's forked submodules: keep them, declare `inputs.self.submodules` (INP-09).
  - Exact Rust channel: stock `rustPlatform` plus the PKG-16 floor; the exact channel only in a devShell (CONSIDER).
  - Lix consumers of grimoire: a README note plus the feature flag in the advisory leg (E12).
  - Carried from wave 2: the fleet system list, `overlays.default` yes, no `apps` for `ocx-shim`, no `templates.default`, eval-only Darwin for D, musl dropped, `cmake-gui` via the ignore list, the ADR requests (license annotation, resolved projection, signature verification).
- **Dated re-checks** (recorded with their date and rechecked at authoring or release): the wave-2 list, plus flake-checker's binary branch list (0.2.15, 2026-09-27); Lix's `--update-input`, `profile add`, `flake-self-attrs` and follow-cycle diagnostic (2.95.2); #14339 status; nixpkgs#356002 (`--replace` removal); `nixexprs.tar.xz` end (2027-12-31); nurl's `tag` emission (0.4.1); nixpkgs rustc against the fleet channel (1.98.1 vs 1.95.0); flake-compat repository status; FlakeHub's semver resolution.

### (g) Next wave

**next_wave (wave 4): the staged wave-4 set, revised with wave-3 verdicts.** Four dives in three new groups (new families, so no revision contends with them). Cross-cutting first:

1. **language/evaluation-failures** (NIX-LANG). The verbatim catalogue nix-diagnose reads, seeded from every string already on disk in six consolidations before any new fixture; keyed by input shape and version (C20), with a misattributed-diagnostics section (C7), M-C-16, and FLK-03's strings on 2.31.5 and Lix. Cross-cutting: every family's failure modes route through it.
2. **language/idioms-and-scope** (NIX-LANG). The residual language rules once GATE-05/06/07, PKG-14, REL-11, FLK-12 and INP-10 are cited rather than re-derived: plain `rec`, `with` scope, `//`, paths and string context, impure builtins, URL literals, the rec/non-rec merge (with Lix, V19), `builtins.warn` scoped per REL-11. P0 row M-C-07 has no consolidation.
3. **security/trust-boundaries** (NIX-SEC). P0 rows M-H-01..03 have no consolidation, and four families already defer to NIX-SEC (REL-09, REL-15, INP failure mode 10, GEN-10/20). Adds the wave-2 amendments and wave-3's `--accept-flake-config` exemplars (crane CI, cachix README, llm-agents `AGENTS.md`).
4. **modules/module-authoring** (NIX-MOD, conditional). The smallest module-evaluating check (FLK-06) and the ships-or-folds decision. Last in order and the first to drop if the budget bites (owner Q7 default).

**rerun_wave: one dive per group whose dives left verifications NOT RUN or blocked** (slug `verification-rerun-w3`, each a revision that holds IDs stable):
- **inputs**: the eval-budget watchdog (RUN: no); #14339's floating case (not re-derived); INP-09 over HTTPS, on 2.31.5 and on Lix; grimoire's submodules fetched by rev; M-B-17 lazy fetch; the `path:..` parent form (E23).
- **packaging**: ocx end to end (unbuilt) with timings, determinism under `--rebuild` (M-D-24), GATE-10's cost; aws-lc-sys's `cmake` mechanism; PKG-16 as a `checks` derivation (E25); ocx-sdk-python's unbuilt `pythonImportsCheck` and the export shape (M-D-27).
- **release**: nix-update's blocked write-back, plus the `tag` form (E24); REL-05/09/16 on Lix and 2.31.5; REL-16 against a pushed `github:` tag.
- **generated-flakes**: red twins for GEN-02, 04, 05 and 16 (not run: no generator); the handoff prototype made compliant with GEN-11, 17 and 20 and rebuilt cold (Verdict 10); the token and entrypoint census (M-E-11); the D description source (M-E-31, E15); the cmake `nix run` example (E26).
- **flakes, gates: no rerun dive.** FLK-03's floor and Lix strings ride in language/evaluation-failures, and the drafters take the result from that consolidation. E11 and E27 are drafter edits.

**Held-out round (planned for wave 5, not commissioned now).** Once NIX-LANG, NIX-SEC and NIX-MOD land, run every family's verification cells verbatim over five to eight flakes that are not in the 38-repo corpus (fresh clones at dated SHAs), group what breaks by class, and stop only if that round adds no class beyond C1-C24 and no MUST rule.

**Budget.** Eight dives and seven consolidations (three new, four revisions). The modules dive is the first cut if the ~15M program ceiling in the frame binds.

**Verdict: needs another round.**

## Wave 4 landed (2026-09-27)

Phase 6 harvest of wave 4 (three new groups, four dives, three new
consolidations) and of the four wave-3 verification reruns that landed beside
it (each folded into a revision of its consolidation). Source keys added for
this section: **[lang]** = [nix-language.md](nix-language.md), **[sec]** =
[nix-security.md](nix-security.md), **[mod]** = [nix-modules.md](nix-modules.md);
**[flk]**, **[gate]**, **[gen]**, **[inp]**, **[pkg]**, **[rel]** as before.
Nothing above this heading was edited; where this section contradicts an
earlier one, this section wins and says so. The files are authoritative where
the orchestrator's receipt differs (two receipt errors are recorded in (a)).

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| `language` (new) | [nix-language.md](nix-language.md) | 11 (NIX-LANG-01..11) | **6** (01, 02, 04, 05, 08, 10) | 12 | 5: eval-cache staleness (#3872) in a deep module chain; a static detector for pattern-formal shadowing and nested `//`; context-free store paths after `nix copy`; full Lix fixture enumeration; M-C-15 |
| `security` (new) | [nix-security.md](nix-security.md) | 9 (NIX-SEC-01..09) | 7 (01..06, 08) | 10 | 5: Lix/Determinate advisory parity; macOS sandbox boundary; SEC-01/02/05 on 2.31.5 and 2.35.0/.1 vs the advisory; `trusted-settings.json` reuse; FOD tamper probe |
| `modules` (new; ships) | [nix-modules.md](nix-modules.md) | 8 (NIX-MOD-01..08) | 5 (01, 04, 05, 06, 08) | 7 | 3: cheapest home-manager/nix-darwin eval host; `_class`/`pathWith` release floors; held-out module sweep |
| `inputs` (revision, rerun-w3) | [nix-inputs.md](nix-inputs.md) | 14 (+ INP-13, INP-14) | 4 (unchanged) | 8 new (10-17) | 5: M-B-17 lazy fetch; watchdog false positive (M-F-18); `self.lfs` over HTTPS; Lix tracking; toolchain restore (done by orchestrator) |
| `packaging` (revision, rerun-w3) | [nix-packaging.md](nix-packaging.md) | 22 (+ PKG-19..22) | 13 (+ PKG-19, PKG-21) | 8 new (12-19) | 5: ocx `--rebuild` determinism and closure; PKG-16 `checks` form; crane cost split; darwin/aarch64 `-sys`; remote `self.submodules` |
| `release` (revision, rerun-w3) | [nix-release.md](nix-release.md) | 17 (+ REL-17) | 7 (REL-13 raised to MUST) | 6 new (11-16) | 3: nix-update `cargoHash`; vergen `SOURCE_DATE_EPOCH`; FlakeHub rolling (only if Q1 flips) |
| `generated-flakes` (third revision, rerun-w3) | [nix-generated-flakes.md](nix-generated-flakes.md) | 22 (+ GEN-21, GEN-22) | 19 (+ GEN-21, GEN-22) | 8 | 6: toolchain; GEN-20 Nix-level twins; GEN-21 flake-level check; GEN-22 throw; M-E-10 Darwin; README `nix shell` example |
| `flakes`, `gates` (unchanged) | [nix-flakes.md](nix-flakes.md), [nix-gates.md](nix-gates.md) | 19, 16 | 12, 10 | — | — |
| **Total on disk** | **9 files** | **138** | **83** | | |

**MUSTs added by this harvest's inputs: 23.** 18 in the three new families
(LANG 6, SEC 7, MOD 5) and 5 from the reruns (PKG-19, PKG-21, REL-13 raised,
GEN-21, GEN-22).

**Receipt errors, corrected here.** (1) The receipt gives NIX-LANG `must_count`
5; the file carries 6 MUST rows (LANG-08 is MUST as a procedure rule). (2) The
packaging rerun blamed "a concurrent sibling wave-3 process" for deleting the
toolchain; the orchestrator attributes it to an external cleanup of
`~/.cache/research-lang`, rebuilt at about 14:40. This harvest confirmed
`timeout 60 run.sh nix --version` → `nix (Nix) 2.35.2` and the 38 exemplars
back at their cited SHAs; `fixtures/` holds only `nix-generated-flakes-rev3/`
and `_orchestrator-smoke/`, so **every fixture path cited by the nine
consolidations except `nix-generated-flakes-rev3/` dangles**, including all
three wave-4 families' fixtures.

### (b) Surprises, one verdict each

**fold** = absorbed into a named rule. **promote** = a next-wave commission
(none this time; see (f)). **defer** = backlog under an M-ID. **reject** = not
a finding, with the reason. V-numbers follow the wave-4 receipt; R-numbers the
wave-3 reruns.

*language/evaluation-failures*
- **V1** Lix 2.95.2 accepts an `apps` entry with an unknown attribute (CppNix 2.31.5 and 2.35.2 exit 1). **Fold → NIX-FLK-19** (third leniency gap: `formatter`, overlay arity, `apps`; [lang] conflict 12). Closes wave-3 (f)'s flag that NIX-FLK-03 was watched on 2.35.2 only. Class C10. Dated re-check per Lix release.
- **V2** "undefined variable" is static unless an enclosing `with` defers it. **Fold → NIX-LANG-07** rationale ([lang] conflict 6); map M-C-12's premise is overturned (c). Class C4.
- **V3** `nix eval --json` collapses any `outPath`-carrying attrset. **Fold → NIX-LANG-11** (new row M-C-16 settled). Class C9.
- **V4** nixpkgs 26.11pre already prints a targeted hint for imports-from-config recursion (`lib/modules.nix:268`) while PR #370967 is unmerged. **Fold → NIX-LANG-10** (floor note) and the nix-diagnose catalog. Dated re-check of #370967.
- **V5** NixOS/nix#8013 (flake through a symlink) does not reproduce on 2.35.2. **Fold →** nix-diagnose catalog as "historical"; **dated re-check**. Class C20 (issue text outlives the fault).
- **V6** #3872's eval-cache staleness could not be forced on bare attributes. **Defer** (M-C-19, below): LANG-09 step 4 is absorbed into the nix-diagnose procedure and costs nothing to run; not load-bearing.

*language/idioms-and-scope*
- **V7** `//` over `rec` drifts identically on CppNix 2.35.2, 2.31.5 and Lix; the Lix-only split is the implicit mixed-`rec` attrpath merge. **Fold → NIX-LANG-06** (SHOULD) and **NIX-LANG-05** (MUST); map M-C-13 splits into two rules. Classes C9 and C10.
- **V8** Per-line rates over "the exemplars" are dominated 20:1 by NixOS/nixpkgs's full `pkgs/` tree. **Fold →** frame correction (d) and the authoring notes' measurement convention (exclude nixpkgs, say so). Class C22.
- **V9** 149 of 363 standalone `with` lines are single-expression `with types;`. **Fold → NIX-LANG-07**'s exemption list ([lang] conflict 9).
- **V10** `toString ./dir` "eliminates" the store copy. **Reject as stated:** true only outside a flake; inside a flake it yields a context-free `…-source/data` path and the sandboxed build fails ([lang] conflict 2, C5). The dive's fix was a defect. Class C22 (measured in the wrong context); the rule is NIX-LANG-02.
- **V11** The impure-builtins grep narrowed to `flake.nix` files leaves 2 tolerated hits. **Fold → NIX-LANG-04**, promoted to MUST on the planted silent `""`/`[ ]` ([lang] conflict 10).
- **V12** nixf's `sema-extra-rec`/`sema-extra-with` flag the opposite end of the hazard. **Fold → [lang] Verdict 4 and NIX-GATE-07** (editor-only); deadnix `-L` catches two of three shadow shapes ([lang] conflict 3). Class C9.

*security/trust-boundaries*
- **V13** llm-agents.nix's `AGENTS.md` tells agents to pass `--accept-flake-config`. **Fold → NIX-SEC-02** (Applied violator; agent files are in scope). Class C15.
- **V14** A `post-build-hook` from an untrusted flake executed once `--accept-flake-config` was passed. **Fold → NIX-SEC-02** rationale (mechanically reproduced #9649). Class C15.
- **V15** `nixConfig.warn-dirty = false` is a no-op. **Fold → NIX-SEC-01** (a finding key) and [inp] failure mode 16. Class C19.
- **V16** flake-checker `--check-owner` covers only nixpkgs-keyed inputs. **Fold → NIX-SEC-07** (owner-set lock diff, human merge). Class C4.
- **V17** The FOD tamper sub-probe was inconclusive (store reused the output). **Defer** (M-H-06 stays dropped as a rule): the hash-mismatch mechanism is proven by NIX-PKG-04 and NIX-GEN-09; low priority.
- **V18** nix-vscode-extensions names `hydra.iohk.io`, a substituter it does not operate, under `extra-trusted-substituters`. **Fold → NIX-SEC-01** (2 of 11 declarers violate, not 0 or 1; [sec] conflict 1).

*modules/module-authoring*
- **V19** sops-nix hand-rolls `pathNotInStore` three times. **Fold → NIX-MOD-06** (Applied violator; also `sshKeyPaths` typed `listOf types.path`). Class C14.
- **V20** The `42` twin fails with `cannot coerce an integer to a string`, never "not a module". **Fold →** nix-diagnose catalog (misattributed-diagnostics section). Class C7.
- **V21** No test target indexes `self.packages.${pkgs.system}` inside a module. **Fold → NIX-FLK-12** (directory-agnostic grep) and **NIX-MOD-05** (default through `pkgs.callPackage`, no `self` lookup).
- **V22** `types.pathWith` throws at construction on `{ inStore = true; absolute = false; }`. **Fold → NIX-MOD-06** text.
- **V23** A flake-parts option declared at file top level fails silently. **Fold → NIX-MOD-08** — the consolidation planted a dogfood `nix eval` that catches it, overturning the dive's "no cheap check". Classes C19 and C25.
- **V24** "The cheapest module check avoids `lib.nixosSystem`." **Reject:** bare `evalModules` rejects a correct service module and reading one option passes a sibling's type error ([mod] conflict 2, M4b/M4c). NIX-MOD-04 evaluates in the real host with `enable = true`. Class C22.

*Wave-3 reruns*
- **R1** nix-installer is not silent under `-v` (max gap 34 s). **Fold → NIX-INP-13** (advisory watchdog). Class C7.
- **R2** grimoire's real repo (`grimoire-rs/grimoire@55f839ce31fb`) has no `flake.nix`. **Fold → NIX-INP-14** and frame correction (d); the packaging open question "self-submodules-remote" loses its premise until a fleet repo ships a flake.
- **R3** grimoire's incidental LFS (`assets/logo.png`) broke Lix's clone. **Fold →** [inp] failure mode 13 (reading heuristic). Classes C5, C10.
- **R4** The HTTPS LFS round trip hit GitHub 429 on shared egress. **Defer** (measurement the rig cannot supply; owner-provided repo). NIX-INP-09 keeps its documented gap.
- **R5** `github:` rejects `submodules`/`lfs`. **Fold → NIX-INP-14** (keys on shape, not the suspect string, [inp] conflict 16). Class C5.
- **R6** "Unused inputs are fetched at lock, so NIX-INP-02 is MUST." **Reject:** the fixture measured the declaring flake, not an inheriting consumer ([inp] conflict 10). M-B-17 stays open and is deferred (f).
- **R7** ocx has 10 git-sourced crates, not 0. **Fold → NIX-PKG-22.** Class C22 (inherited count).
- **R8** ocx has no `--version`. **Fold → NIX-PKG-19**, and it forces cross-consolidation contradiction **E28** (FLK-15, REL-16). Class C7.
- **R9** Any `package.nix` edit recompiles all of ocx (7m12s). **Fold → NIX-PKG-20**, which authoring retires into a GATE-10 cost note (drops list).
- **R10** aws-lc-sys compiles the Rust `cmake` crate unconditionally. **Fold → NIX-PKG-17** scope clause. Class C19.
- **R11** The toolchain vanished mid-dive. **Reject as a research finding;** environment fault (external cleanup, orchestrator). Unfinished verifications are drafter work (f).
- **R12** GitHub's REST API returns schema stubs in this sandbox. **Reject as a finding;** recorded as a method note in (d): an "empty" API result proves nothing; use raw.githubusercontent.com or codeload. Class C22 risk.
- **R13** The nested-bwrap `cannot rename` was a red herring; nix-update's `replace_hash` never matches the `lib.fakeHash` symbol. **Fold → NIX-REL-17.** Class C9.
- **R14, R15** A literal `rev`/`tag` makes nix-update pair the new version with the old source's hash; "the hash changed too" proves nothing. **Fold → NIX-REL-13** raised to MUST with the C10 URL-contains-version check. Classes C9, C23.
- **R16** `tag` and `rev` behave identically under nix-update. **Fold →** map E24 settled (REL-13 example uses `tag`; NIX-PKG-02 owns the choice).
- **R17** Determinate Nix is not in nixpkgs. **Fold → NIX-REL-12** documented gap; measurement the rig cannot supply.
- **R18** No new divergence for flake-compat and README lines on 2.31.5 and Lix beyond `profile add`. **Fold → NIX-REL-05, 09.**
- **R19** NIX-GEN-16's grep could never go green. **Fold →** replaced by the two-stage grep. Class C4 (a check that cannot go red/green is no check).
- **R20** Writing `$${var}` silently disabled interpolation. **Fold →** [gen] failure mode 18 and the nix-diagnose catalog; **defer** a language rule as new row **M-C-17** (P3): a repository-wide `$${` grep has legitimate hits (literal `${` in shell text), so no admissible check exists yet. Class C9.
- **R21** ghcr.io manifest GETs 404 without an OCI `Accept` header. **Fold → NIX-GEN-05.** Class C7.
- **R22** amazon/corretto has no bare offer. **Fold → NIX-GEN-04** (watched on a selector twin).
- **R23** 0 of 1,720 image indexes carry `description`/`url`; `.source` names the mirror. **Fold → NIX-GEN-21.** Class C13.
- **R24** kitware/cmake's per-platform config blobs differ. **Fold → NIX-GEN-05** (live evidence).

### (c) Map rows affected

**Settled by a wave-4 rule** (each row cites the rule that now answers it):
- **C:** M-C-01 → LANG-01 (shadowing) and PKG-14 (`mkDerivation rec`); M-C-02 → LANG-07; M-C-04 → LANG-06; M-C-05 → LANG-02, LANG-03; M-C-06 → LANG-02; M-C-07 → LANG-04; M-C-08 → LANG-10; M-C-09 → LANG-05 plus FLK-19 (partial: `.5` floats warn only, `or`-as-identifier and token whitespace unmeasured → dated re-check); M-C-10 → GATE-06 (floor 2.34, E32); M-C-12 → premise overturned, folded into LANG-07's rationale; M-C-13 → LANG-05 and LANG-06; M-C-14 → REL-10, REL-11 (cited, not restated); M-C-16 → LANG-11.
- **H:** M-H-01 → SEC-01; M-H-02 → SEC-02; M-H-03 → SEC-03; M-H-04 → SEC-04; M-H-05 → SEC-06; M-H-07 and M-H-08 → SEC-07; M-H-09 → SEC-05; **M-H-10 promoted from Deferred** → SEC-09. M-H-06 dropped as a rule (NIX-PKG-04 and NIX-GEN-09 own the hash guarantee).
- **I:** M-I-03 → MOD-07; M-I-04 → MOD-06; M-I-05 → REL-10(e) cited; M-I-06 → MOD-05 plus FLK-12; M-I-08 → MOD-08. M-I-01 and M-I-02 dropped (models write `mkOption`/`mkIf` correctly by default; arity mistakes surface in MOD-04).
- **K:** M-K-03 → the 46-row catalog in [evaluation-failures](nix-language/evaluation-failures.md) §3 plus LANG-08 and LANG-10 (skill content, not rules).
- **From the reruns:** M-D-17 → PKG-17 (scope) and ocx built; M-D-27 → PKG-21; M-E-11 → GEN-20, GEN-22 with three documented gaps; M-E-31 → GEN-21; M-G-15 → REL-13, REL-17; M-F-18 → INP-13 (the watchdog's false-positive residue is deferred).

**Partially settled; residue deferred (see (f) for why none is a commission):** M-B-17 (inherited-node fetch), M-D-24 (ocx `--rebuild` determinism, vergen `SOURCE_DATE_EPOCH`), M-C-15 (cross-system eval determinism), M-D-23 and M-E-10 (Darwin and aarch64 builds), M-B-13 (Lix follows removal).

**New rows discovered (all deferred):**
- **M-C-17** — the `$${` string-escape trap (a literal `${`, interpolation silently off). P3; no admissible repository grep. Owner of the text today: [gen] failure mode 18 and nix-diagnose.
- **M-C-18** — a static detector for pattern-formal `rec` self-shadowing and nested `//` key drops (nixf rule, tree-sitter or `--parse` query). P3; LANG-01 and LANG-06 already have value checks.
- **M-C-19** — does eval-cache staleness (NixOS/nix#3872) reproduce through a deep module chain on 2.35.2? P3; the `--no-eval-cache` re-run step costs nothing.
- **M-H-11** — which Lix and Determinate Nix versions carry CVE-2026-39860-equivalent fixes, and do they publish advisory feeds? Dated re-check; fleet CI runs CppNix (GATE-13).
- **M-H-12** — cross-flake reuse of `trusted-settings.json` (keyed by setting and value), and whether Lix consults it. P3; SEC-02 already forbids answering "permanently".
- **M-H-13** — the macOS `sandbox` default for untrusted builds on the `macos-14` leg. Measurement the rig cannot supply; SEC-05 already requires `nix config show sandbox` = `true` before building.
- **M-I-09** — the cheapest eval-only host for `homeModules` (`homeManagerConfiguration`) and `darwinModules` (`darwinSystem` on an x86_64-linux evaluator), and whether a stub host is admissible. P2; decides NIX-MOD-04's scope beyond NixOS (E42).
- **M-D-28** — does crane's `buildDepsOnly` split cut ocx's metadata-only rebuild below 7m12s, and is the extra input worth it under NIX-INP? P3 (CONSIDER-level cost).

**Earlier map text now wrong:**
- **Artifact set decision, ID families and routing table:** "NIX-MOD conditional", "(only if `modules.md` ships)" and "its surviving rows fold into NIX-FLK" are superseded. `modules.md` ships ([mod] Verdict 1).
- **Conflict 7:** "every one a cache pair for the project's own cache" is wrong: 2 of 11 declarers go outside the allowlist ([sec] conflict 1).
- **Q12:** replaced by `nix eval --json --file ./flake.nix --apply …` with no `--impure` ([sec] conflict 4).
- **Q13:** "every hit must be a warning against it" is retired; empty output passes (SEC-02, E30).
- **Conflict 20:** confirmed, with the exemption list widened to single-expression `with lib.types;`/`lib.licenses;`/`lib.maintainers;` and standalone `with lib;` flagged like `with pkgs;` (LANG-07).
- **M-C-12:** "Nix's lazy runtime error reports [undefined variables] only when forced" is wrong without an enclosing `with`.
- **M-H-06:** dropped as a rule.
- **Wave-3 (f) flag on NIX-FLK-03:** closed; 2.31.5 agrees and Lix is lenient on `apps` (V1).
- **Wave-3 (g) "held-out round planned for wave 5":** moved into phase 8 as a binding sweep (Authoring notes, item 14).
- **Staged wave-4 text "modules is the first cut":** moot; it ran.

### (d) Frame corrections

- **H8, corrected in scale.** 2 of 11 `nixConfig` declarers exceed the allowlist; 8 of 36 non-implementation repositories pass `--accept-flake-config`, including an `AGENTS.md` and CI that accepts a *third-party flake on a floating ref*; a flake's `post-build-hook` executes once accepted (reproduced); a "permanent" answer is stored per (setting, value), not per flake ([sec] Verdict 3, SEC-02).
- **H9, sharpened again.** Lix 2.95.2 also accepts unknown `apps` attributes (third leniency gap); rejects all four mixed-`rec` attrpath shapes that CppNix accepts; defaults IFD to `true` like CppNix. `--option lint-url-literals fatal` works from CppNix 2.34 and is a silent unknown-setting no-op on 2.31.5 (exit 0) ([lang] conflict 1).
- **New: secrets reach the world-readable store without being read.** A tracked, never-read `secret.env` lands at mode 444 once anything interpolates `self`; a token in `curlOptsList` sits in the 444 `.drv` after `nix eval` alone ([sec] Verdict 4).
- **New: IFD is not the only unsafe part of inspecting a flake.** `nix develop` runs the `shellHook` as the user with the real `$HOME`; `show`/`check --no-build` build IFD by default ([sec] Verdict 5).
- **New: a module exported by a flake fails only when composed** (twice-imported anonymous module, overlay injection under `readOnlyPkgs`, wrong host class, top-level flake-parts option) — new failure class C25 in (f).
- **The frame's corpus description is wrong on one point.** The nixpkgs clone is not "narrower": it holds the full `pkgs/` tree (about 4.5M lines) and dominates per-line rates 20:1. Every corpus rate states whether it excludes `NixOS__nixpkgs`.
- **Q7 stands, and `modules.md` ships anyway**, for adopters (c) and templates; NixOS/templates is the worst module violator ([mod] Applied).
- **Fleet data.** grimoire's remote `grimoire-rs/grimoire@55f839ce31fb` has **no `flake.nix`** and carries LFS files the build never reads; ocx carries **three** submodules (`external/{docker_credential,rust-oci-client,sigstore-rs}`), **10** git-sourced crates from 2 revisions, **no `--version`** (a `version` subcommand), a measured **7m12s** per-PR build, and all three fleet packages are **Apache-2.0**, not dual-licensed ([pkg] conflicts 12, 14, 16, 19; [inp] Verdict 9).
- **Tooling facts.** nix-update's missing write-back is `replace_hash` text-matching the evaluated old hash, not nested bwrap ([rel] REL-17). Determinate Nix is installer-distributed and absent from nixpkgs, so this rig cannot run it ([rel] Verdict 7).
- **Measurement environment.** An external cleanup deleted `~/.cache/research-lang` during waves 3-4; the orchestrator rebuilt the identical toolchain (same store path; `run.sh nix --version` → 2.35.2, re-checked by this harvest) and re-fetched all 38 exemplars at their cited SHAs. Fixtures were not rebuilt: all cited fixture trees except `nix-generated-flakes-rev3/` are gone. In this sandbox, GitHub's REST API returns schema stubs for directory listings while raw.githubusercontent.com and codeload work, so an empty API answer proves nothing.

### (e) Cross-consolidation contradictions

Every ruleset on disk (FLK, GATE, GEN, INP, PKG, REL, LANG, SEC, MOD) was read
against every other. Numbering continues from E27. The drafters keep the named
ID's text and edit the other to cite it; no consolidation was edited here.

- **E28. NIX-FLK-15 (`nix run .#<name> -- --version` in CI) and NIX-REL-16 (`nix run github:…/<tag> -- --version | grep -F -w <version>`) vs NIX-PKG-19 (ocx has no `--version`).** Applied literally, ocx's CI smoke and release smoke both fail with `unexpected argument '--version' found`, and the tempting fix mirrors PKG-19's forbidden move. **PKG-19 keeps the entry-point text.** FLK-15 and REL-16 keep their rules; their commands take "the version entry point PKG-19 names" (`-- --version` by default; ocx: `-- version`). The release skill's ocx line is `nix run github:ocx-sh/ocx/vX.Y.Z -- version`.
- **E29. NIX-REL-09 and NIX-REL-16 bind "A and D" vs NIX-GEN-13, [gen] Verdict 3 and NIX-REL-07 (D cuts no tags).** A D flake has no `packages.default` and no tags, so REL-09's default `nix run github:<owner>/<repo>` and REL-16's `…/<tag>` are undefined for it. **REL-16 binds A only**; D's release-time proof is NIX-GEN-15's smoke build plus [gen] Verdict 3 ("execute every `nix run` example"). **REL-09 keeps the A block**; a D README names a single-binary attribute for `nix run` and uses `nix shell` for multi-binary packages (**GEN-13 keeps the D text**).
- **E30. NIX-SEC-02 (repo-wide grep, empty output passes) vs NIX-REL-09's README-only `accept-flake-config` grep and [rel] failure mode 9 ("every hit must be a warning against it (map Q13)").** **SEC-02 keeps the text and the grep.** REL-09 keeps the install-block shape and cites SEC-02 for the flag; failure mode 9's Q13 wording is struck.
- **E31. NIX-SEC-05 vs NIX-INP-12's last sentence** ("Evaluate any flake you do not own at a full commit SHA with `--no-write-lock-file`"), a weaker duplicate without the IFD flag. **SEC-05 keeps it**; INP-12 drops the sentence and cites SEC-05 ([sec] conflict 5 already called the dive's credit to INP-12 wrong).
- **E32. NIX-GATE-06's floor note ("native W12 is Nix ≥2.35 `lint-url-literals fatal`") vs [lang] conflict 1** (2.34.8 exits 1; 2.31.5 prints `unknown setting` and exits 0). **GATE-06 keeps the rule**; its floor note reads "≥2.34; a silent no-op below, so never a consumer-floor check". The measured number wins.
- **E33. NIX-FLK-06 ("the evaluating check itself is left to NIX-MOD"), [flk] Verdict 9 ("C … conditional NIX-MOD") and the map's Artifact set vs NIX-MOD shipping.** **NIX-MOD-04 owns the evaluating check.** FLK-06 stays SHOULD as the "a green `nix flake check` proves nothing about modules" rule and cites MOD-04; every "conditional" qualifier is removed.
- **E34. [gen] Verdict 10 lists four prototype breaks; the other families' rules bind the same files.** Swept by reading in this harvest: `nix-generated-flakes/prototype/lib/mk-package.nix:67,80` override `unpackPhase` and `installPhase` without `runHook` (**NIX-PKG-11**, which [pkg] Applied binds to D); `prototype/flake.nix` sets `formatter = …nixfmt` (bare, **NIX-GATE-01**); `prototype/flake.nix:3` pins a rev in `url` with no "frozen on purpose" comment (**NIX-INP-03**, which [inp] Verdict 11 binds to D). **Each named rule keeps its text**; the handoff and the ocx ADR list **seven** breaks, all to fix before adoption.
- **E35. [mod] fleet commitment ("the module lives in `nix/module.nix` next to `package.nix` … `pkgs.callPackage ../package.nix { }`") vs NIX-PKG-06** (`package.nix` at the root; no `../` in `package.nix`). The `../` sits in `module.nix`, which PKG-06 does not bind, so only the phrase "next to" is wrong. **PKG-06 keeps its text**; the commitment reads "module at `nix/module.nix`, `package` default `pkgs.callPackage ../package.nix { }`".
- **E36. NIX-PKG-07's rule text names `meta.homepage` in its MUST presence set, while its watched jq checks only description, license and platforms; NIX-GEN-21 omits `homepage` when the index lacks it.** **PKG-07's MUST presence set is exactly what its jq checks**; `homepage` is SHOULD in the text; **GEN-21 keeps the D text** (and GEN-14 the license exception, E15).
- **E37. NIX-REL-11's workflow heuristic ("every `abort-on-warn` hit names a single attribute") vs NIX-GEN-14's check over the whole `.#packages.x86_64-linux` set.** GEN-14 is safe because `packages` holds no deprecation shims (GEN-06, GEN-18). **REL-11 keeps the scope text**, reworded to "named current attributes, or a `packages.<system>` set that carries no deprecation shims"; GEN-14 keeps its check.
- **E38. NIX-LANG-05 (MUST) is checked only by NIX-GATE-16's non-blocking Lix leg.** Tension, not contradiction. **Both keep their text**; per [lang] Q-LANG-1's default, a Lix-leg red on a mixed-`rec` merge is a MUST finding a reviewer acts on, and GATE-16's text says so. The leg stays advisory for every other red.
- **E39. NIX-LANG-02 ("reference a file only through interpolation") vs NIX-FLK-07 and NIX-PKG-15** (`"${src}/Cargo.lock"` is an interpolation, and forbidden). Different phases: LANG-02 governs strings that reach a builder at build time; FLK-07 governs values *read during evaluation* (`readFile`, `importTOML`, `cargoLock.lockFile`). **All keep their text**; language.md's LANG-02 adds "for build-time references; eval-time reads use the source-tree path (NIX-FLK-07)".
- **E40. NIX-FLK skeleton A (one input, no `inputs.self`) vs [inp] Applied / E22 (nixpkgs plus flake-compat) and NIX-INP-09 / [pkg] Verdict 5, 10 (ocx and grimoire declare `inputs.self.submodules = true`).** The verified skeleton is the minimal A shape, not the fleet template. **FLK keeps skeleton A** as the portable example; the nix-flake-adopt fleet template is skeleton A + `inputs.flake-compat` (REL-05) + `inputs.self.submodules = true` for ocx and grimoire (INP-09) + the PKG workspace `package.nix`, and must be re-verified as composed (nixfmt, deadnix `-L`, Q5, `--all-systems`, build).
- **E41. [sec] Applied ("the gate adds the SEC-02, SEC-03, SEC-08 and SEC-09 greps and the SEC-04 `git ls-files` check") vs the canonical, index-owned gate block (E8), which carries none.** **The gate block (index) gains one step** running those greps; security.md keeps the rules and their rationale.
- **E42. NIX-MOD-04's MUST covers every exported module, but its only watched recipe is NixOS (`lib.nixosSystem`).** For `homeModules` and `darwinModules` no host recipe was measured (M-I-09). **MOD-04 is MUST for `nixosModules`** and SHOULD for other hosts until a host recipe is watched red and green; the principle ("evaluate in the real host with the module enabled") is stated for all.
- **E43. NIX-LANG-08 ("record `nix --version` and the input shape before matching an error") vs index NIX-CORE-04 ("read the era first").** Overlap, bounded. **CORE-04 keeps the general rule** (choose idioms by era); LANG-08 keeps the diagnosis keying and cites CORE-04.
- **E44. NIX-LANG-04 (no `getEnv` reachable from outputs) vs NIX-SEC-04 (no secret read with `getEnv`).** Same construct, two harms. **LANG-04 keeps purity, SEC-04 keeps secret placement**; each cites the other; one grep serves both.
- **Carried from earlier harvests and still unapplied in the consolidation text** (drafter edits): E11 (GATE-09 triage row: author defect, FLK-07), E12 (GATE-16 Lix leg adds `--extra-experimental-features flake-self-attrs`), E13 (gate step 7 = INP-06's full command), E14 (PKG-08's "in CI" clause narrows to named packages' `meta.license`), E16 (FLK-07 example `./Cargo.toml`), E19 (PKG-01's builtin half cites INP-10), E27 (gate step 6 builds every own package).
- **No conflict found** in these pairs (recorded so no drafter re-litigates them): SEC-04 ↔ MOD-06 (MOD owns the secret-path type; SEC cites it); SEC-07 ↔ INP-11 (INP opens the weekly PR, SEC diffs owners and a human merges); SEC-06 ↔ GATE-13, GATE-16 (floor 2.31.5 above the 2.31.4 fix); SEC-01 ↔ REL-15 (same pair; REL owns the README half); MOD-02 ↔ FLK-04; MOD-08 ↔ FLK-10; MOD-05 ↔ INP-02; LANG-01 ↔ GATE-05 (deadnix catches two of three shapes); LANG-06 ↔ PKG-14; LANG-04 ↔ REL-05 and INP-10 (shims exempt in all three); SEC-03 ↔ GATE-13 (`github_access_token`); GEN-10's `lib.fakeHash` grep ↔ PKG-03/04 and REL-17 (a fake hash is transient in an edit and never committed).

### (f) Convergence

**Failure classes.** Every failure mode in the nine consolidations, grouped by
mechanism, each with the check that catches it. C1-C24 are the earlier
classes; only this harvest's new instances are listed for them.

- **C1** Checker-contract shape violation. New instances: none (Lix `apps` leniency is C10). Check: gate step 4.
- **C2** Hidden default scope. None new. Check: `--all-systems`, the FLK-08 grep.
- **C3** A warm store or host masks a cold failure. New: a context-free path builds on a host that already holds it, off-sandbox (LANG-02). Check: the sandboxed build (GATE-10), `--apply builtins.hasContext`.
- **C4** A green gate that does not exercise the property. New: `nix flake check --no-build` trips none of eight language idiom fixtures (LANG); a module read one option at a time, or with `enable = false`, or through bare `evalModules` (MOD-04); flake-checker read as a supply-chain audit (SEC-07); a laziness-deferred undefined name under `with` (LANG-07); an unexecuted `nix run` example (GEN Verdict 3); a check that cannot go green (GEN-16's old grep). Check: an exercising step (force with `toJSON`, real-host eval, sandboxed build, the lock owner diff).
- **C5** The source set differs from the working tree. New: incidental LFS on a third-party repo (INP failure mode 13); `github:` carrying no submodule content (INP-14). Check: the `.gitattributes`/`.gitmodules` greps, reading one submodule file.
- **C6** Era drift. New: `homeManagerModules`/`hmModules` (MOD-02); `lint-url-literals` below 2.34. Checks: MOD-02 grep, `nix --version` first.
- **C7** A misattributed diagnostic. New: one "infinite recursion" string, five causes (LANG-10); the `42` module twin reading as a coercion bug (V20); nix-installer's silence read as a hang (INP-13); a manifest 404 read as a missing package (GEN-05); `versionCheckPhase`'s `--version` failure read as a CLI bug (PKG-19). Check: isolate on twins, then the catalog keyed by shape.
- **C8** A floating reference. New: inspecting a third-party flake by branch (SEC-05); CI accepting a third-party flake's config on a moving ref (SEC-02 worst class). Check: a 40-hex rev in the command.
- **C9** A command, mode or primitive that exits 0 while doing less than its name implies. New: `getEnv` → `""` and `nixPath` → `[ ]` under pure eval (LANG-04); `nix eval --json` collapsing to `outPath` (LANG-11); `//` keeping stale `rec`-derived values (LANG-06); `lint-url-literals` as an unknown setting (exit 0); nix-update leaving the `lib.fakeHash` symbol (REL-17) and pairing a literal ref with a stale hash (REL-13); `$${` disabling interpolation (GEN failure 18); flake-checker exiting 0 on findings without `--fail-mode` (SEC-07); nixf lints aimed at the opposite end of the hazard (LANG Verdict 4). Check: assert the expected effect (value, URL, hash, grep of the file) after the command.
- **C10** Cross-implementation divergence. New: Lix rejects all mixed-`rec` merges (LANG-05); Lix accepts unknown `apps` keys (FLK-19); Lix lacks `self.lfs` and gates `self.submodules` (INP-09). Check: the Lix leg (GATE-16, with E12's flag), FLK-19's CppNix rerun.
- **C11** The sandbox and network boundary. New: IFD executing during a "read-only" inspection of an untrusted flake (SEC-05). Check: `--option allow-import-from-derivation false`.
- **C12** Prebuilt runtime linkage and wrapping. New: an entrypoint wrapping the raw payload drops the package's env (GEN-22). Check: the env-var twin.
- **C13** Consumer-visible noise and metadata loss. New: `.source` mapped to `homepage` sends consumers to the mirror; a synthesised description (GEN-21). Check: the GEN-21 grep and index census.
- **C14** A second source of truth that drifts. New: a hand-rolled `pathNotInStore` copied three times (MOD-06); a remembered CVE floor instead of the fix table (SEC-06). Checks: the MOD-06 probe, `cve-floor.nix` against `nix --version`.
- **C15** A credential or trust boundary. New: `--accept-flake-config` in 8 of 36 repos and an `AGENTS.md` (SEC-02); a tracked, never-read secret at mode 444 and a token in a `.drv` (SEC-04); `trusted-users` advice (SEC-08); a `shellHook` of an untrusted flake running as the user (SEC-05); a secret path typed `types.path` (MOD-06); a "permanent" trust answer applied to every flake (SEC failure 11). Checks: the SEC greps, `git ls-files`, the `.drv` grep, the MOD-06 store-path probe.
- **C16** A style lint treated as a defect. None new.
- **C17** Consumer-graph leakage. None new (M-B-17 open).
- **C18** Derivation-identity churn. None new.
- **C19** An ignored declaration. New: `nixConfig` keys beyond the allowlist, including `allow-import-from-derivation = false` and `warn-dirty` (SEC-01); a flake-parts option at file top level (MOD-08); the `cmake` wrapper crate read as a CMake requirement (PKG-17). Check: probe the effect, never the declaration.
- **C20** Diagnostic drift. New: seven measured string splits across CppNix 2.20.6/2.31.5/2.35.2 and Lix (LANG-08); an upstream issue that no longer reproduces (#8013); `does not exist` vs `No such file or directory` for one missing submodule file (INP-09). Check: key the catalog by (shape, implementation, version).
- **C21** Untrusted data interpolated into a build script, or expanded in the wrong phase. New: `${self.env.KEY}` spliced as `"$KEY"` and expanded by the builder at build time (GEN-20 Gap 1). Check: GEN-20's literal-line and `self.env` twins.
- **C22** Broken evidence. New: `toString` measured outside a flake and generalised (V10); per-line rates dominated by nixpkgs (V8); a lazy-fetch fixture that measured the declaring flake, not the consumer (R6); an inherited "0 git dependencies" count (R7); the bare-`evalModules` check's false negative (V24); GitHub REST stubs read as absence (R12). Check: vary one variable per twin, state the context (in or out of a flake, which corpus slice), re-run inherited counts on the live file.
- **C23** A fabricated or truncated identifier. New: a literal `rev`/`tag` that nix-update leaves pointing at the old release while the hash moves (REL-13). Check: REL-13's URL-contains-version eval.
- **C24** A dependency in the wrong role, or in no role. New: a string with its context discarded (`toString`, `unsafeDiscardStringContext`) adds no `inputDrvs`, so the dependency is undeclared (LANG-02). Check: the sandboxed build, `builtins.hasContext`.
- **C25 (new this wave) Composition-only failure: an export that evaluates and builds inside the author's flake errors, or silently does nothing, only once a consumer composes it.** Instances: an anonymous or `importApply` module imported twice (MOD-01: `already declared`); an exported module injecting `nixpkgs.overlays` under the consumer's `readOnlyPkgs` (MOD-05); a module imported into the wrong host class (MOD-03); a flake-parts option declared at file top level (MOD-08); a Python library exported only top-level, invisible to every `python3NN.pkgs` (PKG-21); `extraConfig` of `types.lines` that a consumer cannot merge or `mkForce` (MOD-07). Check: evaluate the export the way a consumer composes it — a separate consumer flake (PKG-21's two-interpreter probe, FLK-13's cross-flake drvPath), import twice (MOD-01's `isPath`/`key` filter), `readOnlyPkgs` (MOD-05), the dogfood `nix eval` (MOD-08). **New:** no earlier class covers it (C17 is lock-graph cost; C14 is drift between two bodies).

**Result.** This harvest's inputs added **23 MUST rules** (18 in three newly
opened families, 5 from the reruns) and **one new failure class (C25)**. By the
wave-plan stop condition the program has **not converged**: the MUST and class
clauses both fail, and no held-out round on fresh trees has run.

**MUSTs resting on an unwatched or partly watched verification** (the drafters
plant and run each one; none is a research question):
- NIX-GEN-20: the `self.env` inlining watched at shell level only; the mixed-token throw found by reading. NIX-GEN-22: the throw on a non-empty `entrypoints`/`dependencies` never run. NIX-GEN-21: no flake-level twin asserting evaluated `meta` against the index.
- NIX-PKG-21: the `_pyPrev` rename and FLK-13's drvPath equality for this shape are unbuilt edits.
- NIX-INP-09: `self.lfs` over a real HTTPS LFS remote not completed (GitHub 429).
- NIX-SEC-01, 02, 05: not run on CppNix 2.31.5. NIX-SEC-06: 2.35.0 and 2.35.1 treated as fixed without evidence.
- NIX-MOD-04: no host recipe for `homeModules`/`darwinModules` (E42). NIX-MOD-03, 06: introduction release of `_class` checking and `types.pathWith` unmeasured.
- NIX-FLK-15, NIX-REL-16: correct only after E28's entry-point edit for ocx.
- Every wave-2-to-4 fixture is gone, so every "watched red" cell except GEN's `rev3/` rows is recorded-only until re-planted.

**The tail decision: is any remaining open question load-bearing AND answerable by a source read or a fixture run?** Every open question in the nine "Open questions" sections, plus the dated items, classified:

- **Dated re-checks** (recorded with the date or version; rechecked at authoring and at each release): QQ== anonymous pull (2026-09-27); x86_64-darwin on nixos-26.05 until end-2026; flake-checker's binary branch list (0.2.15); magic-nix-cache v15; nixfmt directory mode (1.5.0); install-nix-action's implied Nix (v31.11.1 → 2.35.2); the computed floor (`nix_2_31`); git-hooks.nix hook names; Lix 2.95.2's leniency gaps (`formatter`, overlay arity, `apps`), `self.lfs` absence, `flake-self-attrs`, follow-cycle `stack overflow`, rejected `--update-input` and `profile add`, `.5` floats, `or`-as-identifier, token whitespace, and the follows-removal proposal (M-B-13); NixOS/nix#14339, #8013, #3872 (M-C-19); nixpkgs#356002 (bare `--replace`); nixpkgs PR #370967 (module error contexts); `nixexprs.tar.xz` end (2027-12-31); nurl 0.4.1's `tag` emission; nixpkgs rustc 1.98.1 vs channel 1.95.0; flake-compat repository status; FlakeHub semver resolution; GHSA-jm6c status; Lix and Determinate advisory parity (M-H-11).
- **Measurements this rig cannot supply:** aarch64-darwin and aarch64-linux `-sys` builds (M-D-23); prebuilt Darwin `install_name_tool`/`codesign` (M-E-10); the macOS `sandbox` default for untrusted builds (M-H-13); gates/ci-live (cache restore inside 10 GB, arm64 and macOS runner budgets); Determinate Nix behaviour (not in nixpkgs); `self.lfs` over HTTPS (shared-egress 429; needs an owner-provided repo); `inputs.self.submodules` fetched as `github:<fleet>/<rev>` (no fleet repo ships a `flake.nix` yet; becomes a post-adoption check).
- **Owner decisions, default applied:** Q1-Q8 (frame); Q-LANG-1 (Lix leg advisory, LANG-05 an authoring MUST), Q-LANG-2 (list-scoped `with pkgs;` tolerated); agents may `nix develop` the fleet's own flakes at reviewed commits, never a fork's PR or a third party's; no upstream PRs from this program (`--accept-flake-config` CI, `.tar.xz` inputs); `modules.md` not in the index non-negotiables, SEC cites MOD-06; lock-bump token = GEN-16's App, fallback a fine-grained PAT; fleet nixpkgs branch `nixos-unstable`; forked submodules kept with `inputs.self.submodules`; exact Rust channel only in a devShell; Lix grimoire users get a README note; no git SHA in `ocx version`; fleet systems `x86_64-linux aarch64-linux aarch64-darwin`; `overlays.default` yes; no `apps` for `ocx-shim`; no `templates.default`; plain devShell plus nix-direnv; no allowlist of accepted `--all-systems` reds; generated flake: omit missing licenses, reviewed-PR updates until signatures (M-E-20), eval-only Darwin, drop musl, ADR requests for the resolved projection and the license annotation, `cmake-gui` via the ignore list, `deps` translation refused with `throw` until real data.
- **Answerable now, and not load-bearing** (each would refine a rule's evidence or scope; none can overturn a MUST, and each is either a drafter's re-plant or a P3 row):
  - M-B-17 inherited-node fetch: at stake is INP-02 SHOULD vs MUST and one flake-compat tarball; SHOULD is the conservative default and [inp]'s source reading predicts no fetch.
  - M-F-18 watchdog false positive: INP-13 is advisory by design.
  - M-C-19 (#3872), M-C-18 (static detector), M-C-15 (cross-system determinism): LANG-01/06/09 already carry value checks or cost nothing.
  - The context-free store path after `nix copy` (home-manager `HOME_MANAGER_PATH`): strengthens LANG-02's rationale only.
  - The full Lix fixture enumeration: Lix is advisory (Q6) and FLK-19 already requires a CppNix run.
  - SEC floor parity on 2.31.5 and the 2.35.0/.1 question: SEC-02 is a grep and SEC-05's flags predate the floor; the drafters re-plant on 2.31.5, and SEC-06's table conservatively requires ≥2.35.2 for the 2.35 line (Authoring notes, item 7).
  - M-H-12 (`trusted-settings.json` reuse), the FOD tamper probe: SEC-02 and PKG-04 already cover the behaviour.
  - M-I-09 (home/darwin hosts): MOD-04 is scoped to NixOS for its MUST (E42); modules bind no fleet flake (Q7).
  - `_class`/`pathWith` floors: a one-command availability eval per supported branch, run by the drafters (item 7). The shallow nixpkgs clone's release notes do not mention `pathWith` (checked by this harvest), so the answer is an eval, not a read.
  - M-D-24 (ocx `--rebuild` determinism, vergen): no MUST depends on output determinism (REL-03 is about `drvPath`).
  - PKG-16's `checks` form (E25): a placement choice; it ships as a CI step.
  - M-D-28 (crane cost), nix-update `cargoHash` (fleet flakes use `cargoLock`; nixpkgs copies wait for Q3).
  - GEN's Nix-level twins (GEN-20, 21, 22) and the README `nix shell` example: the rule texts are settled; the prototype's non-compliance is known and listed (E34); planting them is drafter and phase-8 work.

**No remaining open question is both load-bearing and answerable.** The strict
stop condition is not met (new MUSTs, new class C25, no held-out round), but
per the orchestrator's budget rule the tail is closed: a further research round
would re-plant cheap verifications that phase 7 must re-plant anyway. The
held-out round therefore moves into phase 8 as a **binding** sweep (Authoring
notes, item 14): if it adds a class beyond C1-C25 or a MUST, the drafters revise
the depth file and log it; they do not reopen research.

### (g) Residue

next_wave and rerun_wave are empty. What the program deliberately leaves open,
each already filed above with its reason:
- **Deferred rows:** M-B-13, M-B-15, M-B-17, M-C-03, M-C-11, M-C-15, M-C-17, M-C-18, M-C-19, M-D-20, M-D-21, M-D-22, M-D-24, M-D-28, M-F-20, M-G-13, M-H-11, M-H-12, M-H-13, M-I-07, M-I-09, M-K-04, M-K-06.
- **Unmeasurable here:** M-D-23, M-E-10, gates/ci-live, Determinate Nix, `self.lfs` over HTTPS, remote `self.submodules` on fleet repos.
- **ADR items handed to ocx:** M-E-20 (signature verification), M-E-29 (resolved projection), license annotation required, `upstream.repository_url` for `ocx/cli` and `ocx/mirror`, anonymous manifest 404 for `grimoire/cli`, `ocx/cli` and `ocx/mirror`.
- **Drafter obligations, not research:** every NOT RUN or recorded-only verification in (f), re-planted and watched red and green under `fixtures/nix-authoring/`.

**Verdict: ready-to-draft** (not converged by the strict stop condition; the tail is closed by the load-bearing clause, and the held-out round is binding in phase 8).

## Authoring notes (binding on the drafters)

These bind phase 7 (authoring) and phase 8 (validation). Where they conflict
with a consolidation, they win; where they are silent, the consolidation's
ruleset and the (e) resolutions above decide.

**1. The one rule and its globs.** Ship exactly one rule, `rules/nix-quality.md`,
with frontmatter `paths: ["**/*.nix", "**/flake.lock", "**/statix.toml"]` —
these three, quoted, in this order, no others. `.envrc`,
`.github/workflows/*.yml`, `treefmt.toml`, README install blocks and generated
data names (`data.json`, `sources.json`) are never globbed; the index routes to
them by task. The index stays under 200 lines. Depth files live in
`rules/nix-quality/`, one family per file, a table of contents in any file over
100 lines, no links between depth files (cross-family references are by rule ID
only). Checker: `python3 scripts/check-artifacts.py --root ~/.cache/research-lang/exemplars/nix/nix-community__disko`
behind `if [ -d … ]` (disko carries `flake.nix`, `flake.lock`, `*.nix` and
`statix.toml`, so no glob needs `--allow-absent`).

**2. Depth files, their families, sources and routing phrases.**

| File | Family (IDs shipped) | Draw from | Routing phrase in the index (task-worded) |
|---|---|---|---|
| `flakes.md` | NIX-FLK-01..19 | [nix-flakes.md](nix-flakes.md) Verdict 1-11, Checks 1-9, skeletons A and B, failure modes; apply E6, E16, E28, E33, E40 | writing or restructuring `flake.nix` outputs, iterating systems, instantiating nixpkgs, adding packages, overlays, apps, devShells, formatter, checks or templates |
| `inputs.md` | NIX-INP-01..14 | [nix-inputs.md](nix-inputs.md) Verdict 1-11, Checks A-D (Q1-transitive), failure modes; apply E13, E31 | adding, removing or retargeting an input, writing `follows`, bumping or reviewing `flake.lock`, using submodules, LFS or sub-flakes |
| `packaging.md` | NIX-PKG-01..19, 21, 22 (PKG-20 retired) | [nix-packaging.md](nix-packaging.md) Verdict, groups A-G, the Rust template, the ocx workspace variant, failure modes; apply E14, E19, E36 | writing or editing a derivation or `package.nix`: fetchers and hashes, `src` filtering, `meta`, phases, version checks, Rust or Python builders |
| `generated-flakes.md` | NIX-GEN-01..22 | [nix-generated-flakes.md](nix-generated-flakes.md) Verdict 1-11, groups A-E, failure modes, the general-adopter mapping (Applied); ocx appears only as the worked example, stripped to mechanism | packaging a binary you did not build, or generating packages from an external index (committed data, reader, updater) |
| `gates.md` | NIX-GATE-01..16 | [nix-gates.md](nix-gates.md) Verdict, GATE-01..16, the `--all-systems` triage table; apply E11, E12, E13, E27, E32, E38; PKG-20's cost fact as a note under GATE-10 | running or wiring the gate: formatter, deadnix, statix, `nix flake check`, the CI workflow, installer, cache, implementation legs |
| `release.md` | NIX-REL-01..17 | [nix-release.md](nix-release.md) Verdict 1-9, Checks 1-6, failure modes; apply E28, E29, E30, E37 | choosing a version string, tagging or publishing, deprecating an output, writing install instructions, supporting non-flake users, running nix-update, preparing a nixpkgs copy |
| `language.md` | NIX-LANG-01..08, 10, 11 (LANG-09 retired) | [nix-language.md](nix-language.md) Verdict 1-7, groups A-F; apply E39, E43, E44 | writing Nix expressions — `rec`, `let`, `with`, `//`, paths and string context, impure builtins — or reading an evaluation error |
| `security.md` | NIX-SEC-01..09 | [nix-security.md](nix-security.md) Verdict 1-8, Checks 1-6, failure modes; apply E30, E31, E41, E44 | touching `nixConfig`, tokens, secrets, substituters or trusted keys, the Nix version CI runs, or evaluating a flake you do not own |
| `modules.md` | NIX-MOD-01..08 | [nix-modules.md](nix-modules.md) Verdict 1-8, Checks 1-5, failure modes; apply E33, E35, E42 | writing a NixOS, home-manager, nix-darwin or flake-parts module a flake exports, or the check that evaluates one |

Extra routing rows: "editing `.envrc`, a Nix job in `.github/workflows/`,
`treefmt.toml` or a README install block → `flakes.md`, `gates.md`,
`release.md`"; "diagnosing an evaluation, build or check failure → the
`nix-diagnose` skill". Each depth file opens with its Era line (item 8).

**3. Index-owned rules (NIX-CORE) versus depth-owned rules.** The index owns
exactly:
- **NIX-CORE-01** never weaken a check to get green (no disabled lint, no `--no-verify`, no dropped system, no `doInstallCheck = false`);
- **NIX-CORE-02** watch a check red on a planted violation before trusting its green;
- **NIX-CORE-03** every check states what empty output and each exit code mean;
- **NIX-CORE-04** read the era first: `nix --version` (implementation and version) and the locked nixpkgs ref (`jq -r '.nodes.nixpkgs.original.ref' flake.lock`, read with `.locked.type`) before choosing an idiom;
- **NIX-CORE-05** identify the flake shape (A app, B library, C module, D generated, E template) before applying a rule, using M-J-05's heuristic and each depth file's shape bindings;
- **NIX-CORE-06** generated Nix and data files carry a generated-by header, sit in the GATE-04 exclude list, are emitted deterministically (GEN-17) and are regenerated, never hand-edited.

The index also carries: the **gate block** (below), a **non-negotiables list**
(item 4), the routing table, and the siblings line (`rust-cargo`,
`python-packaging`, `go-modules`, `docs-quality`, `bazel-quality`). Everything
else is depth-owned. The gate block is GATE's nine steps with E12, E13 and E27
applied, plus two added lines — FLK-16's `git ls-files --others --exclude-standard .`
before step 4, and one security step (E41) running the SEC-02, SEC-03 and
SEC-08 greps and SEC-04's `git ls-files` pattern check — each line commented
with its rule ID and its pass condition.

**4. Bounded duplication.** The index's non-negotiables list is at most 15
one-line MUST restatements, each ending in its rule ID, drawn from: FLK-16,
FLK-07 (with PKG-15), FLK-08 and FLK-09, FLK-12, FLK-19, PKG-03 and PKG-04,
PKG-05, REL-01 and REL-02, LANG-02, LANG-04, LANG-10, SEC-02, SEC-04, SEC-05,
REL-11. Gate-block rules are not repeated there. Skills may repeat MUST rows
only inside a `| # | Finding | Rule |` table (the Rule cell holds the ID); never
as a rule-ID-first row, and never the depth text. No depth file restates a
rule another family owns: it cites the ID.

**5. Pinned decisions and defaults** (a pinned decision is a default an adopter
may override; mark each so in the text):
- Q1 no FlakeHub, as input or target (REL-06 MUST for the fleet). Q2 no public cache; no fleet `nixConfig` (SEC-01, REL-15). Q3 `package.nix` by-name-ready now, nixpkgs later (REL-14 CONSIDER). Q4 generated flake at `ocx-sh/ocx-nix`, generator an `ocx` subcommand. Q5 keep every digest until `data.json` passes 20 MB. Q6 CppNix gated, Lix and the floor advisory, Determinate untested and never deliberately broken. Q7 no fleet modules; `modules.md` ships for adopters. Q8 consumer floor = GATE-16's computed floor (today `nix_2_31` = 2.31.5), never hardcoded.
- Carried owner defaults: fleet systems `x86_64-linux aarch64-linux aarch64-darwin` on `nixos-unstable`; `overlays.default` exported; `formatter = pkgs.nixfmt-tree` MUST for fleet flakes (a project commitment in the adopt skill, not the portable rule, E3); no `apps` for `ocx-shim`; no `templates.default`; plain `mkShell` plus nix-direnv; fleet skeleton inputs = nixpkgs + flake-compat (E22, E40); ocx and grimoire declare `inputs.self.submodules = true`, no `self.lfs`; stock `rustPlatform` plus the PKG-16 floor step; never crane or rust-overlay in a fleet flake (E21, adopt skill only); weekly lock PR under the GEN-16 App token, human-merged (INP-11, SEC-07); no git SHA in `ocx version`; Lix consumers of grimoire get a README note; Q-LANG-1 and Q-LANG-2 per [lang].

**6. Rules dropped at authoring.** IDs are never renumbered; a dropped ID is
retired, listed once in its depth file's "Retired" line, and never reused.
- **NIX-LANG-09** (localization order) → a procedure; it becomes steps in `nix-diagnose`. LANG-08 and LANG-10 stay as rules.
- **NIX-PKG-20** (GATE-10's Rust build cost) → CONSIDER with no red/green pair and no diff it changes; one cost note under GATE-10 in `gates.md` ("ocx: 7m12s per PR on x86_64-linux; a warm vendor derivation saves fetches, not compile time").
- **Sentences dropped** (the IDs stay): INP-12's untrusted-evaluation sentence (E31); PKG-01's builtin-fetcher half (E19, INP-10 owns it); PKG-08's unscoped "in CI" (E14); [rel] failure mode 9's Q13 wording (E30); FLK-07's `../Cargo.toml` example (E16); every "conditional NIX-MOD" qualifier (E33).

**7. Scope and severity edits the drafters apply** (each watched red and green
before it ships): E28's entry-point wording in FLK-15 and REL-16; E29's REL-16
scope (A only) and REL-09's D README form; E36's PKG-07 presence set; E37's
REL-11 wording; E42's MOD-04 scope (MUST for `nixosModules`, SHOULD elsewhere);
E32's GATE-06 floor (2.34). SEC-06's fix table requires ≥2.35.2 for the 2.35
line until a source read shows 2.35.0 and 2.35.1 carry the fix. For MOD-03 and
MOD-06, run `nix eval --json github:NixOS/nixpkgs/nixos-26.05#lib.types --apply 't: t ? pathWith'`
and the same on `nixos-25.11`, record the result as the floor, and state the
fallback only if a supported branch lacks it.

**8. Version-dating convention.** Each depth file opens with one Era line:
"Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor
`nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker
0.2.15." Every rule row keeps a Floor / impl cell naming the implementation and
version it was measured on. A volatile fact carries its date or version inline
and a re-check trigger in parentheses, for example "(re-check at each Lix
release)". No "recently", "new" or "now" without a date. Every corpus rate says
whether it excludes `NixOS__nixpkgs` (V8).

**9. Verification-command shape.** Every Verification cell obeys these, and
the drafter watches each command red on a planted violation and green on its
twin before it ships:
- an explicit directory operand (`.`), never an implied cwd for `grep -r`;
- one `-e` per alternative, never `\|` or `|` alternation inside a pattern;
- `--include` globs quoted (`--include='*.nix'`); no unquoted `**`;
- no `$(...)` and no process substitution; a comparison is two commands whose outputs the text says must match (REL-01, REL-02, PKG-05, PKG-16, FLK-13's self form, SEC-07) or a checked-in script under the rule's fixture;
- no angle-bracket placeholders anywhere in a command; use a concrete example (`.#default`, `packages.x86_64-linux.default`) and say "substitute your attribute";
- `xargs -r` whenever `xargs` appears;
- POSIX classes, not `\s` or `\b`, in `grep -E` (LANG-07, MOD-02, MOD-05, MOD-07, FLK-12, PKG-12);
- no unescaped `|` inside a markdown table cell — move pipelines out of tables into a fenced `sh` block below the table and cite them by name (INP-09's `||`, INP-13's `awk`, GATE-12, GEN-16, SEC-01, SEC-06);
- every check states what empty output means and what each exit code means.

Cells that violate one of these today and must be reshaped: PKG-05, PKG-11, PKG-16, REL-01, REL-02, REL-13, REL-16, SEC-06, SEC-07, INP-09, INP-11, INP-13, LANG-07, MOD-03, GEN-21, FLK-13 (self form). Fixtures are gone (d): re-plant under `~/.cache/research-lang/nix-tools/fixtures/nix-authoring/<family>/`, `git init -q && git add -A`, and record versions and whether the store was cold or warm.

**10. Fences.** Every Nix snippet is fenced ```` ```nix ```` and is
nixfmt-clean (extract it to a file and run `nixfmt --check`); every shell
snippet is fenced ```` ```sh ````. Never tag Nix as `python`: the repository
runs `ruff format` over markdown, and a mis-tagged fence gets rewritten.

**11. Skills: procedures only.**
- **`nix-flake-adopt`** — add a flake to an existing repository, or modernize one. Steps: CORE-04 era, CORE-05 shape; the fleet template (E40: skeleton A + flake-compat + `inputs.self.submodules` where the tree has gitlinks); `package.nix` from the Rust template, the ocx workspace variant or PKG-21's Python-library export; real hashes (PKG-03); `git add` (FLK-16); the gate block; the `nix.yml` CI shape (GATE-12..16, SEC-03 token form); the README block (REL-09); the modernize branch (M-K-05: flake-utils → `genAttrs`, `nixfmt-rfc-style` → `nixfmt-tree`, singular outputs, `x86_64-darwin`). Project commitments live here: fleet formatter MUST (E3), no crane or rust-overlay in fleet flakes (E21).
- **`nix-flake-release`** — cut a release: the gate plus `--all-systems`, build and implementation legs; REL-01/02 version sync; REL-08 lock commit before the tag; the tag; REL-16's clean-store `nix run` with PKG-19's entry point (E28); REL-10 deprecations; the nix-update contract (REL-13, REL-17) for nixpkgs copies; D flakes: no tags, GEN-15 instead (E29).
- **`nix-diagnose`** — triage from the verbatim error: CORE-04 and LANG-08's (shape, implementation, version) keying; the absorbed LANG-09 order (bare `error:` line, `--show-trace` only when the line names no rule, isolate by removal, `--no-eval-cache`); LANG-10's recursion classes; the 46-row catalog from [evaluation-failures](nix-language/evaluation-failures.md) §3 with its C20 splits and a C7 misattributed-diagnostics section (the `42` twin, the manifest 404, `versionCheckPhase`, nix-installer's silence, E1's `-source is not valid`); GATE-09's triage table with E11 applied; the "explicitly not a defect" list.
- No review skill (M-K-06 deferred), no generator skill. Bundle `nix-essentials`: `nix-quality`, `nix-flake-adopt`, `nix-flake-release`, `nix-diagnose`, every member untagged.

**12. The ocx handoff.** Three parts; only the first is lore.
- **The depth file** `rules/nix-quality/generated-flakes.md`: NIX-GEN portable subset, ocx as the worked example stripped to mechanism (item 2).
- **The prototype** at `.agents/research/nix-generated-flakes/prototype/` (`flake.nix`, `flake.lock`, `data.json`, `lib/{fetch-layer,mk-ocx-env,mk-package,tree}.nix`, `README.md`). Status: builds and smoke-runs actionlint, ninja, cmake and a synthetic corretto; passes GEN-07, 11, 13, 17, 19 and the escaping half of GEN-20 (wave-3 cold rebuild). **Seven breaks**, all to be fixed by ocx before adoption: GEN-20 `self.env` builder splice; GEN-20 first-token-only `renderChunk`; GEN-21 synthesised description, no homepage; GEN-22 `entrypoints`/`dependencies` silently ignored; PKG-11 `unpackPhase`/`installPhase` without `runHook` (`lib/mk-package.nix:67,80`); GATE-01 bare `nixfmt` formatter; INP-03 rev in `url` without a frozen-on-purpose comment (E34). The prototype is evidence, not a reference.
- **The ADR draft** `adr_nix_flake_generation.md` for `ocx-sh/ocx`, drafted at authoring time from [gen]. It must settle: the generator as an `ocx` subcommand reusing `ocx_oci/src/platform.rs:416` and the registry client (GEN-02); repository `ocx-sh/ocx-nix` and its name (Q4); the fetch — nixpkgs `fetchurl` with `Authorization: Bearer QQ==`, `hash` = the layer digest verbatim, manifest GETs with the OCI `Accept` header, token-exchange FOD or skopeo only as fallbacks (GEN-05, 08, 09, 10); the attribute shape — flat `packages.<system>.<ns>-<pkg>` latest, `legacyPackages.<system>.<ns>.<pkg>."<version>"`, overlay adding only `ocx` (GEN-03, 06, 07); the libc template — `autoPatchelfHook` plus `stdenv.cc.cc.lib` on every Linux package, per-package soname ignore lists (GEN-11, 19); meta — `sourceProvenance`, split SPDX licenses omitted when absent, description and homepage from the package index, `mainProgram` only for one binary (GEN-12, 13, 14, 21); env, entrypoint and dependency translation, with `self.env` inlined by the generator (GEN-20, 22); systems — x86_64-linux, aarch64-linux, aarch64-darwin evaluated but not built, no `x86_64-darwin`, musl and Windows dropped (GEN-04); history — every digest kept until 20 MB (GEN-17, Q5); the update loop — cadence, GitHub App token, reviewed PR, per-item failures reported (GEN-15, 16); yanked and deprecated handling once `status` is populated (GEN-18); no cache and no `nixConfig`; the README's executed `nix run` examples; `cmake-gui` policy; and the requests to the index: a required license annotation, `upstream.repository_url` for `ocx/cli` and `ocx/mirror`, the anonymous-manifest 404 for `grimoire/cli`, `ocx/cli` and `ocx/mirror`, publisher-signature verification (M-E-20) and a resolved projection with layer digests (M-E-29). Open for ocx: Darwin `install_name_tool`/`codesign` (M-E-10).

**13. MUST presentation.** 83 MUSTs ship across nine files, most shape-scoped
(19 bind only D). Each depth file groups rows by the check that catches them,
states each MUST's shape binding in the Severity cell, and the index lists only
the cross-shape MUSTs in item 4. A rule whose only check is a reading heuristic
says so in its Verification cell (LANG-08, GATE-09's triage, SEC-01's
own-cache judgement, SEC-07's auto-merge half).

**14. The held-out round is binding in phase 8.** Run every Verification cell
verbatim over (a) the 38-repo corpus and (b) five to eight flakes outside it,
fresh sparse clones at recorded SHAs — for example `ryantm/agenix`,
`nix-community/impermanence`, `NixOS/nixos-hardware`, `danth/stylix`,
`nix-community/nh`, `numtide/devshell` — plus the ocx prototype. Group every
break by class C1-C25. A break that is a new instance of a known class is a
row in the depth file's Applied evidence. A new class or a new MUST is folded
into the depth file with a revision-log line; it does not reopen research.

## Phase 8 landed (2026-09-27): review, held-out sweep, new failure classes

Review plus held-out sweep (5 opus reviewers, 3 opus sweepers over the 38-repo
corpus and 8 held-out flakes; receipt `nix-topic-map/scratch/review-receipt-result.json`):
184 findings (24 blockers, 115 fixes, 45 nits), every set fix-then-ship. The
sweepers reported nine "new class" entries. The orchestrator deduplicated them
into five classes by mechanism. All five are classes of *check* defect, not of
Nix defect: the held-out round found no new Nix failure mechanism, but it found
that text checks written in isolation break when they meet real trees and each
other.

| Class | Mechanism | Evidence (sweep) | Catching check |
|---|---|---|---|
| C26 Self-hit | A text gate matches its own carrier: the workflow `run:` line, a checked-in gate script, the installed copies of the rules and skills under `.claude/` (or any client config dir), or the canonical implementation a rule says to reuse | security grep red on its own `nix.yml` line; adopt's trust step red on 28 lines once `nix-essentials` is installed; GEN-02 grep hits ocx's own `platform.rs` | Run every text gate on its compliant twin with the workflow, the gate script and an installed copy of the set present; require exit 0. Bracket one letter of each literal (`accept-flake-[c]onfig`) and exclude client config dirs |
| C27 Lexical homograph | A token also spells an allowed construct, or an equivalent spelling slips through | `pkgs\.system` vs the `nixpkgs.system` option (16 FP); line-start `with pkgs;` vs the list-scoped form; `builtins.path` vs `builtins.pathExists` (86 of 135); `types\.path` misses `with types; attrsOf path` | Run each locator over nixpkgs `pkgs/by-name` and the corpus, spot-read hits, add the negative pattern or demote to a reading heuristic |
| C28 Check contradicts a sibling's prescribed form | Rule X's check fails on the exact spelling rule Y mandates | INP-06's flake-checker condition vs INP-05's `.tar.zst` channel URL; INP-11's token grep vs SEC-03's `access-tokens` line; GATE-10's grep vs the index's chained target | Run every check against every canonical snippet and template the set ships (skeletons, adopt templates, gate block); require green |
| C29 Check scope differs from rule scope | Rule binds new code, one flake, one shape or one input type; the check runs tree-wide, over nested flakes, the wrong shape selector or one input type | GATE-03 tree-wide vs git-hooks.nix's 46 hook definitions; FLK-11 sums 46 template flakes; SEC-07 skips url-typed inputs | State the scope in the Verification cell; watch it on a tree carrying compliant out-of-scope code |
| C30 Backend-dependent attribute semantics | An attribute's legality or meaning depends on the function family or backend | `builtins.fetchTarball` rejects `hash` (PKG-01's "never sha256" is wrong there); `fetchFromGitHub` with `fetchSubmodules` switches to fetchgit and its `src.url` loses the version (REL-13) | Run the check across each backend the rule names (builtin vs nixpkgs fetcher, fetchzip vs fetchgit backend) |

Convergence: the fix waves apply the reviewers' exact fix texts (which cover
these instances). A targeted re-sweep then runs only the changed verification
cells over the corpus and held-out trees, with an installed copy of the set
present (C26). Stop when that round adds no new class and no new MUST.

## Convergence (2026-09-27): re-sweep round

Three opus agents re-ran 73 changed verification cells over the 38-repo corpus
and the 8 held-out flakes. Each cell also ran against an installed copy of the
set and every canonical snippet. They applied 43 watched fixes in their own
files. Receipt: `nix-topic-map/scratch/resweep-receipt.json`. **New failure
classes: 0. New MUST: 0.** Converged. Every break fits C14 (drift between
copies), C26, C27, C28 or C29. Examples:

- The fix wave's NIX-INP-06 condition passed a ref-less `github:` nixpkgs (C27).
- The era jq read the transitive `nixpkgs` node when the root input is
  `nixpkgs_2` (nix-installer; C27). Fixed by following
  `.nodes.root.inputs.nixpkgs`.
- The CORE-06 generated-header grep matched 38 nixpkgs patch comments (C27).
- The gate comment itself spelled `trusted-users` (C26).
- zig-overlay's dotted attribute names broke the GATE-10 loop (C27). Fixed by
  quoting the names.

A last alignment pass brings the stale skill copies (security greps, era jq,
flake-checker condition, REL-03 locator, REL-16 anchored smoke) and the
NIX-LANG-07 scope grep in line with the re-verified rule files.
