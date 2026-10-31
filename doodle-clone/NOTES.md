# Doodle-clone notes: Halloween "Doodle Jump" in Three.js (working title: **Spooky Hop**)

Last updated 2026-10-31. **Status: PLAN ONLY. No code yet. Reference image received (LOOK ONLY, see Art direction); our own gameplay design is below; waiting on the green-screen clips.**

## Pitch
Gameplay (confirmed with user): the jump is AUTOMATIC on landing (no jump button); the player holds a direction (tilt or left/right touch) to aim the next jump; climb forever; the higher you get the more complex the levels get. The 2.5D is part of that escalation: more background layers, foreground layers in front of the play plane, and layers moving independently of each other as you climb.
Endless vertical jumper for portrait phones. Tilt/touch to steer, auto-jump on every platform, climb as high as you can.
Halloween theme. **Built for a 7-year-old: easy and forgiving, difficulty only ramps late.** Collect candy; lifetime candy unlocks Halloween outfits.
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
- **Original's difficulty ladder** (unofficial guides, no exact thresholds published): static platforms first; then sliding ones; then breakable ones (in the original you fall straight through; some browser clones give one bounce first); then disappearing ones (one bounce, then gone). Monsters/black holes only appear late (about 1,500 points in one browser version); spacing grows and hazards cluster as you climb. Power-ups: trampoline, spring shoes, propeller hat, jetpack. [Strategy guide](https://dinogame.gg/blog/doodle-jump-strategy-tips/), [unofficial wiki-style summary](https://rawg.io/games/doodle-jump-wiki)
- **We copy that ladder's order but make it much gentler** (user decision: tuned for a 7-year-old, see Gameplay design). Gameplay is OURS; the concept art is not a source for it.
- Nothing useful found for "keyed video frames -> atlas"; the pipeline below is our own design.

## Art direction (LOOK ONLY, from the user's concept art `art/reference/ref-01-look.png`, 1024 x 1536)
The user said: this is concept art for the LOOK. Do not take gameplay from it (what a platform "does", what a pickup is for, what a layout means). I design the mechanics; the user then makes art for them.
**Look takeaways:**
- Painted storybook illustration (soft shading, rim light, glow), NOT pixel art: the `pixel-sprite` skill and diablo `RUBRIC.md` do not apply here.
- Palette: deep violet sky and fog, warm orange lantern/window light, a little cyan magic glow.
- Setting vibe: a hazy night town of rooftops with lit windows in several depth bands, a crescent moon, soft clouds, autumn ivy, hanging jack-o'-lanterns and paper lanterns; framing houses at the left/right screen edges in front of the play area.
- Character vibe: a cute girl in a witch costume, side/3-quarter view, ~3 u tall at 9 u screen width (1 u = 114 px in the concept image).
**What this means for the build (technical, not gameplay):**
1. Platforms, pickups and the foreground/background are **painted sprites (textured quads with alpha), not lit 3D meshes**; 3D lighting would clash with the paint. Depth = Z-spaced layers + perspective parallax + fog sheets + additive glow sprites + particles (fireflies, leaves). Optional soft bloom on high-end phones only.
2. **Aspect ratio:** the concept is 2:3, phones are about 9:19.5. Fit width, extend height, so background layers must extend or tile vertically; edge pieces are separate sprites that repeat with variation.
3. **Foreground pieces in front of the play plane** (edge houses, branches, lanterns) move faster than the world and hug the screen edges so they never hide a platform; lanterns sway and flicker. This is the 2.5D showpiece.
4. The background changes with height in the same style (zones below); more layers and foreground clutter as you climb.

## Decisions (recommended defaults; user can overrule)
1. **Engine:** Three.js r170 via importmap from jsDelivr (same as `city-clone`), classic no-build ES modules. No bundler.
2. **Camera:** `PerspectiveCamera`, narrow FOV (~28-32 deg), looking straight down -Z at the gameplay plane z=0. No tilt: collision stays readable and the sprite never looks skewed. Depth layers behind (and a few in front) give the parallax. Camera x is fixed; y follows the player upward only.
3. **Gameplay is pure 2D** (x, y on the z=0 plane). Three.js is only the renderer. Game logic never reads the scene graph.
4. **Player = billboard quad with a sprite-atlas animation**, made from the user's green-screen clips (keyed OFFLINE, not live; see pipeline). Platforms/props/background are painted sprites on Z-spaced layers (see Art direction); no lit 3D meshes.
5. **Portrait phone first**; logical view 9 x 16 world units. Fit width; extra height on tall phones just shows more sky.
6. **Kid-first difficulty** (see Gameplay design): forgiving landings, gentle ramp, no punishing deaths. **Cosmetic-only outfits** (no stat perks) so scores stay fair; each outfit can have its own trail/landing particles/sound.
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

## Gameplay design (ours; numbers are starting points, tuned by feel with a 7-year-old's thumbs)
**Core loop:** you auto-bounce on every landing; hold a direction (tilt or left/right touch) to aim; climb; collect candy on the way; the run ends when you fall. Lifetime candy unlocks outfits, so every run makes progress even a short one.
| Thing | Start value | Why |
|---|---|---|
| View | 9 x 16 u, fit width, extend height | portrait phones |
| Jump apex H | 5.5 u (~34% of screen) | |
| Gravity g | 20 u/s^2 (floatier than a normal jump) | up-time = sqrt(2H/g) = 0.74 s, more time to steer |
| Launch v0 | sqrt(2 g H) = 14.8 u/s | derived, never hand-set |
| Horizontal speed | up to 7 u/s, eased | slower than a pro would want, easy to be precise |
| Aim assist (setting, default ON) | gentle pull of x toward the platform you are heading for, small | forgiving, can be turned off |
| Landing | only while falling, swept test; **foot overlap tolerance +0.4 u** each side | no near-miss heartbreaks |
| Platform width | 3.0 u early, shrinking to 2.0 u at the top | big targets |
| Wrap | leave one edge, appear on the other | |
| Camera | up only; smooth | |
| Falling | below view bottom = "Oops!". **Friendly rescue once per run** (setting, default ON): a bubble/bat catches you and lifts you to a platform | a 7-year-old should not lose a long run to one slip |
| Score | height, shown as meters; candy counted separately | |

**Platform roster (the user will draw art for each; I pick behaviour):**
| Platform | Behaviour | Appears |
|---|---|---|
| Flat | solid, still | always (the only kind at first) |
| Slider | slides side to side slowly (1.2 u/s early, max 3), travels a fixed short track, bounces back | from zone 2 |
| Crumbly | you still get your bounce, then it crumbles about 0.4 s after you leave (never a trap you fall through). Never the only way up. | from zone 3 |
| Phasing | blinks between solid and ghost on a slow, readable rhythm (solid >= 60% of a 2.5 s cycle, flicker warning 0.5 s before it fades; can only be landed on while solid, pass-through when ghost) | from zone 4 |
| Vanishing (optional) | one bounce, then gone (the original's "disappearing"). Decide with the user whether to include it as well as phasing. | zone 4-5 |
| Trampoline (on a platform) | big bounce 2.2 x H | zone 1, one early so a kid learns it |
**Power-ups (the user asked for these):**
- **Trampoline**: rests on a platform, squash/stretch, whoosh, candy trail up.
- **Rocket pack**: picked up, then worn on the character's back (an **overlay sprite with an animated flame**, so no extra character clips are needed). About 3 s of thrust, you can still steer, then a gentle 1 s ease-out into a normal fall. The generator places a safe flat platform where the flight ends. Invulnerable while burning.
- Later maybe: spring boots (a few super-jumps), propeller hat, candy magnet.
**Hazards:** none until the late zones; then only gentle, non-lethal ones (a bat that bonks you and drops a few candy, you keep bouncing). Off in the first builds; add after the core feels right. No scary game-over.

**Difficulty ladder (pure function of height `h`, in meters; flat start, long easy stretch, late ramp):**
| Zone | Height | Look (our theme bands) | New | Mix | Max gap |
|---|---|---|---|---|---|
| 1 | 0-150 | lantern rooftops | flat slabs, candy trails, first trampoline | 100% flat | 0.35 H |
| 2 | 150-400 | misty rooftops, clock tower | sliders, first rocket | 80% flat, 20% slider | 0.45 H |
| 3 | 400-800 | stormy edge / cemetery hill | crumbly | 60% flat, 20% slider, 20% crumbly | 0.5 H |
| 4 | 800-1500 | clouds | phasing (and vanishing if kept) | flat >= 40%, rest mixed | 0.55 H |
| 5 | 1500+ | moon | everything mixed, narrower slabs, optional soft hazards | flat >= 35% | 0.6 H cap (the old plan's 0.8 is far too hard) |
Rules that never change: at least one flat platform in every vertical band of one jump height (so crumbly/phasing never decide a run); trampolines about every 25-40 m in zones 1-3; candy trails in every zone.

**Generator (reachability by construction):** keep a "frontier" y. Next platform gap `dy` in `[gapMin(h), gapMax(h)]` from the table, `dx` within the horizontal reach at that `dy` (use flight time; wrap-around makes x almost free). Generate chunks of ~30 platforms ahead of the camera; recycle from a pool of ~60. Seeded RNG so runs are reproducible and a headless bot can verify there is always a path.

**Bonus collectibles (ours):** candy (1 each), occasional golden candy (5), candy trails that teach the path.

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

**Clips I need per outfit (all from one fixed camera, same distance, same framing):** jump-rise, apex/float, fall, land squash, cheer (candy/unlock), oops (falling/rescued), and a flying pose for the rocket (arms up; the rocket and flame are separate overlay sprites). Facing: film one direction; I mirror in code. Left/right asymmetry (a bag on one shoulder) will flip sides; fine unless it matters. Squash/stretch is done in code.

**Green-screen rules (user decision 2026-10-31):** the green is only the backdrop so frames key out easily. No outfit, prop or effect uses green (keep it out of costumes, candy and held items too), so the key stays simple and no blue-screen variant is needed. For clean edges: flat even lighting on the screen, no wrinkles/shadows on it, some distance from the screen so green does not spill onto the character, 1080p+ at 30-60 fps, subject fully in frame including props.

## Outfits and progression
**Collection unlocks outfits.** Candy collected over all runs (lifetime) fills a progress bar; each outfit has a lifetime-candy goal, so any run helps. Cosmetic only (each can have its own trail/landing sparkle/sound). Tuned so the first unlock arrives in the first session (about 40 candy per early run).
| # | Outfit (placeholder names; the user picks the real ones) | Lifetime candy |
|---|---|---|
| 0 | Starter outfit (the first clip) | 0 |
| 1 | Outfit 1 | 50 |
| 2 | Outfit 2 | 150 |
| 3 | Outfit 3 | 300 |
| 4 | Outfit 4 | 500 |
| 5 | Outfit 5 | 800 |
| 6 | Outfit 6 | 1,200 |
| 7 | Outfit 7 | 1,800 |
| 8 | Outfit 8 | 2,600 |
Ideas for the names (Halloween, no green): ghost in a sheet, black cat, pumpkin, skeleton, vampire, mummy, scarecrow, werewolf pup, fairy-bat. Closet screen: animated preview, locked ones as silhouettes with a "x more candy" bar, a big celebration on unlock. Save in `localStorage` (`spooky-save-v1`). Optional later: Supabase leaderboard (connector available) and a daily seeded run.

## Input
- **Tilt** (default on phones): `deviceorientation.gamma`, deadzone ~3 deg, ~25 deg = full speed, low-pass filtered; first tap on the title runs `requestPermission()` (iOS). Calibrate zero on run start.
- **Touch fallback:** hold left/right half of the screen, or drag-to-steer. A setting toggles which.
- **Keyboard:** arrows/AD.

## Performance budget (phone, 60 fps)
DPR capped at 2; antialias off (or FXAA-style only); platforms/props via `InstancedMesh` per type (a handful of draw calls); object pools only, zero allocation per frame; no shadow maps; ~100 live meshes max; fog instead of far-plane tricks; texture atlas for all props; atlas size 2048 max. Add an FPS counter behind `?dev=1`, plus a quality toggle.

## Testing plan (follows the repo's headless-Chromium habit)
1. `sim.js` runs in node: a **bot** that steers toward the nearest reachable safe platform plays 10,000 platforms on many seeds; assert it never dies from an "impossible" gap (this verifies the generator's reachability claim).
2. Playwright (software GL) screenshots at fixed seeds/heights for the before/after sheets: each biome, each platform type and power-up.
3. Hooks: `window.__doodle.{setManual, tick(dt), seed, teleport(h)}`, same pattern as city-clone.
4. Real-phone check by the user via the Vercel link after each milestone.

## Milestones
- **M0 Greybox:** scaffold, fixed-step sim, camera, wrap, generator, cubes for everything, keyboard + touch. Playable on a phone link.
- **M1 Feel:** tune the table above with the user's thumbs; add squash/stretch, tilt, score, death/restart.
- **M2 Content:** platform roster by zone, trampoline, rocket pack, candy, friendly rescue (soft hazards later).
- **M3 2.5D world:** layered parallax, biome blend, fog, lighting, particles.
- **M4 Sprites:** run the pipeline on the first clip, swap the cube for the real character (placeholder if art is late).
- **M5 Meta:** outfit closet, unlocks, save, title/game-over screens.
- **M6 Polish:** WebAudio sfx/music, haptics (`navigator.vibrate`), juice, settings, perf pass.
- **M7 Ship:** Vercel deploy, README, update this file.

## Waiting on the user
- Green-screen clips in Dropbox (folder path + which clip = which state/outfit) and art for the platform roster, candy, trampoline, rocket/flame, backgrounds (list below).
- Confirm or change: platform order (flat -> slider -> crumbly -> phasing), whether to also have a one-bounce "vanishing" platform, the friendly rescue, no hazards at first, outfit candy goals.
- Outfit list; title (**Spooky Hop** is a placeholder).

### Art needed (painted, same style as the concept; transparent PNG, or on the green screen for clips; no green in the art)
1. Character clips (above).
2. Platforms (~620 px wide at 2x, 3/4 view): flat x3 variants, slider, crumbly (+ break-apart frames or I do it in code), phasing (solid + ghost), trampoline (3 frames: rest, squashed, stretched).
3. Pickups/props: candy, golden candy, rocket pack (item, worn version, flame loop), rescue bubble/bat.
4. Backgrounds per zone: far sky (opaque, tall), far silhouettes (alpha or opaque), mid layer with lit windows (alpha), fog sheet (alpha); each extendable/tileable vertically, ~1024 px wide.
5. Foreground pieces (alpha), left and right versions, 3-4 variants: house corner with lantern, branch with ivy, rooftop edge, chimney with smoke.
6. UI later: candy icon, buttons, logo, outfit cards.
Order that unblocks me fastest: character clips -> flat platform + candy -> mid/far background -> foreground. Until then I use crops of the concept art as look-dev stand-ins only.
