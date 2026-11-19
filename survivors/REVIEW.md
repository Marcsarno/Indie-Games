# Survivors: a review of the whole game (2026-11-19)

> Status: all five recommended steps were built in round 4 (see NOTES.md); the before/after numbers are at the end.

Measured with `tools/review.cjs` (one focused-bot run per hero on Normal, no meta progress, 3x speed), plus the
round 3 balance runs in NOTES.md, judged against RESEARCH.md.

## What the numbers say
| Hero | Result | Level 2 / 10 / 20 | Seconds per level (0-3 / 3-7 / 7+ min) | All skills maxed | First offer with no skill card | Hits taken | Lowest life (each minute) |
|---|---|---|---|---|---|---|---|
| Mage | won 9:33 | 14 s / 1:36 / 4:16 | 13 / 20 / 25 | 6:37 | 2:52 | 34 | 12-20% |
| Paladin | won 9:14 | 9 s / 1:45 / 4:33 | 13 / 20 / 28 | 9:01 | 0:37 | 220 | 10-19% |
| Barbarian | won 9:12 | 8 s / 2:51 / 5:12 | 18 / 17 / 23 | 6:44 (3 of 4) | 0:53 | 267 | 11-17% |
| Ranger | **died 8:40** | 7 s / 3:12 / 8:32 | 21 / 40 / 81 | 8:38 (3 of 5) | 1:49 | 199 | 4-19% |

## What works like a survivors game
- **One input, real decisions.** Movement is the skill; the melee heroes work the edge of the crowd, the Mage kites.
- **Reward rhythm.** The first upgrade comes in 7-14 s and a card every 13-28 s after (Vampire Survivors runs about
  20-25 s). Runes and fighting styles at level 3 are a real fork.
- **A run with an ending.** Ten minutes, the Alpha at 5:00, the King at 9:00 with his calls for help.
- **Pressure.** On Normal every hero dips to 10-20% life each minute and recovers: tense, beatable, and a death can
  be explained (the bot never fell to one blow).
- **Reasons to come back.** Gold kept, ranks, unlocks, four levels; a fresh hero cannot win Nightmare, a half-upgraded
  one can (round 3 runs).

## What does not yet
1. **The build is finished too early, and every run of a hero ends with the same build.** Each hero has only 4-5
   skills and takes all of them; by 2-6 minutes the skills are maxed and the rest of the run's cards are stat bumps.
   The brief's warnings: "builds feel superficially different", "the final portion feels passive", "more items do
   not make more interesting runs, but different builds should change behaviour". Today only the runes differ.
2. **The passives are flat numbers** (+damage, +speed, +life...). None changes how you play except the relics
   (Emberbrand's chain of fire is the only chain reaction in the game). Missing the survivors staples: one more
   projectile/cast (AMOUNT), bigger area (AREA), longer effects (DURATION).
3. **No late-run payoff.** Vampire Survivors' big moment is the evolution (a maxed weapon + its passive = a new,
   much stronger weapon). Here nothing new happens after about 6 minutes, and the monsters' life (x4.4 by 9:00)
   keeps pace with the hero, so 7-9 minutes is not the "enjoy your power" stretch the brief's pacing sketch asks for.
4. **The Ranger is weak.** Half the kills of the others, so half the gems: her levels slow to one every 80 s late,
   and she died. Her basic arrow is single-target and her bot skipped Piercing Shot and Cluster Arrow.
5. **The ultimates are unused.** Each class has one in the Diablo game (Arcane Storm / the four elements, Archangel,
   Wrath of the Mountain and the Berserker stance, Rain of Arrows): a ready-made power spike.

## Do we need more abilities? Yes, but mostly we don't have to invent them
The Diablo game already has 20+ class abilities the survivors game doesn't use:
- **Barbarian:** Blood Roar (a cone that makes foes flee), Flurry, Earthsplitter (a crack across the screen),
  Uproot (a bounding slab), Titan's Crescent (a crescent across the screen), Hurl (throw a foe into the crowd).
- **Paladin:** Lance of Dawn (a burning lane), Divine Toll (rings of light), Wrath of Heaven (three falling hammers).
- **Ranger:** Multishot (a fan), Snare Trap, Hawk (a pet that marks), Hunter's Mark (focus the toughest foe).
- **Mage:** only Blink is left, so the Mage needs about three new spells (below).
Left out on purpose: moves that carry the hero on their own (Reaver's Rush, Skyfall, Seraph's Fall, Bull Rush,
Leap, Evasive Leap, Blink as a move): the brief warns against the game moving you without your say.

New ones worth inventing (the brief's own dark-fantasy builds, shared by every hero as relic weapons):
- **Bone Orbit:** skulls circling the hero (the survivors orbit weapon; stand at the right distance).
- **Ash Trail:** fire left where you walk (lead the crowd through your path).
- **Grave Caller:** risen skeletons that fight for you near where they rise.
- For the Mage: **Frost Orb** (a slow orb shedding ice shards), **Arcane Familiar** (a floating eye that zaps),
  **Blizzard** (a storm that follows a crowd).

## Recommended next round, in order
1. **More skills than slots.** 7-9 skills per hero, 4 slots (plus the basic weapon). Different runs, different kits.
2. **Survivors passives.** AMOUNT (+1 cast/arrow/hammer), AREA, DURATION, COOLDOWN; fold the duplicates.
3. **Evolutions.** A skill at level 5 plus its partner passive turns into an evolved skill from a chest (e.g. Chain
   Lightning + Amount = Storm Chain; Ground Slam + Area = Earthsplitter); the class ultimate as the capstone at level 20,
   firing on its own when its meter is full.
4. **Fix the Ranger** (stronger basic arrow, Multishot as a starting option) and make 7-9 minutes a payoff: slower
   monster life growth on Normal after 6:00; the harder levels keep the pressure.
5. **After the King:** an optional "keep fighting" for gold, and the run's choice log shown on the end screen.

## After round 4 (the same measured run, Normal, no meta progress)
| Hero | Before | After | Skills maxed (before → after) | Evolutions | Kit at the end |
|---|---|---|---|---|---|
| Mage | won 9:33 | won 9:15 | 2:19-6:37 → 3:04-9:13 | Absolute Zero 6:21, Storm Chain 8:16 | missile, bone orbit, cone, chain, blizzard |
| Paladin | won 9:14 | won 9:06 | 1:36-9:01 → 2:04-5:18 | Wrath of Heaven, Hammer of Dawn, Hammers of Light (4:11-6:17) | hammer, hammer of light, wrath of heaven, holy aura, toll |
| Barbarian | won 9:12 | won (fought on to 10:58) | 3:16-6:44 → 2:47-7:42 | Endless Rage, Worldbreaker, Warlord's Roar (4:03-8:16) | axes, slam, roar, crescent, ash trail |
| Ranger | **died 8:40** | **won 9:12** | 3:31-8:38 → 3:11-6:12 | none (no partner card taken) | bow, holy aura, sentry, cluster, hawk |
Every run took a different kit from the one before; the first card offer with no skill in it moved from 0:37-2:52 to
1:11-1:36 for the melee heroes (more skills to choose among), and ultimates fired 5-7 times a run (then slowed to
3-4). No errors in any run (`SV.errs`). Lowest life each minute stays around 10-20%: the bot plays to its limit
(it only backs off under 40%), so that measure says little about the payoff; a human playtest should judge it.
