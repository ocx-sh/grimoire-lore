# Commission: channel-youtube / yt-format-portfolio

Topic question: What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

Investigate what a company developer-tool channel should publish: Shorts; long-form tutorials; announcement videos (the audit's only title class with lift, 4.94 on n=18); live streams and talks (ratio 0.0 to 0.18 in the audit); series and playlists. Also cover length by intent, the closing and end-screen window, and whether short-form serves a developer tool at all.
The Shorts success test, view definitions and reporting thresholds come from yt-measurement-and-testing; this dive states its keep-or-drop decision in those terms and does not define its own.
Start from YP#17, YP#18, YP#19, YP#24 to YP#27, YP#33, YP#34, YP#37, YS#27, SF#1, SF#12, SF#31, SF#34, VP#7, VP#8, VP#35. Read product-audit/exemplar-youtube-channels.md in full.
Fetch and cite with dates: YouTube Help and Creator pages on Shorts and long-form; the YouTube Official Blog on Shorts-to-long-form relationships; the Wistia and TechSmith video length reports (vendor; label them).
Exemplars: the channels of the audit's top company exemplars (for example Zed and PostHog).
Re-fetch every figure in this brief, including the audit figures; flag any that fails to reproduce.
Measure, do not cite:
- extend the audit corpus with duration and publish date per video through the Data API (videos.list contentDetails.duration) or the channel RSS feed, never by scraping;
- compute median views by duration band and format for company channels only, with n per cell;
- re-run the audit's handle resolution check, which was wrong for 9 of 29 channels the first time;
- record every command.
Decide:
- the default publishing mix for a small company channel, as format shares and a cadence floor;
- whether the fleet's Shorts series continues, conditional on the measurement dive's success test;
- the closing-structure checks the skill keeps.
