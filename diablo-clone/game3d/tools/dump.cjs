// Exports everything the 3D game draws from the 2D game, as model data for the Blender converter.
//   node tools/dump.cjs <outdir> [chars] [heroes] [props]        (no names = all three)
// chars  = every monster, every villager and animal met in Act I's areas, the stairs and doorways
// heroes = the three classes in pieces: bodies by armour, heads by helm, weapons, shield arms, per way of moving
// props  = the scenery
// Writes <outdir>/<file>.json per model and <outdir>/manifest.json:
//   { chars: {key: file}, props: {name: file}, rigs: {hash: file}, heroes: {cls: {team: {...}}}, tl: {file: {clip: [start, length, loops]}} }
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), crypto = require('crypto');
(async () => {
  const OUT = path.resolve(process.argv[2] || 'blender/rigs'); let what = process.argv.slice(3); if (!what.length) what = ['chars', 'heroes', 'props'];
  fs.mkdirSync(OUT, { recursive: true });
  const mf = path.join(OUT, 'manifest.json'), M = Object.assign({ chars: {}, props: {}, rigs: {}, heroes: {}, tl: {} }, fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : {});
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', String(e.stack || e).slice(0, 500)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  for (const f of ['rigdump.js', 'rigposes.js']) await p.addScriptTag({ path: path.resolve(__dirname, '../js3d', f) });
  const save = m => { if (m.tl) M.tl[m.name] = m.tl; fs.writeFileSync(path.join(OUT, m.name + '.json'), JSON.stringify(m)); };
  // a piece named by its content, so the same piece reached two ways is one file
  const byContent = (m, prefix) => { const { name, ...rest } = m; m.name = prefix + '_' + crypto.createHash('sha1').update(JSON.stringify(rest)).digest('hex').slice(0, 10); if (!fs.existsSync(path.join(OUT, m.name + '.json')) || !M.tl[m.name]) save(m); return m.name; };

  // walk Act I: every area and side area, a few seeds, so every prop, villager and stairway has been asked for
  const LEVELS = [1, 2, 3, 4, 5];
  await p.evaluate((LEVELS) => {
    window.__props = {}; window.__npcs = new Map(); window.__rigs = new Map();
    const _ps = propSprite; propSprite = function (name, build, size, yaw = 0) { window.__props[name] = build; const sp = _ps(name, build, size, yaw); sp.__named = true; return sp; };
    const _rr = renderRig; renderRig = function (rig, ...a) { const sp = _rr(rig, ...a); sp.__rig0 = rig; return sp; };
    const note = () => { for (const n of npcs) window.__npcs.set(RP.keyOf(n.fam, n.look), [n.fam, JSON.parse(JSON.stringify(n.look)), n.role || n.fam]);
      for (const pr of [...props, LV.stairs, LV.down]) { const sp = pr && pr.sp; if (sp && sp.__rig0 && !sp.__named && !sp.__hash) { sp.__hash = RD.hash(sp.__rig0); if (!window.__rigs.has(sp.__hash)) window.__rigs.set(sp.__hash, RD.finish(RD.build('rig_' + sp.__hash, [{ clip: 'idle', t: 0, rig: sp.__rig0 }], { low: true, raw: true }))); } } };
    newHero('warrior'); G.mode = 'play';
    for (const L of LEVELS) for (const seed of [1000 + L * 37, 77 + L, 4242 + L * 5]) {
      try { startLevel(L, seed); note(); } catch (e) { console.log('level ' + L + ': ' + e); continue; }
      if (seed === 1000 + L * 37) for (const side of ['den', 'tower', 'barrow', 'cellar']) { try { enterSide(side); if (G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); } note(); if (side === 'barrow') { try { climbSide(); if (G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); } note(); } catch (e) { /* no second floor from here */ } } } catch (e) { /* not from this area */ } try { startLevel(L, seed); } catch (e) { /* ignore */ } }
    }
    for (const lib of [PROPS, typeof OUT !== 'undefined' ? OUT : {}]) for (const k in lib) if (typeof lib[k] === 'function')
      for (const args of [[], [0], [1], [2], [3], [4], [5], [true], [false], [true, 'b'], [true, 'f'], [false, 'b'], [false, 'f']]) { try { lib[k](...args); } catch (e) { /* not its arguments */ } }
  }, LEVELS);

  if (what.includes('chars')) {
    const list = await p.evaluate(() => { const out = []; for (const id in MONSTERS) out.push([MONSTERS[id].family, MONSTERS[id].look, id]); for (const v of window.__npcs.values()) out.push(v);
      for (const fam of ['chicken', 'sheep', 'pig']) if (FAMILIES[fam]) out.push([fam, {}, fam]); return out; });
    let n = 0;
    for (const [fam, look, label] of list) {
      const m = await p.evaluate(([fam, look]) => RP.model(fam, look), [fam, look]).catch(e => { console.log('FAILED', label, String(e).slice(0, 200)); return null; });
      if (!m) continue; m.label = label; save(m); M.chars[m.key] = m.name; n++;
    }
    const rigs = await p.evaluate(() => [...window.__rigs.entries()]);
    for (const [h, m] of rigs) { m.label = 'stairs'; save(m); M.rigs[h] = m.name; }
    console.log(`chars: ${n} characters, ${rigs.length} stairs/doorways`);
  }
  if (what.includes('props')) {
    const names = await p.evaluate(() => Object.keys(window.__props)); let n = 0;
    for (const name of names) { const m = await p.evaluate(name => RD.prop(name, window.__props[name]), name).catch(() => null); if (!m || name.includes('undefined')) continue; m.label = name; save(m); M.props[name] = m.name; n++; }
    console.log(`props: ${n}`);
  }
  if (what.includes('heroes')) {
    for (const cls of ['warrior', 'mage', 'ranger']) {
      M.heroes[cls] = {};
      for (const team of ['red']) {   // (the blue team colour is not built yet: it shows as red)
        const t0 = Date.now(), O = await p.evaluate(cls => RP.heroOptions(cls), cls), base = Object.assign({}, O.base, { team });
        const pieces = look => p.evaluate(([cls, look]) => RP.heroPieces(cls, look), [cls, look]);
        const T = M.heroes[cls][team] = { base: { helm: base.helm, chest: base.chest, weapon: base.weapon, shield: base.shield }, ctx: {}, body: {}, helm: {} };
        // 1. every weapon with every shield: which ways of moving exist, and the weapon and shield-arm pieces themselves
        const stances = new Map(), reps = [];
        for (const w of O.weapon) for (const s of O.shield) {
          const P = await pieces(Object.assign({}, base, { weapon: w, shield: s })); if (!P.body) continue;
          const { name, ...rest } = P.body, h = crypto.createHash('sha1').update(JSON.stringify(rest)).digest('hex');
          if (!stances.has(h)) { stances.set(h, reps.length); reps.push([w, s]); }
          T.ctx[w + '|' + s] = [stances.get(h), P.weapon ? byContent(P.weapon, 'hw') : null, P.shield ? byContent(P.shield, 'hs') : null];
        }
        // 2. each armour and each helm in each way of moving
        for (let k = 0; k < reps.length; k++) {
          const [w, s] = reps[k];
          for (const c of O.chest) { const P = await pieces(Object.assign({}, base, { weapon: w, shield: s, chest: c })); (T.body[c] = T.body[c] || [])[k] = P.body ? byContent(P.body, 'hb') : null; }
          for (const h of O.helm) { const P = await pieces(Object.assign({}, base, { weapon: w, shield: s, helm: h })); (T.helm[h] = T.helm[h] || [])[k] = P.helm ? byContent(P.helm, 'hh') : null; }
        }
        console.log(`heroes: ${cls} ${team}: ${reps.length} ways of moving, ${O.chest.length} armours, ${O.helm.length} helms, ${O.weapon.length} weapons, ${O.shield.length} shields, ${Math.round((Date.now() - t0) / 1000)} s`);
        fs.writeFileSync(mf, JSON.stringify(M));
      }
    }
  }
  // forget timelines of files that no longer exist
  for (const f in M.tl) if (!fs.existsSync(path.join(OUT, f + '.json'))) delete M.tl[f];
  fs.writeFileSync(mf, JSON.stringify(M));
  console.log('files:', fs.readdirSync(OUT).length - 1);
  await b.close();
})();
