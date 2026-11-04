# Dungeon of Bones art kit: instructions for writing assets

You are writing art for **Dungeon of Bones**, a dark isometric action RPG for phones (in the
style of Diablo, with chunky, readable, chibi-proportioned characters about 40 pixels tall).
**All of its art is code.** There are no image files. Every character, monster and prop is a
JavaScript function that builds a small 3D model out of simple shapes, and the game's renderer
turns that model into pixel art. It lights each shape from the upper left, steps colors along a
fixed palette, adds the black outline, draws lines where parts meet, and renders all 8 facing
directions from the same model.

That means:

- **You never pick pixels or colors directly.** You pick shapes, sizes, positions and materials.
  The renderer does the shading, so everything you make matches the rest of the game.
- **Don't paint highlights or shadows.** Shape and the material choice make them.
- **Your file is plain JavaScript that calls one function**: `ART.monster(...)`, `ART.prop(...)`
  or `ART.gear(...)`. It has no imports, no HTML and no other libraries.

The person you are working with will paste your code into **studio.html** (the art kit's preview
page), look at the result, and show you a screenshot if something needs fixing.

---

## 1. Space and units

- Each model is built in its own local space: **+x is forward** (the way it faces), **+y is its
  right side**, **+z is up**. The ground is z = 0.
- **1 unit is about 1 pixel** at the game's normal size (the game also draws characters at double
  detail, so small parts still show).
- One floor tile is about **22.6 units** across.
- Reference sizes:
  - **The hero:** hips at z ≈ 11.5, chest ≈ 18, head center ≈ 28 (the head is drawn 1.5x big),
    about 40 px tall in all.
  - **A skeleton** is a bit taller than the hero. **A wolf** is about 12 high at the back.
  - **A cave spider** is 8 high and wide.
  - **Big bosses** use a `scale` of 1.4 to 1.6.
- **Keep any limb or thin part at radius 0.9 or more**, or it flickers between frames.
- Don't rotate the model yourself to face a direction. The renderer turns it for all 8 facings.

## 2. Shapes (the rig `r`)

All positions are `[x, y, z]` arrays. `mat` is a material from section 4 (`M.STEEL` and so on).

| Call | Makes |
|---|---|
| `r.sph(center, radius, mat, opt)` | a sphere |
| `r.ell(center, [rx, ry, rz], mat, axes, opt)` | an ellipsoid; `axes` = null (aligned) or a frame `[a, b, c]` of unit vectors |
| `r.cone(a, b, ra, rb, mat, opt)` | a round cone (capsule) from point a (radius ra) to b (radius rb): limbs, horns, shafts |
| `r.cyl(a, b, radius, mat, opt)` | a flat-ended cylinder from a to b: posts, wheels, logs |
| `r.box(center, [hx, hy, hz], mat, axes, opt)` | a box with half sizes; `axes` as for ell |
| `r.group(() => { ... })` | treats everything inside as one mass (no lines drawn between those parts) |

Options (`opt`, all optional):
- `mf: p => material or 0`: paints details onto a shape. It's called with a surface point `p` and
  returns another material to use there (or 0 for the shape's own). Use it for stripes, eyes,
  seams, rivets, slits and bands.
- `noShadow: true`: the part casts no shadow (glowing bits, small trims).
- `bias: 1`: draws the part slightly in front of others it overlaps (visor plates).

Helpers:
- `V.add(a,b)`, `V.sub(a,b)`, `V.mul(a,s)`, `V.mad(a,b,s)` = a + b·s, `V.dot`, `V.cross`, `V.len`,
  `V.norm`, `V.lerp(a,b,t)`, `V.rotX/rotY/rotZ(a, angle)`.
- `frameAlong(dir, up)` gives an axes frame pointing along `dir`.

## 3. How shading works (what to do about it)

- **Light comes from the upper left.** Round shapes get a lit side and a shadow side on their own.
- **Lines inside a figure appear only where two separate parts of similar color overlap.** If a
  body made of three ellipsoids should read as one mass, wrap it in `r.group`.
- **Metals** (STEEL, PLATE, BLADE, GOLD) are high contrast with a small bright highlight.
  **Cloth** is soft and low contrast. Choose by substance, not by color.
- **Glowing materials** (FIREM, LAMP, MAGIC, EYE_*, ICE, ARCANE, HOLY, FUNGUS, LAVAM) are drawn
  at full brightness and glow in the dark. Use them for eyes, flames, runes and lamps. Use them
  sparingly; a few pixels is enough.
- **Readability first:** a monster must read as a clear silhouette in black at 40 px. Make heads,
  weapons and limbs distinct, and exaggerate big features (horns, claws, helmets).
- **No randomness:** never use `Math.random()`. Poses are drawn once and cached, so the same pose
  must always give the same shapes. For variety, use fixed numbers.

## 4. Materials

Metal: `STEEL` (bright armor steel), `PLATE` (plate armor), `DSTEEL` (dark steel), `BLADE` (edges,
very bright), `IRON` (dull iron), `CHAIN` (mail), `GOLD`, `RUST`.

Body: `BONE`, `OLDBONE` (yellowed), `FLESH` (raw, pinkish red), `SKIN` (tan skin), `FACE`
(the heroes' light chibi skin), `HIDE` (grey hide), `FUR` (grey-brown fur), `BOAR` (brown hide),
`CHITIN` (insect shell, dark brown), `HORN`, `GOBLIN` (green skin), `OGRE` (olive), `HAIR`
(brown), `HAIR_O` (orange), `SLIME` (green, wet), `SLIME_B` (blue, wet).

Cloth and leather: `CLOTH_RED`, `CLOTH_BLUE`, `CLOTH_GREEN`, `CLOTH_PURPLE`, `CLOTH_DARK`,
`CLOTH_TAN`, `CLOTH_WHITE`, `LEATHER`, `WAX` (candles), `STRAWM` (straw).

Wood and nature: `WOOD`, `PLANK` (light planks), `BARK`, `LEAFM`, `PINE`, `AUTUMNM`, `GRASSM`,
`PUMPKIN`.

Stone: `STONE` (grey cut stone), `ROCK` (brown-grey rock), `RUIN` (pale old stone), `HELLSTONE`
(red-black).

Flat colors: `DARK` (near black: slits, mouths, holes), `VOID` (pure black), `MARK` / `MARKB`
(red paint), `BLOODY` (dark red), `WATERM` (water).

Glowing: `FIREM` (orange fire), `LAMP` (warm lamp light), `EYE_RED`, `EYE_YEL`, `EYE_GRN`,
`MAGIC` (violet), `ARCANE` (blue), `ICE` (pale blue), `HOLY` (gold), `FUNGUS` / `FUNGUS2`
(green glow), `LAVAM` (lava).

Use these names exactly (`M.STEEL` and so on). There are no others.

---

## 5. A monster: `ART.monster({...})`

```js
ART.monster({
  id: 'cave_beetle',          // lower case, digits, _
  name: 'CAVE BEETLE',        // shown over its head
  family: 'skeleton',         // EITHER reuse an existing body (see below) with a look...
  look: { ... },
  newFamily: { ... },         // ...OR give it a body of its own (see below)
  stats: { hp: 20, dmg: [3, 6], speed: 34, reach: 1.3, xp: 18, chest: 12, shadow: 10, pack: true },
});
```

**stats:**

| Field | Meaning |
|---|---|
| `hp` | health. A fallen one has 7, a skeleton 14, a wolf 14, a bear 46, a boss 140–260. |
| `dmg` | `[min, max]` per hit. Usually between 1–3 and 6–11. |
| `speed` | walking speed: 22 is slow, 30 is normal, 54 is a fast wolf. |
| `reach` | melee range in tiles, about 1.1–1.7. |
| `ranged` | optional: `'arrow'`, `'firebolt'` or `'frostbolt'`. Use it with a reach of about 6. |
| `xp` | experience given. Roughly hp × 1.2. |
| `chest` | height of the body in pixels, for damage numbers and labels (8–26). |
| `shadow` | radius of the ground shadow (5–15). |
| `pack: true` | comes in groups. |
| `where: 'out'` | outdoors only. |
| `minLevel` | first floor it can appear on. |

**Option A: reuse an existing body with a look.** These families and looks already exist, and
you can mix their look options:

- **`skeleton`:** `weapon: 'sword'|'bow'`, `shield: true|false`, `armored`, `helm`, `crown`,
  `bone: M.OLDBONE`, `eye: M.FIREM|M.EYE_GRN|...`, `scale`.
- **`fallen`** (small imps and goblins): `staff`, `hood`, `skin: M.SKIN|M.GOBLIN|M.LEATHER`,
  `goblin`, `chief`, `digger`, `sack`, `unarmed`, `scale`.
- **`hound`** (four-legged beasts): `skin: M.FUR|M.HIDE|M.BOAR|M.FLESH`,
  `eye: M.EYE_YEL|M.EYE_RED|M.FIREM`, `wolf`, `bear`, `boar`, `bone`, `scale`.
- **`spider`:** `scale`, `brood` (the queen).
- **`slime`:** `blue`, `big`.
- **`shroom`:** `purple`.
- **`wraith`**, **`treant`**, **`ogre`:** `scale`.
- **`hero`** (humans): `team: 'red'|'blue'|'green'|'tan'|'purple'|'white'`,
  `helm: 'none'|'cap'|'hood'|'barbute'|'great'|'horned'|'crown'`,
  `chest: 'tunic'|'chain'|'brigandine'|'plate'|'darkplate'`,
  `weapon: 'sword'|'axe'|'mace'|'flail'|'greatsword'|'none'`,
  `shield: 'none'|'round'|'kite'`, `hair: 'brown'|'blond'|'orange'|'grey'|'bald'`, `beard: true`,
  `cape: 'red'|'green'|...`. Your own gear looks (section 7) work here too.

When a look is bigger than the normal body (`scale` over 1.3), also give `size: [w, h, ax, ay]`
in the look. Copy the sizes from a similar existing monster: the bear is `[110, 90, 55, 66]`,
the Alpha `[100, 84, 50, 62]`.

**Option B: a body of its own (`newFamily`):**

```js
newFamily: {
  size: [64, 48, 32, 36],   // sprite box in px: width, height, anchorX, anchorY (where its feet touch the ground)
  swing: [ { a: 1, ms: 260, tele: true }, { a: 0.4, ms: 80, mv: 0.5 }, { a: 0, ms: 60, hit: true }, { a: 0.3, ms: 240, open: true } ],
  rig: (look, st) => { const r = new Rig(); /* build the pose */ return r; },
}
```

- **`rig(look, st)`** builds **one pose** and returns the rig. `st.clip` and `st.f` say which:
  - `'idle'`: `f` 0–3, a gentle breathing loop.
  - `'walk'`: `f` 0–7, one full step cycle. Legs swing; the body bobs.
  - `'attack'`: `f` is the index of a key in `swing`, and `st.key` is that key. Pose by `st.key.a`
    (your wind-up amount, any number you like) and `st.key.hit` (the moment of the blow).
  - `'hit'`: `f` 0, flinching.
  - `'death'`: `f` 0–5, collapsing. By `f` 5 it lies on the ground.
- **`swing`** is the attack, as a list of keys:
  - `ms`: how long the key lasts.
  - `a`: your own pose value.
  - `hit: true`: exactly one key, where the damage lands.
  - `tele: true`: the wind-up key that shows a warning glint. Players need about 0.25 s or more of
    wind-up to react.
  - `mv`: tiles it lunges forward during that key (0.3–0.8 for a lunge).
  - `open: true`: the recovery after the blow, when it can be punished.
- Make **every clip** change the shape visibly but keep the parts the same size across frames,
  so nothing pops.

## 6. A prop: `ART.prop({...})`

```js
ART.prop({
  id: 'stone_lantern',
  size: [40, 56, 20, 46],   // sprite box in px: width, height, anchorX, anchorY (its base center)
  footprint: [1, 1],        // tiles it blocks: [1,1] small, [2,2] a cart, [3,3] a forge
  yaw: 0.6,                 // turn in radians, to show it at a good angle
  build: r => { /* shapes, with z = 0 the ground and the base centered on 0,0 */ },
});
```

For scale: a crate is about 10 units across, a tent about 32 wide and 25 high, the potion wagon
42 long, a lantern post 28 tall.

## 7. Gear for the hero: `ART.gear({...})`

```js
ART.gear({ slot: 'helm' | 'chest' | 'weapon', id: 'winged_helm', name: 'WINGED HELM', draw: (r, P) => { ... } });
```

`draw` runs inside the hero's own drawing at the right moment. `P` gives you where things are:

- **helm:** `P.hd` (head center), `P.fwd`, `P.up`, `P.sideR` (the head's forward, up and right),
  `P.helmF` (a frame along those for `ell`/`box`), `P.eq`, `P.st`, `P.J`. **It replaces the whole
  head**, so draw a closed helm (a shell of about 5.5 × 5.4 × 6.8 around `P.hd`, with slits made
  by `mf` returning `M.DARK`). The head is later enlarged 1.5x around its center, so keep it near
  the head's normal size.
- **chest:** drawn over the torso, which is colored the hero's team color.
  - `P.J` holds the body joints: `chest`, `pelvis`, `head`, `shR` and `shL` (shoulders), `hipR`,
    `hipL`, `kneeR`, `kneeL`, `ankR`, `ankL`.
  - Also `P.fwd`, `P.up`, `P.sideR` and `P.tf` (the torso frame).
  - Good uses: pauldrons, a tabard, straps, a cape, a breastplate.
- **weapon:** drawn at the right hand. `P.g` is the grip point, `P.bd` the direction the weapon
  points, `P.wide` a direction across it, and `P.wf = [bd, wide, normal]` a frame for boxes. The
  game already draws a short grip and a pommel. Also set:
  - `swing: 'light'`: quick sword cuts. Anything else gets heavy overhead chops.
  - `length`: the tip's distance from the hand, about 16–28.

  A weapon id may not start with `staff` or `bow`.

---

## 8. The review questions

Before saying an asset is done, check it in the studio's sheet. Every "no" needs a fix:

1. **Light:** is every part lit from the upper left, with no ring of light hugging the outline?
2. **Silhouette:** does the black silhouette row read on its own? Are the head, weapon and limbs
   distinct?
3. **Outline:** is the outline darker than the sprite and the floor everywhere, with no black
   lines inside except real gaps?
4. **Separation:** does it stand out from the floor at the dark, middle and bright light levels?
5. **Animation:** do parts keep their size across frames, with no single pixels popping on and off?

The studio also prints numbers:
- **Light direction** should be above 0.15.
- **Noise** should stay under 12%.
- **Black inside** should be small.

## 9. What to hand back

- **One asset per file**, named after its id (`cave_beetle.js`), containing only the `ART.*` call
  and any helper functions it needs, defined inside the file.
- Start the file with a comment of 2–4 lines on what it is and how it's meant to look or behave
  (for a monster: how it fights).
- No `Math.random`, no `document`, no `fetch`, no imports.

See the six example files for working code of each kind: `monster_bone_captain.js` (an existing
body with a look), `monster_cave_beetle.js` (a new body), `prop_stone_lantern.js`,
`gear_winged_helm.js`, `gear_spear.js`, `gear_pauldrons.js`.
