---
title: "code-docs audit: unbiased fleet comment sample"
agent: research-lang / code-docs-audit
model: claude-sonnet-5
scope: prod-scope comment blocks, 5 fleet repos, seeded random sample (seed=11)
method: >
  python3 rules/code-docs/checks/comment_census.py --root <repo> --scope prod
  --sample N --seed 11 --min-block 1 --format json, N = 150(ocx)/70(grimoire)/
  40(ocx-sdk-python)/30(ocx-catalog)/30(grimoire-vscode). Every sampled block read
  with +/-10..14 lines of surrounding code (dump_context.py) and hand-classified;
  full-repo totals from the same script with --group none --scope prod (no --sample)
  for the compression arithmetic. Exact commands inlined per section below.
date_researched: 2026-09-27
---

# code-docs audit: unbiased fleet comment sample

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Sampling](#1-sampling)
- [2. Classification taxonomy](#2-classification-taxonomy)
- [3. Recoverability and MINIMAL LINES](#3-recoverability-and-minimal-lines)
- [4. Per-repo composition and compression](#4-per-repo-composition-and-compression)
- [5. Guard blocks (reason-recovery eval seed)](#5-guard-blocks-reason-recovery-eval-seed)
- [6. H6 — guard information in low-value categories](#6-h6--guard-information-in-low-value-categories)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

- **320 comment blocks** drawn by seeded random sample (seed 11, uniform over block size) across 5 repos, prod scope only: `comment_census.py --sample N --seed 11 --min-block 1`.
- **100 guard blocks** found (47.9% of sampled comment lines) — a why-constraint whose absence would let a named plausible edit introduce a bug. Full list in [§5](#5-guard-blocks-reason-recovery-eval-seed).
- Fleet-wide (5 repos, real census totals, not sample-scaled): 121,394 prod comment lines over 157,113 code lines = **0.773 raw ratio**. Cutting every sampled block to its MINIMAL LINES and scaling that compression factor onto the real totals gives an **implied post-cleanup ratio of 0.323** (121,394 → ~50,813 comment lines) — arithmetic in [§4](#4-per-repo-composition-and-compression).
- That implied ratio (0.23–0.41 per repo, 0.323 pooled) lands **at or above** the owner's 1:4–1:6 hypothesis (0.17–0.25), not inside it — see [Contradictions](#contradictions-of-the-frame). The one repo that lands *below* the band (ocx-catalog, 0.29) is guard/essay-heavy, not narration-heavy; the one repo that overshoots it most (ocx-sdk-python, 0.41) is the fleet's most contract-heavy SDK.
- **H6 essentially confirmed, harder than stated**: narration + process-ID + provenance + tautology blocks are 43/320 of the sample (13.4%) but only 54/2009 of its lines (2.7%), and **exactly 1 of those 43 blocks** carries any guard-relevant information (a calibration provenance note, not a named-edit guard). Measured share of guard information in that bucket: ~0%, not "under 10 percent." See [§6](#6-h6--guard-information-in-low-value-categories).
- Plan/decision-ID collision, flagged as a hypothesis by the prior evidence, is **confirmed with a concrete instance**: `C-018` names four unrelated decisions across four different `.claude/artifacts/*.md` files in ocx (path-safety, shell-env capture order, CI lint-ratchet baseline, test-tiering escape records). See [Contradictions](#contradictions-of-the-frame).
- The census script has two classifier gaps worth fixing: PEP 723 `# ///` script-metadata blocks count as plain comments (functional, not prose), and `.claude/hooks/`+`checks/*.py` meta-tooling scripts count as `prod` scope alongside product code. See [Gaps](#gaps).

## 1. Sampling

Exact commands run (JSON captured under `code-docs-audit/scratch/samples/`):

```
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx \
  --scope prod --sample 150 --seed 11 --min-block 1 --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/grimoire \
  --scope prod --sample 70 --seed 11 --min-block 1 --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx-sdk-python \
  --scope prod --sample 40 --seed 11 --min-block 1 --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx-catalog \
  --scope prod --sample 30 --seed 11 --min-block 1 --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/grimoire-vscode \
  --scope prod --sample 30 --seed 11 --min-block 1 --format json
```

The prior census (`research_code_comment_density.md`) sampled by scanning the largest files first, which over-weights essay-shaped files. This draw is uniform over every prod-scope comment block regardless of size (the script's own `--sample` shuffles the full block list with `random.Random(seed).shuffle` before truncating), so a one-line tautology and a 40-line essay have equal odds of selection. Each block was read with 10–14 lines of surrounding code (not just the next line) via a small helper (`dump_context.py`) before classification — the `next`-line field the script prints on its own is not enough to tell a guard from narration.

Sample sizes: ocx 150, grimoire 70, ocx-sdk-python 40, ocx-catalog 30, grimoire-vscode 30 — 320 blocks total, 2009 comment lines.

## 2. Classification taxonomy

One primary category per block, read against the surrounding function/type, not the next line alone:

| Category | What it means | n (fleet sample) |
|---|---|---|
| guard | why-constraint whose absence would let a named plausible edit introduce a bug | 100 blocks / 962 lines |
| why-constraint | non-obvious local reason, not tied to a specific dangerous edit | 33 blocks / 134 lines |
| contract | what a caller must know: behaviour, errors, panics, invariants | 124 blocks / 694 lines |
| essay | multi-paragraph design argument, usually bundling several of the above | 4 blocks / 124 lines |
| record-paraphrase | restates an ADR, rule or spec (sometimes verbatim-quoted) | 2 blocks / 17 lines |
| pointer | 1-3 lines pointing at a tracked doc/spec/method for the real reason | 3 blocks / 4 lines |
| narration | restates the code that follows | 8 blocks / 14 lines |
| tautology | restates the name | 33 blocks / 33 lines |
| process-id | plan/contract/work-package ID is the block's only non-obvious content | 1 blocks / 1 lines |
| provenance | history of how the code came to be (calibration, incident, migration) | 1 blocks / 6 lines |
| todo-debt | explicit deferred-work marker (ponytail-style) naming a ceiling and upgrade path | 1 blocks / 6 lines |
| section-marker | pure navigation banner | 9 blocks / 11 lines |
| other | doesn't fit the taxonomy (functional tool metadata, not prose) | 1 blocks / 3 lines |

Two classifier misses worth naming (`file:line` — what happened):
- `grimoire:.claude/hooks/conventional_commit_validator.py:1` — a PEP 723 `# /// script` / `# requires-python` header is functional metadata `uv run` reads, not prose; the script counts it as a plain comment (`kind=line`), inflating the ratio with non-narrative content the way the script already excludes license headers and tool directives.
- `ocx-catalog:src/webview/protocol.ts` doc blocks and similar — correctly classified, but `PY_IFACE_DECOR_RE`/`RUST_IFACE_RE` (clap/schemars/click) have no TSDoc/JSDoc equivalent, so a TS project's own public-API surface docs (e.g. `webview/protocol.ts`'s wire-message unions) land in ordinary `doc`, not `interface` — harmless for this audit (I read every block by hand) but means the fleet table's `ratio` already slightly overweights TS repos relative to Rust ones for this reason.

## 3. Recoverability and MINIMAL LINES

- **RECOVERABLE-FROM-CODE**: `Y` — a competent reader derives it from code/types/names/tests in the same file with no extra cost; `P` — partly, the mechanism is visible but the *why* is not; `N` — not recoverable at all without the comment.
- **MINIMAL LINES**: fewest comment lines that keep every piece of information not recoverable elsewhere. `0` for pure narration/tautology; the observed range for guards is 1-12 (the longest, ocx's SSRF/index-chain/consent essays, cannot compress below the single paragraph that states the invariant and its counterfactual).

Fleet-wide split: **Y=58** (18.1%), **P=134** (41.9%), **N=128** (40.0%). 262 of 320 blocks (81.9%) carry at least partial non-recoverable content — most of the fleet's comment mass is not narration dressed up, it fails the recoverability test at least partly.

## 4. Per-repo composition and compression

`ratio = (doc + plain comment lines) / code lines`, full-repo totals via `comment_census.py --root <repo> --scope prod --group none --format json` (no `--sample`):

```
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx --scope prod --group none --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/grimoire --scope prod --group none --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx-sdk-python --scope prod --group none --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/ocx-catalog --scope prod --group none --format json
python3 rules/code-docs/checks/comment_census.py --root /home/mherwig/dev/grimoire-vscode --scope prod --group none --format json
```

### ocx

Census: code=95,725, doc=63,083, line=18,514, ratio=0.852. Sample: n=150, 1069 comment lines, 424 MINIMAL lines → **compression factor 0.397**.

Arithmetic: 81,597 real prod comment lines × 0.397 = **~32,364 implied minimal lines** → implied post-cleanup ratio **0.338** (95,725 code lines unchanged).

| Category | Blocks | Lines | Share | 90% CI (share) |
|---|---:|---:|---:|---:|
| guard | 58 | 663 | 62.0% | [55.5%, 68.5%] |
| why-constraint | 8 | 45 | 4.2% | [1.5%, 6.9%] |
| contract | 51 | 273 | 25.5% | [19.7%, 31.4%] |
| essay | 1 | 34 | 3.2% | [0.8%, 5.5%] |
| record-paraphrase | 1 | 14 | 1.3% | [0.0%, 2.8%] |
| pointer | 3 | 4 | 0.4% | [0.0%, 1.2%] |
| narration | 4 | 7 | 0.7% | [0.0%, 1.7%] |
| tautology | 17 | 17 | 1.6% | [0.0%, 3.3%] |
| provenance | 1 | 6 | 0.6% | [0.0%, 1.6%] |
| section-marker | 6 | 6 | 0.6% | [0.0%, 1.6%] |

### grimoire

Census: code=41,850, doc=19,256, line=6,467, ratio=0.615. Sample: n=70, 243 comment lines, 121 MINIMAL lines → **compression factor 0.498**.

Arithmetic: 25,723 real prod comment lines × 0.498 = **~12,809 implied minimal lines** → implied post-cleanup ratio **0.306** (41,850 code lines unchanged).

| Category | Blocks | Lines | Share | 90% CI (share) |
|---|---:|---:|---:|---:|
| guard | 16 | 77 | 31.7% | [22.5%, 40.8%] |
| why-constraint | 5 | 17 | 7.0% | [2.0%, 12.0%] |
| contract | 30 | 121 | 49.8% | [40.0%, 59.6%] |
| record-paraphrase | 1 | 3 | 1.2% | [0.0%, 3.4%] |
| narration | 4 | 7 | 2.9% | [0.0%, 6.2%] |
| tautology | 11 | 11 | 4.5% | [0.4%, 8.6%] |
| process-id | 1 | 1 | 0.4% | [0.0%, 1.7%] |
| section-marker | 1 | 3 | 1.2% | [0.0%, 3.4%] |
| other | 1 | 3 | 1.2% | [0.0%, 3.4%] |

### ocx-sdk-python

Census: code=5,362, doc=5,095, line=117, ratio=0.972. Sample: n=40, 358 comment lines, 151 MINIMAL lines → **compression factor 0.422**.

Arithmetic: 5,212 real prod comment lines × 0.422 = **~2,198 implied minimal lines** → implied post-cleanup ratio **0.41** (5,362 code lines unchanged).

| Category | Blocks | Lines | Share | 90% CI (share) |
|---|---:|---:|---:|---:|
| guard | 9 | 98 | 27.4% | [15.8%, 39.0%] |
| why-constraint | 1 | 3 | 0.8% | [0.0%, 3.2%] |
| contract | 26 | 253 | 70.7% | [58.8%, 82.5%] |
| tautology | 4 | 4 | 1.1% | [0.0%, 3.9%] |

### ocx-catalog

Census: code=3,179, doc=2,670, line=545, ratio=1.011. Sample: n=30, 231 comment lines, 67 MINIMAL lines → **compression factor 0.29**.

Arithmetic: 3,215 real prod comment lines × 0.29 = **~932 implied minimal lines** → implied post-cleanup ratio **0.293** (3,179 code lines unchanged).

| Category | Blocks | Lines | Share | 90% CI (share) |
|---|---:|---:|---:|---:|
| guard | 12 | 106 | 45.9% | [30.9%, 60.9%] |
| why-constraint | 3 | 11 | 4.8% | [0.0%, 11.2%] |
| contract | 10 | 34 | 14.7% | [4.1%, 25.4%] |
| essay | 2 | 72 | 31.2% | [17.3%, 45.1%] |
| tautology | 1 | 1 | 0.4% | [0.0%, 2.4%] |
| todo-debt | 1 | 6 | 2.6% | [0.0%, 7.4%] |
| section-marker | 1 | 1 | 0.4% | [0.0%, 2.4%] |

### grimoire-vscode

Census: code=10,997, doc=3,511, line=2,136, ratio=0.514. Sample: n=30, 108 comment lines, 48 MINIMAL lines → **compression factor 0.444**.

Arithmetic: 5,647 real prod comment lines × 0.444 = **~2,510 implied minimal lines** → implied post-cleanup ratio **0.228** (10,997 code lines unchanged).

| Category | Blocks | Lines | Share | 90% CI (share) |
|---|---:|---:|---:|---:|
| guard | 5 | 18 | 16.7% | [5.5%, 27.9%] |
| why-constraint | 16 | 58 | 53.7% | [38.7%, 68.7%] |
| contract | 7 | 13 | 12.0% | [2.3%, 21.8%] |
| essay | 1 | 18 | 16.7% | [5.5%, 27.9%] |
| section-marker | 1 | 1 | 0.9% | [0.0%, 3.8%] |

## 5. Guard blocks (reason-recovery eval seed)

All 100 guard blocks found in the sample, one line each: `repo:file:line (len)` — verbatim opening clause — **edit prevented**.

### ocx (58 guards)

- `ocx:.claude/hooks/hook_utils.py:514` (len 1) — "Lock may already be released by a stale-reclaim path; not fatal." — **re-raising this OSError fails merge_pending whenever a stale-reclaim path already removed the lock dir first**
- `ocx:crates/ocx_announce/src/claim/owners.rs:174` (len 2) — "The reused seed IS `authenticated_identity`'s answer, so it" — **setting Resolved without it actually coming from the reused seed decouples identity from the rung it resolved under**
- `ocx:crates/ocx_announce/src/forge/api.rs:167` (len 10) — "The account behind a forge credential or a login." — **deriving bot from a login heuristic both misses real service accounts and libels human ones; a defaulted bot:false for an unlooked-up account is the fail-open direction that must never happen**
- `ocx:crates/ocx_announce/src/forge/credentials.rs:431` (len 6) — "Whether this process is a GitLab CI job." — **reimplementing a second in_gitlab_ci-equivalent check risks the job-token rung and ForgeCredentials::in_gitlab_ci disagreeing about what counts as in-CI**
- `ocx:crates/ocx_announce/src/forge/git_workspace.rs:309` (len 7) — "A temporary blobless clone of the index repository." — **adding an explicit Drop here risks a panic during unwinding (e.g. if cleanup fails while already unwinding), which aborts the whole process**
- `ocx:crates/ocx_announce/src/forge/github.rs:791` (len 39) — "Verify the credential may push a branch to `repo`, before anything is" — **removing this permissions.push preflight lets GitHub's 404-for-unauthorized get misread as fresh-fork provisioning race, triggering a pointless sleep-and-replay before an opaque failure**
- `ocx:crates/ocx_cli/src/app/context.rs:1085` (len 3) — "The base URL and its transport are one decision, taken inside" — **picking the transport separately here could choose a different scheme than the one the SSRF-relevant gate already validated**
- `ocx:crates/ocx_cli/src/command/pull.rs:424` (len 2) — "Place successes by index; collect failures with their index so the" — **reporting the first-completed failure instead of sorting by index makes the exit code non-deterministic across runs, since tasks complete in arbitrary order**
- `ocx:crates/ocx_cli/src/command/self_group/activate.rs:523` (len 14) — "Render the `Plan` as shell code." — **reordering to removes-before-restores (or assuming full disjointness) applies the removal against the wrong value when a key retires from both scopes with different kinds**
- `ocx:crates/ocx_cli/src/command/self_group/activate.rs:1155` (len 15) — "Generate the shell-completion script to emit inline into the activation" — **emitting the completion block after the PATH prepend breaks PowerShell's using-namespace-first requirement, verified failure mode on real Windows PowerShell**
- `ocx:crates/ocx_cli/src/command/toolchain_exec.rs:171` (len 8) — "Reject a malformed `--env` before any filesystem or network work," — **deferring --env validation to composition time lets filesystem/network work run before surfacing a malformed --env to the operator**
- `ocx:crates/ocx_cli/src/command/toolchain_exec.rs:411` (len 2) — "clap enforces `last = true, num_args = 1.., required = true` on the" — **relaxing clap's argv constraints makes this .expect() panic on empty argv instead of failing gracefully**
- `ocx:crates/ocx_cli/src/command/update.rs:105` (len 4) — "Scoped mode carries untouched pins forward, so it needs a" — **checking for a missing lock after starting resolve lets a registry failure mask the real problem non-deterministically**
- `ocx:crates/ocx_cli/src/exit/ocx_sign.rs:133` (len 2) — "Frozen contract C-S1-1: snake_case parallel of the variant name." — **adding a wildcard arm here would silently produce a wrong kind_detail string for a new variant instead of failing to compile**
- `ocx:crates/ocx_cli/src/options/completion.rs:37` (len 4) — "`interactive` is the caller's signal: the shim decides it and passes an" — **probing stderr internally for interactivity misdetects when the shim has redirected stderr**
- `ocx:crates/ocx_cli/src/options/identifier.rs:19` (len 3) — "This argument as a **write target**: the registry location a publish" — **routing a publish's write target through index resolution (like a read) sends writes to the wrong physical location**
- `ocx:crates/ocx_config/src/env.rs:303` (len 14) — "Operator-supplied extra CA root material — a path, or inline PEM text" — **forwarding OCX_EXTRA_CA_CERTS to children risks exceeding Windows' env-var length limit with inline PEM, and treats public CA material like a credential unnecessarily**
- `ocx:crates/ocx_config/src/insecure.rs:4` (len 14) — "The one answer to "may this registry be contacted over plain HTTP?"." — **computing the insecure-hosts answer separately per gate risks one gate treating a host as insecure while another treats it as secure**
- `ocx:crates/ocx_config/src/lib.rs:1277` (len 18) — "C-018's system locations matched as **subtrees** — a candidate at or under" — **a blanket /var prefix refuses every toolchain_dir on ostree-composed Fedora variants (Silverblue/Kinoite/CoreOS/Bazzite), where /home symlinks to /var/home**
- `ocx:crates/ocx_config/src/lib.rs:1591` (len 2) — "SAFETY: `geteuid` reads the calling process's own credentials. It takes no" — **(unsafe-block safety justification; no separate edit framing needed)**
- `ocx:crates/ocx_index/src/local_index.rs:112` (len 19) — "Every configured namespace's `[registries."<ns>"].trusted_hosts` SSRF" — **storing trusted_hosts per chained construction instead of on the shared LocalIndex risks some chain forgetting the SSRF exemption entirely**
- `ocx:crates/ocx_index/src/store.rs:510` (len 8) — "Absent or stale → self-heal under the source's transaction lock, but" — **failing the whole resolve when the self-heal write can't land breaks resolution on any read-only index home even though the read itself succeeded**
- `ocx:crates/ocx_oci/src/auth/registry_url.rs:33` (len 1) — "4. Special-case the docker.io aliases for round-trip with `docker login`." — **removing the docker.io special case breaks round-trip identity with docker login's own normalization**
- `ocx:crates/ocx_oci/src/copy.rs:547` (len 3) — "One byte past the declaration: an over-long body then reaches the" — **capping the read at exactly declared bytes would silently truncate an over-long malicious body and hash it as if it were the whole blob**
- `ocx:crates/ocx_oci/src/ssrf.rs:545` (len 31) — "The SSRF floor, route-aware — the production replacement for" — **doing a DNS lookup on the proxied route fails on proxy-only-DNS networks (ocx#407) and validates an address nothing actually dials**
- `ocx:crates/ocx_package/src/cascade/gather.rs:4` (len 24) — "The read half of `ocx package cascade check\|repair`." — **tolerating a transient read failure like the push path does lets check invent a finding from a temporarily-unreachable artifact, and repair would then write the wrong graph**
- `ocx:crates/ocx_package/src/metadata/entrypoint.rs:22` (len 8) — "Maximum byte length of an entrypoint name." — **raising MAX_LEN without accounting for Windows' 260-char MAX_PATH risks launcher filenames that fail to create**
- `ocx:crates/ocx_package_manager/src/tasks/garbage_collection/reachability_graph.rs:147` (len 5) — "Register shims with the PACKAGE shape — entry *and* edges — never the" — **registering a shim with the passive shape instead of package shape drops its refs/blobs/ edges, the only thing protecting a deferred tool's closure blobs from GC**
- `ocx:crates/ocx_package_manager/src/tasks/inspect.rs:398` (len 5) — "The root itself is a leaf platform manifest inspect already fetched" — **skipping staging of the root manifest defeats goals 4+5 of the inspect-metadata-closure design for a --deps walk**
- `ocx:crates/ocx_package_manager/src/tasks/pull.rs:509` (len 5) — "Assemble package content/ by hardlinking files from all layers." — **allowing two layers to declare the same path (last-wins overlay) contradicts the stated invariant that overlap is an error**
- `ocx:crates/ocx_package_manager/src/tasks/pull_local.rs:182` (len 4) — "Local materialization: every layer was staged above (a `Digest`" — **reading a resolved transport location from transport_pinned for local materialization misuses a field that carries none**
- `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:1988` (len 12) — "One `bin_fingerprint` entry per on-disk file that landed (RUL-22, RUL-26)." — **re-implementing the stat+hash logic here instead of sharing BinEntryStamp::of_file risks silently diverging from the prompt gate's version**
- `ocx:crates/ocx_package_manager/src/tasks/sbom.rs:4` (len 15) — "`sbom_one` — list every verified attestation a package carries." — **adding a --no-verify escape to sbom_one lets unverified registry-controlled text be presented as fact (SEC-32); picking one of several verified SBOMs by listing order silently drops real attestations**
- `ocx:crates/ocx_project/src/config.rs:874` (len 20) — "Parse one `[tools]` value into the [`PackageRef`] the schema boundary" — **inlining tag-injection logic elsewhere gives the renderer no single place to ask whether a line already matches, so it rewrites lines the mutation never touched**
- `ocx:crates/ocx_project/src/consent.rs:507` (len 42) — "Record consent for `project_dir` over `sources` (C-024)." — **adding a consent stamp inside the shared loader auto-grants write consent on read-only commands (inspect, patch freeze, ocx env, lock --check), silently widening a security control**
- `ocx:crates/ocx_project/src/env.rs:408` (len 12) — "Hand-written because schemars reads the field's Rust TYPE and so" — **deriving the schema instead of hand-writing it publishes only the table arm, red-underlining the common string form for nearly every correct [env] block**
- `ocx:crates/ocx_python/src/collide.rs:4` (len 8) — "Publish-time collision pre-check across a selected wheel set." — **skipping this pre-check risks two repacked wheels claiming the same installed path reaching the registry, corrupting it with an ambiguous union**
- `ocx:crates/ocx_python/src/naming.rs:54` (len 9) — "A rendered, repo-relative wheel reference." — **allowing URL-less wheels to reach WheelReference construction violates the assumption that keeps wheel_reference infallible**
- `ocx:crates/ocx_setup/src/error.rs:69` (len 5) — "The `--managed-config` ref could not be re-parsed as a valid OCI" — **skipping this re-validation removes defense-in-depth against a ref that somehow reaches this point malformed**
- `ocx:crates/ocx_setup/src/session_path/linux.rs:87` (len 16) — "Characters an `environment.d` value cannot carry **as its first character**," — **refusing only the leading entry (not every directory) makes encode()'s answer depend on render_conf's ordering, a contract that silently changes when order does**
- `ocx:crates/ocx_setup/src/session_path/linux.rs:320` (len 28) — "Subtract `directories` from `ocx.conf`, and delete the file when nothing of" — **deleting the whole conf file because it exists takes the current entries with it, breaking C-036's unchanged-report promise and even --dry-run's prediction**
- `ocx:crates/ocx_setup/src/session_path/windows.rs:356` (len 3) — "SAFETY: `key` is open for the whole call; `name` and `data` are" — **(unsafe-block safety justification)**
- `ocx:crates/ocx_setup/src/session_path/windows.rs:458` (len 3) — "A `REG_SZ` value whose text already merges to itself still has to be" — **skipping the type rewrite when text is already correct leaves %VAR% expansion broken for every other PATH entry, rustup's known bug**
- `ocx:crates/ocx_shell/src/shell/reconcile/fingerprint.rs:168` (len 16) — "Members 1-2 — the project tier. `[env]` applies on its own authority" — **hardcoding <dir>/ocx.toml instead of the resolved project_config path watches a file the project may not use, making [env]-only edits invisible at every prompt**
- `ocx:crates/ocx_shell/src/shell/reconcile/fingerprint.rs:211` (len 7) — "Member 8 — the config tiers (A-13, A-33)." — **re-deriving the config-tier list with different logic than the loader risks the watch set disagreeing with what config actually loaded**
- `ocx:crates/ocx_shell/src/shell/reconcile/plan.rs:628` (len 9) — "C-016's structural half, and the whole of the lost-ledger repair (C-006)." — **implementing this as additive (ensure D's segments are in front) instead of subtractive leaves both old and new package bin dirs on PATH, since move-to-front only reorders, never dedupes**
- `ocx:crates/ocx_shim/src/core.rs:178` (len 15) — "Whether dispatching `sidecar` must clear `OCX_GLOBAL` and `OCX_PROJECT`" — **returning true for sidecar kinds beyond .exec would make every trampoline on PATH inherit stripping meant only for toolchain-home dispatch**
- `ocx:crates/ocx_shim/src/main.rs:808` (len 3) — "── Step 11: wait + GetExitCodeProcess ─────────────────────────────────" — **(unsafe-block safety justification)**
- `ocx:crates/ocx_sign/src/sign/bundle.rs:294` (len 11) — "Assemble a Sigstore bundle v0.3 carrying a DSSE envelope." — **passing envelope and its uploaded bytes separately risks a canonicalization mismatch between what Rekor logged and what gets bundled**
- `ocx:crates/ocx_sign/src/sign/oidc_ambient_inline.rs:97` (len 32) — "Append the audience and apply both endpoint gates before anything dials." — **swapping the two gates' order lets a plaintext non-loopback token URL leak the bearer token before SSRF ever runs; merging their error reasons leaves an operator unable to tell a scheme problem from a trust-list problem**
- `ocx:crates/ocx_sign/src/sign/pipeline.rs:565` (len 6) — "Push the referrer's blobs: the OCI empty-config blob (the manifest's" — **pushing the manifest before both referenced blobs land gets rejected with MANIFEST_INVALID by a spec-strict registry**
- `ocx:crates/ocx_sign/src/verify.rs:55` (len 5) — "The instant certificate validity is judged against, tagged with its" — **reading the wall clock directly instead of the provenance-tagged instant lets a caller substitute an untrustworthy time source for the certificate-validity proof**
- `ocx:crates/ocx_sign/src/verify/pipeline.rs:1383` (len 34) — "1. Resolve the reference's manifest **through the index chain**, not" — **resolving directly through the registry transport instead of the index chain bypasses guard_local_physical and the mirror map, breaking --offline and losing the member list C-008's membership test needs**
- `ocx:crates/ocx_store/src/file_structure/toolchain_store.rs:430` (len 20) — "Whether `<root>/active` is a link at exactly its derived target" — **using Path::is_symlink instead of is_link reports false for a Windows junction, silently treating a valid link as absent; treating a read_link error as unchanged instead of invalid lets an escaping link (CWE-426) go undetected**
- `ocx:crates/ocx_store/src/shim.rs:165` (len 32) — "Whether an already-published shim blob of `published_len` bytes may be" — **checking existence alone (matching the normal publish-only-when-absent rule) leaves a present-but-truncated Windows shim blob hardlinked into every launcher with no recovery path**
- `ocx:crates/ocx_util/src/fs/path.rs:139` (len 1) — "4. Any residual leading `..` escapes the root." — **(part of an explicit multi-step path-traversal containment pipeline)**
- `ocx:crates/ocx_util/src/fs/symlink_walk.rs:100` (len 9) — "Synchronous sibling of [`refuse_if_symlink_in_path`] for blocking contexts." — **omitting the boundary parameter (or refusing on any ancestor symlink) refuses extraction under a symlinked $OCX_HOME even though the real risk is a symlink an earlier archive entry planted below the root**
- `ocx:crates/ocx_util/src/tls.rs:22` (len 7) — "Ceiling on the combined size of an operator-supplied extra-CA-roots PEM" — **raising this constant without checking config's MAX_CONFIG_SIZE or the Windows env-var limit could make config.toml unloadable or break env-var delivery entirely**

### grimoire (16 guards)

- `grimoire:src/catalog/rating_provider.rs:395` (len 2) — "The credential, still wrapped. Callers must not clone the exposed" — **cloning the SecretString out of the single header call site risks the secret reaching logs or unaudited code paths**
- `grimoire:src/command/add.rs:507` (len 6) — "Same-name conflict guard, on full-source equality rather than the" — **comparing on repository path instead of full-source equality would treat a re-declared identical path source as a bogus 'new version', since paths carry no version concept**
- `grimoire:src/command/rate.rs:437` (len 2) — "No host resolved means nothing was chosen, by the index or by grim —" — **mapping host_source to a string even when host is None reports a resolution source for a decision that never happened**
- `grimoire:src/error.rs:174` (len 7) — "Maps an error chain to a [`Classification`] (exit code + optional" — **removing/weakening the test locking classify()'s fallback lets a new Error variant silently exit as generic Failure unnoticed**
- `grimoire:src/install/claude_config.rs:241` (len 5) — "Declining is the safe half of a disagreement, not a non-event:" — **silently skipping instead of warning would hide that vendor_claude::scope_root still writes rule content while the exclusion registration silently didn't happen**
- `grimoire:src/install/install_state.rs:136` (len 14) — "Whether this output is present on disk: the target path exists, and —" — **propagating an unparseable-config-file error instead of Ok(false) flags a state read as install-state corruption rather than a deliberate degrade**
- `grimoire:src/install/installer.rs:2472` (len 2) — "Bundles expand into members at resolve time and never enter the" — **calling locate_canonical with ArtifactKind::Bundle panics; the invariant is that bundles never enter the lock upstream**
- `grimoire:src/install/path_anchor.rs:249` (len 2) — "Parse a serialized tag. `None` for any tag grim does not know — the" — **defaulting an unrecognized tag to a fallback anchor instead of None silently misroutes it instead of failing closed**
- `grimoire:src/install/path_anchor.rs:436` (len 11) — "Permit an escape whose leaf is not itself a symlink: Layer 1 already" — **assuming this variant's relaxed check also holds on Windows is wrong: reparse tags (LX_SYMLINK, APPEXECLINK, WCI) aren't all caught by is_symlink, so Windows must behave like Strict**
- `grimoire:src/install/vendor.rs:171` (len 8) — "[`Vendor::pool_capable`] with both inputs injected." — **removing the declares_skill_fields conjunct removes the only mechanism catching a future vendor added to the pool while also declaring skill fields**
- `grimoire:src/install/vendor_kilo.rs:133` (len 1) — "Never called: rules are skipped at the `kind_support` gate." — **removing the kind_support gate that declines Rule for Kilo makes this stub the live path, silently returning no content**
- `grimoire:src/install/vendor_openclaw.rs:117` (len 1) — "Dead path: `kind_support` declines `Agent`. Defensive location." — **same reasoning as rule_index: removing the gate makes this stub live**
- `grimoire:src/install/vendor_warp.rs:69` (len 2) — "`.warp` is product-specific. NEVER key on `.agents/` — Warp scans" — **detecting Warp via generic .agents/ presence false-positives for every pool-scanning client**
- `grimoire:src/oci/access/registry_client.rs:42` (len 9) — "The OCI empty config descriptor media type. Stamped on every pushed" — **reverting to a custom per-kind config type (or an explicit artifactType) breaks push against GitLab, which rejects both as off its allowlist**
- `grimoire:src/oci/release.rs:160` (len 2) — "Explicit --cascade: require semver. A non-semver value is a typo" — **letting a prerelease cascade into floating tags would advertise a prerelease as a stable version's floating channel**
- `grimoire:src/tui/render.rs:560` (len 3) — "P3.2: bundle leaves carry an expand/collapse arrow glyph." — **adding an ASCII fallback (or omitting the glyph) contradicts the stated deliberate UTF-8-only policy for bundle arrows**

### ocx-sdk-python (9 guards)

- `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:431` (len 22) — "Look `name` up on a PATH, entry by entry, refusing unsafe hits." — **scanning the whole PATH string at once (stdlib shutil.which behavior) reinstates CWE-426 since Windows inserts cwd ahead of PATH**
- `ocx-sdk-python:src/ocx_sdk/_client.py:2149` (len 2) — "Exit 1 is a failed assertion WITH the v1 envelope on stdout — a" — **treating exit 1 as a failure instead of a parseable result would reject a legitimate assertion-failure envelope**
- `ocx-sdk-python:src/ocx_sdk/_client.py:3556` (len 11) — "Materialize the sweep tags and say whether this call sweeps (D2)." — **allowing tags=[] to proceed instead of raising silently violates the overload set's return-type promise (SweepReport claimed, bare report returned)**
- `ocx-sdk-python:src/ocx_sdk/_dist.py:614` (len 24) — "Return the digest the manifest body must have, refusing an unpinned fetch." — **resolving digest from a URL after a redirect, or trusting TLS reachability off-canonical-host as authenticity, lets a malicious mirror serve unpinned content (CWE-345)**
- `ocx-sdk-python:src/ocx_sdk/_dist.py:873` (len 6) — "Return the `User-Agent` every request identifies itself with." — **reading the version from ocx_sdk.__version__ here creates an import cycle since the package root imports this module**
- `ocx-sdk-python:src/ocx_sdk/_env.py:151` (len 2) — "Case rule, module docstring. Over-dropping a variable nothing reads is" — **loosening _NEUTRALIZED_KEYS matching risks leaking the kill-switch variable to the child instead of over-dropping a harmless one**
- `ocx-sdk-python:src/ocx_sdk/_env.py:246` (len 4) — "The one flag whose default is True, so it is written either way: a" — **writing this flag only when non-default leaves an ambient OCX_NO_UPDATE_CHECK=1 unbeatable**
- `ocx-sdk-python:src/ocx_sdk/_process.py:165` (len 22) — "Build an ocx argv: `[exe, *global_flags, *command, *positionals, --, *child]`." — **passing global flags after the subcommand breaks ocx's clap grammar, which only recognizes them in the leading position**
- `ocx-sdk-python:src/ocx_sdk/_process.py:704` (len 5) — "Join captured bytes into redacted text, replacing anything undecodable." — **not translating \r\n to \n here makes the async decode path diverge from the sync path's text-mode output on Windows**

### ocx-catalog (12 guards)

- `ocx-catalog:src/sources/git.ts:154` (len 4) — "`git clone --branch <ref>` only accepts a real advertised branch/tag" — **passing --branch HEAD fails clone with 'Remote branch HEAD not found'; must treat HEAD as absent ref**
- `ocx-catalog:src/sources/types.ts:231` (len 20) — "Basename of the ad-blocker-safe ALIAS copy of a package root, written" — **reverting to only the canonical p/<ns>/<pkg>.json path re-triggers ad-blocker false positives for names matching ~800 EasyList/EasyPrivacy word rules (observed on hawkeye)**
- `ocx-catalog:src/theme/composables/useImageIndex.ts:37` (len 13) — "C-600: reuses `readImageIndexAnnotations` (`src/viewmodel/catalog.ts`)" — **removing the try/catch here (to match the strict build-time parser) crashes the whole package detail page on any malformed third-party OCI annotation**
- `ocx-catalog:src/theme/composables/useInstallFlavors.ts:16` (len 2) — "Command template carrying the literal `{name}` token — substitute with" — **hand-substituting the {name} token bypasses whatever normalization installCommand() applies**
- `ocx-catalog:src/theme/composables/usePackageRoot.ts:74` (len 19) — "Fetches the wire package root — `<wireBase>/p/<ns>/<pkg>/_root.json`, the" — **building a CAS asset URL from root.name instead of the ns/pkg route params 404s every CAS request, since root.name carries the ocx.sh/ prefix**
- `ocx-catalog:src/theme/utils/modifierKey.ts:27` (len 9) — "True on macOS, iPadOS and iOS. Read at call time rather than at module load" — **calling isApplePlatform() before mount always returns false (no navigator in SSR), so a caller that doesn't defer past hydration renders the wrong modifier and risks a hydration mismatch**
- `ocx-catalog:src/theme/utils/sanitize.ts:86` (len 3) — "GFM table column alignment (`\|:--\|:-:\|--:\|`) — verified against real" — **loosening/tightening the alignment regex without checking real markdown-it@14 output could stop matching legitimate GFM table styles**
- `ocx-catalog:src/theme/utils/sanitize.ts:113` (len 4) — "Silently returning unsanitized HTML here would be worse than crashing" — **returning a no-op instead of throwing when window is undefined would silently ship unsanitized README HTML instead of loudly failing a wiring mistake**
- `ocx-catalog:src/theme/utils/version.ts:163` (len 1) — "Variant: None > Some (default variant sorts last)" — **inverting so null sorts first would break parity with the Rust Ord impl this mirrors**
- `ocx-catalog:src/theme/utils/version.ts:192` (len 1) — "Build: Some < None" — **flipping this comparison inverts build-tag ordering relative to the mirrored Rust implementation**
- `ocx-catalog:src/viewmodel/catalog.ts:171` (len 20) — "Mount prefix for one source's mirrored wire tree — `""` for the" — **hardcoding /p/... instead of going through wirePrefix() 404s logoUrl/readmeUrl for every non-root source, silently**
- `ocx-catalog:vitest.config.ts:8` (len 10) — "`@localSearchIndex` is a VitePress virtual module, published only by" — **removing the stub breaks SearchModal.vue's import analysis, risking a return to the observed bug where every package linked to a bare path and 404'd, undetected by tests**

### grimoire-vscode (5 guards)

- `grimoire-vscode:src/installer.ts:40` (len 6) — "True when the resolved grim can be handed browse-filter patterns and a" — **using MINIMUM_GRIM_VERSION instead of REGISTRY_EDIT_GRIM_VERSION shows registry-edit UI to grim builds that reject the `set` verb, so every save silently fails**
- `grimoire-vscode:src/views/details.ts:833` (len 3) — "An empty message is the user declining the disclosure — nothing" — **showing a toast for an empty outcome.message would surface a real message for a decline, since empty means decline not failure**
- `grimoire-vscode:src/views/html.ts:15` (len 3) — "Server-side body inlined into #root so the first HTML parse shows structure" — **passing unescaped/user-controlled content to bodyContent injects it into the webview HTML verbatim**
- `grimoire-vscode:src/views/sidebar.ts:826` (len 2) — "Other refresh triggers can race a watcher-driven one and carry the same" — **removing dedupe:true resurfaces duplicate error popups when refreshes race**
- `grimoire-vscode:src/views/vote.ts:125` (len 4) — "PIPE NOTHING. Falling through to a token-less `grim rate` would make" — **falling through to a token-less grim rate call makes grim try its own credential ladder against a host we know we can't authenticate against**

## 6. H6 — guard information in low-value categories

Frame H6: "Narration, plan IDs, history and tautology carry under 10 percent of guard information; essays and why-constraints carry most of it."

Every block classified `narration`, `process-id`, `provenance` or `tautology` in the sample, checked for latent guard content (a named edit it would let through):

| repo | narration | tautology | process-id | provenance | subtotal blocks | subtotal lines | carries guard content |
|---|---:|---:|---:|---:|---:|---:|---:|
| ocx | 4 | 17 | 0 | 1 | 22 | 30 | 1 (provenance) |
| grimoire | 4 | 11 | 1 | 0 | 16 | 19 | 0 |
| ocx-sdk-python | 0 | 4 | 0 | 0 | 4 | 4 | 0 |
| ocx-catalog | 0 | 1 | 0 | 0 | 1 | 1 | 0 |
| grimoire-vscode | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **fleet** | | | | | **43** | **54** | **1 / 43** |

The one exception: `ocx:.claude/rules/docs-quality/checks/prose.py:101` — a `provenance` block recording which AI-writing "tells" were excluded from a lint wordlist after a wave-2 false-positive review, with exact counts ("12 of 18 were those two words used as ordinary technical nouns"). It carries real preventive value (don't re-add `underscore`/`unlock`/`paradigm`/`realm`) but names no single edit and states no consequence the way a `guard` block does — it is evidence a human would need to re-derive the same decision, not a guard in the strict sense used here.

**Measured result: ~0% (1 borderline case in 43 blocks, 54 lines = 2.7% of sampled comment mass), stronger than H6's "under 10 percent."** Deleting every narration/tautology/process-ID-only/provenance block in this sample would not have cost a single guard.

## Smells (ranked)

1. **Guards buried inside 20-40 line essays, with no way to grep for just the load-bearing sentence.** `ocx:crates/ocx_project/src/consent.rs:507` (42 lines), `ocx:crates/ocx_sign/src/verify/pipeline.rs:1383` (34 lines), `ocx:crates/ocx_announce/src/forge/github.rs:791` (39 lines), `ocx:crates/ocx_store/src/shim.rs:165` (32 lines), `ocx:crates/ocx_sign/src/sign/oidc_ambient_inline.rs:97` (32 lines), `ocx-catalog:.lighthouserc.cjs:2` (51 lines). Every one of these is genuinely load-bearing (MINIMAL LINES 6-12, not 0) — the smell is not that they exist, it's that the guard sentence and five paragraphs of supporting argument are the same font, same indent, same nothing-to-grep-for. A cold agent has to read the whole essay to find the one clause that would break something.
2. **The same plan ID names different decisions in different files.** `C-018` alone: path-safety refusal (`crates/ocx_config/src/lib.rs:1277`), shell-env capture ordering (`.claude/artifacts/adr_shell_env_addenda.md:1960`), CI lint-ratchet baseline allow-list (`.claude/artifacts/plan_bazel_cargo_port.md:252`), and test-tiering escape records (`.claude/artifacts/plan_test_speed_tiers.md:311`). An agent that greps `C-018` to resolve a comment's pointer has a 1-in-4 chance (in this sample) of reading the wrong decision.
3. **Meta-tooling comments counted as product comments.** `ocx` and `grimoire` both keep `.claude/hooks/*.py` and `.claude/rules/*/checks/*.py` (AI-agent governance scripts) in prod scope alongside the shipped CLI/library. They read completely differently (rule catalogs, DOC-TYPE-NN tables) from the surrounding Rust, and blend two populations into one ratio number. 7/150 ocx sample blocks (4.7%) and 6/70 grimoire sample blocks (8.6%) came from this tree.
4. **Near-identical tautological docstrings repeated per builder method.** `ocx-sdk-python/src/ocx_sdk/_results.py` has ~10 `from_dict`/`from_json` classmethods each carrying a one-line docstring that says only "Build from one decoded X" — 4 landed in this 40-block sample alone (idx 30/35/36/38 in the raw census). Cheapest possible cut: state the convention once at the module level, drop the per-method restatement.
5. **A policy is pointed at, then immediately restated in full next to the pointer.** `grimoire:crates/grimoire/src/cli/color.rs:94` — the function's own rustdoc says "See the module docs for the auto-mode precedence chain" three lines above a match arm that spells the same four-way precedence out again inline. Two copies of one policy, one of which will drift.
6. **PEP 723 script headers counted as documentation.** `grimoire:.claude/hooks/conventional_commit_validator.py:1`, `ocx:.claude/hooks/pre_tool_use_validator.py:4` (partially — its docstring is real prose, but the `# ///` header above it is not). Functional, not prose; inflates ratio the same way an uncounted license header would deflate it if the exclusion were missing.

## Patterns worth encoding

- **Name the counterfactual edit, not just the importance.** The fleet's strongest guards share one shape: "doing X instead of Y breaks Z" (`ocx:crates/ocx_store/src/file_structure/toolchain_store.rs:430` — using `Path::is_symlink` instead of `is_link` silently mistakes a Windows junction for absent; `ocx:crates/ocx_config/src/lib.rs:1277` — a blanket `/var` prefix refuses every ostree-Fedora toolchain_dir). A rule can mechanically check for this shape (a comparative clause + a stated consequence) as a cheap proxy for "this is a guard, don't delete it."
- **Quantified provenance beats vague provenance.** `ocx:.claude/rules/docs-quality/checks/prose.py:101` — "12 of 18 were ordinary technical nouns", "3 hits, 3 false" — is falsifiable and re-checkable; most provenance comments in the fleet just assert "we saw this happen once." Worth codifying as the preferred shape for a calibration/incident comment.
- **SAFETY-comment discipline generalizes.** Rust's `unsafe` convention (state exactly which invariant makes the call sound, nothing else) is already the tightest, most compression-resistant guard shape in the sample (`ocx:crates/ocx_config/src/lib.rs:1591`, `ocx:crates/ocx_setup/src/session_path/windows.rs:356`). The comments-depth-file should hold this up as the target shape for every guard, unsafe or not.
- **"One spelling / single choke point / shared so the two cannot diverge" is a load-bearing-comment tell.** It shows up on real guards across every repo sampled (`ocx:crates/ocx_util/src/tls.rs:22`, `ocx:crates/ocx_index/src/local_index.rs:112`, `ocx-catalog:src/viewmodel/catalog.ts:171`) and never on narration. A lint could flag any comment using this phrasing as never-auto-delete.
- **API-contract docstrings (Google-style Args/Returns/Raises) resist compression because they ARE the interface, not narration about it.** `ocx-sdk-python` is 70.7% `contract` by line share and only compresses to 0.42 — worse than three of the four other repos — precisely because it's a hand-written SDK surface, not because it's badly written. The comments-depth-file should not apply the same target ratio to a library's public API layer as to its internals.
- **Namespace or globally-unique plan IDs, or don't point at them from code.** `C-018`'s collision (smell #2) is a process problem, not a comment-content problem — the fix belongs in how `.claude/artifacts/` mints IDs, not in the comment itself. Worth a cross-reference from the code-docs rule to whatever owns plan-ID minting.

## Contradictions of the frame

- **H6, confirmed, harder than stated.** Measured guard-information share in narration/process-ID/provenance/tautology blocks: ~0% (1 borderline case in 43 blocks), not "under 10 percent." See [§6](#6-h6--guard-information-in-low-value-categories).
- **Prior evidence's plan-ID-collision worry: confirmed with a named instance**, not just a risk. `C-018` = four different decisions in four different ocx planning artifacts (smell #2). The companion worry — "pointers to untracked plans are dead" — was **not** reproduced: spot-checking 3 tokens found in the sample (`C-018`, `A-29`, `RUL-51`) against the repo, all three resolve to live `.claude/artifacts/*.md` files, cross-referenced from source, tests, and JSON schemas. The risk in this fleet is ambiguity/collision, not dead links.
- **The owner's 1:4-1:6 hypothesis (H1's app band) does not survive contact with ocx specifically.** Even after cutting every sampled ocx block to its MINIMAL LINES, the implied ratio is 0.338 — a 1:3 cut, not 1:4-1:6 — because 62% of ocx's sampled comment *lines* are `guard` (58/150 blocks), and this sample's own MINIMAL LINES estimates for those guards (mean ~5 lines, not 0-1) can't compress further without deleting the counterfactual-edit sentence that makes them guards. Forcing ocx to a fixed 1:5 ratchet risks cutting real guards to hit the number — this is the one-way-door the frame's H7 (ratchet-per-package) already anticipates, and this sample gives it a concrete number: **ocx's realistic floor looks like ~0.30-0.35, not 0.17-0.25**.
- **H1 is supported, not contradicted, for the SDK/library split**: `ocx-sdk-python` (a hand-authored SDK wrapping a CLI, 70.7% contract-classified) implies the highest post-cleanup ratio of the five (0.41) — exactly the "doc-enforcing library sits higher" half of H1, inside the same fleet rather than only against the external reference repos.
- **grimoire-vscode is the one repo close to the owner's band as-is** (0.514 raw) and lands *inside* it after cleanup (0.228) — but for a reason the frame doesn't call out: 53.7% of its sampled comment lines are `why-constraint`, not `essay` or `guard` — short, single-paragraph justifications that were already close to minimal before this audit touched them (compression factor 0.444, the mildest cut of the five repos). The frame's H2 (block length separates human from agent code) predicts this shape; this sample is consistent with it but does not itself measure block-length percentiles (that's the full census's `dp90` column, not this seeded sample).

## Gaps

- Prod scope only, per the demands; test-comment quality (are test docstrings living documentation, per the frame's methodology axis?) is untouched by this pass.
- `.claude/hooks/` and `rules/*/checks/*.py` land in `prod` scope for ocx and grimoire (smell #3) — the census script has no "meta/tooling" bucket, so this audit's per-repo numbers for those two repos are very slightly inflated by AI-repo self-governance prose that isn't part of the shipped product.
- PEP 723 `# ///` script-metadata blocks aren't excluded the way license headers and tool directives are (classifier miss #1 in §2) — a small, fixable undercount-as-comment bug in `comment_census.py`.
- Only 5 of the fleet's ~18 eligible repos were sampled here (per the explicit demand list); `arcana`, `ocx-indexbot`, `ocx-mirror`, `grimoire-indexer` and the rest of the frame's measured table were not drawn from in this pass.
- No git-blame/incident cross-check: guard content is judged from the comment's own claim ("X would break Y"), not from confirming a matching regression actually happened. A handful of the 100 guards listed in §5 would be worth checking against `git log -p` before trusting them as eval sites at face value.
- Block-length percentiles (H2's dp50/dp90) are a full-census statistic, not something a 320-block seeded sample should be used to re-derive; this audit reports category shares and MINIMAL LINES, not length distributions.
- The process-ID collision check (`C-018`) was a targeted spot-check of 3 tokens the sample surfaced, not an exhaustive audit of every plan ID in `.claude/artifacts/`; the true collision rate across the whole ID space is unmeasured.
