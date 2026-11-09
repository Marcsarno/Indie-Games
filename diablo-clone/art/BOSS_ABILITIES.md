# Boss abilities: design draft (art chat, for the user to pick from)

Split: the **art chat** builds every animation (poses in the rigs, new clip names, effect sprites) and
this spec. The **main chat** wires the gameplay: timers, damage, hit areas and AI, following the
pattern in `skills.js` `updateBoss` (a wind-up timer drives `e.clip`, then the effect fires).

Rules for every ability:
- A readable **telegraph** of at least 0.6 s: a wind-up pose the player learns, plus a floor mark where it lands.
- One **signature move** per boss that no other boss has.
- A **phase change at half life** that changes the fight: a new move, faster moves, or adds.

What exists today: the Broodmother (lunge), Ogre Warlord, Gorr, Treant and Warden (`'slam'`: a marked ground slam,
plus adds at half life), the Skeleton King (raises skeletons) and the Lich (frost rings, bone walls, blink,
phase 2). Greyfang, Rook, Brother Cinder, the Flintback Matriarch, Malgrath and Azhruk have no specials yet.

| Boss | Signature move (telegraph, then effect) | Second move | At half life | New animations (art chat) |
|---|---|---|---|---|
| **Malgrath**, the Iron Butcher | **Cleaver throw**: winds back with the cleaver over his shoulder (0.7 s), then hurls it spinning in a line. It flies out 6 tiles and comes back; it hits both ways. | **Meat hook**: swings a chain hook (0.6 s), and a hit drags the hero to his feet. | **Frenzy**: his eyes and blade edge flare, he chops faster (x1.4) and steam rises. | throw wind-up, throw release, the spinning-cleaver sprite, a hook swing, a frenzy idle |
| **Azhruk**, the Furnace Guard | **Furnace blast**: the belly grate swings open and glows white (0.8 s), then a cone of fire 4 tiles long. | **Quake**: raises the hammer high (0.9 s) and slams; two shockwave rings spread out (jump over the gaps, like the Lich's rings). | **Overheat**: his plate seams glow, and he leaves burning footprints. | grate-open pose (a new look state), braced blast pose, overhead quake slam, glowing-seam variant |
| **Greyfang**, the alpha wolf | **Pounce**: crouches with its hackles up (0.6 s), leaps to a marked circle and knocks the hero back. | **Rend**: a 3-bite flurry. | **Howl**: rears its head (1 s) and calls 2 wolves. | crouch, airborne leap, landing, howl pose |
| **Rook**, the bandit chief | **Shield charge**: plants its feet, shield up (0.7 s), then rushes in a line and stuns on a hit. | **Cleaver toss** at range. | **Whistle**: brigands come running. | brace, charge run, whistle pose |
| **Skeleton King** | **Grave cleave**: drags the sword back (0.8 s), then a wide 180-degree sweep; an arc is marked on the floor. | Raise dead (exists; better arm-raise pose) | **Wrath**: three dashing slashes in a row. | sword drag-back, sweep, dash slash, raise pose |
| **Gorr**, the Minebreaker | **Boulder hurl**: rips a rock up from the floor (0.8 s) and throws it at a marked spot. | Ground slam (exists) | **Cave-in**: punches the wall; rocks fall at marked circles. | lift, throw, a wall punch |
| **Lich** | (has rings, walls and blink) | | | distinct poses for each: staff overhead for the ring, staff plunged down for the wall, a fade for the blink |
| **Drowned Warden** | **Anchor hook**: swings the anchor-chain round (0.7 s) and pulls the hero in. | Slam (exists) | **Tide**: a wave sweeps across the room; stand behind a pillar. | chain swing, pull, a raised-arms tide call |
| **Treant Elder** | **Root snare**: claws dig into the floor (0.7 s), roots burst under the hero and hold it 1 s. | Slam (exists) | Spore adds (exist) | claws-in-ground pose, root sprites |
| **Broodmother** | Lunge (exists) | **Web spit**: rears back (0.5 s) and spits a web that slows. | **Egg burst**: every sac hatches at once. | rear-and-spit pose, web blob |
| **Flintback Matriarch** | **Shell roll**: curls into a ball (0.6 s) and rolls along a line, bouncing off walls. | **Spike volley**: shell spikes fire out in a fan. | Burrow: digs under and pops up beside the hero. | curl, roll frames, volley pose, burrow and emerge |
| **Brother Cinder** | **Pillar of fire**: raises the staff (0.8 s), and fire columns erupt at 3 marked spots. | Firebolt (exists) | **Immolation**: he catches fire, gains a burning aura and walks at the hero. | staff-raise, a burning variant |
| **Ogre Warlord** | Ground slam (exists) | **Club spin**: a whirl that pulls nearby dust in. | Goblins (exist) | spin frames |

**Suggested order:** Malgrath and Azhruk first (the newest, and they have nothing yet). Then Greyfang and Rook,
the first two bosses a player meets.

## Built: Malgrath and Azhruk animations (art D1, 2026-11-09). Wiring notes for the main chat
Everything is in `game/js/monsters.js`. Play a move by setting `e.clip` and the frame, as for any clip; a frame
stays as long as the timer says. A **look flag** is a state: set it on the entity's look (e.g. `e.look = { ...e.look, frenzy: true }`)
and the sprite cache keys on it. None of this changes how existing frames look (a hash of every monster's frames is identical).

**Malgrath** (`family: 'butcher'`)
| Clip / flag | Frames | Suggested timing | What the main chat adds |
|---|---|---|---|
| `throw` | 0 cleaver cocked over the shoulder (the telegraph), 1 release (empty hand, arm out), 2 follow-through | hold 0 for 0.7 s, then 1 for 0.1 s and 2 for 0.25 s | On frame 1, spawn the projectile: draw `getSprite('cleaverspin', { scale: 1.5 }, 0, 'idle', (t * 20 | 0) % 8)` along the line (spun flat, so `dir` doesn't matter). It flies out 6 tiles, comes back, and hits both ways. Until it returns he has no cleaver: keep him in `throw` frame 2 or idle (the idle draws the cleaver, so if he idles before the catch, use frame 2). |
| `hook` | 0 the hook whirled overhead (the telegraph), 1 the cast (the arm out, chain running forward), 2 the haul (the fist pulled back, chain taut) | 0 for 0.6 s, 1 while the hook flies, 2 while dragging | Draw the chain from his left fist to the hero (a dotted line of `M.CHAIN` grey) and the hook at its end; on a hit, drag the hero toward him during frame 2. |
| `frenzy: true` (look) | idle, walk and attack all work; embers rise off him (4 idle frames), his eyes and mouth flare, and the cleaver edge glows wider | at half life, for the rest of the fight | Speed up his attacks (x1.4) and add steam particles if wanted. |

**Azhruk** (`family: 'furnace'`)
| Clip / flag | Frames | Suggested timing | What the main chat adds |
|---|---|---|---|
| `blast` | 0 the hammer planted beside him, the belly grate swung open and white-hot (the telegraph); 1 and 2 the jet of fire, braced (alternate them to flicker) | 0 for 0.8 s, then 1 and 2 alternating every 0.1 s for 0.8 s | The sprite's flame reaches about 2 tiles; draw the rest of the 4-tile cone with fire particles, and burn the hero inside it. |
| `attack` (the existing slam) | used as the **Quake** | hold frame 0 (hammer overhead) 0.9 s as the telegraph | Two shockwave rings with gaps, like `lichRing`. |
| `hot: true` (look) | every plate seam glows, the visor and the belly core go white-hot | at half life, for the rest of the fight | Burning footprints (small fire decals) behind him. |
