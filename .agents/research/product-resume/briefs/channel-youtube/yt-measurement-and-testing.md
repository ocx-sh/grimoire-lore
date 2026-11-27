# Commission: channel-youtube / yt-measurement-and-testing

Topic question: What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

Investigate which YouTube numbers a small channel may act on, and own the definitions every other YouTube dive cites:
- what counts as a view (the scout claims every Shorts start counts since 2025-03-31, long-form co-view counts from 2026-11-16, and a podcast view change of 24 Aug 2026);
- impressions CTR and its typical range (the scout claims a 2 to 10% middle half);
- the retention report's intro window;
- Test and Compare (the scout claims 3 variants, decided by watch-time share, desktop and long-form only, about two weeks);
- the sample size below which nothing may be concluded;
- the Shorts success test a series must pass after 90 days (yt-format-portfolio consumes it).
Start from YS#6, YS#7, YS#20, YS#21, YS#22, YP#10 to YP#16, YP#35, YP#36, SF#11, AE#24, VP#38.
Fetch and cite with dates: YouTube Help 16391400, 7628154, 9314415 and the Shorts view-count change notice; the co-view announcement; the YouTube Analytics API metric definitions.
Re-fetch every dated figure in this brief; each is a scout claim. Flag any that fails to reproduce.
Measure, do not cite:
- compute the smallest detectable difference in view-through or CTR at the ocx channel's current volumes (12 and 7 views) and at 1,000 and 10,000 impressions, with a two-proportion power calculation in python3 -I;
- record the command and the assumptions (alpha, power).
Decide:
- the metrics a skill may report, each with its definition and date;
- the volume threshold below which the skill reports "insufficient data";
- the 90-day Shorts success test: metric, threshold, and what happens on failure;
- whether Test and Compare is worth running for a channel this size.
