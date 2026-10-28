# Round 3 plan: make it play like the ad game

Written 2026-10-28 from the user's playtest of round 2. Nothing here is built yet.

## What the playtest said
1. The squad should stay put at the bottom of the screen. Zombies, gates and pickups come down the lane at it;
   the player only slides left and right. Right now it feels like the squad is running forward.
2. There is not enough room to move sideways. The avatars are too big for the road, and once the squad
   grows there is no room to steer at all, so you cannot choose a gate or a power-up.
3. It needs sound effects.
4. It needs more visual polish.

## Diagnosis
- **Why you cannot steer with a big squad:** `formation()` in `src/game.js` makes the block wider as the count
  grows (up to 9 columns), and `Game.update` clamps `targetX` to `ROAD_HALF - halfWidth`. With a 5 m road and
  0.8 m spacing, a squad of about 15 is already as wide as the road, so the allowed range shrinks to zero.
  The squad's visual size, hit size and steering range are all tied to the soldier count. That is the bug.
- **Why it feels like running:** soldiers play a run cycle, the scroll speed is 7.2 m/s, and the camera follows
  the squad down the road.
- **Avatar size:** characters are drawn at 1.3x their 1 m model on a 5 m road, so about six fit across.

## The core change: separate "how many" from "how big"
The squad gets a fixed footprint. The count is a number, not a width.
- **Footprint:** a compact blob about 2.2 m wide and 1.6 m deep, always. At most 24 soldiers are drawn in it
  (packed tight, a few rows deep). More soldiers than that do not add width or depth.
- **Count badge:** a floating number above the blob (the ad look), plus the HUD pill. It pops when the count
  changes and shows red damage numbers when zombies bite.
- **What more soldiers means in play:** more firepower and more HP, as before. Each bite still costs one
  soldier. Big squads read as "more guns" through muzzle flashes and tracer density, not as a wider block.
- **Steering range:** `ROAD_HALF - footprintHalfWidth`, now a constant, so it is the same at 3 soldiers and
  at 999.

## Layout and scale (defaults; one place to tune: `src/level.js`)
| Thing | Round 2 | Round 3 |
|---|---|---|
| Road width | 5 m | 9 m |
| Avatar draw scale | 1.3x | 0.85x (about 35% smaller) |
| Gate width (each of two) | 2.5 m | 4.2 m, centres at plus/minus 2.3 m |
| Squad footprint | grows to road width | fixed, about 2.2 m wide |
| Free travel each side at any count | 0 to 1 m | about 3.3 m, enough to centre on either gate |
| Scroll speed | 7.2 m/s | 4.0 m/s, so a gate is on screen for about 6 s before you reach it |
| Zombie speed | 1.9 to 2.8 m/s | 1.6 to 2.4 m/s |
| Squad animation | run cycle | stand and shoot: idle bob, recoil per volley, a lean when strafing |

Soldiers face away from the camera and never run. The world scrolls slowly past them, which is what the
camera following already gives us, so this is a change of animation, speed and scale, not a rewrite of the
game logic.

## Steering that feels like aiming
- **Input:** relative drag with a gain, so a thumb drag across about 70% of the screen width covers the whole
  lane range. Add critical damping (about 80 ms) so it is snappy without jitter. Arrow keys and A/D keep working.
- **Choosing a gate:** the gate under the squad's centre line is the one you get. Every gate that is within
  about 14 m shows its state: the one you are lined up with brightens and gets a floating preview of the
  result ("13 to 23"), the other dims. The squad has a thin lane marker on the road so you can see where
  "centre" is.
- **Power-ups and pickups:** they come down a lane like gates, so you slide to meet them. The crate barricade
  shows its HP and your tracers visibly chew it; the pedestal shows its price. A pickup is collected when the
  footprint overlaps it, and a missed one says so ("MISSED") instead of silently passing.
- **Tests this must pass (automated):** for squad sizes 3, 25, 200, 999 the squad can reach both gate centres
  and the pedestal lane; a simulated drag from left to right edge moves the squad edge to edge; the bot picks
  a chosen side 100% of the time.

## Sound (new `src/sound.js`, Web Audio synthesis, no files)
Same approach as `mario-clone/js/sound.js`. Starts on the first tap (browser rule), master gain, a compressor
so large volleys do not clip, a mute button under the HUD that remembers its setting.
| Event | Sound |
|---|---|
| Volley | short filtered noise crack, pitch and volume vary, rate-limited to one per 70 ms and scaled by the count; a deeper thump once the minigun is bought |
| Zombie hit / death | wet pop, pitched down for the brute |
| Soldier bitten | low thud plus a short grunt blip |
| Gate: good / bad / fire rate | rising two-note chime / falling buzz / ratchet click |
| Crate hit / crash | wood knock / splintering burst |
| Coin gain | tick, climbing pitch while kills chain |
| Pedestal unlock | three-note jingle and a mechanical clack |
| Brute appears / attacks | low roar (detuned saws), stomp on each step |
| Win / fail | short fanfare / descending sting |
| Menu | click |
Music is optional (a small looping beat). Default is off until you say you want it. A test mode logs every
sound call so the event-to-sound mapping can be checked headless; the actual sound quality needs your ears.

## Visual polish, in order of payoff
1. **Readability:** smaller avatars and a retuned camera so you can see the zombies coming and the lane ahead.
2. **Gates:** a glow halo behind the frame, a faint moving shine in the glass, a pulse on the one you are
   lined up with, a burst and number pop when you pass through.
3. **Combat feel:** recoil per volley, a brief shove on zombie hit, deaths that pop and leave a splat on the road
   that fades, bite damage numbers, a small camera shake on bites and brute steps, a coin that flies to the
   counter.
4. **Brute fight:** name and HP number on the boss bar, a warning banner when it spawns, ground shake, a
   telegraphed swipe so the player sees damage coming.
5. **Scene:** warmer sun with stronger contrast, a few cloud sprites, nicer building colours, slightly denser
   props near the road, a vignette.
6. **HUD and screens:** the count badge above the squad, wave warning arrow ("ZOMBIES!"), minigun unlock
   banner, a cleaner start screen, and a clearer ad-mode caption.

## Build order
1. **Feel pass (first, because it is the real problem):** fixed footprint and 24-soldier draw cap, count badge,
   9 m road, scale, scroll speed, idle animation, new input, gate preview, pickups as lane objects, bots and the
   reachability tests. Publish so you can try it before anything else is added.
2. **Sound pass.** Publish.
3. **Visual polish pass.** Publish.
4. **Balance and notes:** retune boss HP and wave sizes for the new combat model, update the simulation, then
   `NOTES.md`.
Each step is committed and pushed to `main` and republished to the same artifact link.

## Defaults I will use unless told otherwise
- At most 24 soldiers drawn, count shown as a badge.
- Constant slow scroll (4 m/s); the world never stops for a wave.
- Sound effects on, music off.
- Strafing makes the soldiers lean and shuffle, with no running.

## Risks
- With only 24 soldiers drawn, a count of 400 does not look like 400. The badge and the tracer density have to
  carry it. If it still feels small, the fallback is a fixed footprint that gets denser, not wider.
- A 9 m road plus smaller avatars makes everything farther away on a phone. Camera height and zoom need a pass on
  real devices, which I cannot do from here.
- Synthesized sound can sound cheap. Expect one round of changes after you listen.
