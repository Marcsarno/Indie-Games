// Example 5: a weapon look. draw(r, P) runs at the hand: P.g is the grip, P.bd the direction the
// weapon points, P.wide a direction across it, P.wf a frame [bd, wide, normal] for boxes. The game
// already draws a short leather grip and a pommel. swing: 'light' (quick sword swings) or 'heavy'
// (overhead chops). length: how far the tip is from the hand, for the swing smear.
ART.gear({
  slot: 'weapon', id: 'spear', name: 'SPEAR', swing: 'light', length: 24,
  draw: (r, P) => {
    const { g, bd, wf } = P;
    r.cone(V.mad(g, bd, -6), V.mad(g, bd, 20), 0.8, 0.8, M.WOOD);          // the shaft, past both ends of the hand
    r.box(V.mad(g, bd, 23), [3, 1.4, 0.4], M.BLADE, wf);                   // the leaf-shaped head
    r.cone(V.mad(g, bd, 26), V.mad(g, bd, 28.5), 1.2, 0.2, M.BLADE);
    r.cyl(V.mad(g, bd, 19.5), V.mad(g, bd, 20.5), 1.1, M.CLOTH_RED);      // a red binding under the head
  },
});
