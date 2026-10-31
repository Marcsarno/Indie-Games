import { C } from './config.js';
import { createSim } from './sim.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const SAVE_KEY = 'spooky-save-v1';
const save = Object.assign({ best: 0, candy: 0, outfit: 'witch', tilt: false, sound: true }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
if (qs.has('unlockall')) save.candy = 99999;
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const unlocked = (o) => save.candy >= o.need;

let sim = createSim((Math.random() * 1e9) | 0);
const canvas = $('c'), input = createInput();
audio.enabled = save.sound;
const R = await createRenderer(canvas, sim);
await R.loadOutfit(unlocked(C.outfits.find((o) => o.id === save.outfit)) ? save.outfit : 'witch');
let mode = 'title', acc = 0, last = performance.now(), runCandyStart = 0;

function closet(el) {
  el.innerHTML = '';
  for (const o of C.outfits) {
    const b = document.createElement('button'); const ok = unlocked(o);
    b.className = 'out' + (o.id === save.outfit ? ' sel' : '') + (ok ? '' : ' lock');
    b.innerHTML = `<span class="em">${ok ? o.emoji : '🔒'}</span><span class="nm">${ok ? o.name : o.need + ' 🍬'}</span>`;
    b.onclick = async () => { if (!ok) return; audio.unlock(); save.outfit = o.id; persist(); await R.loadOutfit(o.id); closet(el); };
    el.appendChild(b);
  }
  const next = C.outfits.find((o) => !unlocked(o));
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = next ? `<div class="fill" style="width:${Math.min(100, 100 * save.candy / next.need)}%"></div><span>${save.candy} / ${next.need} candy for ${next.name}</span>` : '<span>All outfits unlocked!</span>';
  el.appendChild(bar);
}
function show(id) { for (const x of ['title', 'over']) $(x).classList.toggle('on', x === id); $('hud').classList.toggle('on', id === null); }
function toTitle() { mode = 'title'; closet($('closet')); $('tiltBtn').textContent = input.tiltOn ? 'Tilt: ON' : 'Tilt: OFF'; show('title'); }
function newRun() {
  sim = createSim((Math.random() * 1e9) | 0); R.setSim(sim); runCandyStart = save.candy;
  if (input.tiltOn) input.calibrate();
  mode = 'play'; acc = 0; show(null); hud();
}
function hud() { $('h').textContent = Math.floor(sim.height) + ' m'; $('cd').textContent = sim.candy; }
function gameOver() {
  mode = 'over'; audio.over();
  const before = save.candy; save.candy += sim.candy; const newBest = sim.height > save.best; save.best = Math.max(save.best, Math.floor(sim.height)); persist();
  const won = C.outfits.filter((o) => o.need > before && o.need <= save.candy);
  $('score').textContent = Math.floor(sim.height) + ' m'; $('gcandy').textContent = '+' + sim.candy;
  $('best').textContent = (newBest ? 'NEW BEST! ' : 'Best ') + save.best + ' m';
  $('newout').textContent = won.length ? 'New outfit: ' + won.map((o) => o.emoji + ' ' + o.name).join(', ') + '!' : '';
  if (won.length) audio.unlock2(); closet($('closet2')); show('over');
}
$('play').onclick = () => { audio.unlock(); newRun(); };
$('again').onclick = () => { audio.unlock(); newRun(); };
$('menu').onclick = () => toTitle();
$('tiltBtn').onclick = async () => {
  audio.unlock();
  if (input.tiltOn) { input.tiltOn = false; save.tilt = false; } else { const ok = await input.enableTilt(); save.tilt = ok; if (!ok) alert('Tilt is not available here, using touch.'); }
  persist(); $('tiltBtn').textContent = input.tiltOn ? 'Tilt: ON' : 'Tilt: OFF';
};
$('sndBtn').onclick = () => { audio.unlock(); save.sound = !save.sound; audio.enabled = save.sound; $('sndBtn').textContent = save.sound ? '🔊' : '🔇'; persist(); };
$('sndBtn').textContent = save.sound ? '🔊' : '🔇';
if (save.tilt && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') input.enableTilt();

function handleEvents() {
  for (const e of sim.events) {
    if (e.t === 'bounce') (e.kind === 'tramp' ? audio.tramp : audio.bounce).call(audio);
    else if (e.t === 'candy') { audio.candy(); R.pop(e.x, e.y); }
    else if (e.t === 'rocket') audio.rocket();
    else if (e.t === 'rescue') audio.rescue();
    else if (e.t === 'over') gameOver();
  }
  sim.events.length = 0;
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === 'play') {
    acc += dt; let n = 0;
    while (acc >= C.step && n++ < 20) { sim.step(C.step, input.dir); acc -= C.step; if (sim.over) break; }
    handleEvents(); if (mode === 'play') hud();
  }
  R.frame(dt, mode === 'title' ? 'title' : 'play');
  requestAnimationFrame(loop);
}
toTitle(); requestAnimationFrame(loop);
// test hooks (same idea as city-clone)
window.__doodle = { get sim() { return sim; }, R, save, input, newRun, get mode() { return mode; }, stepFrames(n, dir = 0) { for (let i = 0; i < n; i++) sim.step(C.step, dir); handleEvents(); R.frame(0, 'play'); } };
