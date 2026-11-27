# release-notes

Release-notes and GitHub Release standards for every release. A generator
writes the notes, so the work is in the commit footer, the template and the
gate on the rendered body.

```sh
grim add ghcr.io/ocx-sh/lore/release-notes
```

Reach for it when you cut or prepare a release, write or fix release notes or
a release body, or edit `cliff.toml` or `.github/release.yml`. Also use it to
mark a commit breaking, to deprecate a flag or setting, or to find tags with no
release.

## The procedure

A runbook takes a release from commit footer to published Release. It covers the
git-cliff or release-please template and the `BREAKING` line with its migration
line. It covers deprecation trailers and runtime warnings, and skip parsers for
internal scopes. The body is rendered in CI before the release exists.

There is one Release per stable tag, with the `Latest` flag and the prerelease
flag set on purpose. Asset names stay stable behind `/releases/latest/download`
links. Releases are drafted first and immutable. One version string holds across
tag, title, changelog and registry.

24 rows in the skill and its depth files hold the rationale and verification.
18 of them are MUST.

## The checks

`checks/notes_check.py` lints a rendered notes body and the `cliff.toml` that
renders it. `checks/release_gap.py` compares tags with Releases from saved `gh`
output. It reports tags with no Release, a wrong `Latest` flag, a wrong
prerelease flag and a documented download name that does not exist. Both exit 0
clean and carry `--self-test`.

## It stops before anything public

The skill prepares and verifies a release. It never pushes a tag or publishes
a Release, and it never publishes a licence, terms or pricing notice. It
drafts the notice and stops. A draft Release carries the notes and every asset,
or the owner gets the exact commands to make one.

## What it does not cover

Building, signing and uploading binaries belong to the language release
skills. The `CHANGELOG.md` page format belongs to `docs-quality`. Posting the
release on a social or community venue belongs to the channel skills.

## Siblings

`marketing-quality` routes here for MKT-REL and for edits to `cliff.toml` and
`.github/release.yml`. Bundled as `product-essentials`.
