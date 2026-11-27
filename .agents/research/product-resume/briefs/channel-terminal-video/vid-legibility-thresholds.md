# Commission: channel-terminal-video / vid-legibility-thresholds

Topic question: Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

Investigate the minimum rendered text size that keeps terminal and editor text readable at docs embed width, README width, 1080p video and a 360 px phone. Also cover terminal columns and rows, playback idle limits and speed, and the single vertical safe rectangle for Shorts, Reels and TikTok.
No published minimum for code or terminal text in video exists (scout finding VP#4). The floor this dive sets is therefore derived from its own measurement and must be labelled "derived" in the deliverable. Do not cite interface type-scale guidelines as a source for it.
The scout derived a safe rectangle of top 288, bottom 672, left 120, right 192 px at 1080x1920. Treat it as a claim: re-derive it from current platform creative-spec pages and label the result derived if no platform publishes one.
In-frame contrast reuses the css-theming contrast thresholds; apply them to the recording theme, do not research them.
Start from VP#3, VP#4, VP#5, VP#24, SF#5 to SF#9, SF#26, SF#30. Read rules/css-theming.md for the contrast check.
Fetch and cite with dates: WCAG 2.2 Understanding pages for SC 1.4.4 and 1.4.10 (for reflow and resize context only); the YouTube Shorts, TikTok and Instagram creative-spec pages; the VHS settings reference (FontSize, Width, Height, Padding, PlaybackSpeed).
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- render a fixed session at 80, 100, 120 and 180 columns with VHS at several font sizes;
- scale each render to each target width and compute the rendered x-height and cap height in CSS pixels;
- compute the theme's foreground-background contrast with a script and compare to the css-theming threshold;
- record every command.
Decide:
- the derived legibility floor: column cap and minimum rendered x-height per surface;
- the idle-limit and speed defaults;
- the vertical safe rectangle the skill enforces, with its derivation.
