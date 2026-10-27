# Prototype: simple (code-generated pixel art)

A single-scene test of whether a 2D isometric Diablo-style game can get by with art generated
entirely in code. It's built to the "simpler version" constraints: low resolution,
a small palette, ~32px characters, stepped torchlight.

Open `index.html` in a browser. No build step, no dependencies, no image files.

## Controls
- **Move:** WASD / arrow keys, or drag the left joystick (touch or mouse)
- **Attack:** Space / J, or tap anywhere on the right side
- **Swap the knight's team color:** C

Attacks are held pose keys (anticipation, smears, contact, follow-through). A hit freezes attacker and victim briefly (hitstop), flashes for 50 ms and knocks the enemy back; a kill adds a short screen shake (`?shake=0` turns it off) and a collapse-and-dissolve death. Blood stays on the floor, and enemies respawn 6 seconds after dying.

## How it's drawn
| Layer | Technique |
|---|---|
| Resolution | 270×480 native, scaled up by whole-number factors with nearest-neighbor |
| Palette | 51 fixed colors on dark-to-light ramps per material (stone, steel, bone, cloth red, demon flesh, wood, spider, gold, fire, blue). Ramps lean cool in the darks and warm in the lights, and all fade into a shared near-black tail |
| Floor | Per-pixel isometric math: staggered flagstones with beveled edges and speckle |
| Walls, pillars, crate, trough | One generic iso-box renderer plus per-surface texture functions (bricks, arch, banner, statue alcove) |
| Characters | Drawn from primitives (ellipses, lines, polygons) into a material buffer. Each primitive records a surface normal (ellipse = sphere, line = cylinder) and a part number. Shading is quantized Lambert lighting from one upper-left light into each material's ramp; dark interior lines appear only where two overlapping parts of similar color meet. The original edge-based shader is still available with `?shade=edge` for A/B comparisons. Animation comes from re-drawing each frame with changed parameters, so there are no sprite sheets |
| Knight | Redrawn in code from two generated reference sprites (red and blue). One drawing with a team-color material: red gets a scarf, tabard strip and cross shield, blue gets a surcoat and fleur shield. `knight-sheet.png` shows guard stance and attack frames, unlit at 8× |
| Lighting | Diablo-style light tables: light never mixes RGB, it steps each color up or down its own ramp (9 levels, 4×4 Bayer dither between levels on the environment, one level per character). Static torch falloff is precomputed in world space over the baked scenery and only scaled by flicker each frame; the player's light is computed live per 2×2 block. Fire and eyes are emissive |
| UI | Health/mana orbs with sphere shading and a wobbling liquid surface, dithered "translucent" joysticks |

## Performance
Static scenery (floor, walls, props) is baked into world buffers once; sprites and the UI are rebuilt only when their 100 ms pose step changes.

| Frame time (update + render) | Before this round | Now |
|---|---|---|
| Desktop Chromium, median | 10.4 ms | 3.7 ms |
| CPU throttled 4× (rough phone stand-in), median | 47.9 ms | 15.3 ms |
| CPU throttled 4×, 95th percentile | 74.1 ms | 29.0 ms |

Throttling is only an approximation; this has not been measured on a real phone yet.

## Art review tools
See `../tools/art.cjs`, `../art/RUBRIC.md` and the `pixel-sprite` skill in `.claude/skills/`.
- `node tools/art.cjs sheet` renders a contact sheet per character (frames at 4×, on the floor at three light bands, 1×, silhouettes) and prints lint metrics.
- `node tools/art.cjs ab` builds a blind A/B sheet of the old and new shaders for a human to judge.
