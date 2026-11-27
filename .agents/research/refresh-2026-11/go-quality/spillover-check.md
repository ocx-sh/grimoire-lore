---
title: go-quality spillover check from go-modules
target: go-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/golangci/golangci-lint/releases/tag/v2.15.0
  - https://github.com/dominikh/go-tools/releases/tag/2026.2.2
  - https://raw.githubusercontent.com/golangci/golangci-lint/v2.15.0/go.mod
---

# Spillover check: go-quality

## Item 1 (from go-modules): move the golangci-lint and staticcheck pins to v2.15.0 and 2026.2.2

Item text: "rules/go-quality.md lines 56 and 165 and every go-quality-reference header pin golangci-lint v2.14.0 and staticcheck 2026.2.1; move them to v2.15.0 and 2026.2.2 in the same change as GO-GATE-08, or the sets contradict each other".

Verdict: confirmed by primary source.

Evidence (originating pair: .agents/research/refresh-2026-11/go-modules.md and go-modules/golangci-lint-staticcheck-gosec.md):
- https://github.com/golangci/golangci-lint/releases/tag/v2.15.0 is a first-party release page, published 16 Oct (the page shows no year; the go-modules artifact records 2026-10-16). Its changelog bumps honnef.co/go/tools from 0.8.1 to 0.8.2. The v2.15.0 go.mod (raw URL above) requires honnef.co/go/tools v0.8.2, which is the 2026.2.2 line.
- https://github.com/dominikh/go-tools/releases/tag/2026.2.2 is a first-party release page, published 12 Oct (no year shown; the go-modules artifact records 2026-10-12). It states: "Staticcheck now supports the updated export data format used by Go 1.27.2."
- The mapping of 0.8.2 to 2026.2.2 is taken from the go-modules artifact, not from the release pages themselves.

Affected text in the target:
- rules/go-quality.md line 56-57: "v2.14.0, govulncheck v1.8.0 and gopls v0.23.0, each installed at that exact" (the sentence begins "**Pinned** tool versions, measured 2026-09-26: Go 1.27.1, golangci-lint" on line 55).
- rules/go-quality.md line 165: "golangci-lint v2.14.0 with its three files, and the `check` target."
- rules/go-quality.md names no staticcheck version.
- Reference headers pinning v2.14.0: testing.md:29, errors.md:26, io.md:29, api-design.md:31, cli-contract.md:14, network.md:8 and :28, concurrency.md:27, security.md:8 and :35, language.md:25. Pinning staticcheck 2026.2.1: errors.md:27, api-design.md:32, cli-contract.md:14, concurrency.md:27, language.md:25-26.
- Further in-body uses of v2.14.0 or 2026.2.1: errors.md:46, :86, :87, :184; network.md:44; concurrency.md:131; security.md:48; language.md:56 and :152.

Important nuance: nearly all of these are "Measured 2026-09-26 against ... golangci-lint v2.14.0" provenance statements. The go-modules artifact itself says the runtime probes were not re-run on v2.15.0 and that headers should record that behaviour claims were measured on the earlier versions. A blind find-and-replace to v2.15.0 would turn those measurement statements into false ones. Only the pin statements (rules/go-quality.md lines 56 and 165, and the "Binds to" lines such as network.md:8 and security.md:8) should move.

Smallest change that makes the target true on 2026-11-27:
- rules/go-quality.md line 56: change "v2.14.0" to "v2.15.0" in the pin sentence, and add staticcheck 2026.2.2 if the rule is meant to name it. Line 165: change "golangci-lint v2.14.0" to "golangci-lint v2.15.0".
- In each reference header, move the "Binds to" or pin versions to Go 1.27.4 (per go-modules), golangci-lint v2.15.0 and staticcheck 2026.2.2, and keep "measured 2026-09-26 on golangci-lint v2.14.0 and staticcheck 2026.2.1" as provenance. Leave in-body "(golangci-lint v2.14.0, measured 2026-09-26)" evidence as it is.
- Apply together with the go-modules GO-GATE-08 change, so the pin sets agree.
