// round 117: shader before/after. node shader.cjs <gameDir> <out.png> [flagsA] [flagsB]   (flags: "ao=0,sheen=0")
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html');
  const url = await p.evaluate(([fa, fb]) => {
    buildBudget.ms = Infinity; G.mode = 'play'; newHero('warrior'); startLevel(3, 777);
    const Rr = rng(5), mk = base => { const it = rollItem(Rr, 1, base); it.rarity = 'normal'; it.mods = {}; return it; };
    const outfits = [['warrior', ['long_sword', 'chain_mail', 'barbute', 'kite_shield']], ['warrior', ['bastard_sword', 'gothic_plate', 'bascinet', 'heater_shield']], ['warrior', ['battle_axe', 'dark_plate', 'horned_helm', 'tower_shield']],
      ['mage', ['runed_staff', 'sorcerer_robe', 'conjurer_hat']], ['ranger', ['war_bow', 'drake_hide', 'night_hood', 'deep_quiver']], ['paladin', []]];
    const mons = ['skeleton', 'fallen', 'hound', 'spider', 'zombie', 'goblin', 'wolf', 'bandit', 'ogre', 'skelking', 'shaleripper', 'cinderhusk'].filter(id => MONSTERS[id]);
    const set = fl => { for (const kv of (fl || '').split(',')) { const [k, v] = kv.split('='); if (k) RIGFX[k] = +v; } spriteCache.clear(); };
    const cells = fl => {
      set(fl); const out = [];
      for (const [cls, items] of outfits) { newHero(cls); if (items.length) { hero.equip = { weapon: null, helm: null, chest: null, shield: null, ring: null, amulet: null }; for (const s of items) if (ITEM_BASES[s]) hero.equip[ITEM_BASES[s].slot] = mk(s); } recalcHero();
        for (const [d, clip, f] of [[0, 'idle', 0], [3, 'idle', 0], [0, 'attack', 2]]) { try { out.push(getSprite('hero', hero.look, d, clip, f, hero, SPX)); } catch (e) { out.push(null); } } }
      for (const id of mons) { const e = makeEnemy(id, 10, 10, 1); for (const [d, clip, f] of [[0, 'idle', 0], [3, 'walk', 2]]) { try { out.push(getSprite(e.fam, e.look, d, clip, f, e, SPX)); } catch (e2) { out.push(null); } } }
      return out;
    };
    const A = cells(fa), B = cells(fb), Z = 4, CW = 64, CH = 76, per = 14, rows = Math.ceil(A.length / per);
    const cv = document.createElement('canvas'); cv.width = per * CW * Z / 2 * 2; cv.height = rows * CH * Z * 2 / 1; const g = cv.getContext('2d');
    cv.width = per * CW * 2; cv.height = rows * CH * 2 * 2 + 4;
    const col = v => `rgb(${PR[v]},${PG[v]},${PB[v]})`;
    const draw = (L, y0, bg) => { g.fillStyle = bg; g.fillRect(0, y0, cv.width, rows * CH * 2);
      L.forEach((sp, n) => { if (!sp) return; const cx = (n % per) * CW * 2 + CW, cy = y0 + (Math.floor(n / per) + 1) * CH * 2 - 14, z = sp.w > 60 ? 1.4 : 2;
        for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; g.fillStyle = col(v0 & 127); g.fillRect(Math.round(cx + ((q % sp.w) - sp.ax) * z), Math.round(cy + (((q / sp.w) | 0) - sp.ay) * z), Math.ceil(z), Math.ceil(z)); } }); };
    draw(A, 0, col(7)); draw(B, rows * CH * 2 + 4, col(7));
    return cv.toDataURL();
  }, [process.argv[4] || 'ao=0,sheen=0', process.argv[5] || 'ao=1,sheen=1']);
  fs.writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64')); console.log(errs.length ? 'ERR ' + errs.join('\n') : 'ok'); await b.close(); })();
