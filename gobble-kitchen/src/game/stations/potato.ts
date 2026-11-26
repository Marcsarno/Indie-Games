// Mashed Potatoes: peel (8 strips pop off) -> mash (chunks squish into a fluffy mound) -> butter swirl.
import * as THREE from 'three';
import { Station } from '../station';
import { meshOf, part } from '../../core/assets';
import { clock, tween, wait, ease, Spring, lerp, clamp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { DragInfo } from '../../core/input';
import type { Game } from '../game';

const STRIPS = 8;
const CHUNKS = 7;

export class PotatoStation extends Station {
  doneVoice = 'potato_done';
  servingColor = 0xfbedbe;
  private morph = new Spring(0, 5, 0.4);
  private spin = new Spring(0, 2.2, 0.55);
  private mashMesh: THREE.Mesh;
  private chunkRest: { y: number }[] = [];
  private hoverBob = false;
  private unsub: (() => void) | null = null;

  constructor(game: Game) {
    super(game, 'potato', 'potato');
    const st = this.stage;
    this.mashMesh = meshOf(this.it('food_mash'));
    st.hide(this.it('food_mash'));
    st.hide(this.it('butter_pool'));
    this.it('peel_curl').visible = false;
    for (let i = 0; i < CHUNKS; i++) {
      this.chunkRest.push({ y: this.it('chunk_' + i).position.y });
      st.hide(this.it('chunk_' + i));
    }
    st.shadow(this.it('potato'), 0.19, this.top);
    st.shadow(this.it('bowl'), 0.3, this.top);
    st.shadow(this.it('masher'), 0.1, this.top);
    st.shadow(this.it('food_butter'), 0.08, this.top);
    this.unsub = clock.onFrame((dt) => this.frame(dt));
  }

  dish() {
    return this.it('bowl');
  }

  private frame(dt: number) {
    const m = clamp(this.morph.step(dt), 0, 1.25);
    if (this.mashMesh.morphTargetInfluences) this.mashMesh.morphTargetInfluences[0] = m;
    this.it('food_mash').rotation.y = this.spin.step(dt);
    if (this.hoverBob) this.it('masher').position.y += Math.sin(clock.time * 3.2) * 0.0009;
  }

  async recipe() {
    await this.peel();
    await this.mash();
    await this.butter();
    await this.stir();
  }

  // ------------------------------------------------------------------ 1. peel
  private async peel() {
    const st = this.stage;
    const potato = this.it('potato'), roll = this.it('potato_roll');
    let peeled = 0, travel = 0, lastStrip = 0, finished = false;
    // the four strips facing the player come off first (the flesh shows more with every tap),
    // then the potato flips over with a hop and the other four follow
    const order = [2, 3, 1, 4, 6, 7, 5, 0];
    const peelOne = () => {
      if (peeled >= STRIPS || finished) return;
      const strip = this.it('peel_' + order[peeled]);
      const wp = this.worldOf(strip);
      st.pop(strip, 0);
      audio.shhk(peeled);
      st.squash(potato, -2.6);
      this.fx.burst('crumb', wp, { count: 4, color: [0xb58350, 0x8f6238], floor: this.top });
      this.spawnCurl(wp, peeled);
      peeled++;
      if (peeled === 4) {
        const from = roll.rotation.x, y0 = potato.position.y;
        audio.boing(1.2);
        this.gobbles.bounce(2);
        tween(0.34, (q, raw) => {
          roll.rotation.x = lerp(from, from - Math.PI, q);
          potato.position.y = y0 + Math.sin(raw * Math.PI) * 0.16;
        }, ease.inOut).then(() => st.squash(potato, -4));
      } else {
        const from = roll.rotation.x, to = from + (peeled % 2 ? 0.12 : -0.12);
        tween(0.16, (q) => (roll.rotation.x = lerp(from, to, q)), ease.outBack);
      }
      if (peeled >= STRIPS) {
        finished = true;
        this.next();
      }
    };
    await this.step({
      voice: 'potato_peel',
      target: () => potato,
      demo: 'swipe',
      tap: { potato: peelOne },
      drag: {
        potato: (d: DragInfo) => {
          // swipe along it: strips come off under the finger
          travel += Math.hypot(d.dx, d.dy);
          if (travel > 55 && clock.real - lastStrip > 0.11) {
            travel = 0;
            lastStrip = clock.real;
            peelOne();
          }
        },
      },
    });
    // final squash-pop and sparkle, then the potato hops into the bowl
    st.squash(potato, 5);
    audio.sparkle();
    audio.note(8, 0.25);
    this.fx.burst('spark', this.worldOf(roll), { count: 10, color: [0xffd27a, 0xffffff, 0xf6d58e] });
    clock.hitStop(0.06);
    this.gobbles.cheer();
    await wait(0.45);
    const bowl = this.it('bowl');
    audio.whoosh();
    await arcTo(potato, new THREE.Vector3(bowl.position.x, 0.24, bowl.position.z), 0.42, 0.42, { spin: new THREE.Vector3(0, 0, -5) });
    st.pop(potato, 0);
    st.dropShadow(potato);
    audio.thud();
    audio.glorp(1);
    st.squash(bowl, -4);
    this.fx.burst('puff', this.world(new THREE.Vector3(bowl.position.x, 0.3, bowl.position.z)), { count: 9, color: 0xfffaf0, size: 0.11 });
    st.pop(this.it('food_mash'), 1, 0.01);
    for (let i = 0; i < CHUNKS; i++) {
      await wait(0.045);
      st.pop(this.it('chunk_' + i), 1, 0.01);
      audio.pop(0.9 + i * 0.08, 0.16);
    }
    await wait(0.35);
  }

  /** A curly ribbon tumbles onto the counter and stays there for the session (persistent mess). */
  private spawnCurl(from: THREE.Vector3, i: number) {
    const curl = part('potato', 'peel_curl');
    this.root.add(curl);
    curl.position.copy(this.root.worldToLocal(from.clone()));
    const board = this.it('board').position;
    const a = rand(0.35, 2.8);
    const land = new THREE.Vector3(board.x + Math.cos(a) * rand(0.22, 0.44), 0.035, board.z + Math.sin(a) * rand(0.27, 0.4));
    this.stage.pop(curl, 1, 0.3);
    curl.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    arcTo(curl, land, 0.3, 0.4, { spin: new THREE.Vector3(rand(3, 6), rand(-4, 4), rand(2, 5)), e: ease.linear }).then(() => {
      curl.rotation.set(Math.PI / 2 + rand(-0.2, 0.2), rand(0, 6), 0);
      this.stage.squash(curl, -3);
      audio.tone({ freq: 700 + i * 30, to: 420, dur: 0.04, vol: 0.06, type: 'triangle' });
    });
  }

  // ------------------------------------------------------------------ 2. mash
  private async mash() {
    const st = this.stage;
    const masher = this.it('masher'), bowl = this.it('bowl');
    const rest = { pos: masher.position.clone(), quat: masher.quaternion.clone() };
    const hover = this.at('socket_tool');
    audio.whoosh();
    await arcTo(masher, hover, 0.25, 0.5, { quat: new THREE.Quaternion() });
    st.squash(masher, 3);
    this.hoverBob = true;
    let p = 0, taps = 0, token = 0, acc = 0, last = 0, finished = false;
    const slam = async () => {
      if (finished) return;
      const my = ++token;
      taps++;
      const before = p;
      p = Math.min(1, p + 0.15);
      this.hoverBob = false;
      const y0 = masher.position.y, down = hover.y - 0.12 - 0.07 * p;
      await tween(0.07, (q) => (masher.position.y = lerp(y0, down, q)), ease.in);
      // impact
      this.morph.target = p;
      this.morph.kick(1.6);
      st.squash(bowl, -3.2);
      st.squash(masher, -4);
      audio.squelch(taps - 1);
      if (taps === 1) this.gobbles.flinch();
      for (let i = 0; i < CHUNKS; i++) {
        const c = this.it('chunk_' + i);
        const gone = p >= 0.3 + i * 0.09;
        if (gone && c.visible && c.scale.y > 0.05) {
          st.pop(c, 0);
          this.fx.burst('crumb', this.worldOf(c), { count: 3, color: 0xf5e3a6, floor: this.top });
        } else if (!gone) {
          st.squash(c, -4);
          c.position.y = this.chunkRest[i].y - 0.03 * p;
        }
      }
      const at = this.world(new THREE.Vector3(bowl.position.x, 0.34, bowl.position.z));
      for (const m of [0.25, 0.5, 1]) {
        if (before < m && p >= m - 1e-6) {
          this.fx.burst('puff', at, { count: m === 1 ? 10 : 5, color: 0xfffaf0, size: 0.09 });
          this.fx.burst('crumb', at, { count: 5, color: 0xfbedbe, floor: this.top });
        }
      }
      if (p >= 1 && !finished) {
        finished = true;
        clock.hitStop(0.07);
        audio.sparkle();
        this.fx.burst('spark', at, { count: 12, color: [0xffd27a, 0xffffff] });
      }
      if (my !== token) return;
      await tween(0.16, (q) => (masher.position.y = lerp(down, hover.y, q)), ease.outBack);
      if (my === token) this.hoverBob = true;
      if (finished) this.next();
    };
    const mashDrag = (d: DragInfo) => {
      // up-and-down drag: every downward stroke is one mash
      if (d.dy > 0) acc += d.dy;
      else if (d.dy < -2) acc = 0;
      if (acc > 34 && clock.real - last > 0.15) {
        acc = 0;
        last = clock.real;
        slam();
      }
    };
    await this.step({
      voice: 'potato_mash',
      target: () => masher,
      demo: 'updown',
      tap: { masher: slam, bowl: slam },
      drag: { masher: mashDrag, bowl: mashDrag },
    });
    this.hoverBob = false;
    this.gobbles.cheer();
    await arcTo(masher, rest.pos, 0.3, 0.5, { quat: rest.quat });
    st.squash(masher, -2);
    audio.clink(0.8);
  }

  // ------------------------------------------------------------------ 3a. butter in
  private async butter() {
    const st = this.stage;
    const butter = this.it('food_butter'), bowl = this.it('bowl');
    const home = butter.position.clone();
    const onTop = new THREE.Vector3(bowl.position.x + 0.01, 0.125 + 0.165, bowl.position.z);
    let flying = false, dragging = false;
    const drop = async () => {
      if (flying) return;
      flying = true;
      audio.pop(1.2);
      await arcTo(butter, onTop, 0.3, 0.42, { spin: new THREE.Vector3(0, 3, 0) });
      st.squash(butter, -5);
      st.squash(bowl, -2);
      audio.glorp(2);
      this.fx.burst('puff', this.worldOf(butter), { count: 4, color: 0xfffaf0, size: 0.06 });
      st.dropShadow(butter);
      this.next();
    };
    await this.step({
      voice: 'potato_butter',
      target: () => butter,
      demo: 'tap',
      tap: {
        butter: () => {
          st.squash(butter, 3);
          // a tap sends it; a drag (below) lets the player carry it
          wait(0.16).then(() => {
            if (!dragging) drop();
          });
        },
        bowl: () => {
          drop();
        },
      },
      drag: {
        butter: (d) => {
          if (flying) return;
          dragging = true;
          if (d.phase === 'move') {
            const p = st.input.pointOnPlane(d.x, d.y, this.top + 0.22);
            if (p) butter.position.copy(this.root.worldToLocal(p));
          } else {
            // magnetic drop zone: 1.5x the bowl; a miss floats back with a boing
            const dist = Math.hypot(butter.position.x - bowl.position.x, butter.position.z - bowl.position.z);
            if (dist < 0.27 * 1.5) drop();
            else {
              audio.boing();
              arcTo(butter, home, 0.2, 0.4).then(() => st.squash(butter, -3));
              dragging = false;
            }
          }
        },
      },
    });
    await wait(0.2);
  }

  // ------------------------------------------------------------------ 3b. stir
  private async stir() {
    const st = this.stage;
    const spoon = this.it('spoon'), bowl = this.it('bowl'), butter = this.it('food_butter'), pool = this.it('butter_pool');
    const rest = { pos: spoon.position.clone(), quat: spoon.quaternion.clone() };
    const centre = new THREE.Vector3(bowl.position.x, 0.56, bowl.position.z);
    const R = 0.1;
    const tilt = (a: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28));
    const spot = (a: number) => new THREE.Vector3(centre.x + Math.sin(a) * R, centre.y, centre.z + Math.cos(a) * R);
    let angle = 0.6;
    audio.whoosh();
    await arcTo(spoon, spot(angle), 0.25, 0.5, { quat: tilt(angle) });
    st.setBaseScale(pool, 0.3);
    const mashMat = this.mashMesh.material as THREE.MeshToonMaterial;
    const c0 = mashMat.color.clone(), c1 = new THREE.Color(1.0, 0.93, 0.7);
    let stirs = 0, busy = false, finished = false, acc = 0, lastA: number | null = null;
    const NEED = 5;
    const stirOnce = async () => {
      if (finished) return;
      stirs++;
      const k = stirs / NEED;
      audio.noise({ freq: 600, to: 1500, dur: 0.3, vol: 0.12, q: 0.9, attack: 0.08 });
      audio.note(stirs - 1, 0.2);
      this.spin.target += 2.1;
      st.setBaseScale(butter, Math.max(0.0, 1 - k * 1.1));
      st.squash(butter, -2);
      if (stirs === 1) st.pop(pool, 1, 0.01);
      st.setBaseScale(pool, lerp(0.3, 1.0, k));
      mashMat.color.copy(c0).lerp(c1, k);
      if (stirs === 3) this.fx.burst('puff', this.world(new THREE.Vector3(centre.x, 0.4, centre.z)), { count: 4, color: 0xfffaf0, size: 0.08 });
      if (stirs >= NEED) finished = true;
      if (!busy) {
        busy = true;
        const a0 = angle;
        angle += Math.PI * 2;
        await tween(0.42, (q) => {
          const a = lerp(a0, angle, q);
          spoon.position.copy(spot(a));
          spoon.quaternion.copy(tilt(a));
        }, ease.inOut);
        busy = false;
      }
      if (finished) this.next();
    };
    const circle = (d: DragInfo) => {
      // circle-drag: add up the angle swept round the bowl on screen
      const c = st.input.screenOf(this.world(new THREE.Vector3(bowl.position.x, 0.25, bowl.position.z)));
      const a = Math.atan2(d.y - c.y, d.x - c.x);
      if (d.phase === 'end') {
        lastA = null;
        return;
      }
      if (lastA !== null) {
        let da = a - lastA;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        acc += Math.abs(da);
        if (acc > 4.6) {
          acc = 0;
          stirOnce();
        }
      }
      lastA = a;
    };
    await this.step({
      voice: 'potato_stir',
      target: () => bowl,
      demo: 'circle',
      tap: { bowl: stirOnce, butter: stirOnce },
      drag: { bowl: circle, butter: circle },
    });
    // glossy, steaming, done
    st.pop(butter, 0);
    clock.hitStop(0.08);
    const at = this.world(new THREE.Vector3(centre.x, 0.4, centre.z));
    this.fx.burst('puff', at, { count: 10, color: 0xfffaf0, size: 0.1, up: 0.6 });
    this.fx.burst('spark', at, { count: 12, color: [0xffd27a, 0xffffff, 0xf6d58e] });
    audio.steam();
    audio.sparkle();
    await arcTo(spoon, rest.pos, 0.3, 0.45, { quat: rest.quat });
    audio.clink(0.9);
    // let the last wobble settle, then freeze the dish
    wait(2).then(() => {
      this.unsub?.();
      this.unsub = null;
    });
  }
}
