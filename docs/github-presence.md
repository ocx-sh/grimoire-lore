# github-presence

A checked procedure for a project's GitHub card, organisation profile,
community health files, registry listings and reportable numbers. A visitor
meets a project there first, and the counters are the only usage numbers most
projects have.

```sh
grim add ghcr.io/ocx-sh/lore/github-presence
```

Reach for it to set a repository description or topics, add a social preview
image, or edit package keywords, description or repository fields. Also use it
to set up Discussions or `SUPPORT.md`, submit to homebrew-core, or quote a
GitHub or download number.

## What it covers

The repository About line, homepage and topics. The organisation profile README.
Community files such as Discussions, issue-chooser routes, `SUPPORT.md` and
code-of-conduct contacts.

Listings on crates.io, npm, PyPI, the VS Code Marketplace, Homebrew taps and
GHCR image labels. The README images and links a registry reuses. How to report
stars, downloads, clones and traffic without inflating them.

## It reports first and writes only what the owner approves

The skill prints every proposed write with its before and after values, marked
approved or pending. It never creates a token. A topics write replaces the
whole list, so it sends the old names with the new ones.

## What agents get wrong here

The skill ranks the failures. An agent treats a number as a result, calling
downloads "users". It invents or misremembers a platform limit.

It writes without approval or destructively. It reads a version from the wrong
source of truth. It trusts a proxy signal such as a green community-profile
percentage. It does an owner's job, such as creating the traffic token.

Every platform limit sits in one dated `references/facts.md`. 30 rows in its
reference files hold the rationale and verification. 21 of them are MUST. Three
scripts check a repository card, a registry manifest and community files. Each
carries `--self-test`.

## What it does not cover

Release notes and the GitHub Release object belong to `release-notes`. Posts on
social or community venues belong to the channel skills.

## Siblings

It requires `channel-publishing`, which installs with it. `marketing-measurement`
owns analytics. Bundled as `product-essentials`.
