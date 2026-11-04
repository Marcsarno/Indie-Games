// Example 6: a chest look, drawn over the torso. P has the body joints J (J.chest, J.shR, J.shL,
// J.pelvis, J.head ...), the axes fwd, up, sideR, the torso frame tf, and bulk (how thick the
// armor under it is). Here: big steel shoulder plates with gold rims over a tunic.
ART.gear({
  slot: 'chest', id: 'pauldron_tunic', name: 'PAULDRONED TUNIC',
  draw: (r, P) => {
    const { J, up, sideR, fwd } = P;
    for (const [sh, s] of [[J.shR, 1], [J.shL, -1]]) {
      const c = V.add(V.mad(sh, up, 1.2), V.mul(sideR, s * 0.8));
      r.ell(c, [3.6, 3.2, 2.4], M.STEEL, frameAlong(fwd, V.norm(V.add(up, V.mul(sideR, s * 0.5)))), { mf: p => V.dot(V.sub(p, c), up) < -1.2 ? M.GOLD : 0 });
    }
  },
});
