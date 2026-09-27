---
title: Reference corpus — comment density and block length in human-written code
agent: orchestrator (script)
model: claude-opus-5-5
scope: 33 upstream repos (13 Rust, 6 Go, 6 Python, 4 TS, 2 Java, 2 Kotlin), prod scope, primary language only, at 2026 HEAD and at the last commit before 2022-01-01
method: >
  scratch/fetch-exemplars.sh (blob-less clones, SHAs in exemplars.tsv);
  scratch/measure-exemplars.sh runs rules/code-docs/checks/comment_census.py
  --group lang --scope all --format json at HEAD and snapshot into scratch/exemplars/;
  scratch/summarize.py writes scratch/exemplar-summary.json, the bands and the
  per-repo table. Repos under 1,000 prod code lines in their
  primary language are dropped (none were).
date_researched: 2026-09-27
---

# Reference corpus

Contents: [Headline numbers](#headline-numbers) · [Bands](#bands) ·
[Head versus pre-2022](#head-versus-pre-2022) · [Against the fleet](#against-the-fleet) ·
[Per repo](#per-repo) · [Caveats](#caveats)

## Headline numbers

- **Human-written apps sit at 0.12 (about 1:8.5), libraries at 0.27 (about 1:4).**
  Pre-2022 snapshot medians, 16 apps and 16 libraries. App IQR 0.056-0.199,
  library IQR 0.204-0.589.
- **The owner's 1:4-1:6 (0.17-0.25) is the upper quartile for apps and the
  median for libraries.** As a ceiling for application code it is generous,
  not tight.
- **Plain comments (the maintainer register) barely differ by kind:** median
  0.046 per code line in apps, 0.065 in libraries. The app/library gap is doc
  comments: 0.06 versus 0.21.
- **Block length is the sharpest signal.** Plain-comment blocks: p90 = 3 lines
  in both apps and libraries. Doc blocks: p90 = 6 lines in apps, 13.5 in
  libraries. Blocks over 10 lines: 0.6 per kLOC in apps, 5.9 in libraries.
- **No agent-era inflation in these repos.** HEAD minus snapshot ratio: 13 up,
  14 flat (within 0.02), 5 down. The two large rises (clap +0.33,
  kotlinx.coroutines +0.23) are deliberate API-doc investment in libraries.
  H3 holds: the pre-2022 baseline and HEAD agree for human-led projects.

## Bands

| Scope | n | Ratio median | IQR | Doc | Plain | Char ratio | Doc p90 | Plain p90 | Blocks >10 / kLOC |
|---|---|---|---|---|---|---|---|---|---|
| Apps, pre-2022 | 16 | 0.117 | 0.056-0.199 | 0.06 | 0.046 | 0.197 | 6.0 | 3.0 | 0.64 |
| Libraries, pre-2022 | 16 | 0.273 | 0.204-0.589 | 0.212 | 0.065 | 0.394 | 13.5 | 3.0 | 5.90 |
| Apps, HEAD | 17 | 0.125 | 0.091-0.189 | 0.069 | 0.053 | 0.232 | 6 | 4 | 0.75 |
| Libraries, HEAD | 16 | 0.332 | 0.205-0.570 | 0.282 | 0.065 | 0.451 | 15.0 | 3.5 | 7.45 |

## Head versus pre-2022

Largest rises: clap +0.332, kotlinx.coroutines +0.225, cobra +0.075,
deno std +0.075, jj +0.069. Largest falls: requests -0.109, bbolt -0.061,
ripgrep -0.039. Median shift about +0.005.

## Against the fleet

Same classifier, prod scope (frame table):

| Repo | Ratio | Doc | Plain | Doc p90 | Plain p90 | Blocks >10 / kLOC |
|---|---|---|---|---|---|---|
| ocx | 0.894 | 0.693 | 0.202 | 18 | 8 | 23.2 |
| grimoire | 0.650 | 0.488 | 0.161 | 12 | 6 | 13.3 |
| ocx-mirror | 0.673 | 0.546 | 0.127 | 14 | 6 | 16.5 |
| Human apps (median) | 0.117 | 0.060 | 0.046 | 6 | 3 | 0.64 |
| Human libraries (median) | 0.273 | 0.212 | 0.065 | 13.5 | 3 | 5.90 |

ocx's plain comments run about 4x the human rate and its doc comments about
11x the app rate (3x the library rate). Its plain-comment p90 is 8 lines
against 3. Blocks over 10 lines appear 36x as often as in human apps.

## Per repo

| Repo | Lang | Kind | At | Code | Ratio | Doc | Plain | Char ratio | Doc p90 | Plain p90 | Blocks >10 per kLOC |
|---|---|---|---|---|---|---|---|---|---|---|---|
| caddy | go | app | head | 46,532 | 0.301 | 0.201 | 0.1 | 0.595 | 7 | 4 | 3.09 |
| caddy | go | app | snap | 25,377 | 0.299 | 0.204 | 0.095 | 0.593 | 6 | 4 | 2.6 |
| cli | go | app | head | 92,848 | 0.073 | 0.04 | 0.033 | 0.16 | 4 | 3 | 0.5 |
| cli | go | app | snap | 35,970 | 0.027 | 0.013 | 0.014 | 0.062 | 3 | 2 | 0.14 |
| fzf | go | app | head | 22,702 | 0.079 | 0.023 | 0.056 | 0.174 | 4 | 4 | 0.31 |
| fzf | go | app | snap | 10,386 | 0.056 | 0.018 | 0.038 | 0.11 | 1 | 3 | 0.19 |
| restic | go | app | head | 36,925 | 0.123 | 0.069 | 0.053 | 0.262 | 3 | 2 | 0.35 |
| restic | go | app | snap | 27,501 | 0.121 | 0.081 | 0.04 | 0.257 | 3 | 2 | 0.36 |
| black | python | app | head | 97,195 | 0.042 | 0.028 | 0.014 | 0.046 | 12 | 4 | 0.72 |
| black | python | app | snap | 93,608 | 0.031 | 0.023 | 0.008 | 0.031 | 14 | 3 | 0.64 |
| pip | python | app | head | 23,478 | 0.267 | 0.16 | 0.107 | 0.385 | 10 | 4 | 3.58 |
| pip | python | app | snap | 18,592 | 0.281 | 0.173 | 0.108 | 0.392 | 10 | 4 | 3.82 |
| bat | rust | app | head | 8,361 | 0.103 | 0.051 | 0.051 | 0.197 | 4 | 3 | 0.6 |
| bat | rust | app | snap | 5,059 | 0.079 | 0.043 | 0.036 | 0.144 | 3 | 3 | 0.59 |
| cargo | rust | app | head | 94,072 | 0.217 | 0.146 | 0.071 | 0.432 | 7 | 5 | 2.84 |
| cargo | rust | app | snap | 52,455 | 0.216 | 0.122 | 0.094 | 0.45 | 7 | 6 | 2.61 |
| fd | rust | app | head | 3,125 | 0.114 | 0.06 | 0.054 | 0.246 | 3 | 3 | 0.32 |
| fd | rust | app | snap | 2,723 | 0.082 | 0.046 | 0.036 | 0.163 | 3 | 2 | 0.0 |
| helix | rust | app | head | 65,669 | 0.153 | 0.105 | 0.048 | 0.295 | 6 | 3 | 1.81 |
| helix | rust | app | snap | 21,941 | 0.147 | 0.073 | 0.073 | 0.267 | 7 | 3 | 1.96 |
| jj | rust | app | head | 84,828 | 0.125 | 0.075 | 0.05 | 0.232 | 4 | 4 | 0.75 |
| jj | rust | app | snap | 15,865 | 0.056 | 0.009 | 0.047 | 0.111 | 4 | 4 | 0.38 |
| just | rust | app | head | 18,370 | 0.021 | 0.016 | 0.005 | 0.04 | 2 | 3 | 0.16 |
| just | rust | app | snap | 8,093 | 0.041 | 0.032 | 0.009 | 0.077 | 2 | 2 | 0.37 |
| ripgrep | rust | app | head | 24,178 | 0.363 | 0.32 | 0.043 | 0.742 | 10 | 7 | 7.03 |
| ripgrep | rust | app | snap | 18,047 | 0.402 | 0.357 | 0.045 | 0.806 | 10 | 7 | 7.48 |
| rust-analyzer | rust | app | head | 248,677 | 0.126 | 0.057 | 0.068 | 0.212 | 6 | 5 | 2.13 |
| rust-analyzer | rust | app | snap | 114,688 | 0.14 | 0.07 | 0.069 | 0.229 | 7 | 5 | 2.39 |
| uv | rust | app | head | 191,227 | 0.16 | 0.107 | 0.053 | 0.347 | 5 | 3 | 1.29 |
| typescript-eslint | ts | app | head | 72,790 | 0.127 | 0.074 | 0.053 | 0.199 | 7 | 6 | 0.95 |
| typescript-eslint | ts | app | snap | 45,552 | 0.12 | 0.074 | 0.047 | 0.193 | 6 | 3 | 0.7 |
| vite | ts | app | head | 54,165 | 0.105 | 0.042 | 0.063 | 0.203 | 7 | 3 | 0.54 |
| vite | ts | app | snap | 20,665 | 0.114 | 0.049 | 0.065 | 0.201 | 7 | 3 | 0.63 |
| bbolt | go | lib | head | 7,616 | 0.212 | 0.114 | 0.098 | 0.449 | 4 | 2 | 0.92 |
| bbolt | go | lib | snap | 4,917 | 0.273 | 0.147 | 0.125 | 0.603 | 3 | 2 | 0.61 |
| cobra | go | lib | head | 4,291 | 0.194 | 0.119 | 0.075 | 0.416 | 4 | 3 | 0.47 |
| cobra | go | lib | snap | 5,847 | 0.119 | 0.071 | 0.048 | 0.187 | 3 | 3 | 0.17 |
| guava | java | lib | head | 216,732 | 0.501 | 0.436 | 0.065 | 0.826 | 14 | 5 | 11.06 |
| guava | java | lib | snap | 211,986 | 0.481 | 0.42 | 0.061 | 0.805 | 14 | 4 | 10.44 |
| retrofit | java | lib | head | 8,051 | 0.188 | 0.173 | 0.015 | 0.278 | 16 | 2 | 3.85 |
| retrofit | java | lib | snap | 7,583 | 0.182 | 0.169 | 0.013 | 0.263 | 16 | 2 | 3.96 |
| kotlinx.coroutines | kotlin | lib | head | 23,383 | 0.841 | 0.675 | 0.166 | 1.177 | 22 | 4 | 15.4 |
| kotlinx.coroutines | kotlin | lib | snap | 20,630 | 0.616 | 0.49 | 0.126 | 0.921 | 18 | 4 | 13.38 |
| okhttp | kotlin | lib | head | 43,765 | 0.202 | 0.166 | 0.036 | 0.37 | 9 | 2 | 2.79 |
| okhttp | kotlin | lib | snap | 31,034 | 0.231 | 0.189 | 0.042 | 0.387 | 9 | 2 | 3.13 |
| attrs | python | lib | head | 4,007 | 0.574 | 0.51 | 0.064 | 0.712 | 27 | 3 | 11.23 |
| attrs | python | lib | snap | 3,142 | 0.536 | 0.468 | 0.068 | 0.781 | 17 | 3 | 9.87 |
| flask | python | lib | head | 4,293 | 0.92 | 0.781 | 0.139 | 1.071 | 29 | 6 | 28.19 |
| flask | python | lib | snap | 3,770 | 0.925 | 0.756 | 0.17 | 1.117 | 27 | 7 | 24.14 |
| httpx | python | lib | head | 5,773 | 0.325 | 0.265 | 0.06 | 0.351 | 13 | 4 | 5.72 |
| httpx | python | lib | snap | 5,555 | 0.34 | 0.282 | 0.058 | 0.363 | 13 | 4 | 6.12 |
| requests | python | lib | head | 3,594 | 0.498 | 0.375 | 0.123 | 0.661 | 11 | 3 | 9.18 |
| requests | python | lib | snap | 2,748 | 0.607 | 0.452 | 0.155 | 0.767 | 11 | 3 | 10.92 |
| clap | rust | lib | head | 23,438 | 0.557 | 0.528 | 0.029 | 0.749 | 36 | 3 | 14.04 |
| clap | rust | lib | snap | 10,606 | 0.225 | 0.18 | 0.045 | 0.348 | 23 | 3 | 6.03 |
| rustls | rust | lib | head | 38,553 | 0.236 | 0.195 | 0.041 | 0.452 | 7 | 4 | 2.96 |
| rustls | rust | lib | snap | 15,195 | 0.197 | 0.162 | 0.035 | 0.368 | 7 | 3 | 2.44 |
| serde | rust | lib | head | 19,228 | 0.244 | 0.198 | 0.046 | 0.367 | 29 | 4 | 4.78 |
| serde | rust | lib | snap | 19,273 | 0.272 | 0.236 | 0.036 | 0.4 | 30 | 3 | 5.76 |
| tokio | rust | lib | head | 54,029 | 1.02 | 0.926 | 0.094 | 1.551 | 37 | 4 | 22.01 |
| tokio | rust | lib | snap | 34,113 | 1.026 | 0.936 | 0.09 | 1.55 | 36 | 4 | 23.25 |
| std | ts | lib | head | 124,733 | 0.338 | 0.3 | 0.038 | 0.418 | 29 | 3 | 9.46 |
| std | ts | lib | snap | 116,702 | 0.263 | 0.044 | 0.219 | 0.329 | 11 | 7 | 2.69 |
| zod | ts | lib | head | 31,120 | 0.12 | 0.025 | 0.095 | 0.204 | 4 | 4 | 0.74 |
| zod | ts | lib | snap | 7,402 | 0.099 | 0.004 | 0.094 | 0.171 | 4 | 9 | 0.68 |

## Caveats

- Kind (app or library) is assigned per repository. Mixed repos (ripgrep ships
  libraries inside an app workspace; cargo and uv expose library crates) sit
  under their dominant role.
- deno std at the snapshot counts most doc text as plain comments (doc 0.044,
  plain 0.219), a classifier gap for that tree's comment style, not a finding.
- Vendored trees (vendor/, _vendor/, third_party/) are skipped. pip's first
  measurement included `src/pip/_vendor/` (human-sample.md caught it); the
  numbers here are after the fix.
- Licence headers, tool directives and clap/schemars/pydantic interface docs
  are excluded from every ratio here.
- The snapshot is a date cut, not proof of human authorship; Copilot's
  technical preview began June 2021, so a few late-2021 lines may be assisted.
