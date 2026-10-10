# pbx-blocks.awk: SW-APPLE-15 and SW-APPLE-02, one summary line per XCBuildConfiguration block of a project.pbxproj,
# so a per-target isolation and language-mode choice can be read next to the target's role. A reading aid, not a gate.
# Usage: find . -name 'project.pbxproj' -print0 | xargs -0 -r awk -f pbx-blocks.awk
# Output, one line per block: ID NAME bundle=ID_OR_- ver=SWIFT_VERSION iso=SWIFT_DEFAULT_ACTOR_ISOLATION
#   appr=SWIFT_APPROACHABLE_CONCURRENCY strict=SWIFT_STRICT_CONCURRENCY ios=IPHONEOS_DEPLOYMENT_TARGET ("-" = not set in the block).
# Compare iso= with the target's role (bundle identifier suffix, product type): MainActor on the app target and on UI-only
# packages, nonisolated on data, network, persistence and model targets. A block inherits project-level values it does
# not set, so a "-" is not "unset in effect": read the project-level block too. The role judgement is a reading heuristic.
# Reads the Xcode 26 pbxproj layout (tab-indented blocks); unverified: read only for later layouts and for what Xcode
# does with an unlisted value. Watched on a planted project: one line per block with the values of that block (measured 2026-10-10).
/^\t\t[0-9A-F]+ \/\* .* \*\/ = \{$/ { id = $1; inblk = 0; ver = "-"; iso = "-"; app = "-"; strict = "-"; dep = "-"; pid = "-" }
/isa = XCBuildConfiguration;/ { inblk = 1 }
inblk && /SWIFT_VERSION = / { ver = $3; gsub(/;/, "", ver) }
inblk && /SWIFT_DEFAULT_ACTOR_ISOLATION = / { iso = $3; gsub(/;/, "", iso) }
inblk && /SWIFT_APPROACHABLE_CONCURRENCY = / { app = $3; gsub(/;/, "", app) }
inblk && /SWIFT_STRICT_CONCURRENCY = / { strict = $3; gsub(/;/, "", strict) }
inblk && /IPHONEOS_DEPLOYMENT_TARGET = / { dep = $3; gsub(/;/, "", dep) }
inblk && /PRODUCT_BUNDLE_IDENTIFIER = / { pid = $3; gsub(/;/, "", pid) }
inblk && /^\t\t\tname = / { nm = $3; gsub(/;/, "", nm) }
inblk && /^\t\t\};$/ { print id, nm, "bundle=" pid, "ver=" ver, "iso=" iso, "appr=" app, "strict=" strict, "ios=" dep; inblk = 0 }
