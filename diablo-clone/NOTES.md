# Diablo-clone project notes

Running log of decisions, state and next steps, so work can resume in a fresh session.
Last updated: 2026-10-28 (round 9: depth, themes, combat juice).

## Goal
A 2D pixel-art, isometric, Diablo-style action RPG for mobile (portrait). The open question
driving the work so far: can the art be generated **entirely in code** (no sprite images) and
still look good? Approach: research what works, implement the top items, and show before/after
comparisons plus blind A/B tests the user judges.

## Repository
`github.com/Marcsarno/Indie-Games` (renamed from `marcsarno/indie-games`; pushes to the old
URL still redirect). Work goes straight to `main`. A stop hook requires untracked files to be
committed and pushed before ending a turn.

| Path | What |
|---|---|
| `diablo-clone/game/` | **The main game (round 6).** Playable vertical slice: rig-rendered 8-direction characters, generated dungeon, fog of war, combat, loot, inventory, save. Multi-file, no build, no image assets. Published for phone testing at https://claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g |
| `diablo-clone/prototype-simple/` | Earlier single-file prototype (hand-composed room, 2D primitive sprites). Kept as the before/after baseline |
| `diablo-clone/prototype-original/` | One-off attempt to match the original concept art (384×576, 3D-primitive characters, precomputed shadows). Looks closest to the concept but ~5 s load and 11–16 fps; characters read as smooth "toys". Not developed further |
| `diablo-clone/tools/art.cjs` | Review tooling (see below) |
| `diablo-clone/tools/bench.cjs` | Frame-time benchmark at 1× and 4× CPU throttle |
| `diablo-clone/tools/combat.cjs` | Deterministic combat recording (two swings at the spider, second kills) to PNG frames |
| `diablo-clone/tools/rig-sheet.cjs` | Contact sheet for a rig family or monster id: `node tools/rig-sheet.cjs hero|skeleton|fallen|hound|spider|<monster id> <outdir>` |
| `diablo-clone/tools/bench-game.cjs` | Game benchmark: level load, first 5 s (cold sprite cache) and warm frames, 1× and 4× CPU |
| `diablo-clone/tools/mock-compare.cjs` | User mock-up (target) beside the game sprite at the same height + directions: `node tools/mock-compare.cjs art/refs/mock-knight.png out.png "getSprite('hero', {...}, d, 'idle', 0)" 1 0 2 3` |
| `diablo-clone/game/js/skills.js` | Skills, champions, broodmother lair (eggs, lunge, telegraph) |
| `diablo-clone/tools/round8-compare.cjs` | Round 8 sheet: mock / before / after per target + plate-edge blind A/B (paths inside are session-specific; edit before reuse) |
| `diablo-clone/art/refs/` | The user's mock-ups: knight, skeleton, bone hound, torch, barrel. Art targets for silhouette and big shapes |
| `diablo-clone/tools/compare-new.cjs` | Old vs new sprites (before/after + blind A/B with base64 keys) and scene before/after → `art-review/new-game/` |
| `diablo-clone/art/RUBRIC.md` | 5-question gate + pairwise selection rules |
| `.claude/skills/pixel-sprite/SKILL.md` | Project skill for drawing/revising sprites with the review loop |
| `diablo-clone/art-review/` | Committed review images: blind A/B sheets, `before-after/` comparisons |
| `diablo-clone/art-review/blind-keys.b64.txt` | Encoded answer keys for the blind sheets. Don't decode until the user has judged |
| `reports/` + `research_notes/` | Two deep-research reports and their notes |

Run the game: open `diablo-clone/game/index.html` in a browser (or the published link above on a phone).
Game controls: left thumb anywhere on the left half = floating move stick; right half / sword button =
attack (auto-targets and walks to the nearest visible enemy); star button = holy bolt (6 mana); potion
button; bag = inventory (tap item → EQUIP/REMOVE/DROP, COLOR swaps red/blue); map = automap. Keyboard:
WASD, J/space attack, K bolt, Q potion, I inventory, M map, C team color. URL params `?shake=0`, `?fps=1`.

Run the old prototype: open `diablo-clone/prototype-simple/index.html`.
Controls: WASD/arrows or left stick to move; Space/J or right side to attack; C swaps knight
team color (red/blue). URL params: `?shade=edge` (old shader, for A/B), `?shake=0`.

## How the art engine works (prototype-simple)
- **Palette:** 51 colors, all on dark→light ramps (`PAL_RAMPS`): stone 4–12, fire 13–18, cloth/blood
  red 19–23, bone 24–27, steel 28–32, wood 33–36, blue 37–40, spider 41–43, demon flesh 44–47,
  gold 48–51. Index 1 = outline black, 2–3 = shared near-black tail. Ramps lean cool in darks,
  warm in lights. Bit 7 of a pixel index = emissive.
- **Lighting:** Diablo-style light tables `LTAB[level][index]`, 9 levels, `L_ID = 3` shows colors
  as drawn; below that each level steps ~1.8 colors down the ramp into the tail (fixed step, not
  proportional — proportional collapsed short ramps into flat purple), above it steps up ×0.4.
  Environment uses 4×4 Bayer dither between levels; each character gets one level (no dither).
  Static torch falloff is precomputed per light in world space (`bakeLightMaps`) and scaled by
  flicker; the player light is computed live per 2×2 block.
- **Scene:** floor, back walls and props baked once into world buffers (`bakeWorld`); per frame
  the window is copied and only props overlapping a character are re-drawn in depth order.
  Runtime floor writes go through `setFloor` to keep the bake in sync.
- **Sprites:** drawn from primitives into the `SB` builder. Each primitive records a normal
  (ellipse = sphere, line = cylinder, `'cyl'`, or `[nx, ny]` tilt) and a part id; `s.group()`
  merges shapes into one part. `buildForm` = quantized Lambert from an upper-left light ×
  per-material `span`, majority cleanup, cast shadow / overlap occlusion from front parts,
  1 px back rim, thresholded half-vector specular (`spec: [threshold, color]`, ≥1 px on metal),
  dark internal lines only between similar-colored overlapping parts, black exterior outline.
- **Animation/combat:** two clocks; pose clock steps at 100 ms and pauses during hitstop.
  Knight attack = `ATTACK` pose keys with hold times (100/45/45/50/110/70 ms); damage fires on
  the `hit` key. Hit: 70 ms hitstop (150 ms on kill), victim jitter, 50 ms flash, eased
  knockback. Kill: trauma² screen shake (kill only), 420 ms collapse + Bayer dissolve.
- **Caches:** sprites keyed by pose step; UI redrawn at most every 100 ms.

## How the game build works (diablo-clone/game, round 6)
Files load as classic scripts in order: `core.js` (palette, light tables, math, 3x5 font) → `rig.js`
(sprite renderer) → `actors.js` (biped skeleton, hero) → `monsters.js` (families, monster table, sprite
cache) → `items.js` → `world.js` (dungeon) → `game.js` (simulation, combat, render, save) → `ui.js`
(HUD, inventory, input, loop). `sheet.html` + `js/review.js` are review-only.
- **Rig sprites:** each pose is a list of 3D primitives (sphere, oriented ellipsoid, round cone, capped
  cylinder, oriented box) in local space (+x forward, +y the character's right, +z up; the tile grid is
  left-handed). One orthographic ray per pixel from the 30° iso camera; all 8 directions rotate the
  rig, never mirror pixels. Shading = the round-3 form shader on true normals, real cast shadows from
  shadow rays, back rim, thresholded spec, internal lines only where similar colors overlap in depth,
  black outline. Per-primitive `mf(point)` paints material details (visor slits, ribs, gold trim).
  Weapon smears are emissive triangles depth-tested against the body. ~1.7 ms per sprite (desktop).
- **Animation:** procedural. Biped joints from a gait phase + 2-bone IK; quadruped trot; spider
  tetrapod gait with high knees. Attacks are `SWINGS` pose keys with hold times and a `hit` key
  (light sword 420 ms, heavy 700 ms). Death = 6 keys that tip the rig over; the last frame is baked
  into the floor as a corpse. Walk frames advance with distance moved (no foot sliding).
- **Families vs variants (handoff roster ledger):** 4 enemy families + the hero. Variants: skeleton
  (warrior, archer, burning dead), fallen (fallen one, shaman), hound (crypt hound, bone hound), spider
  (cave spider, broodmother unique on level 3+). Count families and variants separately.
- **Equipment:** item = base (slot + visual look) + rolled affixes; stats never change the look. Looks
  are rig parts: helm none/cap/great/horned, chest tunic/chain/plate, weapon sword/axe/mace, shield
  none/buckler/kite, team red/blue. Gear changes show in game and on the inventory paper doll.
- **Sprite cache:** keyed family|look|dir|clip|frame; idle + hero walk prebuilt at level load, the rest
  built in the background (2 ms/frame) and on demand with a 2 ms budget; past the budget a missing pose
  falls back to the nearest cached frame. Death frames always build (they hide under the kill hitstop).
- **Dungeon:** seeded rooms (6–10 tiles) + MST corridors (2 wide) + 2 loops, BFS reachability check,
  props only kept if every floor tile stays reachable. A wall is tall only when no floor lies in the
  screen column it covers, otherwise it's a 14 px stub, so the hero is never hidden by walls; tall
  props in front of the hero redraw dithered. Floors: flagstones in rooms, cobbles in corridors, moss,
  baked wall-base contact shadow, banners and cracks on walls. Barrels break, chests open on contact,
  stairs in the farthest room lead to a harder floor.
- **Light + fog:** static torches/braziers summed into two world light maps (two flicker phases);
  hero and bolts are dynamic lights. Fog per tile: unseen = black, seen = dim memory, visible =
  LOS + 9.5-tile radius with a soft edge. Monsters outside vision aren't drawn.
- **Combat:** auto-target + walk-to-target on attack (phone friendly), damage on the hit key, cone
  check, hitstop 70/150 ms, flash, knockback, sparks/blood/bone chips (pooled typed-array particles),
  damage numbers, hit recovery interrupts monster attacks on big hits, block chance from shields,
  armor reduction, life steal. Monster AI: sleep → wake on sight (wakes neighbors) → chase via a BFS
  flow field toward the hero; ranged ones keep distance and shoot arrows/firebolts on their hit key.
- **Save:** versioned JSON in localStorage (`dcg-save`, v1): level, seed, hero stats, equipment, bag.
  Saved every 20 s, on stairs, on backgrounding and pagehide. Backgrounding also pauses and clears
  held input. On the published page the save lives in that phone's browser only.

## Review loop (use it for every art change)
1. `cd diablo-clone && node tools/art.cjs sheet --out <dir>` → contact sheet per character
   (4× unlit, on floor at dark/mid/bright light, 1×, silhouette) + lint table.
2. Gate with the 5 rubric questions (name frame + region for every "no").
3. Choose between passes **pairwise, in both left/right orders**; disagreement = tie = keep the
   earlier pass. Max 3 passes.
4. Shader/pipeline changes: `node tools/art.cjs ab` (edge vs form) or a hand-made blind sheet;
   the user judges. Don't trust the VLM on 1 px details; lint owns geometry.
5. Benchmark: `node tools/bench.cjs <abs path to index.html>`.
   Combat clip: `node tools/combat.cjs <abs path to index.html> <out dir>`.

## Research findings that drive decisions
Full detail: `reports/Better code generated pixel art.md` and
`reports/Code pixel art advanced techniques.md`.
- Show the judge the rendered PNG, not ASCII; pairwise judging beats absolute scores
  (Pearson 0.80 vs 0.45); swap order to cancel position bias; 2–3 passes max; longer
  aesthetic prompts made results worse. Fine-tuning/RL isn't available for Claude.
- Edge-distance shading is pillow shading; form shading from normals fixes it.
- 3–4 tones per material at ~43 px; materials differ by contrast span and highlight shape.
- Combat weight = hold durations (Slynyrd: sword 400 ms, hammer 800 ms, smears 50 ms);
  Diablo action frames hit at 50–70% of the attack.
- Diablo 1 specs: 8 directions, 16 light tables, palette color cycling, per-room wall cutaway,
  three-state fog of war; blend tables (50%/additive/multiply) at 51 colors are ~2.6 KB each.

## Results so far
| Round | Change | Outcome |
|---|---|---|
| 1 | Simple prototype + original-concept prototype in parallel | Both committed; simple one chosen for development |
| 2 | Knight redrawn from user's two generated reference sprites; red/blue team colors | Matches references closely |
| 3 | Form shading + review tools + rubric + skill | Light-direction lint up for every character (skeleton 0.09 → 0.37) |
| 4 | Material shading, combat feel, pairwise review | Combat clearly better frame by frame; shading changes subtle |
| 5 | Ramp palette + light tables + performance | Steel/bone keep their color under torchlight; 4×-throttled median frame 47.9 → 15.3 ms (p95 74 → 29 ms); desktop 10.4 → 3.7 ms |
| 6 | New game build from the handoff + all of the above (`diablo-clone/game`) | Playable loop works end to end (touch-tested on Pixel 7 emulation: move+attack together, skill, potion, equip, save/continue, death/rise, pause on background). Warm frames 3.8 ms desktop / 20.3 ms at 4× throttle (≈50 fps), p95 31 ms; level load 0.45 s / 1.6 s. First 5 s at 4×: median 26 ms while sprites build. Stills: old hand-drawn sprites read bigger and more illustrated; new ones win on motion, 8 directions and visible gear |
| 7 | User's phone test + blind A/B (old prototype vs new rig sprites). Picks: knight new (but "not great"), hound new, skeleton old ("definitely"), big spider old (new is fine as a small spider). User: plays well, gear changes on pickup were a highlight, too slow walking, size OK | Hero 3.0 → 4.2 tiles/s with a longer stride (8) and 0.26 tiles per walk frame; monsters ×1.2. Skeleton rebuilt from the old drawing's strengths (separate rib bars over a dark hollow, back spine + shoulder blades, sword raised in guard, bigger shield, ×1.1). Broodmother gets its own look (low body, 17+17 legs with high knees, red stripe + chevrons, bigger head/eyes/fangs, 128×84 canvas); cave spider unchanged. Knight: full plume, sword out to the side in guard, wider stance. Chitin highlight now bone-grey. Before/after: `art-review/round7/`. Frame time unchanged on the same machine (4× warm 11.9 → 10.4 ms; this machine is faster than round 6's) |
| 8 | User: walk speed now good; wants silhouettes closer to their 5 mock-ups (`art/refs/mock-*.png`); asked for basic sound, no attempts at realistic flesh/bone | **Sound** (`js/sound.js`): Web Audio synthesis, no files; thump/whoosh/ping recipes for swing, hit, kill, hurt, block, gold, pickup, potion, chest, barrel, bolt, arrow, firebolt, level up, stairs, death, UI tap, faint torch crackle near visible fires; mute button (top bar) and N key; levels checked offline (peaks 0.24–0.45). **Art** (3 passes each, `tools/mock-compare.cjs` side by side with the mock): knight plate = new PLATE material (darker mids + edge light), great helm with crest ridge and a barred visor tipped toward the light, big pauldrons with rivets, poleyns, faulds and tassets, no plume/gold on plate; skeleton warrior = armored (red cowl scarf, rust pauldron/bracers/greaves, belt + buckle, red loincloth, long rusted blade held low, heater shield with a skull), skull face moved up so sockets read from the 30° camera; hound = bone hound (grey hide, bone ribs + spine spikes, 1.3× skull head with forward-curving horns, jaw + teeth, red scarf, studded collar, bone claws, compact body); hell hound = red variant; torch = iron sconce with gold-riveted plate, arm and caged cup glowing between bars, bigger flame with embers; barrel = staves with seams, 3 hoops with rivets, bulge, planked lid. Shader change: edge light (lit-side rims of PLATE parts) → blind A/B: user preferred plain in rows 1–2, row 3 near-identical, and correctly picked out all three edge-lit versions as "white lines that don't look good". Edge light turned off (code kept behind the material's `edge` flag). Frame time: warm unchanged (4× 11.2 ms); first 5 s at 4× 16.7 → 19.8 ms (more primitives per sprite) |
| 9 | User: this build's physical feel (body, knockback, weight) beats a ChatGPT build from the same research; keeps playing past testing. Asked about Godot: advised staying in the browser engine (custom palette/light-table look and feel would have to be rebuilt; no speed problem). Then stages A+B+C | **A** (`js/skills.js`): 4 skills on an arc of buttons, unlocked at hero level 1/2/3/4 (holy bolt; shield bash = dash + 10-tile knockback + 1.4 s stun; whirlwind = 0.8 s spin hitting everything in reach 4×; war cry = 8 s +40% dmg +50% armor, staggers nearby), cooldown dither on buttons, keys 1–4. Broodmother lair every 3rd floor: stairs room, 5 egg sacs hatching spiders while she lives, telegraphed lunge with a red warning line, health bar, stairs sealed until she dies, rich loot. Champions (BERSERK/STONE/PLAGUED/SHADOW): stat multipliers, palette-tinted sprites (tint of the cached base sprite), name label (two nearest), 3× xp, extra loot. 8 new gear looks + icons: barbute, crowned helm, brigandine, dark plate, flail, greatsword, round shield, tower shield. Magic/rare drops cast a light beam. **B**: themes rotate every 2 floors (crypt → caves → hell) via `THEMES` + `ST()` tone mapping: cave rock walls/dirt floor/stalagmites/glowing fungus; hell stone, lava cracks in flagstone joints, lava pools, runes, horned statues, bone piles; crypt coffins, statues, candle tables. New ramps: CAVE, FUNGUS, HELL, LAVA (lava palette-cycled via `CYCLE`). **C**: 12% crits (2× dmg, longer hitstop, big gold number, extra sparks, crit sound); skeletons shatter into bone chunks + a bone pile decal; spiders bleed green; kill streaks (≥3 kills within 2.5 s: banner KILL STREAK/RAMPAGE/MASSACRE, chime, +10% xp per step, 3% heal). Fixes: flames now depth-sorted with characters; floor item labels stack; level messages reset per floor. Frame time 4× warm 12.8–13.1 ms; first 5 s 21.9 ms (more families/variants to build). Shots: `art-review/round9/` |
| 10 | User: disliked the long sickle swing crescents; hero "looks like a fat guy", "just as fat with armor as without", "his whole body is just shadow" | Swing trail `SMEAR_MODE='subtle'` in `actors.js` (short thin dithered steel streak; 'full'/'none' kept). **Hero body**: lean base body, armor adds bulk by tier (`bulk` = 0 tunic / .55 chain / .75 brigandine / 1 plate) on legs, pelvis, belt, arms, torso; torso split into abdomen + chest for a waist; bare neck, tunic V-neck, skin forearms + hands, hair, short beard, smaller head. **Shading**: `SOFT_SHADE` in `rig.js` (shadow-side falloff ×0.35, cast shadow −1 step instead of clamp to darkest); CHAIN/LEATHER mid 1→2, PLATE/DSTEEL mid 2→3 so armor isn't near-black. Before/after `art-review/round10/hero-body-before-after.png` (left before, right after; tunic, chain, plate, brigandine × 5 directions). Blind A/B of soft vs hard shading `round10/shading-blind.png` (key in `shading-key.b64.txt`, don't decode until the user answers). Frame time unchanged (4× warm 13.0 ms) |
| 11 | User asked for an animation polish pass on walking and attacks; chose walk first | **Walk** (`actors.js` `gaitFoot`, `bipedJoints`): found the arms swinging with the same-side leg (a pacing gait) on hero, skeleton and fallen; now opposite, with shoulders counter-turning the hips. Planted foot now slides back at exactly the body's speed: walk frames advance per `gaitFrameTiles(B)` = 2·stride/duty/8 tiles (hero 0.233, was 0.26 with a cos foot path that slid ~7.5 units per step). Per-body gait params `duty`, `bob`, `sway`, `runLean`, `counter`: hero jogs (duty 0.38: flight phase, dip at mid-stance, heel kick, lean 0.2), skeleton walks (0.55, vaults over the planted leg), fallen scurries (0.42). Hips sway over the planted foot and turn with the legs. Sword arm swings a little; a free off hand pumps, a shield rocks. New 1-frame hero clips `go` (0.08 s push-off on starting) and `stop` (0.11 s planted stop after a run ≥ 0.25 s); prewarmed. Hounds/spiders unchanged. Comparison page https://claude.ai/artifact/CWEuhANoypjpDmiFEifuer (GIFs also in `art-review/round11/`). Tests pass; 4× warm 13.0 → 13.8 ms (noise range), first 5 s 22.3 → 23.2 ms |
| 12 | User: walk "improved a ton"; go ahead with attacks | Found the attack shoulder twist inverted (right shoulder forward on the wind-up = the "hug"); fixed for hero and skeleton. `SWINGS` keys now pose the body (`K(a, ms, {ck, r, tw, ln, bob, fl, fr, mv})`: blade cock past the arm, hand reach, shoulder turn, lean, hip drop, front/back foot, lunge tiles) and each list has a plane `tilt`. Sword: diagonal forehand with a step in; `light2` rising backhand. Heavy weapons: overhead chop (tilt 0.22) rising onto the toes, crouching and holding on contact, two hands when no shield (`twoHand`); `heavy2` backhand. Combo: a swing started < 0.3 s after the last alternates (`hero.combo`, clip `attack2`, `FAMILIES.hero.swing2`); timing and damage unchanged. Off arm counterbalances. Lunge `lungeHero`: tryMove, skipped if an enemy is within 0.9 tiles in front. Bench old vs new back to back: same within noise (4× warm 14.2–14.5 vs 13.5–15.2 ms). Comparison page (same link as round 11) and `art-review/round12/` |

## Waiting on the user
- **Round 12 attacks**: play them on the phone; is the lunge too much or too little; should the combo cut the recovery short (faster chains = more damage, a balance change)?
- **Round 10 blind A/B** `art-review/round10/shading-blind.png`: A, B or can't tell per row (tunic, chain, plate, skeleton). If the user prefers hard shading, set `SOFT_SHADE=false` (body changes stay). Also: is the subtle swing streak OK, or 'none'?
- **Play round 9 on the phone** (same link): skills and their button layout, the floor-3 broodmother
  fight, champions, the three themes (caves floors 3–4, hell 5–6), crits/streaks. Are the sounds OK?
- Real-device frame time is still unmeasured.
- **Blind A/B picks** (A or B per character: knight, skeleton, hound, spider) for
  `art-review/ab-blind-1.png` and `art-review/before-after/shading-blind.png`.
- Whether the new combat feels better in `art-review/before-after/combat.gif`.
- Whether the new palette/lighting look is preferred (`before-after/palette-*.png`).
- Trying the game on a real phone (offered to publish it as a page). Throttled desktop is
  only a stand-in.

## Next steps for the game build
0. Ideas after round 9: skill tree/points, a town or stash between floors, more boss types per theme, sprite cache persistence (IndexedDB) to cut first-seconds build cost, item comparison arrows in the bag.
1. Act on the user's phone test (controls, layout, frame time on the real device).
2. Monster walk-frame cost: cache sprites across sessions (IndexedDB) or bake at a lower canvas size;
   death frames could prebuild per family at load.
3. More hero skills and a class choice; boss room for the broodmother; town/stash later.
4. Art pass with the review loop on the new families (hound front view is narrow; spider legs thin on
   dark floors); hand-placed details per family where the rig reads generic.
5. Palette cycling for fire/water, blend tables for glow (from the list below).

## Next steps from the second report's action plan
1. **Blend tables** (50%, additive, multiply) built at boot; use for fire glow, sparks, smoke,
   magic. No `globalAlpha`. Pool particles in typed arrays (they still use push/splice).
2. **Palette color cycling** for fire, lava, water with coprime ramp lengths.
3. **Wall cutaway** per room (upper wall blended, base opaque) and **three-state fog of war**.
4. Floor variation: hash-seeded variants, cracks, moss, baked wall-base occlusion.
5. Lint additions: spec on outline, no spec on shiny part, frame-toggle flicker.
6. Later: 8 directions from a rig (mirror the rig, not pixels), layered equipment, a Node
   fitter that tunes rest-pose parameters to a concept reference.

## User preferences observed
- Dislikes added bright edge lines on armor (round 8 blind A/B); prefers plain form shading.
- Dislikes long sickle-shaped swing crescents (round 9). Wants a lean hero whose armor visibly adds bulk, and bodies that aren't mostly shadow (round 10).
- Wants research-backed improvements, then a test with before/after comparisons.
- Supplies AI-generated reference sprites; liked matching them in code.
- Prefers short status updates while long work runs; commits pushed to `main`.
