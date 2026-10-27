# Diablo-clone project notes

Running log of decisions, state and next steps, so work can resume in a fresh session.
Last updated: 2026-10-27.

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
| `diablo-clone/prototype-simple/` | **The main prototype.** 270×480, playable, all art in code. `index.html` is the whole game |
| `diablo-clone/prototype-original/` | One-off attempt to match the original concept art (384×576, 3D-primitive characters, precomputed shadows). Looks closest to the concept but ~5 s load and 11–16 fps; characters read as smooth "toys". Not developed further |
| `diablo-clone/tools/art.cjs` | Review tooling (see below) |
| `diablo-clone/tools/bench.cjs` | Frame-time benchmark at 1× and 4× CPU throttle |
| `diablo-clone/tools/combat.cjs` | Deterministic combat recording (two swings at the spider, second kills) to PNG frames |
| `diablo-clone/art/RUBRIC.md` | 5-question gate + pairwise selection rules |
| `.claude/skills/pixel-sprite/SKILL.md` | Project skill for drawing/revising sprites with the review loop |
| `diablo-clone/art-review/` | Committed review images: blind A/B sheets, `before-after/` comparisons |
| `diablo-clone/art-review/blind-keys.b64.txt` | Encoded answer keys for the blind sheets. Don't decode until the user has judged |
| `reports/` + `research_notes/` | Two deep-research reports and their notes |

Run the game: open `diablo-clone/prototype-simple/index.html` in a browser.
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

## Waiting on the user
- **Blind A/B picks** (A or B per character: knight, skeleton, hound, spider) for
  `art-review/ab-blind-1.png` and `art-review/before-after/shading-blind.png`.
- Whether the new combat feels better in `art-review/before-after/combat.gif`.
- Whether the new palette/lighting look is preferred (`before-after/palette-*.png`).
- Trying the game on a real phone (offered to publish it as a page). Throttled desktop is
  only a stand-in.

## Next steps (from the second report's action plan)
1. **Blend tables** (50%, additive, multiply) built at boot; use for fire glow, sparks, smoke,
   magic. No `globalAlpha`. Pool particles in typed arrays (they still use push/splice).
2. **Palette color cycling** for fire, lava, water with coprime ramp lengths.
3. **Wall cutaway** per room (upper wall blended, base opaque) and **three-state fog of war**.
4. Floor variation: hash-seeded variants, cracks, moss, baked wall-base occlusion.
5. Lint additions: spec on outline, no spec on shiny part, frame-toggle flicker.
6. Later: 8 directions from a rig (mirror the rig, not pixels), layered equipment, a Node
   fitter that tunes rest-pose parameters to a concept reference.

## User preferences observed
- Wants research-backed improvements, then a test with before/after comparisons.
- Supplies AI-generated reference sprites; liked matching them in code.
- Prefers short status updates while long work runs; commits pushed to `main`.
