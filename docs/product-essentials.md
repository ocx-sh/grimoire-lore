# product-essentials

The product surface set in one install: the `marketing-quality` rule, and twelve
skills for the positioning record, release notes, measurement, review and the
public channels.

```sh
grim add ghcr.io/ocx-sh/lore/product-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `marketing-quality` | rule | A gate and 21 non-negotiables across six depth files: claims, trust claims, positioning, the first screen, voice and AI authorship, and discoverability. Loads on README, manifests, site config and release templates |
| `positioning-brief` | skill | Writes the one positioning record from repository text and leaves every unsourced field for the owner |
| `release-notes` | skill | The notes template, breaking-change and deprecation marking, one GitHub Release per tag, and the CI gate on the rendered body |
| `marketing-review` | skill | The explicit trigger: grades named marketing surfaces or a branch against the rule set |
| `marketing-measurement` | skill | Whether an analytics script may exist, the consent and privacy-statement checks, UTM format, metric definitions and A/B test pre-registration |
| `channel-publishing` | skill | The boundary every channel shares: an agent drafts and a named human posts. Label fields, the dated platform-facts registry and the `channels.yml` inventory |
| `github-presence` | skill | The GitHub card, organisation profile, community files, registry listings and reportable numbers |
| `linkedin-post` | skill | A person-led LinkedIn draft and its checks |
| `youtube-video` | skill | The YouTube upload manifest, its linter and the metadata limits |
| `microblog-post` | skill | Release posts for X, Bluesky, Mastodon and Threads with per-platform counters |
| `terminal-demo` | skill | A reproducible, legible, scrubbed terminal recording and its gate report |
| `community-post` | skill | Fact sheets and checks for Hacker News, Lobsters, Reddit and other developer venues |
| `launch-plan` | skill | One checked launch plan with venue admission, staffing and every human step marked |

`marketing-quality-reference` is not a member. It carries the depth files and
checks scripts, and the rule and two skills require it, so grim installs it with
them.

## Why one rule and twelve skills

`marketing-quality` loads on the files a pitch lives in. The first is a manifest,
because the measured top failure is a fresh tagline per file. One survey found 61
one-liners across 17 repositories.

Every other member is a procedure. Each runs once per release, per launch or per
post. Loaded on every edit, any of them would be dead weight in the context
budget.

The channel skills cite the marketing claims policy. So they never ship without
the rule. `channel-publishing` holds the boundary that the seven platform skills
require.

## Why two bundles and no umbrella

This bundle is separate from `ux-essentials`. A repository with a public pitch
and no interface needs this one only. A repository with both adds both. Nested
bundles are invalid, and a single union bundle would be a second name for two
sets.

## The premise

An agent writing a pitch invents what it cannot see: a number from memory, a
quote nobody gave, an audience nobody named. It writes paste-ready posts for
venues that ban generated content. This set closes that gap with records and
scripts.

A positioning record holds the one product sentence. A claims record holds the
evidence. Every channel skill stops short of posting, and a named human posts.

## What is not in it

Pricing pages and paid tiers, the layout of service-offer pages, and A/B results
of any copy pattern were not studied. Docs pages belong to `docs-quality`. The
rendered page's accessibility belongs to `ux-quality`. Building and signing
release artifacts belongs to the language release skills.

The bundle names its members without a tag. It says these thirteen belong
together. Your `grimoire.lock` is what freezes them.

## Siblings

- **`ux-essentials`**: the interface quality set for a repository with an
  interface.
- **`docs-quality`**: governs a page both sets read, and owns the `CHANGELOG.md`
  page format.
- **The packaging rules** (`rust-cargo`, `python-packaging`,
  `typescript-packaging`): own what a manifest declares. The marketing rule owns
  what its `description` and `keywords` say.
