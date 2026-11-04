# Art log (art chat, branch `art`)

Each entry is art the main chat can merge from `art` into `main`. Stats, spawns and loot are the
main chat's; the art chat only changes how things look.

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
