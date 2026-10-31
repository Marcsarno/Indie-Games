# Art prompt list (copy/paste into the image or video generator)

Paste the STYLE block at the start of EVERY prompt. Keep the same generator/settings so everything matches the first batch
(`art/bg/*.png`, which looks great: soft painted storybook, violet night, orange lantern glow).

**STYLE:** painted children's-book illustration, soft cel shading, rich violet and indigo night palette with warm orange lantern and window glow,
gentle rim light, clean readable shapes, cute and cozy Halloween (not scary), consistent light from the upper left. No text, no watermark,
no frame or border. NO GREEN anywhere in the artwork.

**BACKGROUND RULE:** give me a TRANSPARENT PNG (like the first batch, which worked). If the generator cannot make transparency, put the
subject on a solid pure green (#00FF00) background (the keying tool handles it). Glowing things (sparkles, fog, light beams) may also be
on solid black. Soft glow halos around lit things are good; keep them inside the image, not cut off at the edges.

**SIZES:** layers 1024 x 1536 portrait (2:3) or bigger. Platforms and props: the size given. Leave empty margin around single props.

## A. Platforms (side view, top face visible a little, like the first concept; sit on wood brackets with ivy)
Each is ONE sprite, about 512 px wide, centered, empty margin around it, same size family across variants.
1. `plat_flat_1..3` - "A cracked purple stone slab platform on dark wooden brackets with a little autumn ivy, side view with the top face slightly visible, soft glow, STYLE" (3 variants: different cracks/ivy, same width).
2. `plat_slider` - same slab but it must LOOK like it moves: "the same stone slab hanging from two short iron chains with small glowing orange lanterns at each end, STYLE" (it slides sideways; no arrows or text).
3. `plat_crumbly_0..3` - "the same stone slab but visibly old and fragile with deep cracks and loose crumbling pebbles" (frame 0 = fragile intact), then 1-3 = the same slab breaking apart in three stages, ending in falling pieces with dust. Same camera and size in all four.
4. `trampoline_0..2` - "a plump cushiony orange jack-o'-lantern pumpkin bouncer with a happy glowing carved face, sitting on a small stone base, STYLE": frame 0 resting, 1 squashed flat and wide, 2 stretched tall.
Keep platform thickness thin (top face + short brackets) so the character clearly stands on the top.

## B. Pickups and power-ups
5. `candy_1..3` - "one wrapped orange-and-cream striped candy with twisted ends, soft glow and two tiny sparkles, STYLE" (3 wrapper variants), about 256 px.
6. `candy_gold` - "the same candy but shiny gold, bigger glow", 256 px.
7. `rocket_pack` - "a cute little rocket backpack for a child, rounded body in purple and cream with a gold crescent moon, two small nozzles at the bottom, side view, STYLE" - 2 versions: (a) as a pickup lying/floating on its own, (b) as seen from the side strapped on a back (blank back, no person).
8. `rocket_flame_0..3` - "a cheerful magical flame jet pointing straight down, orange core with violet edges and star sparkles, 4 animation frames, on black", about 256 px.
9. `rescue_bubble` - "a big soft glowing bubble with a rim of light and tiny stars, empty inside, see-through" and `rescue_bat` - "a cute friendly purple bat with big eyes, wings spread, smiling, 3 wing-flap frames".
10. `sparkle_burst` - "a soft burst of orange and gold star sparkles on black" (landing / candy-collect effect), 512 px.

## C. Background, zone by zone (portrait 1024 x 1536, each strip's TOP and BOTTOM edge colours must match the next zone so it continues seamlessly as you climb)
Zone 1 is already done (`sky-dusk`, `mid-town-start`, `fg-houses-start`, `flyby-witch-silhouette`). Now:
11. `sky_zone2` - misty rooftops: "night sky continuing upward: deep indigo with faint violet clouds and sparse tiny stars, bottom edge matches deep blue-violet, STYLE" (opaque).
12. `sky_zone3` - stormy: "dark storm clouds in purple-gray with soft lightning glow behind them, a few stars, STYLE" (opaque).
13. `sky_zone4` - above the clouds: "a sea of moonlit clouds below and a starry deep violet sky above, STYLE" (opaque).
14. `sky_zone5` - moon zone: "a huge glowing cream crescent moon filling the upper third, big stars, tiny bats, STYLE" (opaque).
15. `sky_tile` - "endless deep violet night sky with scattered stars and faint clouds that tiles seamlessly top to bottom" (opaque, 1024 x 1024, top and bottom edges identical). Used to continue forever between zones.
16. `mid_roofs_tile_1..2` - "a band of hazy rooftops with lit windows and drifting fog, same look as `mid-town-start`, but the top and bottom edges fade out softly to transparent so it can repeat vertically" (transparent, 1024 x 1024).
17. `mid_props` - separate transparent props for the mid layer: a clock tower, a tall crooked chimney with smoke, a bell tower, a floating stone island with a tiny house, a distant castle on a cliff, a flock of bats (each its own image, soft and hazy so they sit far back).
18. `cloud_bank_1..3` - "wide soft violet cloud bank with a rim of warm light, transparent, 1024 x 512".
19. `fog_sheet_1..2` - "soft low drifting purple-white fog, mostly transparent, edges fade to nothing, 1024 x 512".
20. `flyby_*` - more silhouettes like the witch on a broom: a flock of bats, a cat on a broom, a ghost, a UFO-shaped lantern, a dragon silhouette (soft dark purple on transparent, 1536 x 1024 like the first one).
21. `moon_big` - "a big glowing crescent moon with a warm halo, transparent" (separate from the sky so it can parallax).
22. `star_twinkles` - "sheet of 8 different tiny twinkling stars, transparent" (I animate them).

## D. Foreground (in FRONT of the player, hugging the left/right edges; transparent)
23. `fg_wall_L_1..3`, `fg_wall_R_1..3` - "the SIDE of a tall old stone-and-wood house with a glowing arched window and autumn ivy, cut off by the left (or right) edge of the image, TOP and BOTTOM edges continue seamlessly so it repeats vertically, STYLE" (1024 x 1024; keep the middle 70% of the width empty/transparent).
24. `fg_top_L`, `fg_top_R` - roof/chimney tops that END the tall wall (like the first batch).
25. `fg_lantern_pumpkin`, `fg_lantern_paper` - the two hanging lanterns by themselves on a short iron bracket, bracket at the top-left, transparent, glowing (so I can swing them).
26. `fg_branch_L/R` - "a bare twisted branch with a few orange leaves and a tiny hanging pumpkin lantern entering from the edge" (transparent).
27. `fg_leaves` - "a few falling orange autumn leaves in 4 shapes, transparent" (particles).

## E. Character clips (same as before)
Same setup as the first five clips (fixed camera, flat green or magenta screen, 3/4 view, character about the same size in frame, no green in the costume). For EVERY outfit also, if possible:
28. `cheer` (jump for joy, 1-2 s) and `oops` (surprised, falling arms flailing, 1-2 s).
29. `fly` - arms up, legs together, looking up, floating with a slight bob (rocket pose), 2-3 s.
30. A longer AIR section for the ghost and pumpkin clips (they only had 17-18 airborne frames).
Next outfits to make (no green in them): black cat, skeleton, vampire, mummy, scarecrow, werewolf pup, bat-fairy.

## F. UI (later)
Game logo "Spooky Hop" (placeholder name), buttons (play, pause, closet, sound), a candy counter icon, outfit-card frame, a padlock, a "new outfit!" burst.

### Priority order
1. Platforms A1-A4  2. Candy + rocket + flame (B5-B8)  3. Sky/tile/roofs/fog for zones 2-3 (C11, C12, C15, C16, C19)  4. Foreground walls + tops + lanterns (D23-D25)  5. Character extras (E28-E30)  6. Everything else.
