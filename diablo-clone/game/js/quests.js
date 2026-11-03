'use strict';
// Quests and side areas (round 26). Brother Osric at the cathedral steps hands out the Act I
// quests the first time you speak to him. Each has steps (kill so many of something, then its
// leader), a line in the tracker at the top left, and a reward when you go back to him: gold,
// experience and one rare item. Two of the leaders live in side areas: short generated floors
// entered from the hub (the wolf den in the west woods, the cellar under the farmhouse). Leaving
// one puts you back at its door with the hub as you left it.

const QUESTS = [
  { id: 'wolves', name: 'THE WOLF DEN', steps: [{ kill: 'wolf', n: 6, text: 'WOLVES' }, { kill: 'alpha', n: 1, text: 'THE ALPHA IN THE DEN' }],
    give: ['WOLVES HAVE COME OUT OF THE WEST WOODS.', 'THIN THEM OUT, THEN FIND THE ALPHA IN ITS DEN.'] },
  { id: 'bandits', name: 'THE STOLEN FARM', steps: [{ kill: 'brigand', n: 4, text: 'BANDITS' }, { kill: 'banditchief', n: 1, text: 'THEIR CHIEF IN THE CELLAR' }],
    give: ['BANDITS HOLD THE FARM TO THE EAST.', 'DRIVE THEM OFF. THEIR CHIEF HIDES IN THE CELLAR.'] },
  { id: 'mine', name: 'THE OLD MINE', steps: [{ kill: 'skelking', n: 1, text: 'THE KING BELOW THE MINE' }],
    give: ['THE DEAD WALK UNDER THE OLD MINE TO THE NORTH.', 'GO DOWN AND PUT THEIR KING TO REST.'] },
];
// G.quests: { [id]: { step, n, done, paid } } once given
function questState(id) { return G.quests && G.quests[id]; }
function questsGiven() { return !!G.quests && Object.keys(G.quests).length > 0; }
function questReady() { return QUESTS.some(q => { const s = questState(q.id); return s && s.done && !s.paid; }); }
function questKill(id) {
  if (!G.quests) return;
  for (const q of QUESTS) {
    const s = G.quests[q.id]; if (!s || s.done) continue;
    const st = q.steps[s.step]; if (st.kill !== id) continue;
    s.n++;
    if (s.n >= st.n) {
      s.step++; s.n = 0;
      if (s.step >= q.steps.length) { s.done = true; say(`${q.name}: DONE. RETURN TO BROTHER OSRIC`, 51, 3); sfx('levelUp'); }
      else say(`${q.name}: ${q.steps[s.step].text}`, 51, 2.5);
    }
    saveGame();
  }
}
// talking to the priest: the first time he gives the quests; after that he pays for finished ones
function talkPriest() {
  if (!questsGiven()) {
    G.quests = {};
    for (const q of QUESTS) G.quests[q.id] = { step: 0, n: 0, done: false, paid: false };
    say('BLESS YOU FOR COMING. WE NEED A BLADE.', 26, 3);
    for (const q of QUESTS) say(q.give[0], 25, 4);
    sfx('levelUp'); saveGame(); return;
  }
  let paid = 0;
  for (const q of QUESTS) {
    const s = G.quests[q.id]; if (!s.done || s.paid) continue;
    s.paid = true; paid++;
    const gold = 60 * LV.diff, xp = 140 * LV.diff, it = rollRare(rng((Math.random() * 1e9) | 0), LV.diff + 1);
    hero.gold += gold; gainXp(xp);
    groundItems.push({ item: it, fi: hero.fi + 0.6, fj: hero.fj + 0.6, t: 0 });
    say(`${q.name}: +${gold} GOLD, +${xp} XP`, 51, 3);
  }
  if (paid) { sfx('gold'); saveGame(); return; }
  // otherwise, a reminder of what is left
  const next = QUESTS.find(q => !G.quests[q.id].done);
  if (next) say(next.give[1], 26, 3); else say('THE LIGHT KEEPS YOU. THE ROAD SOUTH WILL OPEN SOON.', 26, 3);
}
// a rare (or better) item: rerolls until one comes up
function rollRare(R, level) {
  for (let t = 0; t < 80; t++) { const it = rollItem(R, level); if (it.rarity !== 'normal' && it.rarity !== 'magic') return it; }
  return rollItem(R, level);
}
// the tracker: one line per open quest, at the left under the messages
function drawQuestTracker() {
  if (!G.quests || G.mode !== 'play') return;
  let y = 68;   // below the message lines (34-58), clear of the boss bar
  for (const q of QUESTS) {
    const s = G.quests[q.id]; if (!s || s.paid) continue;
    const line = s.done ? `${q.name}: SEE BROTHER OSRIC` : (() => { const st = q.steps[s.step]; return st.n > 1 ? `${st.text} ${s.n}/${st.n}` : st.text; })();
    text(line, 4, y, s.done ? 51 : 26); y += 8;
  }
}
// "!" over the priest while he has quests to give, "?" when one is ready to hand in
function priestMark(n, sx, by) {
  if (n.role !== 'priest') return false;
  const ch = !questsGiven() ? '!' : questReady() ? '?' : null; if (!ch) return false;
  textC(ch, sx, by - 2, 51, 2);
  return true;
}

// ---------------------------------------------------------------- side areas
// Each is a short floor generated like a dungeon (few rooms), with its own monsters and a leader
// in the farthest room. The way out (stairs up) is in the start room.
const SIDES = {
  den: { name: 'THE WOLF DEN', theme: 'caves', rooms: 5, pool: ['wolf'], boss: 'alpha', door: () => [HUB.den[0] + 1.6, HUB.den[1] + 0.6], label: 'WOLF DEN' },
  cellar: { name: 'THE FARM CELLAR', theme: 'crypt', rooms: 5, pool: ['brigand'], boss: 'banditchief', door: () => [54.6, 10.4], label: 'FARMHOUSE CELLAR' },
};
// the hub's doors into the side areas: walk onto one to go in
function updateSideDoors() {
  if (!LV.hub || G.fadeTo) return;
  for (const k in SIDES) {
    const [fi, fj] = SIDES[k].door(), d = Math.hypot(fi - hero.fi, fj - hero.fj);
    if (d > 1.2) { G['armed_' + k] = true; continue; }
    if (d < 0.5 && G['armed_' + k] !== false) enterSide(k);
  }
}
function enterSide(kind) {
  sfx('stairs');
  const back = { level: LV.level, seed: LV.seed, door: SIDES[kind].door(), snap: { enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) } };
  G.fadeTo = () => { G.sideBack = back; startLevel(back.level, (back.seed ^ (kind === 'den' ? 0xd3d : 0xce11a)) >>> 0, kind); say(SIDES[kind].name, 51, 3); saveGame(); };
}
function leaveSide() {
  const R0 = G.sideBack; if (!R0) return;
  sfx('stairs');
  G.fadeTo = () => {
    startLevel(R0.level, R0.seed);
    const S = R0.snap;
    enemies = S.enemies; boss = S.boss; groundItems = S.groundItems; LV.seen.set(S.seen);
    S.props.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
    // back at the door, a step out so it doesn't take you straight in again
    hero.fi = R0.door[0] + 1; hero.fj = R0.door[1] + 0.6; G.sideBack = null;
    for (const k in SIDES) G['armed_' + k] = false;
    updateFov(hero.fi, hero.fj); saveGame();
  };
}
function drawSideDoorLabels() {
  if (!LV.hub) return;
  for (const k in SIDES) {
    const [fi, fj] = SIDES[k].door(); if (Math.hypot(fi - hero.fi, fj - hero.fj) > 6) continue;
    const [x, y] = iso(fi, fj); textC(SIDES[k].label, Math.round(x - camX), Math.round(y - camY) - 30, 51);
  }
}
