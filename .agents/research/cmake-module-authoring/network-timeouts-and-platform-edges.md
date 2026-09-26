---
title: Module downloads that never end, and the script-mode surface
topic: cmake-module-authoring
agent: network-timeouts-and-platform-edges
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 24
scope: |
  Revises cmake-module-authoring.md's two open CMK-MOD questions per the
  topic map: (1) file(DOWNLOAD)/FetchContent/ExternalProject network
  timeouts and TLS defaults, measured from CMake source at v3.31.12 and
  v4.4.2 plus a corpus count over the 46-repo exemplar set; (2) the
  CMP0176 Windows-encoding residue of M-D-06; (3) the cmake -P script-mode
  command surface, extending CMK-MOD-14's guard list from CMake's own
  command-registration source. CMK-MOD-01..16 and CMK-TEST-01..05 hold
  stable and are not re-litigated. Out of scope: C++ compiler/toolchain
  encoding, CTest/CPack encoding, any live Windows measurement (no Windows
  host in this environment — flagged inline wherever a claim rests only on
  documentation or the issue tracker instead of a run). No binaries were
  run for this dive; every claim is source, docs or corpus text.
---

## Table of contents

1. [Timeouts: what CMake actually sets, and when it sets nothing](#1-timeouts-what-cmake-actually-sets-and-when-it-sets-nothing)
2. [The corpus: who sets TIMEOUT, who does not, and the git-clone blind spot](#2-the-corpus-who-sets-timeout-who-does-not-and-the-git-clone-blind-spot)
3. [TLS defaults at the same two tags](#3-tls-defaults-at-the-same-two-tags)
4. [Windows encoding: CMP0176 and its own root-cause bug](#4-windows-encoding-cmp0176-and-its-own-root-cause-bug)
5. [The script-mode command surface: what registers, what doesn't, and the one command with the opposite rule](#5-the-script-mode-command-surface-what-registers-what-doesnt-and-the-one-command-with-the-opposite-rule)
6. [Normative guidance candidates](#normative-guidance-candidates)
7. [Exemplar evidence](#exemplar-evidence)
8. [AI-agent angle](#ai-agent-angle)
9. [Contested / evolving](#contested--evolving)
10. [Sources](#sources)

## Summary

- `file(DOWNLOAD)` sets neither `CURLOPT_TIMEOUT` nor `CURLOPT_LOW_SPEED_LIMIT`/`CURLOPT_LOW_SPEED_TIME` unless the caller passes `TIMEOUT`/`INACTIVITY_TIMEOUT`; this is identical byte-for-byte at v3.31.12 and v4.4.2 (`Source/cmFileCommand.cxx`).
- CMake never sets `CURLOPT_CONNECTTIMEOUT` either, at either tag — the only timeout floor on a stalled transfer is libcurl's own un-set defaults, which do not bound a connection that succeeds and then goes silent.
- **A server that accepts the TCP connection and then never answers blocks `cmake` configure indefinitely by default**, confirmed by the absence of any default in the source at both tags (no binary run needed — the code path that would set a limit is simply never reached).
- `FetchContent_Declare`'s content options are exactly `ExternalProject_Add`'s download options with no separate default; `FetchContent_Populate` runs an `ExternalProject_Add` sub-build underneath, so `TIMEOUT`/`INACTIVITY_TIMEOUT` inherit `ExternalProject_Add`'s own absence of a default (`Modules/FetchContent.cmake:120-124`).
- `ExternalProject_Add`'s `TIMEOUT`/`INACTIVITY_TIMEOUT` are template-substituted straight into a generated `download.cmake`'s `file(DOWNLOAD)` call — `Modules/ExternalProject/shared_internal_commands.cmake:583-596` and `Modules/ExternalProject/download.cmake.in:124-125` — with the literal comment `# no TIMEOUT` spliced in when unset, identical at both tags.
- **`TIMEOUT`/`INACTIVITY_TIMEOUT` apply only to the URL/archive download path. They do nothing for `GIT_REPOSITORY`-based fetches** — `Modules/ExternalProject/gitclone.cmake.in` at v4.4.2 contains zero references to either keyword, and CMake's own issue tracker has a live report of exactly this gap (gitlab.kitware.com/cmake/cmake issue 23443: a `git clone` under `FetchContent`/CPM hangs forever in a container with no way for the project to bound it from CMake).
- Corpus count over module-like files (`cmake/`, `Modules/`, `CMake/`, top-level `*.cmake`, non-test) in the 46-repo exemplar set: **52 real `file(DOWNLOAD)`/`FetchContent_Declare`/`ExternalProject_Add` calls, 2 set `TIMEOUT` (both in grpc/grpc's `cmake/download_archive.cmake`), 0 set `INACTIVITY_TIMEOUT`.** find_ocx's 5 `file(DOWNLOAD)` calls (`ocx.cmake:738,765,1413,1434,1467`) set neither.
- `CMAKE_TLS_VERIFY` defaults to on since CMake 3.31 (previously off); `CMAKE_TLS_VERSION` defaults to TLS 1.2 since 3.31 (previously unenforced) — both confirmed at the primary variable docs, identical text at v3.31.12 and v4.4.2 modulo an include-path rename. This corroborates the topic map's correction 2 (host H5) from the normative source itself.
- **`execute_process`'s `ENCODING` default changed three times**: `NONE` (≤3.14, meaning "assume UTF-8"), accidentally `AUTO` (3.15–3.30, undocumented and unnoticed — this is CMake's own bug, gitlab.kitware.com/cmake/cmake issue 26262), then `UTF-8` by policy `CMP0176` from 3.31 (`OLD` = `AUTO`, `NEW` = `UTF-8`). **CMP0176 does not warn** (`WARNS_OR_DOES_NOT_WARN: does *not* warn` in `Help/policy/CMP0176.rst`), so a project whose `cmake_minimum_required` sits below 3.31 gets silent `AUTO` decoding on Windows even when run under CMake 4.4, with zero diagnostic.
- **Windows claims in this section are read-only**: there is no Windows host in this environment. Everything about `CMP0176`, `ENCODING`, and codepage behavior comes from CMake's own docs, source and issue tracker, not a local run.
- Even CMake's own `ExternalProject` module does not trust the policy default: `Modules/ExternalProject/shared_internal_commands.cmake:75` passes `ENCODING UTF-8` explicitly on an `execute_process(... git remote get-url ...)` call, commented `# Needed to handle non-ascii characters in local paths` — self-practice that pre-empts CMP0176 rather than relying on it.
- Corpus count for `execute_process(... ENCODING ...)`: **0 of 46 exemplars** pass `ENCODING` to `execute_process` outside CMake's own test suite; every other `ENCODING UTF-8` hit in the corpus is on the unrelated `file(STRINGS ... ENCODING UTF-8)` signature, which controls how a *file's content* is read, not a *child process's* stdout/stderr.
- Script mode (`cmake -P`) never calls `cmake::AddProjectCommands()` — only `Role::Project` and `Role::FindPackage` do (`Source/cmake.cxx:342-349`, v4.4.2). Every command in `cmake-commands.7.rst`'s "Project Commands" list (≈50: `project`, `add_executable`, `add_library`, `add_subdirectory`, `target_link_libraries`, `install`, `enable_language`, `try_compile`, `export`, …) is **never registered under `-P`** and fails with "Unknown CMake command", not a silent no-op.
- `cmake_language(DEFER CALL ...)` is a registered Scripting Command yet still fails under `-P`: it needs `cmMakefile::Configure()`'s `this->Defer` member, which only `Configure()` sets up (`Source/cmMakefile.cxx:1747`); the plain `ReadListFile()` path that both `-P` and `include()` use never sets it, so `DeferCall()` (`cmMakefile.cxx:2579-2587`) returns `false` and the command reports a fatal error.
- `set_property(DIRECTORY ...)` and `set_directory_properties(...)` are the mirror case: both are Scripting Commands, both are silently accepted under `-P` (the current-directory property map always exists), and both silently do nothing useful, because nothing in script mode ever reads directory properties for a generate step.
- **`cmake_language(EXIT <code>)` has the exact opposite restriction from `DEFER`**: its own doc says "This command works only in script mode... If used outside of that context, it will cause a fatal error" (`Help/command/cmake_language.rst` @ v4.4.2). Same parent command, two subcommands, opposite scoping — a sharp trap for anyone who assumes `cmake_language(...)` subcommands share one scope rule.

## Findings

### 1. Timeouts: what CMake actually sets, and when it sets nothing

`file(DOWNLOAD)`'s `TIMEOUT` and `INACTIVITY_TIMEOUT` options are parsed identically at both tags (`Source/cmFileCommand.cxx:1916-1929` at v4.4.2; `:1953-1966` at v3.31.12) into `long timeout = 0` / `long inactivity_timeout = 0`, and applied conditionally:

```cxx
if (timeout > 0) {
  res = ::curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);
  check_curl_result(res, "DOWNLOAD cannot set timeout: ");
}

if (inactivity_timeout > 0) {
  // Give up if there is no progress for a long time.
  ::curl_easy_setopt(curl, CURLOPT_LOW_SPEED_LIMIT, 1);
  ::curl_easy_setopt(curl, CURLOPT_LOW_SPEED_TIME, inactivity_timeout);
}
```

[`cmFileCommand.cxx@v4.4.2:2257-2266`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmFileCommand.cxx#L2257-2266); byte-identical at [`v3.31.12:2282-2291`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Source/cmFileCommand.cxx#L2282-2291). No default value greater than 0 exists anywhere upstream of this. `CURLOPT_CONNECTTIMEOUT` is never set at either tag (`grep -c CONNECTTIMEOUT` on both files: 0 matches), so even the connect-phase floor is whatever libcurl's own unconfigured default is — irrelevant here because the reported hang scenario (TCP accept, then silence) is a *post-connect* stall, governed only by `CURLOPT_TIMEOUT`/`CURLOPT_LOW_SPEED_TIME`, neither of which CMake sets unless the caller does. **A server that completes the TCP handshake and then sends nothing blocks `file(DOWNLOAD)`, and therefore `cmake` configure, indefinitely by default, at both v3.31.12 and v4.4.2.**

`ExternalProject_Add`'s `TIMEOUT`/`INACTIVITY_TIMEOUT` (documented since ExternalProject's original release; `INACTIVITY_TIMEOUT` added 3.19, [`ExternalProject.cmake@v4.4.2:213-219`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject.cmake#L213-219)) are not consumed inside `ExternalProject.cmake` itself — that file is pure documentation for the download step. The real mechanism lives in `Modules/ExternalProject/shared_internal_commands.cmake`, identical shape at both tags:

```cmake
if(timeout)
  set(TIMEOUT_ARGS TIMEOUT ${timeout})
  set(TIMEOUT_MSG "${timeout} seconds")
else()
  set(TIMEOUT_ARGS "# no TIMEOUT")
  set(TIMEOUT_MSG "none")
endif()
if(inactivity_timeout)
  set(INACTIVITY_TIMEOUT_ARGS INACTIVITY_TIMEOUT ${inactivity_timeout})
  set(INACTIVITY_TIMEOUT_MSG "${inactivity_timeout} seconds")
else()
  set(INACTIVITY_TIMEOUT_ARGS "# no INACTIVITY_TIMEOUT")
  set(INACTIVITY_TIMEOUT_MSG "none")
endif()
```

[`shared_internal_commands.cmake@v4.4.2:583-596`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/shared_internal_commands.cmake#L583-596) (v3.31.12: same code at `:581-592`). These get template-substituted into the generated `download.cmake` (from [`Modules/ExternalProject/download.cmake.in@v4.4.2:124-125`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/download.cmake.in#L124-125)):

```cmake
file(
  DOWNLOAD
  "${url}" "@LOCAL@"
  @SHOW_PROGRESS@
  @TIMEOUT_ARGS@
  @INACTIVITY_TIMEOUT_ARGS@
  STATUS status
  LOG log
  ...
  )
```

When the caller passes neither option, the literal comment tokens `# no TIMEOUT` / `# no INACTIVITY_TIMEOUT` are spliced in place of `TIMEOUT <n>`/`INACTIVITY_TIMEOUT <n>` — the generated `file(DOWNLOAD)` ends up with exactly the same absent-default behavior as a hand-written call. `download.cmake.in` differs between the two tags by one line only (the license-file rename from `Copyright.txt` to `LICENSE.rst`); the substitution logic is otherwise unchanged.

`FetchContent_Declare`'s `<contentOptions>` are explicitly "any of the download, update, or patch options that the `ExternalProject_Add` command understands" ([`FetchContent.cmake@v4.4.2:120-124`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/FetchContent.cmake#L120-124)), and `FetchContent_Populate` runs an `ExternalProject_Add` sub-build to do the actual fetch. There is no separate `FetchContent`-level default for either timeout keyword — it inherits `ExternalProject_Add`'s absence of one.

**The gap that matters most: neither keyword does anything for `GIT_REPOSITORY`.** `Modules/ExternalProject/gitclone.cmake.in` at v4.4.2 has zero occurrences of `TIMEOUT` or `INACTIVITY_TIMEOUT` (`grep -n -e TIMEOUT -e timeout Modules/ExternalProject/gitclone.cmake.in`: no matches). Git's own transport (plain `git clone`/`git fetch` subprocess) has no CMake-level timeout hook at all. This is a live, reported problem: gitlab.kitware.com/cmake/cmake issue [23443](https://gitlab.kitware.com/cmake/cmake/-/work_items/23443), "FetchContent stuck in gitlab-runner pipeline" — a `git clone` step under `FetchContent`/CPM hangs indefinitely inside a container with no CMake option to bound it, closed 2022-04-23 with no code fix (the underlying limitation is by design: `TIMEOUT`/`INACTIVITY_TIMEOUT` are download-step-only options). A related, older report — issue [16109](https://gitlab.kitware.com/cmake/cmake/-/work_items/16109), "ExternalProject: Downloading of a file may hang indefinitely if a partial file exists" (2016) — is about the URL path and is orthogonal to the timeout keywords entirely (a stale partial file could suppress a fresh download attempt, not bypass a timeout).

### 2. The corpus: who sets TIMEOUT, who does not, and the git-clone blind spot

Measurement: scanned every `*.cmake` file under a `cmake/`, `Modules/`, or `CMake/` directory (excluding paths containing `test`/`Test`), plus every top-level `*.cmake` file (depth ≤2, same test exclusion), across all 46 repositories at `/home/mherwig/.cache/research-lang/exemplars/cmake/<owner>__<repo>` (SHAs as re-fetched 2026-09-26, per the topic map). For every `file(DOWNLOAD ...)`, `FetchContent_Declare(...)` and `ExternalProject_Add(...)` call found, the full parenthesized block was checked for a bare-word `TIMEOUT` or `INACTIVITY_TIMEOUT` token.

`Kitware/CMake`'s own `Modules/` tree was excluded from the count: nearly every hit there (76 of the raw 118 matches) is a `.. code-block:: cmake` example embedded in an `#[[.rst: ... ]]` bracket-comment docstring inside `FetchContent.cmake`/`ExternalProject.cmake` — documentation text, not executable calls (verified by reading the surrounding lines, e.g. [`FetchContent.cmake@v4.4.2:44-59`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/FetchContent.cmake#L44-59), which sits directly under "The following shows a typical example of declaring content details..."). Counting them would overstate both the call count and, since none set `TIMEOUT`, would not change the zero for that repo either way — but it would misrepresent what a "module-like file" call site is.

Command (empty output would mean no such calls anywhere; non-empty is the finding, i.e. the adoption count):

```sh
for d in /home/mherwig/.cache/research-lang/exemplars/cmake/*/; do
  repo=$(basename "$d")
  [ "$repo" = "Kitware__CMake" ] && continue
  find "$d" \( -path '*/cmake/*' -o -path '*/Modules/*' -o -path '*/CMake/*' \) \
    -name '*.cmake' -not -path '*/test*' -not -path '*/Test*'
  find "$d" -maxdepth 2 -name '*.cmake' -not -path '*/test*' -not -path '*/Test*'
done | sort -u | xargs -r grep -n -e 'file(DOWNLOAD' -e 'FetchContent_Declare(' -e 'ExternalProject_Add(' --include='*.cmake' -i
```

Result: **52 calls across 20 of the 45 non-Kitware repos** (`cpm-cmake/CPM.cmake`, `cpm-cmake/CPMLicenses.cmake`, `cpp-best-practices/cmake_template`, `TheLartians/ModernCppStarter`, `aminya/project_options`, `apache/arrow`, `ccache/ccache`, `ClickHouse/ClickHouse`, `cpp-pm/hunter`, `duckdb/duckdb`, `filipdutescu/modern-cpp-template`, `friendlyanon/cmake-init`, `glfw/glfw`, `grpc/grpc`, `llvm/llvm-project`, `microsoft/vcpkg`, `microsoft/vcpkg-tool`, `nlohmann/json`, `ocx-sh/find_ocx`, `protocolbuffers/protobuf`, `qt/qtbase`).

| Repo | Calls | Sets `TIMEOUT` | Sets `INACTIVITY_TIMEOUT` |
|---|---|---|---|
| grpc/grpc@`0f8d72ed71` | 4 | **2** (`cmake/download_archive.cmake:30,40`, value `60`) | 0 |
| ocx-sh/find_ocx@`ac2a759cd0` | 5 | 0 | 0 |
| cpp-pm/hunter@`997fab148b` | 3 | 0 | 0 |
| llvm/llvm-project@partial | 5 | 0 | 0 |
| microsoft/vcpkg-tool | 3 | 0 | 0 |
| protocolbuffers/protobuf | 4 | 0 | 0 |
| aminya/project_options | 6 | 0 | 0 |
| all other 13 repos | 22 | 0 | 0 |
| **Total (45 repos, module-like files)** | **52** | **2 (3.8%)** | **0 (0%)** |

`find_ocx`'s own 5 calls (read directly from `/home/mherwig/dev/find_ocx/ocx.cmake`, not the corpus snapshot, per the brief): `ocx.cmake:738` (dist-manifest fetch), `:765` (main archive fetch, has `EXPECTED_HASH` but no timeout), `:1413`, `:1434`, `:1467` (the self-update path's manifest/hash-list/binary fetches). All five omit `TIMEOUT` and `INACTIVITY_TIMEOUT`. This is a distinct gap from the map's already-flagged `TLS_VERIFY` absence (correction 2) — the two are independent options on the same calls.

grpc's `cmake/download_archive.cmake` is the one exemplar worth holding up as the correct shape end to end:

```cmake
file(DOWNLOAD ${url} ${_TEMPORARY_FILE}
     TIMEOUT 60
     EXPECTED_HASH SHA256=${hash}
     TLS_VERIFY ON
     STATUS _download_STATUS)
```

[`grpc/grpc@0f8d72ed71:cmake/download_archive.cmake:29-33`](https://github.com/grpc/grpc/blob/0f8d72ed71/cmake/download_archive.cmake#L29-L33) — `TIMEOUT`, `TLS_VERIFY ON`, `EXPECTED_HASH`, plus a hand-rolled 3-attempt retry loop with a fallback mirror URL around the whole thing. It does not set `INACTIVITY_TIMEOUT`, so a slow-but-nonzero trickle within 60 seconds still succeeds; a true zero-byte stall is caught by `TIMEOUT` alone here since the value is small. No exemplar anywhere in the 46-repo corpus sets `INACTIVITY_TIMEOUT`.

### 3. TLS defaults at the same two tags

`TLS_VERIFY_DEFAULT` and `TLS_VERSION_DEFAULT` are compiled constants, unchanged between the two tags:

```cxx
bool const TLS_VERIFY_DEFAULT = true;
std::string const TLS_VERSION_DEFAULT = "1.2";
```

[`cmFileCommand.cxx@v4.4.2:1692-1693`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmFileCommand.cxx#L1692-1693); [`v3.31.12:1741-1742`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Source/cmFileCommand.cxx#L1741-1742) (same values, only naming-convention noise between the lines). The primary variable docs confirm the version this flipped, and are textually identical at both tags apart from one `include::` path rename:

> `.. versionchanged:: 3.31` The default is on. Previously, the default was off.

[`Help/variable/CMAKE_TLS_VERIFY.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/variable/CMAKE_TLS_VERIFY.rst) and

> `.. versionchanged:: 3.31` The default is TLS 1.2. Previously, no minimum version was enforced by default.

[`Help/variable/CMAKE_TLS_VERSION.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/variable/CMAKE_TLS_VERSION.rst). This is primary-source confirmation of the topic map's correction 2 (host H5): "TLS verification defaults on since 3.31." Both variables are also read by `ExternalProject`/`FetchContent`'s internal `file(DOWNLOAD)` calls; `CMAKE_TLS_VERSION` additionally documents that it feeds `git clone`'s TLS behavior — the one place the git path *does* inherit a CMake-level network-hardening default, even though it inherits none of the timeout ones.

### 4. Windows encoding: CMP0176 and its own root-cause bug

`execute_process`'s `ENCODING` option ("Ignored on other platforms" — Windows-only by design) has had three distinct defaults:

| CMake range | Default | Source |
|---|---|---|
| ≤ 3.14 | `NONE` (assume the child's output is already UTF-8, CMake's internal encoding) | [`execute_process.rst@v4.4.2:161-165`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/execute_process.rst#L161-165) |
| 3.15 – 3.30 | `AUTO` (console codepage or ANSI) | same page, `:167-171`; this was **accidental and undocumented** |
| 3.31+ (policy `CMP0176` `NEW`) | `UTF-8` | [`Help/policy/CMP0176.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/policy/CMP0176.rst) |

The middle row is CMake's own bug, not a deliberate design change: gitlab.kitware.com/cmake/cmake issue [26262](https://gitlab.kitware.com/cmake/cmake/-/work_items/26262), "execute_process: Default ENCODING is AUTO instead of documented default NONE" (opened 2024-09-04, closed 2024-09-17), traces it to a refactor (`b783e62`) that dropped the explicit `cmProcessOutput::None` default and let `cmProcessOutput::FindEncoding()`'s own internal default of `Auto` take over silently. The report explicitly notes the practical effect: "on Windows, this means that the output captured from the process is generally not UTF-8 encoded... So subsequent processing of this text in CMake will be incorrect." **CMP0176 is the fix for a genuine 9-release-cycle regression**, not a stylistic cleanup.

`CMP0176.rst` states its own behavior precisely:

> The `OLD` behavior of this policy is for `execute_process` to use `AUTO` by default if no `ENCODING` is specified. The `NEW` behavior for this policy is to use `UTF-8` as the default `ENCODING`.

and, critically, its standard-advice substitution block sets `WARNS_OR_DOES_NOT_WARN` to **"does *not* warn"** — unlike most policies, a project sitting on `OLD` behavior (i.e. any `cmake_minimum_required` below 3.31) gets no diagnostic at all, on any CMake version, including 4.4.2. This is read-only from documentation; there is no Windows host in this environment to observe the mis-decoding directly.

Even CMake's own module authors do not lean on the policy default. `Modules/ExternalProject/shared_internal_commands.cmake` passes `ENCODING UTF-8` explicitly on a git-remote-URL probe:

```cmake
execute_process(
  COMMAND ${GIT_EXECUTABLE} ${_git_remote_url_cmd_args}
  WORKING_DIRECTORY "${working_directory}"
  OUTPUT_VARIABLE git_remote_url
  OUTPUT_STRIP_TRAILING_WHITESPACE
  COMMAND_ERROR_IS_FATAL LAST
  ENCODING UTF-8   # Needed to handle non-ascii characters in local paths
  RESULT_VARIABLE _result_git_remote_url
)
```

[`shared_internal_commands.cmake@v4.4.2:68-76`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/shared_internal_commands.cmake#L68-76). This file predates and postdates CMP0176's introduction unchanged in this respect — it never relies on the policy, it states the option every time.

Corpus check: `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'ENCODING UTF-8' -e 'ENCODING "UTF-8"'` across all 46 repos returns 27 hits, and **every single one outside `Kitware/CMake`'s own tree is `file(STRINGS ... ENCODING UTF-8)`** (reading a file's byte content, an unrelated option on an unrelated command) or `CPACK_ARCHIVE_ENCODING` (unrelated to CMP0176 entirely). **Zero of 46 exemplars pass `ENCODING` to `execute_process` in production code.** The only `execute_process(... ENCODING ...)` hits are inside `Kitware/CMake`'s own `shared_internal_commands.cmake` (self-practice, above) and its `Tests/RunCMake/execute_process/{EncodingUTF-8,Encoding-common}.cmake` regression fixtures, which exist specifically to pin down `CMP0176`'s two behaviors:

```cmake
cmake_policy(GET CMP0176 cmp0176)
if(cmp0176 STREQUAL "NEW")
  set(ENCODING UTF-8) # execute_process's default ENCODING
else()
  set(ENCODING AUTO) # execute_process's default ENCODING
endif()
```

[`Tests/RunCMake/execute_process/Encoding-common.cmake@v4.4.2:1-10`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Tests/RunCMake/execute_process/Encoding-common.cmake#L1-10) — this is CMake's own test asserting exactly the OLD/NEW split described above.

A related, now-historical Windows encoding defect, kept here for texture since it shaped how seriously Kitware treats this surface: issue [25561](https://gitlab.kitware.com/cmake/cmake/-/work_items/25561), "execute_process: cmExecuteProcessCommandFixText() for UTF-8 output causes assertion failures on Windows due to isspace() usage" (opened 2024-01-05, closed 2024-01-08) — localized (non-ASCII) linker output fed into the locale-dependent C `isspace()` function triggered a debug-build assertion. Already fixed well before both measured tags (3.31.12, 4.4.2); cited only as evidence that "Windows + non-ASCII child-process output" is a recurring CMake-internal fault line, not a one-off.

### 5. The script-mode command surface: what registers, what doesn't, and the one command with the opposite rule

`cmake-commands.7.rst` splits commands into four groups; the two that matter here are "Scripting Commands" ("These commands are always available") and "Project Commands" ("These commands are available only in CMake projects") — [`Help/manual/cmake-commands.7.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/manual/cmake-commands.7.rst). This split is not just documentation — it is enforced at command-registration time:

```cxx
if (role == cmState::Role::Project || role == cmState::Role::FindPackage ||
    role == cmState::Role::Script || role == cmState::Role::CTest ||
    role == cmState::Role::CPack) {
  this->AddScriptingCommands();
}
if (role == cmState::Role::Project || role == cmState::Role::FindPackage) {
  this->AddProjectCommands();
}
```

[`Source/cmake.cxx@v4.4.2:342-349`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmake.cxx#L342-349). `cmake -P` runs with `cmState::Role::Script`, which is in the first list and never the second. **Every command in the "Project Commands" toctree — `project`, `add_executable`, `add_library`, `add_custom_command`, `add_custom_target`, `add_definitions`, `add_dependencies`, `add_compile_definitions`, `add_compile_options`, `add_link_options`, `add_subdirectory`, `add_test`, `aux_source_directory`, `build_command`, `cmake_file_api`, `cmake_instrumentation`, `create_test_sourcelist`, `define_property`, `discover_tests`, `enable_language`, `enable_testing`, `export`, `fltk_wrap_ui`, `get_source_file_property`, `get_target_property`, `get_test_property`, `include_directories`, `include_external_msproject`, `include_regular_expression`, `install`, `link_directories`, `link_libraries`, `remove_definitions`, `set_source_files_properties`, `set_target_properties`, `set_tests_properties`, `source_group`, `target_compile_definitions`, `target_compile_features`, `target_compile_options`, `target_include_directories`, `target_link_directories`, `target_link_libraries`, `target_link_options`, `target_precompile_headers`, `target_sources`, `try_compile`, `try_run` — is never registered under `-P` and fails with a hard "Unknown CMake command"** parse error, not a silent no-op and not a warning.

Inside the "Scripting Commands" list (always registered), two commands still behave specially under `-P`, in opposite directions:

**`cmake_language(DEFER CALL ...)` errors.** Its doc describes deferred calls as running "at the end of the current directory's `CMakeLists.txt` file" ([`Help/command/cmake_language.rst@v4.4.2:110-116`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/cmake_language.rst#L110-116)) but never states the script-mode restriction explicitly — it falls out of the implementation. `cmCMakeLanguageCommand.cxx`'s DEFER handler calls `deferMakefile->DeferCall(...)` and turns a `false` return into a fatal error:

```cxx
if (!deferMakefile->DeferCall(defer->Id, context.FilePath, func)) {
  return FatalError(
    status,
    cmStrCat("DEFER CALL may not be scheduled in directory:\n  "_s,
             deferMakefile->GetCurrentBinaryDirectory(), "\nat this time."_s));
}
```

[`cmCMakeLanguageCommand.cxx@v4.4.2:104-112`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmCMakeLanguageCommand.cxx#L104-112). `cmMakefile::DeferCall()` itself is a one-line gate: `if (!this->Defer) { return false; }` ([`cmMakefile.cxx@v4.4.2:2579-2583`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmMakefile.cxx#L2579-2583)). `this->Defer` is only constructed in `cmMakefile::Configure()` — the real-project directory-processing entry point — immediately before running the listfile: `this->Defer = cm::make_unique<DeferCommands>(); this->RunListFile(listFile, currentStart, this->Defer.get());` ([`cmMakefile.cxx@v4.4.2:1747-1748`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmMakefile.cxx#L1747-1748)). The plain `cmMakefile::ReadListFile(filename)` entry point — used by both `cmake -P` and `include()` — calls `this->RunListFile(listFile, filenametoread)` with no `Defer` argument at all ([`cmMakefile.cxx@v4.4.2:849-882`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmMakefile.cxx#L849-882)). So `DEFER CALL` fails not only directly under `-P` but in **any listfile reached only through `include()` from a script** — the failure tracks how the file was entered, not just the top-level mode.

**`set_property(DIRECTORY ...)` and `set_directory_properties(...)` are the mirror case: silently accepted, silently useless.** Both are "Scripting Commands," both operate on the current directory's property map — which always exists in `cmState`, script mode or not — so the call succeeds and stores the value. Nothing under `-P` ever performs a generate step that would read a directory property back out for build-system purposes, so the write has no observable effect. This is exactly the case CMK-MOD-14's guard exists for: no error, no warning, just quiet nothing.

**`cmake_language(EXIT <exit-code>)` is the reverse restriction, on the same parent command.** Its own doc states it outright:

> Terminate the current `cmake -P` script and exit with `<exit-code>`. **This command works only in script mode. If used outside of that context, it will cause a fatal error.**

[`Help/command/cmake_language.rst@v4.4.2:517-524`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/cmake_language.rst#L517-524). So `cmake_language(...)`'s subcommands do not share one scoping rule: `DEFER` needs a real project's `Configure()` machinery and fails under `-P`/`include()`-from-script; `EXIT` needs `-P` and fails everywhere else; `CALL`, `EVAL`, `GET_MESSAGE_LOG_LEVEL` have no scope restriction at all. A guard rule that treats "`cmake_language` is fine in script mode" as one fact is wrong in two different ways depending on which subcommand it means.

## Normative guidance candidates

**CMK-MOD-17 — Every `file(DOWNLOAD)`, `FetchContent_Declare(... URL ...)` and `ExternalProject_Add(... URL ...)` call that fetches over the network MUST set a finite `TIMEOUT`.**
- Rationale: CMake sets no default `CURLOPT_TIMEOUT`, `CURLOPT_CONNECTTIMEOUT` or `CURLOPT_LOW_SPEED_*` at either measured tag (§1); a server that accepts the connection and stalls hangs configure forever, with no operator-visible signal beyond "stuck." Normative source is sufficient evidence per the topic map's framing; corpus adoption (3.8%, §2) shows the risk is live, not theoretical.
- Verification: empty output passes for a repo with no such calls; a call block with neither `TIMEOUT` nor `INACTIVITY_TIMEOUT` inside it is the finding (manual read of each hit — no reliable single-line grep exists because the keyword can be several lines below the opening paren).

  ```sh
  grep -rln --include='*.cmake' -e 'file(DOWNLOAD' -e 'FetchContent_Declare(' -e 'ExternalProject_Add(' "$MODULE_DIR"
  ```

- Severity: MUST. Floor: any version — `TIMEOUT` predates the documented ExternalProject history and `file(DOWNLOAD)`'s `TIMEOUT` has no `versionadded` tag (present since the command's introduction).

**CMK-MOD-18 — `TIMEOUT`/`INACTIVITY_TIMEOUT` on `ExternalProject_Add`/`FetchContent_Declare` do not bound a `GIT_REPOSITORY` fetch. Do not rely on them for git-based dependencies; wrap the clone with an external timeout, or pin `git config http.lowSpeedLimit`/`http.lowSpeedTime` (or `GIT_HTTP_LOW_SPEED_LIMIT`/`GIT_HTTP_LOW_SPEED_TIME`) in the environment CMake's git subprocess inherits.**
- Rationale: `Modules/ExternalProject/gitclone.cmake.in` never references either keyword (§1); the option only reaches `file(DOWNLOAD)`'s own generated script. Issue [23443](https://gitlab.kitware.com/cmake/cmake/-/work_items/23443) is a live report of exactly this hang in CI.
- Verification (reading heuristic — the option name is real CMake syntax, so grep alone cannot tell "present but ineffective" from "present and effective"; a reviewer must check the download method):

  ```sh
  grep -rn --include='*.cmake' -B2 -A2 -e 'GIT_REPOSITORY' "$MODULE_DIR"
  ```

  Empty output passes (no git-based fetches to worry about). A hit whose surrounding block also carries `TIMEOUT`/`INACTIVITY_TIMEOUT` is the finding — the author believed those options protect the clone; they do not.
- Severity: SHOULD (this is a documentation/education gap in CMake itself, not a violable syntax rule — there is no CMake-native fix to demand). Floor: any version; `GIT_REPOSITORY` has taken no keyword changes relevant here.

**CMK-MOD-19 — Any `execute_process()` call whose captured stdout/stderr is parsed, compared, or logged MUST pass `ENCODING UTF-8` explicitly, when the module's floor is below 3.31.**
- Rationale: below the `CMP0176` `NEW` default (3.31), Windows decoding is `AUTO` (console codepage) — silently, with **no policy warning at any CMake version** (`WARNS_OR_DOES_NOT_WARN: does *not* warn`, §4). Even CMake's own `ExternalProject` internals do not trust the default and pass the option explicitly. This is a Windows-only concern; the claim rests on documentation and CMake's own source/tests, not a local Windows run.
- Verification: empty output passes; an `execute_process(` block whose `OUTPUT_VARIABLE`/`ERROR_VARIABLE` result is later compared, matched, or written back out, with no `ENCODING` keyword in the block, is the finding.

  ```sh
  grep -rn --include='*.cmake' -A15 -e 'execute_process(' "$MODULE_DIR"
  ```

- Severity: MUST below a 3.31 floor; SHOULD (defense in depth against a future floor drop, and cheap) at 3.31+ where the policy default already covers it. Floor for the concern: any version; floor for "policy already helps": 3.31.

**CMK-MOD-20 — Extend CMK-MOD-14's `CAMKE_SCRIPT_MODE_FILE` guard list. Under `cmake -P`, every "Project Commands"-listed command (see `cmake-commands.7.rst`, ~50 names: `project`, `add_*`, `target_*`, `install`, `enable_language`, `try_compile`, `try_run`, `export`, …) is an "Unknown CMake command" hard error. `cmake_language(DEFER ...)` is also a hard error, despite being a Scripting Command. `set_property(DIRECTORY ...)`/`set_directory_properties(...)` are silently accepted no-ops. `cmake_language(EXIT ...)` is the mirror case: it is the one command that errors OUTSIDE script mode instead.**
- Rationale: a guard that only knows "project commands are unavailable" misses `DEFER`'s failure and would wrongly assume `set_property(DIRECTORY)` either works or errors, when it does neither — it succeeds and is discarded. `cmake_language(EXIT)` inverts the whole pattern the guard is built around, so treating "`cmake_language` subcommands are fine in `-P`" as one fact breaks in both directions.
- Verification: as CMK-MOD-14's existing pair, extended — the second grep should also flag `cmake_language(DEFER` and `cmake_language(EXIT` occurrences for a manual scope check, since neither is caught by a `CMAKE_SCRIPT_MODE_FILE` guard search alone.

  ```sh
  grep -rn --include='*.cmake' -e 'cmake_language(DEFER' -e 'cmake_language(EXIT' "$MODULE_DIR"
  ```

  Empty output passes (nothing to double-check). Each hit is a manual read: a `DEFER` inside code reachable from a documented `-P` entry point, or an `EXIT` reachable from code that can run inside a real project build, is the finding.
- Severity: SHOULD (same house-voice grade as CMK-MOD-14 itself, which this extends rather than replaces). Floor: `cmake_language(DEFER)` needs 3.19; `cmake_language(EXIT)` needs 3.29; the command-registration split itself (`Role::Script` vs `Role::Project`) is unversioned CMake architecture, present at every floor this program considers.

## Exemplar evidence

- **grpc/grpc@`0f8d72ed71`** (`cmake/download_archive.cmake:29-33`) is the corpus's only `TIMEOUT`-setting exemplar (2 of 52 calls, both in this one file) and combines it with `TLS_VERIFY ON`, `EXPECTED_HASH`, and a 3-attempt fallback-mirror retry loop — the pattern CMK-MOD-17 asks for, minus `INACTIVITY_TIMEOUT` (§2).
- **find_ocx@`ac2a759cd0`** (`ocx.cmake:738,765,1413,1434,1467`) violates CMK-MOD-17 at all 5 call sites: no `TIMEOUT`, no `INACTIVITY_TIMEOUT`. This sits alongside the topic map's already-flagged `TLS_VERIFY` gap (correction 2) on the same lines — two independent missing options, not one.
- **cpp-pm/hunter@`997fab148b`** (`cmake/modules/hunter_autotools_project.cmake:179,209,292`, three `ExternalProject_Add` calls) sets neither keyword either; Hunter's own maintenance cadence (v0.26.12, 2026-09-22) has not touched this.
- **Kitware/CMake itself** (`Modules/ExternalProject/shared_internal_commands.cmake:68-76`) is the corpus's only exemplar for CMK-MOD-19: it passes `ENCODING UTF-8` explicitly on an `execute_process(git remote get-url ...)` call rather than trusting `CMP0176`'s default, and its own `Tests/RunCMake/execute_process/Encoding-common.cmake` is the regression fixture that pins the OLD/NEW split down (§4). No other exemplar in the 46-repo set passes `ENCODING` to `execute_process` at all — CMK-MOD-19 has zero adopters outside the tool vendor's own code.
- No exemplar in the corpus exercises CMK-MOD-18's git-clone-timeout gap directly (no repo wraps a `GIT_REPOSITORY`-based `ExternalProject_Add`/`FetchContent_Declare` in an external timeout); the evidence for that rule is the CMake issue tracker (23443), not the corpus.
- CMK-MOD-20's script-mode taxonomy has no corpus exemplar either way — none of the 46 repos ship a `cmake -P` entry point that calls `cmake_language(DEFER)` or `cmake_language(EXIT)`; the evidence is CMake's own source (`cmake.cxx`, `cmCMakeLanguageCommand.cxx`, `cmMakefile.cxx`) plus wave 2's direct measurement of `set_property(DIRECTORY)` and `cmake_language(DEFER)`.

## AI-agent angle

- **Assuming `TIMEOUT` covers a `GIT_REPOSITORY` fetch.** A model trained on ExternalProject/FetchContent examples has seen `TIMEOUT`/`INACTIVITY_TIMEOUT` used near `GIT_REPOSITORY` blocks in the same document (the option list in `ExternalProject.cmake`'s docs is one flat list, not split by download method) and will often add `TIMEOUT 60` to a git-based declare believing it caps the clone. Mechanical check: for any `GIT_REPOSITORY` block that also carries `TIMEOUT`/`INACTIVITY_TIMEOUT`, flag it — the combination is a tell that the author (human or model) believes something CMake does not implement (CMK-MOD-18's grep).
- **Assuming `execute_process` always returns UTF-8, because that's true on non-Windows and true on any 3.x version the model trained on that happens to predate the 3.15 regression, or postdates 3.31.** A model with a training cutoff inside the 3.15–3.30 window, or one that never learned about `CMP0176` at all, will not know that `AUTO`-decoded, locale-dependent Windows output was ever the *silent, undocumented* default (issue 26262) — it will assume "CMake decodes as UTF-8" is simply always true. Mechanical check: grep for `execute_process(` blocks with an `OUTPUT_VARIABLE`/`ERROR_VARIABLE` and no `ENCODING` keyword, when the stated floor is below 3.31 (CMK-MOD-19's grep).
- **Treating `cmake_language(...)` as one uniformly scoped command.** Given `DEFER`'s script-mode error is well documented in changelogs and `EXIT`'s script-mode-*only* restriction is the polar opposite, a model asked to "make this deferred call work from a `-P` script" may reach for `cmake_language(EXIT)` semantics or vice versa, or assume adding a `CMAKE_SCRIPT_MODE_FILE` guard around a `DEFER` call fixes it (it does not — the guard should skip the call entirely under `-P`, not merely detect the mode). Mechanical check: any code path that can execute under both `-P` and normal configure must not contain an unconditional `cmake_language(DEFER` or `cmake_language(EXIT` — CMK-MOD-20's grep, read manually against the entry point's documented mode.
- **Assuming a "Project Commands" call under `-P` will warn or silently do nothing, rather than hard-fail.** A model porting a snippet from a `CMakeLists.txt` into a `-P` utility script (a common ask: "write a small script that reuses this logic") may not realize `add_library`/`install`/`target_link_libraries` etc. are not degraded gracefully — they are simply unregistered, so the failure is "Unknown CMake command," which reads like a typo, not a scope violation. Mechanical check: for a documented `-P` entry point, grep the file for any name from the "Project Commands" list (§5) — CMK-MOD-14/CMK-MOD-20's `CMAKE_SCRIPT_MODE_FILE` guard search, applied against that specific name list rather than a generic "looks like a project command" heuristic.
- **Reaching for Conan-1-era or hand-rolled retry/backoff code instead of the built-in `TIMEOUT`/`STATUS` pair.** Not measured directly in this dive, but consistent with the broader program's finding that models trained on older material default to more code than CMake's own primitives require; grpc's own retry loop (§2) is a case where the *manual* retry logic is justified (mirrors, not CMake's own retry), which a model should be able to tell apart from "reinventing `TIMEOUT`."

## Contested / evolving

- **Whether `INACTIVITY_TIMEOUT` is worth recommending at all, given 0% corpus adoption.** The topic map's instruction explicitly allows normative source alone to justify a MUST; this dive follows that for `TIMEOUT` (a total bound is unambiguously good) but stops short of a MUST for `INACTIVITY_TIMEOUT` specifically, since a project with a large, slow-but-steady archive could set `TIMEOUT` generously and never need it, and zero real projects (including CMake's own modules) model the "trickle vs total" distinction in practice. As of 2026-09-26, this reads as a real gap in community practice, not a stylistic choice — worth revisiting if a future corpus snapshot shows adoption moving.
- **The `GIT_REPOSITORY` timeout gap (CMK-MOD-18) is a CMake product gap, not a settled community workaround.** Issue 23443 closed with no code change and no canonical recommended pattern; the `git config http.lowSpeedLimit`/`GIT_HTTP_LOW_SPEED_LIMIT` mitigation in this dive's rule is inferred from git's own documented behavior, not from a CMake-blessed idiom or a corpus exemplar. Treat CKM-MOD-18's SHOULD as this program's best current answer, not an industry consensus.
- **`CMP0176`'s "no warning" design choice is itself unresolved as a complaint surface.** No issue in the tracker (searched for "CMP0176" directly, zero hits as of 2026-09-26) currently asks Kitware to add a diagnostic; the policy's own `STANDARD_ADVICE.rst` include (shared boilerplate text across all "does not warn" policies) is the only place this is even acknowledged. This may change if more projects report the AUTO/UTF-8 encoding mismatch as their floor drifts below 3.31 while running on newer CMake in CI.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`Source/cmFileCommand.cxx@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmFileCommand.cxx) and [`@v3.31.12`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Source/cmFileCommand.cxx) | Primary source, `file(DOWNLOAD)`/`file(UPLOAD)` implementation | 2026-09-26 read, code as tagged | The only place the absence of a default `CURLOPT_TIMEOUT`/`CONNECTTIMEOUT` is provable |
| [`Modules/ExternalProject/shared_internal_commands.cmake@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/shared_internal_commands.cmake) and [`@v3.31.12`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Modules/ExternalProject/shared_internal_commands.cmake) | Primary source, TIMEOUT_ARGS/INACTIVITY_TIMEOUT_ARGS template substitution + the `ENCODING UTF-8` self-practice line | 2026-09-26 read, code as tagged | Where `ExternalProject_Add`'s documented options actually reach `file(DOWNLOAD)` |
| [`Modules/ExternalProject/download.cmake.in@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/download.cmake.in) | Primary source, generated download script template | 2026-09-26 read | Shows the literal `# no TIMEOUT` splice when unset |
| [`Modules/ExternalProject/gitclone.cmake.in@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/ExternalProject/gitclone.cmake.in) | Primary source, generated git-clone script template | 2026-09-26 read | Zero references to TIMEOUT/INACTIVITY_TIMEOUT — proves the git-path blind spot |
| [`Modules/FetchContent.cmake@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Modules/FetchContent.cmake) and [`@v3.31.12`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Modules/FetchContent.cmake) | Primary docs+source in one file | 2026-09-26 read | "any of the... options `ExternalProject_Add` understands" — the forwarding contract |
| [`Help/command/file.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/file.rst) and [`@v3.31.12`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Help/command/file.rst) | Normative command reference | 2026-09-26 read | Confirms option text is unchanged between the two floors |
| [`Help/policy/CMP0176.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/policy/CMP0176.rst) | Normative policy doc | 2026-09-26 read | States the OLD/AUTO vs NEW/UTF-8 split and the no-warning behavior |
| [`Help/command/execute_process.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/execute_process.rst) and [`@v3.31.12`](https://gitlab.kitware.com/cmake/cmake/-/blob/v3.31.12/Help/command/execute_process.rst) | Normative command reference | 2026-09-26 read | ENCODING option's three-way default history, in the tool's own words |
| [`Help/variable/CMAKE_TLS_VERIFY.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/variable/CMAKE_TLS_VERIFY.rst) and [`Help/variable/CMAKE_TLS_VERSION.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/variable/CMAKE_TLS_VERSION.rst) | Normative variable docs (v3.31.12 diffed identical) | 2026-09-26 read | Primary confirmation of the 3.31 TLS-default flip cited by the topic map |
| [`Help/manual/cmake-commands.7.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/manual/cmake-commands.7.rst) | Normative command taxonomy | 2026-09-26 read | The full, exact "Project Commands" name list CMK-MOD-20 cites |
| [`Source/cmake.cxx@v4.4.2:342-349`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmake.cxx#L342-349) | Primary source, command-registration role gating | 2026-09-26 read | Proves Project Commands are never registered under `Role::Script` |
| [`Source/cmCMakeLanguageCommand.cxx@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmCMakeLanguageCommand.cxx) and [`Source/cmMakefile.cxx@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmMakefile.cxx) | Primary source, `DEFER` failure mechanism | 2026-09-26 read | Traces why `DEFER` fails under `-P`/`include()`-from-script specifically |
| [`Help/command/cmake_language.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Help/command/cmake_language.rst) | Normative command reference | 2026-09-26 read | States `EXIT`'s opposite (script-mode-only) restriction in its own words |
| Measurement: corpus scan, 46-repo exemplar set, module-like files, `file(DOWNLOAD)`/`FetchContent_Declare`/`ExternalProject_Add` block-level TIMEOUT/INACTIVITY_TIMEOUT presence | Own measurement (Python block scan + manual doc-comment exclusion for Kitware/CMake) | 2026-09-26 | The 52-call, 2-TIMEOUT, 0-INACTIVITY_TIMEOUT count in §2 |
| Measurement: corpus scan, `ENCODING UTF-8`/`ENCODING "UTF-8"` across all 46 repos | Own measurement (grep + manual read of each hit) | 2026-09-26 | The 0-of-46-on-`execute_process` count in §4 |
| Measurement: `/home/mherwig/dev/find_ocx/ocx.cmake` direct read, lines 725-775 and 1400-1480 | Own measurement (live repo, not the corpus snapshot) | 2026-09-26 | Confirms the brief's five cited line numbers and their missing options |
| [gitlab.kitware.com/cmake/cmake issue 23443](https://gitlab.kitware.com/cmake/cmake/-/work_items/23443) "FetchContent stuck in gitlab-runner pipeline" | Issue tracker, argued/reported | opened 2022-04-21, closed 2022-04-23 | Live evidence of the git-clone timeout blind spot (CMK-MOD-18) |
| [gitlab.kitware.com/cmake/cmake issue 16109](https://gitlab.kitware.com/cmake/cmake/-/work_items/16109) "ExternalProject: Downloading of a file may hang indefinitely if a partial file exists" | Issue tracker, argued/reported | opened 2016-05-24 | Older, orthogonal download-hang report (partial-file resume, not timeout absence) |
| [gitlab.kitware.com/cmake/cmake issue 21132](https://gitlab.kitware.com/cmake/cmake/-/work_items/21132) "Tests: ExternalProject DownloadServer.py left hanging" | Issue tracker, argued/reported | opened 2020-08-26 | CMake's own test infra hitting the same class of hang, used only for texture |
| [gitlab.kitware.com/cmake/cmake issue 26262](https://gitlab.kitware.com/cmake/cmake/-/work_items/26262) "execute_process: Default ENCODING is AUTO instead of documented default NONE" | Issue tracker, primary (this is the CMP0176 root-cause report) | opened 2024-09-04, closed 2024-09-17 | Establishes that the 3.15-3.30 AUTO default was a bug, not a design choice |
| [gitlab.kitware.com/cmake/cmake issue 25561](https://gitlab.kitware.com/cmake/cmake/-/work_items/25561) "cmExecuteProcessCommandFixText() ... isspace() usage" | Issue tracker, argued/reported | opened 2024-01-05, closed 2024-01-08 | Historical texture; fixed well before both measured tags |
| [`grpc/grpc@0f8d72ed71:cmake/download_archive.cmake`](https://github.com/grpc/grpc/blob/0f8d72ed71/cmake/download_archive.cmake) | Exemplar corpus file | corpus snapshot 2026-09-26 | The one corpus exemplar that sets `TIMEOUT` |
| `.agents/research/cmake-topic-map.md` and `.agents/research/cmake-module-authoring.md` (this program's own prior waves) | Codified, already-decided | 2026-09-26 | Binding decisions this dive builds on rather than re-derives (floor 3.25, CMK-MOD-01..16 stable, map correction 2/H5) |

