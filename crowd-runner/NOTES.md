# Squad Rush (crowd-runner) notes

A clone of the "fake mobile ad" game: rows of blue soldiers auto-fire up a road, run through +/x gates,
shoot a crate barricade to unlock a minigun, and fight a zombie horde and a brute boss.
Last updated 2026-10-28 (round 2: character redo, narrow road, ad mode).
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
- Level: 5 m road, 4 gate pairs, 7 zombie waves, a pedestal on the left with a 2-crate barricade (60 HP: shoot it
  open, then walk over it with 50 coins for the minigun), brute boss (4800 HP) at the end. About 45 s a run.
- Round 2 changes: new soldier (big head, dome helmet, pouches, straps) plus a cap/olive-pack variant, separate
  rifle / shoulder rocket launcher models, zombie with open mouth, teeth, brow, torn hem, hair tuft and a second
  variant, narrower road with continuous barriers, chain-link fence, crates/barrels/tyres, river and red truss
  bridge, brass casings, camera pulled back as the block gets deeper.
- **Ad mode:** "Watch the ad" on the start screen. A 40-soldier squad takes the worst gates, ignores the crate and
  loses to the brute under an "Only 1% can beat this level!" caption, then offers "Play for real".
- Bots (`node tools/sim.mjs`): good bot wins about 85 % at boss HP 4800, which is too easy for a careful human
  and still unproven for a casual one. The bots never take the FIRE RATE gates, so those are untested.
- Known gaps vs. the mock-up: soldiers and zombies are still blockier and less detailed; no ambient occlusion /
  soft shadows; the zombie horde looks small at spawn distance; gate frames lack the glow/bloom.

## Not done / next
- Pixel review pass against the mock-ups (zombie readability at distance, soldier side silhouette, gate glow).
- Sound, more levels, coin shop, shootable gates (Mob Control style), per-soldier weapon choice.
- Not tested on a real phone yet. Frame time was only checked in software rendering.
- Licensing: nothing from `yola-zombie` ships in the game; only reference files are in `assets/source/`.
