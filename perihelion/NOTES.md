# Perihelion notes

An original one-button orbit-hopping game (portrait, phone first). Your comet circles a planet; tap (or
Space) to let go and fly straight along the tangent. Enter another planet's dashed ring to be caught.
The dark rises from below, faster the higher you get.
Last updated 2026-11-10 (first version).
Published for phone testing: https://claude.ai/artifact/3QrRa5Se5NeLWzBu8jBZE7 (republish `dist/artifact.html` to the same artifact after each change).

## Rules as built
- **Score:** +1 per new world, ×(1 + combo/3, max ×5). Combo ("SWIFT") grows when you let go before finishing
  one full orbit and resets otherwise. Skipping a world adds +2 each, landing after a wall bounce adds +2,
  each stardust +1, each new zone +5.
- **Walls** bounce the comet. Six seconds of flight without a catch, falling below the screen, or hitting
  debris ends the run.
- **Lifeline:** 10 stardust fills the meter (top left). When full it saves you once: it eats a debris hit, or
  pulls you to the nearest safe world instead of dying.
- **World types:** normal; moving (slides along a dotted track, from world 6); unstable (molten, bursts 2.6 s
  after you land and throws you off, from world 10). Debris from world 8.
- **Zones:** every 12 worlds the sky changes hue and a banner names it (six zones, then they repeat).
- Difficulty ramps to world 70: wider gaps, smaller worlds and rings, faster comet, shorter aim line.

## How it is built
- One file, `index.html`: canvas 2D, no assets, no build. Planets are drawn once each into offscreen canvases
  (`makeSprite`); sound is all WebAudio (pad drone, echo, pentatonic notes that climb with the combo).
- World y points up; `sy()` converts to the screen. Playfield is 400 units wide, 620-900 tall depending on
  the screen; wide screens get a centred column.
- Best score and mute are in localStorage (`peri.best`, `peri.mute`).
- `?bot=1` plays by itself (releases when the tangent points at the next world) and restarts after dying.
- `window.__peri.s` exposes state for tests.

## Tools
- `node tools/artifact.cjs` writes `dist/artifact.html` (the part of index.html between the ARTIFACT markers).
- `node tools/shots.cjs <outdir>` runs the bot for a minute in headless Chromium and saves screenshots.

## Ideas not built
Daily seeded run, black holes that bend the flight path, comet skins bought with stardust, a shared leaderboard.
