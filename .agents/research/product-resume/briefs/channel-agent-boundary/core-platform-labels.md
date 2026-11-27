# Commission: channel-agent-boundary / core-platform-labels

Topic question: On every public channel, what may an agent do by itself, which platform-native labels must it set and where, and how does a channel skill keep its platform facts and the organisation's channel list from going stale?

Investigate every platform-native field or toggle that labels content as AI-generated or altered, paid or sponsored, branded partnership, or automated account, and where a disclosure must sit inside each format.
Fields to cover: YouTube altered-or-synthetic content setting and paid promotion; LinkedIn brand partnership and its AI guidance; the TikTok Content Posting API AI-generated field (the scout dates it effective 2026-09-24; verify); the X automated-account label; Bluesky self-labels; the Mastodon bot flag; Instagram AI info; C2PA content credentials that platforms read on upload, and the EU AI Act Article 50 machine-readable marking duty only as the platform-side mechanism (VP#26).
Placement: in a video, the sponsor or material-connection disclosure sits in the video itself before the mention (VP#27); in a post, before the fold. This dive decides placement per format; the legal standard is the marketing sibling's.
Start from LO#15, LO#39, YS#11, YS#12, SF#19, SF#20, SF#21, SF#24, VP#25, VP#26, VP#27, MB#3, MB#28, OP#11.
Fetch and cite with dates: YouTube Help 14328491 and the paid-promotion help page; the YouTube Data API videos resource and revision history (whether an altered-content field is exposed); LinkedIn Help a1481496 and the brand partnership help; the TikTok Content Posting API reference; X Help on automated account labels; Bluesky moderation and labelling docs; Mastodon profile docs (bot flag); the C2PA specification and each platform's C2PA statement; the European Commission AI Act Article 50 and code-of-practice page.
Re-fetch every dated figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite: for the fleet's two Shorts, read the label state through the YouTube Data API videos.list if the field exists, else record it as unobservable without Studio; do not scrape watch pages. Record every command.
Out of scope: whether the law requires a label, and Article 50 scope (marketing hand-off M-CO-4; cite its verdict when it lands).
Decide:
- the per-platform label table: field, when to set it, default, how to verify;
- the disclosure placement rule per format (video, post, thread, document);
- which labels the rule makes MUST when a draft says AI generated or altered its media.
