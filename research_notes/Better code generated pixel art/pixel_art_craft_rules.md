# Pixel-Art Craft Rules for Small Game Sprites (24–64 px) and Dark-Fantasy Environments

Scope note: these notes target a programmatic pipeline (JS primitives drawn into a palette-indexed buffer, automatic edge-based shading, automatic black outlines). Each rule tries to capture the definition, why it matters, the expert fix, and a possible algorithmic check. **Cited Findings** hold only claims taken from fetched or searched sources. Algorithmic checks are my own derivations and sit under **Inferences**. Practitioner knowledge I could not confirm in this session is flagged in **Gaps**.

Source quality, best first:
1. Cure's "The Pixel Art Tutorial" on Pixel Joint (2010, edited 2014). This is the long-standing community reference; I fetched it in full.
2. Slynyrd Pixelblog 1 (palettes) and Pixelblog 8 (animation); both fetched in full.
3. Lospec's outline articles by skeddles (Sam Keddy), parts 1 and 2; both fetched in full.
4. Forum posts and tutorials (Aseprite community, OpenGameArt, Tiny Warrior Games). I saw these only as search summaries.
5. Commercial or SEO pages, used for numbers only and given low weight.

Fetches that failed:
- Derek Yu's tutorial pages (derekyu.com/makegames/pixelart.html and pixelart2.html) came back empty.
- The saint11.art tutorial index loaded, but each tutorial is a GIF image, so only the titles could be extracted.

---

## 1. Mistakes to avoid: definitions, why they matter, fixes

### Takeaway
The community's agreed list of things to avoid has been the same for years: bad AA, jaggies, bad dithering, banding, pillow-shading, noise and sel-out misuse (Cure's "Things to avoid"). Most of these share one root cause: pixel arrangements that expose the grid or ignore the light source. Both problems can be measured on a palette-indexed buffer. An edge-distance shader produces pillow shading by construction, and it also tends to cause concentric banding. A uniform 1-px black outline is the "sticker" look that colored and selective outlining are meant to fix.

### Cited Findings

**Canonical "things to avoid" list**
- Cure's tutorial lists these under "Things to avoid": Bad AA, Jaggies, Bad dithering, Banding, Pillow-shading, Noise, Sel-out. Its "Palette" section covers color counts, saturation/hue/luminosity, hue-shifting and color ramps. — [Pixel Joint, Cure, The Pixel Art Tutorial](https://pixeljoint.com/forum/forum_posts.asp?TID=11299) (TOC confirmed via [gwern mirror](https://gwern.net/doc/www/pixeljoint.com/ddfba8b00ecdc232df4936b61575ca99d5aba345.html))

**Pillow shading**
- Pillow shading "ignores the light source and follows flat shapes instead of how three-dimensional forms are lit." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- A frontal light is not itself the mistake. "A frontal light is acceptable if the forms are respected." The fix is to pay attention to where the light comes from. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- One description: shading by surrounding a central area with increasingly darker bands, which follows the object's outline instead of the light direction. Suggested self-check: "ask where the light is coming from; if you can't answer, you may be pillow shading." — [Pixnote, Shading & Lighting](https://pixnote.net/en/learn/shading) (search summary)
- Commonly suggested fixes: pick one light direction and keep it consistent, shift hue (not just brightness) in shadows, and start from a value ramp. — [Pixnote](https://pixnote.net/en/learn/shading), [Wayline lesson 3](https://www.wayline.io/learn/pixel-art/3) (search summary)

**Banding**
- Definition: banding happens "when neighboring pixels end at the same x or y coordinate, exposing the grid and reducing apparent resolution." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Variants Cure lists:
  - "Hugging": an outline that lines up with the shape it contains reveals the grid.
  - Fat pixels: alone, as fat lines, or as staircase banding.
  - Skip-one banding: still reads as banding with negative space between bands, because the eye fills the gap.
  - 45° banding: still present even when the aligned rows are only 1 px thick.
  - "AA banding": when "segments of AA line up with the lines they're buffering."
  — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Another definition: "two adjacent pixel segments of different colors align their endpoints along a shared axis." Banding "sits in the cross-point between antialiasing, pillow shading, and gradients." — search summary of PixelJoint-hosted material ([Pixel Joint forum](https://pixeljoint.com/forum/forum_posts.asp?TID=26556))

**Jaggies and clean lines / slopes**
- Definition: "Jaggies occur when a pixel or group of pixels are out of place, interrupting the flow of a line." Lines also look jagged without AA. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Fix: segments that are too long or too short create awkward jumps, so use a more even run length. Lines are naturally jagged "unless your line is perfectly horizontal, perfectly vertical, or at 45 degrees." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- "Perfect lines": the ratios 0:1, 1:2, 1:1, 2:1 and 1:0 are lines "the eye can follow without difficulty." — [OpenGameArt, chapter 2: lines and curves](https://opengameart.org/content/chapter-2-lines-and-curves) (search summary)
- Draw lines from equal-sized segments. Fixed ratios only work for a limited number of angles. — [Aseprite community](https://community.aseprite.org/t/how-do-i-make-straight-curved-lines-properly/10246) (search summary)
- Slope reading: a "1/4" line is ~26.56°, i.e. slope 1/2 (1 px up per 2 px over). A "1/2" line is 45°. — [Pixel Joint forum TID=20478](https://pixeljoint.com/Forum/forum_posts.asp?TID=20478) (search summary)
- Curves: "gradually increase/decrease the number of pixels in your line." — [Tiny Warrior Games, line-art cleanup](https://tinywarriorgames.com/2018/12/07/game-development-pixel-line-art-cleanup/) (search summary)
- Irregular steps, such as alternating 2:1 and 3:1, create visible bumps. — [Divoom blog](https://divoom.com/blogs/setup-ideas/fix-jaggies-pixel-art-without-blur) (low-authority, search summary)
- Lospec (skeddles):
  - The default outline is 1 px, "the thinnest a single-color completely-connected line can be." Segments should connect only diagonally.
  - A straight diagonal "should be made up of identical line segments."
  - On circles, "put the biggest [segments] on the top, bottom, left and right."
  - "Our eyes easily notice when one segment is different from the others in a line."
  - Corners may break the diagonal-only rule "to create a point."
  — [Lospec, Pixel Art Outlines](https://lospec.com/articles/pixel-art-outlines)
- Disagreement: one Pixel Joint commenter says jaggies only matter when a smooth curve is expected, so angular or rough subjects can tolerate them. — [Pixel Joint forum TID=20478](https://pixeljoint.com/Forum/forum_posts.asp?TID=20478) (search summary)

**Doubles / L-corners ("pixel-perfect" lines)**
- Aseprite's Pixel Perfect pencil mode removes the L-shaped corner pixels to leave a clean 1-px line, keeping lines "always one pixel wide." — [KDE GSoC 2024 recap of Aseprite's pixel perfect](https://planet.kde.org/ken-lo-2024-06-10-week-2-recap-aseprite-s-pixel-perfect), [Aseprite community](https://community.aseprite.org/t/line-tool-makes-irregular-lines/6306) (search summary)
- This cleanup only really applies to 1-px lines. — [Aseprite community](https://community.aseprite.org/t/how-do-you-create-a-larger-line-that-does-not-connect-in-aseprite/26444) (search summary)

**Noise / orphan (independent) pixels**
- Noise is "any information that doesn't contribute to the piece and only distracts the viewer," usually independent pixels. Single pixels expose the grid and reduce apparent resolution. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Justified single pixels: specular highlights, small essential details (e.g. eyes on a tiny sprite), stars, bubbles. Use them only for "very specific and purposeful reasons." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- A single pixel is "near-useless and meaningless" unless it touches pixels of the same color. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- In animation, "a single orphan or misplaced pixel is obvious" in a loop. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)

**Mixels (mixed pixel sizes)**
- Mixels happen "when two elements in a video game or image are different pixel resolutions." A common cause is scaling small art up by a factor (raising X/Y scale in-engine). — [Flowlab community, "Stop using mixels"](https://community.flowlab.io/t/mini-rant-stop-using-mixels/38287) (search summary)
- The usual advice is to keep one consistent grid, so "all the outlines … should have the exact same thickness." One developer reports that mixels "left ugly artefacts and resulted in unnecessary contrasts." — [Squeakypig devlog](https://squeakypig.itch.io/unicopia/devlog/787703/a-tale-about-chasing-a-pixel-perfect-tail) (search summary)
- Rotating or scaling sprites in-engine, or in tools like After Effects, can anti-alias fractional positions and lose the pixel look. — sub-pixel search summary ([Substack, Sub-Pixel Animation](https://someanimatorwannabe.substack.com/p/animator-techniques-sub-pixel-animation))

**Over- and under-anti-aliasing**
- Manual AA means "smoothing the jagged areas by hand-placing pixels of a different color to ease the transition." Use only as much as needed. Too much blurs edges, so you "lose the crispness of the line." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Too little AA: single-pixel steps only blunt the jag. Use "longer lines of pixels to show a more gradual transition." A lone AA pixel is fine when it buffers, because it "reads as part of that cluster." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Disagreement: some tutorials favor AA to hide jaggies ([itch.io AA tutorial](https://itch.io/t/3524316/pixel-tutorial-anti-aliasing)). Others warn that too many transition pixels create blur ([Divoom](https://divoom.com/blogs/setup-ideas/fix-jaggies-pixel-art-without-blur)) and argue for crisp, fully opaque edges (search summary). Too much AA "can make an image look fuzzy or create banding" (search summary, Pixel Joint material).

**Dithering misuse**
- Purpose: ease a transition between two colors without adding colors, or create texture. Dithering over large areas becomes a texture field. If it covers much of the sprite, adding a palette color is the better choice. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Use it to taper the ends and edges of a field. "If it's adding texture instead of buffering, it isn't working." Lower contrast between the two colors means a less harsh dither is needed. Random dithering is discouraged because it adds single-pixel noise. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)

**Too many colors / low-contrast ramps**
- There is no fixed color limit, but high counts can signal dirty tools such as blur or transparency. Fewer colors recur more often and "tie the piece together." Smaller palettes are easier to adjust. Beginners should start limited. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Contrast is "the difference between the brightness of two colors." Colors from a narrow luminance range "won't be able to create good contrast." Newer artists often have too little contrast. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Perceived value depends on the background. Brighter pixels make a line look thinner. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)

**Straight (non-hue-shifted) ramps**
- Ramps with a straight, unshifting hue are possible, but Slynyrd calls them "less interesting and harder to harmonize." — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)

**Over-outlining / uniform black outlines / sel-out misuse**
- Lospec, part 1:
  - "Not every part of your object needs to have an outline."
  - A common approach is to outline only the exterior and leave lines out where the object touches another.
  - Interior separations need only "enough of the line to suggest the separation."
  - With no ground contact line, an object can feel "like it is floating."
  — [Lospec, Pixel Art Outlines](https://lospec.com/articles/pixel-art-outlines)
- Cure's contrarian view:
  - Sel-out is "anti-aliasing an outline to a background color," which makes it a form of bad AA.
  - Darkening contours helps a sprite read on any background, but that is not light-based shading.
  - A full outline with light variation causes fewer jaggies than a broken outline.
  - Sel-out works only in specific cases, e.g. games with a consistently dark background.
  - "Selective AA" (moving internal AA into the outline) is "a very advanced … technique, and may not be suitable for beginners."
  — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- **Disagreement:** Lospec and itch.io tutorials teach selective or colored outlining as an improvement. Cure lists sel-out under "things to avoid" unless the background is known. Both agree that the outline must keep contrast against the actual background.

**Silhouette / readability**
- Saint11 (Pedro Medeiros) has dedicated "Silhouette," "Outlines," "Shading," "Fundamentals," "Fundamentals2" and "Darkness" tutorials. Their content is image-only and could not be extracted. — [saint11.art tutorial index](https://saint11.art/blog/pixel-art-tutorials/)
- Lospec's 1× check: "when viewing your pixel art at 1x, you should be able to see the difference between any two colors that touch." — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)

### Inferences (algorithmic checks / fixes for the generator)
- **Pillow-shading detector.** For each material region, compute the distance-to-silhouette transform D(p) and the projection onto the light vector P(p) = p·L.
  - Shade index S(p) should correlate with the surface normal term n·L, not with D.
  - Heuristic flag: |corr(S, D)| > ~0.6 and |corr(S, P)| < ~0.3. This means the shade iso-lines run parallel to the outline (pillow).
  - The current edge-based shader fails this by construction.
- **Fix: form shading.** Give each primitive an analytic height or normal field: spheres for the head and fists, cylinders for limbs and torso, boxes for armor plates.
  - Compute Lambert shading l = max(0, n·L) with L fixed, e.g. upper-left-front (−0.5, −0.7, 0.5) normalized.
  - Quantize l into 3–4 ramp indices using thresholds rather than smooth steps.
  - Add a cast-shadow pass: shadow = region AND NOT (region shifted by k px toward the light), plus occlusion where one primitive overlaps another.
  - Cylinders give vertical shading bands, which reads as form instead of concentric rings.
- **Banding detector.** For every pair of adjacent color boundaries (A|B and B|C), extract the run endpoints per row and column. Flag when ≥3 consecutive rows have both boundaries stepping at the same x (parallel staircase at a 1-px offset). This is the "hugging" and staircase case. Fix by staggering the inner boundary's runs or merging a band into a larger cluster.
- **Jaggy / line-slope checker.** Trace each 1-px boundary chain and compute run lengths along the major axis.
  - Straight segment: all runs equal, or a strictly periodic pattern.
  - Curve: run sequence monotonic, up then down (e.g. 3,2,2,1,1,1,2,2,3). A non-monotonic blip such as 3,1,3 is a jaggy.
  - Prefer the slopes 1:0, 2:1, 1:1, 1:2, 0:1 (optionally 3:1 / 1:3) for long straight edges, e.g. sword blades and pillars.
- **Doubles detector.** In any 1-px outline or line layer, flag every 2×2 window containing 3 line pixels in an L shape. The corner pixel is the double: remove it, as Aseprite's Pixel Perfect does. Apply this to the auto-outline output, because naive 4- or 8-connected dilation creates thick corners.
- **Orphan/noise metric.** Count pixels with no same-index 8-neighbor and divide by the sprite area. Whitelist eyes and specular highlights, tagged at generation time. Flag the sprite when more than ~1–2% of opaque pixels are orphans. Also report the cluster-size histogram per index: many clusters of size 1–2 means noise.
- **Mixel guard.** Draw every primitive at native resolution into the same buffer and never scale sub-sprites or effects. Detection: if a region is entirely made of aligned identical 2×2 blocks while the rest is not, it has been upscaled. Apply any upscaling only at final display, as an integer nearest-neighbor scale.
- **AA rules for the generator.**
  - Add AA only on curve and diagonal steps where a run is ≥2 px.
  - Place one intermediate-value pixel at the end of the longer run.
  - The AA run length should be ≤ the run it buffers.
  - Never add AA on outside edges against unknown backgrounds.
  - Use at most 1 AA color per edge pair.
- **Dither guard.** Detect checkerboard patches (2×2 alternating A/B) and flag when any patch exceeds ~10% of the sprite area or sits outside a boundary transition. At 24–64 px, default to no dithering on characters.
- **Contrast check at 1×.** For every pair of 4-adjacent different indices, require a minimum perceptual difference, e.g. ΔE (OKLab) above a threshold. This directly encodes Lospec's "any two colors that touch" rule.

### Gaps
- I could not fetch any authoritative source that defines **tangents** in pixel art (two contours that just touch and cause ambiguous depth). That is a general illustration term from my background knowledge, unverified here.
- I did not locate a primary source for the exact term "doubles". The L-corner definition comes from Aseprite feature descriptions only.
- **Pixel Logic** (Michał Kulpa / "Michafrar") was not accessible, and nothing here is drawn from it.
- I could not extract Derek Yu's tutorial (empty fetch).
- Helm's ramblethread and Pixelation forum checklists were not reached.

---

## 2. Practices to adopt

### Takeaway
Shade by form against one fixed light source, and build with clean single-color clusters. Use hue-shifted ramps: about ≤20° hue shift per step (Slynyrd), saturation peaking mid-ramp, brightness rising with diminishing steps. Replace uniform black outlines with outlines that are always darker than both the object and the background and vary per material. Keep palettes small: Endesga 32 (32 colors) is a widely used reference. Exaggerated head proportions are needed below ~48 px.

### Cited Findings

**Light-consistent form shading**
- Shading should follow a consistent light direction. Cure's examples use a top-left light. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Sel-out is "not light-based shading," so outline darkening is a separate tool from form shading. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)

**Clusters**
- Clusters are "groups of pixels of the same color that together produce a solid color field." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- "The borders of a pixel cluster determine the shape of the pixel clusters it borders." Shading shapes therefore define form as much as the outline does. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Every animation frame needs attention to its clusters. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)

**Hue-shifted ramps (Slynyrd Pixelblog 1, Raymond Schlitter)**
- Hue shift: "20 degrees of positive hue shift between each swatch"; "20 is about as high as I go." Positive shift is preferred because it tends to produce natural colors that warm as they get brighter. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- The Mondo palette uses 9 swatches per ramp and 8 ramps, with 45° hue between ramps; 128 colors in total. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- Saturation peaks near the middle of the ramp and never reaches 0% or 100%. Steps are larger at the ends and smaller in the middle. Darker colors generally carry more saturation. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- Brightness rises consistently from dark to light. A ramp usually doesn't start at 0% unless black is wanted. Steps get smaller as brightness approaches 100%. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- Choose the middle color first, at the highest hue and saturation you're willing to use. Avoid combining high saturation with high brightness. Exact S/B values are tuned by eye; Slynyrd gives no fixed numbers. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- A palette needs a wide range of values to support highlights, midtones and shadows. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)

**Selective / colored / interior outlines (Lospec, skeddles)**
- The most basic technique is "an outline that's a darker shade of the object" it outlines. The outline color can vary per part: a red shirt gets a dark red outline, blue pants a dark blue one. — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- "The most important part of using colored outlines is maintaining contrast… an outline should always increase contrast, and never decrease it." "An outline should always be darker than both the object AND the background behind it." — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- Selective outlining puts dark outline colors where the sprite is darkest and lighter ones where it is lightest, so contrast stays consistent around the sprite. On heavily shaded sprites black may be the only color that works everywhere. — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- Dark scenes cause light outline shades to fail. In scenes with many dark areas, stick to darker shades, or keep solid black outside and apply selective outlining to internal lines only. — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- Internal lines, per Lospec part 2:
  - They can go "as light as you want." "Generally you'll use the color of the part that's closest to the viewer," or the darker object's color if it sits underneath or in shadow.
  - On the same surface, omit the line or use the darker color.
  - "Darker lines visually imply a thicker line."
  - A line can be broken so it appears mainly near shadows, or faded lighter toward its end.
  — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- itch.io tutorial: a selective outline is a "shaded" outline, made by taking the sprite's edge pixel values and going one shade darker. Learn the black outline first. — [itch.io, selective outlines tutorial](https://itch.io/t/2422252/pixel-tutorial-selective-outlines) (search summary)
- Shade first and outline afterward, to focus on shape and readability. — Patreon tutorial (search summary; [patreon.com/posts/14359546](https://www.patreon.com/posts/14359546))

**Palette size / Lospec palettes**
- Endesga 32 by ENDESGA (originally made for NYKRA) has 32 colors. It had ~206,657 downloads and ~2,295 likes when fetched (Oct 2026). Hex list: #be4a2f #d77643 #ead4aa #e4a672 #b86f50 #733e39 #3e2731 #a22633 #e43b44 #f77622 #feae34 #fee761 #63c74d #3e8948 #265c42 #193c3e #124e89 #0099db #2ce8f5 #ffffff #c0cbdc #8b9bb4 #5a6988 #3a4466 #262b44 #181425 #ff0044 #68386c #b55088 #f6757a #e8b796 #c28569. — [Lospec, Endesga 32](https://lospec.com/palette-list/endesga-32)
- Start with a limited palette, since fewer colors tie the piece together. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)

**Proportions for small sprites** (rules of thumb; the sources disagree)
- One canvas guide gives 16×16 → 2–3 heads, 32×32 → 3–4 heads, 48×48+ → 4–6 heads. — [Pixnote, How to Draw Pixel Art Characters](https://pixnote.net/en/learn/character) (search summary)
- Chibi is about 1–2 heads tall, so a 32 px chibi has a ~16 px head. A normal anime head at 32 px would be only ~5 px, too small to hold a face; 64×64 is suggested for realistic proportions. — [sprite-ai gallery](https://www.sprite-ai.art/gallery/anime) (commercial, low weight; search summary)
- Real humans are ~7–8 heads tall; chibis are typically 2–4. — [Clip Studio tips](https://tips.clip-studio.com/en-us/articles/4953) (search summary)
- NES Mega Man's head is roughly 1/3 of the sprite. — [gamedev.net forum](https://gamedev.net/forums/topic/625955-pixel-art-sprite-proportions-and-size/4946717) (search summary)
- Chrono Trigger sprites are about 32 px tall with a smaller head ratio, i.e. more realistic proportions. — [Chrono Trigger sprite tutorial transcript](https://sozai.app/transcript/make-chrono-trigger-sprites-pixel-art/) (search summary)

**Sprite size choice**
- Choose a size that is comfortable to animate: tiny sprites limit motion, and large ones take a long time. Start with simple sprites that have clear color separation. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)

### Inferences (generator rules)
- **Ramp generator (Slynyrd-style), per material** (skin, cloth, leather, steel, stone, blood/magic). Generate 4–6 steps for a 24–64 px sprite; Slynyrd's 9-swatch ramps are for full palettes.
  - Hue: +10–20° per step toward warm (yellow) as the ramp gets lighter, which is equivalent to cooler in the shadows.
  - Saturation: an arch peaking at the mid-tone, never at 0 or 100%.
  - Value: monotonic increase, with smaller steps near the top.
  - Validate that adjacent steps keep a minimum luminance gap (e.g. ≥8–10 L* in OKLab/CIELAB). This avoids the "low-contrast ramp" failure. Lock the darkest steps of every ramp toward a shared hue (e.g. dark purple-blue, as in Endesga's #181425/#262b44/#3e2731) so all materials harmonize.
- **Shared-darks for dark fantasy.** Use the palette's darkest blue-purples rather than pure #000 for outlines and deepest shadows. Endesga 32's darkest color is #181425, not black. This lets "black outline" become "darkest ramp step of the adjacent material or the shared dark."
- **Outline algorithm to replace uniform black.**
  1. For each outline pixel, find the adjacent interior pixel's material and shade index.
  2. Set the outline to that material's ramp index −2 (or the shared dark if the result would be lighter than the background).
  3. Enforce Lospec's invariant: luminance(outline) < min(luminance(object neighbor), luminance(expected background)).
  4. Optionally lighten the outline by one step on light-facing edges (n·L > threshold), but only if it stays darker than the background. In dark dungeons this means keeping the outline dark, because the background is dark.
  5. Drop the outline between two touching parts of the same sprite; replace it with an internal line in the darker part's color or the nearer part's shade.
  6. Keep a full dark exterior outline where a floor or wall contact is needed, so the sprite does not float.
- **Per-sprite color budget.** Count distinct indices excluding transparency. Rule of thumb for 24–64 px characters: ≤12–16 colors, ≤3–5 per material. This is an inference consistent with Cure's "limited palette" advice; no source gives these exact numbers.
- **Proportion presets.** 24–32 px tall: 2.5–3.5 heads, head ~8–12 px. 48 px: ~4 heads. 64 px: 4–6 heads. Enlarge the hands and weapon so they read. These ranges are interpolated from the sources above.
- **Highlight rule.** Allow at most 1–3 specular single pixels per sprite, on metal and eyes, placed on the light-facing side. This is consistent with Cure's whitelist of justified single pixels.

### Gaps
- I found no fetched source with specific **rim-light** rules for pixel art. Common practitioner advice, unverified here: a 1-px lighter edge on the side opposite the key light, often colored by an environmental light (torch, magic).
- There were no sourced rules on **3/4 view construction** for small sprites.
- There was no sourced quantitative **value grouping** rule (e.g. "3 value groups"). Saint11's "Shading," "IlluminationTechniques" and "Darkness" tutorials probably cover it, but they are image-only.
- Resurrect 64 and AAP-64 palettes were not fetched. Their names imply 64 colors each, but I did not verify their details or authors in this session.
- MortMort, Brandon James Greer and AdamCYounis publish mainly video, and no text notes were retrieved from them.

---

## 3. Sprite animation at low resolution

### Takeaway
Slynyrd's guidance:
- Build from strong keyframes and add in-betweens only where needed.
- 6-frame cycles "work well in most cases." 8-frame cycles run at ~80 ms per frame; the same cycle cut to 4 frames needs ~160 ms per frame.
- Idles are usually "bouncy breathing" loops, and an 8-bit-style idle can reuse a 2-frame cycle.
- Prioritize energy over smoothness.
- Watch for single misplaced pixels, which flicker obviously in loops.

Sub-pixel animation moves edges by recoloring rather than shifting whole pixels. It is useful for idles on small sprites.

### Cited Findings
- Keyframes should be the most dramatic poses, and the animation should read from keyframes alone. Add in-betweens only where needed, since too many make motion sluggish. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Timing: an 8-frame run shows each pose for "80 milliseconds"; the 4-frame version shows each for "160 milliseconds." Adjust playback speed when you remove frames, to keep the energy. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Frame counts: 6-frame cycles "work well in most cases." A 3-frame run modeled on Mega Man is technically 4 frames because the pass frame repeats. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Frame-removal priority: keep the contact and pass frames, remove the recoil frame first, and remove the high point last. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Run poses: strong stride poses with limbs extended and the body tilted forward. In the pass frame, limbs are near the body. Include vertical bounce. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Idle: the most common are "bouncy breathing" cycles. 8-bit JRPGs reuse a 2-frame walk as the idle. Scale complexity to team size. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Attack: the article gives only two keyframes (wind-up and full extension) plus optional in-betweens. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- "Prioritize the energy of the motion over smoothness." — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- The LPC walk cycle exists in 8-, 6- and 4-frame variants, each with a different feel. — [OpenGameArt forum](https://opengameart.org/forumtopic/lpc-walk-cycle-with-varying-speed) (search summary)
- Slynyrd Pixelblog 50 builds a human walk cycle from rotoscoped video, aimed at a beat-'em-up. I did not see the frame count. — [Slynyrd Pixelblog 50](https://slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle) (search summary)
- Sub-pixel animation:
  - It changes the colors of pixels "instead of outright moving pixels to create movement," because a sprite cannot sit half a pixel over.
  - Example: Metal Slug's ~34 px idle.
  - Method: gradually add and remove in-between pixels across frames.
  - One author finds it works better on larger sprites.
  — [Substack, Sub-Pixel Animation](https://someanimatorwannabe.substack.com/p/animator-techniques-sub-pixel-animation); [Tiny Warrior Games, sub-pixel](https://tinywarriorgames.com/2019/01/04/game-development-pixel-art-sub-pixel-animation/) (search summaries)
- Saint11 has tutorials titled "characterIdle," "Walk," "RunCycleSimple," "AttackSheet," "Impact," "Squash," "Subpixel," "Easings," "MotionBlur," "Jump," "Death" and "Defend". Their content is image-only. — [saint11.art](https://saint11.art/blog/pixel-art-tutorials/)

### Inferences (generator rules)
- **Default frame table** (inferred from Slynyrd's numbers):

  | Action | Frames | Per-frame timing |
  |---|---|---|
  | Idle (breathing) | 2–4 | ~150–250 ms |
  | Walk | 4–8 (default 6) | ~100–130 ms |
  | Run | 6 | ~80–100 ms |
  | Run (8-frame) | 8 | 80 ms |
  | Run (4-frame) | 4 | 160 ms |
  | Attack | 3–5 | anticipation long, hit frame short, recovery long |

  The attack structure follows standard animation principles; Slynyrd gives only the wind-up and extension keys.
- **Volume consistency check.** For each body-part layer, opaque pixel count across frames should stay within ±10–15%, except on deliberate squash or stretch frames. Large swings mean the part is being redrawn inconsistently.
- **Silhouette-change check.** Between consecutive frames, the IoU of the silhouette mask should be high (e.g. >0.7) for idles. Keyframes should differ enough to read (contact vs. pass).
- **Flicker check.** For every pixel, count index changes across a loop. Flag pixels that toggle every frame and are isolated (orphan flicker), which matches Slynyrd's warning about lone misplaced pixels.
- **Procedural sub-pixel idle.** Instead of moving the torso 1 px, recolor the top-edge pixels to an intermediate ramp step on the in-between frame. This is a cheap way to make 24–32 px idles look smooth.

### Gaps
- I found no source with explicit **smear-frame** rules or **secondary motion** rules (cape, hair lag by 1–2 frames) for pixel art. Saint11's "MotionBlur" and "Impact" tutorials likely cover them but are image-only.
- There were no sourced attack frame counts or anticipation timing in ms.

---

## 4. Environment / tile rules for dark dungeon scenes

### Takeaway
There are few authoritative sources. Practitioner consensus, mostly from critiques:
- Readability of the whole scene beats detail on individual tiles.
- Uniform lighting gives the eye nowhere to focus.
- Characters must separate in value from the floor.
- Warm local light (torches) against cool, desaturated ambient stone is the standard dungeon approach.
- Texture noise must be controlled the same way as on sprites: clusters, not random single pixels.

### Cited Findings
- A Polycount critique of a dungeon tileset: "it's hard to find somewhere to focus the eye, all the lighting is similar in brightness and contrast." Another critique found characters hard to see against the floor. — [Polycount](https://polycount.com/discussion/comment/2359408) (search summary)
- "Readability of the scene is more important than readability of the individual tile." — [Pixel Joint forum TID=17291](https://pixeljoint.com/forum/forum_posts.asp?TID=17291) (search summary)
- Tiles should have clear silhouettes, strong foreground/background contrast and minimal micro-detail that is lost at small scale. — tileset guide, low authority ([flooringclarity.com](https://www.flooringclarity.com/tile-set-pixel-art-complete-creating-using-tilesets/)) (search summary)
- Desaturated backgrounds increase contrast with foreground elements. Warm torchlight against cool ambient blue creates depth. — dungeon palette SEO pages (low weight), e.g. [lohacemosvisible mirror](https://lohacemosvisible.zeiss.es/?p=67910) (search summary)
- Cure's noise and dithering rules apply to textures: random dithering adds single-pixel noise, and large dithered fields become a texture field. — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- In dark scenes, light outline shades fail; keep outlines dark or solid and selout only internal lines. — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- Cure: sel-out is appropriate mainly where "the background is consistently dark." — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Saint11 has "Darkness," "IlluminationTechniques," "Ruins," "Rock," "Tiles," "indoors," "Parallax," "Fire" and "DarkMagic" tutorials; their content is image-only. — [saint11.art](https://saint11.art/blog/pixel-art-tutorials/)

### Inferences (generator rules)
- **Value bands.** Reserve the luminance range for each layer:
  - Background (far walls, parallax): lowest-contrast band, e.g. L* 5–30, desaturated cool hues.
  - Playfield floor and walls: L* 10–45.
  - Characters, interactables and hazards: must include values outside the floor band (brighter highlights), plus a dark outline.

  Check: the mean |ΔL| between a sprite's pixels and the floor tile pixels under it is above a threshold. Also render the scene in grayscale and confirm the sprites remain the brightest local elements near the player.
- **Light pools.** Shade by distance from the light source, not uniformly. Quantize a radial falloff from each torch into 2–3 discrete value rings (no smooth gradient). Hue-shift lit areas warm and unlit areas cool and purple.

  Dithering is acceptable at ring boundaries only, as transitional buffering (Cure). Ring boundaries should follow tile geometry rather than perfect circles, to avoid banding.
- **Texture noise budget per tile.**
  - Orphan density ≤ ~1–3% of tile pixels.
  - Use cluster-based stone and brick detail: 2–6 px clusters with a dark crack line and a 1-px light edge on the light-facing side.
  - Limit each tile to 3–4 ramp indices.
  - Avoid high-contrast detail in background tiles; high contrast is reserved for gameplay-relevant edges such as ledges and doors.
- **Seams / repetition.** Vary tiles with a few alternates rather than random per-pixel noise.

### Gaps
- I found no authoritative quantitative rules (contrast ratios, light-falloff standards) for dungeon tilesets. The tile sources found are informal or SEO-quality.

---

## 5. Expert critique checklists / conventions

### Takeaway
The closest thing to a standard community checklist is the "Things to avoid" section of Cure's Pixel Joint tutorial. Lospec (skeddles) adds a concrete 1× test: touching colors must be distinguishable. Slynyrd adds ramp construction rules. Saint11's catalog of topics is a useful coverage checklist, but its content is image-only. There is real disagreement over sel-out (Cure: mostly avoid; Lospec and itch tutorials: use, with contrast rules) and over how much AA to use.

### Cited Findings
- Cure's checklist:
  - Terms: AA, dithering, clusters.
  - Avoid: bad AA, jaggies, bad dithering, banding, pillow-shading, noise, sel-out.
  - Palette: color count, saturation/hue/luminosity, hue-shifting, ramps.
  — [Cure / Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)
- Lospec 1× rule: "when viewing your pixel art at 1x, you should be able to see the difference between any two colors that touch." — [Lospec, Outlines part 2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- Lospec line rules: identical segments, diagonal-only connection, largest segments at the circle extremes, and break the rule "only when you have to." — [Lospec, Pixel Art Outlines](https://lospec.com/articles/pixel-art-outlines)
- Slynyrd's animation checks: the animation should read from keyframes alone, there should be no orphan pixels per frame, and energy comes before smoothness. — [Slynyrd Pixelblog 8](https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)
- Saint11 topic catalog, a coverage checklist: Fundamentals, Fundamentals2, Silhouette, Outlines, Shading, IlluminationTechniques, Darkness, Metal, Fabric, Subpixel, Squash, Easings, Impact, AttackSheet, characterIdle, Walk, Tiles, Ruins, Rock, Alignment and more. — [saint11.art](https://saint11.art/blog/pixel-art-tutorials/)

### Inferences: a consolidated, machine-checkable checklist for the generator
1. **Light**: one global light vector. The shade index correlates with n·L, not with edge distance (pillow test).
2. **Clusters**: orphan ratio ≤ ~1–2% (whitelist eyes and speculars). Few size-1 or size-2 clusters per index.
3. **Lines**: no L-corner doubles in 1-px lines. Straight edges use uniform run lengths with slopes from {0:1, 1:2, 1:1, 2:1, 1:0}. Curve run lengths are monotonic.
4. **Banding**: no parallel staircases between successive shade boundaries for ≥3 rows or columns.
5. **AA**: only on internal diagonal/curve steps with run ≥2; AA run ≤ buffered run; no exterior AA against an unknown background.
6. **Dither**: none on 24–64 px characters by default. On tiles, only at transitions, with patch area ≤ ~10%.
7. **Palette**: per-sprite colors ≤ ~12–16; ramps hue-shifted ≤20°/step, saturation arched, value monotonic, minimum ΔL between steps.
8. **Outlines**: per-material dark outline (ramp −2 or shared dark). Always darker than both the object and the background. No outline between same-sprite parts (internal lines instead). Keep a ground-contact line.
9. **Contrast**: every pair of touching indices passes a ΔE threshold at 1×. The sprite's value range separates from the floor tile band.
10. **Silhouette**: a single-color fill of the sprite remains identifiable, with weapon and head distinct. Compare silhouettes across poses.
11. **Mixels**: everything at native resolution, with integer nearest-neighbor scaling only at display.
12. **Animation**: volume per part within ±10–15%; no isolated flicker pixels; frame count and timing from the table in section 3.

### Gaps
- I could not access Pixelation forum or Helm's ramblethread text to confirm any formal critique convention beyond Cure's list.
- Pixel Logic (Michafrar) and the text versions of the YouTube educators' material (MortMort, Brandon James Greer, AdamCYounis) were not retrieved, so the checklist above leans heavily on Cure, Slynyrd and Lospec.
