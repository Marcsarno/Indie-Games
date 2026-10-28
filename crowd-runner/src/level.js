// Level data. z runs negative (forward). All distances in metres.
export const ROAD_HALF = 2.5;          // road is 5 wide: about six soldiers across
export const START_SQUAD = 3;

// kind: add | mul | fire | sub        color: good (green) | up (blue) | bad (red)
const G = (kind, v, label, color) => ({ kind, v, label, color });

export const LEVEL = {
  length: 300,
  gates: [
    { z: -26, left: G('add', 10, 'SOLDIERS', 'good'), right: G('fire', 2, 'FIRE RATE', 'up') },
    { z: -92, left: G('sub', 12, 'SOLDIERS', 'bad'), right: G('add', 15, 'SOLDIERS', 'good') },
    { z: -150, left: G('mul', 2, 'SOLDIERS', 'good'), right: G('fire', 2, 'FIRE RATE', 'up') },
    { z: -208, left: G('add', 25, 'SOLDIERS', 'good'), right: G('sub', 20, 'SOLDIERS', 'bad') },
  ],
  // waves spawn when the squad gets within SPAWN_AHEAD of `z`; n zombies in a loose block `depth` deep
  waves: [
    { z: -50, n: 6, hp: 2 },
    { z: -68, n: 10, hp: 2 },
    { z: -112, n: 16, hp: 3 },
    { z: -128, n: 20, hp: 3 },
    { z: -172, n: 30, hp: 4 },
    { z: -190, n: 36, hp: 4 },
    { z: -228, n: 44, hp: 5 },
  ],
  // weapon pedestal on the road; a crate barricade in front must be shot down before you can reach it
  pickups: [{ z: -112, x: -1.6, weapon: 'minigun', price: 50, barricadeHp: 60 }],
  boss: { z: -262, hp: 4800 },
};
export const SPAWN_AHEAD = 62;
