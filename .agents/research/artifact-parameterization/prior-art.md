# Prior art: parameterizing a shared, versioned artifact

Research question: how do other distribution systems let a shared, versioned
artifact carry consumer-specific values? Every claim below is sourced from a
primary document — official docs, specs, design proposals, RFCs, or the
GitHub issue where the design was argued — fetched and read directly, not
inferred from search snippets.

## Table of contents

- [Findings](#findings)
  - [Config-as-package systems](#config-as-package-systems)
    - [ESLint shareable configs](#eslint-shareable-configs)
    - [Ruff `extend`](#ruff-extend)
    - [Cargo `workspace.lints`](#cargo-workspacelints)
    - [rustfmt — no inheritance at all](#rustfmt--no-inheritance-at-all)
    - [EditorConfig root + cascade](#editorconfig-root--cascade)
    - [Prettier shareable configs](#prettier-shareable-configs)
    - [Stylelint `extends` + `overrides`](#stylelint-extends--overrides)
  - [Templating systems that chose substitution](#templating-systems-that-chose-substitution)
    - [Helm `values.yaml` + Go templates](#helm-valuesyaml--go-templates)
    - [Kustomize — the anti-templating answer](#kustomize--the-anti-templating-answer)
    - [Terraform module `variable` blocks](#terraform-module-variable-blocks)
    - [Ansible role `defaults/` vs `vars/`](#ansible-role-defaults-vs-vars)
    - [chezmoi — templating a tracked file](#chezmoi--templating-a-tracked-file)
    - [Copier — templating *plus update*](#copier--templating-plus-update)
    - [Cookiecutter — templating, no update](#cookiecutter--templating-no-update)
  - [AI-config specifically](#ai-config-specifically)
    - [The Agent Skills specification](#the-agent-skills-specification)
    - [Claude Code skills — the one exception](#claude-code-skills--the-one-exception)
    - [Cursor rules, GitHub Copilot instructions, OpenCode, Amp](#cursor-rules-github-copilot-instructions-opencode-amp)
    - [Registry-shaped AI-config distribution: grimoire itself](#registry-shaped-ai-config-distribution-grimoire-itself)
- [Mechanism comparison](#mechanism-comparison)
- [The update problem](#the-update-problem)
- [What this suggests for grimoire](#what-this-suggests-for-grimoire)
- [Sources](#sources)

## Findings

### Config-as-package systems

#### ESLint shareable configs

**Mechanism.** A shareable config is an npm package (`eslint-config-*` or
`@scope/eslint-config`) exporting a configuration object or array. A consumer
imports it and lists it in the `extends` array of an `eslint.config.js`
config object; anything the consumer writes *after* the `extends` entry in
the same object, or in a later object in the flat-config array, wins —
"anything from here will override myconfig." Flat config generalizes this
into pure array composition: every matching config object is merged in
file order, "later objects override previous objects when there is a
conflict" [[eslint-shareable-configs]](#src-eslint-shareable),
[[eslint-flat-config]](#src-eslint-flat-config).

**Author cost.** Publish an npm package, declare ESLint as a `peerDependency`
using a `>=` range, list any plugins/parsers as regular dependencies, and
follow the naming convention so tooling can discover it. No schema or
versioned "input contract" beyond semver on the package itself.

**Consumer cost.** `npm install` the package, import it, and write plain
object literals to override specific rules. No new syntax to learn — it's
the same config language as the base.

**Failure mode.** None structural — but the design only works *because*
ESLint deliberately rejected an alternative. The old `eslintrc` system's
`overrides` (glob-based per-file config) was, in the team's own words, "the
source of a lot of complexity," and the cascading directory search "required
ESLint to check each directory from the linted file location up to the root
for any additional config files," which was slow and non-obvious. Flat
config's fix was not templating — it was collapsing the cascade into one
file and making composition an explicit array, driven by an explicit goal:
"One way to define configs" — the team "didn't want folks to have multiple
ways to do the same thing any longer"
[[eslint-flat-config-rationale]](#src-eslint-flat-rationale).

#### Ruff `extend`

**Mechanism.** `extend = "../pyproject.toml"` in a `ruff.toml`/`pyproject.toml`
pulls in a parent config file; the current file's fields are then merged on
top: "Ruff will first load this base configuration file, then merge in
properties defined in the current configuration file"
[[ruff-configuration]](#src-ruff-config). Rule *selection* has its own
composition primitives — `extend-select` and `extend-ignore` *add* to the
inherited rule set rather than replacing it, so a child config accumulates
onto the parent instead of overwriting it wholesale
[[ruff-settings]](#src-ruff-settings).

**Author/consumer cost.** Both sides write plain TOML. No template syntax
exists anywhere in Ruff's configuration surface.

**Documented limitation.** Ruff explicitly does *not* do ESLint-style
directory-cascade merging: "Ruff does not merge settings across
configuration files; instead, the 'closest' configuration file is used, and
any parent configuration files are ignored" *unless* `extend` opts in
explicitly [[ruff-configuration]](#src-ruff-config). Composition is
opt-in and file-based, not automatic and directory-based — the opposite
trade-off from old ESLint, made for the same reason (predictability over
implicit cascades).

#### Cargo `workspace.lints`

**Mechanism.** The workspace root declares `[workspace.lints.rust]` (or
`.clippy`, `.rustdoc`); a member crate opts in with a single flag:
```toml
[lints]
workspace = true
```
RFC 3389 constrains this hard: "when `workspace` is present, no other fields
are allowed to be present" — a package cannot partially inherit and
partially override in the same table. It's all-or-nothing per lint
namespace, deliberately modeled on `[dependencies]`-style workspace
inheritance (RFC 2906) rather than becoming a bespoke resolution system like
`[patch]` (which operates at the resolver level, a different mechanism
entirely) [[cargo-rfc-3389]](#src-cargo-rfc), [[cargo-workspaces]](#src-cargo-workspaces).
A preset system (`[workspace.lints.<preset>]`, referenced by name) was
considered and rejected in favor of the simpler single-table inheritance.

**Author cost.** One TOML table, once.

**Consumer cost.** One line (`workspace = true`) to inherit everything, or
write the full lint table locally to opt out entirely — there is no partial
merge.

**Failure mode.** The all-or-nothing constraint is the point, not a bug: it
avoids the ambiguity of "which specific lints did this crate override,"
at the cost of forcing crates that want 90% of the shared policy to
either take 100% or write their own lint table from scratch.

#### rustfmt — no inheritance at all

**Mechanism.** There isn't one. `rustfmt.toml` has no `extend`, no
`import`, no per-directory merge. Issue
[rust-lang/rustfmt#5313](https://github.com/rust-lang/rustfmt/issues/5313),
open since the feature was requested, records a maintainer of multiple
Rust microservices asking for exactly Prettier's shareable-package model —
"a field to specify a rustfmt.toml configuration either within cargo.toml or
rustfmt.toml" pointing at an external repo — because "any style guide
updates require manually copying updated files to every project"
[[rustfmt-issue-5313]](#src-rustfmt-issue). The issue is still open with a
`P-low` / `C-feature-request` label years later: no rejection, no
acceptance, just absence.

**Cost this pushes onto consumers.** Every consumer manually copies the
canonical `rustfmt.toml` and re-copies it by hand on every upstream change —
this is config distribution with **zero tooling**, the baseline every other
mechanism in this document improves on.

#### EditorConfig root + cascade

**Mechanism.** On open, an EditorConfig-aware tool walks from the file's
directory upward, reading every `.editorconfig` it finds, until it hits the
filesystem root or a file with `root = true` in its preamble — "the core
not to check any higher directory for EditorConfig settings for on the
current filename" [[editorconfig-spec]](#src-editorconfig-spec). Multiple
files are merged: "pairs in closer files take precedence" — nested files
win over ancestors, and within one file, later matching `[glob]` sections
win over earlier ones for the same key
[[editorconfig-home]](#src-editorconfig-home),
[[editorconfig-spec]](#src-editorconfig-spec).

**Author/consumer cost.** Trivial on both sides — plain INI-like key/value
pairs, no packages, no registry, just files in the directory tree the
consumer already owns.

**What it does *not* solve.** EditorConfig has no notion of a *versioned,
shared* upstream artifact at all — every `.editorconfig` is 100% local,
hand-edited, and un-sourced. It solves cascade/override, not distribution.
That gap is exactly why ESLint/Prettier/Stylelint layered a package
ecosystem on top of a similar override idea.

#### Prettier shareable configs

**Mechanism.** A shareable config is an npm package exporting one config
object: "Shareable configs are just npm packages that export a single
prettier config file" [[prettier-sharing]](#src-prettier-sharing). A
consumer references the package name in `package.json`'s `"prettier"`
field or a `.prettierrc` string. To override individual values, the
consumer writes a `prettier.config.mjs` that imports the shared object and
spreads it:
```js
import config from "@username/prettier-config";
export default { ...config, semi: false };
```
This is *object composition*, not a config-file merge feature — the
override mechanism is literally the host language's spread operator
[[prettier-sharing]](#src-prettier-sharing). Separately, Prettier's
`overrides` array lets *any* config (shared or local) apply different
options to files matched by glob, with parser overrides required to live
inside `overrides` and explicitly forbidden at the top level
[[prettier-configuration]](#src-prettier-config).

**Author cost.** Publish a two-file npm package (`package.json` +
`index.js`), declare `prettier` as a peer dependency.

**Consumer cost.** Install, import, spread, override — same effort as any
JS dependency.

#### Stylelint `extends` + `overrides`

**Mechanism.** Near-identical to ESLint/Prettier: `extends` (single value
or array; later entries win) pulls in a `stylelint-config-*` package's
rules, and the consumer's own `rules` table underneath it wins per-rule:
"it starts with the other's properties and then adds to and overrides
what's there" [[stylelint-configure]](#src-stylelint-configure). A separate
`overrides` array does glob-scoped overrides, and is explicitly the
*highest*-precedence layer: "overrides have higher precedence than regular
configurations," and among multiple override blocks, "the last override
block ... always has the highest precedence"
[[stylelint-configure]](#src-stylelint-configure).

**Notable design choice.** `extends`'s value is "a 'locater' that is
ultimately `require()`d" — npm package, absolute path, or relative path are
all valid, so the mechanism doesn't care whether the shared config came
from a registry or a sibling directory.

### Templating systems that chose substitution

#### Helm `values.yaml` + Go templates

**Mechanism.** Helm renders chart templates through Go's `text/template`
against a `.Values` object assembled from four layers, in ascending
precedence: the chart's own `values.yaml`, a parent chart's `values.yaml`
(if this chart is a subchart), a user-supplied `-f` values file, and
`--set` CLI flags — "values.yaml is the default, which can be overridden by
a parent chart's values.yaml, which can in turn be overridden by a
user-supplied values file, which can in turn be overridden by `--set`
parameters" [[helm-values]](#src-helm-values). This is real string
substitution: values are interpolated into arbitrary positions inside YAML
text before that text is parsed.

**Author cost.** Define a values schema *implicitly*, through whatever
`.Values.x.y.z` paths the templates reference — there is no required
declared contract, no types, no defaults enforcement beyond what the
template author remembers to write.

**Consumer cost.** Author or merge a values file, or reach for `--set`
one-offs (which don't round-trip into version control, undermining
reproducibility). Subcharts additionally require a `global` values
convention to pass values down through a dependency chain; library charts
(a chart type used purely for shared template snippets, not deployed
directly) receive the *entire* parent's `.Values`, not a namespaced slice —
"the `.Values` object is the same as the parent chart, in contrast to
application subcharts which receive the section of values configured under
their header" [[helm-library-charts]](#src-helm-library).

**Documented failure mode.** Because values are interpolated into raw text
before YAML parsing, a chart can render syntactically invalid YAML, and the
error surfaces at the template layer, disconnected from the values that
caused it — this is precisely the class of failure Kustomize's design
rationale (next entry) names directly: templating "breaks YAML structure,"
"pollutes YAML with variables, preventing direct cluster application," and
"creates disconnection between output errors and their causes"
[[kustomize-eschewed]](#src-kustomize-eschewed).

#### Kustomize — the anti-templating answer

**Mechanism.** No variables, no `${...}` substitution, ever. Kustomize
takes valid YAML in and produces valid YAML out, transforming it through
**strategic-merge patches**, **JSON 6902 patches**, and named
**overlays** that reference a **base**. Customization is structural editing
of YAML trees, not string interpolation.

**Rationale, in the project's own words** — Kustomize maintains a
"deliberately eschewed features" document that names templating as a
rejected feature *by name*, with reasons that read as a direct rebuttal of
Helm's model:

> "Unstructured Edits / Parameterization... Pollutes YAML with variables,
> preventing direct cluster application... Breaks YAML structure, making
> files incompatible with standard processors... Creates disconnection
> between output errors and their causes... Becomes 'unintelligible' as
> projects scale across dimensions... Undermines shareability and
> stackability of configurations." [[kustomize-eschewed]](#src-kustomize-eschewed)

The same document rejects two more mechanisms other systems in this survey
use routinely: environment-variable-driven build-time side effects
("contradicts the best practice of storing complete configurations in
version control; would compromise reproducibility") and globbing in the
kustomization file itself ("violates version control completeness goals" —
Kustomize instead expands globs *at edit time*, baking literal filenames
into the checked-in file) [[kustomize-eschewed]](#src-kustomize-eschewed).

**Author cost.** Maintain a base (plain YAML) plus one or more overlay
directories, each holding patches expressed as YAML diffs against that
base. No template language to design or document.

**Consumer cost.** Write a patch, not a value. This requires understanding
the base's actual structure (a strategic-merge patch is shaped like the
resource it modifies), which is a *steeper* initial cost than filling in a
named `values.yaml` key — but the patch is inert until applied and never
silently produces broken YAML.

**Trade-off this buys.** What Kustomize explicitly gives up (in its own
"eschewed features" framing) is *removal* semantics — there is no clean way
to say "delete this key the base set," only "restructure the base so the
key was never there, or override its value." The rationale: "removal
semantics would introduce many possibilities for inconsistency, and the
need to add code to detect, report and reject it"
[[kustomize-eschewed]](#src-kustomize-eschewed).

#### Terraform module `variable` blocks

**Mechanism.** A module author declares its consumer-facing contract
explicitly and per-input:
```hcl
variable "environment" {
  type        = string
  description = "..."
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```
Each `variable` block can carry a `type` constraint, a `default`, a
`description`, and a `validation` block — "a `variable` block lets module
consumers customize module behavior without altering the module's source
code" [[terraform-variables]](#src-terraform-variables). A variable with no
default forces Terraform to prompt for a value before planning; one with a
default is silently optional. Composition guidance favors *dependency
inversion*: a module should accept a VPC/subnet ID as an input rather than
creating its own network, so the module can be re-parented without editing
its internals [[terraform-composition]](#src-terraform-composition).

**Author cost.** Design and document a typed, validated interface per
variable — real up-front cost, but it's the only mechanism surveyed here
that gives the *consumer* a machine-checked contract (`terraform plan`
fails fast on a type or validation mismatch) rather than a documentation
promise.

**Consumer cost.** Supply values through any of several layered sources —
CLI `-var`, `.tfvars` files, `TF_VAR_*` environment variables, or the
block's own default — with CLI flags winning and defaults losing.

**Gap.** HashiCorp's own module-composition docs are explicit that they do
**not** cover what happens when a pinned module version is bumped and the
variable contract changed underneath the consumer — versioning and the
variable-input contract are documented as two separate, unconnected
concerns [[terraform-composition]](#src-terraform-composition),
[[terraform-module-sources]](#src-terraform-module-sources).

#### Ansible role `defaults/` vs `vars/`

**Mechanism.** A role ships two YAML files that look identical but sit at
opposite ends of Ansible's ~20-tier variable-precedence ladder.
`defaults/main.yml` is documented as holding "very low precedence values
for variables," explicitly so a consumer can override them from inventory
or the command line — "other users can rely on the reasonable defaults you
added" and can "easily override those values." `vars/main.yml` holds "high
precedence variables provided by the role to the play," meant to *resist*
override [[ansible-variables]](#src-ansible-variables),
[[ansible-roles]](#src-ansible-roles). Ansible does not frame this in
"public API" language explicitly, but the precedence numbers make the
intent unambiguous: `defaults` sits near the bottom of the stack (rank 2 of
~22), `vars` sits near the top (rank 15) — a two-file convention doing the
job a type system would do elsewhere, purely through where-in-the-stack a
value is defined.

**Cost.** Zero extra syntax for either author or consumer — this is pure
convention over Ansible's existing variable-lookup machinery, not a
distinct mechanism. The precedence ladder itself, though, is genuinely
hard to reason about in full: 22 documented tiers, several of them (host
facts, registered vars, `set_facts`) resolved at runtime rather than
statically visible in any file.

#### chezmoi — templating a tracked file

**Mechanism.** A dotfile source file named `*.tmpl` (or living under
`.chezmoitemplates/`) is rendered through Go templates against layered
data: chezmoi's own built-ins (`.chezmoi.os`, `.chezmoi.hostname`, …),
`.chezmoidata.$FORMAT` files, and a `data` section in the user's own
config file [[chezmoi-templating]](#src-chezmoi-templating). This is the
same substitution model as Helm, applied to dotfiles instead of Kubernetes
manifests, and machine-scoped rather than release-scoped:
`{{ if eq .chezmoi.hostname "work-laptop" }}...{{ end }}`.

**The "user edited the rendered output" problem, specifically.** chezmoi's
`re-add` command is built for exactly this: it re-absorbs manual edits made
to a *rendered target file* back into the source state — but only for
non-templated files. The documentation states plainly: "chezmoi will not
overwrite templates" [[chezmoi-re-add]](#src-chezmoi-re-add). In other
words, chezmoi solves the sync-back problem for static tracked files and
*deliberately declines* to solve it for templated ones — editing the
rendered output of a `.tmpl` file is a dead end; the edit has to go into
the template or the data, not the rendered artifact, or it's silently lost
on the next `chezmoi apply`.

#### Copier — templating *plus update*

**Mechanism.** Copier renders a Jinja template into a project once (like
Cookiecutter), but is built around a **second operation**, `copier update`,
that most template engines don't have at all. The update algorithm is a
three-way merge: "It regenerates a fresh project from the current template
version. Then, it compares both version to get the diff from 'fresh
project' to 'current project'" — i.e. it diffs *the answers-driven output
of the old template version* against *what the consumer's project actually
looks like now* to isolate consumer drift, then replays that drift-diff on
top of a freshly rendered *new* template version
[[copier-updating]](#src-copier-updating).

**Conflict handling.** Two explicit modes, chosen via `--conflict`: inline
git-style conflict markers left in the file for manual resolution
(default), or separate `.rej` reject files that leave the original file
untouched. Files matching `_skip_if_exists` are protected from being
clobbered even during update. Files the template *used to* generate but
the consumer deleted stay deleted across updates — "template-based
files/directories that were deleted in the generated project are
automatically excluded from updates"
[[copier-updating]](#src-copier-updating).

**Documented failure mode.** The whole mechanism depends on
`.copier-answers.yml`, a file recording what the consumer answered at
generation time, staying untouched by hand: "you should never manually
change this file" because doing so "will trick Copier" into incorrect
state tracking, producing "unpredictable behavior of the smart diff
algorithm" [[copier-updating]](#src-copier-updating). When the smart
algorithm breaks down for other reasons (an external Jinja extension
disappears, a template targets an incompatible Copier version), the
documented escape hatch is `copier recopy` — discard the merge algorithm
entirely, keep only the recorded answers, and regenerate from scratch,
losing any selective merge.

#### Cookiecutter — templating, no update

**Mechanism.** Pure one-shot Jinja rendering: prompt for answers, stamp out
a project directory, done. The documentation describes generation only —
"prompted to enter values," then "it'll create your Python package in the
current working directory" [[cookiecutter-readme]](#src-cookiecutter).
There is no re-sync command, no answers file kept for later diffing, no
concept of "this project came from template version N and the template is
now at version N+1."

**Cost this pushes onto consumers.** Every upstream template improvement
after generation is manual, ad hoc backporting — Copier exists specifically
to add the operation Cookiecutter is missing (Copier's own docs and
lineage describe it as Cookiecutter-compatible-and-then-some, built to add
`update`).

### AI-config specifically

#### The Agent Skills specification

**Mechanism: none.** The open [agentskills.io](https://agentskills.io)
specification — originated by Anthropic, now used across dozens of agent
products (Claude Code, Cursor, GitHub Copilot, OpenCode, Amp, Gemini CLI,
and more) — defines exactly six frontmatter fields for a `SKILL.md`:
`name`, `description`, `license`, `compatibility`, `metadata`, and
`allowed-tools`. `metadata` is explicitly typed as "a map from string keys
to **string values**," documented as free-form storage for a client's own
bookkeeping (`author`, `version`), not as an input contract a skill body
can reference or a consumer can override at install time
[[agentskills-spec]](#src-agentskills-spec). The spec's own validator
(`skills-ref validate`) hard-fails on any frontmatter key outside that list
— packaging for the strict `claude.ai` skill-upload path fails with
`Unexpected key(s) in SKILL.md frontmatter` if a client-specific field like
`argument-hint` leaks in [[claude-code-skills]](#src-claude-code-skills).
There is no notion of a skill declaring "this variable must be supplied by
the consumer" anywhere in the base spec.

#### Claude Code skills — the one exception

**Mechanism.** Claude Code extends the base spec with a real, if narrow,
parameterization surface: `$ARGUMENTS`, positional `$0`/`$1`/…, and named
`$name` placeholders (declared via an `arguments` frontmatter field) are
substituted into the skill body **at invocation time**, from whatever text
follows the `/skill-name` command. Separately, environment-shaped
placeholders — `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_SKILL_DIR}`,
`${CLAUDE_SESSION_ID}`, and (for plugin skills)
`${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PLUGIN_DATA}` — are substituted both in
the skill body and in `allowed-tools` Bash-permission patterns, letting a
skill reference "wherever I'm installed" or "wherever this project is"
without hardcoding a path [[claude-code-skills]](#src-claude-code-skills).

**What kind of parameterization this is — and isn't.** Both mechanisms are
scoped to a single invocation or a single environment, not to "this
consumer's persistent customization of this shared package." `$ARGUMENTS`
resets every time the skill is invoked; nothing about it is stored,
versioned, or diffed against a future upstream update. `${CLAUDE_PROJECT_DIR}`
resolves per-environment automatically — there's no consumer-authored file
that says "in this project, PROJECT_DIR-shaped values are X." So even
Claude Code, the one client in this survey with *any* substitution
mechanism at all, has nothing resembling ESLint's `extends`-plus-override
or Terraform's `variable` block: no way for a project to say once, in a
committed file, "this shared skill's `<PLACEHOLDER>` is always `Y` here,"
and have that persist and survive an upstream skill update.

#### Cursor rules, GitHub Copilot instructions, OpenCode, Amp

All four were checked against their own documentation and all four are
**flatly static**, with zero variable or parameterization mechanism of any
kind documented:

- **Cursor** — `.mdc` rule files under `.cursor/rules/` carry only
  `alwaysApply`, `description`, and `globs` in frontmatter. "Rules are
  static files. There is no variable substitution, templating, or
  parameterization mechanism documented." Reuse across projects happens by
  copying a rule into `.cursor/rules/imported/`, which becomes a fully
  independent local static file from that point on
  [[cursor-rules]](#src-cursor-rules).
- **GitHub Copilot** — `.github/copilot-instructions.md` (repo-wide) and
  `.github/instructions/*.instructions.md` (path-scoped, via an `applyTo`
  glob) are "static Markdown files" with "no templating/parameterization"
  and "no variables or dynamic elements"
  [[copilot-instructions]](#src-copilot-instructions).
- **OpenCode** — skills follow the base Agent Skills spec with "no
  built-in variables or parameterization system"; per-project
  `opencode.json` settings control *whether* a skill is allowed to run
  (access control), never *how* it behaves [[opencode-skills]](#src-opencode-skills).
- **Amp** — same base spec, same absence; the only "customization" lever
  documented is directory precedence — a project-level skill of the same
  name shadows a higher-level one entirely, which means forking the whole
  file rather than overriding one value in it
  [[amp-skills]](#src-amp-skills).

**The pattern across all AI-config clients surveyed.** Every one of them
treats a shared rule/skill as a file to be *edited in place* or *shadowed
wholesale*, never as a package with declared inputs. The closest thing to
an "override" anywhere in this category is Claude Code's directory
precedence and name-shadowing rules (personal beats project, a
project-root skill's nested variant is addressed by a qualified name) —
which is the same "fork the file" answer as Cursor and Amp, not a value
substitution.

#### Registry-shaped AI-config distribution: grimoire itself

grimoire (`grim`) is the one OCI-based registry system in this survey built
specifically for AI-agent config: "Declare a skill once and `grim` writes
it into Claude Code, Copilot, Cursor, Codex, Gemini, Zed, Amp, Kiro, Junie,
and opencode — each in the format that client actually reads, pinned by
digest in a lockfile. Storage is any OCI registry — GHCR, Docker Hub, or
your own." [[grimoire-readme]](#src-grimoire-readme) A search of the
current `grimoire` docs tree
(`docs/src/*.md`) for parameterization, variables, templating, or
per-consumer override turns up **nothing** — the artifact model today is
"one canonical file, transformed per-client-format, installed verbatim."
This is the gap the present research exists to inform.

## Mechanism comparison

| Mechanism | Author cost | Consumer cost | Survives upstream change? | Documented failure mode |
|---|---|---|---|---|
| ESLint `extends` + flat-config array composition | Publish npm package; peer-dep on ESLint | `npm install`; write override object literals after `extends` | Yes — override lives in consumer's own file, untouched by upstream publish | Pre-flat-config `overrides` was "the source of a lot of complexity"; directory-cascade lookup was slow and implicit |
| Ruff `extend` (file-level) | Plain TOML, no package needed | Point `extend` at a path; override fields locally | Yes, same as ESLint — override is local | No cross-file merge *unless* `extend` opts in; closest-file-wins is the surprising default without it |
| Cargo `workspace.lints` | One `[workspace.lints.*]` table | One line: `lints.workspace = true` | Yes, but all-or-nothing — no partial override in the same table | Forces full opt-out (write the whole table yourself) the moment a crate needs *any* deviation |
| rustfmt (no mechanism) | N/A | Manual copy-paste of `rustfmt.toml` per repo | No — every upstream change is a manual re-copy | Feature request open since filing, unresolved; zero tooling is the status quo |
| EditorConfig root+cascade | Hand-write `.editorconfig` | Hand-write a nested `.editorconfig` that wins by proximity | N/A — files aren't versioned/published artifacts at all | Solves override, not distribution — no packaging story |
| Prettier shareable config | Publish 2-file npm package | Install; spread `{...config, x: y}` in JS config | Yes, spread happens in consumer's own file | Object composition depends on JS as host language; non-JS consumers get nothing equivalent |
| Stylelint `extends`+`overrides` | Publish `stylelint-config-*` package | `extends` then local `rules` table wins | Yes | Same shape as ESLint/Prettier, so shares their strengths |
| Helm `values.yaml` + Go templates | Design implicit values schema via template references | Write/merge a values file or `--set` flags | No structural guarantee — values are strings interpolated pre-parse | Can render invalid YAML; error is disconnected from the values that caused it |
| Kustomize overlays/patches | Maintain base + overlay patches, no template language | Write a structural patch against the base's real shape | Yes, if overlay author kept the patch aligned to the base's structure | No clean *removal* semantics — can't cleanly delete a base-set key, only restructure around it |
| Terraform module `variable` blocks | Design typed, validated, documented per-variable contract | Supply values via CLI/`.tfvars`/env, in a defined precedence order | Only if the module's variable contract is intentionally kept backward compatible — **undocumented** by HashiCorp | Docs explicitly don't cover what happens when a pinned version's variable contract changes underneath a consumer |
| Ansible `defaults/` vs `vars/` | Two YAML files, no new syntax | Override via inventory/CLI (defaults) or accept fixed values (vars) | Yes, precedence is stable across role versions if key names don't change | 22-tier precedence ladder is hard to reason about in full; several tiers resolved only at runtime |
| chezmoi templating | Author `.tmpl` + `.chezmoidata` | Supply machine-scoped data; can't hand-edit rendered output | No for templated files — re-add explicitly refuses to fold manual edits back | "chezmoi will not overwrite templates" — manual edits to rendered output are a dead end |
| Copier update (3-way merge) | Author Jinja template; maintain `_skip_if_exists` etc. | Answer prompts once; re-run `copier update` per upstream release | Yes — the mechanism's entire purpose, via 3-way diff/replay | Breaks if `.copier-answers.yml` is hand-edited, an extension vanishes, or template targets an old Copier version — falls back to `recopy` (loses selective merge) |
| Cookiecutter | Author Jinja template | Answer prompts once, at generation only | No — no update primitive exists | All post-generation drift-vs-upstream reconciliation is manual |
| Agent Skills spec (base) | 6 fixed frontmatter fields | None — no variable surface exists | N/A, nothing to survive | `metadata` is string-only bookkeeping, not an input contract; strict validators reject any other key |
| Claude Code skill arguments | Declare `arguments:` list, use `$name`/`$ARGUMENTS` | Pass args per invocation | No — scoped to one invocation, nothing persists across an upstream skill update | Not a persistent per-project value at all; resets every call |
| Cursor / Copilot / OpenCode / Amp rules | Write a static Markdown/`.mdc` file | Copy in, hand-edit, or shadow with a same-named local file | No — editing in place *is* the fork; there's nothing left to reconcile against upstream | Reuse across projects = duplicate the file, not parameterize it |

## The update problem

This is the axis every mechanism above should really be ranked on: **what
happens when the upstream artifact changes *and* the consumer has already
customized their copy?** Ranked from best-surviving to worst:

1. **Copier (3-way merge).** The only mechanism in this survey engineered
   specifically for this scenario. It regenerates fresh output at the new
   template version, diffs it against what the consumer's project actually
   contains to isolate consumer-authored drift, and replays that drift on
   top of the new version — conflicts get inline markers or `.rej` files,
   not silent loss [[copier-updating]](#src-copier-updating). Cost: an
   answers file (`.copier-answers.yml`) that must never be hand-edited, and
   a `recopy` escape hatch that admits defeat by discarding history when
   the smart path can't cope.

2. **Package-based config composition (ESLint / Prettier / Stylelint /
   Ruff / Cargo workspace lints).** Survives cleanly *because the consumer's
   override never lives inside the shared artifact in the first place.*
   Bumping the shared package version just changes what `extends` resolves
   to; the consumer's own override object, written in their own file, is
   untouched by that bump. This is structurally the same trick as Copier's
   merge, achieved for free by never merging two copies of the same file at
   all — composition instead of textual patching. The cost surfaces only
   when the upstream package makes a *breaking* change to a value the
   consumer overrode (e.g. a renamed rule) — none of these ecosystems
   documents an automated migration for that; it's a changelog and a
   human.

3. **Kustomize overlays.** A patch is defined against the base's structure,
   not against a rendered snapshot, so it survives cosmetic upstream
   changes as long as the paths it patches still exist. It breaks loudly
   (a patch that no longer matches anything fails to apply) rather than
   silently — which the project's own design philosophy treats as a
   feature, not a bug: connect errors to their cause
   [[kustomize-eschewed]](#src-kustomize-eschewed).

4. **Terraform module variables.** In principle this survives well — a
   typed, defaulted, validated interface is exactly the shape of a
   stable contract. In practice, HashiCorp's own module-composition
   documentation is silent on what a consumer should do when a version
   bump changes that interface; there's a version-pinning mechanism
   (`version` constraint on the `module` block) but no documented
   migration story connecting version bumps to variable-contract changes
   [[terraform-module-sources]](#src-terraform-module-sources).

5. **Ansible role variables.** Survives as long as variable *names* are
   stable across role versions — precedence tiers don't change, so an
   override written against `defaults/main.yml` keeps winning at the same
   rank after an upstream bump. Silently stops working (with no error) if
   the role renames or restructures a default the consumer was overriding.

6. **chezmoi templating.** Explicitly punts: template source changes flow
   through cleanly (that's what templating is for), but a consumer's manual
   edit to the *rendered* file is simply not reconciled — `re-add`
   refuses to fold it back for anything under a `.tmpl` — so the two
   customization paths (edit the template's data vs. edit the output) are
   mutually exclusive by design.

7. **Helm values.yaml.** No structural merge guarantee at all: values are
   plain data merged by precedence, so an upstream chart's *template*
   changes flow through automatically, but if the upstream author
   restructures which values keys exist (renames `image.tag` to
   `image.version`), every consumer's values file silently stops
   affecting the chart with no error — the mismatch is discovered at
   render time or not at all, which is the exact complaint Kustomize's
   design document lodges against templating in general.

8. **Cookiecutter.** No update primitive exists. Any reconciliation between
   "template evolved" and "consumer diverged" is 100% manual, forever —
   this is the reason Copier was built as a superset.

9. **rustfmt / Cursor / Copilot / OpenCode / Amp (static file, no
   mechanism).** Worst case, shared with the majority of the AI-config
   ecosystem surveyed: there is no "upstream" the consumer's copy is even
   connected to after the initial copy. An update is indistinguishable from
   authoring a brand-new file and manually diffing it against whatever the
   consumer already has. Every AI-config client checked except Claude
   Code's per-invocation arguments sits at this tier.

## What this suggests for grimoire

grimoire already has the one prerequisite none of the static AI-config
clients have: a real package boundary (OCI-distributed, digest-pinned,
lockfiled). That's exactly the substrate ESLint/Prettier/Stylelint/Ruff
needed before their `extends`-plus-local-override pattern became possible
— composition only works once "the shared thing" and "the consumer's
copy" are provably different files. Three shortlisted directions, in the
order this research argues for:

1. **Composition over templating, by default.** The config-as-package
   survey is nearly unanimous, and the systems that chose templating
   instead (Helm, cookiecutter-style generators) are the ones with the
   worst-documented update stories and the most vocal ecosystem backlash
   (Kustomize exists as a direct rebuttal to Helm's approach). If
   grimoire artifacts need consumer-specific values, an ESLint/Cargo-
   `workspace.lints`-shaped answer — the shared artifact declares
   defaults, the consumer's own project file layers overrides on top,
   nothing is textually merged into the shared artifact itself — survives
   upstream updates for free, the same way `extends` does, because the
   override never lives inside the versioned artifact.

2. **If any value must land inside the artifact body itself** (a skill
   whose instructions need a project-specific path, tool name, or
   convention baked into the prose, not just config data next to it),
   Terraform's `variable` block is the strongest model available: typed,
   defaulted, validated, and documented as the artifact's explicit
   contract — closer to a real API than any AI-config client's frontmatter
   today. Claude Code's `$ARGUMENTS`/`${CLAUDE_PROJECT_DIR}` substitution
   is the only precedent inside the AI-config space itself, but it's
   invocation-scoped, not install-scoped — nothing about it persists a
   per-project value across an upstream skill update, which is the exact
   gap grimoire would need to close that Claude Code hasn't.

3. **If grimoire ever needs "consumer materially diverged from the
   installed artifact and upstream also changed," Copier's three-way
   merge is the only mechanism surveyed that was built to survive that
   collision** rather than merely tolerate it. It's also the most
   expensive to build (a diff/replay engine, an answers file, conflict
   markers) and should be a fallback for genuinely divergent artifacts
   (whole skill bodies), not the first mechanism reached for — grimoire's
   lockfile-and-digest model already gives it something Copier lacks
   natively: an unambiguous record of exactly which upstream version a
   consumer is currently on, which is most of the hard part of a 3-way
   merge's "compute the diff from fresh-old to current" step.

The one mechanism this survey argues *against* reaching for is Helm-style
string templating of the artifact body: every documented criticism of it
(broken structure, disconnected errors, "unintelligible… as projects scale
across dimensions") applies at least as strongly to a skill or rule file,
where the "structure" being protected is prose an LLM has to parse
correctly under a time/token budget, not just YAML a parser has to accept.

## Sources

<a id="src-eslint-shareable"></a>
- [ESLint — Configure a Shareable Config](https://eslint.org/docs/latest/extend/shareable-configs) — official docs
<a id="src-eslint-flat-config"></a>
- [ESLint — Configuration Files (flat config)](https://eslint.org/docs/latest/use/configure/configuration-files) — official docs
<a id="src-eslint-flat-rationale"></a>
- [ESLint blog — The New Config System, Part 2](https://eslint.org/blog/2022/08/new-config-system-part-2/) — official design rationale
<a id="src-ruff-config"></a>
- [Ruff — Configuring Ruff](https://docs.astral.sh/ruff/configuration/) — official docs
<a id="src-ruff-settings"></a>
- [Ruff — Settings reference](https://docs.astral.sh/ruff/settings/) — official docs
<a id="src-cargo-workspaces"></a>
- [The Cargo Book — Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html) — official docs
<a id="src-cargo-rfc"></a>
- [rust-lang/rfcs — RFC 3389: cargo-lints-config](https://github.com/rust-lang/rfcs/blob/master/text/3389-manifest-lint.md) — accepted RFC, design rationale and alternatives
<a id="src-rustfmt-issue"></a>
- [rust-lang/rustfmt#5313 — Extend config option similar to package.json prettier field](https://github.com/rust-lang/rustfmt/issues/5313) — open feature request, primary evidence of the gap
<a id="src-editorconfig-home"></a>
- [EditorConfig — official site](https://editorconfig.org/) — project homepage/docs
<a id="src-editorconfig-spec"></a>
- [EditorConfig Specification](https://spec.editorconfig.org/) — formal spec
<a id="src-prettier-config"></a>
- [Prettier — Configuration File](https://prettier.io/docs/en/configuration.html) — official docs
<a id="src-prettier-sharing"></a>
- [Prettier — Sharing configurations](https://prettier.io/docs/en/sharing-configurations.html) — official docs
<a id="src-stylelint-configure"></a>
- [Stylelint — Configure](https://stylelint.io/user-guide/configure/) — official docs
<a id="src-helm-values"></a>
- [Helm — Values Files](https://helm.sh/docs/chart_template_guide/values_files/) — official docs
<a id="src-helm-library"></a>
- [Helm — Library Charts](https://helm.sh/docs/topics/library_charts/) — official docs
<a id="src-kustomize-eschewed"></a>
- [Kustomize — Eschewed Features](https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/site/content/en/contribute/features/eschewedfeatures.md) — official project design-rationale document
<a id="src-kustomize-faq"></a>
- [kubectl docs — Configuration Management guide index](https://kubectl.docs.kubernetes.io/guides/config_management/) — official docs (SIG CLI)
<a id="src-terraform-variables"></a>
- [Terraform — Input Variables](https://developer.hashicorp.com/terraform/language/values/variables) — official docs
<a id="src-terraform-composition"></a>
- [Terraform — Module Composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition) — official docs
<a id="src-terraform-module-sources"></a>
- [Terraform — Module Sources](https://developer.hashicorp.com/terraform/language/modules/sources) — official docs
<a id="src-ansible-variables"></a>
- [Ansible — Using Variables (precedence)](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html) — official docs
<a id="src-ansible-roles"></a>
- [Ansible — Roles (reuse)](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html) — official docs
<a id="src-chezmoi-templating"></a>
- [chezmoi — Templating](https://www.chezmoi.io/user-guide/templating/) — official docs
<a id="src-chezmoi-re-add"></a>
- [chezmoi — `re-add` command reference](https://www.chezmoi.io/reference/commands/re-add/) — official docs
<a id="src-copier-updating"></a>
- [Copier — Updating a project](https://copier.readthedocs.io/en/stable/updating/) — official docs
<a id="src-cookiecutter"></a>
- [Cookiecutter — README / overview](https://cookiecutter.readthedocs.io/en/stable/README.html) — official docs
<a id="src-agentskills-overview"></a>
- [Agent Skills — Overview](https://agentskills.io) — open-standard site (originated by Anthropic)
<a id="src-agentskills-spec"></a>
- [Agent Skills — Specification](https://agentskills.io/specification) — formal spec
<a id="src-claude-code-skills"></a>
- [Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills) — official docs
<a id="src-cursor-rules"></a>
- [Cursor — Rules](https://cursor.com/docs/context/rules) — official docs
<a id="src-copilot-instructions"></a>
- [GitHub Copilot — Add repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) — official docs
<a id="src-opencode-skills"></a>
- [OpenCode — Skills](https://opencode.ai/docs/skills/) — official docs
<a id="src-amp-skills"></a>
- [Amp — Manual, Agent Skills section](https://ampcode.com/manual#agent-skills) — official docs
<a id="src-grimoire-readme"></a>
- [grimoire — project README](file:///home/mherwig/dev/grimoire/README.md) — local primary source, read directly from the repository at commit time (2026-08-14)
<a id="src-cargo-issue-8264"></a>
- [rust-lang/cargo#8264 — workspace profile settings vs. published binary crates](https://github.com/rust-lang/cargo/issues/8264) — secondary/tangential; consulted while researching workspace-inheritance precedent, cited for completeness though not load-bearing above
