# Gobble Gobble Kitchen: Game Design Plan

Nov 26, 2026, Marc. This is the plan as the user wrote it (tables rebuilt from the pasted text). `NOTES.md` says what is built and where the build differs.

## The pitch
Kids cook a whole Thanksgiving feast in a cozy, toy-like 3D kitchen. Every dish is a set of short, tactile steps. Each finished dish fills the dinner table, and the session ends with everyone sitting down to eat what the kids made. The star is Gobbles, a nervous little turkey sous-chef who is sure he's next on the menu and keeps trying on disguises.

The idea comes from studying what works in Cooking Mama, Overcooked, Toca Kitchen, Papa's games, Good Pizza Great Pizza, Pok Pok, Unpacking and WarioWare. We kept their best parts and dropped the things kids and parents complain about: harsh failure, fussy precision, text-heavy UI, grind and pay-to-skip.

## Five design pillars
1. **Every touch does something funny.** Nothing in the kitchen is dead to the finger. Food squishes, wobbles, pops and reacts within 100 ms.
2. **You can't fail, only get sillier.** Burnt becomes "extra crispy" with a giggle. A wrong drop bounces back with a boing. There are no red Xs, lost stars or game-overs.
3. **Food visibly changes under your hands.** Raw to golden, lumpy to fluffy, dough to pie. The transformation is the core reward (Cooking Mama's best idea).
4. **The table fills up.** Each dish brings a guest and a place setting. The feast is the payoff and a natural stopping point, so sessions end happy rather than being cut off.
5. **Works for a 4-year-old, stays fun for a 7-year-old.** Every step has a tap path. Gestures, secrets and picture orders add depth for the older kid without blocking the younger one.

## Who it's for and the rules we don't break
Ages 4-8: one kid alone, or two siblings (about 7 and 4-5) on one tablet. Runs in the browser on a phone, tablet or laptop, in landscape. The rules come from published kids' UX research and studio practice. Numbers marked "tune" are starting points to adjust in playtests.

### Input
| Rule | Number | Why |
|---|---|---|
| Minimum touch target | 2 x 2 cm on screen; invisible hit area about 1.5x the visible object | NN/g: kids need about 4x the adult target size |
| Main verb | Tap. Drag is the only other gesture. Never require pinch, flick, double-tap, long-press or multi-finger | Aziz 2013: tap and drag work at 100% from age 3 |
| Every step has a tap path | A gesture path is optional and earns extra flair, not extra progress | NN/g: mouse dragging isn't mastered until about age 9, so a laptop must be click-only |
| Tap tolerance | Up to 10-15 px of drift still counts as a tap (tune) | Preschool taps often register as small drags |
| Holdover filter | Ignore a second touch within about 150 ms on the same object (tune) | 3-10% of kids' touches are accidental repeats |
| Drop zones | Magnetic snap within 1.5x the target; a missed drop floats back with a boing | No failed drops, ever |
| Dead zones | No buttons in the bottom 10% of the screen or the corners | Wrists rest there |
| Camera | Fixed or auto-framed per station; kids never orbit, pan or zoom | |
| Density | 5-7 tappable things per view, well spaced; the background clearly isn't tappable | |

### Instructions
- Voice plus a demo hand, every time. A glow or pulse alone does not teach a gesture at any age (Hiniker 2015). Lines are 3-6 words: "Mash the potatoes!"
- No reading needed. Icons and pictures only. Text appears only in the parent area.
- One instruction at a time; one step = one verb.
- Escalating hints when idle: at about 5 s the target bobs; at 10 s the voice line repeats; at 15 s the demo hand appears (tune). Calm, never nagging. Tapping Gobbles replays the last instruction.

### Pacing
- A step lasts 10-20 s, a dish 2-4 minutes, a full feast 10-15 minutes (roughly 2-3 minutes of attention per year of age).
- Drop in a silly break after every 4-5 actions (Duolingo ABC playtests).
- First interaction within 5 s of opening the page on a mid-range phone.

### Parent trust (non-negotiable)
- No ads, no in-app purchases, no outbound links, no data collection. Say so on the title screen.
- None of the manipulative patterns found in about 80% of preschool apps (Radesky 2022): no come-back-tomorrow rewards, no sad characters when you leave, no fake timers, no streaks.
- A parent gate (hold for 3 s) guards settings and exit, styled differently from kid buttons.
- Separate music, voice and effects volume, plus a quiet mode that is fully playable with sound off.

## Mascot and story
Gobbles is a round, worried turkey sous-chef. The "turkey" being roasted is actually a giant pumpkin roast he invented, so the joke is never really dark. What kids bond with in a mascot is the same across Kirby, Pikmin, Bluey and Animal Crossing: a simple round silhouette, big eyes, whole-body emotion, gibberish voice, and a character who is a bit less competent than the child and needs them.

### Gobbles
- **Look:** pear-shaped body, huge eyes, tiny wattle, stubby wings. His fan tail is a mood meter: fluffed up when happy, drooping when embarrassed, shaking when scared.
- **Running gag:** every time the oven opens he panics and grabs a disguise: a pumpkin helmet, a fake mustache, a gravy-boat hat, a pie-tin shield. Eight disguises in all, each one a collectible.
- **Job in the game:** he demonstrates each step (the demo hand is his wing), cheers, flinches at the knife, sneezes in flour, sneaks tastes, and is the button you tap to hear an instruction again.
- **Animation set** (shared rig, 6-8 bones): Idle bob, Look-at-finger, Flinch, Sneeze, Cheer hop, Tail fan-pop, Disguise ta-da, Oven panic, Yum, Ew.
- **Voice:** Animalese-style gobble babble, high and quick. Real words are kept only for the instruction narrator.
- **Never used for pressure:** he doesn't cry when you leave and never says "I'll miss you."

**Pip the acorn** is a tiny sidekick who hides somewhere new in the kitchen each session (cookie jar, spice rack, on the whisk). Finding Pip is a sticker. Pip also delivers bonus hints.

Alternatives considered: Pip as the main mascot is safe but less funny. A grandma-mouse chef reads as "Cooking Mama lite," and kids bond less with an authority figure.

### Story frame: "The Big Feast"
1. **Morning.** The kitchen opens in soft morning light. The mailbox holds invitation cards.
2. **Guest Book.** The kids pick who's coming from a set of cards: Grandma, Grandpa, Auntie, Uncle, cousins, friends, a neighbor, the dog, the cat, plus up to four "Me" cards for the players. Each guest is customizable (hair, colors, hat). Nothing is preset; the default table is "Friends and Pets." Players can rename cards, or a parent can type names in the parent area.
3. **Cooking.** Each dish finished rings the doorbell. A guest arrives and takes their seat, and the light warms toward golden hour.
4. **Dinner.** Candles light up. Kids tap each guest to serve them, guests react, and Gobbles finally gets a seat with a paper pilgrim hat. A feast photo is saved to the scrapbook.

No one is ever missing, sad or impatiently waiting. The session has a clear beginning, middle and end.

## Core loop and modes
The loop: pick a dish -> do 3-5 short steps -> the dish pops onto the table -> a guest arrives and reacts. The kitchen view is a fixed 3/4 top-down camera on the whole room. Tapping a station flies the camera in (about 0.6 s) to a close framing of that counter. The feast table is always visible through a doorway, so the big picture never gets lost (Cooking Mama's main weakness).

- **Mode 1: The Big Feast (main mode).** The story frame above. Dishes are picked from a picture menu in any order, and the pumpkin roast is the finale. Steps are guided, with no timers and no grades. This is the 4-year-old's home base, fully completable alone.
- **Mode 2: Chef Challenge (opt-in, for the 7-year-old).** Each guest holds up a picture order in a speech bubble ("3 marshmallows on the sweet potatoes", "pie with a leaf on top"). Matching the order earns that guest's heart sticker and a happy dance. A near-miss still gets a nice reaction. Optional bonus: a gentle Pizzatron-style speed-up during the pie lattice and the table setting, which slows down again after a slip.
- **Mode 3: Kitchen Play (sandbox).** The whole kitchen, every ingredient, every tool, no goals (the Toca Kitchen model). Put anything in any pot and feed it to any guest. Tags on each food (sweet, sour, spicy, gross, crunchy) drive the reactions, so cranberry on ice cream gets a funny face. Most of the secrets live here; huge for replay.

### Sibling co-op (same screen, drop in or out at any time)
Two roles, both essential, neither blocking the other:

| | Head Chef (older kid) | Kitchen Helper (younger kid) |
|---|---|---|
| Where | Main counter, center-right | Pantry strip of big buttons on the left edge |
| Does | The recipe steps, optional gestures, decorating | Taps only: fetches ingredients (they fly to the chef), shakes salt and sprinkles, cheers the oven, rings the dinner bell, tickles Gobbles |
| Can fail? | No | No |
| Dependency | Some steps need a helper fetch ("bring the butter") | If the helper is busy for about 8 s, the item gently auto-delivers |
| Credit | Both chefs' avatars sit at the table, and guests thank each one | Same |

On a phone the game switches to taking turns, with a "Helper's turn!" card between steps. Either kid can pick either role. The design avoids Overcooked's family trap (everyone stuck at the youngest player's speed) by never requiring tight timing between players.

## Dishes and mini-games
Five dishes make the first full feast, built from 15 steps that reuse a few systems: tap-to-progress morphs, fly-to-slot placement, color lerps and particles. Every step works by tapping alone. The gesture column is the optional richer way to do the same step.

### Mashed Potatoes (first dish to build)
| Step | Tap path | Optional gesture | What makes it satisfying | Build trick |
|---|---|---|---|---|
| Peel | Tap the potato; one peel strip pops off per tap | Swipe along it; strips come off under the finger | Curly peel ribbons tumble onto the counter, "shhk" sound, final squash-pop and sparkle | Potato = flesh mesh + 8 peel-strip pieces; hide a strip with a pop, spawn a curl prop |
| Mash | Tap the masher; each tap mashes more | Up-and-down drag | Chunks squish into a fluffy mound, squelch per press, rising pitch | One shape key (chunks to mound), +0.15 per tap with overshoot |
| Butter swirl | Tap the butter pat in, then tap to stir | Circle-drag to stir | Butter melts glossy and swirls in, steam puff, "Mmm!" | Butter shrinks while its color melts into the mound |

### Cranberry Sauce (the signature toy)
| Step | Tap path | Optional gesture | What makes it satisfying | Build trick |
|---|---|---|---|---|
| Open can | Tap the opener | Circle-drag | Lid pops with a ping | Hinge animation |
| Schlorp | Tap the can's bottom | | The sauce slides out in one ribbed log with a giant "schlorp" | Arc + squash on landing |
| Wobble | Tap it, again and again | | Jelly wobble that decays slowly. Tap 10 times and it bursts into a jelly rain (secret) | Spring on scale plus a sine shear in the shader |

### Pumpkin Pie
| Step | Tap path | Optional gesture | What makes it satisfying | Build trick |
|---|---|---|---|---|
| Roll dough | Tap the rolling pin; dough flattens per tap | Drag the pin back and forth | Flour puffs, the dough ball squashes into a disc | Shape key from ball to disc |
| Fill | Tap the bowl to pour | | Orange filling rises in the tin with a glug | Disc scaling up inside the tin |
| Crimp | Tap anywhere on the rim; the next crimp pinches | | 12 crimps chain around the rim, each a soft "pff" with notes climbing a scale; finishing the ring plays a chime | 12 hidden nubs pop in, in order |
| Bake | Tap the oven; Gobbles panics into a disguise | | The pie turns golden, a steam burst, a ding | Color lerp |
| Whipped cream | Tap to add each dollop along a spiral | Trace the spiral | Cream piles in a swirl with a "pssh" can sound, then a leaf topper drops with a squash | Pre-made blobs pop in along a path; no freehand drawing |

### Set the Table
| Step | Tap path | Optional gesture | What makes it satisfying | Build trick |
|---|---|---|---|---|
| Plates, forks, napkins | Tap an item; it flies to the next glowing outline | Drag to any outline (magnetic snap) | Ceramic clink vs. metal ting, each item bounces as it lands | Fly-to-slot arc |
| Name cards | Tap a guest card; it lands at a seat | | The guest's face appears on the card, the emotional hook | Card textures drawn from the Guest Book |
| Candles | Tap each candle | | The room warms to candlelight | Light color and intensity tween |

### Pumpkin Roast (the finale "boss dish": more steps, no timer)
| Step | Tap path | Optional gesture | What makes it satisfying | Build trick |
|---|---|---|---|---|
| Stuff | Tap the stuffing bowl; scoops arc in | Drag scoops in | A thump per scoop, the cavity visibly fills | Arc + shape key on the cavity |
| Baste x3 | Tap the baster to fill it, tap the roast to squirt | | A gurgle, then a squirt; each baste makes it shinier and more golden. Three perfect bastes give a sparkly golden roast (secret) | Rim-light strength and color lerp per baste |
| Oven peek | Tap the oven light to check; tap the door to pull | | Raw to pale to golden. A big dial shows a green zone. Pulling late gives "extra crispy" and a giggle, never burnt | Color lerp on a timer; the timing is a bonus only |
| Carve | Tap each dashed line | | Slices fall with a juicy squash; a short freeze-frame on the last one | 4 pre-cut slices |
| Serve | Tap each guest's plate | | Every guest reacts in turn, then the camera dollies back, confetti and a family cheer, photo | Shared reaction clips |

Later dishes: Green Bean Snap (tap a bean and it snaps in two with a recoil), Stuffing Toss (Fruit Ninja-style bread-cube halves), Rolls Rising (knead with taps, the rolls puff up), Sweet Potatoes (marshmallows toast golden).

Dropped from the round-one ideas: buttering corn (too thin, so its sparkle moved into Rolls), tilt-to-pour (tap instead), hold-to-suck basting (long-press is hard for young kids), and freehand drawing (recognition is about 66% accurate for 5-year-olds).

## Game feel (juice) spec
Game feel is what separates this from a lame browser game. Every effect below is cheap, and all of them are reusable code in a shared `fx/` module.

| Effect | When | Spec (tune) |
|---|---|---|
| Touch response | Every tap on anything | Visual + sound within 100 ms, even on "wrong" taps |
| Squash and stretch | Grab, land, tap | Spring on Y scale (damping about 0.35, 4 Hz), X and Z = 1/sqrt(Y) so volume is kept; a tap kicks the velocity |
| Pop-in | Anything appearing | Scale 0 -> 1 with an overshoot ease, 250-350 ms |
| Food state change | Mashing, baking, basting | Shape-key and color tweens that overshoot slightly; never instant swaps |
| Particles | At milestones (25/50/100% of a step), not continuously | Steam puffs, flour clouds, sparkles, crumbs, confetti; at most about 50 alive; one draw call per type |
| Rising pitch | Repeated taps in one step | Each tap one note higher on a pentatonic scale, so it always sounds musical |
| Freeze-frame | Dish done, roast out, last slice | Game time pauses for 60-90 ms while particles keep going |
| Camera shake | Celebrations only, never mistakes | At most about 0.03-0.05 m, quickly decaying |
| Stars to the table | Dish done | The dish flies along an arc through the doorway onto the table; the doorbell rings |
| Persistent mess | Flour, peels, drips | Messes stay put for the session, so the kitchen shows what you did |
| Idle life | Always | Gobbles' eyes follow the finger, steam drifts, the clock ticks, the cat's tail swishes |
| Pointless delights | Anywhere | Oven light, a squeaky baster, a faucet that blows bubbles, hanging pots that play notes. Every one has a reaction. |

**Tossing without a physics engine.** Thrown or dropped food follows a hand-written arc (velocity + gravity + one bounce) aimed at a magnetic target such as the bowl or the dog's mouth. A throw always lands somewhere funny, it's deterministic, and it saves a 150 KB-1.4 MB physics library. A real engine (Rapier) is an option later, loaded only for the sandbox if it ever needs stacking.

## Rewards and discoverables
The reward is the world reacting, not a score. Guests cheer, gag theatrically, or get steam coming out of their ears, as in Toca Kitchen. Collectibles arrive as surprises, never promises. In the classic Lepper study, preschoolers promised a reward later drew about half as much in free play, while surprise rewards caused no drop. So the game never says "finish 3 dishes to unlock X."

### Collections
- **Sticker book:** found secrets show as silhouettes until discovered, like the Animal Crossing museum's empty slots. It shows no counters or percentages.
- **Gobbles' disguise wardrobe:** 8 disguises, each found by poking something.
- **Scrapbook:** every feast photo, saved on the device only.
- **Kitchen themes**, unlocked by completing dish sets: Cozy Cabin, Pumpkin Patch, Space Kitchen, Gingerbread House. Progress unlocks variety, never power, and nothing ever locks again.

### Discoverables (20 for the full game, about 10 in the MVP)
1. Tap the cranberry log 10 times and it bursts into jelly rain.
2. Drop Gobbles near the gravy boat and he wears it as a hat for the rest of the session.
3. Leave the corn in the oven too long and it explodes into popcorn. Burning becomes a reward.
4. Find all 8 disguises (pumpkin helmet, mustache, pie-tin shield, pilgrim hat, leaf crown and others).
5. Drop food off the counter and the dog catches it. Each food is a sticker.
6. Stir the sweet potatoes in reverse circles to get rainbow marshmallows.
7. Pepper on the cranberry gives a guest steaming ears.
8. Tap the finished pie 3 times and it ends up in Gobbles' face.
9. Three perfect bastes give a sparkling golden roast and a fanfare.
10. Open the fridge for a leftover-sandwich mini-scene.
11. Rapid-tap the oven light for a disco oven.
12. Tap the window for random weather: leaves, rain, or the first snow.
13. Pull the faucet to blow bubbles.
14. Find Pip in a new hiding spot each session.
15. Eight secret food combos (cranberry on ice cream, mashed potato on pie) earn "Gross!" or "Genius!" stickers.
16. Tap the hanging pots in the right order to play a tune.
17. Each guest has a secret favorite dish; serving it earns a heart sticker.
18. Play after 7 pm local time for candles and fireflies (variety, not a reward).
19. Feed Gobbles a taste of every dish for a full-belly waddle.
20. Ring the dinner bell 5 times quickly and everyone dances.

This gives the 7-year-old things to hunt for and trade on the playground. The 4-year-old stumbles into plenty of them just by poking around.

## Audio and voice
All audio can be made without a recording studio. Audio is half the fun for kids and the first thing that annoys parents, so the target is Pok Pok calm: nothing a parent would want to mute in a restaurant.

| Layer | Source | Notes |
|---|---|---|
| Instruction voice ("Mash the potatoes!") | Kokoro-82M text-to-speech (Apache-2.0), generated at build time | About 60-100 lines of 3-6 words, one warm voice, encoded to small Opus/MP3 files. Not the browser's built-in speech, which sounds different on every device and is flaky on iOS. |
| Character voices (Gobbles, guests) | Animalese-style babble synthesized in code | Short syllable blips with a per-character pitch and speed: Gobbles high and quick, Grandma low and slow, the dog barks syllables. Carries emotion with no words to translate. |
| UI and cartoon SFX (pop, boing, sparkle) | ZzFX (MIT, under 1 KB) | Parameters live in code; pentatonic notes for rising-pitch combos |
| Real kitchen foley (clink, sizzle, whisk, squelch) | Kenney CC0 packs + CC0-filtered freesound.org | Per-material sets (ceramic, metal, wood, squishy), 3-5 variants each, plus or minus 5-10% random pitch. The same object always makes the same family of sounds. |
| Music | One calm acoustic autumn loop, CC0 or royalty-free | Under 2 minutes, about 10 dB under the voice, ducked whenever the narrator speaks; no frantic tempo or timer music |

Rules: error sounds are funny (boing, plop, "uh-oh"), never a buzzer. Audio unlocks on the first "Play" tap, which iOS requires. During recipe steps, the target object should be the loudest and most rewarding thing to tap, because Khan Kids found that fun side sounds can pull kids off task.

## Art direction
A chunky, beveled, warm-lit toy kitchen, somewhere between Overcooked and Animal Crossing, with no textures at all. Everything is built from rounded primitives with flat vertex colors from one shared palette. The approach follows how Butter Royale got its "good enough to eat" look: beveled edges catch highlights, one central palette, and lighting baked in rather than computed at runtime.

**Shape language:** oversized food, thick counters, big handles, round everything. Nothing has a hard edge, and bevels are capped at a consistent size. Food gets a little noise so it doesn't look like perfect spheres.

**Palette** (one `palette.py`, mirrored to the game):

| Role | Color |
|---|---|
| Pumpkin | #E8833A |
| Cranberry | #B23A48 |
| Butter | #F6D58E |
| Cream | #FFF4E0 |
| Pie crust | #D9A066 |
| Roast | #B8673A |
| Cinnamon | #8C5A3C |
| Warm wood | #C68B59 |
| Sage | #8FAE7E |
| Deep green | #4F7A5A |
| Teal sky (window) | #7FB8B0 |
| Shadow tint (plum, never black) | #5B3A55 |
| Outline ink | #3B2630 |

**Lighting and shading:**
- A warm sky/plum ground hemisphere light plus one warm key light at about 45 degrees.
- Hero food and characters use toon shading with a soft 3-5 step ramp and a subtle warm rim light, so food looks "lit from the oven." Background props use the cheaper Lambert material.
- Ambient occlusion is baked into vertex colors in Blender.
- Under movable items, a soft blob shadow instead of real-time shadows.
- Outlines only on hero objects (food, Gobbles, guests): an inverted-hull shell baked in Blender, so there is no runtime cost.
- No SSAO, bloom or outline post-effects on phones.

**Light across the session:** morning blue-gold -> warm afternoon -> golden hour -> candlelight at dinner. It's one tween on two lights and the window color, and it tells the story of the day without a word.

**Characters:** blocky "toy figure" guests that share one rig and one clip set (Idle, Yum, Ew, Cheer, Gasp). Customization is color and hat swaps through palette indices.

## Tech pipeline
Python scripts drive Blender headless to build every model. Each model is exported as a GLB, compressed, and loaded by a Vite + three.js + TypeScript game. Target: under 2 MB total download, 60 fps on an iPad.

1. **Build:** `blender -b --factory-startup -P blender/build_all.py -- --out build/raw`. Each asset script starts from an empty scene, builds rounded meshes with bmesh (bevels, light subdivision, noise for food), paints vertex colors from `palette.py`, bakes AO into vertex colors, adds outline shells to hero objects, sets origins (bottom-center for food, grip for utensils, hinge for doors), and renders a 512 px preview PNG for review.
2. **Shape keys last:** apply all modifiers first, then add shape keys (Mashed, Flat, Filled, Squash). Blender can't keep shape keys through modifier application.
3. **Export:** GLB with `export_apply=False` on morph-bearing meshes, `export_vertex_color='ACTIVE'`, extras on (so gameplay tags arrive as userData), NLA-track animations, no textures.
4. **Compress:** gltf-transform with explicit dedup -> prune -> weld -> meshopt steps. Meshopt compresses animation too; Draco doesn't. Skip join/simplify so named parts survive.
5. **Game:** the loader with the meshopt decoder swaps materials to cached toon or Lambert versions; an AnimationMixer runs clips; springs and tweens drive shape keys; input is pointer events raycast against invisible oversized `hit_*` proxies.

### Project layout
```
gobble-kitchen/
  blender/lib/      common.py palette.py shapes.py
  blender/assets/   kitchen.py potato.py cranberry.py pie.py roast.py table.py gobbles.py guest.py
  blender/build_all.py
  public/models/    optimized .glb    public/audio/  voice + sfx sprite
  scripts/          build-assets.sh  build-voice.mjs (Kokoro)
  src/core/         renderer loop input assets audio tween spring
  src/fx/           particles shake toon outline
  src/game/         state recipes stations/ guests sticker-book
  src/ui/           hud parent-gate
```
Naming conventions in Blender (they drive the game code): `food_*` for meshes, `hit_*` for invisible tap targets, `socket_*` for attach points, `cam_<station>` + `cam_<station>_target` empties for camera poses.

### Mobile budget
| Item | Budget |
|---|---|
| Draw calls | Under 100, aim for about 50 (merge the static kitchen, instance repeats like plates and cranberries) |
| Triangles on screen | Under 150k; hero food 2-8k; small props 300-1k |
| Materials | About 6 total |
| Pixel ratio | Capped at 1.5 on mobile, stepping down if the frame rate drops |
| Shadows | None real-time; blob shadows + baked AO |
| Download | Under 2 MB models + audio |

Known pitfalls (verified in round two):
- Blender 4.1+ removed `use_auto_smooth`; use smooth-by-angle with a fallback.
- Since 4.1, vertex colors silently vanish on export unless the material uses them or you pass `export_vertex_color='ACTIVE'`. Do both.
- `export_apply=True` drops shape keys entirely.
- Pin Blender 4.2 LTS, since exporter parameters change between versions.
- The toon gradient map must use nearest filtering.
- Use NeutralToneMapping or no tone mapping; ACES washes out pastels.
- Unlock audio on the first tap.

Where it runs: the build happens in Claude Code on a machine with Blender 4.2 LTS installed, plus Node for Vite, gltf-transform and Kokoro.

## Roadmap
The plan is to build the riskiest thing first: whether the Blender pipeline and the gesture feel actually work. Content comes after. Each phase ends with a gate tested on the real players: watch the first 3 minutes without helping, and note hesitations, laughs, and moments a kid calls a parent over. (The phase table did not survive the paste.)

Phase 1 is the one that decides whether the game is fun. If mashing a potato doesn't make the kids giggle, more dishes won't fix it.

Build order inside the MVP: Mash and Cranberry first (they prove the juice), then Table + guest reactions (the payoff loop), then Roast and Pie, then Peel, then the roast finale, then the sandbox.

## Open decisions
- [ ] Mascot twist: Gobbles with a pumpkin roast (recommended), or a different animal mascot with a real roast turkey?
- [x] Blender: turn on package installs so it runs here, or run the build scripts on your own computer? Decided: Claude Code, with Blender installed there.
- [ ] Device for the first playtest: iPad, phone, or laptop? It decides whether co-op is split-screen or turn-taking first.
- [ ] Narrator voice: pick one of Kokoro's voices once there's a sample of 5 lines.

## Sources
Research ran in two rounds: three parallel research agents, then one verifier that checked the high-stakes claims and one gap-filling agent. Claims marked as unverifiable were dropped or are labeled "tune."
- **Kids' UX:** NN/g children's motor skills; Aziz 2013 gestures, ages 2-4; Anthony et al. 2019 touch accuracy; Radesky 2022 manipulative design; Lepper 1973 rewards; Duolingo ABC playtest
- **Studio philosophy:** Toca Boca on toys, not games; Pok Pok behind the design; Sago Mini Q&A; Overcooked postmortem; Unpacking design pillars; Unpacking foley; Job Simulator design Q&A; Good Pizza Great Pizza; Pizzatron 3000; Asymmetric family play study
- **Art and tech:** Butter Royale art breakdown; Blender 4.2 glTF export API; Blender 4.1 modeling notes; gltf-transform CLI; three.js MeshToonMaterial; Arm: post-processing on mobile; Springs for game feel
- **Audio:** Kokoro-82M; Animalese technique; ZzFX; Kenney CC0 sounds
