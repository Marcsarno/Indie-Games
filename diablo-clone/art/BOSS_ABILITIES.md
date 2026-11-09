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
