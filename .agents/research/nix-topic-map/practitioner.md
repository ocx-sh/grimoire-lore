---
title: Practitioner writing on Nix flakes — authoring, versioning, publishing, UX, pitfalls
corpus: practitioner (named authors and outlets the community cites: Tweag/Dolstra, Determinate Systems, numtide/zimbatm, Lix, Jade Lovelace, Farid Zakaria, Julia Evans, Ian Henry, nixcademy, nix-community, NixOS Discourse)
agent: practitioner-scout
model: sonnet
date_researched: 2026-09-27
sources_count: 32
scope: |
  Covers argued positions — not just documentation — on flake schema, flake-utils
  vs flake-parts vs hand-rolled, nixpkgs-instance hygiene and `follows`, source
  filtering/IFD, nixConfig trust, semver/FlakeHub versioning, lazy trees,
  devShells vs devenv/direnv, and the "should this even be a flake" debate.
  Does NOT cover: Nix-language fundamentals in the abstract (see the language
  corpus), stdenv/mkDerivation packaging mechanics beyond what flake authoring
  touches, NixOS module-system internals, or generic CI/hermeticity concerns
  already owned by bazel-quality — those are marked covered-elsewhere below.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- Flakes were designed (RFC 0049, Dolstra 2019) to fix three things: non-hermetic evaluation (`$NIX_PATH`, env vars, `builtins.currentSystem`), lack of a standard composition mechanism, and undiscoverable project structure — not primarily to add a lockfile.
- The flakes RFC was never accepted: it was closed/withdrawn on merge in 2020 after the implementation shipped anyway, which is still cited as the origin of "flakes are experimental but everyone depends on them."
- nix.dev's own manual still calls flakes "an experimental extension format with outstanding issues" around versioning, composability, cross-compilation and nixpkgs coupling — the official position and Determinate Systems' position are now openly at odds.
- Determinate Systems (Determinate Nix 3.0, 2025-03-05) issued its own unilateral "formal stability guarantee for flakes" while upstream flakes remain experimental — a vendor stability promise, not an upstream one.
- The single most-cited practitioner failure mode is "1000 instances of nixpkgs" (zimbatm, 2022): every flake input that does `import nixpkgs { inherit system; }` on its own instantiates a ~100 MiB / ~1s-eval copy; the fix is `inputs.x.inputs.nixpkgs.follows = "nixpkgs"` plus consuming via `nixpkgs.legacyPackages.${system}`.
- `flake-utils.lib.eachDefaultSystem` is now widely argued against (ayats.org "Why you don't need flake-utils", nixcademy "1000 instances of flake-utils"): it hides which systems are really supported, and a Sourcegraph-scale search found 4000+ flake.locks with duplicate flake-utils instances because authors forget `follows` on it too. The one-line `genAttrs` replacement or `flake-parts` are the two suggested replacements — no consensus on which.
- `follows` itself is not a free safety net: fzakaria's empirical analysis of 10,754 flakes found 3,261 distinct nixpkgs revisions in the wild, and argues `follows` is "time-traveling" a flake onto a nixpkgs its author never tested; recency of the target revision is the real safety signal, not the presence of `follows`.
- IFD (Import From Derivation) is explicitly banned from anything indexed by search.nixos.org, and Nix's own manual states the mechanism serializes evaluation because "the Nix language evaluator is sequential, it only finds store paths to read from one at a time" — real tools (crane, poetry2nix, cabal2nix, node2nix) use it anyway and the organizational guidance is "fine upstream in one project, compounds badly downstream in many."
- `nixConfig` in `flake.nix` (extra substituters, trusted keys) is a documented UX trap: it is presented to a user as a trust prompt, then silently ignored for anyone not already a Nix "trusted user" — multiple open NixOS/nix issues (#6752, #9788) describe this as confusing by design, and `accept-flake-config = true` globally is called out as dangerous.
- Source filtering has moved on: `lib.cleanSourceWith`/`builtins.filterSource` are described (Tweag, Nov 2023) as filter-callback-based and error-prone; `lib.fileset` (in nixpkgs since 23.11) is the current recommendation, using set algebra (`union`/`intersection`/`difference`) with "maximum laziness" and no accidental whole-tree store copies.
- Flakes only see files tracked by git — this is not a documentation footnote, it is the single most common first-run failure reported by practitioners (Julia Evans, 2023: "nix will COMPLETELY IGNORE YOUR FILE" for an untracked `flake.nix`).
- FlakeHub (Determinate Systems) is the only widely-cited channel that resolves real SemVer ranges (`=`, `*`, `1.*`, `1.2.*`) against flakes; its own best-practices doc recommends "one flake per versioned thing" and applying SemVer even to things that never had it before.
- FlakeHub's "rolling release" scheme encodes commit count as the patch version (`0.1.<commit-count>`, e.g. nixpkgs-unstable as `0.1.6953`) — a versioning convention invented entirely outside upstream Nix.
- "Lazy trees" (Determinate Nix 3.5.2+, PR open against upstream NixOS/nix as of the changelog) mount flake source inputs as a virtual filesystem instead of eagerly copying them into the store, cutting measured `stdenv` CI eval time from ~11s to ~3.5s and disk use from 433 MB to 11 MB — a concrete performance divergence between CppNix and Determinate Nix today.
- Lix has frozen the flake feature set (as of Lix 2.94/2.95, per its own wiki) at its current semantics, taking no new flake features while it extracts flakes into a separate plugin — Lix explicitly will not stabilize flakes even as it keeps supporting them.
- Magic Nix Cache's free CI-cache tier died on 2025-02-01 because GitHub deprecated the API it depended on and didn't publish the new API's proto files in time — cited as a lesson that a flake's CI caching strategy tied to one vendor's free tier is not durable.
- Git submodules as flake inputs are supported via `?submodules=1` (or `inputs.self.submodules = true`), but a `path:` input for a submodule bypasses `flake.lock` entirely (no `narHash`, no `rev`) — `nix flake lock --update-input` silently does nothing for it.
- Git LFS support in the git fetcper is new (`lfs = true`, or `inputs.self.lfs = true`) and only present from around Nix 2.27 (2025-03-03) — pre-2.27 flakes silently get LFS pointer files, not content.
- `pkgs/by-name/<2-letter-prefix>/<pkg-name>/package.nix` is now nixpkgs' canonical new-package structure and cannot reference files outside its own directory — a constraint that shapes how ocx-generated packages would need to look if ever proposed upstream (they will not be, but the convention is the sibling to emulate for an ocx-generated tree's own layout).
- Practitioner opinion is split on whether flakes were worth it at all: Jade Lovelace's "Flakes aren't real and cannot hurt you" argues flakes are "a special entry point for Nix code with a built-in pinning system, nothing more" and pushes non-flake primitives (overlays, `callPackage`, alternate pinning tools) for anything beyond a thin entry point; Farid Zakaria separately writes that evaluation "feels slower" with flakes and questions whether they beat `npins`/`niv` for pinning alone.
- devenv (Domen Kozar / cachix) positions itself as a layer above raw `devShells`: its own docs claim its native-shell activation avoids direnv's blocking rebuild ("can lock up the prompt for thirty seconds") and that plain `devenv.nix` evaluates faster and caches better than routing the same config through a flake's `devShells` output.

## Survey

### 1. RFC 0049 — the flakes design (Eelco Dolstra, 2019, closed 2020)
[tweag/rfcs @ flakes branch, rfcs/0049-flakes.md](https://github.com/tweag/rfcs/blob/flakes/rfcs/0049-flakes.md)

Motivation section states plainly: Nix expressions "are not nearly as reproducible as Nix builds" because they "can access arbitrary files (such as `~/.config/nixpkgs/config.nix`), environment variables, and Git repositories." The RFC frames flakes as fixing three problems at once: hermetic evaluation, a standard composition mechanism (replacing `NIX_PATH` and channels), and discoverable project structure (e.g. "there is no way to discover the NixOS modules provided by a repository"). Shepherd team: Domen Kožar (leader), Alyssa Ross, Shea Levy, John Ericson. Per search-confirmed community record, the RFC PR was closed/withdrawn on merge without acceptance, leaving flakes permanently in "experimental" status upstream — cited repeatedly by later authors as the root of every subsequent "are flakes actually stable" argument.

### 2. Nix Flakes, Part 1: An introduction and tutorial (Eelco Dolstra, Tweag, 2020-05-25)
[tweag.io/blog/2020-05-25-flakes](https://www.tweag.io/blog/2020-05-25-flakes/)

Introduces the `flake.nix` schema: `description`, `inputs`, `outputs` (a function of the input flakes returning packages/modules/etc.), and `self` (usable as `src = self;`). States the untracked-files behavior explicitly as a design choice for hermeticity, not a bug: files must be `git add`ed to be visible to evaluation. Frames `flake.lock` as pinning "exact revisions to ensure reproducible evaluation," updated only via explicit `nix flake lock --update-input`.

### 3. Nix Flakes, Part 3: Managing NixOS systems (Tweag, 2020-07-31)
[tweag.io/blog/2020-07-31-nixos-flakes](https://www.tweag.io/blog/2020-07-31-nixos-flakes/)

Extends the flake schema to `nixosConfigurations`, arguing flakes give NixOS system configs the same hermeticity and discoverability as package flakes — the origin of "your NixOS config should be a flake" advice that later authors (Discourse's "should I use flake or not" thread) push back on for beginners.

### 4. Source filtering with file sets (Tweag, 2023-11-28)
[tweag.io/blog/2023-11-28-file-sets](https://www.tweag.io/blog/2023-11-28-file-sets/)

Argues `lib.cleanSourceWith`/`builtins.filterSource`'s filter-callback interface is "tricky to get... to do what you want" and prone to including unwanted empty directories. Proposes `lib.fileset` (landed nixpkgs 23.11) with `lib.fileset.toSource { root = ./.; fileset = ./dir/file; }` and set algebra (`union`, `intersection`, `difference`), claiming "maximum laziness" — never adding files to the store unless the final result demands it.

### 5. "1000 instances of nixpkgs" (zimbatm, 2022-01-26)
[zimbatm.com/notes/1000-instances-of-nixpkgs](https://zimbatm.com/notes/1000-instances-of-nixpkgs) (also [discourse.nixos.org/t/17347](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347))

Core claim: "dependencies should not create their own instance of nixpkgs" — each costs ~100 MiB RAM and ~1s eval time, and flakes' per-dependency `inputs.nixpkgs` pattern multiplies this across a dependency tree. Recommends "composition over inheritance": expose constructors as function arguments in classic Nix; for flakes, `inputs.<dep>.inputs.nixpkgs.follows = "nixpkgs"` plus consuming via `nixpkgs.legacyPackages.${system}` rather than a fresh `import nixpkgs { inherit system; }` per output.

### 6. Why you don't need flake-utils (ayats.org, no date given in fetch, referenced against the 2022+ era)
[ayats.org/blog/no-flake-utils](https://ayats.org/blog/no-flake-utils)

Two complaints: flake-utils "doesn't check if what we want to do makes sense" (blind system-string interpolation lets you produce e.g. `packages.<system>.<system>.default`), and per-project dependency bloat because authors forget to make transitive flake-utils inputs `follows` each other. Gives the replacement one-liner:
```nix
forAllSystems = function:
  nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ]
    (system: function nixpkgs.legacyPackages.${system});
```
Recommends flake-parts (module-system based, type-checks outputs) for new projects, `forAllSystems` for anything that must stay dependency-light for consumers.

### 7. 1000 instances of flake-utils (nixcademy, era 2024+)
[nixcademy.com/posts/1000-instances-of-flake-utils](https://nixcademy.com/posts/1000-instances-of-flake-utils/)

Sharpens the same critique with data: "over 4100 results" for `flake.lock`s containing multiple flake-utils entries, "over 4200 flake.nix files mentioning both flake-utils.url and nixpkgs.url" (a Sourcegraph-scale search), undercutting flake-utils' own claim of having "no nixpkgs dependency" as a practical benefit. Also argues `eachDefaultSystem` obscures which systems are actually supported ("what exactly is a 'default system'?").

### 8. Nix IFD: A Ticking Time Bomb in Your Build Pipeline? (nixcademy)
[nixcademy.com/posts/what-is-ifd-ups-and-downs](https://nixcademy.com/posts/what-is-ifd-ups-and-downs/)

Lists the real tools that rely on IFD: crane (Rust/Cargo.lock), poetry2nix (Python), bundix (Ruby), node2nix/yarn2nix (JS/TS), cabal2nix/haskell.nix (Haskell), opam2nix (OCaml) — all trading manual Nix-expression maintenance for evaluation-time builds. States the ban plainly: "Import From Derivation is not allowed in flakes that are indexed by search.nixos.org... building arbitrary stuff from the internet is a bad idea for security, and it'd slow things down." Recommends IFD only where the lock file is the true source of truth and forbids it in shared infrastructure serving many downstream consumers, since "wait times that may be negligible in an upstream project" compound for everyone downstream.

### 9. Flakes aren't real and cannot hurt you (Jade Lovelace, jade.fyi)
[jade.fyi/blog/flakes-arent-real](https://jade.fyi/blog/flakes-arent-real/)

Central claim: flakes are "a special entry point for Nix code with a built-in pinning system, nothing more, nothing less," explicitly pushing back on "flakes are the future" framing. Names concrete pitfalls: flake inputs fetched via builtin fetchers "block further evaluation while fetching," serializing what could be parallel downloads; "flakes don't support cross compilation" configuration parameters; and "locking dependencies of subprojects is often highly undesirable" in medium-sized multi-package repos because flakes "couple version control integration, dependency management and lockfile management." Recommends keeping `flake.nix` thin (an entry point only), moving packaging to `callPackage`d `package.nix` files and overlays, and considering alternate pinning tools (Niv, npins, gridlock) that write plain fetchurl-calling Nix instead of relying on flake inputs for build-time fetches.

### 10. Some notes on nix flakes (Julia Evans, jvns.ca, 2023-11-11)
[jvns.ca/blog/2023/11/11/notes-on-nix-flakes](https://jvns.ca/blog/2023/11/11/notes-on-nix-flakes/)

First-run practitioner account. Most-quoted line: "if you're in a git directory and your `flake.nix` file isn't tracked by git yet... nix will COMPLETELY IGNORE YOUR FILE" — required an explicit `git add` before any evaluation worked. Reports cryptic build errors ("getting status of '/nix/store/...': No such file or directory"), unpredictable failures from `path:../` relative-path inputs requiring `flake.lock` deletion to recover, and a measured performance regression (7s to add a package via flakes vs. 2s via `nix-env`). Pragmatic conclusion: her reason to use Nix at all is "nix has more binary packages than Homebrew does," not philosophical purity; she deliberately avoids home-manager to keep her config legible.

### 11. How safe is follows? (Farid Zakaria, fzakaria.com, 2026-08-31)
[fzakaria.com/2026/08/31/how-safe-is-follows](https://fzakaria.com/2026/08/31/how-safe-is-follows)

Empirically analyzes 10,754 flakes and finds 3,261 distinct nixpkgs revisions among them. Central risk framing: forcing `follows` onto a flake is "time-traveling" its dependency onto a nixpkgs revision the author never tested against, "counter to the philosophy of Nix which deems 'reproducibility' as a core principle." Concrete safety heuristic given: revision-age delta is the real risk signal — "days or weeks newer... likely to be safe," "several months or years newer" significantly riskier — not the mere presence of a `follows` declaration.

### 12. One flake to rule them all / omniflake (Farid Zakaria, fzakaria.com, 2026-08-28)
[fzakaria.com/2026/08/28/one-flake-to-rule-them-all](https://fzakaria.com/2026/08/28/one-flake-to-rule-them-all)

Built "omniflake," a single flake exposing ~12,000 flakes as one input. Discovered and fixed a quadratic-time bug in Nix's own `flake.lock` input-naming collision resolution (`NixOS/nix#16387`): the old code restarted its collision search at `_2` every time, causing ~8,000,000 string-formats at ~1,000 collisions; the fix remembers the highest suffix seen per name. Measured ~21x speedup for 4,000 inputs, lock files verified bitwise identical before/after. Directly relevant to any generator (like an ocx-index flake) that might emit thousands of inputs into one lock file.

### 13. How to piss off your Nix friends (Farid Zakaria, fzakaria.com, 2026-07-18)
[fzakaria.com/2026/07/18/how-to-piss-off-your-nix-friends](https://fzakaria.com/2026/07/18/how-to-piss-off-your-nix-friends/)

Opinion piece, notable for a dissenting take on flakes themselves from inside the pro-Nix camp: "flakes are unremarkable" — subjectively "evaluations feel slower," and it's an open question whether flakes deliver more than pinning tools like npins/niv already did. Also argues multi-user Nix installation should not be the default for a typical single-user machine, and that macOS support draws effort away from Linux.

### 14. What is nixConfig, should you trust it? (nixConfig trust model — corroborated via NixOS/nix issue tracker, primary source below since the blog itself blocked automated fetch with a bot-challenge)

Multiple primary NixOS/nix issues describe the same trap consistently: [`#6752`](https://github.com/NixOS/nix/issues/6752) — an untrusted user is prompted to set `extra-trusted-public-keys` from a flake's `nixConfig` and then Nix ignores the answer; [`#9788`](https://github.com/NixOS/nix/issues/9788) — the same warning ("ignoring untrusted substituter... you are not a trusted user") repeats even after explicit rejection. Community guidance is consistent: never set `nix.settings.accept-flake-config = true` globally, since it silently expands trust to every flake ever evaluated.

### 15. FlakeHub semver docs (Determinate Systems)
[docs.determinate.systems/flakehub/concepts/semver](https://docs.determinate.systems/flakehub/concepts/semver/)

Defines FlakeHub's SemVer subset: exact match (`=0.1.15`), and wildcards (`*`, `1.*`, `1.2.*`). Tagged releases resolve `https://flakehub.com/f/:org/:project/:tag`; rolling releases encode `major.minor.<commit-count>` (major fixed, minor tracks a branch identity, patch = commit count) — e.g. Helix's rolling release is `0.1.6953` for its 6953rd commit. This is the only widely-used mechanism in the corpus that gives flakes real, resolvable version ranges; plain git tags/`flake.lock` pinning give none.

### 16. FlakeHub best practices (Determinate Systems docs)
[docs.determinate.systems/flakehub/best-practices](https://docs.determinate.systems/flakehub/best-practices/)

Explicit recommendations: "use semantic versioning," "publish... one flake per versioned thing" rather than one monolith ("when in doubt, create and publish another flake"), keep dependency inputs current via the Flake Checker Action and update-flake-lock Action, and apply "principle of least access" (private-by-default flakes) unless public distribution is the point.

### 17. Extensible flake outputs with flake schemas (Determinate Systems blog, 2023-era; docs updated through 2026)
[determinate.systems/blog/flake-schemas](https://determinate.systems/blog/flake-schemas/)

Problem stated: `nix flake show`/`nix flake check` only understand built-in output types, so custom outputs (e.g. `lib`) are opaque to tooling. Solution: a flake declares a `schemas` output (functions that enumerate/validate other outputs), e.g. `outputs = { self, flake-schemas }: { schemas = flake-schemas.schemas; ... };`. At time of writing this was a proposed upstream PR, not yet merged into CppNix — flake schemas remain a Determinate-ecosystem convention, not a universal one, as of 2026-09-27.

### 18. Determinate Nix 3.0 — formal stability guarantee for flakes (Determinate Systems, 2025-03-05)
[determinate.systems/blog/determinate-nix-30](https://determinate.systems/blog/determinate-nix-30/)

States: "we've fulfilled that promise by offering a formal stability guarantee for flakes, making them production ready today," explicitly "while flakes remain experimental in upstream Nix." No SLA, rollback procedure, or compensation terms are specified in the announcement — this is a vendor commitment layered on top of an upstream-experimental feature, not a change to upstream's own stability posture (confirmed independently against nix.dev's own "experimental extension format with outstanding issues" language, still current as of this survey).

### 19. Changelog: introducing lazy trees (Determinate Systems, Determinate Nix 3.5.2+)
[determinate.systems/blog/changelog-determinate-nix-352](https://determinate.systems/blog/changelog-determinate-nix-352/)

Mechanism: "Nix uses a virtual filesystem to gather the necessary file state prior to copying anything to the Nix store, 'mounting' lazy source inputs to this virtual filesystem at `/nix/store/<random-hash>`" — only files actually read by an expression get copied. Measured: 3x+ wall-time reduction on nixpkgs evaluation; disk usage reduced 20x+ (one example: 304 MB → 13 MB); a GitHub Actions `stdenv` eval case went from ~11s/433 MB to ~3.5s/11 MB. Status: Eelco Dolstra has an open PR (`NixOS/nix#13225`) to bring lazy trees upstream — as of this survey it is still Determinate-only, a live behavioral divergence from CppNix.

### 20. End of life for the free tier of the Magic Nix Cache (Determinate Systems)
[determinate.systems/blog/magic-nix-cache-free-tier-eol](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/)

Free tier ended 2025-02-01 because GitHub deprecated the (undocumented) v1 Actions cache API Magic Nix Cache depended on and did not release the new Twirp/Protobuf API's `.proto` sources in time for a compatible migration. Migration path offered: FlakeHub Cache (one month free via coupon `FHC`; free accounts for OSS maintainers on request). Note: a later community PR (jchv) restored a compatible Magic Nix Cache Action against the new API, so "free CI caching returned" but only after an interruption — cited here as a durability lesson about depending on a single vendor's free CI cache.

### 21. nix.dev — Flakes concept page (official, current)
[nix.dev/concepts/flakes.html](https://nix.dev/concepts/flakes.html)

The still-current official framing, in tension with vendor "production ready" claims: "Flakes are an experimental extension format with outstanding issues... including around versioning, composability, cross-compilation, and tight coupling with nixpkgs." Also documents "flakes have no parameters," the git-tracked-files requirement, and recommends considering `npins` for pinning "unless actively contributing to flake development or using existing flake-based projects" — an official document actively steering users away from flakes for simple pinning needs.

### 22. Import From Derivation — Nix 2.35.2 Reference Manual (primary, fetched verbatim)
[nix.dev/manual/nix/2.35/language/import-from-derivation](https://nix.dev/manual/nix/2.35/language/import-from-derivation)

Exact text: "Passing an expression `expr` that evaluates to a store path to any built-in function which reads from the filesystem constitutes Import From Derivation (IFD)" — enumerates the trigger set precisely: `import expr`, `builtins.readFile expr`, `builtins.readFileType expr`, `builtins.readDir expr`, `builtins.pathExists expr`, `builtins.filterSource f expr`, `builtins.path { path = expr; }`, `builtins.hashFile t expr`, `builtins.scopedImport x drv`. States the mechanism and cost precisely: "Since the Nix language evaluator is sequential, it only finds store paths to read from one at a time" so realisation "cannot be done for all required store paths at once." Documents the escape hatch: `allow-import-from-derivation = false` disables IFD realisation during evaluation entirely.

### 23. nixpkgs pkgs/by-name/README.md (primary, fetched verbatim)
[github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md)

Canonical structure: `pkgs/by-name/<2-letter-lowercase-prefix>/<attr-name>/package.nix`, e.g. `pkgs/by-name/so/some-package/package.nix`; "Packages found in the name-based structure are automatically included, without needing to be added to `all-packages.nix`." A `by-name` package "cannot refer to files outside their own directory" (enforced in CI by the `nixpkgs-vet` tool, per corroborating search results) — the closest sibling convention if an ocx-generated flake ever wants a self-contained, per-package directory layout of its own.

### 24. Lix — Flakes feature freeze (Lix wiki, primary project source)
[wiki.lix.systems — Flakes feature freeze](https://wiki.lix.systems/books/lix-contributors/page/flakes-feature-freeze) (search-corroborated content, blog corroboration at [lix.systems/blog](https://lix.systems/blog/))

States Lix is "not deprecating flakes" ("the way that the majority of people use Nix today") but has frozen "the Flake feature set and semantics at its current point, excluding bugfixes" — no new input types, no new fetcher features, no flake-centered evaluator changes. Long-term plan: extract flakes out of Lix core into a separate plugin so third parties can build flake-equivalent mechanisms without forking the evaluator. Explicit non-goal: flakes "will remain an experimental feature and explicitly not be stabilized" in Lix, contra Determinate's stability guarantee.

### 25. Best practices for managing Nix flakes in a team monorepo (NixOS Discourse, 2026-06-21)
[discourse.nixos.org/t/78428](https://discourse.nixos.org/t/best-practices-for-managing-nix-flakes-in-a-team-monorepo/78428)

No settled consensus: top reply states "there's no one-size-fits-all answer" and recommends paid consultancy engagement for monorepo flake architecture, explicitly flags flake-parts as a candidate that "might also be the completely wrong approach" depending on team shape (dev-focused vs DevOps-focused). Useful as evidence that even the community's own forum treats monorepo flake layout as unsolved, not as a solved-and-documented pattern.

### 26. Should I use flake or not (NixOS Discourse, 2023-07-03)
[discourse.nixos.org/t/29964](https://discourse.nixos.org/t/should-i-use-flake-or-not/29964)

Community-settled middle ground for beginners: don't switch immediately; traditional modular `configuration.nix` imports are "adequate... for personal use," while flakes bring real value mainly for reproducibility (`flake.lock` recording every input revision) and interoperability with things like Home Manager. Consensus line: flakes are "getting simpler all the time," so defer adoption rather than reject it.

### 27. numtide/blueprint (GitHub README, primary)
[github.com/numtide/blueprint](https://github.com/numtide/blueprint/blob/main/README.md)

Status badge: "experimental." Maps a fixed folder convention directly to flake outputs without a module system: `devshells/` → `devShells.*`, `hosts/` → `nixosConfiguration.*`/`darwinConfigurations.*`, `modules/` → `nixosModules.*`/`darwinModules.*`, `packages/` → `packages.*`. Positioned explicitly as "no module system — just a small library of vanilla Nix," the opposite design bet from flake-parts.

### 28. nix-systems/nix-systems (GitHub README, primary)
[github.com/nix-systems/nix-systems](https://github.com/nix-systems/nix-systems)

Status: "beta." States the exact problem it solves: "why should a command like `nix flake show` display all systems when the user only cares about just one? Or reversely, potentially the flake might support building against more architectures that the flake author have tested. Is the user supposed to fork every flake to add their architecture?" Solution pattern: a flake takes `inputs.systems.url = "github:nix-systems/default"` and does `eachSystem = nixpkgs.lib.genAttrs (import systems);`, letting a downstream consumer override which systems are iterated by pointing `systems` elsewhere — externalizing a decision flake-utils hard-codes.

### 29. devenv 2.0 and devenv-with-flakes docs (Domen Kozar / cachix, devenv.sh)
[devenv.sh/blog](https://devenv.sh/blog/) · [devenv.sh/guides/using-with-flakes](https://devenv.sh/guides/using-with-flakes/)

Positions devenv as a UX layer above raw `devShells`/direnv: devenv's own activation "replaces direnv for cd-based activation... requiring no `.envrc` or external dependencies," and claims plain `devenv.nix` gives "better simplicity, faster evaluation and more efficient caching" than routing the same environment through a flake's `devShells` output — an argued position that a flake is not always the best distribution mechanism even for the devShell use case flakes were partly designed for. Direct critique of direnv: it "can lock up the prompt for thirty seconds during rebuilds," which native `devenv shell` avoids with a background rebuild and status line.

### 30. Git submodules and LFS as flake inputs (NixOS/nix docs + issue/PR trail, primary + search-corroborated)
[NixOS/nix PR #12421](https://github.com/NixOS/nix/pull/12421), [NixOS/nix issue #4423](https://github.com/NixOS/nix/issues/4423), Nix 2.28 release notes ([rl-2.27](https://nix.dev/manual/nix/2.28/release-notes/rl-2.27))

Submodule support exists via `git+https://...?submodules=1` or `inputs.self.submodules = true`, but a `path:`-typed input used for a local submodule "bypasses flake.lock versioning entirely" — the lock entry has only `type: path` and the local path, no `narHash`/`rev`, so `nix flake lock --update-input` is a silent no-op for it; the real update path is `git submodule update --remote`. Git LFS support in the git fetcher (`lfs = true`, or `inputs.self.lfs = true`) landed only around Nix 2.27 (2025-03-03 per the release notes) — flakes evaluated with older Nix silently get LFS pointer text instead of file content, with no error.

## Candidate topics

| Topic (a question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| When must a flake input declare `inputs.nixpkgs.follows`, and how does a consumer detect duplicate nixpkgs instances in `flake.lock`? | Single largest documented perf/UX failure mode in the corpus ("1000 instances") | [zimbatm](https://zimbatm.com/notes/1000-instances-of-nixpkgs) | no | inputs-lock | P0 |
| Is `follows`-ing a dependency's nixpkgs input actually safe, and by what signal (revision age, not mere presence of `follows`)? | Directly contradicts the naive "just add follows everywhere" advice | [fzakaria how-safe-is-follows](https://fzakaria.com/2026/08/31/how-safe-is-follows) | no | inputs-lock | P0 |
| Should a new flake use flake-utils, flake-parts, nix-systems + genAttrs, or hand-rolled code for multi-system outputs? | Governs the shape of every generated/authored flake in the program | [ayats.org](https://ayats.org/blog/no-flake-utils), [nixcademy](https://nixcademy.com/posts/1000-instances-of-flake-utils/), [nix-systems](https://github.com/nix-systems/nix-systems) | no | flake-schema | P0 |
| What exactly triggers Import From Derivation, and when does it become an organizational anti-pattern vs a legitimate tool (crane/poetry2nix-style)? | Determines whether a generated ocx-index flake is allowed to do "clever" IFD-based generation | [nix.dev manual 2.35 IFD](https://nix.dev/manual/nix/2.35/language/import-from-derivation), [nixcademy IFD](https://nixcademy.com/posts/what-is-ifd-ups-and-downs/) | no | fetchers | P0 |
| Are files invisible to a flake because they're git-untracked, and what's the first-run failure signature? | The single most-reported first-contact bug in the corpus | [Julia Evans](https://jvns.ca/blog/2023/11/11/notes-on-nix-flakes/), [RFC 0049](https://github.com/tweag/rfcs/blob/flakes/rfcs/0049-flakes.md) | no | consumer-ux | P0 |
| What does `nixConfig` in `flake.nix` actually do for a trusted vs untrusted user, and is it ever safe to ship? | Security-adjacent UX trap named by H8; directly relevant to publishing guidance | [NixOS/nix #6752](https://github.com/NixOS/nix/issues/6752), [#9788](https://github.com/NixOS/nix/issues/9788) | no | security | P0 |
| How should a flake be versioned for consumers — git tags alone, FlakeHub SemVer, or rolling commit-count versions? | No upstream answer exists; FlakeHub is the only real answer in the corpus | [FlakeHub semver](https://docs.determinate.systems/flakehub/concepts/semver/) | no | release-versioning | P0 |
| What is nixpkgs' own `pkgs/by-name` convention, and should a generated multi-package flake mirror it? | Direct template candidate for the ocx-index-generated flake's internal layout | [pkgs/by-name/README.md](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md) | partial (python/rust packaging sets touch stdenv, not flake layout) | generated-flakes | P0 |
| Do flakes behave identically across CppNix, Lix and Determinate Nix, or does published flake need per-implementation testing? | H9 directly; "lazy trees" and Lix's feature freeze are concrete, current divergences | [Determinate lazy trees changelog](https://determinate.systems/blog/changelog-determinate-nix-352/), [Lix flakes feature freeze](https://wiki.lix.systems/books/lix-contributors/page/flakes-feature-freeze) | no | impls | P0 |
| What's the current recommended source-filtering mechanism (`lib.fileset` vs `cleanSourceWith`) and what does each guarantee about accidental whole-repo store copies? | Names a "boring but bites" pitfall the brief explicitly calls out | [Tweag file sets](https://www.tweag.io/blog/2023-11-28-file-sets/) | no | lang | P0 |
| Should a library flake pin its own nixpkgs at all, or leave it to the consumer? | Named directly in the brief's "argued positions" list; contested (see below) | [zimbatm](https://zimbatm.com/notes/1000-instances-of-nixpkgs), [jade.fyi](https://jade.fyi/blog/flakes-arent-real/) | no | flake-schema | P0 |
| When does a flake even need to exist — what's the actual decision test for "should my project have a flake"? | Governs whether ocx or fleet tools should default to shipping a flake at all | [Discourse should-i-use-flake-or-not](https://discourse.nixos.org/t/should-i-use-flake-or-not/29964), [jade.fyi](https://jade.fyi/blog/flakes-arent-real/) | no | consumer-ux | P0 |
| Is upstream Nix's "flakes are experimental" stance still true in Nix 2.35, and how does that conflict with vendor claims that flakes are production-stable? | Directly resolves/contradicts H9 and sets the tone for how confidently the rule can recommend flakes | [nix.dev/concepts/flakes.html](https://nix.dev/concepts/flakes.html), [Determinate Nix 3.0](https://determinate.systems/blog/determinate-nix-30/) | no | flake-schema | P0 |
| What does `nix flake check --no-build` actually validate, and what false-positive/false-negative gaps does it have (non-derivation `packages`, missing `formatter`/`checks`)? | H3 directly; a rule needs to know what the gate does and does not catch | toolchain (`nix flake --help`, confirmed live), [nix.dev flakes concept](https://nix.dev/concepts/flakes.html) | partial (needs a grounding-corpus run, not just docs) | checks-ci | P0 |
| How does a quadratic-time bug in flake.lock's input-naming collision search manifest, and at what input count does it matter? | Directly relevant to an ocx-index-generated flake with potentially thousands of package inputs | [fzakaria omniflake](https://fzakaria.com/2026/08/28/one-flake-to-rule-them-all), [NixOS/nix#16387](https://github.com/NixOS/nix/issues/16387) | no | generated-flakes | P0 |
| What is a "flake schema" (the `schemas` output), what problem does it solve for `nix flake show`/`check`, and is it stable/adopted enough to rely on? | Emerging mechanism, vendor-pushed, not yet upstream — needs a clear yes/no on adoption | [Determinate flake schemas](https://determinate.systems/blog/flake-schemas/) | no | flake-schema | P1 |
| How does git-submodule support in flake inputs interact with `flake.lock` (and why does it silently stop updating)? | Named directly in the brief's "boring but bites" list | [NixOS/nix PR #12421](https://github.com/NixOS/nix/pull/12421) | no | inputs-lock | P1 |
| At what Nix version did Git LFS support land in flake inputs, and what happens on older Nix (silent pointer-file corruption)? | Named directly in the brief's "boring but bites" list | [Nix 2.28 release notes rl-2.27](https://nix.dev/manual/nix/2.28/release-notes/rl-2.27) | no | inputs-lock | P1 |
| What exactly does `nixpkgs-vet`/the by-name CI check enforce, and does it forbid cross-directory references the way an ocx-generated tree might need? | Direct constraint on the shape of a generated multi-package flake | [pkgs/by-name/README.md](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md) | no | generated-flakes | P1 |
| Is `flake-parts`' NixOS-module-system approach worth its added conceptual weight over blueprint's convention-only folder mapping, for a from-scratch generated flake? | Direct design fork for the ocx-generated-flake artifact | [numtide/blueprint README](https://github.com/numtide/blueprint), [ayats.org](https://ayats.org/blog/no-flake-utils) | no | generated-flakes | P1 |
| What does FlakeHub's "rolling release" versioning scheme (commit-count-as-patch) actually encode, and is it meaningful outside FlakeHub's own resolver? | Concrete, unusual versioning convention worth knowing before recommending semver for flakes | [FlakeHub semver](https://docs.determinate.systems/flakehub/concepts/semver/) | no | release-versioning | P1 |
| What CI caching options exist for a published flake (cache.nixos.org, Cachix, FlakeHub Cache, self-hosted attic), and what are their durability/cost tradeoffs given Magic Nix Cache's own free-tier death? | Named directly by the brief; has a documented cautionary case | [Magic Nix Cache EOL](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/) | no | cache | P1 |
| Does `devShells` + direnv or a dedicated tool (devenv) give a better UX for a flake's development environment, and at what team size does the tradeoff flip? | Named directly by the brief ("devShells vs direnv") | [devenv.sh blog](https://devenv.sh/blog/), [devenv using-with-flakes](https://devenv.sh/guides/using-with-flakes/) | no | devshell | P1 |
| What is `lib.fileset`'s actual API surface (`toSource`, `union`, `intersection`, `difference`, `fileFilter`) and where does `cleanSourceWith` still make more sense? | Filling in P0 topic above with concrete API detail | [Tweag file sets](https://www.tweag.io/blog/2023-11-28-file-sets/) | no | lang | P1 |
| When flakes disagree with CppNix/Lix/Determinate Nix on lazy evaluation of source trees, what breaks for a consumer building on the "wrong" implementation? | Concrete behavioral-divergence surface named by H9 | [Determinate lazy trees changelog](https://determinate.systems/blog/changelog-determinate-nix-352/) | no | impls | P1 |
| What did the original flakes RFC (0049) get right that shipped, and what did it leave unresolved that later "flakes are experimental" language still points at? | Grounds the "experimental" framing in an actual documented gap list rather than folklore | [RFC 0049](https://github.com/tweag/rfcs/blob/flakes/rfcs/0049-flakes.md) | no | flake-schema | P1 |
| Should a monorepo use one root flake, per-package flakes, or a hybrid, and how is `flake.lock` churn/merge-conflict risk managed at scale? | Named by the brief; unresolved even in the community's own forum | [Discourse team-monorepo thread](https://discourse.nixos.org/t/best-practices-for-managing-nix-flakes-in-a-team-monorepo/78428) | no | flake-schema | P1 |
| What are the concrete, version-dated differences between CppNix's flakes-as-experimental stance, Determinate Nix's stability guarantee, and Lix's feature-freeze — and which should a published flake's docs cite? | Directly resolves H9 with three dated, contradicting primary positions | [nix.dev flakes](https://nix.dev/concepts/flakes.html), [Determinate Nix 3.0](https://determinate.systems/blog/determinate-nix-30/), [Lix feature freeze](https://wiki.lix.systems/books/lix-contributors/page/flakes-feature-freeze) | no | impls | P1 |
| How does `nix-systems`' externally-overridable systems list differ in practice from flake-utils' baked-in `allSystems`/`defaultSystems`, for a consumer who wants to build on an unsupported architecture? | Concrete mechanism a generated flake could adopt for cross-arch extensibility | [nix-systems README](https://github.com/nix-systems/nix-systems) | no | systems | P1 |
| What deprecation/rename churn has hit common flake idioms in the last 18-24 months (`stdenv.lib`→`lib`, `nixpkgs-fmt`→`nixfmt-rfc-style`/`nixfmt`, etc.) and which still appear in the exemplar corpus? | H1 directly; needs grounding-corpus cross-check, not just this survey | grounding wave (not this corpus) | partial | lang | P1 |
| Does `nix flake check` catch a devShell/package that only builds on the author's home system, or does cross-system breakage require separate CI matrix testing? | H3's "fail on another system" half | toolchain confirmation needed | partial | checks-ci | P1 |
| What FlakeHub-specific URL syntax exists (`https://flakehub.com/f/:org/:project/:version`) and how does a consumer pin vs range against it from a plain `flake.nix`? | Consumer-facing mechanics of the one working semver channel | [FlakeHub semver docs](https://docs.determinate.systems/flakehub/concepts/semver/) | no | consumer-ux | P2 |
| What specifically does the Flake Checker Action / `flake-checker` CLI flag (outdated nixpkgs, non-NixOS owner, unsupported ref) and how would a generated flake wire it into CI? | Toolchain confirmed CLI flags exist (`--check-outdated`, `--check-owner`, `--check-supported`) — needs a worked example | toolchain (`flake-checker --help`, confirmed live) | no | checks-ci | P2 |
| What exact `statix` lint IDs (W01-W23 confirmed live) fire on common flake-authoring anti-patterns (e.g. `with pkgs;`, `rec` attrsets), and which ones a flake-quality rule should gate on? | Toolchain-confirmed lint catalog exists; needs mapping to the H1 dated-idiom list | toolchain (`statix list`, confirmed live) | partial | formatter-lint | P2 |
| Does `update-flake-lock` (the GitHub Action) or a hand-rolled cron cover lock-update cadence better, and what's the merge-conflict risk of automated PRs against `flake.lock`? | Named directly by the brief ("lock update cadence") | [FlakeHub best practices](https://docs.determinate.systems/flakehub/best-practices/) | partial | inputs-lock | P2 |
| What's the actual mechanism and failure mode when `SOURCE_DATE_EPOCH` is pinned to 1 for a local (non-fetched) `src`, and does that break reproducibility claims for dev-loop flake builds? | Named directly ("timestamp and version reproducibility") | search-corroborated ([NixOS/nixpkgs#112595](https://github.com/NixOS/nixpkgs/issues/112595)) | no | packaging | P2 |
| Does a fixed-output-hash fetch (`fetchurl`/`fetchFromGitHub`) actually drift over time (e.g. GitHub-generated patch/tarball content changing), and how should a flake author react to a hash mismatch? | Named directly ("fixed-output hash drift") | search-corroborated (GitHub patch short-hash drift reports) | no | fetchers | P2 |
| How do `allowUnfree`/`permittedInsecurePackages` gates interact with a flake (which has no user `config.nix` by default), and what's the idiomatic way to set them in `flake.nix`? | Named directly ("unfree and insecure package gates") | grounding-corpus cross-check needed | no | packaging | P2 |
| What breaks for a flake on Darwin that works on Linux (path assumptions, `stdenv` differences, `autoPatchelfHook` not applying), and where is this best tested without owning a Mac? | Named directly ("darwin versus linux differences") | nix-darwin ecosystem (needs its own fetch) | no | systems | P2 |
| What's the actual state of flake cross-compilation support given Jade Lovelace's claim that "flakes don't support cross compilation" configuration — is this still true in Nix 2.35? | Directly tests a specific practitioner claim against current behavior | [jade.fyi](https://jade.fyi/blog/flakes-arent-real/) — needs toolchain verification | no | packaging | P2 |
| Is `nix flake show`'s output trustworthy for discovering what a third-party flake actually provides, or do non-standard/undeclared outputs hide real functionality from it? | Ties flake schemas' stated problem to a concrete consumer-facing check | [Determinate flake schemas](https://determinate.systems/blog/flake-schemas/) | no | consumer-ux | P2 |
| What's the actual argument for/against exposing raw `overlays` vs only `packages` from a library flake, and which does the corpus's generated-flake exemplars (zig-overlay etc.) do? | Named directly by the brief ("exposing overlays vs packages") — needs the generated-flake-specific corpus, only lightly touched here | this corpus (light) + generated-flakes corpus (primary) | partial | flake-schema | P2 |
| Does supporting non-flake users (`default.nix` + `flake-compat`) still matter in 2026, or has the ecosystem moved past needing it? | Named directly by the brief | jade.fyi implies yes via non-flake primitives; needs a dedicated check against current flake-compat maintenance status | no | consumer-ux | P2 |
| What evaluation-determinism guarantees does Nix actually make across `x86_64-linux`/`aarch64-darwin` for the *same* flake, beyond "the lock file pins the same inputs"? | Named directly ("evaluation determinism across systems") | needs dedicated primary-source check (Nix manual determinism section) | no | lang | P2 |
| Is Determinate Nix's "formal stability guarantee" a marketing claim or does it come with an actual enforceable mechanism (e.g. a compatibility test suite, versioned flake-schema contract)? | Directly interrogates H9 / vendor-vs-upstream tension found in this survey | [Determinate Nix 3.0](https://determinate.systems/blog/determinate-nix-30/) | no | impls | P2 |
| Given Lix's flake feature freeze, does a flake published today risk losing functionality on Lix as flakes get extracted into a separate plugin, or is the freeze purely additive-feature-only? | Direct forward-looking risk for a "publish once, works everywhere" flake | [Lix flakes feature freeze](https://wiki.lix.systems/books/lix-contributors/page/flakes-feature-freeze) | no | impls | P2 |
| How exactly does string context (`builtins.unsafeDiscardStringContext`, `${drv}` interpolation) trip up flake authors trying to pass a store path around, and is this a common enough footgun to name explicitly? | Named directly ("string context") — this corpus only lightly touches it | needs dedicated language-corpus check | no | lang | P3 |
| What does path-vs-string coercion actually cost (accidental whole-directory store copies from a bare `./.` reference) beyond what `lib.fileset` fixes? | Named directly ("path vs string coercion and store copying") — partially covered via file-sets survey above | [Tweag file sets](https://www.tweag.io/blog/2023-11-28-file-sets/) | partial | lang | P3 |
| Is there a documented, argued position on whether generated/index-driven flakes (zig-overlay, rust-overlay style) should commit their generated Nix or regenerate it via IFD at eval time? | Directly informs the ocx-index-flake generator design, but properly belongs to the generated-flakes corpus | this corpus only glances at it via IFD survey | no | generated-flakes | P0 (belongs to generated-flakes corpus primarily) |
| Do any practitioner sources argue nixpkgs upstreaming vs standalone-flake-distribution as the right home for a new package, and what tips the decision? | Relevant to whether ocx packages should ever aim at nixpkgs proper vs stay a generated flake | not directly covered in this corpus | no | publishing | P3 |
| What's the actual UX difference for a consumer between `nix run github:org/repo` (no flake pin) and a pinned FlakeHub URL, in terms of what gets silently re-resolved on each invocation? | Consumer-UX-critical, ties registry/no-lock-file behavior to the FlakeHub pinning story | [FlakeHub semver docs](https://docs.determinate.systems/flakehub/concepts/semver/) implies but doesn't state directly | no | consumer-ux | P2 |

## Recent shifts seen in this corpus

- **Determinate Nix 3.0 (2025-03-05)** issued a unilateral "formal stability guarantee for flakes" — the first time any Nix distribution has called flakes production-ready, while upstream CppNix's own manual (checked live, 2026-09-27, against nix.dev/concepts/flakes.html) still calls them "an experimental extension format with outstanding issues." Any pre-2025 "flakes are just experimental, full stop" advice is now contested, not settled.
- **Lazy trees (Determinate Nix 3.5.2+, PR against upstream still open as of this survey)** change evaluation performance characteristics materially (3x+ time, 20x+ disk) but are not yet in CppNix — advice written against pre-lazy-tree Nix undercounts how fast flake evaluation can be, and advice assuming lazy trees exist everywhere overstates current CppNix behavior.
- **Lix's flake feature freeze (Lix 2.94-2.95, dated blog posts through 2026-03-25)** is new: pre-freeze advice that assumed Lix would keep adding flake features alongside CppNix is now stale; Lix's stated direction (extract flakes to a plugin) is a divergence point CppNix does not share.
- **`lib.fileset` (landed nixpkgs 23.11, discussed by Tweag 2023-11-28)** is now the recommended source-filtering mechanism; any pre-2023 advice centered purely on `lib.cleanSourceWith`/`builtins.filterSource` is superseded, though the older functions are not removed.
- **Git LFS support in the git fetcher (~Nix 2.27, 2025-03-03)** is new; any flake-authoring guidance written before 2025 that says "flakes can't use LFS-tracked files" is stale, but guidance also needs to flag that pre-2.27 consumers still silently get pointer files.
- **`nixpkgs-vet`-enforced `pkgs/by-name` structure** is now nixpkgs' default new-package convention (dated to the nixpkgs 23.11+ era per corroborating search results) — advice describing `all-packages.nix` as the only way to add a top-level package is dated.
- **Magic Nix Cache's free-tier interruption (EOL announced for 2025-02-01, later partially reversed by a community PR)** shows CI-caching advice pinned to one vendor's free offering has a documented failure history within the last 18 months — worth flagging as a durability risk in any release/publish guidance rather than treating Magic Nix Cache as a permanent zero-cost default.
- **FlakeHub's rolling-release commit-count versioning and its SemVer wildcard resolver** are both recent (Determinate-ecosystem, actively iterated through 2026 per the "Extensible flake outputs with flake schemas" and "An interface change for flake schemas" posts dated March and June 2026) — this is the only versioning mechanism in the corpus that has changed meaningfully in the last 18-24 months; plain git-tag versioning has not changed at all.
- **The quadratic flake.lock input-naming bug (fixed via `NixOS/nix#16387`, discovered by the omniflake project in 2026)** is a very recent (2026) upstream Nix performance fix directly relevant to any flake with many inputs — pre-fix advice about "just add all your inputs to one flake" understated a real scaling cliff that has now been removed.

## Contested

- **Is flake-utils a bad default, or a defensible convenience?** ayats.org and nixcademy argue against it (obscures systems, causes lock-file dependency bloat via missed `follows`); the counter-position implicit in flake-utils' continued heavy use across the exemplar corpus (per the frame) is that it is still the path of least resistance for a quick multi-system flake. Trend: newer material (2024+ posts) leans toward `nix-systems` + `genAttrs` or flake-parts, away from flake-utils, but flake-utils remains extremely widely deployed in the wild — a "declining but not dead" default.
- **Are flakes stable/production-ready?** Determinate Systems (2025 vendor stability guarantee) says yes for their distribution; upstream nix.dev (checked live) still says experimental with unresolved design problems; Lix freezes the feature set without stabilizing it. Trend: the vendor position is pulling ahead of the upstream position in public confidence, but the three have not converged — a published flake's docs should probably state which implementation's guarantee it relies on rather than claim "flakes are stable" unqualified.
- **Should a library flake pin nixpkgs, or leave it fully to the consumer via `follows`?** zimbatm's "1000 instances" post argues for aggressive `follows`-ing to share instances; fzakaria's "how safe is follows" post argues `follows` itself can silently break a flake by testing it against nixpkgs revisions its author never validated. Trend: no resolution in this corpus — both positions are live and argued by credible, cited authors in the same 2022-2026 window; the practical synthesis implied (not stated outright by either) is "follows for shared build-time deps, but check revision-age delta before assuming it's safe."
- **Is IFD acceptable in a well-run project, or a trap to avoid entirely?** Real, widely-used tools (crane, poetry2nix, cabal2nix) depend on it; nixcademy's own survey calls it "not a silver bullet" requiring explicit organizational policy; nixpkgs/search.nixos.org bans it outright for indexed flakes. Trend: consensus is converging on "IFD is fine for a leaf/application flake evaluated once, risky for infrastructure other projects build on top of" — this is a nuanced middle position, not a flat yes/no, and any rule should reflect that rather than a blanket ban or blanket allowance.
- **Is Nix (and flakes specifically) worth the complexity for an individual/small team?** Julia Evans (pragmatic: keeps it minimal, values raw binary-package availability, later reportedly reduced her own usage per search-corroborated follow-up) and Farid Zakaria (a committed daily user who still calls flakes "unremarkable" versus pinning tools alone) represent a skeptical-insider strand distinct from Determinate Systems' promotional framing. Trend: no convergence; this is closer to a stable disagreement about audience fit than a question with a trend line.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/tweag/rfcs/blob/flakes/rfcs/0049-flakes.md](https://github.com/tweag/rfcs/blob/flakes/rfcs/0049-flakes.md) | Primary — the flakes RFC text (Eelco Dolstra) | 2019-07-09, closed 2020 | Origin document; states the exact motivation and the unresolved-process history everyone else cites |
| [nix.dev/concepts/flakes.html](https://nix.dev/concepts/flakes.html) | Primary — official nix.dev manual/concepts page | current, checked 2026-09-27 | The still-current official "experimental" stance, in direct tension with vendor claims |
| [nix.dev/manual/nix/2.35/language/import-from-derivation](https://nix.dev/manual/nix/2.35/language/import-from-derivation) | Primary — Nix 2.35.2 Reference Manual | Nix 2.35.2, current | Exact IFD trigger list and mechanism, fetched verbatim |
| [github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md) | Primary — nixpkgs' own packaging convention doc | current (23.11+ convention) | Canonical structure; directly informs a generated multi-package flake's own layout |
| [github.com/NixOS/nix/issues/6752](https://github.com/NixOS/nix/issues/6752) | Primary — Nix issue tracker | opened 2022, still open per search | Documents the nixConfig trust-prompt-then-ignore UX trap first-hand |
| [github.com/NixOS/nix/issues/9788](https://github.com/NixOS/nix/issues/9788) | Primary — Nix issue tracker | still open per search | Follow-up confirming the same nixConfig trap persists |
| [github.com/NixOS/nix/issues/16387](https://github.com/NixOS/nix/issues/16387) (referenced via fzakaria) | Primary — Nix issue/PR tracker | 2026 | The quadratic flake.lock-naming fix, directly relevant to generated flakes with many inputs |
| [github.com/numtide/blueprint](https://github.com/numtide/blueprint/blob/main/README.md) | Primary — tool's own repo/README | status: experimental | Convention-only alternative to flake-parts for generated-flake layout |
| [github.com/nix-systems/nix-systems](https://github.com/nix-systems/nix-systems) | Primary — tool's own repo/README | status: beta | Names the exact extensibility problem with hard-coded system lists |
| [docs.determinate.systems/flakehub/concepts/semver](https://docs.determinate.systems/flakehub/concepts/semver/) | Primary — vendor product docs | current, 2026 | Only real SemVer-range resolver for flakes in the ecosystem |
| [docs.determinate.systems/flakehub/best-practices](https://docs.determinate.systems/flakehub/best-practices/) | Primary — vendor product docs | current, 2026 | Concrete, opinionated publishing recommendations |
| [determinate.systems/blog/determinate-nix-30](https://determinate.systems/blog/determinate-nix-30/) | Primary — vendor release announcement | 2025-03-05 | The stability-guarantee claim that reframes H9 |
| [determinate.systems/blog/changelog-determinate-nix-352](https://determinate.systems/blog/changelog-determinate-nix-352/) | Primary — vendor changelog | Determinate Nix 3.5.2+ | Concrete, measured lazy-trees performance divergence from CppNix |
| [determinate.systems/blog/magic-nix-cache-free-tier-eol](https://determinate.systems/blog/magic-nix-cache-free-tier-eol/) | Primary — vendor announcement | announced for 2025-02-01 | Durability cautionary tale for CI-cache dependency choices |
| [determinate.systems/blog/flake-schemas](https://determinate.systems/blog/flake-schemas/) | Primary — vendor blog/proposal | proposed ~2023, iterated through 2026 | The emerging (not-yet-upstream) `schemas` output mechanism |
| [wiki.lix.systems — Flakes feature freeze](https://wiki.lix.systems/books/lix-contributors/page/flakes-feature-freeze) | Primary — Lix project's own wiki | dated to Lix 2.94-2.95 era (through 2026-03-25) | The clearest documented CppNix/Lix divergence on flakes' future |
| [www.tweag.io/blog/2020-05-25-flakes](https://www.tweag.io/blog/2020-05-25-flakes/) | Practitioner (Eelco Dolstra, flakes' designer) | 2020-05-25 | Original schema/tutorial from the person who designed flakes |
| [www.tweag.io/blog/2020-07-31-nixos-flakes](https://www.tweag.io/blog/2020-07-31-nixos-flakes/) | Practitioner (Tweag) | 2020-07-31 | Extends flakes to NixOS system management, origin of "your config should be a flake" |
| [www.tweag.io/blog/2023-11-28-file-sets](https://www.tweag.io/blog/2023-11-28-file-sets/) | Practitioner (Tweag) | 2023-11-28 | Current recommended source-filtering mechanism vs the older cleanSourceWith |
| [zimbatm.com/notes/1000-instances-of-nixpkgs](https://zimbatm.com/notes/1000-instances-of-nixpkgs) | Practitioner (zimbatm/numtide) | 2022-01-26 | The single most-cited flake-UX failure mode in the whole corpus |
| [ayats.org/blog/no-flake-utils](https://ayats.org/blog/no-flake-utils) | Practitioner | undated in fetch, 2023+ era | Concrete argued alternative to flake-utils with code |
| [nixcademy.com/posts/1000-instances-of-flake-utils](https://nixcademy.com/posts/1000-instances-of-flake-utils/) | Practitioner (Nixcademy) | 2024+ era | Data-backed version of the flake-utils critique |
| [nixcademy.com/posts/what-is-ifd-ups-and-downs](https://nixcademy.com/posts/what-is-ifd-ups-and-downs/) | Practitioner (Nixcademy) | current | Balanced, tool-by-tool survey of IFD use and organizational guidance |
| [jade.fyi/blog/flakes-arent-real](https://jade.fyi/blog/flakes-arent-real/) | Practitioner (Jade Lovelace) | widely cited, HN/Lobsters discussed | The strongest anti-flakes-as-default argued position in the corpus |
| [jvns.ca/blog/2023/11/11/notes-on-nix-flakes](https://jvns.ca/blog/2023/11/11/notes-on-nix-flakes/) | Practitioner (Julia Evans) | 2023-11-11 | First-run practitioner account naming the git-untracked-files trap and real perf numbers |
| [fzakaria.com/2026/08/31/how-safe-is-follows](https://fzakaria.com/2026/08/31/how-safe-is-follows) | Practitioner (Farid Zakaria) | 2026-08-31 | Empirical, data-backed contested take on `follows` safety |
| [fzakaria.com/2026/08/28/one-flake-to-rule-them-all](https://fzakaria.com/2026/08/28/one-flake-to-rule-them-all) | Practitioner (Farid Zakaria) | 2026-08-28 | Found and fixed a real upstream Nix performance bug relevant to generated flakes |
| [fzakaria.com/2026/07/18/how-to-piss-off-your-nix-friends](https://fzakaria.com/2026/07/18/how-to-piss-off-your-nix-friends/) | Practitioner (Farid Zakaria) | 2026-07-18 | Dissenting insider opinion on flakes' actual value |
| [discourse.nixos.org/t/best-practices-for-managing-nix-flakes-in-a-team-monorepo/78428](https://discourse.nixos.org/t/best-practices-for-managing-nix-flakes-in-a-team-monorepo/78428) | Practitioner community forum | 2026-06-21 | Most recent, highest-relevance Discourse thread on monorepo flake structure; shows it's unsolved |
| [discourse.nixos.org/t/should-i-use-flake-or-not/29964](https://discourse.nixos.org/t/should-i-use-flake-or-not/29964) | Practitioner community forum | 2023-07-03 | Closest thing to a community-settled "should this be a flake" answer |
| [devenv.sh/blog](https://devenv.sh/blog/) and [devenv.sh/guides/using-with-flakes](https://devenv.sh/guides/using-with-flakes/) | Practitioner (Domen Kozar / cachix) | 2026 (devenv 2.0 era) | Argued devShells-vs-direnv-vs-devenv position from a maintainer with a stake in the answer |
| toolchain: `nix --version`, `flake-checker --help`, `statix list`, `nixfmt --version` (run via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`) | Primary — live confirmed tool output | 2026-09-27 | Ground-truth for exact tool versions and lint catalog IDs cited above |

