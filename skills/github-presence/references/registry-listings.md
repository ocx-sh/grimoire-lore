---
title: Registry listings
summary: The CH-GH rows for crates.io, PyPI, npm, the VS Code Marketplace, Homebrew, GHCR and Docker Hub manifests and the READMEs they reuse
---

# Registry listings

Owns the manifest fields and the README handling of each registry a package reaches: descriptions, keywords, categories, repository fields, README images and links, extension fields, Homebrew submission and image labels. Rows CH-GH-13 to CH-GH-22. Keyword and description wording belongs to marketing. These rows own limits and shape.

Contents: [Dates and versions](#dates-and-versions) · [Field table](#field-table) ·
[Rows](#rows) · [Check commands](#check-commands) · [Ask the owner](#ask-the-owner) ·
[What agents get wrong](#what-agents-get-wrong)

## Dates and versions

Limits live in `facts.md`, fetched 2026-11-27: crates.io [CR-F01] to [CR-F03], PyPI [PP-F01] to [PP-F04], npm [NP-F01] to [NP-F03], Marketplace [VS-F01] to [VS-F04], Homebrew [HB-F01] and [HB-F02], GHCR [GR-F01] and [GR-F02], Docker Hub [DH-F01].

- **Two dated events.** Azure DevOps global personal access tokens retire on 2026-12-01 [VS-F04]. After that date re-read the Marketplace publishing page for the federated-identity wording and replace the row. The crates.io category list is read live at lint time and never stored.
- **Documented gap, npm links.** npmjs.com answered curl and a real headless browser alike with a Cloudflare challenge on 2026-11-27, so the rendered page was never observed. The only evidence on whether npm rewrites relative links is its archived renderer source and one community comment, neither of which says whether a rewritten link points at the default branch or the release. That is why npm links are SHOULD. What an agent can lint is the README stored in the registry JSON, which CH-GH-18 does. If the challenge is gone (`curl -sI https://www.npmjs.com/package/typescript` shows no `cf-mitigated` header), measure a rendered page and re-grade npm links.
- **Pinned default:** the catalog's 140-character description budget (CH-GH-02) serves registry descriptions too.
- Re-check every row at its refresh date, and re-run the manifest check after any release of `cargo`, `npm`, `twine` or `vsce`.

Placeholders in commands: `R` is `OWNER/REPO`, `PKG` is a package name, `CRATE` a crate name, `PYPKG` a PyPI project name, `CHECKS` the skill's `checks/` directory.

## Field table

This table is the data that CH-GH-13 to CH-GH-21 lint. "Required here" means this catalog requires it, not that the registry does.

| Registry | Required to publish | Required here | Platform limits |
|---|---|---|---|
| crates.io | `description`, `license` or `license-file` | `repository`, `readme`; `keywords` and `categories` SHOULD; `homepage` only for a site distinct from the repository and docs | keywords at most 5, ASCII, at most 20 characters, start alphanumeric, `[A-Za-z0-9_+-]`; categories at most 5 exact slugs [CR-F01], [CR-F02] |
| PyPI | `name`, `version` | one-line `description`, `readme` with a content type, Project-URL labels Homepage, Source or Repository, Changelog, Documentation | label at most 32 characters; content types `text/plain`, `text/x-rst`, `text/markdown` [PP-F01], [PP-F02] |
| npm | `name`, `version` | `description`, `keywords` SHOULD, `repository` object, `homepage`, `bugs`, root `README.md` | name at most 214 characters including scope; README updates only on publish [NP-F01], [NP-F03] |
| VS Code Marketplace | `name`, `publisher`, `version`, `engines.vscode` | `displayName`, `description`, `categories`, `keywords`, PNG `icon`, `repository`, `bugs`, `homepage` | keywords at most 30; icon at least 128 x 128 (256 x 256 for Retina), not SVG; README and CHANGELOG images `https` [VS-F01] to [VS-F03] |
| Homebrew | `desc`, `homepage`, `license`, `url` with checksum, `test do` | `desc` per the guidelines | core gate 30 forks, 30 watchers or 75 stars; self-submission 90, 90 or 225; age 30 days [HB-F01], [HB-F02] |
| GHCR | none | OCI labels `source`, `description`, `licenses` | description 512 characters, licenses 256 [GR-F01], [GR-F02] |
| Docker Hub | none | short description, overview (only when the project publishes there) | short description 100 characters [DH-F01] |

## Rows

When a Verification cell names several checks, the row passes only when every one passes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-GH-13 | Give every package that reaches a registry a `description` that is present, one line and plain text, with no Markdown. A package reaches a registry when it is a crates.io crate whose `publish` is not `false` or `[]`, an npm package without `"private": true`, a PyPI project, or a Marketplace extension. | crates.io requires the field and wants plain text, PyPI calls it a one-line Summary, and `npm search` indexes it. Kept for the lint only: a one-line description is common practice, and crates.io rejects a missing one at publish. | `python3 -I "$CHECKS"/registry_manifest_check.py --root .` reports no CH-GH-13 finding. | SHOULD |
| CH-GH-14 | Give crates.io at most 5 keywords, each matching `^[A-Za-z0-9][A-Za-z0-9_+-]{0,19}$`, and at most 5 categories, each found in the live slug list at lint time. If the slug API fails, warn and do not block. | crates.io rejects a violation at publish [CR-F01], [CR-F02]. Agents invent slugs such as `cli`, `tools` and `developer-tools`. The real ones include `command-line-utilities`, `command-line-interface` and `development-tools` [CR-F03]. | `registry_manifest_check.py --root . --live-categories` reports no CH-GH-14 finding. On a non-JSON body it prints a note and continues. See block CH-GH-14 for the raw slug read. | MUST |
| CH-GH-15 | Fill `keywords` on every publishable crate (3 to 5) and npm package (3 to 8). Take the terms from the README's first paragraph. | A free discovery field. Absence is not an error: 2 of 5 top crates and 2 of 5 top npm packages leave it empty. Keyword choice is marketing's. | `registry_manifest_check.py --root .` reports no CH-GH-15 finding. | SHOULD |
| CH-GH-16 | Write npm `repository` as an object with `type` and `url`, plus `directory` for a package inside a monorepo. | npm rewrites the shorthand at publish with a warning. Without `directory`, registry links point at the repository root [NP-F02]. | `registry_manifest_check.py --root .` reports no CH-GH-16 finding, and `npm pkg fix --dry-run` reports no change. | MUST |
| CH-GH-17 | For PyPI, set `readme` so that `Description-Content-Type` is present. Run `twine check dist/*` before upload. Keep every Project-URL label at 32 characters or fewer with at least one recognised label (Homepage, Source or Repository, Changelog, Documentation). Never use `Home-page`. | Without a content type PyPI tries reStructuredText and can show raw source [PP-F02]. `Home-page` is deprecated in favour of Project-URL [PP-F03]. Labels are capped [PP-F01]. | `registry_manifest_check.py --root .` reports no CH-GH-17 finding, and `twine check dist/*` prints `Passed` in the release job. Built metadata has no `Home-page`. | MUST |
| CH-GH-18 | In any README a registry reuses, use absolute `https` URLs for every image on every registry (MUST) and for every link on PyPI (MUST). Use absolute links on npm, crates.io and the Marketplace too (SHOULD). | PyPI keeps relative paths and they break [PP-F04]. npm's link behaviour is undocumented and unmeasured (see Dates and versions), so absolute URLs are the only form that does not depend on a rewrite. crates.io and `vsce` rewrite relative links to `blob/HEAD`, which tracks the default branch and not the release. | `registry_manifest_check.py --root .` reports no CH-GH-18 finding. After an npm release run the two greps of block CH-GH-18 on the registry copy of the README, which is what npmjs.com renders. | MUST (images; PyPI links), SHOULD (other links) |
| CH-GH-19 | In a VS Code extension, use a PNG `icon` of at least 128 x 128 (256 x 256 preferred) and at most 30 `keywords`. Set `repository`, `bugs` and `homepage`. Use no SVG in the README or CHANGELOG except from a trusted badge host, and only `https` images. Publish with a federated credential (`vsce publish --azure-credential`), never with an Azure DevOps global personal access token. | `vsce` refuses SVG icons and user SVGs, and requires `https` images [VS-F03]. The icon and keyword limits are [VS-F01], [VS-F02]. Global tokens retire on 2026-12-01 [VS-F04]. Do not lint `categories` against the manifest page: the live `AI` category is missing from it. | `registry_manifest_check.py --root .` reports no CH-GH-19 finding. All five checks must pass: keywords, icon, SVG, credential and the three link fields. | MUST |
| CH-GH-20 | Distribute through a tap until the homebrew-core thresholds hold. Never submit to homebrew-core or claim eligibility earlier. Write a formula `desc` as one line with none of `modern`, `powerful`, `lightweight`, `beautiful`, `alternative to`, `replacement for`, no leading article and no formula name. | The policy sets the thresholds [HB-F01], and a rejected submission is public. The description guidelines ban marketing adjectives and comparisons [HB-F02]. The leading-article and formula-name clauses were not found on the guidelines page on 2026-11-27: `unverified` there, and `brew audit --new` is the authority for them. 4 of 5 popular formulae break the guidelines, so they are no precedent. | See block CH-GH-20: the repository meets one threshold and the age before any submission, the formula `desc` has no banned phrase, and `brew audit --new --formula` passes. | MUST |
| CH-GH-21 | Label every GHCR image with `org.opencontainers.image.source`, `.description` (512 characters or fewer) and `.licenses` (256 or fewer). If a Docker Hub repository exists, keep its short description to 100 characters or fewer. | `source` links the package to the repository, and the caps are documented [GR-F01], [GR-F02], [DH-F01]. | See block CH-GH-21: all three keys appear within the caps, and the Docker Hub length is 100 or fewer. | SHOULD |
| CH-GH-22 | After a README-only change to a published package, say which registry still shows the old README and that it updates at the next release. Never cut a release only to refresh a README without owner approval. | npm, PyPI and the extension package copy the README at publish [NP-F03], and crates.io stores one rendered README per version. A README edit reaches no registry by itself. | See block CH-GH-22: it prints `STALE-ON-REGISTRY` when the README differs from the one at the latest tag. Adjust the path for a package README. | SHOULD |

## Check commands

```sh
# CH-GH-14: every slug in the crate's categories must be listed here
curl -s -A registry-manifest-check 'https://crates.io/api/v1/categories?per_page=100' | jq -r '.categories[].slug'
# CH-GH-18: images, then links, on the registry copy of an npm README (scoped names: @scope%2fname)
curl -s https://registry.npmjs.org/"$PKG" | jq -r .readme | grep -nE '!\[[^]]*\]\((\./|\.\./|[^h#/][^):]*)\)|<img[^>]*src="(\./|\.\./|[^h"/])'
curl -s https://registry.npmjs.org/"$PKG" | jq -r .readme | grep -nE '\]\((\.\.?/[^)]*|[A-Za-z_][^):]*\.(md|txt)|LICENSE)\)'
# CH-GH-20: meets one threshold and the age
gh api repos/"$R" -q '[.stargazers_count,.forks_count,.subscribers_count,.created_at]'
grep -inE 'modern|powerful|lightweight|beautiful|alternative to|replacement for' FORMULA.rb
brew audit --new --formula NAME
# CH-GH-21: the three labels, then the Docker Hub length
docker buildx imagetools inspect ghcr.io/"$R":TAG --format '{{json .Manifest.Annotations}}'
curl -s https://hub.docker.com/v2/repositories/NS/NAME/ | jq '.description|length'
# CH-GH-22: TAG is the latest tag; prints STALE-ON-REGISTRY when the README changed since
git describe --tags --abbrev=0
git show "$TAG":README.md | cmp -s - README.md || echo STALE-ON-REGISTRY
```

Version agreement across the tag, the release title, the changelog heading and the registry version belongs to the `release-notes` skill. Read the published version from the registry, never from a checked-in manifest that CI bumps at publish time.

## Ask the owner

- The crates.io name for a CLI when the obvious names are held by other projects, whether to rename, and whether to publish to crates.io at all.
- A tap or homebrew-core, a Docker Hub namespace next to GHCR, and the timing of a verified Marketplace publisher (it needs months on the Marketplace and a DNS record).
- Cutting a patch release only to refresh a registry README.
- Removing a Marketplace extension, which deletes its statistics.
- To close the npm link gap: open the package page in a normal desktop browser and paste the `href` of one relative link and the `src` of one image from the developer tools. Those two values decide whether npm links can rise to MUST.

## What agents get wrong

1. Invents crates.io category slugs, uses six or more keywords, or lints Marketplace categories against the incomplete manifest page (CH-GH-14, CH-GH-19).
2. Cites "75 stars" as the only Homebrew bar, or submits to homebrew-core early (CH-GH-20).
3. Leaves `./docs/x.md` or `./assets/logo.svg` in a README that PyPI or npm reuses (CH-GH-18).
4. Assumes a README edit updates the registry page (CH-GH-22).
5. Reads the version from a checked-in manifest instead of the registry.
6. Publishes an extension with a stored personal access token (CH-GH-19).
