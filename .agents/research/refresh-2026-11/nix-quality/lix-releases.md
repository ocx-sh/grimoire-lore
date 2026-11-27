---
title: Lix releases and advisories delta, 2026-09-27 to 2026-11-27
pair: nix-quality
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 9
---

# Lix delta, 2026-09-27 to 2026-11-27

## Summary

- Latest Lix release is 2.96 "Bingsu", published 2026-10-13. Its release notes are at https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html and the announcement at https://lix.systems/blog/2026-10-13-lix-2.96-release/.
- Security releases 2.94.3 and 2.95.4 were published on 2026-10-13 (https://lix.systems/blog/2026-10-13-lix-cves/). The 2.95.4 release notes page returned HTTP 404, so its exact date and contents beyond the blog post could not be read. The tags page on git.lix.systems returned HTTP 403.
- nixos-unstable (`pkgs/tools/package-management/lix/default.nix`, fetched from raw.githubusercontent.com at research time) defines `lix_2_96` as available but not the default. Both `latest` and `stable` still point at `lix_2_95`. Gate step 8 (`nixpkgs#lix`) therefore still resolves to a 2.95.x release. The exact patch version was not shown by that file.
- The 2.96 notes contain one flake change that touches this pair: flake validation is now the single rule "no function calls outside of `outputs`". It is a breaking change for flakes that use newly allowed syntax.
- The 2.96 notes (as fetched) say nothing about `flake-self-attrs`, a flake plugin split, `formatter`, overlays, `apps`, `--update-input`, `nix profile add`, `nixVersion`, `convertHash`, or follow cycles.
- The Lix manual experimental-features page (stable) still lists `flake-self-attrs` ("Allow defining flake input attrs for `self`") as an experimental feature, separate from `flakes`. It does not mention a plugin move.
- Lix has no CVE-2026-39860 equivalent in the window. The 2026-10-13 post "3 security issues in Lix" says "This issue has not been assigned CVEs yet" and names no flake component. There is no advisory feed. The post gives security@lix.systems and a Discourse thread, and the blog has a general RSS feed at /blog/index.xml.
- A separate earlier advisory, CVE-2026-44028 (integer overflow, 2026-05-05), is before the window.

## Findings

### Latest release and date
Lix 2.96 "Bingsu", 2026-10-13 ([blog](https://lix.systems/blog/2026-10-13-lix-2.96-release/), [notes](https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html)). The blog lists it as the newest release; the previous one is 2.95 "Kakigori" from 2026-03-25 ([news listing](https://lix.systems/blog/)). A 2.96.1 is announced as planned, not released, as of the blog text.

### 2.96 items relevant to the pair
- Flake validation: "no function calls are allowed outside of `outputs`"; newer syntax such as let bindings is allowed in flake files, but flakes using it will not evaluate on older Lix, including their dependents. Some constructs (unary `-1`) still desugar to function calls and stay restricted. Source: the 2.96 notes above. This changes what "Lix checks" for flake files, but the notes do not say whether `formatter`, overlay arity or `apps` key checks changed.
- "Flake config warnings go to stderr" and "Concurrent fetches of the same input are serialized with a lock" (2.96 fixes).
- Other breaking changes: `floor`/`ceil` precision checks, nix3 commands no longer build their arguments, `<nix/...>` shadowing is an error.
- `ssh://` store URIs deprecated, removal in 2.97.
- Lix 2.95 notes (https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.95.html) say mixed-`rec` merges are "deprecated and forbidden" under `rec-set-merges`. This matches the existing NIX-LANG-05 / NIX-GATE-16 claim and predates the window.

### Security
The post https://lix.systems/blog/2026-10-13-lix-cves/ reports three issues fixed in Lix at least 2.94.3 and 2.95.4 (and in 2.96 per its notes: daemon rejects `repair` from untrusted clients, NAR parser unsigned overflow, `nix-hash --truncate` SRI corruption). No CVE numbers are assigned, no flake component is named.

## Per-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| NIX-FLK-19 and Dates and Floors: Lix 2.95.2 exits 0 on string `formatter`, `self: super:` and `prev: final:` overlays, unknown `apps` keys, checks overlay arity only; index Non-Negotiable 5 | needs re-measurement | 2.96 changes flake validation to a "no function calls outside outputs" rule. Notes do not mention formatter, overlays or apps. Not measured; no binary run. Gate step 8 resolves to 2.95.x, so the claim stays true for what the gate runs. |
| inputs.md: rejects `--update-input` exit 1; `inputs.self.submodules` only with `flake-self-attrs`; no `inputs.self.lfs`; follow cycle is `error: stack overflow` | unchanged for the `flake-self-attrs` part (feature still listed as experimental in the stable manual); others could not determine | No release note mentions `--update-input` or follow cycles. |
| NIX-INP-04, NIX-LANG-08: `relative path '...' points outside of its parent's store path` | could not determine | Not mentioned in 2.95 or 2.96 notes as fetched. |
| NIX-REL-09: Lix rejects `nix profile add`, accepts `nix profile install` | could not determine | 2.95 notes mention `nix profile` only for `keep-env-derivations`; 2.96 notes do not mention it. |
| NIX-LANG-05, NIX-GATE-16: mixed-`rec` merge error | unchanged | 2.95 notes ("deprecated and forbidden", `rec-set-merges`). |
| gates.md: Lix froze flake support and is moving it into a plugin | could not determine, nothing new | Neither 2.96 notes nor the experimental-features page mention a plugin move; flakes is still an experimental feature in the stable manual. M-B-13 (stabilisation proposal dropping `follows`) was not re-fetched. |
| security.md: `builtins.nixVersion` is `2.18.3-lix` on 2.95.2; generated-flakes.md: no `builtins.convertHash` | needs re-measurement | 2.96 mentions "parts of hash conversion" moved to Rust, no `convertHash` builtin stated. nixVersion not mentioned. |
| Gate step 8 command | unchanged | `nixpkgs#lix` still maps to 2.95 on unstable; no plugin split documented, so the command is not changed by this window. |
| NIX-SEC-06: Lix advisories unmeasured | changed (narrowly) | Lix has now published unnumbered security fixes (2.94.3, 2.95.4, 2.96, 2026-10-13) without CVEs and has no advisory feed. No CVE-2026-39860 equivalent. |

Decisions asked for:
- `flake-self-attrs`: still needed. The stable manual lists it as an experimental feature; no release in the window enables it by default.
- Flake plugin split: no change to gate step 8; no evidence of a split in the window.
- Leniency gap: no evidence that any gap closed. The 2.96 flake validation rewrite is the one candidate and must be measured.

## Normative guidance candidates

1. Re-measure the leniency set (string `formatter`, `self: super:` overlays, unknown `apps` keys, `--update-input`) against `nixpkgs#lix_2_96` before the gate moves to 2.96. Rationale: 2.96 rewrote flake validation. Verification: `nix shell nixpkgs#lix_2_96 --command nix flake check --no-build --extra-experimental-features flake-self-attrs` in a scratch flake per case, record exit codes.
2. Do not write a flake that uses language features newly allowed outside `outputs` while the gate or consumers pin Lix 2.95. Rationale: such flakes fail to evaluate on older Lix, dependents included. Verification: run gate step 8 on the flake; any evaluation error names the construct.
3. Update NIX-SEC-06 to say Lix 2.94.3 / 2.95.4 / 2.96 carry unnumbered security fixes dated 2026-10-13 and recommend pinning at least 2.95.4. Verification: `nix eval nixpkgs#lix.version`.

## AI-agent angle

- An agent may claim Lix 2.96 stabilised flakes or removed `flake-self-attrs`. No source says so. Check: grep the manual page for the feature name.
- An agent may cite a Lix CVE for the October fixes. None exists. Check: the blog post text.

## Contested / evolving

- Flake stability in Lix: still an experimental feature as of 2026-11-27; the plugin move claim has no new source in the window.
- 2.96.1 is announced and not yet released; 2.97 will remove `ssh://` store URIs.

## Sources

| URL | What | Date | Fetched |
|---|---|---|---|
| https://lix.systems/blog/ | news listing | 2026-11-27 | yes |
| https://lix.systems/blog/2026-10-13-lix-2.96-release/ | 2.96 announcement | 2026-10-13 | yes |
| https://lix.systems/blog/2026-10-13-lix-cves/ | 3 security issues | 2026-10-13 | yes |
| https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.96.html | 2.96 notes | 2026-10-13 | yes |
| https://docs.lix.systems/manual/lix/nightly/release-notes/rl-2.96.html | 2.96 notes, nightly copy | - | yes |
| https://docs.lix.systems/manual/lix/stable/release-notes/rl-2.95.html | 2.95 notes | 2026-03-25 | yes |
| https://docs.lix.systems/manual/lix/stable/contributing/experimental-features.html | experimental features | - | yes |
| https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-unstable/pkgs/tools/package-management/lix/default.nix | nixpkgs lix attrs | 2026-11-27 | yes |
| https://docs.lix.systems/manual/lix/stable/release-notes/rl-next.html | upcoming page, no content | - | yes |

Failed: git.lix.systems tags (403), rl-2.95.4.html (404), search.nixos.org (no data), blog URL guess /lix-security-advisory (404). Fewer than 12 sources and the fetch tool summarises pages, so the release-note texts were read through a summariser, not raw.
