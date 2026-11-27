# Commission: channel-youtube / yt-upload-metadata-contract

Topic question: What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

Investigate every field and channel default an upload sets: title and description limits (the scout claims 100 characters and 5,000 characters or bytes in the API); tags and hashtags (the scout claims more than 60 hashtags makes YouTube ignore all); chapters (start at 00:00, minimum count and length); thumbnail file spec, including the scout's claim that Shorts custom thumbnails reach the API from 2026-11-03; made-for-kids, default language, caption language, auto-dubbing defaults; end-screen and card limits; channel-level defaults (description, links) and feature-verification gates.
Start from YS#1 to YS#5, YS#8 to YS#10, YS#13, YS#18, YS#19, YS#32, YS#34, YS#35, YP#1 to YP#4, YP#20, YP#21, YP#22, YP#23, VP#10, AE#18. Read product-audit/distribution-posture.md section 4 (ocx channel, empty description, linked from nowhere).
Fetch and cite with dates: YouTube Help 57407, 12948449, 72431, 9884579, 6388789, 6140493, the auto-dubbing page and the made-for-kids page; the YouTube Data API reference for videos.insert, videos.update, thumbnails.set, channels.update and the API revision history; the YouTube Terms of Service automated-access clause.
Re-fetch every figure in this brief; each is a scout claim until reproduced. Flag any that fails.
Measure, do not cite:
- parse the descriptions already collected for the 450 audited videos (~/.cache/research-lang/exemplars/product/scripts/yt_analyze.py, extended) and count valid versus invalid chapter lists against the published rules;
- new data comes only through the Data API (videos.list, with the quota cost recorded) or the public channel RSS feed; never render or scrape watch pages;
- record every command.
Decide:
- the upload-metadata linter: each field, its limit, and MUST or SHOULD;
- the one-time channel-defaults checklist the ocx channel needs, with the links taken from the channel inventory (core-facts-and-channel-inventory).
