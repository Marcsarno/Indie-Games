# Dungeons of Bones: the D&D table script

Every line said at the table, in the order it plays. Edit the text freely: keep each line's **[ID]** so I can put your version back in the right place.
To add a line, write it under the one it follows with a new ID like **[open.5b]**; to cut one, strike it out or write CUT. Notes to me in brackets are fine.
Speakers: DAVE (the DM; "as X" means he voices that character), MARC, AARON, CHRIS (the players), YOU (the player's own hero).
Stage directions in _(italics)_: a vision is the picture that rises from the table while the line plays.

## 1. Title screen (choosing your hero)

- **[title.1]** DAVE: WHO ARE YOU PLAYING TONIGHT?

## 2. The opening (a new game)

The first line changes with your class:

- **[open.1.barbarian]** DAVE: A BARBARIAN. GOOD. TONIGHT: DUNGEONS OF BONES.
- **[open.1.paladin]** DAVE: A PALADIN. GOOD. TONIGHT: DUNGEONS OF BONES.
- **[open.1.mage]** DAVE: A MAGE. GOOD. TONIGHT: DUNGEONS OF BONES.
- **[open.1.ranger]** DAVE: A RANGER. GOOD. TONIGHT: DUNGEONS OF BONES.

- **[open.2]** DAVE: OAKHOLLOW WAS A VILLAGE. NOW IT IS ONE FIRE IN THE WOODS.  _(dim light)_
- **[open.3]** DAVE: THEN THE DEAD GOT UP.  _(vision: the dead rising, green light)_
- **[open.4]** DAVE: SOMEONE IS PAYING FOR BONES. THEIR OLD KING IS ALMOST WHOLE.  _(vision: the Skeleton King, green light)_
- **[open.5]** DAVE: YOU REACH THE CAMP. A PRIEST GRABS YOUR ARM.
- _(here the whole **Meeting Brother Osric** quest plays: lines meet.1 to meet.4 in section 3; edit them there)_
- **[open.roll]** DAVE: ROLL.  _(vision: your die roll)_
- **[open.roll20]** DAVE: A NATURAL TWENTY. OF COURSE.  _(when the die lands on 20)_

## 3. The story at the table, in order

Quests play when you talk to that person in camp (the camera lifts to the table). Clues are short: Dave peeks in from the top of the screen and the game keeps going.

### Meeting Brother Osric (`meet`, talking to priest)

- **[meet.1]** DAVE (as BROTHER OSRIC): THANK GOD, A BLADE. SOMEONE HAS BEEN DIGGING UP OUR GRAVES.
- **[meet.2]** DAVE (as BROTHER OSRIC): ALDO THE WOODCUTTER WENT TO THE WOLF GLADE. HE NEVER CAME BACK.  _(vision: wolves)_
- **[meet.3]** DAVE (as BROTHER OSRIC): FIND HIM. BRING HIM HOME TO HIS DAUGHTER.
- **[meet.4]** CHRIS: WOLVES. GREAT.

### Wren (`wren`, talking to wren)

- **[wren.1]** DAVE (as WREN): MY FATHER WENT TO THE WOLF GLADE AND NEVER CAME HOME.  _(vision: wolves)_
- **[wren.2]** DAVE (as WREN): PLEASE. BRING HIM BACK.

### Aldo is home (`aldoBack`, talking to wren)

- **[aldoBack.1]** DAVE (as WREN): FATHER! YOU BROUGHT HIM HOME!
- **[aldoBack.2]** DAVE (as ALDO): I SAW A HOODED MAN AT THE OLD MINE. HIS LANTERN BURNED GREEN.  _(vision: Maelis)_
- **[aldoBack.3]** AARON: HOODED MAN. GREEN LANTERN. THAT IS OUR VILLAIN.
- **[aldoBack.4]** DAVE (as ALDO): THREE DANGERS BAR THE ROAD NORTH. CLEAR THEM AND I CUT THE FALLEN TREE.
- **[aldoBack.5]** DAVE (as ALDO): I WILL WAIT AT THE TREE WITH MY AXE.

### The three dangers of the Hollow (any order; a clue after each)

After each clue Dave adds: "TWO DANGERS LEFT IN THE HOLLOW." / "ONE DANGER LEFT IN THE HOLLOW." / after the last: "THE HOLLOW IS QUIET. ALDO WAITS AT THE FALLEN TREE WITH HIS AXE."

**After the tower:**

- **[clue.tower.1]** DAVE: UP IN THE WATCHTOWER, THE CHIEFTAIN'S PURSE IS FULL OF NEW SILVER.
- **[clue.tower.2]** DAVE: EVERY COIN IS STAMPED WITH AN M. SOMEONE PAID THEM TO HOLD THE ROAD.
- **[clue.tower.3]** CHRIS: GOBLINS ON A PAYROLL. GREAT.

**After the stones:**

- **[clue.stones.1]** DAVE: IN THE MIDDLE OF THE STANDING STONES, THE GRASS IS BURNED IN A CIRCLE.
- **[clue.stones.2]** DAVE: THE ASH IS STILL WARM. AND IT GLOWS GREEN.  _(vision: Maelis)_
- **[clue.stones.3]** AARON: GREEN. LIKE THE HOODED MAN'S LANTERN.

**After the barrow:**

- **[clue.barrow.1]** DAVE: DOWN IN THE BARROW THE OLD TOMBS ARE EMPTY. NOT BROKEN INTO. DUG OUT, NEATLY.  _(vision: the dead rising)_
- **[clue.barrow.2]** DAVE: A SPADE LEANS ON THE WALL. BURNED INTO THE HANDLE: A FARM'S MARK.
- **[clue.barrow.3]** MARC: SOMEBODY IS COLLECTING BONES.

### Hollis (`hollis`, talking to hollis)

- **[hollis.1]** DAVE (as HOLLIS): BANDITS TOOK MY FARM AND PUT ME OUT IN MY NIGHTSHIRT.  _(vision: bandits)_
- **[hollis.2]** DAVE (as HOLLIS): THEIR CHIEF HAS THE MINE KEY. AND HEAVY SACKS IN MY CELLAR.
- **[hollis.3]** MARC: HEAVY SACKS. AND THAT SPADE IN THE BARROW HAD A FARM'S MARK.

_(The `mine` quest, also from Hollis, plays the same four lines as Hollis above. Write different ones under new IDs **[mine.1]** etc. if you want it to differ.)_

### Back from the farm (`farmBack`, talking to hollis)

- **[farmBack.1]** DAVE (as HOLLIS): BONES. MY CELLAR WAS FULL OF BONES FROM THE GRAVEYARD.  _(vision: the dead rising)_
- **[farmBack.2]** DAVE (as HOLLIS): THAT LETTER THE CHIEF HAD: SHOW IT TO BROTHER OSRIC.

### The letter (`letter`, talking to priest)

- **[letter.1]** DAVE (as THE LETTER): EVERY BONE IS PAID IN SILVER. THE KING MUST BE WHOLE. M.
- **[letter.2]** DAVE (as BROTHER OSRIC): MAELIS, ONCE OF MY ORDER. HE IS RAISING THE OLD KING.  _(vision: the Skeleton King)_
- **[letter.3]** AARON: THE M ON THE GOBLINS' SILVER. CALLED IT.
- **[letter.4]** DAVE (as BROTHER OSRIC): TAKE THE KEY. PUT THE KING BACK IN HIS GRAVE.

## 4. The end of Act I

- **[end.1]** DAVE: THE OLD KING IS DUST. AGAIN.
- **[end.2]** DAVE: BUT MAELIS WENT SOUTH. AND HE TOOK SOMETHING WITH HIM.  _(vision: Maelis, green light)_
- **[end.3]** MARC: THEN WE GO SOUTH.
- **[end.4]** DAVE: NEXT WEEK. SOMEBODY ELSE BRINGS THE SNACKS.
