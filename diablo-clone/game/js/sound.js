'use strict';
// Sound effects: recordings the user picked (round 44, sfx/, from free packs: sfx/CREDITS.md),
// with the Web Audio synth recipes below as the fallback while they load, for the sounds kept as
// they were, and when OPTIONS > SOUND is SYNTH. Audio starts on the first tap, as phones require.
// Music: the user's own songs in music/ (round 39b, 40b).

const SFX = { ctx: null, out: null, noise: null, muted: false, last: {}, synth: false, vk: 1 };
try { SFX.muted = localStorage.getItem('dcg-mute') === '1'; SFX.synth = localStorage.getItem('dcg-sfx') === 'synth'; } catch (e) { /* storage unavailable */ }
// round 44: the recorded sounds: each name -> how many takes (sfx/<name>.mp3, sfx/<name>_2.mp3, ...),
// one picked at random per play with a little pitch change so repeats don't grate
const SAMPLES = {"swing": 2, "heavySwing": 1, "hit": 2, "crit": 1, "kill": 2, "block": 1, "clank": 1, "crack": 1, "chain": 1, "twang": 1, "thunk": 2, "missile": 1, "fireball": 1, "boom": 1, "meteor": 1, "frost": 1, "blink": 1, "squeal": 1, "yelp": 1, "hiss": 1, "clatter": 2, "growl": 1, "cry": 1, "splat": 1, "hurt": 1, "death": 1, "step": 4, "potion": 1, "levelUp": 1, "gold": 3, "clink": 1, "chest": 1, "portal": 1, "zap": 1, "barrel": 1};   // (round 58: the missile hit and the barrel are recordings now)
// round 67: set from measured loudness (tools/sfx/loudness.cjs + balance.py): each sound as loud as its
// role through a phone speaker, so the bass-heavy blows (boom, crack, the weight thud) are heard on a phone
const SAMPLE_GAIN = {boom: 1.12, meteor: 1.37, crit: 1.16, kill: 0.77, crack: 1.5, death: 0.65, levelUp: 0.96, hurt: 0.39, cry: 1.16, hit: 0.71, block: 0.42, clank: 0.37, chain: 0.62, barrel: 0.63, thunk: 0.51, zap: 0.47, fireball: 1.12, frost: 0.61, blink: 0.47, missile: 0.85, swing: 0.71, heavySwing: 1.08, twang: 0.75, growl: 0.51, squeal: 0.71, yelp: 0.7, hiss: 0.59, clatter: 1.16, splat: 1.08, portal: 0.99, chest: 1.5, clink: 0.92, gold: 0.57, potion: 0.73, step: 0.26};
const SYNTH_GAIN = {whoomp: 2.5, thud: 1.6, bolt: 0.99, boltHit: 1.78, sizzle: 0.33, arrow: 0.89, stairs: 1.68, streak: 1.46, pickup: 1.27, tap: 1.11, crackle: 0.98};   // (the sounds with no recording)   // (boom, portal and thud held back so headphones don't boom: full-range no louder than -6 dB)
const SBUF = {};
function loadSamples() {
  if (SFX.loading || !SFX.ctx) return; SFX.loading = true;
  for (const k in SAMPLES) for (let i = 0; i < SAMPLES[k]; i++) {
    fetch('sfx/' + k + (i ? '_' + (i + 1) : '') + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(b => new Promise((ok, no) => SFX.ctx.decodeAudioData(b, ok, no))).then(buf => { (SBUF[k] = SBUF[k] || []).push(buf); }).catch(() => { /* this one stays synthesized */ });
  }
}
function playSample(name, v) {
  const L = SBUF[name]; if (!L || !L.length || SFX.synth) return false;
  const c = SFX.ctx, s = c.createBufferSource(), g = c.createGain();
  s.buffer = L[Math.floor(Math.random() * L.length)]; s.playbackRate.value = 1 + (Math.random() * 2 - 1) * (name === 'levelUp' || name === 'death' ? 0 : 0.06);
  g.gain.value = (SAMPLE_GAIN[name] ?? 0.6) * v; s.connect(g); g.connect(SFX.out); s.start();
  return true;
}
function setSynthSfx(on) { SFX.synth = on; try { localStorage.setItem('dcg-sfx', on ? 'synth' : 'rec'); } catch (e) { /* ignore */ } }

function audioInit() {
  if (SFX.ctx) { if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); musicUnlock(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { SFX.ctx = new AC(); } catch (e) { return; }
  const c = SFX.ctx, comp = c.createDynamicsCompressor();
  SFX.out = c.createGain(); SFX.out.gain.value = 0.9;
  SFX.out.connect(comp); comp.connect(c.destination);
  SFX.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = SFX.noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  musicUnlock(); loadSamples();
}
// ---------------------------------------------------------------- music (round 39b, 40b)
// The user's songs: the forest song in forest areas and Act I's west woods; three songs cut from
// their live recording (applause removed) for the camp and towns, the dungeon floors, and the boss
// halls and side areas. Two audio elements take turns so one song fades out while the next fades
// in; both are unlocked on the first tap (phones only let an element play after a tap), and a song
// is only downloaded when it is first wanted. They run through gain nodes on the audio context
// (phones ignore an element's own volume) and follow the mute button. A song that fades out is
// remembered where it was, so coming back picks it up there.
// Round 46: two more recordings. The 13-minute live set (song3.m4a, no applause) is cut at its
// breaks: set1 (0:12-2:12), title (2:13-5:45, the character screen only), set2 (5:45-10:54) and
// set3 (10:54-end); the 3-minute song (song4.m4a) is `enter`, the first thing heard on going down
// into a dungeon. Each place has a playlist: a song plays to its end, then the next one (the set's
// parts alternate with the forest song in forests and with the camp song in towns).
const MUSIC = { forest: 'music/forest.mp3', camp: 'music/camp.mp3', dungeon: 'music/dungeon.mp3', lair: 'music/lair.mp3',
  title: 'music/title.mp3', enter: 'music/enter.mp3', set1: 'music/set1.mp3', set2: 'music/set2.mp3', set3: 'music/set3.mp3' }, MUSIC_VOL = 0.5;
// (round 53 tried the title song in the camp and woods too; the user wants it on the title screens only)
const PLAYLISTS = { title: ['title'], forest: ['forest', 'set1', 'forest', 'set2', 'forest', 'set3'], camp: ['camp', 'set2', 'camp', 'set3', 'camp', 'set1'],
  dungeon: ['enter', 'dungeon'], lair: ['lair'] };
const MUS = { decks: [], cur: null, inWoods: false, pos: {}, duck: 1, idx: {}, place: null };
// round 45: the song keeps playing under the dialogue, the bag and the skills screen, 40% quieter
const MUSIC_MODES = { play: 1, talk: 0.6, inv: 0.6, skills: 0.6, title: 1, end: 0.8, cine: 1, ways: 0.6, shop: 0.6, smith: 0.6 };   // (round 96: Dave's table keeps the title song; the waystone map and the shops dip like the bag)
// round 46b: the two players exist from page load, the first already downloading the title song,
// so the first tap on the character screen can start it at once (inside the tap, which phones allow)
function musicPrep() {
  if (MUS.els || (typeof window !== 'undefined' && window.__PREVIEW) || typeof Audio === 'undefined') return;
  try {
    MUS.els = [new Audio(), new Audio()];
    for (const el of MUS.els) { el.loop = false; el.preload = 'none'; }
    MUS.els[0].preload = 'auto'; MUS.els[0].src = MUSIC.title; MUS.preTrack = 'title';
  } catch (e) { MUS.els = null; }
}
musicPrep();
function musicUnlock() {
  if (!SFX.ctx || MUS.unlocked) return;
  MUS.unlocked = true;
  for (let k = 0; k < 2; k++) {
    try {
      const el = (MUS.els && MUS.els[k]) || new Audio(); el.loop = false; if (!MUS.els) el.preload = 'none';
      const src = SFX.ctx.createMediaElementSource(el), g = SFX.ctx.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(SFX.ctx.destination);
      const pre = k === 0 && MUS.els && G.mode === 'title' ? MUS.preTrack : null;   // (already holds the title song)
      if (k === 0 && MUS.els && !pre) { el.removeAttribute('src'); el.preload = 'none'; }
      const d = { el, g, v: 0, track: pre, playing: !!pre }; MUS.decks.push(d);
      el.addEventListener('ended', () => musicEnded(d));
      const p = el.play(); if (p && p.catch) p.catch(() => { /* no source yet: the tap still unlocks it */ });
    } catch (e) { /* music is optional */ }
  }
}
// a song finished: the place's playlist moves on (a one-song list starts it again)
function musicEnded(d) {
  MUS.pos[d.track] = 0;
  const L = PLAYLISTS[MUS.place];
  if (!L || L[(MUS.idx[MUS.place] || 0) % L.length] !== d.track) { d.playing = false; return; }
  MUS.idx[MUS.place] = ((MUS.idx[MUS.place] || 0) + 1) % L.length;
  if (L.length === 1 || L[MUS.idx[MUS.place]] === d.track) { try { d.el.currentTime = 0; d.el.play().catch(() => {}); } catch (e) { /* ignore */ } }
  else { d.playing = false; d.v = 0; d.g.gain.value = 0; }   // (the next song fades in on the other deck)
}
// which place's music is wanted: title, forest, camp, dungeon or lair
function musicPlace() {
  if (SFX.muted || !MUSIC_MODES[G.mode]) return null;
  if (G.mode === 'title' || G.mode === 'cine') return 'title';   // round 96: Dave's table is one theme, from the splash through the opening and every quest told there
  if (typeof LV === 'undefined' || !LV.area) return null;
  if (LV.area === 'forest' && !LV.side) return 'forest';
  if (LV.arena) return 'lair';   // (round 53: the side caves, the den, the cellar, the barrow and the tower, are dungeons now: the entering song first, not the boss music)
  if (LV.area === 'dungeon') return 'dungeon';
  if (LV.hub && typeof HUB !== 'undefined') {   // Act I's west woods, with a margin so walking the edge doesn't flip it
    const d = Math.hypot(hero.fi - HUB.camp[0], hero.fj - HUB.camp[1]);   // round 48c: out of the camp is the woods
    MUS.inWoods = d > HUB.wallR + (MUS.inWoods ? 3 : 5);
    if (MUS.inWoods) return 'forest';
  }
  return 'camp';
}
function musicWanted() {
  const place = musicPlace();
  if (place !== MUS.place) {
    if (place === 'dungeon' && MUS.place !== 'lair') { MUS.idx.dungeon = 0; MUS.pos.enter = 0; }   // going down from above: the entering song first, from its start
    if (place) MUS.place = place;
  }
  if (!place) return null;
  const L = PLAYLISTS[place]; return L[(MUS.idx[place] || 0) % L.length];
}
function updateMusic(dt) {
  if (!MUS.unlocked || !MUS.decks.length) return;
  const want = musicWanted(), duck = MUSIC_MODES[G.mode] || 1;
  MUS.duck += (duck - MUS.duck) * Math.min(1, dt * 4);   // dip and come back smoothly
  let on = MUS.decks.find(d => d.track === want && want);
  if (want && !on) {   // start the wanted song on the quieter deck
    on = MUS.decks.slice().sort((a, b) => a.v - b.v)[0];
    if (on.track && on.playing) { MUS.pos[on.track] = on.el.currentTime; }
    on.track = want; on.el.src = MUSIC[want]; on.v = 0; on.playing = false;
    const at = MUS.pos[want] || 0;
    if (at) on.el.addEventListener('loadedmetadata', () => { try { on.el.currentTime = at; } catch (e) { /* ignore */ } }, { once: true });
  }
  for (const d of MUS.decks) {
    const up = d === on;
    d.v = up ? Math.min(1, d.v + dt / (d.track === 'title' ? 0.5 : 2)) : Math.max(0, d.v - dt / 1.5);   // (the title song comes up fast)
    if (up && !d.playing && !d.el.ended) { d.playing = true; const p = d.el.play(); if (p && p.catch) p.catch(() => { d.playing = false; }); }
    if (!up && d.playing && d.v <= 0) { d.playing = false; d.el.pause(); if (d.track) MUS.pos[d.track] = d.el.currentTime; }
    d.g.gain.value = d.v * d.v * MUSIC_VOL * MUS.duck;   // an eased fade
  }
}
function setMuted(m) { SFX.muted = m; try { localStorage.setItem('dcg-mute', m ? '1' : '0'); } catch (e) { /* ignore */ } }

// a pitched blip: oscillator gliding f0 -> f1 with a fast attack and exponential decay
function tone(type, f0, f1, dur, gain, delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  gain = Math.min(1, gain * 2.2) * SFX.vk;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.02);
}
// a burst of filtered noise, the filter sweeping f0 -> f1
function noise(dur, gain, type, f0, f1, q = 1, delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  gain = Math.min(3, gain * (type === 'lowpass' ? 2.5 : 6)) * SFX.vk;   // band/high-passed noise loses most of its energy
  s.buffer = SFX.noise; s.playbackRate.value = 0.7 + Math.random() * 0.6;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(SFX.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const vary = (f, k = 0.06) => f * (1 + (Math.random() * 2 - 1) * k);   // small pitch variation per play
const RECIPES = {
  thud: (v = 1) => { tone('sine', vary(120), 40, 0.16, 0.42 * v); noise(0.07, 0.16 * v, 'lowpass', 500, 120); noise(0.06, 0.26 * v, 'bandpass', vary(650), 260, 1.2); },   // round 62: the weight under a blow (HEAVY) (round 67: a knock a phone can play)
  swing: () => noise(0.13, 0.42, 'bandpass', 700, 2400, 0.9),
  heavySwing: () => noise(0.2, 0.48, 'bandpass', 400, 1600, 0.9),
  hit: () => { tone('sine', vary(190), 60, 0.1, 0.6); noise(0.05, 0.3, 'lowpass', 2500, 600); },
  kill: () => { tone('sine', vary(150), 40, 0.24, 0.7); noise(0.14, 0.32, 'lowpass', 1200, 200); },
  hurt: () => { tone('square', vary(230), 110, 0.13, 0.12); tone('sine', 100, 50, 0.14, 0.45); },
  block: () => { tone('triangle', vary(950), 760, 0.09, 0.22); tone('triangle', 1420, 1300, 0.07, 0.1, 0.01); },
  gold: () => { tone('sine', vary(1320, 0.03), 1320, 0.08, 0.18); tone('sine', vary(1760, 0.03), 1760, 0.12, 0.16, 0.06); },
  pickup: () => tone('triangle', 520, 800, 0.1, 0.22),
  potion: () => { tone('sine', 300, 620, 0.16, 0.22); tone('sine', 420, 840, 0.16, 0.16, 0.1); },
  chest: () => { tone('triangle', 160, 230, 0.18, 0.18); tone('sine', 660, 660, 0.1, 0.12, 0.18); tone('sine', 880, 880, 0.14, 0.12, 0.26); },
  barrel: () => { noise(0.16, 0.45, 'lowpass', 1400, 300); tone('sine', 130, 70, 0.12, 0.35); },
  bolt: () => { tone('sawtooth', 280, 900, 0.16, 0.14); noise(0.18, 0.3, 'bandpass', 1500, 3500, 1.2); },
  boltHit: () => { noise(0.2, 0.3, 'lowpass', 2000, 300); tone('sine', 220, 80, 0.15, 0.3); },
  arrow: () => noise(0.09, 0.4, 'bandpass', 2600, 3800, 1.5),
  fireball: () => { noise(0.22, 0.18, 'lowpass', 600, 1500); tone('sine', 120, 180, 0.2, 0.15); },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.18, i * 0.08)),
  portal: () => [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f * 1.5, 0.25, 0.1, i * 0.06)),
  stairs: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.2, 0.18, i * 0.13)),
  death: () => { tone('sawtooth', 200, 45, 0.9, 0.14); tone('sine', 110, 40, 0.9, 0.35); },
  cry: () => { tone('sawtooth', 140, 110, 0.5, 0.12); tone('sawtooth', 210, 160, 0.45, 0.08, 0.02); noise(0.3, 0.2, 'lowpass', 900, 300); },
  crit: () => { tone('sine', 120, 40, 0.18, 0.6); noise(0.08, 0.35, 'lowpass', 3000, 500); tone('triangle', 1500, 1200, 0.1, 0.12, 0.02); },
  streak: n => { const f = 440 * Math.pow(2, Math.min(12, (n - 3) * 2) / 12); tone('triangle', f, f, 0.12, 0.16); tone('triangle', f * 1.5, f * 1.5, 0.16, 0.14, 0.07); },
  tap: () => tone('square', 820, 820, 0.04, 0.2),
  // mage spells (round 18): a blip, a boom, an icy hiss, a falling whistle
  missile: () => { tone('sine', vary(880), 520, 0.09, 0.16); noise(0.06, 0.1, 'bandpass', 3000, 1500, 2); },
  boom: () => { tone('sine', vary(110), 35, 0.4, 0.8); noise(0.45, 0.5, 'lowpass', 1400, 120); },
  frost: () => { noise(0.35, 0.28, 'highpass', 5000, 2000, 0.8); tone('triangle', 1600, 900, 0.25, 0.12); },
  blink: () => { tone('sine', 400, 1400, 0.12, 0.14); noise(0.15, 0.12, 'bandpass', 1500, 4000, 1.5); },
  meteor: () => { tone('sine', 1100, 260, 0.8, 0.12); noise(0.8, 0.14, 'bandpass', 600, 2400, 0.8); },
  // round 27: impact layers, so each skill has its own sound on top of the shared boom
  crack: () => { noise(0.09, 0.5, 'highpass', 2200, 900, 0.7); tone('square', vary(90), 45, 0.12, 0.2); noise(0.25, 0.25, 'lowpass', 900, 150, 1, 0.04); },
  sizzle: () => noise(0.4, 0.22, 'highpass', 6000, 2500, 0.6),
  clank: () => { tone('triangle', vary(1240), 980, 0.12, 0.2); tone('square', vary(310), 240, 0.06, 0.12); noise(0.05, 0.3, 'bandpass', 4000, 2500, 2); },
  chain: () => { for (let k = 0; k < 5; k++) noise(0.025, 0.28, 'bandpass', vary(3800, 0.15), 2600, 3, k * 0.035); },
  clink: () => { tone('sine', vary(2400), 2200, 0.1, 0.1); tone('sine', vary(3100), 3000, 0.08, 0.08, 0.03); },
  zap: () => { tone('square', vary(1300), 400, 0.05, 0.08); noise(0.04, 0.16, 'highpass', 5000, 3000, 1); },
  whoomp: () => { tone('sine', 220, 70, 0.16, 0.35); noise(0.12, 0.2, 'lowpass', 1600, 300); noise(0.1, 0.08, 'bandpass', 900, 400, 1); },
  squeal: () => { tone('square', vary(900), 300, 0.12, 0.07); tone('sawtooth', vary(600), 200, 0.1, 0.05, 0.03); },   // round 37: death cries
  yelp: () => { tone('triangle', vary(1300), 500, 0.14, 0.12); tone('triangle', vary(900), 300, 0.08, 0.08, 0.1); },
  hiss: () => noise(0.22, 0.12, 'highpass', 4000, 2500, 1),
  clatter: () => { for (let k = 0; k < 4; k++) tone('square', vary(700 + k * 150), 300, 0.03, 0.06, k * 0.04); noise(0.08, 0.15, 'bandpass', 2000, 900, 2); },
  splat: () => { noise(0.14, 0.32, 'lowpass', 1400, 300); tone('sine', 140, 60, 0.12, 0.2); },
  growl: () => { tone('sawtooth', vary(110), 80, 0.12, 0.05); noise(0.1, 0.06, 'lowpass', 500, 200); },   // round 34: a monster winding up
  twang: () => { tone('triangle', vary(190), 120, 0.05, 0.16); noise(0.05, 0.22, 'bandpass', vary(2600), 1600, 2); },   // round 33: the bowstring
  thunk: () => { noise(0.05, 0.3, 'lowpass', 900, 300); tone('sine', vary(320), 160, 0.05, 0.12); },   // an arrow biting
  step: v => noise(0.04, 0.07 * v, 'lowpass', vary(LV && LV.outdoor ? 520 : 760), 220),   // round 40a: a soft footfall
  crackle: v => noise(0.02 + Math.random() * 0.03, 0.03 * v, 'highpass', 2500, 1500, 0.7),
};
function sfx(name, v = 1) {
  if (SFX.muted || !SFX.ctx || SFX.ctx.state !== 'running') return;
  const now = SFX.ctx.currentTime;
  if (SFX.last[name] && now - SFX.last[name] < 0.045) return;   // many hits on one frame play once
  SFX.last[name] = now;
  try { if (!playSample(name, v)) { SFX.vk = SYNTH_GAIN[name] ?? 1; RECIPES[name](v); } } catch (e) { /* audio is optional */ } SFX.vk = 1;
}
// a faint fire crackle that swells near visible torches and braziers
let crackleT = 0;
function ambience(dt) {
  if (SFX.muted || !SFX.ctx) return;
  crackleT -= dt; if (crackleT > 0) return;
  crackleT = 0.08 + Math.random() * 0.35;
  let best = 0;
  for (const f of fires) {
    if (LV.vis[f.tile] < 0.2) continue;
    const [hx, hy] = iso(hero.fi, hero.fj), d = Math.hypot(f.wx - hx, (f.wy - hy) * 2);
    best = Math.max(best, 1 - d / 160);
  }
  if (best > 0) RECIPES.crackle(best);
}
