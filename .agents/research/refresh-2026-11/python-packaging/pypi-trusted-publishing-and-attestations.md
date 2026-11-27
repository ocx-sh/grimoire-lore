---
title: PyPI Trusted Publishing, gh-action-pypi-publish and token policy delta for PY-PKG-10
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 8
---

# Delta: PY-PKG-10 (Trusted Publishing)

Scope: only what changed between 2026-08-23 and 2026-11-27. Everything not listed as changed stays as it is.

## Summary

- The PY-PKG-10 rule text is still correct. No PyPI policy change in the window raises its severity.
- The action has one new release, v1.14.3 (20 Oct 2026), a security release. Inputs did not change.
- Attestations question is settled: they are on by default under Trusted Publishing, no opt-in needed (the README says it is "now on by default"). Disable with `attestations: false`.
- The two greps are incomplete for `uv publish`: it reads `UV_PUBLISH_TOKEN` and `UV_PUBLISH_PASSWORD`. Propose a third grep.

## Findings by claim at risk

1. "Publishing authenticates through Trusted Publishing (OIDC), never a long-lived token": **unchanged.** The Trusted Publishers page still describes OIDC short-lived tokens. No blog post in the window concerns API tokens, 2FA or trusted publishers. The eight posts after 2026-08-23 (latest 2026-11-18, "Stricter checks for uploaded distributions") are about metadata, limits, email reputation, docs move and project pages. Source: [PyPI blog](https://blog.pypi.org/), [Trusted publishers](https://docs.pypi.org/trusted-publishers/).
2. Grep `-e PYPI_TOKEN`: **unchanged for the action; incomplete overall** (see candidate 1).
3. Grep `-e password:`: **unchanged.** `password` is still the action's token input; the README says supplying it switches off secretless Trusted Publishing. The `user` input (default `__token__`) exists but carries no secret. Source: [action README](https://raw.githubusercontent.com/pypa/gh-action-pypi-publish/release/v1/README.md).
4. "OIDC mints a 15-minute token": **unchanged.** The page says the token is "only valid for 15 minutes from time of creation". Source: [Trusted publishers](https://docs.pypi.org/trusted-publishers/).
5. "`id-token: write` plus an `environment:` is the posture": **unchanged.** README calls `id-token: write` mandatory, scoped to the publishing job only, with the build in a separate job; its example uses an `environment: pypi`. Note: the page does not make the environment mandatory, it is a recommended hardening. Source: action README.
6. "Fleet pins v1.14.2 by digest": **changed.** Old text: v1.14.2 (29 Jul 2026, Twine v7, newer pypi-attestations and sigstore). New fact: v1.14.3 released 20 Oct 2026, commit `7245906fb61fa33a13554f9d5fb856fe61758086`, fixes GHSA-5xjx-3w67-w9x9 and makes the action's dependency tree hash-checked; release is immutable. Source: [v1.14.3](https://github.com/pypa/gh-action-pypi-publish/releases/tag/v1.14.3), [releases](https://github.com/pypa/gh-action-pypi-publish/releases). The year of "20 Oct" is not printed on the page; it is inferred from the ordering after v1.14.2 (29 Jul 2026) and the 2026 footer.
7. Open question, attestations: **resolved.** The README says attestation generation is "now on by default for all projects using Trusted Publishing", signed with Sigstore from the workflow's OIDC identity; `attestations: false` disables it. PyPI docs: "attestations are generated and uploaded automatically by default, with no additional configuration necessary." The README stopped calling the feature experimental in v1.13.0 (Sep 2025), so v1.14.2 and v1.14.3 both generate them. Works only against PyPI or TestPyPI. Sources: action README; [producing attestations](https://docs.pypi.org/attestations/producing-attestations/); releases page.
8. Action inputs: **unchanged in the window.** Last input default change was v1.14.0 (Apr 2026: `verbose` and `print-hash` default on), before the window.
9. `uv publish`: Trusted Publishing needs no credentials on GitHub Actions. Token paths: `--token` / `UV_PUBLISH_TOKEN`, and `UV_PUBLISH_USERNAME` / `UV_PUBLISH_PASSWORD` (PyPI rejects username/password, so these only matter for other registries or a literal token). `uv publish` does not generate attestations; it only uploads ones created separately. I could not confirm whether this changed in the window; the page as fetched states it as current. Source: [uv packaging guide](https://docs.astral.sh/uv/guides/package/).

## Normative guidance candidates

1. Add a third grep: `-e UV_PUBLISH_TOKEN -e UV_PUBLISH_PASSWORD -e '--token'` is too broad; use `-e UV_PUBLISH_` as the minimal form. Rationale: `uv publish` carries a long-lived token through an env name the two existing greps miss. Verification: `git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -H -n -E -e UV_PUBLISH_ --`; empty output passes. Caveat: `UV_PUBLISH_URL` also matches; a hit needs reading, not automatic failure. Consider `-e 'UV_PUBLISH_(TOKEN|PASSWORD)'` to avoid it.
2. Update the corpus pin from v1.14.2 to v1.14.3 (commit `7245906fb61fa33a13554f9d5fb856fe61758086`). Rationale: security fix. Verification: `grep -rn 'pypa/gh-action-pypi-publish@' .github/workflows` shows the 40-char SHA above with a `# v1.14.3` comment.
3. Optional, CONSIDER: require `environment:` on the publishing job. Rationale: README example and hardening. Verification: reading heuristic, the job containing `pypa/gh-action-pypi-publish` has an `environment:` key. Not in the current rule; do not add it unless the owner wants it.
4. No severity change. SHOULD stays: no mandatory-2FA, token-expiry or token-deprecation policy was announced in the window.

## AI-agent angle

- Models trained earlier write `with: password: ${{ secrets.PYPI_API_TOKEN }}`; both greps catch it.
- Models writing `uv publish` set `UV_PUBLISH_TOKEN: ${{ secrets.PYPI_TOKEN }}`; the `PYPI_TOKEN` grep catches only that secret name, not other names. The new grep catches it.
- Models add `attestations: true` as if it were an opt-in; it is redundant, not wrong.

## Contested / evolving

- Whether to count `environment:` as required: README treats it as example practice, not a requirement.
- `uv publish` attestation generation: documented as absent as of this fetch; may change.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://docs.pypi.org/trusted-publishers/ | Trusted Publishing concept page | current, no dates | 15-minute token claim |
| https://docs.pypi.org/attestations/producing-attestations/ | Attestation production guide | current | default-on statement |
| https://blog.pypi.org/ | PyPI blog index | posts to 2026-11-18 | confirms no token/2FA policy post |
| https://github.com/pypa/gh-action-pypi-publish/releases | Action releases | v1.14.3 20 Oct 2026 | current release |
| https://github.com/pypa/gh-action-pypi-publish/releases/tag/v1.14.3 | Release notes | 20 Oct 2026 | SHA, advisory |
| https://raw.githubusercontent.com/pypa/gh-action-pypi-publish/release/v1/README.md | Action README | current | inputs, attestations default |
| https://docs.astral.sh/uv/guides/package/ | uv publishing guide | current | UV_PUBLISH_* env names |

Only 7 distinct URLs (8 fetches, one repeated host family); the 12-source minimum of the full contract does not apply to a delta.
