import { loadModels } from './assets.js';
import { Game } from './game.js';
import { View } from './view.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

const game = new Game();
let view = null;
let renderTime = 0;

// ---------------------------------------------------------------------------------- HUD
const hud = { squad: -1, coins: -1 };
function pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function updateHud() {
  if (hud.squad !== game.squad.n) { hud.squad = game.squad.n; $('squadN').textContent = hud.squad; pop($('squad')); }
  if (hud.coins !== game.coins) { hud.coins = game.coins; $('coinN').textContent = hud.coins; pop($('coins')); }
  const b = game.boss;
  $('bossbar').style.display = b && !b.dead ? 'block' : 'none';
  if (b) $('bossbar').firstElementChild.style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
}
function floater(f) {
  const p = view.project(f.x, f.y, f.z);
  if (p.behind) return;
  const el = document.createElement('div');
  el.className = 'fl ' + f.cls; el.textContent = f.text;
  el.style.left = p.px + '%'; el.style.top = p.py + '%';
  $('floaters').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ---------------------------------------------------------------------------------- screens
function showOverlay(title, text, btn, btn2) {
  $('ovTitle').textContent = title; $('ovText').textContent = text; $('ovBtn').textContent = btn;
  $('ovBtn2').style.display = btn2 ? '' : 'none'; if (btn2) $('ovBtn2').textContent = btn2;
  $('overlay').classList.add('show');
}
const hideOverlay = () => $('overlay').classList.remove('show');

function begin(bot = null) {
  game.reset(); game.botMode = bot; hud.squad = hud.coins = -1;
  $('fail').style.display = 'none'; $('hint').style.opacity = bot ? 0 : 1;
  $('floaters').innerHTML = '';
  hideOverlay(); game.start();
}
$('ovBtn').onclick = () => begin();
$('ovBtn2').onclick = () => begin('fail');

function onEnd(win) {
  if (win) setTimeout(() => showOverlay('VICTORY!', `The brute is down. ${game.kills} zombies stopped, ${game.squad.n} soldiers left, ${game.coins} coins.`, 'Play again'), 900);
  else {
    $('fail').style.display = 'block';
    setTimeout(() => showOverlay('SQUAD DOWN', 'The horde got through. Pick the green gates, shoot the crates, save your numbers for the brute.', 'Try again'), 1100);
  }
}

// ---------------------------------------------------------------------------------- input
const frame = $('frame');
let drag = null;
frame.addEventListener('pointerdown', e => {
  if ($('overlay').classList.contains('show')) return;
  drag = { x: e.clientX, t: game.squad.targetX };
  $('hint').style.opacity = 0;
  frame.setPointerCapture(e.pointerId);
});
frame.addEventListener('pointermove', e => {
  if (!drag || game.botMode) return;
  game.squad.targetX = drag.t + ((e.clientX - drag.x) / frame.clientWidth) * 9.5;
});
const endDrag = () => { drag = null; };
frame.addEventListener('pointerup', endDrag); frame.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') game.squad.targetX -= 0.9;
  if (e.key === 'ArrowRight' || e.key === 'd') game.squad.targetX += 0.9;
});

// ---------------------------------------------------------------------------------- loop
function step(dt) {
  const was = game.state;
  game.update(dt);
  renderTime += dt;
  const evs = game.events.splice(0);
  for (const e of evs) if (e.type === 'end') onEnd(e.win);
  for (const f of view.consume(evs)) floater(f);
  view.updateFx(dt);
  updateHud();
  return was;
}
let last = performance.now();
function frameLoop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  step(dt);
  view.render(dt, renderTime);
  requestAnimationFrame(frameLoop);
}

(async function init() {
  const models = await loadModels();
  view = new View($('c'), models, game);
  addEventListener('resize', () => view.resize());
  new ResizeObserver(() => view.resize()).observe($('frame'));
  updateHud();
  view.render(0, 0);

  // handles for headless tests: ?manual=1 skips the rAF loop and lets a test call advance()
  window.__crowd = {
    game, view,
    advance(seconds, dt = 1 / 60) { for (let t = 0; t < seconds; t += dt) step(dt); view.render(dt, renderTime); },
    begin,
  };
  if (params.get('bot')) begin(params.get('bot'));
  else showOverlay('SQUAD RUSH', 'Drag to steer your squad. Run through the right gates, shoot the horde and the crates, and take down the brute.', 'Play');
  if (!params.get('manual')) requestAnimationFrame(frameLoop);
  window.__ready = true;
})();
