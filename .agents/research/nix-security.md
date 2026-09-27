---
title: "Nix trust boundaries: nixConfig, accept-flake-config, tokens, secrets in the store, untrusted flakes, daemon floors"
topic: "Nix / flakes — security and trust boundaries (NIX-SEC)"
model: opus
id_family: NIX-SEC
consolidates:
  - nix-security/trust-boundaries.md
  - nix-audit/exemplar-flake-shape.md (§6 nixConfig, §9 CI)
  - nix-audit/exemplar-tool-runs.md (headline, Patterns)
  - nix-audit/ocx-index-and-fleet.md (token and redirect context only)
  - nix-topic-map.md (rows M-H-01..10, conflict 7, Q12, Q13, E8, class C15)
date: 2026-09-27
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-security/ (this consolidation) and fixtures/trust-boundaries/ (the dive)
---

# Nix trust boundaries (NIX-SEC)

## Verdict

1. **`nixConfig` is a request the consumer's configuration decides on. It never grants anything by itself.** A published flake SHOULD NOT carry it. If it does, it MUST hold only `extra-substituters` and `extra-trusted-public-keys` for a cache the project runs itself (map conflict 7, confirmed). The **fleet's A flakes and the ocx generated flake (D) carry none**, because owner Q2 says no public cache. B, C and E flakes carry none.
2. **`accept-flake-config` never appears in a fleet repository, in any file.** That covers a flake, README, `.envrc`, script, Dockerfile, CI `extra_nix_config` and agent-instruction file. An agent never passes the flag, and never answers Nix's trust prompt with "permanently". The check is mechanical: empty output passes. The map's "every hit must be a warning against it" is retired, because a warning against the flag belongs in the lore rule, not in the repository. The rule binds every shape.
3. **The corpus violates rules 1 and 2 more often than the dive reported.** Re-measured here: **2 of the 11 `nixConfig` declarers go outside the allowlist**, where the shape audit said 0 and the dive said 1. **8 of the 36 non-implementation repositories pass `--accept-flake-config`**, where the dive said 3. The worst case is CI that accepts the config of a *third-party flake on a floating ref* (nixpkgs-python, nixpkgs-terraform).
4. **Nothing secret is ever evaluated.** The store is world-readable (mode 444), and a secret gets there in three ways, each measured:
   - a **tracked file the flake never reads** is copied as soon as anything interpolates `self`;
   - a **fetcher header** is written into the `.drv` at evaluation, with no build;
   - a `builtins.readFile` puts the value into the output.

   So the check is `git ls-files` plus a token scan, not a `readFile` grep. Credentials live only in `access-tokens`: in a user `nix.conf` outside any repository, or in CI through `${{ secrets.* }}`. Binds all shapes, and hardest for D (the ocx fetcher). There, `Authorization: Bearer QQ==` (NIX-GEN-08) is an anonymous value and not a credential.
5. **An agent treats a flake it does not own as hostile code.**
   - Allowed: a full 40-hex rev, `--no-write-lock-file`, `--option allow-import-from-derivation false`, and only `metadata`, `show`, `check --no-build` or a sandboxed `build`.
   - Never: `develop`, `shell`, `run`, `direnv allow`, `--impure` or `--accept-flake-config`.

   A `shellHook` ran as the invoking user with the real `$HOME`, while the sandboxed build of the same flake could not write outside. IFD defaults to `true` on both CppNix 2.35.2 and Lix 2.95.2. The dive credited this rule to NIX-INP-12, which is wrong: that rule is the override-input CI leg. NIX-SEC owns this one (map E8, M-H-09).
6. **CI and self-hosted builders run CppNix at or above the CVE-2026-39860 fix for their line.** NIX-GATE-13's `install_url` pin enforces it, and a computed check is watched red on 2.34.4. Every non-stub `nixVersions.nix_2_*` in the pinned nixpkgs passes (2.31.5, 2.34.8, 2.35.2).
7. **flake-checker is not a supply-chain audit.**
   - `--check-owner` covers only the inputs keyed as nixpkgs.
   - A typosquatted library input produced 0 mentions.
   - Without `--fail-mode` it exits 0 on findings.

   Owner retargets are therefore caught by a lock diff on the lock-bump PR (NIX-INP-11), and that PR is never auto-merged. This is the only defence the program has against an xz-class upstream compromise.
8. **Dropped as rules:** the FOD `__impureEnvVars` explanation (NIX-PKG and NIX-GEN-08/09 own the fetch, and the hash check is their guarantee) and `nixConfig.warn-dirty` (already a NIX-INP failure mode, and SEC-01 catches it).

## The ruleset

Family NIX-SEC. Nine rules, seven of them MUST. The runs cited as **C1-C12** are this consolidation's, listed in [Verification runs](#verification-runs-this-consolidation). The runs cited as **V1-V7** are the dive's ([trust-boundaries](nix-security/trust-boundaries.md#verification-runs)). The implementations are CppNix 2.35.2 and Lix 2.95.2, on nixpkgs 26.11pre `8d5d2709`, unless stated otherwise.

### Check 1 — evaluate the flake's own `nixConfig` keys

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-01 | Declare no `nixConfig` in a published flake. If a project runs its own binary cache, `nixConfig` holds exactly `extra-substituters` and `extra-trusted-public-keys` naming **that** cache, and the README repeats the pair in `nix.conf` form (NIX-REL-15). Every other key is a finding: `allow-import-from-derivation` (even `false`), `extra-trusted-substituters`, `warn-dirty`, `post-build-hook`, `trusted-users`, `sandbox` and `experimental-features`. So is a substituter the project does not operate. | Without acceptance, every key outside Nix's six-name whitelist[^wl] is ignored, with one warning per key on every run. It is therefore dead configuration at best. Once accepted, it is root-equivalent (NIX-SEC-02). A third-party substituter is trust-on-first-use for anyone who accepts it. | `nix eval --json --file ./flake.nix --apply 'f: builtins.attrNames (f.nixConfig or { })' '' \| jq -e '(. - ["extra-substituters","extra-trusted-public-keys"]) \| length == 0'`. Exit 0 passes; a flake without `nixConfig` prints `true`. Whether a substituter is the project's own is a reading heuristic: its host must match the project's own cache named in the README. This replaces map Q12's `--impure --expr` form: the answers are the same, and no `--impure` flag touches third-party code. For a flake you do not own, read the literal instead, because `--file` is incompatible with `--pure-eval`. | **Yes**. **C1**: `nixconfig-violation`, `ifd-false` and `trusted-subst` each gave `false` with exit 1. `nixconfig-compliant` and `none` gave `true` with exit 0. The same command over the 11 declaring exemplars: 9 exit 0, and nix-vscode-extensions and llm-agents.nix exit 1. Dive V3 (the `--impure` form) agrees. **C11**: Lix 2.95.2 printed the same 5 warnings as CppNix (dive V1). | MUST (allowlist); SHOULD NOT declare at all; fleet A and D: none (Q2) | CppNix 2.35.2 and Lix 2.95.2 measured; 2.31.5 unrun |

[^wl]: `bash-prompt`, `bash-prompt-prefix`, `bash-prompt-suffix`, `flake-registry`, `commit-lock-file-summary`, plus its alias `commit-lockfile-summary`. `NixOS/nix@209d2bc44288:src/libflake/config.cc:55-61`. An `extra-` prefix is stripped before the whitelist lookup (`:65`).

### Check 2 — repository greps (empty output passes)

Run each grep from the repository root. `grep` exits 1 when nothing matches, and that is a pass.

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-02 | Never set, pass, script or recommend `accept-flake-config`. That covers `--accept-flake-config`, `accept-flake-config = true` in any `nix.conf`, `NIX_CONFIG` or CI `extra_nix_config`, `.envrc`, Dockerfiles and `AGENTS.md`/`CLAUDE.md`. Never answer Nix's interactive "do you want to permanently mark this value as trusted" prompt with yes. | Accepting flake configuration lets the flake set daemon-scoped settings such as `post-build-hook`. That is root-equivalent on a multi-user install where the caller is a trusted user, and maintainers confirm it is intended ([NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649)). Upstream's own test asserts that the hook runs once accepted (`NixOS/nix@209d2bc44288:tests/functional/flakes/config.sh:28-47`). A "permanent" answer is stored per (setting, value) in `~/.local/share/nix/trusted-settings.json`, **not per flake**, and is then applied silently (`config.cc:32-35,83-88`). | `grep -rn --exclude-dir=.git -e 'accept-flake-config' .` | **Yes**. **C3**: `afc/violation` had 3 hits (README, `.envrc`, workflow `extra_nix_config`), exit 0. `afc/clean` exit 1. Dive V2: a `post-build-hook` from an untrusted flake executed under `--accept-flake-config --rebuild`. | MUST | all implementations; Lix 2.95.2 has the same gate (C11) |
| NIX-SEC-03 | Supply a credential only as `access-tokens` in one of two places. The first is a user `nix.conf` outside any repository. The second is CI, from a secret: `github_access_token: ${{ secrets.GITHUB_TOKEN }}` on `cachix/install-nix-action`, or `access-tokens = github.com=${{ secrets.… }}` in `extra_nix_config`/`NIX_CONFIG`. Never write a literal token into a tracked file. Never put one in `nix.settings.access-tokens` of a NixOS, nix-darwin or home-manager configuration, because that `nix.conf` is generated into the store. | A committed token is a permanent leak once the repository is public or forked. nix-darwin renders `nix.settings` through `pkgs.writeTextFile` (`nix-darwin/nix-darwin@4cff07de74b5:modules/nix/default.nix:57`), so the token becomes a mode-444 store file. | `grep -rnE --exclude-dir=.git -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .` and `grep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e 'access-tokens' . \| grep -v -F '${{ secrets.'` must both print nothing. The first scans docs too. The second exempts docs, where a placeholder such as `github.com=<GITHUB_TOKEN>` is guidance. A `nix.settings.access-tokens` hit is always a finding, even when the value comes from a secret. | **Yes**. **C4**: `committed-conf` exit 0 (a finding) and `workflow-literal` exit 0 (a finding); `workflow-secret` exit 1 (a pass). Over the exemplars, `cachix/devenv` and `nix-darwin` exit 1, meaning the secret form is compliant, and devenv's docs placeholder is exempt. Dive V5 agrees on the `.conf` case. | MUST | `access-tokens` syntax per the [conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file) manual, 2.35 |
| NIX-SEC-08 | Never tell a user or an agent to add themselves to `trusted-users` to make a flake's cache or `nixConfig` work, whether in a README, docs, CI or an agent file. Document the administrator-side lines instead: `extra-substituters` and `extra-trusted-public-keys` in `/etc/nix/nix.conf`, or `trusted-substituters` so untrusted users may opt in. | The Nix manual says a trusted user is essentially root ([conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file) `trusted-users`). It is also the precondition that turns NIX-SEC-02's acceptance into root. [NixOS/nix#6752](https://github.com/NixOS/nix/issues/6752) is the UX confusion that drives users to it. | `grep -rn --exclude-dir=.git -e 'trusted-users' .`. A hit passes only inside a host-administration module that the flake exports on purpose (NIX-MOD territory); everywhere else it is a finding. | **Yes**. **C9**: `docs-trust/violation` (README `trusted-users = root $USER`) exit 0; `docs-trust/clean` exit 1. | MUST | manual 2.35 |
| NIX-SEC-09 | Enable no experimental feature beyond `nix-command flakes` in CI, docs or `nixConfig`. Above all, never enable `ca-derivations` or `recursive-nix`. | `ca-derivations` lets any local user who can submit builds poison realisations: the daemon does not verify signatures on submitted realisations, and no fix has been backported (GHSA-jm6c-h95p-6qhj, per the dive's summary). | `grep -rn --exclude-dir=.git -e 'ca-derivations' -e 'recursive-nix' .` | **Yes**, for the grep. **C9**: `docs-trust/violation` (`extra_nix_config` enabling `ca-derivations`) exit 0; `clean` exit 1. The attack itself is not reproduced; that half is a reading heuristic. | SHOULD | advisory status as of 2026-09-27 |

### Check 3 — what enters the world-readable store

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-04 | Never let a secret reach evaluation. Never track (`git add`) a secret-shaped file in a flake repository, even one the flake never reads, and never `git add` one "so the flake can see it". Never read a secret with `builtins.readFile`, `builtins.getEnv` or a path literal. Never put a credential into any derivation attribute: a fetcher's `curlOptsList`/`netrc`, `env`, or interpolated builder text. Read a secret at **run time**, from outside the closure: an environment variable, `sops-nix` or `agenix`. A module option holding a secret's *path* uses `types.pathWith { inStore = false; }` (NIX-MOD). | Every store object is mode 444. Measured three times: (a) a tracked, never-read `secret.env` sat at `444` inside `…-source` once the flake interpolated `${self}`, which every A flake does through `src`; (b) a token in `fetchurl`'s `curlOptsList` was in the mode-444 `.drv` after `nix eval` alone; (c) `builtins.readFile` put the value into a 444 output, and `nix eval` printed it with no build (dive V4). The wiki states the rule ([Flakes](https://wiki.nixos.org/wiki/Flakes)). | (1) `git ls-files -- '*.env' '*.pem' '*.key' '*secret*' '*token*' '*credential*'` must print nothing. (2) The NIX-SEC-03 token grep. (3) For each fetcher-backed package: `grep -c -a -e 'ghp_' -e 'github_pat_' "$(nix eval --raw .#<pkg>.drvPath)"` must print 0. (4) A reading heuristic over `builtins.readFile`/`builtins.getEnv`. `getEnv` returns `""` under pure evaluation, so any hit is also an impurity. | **Yes**. **C2**: `leak/tracked` listed `secret.env`, and the store copy showed `444 …-source/secret.env`. `leak/untracked` (in `.gitignore`) listed nothing, and the file was absent from the store copy. **C5**: the `fod-header` `.drv` for `real-token` had mode 444 and 1 hit; `anonymous` (`Bearer QQ==`) had 0 hits. Dive V4: 444 output, with the token printed by `nix eval`. | MUST | CppNix 2.35.2 copies the source only when something interpolates `self`: a bare `nix eval .#hello` left no store copy (C2). Every A flake interpolates it. |

### Check 4 — the agent's procedure for a flake it does not own

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-05 | Before evaluating a third-party flake, pin it by full 40-hex rev (`github:owner/repo/<sha>`). Run only `nix flake metadata`, `nix flake show`, `nix flake check --no-build` or a sandboxed `nix build`, each with `--no-write-lock-file --option allow-import-from-derivation false`. Never run `nix develop`, `nix shell`, `nix run` or `direnv allow` on it. Never add `--impure`, `--accept-flake-config` or `--option sandbox false`. Build only where `nix config show sandbox` prints `true`. | IFD defaults to `true`, so a "read-only" `show` or `check --no-build` can build and run code during evaluation, and `pure-eval` does not stop it (NIX-GATE-08). A `shellHook` runs unsandboxed as you. A branch or tag can move between review and evaluation. The `sandbox` default is `true` on Linux only ([conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file)), so a macOS `nix build` is no boundary unless it is configured. | The invocation itself: `nix flake show --no-write-lock-file --option allow-import-from-derivation false github:<owner>/<repo>/<40-hex>`. Prove the IFD flag bites with `nix eval --option allow-import-from-derivation false .#<attr>` on an IFD output, which must fail with `cannot build '…' during evaluation because the option 'allow-import-from-derivation' is disabled`. Confirm the sandbox with `nix config show sandbox` printing `true`. | **Yes**. **C6**: `nix config show allow-import-from-derivation` printed `true`. `ifd/uses-ifd` returned `42` with exit 0 by default, and failed with exit 1 and the verbatim error under the flag. `ifd/no-ifd` exit 0 both ways. **C11**: Lix 2.95.2 also defaults to `true` and blocks with the same error. **C7**: on `shellhook/`, `nix flake check` and a sandboxed `nix build` wrote no marker outside the store, while `nix develop --command true` wrote `shellHook ran as 1000 with HOME=/home/mherwig`. **C12**: `sandbox` = `true` (Linux). | MUST (all clauses; the full-SHA clause is raised from the dive's SHOULD) | CppNix 2.35.2, Lix 2.95.2; the Darwin `sandbox` default is reading only |

### Check 5 — the Nix version CI and builders run

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-06 | Run CI and any self-hosted builder on CppNix at or above the CVE-2026-39860 fix for its line: 2.28.6, 2.29.3, 2.30.4, 2.31.4, 2.32.7, 2.33.4 or 2.34.5; any 2.35.x. Pin it with NIX-GATE-13's `install_url`. Re-run the check whenever the pinned nixpkgs or the installer moves, because NIX-GATE-16's floor is computed and never remembered. | In [GHSA-g3g9-5vj6-r3gj](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) (critical, 2026-04-07), any user allowed to submit builds (the default `allowed-users = *`) escalates to root through a symlinked temp copy of an FOD output. | `nix eval --json --file fixtures/nix-security/cve-floor.nix --apply 'f: f { v = "<version>"; }' '' \| jq -e .`. Exit 0 passes. Take `<version>` from the `install_url` and from `nix --version` on the runner. The file is a 10-line table of fix versions plus `builtins.compareVersions`. Pinned-nixpkgs set: `nix eval --json 'github:NixOS/nixpkgs/<rev>#nixVersions' --apply …` (dive rule 5). | **Yes**. **C8**: `2.34.4` gave `false`, exit 1. `2.31.5`, `2.34.8` and `2.35.2` gave `true`, exit 0. The non-stub versions at `8d5d2709` are `nix_2_31=2.31.5`, `nix_2_34=2.34.8` and `nix_2_35=2.35.2`, all passing. | MUST | CppNix. The advisory lists no 2.35 line, and 2.35.x is treated as fixed on the evidence of 2.35.2 (open question 3). Lix and Determinate are out of this advisory's scope and unmeasured. |

### Check 6 — the lock-bump review

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-SEC-07 | Diff the set of input owners and repositories on every PR that adds an input or bumps the lock, and have a human approve any change. Never auto-merge a lock-bump PR (NIX-INP-11 opens it, and a person merges it). Treat `flake-checker` as covering only nixpkgs-keyed inputs, and run it with `--fail-mode` (NIX-GATE-11). | No lock-level tool caught the xz backdoor. nixpkgs reverted it the same day ([nixpkgs#300028](https://github.com/NixOS/nixpkgs/pull/300028)), and that revert reaches you only through a reviewed bump. `--check-owner` says "Check that Nixpkgs inputs have "NixOS" as the GitHub owner" and nothing more. | `Q='[.nodes[] \| (.original // empty) \| select(.owner) \| .type + ":" + .owner + "/" + .repo] \| unique[]'; diff <(git show origin/main:flake.lock \| jq -r "$Q") <(jq -r "$Q" flake.lock)`. Empty output (exit 0) passes; any line is a review item. The auto-merge half is a reading heuristic over the lock-update workflow: no `gh pr merge --auto` and no auto-merge label. | **Yes**. **C10**: a rev-only bump gave an empty diff, exit 0. Retargeting `ipetkov/crane` to `ipetk0v/crane` gave `< github:ipetkov/crane` / `> github:ipetk0v/crane`, exit 1. On that same lock, `flake-checker --no-telemetry --fail-mode` reported only "outdated", with 0 lines mentioning fork, crane or the owner. On `fc-fork` (nixpkgs owner changed) it printed the fork warning and exited 1, and exited 0 without `--fail-mode`. Dive V7: jq on `original.owner` for nixpkgs. | SHOULD (a person decides whether a new owner is legitimate) | flake-checker 0.2.15; lock version 7 |

**Cross-family pointers, not restated here.** The IFD ban for one's own flake is NIX-GATE-08 (Q5). SHA-pinned actions are NIX-GATE-12. The installer and version pin are NIX-GATE-13. The README cache pair is NIX-REL-15, and the install lines without `--accept-flake-config` are NIX-REL-09. Never committing a SAS URL or `--location-trusted` is NIX-GEN-10. Shell-escaping registry data in the builder is NIX-GEN-20 (class C21). The anonymous ghcr.io header is NIX-GEN-08.

### Verification runs (this consolidation)

All runs used `/home/mherwig/.cache/research-lang/nix-tools/run.sh` (CppNix 2.35.2; Lix 2.95.2 through `nix shell nixpkgs#lix`) under `timeout 300` to `900`. Fixtures live under `fixtures/nix-security/`, each with `git init -q && git add -A` (`owners/` holds three commits). The store was warm.

| # | Fixture | Command | Red | Green |
|---|---|---|---|---|
| C1 | `q12/{nixconfig-violation,ifd-false,trusted-subst,nixconfig-compliant,none}` plus the 11 exemplar declarers | `fixtures/nix-security/q12-check.sh <dir>` (the SEC-01 command) | `false`, exit 1: 3 fixtures, plus `nix-vscode-extensions`, `llm-agents.nix` | `true`, exit 0: 2 fixtures, plus the 9 other exemplars |
| C2 | `leak/tracked`, `leak/untracked` | `nix eval --raw .#src` (`src = "${self}"`); `stat -c '%a %n' <src>/secret.env`; `git ls-files -- '*.env' …` | `444 /nix/store/4dnaj8i2…-source/secret.env`; ls-files printed `secret.env` | file absent from the store copy; ls-files printed nothing |
| C3 | `afc/violation`, `afc/clean` | `grep -rn --exclude-dir=.git -e 'accept-flake-config' <dir>` | 3 hits, exit 0 | exit 1 |
| C4 | `tokens/{committed-conf,workflow-literal,workflow-secret}`, devenv, nix-darwin | `fixtures/nix-security/token-check.sh <dir>` (the SEC-03 pair) | exit 0 with hits: 2 fixtures | exit 1: `workflow-secret`, devenv, nix-darwin |
| C5 | `fod-header` | `stat -c %a "$(nix eval --raw .#<a>.drvPath)"`; `grep -c -a -e 'ghp_'` over it | `real-token`: `444`, 1 hit | `anonymous`: `444`, 0 hits |
| C6 | `ifd/uses-ifd`, `ifd/no-ifd` | `nix config show allow-import-from-derivation`; `nix eval --no-write-lock-file [--option allow-import-from-derivation false] .#value` | default `true`; `uses-ifd` under the flag exit 1, `cannot build '/nix/store/09a42557…-ifd-marker-nixsec.drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled` | `uses-ifd` default printed `42`, exit 0 (IFD ran); `no-ifd` exit 0 both ways |
| C7 | `shellhook` | `nix flake check`; `nix build --rebuild .#default`; `nix develop --command true`; `cat MARKER` | `nix develop`: `shellHook ran as 1000 with HOME=/home/mherwig` | check and sandboxed build: no `MARKER`, no `BUILD-MARKER` |
| C8 | `cve-floor.nix` | `nix eval --json --file cve-floor.nix --apply 'f: f { v = "<v>"; }' '' \| jq -e .` | `2.34.4` → `false`, exit 1 | `2.31.5`, `2.34.8`, `2.35.2` → `true`, exit 0 |
| C9 | `docs-trust/violation`, `docs-trust/clean` | `grep -rn --exclude-dir=.git -e 'trusted-users' -e 'ca-derivations' -e 'recursive-nix' <dir>` | exit 0 | exit 1 |
| C10 | `owners` (base → rev bump → owner retarget), `fc-fork` | the SEC-07 `diff`; `flake-checker --no-telemetry [--fail-mode] <lock>` | retarget: 2-line diff, exit 1; `fc-fork`: fork warning, exit 1 under `--fail-mode` | rev bump: empty, exit 0. The flake-checker blind spot: the retargeted crane lock gave 0 owner lines, and `fc-fork` without `--fail-mode` exited 0 |
| C11 | `q12/nixconfig-violation`, `ifd/uses-ifd` under Lix 2.95.2 | `nix build …` (warnings counted); `nix config show allow-import-from-derivation`; the C6 eval | 5 `ignoring untrusted flake configuration` warnings; IFD blocked with the same error | default `true`, the same as CppNix |
| C12 | — | `nix config show sandbox` | — | `true` (Linux) |

Not rerun here: the dive's V2 (`post-build-hook` executing under `--accept-flake-config`) and V6 (the FOD hash mismatch). The dive's V6 tamper sub-probe stays **inconclusive**. Nothing ran on CppNix 2.31.5.

## Applied to the exemplars and the future consumers

**Already satisfied.**
- **SEC-01:** 9 of the 11 `nixConfig` declarers stop at their own cache pair (C1). These are cachix, devenv, nixpkgs-python, ghostty, helix, crane, sops-nix, treefmt and zed. 26 of the 37 declare nothing ([shape](nix-audit/exemplar-flake-shape.md) §6).
- **SEC-02:** 28 of the 36 non-implementation repositories never mention the flag (C3 corpus grep, excluding NixOS/nix and nixpkgs).
- **SEC-03:** 6 repositories pass the CI token through `github_access_token: ${{ secrets.GITHUB_TOKEN }}`, for example `oxalica/nil@205c8ba65a7f:.github/workflows/ci.yaml:22`. devenv writes it into `extra_nix_config` from a secret (`cachix/devenv@6d76db3889de:.github/workflows/build.yml:37`).
- **SEC-04:** no exemplar tracks a secret or reads one at evaluation.
- **SEC-06:** no exemplar pins below a fix line. The toolchain's own `run.sh` is the positive pattern for tokens: `NIX_CONFIG` at invocation, never a tracked file.

**Violated by prominent exemplars** (the SHAs are in `nix-fetch.log`):

| Rule | Where | What |
|---|---|---|
| SEC-01 | `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:46-54` | `extra-trusted-substituters` (not allowlisted), including `hydra.iohk.io`, which the project does not operate. The shape audit mis-recorded the key as `extra-substituters`; the dive listed the host but kept the key as allowlisted. |
| SEC-01 | `numtide/llm-agents.nix@efb10f28f724:flake.nix:4` | `allow-import-from-derivation = false`: well-meant, but inert for every consumer, and it adds one more warning per run. The dive listed this repository as compliant. |
| SEC-02 (agent file) | `numtide/llm-agents.nix@efb10f28f724:AGENTS.md:13,295` | tells coding agents to run `nix build --accept-flake-config` and `nix run --accept-flake-config`. `CLAUDE.md` is a symlink to it. |
| SEC-02 (consumer install) | `cachix/cachix@3349ce74ba77:README.md:90`, `:.envrc:7` | `nix profile install github:cachix/cachix/latest --accept-flake-config`; a contributor's `use flake . --impure --accept-flake-config` |
| SEC-02 (third-party, floating) | `cachix/nixpkgs-python@4d2bd16c09ba:.github/workflows/build.yml:36`; `stackbuilders/nixpkgs-terraform@a5893ca82ec3:.github/workflows/build.yml:27`, `release.yml:36`, `update.yml:34` | accepts the configuration of `github:cachix/devenv/latest` or `nixpkgs#devenv`, a flake the CI does not own, on a ref that moves. This is the worst class. |
| SEC-02 (own CI) | `ipetkov/crane@73b980519cef:.github/workflows/test.yml:63,104,131`, `pages.yml:31`; `cachix/devenv@6d76db3889de:.github/workflows/pin.yml:57` (and 5 more workflows, `containers/devcontainer/Dockerfile:40`); `zed-industries/zed@bda9c0bd43a8:.github/workflows/nix_build.yml:44,82`, generated by `tooling/xtask/src/tasks/workflows/nix_build.rs:101`; `numtide/treefmt@d68dddf6ac3a:.github/workflows/gh-pages.yml:27`, `coverage.yml:17` (global `accept-flake-config = true`) | lower impact on hosted runners, which already run the repository's code, but it teaches the pattern and escapes the job boundary on a persistent self-hosted runner |
| SEC-08 | `cachix/devenv@6d76db3889de:docs/src/content/docs/binary-caching.mdx:105-123` | "Adding yourself to `trusted-users`", with `echo "trusted-users = root $USER" \| sudo tee -a /etc/nix/nix.conf` and the NixOS form |
| SEC-03/04 | `nix-darwin/nix-darwin@4cff07de74b5:.github/workflows/test.yml:55,107` | `nix.settings.access-tokens = [ "github.com=${{ secrets.GITHUB_TOKEN }}" ]`, which becomes a store file through `modules/nix/default.nix:57`. The impact is low because the job token is job-scoped, but a long-lived token copied into this pattern would leak. |

**New commitments for the fleet.**
- **Fleet A flakes (`ocx`, `grimoire`, `ocx-sdk-python`; `setup-ocx` if it gains a flake):**
  - Ship no `nixConfig` (Q2).
  - The gate adds the SEC-02, SEC-03, SEC-08 and SEC-09 greps and the SEC-04 `git ls-files` check. Each is a single line with empty output as the pass.
  - CI passes `github_access_token: ${{ secrets.GITHUB_TOKEN }}` and nothing else.
  - The `install_url` version passes SEC-06.
  - The weekly lock PR runs the SEC-07 diff and is merged by a person.
- **The ocx generated flake (D, `ocx-sh/ocx-nix`):** as for A, plus the following.
  - Its layer FODs carry only the anonymous `Bearer QQ==` header (NIX-GEN-08). SEC-04 check (3) runs over a sample of `.drv`s in CI.
  - The generator's registry token never reaches a Nix expression or `data.json` (GEN-10, SEC-04).
  - The updater's PR is never auto-merged (SEC-07).
- **Agents working on any of these:** SEC-05 is the procedure for every third-party flake. That includes the exemplar corpus, NIX-INP's candidate inputs, and a consumer's flake reported in a bug.

## AI-agent failure modes

Ranked by how often each is expected to bite, using corpus prevalence and how plausible the move looks to an agent.

1. **Passing `--accept-flake-config` to silence the untrusted-setting warning**, or copying it from an install line. 8 of 36 repositories do it, and one `AGENTS.md` instructs agents to (C3 corpus grep; C15 in the map). Check: SEC-02's grep.
2. **Running `git add` on a secret file (`.env`, a key) because "flakes only see tracked files"**, then interpolating `self`. The secret lands at 444 (C2). Check: SEC-04's `git ls-files`.
3. **Running `nix develop`, `direnv allow` or `nix run` on a flake it was only asked to inspect.** The `shellHook` runs as the user (C7). Check: SEC-05 means reviewing the command list before the first invocation.
4. **Adding more keys to `nixConfig` in the belief that they apply**: `allow-import-from-derivation`, `warn-dirty`, `extra-trusted-substituters`, `experimental-features`, `sandbox`. Check: SEC-01's key diff.
5. **Hardcoding a token to fix a private-fetch 401** in `curlOptsList`, a committed `nix.conf` or `nix.settings.access-tokens`. The token is in the `.drv` before any build (C5). Check: the SEC-03 grep and SEC-04 check (3).
6. **Telling the user to add themselves to `trusted-users`** so a flake's cache or `nixConfig` "works", as devenv's docs do. Check: SEC-08's grep.
7. **Assuming IFD is opt-in, or that `--pure-eval` or `--no-build` blocks it**, when "safely" running `show`/`check` on a third-party flake. Check: `nix config show allow-import-from-derivation` (C6), then the SEC-05 flags.
8. **Evaluating a third-party flake by branch or `latest` tag**, reusing the install idiom for an inspection. Check: the ref in the command is 40-hex.
9. **Reporting a green flake-checker as "no supply-chain issues".** Without `--fail-mode` it exits 0 on findings, and `--check-owner` never looks past the nixpkgs keys (C10). Check: the SEC-07 diff, and GATE-11's `--fail-mode`.
10. **Writing a hardcoded "minimum Nix 2.31.5"** into docs or CI, instead of checking the actual installed version against the fix table. Check: SEC-06's `cve-floor.nix` against `nix --version`.
11. **Answering Nix's interactive trust prompt with "permanently"**, or pre-seeding `~/.local/share/nix/trusted-settings.json`. After that, every flake declaring the same (setting, value) is applied silently, with only an info line. Check: the file is absent, or holds only `false` entries (reading heuristic).

## Open questions

**Owner decisions (the default applied).**
- **A public cache for any fleet flake (Q2).** Default: none, so no fleet flake carries `nixConfig`. If the owner later adds one, SEC-01 allows exactly that cache's pair, and REL-15 documents it.
- **May agents run `nix develop` on the fleet's own flakes?** Default: yes, at a commit the agent or owner authored or reviewed. Never on a PR from a fork, and never on a third-party flake (SEC-05).
- **Own-CI `--accept-flake-config` in upstream projects the fleet contributes to.** Default: no upstream PRs from this program. The finding is recorded, not pursued.

**Another research round.**
- **security/implementation-advisories.** Which Lix and Determinate Nix versions carry CVE-2026-39860-equivalent fixes, and does either publish its own advisory feed? SEC-06 is CppNix-only today (owner Q6: Lix is an advisory leg).
- **security/darwin-boundary.** On a macOS runner, the `sandbox` default is `false` per the manual (not measured; no Darwin builder). Does `nix build` of an untrusted flake on the fleet's `macos-14` leg (NIX-GATE-15) need `sandbox = true` or `relaxed`, and does that still build the fleet's `-sys` crates?
- **security/floor-parity.** Nothing in SEC-01, 02 or 05 ran on CppNix 2.31.5, the NIX-GATE-16 floor; only 2.35.2 and Lix 2.95.2 were measured. The same run should settle whether any 2.35.0 or 2.35.1 predates the 2026-04-07 advisory. `cve-floor.nix` treats all of 2.35 as fixed.
- **security/trusted-settings-reuse.** Trust is keyed by (setting, value) and not by flake (`config.cc:83-88`). Is there a practical cross-flake reuse attack, for example a popular cache URL paired with a different key? Is the file consulted on Lix?
- **Carried from the dive:** the FOD tamper-propagation probe (V6 sub-probe, inconclusive) needs `--check` or a cold store. It is low priority, because the hash mismatch mechanism is proven.
- **Held-out round (map, wave 5):** run SEC-01 to SEC-09 verbatim over 5-8 flakes outside the corpus.

## Sub-artifacts

- [nix-security/trust-boundaries.md](nix-security/trust-boundaries.md). The wave-4 dive covers:
  - the `nixConfig` allowlist and the `accept-flake-config` reproduction (V1-V3);
  - token placement (V5);
  - the store-leak fixture (V4);
  - FOD `__impureEnvVars` (V6);
  - the `nixpkgs` owner jq (V7);
  - the CVE-2026-39860 reconciliation;
  - the xz case study.

## Key sources

- [Nix 2.35 manual: conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file) covers `accept-flake-config`, `access-tokens`, `trusted-users` (essentially root), `allow-import-from-derivation` (default `true`) and the `sandbox` default.
- [Nix 2.35 manual: nix3-flake](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake) defines the `nixConfig` schema and the whitelist.
- [NixOS/nix `src/libflake/config.cc` at 209d2bc4428841d4446a3c3b6f75bb5bbfa0f71a](https://github.com/NixOS/nix/blob/209d2bc4428841d4446a3c3b6f75bb5bbfa0f71a/src/libflake/config.cc) contains the six-name whitelist, the per-value `trusted-settings.json` and the warning text.
- [NixOS/nix `tests/functional/flakes/config.sh` at the same SHA](https://github.com/NixOS/nix/blob/209d2bc4428841d4446a3c3b6f75bb5bbfa0f71a/tests/functional/flakes/config.sh), upstream's own test that a flake's `post-build-hook` runs once accepted.
- [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) shows that `accept-flake-config` is root-equivalent, as intended.
- [NixOS/nix#6752](https://github.com/NixOS/nix/issues/6752): untrusted users are prompted for settings that are then ignored.
- [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885): `nixConfig.warn-dirty` is a no-op.
- [GHSA-g3g9-5vj6-r3gj / CVE-2026-39860](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj), the FOD symlink privilege escalation and its fix lines.
- [NixOS/nix security advisories](https://github.com/NixOS/nix/security/advisories) include GHSA-jm6c-h95p-6qhj (`ca-derivations` realisation poisoning) and GHSA-6fjr-mq49-mm2c (fetchurl TLS).
- [NixOS/nixpkgs#300028](https://github.com/NixOS/nixpkgs/pull/300028), the same-day xz revert, and the [oss-security disclosure](https://www.openwall.com/lists/oss-security/2024/03/29/4).
- [wiki.nixos.org: Flakes](https://wiki.nixos.org/wiki/Flakes): flake contents are copied to the world-readable store; use sops-nix or agenix.
- [DeterminateSystems/flake-checker](https://github.com/DeterminateSystems/flake-checker) documents the scope of `--check-owner`, `--fail-mode` and the `--nixpkgs-keys` defaults.
- [cachix/install-nix-action](https://github.com/cachix/install-nix-action), for the `github_access_token` and `install_url` inputs.
