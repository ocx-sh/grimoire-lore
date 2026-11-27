---
title: LinkedIn organic posting for software products and services — landscape scout (repair pass)
program: product (marketing sub-program)
worker: ch-linkedin-organic (landscape scout)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 84
---

# LinkedIn organic posting — landscape scout

## Read this first: what the repair pass settled and what is still open

This pass fetched about 58 LinkedIn help-centre pages, LinkedIn's "Create on LinkedIn"
creator pages, and the Richard van der Blom playbook page, on top of the 26 sources of the first pass.
Help-centre pages show only a relative "Last updated: N ago" marker, measured at the
fetch date 2026-11-27; no help page shows an absolute date. Every limit below is
tagged LI (LinkedIn's own page) or 3P (third party).

Settled from LinkedIn's own pages: post length (3,000), document limits (100 MB, 300
pages, file types), image limits, video specs (15 min, 5 GB, aspect, fps, bitrate),
poll limits (140/30 characters, 2-4 options), scheduling window (10 min to 3 months),
newsletter access criteria and image sizes, link-preview Open Graph and image rules,
alt text and captions, mention rules, pinned comments, collaborative posts, post
analytics metric definitions and retention, prohibited automation, and LinkedIn's
stated guidance on AI-assisted content ("AI slop").

Still NOT published on any LinkedIn page fetched (checked, absent, not guessed):

- The "see more" truncation point on desktop and on mobile. No help page, creator
  page or engineering post fetched states it. The `a528176` post page, `a518996`,
  `a525301` and `create-start` were read and are silent. Treat any number as 3P
  and re-measure in the live composer.
- Comment character limit (`a524166` is silent), headline character limit (no
  fetched page states one; the 2021 Sprout figure of 100 for an article headline
  is unconfirmed), article body limit (`a522427` silent), newsletter title and
  description limits (`a517914`, `a517940` silent), hashtag count limit
  (`a519848` only says hashtags make content "more discoverable"), poll duration
  options beyond the default (`a522948`), maximum mentions per post (`a525082`).
- A LinkedIn statement on link-in-post versus link-in-comment reach, and any
  LinkedIn statement on engagement pods by name (the prohibited-software page
  does not use the word "pods").
- The van der Blom report body is paid (EUR 199 playbook); only the vendor's own sales page
  headline figures were readable (see Dated facts).
- Web search budget was exhausted again during this pass after one successful
  search; LinkedIn help article IDs were reached by following topic indexes
  (`topic/a148004`, `topic/a150004`, `topic/a254001`) instead.

## Landscape summary

1. LinkedIn's own account of ranking is deliberately thin. The engineering blog
   (12 Mar 2026) describes LLM-embedding retrieval and a generative recommender;
   the help centre says distribution rests on connection strength, follow
   relationships, and relevance, and that LinkedIn "avoid[s] being overly
   promotional" is advice, not a numeric rule. Every "algorithm rewards X"
   claim in agent config is 3P inference and needs a provenance tag.
2. LinkedIn now publishes concrete creator guidance itself: 2-5 posts per week,
   a hook at the start, a question plus a call to action, videos at 90 seconds
   or less, shot vertically, with auto captions on (members.linkedin.com).
3. LinkedIn has an explicit, citable position on AI-generated content: it judges value,
   not origin; generic content is "less likely to be widely distributed"; heavy AI
   involvement that is not obvious should be disclosed; there is no formal AI
   label; members can flag "Seems like AI slop". That is the checkable surface.
4. The mechanically checkable surface is large once LinkedIn's limits are in
   hand: length, document, image, video, poll, schedule, link-preview, alt text,
   caption, mention and OG-tag checks can all be lints against a dated table.
5. Reach-advice benchmarks are all-industry vendor data. None measures
   developer-tool launches. Advice decays within quarters.

## Candidate topics

Priority is for this project shape (open-source developer tools, small audience,
founder or maintainer voice, no paid ads). Every row carries a source URL.

| # | topic (question) | why it matters | source (URL) | already-covered? | priority | could a rule or skill check it, and how |
|---|---|---|---|---|---|---|
| 1 | What is the hard post length and how does it differ for a link post, and where is "see more"? | Post limit is 3,000 characters per LinkedIn; the fold point is not published by LinkedIn, so a hook rule must use a measured, dated 3P value | https://www.linkedin.com/help/linkedin/answer/a528176 (LI, "Posts can contain up to 3,000 characters") ; https://www.linkedin.com/help/linkedin/answer/a525301 (LI, link post text up to 3,000) | no | high | Yes: length assert at 3,000 against a dated limits table; fold rule checks hook sentence length against a 3P-labelled threshold |
| 2 | Where does "see more" cut on desktop vs mobile and what must lines 1-3 carry? | LinkedIn pages fetched are silent; the first lines decide whether the post is read | https://www.linkedin.com/help/linkedin/answer/a518996 (LI, post page: no fold figure) ; https://members.linkedin.com/create-start (LI, "an engaging hook at the beginning") | no | high | Partly: lint that line 1 states the claim and is under a conservative character budget; budget must be re-measured and dated, cite 3P source when added |
| 3 | When does a document (carousel) post beat a text post for a developer-tool launch, and what are the format limits? | LinkedIn limits: 100 MB, 300 pages, PPT/PPTX/DOC/DOCX/PDF, one document per post, uniform page size, flattened layers; vendors rank documents top but not for dev tools | https://www.linkedin.com/help/linkedin/answer/a518909 (LI) ; https://www.linkedin.com/help/linkedin/answer/a523054 (LI) ; https://www.socialinsider.io/social-media-benchmarks/linkedin (3P, 16 Mar 2026) | no | high | Yes: check exported PDF for size, pages, uniform page size, no layers; format-by-goal table cites vendor data as 3P |
| 4 | Does a link in the post body cut reach, and does moving it to a comment help? | LinkedIn staff quoted that links are not penalised; vendors disagree; van der Blom page quotes pinned-comment link reach of 12% of readers | https://richardvanderblom.com/insights-playbook/ (3P) ; https://buffer.com/resources/linkedin-algorithm/ (3P) | no | high | No for the claim (needs an experiment); yes for a checklist item "state link placement and why" |
| 5 | Which algorithm claims are LinkedIn's own, and how should a skill label provenance? | Agents repeat "saves are 5x a like" as fact; that is Authored Up via Hootsuite | https://blog.hootsuite.com/linkedin-algorithm/ (3P) ; https://www.linkedin.com/help/linkedin/answer/a516930 (LI, distribution page) | no | high | Yes: regex lint that every reach claim in a reference file has a provenance tag and a date |
| 6 | How fast does advice decay, and what refresh cadence should the reference carry? | LinkedIn help pages are "Last updated: 1 month to 4 years ago"; Sprout limits page is 2021 | https://www.linkedin.com/help/linkedin/answer/a564109 (LI, "2 months ago") | no | high | Yes: `verified_on` per fact; CI fails if older than N days |
| 7 | What does the 2026 feed architecture imply for a small-account developer-tool post (interest matching, cold start)? | Retrieval uses LLM embeddings of profile and post text; non-followers can see on-topic posts | https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed (LI, 12 Mar 2026) ; https://www.linkedin.com/help/linkedin/answer/a1499047 (LI) | no | high | Partly: rule "topic matches the author's profile text"; compare draft keywords to headline and About |
| 8 | Do new or unverified accounts get narrower reach, and does verification help? | LinkedIn: new accounts shown more narrowly, comments by non-connections go to Most Recent; verification may widen but "doesn't guarantee" | https://www.linkedin.com/help/linkedin/answer/a16425028 (LI, "1 month ago") | no | high | Yes: onboarding checklist item "profile verified before launch"; check via profile state |
| 9 | What cadence does LinkedIn itself recommend, and is it the number to encode? | LinkedIn: aim for 2-5 posts per week; "twice per week see up to five times more profile views" | https://members.linkedin.com/create-start (LI) ; https://www.linkedin.com/help/linkedin/answer/a7134086 (LI, "1 year ago") | no | high | Partly: plan check posts-per-week within 2-5; cite LI |
| 10 | Does posting more hurt per-post engagement, and is vendor data confounded? | Buffer shows rising impressions to 11+/week; selection effect likely | https://buffer.com/resources/how-often-to-post-on-linkedin/ (3P, 28 Aug 2025) | no | medium | No; skill states the caveat |
| 11 | What post anatomy works for a technical audience, and which parts are checkable? | LinkedIn lists hook, concise message, personal perspective, question; one idea, one ask are checkable | https://members.linkedin.com/create-start (LI) | no | high | Yes: lint hook present, single call to action, question present |
| 12 | What counts as engagement bait and what is the penalty? | van der Blom page: "Comment KEYWORD" posts fell from +18% to -45% vs author average; LinkedIn help says comments created through excessive automation may have visibility limited | https://richardvanderblom.com/insights-playbook/ (3P) ; https://www.linkedin.com/help/linkedin/answer/a524166 (LI) | no | high | Yes: phrase lint for "comment YES/keyword" patterns, labelled 3P |
| 13 | Are pods, comment automation, bots and scheduling plug-ins prohibited, and what are the penalties? | User Agreement 8.2 and prohibited-software page: bots, scrapers, tools that "manipulate LinkedIn's content algorithms" banned; accounts "restricted or shut down"; pods are not named | https://www.linkedin.com/help/linkedin/answer/a1341387 (LI, "2 years ago") ; https://www.linkedin.com/legal/user-agreement (LI, eff. 3 Nov 2025) | no | high | Yes: rule forbids recommending pods, auto-comment, scrapers, third-party extensions |
| 14 | Is native scheduling safe, what is the window, and are third-party schedulers allowed? | Native scheduling: at least 10 minutes and at most 3 months ahead, 30-minute increments, not for events or jobs; third-party tool risk under 8.2 | https://www.linkedin.com/help/linkedin/answer/a1347212 (LI, "2 months ago") | no | medium | Yes: schedule time within window; allowlist native scheduling |
| 15 | Does LinkedIn label or down-rank AI-generated content, and is disclosure required? | LinkedIn: value not origin; generic content less likely distributed; disclose when heavy AI role is not obvious; no formal label; "Seems like AI slop" flag and analytics tip | https://www.linkedin.com/help/linkedin/answer/a1481496 (LI, "1 month ago") | no | high | Yes: checklist "human reviewed, concrete detail present, disclosure line when heavily generated"; lint for generic filler phrases |
| 16 | Does EU AI Act Article 50 apply to a company posting AI-generated text or images? | Transparency duties apply from 2 Aug 2026; labelling of image and deepfake-like media | https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content (official, 2026) | no | medium | Yes: checklist "AI-generated image labelled"; legal scope needs a deep dive |
| 17 | Must an employee or maintainer post disclose a material connection? | FTC: employment is a material connection; disclosure must be visible without "more" | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers (official, Nov 2019) | no | high | Yes: disclosure term required in first lines when promoting own employer or partner |
| 18 | Is a fabricated testimonial or benchmark in a post a policy problem? | Policies bar false or misleading content and undisclosed endorsements | https://www.linkedin.com/legal/professional-community-policies (LI) | no | medium | Yes: every number in a draft needs a source link in the brief |
| 19 | How should a company page and a founder profile split the work? | Socialinsider quotes LinkedIn: employees have ~10x connections and ~2x CTR (secondhand); LinkedIn newsletter, Page-post and collaborative-post rules differ by author type | https://www.linkedin.com/help/linkedin/answer/a567075 (LI, Page post FAQ) ; https://www.socialinsider.io/social-media-benchmarks/linkedin (3P) | no | high | Partly: plan template with author per post; Page post limits per FAQ (500 posts visible, only super or content admins post) |
| 20 | Which format wins by goal (awareness, repo traffic, install, hiring, credibility)? | Benchmarks measure engagement rate, not clicks to a repo | https://www.socialinsider.io/social-media-benchmarks/linkedin (3P) ; https://buffer.com/resources/linkedin-algorithm/ (3P) | no | high | Yes: decision table; draft must declare goal and matching format |
| 21 | What are the native video specs and does the video feed change what to publish? | LinkedIn: 3 s to 15 min, 75 KB to 5 GB, 256x144 to 4096x2304, aspect 1:2.4 to 2.4:1, 10-60 fps, 192 Kbps to 30 Mbps; one video per post; cannot post directly into the immersive feed; creator page advises 90 s or less, vertical, captions | https://www.linkedin.com/help/linkedin/answer/a7174587 (LI, "2 years ago") ; https://www.linkedin.com/help/linkedin/answer/a6290168 (LI) ; https://members.linkedin.com/create-grow (LI) | no | medium | Yes: `ffprobe` check of duration, size, ratio, fps, bitrate against the dated table |
| 22 | Are captions and alt text required, and what is the accessibility baseline of a carousel PDF? | LinkedIn offers alt text on images (limit unspecified; no mention for documents), auto captions in 10 languages with review before publishing, and a document title; carousel PDFs are images of text unless authored accessibly | https://www.linkedin.com/help/linkedin/answer/a519856 (LI) ; https://www.linkedin.com/help/linkedin/answer/a1327025 (LI) ; https://www.linkedin.com/help/linkedin/answer/a1369389 (LI) | no | high | Yes: alt text present on every image, captions reviewed, document title set, slide text contrast and minimum size, tagged PDF reading order |
| 23 | What do poll limits imply for a developer-tool audience? | LinkedIn: question 140, option 30 characters, 2-4 options (iOS 5), cannot edit after creation; polls cannot be boosted; one poll vote per member | https://www.linkedin.com/help/linkedin/answer/a527270 (LI) ; https://www.linkedin.com/help/linkedin/answer/a522948 (LI) | no | low | Yes: character and option count lint against dated limits |
| 24 | How many hashtags and which kind? | LinkedIn only says hashtags make content "more discoverable"; no count limit found; vendors say up to three | https://www.linkedin.com/help/linkedin/answer/a519848 (LI, "4 years ago") ; https://sproutsocial.com/insights/linkedin-algorithm/ (3P) | no | medium | Yes: count and relevance lint; limit labelled 3P |
| 25 | Tagging rules: when does tagging help or count as spam? | LinkedIn: mentioned member gets email and app notice, non-connections can be mentioned, LinkedIn may limit mentioning non-connections; no max stated | https://www.linkedin.com/help/linkedin/answer/a525082 (LI) | no | medium | Yes: cap on mentions per post, each mention relevant and consented |
| 26 | Comment strategy: replies, pinned comments, comments on others' posts | LinkedIn lets the author pin a comment (own or others, not replies) and says to reply to comments; "Author" tag shown; verified comments filter exists | https://www.linkedin.com/help/linkedin/answer/a16666203 (LI) ; https://www.linkedin.com/help/linkedin/answer/a519848 (LI) | no | high | Partly: plan includes a reply window and pinned comment; reply quality not checkable |
| 27 | Is the "first hour" window real, and what does it say about posting time? | Vendors give conflicting times without sample sizes; LinkedIn creator page says to adjust posting times to your own audience | https://members.linkedin.com/create-optimize (LI, adjust to your audience) ; https://blog.hootsuite.com/linkedin-algorithm/ (3P) | no | low | No; skill says measure your own |
| 28 | Does old content resurface? | Hootsuite: posts 2-3 weeks old can resurface; LinkedIn analytics retention: 1,000 days for engagement counts | https://www.linkedin.com/help/linkedin/answer/a525196 (LI) ; https://blog.hootsuite.com/linkedin-algorithm/ (3P) | no | low | No |
| 29 | Newsletter and article: are they worth it for a small dev-tool team, and what are the limits? | Page access needs more than 150 followers or connections, recent original content and good policy standing; recommended logo 300x300 and cover 1920x1080; no title or length limits stated; articles not on mobile | https://www.linkedin.com/help/linkedin/answer/a591266 (LI) ; https://www.linkedin.com/help/linkedin/answer/a517940 (LI) ; https://www.linkedin.com/help/linkedin/answer/a522427 (LI) | no | low | Partly: access check; image size check against the dated table |
| 30 | What link preview rules apply when a link post is unavoidable? | LinkedIn: og:title, og:image, og:description, og:url required; image at least 1200x627, 1.91:1, max 5 MB; under 401 px wide shows as thumbnail; Post Inspector refreshes cached previews | https://www.linkedin.com/help/linkedin/answer/a521928 (LI) ; https://www.linkedin.com/help/linkedin/answer/a525301 (LI) ; https://www.linkedin.com/help/linkedin/answer/a6233775 (LI) | partial (owned-site OG tags are a site concern) | medium | Yes: fetch the page, read the four og tags, check image dimensions and size |
| 31 | Image post size and aspect limits | LinkedIn: up to 20 images, 5 MB each, minimum 552x276, recommended 1080 wide, aspect 3:1 to 4:5, a post carries a link or an image, not both; 36 megapixel ceiling | https://www.linkedin.com/help/linkedin/answer/a527229 (LI) ; https://www.linkedin.com/help/linkedin/answer/a564109 (LI) | no | medium | Yes: image dimension, size and count check |
| 32 | Which metrics should a developer-tool post be judged on, and is engagement rate comparable across vendors? | LinkedIn defines impressions, members reached (estimate), video view (more than 2 seconds); vendor rate definitions differ; retention windows 180 days to 1,000 days | https://members.linkedin.com/create-optimize (LI) ; https://www.linkedin.com/help/linkedin/answer/a525196 (LI) ; https://www.socialinsider.io/social-media-benchmarks/linkedin (3P) | no | high | Partly: plan states one metric and its definition; UTM on repo links checkable |
| 33 | Do vendor benchmark methodologies hold up? | Socialinsider's methodology line says "January 2025 - December 2026" on a March 2026 page; pages under 1,000 followers excluded | https://www.socialinsider.io/social-media-benchmarks/linkedin (3P) | no | medium | Yes: each number cites sample, filter and date |
| 34 | How do advocate posts feed LinkedIn AI search visibility? | LinkedIn marketing blog positions advocate voices as inputs to AI search | https://www.linkedin.com/business/marketing/blog/ai-search/can-brand-advocates-improve-your-linkedin-ai-search-visibility (LI, 12 Nov 2026) | no | low | No; monitor |
| 35 | Does cross-posting a launch across personal, company and employee accounts count as coordinated engagement? | Policies bar agreeing in advance to like or re-share each other's content; repost rules limit reposting to public posts | https://www.linkedin.com/legal/professional-community-policies (LI) ; https://www.linkedin.com/help/linkedin/answer/a525047 (LI) | no | high | Partly: rule bans scripted "everyone like this" requests; unclear line needs a deep dive |
| 36 | Do sponsorship or funding mentions by open-source maintainers need disclosure? | Material-connection rule extends to financial ties | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers (official, Nov 2019) | no | low | Yes: same disclosure lint |
| 37 | Repurposing README or release notes into a post (and the Page RSS import) | Verbatim reuse loses the hook; LinkedIn Page RSS import needs super or content admin and rights to the source, and posts are "ready to publish" only via notification | https://www.linkedin.com/help/linkedin/answer/a6804862 (LI) ; https://www.linkedin.com/help/linkedin/answer/a6850421 (LI) | partial (docs-quality covers the source docs) | medium | Yes: draft must differ from source and hook fit the fold budget |
| 38 | What share of reach is personal-profile and how should a team plan advocacy? | LinkedIn creator page: CEO posts get 4x engagement and 7x impressions (LinkedIn internal data); collaborative posts allow up to 5 collaborators, public only, early access | https://members.linkedin.com/create-grow (LI) ; https://www.linkedin.com/help/linkedin/answer/a14240120 (LI) | no | medium | Partly: roster of authors in the plan |
| 39 | Is a heavy-AI generated launch post penalised, and what does generic content cost in reach? | van der Blom page: posts with no concrete detail fell from -11% to -28% of author average; detail plus lived experience rose from +6% to +14%; LinkedIn says generic content "less likely to be widely distributed" | https://richardvanderblom.com/insights-playbook/ (3P) ; https://www.linkedin.com/help/linkedin/answer/a1481496 (LI) | no | high | Yes: draft must contain a concrete specific (version number, command, measured result) and first-person detail; lint |
| 40 | What do unprofessional or low-quality videos cost, and is the penalty reversible? | LinkedIn: strong negative feedback may reduce reach to non-followers; "temporary, not permanent" | https://www.linkedin.com/help/linkedin/answer/a10728043 (LI, "7 months ago") | no | medium | Partly: video checklist (captions, hook, relevance); outcome not checkable |
| 41 | Which post controls (comment control, visibility, edit after publish) change risk for launches? | Visibility Anyone, Connections only or Group cannot change after posting; comment control can be set before or after; Page post edits only text, URLs, mentions, hashtags | https://www.linkedin.com/help/linkedin/answer/a523384 (LI) ; https://www.linkedin.com/help/linkedin/answer/a523141 (LI) ; https://www.linkedin.com/help/linkedin/answer/a567075 (LI) | no | low | Yes: checklist item for visibility set to Anyone before posting |

## Dated facts

LI = LinkedIn's own page; 3P = third party. LinkedIn help pages carry only a
relative "Last updated" marker, taken on 2026-11-27 (so "2 months ago" means about
Sep 2026). A relative marker is stated as shown; no absolute date is invented.

| Fact | Source URL | Source date | Tag |
|---|---|---|---|
| Posts can contain up to 3,000 characters; longer content should be an article | https://www.linkedin.com/help/linkedin/answer/a528176 | "2 months ago" | LI |
| A post that includes a link can carry up to 3,000 characters of text; link preview image frame 1.91:1 at 1200 x 627 | https://www.linkedin.com/help/linkedin/answer/a525301 | "2 years ago" | LI |
| Document posts: max 100 MB and 300 pages; PPT, PPTX, DOC, DOCX, PDF; mixed page sizes must be unified, layered PDFs flattened; videos and animations render as static images | https://www.linkedin.com/help/linkedin/answer/a518909 | "3 years ago" | LI |
| One document per post; title and description editable, document not replaceable; accepted formats; download via full-screen view | https://www.linkedin.com/help/linkedin/answer/a523054 | "3 years ago" | LI |
| Media types: images GIF, JPEG, PNG, WEBP, HEIF/HEIC (iOS); videos MP4, MOV, WEBM (desktop and Android), MKV (desktop); max file 100 MB, 300 pages, 1M words, 36 MP images, GIF 500 frames or 36,152,320 pixels | https://www.linkedin.com/help/linkedin/answer/a564109 | "2 months ago" | LI |
| Image post: up to 20 images, 5 MB each, minimum 552x276, recommended 1080 wide, aspect 3:1 to 4:5, link or image not both, alt text via ALT, tagging via Tag | https://www.linkedin.com/help/linkedin/answer/a527229 | "1 day ago" | LI |
| Video: 3 s (2 s mobile) to 15 min, 75 KB to 5 GB, 256x144 to 4096x2304, 1:2.4 to 2.4:1, 10-60 fps, 192 Kbps to 30 Mbps; auto captions in 10 languages; keep edges free of key elements | https://www.linkedin.com/help/linkedin/answer/a7174587 | "2 years ago" | LI |
| One video per post, animated GIFs not supported, cannot post directly to the immersive video feed; feed content based on quality and relevance of existing videos; videos may appear in feed, tab or carousel by relevance and performance | https://www.linkedin.com/help/linkedin/answer/a554001 ; https://www.linkedin.com/help/linkedin/answer/a6290168 | "2 years ago"; "7 months ago" | LI |
| Video visibility depends on relevance, quality, member feedback and automated signals; strong negative feedback reduces reach to non-followers temporarily | https://www.linkedin.com/help/linkedin/answer/a10728043 | "7 months ago" | LI |
| Auto captions in English, Spanish, Portuguese, French, German, Italian, Indonesian, Turkish, Arabic, Dutch; review-before-publish setting; scheduled posts reviewed only after posting | https://www.linkedin.com/help/linkedin/answer/a1327025 | "2 years ago" | LI |
| Alt text available on feed and article images; no character limit stated; documents not mentioned | https://www.linkedin.com/help/linkedin/answer/a519856 | "3 years ago" | LI |
| Poll question up to 140 characters, options up to 30; two to four options (iOS up to five); default duration one week; cannot edit after creation | https://www.linkedin.com/help/linkedin/answer/a527270 ; https://www.linkedin.com/help/linkedin/answer/a522948 | "1 year ago"; "3 years ago" | LI |
| Scheduling: at least 10 minutes, at most 3 months ahead; 30-minute increments or exact time; not for events or jobs | https://www.linkedin.com/help/linkedin/answer/a1347212 | "2 months ago" | LI |
| Mentions: no stated maximum; non-connections can be mentioned; mentioned person is notified; LinkedIn may limit mentioning non-connections | https://www.linkedin.com/help/linkedin/answer/a525082 | "2 years ago" | LI |
| Pin a comment: own posts only, own or others' comments, not replies; shows on top in both sort views | https://www.linkedin.com/help/linkedin/answer/a16666203 | "1 month ago" | LI |
| Comment control: Anyone, Connections only, No one; can change before or after posting | https://www.linkedin.com/help/linkedin/answer/a523384 | "1 year ago" | LI |
| Comments can include images and GIFs; LinkedIn may cap comments per period and limit visibility of comments made with excessive automation | https://www.linkedin.com/help/linkedin/answer/a524166 | "3 weeks ago" | LI |
| Repost: only public posts; groups and connections-only posts not repostable; LinkedIn may cap comments or limit reposting of non-connections | https://www.linkedin.com/help/linkedin/answer/a525047 | "3 weeks ago" | LI |
| Link preview needs og:title, og:image, og:description, og:url; image at least 1200x627, 1.91:1, up to 5 MB; under 401 px wide shown as thumbnail | https://www.linkedin.com/help/linkedin/answer/a521928 | "3 years ago" | LI |
| Post Inspector refreshes a cached preview for new posts only | https://www.linkedin.com/help/linkedin/answer/a6233775 | "3 years ago" | LI |
| Newsletter: any member can create; Page access needs more than 150 followers or connections, recent original content, good policy standing; logo 300x300, cover 1920x1080 recommended | https://www.linkedin.com/help/linkedin/answer/a591266 ; https://www.linkedin.com/help/linkedin/answer/a517940 | "3 years ago" | LI |
| Articles not available in the mobile app; no title or body limit stated | https://www.linkedin.com/help/linkedin/answer/a522427 | "3 months ago" | LI |
| Page posts: only super admins or content admins post; posts stay visible up to one year or 500 posts; editing limited to text, URLs, mentions, hashtags; Page RSS import requires source rights | https://www.linkedin.com/help/linkedin/answer/a567075 ; https://www.linkedin.com/help/linkedin/answer/a6804862 | "3 months ago"; "1 year ago" | LI |
| Collaborative posts: up to 5 collaborators, must be public, early access, supports text, image, video, link, document, poll, event | https://www.linkedin.com/help/linkedin/answer/a14240120 | "3 months ago" | LI |
| Boosting excludes polls, events, jobs, group and connections-only posts; boosted post is an ad reviewed within about 24 hours | https://www.linkedin.com/help/linkedin/answer/a6584635 | "7 days ago" | LI |
| Post analytics: retention 180 days for video, two years for article and newsletter, 1,000 days for engagement counts, 400 days for members reached; own views count | https://www.linkedin.com/help/linkedin/answer/a525196 | "1 week ago" | LI |
| Metric definitions: impressions, members reached (estimate), video view = more than 2 seconds | https://members.linkedin.com/create-optimize | 2026 (no date) | LI |
| LinkedIn creator advice: 2-5 posts per week, hook first, question and call to action, mix of formats | https://members.linkedin.com/create-start | 2026 (no date) | LI |
| LinkedIn creator advice: video 90 seconds or less, vertical, captions on; CEO posts 4x engagement and 7x impressions (LinkedIn internal data) | https://members.linkedin.com/create-grow | 2026 (no date) | LI |
| Members who post twice per week see "up to five times more profile views" on average | https://www.linkedin.com/help/linkedin/answer/a7134086 | "1 year ago" | LI |
| Distribution rests on connection strength, followers, relevance; "avoid being overly promotional"; no ranking thresholds or link statements | https://www.linkedin.com/help/linkedin/answer/a516930 | "1 month ago" | LI |
| Recommended posts must be professionally relevant, avoid heavy promotion, include text, image or video; matched using past interactions, profile details and engagement likelihood | https://www.linkedin.com/help/linkedin/answer/a1499047 | "1 month ago" | LI |
| New accounts shown narrowly; non-connection comments go to Most Recent; verification "doesn't guarantee broader reach" | https://www.linkedin.com/help/linkedin/answer/a16425028 | "1 month ago" | LI |
| AI-assisted content: value judged, not creation method; generic or repetitive content less likely widely distributed; disclose when heavy AI role not obvious; no formal AI label; "Seems like AI slop" feedback | https://www.linkedin.com/help/linkedin/answer/a1481496 | "1 month ago" | LI |
| LinkedIn's AI writing tool for posts is no longer available | https://www.linkedin.com/help/linkedin/answer/a1517763 | "4 months ago" | LI |
| Prohibited: bots, scrapers, extensions that automate LinkedIn, tools that manipulate content algorithms; accounts may be restricted or shut down; pods not named | https://www.linkedin.com/help/linkedin/answer/a1341387 | "2 years ago" | LI |
| Feed retrieval is an LLM-embedding dual encoder; ranking is a generative recommender over past interactions with click, skip, dwell, like, comment, share heads; no weights disclosed | https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed | 12 Mar 2026 | LI |
| No demographic signals determine content visibility; fairness tested pre-launch | https://www.linkedin.com/blog/engineering/feed/putting-members-first-testing-and-measuring-how-content-appears-in-your-feed | 20 Nov 2025 | LI |
| Dwell time and skip thresholds introduced as ranking features | https://www.linkedin.com/blog/engineering/feed/understanding-feed-dwell-time | 12 May 2020 | LI (old) |
| User Agreement 8.2 bans bots and unauthorized automation, manipulating algorithms; effective 3 Nov 2025 | https://www.linkedin.com/legal/user-agreement | 3 Nov 2025 | LI |
| Policies bar spam, agreeing in advance to like or re-share each other's content, misleading content, undisclosed endorsements; synthetic media of a person must be disclosed | https://www.linkedin.com/legal/professional-community-policies | undated, 2026 footer | LI |
| Van der Blom playbook page: 2026 Annual Edition (200+ pages) plus November Update; 1.3M+ posts in 2026 edition, 800K+ posts from 25,000+ profiles and 8,000+ pages in the update; "Comment KEYWORD" posts from +18% to -45% of author average reach; no-detail generic posts from -11% to -28%; detail plus experience +6% to +14%; pinned comment with link reaches 12% of readers, fun fact 19%, open question 18%. Sales page, no method shown | https://richardvanderblom.com/insights-playbook/ | Nov 2026 (inferred from page text; no date stated) | 3P vendor, incomplete |
| Native documents 7.00% engagement, multi-image 6.45%, video 6.00%, image 5.30%, text 4.50%, poll 4.20%, link 3.25% (2025); Q3 2026 link 2.50%, text 3.50%; 2.45M posts from ~26,000 company pages, organic only; engagement = (reactions+comments+shares)/impressions | https://www.socialinsider.io/social-media-benchmarks/linkedin | published 16 Mar 2026, modified 6 Nov 2026 | 3P vendor |
| Carousels about 17x the interactions of images; 600,000 posts from 60,000 accounts | https://metricool.com/linkedin-algorithm/ | 26 Mar 2026 | 3P vendor |
| Posting 2-5/week: +1,182 impressions per post vs once a week; 6-10: +5,001; 11+: +16,946; 2M+ posts, 94,000+ accounts | https://buffer.com/resources/how-often-to-post-on-linkedin/ | 28 Aug 2025 | 3P vendor |
| Scheduling not penalised and links not penalised if post has value (LinkedIn staff quoted) | https://buffer.com/resources/linkedin-algorithm/ | 19 Dec 2025 | 3P citing LI interviews |
| Saves ~5x and comments ~2x the reach of a like (Authored Up, 3M+ posts) | https://blog.hootsuite.com/linkedin-algorithm/ | 14 Jul 2026 | 3P, secondhand |
| Personal post 1,300, company update 700, article headline 100, article body 110,000 | https://sproutsocial.com/insights/social-media-character-counter/ | 26 Jul 2021 | 3P, STALE; contradicted by LinkedIn's 3,000 post limit |
| EU AI Act Article 50 duties apply from 2 Aug 2026; Code of Practice final 10 Jun 2026 | https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content | 2026 | official |
| FTC: employment is a material connection; disclose where hard to miss, not behind "more" | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | Nov 2019 | official |

The 2021 Sprout figure of 1,300 for posts is superseded: LinkedIn's own help page now says 3,000.
Do not use the 1,300 and 700 figures.

## Contested

| Question | Side A | Side B |
|---|---|---|
| Do outbound links hurt reach? | Standalone no-link posts earn stronger signals ([Sprout, 28 Jan 2026](https://sproutsocial.com/insights/linkedin-algorithm/)); link posts lowest at 3.25% in 2025 ([Socialinsider](https://www.socialinsider.io/social-media-benchmarks/linkedin)); LinkedIn's image help says a post carries a link or an image, not both ([LI](https://www.linkedin.com/help/linkedin/answer/a527229)) | LinkedIn staff say links are not penalised if the post has value ([Buffer, 19 Dec 2025](https://buffer.com/resources/linkedin-algorithm/)); LinkedIn's help states a link post can carry 3,000 characters of text ([LI](https://www.linkedin.com/help/linkedin/answer/a525301)) and says nothing about a link penalty; lower link-post engagement may reflect low-effort posts. No controlled test found |
| Cadence | LinkedIn: 2-5 posts per week ([LI](https://members.linkedin.com/create-start)); Buffer's algorithm article agrees ([19 Dec 2025](https://buffer.com/resources/linkedin-algorithm/)) | Buffer's frequency study: impressions rise through 11+/week ([28 Aug 2025](https://buffer.com/resources/how-often-to-post-on-linkedin/)); likely selection effect |
| Best format | Documents top on Socialinsider 2025 (7.00%) ([source](https://www.socialinsider.io/social-media-benchmarks/linkedin)) | Multi-image beat documents in Q2 2026 on the same vendor; Sprout says the algorithm does not favour a format ([Sprout](https://sproutsocial.com/insights/linkedin-algorithm/)); LinkedIn itself favours video in its creator advice ([LI](https://members.linkedin.com/create-grow)) |
| Is video growing? | LinkedIn: video the fastest-growing format, uploads up 34% year over year ([LI creator page](https://members.linkedin.com/create-grow)) | Video views down 36% year on year and Q3 2026 video engagement 5.25% ([Socialinsider](https://www.socialinsider.io/social-media-benchmarks/linkedin)); engagement per post and upload volume are different measures |
| Best posting time | Wed 8-10 AM, Thu 9 AM and 1-2 PM ([Socialinsider blog](https://www.socialinsider.io/blog/linkedin-algorithm)) | 4-6 AM Tue/Wed ([Hootsuite](https://blog.hootsuite.com/linkedin-algorithm/)); LinkedIn says adjust to your own audience ([LI](https://members.linkedin.com/create-optimize)) |
| Is generic AI content suppressed? | LinkedIn: generic or repetitive content "less likely to be widely distributed" ([LI](https://www.linkedin.com/help/linkedin/answer/a1481496)); van der Blom: no-detail posts fell to -28% ([page](https://richardvanderblom.com/insights-playbook/)); Metricool asserts suppression ([source](https://metricool.com/linkedin-algorithm/)) | LinkedIn says it judges value, not how content was created; no formal AI label and the "Seems like AI" tip "is not a takedown or policy decision" ([LI](https://www.linkedin.com/help/linkedin/answer/a1481496)); the penalty is for generic content, not AI use |
| Is "virality deprioritised" a real change? | Buffer relays LinkedIn staff: connections and conversations over most-engaged ([19 Dec 2025](https://buffer.com/resources/linkedin-algorithm/)) | LinkedIn's 12 Mar 2026 post says trending posts can reach members within minutes ([LI](https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed)); both can hold at different stages |
| Comment keyword automation ("comment X for the PDF") | van der Blom page: such posts now below the author's average reach (-45%) ([page](https://richardvanderblom.com/insights-playbook/)) | LinkedIn help says only that comments made through excessive automation may have visibility limited ([LI](https://www.linkedin.com/help/linkedin/answer/a524166)); no LinkedIn statement on keyword calls to action |
