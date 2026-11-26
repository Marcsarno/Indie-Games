# Gobble Gobble Kitchen notes

Last updated 2026-11-26 (round 4: Mom and Dad, clean-up after every recipe, hands-on oven steps; round 3 added five recipes, the oven, the picture menu and the dinner bell). **Start here.** `PLAN.md` is the user's full design plan; this file says what is built, how to build it, and where it differs.

Phone / tablet link (private Claude artifact): **https://claude.ai/artifact/1cuiWA9tnyBS51PnHXkU9i**. Republish `dist-single/artifact.html` to the same artifact after every change (`npm run build:single`, then the Artifact tool with that path and this `url`).

## What is playable
The Big Feast with **eight jobs**, about 12-15 minutes for all of them (the kids can call dinner after any three):
- **Title** (logo, Play, the "No ads / purchases / links / data" line). Audio unlocks on the Play tap.
- **Overview and picture menu.** The top of the screen offers up to three jobs as round pictures (the first three unfinished ones in this order: potatoes, cranberry, table, beans, stuffing, sweet potatoes, pie, roast). Tap one: its kit pops onto the island and the camera flies in. The home button returns to the overview; a half-done dish keeps its progress and tucks away if another is picked. When a dish goes to the table, its kit is cleared off the counter.
- **Mashed Potatoes:** peel (8 strips, flips after 4; swipe works) -> hops into the bowl -> mash (7 taps or up-down drag) -> butter (tap or drag, magnetic) -> stir (5 taps or circle-drag).
- **Cranberry Sauce:** open the can (3 cranks or circle-drag) -> 3 taps and the log SCHLORPs out -> wobble; a service bell appears after 3 wobbles. Ten wobbles = jelly rain (secret). It still wobbles on the dinner table.
- **Set the Table:** plates, then forks, fly from the cart to glowing outlines (tap, or drag to any outline); then name cards with each guest's portrait.
- **Green Beans** (round 3): tap the pile and the next bean snaps in two with a recoil and hops into the dish (a swipe across them works too) -> sprinkle crispy onions (4 taps).
- **Stuffing** (round 3): bread chunks pop into the air and burst into cubes that rain into the bowl (5) -> a toy knife chops celery (4; Gobbles flinches) -> shake the herbs (3; Gobbles sneezes; up-down drag works) -> toss (4 taps or circle-drag; everything jumps).
- **Sweet Potatoes** (round 3): scoop the mash into the casserole (4) -> marshmallows two at a time (6) -> toast on the open oven door: each tap is a wave of heat and they go white -> tan -> golden (3).
- **Pumpkin Pie** (round 3): roll the dough flat (5 taps or back-and-forth drag; shape key) -> pour the filling (3) -> crimp 12 pinches round the rim (taps or circle-drag, notes climb) -> bake (the timer sweeps to green by itself; tapping the oven hurries it) -> whipped cream (8 dollops; drag works) and a leaf.
- **Pumpkin Roast, the finale** (round 3): Gobbles' "turkey" is a big stuffed pumpkin with two butternut drumsticks in paper frills. Stuff it (4 scoops) -> baste three times (tap the baster to fill, tap the roast to squirt; it gets shinier) -> roast: the timer runs by itself, tap the oven to peek as often as you like, pull it out in the green; late is "Extra crispy!" with a giggle, never burnt -> carve four slices along the dashed lines.
- **The oven** (`src/game/oven.ts`) is shared and every part is the player's own tap (round 4, the user asked for slower, more hands-on cooking): **open the door** (Gobbles panics into a disguise every time; each disguise is a sticker) -> **put the dish in** -> **close the door** -> **wind the kitchen timer** (three taps) -> it bakes while the needle sweeps to the green zone -> **open the door** -> **take it out**. A tap on the dish counts wherever a tap on the door is wanted, because the dish sits in front of the door.
- **Clean-up** (round 4, `Station.cleanup()`): after the last cooking step of every island recipe and before the dish flies to the table, "Dishes in the sink!" (each tap sends a batch of the leftover tools arcing into the sink with bubbles, up to four taps) and "Wipe the counter!" (a sponge wipes three spills, tap or swipe), then "All clean!".
- **Job done:** freeze-frame, sparkle, the dish shrinks a little and flies through the arch to its place on the table (eight numbered spots plus the middle for the roast). Guests arrive after jobs 1 to 6 in this order: Grammy, Babcia, Dziadziu, Mom, Dad, Lilah, each with a name tag and the narrator saying their name; on the other jobs the seated guests cheer.
- **Dinner:** starts by itself when all eight jobs are done, or when the kids ring the **dinner bell**, which joins the menu after three jobs. If the table was never set, the place settings pop out by themselves. Then: anyone not yet there arrives, Gobbles takes his booster seat in a pilgrim hat, the kids light two candles, serve everyone a scoop of every dish, confetti, feast photo (kept in the scrapbook), "cook again".
- **The family** (`src/game/guests.ts`), toy likenesses from the user's photos (the photos are not in the repo): **Grammy**, **Babcia**, **Dziadziu**, **Mom** (long light-brown hair, striped tee), **Dad** (black cap, beard, dark shirt), **Lilah** (toddler, wispy blonde hair, sage top) and **Arianna** (ponytail, white tee with a blue print). The table seats eight: six behind, Arianna at the left end, Gobbles on his booster at the right. A grown-up can rename everyone in the parent area.
- **Arianna is Gobbles' kitchen helper** (`helper: true`): she stands on a step stool behind the island in a chef hat from the start, is introduced by name, cheers and gasps along with Gobbles, and at dinner hops through the arch to the end seat. She does not arrive at the door.
- **Gobbles:** eyes follow the finger, blinks, tail fan as mood meter, flinch / cheer / yum / sneeze / panic. Tapping him replays the instruction.
- **Hints:** narrator line + demo wing at every step; idle escalation at 5 / 10 / 15 s. In the overview the menu pictures wave instead.
- **Pointless delights:** hanging pots (tune = secret), faucet bubbles, oven door, fridge, window weather, cat (purr = secret), cookie jar, real-time clock. Finished dishes stay tappable.
- **Sticker book** (6 stickers + the last three feast photos), **parent area** behind a 3-second hold (volumes, quiet mode, narrator voice, guest names, back to start).
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
Headless test with screenshots: `npx vite preview --port 4173 &` then `node tools/play.mjs .work/out --script feast|short|potato|cranberry|table|beans|stuffing|sweet|pie|roast|leave|chars|delights|idle|overview [--size 1024x768]` (`390x844` tests the rotated portrait layout). It taps real pointer events at the projected position of `hit_*` targets and waits in game time. `feast` cooks all eight jobs, dinner and "cook again" (about 6 minutes headless); `short` rings the dinner bell after three. A single-recipe script jumps straight into that recipe even if the menu is not offering it yet. Screenshots lag by about a second under software rendering, so short overlays (the big name card) are checked by reading the DOM instead.
`node scripts/inspect.mjs <glb>` lists nodes, extras and attributes; **`node scripts/joints.mjs <glb>` lists how many vertices follow each bone** (run it after touching a rig).

## How it is put together
- `blender/lib/` `palette.py` (the one palette, mirrored to `src/game/palette.json`), `shapes.py` (rounded box, lathe, tube, prism, ball... returning a wrapper `S` with `.at/.rot/.scale/.paint/.shade/.shade_face/.bone/.zone/.zone_by/.noline`), `common.py` (`make`, `empty`, `hit`, BVH ray-cast AO bake into vertex colours, face-area weighted normals, rigs, export, Cycles CPU preview).
- `blender/assets/` `kitchen.py`, `potato.py`, `cranberry.py`, `beans.py`, `stuffing.py`, `sweet.py`, `pie.py`, `roast.py`, `table.py` (cart, plates, forks, cards), `props.py`, `gobbles.py` (12-bone turkey, hats, demo wing), `guest.py` (5-bone peg person; `_zone` 1 skin, 2 shirt, 3 lower body, 4 forearm; hair, glasses, sunglasses and shirt patterns as pieces for the head or body bone).
- `scripts/optimize.mjs`: drops all-zero custom attributes, dedup -> prune -> weld -> meshopt. Before quantizing it moves every mesh onto a child node `<name>__geo`, so the node the game animates keeps its authored transform (`meshOf(node)` finds the mesh).
- `src/core/` `tween.ts`, `stage.ts` (renderer, fitted camera poses, squash/pop springs, blob shadows, day-phase lighting with a gradient backdrop, snapshot), `input.ts`, `assets.ts` (materials by Blender name, gloss table), `audio.ts`.
- `src/fx/` `toon.ts` (toon ramp, rim, gloss highlight, outline shells, jelly wobble), `particles.ts`, `motion.ts`.
- `src/game/` `game.ts` (flow), `kitchen.ts`, `gobbles.ts`, `guests.ts`, `portraits.ts` (renders each guest once off-screen into a name-card canvas), `hints.ts`, `oven.ts`, `station.ts` + `stations/*.ts` (one file per job).
- `src/ui/hud.ts` + `style.css`.

**Adding a recipe** (the pattern all five round-3 recipes follow): (1) `blender/assets/<name>.py` builds a kit around a `station_<name>` empty in station space (origin on the counter top), ends with `C.station_frame(...)`, `C.bake_each(...)`, export; add it to `ASSETS` in `build_all.py`. (2) `src/game/stations/<name>.ts` extends `Station`: hide what appears later in the constructor, write `recipe()` as a list of `await this.tapStep({ voice, target, hits, need, act, gesture })` (tap N times, optional drag that counts as taps), use `this.game.oven.load / slideIn / slideOut / heat / unload / release` for oven steps. (3) Add it to the station list in `game.ts`, a picture to `DISH` in `hud.ts`, lines to `tools/voice/lines.json`, and a script to `tools/play.mjs`.

Blender names drive the code: `hit_*` tap targets, `socket_*`, `cam_<name>` + `cam_<name>_target` with `fit_w`/`fit_h`, custom properties `shade` and `outline`, vertex attributes `_zone` (tint) and `_noline` (1 = no ink outline, for small face details).

## Bugs found in round 2 (worth remembering)
- **Skinning was broken in round 1.** `common.skin()` read the `bone` attribute while creating vertex groups; that reallocates the attribute arrays, so it read stale memory. Every Gobbles vertex ended up on the root bone (no blink, eye tracking, wings or tail) and guests had parts on the wrong bones ("faces disconnect from their bodies", the user's report). Fixed by copying the ids out first; `scripts/joints.mjs` checks it.
- **Outlines never showed on skinned meshes:** three flips `transformedNormal` for back-side materials (`FLIP_SIDED`), so the shell was pushed inward. Fixed in `toon.ts`.
- With outlines working, tiny face parts turned into black blobs: they now carry `_noline`.
- The candle tap boxes blocked taps on the guests behind them: they stop taking taps once lit.
- The artifact host's `img { max-width: 100% }` reset would have collapsed the big name card (its wrapper has no width): `max-width: none`.

## Numbers (headless)
Draw calls 30-125, triangles 90-160k on screen (only one recipe kit is out at a time; dinner with every dish is the high end), models 1436 KB after meshopt (12 files), narrator MP3s about 860 KB for two voices (60 lines each), single-file build about 4.4 MB. Frame rate on real devices is **not measured yet**.

## Audio state (measured, not heard)
- Effects were rendered offline and measured: all make sound, none clip. Music sits roughly 16 dB under the voice and ducks while the narrator talks.
- Narrator: 2 voices x 60 lines (`tools/voice/`; the British voice was dropped in round 3 for its glitchy line endings). `pronounce.json` holds spoken spellings: "Mmm" -> "Yum", **"Babcia" -> "Bobcha", "Dziadziu" -> "Jahjoo"** (phonemes checked: /ˈbɑːbtʃə/, /ˈdʒɑːdʒuː/; nobody has listened yet). If a guest is renamed, the narrator falls back to "Someone's at the door!".
- Audio starts on the Play button's `click` and resumes on any finished tap. Not yet tried on a real iPhone or iPad.

## Where the build differs from the plan (on purpose)
- **Layout:** kitchen and dining room side by side with an arch between them. The table is visible in the overview but not in the kitchen close-ups; the camera follows each finished dish to the table.
- **One work spot and a picture menu** instead of a station per dish: recipes are picked from pictures at the top of the screen and their kits take turns on the island. This keeps the kitchen uncluttered with eight jobs, but it drops "persistent mess" (a finished kit is cleared away).
- **The roast is Gobbles' pumpkin roast** (the plan's recommended twist) dressed up with squash drumsticks so it reads as "the turkey". The user said "add the turkey"; a real roast bird next to a turkey mascot was not built. Ask if that is really wanted.
- **Dinner bell:** the kids choose when dinner starts (after three jobs or more); the plan had dinner after the roast.
- Six guests come to the door after jobs 1 to 6; Arianna is in the kitchen all along.
- Oven steps happen on the opened door as a shelf; "peek" is a tap on the oven rather than on a separate oven light. Sweet potatoes toast in the open oven so the change is visible.
- **Outlines** are shells sharing the mesh's geometry, pushed out in the vertex shader. **Characters** are skinned but animated in code with springs (no clips).
- **Sound effects** are a hand-written WebAudio synth instead of ZzFX; no recorded foley; music is a quiet generated loop.
- **Assets** live in `src/assets/` (imported, so the single-file build can inline them).
- Cranberry ends with a **service bell**. Names appear as text on name cards and name tags.
- Guests are a fixed family set with editable names, not yet the full Guest Book.

## Not built yet (from the plan)
Rolls, gravy and other later dishes; the Guest Book (choosing and customising guests, "Me" cards); sibling co-op and the helper strip; Chef Challenge (picture orders); Kitchen Play sandbox; Pip the acorn; the dog; kitchen themes; the other 5 disguises; most of the 20 discoverables (three perfect bastes, pie in Gobbles' face, popcorn...); real foley; Ew reactions; guests reacting differently to each dish.

## Waiting on the user
1. **Play with the kids:** which recipes get giggles, which drag? Is the slower oven and the clean-up fun or a chore? Is eight jobs the right length, and do they find the dinner bell?
2. **The roast:** it is a pumpkin "turkey". Say so if a real roast turkey is wanted instead.
3. **Listen:** nobody has heard the audio, including the 17 new lines and "Bobcha" / "Jahjoo".
4. Does the family look right (Grammy, Babcia, Dziadziu, Mom, Dad, Lilah, Arianna)? Should Arianna do more as the helper (fetch ingredients, hold the bowl)? Who else should come?
5. Hosting: the artifact link is fine for testing; a Vercel project would give a full-screen URL. Not set up.

## Next steps (suggested)
Whatever the playtest shows first. Then: clearing the table and washing up after dinner (not built; clean-up is per recipe only), slower hands-on versions of the non-oven steps if the kids want more (e.g. turning the stove on for the sweet potato mash), rolls (knead, rise, butter) and gravy (stir on the stove, pour; the gravy-boat hat secret), guests reacting to their favourite dish, the Guest Book, the co-op helper strip, more discoverables per recipe. Trim triangles at dinner (hide the kitchen half, or lower-poly dishes on the table).
