# City game: handoff from the Diablo project

A new project: a top-down open-city crime game in the spirit of GTA: Chinatown Wars, for portrait
phones in the browser, with all art drawn in code. It reuses what the Diablo build (`diablo-clone/`)
worked out. Nothing is built yet.

## What the user asked
- "A GTA Chinatown Wars type clone... top down... could the tools translate?" Then: separate it
  into its own chat that still uses the same art/pixel tools.
- Chinatown Wars itself is low-poly 3D with cel shading and a tilted top-down camera, not pixel art.
  What was proposed: a **pixel-art take** (closer to GTA 1/2 with Chinatown Wars' camera and
  attitude), built on our rig renderer. If the user wants the real cel-shaded 3D look instead, a 3D
  engine (Three.js or Godot) is the better tool. **Confirm which look they want first.**

## How this user works (from the Diablo sessions)
- **Plan first.** "Before you begin, tell me your plan. Don't just start." Present the plan and
  wait for a go-ahead on big work.
- Show changes as before/after comparisons (animated where it's motion). Shader changes get a
  blind A/B; don't look at the key before the user answers.
- Share the game as an Artifact page for phone testing; republish to the same link after changes.
- Sound: basic synthesized effects only. "Don't try to get overly creative and then something ends
  up sounding dumb."
- Loves: physical feel (body, weight, knockback, hitstop), gear that visibly changes on pickup.
  Dislikes: bright white edge lines on armor, long sickle-shaped swing trails.
- Commit and push to `main`. Short status updates while long work runs.

## What to reuse (copy into `city-clone/`, don't edit the Diablo files)
Copying instead of loading `../diablo-clone/game/js/*` keeps changes here from breaking the
Diablo game.
- `diablo-clone/game/js/rig.js`: renders 3D primitives (sphere, ellipsoid, round cone, box,
  cylinder) into pixel sprites with quantized ramp shading, outlines, cast shadows, `SOFT_SHADE`.
  Cars are boxes and rounded shapes, the easiest thing it draws. Cars need ~32 rotations, not 8.
- `diablo-clone/game/js/core.js`: indexed palette with ramps, light tables (LTAB), Bayer dither,
  palette cycling, vector helpers, IK, 3x5 font.
- `diablo-clone/game/js/actors.js`: biped skeleton, gait with planted feet (`gaitFoot`,
  `gaitFrameTiles`), start/stop poses, posed attack keys (`SWINGS`, combo, lunge), hero rig with
  layered clothes. People in the city reuse this.
- `diablo-clone/game/js/sound.js`: Web Audio recipe synth + mute.
- `diablo-clone/game/js/game.js` / `ui.js`: sprite cache with per-frame build budget and
  background warm-up, light maps, hitstop/shake/knockback, touch stick + buttons, save, pause.
- Review tooling: `.claude/skills/pixel-sprite/`, `diablo-clone/art/RUBRIC.md`,
  `diablo-clone/tools/` (rig-sheet, bench-game). Animated before/after GIFs were made with
  Playwright captures of the real game (camera-follow) plus PIL.
- Read `diablo-clone/NOTES.md` for how the engine works, research findings and performance numbers.

## New work this game needs
- Driving: grip, drift, crashes, entering/leaving cars. This decides whether it's fun.
- Buildings: tall buildings must read tall from top-down. Option: stacked 3D blocks whose walls
  lean with the camera (GTA 2 style), or baked layers.
- A large city streamed in chunks; traffic and pedestrians on road graphs; police.
- Speed: cars cross the screen fast, so their rotations are prebuilt, not built on demand.

## Suggested first step (to propose, not to start)
A small prototype: one city block with a few tall buildings, one drivable car with crash physics,
and the hero getting out to walk and fight, in `city-clone/game/`, published as its own Artifact.
