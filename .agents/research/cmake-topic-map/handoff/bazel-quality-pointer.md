---
title: Proposed bazel-quality patch — pointer to the CMake side of the rules_foreign_cc seam
status: proposed, not applied (authoring notes §11)
date: 2026-09-26
---

# Proposed patch for `rules/bazel-quality/cpp.md`

The CMake program owns the wrapped project's side of the `rules_foreign_cc`
contract (`CMK-BZL` in `rules/cmake-build/bazel-seam.md`). The Bazel set owns
the wrapper side (`BZL-CC-22`, `-23`, `-24`, `-28`). No `BZL-CC` row is
authored, renumbered or reworded. The owner of `bazel-quality` applies this, or
declines it; the CMake set ships without it.

```diff
 ## Wrapped Foreign Builds

+The wrapped project's side of this contract is CMK-BZL in `cmake-build/bazel-seam.md`.
+
 Enumerate the wrapped builds first —
```

A version bump of `bazel-quality` is needed for the line to ship, because
`grim publish` skips an entry whose version is already in the registry.

## Note for the Bazel program's corpus (not a rule change)

The Common Package Specification side of the seam is empty on the Bazel side:
zero CPS hits in `bazel-contrib/rules_foreign_cc` (re-checked at `bb2f3e5d72`,
2026-09-26) and in the Bazel Central Registry. Evidence:
`cmake-dependency-seam/cps-verification.md` › Verdict and
`cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md`. The Bazel
program need not re-run that search.

Offered, not applied: `rules_foreign_cc` issues 329 and 1129 and the
validate-outputs note recorded in `cmake-bazel-seam.md` › Open questions.
