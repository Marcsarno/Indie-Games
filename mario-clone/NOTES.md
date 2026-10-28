# Mario clone notes

Goal: a faithful NES-style recreation of World 1-1 (256x240, 16x16 tiles, 60 Hz). Classic scripts, no build,
no image assets: open `mario-clone/index.html`. Last updated 2026-10-28 (round 1).

## Files
| File | What |
|---|---|
| `js/art.js` | Palette, pixel-string sprites (Mario small/big/fire + star palettes, goomba, koopa, items, coins, fireballs), tiles, pipes, castle, flag, hills/bushes/clouds, 5x7 bitmap font |
| `js/level.js` | World 1-1 layout (tile coords) + underground coin room |
| `js/game.js` | Physics, enemies, items, blocks, pipe warp, flagpole/castle/time-bonus/fireworks, HUD, screens, input (keyboard + touch pad) |
| `js/sound.js` | Web Audio chip-style effects (no music) |
| `tools/play.cjs`, `tools/scenarios.cjs` | Headless Playwright driver that steps the game frame by frame: `node tools/play.cjs <outdir> basic|features|flag` |

## Controls
Arrows/WASD move, Z/J = B (run, fireball), X/K/Space = A (jump), Down on the 4th pipe = warp, Enter/P = start/pause, M = mute. Touch pad appears on touch devices.

## Fidelity
- Physics use the original's per-frame values: walk 1.5 / run 2.5 px/f, accel 0x98/0xe4, friction 0xd0, jump speed bands by |speed| (-4 / -5 px/f), hold/fall gravity per band, max fall 4, 24 frames per timer tick, stomp chain 100..8000 then 1UP, shell chain 500..8000, flag score zones, 1/3/6 fireworks by time digit.
- Power-ups: mushroom/flower block flips by size, star, 1UP, hidden block, multi-coin brick, brick breaking only when big.
- Layout, art and constants are from memory, not ripped data, so positions/pixels are close but not guaranteed identical.

## Not done / next
- No music (the theme is a copyrighted composition; only SFX stand-ins). Add only if the user supplies their own.
- Only World 1-1. Next: 1-2 (underground), warp zone, 1-3/1-4 (castle, Bowser, axe), piranha plants, hammer bros later worlds.
- Not yet checked on a real phone; touch pad layout untested beyond emulation.
- Sprite pass with side-by-side reference against the user's own screenshots would tighten the art (big Mario legs, koopa).
- Not published as an artifact yet.
