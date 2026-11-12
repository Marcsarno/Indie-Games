// round 108: the Paladin's recorded sounds: every file decodes over http, and each of his moves calls its new sound.
// node tools/playtests/r108/palsfx.cjs
const { chromium } = require('playwright'); const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const root = path.resolve('game'); const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.mp3') ? 'audio/mpeg' : f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8765);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('http://localhost:8765/index.html?cine=0');
  const r = await p.evaluate(async () => {
    const out = { decoded: {}, calls: {} };
    const c = new OfflineAudioContext(1, 44100, 44100);
    for (const k of Object.keys(SAMPLES).filter(k => k.startsWith('pal'))) { try { const buf = await (await fetch('sfx/' + k + '.mp3')).arrayBuffer(); const a = await c.decodeAudioData(buf); out.decoded[k] = +a.duration.toFixed(2); } catch (e) { out.decoded[k] = 'FAIL ' + e; } }
    const s0 = sfx; sfx = function (n, v) { out.calls[n] = (out.calls[n] || 0) + 1; return s0(n, v); };
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 12; recalcHero(); palKit && palKit();
    const step = n => { for (let k = 0; k < n; k++) { hero.hp = STAT.maxHp; hero.dead = 0; G.t += 1 / 60; update(1 / 60); } };
    const foes = () => { for (let k = 0; k < 4; k++) { const e = makeEnemy('skeleton', hero.fi + 1 + (k % 2) * 0.6, hero.fj + (k - 1.5) * 0.5, 0, 6); e.maxHp = e.hp = 900; e.state = 'hunt'; enemies.push(e); } };
    step(10); foes();
    for (let k = 0; k < 6; k++) { input.attack = true; step(30); } input.attack = false;   // the combo (swing, thump, third-swing hammer)
    for (let i = 0; i < SKILLS.length; i++) { step(40); hero.mana = 999; CD[SKILLS[i].id] = 0; useSkill(i); step(150); }   // Hammer of Light, Consecrate (+ pulses), Seraph's Fall, Judgment
    hero.ult = 50; useUlt(); step(40); foes();   // Wings of Dawn: its kit (Lance, Toll)
    for (let i = 0; i < SKILLS.length; i++) { step(40); hero.mana = 999; CD[SKILLS[i].id] = 0; useSkill(i); step(150); }
    hero.wing = null; recalcHero(); palKit(); hero.ult = 100; useUlt(); step(40); foes();   // Archangel: Wrath of Heaven, pillars
    for (let k = 0; k < 6; k++) { input.attack = true; step(30); } input.attack = false;
    for (let i = 0; i < SKILLS.length; i++) { step(40); hero.mana = 999; CD[SKILLS[i].id] = 0; useSkill(i); step(150); }
    hero.ult = 0; faithNote && (hero.ult = 50, faithNote(10));
    return out; });
  console.log(JSON.stringify(r.decoded)); console.log(JSON.stringify(r.calls)); console.log(errs.join('\n') || 'no page errors'); await b.close(); srv.close();
})();
