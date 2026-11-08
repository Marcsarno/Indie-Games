# Art log (art chat, branch `art`)

Each entry is art the main chat can merge from `art` into `main`. Stats, spawns and loot are the
main chat's; the art chat only changes how things look.

## Resume here (art chat state, saved 2026-11-04 before a context compaction)
**Role:** the ART chat. Only art: monsters, hero armor/weapons/headgear, icons, props. Work on branch `art`
(never `main`, no PRs); the main chat merges, wires items/spawns/stats, and republishes the real game
(https://claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g, never republish it from here). `.claude/worktrees/` is
excluded locally in `.git/info/exclude` (reviewer worktrees; never commit them).
**How the user works:** sends concept sheets from ChatGPT (front + back views work best); I rebuild them in the
rig, judge each pass side by side vs the best so far in BOTH left/right orders (rubric in `art/RUBRIC.md`),
at least 3 passes when asked, check regressions (other monsters/looks pixel-identical via
`tools/capture/artcompare.cjs`, frame hashes) and clipping, then publish a review page and log here.
For big batches: one reviewer agent per body family/class in its own worktree, each told to
`git reset --hard <art tip>` FIRST (worktrees start from `main` otherwise), merge into `art`, re-verify
each class/family against its branch after the merge, push.
**Pages:** progress (every monster concept vs game) https://claude.ai/artifact/UvkjQNh5GRCUcxMagioEcM
(source `art/progress/`, statuses in its index.html; not yet updated for hero work) ·
**test copy of the art branch to play** https://claude.ai/artifact/GAaWc5wJU5BP7HeVK9YxLG (source
`art/test-build/`: `index.html` = `tools/pages/game-artifact.html` + `art-test.js`, a TEST-ONLY OUTFIT button
cycling every new set and ranger headpiece; republish with `js/*` from `game/js`, `sfx/*`, music copied from
the main game artifact; for small updates republish just the changed files) · review pages per round below.
**Done (A1-A10):** 18 monsters refined/built with 3+ passes each (A1-A4); warrior helms snug (A5); hero head
1.5x -> 1.0x (A7, A9; `HERO_HK` in actors.js); 31 new hero sets + refined ranger jerkins and mage robes
(A6, A8); 12 ranger headpieces (A10). New monsters and all new hero looks need the main chat to add
MONSTERS levels / ITEM_BASES (tables in each section below).
**Open / next:** user is play-testing the 1.0x head and the outfits in the test copy and may ask for another
pass on specific pieces (weakest: epic ranger helms at game size, wizard cuffs read as mitts, flanged mace
looks like a fork from behind, skirts fixed at the hips). Palette gaps (no pink, true navy, indigo, bronze,
teal): adding cloth ramps needs the user's OK. Not yet done from earlier asks: true BACK views of the A6 sets
(user would need to give ChatGPT the old concept image itself); (B1/B2 done: Mastiff removed, every monster passed again, all concept monsters built; see B2); the main chat should also update `NOTES.md` when it merges.

## A1: refine three existing monsters to the user's concept sheets (2026-11-04)
The user's concept sheets ("EXISTING MONSTERS - REFINEMENT TARGETS", "IMPS - FALLEN KIN") asked to
bring existing monsters closer to them, starting with the weakest. Picked by comparing the
Bestiary with the concepts: Burning Dead, Treant Elder, Fallen One. The spider was already close
to its concept, and the skeleton and goblin were close enough to leave for later.
Progress page (every concept beside the game now): https://claude.ai/artifact/UvkjQNh5GRCUcxMagioEcM; source `art/progress/` (regenerate the in-game sprites with `node tools/capture/progress-shots.cjs art/progress/current 3 <ids>` and update the status list in its index.html).
Review page: https://claude.ai/artifact/WCTMmZEDdjVGUbZYH4eRMn (source and images in `art/review/a1-refine/`)
Review images: `art/review/a1-refine/` (concept crops, before/after strips, silhouettes, every pass).
Tool added: `tools/capture/artcompare.cjs` (before/after strips of the Bestiary frames from two copies of the game).

| What | Where | Change | Review |
|---|---|---|---|
| Burning Dead | `game/js/monsters.js` `skeletonRig`, behind the new look flag `burn: true` (set on the `burning` entry in MONSTERS) | Open dark-iron kettle helm riding above the eye sockets (the burning eyes show; before, the helm swallowed the face); three flickering flames (crown and both sides) with yellow hearts, which gutter out over the death frames; embers glowing inside the ribcage; scorched bands on four long bones; broad pointed steel blade | 3 passes; each won pairwise in both orders. Lint: light 0.20-0.40 except walk d7 at -0.07 (the always-bright flames sit to the right on that facing; the bone shading itself is lit from the upper left) |
| Treant Elder | `game/js/monsters.js` `treantRig` (whole family; only the `treant` entry uses it) | The trunk flares into six roots at the floor; a scowling face (dark brow, deep sockets, bigger green eyes, down-turned mouth) cut into the trunk below the crown; the crown lifted clear of the face and spread into a wide clover of five lobes; long branch arms with four big hooked claws | 3 passes, each won both orders. Light 0.21-0.42, noise < 1% |
| Fallen One | `game/js/monsters.js` `fallenRig`, behind `imp` (= not goblin and not digger) | Wiry limbs and a lean body; belt with an iron buckle and a pointed loincloth flap; grey hooves; a rounder-square head with a brow ridge and pointed chin; angry slanted yellow eyes; big grey ears swept out and back; pale horns | 2 passes (pass 1's box head read as a cube; pass 2 won both orders). Light 0.38-0.53, noise < 3% |
| Fallen Shaman, rebuilt as the Ember Acolyte | `fallenRig`, behind the new look flag `ember: true`; the `shaman` entry's look is now `{ staff, hood, ember }` (its tan `skin: M.SKIN` dropped, so it's red like the concept) | The user disliked the shaman's colors and asked for the Ember Acolyte concept. (It had first changed only as a side effect of the imp body above.) Red imp skin; an open purple hood with a peak and a tail, horns and ears through it; purple capelet with a bone clasp; knee-length ragged brown robe with a rope belt and hanging ends; a tall crooked staff whose hook cradles a glowing orb; a flickering flame held palm-up in the off hand that grows and thrusts forward on the cast. The goblin shaman is unchanged | 3 passes, each won both orders (pass 1's robe was a floor-length sack and the hood flared; pass 2 fixed both; pass 3 lengthened the staff). Cast frames don't clip the sprite box |

All 25 other monsters (everything but these four) render pixel-identical to `main` (checked with artcompare at 1x). Monster
stats, spawns and loot are untouched.

## A2: four new skeleton field variants from front/back concepts (2026-11-04)
The user sent "SKELETONS - FIELD VARIANTS" as front + back pairs (the first turnaround concepts).
Review page: https://claude.ai/artifact/UkpQ7XVjb62LPbpvNJBjKE (source and images in `art/review/a2-skeletons/`).
**For the main chat:** the four are new MONSTERS entries with `minLevel: 99`, so they are in no spawn
pool yet (same trick as the Treant Elder). Their hp/dmg/speed/reach/xp are placeholders copied near the
skeleton and archer; set real levels, stats, packs and loot when wiring them in.

| Id (name) | Look (in `skeletonRig`) | Notes |
|---|---|---|
| `spearman` (CRYPT SPEARMAN) | `weapon: 'spear', chunky, pauldron: 'one', rag: M.CLOTH_BLUE` | Two-handed spear held low across the body; reach 1.6 placeholder |
| `axeman` (BONE AXEMAN) | `weapon: 'axe', chunky, helm: 'open', rag: M.CLOTH_RED` | Open helm with cheek and neck guards; long two-handed axe |
| `gravebow` (GRAVE CROSSBOWMAN) | `weapon: 'crossbow', chunky, pauldron: 'leather', quiver` | Ranged `'arrow'`; aims from the hip to the shoulder on the bow swing (FAMILIES.skeleton swing now also maps `crossbow` to SWINGS.bow) |
| `tombguard` (TOMB GUARD) | `weapon: 'mace', chunky, helm: 'kettle', pauldron: 'both', breastplate, towerShield, rag: M.CLOTH_RED` | Spiked mace, tall red tower shield |

New look options (all off for existing monsters): `chunky` (bones 1.3x thicker), weapons `spear`/`axe`/`crossbow`/`mace`,
`pauldron` (`'one'`/`'both'`/`'leather'`), `breastplate`, `quiver`, `rag` (a cloth material), `towerShield`, helms `'open'`/`'kettle'`.
New material `M.SLATE` (blued steel, steel ramp 28-31 with mid 29), appended at the end of the
defMat list in `rig.js` so no existing material index moves.
Review: 3 passes (pass 1 armor too pale and the axeman's helm a square bucket; pass 2 helm fixed but IRON
went near-black and lost the floor, so pass 1's color was kept; pass 3 SLATE won both orders).
Spearman and axeman use the skeletons' overhead chop; a thrust and a two-handed swing are possible follow-ups.
All 25 pre-existing monsters except the four changed in A1 still render pixel-identical; crossbow aim frames don't clip.

## A3: imps, hounds and ogres from front/back concepts (2026-11-04)
Review page: https://claude.ai/artifact/PkRXomggM975jbhcagyGTL (source and images in `art/review/a3-hounds-ogres-imps/`).
**For the main chat:** seven new MONSTERS entries with `minLevel: 99` (no spawn pool yet; stats are
placeholders), and look changes on four existing entries. Two new ranged monsters shoot `'arrow'` until a
stone/rock projectile exists: `slinger` and `orockthrower`.

| Id (name) | Kind | Where / look | Review |
|---|---|---|---|
| `fallen` (FALLEN ONE = Spearling) | refined | `fallenRig`: plain imps (no knife/sling/staff/unarmed) get a leather pauldron and chest strap, and hold the spear low across the body in both hands when not attacking | 2 passes |
| `knifer` (FALLEN KNIFER) | new | `look: { knife }`: short broad knife held low, off hand clawing; pounce attack | 2 passes |
| `slinger` (FALLEN SLINGER) | new | `look: { sling }`: capelet, stone pouch, sling; FAMILIES.fallen swing maps `sling` to SWINGS.bow (shoot clip whirls then lets fly) | 3 passes; weakest of the round (a sling is thin at this size) |
| `wolf` (WOLF = Grey Pack Hunter) | refined | `look.pale`: pale muzzle (the Alpha does not get it) | 1 pass |
| `hound` (BONE HOUND) | refined | `look.plates`: four flat bone plates down the back replace ribs, spine and spikes; furred pale-tipped tail | 1 pass |
| `ghoulhound` (HELL HOUND = Ember Hound) | refined | `look.ember`: glowing slashes on the flanks, dark lower legs, furred tail, no ribs/scarf/collar | 1 pass |
| `mastiff` (BRIGAND MASTIFF) | new | `look: { skin: BOAR, wolf, mastiff, scale 1.12 }`: stocky legs, droopy ears, short muzzle with jowls and nose, studded collar, curled tail | 2 passes |
| `oclubber`, `orockthrower`, `oshield`, `oenforcer` (OGRE CLUBBER / ROCKTHROWER / SHIELDBEARER / ENFORCER) | new | `ogreRig`, `look.grunt` plus `rock`, `vest`, `helm`, `plank`, `pads`, `cleaver`: iron buckle, torn skirt, slimmer belly, bigger shoulders, arms and head (the Warlord unchanged). FAMILIES.ogre swing maps `rock` to SWINGS.bow | 3 passes |

All monsters outside this list render pixel-identical to before A3 (Warlord, Alpha, Bear and Boar
included); no new monster clips its sprite box in any frame. Progress page updated (18 done).

## A4 imps: three more passes on the fallen family (2026-11-04)
Images in `art/review/a4-passes/imps/` (`<id>.png` before/after, `<id>-passN.png` each pass, A = previous best, B = the pass).
All in `fallenRig` behind `imp` (not goblin, not digger), so the goblins, chieftain, goblin shaman, treasure goblin and digger are unchanged.

| Monster | Pass 1 | Pass 2 | Pass 3 | Pass 4 |
|---|---|---|---|---|
| `fallen` | skin on the RED ramp (brick red; FLESH read near-black), cream BONE horns thicker at the root, mauve ears (HORN) instead of blue-grey: new won both orders, kept | stouter spear haft, leather binding, broad pale leaf head (BLADE): kept | chunkier limbs and body, belt/buckle/flap scaled with it: kept | - |
| `knifer` | same as above: kept | bigger pale leaf knife (BLADE) with an iron guard: kept | chunkier limbs: kept | - |
| `shaman` | same as above (the face now reads red under the hood): kept | stouter staff whose hook curls round the orb and down its front: kept | chunkier limbs + shorter flared robe: old won both orders (rope belt swallowed, legs speckled through the hem), reverted | ears sleeved in the hood's purple: kept |
| `slinger` | same as above: kept | sling cords bow out into a wide teardrop loop, bigger cup and stone, stones grey ROCK (STONE read brown): kept | chunkier limbs: orders disagreed (tie), reverted | bigger capelet, longer sling loop: kept |

Order disagreements: 1 of 14 comparisons. Lint (rig-sheet): light 0.22-0.55, noise < 3.4%. No frame of
idle/walk/attack/hit/death in 8 directions touches the sprite box edge. Every other monster renders
pixel-identical to before (zoom-1 strips `cmp` equal).

## A4: three more passes on all 18 (2026-11-04)
The user asked for at least 3 more passes per monster already built or refined. Four parallel reviewers, one
per body family, each on its own worktree from the art tip a60c814, merged into `art` (merges f9f04a9 and
before). All code stays behind each monster's own look flags or code paths.
Review page: https://claude.ai/artifact/4wfqKxVYEHnsBgCETt5wYM (source `art/review/a4-passes/`: `final-<id>.png`
= before this round vs after; per-family folders hold every pass in both left/right orders).
Checks after the merge: the 22 monsters outside these 18 render pixel-identical to a60c814; none of the 18
touches its sprite box edge in any frame of idle/walk/attack-shoot-cast/hit/death in 8 directions.

- **Skeletons** (`skeletonRig`): burning sword held low point-down, broad SLATE blade, bones 1.2x; spearman spear
  angled up, thicker shaft, bigger head, rag at the back too; axeman skull-size axe head, helm raised, guards angled
  to the light; gravebow longer stock and bent prod; tombguard bigger shield, bigger 9-spike mace. 10 of 15 kept.
- **Imps** (`fallenRig`, imps only): skin `M.CLOTH_RED` (FLESH read near-black), cream BONE horns, mauve HORN ears;
  spearling stouter spear with a BLADE head and chunkier body; knifer bigger BLADE knife with guard; shaman stouter
  staff, hook curls round the orb, ears in hood purple; slinger wide sling loop, grey ROCK stones, bigger capelet.
  12 of 14 kept (see the imp section above for the per-pass table).
- **Hounds** (`houndRig`, new flags `lean`, `bib`, `paws`, `brush`, `slabs`, `collar` on these entries only): wolf
  lean long-legged body, skin now HIDE (shared with the Alpha) with pale throat/belly/toes and a bushy tail; bone hound
  lean body, bone slabs across the back, bushy tail; hell hound lean body, refitted slashes, cream toes, cream skull
  (entry's `bone: M.OLDBONE` dropped), bushy tail; mastiff head 1.45x, heavier ears, darker broader studded collar.
  11 of 14 kept.
- **Ogres + treant** (`ogreRig` grunts, `treantRig`): grunts top-heavy (slimmer belly, broader chest, bigger shoulders,
  arms 1.35x), head hunched forward into a hump, bigger feet; per grunt thicker club, bigger rock and bag, SLATE helm and
  bigger banded shield, cleaver shown flat with bigger pads. Treant crown rebuilt as three big lobes; hands held out,
  bigger claws. 14 of 15 kept (blunter treant roots lost).

Still open: gravebow quiver (no palette color stands off the bones), spear head hidden in the spearman's front view,
axeman cheek guards flare in front, slinger's sling edge-on in pure side views, mastiff still a little bear-like,
grunt back views lack muscle definition, treant root feet.

## A5: warrior helms refitted to the user's snug-fit mock-up (2026-11-04)
Review page: https://claude.ai/artifact/FJXpaZRkGFZMyTNP6JkWko (source `art/review/a5-helms/`, with the mock-up).
**Changed existing art, at the user's request:** the helm code in `heroRig` (`game/js/actors.js`). Closed helms
(barbute, great, crown, bascinet, horned) were shells ~1.25-1.4x the bare head before the 1.5x head scale
(HERO_HK, unchanged); now ~[4.5, 4.45, 5.0] radii, about the bare head with hair. Visor plate, bars and rivets,
the top ridge (now low, no fin), the bascinet spike and snout, the crown circlet and points, the horned helm's
slits, band and horns all scaled to fit. Cap and spangenhelm a little snugger. Mage hats and ranger hoods
unchanged. The Brigand (cap) and Bandit Chief (horned) wear these helms and change with them; every other
monster renders pixel-identical. No hero frame clips (296 frames per helm: idle, walk, atk1-3, hit, death x 8).
3 passes, each won both orders (pass 3 restored a little horn length so the horns read at 1x).
New tool options: `tools/capture/heroparts.cjs <outDir> [zoom] [gameDir] [helm,chest]`.
- **A5 round 2** (the user asked for more): closed shells made upright and narrower ([4.5, 4.2, 5.4] / barbute
  [4.45, 4.15, 5.3], centre up 0.1) like the mock-up; a bigger STEEL face plate [1.0, 3.4, 2.7] with three bold slots;
  a bold barbute T; breathing holes on the bascinet snout; horned helm in M.SLATE; bolder crown circlet and points.
  A BLADE (bright) face plate was tried and reverted (it renders cream like the sword). Still no clipping in 2072
  hero frames; all monsters other than the Brigand and Bandit Chief unchanged.

## A6: hero armor sets from the user's six concept sheets (2026-11-04)
Review page: https://claude.ai/artifact/VX9GYbxTw3wBsZVBX1Guu3 (source `art/review/a6-hero-sets/`; concepts in
`art/concepts/heroes/`). Three parallel reviewers (warrior, ranger, wizard), merged into `art` (97eaa3e); after the
merge each class's looks hash identical to its reviewer's branch, every pre-existing look is unchanged except the
refined ranger jerkins and mage robes, every monster renders identically to c55865a, and no frame clips.
All in `game/js/actors.js`. No items.js, rig.js or material changes.

**Refined existing looks (visible in the game as soon as merged):** the five ranger jerkins (`JERKIN` table,
`jerkinChest()`; the plain jerkins lose their cloak so the quiver shows; the ranger and stalker sets keep theirs);
the three mage robes (`ROBE_STYLE`; backs now cover the legs; magus cream panel + teal mantle/cuffs; archmage gold
stripes + navy mantle); the runed staff (`staff_rune`) is now a crystal in a gold claw (its item icon in items.js
still draws the old orb).

**New looks that need item entries (for the main chat: ITEM_BASES, set definitions, icons, loot):**

| Class | Set | Chest look | Helm look | Weapon / shield look |
|---|---|---|---|---|
| warrior | Militia | militia | cap | |
| warrior | Iron Guard | ironguard | great | |
| warrior | Warbringer | warbringer | horned | |
| warrior | Vanguard | vanguard | barbute | |
| warrior | Crown Guard | crownguard | crown | |
| warrior | Border Warden | borderwarden | spangen | |
| warrior | Steel Knight | steelknight | bascinet | |
| warrior | Roadwarden | roadwarden | kettle (new) | sword (arming sword); round shield |
| warrior | Copper Raider | copperraider | barbute_dark (new) | caxe (crescent axe, heavy swing) |
| warrior | Oathkeeper | oathkeeper | great | fmace (flanged mace, heavy); heater_oath (new shield) |
| warrior | Ember Forged | emberforged | bascinet_gold (new) | fhammer (forge hammer, heavy, two-handed, no shield) |
| ranger | Bramble Scout | jerkin_bramble | | bow_ash |
| ranger | Ashwood Hunter | jerkin_ashwood | | bow_iron |
| ranger | Night Tracker | jerkin_night | | bow_cross (crossbow: own hold/shoot/volley/sky poses, hip bolt case, no back quiver) |
| ranger | Thorn Sentinel | jerkin_thorn | | bow_recurve |
| mage | Wayfarer | robe_way | hat_way | staff_amber |
| mage | Frost Scholar | robe_frost | hat_frost | staff_frost |
| mage | Duskweaver | robe_dusk | hat_dusk | staff_moon |
| mage | Sunwarden | robe_sun | hat_sun | staff_sun |

Substitutes for colors the palette lacks: teal = WATERM, copper = PUMPKIN, ember skirt = AUTUMNM, navy (Night
Tracker) = slate (CLOTH_NAVY rendered royal blue), plum (Magus) = the existing violet.
Still off: mage cuffs read as mitts; flanged mace looks like a fork from behind; skirts are fixed to the hips so thighs
pass through them when walking; the 1.5x head hides much of the front chest from front-right (mantles, neck trim).

## A7: smaller hero heads (2026-11-04)
Review page: https://claude.ai/artifact/WBJFUa3CPmMKgXQAG1Qua5 (source `art/review/a7-heads/`).
**Changed existing art, at the user's request:** `HERO_HK` 1.5 -> 1.2 in `game/js/actors.js` (the head and
everything on it: face, hair, beard, helms, hats, hoods, set crests). Tried 1.5/1.3/1.2/1.1 at phone size: 1.3 still
read as a bobblehead, 1.1 lost the eyes. Then the wizard/conjurer hat (and all colored hats through it) got a
narrower brim (5.9 -> 5.2) and a shorter crown (tip 8.4 -> 7.3); the mage and ranger hoods hug the head
([4.6,5.0,5.0] -> [4.5,4.6,4.75], [4.7,5.1,5.1] -> [4.55,4.65,4.8]); the Magus set's gold ball moved down to the new tip.
Affects every hero look, the townsfolk, the Brigand and the Bandit Chief; every other monster renders identically.

## A8 ranger: four front/back sets (2026-11-04)
From `art/concepts/heroes/ranger-front-back.png` (FRONT and BACK). Review images in `art/review/a8-front-back/ranger/`
(`new-sets.png` concept beside front-right/front/back, `new-sets-1x.png`, `passes-*.png`, `anim-*.png`).
New looks only, all in `game/js/actors.js` (new `JERKIN` entries, `jerkinChestA8()`, `BOWX` entries, an `XBOW` table
for the crossbow looks, a wrist-cuff hook); no items.js, rig.js or material changes. Every existing hero look
(339 looks x 8 dirs x 17 frames x 2 detail levels) and every monster renders identically to 5bc96ed.

| Set | Chest look | Weapon look | Passes (kept) |
|---|---|---|---|
| Marsh Runner | jerkin_marsh | bow_swamp | 3 (p3: wide capelet, narrow shin bands, steel buckle) |
| Frostpath Stalker | jerkin_frost | bow_silver | 3 (p3: steel buttons, small fur cuffs; p1/p2 tied) |
| Dune Strider | jerkin_dune | bow_arbalest (crossbow poses) | 4 (p4: copper prod, gold caps; p3 tied p1) |
| Blackthorn Warden | jerkin_warden | bow_thorn | 4 (p2: long tabard; pointed tabards lost twice) |

Substitutes: teal-green tunic = PINE (WATERM read blue), pale blue coat = CHAIN (the lightest blue-grey cloth),
near-black coat = CLOTH_SHADOW, violet = CLOTH_PURPLE, rust = AUTUMNM sleeves + MARK scarf, tan vest = STRAWM,
bronze = PUMPKIN prod with GOLD fittings, dark bow woods = HAIR (swamp) and CHITIN (blackthorn), cream recurve = WAX.
Still off: the teal reads green; the pale coat is slate rather than sky blue; the Warden's tabard is square, not
pointed; shin bands read a little like socks from front-right; the head hides the chest details from front-right.

## A8: twelve more hero sets from front-and-back concepts; no cloak on warrior sets (2026-11-04)
Review page: https://claude.ai/artifact/A1wxCsVvkZgwSqe9cTGcpo (source `art/review/a8-front-back/`; concepts
`art/concepts/heroes/*-front-back.png`). Three parallel reviewers merged into `art` (262c5fe); each class hashes
identical to its reviewer's branch after the merge; every monster renders identically to 5bc96ed; no frame clips.
**Changed existing looks:** the green base-outfit cloak no longer draws on the 15 warrior set looks (`SET_CAPE`
keeps it for the warden/ranger/stalker item sets); five A6 sets got a back panel (`SET_BACK`).
**New looks that need item entries (for the main chat):**

| Class | Set | Chest | Helm | Weapon / shield |
|---|---|---|---|---|
| warrior | Gatewatch | gatewatch | nasal | spear (Leafblade Spear, light, reach 26); board (shield) |
| warrior | Dusk Duelist | duskduelist | skullcap | sabre (Silver Sabre, light, 20); buckler_steel |
| warrior | Winter Bulwark | winterbulwark | great_flat | faxe (Froststeel Axe, heavy, 16); heater_frost |
| warrior | Royal Executor | royalexecutor | helm_royal | kgsword (Kingsguard Greatsword, heavy, 27, no shield) |
| ranger | Marsh Runner | jerkin_marsh | | bow_swamp |
| ranger | Frostpath Stalker | jerkin_frost | | bow_silver |
| ranger | Dune Strider | jerkin_dune | | bow_arbalest (crossbow look, via XBOW) |
| ranger | Blackthorn Warden | jerkin_warden | | bow_thorn |
| mage | Tidekeeper | robe_tide | hat_tide | staff_pearl |
| mage | Cinder Sage | robe_cinder | hat_cinder | staff_cage |
| mage | Runebinder | robe_rune | hat_rune | staff_runestone |
| mage | Rose Oracle | robe_rose | hat_rose | staff_rose (a short wand) |

Palette gaps (no new materials were added): pink reads red (Rose Oracle), navy reads royal blue (CLOTH_NAVY),
teal reads blue-green (WATERM), taupe reads pale grey (OLDBONE). Adding a pink and a true navy cloth ramp would
fix several sets at once; that is a palette change for the user to approve.

## A9: hero head 1.0x and a playable test copy (2026-11-04)
`HERO_HK` 1.2 -> 1.0 at the user's request (1.2 still read wider than the shoulders). Everything on the head scales
with it. Test copy of the art branch for play-testing: https://claude.ai/artifact/GAaWc5wJU5BP7HeVK9YxLG (source
`art/test-build/`: the game page plus `art-test.js`, a TEST-ONLY script, not part of the game, that gives every new
set look temporary item entries and an OUTFIT button cycling the hero through them). The main game artifact was not
touched. Republish the test copy from `art/test-build/index.html` with the files map in the A9 commit message notes.

## A10: ranger headpieces (2026-11-04)
From `art/concepts/heroes/ranger-headpieces.png` (FRONT and BACK). Review images in `art/review/a10-ranger-heads/`
(`headpieces.png` concept beside front-right/front/back, `headpieces-1x.png`, `passes-*.png`).
New helm looks only, in `game/js/actors.js`: a `RANGER_HEAD` table drawn in the bare-face branch of `heroRig`, and
`HAIR_HELMS`, which keeps the `helm === 'none'` spiky hair under a headpiece (true all of it; 'band' no fringe; 'low'
no fringe and no crown spikes; 'fringe' only a lowered fringe and the painted hairline). No items.js, rig.js or
material changes. Every existing hero look (429 looks x 8 dirs x 13-15 frames, 3 classes) and every monster (40 ids)
renders identically to c5d6b3e; no clipping (1152 frames per headpiece: idle, walk, shoot, volley, skyshot, toss,
vault, hit, death x 8 dirs x 2x/1x, bow and crossbow).

| Headpiece | Helm look | Passes (kept) |
|---|---|---|
| Trail Bandana | bandana | 3 (p2: a band that reads over the hair, knot and two tails; p3 slimmer band lost both orders) |
| Greenwood Cap | greenwood | 4 (p4: a lower crown drawn out to the back with a trailing point; p3 straw brim lost to gold) |
| Shadow Hood | shadowhood | 4 (p4: leather lining edge round the face, fringe lowered so it stays inside the hood) |
| Hawk Scout Circlet | circlet | 4 (p2; p3 bigger ear guards and p4 darker band both tied) |

Substitutes: rust-red cloth = MARK, ochre brim = GOLD (STRAWM read khaki), slate-blue hood = HIDE (the grey-blue matte
ramp), hood lining and circlet = LEATHER, hood seam = CLOTH_DARK, feather = CLOTH_WHITE with CLOTH_RED bands.
Test copy: `art/test-build/art-test.js` has helm-only OUTFIT entries (TRAIL BANDANA etc.) that change just the helm.
Still off: the circlet's leather band and ear guards are close in tone to the orange hair's shadow and the jerkin, so
they read weakly at 1x; one pixel of fringe can show at the top of the shadow hood from the back; the greenwood cap
reads rounder than the concept's peaked felt cap.

### A10b: eight more ranger headpieces
From `art/concepts/heroes/ranger-epic-helms.png` and `ranger-more-headpieces.png`. Review images in the same folder:
`epic.png`, `more.png` (concept beside front-right/front/back), `epic-1x.png`, `more-1x.png`, `passes-*.png`, and the
both-order pair sheets `pairs-epic-p1-p2.png`, `pairs-more-p1-p2.png`, `pairs-p2-p3.png`. Same code path
(`Object.assign(RANGER_HEAD, ...)` after the A10 table); hair mode 'lowf' (hair at the back, lowered fringe, no crown
spikes) added, and the lowered fringe is used under every helm so no lock pokes through a shell. Helmets sit back from
the face like the hoods, so the face stands out of the opening. Same checks as A10, all clean (429 existing looks and
40 monsters identical to c5d6b3e; 1152 frames per headpiece, none clipped).

| Headpiece | Helm look | Passes (kept) |
|---|---|---|
| Hawkward Helm | hawkward | 3 (p2: shell set back from the face, smaller bronze wings; p3 gold wings lost both orders) |
| Moonstalker Cowl | moonstalker | 2 (p2: CLOTH_SHADOW indigo; p1's CLOTH_NAVY read royal blue) |
| Wyrmhide Sallet | wyrmhide | 3 (p2: rows of scales, low crest; p3 bigger tipped brim showed as an arc from behind, tied/lost) |
| Sunfalcon Crownhelm | sunfalcon | 2 (p2: IRON for dark steel; p1's DSTEEL read light grey and covered the face) |
| Leather Scout Cap | scoutcap | 3 (p3: dark bill further out, bigger ear flaps with a dark rim) |
| Woodsman Hat | woodsman | 3 (p3: no hair mass, so no orange ring between brim and crown) |
| Winter Tracker Cap | wintercap | 2 (p2: lowered fringe stays under the fur rim) |
| Trailguard Helm | trailguard | 3 (p3: no hair mass, so no orange ring on the brim) |

Substitutes: bronze = PUMPKIN, blue-grey steel = SLATE, dark steel = IRON, indigo = CLOTH_SHADOW, violet gem = MAGIC
(glows), scaled green = OGRE with GOBLIN rows, cream fur = WAX, dark leather (panels, bill, flap rims) = HAIR, hat band
= CLOTH_DARK, leaf badge = GOLD. Test copy: eight more helm-only OUTFIT entries.
Still off: the hawk wings read as orange flames more than feathers; the sallet's bronze brim is thin from the front
and its crest reads as a spike; the woodsman's pinched crown and leaf badge are small at 1x; the winter cap's fur rim
reads as a white headband across the brow; the scout cap's ear flaps are faint against the jerkin.

## B1: Brigand Mastiff removed (2026-11-04)
The user didn't like the Mastiff and asked to remove it from the game. The `mastiff` MONSTERS entry and every
`look.mastiff` branch in `houndRig` are gone (it never spawned: it was `minLevel: 99`). **For the main chat:**
drop any mastiff item/spawn wiring if you had started it. All 39 remaining monsters render pixel-identical to
before (artcompare zoom 1, `cmp` equal). Its card is off the progress page.

## B2: another pass on all 39 monsters, and seven new ones (2026-11-04)
The user asked for another pass on every monster ("even the ones you think are done") and to build the missing ones.
Seven parallel reviewers (one per family, worktrees reset to 5d022a4), 3+ passes per monster, pairwise judged in both
orders; merged into `art` (merges 55bc01c .. b2-new round 2). After every merge each family was re-verified
pixel-identical to its own branch; player heroes hash-identical to before the round (3 classes, all clips).
Review page: https://claude.ai/artifact/2jxgvecw5Ay861S1hw1g8d (source `art/review/b2-passes/`, `build_page.py`
regenerates it; every pass image is in the per-family folders). Progress page updated (all concepts now done).
Test copy republished with this round's `monsters.js`/`actors.js` (new monsters don't spawn there either).

**Passes (look changes only, each behind flags only that monster sets):**
- Skeletons (`skeletonRig`): skeleton toward its concept (SLATE pauldron, red skull shield, torn loincloth, sash;
  flag `sk`); spearman spear across the body, navy rag; axeman diagonal axe; gravebow pauldron + thigh quiver;
  tombguard rolled brim; archer longer bow held out + back quiver; burning taller flared helm; lich bell robe + hood;
  skelking draped cloak, fur collar, greatsword.
- Fallen (`fallenRig`): goblin toward its concept (lean, vest, dagger instead of spear, nose, cap; flags `gob*`,
  `FALLEN_GOB_B`); chieftain, goblin shaman, treasure goblin, digger refined; imps get purple bat ears, pale hooves,
  bigger heads; shaman hood set back.
- Hounds (`houndRig`, `look.b2`): wolf, alpha (silver crest), bone/hell hound crescent horns, bear, boar (rebuilt).
- Ogres (`ogreRig`) and treant: grunt tusks/arms/belts, shield, cleaver, warlord crown; treant crown and eyes.
- Spiders (`spiderRig`, now table-driven `SPIDER_V`): cave spider toward cave_skitter, broodmother egg sacs, knee spurs.
- Shroom/sporecap, slime/blueslime, wraith rebuilt shapes and faces. Brigand (hood + scarf mask, helm `bhood`),
  bandit chief (fur collar, weapon `baxe`, spiked pauldrons); hero-rig changes gated by `look.bandit`.

**For the main chat: new MONSTERS entries (all `minLevel: 99`, placeholder stats; set levels, packs, loot):**

| Id | Name | Family | Notes |
|---|---|---|---|
| `cavebat` | CAVE BAT | `bat` (new `batRig`) | hovers, dive attack; `pack: true` |
| `bogtoad` | BOG TOAD | `toad` (new `toadRig`) | hop walk, tongue-lash swing |
| `restless` | RESTLESS DEAD | `zombie` (new `zombieRig`) | slow shamble, grab swing |
| `spitter` | VENOM SPITTER | `spider`, `look.spit` | ranged `'arrow'` until a venom projectile exists (rears up and spits a green glob) |
| `stoneback` | STONEBACK SPIDER | `spider`, `look.stone` | slow and heavy |
| `broodguard` | BROOD GUARD | `spider`, `look.guard` | stilt-legged |
| `xbowman` | BANDIT CROSSBOWMAN | `hero`, `bandit: 'xbow'` | ranged `'arrow'`; crossbow `XBOW.bow_bandit` |

**Known weak spots:** bone/hell hound horns read a little like ears from behind; the Alpha is very dark; ogre backs
show flat shading bands; enforcer cleaver very pale from the front; gravebow's quiver hidden in the pure front view;
cave bat membrane shows thin CHITIN highlights; Restless Dead's pale flesh is close to skeleton bone at 1x; bog toad
throat is ochre (no pale green in the palette); crossbowman's bone prod reads paler than the concept's wood.

## B3: Restless Dead head fix (2026-11-04)
The user disliked the brown on the Restless Dead's head (B2 pass 6-7 had added a dark balding scalp patch and hair
wisps). Removed both: the head is now a bald pale skull like the concept. Added big dark round eye sockets with a
small red glint deep in each (front views now read as a skull face). Kept: won both orders vs B2's final. Other
monsters pixel-identical; 304 frames, 0 sprite-edge hits; no page errors. Review/progress/test pages updated.

## B4: bosses and elites from the user's sheets (2026-11-05)
Concepts: `art/concepts/monsters/` (bosses-sheet, elites-sheet and one crop per character). The user approved large
identity changes and asked to "get away from the bobblehead style": heads follow the concept proportions.
Five reviewers (worktrees from db71e61), 3-5 passes each, judged in both orders; merged into `art`, each slice
re-verified pixel-identical to its branch, player heroes hash-identical. Post-merge fix by the art chat: the Bulwark's
helm moved from CLOTH_NAVY (royal blue) to SLATE with an IRON brim.
Review page: https://claude.ai/artifact/U8ZU9PUjZiF46HLshWdwxS (source `art/review/b4-bosses/`, `build_page.py`).

**Rebuilt in place (look only; ids, names and stats unchanged):**
- `alpha` as Greyfang: `look.gf` in houndRig (HIDE coat, BONE mane tufts, scar, yellow eyes, lean).
- `banditchief` as Rook: actors.js, all gated by `bandit: 'rook'` (`ROOK_B`, `rookcap`, `rcleaver`, `rookShield`,
  `rookBody`). Now unused leftovers: `GEAR_EXTRA.helm.bchief` and the `bandit === 'chief'` block. **Main chat:**
  rename to ROOK, BANDIT CHIEF if wanted; `LEADER_POWERS.banditchief` in elites.js is untouched.
- `skelking`: `king = !!look.crown` in skeletonRig (no bigHead for him, plate armor, crimson cape, eyes EYE_RED).

**New MONSTERS entries (all `minLevel: 99`, placeholder stats; main chat sets levels/spawns/loot):**

| Id | Name | Family / look | Notes |
|---|---|---|---|
| `gorr` | GORR (title THE MINEBREAKER) | ogre, `look.gorr`, scale 1.5 | boss keys like the warlord (`unique`, `boss: 'slam'`); new `SWINGS.slam` overhead hammer swing via FAMILIES.ogre swing |
| `ironjaw` | IRONJAW ENFORCER | ogre, `grunt` + `ironjaw`, scale 1.2 | `elite: true` |
| `ashhex` | ASHHEX SHAMAN | fallen, acolyte look + `ashhex`, scale 1.15 | `elite`, `leader`; ranged `'firebolt'` |
| `gravespine` | GRAVESPINE HOUND | hound, `b2: 'gs'`, scale 1.15 | `elite: true` |
| `bulwark` | CRYPT BULWARK | skeleton, `helm: 'bulwark'`, `bulwark`, scale 1.27 | `elite: true` |

**Weak spots:** Greyfang's mane hides his ears from the front; Gravespine's horns resemble the Bone Hound's; Ashhex's
hood is blobby from behind; Rook's key is small at 1x.
Queued next (B5): secret bosses Old Mossback, Drowned Warden, Flintback Matriarch, Brother Cinder.

## B5: secret bosses "The Forgotten" (2026-11-05)
Concepts: `art/concepts/monsters/secret-bosses-sheet.png` + crops. Four reviewers (worktrees from 3cfcf82), 4-7 passes
each, both orders; merged, each re-verified pixel-identical to its branch; all other monsters unchanged.
Review page: https://claude.ai/artifact/CyW6uZHyzvQcJXftLNf4SY (source `art/review/b5-secret/`).
**For the main chat:** all four are new MONSTERS entries with `minLevel: 99`, `unique: true` and placeholder stats;
you decide where to hide them and which boss AI they get (none has a `boss:` key except the Warden's suggested 'slam').

| Id | Name (title) | Family / look | Notes |
|---|---|---|---|
| `mossback` | OLD MOSSBACK (OF THE HIDDEN GROVE) | hound, bear b2 shape + `look.moss`, scale 2.4, size [170,150,85,104] | `charge: true`, `where: 'out'` |
| `warden` | THE DROWNED WARDEN (KEEPER OF THE FLOODED CRYPT) | skeleton, `look.warden`, scale 1.65 | suggested `boss: 'slam'`, `minions: ['skeleton','spearman']`, `calls` text |
| `flintback` | FLINTBACK MATRIARCH (SEALED MINE POCKET) | spider, `SPIDER_V.flint` / `look.flint`, scale 1.45 | melee |
| `cinder` | BROTHER CINDER (BURIED SHRINE) | fallen, acolyte look + `look.cinder`, scale 1.6 | ranged `'firebolt'`; bell swings |

**Weak spots:** Flintback's slabs look boxy; Warden's helm greyer than the concept; Mossback's mushroom caps dull tan.
**Existing bug spotted (not changed):** the Dire Bear's and Gorr's sprite canvases are a little short, so a few death
frames (bear dirs 2-4, Gorr 4-5) are cut off at the bottom; the fix is a taller `size` on those entries.

## B5 redo (in progress, paused by the user, 2026-11-05)
The user found all four B5 secret bosses bad. Old Mossback was being redone by the art chat directly (paused):
the moss lumps and hanging hanks were removed (they read as warts), body and legs now share one part (no seams),
cranium/snout/jaw are one shape, the head is held further forward at a normal 1.2x scale (1.6x made a bobblehead),
the neck is slimmer, the moss is painted onto the fur (also on the B2 bear hump, which had covered it), smaller eyes
with no dark sockets, a black nose, tan caps. All behind `look.moss`; the Dire Bear and other hounds are unaffected.
**Next:** the user will send simpler concepts (a plain bear, a plain skeleton) without moss and mushrooms: small
organic surface detail doesn't suit code-drawn sprites. Flintback and Brother Cinder redos not started.

## B5 fur experiment: Old Mossback (2026-11-05)
The user asked why the bear looked like "round balls" instead of fur. Cause: every primitive is lit on its own, so
each ellipsoid shows its own highlight. Added an opt-in renderer hook, `ff(P, n)` on a primitive (rig.js rasterizer;
carried through `scaleRig`, `tipRig` and the hound head scale-up): it may return `{ n, b }`, a replacement normal and a
tone offset. No primitive outside Mossback sets it, so every other sprite is unchanged (all monsters cmp-identical,
hero hashes identical). Mossback uses it to (1) blend normals toward one big body ellipsoid so the mass shades as one
body, (2) lay short staggered fur clumps (+1/-1 tone) running back and down, on body, legs and head; (3) the wolf
ruff, the neck and 14 low swept-back spine tufts plus flank tufts join the body part (the ruff, head-scaled, had been
the stray round "dome"). Coat now `M.HELLSTONE` (red-brown, matches the user's v3 concept). The same treatment could
carry to the Dire Bear, Greyfang and the wolves if the user likes it.

## B5: Old Mossback deleted (2026-11-05)
After the plain-bear, three-view, fur and front-view passes the user decided the bear "just isn't working out" and
asked to delete it. The `mossback` MONSTERS entry is removed. Its houndRig code (`look.moss` / `MB`, `look.mossy`)
and the opt-in `ff` fur hook in rig.js stay in place but nothing uses them (every monster and the heroes render
identically with or without them); delete them if you want the code smaller. **Main chat:** drop any mossback
wiring. Remaining secret bosses: Drowned Warden, Flintback Matriarch, Brother Cinder (user's simpler v2 concepts in
`art/concepts/monsters/*_v2.png`).

## B6: Hellbound infernal bosses, 1 of 4: Malgrath (2026-11-06)
Concepts: `art/concepts/monsters/infernal-bosses-sheet.png` + crops (malgrath, vexara, azhruk, baelgor). Built one at a
time by the art chat, judged against the concept in both orders.
**Malgrath, the Iron Butcher** (`malgrath`, family ogre, `look.malg`, scale 1.5, own taller canvas size [140,154,70,112]
so death frames don't clip): reuses Gorr's body (`GR` is true for him) in FLESH red, with a dark IRON riveted apron and
pauldrons, leather braces crossed on the back, a belt with an iron buckle, studded iron wrist bands, cloven hooves,
cream ram horns curling round the ears (no top-knot), and a big notched cleaver with a hole (CHAIN grey) on the
heavy chop swing. 4 passes kept (iron instead of blued steel; grey cleaver; plain horns; tighter curl).
Placeholder stats near Gorr, `unique: true`, `minLevel: 99`. Other monsters cmp-identical; 304 frames, 0 edge hits.
**Malgrath v2 (user: "colors are wrong, looks like an old lady demon, not scary or dark"):** skin BLOODY (deep blood
red) instead of FLESH, horns BOAR tan with HAIR tips instead of cream, eyes glow FIREM, apron/pauldrons/wrist bands
CLOTH_DARK (brown-black iron) with IRON rivets instead of slate with white rivets, HAIR skirt, an IRON cleaver, and
two straight straps down the back instead of a crossed X. Others still cmp-identical; 0 edge hits.
**Malgrath v3 cleaver (user: 'looks like a plain sheet of metal'):** own MG branch: iron pommel, wrapped grip, iron collar; IRON blade with a bright BLADE honed edge and a DSTEEL bevel line, three uneven chips, two MARKB blood smears, two RUST patches, a hanging hole, a thick DSTEEL spine. The Enforcer's cleaver is unchanged.
**Malgrath v4 grip (user: the hand grips the blade, not a handle):** the fist (radius ~3.6) had covered the whole grip. The grip now runs from a pommel below the fist to an iron collar well above it (blade starts 7 units up the haft), so a wrapped handle shows between hand and blade. 0 edge hits.
**Malgrath v5 (the art chat's own ideas, user OK'd):** molten cracks (a few bold wavy veins: FIREM core, MARKB rim,
on the bare hide of body, back and arms; they pulse wider/narrower over the 4 idle frames); a forge-hot FIREM strip
on the cleaver edge; glowing mouth and bigger FIREM eyes; three meat hooks on short chains at the left of the belt; a
broken shackle chain hanging from the left wrist; a hunched body (`MALG_B_OF`: hunch 0.18, longer arms, shorter
legs) with the head thrust forward of the shoulders; tusks moved low and splayed so they no longer cover the eyes.
Other monsters cmp-identical; 304 frames, 0 edge hits.
**Malgrath v6:** the wavy veins became a jagged crack network (borders of a 3D cell noise, cell 5.6, glowing FIREM
core with a MARKB rim, still pulsing on idle); three iron spikes on each pauldron; FIREM smoldering horn tips;
shins darken to CLOTH_DARK toward the hooves. Others cmp-identical; 0 edge hits.

## B6, 2 of 4: Azhruk, the Furnace Guard (2026-11-08)
`azhruk` (family ogre, `look.azh`, scale 1.5, size [150,156,75,112], `unique`, minLevel 99, placeholder stats above
Malgrath; swings `SWINGS.slam` like Gorr). Gorr's body and two-handed hammer handling (`GR` includes AZ) sealed in
plate: armor material ROCK (one step darker via bias), CLOTH_DARK lames; a furnace grate on the chest with three
glowing FIREM slits and one on the back; a flat-topped bucket great helm with a glowing visor slit and tan bull
horns; angular pauldrons of three stepped dark-rimmed plates; knee and elbow cops; iron belt and buckle, plate
tassets, a torn red tabard front and back; an armored tail of segments ending in a hook; a block of iron for the
hammer head. Passes: CHITIN read as a shiny chocolate blob -> ROCK; bone rivets -> iron; tabard and slits enlarged;
ball helm -> bucket; balloon pauldrons -> stepped plates. Other monsters, Malgrath included, cmp-identical; 0 edge hits.
