# Does grimoire support per-project artifact parameterization? (2026-08-14)

Audited: `/home/mherwig/dev/grimoire` at commit `9f2ff64` (rust `grim` binary).

## Verdict

Grimoire has **no mechanism today** by which an installed artifact (skill,
rule, agent, MCP descriptor, or bundle) can carry values specific to the
consuming project. `grimoire.toml` declares *which* artifacts to install and
*which clients* receive them (`[options]`: `default_registry`, `clients`,
`tui.*`, `show_deprecated`, `vendors.<name>.shared_skills`; `[[registries]]`:
locator/alias/include/exclude/default/insecure) — none of these values ever
reach artifact content. The one string-rewrite pass that exists
(`src/install/mcp_config.rs`) translates `${VAR}` env-var-reference *syntax*
between vendor dialects for MCP server descriptors; it does not inject a
project-supplied value — the variable is still resolved from the OS
environment at the point the client runs the server, and no `grimoire.toml`
key feeds it. Per-artifact customization at `grim add` is limited to four
flags (`--kind`, `--name` for the config binding name, `--force`,
`--install`/`--no-install`) — there is no options table, no path remapping,
and no target-directory override beyond selecting which client(s) receive
the install. There are no post-install hooks and no `grim eject`; a consumer
cannot vendor an artifact and keep it under grim's tracking with local
edits — the *only* two states a locally-touched installed file can be in are
"identical to the recorded content hash" or "modified," and `update`/`add`
either clobber that drift (with `--force`) or refuse outright (exit 65,
default) — there is no three-way merge and no patch/overlay layer. Bundles
and rules have no `extends`/`include`/layering construct: a bundle is a flat
name→identifier member map, and a project rule is a single opaque registry
reference or local path, never a reference to another installed artifact.
The docs explicitly state that installed content lands verbatim, with the
sole exception of `SKILL.md`'s vendor-namespaced frontmatter re-render:
> "Everything in the tree is packed into a single tar layer and installed
> verbatim — only `SKILL.md` itself is ever re-rendered, and only when it
> carries vendor-namespaced metadata keys." (`docs/src/artifacts.md:77-79`)
Nothing in `TODO.md`, `CHANGELOG.md`, the ADR set, or the GitHub issue
templates names artifact parameterization as planned or rejected — it is
simply absent from the design space as documented.

## Mechanism inventory

| # | Mechanism | Present? | file:line | What it actually does |
|---|---|---|---|---|
| 1 | Template/variable substitution at install/render time | **Partial / not for consumer values** | `src/install/mcp_config.rs:19` (`translate_env_refs`), `:42` (`translate_str`) | Rewrites `${VAR}` env-var-reference **syntax** inside an MCP descriptor's string leaves into each vendor's own dialect (`{env:VAR}` for OpenCode, `${env:VAR}` for VS Code/Copilot, identity for Claude). The *value* is never sourced from `grimoire.toml` or any project config — it resolves from the runtime OS environment when the client launches the MCP server. `src/install/render.rs:1-24` is the only other "render" pass, and it is vendor-frontmatter field projection (`claude.model` → native YAML `model:`), not value injection — see the module doc "the projection is deterministic: identical input yields byte-identical output." |
| 2 | Consumer-side config reaching the artifact | **Absent** | `src/config/declaration.rs:182-223` (`ConfigOptions`), `:373-397` (`DesiredSet`) | Every accepted key enumerated: `[options] default_registry, clients, tui.{default_view,group_by_type,tree_separators,expand_levels}, show_deprecated, vendors.<client>.shared_skills`, plus `[[registries]] alias, oci, index, include, exclude, default, insecure`. All of these steer *installer behavior* (which registry, which client, which files are browsable) — none is a value an artifact's own content can read. `DesiredSet` (`skills`/`rules`/`agents`/`bundles`/`mcp`) is a flat `name → DeclaredSource` map (`declaration.rs:373-387`); a `DeclaredSource` is only a registry `Identifier` or a `PathSource` (`declaration.rs:29-53`) — no side-channel data field exists on a declaration. |
| 3 | Per-artifact overrides at add time | **Absent beyond identity/behavior flags** | `src/command/add.rs:57-102` (`AddArgs`, `InstallOnAdd`) | The full flag set is `--kind` (kind override), `--name`/`-n` (config binding name — renames the local key, not the artifact's own declared name), `--force` (overwrite-locally-modified), `--install`/`--no-install`. No `[rules.x]` options table exists: `RawConfig`'s `skills`/`rules`/`agents`/`bundles`/`mcp` fields are `BTreeMap<String, String>` (`src/config/project_config.rs:84-93`), and `parse_artifact_map` (`project_config.rs:834-896`) only ever parses that string as a registry identifier or a local path — there is no richer per-entry shape to carry options. No path-remapping or target-directory flag exists; the only directory selector is `--client` on `grim install` (`src/command/install.rs:53`), which chooses among each vendor's fixed native layout, not an arbitrary destination. |
| 4 | Patch/overlay/fork mechanics, local-diff survival | **Absent — binary clobber-or-refuse only** | `src/command/update.rs:13-24` (module doc), `:75-79` (`force: bool`), `:140-148`, `:199-249`, `:306-356`; `src/command/status.rs:700-730` (`derive_state`), `:735-794` (`Footprint`/`footprint`) | Every installed output's SHA-256 `content_hash` is recorded per-client in `.grimoire/state.json` (see Sources: real example below); `status`/`update` recompute it and classify `Missing`/`Modified`(=drifted)/`Intact`. `update.rs` doc: "an artifact whose on-disk bytes drifted from the recorded hash is refused (exit 65) until `--force`" — no merge, no diff, no overlay; `--force` unconditionally overwrites, absence of `--force` unconditionally refuses. There is no mechanism to keep a tracked local edit *and* continue receiving upstream updates. |
| 5 | Post-install hooks / consumer-code execution at install | **Absent** | — (no hits) | Grepped `src/` for `post_install`, `postinstall`, `pre_install`, lifecycle/exec-hook patterns — no matches. The only "arbitrary command" hits in the codebase are RCE-defense comments in `src/catalog/forge.rs:1001` and `src/catalog/index_announce.rs:623`, guarding *against* shell injection in unrelated git/forge push paths, not a hook feature. |
| 6 | `grim eject` / vendor / take-ownership-and-detach | **Absent** | — (no hits) | No `eject` subcommand exists anywhere in `src/cli`/`src/command` (confirmed via `find`/`grep`). The closest adjacent concept, a local dev-install (`grim add <path>`), still tracks the artifact through the normal lock/state machinery — `docs/src/commands.md:512-515` frames it as an alternative *source* for a still-tracked declaration, not a detach operation. |
| 7 | Composition: `extends`/includes/layering for bundles or rules | **Absent** | `src/config/project_config.rs:733-812` (`BundleSource`, `RawBundleSource`, `parse_bundle_source`) | A bundle source is exactly `skills`/`rules`/`agents` member maps (`name → MemberRef`) plus flat catalog metadata (`summary`/`keywords`/`description`/`license`/`repository`/`deprecated`/`replaced-by`) — `#[serde(deny_unknown_fields)]` on `RawBundleSource` (`:764-787`) means an `extends` key would be a hard parse error, not silently ignored. No grep hit for `extends`/layering in bundle or rule handling in `src/` or `docs/src/artifacts.md`/`concepts.md`. A project rule/skill declaration is a single opaque `DeclaredSource` (registry ref or path) — it cannot reference another installed artifact. |

## Update semantics

`grim update`/`grim add` (project config) and `grim install` all route
through one shared integrity gate, described in `src/command/update.rs:13-24`:

> "`update` runs the same local-modification integrity gate as `grim
> install`: a new pin overwrites machine-managed content with no flag, but an
> artifact whose on-disk bytes drifted from the recorded hash is refused
> (exit 65) until `--force`."

Concretely, per declared artifact `status`/`update` compare the live file's
SHA-256 against the `content_hash` recorded in `.grimoire/state.json` at the
last successful materialize (`src/command/status.rs:700-730`,
`src/install/install_state.rs`):

- **Untouched, same pin** → `Installed` — no action.
- **Untouched, new upstream digest (rolling tag)** → overwritten
  unconditionally, no flag needed (`update.rs:140-148`: "A changed digest
  (rolling release) still overwrites prior machine-managed content without
  any flag").
- **Hand-edited (`content_hash` mismatch)** → `Modified`; `update`/`install`
  **refuse** (exit 65) and leave the file untouched unless `--force` is
  passed, in which case it is **clobbered** — the edit is silently lost, no
  backup, no merge (`update.rs:75-79`, `:306-356`, and the `refused: true`
  report row at `:334-347`).
- **Orphaned / dropped-client output that was hand-edited** → preserved
  unless `--force` (`update.rs:199-249`, `prune_orphans`/
  `reap_dropped_clients`).

There is no three-way merge, no diff/patch application, and no warning-only
mode that leaves the choice open at run time — the only two outcomes on
drift are refuse-and-report or force-and-overwrite.

## Installed shape (real examples)

Checked `/home/mherwig/dev/ocx` (no `grimoire.toml`/`grimoire.lock` present
— that project does not use grim) and `/home/mherwig/dev/grimoire-lore`
(does):

- `grimoire.toml` (`/home/mherwig/dev/grimoire-lore/grimoire.toml`) declares
  one bundle (`grim-essentials`), no `[skills]`/`[rules]` entries authored
  directly.
- `grimoire.lock` records the bundle's pinned digest and its three expanded
  skill members (`ai-config-authoring`, `grim-authoring`, `grim-usage`),
  each with its own `sha256:` digest pin.
- Installed files land at `.claude/skills/<name>/SKILL.md` (+ `references/`)
  and mirror into `.agents/skills/<name>/` — both directories are **not**
  gitignored (`git check-ignore` returns nothing for either).
- The per-client `content_hash` used for drift detection is **not** in
  `grimoire.lock` at all; it lives in `.grimoire/state.json`, which grim
  self-manages as gitignored via a `.grimoire/.gitignore` containing `*`
  (confirmed on disk; matches `docs/src/configuration.md:1000-1005`: "Grim
  writes a self-managed `.grimoire/.gitignore` (contents: `*`) the first
  time it creates the `.grimoire/` directory, so the state file is kept out
  of version control").
- Docs are explicit that `grimoire.toml` **and** `grimoire.lock` are meant
  to be committed: "treat it as machine-owned and commit it alongside
  `grimoire.toml`" (`docs/src/configuration.md:771-773`).
- Byte identity: per `src/install/materializer.rs:41-42`
  ("`DefaultMaterializer`: … No client transform — the canonical bytes land
  verbatim") and `docs/src/artifacts.md:77-79`, an installed skill's tree is
  byte-identical to the published tar layer, with the single carve-out that
  `SKILL.md` (and rule/agent frontmatter) is re-rendered when it carries
  `<vendor>.<field>` namespaced metadata keys (`src/install/render.rs:1-24`)
  — a deterministic, content-only projection, still with no per-project
  input.

## Sources

- `src/config/declaration.rs` (full file read) — `ConfigOptions`,
  `RegistryConfig`, `DesiredSet`, `DeclaredSource`.
- `src/config/project_config.rs` (read through line ~1310 of 2598, covering
  `RawConfig`, all validators, `BundleSource`/`RawBundleSource`,
  `parse_artifact_map`, `parse_member_map`).
- `src/config/global_config.rs` (full file read).
- `src/install/render.rs:1-70` — vendor frontmatter projection engine.
- `src/install/mcp_config.rs` (full file read) — env-ref syntax translation.
- `src/install/materializer.rs:1-60` — tar extraction, verbatim-bytes claim.
- `src/command/add.rs:40-180` — `AddArgs`, `InstallOnAdd`, add flow.
- `src/command/install.rs` (`InstallArgs` grep) — `--client` flag.
- `src/command/update.rs:1-30, 130-360` — refuse/force integrity gate.
- `src/command/status.rs:600-800` — `derive_state`/`Footprint`/`footprint`.
- `src/install/install_state.rs` (grep for `content_hash`, `Modified`,
  drift) and `/home/mherwig/dev/grimoire-lore/.grimoire/state.json` (real
  on-disk example).
- `docs/src/artifacts.md:75-79`, `docs/src/configuration.md:771-773,
  1000-1005`, `docs/src/commands.md:512-518`, `docs/src/publishing.md:613-618`.
- `TODO.md`, `CHANGELOG.md`, `.agents/adr/*.md`,
  `.github/ISSUE_TEMPLATE/feature_request.yml` — grepped for
  parameterization/templating language; no planned or rejected proposal
  found.
- `/home/mherwig/dev/grimoire-lore/grimoire.toml`,
  `/home/mherwig/dev/grimoire-lore/grimoire.lock`,
  `/home/mherwig/dev/grimoire-lore/.grimoire/state.json`,
  `/home/mherwig/dev/grimoire-lore/.claude/skills/*` — real installed
  example.
- `/home/mherwig/dev/ocx` — checked, has no grim config (not a grim
  consumer at present).
