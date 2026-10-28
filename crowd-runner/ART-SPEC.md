# Art spec (read from the three mock-ups in `reference/mockups/`)

Portrait 941x1672 (9:16, phone). Chunky blocky low-poly "toy" look: flat-ish shaded boxes with soft bevels,
bright saturated colours, soft contact shadows, glossy glowing UI. This replaces the realistic/chibi
characters from `yola-zombie` as the visual target; those files stay as animation/rig reference only.

| # | File | What it shows |
|---|---|---|
| 1 | `01-hud-gates-labeled.png` | HUD + labelled gates + weapon pickup |
| 2 | `02-gates-blank.png` | Same scene, gates see-through and unlabelled (labels are a UI layer) |
| 3 | `03-rich-scene-boss.png` | Richer environment, mixed squad weapons, zombie hit splatter, brute boss, blank label panels |

## Camera and layout
- Behind and above the squad, tilted down ~35-40 degrees, wide-ish FOV, road runs to a vanishing point.
- Squad fills the bottom third; gates sit about halfway up; horde and boss in the middle distance.
- Road: three-ish lanes of grey asphalt, white dashed centre line, white curbs, grass verge, then scenery.

## HUD (mock-up 1)
- Top-left pill: blue soldier icon + squad count (shown "3"). Top-right pill: gold coin + coins ("120").
- Dark rounded pills, white bold numerals.

## Characters
- **Soldier:** blocky blue hexagonal helmet (a cap variant exists), tan face, blue uniform, dark-grey tactical
  backpack, black boots, rifle held out front. Seen from behind. Muzzle flash = pale-yellow starburst.
  Mock-up 3 varies loadouts within one squad: rifle, rocket launcher on the shoulder (olive green), minigun
  (red/black), olive backpack on one, cap instead of helmet on one.
- **Zombie:** round green head, glowing yellow eyes, arms stretched forward, coloured shirt (red, purple,
  blue, orange, magenta), brown/blue trousers. Mock-up 3 adds open mouth, torn clothes, scruffy hair, stumbling
  pose. Hit feedback: green splatter burst.
- **Boss (brute):** mock-up 3 only. Much larger than a zombie, purple skin, torn white vest, hunched with arms
  out. Stands in front of the gates at the far end.
- Bullets: thin glowing yellow tracers. Brass casings tumble out of the guns (mock-up 3).

## Gates
- Two side-by-side archways across the road: thick glowing rounded frame (green on left, blue on right),
  translucent glass-like interior. Mock-up 1 label: left `+10` / `SOLDIERS` with a three-people icon; right
  `x2` / `FIRE RATE` with a three-bullets icon. Mock-ups 2 and 3 show them blank (3 has a pale label
  plate across the top): label text is separate from the 3D frame.
- Green = good-feeling, blue = upgrade; colour carries the type, so a red/orange frame is free for penalty gates.

## Pickup
- Roadside white block with a glowing blue top pad; weapon floats above it with sparkles (minigun in mock-up 1);
  small dark price sign with a coin and the cost (`50`). This is the "weapon you can unlock" beat.

## Environment
- Mock-up 1/2: low-poly pine trees (stacked cones on brown trunk), boxy tan/blue buildings, cloud puffs,
  light-blue sky, grass verge, white curb.
- Mock-up 3 (richer level theme, bridge): red steel truss bridge over a river on the right, rocky cliffs,
  street lamps, chain-link fence, stacked tyres, wooden crates, oil barrels, sandbags/concrete blocks,
  red-white striped barriers, trees on a hillside.

## Build notes for Blender
- All props are simple boxes/cones/cylinders with bevels: easy to build with `bpy` primitives, no sculpting.
- Keep every character under a few hundred triangles; limbs are separate boxes so a 2-3 pose walk cycle can be
  baked as a vertex-animation texture (see `RESEARCH.md`, section 5).
- Materials are flat colours with a little roughness/specular; no image textures needed except the gate labels
  and HUD icons, which are drawn on a canvas in the game.
