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
  return { poses, model, keyOf, fileOf };
})();
