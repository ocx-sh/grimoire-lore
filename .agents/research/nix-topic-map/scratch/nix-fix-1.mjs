export const meta = {
  name: 'nix-fix-1',
  description: 'Nix research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/.agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
  "model": "opus",
  "checker_target": "",
  "findings": [
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": ".agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
    "line": 141,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "D7 adopts GEN-14's `{ spdxId = id; shortName = id; }` fallback, and line 219 treats the prototype's silent drop only as a reading finding. The drop is load-bearing. With D7's mapping applied to the prototype, corretto becomes unfree and the D11 gate step exits 1. The \"gate step exits 0 on a copy of the prototype\" re-check on line 207 passes only because of the drop. Adopting D7 as written turns the first update PR red on corretto.",
    "fix": "D7 license rule cell: replace \"which never warns\" with \"with `free` set from a per-id flag the generator records from the SPDX license list (the base license for `WITH`), because a list entry without `free` is read as unfree and refused\". Line 219: append \"Replacing the drop with the D7 mapping without a `free` flag makes corretto unfree: gate step 4 exits 1 with `Refusing to evaluate package 'amazon-corretto-21.0.9' \u2026 unfree license`.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": ".agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
    "line": 148,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "\"`homepage` is a SHOULD (map E36)\" reads as weakening NIX-GEN-21, a MUST that takes `homepage` from `upstream.repository_url` whenever it is present. E36 relaxes homepage only for NIX-PKG-07 source builds, and E36 itself says GEN-21 keeps the D text.",
    "fix": "Replace \"`homepage` is a SHOULD (map E36).\" with \"`homepage` is set from `upstream.repository_url` whenever present and omitted otherwise (NIX-GEN-21, MUST). E36's SHOULD applies to NIX-PKG-07 source builds only.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": ".agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
    "line": 172,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "\"A weekly `flake.lock` PR bumps nixpkgs under the same token\" contradicts NIX-INP-11: \"A D flake bumps its lock inside NIX-GEN-16's data PR instead.\"",
    "fix": "Replace the sentence with: \"The daily update PR also runs `nix flake update` and carries the `flake.lock` bump (NIX-INP-11): a D flake opens no separate lock PR.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": ".agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
    "line": 173,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "\"never a PAT\" contradicts the owner default recorded in the topic map (\"lock-bump token = GEN-16's App, fallback a fine-grained PAT\") and NIX-INP-11 (\"a GitHub App or fine-grained token\").",
    "fix": "Replace \"never a PAT\" with \"a fine-grained PAT scoped to `ocx-sh/ocx-nix` only as the fallback, never a classic PAT\"."
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": ".agents/research/nix-generated-flakes/adr_nix_flake_generation.md",
    "line": 187,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The D14 README examples leave the installable unquoted, so in a shell block the `\"1.7.12\"` quotes are stripped. Measured: the bare form fails with `does not provide attribute '\u2026actionlint.actionlint.1.7.12'`, and the single-quoted form evaluates. The line 188 `nix shell` example has the same defect. CI executing the README would go red on the ADR's own example.",
    "fix": "Line 187: nix run 'github:ocx-sh/ocx-nix#legacyPackages.x86_64-linux.actionlint.actionlint.\"1.7.12\"' -- -version . Line 188: nix shell 'github:ocx-sh/ocx-nix#legacyPackages.x86_64-linux.kitware.cmake.\"4.4.2\"' . Add: \"Single-quote every installable that carries a quoted version.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality.md",
    "line": 111,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Lines 41-42 say gate steps 7 to 9 run as continue-on-error jobs. NIX-CORE-01 allows continue-on-error only on the Lix and floor legs (NIX-GATE-16), and its weaken-check grep flags every added 'continue-on-error: true' (measured red on a planted workflow). An agent that follows the gate block for step 7 (flake-checker, NIX-INP-06/NIX-GATE-11) commits a NIX-CORE-01 MUST violation. The two rows answer the same question differently.",
    "fix": "In the NIX-CORE-01 Rule cell, replace '`continue-on-error` on the Lix and floor legs (NIX-GATE-16)' with '`continue-on-error` on the flake-checker step (NIX-INP-06, NIX-GATE-11) and on the Lix and floor legs (NIX-GATE-16)'."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality.md",
    "line": 60,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K2 confirmed. Line 59 computes the floor from the locked nixpkgs (--inputs-from .), but lines 58 and 60 run the Lix and floor legs from the global-registry nixpkgs, a floating ref (C8). That nixpkgs may not carry the element line 59 printed, and it evaluates a third-party flake off a 40-hex rev, which non-negotiable 14 (NIX-SEC-05) forbids. Measured 2026-09-27 on a fixture locked to 8d5d2709: 'nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs' exits 0, 'nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix --version' prints 'nix (Nix) 2.31.5', and line 59 prints [\"nix_2_31\",\"nix_2_34\",\"nix_2_35\"]. The flag is harmless on a flake with no inputs.self (Lix exit 0).",
    "fix": "Line 58: 'nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs   # 8 NIX-GATE-16 Lix leg: exit 0 pass'. Line 60: 'nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_31 replaced by that element'. Make the same edit in rules/nix-quality/gates.md lines 177 and 179 so one spelling wins everywhere."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality.md",
    "line": 48,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "K3 confirmed. The index tells CI to call the gate. Placed verbatim in a workflow run: block, line 48 matches its own text (accept-flake-config, trusted-users): measured exit 0 with the hit '.github/workflows/nix.yml:6'. Line 49 matches line 48's text too, because 'settings\\.access-tokens' contains 'access-tokens' and the *.md exclude does not cover .yml. So step 2a can never go green in CI. Line 49 also carries a literal dollar-double-brace secrets expression, which GitHub expands inside run: (K3, orchestrator-measured). The bracketed twin was watched: exit 1 on the workflow that carries it, and exit 0 on a planted 'nixConfig.accept-flake-config = true' and on a planted '--option access-tokens' run line.",
    "fix": "Line 48: \"grep -rnE --exclude-dir=.git -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings[.]access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .\". Line 49: \"grep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens' . | grep -v -e '[$][{][{] *secrets[.]'\". On line 47, append to the comment: ', bracketed letters keep the lines from matching the workflow that runs them'. Apply the same two lines to rules/nix-quality/security.md:83 and to the gates.md security step."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality.md",
    "line": 55,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "Gate step 6's comment gives 'exit 0 pass, 123 a package failed', but without pipefail a package set that fails to evaluate exits 0. Measured through run.sh: packages.x86_64-linux = throw \"boom\" gives step-6 exit 0 (xargs -r receives nothing), a failing build gives 123, and a good build gives 0. GitHub's default run: shell is bash -e with no pipefail, so a MUST step goes green on an evaluation failure when it runs outside the chained target.",
    "fix": "Line 55: prefix the command with 'set -o pipefail; ' and end the comment with '# 6 NIX-GATE-10: exit 0 pass, 123 a package failed, 1 the package set did not evaluate'."
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "rules/nix-quality.md",
    "line": 48,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "K3 confirmed for the index gate block's step 2a. The index tells CI to call a checked-in target, but the patterns are unbracketed (`accept-flake-config`, `trusted-users`, `access-tokens`), so the step matches the script or workflow that carries it. The `grep -v -F '${{ secrets.'` filter is expanded by GitHub inside a `run:` block. The lines are also bare greps with no `&& fail=1` guard, and a guard is needed because `! grep` never fails under bash -e. The adopt CI form (bracketed patterns, `{ secrets.` filter, `&& fail=1`) was run under bash -eo pipefail: exit 0 on a clean tree carrying the workflow, and exit 1 alone on each of five planted violations.",
    "fix": "Replace lines 48-50 with:\nfail=0\ngrep -rnE --exclude-dir=.git -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\\.access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' . && fail=1\ngrep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens' . | grep -v -F -e '{ secrets.' && fail=1\ngit ls-files -- '*.env' '*.pem' '*.key' '*secret*' '*token*' '*credential*' | grep . && fail=1\ntest \"$fail\" = 0"
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality.md",
    "line": 47,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The step 2a comment says 'empty output from all three lines = pass', and lines 74-76 say to chain steps 1-6 into a target that 'fails a grep step on any output'. security.md:114 says each `git ls-files` hit is read, and security.md:103 says a trusted-users hit in a host-administration module passes. Run verbatim, the ls-files line printed 300 paths on 16 of 46 repos, nearly all idiomatic: helix-editor/helix@079a789e8cb0:helix-lsp-types/src/semantic_tokens.rs, jj-vcs/jj@f01e70f8e375:lib/src/secret_backend.rs, 26 paths in Mic92/sops-nix@2bd00bd9bb35 (pkgs/sops-install-secrets/main.go and others), cachix/devenv@6d76db3889de:src/modules/integrations/secretspec.nix, and agenix `.age` ciphertext. The trusted-users pattern hits nix-darwin@4cff07de74b5:modules/nix/default.nix:669, which is exempt only by reading. A blocking chain therefore never goes green on these trees. Class: proposed C27 (a reading step placed in a blocking chain).",
    "fix": "Replace line 47 with: `# 2a security, NIX-SEC-02, NIX-SEC-03, NIX-SEC-08: empty output from the two grep lines = pass; a trusted-users hit inside an exported host-administration module is read and passes (NIX-SEC-08). The NIX-SEC-04 git ls-files line is a reading step: each listed path is read, and only a tracked plaintext credential is the finding.` In the sentence at lines 74-76 replace \"that fails a grep step on any output rather than on its exit code\" with \"that fails a grep step on any output rather than on its exit code, except the NIX-SEC-04 `git ls-files` line and a NIX-SEC-08 host-module hit, which are read\"."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality.md",
    "line": 48,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "K3 confirmed on a planted carrier (planted/k3). When the step-2a lines are placed in a workflow `run:` step (or a Makefile or justfile target, as lines 74-76 recommend), line 48 prints the carrier's own line `.github/workflows/nix.yml:10`. Line 49 prints it too, because `settings\\.access-tokens` contains `access-tokens`. Line 49's literal `${{ secrets.` inside `run:` makes actionlint fail with `got unexpected EOF while lexing end of string literal` because GitHub parses it as an unterminated expression. A negated `! grep \u2026` never fails a `bash -e` step (checked: bash -e continued past a negated grep that matched). Line 49 also flags compliant secret-fed CI: `access-tokens = github.com=${{ github.token }}` at nix-community/fenix@5f7e7d793cb2:.github/workflows/pr.yml:22 and nix-community/nix-index-database@9ad722673ab3:.github/workflows/update.yml:17,100,139. The bracketed form below exited 0 on its own carrier and 1 on a planted README `trusted-users = root $USER` and a literal `ghp_` token, and actionlint exited 0. Classes: proposed C26 (self-match), C21 (expanded in the wrong phase), C9 (negation exits 0).",
    "fix": "Replace line 48 with: grep -rnE --exclude-dir=.git -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\\.access-[t]okens' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .\nReplace line 49 with: grep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}'\nAppend to the paragraph at lines 63-65: \"The bracketed patterns keep the file that carries the gate (a workflow, Makefile or justfile) from matching itself, and `[$]{{` keeps GitHub from parsing the filter as an expression. In a CI `run:` step, write each locator as `if grep \u2026; then exit 1; fi`. A negated `! grep \u2026` never fails a `bash -e` step.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality.md",
    "line": 58,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2 confirmed. Lines 58 and 60 (and gates.md:177,179 and flakes.md:56) run `nix shell nixpkgs#lix` and `nix shell nixpkgs#nixVersions.nix_2_31` through the global registry (`flake:nixpkgs` resolves to the moving `nixpkgs-unstable` channel). Line 59 computes the floor from the locked nixpkgs with `--inputs-from .`, and skills/nix-flake-release/SKILL.md:246-247 uses `nix shell --inputs-from . nixpkgs#\u2026`, so the floor element can come from one nixpkgs and the leg from another. On this rig today, `nix flake metadata nixpkgs` resolved the same 8d5d2709 as the lock, and both spellings gave Lix 2.95.2 and nix_2_31 = 2.31.5. The drift appears as soon as the unstable channel moves or prunes `nix_2_31`. skills/nix-flake-adopt/SKILL.md:84 carries the registry spelling as well. Classes C8 and C14.",
    "fix": "Line 58: nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs   # 8 NIX-GATE-16 Lix leg: exit 0 pass\nLine 60: nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_31 replaced by that element\nApply the same `--inputs-from .` spelling to gates.md:177 and 179, flakes.md:56, and nix-flake-adopt SKILL.md:84."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality.md",
    "line": 128,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "NIX-CORE-04's era jq `.original.ref // .original.rev` prints `null` for URL-typed nixpkgs, so the branch that decides x86_64-darwin and 26.11 idioms is unread. This affects 10 of 43 locks, for example home-manager@7b4c5ec4beda (`null tarball tarball` for nixpkgs-unstable .tar.zst) and NixOS/nix@209d2bc44288 (a nixos-26.05 channel). With `.original.url` added, it prints the channel URL. Class C9.",
    "fix": "Line 128: jq -r '.nodes.nixpkgs | .original.ref // .original.url // .original.rev, .original.type, .locked.type' flake.lock"
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality.md",
    "line": 133,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-CORE-06 generated-touch header patterns miss two real generated-file headers. nix-community/stylix@fb28acd59e2a:generated/all-maintainers.nix:1 reads `# DO NOT EDIT THIS GENERATED FILE.`, and ghostty-org/ghostty@b40acce58dcf:nix/zigCacheHash.nix:1 reads `# This file is auto-generated!`. Planted with both files plus a hand-written twin (planted/core06), all hand-edited: the verbatim command printed nothing (exit 123), and the widened one listed both generated files and not the twin (exit 0). The widened patterns add no hits beyond line 3 anywhere in the corpus (NixOS/nixpkgs excluded). The cell also leaves exit 123 unstated as the empty-output pass (NIX-CORE-03). Proposed class C26.",
    "fix": "Line 133: git diff --name-only --diff-filter=d --merge-base \"$BASE\" -- '*.nix' | xargs -r grep -l -i -e '^# .*generated by' -e '^# .*autogenerated' -e '^# .*auto-generated' -e '^# .*do not edit'\nLine 132 comment: `# generated-touch (NIX-CORE-06): generated Nix files this change edits. Empty output (exit 123 from xargs, or 0 with no files) is the pass.`"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality.md",
    "line": 58,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2, index side. Gate steps 8 and 9 (lines 58, 60) and gates.md:177,179 use the registry form `nix shell nixpkgs#lix` / `nixpkgs#nixVersions.nix_2_31`. nix-flake-release:246-247 and the adopt CI (ci-and-readme.md:101,106) use `--inputs-from .`. Measured: the registry resolved 8d5d270 and the lock e158d9e. One spelling must win, and the locked form is correct.",
    "fix": "rules/nix-quality.md line 58: `nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs   # 8 NIX-GATE-16 Lix leg: exit 0 pass`. Line 60: `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build   # 9 NIX-GATE-16 floor leg, nix_2_31 replaced by that element`. Apply the same `--inputs-from .` insertion to rules/nix-quality/gates.md lines 177 and 179."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality.md",
    "line": 48,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "K3 checked against the index gate block and gates.md. gates.md has no `! grep`, no unbracketed security pattern and no `${{`. The index step 2a has two hazards. (1) Lines 48-49 use unbracketed `accept-flake-config`, `trusted-users` and `access-tokens`, and the index tells users to 'Chain steps 1 to 6 into one named target' that CI runs. That target file then holds the literal patterns and matches itself. (2) Line 49 filters with `'${{ secrets.'`, which GitHub expands if the line is pasted into a `run:` block. nix-flake-adopt's workflow already avoids both.",
    "fix": "Line 48: replace `-e 'accept-flake-config' -e 'trusted-users' -e 'settings\\.access-tokens'` with `-e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' -e 'settings\\.access-[t]okens'`. Line 49: `grep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e '[^-_a-z]access-[t]okens' -e '^access-[t]okens' . | grep -v -F -e '{ secrets.' -e '{ github.token }'`. Add after the block: 'The bracketed patterns keep the gate target and a workflow from matching their own lines, and the filter is spelled without `${{` because GitHub expands it inside `run:`.'"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality.md",
    "line": 111,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "NIX-CORE-01 forbids `continue-on-error` and allows it only on 'the Lix and floor legs (NIX-GATE-16)'. The index gate text makes steps 7-9 advisory, and step 7 is flake-checker. nix-flake-adopt's workflow (ci-and-readme.md:80) accordingly sets `continue-on-error: true` on the flake-checker step, which CORE-01 read literally forbids.",
    "fix": "In NIX-CORE-01, replace '`continue-on-error` on the Lix and floor legs (NIX-GATE-16)' with '`continue-on-error` on the Lix and floor legs (NIX-GATE-16) and on the flake-checker step (NIX-GATE-11, NIX-INP-06)'."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/gates.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 179,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K2 confirmed. Line 178 computes the floor from the flake's locked nixpkgs (`--inputs-from .`), but line 179 runs the floor leg from the global registry (`nix shell nixpkgs#\u2026`). On the toolchain `nix registry list` resolves `flake:nixpkgs` to channels nixpkgs-unstable, not the lock, so the leg can run a different Nix than the computed floor, or throw once unstable removes `nix_2_31`. The same block answers \"which nixpkgs\" two ways. Measured: `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix --version` printed `nix (Nix) 2.31.5`, exit 0, on a fixture locked to 8d5d2709.",
    "fix": "Line 179: replace `nix shell nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build` with `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build`. Line 182: after the first sentence, insert \"Both legs take nixpkgs from the flake's lock with `--inputs-from .`, never from the global registry, which resolves `nixpkgs` to the latest nixpkgs-unstable.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 177,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2. The Lix leg uses the global-registry spelling. The locked spelling must be the only one everywhere. `nix shell --inputs-from . nixpkgs#lix --command nix --version` printed `nix (Lix, like Nix) 2.95.2` on the 8d5d2709-locked fixture, so the locked form works.",
    "fix": "Line 177: replace `nix shell nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs` with `nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs`."
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 115,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "NIX-GATE-08 (MUST) says the finding prints `cannot build '\u2026drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled` \"on a cold and on a warm store\". On a cold store the exact command exits 1 but prints `error: path '/nix/store/\u2026-v-review-gls.nix.drv' is not valid`. The `cannot build` text appears only after the IFD derivation was instantiated. The consolidation measured that message warm only (V13c). An agent matching the stated text on a fresh CI runner sees `path \u2026 is not valid` and reaches for the NIX-GATE-09 `-source` triage row (NIX-FLK-07), which is a C7 misattribution.",
    "fix": "In the NIX-GATE-08 Verification cell, replace \"Finding: exit 1 with `cannot build '\u2026drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`, watched on a cold and on a warm store.\" with \"Finding: exit 1 on a cold and on a warm store. A warm store prints `cannot build '\u2026drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`, and a cold store prints `path '/nix/store/\u2026drv' is not valid`, a `.drv` path and not the `-source` row of the NIX-GATE-09 table.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 125,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The triage table has no row for the cold-store IFD red `error: path '/nix/store/\u2026drv' is not valid`, which `nix flake check --all-systems --no-build` (step 5, no IFD option) prints on a fresh runner. The only `is not valid` row routes to NIX-FLK-07, which is a C7 misattribution. Reproduced on the gate08/bad fixture.",
    "fix": "Insert after line 124: `| `error: path '/nix/store/\u2026drv' is not valid` (a `.drv` path, cold store) | IFD that `--no-build` could not realise | yes: remove the IFD (NIX-GATE-08) |`"
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 136,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The build pipeline's exit contract is incomplete (C9). When `nix eval` of `packages.x86_64-linux` fails, xargs -r builds nothing and the pipeline exits 0. Measured: `packages.x86_64-linux = throw \"boom\"` gave exit 0, a broken second package gave 123, the twin gave 0, and `nix build .#default` on the broken flake gave 0. The same applies to index step 6.",
    "fix": "Line 136: after \"exits 123 with `Cannot build '\u2026'` when one fails.\" insert \"An evaluation error in `nix eval` builds nothing and still exits 0, so the pass is exit 0 with no `error:` line on stderr.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 171,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-GATE-14 check cannot see a SHA-pinned magic-nix-cache below v11. NIX-GATE-12 forces SHA pins, so the version sits only in the comment. A workflow with `magic-nix-cache-action@87b14cf\u2026330b # v9` passed the pin check (exit 1) and the installer check (exit 1). The two rules' compliance paths blind each other.",
    "fix": "Line 161: add a fourth line to the fence, `grep -rn -E -e 'magic-nix-cache-action@[0-9a-f]{40} +# *v([0-9]|10)([^0-9]|$)' .github/workflows`. Line 165: append \"The fourth line catches a SHA-pinned `magic-nix-cache-action` whose version comment is below v11, and passes on empty output (exit 1).\" NIX-GATE-14 Verification cell: after \"while `@v15` stays clean.\" insert \"The fourth line catches the SHA-pinned form (watched: `# v9` hit, exit 0, and `# v15` empty, exit 1).\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 102,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "NIX-GATE-07 says nixf-diagnose \"passes the one measured cross-implementation divergence, the NIX-LANG-05 mixed-`rec` merge\", which reads as nixf missing every shape. language.md (lines 43-44 and the NIX-LANG-05 row) and [lang] conflict 4 say `merge-diff-rec` fires on three of the four shapes and misses only `foo = rec { \u2026 }; foo.b = \u2026;`. Two rows answer \"does nixf catch mixed-rec merges\" differently.",
    "fix": "In the NIX-GATE-07 Rationale cell, replace \"It also passes the one measured cross-implementation divergence, the NIX-LANG-05 mixed-`rec` merge.\" with \"Its `merge-diff-rec` also misses the `foo = rec { \u2026 }; foo.b = \u2026;` shape of the NIX-LANG-05 mixed-`rec` merge, the one measured cross-implementation divergence.\""
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "rules/nix-quality/gates.md",
    "line": 179,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2, outside this set but contradicted by it: the Lix and floor legs in gates.md:177 and :179, index rules/nix-quality.md:58 and :60, and the FLK-19 line at flakes.md:56 all use the registry `nix shell nixpkgs#\u2026`. nix-flake-release and the adopt CI workflow use `--inputs-from .`. The locked form must win.",
    "fix": "Insert `--inputs-from . ` after `nix shell ` on rules/nix-quality/gates.md lines 177 and 179, rules/nix-quality.md lines 58 and 60, and rules/nix-quality/flakes.md line 56."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 118,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The `--all-systems` triage table misclassifies or lacks three reds seen on held-out trees. (a) nh@b6869cdf9860: `Refusing to evaluate package 'nh-4.4.2-b6869cd' \u2026 hostPlatform.system = \"arc-linux\"`. The table says 'no', but the package is the flake's own and the system came from `lib.systems.doubles`, so the author's fix is NIX-FLK-08. (b) impermanence@7b1d382faf60: `infinite recursion encountered`, with the truncated trace at the flake's own devShells (flake.nix:40,46). Per-system eval shows only x86_64-freebsd recursing, a system flakeExposed adds; x86_64-darwin, armv6l-linux, riscv64-linux and others evaluate. The row 'in the flake's own per-system helper' points at the wrong cause. (c) devshell@a67c0f87b63b: `Package 'ghc-9.10.3' \u2026 is marked as broken, refusing to evaluate` via `formatter.riscv64-linux` = nixfmt-rfc-style, and the table has no row for it. Classes C7 and C2.",
    "fix": "Insert before the table: \"First name the failing system (evaluate the red output once per system). A red on a system the flake took from `flakeExposed`, `lib.systems.doubles` or `nix-systems/default` is a NIX-FLK-08 finding: iterate a literal list, then triage what remains.\" Change the `Refusing to evaluate package` row's cause to \"a platform-restricted dependency, or the flake's own package on a system its computed list added\" and its fix to \"no for a dependency, or an optional per-system guard; yes for the flake's own package (NIX-FLK-08)\". Add the row: \"| `Package '\u2026' \u2026 is marked as broken, refusing to evaluate` | nixpkgs marks a dependency broken on that system (devshell: `formatter.riscv64-linux` needs GHC) | no, or an optional per-system guard |\"."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 133,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The NIX-GATE-10 workflow grep `grep -rn -e 'nix build' .github/workflows` ('empty output is the finding'), and the same grep in What Agents Get Wrong item 1 (line 192), contradict the index (lines 74-76). The index tells CI to call one chained named target, so a compliant workflow holds no `nix build` line. On a real tree, direnv/direnv@b00e451f547f:.github/workflows/nix.yml:50 builds through `nix run --inputs-from . nixpkgs#nix-fast-build -- --no-nom --skip-cached --flake .#checks` and has no `nix build` line. Proposed class C27.",
    "fix": "Line 133: grep -rn -e 'nix build' -e 'nix-fast-build' .github/workflows\nLine 136, replace \"For the grep, empty output is the finding.\" with \"For the grep, empty output is the finding, unless the workflow calls the index's chained gate target: then run the same grep over the file that defines that target, and a printed line passes.\" Apply the same exception to What Agents Get Wrong item 1."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 93,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "With GATE-06's own statix.toml committed, a copy of nix-community/disko@725ea35e410a exits 1 on W11, W19 and W23, style lints the rule says never to act on, and prints no W12 or W17. The 'exits 1 \u2026 on a finding' reading makes disko a finding. Without statix.toml, nh@b6869cdf9860 and agenix@654f73179924 print `config error: path error: No such file or directory` and exit 0, so nothing was checked. The filtered form prints nothing on the disko copy and prints `./w12.nix>1:7:W:12:Consider quoting this URI expression` on a planted W12. Classes C16 and C9.",
    "fix": "Line 93: statix check -c statix.toml -o errfmt . | grep -e ':W:12:' -e ':W:17:'\nReplace line 97's first sentence with: \"The statix line passes on empty output (grep exit 1); any printed W12 or W17 line is the finding. Other W codes are style and never block. statix without a committed statix.toml prints `config error: path error` and exits 0, which means nothing was checked.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 162,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-GATE-13 presence grep `install_url:` passes an unpinned installer. ipetkov/crane@73b980519cef:.github/workflows/test.yml:38 `install_url: https://nixos.org/nix/install`, in a matrix row, installs whatever Nix is current. Classes C8 and C9.",
    "fix": "Add after line 162: grep -rn -e 'install_url:' .github/workflows | grep -v -e 'releases.nixos.org/nix/nix-[0-9]'\nAppend to line 165: \"The fourth prints every `install_url` that is not a versioned `releases.nixos.org/nix/nix-X.Y.Z/install` URL. Each printed line is read: an expression that resolves to a versioned URL (a matrix value, `${{ env.NIX_VERSION }}`) passes, and an unversioned URL is the finding.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 155,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The NIX-GATE-11 rationale reads a flake-checker crash as 'no nixpkgs input'. nix-community/nix-index@dd6792b23059 has a root `nixpkgs` input of type `indirect` (url `nixpkgs/nixos-unstable`, a NIX-INP-05 finding), and flake-checker exits 1 with `Error: Invalid(\"no nixpkgs dependency found for specified key: nixpkgs\")` (count 1). The step classifies it as 'tool could not run', and the stated cause is wrong. Class C7.",
    "fix": "Append to the NIX-GATE-11 Rationale cell: \"An `indirect` nixpkgs node (NIX-INP-05) crashes it with the same `Error: Invalid(\\\"no nixpkgs dependency found\u2026\\\")`, so a crash on a lock that has a `nixpkgs` input is read as NIX-INP-05's finding.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/gates.md",
    "line": 32,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-GATE-03 rule binds 'new code', but the gate grep (here and index:46) runs over the whole tree. It then fails repos that name the tools as data. cachix/git-hooks.nix@0d3997c4d325 prints 46 lines of its own hook definitions. numtide/treefmt@d68dddf6ac3a:nix/packages/treefmt/formatters.nix:11 is a formatter registry. nix-vscode-extensions@329083cd32e0:nix/tests.nix:47 names a VS Code extension called nixpkgs-fmt. home-manager@7b4c5ec4beda:nixos/common.nix:147 is an option example string. Real true positives on held-out trees: numtide/devshell@a67c0f87b63b:flake.nix:94 `formatter = \u2026 pkgs.nixfmt-rfc-style` and nix-community/impermanence@7b1d382faf60:flake.nix:49 `pkgs.nixpkgs-fmt`. Proposed class C28.",
    "fix": "Append to line 35: \"A hit that names the tool as data rather than as this flake's formatter, hook or package passes: a hook library's own hook definitions, a formatter registry, an option example or an unrelated package that shares the name.\" Add to Applied: numtide/devshell@a67c0f87b63b violates NIX-GATE-03 at flake.nix:94; nix-community/impermanence@7b1d382faf60 violates NIX-GATE-03 at flake.nix:49."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/inputs.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/inputs.md",
    "line": 190,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "K4 confirmed. Item 11 says 'points outside of its parent's store path (2.20) is now access to absolute path \u2026 forbidden'. Measured 2026-09-27 on a consumer with path:../sib: CppNix 2.35.2 and 2.31.5 print 'access to absolute path /nix/store/sib/flake.nix is forbidden in pure evaluation mode', while Lix 2.95.2 prints \"relative path '../sib' points outside of its parent's store path '/nix/store/\u2026-source'\". The sentence also uses an undated 'now', which Authoring notes item 8 forbids.",
    "fix": "Replace the first clause of item 11 with: \"`points outside of its parent's store path` (CppNix 2.20.6, and still Lix 2.95.2: `relative path '../sib' points outside of its parent's store path '\u2026-source'`) became `access to absolute path '\u2026' is forbidden in pure evaluation mode` on CppNix 2.31.5 and 2.35.2 (re-check at each Lix release),\"."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/inputs.md",
    "line": 65,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "NIX-INP-04 (MUST) quotes the cross-tree error for CppNix only. K4 requires every depth row that quotes this error to carry the Lix split: Lix 2.95.2 prints a different string, measured.",
    "fix": "In the Rationale cell, after '\u2026 on 2.31.5 and 2.35.2.', append: \"Lix 2.95.2 words it `relative path '\u2026' points outside of its parent's store path '\u2026-source'` (re-check at each Lix release).\""
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/inputs.md",
    "line": 137,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The NIX-INP-14 rationale quotes \"URL 'github:NixOS/flake-compat?submodules=1' contains unknown parameter 'submodules'\" as CppNix 2.35.2's answer. That string is not in the consolidation, whose conflict 16 says to key on shape, not string. Measured 2026-09-27: as a flake input, which is this rule's context, 'nix flake lock' fails with \"path URL 'path:github:example/vendored?submodules=1' has unsupported parameter 'submodules'\". The quoted string appears only through builtins.fetchTree.",
    "fix": "Replace \"CppNix 2.35.2 rejects the parameter outright: `URL 'github:NixOS/flake-compat?submodules=1' contains unknown parameter 'submodules'`.\" with \"CppNix 2.35.2 refuses to lock it: as a flake input it prints `path URL 'path:github:\u2026?submodules=1' has unsupported parameter 'submodules'`, and through `builtins.fetchTree` `URL 'github:\u2026?submodules=1' contains unknown parameter 'submodules'`. Key on the input's shape, never on either string.\""
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "rules/nix-quality/inputs.md",
    "line": 190,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K4 confirmed. For `path:../lib`, Lix 2.95.2 prints `relative path '../lib' points outside of its parent's store path`, while CppNix 2.35.2 prints `access to absolute path \u2026 is forbidden`. inputs.md:190 says the old string 'is now' the new one, and language.md:185 and :193 say `points outside` is gone from 2.31 on. Both contradict nix-diagnose's catalog row 40, its C20 table and SKILL.md:394, which carry the split.",
    "fix": "inputs.md:190: replace \"`points outside of its parent's store path` (2.20) is now `access to absolute path '\u2026' is forbidden in pure evaluation mode`\" with \"`points outside of its parent's store path` (CppNix 2.20 and Lix 2.95.2) reads `access to absolute path '\u2026' is forbidden in pure evaluation mode` on CppNix 2.31.5 and 2.35.2\". language.md:185: replace \"(2.20) against `access to absolute path \u2026 is forbidden` (2.31 and later)\" with \"(CppNix 2.20 and Lix 2.95.2) against `access to absolute path \u2026 is forbidden` (CppNix 2.31 and later)\". language.md:193: replace \"is gone from 2.31 on, and Lix prints other text or exits 0\" with \"is gone from CppNix 2.31 on but still printed by Lix 2.95.2, and elsewhere Lix prints other text or exits 0\"."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 67,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "NIX-INP-05 allows `https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst`. NIX-INP-06's condition, copied verbatim into index:56 and gates.md:147, fails every such lock. On a fresh channel-tarball lock, `supportedRefs.contains(gitRef)` exits 1 and `owner == 'NixOS'` exits 1, while `numDaysOld < 30` exits 0. Real false positives: nix-community/home-manager@7b4c5ec4beda (nixpkgs-unstable .tar.zst, locked 2026-09-17, 10 days old) and ghostty-org/ghostty@b40acce58dcf both exit 1 with `discovered 1 issue \u2026 * nixpkgs`. The same lock rewritten as github:NixOS/nixpkgs/nixpkgs-unstable exits 0. The widened condition below was watched: fresh tarball exit 0, tarball with lastModified 1780000000 exit 1, fresh github exit 0, cachix/cachix@3349ce74ba77 (2026-07-26) exit 1, mitchellh/zig-overlay@95d96b17b711 (nixos-25.11) exit 1, ryantm/agenix@654f73179924 (nixos-26.05) exit 0 (fixtures planted/inp06). Residual gap: a channel tarball of an unsupported branch passes the ref clause, and NIX-INP-05's tar-xz grep does not cover that. Proposed class C27.",
    "fix": "In inputs.md line 57, index line 56 and gates.md line 147, replace the condition string with: \"numDaysOld < 30 && (gitRef == '' || supportedRefs.contains(gitRef)) && (owner == '' || owner == 'NixOS')\". Append to NIX-INP-06's Verification cell: \"A `channels.nixos.org` tarball input carries no `gitRef` and no `owner`, so the empty-string clauses keep a fresh `.tar.zst` channel green; read its branch from `original.url`. Watched: fresh tarball exit 0, 100-day tarball exit 1.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 190,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "K4 confirmed on a planted cross-tree input (planted/inp04, input `path:../../sibling`). CppNix 2.35.2 prints `access to absolute path '/nix/store/sibling/flake.nix' is forbidden in pure evaluation mode`, CppNix 2.31.5 prints `access to absolute path '/nix/store/sibling' is forbidden\u2026`, and Lix 2.95.2 prints `relative path '../../sibling' points outside of its parent's store path '/nix/store/\u2026-source'`. Item 11 calls `points outside of its parent's store path` a 2.20 string that 'is now' the CppNix one, which is wrong for Lix. The NIX-INP-04 rationale (line 65) quotes only the CppNix string. Class C20.",
    "fix": "Item 11: replace \"`points outside of its parent's store path` (2.20) is now `access to absolute path '\u2026' is forbidden in pure evaluation mode`\" with \"`points outside of its parent's store path` is the CppNix 2.20 and Lix 2.95.2 wording, while CppNix 2.31.5 and 2.35.2 print `access to absolute path '\u2026' is forbidden in pure evaluation mode` (re-check at each Lix release)\". In the NIX-INP-04 Rationale cell, after \"on 2.31.5 and 2.35.2\", insert \"(Lix 2.95.2: `relative path '\u2026' points outside of its parent's store path '\u2026'`)\"."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 65,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "NIX-INP-04 allows only `path:./sub` from the root and `path:..` from a nested sub-flake. Planted in one git tree, `path:../..` from sub/deep and `path:../` from sub evaluate to the root's value on CppNix 2.35.2, 2.31.5 and Lix 2.95.2 (exit 0). Only the input that leaves the tree fails. The cross-tree grep (line 51) flags compliant parent forms: nix-community/nix-vscode-extensions@329083cd32e0:nix-dev/flake.nix:31 `path:../`, which line 50 says is 'never a candidate', and numtide/flake-utils@11707dc2f618:examples/check-utils/flake.nix:4 `path:../..`. E23 already resolved the wording to 'stays inside the flake's own git tree'. Classes C22 and proposed C26.",
    "fix": "NIX-INP-04 Rule cell: replace \"The only relative form allowed stays inside that tree, `path:./sub` from the root or `path:..` from a nested sub-flake back to its parent, and\" with \"The only relative form allowed is a `path:` that resolves inside the flake's own git tree (`path:./sub` from the root; `path:..`, `path:../` or `path:../..` from a nested sub-flake), and\". Line 50: `# cross-tree (NIX-INP-04): candidates to read. Empty output (exit 1) is the pass. A hit passes when the path resolves inside the repository's git tree and is the finding when it leaves it.` Verification cell: append \"Watched 2026-09-27: `path:../..` and `path:../` inside one tree exit 0 on CppNix 2.35.2, 2.31.5 and Lix 2.95.2.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 63,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-INP-02 Verification cell runs lib-root 'on a flake whose flake.nix defines no derivation (NIX-FLK-14)'. Every FLK-14-compliant A flake meets that selector, because its derivations live in package.nix. On nix-community/nh@b6869cdf9860, an A flake with `packages = forAllSystems (pkgs: { nh = pkgs.callPackage ./package.nix \u2026` and no derivation in flake.nix, lib-root prints `true`, a finding for a flake that must take nixpkgs. Proposed class C28 (check scope wider than rule scope).",
    "fix": "In the NIX-INP-02 Verification cell, replace \"lib-root on a flake whose `flake.nix` defines no derivation (NIX-FLK-14).\" with \"lib-root on a flake that exports no `packages` and no `apps` (shape B or C, NIX-CORE-05).\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 120,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The self-flags line 1, `test ! -f .gitmodules || \u2026`, exits 1 on an empty `.gitmodules` that declares no submodule. ghostty-org/ghostty@b40acce58dcf and NixOS/templates@3348e5b68b7a both carry a 0-byte `.gitmodules` (git cat-file -s = 0, no 160000 gitlinks). With `-s`, ghostty exits 0 and a planted non-empty .gitmodules without the flag exits 1 (planted/inp09). Proposed class C26.",
    "fix": "Line 120: test ! -s .gitmodules || grep -rq -e 'self\\.submodules' --include='flake.nix' ."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 98,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The update-alias grep over `.` flags CLI wrappers that forward a user's flag and changelog entries, none of which write the invocation the rule forbids. Hits: nix-community/nh@b6869cdf9860:crates/nh-core/src/args.rs:198,319,412,447 and CHANGELOG.md:54,401,402,405; home-manager@7b4c5ec4beda:home-manager/home-manager:1195,1198 and completion.zsh:27,73; nix-darwin@4cff07de74b5:pkgs/nix-tools/darwin-rebuild.sh:27,29,91,94. Across 46 repos the narrowed grep prints nothing for nh, home-manager and nix-darwin and keeps the true positive numtide/treefmt-nix@27b3b12a8e63:run-tests.sh:6 `nix flake check ./tests --recreate-lock-file`. Proposed class C26.",
    "fix": "Line 98: grep -rn --exclude='CHANGELOG*' -e 'nix .*--update-input' -e 'nix .*--recreate-lock-file' ."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/inputs.md",
    "line": 166,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The refresh-token grep flags the credential form NIX-SEC-03 prescribes, so it cannot go green on compliant lock-refresh workflows. Hits: ipetkov/crane@73b980519cef:.github/workflows/update-flake.yml:27 (PR opened with `token: ${{ secrets.PAT_FLAKE_UPDATE }}` at :32), Mic92/sops-nix@2bd00bd9bb35:.github/workflows/upgrade-flakes.yml:17 (App token at :34), nix-community/disko@725ea35e410a:.github/workflows/update-flake-lock.yml:16 (App token at :28), and oxalica/nil@205c8ba65a7f future-proof.yaml:26 `github_access_token:`. Separately, refresh-workflow misses a real weekly refresh. nix-community/nix-direnv@b0557d237b01:.github/workflows/update-flake-inputs.yml runs on a schedule, uses an App token and calls `mic92/update-flake-inputs@main`, yet both lists come back empty and the repo reads as 'no refresh workflow'. Classes: proposed C27 (first issue) and proposed C26 (second).",
    "fix": "Lines 163 and 166: add `-e 'update-flake-inputs'` after `-e 'nix flake update'` in both greps. Line 166 becomes: grep -rln -e 'update-flake-lock' -e 'update-flake-inputs' -e 'nix flake update' .github/workflows | xargs -r grep -Hn -e 'secrets.GITHUB_TOKEN' | grep -v -e 'access-tokens' -e 'github_access_token'\nLine 165 comment: `# refresh-token (NIX-INP-11): empty output is the pass. NIX-SEC-03's access-tokens and github_access_token lines are filtered out, because they feed Nix's fetches. Read each remaining hit: one in the PR-opening step is the finding.`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/modules.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/modules.md",
    "line": 72,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "NIX-MOD-03 (\"Set `_class` in every exported module file\") is harmful for a file exported under two host classes. In held-out ryantm/agenix@654f73179924, `modules/age.nix` is both `nixosModules.age` (flake.nix:43) and `darwinModules.age` (flake.nix:46), and it branches on `isDarwin` (age.nix:20). The `grep -rL` lists it, and tagging it `\"nixos\"` would make the darwin import fail with the class-mismatch error (C25).",
    "fix": "Append to the Rule cell: \"A file exported under more than one host class (one body for `nixosModules` and `darwinModules`) stays untagged; export a thin tagged wrapper per class that imports it.\" Append to the Verification cell: \"A listed file that two outputs of different classes export is not a finding.\""
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/modules.md",
    "line": 47,
    "severity": "blocker",
    "kind": "false-negative-on-real-tree",
    "finding": "Every MOD grep (MOD-02 aside) takes the directory operand `nix`, and no module flake in either corpus keeps modules there. Run verbatim, 35 of 46 repos exit 2 (`No such file or directory`) with empty stdout, which the file's own pass rule ('empty output is the pass') reads as green. It misses real held-out violations the same greps find over `.`: nixos-hardware@30d48a0ec603 13 MOD-05 hits (pine64/pinebook-pro/default.nix:5, confirmed by eval under readOnlyPkgs: `nixpkgs.overlays' is defined multiple times`), microvm@68f2670367e0 nixos-modules/microvm/optimization.nix:40 (MOD-05), and agenix@654f73179924 modules/age.nix:290 `identityPaths = listOf types.path` (MOD-06; the store-path probe printed the /nix/store path, exit 0). Class C2 (hidden default scope).",
    "fix": "In the Dates and Floors pinned-default bullet replace `Every grep below takes \\`nix\\` as the module directory. Substitute yours.` with `Every grep below runs over \\`.\\` and each hit is read. A grep given a directory that does not exist exits 2 with \\`No such file or directory\\` and empty stdout, and that is never a pass.` In the fenced sh blocks change the trailing operand `nix` to `.` on the MOD-05 grep (line 98) and the MOD-06 and MOD-07 greps (lines 146-147). Replace line 61 `grep -rL -e '_class' --include='*.nix' nix` with `grep -L -e '_class' nix/module.nix   # run on each file a module output exports; substitute each path`. Watched 2026-09-27: over `.`, nixos-hardware gives 13 MOD-05 lines and agenix 5 MOD-06 lines. With `nix` both exit 2. On agenix the per-file MOD-03 form lists modules/age.nix and modules/age-home.nix."
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/modules.md",
    "line": 146,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The MOD-06 grep `-w -e 'types\\.path'` misses the `with types;` spelling. microvm@68f2670367e0:nixos-modules/microvm/options.nix:1109 declares `credentialFiles` as `with types; attrsOf path`, a secret-file option. The MOD-06 probe (pure getFlake of the locked ref) accepted `/nix/store/0000\u2026-secret` and exited 0. That is a MUST violation the grep cannot see. Class C27 (lexical locator; see new_failure_classes).",
    "fix": "Replace line 146 with `grep -rn -w -e 'types\\.path' -e 'attrsOf path' -e 'listOf path' -e 'nullOr path' -e 'type = path' -e 'hasStorePathPrefix' --include='*.nix' .`, and in the NIX-MOD-06 Verification cell after `Grep: the first command above.` add `It also matches the \\`with types;\\` spelling (\\`attrsOf path\\`). Watched 2026-09-27: it hits microvm's \\`credentialFiles\\`, which the \\`types\\\\.path\\` form missed, and it stays empty on a \\`pathWith\\` twin.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/modules.md",
    "line": 212,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The held-out round found new NIX-MOD instances, each confirmed by evaluation. modules.md has no Applied evidence section (item 14).",
    "fix": "Insert before `## What Agents Get Wrong Here` a section `## Applied Evidence (held-out round 2026-09-27)` with these lines: `- add to Applied: nix-community/impermanence@7b1d382faf60 violates NIX-MOD-01 at flake.nix:16 (nixosModules.impermanence = import ./nixos.nix; importing it with nixosModules.default fails: The option \\`environment.persistence' \u2026 is already declared, C25)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-MOD-06 at modules/age.nix:290 (age.identityPaths listOf types.path accepted /nix/store/0000\u2026-secret, exit 0, C15)`; `- add to Applied: astro/microvm.nix@68f2670367e0 violates NIX-MOD-06 at nixos-modules/microvm/options.nix:1109 (credentialFiles attrsOf path accepted a store path, exit 0, C15)`; `- add to Applied: NixOS/nixos-hardware@30d48a0ec603 violates NIX-MOD-05 at pine64/pinebook-pro/default.nix:5 (under readOnlyPkgs: nixpkgs.overlays is defined multiple times, C25)`; `- add to Applied: astro/microvm.nix@68f2670367e0 violates NIX-MOD-05 at nixos-modules/microvm/optimization.nix:40 (C25)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-MOD-02 at flake.nix:49 (homeManagerModules with no homeModules, C6)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-MOD-03 at modules/age.nix:1 (no _class while exporting nixos, darwin and home modules, C25)`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/release.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/release.md",
    "line": 126,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "NIX-REL-11 (MUST) forbids abort-on-warn on a whole-flake nix build, but the workflow grep only matches 'flake check' lines. Planted `- run: nix build --option abort-on-warn true .` gave exit 1 (the stated pass). Line 129 also keeps E37's struck wording 'it must name one attribute', which contradicts the row's own set form.",
    "fix": "Line 126 becomes: grep -rn -e 'flake check.*abort-on-warn' -e 'abort-on-warn.*flake check' -e 'nix build[^#]*abort-on-warn[^#]*$' --include='*.yml' --include='*.yaml' .   Line 129's last sentence becomes: \"The workflow grep passes on empty output (exit 1). A hit (exit 0) is a `flake check` or an attribute-less `nix build` carrying the flag, and is the finding.\" In the NIX-REL-11 Verification cell, change \"The workflow grep: red on a `flake check` step carrying the flag (exit 0), green on the scoped step (exit 1).\" to \"The workflow grep: red on a `flake check` step and on a bare `nix build .` step carrying the flag (exit 0), green on scoped `nix eval` and `nix build .#packages.x86_64-linux.default` steps (exit 1).\" (watched: bad 0, bare-build 0, scoped twin 1)"
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/release.md",
    "line": 146,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "NIX-REL-13 (MUST) calls the URL check authoritative, but it exits 0 on both outcomes (watched: literal tag printed false, rc 0; interpolated printed true, rc 0). It cannot go red as a CI step, which breaks NIX-CORE-03 and Authoring notes item 9 (each exit code's meaning). The assert form was watched: literal rc 1, interpolated rc 0.",
    "fix": "Line 146 becomes: nix eval --json .#packages.x86_64-linux.default --apply 'p: assert builtins.replaceStrings [ p.version ] [ \"\" ] p.src.url != p.src.url; true'   Line 151's first sentence becomes: \"The eval (the URL check) prints `true` and exits 0 to pass, and `assertion \u2026 failed` with exit 1 means the fetched URL does not contain the version.\" In the NIX-REL-13 Verification cell, replace \"printed `false`\" with \"failed the assertion (exit 1)\", \"printed `true`\" with \"exited 0\" and \"A 40-hex `rev` also prints `false`\" with \"A 40-hex `rev` also fails the assertion\"."
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/release.md",
    "line": 109,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The release-smoke example runs `nix run` on a third-party flake (github:Mic92/nixpkgs-review/4.0.0) at a tag. The index non-negotiable 14 (NIX-SEC-05) says never `nix run` a flake you do not own, and to evaluate one only at a full 40-hex rev. An agent that copies the line verbatim to watch it green breaks a MUST.",
    "fix": "Line 109 becomes: nix run --no-write-lock-file github:example-org/reltool/v1.2.3 -- --version 2>/dev/null | grep -F -w 1.2.3   (this matches the example-org/reltool README block at line 93). Leave the nixpkgs-review 4.0.0 run in the NIX-REL-16 Verification cell as recorded evidence."
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/release.md",
    "line": 38,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The NIX-REL-01 `${src}` check names `cannot build \u2026 during evaluation` as the finding. For the in-repo case the row governs, a fileset `src` read through `\"${finalAttrs.src}/Cargo.toml\"`, the same command exits 1 with `path '/nix/store/\u2026-source' is not valid`. This was watched locally and by tarball on 2026-09-27. An agent matching the quoted string misreads the red.",
    "fix": "Replace \"where exit 0 passes and `cannot build \u2026 during evaluation` is the finding.\" with \"where exit 0 passes and exit 1 is the finding: `cannot build \u2026 during evaluation` when `src` is a fetcher derivation, `path '/nix/store/\u2026-source' is not valid` when `src` is a fileset or `self` (NIX-FLK-07).\""
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/release.md",
    "line": 40,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "NIX-REL-03 lists `revCount` among the forbidden reads, but its locator has no `revCount` pattern, so `self.revCount` inside an exported derivation passes the grep.",
    "fix": "In the NIX-REL-03 Verification cell, the locator becomes: `grep -rn -e 'self.rev' -e 'self.shortRev' -e 'self.dirtyShortRev' -e 'self.lastModified' -e 'self.revCount' --include='*.nix' .`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/release.md",
    "line": 109,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-REL-16 release smoke `grep -F -w 4.0.0` passes suffixed versions, because `-` and `+` are word boundaries: `nh 4.4.2-1ccb0bf` and `nh 4.4.2+dirty` both exit 0, while `yazi 26.9.1pre\u2026` exits 1. nh at tag v4.4.2 evaluates `version = \"4.4.2-1ccb0bf\"` (measured). Its package.nix comment says `--version includes` the revision, so the MUST that claims to prove 'the version equals the tag (NIX-REL-02)' goes green on a REL-02 violation. Not built (nh is not cached), so the proof is the evaluated version plus string twins. Class C9.",
    "fix": "Replace line 109 with `nix run --no-write-lock-file github:Mic92/nixpkgs-review/4.0.0 -- --version 2>/dev/null | grep -E -e ' 4[.]0[.]0$'`. In line 112 replace `passes with exit 0: substitute your tag and version,` with `passes with exit 0 when the version is the last token of the line. Substitute your tag and version with each dot bracketed, and for a CLI that prints text after the version, anchor on its own format,`. In the NIX-REL-16 Verification cell append `\\`grep -F -w\\` is not used because it accepts \\`4.4.2-1ccb0bf\\` and \\`4.4.2+dirty\\` (watched 2026-09-27). The anchored form matches \\`nixpkgs-review 4.0.0\\` and rejects both.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/release.md",
    "line": 146,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-REL-13 URL check reads `p.src.url`. With `fetchSubmodules = true` (or any git-backed option), `fetchFromGitHub` uses fetchgit, and `src.url` is the bare `https://github.com/\u2026/repo.git` with no version. The compliant, interpolated `tag = \"v${finalAttrs.version}\"` in llm-agents@efb10f28f724:packages/agentty/package.nix:24 printed `false`. A plant confirms it: interpolated+git printed false, interpolated+zip true, and both literals false. Class C26 (new).",
    "fix": "Replace line 146 with `nix eval --json .#packages.x86_64-linux.default --apply 'p: let s = p.src.rev or p.src.url; in builtins.replaceStrings [ p.version ] [ \"\" ] s != s'`. In the NIX-REL-13 Verification cell append `The check reads \\`src.rev\\` first because a git-backed \\`fetchFromGitHub\\` (\\`fetchSubmodules = true\\`) has a version-free \\`src.url\\`. Watched 2026-09-27: agentty printed \\`true\\` (was \\`false\\` on \\`src.url\\`), and literal \\`tag = \"v0.2.14\"\\` twins printed \\`false\\` on both backends.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/release.md",
    "line": 62,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-REL-06 and NIX-REL-11 greps scan `*.yml`, and their own pattern text matches itself (K3). Once either line is wired into a workflow `run:` step it matches its own line, so a compliant repository goes red (planted 2026-09-27: both exit 0 on a workflow containing only the check lines). Bracketing one character makes the lines self-silent and keeps the reds: identical hit counts on all 46 corpus repos, and red on a planted `flakehub-push` step and a planted `nix flake check --option abort-on-warn true` step. Class C28 (new).",
    "fix": "Replace line 62 with `grep -rn -e 'flakehub[.]com/f/' -e 'flakehub-[p]ush' -e 'flakehub-cache-[a]ction' --include='*.nix' --include='*.yml' --include='*.yaml' .` and line 126 with `grep -rn -e 'flake [c]heck.*abort-on-warn' -e 'abort-on-warn.*flake [c]heck' --include='*.yml' --include='*.yaml' .`. After line 65 add `The bracketed character keeps each grep from matching its own line once it runs inside a workflow step. Never wire it as \\`! grep \u2026\\`, which never fails a \\`bash -e\\` step.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/release.md",
    "line": 187,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The held-out round found new NIX-REL instances. release.md has no Applied evidence section (Authoring notes item 14).",
    "fix": "Insert before `## What Agents Get Wrong Here` a section `## Applied Evidence (held-out round 2026-09-27)` with these lines: `- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-REL-02 at package.nix:20 (version 4.4.2-b6869cd against manifest 4.4.2, and 4.4.2-1ccb0bf at tag v4.4.2, C18)`; `- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-REL-03 at flake.nix:24 (self.shortRev passed into package.nix, C18)`; `- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-REL-09 at README.md:131 (uncommented nix profile install, C10)`; `- add to Applied: numtide/devshell@a67c0f87b63b violates NIX-REL-05 at templates/toml/flake.nix:8 (github:edolstra/flake-compat, C6)`; `- add to Applied: NixOS/nixos-hardware@30d48a0ec603 violates NIX-REL-13 at spacemit/k3-pico-itx/linux.nix:20 (literal tag = \"v7.2\" for the source its version names, C23)`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-diagnose/SKILL.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-diagnose",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 381,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "MUST row 8 reads 'An overlay is not written `final: _prev:`'. That makes the canonical `final: prev:` a finding, and also `_final: prev:`, the right form shown at line 226 and in NIX-PKG-21. All of these exit 0 under CppNix `nix flake check`. The row is stricter than NIX-FLK-02 as measured (K1) and contradicts nix-flake-adopt's MUST row 2.",
    "fix": "| 8 | An exported overlay is written `self: super:`, `prev: final:` or with formals | NIX-FLK-02 |"
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 147,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K2. The step 3 CppNix re-run uses the registry nixpkgs. This contradicts nix-flake-release step 5 and its agent-mistake item 6, and the command omits gate step 4's IFD option, which NIX-FLK-19 counts.",
    "fix": "nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --no-write-lock-file --option allow-import-from-derivation false ."
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 168,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The step 4 pre-check grep misses the `\"${finalAttrs.src}/Cargo.lock\"` form, which NIX-PKG-15 names explicitly. Watched: a planted `cargoLock.lockFile = \"${finalAttrs.src}/Cargo.lock\";` printed nothing while the `${src}` twin was found. The corrected grep found both and passed `./Cargo.lock`.",
    "fix": "grep -rn -e '\"${src}/' -e '\"${finalAttrs.src}/' -e '\"${self}/' --include='*.nix' ."
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 182,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Authoring note 11 and the consolidation's NIX-LANG-09 fix the order: (1) the bare line, (2) `--show-trace` only when the line names no rule, (3) isolate by removal, (4) `--no-eval-cache`. The skill runs isolation (Step 4) before `--show-trace` (Step 5 item 1), yet an infinite recursion cannot be isolated until the trace shows the frame (the Infinite recursion section says to classify by frame before changing anything).",
    "fix": "Move Step 5 item 1 (lines 182-185, the `--show-trace` paragraph) to the end of Step 1, after line 114, reworded as: \"If that line names no rule, chiefly `infinite recursion encountered`, re-run the same command once with `--show-trace`. The innermost frame that belongs to your flake picks the class (see Infinite recursion). A frame under the nixpkgs source is class (d).\" Renumber Step 5 to \"cache, repl\" with the remaining two items, and update the Contents link text."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 380,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "MUST row 8, 'An overlay is not written `final: _prev:`', is stricter than NIX-FLK-02. It flags the compliant `final: prev:` (prev used), `_final: prev:` and `_final: _prev:`, which CppNix 2.35.2 and 2.31.5 accept with exit 0 (K1, watched). It also differs from nix-flake-adopt's row 2 for the same rule.",
    "fix": "Replace row 8 with `| 8 | An overlay is written \\`self: super:\\`, \\`prev: final:\\` or with formals | NIX-FLK-02 |`."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 147,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2 confirmed. Step 3 runs the CppNix re-check through the global registry: `nix shell nixpkgs#nixVersions.nix_2_31`. On the hexyl fixture the registry `nixpkgs` evaluated to 26.11.20260927.8d5d270 while the lock pins 26.11.20260926.e158d9e, so the leg uses a nixpkgs the flake never locked. The same unlocked spelling appears at nix-flake-adopt/SKILL.md:84, error-catalog.md:65 (`nix run nixpkgs#nixf-diagnose`) and :101 (`nix shell nixpkgs#lix`), and SKILL.md:203. nix-flake-release uses the locked `--inputs-from .` form. Class C8.",
    "fix": "Line 147 becomes `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --no-write-lock-file .`. nix-flake-adopt/SKILL.md:84 becomes `... only when \\`nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build\\` also exits 0 (NIX-FLK-19)`. In error-catalog.md, line 101's First command becomes `nix shell --inputs-from . nixpkgs#lix --command nix eval .#default`, and line 65 plus SKILL.md:203 become `nix run --inputs-from . nixpkgs#nixf-diagnose -- flake.nix`."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-diagnose/SKILL.md",
    "line": 168,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The step 4 pre-check `grep -rn -e '\"${src}/' -e '\"${self}/'` claims to find eval-time reads, but it matches every build-time interpolation, which NIX-LANG-02 says is correct. It gave 286 hits in 6 repos with 2 true positives: crane@73b980519cef checks/vendorGitSubset.nix:12 `builtins.readFile \"${src}/Cargo.lock\"` and yazi@0ea4c5d9ef75 nix/yazi-unwrapped.nix:32 `lockFile = \"${src}/Cargo.lock\"`. Examples of the rest: home-manager tests `skills = \"${src}/skills\"` (46), nixpkgs (235), llm-agents makeSetupHook scripts. Class: lexical homograph (new).",
    "fix": "Line 168 becomes `grep -rn -e 'readFile \"${src}/' -e 'readFile \"${self}/' -e 'importTOML \"${src}/' -e 'importTOML \"${self}/' -e 'importJSON \"${src}/' -e 'importJSON \"${self}/' -e 'lockFile = \"${src}/' -e 'lockFile = \"${self}/' --include='*.nix' .`. Watched over 46 repos: 2 hits, both true positives, crane and yazi. yazi is the V15 case."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt/SKILL.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 392,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K1 confirmed. The skill says renaming the overlay's unused `final` to `_final` makes CppNix reject it. On CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2, `nix flake check --no-build` exits 0 on `_final: prev:`, `_final: _prev:`, `final: prev:` and `final: _prev:`. CppNix rejects only `self: super:`, `prev: final:` and `{ final, prev }:` (exit 1). The claim also contradicts nix-diagnose SKILL.md:226, which shows `_final: prev:` as the right form, and NIX-PKG-21's own `_final:` snippet.",
    "fix": "Replace item 4 (lines 392-394) with: \"4. **Writes NIX-PKG-21's Python overlay with an unused `final`.** `deadnix --fail --no-lambda-pattern-names` exits 1 with `Unused lambda argument: final`. Name it `_final`: CppNix 2.35.2, 2.31.5 and Lix 2.95.2 all accept `_final: prev:`. NIX-FLK-02 rejects only `self: super:`, `prev: final:` and formals.\""
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 84,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K2. The CppNix re-check uses the global registry (`nix shell nixpkgs#nixVersions.nix_2_31`). nix-flake-release SKILL.md:240-247 runs the same leg with `--inputs-from .` and lists the registry form as an agent mistake (item 6). Two rows give different answers to one question. The command also omits the IFD option, so it is not gate step 4, which NIX-FLK-19 names. Measured: `--inputs-from .` on a flake with no nixpkgs input falls back to the registry and still printed `nix (Nix) 2.31.5`, so the locked form is safe everywhere.",
    "fix": "Replace the command in the cell with `nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false`"
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 249,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Step 7 calls itself 'The nix-quality rule's gate block', but it leaves out the index's step 2a security step (E41: SEC-02, SEC-03, SEC-08, SEC-04), so a local run never checks trust boundaries before commit. The step 8 CI carries them, so 'The CI workflow in step 8 runs the same commands' is also false.",
    "fix": "Change line 249 to \"Steps 1 to 6 of the `nix-quality` rule's gate block, with its security step.\" and insert after line 255:\ngrep -rn --exclude-dir=.git -e 'accept-flake-[c]onfig' -e 'trusted-[u]sers' .   # empty (NIX-SEC-02, NIX-SEC-08)\ngrep -rnE --exclude-dir=.git -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' .   # empty (NIX-SEC-03, NIX-SEC-04)\ngit ls-files -- '*.env' '*.pem' '*.key' '*secret*' '*token*' '*credential*'   # empty (NIX-SEC-04)"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 236,
    "severity": "blocker",
    "kind": "template-broken",
    "finding": "Step 6 runs `nix flake lock` before `git add`. Applied literally to sharkdp/hexyl@6ecc29b9c8c8, `nix flake lock` fails because flake.nix is untracked (`Path 'flake.nix' ... is not tracked by Git`) and writes no lock. The next `git add flake.nix flake.lock package.nix default.nix shell.nix` then aborts with `fatal: pathspec 'flake.lock' did not match any files` and adds nothing, so nix fmt, deadnix and both flake checks in step 7 all exit 1 with the untracked error. The step 4 `meta` eval (line 194) runs even earlier and fails the same way. This contradicts the skill's own Fact 1. Class C5. With the order fixed, every step 7 command passed on hexyl, including nix build, nix run, the bridge, the devShell, Lix and the floor.",
    "fix": "Replace the step 6 code block (lines 237-242) with:\n```sh\ngit add flake.nix package.nix default.nix shell.nix\nnix flake lock\ngit add flake.lock\n# Empty output is the pass. Any path listed is invisible to every nix command.\ngit ls-files --others --exclude-standard .\n```\nAt line 194, replace `Check the \\`meta\\` set once the flake evaluates:` with `Check the \\`meta\\` set after step 6 has run \\`git add\\` and \\`nix flake lock\\`, because an untracked \\`flake.nix\\` fails every \\`nix\\` command:`"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 318,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The step 10 `pkgs.system` inventory grep matches the NixOS/nix-darwin option `nixpkgs.system` and `config.nixpkgs.system`, which are correct code. That gave 16 false hits: all 10 in nixpkgs@9cab9ed832c3 (e.g. nixos/lib/eval-config.nix:51), home-manager@7b4c5ec4bedaf modules/modules.nix:114, which sets `nixpkgs.system = lib.mkDefault pkgs.stdenv.hostPlatform.system`, nix-darwin flake.nix:32, default.nix:15 and modules/nix/nixpkgs.nix:300. Class: lexical homograph (new).",
    "fix": "Line 318 becomes `grep -rn -e '[^A-Za-z0-9_-]pkgs\\.system[^A-Za-z0-9_-]' -e '[^A-Za-z0-9_-]pkgs\\.system$' -e '^pkgs\\.system' --include='*.nix' .`. Watched: it keeps the real reads (devenv src/modules/integrations/android.nix:80, nix-vscode-extensions nix/overlay.nix:232, NixOS/nix tests/nixos/default.nix:44,58) and drops all 16 option hits. 2 residual hits remain, in a comment and an escaped `''${`."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 319,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The step 10 `with` grep matches at any indentation and with anything after the semicolon. It therefore flags the list-scoped form the skill's own table says 'stays': home-manager modules/programs/atool.nix:46 `with pkgs; [ bzip2 \u2026 ]`, fusuma.nix:103, podman/darwin.nix:209 and treefmt nix/packages/treefmt/formatters.nix:2 `with pkgs; [`. It also flags nixfmt's own-line `with pkgs;` before a list (crane examples/end-to-end-testing/flake.nix:92) and nested, non-file-scope `with lib;` (disko lib/default.nix:401 and 7 more).",
    "fix": "Line 319 becomes `grep -rnE -e '^with lib[[:space:]]*;[^[]*$' -e '^with pkgs[[:space:]]*;[^[]*$' -e '^with builtins[[:space:]]*;[^[]*$' --include='*.nix' .`. Watched: the list-scoped and nested hits drop out, and the file-scope forms stay (devenv src/modules/languages/php.nix:3, nixd nixd/docs/editors/vscodium.nix:4, nixos-hardware gpd/win-max-2/default.nix:7)."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/SKILL.md",
    "line": 113,
    "severity": "fix",
    "kind": "template-broken",
    "finding": "Step 3 says 'Rename `octool` (four places) and the description', but the template has five `octool` occurrences outside the description (lines 141, 143, 144, 148, 156, counted after extraction). An agent that stops at four leaves `inherit (\u2026) octool` or `.octool`, and evaluation fails.",
    "fix": "Replace 'Rename `octool` (four places) and the description.' with 'Rename `octool` everywhere (five places) and the description; `grep -c octool flake.nix` prints 0 afterwards.'"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt/references/package-templates.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/references/package-templates.md",
    "line": 234,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "The Python flake template works around a problem that does not exist. Line 237 says 'CppNix requires the name (NIX-FLK-02)', and lines 254-259 say `_final` makes CppNix fail with `overlay does not take an argument named 'final'`. Both are false on every implementation measured (see K1). The `inherit (final) lib` workaround teaches agents that the underscore convention is unsafe for overlays. The corrected overlay passed nixfmt --check (exit 0) and deadnix --fail --no-lambda-pattern-names (exit 0), and `_final: prev:` passed flake check on all three implementations.",
    "fix": "Replace lines 234-241 with:\n      overlays.default = _final: prev: {\n        pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [\n          (pyFinal: _pyPrev: {\n            toypkg = pyFinal.callPackage ./package.nix { };\n          })\n        ];\n      };\nReplace lines 254-259 with: \"The overlay is NIX-PKG-21's form. Its first argument is `_final` because nothing reads it: `deadnix --fail --no-lambda-pattern-names` exits 1 on an unused `final`, and CppNix 2.35.2, 2.31.5 and Lix 2.95.2 all accept `_final: prev:` (NIX-FLK-02 rejects only `self: super:`, `prev: final:` and formals).\""
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/references/package-templates.md",
    "line": 254,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K1 confirmed. CppNix 2.35.2 and 2.31.5 both accept `_final: prev:`, `_final: _prev:` and `final: _prev:` (exit 0) and reject only `self: super:` and `prev: final:` (exit 1). Lix 2.95.2 accepts all five. So the claim at lines 256-258 ('Renaming it `_final` makes CppNix reject the overlay'), the template comment at line 237 ('CppNix requires the name') and SKILL.md lines 392-394 are false, and the `inherit (final) lib` workaround exists only because of the false claim. Class C22: the claim was generalized without the `_final` twin.",
    "fix": "In the Python-library flake template, replace the overlay with:\n```nix\n      overlays.default = _final: prev: {\n        pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [\n          (pyFinal: _pyPrev: {\n            toypkg = pyFinal.callPackage ./package.nix { };\n          })\n        ];\n      };\n```\nReplace lines 254-259 with: `NIX-PKG-21's overlay leaves \\`final\\` unused, so it is spelled \\`_final\\`. CppNix 2.35.2 and 2.31.5 accept \\`_final: prev:\\` (exit 0, watched 2026-09-27), and deadnix \\`--no-lambda-pattern-names\\` ignores underscore names. Only \\`self: super:\\`, \\`prev: final:\\` and formals are rejected (NIX-FLK-02).` In SKILL.md, replace item 4 (lines 392-394) with `4. **Writes NIX-PKG-21's Python overlay with an unused \\`final\\`.** deadnix fails it. Name it \\`_final\\`, which CppNix accepts. Never switch to \\`self:\\` or formals.` Re-run nixfmt, deadnix and the two-interpreter probe on the edited template before shipping."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/references/package-templates.md",
    "line": 61,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The Rust CLI template's fileset (Cargo.toml, Cargo.lock, src) plus the advice 'Add every directory the build reads (./build.rs, ./benches), and nothing else' silently drops `tests/` and `examples/`. On sharkdp/hexyl@6ecc29b9c8c8 the build went green running 15 tests and never ran tests/integration_tests.rs. With ./tests and ./examples added it ran 56 (41 integration tests). The gate reports green while the project's test suite is skipped. Class C4.",
    "fix": "Replace 'Add every directory the build reads to the fileset (`./build.rs`, `./benches`), and nothing else, so a README commit leaves the `drvPath` unchanged (NIX-PKG-05).' with 'Add every path the build or `cargo test` reads to the fileset (`./build.rs`, `./tests`, `./examples`, `./benches`, and any fixture a test opens), and nothing else, so a README commit leaves the `drvPath` unchanged (NIX-PKG-05). Count the `test result:` lines in `nix build -L`: on sharkdp/hexyl the three-entry list ran 15 tests and silently skipped `tests/integration_tests.rs`, and adding `./tests` and `./examples` ran 56 (watched 2026-09-27).'"
   }
  ]
 }
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'applied', 'refused', 'checker_clean', 'lines_after'],
  properties: {
    file: { type: 'string' },
    applied: { type: 'array', items: { type: 'number' }, description: 'finding line numbers applied' },
    refused: { type: 'array', items: { type: 'string' }, description: 'line: reason, only when applying the fix would contradict the authoring notes or a consolidation' },
    checker_clean: { type: 'boolean' },
    lines_after: { type: 'number' },
  },
}

function fix(item) {
  const isOpus = item.model === 'opus'
  return agent(`Model rationale: ${isOpus ? 'opus — at least one finding is a blocker on an enforced rule, so applying it is a judgement about what the rule says' : 'sonnet — mechanical edits from exact fix text a reviewer already decided'}.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a fixer in phase 8 (Validate) of the research-lang program for Nix, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILE against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/nix-topic-map.md (section "## Authoring notes (binding on the drafters)" and the latest contradiction list) and returned findings with exact fix text. Apply them.
- YOUR FILE (the only file you may edit): ${item.file}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content. When a fix rewrites a verification command, re-run it red and green on a planted fixture under /home/mherwig/.cache/research-lang/nix-tools/fixtures/fix-<your-file-stem>/ (git init -q and git add -A) through /home/mherwig/.cache/research-lang/nix-tools/run.sh (the only way to run Nix; never nix-portable directly, never gc) before keeping it; if it does not go red, refuse the finding with the observed output. Every Nix fence you touch must stay nixfmt-clean (extract to a scratch file and run run.sh nixfmt --check). An 'add to Applied' finding adds one evidence row to the file's Applied section in the shape that section already uses; shipped text carries no repo@sha, so name the public project and the pattern, not the SHA.
- ${item.checker_target ? '' : 'YOUR FILE is a research artifact (an ADR draft), not a lore artifact: skip the checker below and report checker_clean true. '}After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research ${item.checker_target}  and fix any finding it reports in YOUR FILE (a finding in another file is not yours; report it in refused with the path). Then report the file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. line ${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.file.split('/').slice(-2).join('/')}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
