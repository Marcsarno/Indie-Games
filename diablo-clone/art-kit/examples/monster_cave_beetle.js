// Example 2: a monster with a body of its own (a new family). rig(look, st) builds one pose from
// primitives; st.clip is 'idle' (st.f 0-3), 'walk' (0-7), 'attack' (st.f = key index, st.key =
// the key), 'hit' (0) or 'death' (0-5). Local space: +x forward, +y its right, +z up, 1 unit ~ 1 px.
ART.monster({
  id: 'cave_beetle',
  name: 'CAVE BEETLE',
  newFamily: {
    size: [64, 48, 32, 36],   // sprite box in pixels: width, height, then where its feet are
    // the attack: rear back (a: wind-up amount), lunge, the bite (hit), recover. ms = how long each key lasts
    swing: [{ a: 1, ms: 260, tele: true }, { a: 0.4, ms: 80, mv: 0.5 }, { a: 0, ms: 60, hit: true }, { a: 0.3, ms: 240, open: true }],
    rig: (look, st) => {
      const r = new Rig(), { clip, f } = st;
      let bob = 0, lift = 0, tip = 0, legPh = 0, dead = 0;
      if (clip === 'idle') bob = [0, -0.3, -0.5, -0.3][f % 4];
      if (clip === 'walk') { legPh = f / 8 * Math.PI * 2; bob = Math.abs(Math.sin(legPh)) * 0.6; }
      if (clip === 'attack') { lift = st.key.a * 3; tip = -st.key.a * 0.25; }
      if (clip === 'hit') tip = -0.2;
      if (clip === 'death') dead = Math.min(1, (f + 1) / 4);
      const z = 6 + bob - dead * 3;
      // six legs, alternating tripods while walking
      for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
        const x = 4 - k * 4, ph = Math.sin(legPh + (k % 2 ? 0 : Math.PI) + (s > 0 ? Math.PI : 0)) * 1.6 * (clip === 'walk' ? 1 : 0);
        const hip = [x, s * 4, z - 1], foot = [x + ph + (dead ? 2 : 0), s * (9 + dead * 2), dead ? z : 0.5];
        r.cone(hip, foot, 1.1, 0.7, M.CHITIN);
      }
      // the shell: one mass of two halves with a seam down the middle, lit from the upper left by the renderer
      const shell = [-1, 0, z + 2 + lift * 0.3];
      r.group(() => {
        r.ell(shell, [9, 7, 5], M.CHITIN, null, { mf: p => Math.abs(p[1]) < 0.5 && p[2] > shell[2] ? M.DARK : 0 });
        r.ell([7, 0, z + 1 + lift], [4, 4, 3.4], M.CHITIN);   // the head
      });
      // a horn that rises with the wind-up, and two glowing eyes
      r.cone([9.5, 0, z + 2 + lift], [14 + tip * 4, 0, z + 7 + lift * 1.6], 1.6, 0.3, M.HORN);
      for (const s of [-1, 1]) r.sph([10, s * 2.4, z + 2 + lift], 0.8, M.EYE_GRN, { noShadow: true });
      return r;
    },
  },
  stats: { hp: 20, dmg: [3, 6], speed: 34, reach: 1.3, xp: 18, chest: 12, shadow: 10, pack: true },
});
