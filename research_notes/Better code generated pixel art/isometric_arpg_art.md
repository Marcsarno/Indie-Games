# Isometric ARPG Character & Environment Art: Production Pipelines and Technical Specs (Diablo 1/2, Hades, Dead Cells, indie pixel ARPGs)

Scope note: for an indie developer building a pixel-art 2D isometric Diablo clone (mobile portrait, ~270x480 native, sprites drawn by code). Sources are labeled by reliability: **[PRIMARY-CODE]** = read directly from reverse-engineered/open-source engine code (DevilutionX, OpenDiablo2) during this research; **[PRIMARY-DEV]** = developer's own words/article; **[SECONDARY]** = journalism/book excerpt paraphrase; **[COMMUNITY]** = modding forums/tutorials/hobbyists. DevilutionX and OpenDiablo2 are reimplementations, so their constants reflect what the original data files require, but generation code (e.g., light tables) in DevilutionX is a faithful re-creation of the original's tables, not Blizzard's own source.

## Diablo 1 (1996): how characters, monsters, tiles, palette and lighting were produced and structured

### Takeaway
Diablo 1 is a 256-color, palette-indexed game whose characters/monsters were built as 3D models and rendered down to 2D sprites in 8 directions; tiles are 64x32 isometric diamonds assembled from 32-pixel-wide pieces; lighting is per-tile, 16 discrete levels implemented as 16 palette-remap ("light") tables, with a linear radius falloff; monster variants are mostly palette swaps (TRN files) of the same sprite sheets; animated water/lava is done by palette cycling.

### Cited Findings
**Art production (3D→2D)**
- Diablo "would display graphics in 2D by first paring down three-dimensional models"; Condor's artists could render 2D art but building 3D models was "beyond their skill set," so Blizzard co-founder Allen Adham sent two Blizzard artists who took Michio Okamura and the other Condor artists "on a whirlwind tour through modeling and animating 3D characters" [SECONDARY, book excerpt from *Stay Awhile and Listen*, Ch. 9, via search summary] — [Destructoid excerpt](https://www.destructoid.com/the-origin-of-diablo/)
- Michio Okamura: "For Diablo, I did the concept art, the model, and the mapping"; Ben Haas and Pat Tougas "took over animations when they came on board" [PRIMARY-DEV quote in book excerpt] — [Destructoid excerpt](https://www.destructoid.com/the-origin-of-diablo/)
- Artist Kelly Johnson: "When a creature died, it had to fit in a certain space" — which is why many death animations involve the body disintegrating (i.e., sprite frame bounding boxes constrained death anims) [PRIMARY-DEV quote] — [Destructoid excerpt](https://www.destructoid.com/the-origin-of-diablo/)
- A later Blizzard North-era developer described Diablo as sprite-based "so you were able to really hand-tool that art" [SECONDARY, interview remark] — [GameBanshee Hellgate: London interview](https://gamebanshee.com/kwr43)
- The look and tech of Diablo was reportedly based directly on a screenshot of X-COM (isometric view inspiration) [SECONDARY] — [Technovore summary](https://thetechnovore.com/2019/03/09/find-out-how-diablo-was-made/)
- Brevik's GDC 2016 Classic Game Postmortem describes Diablo evolving "from a single-player, turn-based claymation DOS game" [PRIMARY-DEV talk, page summary only; no transcript available] — [Game Developer](https://www.gamedeveloper.com/design/video-i-diablo-i-a-classic-game-postmortem); [GDC Vault](https://gdcvault.com/play/1023469/Classic-Game-Postmortem)

**Directions**
- 8 directions, enumerated South, SouthWest, West, NorthWest, North, NorthEast, East, SouthEast; turning is `(dir ± 1) % 8`, opposite is `(dir + 4) % 8` [PRIMARY-CODE] — [DevilutionX Source/engine/direction.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/direction.hpp)
- Missiles additionally use a 16-direction enum (`Direction16`) [PRIMARY-CODE] — [DevilutionX Source/tables/misdat.h](https://github.com/diasurgical/devilutionX/blob/master/Source/tables/misdat.h); missile sprite table lists e.g. Fireball 16 frames, 96 px wide, with 16 per-direction frame-length entries [PRIMARY-CODE] — [DevilutionX assets/txtdata/missiles/missile_sprites.tsv](https://github.com/diasurgical/devilutionX/blob/master/assets/txtdata/missiles/missile_sprites.tsv)

**Sprite sizes (frame widths) and frame counts — monsters**
- Monster sprite frame widths in the data table: 128 px (69 monster types), 160 px (34 types), 96 px (9 types) — counted from the `width` column [PRIMARY-CODE] — [DevilutionX assets/txtdata/monsters/monstdat.tsv](https://github.com/diasurgical/devilutionX/blob/master/assets/txtdata/monsters/monstdat.tsv)
- Each monster has `frames[6]` = frame counts for (stand, walk, attack, hit, death, special). Examples: Zombie 11/24/12/6/16/0; Fallen One (spear) 11/11/13/11/18/13; Skeleton 9/8/16/5/16/16; Skeleton Captain 13/8/12/7/15/16; Hidden/Stalker 16/8/12/8/24/15; Flesh Clan (goatman) 12/8/12/6/20/12; Fiend (96 px) 9/13/10/9/13/0; Satyr Lord (160 px) 13/13/14/9/16/0. A parallel `rate[6]` column gives per-animation tick delays (e.g., Zombie 4,1,1,1,1,1 → idle plays at 1/4 speed) [PRIMARY-CODE] — [monstdat.tsv](https://github.com/diasurgical/devilutionX/blob/master/assets/txtdata/monsters/monstdat.tsv)

**Frame counts — player (Warrior class)**
- Warrior: idle 10, walk 8, attack 16 (unarmed/sword/mace/staff/bow), axe attack 20, block 2, death 20, casting 20, hit-recovery 6, town idle 20, town walk 8; "action frames" (the frame where the hit lands) e.g. sword 9 of 16, bow 11, axe 10 of 20, cast 14 of 20 [PRIMARY-CODE] — [DevilutionX assets/txtdata/classes/warrior/animations.tsv](https://github.com/diasurgical/devilutionX/blob/master/assets/txtdata/classes/warrior/animations.tsv)
- Each class also has its own TRN (`trn warrior`, `rogue`, `sorcerer`, `monk`) and per-class sprite offset values (e.g., warrior dungeon offset X 6, Y −21) [PRIMARY-CODE] — [DevilutionX assets/txtdata/classes/*/sprites.tsv](https://github.com/diasurgical/devilutionX/tree/master/assets/txtdata/classes)

**Palette, light tables and lighting**
- Light tables "map palette indices, so [their] size is the same as the palette size": `LightTableSize = 256`; `LightsMax = 15`; `NumLightingLevels = 16` [PRIMARY-CODE] — [DevilutionX Source/engine/lighting_defs.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/lighting_defs.hpp)
- `MakeLightTable()` generates "16 gradually darker translation tables." The 256-color palette is treated as a sequence of color ramps of lengths {16,16,16,16,16,16,16,16, 8,8,8,8, 16,16,16,16,16,16} (i.e., indices 0–127 are 16-color ramps, 128–159 are 8-color ramps, 160–255 are 16-color ramps). For light level `shade`, each color index is shifted `shade*steps/16` entries further down its own ramp (toward the dark end); if it runs off the end of the ramp (or hits index 255) it becomes black (index 0). Table 15 is forced to all-black; table 0 is identity ("fully lit") [PRIMARY-CODE] — [DevilutionX Source/engine/light_tables.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/light_tables.cpp)
- Light radius falloff: 16 radii (`NumLightRadiuses = 16`); for radius r, `maxDistance = (r+1)*8` in 1/8-tile units; normal levels use linear falloff `level = distance/maxDistance * 15` (rounded), beyond maxDistance = 15 (black). Hellfire Nest/Crypt levels use a quadratic falloff "with over exposure." A `LightConeInterpolations[8][8][16][16]` table (sqrt distances with 8x8 sub-tile offsets) gives sub-tile precision as the light source moves [PRIMARY-CODE] — [light_tables.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/light_tables.cpp)
- Lighting is stored per map tile (`dLight[x][y]`, `uint8_t`, lower = brighter), scanned up to 15 tiles from each light in four quadrants; overlapping lights keep the minimum (brightest) value; a baseline `dPreLight` is restored before re-applying lights each update [PRIMARY-CODE] — [DevilutionX Source/lighting.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/lighting.cpp)
- Brevik: "The lighting in the game was done on a grid basis"; programmer Doron Gartner then wrote an algorithm so lighting updated as the character moved a few pixels rather than once per square, which noticeably improved atmosphere [PRIMARY-DEV quote in book excerpt] — [Destructoid excerpt](https://www.destructoid.com/the-origin-of-diablo/) (consistent with the 8x8 sub-tile interpolation table above)
- Sprites/tiles are drawn through the light table of their tile: `ClxDrawTRN(out, position, clx, LightTables[lightTableIndex].data())` — i.e., lighting = index remap at blit time, no RGB math [PRIMARY-CODE] — [DevilutionX Source/engine/render/scrollrt.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/render/scrollrt.cpp)
- Hell levels: light tables are altered so palette indices 1–31 ("blood wall lighting") have custom ramps, and the light tables' indices 1–31 are rotated each cycle (`std::rotate(lightTable.begin()+1, ..+2, ..+32)`) so animated colors stay animated even when darkened [PRIMARY-CODE] — [light_tables.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/light_tables.cpp); [lighting.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/lighting.cpp)
- In Nest/Crypt (Hellfire) "lava [is] fully bright" — palette indices 0–15 are identity in all light tables (emissive colors ignore darkness), and tiles are never fully black [PRIMARY-CODE] — [light_tables.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/light_tables.cpp)
- Light radius was gameplay-relevant: equipment with −light radius enabled "stealth" approaches to monsters in Diablo I [COMMUNITY wiki] — [Diablo Wiki: Light radius](https://di.diablowiki.net/Light_radius)

**Palette cycling**
- Caves: `CycleColors(1, 31)` every update (water/lava animation by rotating palette entries 1–31). Crypt: lava (15 colors, indices 1–15) cycles every other frame and glow (16 colors, 16–31) every frame → 240-frame loop. Hive: bubbles (8 colors) and waves (7 colors) cycle every 3rd frame → 56-frame loop [PRIMARY-CODE] — [DevilutionX Source/engine/palette.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/palette.cpp)

**TRN palette swaps (monster variants)**
- Monster variants reuse one sprite set with a different `.trn` remap: Zombie (no TRN), Ghoul = `zombie\bluered`, Rotting Carcass = `zombie\grey`, Black Death = `zombie\yellow`; Fallen One variants use `falspear\fallent` etc. [PRIMARY-CODE] — [monstdat.tsv](https://github.com/diasurgical/devilutionX/blob/master/assets/txtdata/monsters/monstdat.tsv)
- Unique monsters get a per-instance `uniqueMonsterTRN` (even their missiles are drawn with it); special 256-byte tables `infra.trn` (infravision), `stone.trn` (petrified), `pause.trn` (pause screen) [PRIMARY-CODE] — [scrollrt.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/render/scrollrt.cpp); [lighting.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/lighting.cpp)
- TRNs can be baked into a sprite list (`ClxApplyTrans`) or applied at draw (`ClxDrawTRN`) [PRIMARY-CODE] — [DevilutionX Source/engine/render/clx_render.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/render/clx_render.hpp)

**Tiles**
- `TILE_WIDTH 64`, `TILE_HEIGHT 32` (2:1 diamond). The rendering primitive ("dungeon frame") is `TILE_WIDTH/2 = 32` px wide and `32` px tall, with triangle pieces 31 px tall; tile primitive types include Square, TransparentSquare, Left/Right Triangle, Left/Right Trapezoid. A tile column ("MICROS") holds up to 16 such blocks, so walls are stacks of 32x32 pieces [PRIMARY-CODE] — [DevilutionX Source/levels/dun_tile.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/levels/dun_tile.hpp); [dun_render.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/render/dun_render.cpp)
- Tile properties include `Transparent`, `TransparentLeft`, `TransparentRight` (wall cutaway when the player is behind), plus `BlockLight`, `BlockMissile`; the vision pass records a `TransList` of transparent regions seen [PRIMARY-CODE] — [dun_tile.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/levels/dun_tile.hpp); [lighting.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/lighting.cpp)
- Transparent wall masks are drawn with a per-line prefix increment of 2 px (a 2:1 diagonal mask) [PRIMARY-CODE] — [dun_render.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/render/dun_render.cpp)

### Inferences
- Diablo's "dark but readable" look comes from a very cheap system: 16 discrete darkness levels per tile with linear falloff, quantized along hand-designed palette ramps. Because darkening walks down a *ramp of the same hue*, darkened pixels keep hue identity (red stays red-ish) until they snap to black — this is the key to readability in a 256-color palette. A code-drawn pixel game can replicate it exactly: design the palette as ramps (e.g., 16 or 8 steps), and implement lighting as `index → index + shift within ramp` lookups.
- Light quantization by tile plus sub-tile interpolation means the "banded" light circle is intrinsic; at 270x480 a similar approach with ~6–8 bands would look period-correct.
- Reserving low palette indices for emissive/animated colors (lava, glow) that are exempt from darkening is a proven trick for keeping hazards visible in the dark.
- Typical Diablo 1 animation budget at 8 directions: walk 8, idle ~10, attack 12–20, hit 5–11, death 13–24 frames — roughly 60–80 frames per direction, ~500–650 frames per monster (before TRN variants, which are free).
- Monster frame widths of 96/128/160 px at 640x480 imply characters roughly 1/5–1/4 of screen height including headroom; scaled to a 270-wide screen, an equivalent proportion is roughly 40–64 px frame width (character body itself smaller). This is an inference, not a published spec.

### Gaps
- Which 3D software Diablo 1 used (often claimed: Autodesk 3D Studio for DOS) — I found no primary source confirming it in this session.
- Native resolution (widely known as 640x480, 256 colors) was not confirmed by a primary source fetched here, though the 256-entry palette/light tables are confirmed in code.
- Exact player sprite frame widths and in-game pixel heights were not extracted (they are encoded in the CL2 files, not the TSV tables).
- No transcript of Brevik's GDC 2016 postmortem was available; Erich/Max Schaefer art-pipeline interviews not found.
- CEL/CL2 byte-level format specifics (RLE scheme) were not documented here beyond "CL2/CLX sprite, palette-indexed, transparent runs."

## Diablo 2 (2000): 3D pre-render pipeline, directions, component/layered characters, DCC/DC6/COF/PL2 formats, lighting

### Takeaway
Diablo 2 characters, monsters and environment pieces were modeled/rendered in 3D (3D Studio Max after an early StrataVision period), exported from multiple angles by a proprietary tool, and stored as palette-indexed DCC (compressed animation) or DC6 (mostly static/UI) files. Player characters (and many monsters) are composited at runtime from up to 16 layers (head, torso, legs, arms, hands, shield, 8 specials), each a separate sprite file per armor tier/mode/weapon class, with a per-direction-per-frame draw-order table in a COF file. Lighting and blending are precomputed palette transforms in PL2 files (32 light levels).

### Cited Findings
**Production**
- Backgrounds: hand-drawn sketch → interpreted as 3D polygons → renders worked in Photoshop and cut into tiles → level editor assembles tiles → engine builds modular rooms for random levels [SECONDARY, uncited article account] — [LevelUp, "La historia detrás de Diablo II" (2021)](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/)
- Early renders used an old version of StrataVision on Macintosh and could take up to ~40 hours per image; new hire Dave Glenn tested 3D Studio Max (self-taught) and cut a render from ~20 hours to ~30 seconds; the rest of development moved to 3D Studio Max [SECONDARY] — [LevelUp](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/)
- Character and monster models were made in 3D Studio Max; a proprietary tool exported them from multiple angles — 8 directions for creatures and up to 16 for playable characters [SECONDARY] — [LevelUp](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/); corroborated by modders: "at least 8 times for monsters, 16 for chars" [COMMUNITY] — [Phrozen Keep tutorial thread](http://d2mods.info/forum/viewtopic.php?t=14662)
- 2D at 640x480 was described as the only way to support 8 players, 30 monsters and up to 100 projectiles on screen [SECONDARY] — [LevelUp](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/)
- A BlizzCast transcript describes compositing separate gear layers "for every direction he was rendered in for every frame of animation" [SECONDARY/PRIMARY-DEV via podcast, summary only] — [GameBanshee BlizzCast Episode 6](https://gamebanshee.com/kk9q)

**Formats**
- Two sprite formats: DC6 for mostly static images (uncompressed), DCC for compressed animations [COMMUNITY/academic slides] — [Uni Würzburg D2 modding slides (PDF)](https://wuecampus.uni-wuerzburg.de/moodle/pluginfile.php/1552636/mod_resource/content/1/Diablo%20II.pdf)
- Animation filenames encode token + body part + armor tier + mode + weapon class, e.g. `BH TR LIT A1 HTH.DCC` (armor tier lit/med/hvy) [COMMUNITY] — [Würzburg slides](https://wuecampus.uni-wuerzburg.de/moodle/pluginfile.php/1552636/mod_resource/content/1/Diablo%20II.pdf)
- Composite layer types (COF): HD head, TR torso, LG legs, RA right arm, LA left arm, RH right hand, LH left hand, SH shield, S1–S8 specials (16 total) [PRIMARY-CODE] — [OpenDiablo2 d2enum/composite_type.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2enum/composite_type.go)
- COF header stores NumberOfLayers, FramesPerDirection, NumberOfDirections, Speed; each layer has type, shadow flag, selectable flag, transparent flag, draw effect, weapon class; plus a `Priority[direction][frame][]` table giving layer draw order per direction per frame (so e.g. the shield can draw behind the torso when facing away) [PRIMARY-CODE] — [OpenDiablo2 d2cof/cof.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2fileformats/d2cof/cof.go)
- Every direction in a DCC has the same frame count (e.g., 96 frames over 8 directions = 12 per direction) [COMMUNITY] — [d2mods DCC tutorial ch. 6](https://d2mods.info/resources/infinitum/tut_files/dcc_tutorial/chapter6.html)
- DCC files support 1, 2, 4, 8, 16 or 32 directions [COMMUNITY] — [Phrozen Keep thread](https://d2mods.info/forum/viewtopic.php?t=30878); engine maps a 64-direction facing to 4/8/16/32 with lookup tables; directions are stored interleaved so that the 8-direction set's indices 0–3 are the four diagonals and 4–7 the cardinals, and 16-direction indices 8–15 are the in-betweens (lower-direction sets are prefixes of higher ones) [PRIMARY-CODE] — [OpenDiablo2 d2dcc/dcc_dir_lookup.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2fileformats/d2dcc/dcc_dir_lookup.go)
- Monster direction order reported as sw, nw, ne, se, s, w, n, e [COMMUNITY] — [Phrozen Keep](https://d2mods.info/forum/viewtopic.php?t=30878)
- DCC compression: each direction is split into cells (4x4-pixel cells per row grouping), with separate bitstreams for "equal cells," pixel masks, encoding types and raw pixel codes, plus a per-direction 256-entry palette-usage table and a bounding box across all frames [PRIMARY-CODE] — [OpenDiablo2 d2dcc/dcc_direction.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2fileformats/d2dcc/dcc_direction.go)
- Frame-count estimates by modders: 8 frames/direction × 16 directions = 128 frames per action; a full character set ~6,000–8,000 frames [COMMUNITY, unverified] — [GameDev.net](https://gamedev.net/forums/topic/302215-16-direction-character-in-a-2d-isometric-game/2939635/); [Phrozen Keep](https://d2mods.info/forum/viewtopic.php?t=30878)
- Diablo 2 renders were of 3D models "so they arent actually drawing each item again and again" [COMMUNITY] — [GameDev.net thread](https://gamedev.net/forums/topic/556056-how-to-design-diablo-style-sprites/)

**Palette/lighting (PL2)**
- A PL2 file (per act palette) contains: base palette, 32 `LightLevelVariations` (light remap tables), 16 inventory color variations, a "selected unit" shift, 3×256 alpha-blend tables, 256 additive, 256 multiplicative, 111 hue variations, red/green/blue tone tables, 256 max-component blends, a darkened color shift, and 13 text colors [PRIMARY-CODE] — [OpenDiablo2 d2pl2/pl2.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2fileformats/d2pl2/pl2.go)
- Layer draw effects map to precomputed colormap ranges in the PL2: 25%/50%/75% transparency (colormaps 49–304, 305–560, 561–816), Modulate, Burn, Normal, Mod2X, etc. (names "courtesy of Necrolis") [PRIMARY-CODE/COMMUNITY RE] — [OpenDiablo2 d2enum/draw_effect.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2enum/draw_effect.go)

**Tiles**
- Map tiles are divided into 5×5 sub-tiles (`subTilesPerTile = 5`); viewport constants `tileWidth = 80`, `tileHeight = 40` (half-extents of the commonly cited 160×80 floor diamond — interpretation) [PRIMARY-CODE] — [OpenDiablo2 position.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2math/d2vector/position.go); [viewport.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2core/d2map/d2maprenderer/viewport.go)

### Inferences
- The D2 layer system is the model for equipment-visible characters: per-layer sprite sets keyed by (component, armor tier, mode, weapon class), plus a per-direction/per-frame z-order table. For code-drawn sprites, the same architecture works with procedurally drawn layers instead of files — and the draw-order table is the non-obvious but essential piece.
- 16 directions roughly doubles frame count over 8; for a mobile-portrait game at ~270 px wide with ~30–48 px characters, 8 directions is the defensible choice (D1 used 8 for everything; D2 reserved 16 for players).
- Precomputing all blend/light ops as palette remaps (PL2) is exactly how D2 kept 256-color sprites while getting transparency and colored light; a code-driven pixel engine can do the same with LUTs.

### Gaps
- No primary Blizzard North source (interview/postmortem) on D2 sprite pixel heights, render settings, or frame counts per mode was found; LevelUp's account doesn't cite its interviews.
- Exact per-mode direction counts for players (whether all modes are 16 or only some) not verified from game data.
- Paul Siramy's "Extracting Diablo II Animations" PDF was unreachable (proxy refused host).

## Hades (Supergiant, 2020) and Hades II: 3D-modeled characters → 2D presentation

### Takeaway
Hades characters were modeled/animated in 3D (Maya; ZBrush, Substance Painter, Marvelous Designer; mocap as a base) and post-processed through After Effects, with all 2D assets in Photoshop; Hades I's runtime is described as an "entirely 2D workflow" (i.e., frames shipped as images), while Hades II switched to real-time 3D characters for smoother turning and lower memory. I found no Supergiant source explicitly detailing the render-to-sprite step for Hades I.

### Cited Findings
- Jen Zee: "The 3D work was modeled and animated with Maya, and post-processed through AfterFX"; other tools ZBrush, Substance Painter, Marvelous Designer; animator Thinh Ngo used mocap as a basis for much of the animation; "We relied completely on Photoshop to create 2D assets" [PRIMARY-DEV] — [MCV/DEVELOP](https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/)
- The style was initially planned as painterly but became pen-and-ink partly because "Making assets in pen and ink goes much faster than painterly work" [PRIMARY-DEV] — [MCV/DEVELOP](https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/)
- Zagreus model and rig by Camilo Vanegas, textures by Paige Carter, based on Jen Zee's concept and portrait art [PRIMARY-DEV portfolio] — [Paige Carter ArtStation](https://artpaiges.artstation.com/projects/aYJLYz)
- Hades II "is one of the studio's first to feature fully 3D character models rendered in real-time," "a major shift from the entirely 2D workflow of the first Hades"; it "allowed Hades II to support twice as many characters with faster performance and less memory usage"; PC install >1 GB smaller; 3D enabled proper turn animations and leaning blends where Hades I Zagreus would "tank turn" [PRIMARY-DEV, Supergiant engineer quoted by DigiPen] — [DigiPen](https://www.digipen.edu/showcase/news/hades-2-graphic-programmer)
- Community: Hades has no real-time 3D; every Zagreus frame is a unique image [COMMUNITY] — [Steam discussion](https://steamcommunity.com/app/1145360/discussions/0/1864993755183591660)

### Inferences
- Hades I is a pre-rendered-sprite pipeline in all but explicit confirmation (3D-animated characters + "entirely 2D workflow" at runtime + unique image per frame). Its stated costs (memory, no in-between turn angles → "tank turn") are exactly the costs of discrete-direction sprites; Supergiant chose real-time 3D for the sequel to escape them. For a tiny-resolution pixel game, those costs are small (frames are tiny), so pre-rendering/procedural drawing remains sensible.

### Gaps
- Hades I direction count (reportedly many angles) and frame resolution not found from a primary source.

## Modern indie pixel-art ARPGs/isometric games: sprite heights, directions, mirroring, frame counts, readability, tile specs

### Takeaway
Concrete published specs are scarce; the best primary data point is Dead Cells (~50 px tall characters, 3D→pixel pipeline). Conventions: 2:1 dimetric tiles (32x16 or 64x32 most common), walls drawn taller than the diamond footprint with no single standard height; 5-direction drawing + horizontal mirroring for 8 directions is an established asset convention. Children of Morta pairs frame-by-frame pixel art with high-resolution dynamic lighting; Darkest Dungeon keeps darkness readable via heavy linework.

### Cited Findings
- Dead Cells: "the ingame height of the character will only be 50 pixels" [PRIMARY-DEV] — [Game Developer, Thomas Vasseur](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Hyper Light Drifter: Alx Preston: "Our game is 480p... low resolution, and very intentionally so"; in 2D "resolution is just the resolution you draw your sprite at" [PRIMARY-DEV, headline/snippet] — [GamingBolt](https://gamingbolt.com/our-game-is-480p-yeah-its-low-resolution-and-very-intentionally-so/amp)
- Children of Morta: key frames drawn in a separate animation program, anatomy corrected against a reference frame, then in-betweens filled based on desired smoothness; then playtested and adjusted for impact [PRIMARY-DEV via interview write-up] — [TechRaptor](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta)
- Children of Morta uses high-resolution dynamic lights rather than pixelated light effects; the team "didn't restrict their technology" (advanced lighting, shadows, post-processing) despite pixel art; each character's unique abilities required many animation sprites [PRIMARY-DEV via interviews] — [TechRaptor](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta); [Co-Optimus](https://www.co-optimus.com/Editorial/1448/indie-ana-co-op-and-the-children-of-morta-interview.html); built in Unity [SECONDARY] — [Jump Dash Roll](https://www.jumpdashroll.com/article/children-of-morta-review)
- Darkest Dungeon: Chris Bourassa credits strong linework for letting him add hits of color without hurting readability, and avoided the "brown palette trap" while staying dark [SECONDARY quoting PRIMARY-DEV] — [GameSpot](https://www.gamespot.com:443/articles/the-gothic-sensibilities-of-darkest-dungeon/1100-6424880/); "Paint it Black" MIGS 2018 talk contrasting Liefeld vs. Mignola's "simple, dark style" — [Blogcritics](https://blogcritics.org/montreal-international-game-summit-2018-interview-with-chris-bourassa-creative-director-red-hook-studios/)
- 5-direction sets "that can be flipped to eight" are an established asset convention [COMMUNITY] — [OpenGameArt 5/8 Directional Sprite Sets](https://opengameart.org/content/58-directional-sprite-sets)
- Isometric pixel art uses 2:1 lines (~26.565°) instead of true 30° because 30° lines look jagged; most common grid sizes 32x16 and 64x32 (24x12, 48x24 also valid) [COMMUNITY tutorial] — [Construct.net tutorial](https://www.construct.net/en/tutorials/creating-isometric-pixel-art-355/page-6); [Sprite-AI guide](https://www.sprite-ai.art/guides/isometric-pixel-art)
- Walls/objects are drawn taller than the diamond footprint; e.g., a 64x32-floor tileset uses 128x128 tile images; older GameDev.net tutorial used 2.1:1 (32 wide → ~15 px tall) [COMMUNITY] — [OpenGameArt 64x64 tileset](https://opengameart.org/node/3012); [GameDev.net isometric engines](https://gamedev.net/tutorials/programming/general-and-gameplay-programming/introduction-to-isometric-engines-r744)
- Reference point: Diablo 1's walls are stacks of 32x32 pieces on a 64x32 floor, with left/right transparency flags for cutaway [PRIMARY-CODE] — [DevilutionX dun_tile.hpp](https://github.com/diasurgical/devilutionX/blob/master/Source/levels/dun_tile.hpp)
- Commercial 16x16-pixel 8-direction RPG character packs exist (i.e., 8 directions are viable even at 16 px) [COMMUNITY] — [di3goalmeida itch.io devlog](https://di3goalmeida.itch.io/rpg-characters-8-directions-16x16/devlog/678606/new-rpg-characters-in-8-directions-16x16px)

### Inferences
- For 270x480 portrait: a Dead Cells-scale 50 px character would be ~10% of screen height — appropriate for action games; Diablo-like crowd density suggests ~24–40 px tall characters. A 32x16 floor tile gives 8.4 tiles across 270 px; 48x24 gives ~5.6; 64x32 gives ~4.2 (too zoomed for an ARPG). 32x16 (or 48x24) tiles with ~32–40 px characters is the most consistent fit (inference).
- 5-direction mirroring (S, SW, W, NW, N drawn; SE, E, NE mirrored) cuts drawing by 37.5%; the tradeoff is handedness (weapon/shield swap sides) — D2's per-direction layer priority table shows Blizzard did not mirror. A code-drawn sprite system can mirror the *rig* instead of pixels to keep handedness correct.
- Readability against busy tiles in references: (a) palette ramps that preserve hue under darkening (Diablo), (b) bright emissive indices exempt from lighting (Diablo lava), (c) strong outlines/linework (Darkest Dungeon), (d) high-res dynamic lights over pixel sprites (Children of Morta). Rim light/outline specifics for ARPG sprites weren't found from primary sources.

### Gaps
- No primary source found for Hyper Light Drifter's character sprite height, direction count or frame counts; Path of Exile and Titan Quest are real-time 3D (not researched further — not sprite pipelines).
- No published frame-count norms for indie isometric ARPGs (idle/walk/attack/death) beyond Diablo's data; Diablo 1 data above is the best benchmark.
- No primary source on rim-light/outline conventions specifically for isometric ARPG characters.

## Lighting in isometric pixel games: light tables, banded radius, dynamic 2D lights, normal maps

### Takeaway
Two families: palette-indexed LUT lighting (Diablo 1: 16 per-tile levels via remap tables, linear radius falloff, sub-tile interpolation; Diablo 2: 32 light-level remaps plus blend LUTs in PL2) and modern RGB dynamic lights over pixel sprites (Children of Morta's high-res dynamic lights; Dead Cells' normal-map toon-shaded sprites with a custom lighting system).

### Cited Findings
- Diablo 1: 16 light levels, 256-entry remap tables, ramp-based darkening, 16 radii with `(r+1)*8` sub-tile distance, linear falloff, min-combine of overlapping lights, per-tile storage, sub-tile interpolation table [PRIMARY-CODE] — [light_tables.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/engine/light_tables.cpp); [lighting.cpp](https://github.com/diasurgical/devilutionX/blob/master/Source/lighting.cpp)
- Diablo 2: 32 light-level palette transforms per act palette plus alpha/additive/multiplicative LUTs [PRIMARY-CODE] — [OpenDiablo2 pl2.go](https://github.com/OpenDiablo2/OpenDiablo2/blob/master/d2common/d2fileformats/d2pl2/pl2.go)
- Diablo 2's planned/sequel goals reportedly included sprites supporting transparency and colored light sources while keeping the pseudo-3D perspective [SECONDARY] — [LevelUp](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/)
- Dead Cells frames are exported as PNGs with normal maps, shaded with a basic toon shader; the team built a lighting system to replace hand-drawn shadows [PRIMARY-DEV] — [Game Developer](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Children of Morta: high-resolution dynamic lights over pixel art [PRIMARY-DEV via write-up] — [TechRaptor](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta)
- Light radius present around all characters in D1 and D2, playing a major role in mechanics and visuals [COMMUNITY wiki] — [Diablo Wiki](https://di.diablowiki.net/Light_radius)
- General: a light table is "a color mapping table with lookup data for doing lighting effects with the specified palette" (Allegro 4 API, same technique) [PRIMARY docs, non-Diablo] — [Allegro create_light_table man page](https://www.mankier.com/3/create_light_table)

### Inferences
- For a code-drawn sprite engine, palette-index rendering + LUT lighting is cheap on mobile and guarantees palette-consistent darkening (no muddy RGB multiply). A hybrid — index sprites, LUT darkness bands, plus a few additive RGB glows for spells — mirrors D2's approach.
- Normal maps at ~30–50 px sprites are only worth it if the sprite drawer can emit normals cheaply (code-drawn sprites can: shapes have known geometry).

### Gaps
- No dev-sourced specifics on how many light bands modern pixel ARPGs use, or normal-map usage in isometric (vs side-view) pixel games.

## Production methods for 8-direction sprites: hand-drawn vs 3D pre-render vs voxel; time/cost; tools

### Takeaway
The dominant reason studios pre-render from 3D (Diablo 1/2, Dead Cells, Hades) is throughput across many directions/animations with small teams and cheap retakes; the cost is pixel flicker/lost detail at small sizes. Hand-drawn frame-by-frame (Children of Morta) gives the best pixel quality but scales linearly with directions × frames. I found no reliable published time/cost-per-sprite figures.

### Cited Findings
- Dead Cells pipeline: models/skeletons in 3ds Max from a 2D pixel model sheet → FBX → in-house tool renders tiny, **without antialiasing** → PNG frames + normal maps, toon shader; pose-to-pose keyframing; timing fixes by moving keys (two retakes took less time than uploading the article's GIFs); armor/attachments added to the 3D model; old assets reused to build new monsters ("most useful trick"); limitation: flickering pixels unsolved, accepted lower detail for animation speed ("Movement is love, movement is life"); reason: Vasseur was the only artist for a year with limited pixel-art experience; origin: ScarKrow Ludum Dare 32 prototype (2015) where Flash 2D animation was too slow [PRIMARY-DEV] — [Game Developer](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Diablo 2: switching renderer (StrataVision → 3D Studio Max) cut render times from ~20 h to ~30 s per image, which made the multi-angle export viable [SECONDARY] — [LevelUp](https://www.levelup.com/articulos/la-historia-detras-de-diablo-ii-uno-de-los-juegos-mas-influyentes-de-la-historia/)
- Diablo 1: Condor needed Blizzard artists to teach 3D modeling/animation to make the 3D→2D approach work [SECONDARY] — [Destructoid](https://www.destructoid.com/the-origin-of-diablo/)
- Hades: pen-and-ink chosen partly for speed; characters animated in Maya with mocap basis [PRIMARY-DEV] — [MCV/DEVELOP](https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/)
- Children of Morta: hand-drawn keyframes + in-betweens; many sprites per character [PRIMARY-DEV via write-up] — [TechRaptor](https://techraptor.net/content/how-dead-mage-created-the-art-for-children-of-morta)
- AI tools now generate 8 rotations from one sprite (PixelLab outputs S, SE, E, NE, N, NW, W, SW in a 3x3 grid; SpriteFusion, Ludo.ai similar) [VENDOR docs] — [PixelLab docs](https://www.pixellab.ai/docs/tools/create-8-rotations-pro); [SpriteFusion](https://www.spritefusion.com/docs/pixel-art-generator/generate-8-directions-for-your-pixel-art); [Ludo.ai](https://ludo.ai/features/directional-sprites)
- Blender-based 3D→2D sprite-sheet render tutorials exist (isometric camera, sprite sheet export) [VENDOR/COMMUNITY] — [Sorceress 3D-to-2D guide](https://sorceress.games/tutorials/3d-to-2d)

### Inferences
- For a developer generating sprites in code, the D2/Dead Cells lesson translates directly: define the character once as a rig/skeleton of parts (D2-style layers), render each direction by rotating the rig and rasterizing without antialiasing at target size, then apply a palette-ramp shading + outline pass. This gives 8 (or 16) directions for the cost of 1, with D2's per-frame layer priority solving occlusion, and Dead Cells' known weakness (pixel flicker) mitigated by snapping/limiting sub-pixel motion and hand-tuned frame counts (D1 benchmarks: walk 8, idle ~10, attack 12–20, hit 5–8, death 15–20).

### Gaps
- No primary-source time/cost figures (hours per direction/animation) for hand-drawn 8-direction sprites, and no primary devlogs on MagicaVoxel, Spine, PixelOver or Pixel Composer workflows were retrieved in this session (tool-call budget). These remain open.
