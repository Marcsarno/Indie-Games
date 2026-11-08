# Act II: prompts for ChatGPT (round 70)

Use a new ChatGPT chat, or the one that drew the Act I maps if it's still open (then it already knows the style).
Attach to MESSAGE 1: `../world/hollow/region-map.png` and `../world/hollow/camp.png` (its own Act I art, for style),
plus the four game screenshots in `attach/` (1 the camp, 2 a fight in the woods, 3 today's placeholder Act II town,
4 today's cave dungeon). Send one message at a time and wait for the reply. Bring every reply and image back to Claude.

## MESSAGE 1: the whole act, overview only

I'm making a mobile dark-fantasy action RPG (a Diablo-like) for portrait phones: isometric pixel art, chibi characters.
Attached: your concept map and camp art for Act I (the style I want to keep), and four screenshots of the game as it is
today. Act I is finished. I'd like you to design Act II with me, one step at a time. Your art is the mood, layout and
landmark reference; I'll build it in the game engine, so design for gameplay first.

WHERE THE STORY IS
- Act I: the necromancer MAELIS (a monk cast out of Brother Osric's order for the books he read) raised the old
  Skeleton King under a mine. The hero put the King back in his grave. Maelis appeared over the bones, said the King
  had "already given him what he came for", and fled south: "Follow me, if you like. I would so like you to see what
  I wake next."
- Act II is ASHFORD: a mining town under a smoking mountain. The miners have stopped coming up, and something below
  has started digging toward them. Maelis is behind it.
- The hero arrives at level 7 and should leave Act II around level 12. A full playthrough of the act should take
  about 30 minutes.

HOW THE WORLD WORKS (same as Act I)
- The act's overworld is hand-designed and always the same: 2 or 3 REGIONS joined at their edges. A region is about
  100 x 100 ground tiles (about 8 x 8 phone screens; one screen shows about 12 x 12 tiles).
- Dungeons are generated fresh on every visit, so for each one design only its entrance, its surroundings, its theme,
  its number of floors (1-3) and what waits at the bottom. The act ends in one big story dungeon with a designed boss
  room.
- The town is the safe hub: compact, every person in their own spot, one or two gates.
- Linear between regions (the story opens the way on), free exploration inside a region: monster packs, side paths,
  caches, secrets, one optional "danger" spot that is much stronger than its surroundings.
- A quest arrow points to the next goal, but landmarks should still lead the eye: tall silhouettes, smoke, glowing
  light, roads that go somewhere.

ENGINE LIMITS (important)
- Flat ground: no high ground you can stand on. Cliffs, walls, rivers, lava and thick forest are boundaries; stairs and
  ramps are decoration only.
- Fights happen in open spaces (clearings, yards, quarry floors) with a few rocks, carts or ruins to move around.
  Roads are 3-4 tiles wide. Trees grow in clumps; thick forest only at edges.
- Water and lava can be shallow (slows you, or burns) or deep (a wall). Bridges and fords cross them.
- Dungeon styles the engine already has: crypt, caves (with mine-works rooms: timber props, rails, carts; and crystal
  grottos), and a hellish lava style. Something else is possible, but say why it's worth it.

THE CAST WE CAN USE
- Heroes: warrior, mage, ranger.
- Monsters: wolves, boars, dire bears, goblins and goblin shamans, slimes, shroomlings and sporecaps, brigands and
  brigand mastiffs, diggers, cave spiders and the Broodmother, skeletons, skeleton archers, crypt spearmen, bone
  axemen, tomb guards, grave crossbowmen, bone hounds, burning dead, wraiths, hell hounds, the fallen (ones, knifers,
  slingers, shamans), ogres (clubbers, rockthrowers, shieldbearers, enforcers, an ogre warlord), treants.
- Today's placeholder for Act II's last boss is the BROODMOTHER in her nest (a giant spider, egg sacs that hatch).
  Keep her, or propose something better; you may add one new boss for the act (describe how the fight works:
  telegraphed attacks, phases, adds).
- New townspeople are welcome (we need at least a merchant, a smith and someone who sells potions, plus whoever gives
  the quests).

FOR THIS FIRST STEP, GIVE ME ONLY THE OVERVIEW
1. One painted map of the whole act, in the style of your Act I map: the regions, where the player arrives, the town,
   the roads, the mountain, every dungeon entrance and the final dungeon. Label everything.
2. The story of the act in 6-10 short beats: who asks what, where you go, what you find, what opens next, and where
   Maelis shows up (he should appear once mid-act and escape again; he is not killed in Act II).
3. The townspeople: name, role, a one-line look (for chibi pixel art), and what each one wants from the hero.
4. The dungeons: name, theme, floors, what's at the bottom.
5. The bosses: name, look, and how the fight plays.

Stop after the overview so I can give feedback. Then we'll do the regions one by one, in detail.

## MESSAGE 2: region 1 in detail (send after the overview is approved)

Approved (with any notes from Claude). Now region 1 in detail: the town and the region around it.
1. A top-down region map in the same style: where you enter and leave, roads, open fighting spaces, cliffs, water or
   lava, every dungeon entrance, landmarks, caches, the danger spot. Put a grid on it (columns A-H, rows 1-8) so we
   can point at places.
2. 3-4 close-up concept images of its best spots in the game's isometric view and scale (like my screenshots): the
   town first, then the most important places.
3. A written spec:
   - each area: size (S = 1 screen, M = 2-3, L = 4-6), grid squares, level range, what's there (packs, landmarks,
     loot), and what makes it fun to fight in;
   - each dungeon entrance: name, theme, floors, what's at the bottom;
   - how the player is pulled forward to the next goal;
   - secrets and side rewards;
   - what changes after each story step.
Do region 1 only and stop.

## MESSAGE 3: the next regions (send once per region)

Region 1 approved (with any notes from Claude). Now region [2 / 3] in the same format: the map with the A-H / 1-8 grid,
3-4 close-ups, the written spec, and what changes after each story step. Do this region only and stop.

## If it drifts
- Too painterly in the close-ups: "Redo it as an in-game pixel-art screenshot at the same camera and scale as my
  screenshots: hard pixels, limited palette, 1 px dark outlines."
- Wrong angle: "Use the isometric 3/4 view of my screenshots, no perspective."
- UI drawn in: "Remove all UI; show only the game world."
- High ground you can stand on (ledges, upper floors, walkable bridges over paths): "The engine has flat ground only;
  make it a boundary or decoration."
