// The Big Feast: pick a dish -> do its short steps -> the dish flies through the arch onto the table ->
// the doorbell rings and a guest arrives. When every dish is done: candles, serving, the feast photo.
// No timers, no grades, no way to fail.
import * as THREE from 'three';
import { part, meshOf } from '../core/assets';
import { clock, tween, wait, ease, rand } from '../core/tween';
import { audio } from '../core/audio';
import { arcTo, topOf } from '../fx/motion';
import type { Stage } from '../core/stage';
import type { TapInfo } from '../core/input';
import { Kitchen } from './kitchen';
import { Gobbles } from './gobbles';
import { Guest, DEFAULT_GUESTS } from './guests';
import { Hints, type StepDef } from './hints';
import { Station } from './station';
import { PotatoStation } from './stations/potato';
import { CranberryStation } from './stations/cranberry';
import type { Hud } from '../ui/hud';

export type State = 'title' | 'home' | 'station' | 'serving' | 'dinner' | 'done';
const SEAT_ORDER = [1, 2, 0, 3, 4];
const TABLE_Y = 0.8;

export class Game {
  state: State = 'title';
  kitchen: Kitchen;
  gobbles: Gobbles;
  hints: Hints;
  stations: Station[] = [];
  current: Station | null = null;
  guests: Guest[] = [];
  private arrows = new Map<Station, THREE.Object3D>();
  private dishes: { station: Station; node: THREE.Object3D }[] = [];
  private plates = new Map<object, THREE.Vector3>();
  private gobblesServed = false;
  private homeDef: StepDef;
  private serveDef: StepDef | null = null;
  private disposed = false;

  constructor(public stage: Stage, public hud: Hud) {
    this.kitchen = new Kitchen(this);
    this.gobbles = new Gobbles(stage);
    this.hints = new Hints(stage);
    this.hints.onSpeak = () => {};
    const home = this.kitchen.socket('socket_gobbles_home');
    this.gobbles.root.position.copy(home);
    this.gobbles.setGround(home.y);
    stage.input.add(this.gobbles.hitRoot, { gobbles: { enabled: () => this.state !== 'title', tap: (t) => this.tapGobbles(t) } });
    stage.input.onPointer = (x, y) => {
      const p = stage.input.pointOnPlane(x, y, 1.0);
      if (p) this.gobbles.look(p, 1.5);
    };

    this.stations = [new PotatoStation(this), new CranberryStation(this)];
    for (const s of this.stations) {
      // a big invisible box over the whole station: tapping it in the overview picks the dish
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.8, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
      box.position.copy(s.root.position).add(new THREE.Vector3(0, 0.3, 0));
      stage.scene.add(box);
      stage.input.addMesh(box, 'station_' + s.name, { enabled: () => this.state === 'home' && !s.done, tap: () => this.enterStation(s) });
      const arrow = part('props', 'arrow');
      arrow.position.copy(s.root.position).add(new THREE.Vector3(0, 1.15, 0));
      stage.scene.add(arrow);
      stage.setBaseScale(arrow, 2.6);
      stage.hide(arrow);
      this.arrows.set(s, arrow);
    }
    this.homeDef = {
      voice: 'pick',
      demo: 'tap',
      target: () => {
        const s = this.stations.find((s) => !s.done)!;
        return s.started ? s.dish() : s.root;
      },
      tap: {},
    };
    stage.setPose('home');
    audio.preloadVoices([]);
  }

  /** The Play button was tapped. */
  async start(skipWelcome = false) {
    this.state = 'home';
    audio.preloadVoices(['potato_peel', 'cran_open', 'door', 'potato_mash', 'cran_schlorp']);
    this.gobbles.cheer();
    if (!skipWelcome) {
      audio.say('welcome');
      await wait(1.7);
    }
    if (this.state === 'home') this.showHome(true);
  }

  private showHome(speak: boolean) {
    for (const [s, a] of this.arrows) {
      if (!s.done) this.stage.pop(a, 1, 0.01);
      else this.stage.pop(a, 0);
    }
    this.hints.paused = false;
    if (speak) this.hints.begin(this.homeDef);
  }

  // ------------------------------------------------------------------ stations
  async enterStation(s: Station) {
    if (this.state !== 'home') return;
    this.state = 'station';
    this.current = s;
    this.hints.end();
    audio.pop(1.1);
    this.stage.squash(s.dish(), 3);
    for (const a of this.arrows.values()) this.stage.pop(a, 0);
    this.hud.showHome(true);
    const spot = s.root.localToWorld(s.at('socket_gobbles'));
    this.gobbles.hopTo(spot);
    await this.stage.fly(s.name, 0.6);
    if (this.current !== s || this.state !== 'station') return;
    s.active = true;
    if (!s.started) {
      s.started = true;
      audio.preloadVoices(s.name === 'potato' ? ['potato_butter', 'potato_stir', 'potato_done'] : ['cran_wobble', 'bell', 'cran_done']);
      s.recipe().then(() => this.finishDish(s));
    } else {
      s.resume();
    }
  }

  /** The home button: back to the overview. The dish keeps its progress. */
  async goHome() {
    if (this.state !== 'station' || !this.current) return;
    const s = this.current;
    s.active = false;
    this.current = null;
    this.hints.end();
    this.hud.showHome(false);
    this.state = 'home';
    audio.pop(0.8);
    this.gobbles.hopTo(this.kitchen.socket('socket_gobbles_home'));
    await this.stage.fly('home', 0.7);
    if (this.state === 'home') this.showHome(true);
  }

  private async finishDish(s: Station) {
    if (this.disposed) return;
    const st = this.stage;
    this.state = 'serving';
    s.done = true;
    s.active = false;
    this.current = null;
    this.hud.showHome(false);
    this.hints.end();
    // celebrate at the counter
    clock.hitStop(0.08);
    audio.jingle();
    const dish = s.dish();
    st.particles.burst('spark', topOf(dish), { count: 14, color: [0xffd27a, 0xffffff, 0xe8833a] });
    st.squash(dish, 4);
    this.gobbles.yum();
    audio.say(s.doneVoice);
    await wait(1.25);
    // stars to the table: the dish flies along an arc through the doorway
    const index = this.dishes.length;
    const slot = this.kitchen.socket('socket_dish_' + index);
    st.scene.attach(dish);
    this.dishes.push({ station: s, node: dish });
    audio.whoosh();
    st.fly('table', 1.15);
    const sparkle = clock.onFrame(() => {
      if (Math.random() < 0.3) st.particles.burst('spark', dish.position, { count: 1, size: 0.05, speed: 0.2, up: 0.1, color: 0xffd27a });
    });
    st.setShadowGround(dish, 0);
    await arcTo(dish, slot, 1.5, 1.05, { spin: new THREE.Vector3(0, Math.PI * 2, 0), e: ease.inOut });
    sparkle();
    st.setShadowGround(dish, TABLE_Y);
    st.squash(dish, -4);
    audio.thud();
    audio.clink(0.7);
    st.particles.burst('puff', slot, { count: 6, color: 0xfff4e0, size: 0.08 });
    await wait(0.45);
    await this.guestArrives(index, dish);
    const total = this.stations.length;
    st.setDay((this.dishes.length / total) * 2, 3);
    if (this.dishes.length >= total) {
      await wait(0.5);
      this.dinner();
    } else {
      await wait(0.7);
      this.state = 'home';
      this.gobbles.hopTo(this.kitchen.socket('socket_gobbles_home'));
      await st.fly('home', 0.9);
      if (this.state === 'home') this.showHome(true);
    }
  }

  // ------------------------------------------------------------------ guests
  private async guestArrives(index: number, dish: THREE.Object3D) {
    const st = this.stage;
    const seat = SEAT_ORDER[index % SEAT_ORDER.length];
    const door = this.kitchen.n('door');
    audio.doorbell();
    await wait(0.5);
    audio.say('door');
    await wait(0.6);
    audio.creak();
    await tween(0.4, (k) => (door.rotation.y = -1.75 * k), ease.outBack);
    const g = new Guest(st, DEFAULT_GUESTS[index % DEFAULT_GUESTS.length]);
    g.seat = seat;
    this.guests.push(g);
    const doorPos = this.kitchen.socket('socket_door');
    g.root.position.copy(doorPos);
    const s0 = g.root.scale.x;
    await tween(0.3, (k) => g.root.scale.setScalar(Math.max(0.001, s0 * k)), ease.outBack);
    st.input.add(g.hitRoot, { guest: { enabled: () => this.state !== 'title', tap: (t) => this.tapGuest(g, t) } });
    await g.wave();
    const seatPos = this.kitchen.socket('socket_seat_' + seat);
    const yaw = this.kitchen.socketYaw('socket_seat_' + seat);
    // walk round behind the chairs, then one big hop over the chair back onto the seat
    const behind = new THREE.Vector3(seatPos.x - Math.sin(yaw) * 0.75, 0, seatPos.z - Math.cos(yaw) * 0.75);
    await g.hopTo(new THREE.Vector3(doorPos.x, 0, behind.z));
    await g.hopTo(behind);
    tween(0.3, (k) => (door.rotation.y = -1.75 * (1 - k)), ease.in).then(() => audio.thud());
    await g.turnTo(yaw, 0.15);
    const from = g.root.position.clone();
    audio.whoosh();
    await tween(0.45, (k, raw) => {
      g.root.position.lerpVectors(from, seatPos, k);
      g.hopY = Math.sin(raw * Math.PI) * 0.75;
    }, ease.inOut);
    g.hopY = 0;
    g.poke();
    st.setShadowGround(g.root, 0.02);
    audio.thud();
    // a place setting pops in
    const plate = part('props', 'dinner_plate');
    const pp = this.kitchen.socket('socket_plate_' + seat);
    plate.position.copy(pp);
    st.scene.add(plate);
    st.pop(plate, 1, 0.01);
    audio.clink(1.1);
    this.plates.set(g, pp);
    await wait(0.3);
    await g.yum();
    void dish;
  }

  private tapGuest(g: Guest, t: TapInfo) {
    if (this.state === 'dinner' && !g.served) {
      this.hints.activity();
      this.serve(g);
      return;
    }
    if (Math.random() < 0.5) g.poke();
    else g.cheer();
    this.stage.particles.burst('heart', g.headWorld, { count: 1, color: 0xf0907a });
  }

  private tapGobbles(t: TapInfo) {
    const g = this.gobbles;
    if (this.state === 'dinner' && !this.gobblesServed) {
      this.hints.activity();
      this.serve(null);
      return;
    }
    // tapping Gobbles replays the last instruction; otherwise he is ticklish
    g.bounce(-4);
    if (this.hints.step && (this.state === 'station' || this.state === 'home')) {
      g.gobble(3);
      this.hints.replay();
      return;
    }
    const r = Math.random();
    if (r < 0.4) g.cheer();
    else if (r < 0.7) g.sneeze();
    else g.gobble(5);
  }

  // ------------------------------------------------------------------ dinner
  private async dinner() {
    const st = this.stage;
    this.state = 'serving';
    audio.fanfare();
    audio.say('dinner');
    st.setDay(3, 2.8);
    // candles light one by one and the room warms to candlelight
    for (let i = 0; i < 2; i++) {
      await wait(0.5);
      const c = part('props', 'candle');
      c.position.copy(this.kitchen.socket('socket_candle_' + i));
      st.scene.add(c);
      st.setBaseScale(c, 2.1);
      st.pop(c, 1, 0.01);
      audio.note(4 + i * 2, 0.3);
      st.particles.burst('spark', c.position.clone().add(new THREE.Vector3(0, 0.6, 0)), { count: 6, color: [0xffd27a, 0xffa24a] });
      const flame = c.getObjectByName('candle_flame')!;
      clock.onFrame(() => {
        const f = 1 + Math.sin(clock.real * 13 + i * 2) * 0.12 + Math.sin(clock.real * 31) * 0.05;
        flame.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
      });
    }
    st.candleLight.position.copy(this.kitchen.socket('socket_candle_0')).add(new THREE.Vector3(0.33, 1.2, 0.5));
    // Gobbles finally gets a seat, and a paper pilgrim hat
    const g = this.gobbles;
    const seat = this.kitchen.socket('socket_seat_gobbles');
    g.root.position.set(1.5, 0, 1.4);
    g.setGround(0);
    await g.hopTo(new THREE.Vector3(seat.x - 0.1, 0, seat.z + 0.85), null, 0.5);
    const from = g.root.position.clone();
    audio.whoosh();
    await tween(0.45, (k, raw) => {
      g.root.position.lerpVectors(from, seat, k);
      g.hopY = Math.sin(raw * Math.PI) * 0.6;
    }, ease.inOut);
    g.hopY = 0;
    g.bounce(-4);
    g.setGround(0.02);
    await g.face(new THREE.Vector3(seat.x - 3, seat.y, seat.z + 1.2), 0.2);
    g.wear('hat_pilgrim');
    g.setMood('happy');
    const plate = part('props', 'dinner_plate');
    const pp = this.kitchen.socket('socket_plate_gobbles');
    plate.position.copy(pp);
    st.scene.add(plate);
    st.pop(plate, 1, 0.01);
    audio.clink(1.1);
    this.plates.set(g, pp);
    await wait(0.6);
    // serve everyone
    this.state = 'dinner';
    this.serveDef = {
      voice: 'serve',
      demo: 'tap',
      target: () => this.guests.find((x) => !x.served)?.root ?? this.gobbles.root,
      tap: {},
    };
    this.hints.begin(this.serveDef);
  }

  private async serve(g: Guest | null) {
    const st = this.stage;
    const key = g ?? this.gobbles;
    if (g) g.served = true;
    else this.gobblesServed = true;
    const plate = this.plates.get(key)!;
    // a scoop of every dish arcs onto the plate
    this.dishes.forEach((d, i) => {
      wait(i * 0.18).then(async () => {
        const blob = part('props', 'serving');
        (meshOf(blob).material as THREE.MeshToonMaterial).color.set(d.station.servingColor);
        blob.position.copy(topOf(d.node));
        st.scene.add(blob);
        st.pop(blob, 1, 0.2);
        audio.pop(1 + i * 0.2, 0.2);
        const off = (i - (this.dishes.length - 1) / 2) * 0.1;
        await arcTo(blob, plate.clone().add(new THREE.Vector3(off, 0.012, rand(-0.02, 0.02))), 0.5, 0.45, { spin: new THREE.Vector3(0, 3, 0) });
        st.squash(blob, -5);
        audio.glorp(2);
      });
    });
    await wait(0.2 + this.dishes.length * 0.18 + 0.4);
    if (g) await g.yum();
    else await this.gobbles.yum();
    audio.note(this.guests.filter((x) => x.served).length + (this.gobblesServed ? 1 : 0), 0.25);
    if (this.state === 'dinner' && this.guests.every((x) => x.served) && this.gobblesServed) this.finale();
  }

  private async finale() {
    const st = this.stage;
    this.state = 'done';
    this.hints.end();
    await wait(0.4);
    audio.say('feast');
    audio.fanfare();
    audio.cheer();
    st.addShake(0.04);
    const table = this.kitchen.socket('socket_dish_2');
    for (const g of this.guests) g.cheer();
    this.gobbles.cheer();
    st.fly('table_wide', 1.8, ease.inOut);
    for (let i = 0; i < 4; i++) {
      st.particles.burst('confetti', table.clone().add(new THREE.Vector3(rand(-1.2, 1.2), 1.2, rand(-0.3, 0.5))), { count: 14, color: [0xe8833a, 0xb23a48, 0xf6d58e, 0x7fb8b0, 0x8fae7e, 0xffffff] });
      await wait(0.3);
    }
    await wait(0.8);
    audio.say('thanks');
    for (const g of this.guests) g.cheer();
    await wait(1.6);
    // the feast photo
    audio.shutter();
    const url = await st.snapshot();
    this.hud.flash();
    this.hud.showPhoto(url);
    await wait(1.2);
    this.hud.showAgain(true);
  }

  // ------------------------------------------------------------------ secrets (surprises, never promised)
  secret(id: string, at: THREE.Vector3) {
    if (!this.hud.addSticker(id)) return;
    audio.fanfare();
    this.stage.particles.burst('spark', at, { count: 14, color: [0xffd27a, 0xffffff, 0xe8833a], size: 0.09 });
  }

  update(dt: number, realDt: number) {
    this.kitchen.update(dt, realDt);
    this.gobbles.update(dt, realDt);
    for (const g of this.guests) g.update(dt);
    this.hints.update(dt);
    const t = clock.real;
    for (const a of this.arrows.values()) {
      if (!a.visible) continue;
      a.position.y = 0.98 + 1.05 + Math.sin(t * 3) * 0.08;
      a.rotation.y = Math.sin(t * 1.5) * 0.5;
    }
  }

  dispose() {
    this.disposed = true;
  }
}
