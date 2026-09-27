# nix-diagnose

A symptom-routed diagnosis skill for a Nix evaluation, `nix flake check` or
build that already fails. It starts from the verbatim error: infinite
recursion, undefined variable, "is not a derivation", an overlay argument
error, "path is not valid" on a cold store, an `x86_64-darwin` throw, a
`follows` cycle, a hash mismatch, an IFD refusal, a red `--all-systems` run,
a Lix leg that disagrees with CppNix, a check that looks hung, or an error
that did not change after a fix. It routes each to the cause and the rule
that fixes it.

```sh
grim add ghcr.io/ocx-sh/lore/nix-diagnose
```

It stops when the cause is named as a mechanism, the command and its first
`error:` line are pasted with `nix --version` above them, and either the fix
was watched red then green on the same implementation or the cause is
recorded as a named gap with the version that would settle it.

## The catalog, not the folklore

46 verbatim rows across five families (language and modules, the flake
output contract, gate tools, inputs and the lock, packaging and builds),
keyed by flake shape, implementation and version, not by string alone. Ten
rows are one fault printing different text on CppNix versus Lix: a `path:`
input outside the tree, a `follows` cycle, a cold-store source read, a
string `formatter`, a mixed `rec` merge and a hash mismatch each read
differently depending on who ran it. `infinite recursion encountered` alone
covers five incompatible causes, classified by the innermost stack frame: an
overlay reading `final.x` while defining it, `imports` computed from
`config`, a per-system helper indexing its own unfinished set, a
nixpkgs-internal bug, and a `rec` set shadowing its own binding.

## What is distinctive

A red `--all-systems` run gets a 9-row triage table before any system is
dropped: most reds are a nixpkgs platform drop or a restricted dependency,
not the author's defect. A green `nix flake check` on Lix is no evidence for
three output-contract checks Lix silently skips, so every diagnosis re-runs
the deterministic CppNix leg before reporting green. A check silent for
minutes gets a timestamped watchdog, never a raised timeout: nix-installer's
own `hydraJobs` evaluation looked silent for 300 seconds while progressing
throughout. 10 known "fixes" are named as violations before anything is
fixed: `--impure`, `--accept-flake-config`, dropping a system before triage,
renaming `final:` to `self:`, each with the rule ID it would break.

## Pinned decisions

Measured 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, floor
`nix_2_31` = 2.31.5, and Lix 2.95.2. Determinate Nix is untested but never
deliberately broken. CppNix is the gated implementation, Lix an advisory
leg. A carried-from-research row is still evidence, but its first command is
re-run before being cited as the only cause.

## What it does not cover

Writing the standards this skill cites by rule ID, that is `nix-quality`.
Adding a flake to a repository for the first time, that is `nix-flake-adopt`.
Versioning, tagging and publishing a flake, that is `nix-flake-release`.

## Siblings

`nix-quality` is the rule set whose MUST rows these diagnoses cite and
restate when unloaded. `nix-flake-adopt` brings a flake into an unflaked
repository. `nix-flake-release` carries a passing flake to a tag and a
publish target. Run this skill first if its check comes back red.
