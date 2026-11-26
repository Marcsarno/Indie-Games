# Gobble Gobble Kitchen notes

Last updated 2026-11-26 (round 1: Phase 1 slice). **Start here.** `PLAN.md` is the user's full design plan; this file says what is built, how to build it, and where it differs.

Phone / tablet link (private Claude artifact): **https://claude.ai/artifact/1cuiWA9tnyBS51PnHXkU9i**. Republish `dist-single/artifact.html` to the same artifact after every change (`npm run build:single`, then the Artifact tool with that path, or `url` from another session).

## What is playable
The Big Feast with two dishes, start to finish, about 3-4 minutes:
- **Title** (logo, Play, the "No ads / purchases / links / data" line). Audio unlocks on the Play tap.
- **Overview** of the toy kitchen and dining room. Bobbing arrows mark the dishes; tap one and the camera flies in (0.6 s).
- **Mashed Potatoes:** peel (8 strips, the potato flips after 4; swipe also works) -> hops into the bowl as chunks -> mash (7 taps, shape key chunks to mound; up-down drag also works) -> butter (tap, or drag with a magnetic drop) -> stir (5 taps or circle-drag; butter melts into a pool, colour warms).
- **Cranberry Sauce:** open the can (3 cranks or circle-drag; lid pings off) -> the can flips over the dish, 3 taps and the log SCHLORPs out -> wobble (jelly lean in the shader + squash spring). After 3 wobbles a service bell pops in; ringing it sends the dish. Ten wobbles = jelly rain (secret).
- **Dish done:** freeze-frame, sparkle, the dish flies through the arch to the table, doorbell, the door opens, a guest hops in, sits, gets a plate and reacts. Light moves morning -> golden hour.
- **Dinner** (after both dishes): candles, candlelight, Gobbles hops to his booster seat in a pilgrim hat. Tap each guest (and Gobbles) to serve; scoops arc to the plates. Then cheer, confetti, feast photo (polaroid), and a "cook again" button that rebuilds the session.
- **Gobbles:** eyes follow the finger, blinks, tail fan as mood meter, flinch / cheer / yum / sneeze / oven panic with a disguise (pumpkin helmet, mustache, leaf crown). Tapping him replays the instruction.
- **Hints:** narrator line + demo wing at every step; idle escalation at 5 s (target bobs), 10 s (voice again), 15 s (wing again), then the cycle repeats.
- **Pointless delights:** hanging pots (notes; left-middle-right plays a tune = secret), faucet bubbles, oven door (Gobbles panics into a disguise = sticker per disguise), fridge (cold puff), window (leaves / rain / snow), cat (meow; third tap purrs = secret), cookie jar, clock on real time, cat tail, drifting cloud, pot steam. A tap on nothing still puffs and "tok"s.
- **Sticker book** (6 stickers, silhouettes until found, saved on the device), **parent area** behind a 3-second hold (music / voice / effects volume, quiet mode, narrator voice choice of three, back to start).
- **Portrait phones:** the whole game is turned 90 degrees so it is always landscape.

## How to build
```
bash scripts/setup-blender.sh        # Blender 4.2.23 LTS -> /usr/local/bin/blender42 (every fresh cloud session)
npm install
bash scripts/build-assets.sh         # blender -> build/raw/*.glb + preview PNGs -> meshopt -> src/assets/models/*.glb
                                     #   --only potato,kitchen   --no-preview (much faster)
npm run dev                          # Vite dev server on :5183
npm run build                        # dist/ (hashed files, for real hosting)
npm run build:single                 # dist-single/index.html (everything inlined) + artifact.html (for the Artifact host)
(cd tools/voice && npm i && node build-voice.mjs)   # narrator MP3s from tools/voice/lines.json (Kokoro via kokoro-js)
```
Headless test with screenshots: `npx vite preview --port 4173 &` then `node tools/play.mjs .work/out --script feast|potato|cranberry|delights|idle|overview [--size 1024x768]`. It taps real pointer events at the projected position of `hit_*` targets and waits in game time. `node scripts/inspect.mjs <glb>` lists nodes, extras and attributes.

## How it is put together
- `blender/lib/` `palette.py` (the one palette, mirrored to `src/game/palette.json` by build_all), `shapes.py` (rounded box, lathe, tube, prism, ball... returning a small wrapper `S` with `.at/.rot/.scale/.paint/.shade/.shade_face/.bone/.zone`), `common.py` (`make`, `empty`, `hit`, own BVH ray-cast **AO bake into vertex colours** toward a plum tint, face-area weighted custom normals, rigs, export, Cycles CPU preview).
- `blender/assets/` `kitchen.py` (room, furniture, delights, sockets, camera empties), `potato.py`, `cranberry.py`, `props.py` (bell, plate, candle, arrow, serving blob), `gobbles.py` (12-bone rigid-skinned turkey, hats, demo wing), `guest.py` (5-bone peg person with tint zones, hair and hats).
- `scripts/optimize.mjs`: dedup -> prune (keep leaves/extras/attributes) -> weld -> meshopt. Before quantizing it moves every mesh onto a child node `<name>__geo`, so the node the game animates keeps its authored transform. Game code finds the mesh with `meshOf(node)`.
- `src/core/` `tween.ts` (game clock with freeze-frame, tweens as promises, springs), `stage.ts` (renderer, camera poses fitted to the screen, squash/pop spring manager, blob shadows, day-phase lighting, snapshot, pixel-ratio step-down), `input.ts` (tap acts on pointer-down, 12 px slop, 110 ms holdover filter, optional drags, multi-pointer), `assets.ts`, `audio.ts`.
- `src/fx/` `toon.ts` (toon ramp + rim, Lambert, glow, outline shells, jelly wobble chunk), `particles.ts` (one InstancedMesh per type, real-time), `motion.ts` (arc flights, no physics engine).
- `src/game/` `game.ts` (flow), `kitchen.ts` (delights and idle life), `gobbles.ts`, `guests.ts`, `hints.ts`, `station.ts` + `stations/potato.ts`, `stations/cranberry.ts` (a recipe is a plain async function; each step is `await this.step({voice, target, demo, tap, drag})`).
- `src/ui/hud.ts` + `style.css` (title, home / book / again buttons, sticker book, photo, parent gate).

Blender names drive the code: `hit_*` tap targets (1.5x oversized, invisible), `socket_*`, `cam_<name>` + `cam_<name>_target` with `fit_w`/`fit_h` custom properties (metres to keep in view), custom properties `shade` (toon / lambert / glow) and `outline`.

## Numbers (headless, 844x390)
Draw calls 40-85, triangles 95-130k on screen (kitchen 60k), models 914 KB after meshopt, JS 731 KB (203 KB gzip), narrator MP3s 705 KB for three voices (35 lines each, 21 used so far), single-file build 2.9 MB (1.4 MB gzip). Frame rate on real devices is **not measured yet** (headless is software rendering).

## Audio state (measured, not heard)
- Every effect was rendered offline (`.work/audio-probe.mjs` pattern: swap the context for an OfflineAudioContext, call the sound, read the buffer): all make sound, none clip (peaks 0.13-0.5), no errors. Narrator clips peak about 0.6-0.75; music sits roughly 16 dB under the voice and ducks while the narrator talks.
- Narrator: 3 voices x 35 lines, MP3 24 kHz mono 48 kbps, 705 KB in all (`tools/voice/`, `manifest.json` has text and durations). A speech-recognition pass (`verify-asr.mjs`, Whisper) matched the two American voices. **`bf_emma` (British) may add a small extra sound at the end of about a third of her lines** ("Tap the canner"); it is only offered in the parent area, and should be listened to before keeping her.
- "Mmm, so fluffy!" is spoken as **"Yum, so fluffy!"** (`tools/voice/pronounce.json`): Kokoro reads "Mmm" as the letters M-M-M.
- Audio starts on the Play button's `click` (on touch screens only the end of a tap counts as the gesture iOS needs); any finished tap resumes it after the browser suspends it. Not yet tried on a real iPhone or iPad.

## Where the build differs from the plan (on purpose)
- **Layout:** kitchen and dining room sit side by side with an arch between them (the set then fills a landscape phone). The table is visible in the overview, but **not in the station close-ups**; the camera follows the finished dish to the table instead.
- **Outlines** are shells that share the mesh's geometry and are pushed out in the vertex shader (same draw cost as baked hulls, no extra download, and they follow shape keys, skinning and the jelly wobble).
- **Characters** are skinned but animated in code with springs (no NLA clips, no AnimationMixer), so they react to the finger at once.
- **Sound effects** are a small hand-written WebAudio synth instead of ZzFX; **no recorded foley** (kenney.nl is blocked from the cloud container); **music** is a quiet generated pentatonic loop, not a recorded acoustic track. None of this has been listened to by a person yet.
- **Assets** live in `src/assets/` (imported, so the single-file build can inline them), not `public/`.
- Cranberry needs a way to end an open-ended toy step, so a **service bell** appears after 3 wobbles.
- AO is a custom ray-cast bake (BVH) rather than Cycles; previews are Cycles on CPU.

## Not built yet (from the plan)
Pie, Set the Table, Pumpkin Roast, later dishes; Guest Book (guests are the fixed "Friends and Pets" default: grandma, cousin, grandpa, auntie, friend; only two arrive with two dishes); "Me" avatars; sibling co-op and the helper strip; Chef Challenge; Kitchen Play sandbox; Pip the acorn; the dog; scrapbook storage (the photo is shown, not saved); kitchen themes; the other 5 disguises; most of the 20 discoverables; real foley; silly breaks every 4-5 actions; Ew / Gasp reactions in play.

## Waiting on the user
1. **Play it with the kids** (the Phase 1 gate): watch the first 3 minutes without helping; note hesitations, laughs, calls for a parent. Does mashing get a giggle?
2. **Listen:** nobody has heard the audio. Narrator voice (three to choose from in the parent area: Heart, Bella, Emma), effects, babble, music loop.
3. Open decisions from the plan: mascot twist (built as Gobbles + pumpkin roast), first playtest device, narrator voice.
4. Hosting: the artifact link is fine for testing; a Vercel project (like city-clone) would give a full-screen URL. Not set up.

## Next steps (suggested)
Fix whatever the playtest shows first. Then: Set the Table + guest reactions to each dish, Pumpkin Pie (oven bake ties into the panic gag), Pumpkin Roast finale, Guest Book, co-op helper strip.
