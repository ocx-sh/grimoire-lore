---
title: "Reddit Responsible Builder Policy, Product Hunt Terms and Discord Developer Policy, read from the primary pages"
program: product
topic: channel-agent-boundary
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 17
---

# Reddit Responsible Builder Policy, Product Hunt Terms and Discord Developer Policy

## Question

What do Reddit's Responsible Builder Policy, the Product Hunt Terms of Service and the Discord Developer Policy say, read from the primary pages? Wave 1 recorded that all three returned 403 or 404 (CH-CORE-11 rationale, Open questions).

## Summary

All three texts were read in full. Repair pass result: the Product Hunt terms were read live (WebFetch, 2026-11-27) and match the archive copy. Reddit's and Discord's canonical pages are still blocked to curl and WebFetch on 2026-11-27 (403), so those two texts come from Internet Archive copies, labelled below with their capture dates. The Reddit self-service closure and the Product Hunt API terms are now confirmed from primary pages.

1. **Reddit Responsible Builder Policy** (page "Updated June 05, 2026", archive copy captured 2026-08-28). It names "bots, AI agents, or non-human operated accounts" as apps. It requires explicit approval before any Data API access, a registered developer profile and an App profile label, and no mixed-use accounts. It bans "spamming activity through automated posts, comments, or direct messages", including "identical or substantially similar content across subreddits". An agent cannot hold the approval, so this confirms CH-CORE-01 for Reddit and makes Reddit's exclusion from the five automation platforms of CH-CORE-02 a policy fact, not only a choice.
2. **Product Hunt Terms of Service** (effective 2014-08-17, archive copy captured 2026-11-16). The page for these terms is `https://www.producthunt.com/legal`, because `/terms` returns 403 to curl and 404 to WebFetch. The terms bar crawling or scraping "through use of manual or automated means" and processes that "run or are activated while you are not logged into the Services". They limit use to "internal, personal, non-commercial use, and not on behalf of or for the benefit of any third party". The terms contain no clause on AI, LLMs or an API; the Product Hunt API's own page, read live, says the API "must not be used for commercial purposes" by default. The "No LLMs" rule that CH-CORE-03 cites is in the separate commenting guidelines.
3. **Discord Developer Policy** (effective 2024-07-08, last updated 2024-06-06, archive copy captured 2026-11-18). It has no self-bot clause. Its relevant rules are 5 (no unsolicited DMs), 6 (no advertisements or marketing to users), 13 (no automated messages "for the purpose of maintaining activity") and 20 (no scraping). The self-bot ban is in the Community Guidelines (effective 2025-09-29, live fetch), item 14. CH-CORE-02's `dc-nobot` gate therefore needs its citation corrected.

## Method and what was fetched

All commands ran on 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/cab-q0r/` (repair pass; the first pass used `cab-q0/`). `fetch.sh` in that directory is one line, and `$UA` is `Mozilla/5.0`:

```sh
curl -sL -m 60 -A 'Mozilla/5.0' -o "$1" -w '%{http_code} %{size_download}\n' "$2"
```

Text extraction for every page: `sed 's/<[^>]*>/ /g' page.html | tr -s ' \n' ' ' > page.txt`.

| # | Source | Command and output (2026-11-27) |
|---|---|---|
| 1 | Reddit help article, live: `https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy` | `curl -sL -m 40 -A "$UA" -H 'Accept: text/html' -o /dev/null -w '%{http_code} %{size_download}\n' <url>` printed `403 5792`. WebFetch printed "The server returned HTTP 403 Forbidden." |
| 2 | Product Hunt legal page, live: `https://www.producthunt.com/legal` | curl printed `403 5542` (same for `/terms`). **WebFetch succeeded**: it returned "Effective date: August 17th 2014" and the clause "You will only use the Services for your own internal, personal, non-commercial use, and not on behalf of or for the benefit" + "of any third party, and only in a manner that complies with all laws that apply to you." A second WebFetch returned item (g) "any processes that run or are activated while you are not logged into the Services" and item (h) "“Crawls,” “scrapes,” or “spiders” any page, data, or portion of or relating to the Services", and said the terms do not mention API, AI, LLM or bot. |
| 3 | Discord Developer Policy, live: `https://discord.com/developers/docs/policies-and-agreements/developer-policy` and `https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy` | curl printed `403 5723` (redirected to `support-dev.discord.com/hc/articles/8563934450327-...`) and `403 5763`. WebFetch printed "The server returned HTTP 403 Forbidden." |
| 4 | Reddit archive copy, captured 2026-08-28 (newest of the CDX list, the list ends `["20260828024612","22152"]`) | `sh fetch.sh rbp.html "https://web.archive.org/web/20260828024612/https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy"` printed `200 90126`. `grep -o 'Updated [A-Za-z]* [0-9]*, 20[0-9]* [0-9:]*' rbp.txt` printed `Updated June 05, 2026 17:38`. |
| 5 | Product Hunt archive copy, captured 2026-11-16 | `sh fetch.sh ph.html "https://web.archive.org/web/20261116170933/https://www.producthunt.com/legal"` printed `200 254301`. |
| 6 | Discord archive copies | `DU=support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy`; `sh fetch.sh dc-$ts.html "https://web.archive.org/web/${ts}/https://$DU"` printed `200 64392` for `ts=20261011134244` (2026-10-11), `200 64317` for `ts=20261118203532` (2026-11-18) and `200 65542` for `ts=20260109202647` (2026-01-09). |
| 7 | Reddit announcement post, archive copy | `sh fetch.sh rd.html "https://web.archive.org/web/2025/https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/"` printed `200 470711`, resolved to the capture `https://web.archive.org/web/20260107115139/https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/`. `grep -o -E '2025-11-1[0-9]T[0-9:]+' rd.html \| sort -u` printed `2025-11-11T17:45:56`. The live `www.reddit.com` and `old.reddit.com` URLs printed `403 1522`. |
| 8 | Product Hunt API docs, live | `curl -sL -m 40 -A 'Mozilla/5.0' -o phapi.html -w '%{http_code} %{size_download}\n' https://api.producthunt.com/v2/docs` printed `200 19762`. |
| 9 | Reddit Developer Terms, Data API Terms, Discord guidelines, Discord ToS, live | `curl -sL -m 40 -A 'Mozilla/5.0' <url> \| sed 's/<[^>]*>/ /g' \| tr -s ' \n' ' ' \| grep -o -E 'Effective[^.]{0,40}20[0-9]{2}'` printed `Effective September 24, 2024` for `https://redditinc.com/policies/developer-terms` and `Effective June 19, 2023` for `https://redditinc.com/policies/data-api-terms`. For `https://discord.com/guidelines` (`200 88151`) `grep -o -E 'Effective[^0-9]{0,6}[A-Za-z]+ [0-9]+, 20[0-9]{2}'` printed `Effective: September 29, 2025`. For `https://discord.com/terms` the grep printed `Effective: December 15, 2026  Last Updated: November 23, 2026`. |
| 10 | Product Hunt help center, live via WebFetch | `https://help.producthunt.com/en/articles/771527-personal-account-vs-company-account` (page dated April 26, 2026): "Company accounts have limited access as they cannot post products, comment, or vote on the platform." and "Only personal accounts are eligible to contribute". `https://help.producthunt.com/en/articles/479557-how-to-post-a-product` (page says "Updated over 3 weeks ago"): "We recommend posting your own product, so you have full control over your launch." curl on `help.producthunt.com` printed `403 5718`. |

Wayback capture lists (the Discord list that gave the 2026-10-11 capture URL):

```sh
curl -s 'https://web.archive.org/cdx/search/cdx?url=support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy&output=json&filter=statuscode:200&from=2026&fl=timestamp,statuscode,length'
```

It listed 31 captures from `20260109202647` to `20261118203532`, among them `20261011134244`, `20261011144628` and `20261014163545`.

An archive copy proves what the page said on the capture date, not what it says today. Ages on 2026-11-27: Reddit copy 91 days, Product Hunt copy 11 days, Discord copies 9 days (2026-11-18) and 47 days (2026-10-11), Reddit announcement copy 324 days (the post itself is dated 2025-11-11). Wayback is a copy, not a platform statement, so the registry rows below keep the platform URL and record the capture in `history`.

Wave-1 first-pass block test, kept for the record (`cab-q0/`): `403 5643` (Reddit help), `403 5392` (producthunt.com/terms), `403 5595` (Discord developer policy), `404 44718` (`https://redditinc.com/policies/responsible-builder-policy`, a path wave 1 guessed; it does not exist). The 5-6 KB bodies are bot-block pages.

## Reddit Responsible Builder Policy

Page header: "Responsible Builder Policy, Updated June 05, 2026 17:38" (archive copy, captured 2026-08-28). Vendor label: platform's own help center.

Operative passages, verbatim:

- "This policy applies to everyone, whether you're a developer, moderator, researcher, or an app."
- "Approval is required: You must request access and get explicit approval before accessing any Reddit data through our API, and you must agree to comply with all applicable terms."
- "Be transparent: You must not misrepresent or mask how or why you are accessing Reddit data. This prohibits registering multiple accounts or submitting multiple requests for the same use case."
- "Respect the limits: You must not circumvent or exceed access limits or engage in excessive usage that disrupts our APIs or supporting networks."
- Section "Apps and Automated Activity": "This section applies to all users and developers who use or develop apps, including bots, AI agents, or non-human operated accounts, with Reddit data."
- "Apps must register and create a developer profile to get an App profile label. Apps must not circumvent any labeling performed by Reddit."
- "App accounts should solely be used to perform app functions (no mixed use accounts)."
- "Apps must get a user's explicit consent to engage in private communications."
- Section "Prohibited App Activities": "Apps must not engage in spamming activity through automated posts, comments, or direct messages. This includes posting identical or substantially similar content across subreddits."
- "If you'd like to use Reddit data for commercial purposes, you'll need to get explicit written approval."
- "All content posted through a Reddit Data API must comply with the Reddit Rules."
- Enforcement: "Revoking your access tokens. Suspending your app or account. Suspending associated accounts, bots, domains, or subreddits."

Related primary text read live on 2026-11-27: the [Developer Terms](https://redditinc.com/policies/developer-terms) (effective September 24, 2024) define "App" to include "bots" and bar use of Reddit Services and Data "to spam, incentivize, or harass Users". The [Data API Terms](https://redditinc.com/policies/data-api-terms) (effective June 19, 2023) carry the same spam clause.

What this means for an agent:

- The approval gate is about API access to Reddit data, and posting through the API is part of that access. An agent cannot obtain approval, so it cannot call `/api/submit` or `/api/comment`. This agrees with CH-CORE-01.
- The policy sets no ban on a human posting by hand. Whether a post is allowed there is decided by the subreddit's rules (CH-CORE-05). The policy names no AI-disclosure requirement for human posts.
- An owner-commissioned Reddit bot would need approval, an App profile label and a dedicated account. Wave 1 excluded Reddit from the bot platforms, so the exclusion now has a policy basis: self-service access is not offered. The primary source is Reddit's own r/redditdev announcement, "Introducing the Responsible Builder Policy + new approval process for API access" (posted 2025-11-11T17:45:56, [post](https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/), read from the archive capture of 2026-01-07, `https://web.archive.org/web/20260107115139/https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/`, method row 7). Verbatim: "Ending Self-Service API access Starting today, self-service access to Reddit’s public data API will be closed. Anyone looking to build with Reddit data, whether you’re a developer, researcher, or moderator, will need to request approval before gaining access. That said, current access won’t be affected". Vendor label: platform announcement by a Reddit admin account. The post says existing access continues, so an owner who already holds approved access is the only case where a Reddit bot could exist.

## Product Hunt Terms of Service

The terms sit in the "Terms of Service" section of `https://www.producthunt.com/legal` (archive copy captured 2026-11-16). The text opens "Effective date: August 17th 2014". The privacy section on the same page is dated "January 1, 2020". No later revision date appears. The page is a copy and could have changed in ways that kept the old date. Vendor label: platform's own legal page.

Operative passages, verbatim:

- "You will only use the Services for your own internal, personal, non-commercial use, and not on behalf of or for the benefit of any third party, and only in a manner that complies with all laws that apply to you."
- "You will not share your account or password with anyone, and you must protect the security of your account and your password. You're responsible for any activity associated with your account."
- Restriction (g): "Runs Maillist, Listserv, any form of auto-responder or 'spam' on the Services, or any processes that run or are activated while you are not logged into the Services, or that otherwise interfere with the proper working of the Services".
- Restriction (h): "'Crawls,' 'scrapes,' or 'spiders' any page, data, or portion of or relating to the Services or Content (through use of manual or automated means)".
- Restriction (i): "Copies or stores any significant portion of the Content".
- "A violation of any of the foregoing is grounds for termination of your right to use or access the Services."

The terms contain no word "API", "AI", "LLM" or "bot" in the terms section. Command and output, on the archive copy `ph.txt` (method row 5):

```sh
python3 -I - <<'EOF'
import re
t=open('ph.txt').read()
s=t.index('Effective date: August 17th 2014'); print('terms start',s)
m=re.search(r'Privacy Policy',t[s:]); print('privacy marker offset',m.start())
seg=t[s:s+m.start()]; print('segment len',len(seg))
for w in ['API','AI','LLM','bot','artificial','machine learning']:
    print(w, len(re.findall(r'\b'+w+r'\b',seg,re.I if w!='AI' else 0)))
EOF
```

Output: `terms start 38918`, `privacy marker offset 11920`, `segment len 11920`, then `API 0`, `AI 0`, `LLM 0`, `bot 0`, `artificial 0`, `machine learning 0`. The segment is the 11,920 characters from the "Effective date" line to the first "Privacy Policy" heading, and the character range the first pass gave (900 to 29865) could not be reproduced, so it is withdrawn. A live WebFetch of the same page on 2026-11-27 (method row 2) independently said the terms do not mention API, AI, LLM or bot. The only "API" on the whole page is in the privacy section: "API Users Certain third parties have API access to portions of the Site" (the `finditer` over `ph.txt` printed two hits, both there).

The Product Hunt API has its own terms on its docs page, read live (method row 8): "Remember you would also need to request `public private write` scope for write functions to work. The Product Hunt API must not be used for commercial purposes. If you would like to use it for your business, please contact us at hello@producthunt.com." and "By default the Product Hunt API must not be used for commercial purposes." The page is undated. This confirms the wave-1 quote and means a write-scope API client for a company needs Product Hunt's consent.

What this means for an agent:

- The ToS confirms the ban on unattended processes: clause (g) bars any process that runs while the user is not logged in, which covers a scheduled poster or a headless browser session.
- The "non-commercial use, and not on behalf of ... any third party" clause is wider than wave 1 assumed. Read literally, a company's launch post through a personal account is commercial use for the benefit of a third party. The page does not say how Product Hunt applies this to product launches, which are its core use. The help center, read live on 2026-11-27 (method row 10), shows how Product Hunt treats launches in practice: "We recommend posting your own product, so you have full control over your launch." and "Company accounts can’t post products" ("Only personal accounts are eligible to contribute", page dated 2026-04-26). So the platform itself directs makers to launch their own products from a personal account. The literal ToS wording still reads wider than that practice, and Product Hunt has not reconciled the two in any page found, so the ToS text cannot be cited as banning or allowing a launch. The safe agent behaviour does not change: draft nothing paste-ready for Product Hunt comments, and never operate the account.
- CH-CORE-03's quoted "No LLMs or Chrome extensions please!" comes from the commenting guidelines, not these terms. The terms add no AI clause, so an agent must not cite the ToS for an AI ban.

## Discord Developer Policy

Header: "Effective date: July 8, 2024. Last updated: June 6, 2024." Help-center article posted 2024-08-02. The same header text appears in three archive captures: 2026-01-09, 2026-10-11 (`https://web.archive.org/web/20261011134244/https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy`) and 2026-11-18. Command, run in the scratch directory on each saved capture `dc-<ts>.txt` (method row 6): `grep -o -i 'last updated:\? [A-Za-z]* [0-9]*, 20[0-9]*' dc-$ts.txt | sort -u` printed `Last updated: June 6, 2024` for `20260109202647`, `20261011134244` and `20261118203532`, and `grep -o -i 'Effective date[^.]\{0,60\}Last updated[^.]\{0,30\}' dc-$ts.txt | head -1` printed `Effective date: July 8, 2024 Last updated: June 6, 2024 For a link to t` each time. No later date appears in any capture, so the policy was unchanged from 2026-01-09 to 2026-11-18. Vendor label: platform's own developer help center.

Operative passages, verbatim:

- Rule 1: "Do not modify a Discord user's account without explicit permission from the Discord user."
- Rule 4: "Do not collect, solicit, or deceive users into providing passwords or other credentials. Under no circumstances may you or your Application request or attempt to obtain login credentials from Discord users. This includes information such as passwords or account access or login tokens."
- Rule 5: "Do not contact users on Discord without their explicit permission. This includes frequently sending unsolicited direct messages and/or sending direct messages not directly related to maintaining or improving an Application's functionality."
- Rule 6: "Do not target users with advertisements or marketing. Messaging to Discord users from any Application or developer team should be relevant to the function of the Application and may not contain material unrelated to an Application's function or information."
- Rule 13: "Do not misrepresent or fraudulently manipulate engagement. This includes participating in, enabling, or promoting the inflation of server membership with bot or user accounts. This also includes automating messages to be sent for the purpose of maintaining activity in a Discord server."
- Rule 20: "Do not mine or scrape any data, content, or information available on or through Discord services."
- Rule 21: "Do not use message content obtained through the APIs to train machine learning or AI models (including large language models) unless express permission is granted by Discord."
- API Limits: "Discord may set and enforce limits on your use of the APIs ... You agree to, and will not attempt to circumvent, such limitations."

Discord's self-bot ban is not in this policy. It is in the [Community Guidelines](https://discord.com/guidelines) (Effective: September 29, 2025, live fetch 2026-11-27), item 14: "Do not use self-bots or user-bots. Each account must be associated with a human, not a bot." The [Terms of Service](https://discord.com/terms) (live fetch: "Effective: December 15, 2026, Last Updated: November 23, 2026") bar "scraping our services without our written consent, including by using any robot, spider, crawler, scraper, or other automatic device, process, or software". These are new facts: the ToS revision is dated after today and has not taken effect.

What this means for an agent:

- A bot application or webhook is a documented path, so the Discord entry in CH-CORE-02 stands.
- Rules 5 and 6 limit what an owner-commissioned bot may post. Release notes about the product's function fit rule 6. Marketing to members does not.
- The fleet's `notify-discord.yml` posts pull-request, release and failed-run events to a 5-member community server. Rule 13 does not apply, because the messages report real events and are not sent to maintain activity. Rule 6 is a question for the communities sibling.

## Effect on the ruleset

Verification runs in this section used the scratch directory `~/.cache/research-lang/exemplars/product/wave2/cab-q0r/`. Three helper files live there and are described in the commands: `facts/seed.md` (the 17 registry rows below, copied with `grep -E '^\| (RD|PH|DC)-F[0-9]+ ' followup-q0.md`, plus RD-F06 and PH-F04 appended), `expect.sh` and `factref.awk` (the `cab-11` awk from the parent file, extracted with `sed -n '/^```awk/,/^```/p'` over its lines 210-220).

### Verification A: every registry `expect` string appears in the source text (new check `cab-q0-expect`, backs CH-CORE-01, -02, -03, -11)

```sh
awk -F'|' '/^\| [A-Z]+-F[0-9]+ /{id=$2;e=$12;gsub(/^ +| +$/,"",id);gsub(/^ +| +$/,"",e);print id"\t"e}' facts/seed.md |
while IFS="$(printf '\t')" read -r id e; do
  case $id in RD-F06) f=rd.txt;; PH-F04) f=phapi.txt;; RD-*) f=rbp.txt;; PH-*) f=ph.txt;; DC-F07) f=gl.txt;; DC-*) f=dc-20261118203532.txt;; esac
  grep -qF -- "$e" "$f" && echo "ok   $id" || echo "MISS $id: $e"
done
```

Run on 2026-11-27 it printed `ok` for all 17 rows RD-F01 to RD-F06, PH-F01 to PH-F04 and DC-F01 to DC-F07 and no `MISS` line (`sh expect.sh | grep -v '^ok'` printed nothing). Any quote in a rationale below is one of those `expect` strings or a longer passage that contains one. A conforming run prints no `MISS`. In the authored skill this runs weekly over the live page where the host allows scripts, and by hand for the three `MANUAL` hosts.

### Verification B: `cab-11` with the new rows

`cab-11` is the parent file's awk. Pass draft `fx/p/draft.md` holds "Reddit needs explicit approval before API access [RD-F01]." and "Discord bans self-bots [DC-F07]."; fail draft `fx/f/draft.md` holds "Reddit comments are capped at 10,000 characters." and "Product Hunt allows 60 characters [PH-F99].".

```sh
awk -v DRAFT=fx/p/draft.md -f factref.awk facts/seed.md fx/p/draft.md
awk -v DRAFT=fx/f/draft.md -f factref.awk facts/seed.md fx/f/draft.md
```

Output: nothing for the pass draft; for the fail draft `fx/f/draft.md:1: platform number without a registry id` and `fx/f/draft.md:2: unknown id PH-F99`.

### Verification C: the new `dc-offtopic` gate in `gates_attested` (backs CH-CORE-02)

`gates.awk` is the check for a `channels.yml` row (the full `channels-lint.py` is authored with the rule; this is its Discord gate test):

```awk
/^- id:/ {p=""} /platform:/ {p=$2} /gates_attested:/ { if (p=="discord") { if ($0 !~ /dc-nobot/) print FILENAME": missing dc-nobot"; if ($0 !~ /dc-offtopic/) print FILENAME": missing dc-offtopic" } }
```

Fixtures: pass `fx/p/channels.yml` is `- id: dc1`, `  platform: discord`, `  gates_attested: [dc-nobot, dc-offtopic]`; fail `fx/f/channels.yml` has `gates_attested: [dc-nobot]`. `awk -f gates.awk fx/p/channels.yml` printed nothing. `awk -f gates.awk fx/f/channels.yml` printed `fx/f/channels.yml: missing dc-offtopic`.

### Per-rule effect

| Rule | Effect | Text or reason | Verification |
|---|---|---|---|
| CH-CORE-01 | **change (rationale only)** | Append to the rationale: "Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) (updated 2026-06-05) requires 'explicit approval before accessing any Reddit data through our API' for apps 'including bots, AI agents', and bans 'spamming activity through automated posts, comments, or direct messages' [RD-F01, RD-F03]. Reddit closed self-service API access on 2025-11-11 [RD-F06]. Product Hunt's [terms](https://www.producthunt.com/legal) (effective 2014-08-17) bar any process that runs 'while you are not logged into the Services' [PH-F03], and its API 'must not be used for commercial purposes' by default [PH-F04]." The rule text stays. | Verification A: the quoted fragments are the `expect` strings of RD-F01, RD-F02, RD-F03, RD-F06, PH-F03 and PH-F04, and all printed `ok`. The existing `cab-01` result is unchanged because the rule text is unchanged. |
| CH-CORE-02 | **change** | (a) Replace the `dc-nobot` gate's source: "`dc-nobot`: a bot application or webhook, never a self-bot or user-bot (Community Guidelines item 14, DC-F07)." (b) Add gate `dc-offtopic`: "no advertisements or marketing in bot messages, and no automated messages sent to maintain activity (Developer Policy rules 6 and 13, DC-F02, DC-F03)". Like the other prose gates it has no command to prove the behaviour and is `unverified: attested by a human`, but its presence on the row is checked by command (Verification C). (c) Add one sentence: "Reddit has no row because it offers no self-service bot path (RD-F06)." In verification item (4) add `dc-offtopic` to the list of `unverified: attested by a human` gates. | Verification C: a Discord row without `dc-offtopic` prints `missing dc-offtopic`, a row with both gates prints nothing. DC-F02, DC-F03 and DC-F07 are checked by Verification A (all `ok`). |
| CH-CORE-03 | **confirm** | The Reddit clause confirms the fact-sheet default for Reddit. The Product Hunt ToS adds no AI clause, so the rationale must keep citing the commenting guidelines for the LLM ban. | Unchanged `cab-03`. The no-AI-clause finding is checked by the segment count in the Product Hunt section (`AI 0`, `LLM 0`). |
| CH-CORE-05 | **confirm** | The Responsible Builder Policy says "All content posted through a Reddit Data API must comply with the Reddit Rules" and sets no per-subreddit requirement. Subreddit rules remain the deciding text. | Unchanged `cab-05`. The sentence is in `rbp.txt` (`grep -c -F 'All content posted through a Reddit Data API must comply' rbp.txt` printed `1`; the Verification A `expect` set does not include it). |
| CH-CORE-11 | **change (rationale)** | Replace "These primary pages returned 403 or 404 in this pass: Reddit Responsible Builder Policy, Product Hunt Terms, Discord Developer Policy." with "Reddit's Responsible Builder Policy, the Product Hunt terms and the Discord Developer Policy are in the registry as RD-F01 to RD-F06, PH-F01 to PH-F04 and DC-F01 to DC-F07. The Reddit and Discord canonical URLs return 403 to scripts, so each such row's `history` names the archive capture it was read from." The rule text stays. Also change "ships 25 rows" to the new seed total in the authored file. | Two commands. (1) The old claim is gone: `grep -c -E 'returned 403 or 404 in this pass' <rule file>` prints 0 on the new rationale (fixture `fx/p/rule11.txt` printed `0`; the old sentence in `fx/f/rule11.txt` printed `1`). (2) Every id it names resolves: Verification B, `awk -v DRAFT=<file holding the new sentence with ids in brackets> -f factref.awk facts/*.md <file>` prints nothing, and an id outside the registry prints `unknown id`. |
| CH-CORE-12 | **confirm** | No schema change. The new rows fit all ten columns. A row read from an archive copy records the capture in a `history` note, which the lint does not read. | `awk -F'\|' '/^\| [A-Z]+-F[0-9]+ /{print NF}' facts/seed.md \| sort \| uniq -c` printed `17 12` (17 rows, 12 split fields: ten columns plus the two outer pipes). |
| CH-CORE-14 | **change** | In the `MANUAL` pattern add `support-dev\.discord\.com`. New pattern: `(^|\.)(linkedin\.com|producthunt\.com|help\.x\.com|reddit\.com|reddithelp\.com|ftc\.gov|support-dev\.discord\.com)$`. Rationale addition: "`support-dev.discord.com` returned 403 to curl and WebFetch on 2026-11-27." Product Hunt stays `MANUAL` although WebFetch could read `/legal` on 2026-11-27, because curl, which the weekly job uses, got 403. | Verification: block `cab-14` prints a `MANUAL` line for each DC-F01 to DC-F06 row. |
| CH-CORE-13 | **confirm** | The Reddit policy was updated 2026-06-05, so it has 90-day behaviour at most. The Discord Developer Policy has not changed in more than 2 years (three captures from 2026-01-09 to 2026-11-18 show the same date). Both stay at 90 days, because the rows describe policy. | The Discord claim is checked by the `grep` in the Discord section. |
| NEW CH-CORE-20 | **new** | See below. | See below. |

### NEW CH-CORE-20

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-CORE-20 | Before naming a platform policy clause for Reddit, Product Hunt or Discord in any output, take it from registry rows RD-F01 to RD-F06, PH-F01 to PH-F04 or DC-F01 to DC-F07, and cite the row id. Never cite the Responsible Builder Policy, the Product Hunt terms or the Discord Developer Policy from memory. Never attribute the Product Hunt "No LLMs" rule or the Discord self-bot ban to the document that does not contain it: the first is in Product Hunt's commenting guidelines and the second in Discord's Community Guidelines. | Wave 1 cited a Discord self-bot ban against a policy that does not contain it, and the Product Hunt terms contain no AI clause. Misattributed clauses are the failure mode CH-CORE-11 guards against. This rule narrows it to three documents whose canonical pages block scripts. | Run the two system `grep` commands over the outputs (the first draft of this rule used `rg` with `\|`, which is a literal pipe and matched nothing; and `rg` is a shell function in this fleet). `grep -nEi 'self-bot' <outputs> \| grep -vF '[DC-F07]'` and `grep -nEi 'Product Hunt.{0,80}(AI\|LLM)' <outputs> \| grep -vE '\[PH-F[0-9]+\]'`. Both print nothing on a conforming output. **Watched red and green, 2026-11-27.** Pass fixture `fx/p/out.md`: "Discord forbids self-bots [DC-F07]." and "Product Hunt terms add no AI clause [PH-F01]." Both commands printed nothing. Fail fixture `fx/f/out.md`: "The Discord Developer Policy bans self-bots." and "The Product Hunt terms ban LLM comments." The first command printed `1:The Discord Developer Policy bans self-bots.` and the second printed `2:The Product Hunt terms ban LLM comments.` The first draft of this check used `rg` with `\|` inside the group, which is a literal pipe in a regex with alternation and matched 0 lines on the fail fixture (`grep -nEi 'Product Hunt.{0,80}(AI\|LLM)' fx/f/out.md \| wc -l` printed `0`). Write the group as `(AI|LLM)` in the real command. | SHOULD |

## Seed registry rows

These 17 rows were read from the pages named above. The `verified` date is 2026-11-27, the date the page or archive copy was read; Verification A shows every `expect` string present in its source text. For all rows, `history` records the capture. RD and PH and DC hosts are on the CH-CORE-14 manual list, so the weekly job lists them as `MANUAL`. Add each host to `facts/hosts.txt` as `platform` only after a human accepts it.

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| RD-F01 | reddit | API access needs explicit approval before any data access | required | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | 2026-06-05 | 2026-11-27 | 90 | platform | explicit approval before accessing any Reddit data |
| RD-F02 | reddit | apps, including bots and AI agents, register for an App profile label | required | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | 2026-06-05 | 2026-11-27 | 90 | platform | bots, AI agents, or non-human operated accounts |
| RD-F03 | reddit | no automated posts, comments or DMs as spam, including identical content across subreddits | prohibited | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | 2026-06-05 | 2026-11-27 | 90 | platform | spamming activity through automated posts, comments, or direct messages |
| RD-F04 | reddit | app accounts only perform app functions | no mixed use | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | 2026-06-05 | 2026-11-27 | 90 | platform | no mixed use accounts |
| RD-F05 | reddit | commercial use of Reddit data needs written approval | required | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | 2026-06-05 | 2026-11-27 | 90 | platform | explicit written approval |
| RD-F06 | reddit | self-service public data API access closed on 2025-11-11 | closed | https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/ | 2025-11-11 | 2026-11-27 | 90 | platform | self-service access to Reddit’s public data API will be closed |
| PH-F01 | producthunt | terms limit use to internal, personal, non-commercial use, not for a third party | effective 2014-08-17 | https://www.producthunt.com/legal | 2014-08-17 | 2026-11-27 | 90 | platform | internal, personal, non-commercial use |
| PH-F02 | producthunt | no crawling or scraping, manual or automated | prohibited | https://www.producthunt.com/legal | 2014-08-17 | 2026-11-27 | 90 | platform | through use of manual or automated means |
| PH-F03 | producthunt | no process that runs while the user is logged out | prohibited | https://www.producthunt.com/legal | 2014-08-17 | 2026-11-27 | 90 | platform | activated while you are not logged into the Services |
| PH-F04 | producthunt | the Product Hunt API must not be used for commercial purposes by default | prohibited | https://api.producthunt.com/v2/docs | none | 2026-11-27 | 90 | platform | must not be used for commercial purposes |
| DC-F01 | discord | developer policy effective date | 2024-07-08 | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | Effective date: July 8, 2024 |
| DC-F02 | discord | rule 6: no advertisements or marketing to users from an application | prohibited | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | Do not target users with advertisements or marketing |
| DC-F03 | discord | rule 13: no automated messages to maintain server activity | prohibited | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | automating messages to be sent for the purpose of maintaining activity |
| DC-F04 | discord | rule 5: no unsolicited direct messages | prohibited | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | Do not contact users on Discord without their explicit permission |
| DC-F05 | discord | rule 20: no mining or scraping | prohibited | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | Do not mine or scrape any data |
| DC-F06 | discord | rule 21: no training AI models on message content without permission | prohibited | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | 2024-07-08 | 2026-11-27 | 90 | platform | to train machine learning or AI models |
| DC-F07 | discord | Community Guidelines item 14: no self-bots or user-bots | prohibited | https://discord.com/guidelines | 2025-09-29 | 2026-11-27 | 90 | platform | Do not use self-bots or user-bots |

`history` notes: RD-F01 to RD-F05 read from `https://web.archive.org/web/20260828024612/https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy`. PH-F01 to PH-F03 read from `https://web.archive.org/web/20261116170933/https://www.producthunt.com/legal` and confirmed by a live WebFetch of `https://www.producthunt.com/legal` on 2026-11-27. DC-F01 to DC-F06 read from `https://web.archive.org/web/20261118203532/https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy`. RD-F06 was read from `https://web.archive.org/web/20260107115139/https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/`. PH-F04 and DC-F07 were live fetches. Per CH-CORE-14's own rule, archive capture dates are not change evidence for the weekly job. Here they only show which text was read.

## Dated facts

| Fact | Date | Source | Provenance |
|---|---|---|---|
| Reddit Responsible Builder Policy updated | 2026-06-05 | help article header, archive copy 2026-08-28 | platform |
| Reddit announcement of the Responsible Builder Policy and the end of self-service API access | 2025-11-11 | [r/redditdev post](https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/), archive copy 2026-01-07 | platform |
| Product Hunt API docs, no-commercial-use default | undated | [API docs](https://api.producthunt.com/v2/docs), live 2026-11-27 | platform |
| Product Hunt help: company accounts cannot post products | 2026-04-26 | [help article](https://help.producthunt.com/en/articles/771527-personal-account-vs-company-account), live via WebFetch 2026-11-27 | platform |
| Reddit Developer Terms effective | 2024-09-24 | [redditinc.com](https://redditinc.com/policies/developer-terms), live 2026-11-27 | platform |
| Reddit Data API Terms effective | 2023-06-19 | [redditinc.com](https://redditinc.com/policies/data-api-terms), live 2026-11-27 | platform |
| Product Hunt Terms of Service effective | 2014-08-17 | [legal page](https://www.producthunt.com/legal), archive copy 2026-11-16 | platform |
| Product Hunt privacy section effective | 2020-01-01 | same page | platform |
| Discord Developer Policy effective, last updated | 2024-07-08, 2024-06-06 | help article, archive copy 2026-11-18 | platform |
| Discord Community Guidelines effective | 2025-09-29 | [guidelines](https://discord.com/guidelines), live 2026-11-27 | platform |
| Discord Terms of Service effective, last updated | 2026-12-15, 2026-11-23 | [terms](https://discord.com/terms), live 2026-11-27 | platform |

## What could not be determined

1. **A live read of two of the three canonical pages.** `support.reddithelp.com` and `support-dev.discord.com` returned 403 to curl (`403 5792`, `403 5763`) and to WebFetch on 2026-11-27. Product Hunt's `/legal` was read live through WebFetch and matches the archive copy. Needed for Reddit and Discord: a human reading each page in a browser to confirm today's text matches the archive copies (Reddit 91 days old, Discord 9 days old). The Discord header is unchanged across three captures from 2026-01-09 to 2026-11-18, which lowers the risk for Discord.
2. **How Product Hunt applies "non-commercial use, and not on behalf of ... any third party" to launches.** Partly answered: the help center tells makers to post their own product from a personal account and bars company accounts, so launching is sanctioned in practice. No page reconciles that with the ToS wording. Needed only if a rule must say a launch is "permitted by the terms": a statement from Product Hunt. No rule here depends on it.
3. **Whether the Product Hunt API commercial-use default has an approved path.** The docs say "please contact us at hello@producthunt.com". Needed: that correspondence, which an agent must not send. The default stays prohibited.
4. **Whether the Discord ToS dated 2026-12-15 changes the bot rules.** Only the scraping clause was read. The revision is not in force until 2026-12-15 and its diff against the prior version was not compared; no prior version was fetched. Needed: a diff of the ToS before and after the effective date.
5. **Whether the Reddit policy changed after 2026-08-28.** The newest archive capture of the article is 2026-08-28 (91 days old); the CDX list ended there. Needed: a human browser read.
