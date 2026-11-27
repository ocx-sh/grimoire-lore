# Commission: channel-communities / com-hn-contract

Topic question: On which developer communities may a software team announce its tool, and what does each venue's contract require of the post, the account and the maker?

Investigate the Hacker News contract for a tool announcement:
- Show HN eligibility (runnable, no signup, maker present) and title rules;
- URL versus text posts;
- vote-solicitation channels (team chat, newsletter CTAs, release notes, README badges);
- repost and second-chance pool rules;
- the published ranking description;
- posting-time evidence;
- the Launch HN YC-only fact.
The HN ban on generated or AI-edited text is owned by core-agent-action-boundary; cite that dive's clause, do not re-derive it.
Start from CM#1, CM#2, CM#4 to CM#7, CM#36, LP#11 to LP#16, LP#18.
Fetch and cite with dates: https://news.ycombinator.com/newsguidelines.html; https://news.ycombinator.com/showhn.html; https://news.ycombinator.com/newsfaq.html; public moderator comments on Show HN and reposts (cite each by item URL and date); the HN Algolia API docs.
Re-fetch every figure in this brief; the scout's 75,943-post measurement is a claim until re-run. Flag any figure that fails to reproduce.
Measure, do not cite:
- re-run and extend the scout's Show HN measurement through the Algolia API (https://hn.algolia.com/api/v1/search_by_date?tags=show_hn, paginated by created_at_i);
- measure the outcome split by URL type (GitHub repo, product site, text post), by presence of a maker first comment, and by title pattern, with n and medians;
- record every command.
Decide:
- the Show HN checklist a draft fact sheet must pass;
- the vote-solicitation grep list and where it runs (README, release notes, chat templates);
- whether any timing advice survives the measurement;
- the repost rule.
