// Headless balance check (no browser): node tools/sim.mjs [runs]
import { Game } from '../src/game.js';

const runs = +process.argv[2] || 20;
function play(mode, noisy = 0) {
  const g = new Game();
  g.botMode = mode; if (mode === 'fail') g.setSquad(40); g.start();
  const dt = 1 / 60;
  let steps = 0;
  const log = {};
  while (g.state === 'play' && steps++ < 60 * 120) {
    g.update(dt);
    g.events.length = 0;
    // a "sloppy" player sometimes ignores the best gate
    if (noisy && Math.random() < noisy * dt) g.squad.targetX = (Math.random() - 0.5) * 5;
    const k = Math.floor(g.squad.z / -50);
    if (!(k in log)) log[k] = g.squad.n;
  }
  return { state: g.state, n: g.squad.n, t: +g.t.toFixed(1), coins: g.coins, weapon: g.squad.weapon, fire: g.squad.fire, boss: g.boss ? Math.round(g.boss.hp) : null, log };
}
for (const [label, mode, noisy] of [['good bot', 'good', 0], ['no gun', 'meh', 0], ['fail bot', 'fail', 0]]) {
  const res = Array.from({ length: runs }, () => play(mode, noisy));
  const wins = res.filter(r => r.state === 'win').length;
  const avg = k => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  console.log(`${label.padEnd(9)} wins ${wins}/${runs}  avg squad@end ${avg('n')}  avg time ${avg('t')}s  avg boss hp left ${avg('boss')}`);
  console.log('   sample', JSON.stringify(res[0]));
}
