# Commission: channel-launch / launch-venue-gates

Topic question: Which eligibility and link-target gates must each launch venue's entry pass, and which launch shape and venue order does the measurable record support for a small developer-tool team?

Investigate per-venue launch gates.
Product Hunt: eligibility (product, not content; usable now), personal-account launching and co-makers, the go-live instant and scheduling window, weekday versus weekend, permitted support wording ("never ask for upvotes"), where links may be posted, relaunch after a major change, comment duty.
Directories: BetaList, Uneed and DevHunt requirements, field limits and vote mechanics; selfh.st and other self-hosted or OSS directories; awesome-list entry requirements (age, description style, badge rules).
Link targets: for every venue, what the linked page must offer (runnable without signup, install command visible). Show HN's own rules come from com-hn-contract; cite them. The install path itself is covered by installer-script and is out of scope.
Start from LP#1 to LP#10, LP#19 to LP#22, LP#32, LP#35, LP#38, LP#39, LP#40, GH#26, GH#27, CM#8, CM#9, CM#34, CM#35.
Fetch and cite with dates: Product Hunt help articles 17734306, 17734341, 17734355, 17734384, 17734397, 17734411 and 17734646; the BetaList submission page and FAQ; the Uneed and DevHunt submission rules; the selfh.st submission guide; the sindresorhus/awesome contributing guidelines and the awesome-lint rules.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- per directory, the field limits from the live public form markup (curl -s <form url> and a maxlength grep), where the form is public;
- for the fleet's two landing pages, run the link-target check (HTTP status, signup or form wall present, install command present) with curl and grep;
- record every command.
Decide:
- the per-venue gate checklist;
- the link-target check and its pass condition;
- which venues fit a free OSS CLI;
- which actions stay human-only (submit, pay, post), cited from core-agent-action-boundary.
