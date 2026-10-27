'use strict';
// Shared foundations: palette, light tables, math, random numbers and the pixel font.
// Everything the game draws is generated in code; there are no image assets.

// ---------------------------------------------------------------- palette
// Every color sits on a dark-to-light ramp that leans cool in the darks and warm in the lights,
// and every ramp fades into the same near-black tail, so darkness reads as one cool shadow.
const PAL_HEX = [
  '000000',                                                             // 0  transparent
  '0a0706', '151013', '1d1619',                                         // 1-3   outline black + shared dark tail
  '1e171a', '2b2020', '41302a', '584130', '705437', '8a663d', 'a37a45', 'b98d50', 'cfa262', // 4-12 stone
  '4a1f0e', '8a3a12', 'c4601a', 'ec9a32', 'f8d16a', 'fff4c4',           // 13-18 fire
  '2c0a16', '4d0f1b', '781a1e', 'a8281f', 'd4473a',                     // 19-23 blood / cloth red
  '6f6670', 'a49a8a', 'd8ceb0', 'f6efdb',                               // 24-27 bone
  '262b37', '434e60', '6f7b8c', 'a3adba', 'dbe2e8',                     // 28-32 steel
  '351d16', '56331f', '7c502e', 'a26e3c',                               // 33-36 wood / leather
  '0d1640', '1d3592', '3b62d6', '8fb0ff',                               // 37-40 blue
  '291820', '45282b', '663a2f',                                         // 41-43 spider chitin
  '3a0f0c', '6e1c14', 'a0301f', 'cf5034',                               // 44-47 demon flesh
  '5c3610', 'a8781a', 'deae2a', 'f8de6a',                               // 48-51 gold
  '12261a', '24452a', '3f6e35', '78a84a',                               // 52-55 green (poison, set items)
  '25123a', '45206a', '7438a8', 'b070e0',                               // 56-59 purple (magic)
  '4a2a22', '7a4a36', 'b07a58', 'dcae86',                               // 60-63 skin
];
const NPAL = PAL_HEX.length;
const PR = new Uint8Array(NPAL), PG = new Uint8Array(NPAL), PB = new Uint8Array(NPAL);
const PAL32 = new Uint32Array(NPAL);
PAL_HEX.forEach((h, i) => {
  PR[i] = parseInt(h.slice(0, 2), 16); PG[i] = parseInt(h.slice(2, 4), 16); PB[i] = parseInt(h.slice(4, 6), 16);
  PAL32[i] = (255 << 24) | (PB[i] << 16) | (PG[i] << 8) | PR[i];
});
const lum = i => (0.299 * PR[i] + 0.587 * PG[i] + 0.114 * PB[i]) / 255;
const S = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const FIRE = [13, 14, 15, 16, 17, 18];
const RED = [19, 20, 21, 22, 23];
const BONE = [24, 25, 26, 27];
const STEEL = [28, 29, 30, 31, 32];
const WOOD = [33, 34, 35, 36];
const BLUE = [37, 38, 39, 40];
const CHITIN = [41, 42, 43];
const FLESH = [44, 45, 46, 47];
const GOLD = [48, 49, 50, 51];
const GREEN = [52, 53, 54, 55];
const PURPLE = [56, 57, 58, 59];
const SKIN = [60, 61, 62, 63];
const BLK = 1, K1 = 2, K2 = 3, EMIS = 128;

// Light tables (Diablo 1's method): lighting never mixes RGB. Level L maps each palette index to
// another index on its own ramp: below L_ID it steps ~1.8 colors down per level and on into the
// shared tail; above L_ID it steps up for torch-side over-exposure. Emissive pixels skip the tables.
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAIL = [1, 2, 3];
const PAL_RAMPS = [S, FIRE, RED, BONE, STEEL, WOOD, BLUE, CHITIN, FLESH, GOLD, GREEN, PURPLE, SKIN];
const LEVELS = 9, L_ID = 3, BANDS = 5;
const LTAB = Array.from({ length: LEVELS }, () => new Uint8Array(NPAL));
for (let i = 1; i < NPAL; i++) {
  const ramp = PAL_RAMPS.find(r => r.includes(i));
  const chain = ramp ? [...TAIL, ...ramp] : TAIL, pos = chain.indexOf(i);
  for (let L = 0; L < LEVELS; L++) {
    const np = L <= L_ID ? pos - Math.round((L_ID - L) * 1.8) : pos + Math.round((L - L_ID) * 0.4);
    LTAB[L][i] = pos === 0 ? 0 : chain[clamp(np, 1, chain.length - 1)];
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);

// ---------------------------------------------------------------- random
function hash(a, b, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  return r;
}

// ---------------------------------------------------------------- vectors ([x, y, z] arrays)
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  mad: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  rotZ: (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c, a[2]]; },
  rotY: (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0] * c + a[2] * s, a[1], -a[0] * s + a[2] * c]; },
  rotX: (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0], a[1] * c - a[2] * s, a[1] * s + a[2] * c]; },
};
// two-bone IK: joint position for a limb from root a to target t with bone lengths l1, l2,
// bending toward the pole direction
function ik(a, t, l1, l2, pole) {
  let d = V.sub(t, a), dl = V.len(d);
  const reach = (l1 + l2) * 0.999;
  if (dl > reach) { d = V.mul(d, reach / dl); dl = reach; }
  dl = Math.max(dl, Math.abs(l1 - l2) + 0.01);
  const dir = V.mul(d, 1 / dl);
  const x = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  let q = V.mad(pole, dir, -V.dot(pole, dir)); q = V.norm(q);
  return { joint: V.add(V.mad(a, dir, x), V.mul(q, h)), end: V.mad(a, dir, dl) };
}
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- pixel font (3x5)
const FONT = {};
(() => {
  const g = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010',
    9: '010101011001110', '+': '000010111010000', '-': '000000111000000', '%': '101001010100101', ':': '000010000010000',
    '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '/': '001001010100100', '(': '010100100100010',
    ')': '010001001001010', ' ': '000000000000000', '?': '110001010000010', "'": '010010000000000', '>': '100010001010100',
    '<': '001010100010001', '=': '000111000111000', '*': '000101010101000', '#': '101111101111101',
  };
  for (const k in g) FONT[k] = g[k];
})();
const textWidth = (s, z = 1) => s.length * 4 * z - z;
