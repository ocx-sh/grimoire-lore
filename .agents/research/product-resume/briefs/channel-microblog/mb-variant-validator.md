# Commission: channel-microblog / mb-variant-validator

Topic question: Which counting, link, alt-text, card and account-proof rules must each microblog variant pass, and where should a release post put its link?

Investigate the exact counting rule per platform. The scout claims: X weighted characters (280, URLs counted as 23), Bluesky 300 graphemes, Mastodon 500 characters with links counted as 23, Threads 500 characters and 5 links; and documentation-versus-schema conflicts.
Also cover alt-text length limits and terminal-screenshot alt text; Bluesky link cards that the client must build; the fediverse:creator meta tag; oEmbed survival; account proof (Bluesky domain handle, Mastodon rel=me verification).
Start from MB#4, MB#5, MB#15 to MB#20, MB#25, MB#32, MB#34, MB#37 in marketing-topic-map/channel-microblog.md.
Fetch and cite with dates: the twitter-text library and the X counting docs; the atproto RichText docs and the Bluesky lexicons for app.bsky.feed.post and app.bsky.embed.external; Mastodon docs (statuses, profile verification, the fediverse:creator announcement); the Threads API publishing reference.
Re-fetch every limit in this brief; each is a scout claim. Flag any that fails to reproduce.
Measure, do not cite:
- write 30 test strings covering emoji, ZWJ sequences, combining marks, CJK and URLs;
- count each with the official libraries (twitter-text via npx, @atproto/api RichText) and with a naive length; report the disagreements;
- fetch one fleet site page and test for fediverse:creator and rel=me (curl -s and grep);
- record every command.
Out of scope: og:image and site metadata (marketing); account voice (marketing).
Decide:
- the validator spec per platform (counting, links, alt text, card building);
- the account-proof checks and where they run.
