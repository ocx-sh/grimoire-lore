---
title: Alt-shell releases 2026-10-11 to 2026-11-27 (zsh, fish, nushell, elvish)
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 12
---

# Alt-shell delta, 2026-10-11 to 2026-11-27

This is a delta against the baseline measured on 2026-10-11. Only nushell released in the window.

## Summary

- zsh: no release in the window. The newest tag is zsh-5.9.2 (2026-07-12), which the pair already names. There is no zsh-5.10 tag. Unchanged.
- fish: no release in the window. 4.9.3 (2026-09-08) is still the newest. Unchanged.
- elvish: no release in the window. 0.21.0 (2024-08-14) is still the newest, and 0.22.0 exists only as undated draft notes. Unchanged.
- nushell: 0.117.0 was released on 2026-11-09 and is the only new release. It moves the ceiling from 0.116.1 to 0.117.0 and carries breaking changes. Changed.
- nushell 0.117.0 removes `filter`, makes `get -i` a hard error, makes `type` a reserved keyword, and fixes the tail-position `try` hang.
- `nu-gate.nu --strict` was re-run against nu 0.117.0 and still works. `nushell-hang.sh` now exits 0 on 0.117.0.
- `rules/shell-quality.md` line 200 says "nu 0.105.1 to 0.116.0". That is a defect against the 0.116.1 ceiling used elsewhere, and it must now read 0.117.0 once the ceiling bump is accepted.
- The zsh 5.10 SHOULD half cannot become a measured rule, because there is no 5.10 release to measure.

## Findings

### 1. zsh

- The tags page ([github.com/zsh-users/zsh/tags](https://github.com/zsh-users/zsh/tags)) lists zsh-5.9.2 (2026-07-12), zsh-5.9.1.2-test, zsh-5.9.1 (2026-05-31), zsh-5.9 (2022-05-14). No zsh-5.10 tag exists. Nothing is dated inside the window.
- zsh.org ([www.zsh.org](https://www.zsh.org/)) still advertises 5.9 as current and carries no news items and no 5.10 mention.
- The git-tree NEWS ([sourceforge NEWS](https://sourceforge.net/p/zsh/code/ci/master/tree/NEWS)) still opens with "Changes since 5.9". It says ERR_EXIT and ERR_RETURN were "refined to be more self-consistent", closer to POSIX-2017 `set -e`, and points to the README for incompatibilities. This is the development tree, not a release.
- Claim zsh.md line 8, "the 5.10 development tree where a row names it": unchanged. 5.10 is still a development tree.
- Claim SH-ZSH-07, exemptions "the 5.10 development tree changes": unchanged. The SHOULD half stays SHOULD. A rule cannot be measured against a release that does not exist.
- Claim "macOS ships zsh 5.8 (macOS 12) and 5.9 (macOS 14)": could not determine. No primary Apple source was fetched. Leave as is.
- Claim in shell-alt-shells Open questions, "re-run `errexit.zsh` and the `! f` probes on the 5.10 release": unchanged and still open. No release exists to re-run on.
- The `zsh -fn` parse gate: no new zsh release, so no new behaviour to check. Unchanged.

### 2. fish

- The releases page ([github.com/fish-shell/fish-shell/releases](https://github.com/fish-shell/fish-shell/releases)) lists 4.9.3 on 08 Sep as the newest, then 4.9.2 (05 Sep), 4.9.1 (04 Sep), 4.9.0 (03 Sep), 4.8.1 (13 Jul). The page shows no year, so the year 2026 is inferred from the footer and from the pair's own date. Nothing is dated after 2026-09-08.
- Claim fish.md line 10, "to 4.9.3 (released 2026-09-08)": unchanged.
- Claims SH-FISH-01 and SH-FISH-04, "the newest release (4.9.3)": unchanged.
- Claim "Debian 13, Alpine 3.22 and 3.23 and Fedora 43 ship 4.0.2": could not determine. No distro source was fetched. No fish release in the window could have changed it.
- Claim the 3.6.0 floor holds "until 2028-06-30": unchanged. It is a dated end point, not an upstream release claim.
- Claim gates.md parse table "fish 3.6.0 to 4.9.3": unchanged. The `fish --no-execute` gate needs no re-run, because no new fish binary exists.

### 3. nushell 0.117.0 (2026-11-09)

Sources: the [release post](https://www.nushell.sh/blog/2026-11-09-nushell_v0_117_0.html), the [blog index](https://www.nushell.sh/blog/) and the [GitHub releases page](https://github.com/nushell/nushell/releases). The GitHub page lists 0.117.0 as Latest, dated 10 Nov in its own timezone. The blog post is dated 2026-11-09. No 0.117.1 exists. The blog index also confirms 0.116.1 on 2026-10-04 and 0.116.0 on 2026-09-26.

Breaking changes in 0.117.0 that touch the pair:

- `filter` is removed. "Use `where`, which accepts the same closures."
- `get`, `select` and `reject` no longer accept `--ignore-errors (-i)`. Use `--optional (-o)`. `get --sensitive (-s)` is removed.
- `type` is now a reserved keyword. A command, alias or extern named `type` must be renamed.
- `let-env FOO = 1` fails with "Assignment operations require a variable". The `date format` and `let-env` stubs are removed.
- `while` and `loop` cannot be piped.
- `INF`, `Nan` and `Infinity` are now strings.
- `not $a == $b` now means `not ($a == $b)`, and `-$x` negates values instead of producing strings.
- `view ir --json` no longer has an `ast` field. The release post does not mention `--ide-ast`, `--ide-check`, `nu-check` or `$nu.vendor-autoload-dirs`, as far as the parts of the post that were read go. The post was read in full except for a trailing contributor and plugin-notes section, which does not mention them either.
- Try/catch: "`try` drains a piped stderr before collecting an external" and "a `try` without `catch` or `finally` no longer waits on an external whose output goes to the next command".

New names (born after the 0.105.1 floor and after 0.116.1): `type` keyword, `generate completions`, `ansi opt`, `record where`, `record each`, `record walk`, `record apply`, `config default`, `from dotenv`, `to dotenv`, `older-than`, `newer-than`, `extern --strict`, `job spawn --auto-kill`, `join --anti`, `find --only-matching`, `uniq --keep-last`.

Claim by claim:

- nushell.md line 8, "through 0.116.1 (2026-10-04)" and "nu 0.117 or later are `unverified: read only`. Re-run the gate on each new minor": changed. Old text: ceiling 0.116.1. New fact: 0.117.0 released 2026-11-09, so 0.117 is no longer a future minor. The instruction to re-run the gate applies now, and the re-run was done (see below). The count "11 breaking minors" becomes 12 if 0.117.0 is counted, and that count was not independently re-derived.
- rules/shell-quality.md line 200, "nu 0.105.1 to 0.116.0": changed. It disagrees with 0.116.1 elsewhere today. It should read 0.105.1 to 0.117.0 once the ceiling is bumped. gates.md line 182 carries the same "nu 0.105.1 to 0.116.0" text and needs the same fix. emit.md line 9 says 0.116.1 and needs the bump too.
- SH-NU-04, removed-form list: changed. Add `filter` (removed in 0.117.0, use `where`) and `type` as a name (reserved keyword). The existing note "`get -i` (warning from 0.106.1)" becomes "a hard error from 0.117.0". `let-env` stays on the never-write list, now with the explicit error "Assignment operations require a variable". `def type` joins `def run` in the "name nothing after a parser keyword" advice.
- SH-NU-05, names born after the floor: changed. Add the new names above where a shared file could be tempted to use them. `record where`, `record each` and `find --only-matching` are the likely ones for agents to reach for.
- SH-NU-02, `nu-gate.nu` relies on `--ide-ast` JSON and the `removed` category: unchanged in behaviour, verified by run (below). One note: `scope commands | where category == "removed"` returned an empty list on 0.117.0. Removed commands like `filter` and `size` are caught only through check (3), the strict bareword-external path. The strict path is what carries the gate, so SH-NU-02 stays correct. Whether `removed` was ever populated on 0.116.1 was not re-measured.
- `nu-hang` tail-position `try`, SH-NU-11, "nu 0.112.1 to 0.116.1": changed. `nushell-hang.sh` exits 0 on 0.117.0, so the hazard is not live there, consistent with the stderr-draining fix. SH-NU-11 scope becomes "nu 0.112.1 to 0.116.1, fixed in 0.117.0". The rule stays MUST while the floor to ceiling range includes the affected builds. Cause of the fix is inferred from the release post, not confirmed by a bisect.
- SH-NU-07, `$nu.vendor-autoload-dirs`: unchanged. The post has no mention, and `$nu.vendor-autoload-dirs` still resolves on 0.117.0 with `$nu.data-dir/vendor/autoload` last in the list (`~/.local/share/nushell/vendor/autoload` here).

### 4. nushell gate re-run on 0.117.0 (named check)

Binary: `nu-0.117.0-x86_64-unknown-linux-musl` from the GitHub release, run on Linux x86_64, with a scratch directory outside the repo. Commands used from `skills/shell-quality-reference/checks`: `nu --no-config-file nu-gate.nu --strict FILE` and `NU=<nu> sh nushell-hang.sh`.

| Probe | Exit on 0.117.0 | Reason |
|---|---|---|
| `let-env FOO = 1` | 1 | diagnostic `assignment_requires_variable` plus bareword external |
| `[1 2] \| filter {..}` | 1 | `unknown command treated as external: filter` |
| `get -i b` | 1 | diagnostic `The get command doesn't have flag -i` |
| `str upcase` | 1 | `nu::parser::deprecated` warning |
| `size` | 1 | bareword external |
| `def type [] ...` | 1 | `Can't use parser keyword type as command name` |
| safe twin (`get --optional`, `$env.X =`, `try`/`catch $e.msg`, `into value`) | 0 | clean |
| `nu-gate.nu` on itself | 0 | clean |
| `nushell-hang.sh` | 0 | hazard not live |

Verdict: the `nu-gate.nu` gate still works on 0.117.0, and the planted forms are still red. Its header "nu-range: 0.100.0..0.116.1" is now a claim of the file itself and should become 0.100.0..0.117.0, since the run above supports it. The floor side (0.105.1) was not re-run, because nothing in the window changed it. The `nu-floor` and `nu-denylist` cells and the SH-EMIT-46 `env_change.PWD` probe were not re-run on 0.117.0. Mark those "not re-measured on 0.117.0".

### 5. elvish

- The [elv.sh blog index](https://elv.sh/blog/) lists 0.21.0 (2024-08-14) as newest, then 0.20.1 (2024-02-14). The [GitHub releases page](https://github.com/elves/elvish/releases) marks 0.21.0 Latest. The blog index links undated draft notes for 0.22.0, not a release. `elv.sh/releases/` returned 404.
- Claim elvish.md line 8, "0.21.0, released 2024-08-14, is the newest release on 2026-10-11": unchanged. It also holds on 2026-11-27, so the claim text can read "on 2026-11-27" if the refresh wants a new date, but nothing requires it.
- Claim "elvish 0.18.0 to 0.21.0": unchanged. `elv-gate.sh` needs no re-run, because no new binary exists.

## Normative guidance candidates

1. Rule: bump the nu ceiling in every place to 0.117.0 together: nushell.md line 8, SH-NU-01 scope, SH-NU-04 scope, SH-NU-09, rules/shell-quality.md line 200, emit.md line 9, gates.md line 182, and the `# nu-range:` header of `nu-gate.nu`. Rationale: the 0.116.0 vs 0.116.1 mismatch shows these drift when edited one by one. Verification: `grep -rn "0\.116" rules skills/shell-quality-reference` returns only lines that name 0.116 deliberately, and `grep -rn "0\.105\.1 to 0\.11[0-9]\.[0-9]"` shows one consistent ceiling.
2. Rule: in SH-NU-04 add `filter` (use `where`) and the name `type` to the removed and reserved lists, and change `get -i` to "hard error from 0.117.0". Rationale: agents trained before 0.117 write all three, and 0.117.0 breaks each of them. Verification: `nu-gate.nu --strict` on a file with `filter {..}`, `get -i`, `def type` exits 1 on 0.117.0, as measured above. Add `filter ` to the `nu-denylist` grep cell.
3. Rule: in SH-NU-05 add the 0.117.0 names (`record where`, `record each`, `find --only-matching`, `uniq --keep-last`, `join --anti`, `from dotenv`, `to dotenv`) to the born-after-floor list. Rationale: a file declared for the floor must not use them. Verification: `nu-floor` cell against the 0.105.1 binary. That cell was not re-run in this pass, so run it before the edit lands.
4. Rule: SH-NU-11 scope reads "nu 0.112.1 to 0.116.1; not reproduced on 0.117.0". Rationale: the plant finishes on 0.117.0. Verification: `NU=<0.117.0 nu> sh checks/nushell-hang.sh` exits 0, and on 0.116.1 exits 1.
5. Rule: keep SH-ZSH-07 SHOULD half as SHOULD, and keep the "re-run on the 5.10 release" open question. Rationale: no 5.10 release exists, so it cannot be a measured rule. Verification: `git ls-remote --tags https://github.com/zsh-users/zsh 'zsh-5.10*'` returns nothing. When it returns a tag, re-run probe P8 and `errexit.zsh`.
6. Rule: keep fish at 4.9.3 and elvish at 0.21.0 with no edit. Verification: fish releases page and elvish releases page show no newer tag.

## AI-agent angle

- An agent trained before 0.117 writes `filter { }` for a closure filter. On 0.117.0 it parses as a bareword external. Catch: `nu-gate.nu --strict` (exit 1).
- An agent writes `get -i` or `select -i` from old nu docs. 0.117.0 makes it a parse error, where 0.106.1 to 0.116.1 only warned. Catch: the gate's `--ide-check` diagnostic.
- An agent defines `def type [...]`. Reserved on 0.117.0. Catch: the same diagnostic.
- An agent assumes zsh 5.10 is out because 5.9.2 tags exist. It is not. Catch: `git ls-remote` on the tag pattern above.

## Contested / evolving

- nushell has no 1.0 and breaks on every minor. 0.117.0 is the twelfth breaking minor by the pair's count. Trend: removals now land after a deprecation warning period (`get -i` warned from 0.106.1 and errored at 0.117.0, `str upcase` still only warns). The gate keeps catching both stages.
- zsh 5.10 ERR_EXIT and ERR_RETURN refinement is in NEWS but unreleased. The release date is unknown. The 5.9.x tags (5.9.1 on 2026-05-31, 5.9.2 on 2026-07-12) are maintenance tags, and 5.9.2 is already in the pair's measurement range.
- elvish 0.22.0 is drafted but undated and unreleased.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.nushell.sh/blog/2026-11-09-nushell_v0_117_0.html | nu 0.117.0 release post, breaking changes, try/catch | 2026-11-09 | the only window release |
| https://www.nushell.sh/blog/ | nu blog index | read 2026-11-27 | confirms no release after 0.117.0 and the 0.116.x dates |
| https://github.com/nushell/nushell/releases | nu GitHub releases | read 2026-11-27 | confirms 0.117.0 is Latest, no 0.117.1 |
| https://github.com/zsh-users/zsh/tags | zsh tags | read 2026-11-27 | no 5.10 tag, newest 5.9.2 (2026-07-12) |
| https://www.zsh.org/ | zsh home page | read 2026-11-27 | still lists 5.9, no news |
| https://sourceforge.net/p/zsh/code/ci/master/tree/NEWS | zsh NEWS, development tree | read 2026-11-27 | "Changes since 5.9" ERR_EXIT item |
| https://github.com/fish-shell/fish-shell/releases | fish releases | read 2026-11-27 | newest 4.9.3 (08 Sep) |
| https://github.com/elves/elvish/releases | elvish releases | read 2026-11-27 | newest 0.21.0 |
| https://elv.sh/blog/ | elvish release posts | read 2026-11-27 | 0.21.0 dated 2024-08-14, 0.22.0 draft only |
| https://github.com/nushell/nushell/releases/download/0.117.0/nu-0.117.0-x86_64-unknown-linux-musl.tar.gz | nu 0.117.0 binary used for the gate re-run | 2026-11 | basis of the measured table |
| https://elv.sh/releases/ | returned 404 | n/a | not usable |

Counted as fetched: 12 requests, with 10 distinct usable sources, short of the 12-source minimum because only four shells and one release existed in the window. Primary sources are 10 of 10. The fish CHANGELOG.rst was not opened, because the releases page showed no release after the baseline.
