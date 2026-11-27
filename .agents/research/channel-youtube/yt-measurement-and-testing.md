---
title: YouTube measurement and testing for a small developer-tool channel
program: product
sub_program: channels
topic: channel-youtube
worker: yt-measurement-and-testing
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
scope: What a view, impression CTR and Intro retention mean in 2026, what Test and Compare is and requires, the smallest effect detectable at small volumes (computed), and the metric, threshold and Shorts-test rules a skill may apply. Not covered - format choice (yt-format-portfolio), packaging craft, YouTube Partner Program money rules, TikTok/Instagram definitions.
---

# YouTube measurement and testing

## Contents
1. Summary
2. Findings (F1 to F8)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary
- Two view definitions changed. Shorts counted every start or replay from 2025-03-31. From 2026-08-24 every format counts from the first frame, and the old definition is now called "engaged views". A time series crossing either date has a step in it.
- Long-form, Live and Shorts public view counts include estimated TV co-viewers from 2026-11-16 (three days before the research date). Annotate any series that crosses it.
- Impressions CTR, average view duration and retention still run on engaged views per [YouTube's 2026-08-19 post](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/). CTR is therefore not affected by the first-frame change.
- Half of all channels have an impressions CTR between 2% and 10% ([YouTube Help 7628154](https://support.google.com/youtube/answer/7628154), undated, footer 2026). 3% is not "bad".
- The retention report's "Intro" ([Help 9314415](https://support.google.com/youtube/answer/9314415)) is the share still watching after 30 seconds. YouTube gives no benchmark.
- Test and Compare ([Help 16391400](https://support.google.com/youtube/answer/16391400), undated, footer 2026): up to 3 variants, winner chosen by watch time (not CTR), desktop Studio only, long-form and Live Archives only, "completed within two weeks". YouTube states no minimum views or impressions.
- Measured (python3 -I, alpha 0.05 two-sided, power 0.80): at 12 and 7 views nothing is detectable. At 1,000 impressions per arm a CTR of 4% must rise to 6.8% to be detected (x1.7). At 10,000 per arm, 4% to 4.8% (x1.2).
- The channel "ocx" has 2 videos with 12 and 7 views ([distribution-posture.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md) line 31). A skill must report "insufficient data" for it, not a verdict.
- The "twenty-ninth" ratio reproduces: company median 2,506 views vs educator 72,825 is 29.06x ([exemplar-youtube-channels.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md), smell 2). Measured by the fleet audit on 15-video windows.
- Recommendation: do not run Test and Compare below roughly 1,000 impressions per variant in the test window. Pick one packaging, reuse the same template, and compare only against the channel's own last 10 similar videos.

## Findings

### F1. What counts as a view (reproduced, with two corrections to the scout)
- Shorts, 2025-03-31: "Views will count the number of times a Short starts to play or replay, with no minimum watch time requirement"; the old metric is renamed "Engaged views" ([YouTube Help 10059070](https://support.google.com/youtube/answer/10059070), page says "Starting 3/31/2025"; [API revision history](https://developers.google.com/youtube/v3/revision_history), entry 2025-03-26). Reproduces.
- Correction 1: the first-frame rule is not Shorts-only. [YouTube's post of 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/) says that from 2026-08-24 views count "from the first frame across all formats, including Shorts". The previous view definition is now an engaged view ("clicking to watch or watching past the initial seconds"). CTR, average view duration and retention still rely on engaged views; recommendations and YPP are unchanged. This is platform-authored.
- The podcast "view change of 24 Aug 2026" in the scout is this same change, reported by [Podnews 2026-08-18](https://podnews.net/update/youtube-views-change) (independent trade press). Podnews says engaged views disappear from public pages and the Public Data API and stay in Studio and the Analytics and Reporting APIs. Podnews's guess that engaged views meant 30 seconds is unconfirmed by YouTube.
- Co-views: the API revision history says "Starting November 16, 2026, YouTube will include co-views" in public view counts for long-form, Live and Shorts, and concurrent live counts. [Help 2991785](https://support.google.com/youtube/answer/2991785) says "Beginning November 2026" and describes estimated individual viewers watching together on TV. [Analytics API metrics](https://developers.google.com/youtube/analytics/metrics): `views` "includes co-views when multiple people watch together on a television screen"; `estimatedMinutesWatched` includes co-views; `engagedViews` is "viewed past the first frame, or the user clicks/taps to play".
- Correction 2: the scout wrote co-view applies to long-form only; the revision history names long-form, Live and Shorts.
- Not defined by YouTube in fetched pages: `videoThumbnailImpressions` and `videoThumbnailImpressionsClickRate` are absent from the metrics page text (not found in the fetch; the Studio definitions are in Help 9314486).

### F2. Impressions and CTR
- Definition: CTR "measures how often viewers watched a video after seeing a registered impression on YouTube" ([Help 7628154](https://support.google.com/youtube/answer/7628154), footer 2026, no page date). Registered means shown more than 1 second with at least 50% of the thumbnail visible; background tabs, external sites and apps, YouTube Music and Kids are not counted ([Help 9314486](https://support.google.com/youtube/answer/9314486)).
- Range: "Half of all channels and videos on YouTube have an impressions CTR that can range between 2% and 10%." Reproduces. Newer videos and videos under 100 views "can show a wider range". Check CTR "after getting a substantial number of impressions" and not immediately after upload.
- Do not test several thumbnails or titles on one video by swapping: traffic sources confound CTR. Reproduces.
- YouTube gives no numeric meaning to "substantial". The floor below is derived from measurement (F5), not from YouTube.

### F3. Retention and Intro
- "Intro tells you what percentage of your audience still watched your video after the first 30 seconds." Key moments need a video at least 60 seconds long with at least 100 views. Data takes about one to two days. Compare with videos of similar length and with your 10 most recent similar videos ([Help 9314415](https://support.google.com/youtube/answer/9314415)). Reproduces. No numeric benchmark exists.
- Intro is measured on engaged views; since 2026-08-24 the denominator is unchanged per the 2026-08-19 post.

### F4. Test and Compare
All reproduced from [Help 16391400](https://support.google.com/youtube/answer/16391400) and [13861714](https://support.google.com/youtube/answer/13861714) (both undated, footer 2026):
- Up to 3 titles and/or thumbnails; title only, thumbnail only, or both.
- Winner is the option with the highest watch time; no clear winner means the first uploaded option is shown. Result states: Winner, Performed Same, Inconclusive.
- Desktop only, via Studio. Needs Advanced features. Long-form and Live Archives only; not Shorts, scheduled lives, in-progress premieres, made-for-kids, mature or private videos.
- "Your test should be completed within two weeks", sometimes a few days. Editing title or thumbnail mid-test stops it.
- Any variant under 1280x720 downgrades all to 854x480.
- More views make a Winner more likely and too few impressions can prevent one; no number is given. Tips: test older videos first, use clearly different options.
- Launch: [Search Engine Journal, 2024-06-11](https://www.searchenginejournal.com/youtube-rolls-out-thumbnail-a-b-testing-to-all-channels/519281/): "optimizing for overall watch time share over other metrics". Independent reporting of a platform statement.

### F5. Measured: smallest detectable difference
Command (run 2026-11-27, re-run in this repair pass with identical output): save the script below as `mde.py` and run `python3 -I mde.py`. Assumptions: two-sided alpha 0.05, power 0.80, equal n per arm, normal approximation with unpooled variance under the alternative, bisection for the smallest p1 above baseline. The script uses two baselines (CTR 4% and 6%, inside the 2 to 10% range; view-through 40% and 50%, assumed, no YouTube figure).

| n per arm | CTR base 4% needs | CTR base 6% needs | view-through base 40% needs | base 50% needs |
|---|---|---|---|---|
| 7 (ocx second video, 7 views) | 70.4% | 73.2% | 100% (undetectable) | 100% |
| 12 (ocx first video, 12 views) | 53.2% | 56.4% | 91.6% | 97.8% |
| 100 | 15.8% | 19.0% | 59.7% | 69.3% |
| 1,000 | 6.8% | 9.3% | 46.2% | 56.2% |
| 10,000 | 4.8% | 7.0% | 41.9% | 52.0% |

```python
from math import sqrt
from statistics import NormalDist
N=NormalDist(); a=0.05; pw=0.80
za=N.inv_cdf(1-a/2); zb=N.inv_cdf(pw)
def mde(p0,n):
    # smallest p1>p0 detectable, two-proportion, equal n per arm, unpooled-normal approx, bisection
    lo,hi=p0,1.0
    for _ in range(80):
        p1=(lo+hi)/2
        pb=(p0+p1)/2
        need=((za*sqrt(2*pb*(1-pb))+zb*sqrt(p0*(1-p0)+p1*(1-p1)))**2)/((p1-p0)**2)
        if need>n: lo=p1
        else: hi=p1
    return hi
for p0 in (0.04,0.06):
  for n in (12,7,100,1000,10000):
    p1=mde(p0,n)
    print(f"base {p0:.0%} n/arm {n}: detectable {p1:.1%} (abs +{(p1-p0)*100:.1f}pt, rel x{p1/p0:.2f})" if p1<1 else "none")
for p0 in (0.4,0.5):
  for n in (12,7,100,1000,10000):
    p1=mde(p0,n); print(f"view-through base {p0:.0%} n/arm {n}: {p1:.1%}")
# n per arm needed to detect 4%->5%
for p0,p1 in ((0.04,0.05),(0.04,0.06)):
    pb=(p0+p1)/2; print(p0,p1,round(((za*sqrt(2*pb*(1-pb))+zb*sqrt(p0*(1-p0)+p1*(1-p1)))**2)/((p1-p0)**2)))
```

- Impressions needed per arm to detect 4% to 5% CTR: 6,745. To detect 4% to 6%: 1,863.
- Caveats: the normal approximation is poor at n of 7 and 12 (rows are indicative: "nothing detectable"). The 12 and 7 are views, used as n only to show scale; a real test counts impressions. A 3-arm test splits traffic three ways and needs a multiple-comparison correction, so figures above are optimistic for Test and Compare. YouTube's winner statistic is watch time share, not a proportion; the table bounds CTR only.
- Single-channel descriptive precision (not a comparison): 95% half-width for CTR 5% is about 1.35 points at 1,000 impressions and 4.3 points at 100 (command: `python3 -I -c "from math import sqrt; print([round(1.96*sqrt(.05*.95/n)*100,2) for n in (100,1000)])"`, formula 1.96*sqrt(p(1-p)/n); output 4.27 and 1.35).

### F6. Shorts metrics available
- Public views from 2026-08-24 count from first frame, so they say little about interest. The meaningful series is engaged views (Studio, API) and the Shorts report "How viewers engaged": "the percentage of times viewers stayed to watch past the initial seconds of a Short" ([Help 12220281](https://support.google.com/youtube/answer/12220281)). The search snippet used the older name "Viewed vs swiped away"; the fetched page uses "How viewers engaged" and "Stayed to watch".
- No official benchmark for these exists; creator blogs cite ranges, which this dive does not use.

### F7. Audience-size anchor
- Company median video 2,506 views, educator median 72,825 (ratio 29.06): [exemplar-youtube-channels.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md) smell 2, 30 channels, 15-video windows (measurement by the audit, command in that file). Reproduces.
- Even the company median of 2,506 views, at an assumed 4% CTR, implies on the order of 60,000 impressions, so only large company channels could ever run a powered test. The ocx channel is five orders of magnitude below that.
- Cross-territory (one line, left to others): verification claims for retention graphs belong to yt-packaging.

### F8. Decisions

Metrics a skill may report (always with definition, date range, and the line "view = first frame since 2026-08-24"):

| Metric | Definition source | Definition date or regime |
|---|---|---|
| Views | [Help 10059070](https://support.google.com/youtube/answer/10059070), [blog 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/) | Shorts since 2025-03-31 start or replay; all formats first frame since 2026-08-24; co-views since 2026-11-16 |
| Engaged views | [blog 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/), [Analytics API metrics](https://developers.google.com/youtube/analytics/metrics) | since 2026-08-24 (renamed old view) |
| Impressions CTR | [Help 7628154](https://support.google.com/youtube/answer/7628154), [9314486](https://support.google.com/youtube/answer/9314486) | undated, registered impressions only |
| Intro retention | [Help 9314415](https://support.google.com/youtube/answer/9314415) | after 30 seconds, undated |
| Average view duration | [API metrics](https://developers.google.com/youtube/analytics/metrics) (excludes looping clips since 2021-12-13) | engaged views basis |
| Watch time | [Help 9314486](https://support.google.com/youtube/answer/9314486) | includes co-viewers |
| Test and Compare result | [Help 16391400](https://support.google.com/youtube/answer/16391400) | Winner, Performed Same, Inconclusive |

Volume thresholds (derived from F5; not from YouTube):
- CTR: report "insufficient data" under 1,000 registered impressions on the video. Between 1,000 and 10,000 report the number with a 95% interval and no ranking claim. Treat a change smaller than the F5 detectable difference as noise.
- Retention, Intro: "insufficient data" under 100 views (YouTube's own key-moments floor in [Help 9314415](https://support.google.com/youtube/answer/9314415) and the CTR note on "fewer than 100 views" in [Help 7628154](https://support.google.com/youtube/answer/7628154)) or under 2 days from upload.
- Channel-level comparisons: need at least 10 similar videos, matching [Help 9314415](https://support.google.com/youtube/answer/9314415)'s "10 latest videos of similar length" comparison.

90-day Shorts success test (series of at least 10 Shorts, 90 days from the first upload, measured on engaged views and the "stayed to watch" share, because public views are first-frame since 2026-08-24):
- Pass: the median engaged-view count per Short across the series is at least 1,000 AND at least one subscriber or one click to a tracked link (documentation, install page) is attributable to the series. Both numbers are decisions, not platform facts (see section 5); 1,000 is chosen because it is the impressions-per-arm point where a 1.7x CTR lift becomes detectable (F5) and because the company median long-form is 2,506 views (F7).
- Fail: stop the series, record "no measurable audience at 90 days", and do not publish a replacement series on the same premise without human approval. Mid-series, 14, 30 and 60-day readings are "insufficient data" under the same thresholds.
- Never judge a series on public view count: from 2026-08-24 it counts every first frame.

Test and Compare for this channel size: not worth running. Below about 1,000 impressions per variant (about 3,000 for three variants) in two weeks, the test cannot detect even a 1.7x CTR lift, and YouTube picks the first upload on no clear winner anyway. Use one clear title and thumbnail made to a template; revisit when a video reaches roughly 10,000 impressions in two weeks.

## Normative guidance candidates

Each rule: Severity, Rule, Rationale, Verify.

1. **Severity MUST.** Name the view definition and date range beside every view number.
   Rationale: three definition regimes exist (before 2025-03-31, to 2026-08-23, from 2026-08-24) plus co-views from 2026-11-16, so an unlabelled number is not comparable ([blog 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)).
   Verify: grep the report for "views" followed in the sentence by one of `engaged|first frame|since 20`; fail example: "the Short got 4,000 views."
2. **Severity MUST.** Annotate any series crossing 2025-03-31, 2026-08-24 or 2026-11-16 as a step.
   Rationale: each date changes what a view counts, so a crossing series shows a jump that is definition, not audience ([Help 10059070](https://support.google.com/youtube/answer/10059070), [blog](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/), [API revision history](https://developers.google.com/youtube/v3/revision_history)).
   Verify: script lists the three dates, checks the series start and end, fails if the series spans a date and the annotation string is absent.
3. **Severity MUST NOT.** Use public view count as the success metric for Shorts or podcasts after 2026-08-24; use engaged views from Studio or the Analytics API.
   Rationale: public views count from the first frame ([blog 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)).
   Verify: grep the success definition for "engaged".
4. **Severity MUST.** Report "insufficient data" for CTR under 1,000 registered impressions, and for retention under 100 views or under 2 days from upload.
   Rationale: YouTube says to read CTR "after getting a substantial number of impressions" and gives no number ([Help 7628154](https://support.google.com/youtube/answer/7628154)); 1,000 per arm is where a 1.7x lift becomes detectable (F5, derived, not a platform figure); retention data takes 1 to 2 days and key moments need 100 views ([Help 9314415](https://support.google.com/youtube/answer/9314415)).
   Verify: counts in the analytics export against the thresholds.
5. **Severity MUST NOT.** Call a CTR in 2% to 10% good or bad without a same-surface, same-age comparison.
   Rationale: "Half of all channels and videos on YouTube have an impressions CTR that can range between 2% and 10%" ([Help 7628154](https://support.google.com/youtube/answer/7628154)).
   Verify: the comparison set is named in the report; fail example "3% is poor", pass example "3% vs the channel's last 10 similar videos at the same age (median 3.4%)".
6. **Severity MUST NOT.** Conclude from before/after thumbnail or title swaps on one video.
   Rationale: "Differences in click-through-rate might be due to traffic sources, rather than the title or thumbnail" ([Help 7628154](https://support.google.com/youtube/answer/7628154)).
   Verify: grep for "before/after" or "swapped" conclusions; require a native test or the line "no conclusion".
7. **Severity MUST.** Check Test and Compare preconditions before planning: long-form or Live Archive; not Shorts, scheduled live, in-progress premiere, made-for-kids, mature or private; desktop Studio; Advanced features on; every variant at least 1280x720.
   Rationale: a failed precondition makes the test unavailable, and one sub-720p variant downscales all variants to 854x480, which changes what is compared ([Help 16391400](https://support.google.com/youtube/answer/16391400), [13861714](https://support.google.com/youtube/answer/13861714)).
   Verify: video metadata check plus `identify -format '%w %h' thumb.png` returning width at least 1280 and height at least 720.
8. **Severity MUST NOT.** Treat Inconclusive or Performed Same as a win; keep the first uploaded option when there is no winner.
   Rationale: Test and Compare shows the first uploaded option when there is no clear winner, so a non-Winner state carries no evidence of a better option ([Help 16391400](https://support.google.com/youtube/answer/16391400)).
   Verify: the result-state mapping table lists Winner, Performed Same, Inconclusive, and only Winner leads to a change.
9. **Severity SHOULD NOT.** Run Test and Compare under about 1,000 impressions per variant in the two-week window.
   Rationale: F5 shows a CTR of 4% must reach 6.8% to be detected at that size, and YouTube says too few impressions can prevent a Winner ([Help 16391400](https://support.google.com/youtube/answer/16391400)); the 1,000 figure is derived, not a YouTube number.
   Verify: impressions per arm in Studio before start; fewer means "not run".
10. **Severity MUST NOT.** State any Intro or retention benchmark number as a platform figure.
    Rationale: YouTube defines Intro as the share still watching after 30 seconds and publishes no benchmark ([Help 9314415](https://support.google.com/youtube/answer/9314415)).
    Verify: grep for "good intro" or a percentage next to "Intro" without a named own-channel comparison.
11. **Severity SHOULD.** Apply the 90-day Shorts test as written in F8 and record pass or fail with the date range.
    Rationale: without a stated end condition a series runs on hope; the test uses engaged views because public views count first frames ([blog](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)). Thresholds are owner decisions.
    Verify: report has start date, end date, N Shorts (at least 10), median engaged views, attributable actions.
12. **Severity MUST.** Give the retention comparison set as the channel's own 10 latest videos of similar length.
    Rationale: YouTube states "You can also use typical retention to compare your 10 latest videos of similar length" ([Help 9314415](https://support.google.com/youtube/answer/9314415)); no external benchmark exists.
    Verify: the report lists the 10 video IDs.
13. **Severity CONSIDER.** Report CTR with a 95% interval, 1.96*sqrt(p(1-p)/n).
    Rationale: at 100 impressions a 5% CTR has a half-width of 4.27 points, so a bare point estimate overstates precision (F5 command).
    Verify: an interval column is present in the CTR table.
14. **Severity MUST.** Wait at least 2 days after upload before reading retention, and do not read CTR immediately after upload.
    Rationale: "audience retention data typically takes 1-2 days to process" ([Help 9314415](https://support.google.com/youtube/answer/9314415)); new videos show a wider CTR range ([Help 7628154](https://support.google.com/youtube/answer/7628154)).
    Verify: export date minus publish date is at least 2 days.

## Dated facts

Source type: P = platform or authority itself, I = independent, V = vendor, M = measurement in this repo. "Undated" means the page shows only a "(c)2026 Google" footer, checked again by fetch on 2026-11-27.

| Fact | Source URL | Source date | Type |
|---|---|---|---|
| Shorts views count each start or replay with no minimum watch time; old metric renamed engaged views | [Help 10059070](https://support.google.com/youtube/answer/10059070) | from 2025-03-31 | P |
| From 2026-08-24 views count from the first frame in all formats; old definition is "engaged views"; CTR, average view duration, retention still use engaged views | [YouTube blog](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/) | 2026-08-19 | P |
| Podcast view change reported, engaged views leave public pages and the Public Data API | [Podnews](https://podnews.net/update/youtube-views-change) | 2026-08-18 | I |
| Public views include estimated TV co-viewers for long-form, Live, Shorts | [API revision history](https://developers.google.com/youtube/v3/revision_history), [Help 2991785](https://support.google.com/youtube/answer/2991785) | from 2026-11-16 | P |
| Half of channels and videos have impressions CTR between 2% and 10%; videos under 100 views show a wider range | [Help 7628154](https://support.google.com/youtube/answer/7628154) | undated | P |
| Impression registered when shown over 1 second with at least 50% of the thumbnail visible | [Help 9314486](https://support.google.com/youtube/answer/9314486) | undated | P |
| Intro is the share still watching after 30 seconds; key moments need 60 seconds length and 100 views; retention data takes 1 to 2 days | [Help 9314415](https://support.google.com/youtube/answer/9314415) | undated | P |
| Test and Compare: up to 3 variants, highest watch time wins, complete within two weeks, not Shorts or scheduled lives, desktop Studio | [Help 16391400](https://support.google.com/youtube/answer/16391400) | undated | P |
| Any thumbnail under 1280x720 downscales all to 854x480 | [Help 16391400](https://support.google.com/youtube/answer/16391400), [13861714](https://support.google.com/youtube/answer/13861714) | undated | P |
| Test and Compare launched to all channels, objective watch time share | [Search Engine Journal](https://www.searchenginejournal.com/youtube-rolls-out-thumbnail-a-b-testing-to-all-channels/519281/) | 2024-06-11 | I |
| Shorts report "How viewers engaged" = share who stayed past the initial seconds | [Help 12220281](https://support.google.com/youtube/answer/12220281) | undated | P |
| Company median 2,506 views vs educator 72,825, ratio 29.06 | [exemplar-youtube-channels.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md) | 2026-11 | M |
| ocx channel has 2 videos with 12 and 7 views | [distribution-posture.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md) | 2026-11 | M |
| Detectable CTR 4% to 6.8% at 1,000 per arm; 4% to 4.8% at 10,000; 6,745 per arm for 4% to 5% | F5 script in this file | run 2026-11-27 | M |

## AI-agent angle
- Agents quote public view counts as engagement; since 2026-08-24 public views are first-frame. Check: rule 3.
- Agents recall "a Shorts view needs about 30 seconds" or "a view needs 30 seconds"; both are wrong for the public number. Check: rule 1.
- Agents cite "Shorts view change March 2025" and miss the 2026-08-24 and 2026-11-16 changes. Check: rule 2.
- Agents declare a thumbnail "winner" from a 20-view difference. Check: rule 4 and 9.
- Agents pass a 4%/6% CTR as a verdict. Check: rule 5.
- Agents optimise Test and Compare for CTR; the platform picks by watch time. Check: rule 8 and the result-state table.

## Contested / evolving
- Whether CTR or watch time is the right target: YouTube's test picks by watch time and warns CTR alone favours clickbait ([Help 7628154](https://support.google.com/youtube/answer/7628154), [16391400](https://support.google.com/youtube/answer/16391400)); vendor tools and practitioners optimise CTR ([Toptal article cited in the scout, not re-fetched](https://www.toptal.com/creator/post/youtube-thumbnail-ab-testing)). This dive follows the platform and names the metric.
- Whether public views still mean anything: YouTube says recommendations and YPP are unchanged ([blog 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)); Podnews's 2026-08-19 [commentary](https://podnews.net/update/ignore-youtube) quotes Zachary Boone of YMH Studios saying all publishers should ignore the new figures. Unresolved; this dive uses engaged views.
- Co-view scope: Help says TV co-viewers; revision history lists long-form, Live and Shorts. Scout's long-form-only wording does not reproduce.
- Engaged views as 30 seconds: Podnews says widely believed, YouTube says "past the initial seconds". Do not state 30 seconds.

## What an agent must not decide alone
- The Shorts 90-day pass thresholds (1,000 median engaged views, one attributable action): a business decision on what audience justifies production cost; the agent proposes, the owner approves.
- Whether to stop a Shorts series or a channel after failure.
- Whether to enable Advanced features and the Studio permissions to run a test (account-level change).
- Publishing any title or thumbnail variant that makes a claim about performance or comparison with a competitor (brand and legal).
- Paying for third-party analytics tools or sharing channel analytics exports outside the team.

## Sources
| URL | What it is | Date | Why |
|---|---|---|---|
| https://support.google.com/youtube/answer/16391400 | Test and Compare Help (platform) | undated, footer 2026 | variants, states, scope |
| https://support.google.com/youtube/answer/13861714 | Thumbnail testing Help (platform) | undated, footer 2026 | 720p downscale |
| https://support.google.com/youtube/answer/7628154 | Impressions CTR Help (platform) | undated, footer 2026 | 2 to 10 percent, sample guidance |
| https://support.google.com/youtube/answer/9314415 | Audience retention Help (platform) | undated, footer 2026 | Intro 30 s, key moments |
| https://support.google.com/youtube/answer/9314486 | Reach metrics Help (platform) | undated, footer 2026 | impression, view, watch time definitions |
| https://support.google.com/youtube/answer/10059070 | Shorts view count change Help (platform) | 2025-03-31 | Shorts rule, engaged views |
| https://support.google.com/youtube/answer/2991785 | What counts as a view (platform) | "Beginning November 2026" | co-views |
| https://developers.google.com/youtube/v3/revision_history | API revision history (platform), first 100,000 of 225,372 characters read | entries 2025-03-26, 2026-11-16 | exact dates |
| https://developers.google.com/youtube/analytics/metrics | Analytics API metrics (platform) | undated; looping exclusion 2021-12-13 | metric definitions |
| https://blog.youtube/inside-youtube/engaged-views-youtube-explained/ | YouTube blog (platform) | 2026-08-19 | first-frame views, engaged views |
| https://support.google.com/youtube/answer/12220281 | Studio content performance Help (platform) | undated, footer 2026 | Shorts "How viewers engaged" |
| https://podnews.net/update/youtube-views-change | Podnews report (independent) | 2026-08-18 | podcast view change, API access |
| https://podnews.net/update/ignore-youtube | Podnews commentary (independent) | 2026-08-19 | opposing view |
| https://www.searchenginejournal.com/youtube-rolls-out-thumbnail-a-b-testing-to-all-channels/519281/ | trade press (independent) | 2024-06-11 | watch time share objective |
| product-audit/exemplar-youtube-channels.md | fleet audit (internal measurement) | 2026 | 29x audience gap |
| product-audit/distribution-posture.md | fleet audit (internal measurement) | 2026-11 | ocx channel 12 and 7 views |

Fetch limits: the Analytics API metrics page did not return definitions of the thumbnail-impression metrics; revision history was read only to character 100,000; the Toptal article was not re-fetched. No source states a minimum sample for CTR or Test and Compare.
