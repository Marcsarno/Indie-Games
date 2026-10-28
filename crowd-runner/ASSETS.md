# Source assets (copied from your `Marcsarno/yola-zombie` repo)

Copied 2026-10-28 into `assets/source/` (48 MB). Originals: `yolanda/zombie/assets/` and
`yolanda/assets/models/` in that repo. Contact sheets of the walk poses: `reference/zombies-walk.png`,
`reference/people-walk.png`.

## Zombies (`assets/source/zombies/`) - rigged GLBs, Mixamo bone names
| File | Look | Verts | Clips |
|---|---|---|---|
| `zombie-patient.glb` | bald patient in gown | 11.8k | 22 (`walk`, `idle`, `attack`, hit/death/react, `crawl`...) |
| `zombie-scrubs.glb` | man in blue scrubs | 12.4k | 22 |
| `zombie-nurse-mod.glb` | torn blue scrubs | 13.9k | 22 |
| `zombie-guard.glb` | big guard in dark vest, boss candidate | 37.7k | 26 |
| `zombie-sprinter.glb` | woman in scrubs, light mesh | 7.2k | 21 |
| `guard-moves.glb`, `nurse-moves-b.glb` | skeleton-only add-on clips: 8-way zombie walk, zombie run, spawn, knockback, crawl | - | 19 / 8 |

## People (`assets/source/people/`)
- Chibi set, rigged, `Walk_InPlace` + `Idle`: `Security_Visitor`, `Baseball_Visitor`, `staff-blue/coral/lilac/teal`,
  `patient-05/06/bob/fullhair/older/silver` (14-16k verts each; `staff.glb` is a different cartoon nurse with `walk`).
- `yola2.glb`: the realistic Yola, 35k verts, 50 clips (pistol/rifle run, strafe, bat/axe swings).

## Weapons (`assets/source/weapons/`)
`pistol`, `shotgun`, `pump_shotgun`, `fire_axe`, `chainsaw`, `wood_bat`, `crowbar`, `sledgehammer`.

## Things to know before using them
- **Size:** 7k-37k verts per character is fine for a few "hero" characters and the boss but far too heavy to
  repeat hundreds of times. The crowd needs low-poly Blender versions (target a few hundred triangles) with
  the walk baked to a vertex-animation texture; these files then become the reference/source for them.
- **Style:** the zombies and Yola are semi-realistic; the visitors/staff/patients are chunky chibi. The squad
  and the horde should be the same style, so a pick is needed (chibi people read better at crowd scale).
- **Licences** (from that repo's notes): Mixamo clips are OK in games; Quaternius/KayKit clips (`ual_*`) are
  CC0; Kevin Iglesias clips must never ship (none of the files copied here are those). The patient/staff/zombie
  meshes are "user-supplied, creator not identified", authorised by you for the Yolanda project only. Confirm
  they can be reused here before anything is published.
