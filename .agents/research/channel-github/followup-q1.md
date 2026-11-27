---
title: Do LinkedIn and Meta centre-crop a 2:1 image to 1.91:1? (CH-GH-05 safe area)
program: product
topic: channel-github
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 4
---

# Do LinkedIn and Meta centre-crop a 2:1 image to 1.91:1?

All four pages were fetched on 2026-11-27 as raw HTML with curl (commands and output under "Measurements"). None shows an absolute date. Only the two LinkedIn pages show a relative "Last updated" line.

## Answer

No source says so. The assumption behind CH-GH-05's 1222 x 640 safe area is unsupported for both platforms, and the platform texts partly contradict it. The loss at stake is small, so the rule stays as review guidance with honest wording plus a checkable edge margin.

- **Meta** documents 1.91:1 as the ratio that avoids cropping: "Try to keep your images as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping." ([Meta, Link Sharing FAQ](https://developers.facebook.com/docs/sharing/webmasters/faq), fetched 2026-11-27, undated). For other ratios it says only: "Many factors go into how an image may be cropped. For example, we try to center the image around faces that we can detect." (same page). That is not a fixed centre crop.
- **LinkedIn** documents 1.91:1 as recommended ([LinkedIn Help, Make your website shareable](https://www.linkedin.com/help/linkedin/answer/46687), redirects to `/answer/a521928/`, "Last updated: 3 years ago", fetched 2026-11-27). On the Page post preview page it says: "Images on mobile won't be cropped. Images of other ratios will show in full with subtle white padding." ([LinkedIn Help, Page post preview](https://www.linkedin.com/help/linkedin/answer/a566445), "Last updated: 2 years ago", fetched 2026-11-27). The organic link-share page says only "Square and vertical images might be cropped when ads are shared organically." (first LinkedIn URL) and says nothing about 2:1.
- **Size of the question** (derived, not measured): a 1280 x 640 image shown at 1.91:1 and full height is 640 x 1.91 = 1222.4 pixels wide. That drops 57.6 of 1280 pixels (4.5%). A centre crop drops 28.8 per side. A one-sided crop drops 57.6 from one side. A margin of 58 pixels from each vertical edge survives all of these.
- **No render could be measured.** Seeing the real crop needs a post or an inspector run (LinkedIn Post Inspector, Meta Sharing Debugger). Each needs a logged-in account, which the limits forbid. See the gap below.

## Measurements

### M1. Raw fetch of the four pages

Commands run in `~/.cache/research-lang/exemplars/product/wave2/channel-github-q1/` (scratch). Each page was saved as raw HTML, then tag-stripped with a Python `re` script into `<name>.txt`, then searched with `grep -nEi`. This replaces the earlier WebFetch summaries: every quote below comes from the raw HTML.

```
curl -sL -A 'Mozilla/5.0' -o <file> -w '%{http_code} %{size_download} %{url_effective}\n' <url>
200 954278 https://developers.facebook.com/documentation/sharing/webmasters/images   (from /docs/sharing/webmasters/images)
200 958540 https://developers.facebook.com/documentation/sharing/webmasters/faq      (from /docs/sharing/webmasters/faq)
200 38238  https://www.linkedin.com/help/linkedin/answer/a521928/                    (from /help/linkedin/answer/46687)
200 40363  https://www.linkedin.com/help/linkedin/answer/a566445                     (from /help/linkedin/answer/a566445)
```

### M2. Quoted passages, grep output (line number, file)

```
grep -nEi '200 x 200|200x200|MB' on the stripped text:
images.txt:62: The minimum allowed image dimension is 200 x 200 pixels.
images.txt:63: The size of the image file must not exceed 8 MB.
images.txt:64: Use images that are at least 1200 x 630 pixels for the best display on high resolution devices. At the minimum, you should use images that are 600 x 315 pixels to display link page posts with larger images.
images.txt:66: ... Try to keep your images as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping.
faq.txt:68: ... is no bigger than 8mb and is served with less than a few seconds of latency.
faq.txt:71: Images smaller than 600 x 315 pixels but larger than 200 x 200 pixels will be rendered with a small, square image.
faq.txt:73: Many factors go into how an image may be cropped. For example, we try to center the image around faces that we can detect.
faq.txt:74: For large images, try to keep your images as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping.
46687.txt:21: Last updated: 3 years ago
46687.txt:32-34: Max file size: 5 MB / Minimum image dimensions: 1200 (w) x 627 (h) pixels / Recommended ratio: 1.91:1
46687.txt:51: Images less than 401 pixels wide display as a thumbnail image.
46687.txt:53: Square and vertical images might be cropped when ads are shared organically.
a566445.txt:21: Last updated: 2 years ago
a566445.txt:45: Use a 1.91:1 ratio (1200x627 pixels).
a566445.txt:48: Images on mobile won't be cropped. Images of other ratios will show in full with subtle white padding.
a566445.txt:47: If your image width is less than 200 pixels, it will not display in the larger image format. Instead, images will appear as a thumbnail on the left side of the post.
```

Repair note: the earlier version cited Meta's 200 x 200 "absolute minimum" and 8 MB limit without quoting them. Both are now confirmed in the raw page text (`images.txt:62-63`, and `faq.txt:68` for 8 MB). The earlier summary reading of the FAQ line (200 x 200 as the small-square threshold) is also true (`faq.txt:71`).

### M3. Subject-margin check, run on real and synthetic images

The script is `margin.py` (9 lines; Pillow, run with `uv run --no-project --with pillow python -I margin.py <img>`). It takes the top-left pixel as background, finds the bounding box of pixels differing by more than 24 per channel, and exits 0 only if both horizontal margins are at least 58 pixels.

```
$ curl -sL -o og-card.png -w '%{http_code} %{size_download}\n' https://grimoire.rs/og-card.png
200 105570
$ for f in og-card.png synth_bad.png synth_ok.png; do uv run --no-project --with pillow python -I margin.py $f; echo "exit=$?"; done
size=1280x640 subject_bbox=(83, 81, 1188, 563) left_margin=83 right_margin=92
exit=0
size=1280x640 subject_bbox=(30, 200, 601, 401) left_margin=30 right_margin=679
exit=1
size=1280x640 subject_bbox=(100, 200, 1181, 401) left_margin=100 right_margin=99
exit=0
```

The existing grimoire card ([grimoire.rs/og-card.png](https://grimoire.rs/og-card.png), fetched 2026-11-27, 105,570 bytes as in channel-github.md) passes. A synthetic bad image (subject 30 pixels from the left) fails. Limit: the check assumes a flat background. On a gradient or photo background the bounding box spans the whole image and the check fails (reports a false failure, never a false pass); the fallback is the review clause.

## Effect on the ruleset

Existing text quoted from `channel-github.md` (the commissioned consolidation, line 76 for CH-GH-05, line 45 for Verdict 3).

| Rule | Effect | Exact change |
|---|---|---|
| CH-GH-05, rationale | **change** | Existing sentence: "LinkedIn and Meta state 1.91:1 ([distribution-posture.md](product-audit/distribution-posture.md):172); that they crop to the centre is an assumption." Replace with: "Meta states 1.91:1 avoids cropping and that other ratios are cropped by 'many factors', for example around detected faces ([Meta FAQ](https://developers.facebook.com/docs/sharing/webmasters/faq), undated, fetched 2026-11-27). LinkedIn states 1.91:1 as recommended, and for Page post previews says other ratios show in full with white padding ([LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a566445), 'Last updated: 2 years ago', fetched 2026-11-27). No source states a centre crop of a 2:1 image. The 1222 x 640 area is a precaution; the 58-pixel margin also covers a one-sided crop." |
| CH-GH-05, requirement | **change** | Existing clause: "Keep the subject inside the central 1222 x 640 area, and use a solid background or check the image on light and dark." Replace with: "Keep the subject at least 58 pixels from the left and right edges of the 1280 x 640 image (this also keeps it inside the central 1222 x 640 area), and use a solid background or check the image on light and dark." Severity unchanged (MUST flagships, SHOULD others). The 58 is derived: 1280 - 1222.4 = 57.6, rounded up. |
| CH-GH-05, verification | **change** (append, for a flat background) | Append: "Margin check: `curl -sL <openGraphImageUrl> -o og.img; uv run --no-project --with pillow python -I margin.py og.img` exits 0 when the subject bounding box is at least 58 pixels from both vertical edges (script: top-left pixel is the background, per-channel difference over 24 marks the subject; 9 lines, in this artifact's scratch directory and reproduced below). Exit 1 is a fail. On a gradient or photo background the check can only false-fail; then the safe-area clause is review guidance and a human looks." Existing boolean, byte-size and 640 x 320 checks stay. |
| Verdict 3 | **change** | Existing: "keep the product name and subject inside the central 1222 x 640 area, so that a 1.91:1 crop clips nothing. The 1222 is derived (640 x 1.91 = 1222.4) and assumes a centre crop; no source states it." Replace with: "keep the product name and subject at least 58 pixels from the left and right edges, so that a 1.91:1 crop clips nothing whether a platform centres it or anchors it to one side. The 58 is derived (1280 - 640 x 1.91 = 57.6); no platform documents a centre crop of a 2:1 image." Verification: the margin check above on the flagship card, plus `grep -c "no platform documents a centre crop" channel-github.md` printing 1 after the edit. |

`margin.py`, reproduced in full so the rule is checkable without this scratch directory:

```python
import sys
from PIL import Image, ImageChops
im=Image.open(sys.argv[1]).convert("RGB"); w,h=im.size
bg=Image.new("RGB",im.size,im.getpixel((0,0)))
box=ImageChops.difference(im,bg).point(lambda v:255 if v>24 else 0).convert("L").getbbox()
if box is None: print("no subject found (uniform image)"); sys.exit(2)
l,r=box[0],w-box[2]
print(f"size={w}x{h} subject_bbox={box} left_margin={l} right_margin={r}")
sys.exit(0 if l>=58 and r>=58 else 1)
```

No new rule. A rule on LinkedIn or Meta behaviour needs a measured render, and none exists. The wave-1 open question about a default `opengraph.githubassets.com` card unfurling on LinkedIn and X stays open for the same reason.

## Dated facts

All fetched 2026-11-27.

- Meta states 1.91:1 as the no-crop ratio, 600 x 315 as the floor for a large link image, 1200 x 630 as the high-resolution recommendation, 200 x 200 as the minimum allowed dimension and 8 MB as the file limit ([Meta, Images in Link Shares](https://developers.facebook.com/docs/sharing/webmasters/images), lines 62-66 of the stripped raw page; no page date).
- Meta states that cropping has "many factors" and names face-centring ([Meta, Link Sharing FAQ](https://developers.facebook.com/docs/sharing/webmasters/faq), line 73; no page date).
- LinkedIn states 1.91:1 recommended, 1200 x 627 minimum, 5 MB maximum, thumbnail display below 401 pixels wide ([LinkedIn Help, Make your website shareable](https://www.linkedin.com/help/linkedin/answer/46687), lines 32-51; "Last updated: 3 years ago", about 2023).
- LinkedIn states "Images on mobile won't be cropped. Images of other ratios will show in full with subtle white padding." ([LinkedIn Help, Page post preview](https://www.linkedin.com/help/linkedin/answer/a566445), line 48; "Last updated: 2 years ago", about 2024).
- Derived, not measured: a 2:1 image 640 tall is 1280 wide; 1.91:1 at that height is 1222.4 wide; the difference is 57.6 pixels, 4.5% of the width.

## What could not be determined

- The actual crop or padding of a 1280 x 640 image in a LinkedIn or Meta link preview. Missing: a logged-in LinkedIn account (Post Inspector or a draft post) and a logged-in Meta account (Sharing Debugger). Posting, logging in and creating accounts are forbidden here. An owner can paste a repository URL with a custom card into both inspectors, which publish nothing, and read the rendered ratio.
- Whether LinkedIn's link-share card (as opposed to the Page post editor preview) pads or crops a 2:1 image. The two LinkedIn pages differ in scope, and neither covers the case.
- Absolute page dates for all four pages. Only relative ages exist for LinkedIn.
- Whether `margin.py`'s threshold (24) suits the final flagship artwork. Only one real card (the grimoire card) and two synthetic images were run.
