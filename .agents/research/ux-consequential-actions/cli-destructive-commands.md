---
title: CLI destructive and mutating commands - tiers, dry run, typed confirmation, print-what-changed, idempotency
program: product
sub_program: ux
topic: ux-consequential-actions
worker: cli-destructive-commands
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
scope: CLI mutating commands only - severity tiers, dry-run, typed confirmation, change reporting, repeat-run behaviour, with a measured inventory of git, cargo, uv, ocx 0.6.8 and grim 0.16.0. Out of scope - error classes and machine-readable errors (UX-AGENT), GUI confirmation dialogs and undo (sibling dives), network-dependent commands that could not run offline.
---

# CLI destructive and mutating commands

## Contents
1. Summary
2. Findings (sources; measurements; analysis)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary
- clig.dev gives three tiers (mild, moderate, severe); the catalog's CLI-09 covers only "no prompt without a TTY plus a bypass flag", so the tiers are the gap.
- A command that prompts must never block on a non-TTY: either refuse with a message naming the flag, or proceed only when the tier allows it. Measured: no fleet or exemplar command hung with stdin closed.
- git's `clean.requireForce` model (refuse without `-f` or `-n`, exit 128, message names both) is the best measured non-TTY behaviour: it fails fast and says what to pass.
- `--dry-run` is the preview for moderate and severe commands. kubectl's server dry-run runs every stage except storage; terraform makes plan a separate command and a saved plan file counts as the approval.
- Severe actions need typed confirmation of the target name interactively and `--confirm=<name>` for scripts (clig.dev, Heroku `--confirm`); `--yes` alone must not satisfy severe (gh needs an extra flag for cascading deletion).
- Printing what changed is uneven: git, uv, cargo, docker print each item; `ocx clean` on an empty store prints only a table header; grim `config set` prints `set` both times, so a repeat is indistinguishable from a first run.
- Repeat runs: removal commands in grim are idempotent (exit 0, status `absent` or `not-installed`); git `branch -D`, `tag -d`, `remote remove` fail on the second run (1, 1, 2); `ocx remove nosuch` exits 79; create commands (`ocx init`, `ocx direnv init`, `grim init`) fail on repeat (64, 78, 64) without comparing content.
- Proposed rule: same intent repeated exits 0 and says `unchanged` or `already absent`; a conflicting existing state exits nonzero and names the override flag.
- `--force` is overloaded across tools: bypass of prompts (git, docker, clig), bypass of a safety guard (`ocx clean --force`, kubectl `--force`), overwrite (`ocx direnv init --force`, cargo install). An agent reading `--force` cannot know which.
- For agent callers, MCP says clients SHOULD keep a human in the loop and MUST treat tool annotations as untrusted unless the server is trusted; grim's MCP server is read-only unless launched with `--allow-writes`.
- A binary test exists: run each mutating command twice with stdin closed and no controlling terminal, assert no hang, assert the second exit code and message class.

## Findings

### 1. What the primary sources say
- clig.dev (no date on page) defines the tiers. Mild is "a small, local change such as deleting a file" and you "might want to prompt for confirmation, you might not." Moderate is a bigger local change or a remote change and "you usually want to prompt." Severe is "deleting something complex, like an entire remote application or server" where "you want to make it hard to confirm by accident" by asking the user to "type something non-trivial such as the name of the thing they're deleting", with `--confirm="name-of-thing"` "so it's still scriptable." Source: https://clig.dev/ (authority, community guide).
- Same page: prompt only "if `stdin` is an interactive terminal", "if `--no-input` is passed, don't prompt", and if input is required "fail and tell the user how to pass the information as a flag". "If you change state, tell the user." "Operations should be idempotent where possible." `--dry-run` means "do not run the command, but describe the changes that would occur."
- Terraform apply v1.17.x (no date): without a saved plan, apply plans, "prompts you to approve", then applies. `-auto-approve` skips approval. `-input=false` disables prompts, and apply then "conservatively assume[s] that you do not wish to apply the plan, causing the operation to fail." A saved plan file is applied "without prompting you for confirmation" because "Terraform interprets the act of passing the plan file as the approval." "Terraform does not automatically roll back a partially-completed apply." https://developer.hashicorp.com/terraform/cli/commands/apply (platform).
- Terraform plan: `-detailed-exitcode` returns 0 no changes, 1 error, 2 changes present. https://developer.hashicorp.com/terraform/cli/commands/plan (platform). This is a ready model for a "would change" exit code on dry runs.
- kubectl delete reference (version not stated; menu lists v1.33 to v1.37): `--dry-run` takes `none`, `client`, `server`; `--ignore-not-found` "treat resource not found as a successful delete"; `--force` "immediately remove resources ... may result in inconsistency or data loss and requires confirmation"; `-i/--interactive` "delete resource only when user confirms". The bare flag form `--dry-run` shows default `unchanged`, which is not in the allowed list, so use the explicit value. https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/ (platform).
- Kubernetes API concepts (v1.37 links): dry-run runs "admission chain, validation, merge conflicts" "up until persisting objects to storage", returns a response "as close as possible to a non-dry-run response", and "if the non-dry-run version of a request would trigger an admission controller that has side effects, the request will be failed rather than risk an unwanted side effect." Authorization is identical to the real request. https://kubernetes.io/docs/reference/using-api/api-concepts/ (platform). Force delete "ignores finalizer constraints" and needs an extra privilege verb.
- git clean (manual last updated in 2.45.0): `-n` "just show what would be done"; without `-f` it "will refuse to delete files" when `clean.requireForce` (default true); untracked nested repos need a second `-f`. https://git-scm.com/docs/git-clean (platform).
- gh repo delete: `--yes` "confirm deletion without prompting"; "when no repository argument is provided, the `--yes` flag is ignored and you will be prompted"; private repos with forks need `--accept-cascading-deletion-of-private-forks` along with `--yes` when not interactive; requires `delete_repo` scope. https://cli.github.com/manual/gh_repo_delete (platform). This is the cleanest published example of a severe tier: a second, specific flag per extra consequence, and a required scope.
- docker system prune: prints "WARNING! This will remove:" and a list, asks "Are you sure you want to continue? [y/N]", `-f` "do not prompt", volumes excluded by default "to prevent important data from being deleted", ends with "Total reclaimed space". https://docs.docker.com/reference/cli/docker/system/prune/ (platform; version not stated). Note this lists the targets before asking and reports a total after.
- npm publish v11.21.3: `--dry-run` "only report what it would have done"; "NOT honored by other network related commands, eg dist-tags, owner"; republishing an existing name and version fails, and an unpublished version "can never be used again". https://docs.npmjs.com/cli/v11/commands/npm-publish (platform). The dry-run flag is not uniform across one tool's commands.
- Heroku CLI reference (page "Last updated November 18, 2026"): `heroku apps:destroy` has `-c, --confirm=<value>`; the page gives no description and does not mention a typed-name prompt in the part read (page was 337k characters, only the first 100k read). https://devcenter.heroku.com/articles/heroku-cli-commands (platform). Treat the typed-name prompt as unverified here.
- AWS EC2 idempotency (no date): "idempotency ensures that an API request completes no more than one time"; a retry with the same client token and same parameters "succeeds without performing any further actions"; different parameters give `IdempotentParameterMismatch`; TerminateInstances is idempotent by default. https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Run_Instance_Idempotency.html (platform). This supports "same intent repeated succeeds, conflicting intent fails".
- MCP tools spec 2025-06-18: "there SHOULD always be a human in the loop with the ability to deny tool invocations"; clients "MUST consider tool annotations to be untrusted unless they come from trusted servers"; clients SHOULD "prompt for user confirmation on sensitive operations". https://modelcontextprotocol.io/specification/2025-06-18/server/tools (authority). The annotation hint names (`destructiveHint`, `idempotentHint`) were not in the fetched text; not claimed.
- Catalog CLI-09 (local, rust-quality-reference cli-contract.md line 131): "Never prompt unless `stdin().is_terminal()`, and always ship a non-interactive bypass (`--yes`/`--no-input`). Truthy `CI` counts as non-interactive even on a pseudo-TTY." MUST. It does not say what a non-interactive run does without the bypass, nor tiers.
- Not fetched: GNU coreutils `rm` manual (HTTP 429 twice), AWS CLI dry-run page (page returned no content). No claim in this file rests on them.

### 2. Measurement method
Throwaway `HOME`, `XDG_*`, `GRIM_HOME` or `OCX_HOME` and project directories under `~/.cache/research-lang/exemplars/product/cda2`, `cda3`, `cda4`. Each command was run twice with this wrapper (the script is in the session scratchpad, not the repo): `timeout 20 setsid -w <cmd> 0<&- 2>&1`, which closes stdin and removes the controlling terminal; `CI` unset. Versions: git 2.43.0, cargo 1.96.0 (2026-05-25), uv 0.13.9, ocx 0.6.8, grim 0.16.0. Not measured: a real-TTY prompt (no pty harness was used), any command needing a registry or network (`ocx add`, `ocx pull`, `ocx update`, `ocx upgrade`, `grim add`, `grim install`, `grim update`, `grim release`, `grim publish`, `grim login`, `ocx login`, `ocx self update`), and `docker system prune` (would touch the real daemon). One stray side effect: `uv venv /tmp/x_nonexist_venv_cda` wrote outside the cache; it was deleted.

### 3. Measured results (exit codes from run 1 / run 2, stdin closed, no TTY)

| Tool and command | Prompt behaviour | Dry run | Prints what changed | Run 1 / run 2 | Verdict on repeat |
|---|---|---|---|---|---|
| git clean -d | refuses, exit 128, names `-i -n -f` | `-n`: "Would remove d/" | `-f` prints "Removing d/" | 128 / 128 | n/a |
| git clean -fd | none | `-n` | run 1 lists items, run 2 prints nothing | 0 / 0 | silent no-op, exit 0 |
| git branch -D tmp | none | none | "Deleted branch tmp (was 2cd4de5)." | 0 / 1 | fails "branch 'tmp' not found" |
| git tag -d t1 | none | none | "Deleted tag 't1' (was ...)" | 0 / 1 | fails |
| git remote remove o | none | none | silent | 0 / 2 | fails "No such remote" |
| git reset --hard | none | none | "HEAD is now at 2cd4de5 x" | 0 / 0 | repeats the same line |
| cargo clean | none | `-n` exists | "Removed 0 files" | 0 / 0 | reports count |
| cargo uninstall nosuch | none | none | error | 101 / 101 | fails |
| uv cache clean | none | none | "No cache found at: ..." | 0 / 0 | reports state |
| uv tool uninstall nosuch | none | none | error | 2 / 2 | fails |
| uv venv PATH (exists) | none, no TTY | none | creates | 0 / 2 | fails "Failed to create virtual environment" |
| ocx init | none | none | "created .../ocx.toml" | 0 / 64 | fails "already exists" |
| ocx direnv init | none | none | "Wrote .envrc" | 0 / 78 | fails, names `--force` |
| ocx remove nosuch | none | none | error | 79 / 79 | fails "binding not found" |
| ocx clean (bare) | none, runs at once | `--dry-run` | table header only on empty store | 0 / 0 | silent, no "nothing to do" line |
| ocx clean --force | none | `--dry-run` | same | 0 / 0 | `--force` bypasses a project-lock guard, not a prompt |
| ocx logout HOST | none | none | "Logged out of example.invalid" both runs | 0 / 0 | idempotent but claims logout even if none |
| ocx lock | none | none | table | 0 / 0 | idempotent |
| ocx status | n/a (read) | n/a | "lock: current" | 0 / 0 | the confirm-end-state command |
| grim init | none | none | "created" | 0 / 64 | fails "config already exists" |
| grim config set K V | none | `--dry-run` ("Validate and report without writing") | "set K V ... Dry Run false" | 0 / 0 | identical output on repeat, cannot tell changed from unchanged |
| grim config unset K | none | `--dry-run` | "unset" | 0 / 0 | same |
| grim config registry add | none | `--dry-run` | "registry-added" | 0 / 64 | fails, hint names `registry set` |
| grim config registry rm / unset registry.X | none | `--dry-run` | "registry-removed" | 0 / 64 | fails "no registry 'foo'" |
| grim remove skill nosuch | none | none | "absent" | 0 / 0 | idempotent, status word |
| grim uninstall rule x | none | none | "not-installed" | 0 / 0 | idempotent, status word |
| grim hook allow / revoke | none | none | WARN log "consent recorded" | 0 / 0 | revoke run 2 prints "not-consented" |
| grim logout HOST | none | none | table | 0 / 0 | idempotent |
| grim status | n/a (read) | n/a | table, state column | 0 / 0 | the confirm-end-state command |

Static findings from `--help` (not run): `grim release` and `grim publish` have `--dry-run` ("print the push plan (tags + digest) without pushing"); `grim uninstall --force` and `ocx clean --force` change what is protected; `grim install --force` and `grim update --force` arm hooks despite missing consent; `grim mcp --allow-writes` is the only way the MCP server mutates, and the help says it is launch-pinned. Command: `grim <cmd> --help | grep -iE "dry-run|--yes|--force|--allow|--confirm|--no-input|consent"`. Neither ocx nor grim lists a `--yes`, `--no-input` or `--confirm` flag on any measured command, and none prompted, so every fleet mutator runs unattended by default.

### 4. What the measurements show
1. No measured command hung on closed stdin. The only refusal-by-design was `git clean` (128), which is also the only one that forces an explicit decision for a data-deleting command.
2. The fleet deletes without any gate: `ocx clean` (store objects), `grim uninstall` (installed files) and `grim remove` all run immediately with no prompt and no tier flag. Under clig.dev these are moderate (deleting installed files, bulk store collection). The fleet relies on lock registries and `--dry-run` rather than confirmation; `ocx clean --dry-run` and a lock guard exist, so the severity is mitigated, not absent. Whether to add a prompt is a product decision (section 5).
3. Dry-run coverage: present on ocx clean, grim config writes, grim release and publish; absent on grim remove, grim uninstall, grim hook, ocx remove, and ocx logout.
4. Repeat behaviour splits by verb: removers in grim are idempotent with a status word; creators (`init`) fail with a usage code; git's removers fail. A retrying agent reading exit 64 or 79 cannot tell "already done" from "wrong input" without parsing text. Error-class design belongs to UX-AGENT; this dive only fixes which repeat outcomes are success.
5. Status commands exist for the project scope (`ocx status`, `grim status`, `grim why`) but not for every mutator (no status for `ocx logout` or `grim hook` beyond the revoke repeat line).

## Normative guidance candidates

Tiers (assign by consequence, not by verb):

| Tier | Consequence test | Interactive TTY | No TTY (or `CI` truthy) | Flags |
|---|---|---|---|---|
| Mild | local, reversible by one command, or recreatable from declared state (unset a config key, remove a manifest binding) | no prompt | runs | none required; `--dry-run` optional |
| Moderate | deletes data that is not recreatable from declared state, overwrites an existing file, or changes shared or remote state | prompt `[y/N]` after listing the targets | refuse, exit usage code, message names the bypass flag | `--dry-run` MUST; `--yes` (or `--force` only if it means exactly this) bypasses the prompt |
| Severe | irreversible or cascading, remote, or affects other users (delete a registry repo, publish, wipe a store including other projects' pins) | type the target name | refuse unless `--confirm=<name>` matches; `--yes` alone is not enough | `--dry-run` MUST; one extra named flag per additional consequence (gh model) |

1. MUST - Classify every mutating command into a tier and record it in the command's help (one line: "Tier: moderate"). Rationale: the agent cannot choose a flag without knowing the tier. VERIFY: `<cli> <cmd> --help | grep -E "^Tier:"` per command in the mutating inventory; absent line fails.
2. MUST - Never block on input without a TTY; with stdin closed or `CI` truthy, a command that needs confirmation exits at once with the usage code and a message naming the flag to pass. Rationale: an agent waits forever on a prompt; CLI-09 says the same for the gate, this extends it to the refusal. VERIFY: binary test below; pass if completes within 5 seconds and run-1 exit is not 0 for a moderate or severe command without the bypass.
3. MUST - Moderate and severe commands offer `--dry-run`; it runs the same validation path, makes no write, prints one line per planned change in the form `Would <verb> <target>`, and exits 0. Rationale: kubectl runs "every stage except storage" so dry-run cannot disagree with the real run; git prints `Would remove`. VERIFY: snapshot the directory tree (`find . -type f -exec sha256sum {} + | sort`) before and after a dry run; diff must be empty; the output must contain at least one `Would ` line when work is pending.
4. SHOULD - Offer a distinguishable "would change" signal for automation, either `--dry-run` printing `nothing to do` when empty, or an opt-in exit code 2 for "changes pending" (terraform `-detailed-exitcode`: 0 none, 1 error, 2 changes). Rationale: a plan step must tell the agent whether apply is needed. VERIFY: run a dry run twice, once pending and once not; outputs and (if exit-code mode exists) exit codes must differ.
5. MUST - A severe command requires the target name typed interactively, and `--confirm=<name>` non-interactively; the value must equal the target or the command exits with the usage code and changes nothing. `--yes` alone must not satisfy severe. Rationale: clig.dev "hard to confirm by accident"; `gh` requires an additional flag for cascading deletion. VERIFY: run with `--yes` only and with `--confirm=wrong`; both must exit nonzero and leave the end state unchanged (status command or file hash).
6. MUST - After any state change, print one line per changed item (`created X`, `removed X`, `set K to V`) to the result stream, and print an explicit line when nothing changed (`unchanged X`, `already absent X`, `nothing to remove`). Rationale: silent success (`git clean -f` run 2, `ocx clean` empty) is indistinguishable from failure to log readers. VERIFY: run each mutator twice; output of run 1 contains a past-tense verb line and output of run 2 contains `unchanged`, `already`, `absent`, or `nothing`; empty stdout on a mutator that exited 0 fails.
7. MUST - Repeating a command with the same intent exits 0 and reports "already done"; a command whose target exists in a conflicting state exits nonzero (usage or conflict code) and names the override flag. Rationale: agents retry; AWS idempotency treats same-token same-parameter retries as success and parameter mismatch as an error. VERIFY: binary test, assertion on run 2.
8. SHOULD - Removers use `--ignore-missing` semantics by default (grim `remove` and `uninstall` model) or accept an explicit flag (kubectl `--ignore-not-found`); never report `Logged out` when no credential existed. Rationale: a failed second delete teaches agents to wrap every call in `|| true`. VERIFY: remove a nonexistent target; exit 0 and the status word `absent`.
9. SHOULD - Every mutating command has a read-only status or list command that shows the end state, named in the mutating command's help ("Confirm with: `grim status`"). Rationale: the agent verifies instead of trusting exit 0. VERIFY: grep help for `Confirm with`; run the named command after the mutator and assert the state.
10. MUST - `--force` has one meaning per CLI: "skip the confirmation prompt" or "bypass a safety guard", never both; name guard bypasses by what they bypass (`--ignore-project-locks`). Rationale: measured overload in git, kubectl, ocx, grim, cargo. VERIFY: `<cli> --help` for each command: any command whose `--force` help line mentions both prompt and a guard or overwrite fails; the same flag name must not change meaning between commands of one CLI.
11. SHOULD - List the targets before asking (docker prune shows "WARNING! This will remove:" and the list) and report a total afterwards. VERIFY: reading heuristic: pass `Remove 3 objects (12 MB): a, b, c. Continue? [y/N]`; fail `Are you sure? [y/N]`.
12. SHOULD - Partial failure leaves a re-runnable state and says so (terraform: no automatic rollback; re-run). VERIFY: kill the command mid-run in a fixture; the second run completes and exits 0.
13. MUST - A command that exposes writes to an agent through MCP or similar keeps them off by default behind a launch-time flag (grim `--allow-writes` model) and lists which tools mutate. Rationale: MCP spec says annotations are untrusted unless the server is trusted. VERIFY: start the server without the flag and call each mutating tool; each must refuse.

Binary test (an agent can run it verbatim against any CLI; HOME and project must be throwaways):
```
for cmd in "<mutator args>"; do
  for i in 1 2; do
    timeout 20 setsid -w $cmd 0<&- >out$i 2>err$i; echo "run$i exit=$?"
  done
done
# PASS iff all hold:
# 1. neither run hit the 20 s timeout (exit 124);
# 2. moderate/severe without bypass flag: run1 exit != 0 and the status command shows state unchanged;
# 3. with bypass: run1 exit 0, out1 or err1 names the changed item;
# 4. run2 exit 0 and out2/err2 matches /unchanged|already|absent|nothing/ for same intent,
#    OR run2 exit != 0 and message names the conflicting state and the override flag;
# 5. `--dry-run` leaves the file-tree hash identical.
```

## AI-agent angle
- Agents add `--force` or `--yes` to make a command stop failing. The mechanical check: a policy that any `--force`, `--yes`, `--confirm` or `-f` in an agent-written command is paired with a prior `--dry-run` run in the same transcript (grep the transcript for the dry-run line before the flagged command).
- Agents treat exit 0 as "done" even when the output was empty. The check: assert a past-tense line or a status command result, not the exit code alone.
- Agents retry failing removals; with git `branch -D` the second run exits 1, and the agent loops or masks with `|| true`. The check: run the command twice in a throwaway directory at authoring time and encode the expected second exit.
- Agents assume `--dry-run` is available. npm says it is "NOT honored by other network related commands", kubectl wants `--dry-run=client` explicitly, and grim `remove` has none. The check: `<cmd> --help | grep -- --dry-run` before use.
- Agents confuse `--force` meanings: `ocx clean --force` collects objects pinned by other projects' locks. The check: read the help line for `--force` of that specific command.
- Agents read prompts as part of the output and never answer them. The check: run with stdin closed and `timeout`.

## Contested / evolving
- Exit code for "already done" on create: AWS and the proposed rule treat same-intent retry as success; git and the fleet (`init` 64, `direnv init` 78) treat existence as an error because the file may differ. Both are defensible; the deciding variable is whether the command compares content. Not resolved by sources; the rule above picks "same intent exits 0, conflict exits nonzero".
- Whether moderate local deletions (like `ocx clean`) need a prompt: clig.dev says "usually"; npm, cargo clean, git branch -D and the fleet do none, relying on dry-run and recoverability. Agents arguably benefit from a refusal like `git clean` more than a prompt. Trend: refuse-without-flag (git) over prompt.
- `--dry-run` vs separate plan command: terraform separates plan and apply and accepts a saved plan file as approval; kubectl, git, npm use a flag. Neither side has published evidence that one yields fewer agent errors.
- Terraform `-input=false` makes a prompting apply fail rather than proceed; docker prune without `-f` and a non-TTY stdin (not measured here) may behave differently. Consistency across tools is not established.

## Dated facts
| Fact | Source | Date or version stated | Kind |
|---|---|---|---|
| Three-tier confirmation guidance, `--confirm="name"`, `--no-input` | https://clig.dev/ | no date on page | authority (community guide) |
| Saved plan counts as approval; `-input=false` fails the prompt; no auto rollback | https://developer.hashicorp.com/terraform/cli/commands/apply | v1.17.x, no date | platform |
| `-detailed-exitcode` 0/1/2 | https://developer.hashicorp.com/terraform/cli/commands/plan | v1.17.x, no date | platform |
| kubectl delete dry-run values none/client/server | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/ | version not stated (menu v1.33-v1.37) | platform |
| Server dry-run runs all stages except storage | https://kubernetes.io/docs/reference/using-api/api-concepts/ | v1.37 links, no date | platform |
| `clean.requireForce` defaults true; `-n`, `-f`, second `-f` for nested repos | https://git-scm.com/docs/git-clean | "last updated in 2.45.0" | platform |
| gh repo delete `--yes` ignored without a repo argument; cascading-forks flag; `delete_repo` scope | https://cli.github.com/manual/gh_repo_delete | no date | platform |
| docker system prune warning, `-f`, volumes excluded by default | https://docs.docker.com/reference/cli/docker/system/prune/ | no version (filter needs API 1.28+) | platform |
| npm `--dry-run` scope; republish fails | https://docs.npmjs.com/cli/v11/commands/npm-publish | npm v11.21.3 | platform |
| Heroku `apps:destroy --confirm` exists | https://devcenter.heroku.com/articles/heroku-cli-commands | "Last updated November 18, 2026" | platform |
| EC2 client-token idempotency; `IdempotentParameterMismatch` | https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Run_Instance_Idempotency.html | no date | platform |
| MCP: human in the loop SHOULD; annotations untrusted MUST | https://modelcontextprotocol.io/specification/2025-06-18/server/tools | spec revision 2025-06-18 | authority |
| CLI-09 text | /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/rust-quality-reference/cli-contract.md line 131 (located via `grep -rn CLI-09 skills`) | catalog at HEAD 6344379 | catalog |
| Measured exit codes (table above) | local runs 2026-11-27, git 2.43.0, cargo 1.96.0, uv 0.13.9, ocx 0.6.8, grim 0.16.0 | 2026-11-27 | measurement |

## What an agent must not decide alone
- Whether a given command is severe for the product: the line between moderate and severe depends on what users lose (data, money, other people's access). Ask the owner; default to the higher tier meanwhile.
- Whether to add a prompt to a command that is currently unattended (`ocx clean`, `grim uninstall`): changes behaviour for every existing script and CI job; this is a breaking-change decision.
- Which exit code means "conflict" or "already done" in a CLI whose codes are published: exit codes are public contract (the fleet pins 64, 65, 74, 78, 79); changing one is a versioning decision.
- Whether `--force` may be repurposed or split: it breaks existing users.
- Whether destructive MCP tools may be enabled (`--allow-writes`) in a shared or production environment.
- Anything legal or compliance-bound (retention, deletion of user data, audit logs of deletions).

Cross-territory one-liners: error envelope and retry-after semantics for a second-run failure belong to UX-AGENT correctable-errors-and-retries; GUI confirmation, undo and "typed confirmation in a dialog" belong to the sibling UX-ACT dives.

## Sources
| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://clig.dev/ | CLI guidelines (authority) | no date | tiers, `--confirm`, `--no-input`, dry-run, idempotency |
| https://developer.hashicorp.com/terraform/cli/commands/apply | Terraform apply reference (primary) | v1.17.x | plan-as-approval, `-input=false` failure |
| https://developer.hashicorp.com/terraform/cli/commands/plan | Terraform plan reference (primary) | v1.17.x | `-detailed-exitcode` |
| https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/ | kubectl delete reference (primary) | version not stated | `--dry-run` values, `--force`, `--ignore-not-found`, `-i` |
| https://kubernetes.io/docs/reference/using-api/api-concepts/ | Kubernetes API concepts (primary) | v1.37 | server-side dry-run semantics, force delete |
| https://git-scm.com/docs/git-clean | git clean manual (primary) | 2.45.0 | refuse-without-flag model |
| https://cli.github.com/manual/gh_repo_delete | gh repo delete manual (primary) | no date | severe tier with extra flags and scope |
| https://docs.docker.com/reference/cli/docker/system/prune/ | docker prune reference (primary) | no version | list-then-ask, `-f`, total report |
| https://docs.npmjs.com/cli/v11/commands/npm-publish | npm publish reference (primary) | v11.21.3 | dry-run limits, republish failure |
| https://devcenter.heroku.com/articles/heroku-cli-commands | Heroku CLI reference (primary, partially read) | 2026-11-18 | `apps:destroy --confirm` |
| https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Run_Instance_Idempotency.html | EC2 idempotency (primary) | no date | same-token retry semantics |
| https://modelcontextprotocol.io/specification/2025-06-18/server/tools | MCP tools spec (authority) | 2025-06-18 | human-in-loop, untrusted annotations |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/rust-quality-reference/cli-contract.md | catalog CLI-09 | HEAD 6344379 | the existing gate |
