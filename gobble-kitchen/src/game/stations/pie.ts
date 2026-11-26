// Pumpkin Pie: roll the dough flat, pour the filling, crimp twelve pinches round the rim, bake it in the
// oven (Gobbles panics into a disguise), then pipe whipped cream and drop a leaf on top.
import * as THREE from 'three';
import { Station } from '../station';
import { meshOf } from '../../core/assets';
import { clock, tween, wait, ease, Spring, lerp, clamp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo, moveTo } from '../../fx/motion';
import type { Game } from '../game';

const CRIMPS = 12, DOLLOPS = 8;

export class PieStation extends Station {
  doneVoice = 'pie_done';
  servingColor = 0xd8762b;
  private flat = new Spring(0, 5, 0.45);

  constructor(game: Game) {
    super(game, 'pie', 'pie');
    const st = this.stage;
    for (const n of ['pie_crust', 'pie_leaf']) st.hide(this.it(n));
    this.it('pie_fill').visible = false;
    for (let k = 0; k < CRIMPS; k++) st.hide(this.it('crimp_' + k));
    for (let k = 0; k < DOLLOPS; k++) st.hide(this.it('dollop_' + k));
    st.shadow(this.it('pie'), 0.32, this.top);
    st.shadow(this.it('pin'), 0.12, this.top);
    st.shadow(this.it('fill_bowl'), 0.17, this.top);
    st.shadow(this.it('cream_can'), 0.07, this.top);
    const doughMesh = meshOf(this.it('dough'));
    clock.onFrame((dt) => {
      if (doughMesh.morphTargetInfluences) doughMesh.morphTargetInfluences[0] = clamp(this.flat.step(dt), 0, 1.15);
    });
  }
  dish() {
    return this.it('pie');
  }
  voices() {
    return ['pie_fill', 'pie_crimp', 'pie_bake', 'pie_cream', 'pie_done'];
  }

  async recipe() {
    const st = this.stage;
    const pie = this.it('pie'), dough = this.it('dough'), pin = this.it('pin');

    // ---- 1. roll the dough
    const pinRest = pin.position.clone();
    const onDough = (k: number) => new THREE.Vector3(dough.position.x, lerp(0.3, 0.115, k), dough.position.z);
    await arcTo(pin, onDough(0), 0.2, 0.4);
    let rolls = 0;
    await this.tapStep({
      voice: 'pie_roll',
      target: () => pin,
      demo: 'swipe',
      hits: ['dough'],
      need: 5,
      gesture: 'sideways',
      act: async (i) => {
        rolls = i + 1;
        const k = rolls / 5, dir = i % 2 ? -1 : 1, base = onDough(k);
        this.flat.target = k;
        audio.rumble();
        audio.note(i, 0.18);
        const r0 = pin.rotation.z;
        await tween(0.3, (q) => {
          pin.position.set(base.x, base.y, base.z + dir * lerp(-0.2, 0.2, q));
          pin.rotation.x = r0 + dir * q * 5;
        }, ease.inOut);
        this.fx.burst('puff', this.worldOf(dough).add(new THREE.Vector3(0, 0.05, 0)), { count: 4, color: 0xffffff, size: 0.06, speed: 0.5, up: 0.2 });
      },
    });
    arcTo(pin, pinRest, 0.25, 0.45);
    this.gobbles.cheer();
    await wait(0.4);
    // the flat dough flops into the tin and becomes the crust
    audio.whoosh();
    await arcTo(dough, new THREE.Vector3(pie.position.x, 0.1, pie.position.z), 0.4, 0.5, { spin: new THREE.Vector3(0, Math.PI, 0) });
    st.hide(dough);
    st.pop(this.it('pie_crust'), 1, 0.4);
    st.squash(pie, -4);
    audio.thud();
    this.fx.burst('puff', this.worldOf(pie).add(new THREE.Vector3(0, 0.12, 0)), { count: 6, color: 0xffffff, size: 0.07 });
    await wait(0.3);

    // ---- 2. pour the filling
    const bowl = this.it('fill_bowl'), fill = this.it('pie_fill');
    const bowlRest = { pos: bowl.position.clone(), quat: bowl.quaternion.clone() };
    const pourAt = new THREE.Vector3(pie.position.x + 0.3, 0.42, pie.position.z - 0.05);
    const tilt = (a: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a));
    await arcTo(bowl, pourAt, 0.25, 0.45, { quat: tilt(0.5) });
    await this.tapStep({
      voice: 'pie_fill',
      target: () => bowl,
      hits: ['fillbowl', 'pie'],
      need: 3,
      act: async (i) => {
        const q0 = bowl.quaternion.clone();
        tween(0.2, (q) => bowl.quaternion.slerpQuaternions(q0, tilt(1.15 + 0.2 * i), q), ease.out);
        audio.glug(i);
        if (i === 0) {
          fill.visible = true;
          fill.scale.y = 0.05;
        }
        const from = this.world(new THREE.Vector3(pie.position.x + 0.12, 0.36, pie.position.z));
        for (let k = 0; k < 4; k++) wait(k * 0.07).then(() => this.fx.burst('blob', from, { count: 2, color: [0xd8762b, 0xe8833a], size: 0.045, speed: 0.15, up: 0, floor: this.top + 0.06, life: 0.5, bounce: 0 }));
        const y0 = fill.scale.y, y1 = (i + 1) / 3;
        await tween(0.45, (q) => (fill.scale.y = lerp(y0, y1, q)), ease.outBack);
        st.squash(pie, -2);
        const q1 = bowl.quaternion.clone();
        await tween(0.15, (q) => bowl.quaternion.slerpQuaternions(q1, tilt(0.5), q), ease.inOut);
      },
    });
    arcTo(bowl, bowlRest.pos, 0.25, 0.45, { quat: bowlRest.quat });
    await wait(0.35);

    // ---- 3. crimp the edge: twelve pinches chase each other round the rim
    await this.tapStep({
      voice: 'pie_crimp',
      target: () => pie,
      demo: 'circle',
      hits: ['pie'],
      need: CRIMPS,
      gate: false,
      gesture: 'circle',
      centre: () => this.worldOf(pie).add(new THREE.Vector3(0, 0.1, 0)),
      act: (i) => {
        const c = this.it('crimp_' + i);
        st.pop(c, 1, 0.01);
        audio.note(i, 0.2);
        audio.noise({ type: 'lowpass', freq: 900, dur: 0.06, vol: 0.12 });
        st.squash(pie, -1.2);
        if (i === CRIMPS - 1) {
          audio.sparkle();
          this.fx.burst('spark', this.worldOf(pie).add(new THREE.Vector3(0, 0.15, 0)), { count: 10, color: [0xffd27a, 0xffffff] });
        }
      },
    });
    this.gobbles.cheer();
    await wait(0.6);

    // ---- 4. bake: in it goes, the timer sweeps round to the green
    const oven = this.game.oven, k = this.game.kitchen;
    await oven.load(this, pie, 'pie_bake', ['pie']);
    await oven.closeAndWind(this, pie, ['pie']);
    const crust = meshOf(this.it('pie_crust')).material as THREE.MeshToonMaterial;
    const crimpMats = Array.from({ length: CRIMPS }, (_, i) => meshOf(this.it('crimp_' + i)).material as THREE.MeshToonMaterial);
    const fillMat = meshOf(fill).material as THREE.MeshToonMaterial;
    const golden = new THREE.Color(0.9, 0.62, 0.34), white = new THREE.Color(1, 1, 1), deep = new THREE.Color(0.86, 0.74, 0.62);
    let t = -0.36, lastTick = 0;
    this.game.ovenTap = () => {
      t += 0.1;   // tapping the oven hurries it along a little
      st.squash(k.n('oven_door'), -2);
      audio.tick();
      st.particles.burst('spark', k.socket('socket_oven'), { count: 3, size: 0.05, color: 0xffa24a });
    };
    await new Promise<void>((res) => {
      const stop = clock.onFrame((dt) => {
        t += dt / 3.4;
        k.setNeedle(Math.min(1, t));
        if (clock.time - lastTick > 0.4) {
          lastTick = clock.time;
          audio.tick();
        }
        if (t >= 1) {
          stop();
          res();
        }
      });
    });
    this.game.ovenTap = null;
    crust.color.copy(golden);
    crimpMats.forEach((m) => m.color.copy(golden));
    fillMat.color.copy(white).lerp(deep, 1);
    audio.ding();
    this.gobbles.gobble(3);
    await oven.openAndOut(this, pie, ['pie']);
    this.fx.burst('spark', this.worldOf(pie).add(new THREE.Vector3(0, 0.2, 0)), { count: 12, color: [0xffd27a, 0xffffff, 0xffa24a] });
    await wait(0.7);
    await oven.unload(this, pie, ['pie']);

    // ---- 5. whipped cream, then the leaf
    const can = this.it('cream_can');
    const canRest = { pos: can.position.clone(), quat: can.quaternion.clone() };
    const nozzleDown = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 2.6));
    const over = (i: number) => {
      const d = this.it('dollop_' + Math.min(i, DOLLOPS - 1)).position;
      return new THREE.Vector3(pie.position.x + d.x + 0.12, 0.42, pie.position.z + d.z);
    };
    await arcTo(can, over(0), 0.25, 0.45, { quat: nozzleDown });
    await this.tapStep({
      voice: 'pie_cream',
      target: () => can,
      hits: ['cream', 'pie'],
      need: DOLLOPS,
      gate: false,
      gesture: 'travel',
      act: async (i) => {
        moveTo(can, over(i), 0.1);
        st.squash(can, -3);
        audio.pssh();
        audio.note(i, 0.18);
        st.pop(this.it('dollop_' + i), 1, 0.01);
        if (i === 4) this.gobbles.bounce(3);
        await wait(0.12);
      },
    });
    arcTo(can, canRest.pos, 0.25, 0.45, { quat: canRest.quat });
    await wait(0.3);
    const leaf = this.it('pie_leaf');
    const home = leaf.position.clone();
    leaf.position.y = home.y + 0.6;
    st.pop(leaf, 1, 0.3);
    await tween(0.3, (q) => (leaf.position.y = lerp(home.y + 0.6, home.y, q)), ease.in);
    st.squash(leaf, -5);
    st.squash(pie, -2);
    audio.pop(1.3);
    audio.sparkle();
    this.fx.burst('spark', this.worldOf(pie).add(new THREE.Vector3(0, 0.25, 0)), { count: 12, color: [0xffd27a, 0xffffff, 0xe8833a] });
    void rand;
  }
}
