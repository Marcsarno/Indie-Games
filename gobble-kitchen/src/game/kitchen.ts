// The room itself: sockets, camera poses, idle life (clock, cat tail, clouds, steam) and the
// "pointless delights": every one of them reacts when poked.
import * as THREE from 'three';
import { instantiate, node, meshOf, pal } from '../core/assets';
import { clock, tween, wait, ease, Spring, lerp, rand, pick } from '../core/tween';
import { audio } from '../core/audio';
import type { TapInfo } from '../core/input';
import type { Game } from './game';

export class Kitchen {
  root: THREE.Object3D;
  private pots: { o: THREE.Object3D; s: Spring }[] = [];
  private potTaps: { i: number; t: number }[] = [];
  private ovenOpen = false;
  private ovenBusy = false;
  private needleK = 0;
  private fridgeBusy = false;
  private catTaps = 0;
  private steamT = 0;
  private cloudX = 0;
  private skyMats: THREE.MeshBasicMaterial[] = [];
  private ovenMat: THREE.MeshBasicMaterial;
  private ovenGlow = 0;

  constructor(private game: Game) {
    const st = game.stage;
    this.root = instantiate('kitchen');
    st.scene.add(this.root);
    this.root.updateWorldMatrix(true, true);
    st.readPoses(this.root);
    const table = st.poses.get('table')!;
    st.poses.set('table_wide', { target: table.target.clone().add(new THREE.Vector3(0, 0.1, 0)), dir: table.dir.clone(), fitW: 6.2, fitH: 3.9 });
    // a closer look at the front door for the moment a guest says hello
    const door = this.socket('socket_door');
    st.poses.set('door', { target: door.clone().add(new THREE.Vector3(0.55, 0.75, 0.7)), dir: table.dir.clone(), fitW: 3.5, fitH: 2.5 });
    st.input.pokeMeshes = [this.root];
    for (let i = 0; i < 3; i++) this.pots.push({ o: this.n('pot_' + i), s: new Spring(0, 1.5, 0.07) });
    this.skyMats = [meshOf(this.n('window_sky')).material as THREE.MeshBasicMaterial, meshOf(this.n('door_outside')).material as THREE.MeshBasicMaterial];
    this.ovenMat = meshOf(this.n('oven_window')).material as THREE.MeshBasicMaterial;
    this.cloudX = this.n('window_cloud').position.x;
    this.setNeedle(0);
    const on = () => this.game.state !== 'title';
    const h = (tap: (t: TapInfo) => void) => ({ enabled: on, tap });
    st.input.add(this.root, {
      pot_0: h((t) => this.tapPot(0, t)),
      pot_1: h((t) => this.tapPot(1, t)),
      pot_2: h((t) => this.tapPot(2, t)),
      faucet: h((t) => this.tapFaucet()),
      oven: h((t) => this.tapOven(t)),
      fridge: h(() => this.tapFridge()),
      window: h((t) => this.tapWindow(t)),
      cat: h((t) => this.tapCat(t)),
      jar: h((t) => this.tapJar(t)),
    });
    st.input.onPoke = (p) => {
      if (!on()) return;
      audio.tok();
      if (p) st.particles.burst('puff', p, { count: 3, size: 0.05, color: 0xfff4e0, speed: 0.25, up: 0.25 });
    };
  }

  n(name: string) {
    return node(this.root, name);
  }
  /** World position of a socket empty. */
  socket(name: string) {
    return this.n(name).getWorldPosition(new THREE.Vector3());
  }
  socketYaw(name: string) {
    const q = this.n(name).getWorldQuaternion(new THREE.Quaternion());
    return new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
  }

  // ------------------------------------------------------------------ delights
  private tapPot(i: number, t: TapInfo) {
    const st = this.game.stage;
    this.pots[i].s.kick(i === 1 ? 3 : 4);
    audio.note([0, 2, 4][i], 0.3, 392);
    audio.clink(0.5 + i * 0.2);
    st.particles.burst('spark', t.point, { count: 3, size: 0.05, color: 0xffd27a });
    // secret: left, middle, right in a row plays a tune
    const now = clock.real;
    this.potTaps.push({ i, t: now });
    this.potTaps = this.potTaps.filter((p) => now - p.t < 2.5).slice(-3);
    if (this.potTaps.map((p) => p.i).join('') === '012') {
      this.potTaps = [];
      wait(0.25).then(() => {
        audio.fanfare();
        this.pots.forEach((p, k) => wait(k * 0.1).then(() => p.s.kick(5)));
        this.game.secret('pots_tune', t.point);
      });
    }
  }

  private tapFaucet() {
    const st = this.game.stage;
    const p = this.socket('socket_faucet');
    for (let k = 0; k < 4; k++) wait(k * 0.09).then(() => {
      audio.bubble();
      st.particles.burst('bubble', p, { count: 3, color: [0xcfeef0, 0xffffff, 0x9fd4cb], size: 0.07 });
    });
  }

  // ---- the oven as a cooking tool (used by the recipes through game/oven.ts)
  /** Swing the oven door: 0 closed .. 1 fully down (it becomes a shelf). */
  setOvenDoor(open: number, dur = 0.35) {
    const door = this.n('oven_door');
    const from = door.rotation.x, to = open * 1.5;
    this.ovenOpen = open > 0.05;
    audio.creak();
    return tween(dur, (k) => (door.rotation.x = lerp(from, to, k)), open > 0 ? ease.outBack : ease.inOut).then(() => {
      if (open === 0) audio.thud();
    });
  }
  setOvenGlow(k: number, dur = 0.4) {
    const from = this.ovenGlow;
    return tween(dur, (q) => (this.ovenGlow = lerp(from, k, q)), ease.inOut);
  }
  /** Kitchen timer needle: 0 start, 1 = the green "done" zone, past 1.25 = extra crispy. */
  setNeedle(k: number) {
    this.needleK = k;
    this.n('timer_needle').rotation.z = lerp(2.1, -1.36, k);
  }
  get needle() {
    return this.needleK;
  }

  private async tapOven(t: TapInfo) {
    if (this.game.ovenTap) {
      this.game.ovenTap(t);
      return;
    }
    if (this.ovenBusy) return;
    this.ovenBusy = true;
    const door = this.n('oven_door');
    this.ovenOpen = !this.ovenOpen;
    const from = door.rotation.x, to = this.ovenOpen ? 1.3 : 0;
    const g0 = this.ovenGlow, g1 = this.ovenOpen ? 1 : 0;
    audio.creak();
    if (this.ovenOpen) {
      // every time the oven opens, Gobbles panics and grabs a disguise
      if (this.game.state !== 'dinner' && this.game.state !== 'done') {
        this.game.gobbles.panic().then((name) => {
          if (name) this.game.secret(name, this.game.gobbles.headWorld);
        });
      }
      this.game.stage.particles.burst('puff', this.socket('socket_oven'), { count: 5, color: 0xffd9a8, size: 0.12, dir: new THREE.Vector3(0, 0.2, 0.5) });
    }
    await tween(0.35, (k) => {
      door.rotation.x = lerp(from, to, k);
      this.ovenGlow = lerp(g0, g1, k);
    }, this.ovenOpen ? ease.outBack : ease.inOut);
    if (!this.ovenOpen) audio.thud();
    this.ovenBusy = false;
  }

  private async tapFridge() {
    if (this.fridgeBusy) return;
    this.fridgeBusy = true;
    const door = this.n('fridge_door');
    const st = this.game.stage;
    audio.pop(0.6);
    await tween(0.35, (k) => (door.rotation.y = -1.25 * k), ease.outBack);
    audio.brr();
    const p = door.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.5, 0.8, 0.2));
    st.particles.burst('puff', p, { count: 8, color: [0xe6f6ff, 0xffffff], size: 0.12, dir: new THREE.Vector3(0, -0.1, 0.5), spread: 0.25 });
    await wait(1.0);
    await tween(0.3, (k) => (door.rotation.y = -1.25 * (1 - k)), ease.in);
    audio.thud();
    st.squash(door, -1.5);
    this.fridgeBusy = false;
  }

  private weather = 0;
  private tapWindow(t: TapInfo) {
    const st = this.game.stage;
    const kind = this.weather++ % 3;
    audio.whoosh();
    const at = t.point.clone().add(new THREE.Vector3(0, 0.2, 0.15));
    if (kind === 0) st.particles.burst('leaf', at, { count: 12, color: [0xe8833a, 0xb23a48, 0xf6d58e, 0xd9772f], dir: new THREE.Vector3(0.4, 0.3, 1.0), spread: 0.6 });
    else if (kind === 1) {
      st.particles.burst('blob', at, { count: 14, color: [0x9fd4cb, 0xcfeef0], size: 0.03, speed: 0.6, up: 0.5, spread: 0.6, floor: 0.98, dir: new THREE.Vector3(0, 0, 0.8) });
      for (let k = 0; k < 4; k++) wait(k * 0.07).then(() => audio.bubble());
    } else {
      st.particles.burst('puff', at, { count: 14, color: 0xffffff, size: 0.045, gravity: 0.5, life: 2.2, spread: 0.7, grow: 0, dir: new THREE.Vector3(0, 0, 0.5) });
      audio.sparkle();
    }
  }

  private tapCat(t: TapInfo) {
    const st = this.game.stage;
    const cat = this.n('cat');
    st.squash(cat, -3);
    this.catTaps++;
    if (this.catTaps % 3 === 0) {
      audio.purr();
      st.particles.burst('heart', t.point.clone().add(new THREE.Vector3(0, 0.25, 0)), { count: 4, color: [0xd8453f, 0xf0907a] });
      this.game.secret('cat_purr', t.point);
    } else {
      audio.meow();
      st.particles.burst('heart', t.point.clone().add(new THREE.Vector3(0, 0.25, 0)), { count: 1, color: 0xf0907a });
    }
  }

  private tapJar(t: TapInfo) {
    const st = this.game.stage;
    st.squash(this.n('cookie_jar'), -4);
    audio.clink(0.8);
    audio.pop(1.3, 0.15);
    st.particles.burst('crumb', t.point, { count: 6, color: [0xd9a066, 0x8c5a3c], floor: 0.98, dir: new THREE.Vector3(0, 0, 0.6) });
  }

  // ------------------------------------------------------------------ frame
  private c = new THREE.Color();
  update(dt: number, realDt: number) {
    const t = clock.real;
    for (const p of this.pots) p.o.rotation.z = p.s.step(dt) * 0.12;
    this.n('cat_tail').rotation.y = Math.sin(t * 1.4) * 0.3 + Math.sin(t * 3.1) * 0.06;
    this.n('window_cloud').position.x = this.cloudX + Math.sin(t * 0.12) * 0.32;
    const d = new Date();
    this.n('clock_min').rotation.z = -((d.getMinutes() + d.getSeconds() / 60) / 60) * Math.PI * 2;
    this.n('clock_hr').rotation.z = -(((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2;
    for (const m of this.skyMats) m.color.copy(this.game.stage.windowColor);
    this.ovenMat.color.copy(this.c.set(0x3a2a3a)).lerp(pal('glow'), this.ovenGlow * (0.85 + Math.sin(t * 9) * 0.15));
    this.steamT -= realDt;
    if (this.steamT <= 0) {
      this.steamT = rand(0.9, 1.5);
      this.game.stage.particles.burst('puff', this.socket('socket_steam'), { count: 1, color: 0xfffaf0, size: 0.07, speed: 0.05, up: 0.3, life: 1.3 });
    }
  }
}
