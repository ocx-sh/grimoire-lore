---
title: Held-out test of UX-STATE-02, UX-STATE-17 and UX-STATE-34
program: product
topic: ux-interface-states
worker: followup-w3-q1
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 17
---

# Held-out test of UX-STATE-02, UX-STATE-17 and UX-STATE-34

Repair pass of 2026-11-27. Every count below was re-run in this pass, and each carries its command and output. Three figures of the first version were wrong and are corrected in place: the UX-STATE-17 "2 `notify: false`" figure, the per-app "toast lines" column, and the UX-STATE-02 file-level grep counts. The proposed UX-STATE-36 is withdrawn, because its grep misses its own motivating instance.

## Question

Do UX-STATE-02 (MUST), UX-STATE-17 (MUST) and UX-STATE-34 (CONSIDER) each have a violating and a conforming instance in held-out codebases, and does each rule's verification, run as written, find them? Which of keep MUST, demote to SHOULD, or change the verification does the evidence support?

## Answer

| Rule | Violating | Conforming | Verification as written | Recommendation |
|---|---|---|---|---|
| UX-STATE-02 | 3 in 2 of the first 8 codebases, none in 4 fresh ones | 9 in the first 8, 3 more in 2 fresh ones | The reading check fails 5 of 9 conformers. A file-level token grep passes 1 violator. The never-resolving-fetch render test was not run. | Keep MUST. Change the Verify. |
| UX-STATE-17 | 4 in the first 8, 3 more in 3 fresh ones (immich, open-webui, uptime-kuma; linkwarden, homarr, actual) | 3 in the first 8, plus actual's `sticky: true` errors and paperless-ngx (reachable again, 10 s) | The `setTimeout` grep finds no error timer in 5 of the 7 violating codebases | Keep MUST. Change the Verify. |
| UX-STATE-34 | 0 clean (1 arguable, jellyfin) | 2 in the first 8, 1 more in a fresh one (homarr) | The trigger as written found 0 rendered ages in 8 codebases and 0 in homarr's conforming view | Keep CONSIDER. Change the trigger. |

Evidence is one reader, single pass. The revised Verify texts were drafted after reading the first 8 codebases and then run once on 4 fresh ones (section "Fresh codebases"). The fresh run found no case that broke them, but 4 codebases is a check, not validation.

## Method

Eight applications were cloned with `git clone -q --depth 1` into `~/.cache/research-lang/exemplars/product/wave2/ux-state-w3q1/`. None appears in the wave-1 or wave-2 artifacts of this topic. The check:

```
$ grep -rhoiE 'github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+' ux-interface-states.md ux-interface-states/ | sort -u
```

That names only excalidraw, gitea, mastodon, vscode, vscode-pull-request-github, plausible, primer and vercel-labs. For this repair pass, four more applications were cloned into `fresh/` beside them (none of them in those artifacts: `grep -rliE 'linkwarden|homarr|paperless|actualbudget|actual-budget'` over the ruleset and its directory returned nothing).

| App (stack) | Commit | Commit date | Why the triggers occur |
|---|---|---|---|
| [jellyfin/jellyfin-web](https://github.com/jellyfin/jellyfin-web/tree/8022a5d) (React, plain JS) | `8022a5d` | 2026-11-26 | remote library data, own toast helper |
| [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma/tree/d35c3fa) (Vue, socket.io) | `d35c3fa` | 2026-11-27 | socket-pushed lists, toasts, auto-refreshing status page |
| [usememos/memos](https://github.com/usememos/memos/tree/78a8dc8) (React, TanStack Query) | `78a8dc8` | 2026-11-27 | paged memo lists, cached queries |
| [mealie-recipes/mealie](https://github.com/mealie-recipes/mealie/tree/060b96d) (Nuxt, Vue) | `060b96d` | 2026-11-27 | fetched recipe and shopping lists |
| [immich-app/immich](https://github.com/immich-app/immich/tree/a608f8f) (SvelteKit) | `a608f8f` | 2026-11-27 | timeline, albums, cached queries, toasts |
| [open-webui/open-webui](https://github.com/open-webui/open-webui/tree/926f826) (Svelte) | `926f826` | 2026-11-25 | many admin lists loaded on mount |
| [element-hq/element-web](https://github.com/element-hq/element-web/tree/f43744f) (React) | `f43744f` | 2026-11-27 | toasts, stores |
| [hoppscotch/hoppscotch](https://github.com/hoppscotch/hoppscotch/tree/6177eae) (Vue) | `6177eae` | 2026-11-23 | collections, invites, history |
| [linkwarden/linkwarden](https://github.com/linkwarden/linkwarden/tree/24adcc1) (Next.js) | `24adcc1` | 2026-11-10 | fetched link lists, toasts (fresh) |
| [homarr-labs/homarr](https://github.com/homarr-labs/homarr/tree/3ee454b) (Next.js, TanStack Query) | `3ee454b` | 2026-11-27 | cached widget data, notifications (fresh) |
| [paperless-ngx/paperless-ngx](https://github.com/paperless-ngx/paperless-ngx/tree/26599c3) (Angular) | `26599c3` | 2026-11-27 | fetched lists, toast service (fresh) |
| [actualbudget/actual](https://github.com/actualbudget/actual/tree/bdfe00f) (React) | `bdfe00f` | 2026-11-26 | synced data, notifications (fresh) |

Commit dates come from `git -C <repo> log -1 --format='%h %cs'`. The first eight were read in the earlier pass and re-checked here at the same commits. Nothing was run, built or installed. No file in any clone was changed. The Source roots used:

```
jellyfin-web/src  uptime-kuma/src  memos/web/src  mealie/frontend/app  immich/web/src
open-webui/src  element-web/apps/web/src  hoppscotch/packages/hoppscotch-common/src
fresh/linkwarden/apps/web  fresh/homarr/apps/nextjs/src  fresh/actual/packages/desktop-client/src  fresh/paperless-ngx/src-ui/src
```

## The rule text under test

All three rules are in `.agents/research/ux-interface-states.md` of this worktree. Quoted from the file at the working-tree state of 2026-11-27.

UX-STATE-02, lines 117 and 119:

> **UX-STATE-02 (MUST).** Show empty-state copy only after the fetch has settled with zero items. Never branch on `items.length === 0` alone while `items` starts as `[]`.
> Verify: render with a fetch that never resolves and assert that no empty-state text appears. Reading check: the expression that selects the empty branch mentions a settled or status flag.

UX-STATE-17, lines 208 and 214:

> **UX-STATE-17 (MUST).** Never put an error, or a fact the user needs to finish the task, only in a transient message (a toast or an auto-dismissing notice). Never auto-dismiss an error. [...]
> Verify: `grep -rnE -B3 -A3 'setTimeout' src | grep -iE 'toast|notif|snackbar|flash'`. A timer on error severity, or a timed message with no other path to its content, fails.

UX-STATE-34, lines 153 and 155:

> **UX-STATE-34 (CONSIDER).** Where a view renders data read from a cache, show the data's age and a refresh action.
> Verify: trigger: the view's data module matches `grep -nE 'syncedAt|lastSynced|lastFetched|fetchedAt|staleTime'`, and the matched value is rendered or reaches a rendered component (read each hit). Some fixture of that view then contains a timestamp or an age phrase and a refresh control. [...]

The ruleset's untested note, line 107: "Rules 02, 13, 16, 17 and 19 have no instance in the fleet or in any codebase measured so far [...] Raise a rule to MUST only after a codebase with an instance shows that the check separates a pass from a fail."

## UX-STATE-02: empty copy only after the fetch settled

### The locator

The rule gives no command to find the sites. Two were tried.

Locator A, all length-tests (too broad to read):

```
grep -rnE --include='*.vue' --include='*.svelte' --include='*.tsx' --include='*.jsx' \
  '\.length *(===|==|<=|<) *[01]\b|!\w+(\.\w+)*\.length\b|isEmpty\(' <src> | grep -vE 'test|spec' | wc -l
```

Output (script `s02.sh`, 2026-11-27):

```
jellyfin-web length-test=11    uptime-kuma length-test=37    memos length-test=48    mealie length-test=50
immich length-test=55          open-webui length-test=296    element-web length-test=97    hoppscotch length-test=121
```

Locator B, "starts empty" candidates. A short script (`loc02.py`, Python 3, run as `python3 -I loc02.py <src>`) reports each empty test `X.length === 0`, `!X.length` or `Object.keys(X).length === 0` where the same file initialises `X` as `[]` or `{}` (`let`, `const`, `ref([])`, `$state([])`, `useState([])`, or a Vue `data()` key `X: {}`). Candidates per codebase:

```
jellyfin-web 0   uptime-kuma 6   memos 1   mealie 5   immich 5   open-webui 114   element-web 11   hoppscotch 6
fresh: linkwarden 1   homarr 1   actual 11   paperless-ngx 0 (Angular templates, not scanned by this script)
```

Recall of locator B against the sites classified below:

- It finds both violators in open-webui: `Events.svelte:769 webhooks` and `KnowledgeSelector.svelte:156 items`.
- It misses the violator `uptime-kuma/src/pages/ManageMaintenance.vue:17`. Its variable `sortedMaintenanceList` is derived, and the `{}` initialiser sits in another file (`mixins/socket.js:45`).
- It misses conformers that never start empty by design: Feedbacks and ArchivedChats start as `null`. That is correct, because they cannot match the rule's trigger.
- It misses linkwarden's `!links[0]` form (the tests are `.length`-based only). A fresh conformer, found by `grep -rn 'NoLinksFound' fresh/linkwarden/apps/web`, was therefore not located by B.

So B is a prioritisation filter with known holes, not a detector. Its recall on the 3 known violators is 2 of 3.

### Violating instances (3)

| Site | What the code does |
|---|---|
| [`uptime-kuma/src/pages/ManageMaintenance.vue:17-21`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/pages/ManageMaintenance.vue#L17-L21) | `v-if="Object.keys(sortedMaintenanceList).length === 0"` shows "No Maintenance". The list is `maintenanceList: {}` ([`src/mixins/socket.js:45`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/mixins/socket.js#L45), checked with `grep -n 'maintenanceList: {}' src/mixins/socket.js`, output `45:            maintenanceList: {},`), filled by a later socket event. The page has no loaded flag. The same app gates its monitor list correctly (below). |
| [`open-webui/src/lib/components/admin/Settings/Events.svelte:769-773`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/admin/Settings/Events.svelte#L769-L773) | `{#if webhooks.length === 0}` shows "No event webhooks configured." `let webhooks: EventWebhook[] = [];` is line 31, and line 83 assigns it after the awaited load. The file has no loading flag (its only `=== null` tests, lines 129 and 157, are on `webhook.targets`). |
| [`open-webui/src/lib/components/workspace/Models/Knowledge/KnowledgeSelector.svelte:156-158`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/workspace/Models/Knowledge/KnowledgeSelector.svelte#L156-L158) | `{#if items.length === 0 && (query \|\| ...)}` shows "No knowledge found". `items` derives from `noteItems`, `knowledgeItems` and `fileItems`, all `[]` at lines 33-36, each filled by an async search. |

### Conforming instances (9 in the first 8 codebases)

| Site | Why it conforms |
|---|---|
| [`memos/web/src/components/PagedMemoList/PagedMemoList.tsx:251`](https://github.com/usememos/memos/blob/78a8dc8/web/src/components/PagedMemoList/PagedMemoList.tsx#L251) | `isEmpty = !isDisplayPending && !isError && !isFetchingNextPage && !hasNextPage && list.length === 0`. |
| [`immich/web/src/lib/components/timeline/Timeline.svelte:118`](https://github.com/immich-app/immich/blob/a608f8f/web/src/lib/components/timeline/Timeline.svelte#L118) | `isEmpty = timelineManager.isInitialized && months.length === 0`. |
| [`immich/web/src/lib/components/album-page/AlbumsList.svelte:190-191`](https://github.com/immich-app/immich/blob/a608f8f/web/src/lib/components/album-page/AlbumsList.svelte#L190-L191) | The empty snippet has no flag. The route's `load` awaits the data first (`routes/(user)/albums/+page.ts`). |
| [`uptime-kuma/src/components/MonitorList.vue:114-118`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/components/MonitorList.vue#L114-L118) | `v-if="!$root.monitorListLoaded"` shows skeleton rows, then `v-else-if` shows "No Monitors, please add one". |
| [`mealie/frontend/app/pages/shopping-lists/index.vue:3,86`](https://github.com/mealie-recipes/mealie/blob/060b96d/frontend/app/pages/shopping-lists/index.vue#L3) | The whole page sits under `v-if="shoppingListChoices && ready"`. |
| [`open-webui/.../admin/Evaluations/Feedbacks.svelte:220,308`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/admin/Evaluations/Feedbacks.svelte#L220) | `items = null` (line 42). `{#if items === null \|\| total === null}` is the loading branch, so line 308 is reached only after load. |
| [`open-webui/.../chat/Settings/ArchivedChats.svelte:322`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/chat/Settings/ArchivedChats.svelte#L322) | `chatList = null` (line 48). A `null` branch shows a spinner, the empty branch is a later sibling. |
| [`open-webui/.../chat/Tabs/GitIssues.svelte:279-283`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/chat/Tabs/GitIssues.svelte#L279-L283) | `listLoading ? 'Loading...' : search.trim() ? 'No results found' : 'No issues'`. |
| [`hoppscotch/.../components/teams/Invite.vue:160-163`](https://github.com/hoppscotch/hoppscotch/blob/6177eae/packages/hoppscotch-common/src/components/teams/Invite.vue#L160-L163) | `E.isRight(pendingInvites.data) && ...teamInvitations.length === 0`. The unloaded state is a `Left`. |

Three sites with non-async data are not instances: `open-webui/src/lib/components/chat/Tabs/MachinePicker.svelte:110`, `.../chat/Placeholder/FolderTags.svelte:56`, `.../chat/SettingsModal.svelte:790`.

### Fresh codebases (4)

Read with the revised Verify below. The fresh instances:

| Site | Class | Why |
|---|---|---|
| [`linkwarden/apps/web/pages/links/index.tsx:56`](https://github.com/linkwarden/linkwarden/blob/24adcc1/apps/web/pages/links/index.tsx#L56) | conforming (a) | `{!data.isLoading && links && !links[0] && (<NoLinksFound .../>)}`. The same form is at `pages/collections/[id].tsx:463`. |
| [`paperless-ngx/src-ui/src/app/components/manage/saved-views/saved-views.component.html:79`](https://github.com/paperless-ngx/paperless-ngx/blob/26599c3/src-ui/src/app/components/manage/saved-views/saved-views.component.html#L79) | conforming (b) | `@if (savedViews() && savedViews().length === 0)`. The signal starts `undefined` (`saved-views.component.ts:75`), so the sentinel cannot match the empty test. |
| [`paperless-ngx/.../document-detail/document-history/document-history.component.html:3-7`](https://github.com/paperless-ngx/paperless-ngx/blob/26599c3/src-ui/src/app/components/document-detail/document-history/document-history.component.html#L3-L7) | conforming (a) | `entries` starts `[]` (`.ts:48`), but a spinner branch runs while `loading()` (`.ts:47`, `signal(true)`) and the empty test is in the `@else`. |

No fresh codebase held a violator in the sites read (linkwarden 2 sites, paperless 3 read of 5 candidate files, actual 1: `Account.tsx:1262` is a handler guard, not copy; homarr's one candidate `pick-step.tsx:181` is a static list). Violators were found only in the first 8: 3 sites in 2 of 8.

### False fails and false passes of the verification as written

Reading check, "the expression that selects the empty branch mentions a settled or status flag": five of the nine first-sample conformers carry the guard elsewhere, so a reader who inspects only that expression fails them: AlbumsList (route load), mealie shopping lists (enclosing `v-if`), Feedbacks (the `?? []` looks like a violation, the guard is 88 lines above), ArchivedChats (a sibling branch), Invite.vue (the `Either` type). Two of the three fresh conformers (paperless saved-views, document-history) also fail that wording, so the count is 7 false fails of 12 conformers. Linkwarden's passes the wording.

File-level token grep as a shortcut. Command and output (run in `open-webui/src`):

```
$ grep -rlE --include='*.svelte' '\{#if[^}]*\.length *(===|==) *0' . | wc -l
36
$ for f in <those 36 files>; do c=$(grep -ciE 'loading|loaded|ready|isInitialized|pending|=== null|!== null|=== undefined' $f); [ "$c" = 0 ] && echo "zero: $f"; done
zero: lib/components/workspace/Models/Knowledge/KnowledgeSelector.svelte
zero: lib/components/chat/SettingsModal.svelte
zero: lib/components/chat/Messages/OutputEditView.svelte
$ grep -ciE 'loading|loaded|ready|isInitialized|pending|=== null|!== null|=== undefined' lib/components/admin/Settings/Events.svelte
2
```

So 33 of 36 files contain a settled-state word, among them the violator `Events.svelte`, whose only hits are on unrelated `webhook.targets` (lines 129 and 157). The grep flags the violator `KnowledgeSelector.svelte` (0) but passes `Events.svelte` (2). It is a false pass on a real violator, and 3 of the 33 passing-by-grep files were not read. (The first version of this artifact gave "54 files, 5 with 0"; that was wrong. The command above is the one that was run now.)

### Recommendation: keep MUST; change the Verify

Three violations in 2 of 8 codebases and 12 conformers (9 + 3) separate on a procedure that follows the data, not the expression. Proposed new Verify text for UX-STATE-02, replacing lines 119 of the ruleset:

> Verify: for each empty-state copy site that shows data from an async source, find where the data variable is initialised and where it is assigned. Pass when one of these holds: (a) the empty branch sits under, or after an `else-if`/`else` of, a settled-state flag (loading, loaded, ready, initialised, `isPending`); (b) the unloaded state is a sentinel that the empty test cannot match (`null`, `undefined`, an `Either` or `Result`) and the sentinel has its own branch or guard; (c) the data is awaited in a route or page `load` before the view renders. Fail when the variable starts as `[]` or `{}`, is assigned inside an async callback or after an `await`, and none of (a) to (c) holds. A file-level search for loading words does not decide this: it passed `Events.svelte` on two unrelated `=== null` tests. To find sites, list files where an empty test and an `[]` or `{}` initialiser of the same variable occur together, and also grep `!\w+\[0\]`; both miss derived data, so also read every "No ... found" copy on a view that fetches. Then render the view with a fetch that never resolves and assert no empty-state text appears.

## UX-STATE-17: errors never only in a transient message

### Running the verification as written

Command, exactly as in the rule at `ux-interface-states.md:214`, with the file filter added so it runs on source only (script `s17.sh`):

```
grep -rnE -B3 -A3 'setTimeout' <src> --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' --include='*.svelte' \
  | grep -iE 'toast|notif|snackbar|flash' | grep -v '^--' | wc -l
```

Second column, the number of lines mentioning a toast API (`grep -rniE 'toast|snackbar' <src> <same --include flags> | wc -l`). The first version's column used a different, case-sensitive pattern and is replaced.

```
jellyfin-web hits=31 toastlines=191     uptime-kuma hits=0 toastlines=209
memos hits=0 toastlines=226             mealie hits=1 toastlines=128
immich hits=0 toastlines=311            open-webui hits=10 toastlines=1361
element-web hits=45 toastlines=982      hoppscotch hits=4 toastlines=936
```

The hit counts match the first version. The second column does not. The conclusions never depended on it.

I read the hits for open-webui, mealie, hoppscotch, element-web (non-test) and the jellyfin ones that name a toast:

- True hit: [`jellyfin-web/src/components/toast/toast.ts:26-29`](https://github.com/jellyfin/jellyfin-web/blob/8022a5d/src/components/toast/toast.ts#L26-L29), `animateRemove` after 3300 ms. It is the only toast helper, takes no severity and renders only `textContent`, with no close control (the file is 49 lines).
- False hits (a timer unrelated to an error toast): open-webui `routes/+layout.svelte:178` (a disconnect-toast debounce) and `Prompts.svelte:304` (copy confirmation), hoppscotch (four copy confirmations: `Query.vue:42`, `CurlView.vue:508`, `EditMockServer.vue:295`, `MockServerDashboard.vue:354`), mealie `shopping-lists/[id].vue:416` (`itemCheckedToast`), element-web `RoomListViewModel.ts:1154` (15 s auto-close on the non-error "section_created" and "chat_moved" toasts) and `IncomingCallToast.tsx:240` (call lifetime).

### Violating instances (first 8: 4)

| Site | Evidence |
|---|---|
| [`immich/web/src/lib/utils/handle-error.ts:56`](https://github.com/immich-app/immich/blob/a608f8f/web/src/lib/utils/handle-error.ts#L56) | `toastManager.danger(errorMessage)` is the only visible report. The other output is `console.error` (line 45). Call sites, measured: `grep -rn 'handleError(' immich/web/src \| wc -l` gives `38`, and `grep -rn 'handleError(' ... \| grep -v 'export' \| wc -l` gives `37` (the 38th is the definition). `grep -rn -A4 'handleError(' ... \| grep -c 'notify: *false'` gives `0`. The first version said "2 pass `notify: false`". That was wrong. The only two `notify: false` in the app are `AlbumsList.svelte:171` (`handleDeleteAlbum`) and `file-uploader.ts:226` (a mutation option), neither a `handleError` call. The timeout comes from the dependency: [`@immich/ui` 0.95.1](https://registry.npmjs.org/@immich/ui/-/ui-0.95.1.tgz) `dist/services/toast-manager.svelte.js:21`, `const { timeout = 3000, closable = true, id = generateId() } = options \|\| {};`, and line 43, `setTimeout(() => this.remove(toast), timeout)`. The version is the `^0.95.1` range at `immich/web/package.json:39`. The grep returns 0 hits in the app. |
| [`open-webui/src/lib/components/common/Toaster.svelte:24-27`](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/common/Toaster.svelte#L24-L27) | `<Toaster {position} {closeButton} toastOptions={{ unstyled: true, classes: {...} }}>` sets no duration (`grep -n 'duration' Toaster.svelte` returns nothing). [`svelte-sonner` 0.3.28](https://registry.npmjs.org/svelte-sonner/-/svelte-sonner-0.3.28.tgz) (the version at `open-webui/package-lock.json:14318`) has `export let duration = 4000;` at `dist/Toaster.svelte:48`. Calls: `grep -rn 'toast\.error' open-webui/src \| wc -l` gives `776`. Per-call duration: `grep -rnE 'toast\.error\([^)]*\{[^}]*duration' open-webui/src \| wc -l` gives `0`, and `grep -rnE -A3 'toast\.error' open-webui/src \| grep -iE 'timeout\|duration\|autoClose'` returns one line, an unrelated `clearTimeout(debounceTimer)` in `PromptEditor.svelte`. |
| [`jellyfin-web/src/components/toast/toast.ts:26-29`](https://github.com/jellyfin/jellyfin-web/blob/8022a5d/src/components/toast/toast.ts#L26-L29) | A 3300 ms auto-remove, no close control, no severity. `grep -rnE '\btoast\(' jellyfin-web/src \| wc -l` gives `72`, and `... \| grep -ciE 'error\|fail'` gives `22`, for example `components/imageUploader/imageUploader.js:112` (`ImageUploadFailed`). The written grep finds this file. It cannot say which call sites are errors. That takes the second read. |
| [`uptime-kuma/src/mixins/socket.js:467-469`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/mixins/socket.js#L467-L469) | `toastError(msg) { toast.error(this.$t(msg)); }` passes no timeout (`grep -rn 'toastError(' uptime-kuma/src \| wc -l` gives `52`). [`vue-toastification` 2.0.0-rc.5](https://registry.npmjs.org/vue-toastification/-/vue-toastification-2.0.0-rc.5.tgz) `src/ts/propValidators.ts:58-61` is `timeout: { type: [Number, Boolean], default: 5000 }`. `loadToastSettings` (`src/util-frontend.ts:130-143`) sets no timeout. The grep returns 0 hits in the app. |

### Violating instances (4 fresh codebases: 3)

| Site | Evidence |
|---|---|
| [`linkwarden/apps/web/pages/_app.tsx:82-90`](https://github.com/linkwarden/linkwarden/blob/24adcc1/apps/web/pages/_app.tsx#L82-L90) | `<Toaster position="top-center" ... toastOptions={{ className: ... }}>` sets no duration. `grep -rn 'toast\.error' linkwarden/apps/web \| wc -l` gives `76`. [`react-hot-toast` 2.4.1](https://registry.npmjs.org/react-hot-toast/-/react-hot-toast-2.4.1.tgz) (`yarn.lock:19422`) `src/core/store.ts:175` is `error: 4000,`. |
| [`homarr/packages/notifications/src/index.tsx:12-17`](https://github.com/homarr-labs/homarr/blob/3ee454b/packages/notifications/src/index.tsx#L12-L17) | `showErrorNotification` calls `notifications.show({...props, color: "red", icon})` with no `autoClose`. The mount is `<Notifications pauseResetOnHover="notification" />` at `apps/nextjs/src/app/[locale]/layout.tsx:217`. [`@mantine/notifications` 9.6.0](https://registry.npmjs.org/@mantine/notifications/-/notifications-9.6.0.tgz) (`package.json:64`) has `autoClose: 4000` in `defaultProps` (`esm/Notifications.mjs:20`). `grep -rn 'showErrorNotification' homarr/apps homarr/packages --include='*.ts' --include='*.tsx' \| wc -l` gives `250`. Some call sites pass `autoClose: 10000` (`login/_login-form.tsx:58,85`), still finite. |
| [`actual/packages/desktop-client/src/accounts/mutations.ts:51`](https://github.com/actualbudget/actual/blob/bdfe00f/packages/desktop-client/src/accounts/mutations.ts#L51) | `addNotification({ notification: { id, type: 'error', message, pre } })` with no `sticky`. `components/Notifications.tsx:123-124` is `if (!sticky) { setTimeout(onRemove, timeout \|\| 6500); }`. Counts in `desktop-client/src`: `grep -rnE "type: 'error'" ... \| grep -vE 'test\|spec' \| wc -l` gives `73`, and `grep -rnE -A6 "type: 'error'" ... \| grep -c 'sticky: true'` gives `17`. So at least 56 error notifications time out. |

### Conforming and mixed instances

| Site | Evidence |
|---|---|
| [`memos/web/src/lib/toast.ts:12`](https://github.com/usememos/memos/blob/78a8dc8/web/src/lib/toast.ts#L12) | `toast.add({ title, type: "danger", timeout: 0 })`, with the comment "Errors stay until dismissed". The grep returns 0 hits, correctly, but it would return 0 on a violator whose timer is in a dependency. |
| [`uptime-kuma/src/mixins/socket.js:274-277`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/mixins/socket.js#L274-L277) with `src/util-frontend.ts:172-189` | The DOWN-heartbeat error toast gets `timeout: getToastErrorTimeout()`, which resolves to `false` (no auto-dismiss) unless the user stored another value. The same file's `toastError` violates, so one codebase holds both. |
| `actual` `sticky: true` errors | 17 of 73 error notifications set `sticky: true` (command above). |
| [`paperless-ngx/src-ui/src/app/services/toast.service.ts:94-100`](https://github.com/paperless-ngx/paperless-ngx/blob/26599c3/src-ui/src/app/services/toast.service.ts#L94-L100) | `showError(content, error = null, delay = 10000)`: the error toast dismisses after 10 s, which breaks the text of the rule ("Never auto-dismiss an error"). The service also keeps every toast in `private toasts: Toast[]` (line 58, `unshift` at line 82) with a `read` flag (line 118), shown in a notifications dropdown. That meets the WCAG 2.2.1 path the rule cites ("available another way") and the fourth bullet ("can be reached again somewhere else"). A real instance where the two sentences of the rule disagree. |
| [`element-web/.../viewmodels/room-list/RoomListViewModel.ts:1154`](https://github.com/element-hq/element-web/blob/f43744f/apps/web/src/viewmodels/room-list/RoomListViewModel.ts#L1154) | Auto-dismiss (15 s) only for the "section_created" and "chat_moved" confirmations, not errors. |

### False fails and false passes of the verification as written

- False pass: the written grep returns 0 hits in uptime-kuma, immich and homarr, and only unrelated hits in open-webui (see above) and linkwarden (3 hits, read: `pages/auth/verify-email.tsx:25` and `lib/client/importBookmarks.ts:75-76` are success toasts followed by a reload). Fresh counts (command as above, run in `fresh/`):

```
linkwarden: reporters 76, setTimeout hits 3     homarr: reporters 0, setTimeout hits 0
actual: reporters 0, setTimeout hits 9          paperless-ngx: reporters 119, setTimeout hits 25
```

  Five of the seven violating codebases (immich, uptime-kuma, open-webui, linkwarden, homarr) have the error timer only inside a dependency, so the written pass condition holds for them. The grep finds the timer in the other two: jellyfin (`toast.ts:26`) and actual (`components/Notifications.tsx:124`, `setTimeout(onRemove, timeout || 6500)`). Actual's hit is a generic notifier, so the grep cannot say the timer applies to errors without reading `type: 'error'` call sites.
- A false fail by the written grep is possible on non-error timers (copy confirmations, call lifetimes). Each resolved on a short read.
- Gap in the rule text. "Has a dismiss control" and "can be reached again elsewhere" are not covered by the grep. Immich's toast is closable by default (`closable = true`, `toast-manager.svelte.js:21`), so it meets one clause and fails the others. I did not test "at most two lines and one action" or "announced politely".

### Test of the revised Verify's step 1 (reporter list)

Command: `grep -rnE "toast(Manager)?\.(error|danger)|toastError|\btoast\(|snackbar" <src> --include=... | wc -l`.

```
first 8: jellyfin-web 72  uptime-kuma 83  memos 1  mealie 4  immich 22  open-webui 776  element-web 2  hoppscotch 329
fresh:   linkwarden 76  homarr 0  actual 0  paperless-ngx 119
```

Two fresh codebases return 0 although they have error reporters: homarr (`showErrorNotification`, 250 call sites) and actual (`addNotification` with `type: 'error'`, 158 call sites by `grep -rn "addNotification" ... \| grep -v test \| wc -l`). Memos returns 1 although it reports errors through a wrapper. So step 1 as drafted in the first version finds the reporter only when it is named like a toast. The revised text below adds the notifier names and a fallback.

### Recommendation: keep MUST; change the Verify

The rule fires on real violations in 7 of 12 codebases, and conforming implementations exist (memos; uptime-kuma's DOWN toast; actual's sticky errors). The check is what is wrong. Proposed new Verify text for UX-STATE-17, replacing line 214:

> Verify: (1) list the error reporters: `grep -rnE "toast(Manager)?\.(error|danger)|toastError|\btoast\(|snackbar|showError\w*|addNotification|notifications\.show|type: ['\"]error['\"]" <src> | wc -l`, then open the project's toast helper or notification mount. A count of 0 does not pass: search the project's own error helper by name (`grep -rn "error" <helper dir>`) before concluding there is no reporter. (2) Find the effective duration for error severity: a per-call `timeout`, `duration`, `autoClose` or `sticky`, else the helper's default, else the library's default (for a dependency, read its source in its package tarball and record the file and line). Fail when error severity inherits a finite duration. Pass when error severity is `0`, `false`, `Infinity`, `-1` or `sticky: true`, as that library defines no timeout. If error severity is finite but every error is also kept in a reachable history (a list that survives the timer), mark it as meeting the rationale and not the sentence "Never auto-dismiss an error", and report both. (3) `grep -rnE -B3 -A3 'setTimeout' <src> | grep -iE 'toast|notif|snackbar|flash'`, then read each hit: a timer on an error fails. Copy and "saved" confirmations are exempt. (4) A timed message with no other path to its content fails (a helper that only toasts and writes `console.error` counts as no other path).

Note the rule text itself: bullet one and the sentence "Never auto-dismiss an error" read as a flat ban. Paperless-ngx shows a case that satisfies the WCAG rationale and breaks that sentence. The owner should decide which governs; I did not change the sentence.

## UX-STATE-34: cache age and a refresh action

### Running the verification as written

Command (the rule's trigger, minus its read step):

```
grep -rnE 'syncedAt|lastSynced|lastFetched|fetchedAt|staleTime' <src> --include='*.ts' --include='*.tsx' --include='*.js' --include='*.vue' --include='*.svelte' | grep -vE 'test|spec'
```

| App | Hit lines | Files |
|---|---|---|
| jellyfin-web | 4 | 8 |
| uptime-kuma | 0 | 0 |
| memos | 38 | 14 |
| mealie | 0 | 0 |
| immich | 50 | 35 |
| open-webui | 3 | 1 |
| element-web | 3 | 1 |
| hoppscotch | 0 | 0 |
| fresh: linkwarden | 1 | 1 |
| fresh: homarr | 17 | not counted |
| fresh: actual | 19 | not counted |
| fresh: paperless-ngx | 0 | 0 |

(The first 8 rows are the first version's figures, whose reading is repeated in this section. The fresh rows come from `grep -rnE ... \| wc -l` in `fresh/`.) I read all hits in jellyfin-web, open-webui and element-web, and the memos hits as listed. Every one of the first-8 hits is one of:

- `staleTime`, a TanStack Query option for when a query refetches, not a rendered age (jellyfin `apps/dashboard/features/plugins/api/usePackages.ts:25`; memos 25+ lines in `hooks/*.ts`; immich `+page.ts` loaders with `staleTime: 0`).
- A ref holding a previous value (memos `contexts/MemoFilterContext.tsx:81-120`).
- A stored field not rendered (element-web `stores/OwnProfileStore.ts:33,79,188`).
- A request parameter (open-webui `SyncStatsModal.svelte:169-170`).

The trigger, with its reading step, reported zero instances in the first eight codebases.

### Instances found by searching the UI strings

`grep -iE 'last (updated|synced|refreshed|checked|fetched|scan)|updated .*ago|as of |cached'` over the English locale files hit uptime-kuma, memos, hoppscotch and element-web (counts are the earlier pass's). Two are age-plus-refresh views:

| Site | Evidence | Verdict |
|---|---|---|
| [`memos/web/src/components/Settings/ResourceStatsSection.tsx:40-58`](https://github.com/usememos/memos/blob/78a8dc8/web/src/components/Settings/ResourceStatsSection.tsx#L40-L58) | "Last updated {ago}" from the server's `generatedTime`, and a refresh `Button` that invalidates the query, disabled while fetching. `generatedTime` is not among the rule's tokens. | Conforming |
| [`uptime-kuma/src/pages/StatusPage.vue:579-583`](https://github.com/louislam/uptime-kuma/blob/d35c3fa/src/pages/StatusPage.vue#L579-L583) | Footer shows "Last Updated" from `lastUpdateTime` and a refresh countdown. Polled at an interval (line 1015), so auto-refresh. | Conforming in spirit |

One arguable violator: `jellyfin-web/src/apps/dashboard/routes/plugins/index.tsx` via `usePackages` (`staleTime: 15 * 60 * 1000`) shows no age and no refresh control. The command and its full output: `grep -rn 'dataUpdatedAt\|isStale' jellyfin-web/src` returned no lines (zero matches). TanStack refetches a stale query on mount and on focus, so the window is bounded. I count it as arguable, not a clean violator. I found no clean violating instance of UX-STATE-34 in 12 codebases. The held-out question "a violating instance for 34" is therefore answered: not found.

### Fresh codebase: a conforming view the written trigger misses

[`homarr/apps/nextjs/src/components/board/items/widget-context-menu.tsx:429`](https://github.com/homarr-labs/homarr/blob/3ee454b/apps/nextjs/src/components/board/items/widget-context-menu.tsx#L429) reads `query.state.dataUpdatedAt`, renders an age (`useTimeAgo(new Date(latest || Date.now()))`, line 433 with `ageSuffix`), and the same menu has a refresh action (`IconRefresh`, line 6; `onRefresh={handleRefetch}`, line 324). The board also persists cached query data for up to three days (`_query-snapshot.ts:19`, `snapshotMaxAgeMs = 3 * 24 * 60 * 60 * 1000`; `:89` filters on `dataUpdatedAt`). That view conforms. The written trigger does not find it:

```
$ grep -nE 'syncedAt|lastSynced|lastFetched|fetchedAt|staleTime' components/board/items/widget-context-menu.tsx | wc -l
0
```

The revised trigger below (token `dataUpdatedAt`) does find it. Its age sits inside a context menu, so a user must open it to see the age. The rule does not say where the age must appear.

Fresh actual: `Reconcile.tsx:147` (`lastSyncedBalance`) shows a last-synced bank balance. It is a value, not an age, so the trigger's token matches but the view is not an age display. That is a false trigger that the reading step discards. Fresh paperless-ngx: `system-status-dialog.component.html:197`, "Last Updated", is a status field of the dialog, not a cached-data age, and no refresh action sits beside it (not read in more depth).

### False passes and false fails of the verification as written

- The trigger never fires on a rendered age in the first 8 codebases (0 of 8), while 2 conforming views exist under other names (`generatedTime`, `lastUpdateTime`). In homarr it also misses a conforming view (`dataUpdatedAt`). So any pass or fail the rule gives here comes from the trigger finding nothing, not from the check separating cases.
- `staleTime` is noise in every TanStack Query app (50 hit lines in immich alone). It is query policy.
- The arguable violator (jellyfin plugin catalog) sits behind a `staleTime` hit that the reading step discards, so the rule passes it.

### Recommendation: keep CONSIDER; change the trigger

Evidence: three conforming views in 12 codebases (memos, uptime-kuma, homarr), no clean violator, and the fleet's own instance. That is too thin to promote, and nothing supports demotion (the rule is already CONSIDER). Proposed trigger text, replacing line 155's trigger sentence:

> Verify: trigger: the view's data module or component matches `grep -nE 'syncedAt|lastSynced|lastFetched|fetchedAt|dataUpdatedAt|generatedTime|lastUpdate\w*|updated_?at'` and the matched value reaches a rendered component (read each hit; a value shown as data, such as `lastSyncedBalance`, is not an age), or the UI strings contain `last (updated|synced|refreshed)`. Do not trigger on `staleTime`, `gcTime`, `cache`, `globalState.get` or `localStorage.getItem`: `staleTime` is a refetch policy and matched 4, 38, 50 and 17 lines in four TanStack Query codebases with no rendered age. For each triggered view, some fixture must contain a timestamp or an age phrase and a refresh control, or the data must refresh on an interval shown to the user. A view that renders a query with `staleTime` over 60 s and shows no age is a candidate: read it, and note it without failing it (jellyfin plugin catalog, 15 min).

Tested on the fresh set: it matches homarr's `widget-context-menu.tsx`, actual's `Reconcile.tsx` (discarded on reading), and linkwarden's `importFromWallabag.ts:18` (a migration type, discarded on reading). It adds read work for two false triggers in 12 codebases.

## UX-STATE-36 (proposed in the first version): withdrawn

The first version proposed a new rule that a `.catch(() => [])` feeding an empty state fails, with the grep `\.catch\(\(\) *=> *(\[\]|null|undefined|\{\})\)`, and admitted the grep was never run. It was run now.

Command and output (one-line form), per codebase:

```
$ grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' --include='*.svelte' '\.catch\(\(\) *=> *(\[\]|null|undefined|\{\})\)' <src> | wc -l
jellyfin-web 1   uptime-kuma 1   memos 4   mealie 1   immich 5   open-webui 160   element-web 11   hoppscotch 7
fresh: linkwarden 8   homarr 26   actual 3   paperless-ngx 0
```

Three problems:

1. It misses its own instance. `KnowledgeSelector.svelte:61-63,77-79,92-94` (the motivating case, [lines](https://github.com/open-webui/open-webui/blob/926f826/src/lib/components/workspace/Models/Knowledge/KnowledgeSelector.svelte#L61-L63)) uses the block form `.catch(() => {\n return null;\n })`, which a one-line grep does not match. `grep -n 'catch' KnowledgeSelector.svelte` shows `.catch(() => {` at lines 61, 77 and 92, and no line matches the proposed pattern.
2. The pattern's `\{\}` branch matches `.catch(() => {})`, an empty function body (a fire-and-forget swallow, not an empty-value result). Most hits are that. Of the 19 hits in the six smaller first-sample codebases (jellyfin 1, uptime-kuma 1, memos 4, mealie 1, immich 5, hoppscotch 7; element-web's 11 and open-webui's 160 were not read), 11 are `.catch(() => {})` or `() => undefined` on a fire-and-forget promise (examples: `uptime-kuma PublicGroupList.vue:205`, `memos useFocusMode.ts:56`, `immich cancellable-task.ts:105`).
3. Reading the 8 remaining value-returning hits (jellyfin `playbackmanager.js:3016`, memos `code-highlight.ts:41`, mealie `use-group-recipe-actions.ts:120`, immich 3, hoppscotch `MonacoScriptEditor.vue:186,190`) found no empty-state violation. Two are arguable: `immich/web/src/lib/managers/memory-manager.svelte.ts:89` (a failed memory lookup becomes "not found") and `immich/.../geolocation/+page.svelte:119` (a failed reverse-geocode shows no place name). One is an arguable instance of UX-STATE-03 in a fresh codebase: [`homarr/apps/nextjs/src/app/[locale]/manage/custom-widgets/preview/[id]/page.tsx:12-13`](https://github.com/homarr-labs/homarr/blob/3ee454b/apps/nextjs/src/app/%5Blocale%5D/manage/custom-widgets/preview/%5Bid%5D/page.tsx#L12-L13), where `previewGet(...).catch(() => null)` followed by `if (!preview) notFound()` turns a failed request into a 404 page.

A multi-line form does find the motivating case. Command: `P='\.catch\(\(\)\s*=>\s*(\{\s*return\s+)?(\[\]|null|undefined)\b'; grep -rlPz --include='*.svelte' --include='*.ts' --include='*.js' --include='*.tsx' --include='*.vue' "$P" <src>`. It returns 47 files in open-webui (`KnowledgeSelector.svelte` among them, checked with `grep -c KnowledgeSelector`, output `1`), 0 to 3 files in each of the other eight codebases (jellyfin 1, memos 2, mealie 1, immich 1, hoppscotch 1, uptime-kuma 0, element-web 0; fresh linkwarden 3, homarr 19, actual 2), and 99 lines in open-webui alone. That is a locator with heavy noise, not a detector.

Verdict: do not add UX-STATE-36. It duplicates UX-STATE-03, and the only instance it rests on is an UX-STATE-03 failure. The better fix is a Verify clause on UX-STATE-03, whose written grep (`grep -rnE -A3 'catch *\(' src | grep -B1 -A2 'console\.(error|warn|log)'`, `ux-interface-states.md:123`) cannot see a `catch` that returns `null` with no console call, as in KnowledgeSelector.

## Effect on the ruleset

| Rule | Effect | Exact change |
|---|---|---|
| UX-STATE-02 | confirm MUST, change the Verify | Replace line 119 with the text under "Recommendation: keep MUST; change the Verify" in the UX-STATE-02 section. Add reference instances: fail `uptime-kuma/src/pages/ManageMaintenance.vue:17-21`, `open-webui/.../admin/Settings/Events.svelte:769`; pass `memos/.../PagedMemoList.tsx:251`, `uptime-kuma/.../MonitorList.vue:114-118`, `paperless-ngx/.../saved-views.component.html:79`. In the untested note (line 107), remove "02" from the list, and say the reading check as first worded failed 7 of 12 conforming sites. |
| UX-STATE-17 | confirm MUST, change the Verify | Replace line 214 with the text under "Recommendation: keep MUST; change the Verify" in the UX-STATE-17 section. Add reference instances: fail `immich/web/src/lib/utils/handle-error.ts:56` (3000 ms in `@immich/ui` 0.95.1), `open-webui/.../common/Toaster.svelte:24` (4000 ms, 776 error calls), `linkwarden/apps/web/pages/_app.tsx:82` (4000 ms, `react-hot-toast` 2.4.1), `homarr/packages/notifications/src/index.tsx:12` (4000 ms, 250 calls); pass `memos/web/src/lib/toast.ts:12`. Remove "17" from the untested note. Open question for the owner: whether "Never auto-dismiss an error" or the WCAG "available another way" clause governs when a history exists (paperless-ngx). |
| UX-STATE-34 | confirm CONSIDER, change the trigger | Replace the trigger sentence on line 155 with the text under "Recommendation: keep CONSIDER; change the trigger". Add conforming instances `memos/.../ResourceStatsSection.tsx:40-58`, `uptime-kuma/.../StatusPage.vue:579-583`, `homarr/.../widget-context-menu.tsx:429`. Update the rationale: still no clean violator found in 12 codebases, so the ruleset's "one instance" note becomes "one fleet instance and three held-out conforming views, no held-out violator". |
| UX-STATE-03 | change (Verify only, severity unchanged) | Append to its Verify: "Also locate catch handlers that return an empty value: `grep -rlPz '\.catch\(\(\)\s*=>\s*(\{\s*return\s+)?(\[\]\|null\|undefined)\b' src`, then read each: a value that reaches an empty-state or `notFound()` branch fails. Ignore `.catch(() => {})` on fire-and-forget calls." Reference instance: `open-webui/.../KnowledgeSelector.svelte:61-63` (a failed search reads as "No knowledge found"). Tested: finds it, with heavy noise in one codebase (99 lines in open-webui). |
| NEW UX-STATE-36 | do not add | The proposal is withdrawn (section above). Nothing changes in the ruleset for it. |

## Dated facts

| Fact | Source | Date |
|---|---|---|
| The 12 commits listed in Method | `git -C <repo> log -1 --format='%h %cs'` in each clone; repositories linked in the Method table | run 2026-11-27 |
| `@immich/ui` 0.95.1 toast default `timeout = 3000`, `closable = true` | `dist/services/toast-manager.svelte.js:21`, from https://registry.npmjs.org/@immich/ui/-/ui-0.95.1.tgz; the range comes from `immich/web/package.json:39` at `a608f8f` | fetched 2026-11-27 |
| `svelte-sonner` 0.3.28 `export let duration = 4000` | `dist/Toaster.svelte:48`, from https://registry.npmjs.org/svelte-sonner/-/svelte-sonner-0.3.28.tgz; version from `open-webui/package-lock.json:14318` at `926f826` | fetched 2026-11-27 |
| `vue-toastification` 2.0.0-rc.5 toast `timeout` default 5000 | `src/ts/propValidators.ts:58-61`, from https://registry.npmjs.org/vue-toastification/-/vue-toastification-2.0.0-rc.5.tgz; range from `uptime-kuma/package.json:234` at `d35c3fa` | fetched 2026-11-27 |
| `react-hot-toast` 2.4.1 error toast duration 4000, success 2000 | `src/core/store.ts:174-176`, from https://registry.npmjs.org/react-hot-toast/-/react-hot-toast-2.4.1.tgz; version from `linkwarden/yarn.lock:19422` at `24adcc1` | fetched 2026-11-27 |
| `@mantine/notifications` 9.6.0 `autoClose: 4000` default | `esm/Notifications.mjs:20`, from https://registry.npmjs.org/@mantine/notifications/-/notifications-9.6.0.tgz; version from homarr `package.json:64` at `3ee454b` | fetched 2026-11-27 |
| Jellyfin toast 3300 ms, no severity or close control | https://github.com/jellyfin/jellyfin-web/blob/8022a5d/src/components/toast/toast.ts | read 2026-11-27 |
| Memos error toasts persist (`timeout: 0`) | https://github.com/usememos/memos/blob/78a8dc8/web/src/lib/toast.ts | read 2026-11-27 |
| Paperless-ngx `showError` default delay 10000 ms, toast history kept | https://github.com/paperless-ngx/paperless-ngx/blob/26599c3/src-ui/src/app/services/toast.service.ts | read 2026-11-27 |
| Actual notification default timeout 6500 ms unless `sticky` | https://github.com/actualbudget/actual/blob/bdfe00f/packages/desktop-client/src/components/Notifications.tsx | read 2026-11-27 |

All figures are from open-source code read in the clones. No vendor marketing data was used. Library versions are the lockfile or range stated, not necessarily what the app ships at runtime.

## What could not be determined

- The never-resolving-fetch render test of UX-STATE-02. It needs each app built and running against a backend or a mock, which means a database and an account for Immich, Memos, Mealie, Open WebUI and Uptime Kuma. I did not build or run any app. The three violations are static findings: a flash of the empty copy before data arrives is inferred from the code path, not observed. Missing: a running instance of each app, or a component-test harness with the transport mocked. This was not attempted in this pass either: the components import app stores and i18n contexts that would need stubbing, and a stub written for the question would test the stub.
- A violating instance of UX-STATE-34. None was found in 12 codebases. Missing: a codebase with a cached view that shows no age and offers no refresh, which a locale-string or field search does not reveal.
- Whether a screen reader announces the immich, open-webui, linkwarden and homarr error toasts, and whether they can be paused. Needs a running app and a screen reader. Not tested.
- Recall of the UX-STATE-02 locators: locator B found 2 of the 3 known violators and missed the linkwarden `!links[0]` form. Element-web (97 length-test lines in `.tsx`) and hoppscotch's `TeamCollections.vue:453` (its empty node depends on a tree component in `@hoppscotch/ui` that is not in the clone) were counted but not classified. Paperless-ngx was read for 5 of its candidate files only. Missing: a complete read of those sites.
- Error severity for the hoppscotch toasts. They use `@hoppscotch/vue-toasted` 0.1.0 (`hoppscotch-common/package.json:45`), whose default duration was not read. Element-web's toast store (`stores/ToastStore.ts`) was not read beyond the room-list toast. Neither is classified for UX-STATE-17.
- A second reader. All classifications are mine, with no independent check. The revised Verify texts of 02, 17 and 34 were drafted from the first eight codebases and then run once on four fresh ones; they are not validated.
