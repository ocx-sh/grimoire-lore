export const meta = {
  name: 'nix-fix-2',
  description: 'Nix research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/.agents/research/nix-generated-flakes/prototype/README.md",
  "model": "sonnet",
  "checker_target": "",
  "findings": [
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": ".agents/research/nix-generated-flakes/prototype/README.md",
    "line": 3,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The README opens with 'the three Verdict-10 breaks are fixed' and lists every check as green, but never states the known breaks. That hides the seven breaks E34 and Authoring notes item 12 require ocx to fix, plus three more measured here. (8, K5) lib/mk-package.nix:23 `getLicenseFromSpdxIdOr id null` silently drops unmapped SPDX ids: corretto ends with no license. (9, K5) lib/mk-package.nix:63 hardcodes `repo = \"ocx-contrib/${ns}/${pkg}\"` instead of reading the repository from the data file. (10) data.json keeps 1 of actionlint's 13 unique digests (index@9eba2cc3929b p/actionlint/actionlint.json), against GEN-03 and GEN-17's keep-every-digest. Separately, the probe `--set A x --set B ''\"$A\"/y` shows the self.env break is live.",
    "fix": "Insert after line 1: '## Known breaks (evidence, not a reference)\\n\\nFix all ten before adoption: 1 NIX-GEN-20 `${self.env.KEY}` spliced as `\"$KEY\"` (lib/mk-ocx-env.nix); 2 NIX-GEN-20 first-token-only `renderChunk` ships `${deps.\u2026}` literally; 3 NIX-GEN-21 synthesised description, no homepage; 4 NIX-GEN-22 `entrypoints`/`dependencies` silently ignored; 5 NIX-PKG-11 `unpackPhase`/`installPhase` without `runHook` (lib/mk-package.nix:67,80); 6 NIX-GATE-01 bare `nixfmt` formatter; 7 NIX-INP-03 rev in `url` with no frozen-on-purpose comment; 8 NIX-GEN-14 unmapped SPDX ids dropped (lib/mk-package.nix:23, use `{ spdxId = id; shortName = id; }`); 9 registry repository hardcoded to `ocx-contrib` (lib/mk-package.nix:63); 10 data.json is a sample: 1 of 13 actionlint digests (NIX-GEN-03, NIX-GEN-17).'"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/flakes.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/flakes.md",
    "line": 62,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "K1 confirmed and widened. NIX-FLK-02 (MUST) says the first argument is 'literally final' and implies gate step 4 enforces a curried lambda. Measured 2026-09-27, gate step 4 verbatim: CppNix 2.35.2 and 2.31.5 exit 0 on final: _prev:, _final: prev:, _final: _prev: and _: _:, and exit 1 ('overlay does not take an argument named final') on self: super:, prev: final:, { final, prev }: and _x: prev:. CppNix checks only the first name. It also exits 0 on final: super: and on a one-argument final: { x = 1; }. Lix 2.95.2 rejects the one-argument form ('overlay is not a function with two arguments, but only takes one') and formals, and accepts the rest. The rule forbids NIX-PKG-21's compliant _final: prev: and misstates what CppNix enforces.",
    "fix": "Rule cell: 'Write every exported overlay as a curried two-argument lambda with no formals. Name the first argument final (_final when unused) and the second prev (_prev when unused): final: prev: { \u2026 }. Never self: super:, prev: final: or { final, prev }:. The _ prefix on an unused argument keeps deadnix --no-lambda-pattern-names green (NIX-GATE-05).' Append to the Verification cell: 'Watched 2026-09-27 on CppNix 2.35.2 and 2.31.5: exit 0 on final: _prev:, _final: prev: and _final: _prev:, exit 1 on the three forbidden spellings. CppNix checks the first name only. It also passes final: super: and a one-argument final: { \u2026 }, which Lix 2.95.2 rejects, so review holds the second name and the Lix leg holds the arity.' Floor cell: 'CppNix \u22652.31.5 checks the first argument name only. Lix 2.95.2 catches formals and one-argument overlays only, so the grep and NIX-FLK-19 carry the names there'."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/flakes.md",
    "line": 56,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K2, second copy. NIX-FLK-19 (MUST) is verified through 'nix shell nixpkgs#nixVersions.nix_2_31', which is the global-registry nixpkgs and a hardcoded nix_2_31. The index's step 9 takes the floor from the locked nixpkgs, and Q8 says the floor is computed and never hardcoded. The locked form was watched working (see the index finding).",
    "fix": "Line 56: 'nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false .   # FLK-19 on a Lix host, exit 0 = pass, nix_2_31 replaced by gate step 9 floor element'."
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/flakes.md",
    "line": 86,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The FLK-07 pre-check grep misses the rule's own third example and the finalAttrs spelling. Cold-store fixtures, measured 2026-09-27 on CppNix 2.35.2: readFile \"${builtins.path { path = self; name = \"x-src\"; }}/data.txt\" is red on gate step 4 ('path /nix/store/\u2026-x-src is not valid') but grep exits 1. readFile \"${finalAttrs.src}/data.txt\" with a builtins.path src is red on step 4, grep exits 1. The reverse also happens: \"${src}/data.txt\" with src = self is green on step 4 while grep hits. The proposed grep was watched hitting all four candidate forms and passing the ./data.txt twin (exit 1). On the corpus it adds only reading candidates: llm-agents.nix@efb10f28f724 packages/herdr/package.nix:35 is a build-time src and passes on reading.",
    "fix": "Line 86: \"grep -rn --include='*.nix' -e '\\\"${[A-Za-z_.]*src}/' -e '\\\"${builtins.path' .   # FLK-07 pre-check, empty = pass, read each hit\". In the NIX-FLK-07 Verification cell (line 94), replace 'The grep misses reads hidden inside a builder, so (a) is authoritative.' with 'A hit whose src is self itself evaluates green. The grep misses reads hidden inside a builder, so (a) is authoritative.'"
   },
   {
    "set": "index-flakes-inputs: rules/nix-quality.md, rules/nix-quality/flakes.md, rules/nix-quality/inputs.md",
    "file": "rules/nix-quality/flakes.md",
    "line": 44,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The blanket statement 'Every grep here except the FLK-11 site count is a violation locator: empty output (exit 1) is the pass' is false for three checks. The FLK-04 and FLK-12 counts print 0 on the pass (grep -c, measured: 0 and 3). A FLK-09 hit is legitimate on nixos-26.05 and is read with the jq line. This breaks NIX-CORE-03 for those rows.",
    "fix": "Replace lines 44-45 with: 'Every grep here except the FLK-11 site count, the FLK-04 and FLK-12 counts (`0` is the pass) and the FLK-09 grep (read with its jq line) is a violation locator: empty output (exit 1) is the pass, a hit (exit 0) is the finding.'"
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 62,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "K1 confirmed and sharpened. NIX-FLK-02 says the first overlay argument is 'literally final' and the second is `_prev` when unused. On CppNix 2.35.2 and 2.31.5, `nix flake check --no-build` exits 0 for `final: prev:`, `final: _prev:`, `_final: prev:`, `_final: _prev:`, `final: _:`, `_: prev:`, `final: super:`, `final: p:` and `final: prev: _x:`. It exits 1 with `overlay does not take an argument named 'final'` only for `self: super:`, `prev: final:`, `{ final, prev }:`, `f: p:`, `_foo: prev:` and `finalx: prev:`. So checkOverlay accepts final, _final or _ as the first name and never checks the second. Lix 2.95.2 rejects only formals and a three-argument overlay (fixtures planted/k1, logs cpp2352.log and other-impls.log). The overstrict text conflicts with a second MUST on a held-out tree. At ryantm/agenix@654f73179924:overlay.nix:1, `final: prev:` leaves `final` unused. deadnix -L reports `Unused lambda argument: final`, and NIX-GATE-05 prescribes the `_` prefix, which yields `_final: prev:`, the form NIX-FLK-02 forbids. Compliant real overlays also break the text: ipetkov/crane@73b980519cef:flake.nix:60 `_final: _prev:` and nix-community/nh@b6869cdf9860:flake.nix:27 `final: _:`. Class C22 (rule text inferred from an error string, not from the accepted forms) plus the proposed C27.",
    "fix": "Replace the NIX-FLK-02 Rule cell with: \"Write every exported overlay as a curried two-argument lambda with no formals whose first argument is named `final`, or `_final` or `_` when it is unused: `final: prev: { \u2026 }`. Never `self: super:`, `prev: final:` or `{ final, prev }:`. Name the second argument `prev`, or `_prev` or `_` when it is unused (deadnix `--no-lambda-pattern-names`, NIX-GATE-05); CppNix does not check the second name.\" Replace the Rationale cell's first sentence with: \"`checkOverlay` accepts a first argument named `final`, `_final` or `_` and rejects any other name and any formals with `error: overlay does not take an argument named 'final'`. It never checks the second argument (`final: super:` exits 0).\" Append to the Verification cell: \"Watched 2026-09-27 on CppNix 2.35.2 and 2.31.5: exit 0 for `final: prev:`, `final: _prev:`, `_final: prev:`, `_final: _prev:`, `final: _:`, `_: prev:`, `final: super:`; exit 1 for `self: super:`, `prev: final:`, `{ final, prev }:`, `f: p:`, `_foo: prev:`, `finalx: prev:`.\" Floor cell: replace \"Lix 2.95.2 catches only the formals form\" with \"Lix 2.95.2 checks arity only: it rejects formals and a three-argument overlay and passes every name\". The nix-flake-adopt skill's claim that `_final` breaks NIX-FLK-02 must be struck to match."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 116,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The FLK-08 grep keys on names, not on the property. False positives: ipetkov/crane@73b980519cef:flake.nix:51,130, a local `eachDefaultSystem = eachSystem [ \"aarch64-linux\" \"aarch64-darwin\" \"x86_64-linux\" ]`, which is compliant. nix-community/stylix@fb28acd59e2a:flake.nix:12 and flake/dev/flake.nix:130, plus nix-vscode-extensions@329083cd32e0:haskell/flake.nix:6 and nix-dev/flake.nix:8, use `github:nix-systems/default/future-26.11`, whose raw default.nix is [aarch64-darwin, aarch64-linux, x86_64-linux]. False negative on a held-out tree: nix-community/nh@b6869cdf9860:flake.nix:14 `supportedSystems = lib.systems.doubles.linux ++ lib.systems.doubles.darwin`. Gate step 5 (github:nix-community/nh/b6869cdf\u2026) exits 1 with `Refusing to evaluate package 'nh-4.4.2-b6869cd' \u2026 hostPlatform.system = \"arc-linux\"`. The narrowed grep leaves crane's root flake.nix clean (exit 1) and prints stylix only for the commented line 23. It now hits nh and keeps direnv, ghostty and impermanence. Classes: proposed C26, and C2 for the false negative.",
    "fix": "Line 116: grep -rnE --include='*.nix' -e 'flake-utils' -e 'flakeExposed' -e 'systems\\.doubles' -e 'nix-systems/default\"' .   # FLK-08, empty = pass\nIn the NIX-FLK-08 Rule cell, after \"never iterate `lib.systems.flakeExposed`\", insert \"or `lib.systems.doubles.*`\". Append to the Verification cell: \"`nix-systems/default/future-26.11` and `default-linux` carry no `x86_64-darwin` and pass; a local helper named `eachDefaultSystem` over a literal list passes.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 134,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The FLK-12 pre-check matches `nixpkgs.system`, the NixOS and nix-darwin module option, because `nixpkgs.system` contains `pkgs.system`. Hits: home-manager@7b4c5ec4beda:modules/modules.nix:114 (`nixpkgs.system = lib.mkDefault pkgs.stdenv.hostPlatform.system;`, which is itself the compliant read), nix-darwin@4cff07de74b5:flake.nix:32 and default.nix:15, and 8 lines in NixOS/nixpkgs. The left-anchored form prints nothing (exit 1) on home-manager and nix-darwin and still hits every true positive: devenv@6d76db3889de:src/modules/integrations/android.nix:80, NixOS/nix@209d2bc44288:tests/nixos/default.nix:44,58, nix-vscode-extensions overlay.nix:232 and microvm@68f2670367e0:nixos-modules/microvm/options.nix:698. Proposed class C26.",
    "fix": "Line 134: grep -rnE --include='*.nix' -e '(^|[^[:alnum:]_.-])pkgs\\.system([^[:alnum:]_-]|$)' .   # FLK-12 pre-check, empty = pass\nNIX-FLK-12 Verification cell: replace \"It skips `pkgs.systemd`.\" with \"It skips `pkgs.systemd` and the `nixpkgs.system` module option.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 118,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The FLK-09 branch jq `.nodes.nixpkgs.original.ref // .nodes.nixpkgs.locked.rev` prints a bare rev for every URL-typed nixpkgs, so the branch (unstable, 26.11 or 26.05) cannot be read. Affected: 10 of 43 locks, including home-manager@7b4c5ec4beda (channels nixpkgs-unstable .tar.zst), NixOS/nix@209d2bc44288 (nixos-26.05 .tar.xz, where x86_64-darwin is allowed), nh, nixd and nixos-hardware (nixos-unstable .tar.xz), flake-checker and dev-templates (FlakeHub), direnv (github with no ref), and ghostty. On home-manager, the FLK-09 grep hit flake.nix:57 is `lib.remove \"x86_64-darwin\" \u2026flakeExposed`, a compliant removal. It still reads as 'hit + unstable'. The widened jq prints the URL, `no ref: the default branch` or `no nixpkgs node` (crane). Class C9.",
    "fix": "Line 118: jq -r 'if .nodes.nixpkgs then .nodes.nixpkgs.original | .ref // .url // .rev // \"no ref: the default branch\" else \"no nixpkgs node\" end' flake.lock   # FLK-09, the nixpkgs branch (a channel URL names it)\nNIX-FLK-09 Verification cell: append \"A hit that removes the system (`lib.remove \\\"x86_64-darwin\\\"`) passes.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 44,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The preamble says every grep except the FLK-11 count is a violation locator where 'a hit (exit 0) is the finding'. The FLK-07 grep is documented as a candidate locator ('read each hit'), and the FLK-09 grep is read with its jq line. On home-manager@7b4c5ec4beda the FLK-07 grep prints 46 lines, for example tests/modules/programs/claude-code/skills-store-path.nix:13, and every one is a string that reaches a builder, which passes per NIX-LANG-02. A literal reader counts them as 46 findings. Proposed class C26.",
    "fix": "Replace line 44's first sentence with: \"Every grep here except the FLK-07 candidate grep (read each hit), the FLK-09 grep (read with its jq line) and the FLK-11 site count is a violation locator: empty output (exit 1) is the pass, a hit (exit 0) is the finding.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/flakes.md",
    "line": 94,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "New instances of C3 on real trees. Gate step 4 by remote ref exits 1 with `path '/nix/store/\u2026-dev' is not valid` on hercules-ci/flake-parts@31729ca8cbdb, which reads `${./dev}` through extras/partitions.nix (partitions.dev.extraInputs). The FLK-07 grep misses it. It also exits 1 with `path '/nix/store/\u2026-source' is not valid` on sxyazi/yazi@0ea4c5d9ef75:nix/yazi-unwrapped.nix:32. The grep true positive ipetkov/crane@73b980519cef:checks/vendorGitSubset.nix:12 `builtins.readFile \"${src}/Cargo.lock\"` has `src = ./git-overlapping`. A planted twin showed a path-literal interpolation `readFile \"${./sub}/data\"` red on a cold store and `readFile ./sub/data` green (planted/flk07). The rule's example list names only `${src}` and `builtins.path { path = self; }`.",
    "fix": "NIX-FLK-07 Rule cell: after \"`readFile \\\"${builtins.path { path = self; }}/x\\\"`\" insert \", or `readFile \\\"${./sub}/x\\\"` on a path literal\". Add to Applied: hercules-ci/flake-parts@31729ca8cbdb violates NIX-FLK-07 at extras/partitions.nix (`${./dev}` partition read; gate step 4 red, grep silent). Add to Applied: sxyazi/yazi@0ea4c5d9ef75 violates NIX-FLK-07 at nix/yazi-unwrapped.nix:32. Add to Applied: ipetkov/crane@73b980519cef violates NIX-FLK-07 at checks/vendorGitSubset.nix:12."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/generated-flakes.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 162,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "NIX-GEN-14's prescribed mapping is wrong for every unmapped id. The reader builds a license LIST, and nixpkgs check-meta.nix reads a list element with no `free` attribute as unfree (`any (l: !l.free or false) licenses`). So `getLicenseFromSpdxIdOr id { spdxId = id; shortName = id; }` makes any package with an unmapped id (PSF-2.0, or corretto's `GPL-2.0-only WITH Classpath-exception-2.0`) unfree. Measured on a copy of the handoff prototype with line 23 changed to the GEN-14 mapping: gate step 4 exits 1 with `Refusing to evaluate package 'amazon-corretto-21.0.9' ... because it has an unfree license (\u2018GPL-2.0-only WITH Classpath-exception-2.0\u2019)`, while the GEN-14 license check still exits 0. The rationale also has it backwards. The raw `getLicenseFromSpdxId` fallback returns a single `{ shortName; spdxId; }` attrset, which check-meta reads as free (`!(licenses.free or true)`), not unfree. That was verified by reading nixpkgs 8d5d2709 lib/meta.nix:432-439 and check-meta.nix:120-135. The prototype passes the gate only because it drops unmapped ids silently (K5).",
    "fix": "Rule cell: replace \"The reader maps each with `lib.getLicenseFromSpdxIdOr id { spdxId = id; shortName = id; }`.\" with \"The generator also records, per id, whether the SPDX license list marks it (for `X WITH Y`, its base `X`) OSI-approved or FSF-libre, and the reader maps each with `lib.getLicenseFromSpdxIdOr id { spdxId = id; shortName = id; free = entry.licenseFree.${id}; }`. Never drop an unmapped id.\" Rationale cell: replace \"and the unknown-id fallback is `unfree`, which refuses the build.\" with \"and a fallback with no `free` attribute inside a license list is read as unfree by nixpkgs' check-meta (`any (l: !l.free or false)`), so the package is refused (`Refusing to evaluate \u2026 because it has an unfree license`), while the raw call's single-attrset fallback is read as free.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 162,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "NIX-GEN-14's verification (the abort-on-warn license eval) passes, exit 0, on two readers that break the rule. The first drops unmapped ids (the prototype's `getLicenseFromSpdxIdOr id null` plus a null filter). The second uses a fallback with no `free`, which gate step 4 rejects with exit 1. Both were planted as meta-drop and meta-green under the fixture dir, and the check exited 0 on each. Separately, the cell's \"Same on CppNix 2.31.5 and Lix 2.95.2\" misquotes Lix. The exit codes match (red 1, green 0), but Lix 2.95.2 prints `error: evaluation aborted (abort-on-warn)`, not `aborting to reveal stack trace of warning` (C20).",
    "fix": "In the Verification cell, replace \"Same on CppNix 2.31.5 and Lix 2.95.2.\" with \"Same exit codes on CppNix 2.31.5 (same message) and Lix 2.95.2 (`error: evaluation aborted (abort-on-warn)`). Gate step 4 is the check for an unmapped id: watched red, a list fallback without `free`, exit 1 with `Refusing to evaluate \u2026 unfree license (\u2018PSF-2.0\u2019)`; green with `free` set, exit 0. A reader that drops unmapped ids passes both: `grep -rn -e 'getLicenseFromSpdxIdOr [a-z]* null' --include='*.nix' .` locates it, empty output (exit 1) the pass, watched red on the prototype's `lib/mk-package.nix:23`.\" Add that grep to the code block under The Prebuilt Template and Its Meta."
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 194,
    "severity": "blocker",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-GEN-02 grep adds `--include='*.rs'`, which the consolidation's command does not have, and line 202 says to run it over the generator's source. GEN-02 requires the generator to reuse the client's platform relation, and that relation's source matches the pattern. On ocx@2691d3c1638e it prints 474 lines under `crates/`, for example `crates/ocx_oci/src/platform.rs:129` (`os_features`). The compliant state is red, so the check cannot go green (C4).",
    "fix": "Replace line 194 with: grep -rn -e 'os.features' -e 'os_features' -e 'libc.glibc' --include='*.nix' --include='*.py' --include='*.sh' . and in the NIX-GEN-02 Verification cell change \"The first grep.\" to \"The first grep, run in the flake repository only (the client that owns the relation legitimately matches it).\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 202,
    "severity": "blocker",
    "kind": "false-positive-on-real-tree",
    "finding": "\"Run the greps in the flake repository and the generator's source\" makes the NIX-GEN-21 grep (which includes '*.rs') red on a compliant generator hosted in the index client. On ocx@2691d3c1638e it hits the vendored `external/rust-oci-client/src/annotations.rs:9,13,27` (the `org.opencontainers.image.{url,source,description}` constants) and test files, 25 lines outside worktrees. The prototype, which is non-compliant, is empty (exit 1).",
    "fix": "Replace the sentence with: \"Run the greps in the flake repository. Run the `image\\.` grep also over the generator subcommand's own source files (ocx: the `index nix` command module), never over the client's whole tree, which defines the annotation constants and the platform relation legitimately.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 35,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "\"A flake of shape A that adds a prebuilt `-bin` package takes NIX-GEN-12 to 14\" (consolidation Verdict 9) conflicts with the Severity cells of NIX-GEN-09 (line 104) and NIX-GEN-10 (line 105), which bind \"D and any prebuilt fetch\". The two rows give different answers to whether GEN-09 and GEN-10 bind an A flake's -bin fetch. GEN-09's text (\"the OCI layer digest verbatim\") cannot apply to a non-OCI A fetch.",
    "fix": "Line 104 Severity: \"MUST (D)\". Line 105 Severity: \"MUST (D)\"."
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 54,
    "severity": "blocker",
    "kind": "era-unlabelled",
    "finding": "NIX-GEN-01 quotes `access to absolute path '/tmp/index/data.json' is forbidden in pure evaluation mode`, and its Floor cell names CppNix 2.35.2 and Lix 2.95.2, with no per-implementation split. Measured on the same fixture: CppNix 2.35.2 prints that string. CppNix 2.31.5 prints `access to absolute path '/tmp' is forbidden in pure evaluation mode` (the first component, not the file). Lix 2.95.2 prints `... is forbidden in pure eval mode`. This is the C20 split flagged in K4.",
    "fix": "In the Verification cell, replace \"and `access to absolute path '/tmp/index/data.json' is forbidden in pure evaluation mode`, exit 1.\" with \"and an absolute-path read, exit 1 on all three (CppNix 2.35.2: `access to absolute path '/tmp/index/data.json' is forbidden in pure evaluation mode`; CppNix 2.31.5 names only `'/tmp'`; Lix 2.95.2: `\u2026 is forbidden in pure eval mode`).\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 212,
    "severity": "fix",
    "kind": "style",
    "finding": "The shape binding in the Severity cells disagrees with the \"Which rows bind you\" bullet (line 35), which says a non-OCI D flake skips NIX-GEN-02, 04, 05 and 16. The cells for 02 (line 212), 04 (214), 05 (215) and 16 (232) say only \"(D, generator)\" or \"(D)\". Authoring note 13 requires the Severity cell to state the shape binding.",
    "fix": "Line 212, 214, 215 Severity: \"MUST (D, OCI index generator)\". Line 232 Severity: \"SHOULD (D, OCI index)\"."
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 152,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The cells claim `false` and exit 1 for every `jq -e` pipeline. When `nix eval` itself throws, jq reads no input and the pipeline exits 4. Measured on the GEN-07 line with a flat overlay: `attribute 'lib' missing` gives pipeline exit 4, not the \"exit 1\" line 72 claims. NIX-CORE-03 requires each exit code to be stated.",
    "fix": "Line 152: replace \"and fails with `false` and exit 1.\" with \"and fails with `false` and exit 1, or with exit 4 when the `nix eval` before it errors and jq reads nothing.\" Line 72: replace \"a flat overlay throws (`attribute 'lib' missing`), exit 1\" with \"a flat overlay throws (`attribute 'lib' missing`), pipeline exit 4\"."
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 55,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "\"Users must quote the version\" leaves out that the shell strips those quotes. Measured: `nix eval .#legacyPackages.x86_64-linux.actionlint.actionlint.\"1.7.12\"` typed unquoted in bash fails with `does not provide attribute '\u2026actionlint.1.7.12'`. Only the single-quoted installable works.",
    "fix": "Replace \"Users must quote the version: unquoted `#kitware.cmake.4.4.2` fails with `does not provide attribute`.\" with \"Users must quote the version inside a single-quoted installable, `'\u2026#kitware.cmake.\"4.4.2\"'`, because the shell strips bare double quotes and `#kitware.cmake.4.4.2` fails with `does not provide attribute`.\""
   },
   {
    "set": "generated-flakes + modules + ocx ADR (rules/nix-quality/generated-flakes.md, rules/nix-quality/modules.md, .agents/research/nix-generated-flakes/adr_nix_flake_generation.md)",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 36,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "NIX-PKG-03 (MUST, every shape) says to take a hash from nurl or nix-prefetch-*, and NIX-GEN-09 says never prefetch. The Precedence bullet does not resolve which row governs D's layer hash.",
    "fix": "Append to the Precedence bullet: \"NIX-GEN-09 replaces NIX-PKG-03's hash source for a D layer: the digest comes from the manifest, never from a prefetch.\""
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 180,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-GEN-20 mixedToken check counts 'exit 1' as the pass. On the prototype, which has no `mixedToken` attribute, the command exits 1 with `does not provide attribute`, so an agent reading exit codes records a pass. Yet the prototype's renderer ships the second token literally. Probed: `--prefix P : ''\"$installPath\"'/bin:${deps.cmake.installPath}/bin'`, exit 0. The check cannot tell a correct throw from a missing fixture. Class C4.",
    "fix": "Replace line 180 with `nix eval .#legacyPackages.x86_64-linux.mixedToken 2>&1 | grep -F -e 'unsupported ocx token'`. Replace lines 183-184 with: 'Each `grep -Fqx` passes with exit 0. So does the last line, whose grep finds the reader'\\''s `unsupported ocx token` throw. Exit 1 on the last line is the finding: either a value printed, or `does not provide attribute` because the test value is missing.' In NIX-GEN-20's Verification cell, add 'Watched red: the prototype, which lacks `mixedToken`, exit 1. Watched green: a twin whose `mixedToken` throws, exit 0.'"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 146,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "K5 confirmed. The NIX-GEN-14 check only detects warnings. The prototype maps licenses with `lib.getLicenseFromSpdxIdOr id null` and filters nulls (lib/mk-package.nix:23), so corretto's present annotation `GPL-2.0-only WITH Classpath-exception-2.0` is dropped silently: `meta.license` is null, and the abort-on-warn line exits 0. The rule says a missing annotation omits the license, not that an unmapped one does. Class C13.",
    "fix": "After line 146 add:\n```sh\nnix eval --json .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: p.meta.license or null) ps' > license.json\njq -e --slurpfile m license.json '[to_entries[] as $ns | $ns.value | to_entries[] as $p | $p.value.versions[$p.value.latest] | select(.platforms[\"x86_64-linux\"]) | {k: \"\\($ns.key)-\\($p.key)\", has: ((.licenses // []) | length > 0)}] | all(.has == ($m[0][.k] != null))' data.json\n```\nAppend to NIX-GEN-14's Verification cell: 'Then the presence pair: `true`, exit 0, is the pass. `false`, exit 1, names a package whose annotation was dropped. Watched red: `getLicenseFromSpdxIdOr id null` dropped corretto'\\''s `WITH` expression while the warning line exited 0. Watched green: the `{ spdxId = id; shortName = id; }` fallback.'"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 221,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-GEN-16 locator keys on the literal text `git push`. oxalica/rust-overlay@4e9bb05a9ab6, a generated flake with committed manifests and a CI updater, pushes to master through `ad-m/github-push-action@master` (.github/workflows/sync-channels.yaml:87, update-stable.yaml:47) and is not printed. The same check appears in nix-flake-release/SKILL.md:434. Class C4.",
    "fix": "Line 221 (and nix-flake-release/SKILL.md line 434) becomes `grep -rl -e 'git push' -e 'github-push-action' -e 'git-auto-commit-action' -e 'add-and-commit' .github/workflows | xargs -r grep -L -e 'create-pull-request' -e 'create-pr'`. Add to GEN-16's Verification cell: 'Watched red: rust-overlay'\\''s `ad-m/github-push-action` workflows printed. Watched green: nixpkgs-terraform'\\''s `peter-evans/create-pull-request`, nothing printed.'"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 35,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The binding note exempts non-OCI generated flakes from NIX-GEN-16, but its rationale ('third-party binaries that consumers trust unseen') applies to them unchanged. 5 of 6 non-OCI generated flakes in the corpus push updates unreviewed to the default branch: zig-overlay@95d96b17b711 .github/workflows/update.yml:31, nix-index-database@9ad722673ab3 .github/workflows/update.yml:24 and :168, fenix@5f7e7d793cb2 .github/workflows/update.yml:31, rust-overlay@4e9bb05a9ab6 .github/workflows/sync-channels.yaml:87, nix-vscode-extensions@329083cd32e0 .github/workflows/ci.yaml:129. Only nixpkgs-terraform opens a PR. The scope line makes the check silent on every one of them. Class C15.",
    "fix": "In line 35, replace 'and skips NIX-GEN-02, 04, 05, 08, 16, 20 and 22, which exist for OCI registries and ocx metadata' with 'and skips NIX-GEN-02, 04, 05, 08, 20 and 22, which exist for OCI registries and ocx metadata. NIX-GEN-16 binds every generated flake: an updater that commits third-party hashes ships binaries consumers trust unseen, whatever the source'."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 60,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-GEN-07 check only reads attribute names. zig-overlay@95d96b17b711 flake.nix:39-41 defines `overlays.default = final: prev: { zigpkgs = self.packages.${prev.stdenv.hostPlatform.system}; }`. With the namespace substituted the check prints true, exit 0, but the tree comes from the flake's own nixpkgs, not the consumer's final, which violates GEN-07's 'built against final'. A probe that extends a coreutils-marked nixpkgs printed 'NOT built against final' for zig-overlay (pure getFlake of the locked ref) and 'built against final' for the prototype. Class C25.",
    "fix": "Add after line 62:\n```sh\nnix eval --impure --expr 'let f = builtins.getFlake (toString ./.); p = f.inputs.nixpkgs.legacyPackages.x86_64-linux; marked = p.extend (_: prev: { coreutils = prev.coreutils.overrideAttrs { NIX_MARKER = \"1\"; }; }); get = pkgs: (pkgs.extend f.overlays.default).ocx.ninja-build.ninja.\"1.13.2\"; in (get p).drvPath != (get marked).drvPath'\n```\nAdd to the prose: 'It prints `true` when the overlay tree is built against `final`. `false` is the finding.' Add to GEN-07's Verification cell: 'Built-against-final twin: `true` on the prototype. zig-overlay'\\''s `self.packages` overlay gives `false`.'"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 202,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The text says to run the greps 'in the flake repository and the generator's source'. Under the file's own pinned default the generator is a subcommand of the index client, so GEN-02's grep hits the relation the rule says to reuse: ocx@2691d3c1638e gives 1,142 hits, 196 of them in crates/ocx_oci/src/platform.rs. GEN-21's grep hits ocx's own annotation-writing code (crates/ocx_cli/src/command/package_push.rs, 11 hits). GEN-21's `image\\.source` also matches ordinary identifiers: zed@bda9c0bd43a8 has 25 hits such as crates/anthropic/src/completion.rs:217 `image.source.to_string()`, and typst has 1. Classes: self-hit and lexical homograph (new).",
    "fix": "Line 199 becomes `grep -rn -F -e 'org.opencontainers.image.description' -e 'org.opencontainers.image.url' -e 'org.opencontainers.image.source' --include='*.nix' --include='*.py' --include='*.rs' --include='*.sh' .`. Replace line 202's first sentence with: 'Run the GEN-02 and GEN-21 greps in the flake repository, and in a standalone generator script. In the index client'\\''s own source (the pinned default) they hit the relation and annotation constants the rule tells you to reuse, so there the check is the reading heuristic: the generator subcommand calls the client'\\''s relation and reads `meta` from the package record. A hit that sets a label on an image the repository builds (`dockerTools` `config.Labels`) is not a finding.' Watched: the -F form hits 0 lines on zed and typst and fires on a planted `a.get(\"org.opencontainers.image.source\")` in gen.rs."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "rules/nix-quality/generated-flakes.md",
    "line": 218,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Authoring notes item 14 requires the held-out breaks to be recorded as Applied evidence rows, and the depth file has no Applied rows for them. These are true positives found by this round's cells, each a new instance of a known class.",
    "fix": "Add an '## Applied' section before 'What Agents Get Wrong Here' with these rows: add to Applied: mitchellh/zig-overlay@95d96b17b711 violates NIX-GEN-06 at flake.nix:35 (C1; gate step 4 by remote ref: `flake attribute 'packages.aarch64-darwin.brew' is not a derivation`, exit 1); add to Applied: mitchellh/zig-overlay@95d96b17b711 violates NIX-GEN-07 at flake.nix:39 (C25; overlay returns `self.packages`, not built against final); add to Applied: NIX-GEN-16 (C15) at zig-overlay .github/workflows/update.yml:31, nix-community/nix-index-database@9ad722673ab3 .github/workflows/update.yml:24, nix-community/fenix@5f7e7d793cb2 .github/workflows/update.yml:31, oxalica/rust-overlay@4e9bb05a9ab6 .github/workflows/sync-channels.yaml:87, nix-community/nix-vscode-extensions@329083cd32e0 .github/workflows/ci.yaml:129; add to Applied: NIX-GEN-17 (C13, unsorted keys, `jq -S . F | cmp - F` exit 1) at zig-overlay sources.json:2, stackbuilders/nixpkgs-terraform@a5893ca82ec3 versions.json:2, fenix data/stable.json:2, nix-vscode-extensions data/cache/open-vsx-latest.json:1. No held-out repo is shape D, and the GEN greps found no GEN violation in the 8 held-out trees."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/language.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/language.md",
    "line": 68,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Authoring notes item 8 requires every rule row to keep a Floor / impl cell. All six language.md tables (header lines 68, 108, 140, 155, 168, 183) have five columns and fold the implementation into Severity. gates.md and security.md comply.",
    "fix": "Add a `Floor / impl` header and a `|---|` separator to the tables at lines 68, 108, 140, 155, 168 and 183. Move the implementation text out of each Severity cell into the new cell, leaving the tier and shapes in Severity. LANG-01: `all implementations, deadnix \u22651.1 (measured on 1.3.2), CppNix 2.35.2 and 2.31.5`. LANG-02: `all implementations, sandbox on, CppNix 2.35.2 and 2.31.5`. LANG-03: `CppNix 2.35.2`. LANG-04: `flakes (pure by default), CppNix 2.35.2 and 2.31.5`. LANG-07: `any`. LANG-05: `Lix \u22652.95 rejects, CppNix through 2.35.2 accepts (re-check at each Lix release)`. LANG-06: `CppNix 2.35.2, 2.31.5 and Lix 2.95.2 alike`. LANG-11: `CppNix 2.35.2 and 2.31.5`. LANG-08: `n/a, exists because of version drift`. LANG-10: `all implementations, the (b) hint needs nixpkgs 26.11pre or later`."
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/language.md",
    "line": 185,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "K4 confirmed. NIX-LANG-08 attributes `points outside of its parent's store path` to version 2.20 alone. Lix 2.95.2 prints `error: relative path '../b' points outside of its parent's store path '/nix/store/\u2026-source'` today for a `path:../b` input, while CppNix 2.35.2 and 2.31.5 print `access to absolute path '/nix/store/b\u2026' is forbidden in pure evaluation mode`. A row quoting that error must carry the implementation split.",
    "fix": "In the NIX-LANG-08 Rationale cell, replace \"`points outside of its parent's store path` (2.20) against `access to absolute path \u2026 is forbidden` (2.31 and later)\" with \"`points outside of its parent's store path` (CppNix 2.20, and Lix 2.95.2 today) against `access to absolute path \u2026 is forbidden` (CppNix 2.31 and later)\"."
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/language.md",
    "line": 193,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "What Agents Get Wrong item 4 says the string \"is gone from 2.31 on, and Lix prints other text\". Lix 2.95.2 prints exactly that string (K4, reproduced). An agent that reads it as \"old Nix\" misdiagnoses a Lix error.",
    "fix": "Replace \"`points outside of its parent's store path` is gone from 2.31 on, and Lix prints other text or exits 0 (NIX-LANG-08).\" with \"`points outside of its parent's store path` is gone from CppNix 2.31 on, yet Lix 2.95.2 still prints it, and Lix exits 0 on some errors CppNix rejects (NIX-LANG-08).\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/language.md",
    "line": 148,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2. The Lix check uses the global-registry spelling `nix shell nixpkgs#lix`, which resolves to the latest nixpkgs-unstable Lix, not the locked 2.95.2 the row is dated against.",
    "fix": "Line 148: replace `nix shell nixpkgs#lix --command nix eval --file m1.nix` with `nix shell --inputs-from . nixpkgs#lix --command nix eval --file m1.nix`."
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/language.md",
    "line": 148,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The LANG-05 Lix command uses the global registry `nix shell nixpkgs#lix`, which resolves to `https://channels.nixos.org/nixpkgs-unstable/nixexprs.tar.zst`, a floating ref (C8). Both skills use the locked form `nix shell --inputs-from . nixpkgs#lix` (K2). Watched 2026-09-27 from a flake root: the locked form ran Lix 2.95.2 and exited 1 on `foo = rec { a = 1; }; foo.b = 2;`, exited 0 on the single-definition twin, and CppNix 2.35.2 exited 0 on the violation.",
    "fix": "Replace line 148 with `nix shell --inputs-from . nixpkgs#lix --command nix eval --file m1.nix` and after it add, in the paragraph below: `Run it from the flake root, so that \\`nixpkgs#lix\\` resolves to the locked nixpkgs, not the global registry.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/language.md",
    "line": 185,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The NIX-LANG-08 rationale and What Agents Get Wrong #4 (line 193) say `points outside of its parent's store path` is the 2.20 string, 'gone from 2.31 on', and that Lix 'prints other text'. On 2026-09-27, a `path:../sibling` input outside the flake's git tree printed three strings. Lix 2.95.2: `relative path '../sibling' points outside of its parent's store path '/nix/store/\u2026-source'`. CppNix 2.31.5: `access to absolute path '/nix/store/sibling' is forbidden in pure evaluation mode`. CppNix 2.35.2: `\u2026'/nix/store/sibling/flake.nix' is forbidden\u2026` (K4). Class C20.",
    "fix": "In the NIX-LANG-08 Rationale replace `\\`points outside of its parent's store path\\` (2.20) against \\`access to absolute path \u2026 is forbidden\\` (2.31 and later)` with `\\`points outside of its parent's store path\\` (CppNix 2.20 and Lix 2.95.2) against \\`access to absolute path \u2026 is forbidden\\` (CppNix 2.31 and later, naming \\`/nix/store/sibling\\` on 2.31.5 and \\`/nix/store/sibling/flake.nix\\` on 2.35.2)`. Replace item 4 of What Agents Get Wrong with `4. **Matching a remembered error string without the version.** \\`points outside of its parent's store path\\` is CppNix 2.20 and Lix 2.95.2, and CppNix 2.31 and later print \\`access to absolute path \u2026 is forbidden\\` for the same \\`path:../\\` input (NIX-LANG-08).`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/language.md",
    "line": 187,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The held-out round found new NIX-LANG instances. language.md has no Applied evidence section (item 14).",
    "fix": "Insert before `## What Agents Get Wrong Here` a section `## Applied Evidence (held-out round 2026-09-27)` with these lines: `- add to Applied: numtide/devshell@a67c0f87b63b violates NIX-LANG-04 at nix/mkNakedShell.nix:24 (builtins.getEnv \"IN_NIX_SHELL\" reachable from devShells through modules/devshell.nix:39, \"\" under pure evaluation, C9)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-LANG-07 at modules/age.nix:8 (file-scope with lib;, C4)`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/packaging.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 166,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The NIX-PKG-13 (MUST) rationale says the hook passes when an output contains `version` as a substring. That reads as the literal word 'version'. The consolidation and hook.sh match the package's version value ($version), and the row's own red shows it: `Did not find version 0.1.0`.",
    "fix": "Replace \"passes when either output contains `version` as a substring (`versionCheckHook/hook.sh`)\" with \"passes when either output contains the package's `version` value (for example `0.1.0`) as a substring (`versionCheckHook/hook.sh`)\""
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 202,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-PKG-15 pre-check pattern `builtins.path` also matches every `builtins.pathExists`. On the held-out corpus, all 3 stylix hits are pathExists (nix-community/stylix@fb28acd59e2a:stylix/autoload.nix:26), and so are 6 home-manager hits (nix-community/home-manager@7b4c5ec4beda:lib/nix/extract-maintainers.nix:33). The line calls itself a locator where empty output passes.",
    "fix": "Line 202 becomes: grep -rn -e 'lockFile = \"${' -e 'builtins\\.path[[:space:]]*{' --include='*.nix' .   # NIX-PKG-15 pre-check   and the NIX-PKG-15 Verification cell quotes the same two patterns. (Watched: planted `builtins.path { path = self; }` and the interpolated lockFile still hit with exit 0. stylix went to exit 1.)"
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 167,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-PKG-19 clap pre-check is line-oriented. It misses a rustfmt-style multi-line `#[command(` whose `version,` sits on its own line (watched: exit 1, which the cell says means 'the default will fail'), so an agent overrides a working default.",
    "fix": "Replace the pre-check command with `grep -rn -e '#\\[command(.*version' -e '#\\[clap(.*version' -e '^[[:space:]]*version[[:space:]]*[,)=]' -e '\\.version(' --include='*.rs' .` and append \"The third pattern catches `version,` on its own line inside a multi-line `#[command(\u2026)]`. Read each hit.\" (Watched: single-line and multi-line attributes exit 0, `#[command(name = \"ocx\")]` exit 1.)"
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 51,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Authoring notes item 8 says every rule row keeps a Floor / impl cell. packaging.md's seven tables have no such column. Floors are folded into Severity cells, and most name no implementation. flakes, gates, inputs, generated-flakes, modules, security and release all carry the column.",
    "fix": "In all seven tables, change the header to `| ID | Rule | Rationale | Verification | Severity | Floor / impl |` and the separator to `|---|---|---|---|---|---|`. In each row, move the text after ` Floor: ` at the end of the Severity cell (NIX-PKG-17: after ` Scope: `) into the new cell, without the word `Floor:`. Where the moved text names no implementation, prefix `CppNix 2.35.2, `."
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 82,
    "severity": "nit",
    "kind": "style",
    "finding": "The PKG-05 probe appends to README.md and reverts with `git checkout HEAD -- README.md`. In a repository with no tracked README.md, the revert fails and leaves a staged file.",
    "fix": "Line 82 becomes: echo x > drvpath-probe.txt && git add -A                # 2: an unrelated edit, reverted afterwards   and line 87's revert sentence becomes \"Revert step 2 with `git rm -q -f drvpath-probe.txt`.\""
   },
   {
    "set": "packaging-release (rules/nix-quality/packaging.md, rules/nix-quality/release.md)",
    "file": "rules/nix-quality/packaging.md",
    "line": 92,
    "severity": "nit",
    "kind": "style",
    "finding": "The pinned marker is written `**Pinned.**` (NIX-PKG-06, NIX-PKG-16), while the index and release.md use `**pinned**`.",
    "fix": "Replace `**Pinned.**` with `**pinned**` at lines 92 and 215."
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 53,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "NIX-PKG-01 says 'Never write `sha256 =`', and its grep fires on builtin fetchers, which accept only `sha256`. `builtins.fetchTarball { \u2026; hash = \u2026; }` fails with `error: unsupported argument 'hash' to 'fetchTarball'` (also 'fetchurl') on CppNix 2.35.2 and 2.31.5 and on Lix 2.95.2, measured 2026-09-27. An agent that follows the rule breaks evaluation. Real hits: helix@079a789e8cb0:shell.nix:5, zed@bda9c0bd43a8:default.nix:4, devshell@a67c0f87b63b:nix/nixpkgs.nix:7, crane@73b980519cef:checks/trunk.nix:20. The row exempts only 'a flake-compat shim's fetchTarball'. Class C26 (new).",
    "fix": "In the NIX-PKG-01 Rule cell replace `Spell every fetcher hash as SRI` with `Spell every nixpkgs fetcher hash (\\`fetchFromGitHub\\`, \\`fetchurl\\`, \\`fetchzip\\`, \u2026) as SRI`. In its Verification cell replace `A flake-compat shim's \\`fetchTarball\\` and files NIX-GATE-04 excludes are not findings.` with `A \\`sha256 =\\` inside \\`builtins.fetchTarball\\`, \\`builtins.fetchurl\\` or bare \\`fetchTarball\\` is not a finding: builtin fetchers reject \\`hash\\` (\\`unsupported argument 'hash' to 'fetchTarball'\\` on CppNix 2.31.5 and 2.35.2 and Lix 2.95.2, watched 2026-09-27), and whether a builtin may be used is NIX-INP-10. Files NIX-GATE-04 excludes are not findings.` In Not a Finding replace `- \\`fetchTarball\\` with a \\`sha256\\` inside a flake-compat \\`default.nix\\` shim.` with `- \\`sha256\\` inside any builtin fetcher call (\\`builtins.fetchTarball\\`, \\`builtins.fetchurl\\`), which rejects \\`hash\\`.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 84,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-PKG-06 grep `grep -rn -e '\\.\\./' --include='package.nix' .` matches `../` inside shell strings and comments (`cd ../..`, `--replace-fail '../../build'`, `@loader_path/../lib`, `# \u2026 ../dist`) and scans every nested package.nix, which the rule does not bind. It gives 1,184 hits on nixpkgs by-name, which nixpkgs-vet already holds to this rule, and 30 on llm-agents@efb10f28f724 (for example packages/opencode-desktop/package.nix:171 `cd ../..`). It also fires on a compliant plant (exit 0), and it never checks 'at the repository root'. Class C27 (new).",
    "fix": "Replace line 84 with two lines: `test -f package.nix                              # NIX-PKG-06: exit 1 = no root package.nix` and `grep -n -e '=[[:space:]]*\\.\\./' -e '([[:space:]]*\\.\\./' -e '\\[[[:space:]]*\\.\\./' -e 'import[[:space:]]*\\.\\./' -e 'callPackage[[:space:]]*\\.\\./' -e '^[[:space:]]*\\.\\./[^[:space:]]*$' -e '^\\./\\.\\./' -e '[^.]\\./\\.\\./' package.nix   # NIX-PKG-06`. In the NIX-PKG-06 Verification cell replace `The grep. Watched red on \\`nix/package.nix\\` with \\`root = ../.\\` (exit 0), green on a root \\`package.nix\\` (exit 1).` with `\\`test -f package.nix\\` (exit 1 is the finding), then the grep: empty (exit 1) passes, and a hit inside a \\`''\\` string or a comment is read and is not a finding. Watched 2026-09-27: \\`test\\` exit 1 on ghostty (only \\`nix/package.nix\\`), a grep hit on a root \\`package.nix\\` with \\`root = ../.\\`, and empty on a twin whose only \\`../\\` is \\`cd ../..\\` in \\`postInstall\\` and a comment. disko and nh are empty.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 202,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-PKG-15 pre-check alternative `-e 'builtins.path'` is an unanchored substring, so it also matches `builtins.pathExists`. At least 86 of about 135 non-nixpkgs hits are `pathExists` (for example crane@73b980519cef:lib/internalCrateNameForCleanSource.nix:16, stylix@fb28acd59e2a:stylix/autoload.nix:26). Class C27 (new).",
    "fix": "Replace line 202 with `grep -rn -e 'lockFile = \"${' -e 'builtins\\.path[[:space:]]*{' --include='*.nix' .   # NIX-PKG-15 pre-check`, and in the NIX-PKG-15 Verification cell append `The pre-check matches \\`builtins.path {\\`, not \\`builtins.pathExists\\`. Watched 2026-09-27: it hits \\`src = builtins.path { path = self; }\\` and \\`\"${src}/Cargo.lock\"\\`, and it is empty on a twin holding \\`builtins.pathExists ./README.md\\` and \\`./Cargo.lock\\`.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 214,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "NIX-PKG-22's verification (`nix flake check --no-build`) cannot catch its own 'Never `allowBuiltinFetchGit`' clause: the builtin fetch makes vendoring succeed. On yazi@0ea4c5d9ef75 (1 git crate, no outputHashes, nix/yazi-unwrapped.nix:33 `allowBuiltinFetchGit = true`), `yazi-unwrapped.cargoDeps.drvPath` evaluated with exit 0. helix@079a789e8cb0:default.nix:46 carries the flag with 0 git crates. Class C4.",
    "fix": "In the fenced sh block after the `grep -c 'source = \"git+' Cargo.lock` line add `grep -rn -e 'allowBuiltinFetchGit = true' --include='*.nix' .                        # NIX-PKG-22: empty = pass`. In the NIX-PKG-22 Verification cell append `\\`nix flake check\\` goes green when \\`allowBuiltinFetchGit = true\\` stands in for the entries (yazi, watched 2026-09-27), so the \\`allowBuiltinFetchGit\\` grep is the check for that clause: a hit is the finding, and empty (exit 1) passes.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 167,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "NIX-PKG-19 (MUST) forbids answering a versionCheckPhase failure with `doInstallCheck = false`, but its only verification is 'The build'. With the phase disabled the build exits 0. Held-out nh@b6869cdf9860:package.nix:73 does exactly this: `doInstallCheck = false; # FIXME: --version includes 'dirty'`. The version is suffixed by its NIX-REL-02 violation (`4.4.2-b6869cd`), so this is a cascade. No command in the file finds it. Class C7.",
    "fix": "In the Proven by a Real Build sh block add `grep -rn -e 'doInstallCheck = false' --include='*.nix' .                                # NIX-PKG-19: empty = pass`. In the NIX-PKG-19 Verification cell append `Locator: the \\`doInstallCheck = false\\` grep. Each hit on an A CLI is the finding unless its comment names a reason other than a version-check failure. Watched 2026-09-27: it hits nh's package.nix:73.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 87,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-PKG-05 drvPath steps blame src filtering for NIX-REL-03's revision churn. Step 2 leaves the tree dirty. nh@b6869cdf9860 filters `src` with a fileset (compliant) but reads `self.dirtyShortRev`, so the drvPath moved from `\u2026qhdasi6b\u2026-nh-4.4.2-b6869cd.drv` to `\u20267kd2qz1p\u2026-b6869cd-dirty.drv`. `.#default.src` stayed `\u20268jjvppcg\u2026-source`. nh has no README.md either, so step 2 creates the file and the stated revert fails (`pathspec 'README.md' did not match`). Class C7.",
    "fix": "Replace lines 81 and 83 with `nix eval --raw .#default.src                    # 1: note the path` and `nix eval --raw .#default.src                    # 3: NIX-PKG-05, must print the path from step 1`. Replace step 2 with `echo x >> flake.nix && git add -A              # 2: an unrelated edit, reverted afterwards`, and change the revert sentence to `Revert step 2 with \\`git checkout HEAD -- flake.nix\\`.` In the NIX-PKG-05 Verification cell append `The steps compare \\`src\\`, not \\`drvPath\\`: a \\`drvPath\\` also moves when the package reads \\`self.dirtyShortRev\\` (NIX-REL-03), which misattributes the churn. Watched 2026-09-27: nix-direnv's \\`builtins.path { path = ./.; }\\` src moved, and nh's fileset src stayed put while its drvPath moved.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 158,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-PKG-11 override-marker probe tests the exported derivation. For a wrapper builder that derivation's phases belong to nixpkgs, not the author. nix-direnv@b0557d237b01 builds through `resholve.mkDerivation`, whose outer `installPhase` is `cp -R $src $out` without runHook. On a twin with `runHook preInstall`/`postInstall` added to the author's `installPhase`, the probe still exited 1 (MARKER absent). On `.unresholved` it exited 0 for the twin and 1 for the original, so the original is a true violation. Class C26 (new).",
    "fix": "Append to the paragraph after the sh block: `For a wrapper builder whose exported derivation is not the one carrying your phases (for example \\`resholve.mkDerivation\\`, whose outer \\`installPhase\\` is nixpkgs' \\`cp -R $src $out\\`), run the pair on the inner derivation (\\`.#default.unresholved\\`), and read an outer red as not a finding. Watched 2026-09-27 on nix-direnv: outer red on the hooked twin, inner green on the twin and red on the unhooked original.`"
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 247,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The NIX-PKG-21 'right' snippet and its Verification ('The overlay's `_final:` passes deadnix') use `_final: prev:`. NIX-FLK-02 as drafted requires 'first argument is literally `final`', so today the two rows contradict (K1). Measured 2026-09-27 on CppNix 2.35.2: a producer flake with `overlays.default = _final: prev: \u2026` gives `all checks passed!` from `nix flake check --no-build`. deadnix -L is green on `_final` and red on `final` (`Unused lambda argument: final`). The two-interpreter probe gave python3.12 and python3.13 drvs, and the top-level-only twin gave `attribute 'mylib' missing`. The real tree agrees: agenix@654f73179924:overlay.nix:1 and microvm@68f2670367e0:nixos-modules/microvm/optimization.nix:41 both fail deadnix on an unused `final`. PKG-21 is correct once FLK-02 takes the K1 wording.",
    "fix": "Keep PKG-21's snippet. In the NIX-PKG-21 Verification cell replace `The overlay's \\`_final:\\` passes deadnix, and a plain \\`final:\\` fails it.` with `The overlay's \\`_final:\\` is NIX-FLK-02's spelling for an unused first argument: deadnix passes it and CppNix 2.35.2 \\`nix flake check\\` accepts it (exit 0). A plain \\`final:\\` fails deadnix (watched 2026-09-27).` Land this together with the NIX-FLK-02 rewording from K1, never before it."
   },
   {
    "set": "packaging-release-language-modules (rules/nix-quality/packaging.md, release.md, language.md, modules.md; families NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD)",
    "file": "rules/nix-quality/packaging.md",
    "line": 263,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The held-out round found new instances of known classes in NIX-PKG rows. packaging.md has no Applied evidence section to record them in (Authoring notes item 14).",
    "fix": "Insert before `## Not a Finding` a section `## Applied Evidence (held-out round 2026-09-27)` with these lines: `- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-02 at tests/nix/bats-assert.nix:8 (39-hex rev, C23)`; `- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-11 at default.nix:20 (inner-derivation probe red, C25)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-PKG-11 at pkgs/agenix.nix:79 (installPhase without runHook, C25)`; `- add to Applied: nix-community/nix-direnv@b0557d237b01 violates NIX-PKG-05 at default.nix:15 (src = builtins.path { path = ./.; }, src moved on an unrelated edit, C18)`; `- add to Applied: ryantm/agenix@654f73179924 violates NIX-PKG-07 at pkgs/agenix.nix:83 (no meta.license or meta.platforms, set check false, C13)`; `- add to Applied: NixOS/nixos-hardware@30d48a0ec603 violates NIX-PKG-12 at nxp/imx8mp-evk/bsp/imx8mp-boot.nix:31 (bare --replace, 14 sites, C9)`; `- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-PKG-06 at package.nix:11 (extra formal rev ? \"dirty\", not by-name compatible; the grep cannot see it, reading heuristic)`; `- add to Applied: nix-community/nh@b6869cdf9860 violates NIX-PKG-19 at package.nix:73 (doInstallCheck = false after a version-check failure, C7)`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality/security.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/rules/nix-quality.md",
  "findings": [
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 95,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "K3 confirmed. The paragraph tells the index gate step to run \"these lines\". Wired into a workflow as written, three things break. (1) A compliant tree whose gate.yml carries the lines went red on SEC-02, 03(b), 03(c), 08 and 09: each workflow line matches itself, so the check can never go green (C4). (2) `! grep` under `bash -e` never fails the step (watched: exit 0), and a bare grep exits 1 on the pass (C9). (3) The literal `${{ secrets.` filter inside `run:` is a GitHub expression (C21). The bracketed and if-wrapped twin was green on the compliant tree and red on the violating one. The paragraph also says SEC-09 is in the gate step, but index step 2a omits it (notes item 3 lists SEC-02, 03 and 08).",
    "fix": "Replace \"The gate block's security step (NIX-GATE, index) runs these lines together with NIX-SEC-04's `git ls-files` check.\" with \"The gate block's security step (NIX-GATE, index) runs the NIX-SEC-02, NIX-SEC-03 and NIX-SEC-08 lines with NIX-SEC-04's `git ls-files` check. NIX-SEC-09's line is not in it. A copy of these lines inside a workflow file needs three changes. Bracket one character of every literal pattern (`accept-flake-[c]onfig`, `trusted-[u]sers`, `settings[.]access-[t]okens`, `access-[t]okens`, `ca-[d]erivations`, `recursive-[n]ix`), or the workflow matches its own line and never goes green. Filter grep (b) with `grep -v -F -e '{{ secrets.'`, because GitHub evaluates a literal `${{` inside `run:`. Wrap each line as `if grep \u2026 ; then exit 1; fi`, because a bare grep exits 1 on the pass and a negated `! grep` never fails a `bash -e` step.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 83,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "SEC-03 (b) has two false-positive classes on real trees. (1) The compliant job-token form `access-tokens = github.com=${{ github.token }}` escapes the `${{ secrets.` filter: nix-community/fenix@5f7e7d793cb2:.github/workflows/pr.yml:22 and nix-community/nix-index-database@9ad722673ab3:.github/workflows/update.yml:17,100,139. (2) The substring matches code and URLs: nix-community/nh@b6869cdf9860:crates/nh-search/src/github/auth.rs:17 (`personal-access-tokens/new`) and NixOS/nix `'access-tokens.cc'`. The tightened pattern keeps both planted reds (a literal token in extra_nix_config, and nix.settings.access-tokens) and drops the URL hits.",
    "fix": "Line 83: replace the command with `grep -rnE --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e '(^|[^-[:alnum:]])access-tokens[[:space:]]*=' . | grep -v -F -e '{{ secrets.' -e '{{ github.token }}'`. Line 94: replace \"and drops lines fed from `${{ secrets.\u2026 }}`\" with \"and drops lines fed from `${{ secrets.\u2026 }}` or `${{ github.token }}`\"."
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 102,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The NIX-SEC-03 rule text allows only `${{ secrets.\u2026 }}` in CI. The job token `${{ github.token }}` is the same credential as `secrets.GITHUB_TOKEN`, and 2 exemplars use it. As written they are MUST findings with no harm.",
    "fix": "In the NIX-SEC-03 Rule cell, replace \"or `access-tokens = github.com=${{ secrets.\u2026 }}` in `extra_nix_config` or `NIX_CONFIG`\" with \"or `access-tokens = github.com=${{ secrets.\u2026 }}` (or the job token `${{ github.token }}`) in `extra_nix_config` or `NIX_CONFIG`\"."
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 195,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-SEC-07 owner diff sees only inputs with `.owner`. A newly added `git`, `tarball` or `path` input prints nothing. Planted: adding `{type = \"git\"; url = \"https://evil.example/x\"}` gave empty output, exit 0, which reads as a pass (C4). A github-to-git+https retarget prints only the `removed` half. 10 of 46 corpus and held-out locks carry such inputs, for example astro/microvm.nix@68f2670367e0 `https://spectrum-os.org/git/spectrum`. The widened def printed `added   git:https://evil.example/x` and still passes a rev-only bump.",
    "fix": "Line 195: replace the `def owners:` line with `  def owners: [.nodes[] | .original // empty | if .owner then .type + \":\" + .owner + \"/\" + .repo elif .url then .type + \":\" + .url else empty end] | unique;`. In the NIX-SEC-07 Verification cell, after \"Watched green: a rev-only bump printed nothing.\" insert \"An added `git` input printed `added   git:https://evil.example/x`.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 35,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The arithmetic does not add up. \"37 published flakes\" (the corpus minus NixOS/nixpkgs, as gates.md uses it) minus NixOS/nix and NixOS/nixpkgs is 35, not the 36 stated. The consolidation's 36 is 38 minus the two implementations. The V8 convention requires stating the slice exactly.",
    "fix": "Replace the bullet with \"- **Corpus rates** come from the 38-repository corpus read on 2026-09-27. The `nixConfig` rate counts the 37 repositories other than NixOS/nixpkgs, and the `accept-flake-config` rate counts the 36 that are neither NixOS/nix nor NixOS/nixpkgs.\""
   },
   {
    "set": "gates-language-security (rules/nix-quality/gates.md, rules/nix-quality/language.md, rules/nix-quality/security.md)",
    "file": "rules/nix-quality/security.md",
    "line": 136,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The SEC-05 IFD probe targets `.#default`, a local checkout. The rule forbids evaluating a flake you do not own except by 40-hex remote ref, so the probe contradicts the procedure it guards. The probe's error text is correct: a cold `nix eval` under the flag printed `cannot build '\u2026drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`.",
    "fix": "Line 136: replace `nix eval --no-write-lock-file --option allow-import-from-derivation false .#default` with `nix eval --no-write-lock-file --option allow-import-from-derivation false github:owner/repo/0123456789abcdef0123456789abcdef01234567#default`, and replace \"(substitute your attribute)\" with \"(substitute the reviewed rev and your attribute)\"."
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/security.md",
    "line": 83,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "SEC-03 grep (b) exempts only `${{ secrets.`, so it flags `access-tokens = github.com=${{ github.token }}`, the same secret-fed token (fenix@5f7e7d793cb2:.github/workflows/pr.yml:22; nix-index-database@9ad722673ab3:.github/workflows/update.yml:17,100,139). The bare `access-tokens` substring also hits URLs: nh@b6869cdf9860:crates/nh-search/src/github/auth.rs:17 and transport.rs:200 (`settings/personal-access-tokens/new`), and NixOS/nixpkgs fetchgitlab comments. The literal `${{ secrets.` breaks a workflow carrier (actionlint: `got unexpected EOF while lexing end of string literal`), and the patterns self-match when the block is wired into CI (K3). The narrowed line prints nothing on fenix and nix-index-database. It keeps nh's test fixture tokens and NixOS/nix's `--access-tokens` test lines. Proposed class C26, plus C21.",
    "fix": "Line 83: grep -rn --exclude-dir=.git --exclude='*.md' --exclude='*.mdx' -e 'access-[t]okens *=' -e '--access-[t]okens' . | grep -v -e '[$]{{ secrets[.]' -e '[$]{{ github[.]token }}'\nIn lines 79, 85, 87 and 89 bracket one letter of each literal pattern (`accept-flake-[c]onfig`, `settings.access-[t]okens` with -F dropped, `trusted-[u]sers`, `ca-[d]erivations`, `recursive-[n]ix`). Append to the paragraph at lines 92-97: \"The bracketed spellings keep the file that carries these lines (a workflow, Makefile or justfile) from matching itself, and `[$]{{` keeps GitHub from parsing the filter as an expression. In CI, write each as `if grep \u2026; then exit 1; fi`, never `! grep \u2026`.\""
   },
   {
    "set": "flakes-inputs-gates-security (rules/nix-quality.md index gate block + NIX-CORE, rules/nix-quality/{flakes,inputs,gates,security}.md)",
    "file": "rules/nix-quality/security.md",
    "line": 195,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The NIX-SEC-07 owners diff keeps only nodes whose `original` has an `owner` (`select(.owner)`), so a retarget of a url-typed input (git+https, a channel tarball or FlakeHub) prints nothing. Planted (planted/sec07): moving a `git+https://github.com/ipetkov/crane` input to `\u2026/ipetk0v/crane` gave empty output, exit 0, a pass. The widened def prints `added   git:https://github.com/ipetk0v/crane` and `removed git:https://github.com/ipetkov/crane`. Exposed real nodes: the url-typed root nixpkgs of home-manager@7b4c5ec4beda, nh@b6869cdf9860, nixd@77bb1cacfa8a, nixos-hardware@30d48a0ec603, NixOS/nix@209d2bc44288 and ghostty@b40acce58dcf, and the FlakeHub nixpkgs of DeterminateSystems/flake-checker@cddc8afc9733 and the-nix-way/dev-templates@6a7eefd8fd91. Replayed verbatim over 40 real numtide/devshell lock commits, the owner-typed half worked: 78e2d09 printed `removed github:numtide/flake-utils`. Classes C15 and proposed C28.",
    "fix": "Line 195: replace the def with\n  def owners: [.nodes[] | .original // empty | if .owner then .type + \":\" + .owner + \"/\" + .repo elif .url then .type + \":\" + (.url | sub(\"[?#].*$\"; \"\")) else empty end] | unique;\nAppend to the NIX-SEC-07 Verification cell: \"Watched red on a `git+https` input retargeted from ipetkov to ipetk0v (both lines printed).\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-diagnose/references/error-catalog.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-diagnose",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/references/error-catalog.md",
    "line": 101,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "K2. Row 33's first command runs Lix from the registry nixpkgs, not the locked one.",
    "fix": "Replace the First command cell with `nix shell --inputs-from . nixpkgs#lix --command nix eval .#default`"
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-diagnose/references/error-catalog.md",
    "line": 80,
    "severity": "nit",
    "kind": "style",
    "finding": "Row 17's fix names a single spelling, `final: _prev:`, as if others were wrong. `final: prev:` and `_final: prev:` both pass CppNix and Lix.",
    "fix": "Replace the Fix cell with \"`final: prev: { \u2026 }`, with `_` on an argument the body never reads\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt/references/ci-and-readme.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-adopt",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/references/ci-and-readme.md",
    "line": 56,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "Watched: the trust-boundaries step exits 0 on the clean fixture. Once the nix-flake-adopt skill is installed under .claude/skills (a committed agent-config directory), it exits 1, because this skill's own text names `accept-flake-config`, `access-tokens` and `trusted-users`. The index warns about this (rules/nix-quality.md:65), but the workflow template and its per-repository edits do not.",
    "fix": "Add a row to the Per-repository edits table (after line 147): \"| Add `--exclude-dir=.claude` (the directory your agent client installs rules and skills into) to each `grep -rn` line of the trust-boundaries step | the repository commits installed rules or skills, whose text names the banned strings | NIX-SEC-02, NIX-SEC-03, NIX-SEC-08 |\""
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-adopt/references/ci-and-readme.md",
    "line": 148,
    "severity": "fix",
    "kind": "style",
    "finding": "An angle-bracket placeholder sits inside a command (`nix build .#checks.x86_64-linux.<name>`), which verification-shape note 9 forbids.",
    "fix": "| Add a `nix build .#checks.x86_64-linux.smoke` line per non-package check (substitute your check name) | a `checks` entry that is not a package | NIX-GATE-10 |"
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/references/ci-and-readme.md",
    "line": 58,
    "severity": "blocker",
    "kind": "false-positive-on-real-tree",
    "finding": "The merge-blocking 'trust boundaries' step is red on 29 of 46 repos. 11 of them (direnv, helix, jj, sops-nix, fenix, nixd, nix-index-database, nix-vscode-extensions, nil, agenix, yazi) are red only on idiomatic code. Line 60's `*token*` and `*secret*` pathspecs match source files: helix@079a789e8cb0 helix-lsp-types/src/semantic_tokens.rs, nil@205c8ba65a7f crates/nil/src/semantic_tokens.rs, yazi@0ea4c5d9ef75 yazi-shared/src/completion_token.rs, jj@f01e70f8e375 lib/src/secret_backend.rs, devenv's `secretspec` feature (26 files). They also match non-secret tracked `.env` files (treefmt@d68dddf6ac3a .env = DEVSHELL_NO_MOTD=1), direnv's .env test fixtures, a public CA .pem, and agenix's encrypted .age examples. Line 58's filter does not drop `${{ github.token }}`, which is the same token as secrets.GITHUB_TOKEN (fenix@5f7e7d793cb2 .github/workflows/pr.yml:22, nix-index-database@9ad722673ab3 .github/workflows/update.yml:17), and its pattern hits the `personal-access-tokens` URL (nh@b6869cdf9860 crates/nh-search/src/github/auth.rs:17). The adopt target shape, a Rust CLI, is exactly where semantic_tokens.rs files live, so the gate is red on day one and invites weakening. Class: lexical homograph (new, see new_failure_classes).",
    "fix": "Replace lines 55-61 of the workflow with:\n```\n          fail=0\n          grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' . && fail=1\n          grep -rnE --exclude-dir=.git --exclude-dir=.claude -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'glpat-[A-Za-z0-9_-]{20,}' . && fail=1\n          grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='*.md' --exclude='*.mdx' -e '[^-_a-z]access-[t]okens' -e '^access-[t]okens' . | grep -v -F -e '{ secrets.' -e '{ github.token }' && fail=1\n          grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'trusted-[u]sers' . && fail=1\n          git ls-files -- '*.env' '.env.*' '*.pem' '*.key' '*.p12' '*.pfx'\n          exit \"$fail\"\n```\nIn the load-bearing bullets, change 'each of the five trust-boundary lines failed the step alone' to 'each of the four grep lines failed the step alone'. Add: 'The `git ls-files` line prints candidates to read by hand and never fails the step: name globs such as `*token*` match `semantic_tokens.rs`.' Watched 2026-09-27: red (exit 1) on a planted `ghp_` `access-tokens` line and listed a tracked secret.env; green on all 11 false-positive repos and on hexyl."
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-adopt/references/ci-and-readme.md",
    "line": 132,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "Bracketing protects the workflow's own line, but not installed copies of this bundle. With nix-quality and nix-flake-adopt/-release installed under `.claude/` (grim's project scope), the trust step went red on 28 lines in `.claude/rules/nix-quality*.md` and `.claude/skills/nix-flake-*/`. The index gate block names this hazard. This workflow and the release greps do not. The same self-hit affects nix-flake-release SKILL.md:266 (`grep -rn --exclude-dir=.git -e 'accept-flake-config' .`). Class: self-hit (new, see new_failure_classes).",
    "fix": "Append to the 'Bracketed patterns' bullet: 'Installed copies of the nix-quality rules and these skills contain every pattern in full, so each grep also takes `--exclude-dir=` for the directory your agent client installs into (`--exclude-dir=.claude` in the file above).' In nix-flake-release/SKILL.md line 266, change the command to `grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-config' .`. Watched: the fixed step exit 0 on hexyl with the bundle under .claude/ and the step in its own workflow (actionlint 0), exit 1 on the planted secret."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-release/SKILL.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix/skills/nix-flake-release",
  "findings": [
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-release/SKILL.md",
    "line": 266,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The SEC-02 release grep (line 266) and the INP-07 grep (line 98) search the whole tree. A repository that commits this installed skill matches both, because the skill names `accept-flake-config` and `--update-input`, so a compliant tree reports findings. The same class as the adopt CI finding.",
    "fix": "Append after the Release greps table (after line 268): \"A repository that commits installed rules or skills adds `--exclude-dir=.claude` (your agent client's install directory) to the `accept-flake-config` grep and to step 2's `--update-input` grep: this skill's own text names both.\""
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-release/SKILL.md",
    "line": 168,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The deprecation shim assumes `forAllSystems` passes `system`, but nix-flake-adopt's fleet template defines `forAllSystems` to pass `pkgs`. Pasted into an adopted flake, `nixpkgs.legacyPackages.${system}` receives a package set and fails. The replacement below, composed into the adopt template, passed nixfmt --check (exit 0). The REL-11 evals then gave new-name exit 0, old-name exit 1, and `nix flake check --no-build --option abort-on-warn true` exit 1.",
    "fix": "Replace lines 169-182 with:\n{\n  packages = forAllSystems (\n    pkgs:\n    let\n      mytool = pkgs.callPackage ./package.nix { };\n    in\n    {\n      default = mytool;\n      new-name = mytool;\n      # Remove in the release after this one (NIX-REL-10).\n      old-name = pkgs.lib.warn \"packages.old-name is renamed to packages.new-name and is removed in the next release\" mytool;\n    }\n  );\n}"
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-release/SKILL.md",
    "line": 244,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The block computes the floor and then hardcodes `nix_2_31` on the next line without saying to substitute it. That is the 'remembered floor' the pinned default (line 65) and agent-mistake item 6 forbid. Measured: the expression prints [\"nix_2_31\",\"nix_2_34\",\"nix_2_35\"], which agrees with the CI form's `nix_2_31`.",
    "fix": "Replace the comment on line 244 with `# The floor is the first name printed (2026-09-27: nix_2_31). Substitute it for nix_2_31 on the next line.`"
   },
   {
    "set": "skills: nix-flake-adopt, nix-flake-release, nix-diagnose",
    "file": "skills/nix-flake-release/SKILL.md",
    "line": 97,
    "severity": "fix",
    "kind": "false-negative-on-real-tree",
    "finding": "The step 2 NIX-INP-04 check and MUST row 11 (line 459) cover only absolute `path:` and `git+file:`. INP-04 also forbids a relative `path:` that leaves the flake's git tree, and inputs.md pairs the jq with a cross-tree grep. Watched: the jq printed [\"gitlib\",\"mylib\"] on the planted absolute and git+file lock and [] on the twin. It cannot see `path:../lib`, which the grep below finds.",
    "fix": "Insert a table row after line 97: \"| No cross-tree relative input | `grep -rn -e 'path:\\.\\./' --include='*.nix' .` | empty output (exit 1). A hit is a candidate to read. The parent form `path:..` from a nested sub-flake never matches | NIX-INP-04 |\". Change MUST row 11 (line 459) to \"| 11 | The committed `flake.lock` holds an absolute `path:` or `git+file:` input, or a relative `path:` that leaves the flake's git tree | NIX-INP-04 |\""
   },
   {
    "set": "generated-and-skills: rules/nix-quality/generated-flakes.md (NIX-GEN), skills/nix-flake-adopt, skills/nix-flake-release, skills/nix-diagnose, .agents/research/nix-generated-flakes/prototype",
    "file": "skills/nix-flake-release/SKILL.md",
    "line": 121,
    "severity": "fix",
    "kind": "false-positive-on-real-tree",
    "finding": "The manifest side of the version check, `grep -m1 -e '^version = ' Cargo.toml` (also at ci-and-readme.md:78), misses aligned TOML. nh@b6869cdf9860 Cargo.toml:10 has `version      = \"4.4.2\"`, and yazi@0ea4c5d9ef75 Cargo.toml has the same alignment. Both print an empty version, so the adopt CI step compares against '' and goes red on a compliant, aligned manifest. It goes red on nh for the wrong reason: nh's real REL-02 defect is `4.4.2-b6869cd`. 2 of 11 Cargo repos in the corpus are affected.",
    "fix": "Line 121 becomes `grep -m1 -E -e '^version[[:space:]]*=' Cargo.toml | grep -F -e \"\\\"$VERSION\\\"\"`. In ci-and-readme.md line 78, replace `grep -m1 -e '^version = ' Cargo.toml` with `grep -m1 -E -e '^version[[:space:]]*=' Cargo.toml`. Watched: the new form prints 4.4.2 on nh and 26.9.1 on yazi, is unchanged on the other 9 Cargo repos, and makes nh's check red on the real suffix `4.4.2-b6869cd`."
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
