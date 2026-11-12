// Exports every line of story, flavour and place text OUTSIDE the D&D table scenes (those are in table-script.md,
// made by export.cjs) as Markdown with a stable ID per line and the source file:line of each block. It is section 4
// of tools/script/story-bible.md; the bible's other sections are written by hand from NOTES.md and the code.
//   node tools/script/story-export.cjs <out.md> [data.json]      (run from diablo-clone/)
// Lines assembled at run time (the talk boxes' branches, quest data, names) are read from the running game
// (Playwright, game/index.html?cine=0); the rest are listed here by hand and each is checked against the source:
// a line not found verbatim is marked NOT FOUND, a line built from a template is marked TEMPLATE.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const JS = path.resolve('game/js'), SRC = {};
for (const f of fs.readdirSync(JS).filter(f => f.endsWith('.js'))) SRC[f] = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
// where a text sits in the source: 'file:line' (the first match, or the first inside the function named by `inFn`), or null
const fnRange = (f, name) => { const a = SRC[f].findIndex(l => l.startsWith('function ' + name + '(')); let b = a + 1; while (b < SRC[f].length && !SRC[f][b].startsWith('}')) b++; return [a, b]; };
function where(text, inFn) {
  const keys = [text, text.replace(/'/g, "\\'"), text.replace(/"/g, '\\"')];
  if (inFn) { const [a, z] = fnRange('quests.js', inFn); for (let n = a; n <= z; n++) if (keys.some(k => SRC['quests.js'][n].includes(k))) return `quests.js:${n + 1}`; }
  for (const [f, lines] of Object.entries(SRC)) for (let n = 0; n < lines.length; n++) if (keys.some(k => lines[n].includes(k))) return `${f}:${n + 1}`;
  return null;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const D = await p.evaluate(() => {
    newHero('warrior');
    const out = {};
    // ---- every branch of every talk box (talkTo), by driving it with each stage and the flags its lines test
    const cap = []; openTalk = (pages, btn, on, reward) => { cap.push({ pages: pages.map(q => [q[0], q[1]]), btn: btn || null, reward: !!reward }); };
    startChop = () => cap.push({ chop: true });
    const talk = (role, st, flags = {}, lv = {}, npc = {}) => {
      cap.length = 0; storyStage = () => st; G.story = { f: { ...flags }, n: 0 };
      Object.assign(LV, { act: 0, loop: 0, hub: true, side: null, gateOpen: false, diff: 1 }, lv);
      talkTo({ role, ...npc }); return cap[0] || null;
    };
    const H3F = { h3tower: true, h3stones: true, h3barrow: true };
    out.talk = [
      // Brother Osric
      ['npc.osric.meet', 'the first talk (box version: seen only with the table off; with the table on, Dave tells it: table-script meet.1-4)', talk('priest', 'meet')],
      ['npc.osric.letter', 'after the farm, the letter (box version; table-script letter.1-4)', talk('priest', 'letter')],
      ['npc.osric.kingBack', 'the King is dead, Maelis seen (always so in play: he appears after the King)', talk('priest', 'kingBack', { maelisSeen: true })],
      ['npc.osric.kingBackNoMaelis', 'the King is dead, Maelis NOT seen (only an old save can get here)', talk('priest', 'kingBack', {})],
      ...['wren', 'den', 'cage', 'aldoBack', 'mine', 'hollis', 'farm', 'cellar', 'farmBack', 'unlock', 'king', 'hollow3', 'chop', 'done'].map(st => [`npc.osric.hint.${st}`, `repeat line while the step is '${st}'`, talk('priest', st)]),
      ['npc.osric.after.open', 'after Act I (story off), the road on open', talk('priest', 'done', {}, { loop: 1, gateOpen: true })],
      ['npc.osric.after.shut', 'after Act I (story off), the road on shut', talk('priest', 'done', {}, { loop: 1, gateOpen: false })],
      // Wren
      ['npc.wren.first', 'before Osric has been spoken to', talk('wren', 'meet')],
      ['npc.wren.ask', "Wren's own quest (box version; UNREACHABLE since round 51: Osric gives the quest himself and the 'wren' step is skipped)", talk('wren', 'wren')],
      ['npc.wren.aldoBack', 'Aldo is home: the hand-in (box version; table-script aldoBack.1-5 + the table reward line)', talk('wren', 'aldoBack')],
      ['npc.wren.idle.home', 'repeat line, Aldo free', talk('wren', 'done', { aldoFree: true })],
      ['npc.wren.idle.missing', 'repeat line, Aldo still missing', talk('wren', 'den', {})],
      // Aldo
      ['npc.aldo.cage', 'in the wolf den, the Alpha alive', talk('aldo', 'den', {}, { side: 'den', hub: false })],
      ['npc.aldo.free', 'in the wolf den, the Alpha dead (button OK frees him)', talk('aldo', 'cage', { alphaDead: true }, { side: 'den', hub: false })],
      ['npc.aldo.tree.none', 'at the fallen tree, no danger done yet (status lines are a template: name + DONE / NOT YET)', talk('aldo', 'hollow3', {}, {}, { atTree: true })],
      ['npc.aldo.tree.two', 'at the fallen tree, two dangers done', talk('aldo', 'hollow3', { h3tower: true, h3stones: true }, {}, { atTree: true })],
      ['npc.aldo.mine', "after the cut, while the step is 'mine'", talk('aldo', 'mine', { treeCleared: true })],
      ['npc.aldo.idle', 'repeat line (by his woodpile)', talk('aldo', 'done', H3F)],
      // Hollis
      ['npc.hollis.ask', "Hollis's farm quest, chains NOT seen first (box version; table-script hollis.1-3)", talk('hollis', 'hollis', {})],
      ['npc.hollis.askChains', 'the same, chains seen first: only the first line changes', talk('hollis', 'hollis', { sawChain: true })],
      ['npc.hollis.farmBack', 'back from the farm: the hand-in (box version; table-script farmBack.1-2 + the table reward line)', talk('hollis', 'farmBack')],
      ['npc.hollis.idle.before', 'repeat line, farm not yet won back', talk('hollis', 'den', {})],
      ['npc.hollis.idle.after', 'repeat line, farm won back', talk('hollis', 'done', { farmPaid: true })],
    ].map(([id, cond, t]) => ({ id, cond, t }));
    // ---- data
    out.questTable = Object.fromEntries(Object.entries(QUEST_TABLE).map(([k, q]) => [k, { lines: q.lines, reward: q.reward || null }]));
    out.clues = CLUES; out.storyNames = STORY_NAMES; out.campRole = CAMP_ROLE;
    G.story = { f: {}, n: 2 };
    out.stageText = Object.fromEntries(['meet', 'wren', 'den', 'cage', 'aldoBack', 'hollow3', 'chop', 'mine', 'hollis', 'farm', 'cellar', 'farmBack', 'letter', 'unlock', 'king', 'kingBack', 'done'].map(st => [st, stageText(st)]));
    out.h3 = H3.map(o => ({ k: o.k, name: o.name, text: o.text, side: o.side || null, boss: o.boss || null }));
    out.sides = Object.fromEntries(Object.entries(SIDES).map(([k, s]) => [k, { name: s.name, label: s.label, boss: s.boss, pool: s.pool, diff: s.diff || null, theme: s.theme }]));
    out.monsters = Object.fromEntries(Object.entries(MONSTERS).filter(([, m]) => m.unique || m.elite || m.leader || m.title || m.treasure).map(([k, m]) => [k, { name: m.name, title: m.title || null, calls: m.calls || null, unique: !!m.unique, elite: !!m.elite, leader: !!m.leader, boss: m.boss || null }]));
    out.allMonsters = Object.fromEntries(Object.entries(MONSTERS).map(([k, m]) => [k, m.name]));
    out.acts = ACTS; out.areaNames = AREA_NAMES; out.loopNames = LOOP_NAMES;
    out.hollow = { clearings: HOLLOW.clearings.map(c => [c.id, c.name, c.level, c.lvlTo || null]), doors: HOLLOW.doors.map(d => [d.id, d.name, d.note]) };
    out.ashford = { name: REGIONS.ashford.name, clearings: REGIONS.ashford.clearings.map(c => [c.id, c.name, c.level, c.lvlTo || null]), doors: REGIONS.ashford.doors.map(d => [d.id, d.name, d.note]), stations: REGIONS.ashford.town.stations.map(s => [s.who, s.role]) };
    out.ways = { hub: WAY_DEFS.hub().map(w => w.name), riv: WAY_DEFS.riv().map(w => w.name) };
    out.dgShrines = DG_SHRINES.map(s => [s.name, s.line]); out.shrines = Object.values(SHRINES).map(s => [s.name, s.msg]);
    out.powers = Object.values(POWERS).map(p => p.tip); out.champs = CHAMP_KINDS.map(c => c.prefix);
    out.classInfo = CLASS_INFO; out.legend = LEGENDARIES.map(L => [L.name, L.lore, L.cls || 'any']);
    out.sets = Object.entries(SETS).map(([k, s]) => [s.name, s.pieces.map(q => q[1]), s.cls || 'any']);
    out.outfits = Object.entries(OUTFITS).map(([k, s]) => [s.name, s.cls || null]);
    out.ults = Object.values(ULTS).map(u => u.name); out.wings = Object.values(WINGS).map(w => w.name);
    out.npcLooks = NPC_LOOKS;
    // ---- what each level of the first loop is called (act card, area name)
    out.levels = [];
    for (let L = 1; L <= 15; L++) { const A = areaOf(L); out.levels.push({ L, kind: A.kind, act: A.act, floor: A.floor || null, arena: A.arena || null, reg: A.reg || null, hub: !!A.hub, riv: !!A.riv, actName: ACTS[A.act].name, town: AREA_NAMES.town[A.act], forest: AREA_NAMES.forest[A.act], hall: ACTS[A.act].hall, theme: ACTS[A.act].theme }); }
    return out;
  });
  await b.close();
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(D, null, 1));

  // ------------------------------------------------------------------ writing it out
  const L = [], count = {}; let sec = null, blockSrc = [], blockAt = -1;
  const flush = () => { if (blockAt >= 0) { const s = [...new Set(blockSrc.filter(Boolean))]; L[blockAt] = s.length ? `<sub>source: ${s.join(', ')}</sub>` : '<sub>source: (data read at run time)</sub>'; } blockSrc = []; blockAt = -1; };
  const H = (lvl, t) => { flush(); if (lvl === 3) { sec = t; count[sec] = 0; } L.push('', '#'.repeat(lvl) + ' ' + t, ''); };
  const block = (title, note) => { flush(); if (L[L.length - 1] !== '') L.push(''); L.push(`**${title}**${note ? ' ' + note : ''}`); blockAt = L.length; L.push(''); };
  const line = (id, who, text, note, src) => {
    let s = src === undefined ? where(text) : src;
    const tpl = /\{[^}]+\}/.test(text) && src !== undefined;
    if (s === null && !tpl) s = 'NOT FOUND';
    blockSrc.push(s === 'NOT FOUND' ? null : s);
    L.push(`- **[${id}]** ${who}: ${text}${note ? `  _(${note})_` : ''}${s === 'NOT FOUND' ? '  **(NOT FOUND IN SOURCE)**' : ''}`);
    count[sec]++;
  };
  const talkBlock = (id, title) => { const T = D.talk.find(t => t.id === id); block(title, `_(${T.cond})_`); if (!T.t) { L.push('- (no talk box: this branch starts something else)'); return; } T.t.pages.forEach(([who, text], k) => line(`${id}.${k + 1}`, who, text, null, where(text, 'talkTo'))); if (T.t.btn) L.push(`  - button: ${T.t.btn}${T.t.reward ? ' (choose one of three rewards)' : ''}`); };

  L.push('## 4. All dialogue and in-game text outside the table scenes', '',
    'Speakers: a person\'s name = their talk box (the game pauses, a box at the bottom). MESSAGE = a line that floats in the middle of the screen for a few seconds. BANNER = a dark band across the screen with a big TITLE / a smaller line. TRACKER = the quest text at the top left. LABEL = a name over a place or a person. CARD = a full title card. BUTTON = the action button\'s word.',
    'Where a line is built from a template, the moving part is in {braces} (for example {n}/3) and the source is where the template sits.');

  // ---------------------------------------------------------------- 4.1
  H(3, '4.1 The title screen and the hero cards (outside the table lines)');
  block('Splash screen (before the table)');
  line('ui.splash.1', 'CARD', 'DUNGEONS', null, where("textC('DUNGEONS'")); line('ui.splash.2', 'CARD', 'OF BONES', null, where("textC('OF BONES'")); line('ui.splash.3', 'LABEL', 'TAP TO BEGIN', null, where("textC('TAP TO BEGIN'")); line('ui.splash.4', 'LABEL', 'SOUND ON FOR THE MUSIC');
  block('The hero cards', '_(under each miniature at the table, and on the old title: the class name, then its two lines joined with ". ")_');
  for (const [cls, nm] of [['warrior', 'barbarian'], ['paladin', 'paladin'], ['mage', 'mage'], ['ranger', 'ranger']]) { const c = D.classInfo[cls]; line(`hero.${nm}.name`, 'LABEL', c.name, cls === 'warrior' ? "class id 'warrior'; renamed in barbarian.js" : null, where(`name: '${c.name}'`)); line(`hero.${nm}.lines`, 'LABEL', c.lines.join('. '), null, where(c.lines[0])); }
  block('The old title (only with the table off)'); line('ui.title.choose', 'LABEL', 'CHOOSE YOUR HERO');

  // ---------------------------------------------------------------- 4.2
  H(3, '4.2 Table lines that table-script.md does not list');
  block('Rewards chosen at the table', '_(the last shot of a hand-in at the table: a talk box over the table with the three reward cards; export.cjs skips these)_');
  for (const k of ['aldoBack', 'farmBack']) { const r = D.questTable[k].reward; line(`table.${k}.reward`, `DAVE (as ${r[0]})`, r[1], `after ${k}.${D.questTable[k].lines.length}`); }
  block("Dave's count after each clue", '_(table-script.md mentions these in a note without IDs; Dave peeks in after the clue lines)_');
  line('clue.left.2', 'DAVE', 'TWO DANGERS LEFT IN THE HOLLOW.', 'after the first danger'); line('clue.left.1', 'DAVE', 'ONE DANGER LEFT IN THE HOLLOW.', 'after the second'); line('clue.left.0', 'DAVE', 'THE HOLLOW IS QUIET. ALDO WAITS AT THE FALLEN TREE WITH HIS AXE.', 'after the third');
  block('Captions and prompts at the table');
  line('table.caption', 'LABEL', 'DAVE, AS {name}', 'the caption over a line Dave voices', where("'DAVE, AS '"));
  line('table.roll', 'LABEL', 'TAP TO ROLL'); line('table.title', 'LABEL', 'DUNGEONS OF BONES', 'top of the screen at the table title', where("textC('DUNGEONS OF BONES'"));

  // ---------------------------------------------------------------- 4.3 story order
  H(3, '4.3 Act I in story order: the talk boxes and what happens in the field');
  L.push('With the table ON (the normal game) the camp quest steps (meet, aldoBack, hollis/mine, farmBack, letter) are told by Dave at the table instead, so the box versions below of those steps are seen only with the table off (`?cine=0`, tests). Repeat lines, the den, the tree, the finale and Osric\'s last hand-in are always boxes.');
  H(4, 'Beat 1. Arrival at the camp in the Hollow');
  talkBlock('npc.osric.meet', 'BROTHER OSRIC, first talk (ACCEPT)');
  talkBlock('npc.wren.first', 'WREN, if you go to her first');
  block('What the screen says');
  line('banner.newQuest', 'BANNER', 'NEW QUEST / {quest name}: {goal}', 'every new quest; NEW OBJECTIVE / {goal} for a new step of the same quest', where("questBanner(nq ? 'NEW QUEST'"));
  H(4, 'Beat 2. The missing woodcutter: the wolf den');
  talkBlock('npc.wren.ask', "WREN's quest");
  block('Entering the den'); line('side.den.enter', 'MESSAGE', D.sides.den.name, 'the side area\'s name on entering', where("say(SIDES[kind].name"));
  talkBlock('npc.aldo.cage', 'ALDO in the cage');
  block('The Alpha falls'); line('field.alpha.dead', 'MESSAGE', 'THE ALPHA IS DEAD. FREE ALDO');
  talkBlock('npc.aldo.free', 'ALDO, freed');
  block('Aldo runs home'); line('field.aldo.free', 'MESSAGE', 'ALDO IS FREE. RETURN TO WREN');
  line('banner.questComplete', 'BANNER', 'QUEST COMPLETE / {quest name}', 'a step that ends in the field', where("questBanner('QUEST COMPLETE'"));
  line('field.portalPrompt', 'MESSAGE', 'OPEN A TOWN PORTAL TO CLAIM YOUR REWARD');
  H(4, 'Beat 3. Aldo is home');
  talkBlock('npc.wren.aldoBack', 'WREN and ALDO, the hand-in (COLLECT)');
  block('After the reward');
  line('field.quest.done', 'MESSAGE', '{QUEST NAME}: DONE', 'payQuest', where('say(`${STORY_NAMES[id]}: DONE`'));
  line('field.quest.pay', 'MESSAGE', '+{gold} GOLD, +{xp} XP', null, where('say(`+${gold} GOLD, +${xp} XP`'));
  line('field.campfire', 'MESSAGE', 'REST BY THE CAMPFIRE TO HEAL');
  H(4, 'Beat 4. The three dangers of the Hollow (any order)');
  block('The fallen tree on the road north', '_(walking up to it before the cut)_');
  line('field.tree.1', 'MESSAGE', 'A FALLEN TREE BLOCKS THE ROAD NORTH');
  line('field.tree.noAldo', 'MESSAGE', 'ONLY A WOODCUTTER COULD MOVE IT. FIND ALDO', 'Aldo not yet free');
  line('field.tree.wait', 'MESSAGE', 'ALDO: I CUT IT WHEN THE HOLLOW IS SAFE', 'Aldo free');
  line('field.tree.left', 'MESSAGE', 'STILL TO DO: {what is left}', 'e.g. WATCHTOWER, STANDING STONES', where("say('STILL TO DO: '"));
  { const T = D.talk.find(t => t.id === 'npc.aldo.tree.none').t, T2 = D.talk.find(t => t.id === 'npc.aldo.tree.two').t;
    block('ALDO at the fallen tree, before all three are done', '_(tap him: his line, one line per danger, then a tip; with two done the tip becomes ONE MORE.)_');
    line('npc.aldo.tree.1', 'ALDO', T.pages[0][1], null, where(T.pages[0][1], 'talkTo'));
    line('npc.aldo.tree.status', 'ALDO', '{DANGER NAME}: DONE  /  {DANGER NAME}: NOT YET', 'three lines, one per danger, e.g. ' + T.pages[1][1], where("o.name + ': ' + (f[o.flag] ? 'DONE' : 'NOT YET')"));
    line('npc.aldo.tree.tip', 'ALDO', T.pages[4][1], 'none or one done', where(T.pages[4][1], 'talkTo'));
    line('npc.aldo.tree.last', 'ALDO', T2.pages[4][1], 'two done', where("'ONE MORE.'")); }
  block('The three dangers (tracker and banners)');
  for (const o of D.h3) { line(`h3.${o.k}.name`, 'LABEL', o.name, null, where(`name: '${o.name}'`)); line(`h3.${o.k}.goal`, 'TRACKER', o.text, null, where(`text: '${o.text}'`)); }
  line('h3.done.some', 'BANNER', '{DANGER NAME}: DONE / {n}/3. +{gold} GOLD, +{xp} XP', null, where("questBanner(o.name + ': DONE'"));
  line('h3.done.all', 'BANNER', '{DANGER NAME}: DONE / THE HOLLOW IS SAFE. MEET ALDO AT THE FALLEN TREE', null, where('THE HOLLOW IS SAFE. MEET ALDO AT THE FALLEN TREE'));
  block('The Old Watchtower'); line('side.tower.enter', 'MESSAGE', D.sides.tower.name, 'on entering; its leader is the GOBLIN CHIEFTAIN', where("say(SIDES[kind].name")); line('field.panic', 'MESSAGE', 'THEY SCATTER IN PANIC', 'any shaman or chieftain falling with its pack about');
  block('The Standing Stones (an outdoor fight)');
  line('btn.stones', 'BUTTON', 'WAKE THE STONES'); line('field.stones.wake', 'MESSAGE', 'THE STONES WAKE. HOLD THE RING');
  line('banner.stones.wave', 'BANNER', 'WAVE {n}/3 / THEY COME OUT OF THE WOODS', 'waves 1 and 2', where('`WAVE ${S.wave}/${STONE_WAVES.length}`'));
  line('banner.stones.last', 'BANNER', 'WAVE 3/3 / SOMETHING BIG IS COMING', 'a dire bear and two boars', where('SOMETHING BIG IS COMING'));
  line('field.stones.silent', 'MESSAGE', 'THE STONES FALL SILENT', 'you walked away or fell');
  block('The Barrow (danger, two floors)'); line('side.barrow.enter', 'MESSAGE', D.sides.barrow.name, 'leader: the WRAITH', where("say(SIDES[kind].name")); line('side.barrow.down', 'LABEL', 'DOWN: THE DEEP TOMB', 'over its stairs'); line('side.barrow2.enter', 'MESSAGE', D.sides.barrow2.name, 'optional second floor; THE BARROW WIGHT and its hoard', where("say(SIDES[to].name"));
  L.push('', '_(After each danger Dave peeks in with a clue: table-script.md clue.tower / clue.stones / clue.barrow, then clue.left.* above.)_');
  H(4, 'Beat 5. Aldo cuts the fallen tree');
  block('Walking up to Aldo once the Hollow is safe'); line('field.chop.foes', 'MESSAGE', 'ALDO: DEAL WITH THOSE FIRST', 'foes near him');
  line('field.chop.1', 'MESSAGE', 'ALDO: STAND BACK'); line('field.chop.2', 'MESSAGE', 'ALDO: ONE MORE', 'after the second blow');
  line('banner.chop', 'BANNER', 'THE ROAD NORTH IS OPEN / ALDO HAS CUT THE FALLEN TREE', null, where("questBanner('THE ROAD NORTH IS OPEN'"));
  line('field.chop.3', 'MESSAGE', 'ALDO: GO ON. THE ROAD IS YOURS');
  talkBlock('npc.aldo.mine', 'ALDO afterwards (while the next step is the mine)');
  H(4, 'Beat 6. Hollis and the stolen farm (the Riverlands)');
  talkBlock('npc.hollis.ask', 'HOLLIS, the farm quest (ACCEPT)');
  block('The same if you looked at the chained mine first: line 1 becomes'); { const T = D.talk.find(t => t.id === 'npc.hollis.askChains').t; line('npc.hollis.askChains.1', T.pages[0][0], T.pages[0][1]); }
  block('Arriving in the Riverlands'); line('area.riv', 'MESSAGE', 'THE RIVERLANDS', 'the area name on arrival', where("LV.riv ? 'THE RIVERLANDS'"));
  block('The farm and the cellar');
  line('field.farm.clear', 'MESSAGE', 'THE FARM IS CLEAR. THEIR CHIEF IS IN THE CELLAR', 'the fourth brigand');
  line('side.cellar.enter', 'MESSAGE', D.sides.cellar.name, 'on entering', where("say(SIDES[kind].name"));
  line('field.cellar.1', 'MESSAGE', 'SACKS OF BONES, STACKED TO THE ROOF.', 'first time in the cellar'); line('field.cellar.2', 'MESSAGE', 'THE GRAVES WERE DUG FOR THIS.');
  line('field.chief.1', 'MESSAGE', 'THE CHIEF DROPS THE MINE KEY', 'the Bandit Chief falls'); line('field.chief.2', 'MESSAGE', 'AND A LETTER, SIGNED M.');
  talkBlock('npc.hollis.farmBack', 'HOLLIS, the hand-in (COLLECT)');
  H(4, 'Beat 7. The letter');
  talkBlock('npc.osric.letter', 'BROTHER OSRIC reads the letter (ACCEPT)');
  H(4, 'Beat 8. The old mine and the Skeleton King');
  block('The chained mine (before the key)'); line('btn.mine.look', 'BUTTON', 'LOOK', 'beside the chains, no key', where("label: 'LOOK'")); line('field.mine.chained.1', 'MESSAGE', 'THE MINE IS CHAINED SHUT'); line('field.mine.chained.2', 'MESSAGE', 'THE BANDITS TOOK THE KEY');
  block('With the key'); line('btn.mine.unlock', 'BUTTON', 'UNLOCK', null, where("label: 'UNLOCK', go: unlockMine")); line('field.mine.open', 'MESSAGE', 'THE KEY TURNS. THE CHAINS FALL AWAY'); line('label.mine', 'LABEL', 'THE OLD MINE', 'over the mine mouth', where("s.mine ? 'THE OLD MINE'"));
  block('Down below (two crypt floors, then the hall)'); line('area.floor', 'MESSAGE', 'CRYPT {n}', 'each floor\'s name on arrival: the theme name and the floor', where('`${TH().name} ${LV.floor}`'));
  line('area.hall', 'MESSAGE', D.acts[0].hall, 'the boss hall', where(`"${D.acts[0].hall}"`)); line('field.arena', 'MESSAGE', 'SOMETHING VAST STIRS IN THE DARK', 'arriving in any boss hall');
  line('boss.king.card', 'CARD', `${D.monsters.skelking.name} / ${D.monsters.skelking.title}`, 'the boss card when he wakes', where(D.monsters.skelking.title));
  line('boss.king.raise', 'MESSAGE', 'THE KING RAISES HIS DEAD', 'every 7-10 s');
  line('boss.guards', 'MESSAGE', 'THE {BOSS} GUARDS THE WAY DOWN', 'trying the stairs while he lives', where('GUARDS THE WAY DOWN'));
  line('boss.slain', 'MESSAGE', 'THE {BOSS} IS SLAIN', 'every boss', where('IS SLAIN'));
  line('boss.slain.2', 'MESSAGE', 'THE WAY DOWN IS OPEN', 'every boss but the King in Act I\'s story (Maelis comes instead)');
  block('MAELIS appears in a green flash (the game pauses; button OK)', '_(2.4 s after the King falls, first time only)_');
  for (const [k, t] of [[1, 'SO THE OLD KING SLEEPS AGAIN. NO MATTER. HE HAD ALREADY GIVEN ME WHAT I CAME FOR.'], [2, "YOU ARE OSRIC'S, AREN'T YOU? HE BURNED MY BOOKS AND CALLED IT MERCY. TELL HIM THEY WERE RIGHT: WHAT IS BURIED IN THIS LAND DOES NOT STAY BURIED."], [3, 'FOLLOW ME SOUTH, IF YOU LIKE. I WOULD SO LIKE YOU TO SEE WHAT I WAKE NEXT.']]) line(`maelis.finale.${k}`, 'MAELIS', t);
  block('He walks off and vanishes'); line('field.maelis.gone', 'MESSAGE', 'MAELIS IS GONE, SOUTH'); line('field.maelis.wayUp', 'MESSAGE', 'THE WAY UP IS OPEN'); line('label.hall.home', 'LABEL', 'HOME TO THE HOLLOW', "over the hall's stairs: 'HOME TO ' + the town's name", where("'HOME TO ' + AREA_NAMES.town[0]"));
  line('field.home', 'MESSAGE', 'THE ROAD ON IS OPEN, PAST THE RIVERLANDS', 'back in the Hollow from the hall', where("say('THE ROAD ON IS OPEN, PAST THE RIVERLANDS'"));
  H(4, "Beat 9. Osric's thanks and the end of Act I");
  talkBlock('npc.osric.kingBack', 'BROTHER OSRIC, the last hand-in (COLLECT)');
  block('The other second line (Maelis not seen; only old saves)'); { const T = D.talk.find(t => t.id === 'npc.osric.kingBackNoMaelis').t; line('npc.osric.kingBackNoMaelis.2', T.pages[1][0], T.pages[1][1]); }
  L.push('', '_(Then the table: table-script.md end.1-4. Then the end screen.)_');
  block('The end screen');
  line('end.screen.1', 'CARD', 'ACT I', null, where("textC('ACT I', W / 2, y0")); line('end.screen.2', 'CARD', 'COMPLETE', null, where("textC('COMPLETE'"));
  line('end.screen.3', 'CARD', 'THE KING SLEEPS. MAELIS HAS FLED SOUTH.'); line('end.screen.stats', 'CARD', 'TIME / LEVEL / KILLS / DEATHS', 'the rows of numbers', where("[['TIME'"));
  line('end.screen.4', 'CARD', 'NEXT: ACT II, ASHFORD'); line('end.screen.5', 'CARD', 'A MINING TOWN UNDER A SMOKING MOUNTAIN. THE MINERS HAVE STOPPED COMING UP, AND SOMETHING BELOW HAS STARTED DIGGING TOWARD THEM.');
  line('end.screen.6', 'CARD', 'THANK YOU FOR PLAYING THE DEMO'); line('end.screen.btn', 'BUTTON', 'KEEP PLAYING', null, where("'KEEP PLAYING'"));
  line('end.keep', 'MESSAGE', 'THE ROAD SOUTH IS OPEN, PAST THE RIVERLANDS', 'after KEEP PLAYING');
  line('banner.actDone', 'BANNER', 'ACT I COMPLETE / THE ROAD ON IS OPEN', null, where("questBanner('ACT I COMPLETE'"));

  // ---------------------------------------------------------------- 4.4 repeat lines
  H(3, '4.4 Repeat lines and hints, by person');
  block('BROTHER OSRIC, when he has nothing new', '_(one line; which one depends on the step)_');
  const seen = {};
  for (const T of D.talk.filter(t => t.id.startsWith('npc.osric.hint.') || t.id.startsWith('npc.osric.after.'))) {
    const txt = (T.id.includes('.after.') ? 'A' : 'H') + T.t.pages[0][1]; if (seen[txt]) { seen[txt].push(T.id.split('.').pop()); continue; } seen[txt] = [T.id.split('.').pop()];
  }
  for (const [txt0, sts] of Object.entries(seen)) { const txt = txt0.slice(1), id = 'npc.osric.' + (sts[0] === 'open' || sts[0] === 'shut' ? 'after.' : 'hint.') + sts[0]; line(id, 'BROTHER OSRIC', txt, (sts[0] === 'open' || sts[0] === 'shut' ? 'after Act I: ' : 'steps: ') + sts.join(', ')); }
  for (const [id, title] of [['npc.wren.idle.home', 'WREN, Aldo home'], ['npc.wren.idle.missing', 'WREN, Aldo missing'], ['npc.aldo.idle', 'ALDO by his woodpile'], ['npc.hollis.idle.before', 'HOLLIS, before the farm'], ['npc.hollis.idle.after', 'HOLLIS, after the farm']]) talkBlock(id, title);

  // ---------------------------------------------------------------- 4.5 quest names, tracker
  H(3, '4.5 Quest names, tracker goals, prompts');
  block('Quest names (tracker, small, top left)'); for (const [k, v] of Object.entries(D.storyNames)) line(`quest.${k}`, 'TRACKER', v);
  block('The goal for each step (tracker, big)', '_(step ids from storyStage in quests.js, in story order)_');
  for (const [st, t] of Object.entries(D.stageText)) { if (!t) continue; const tpl = /\d\/\d/.test(t); line(`goal.${st}`, 'TRACKER', tpl ? t.replace(/\d\/(\d)/, '{n}/$1') : t, null, where(tpl ? (st === 'farm' ? 'DRIVE THE BANDITS FROM THE FARM' : 'THREE DANGERS BAR THE ROAD NORTH ${') : t, 'stageText')); }
  block('Other tracker and prompt text');
  line('goal.claim', 'TRACKER', 'QUEST COMPLETE: CLAIM YOUR REWARD IN CAMP'); line('goal.also', 'TRACKER', 'ALSO: {the other dangers}', 'during the three dangers', where("text('ALSO:'"));
  line('goal.explore', 'TRACKER', 'EXPLORE: THE WAY ON IS SOMEWHERE ON THIS FLOOR', 'below ground, goal not yet seen');
  line('prompt.portal.claim', 'BUTTON', 'TOWN PORTAL: CLAIM YOUR REWARD'); line('prompt.portal.camp', 'BUTTON', 'TOWN PORTAL: BACK TO CAMP'); line('prompt.portal.walk', 'BUTTON', 'WALK INTO THE PORTAL', null, where("'WALK INTO THE PORTAL'"));
  block("The action button and the name tags' tap hints");
  for (const [id, t] of [['btn.talk', 'TALK'], ['btn.freeAldo', 'FREE ALDO'], ['btn.shop', 'SHOP'], ['btn.smith', 'UPGRADE GEAR']]) line(id, 'BUTTON', t, null, where(`'${t}' :`) || where(`'${t}'`));

  // ---------------------------------------------------------------- 4.6 places
  H(3, '4.6 Place names, act cards, signs and labels');
  block('Act cards (entering an act\'s town: ACT n / the act\'s name / the town)', '_(the act names are the old placeholder ones; the story calls the acts Oakhollow, Ashford and Greymarsh)_');
  D.acts.forEach((a, k) => line(`act.${k + 1}.name`, 'CARD', a.name, `ACT ${['I', 'II', 'III'][k]}; boss hall: ${a.hall}`));
  line('act.loop', 'CARD', 'ACT {n} NIGHTMARE / HELL / TORMENT', 'later loops', where("'NIGHTMARE', 'HELL', 'TORMENT'"));
  block('Area names (said on arrival)');
  D.areaNames.town.forEach((t, k) => line(`area.town.${k + 1}`, 'MESSAGE', t, `Act ${['I', 'II', 'III'][k]} town${k === 1 ? ' (built as the region ASHFORD VALE)' : k === 0 ? ' (the hand-built Act I hub)' : ''}`, where(`'${t}'`)));
  D.areaNames.forest.forEach((t, k) => line(`area.forest.${k + 1}`, 'MESSAGE', t, `Act ${['I', 'II', 'III'][k]} wilds${k === 0 ? ' (unused in Act I: the Riverlands takes its place)' : k === 1 ? ' (autumn; the Treant Elder)' : ' (night; the Ogre Warlord)'}`, where(`'${t}'`)));
  for (const a of D.acts.slice(1)) line(`area.hall.${a.boss}`, 'MESSAGE', a.hall, `boss: ${D.monsters[a.boss].name}`, where(`'${a.hall}'`));
  line('area.night', 'MESSAGE', 'NIGHT HAS FALLEN', 'arriving at a night level'); line('area.forest.boss1', 'MESSAGE', 'A TREANT ELDER HOLDS THE WAY DOWN'); line('area.forest.boss2', 'MESSAGE', 'AN OGRE WARLORD HOLDS THE WAY DOWN');
  block("The Hollow's clearings (layout names from hollow.json; shown on the travel map and in the layout pictures, not as in-game labels)");
  for (const [id, nm, lv, lv2] of D.hollow.clearings) line(`place.hollow.${id}`, 'LABEL', nm, `level ${lv}${lv2 ? '-' + lv2 : ''}`, where(`"name":"${nm}"`));
  block('Doors in the Hollow and the Riverlands (labels over the doors)');
  for (const k of ['den', 'tower', 'barrow', 'cellar']) line(`label.door.${k}`, 'LABEL', D.sides[k].label, k === 'barrow' ? 'in red' : null, where(`label: '${D.sides[k].label}'`));
  line('label.road', 'LABEL', 'TO THE RIVERLANDS', "the road north out of the Hollow ('TO ' + where it goes)", where("to: 'THE RIVERLANDS'"));
  line('label.gate.shut', 'LABEL', 'THE ROAD ON IS CLOSED', "the Riverlands' gate to Act II"); line('label.gate.open', 'LABEL', `THE ROAD ON: ${D.acts[1].name}`, "once open: 'THE ROAD ON: ' + the next act's name", where("'THE ROAD ON: '"));
  line('label.dungeon', 'LABEL', 'DUNGEON ENTRANCE'); line('label.wayout', 'LABEL', 'WAY OUT'); line('label.stairs', 'LABEL', 'STAIRS DOWN'); line('label.sealed', 'LABEL', 'SEALED', 'stairs while the boss lives', where("'SEALED'"));
  block("People's name tags in the Hollow", '_(over their heads; the two unnamed villagers have none)_');
  for (const [id, nm, key] of [['priest', 'BROTHER OSRIC', "name: 'BROTHER OSRIC'"], ['wren', 'WREN', "name: 'WREN'"], ['hollis', 'HOLLIS', "name: 'HOLLIS'"], ['aldo', 'ALDO', "name: 'ALDO'"], ['smith', 'SMITHY', "name: 'SMITHY'"], ['merchant', 'MERCHANT', "name: 'MERCHANT'"], ['maelis', 'MAELIS', "const MAELIS = 'MAELIS'"]]) line(`tag.${id}`, 'LABEL', nm, null, where(key));
  block('The shop and the forge screens (the lines with a voice)');
  line('shop.title', 'LABEL', 'MERCHANT', 'shop header', where("shopHeader(L, 'MERCHANT')")); line('shop.sell', 'LABEL', 'SHE PAYS A LITTLE MORE THAN SALVAGE'); line('shop.new', 'LABEL', 'NEW AFTER EVERY TRIP OUT'); line('shop.sold', 'MESSAGE', 'SOLD. SOMETHING NEW AFTER YOUR NEXT TRIP');
  line('smith.title', 'LABEL', 'BLACKSMITH', 'forge header', where("shopHeader(L, 'BLACKSMITH')")); line('smith.hint', 'LABEL', 'UP TO +3. A +3 WEAPON SHINES'); line('smith.max', 'LABEL', 'MASTERWORK: FULLY UPGRADED');
  block('Waystones (names said when one wakes, and on the travel map)');
  line('way.wake', 'MESSAGE', 'WAYSTONE: {name}', null, where("'WAYSTONE: '"));
  for (const n of D.ways.hub) line(`way.hollow.${n.toLowerCase().replace(/ /g, '')}`, 'LABEL', n, 'the Hollow', where(`name: '${n}'`));
  for (const n of D.ways.riv) line(`way.riv.${n.toLowerCase().replace(/ /g, '')}`, 'LABEL', n, 'the Riverlands', where(`name: '${n}'`));
  block('The travel map (Act I)');
  for (const t of ['THE HOLLOW', 'THE RIVERLANDS', 'THE MINE', 'CRYPT 1', 'CRYPT 2', "KING'S HALL", 'DEN', 'BARROW', 'TOWER', 'FARM', 'GATE']) line(`map.${t.toLowerCase().replace(/[^a-z0-9]/g, '')}`, 'LABEL', t, null, SRC['travel.js'].findIndex(l => l.includes(`'${t}'`) || l.includes(`"${t}"`)) >= 0 ? 'travel.js:' + (SRC['travel.js'].findIndex(l => l.includes(`'${t}'`) || l.includes(`"${t}"`)) + 1) : null);
  line('map.here', 'LABEL', 'YOU ARE HERE'); line('map.tap', 'LABEL', 'TAP A GLOWING STONE TO TRAVEL'); line('map.found', 'LABEL', 'WAYSTONE FOUND'); line('map.notfound', 'LABEL', 'NOT FOUND YET');
  block('Act II, region 1 (ASHFORD VALE): built as a map, no story yet', '_(clearing and door names from ashford.json)_');
  line('place.ashford.region', 'LABEL', D.ashford.name, 'the region', where(`"name":"${D.ashford.name}"`));
  for (const [id, nm, lv, lv2] of D.ashford.clearings) line(`place.ashford.${id}`, 'LABEL', nm, `level ${lv}${lv2 ? '-' + lv2 : ''}`, where(`"name":"${nm}"`));
  for (const [id, nm, note] of D.ashford.doors) line(`place.ashford.door.${id}`, 'LABEL', nm, note, where(`"name":"${nm}"`));

  // ---------------------------------------------------------------- 4.7 bosses
  H(3, '4.7 Bosses, leaders and named enemies');
  block('Boss cards (name / epithet, when it wakes)', '_(unique monsters)_');
  for (const [k, m] of Object.entries(D.monsters).filter(([, m]) => m.unique)) line(`boss.${k}.card`, 'CARD', m.title ? `${m.name} / ${m.title}` : m.name, { skelking: "Act I: the King's Hall", broodmother: 'Act II: the Brood Nest', lich: 'Act III: the Sanctum', treant: 'Act II wilds (Emberwood)', warlord: 'Act III wilds (Thornwood)', barrowwight: 'the Barrow: the Deep Tomb' }[k] || null, where(m.title || `name: '${m.name}'`));
  block('Their shouts in a fight');
  line('boss.treant.call', 'MESSAGE', D.monsters.treant.calls, 'at half life'); line('boss.warlord.call', 'MESSAGE', 'THE WARLORD CALLS HIS GOBLINS', 'at half life (default for any slam boss without its own line)');
  line('boss.lich.phase', 'MESSAGE', 'THE LICH ASCENDS', 'second phase'); line('boss.lich.wall', 'MESSAGE', 'BONES RISE FROM THE FLOOR');
  block('Leaders of the side areas and packs (elite or leader; name over the head, no card)');
  for (const [k, m] of Object.entries(D.monsters).filter(([, m]) => !m.unique)) line(`enemy.${k}`, 'LABEL', m.name, [m.elite ? 'elite' : '', m.leader ? 'leads a pack' : '', k === 'alpha' ? 'the wolf den' : k === 'banditchief' ? 'the farm cellar' : k === 'gchief' ? 'the Old Watchtower' : '', k === 'treasure' ? 'runs away with a sack' : ''].filter(Boolean).join(', '), where(`name: '${m.name}'`));
  line('enemy.wraith', 'LABEL', 'WRAITH', "the Barrow's leader (an ordinary wraith as leader)", where("name: 'WRAITH'"));
  block('Champions (a random monster rolled stronger: a prefix + its name)');
  for (const c of D.champs) line(`champ.${c.toLowerCase()}`, 'LABEL', `${c} {MONSTER}`, null, where(`prefix: '${c}'`));
  block('Elite powers (the first time you meet each, a tip)'); D.powers.forEach(t => line(`elite.${t.split(':')[0].toLowerCase()}`, 'MESSAGE', t)); line('elite.shield', 'MESSAGE', 'SHIELD BROKEN', null, where("'SHIELD BROKEN'"));
  block('The treasure goblin'); line('enemy.treasure.burst', 'MESSAGE', 'THE SACK BURSTS!'); line('enemy.treasure.escape', 'MESSAGE', 'THE TREASURE GOBLIN ESCAPED');

  // ---------------------------------------------------------------- 4.8 events
  H(3, '4.8 Dungeon and wild events');
  block('The vault (one per dungeon floor)');
  line('event.vault.locked.1', 'MESSAGE', 'A LOCKED VAULT'); line('event.vault.locked.2', 'MESSAGE', 'A CHAMPION ON THIS FLOOR CARRIES THE KEY'); line('event.vault.key.float', 'LABEL', 'VAULT KEY', 'floats up where the champion fell', where("floater('VAULT KEY'"));
  line('event.vault.key', 'BANNER', 'THE VAULT KEY / A LOCKED VAULT ON THIS FLOOR WILL OPEN FOR IT', null, where("'THE VAULT KEY'")); line('event.vault.tracker', 'TRACKER', 'VAULT KEY: FIND THE LOCKED VAULT');
  line('event.vault.btn', 'BUTTON', 'UNLOCK THE VAULT'); line('event.vault.open', 'BANNER', 'THE VAULT IS OPEN / THREE CHESTS INSIDE', null, where("'THE VAULT IS OPEN'")); line('event.vault.shut', 'MESSAGE', 'THE VAULT IS LOCKED', 'pushed out of the gateway');
  block('Dungeon shrines (button PRAY AT THE SHRINE; a banner)'); line('event.shrine.btn', 'BUTTON', 'PRAY AT THE SHRINE');
  for (const [nm, ln] of D.dgShrines) line(`event.shrine.${nm.split(' ').pop().toLowerCase()}`, 'BANNER', `${nm} / ${ln}`, null, where(`name: '${nm}'`));
  line('event.shrine.fade', 'MESSAGE', "THE SHRINE'S BLESSING FADES", null, where("THE SHRINE\\'S BLESSING FADES"));
  block('Shrines in the wilds (walk onto one: two messages)'); for (const [nm, ln] of D.shrines) line(`event.wildshrine.${nm.split(' ').pop().toLowerCase()}`, 'MESSAGE', `${nm} / ${ln}`, null, where(`name: '${nm}'`));
  block('The ambush room');
  line('event.ambush.start', 'BANNER', 'AMBUSH / THEY COME OUT OF THE WALLS. HOLD THE ROOM', null, where("questBanner('AMBUSH'")); line('event.ambush.wave', 'BANNER', 'WAVE {n}/{waves} / MORE COMING', null, where("'MORE COMING'")); line('event.ambush.last', 'BANNER', 'WAVE {n}/{n} / THE LAST OF THEM', null, where("'THE LAST OF THEM'"));
  line('event.ambush.done', 'BANNER', 'AMBUSH SURVIVED / THE ROOM IS YOURS', null, where("'AMBUSH SURVIVED'"));
  block('Chests, loot, levels'); line('event.chest', 'MESSAGE', 'THE CHEST CREAKS OPEN'); line('event.legend', 'MESSAGE', 'A LEGENDARY ITEM HAS FALLEN'); line('event.levelup', 'MESSAGE', 'LEVEL UP! LEVEL {n}', null, where('LEVEL UP! LEVEL'));
  block('Death and the town portal');
  line('event.dead.1', 'CARD', 'YOU HAVE DIED'); line('event.dead.2', 'CARD', 'TAP TO RISE AGAIN'); line('event.dead.3', 'MESSAGE', 'YOU RISE AGAIN');
  line('event.portal.town', 'MESSAGE', 'YOU ARE IN TOWN'); line('event.portal.back', 'MESSAGE', 'WALK INTO THE PORTAL TO GO BACK'); line('event.portal.return', 'MESSAGE', 'BACK THROUGH THE PORTAL');

  // ---------------------------------------------------------------- 4.9 loot
  H(3, '4.9 Legendary items, sets and outfits');
  block('Legendaries (name, then its lore line under the stats)');
  for (const [nm, lore, cls] of D.legend) { const id = 'item.' + nm.toLowerCase().replace(/[^a-z]/g, ''); line(id + '.name', 'LABEL', nm, cls !== 'any' ? cls === 'warrior' ? 'barbarian only' : cls + ' only' : null, where(`name: '${nm}'`) || where(`name: "${nm}"`)); line(id + '.lore', 'LABEL', lore, null, where(`lore: '${lore}'`) || where(`lore: "${lore}"`)); }
  block('Sets (green items: three or four named pieces)');
  for (const [nm, pieces, cls] of D.sets) line('set.' + nm.toLowerCase().replace(/[^a-z]/g, ''), 'LABEL', `${nm} SET: ${pieces.join(', ')}`, cls !== 'any' ? (cls === 'warrior' ? 'barbarian' : cls) : null, where(`name: '${nm}'`) || where(`name: "${nm}"`));
  block('Outfits (matching ordinary pieces give a bonus; names only)');
  line('outfit.names', 'LABEL', D.outfits.map(o => o[0]).join(', '), `${D.outfits.length} outfits`, 'items.js:205, gear_mage.js:47, gear_paladin.js:255, gear_ranger.js:34, paladin.js:209');

  // ---------------------------------------------------------------- 4.10 shouts
  H(3, "4.10 The hero's shouts (ultimates and big moments)");
  block('Callouts when a big power fires or is ready');
  for (const t of ['WRATH OF THE MOUNTAIN!', 'ARCANE STORM!', 'RAIN OF ARROWS!', 'BERSERKER!', 'TITAN!', 'THE TITAN SLEEPS', 'RAGE: THE BERSERKER IS READY', 'FULL RAGE: UNLEASH THE TITAN', 'WAR CRY! DAMAGE AND ARMOR UP', 'WINGS OF DAWN READY', 'ARCHANGEL IS READY', 'THE WINGS FADE', 'ALL FOUR ORBS: CATACLYSM IS READY']) line('shout.' + t.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24), 'MESSAGE', t);

  // ---------------------------------------------------------------- 4.11 Act II people
  H(3, '4.11 Act II townspeople (in the game as name tags only; no lines yet)');
  block('ASHFORD (from ashford.json; in the game Tamsin opens the smith\'s screen and Nella the shop, the others only stand)');
  for (const [who, role] of D.ashford.stations) line('npc.ashford.' + who.split(' ')[0].toLowerCase(), 'LABEL', who, role + (/after the rescue/.test(role) ? '; not placed yet' : ''), where(`"who":"${who}"`));
  flush();
  fs.writeFileSync(process.argv[2], L.join('\n') + '\n');
  const nf = L.filter(l => l.includes('NOT FOUND IN SOURCE')).length;
  console.log('lines per section:'); let tot = 0; for (const [k, v] of Object.entries(count)) { console.log(`  ${v}\t${k}`); tot += v; }
  console.log(`  ${tot}\ttotal; not found in source: ${nf}`);
})();
