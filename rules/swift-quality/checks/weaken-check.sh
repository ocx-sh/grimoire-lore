#!/usr/bin/env bash
# weaken-check.sh: SW-CORE-01, lines a change adds that weaken a check and gate lines it removes.
# Usage: BASE=origin/main bash weaken-check.sh      (run from the repository root; BASE = the merge target)
# Output is the violation, one "FILE: +added line" or "FILE: -removed line" per hit. Every printed line needs a one-line
# written reason in the pull request. A printed config path (.swift-format, .swiftlint.yml, .swiftformat,
# .swift-format-ignore, .swift-version) is named for review. Every changed timeout-minutes line prints, both the old and
# the new value, so a reviewer sees whether it rose. `@preconcurrency import X` for a libc or OS shim (Glibc, Musl,
# WASILibc, Android, Bionic, Darwin, CRT, WinSDK, Dispatch, EmscriptenLibc) is the SW-CONC-10 allow-list and is skipped, with or without leading attributes (`@unsafe @preconcurrency import Glibc` under strictMemorySafety; measured 2026-10-10).
# Removed lines count only where a gate lives: non-Swift carriers (workflow, Makefile, Justfile, Rakefile and *.rake, *.mk, shell,
# TOML, Dockerfile*, Containerfile*, *.service, .env*) and the manifest (Package*.swift: a removed treatWarning,
# treatAllWarnings or strictMemorySafety). An extensionless script (ci/check) is not read: review it by eye.
# Exit: 0 and no output = nothing weakened; 1 = at least one line printed; 64 BASE unset; 66 BASE does not resolve or
#       has no merge base with HEAD (a shallow clone: fetch the merge target with full history, fetch-depth: 0 in CI).
# The diff is merge-base scoped (a branch behind main is not charged for main's edits) and sees committed,
# uncommitted and untracked files (`git add -N` marks new files, it stages no content). The installed rule set (`.claude/`, `.agents/`) is excluded from the diff:
# untracked, it printed its own pattern lines (16 lines on a fresh install, 0 after, measured 2026-10-10). Needs git 2.30 or newer.
# Watched red and green on planted changes (measured 2026-10-10): the original plant printed 8 lines and a clean tree 0;
# per SW-CORE-01 item, a timeout-minutes rise 10 to 45, `swiftLanguageModes: [.v6, .v5]`, `swiftLanguageVersions: [.v5]`
# and a libc `@preconcurrency import` chain (red, red, red, green). Any added `.v5` token prints, so a helper spelling
# (`swiftSettings(.v5)`, `languageMode: .v5`, a shared `let v5 = ...` array) is red too (measured 2026-10-10). A TSan suppression prints too: `TSAN_OPTIONS`,
# `suppressions=`, and a `race:` or `called_from_lib:` line in a `*.supp` file (red on each, measured 2026-10-10).
# Carrier set widened (measured 2026-10-10): a feature commit removing -warnings-as-errors and a sanitizer from rakelib/gate.rake,
# GNUmakefile, justfile and Rakefile.gate, and `.treatAllWarnings` and `.strictMemorySafety()` from Package@swift-6.4.swift,
# printed every removed line (nothing before); new Dockerfile.ci, Containerfile, .env and app.service with
# SWIFT_BACKTRACE=enable=no printed all four. SW-CORE-18 value forms (measured 2026-10-10 on 6.4: each cuts a crash from 54
# stderr lines to 13, same as enable=no): enable= no, false, off or 0 at any place in the comma list, a JSON key
# (`"SWIFT_BACKTRACE": "enable=no"`), and a devcontainer.json or *.json carrier print; a `#` or `//` comment line does not.
# 7 planted carriers: 2 printed before (and a comment-only line), 7 after and no comment line; `enable=yes` and `enable=nope` stay silent.
set -u
[ -n "${BASE:-}" ] || { echo 'weaken-check: set BASE to the merge target, for example origin/main' >&2; exit 64; }
git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || { echo "weaken-check: BASE does not resolve: $BASE" >&2; exit 66; }
git add -N . > /dev/null
raw=$(mktemp)
out=$(mktemp)
trap 'rm -f "$raw" "$out"' EXIT
# the carrier set: Swift and manifests, YAML and TOML, shell, Make, Just and Rake files, container, unit and env files by name
git diff -U0 --merge-base "$BASE" -- '*.swift' '*.yml' '*.yaml' '*.toml' '*.supp' '*.sh' '*.rake' '*.mk' '*.service' '*akefile*' '*[Jj]ustfile' '*Dockerfile*' '*Containerfile*' '.env' '.env.*' '*/.env' '*/.env.*' '*.env' '*.json' ':(exclude).claude' ':(exclude).agents' > "$raw" || { echo 'weaken-check: git diff failed' >&2; exit 66; }
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
awk '
  /^diff --git / { hdr = 1; next }
  /^@@/ { hdr = 0; next }
  hdr && /^--- / { if ($0 !~ /^--- \/dev\/null/) file = substr($0, 7); next }
  hdr && /^\+\+\+ / { if ($0 !~ /^\+\+\+ \/dev\/null/) file = substr($0, 7); next }
  hdr { next }
  /^\+[[:space:]]*(@[A-Za-z_]+[[:space:]]+)*@preconcurrency[[:space:]]+((public|package|internal|private|fileprivate)[[:space:]]+)?import[[:space:]]+((struct|class|enum|func|var|let|typealias|protocol)[[:space:]]+)?(Glibc|Musl|WASILibc|Android|Bionic|Darwin|CRT|WinSDK|Dispatch|EmscriptenLibc)([.[:space:]]|$)/ { next }
  /^\+.*(swiftLanguage(Modes|Versions): *\[[^]]*\.v5|\.v5([^_[:alnum:]]|$)|@preconcurrency|as: *\.?(ignored|warning)|-Wwarning|suppress-warnings|swiftlint:disable|swift-format-ignore|swiftformat:disable|try\? +await|\.disabled\(|XCTSkip|TSAN_OPTIONS|suppressions=)/ { print file ": " $0; next }
  /^\+.*SWIFT_BACKTRACE/ && $0 !~ /^\+[[:space:]]*(#|\/\/)/ && $0 ~ /SWIFT_BACKTRACE.*enable[=: "]*(no|false|off|0)([^[:alnum:]_]|$)/ { print file ": " $0 }
  /^\+[[:space:]]*(race|called_from_lib):/ { print file ": " $0; next }
  /^[-+][[:space:]]*timeout-minutes:/ { print file ": " $0; next }
  /^-.*(warnings-as-errors|Werror|sanitize|warn-long-expression|force-resolved-versions|--strict|treatWarning|treatAllWarnings|strictMemorySafety|diagnose-api-breaking-changes)/ && (file !~ /\.swift$/ || file ~ /(^|\/)Package[^\/]*\.swift$/) { print file ": " $0 }
' "$raw" > "$out"
git diff --name-only --merge-base "$BASE" -- .swift-format .swiftlint.yml .swiftformat .swift-format-ignore .swift-version >> "$out"
cat "$out"
[ ! -s "$out" ]
