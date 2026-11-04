// Example 3: a prop. build(r) adds shapes for one object; it is drawn once and lit by the game.
// size = sprite box [width, height, anchorX, anchorY]; footprint = how many tiles it blocks.
// One tile is about 22.6 units across. yaw turns it (radians).
ART.prop({
  id: 'stone_lantern',
  size: [40, 56, 20, 46],
  footprint: [1, 1],
  yaw: 0.6,
  build: r => {
    r.box([0, 0, 1.5], [7, 7, 1.5], M.STONE);                       // base slab
    r.cyl([0, 0, 3], [0, 0, 18], 3, M.STONE, { mf: p => Math.abs(p[2] - 10) < 0.6 ? M.ROCK : 0 });   // post with a carved ring
    r.box([0, 0, 21], [5, 5, 3], M.STONE, null, { mf: p => Math.abs(p[2] - 21) < 1.6 && (Math.abs(p[0]) > 4.4 || Math.abs(p[1]) > 4.4) ? M.LAMP : 0 });   // the lamp box, glowing windows
    r.cone([0, 0, 24], [0, 0, 31], 8, 0.6, M.ROCK);                 // a pointed roof
  },
});
