# Commission: channel-microblog / mb-link-and-thread-defaults

Topic question: Which counting, link, alt-text, card and account-proof rules must each microblog variant pass, and where should a release post put its link?

Investigate two draft properties a rule can check: where a release post puts its link on X, Bluesky, Mastodon and Threads (body, first reply, or none), and whether a release is a single post or a thread (and if a thread, how many posts and where the link sits).
Which platform a team should be on is deferred as an audience judgement; do not answer it.
Start from MB#6, MB#7, MB#13, MB#14, MB#22, MB#23, MB#24 in marketing-topic-map/channel-microblog.md.
Primary sources, each cited by URL and date: the X ranking code repository README and any open-sourced link-related signal; Bluesky docs on feeds and link embeds; Mastodon docs (no algorithmic ranking on the home timeline); Meta's Threads help on links; any platform statement on link reach.
Vendor data (label it vendor): Buffer or other link-reach studies with a methods section; record sample size and dates or mark unusable.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: ten developer-tool accounts present on Bluesky or Mastodon.
Measure, do not cite:
- through the public Bluesky AppView API (app.bsky.feed.getAuthorFeed) and the Mastodon public API (accounts/:id/statuses), pull the last 50 posts of each exemplar account;
- compare reposts and replies for posts with and without an external link, and single posts versus threads, reporting medians with n;
- X is not measurable without a paid API tier; record that and do not scrape;
- record every command.
Out of scope: automation (core-agent-action-boundary); account voice (marketing).
Decide:
- the link-placement default per platform with its evidence grade;
- the single-post-versus-thread default for a release;
- whether microblog variants warrant their own skill or a section of launch-plan.
