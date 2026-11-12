# Dungeons of Bones: story bible and dialogue export

Everything the game says outside the D&D table scenes, with what the story is, where it happens and who is in it.
The table scenes (the title, the opening, the quests Dave tells, the clue peeks, the end of Act I) are in
**`tools/script/table-script.md`** (44 lines, IDs like **[meet.2]**); this file points to them by ID and does not repeat them.
Made from the code as it is on 2026-11-12 (game in `game/js/`; the 3D builds in `game3d/` and `world3d/` load the same
scripts, so every line here is in them too).

## HOW TO HAND IT BACK

- **Keep every [ID].** Change the text after the colon however you like; the ID is how each line finds its way back
  into the code.
- **To cut a line**, write `CUT` after its ID (or strike it out).
- **To add a line**, put it under the line it follows with a new ID made from that one plus a letter:
  **[npc.osric.meet.3b]** BROTHER OSRIC: ...
- **Notes to me** go in [square brackets] anywhere.
- Lines with {braces} are templates: the game fills in the part in braces (a name, a number). Keep the braces, or
  say in a note what should go there.
- A BANNER has two parts, TITLE / LINE: keep the slash.
- The table lines are edited in `table-script.md` (same rules). New table lines that are not there yet are in
  section 4.2 below.
- ALL CAPS is how the game's pixel font shows everything; write in any case, it will be shown in capitals.

Section line counts (lines with an ID): section 4 (all dialogue and text outside the table) **375**, by part:
4.1 title and hero cards 13; 4.2 table lines missing from table-script 8; 4.3 Act I in story order 109;
4.4 repeat lines and hints 16; 4.5 quest names, tracker, prompts 31; 4.6 places, act cards, signs, name tags 87;
4.7 bosses and enemies 30; 4.8 dungeon events 29; 4.9 legendaries and sets 33; 4.10 hero shouts 13;
4.11 Act II townspeople 6. Plus the 44 table lines in `table-script.md`. Sections 1-3 and 5 are notes, not lines.

---

## 1. The premise and the theme

### What the game is
A Diablo-style action RPG for portrait phones: isometric pixel art drawn entirely in code, a hero you pick from four
classes (BARBARIAN, whose class id in the code is still `warrior`; PALADIN; MAGE; RANGER), quests, loot, generated
dungeons. The story is Act I; Acts II and III exist as placeholder areas and (for Act II) a full design.

### The frame: a D&D night (cine.js)
The story is told the way it is played. **Dave**, the Dungeon Master, sits at the head of a table in a red wing chair
behind his DM screen (a skull on it, his fingers over the top), under a green banker's lamp. Three friends sit at the
table in armchairs with character sheets, dice (Marc's blue, Aaron's purple, Chris's green), pencils and cans:
**Marc**, **Aaron** and **Chris**. The room: two brick walls meeting in a corner behind Dave, a beam with string
lights, a window on the night, a ROLL OR DIE poster, a shield over crossed swords, shelves of rule books and pewter
figures, a rug, four candles at the corners of the map. **The map in the middle of the table is the game itself**:
the camera pushes into it to start play and lifts out of it to go back to the table.

- **You are the fifth seat** (the camera, at the near end). You are none of the three friends: "You're the unnamed
  person playing with them. You pick your character. You listen to Dave's quest." (the user, round 91). Your hero
  stands as a miniature on a base in front of you; three (now four) miniatures stand there at the title, one per class.
- **The title is at the table**: Dave asks WHO ARE YOU PLAYING TONIGHT? (table-script title.1); you tap a miniature.
- **The opening** (table-script open.*): Dave names your class, then tells the setup in a few words over pictures
  ("visions") that rise on the back wall: Oakhollow is one fire in the woods; the dead get up (the game's skeletons
  march out of the corner along both walls, green candlelight); someone is paying for bones and their old King is
  almost whole (the Skeleton King rises behind Dave's chair, a flash, the table jumps). You reach the camp; Dave voices
  Brother Osric giving the first quest; Chris groans about wolves. Then **you roll**: TAP TO ROLL, the d20 is thrown
  into the open table in front of the miniatures, bounces three times and always lands a twenty (A NATURAL TWENTY.
  OF COURSE.), the table cheers, and the camera dives into the map.
- **Quests at the table**: when someone in camp gives you a quest or your reward, the picture holds, the HUD fades,
  and the camera cranes up out of the game to Dave, who voices that person (caption DAVE, AS WREN), a friend chimes
  in, the reward is chosen there, and the camera drops back into the game ("go to [the] screen, and then back down ...
  a really good transition that can be used again and again", the user).
- **Dave peeks in** (round 104): small beats (the clue found after each of the Hollow's three dangers) do not stop the
  game: a dark strip folds down from the top of the screen with the speaker's head peeking over it (Dave holding up his
  book; the friends as themselves), the line types out, the strip folds away.
- **The end of the act** lifts to the table once more: the King is dust, Maelis went south and took something,
  Marc says THEN WE GO SOUTH, Dave: NEXT WEEK. SOMEBODY ELSE BRINGS THE SNACKS. (table-script end.1-4).
- **Visions** available to a line: the dead, wolves, bandits, the King, Maelis, your die roll. **Light**: lamp, lamp
  out (candles and the map's glow), green.
- **Music**: the user's own recordings. The title song plays from the splash's first tap through the whole table
  (title, opening, every quest told there); back in the game it crossfades to the camp song.
- With the table off (`?cine=0`, local files, tests) the same quests play as talk boxes in the game (section 4.3
  has those versions).

### The story in one breath
OAKHOLLOW was a village; now it is one camp fire in the woods (the camp in **the Hollow**). The dead walk, and the
graves behind Brother Osric's church were not clawed open from below but **dug, with spades**. Someone is paying for
bones. Aldo the woodcutter is missing; you find him caged in the wolf den, and he saw **a hooded man with a lantern
that burned green** at the old mine. The road north is blocked by a fallen tree and three dangers (goblins paid in
silver stamped M, standing stones with warm green ash, a barrow dug out neatly with a farm's spade). Bandits took
Hollis's farm; their chief holds the mine key, his cellar is stacked with sacks of graveyard bones, and he carries a
letter: EVERY BONE IS PAID IN SILVER. THE KING MUST BE WHOLE. M. Osric knows the hand: **MAELIS**, once a brother of
his order, cast out for the books he read. Under the mine you put the **Skeleton King** back in his grave; Maelis
steps out of a green flash over the bones, says the King had already given him what he came for, and walks off
south ("I WOULD SO LIKE YOU TO SEE WHAT I WAKE NEXT"). The road south opens: Act II, ASHFORD.

### Tone
Dark-fantasy dungeon crawl told with a wink: Dave narrates in short, dry film captions (THEN THE DEAD GOT UP.), the
friends react like players at a table (WOLVES. GREAT. / GOBLINS ON A PAYROLL. GREAT. / CALLED IT.), the d20 always
rolls a twenty, and the night ends on whose turn it is to bring snacks. In the game itself the people talk plainly and
briefly; the camp has some warmth (Wren's relief, Hollis's nightshirt, the fire that mends you). The mystery is laid
as a trail of clues (the dug graves, the green lantern, the stamped silver, the farm's spade, the letter) that the
friends call out as they go.

### What the user has said about the story (from NOTES.md, verbatim where quoted)
- Round 42b: approved the tightened quest chain ("I like this plan"); choices made then: some warmth in camp, Wren
  and Hollis give quests, Maelis taunts and flees, the names Osric / Maelis / Aldo / Wren / Hollis. The demo plan:
  "Story told in short dialogue lines and things you see, no journal."
- Round 47f: quick quests (one screen, can be long, one tap).
- Round 51: "the opening needs only one person" (so Osric now gives the woodcutter quest himself).
- Round 78: Act I wasted half its map if you followed the quest; no side quests, make it part of the progression:
  several objectives at once, any order (the three dangers).
- Round 89: four pixel portraits of Dave the Dungeon Master, Marc, Aaron and Chris; "I want this story to be told, and
  the opening of the game to be told from the perspective of the dungeon master"; "a motion cinematic in code, with
  these 4 sitting at a D&D table that Dave the DM is describing... and it smoothly zooms into the table to start the
  game in a very smooth transition. This will be the form of story telling the game will use."
- Round 90: "Spend some time planning how to upgrade it without it feeling like a ton of reading.. tell the story
  with visuals".
- Round 91: "The art for Dave, Marc, Aaron, Chris is perfect. I also want the game to open at this table. You are not
  Marc, Aaron, or Chris. You're the unnamed person playing with them. You pick your character. You listen to Dave's
  quest. For quests, I think it should go to [the] screen, and then back down".
- Round 96b: keep the splash (its tap starts the sound) and music through the whole Dungeon Master part; "a voiceover
  later, maybe with their ElevenLabs credits once the script feels right". The plan agreed: finish Dave's lines first,
  export them as a numbered script (done: table-script.md), the user records the takes in ElevenLabs, the game plays
  each take on its shot with the music dipped and the captions kept.
- Round 100: "I feel like I've done all the objectives"; the tree "can't move until Aldo has the area clear" and you
  don't know what to clear: "improve that part, the story and the pace". Round 101 built three of the four pacing
  ideas (Aldo waits at the tree and you watch him chop it; the three dangers become story clues; one clear goal on
  screen).
- Round 104: the table scene must not take over mid-fight (hence Dave peeking in).
- Act I is "one quest, not an act" (about 5 minutes; feedback queue): make it longer and richer.

---

## 2. The world

### How the acts are laid out in the game today
Each act is five levels: a town, a wild area, two dungeon floors and a boss hall. After Act III it loops at a harder
difficulty (the act card adds NIGHTMARE, HELL, TORMENT). The story only runs in Act I, the first time through.

| Level | Act I (card: THE BLIGHTED WOOD) | Act II (card: THE BURNING DEEP) | Act III (card: THE PIT) |
|---|---|---|---|
| town | THE HOLLOW (hand-built, the story's hub) | ASHFORD (built as the region ASHFORD VALE; no story yet) | GREYMARSH (generic town) |
| wilds | THE RIVERLANDS (a stand-in for region 2) | EMBERWOOD (autumn forest; TREANT ELDER holds the way down) | THORNWOOD (night forest; OGRE WARLORD) |
| floor 1, 2 | CRYPT 1, CRYPT 2 (under the old mine) | CAVES 1, CAVES 2 | HELL 1, HELL 2 |
| boss hall | THE KING'S HALL: SKELETON KING | THE BROOD NEST: BROODMOTHER | THE SANCTUM: THE LICH |

The act card names (THE BLIGHTED WOOD, THE BURNING DEEP, THE PIT) and the forest names come from before the story
existed (round 22); the story's own names are Oakhollow / the Hollow, Ashford, Greymarsh.

### Act I places
- **THE HOLLOW** (the region round the camp, 100x100 tiles, laid out in `tools/world/hollow.json`, "camp at the bottom,
  always going up"): the **CAMP** (a ring of log palisade with one gate north, evening light; Osric's pale chapel tent
  with a gold sun and his altar; Wren's red family tent with a washing line; Hollis's ochre tent with seed sacks and a
  broken plough; the smith's open forge shed; the merchant's potion wagon and stall; a well; a round bell tent; the
  fire with a pot and log benches, which heals you once Aldo's wood feeds it; a supper table; hens; Aldo's woodpile,
  where two fence panels are missing until he is home). Clearings out from it, each with a monster level: BROOK MEADOW
  (1), WOLF GLADE (1-2), DEN MOUTH (2) with the **WOLF DEN** door (caves, one floor: wolves, THE ALPHA, Aldo's cage),
  WESTWOOD (2-3) with the **STANDING STONES** (a ring of menhirs), HIDDEN GROVE (2, a chest), WATCHTOWER YARD (2-3) with
  **THE OLD WATCHTOWER** door (one floor: goblins, goblin shamans, the GOBLIN CHIEFTAIN), GRAVEYARD PATH (3, ten
  graves, ground mist), the **BARROW** (danger, level 6, though while it is one of the three dangers it takes that step's level 3-5: torches, a DANGER sign, red grass; two floors: the dead and a
  WRAITH, then THE DEEP TOMB with THE BARROW WIGHT and its hoard), the **FALLEN TREE** across the road north, and TO
  THE RIVERLANDS. A brook with bridges, cliffs, four caches. Waystones: CAMP, WOLF GLADE, GRAVEYARD PATH, FALLEN TREE.
- **THE RIVERLANDS** (north of the Hollow; a 64x64 stand-in "until region 2 is drawn"): **THE FARM** (Hollis's
  farmhouse, windmill, fields, bandits; **THE FARM CELLAR** under it: brigands, the BANDIT CHIEF, sacks of bones),
  **THE OLD MINE** (a timber mouth in a rock face, chained shut until the chief's key), **the gate to the next act**
  (a stone wall with a shut gate: THE ROAD ON IS CLOSED until the King is dead), and the road back south to the
  Hollow. Waystones: SOUTH ROAD, THE FARM, THE OLD MINE.
- **Under the mine**: CRYPT 1, CRYPT 2 (generated each visit: a vault with a champion carrying its key, a shrine, an
  ambush room, dead ends with treasure), then **THE KING'S HALL** (pillars, a throne between statues and braziers): the
  SKELETON KING, then Maelis.

### Act I step by step (quests.js `storyStage`, worked out from saved flags so deeds done out of order still count)
Tracker texts are in section 4.5 (goal.*). Quest names: THE MISSING WOODCUTTER, CLEAR THE HOLLOW, THE STOLEN FARM,
THE KING BELOW.

1. **meet**: you arrive inside the camp gate; Osric speaks to you on his own a moment later (at the table: open.5 +
   meet.1-4 + the roll). ACCEPT marks the quest given. (The step **wren**, Wren asking for her father, is skipped since
   round 51; its lines remain in the code.)
2. **den / cage**: the wolf den, northeast past the Wolf Glade. Kill THE ALPHA, then FREE ALDO at his cage (action
   button); he runs home.
3. **aldoBack**: back in camp Wren (with Aldo) hands in the quest: COLLECT, one of three rewards (at the table:
   aldoBack.1-5 + the reward line). From now on the campfire heals you, and Aldo walks off to wait at the fallen tree.
4. **hollow3**: three dangers, any order; whichever you take first is level 3, then 4, then 5; each pays on the spot
   with loot of its own kind and is followed by Dave peeking in with a clue (table-script clue.*):
   **THE WATCHTOWER** (kill the goblin chieftain: his purse of new silver stamped M), **THE STANDING STONES** (WAKE THE
   STONES and hold the ring against three waves out of the woods: boars; shroomlings and sporecaps; a dire bear and two
   boars: burned grass, warm ash glowing green), **THE BARROW** (kill the wraith: tombs dug out neatly, a spade with a
   farm's mark). The tracker shows the one the arrow leads to, big, in its colour (green, blue, purple) and ALSO: the
   others; tap one to switch.
5. **chop**: MEET ALDO AT THE FALLEN TREE: walk up to him and he cuts it (three blows, about 4 s; you cannot be hurt
   meanwhile): THE ROAD NORTH IS OPEN.
6. **mine / hollis**: back in camp Hollis speaks (at the table: hollis.1-3; `mine` plays the same lines): bandits took
   his farm, their chief has the mine key. If you went to look at the chained mine first, his first line changes.
7. **farm / cellar**: in the Riverlands, four brigands at the farm, then THE FARM CELLAR: the BANDIT CHIEF drops THE
   MINE KEY and A LETTER, SIGNED M.
8. **farmBack**: Hollis hands in (COLLECT; farmBack.1-2 + reward line); he goes home, the merchant's prices drop.
   At the table this chains straight on to:
9. **letter**: Osric reads the letter and names Maelis (letter.1-4). ACCEPT.
10. **unlock / king**: UNLOCK at the mine (the chains fall), CRYPT 1, CRYPT 2, THE KING'S HALL: the SKELETON KING
    (raises skeletons every 7-10 s). 2.4 s after he falls Maelis appears in a green flash, says three lines (the game
    pauses), walks off and vanishes: MAELIS IS GONE, SOUTH. The hall's stairs lead HOME TO THE HOLLOW and the gate in
    the Riverlands now stands open.
11. **kingBack**: Osric's thanks in a talk box (not at the table), COLLECT; then the act's end lifts to the table
    (end.1-4), then the end screen (ACT I COMPLETE, time / level / kills / deaths, NEXT: ACT II, ASHFORD and its teaser,
    THANK YOU FOR PLAYING THE DEMO, KEEP PLAYING). **done**: THE ROAD ON IS OPEN (PAST THE RIVERLANDS).

The arrow: always on, step by step, pointing at the next thing that moves the story (inside side areas, at the way
out; below ground only at what has been seen, else EXPLORE). A step finished in the field rings a bell, shows QUEST
COMPLETE and a big TOWN PORTAL: CLAIM YOUR REWARD prompt; in camp the person with your next step speaks to you on
arrival (never with foes near).

### Act II as designed (art/refs/act2: OVERVIEW.md and the three region SPEC.md files, round 70, our review applied)
Not built beyond the first region's map (ASHFORD VALE with its clearings, doors and the six townspeople as name tags;
the rest of Act II in the game is still the old placeholder: Emberwood, caves, the Brood Nest).
- **Where it stands**: a mining town under a smoking mountain, MOUNT ASH. The miners have stopped coming up, and
  something below has started digging toward them. Maelis is behind it. Hero level 7 to about 12 (heroes now arrive
  at 10: shift it by 3), about 30 minutes, three regions west to east.
- **Region 1, ASHFORD VALE** (lv 7-8): you arrive subdued (chimneys cold, the bell silent). The town square: MARA VENN
  the reeve by the bell (quests), TAMSIN FLINT the smith (forge; wants ore from a quarry detour), BRAM TOLL the
  merchant (wagon stall; wants his lockbox back), NELLA REED potions (counter; wants crystal salts from Glassvein),
  SISTER EDDA keeper of the dead (memorial stone; wants Blackwake's burial ledger), RENN PIKE the foreman (mine-office
  desk, empty until rescued). The bell rings; Mara sends you to the **RESCUE PIT** (caves and mine rooms; the PIT
  ENFORCER, an ogre enforcer: raised cleaver means slam, lowered shoulder means charge) for Foreman Renn and two miners
  behind a barricade. Renn opens the **HAUL GATE**. Optional: **BLACKWAKE TOMB** (danger lv 11-12: an elite tomb guard
  and two crossbowmen, the burial ledger, a rare; Edda adds a candle). Places: Cartway, Rescue Pit Yard, Renn's Yard,
  Charcoal Copse (kiln), Grave Road, Blackwake forecourt, Hollow Oak; a dropped miner's helmet at the arrival road.
- **Region 2, THE CINDERWORKS** (lv 8-10): the Ore Yard (the first SHALE RIPPER), the **SILENT WHEEL** (pumps stopped;
  brigands robbing the abandoned works led by **RUSK THE TOLLMAN**, dark red sash, Bram's lockbox on his belt; a crew
  tally after the fight points to Silkshaft), the bridge and the crew's trail, Cold Furnaces (the first CINDER HUSK),
  the ford, **SILKSHAFT forecourt: Maelis** (once, mid-act) shows the old King's **royal seal** (what he took in Act I:
  it unlocks a buried prison under Mount Ash), leaves through a service passage and drops an iron grate behind him;
  **SILKSHAFT** (webbed mine caves): the BROODMOTHER (legs up: bite cone; abdomen up: slowing web; at half she retreats
  and wakes two egg sacs), cocooned miners freed, the sluice handle. Optional **GLASSVEIN GROTTO** (crystal cave:
  slimes, sporecaps, Nella's salts). The **SOUTH SLUICE**: fit the handle and the flooded road drains.
- **Region 3, THE BROKEN FLANK** (lv 10-12, under Mount Ash): Ash Road (first harmless tremor), Watchman's Spur, the
  **BROKEN BEACON** (carry fire from a brazier on your weapon and relight it: XP and a class rare, once; it burns for
  good), Cinder Yard, the Old Sorting Works, the **SLAGPIT** (danger lv 12), Warden's Spur (a prison inventory), the
  Breach forecourt (chains, ward pillars, claw gouges). **THE BREACH**, two floors: THE TORN WORKINGS (tool marks give
  way to claw gouges and an older prison wall) and THE UNBOUND PRISON (lava, prison masonry; three smashed ward-stones
  opened with the royal seal; a note in Maelis's hand); then **GORATH, THE FURNACE MAW** (about twice the hero: claw
  sweep, a ground eruption line; below half he burrows with a visible trail and two fallen crawl in every second
  emergence; a fixed 12x14 arena with lava at the edges). After: Maelis's discarded page by the binding pedestal names
  **GREYMARSH**; Ashford smokes again, the wheel turns, the bell rings once.
- **New monsters**: the SHALE RIPPER (a burrower: a shaking mound spits stones, erupts at the marked spot, slate
  blue-grey with ivory claws) and the CINDER HUSK (a clinker humanoid that opens its chest and lobs embers; charcoal
  with amber cracks). Maelis wears the game's look (the tall charcoal wizard hat with an orange band, charcoal robe
  with orange trim), not a purple hood.
- Review rules kept: no journal; the wards and the page speak in one short line each, like the King's letter.

### Act III (only planned)
GREYMARSH: "a drowned village at night, lanterns and candles" (NOTES, round 29 plan); Maelis's page at the end of Act
II names it. In the game today Act III is the generic town GREYMARSH, the night forest THORNWOOD (the Ogre Warlord),
two hell floors and THE SANCTUM with THE LICH. Nothing more is written. The plan for both acts: "built the Oakhollow
way, one act at a time", the side-area leaders as real bosses, one or two new bosses per act; the enchanter, a stash,
a bounty board and a gambler saved for the Act II and III camps.

---

## 3. The cast

### At the table (cine.js; drawn from the user's own portraits of four real friends)
- **DAVE**: the Dungeon Master. Narrates every table line, voices everyone in the game (caption DAVE, AS ...), peeks in
  over his book. Red wing chair, DM screen with a skull. His tone so far (dry, short, a little smug: A NATURAL TWENTY.
  OF COURSE.) was Claude's default and is open (round 89).
- **MARC**, **AARON**, **CHRIS**: the three friends at the table, each with a running role in the lines so far:
  Chris the grumbler (WOLVES. GREAT. / GOBLINS ON A PAYROLL. GREAT.), Aaron the one who calls the villain (THAT IS OUR
  VILLAIN. / CALLED IT.), Marc the one who connects the clues and leads on (SOMEBODY IS COLLECTING BONES. / THEN WE
  GO SOUTH.). Nothing else is said about them in the game.
- **You**: the unnamed fifth player; your hero is the miniature in front of you.

### The heroes (the four miniatures; class cards in section 4.1)
BARBARIAN (an axe in each hand), PALADIN (hammer and light), MAGE (spells from afar), RANGER (bow and traps). The hero
never speaks; the only lines tied to a class are Dave's first opening line (open.1.*) and the battle shouts (4.10).

### The camp in the Hollow
- **BROTHER OSRIC**: the priest; what is left of Oakhollow gathers round his church (in the game, his pale chapel tent
  with a gold sun and an altar, on the camp's left). White robe, hood, grey hair and beard. Gives the first quest, reads
  the letter, takes the last hand-in. Once of the same order as Maelis; his order cast Maelis out for the books he read.
- **WREN**: Aldo's daughter, by her red family tent near the gate. Purple tunic, brown hair. Asks for her father
  (that step is now skipped: Osric asks for her) and hands in his rescue.
- **ALDO**: the woodcutter. Green tunic, brown hair and beard, an axe. Caged in the wolf den; saw the hooded man with
  the green lantern at the old mine; feeds the camp fire; waits at the fallen tree with his axe and cuts it.
- **HOLLIS**: the farmer the bandits put out in his nightshirt. Tan tunic, grey hair and beard. Stands by his ochre
  tent (seed sacks, a broken plough) below the fire (Osric: HOLLIS SITS BY THE FIRE). Gives the farm quest; the
  merchant owes him for her herbs, so her prices drop by 15% once his farm is back.
- **MERCHANT** ("she", per Hollis and the shop screen): grey hair and beard in the rig's look, purple tunic (the look
  table gives every NPC the hero rig: a mismatch to fix if she should look like a woman). Potion wagon and stall: the
  shop (one showcase piece you can SAVE, stock new after every trip).
- **SMITHY** (the BLACKSMITH screen): bald, bearded, a mace, at the open forge shed. Upgrades gear +1 to +3.
- Two unnamed villagers wander the camp (no lines); five hens.

### The villain
- **MAELIS**: a monk cast out of Brother Osric's order for the books he read, now a necromancer. Pays bandits and
  goblins in silver stamped M to rob graves and hold the road, collects bones to make the old King whole, and wanted
  something from the King all along (the royal seal, per the Act II design). Seen by Aldo as a hooded man with a
  lantern that burns green; in the game he wears a tall charcoal wizard hat with an orange band and a charcoal robe
  (`hat_maelis`, `robe_cinder`; the user preferred it to the first try, a dark hood), the green lantern glowing at his
  side. Appears once in Act I (the King's hall), mid-act once in Act II (Silkshaft), never killed in Act II.

### Bosses and named enemies (MONSTERS in monsters.js; cards and shouts in section 4.7)
- **SKELETON KING**, LORD OF THE RESTLESS DEAD: Act I's boss in THE KING'S HALL; crowned, armoured, red cloak; THE KING
  RAISES HIS DEAD.
- **THE ALPHA** (the wolf den), **GOBLIN CHIEFTAIN** (the Old Watchtower), **WRAITH** (leader of the Barrow),
  **BANDIT CHIEF** (the farm cellar: horned helm, red cape; drops the key and the letter): side-area leaders (elite).
- **THE BARROW WIGHT**, CROWNED IN THE DARK BELOW THE MOUND: the Deep Tomb (raises the dead, calls frost orbs).
- **BROODMOTHER**, MOTHER OF A THOUSAND LEGS (Act II's hall; mid-act in the design), **TREANT ELDER**, THE WOOD THAT
  WALKS (Emberwood; THE ELDER WAKES THE MUSHROOMS), **OGRE WARLORD**, TYRANT OF THE DEEP WOODS (Thornwood; calls
  goblins), **THE LICH**, WHO DIED AND WOULD NOT STAY DEAD (Act III's Sanctum; THE LICH ASCENDS).
- Designed for Act II, not built: PIT ENFORCER, RUSK THE TOLLMAN, GORATH THE FURNACE MAW, SHALE RIPPER, CINDER HUSK.
- The rest of the bestiary (name tags only): skeletons, crypt spearmen, bone axemen, grave crossbowmen, tomb guards,
  skeleton archers, burning dead, wraiths, bone hounds, hell hounds, wolves, boars, dire bears, brigands and brigand
  mastiffs, diggers (snouted, hunched, iron caps: the old mine's own monsters), goblins and goblin shamans, the
  fallen (ones, knifers, slingers, shamans), slimes, shroomlings, sporecaps, cave spiders, ogres (clubbers,
  rockthrowers, shieldbearers, enforcers), the treasure goblin. Champions add BERSERK / STONE / PLAGUED / SHADOW to a
  name; elites carry powers with a first-time tip.
- Boss intro, taunt and death lines: none of the monsters speak. A boss gets a title card (name / epithet) when it
  wakes and THE {NAME} IS SLAIN when it dies; only Maelis talks.

### Act II townspeople (designed; in the game as name tags in Ashford, no lines)
MARA VENN (reeve), TAMSIN FLINT (smith), BRAM TOLL (merchant), NELLA REED (potions), SISTER EDDA (keeper of the dead),
RENN PIKE (foreman, after the rescue). One-line looks are in the ChatGPT design images (`art/refs/act2/region1/town.png`).

---

## 4. All dialogue and in-game text outside the table scenes

Speakers: a person's name = their talk box (the game pauses, a box at the bottom). MESSAGE = a line that floats in the middle of the screen for a few seconds. BANNER = a dark band across the screen with a big TITLE / a smaller line. TRACKER = the quest text at the top left. LABEL = a name over a place or a person. CARD = a full title card. BUTTON = the action button's word.
Where a line is built from a template, the moving part is in {braces} (for example {n}/3) and the source is where the template sits.

### 4.1 The title screen and the hero cards (outside the table lines)

**Splash screen (before the table)**
<sub>source: ui.js:462, ui.js:463, ui.js:470, ui.js:471</sub>
- **[ui.splash.1]** CARD: DUNGEONS
- **[ui.splash.2]** CARD: OF BONES
- **[ui.splash.3]** LABEL: TAP TO BEGIN
- **[ui.splash.4]** LABEL: SOUND ON FOR THE MUSIC

**The hero cards** _(under each miniature at the table, and on the old title: the class name, then its two lines joined with ". ")_
<sub>source: barbarian.js:189, ui.js:444, ui.js:442, ui.js:443</sub>
- **[hero.barbarian.name]** LABEL: BARBARIAN  _(class id 'warrior'; renamed in barbarian.js)_
- **[hero.barbarian.lines]** LABEL: AN AXE IN EACH HAND. FIGHTS UP CLOSE
- **[hero.paladin.name]** LABEL: PALADIN
- **[hero.paladin.lines]** LABEL: HAMMER AND LIGHT. SLOW TO DIE
- **[hero.mage.name]** LABEL: MAGE
- **[hero.mage.lines]** LABEL: SPELLS FROM AFAR. FRAGILE, DEADLY
- **[hero.ranger.name]** LABEL: RANGER
- **[hero.ranger.lines]** LABEL: BOW AND TRAPS. QUICK AND NIMBLE

**The old title (only with the table off)**
<sub>source: ui.js:511</sub>
- **[ui.title.choose]** LABEL: CHOOSE YOUR HERO

### 4.2 Table lines that table-script.md does not list

**Rewards chosen at the table** _(the last shot of a hand-in at the table: a talk box over the table with the three reward cards; export.cjs skips these)_
<sub>source: quests.js:245, quests.js:255</sub>
- **[table.aldoBack.reward]** DAVE (as WREN): TAKE SOMETHING. AND REST BY THE FIRE: IT WILL MEND YOU.  _(after aldoBack.5)_
- **[table.farmBack.reward]** DAVE (as HOLLIS): TAKE ONE. AND THE MERCHANT OWES ME: HER PRICES ARE FAIRER FOR YOU NOW.  _(after farmBack.2)_

**Dave's count after each clue** _(table-script.md mentions these in a note without IDs; Dave peeks in after the clue lines)_
<sub>source: quests.js:391, quests.js:390</sub>
- **[clue.left.2]** DAVE: TWO DANGERS LEFT IN THE HOLLOW.  _(after the first danger)_
- **[clue.left.1]** DAVE: ONE DANGER LEFT IN THE HOLLOW.  _(after the second)_
- **[clue.left.0]** DAVE: THE HOLLOW IS QUIET. ALDO WAITS AT THE FALLEN TREE WITH HIS AXE.  _(after the third)_

**Captions and prompts at the table**
<sub>source: cine.js:1024, cine.js:1029, cine.js:1040</sub>
- **[table.caption]** LABEL: DAVE, AS {name}  _(the caption over a line Dave voices)_
- **[table.roll]** LABEL: TAP TO ROLL
- **[table.title]** LABEL: DUNGEONS OF BONES  _(top of the screen at the table title)_

### 4.3 Act I in story order: the talk boxes and what happens in the field

With the table ON (the normal game) the camp quest steps (meet, aldoBack, hollis/mine, farmBack, letter) are told by Dave at the table instead, so the box versions below of those steps are seen only with the table off (`?cine=0`, tests). Repeat lines, the den, the tree, the finale and Osric's last hand-in are always boxes.

#### Beat 1. Arrival at the camp in the Hollow

**BROTHER OSRIC, first talk (ACCEPT)** _(the first talk (box version: seen only with the table off; with the table on, Dave tells it: table-script meet.1-4))_
<sub>source: quests.js:273, quests.js:274, quests.js:275</sub>
- **[npc.osric.meet.1]** BROTHER OSRIC: GOD BE THANKED, A BLADE. I AM OSRIC. THIS CAMP IN THE HOLLOW IS ALL THAT IS LEFT OF OAKHOLLOW.
- **[npc.osric.meet.2]** BROTHER OSRIC: THE DEAD WALK HERE. AND THE GRAVES BEHIND MY CHURCH WERE NOT CLAWED OPEN FROM BELOW. THEY WERE DUG, WITH SPADES.
- **[npc.osric.meet.3]** BROTHER OSRIC: ALDO THE WOODCUTTER WENT UP TO THE WOLF GLADE THREE DAYS AGO AND DID NOT COME BACK. THE WOLVES HAVE A DEN PAST IT, NORTHEAST. FIND HIM, AND BRING HIM HOME TO HIS DAUGHTER WREN.
  - button: ACCEPT

**WREN, if you go to her first** _(before Osric has been spoken to)_
<sub>source: quests.js:289</sub>
- **[npc.wren.first.1]** WREN: BROTHER OSRIC IS ON THE CHURCH STEPS. SPEAK TO HIM FIRST, PLEASE.

**What the screen says**
<sub>source: quests.js:421</sub>
- **[banner.newQuest]** BANNER: NEW QUEST / {quest name}: {goal}  _(every new quest; NEW OBJECTIVE / {goal} for a new step of the same quest)_

#### Beat 2. The missing woodcutter: the wolf den

**WREN's quest** _(Wren's own quest (box version; UNREACHABLE since round 51: Osric gives the quest himself and the 'wren' step is skipped))_
<sub>source: quests.js:291, quests.js:292, quests.js:293</sub>
- **[npc.wren.ask.1]** WREN: YOU ARE THE ONE OSRIC SENT? MY FATHER IS ALDO. HE WENT TO CUT WOOD BY THE WOLF GLADE AND NEVER CAME HOME. THE DEN IS PAST IT, NORTHEAST.
- **[npc.wren.ask.2]** WREN: THE WOLVES HAVE BEEN WRONG ALL MONTH. THEY HOWL IN DAYLIGHT. HE SAID THEY HAD A DEN PAST THE OLD TREES.
- **[npc.wren.ask.3]** WREN: PLEASE. BRING HIM BACK.
  - button: ACCEPT

**Entering the den**
<sub>source: quests.js:687</sub>
- **[side.den.enter]** MESSAGE: THE WOLF DEN  _(the side area's name on entering)_

**ALDO in the cage** _(in the wolf den, the Alpha alive)_
<sub>source: quests.js:305</sub>
- **[npc.aldo.cage.1]** ALDO: BEHIND YOU! THE BIG ONE! KILL IT FIRST, THEN GET ME OUT OF HERE!

**The Alpha falls**
<sub>source: quests.js:141</sub>
- **[field.alpha.dead]** MESSAGE: THE ALPHA IS DEAD. FREE ALDO

**ALDO, freed** _(in the wolf den, the Alpha dead (button OK frees him))_
<sub>source: quests.js:306</sub>
- **[npc.aldo.free.1]** ALDO: YOU KILLED IT? BLESS YOU. BREAK THE LOCK, QUICK.
- **[npc.aldo.free.2]** ALDO: I KNOW THE WAY HOME. TELL WREN I AM COMING.
  - button: OK

**Aldo runs home**
<sub>source: quests.js:398, quests.js:420</sub>
- **[field.aldo.free]** MESSAGE: ALDO IS FREE. RETURN TO WREN
- **[banner.questComplete]** BANNER: QUEST COMPLETE / {quest name}  _(a step that ends in the field)_
- **[field.portalPrompt]** MESSAGE: OPEN A TOWN PORTAL TO CLAIM YOUR REWARD

#### Beat 3. Aldo is home

**WREN and ALDO, the hand-in (COLLECT)** _(Aldo is home: the hand-in (box version; table-script aldoBack.1-5 + the table reward line))_
<sub>source: quests.js:295, quests.js:296, quests.js:297, quests.js:298, quests.js:299, quests.js:300</sub>
- **[npc.wren.aldoBack.1]** WREN: FATHER! YOU BROUGHT HIM BACK!
- **[npc.wren.aldoBack.2]** ALDO: THEY HAD ME IN A CAGE. A CAGE, LIKE A HEN FOR THE POT. WOLVES DO NOT BUILD CAGES.
- **[npc.wren.aldoBack.3]** ALDO: AND THEY WERE NOT HUNTING. THEY WERE RUNNING. SOMETHING IN THE NORTH HILLS DROVE THEM OUT.
- **[npc.wren.aldoBack.4]** ALDO: BEFORE THEY TOOK ME I SAW A HOODED MAN AT THE OLD MINE, WITH A LANTERN THAT BURNED GREEN. LOOK THERE.
- **[npc.wren.aldoBack.5]** WREN: TAKE SOMETHING. AND FATHER WILL KEEP THE CAMPFIRE HIGH: REST BY IT AND IT WILL MEND YOU.
- **[npc.wren.aldoBack.6]** ALDO: THE ROAD NORTH? NOT WHILE GOBLINS HOLD THE TOWER, THE STONES ARE STIRRING AND THE BARROW IS OPEN. DEAL WITH THOSE THREE, ANY ORDER YOU LIKE, AND I WILL CUT THE TREE. I WILL WAIT THERE WITH MY AXE.
  - button: COLLECT (choose one of three rewards)

**After the reward**
<sub>source: quests.js:220, quests.js:246</sub>
- **[field.quest.done]** MESSAGE: {QUEST NAME}: DONE  _(payQuest)_
- **[field.quest.pay]** MESSAGE: +{gold} GOLD, +{xp} XP
- **[field.campfire]** MESSAGE: REST BY THE CAMPFIRE TO HEAL

#### Beat 4. The three dangers of the Hollow (any order)

**The fallen tree on the road north** _(walking up to it before the cut)_
<sub>source: quests.js:472, quests.js:473, quests.js:474</sub>
- **[field.tree.1]** MESSAGE: A FALLEN TREE BLOCKS THE ROAD NORTH
- **[field.tree.noAldo]** MESSAGE: ONLY A WOODCUTTER COULD MOVE IT. FIND ALDO  _(Aldo not yet free)_
- **[field.tree.wait]** MESSAGE: ALDO: I CUT IT WHEN THE HOLLOW IS SAFE  _(Aldo free)_
- **[field.tree.left]** MESSAGE: STILL TO DO: {what is left}  _(e.g. WATCHTOWER, STANDING STONES)_

**ALDO at the fallen tree, before all three are done** _(tap him: his line, one line per danger, then a tip; with two done the tip becomes ONE MORE.)_
<sub>source: quests.js:309, quests.js:310</sub>
- **[npc.aldo.tree.1]** ALDO: THE AXE IS SHARP. THE MOMENT THE HOLLOW IS SAFE, THIS TREE COMES DOWN.
- **[npc.aldo.tree.status]** ALDO: {DANGER NAME}: DONE  /  {DANGER NAME}: NOT YET  _(three lines, one per danger, e.g. THE WATCHTOWER: NOT YET)_
- **[npc.aldo.tree.tip]** ALDO: TAP ONE IN THE LIST AT THE TOP AND THE ARROW TAKES YOU THERE.  _(none or one done)_
- **[npc.aldo.tree.last]** ALDO: ONE MORE.  _(two done)_

**The three dangers (tracker and banners)**
<sub>source: quests.js:34, quests.js:35, quests.js:36, quests.js:59</sub>
- **[h3.tower.name]** LABEL: THE WATCHTOWER
- **[h3.tower.goal]** TRACKER: CLEAR THE OLD WATCHTOWER
- **[h3.stones.name]** LABEL: THE STANDING STONES
- **[h3.stones.goal]** TRACKER: HOLD THE STANDING STONES
- **[h3.barrow.name]** LABEL: THE BARROW
- **[h3.barrow.goal]** TRACKER: QUIET THE BARROW
- **[h3.done.some]** BANNER: {DANGER NAME}: DONE / {n}/3. +{gold} GOLD, +{xp} XP
- **[h3.done.all]** BANNER: {DANGER NAME}: DONE / THE HOLLOW IS SAFE. MEET ALDO AT THE FALLEN TREE

**The Old Watchtower**
<sub>source: quests.js:687, game.js:444</sub>
- **[side.tower.enter]** MESSAGE: THE OLD WATCHTOWER  _(on entering; its leader is the GOBLIN CHIEFTAIN)_
- **[field.panic]** MESSAGE: THEY SCATTER IN PANIC  _(any shaman or chieftain falling with its pack about)_

**The Standing Stones (an outdoor fight)**
<sub>source: quests.js:69, quests.js:98, quests.js:76</sub>
- **[btn.stones]** BUTTON: WAKE THE STONES
- **[field.stones.wake]** MESSAGE: THE STONES WAKE. HOLD THE RING
- **[banner.stones.wave]** BANNER: WAVE {n}/3 / THEY COME OUT OF THE WOODS  _(waves 1 and 2)_
- **[banner.stones.last]** BANNER: WAVE 3/3 / SOMETHING BIG IS COMING  _(a dire bear and two boars)_
- **[field.stones.silent]** MESSAGE: THE STONES FALL SILENT  _(you walked away or fell)_

**The Barrow (danger, two floors)**
<sub>source: quests.js:687, quests.js:722, quests.js:694</sub>
- **[side.barrow.enter]** MESSAGE: THE BARROW  _(leader: the WRAITH)_
- **[side.barrow.down]** LABEL: DOWN: THE DEEP TOMB  _(over its stairs)_
- **[side.barrow2.enter]** MESSAGE: THE BARROW: THE DEEP TOMB  _(optional second floor; THE BARROW WIGHT and its hoard)_

_(After each danger Dave peeks in with a clue: table-script.md clue.tower / clue.stones / clue.barrow, then clue.left.* above.)_

#### Beat 5. Aldo cuts the fallen tree

**Walking up to Aldo once the Hollow is safe**
<sub>source: quests.js:468, quests.js:347, quests.js:363, quests.js:370, quests.js:374</sub>
- **[field.chop.foes]** MESSAGE: ALDO: DEAL WITH THOSE FIRST  _(foes near him)_
- **[field.chop.1]** MESSAGE: ALDO: STAND BACK
- **[field.chop.2]** MESSAGE: ALDO: ONE MORE  _(after the second blow)_
- **[banner.chop]** BANNER: THE ROAD NORTH IS OPEN / ALDO HAS CUT THE FALLEN TREE
- **[field.chop.3]** MESSAGE: ALDO: GO ON. THE ROAD IS YOURS

**ALDO afterwards (while the next step is the mine)** _(after the cut, while the step is 'mine')_
<sub>source: quests.js:311</sub>
- **[npc.aldo.mine.1]** ALDO: THE OLD MINE, NORTH IN THE RIVERLANDS. THAT IS WHERE I SAW HIM. GREEN FIRE. I CLEARED THE TREE OFF THE ROAD FOR YOU.

#### Beat 6. Hollis and the stolen farm (the Riverlands)

**HOLLIS, the farm quest (ACCEPT)** _(Hollis's farm quest, chains NOT seen first (box version; table-script hollis.1-3))_
<sub>source: quests.js:315, quests.js:316, quests.js:317</sub>
- **[npc.hollis.ask.1]** HOLLIS: A MAN AT THE OLD MINE? THE BANDITS HAVE CHAINED IT SHUT. THEY TOOK MY FARM A WEEK AGO AND PUT ME OUT IN MY NIGHTSHIRT.
- **[npc.hollis.ask.2]** HOLLIS: EVERY NIGHT THEY HAUL SACKS IN AND OUT OF MY CELLAR. HEAVY SACKS. I DO NOT WANT TO KNOW WHAT IS IN THEM.
- **[npc.hollis.ask.3]** HOLLIS: THEIR CHIEF WEARS THE MINE KEY ON HIS BELT. THE FARM IS NORTH, IN THE RIVERLANDS, PAST THE FALLEN TREE. GET IT BACK FOR ME?
  - button: ACCEPT

**The same if you looked at the chained mine first: line 1 becomes**
<sub>source: quests.js:315</sub>
- **[npc.hollis.askChains.1]** HOLLIS: CHAINS ON THE MINE? THAT IS THE BANDITS. THEY TOOK MY FARM A WEEK AGO AND PUT ME OUT IN MY NIGHTSHIRT.

**Arriving in the Riverlands**
<sub>source: outdoor.js:25</sub>
- **[area.riv]** MESSAGE: THE RIVERLANDS  _(the area name on arrival)_

**The farm and the cellar**
<sub>source: quests.js:142, quests.js:687, quests.js:458, quests.js:143</sub>
- **[field.farm.clear]** MESSAGE: THE FARM IS CLEAR. THEIR CHIEF IS IN THE CELLAR  _(the fourth brigand)_
- **[side.cellar.enter]** MESSAGE: THE FARM CELLAR  _(on entering)_
- **[field.cellar.1]** MESSAGE: SACKS OF BONES, STACKED TO THE ROOF.  _(first time in the cellar)_
- **[field.cellar.2]** MESSAGE: THE GRAVES WERE DUG FOR THIS.
- **[field.chief.1]** MESSAGE: THE CHIEF DROPS THE MINE KEY  _(the Bandit Chief falls)_
- **[field.chief.2]** MESSAGE: AND A LETTER, SIGNED M.

**HOLLIS, the hand-in (COLLECT)** _(back from the farm: the hand-in (box version; table-script farmBack.1-2 + the table reward line))_
<sub>source: quests.js:319, quests.js:320, quests.js:321</sub>
- **[npc.hollis.farmBack.1]** HOLLIS: BONES? MY CELLAR FULL OF BONES. FROM THE GRAVEYARD. GOD HAVE MERCY.
- **[npc.hollis.farmBack.2]** HOLLIS: I AM GOING HOME ALL THE SAME. AND THE MERCHANT OWES ME FOR HER HERBS: HER PRICES ARE FAIRER FOR YOU NOW.
- **[npc.hollis.farmBack.3]** HOLLIS: THAT LETTER THE CHIEF HAD. SHOW IT TO BROTHER OSRIC. HE READS BETTER THAN ME.
  - button: COLLECT (choose one of three rewards)

#### Beat 7. The letter

**BROTHER OSRIC reads the letter (ACCEPT)** _(after the farm, the letter (box version; table-script letter.1-4))_
<sub>source: quests.js:277, quests.js:278, quests.js:279, quests.js:280</sub>
- **[npc.osric.letter.1]** BROTHER OSRIC: A LETTER? LET ME SEE.
- **[npc.osric.letter.2]** BROTHER OSRIC: "EVERY BONE YOU BRING IS PAID IN SILVER. THE KING MUST BE WHOLE. - M."
- **[npc.osric.letter.3]** BROTHER OSRIC: I KNOW THIS HAND. MAELIS. HE WAS A BROTHER OF MY ORDER, UNTIL WE CAST HIM OUT FOR THE BOOKS HE READ. I SHOULD HAVE BURNED THEM MYSELF.
- **[npc.osric.letter.4]** BROTHER OSRIC: HE IS RAISING THE OLD KING UNDER THE MINE. TAKE THE KEY. PUT THE KING BACK IN HIS GRAVE, AND FIND MAELIS IF YOU CAN.
  - button: ACCEPT

#### Beat 8. The old mine and the Skeleton King

**The chained mine (before the key)**
<sub>source: quests.js:500, quests.js:491</sub>
- **[btn.mine.look]** BUTTON: LOOK  _(beside the chains, no key)_
- **[field.mine.chained.1]** MESSAGE: THE MINE IS CHAINED SHUT
- **[field.mine.chained.2]** MESSAGE: THE BANDITS TOOK THE KEY

**With the key**
<sub>source: quests.js:500, quests.js:506, outdoor.js:1761</sub>
- **[btn.mine.unlock]** BUTTON: UNLOCK
- **[field.mine.open]** MESSAGE: THE KEY TURNS. THE CHAINS FALL AWAY
- **[label.mine]** LABEL: THE OLD MINE  _(over the mine mouth)_

**Down below (two crypt floors, then the hall)**
<sub>source: outdoor.js:25, outdoor.js:12, game.js:98, monsters.js:1035, skills.js:1012, game.js:864, game.js:446</sub>
- **[area.floor]** MESSAGE: CRYPT {n}  _(each floor's name on arrival: the theme name and the floor)_
- **[area.hall]** MESSAGE: THE KING'S HALL  _(the boss hall)_
- **[field.arena]** MESSAGE: SOMETHING VAST STIRS IN THE DARK  _(arriving in any boss hall)_
- **[boss.king.card]** CARD: SKELETON KING / LORD OF THE RESTLESS DEAD  _(the boss card when he wakes)_
- **[boss.king.raise]** MESSAGE: THE KING RAISES HIS DEAD  _(every 7-10 s)_
- **[boss.guards]** MESSAGE: THE {BOSS} GUARDS THE WAY DOWN  _(trying the stairs while he lives)_
- **[boss.slain]** MESSAGE: THE {BOSS} IS SLAIN  _(every boss)_
- **[boss.slain.2]** MESSAGE: THE WAY DOWN IS OPEN  _(every boss but the King in Act I's story (Maelis comes instead))_

**MAELIS appears in a green flash (the game pauses; button OK)** _(2.4 s after the King falls, first time only)_
<sub>source: quests.js:757, quests.js:758, quests.js:759</sub>
- **[maelis.finale.1]** MAELIS: SO THE OLD KING SLEEPS AGAIN. NO MATTER. HE HAD ALREADY GIVEN ME WHAT I CAME FOR.
- **[maelis.finale.2]** MAELIS: YOU ARE OSRIC'S, AREN'T YOU? HE BURNED MY BOOKS AND CALLED IT MERCY. TELL HIM THEY WERE RIGHT: WHAT IS BURIED IN THIS LAND DOES NOT STAY BURIED.
- **[maelis.finale.3]** MAELIS: FOLLOW ME SOUTH, IF YOU LIKE. I WOULD SO LIKE YOU TO SEE WHAT I WAKE NEXT.

**He walks off and vanishes**
<sub>source: quests.js:765, outdoor.js:1771, game.js:875</sub>
- **[field.maelis.gone]** MESSAGE: MAELIS IS GONE, SOUTH
- **[field.maelis.wayUp]** MESSAGE: THE WAY UP IS OPEN
- **[label.hall.home]** LABEL: HOME TO THE HOLLOW  _(over the hall's stairs: 'HOME TO ' + the town's name)_
- **[field.home]** MESSAGE: THE ROAD ON IS OPEN, PAST THE RIVERLANDS  _(back in the Hollow from the hall)_

#### Beat 9. Osric's thanks and the end of Act I

**BROTHER OSRIC, the last hand-in (COLLECT)** _(the King is dead, Maelis seen (always so in play: he appears after the King))_
<sub>source: quests.js:282, quests.js:283</sub>
- **[npc.osric.kingBack.1]** BROTHER OSRIC: THE KING IS DUST AGAIN. I FELT IT, LIKE A WINDOW OPENED IN A SICKROOM.
- **[npc.osric.kingBack.2]** BROTHER OSRIC: AND MAELIS STOOD OVER THE BONES AND LAUGHED? THEN HE HAS WHAT HE WANTED FROM THE KING. HE WENT SOUTH, PAST THE RIVERLANDS. THE ROAD IS OPEN NOW. TAKE THIS, AND MY THANKS.
  - button: COLLECT (choose one of three rewards)

**The other second line (Maelis not seen; only old saves)**
<sub>source: quests.js:284</sub>
- **[npc.osric.kingBackNoMaelis.2]** BROTHER OSRIC: BUT MAELIS IS NOT FINISHED. THE ROAD ON IS OPEN NOW, PAST THE RIVERLANDS, AND THAT IS THE WAY HE WENT. TAKE THIS, AND MY THANKS.

_(Then the table: table-script.md end.1-4. Then the end screen.)_

**The end screen**
<sub>source: quests.js:781, quests.js:782, quests.js:783, quests.js:787, quests.js:788, quests.js:789, quests.js:791, quests.js:793, quests.js:422</sub>
- **[end.screen.1]** CARD: ACT I
- **[end.screen.2]** CARD: COMPLETE
- **[end.screen.3]** CARD: THE KING SLEEPS. MAELIS HAS FLED SOUTH.
- **[end.screen.stats]** CARD: TIME / LEVEL / KILLS / DEATHS  _(the rows of numbers)_
- **[end.screen.4]** CARD: NEXT: ACT II, ASHFORD
- **[end.screen.5]** CARD: A MINING TOWN UNDER A SMOKING MOUNTAIN. THE MINERS HAVE STOPPED COMING UP, AND SOMETHING BELOW HAS STARTED DIGGING TOWARD THEM.
- **[end.screen.6]** CARD: THANK YOU FOR PLAYING THE DEMO
- **[end.screen.btn]** BUTTON: KEEP PLAYING
- **[end.keep]** MESSAGE: THE ROAD SOUTH IS OPEN, PAST THE RIVERLANDS  _(after KEEP PLAYING)_
- **[banner.actDone]** BANNER: ACT I COMPLETE / THE ROAD ON IS OPEN

### 4.4 Repeat lines and hints, by person

**BROTHER OSRIC, when he has nothing new** _(one line; which one depends on the step)_
<sub>source: quests.js:285, quests.js:271</sub>
- **[npc.osric.hint.wren]** BROTHER OSRIC: WREN IS BY THE TENTS. SHE NEEDS YOU MORE THAN I DO.  _(steps: wren)_
- **[npc.osric.hint.den]** BROTHER OSRIC: THE DEN IS PAST THE WOLF GLADE, NORTHEAST. GO CAREFULLY.  _(steps: den, cage)_
- **[npc.osric.hint.aldoBack]** BROTHER OSRIC: WREN WILL WANT TO KNOW.  _(steps: aldoBack)_
- **[npc.osric.hint.mine]** BROTHER OSRIC: ALDO SAW SOMEONE AT THE MINE? THEN LOOK THERE.  _(steps: mine)_
- **[npc.osric.hint.hollis]** BROTHER OSRIC: HOLLIS SITS BY THE FIRE. HE LOST HIS FARM TO THE BANDITS.  _(steps: hollis)_
- **[npc.osric.hint.farm]** BROTHER OSRIC: THE FARM IS EAST, PAST THE GATE.  _(steps: farm, cellar)_
- **[npc.osric.hint.farmBack]** BROTHER OSRIC: HOLLIS WILL WANT TO KNOW.  _(steps: farmBack)_
- **[npc.osric.hint.unlock]** BROTHER OSRIC: THE MINE IS NORTH. THE LIGHT GOES WITH YOU.  _(steps: unlock, king)_
- **[npc.osric.hint.hollow3]** BROTHER OSRIC: THE LIGHT KEEPS YOU.  _(steps: hollow3, chop, done)_
- **[npc.osric.after.open]** BROTHER OSRIC: THE ROAD ON IS OPEN, PAST THE RIVERLANDS. GO WITH THE LIGHT.  _(after Act I: open)_
- **[npc.osric.after.shut]** BROTHER OSRIC: THE LIGHT KEEPS YOU.  _(after Act I: shut)_

**WREN, Aldo home** _(repeat line, Aldo free)_
<sub>source: quests.js:301</sub>
- **[npc.wren.idle.home.1]** WREN: FATHER IS HOME. I CAN SLEEP AGAIN.

**WREN, Aldo missing** _(repeat line, Aldo still missing)_
<sub>source: quests.js:301</sub>
- **[npc.wren.idle.missing.1]** WREN: PLEASE FIND HIM.

**ALDO by his woodpile** _(repeat line (by his woodpile))_
<sub>source: quests.js:311</sub>
- **[npc.aldo.idle.1]** ALDO: THE FIRE IS HIGH. SIT A WHILE.

**HOLLIS, before the farm** _(repeat line, farm not yet won back)_
<sub>source: quests.js:322</sub>
- **[npc.hollis.idle.before.1]** HOLLIS: I HAD A FARM, ONCE. NORTH, IN THE RIVERLANDS.

**HOLLIS, after the farm** _(repeat line, farm won back)_
<sub>source: quests.js:322</sub>
- **[npc.hollis.idle.after.1]** HOLLIS: THE FIELDS WILL TAKE A YEAR TO COME BACK. BUT THEY WILL COME BACK.

### 4.5 Quest names, tracker goals, prompts

**Quest names (tracker, small, top left)**
<sub>source: quests.js:21</sub>
- **[quest.hollow]** TRACKER: CLEAR THE HOLLOW
- **[quest.woodcutter]** TRACKER: THE MISSING WOODCUTTER
- **[quest.farm]** TRACKER: THE STOLEN FARM
- **[quest.king]** TRACKER: THE KING BELOW

**The goal for each step (tracker, big)** _(step ids from storyStage in quests.js, in story order)_
<sub>source: quests.js:123, quests.js:121, quests.js:122, quests.js:124, quests.js:125</sub>
- **[goal.meet]** TRACKER: SPEAK TO BROTHER OSRIC
- **[goal.wren]** TRACKER: TALK TO WREN BY THE TENTS
- **[goal.den]** TRACKER: FIND ALDO IN THE WOLF DEN (NORTHEAST)
- **[goal.cage]** TRACKER: FREE ALDO
- **[goal.aldoBack]** TRACKER: RETURN TO WREN
- **[goal.hollow3]** TRACKER: THREE DANGERS BAR THE ROAD NORTH {n}/3
- **[goal.chop]** TRACKER: MEET ALDO AT THE FALLEN TREE
- **[goal.mine]** TRACKER: LOOK AT THE OLD MINE (NORTH, THE RIVERLANDS)
- **[goal.hollis]** TRACKER: ASK HOLLIS ABOUT THE CHAINS
- **[goal.farm]** TRACKER: DRIVE THE BANDITS FROM THE FARM {n}/4
- **[goal.cellar]** TRACKER: FIND THEIR CHIEF IN THE CELLAR
- **[goal.farmBack]** TRACKER: RETURN TO HOLLIS
- **[goal.letter]** TRACKER: SHOW THE LETTER TO BROTHER OSRIC
- **[goal.unlock]** TRACKER: UNLOCK THE OLD MINE (THE RIVERLANDS)
- **[goal.king]** TRACKER: PUT THE KING TO REST, BELOW THE MINE
- **[goal.kingBack]** TRACKER: RETURN TO BROTHER OSRIC
- **[goal.done]** TRACKER: THE ROAD ON IS OPEN (PAST THE RIVERLANDS)

**Other tracker and prompt text**
<sub>source: quests.js:570, quests.js:564, dungeon.js:140, quests.js:435</sub>
- **[goal.claim]** TRACKER: QUEST COMPLETE: CLAIM YOUR REWARD IN CAMP
- **[goal.also]** TRACKER: ALSO: {the other dangers}  _(during the three dangers)_
- **[goal.explore]** TRACKER: EXPLORE: THE WAY ON IS SOMEWHERE ON THIS FLOOR  _(below ground, goal not yet seen)_
- **[prompt.portal.claim]** BUTTON: TOWN PORTAL: CLAIM YOUR REWARD
- **[prompt.portal.camp]** BUTTON: TOWN PORTAL: BACK TO CAMP
- **[prompt.portal.walk]** BUTTON: WALK INTO THE PORTAL

**The action button and the name tags' tap hints**
<sub>source: ui.js:648</sub>
- **[btn.talk]** BUTTON: TALK
- **[btn.freeAldo]** BUTTON: FREE ALDO
- **[btn.shop]** BUTTON: SHOP
- **[btn.smith]** BUTTON: UPGRADE GEAR

### 4.6 Place names, act cards, signs and labels

**Act cards (entering an act's town: ACT n / the act's name / the town)** _(the act names are the old placeholder ones; the story calls the acts Oakhollow, Ashford and Greymarsh)_
<sub>source: outdoor.js:12, outdoor.js:13, outdoor.js:14, outdoor.js:16</sub>
- **[act.1.name]** CARD: THE BLIGHTED WOOD  _(ACT I; boss hall: THE KING'S HALL)_
- **[act.2.name]** CARD: THE BURNING DEEP  _(ACT II; boss hall: THE BROOD NEST)_
- **[act.3.name]** CARD: THE PIT  _(ACT III; boss hall: THE SANCTUM)_
- **[act.loop]** CARD: ACT {n} NIGHTMARE / HELL / TORMENT  _(later loops)_

**Area names (said on arrival)**
<sub>source: outdoor.js:24, outdoor.js:13, outdoor.js:14, game.js:94, game.js:101</sub>
- **[area.town.1]** MESSAGE: THE HOLLOW  _(Act I town (the hand-built Act I hub))_
- **[area.town.2]** MESSAGE: ASHFORD  _(Act II town (built as the region ASHFORD VALE))_
- **[area.town.3]** MESSAGE: GREYMARSH  _(Act III town)_
- **[area.forest.1]** MESSAGE: DEEPWOOD  _(Act I wilds (unused in Act I: the Riverlands takes its place))_
- **[area.forest.2]** MESSAGE: EMBERWOOD  _(Act II wilds (autumn; the Treant Elder))_
- **[area.forest.3]** MESSAGE: THORNWOOD  _(Act III wilds (night; the Ogre Warlord))_
- **[area.hall.broodmother]** MESSAGE: THE BROOD NEST  _(boss: BROODMOTHER)_
- **[area.hall.lich]** MESSAGE: THE SANCTUM  _(boss: THE LICH)_
- **[area.night]** MESSAGE: NIGHT HAS FALLEN  _(arriving at a night level)_
- **[area.forest.boss1]** MESSAGE: A TREANT ELDER HOLDS THE WAY DOWN
- **[area.forest.boss2]** MESSAGE: AN OGRE WARLORD HOLDS THE WAY DOWN

**The Hollow's clearings (layout names from hollow.json; shown on the travel map and in the layout pictures, not as in-game labels)**
<sub>source: outdoor.js:393</sub>
- **[place.hollow.camp]** LABEL: CAMP  _(level 0)_
- **[place.hollow.brook]** LABEL: BROOK MEADOW  _(level 1)_
- **[place.hollow.glade]** LABEL: WOLF GLADE  _(level 1-2)_
- **[place.hollow.denyard]** LABEL: DEN MOUTH  _(level 2)_
- **[place.hollow.westwood]** LABEL: WESTWOOD  _(level 2-3)_
- **[place.hollow.grove]** LABEL: HIDDEN GROVE  _(level 2)_
- **[place.hollow.tower]** LABEL: WATCHTOWER YARD  _(level 2-3)_
- **[place.hollow.graves]** LABEL: GRAVEYARD PATH  _(level 3)_
- **[place.hollow.barrowyard]** LABEL: BARROW  _(level 6)_
- **[place.hollow.crossing]** LABEL: FALLEN TREE  _(level 2)_
- **[place.hollow.exit]** LABEL: TO THE RIVERLANDS  _(level 2)_

**Doors in the Hollow and the Riverlands (labels over the doors)**
<sub>source: quests.js:633, quests.js:639, quests.js:635, quests.js:640, outdoor.js:591, outdoor.js:1752, outdoor.js:1761, outdoor.js:1771</sub>
- **[label.door.den]** LABEL: WOLF DEN
- **[label.door.tower]** LABEL: OLD WATCHTOWER
- **[label.door.barrow]** LABEL: THE BARROW: DANGER  _(in red)_
- **[label.door.cellar]** LABEL: FARMHOUSE CELLAR
- **[label.road]** LABEL: TO THE RIVERLANDS  _(the road north out of the Hollow ('TO ' + where it goes))_
- **[label.gate.shut]** LABEL: THE ROAD ON IS CLOSED  _(the Riverlands' gate to Act II)_
- **[label.gate.open]** LABEL: THE ROAD ON: THE BURNING DEEP  _(once open: 'THE ROAD ON: ' + the next act's name)_
- **[label.dungeon]** LABEL: DUNGEON ENTRANCE
- **[label.wayout]** LABEL: WAY OUT
- **[label.stairs]** LABEL: STAIRS DOWN
- **[label.sealed]** LABEL: SEALED  _(stairs while the boss lives)_

**People's name tags in the Hollow** _(over their heads; the two unnamed villagers have none)_
<sub>source: outdoor.js:594, outdoor.js:600, outdoor.js:601, outdoor.js:602, outdoor.js:365, outdoor.js:366, quests.js:743</sub>
- **[tag.priest]** LABEL: BROTHER OSRIC
- **[tag.wren]** LABEL: WREN
- **[tag.hollis]** LABEL: HOLLIS
- **[tag.aldo]** LABEL: ALDO
- **[tag.smith]** LABEL: SMITHY
- **[tag.merchant]** LABEL: MERCHANT
- **[tag.maelis]** LABEL: MAELIS

**The shop and the forge screens (the lines with a voice)**
<sub>source: shop.js:115, shop.js:159, shop.js:139, shop.js:138, shop.js:212, shop.js:218, shop.js:226</sub>
- **[shop.title]** LABEL: MERCHANT  _(shop header)_
- **[shop.sell]** LABEL: SHE PAYS A LITTLE MORE THAN SALVAGE
- **[shop.new]** LABEL: NEW AFTER EVERY TRIP OUT
- **[shop.sold]** MESSAGE: SOLD. SOMETHING NEW AFTER YOUR NEXT TRIP
- **[smith.title]** LABEL: BLACKSMITH  _(forge header)_
- **[smith.hint]** LABEL: UP TO +3. A +3 WEAPON SHINES
- **[smith.max]** LABEL: MASTERWORK: FULLY UPGRADED

**Waystones (names said when one wakes, and on the travel map)**
<sub>source: travel.js:61, travel.js:15, travel.js:16, travel.js:17, travel.js:18, travel.js:21, travel.js:22, travel.js:23</sub>
- **[way.wake]** MESSAGE: WAYSTONE: {name}
- **[way.hollow.camp]** LABEL: CAMP  _(the Hollow)_
- **[way.hollow.wolfglade]** LABEL: WOLF GLADE  _(the Hollow)_
- **[way.hollow.graveyardpath]** LABEL: GRAVEYARD PATH  _(the Hollow)_
- **[way.hollow.fallentree]** LABEL: FALLEN TREE  _(the Hollow)_
- **[way.riv.southroad]** LABEL: SOUTH ROAD  _(the Riverlands)_
- **[way.riv.thefarm]** LABEL: THE FARM  _(the Riverlands)_
- **[way.riv.theoldmine]** LABEL: THE OLD MINE  _(the Riverlands)_

**The travel map (Act I)**
<sub>source: travel.js:279, travel.js:272, travel.js:281, travel.js:322, travel.js:311, travel.js:297</sub>
- **[map.thehollow]** LABEL: THE HOLLOW
- **[map.theriverlands]** LABEL: THE RIVERLANDS
- **[map.themine]** LABEL: THE MINE
- **[map.crypt1]** LABEL: CRYPT 1
- **[map.crypt2]** LABEL: CRYPT 2
- **[map.kingshall]** LABEL: KING'S HALL
- **[map.den]** LABEL: DEN
- **[map.barrow]** LABEL: BARROW
- **[map.tower]** LABEL: TOWER
- **[map.farm]** LABEL: FARM
- **[map.gate]** LABEL: GATE
- **[map.here]** LABEL: YOU ARE HERE
- **[map.tap]** LABEL: TAP A GLOWING STONE TO TRAVEL
- **[map.found]** LABEL: WAYSTONE FOUND
- **[map.notfound]** LABEL: NOT FOUND YET

**Act II, region 1 (ASHFORD VALE): built as a map, no story yet** _(clearing and door names from ashford.json)_
<sub>source: outdoor.js:625</sub>
- **[place.ashford.region]** LABEL: ASHFORD VALE  _(the region)_
- **[place.ashford.arrival]** LABEL: FROM ACT I  _(level 0)_
- **[place.ashford.town]** LABEL: ASHFORD  _(level 0)_
- **[place.ashford.cartway]** LABEL: CARTWAY  _(level 7)_
- **[place.ashford.pityard]** LABEL: RESCUE PIT YARD  _(level 7-8)_
- **[place.ashford.rennyard]** LABEL: RENN'S YARD  _(level 8)_
- **[place.ashford.haul]** LABEL: HAUL GATE  _(level 8)_
- **[place.ashford.copse]** LABEL: CHARCOAL COPSE  _(level 7-8)_
- **[place.ashford.graveroad]** LABEL: GRAVE ROAD  _(level 7)_
- **[place.ashford.forecourt]** LABEL: BLACKWAKE  _(level 11-12)_
- **[place.ashford.oak]** LABEL: HOLLOW OAK  _(level 8)_
- **[place.ashford.door.rescuepit]** LABEL: RESCUE PIT  _(mine-works caves; the Pit Enforcer (ogre enforcer); Renn and two miners behind a barricade)_
- **[place.ashford.door.blackwake]** LABEL: BLACKWAKE TOMB  _(DANGER LV 11-12 sign; elite tomb guard + two crossbowmen; burial ledger, a rare)_

### 4.7 Bosses, leaders and named enemies

**Boss cards (name / epithet, when it wakes)** _(unique monsters)_
<sub>source: monsters.js:1034, monsters.js:1035, monsters.js:1036, monsters.js:1043, monsters.js:1046, monsters.js:1067</sub>
- **[boss.lich.card]** CARD: THE LICH / WHO DIED AND WOULD NOT STAY DEAD  _(Act III: the Sanctum)_
- **[boss.skelking.card]** CARD: SKELETON KING / LORD OF THE RESTLESS DEAD  _(Act I: the King's Hall)_
- **[boss.treant.card]** CARD: TREANT ELDER / THE WOOD THAT WALKS  _(Act II wilds (Emberwood))_
- **[boss.warlord.card]** CARD: OGRE WARLORD / TYRANT OF THE DEEP WOODS  _(Act III wilds (Thornwood))_
- **[boss.barrowwight.card]** CARD: THE BARROW WIGHT / CROWNED IN THE DARK BELOW THE MOUND  _(the Barrow: the Deep Tomb)_
- **[boss.broodmother.card]** CARD: BROODMOTHER / MOTHER OF A THOUSAND LEGS  _(Act II: the Brood Nest)_

**Their shouts in a fight**
<sub>source: monsters.js:1036, skills.js:973, skills.js:1025, skills.js:1067</sub>
- **[boss.treant.call]** MESSAGE: THE ELDER WAKES THE MUSHROOMS  _(at half life)_
- **[boss.warlord.call]** MESSAGE: THE WARLORD CALLS HIS GOBLINS  _(at half life (default for any slam boss without its own line))_
- **[boss.lich.phase]** MESSAGE: THE LICH ASCENDS  _(second phase)_
- **[boss.lich.wall]** MESSAGE: BONES RISE FROM THE FLOOR

**Leaders of the side areas and packs (elite or leader; name over the head, no card)**
<sub>source: monsters.js:1032, monsters.js:1052, monsters.js:1053, monsters.js:1054, monsters.js:1062, monsters.js:1063, monsters.js:1047</sub>
- **[enemy.shaman]** LABEL: FALLEN SHAMAN  _(leads a pack)_
- **[enemy.treasure]** LABEL: TREASURE GOBLIN  _(runs away with a sack)_
- **[enemy.gchief]** LABEL: GOBLIN CHIEFTAIN  _(elite, leads a pack, the Old Watchtower)_
- **[enemy.gshaman]** LABEL: GOBLIN SHAMAN  _(leads a pack)_
- **[enemy.alpha]** LABEL: THE ALPHA  _(elite, leads a pack, the wolf den)_
- **[enemy.banditchief]** LABEL: BANDIT CHIEF  _(elite, leads a pack, the farm cellar)_
- **[enemy.wraith]** LABEL: WRAITH  _(the Barrow's leader (an ordinary wraith as leader))_

**Champions (a random monster rolled stronger: a prefix + its name)**
<sub>source: skills.js:894, skills.js:895, skills.js:896, skills.js:897</sub>
- **[champ.berserk]** LABEL: BERSERK {MONSTER}
- **[champ.stone]** LABEL: STONE {MONSTER}
- **[champ.plagued]** LABEL: PLAGUED {MONSTER}
- **[champ.shadow]** LABEL: SHADOW {MONSTER}

**Elite powers (the first time you meet each, a tip)**
<sub>source: elites.js:12, elites.js:13, elites.js:14, elites.js:15, elites.js:16, elites.js:17, elites.js:153</sub>
- **[elite.burning]** MESSAGE: BURNING: STAY OUT OF THE FLAMES
- **[elite.frozen]** MESSAGE: FROZEN: BREAK THE ORBS BEFORE THEY BURST
- **[elite.blinking]** MESSAGE: BLINKING: STRIKE IT WHERE IT LANDS
- **[elite.shielded]** MESSAGE: SHIELDED: HEAVY BLOWS BREAK THE SHIELD
- **[elite.vampiric]** MESSAGE: VAMPIRIC: STEP BACK TO STOP IT FEEDING
- **[elite.summoner]** MESSAGE: SUMMONER: KILL IT AND ITS MINIONS FALL
- **[elite.shield]** MESSAGE: SHIELD BROKEN

**The treasure goblin**
<sub>source: game.js:433, game.js:998</sub>
- **[enemy.treasure.burst]** MESSAGE: THE SACK BURSTS!
- **[enemy.treasure.escape]** MESSAGE: THE TREASURE GOBLIN ESCAPED

### 4.8 Dungeon and wild events

**The vault (one per dungeon floor)**
<sub>source: dungeon.js:23, dungeon.js:31, dungeon.js:139, dungeon.js:34, dungeon.js:45, dungeon.js:153</sub>
- **[event.vault.locked.1]** MESSAGE: A LOCKED VAULT
- **[event.vault.locked.2]** MESSAGE: A CHAMPION ON THIS FLOOR CARRIES THE KEY
- **[event.vault.key.float]** LABEL: VAULT KEY  _(floats up where the champion fell)_
- **[event.vault.key]** BANNER: THE VAULT KEY / A LOCKED VAULT ON THIS FLOOR WILL OPEN FOR IT
- **[event.vault.tracker]** TRACKER: VAULT KEY: FIND THE LOCKED VAULT
- **[event.vault.btn]** BUTTON: UNLOCK THE VAULT
- **[event.vault.open]** BANNER: THE VAULT IS OPEN / THREE CHESTS INSIDE
- **[event.vault.shut]** MESSAGE: THE VAULT IS LOCKED  _(pushed out of the gateway)_

**Dungeon shrines (button PRAY AT THE SHRINE; a banner)**
<sub>source: dungeon.js:61, dungeon.js:55, dungeon.js:56, dungeon.js:57, dungeon.js:128</sub>
- **[event.shrine.btn]** BUTTON: PRAY AT THE SHRINE
- **[event.shrine.might]** BANNER: SHRINE OF MIGHT / +25% DAMAGE FOR A MINUTE
- **[event.shrine.haste]** BANNER: SHRINE OF HASTE / +20% SPEED FOR A MINUTE
- **[event.shrine.warding]** BANNER: SHRINE OF WARDING / 30% LESS DAMAGE TAKEN FOR A MINUTE
- **[event.shrine.fade]** MESSAGE: THE SHRINE'S BLESSING FADES

**Shrines in the wilds (walk onto one: two messages)**
<sub>source: outdoor.js:1791, outdoor.js:1792, outdoor.js:1793</sub>
- **[event.wildshrine.frenzy]** MESSAGE: SHRINE OF FRENZY / ATTACK SPEED UP
- **[event.wildshrine.stone]** MESSAGE: SHRINE OF STONE / DAMAGE TAKEN HALVED
- **[event.wildshrine.fortune]** MESSAGE: SHRINE OF FORTUNE / A SHOWER OF GOLD

**The ambush room**
<sub>source: dungeon.js:85, dungeon.js:109, dungeon.js:94</sub>
- **[event.ambush.start]** BANNER: AMBUSH / THEY COME OUT OF THE WALLS. HOLD THE ROOM
- **[event.ambush.wave]** BANNER: WAVE {n}/{waves} / MORE COMING
- **[event.ambush.last]** BANNER: WAVE {n}/{n} / THE LAST OF THEM
- **[event.ambush.done]** BANNER: AMBUSH SURVIVED / THE ROOM IS YOURS

**Chests, loot, levels**
<sub>source: game.js:601, game.js:699, game.js:608</sub>
- **[event.chest]** MESSAGE: THE CHEST CREAKS OPEN
- **[event.legend]** MESSAGE: A LEGENDARY ITEM HAS FALLEN
- **[event.levelup]** MESSAGE: LEVEL UP! LEVEL {n}

**Death and the town portal**
<sub>source: ui.js:388, ui.js:389, game.js:2249, game.js:2146, game.js:2185</sub>
- **[event.dead.1]** CARD: YOU HAVE DIED
- **[event.dead.2]** CARD: TAP TO RISE AGAIN
- **[event.dead.3]** MESSAGE: YOU RISE AGAIN
- **[event.portal.town]** MESSAGE: YOU ARE IN TOWN
- **[event.portal.back]** MESSAGE: WALK INTO THE PORTAL TO GO BACK
- **[event.portal.return]** MESSAGE: BACK THROUGH THE PORTAL

### 4.9 Legendary items, sets and outfits

**Legendaries (name, then its lore line under the stats)**
<sub>source: items.js:178, items.js:179, items.js:180, items.js:181, items.js:182, items.js:183, items.js:184, items.js:185, items.js:186, items.js:187, items.js:188, paladin.js:205</sub>
- **[item.emberbrand.name]** LABEL: EMBERBRAND
- **[item.emberbrand.lore]** LABEL: FORGED IN A DRAGON'S THROAT
- **[item.crownoftheoakking.name]** LABEL: CROWN OF THE OAK KING
- **[item.crownoftheoakking.lore]** LABEL: THE FOREST MENDS YOU
- **[item.gravewarden.name]** LABEL: GRAVEWARDEN
- **[item.gravewarden.lore]** LABEL: WHAT STRIKES YOU BLEEDS
- **[item.stormhide.name]** LABEL: STORMHIDE
- **[item.stormhide.lore]** LABEL: LIGHTNING IN YOUR STEP
- **[item.blooddrinker.name]** LABEL: BLOODDRINKER
- **[item.blooddrinker.lore]** LABEL: IT IS NEVER FULL
- **[item.staffofcinders.name]** LABEL: STAFF OF CINDERS  _(mage only)_
- **[item.staffofcinders.lore]** LABEL: EVERY DEATH CATCHES FIRE
- **[item.mantleofthemagi.name]** LABEL: MANTLE OF THE MAGI  _(mage only)_
- **[item.mantleofthemagi.lore]** LABEL: WOVEN FROM STARLIGHT
- **[item.seerspeak.name]** LABEL: SEER'S PEAK  _(mage only)_
- **[item.seerspeak.lore]** LABEL: IT SEES WHERE TO STRIKE
- **[item.windrunner.name]** LABEL: WINDRUNNER  _(ranger only)_
- **[item.windrunner.lore]** LABEL: IT SINGS BEFORE IT STRIKES
- **[item.wolfhide.name]** LABEL: WOLFHIDE  _(ranger only)_
- **[item.wolfhide.lore]** LABEL: THE PACK REMEMBERS
- **[item.warlordsmaul.name]** LABEL: WARLORD'S MAUL
- **[item.warlordsmaul.lore]** LABEL: TAKEN FROM THE OGRE
- **[item.dawnbreaker.name]** LABEL: DAWNBREAKER  _(paladin only)_
- **[item.dawnbreaker.lore]** LABEL: THE NIGHT BREAKS ON IT

**Sets (green items: three or four named pieces)**
<sub>source: items.js:192, items.js:194, items.js:196, items.js:198, paladin.js:206, gear_barbsets.js:27, gear_barbsets.js:29, gear_barbsets.js:31</sub>
- **[set.magus]** LABEL: MAGUS SET: MAGUS CAP, MAGUS VESTMENT, MAGUS ROD  _(mage)_
- **[set.wardens]** LABEL: WARDEN'S SET: WARDEN'S VISOR, WARDEN'S PLATE, WARDEN'S WALL
- **[set.scouts]** LABEL: SCOUT'S SET: SCOUT'S CAP, SCOUT'S JERKIN, SCOUT'S TARGE
- **[set.stalkers]** LABEL: STALKER'S SET: STALKER'S COWL, STALKER'S HIDE, STALKER'S QUIVER  _(ranger)_
- **[set.dawnbringer]** LABEL: DAWNBRINGER SET: DAWNBRINGER PLATE, DAWNBRINGER CREST, DAWNBRINGER AEGIS  _(paladin)_
- **[set.bloodmoonreaver]** LABEL: BLOODMOON REAVER SET: BLOODMOON SKULL, BLOODMOON MANTLE, BLOODMOON CLEAVER  _(barbarian)_
- **[set.frostjawclan]** LABEL: FROSTJAW CLAN SET: FROSTJAW MAW, FROSTJAW PELT, FROSTJAW BITE  _(barbarian)_
- **[set.ashenwarlord]** LABEL: ASHEN WARLORD SET: ASHEN CROWN, ASHEN MANTLE, ASHEN BUTCHER  _(barbarian)_

**Outfits (matching ordinary pieces give a bonus; names only)**
<sub>source: items.js:205, gear_mage.js:47, gear_paladin.js:255, gear_ranger.js:34, paladin.js:209</sub>
- **[outfit.names]** LABEL: MILITIA, ROADWARDEN, BORDER WARDEN, GATEWATCH, COPPER RAIDER, IRON GUARD, VANGUARD, DUSK DUELIST, WARBRINGER, OATHKEEPER, WINTER BULWARK, STEEL KNIGHT, CROWN GUARD, EMBER FORGED, ROYAL EXECUTOR, BRAMBLE SCOUT, MARSH RUNNER, ASHWOOD HUNTER, DUNE STRIDER, NIGHT TRACKER, THORN SENTINEL, FROSTPATH STALKER, BLACKTHORN WARDEN, WAYFARER, TIDEKEEPER, FROST SCHOLAR, CRIMSON ORACLE, DUSKWEAVER, CINDER SAGE, RUNEBINDER, SUNWARDEN, TEMPLAR, CRUSADER, SILVER VIGIL, AURIC CHAMPION, HIGH SERAPH, STORMCALLER, STARSEER, ECLIPSE, FALCONER, ANTLER WARDEN, WILDHEART  _(42 outfits)_

### 4.10 The hero's shouts (ultimates and big moments)

**Callouts when a big power fires or is ready**
<sub>source: skills.js:1929, skills.js:2012, skills.js:3213, skills.js:3400, skills.js:3722, skills.js:3734, skills.js:3378, skills.js:3379, skills.js:852, paladin.js:466, paladin.js:467, paladin.js:511, skills.js:2320</sub>
- **[shout.wrathofthemountain]** MESSAGE: WRATH OF THE MOUNTAIN!
- **[shout.arcanestorm]** MESSAGE: ARCANE STORM!
- **[shout.rainofarrows]** MESSAGE: RAIN OF ARROWS!
- **[shout.berserker]** MESSAGE: BERSERKER!
- **[shout.titan]** MESSAGE: TITAN!
- **[shout.thetitansleeps]** MESSAGE: THE TITAN SLEEPS
- **[shout.ragetheberserkerisready]** MESSAGE: RAGE: THE BERSERKER IS READY
- **[shout.fullrageunleashthetitan]** MESSAGE: FULL RAGE: UNLEASH THE TITAN
- **[shout.warcrydamageandarmorup]** MESSAGE: WAR CRY! DAMAGE AND ARMOR UP
- **[shout.wingsofdawnready]** MESSAGE: WINGS OF DAWN READY
- **[shout.archangelisready]** MESSAGE: ARCHANGEL IS READY
- **[shout.thewingsfade]** MESSAGE: THE WINGS FADE
- **[shout.allfourorbscataclysmisre]** MESSAGE: ALL FOUR ORBS: CATACLYSM IS READY

### 4.11 Act II townspeople (in the game as name tags only; no lines yet)

**ASHFORD (from ashford.json; in the game Tamsin opens the smith's screen and Nella the shop, the others only stand)**
<sub>source: outdoor.js:625</sub>
- **[npc.ashford.mara]** LABEL: MARA VENN  _(reeve, quests)_
- **[npc.ashford.tamsin]** LABEL: TAMSIN FLINT  _(smith)_
- **[npc.ashford.bram]** LABEL: BRAM TOLL  _(merchant)_
- **[npc.ashford.nella]** LABEL: NELLA REED  _(potions)_
- **[npc.ashford.sister]** LABEL: SISTER EDDA  _(keeper of the dead)_
- **[npc.ashford.renn]** LABEL: RENN PIKE  _(foreman (after the rescue); not placed yet)_

---

## 5. Loose threads, ideas, and inconsistencies

### Ideas and open questions recorded in NOTES.md
- **Voiceover** (round 96b): "a voiceover later, maybe with their ElevenLabs credits once the script feels right".
  The plan: finish Dave's lines, export a numbered script (table-script.md), the user records each take in
  ElevenLabs, the game plays each take on its shot with the music dipped and the captions kept. Not built.
- **The D&D table intro rework / voiceover / song**: listed as not done (round 106). The title song (the user's own
  recording) already plays through the whole table; music through "the whole Dungeon Master part" was the user's ask.
- **The user's D&D table ideas** are the "next overall" item after the Barbarian (round 97 notes: "four seats now: the
  three you don't pick are Marc, Aaron and Chris"). Today the three friends always sit in the same seats whatever
  you pick, and only your miniature changes.
- **Open since rounds 89-91**: Dave's tone was Claude's default (asked, no answer recorded); camp talk without a quest
  still uses the game's talk boxes ("could be Dave doing the voices"); no table beats yet for dying, bosses or Act II;
  Act II quests and boss moments are not at the table; the source portraits of the four friends are not in the repo
  ("pictures of real people; ask first").
- **Pacing idea 3** (round 100, not built): shorten the middle, any two of the three dangers open the road.
- **"Act I too short"** (feedback queue): "one quest, not an act", about 5 minutes; dungeons bigger and with events
  (round 103 did part of this), the King's crypt especially.
- **World plan (47c, decided, not built as written)**: a hand-built Act I overworld of 2-3 regions joined at their
  edges, many short dungeons made fresh on entry (wolf den, farm cellar, bandit hideout, barrow at 6+, the mine as the
  main story dungeon); "the cathedral is a giant landmark and the entrance to Act I's final dungeon; its boss ends
  Act I". Built so far: region 1 (the Hollow); region 2 is the Riverlands stand-in; the final dungeon is under the
  mine, and there is no cathedral any more (Osric has a chapel tent).
- **Riverlands is a stand-in**: "Osric, Wren, the den, Aldo, Hollis and the farm move to region 2 later" (round 48).
- **Cut for now, kept for later** (demo plan): the catacombs under the cathedral and THE GRAVEKEEPER, a choice of
  quest order, the forge side quest (would unlock upgrading and salvage), journal pages, hidden secrets.
- **Not built from round 78**: the watchtower's alarm horn; the shrine in the Hidden Grove.
- **Act II**: fully designed (section 2) but only region 1's map is in the game; no Act II quests or dialogue exist;
  townspeople have no lines; the region's gate lock, the Pit Enforcer, regions 2-3, the new monsters and Gorath are
  not built; Gorath's arena plan image never arrived. Act II was sized for arriving at level 7; heroes now arrive at
  10 ("shift its levels by 3"). Its story beats to write: the bell, Mara's ask, Renn's rescue, the Silent Wheel's
  crew tally, Maelis at Silkshaft with the royal seal, the sluice, the Beacon, the wards and Maelis's note, Gorath,
  the page naming Greymarsh, the town coming back to life, plus each townsperson's small quest.
- **Act III**: only "GREYMARSH, a drowned village at night, lanterns and candles".
- **Later camps**: the enchanter, a stash, a bounty board, a gambler (the user's pick: save them for Acts II and III).
- **Queued art batches** (round 109): dungeon set pieces and unique enemies (new named foes would need names/titles).
- **The name**: "Dungeon vs Dungeons" was raised in round 47 and never settled (see below).
- `art/refs/world/ashen-march-v3.png` exists but nothing in NOTES describes it.

### Inconsistencies between lines
1. **Who burned Maelis's books?** Osric: I SHOULD HAVE BURNED THEM MYSELF. (npc.osric.letter.3: he did not) against
   Maelis: HE BURNED MY BOOKS AND CALLED IT MERCY. (maelis.finale.2).
2. **"Hooded man"** (aldoBack.2, aldoBack.3, clue.stones.3, npc.wren.aldoBack.4) but Maelis wears a tall wizard hat
   with an orange band, no hood (the user chose the hat over the first try's dark hood). The look table's comment in
   outdoor.js still says "a dark robe and hood".
3. **North or south?** The Riverlands lies NORTH of the Hollow (THE ROAD NORTH IS OPEN; Hollis: THE FARM IS NORTH, IN
   THE RIVERLANDS), and the gate to Act II is in the Riverlands, yet everything about where Maelis went says SOUTH,
   PAST THE RIVERLANDS: maelis.finale.3, field.maelis.gone, npc.osric.kingBack.2, end.screen.3, end.keep, table end.2
   and end.3. Going "south past" a place that is north of you does not work; pick one direction (the Act II design has
   Act I arriving at Ashford's north gate, which suits south).
4. **Osric's stale hint**: THE FARM IS EAST, PAST THE GATE. (npc.osric.hint.farm, steps farm and cellar) is left from
   the old walled camp; the farm is now north in the Riverlands, past the fallen tree.
5. **The church**: Wren says Osric is ON THE CHURCH STEPS (npc.wren.first.1) and Osric speaks of THE GRAVES BEHIND MY
   CHURCH (npc.osric.meet.2), but the camp has a chapel tent and the graves are out on the Graveyard Path; the old
   cathedral was removed with the round 41 camp.
6. **Box and table versions say the same thing differently** (only one is seen per game, so pick one wording for each):
   THANK GOD, A BLADE (meet.1) / GOD BE THANKED, A BLADE (npc.osric.meet.1); FATHER! YOU BROUGHT HIM HOME! (aldoBack.1)
   / ... BACK! (npc.wren.aldoBack.1); the letter EVERY BONE IS PAID IN SILVER. THE KING MUST BE WHOLE. M. (letter.1)
   / "EVERY BONE YOU BRING IS PAID IN SILVER. THE KING MUST BE WHOLE. - M." (npc.osric.letter.2); Wren's reward line
   (table.aldoBack.reward / npc.wren.aldoBack.5).
7. **Wren is never introduced at the table**: Dave's Osric says HIS DAUGHTER (meet.3) without her name; she first
   speaks at aldoBack.1. Wren's own quest (table wren.1-2, npc.wren.ask.1-3, goal.wren TALK TO WREN BY THE TENTS,
   npc.osric.hint.wren) can no longer happen since round 51.
8. **The same lines twice**: the `mine` table quest plays Hollis's lines (QUEST_TABLE.mine = QUEST_TABLE.hollis), and
   Hollis's box quest serves both steps too (only the first line changes, npc.hollis.askChains.1). The tracker for
   that step says LOOK AT THE OLD MINE (NORTH, THE RIVERLANDS) (goal.mine), but in camp Hollis speaks first and sends
   you to the farm, so most players never see the chains before he mentions them.
9. **The secret is out in the opening**: SOMEONE IS PAYING FOR BONES. THEIR OLD KING IS ALMOST WHOLE. (open.4) tells
   what the letter later reveals (letter.1-2), which takes the edge off Aaron's CALLED IT. (letter.3) and Marc's
   SOMEBODY IS COLLECTING BONES. (clue.barrow.3).
10. **Osric knows what he was not told**: AND MAELIS STOOD OVER THE BONES AND LAUGHED? (npc.osric.kingBack.2): the hero
    never speaks, and Maelis does not laugh in his lines.
11. **Placeholder act names on screen**: the act cards say THE BLIGHTED WOOD / THE BURNING DEEP / THE PIT, and once
    the road on is open its sign says THE ROAD ON: THE BURNING DEEP (label.gate.open), while the end screen says NEXT:
    ACT II, ASHFORD. Act I's wild area name DEEPWOOD is unused (the Riverlands took its place), and the Ogre Warlord's
    epithet TYRANT OF THE DEEP WOODS now fights in Thornwood.
12. **The game's name**: DUNGEONS OF BONES on the splash, at the table and in Dave's line (open.1.*), but "Dungeon of
    Bones" in `game/README.md` and in the title of the published page (`tools/pages/game-artifact.html`).
13. **The merchant** is "she" (Hollis: HER PRICES, HER HERBS; the shop: SHE PAYS A LITTLE MORE THAN SALVAGE) but wears
    the rig's grey hair and beard and is tagged MERCHANT with no name; the smith is SMITHY on his tag and BLACKSMITH on
    his screen.
14. **One place, several names**: THE FARM CELLAR (on entering) / FARMHOUSE CELLAR (door label) / FARM (travel map);
    THE OLD WATCHTOWER / THE WATCHTOWER (the danger) / OLD WATCHTOWER (door) / WATCHTOWER YARD (clearing) / TOWER (map);
    THE WOLF DEN / WOLF DEN / DEN; THE KING'S HALL / KING'S HALL (map); THE OLD MINE / THE MINE (map); THE BARROW /
    THE BARROW: DANGER / BARROW (clearing, map).
15. **Small timeline**: Aldo went missing THREE DAYS AGO (npc.osric.meet.3), the bandits took the farm A WEEK AGO
    (npc.hollis.ask.1), the wolves have been wrong ALL MONTH (npc.wren.ask.2): consistent, but only the box versions
    carry any of it.
16. **A thread never paid off**: SOMETHING IN THE NORTH HILLS DROVE THEM OUT. (npc.wren.aldoBack.3; only in the box
    version): nothing in the north hills follows. Likewise WOLVES DO NOT BUILD CAGES. (npc.wren.aldoBack.2): who caged
    Aldo is never said.
17. **Repeated catchphrase**: Chris says ... GREAT. twice (meet.4, clue.tower.3), maybe on purpose; Osric's THE LIGHT
    KEEPS YOU. covers four different moments (npc.osric.hint.hollow3 and npc.osric.after.shut).
18. **Monsters never speak**: every boss "intro" is a title card and every death the same THE {NAME} IS SLAIN. Only
    Maelis has lines; the Skeleton King, the Alpha and the Bandit Chief have none.
