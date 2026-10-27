# Advanced Stylized Material Shading for Small (32–48 px) Code-Drawn Pixel-Art Sprites

Scope note: this covers hand-rendering conventions plus computable equivalents for a renderer that already has analytic per-primitive normals, quantized Lambert from one upper-left light, per-material ramps, part lines, black outlines, about 51 palette colors and banded torchlight. Each claim is tagged **[expert-convention]** (practitioner advice, not measured), **[measured]** (someone counted or measured pixels or parameters), or **[engine-default]** (a published shader's default parameter, which is a tuning starting point and not a perceptual finding). Notes on whether things work in a browser (Canvas2D or JS) are under Inferences.

Research quality caveat: the primary sources I could reach were thin for this topic.
- No Slynyrd post on metal or materials turned up. His blog index, up to Pixelblog 64 (Sept 2026), has no material or metal post among the visible entries.
- No Saint11 metal tutorial surfaced in search.
- The Guilty Gear Xrd GDC handout PDF returned HTTP 503.
- No Blasphemous, Darkest Dungeon or Diablo art-pipeline writeups surfaced.

Most material-specific guidance therefore comes from secondary tutorial sites (pixnote, Wesnoth wiki, Pixel Joint threads, Lospec, Pixel Parmesan), plus published shader code (Roystan).

---

## 1. Material rendering conventions at small sizes (metal/plate, chainmail, cloth, leather, bone, fur/hair, wet/demon skin, chitin, wood, gold)

### Takeaway
At 32–48 px, every source makes the same point: materials are told apart by **contrast range plus highlight shape**, not by texture detail.
- **Metal and gems:** the widest value range, with sharp 1–2 px near-white highlights, banded reflections and colored counter-reflections in the shadows.
- **Cloth:** low contrast, soft boundaries that follow the folds, and almost no highlight.
- **Wood:** moderate contrast oriented along the grain, with almost no highlight.
- **Skin:** soft gradients with warm (reddish) shadows.
- **Hair and fur:** clumps or ribbons, never individual strands. At about 32 px you may not need any strands at all.

A 48 px sprite supports about 3–4 tones per material. That is the measured or recommended budget.

### Cited Findings

**Shade budget by size**
- Recommended tones by canvas size **[expert-convention]**:
  - 16×16: 2 stages (base + shadow).
  - 32×32: 3 stages (highlight, base, shadow 1).
  - 48×48: 3–4 stages (adds shadow 2).
  - 64×64 and up: 4–5 stages (adds a bright highlight).
  - Source: [pixnote Shading & Lighting](https://pixnote.net/en/learn/shading)
- **[measured]** pixnote measured its own 16×16 assets:
  - 76% of main-to-highlight color pairs were near-white.
  - Hue shifted by 8° or more in only 2% of measured pairs. At 16 px, lightness does nearly all the work.
  - Hue shifting "starts to pay off" at 3 or more ramp steps. Rule of thumb: small pieces rely on the lightness gap, large pieces on hue shift.
  - Source: [pixnote](https://pixnote.net/en/learn/shading)
- **[expert-convention]** A different community guide recommends 5–6 shades for clothing, skin and hair. That conflicts with pixnote's budget at 32–48 px and probably assumes larger sprites. — [kawaiihannah shading tutorial](https://kawaiihannah.pages.dev/pixelart/tutorials/shading-lighting) (via search summary)

**Metal (armor, swords)**
- **[expert-convention]** Rules from pixnote:
  - High contrast (a large brightness gap).
  - Sharp highlights 1–2 px wide.
  - Account for environmental light reflection.
  - Surrounding colors reflect in the shadows.
  - Source: [pixnote](https://pixnote.net/en/learn/shading)
- **[expert-convention]** At low resolution, metal "has a tendency to have dark and light areas in multiple bands," so adding bands of color reads as metallic. The shadows must convey the form first, and the shine bands come second. — [Pixel Joint thread (via search)](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=4897)
- **[expert-convention]** A metal object "can read as rock if it isn't contrasty enough." Simplify the design and raise the contrast. — [Pixel Joint glass/metal thread (via search)](https://pixeljoint.com/Forum/printer_friendly_posts.asp?TID=5178)
- **[expert-convention]** Highlight direction on curved metal (Pixel Joint lock critique): primary highlights run parallel to the object's edges, and subtler soft reflections follow the horizon direction. This is the closest source to the "horizon line" convention. — [Pixel Joint (via search)](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=14911)
- **[expert-convention]** The archived "Mozco metal tutorial" is repeatedly cited by forum users as "still the best metal tutorial out there for pixel art." Its images are broken in the archived copy. — (search summary of Pixel Joint threads; not fetched)

**Counter-reflection and colored reflections (Wesnoth armour tutorial, painterly, adaptable)** **[expert-convention]**
- Counter-reflection is "the key to metal shading": "Metal doesn't need a direct lightsource to reflect light." Put lighter touches inside the shadowed areas to suggest bounce from walls, shields or the sky.
- Keep contrast high, because "metal doesn't reflect light like cloth or leather."
- Pinpoint highlights:
  - Tiny light-grey or white dots, used sparingly, because too many make the metal look overly shiny.
  - They matter most for "tainted" metals such as copper, brass and bronze.
- Reflection tints at about 25–30% opacity:
  - Blue suggests sky.
  - Orange suggests torch or fire.
  - Brown suggests nearby leather or wood.
  - Keep each reflection close to the surface it comes from.
  - Don't oversaturate, because that weakens how believable the metal is.
- Source: [Wesnoth Armour Tutorial](https://wiki.wesnoth.org/Armour_Tutorial)

**Other materials**
- **Cloth** **[expert-convention]**:
  - Soft shadow boundaries that follow the wrinkle lines.
  - Minimal highlights, because cloth is matte. Hue shifting works well here.
  - Source: [pixnote](https://pixnote.net/en/learn/shading)
- **Folds** **[expert-convention]**:
  - Defined by shadow or highlight. Outlining them is generally not needed.
  - Skirt folds are built from cone shapes.
  - Source: [kawaiihannah (via search)](https://kawaiihannah.pages.dev/pixelart/tutorials/shading-lighting)
- **Wood** **[expert-convention]**:
  - Moderate contrast. Light and dark follow the grain direction.
  - Dithering can be used for texture. Almost no highlights.
  - Source: [pixnote](https://pixnote.net/en/learn/shading)
- **Skin** **[expert-convention]**: soft gradients and subtle highlights. "Shadows lean warm (slightly reddish)." — [pixnote](https://pixnote.net/en/learn/shading)
- **Gems and crystals** **[expert-convention]**:
  - Very high contrast and strong near-white highlights.
  - Light transmission through the interior.
  - High saturation.
  - Source: [pixnote](https://pixnote.net/en/learn/shading)
  - This is the closest available analog for glossy chitin.
- **Hair** **[expert-convention]**: drawn "in clumps," as ribbon-like chunks, because pixel art is too small for individual strands. — [kawaiihannah (via search)](https://kawaiihannah.pages.dev/pixelart/tutorials/shading-lighting)
- **Fur** **[expert-convention]**:
  - Don't draw individual strands. At around 32 px "we don't even need to draw ANY strands of fur."
  - Start with shading clusters, then make the cluster edges jagged or wavy.
  - Sources: [itch.io fur post](https://itch.io/post/6047047); [itch.io yeti tutorial](https://itch.io/t/1977247/pixel-tutorial-yeti-final-fantasy-14) (via search)

**Ramp construction (Slynyrd Pixelblog 1)** **[expert-convention]**
- 9 swatches per ramp, with +20° hue shift per swatch ("20 is about as high as I go").
- Brightness rises steadily, and the steps shrink near 100%.
- Saturation peaks mid-ramp and never reaches 0 or 100%. Its steps are larger at the ends.
- Reduce saturation as brightness gets high. Darks generally carry more saturation.
- Hue shifts positive with brightness: colors warm as they brighten and cool as they darken.
- Source: [Slynyrd Pixelblog 1 – Color Palettes](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)

### Inferences
Concrete ramp specs for this renderer. These are my synthesis from the sources above and are not measured. Indices run from dark to light.

| Material | Ramp tones (48 px) | Contrast (L* span, approx.) | Hue shift | Highlight | Notes |
|---|---|---|---|---|---|
| Polished steel / plate | 5: deep shadow, shadow, mid, light, specular near-white | widest (~70–85 L*) | slight cool in shadows; reflected-floor tint (warm brown/orange from torch) in the lowest band | 1–2 px sharp spec, hard edge; no dithering | Use non-monotonic "band" ramp (see below) |
| Dull iron / chainmail | 3–4 | medium (~45 L*) | cool grey | 1 px glints on a regular lattice in lit zone only | see chainmail pattern |
| Gold trim | 4: dark brown-orange, orange, yellow, pale-yellow/white | high | strong (Slynyrd-style +15–20°/step, orange→yellow) | 1 px pale yellow | Wesnoth: bronze/gold-type metals benefit most from pinpoint highlights |
| Cloth | 3 | low (~25–35 L*) | moderate (hue shift is where cloth gets richness) | none | soft, fold-following boundaries; wider bands |
| Leather | 3–4 | low-medium | warm brown, shadows toward red-purple | 1 px dull, low-value highlight on edges/straps only | (no source; extrapolated between cloth and metal) |
| Bone | 3–4 | medium | warm off-white light (yellow-cream), shadows cool grey-blue/violet | small, soft | (no direct source; follows Slynyrd warm-light/cool-dark rule) |
| Fur/hair | 3 | low-medium | follows material | none or 1 px clump tips | cluster shapes, jagged edges |
| Demon / wet skin | 4 | medium-high | warm red shadows (pixnote), plus rim; wet gets 1–2 px spec dots | small sharp spec = "wet" | |
| Chitin / spider carapace | 4–5 | very high (gem-like) | dark saturated base, spec near-white or tinted | sharp elongated spec streak along curvature + rim | treat as gem/metal hybrid |
| Wood | 3 | moderate | warm | none | grain lines aligned to the long axis (cylinder axis) |

**Metal: non-monotonic ramp (my inference from the "banding" and "counter-reflection" findings).** Polished metal reads as metal when the brightness profile along the surface is *not* a plain Lambert gradient.
- Map the half-angle or reflection term into a ramp that goes dark → light → *dark band* → light, so a dark reflection band sits next to the highlight.
- An implementable version is an "environment reflection" lookup on the reflected vector's vertical component, `R = reflect(-V, N)`. With `ry = R.y`:
  - **Sky / ceiling zone** (`ry > 0.2`): light tone. In a dungeon this zone is torch-warm or dim.
  - **Horizon band** (`-0.1 < ry < 0.2`): darkest tone. This is the classic chrome "horizon line" seen on a plate pauldron.
  - **Floor zone** (`ry < -0.1`): mid tone, tinted with the floor and torch color. This is the counter-reflection.
- Then add the thresholded Blinn-Phong spec on top (section 2).
- The thresholds are tuning starting points, not sourced.

**Chainmail.** No source was found. A common 32–48 px convention, not verified this session, is:
- A mid-grey base.
- A regular 2×2 or offset-row pattern of 1 px light dots in the lit region only, fading out in the shadow band.
- The dark tone between the dots.
- Computable as `lit && ((x + (y>>1&1)) % 2 == 0)` for the dot positions, restricted to `NdotL` bands ≥ mid.

**Fur and hair clusters.** Compute the shading on a *coarser* normal field, either per clump primitive or with normals quantized per 2–3 px region. Then perturb the band boundaries with a small per-column hash so the light/shadow edge becomes jagged:
`band = quantize(NdotL + 0.08 * (hash(x) - 0.5))`, with the hash keyed to the strand direction.
This gives the "jagged or wavy cluster edges" convention without strand noise.

**Wood grain.** Along a cylinder primitive's axis, darken every ~3–4 px with a 1 px line one ramp step down, and only in the mid and light bands. This follows the pixnote rule that light and dark follow the grain.

### Gaps
- No primary source surfaced for Slynyrd, Saint11, MortMort, Brandon James Greer or AdamCYounis material breakdowns (metal, chainmail, leather, bone, chitin). The numbers in the table above are synthesized, not sourced.
- The Mozco metal tutorial (archived, broken images) was not retrieved.
- No measured data on ramp lengths per material, beyond pixnote's per-canvas-size counts.

---

## 2. Toon/cel shading from 3D normals: ramps, rim light, AO, cast shadows, per-material specular, hue shifting

### Takeaway
Published toon shaders use **2–3 hard bands from N·L**, with a band edge width of about 0.01 so the edge is effectively hard, plus three additions:
- A **thresholded Blinn-Phong spec**.
- A **rim term `1−N·V` masked by N·L** and thresholded.
- An **ambient floor** so shadows never go black.

AAA cel shading (Guilty Gear Xrd) keeps the bands at 2 tones. The art direction comes from **per-region threshold offsets** (vertex colour or AO pushes areas such as under the chin into permanent shadow) and from a **separately authored shadow color**, rather than from more bands. This maps directly onto a per-primitive renderer.

### Cited Findings

**Roystan toon shader (Unity), formulas and defaults** **[engine-default]**
- Diffuse:
  - Base: `NdotL = dot(lightDir, N)`, then `lightIntensity = smoothstep(0, 0.01, NdotL * shadow)`.
  - For more bands, use a ramp lookup with `uv.x = 1 - (NdotL*0.5+0.5)`.
- Ambient: `_AmbientColor` defaults to (0.4, 0.4, 0.4) and is added to the light term.
- Spec (Blinn-Phong):
  - Half vector: `H = normalize(L + V)`.
  - `spec = pow(NdotH * lightIntensity, gloss*gloss)` with gloss = 32.
  - Then `smoothstep(0.005, 0.01, spec)`.
  - Spec color defaults to (0.9, 0.9, 0.9).
- Rim:
  - `rimDot = 1 - dot(V, N)`.
  - `rimIntensity = rimDot * pow(NdotL, rimThreshold)` with rimThreshold = 0.1.
  - Then `smoothstep(rimAmount - 0.01, rimAmount + 0.01, rimIntensity)` with rimAmount = 0.716.
  - Multiplying by NdotL limits the rim to the lit side.
- Source: [Roystan – Toon Shader](https://roystan.net/articles/toon-shader/). The fetch truncated some final lines. The rim-threshold `pow` form matches the published tutorial as I recall it, but treat it as lightly verified.

**Guilty Gear Xrd (Arc System Works, GDC 2015 talk by Junya C. Motomura)**
- The talk is "GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D." The handout PDF could not be fetched (HTTP 503). — [GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The); [ASW announcement](https://www.arcsystemworks.com/guilty-gear-xrd-art-talk-at-game-developers-conference-2015/)
- **[expert-convention, secondhand]** Shading is binary light/shadow with no gradual falloff:
  - Vertex colors keep chosen areas, such as under the chin and toward the feet, shadowed in a style-consistent way.
  - Normals were edited to shape the shading. This distorts the spec but makes the shadows fit together.
  - Texture 1 is the base color. Texture 2 is a hand-made darker "shadow color" texture, built with a multiply layer in chosen tones.
  - Source: [BlenderNation summary + comments](https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/)
- **[secondhand]** Community reverse-engineering adds the following:
  - Vertex color offsets the light/shadow threshold, so an artist can make a region go dark more easily.
  - The scheme is "simple 2–3 tone cel shading with vertex-colour-attribute threshold control."
  - Vertex color channels also control outline thickness and a hand-tweaked AO mask for self-shadowing.
  - One thread disputes that normals were painted.
  - Sources: [Polycount](https://polycount.com/discussion/comment/2567560); [UE forum](https://forums.unrealengine.com/t/guilty-gear-toon-shader/2088); [Unity forum](https://discussions.unity.com/t/guilty-gear-xrd-shader-test/650399)
- **[secondhand]** A Sketchfab summary describes the result as "clean 2 tones shading." — [Sketchfab Art Spotlight](https://sketchfab.com/blogs/community/art-spotlight-here-at-last)

**t3ssel8r-style 3D pixel art (third-party reimplementations; t3ssel8r has published no breakdown)**
- Toon lighting is "nothing particularly special."
- Noise is added to the normals to reduce shadow popping on flat surfaces.
- The directional light's attenuation is smoothed to reduce flicker.
- Outlines come from screen depth plus normals edge detection, using a 4-neighbour (up/down/left/right) kernel for 1 px lines.
- Depth gives the object silhouettes. Normal discontinuities give the internal edges.
- Convex edges are isolated, via a cross product of neighbouring normals plus heuristics, and drawn as *highlights* rather than dark lines.
- No numeric thresholds are given (they are tuned per scene).
- Source: [David Holland – 3D Pixel Art Rendering](https://davidholland.netlify.app/articles/3d-pixel-art-rendering)
- "In traditional pixel art... outline should appear in any sharp edges as if it's some kind of highlights." — [Kyriota – Unity Pixelated Art Style in URP](https://kyriota.github.io/2022/08/02/UnityPixelatedArtStyleInURP/)

**Dead Cells**
- 3D models are rendered "in a very small size and without antialiasing," and characters are about 50 px tall.
- Each frame is exported as a PNG plus a normal map. Volume comes from a "basic toon shader."
- The team "still haven't found any solution for flickering pixels."
- Source: [Game Developer – Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Shader and code reference: Broxxar/PixelArtPipeline on GitHub. — [80.lv](https://80.lv/articles/case-study-dead-cells-character-art-pipeline/)

**Sprite Lamp**
- Its preview supports cel shading, depth-map self-shadowing, specular colour and glossiness maps, emissive, AO maps and hemispheric ambient.
- It ships fully commented GLSL shaders.
- Normal maps are built from 2–5 painted "lighting profiles."
- Source: [Steam store page](https://store.steampowered.com/app/316830)

**Cryptark**
- A single height map gave a "plastic wrap" look, so good normals needed hand work.
- Hand-painted light channels use just two tones with no gradients.
- Specular maps with glow "especially useful for making enemies pop out from the background."
- Source: [Game Developer – Cryptark](https://gamedeveloper.com/design/game-design-deep-dive-visualizing-i-cryptark-s-i-2d-sci-fi-world)

**Hue shifting direction** **[expert-convention]**
- Hue shifts positive with brightness, so lights warm and darks cool. — [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- **[measured]** Hue shift barely registers at 16 px and pays off at 3 or more steps. — [pixnote](https://pixnote.net/en/learn/shading)

### Inferences
An implementable per-pixel pipeline for the existing analytic-normal renderer. All thresholds are starting points, tuned from the Roystan defaults and the Guilty Gear Xrd practice.

1. **Diffuse band with a per-region threshold offset (the Guilty Gear Xrd idea).**
   `d = dot(N, L) + bias_part + ao_term`, then `band = d > t1 ? 2 : d > t0 ? 1 : 0`, with t1 ≈ 0.45 and t0 ≈ −0.05 for a 3-band material. Notes:
   - `bias_part` is a per-primitive constant, for example −0.3 for the area under the helmet, the inner thighs or the lower legs. That pushes them into shadow, like Guilty Gear Xrd's vertex-colour threshold offset.
   - It is cheaper and more art-directable than real shadowing.
   - Keep 2–3 diffuse bands and spend any extra ramp entries on spec and rim, not on more diffuse steps.

2. **Ambient occlusion from geometry.** Analytic primitives make AO easy:
   - **Overlap AO:** for each pixel of a part, test whether a part drawn *in front* covers the pixel 1–2 px up or left (toward the light) or along the occluder boundary. If so, lower the band by 1. This gives contact darkening where an arm meets the torso or a belt crosses the tunic.
   - **Sphere and cylinder crevice AO:** use `ao = smoothstep(0, k, distance_to_other_primitive_edge)` in pixels, with k ≈ 2 px.
   - Both are cheap in JS because they only need a per-pixel part-ID buffer plus a depth (z-order) buffer.

3. **Cast shadows between parts (helmet onto shoulders, shield onto arm).**
   - Use 2D "shadow offset" masks. Shift the occluder part's coverage mask by the light-direction vector (for an upper-left light, about (+1..+2 px, +1..+2 px) down and right).
   - Intersect the shifted mask with the parts behind the occluder (lower z) and drop those pixels one band.
   - This is a screen-space approximation of a depth-map self-shadow, the kind Sprite Lamp computes. At 32–48 px a 1–2 px offset is enough.

4. **Thresholded Blinn-Phong spec per material.**
   - `H = normalize(L + V)` with V = (0, 0, 1) for an orthographic sprite. Spec fires when `dot(N, H) > s_thresh` and the diffuse band is not 0.
   - Suggested `s_thresh` values. These are derived from Roystan's gloss² = 1024 at the 0.005 smoothstep start, which makes the spec region very small; at sprite scale you must allow at least 1 px.

   | Material | s_thresh | Spec size |
   |---|---|---|
   | Plate metal / chitin | ~0.97 | aim for 1–3 px |
   | Gold | ~0.95 | |
   | Wet skin | ~0.96 | 1–2 px |
   | Leather | ~0.90, at a lower-value spec color | |
   | Cloth, wood, fur | no spec | |

   - Guarantee at least 1 spec pixel on metal parts by picking the argmax `dot(N, H)` pixel if no pixel passes the threshold. Remove any spec pixel that sits on the outline.

5. **Rim / back light (Fresnel-like) for dark floors.**
   - With an orthographic V, `1 − N·V` is just `1 − N.z`. On analytic spheres and cylinders this is large near the silhouette.
   - Roystan masks the rim to the lit side: `rim = (1 − N.z) * NdotL^0.1 > 0.716`.
   - For dark-dungeon readability, the more useful variant is a **back rim from a second, opposite or torch light**:
     `rim2 = (1 − N.z) > 0.6 && dot(N, L_back) > 0.3`, where `L_back` points from the nearest torch.
     This lights the silhouette on the shadow side with a cool or torch-tinted ramp tone (see section 4).
   - Restrict the rim to the 1 px just inside the outline, so it reads as a rim and not as banding.

6. **Shadow color as a separate ramp (Guilty Gear Xrd "shadow texture" idea).** Don't derive shadow tones by darkening. Index each material's shadow bands into hand-picked, hue-shifted entries:
   - Shadows go toward purple or blue, except skin and flesh, whose shadows go warm red.
   - Lights go toward yellow.
   - Use Slynyrd's +15–20° per step for cloth, gold and skin. Use a smaller shift (≤10°) for steel and stone, since pixnote finds hue matters less at small sizes.

7. **Convex edge highlights (t3ssel8r style).**
   - Where two primitives meet at a convex crease, or along a plate's ridge line, draw 1 px of the light tone *instead of* a dark internal line when the crease faces the light.
   - Rule: `dot(N_avg, L) > 0` → light line, else dark line.
   - This replaces some of the existing part lines with highlight lines, which is a big richness win for armor.

8. **Temporal stability.**
   - Dead Cells reports unsolved pixel flicker from per-frame toon shading of low-res models. Holland adds normal noise and smoothing for the same problem.
   - For animation, add hysteresis to the band thresholds per part, or snap normals to a fixed set (for example 16 directions) so that bands don't crawl between frames.

**Browser/JS feasibility.**
- Everything above is per-pixel arithmetic over sprites of at most 48×48, so about 2,300 px per sprite. Even with AO and shadow-mask passes, that is trivially cheap in Canvas2D with an `ImageData` loop.
- Pre-bake per animation frame and per light direction, or cache each sprite per (frame, torch-quadrant).
- A WebGL fragment shader is only needed if the shading must react per frame to many moving torches.

### Gaps
- The Guilty Gear Xrd primary handout (ggxrd.com PDF) returned 503. The exact channel semantics (for example the "ILM" texture channels for spec size, shadow threshold and inner lines) are from memory, not verified this session, and so are not stated above as fact.
- No t3ssel8r first-party numbers exist publicly.
- No quantitative study of how many cel bands read best at 32–48 px. The 2–3 bands figure is convention (Guilty Gear Xrd, Cryptark, Roystan).

---

## 3. Dithering and anti-aliasing at small size

### Takeaway
For 32–48 px **animated character sprites**, the expert consensus is: **avoid dithering** in shading.
- Use flat bands and hand-placed 1 px AA on curves.
- Keep any dithering for static props, gradient backgrounds, or deliberate texture (grime, wood).
- Fix banding by **staggering** where value transitions fall, not by dithering.

### Cited Findings
- **[expert-convention]** Pixel Parmesan on dithering:
  - Advises against dithering for most character sprites, especially animated ones, because small sprites lack the pixels to hold the detail.
  - "Dithering softens edge definition and may disrupt the integrity of forms."
  - Using dithering "to add texture" usually produces superfluous noise.
  - The checkerboard is the common two-color blend. A 45° 1×1 diagonal edge is the least disrupted by dithering.
  - Higher-contrast color pairs need more dither steps, and so more resolution.
  - Four intermediate colors gave a smoother gradient than many patterns using two colors.
  - Source: [Pixel Parmesan – Dithering for Pixel Artists](https://pixelparmesan.com/dithering-for-pixel-artists)
- **[expert-convention]** For sprites, dithering can introduce frame-to-frame noise, so crisp edges are usually better. Test at 1:1. If it looks like "TV static," it's over-dithered. — [Divoom guide](https://divoom.com/blogs/setup-ideas/pixel-art-dithering-when-to-use-and-stop) (lower-quality source)
- **[expert-convention]** Banding (two shades running parallel along the same stair-step) flattens form. Fix it by staggering where value transitions happen instead of stacking them on the same diagonal. — [search summary; wayline/pixnote-type guides](https://pixnote.net/en/learn/dithering)
- **[expert-convention]** Rules for anti-aliasing:
  - AA should be 1 px wide.
  - Apply it selectively, because not every edge needs it.
  - Automatic smoothing can blur intended sharpness.
  - Source: [pixel-art-professional skill page](https://skills.sh/willibrandon/pixel-plugin/pixel-art-professional) (low-authority source)
- **[expert-convention]** Dithering is recommended in limited cases: skin smoothing and wood texture. — [pixnote](https://pixnote.net/en/learn/shading)

### Inferences
- **Banding fix in code.** Quantized Lambert on a sphere makes concentric band boundaries that are perfectly parallel to the silhouette. That is the "banding" failure. Fixes:
  - (a) Offset the light so the boundaries don't run parallel to the outline. Upper-left light already does this for spheres.
  - (b) Snap the band boundary to clean pixel-art line segments, using the 1:1, 2:1 and 1:2 slopes that clean pixel lines are built from. Do this by post-processing each boundary: find boundary pixels and remove isolated "jaggies" (a single pixel sticking out) or fill single-pixel notches.
  - (c) Prevent "pillow shading" by never letting the darkest band hug the whole silhouette. Bias the threshold by the light direction, not by the distance to the edge.
- **Orphan cleanup pass.** Any band pixel whose 4-neighbours are all a different band gets set to its majority neighbour. This is the computable equivalent of "avoid noise" and kills stray single pixels from quantization. Exempt intentional 1 px spec glints, which are tagged.
- **AA on curved outlines.** Where the black outline steps diagonally, place a 1 px intermediate (outline-to-fill midpoint) on the inner corner of each step where the run length is ≥ 2. Do it only on the inside of the outline, so the silhouette stays crisp against the dark floor. Skip AA on the shadow side, where it would be invisible on a dark background anyway.
- **Dither only for static props** (crates, altars) and for the torch light falloff on floors, using a 2×2 Bayer or checkerboard at most one band wide. Never on animated characters.

### Gaps
- No Lospec dithering or AA tutorial content was retrieved. I found no measured data on perceived noise against dither density at sprite scale.

---

## 4. Readability against dark, busy floors (rim lights, value separation, outline color) in Diablo-like games

### Takeaway
- **Contrast must always increase at the outline.** On dark backgrounds, black (or the darkest ramp tone) is often the only outline that holds up.
- Inside the outline, **selective outlining** keeps the contrast with the fill constant.
- The proven separation tools are:
  - A **secondary rim or back light** on the shadow side.
  - **Specular or emissive accents** that pop characters off backgrounds.
  - **Desaturated, lower-contrast backgrounds** against a saturated, high-contrast foreground.

### Cited Findings
- **[expert-convention]** Lospec (Pixel Art Outlines Part 2):
  - "An outline should always increase contrast, and never decrease it." It should be darker than both the object and the background.
  - Sel-out uses darker outline colors where the sprite is darkest and lighter ones where it is lightest, to keep the outline-to-fill contrast constant.
  - On darker backgrounds the lightest sel-out shades fail first, and "only the darkest shades or black may hold up." Black is a safe fallback for changing or dark backgrounds.
  - Interior lines can go as light as you want, since no background sits behind them. Break them up so they appear only near shadows, and fade them to a lighter color at connection points.
  - Between two parts, use the color of the nearer part, or the darker part's color if one is noticeably darker.
  - A reader comment notes that an extra dark outline color adds single-pixel clutter in game sprites.
  - Source: [Lospec – Pixel Art Outlines Part 2: Using Color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- **[expert-convention]** Sel-out is "especially effective" at 32×32 and larger. — [pixnote](https://pixnote.net/en/learn/shading)
- **[expert-convention]** For objects that cast heavy shadows, use "an opposing light source that doesn't cast its own shadow" to brighten dark edges and keep readability. — [itch.io post](https://itch.io/post/9656067) (via search)
- **[developer account]** Cryptark used specular and glow maps that are "especially useful for making enemies pop out from the background." — [Game Developer – Cryptark](https://gamedeveloper.com/design/game-design-deep-dive-visualizing-i-cryptark-s-i-2d-sci-fi-world)
- **[expert-convention]** Slynyrd: "the closest plane is the most saturated with strongest contrast between light and shadow." He also adjusts background saturation, contrast and brightness for readability (Pixelblog 62 and 63). — [Slynyrd blog index](https://www.slynyrd.com/blog)
- **[developer account]** Children of Morta upscales its pixel art about 4× to full HD, so its lighting can run at HD resolution. A user review argues the aesthetic sometimes clashes with readability. — [TechRaptor](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta); [Giant Bomb user review](https://giantbomb.com/user-reviews/uid/6072/an-average-pixel-analog-to-hades)
- **[developer account]** One pixel-art studio concluded that normal mapping removed some of the "purity" of the pixel-art aesthetic for only a subtle effect. — (search summary, [moddb – The art of lighting in 2D](https://www.moddb.com/games/green-mirror1/news/the-art-of-lighting-in-2d))

### Inferences
Concrete recipe for a dark Diablo-like dungeon:
1. **Keep the black exterior outline.** Per Lospec, it is the only outline that survives dark floors. Apply **sel-out only to interior part lines**: use one ramp step below the part's local band, and fade lines toward the light side.
2. **Value budget.**
   - Floors: reserve the bottom ~35% of the value range, with low saturation.
   - Characters: their lit bands should sit above the floor's brightest torch-lit tone.
   - Tooling: check this numerically by computing the relative luminance of each sprite's mid band against the floor's lit band, and require a gap of at least ~0.15 (a threshold suggestion, not sourced).
3. **Torch-side rim.**
   - For each sprite, compute the 2D direction to the nearest torch.
   - Give pixels within 1 px inside the outline a rim tone when the analytic normal faces the torch: `dot(N.xy, torchDir) > 0.5` and `N.z < 0.6`. Use the warm torch-tinted top of the ramp.
   - On the side away from every light, use a faint **cool back rim** (one desaturated blue-grey step) to separate the silhouette from the black floor. This is the "opposing light that casts no shadow."
4. **Spec and emissive accents as beacons.** Use 1–2 px near-white spec on metal, and emissive eyes or runes on demons, spiders and skeletons. Glints on otherwise dark monsters do the work of Cryptark's glow maps.
5. **Ground contact shadow.**
   - Draw a 1–2 px tall dark ellipse under the feet, at about the sprite's width × 0.6. Use the floor color dropped 2 steps, not pure black, so it reads under the black outline.
   - This anchors the sprite and separates it from floor texture. (Standard convention; no source was retrieved this session.)
6. **Saturation hierarchy.** Characters get the saturated mid-ramp entries. Floors and walls use the desaturated ramp section that Slynyrd builds by flipping and desaturating the middle columns of each ramp.

### Gaps
- I found no art-direction writeups or postmortems for Diablo, Blasphemous or Darkest Dungeon on their sprite readability or outline color choices. Any claims about those games' specific techniques would be unsourced.
- No measured threshold for value separation against dark floors was found. The 0.15 luminance gap is my suggestion.
