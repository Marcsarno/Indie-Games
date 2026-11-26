# Gobble Gobble Kitchen notes

Last updated 2026-11-26 (round 2: family guests, Set the Table, bug and polish pass). **Start here.** `PLAN.md` is the user's full design plan; this file says what is built, how to build it, and where it differs.

Phone / tablet link (private Claude artifact): **https://claude.ai/artifact/1cuiWA9tnyBS51PnHXkU9i**. Republish `dist-single/artifact.html` to the same artifact after every change (`npm run build:single`, then the Artifact tool with that path and this `url`).

## What is playable
The Big Feast with three jobs, start to finish, about 6-8 minutes:
- **Title** (logo, Play, the "No ads / purchases / links / data" line). Audio unlocks on the Play tap.
- **Overview** of the toy kitchen and dining room. Bobbing arrows mark the jobs; tap one and the camera flies in (0.6 s). A home button returns to the overview; a half-done job keeps its progress.
- **Mashed Potatoes:** peel (8 strips, the potato flips after 4; swipe also works) -> hops into the bowl as chunks -> mash (7 taps, shape key chunks to mound; up-down drag also works) -> butter (tap, or drag with a magnetic drop) -> stir (5 taps or circle-drag).
- **Cranberry Sauce:** open the can (3 cranks or circle-drag) -> the can flips over the dish, 3 taps and the log SCHLORPs out -> wobble. After 3 wobbles a service bell pops in; ringing it sends the dish. Ten wobbles = jelly rain (secret). The log still wobbles when tapped on the dinner table.
- **Set the Table** (round 2): a serving cart in front of the table. Plates, then forks, fly to the next glowing outline (tap) or can be carried to any outline (drag, magnetic, a miss floats back). Then the name cards: each shows a guest's portrait and name, pops up big on screen with that guest's voice, and lands at their seat.
- **Job done:** freeze-frame, sparkle, a dish flies through the arch to the table (nothing flies for Set the Table), the doorbell rings, the camera moves in on the front door, and a guest walks in with a name tag and the narrator saying "Grammy is here!". Light moves morning -> golden hour over the three jobs.
- **Dinner** (after all three): the other two guests come in together, Gobbles hops to his booster seat in a pilgrim hat, two candles pop in and the kids light them (the room warms to candlelight), then tap each guest and Gobbles to serve. Cheer, confetti, feast photo (kept in the scrapbook), "cook again" rebuilds the session.
- **The family** (`src/game/guests.ts`): **Grammy** (shoulder-length light hair, black polka-dot top, necklace), **Babcia** (short auburn hair, white top with pink print, pink lower half), **Dziadziu** (swept sandy hair, sunglasses, blue button shirt), plus Cousin (pigtails) and Friend (party hat). The first three arrive one per job, in that order. They are toy likenesses from the user's photos (hair, glasses, outfits); the photos are not in the repo. A grown-up can rename all five in the parent area.
- **Gobbles:** eyes follow the finger, blinks, tail fan as mood meter, flinch / cheer / yum / sneeze / oven panic with a disguise. Tapping him replays the instruction.
- **Hints:** narrator line + demo wing at every step; idle escalation at 5 / 10 / 15 s, then the cycle repeats.
- **Pointless delights:** hanging pots (left-middle-right plays a tune = secret), faucet bubbles, oven door (Gobbles panics into a disguise = sticker per disguise), fridge, window weather, cat (third tap purrs = secret), cookie jar, real-time clock. Finished dishes and leftovers stay tappable. A tap on nothing still puffs.
- **Sticker book** (6 stickers as silhouettes until found, plus the last three feast photos), **parent area** behind a 3-second hold (volumes, quiet mode, narrator voice, guest names, back to start).
- **Portrait phones:** the whole game is turned 90 degrees so it is always landscape (taps tested).

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
Headless test with screenshots: `npx vite preview --port 4173 &` then `node tools/play.mjs .work/out --script feast|potato|cranberry|table|leave|chars|delights|idle|overview [--size 1024x768]` (`390x844` tests the rotated portrait layout). It taps real pointer events at the projected position of `hit_*` targets and waits in game time. `feast` plays everything including "cook again". Screenshots lag by about a second under software rendering, so short overlays (the big name card) are checked by reading the DOM instead.
`node scripts/inspect.mjs <glb>` lists nodes, extras and attributes; **`node scripts/joints.mjs <glb>` lists how many vertices follow each bone** (run it after touching a rig).

## How it is put together
- `blender/lib/` `palette.py` (the one palette, mirrored to `src/game/palette.json`), `shapes.py` (rounded box, lathe, tube, prism, ball... returning a wrapper `S` with `.at/.rot/.scale/.paint/.shade/.shade_face/.bone/.zone/.zone_by/.noline`), `common.py` (`make`, `empty`, `hit`, BVH ray-cast AO bake into vertex colours, face-area weighted normals, rigs, export, Cycles CPU preview).
- `blender/assets/` `kitchen.py`, `potato.py`, `cranberry.py`, `table.py` (cart, plates, forks, cards), `props.py`, `gobbles.py` (12-bone turkey, hats, demo wing), `guest.py` (5-bone peg person; `_zone` 1 skin, 2 shirt, 3 lower body, 4 forearm; hair, glasses, sunglasses and shirt patterns as pieces for the head or body bone).
- `scripts/optimize.mjs`: drops all-zero custom attributes, dedup -> prune -> weld -> meshopt. Before quantizing it moves every mesh onto a child node `<name>__geo`, so the node the game animates keeps its authored transform (`meshOf(node)` finds the mesh).
- `src/core/` `tween.ts`, `stage.ts` (renderer, fitted camera poses, squash/pop springs, blob shadows, day-phase lighting with a gradient backdrop, snapshot), `input.ts`, `assets.ts` (materials by Blender name, gloss table), `audio.ts`.
- `src/fx/` `toon.ts` (toon ramp, rim, gloss highlight, outline shells, jelly wobble), `particles.ts`, `motion.ts`.
- `src/game/` `game.ts` (flow), `kitchen.ts`, `gobbles.ts`, `guests.ts`, `portraits.ts` (renders each guest once off-screen into a name-card canvas), `hints.ts`, `station.ts` + `stations/potato.ts`, `cranberry.ts`, `table.ts`.
- `src/ui/hud.ts` + `style.css`.

Blender names drive the code: `hit_*` tap targets, `socket_*`, `cam_<name>` + `cam_<name>_target` with `fit_w`/`fit_h`, custom properties `shade` and `outline`, vertex attributes `_zone` (tint) and `_noline` (1 = no ink outline, for small face details).

## Bugs found in round 2 (worth remembering)
- **Skinning was broken in round 1.** `common.skin()` read the `bone` attribute while creating vertex groups; that reallocates the attribute arrays, so it read stale memory. Every Gobbles vertex ended up on the root bone (no blink, eye tracking, wings or tail) and guests had parts on the wrong bones ("faces disconnect from their bodies", the user's report). Fixed by copying the ids out first; `scripts/joints.mjs` checks it.
- **Outlines never showed on skinned meshes:** three flips `transformedNormal` for back-side materials (`FLIP_SIDED`), so the shell was pushed inward. Fixed in `toon.ts`.
- With outlines working, tiny face parts turned into black blobs: they now carry `_noline`.
- The candle tap boxes blocked taps on the guests behind them: they stop taking taps once lit.
- The artifact host's `img { max-width: 100% }` reset would have collapsed the big name card (its wrapper has no width): `max-width: none`.

## Numbers (headless)
Draw calls 40-135 (overview with everything out is the high end, over the plan's 100), triangles 95-156k on screen (dinner is the high end), models 1027 KB after meshopt, JS about 745 KB (207 KB gzip), narrator MP3s 834 KB for three voices (41 lines each), single-file build 3.2 MB. Frame rate on real devices is **not measured yet**.

## Audio state (measured, not heard)
- Effects were rendered offline and measured: all make sound, none clip. Music sits roughly 16 dB under the voice and ducks while the narrator talks.
- Narrator: 3 voices x 41 lines (`tools/voice/`). `pronounce.json` holds spoken spellings: "Mmm" -> "Yum", **"Babcia" -> "Bobcha", "Dziadziu" -> "Jahjoo"** (phonemes checked: /ˈbɑːbtʃə/, /ˈdʒɑːdʒuː/; nobody has listened yet). If a guest is renamed, the narrator falls back to "Someone's at the door!".
- `bf_emma` may add a small extra sound at the end of some lines; she is only offered in the parent area.
- Audio starts on the Play button's `click` and resumes on any finished tap. Not yet tried on a real iPhone or iPad.

## Where the build differs from the plan (on purpose)
- **Layout:** kitchen and dining room side by side with an arch between them. The table is visible in the overview but not in the kitchen close-ups; the camera follows the finished dish to the table.
- **Outlines** are shells sharing the mesh's geometry, pushed out in the vertex shader. **Characters** are skinned but animated in code with springs (no clips).
- **Sound effects** are a hand-written WebAudio synth instead of ZzFX; no recorded foley (kenney.nl is blocked from the cloud container); music is a quiet generated loop.
- **Assets** live in `src/assets/` (imported, so the single-file build can inline them).
- Cranberry ends with a **service bell**. **Candles** are lit at dinner (not inside Set the Table) so candlelight always comes last. Place settings come from Set the Table, not with each guest.
- Names appear as text on name cards and name tags (the plan allows names; everything else is still pictures).
- Guests are a fixed family set with editable names, not yet the full Guest Book.

## Not built yet (from the plan)
Pie, Pumpkin Roast, later dishes; the Guest Book (choosing and customising guests, "Me" cards); sibling co-op and the helper strip; Chef Challenge; Kitchen Play sandbox; Pip the acorn; the dog; kitchen themes; the other 5 disguises; most of the 20 discoverables; real foley; Ew reactions.

## Waiting on the user
1. **Play round 2 with the kids:** do the grandparents look right? Anything to change about hair, clothes or colours? Who else should come (names and a short description are enough)?
2. **Listen:** the narrator saying "Bobcha is here!" and "Jahjoo is here!", plus effects and music in general.
3. Open decisions from the plan: mascot twist (built as Gobbles + pumpkin roast), first playtest device, narrator voice.
4. Hosting: the artifact link is fine for testing; a Vercel project (like city-clone) would give a full-screen URL. Not set up.

## Next steps (suggested)
Whatever the playtest shows first. Then Pumpkin Pie (oven bake ties into the panic gag), the Pumpkin Roast finale, the Guest Book, the co-op helper strip. Trim draw calls in the overview (merge the cart items, drop outlines on forks).
