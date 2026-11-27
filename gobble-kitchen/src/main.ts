import './ui/style.css';
import { Stage } from './core/stage';
import { loadAll } from './core/assets';
import { clock } from './core/tween';
import { audio } from './core/audio';
import { Hud } from './ui/hud';
import { Game } from './game/game';

const container = document.getElementById('game')!;
const stage = new Stage(container);
const hud = new Hud(container);
let game: Game | null = null;

const params = new URLSearchParams(location.search);
if (params.get('ratio')) {
  (stage as any).maxRatio = parseFloat(params.get('ratio')!);
  stage.keepShadows = true;
}

function newGame() {
  game?.dispose();
  clock.clear();
  stage.resetWorld();
  game = new Game(stage, hud);
  (window as any).__game = game;
  return game;
}

hud.onPlay = () => {
  hud.showGame();
  game?.start();
};
hud.onHome = () => game?.goHome();
hud.onAgain = () => {
  audio.pop(1.2);
  hud.showAgain(false);
  hud.hidePhoto();
  newGame().start(true);
};

let last = performance.now();
function loop(now: number) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game) game.update(clock.dt, realDt);
  stage.frame(realDt);
  requestAnimationFrame(loop);
}

loadAll((k) => hud.progress(k))
  .then(() => {
    newGame();
    hud.ready();
    stage.resize();
    requestAnimationFrame(loop);
  })
  .catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;inset:0;margin:0;padding:16px;background:#fff4e0;color:#3b2630;z-index:99;white-space:pre-wrap">Could not load the kitchen: ${String(e?.message ?? e)}</pre>`);
  });

// keep audio alive: if the browser suspended it (app switch, screen lock), any finished tap wakes it again
for (const ev of ['pointerup', 'touchend', 'click']) window.addEventListener(ev, () => audio.resume(), { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
});

// test hooks for the headless play scripts
(window as any).__stage = stage;
(window as any).__clock = clock;
(window as any).__audio = audio;
