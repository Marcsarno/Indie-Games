# Squad Rush (crowd-runner) notes

A clone of the "fake mobile ad" game: rows of blue soldiers auto-fire up a road, run through +/x gates,
shoot a crate barricade to unlock a minigun, and fight a zombie horde and a brute boss.
Last updated 2026-10-28 (round 1: first playable).
Published for phone testing: https://claude.ai/artifact/3YgqkiwapCshU6FPcYtDFQ (republish `dist/artifact.html` to the same artifact after each change).

Read next: `RESEARCH.md` (genre research, level-design rules), `ART-SPEC.md` (read from the user's three
mock-ups in `reference/mockups/`), `ASSETS.md` (zombie/people source files copied from the user's
`yola-zombie` repo; **reference only now**, the game uses new Blender models).

## How it is built
- **Models:** `tools/blender/build_assets.py` builds every model headless with `bpy` and exports GLBs to
  `assets/models/` (soldier, zombie, brute, minigun, rocket, gate, pedestal, pine, crate, barrel, tires, barrier,
  lamp). Run: `python tools/blender/build_assets.py` (needs `pip install bpy`, Python 3.13; the pip wheel is
  ~400 MB). Colours are vertex colours; each vertex also carries `_part` (0 static, 1/2 legs, 3/4 arms) and
  `_tint` (zombie shirts take a per-instance colour). The material gets a Color Attribute node so COLOR_0
  exports; without a material glTF defaults to metallic=1 and everything renders black.
- **Game:** classic ES modules, no framework. `src/game.js` is pure logic (squad, gates, bullets, zombies,
  boss, bot), `src/view.js` renders it with three.js r170 (vendored in `lib/three/`), `src/assets.js` loads the
  GLBs and does the walk cycle in the vertex shader on instanced meshes, `src/level.js` is the level data,
  `src/main.js` is HUD, input and the loop.
- **Crowd:** one `InstancedMesh` per type; only the first 240 soldiers are drawn, the HUD shows the true count.
  Bullets carry the damage of many shots when the squad is big.
- **Open it:** `index.html` needs to be served (modules); `npm i && node tools/build.mjs` makes a single
  self-contained `dist/index.html` and `dist/artifact.html` (the content-only variant for the Artifact tool).

## Tools
- `node tools/play.cjs <outdir> good|fail|none "2,10,30"` headless Playwright run with screenshots at those
  game-seconds (`DIST=1` to test the bundle). Files are served by request interception, no local server.
- `node tools/sim.mjs 20` balance simulation, no browser.
- Playwright is at `/opt/node-tools/node_modules/playwright` in the cloud container.

## Controls
Drag anywhere to steer (arrow keys / A, D also work). Squad auto-runs and auto-fires.

## State of the game
- Level: 4 gate pairs, 7 zombie waves, one pedestal with a crate barricade (60 HP, shoot it open, then
  walk the squad over it with 50 coins), brute boss (3400 HP) at the end. About 45 s a run.
- Bots: a good bot wins about half the time, the fail bot dies at the second gate. Balance is rough, not tuned
  by a human yet.
- Rocket launcher model and the zombie variety (torn clothes, open mouths) exist only partly: models are
  built but squad loadouts are all rifles; the minigun is added on every 4th soldier after the buy.

## Not done / next
- Compare against the mock-ups side by side (soldier proportions, bigger heads, zombie faces, bridge/river
  scenery, shell casings, muzzle flash look). Run the pixel review loop the other games use.
- Scripted "fail ad" intro mode (squad takes the trap gate, loses the crate, the brute wipes them, FAIL).
- Sound, more levels, coin shop, rocket-launcher loadouts, shootable gates (Mob Control style).
- Not tested on a real phone yet. Frame time was only checked in software rendering.
- Licensing: nothing from `yola-zombie` ships in the game; only reference files are in `assets/source/`.
