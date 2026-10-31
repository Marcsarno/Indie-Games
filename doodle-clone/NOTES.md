# Doodle-clone notes: Halloween "Doodle Jump" in Three.js (working title: **Spooky Hop**)

Last updated 2026-10-31. **Status: PLAN ONLY. No code yet. Waiting on the user's art (green-screen video clips in Dropbox).**

## Pitch
Gameplay (confirmed with user): the jump is AUTOMATIC on landing (no jump button); the player holds a direction (tilt or left/right touch) to aim the next jump; climb forever; the higher you get the more complex the levels get. The 2.5D is part of that escalation: more background layers, foreground layers in front of the play plane, and layers moving independently of each other as you climb.
Endless vertical jumper for portrait phones. Tilt/touch to steer, auto-jump on every platform, climb as high as you can.
Halloween theme: haunted graveyard -> forest -> mansion roofs -> storm clouds -> moon. Earn candy and unlock Halloween outfits.
Real 3D scene (Three.js) with a 2D gameplay plane, so the background gets true depth/parallax ("2.5D").

## Research findings (what the web gave us, honestly)
No one has published Doodle Jump's real constants; the numbers below are our own, derived from jump math and tuned by feel.
What the sources agree on:
- **The camera only goes up**; the player is never allowed to scroll it down. Clones either move the camera or shift the whole world down; moving the camera is cleaner in 3D. [PlayCanvas dev log](https://forum.playcanvas.com/t/doodle-jump-clone-progress-log-useful-for-newbies/300), [DEV post](https://dev.to/7xgames/phase-5-final-game-shipped-doodle-jump-clone-live-on-7xgames-2njb)
- **Horizontal wrap** (leave one edge, appear on the other) and **death = fall below the bottom of the view**. [Bubble Jump](https://github.com/dima13230/bubble-jump)
- **Pooling beats push/pop**: platforms recycled in a fixed pool; arrays that grow/shrink caused bugs. [Endless Jumper README](https://github.com/YoseptF/Endless-Jumper)
- **Score = height**, nothing else; platform types unlock by score (moving ~200, spring ~300, breaking ~500 in one clone). [DEV post](https://dev.to/7xgames/phase-5-final-game-shipped-doodle-jump-clone-live-on-7xgames-2njb)
- **Reachability by construction**: generate each platform inside the jump envelope of the previous one; no graph search needed. [Lexaloffle thread](https://www.lexaloffle.com/bbs/?pid=103744), [TASVideos on search-based checking](https://tasvideos.org/Forum/Topics/7850)
- **Jump math**: v0 = sqrt(2 g H); derive gravity and launch speed from the apex height and time you want. [Platformer physics cheatsheet](https://medium.com/@brazmogu/physics-for-game-dev-a-platformer-physics-cheatsheet-f34b09064558)
- **Tilt on iOS** needs HTTPS and `DeviceOrientationEvent.requestPermission()` called from a user gesture. [A-Frame docs](https://aframe.io/docs/1.6.0/components/device-orientation-permission-ui.html), [three.js forum](https://discourse.threejs.org/t/device-orientation-controls-ios-request-permission-or-no/16271)
- **Parallax**: layers at different depths; with a perspective camera the depth does the parallax for free. [melonJS 2.5D](https://github.com/melonjs/melonJS/wiki/2.5D-Games)
- Original game's content (platform types, power-ups, monsters) is documented only by unofficial guides, so treat as inspiration: static / moving / breakable / disappearing platforms, spring + trampoline, propeller hat, jetpack, spring shoes, monsters you shoot or stomp.
- Nothing useful found for "keyed video frames -> atlas"; the pipeline below is our own design.

## Art direction (from the user's reference, `art/reference/ref-01-look.png`, 1024 x 1536)
**Style:** painted storybook illustration (soft shading, rim light, glow), NOT pixel art, so the `pixel-sprite` skill and diablo `RUBRIC.md` do not apply here. Palette: deep violet sky and fog, warm orange windows/lanterns/candy, cyan accents on magic things.
What is in the frame, and what it means for the build:
| In the reference | Build meaning |
|---|---|
| Little witch girl (purple star hat/dress, striped tights, boots), side/3-quarter view, ~350 px tall, feet planted on the slab | Default outfit = **Little Witch**. Other outfits are most likely the same girl in other costumes (same body, same pivot) so the clips stay consistent. Confirm with user. |
| Cracked purple **stone slab on wooden brackets with autumn ivy** (~310 px wide, top face visible from slightly above) | The normal platform. Painted sprite, not a 3D mesh. Variants: clean, cracked (probably the breakable one: the bigger cracks), and more ivy. |
| Slab with a **glowing cyan crescent-moon + stars rune** | A special platform. My guess: super-bounce/spring. User to confirm what it does (other options: moving, teleport, one-use boost). |
| Orange striped **wrapped candy** with glow and sparkles | The candy currency pickup. |
| Crescent moon, stars, soft clouds | Far sky layer (barely moves). |
| Hazy **town silhouettes with lit windows**, 3 or more depth bands, fog between them | The mid/far parallax layers; fog sheets between bands. |
| **Framing houses at the left and right edges** with a hanging jack-o'-lantern and a paper lantern, ivy | Foreground layer (in FRONT of the play plane, hugging the screen edges, moving faster than the world). Must never cover a platform in the middle ~70% of the width. Lanterns sway and glow-flicker. This is the 2.5D showpiece. |
Scale from the reference at 9 world units across (1 u = 114 px): slab ~2.7 u wide, witch ~3.1 u tall and ~1.5 u wide, spacing between slabs ~1.8-2.6 u (early game). Widen the slab hit-box to the top face only, with feet-width tolerance (~0.6 u overlap needed).
**Changes to the plan because of this reference:**
1. Platforms, candy, enemies and foreground houses are **painted sprites (textured quads, alpha), not lit 3D meshes**; 3D lighting would clash with the painted look. The depth comes from Z-spaced layers + perspective parallax + fog sheets + glow/additive sprites (window light, lantern light, candy sparkles) + particles (fireflies, leaves). Optional soft bloom on high-end phones only.
2. **Aspect ratio:** the reference is 2:3 but phones are about 9:19.5. Fit width, extend height. So every background layer must tile or extend vertically (tall strips), and edge houses must be separate pieces that repeat with variation.
3. The background must **change with height** (the user's "more complex as you climb"): same style, new bands (rooftops -> clock tower -> storm clouds -> moon), more layers and more foreground clutter higher up.
4. Candy collected flies to the HUD counter; the rune slab pulses cyan when you land.

### Asset list to generate (user is producing the art; all painted, same style as the reference)
Keep everything the SAME art style and light direction. Transparent PNG or on the green screen (green only as the backdrop, no green in the art). Sizes are for 2x phone sharpness.
1. **Witch clips** on green (list in "Art pipeline").
2. **Platforms** (one sprite each, ~620 px wide at 2x): normal x3 variants, cracked/breakable (plus 2 break-apart frames or I do the break in code), moon-rune, moving (e.g. floating on a broom/with lanterns), disappearing (fades to wisps). Top-down-ish 3/4 view like the reference.
3. **Pickups/props:** candy (+ golden candy), jack-o'-lantern spring, broom, hat-propeller.
4. **Enemies:** bat (2-4 wing frames), ghost, spider on thread, cauldron vortex.
5. **Background bands** (each a tall, vertically tileable or extendable strip, ~1024 px wide): far sky (opaque, with moon and stars, one per biome), far town silhouette strip (alpha or opaque), mid town strip with lit windows (alpha), fog sheet (alpha, soft).
6. **Foreground pieces** (alpha, left-edge and right-edge versions, 3-4 variants each): house corner with lantern, tree branch with ivy, rooftop edge, chimney with smoke.
7. UI later: candy icon, buttons, title logo, outfit cards.
Order that unblocks me fastest: witch clips -> normal slab + candy -> far/mid background -> foreground houses. Until then I use crops of the reference as look-dev stand-ins.

## Decisions (recommended defaults; user can overrule)
1. **Engine:** Three.js r170 via importmap from jsDelivr (same as `city-clone`), classic no-build ES modules. No bundler.
2. **Camera:** `PerspectiveCamera`, narrow FOV (~28-32 deg), looking straight down -Z at the gameplay plane z=0. No tilt: collision stays readable and the sprite never looks skewed. Depth layers behind (and a few in front) give the parallax. Camera x is fixed; y follows the player upward only.
3. **Gameplay is pure 2D** (x, y on the z=0 plane). Three.js is only the renderer. Game logic never reads the scene graph.
4. **Player = billboard quad with a sprite-atlas animation**, made from the user's green-screen clips (keyed OFFLINE, not live; see pipeline). Platforms/props/background are painted sprites on Z-spaced layers (see Art direction); no lit 3D meshes.
5. **Portrait phone first**; logical view 9 x 16 world units. Fit width; extra height on tall phones just shows more sky.
6. **Cosmetic-only outfits** (no stat perks) so scores stay fair; each outfit can have its own trail/landing particles/sound.
7. **Deploy:** Vercel project like `city-clone` (needs HTTPS for tilt anyway), root `doodle-clone/`. Artifact host is a fallback only (no `.glb`, small files).

## Architecture
```
doodle-clone/
  index.html           importmap, canvas, HUD/menu DOM overlay, boot
  js/
    config.js          ALL tunables (physics, difficulty curve, spawn tables) in one object
    rng.js             seeded RNG (mulberry32) -> daily challenge + reproducible tests
    sim.js             fixed-step simulation, NO three.js imports (testable in node)
    gen.js             platform/item/enemy generator + difficulty curve (pure functions of seed + height)
    render.js          Three.js scene, camera, instanced platforms, sprite quad, particles
    bg.js              parallax layers + biome blending (sky colour, fog, props by height)
    input.js           tilt (iOS permission), touch zones, keyboard, deadzone/smoothing
    sprites.js         atlas loader, animation state machine (outfit-agnostic)
    outfits.js         outfit catalogue + unlock rules + equip
    save.js            localStorage (best, candy, unlocked, equipped, settings)
    audio.js           WebAudio synth sfx + music loop (no audio files at first)
    ui.js              title, outfit closet, game over, settings
  art/                 raw clips (gitignored if large), keying + packing scripts
  tools/               key_frames.py, pack_atlas.py, bot.js (playtest bot)
  assets/              outfit atlases (webp + json), fonts
```
**Sim/render split is the key rule.** `sim.js` owns the truth in world units at a fixed 120 Hz step (accumulator loop); `render.js` interpolates. That makes jump feel identical on 60/120 Hz phones and lets node run the sim headless.

## Core mechanics and starting numbers (all in `config.js`, tune by feel)
| Thing | Start value | Why |
|---|---|---|
| View | 9 x 16 u | portrait 9:16 |
| Jump apex H | 5.5 u (~34% of screen) | feels like Doodle Jump |
| Gravity g | 26 u/s^2 | up-time = sqrt(2H/g) = 0.65 s |
| Launch v0 | sqrt(2 g H) = 16.9 u/s | derived, never hand-set |
| Spring / trampoline | 2.2 x H (12 u) / 3 x H | |
| Broom jet / witch-hat propeller | ~3.5 s of lift, ~7 u/s up, invulnerable | |
| Max horizontal speed | 9 u/s, eased accel | cross the screen in ~1 s |
| Wrap | at x = +/-4.5 u (+ half sprite width); draw a second copy at the far edge while overlapping | seamless |
| Landing rule | only while falling (vy < 0) AND feet crossed the platform top between last and this step (swept test) | no tunnelling, no jump-through from below |
| Camera | tracks up only when player > 40% up the view; smoothed | |
| Death | player top below the view bottom by a margin, or enemy hit | |
| Score | max height reached (u x 10) | candy is separate currency |

**Generator (reachability by construction):** keep a "frontier" y. Next platform gap `dy` is random in `[gapMin(h), gapMax(h)]`, with `gapMax(h)` ramping from 0.35 H at the start to 0.80 H max (never above what a plain jump + steering can reach); `dx` stays within the horizontal reach at that `dy` (use flight time) but wrap-around makes x almost free. Generate in chunks of ~30 platforms ahead of the camera; recycle from a pool of ~60. Difficulty is a pure function of height: platform-width shrink, % moving / breaking / disappearing, enemy rate, fewer springs. Guarantee rule: at least one "safe" platform (normal, static) in every vertical band of 1 jump height, so a breakable/disappearing platform can never be the only path.

## Halloween content (first pass)
- **Platforms:** tombstone slab (normal), floating coffin (moves sideways), cracked bone/rotten plank (breaks after one landing), will-o-wisp (fades after landing), pumpkin trampoline (spring), cobweb (slows you; late game).
- **Power-ups:** witch broom (jetpack), pointy-hat propeller, candy-corn boots (3 super-jumps), magnet bag (pulls candy).
- **Enemies:** bat (sine flight), ghost (drifts through, stomp or shoot), spider on a thread (drops when you pass), zombie hand (pops out of a tombstone), cauldron vortex (black-hole equivalent; sucks you in).
- **Attack:** tap to throw candy up (aim by tilt), like Doodle's nose shot. Stomp from above also kills small enemies.
- **Pickups:** candy (currency), occasional "golden candy" (x5).
- **Biomes by height (blend, don't cut):** 0-1k graveyard (blue-violet) -> 1k-3k dead forest (orange/teal, fireflies) -> 3k-6k haunted mansion roofs (lightning flashes) -> 6k+ storm clouds -> moon + witch silhouettes.

## 2.5D background plan
Layers are textured quads at set depths, all behind z=0 unless noted. Fog colour = current biome colour, which hides pop-in and gives atmosphere cheaply.
| Layer | z | Parallax | Notes |
|---|---|---|---|
| Sky gradient + stars + huge moon | -120 | ~0 (barely moves) | shader quad, colour lerps by height |
| Distant silhouettes (hills, castle, bats flock) | -60 | 0.1 | vertically tiling strips |
| Mid scenery (dead trees, mansion, fence, lamp posts) | -25 | 0.3 | spawned by height, pooled |
| Near scenery + drifting fog sheets | -8 | 0.6 | translucent quads |
| Gameplay plane | 0 | 1.0 | player, platforms, enemies |
| Foreground wisps/leaves/cobweb corners | +6 | 1.3 | few, subtle, never block play |
Because the camera is perspective, parallax is automatic; the factors above are just the result of the z values. Props are instanced; scenery chunks recycle as the camera climbs. Lighting is painted in; glow comes from additive sprites (windows, lanterns, candy) and a soft contact shadow under the witch; **no shadow maps and no 3D lights** (mobile cost). Optional bloom only on high-end, off by default.

## Art pipeline (green-screen video -> sprites)
Input: clips on a green background in the user's Dropbox (I have the Dropbox connector; `download_link` + `curl` works from this container; checked: dropbox.com and jsDelivr are reachable). Tools present: `ffmpeg`, Python with numpy + PIL (no OpenCV; will `pip install opencv-python-headless` if needed).
1. **Extract:** `ffmpeg -i clip.mp4 -vf fps=24 frames/%04d.png`.
2. **Key (offline, `tools/key_frames.py`):** HSV/YUV distance from the measured screen colour (sampled from the border of frame 0), soft alpha ramp, **despill** (clamp green channel to max(r,b)), erode 1 px, feather 1 px, premultiply. Output RGBA PNGs. Keep the soft edge; hard thresholds make crawling outlines.
3. **Stabilise:** crop every frame to one fixed box per clip (not per-frame trim, or the character jitters); the pivot is the feet/centre-of-mass at a fixed pixel in the box. If the source drifts (AI video does), track the torso centroid and re-centre.
4. **Loop:** pick loop points; ping-pong or cross-fade the seam for idle/fall loops. Choose 8-16 frames per state, not all 24 fps.
5. **Pack (`tools/pack_atlas.py`):** one atlas per outfit, e.g. 256 x 256 cells, 8 x 8 = 64 frames in 2048 x 2048 (16 MB on the GPU). Output WebP with alpha + a JSON `{state: {frames:[...], fps, loop}}`. Load only the equipped outfit. Same frame counts and pivot for every outfit, so the animation state machine does not care which outfit is on.
6. **Draw:** one quad, UVs swapped per frame (uniform offset in a tiny shader). Nearest/linear per taste; mipmaps off for the player.
7. **Squash and stretch in code** (scale on launch/landing) on top of the frames; it costs nothing and sells the bounce.

**Clips I need per outfit (all from one fixed camera, same distance, same framing):** idle/jump-rise, apex/float, fall, land squash, throw/shoot, hit/hurt, death/fall-off, propeller/jet flight (or I do the flight in code with a prop sprite). Facing: shoot one direction; I mirror in code. Left/right asymmetry (a bag on one shoulder) will flip sides; fine unless it matters.

**Green-screen rules (user decision 2026-10-31):** the green is only the backdrop so frames key out easily. No outfit, prop or effect uses green (keep it out of costumes, candy and held items too), so the key stays simple and no blue-screen variant is needed. For clean edges: flat even lighting on the screen, no wrinkles/shadows on it, some distance from the screen so green does not spill onto the character, 1080p+ at 30-60 fps, subject fully in frame including props.

## Outfits and progression
Currency: **candy** (earned per run, 1 per pickup + bonus per 100 height). Unlock mix so there is always something close:
| Outfit | Unlock idea |
|---|---|
| Ghost (sheet) | starter |
| Witch | 500 candy |
| Vampire | reach 3,000 height |
| Skeleton | collect 300 candy in total |
| Mummy | survive a lightning storm biome |
| Pumpkin Head | 5 runs in a row over 1,000 |
| Black Cat | 50 candy in one run |
| Werewolf | defeat 50 enemies |
| Mad Scientist | 2,000 candy |
| Grim Reaper | reach the moon (6,000+) |
| Secret | daily-streak 7 days |
Closet screen: preview the animation on a turntable-free flat sprite, locked ones as silhouettes with the unlock hint. Save in `localStorage` (`spooky-save-v1`). Optional later: Supabase leaderboard (connector available) and a daily seeded run (the RNG is already seedable).

## Input
- **Tilt** (default on phones): `deviceorientation.gamma`, deadzone ~3 deg, ~25 deg = full speed, low-pass filtered; first tap on the title runs `requestPermission()` (iOS). Calibrate zero on run start.
- **Touch fallback:** hold left/right half of the screen, or drag-to-steer. A setting toggles which.
- **Keyboard:** arrows/AD, space or up to throw.

## Performance budget (phone, 60 fps)
DPR capped at 2; antialias off (or FXAA-style only); platforms/props via `InstancedMesh` per type (a handful of draw calls); object pools only, zero allocation per frame; no shadow maps; ~100 live meshes max; fog instead of far-plane tricks; texture atlas for all props; atlas size 2048 max. Add an FPS counter behind `?dev=1`, plus a quality toggle.

## Testing plan (follows the repo's headless-Chromium habit)
1. `sim.js` runs in node: a **bot** that steers toward the nearest reachable safe platform plays 10,000 platforms on many seeds; assert it never dies from an "impossible" gap (this verifies the generator's reachability claim).
2. Playwright (software GL) screenshots at fixed seeds/heights for the before/after sheets: each biome, each platform type, each enemy.
3. Hooks: `window.__doodle.{setManual, tick(dt), seed, teleport(h)}`, same pattern as city-clone.
4. Real-phone check by the user via the Vercel link after each milestone.

## Milestones
- **M0 Greybox:** scaffold, fixed-step sim, camera, wrap, generator, cubes for everything, keyboard + touch. Playable on a phone link.
- **M1 Feel:** tune the table above with the user's thumbs; add squash/stretch, tilt, score, death/restart.
- **M2 Content:** all platform types, power-ups, enemies, shooting, candy.
- **M3 2.5D world:** layered parallax, biome blend, fog, lighting, particles.
- **M4 Sprites:** run the pipeline on the first clip, swap the cube for the real character (placeholder if art is late).
- **M5 Meta:** outfit closet, unlocks, save, title/game-over screens.
- **M6 Polish:** WebAudio sfx/music, haptics (`navigator.vibrate`), juice, settings, perf pass.
- **M7 Ship:** Vercel deploy, README, update this file.

## Waiting on the user
- The reference art of how the game should look (not received yet), then the green-screen clips in Dropbox (tell me the folder path and which clip = which state/outfit).
- Outfit list they actually want (the table above is my guess).
- Keep the title **Spooky Hop** or pick another.
