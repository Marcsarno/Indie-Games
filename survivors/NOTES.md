# Survivors: project notes

Read this first, then `PLAN.md` (the first plan), `PLAN-PROGRESSION.md` (unlocks, meta progression, exploration) and `RESEARCH.md` (the user's research brief, the design guide).

## Round 3 (2026-11-19): four heroes, progression, difficulty levels, a map worth walking
The user: keep the gold when you die; save in the browser; level 1 beatable, later levels need unlocks and levels;
balance what exists; add the other two classes; "really flesh this out".
**Files now:** `js/surv.js` (the run: heroes, weapons, waves, cards, HUD, input, hooks `SV_HOOKS`), `js/surv_meta.js`
(save, gold, camp, blessings, unlocks, ranks, difficulty), `js/surv_map.js` (the 88x88 map, barrels, pickups,
shrines, cage, relic altar, goblins, fire rain, edge arrows; **the boot is at its end**). Both pages load all three.
- **Barbarian** (class id `warrior`): two hand axes (an axe in the off hand), auto swings while walking; every third
  blow staggers; RAGE fills from blows that land (capped per swing), drains after 2 s without hits, full = FRENZY
  (attacks +50%, legs +15%, 6 s). Skills: Ground Slam, Whirlwind, Chain Hook (its Tether rune is left out: it moves
  him on its own). Styles: RAVAGER, BLOODLETTER (bleed), BERSERK. Passive cards: Fury, Blood Oath.
- **Ranger**: the bow looses on its own (`svBow`), basic hits build the game's combo points that Piercing Shot and
  Cluster Arrow spend; Sentry, Strafe. Styles: TWIN SHOT, BODKIN POINTS (pierce), FIRE ARROWS (`shootArrow` hook).
  Defence: a TUMBLE (40% faster for 1.2 s after a blow lands). Passive cards: Fleet Foot, Eagle Eye.
- **Save** (`localStorage['sv-save-1']`, `SVM`): gold, blessings, unlocks (`ach`), XP per hero, best per hero and
  level, runs/wins. `?nosave=1` or `?unlock=all` never write it. Test params: `?unlock=all`, `?bless=max`,
  `?rank=N`, `?diff=N`, `?cls=X` (opens that hero).
- **Gold**: kills now and then (3.5%), elites, bosses, chests, barrels, goblins; times the level's gold rate, Greed
  and the Lucky Coin; all kept on death.
- **Camp** (the title): HEROES (pick a hero, its rank and XP bar; pick the level with < >; START), SHRINE
  (12 blessings, 3-5 ranks each, cost = base x next rank, REFUND ALL is free), UNLOCKS (15 achievements and what
  each opens). End screen: gold banked, hero XP and rank-ups, NEW UNLOCKS, the build; tap goes back to camp.
- **Ranks** (per hero, 1-10; XP = kills/8 + seconds/6 + 60 for a win, times the level number): +3% damage and life
  a rank, a reroll at rank 5, and better gear on the hero (`SV_RANK_GEAR`: the Diablo game's armour tiers). Gear is
  only a look: `SV.base` keeps the starting kit's damage, armour, life and block, and rank/blessings scale that.
- **Unlocks**: Barbarian (kill 400 in a run), Ranger (free her from the cage on the map), Nightmare/Hell/Torment
  (win the level before), blessings Luck (kill the Alpha), Banishment (level 20 in a run), Second Life (bank 1000),
  Pilgrim (3 shrines in a run: Growth half price), five relics (from the altar, one a run) that add cards:
  Emberbrand, Thornmail, Bloodstone, Lucky Coin, Second Wind.
- **Levels** (`SV_DIFFS`): NORMAL; NIGHTMARE (monsters x2.1 life, x1.5 blows, waves x1.2, elites every 55 s, 4%
  champions in the horde, night, the King brings 2 guards); HELL (x3.6 / x2.1, fire rain every ~7 s, 7% champions,
  4 guards); TORMENT (x6 / x2.8, everything 15% faster, fire every ~5 s, 10% champions). The King has twice the life
  on every level and calls a ring of skeletons and archers at two thirds and one third of his life.
- **Map**: 55 barrels (walk into one: gold, heal, MAGNET, BOMB, rare chest), 3 shrines with statues (stand 2.5 s:
  30 s of Frenzy, Stoneskin, Greed or Wrath), the caged Ranger, a relic altar with braziers guarded by a sleeping
  elite pack, a treasure goblin every ~2 min, fire rain on Hell and Torment; arrows at the screen edge (S shrine,
  R the cage, ! the relic, G a goblin, B the boss).

## State (2026-11-16): round 2, the Mage and the Paladin
Playable on the phone: https://claude.ai/artifact/AnNxggtQ8t2FsAHznH9mz9 ("Bones Survivors").
The user asked to start with the Mage, using the research brief as the guide. Nothing else is built yet
(no other classes, no meta progression, no unlocks).

A run: drag anywhere to move (WASD on a keyboard); every spell casts itself at the nearest foe; kills drop XP
gems (blue 1, green 3+, purple 10+), the magnet pulls them in; each level offers 3 cards; a spell's level 3 card
opens a choice of its three runes (the Diablo game's skill modifiers). Waves change every 40-70 s; an elite
(a champion with its powers and two of its kind) every 75 s from 1:15 drops a chest (1, 3 or rarely 5 free
upgrades); the Alpha at 5:00; the Skeleton King at 9:00; killing him wins. Best time is kept in the browser.

## Round 2 (2026-11-16): the expanded brief applied
The user sent the expanded brief (sections 20-29, mostly melee; condensed at the end of RESEARCH.md) and asked to
use it to improve the game. Done:
- **Hero choice** on the title: the Mage or the **PALADIN** (the game's own class, built to the brief's "Warden").
  The last pick is remembered; the end screen goes back to the title.
- **Paladin**: his hammer (`swing`, a basic weapon) swings on its own whenever a foe is in reach and he is free
  (`svSwing`, our own swing start so he never walks into foes on his own); he **keeps walking through every swing,
  throw and raised hammer** (`svCarry`, 85% speed); he faces his target (broad frontal arc, open back). **Guard**:
  one charge (shield pip left of his life bar), blocks a whole blow, shoves the nearest foes back and dazes them,
  and primes a **COUNTER** for 2.5 s (the next swing hits all round at 2.5x); it comes back in 6 s. His skills are
  the Paladin's own: Hammer of Light (thrown, returns), Consecrate (holy ground: stand in it to mend and hit harder;
  its level 4 doubles how long it lasts), Judgment (a hammer from the sky). Seraph's Fall is left out (it moves him
  on its own; the brief warns against automatic offensive dashes). Hammer levels: 2 and 5 hit 30% harder, 4 swings
  25% faster, 3 is a **fighting style**: WIDE CLEAVE (all round), LONG REACH (a crescent a tile farther, in front),
  CRUSHING BLOWS (dazes and throws back). Paladin-only passives: Stalwart (guard 25% sooner), Blood Oath (heal 1 per
  foe hit, at most 3 per swing). 3x life (the Mage 2.5x).
- **Two rerolls a run** on the level-up screen (a limited way to redirect offers).
- The **grace after a hit** flashes the life bar white; a **ring at the hero's feet** drawn over everything (in a
  crowd the Paladin was lost).
- **Choice log**: every offer, pick and reroll with time, level, life and foe count; the last 20 runs are kept in
  the browser (`localStorage['sv-runs']`), best per hero in `sv-best2`.
- **Load-order fix**: the page holds the game's frame loop until surv.js has loaded (`__svRelease`); without it a
  frame could run between scripts and the dungeon game's title crashed the loop (seen in about half the test loads).
- Bot runs (focused picks, 3x speed): the Paladin won at 9:20 (2,722 kills; life dipped to a third at times; the
  King died in ~20 s), the Mage at 11:08 (3,027 kills; the King took 2 minutes). One run each: the brief warns a
  lucky run must not decide balance.

## How it works
- `survivors/index.html` loads every script of `diablo-clone/game/js/` unchanged (a `<base href>` points all
  relative paths there), then `survivors/js/surv.js`. The game's systems do the work; surv.js swaps parts by
  reassigning the game's global functions (`update`, `damageEnemy`, `pickup`, `recalcHero`, `hurtHero`, `skillMod`,
  `gainXp`, `dropLoot`, `assignEngage`, `saveGame`, guides, `drawHud`) and handles input first (window listeners in
  the capture phase). **Changes to the Diablo game's files change this game too.**
- **Arena** (`svArena`): the game's forest generator (level 12, a Thornwood) with water removed, the middle
  cleared except ~14% of the trees (cover), the rim of trees kept. 64x64 tiles.
- **Casting** (`svCast`): calls the game's cast function (castMissiles, castFireball, coneOfCold, castMeteor,
  chainLightning), runs its release at once and clears the cast, so the Mage never stops walking. Only casts
  when a foe is within the spell's range. Spell levels: 2 = 25% more often, 3 = rune, 4 = casts twice (an echo
  0.28 s later), 5 = 25% more often.
- **Passives** (the item affixes): Might (+15% damage), Haste (8% faster casting), Vigor (+20 life), Swiftness,
  Magnetism, Renewal (regen), Insight (crit), Ward (armor).
- **Spawning**: groups just outside the view (the portrait view reaches ~6 tiles to the sides and ~20 up/down,
  so a ring round the hero popped monsters in on screen); foes more than 15 tiles away are moved back to just
  outside the view (as Vampire Survivors does); the dead are cleared from the list after 2.2 s.
- **Survivors tuning of the dungeon game**: the Mage has 2.5x life; monster damage grows 10% a level (the
  dungeon curve killed him in two blows at 4:00); 0.3 s of grace after each hit; all of a pack engages at once;
  screen shake capped; gore and blood pressed into the floor wash out over ~25 s (`svWash`, a random pixel order).
- **Monster level** = 1 + minutes x 1.2 (health follows the dungeon game's curve).

## Tests (Playwright, file:// works; no local server needed)
- `node survivors/tools/run.cjs "bot=2&fps=1&speed=3" 700 <outprefix>` (pipe through `python3 survivors/tools/fmt.py`):
  a bot plays a whole run at 3x, prints state every 15 s, screenshots. `bot=1` picks cards at random, `bot=2`
  plays focused (three spells, levels them, then might and haste). `?t=300` starts the clock later, `?fps=1` shows
  FPS, frame ms and the foe count.
- `node survivors/tools/ui.cjs`: screenshots of the title, the cards, the rune choice and the end screen.
- Round 1 bot results: random picks survived 10 minutes (level 16, ~500 kills) but could not kill the King;
  focused picks won at 9:53-10:17 (level 27-28, 1,700-2,650 kills); the King fight took it to a quarter life.
  Frame work 8-20 ms with three updates per frame on the desktop headless browser (so roughly 3-7 ms at 1x).

## Publishing
Republish `survivors/pages/artifact.html` (a copy of the game's artifact page plus `<script src="sv/surv.js">`)
with root `/home/user/Indie-Games` and a files map: `js/<name>.js` -> `diablo-clone/game/js/<name>.js` (all 34),
`sv/surv.js` -> `survivors/js/surv.js`, `music/{forest,set1,set2,set3}.mp3`, `sfx/*.mp3`. Send only changed files
on later publishes (usually just `sv/surv.js`).

## Open questions for the user
1. How does it feel on the phone (FPS with `?fps=1` is not available on the artifact; ask what they see)?
2. Which promise: relaxed destruction, build optimisation or active survival (the brief's next decision)?
3. Run length (10 min now), and whether the view should pull back (more of the arena on screen).
4. A name (working title: Bones Survivors).

## Next steps after round 2 (from the expanded brief)
- Play test both heroes on the phone; ask the melee questions (where did you want to stand, why did a hit miss,
  what did the shield let you do, when could you safely hit the King).
- The King melts to the Paladin (~20 s): give the final fight its own test (phases, a support threat, openings)
  rather than more health.
- Encounter variety per the brief's matrix: a durable priority enemy, mixed fast/slow, one optional objective.
- A Duelist (narrow reach, a step on a button) as the second melee identity, only after the Paladin feels right.
- Read the choice log (`sv-runs`) once the user has played a few runs (ask them to open the page on a desktop, or add
  an export).

## Next steps (proposed, round 1)
- Mage only, deepen first: more Mage spells or evolutions (a maxed spell + a passive = an evolved spell), the
  Mage's Arcane Storm / elemental ultimates as a charge-up button or automatic burst.
- Enemy roles per the brief (chargers already wind up; archers make distance matter); a distinct final test.
- Between runs: gold, a few unlocks; then the other three classes.
