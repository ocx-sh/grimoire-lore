---
title: "Bluesky native automated-account label in 2026"
program: product
topic: channel-agent-boundary
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
---

# Did Bluesky ship a native automated-account label in 2026?

## Answer

Yes, as an app feature, but not as a new label. On 2026-03-10 Bluesky merged an "automated account" badge and a settings toggle into its official app (release 1.119.0, 2026-03-17). The toggle writes the same `bot` self-label that the atproto tutorial teaches, so the label's wire format did not change. The lexicon and the labels guide then added `bot` as a known global label value. No primary page says Bluesky requires the label, and no client code filters or hides on it. A third-party post (astral100, 2026-04-02) says "users can filter them". The app source does not back that.

All commands below ran on 2026-11-27 (UTC, 13:0x to 13:2x) against the clones at `~/.cache/research-lang/exemplars/product/wave2/q3/` (`sa` = social-app at bdeb25e, committed 2026-11-26; `ap` = atproto at dce608b, committed 2026-11-27) and the live pages.

## Findings

1. **The feature is real and dated.** Pull request [social-app#10008](https://github.com/bluesky-social/social-app/pull/10008), "[APP-1928] add bot/automated account badge and self-labeling settings". Command: `gh pr view 10008 -R bluesky-social/social-app --json mergedAt,body -q '.mergedAt, (.body|split("\n")[]|select(test("self label|filtering")))'`. Output:

   ```
   2026-03-10T18:28:49Z
   This implementation is not a bi-directional bot <-> owner link. It's simply a self label, which will allow for filtering and hiding content, like any other label. This is an initial pass at this, more work to come.
   ```

   The PR body also says "Adds a robot icon badge next to account names that have self-labeled as automated/bot accounts" and the test plan path is "Settings > Account > Automation label" (read 2026-11-27).

2. **It shipped in a tagged release.** Commands and output:

   ```
   $ gh api repos/bluesky-social/social-app/compare/2bd981165...1.119.0 -q .status
   ahead
   $ gh api repos/bluesky-social/social-app/compare/2bd981165...1.118.0 -q .status
   behind
   $ gh api repos/bluesky-social/social-app/releases/tags/1.119.0 -q .published_at
   2026-03-17T21:16:38Z
   $ gh api repos/bluesky-social/social-app/releases/tags/1.119.0 -q .body | grep -n -i 'automat'
   10:* [APP-1928] add bot/automated account badge and self-labeling settings by @vineyardbovines in https://github.com/bluesky-social/social-app/pull/10008
   $ gh api repos/bluesky-social/social-app/releases/tags/1.119.0 -q .body | grep -c 'APP-1928'
   1
   $ gh api repos/bluesky-social/social-app/releases/tags/1.118.0 -q .body | grep -c 'APP-1928'
   0
   ```

   "ahead" means the tag contains the PR's merge commit `2bd981165`; "behind" for 1.118.0 means it does not. Release page: [1.119.0](https://github.com/bluesky-social/social-app/releases/tag/1.119.0), published 2026-03-17.

3. **The label is the existing `bot` self-label.** `AutomationLabelSettings.tsx` (in `sa/src/screens/Settings/`) pushes `{val: 'bot'}` into the profile's self-labels, and the badge test is `l.val === 'bot' && l.src === profile.did`. Command: `cd sa && grep -rIn -w "'bot'" src`. Output:

   ```
   src/lib/moderation.ts:72:      !(label.val === 'bot' && label.src === currentAccountDid),
   src/view/screens/Storybook/ProfileBadges.tsx:41:            val: 'bot',
   src/view/screens/Storybook/ProfileBadges.tsx:60:  bot: createProfile('bot', {bot: true}),
   src/components/BotBadge.tsx:18:    profile.labels?.some(l => l.val === 'bot' && l.src === profile.did) ?? false
   src/screens/Settings/AutomationLabelSettings.tsx:43:    profile?.labels?.some(l => l.val === 'bot' && l.src === profile.did) ??
   src/screens/Settings/AutomationLabelSettings.tsx:65:          const hasLabel = labels.values.some(l => l.val === 'bot')
   src/screens/Settings/AutomationLabelSettings.tsx:68:            labels.values = labels.values.filter(l => l.val !== 'bot')
   src/screens/Settings/AutomationLabelSettings.tsx:71:            labels.values.push({val: 'bot'})
   src/screens/Settings/AutomationLabelSettings.tsx:84:          const exists = !!profile.labels?.some(l => l.val === 'bot')
   ```

   The check `l.src === profile.did` is the same test as `cab-02`, so `cab-02` stays valid for accounts labelled through the app.

4. **No client filter exists.** The PR's "will allow for filtering and hiding" (finding 1) is the author's intent, not shipped behaviour. Command: `cd sa && grep -rIn -w -i "bot" src/state/queries src/lib/moderation* src/screens/Moderation`. Output (the whole output, exit 0):

   ```
   src/lib/moderation.ts:63: * with `!`) and the user's own "bot" self-label.
   src/lib/moderation.ts:72:      !(label.val === 'bot' && label.src === currentAccountDid),
   ```

   Those two lines are `filterUserFacingLabels`: it removes the account's own `bot` label from the label list the account owner sees. It adds no moderation preference and no hide or warn setting for others' bot labels. (Without `-w`, the pattern matches the word "both" and prints about 18 unrelated lines; the first run of this check made that mistake.) The sentence "users can filter them" is in [astral100, "The Label Sorts for Good Faith, Not Risk"](https://astral100.leaflet.pub/3mijhh4wyze2u), published 2026-04-02T14:52:41Z (`datePublished` in the page's metadata, fetched 2026-11-27), independent, by an AI-agent operator. The exact passage: "Bluesky shipped an automation label in March 2026. Agents can now mark themselves as automated, and users can filter them." Source code at bdeb25e contradicts it. Bluesky's own wording says what the code says: the label "will allow for filtering and hiding content" (future tense).

5. **The lexicon and docs were updated.** [atproto#4777](https://github.com/bluesky-social/atproto/pull/4777), "lexicons: add 'bot' wellKnown label value", merged 2026-03-19T22:42:27Z, added `"bot"` to `knownValues` of `com.atproto.label.defs#labelValue`. Its body: "This `knownValues` list isn't binding, but it can help with dev tooling and understanding." Check on the clone (`ap`, dce608b):

   ```
   $ grep -n -B8 -A4 '"bot"' ap/lexicons/com/atproto/label/defs.json | sed -n 1,30p
   141-      "knownValues": [
   142-        "!hide",
   143-        "!warn",
   144-        "!no-unauthenticated",
   145-        "porn",
   146-        "sexual",
   147-        "nudity",
   148-        "graphic-media",
   149:        "bot"
   150-      ]
   $ python3 -I -c "import json;d=json.load(open('ap/lexicons/com/atproto/label/defs.json'));print(d['defs']['labelValue']['knownValues'])"
   ['!hide', '!warn', '!no-unauthenticated', 'porn', 'sexual', 'nudity', 'graphic-media', 'bot']
   ```

   The [labels guide](https://atproto.com/guides/labels) (page undated, fetched 2026-11-27T13:11Z) says: "bot which indicates than an account is automated" and "only label values which are defined globally can be used as self-labels". The docs change is [bsky-docs#404](https://github.com/bluesky-social/bsky-docs/pull/404), merged 2026-03-19.

6. **The tutorial says "best practice"; ToS and guidelines are silent.** Fetch commands (2026-11-27T13:11Z, all HTTP 200):

   ```
   $ curl -sL -A 'research-client' -o <file> -w "%{url_effective} %{http_code} %{size_download}\n" <url>
   https://bsky.social/about/support/tos 200 63540
   https://bsky.social/about/support/community-guidelines 200 45134
   https://atproto.com/guides/bot-tutorial 200 247531
   https://atproto.com/guides/labels 200 104956
   ```

   The search ran on tag-stripped text (script blocks removed, whitespace collapsed) with the pattern `automated account|bot account|automation label|self-label|\bbots?\b`, case-insensitive:

   ```
   tos:                  0 matches
   community-guidelines: 0 matches
   ```

   The [bot tutorial](https://atproto.com/guides/bot-tutorial) (undated, fetched 2026-11-27) matches `best practice` once: "Part 3: Label as a Bot As a best practice, bot accounts should identify themselves by adding a self-label to their profile. This helps users and moderation tools recognize automated accounts." No "required" wording. The only mention of bots in Bluesky's prose that I found is the [2025 transparency report](https://bsky.social/about/blog/01-29-2026-transparency-report-2025) (2026-01-29), which counts "bot accounts" reports as "automated inauthentic behavior": a report category, not a label rule. Terms checked: [ToS](https://bsky.social/about/support/tos) and [community guidelines](https://bsky.social/about/support/community-guidelines), both undated on the page.

7. **Live check of the wire shape (2026-11-27, response `Date: Fri, 27 Nov 2026 13:11:22 GMT`).**

   ```
   $ curl -s 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=orfnewsbot.bsky.social' | python3 -I -c "...print(d['labels'])"
   [{'src': 'did:plc:4tbrrddsqruas4qi25h427gn', 'uri': 'at://did:plc:4tbrrddsqruas4qi25h427gn/app.bsky.actor.profile/self', 'cid': 'bafyreicgzz3zytdz37mqr3wjhzjmypgzgsbuj7rmvge44z5j2obdgalr7e', 'val': 'bot', 'cts': '1970-01-01T00:00:00.000Z'}]
   $ curl -s 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=bsky.app' | python3 -I -c "...print(d.get('labels'))"
   []
   ```

   `cts` is the epoch: self-labels carry no creation time, so an agent cannot date a label from the API.

8. **Adoption and enforcement claims are single-author, unverified.** [astral100, "Three Bots, Three Failures: Why Labels Don't Scale"](https://astral100.leaflet.pub/3mmqbkr2hrg2r), published 2026-05-26T05:36:44Z (page metadata), independent: "The bot labeling system on Bluesky is a genuine achievement. It's opt-in, visible, and roughly 59% of agents I've tracked use it." The sample is the author's own tracked set, so it is not a platform figure and never a threshold (CH-CORE-15). The suspension claim sits in the 2026-04-02 post ([astral100, "The Label Sorts for Good Faith, Not Risk"](https://astral100.leaflet.pub/3mijhh4wyze2u)): "At ATmosphereConf 2026, Amebo — a clearly labeled, open-source, Claude-powered conference Q&A bot — was suspended overnight by Bluesky moderation on its first day of operation. No explanation was given." It is one anecdote, by an independent author, with no Bluesky statement. I did not verify it and rate it unusable as a rule input.

## Effect on the ruleset

| Rule | Effect | Text and verification |
|---|---|---|
| CH-CORE-02, gate `bs-label` | **change (rationale only; one verification added)** | Append to the rationale: "The official app exposes the same `bot` self-label as Settings > Account > Automation label since 1.119.0 (2026-03-17) [BS-F03], so an owner can set it without code. Bluesky ships no viewer filter for it (checked 2026-11-27 at social-app bdeb25e)." Severity unchanged. Verification item (6), new: `gh api repos/bluesky-social/social-app/releases/tags/1.119.0 -q .body \| grep -c 'APP-1928'` prints `1`, and `sh refetch.sh facts/bluesky.md` (`cab-14`) prints no `CHANGED BS-F03` or `CHANGED BS-F04` line. Both ran 2026-11-27: the first printed `1` (and `0` against 1.118.0), the second printed nothing. A planted copy of the rows with changed `expect` text printed `CHANGED BS-F03` and `CHANGED BS-F04`. Items (1) to (5) are unchanged. |
| CH-CORE-06 (Bluesky has no AI label) | **confirm** | No AI-content label exists on Bluesky: the `labelValue` known values are exactly `!hide, !warn, !no-unauthenticated, porn, sexual, nudity, graphic-media, bot` (finding 5, command and output shown). The new feature labels the account, not the content. Verification: the python one-liner in finding 5 prints a list with no AI value. |
| CH-CORE-11 | **confirm** | Text unchanged. The new rows below follow it, and the test is the registry lint plus the re-fetch. |
| Registry BS-F01 | **confirm** | Value stays "best practice"; its `expect` still matches the live tutorial (`cab-14` printed nothing for it). |
| Registry, two new rows | **new rows** | BS-F03 and BS-F04 below. |

New registry rows. The first draft's BS-F04 `expect` (`bot which indicates than an account is automated`) was wrong: the page has `<code>bot</code> which`, and tag stripping leaves two spaces, so `cab-14` printed `CHANGED BS-F04` on the live page. The `expect` below is the fixed one.

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| BS-F03 | bluesky | official app has an Automation label toggle that writes the `bot` self-label | app 1.119.0, 2026-03-17 | https://github.com/bluesky-social/social-app/pull/10008 | 2026-03-10 | 2026-11-27 | 90 | platform | add bot/automated account badge and self-labeling settings |
| BS-F04 | bluesky | `bot` is a known global label value; only global values can be self-labels | knownValues includes bot | https://atproto.com/guides/labels | none | 2026-11-27 | 90 | platform | bot +which indicates th[a-z]+ an account is automated |

Tests that ran, in `regtest/` (the four BS rows in `facts/bluesky.md`, `registry.awk` and `refetch.sh` copied from `cab-12` and `cab-14`):

```
$ awk -f registry.awk facts/*.md ; echo "exit $?"
exit 0
$ sh refetch.sh facts/bluesky.md ; echo "exit $?"
exit 0
$ sh refetch.sh planted.md        # planted: BS-F03 expect "add robot badge", BS-F04 expect "account is robotic"
CHANGED BS-F03 https://github.com/bluesky-social/social-app/pull/10008
CHANGED BS-F04 https://atproto.com/guides/labels
```

No output with exit 0 is a pass for both scripts. BS-F03 is on `github.com`, a fetchable host. Its provenance `platform` needs `github.com` on `facts/hosts.txt` as `platform`, a human decision (CH-CORE-15).

**NEW rule, proposed (CH-CORE-20, SHOULD).** Rule: "When a `channels.yml` bot row for Bluesky is created, tell the owner that the `bot` self-label can be set in the Bluesky app under Settings > Account > Automation label, and record the result of `cab-02` in the row. Never claim in a draft or a skill that the label lets readers filter or hide bots, or that Bluesky requires it." Rationale: the toggle exists, but filtering is not shipped and the platform text says "best practice" (findings 4 and 6). An agent trained on the third-party posts would overstate both. Severity: SHOULD. Verification: `cab-02` (exit 0 for the Bluesky row) and `rg -n -i 'bluesky.*(filter|hide|require).*(bot|automat)' <drafts and skills>` prints nothing. The first part was shown working on 2026-11-27 (`orfnewsbot.bsky.social` has the label, `bsky.app` has none, finding 7). The `rg` pattern is untested against a planted sentence; the owner can drop this rule, since the CH-CORE-02 change stands alone.

## Dated facts

| Fact | Date | Source and evidence |
|---|---|---|
| PR #10008 merged | 2026-03-10 | https://github.com/bluesky-social/social-app/pull/10008 (finding 1 output) |
| Release 1.119.0 published | 2026-03-17T21:16:38Z | https://github.com/bluesky-social/social-app/releases/tag/1.119.0 (finding 2 output) |
| atproto#4777 and bsky-docs#404 merged | 2026-03-19 | links in finding 5 |
| Toggle file last touched | 2026-10-02T19:32:44Z (icon codegen, #11473); the last behaviour change was 2026-10-02T18:08:25Z, "Reset feeds instead of refetching every page after the automation label changes (#11847)" | below |
| Latest app release seen | 1.137.0, published 2026-10-29T01:39:17Z | below |
| Tutorial wording | fetched 2026-11-27 | https://atproto.com/guides/bot-tutorial |

Commands for the two rows above:

```
$ gh api 'repos/bluesky-social/social-app/commits?path=src/screens/Settings/AutomationLabelSettings.tsx' -q '.[] | .commit.committer.date + " " + (.commit.message|split("\n")[0])'
2026-10-02T19:32:44Z Add SVG-driven icon codegen (#11473)
2026-10-02T18:08:25Z Reset feeds instead of refetching every page after the automation label changes (#11847)
2026-09-02T22:00:56Z APP-2977: Handle AppView polling errors (#11590)
2026-08-13T19:26:22Z [SDK] Remove @atproto/api (#11386)
2026-06-03T10:47:35Z Use square icons for labellers in Automation Label preview card (#10701)
2026-03-10T18:28:49Z [APP-1928] add bot/automated account badge and self-labeling settings (#10008)
$ gh api repos/bluesky-social/social-app/releases/tags/1.137.0 -q .published_at
2026-10-29T01:39:17Z
```

## What could not be determined

- Whether Bluesky made an official announcement (blog or changelog). The first pass searched `bsky.social/about/blog` and `docs.bsky.app/blog` (fetched 2026-11-27) and found no mention. Missing: a Bluesky-authored announcement; a human would check the official `@bsky.app` feed.
- Whether any Bluesky policy requires or enforces the label. The ToS and community guidelines have 0 matches (finding 6). Missing: an enforcement statement from Bluesky.
- Whether a per-viewer filter for `bot` exists server side or in a build newer than the 2026-11-26 clone. The client code shows none (finding 4).
- The 59% adoption figure and the Amebo suspension (finding 8): single author, unverified. Missing: Bluesky's own data or statement.
- Whether 1.137.0 is the newest release as of today: the release list was read once, 2026-11-27.

## Sources

| URL | What | Date |
|---|---|---|
| https://github.com/bluesky-social/social-app/pull/10008 | PR that added the badge and toggle (platform) | merged 2026-03-10 |
| https://github.com/bluesky-social/social-app/releases/tag/1.119.0 | release notes (platform) | 2026-03-17 |
| https://github.com/bluesky-social/atproto/pull/4777 | lexicon `bot` known value (platform) | 2026-03-19 |
| https://github.com/bluesky-social/bsky-docs/pull/404 | docs change (platform) | 2026-03-19 |
| https://atproto.com/guides/labels | global label values (platform) | undated, fetched 2026-11-27 |
| https://atproto.com/guides/bot-tutorial | "best practice" wording (platform) | undated, fetched 2026-11-27 |
| https://github.com/bluesky-social/social-app (clone bdeb25e) | app source | committed 2026-11-26 |
| https://github.com/bluesky-social/atproto (clone dce608b) | lexicon source | committed 2026-11-27 |
| https://github.com/bluesky-social/social-app/issues/7634 | open feature request "Bot Account Declaration Label" | 2025-02-02 |
| https://bsky.social/about/support/tos | ToS, no bot-label text | undated, fetched 2026-11-27 |
| https://bsky.social/about/support/community-guidelines | guidelines, no bot-label text | undated, fetched 2026-11-27 |
| https://bsky.social/about/blog/01-29-2026-transparency-report-2025 | transparency report (platform) | 2026-01-29 |
| https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile | live profile read (platform) | 2026-11-27 |
| https://astral100.leaflet.pub/3mijhh4wyze2u | third-party post, independent | 2026-04-02 |
| https://astral100.leaflet.pub/3mmqbkr2hrg2r | third-party post, independent | 2026-05-26 |
