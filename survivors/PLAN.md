# Survivors game: first plan (2026-11-16)

A Vampire Survivors / Brotato style game built from the Diablo-style game in `diablo-clone/game/`.
Nothing is built yet. This is the thinking so far, waiting on the user's research and choices.

## What makes these games fun (research so far)
- **One input.** You only move; attacks fire on their own. The skill is where you stand and what you pick.
- **Constant rewards.** Vampire Survivors has ~30 items with 8 weapon levels and 5 passive levels, so an
  upgrade lands about every 20-25 seconds. Level-ups pause the action for a calm pick of 3 cards.
- **Power fantasy.** You start weak and running; by about minute 10 the screen itself is your weapon.
  Enemies walk straight at you, so you herd them into clumps and area attacks melt them.
- **Commit to a build.** Going all-in on one idea (all fire, all crit, all projectiles) should beat taking
  a bit of everything. Brotato makes builds committal on purpose.
- **Combos to discover.** Players love finding broken combinations (in VS: weapon + matching passive =
  an evolved weapon).
- **Chests as slot machines.** Elites drop chests with 1, 3 or 5 rewards and a big opening show. VS
  scripts the first few to be generous.
- **No wasted run.** Gold carries over to permanent upgrades and unlocks (classes, maps, items), so even
  a short failed run moves you forward. Cheap, plentiful unlocks feel generous.
- **Low friction.** No tutorial; pick a hero and go. Complexity comes after you are hooked.
- **Readable crowds.** 200+ enemies must still read on a phone: clear shapes, contrast, enemies distinct
  from effects.
- **Gems set the pace.** XP gems pull you into danger; a magnet range upgrade and a "pull all gems"
  pickup are part of the rhythm.

- **Melee works too** (the user asked, 2026-11-16). Halls of Torment (Diablo 1 look, Swordsman /
  Norseman / Shieldmaiden), Death Must Die (Diablo-like heroes), Brotato's melee weapons, VS's whip.
  Tricks: auto-swing at the nearest foe in reach, wide arcs and spins, auras and orbiting blades, dashes
  and leaps; melee gets more life, armour, lifesteal and knockback to pay for standing close.

Sources: jboger.substack.com "The Secret Sauce of Vampire Survivors"; legitsauce.pages.dev
"Geometry Survivor design notes"; game guides on evolutions (PC Gamer, GameSpot); Brotato guides.

## How the Diablo game maps onto it
| Diablo game | Survivors game |
|---|---|
| Class basic attack (barbarian swing, magic missile, arrow, hammer) | Starting weapon, fires on its own at the nearest enemy |
| 4 skills per class (16 total) | Weapons you draft on level-up; each fires on its own cooldown, levels 1-5 |
| 3 skill modifiers per skill (the "runes") | At weapon level 3 you choose 1 of its 3 modifiers: the big fork in a build (Fireball → SPLIT / BURNING GROUND / GREAT FIREBALL) |
| Item affixes (crit, damage, attack speed, life, area...) | Passive upgrade cards |
| Sets (2 and 3 piece bonuses) | Set pieces from chests; collecting them is the "commit to a build" reward |
| Legendaries | Chest rewards that change how a skill works: the "evolution" moment |
| Ultimates (charge from hits and kills) | Same meter; one big button, or fires itself when full (to decide) |
| Elites with powers (burning, frozen, blinking...) | Mini-bosses in the waves; they drop the chests |
| Bosses (Skeleton King, Alpha, Lich, Bandit Chief, Wight...) | One at mid-run and one at the end |
| ~44 monsters, gore, hit-stop, shake, damage numbers, sounds, music | Kept; hit-stop and shake only on big hits, or crowds will stutter |
| Outdoor and dungeon floors (forest, crypt, caves, hell) | Arena maps, unlocked one after another |
| Gold, shops, inventory, quests, town | Replaced by gold between runs and a small upgrade/unlock screen |

## How to build it (technical)
- New folder `survivors/` with its own `index.html`. It loads the art and data files from
  `diablo-clone/game/js/` unchanged where it can (palette, rig renderer, heroes, monsters, items,
  gore, sound) and has its own game loop: arena, timer, wave table, swarm movement, gems, level-up cards.
  The 3D remake proved this "load the old files, replace the loop" approach works.
- Skill effects in `skills.js` and the class files are tied to the old loop. Plan: reuse the drawing
  and effect code, and write a thin "auto-cast" layer that calls them at the nearest enemy on a timer.
  Some skills will need forking; how many is the first thing to check.
- Crowd movement: enemies walk at the hero with simple separation, on a spatial grid for hits.
- Unknowns to test first: (1) can the renderer draw 150-300 enemies at 60 fps on the phone (the sprite
  cache helps: same pose = same sprite); (2) the portrait screen shows only a small area at today's
  zoom; survivors need to see more around the hero, so the camera may need to pull back.
- Publish like the Diablo game: a new artifact page for the phone link. Commit to `main`.

## Proposed order
1. **Spike (prove it):** a flat forest arena, the barbarian walking, his swing firing on its own,
   100+ skeletons walking in, gems, a level-up with 3 cards. Measure frame time. Show the user.
2. **The core run:** all 4 classes, their 4 skills as auto weapons, modifiers as the level-3 fork,
   passives from affixes, a 10-minute timer with a wave table, elites with chests, one boss.
3. **Feel:** chest opening show, gore and numbers tuned for crowds, sound mixing for many hits, music.
4. **Between runs:** gold, permanent upgrades, unlocks (classes, maps, sets and legendaries in chests).
5. **More:** more arenas (crypt, caves, hell) and bosses; later maybe skills from other classes.

## Questions for the user
1. Run shape: one 10-15 minute run (Vampire Survivors) or 20 short waves with a shop between (Brotato)?
2. Skills: only your class's 4 skills, or can any class's skills show up?
3. Ultimate: a button you press, or it fires itself?
4. 2D pixel game only (recommended), or the 3D version?
5. A name.
