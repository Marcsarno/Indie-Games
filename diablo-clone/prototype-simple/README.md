# Prototype: simple (code-generated pixel art)

A single-scene test of whether a 2D isometric Diablo-style game can get by with art generated
entirely in code. It's built to the "simpler version" constraints: low resolution,
a small palette, ~32px characters, stepped torchlight.

Open `index.html` in a browser. No build step, no dependencies, no image files.

## Controls
- **Move:** WASD / arrow keys, or drag the left joystick (touch or mouse)
- **Attack:** Space / J, or tap anywhere on the right side
- **Swap the knight's team color:** C

Enemies flash when hit, spray blood that stays on the floor, and respawn 6 seconds after dying.

## How it's drawn
| Layer | Technique |
|---|---|
| Resolution | 270×480 native, scaled up by whole-number factors with nearest-neighbor |
| Palette | 51 fixed colors. Every lit pixel is snapped back to the palette through a 32K lookup table. The environment uses an earthy subset; only the knight can use gold and blue, so trim and team colors don't leak into the stone |
| Floor | Per-pixel isometric math: staggered flagstones with beveled edges and speckle |
| Walls, pillars, crate, trough | One generic iso-box renderer plus per-surface texture functions (bricks, arch, banner, statue alcove) |
| Characters | Drawn from primitives (ellipses, lines, polygons) into a material buffer. Each primitive records a surface normal (ellipse = sphere, line = cylinder) and a part number. Shading is quantized Lambert lighting from one upper-left light into each material's ramp; dark interior lines appear only where two overlapping parts of similar color meet. The original edge-based shader is still available with `?shade=edge` for A/B comparisons. Animation comes from re-drawing each frame with changed parameters, so there are no sprite sheets |
| Knight | Redrawn in code from two generated reference sprites (red and blue). One drawing with a team-color material: red gets a scarf, tabard strip and cross shield, blue gets a surcoat and fleur shield. `knight-sheet.png` shows guard stance and attack frames, unlit at 8× |
| Lighting | Per-pixel 3D distance to each light (every pixel stores its height), quantized into 5 bands with 4×4 Bayer dithering, warm tint. Fire and eyes are emissive |
| UI | Health/mana orbs with sphere shading and a wobbling liquid surface, dithered "translucent" joysticks |

Runs at about 8 ms per frame in headless Chromium on desktop.

## Art review tools
See `../tools/art.cjs`, `../art/RUBRIC.md` and the `pixel-sprite` skill in `.claude/skills/`.
- `node tools/art.cjs sheet` renders a contact sheet per character (frames at 4×, on the floor at three light bands, 1×, silhouettes) and prints lint metrics.
- `node tools/art.cjs ab` builds a blind A/B sheet of the old and new shaders for a human to judge.
