---
title: Determinate Systems tooling delta, 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 16
---

# Determinate Systems tooling delta, 2026-09-27 to 2026-11-27

Scope: a delta update of the nix-quality pair's claims about flake-checker, update-flake-lock, Determinate Nix, the installer actions, magic-nix-cache-action and FlakeHub. Claims not moved by an upstream change stay as they are. Limit of this run: the GitHub REST API hit its shared rate limit midway, so commit lists came from public atom feeds, and the Determinate Nix release notes came from release pages read through a summarizing fetch (see "Could not determine").

## Summary

- No release of flake-checker, update-flake-lock, nix-installer-action or magic-nix-cache-action falls inside the window. Latest tags are flake-checker v0.2.15 (2026-09-23), update-flake-lock v29 (2026-09-09), nix-installer-action v23 (2026-09-09), magic-nix-cache-action v15 (2026-09-09). All predate 2026-09-27.
- flake-checker `main` still reads version 0.2.15. Its supported-ref data has no `nixos-26.11` entry, so no release accepts `nixos-26.11`.
- The only flake-checker commits in the window are dependency bumps (hickory-resolver, 2026-10-12 and 2026-11-09).
- Determinate Nix and determinate-nix-action both moved from v3.22.x to v3.24.3 (2026-11-18 and 2026-11-21).
- Determinate published its own security fixes in the window: four GHSA advisories fixed in 3.23.2 (2026-10-13) and a brotli CVE fix in 3.24.1 (2026-10-25). The NIX-SEC-06 "Determinate unmeasured" statement is still true of CVE-2026-39860 itself but is stale as a statement about Determinate advisories.
- On 2026-11-27 nixpkgs has `release-26.11` and `nixos-26.11-small` but no `nixos-26.11` branch yet.

## Findings

### 1. flake-checker (claims NIX-INP-06, NIX-GATE-11, gate step 7)

Verdict: unchanged.

- Latest release is [v0.2.15, 2026-09-23](https://github.com/DeterminateSystems/flake-checker/releases). `Cargo.toml` on main still has `version = "0.2.15"` ([Cargo.toml](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/Cargo.toml)).
- Current supported-ref data, [ref-statuses.json on main](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/ref-statuses.json): `nixos-25.11` unmaintained, `nixos-25.11-small` unmaintained, `nixos-26.05` stable, `nixos-26.05-small` stable, `nixos-unstable` rolling, `nixos-unstable-small` rolling, `nixpkgs-25.11-darwin` unmaintained, `nixpkgs-26.05-darwin` stable, `nixpkgs-unstable` rolling.
- That file explains the baseline "binary rejects `nixos-25.11` although README lists it": the README ([lines 31-39](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md)) lists all nine refs, while the data marks the 25.11 ones "unmaintained". The accepted list therefore stays: `nixos-unstable`, `nixos-unstable-small`, `nixpkgs-unstable`, `nixos-26.05`, `nixos-26.05-small`, `nixpkgs-26.05-darwin`. The baseline sentence is unchanged and is now explained. This run did not re-execute the binary; it read the data file only.
- `nixos-26.11`: not accepted by any release. Absent from the data file, and 0.2.15 is the newest release. A lock tracking `nixos-26.11` will be reported as an unsupported ref until a release adds it.
- CLI flags in [src/main.rs](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/main.rs): `--no-telemetry` (env `NIX_FLAKE_CHECKER_NO_TELEMETRY`), `--fail-mode` (short `-f`, env `NIX_FLAKE_CHECKER_FAIL_MODE`), `--condition` (short `-c`). Unchanged.
- CEL variables in [src/condition.rs](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/condition.rs): `gitRef`, `numDaysOld`, `owner`, `refStatuses`, `supportedRefs`. Unchanged; the gate step 7 expression still evaluates. `refStatuses` is new relative to the rule text (it is not used by the rule; no change needed).
- Crash strings: [src/error.rs](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/error.rs) still defines `Invalid(String)` and `FlakeLock(...)`, and `Invalid` is still returned for "no nixpkgs dependency found". The `Error: Invalid(` and `Error: FlakeLock(` grep is unchanged for the 0.2.15 source. A binary was not re-run.

### 2. update-flake-lock (NIX-INP-11)

Verdict: unchanged.

- Latest release v29 (2026-09-09). Window commits are tooling only: eslint to oxlint, vitest bump, undici 6.29.1 (2026-10-21 and 2026-11-04), from the [commit feed](https://github.com/DeterminateSystems/update-flake-lock/commits/main.atom).
- [README](https://raw.githubusercontent.com/DeterminateSystems/update-flake-lock/main/README.md): examples use `DeterminateSystems/update-flake-lock@main` and `DeterminateSystems/determinate-nix-action@v3`. A note says v3 no longer installs Determinate Nix. The "Running GitHub Actions CI" section still says "GitHub Actions doesn't run workflows when a branch is pushed by or a PR is opened by a GitHub Action" and offers close-and-reopen or a PAT.
- Small wording drift: the baseline says examples use "the Determinate installer"; the README now names `determinate-nix-action`, not `nix-installer-action`. Verdict: correct the noun only if the sentence is reworded; the substance holds.

### 3. Determinate Nix (NIX-FLK-05, release.md, NIX-SEC-06)

- `schemas` read only by 3.17.0 or later: could not re-verify; nothing in the window notes contradicts it. The 3.23 to 3.24 notes mention no schema change (they add experimental `nix flake bake`). Verdict: unchanged.
- "nixpkgs `8d5d2709` packages no Determinate Nix": not re-measured; needs re-measurement against the then-current nixpkgs if the claim is kept. Out of this delta's reach (a nixpkgs query, not an upstream doc change).
- Releases in the window, from [nix-src releases](https://github.com/DeterminateSystems/nix-src/releases): v3.22.4 (2026-09-16), v3.22.5 (2026-09-17), v3.23.0 (2026-10-01), v3.23.1 (10-06), v3.23.2 (10-13), v3.23.3 (10-16), v3.24.0 (10-22), v3.24.1 (10-25), v3.24.2 (11-04), v3.24.3 (2026-11-18, latest). The [changes page](https://raw.githubusercontent.com/DeterminateSystems/nix-src/main/doc/manual/source/release-notes-determinate/changes.md) says Determinate Nix 3.24.3 differs from upstream Nix 2.35.
- Security, v3.23.2 ([release](https://github.com/DeterminateSystems/nix-src/releases/tag/v3.23.2)), based on upstream Nix 2.35.3: fixes GHSA-25vp-6h23-hj3g, GHSA-92x5-h528-wrmw, GHSA-jwvx-xq5j-gc56, GHSA-m4vq-qf6v-82pj (out-of-bounds heap writes, Linux and macOS local privilege escalation, macOS Seatbelt escape; affects all earlier Determinate versions).
- Security, v3.24.1 ([release](https://github.com/DeterminateSystems/nix-src/releases/tag/v3.24.1)): brotli 1.2.1, fixing CVE-2026-111497.
- Security, v3.24.0: CA bundle NSS 3.131.1, emSign ECC Root CA - G3 no longer trusted.
- CVE-2026-39860 equivalent: the release pages read do not name CVE-2026-39860 or GHSA-g3g9-5vj6-r3gj. Could not determine whether a Determinate version carries that exact fix; 3.23.2 is based on Nix 2.35.3, which is at or above the CppNix 2.35 floor, so it very likely does, but that is an inference, not a source statement.
- The advisory IDs above were not matched to CVE-2026-39860 by this run. Treat as "Determinate now publishes fixes in release notes and GHSA", not as an equivalence.

### 4. Installer actions (NIX-GATE-13)

Verdict: unchanged.

- [nix-installer-action README](https://raw.githubusercontent.com/DeterminateSystems/nix-installer-action/main/README.md): "This Action installs Determinate Nix by default", upstream mode "isn't a supported configuration" (appears twice). Input `determinate` defaults to `true`; `flakehub` is marked deprecated and implies `determinate`. Latest v23 (2026-09-09); only a Dependabot-alerts fix landed on main (2026-11-12, merged 11-17).
- [determinate-nix-action](https://github.com/DeterminateSystems/determinate-nix-action) is now at v3.24.3 (2026-11-21), tagged once per Determinate Nix release (v3.23.0 on 2026-10-02 through v3.24.3). README says "we fully support explicit version pinning" in contrast with `nix-installer-action`, and its example uses `actions/checkout@v7.0.1` with `determinate-nix-action@main`. The action SHA pins the Determinate Nix version exactly; this strengthens, and does not change, the NIX-GATE-13 recommendation to SHA-pin it.

### 5. magic-nix-cache-action (NIX-GATE-14)

Verdict: unchanged.

- No release after v15 (2026-09-09). Window commits: `detsys-ts` v2.1.4 (2026-10-08) and Dependabot fixes (2026-11-17). `Drop x86_64-darwin` landed 2026-09-09, before the window.
- README still presents the action as supported, with no deprecation note, and still uses `@main` examples. The "community revival" characterization of v11 onward comes from the baseline; this run did not find a source for it in the README and did not re-verify it. The installer grep keyed on `@v10` and below is unaffected.

### 6. FlakeHub (NIX-REL-06)

Verdict: needs re-measurement, no evidence of change.

- [Publishing docs](https://docs.determinate.systems/flakehub/publishing) still define rolling releases as `0.1.[commit count]+rev-[git sha]` (`rolling-minor` changes the minor) and tagged releases from a tag such as `v0.1.1`. The page gives no resolution rule and no warning about mixing.
- [Semver concept page](https://docs.determinate.systems/flakehub/concepts/semver): "The version range `*` always uses the highest published version." It does not say how rolling `0.1.N` ranks against a tagged release. The baseline claim "FlakeHub resolves the highest semver" is consistent with the page for `*` and is not contradicted; the "invisible to unpinned consumers" consequence is an inference from semver ordering, not a quoted doc rule.
- Dated "FlakeHub docs as of 2026-09-27" becomes "as of 2026-11-27" if the row is re-dated; no text change.

## Normative guidance candidates

1. Rule: NIX-INP-06's ref list stays "`nixos-unstable`, `nixpkgs-unstable`, `nixos-26.05`, their `-small` variants, `nixpkgs-26.05-darwin`". No change. Rationale: ref-statuses.json on flake-checker main is identical in meaning. Verification: `curl -s https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/ref-statuses.json | grep -v unmaintained`.
2. Rule: add one clause to NIX-INP-06 (and a note in the 26.11 branch of the pair): a lock on `nixos-26.11` fails the flake-checker advisory step until a flake-checker release lists it; read the ref, do not downgrade the pin. Rationale: 0.2.15 is the newest release, has no 26.11 entry, and nixpkgs 26.11 branches (`release-26.11`, `nixos-26.11-small`) already exist. Verification: `git ls-remote --heads https://github.com/NixOS/nixpkgs 'nixos-26.11*'` and `gh release list -R DeterminateSystems/flake-checker --limit 1`; rerun the gate step 7 command on a `nixos-26.11` lock and expect exit 1 with count 0.
3. Rule: NIX-SEC-06 prose "Determinate Nix is unmeasured" may add that Determinate publishes its own fixes in nix-src release notes (3.23.2, 3.24.1). Rationale: it answers the "does either publish its own advisory feed" question in the baseline's follow-ups. Verification: read the v3.23.2 and v3.24.1 release pages.
4. Rule: no rule-text change for NIX-INP-11, NIX-GATE-13, NIX-GATE-14, NIX-FLK-05, NIX-REL-06. Verification: tags listed above.

Decision on commission: NIX-INP-06's ref list needs no change. The 26.11 branch needs a one-clause addition (candidate 2) only if the pair intends to cover a `nixos-26.11` pin before `nixos-26.11` exists; today it does not exist, so the clause is optional and best revisited once the branch and a new flake-checker release appear.

## AI-agent angle

- An agent trained before 2026 will cite `DeterminateSystems/nix-installer-action` as the way to install Nix. It installs Determinate Nix and calls upstream "not a supported configuration". Check: grep for `nix-installer-action` in workflows (NIX-GATE-13).
- An agent will assume a new NixOS release is accepted by flake-checker. It is not until a release adds the ref. Check: run the gate step 7 command on the lock.
- An agent will assume `determinate-nix-action@v3` floats. It floats on the v3.x series; a full tag or SHA fixes the Nix version.

## Contested / evolving

- flake-checker's README (lists 25.11) and its data file (marks 25.11 unmaintained) disagree; the data file governs behavior. Trend: each NixOS release flips the prior release to unmaintained.
- Whether 26.11 support lands soon: nixpkgs branches are up but `nixos-26.11` is not, as of 2026-11-27. Watch for a flake-checker v0.2.16.
- Determinate release cadence in the window is roughly weekly to biweekly; pinning by tag is expected.

## Could not determine

- Whether any Determinate release carries a CVE-2026-39860 equivalent: release pages do not mention it.
- Binary behavior of flake-checker was not re-run; findings read from source on `main`.
- GitHub REST rate limit prevented commit-level and tag-level API reads past the atom feeds. Determinate release notes were read through a summarizing fetch; GHSA and CVE IDs should be spot-checked against the release pages before they are quoted in rule text.
- The "community revival" origin of magic-nix-cache-action v11+ and the `schemas` 3.17.0 claim were not re-sourced.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/DeterminateSystems/flake-checker/releases | release list | latest 2026-09-23 | no new release |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/ref-statuses.json | ref data | main 2026-11 | supported refs |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md | README | main | listed refs, CEL |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/main.rs | CLI flags | main | flags |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/condition.rs | CEL vars | main | variables |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/src/error.rs | error enum | main | crash strings |
| https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/Cargo.toml | version | main | 0.2.15 |
| https://raw.githubusercontent.com/DeterminateSystems/update-flake-lock/main/README.md | README | main | CI-trigger note |
| https://raw.githubusercontent.com/DeterminateSystems/nix-installer-action/main/README.md | README | main | default, unsupported upstream |
| https://github.com/DeterminateSystems/determinate-nix-action | README and releases | 2026-11-21 | version pinning |
| https://raw.githubusercontent.com/DeterminateSystems/magic-nix-cache-action/main/README.md | README | main | status |
| https://github.com/DeterminateSystems/nix-src/releases | Determinate Nix releases | 2026-11-18 | window notes |
| https://github.com/DeterminateSystems/nix-src/releases/tag/v3.23.2 | release notes | 2026-10-13 | GHSA fixes |
| https://github.com/DeterminateSystems/nix-src/releases/tag/v3.24.1 | release notes | 2026-10-25 | brotli CVE |
| https://docs.determinate.systems/flakehub/publishing | FlakeHub docs | 2026-11-27 | rolling vs tagged |
| https://docs.determinate.systems/flakehub/concepts/semver | FlakeHub docs | 2026-11-27 | `*` is highest version |
| `git ls-remote https://github.com/NixOS/nixpkgs` | branch list | 2026-11-27 | 26.11 branch state |
