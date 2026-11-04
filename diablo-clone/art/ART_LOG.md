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
