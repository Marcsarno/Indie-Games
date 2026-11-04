// Example 4: a helm look for the hero. draw(r, P) runs where the helm is drawn and replaces the
// whole head (so draw the face or a closed helm). P has: hd (head center), fwd, up, sideR (the
// head's axes: forward, up, the hero's right), helmF (a frame for ell/box along those axes), eq, st, J.
ART.gear({
  slot: 'helm', id: 'winged_helm', name: 'WINGED HELM',
  draw: (r, P) => {
    const { hd, fwd, up, sideR, helmF } = P;
    const hc = V.mad(hd, up, 0.5);
    r.ell(hc, [5.6, 5.4, 6.8], M.STEEL, helmF, { mf: p => {
      const q = V.sub(p, hc), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up);
      if (f2 > 2.6 && Math.abs(z2) < 0.8 && s2 < 3.6) return M.DARK;   // eye slit
      if (Math.abs(z2 - 3) < 0.6) return M.GOLD;                       // gold band
      return 0;
    } });
    for (const s of [-1, 1]) {   // a white wing on each side, three feathers fanning up and back
      for (let k = 0; k < 3; k++) {
        const base = V.add(V.mad(hc, up, 2 + k * 0.8), V.mul(sideR, s * 5));
        const tip = V.add(V.add(V.mad(base, up, 6 - k), V.mul(sideR, s * (3 + k))), V.mul(fwd, -2 - k * 1.5));
        r.cone(base, tip, 1.4 - k * 0.2, 0.4, M.CLOTH_WHITE);
      }
    }
  },
});
