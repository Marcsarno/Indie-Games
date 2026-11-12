// exports every line said at the D&D table (title, the opening, each quest, the clue peeks, the act's end) as an
// editable Markdown script with an ID per line: node tools/script/export.cjs <out.md>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const D = await p.evaluate(() => {
    newHero('warrior');
    const shots = (kind, cls, opts) => cineShots(kind, cls, opts).map(s => ({ who: s.who, as: s.as || null, text: s.text, fx: s.fx || null, light: s.light || null, roll: !!s.roll, keep: !!s.keep }));
    const opens = {}; for (const c of ['warrior', 'paladin', 'mage', 'ranger']) opens[c] = shots('open', c, {});
    return { title: shots('title', 'warrior', {}), opens, quests: Object.fromEntries(Object.entries(QUEST_TABLE).map(([k, q]) => [k, q.lines])), role: CAMP_ROLE, clues: CLUES, actEnd: shots('actEnd', 'warrior', {}) };
  });
  await b.close();
  const NAME = { dave: 'DAVE', marc: 'MARC', aaron: 'AARON', chris: 'CHRIS' }, FX = { dead: 'the dead rising', wolves: 'wolves', bandits: 'bandits', king: 'the Skeleton King', maelis: 'Maelis', roll: 'your die roll' };
  const L = [];
  const line = (id, who, as, text, fx, light) => {
    const dir = [fx ? `vision: ${FX[fx] || fx}` : '', light === 'G' ? 'green light' : light === 'D' ? 'dim light' : ''].filter(Boolean).join(', ');
    L.push(`- **[${id}]** ${NAME[who] || who.toUpperCase()}${as ? ` (as ${as})` : ''}: ${text}${dir ? `  _(${dir})_` : ''}`);
  };
  L.push('# Dungeons of Bones: the D&D table script', '',
    'Every line said at the table, in the order it plays. Edit the text freely: keep each line\'s **[ID]** so I can put your version back in the right place.',
    'To add a line, write it under the one it follows with a new ID like **[open.5b]**; to cut one, strike it out or write CUT. Notes to me in brackets are fine.',
    'Speakers: DAVE (the DM; "as X" means he voices that character), MARC, AARON, CHRIS (the players), YOU (the player\'s own hero).',
    'Stage directions in _(italics)_: a vision is the picture that rises from the table while the line plays.', '');
  L.push('## 1. Title screen (choosing your hero)', '');
  D.title.forEach((s, i) => { if (!s.keep) line(`title.${i + 1}`, s.who, s.as, s.text, s.fx, s.light); });
  L.push('', '## 2. The opening (a new game)', '', 'The first line changes with your class:', '');
  for (const c of ['warrior', 'paladin', 'mage', 'ranger']) line(`open.1.${c === 'warrior' ? 'barbarian' : c}`, D.opens[c][0].who, D.opens[c][0].as, D.opens[c][0].text, D.opens[c][0].fx, D.opens[c][0].light);
  L.push('');
  const meetT = D.quests.meet.map(l => l[2]); let saidMeet = false;
  D.opens.warrior.slice(1).forEach((s, i) => { if (meetT.includes(s.text)) { if (!saidMeet) { saidMeet = true; L.push('- _(here the whole **Meeting Brother Osric** quest plays: lines meet.1 to meet.4 in section 3; edit them there)_'); } return; } if (s.roll) { line(`open.roll`, s.who, s.as, s.text, 'roll', s.light); L.push(`- **[open.roll20]** DAVE: A NATURAL TWENTY. OF COURSE.  _(when the die lands on 20)_`); } else line(`open.${i + 2}`, s.who, s.as, s.text, s.fx, s.light); });
  L.push('', '## 3. The story at the table, in order', '', 'Quests play when you talk to that person in camp (the camera lifts to the table). Clues are short: Dave peeks in from the top of the screen and the game keeps going.', '');
  const QN = { meet: 'Meeting Brother Osric', wren: 'Wren', aldoBack: 'Aldo is home', mine: 'The mine', hollis: 'Hollis', farmBack: 'Back from the farm', letter: 'The letter', kingBack: 'The king is dead' };
  const quest = k => { const lines = D.quests[k]; if (!lines) return; L.push(`### ${QN[k] || k} (\`${k}\`, talking to ${D.role[k] || '?'})`, ''); lines.forEach(([who, as, text, fx], i) => line(`${k}.${i + 1}`, who, as, text, fx)); L.push(''); };
  quest('meet'); quest('wren'); quest('aldoBack');
  L.push('### The three dangers of the Hollow (any order; a clue after each)', '', 'After each clue Dave adds: "TWO DANGERS LEFT IN THE HOLLOW." / "ONE DANGER LEFT IN THE HOLLOW." / after the last: "THE HOLLOW IS QUIET. ALDO WAITS AT THE FALLEN TREE WITH HIS AXE."', '');
  for (const [k, lines] of Object.entries(D.clues)) { L.push(`**After the ${k}:**`, ''); lines.forEach(([who, as, text, fx], i) => line(`clue.${k}.${i + 1}`, who, as, text, fx)); L.push(''); }
  quest('hollis');
  if (D.quests.mine && JSON.stringify(D.quests.mine) === JSON.stringify(D.quests.hollis)) L.push('_(The `mine` quest, also from Hollis, plays the same four lines as Hollis above. Write different ones under new IDs **[mine.1]** etc. if you want it to differ.)_', '');
  else quest('mine');
  quest('farmBack'); quest('letter'); for (const k of Object.keys(D.quests)) if (!['meet', 'wren', 'aldoBack', 'hollis', 'mine', 'farmBack', 'letter'].includes(k)) quest(k);
  L.push('## 4. The end of Act I', '');
  D.actEnd.forEach((s, i) => line(`end.${i + 1}`, s.who, s.as, s.text, s.fx, s.light));
  L.push('');
  fs.writeFileSync(process.argv[2], L.join('\n')); console.log(L.length, 'lines written');
})();
