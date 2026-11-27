---
title: Do the UX-STATE-07 and UX-STATE-34 trigger greps work on a second codebase
program: product
topic: ux-interface-states
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 2
---

# Do the UX-STATE-07 and UX-STATE-34 trigger greps work on a second codebase

## Answer

Partly. The worry about `MAX_` constants is wrong, but the greps still fail, for other reasons. This version repairs the first draft: every count below now has its command and its output in this file, and one overreaching claim is corrected.

1. **The `.slice(0, CONSTANT)` grep is not noisy.** It returns 1 hit in one codebase and 3 in the other. `MAX_` constants are common (8 and 16 definitions, 33 and 66 uses), but almost none sit in a `.slice(0, …)`. The constant-only grep misses caps written as a number literal. Allowing literals raises the raw hits to 4 and 6, and 4 and 3 after a name filter.
2. **The paging grep is unusable as written, because of the token `cursor`.** In a canvas app, all 254 lines matching it are in code about the mouse pointer, text selection, or are CSS and comments, and none is paging (the proof is in section 1). In a VS Code extension, 14 lines match: 11 are text-editor cursors or CSS, 3 are GraphQL cursors in comments. The tokens `nextPage`, `pageToken` and `[?&](page|offset)=` matched 0 lines in both. The paging that exists in the extension uses `hasNextPage`, `pageInfo`, `per_page`, `endCursor` and `hasMorePages`.
3. **The replacement paging pattern finds the paged data, but not mainly the views.** Run exactly as written, it matches 109 lines in 12 files of the extension and 0 in the canvas app. I read all 109 lines. Only 2 of the 12 files contain code that puts a "more" affordance in front of the user (`categoryNode.ts:343`, `notificationsManager.ts:98`). The other 10 are page-state code that feeds them, fetch-all loops that never show a partial list, type declarations, and single-call limits. So the pattern is a good first filter on data modules, and the reviewer must still trace to the view. The first draft said "no false positives"; that was wrong, and section 2 gives the measured split.
4. **The cache grep is unusable.** The bare word `cache` matches 454 lines in 43 files in one codebase and 601 lines in 74 files in the other. The narrow persistence tokens hit 27 and 18 lines, which I read in full this time: none is server data shown with an age. The stale-data tokens hit 3 lines and 0 lines, and the 3 are one internal field that no view shows.

The fleet's own hit for UX-STATE-34 (`synced 12 min ago`) therefore does not show that the grep generalises. It matched because that codebase happens to use the token `syncedAt`.

## Method

Two public codebases outside the fleet, cloned with `--depth 1` into `~/.cache/research-lang/exemplars/product/wave2/`. Nothing was changed in any existing repository. The clones from the first pass were reused; the HEAD check below confirms they are unchanged.

| Name | Repository | HEAD | Commit date | Why chosen |
|---|---|---|---|---|
| `prgh` | https://github.com/microsoft/vscode-pull-request-github | `c9891f1` | 2026-11-27 | A VS Code extension with a webview, remote paged data and a data layer, the same surface as the fleet's extension. |
| `excal` | https://github.com/excalidraw/excalidraw | `dabd83c` | 2026-11-25 | A React web app with list-like components (pickers, a library menu), the web surface. |

```
$ git clone -q --depth 1 https://github.com/microsoft/vscode-pull-request-github.git prgh
$ git clone -q --depth 1 https://github.com/excalidraw/excalidraw.git excal
$ for d in prgh excal; do git -C $d rev-parse --short HEAD; done
c9891f1
dabd83c
```

Scope of every grep: `-- '*.ts' '*.tsx' ':!*test*' ':!*spec*'`, so TypeScript and TSX only, test and spec paths excluded. File counts, with the command and output (the first draft's 395 and 728 included js and jsx, which did not match its label):

```
$ for d in prgh excal; do echo "$d ts+tsx: $(git -C $d ls-files | grep -cE '\.(ts|tsx)$')  js+jsx: $(git -C $d ls-files | grep -cE '\.(js|jsx)$')  all4: $(git -C $d ls-files | grep -cE '\.(ts|tsx|js|jsx)$')"; done
prgh ts+tsx: 379  js+jsx: 16  all4: 395
excal ts+tsx: 703  js+jsx: 25  all4: 728
```

So the correct figures for the greps' scope are 379 and 703 files. Two scope notes: `*test*` also excludes any path containing the substring "test", and the `-- '*.ts'` pathspec matches `.ts` files at any depth.

## Measurements

### 1. The paging trigger as written

Trigger from UX-STATE-07: `cursor|nextPage|pageToken|[?&](page|offset)=`.

```
$ git -C prgh grep -nE 'cursor|nextPage|pageToken|[?&](page|offset)=' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-170
src/commands.ts:1507:			// Insert placeholders at the current cursor position
src/commands.ts:1509:			const cursor = commentEditor.selection.end;
src/commands.ts:1510:			const before = commentEditor.document.getText(new vscode.Range(new vscode.Position(0, 0), cursor));
src/commands.ts:1513:				editBuilder.insert(cursor, `${separator}${placeholdersText}\n`);
src/commands.ts:2239:		const cursorPosition = editor.selection.active;
src/commands.ts:2245:			// cursorPosition.line is 0-based, diff.modifiedStartLineNumber is 1-based
src/commands.ts:2246:			if (next && cursorPosition.line + 1 < diff.modifiedStartLineNumber) {
src/commands.ts:2250:			} else if (!next && cursorPosition.line + 1 > diff.modifiedStartLineNumber) {
src/github/githubRepository.ts:2197:		// Once we fall back to the legacy assignableUsers query, the cursors are not compatible
src/github/githubRepository.ts:2244:				// because the legacy fallback kicked in inside query()), the cursor is incompatible with
src/github/pullRequestModel.ts:1665:					// Retry the same cursor with 5, then 1 thread, and keep that size.
src/issues/issueFeatureRegistrar.ts:303:					vscode.window.showWarningMessage(vscode.l10n.t('No active editor. Open a file and place the cursor on an issue reference.'));
src/issues/issueFeatureRegistrar.ts:312:					vscode.window.showWarningMessage(vscode.l10n.t('No issue reference found at cursor position.'));
webviews/components/sidebar.tsx:610:					cursor: 'pointer'
```

Reading the 14 lines above: the 3 GraphQL cursors are `githubRepository.ts:2197`, `githubRepository.ts:2244` and `pullRequestModel.ts:1665`, all `//` comments. The other 11 are the text editor's cursor (`commands.ts:1507-1513`, `2239-2250`, `issueFeatureRegistrar.ts:303,312`) and CSS (`sidebar.tsx:610`). No hit is code that pages.

`excal`: the same grep, and each token alone.

```
$ git -C excal grep -nE 'cursor|nextPage|pageToken|[?&](page|offset)=' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l
254
$ for t in cursor nextPage pageToken '[?&](page|offset)='; do echo "$t: $(git -C excal grep -hE "$t" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
cursor: 254
nextPage: 0
pageToken: 0
[?&](page|offset)=: 0
$ git -C excal grep -nE 'cursor' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-150 | head -8
examples/with-script-in-browser/components/ExampleApp.tsx:514:            cursor: "pointer",
excalidraw-app/CustomStats.tsx:64:        style={{ textAlign: "center", cursor: "pointer" }}
packages/element/src/arrowEndpointText.ts:57: * Finds a free (unbound) arrow endpoint under the cursor, front-most first.
packages/element/src/dragElements.ts:357:      // Depending on where the cursor is at (x, y) relative to where the starting point is
packages/element/src/dragElements.ts:359:      // This allows the cursor to always "stick" to one of the sides of the bounding box.
packages/element/src/frame.ts:190:  cursorCoords: {
packages/element/src/frame.ts:201:    pointFrom(cursorCoords.x, cursorCoords.y),
packages/element/src/resizeElements.ts:1041:  // Calculate new dimensions based on cursor position
```

I did not read all 254 `excal` lines by hand. To test the claim that none is paging, I filtered them for paging words (`page|after|next|fetch|offset|limit`):

```
$ git -C excal grep -nEi 'cursor' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | grep -iE 'page|after|next|fetch|offset|limit' | cut -c1-150
packages/element/src/linearElementEditor.ts:1188:    const clickedPointIndex = boundTextGrabOffset ? -1 : pointIndexUnderCursor;
packages/element/src/linearElementEditor.ts:1547:        nextSelectedIndices.push(indexCursor + 1);
packages/excalidraw/components/App.text.ts:428:    // move cursor, a resize handle's…) until the pointer next moves over it:
packages/excalidraw/components/App.tsx:5358:            this.cursorHints.onArrowTypeCycled(nextArrowType);
packages/excalidraw/components/App.tsx:5817:      this.cursor.applyForTool(nextActiveTool);
packages/excalidraw/components/CursorHint.tsx:62:   * Shows a transient tooltip next to the cursor, hidden automatically
packages/excalidraw/components/CursorHint.tsx:107: * Transient tooltip shown next to the cursor for added affordance after
packages/excalidraw/data/encode.ts:245:    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;
packages/excalidraw/data/encode.ts:281:    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;
```

9 lines survive the filter, and all 9 are pointer or byte-offset code, none paging. The other 245 lines match no paging word. This is strong evidence, not a read of all 254 lines, and I label it so.

**"Excalidraw does not page remote data", measured.** The first draft inferred this from a 0-hit grep, which cannot prove absence. The direct measurement is the list of every network call site, then a search for limit or pagination calls in the files that make them:

```
$ git -C excal grep -nE '\bfetch\(|XMLHttpRequest|getDoc\(' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l
19
$ git -C excal grep -nE '\bfetch\(|axios|XMLHttpRequest|new WebSocket|getDocs|getDoc\(|getDownloadURL|listAll' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-160
examples/with-script-in-browser/components/ExampleApp.tsx:148:      const res = await fetch("/images/rocket.jpeg");
excalidraw-app/App.tsx:310:      const request = await fetch(window.decodeURIComponent(url));
excalidraw-app/components/AI.tsx:65:          const response = await fetch(
excalidraw-app/data/cacheMermaidChunks.ts:29:    .then(() => fetch(`${import.meta.env.BASE_URL}${listFileName}`))
excalidraw-app/data/cacheMermaidChunks.ts:34:          fetch(`${import.meta.env.BASE_URL}${fileName}`, { priority: "low" }),
excalidraw-app/data/firebase.ts:259:  const docSnap = await getDoc(docRef);
excalidraw-app/data/firebase.ts:291:        const response = await fetch(`${url}?alt=media`);
excalidraw-app/data/index.ts:207:    const response = await fetch(`${BACKEND_V2_GET}${id}`);
excalidraw-app/data/index.ts:276:    const response = await fetch(BACKEND_V2_POST, {
packages/excalidraw/components/PublishLibrary.tsx:318:    fetch(`${import.meta.env.VITE_APP_LIBRARY_BACKEND}/submit`, {
packages/excalidraw/components/TTDDialog/utils/TTDStreamFetch.ts:101:    const response = await fetch(url, {
packages/excalidraw/data/blob.ts:430:    response = await fetch(imageUrl);
packages/excalidraw/data/library.ts:733:          const request = await fetch(libraryUrl);
packages/excalidraw/fonts/ExcalidrawFontFace.ts:92:      const response = await fetch(url, {
packages/excalidraw/subset/woff2/woff2-bindings.ts:178:        const xhr = new XMLHttpRequest();
packages/excalidraw/subset/woff2/woff2-bindings.ts:185:        const xhr = new XMLHttpRequest();
packages/excalidraw/subset/woff2/woff2-bindings.ts:193:        const xhr = new XMLHttpRequest();
packages/excalidraw/subset/woff2/woff2-bindings.ts:930:        return fetch(wasmBinaryFile, { credentials: "same-origin" })
packages/excalidraw/subset/woff2/woff2-bindings.ts:989:          fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
$ cd excal && git grep -nEi '[?&]limit=|\blimit:|startAfter|orderBy\(|getDocs|listAll|maxResults|skip=' -- 'excalidraw-app/*' 'packages/excalidraw/data/*' 'packages/excalidraw/components/PublishLibrary.tsx' ':!*test*' | cut -c1-150
(no output)
```

Both patterns return 19 lines, so the extra tokens (`axios`, `new WebSocket`, `getDocs`, `getDownloadURL`, `listAll`) matched nothing. Each of the 19 listed call sites reads one resource by URL or id (an image, a scene by id, a library file, a font, a wasm binary, an AI stream, or one Firestore document). None passes a limit, an offset, a start-after cursor or a list call, and the search for those in the files that make the calls returns nothing. So the supported statement is: **in the 19 network call sites, each reads one resource, and no call asks for a page.** I did not read the response handling of each call. That is a measurement of call sites, which supports the claim "no paged remote list" but is not a proof about every code path (for example, a WebSocket collaboration channel lives in a package outside the scoped paths if it exists).

### 2. The replacement paging trigger, run exactly as proposed

The pattern, with every token, is the one proposed for UX-STATE-07's Verify text (the same as the combined pattern in the "Effect on the ruleset" section). The sub-pattern `PG` (without `nextPage|pageToken|[?&](page|offset)=`) matched the same lines, because those three tokens match nothing in either repository.

```
$ PG='hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo|nextPage|pageToken|[?&](page|offset)='
$ for d in prgh excal; do echo "$d lines: $(git -C $d grep -nE "$PG" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l) files: $(git -C $d grep -lE "$PG" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
prgh lines: 109 files: 12
excal lines: 0 files: 0
```

All 109 lines, read. Per-file line counts:

```
$ git -C prgh grep -nE 'hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -d: -f1 | sort | uniq -c | sort -rn
     30 src/github/folderRepositoryManager.ts
     27 src/github/githubRepository.ts
     17 src/github/graphql.ts
     11 src/github/pullRequestModel.ts
      5 src/notifications/notificationsManager.ts
      5 src/github/utils.ts
      4 src/view/treeNodes/categoryNode.ts
      4 src/view/prsTreeModel.ts
      3 src/notifications/notificationsProvider.ts
      1 src/github/repositoriesManager.ts
      1 src/github/issueModel.ts
      1 src/gitExtensionIntegration.ts
```

The full 109-line listing was printed and read (`git -C prgh grep -nE … | cut -c1-165`; it is too long to repeat in full here, so the lines that decide each file's role are quoted). What each of the 12 files does, from reading every line:

| File | Lines | Role | Reaches a partial view |
|---|---|---|---|
| `view/treeNodes/categoryNode.ts` | 4 | `343: if (hasMorePages) { nodes.push(new PRCategoryActionNode(this, PRCategoryActionType.More, this)); }` and the label `Load more` (lines 52, 54, 62). | Yes, a "Load more" tree row. |
| `notifications/notificationsManager.ts` | 5 | `98: if (notificationsData.hasNextPage) { return [...notificationsData.notifications, { kind: 'loadMoreNotifications' }]; }` | Yes, a "load more" row. |
| `github/folderRepositoryManager.ts` | 30 | Page-state machine (`1387-1457`: `pullRequestPage`, `hasMorePages`, `fetchPage`) that feeds `categoryNode`. Also a fetch-all loop `1238-1264` (`do { … } while (hasNextPage)`). | Feeds a view. |
| `view/prsTreeModel.ts` | 4 | `581-589` loops `do { … } while (response.hasMorePages || response.hasUnsearchedRepositories)`, so it fetches all. `319, 331` hard-code `hasMorePages: false`. | No. |
| `github/githubRepository.ts` | 27 | `858-894` one page of PRs plus `hasMorePages`; `1463` search `hasMorePages: data.search.pageInfo.hasNextPage`; `2065-2401` four `do { … } while (hasNextPage)` fetch-all loops (refs, mentionable users, assignable users, teams); `1032` and `1193` are `per_page: 1` existence checks. | Page source only. |
| `github/pullRequestModel.ts` | 11 | `1677-1680`, `1829-1842`, `2818-2842` fetch-all GraphQL loops; `1751` is `per_page: 100` in one call. | No. |
| `github/utils.ts` | 5 | `1775-1796`, a `restPaginate` helper that loops to the end. | No. |
| `notifications/notificationsProvider.ts` | 3 | `100` `per_page: pageSize`, `109` returns `hasNextPage` from the link header. | Feeds `notificationsManager`. |
| `github/graphql.ts` | 17 | Type declarations of `pageInfo`, `hasNextPage`, `endCursor`. | No. |
| `github/repositoriesManager.ts` | 1 | `28: hasMorePages: boolean;` type. | No. |
| `github/issueModel.ts` | 1 | `542: per_page: 100`, one call. | No. |
| `gitExtensionIntegration.ts` | 1 | `67: hub.octokit.call(…listForAuthenticatedUser, { sort: 'pushed', per_page: 100 })`, one call with no further pages. | Not traced. |

Result: of 12 matched files, 2 directly render a "more" affordance, 3 are page sources or page state for them (`folderRepositoryManager`, `githubRepository` lines 858-894 and 1463, `notificationsProvider`), and 7 are fetch-all loops, types or single calls that never show a partial list. The trigger has high recall for paging in this codebase and low precision per file, so it is a filter for data modules, not a detector of partial views. The reviewer's trace step (match, then find the view that renders it) is real work. `gitExtensionIntegration.ts:67` is a possible silent first-page-only call, but whether its result reaches a view was not traced.

A render-side token set was also run, to see whether it would shorten the trace:

```
$ R='Load more|loadMore|Show more|showMore|fetchNextPage|[Ii]nfinite[Ss]croll|IntersectionObserver'
$ for d in prgh excal; do echo "-- $d $(git -C $d grep -nE "$R" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
-- prgh 44
-- excal 3
$ git -C excal grep -nE "$R" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-140
packages/excalidraw/components/IconPicker.tsx:83:  const [showMoreOptions, setShowMoreOptions] = useAtom(moreOptionsAtom);
packages/excalidraw/components/IconPicker.tsx:88:    ...(showMoreOptions ? hiddenSections : []),
packages/excalidraw/components/IconPicker.tsx:270:            open={showMoreOptions}
```

In `excal` its 3 hits are all one "more options" toggle in an icon picker, not paging. In `prgh` it returns 44 lines, of which I read the first 15: they are the `fetchNextPage` option plumbing and the notification "load more" command, so they are paging. I did not read the other 29. I do not propose it as a rule trigger: the sample is one codebase with real hits and one with a false hit.

An earlier draft of the paging pattern also contained `\bpage *[:=] *\$?\{?[a-z]`. It added 2 false hits in `excal` (`mermaidSyntaxLink = (page: string)` and a comment about scrolling a page) and nothing useful in `prgh`. It is not in the proposal. I did not re-run that pattern in this pass.

### 3. The capped-list trigger as written, and with number literals

Trigger: `\.slice\(0, *[A-Z_]{3,}\)`.

```
$ git -C prgh grep -nE '\.slice\(0, *[A-Z_]{3,}\)' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*'
src/github/changesSinceReview.ts:150:	const shown = fileNames.slice(0, MAX_FILES_IN_MESSAGE).join(', ');
$ git -C excal grep -nE '\.slice\(0, *[A-Z_]{3,}\)' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*'
excalidraw-app/data/index.ts:181:    const iv = buffer.slice(0, IV_LENGTH_BYTES);
packages/excalidraw/components/ColorPicker/colorPickerUtils.ts:92:    .slice(0, MAX_CUSTOM_COLORS_USED_IN_CANVAS);
packages/excalidraw/components/FontPicker/FontPicker.tsx:70:  const picks = [...new Set(topPicks)].slice(0, FONT_TOP_PICKS_SLOTS);
```

Constant definitions and uses, to test the "noise of MAX_ constants" worry:

```
$ for d in prgh excal; do echo $d defs $(git -C $d grep -hE '(const|let) +MAX_[A-Z_]+ *=' -- '*.ts' '*.tsx' ':!*test*' | wc -l) uses $(git -C $d grep -hE '\bMAX_[A-Z_]+\b' -- '*.ts' '*.tsx' ':!*test*' | wc -l); done
prgh defs 8 uses 33
excal defs 16 uses 66
```

The grep does not search for `MAX_`. It needs `.slice(0, ` directly before the constant, so the many `MAX_` uses never reach it. The 4 hits, read:

| Hit | Verdict |
|---|---|
| `prgh` `changesSinceReview.ts:150` | A capped display with its own count. Lines 148-152: `function formatFileNames(fileNames) { const shown = fileNames.slice(0, MAX_FILES_IN_MESSAGE).join(', '); return fileNames.length > MAX_FILES_IN_MESSAGE ? vscode.l10n.t('{0} and {1} more', shown, fileNames.length - MAX_FILES_IN_MESSAGE) : shown; }`. A notification message, not a list view, and it says what is hidden. Not a violation. |
| `excal` `data/index.ts:181` | False positive. A crypto IV slice of a buffer. |
| `excal` `ColorPicker/colorPickerUtils.ts:92` | A true cap on a swatch list. Lines 85-93 (shown below) end at the slice and return the array with no count and no "more" text. I did not read the component that renders it, so whether the picker says it is capped elsewhere is not established. |
| `excal` `FontPicker/FontPicker.tsx:70` | A fixed number of display slots filled from defaults. A cap, but not an overflow of user data. Marginal. |

```
$ sed -n 85,93p excal/packages/excalidraw/components/ColorPicker/colorPickerUtils.ts
      colorCountMap.set(color, 1);
    }
  });

  return [...colorCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map((c) => c[0])
    .slice(0, MAX_CUSTOM_COLORS_USED_IN_CANVAS);
};
```

Precision of the constant-only grep: 1 true silent cap in the data function, 1 true capped display that already says what is hidden, 1 marginal and 1 false positive out of 4. It is usable, because a reviewer reads each hit as UX-STATE-07 already says. It is not noisy.

### 4. Recall: caps written as number literals

The constant-only pattern misses literal caps. The pattern as proposed, run unfiltered and then with the name filter that drops hashes, buffers and versions:

```
$ SL='\.slice\(0, *([A-Z][A-Z_]{2,}|[0-9]{2,})\)'
$ for d in prgh excal; do echo "-- $d"; git -C $d grep -nE "$SL" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-150; done
-- prgh
src/github/changesSinceReview.ts:150:	const shown = fileNames.slice(0, MAX_FILES_IN_MESSAGE).join(', ');
src/github/createPRViewProvider.ts:158:		recentBranches = recentBranches.slice(0, 10);
src/lm/tools/resolveReviewThreadTool.ts:38:		const snippet = firstComment ? `: "${firstComment.length > 60 ? firstComment.slice(0, 57) + '...' : first
webviews/components/sidebar.tsx:357:			{users.slice(0, 10).map((u, i) => (
-- excal
excalidraw-app/CustomStats.tsx:54:    timestamp = version.slice(0, 16).replace("T", " ");
excalidraw-app/data/index.ts:181:    const iv = buffer.slice(0, IV_LENGTH_BYTES);
packages/excalidraw/components/ColorPicker/colorPickerUtils.ts:92:    .slice(0, MAX_CUSTOM_COLORS_USED_IN_CANVAS);
packages/excalidraw/components/FontPicker/FontPicker.tsx:70:  const picks = [...new Set(topPicks)].slice(0, FONT_TOP_PICKS_SLOTS);
packages/excalidraw/components/TTDDialog/useTTDChatStorage.ts:134:      .slice(0, 10);
packages/excalidraw/data/blob.ts:480:    ...new Uint8Array(await blobToArrayBuffer(file.slice(0, 15))),
$ for d in prgh excal; do echo "-- $d filtered: $(git -C $d grep -nE "$SL" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | grep -vE 'sha|hash|buffer|version|\bb\.slice|file\.slice' | wc -l)"; done
-- prgh filtered: 4
-- excal filtered: 3
```

So the pattern as proposed returns 4 and 6 lines raw, and 4 and 3 after the name filter (the filter drops `CustomStats.tsx:54` as a version string, `data/index.ts:181` as a buffer and `blob.ts:480` as a file slice). New hits compared with the constant-only grep, read:

```
$ sed -n 350,360p prgh/webviews/components/sidebar.tsx
		return () => window.removeEventListener('resize', checkViewportWidth);
	}, []);

	const AvatarStack = ({ users }: { users: { avatarUrl: string; name: string }[] }) => (
		<span className="avatar-stack" style={{
			width: `${Math.min(users.length, 10) * 10 + 10}px`
		}}>
			{users.slice(0, 10).map((u, i) => (
				<span className='stacked-avatar' style={{
					left: `${i * 10}px`,
				}}>
$ sed -n 155,160p prgh/src/github/createPRViewProvider.ts
		recentBranches.unshift(branchName);

		// Limit to 10 branches
		recentBranches = recentBranches.slice(0, 10);

		// Save back to state
$ sed -n 128,136p excal/packages/excalidraw/components/TTDDialog/useTTDChatStorage.ts

    const updatedChats = [
      ...currentSavedChats.filter((chat) => chat.id !== chatHistory.id),
      chatToSave,
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    setSavedChats(updatedChats);
```

- `prgh` `webviews/components/sidebar.tsx:357` (also `Math.min(users.length, 10)` at line 356): a rendered avatar stack capped at 10 users. In the 11 lines read (350-360) there is no hidden-count text. It is a true silent cap in a rendered webview, and the only one found. Lines 350-360 are not the whole component, so a count rendered after line 360 is not excluded; I did not read past it.
- `prgh` `createPRViewProvider.ts:158`: the comment says "Limit to 10 branches", it caps a stored recent-branches list that is later saved to state. Whether the stored list is shown in a picker was not traced.
- `prgh` `resolveReviewThreadTool.ts:38`: string truncation to 57 characters. False positive that the name filter does not remove.
- `excal` `useTTDChatStorage.ts:134`: lines 128-136 cap the saved chat history at 10, sorted newest first, before `setSavedChats`. A stored-list cap. Whether the dialog tells the user older chats were dropped was not read.

So allowing literals adds 1 confirmed silent view cap (`sidebar.tsx:357`) and 2 stored-list caps whose display was not traced, against 1 string-truncation false positive. One real find is a small sample.

### 5. The cache trigger as written

Trigger from UX-STATE-34: `cache|globalState\.get|localStorage\.getItem|syncedAt|lastSynced`.

```
$ for d in prgh excal; do echo "$d $(git -C $d grep -nE 'cache|globalState\.get|localStorage\.getItem|syncedAt|lastSynced' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
prgh 220
excal 282
$ for d in prgh excal; do git -C $d grep -ciE 'cache' -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | awk -F: -v d=$d '{s+=$NF;f++} END{print d": "f" files "s" lines"}'; done
prgh: 43 files 454 lines
excal: 74 files 601 lines
```

The first pair is case-sensitive and the second pair is case-insensitive, so the line counts differ. Both are far past what a reviewer can read per view.

Narrow persistence tokens, all hits, not only the first 14:

```
$ git -C prgh grep -nE 'globalState\.get|workspaceState\.get|localStorage\.getItem|syncedAt|lastSynced|lastFetched' -- '*.ts' '*.tsx' ':!*test*' | cut -c1-165
src/github/createPRViewProvider.ts:146:		const state = this._folderRepositoryManager.context.workspaceState.get<RecentlyUsedBranchesState>(RECENTLY_USED_BRANCHES, { 
src/github/createPRViewProvider.ts:271:		const lastCreateMethod: { autoMerge: boolean, mergeMethod: MergeMethod | undefined, isDraft: boolean } | undefined = this._f
src/github/createPRViewProvider.ts:1235:				const lastCreateMethod: { autoMerge: boolean, mergeMethod: MergeMethod | undefined, isDraft: boolean } | undefined = this
src/github/credentials.ts:201:		this._scopes = this.context.globalState.get(LAST_USED_SCOPES_GITHUB_KEY, SCOPES_OLD);
src/github/credentials.ts:202:		this._scopesEnterprise = this.context.globalState.get(LAST_USED_SCOPES_ENTERPRISE_KEY, SCOPES_OLD);
src/github/folderRepositoryManager.ts:275:		const reposState = this.context.globalState.get<ReposState>(REPO_KEYS);
src/github/folderRepositoryManager.ts:1127:		const hasRun = this.context.globalState.get<boolean>(stateKey, false);
src/github/folderRepositoryManager.ts:1701:		const cachedTemplate = this.context.workspaceState.get<string | null>(cacheLocation);
src/github/folderRepositoryManager.ts:3013:		const neverShowPullNotification = this.context.globalState.get<boolean>(NEVER_SHOW_PULL_NOTIFICATION, false);
src/github/folderRepositoryManager.ts:3472:		const lastUsedEmail = this.context.globalState.get<string>(LAST_USED_EMAIL);
src/github/issueOverview.ts:315:		return this._folderRepositoryManager.context.globalState.get<boolean>(this.descriptionCollapsedKey, false);
src/github/quickPicks.ts:481:	const state = folderRepoManager.context.workspaceState.get<RecentlyUsedBranchesState>(RECENTLY_USED_BRANCHES, { branches: {} });
src/issues/issueFile.ts:165:		const content = this.context.workspaceState.get<Uint8Array | undefined>(NEW_ISSUE_CACHE);
src/issues/issuesView.ts:308:		const expandedQueries = new Set<string>(context.workspaceState.get(EXPANDED_ISSUES_STATE, []) as string[]);
src/issues/issuesView.ts:321:		const savedValue = context.workspaceState.get(EXPANDED_ISSUES_STATE);
src/issues/stateManager.ts:50:	const stateString = folderManager.context.workspaceState.get<string>(ISSUES_KEY);
src/issues/stateManager.ts:299:		const stateString: string | undefined = this.context.workspaceState.get(ISSUES_KEY);
src/issues/stateManager.ts:507:		const stateString: string | undefined = this.context.workspaceState.get(ISSUES_KEY);
src/migrations.ts:31:	const hasMigratedUserQueries = context.globalState.get<boolean>(HAS_MIGRATED_QUERIES, false);
src/migrations.ts:32:	const hasMigratedWorkspaceQueries = context.workspaceState.get<boolean>(HAS_MIGRATED_QUERIES, false);
src/migrations.ts:67:	const hasMigratedUserQueries = context.globalState.get<boolean>(HAS_MIGRATED_DEFAULT_QUERIES, false);
src/migrations.ts:68:	const hasMigratedWorkspaceQueries = context.workspaceState.get<boolean>(HAS_MIGRATED_DEFAULT_QUERIES, false);
src/uriHandler.ts:68:	const pending = context.globalState.get<PendingCheckoutPayload>(PENDING_CHECKOUT_PULL_REQUEST_KEY);
src/view/prsTreeModel.ts:161:		const expandedQueries = this._context.workspaceState.get(EXPANDED_QUERIES_STATE, undefined);
src/view/reviewManager.ts:444:		const showOffer = this._context.workspaceState.get(ignoreBranchStateKey, true);
src/view/reviewManager.ts:450:		const lastOfferTime = this._context.workspaceState.get<number>(lastOfferTimeKey, 0);
src/view/reviewManager.ts:846:		const isFocusMode = this._context.workspaceState.get<boolean>(FOCUS_REVIEW_MODE);
$ git -C excal grep -nE 'globalState\.get|workspaceState\.get|localStorage\.getItem|syncedAt|lastSynced|lastFetched' -- '*.ts' '*.tsx' ':!*test*' | cut -c1-165
excalidraw-app/ExcalidrawPlusIframeExport.tsx:179:            rawAppStateString: localStorage.getItem(
excalidraw-app/ExcalidrawPlusIframeExport.tsx:182:            rawElementsString: localStorage.getItem(
excalidraw-app/components/DebugCanvas.tsx:422:    const savedDebugState = localStorage.getItem(
excalidraw-app/data/LocalData.ts:269:    const LSData = localStorage.getItem(
excalidraw-app/data/localStorage.ts:25:    const data = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);
excalidraw-app/data/localStorage.ts:42:    savedElements = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
excalidraw-app/data/localStorage.ts:43:    savedState = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
excalidraw-app/data/localStorage.ts:78:    const elements = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
excalidraw-app/data/localStorage.ts:89:    const appState = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
excalidraw-app/data/localStorage.ts:90:    const collab = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);
excalidraw-app/data/tabSync.ts:13:  const storageTimestamp = JSON.parse(localStorage.getItem(type) || "-1");
excalidraw-app/useHandleAppTheme.ts:14:      (localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_THEME) as
packages/common/src/editorInterface.ts:200:    const stored = window.localStorage.getItem(DESKTOP_UI_MODE_STORAGE_KEY);
packages/common/src/utils.ts:1227:      const serializedFlags = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
packages/excalidraw/data/EditorLocalStorage.ts:8:      return !!window.localStorage.getItem(key);
packages/excalidraw/data/EditorLocalStorage.ts:10:      console.warn(`localStorage.getItem error: ${error.message}`);
packages/excalidraw/data/EditorLocalStorage.ts:19:      const value = window.localStorage.getItem(key);
packages/excalidraw/data/EditorLocalStorage.ts:25:      console.warn(`localStorage.getItem error: ${error.message}`);
```

The counts (27 and 18) now match the listings, and I read every line. Classification:

- `prgh`, 27 hits: recent branches, last create method, last-used OAuth scopes, a stored repository list (`folderRepositoryManager.ts:275`), run-once and migration flags, a "never show" flag, last-used email, collapsed and expanded UI state, a pending-checkout payload, an offer timestamp (`reviewManager.ts:450`), a focus-mode flag, a cached PR template (`folderRepositoryManager.ts:1701`), a draft issue (`issueFile.ts:165`). All preferences, drafts or flags. The one group that is persisted data about remote objects is `issues/stateManager.ts:50, 299, 507` (key `ISSUES_KEY`): per-issue state and a branch-to-issue map. It carries a `stateModifiedTime` field used to purge entries older than 30 days (`stateManager.ts:299-309`), and no line shows an age to the user (`grep -nE 'ago|stale|lastUpdated|syncedAt' src/issues/stateManager.ts` returned no `ago` or `stale` rendering). So no hit is server data shown to the user with an age.
- `excal`, 18 hits: the user's own saved scene and app state, collaboration state, theme, feature flags, a debug state, a desktop-UI-mode flag, the storage wrapper itself, and a tab-sync timestamp (`tabSync.ts:13`). None is remote data.

The two mismatches this exposes: the tokens miss the one persisted-remote-data structure that exists (`stateModifiedTime`, `TimeStampedIssueState`), because they do not name it, and they match many things that are not cached remote data.

Staleness tokens only, exactly as proposed for the new Verify text:

```
$ T='syncedAt|lastSynced|lastFetched|fetchedAt|staleTime'
$ for d in prgh excal; do echo "-- $d"; git -C $d grep -nE "$T" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | cut -c1-170; done
-- prgh
src/github/githubRepository.ts:312:	private _maxItemNumberCache: { value: number; fetchedAt: number } | undefined;
src/github/githubRepository.ts:1511:		if (!forceRefresh && this._maxItemNumberCache && (now - this._maxItemNumberCache.fetchedAt) < GitHubRepository.MAX_ITEM_NUMBER_TTL_M
src/github/githubRepository.ts:1521:				this._maxItemNumberCache = { value: max, fetchedAt: Date.now() };
-- excal
```

The 3 `prgh` hits are one field, `_maxItemNumberCache: { value: number; fetchedAt: number }` (`githubRepository.ts:312`), read at `:1511` against a TTL and written at `:1521`. It is an internal cache of the highest issue number with a time check, and no view shows it. A broader set that adds time-stamp field names was also run, to see whether widening helps:

```
$ T2="$T|[a-z]*ModifiedTime|lastUpdated|lastRefresh|updatedAgo|TimeStamped"
$ for d in prgh excal; do echo "-- $d $(git -C $d grep -nE "$T2" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
-- prgh 21
-- excal 4
```

The 21 `prgh` lines are `stateModifiedTime`, `lastRefreshTime` (an internal refresh check in `issueOverview.ts:266-286`) and similar; the 4 `excal` lines are `lastUpdatedValue` in a stats input (a drag value, not a data age). Widening adds noise and no stale-data view, so it is not proposed. I read 12 of the 21 `prgh` lines (the `head -12` output) and all 4 `excal` lines.

In neither codebase did I find a view that renders cached remote data with or without an age. I did not search for one by other means, so I cannot say none exists.

## Effect on the ruleset

The Verify texts below were each run exactly as written in section 2, 4 and 5 (`PG` over both codebases: 109 and 0 lines; `SL` and its filter: 4 and 6 raw, 4 and 3 filtered; `T`: 3 and 0 lines). The "combined" and "new Verify" patterns are the same strings, copied from those runs.

**UX-STATE-07 (SHOULD): change the Verify triggers.** Exact new Verify text for the two triggers; everything else in the rule stays.

- Paged source: the view or its data module matches `grep -nE 'hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo|nextPage|pageToken|[?&](page|offset)='`. Do not search for the bare word `cursor`: it matches text-editor and mouse cursors. For each matched file, decide whether it renders a partial list or only fetches (a `do { … } while (hasNextPage)` loop fetches all pages and shows no partial state). A `<view>-partial` fixture must exist for each view that renders a list from a page source that can stop early. Measured: 109 lines in 12 files in one extension, 2 of which render a "more" row; 0 lines in a canvas app.
- Capped list: the render path matches `grep -nE '\.slice\(0, *([A-Z][A-Z_]{2,}|[0-9]{2,})\)'`, then drop hits on hashes, buffers, versions and string truncation by reading. The sliced array must reach a rendered list. A `<view>-capped` fixture must exist, and the view must say that it is capped, with a count (fleet pass: `Showing 4 of 4+`; second-codebase counterexample: `webviews/components/sidebar.tsx:357` in `prgh` caps an avatar list at 10 with no text in the lines read).
- Rationale addition: "second codebases show that the bare `cursor` token matches 254 lines in a canvas app, none paging (checked by a filter, 9 survivors, all pointer or byte offsets), and 11 of 14 lines in an extension are text-editor or CSS; and that number-literal caps exist."

Evidence strength: 2 codebases, 1 confirmed literal cap. A small sample, so keep the severity at SHOULD.

**UX-STATE-34 (CONSIDER): change the trigger and mark it weak.** Exact new Verify trigger: the view's data module matches `grep -nE 'syncedAt|lastSynced|lastFetched|fetchedAt|staleTime'`, and the matched value is rendered or reaches a rendered component. Remove `cache`, `globalState.get` and `localStorage.getItem` from the trigger: the bare word matches 454 and 601 lines, and the storage reads match preferences and drafts, not cached data. State in the rule that the trigger finds cache-age fields only when the code names them with one of these tokens, and that code that stores remote data under another name (the measured example is `stateModifiedTime` in `issues/stateManager.ts`) goes unseen. Keep CONSIDER. Neither second codebase gave one instance of a stale-data view, so there is no evidence to promote it.

**UX-STATE-01 to 06, 08 to 33: confirm.** This question did not test them.

**No new rule.** No retire and no demote: UX-STATE-07 stays SHOULD and UX-STATE-34 stays CONSIDER.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| `microsoft/vscode-pull-request-github` HEAD `c9891f1` | https://github.com/microsoft/vscode-pull-request-github (vendor repository, cloned) | commit date 2026-11-27 |
| `excalidraw/excalidraw` HEAD `dabd83c` | https://github.com/excalidraw/excalidraw (cloned) | commit date 2026-11-25 |
| Counts in this file | measured in this session with the commands above | 2026-11-27 |

Everything here is a measurement of two repositories at those commits. No platform fact, limit, law or statistic was taken from memory, and no web page was fetched.

## What could not be determined

- **Whether the replacement paging trigger finds the views.** Measured: it finds 12 files, 2 of which render a "more" row directly. I did not trace the 3 page-source files to every view they feed, and I did not check whether any of those views renders a partial state that needs a fixture. Missing: a trace from each matched module to its rendering component.
- **Whether `gitExtensionIntegration.ts:67` (`per_page: 100`, one call) silently drops results in a view.** I read the call line only.
- **Whether any codebase has a stale-data view that the narrow tokens miss.** The sample (a canvas app and a PR-review extension) has no cached-remote-data view that I saw. A codebase built around an offline cache or a sync status (a mail client, a package browser) would test UX-STATE-34. I did not search for one.
- **Recall for the capped-list trigger.** I did not hand-audit all list renders in either codebase for caps written by other means (`.splice`, `.filter(...)` with a limit, `.take`, a loop with a break). The 1 confirmed literal cap is a floor, not a rate. The display of two stored-list caps (`createPRViewProvider.ts:158`, `useTTDChatStorage.ts:134`) was not traced.
- **Whether `colorPickerUtils.ts:92` and `sidebar.tsx:357` are silent in the rendered UI.** I read the data function and 11 lines of the component respectively, not the surrounding render code.
- **Absence of paging in Excalidraw is supported, not proven.** 19 network call sites read one resource each and no limit or pagination call appears in the files that make them; response handling and any collaboration transport outside the scoped paths were not read.
- **The 29 unread lines of the 44 render-side hits** in `prgh`, and 9 of 21 lines of the broader time-stamp grep.
- **Whether fixtures exist.** Neither codebase uses the `<view>-<state>` fixture naming, so the second half of each Verify (`git ls-files … | grep`) was not exercised here. This question covered the trigger half only.
