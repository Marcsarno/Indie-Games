# Sprite review rubric

Score each sprite from its contact sheet (`node tools/art.cjs sheet`), never from code or ASCII.
Every "no" must name the frame and region (for example "frame 3, shield's lower edge").
Run at most 3 passes, record the score of each, and keep the best version, not the latest.

| # | Question (yes/no) | What "yes" looks like |
|---|---|---|
| 1 | **Light:** is every part lit from the upper left? | Highlights on upper-left of rounded forms, shadow sides lower-right; no ring of light hugging the outline (pillow shading) |
| 2 | **Silhouette:** does the flat-black silhouette row read on its own? | Head, weapon and limbs distinct; the creature is identifiable from the shape alone |
| 3 | **Outline:** is the outline darker than both the sprite and the floor at every band? | No shadow-side pixels merging into the outline; no black lines *inside* the silhouette except true gaps |
| 4 | **Separation:** does the sprite stand off the floor at dark, mid and bright bands? | Readable at the dark band, not blown out at the bright band |
| 5 | **Animation:** do the frames hold their volume and avoid flicker? | Parts keep size across frames; no single pixels popping on and off |

Leave likeness ("does this look like a skeleton warrior?") to a human. The automatic checks in
`tools/art.cjs lint` run first and are gates, not judges: a sprite can pass all of them and still
be wrong.

| Lint metric | Meaning | Healthy range (starting guess, tune with A/B results) |
|---|---|---|
| interiorVariation | share of interior pixels not in the part's main tone | > 0.3 (near 0 = flat, pillowy parts) |
| lightDirection | correlation of brightness with upper-left position | > 0.15 |
| noisePct | pixels with no same-color neighbor | < 12% (thin lines count here) |
| outlineDoubles | L-shaped clumps in the outline | as low as possible |
| blackInside | black pixels fully inside the silhouette | only real gaps (ribs, between legs) |
| lowContrastPairsPct | touching colors too similar to tell apart at 1x | 0 |
