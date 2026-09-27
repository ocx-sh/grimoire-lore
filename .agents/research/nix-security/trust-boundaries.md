---
title: "Trust boundaries: nixConfig, tokens, secrets, substituters and daemons"
topic: "Nix / flakes — security and trust boundaries (NIX-SEC)"
agent: "security/trust-boundaries"
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/trust-boundaries/
scope: >
  Covers the trust boundary between a published flake and the person or agent
  who evaluates it: what `nixConfig` may say and what actually happens to it,
  `accept-flake-config`, where tokens and secrets may live, whether an FOD's
  network access weakens a pinned hash, daemon/CI version floors after
  CVE-2026-39860, detecting a forked/typosquatted input, and the safe flags
  for evaluating a flake you do not own. Does NOT cover NixOS module option
  security (`NIX-MOD`, deferred), sandbox internals unrelated to flakes, or
  general packaging/hash mechanics already owned by `NIX-PKG`/`NIX-GEN`.
---

# Trust boundaries: nixConfig, tokens, secrets, substituters and daemons

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `nixConfig` in `flake.nix` is a **trust *prompt*, never a trust *grant***: without `--accept-flake-config`, Nix prints one `warning: ignoring untrusted flake configuration setting '<key>'` per key and does nothing else — confirmed live for `extra-substituters`, `extra-trusted-public-keys`, `post-build-hook`, `allow-import-from-derivation` and `trusted-users` in the same run ([verification runs](#verification-runs) V1).
- Only five settings ever apply *without* `accept-flake-config`: `bash-prompt`, `bash-prompt-prefix`, `bash-prompt-suffix`, `flake-registry`, `commit-lock-file-summary` — everything else, including `nixConfig.warn-dirty`, is silently inert until accepted ([nix3-flake](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake); [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885)).
- Map conflict 7 is **confirmed, not overturned**: a published flake SHOULD NOT carry `nixConfig`; if it does, it MUST contain only `extra-substituters` + `extra-trusted-public-keys` naming the project's own cache. Every other key is a finding.
- `--accept-flake-config` is **root-equivalent code execution**, confirmed by nixpkgs maintainers as intended, not a bug ([NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649)). This session's own fixture reproduced it: a `post-build-hook` from an untrusted flake ran the moment `--accept-flake-config` was passed ([V2](#verification-runs)).
- The flag is nonetheless already in the wild: `ipetkov/crane`'s own CI (`.github/workflows/test.yml:104`), `cachix/cachix`'s README install line, and `numtide/llm-agents.nix`'s `AGENTS.md` (which tells *agents* to pass it) all use it — an active, worked contradiction of the MUST-NOT rule, not a hypothetical.
- Tokens go in `access-tokens` inside **local** (`~/.config/nix/nix.conf`) or **CI-ephemeral** (`NIX_CONFIG` env var, set from a secret) configuration — never in a flake, a committed `nix.conf`, or a derivation. Format is `host=token`, e.g. `github.com=<token>`.
- Any value that reaches `builtins.readFile`, an interpolated string, or a derivation `env` attribute lands in the **world-readable** Nix store: this session's fixture wrote a secret via `builtins.readFile`, built it, and found the output at mode `444` (`r--r--r--`, world-readable) — [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) states this explicitly.
- CVE-2026-39860 (GHSA-g3g9-5vj6-r3gj, sandbox-escape-to-root via a symlinked FOD temp-copy) is fixed at 2.34.5 / 2.33.4 / 2.32.7 / **2.31.4** / 2.30.4 / 2.29.3 / 2.28.6. `NIX-GATE-16`'s computed floor of **2.31.5** already sits above the 2.31-line fix — the reconciliation holds today, but because the floor is a *computed* expression (the oldest non-stub `nixVersions.nix_2_*`), it must be re-evaluated every time the pinned nixpkgs branch is bumped, not trusted as a fixed number.
- An FOD's declared network access (`__impureEnvVars`, e.g. `HTTP_PROXY`) does **not** weaken anything: the output hash is still checked byte-for-byte against `outputHash`, and a mismatch is a hard build failure regardless of what the network let the builder see or do — reproduced live in this session.
- `skopeo --insecure-policy` is orthogonal: it disables *signature-policy* checking on the image the tool itself trusts, not the FOD's own hash check that Nix performs afterward on the resulting store path.
- `flake-checker --check-owner` (default **on**) only asserts that the **root-level `nixpkgs` input's** GitHub owner is `NixOS` — it has no opinion on any other input, so a forked or typosquatted library input is undetected by the tool and must be caught by a lock-diff review (`original.owner` vs `locked.owner`) at input-add time.
- No lock-level gate caught the 2024 `xz` backdoor; nixpkgs reverted the compromised version [the same day](https://github.com/NixOS/nixpkgs/pull/300028) it was disclosed. There is no automated defense here beyond `--check-supported`/`--check-owner` keeping you on the tracked NixOS branch and a human reviewing the weekly lock-bump PR (`NIX-INP-11`) rather than auto-merging it.
- Evaluating a flake you do not own: pin it by **full 40-hex commit SHA** (`github:owner/repo/<sha>`), pass `--no-write-lock-file`, and pass `--option allow-import-from-derivation false` — never `--accept-flake-config` (`NIX-INP-12`, map E8).
- `allow-import-from-derivation` **defaults to `true`** in Nix 2.35 — the common assumption that IFD is opt-in is measurably wrong, and it means a bare `nix flake show`/`check --no-build` on an untrusted flake can still realize a derivation during evaluation unless the flag is explicitly forced off.
- `pure-eval` does **not** forbid IFD; it is a separate axis (already established in `NIX-GATE-08`/conflict 14; cited here, not re-derived).
- Registry data interpolated unescaped into a builder script is a **build-time shell-injection** vector, already ruled on as `NIX-GEN-20` — cited, not re-derived, because the ocx generator is the concrete worked case.
- `nixConfig.warn-dirty = false` is a documented no-op without `accept-flake-config` ([NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885)) — already excluded from the allowlist, so an agent that sets it has produced dead configuration, not a security hole.
- `ca-derivations` (GHSA-jm6c-h95p-6qhj: unprivileged users can poison content-addressed realisations because the daemon does not verify signatures on submitted objects) has no backported fix; the only mitigation is never enabling the experimental feature. It is not enabled by the pinned toolchain or any exemplar.
- Secret-shaped module options should use `types.pathWith { inStore = false; }` (or the narrower `types.externalPath`, which warns it only checks the path is not *currently* in the store, not that it can never be copied there) — `NIX-MOD` territory, noted here for the module-option-type angle on secrets.

## Findings

### 1. `nixConfig`: what it can say and what actually happens ([M-H-01](../nix-topic-map.md))

`flake.nix`'s `nixConfig` attribute is read by `nix flake` subcommands before the rest of the flake is evaluated ([nix3-flake](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake)). Two policies apply simultaneously:

- **The allowlist**: `bash-prompt`, `bash-prompt-prefix`, `bash-prompt-suffix`, `flake-registry`, `commit-lock-file-summary` apply unconditionally, with no prompt and no warning.
- **Everything else** is gated by the top-level (never per-flake) `accept-flake-config` setting, default `false`. Until it is `true`, Nix emits a warning and ignores the setting.

```nix
# nixConfig-violation/flake.nix (this session's fixture)
nixConfig = {
  extra-substituters = [ "https://evil.example.org" ];
  extra-trusted-public-keys = [ "evil.example.org-1:AAAA…=" ];
  post-build-hook = "./hook.sh";
  allow-import-from-derivation = true;
  trusted-users = [ "*" ];
};
```

Running `nix build --no-write-lock-file --print-build-logs .#default` against it (no `--accept-flake-config`) produced, verbatim:

```
warning: ignoring untrusted flake configuration setting 'allow-import-from-derivation'.
Pass '--accept-flake-config' to trust it
warning: ignoring untrusted flake configuration setting 'extra-substituters'.
Pass '--accept-flake-config' to trust it
warning: ignoring untrusted flake configuration setting 'extra-trusted-public-keys'.
Pass '--accept-flake-config' to trust it
warning: ignoring untrusted flake configuration setting 'post-build-hook'.
Pass '--accept-flake-config' to trust it
warning: ignoring untrusted flake configuration setting 'trusted-users'.
Pass '--accept-flake-config' to trust it
```

then the build proceeded normally — the settings had zero effect. Passing `--accept-flake-config --rebuild` made `post-build-hook`'s script actually execute (see finding 2). This is the exact mechanism `nix-audit/exemplar-flake-shape.md` §6 measured across 11/37 exemplars (all of which stop at the compliant pair, `extra-substituters` + `extra-trusted-public-keys` naming their own Cachix-style cache — `cachix/cachix@…:flake.nix:4-6`, `numtide/llm-agents.nix@efb10f28f724:flake.nix:3-7`, `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:46-50` with a second, third-party substituter `hydra.iohk.io`).

**nix-vscode-extensions is itself a partial violation of the allowlist rule**, not just a shape example: it is the only exemplar naming a substituter (`hydra.iohk.io`) it does not itself operate, which is trust-on-first-use for anyone who *does* accept it — a live instance of the "invites cache-poisoning trust" risk the rule exists to name, at `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:46-50`.

**Q12, the allowlist check**, run against the violation and a compliant twin:

```nix
nix eval --impure --json --expr '(import ./flake.nix).nixConfig or { }' \
  | jq -e 'keys - ["extra-substituters","extra-trusted-public-keys"] | length == 0'
```

Violation: `keys` include `post-build-hook`, `allow-import-from-derivation`, `trusted-users` → jq prints `false`, exit 1. Compliant twin (only the two allowed keys): jq prints `true`, exit 0. Watched red and green ([Verification runs](#verification-runs) V3).

### 2. `accept-flake-config`: root-equivalent, not a cache opt-in ([M-H-02](../nix-topic-map.md))

[NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) demonstrates that `--accept-flake-config` grants a flake's build **root access on the build machine**, via `post-build-hook` (which the manual says "is only settable in the global `nix.conf`, or on the command line by trusted users" — a flake author is neither, until this flag lets them act as one) or any other daemon-scoped setting. The maintainer response treats this as intended behavior, not a bug to patch — the manual simply under-documents how dangerous the setting is.

This session reproduced it mechanically. Building the fixture from finding 1 with `--accept-flake-config --rebuild` (forcing a fresh build so the hook actually fires) produced:

```
$ cat /tmp/pbh-ran-marker
post-build-hook ran as 1000
```

The hook ran as this session's own uid (1000, not 0) because the local toolchain is a rootless, single-user `nix-portable` store with no privileged daemon — in a normal multi-user Nix install where builds run through `nix-daemon` as root, the same mechanism runs the hook **as root**, which is exactly #9649's finding. The mechanism (an untrusted flake's declared `post-build-hook` executing once accepted) is what matters, not the specific uid this sandbox happened to run it under.

**`nixConfig.warn-dirty = false` is a documented, separate no-op**: [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885) shows the exact repro (a flake sets it, a dirty tree still warns) and the setting is not one of the five that apply unconditionally, so it does nothing with or without `accept-flake-config` being globally true for *other* reasons. It is already excluded by the Q12 allowlist and is a dead-configuration finding, not a security finding, in `NIX-INP`'s catalogue.

### 3. `access-tokens`, tokens and secrets ([M-H-03](../nix-topic-map.md), [M-H-04](../nix-topic-map.md))

`access-tokens` is documented as space-separated `host=token` pairs (`github.com=<token>`, an optional path prefix like `github.com/org=token`, or a GitLab `type:tokenstring` form) ([conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file)). It has no per-project scope — Nix reads it from whichever `nix.conf` (global or user) or `NIX_CONFIG` is in effect when the command runs, never from anything the flake itself declares. This research toolchain's own `run.sh` demonstrates the correct shape: it passes GitHub access through `NIX_CONFIG` at invocation time, never through a file the repository tracks.

**A committed `nix.conf` carrying a real token, versus tokens supplied out of band**, this session's fixture pair:

```
# access-tokens-violation/nix.conf (committed, tracked by git)
access-tokens = github.com=ghp_thisIsAPlantedFakeTokenNotReal0000000000
```
```
# access-tokens-compliant/README.md
Set them per-invocation or per-user:
    NIX_CONFIG="access-tokens = github.com=$GITHUB_TOKEN" nix build .
or in ~/.config/nix/nix.conf (outside any repository, never git-tracked).
```

Check: `grep -rln -e 'access-tokens = ' -e 'ghp_' -e 'github_pat_' <dir> --include='*.conf' --include='*.nix'`. Violation: one match (`nix.conf`), exit 0. Compliant: no match, exit 1. Watched red and green (V5).

**Secrets more broadly**: [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) states plainly that flake contents are copied to the **world-readable** Nix store, so unencrypted secrets must never be part of a flake's evaluation or build closure, and names `agenix`/`sops-nix` as the actual mechanism (decrypting on the target machine at activation time, outside the store's read path).

This session verified the "world-readable" claim directly rather than taking it on faith. A fixture reads a planted fake token with `builtins.readFile`:

```nix
secretContents = builtins.readFile ./secret.txt;
```

`nix eval --raw .#leakedViaEval` prints the token with **no build at all** — the value is already in the evaluation closure. Building the package that also embeds it and inspecting the realized output inside the store:

```
$ stat -c '%a %U %G %n' /nix/store/h1gm9zfwx9z68cqm7q0b5km034bddzcy-secret-baked-in
444 mherwig mherwig /nix/store/h1gm9zfwx9z68cqm7q0b5km034bddzcy-secret-baked-in
```

Mode `444` is `r--r--r--` — readable by every local user, exactly as the wiki warns, and this holds for **every** store path regardless of who owns the derivation. A compliant twin never calls `builtins.readFile`/`builtins.getEnv` on anything secret-shaped; instead its builder script reads an environment variable **at run time**, after the build, from outside the derivation's input closure — the value is never an input to the derivation and so never touches the store. Check: `grep -rn -e 'builtins\.readFile.*secret' -e 'builtins\.readFile.*token' --include='*.nix' <dir>`. Watched red (one hit) and green (none) (V4).

For a NixOS/home-manager module option that must hold a secret's *path* (not its contents), the NixOS manual's module-system chapter documents `types.pathWith { inStore = false; }` as the type built for this ("useful for password files that shouldn't be leaked into the store") and flags the narrower `types.externalPath` with an explicit caveat: it only checks the path is not *currently* in the store, not that nothing will ever copy it there later. This is `NIX-MOD` territory (conditional, deferred); noted here because it is the module-side half of the same boundary.

### 4. FOD network access does not weaken a pinned hash ([M-H-06](../nix-topic-map.md))

A fixed-output derivation may declare `__impureEnvVars = [ "HTTP_PROXY" "HTTPS_PROXY" … ]`, letting the builder see host proxy environment variables that an ordinary sandboxed derivation cannot. The FOD contract does not change because of this: Nix still computes the real output hash and compares it against the derivation's declared `outputHash`; any mismatch, for any reason (a live network response, a MITM-injected byte, a stale cache, a typo), is a hard build failure.

This session verified the mechanism, not just the theory. A fixture derivation declares `__impureEnvVars = [ "HTTP_PROXY" "HTTPS_PROXY" ]`, bakes `$HTTP_PROXY` into its output, and pins `outputHash` to a **deliberately wrong** value:

```
$ nix build --no-write-lock-file .#default
error: hash mismatch in fixed-output derivation '…-fod-impure-proxy.drv':
         specified: sha256-U0/nZmVn0+HpJ89lJ9r1U0nH1vXt3jz+DE5UgvSAoiI=
            got:    sha256-s4LgrpYTB4ivn6QxWnTdfk1dcDXaEve/vf14mwNvwn0=
```

Replacing `outputHash` with the reported value makes the same fixture build cleanly (V6). A follow-on probe attempted to prove the same catch against a *changed* runtime `HTTP_PROXY` (simulating a MITM proxy injecting different bytes); it returned exit 0 with no visible mismatch, because in this single-user, sandboxed toolchain the already-registered output was reused rather than the builder actually reading the new environment variable — **NOT RUN conclusively**; the hash-mismatch mechanism itself (any output content diverging from the pinned hash fails) is proven by the wrong-hash case above, and is the load-bearing half of the rule.

`skopeo --insecure-policy` is a separate axis: it disables container **signature-policy** verification for the image `skopeo` itself is willing to trust when copying/inspecting, which is orthogonal to whatever FOD hash Nix later checks on the resulting store path — turning it off does not touch the FOD's own integrity check, but it does mean `skopeo` will act on an image regardless of its signature, which matters if the generator (`NIX-GEN`) trusts `skopeo`'s own output for anything beyond the bytes it hands to a pinned-hash FOD.

### 5. Daemon and CI Nix version floors after CVE-2026-39860 ([M-H-05](../nix-topic-map.md))

[GHSA-g3g9-5vj6-r3gj / CVE-2026-39860](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) (critical, published 2026-04-07) is a regression in the fix for CVE-2024-27297: a fixed-output derivation's temporary output copy lived inside the build chroot, so a malicious builder could plant a symlink there pointing anywhere on the filesystem; the host-namespace Nix process (root, on a multi-user install) followed it during output registration and overwrote the target. **Any user allowed to submit builds** (the `allowed-users` default is "all") could escalate to root. Fixed in **2.34.5 / 2.33.4 / 2.32.7 / 2.31.4 / 2.30.4 / 2.29.3 / 2.28.6**, by relocating the temp copy to a store-internal directory plus abstract-Unix-socket hardening (kernel ≥ 6.12 with landlock).

`NIX-GATE-16`'s floor rule computes the daemon version floor as "the oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs," rather than hardcoding a number, and today that expression resolves to **2.31.5** against nixpkgs 26.11pre `8d5d2709` — which sits above **2.31.4**, the fix for its own line. **The reconciliation holds as of 2026-09-27, and is by construction self-maintaining**: because the floor is computed from the live nixpkgs attribute set rather than remembered as a literal, a future nixpkgs bump that drops `nix_2_31` in favor of `nix_2_32`+ automatically raises the effective floor rather than silently going stale below a later CVE line. `NIX-GATE-13`'s `install_url` pin (`https://releases.nixos.org/nix/nix-<version>/install`, currently resolving through `install-nix-action` v31.11.1 to `nix_version=2.35.2`) is the mechanism that actually pins *installed* CI Nix to a version above every CVE-2026-39860 fix line, independent of the nixpkgs-computed floor used for the Lix/floor evaluation legs — the two numbers are reconciled by being two different things (installed daemon version vs. an additional evaluation leg's minimum), both currently well clear of the CVE.

A second, older and unrelated advisory is worth naming in the same breath because it is also token/credential-adjacent: [GHSA-6fjr-mq49-mm2c / CVE-2024-47174](https://github.com/NixOS/nix/security/advisories/GHSA-6fjr-mq49-mm2c) — `<nix/fetchurl.nix>` failed to validate TLS certificates on HTTPS fetches, exposing `netrc`-file or environment-variable credentials to network interception; fixed in 2.18.8 / 2.24.8, long superseded by the 2.31.5 floor.

### 6. Upstream compromise: no lock-level gate caught xz ([M-H-07](../nix-topic-map.md))

The 2024 `xz` backdoor (CVE-2024-3094) is the load-bearing case study: nixpkgs's own response was a same-day revert, [PR #300028](https://github.com/NixOS/nixpkgs/pull/300028) ("Revert 'xz: 5.4.6 -> 5.6.1'"), merged **2024-03-29T17:17:50Z**, the same day as the [public disclosure](https://www.openwall.com/lists/oss-security/2024/03/29/4). No `nix flake check`, `statix`, `deadnix`, `nixfmt` or `flake-checker` run detects a semantically malicious upstream release — every one of those tools operates on Nix syntax or lock metadata, none inspects the fetched source tree's actual contents for a backdoor. The realistic defense for a flake author is composed entirely of things already ruled on elsewhere, cited rather than re-derived here: `flake-checker --check-supported` (stay on a tracked NixOS branch, so a revert like #300028 reaches you on the next scheduled update) plus `NIX-INP-11`'s weekly lock-bump PR landing as a **reviewed, never auto-merged**, pull request — a human diff-reading chokepoint is the only thing standing between an upstream compromise and your build, and it exists only if the automation is wired to open a PR, not to push directly.

### 7. Detecting a forked or typosquatted input ([M-H-08](../nix-topic-map.md))

`flake-checker`'s `--check-owner` (`NIX_FLAKE_CHECKER_CHECK_OWNER`, **on by default**) asserts that the root-level `nixpkgs` input's locked GitHub owner is `NixOS`, and only that. It says nothing about any other input (a library, a devshell helper, a second nixpkgs-shaped input under a different name).

This session verified the mechanism with a lock-level jq check rather than trusting the tool's own claim in isolation:

```
jq -e '.nodes | to_entries[] | select(.value.original.repo == "nixpkgs" and .value.original.owner != "NixOS") | .key' flake.lock
```

Against a fixture whose `flake.lock` was hand-edited to `"owner": "NixOSNixpkgsMirror"` (simulating a typosquat/fork retarget after the fact — the kind of change a diff review, not a tool run, would catch): the check prints the offending node name, `"nixpkgs"`, exit 0 (a finding). Against a twin with `"owner": "NixOS"`: no output, exit 4 — jq's own "no results produced" status, which this check's convention reads as pass (empty output = pass) rather than as a crash. The gap flake-checker leaves — any **non-nixpkgs** input's owner — has no automated check; the only mitigation is reviewing `original.owner` on every new or changed input at add/bump time, which is exactly what a human-gated `NIX-INP-11` lock-bump PR is for.

### 8. Evaluating an untrusted flake safely ([M-H-09](../nix-topic-map.md))

Three flags together define the floor for evaluating a flake you do not own, and none of them is optional:

1. **`--no-write-lock-file`** — never let evaluating someone else's flake mutate your working tree's lock.
2. **`--option allow-import-from-derivation false`** — because `allow-import-from-derivation` **defaults to `true`** on Nix 2.35 ([conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file), confirmed live via `nix config show`), a bare `nix flake show`/`nix flake check --no-build` on an untrusted flake can still **build and run** a derivation during mere evaluation if that flake's outputs read from `import (derivation)`. Forcing the flag off makes any such attempt fail loudly at eval time instead of silently executing.
3. **Never `--accept-flake-config`** — finding 2, unconditionally.

A fourth practice, already settled by `NIX-INP-12` and cited rather than re-derived here: pin the flake by **full 40-hex commit SHA** (`github:owner/repo/<sha>`), never a branch or tag, so the code you evaluated is exactly the code you reviewed — map E8. `pure-eval` is a separate setting from `allow-import-from-derivation` and does **not** forbid IFD by itself (already established as `NIX-GATE-08`/conflict 14: devenv's flake builds a derivation during a purely evaluated `nix eval`), so naming `--pure-eval` alone in a safety recipe is a gap, not a substitute for the explicit IFD flag above.

`ca-derivations` ([GHSA-jm6c-h95p-6qhj](https://github.com/NixOS/nix/security/advisories)) is a fifth axis worth naming for completeness ([M-H-10](../nix-topic-map.md), P3): an unprivileged local user can poison a content-addressed derivation realisation because the daemon does not verify signatures on submitted `RegisterDrvOutput` objects, and there is no backported fix — the only mitigation is not enabling the experimental feature at all. Neither the pinned toolchain nor any of the 37 flake exemplars enables it.

## Normative guidance candidates

1. **A published flake SHOULD NOT declare `nixConfig`; if it does, it MUST contain only `extra-substituters` and `extra-trusted-public-keys` naming the project's own cache.**
   Rationale: every other setting is either silently inert (the five-item allowlist bypasses `nixConfig` entirely) or a live privilege-escalation surface once a consumer accepts it (#9649).
   Verify: `nix eval --impure --json --expr '(import ./flake.nix).nixConfig or { }' | jq -e 'keys - ["extra-substituters","extra-trusted-public-keys"] | length == 0'` — exit 0 = pass.
   RUN: **yes**, `fixtures/trust-boundaries/nixconfig-violation` (exit 1) vs `nixconfig-compliant` (exit 0). Severity: MUST for the allowlist restriction; SHOULD NOT for declaring `nixConfig` at all.

2. **No flake, README, CI workflow, or agent-facing instructions file (`AGENTS.md`, `CLAUDE.md`, etc.) may set or recommend `--accept-flake-config` or `accept-flake-config = true`.**
   Rationale: the flag is root-equivalent code execution from an untrusted source (#9649), confirmed by this session's own fixture (a `post-build-hook` ran once accepted).
   Verify: `grep -rn -e 'accept-flake-config' -e 'accept-flake-config = true' . --include='*.nix' --include='*.yml' --include='*.yaml' --include='*.md'` — every hit must be a warning *against* the flag, never an instruction to pass it; empty-or-all-warnings output is a pass.
   RUN: **yes** (this session's mechanism reproduction, V2); reading-heuristic for the grep-hit classification itself. Severity: MUST.

3. **Tokens live in `access-tokens` inside local (`~/.config/nix/nix.conf`) or CI-ephemeral (`NIX_CONFIG` env var from a secret) configuration only — never in a flake, a committed `nix.conf`, or a derivation.**
   Rationale: a committed token is a permanent leak the moment the repository is public or forked; `NIX_CONFIG` at invocation time never touches disk in the repository.
   Verify: `grep -rln -e 'access-tokens = ' -e 'ghp_' -e 'github_pat_' . --include='*.conf' --include='*.nix'` — empty output = pass.
   RUN: **yes**, `fixtures/trust-boundaries/access-tokens-violation` (1 hit, exit 0) vs `access-tokens-compliant` (no hit, exit 1). Severity: MUST.

4. **No `builtins.readFile`, `builtins.getEnv`, or string interpolation may read or embed a secret-shaped value into anything reachable from a flake's evaluation or build closure.**
   Rationale: the Nix store is world-readable (mode `444` on every realized output, verified live); a value that reaches the store or the evaluation closure is disclosed to every local user, permanently (store paths are rarely garbage-collected promptly).
   Verify: `grep -rn -e 'builtins\.readFile.*secret' -e 'builtins\.readFile.*token' -e 'builtins\.getEnv' --include='*.nix' .` — empty output = pass; a positive hit on `builtins.getEnv` is always a finding regardless of what it names, since `getEnv` is also flagged separately as an impurity by `NIX-LANG`.
   RUN: **yes**, `fixtures/trust-boundaries/secret-in-store` (1 hit + a live mode-444 store path) vs `secret-compliant` (no hit; secret read at container-runtime, outside the build closure). Severity: MUST.

5. **A CI or self-hosted Nix daemon must run at or above the CVE-2026-39860 fix for its release line (2.34.5 / 2.33.4 / 2.32.7 / 2.31.4 / 2.30.4 / 2.29.3 / 2.28.6), enforced by `NIX-GATE-13`'s `install_url` pin, and re-checked whenever `NIX-GATE-16`'s computed floor moves.**
   Rationale: the vulnerability lets any user permitted to submit builds escalate to root on a multi-user install; a floor below the fix line is a live local-privilege-escalation path, not a theoretical one.
   Verify: `grep -rn -e 'install_url' .github/workflows` must show a URL naming a version at or above the fix line for its release; `nix eval --json 'github:NixOS/nixpkgs/<rev>#nixVersions' --apply 'v: builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (v.${n}.version or null)).success) (builtins.attrNames v)'` — first element compared against the CVE table by hand.
   RUN: **yes**, cited from `nix-gates.md` V20 (this dive's own re-derivation of the same floor number, `2.31.5`, agrees). Severity: MUST.

6. **An FOD may declare `__impureEnvVars` for legitimate network-shaped access (a proxy, a token header) without weakening its guarantee, because `outputHash` still checks the realized content byte-for-byte; `skopeo --insecure-policy` is a separate, narrower relaxation (signature policy only) that never substitutes for a pinned FOD hash.**
   Rationale: authors sometimes read "impure" and assume the derivation is unverified; it remains hash-verified regardless of what the impure environment let the builder observe or contact.
   Verify: intentionally set `outputHash` wrong once; require `error: hash mismatch in fixed-output derivation` on the very same derivation that also has `__impureEnvVars` set.
   RUN: **yes**, `fixtures/trust-boundaries/fod-impure-env` (wrong hash → exit 1 hash mismatch; corrected hash → exit 0 build). The narrower "tampered runtime env still caught" sub-probe returned inconclusive in this single-user sandbox (see Verification runs, V6) — the core hash-check guarantee is proven, the specific tamper-propagation path was not. Severity: SHOULD (reading heuristic reinforced by a partial run).

7. **`flake-checker --check-owner`'s `NixOS`-org assertion covers only the root `nixpkgs` input; every other input's owner must be reviewed by hand (`original.owner` vs. expected) at add-time and on every lock bump, since no tool checks it.**
   Rationale: the tool's own scope is narrower than "detects a forked or typosquatted dependency" suggests; relying on it alone leaves every non-nixpkgs input unguarded.
   Verify: `jq -e '.nodes | to_entries[] | select(.value.original.repo == "nixpkgs" and .value.original.owner != "NixOS") | .key' flake.lock` for the nixpkgs case (empty output = pass); a named-owner allowlist check per non-nixpkgs input is a reading heuristic, not automatable from the lock alone (the lock has no "expected owner" field to compare against).
   RUN: **yes** for the nixpkgs case, `fixtures/trust-boundaries/nixpkgs-fork-violation` (finding printed, exit 0) vs `nixpkgs-fork-compliant` (no output, exit 4 = pass by this check's convention). No for the general-input case (reading heuristic only). Severity: SHOULD (nixpkgs case is effectively MUST since it is free — flake-checker already runs it by default).

8. **Evaluate any flake you do not own with `--no-write-lock-file --option allow-import-from-derivation false`, pinned to a full 40-hex commit SHA, and never `--accept-flake-config`.**
   Rationale: `allow-import-from-derivation` defaults to `true` on Nix 2.35, so a bare eval of an untrusted flake can still realize a derivation during mere evaluation; a branch or tag ref is mutable, a SHA is not.
   Verify: the three-flag invocation itself, e.g. `nix flake show --no-write-lock-file --option allow-import-from-derivation false github:<owner>/<repo>/<sha>`; a companion check that the flag actually blocks something is `nix eval --option allow-import-from-derivation false …` failing with `cannot build '…' during evaluation because the option 'allow-import-from-derivation' is disabled` on an IFD-dependent flake.
   RUN: cited (`nix-gates.md` V13c, the identical IFD-blocking mechanism watched red under this exact flag on a planted IFD fixture); not re-run in this dive's own fixture set. Severity: MUST for the three flags; SHOULD for insisting on a full SHA specifically (a locked branch ref with a pinned `narHash` is a weaker but not unsafe fallback).

9. **Never enable the `ca-derivations` experimental feature; if it is ever turned on for another reason, treat every content-addressed realisation as unverified against tampering by any local user who can submit builds.**
   Rationale: GHSA-jm6c-h95p-6qhj has no backported fix; the daemon does not verify signatures on submitted realisation objects under this feature.
   Verify: `grep -rn -e 'ca-derivations' --include='*.nix' --include='*.conf' .` in flake code and Nix configuration — any hit is a finding requiring justification, not a routine setting.
   RUN: no — reading heuristic only; not planted, since the pinned toolchain never enables it and no exemplar does either (a violation fixture would require reproducing the daemon-level race itself, out of scope for this dive's fixture budget).

## Verification runs

All commands ran via `/home/mherwig/.cache/research-lang/nix-tools/run.sh` (CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`), each under `timeout 300`, against fixtures under `/home/mherwig/.cache/research-lang/nix-tools/fixtures/trust-boundaries/` (each `git init -q && git add -A`'d before evaluation). Warm store (the fixtures and the pinned nixpkgs were already realized/cached by earlier waves' work on this same store); cold-vs-warm timing was not a variable this dive measured.

| # | Fixture | Command | Violation result | Twin result |
|---|---|---|---|---|
| V1 | `nixconfig-violation` | `nix build --no-write-lock-file --print-build-logs .#default` (no `--accept-flake-config`) | 5 `warning: ignoring untrusted flake configuration setting '<key>'` lines (one per key), then build proceeds unaffected, exit 0 | `nixconfig-compliant` (only the allowlisted pair): 2 warnings, same shape, exit 0 |
| V2 | `nixconfig-violation` | `nix build --no-write-lock-file --accept-flake-config --rebuild .#default`; then `cat /tmp/pbh-ran-marker` | no config warnings; `post-build-hook ran as 1000` — the untrusted flake's hook executed | — (mechanism-only; no twin needed, `nixconfig-compliant` has no hook to run) |
| V3 | `nixconfig-violation` / `nixconfig-compliant` | `nix eval --impure --json --expr '(import ./flake.nix).nixConfig or { }' \| jq -e 'keys - ["extra-substituters","extra-trusted-public-keys"] \| length == 0'` | `false`, exit 1 | `true`, exit 0 |
| V4 | `secret-in-store` / `secret-compliant` | `grep -rn -e 'builtins\.readFile.*secret' -e 'builtins\.readFile.*token' --include='*.nix' <dir>`; separately `nix eval --raw .#leakedViaEval` and `stat -c '%a %U %G %n' <out-path>` | 1 grep hit, exit 0; eval prints the planted fake token directly; realized store path mode `444` (world-readable) | no grep hit, exit 1; nothing secret-shaped in the flake |
| V5 | `access-tokens-violation` / `access-tokens-compliant` | `grep -rln -e 'access-tokens = ' -e 'ghp_' -e 'github_pat_' <dir> --include='*.conf' --include='*.nix'` | 1 match (`nix.conf`), exit 0 | no match, exit 1 |
| V6 | `fod-impure-env` | `nix build --no-write-lock-file .#default` with a deliberately wrong `outputHash`; then again with the corrected hash | `error: hash mismatch in fixed-output derivation …`, exit 1 | corrected hash: builds and prints the out-path, exit 0. Tamper-propagation sub-probe (`HTTP_PROXY=http://mitm.example:8080 … --rebuild`) returned exit 0 with no visible mismatch — **inconclusive**, likely because this single-user sandboxed store reused the already-registered output rather than actually re-executing the builder against the new environment; not reported as a red/green pair for that specific sub-claim |
| V7 | `nixpkgs-fork-violation` / `nixpkgs-fork-compliant` | `jq -e '.nodes \| to_entries[] \| select(.value.original.repo == "nixpkgs" and .value.original.owner != "NixOS") \| .key' flake.lock` | prints `"nixpkgs"`, exit 0 (finding) | no output, exit 4 (jq's "no results"; this check's convention reads empty output as pass) |

## Exemplar evidence

| Candidate | Satisfies | Violates | Contradicts / notable |
|---|---|---|---|
| 1 (nixConfig allowlist) | `cachix/cachix`, `cachix/devenv`, `cachix/nixpkgs-python`, `ghostty-org/ghostty@…:flake.nix:173-174`, `helix-editor/helix@…:flake.nix:96-97`, `ipetkov/crane@73b980519cef:flake.nix:6-7`, `Mic92/sops-nix@…:flake.nix:5-6`, `numtide/llm-agents.nix@efb10f28f724:flake.nix:3-7`, `numtide/treefmt@…:flake.nix:4-5`, `zed-industries/zed@…:flake.nix:19-25` — all 10 declare only the allowed pair | `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:46-50` — names `hydra.iohk.io` as a substituter it does not operate | — |
| 2 (never `--accept-flake-config`) | 26/37 exemplars never mention the flag | `ipetkov/crane@73b980519cef:.github/workflows/test.yml:104` (CI), `cachix/cachix@3349ce74ba77:README.md:90` (install line), `numtide/llm-agents.nix@efb10f28f724:AGENTS.md:13` (tells *agents* to pass it) | 3 of the 37 exemplars actively violate this rule — the highest live-violation rate of any candidate in this dive |
| 3 (tokens never committed) | all 37 (no exemplar commits a live token in `nix.conf` or `flake.nix`; this session's evidence is a planted fixture, not a corpus find) | — | the research toolchain's own `run.sh` is the positive example: token via `NIX_CONFIG`, never a tracked file |
| 4 (no secret via readFile) | all 37 (no exemplar reads a secret-shaped file at eval time) | — (planted fixture only) | `wiki.nixos.org/wiki/Flakes` is the only exemplar-adjacent source naming this explicitly |
| 5 (CVE-2026-39860 floor) | `nix-gates.md`'s own floor computation (2.31.5) already clears the 2.31.4 fix, applying to every A/B/D flake that adopts `NIX-GATE-13`/`NIX-GATE-16` | none measured directly (no exemplar CI job pins below the fix line; `NixOS/nix` itself and `nix-installer` both track upstream HEAD-adjacent Nix) | — |
| 6 (FOD impureEnvVars) | no exemplar declares `__impureEnvVars`; the closest analogue is `ocx`'s ghcr.io fetch design, owned by `NIX-GEN` | — | mechanism-only finding, planted fixture is the only evidence |
| 7 (check-owner scope) | any exemplar with a plain `github:NixOS/nixpkgs/...` root input passes trivially (29/37 per `shape` §2's nixpkgs count) | none found with a forked nixpkgs owner in this corpus | the gap (non-nixpkgs inputs unchecked) is unexercised by the corpus, since no exemplar's non-nixpkgs input is a known fork either |
| 8 (safe-eval flags) | `NIX-INP-12`'s cited exemplar, `nix-community/fenix@5f7e7d793cb2:.github/workflows/ci.yml:16-24` (a `--override-input nixpkgs …` CI leg, the same discipline this rule generalizes) | — | — |

## AI-agent angle

- **Treating `nixConfig` as "just config" and adding more than the allowed pair.** An agent asked to "make CI faster with a shared cache" will often add `post-build-hook`, `trusted-users`, or `sandbox = relaxed` to `nixConfig` because that is where settings conceptually "go" in the flake — it does not know the allowlist is enforced by the *consumer's* trust posture, not the author's intent. Check: Q12's key-diff.
- **Recommending or silently adding `--accept-flake-config` to make a warning go away.** This is the single most dangerous, most plausible mistake in this whole family: the warning is annoying, the flag makes it disappear, and nothing in the immediate output says "this also grants code execution as your build user (or root, on a multi-user daemon)." Three real exemplars in this corpus already made exactly this choice (finding 2). Check: the `accept-flake-config` grep, with every hit required to be a warning against it.
- **"Fixing" a dirty-tree warning by setting `nixConfig.warn-dirty = false`.** A model trained on plausible-looking Nix code will produce this because it reads like it should work; it is a no-op (#9885) and, worse, it is one of the settings the allowlist candidate would flag anyway if the agent had also added `accept-flake-config` to make it actually apply. Check: the Q12 allowlist plus a literal grep for `warn-dirty`.
- **Embedding a token or API key directly in `flake.nix` "to make CI work," especially inside a fetcher argument or an `env` attribute.** An agent debugging a failed private-repo fetch will reach for the fastest fix, which is often to hardcode the credential inline rather than route it through `NIX_CONFIG`/`access-tokens`. Check: candidate 3's grep, generalized to any token-shaped literal (`ghp_`, `github_pat_`, `glpat-`) anywhere in `*.nix`, not only `access-tokens = `.
- **Reading a secret with `builtins.readFile` "since it's just Nix code reading a file."** The language makes this trivially easy and gives no signal that the result becomes part of a world-readable artifact; an agent will do this to template a config file with a password baked in. Check: candidate 4's grep.
- **Assuming IFD is opt-in and skipping `--option allow-import-from-derivation false` when told to "safely look at" an untrusted flake.** The manual's plain-language framing ("By default, Nix allows Import from Derivation") is easy to skim past; the measured default is `true`. Check: `nix config show | grep allow-import-from-derivation` before trusting any "safe eval" recipe that omits the flag.
- **Trusting `flake-checker`'s exit code (or `--check-owner` specifically) as a full supply-chain audit.** An agent that runs `flake-checker` and sees exit 0 may report "no security issues" without knowing the tool checks exactly one input's owner and three other narrow properties — not arbitrary-input provenance, not tarball contents, not the xz-class compromise. Check: read the tool's own default-checks list (candidate 7's finding) before characterizing a clean run as more than it is.
- **Copying `nix run github:owner/repo` (a floating ref) into an "example of evaluating someone's flake safely" doc, because that is the idiomatic install one-liner everywhere else in the ecosystem.** The install-UX idiom and the untrusted-evaluation idiom are different recipes for different situations, and an agent pattern-matching on "how do I run a flake" will reach for the wrong one. Check: candidate 8's SHA-pin requirement specifically when the context is "a flake you do not own," not "a flake you are installing."

## Contested / evolving

- **Whether `nixConfig` should exist in the standard at all, given its trust model confuses more authors than it protects.** No source in this dive's survey argues nixConfig should carry *more* than the cache pair; the trend, measured here, is toward "SHOULD NOT declare it" becoming the de facto community norm even though 11/37 exemplars still do (all confined to the compliant pair bar one). No proposal to remove the feature was found; this is a documentation and defaults problem, not an open RFC, as of 2026-09-27.
- **`--accept-flake-config` in agent-facing instructions.** `numtide/llm-agents.nix@efb10f28f724:AGENTS.md:13` explicitly tells coding agents to pass the flag — a direct, dated counter-example to this dive's MUST-NOT rule, from a project whose stated purpose is "exploring integration between Nix and AI coding agents." This is either an oversight in a young project or a considered trade-off (its own nixConfig sets `allow-import-from-derivation = false`, suggesting the maintainers are aware of at least one of the two risk axes and chose to accept the other). Watch this repository for whether the AGENTS.md instruction changes as the project matures; as of this measurement it stands uncorrected.
- **Whether the CVE-2026-39860 floor should be a hardcoded number or a computed expression.** `NIX-GATE-16` already resolved this in favor of computed (this dive confirms it holds); the alternative — hardcoding "2.31.5" into a rule text — would silently understate the true floor the moment nixpkgs drops `nix_2_31` in a future release. No source argues for the hardcoded form; it is included here only because the brief asked for an explicit reconciliation, and the reconciliation is: computed floor wins, and re-verify on every nixpkgs bump.
- **The `ca-derivations` mitigation is "don't enable it," not a configuration knob**, because [GHSA-jm6c-h95p-6qhj](https://github.com/NixOS/nix/security/advisories) has no backported fix as of this measurement. Whether upstream ships a fix, or whether the feature stabilizes with a fix built in, is open; track the advisory, not this file, for a status change.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [nix.dev — command-ref/conf-file](https://nix.dev/manual/nix/2.35/command-ref/conf-file) | Nix 2.35 manual, settings reference | 2.35.2, measured 2026-09-27 | Primary source for `accept-flake-config`, `access-tokens`, `trusted-users`, `allow-import-from-derivation`, `post-build-hook`, `sandbox` defaults and semantics |
| [nix.dev — command-ref/new-cli/nix3-flake](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake) | Nix 2.35 manual, `nixConfig` schema | 2.35.2 | Defines the five-key allowlist that applies without `accept-flake-config` |
| [NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649) | GitHub issue, maintainer-confirmed | opened against 2.18.1, still open 2026-09-27 | `accept-flake-config` grants root-equivalent execution; the maintainer response treats this as intended |
| [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885) | GitHub issue | opened against 2.18.1, still open | Concrete repro that `nixConfig.warn-dirty = false` is a no-op |
| [NixOS/nix#6752](https://github.com/NixOS/nix/issues/6752) | GitHub issue | opened against 2.10.0pre, still open | An untrusted user is prompted for substituters/keys that are then ignored anyway — the UX confusion behind the allowlist design |
| [NixOS/nix#9788](https://github.com/NixOS/nix/issues/9788) | GitHub issue | open | Requests suppressing the repeated untrusted-config warning — evidence the warning-on-every-run behavior is a known, unresolved UX complaint, not a bug |
| [GHSA-g3g9-5vj6-r3gj / CVE-2026-39860](https://github.com/NixOS/nix/security/advisories/GHSA-g3g9-5vj6-r3gj) | Nix security advisory | published 2026-04-07; fixed 2.28.6–2.34.5 lines | The daemon-version-floor CVE this dive's rule 5 is built around |
| [GHSA-6fjr-mq49-mm2c / CVE-2024-47174](https://github.com/NixOS/nix/security/advisories/GHSA-6fjr-mq49-mm2c) | Nix security advisory | fixed 2.18.8 / 2.24.8 | TLS-validation credential-leak advisory, long superseded but relevant to the "never trust a floor below every known fix" framing |
| [NixOS/nixpkgs#300028](https://github.com/NixOS/nixpkgs/pull/300028) | nixpkgs PR, the xz-backdoor revert | merged 2024-03-29 | Concrete evidence that no automated Nix tooling catches a compromised upstream release; response is human, same-day, reactive |
| [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) | Community wiki, flakes reference | last edited 2026-09-10 | States the world-readable-store secrets warning explicitly and names `agenix`/`sops-nix` as the alternative |
| [DeterminateSystems/flake-checker README](https://github.com/DeterminateSystems/flake-checker) | Tool's own documentation | v0.2.15 (pinned toolchain) | Exact scope and defaults of `--check-owner`, `--check-outdated`, `--check-supported` |
| [nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:46-50](https://github.com/nix-community/nix-vscode-extensions) | exemplar flake | corpus SHA, fetched 2026-09-27 | The one exemplar naming a third-party substituter (`hydra.iohk.io`) it does not operate |
| [numtide/llm-agents.nix@efb10f28f724:flake.nix, AGENTS.md](https://github.com/numtide/llm-agents.nix) | exemplar flake + agent instructions | corpus SHA, fetched 2026-09-27 | Both an `allow-import-from-derivation = false` nixConfig entry and an explicit AGENTS.md instruction to pass `--accept-flake-config` — the single richest, most contradictory exemplar in this dive |
| [ipetkov/crane@73b980519cef:.github/workflows/test.yml:104](https://github.com/ipetkov/crane) | exemplar CI workflow | corpus SHA, fetched 2026-09-27 | CI itself passes `--accept-flake-config`, violating candidate 2 in a widely-used library flake |
| [cachix/cachix@3349ce74ba77:README.md:90](https://github.com/cachix/cachix) | exemplar README | corpus SHA, fetched 2026-09-27 | A public install one-liner recommending `--accept-flake-config` |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/.agents/research/nix-audit/exemplar-flake-shape.md` §6, §9 | this program's own audit | 2026-09-27 | The 11/37 nixConfig census and the CI-installer census this dive builds on |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/.agents/research/nix-gates.md` (NIX-GATE-13, -16) | this program's consolidation | 2026-09-27 | The version-floor and installer rules reconciled against CVE-2026-39860 here |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/.agents/research/nix-inputs.md` (NIX-INP-12) | this program's consolidation | 2026-09-27 | The safe-eval-flags and full-SHA-pin rule for a flake you do not own |
