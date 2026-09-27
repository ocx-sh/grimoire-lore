---
title: Security and Trust Boundaries
summary: The NIX-SEC family, owning nixConfig, accept-flake-config, credentials, secrets that reach the world-readable store, evaluating a flake you do not own, the CppNix security floor for CI, and the owner review of a lock bump
---

# Security and Trust Boundaries

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns every trust boundary a flake crosses: which `nixConfig` keys a published
flake may carry, the `accept-flake-config` ban, where a credential may live,
what must never reach evaluation because the store is world-readable, the
procedure for a flake you do not own, the CppNix version CI and builders run,
and the owner review of a lock bump. The rules bind every shape (A app, B
library, C module, D generated, E template). The gate block and its security
step, the installer pin, SHA-pinned actions, the flake-checker invocation, the
IFD ban for your own flake and the computed consumer floor are NIX-GATE. The
README cache pair and the install lines are NIX-REL. Opening the lock-bump PR is
NIX-INP. The anonymous registry header and registry credentials in a generator
are NIX-GEN. Purity of `builtins.getEnv` is NIX-LANG. The option type for a
secret's path is NIX-MOD.

Contents: [Dates and Floors](#dates-and-floors) · [nixConfig Keys](#nixconfig-keys) ·
[Repository Greps](#repository-greps) · [What Reaches the Store](#what-reaches-the-store) ·
[A Flake You Do Not Own](#a-flake-you-do-not-own) · [The Nix Version CI Runs](#the-nix-version-ci-runs) ·
[The Lock-Bump Review](#the-lock-bump-review) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Implementations.** Every row was measured on CppNix 2.35.2 (Linux, sandbox on). NIX-SEC-01's warnings, NIX-SEC-02's acceptance gate and NIX-SEC-05's IFD default were also measured on Lix 2.95.2, with the same result. NIX-SEC-06's check was run on CppNix 2.31.5 too. Determinate Nix is unmeasured throughout. The fixtures were re-planted and re-run on 2026-09-27 against a warm store.
- **Defaults an agent must not assume.** `allow-import-from-derivation` defaults to `true` on CppNix 2.35.2 and Lix 2.95.2. `sandbox` defaults to `true` on Linux only, per the [Nix 2.35 conf-file manual](https://nix.dev/manual/nix/2.35/command-ref/conf-file) (the macOS default was not measured).
- **Pinned default: no `nixConfig` at all**, because the project runs no public binary cache. An adopter who runs one overrides this once, and NIX-SEC-01 then allows exactly that cache's pair.
- **Pinned default: NIX-SEC-06 gates CppNix only.** Lix runs as an advisory leg and Determinate Nix is untested but never deliberately broken. The consumer floor is NIX-GATE-16's computed floor, never a hardcoded version.
- **Pinned default: an agent may run `nix develop` on a flake the project owns**, at a commit the agent or the owner authored or reviewed, never on a fork's pull request.
- **Corpus rates** come from the 38-repository corpus read on 2026-09-27. The `nixConfig` rate counts the 37 repositories other than NixOS/nixpkgs, and the `accept-flake-config` rate counts the 36 that are neither NixOS/nix nor NixOS/nixpkgs.
- **Every grep is a violation locator.** Empty output with exit 1 is the pass, and any printed line is the finding. Run each from the repository root. Each excludes `.claude`, where an installed copy of these rules names every pattern: replace it with the directory your agent client installs rules and skills into. A NIX-SEC-03, NIX-SEC-08 or NIX-SEC-09 hit in code that implements or documents the setting rather than using it (a Nix implementation's own sources and tests, a module option that renders it, a test's dummy token) is read and passes. NIX-SEC-02 exempts nothing.

## nixConfig Keys

```sh
nix eval --json --file ./flake.nix --apply 'f: builtins.attrNames (f.nixConfig or { })' '' \
  | jq -e '(. - ["extra-substituters","extra-trusted-public-keys"]) | length == 0'
```

`true` with exit 0 is the pass, and a flake without `nixConfig` prints `true`.
`false` with exit 1 is the finding. For a flake you do not own, read the
`nixConfig` literal instead of running this, because `--file` evaluates without
`--pure-eval`.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-01 | Declare no `nixConfig` in a published flake. A project that runs its own binary cache may declare exactly `extra-substituters` and `extra-trusted-public-keys` naming that cache, and repeats the pair in `nix.conf` form in its README (NIX-REL-15). Every other key is a finding, including `allow-import-from-derivation` (even `false`), `extra-trusted-substituters`, `warn-dirty`, `post-build-hook`, `trusted-users`, `sandbox` and `experimental-features`. So is a substituter the project does not operate. | Without acceptance every key outside Nix's six-name whitelist (the three `bash-prompt` keys, `flake-registry`, `commit-lock-file-summary` and its alias) is ignored, with one warning per key on every run. Once accepted it is root-equivalent (NIX-SEC-02). A third-party substituter is trust-on-first-use for everyone who accepts it. 2 of the 11 corpus declarers exceed the allowlist. | The command above. Watched red: a planted `allow-import-from-derivation = false` plus `extra-trusted-substituters` printed `false`, exit 1. Watched green: the own-cache pair and a flake with no `nixConfig` printed `true`, exit 0. Whether a substituter is the project's own is a reading heuristic: its host must match the cache the README names. | MUST for the allowlist, shapes A-E. SHOULD NOT declare at all. **Pinned default:** none | CppNix 2.35.2 and Lix 2.95.2 (the same untrusted-key warnings), 2.31.5 unrun |

```nix
{
  # wrong: ignored with one warning per run, and root-equivalent once accepted
  nixConfig = {
    extra-trusted-substituters = [ "https://cache.someone-else.example" ];
    allow-import-from-derivation = false;
    extra-experimental-features = [ "ca-derivations" ];
  };
}
```

```nix
{
  # right: only the pair for the cache this project operates, repeated in the README
  nixConfig = {
    extra-substituters = [ "https://example.cachix.org" ];
    extra-trusted-public-keys = [ "example.cachix.org-1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" ];
  };
}
```

## Repository Greps

```sh
# NIX-SEC-02: the flag, anywhere
grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' .
# NIX-SEC-03 (a): token shapes anywhere, docs included
grep -rnE --exclude-dir=.git --exclude-dir=.claude -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .
# NIX-SEC-03 (b): access-tokens outside docs that does not come from a CI secret
grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}'
# NIX-SEC-03 (c): a token in a generated nix.conf, even from a secret
grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'settings\.access-[t]okens' .
# NIX-SEC-08
grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'trusted-[u]sers' .
# NIX-SEC-09
grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'ca-[d]erivations' -e 'recursive-[n]ix' .
```

Each line passes on empty output (exit 1). Grep (b) exempts docs, where a
placeholder such as `github.com=YOUR_TOKEN` is guidance, and drops lines fed
from `${{ secrets.… }}` or `${{ github.token }}`. That filter also hides
`nix.settings.access-tokens` fed from a secret, which is why grep (c) exists.
The gate block's security step (NIX-GATE, index) runs the NIX-SEC-02,
NIX-SEC-03 and NIX-SEC-08 lines with NIX-SEC-04's `git ls-files` check.
NIX-SEC-09's line is not in it. The bracketed spellings keep the file that
carries these lines (a workflow, Makefile or justfile) from matching itself,
and `[$]{{` keeps GitHub from parsing the filter as an expression. In CI, write
each as `if grep …; then exit 1; fi`, never `! grep …`, because a bare grep
exits 1 on the pass and a negated `! grep` never fails a `bash -e` step.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-02 | Never set, pass, script or recommend `accept-flake-config`: not as `--accept-flake-config`, not as `accept-flake-config = true` in any `nix.conf`, `NIX_CONFIG` or CI `extra_nix_config`, and not in `.envrc`, a Dockerfile, a README or an agent-instruction file (`AGENTS.md`, `CLAUDE.md`). Never answer Nix's "do you want to permanently mark this value as trusted" prompt with yes, and never pre-seed `~/.local/share/nix/trusted-settings.json`. | Acceptance lets the flake set daemon-scoped settings such as `post-build-hook`, which is root-equivalent when the caller is a trusted user. Maintainers confirm it is intended ([NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649)), and a flake's `post-build-hook` executed once the flag was passed. A "permanent" answer is stored per (setting, value), not per flake, and every later flake declaring the same pair is applied silently. 8 of 36 corpus repositories pass the flag, including CI that accepts a third-party flake's config on a moving ref and one `AGENTS.md`. | The NIX-SEC-02 line above. Watched red: a README install line, exit 0. Watched green: the clean twin and a tree carrying an installed copy of these rules and a workflow that runs the gate block, exit 1. A warning against the flag belongs in this rule, never in the repository, so no hit is exempt. The trust file is a reading heuristic: absent, or holding only `false` entries. | MUST, shapes A-E | all implementations, and Lix 2.95.2 has the same gate |
| NIX-SEC-03 | Supply a credential only as `access-tokens`, in a user `nix.conf` outside any repository, or in CI from a secret: `github_access_token: ${{ secrets.GITHUB_TOKEN }}` on `cachix/install-nix-action`, or `access-tokens = github.com=${{ secrets.… }}` (or the job token `${{ github.token }}`) in `extra_nix_config` or `NIX_CONFIG`. Never write a literal token into a tracked file. Never set `nix.settings.access-tokens` in a NixOS, nix-darwin or home-manager configuration. | A committed token is a permanent leak once the repository is public or forked. `nix.settings` is rendered into a generated `nix.conf` in the store, so even a secret-fed token there becomes a mode-444 file. | Greps (a), (b) and (c) above. Watched red: a literal `ghp_` token in `extra_nix_config` hit (a) and (b), and a secret-fed `nix.settings.access-tokens` hit (c), each exit 0. Watched green: the secret-fed workflow and a docs placeholder, exit 1 on all three. | MUST, shapes A-E | `access-tokens` syntax per the Nix 2.35 conf-file manual |
| NIX-SEC-08 | Never tell a user or an agent to add themselves to `trusted-users` to make a flake's cache or `nixConfig` work, in a README, docs, CI or an agent file. Document the administrator-side lines instead: `extra-substituters` and `extra-trusted-public-keys` in `/etc/nix/nix.conf`, or `trusted-substituters` so untrusted users may opt in. | The Nix manual says a trusted user is essentially root, and it is the precondition that turns NIX-SEC-02's acceptance into root. [NixOS/nix#6752](https://github.com/NixOS/nix/issues/6752) is the confusion that sends users there. | The NIX-SEC-08 line above. A hit passes only inside a host-administration module the flake exports on purpose (NIX-MOD). Watched red: README `trusted-users = root $USER`, exit 0. Watched green: exit 1. | MUST, shapes A-E | Nix 2.35 manual |
| NIX-SEC-09 | Enable no experimental feature beyond `nix-command flakes` in CI, docs or `nixConfig`. Never enable `ca-derivations` or `recursive-nix`. | Under `ca-derivations` any local user who can submit builds can poison realisations, because the daemon does not verify signatures on submitted realisations (GHSA-jm6c-h95p-6qhj, no backported fix as of 2026-09-27, re-check at each Nix security advisory). | The NIX-SEC-09 line above. Watched red: `extra_nix_config` enabling `ca-derivations`, exit 0. Watched green: exit 1. The attack itself was not reproduced, so the harm is a reading of the advisory. | SHOULD, shapes A-E | advisory status 2026-09-27 |

## What Reaches the Store

```sh
git ls-files -- '*.env' '*.env.*' '*.pem' '*.key' '*.p12' '*.pfx' '*secret*' '*token*' '*credential*'
nix derivation show -r .#default \
  | grep -E -c -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}'
```

The `git ls-files` line passes on empty output. Each hit is read: an encrypted
secrets-manager file (sops ciphertext, an agenix `.age` file) or a source file
named for a tokenizer passes, and a file holding a plaintext credential is the
finding. The derivation scan evaluates without building. Substitute each
fetcher-backed package for `.#default`. It passes on `0` with exit 1, and any
count above 0 with exit 0 is the finding. An error from `nix derivation show`
also ends in `0` and exit 1, so the pass is `0` with nothing on stderr.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-04 | Never let a secret reach evaluation. Never `git add` a secret-shaped file in a flake repository, even one the flake never reads, and never "so the flake can see it". Never read a secret with `builtins.readFile`, `builtins.getEnv` or a path literal. Never put a credential into a derivation attribute: a fetcher's `curlOptsList` or `netrc`, `env`, or interpolated builder text. Read a secret at run time from outside the closure: an environment variable, sops-nix or agenix. A module option holding a secret's path is NIX-MOD-06's. | Every store object is mode 444 and world-readable. Three routes, each measured. A tracked, never-read `secret.env` landed at mode 444 inside `…-source` once the flake interpolated `${self}`. A token in `fetchurl`'s `curlOptsList` sat in the `.drv` after evaluation alone. `builtins.readFile` put the value into the output, and `nix eval` printed it with no build ([Flakes](https://wiki.nixos.org/wiki/Flakes)). | (1) The `git ls-files` line above. Watched red: a tracked `secret.env` listed, and its store copy stat `444`. Watched green: the same file in `.gitignore` listed nothing and was absent from the store copy. (2) NIX-SEC-03's greps. (3) The derivation scan above. Watched red: a `curlOptsList` token counted `1`, exit 0. Watched green: the anonymous `Authorization: Bearer QQ==` twin (NIX-GEN-08) counted `0`, exit 1. The scan sees only GitHub and GitLab token shapes, so any other header in `curlOptsList`, `netrc` or `env` is a reading heuristic. (4) Reading heuristic over `builtins.readFile` and `builtins.getEnv`. The NIX-LANG-04 grep serves both rules: NIX-LANG-04 owns purity and this row owns secret placement. | MUST, shapes A-E, hardest for D, whose fetchers must carry only the anonymous header | CppNix 2.35.2 copies the source only when something interpolates `self`, and every flake whose `src` is `self` does |

## A Flake You Do Not Own

```sh
nix config show sandbox
nix flake show --no-write-lock-file --option allow-import-from-derivation false github:owner/repo/0123456789abcdef0123456789abcdef01234567
```

The first line must print `true` before any build. Substitute the reviewed
40-hex rev into the second. Before trusting the flag, probe it on an attribute
you suspect of IFD with
`nix eval --no-write-lock-file --option allow-import-from-derivation false github:owner/repo/0123456789abcdef0123456789abcdef01234567#default`
(substitute the reviewed rev and your attribute). Exit 0 means the attribute needs no IFD. Exit 1
with `cannot build '…' during evaluation because the option
'allow-import-from-derivation' is disabled` means it does, and the flake is not
inspected further without a human decision.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-05 | Before evaluating a flake you do not own, pin it by full 40-hex rev (`github:owner/repo/` plus the rev, never a branch, tag or `latest`). Run only `nix flake metadata`, `nix flake show`, `nix flake check --no-build` or a sandboxed `nix build`, each with `--no-write-lock-file --option allow-import-from-derivation false`. Never run `nix develop`, `nix shell`, `nix run` or `direnv allow` on it. Never add `--impure`, `--accept-flake-config` or `--option sandbox false`. Build only where `nix config show sandbox` prints `true`. **Pinned default:** `nix develop` on the project's own flake is allowed at a commit the agent or owner authored or reviewed, never on a fork's pull request. | IFD defaults to `true`, so a "read-only" `show` or `check --no-build` can build and run code during evaluation, and `pure-eval` does not stop it. A `shellHook` runs unsandboxed as the invoking user with the real `$HOME`, while a sandboxed build of the same flake could not write outside the store. A branch or tag can move between review and evaluation. NIX-INP-12 cites this row for the untrusted-evaluation procedure. | The invocation above, read before the first command runs: the ref is 40-hex and the flag list matches. Watched red: an IFD attribute printed `42`, exit 0, by default, and failed under the flag with the verbatim error, exit 1. Watched green: the no-IFD twin exit 0 both ways. `nix config show sandbox` printed `true` on Linux. | MUST, every clause, whatever the inspected flake's shape | CppNix 2.35.2 and Lix 2.95.2 (same IFD default and error). The macOS sandbox default is a manual reading only |

## The Nix Version CI Runs

Save this as `cve-floor.nix` beside the CI scripts:

```nix
# CppNix fix per release line for CVE-2026-39860 (GHSA-g3g9-5vj6-r3gj, 2026-04-07).
# Lines above 2.35 postdate the fix. Re-check at each Nix security advisory.
{ v }:
let
  fixed = {
    "2.28" = "2.28.6";
    "2.29" = "2.29.3";
    "2.30" = "2.30.4";
    "2.31" = "2.31.4";
    "2.32" = "2.32.7";
    "2.33" = "2.33.4";
    "2.34" = "2.34.5";
    "2.35" = "2.35.2";
  };
  parts = builtins.splitVersion v;
  line = "${builtins.elemAt parts 0}.${builtins.elemAt parts 1}";
  ok =
    if fixed ? ${line} then
      builtins.compareVersions v fixed.${line} >= 0
    else
      builtins.compareVersions v "2.36" >= 0;
in
if ok then true else throw "CppNix ${v} is below the CVE-2026-39860 fix for its release line"
```

```sh
# the Nix running on this runner or builder
nix eval --file ./cve-floor.nix --apply 'f: f { v = builtins.nixVersion; }' ''
# the version the installer pin names (substitute it)
nix eval --file ./cve-floor.nix --apply 'f: f { v = "2.35.2"; }' ''
```

`true` with exit 0 is the pass. Exit 1 with `CppNix … is below the
CVE-2026-39860 fix` is the finding. Never run it on a Lix leg: Lix 2.95.2
reports `builtins.nixVersion` as `2.18.3-lix`, which fails the table.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-06 | Run CI and every self-hosted builder on CppNix at or above the CVE-2026-39860 fix for its release line: 2.28.6, 2.29.3, 2.30.4, 2.31.4, 2.32.7, 2.33.4 or 2.34.5, and 2.35.2 or later on the 2.35 line. Pin it through NIX-GATE-13's `install_url`. Re-run the check whenever the pinned nixpkgs or the installer moves, and never write a remembered minimum version into docs or CI. | In [GHSA-g3g9-5vj6-r3gj](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) (critical, 2026-04-07), any user allowed to submit builds, which is everyone under the default `allowed-users = *`, escalates to root through a symlinked temp copy of a fixed-output derivation's output. The advisory names no 2.35 release, so 2.35.0 and 2.35.1 stay below the floor until a source read shows they carry the fix. | The two commands above. Watched red: `2.34.4`, `2.35.1` and `2.27.9` each threw, exit 1. Watched green: `2.31.5`, `2.34.8`, `2.35.2` and `2.36.0` printed `true`, exit 0, and so did `builtins.nixVersion` on CppNix 2.35.2 and 2.31.5. NIX-GATE-16's floor of 2.31.5 sits above the 2.31.4 fix. | MUST, the CI and builders of every shape | CppNix only (**pinned default**). Lix and Determinate Nix advisories unmeasured (re-check at each Lix and Determinate release) |

## The Lock-Bump Review

```sh
git show origin/main:flake.lock | jq -n -r --slurpfile head flake.lock '
  def owners: [.nodes[] | .original // empty | if .owner then .type + ":" + .owner + "/" + .repo elif .url then .type + ":" + (.url | sub("[?#].*$"; "")) else .type + ":" + (.id // .path // "?") end] | unique;
  (input | owners) as $base | ($head[0] | owners) as $new
  | (($new - $base)[] | "added   " + .), (($base - $new)[] | "removed " + .)'
```

Run it on the lock-bump branch with `origin/main` as the base. Empty output
(exit 0) is the pass. Every `added` or `removed` line is a review item a human
decides on. A missing base ref or an unparsable lock fails loudly: `git show`
prints `fatal:` and jq exits 5, or jq reports `Bad JSON` and exits 2.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-SEC-07 | Diff the set of input owners and repositories on every PR that adds an input or bumps the lock, and have a human approve any change. Never auto-merge a lock-bump PR: NIX-INP-11 opens it and a person merges it. Treat flake-checker as covering only nixpkgs-keyed inputs, and run it with `--fail-mode` (NIX-GATE-11). | No lock-level tool caught the xz backdoor, and nixpkgs reverted it the same day ([nixpkgs#300028](https://github.com/NixOS/nixpkgs/pull/300028)), so the revert reaches you only through a reviewed bump. flake-checker's `--check-owner` checks only that nixpkgs inputs are owned by NixOS. A retargeted library input drew 0 owner warnings, and without `--fail-mode` flake-checker exits 0 on findings. | The command above. Watched red: retargeting `ipetkov/crane` to `ipetk0v/crane` printed `added   github:ipetk0v/crane` and `removed github:ipetkov/crane`. Watched green: a rev-only bump printed nothing. An added `git` input printed `added   git:https://evil.example/x`. Watched red on a `git+https` input retargeted from ipetkov to ipetk0v (both lines printed), on an `indirect` id retargeted (`added   indirect:evilpkgs`) and on an added absolute `path:` input (2026-09-27, jq 1.8.1). The auto-merge half is a reading heuristic over the lock-update workflow: no `gh pr merge --auto` and no auto-merge label. | SHOULD, shapes A-E, because a person decides whether a new owner is legitimate | flake-checker 0.2.15, lock version 7 |

## What Agents Get Wrong Here

Ranked by how often each would bite, from corpus prevalence and how plausible
the move looks to a model.

1. **Passing `--accept-flake-config` to silence the untrusted-setting warning**, or copying it from an install line or an `AGENTS.md` (NIX-SEC-02).
2. **Running `git add` on a `.env` or key file because "flakes only see tracked files"**, then interpolating `self`, which lands it in the store at mode 444 (NIX-SEC-04).
3. **Running `nix develop`, `direnv allow` or `nix run` on a flake it was only asked to inspect.** The `shellHook` runs as the user (NIX-SEC-05).
4. **Adding more `nixConfig` keys in the belief that they apply**: `allow-import-from-derivation`, `warn-dirty`, `extra-trusted-substituters`, `experimental-features`, `sandbox` (NIX-SEC-01).
5. **Hardcoding a token to fix a private-fetch 401** in `curlOptsList`, a committed `nix.conf` or `nix.settings.access-tokens`. The token is in the `.drv` before any build (NIX-SEC-03, NIX-SEC-04).
6. **Telling the user to add themselves to `trusted-users`** so a flake's cache "works" (NIX-SEC-08).
7. **Assuming IFD is opt-in, or that `--pure-eval` or `--no-build` blocks it**, when "safely" running `show` or `check` on a third-party flake (NIX-SEC-05).
8. **Inspecting a third-party flake by branch or `latest` tag**, reusing the install idiom (NIX-SEC-05).
9. **Reporting a green flake-checker as "no supply-chain issues"** (NIX-SEC-07).
10. **Writing a remembered "minimum Nix" version into docs or CI** instead of checking the installed version against the fix table (NIX-SEC-06).
11. **Answering Nix's trust prompt with "permanently"**, which then applies that (setting, value) to every flake silently (NIX-SEC-02).
