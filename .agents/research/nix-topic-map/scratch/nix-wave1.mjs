export const meta = {
  name: 'nix-wave1-ground-and-scout',
  description: 'Nix research program wave 1: three grounding audits (ocx index and fleet, exemplar flake shape, exemplar tool runs) and six landscape scouts over the Nix corpora',
  phases: [
    { title: 'Ground', detail: 'numbers-first audits of the ocx index contract, fleet flake candidates, and a 38-repo exemplar corpus with real tool runs' },
    { title: 'Scout', detail: 'six corpus surveys that discover candidate topics' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/nix-frame.md'
const EX = '/home/mherwig/.cache/research-lang/exemplars/nix'
const EXLOG = '/home/mherwig/.cache/research-lang/exemplars/nix-fetch.log'
const RUN = '/home/mherwig/.cache/research-lang/nix-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/nix-tools/fixtures'
const DATE = '2026-09-27'

const PREAMBLE = (rationale) => `Model rationale: sonnet — ${rationale}

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program that makes an AI-agent fleet expert in Nix: the Nix language, nixpkgs packaging, and above all AUTHORING, MAINTAINING, VERSIONING and PUBLISHING FLAKES at a high quality bar with great consumer UX, plus the pitfalls. A second, concrete goal: the fleet's package manager ocx (an OCI-backed binary package manager, index at index.ocx.sh, packages on ghcr.io/ocx-contrib) wants to GENERATE a flake from its package index. The output becomes AI-agent configuration (a glob-scoped rule with a support directory, one to three skills, a bundle) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root and never cd to /home/mherwig/dev/grimoire-lore itself).
- Read the frame first, in full: ${FRAME}. It names the era (Nix 2.35.2 current in nixpkgs; nixpkgs 26.11 unstable), the adopting codebases, the orchestrator's hypotheses H1-H9, and the intended artifact set.
- THE FLEET HAS ZERO NIX CODE (measured). Grounding runs against an EXEMPLAR CORPUS of 38 upstream repositories cloned as blob-less depth-1 SPARSE checkouts under ${EX}/<owner>__<repo> (only *.nix, flake.lock, .github/, nix/ and root-level files are present; NixOS__nixpkgs is narrower: root files, lib/, doc/, ci/, .github/, pkgs/build-support/, pkgs/README.md, pkgs/by-name/README.md, maintainers/scripts/). SHAs and commit dates are in ${EXLOG}. Always cite <repo>@<sha12>:<path>:<line>.
- A REAL NIX TOOLCHAIN is available, rootless: run anything as '${RUN} <command> [args]' — for pipelines use '${RUN} bash -c "..."'. Inside: Nix 2.35.2, nixfmt 1.5.0, statix, deadnix 1.3.2, nixd, nil, flake-checker 0.2.15, nix-update, nurl, nix-prefetch-git, nix-tree, nix-diff, treefmt, skopeo, git, jq, curl. Sandboxed builds work; substituter is cache.nixos.org; flakes enabled; github.com access token configured (no rate-limit worry). Because the clones are SPARSE, evaluate third-party flakes by remote ref, e.g. 'github:owner/repo/<full-sha>' from ${EXLOG}, never the sparse path. Always pass --no-write-lock-file when evaluating anything you did not create. Never pass --impure, --accept-flake-config, or --option sandbox false. Never 'nix build' large packages (compilers, editors, NixOS systems); evaluation, 'nix flake show', 'nix flake check --no-build', 'nix eval', 'nix derivation show' and small builds of your own fixtures are fine. Bound every run with 'timeout 900'. Planted fixture flakes you create go under ${FIX}/<your-slug>/ (disk, never /tmp); create a git repo there ('git init -q && git add -A') because flakes only see tracked files.
- No Nix-specific config exists in the lore catalog (measured: only an incidental mention in rules/rust-quality/durable-state.md). Sibling sets a Nix topic must not duplicate: bazel-quality (hermeticity, remote caching), rust-quality/rust-cargo, go-quality/go-modules, python-packaging, docs-quality. A topic that is really generic CI or generic Rust/Go/Python packaging belongs to those sets — mark it covered-elsewhere.
- The orchestrator's hypotheses H1-H9 in the frame are HYPOTHESES to test, never premises. Contradicting one with evidence is the most valuable result you can produce.
- Do not read under any .agents/worktrees/ other than ${ROOT} itself, nor under node_modules/, target/, .git/ objects. The only file you may create or modify is your own OUTPUT FILE (plus fixtures under ${FIX}/<your-slug>/ if your brief allows them).
- Date everything you write as researched ${DATE}. Flag anything version-specific with the Nix / nixpkgs / tool version it applies to, and say whether it is CppNix, Lix or Determinate Nix behaviour when they differ.

ALREADY COVERED: nothing — this is the first wave of the Nix program.
`

const GROUND_CONTRACT = (subject, path) => `You are producing a numbers-first audit of ${subject} so a later authoring pass is grounded in what is actually there.

Write ${path} with YAML frontmatter (title, agent, model, scope, method, date_researched: ${DATE}). 'method' must describe the exact commands used so every number is re-runnable; inline each command next to its result. Record the exemplar SHAs you measured.

The orchestrator's hypotheses are HYPOTHESES, not premises. If the measurements contradict one, say so plainly and show the counts. That is the most valuable result this audit can produce.

Every claim needs a <repo>@<sha12>:<path>:<line> or file:line citation. Where docs and code disagree, say which one is authoritative in practice.

Counting discipline: report per-repo tables AND corpus totals; name the repos at both extremes. A grep count is a hypothesis — spot-read 3 hits per pattern to confirm the pattern measures what you claim, and report the false-positive rate you saw. Exclude NixOS__nixpkgs from per-flake statistics unless the axis says otherwise (it is a different shape), and say so.

Structure: frontmatter, a table of contents, "## Headline numbers", one "## <axis>" section per numbered demand below (each with commands inline, tables over prose), "## Smells (ranked)", "## Patterns worth encoding", "## Contradictions of the frame", "## Gaps". Aim for 300-600 lines; density over prose.

Use read-only tools on every repository. Do not modify anything outside your output file (and your fixtures dir if allowed). Return the structured receipt.`

const SCOUT_CONTRACT = (corpusName, path) => `You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert must be expert in, ranked by how much each changes the quality of real flakes and Nix code.

YOUR CORPUS: ${corpusName}

OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, corpus, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone claim about what this corpus says matters.
4. "## Survey" — numbered subsections, one per source or source cluster actually read: what it argues or lists, with an inline markdown link to the exact URL read. Quote exact attribute names, builtins, lib functions, lint names and IDs, flags, settings, command lines, version numbers, numeric thresholds.
5. "## Candidate topics" — a table: topic (a QUESTION, not a subject area) | why it matters | source (URL) | already-covered? (yes/partial/no, against the sibling lore sets) | which surface it binds (lang / module-system / packaging / fetchers / flake-schema / inputs-lock / systems / devshell / formatter-lint / checks-ci / cache / release-versioning / publishing / consumer-ux / security / impls / generated-flakes / prebuilt-binaries / ocx / any) | priority for THIS project shape (P0-P3, one clause of justification). Aim for 30-50 candidates. Be exhaustive and specific. Include the topics that sound boring but bite: path vs string coercion and store copying, source filtering and accidental whole-repo copies, untracked files invisible to flakes, submodules and LFS, string context, IFD, evaluation determinism across systems, lock file churn, fixed-output hash drift, timestamp and version reproducibility, unfree and insecure package gates, darwin versus linux differences, cross-compilation, deprecation windows and renamed attributes.
6. "## Recent shifts seen in this corpus" — what changed in the last 18-24 months (Nix 2.2x to 2.35, nixpkgs 24.11 to 26.11, Lix, Determinate Nix, the tools) and what older advice it invalidates, with the version and date.
7. "## Contested" — where sources disagree, and which way it is trending.
8. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 15 distinct sources, at least 8 primary (the Nix, Nixpkgs and NixOS manuals, nix.dev, RFCs, release notes, the tool's own repository or docs, source code, issue trackers).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub-hosted markdown (README, docs/, CHANGELOG, release notes, rule indexes) prefer fetching the raw file verbatim with 'curl -sL https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path>' through Bash, because WebFetch returns a summary and a catalogue sweep needs the full list. Use 'gh api' for GitHub issue, PR, release and discussion lists (read-only). The manuals are on nix.dev (nix.dev/manual/nix/2.35/, nixos.org/manual/nixpkgs/unstable/, nixos.org/manual/nixos/unstable/) and can be fetched with curl.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE} (Nix 2.35 / nixpkgs 26.11 era); flag historical-only guidance, and flag anything whose only support predates 2024.
- A candidate is a question a rule could later answer with a verification command. "Flakes" is a wave; "when must a flake input declare inputs.nixpkgs.follows, how does a consumer detect duplicate nixpkgs instances in flake.lock, and what breaks when follows is wrong" is a topic.
- You may run the toolchain ('${RUN} <cmd>') to confirm a claim about current behaviour (for example 'nix flake --help', 'statix list', 'nix config show'), and cite the command.
- Do not modify any file other than your output file. Return the structured receipt with the candidate list as structured data.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline_numbers: { type: 'array', items: { type: 'string' } },
    top_smells: { type: 'array', items: { type: 'string' } },
    patterns_worth_encoding: { type: 'array', items: { type: 'string' } },
    contradictions_of_frame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline_numbers', 'top_smells', 'patterns_worth_encoding', 'contradictions_of_frame'],
}

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    primary_sources_count: { type: 'number' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          why: { type: 'string' },
          source: { type: 'string' },
          covered: { type: 'string', enum: ['yes', 'partial', 'no'] },
          surface: { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
        },
        required: ['slug', 'why', 'source', 'covered', 'surface', 'priority'],
      },
    },
    recent_shifts: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'sources_count', 'primary_sources_count', 'candidates', 'recent_shifts'],
}

// ---------------------------------------------------------------- Ground
const GROUNDERS = [
  {
    key: 'ocx-index-and-fleet',
    prompt: `${PREAMBLE('measuring the ocx index wire contract, the ocx package format and the fleet repos that could ship a flake; counting and probing, no rule decisions')}
${GROUND_CONTRACT('the ocx package index and package format as the INPUT to a generated flake, plus the fleet repositories that would ship their own flake', RESEARCH + '/nix-audit/ocx-index-and-fleet.md')}

Measurement axes:
1. Index wire contract. Read /home/mherwig/dev/index/README.md, CLAUDE.md, .claude/rules/product-context.md (or the nearest equivalent under .claude/), schema/, catalog.config.json. Measure over /home/mherwig/dev/index/p/: packages (the p/<ns>/<pkg>.json roots), tags per package (min/median/max), tag shapes (full semver, minor floats like '1.7', major floats like '1', 'latest', anything else — count each), the fraction of tags whose digest is shared with another tag, status values (active/deprecated/other), stored image indexes (p/<ns>/<pkg>/o/sha256/*.json). Over the image indexes: platforms per index (count os/architecture/variant/os.features combinations; how many list libc or musl features), artifactType values, annotation keys. Use jq; inline every command.
2. The ocx package format. From /home/mherwig/dev/ocx/website/src/docs/ (reference/metadata.md, in-depth/storage.md, user-guide.md, any packaging page) and the crates under /home/mherwig/dev/ocx/crates/ (ocx_package, ocx_oci, ocx_store, ocx_index — cite file:line): the manifest layout (config media type, layer media types, compression formats accepted), the metadata document (env variables with interpolation tokens, path/constant/list vars, entry points, dependencies and their visibility, platform selection including os.features libc detection), and how ocx installs (content-addressed store, symlinks, launchers/shims). Produce a table: ocx concept | where defined (file:line) | what a Nix derivation would need to reproduce it (makeWrapper --set/--prefix, a bin/ wrapper, propagated inputs, meta.platforms, autoPatchelfHook, or 'open').
3. Probe hypothesis H6 live, and write down every step. For one small package in the index (actionlint is a good choice; its image indexes are under /home/mherwig/dev/index/p/actionlint/actionlint/o/sha256/), pick the linux/amd64 manifest digest and: (a) curl the manifest from https://ghcr.io/v2/ocx-contrib/actionlint/actionlint/manifests/<digest> with no auth and record the status; (b) get an anonymous token from https://ghcr.io/token?scope=repository:ocx-contrib/actionlint/actionlint:pull and retry; (c) fetch the config blob and the layer blob; record whether the blob URL answers with a redirect, to which host, and whether that redirect URL is signed or expiring; (d) confirm the layer's sha256 equals its OCI digest ('sha256sum'); (e) try '${RUN} nix-prefetch-url <blob-url>' with no token and record the failure verbatim; (f) record the layer media type and what is inside the tarball (list the first 30 entries, file(1) on the main binary: static or dynamic, interpreter path). Then state what H6 turns out to be. Do not write any derivation — that is a later dive.
4. Fleet repos that could ship a flake. For /home/mherwig/dev/ocx, /home/mherwig/dev/grimoire, /home/mherwig/dev/ocx-sdk-python and /home/mherwig/dev/setup-ocx (skip missing ones): workspace shape (Cargo workspace members, binary targets and their names, build.rs presence), native dependencies (count and list every '-sys' crate in Cargo.lock and whether it vendors or links a system library — openssl-sys, libgit2-sys, zstd-sys, ring, aws-lc-sys and so on), rust-toolchain.toml / MSRV, how the project is released today (release workflows under .github/workflows, cargo-dist / dist config, goreleaser, crates.io publish), and existing install instructions in README. Produce a table: repo | what 'nix run github:ocx-sh/<repo>' would need | the hardest part.
5. Gaps: what an ocx-index flake generator would need that the index does not provide today (for example hashes in a Nix-compatible form, stable public blob URLs, license/meta fields, mainProgram). One line each with evidence.`,
  },
  {
    key: 'exemplar-flake-shape',
    prompt: `${PREAMBLE('static measurement of flake shape across 37 exemplar flakes and nixpkgs conventions; volume work with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (flake structure, inputs, lock hygiene, packaging idioms, CI and release practice), measured statically from files', RESEARCH + '/nix-audit/exemplar-flake-shape.md')}

The per-flake set is every directory under ${EX} except NixOS__nixpkgs. Loop with a shell for-loop and print a per-repo table for each axis. You may use 'jq' from the host or '${RUN} jq'. You may use 'gh api' read-only for release/tag/commit data (network allowed).
Measurement axes:
1. Root flake.nix presence and size; number of .nix files; whether the flake is split (flake-module files, nix/ dir, per-output files); description attribute present.
2. Inputs: count per repo; input URL schemes (github:, git+https:, gitlab:, path:, tarball/https:, flakehub.com); 'flake = false' inputs; 'follows' declarations count; from flake.lock: number of nodes, number of DISTINCT nixpkgs nodes (count nodes whose locked repo is nixpkgs), duplicate nodes for the same repo, lock age of each root input in days relative to ${DATE} (from locked.lastModified), the nixpkgs branch referenced in flake.nix (nixos-unstable / nixpkgs-unstable / nixos-YY.MM / master / other). Corpus distribution of nixpkgs lock age.
3. Systems handling: flake-utils (eachDefaultSystem / eachSystem), flake-parts (mkFlake, perSystem), nix-systems input, blueprint, hand-rolled forAllSystems / lib.genAttrs, hard-coded single system. Which systems are declared (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin, others). Count per strategy.
4. nixpkgs instantiation: 'import nixpkgs {' occurrences vs 'legacyPackages' vs flake-parts' pkgs; config passed (allowUnfree, overlays); overlays exported vs consumed; 'with pkgs;' count; 'rec {' count; 'finalAttrs' count; 'meta.mainProgram' presence for packages; version expressions (self.shortRev, self.dirtyShortRev, self.lastModifiedDate, fromTOML of Cargo.toml / reading a VERSION file, hard-coded string); source filtering (lib.fileset, lib.cleanSource, cleanSourceWith, crane cleanCargoSource, builtins.path with filter, bare ./. or self as src). Spot-read hits.
5. Outputs exposed: packages, apps, devShells, checks, formatter, overlays, nixosModules, darwinModules, homeManagerModules, flakeModules, lib, templates, legacyPackages, hydraJobs, other custom top-level outputs. Count per repo and corpus.
6. nixConfig: which repos declare it and exactly what (extra-substituters, extra-trusted-public-keys, others). Quote them.
7. Formatter and lint config: formatter output value (nixfmt, nixfmt-rfc-style, alejandra, nixpkgs-fmt, treefmt wrapper); treefmt.toml / treefmt-nix; git-hooks.nix / pre-commit config; statix.toml, deadnix config.
8. Legacy compat: default.nix / shell.nix presence, flake-compat usage (which fork), .envrc with 'use flake'.
9. CI: for each repo's .github/workflows: installer action and version (DeterminateSystems/nix-installer-action, determinate-nix-action, cachix/install-nix-action, other), cache (cachix/cachix-action, DeterminateSystems/magic-nix-cache-action, flakehub-cache-action, nix-community/cache-nix-action, none), whether CI runs 'nix flake check', build matrix across systems (runner OSes), update-flake-lock (DeterminateSystems/update-flake-lock) or a custom lock-bump workflow and its cron, flakehub-push, release workflows. Quote the lines.
10. Release and versioning practice: 'gh api repos/<o>/<r>/tags --paginate' counts (or 'git ls-remote --tags'), tag naming (vX.Y.Z / X.Y.Z / dates / none), GitHub releases count, FlakeHub presence (flakehub-push workflow or README badge), CHANGELOG presence, how README tells consumers to install (nix run, nix profile install, flake input snippet with follows, overlay).
11. The generated/index-driven flakes (zig-overlay, rust-overlay, fenix, nix-index-database, nix-vscode-extensions, llm-agents.nix, nixpkgs-terraform, nixpkgs-python): the committed data file(s) (path, format, size, entry count), the updater (script path, language), the updater workflow and its cron, how many versions are exposed and under which attribute shape (packages.<system>.<name>, legacyPackages, nested attrsets by version, overlays), the fetcher used per artifact (fetchurl with hash, fetchzip, builtins.fetchurl, other), and how prebuilt binaries are made to run (autoPatchelfHook, patchelf, static, nothing). This axis matters most for the ocx goal; be thorough.
12. nixpkgs conventions (NixOS__nixpkgs only): digest pkgs/README.md and pkgs/by-name/README.md and CONTRIBUTING.md into a table of the normative package-authoring rules they state (quote line numbers), and list the CI checks under ci/ and .github/workflows (names only plus one line each).`,
  },
  {
    key: 'exemplar-tool-runs',
    prompt: `${PREAMBLE('running the real Nix toolchain against 37 exemplar flakes at their recorded SHAs; measurement with verbatim output, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus under real tools (evaluation, flake check, lint and format gates)', RESEARCH + '/nix-audit/exemplar-tool-runs.md')}

The per-flake set is every repo in ${EXLOG} except NixOS/nixpkgs and except typst/typst (which has no flake — confirm and record). Evaluate each by remote ref 'github:<owner>/<repo>/<full-sha>' with the SHA from ${EXLOG}. Run the repos sequentially or at most 3 at a time; bound each command with 'timeout 900'; capture stderr (warnings are data). Write raw per-repo logs only inside your fixtures dir ${FIX}/tool-runs/ and summarise into the output file.
Measurement axes:
1. 'nix flake metadata <ref> --json --no-write-lock-file': lock node count, root input count, lock ages. Cross-check with the static audit's numbers if you can (it is being written in parallel as nix-audit/exemplar-flake-shape.md; do not wait for it).
2. 'nix flake show <ref> --json --all-systems --no-write-lock-file' (and without --all-systems if that fails): success or failure verbatim; the output tree shape; which outputs are unknown/omitted; legacyPackages behaviour; time taken (use /usr/bin/time -f %e or bash 'time').
3. 'nix flake check <ref> --no-build --no-write-lock-file' on the home system, then with '--all-systems': pass/fail, the FIRST error verbatim, and EVERY 'warning:' line (deprecations such as renamed attributes, unknown flake outputs, 'system' renamed to 'stdenv.hostPlatform.system', nixfmt-rfc-style renames, IFD warnings). Tabulate warnings by text across the corpus — these are the live deprecation signals of ${DATE}.
4. flake-checker on each flake.lock (the sparse clone has flake.lock): 'flake-checker --no-telemetry <path-to-flake.lock>' (check 'flake-checker --help' for the exact flags); record each finding (outdated nixpkgs, non-upstream nixpkgs, unsupported branch).
5. Lint and format gates on the sparse clone's .nix files (they are present): 'statix check <dir>' (count findings by lint code; run 'statix list' once and record the full lint list), 'deadnix --fail <dir>' or equivalent (count unused bindings), 'nixfmt --check' over every tracked .nix file (count files that would be reformatted; note which repos use a different formatter so a nixfmt diff is expected). Tabulate per repo and total; name the most common statix codes.
6. Evaluation cost: for 5 repos of different shapes, 'nix eval <ref>#packages.x86_64-linux --apply builtins.attrNames' time and the number of distinct nixpkgs source paths fetched (from 'nix flake metadata'); note which flakes instantiate nixpkgs more than once.
7. One implementation cross-check: pick 3 small flakes and re-run 'nix flake check --no-build' with Nix 2.24 from the same pinned nixpkgs ('${RUN} nix shell nixpkgs#nixVersions.nix_2_24 --command nix flake check ...' — adjust if the attribute differs; record what works) to see whether older CppNix disagrees. Lix and Determinate Nix are out of scope for this worker unless trivially available from nixpkgs (lix is packaged as 'lix'; try it the same way and record the result).
Report: a pass/fail matrix, a warnings table, a lint table, and the list of failures with the verbatim first error. The failures and warnings are the failure corpus the scouts cannot see.`,
  },
]

// ---------------------------------------------------------------- Scout
const SCOUTS = [
  {
    key: 'canonical',
    corpus: `CANONICAL GUIDES — the curriculum. Extract tables of contents: every chapter, section, checklist item and page is a candidate topic.
Survey: the Nix reference manual for 2.35 (nix.dev/manual/nix/2.35/ — the language chapter, the 'nix flake' command family pages including the flake reference and flake format sections, the lock file format, 'nix flake check' semantics per output type, fetchers and builtins.fetchTree, the settings reference for flake-related settings such as accept-flake-config, allow-import-from-derivation, pure-eval, access-tokens); nix.dev (every guide and tutorial, especially guides/best-practices, guides/recipes, the FAQ, 'Working with local files' / lib.fileset, 'Packaging existing software', 'Dependencies in the development shell', 'Automatic environments', 'Module system deep dive', 'Integration testing with NixOS VMs', 'Towards reproducibility: pinning nixpkgs', the concepts/flakes page and its stated position); the Nixpkgs manual (stdenv and phases, meta attributes, passthru.tests and passthru.updateScript, fetchers and hash handling, trivial builders, build helpers, the language/framework sections for Rust, Go, Python and prebuilt binaries / autoPatchelfHook, overlays and overriding, lib reference, 'pkgs/by-name', cross-compilation); the NixOS manual's 'Writing NixOS Modules' and option types; flake.parts documentation (every page); the NixOS wiki Flakes page (wiki.nixos.org); zero-to-nix.com (Determinate); the NixOS and Flakes Book (nixos-and-flakes.thiscute.world); Nix Pills (mark as historical where superseded). List the accepted RFCs relevant to flakes and packaging from github.com/NixOS/rfcs (for example 0140 by-name, 0166 formatting, and whatever governs flakes' status) with their status.`,
  },
  {
    key: 'codified',
    corpus: `CODIFIED PRACTICE — rules somebody thought worth ENFORCING. Enumerate the complete catalogues, fetched not recalled; the rule lists are a taxonomy of what goes wrong.
Survey: statix's complete lint list (run '${RUN} statix list' and cross-check github.com/oppiliappan/statix — every lint with its code and one-liner), deadnix's options and what it flags, nixf / nixf-tidy / nixd diagnostic list (github.com/nix-community/nixd — the diagnostic IDs in libnixf), nixpkgs-vet (formerly nixpkgs-check-by-name; github.com/NixOS/nixpkgs-vet — every check it enforces), nixpkgs-hammering (github.com/jtojnar/nixpkgs-hammering — every rule with its explanation page), the nixfmt standard (RFC 166 and github.com/NixOS/nixfmt — what it decides), 'nix flake check' built-in validation (which output names and types it checks, and which it merely warns on as unknown), flake-checker's checks (github.com/DeterminateSystems/flake-checker — supported branches, max age, owner, the CEL condition feature), treefmt-nix's formatter roster, git-hooks.nix's hook roster (Nix-related hooks), the nixpkgs CONTRIBUTING.md and pkgs/README.md normative rules (commit message format, meta requirements, hash attribute naming, 'rec' vs finalAttrs, fetchFromGitHub 'tag' vs 'rev', strictDeps, __structuredAttrs), nixpkgs CI checks (ci/ and .github/workflows in the nixpkgs repo — list every check), the NixOS module conventions RFC 0042 (settings-style options) and option-naming conventions, the nixpkgs 'lib' deprecation/warning mechanism (lib.warn, lib.mkRenamedOptionModule, lib.warnOnInstantiate) as the house way to deprecate. A local sparse clone of nixpkgs is at ${EX}/NixOS__nixpkgs (root files, lib/, doc/, ci/, .github/, pkgs/build-support/) — read from it directly and cite it.`,
  },
  {
    key: 'practitioner',
    corpus: `PRACTITIONER WRITING — argued positions with the reasoning, and when the manual's advice is wrong.
Survey authors and outlets the community cites by name: Eelco Dolstra (the flakes design, Tweag blog 'Nix Flakes, Part 1-3', the original flakes RFC 0049 and why it was closed), Determinate Systems blog (Graham Christensen and others: FlakeHub and semver flakes, flake schemas, lazy trees, Determinate Nix, 'the flakes are stable in Determinate Nix' position, nix-installer, update-flake-lock, magic-nix-cache's end), numtide / zimbatm ('1000 instances of nixpkgs', 'Why you don't need flake-utils', blueprint, nix-systems), the Lix project blog and docs (lix.systems — their stance on flakes, deprecations, differences from CppNix), Jade Lovelace (jade.fyi — 'Flakes aren't real and cannot hurt you', pinning, IFD), Domen Kozar (cachix blog, devenv), Jorg Thalheim / Mic92 (nix-community practices, nixpkgs-review), Farid Zakaria (fzakaria.com Nix posts), Xe Iaso (xeiaso.net Nix posts), Ian Henry ('How to learn Nix'), Julia Evans' 2023-2024 Nix posts, Mitchell Hashimoto (zig-overlay, his NixOS dev setup), Tweag blog (nickel, topiary, flake-related posts), the Nix Discourse (discourse.nixos.org) threads with the most replies about flake best practices, 'follows', versioning flakes, and 'should my project have a flake', and the nix-community org's contributor guidelines. Extract argued POSITIONS on: flake-utils vs flake-parts vs no helper; exposing overlays vs packages; whether library flakes should pin nixpkgs at all; follows etiquette; nixConfig; lock update cadence; semver for flakes; supporting non-flake users (default.nix, flake-compat); devShells vs direnv; IFD; when NOT to use flakes.`,
  },
  {
    key: 'failure',
    corpus: `FAILURE CORPUS — antipatterns, recurring review objections, postmortems, CVEs, the complaints that keep resurfacing. This corpus finds what no curriculum lists.
Survey: nix.dev's best-practices anti-patterns (rec, with, lookup paths <nixpkgs>, unpinned fetchers, reproducible source paths); the NixOS/nix issue tracker for flake-labelled issues with the most reactions ('gh api search/issues' with q=repo:NixOS/nix+label:flakes sorted by reactions; read the top 30: untracked files invisible, submodules, whole-repo copies to the store and eval slowness, lock file churn, 'follows' bugs, path: vs git+file:, --override-input, relative path inputs, registry surprises, 'dirty tree' warnings); the equivalent for nixpkgs (the most-discussed packaging foot-guns: hash mismatch after upstream re-tags or GitHub archive changes, cargoHash / vendorHash drift, darwin SDK breakage, 'infinite recursion encountered' in overlays and modules); Nix security advisories and CVEs 2024-2026 (github.com/NixOS/nix/security/advisories — FOD sandbox escapes, daemon issues; cache and substituter trust; nixConfig-driven cache trust); flake-related supply-chain concerns (lock files pulling untrusted inputs, 'accept-flake-config'); recurring reviewer objections in nixpkgs PR reviews (sample 40 recently merged package PRs with review comments via 'gh api' and classify the objections: rec vs finalAttrs, meta.mainProgram, hash vs sha256, tag vs rev, nativeBuildInputs vs buildInputs, strictDeps, versionCheckHook, passthru.updateScript, license); home-manager / nix-darwin issue patterns for module authors; the Discourse 'common mistakes' and 'I wish I knew' threads; blog postmortems of flake breakages (e.g. a pinned input deleted upstream, a GitHub rename breaking github: refs, cache.nixos.org eviction or narinfo issues). For each failure give the mechanism and the smallest check that would have caught it.`,
  },
  {
    key: 'shifts',
    corpus: `RECENT SHIFTS — what changed in the last 18-24 months and what old advice it invalidates. Produce a 'use X not Y as of <version/date>' table.
Survey: the Nix release notes for every release from 2.18 to 2.35 (nix.dev/manual/nix/2.35/release-notes/ — fetch each: flake command changes such as 'nix flake update <input>' replacing 'nix flake lock --update-input', 'self.submodules', lfs, the git fetcher rewrite on libgit2, fetchTree changes, 'nix profile' format changes, lazy trees if they landed upstream, flakes' experimental status and any stabilisation milestone); the Nix team's roadmap and flake-stabilisation discussions (github.com/NixOS/nix issues and NixOS/rfcs); Lix release notes (lix.systems — every release); Determinate Nix release notes (docs.determinate.systems — lazy trees, flake schemas, parallel eval, what 'Determinate Nix 3' changed); the nixpkgs release notes for 24.11, 25.05, 25.11 and 26.05 plus 26.11 unstable highlights (nixos.org/manual/nixos/stable/release-notes — the Nixpkgs-level breaking changes: nixfmt-rfc-style renamed to nixfmt, pkgs.system deprecated in favour of stdenv.hostPlatform.system, substituteInPlace --replace removal, buildRustPackage useFetchCargoVendor and cargoHash, buildGoModule changes, python pyproject = true, darwin SDK rework and apple-sdk, lib.fileset, by-name migration, removals of aliases); the fate of magic-nix-cache (GitHub Actions cache API change, 2025) and the current CI installer/cache landscape (DeterminateSystems/nix-installer-action and determinate-nix-action, cachix/install-nix-action versions, FlakeHub Cache, nix-community/cache-nix-action); flake-utils maintenance status; the tooling churn (nixfmt 1.x, alejandra, nixpkgs-fmt deprecated?, nil vs nixd, statix maintenance status, deadnix). Verify every claim against the primary release note, and date it.`,
  },
  {
    key: 'generated-flakes',
    corpus: `GENERATED AND INDEX-DRIVEN FLAKES — prior art for turning an external package index into a flake, and for packaging upstream prebuilt binaries in Nix. This is the corpus for the ocx goal (see the frame, adopting codebase 2).
Survey the READMEs, update scripts and CI workflows of: mitchellh/zig-overlay (sources.json from the Zig download index plus an update script), oxalica/rust-overlay (manifests from the Rust dist server), nix-community/fenix, nix-community/nix-index-database (weekly generated releases), nix-community/nix-vscode-extensions (marketplace-generated package set), numtide/llm-agents.nix (auto-updated package set of upstream tools including prebuilt binaries, with its own binary cache), stackbuilders/nixpkgs-terraform (every Terraform version as a flake), cachix/nixpkgs-python (every Python version), nixpkgs' own generated sets and sources.json patterns (the vscode-extensions updater, 'passthru.updateScript', r-ryantm's nixpkgs-update bot and its conventions, 'nix-update'), the version-pinning tools (nvfetcher, niv, npins, 'nurl'), and Nix-side OCI tooling (dockerTools.pullImage via skopeo, nix2container, nix-snapshotter, any fetcher that pulls from an OCI registry such as ghcr.io and how it authenticates). Also the prebuilt-binary packaging patterns: autoPatchelfHook and its runtimeDependencies, patchelf, buildFHSEnv, nix-ld, static vs glibc vs musl builds, macOS code signing and quarantine attributes, and 'meta.sourceProvenance = binaryNativeCode'. Also package catalogs that map external versions onto Nix: devbox / nixhub.io, lazamar's nix-package-versions, Flox's catalog, FlakeHub's resolution. Local sparse clones of the first eight repos are under ${EX}/<owner>__<repo> — read them directly and cite them. For each: data model, attribute shape for multiple versions, fetcher and hash source, update cadence and mechanism, cache, failure handling when upstream deletes or re-tags an artifact, and consumer UX. Extract candidate topics an ocx-index flake generator must decide.`,
  },
]

phase('Ground')
const grounds = GROUNDERS.map(g => () => agent(g.prompt, { label: 'ground:' + g.key, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' }))

phase('Scout')
const scouts = SCOUTS.map(s => () => agent(
  PREAMBLE('corpus survey and web reading; discovery, not decisions') + '\n' + SCOUT_CONTRACT(s.corpus, RESEARCH + '/nix-topic-map/' + s.key + '.md'),
  { label: 'scout:' + s.key, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' }))

const results = await parallel([...grounds, ...scouts])
const out = { ground: {}, scout: {} }
GROUNDERS.forEach((g, i) => { out.ground[g.key] = results[i] })
SCOUTS.forEach((s, i) => { out.scout[s.key] = results[GROUNDERS.length + i] })
log('wave 1: ' + results.filter(Boolean).length + '/' + results.length + ' workers returned')
return out
