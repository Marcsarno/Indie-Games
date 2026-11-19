# Survivors: progression, unlocks and a reason to explore (plan, 2026-11-19)

> Status (2026-11-19, round 3): built: gold kept on death, the camp (heroes, shrine, unlocks), blessings with free refunds, hero ranks with gear looks, 15 unlocks, four difficulty levels, the bigger map with barrels, pickups, shrines, the caged Ranger, a relic altar, goblins and fire rain. Not built yet: the second map, curses beyond the four levels, gear from chests, the walkable camp. See NOTES.md.

The user: "plan how to add unlocks, progression, give you a reason to walk around the map like survivors. More
rogue-like with dying and leveling." Nothing here is built yet. It follows RESEARCH.md: unlocks should answer
"what can I try now?", permanent power should answer "what frustration does this soften?", nothing should feel
like a required grind, and a new feature must not bypass the core (moving and choosing).

## The loop
1. **Run** (10 minutes on one map): level up, build, explore for loot and events, fight the boss.
2. **Die or win**: the run ends. You keep the **gold** you picked up, every **unlock** you earned, and **hero XP**.
   Your in-run levels, spells and runes are gone (that is the roguelike part).
3. **Camp** (between runs): spend gold, look at what unlocked, pick a hero and a map, go again.

## 1. What carries over between runs
| Kind | What | Why it is there (the brief's test) |
|---|---|---|
| Gold | Dropped by kills (a little), breakables, chests, treasure goblins, bosses; all of it is kept on death | A failed run still moves you forward |
| Blessings (gold) | Small permanent boosts bought at the camp shrine: life, might, armor, speed, magnet, +1 reroll, +1 banish, one revive per run, +1 starting card choice. Each has 3-5 ranks; all of them together come to about +50% power. **Free refund** any time (Vampire Survivors does this) | Softens "I keep dying at 4:00"; capped so skill and builds still decide runs |
| Unlocks (achievements) | New heroes, new spells and skills in the pool, runes, maps, relics. Earned by doing things, never bought | Each one is a new thing to try |
| Hero XP / mastery | Each hero levels from its own runs; levels unlock **looks** (the Diablo game's sets and legendary gear drawn on the hero) and a choice of starting skill | A reason to replay a hero without adding raw power |

## 2. Unlocks (first list, ~20)
Each answers "what can I try now?". Most come from playing a certain way, not from grinding totals.
- **Heroes**: the Ranger (free her from a cage found on the map), the Barbarian (beat the King with the Paladin).
- **Runes**: each spell starts with one rune; the other two unlock by using it (e.g. kill 300 with Fireball ->
  GREAT FIREBALL; freeze 100 foes -> DEEP FREEZE). Pool stays small at first, grows with skill.
- **Spells/skills**: the Diablo game's extra ones (Blink, the Mage's Arcane Orb style spells, the Paladin's Seraph's
  Fall as an opt-in) unlocked by finding **relics** on the map.
- **Maps**: beat the King -> THE CRYPT (dungeon walls and corridors); beat the crypt boss -> THE CAVES; then HELL.
  Each map brings new enemy roles and terrain, not just more health.
- **Banish** (remove a card from the pool for the run): unlocked by reaching level 20.
- **Curses** (optional difficulty, like Brotato's danger levels): unlocked by a first win; more gold for harder runs.
  The Diablo game already names the steps: NIGHTMARE, HELL, TORMENT.

## 3. Reasons to walk the map
Today the arena is a 64x64 clearing with nothing in it but monsters and gems. Plan: a bigger map (about 100x100,
the size of the Diablo game's hub) with things worth a detour, each shown by an arrow at the screen edge when far.
- **Breakables**: barrels, braziers, graves, crates (the game's own props). Break them for gold, a heal, a **magnet**
  pickup (pulls every gem on the map), a **bomb** (clears the screen) or a rare chest.
- **Shrines** (the Diablo game has them): stand in the circle for 3 seconds while the swarm closes in for a 30-second
  boost: frenzy, a shield, double gems. A small "risk it?" choice.
- **Treasure goblin** (already a monster): appears, runs away with a sack; catch it for a gold spray.
- **Relic altar**: one per run at a random spot, guarded by an elite pack. The first time you take a relic it
  unlocks for good (a new spell or rune joins the pool).
- **Ritual circle event**: "HOLD THE CIRCLE": stay inside for 15 seconds while the waves double. Win a chest.
- **Caged prisoner**: on certain maps a cage (the game has them); break it to free a hero (how the Ranger unlocks).
- **Elite camps**: a few elites placed on the map at the start, not just spawned at you: go fight them early for a
  chest, or leave them.
The brief's warning applies: one optional objective that competes with safety first (shrines), then see if it
helps before adding the rest.

## 4. Dying and levelling (the roguelike part)
- Death ends the run at once. The end screen shows: time, kills, gold earned (and banked), hero XP gained, and any
  **NEW UNLOCK** with its picture. That screen is the hook for the next run.
- Optional **revive** (a blessing, one per run) so a strong run is not lost to one mistake.
- In-run levels reset every run. Hero XP and unlocks never reset.
- Gold has no penalty on death (the research: a failed run must still count).

## 5. The camp screen
A menu screen first (cheap): HERO, MAP, SHRINE (blessings), UNLOCKS (a grid: found / not found with a hint), START.
Later it could be the Diablo game's Oakhollow camp as a walkable place (the merchant sells blessings, the shrine,
the map table). Saves live in the phone's browser.

## 6. Order to build
1. **Gold and the camp**: gold drops, gold kept on death, the camp menu, blessings with refunds, the new end screen.
2. **A bigger map with breakables, pickups (magnet, bomb, heal) and edge arrows.**
3. **Shrines and the treasure goblin** (the first map objectives). Check they help, then add the relic altar and
   the ritual circle.
4. **Unlocks**: the achievement list, locked runes, relics, the Ranger in a cage; an unlocks screen.
5. **Second map** (the Crypt) unlocked by the King; hero mastery and looks; curses.
6. Later: gear from the Diablo game in chests (sets and legendaries that change a skill), the walkable camp.

## Open questions for the user
1. Death: keep all gold (recommended, Vampire Survivors style) or lose some?
2. Map: a bigger bounded map with things on it (recommended), or endless like Vampire Survivors?
3. Camp: a quick menu first (recommended), or the walkable Oakhollow camp?
4. How much permanent power from blessings: small (about +50%, recommended) or large?
