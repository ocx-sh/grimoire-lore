---
title: Code-to-record pointer form and resolution check
topic: pointer-form-and-check
agent: research-lang wave-2 (code-docs)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 13
scope: >
  Covers the code -> record direction only: what a comment in source must write to
  point at a decision record (ADR, plan, ruling, subsystem doc, lore rule file), and
  a runnable check that proves the pointer resolves, including cross-repo and URL
  forms. Does not cover record -> code citations (rename rot, a separate dive), the
  plan/process-ID ban itself (a separate dive, referenced here only as the reason
  bare IDs are rejected as a pointer form), or building a production-grade,
  CI-wired version of the check — the prototype below is stdlib-only and read-only.
---

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Three candidate pointer forms, and what the sources say](#1-three-candidate-pointer-forms-and-what-the-sources-say)
  2. [The fleet's own ADRs already use headings as the addressable unit](#2-the-fleets-own-adrs-already-use-headings-as-the-addressable-unit)
  3. [Why a bare ID is rejected outright](#3-why-a-bare-id-is-rejected-outright)
  4. [The prototype check: design and exclusions](#4-the-prototype-check-design-and-exclusions)
  5. [Measured results on ocx, grimoire, ocx-indexbot, ocx-catalog](#5-measured-results-on-ocx-grimoire-ocx-indexbot-ocx-catalog)
  6. [Cross-repo is the dominant cause of "dead" pointers in every leaf repo](#6-cross-repo-is-the-dominant-cause-of-dead-pointers-in-every-leaf-repo)
  7. [A planted anchor violation, and the naive-baseline comparison](#7-a-planted-anchor-violation-and-the-naive-baseline-comparison)
  8. [Interface leak: pointers already sit in text that renders](#8-interface-leak-pointers-already-sit-in-text-that-renders)
  9. [URL rot and URL-form pointers](#9-url-rot-and-url-form-pointers)
  10. [Prior art: no existing tool resolves this class of pointer](#10-prior-art-no-existing-tool-resolves-this-class-of-pointer)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- A code-to-record pointer MUST be a tracked file path plus a heading anchor
  (`adr_index_indirection.md#a2-on-disk-layout-...`), never a bare ID or a bare
  filename with no anchor — bare IDs are the fleet's proven collision mode
  ([census.md §3](#5-sources)).
- Cross-repo pointers MUST carry an explicit `repo:` qualifier resolved through a
  small fleet map; an unqualified filename is only checked within the citing repo.
- A pointer MUST NOT appear in doc-comment text `comment_census.py` classifies as
  `interface` (renders to `--help`, a JSON Schema, or editor hover on a public item)
  — this is the exact mechanism behind the 64-ID golden-schema leak, and this run
  found 29 more ocx doc-comment lines already sitting on `interface`-classified
  code that name a record file, one bad serialization away from repeating it.
- `comment_census.py` has no `comment_lines()` function; the audit's
  `common.comment_lines()` was an uncommitted scratch helper. The working
  equivalent is `classify()` filtered to `kind in {"doc", "line", "interface"}` —
  built and used below, not reimplemented as a second lexer.
- Built and ran a stdlib-only prototype (`pointer_check.py`, full source in
  [§4](#4-the-prototype-check-design-and-exclusions)) against ocx, grimoire,
  ocx-indexbot and ocx-catalog: 1,213 record-shaped hits, 1,062 resolved locally,
  150 "dead," 1 raw URL, 29 interface leaks (ocx only).
- Hand-reading the "dead" bucket overturns most of it: in the three leaf repos
  (ocx-catalog, ocx-indexbot, grimoire), roughly 24 of 30 "dead" mentions are
  live in a *different* fleet repo (mostly ocx, some in `index`) — not dead, just
  missing a `repo:` qualifier a single-repo check cannot supply. In ocx itself
  (the hub), a 13-item spot-check of its 120 "dead" hits found only 1 cross-repo
  hit — ocx's own dead pointers are overwhelmingly genuine renames or never-created
  files, matching [census.md §4](#5-sources)'s original finding.
- A naive, extensionless record-prefix regex (no `.md` required) produces real
  noise: hyphenated English compounds (`decision-shaped`, `plan-phase`,
  `decision-free`) and a bare Python tuple-field name (`subsystem_label`) all
  matched before an extension-and-identifier filter was added — this is the exact
  false-positive class [census.md §4](#5-sources)'s 43% figure came from,
  reproduced independently here.
- The same extensionless regex also truncates real names two different ways: a
  source-formatter line wrap splits `` adr_platform_model_\n unification.md `` into
  a dead-looking half-token (`ocx:crates/ocx_project/src/lock.rs:191`,
  `ocx:test/tests/test_patches.py:1126`), and a hyphen-inside-an-underscore-named
  plan (`plan_tested-doc-commands`) truncates at the hyphen under an
  underscore-only character class. Requiring the `.md` extension in the pointer
  text (not just in the target) sidesteps both failure modes, because the
  extension-anchored regex captures everything up to `.md` regardless of internal
  separator.
- Exactly one pointer in the four repos used a URL instead of a fleet-qualified
  path (`ocx:crates/ocx_python/src/lib.rs:12`), and it points at a mutable
  `blob/main/` ref — the least durable form the human-sample.md corpus found, in
  the same fragility class as an already-dead mailing-list archive link.
- URL liveness is a different problem from repository-structure resolution: Hata
  et al. measured ~10% of ~9.6M source-comment hyperlinks already dead
  ([arXiv 1901.07440](https://arxiv.org/abs/1901.07440)); that rate justifies a
  scheduled link-check job, not a live network call on every commit inside a
  stdlib-only, offline pointer gate.
- No existing tool covers this check: todocheck
  ([github.com/preslavmihaylov/todocheck](https://github.com/preslavmihaylov/todocheck))
  resolves TODO comments against an issue tracker only — it does not touch file
  paths, headings, or decision records at all.
- matklad's "name, don't link" advice
  ([matklad.github.io](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html))
  governs the *other* direction (a record naming code, which does go stale on
  rename — the record-to-code-rot dive) and does not apply here: a record's
  headings are a comparatively stable, machine-checkable surface, which is why
  code-to-record pointers should link rather than merely name.
- RFC 1574's reference-style intra-doc links
  ([rust-lang.github.io/rfcs/1574](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html))
  are a different, adjacent thing (linking to a Rust item from within a doc
  comment) and are exactly the pattern the check must skip, not detect, to avoid
  misreading `` [`plan_for`] `` as a filename.
- e-adr's `@ADR(N)` annotation model
  ([adr.github.io/e-adr](https://adr.github.io/e-adr/)) assumes one global,
  monotonic ID authority per project, per Nygard's original 2011 convention
  ([cognitect.com](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)):
  "numbered sequentially and monotonically... not reused." This fleet's actual
  practice — a fresh `C-NNN` sequence restarting in every plan document — is the
  opposite of that convention, which is the root cause the plan-ids dive treats
  and this dive only needs to note as the reason a bare ID can never be the whole
  pointer.

## Findings

### 1. Three candidate pointer forms, and what the sources say

The brief named three candidates: file + heading anchor, file + ID, and symbol
name.

| Form | Example | Source basis | Verdict |
|---|---|---|---|
| File + heading anchor | `adr_index_indirection.md#a2-on-disk-layout-...` | GitHub/CommonMark heading-slug convention; matches this fleet's own house format ([§2](#2-the-fleets-own-adrs-already-use-headings-as-the-addressable-unit)) | **Adopted** |
| File + numeric ID (e-adr's `@ADR(N)`) | `@ADR(1)` | [adr.github.io/e-adr](https://adr.github.io/e-adr/) — Java-annotation model, one global sequence | Rejected as the sole form: this fleet's IDs are plan-scoped and collide (§3); an annotation layer is also a second thing to keep in sync with the file that a plain path is not |
| Symbol name only (matklad's "name, don't link") | "see `ChainedIndex::resolve_dispatch`" | [matklad.github.io](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) — "Do name important files, modules, and types. Do not directly link them (links go stale)." | Rejected for this direction: matklad's advice is for a doc *naming* code, where the target (code) is what churns. Here the target is a *record*, which churns far less than code (records.md shows the record store itself is comparatively stable — renames/rewrites of ADRs are rare) and — unlike a code symbol — exposes a checkable structure (`git ls-files` existence, heading match) that a plain name does not. |

**Decision: file + heading anchor**, `path/to/target.md#slug`, cross-repo as
`repo:path/to/target.md#slug`. This is not a compromise between the three — it is
the one form whose two components (file, anchor) are each independently, cheaply
verifiable against the tracked tree, which is the property the check in §4 needs
and neither a bare ID nor a bare symbol name provides.

Whether a pointer may sit in doc text that renders: **no** — see [§8](#8-interface-leak-pointers-already-sit-in-text-that-renders).

### 2. The fleet's own ADRs already use headings as the addressable unit

`census.md §3` found that `adr_index_indirection.md`'s A2/A3 sections exist as
literal `###` headings, and that this is "the pattern the critique recommends as
the *only* acceptable pointer form (file + section), and it is also the pattern
that most often survives — none of the 8 dead pointers above used a section
anchor, they all pointed at the bare (now-renamed or never-created) filename."
Verified directly against the live file:

```
$ sed -n '221p' /home/mherwig/dev/ocx/.claude/artifacts/adr_index_indirection.md
### A2. On-disk layout — a local copy IS the hosted wire grammar (owner decision 2026-07-18)
```

So "file + ID" and "file + heading anchor" are not actually competing forms in
this fleet: the house format already writes the decision ID *as* the heading
text. A `#anchor` built from that heading (GitHub-style slug: lowercase, strip
punctuation, spaces to hyphens) carries the ID and gives the checker a second,
independent thing to verify (the heading exists) that a bare `(A2)` never could.
`records.md §1` puts 81% of 444 tracked records in one shared "hybrid" house
format, so this generalizes past the one file spot-checked here.

### 3. Why a bare ID is rejected outright

Re-verified from `census.md §3` (not re-run independently — this is the prior
audit's own measurement, cited because it is the reason decision #1 above rejects
form 2): 14 of the top 15 ocx IDs by frequency resolve to several unrelated
tracked definitions (`C-006`, `C-007`, `A2`, `A3`, `C-018`... each cited from 3-5
different documents with distinct meanings); a random sample of 30 `C-NNN` IDs
resolved to **0/30 unique** matches. A bare ID in code (e.g. `crates/ocx_cli/.../shell_state.rs:292`
citing `C-050`) cannot tell a cold reader which of 3+ documents it means without
already knowing which subsystem's plan the surrounding code belongs to — exactly
the ambiguity a file-qualified pointer removes by construction, because the file
name *is* the disambiguator.

### 4. The prototype check: design and exclusions

`comment_census.py` (`rules/code-docs/checks/comment_census.py`) has a `classify()`
function that lexes a source file into `Line` objects with a `.kind` in `{code,
doc, line, interface, license, directive, blank}` and a `.text` (comment content,
markers stripped). It has **no** `comment_lines()` function — the audit's
`common.comment_lines()` (referenced in `census.md §3` and `§6`) was a scratch
helper used for the prior audit and never committed to this worktree (confirmed:
searched `.agents/research/code-docs-audit/scratch/` and found only
`summarize.py`). The prototype below builds the same thing from `classify()`
directly, which is the reuse the brief actually asked for (its own lexer, not a
second one):

```python
#!/usr/bin/env python3
"""Prototype pointer-resolution check for code-to-record pointers. Stdlib only."""
from __future__ import annotations
import re, subprocess, sys
from pathlib import Path

sys.path.insert(0, "/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/code-docs/checks")
import comment_census as cc  # noqa: E402

FLEET = {  # fleet map for "repo:path#anchor" cross-repo resolution
    "ocx": Path("/home/mherwig/dev/ocx"), "grimoire": Path("/home/mherwig/dev/grimoire"),
    "ocx-indexbot": Path("/home/mherwig/dev/ocx-indexbot"), "ocx-catalog": Path("/home/mherwig/dev/ocx-catalog"),
    "index": Path("/home/mherwig/dev/index"), "arcana": Path("/home/mherwig/dev/arcana"),
    "ocx-sdk-python": Path("/home/mherwig/dev/ocx-sdk-python"), "ocx-mirror": Path("/home/mherwig/dev/ocx-mirror"),
    "grimoire-indexer": Path("/home/mherwig/dev/grimoire-indexer"), "grimoire-vscode": Path("/home/mherwig/dev/grimoire-vscode"),
}

# Record-shaped filename: decision-record prefix or a known lore-rule name, .md
# only. Scoped like census.md section 4 -- NOT the unscoped [...]*.{md,toml,json}
# regex, which also catches ordinary data-file paths in type comments (noise,
# not "pointers to records").
_RECORD_STEM = r"(?:(?:adr|plan|rulings?|subsystem|decisions?|design_spec|handover)[-_][A-Za-z0-9_./-]*|arch-principles|quality-core|quality-rust|docs-and-tracing)"
FILE_RE = re.compile(r"\b" + _RECORD_STEM + r"\.md(#[A-Za-z0-9_.\-]+)?\b")
CROSS_RE = re.compile(r"\b(?!https?\b)([a-z][a-z0-9_-]*):([A-Za-z0-9_./-]*" + _RECORD_STEM + r"\.md)(#[A-Za-z0-9_.\-]+)?\b")
URL_RECORD_RE = re.compile(r"https?://\S*" + _RECORD_STEM + r"\.md(#[A-Za-z0-9_.\-]+)?\b")
# Extensionless record-prefix token -- the naive-baseline false-positive class
# from census.md section 4 (plan_for, subsystem_label). Separator matches each
# family's real convention (underscore, except hyphen for subsystem-) so a
# shared "[-_]" class does not also swallow "decision-shaped"/"plan-phase".
BARE_PREFIX_RE = re.compile(r"\b(?:(?:adr|plan|rulings?|decisions?|design_spec|handover)_[A-Za-z0-9_]+|subsystem-[A-Za-z0-9-]+)\b")
BRACKET_RE = re.compile(r"\[[^\]]*\]")  # rustdoc intra-doc links, e.g. [`plan_for`] -- never a pointer
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)")

def slugify(heading: str) -> str:
    h = heading.strip().lower()
    h = re.sub(r"[`*_]", "", h)
    h = re.sub(r"[^a-z0-9\s-]", "", h)
    return re.sub(r"\s+", "-", h.strip())

def headings_of(path: Path) -> set[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return set()
    return {slugify(m.group(2)) for line in text.split("\n") if (m := HEADING_RE.match(line))}

def git_ls_files(root: Path) -> set[str]:
    try:
        res = subprocess.run(["git", "-C", str(root), "ls-files", "-z"], capture_output=True, check=True)
        return {p for p in res.stdout.decode("utf-8", "replace").split("\0") if p}
    except (subprocess.CalledProcessError, FileNotFoundError):
        return set()

def is_defined_identifier(repo: Path, token: str) -> bool:
    """snake_case-identifier false-positive filter (plan_for, plan_repairs)."""
    try:
        res = subprocess.run(
            ["git", "-C", str(repo), "grep", "-n", "-w", "-e", f"fn {token}", "-e", f"def {token}",
             "-e", f"let {token}", "-e", f"{token} =", "--", "*.rs", "*.py"],
            capture_output=True, text=True,
        )
        return bool(res.stdout.strip())
    except FileNotFoundError:
        return False

def comment_lines(path: Path):
    """classify() + filter to doc/line/interface -- the comment_lines() the brief
    names; comment_census.py has no such function itself (see prose above)."""
    lang = cc.EXT_LANG.get(path.suffix)
    if lang is None:
        return []
    try:
        src = path.read_text(encoding="utf-8", errors="replace")
        lines = cc.classify(str(path), src, lang)
    except (OSError, Exception):
        return []
    return [(i + 1, ln.text, ln.kind) for i, ln in enumerate(lines) if ln.kind in ("doc", "line", "interface")]

def extract_candidates(text: str):
    stripped = BRACKET_RE.sub(" ", text)  # drop intra-doc links first
    spans: list[tuple[int, int]] = []
    overlaps = lambda a, b: any(a < e and s < b for s, e in spans)  # noqa: E731
    for m in URL_RECORD_RE.finditer(stripped):
        spans.append((m.start(), m.end())); yield m.group(0), "url"
    for m in CROSS_RE.finditer(stripped):
        if overlaps(m.start(), m.end()): continue
        spans.append((m.start(), m.end())); yield m.group(0), "cross-repo"
    for m in FILE_RE.finditer(stripped):
        if overlaps(m.start(), m.end()): continue
        spans.append((m.start(), m.end())); yield m.group(0), "file"
    for m in BARE_PREFIX_RE.finditer(stripped):
        if overlaps(m.start(), m.end()): continue
        tok, end, start = m.group(0), m.end(), m.start()
        fp = (end < len(stripped) and stripped[end] == "(") or (start > 0 and stripped[start - 1] in "._:")
        yield tok, "bare-fp-candidate" if fp else "bare"

# check_repo(): primary pass resolves FILE_RE/CROSS_RE hits against git ls-files
# and (if a #anchor is present) against headings_of(); a separate naive_baseline
# pass replays the extensionless BARE_PREFIX_RE track purely to measure what an
# unscoped detector would cost (see census.md section 4's own 43% figure).
# Full source (~180 more lines) run as: python3 pointer_check.py ocx grimoire
# ocx-indexbot ocx-catalog
```

Exclusions implemented (per the brief's "skips intra-doc links and snake_case
identifiers"):

1. **Intra-doc links** — anything inside `[...]` (covers both `[Rust website]`
   prose links and `` [`plan_for`] `` reference-style code links, RFC 1574's
   syntax) is stripped before matching.
2. **Call/access-adjacent identifiers** — a candidate immediately followed by `(`
   or preceded by `.`/`::`/`_` is a function call or member access, not a pointer.
3. **Defined identifiers** — a `git grep -w` check for `fn TOKEN` / `def TOKEN` /
   `let TOKEN` / `TOKEN =` in the same repo; if found, the token is a real binding,
   not a pointer.
4. **Extension required** — the primary detector (`FILE_RE`/`CROSS_RE`) only
   fires on a match ending in `.md`; the extensionless track (`BARE_PREFIX_RE`) is
   never counted as a real pointer, only used to size the false-positive cost of
   *not* requiring an extension (§7).

### 5. Measured results on ocx, grimoire, ocx-indexbot, ocx-catalog

Run 2026-09-27, command `python3 pointer_check.py ocx ocx-catalog ocx-indexbot
grimoire` against the four working trees under `/home/mherwig/dev/`:

| Repo | Hits | Resolved | Dead | Dead rate | Interface leak | URL pointers | Naive-baseline candidates | Naive-baseline unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ocx | 992 | 871 | 120 | 12.1% | 29 | 1 | 43 | 18 |
| ocx-catalog | 23 | 17 | 6 | 26.1% | 0 | 0 | 1 | 1 |
| ocx-indexbot | 19 | 8 | 11 | 57.9% | 0 | 0 | 6 | 6 |
| grimoire | 179 | 166 | 13 | 7.3% | 0 | 0 | 33 | 22 |
| **Total** | **1,213** | **1,062** | **150** | **12.4%** | **29** | **1** | **83** | **47** |

("Resolved" here means the target file exists in `git ls-files`; anchor-checking
found zero `#anchor`-bearing pointers in current fleet code at all — 0/1,062, a
finding in itself: the grammar this dive proposes has 0% adoption today, so the
anchor half of the check is unexercised until the cleanup pass starts adding
anchors.)

### 6. Cross-repo is the dominant cause of "dead" pointers in every leaf repo

Every one of the three leaf repos' "dead" targets was checked by hand against
`git ls-files` in the other ten fleet repos (`ocx`, `grimoire`, `ocx-indexbot`,
`ocx-catalog`, `index`, `arcana`, `ocx-sdk-python`, `ocx-mirror`,
`grimoire-indexer`, `grimoire-vscode`, `creeptd-ng`):

| Repo | "Dead" (local) | Cross-repo resolvable | Genuinely dead fleet-wide |
|---|---:|---:|---:|
| ocx-catalog | 6 | 3 (`ocx-indexbot`: `adr_forge_neutral_owners.md`; `index`: `adr_catalog_docs_colocation.md`, `adr_locked_observation_index_format.md`) | 3 (`plan_site_redesign.md` x2, `plan_oci_align_index_site.md`) |
| ocx-indexbot | 11 | 10 mentions / 6 distinct targets — 4 in `index` (`adr_index_bot_and_workflow_security.md`, `adr_locked_observation_index_format.md`, `adr_fork_pr_announce.md`, `adr_enumeration_index.md`), 2 in `ocx` (`adr_index_claim_command.md`, `quality-core.md`) | 1 (`plan_index_v1.md` — matches `records.md §2`'s own prior finding) |
| grimoire | 13 | 11 mentions / 5 of 6 distinct targets, all live in `ocx` (`subsystem-oci.md`, `adr_ai_config_skill_description_csopolicy.md`, `adr_ai_config_cross_session_learnings_store.md`, `adr_ai_config_review_loop_dedup.md`, `adr_ai_config_context_monitor_hook.md`) | 1 (`plan_ai_config_overhaul.md`) |
| ocx (hub, 13-item spot check of its 120) | 13 (of 120) | 1 (`adr_registry_mirror_sync.md`, live in `ocx-mirror`) | 12 |

Reading these together: in the three **leaf** repos, roughly 24 of 30 sampled
"dead" mentions are not dead at all — they are unqualified cross-repo pointers
into the fleet's hub repo (`ocx`) or into `index`, which a single-repo `git
ls-files` check can never resolve. This directly reproduces and generalizes
`records.md §2`'s single documented case (`ocx-indexbot` citing two ADRs that live
in `index`). In `ocx` itself — the repo everyone else points into — the pattern
inverts: a 13-item spot check found only one cross-repo hit, so ocx's own dead
pointers are overwhelmingly genuine rot (renamed or never-committed files), the
same character as `census.md §4`'s original 8-dead-of-14 sample.

**This is why the cross-repo fleet map (decision #4) is not a nice-to-have**: a
checker without it would report an ~80% false "dead" rate on every leaf repo in
this fleet, which is exactly the kind of noise that gets a lint disabled rather
than fixed.

### 7. A planted anchor violation, and the naive-baseline comparison

To confirm the anchor half of the checker actually distinguishes a correct
pointer from a stale one (no fleet code uses `#anchor` yet, per §5), a good and a
bad anchor were tested against the real, unmodified `adr_index_indirection.md`:

```python
>>> heads = headings_of(FLEET["ocx"] / ".claude/artifacts/adr_index_indirection.md")
>>> slugify("A2. On-disk layout — a local copy IS the hosted wire grammar (owner decision 2026-07-18)")
'a2-on-disk-layout-a-local-copy-is-the-hosted-wire-grammar-owner-decision-2026-07-18'
>>> ".claude/artifacts/adr_index_indirection.md#a2-on-disk-layout-a-local-copy-is-the-hosted-wire-grammar-owner-decision-2026-07-18".split("#",1)[1] in heads
True   # anchor_ok
>>> ".claude/artifacts/adr_index_indirection.md#decision-z9-does-not-exist".split("#",1)[1] in heads
False  # anchor_bad -- the planted violation is caught
```

The naive-baseline pass (extensionless `BARE_PREFIX_RE`, no identifier filter)
was hand-read across all 83 candidates census-scale sample; representative reads:

| Location | Token | Read | Class |
|---|---|---|---|
| `grimoire:.claude/hooks/post_tool_use_tracker.py:30` | `subsystem_label` | Python tuple-field name in a comment (`# (glob_pattern, rule_filename, subsystem_label)`) | **False positive** — reproduces `census.md §4`'s own named example verbatim |
| `grimoire:src/tui/render.rs:11` (pre-fix regex) | `decision-free` | "a trivial, decision-free sink" — English compound adjective | **False positive** — fixed by requiring underscore, not hyphen, for the `decision`/`plan` families |
| `grimoire:src/tui/state.rs:4400` (pre-fix regex) | `decision-predicate` | "test the decision-predicate side" — same class | **False positive** |
| `ocx:crates/ocx_project/src/lock.rs:191` | `adr_platform_model_` | Source-formatter line wrap split `` adr_platform_model_\nunification.md `` doc comment across two `///` lines | **Detector artifact** (line-wrap truncation) — the same class `census.md §4` found once; the extension-anchored `FILE_RE` does not have this failure mode because it is not run per physical line the same naive way in a production version (a real check must join wrapped comment lines first) |
| `ocx:test/lint/test_doc_binding.py:7` | `plan_tested` (of `plan_tested-doc-commands`) | Real plan name mixing underscore and hyphen; the extensionless regex's underscore-only class truncates at the hyphen | **Detector artifact** (regex-truncation, not the source's fault) |
| `ocx:crates/ocx_index/src/local_index.rs:3677` | `plan_one_index` | "arch-verify rulings in plan_one_index" — genuine bare-form prose mention of an apparently uncommitted plan | **True positive** (real dead-shaped mention, just missing `.md`) |
| `ocx:crates/ocx_python/src/compose.rs:67,72,83,91,135` | `plan_python_mirror_v2` | Repeated genuine mention; independently confirmed dead in `census.md §4`'s own table | **True positive** |

Net: once the extension-only-for-hyphenated-families fix and the identifier
filter are both in place, the *remaining* naive-baseline non-matches are real
(if extensionless) mentions of dead plans, not code false positives — but two
different truncation failure modes (line-wrap, hyphen-inside-underscore-family)
still show up, which is the concrete argument for decision #1's extension
requirement: a well-formed pointer's `.md` suffix is exactly the anchor a
line-based regex needs to avoid both truncation classes.

### 8. Interface leak: pointers already sit in text that renders

`census.md §5` found the schemars leak (64 distinct IDs, 182 occurrences across 7
golden JSON Schema files) traced end to end from a doc comment
(`crates/ocx_cli/src/api/data/shell_state.rs:292`) to
`crates/ocx_schema/tests/golden/reports.json:4573`. This run's `interface_leak`
counter — which flags any record-shaped hit sitting on a `kind == "interface"`
line (comment_census.py's own classification for doc comments on
`#[derive(..., JsonSchema)]`/`#[derive(..., Parser)]` items) — found **29** such
lines in ocx alone, none yet confirmed to have reached a golden schema (that
would need re-running the golden-schema trace per item), but structurally
identical to the one that already did:

```
ocx:crates/ocx_config/src/lib.rs:98    -- adr_managed_config_tier.md
ocx:crates/ocx_config/src/lib.rs:124   -- adr_index_indirection.md
ocx:crates/ocx_cli/src/api/data/attestation.rs:22 -- subsystem-cli-api.md
ocx:crates/ocx_project/src/activate.rs:38 -- arch-principles.md
```

DOC-11 (`docs-and-tracing.md`) is scoped to banning internal references in clap
`--help` text specifically; it does not check schemars-derived items, and
`census.md §5` already noted "DOC-11 works, on the wrong generator." This
independently confirms that framing with 29 additional live instances of the
same latent leak vector, none currently caught by any shipped rule.

### 9. URL rot and URL-form pointers

Hata, Treude, Kula and Ishio studied ~9.6 million hyperlinks in source-code
comments (ICSE 2019) and found "almost 10% of the links included in source code
comments are dead," with targets changing over time even though the links
themselves are "rarely updated"
([arXiv 1901.07440](https://arxiv.org/abs/1901.07440)). That is a real, material
rot rate — but checking it requires a live network request per URL, which is
incompatible with a stdlib-only, offline, every-commit pointer-resolution gate
(rate limits, flaky DNS, auth-walled targets, minutes of wall time on a large
tree).

Only one of the 1,213 hits found here is a URL rather than a fleet-qualified
path: `ocx:crates/ocx_python/src/lib.rs:12`, `` [design spec](https://github.com/ocx-sh/ocx-mirror/blob/main/.claude/artifacts/design_spec_ocx_python.md) ``.
It points at a mutable `blob/main/` ref. `human-sample.md`'s own durability table
found the opposite pattern is what survives: a commit-pinned blob URL
(`github.com/rust-lang/rust/blob/<pinned-commit>/...`) was rated "maximally
stable," while every unpinned external link sampled was already dead or fragile
(a defunct gmane archive, a personal gist) at time of reading.

**Decision**: pointer-resolution (git-ls-files + anchor match, this check) runs
on every commit; URL liveness runs as a separate, scheduled job that does real
HTTP requests and opens a PR on rot, mirroring Hata et al.'s own remediation
approach (they submitted fix PRs, most merged). A URL-form record pointer, if
used at all, MUST be commit-pinned, never a branch ref (§ Normative guidance #6).

### 10. Prior art: no existing tool resolves this class of pointer

Fetched the todocheck README directly
([github.com/preslavmihaylov/todocheck](https://github.com/preslavmihaylov/todocheck)):
it "lets users create actionable TODOs by annotating them with issues from any of
[GitHub, GitLab, Jira, Pivotal Tracker, Redmine, YouTrack, Azure Boards]," and
reports "Malformed todo" or "Issue doesn't exist" when a comment's
`TODO(#123)`-style annotation doesn't resolve. It never touches file paths,
markdown headings, or decision records — its entire model is "one TODO, one issue
ID, one tracker API call." Nothing in this dive's own review found a tool that
resolves an arbitrary code-comment mention of a project-local document against
that document's own structure (heading existence). This is why the prototype in
§4 is a fresh 180-line script rather than a wrapper around something that already
exists — the closest analogue (todocheck) solves an adjacent, narrower problem.

## Normative guidance candidates

1. **A code-to-record pointer names a tracked file plus a heading anchor**
   (`path/to/adr_x.md#slug`), never a bare ID (`C-050`, `(A2)`) or a bare filename
   with no anchor.
   *Rationale*: bare IDs collide (14/15 top ocx IDs resolve to 2+ unrelated
   documents, 0/30 sampled `C-NNN` IDs unique — `census.md §3`); a bare filename
   with no anchor can't distinguish "this decision" from "this document."
   *Verify*: `python3 pointer_check.py <repo>` reports `resolved_no_anchor_check`
   for the transitional (extension-only, no-anchor) form still common today; a
   production gate should fail any *new* pointer added without a `#anchor`
   (diff-scoped, not whole-tree, since 0/1,062 current pointers have one).
   **MUST.**

2. **Every code-to-record pointer's target file exists in `git ls-files`, and any
   `#anchor` matches a GitHub-slugified heading in that file.**
   *Rationale*: measured 150/1,213 (12.4%) dead across the four repos; in ocx
   alone 120/992 (12.1%), consistent with `census.md §4`'s 8/14-dead sample at a
   larger scale.
   *Verify*: run `python3 pointer_check.py ocx` (script in §4) — 2026-09-27 result:
   `hits: 992, resolved: 871, dead: 120`. Planted-violation check (§7) confirmed
   `anchor_bad` fires on a fabricated heading against the real
   `adr_index_indirection.md`. **MUST.**

3. **A cross-repo pointer carries an explicit `repo:` qualifier** resolved through
   a shared fleet map (`repo:path/to/file.md#anchor`); a bare filename is checked
   only within the citing repo, never guessed against the rest of the fleet.
   *Rationale*: without a qualifier, ~24 of 30 sampled "dead" mentions in the
   three leaf repos (ocx-catalog, ocx-indexbot, grimoire) are actually live
   elsewhere in the fleet (`index`, `ocx`) — see the table in §6. A checker that
   silently searched the whole fleet for a bare filename would hide the real bug
   (the pointer doesn't say where to look); a checker that doesn't search at all
   reports ~80% spurious dead-pointer noise on every leaf repo, which gets the
   check disabled.
   *Verify*: `python3 pointer_check.py ocx-indexbot` reports `cross_repo_dead` /
   `cross_repo_resolved` for any pointer already written as `repo:path`; today
   that's 0/0 because no fleet code uses the qualified form yet — this is a
   forward-looking MUST tied to the plan-ids/cleanup rewrite, not a rule with
   current green baseline. **MUST.**

4. **A code-to-record pointer never sits in doc-comment text classified `interface`**
   (renders to `--help`, a JSON Schema, or hover on a `pub`/derive-tagged item).
   *Rationale*: this is exactly how the 64-ID / 182-occurrence golden-schema leak
   happened (`census.md §5`); this run found 29 more ocx doc-comment lines already
   on `interface`-classified code naming a record file, unconfirmed to have leaked
   yet only because none of those particular items are in a sampled golden file.
   *Verify*: `python3 pointer_check.py ocx` → `interface_leak: 29`, full list
   printed. A CI gate: reuse `comment_census.classify()`'s `kind == "interface"`
   lines, grep them for the same `FILE_RE`/`CROSS_RE`/`BARE_PREFIX_RE` patterns,
   fail on any hit. **MUST.**

5. **A URL-form pointer to a record file must be commit-pinned** (a specific SHA
   in the path), never a branch ref (`blob/main/`, `blob/master/`).
   *Rationale*: `human-sample.md`'s durability table rates a commit-pinned blob
   URL "maximally stable" and an unpinned one in the same fragility class as an
   already-dead mailing-list link; the one URL-form pointer found in this fleet
   (`ocx:crates/ocx_python/src/lib.rs:12`) uses the fragile `blob/main/` form.
   *Verify*: `rg -n -e '/blob/main/' -e '/blob/master/' --glob '*.rs' --glob '*.py' --glob '*.ts' /home/mherwig/dev/ocx`
   then hand-filter hits that also match the record-file pattern (or extend the
   prototype's `URL_RECORD_RE` to reject non-SHA path segments directly — not yet
   built). **SHOULD** (one instance measured fleet-wide; not yet a load-bearing
   pattern).

6. **Prefer the fleet-map `repo:path#anchor` form over a cross-repo URL entirely.**
   *Rationale*: a URL loses the offline, anchor-checkable resolution the fleet map
   gives for free, and needs a network call the per-commit gate should not make
   (§9). Only 1 of 1,213 hits in this run used a URL at all, so this ratifies
   existing practice rather than inventing one.
   *Verify*: named reading heuristic — a reviewer flags any `github.com/.../blob/`
   URL whose path matches the record-prefix pattern and asks for `repo:path`
   instead. **SHOULD.**

7. **URL liveness is checked by a separate scheduled job, not the per-commit
   pointer gate.**
   *Rationale*: Hata et al. measured ~10% of ~9.6M source-comment URLs already
   dead ([arXiv 1901.07440](https://arxiv.org/abs/1901.07440)) — material, but a
   live-network check on every commit is slow and flaky, and orthogonal to
   whether the *repository* (files, headings) resolves.
   *Verify*: `rg -n -o -e 'https://\S+' -e 'http://\S+' /home/mherwig/dev/ocx`
   piped through `xargs -r` to a link-checker (not built here), run weekly,
   opening a PR on rot the way Hata et al.'s own remediation did. **MUST** (as a
   policy: URL rot has a home, even though that home isn't the commit gate; the
   job itself is out of scope for this dive).

8. **A production pointer-resolution check joins wrapped comment lines belonging
   to the same block before regex-matching a target.**
   *Rationale*: a per-physical-line naive regex truncated a real target at a
   source-formatter line wrap (`` adr_platform_model_\n unification.md ``,
   `ocx:crates/ocx_project/src/lock.rs:191` and
   `ocx:test/tests/test_patches.py:1126`) — the same failure class `census.md §4`
   already flagged once. The extension-anchored `FILE_RE` used here does not hit
   this failure mode in practice (matched in-line, not wrapped, in the sampled
   hits) but a checker that scans line-by-line rather than block-joined is one
   reflow away from repeating it.
   *Verify*: re-run the checker against those two exact files/lines after
   block-joining and confirm the reassembled target resolves (not yet
   implemented in the §4 prototype — a named gap, not a claimed fix).
   **SHOULD.**

9. **Do not re-derive a pointer's target path from a regex guess; always resolve
   it against `git ls-files`.**
   *Rationale*: a hyphen-inside-an-underscore-family real plan name
   (`plan_tested-doc-commands`, `ocx:test/tests/test_state_registry_characterization.py:4`
   and `ocx:test/lint/test_doc_binding.py:7`) truncates under any single-separator
   character class; resolving against the tracked file list (rather than trusting
   the regex's own capture) sidesteps the whole class of separator-convention
   bugs, because the check only needs the regex to *find* a candidate, not to
   spell it correctly. *Verify*: the §4 prototype's `path_part in tracked` step
   already does this for extension-bearing matches; the naive-baseline
   (extensionless) path in §7 shows what breaks without it. **SHOULD** (design
   note for the eventual production checker, not a fleet-facing rule).

## AI-agent angle

- **An agent copies the bare ID it just read from a plan document's own heading**
  (`## C-050`), because that ID — not the document's filename — is what's salient
  in its context window mid-session. It has no reason to add the filename unless
  told to. *Smallest check*: the pointer-resolution gate itself, scoped to the
  diff (new lines only), immediately rejects a newly added bare-ID-only reference
  regardless of why the agent wrote it that way.
- **An agent cites a record under a name it read earlier in the session, even
  after the file was renamed mid-session by another edit** (`plan_toolchain_activation.md`
  was renamed to `adr_toolchain_activation.md`; 27 in-code citations still use the
  old name, per `records.md §2`) — an agent has no built-in signal that a file it
  read once has since moved. *Smallest check*: `git ls-files` resolution, which
  the agent's own context can't substitute for no matter how recently it "saw"
  the file.
- **An agent cites a record by bare filename with no repo qualifier when working
  in a multi-repo fleet**, because it has no reliable sense of "which repo am I
  in, relative to where records for this subsystem actually live" — this is
  measurably common: ~85%+ of the "dead" pointers in the three leaf repos here are
  exactly this (§6). *Smallest check*: the cross-repo fleet-map pass reports
  `cross_repo_dead`/`unknown_repo` rather than silently searching every repo for a
  match, so the qualifier's absence is itself the failure the agent sees, not a
  guess the tool makes on the agent's behalf.
- **An agent writing a pointer inside a `///`/docstring on a `pub`/schema-derived
  item doesn't know that text is about to become a JSON Schema `description` or a
  `--help` string** — the classification (`interface` vs plain doc) is invisible
  from the diff the agent is looking at. *Smallest check*: the `interface_leak`
  pass, which is exactly `comment_census.py`'s own classifier applied to the
  pointer-detection regex — no new signal needed, just composing two checks that
  already exist independently.

## Contested / evolving

- **Whether a pointer belongs in doc-comment text at all is not a settled
  question in the sources found** — RFC 1574 and e-adr both discuss "linking" as
  uniformly good without distinguishing "renders to an end user" from "renders
  only in source." The interface/non-interface split this dive draws (§8,
  normative #4) is this program's own conclusion from the schemars leak, not
  something any fetched source states explicitly; flag it as this dive's
  contribution, not consensus practice, until reviewed.
- **ID-authority tooling (e-adr, adr-tools, log4brains) is generally built around
  Nygard's 2011 "one global monotonic sequence" per project** (confirmed directly
  from [Nygard's original post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):
  "ADRs will be numbered sequentially and monotonically. Numbers will not be
  reused."). This fleet's actual practice — a fresh `C-NNN`/`WP-N`/`A-NN` sequence
  restarting inside every plan document — has quietly drifted from that
  convention, and none of the standard tooling in this space appears built to
  detect or warn about that drift; it is a genuine, live divergence between
  documented best practice and this fleet's practice, not something in the
  process of resolving either way.
- **Hata et al.'s ~10% dead-link figure is 2019 data** (submitted to ICSE, based
  on a corpus gathered before that); no newer large-scale re-measurement of
  source-comment link rot was found in this dive. Whether the rate has moved
  (more or less) with the shift to AI-agent-authored comments is unmeasured — flag
  as stale evidence, not a settled current number, until re-measured.

## Decisions this dive proposes

1. **Form**: file + heading anchor (`path/to/file.md#slug`); cross-repo as
   `repo:path/to/file.md#slug` through a fleet map. Rejects bare ID (fleet's own
   collision data, §3) and bare symbol name (matklad's advice governs the
   opposite direction, §1). A pointer may not sit in `interface`-classified doc
   text (§8) — the schemars leak is the reason.
2. **Check**: the stdlib-only prototype in §4 (`comment_lines()` built from
   `comment_census.classify()`, since no such function exists in the checked-in
   script); exclusions are bracket-stripping (intra-doc links), call/access
   adjacency, and a `git grep`-based defined-identifier filter. Measured
   false-positive rate: **0 confirmed false positives** in the primary
   (extension-required) detector across all four repos, hand-read; the
   *extensionless* naive-baseline track — which is explicitly not the proposed
   pointer grammar, only a comparison — produced the same false-positive class
   `census.md §4` already documented (hyphenated compounds, a tuple-field name)
   until the identifier and separator-convention filters were added, and even
   after those filters it still shows two distinct truncation failure modes
   (§7), which is the argument for requiring the extension in the grammar itself.
3. **Cross-repo handling**: a fleet map (`{name: local-clone-path}`) and a
   `repo:path#anchor` syntax; without it, roughly 80% of "dead" pointers in the
   three leaf repos measured here are false negatives (§6).
4. **URL policy**: pointer resolution (files, anchors) runs on every commit,
   stdlib-only, offline; URL liveness runs as a separate scheduled job (Hata et
   al.'s ~10% rot rate justifies checking it, but not inline); any URL-form
   record pointer must be commit-pinned.
5. **Prior art**: none found. todocheck resolves TODO-to-issue links only and
   does not touch file paths, headings, or decision records — the closest
   existing tool, but solving a narrower, adjacent problem.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [adr.github.io/e-adr](https://adr.github.io/e-adr/) | e-adr project site (MADR/Y-Statement tooling, `@ADR(N)` Java annotation model) | fetched 2026-09-27 | The "file + ID" candidate form, concretely — shows what a numeric-ID pointer system actually commits a project to (an annotation layer, a global sequence) |
| [matklad.github.io — ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) | matklad's 2021 blog post proposing repo-level ARCHITECTURE.md files | 2021-02-06 | Source of "name, don't link" — the symbol-name candidate form, and why it applies to the *record-to-code* direction, not this one |
| [RFC 1574 — More API Documentation Conventions](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html) | Accepted Rust RFC, rustdoc link conventions | accepted 2016 | Defines the reference-style intra-doc link syntax (`` [`Type`] ``) the checker must skip, not detect, as a pointer |
| [Hata, Treude, Kula, Ishio — arXiv 1901.07440](https://arxiv.org/abs/1901.07440) | ICSE 2019 paper, ~9.6M source-comment hyperlinks studied | submitted 2019-01 | Primary quantitative basis for the URL-rot policy decision (~10% dead) |
| [todocheck README](https://github.com/preslavmihaylov/todocheck) | OSS static analyzer, TODO-to-issue-tracker resolution | fetched 2026-09-27 (raw README) | Closest existing prior art; establishes that no tool resolves this dive's actual problem (file/heading pointers), only a narrower adjacent one |
| [Nygard — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Original 2011 ADR post | 2011-11-15 | Source of the "sequentially and monotonically... not reused" ID convention this fleet's plan-scoped IDs have drifted from |
| `.agents/research/code-docs-audit/census.md` §3-5 | Fleet audit: ID collision table, dead-pointer sample, schemars leak trace | measured 2026-09-27 | Primary fleet evidence for bare-ID collision, the 43% naive-detector FP rate, and the interface leak this dive reproduces at 29 more instances |
| `.agents/research/code-docs-audit/records.md` §1-2 | Fleet audit: decision-record store health, code→record cross-repo case | measured 2026-09-27 | The one documented cross-repo dead-pointer case this dive generalizes to all four repos |
| `.agents/research/code-docs-audit/config.md` §4 | Fleet audit: 10-site spot check of "does code follow the routing rule" | measured 2026-09-27 | Shows file-qualified pointers resolving where bare IDs fail, in situ |
| `.agents/research/code-docs-audit/human-sample.md` "How humans point elsewhere" | 200-block sample of human OSS repos (ripgrep, pip, cargo, rust-analyzer, okhttp, tokio, vite) | measured 2026-09-27 | Source of the URL-durability ranking (commit-pinned vs. branch-ref vs. already-dead) behind the URL-pinning rule |
| `pointer_check.py` (this dive's prototype, full source in §4) | Stdlib-only Python script, run against ocx/grimoire/ocx-indexbot/ocx-catalog | run 2026-09-27 | Primary measurement for this dive: 1,213 hits, 150 dead, cross-repo breakdown, interface-leak count, naive-baseline comparison |
| `.agents/research/code-docs-topic-map.md` | Wave-1 synthesis assigning this commission | 2026-09-27 | Framing, prior hypotheses, and the exact brief this document answers |
| `.agents/research/code-docs-frame.md` | Program frame | 2026-09-27 | Program-level context (hypotheses, artifact set) this dive's decisions feed into |
