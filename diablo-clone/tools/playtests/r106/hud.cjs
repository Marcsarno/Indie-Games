// the barbarian in the game: HUD + skill buttons, bag, the class pick; plus the gear rules checked in the page
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const R = await p.evaluate(() => { const shots = [], chk = {};
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 6; recalcHero();
    chk.kit = ['weapon', 'shield', 'chest', 'helm'].map(s => s + ':' + (hero.equip[s] && hero.equip[s].base)).join(' ');
    chk.look = JSON.stringify({ w: hero.look.weapon, off: hero.look.offhand, sh: hero.look.shield });
    chk.skills = SKILLS.map(s => s.name).join(', ');
    const warm = () => { for (let i = 0; i < 800; i++) warmStep(40); };
    for (let k = 0; k < 20; k++) update(1 / 60); G.msg = [];
    warm(); render(); shots.push(['hud', cvs.toDataURL()]);
    // the rules: what drops for him, what equipping does
    const R0 = rng(9); let sh = 0, plate = 0, n = 0; for (let k = 0; k < 600; k++) { const it = rollItem(R0, 5); if (!it) continue; n++; const B = ITEM_BASES[it.base]; if (B.slot === 'shield' && B.cls !== 'ranger') sh++; if (typeof barbDeny === 'function' && barbDeny(B)) plate++; }
    chk.drops = `${n} drops: shields ${sh}, denied looks ${plate}`;
    const mk = id => { const it = rollItem(rng(3), 5, id); it.rarity = 'normal'; it.mods = {}; return it; };
    const ax = mk('war_axe'); hero.bag.push(ax); equipItem(ax); chk.eq1 = `main ${hero.equip.weapon.base} off ${hero.equip.shield && hero.equip.shield.base}`;
    const gs = mk('greatsword'); hero.bag.push(gs); equipItem(gs); chk.eq2 = `main ${hero.equip.weapon.base} off ${hero.equip.shield && hero.equip.shield.base}`;
    const ss = mk('long_sword'); hero.bag.push(ss); equipItem(ss); chk.eq3 = `main ${hero.equip.weapon.base} off ${hero.equip.shield && hero.equip.shield.base}`;
    const ks = mk('kite_shield'); chk.canShield = canWear(ks);
    for (const id of ['b_wolf', 'b_bear', 'b_bone', 'b_warlord', 'b_wolfhood', 'b_skull', 'b_horns', 'battle_axe', 'mace']) hero.bag.push(mk(id));
    openInv('inv'); INV.sel = { item: hero.bag.find(i => i.base === 'b_warlord'), from: 'bag' }; render(); shots.push(['inv', cvs.toDataURL()]); closeInv && closeInv();
    // the paladin gets the plate
    newHero('paladin'); const pl = mk('plate_mail'), gh = mk('great_helm'); chk.pal = `plate ${canWear(pl)} great helm ${canWear(gh)}`;
    for (const c of ['warrior', 'paladin', 'mage', 'ranger']) { newHero(c); const R1 = rng(5); let bad = 0, n = 0; for (let k = 0; k < 300; k++) { const a = rollSetItem(R1), l = rollLegendary(R1); for (const x of [a, l]) { n++; if (!canWear(x)) bad++; } } chk['sets+legends ' + c] = `${n} rolled, ${bad} unwearable`; }
    return [shots, chk]; });
  for (const [n, u] of R[0]) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(JSON.stringify(R[1], null, 1)); console.log(errs.join('\n') || 'ok'); await b.close(); })();
