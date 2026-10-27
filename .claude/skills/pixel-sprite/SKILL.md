---
name: pixel-sprite
description: Create or revise a code-drawn sprite for the diablo-clone game (characters, monsters, props) and check it with the contact-sheet review loop.
---

# Drawing a sprite

Sprites are functions in `diablo-clone/prototype-simple/index.html` that draw primitives into
an `SB` sprite builder. Mechanical rules live in code, not in this file:
- **Shading** comes from each primitive's normal (ellipse = sphere, line = cylinder, `'cyl'`
  = vertical cylinder, `[nx, ny]` = tilted plane) lit from the upper left. Don't hand-paint
  highlights; adjust the shape or its normal.
- **Parts:** each primitive is a part. Dark interior lines appear only where a rear part touches a
  front part of similar color. Wrap shapes that are one mass (a body made of 3 ellipses) in
  `s.group(() => { ... })`.
- **Palette** is fixed; use existing materials (`defMat`). Add a material only for a new substance.
  Materials differ by contrast `span` and thresholded `spec` ([n·H threshold, color]), not texture:
  metal high span with a guaranteed 1 px highlight, cloth low span and no highlight.
- **Animation:** attacks are pose keys with hold times (`ATTACK`); damage, hitstop and effects fire
  on the key marked `hit`. Pose clocks step at 100 ms and pause during hitstop.

# Review loop (required before calling a sprite done)
1. `cd diablo-clone && node tools/art.cjs sheet --out <scratch dir>` renders every sheet and prints lint.
2. Look at the PNG for the sprite you changed (crop and zoom if it is wide). Gate it with the
   five questions in `diablo-clone/art/RUBRIC.md`, naming frames and regions for each "no".
3. Fix the top one or two problems and re-render. Compare the new pass with the best so far
   side by side, in both left/right orders; a disagreement is a tie and keeps the earlier pass.
   Stop after 3 passes.
4. For shader or pipeline changes, run `node tools/art.cjs ab` and let the human judge the blind
   sheet before keeping the change. Don't open `ab-key.json` first.

Don't answer a bad sprite by adding more aesthetic rules here. Fix the shape, the normal or the
code that draws it.
