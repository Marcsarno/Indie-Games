'use strict';
// rigposes.js: every pose of a character (each clip, each frame), for the exporter. Needs the game's scripts + rigdump.js.
const RP = (() => {
  const FIXED = { idle: 4, death: 6 };
  const HERO_CLIPS = ['attack', 'attack2', 'attack3', 'attack4', 'hit', 'death', 'go', 'stop', 'bash', 'channel', 'shoot', 'volley', 'skyshot', 'cast', 'hook', 'spin', 'drink', 'fidget', 'vault', 'toss', 'pivot', 'skid', 'arrive', 'storm'];
  const MON_CLIPS = ['attack', 'shoot', 'cast', 'hit', 'death'];
  function poses(fam, look, clipsWanted) {
    const F = FAMILIES[fam], ent = { fam, look }, out = [];
    const rigAt = (clip, f) => { try { const r = F.rig(look, poseState(fam, ent, clip, f)); return r && r.p.length ? r : null; } catch (e) { return null; } };
    const push = (clip, t, rig) => out.push({ clip, t, rig });
    for (let f = 0; f < 4; f++) { const r = rigAt('idle', f); if (r) push('idle', f, r); }
    for (let f = 0; f < 8; f += 0.5) { const r = rigAt('walk', f); if (r) push('walk', f, r); }
    for (const clip of clipsWanted || (fam === 'hero' ? HERO_CLIPS : MON_CLIPS)) {
      const got = []; let prev = null;
      for (let f = 0; f < (FIXED[clip] || 16); f++) {
        const r = rigAt(clip, f); if (!r) break;
        const h = RD.hash(r) + ':' + r.p.length; got.push([f, r, h]); prev = h;
      }
      while (got.length > 1 && got[got.length - 1][2] === got[got.length - 2][2]) got.pop();   // a clip that ignores the frame number is one pose
      if (clip !== 'death' && clip !== 'hit' && got.length === 1 && out.length && RD.hash(out[0].rig) === RD.hash(got[0][1]) ) continue;   // the idle pose again: the clip doesn't exist for this character
      for (const [f, r] of got) push(clip, f, r);
    }
    return out;
  }
  const keyOf = (fam, look) => { const { tint, scale, ...base } = look; return fam + '|' + (fam === 'hero' ? heroKey(base) : lookKey(base)); };
  const fileOf = key => { let h = 2166136261 >>> 0; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return key.split('|')[0] + '_' + ('0000000' + h.toString(16)).slice(-8); };
  function model(fam, look, name, clipsWanted) { const { tint, scale, ...base } = look; const ps = poses(fam, base, clipsWanted); const m = RD.build(name || fileOf(keyOf(fam, look)), ps, { loops: { idle: 4, walk: 8, storm: 4 } }); m.key = keyOf(fam, look); return m; }
  const LOOPS = { idle: 4, walk: 8, storm: 4 };
  // the whole character with the working fields kept (for splitting into pieces)
  function full(fam, look) { const { tint, scale, ...base } = look; return RD.build('x', poses(fam, base), { loops: LOOPS, raw: true }); }
  // ---- the hero in pieces. A hero = a body (by armour), a head (by helm), a weapon and a shield arm, each built on its own.
  // A piece's parts are the ones that change when only that slot changes; how a piece moves can depend on the weapon and shield
  // in hand (the swing, the guard), so pieces are built per "stance" = each different way the body moves.
  const clean = look => { const l = Object.assign({}, look); delete l.tint; delete l.scale; l.set = null; l.ench = null; l.lgd = null; return l; };
  function restSet(look) { const r = FAMILIES.hero.rig(look, poseState('hero', { fam: 'hero', look }, 'idle', 0)), s = new Set(); for (const q of r.p) s.add(RD.restSig(q)); return s; }
  const inter = sets => { let out = null; for (const s of sets) out = out === null ? new Set(s) : new Set([...out].filter(x => s.has(x))); return out || new Set(); };
  function heroOptions(cls) {
    newHero(cls); const base = clean(hero.look), opt = { helm: new Set(['none', base.helm]), chest: new Set([base.chest]), weapon: new Set([base.weapon]), shield: new Set(['none', base.shield]) };
    for (const id in ITEM_BASES) { const b = ITEM_BASES[id]; if (b.look && opt[b.slot] && (b.cls === cls || !b.cls)) opt[b.slot].add(b.look); }
    return { base, helm: [...opt.helm], chest: [...opt.chest], weapon: [...opt.weapon], shield: [...opt.shield] };
  }
  // the sets of resting parts that make up each slot's pieces, for one team colour
  function heroSlots(cls, team) {
    const O = heroOptions(cls), base = Object.assign({}, O.base, { team }), v = (slot, x) => Object.assign({}, base, { [slot]: x });
    const common = { helm: inter(O.helm.map(x => restSet(v('helm', x)))), weapon: inter(O.weapon.map(x => restSet(v('weapon', x)))), shield: inter(O.shield.map(x => restSet(v('shield', x)))) };
    const core = {};   // per armour: what stays whatever else is worn
    for (const c of O.chest) { const b = Object.assign({}, base, { chest: c }), w = (slot, x) => Object.assign({}, b, { [slot]: x }); core[c] = inter([...O.helm.map(x => restSet(w('helm', x))), ...O.weapon.map(x => restSet(w('weapon', x))), ...O.shield.map(x => restSet(w('shield', x)))]); }
    return { O, base, common, core };
  }
  // one whole hero look, cut into its four pieces (each a finished model, or null when the slot is empty)
  const COMMON = ['attack', 'attack2', 'attack3', 'attack4', 'hit', 'death', 'go', 'stop', 'drink', 'fidget', 'pivot', 'skid'];
  const CLASS_CLIPS = { warrior: [...COMMON, 'bash', 'hook', 'spin'], mage: [...COMMON, 'channel', 'cast', 'storm', 'arrive'], ranger: [...COMMON, 'shoot', 'volley', 'skyshot', 'vault', 'toss'] };
  const optCache = {};
  function heroPieces(cls, look0) {
    const O = optCache[cls] || (optCache[cls] = heroOptions(cls)), look = clean(look0), rest = restSet(look);
    const vary = slot => { const common = inter(O[slot].map(x => restSet(Object.assign({}, look, { [slot]: x })))); return new Set([...rest].filter(x => !common.has(x))); };
    const vW = vary('weapon'), vS = vary('shield'), vH = vary('helm'), M = RD.build('x', poses('hero', look, CLASS_CLIPS[cls]), { loops: LOOPS, raw: true });
    const slotOf = P => !P.inRest ? 'weapon' : vW.has(P.rsig) ? 'weapon' : vS.has(P.rsig) ? 'shield' : vH.has(P.rsig) ? 'helm' : 'body';
    const out = {}; for (const sl of ['body', 'helm', 'weapon', 'shield']) { const m = RD.subset(M, P => slotOf(P) === sl, sl); out[sl] = m.parts.length ? RD.finish(m) : null; }
    return out;
  }
  return { poses, model, keyOf, fileOf, full, heroOptions, heroSlots, heroPieces, restSet, clean, LOOPS };
})();
