// The Big Feast: pick a job -> do its short steps -> (a dish flies through the arch onto the table) ->
// the doorbell rings and a guest arrives. When every job is done: the rest of the family comes in, the kids
// light the candles, serve everyone, and the feast photo is taken. No timers, no grades, no way to fail.
import * as THREE from 'three';
import { part, meshOf } from '../core/assets';
import { clock, tween, wait, ease, rand } from '../core/tween';
import { audio } from '../core/audio';
import { arcTo, topOf } from '../fx/motion';
import type { Stage } from '../core/stage';
import type { TapInfo } from '../core/input';
import { Kitchen } from './kitchen';
import { Gobbles } from './gobbles';
import { Guest, GUESTS } from './guests';
import { Hints, type StepDef } from './hints';
import { Station } from './station';
import { PotatoStation } from './stations/potato';
import { CranberryStation } from './stations/cranberry';
import { TableStation } from './stations/table';
import { BeansStation } from './stations/beans';
import { StuffingStation } from './stations/stuffing';
import { SweetStation } from './stations/sweet';
import { PieStation } from './stations/pie';
import { RoastStation } from './stations/roast';
import { Oven } from './oven';
import { makePortrait } from './portraits';
import type { Hud } from '../ui/hud';

export type State = 'title' | 'home' | 'station' | 'serving' | 'dinner' | 'done';
const TABLE_Y = 0.8;
const GOBBLES_SEAT = 5;

export class Game {
  state: State = 'title';
  kitchen: Kitchen;
  gobbles: Gobbles;
  hints: Hints;
  stations: Station[] = [];
  current: Station | null = null;
  guests: Guest[] = [];
  oven: Oven;
  /** Set by a recipe while it wants taps on the oven. */
  ovenTap: ((t: TapInfo) => void) | null = null;
  private table!: TableStation;
  /** Arianna: helps in the kitchen, then sits down at dinner. */
  private helper: Guest | null = null;
  private slotsUsed = 0;
  private dishes: { station: Station; node: THREE.Object3D }[] = [];
  private portraits: HTMLCanvasElement[] = [];
  private gobblesServed = false;
  private homeDef: StepDef;
  private disposed = false;
  private finished = 0;
  private tag: { text: string; at: () => THREE.Vector3; until: number } | null = null;
  private candles: { root: THREE.Object3D; flame: THREE.Object3D; lit: boolean }[] = [];
  private steamAt: THREE.Object3D | null = null;
  private steamT = 0;

  constructor(public stage: Stage, public hud: Hud) {
    this.kitchen = new Kitchen(this);
    this.gobbles = new Gobbles(stage);
    this.hints = new Hints(stage);
    const home = this.kitchen.socket('socket_gobbles_home');
    this.gobbles.root.position.copy(home);
    this.gobbles.setGround(home.y);
    stage.input.add(this.gobbles.hitRoot, { gobbles: { enabled: () => this.state !== 'title', tap: (t) => this.tapGobbles(t) } });
    stage.input.onPointer = (x, y) => {
      const p = stage.input.pointOnPlane(x, y, 1.0);
      if (p) this.gobbles.look(p, 1.5);
    };

    // the whole family exists from the start (hidden) so their portraits can go on the name cards
    for (const look of GUESTS) {
      const g = new Guest(stage, look);
      g.root.visible = false;
      stage.input.add(g.hitRoot, { guest: { enabled: () => this.state !== 'title' && g.arrived, tap: (t) => this.tapGuest(g, t) } });
      this.guests.push(g);
    }
    for (let seat = 0; seat < 6; seat++) {
      const g = this.guests.find((x) => x.look.seat === seat);
      this.portraits[seat] = g
        ? makePortrait(stage, g.root, () => g.faceWorld, 0.3 * (g.look.scale ?? 1), g.name, g.look.card)
        : makePortrait(stage, this.gobbles.root, () => this.gobbles.faceWorld, 0.3, 'Gobbles', 0xe8833a);
    }

    // the kitchen helper stands on her step stool behind the island and joins in with Gobbles
    this.helper = this.guests.find((g) => g.look.helper) ?? null;
    if (this.helper) {
      const h = this.helper, stool = this.kitchen.socket('socket_helper');
      h.arrived = true;
      h.root.visible = true;
      h.root.position.copy(stool);
      stage.setShadowGround(h.root, stool.y);
      this.gobbles.onCheer = () => {
        if (this.state !== 'dinner' && this.state !== 'done') h.cheer();
      };
      this.gobbles.onFlinch = () => h.gasp();
    }
    this.oven = new Oven(this);
    // the menu offers these three at a time, in this order; the roast is the finale
    this.table = new TableStation(this);
    this.stations = [new PotatoStation(this), new CranberryStation(this), this.table, new BeansStation(this), new StuffingStation(this),
      new SweetStation(this), new PieStation(this), new RoastStation(this)];
    for (const s of this.stations) {
      if (s.island) s.stow();
      // Set the Table can also be picked by tapping the cart or the table in the overview
      for (const [size, offset] of s.pickBoxes()) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ visible: false }));
        box.position.copy(s.root.position).add(offset);
        stage.scene.add(box);
        stage.input.addMesh(box, 'station_' + s.name, { enabled: () => this.state === 'home' && !s.done, tap: () => this.enterStation(s) });
      }
    }
    this.homeDef = {
      voice: 'pick',
      demo: 'none',
      target: () => this.gobbles.root,
      tap: {},
      onBob: () => this.hud.pulseMenu(),
    };
    hud.onPick = (id) => {
      const s = this.stations.find((x) => x.name === id);
      if (s) this.enterStation(s);
    };
    hud.onBell = () => this.ringDinnerBell();
    stage.setPose('home');
  }

  /** Jobs on offer right now: the first three unfinished ones. */
  private offered() {
    return this.stations.filter((s) => !s.done).slice(0, 3);
  }

  portraitForSeat(seat: number) {
    return this.portraits[seat];
  }

  /** A name card was picked up: show it big and let its owner say hello. */
  revealCard(seat: number) {
    this.hud.showCard(this.portraits[seat]);
    const g = this.guests.find((x) => x.look.seat === seat);
    if (g) audio.babble(g.look.pitch, 3, g.look.speed, 0.2);
    else this.gobbles.gobble(3);
    audio.pop(1.3);
  }

  /** The Play button was tapped. */
  async start(skipWelcome = false) {
    this.state = 'home';
    audio.preloadVoices(['potato_peel', 'cran_open', 'table_set', 'door', 'here_grammy', 'here_babcia', 'here_dziadziu']);
    this.gobbles.cheer();
    if (!skipWelcome) {
      audio.say('welcome');
      await wait(1.7);
    }
    if (this.helper) {
      // meet the helper
      const h = this.helper;
      this.tag = { text: h.name, at: () => h.headWorld.add(new THREE.Vector3(0, 0.12, 0)), until: clock.real + 2.6 };
      if (h.hasVoice && !skipWelcome) audio.say('helper_hi');
      h.wave();
      await wait(skipWelcome ? 0.6 : 1.9);
    }
    if (this.state === 'home') this.showHome(true);
  }

  private showHome(speak: boolean) {
    this.hud.setMenu(this.offered().map((s) => ({ id: s.name, started: s.started })), this.finished >= 3);
    this.hints.paused = false;
    // once the roast is out, the narrator points at the dinner bell
    this.homeDef.voice = this.stations.some((s) => s.name === 'roast' && s.done) ? 'dinner_bell' : 'pick';
    if (speak) this.hints.begin(this.homeDef);
  }

  /** The kids decide when the feast starts: the bell is on the menu once three jobs are done. */
  private async ringDinnerBell() {
    if (this.state !== 'home' || this.finished < 3) return;
    this.state = 'serving';
    this.hints.end();
    this.hud.setMenu([], false);
    for (let k = 0; k < 3; k++) wait(k * 0.22).then(() => audio.ding(0.75, 0.3));
    for (const s of this.stations) if (s.island && s.shown) s.hideKit();
    await this.stage.fly('table', 1.0);
    this.dinner();
  }

  async sendGobbles(to: THREE.Vector3) {
    const far = this.gobbles.root.position.distanceTo(to) > 2.5;
    await this.gobbles.hopTo(to, null, far ? 0.75 : 0.42);
    this.gobbles.setGround(to.y);
  }

  // ------------------------------------------------------------------ stations
  async enterStation(s: Station) {
    if (this.state !== 'home') return;
    this.state = 'station';
    this.current = s;
    this.hints.end();
    audio.pop(1.1);
    this.hud.setMenu([], false);
    this.hud.showHome(true);
    if (s.island) {
      // one work spot on the island: a half-done dish tucks away while another is cooked
      for (const o of this.stations) if (o !== s && o.island && o.shown) o.hideKit();
      s.showKit();
    }
    this.sendGobbles(s.gobblesSpot());
    await this.stage.fly(s.pose, 0.6);
    if (this.current !== s || this.state !== 'station') return;
    s.active = true;
    if (!s.started) {
      s.started = true;
      audio.preloadVoices(s.voices());
      s.recipe().then(() => this.finishDish(s));
    } else {
      s.resume();
    }
  }

  /** The home button: back to the overview. The job keeps its progress. */
  async goHome() {
    if (this.state !== 'station' || !this.current) return;
    const s = this.current;
    s.active = false;
    this.current = null;
    this.hints.end();
    this.hud.showHome(false);
    this.state = 'home';
    audio.pop(0.8);
    this.sendGobbles(this.kitchen.socket('socket_gobbles_home'));
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
    // celebrate where the work happened
    clock.hitStop(0.08);
    audio.jingle();
    const dish = s.dish();
    st.particles.burst('spark', topOf(dish), { count: 14, color: [0xffd27a, 0xffffff, 0xe8833a] });
    if (s.flies) st.squash(dish, 4);
    this.gobbles.yum();
    audio.say(s.doneVoice);
    await wait(1.25);
    if (s.flies) {
      // stars to the table: the dish flies along an arc through the doorway
      const slot = this.kitchen.socket(s.slot ?? 'socket_dish_' + this.slotsUsed++);
      st.scene.attach(dish);
      if (s.island) s.hideKit();     // the counter is cleared for the next recipe
      this.dishes.push({ station: s, node: dish });
      audio.whoosh();
      st.fly('table', 1.15);
      const sparkle = clock.onFrame(() => {
        if (Math.random() < 0.3) st.particles.burst('spark', dish.position, { count: 1, size: 0.05, speed: 0.2, up: 0.1, color: 0xffd27a });
      });
      st.setShadowGround(dish, 0);
      const from = dish.position.clone();
      const far = from.distanceTo(slot);
      // dishes are toy-sized on the counter and shrink a little to share the table
      tween(1.05, (k) => st.setBaseScale(dish, 1 + (s.tableScale - 1) * k), ease.inOut);
      await arcTo(dish, slot, Math.max(1.0, far * 0.28), 1.05, { spin: new THREE.Vector3(0, Math.PI * 2, 0), e: ease.inOut });
      sparkle();
      st.setShadowGround(dish, TABLE_Y);
      st.squash(dish, -4);
      audio.thud();
      audio.clink(0.7);
      st.particles.burst('puff', slot, { count: 6, color: 0xfff4e0, size: 0.08 });
      if (s.name === 'potato') this.steamAt = dish;
      for (const g of this.guests) if (g.arrived) g.gasp();
      await wait(0.45);
    } else {
      await st.fly('table', 0.9);
    }
    this.finished++;
    const total = this.stations.length;
    st.setDay((this.finished / total) * 2, 3);
    // the grandparents come after the first three jobs, the others later; everyone else arrives at dinner
    const guest = [1, 2, 3, 5].includes(this.finished) ? this.guests.filter((g) => !g.arrived)[0] : undefined;
    if (guest) await this.guestArrives(guest);
    else {
      for (const g of this.guests) if (g.arrived) g.cheer();
      await wait(1.3);
    }
    if (this.finished >= total) {
      await wait(0.5);
      this.dinner();
    } else {
      await wait(0.7);
      this.state = 'home';
      this.sendGobbles(this.kitchen.socket('socket_gobbles_home'));
      await st.fly('home', 0.9);
      if (this.state === 'home') this.showHome(true);
    }
  }

  // ------------------------------------------------------------------ guests
  private openDoor() {
    audio.creak();
    return tween(0.4, (k) => (this.kitchen.n('door').rotation.y = -1.75 * k), ease.outBack);
  }
  private closeDoor() {
    const door = this.kitchen.n('door');
    const from = door.rotation.y;
    return tween(0.3, (k) => (door.rotation.y = from * (1 - k)), ease.in).then(() => audio.thud());
  }

  /** One guest comes in through the front door, says hello (with a name tag) and takes their seat. */
  private async walkIn(g: Guest, quick = false) {
    const st = this.stage;
    const doorPos = this.kitchen.socket('socket_door');
    g.arrived = true;
    g.root.position.copy(doorPos);
    g.root.rotation.y = 0;
    const s0 = g.look.scale ?? 1;
    g.root.scale.setScalar(0.001);
    g.root.visible = true;
    audio.pop(0.9);
    await tween(0.3, (k) => g.root.scale.setScalar(Math.max(0.001, s0 * k)), ease.outBack);
    this.tag = { text: g.name, at: () => g.headWorld.add(new THREE.Vector3(0, 0.12, 0)), until: clock.real + (quick ? 2.2 : 3.2) };
    if (!quick) {
      if (g.hasVoice) audio.say(g.look.voice!);
      st.particles.burst('heart', g.headWorld, { count: 3, color: [0xd8453f, 0xf0907a] });
      await g.wave();
      await wait(0.35);
    } else {
      g.babble(3);
    }
    const seat = g.look.seat;
    const seatPos = this.kitchen.socket('socket_seat_' + seat);
    const yaw = this.kitchen.socketYaw('socket_seat_' + seat);
    // walk round behind the chairs, then one big hop onto the seat
    const side = seat === 4;
    const from0 = side ? new THREE.Vector3(seatPos.x + 0.02, 0, seatPos.z - 0.85) : new THREE.Vector3(seatPos.x - Math.sin(yaw) * 0.75, 0, seatPos.z - Math.cos(yaw) * 0.75);
    await g.hopTo(new THREE.Vector3(side ? from0.x : doorPos.x, 0, side ? doorPos.z + 0.3 : from0.z));
    await g.hopTo(from0);
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
    await wait(0.25);
    if (this.dishes.length) await g.yum();
    else await g.cheer();
  }

  private async guestArrives(g: Guest) {
    audio.doorbell();
    this.stage.fly('door', 0.7);
    wait(3.4).then(() => this.stage.fly('table', 1.0));
    await wait(0.5);
    if (!g.hasVoice) audio.say('door');
    await wait(g.hasVoice ? 0.3 : 0.7);
    await this.openDoor();
    const walk = this.walkIn(g);
    wait(2.6).then(() => this.closeDoor());
    await walk;
  }

  private async helperToSeat() {
    const h = this.helper;
    if (!h) return;
    const st = this.stage;
    const seat = this.kitchen.socket('socket_seat_' + h.look.seat);
    const yaw = this.kitchen.socketYaw('socket_seat_' + h.look.seat);
    // down off the stool, through the arch, round to the near side of her chair, and up
    st.setShadowGround(h.root, 0);
    await h.hopTo(new THREE.Vector3(0.2, 0, 0.55), 0.8);
    await h.hopTo(new THREE.Vector3(1.45, 0, 0.75), 0.7);
    this.tag = { text: h.name, at: () => h.headWorld.add(new THREE.Vector3(0, 0.12, 0)), until: clock.real + 2 };
    await h.turnTo(yaw, 0.15);
    const from = h.root.position.clone();
    audio.whoosh();
    await tween(0.45, (k, raw) => {
      h.root.position.lerpVectors(from, seat, k);
      h.hopY = Math.sin(raw * Math.PI) * 0.7;
    }, ease.inOut);
    h.hopY = 0;
    h.poke();
    st.setShadowGround(h.root, 0.02);
    audio.thud();
  }

  private tapGuest(g: Guest, t: TapInfo) {
    if (this.state === 'dinner' && !g.served && this.candles.every((c) => c.lit)) {
      this.hints.activity();
      this.serve(g);
      return;
    }
    if (Math.random() < 0.5) g.poke();
    else g.cheer();
    this.tag = { text: g.name, at: () => g.headWorld.add(new THREE.Vector3(0, 0.12, 0)), until: clock.real + 1.6 };
    this.stage.particles.burst('heart', g.headWorld, { count: 1, color: 0xf0907a });
  }

  private tapGobbles(t: TapInfo) {
    const g = this.gobbles;
    if (this.state === 'dinner' && !this.gobblesServed && this.candles.every((c) => c.lit)) {
      this.hints.activity();
      this.serve(null);
      return;
    }
    // tapping Gobbles replays the last instruction; otherwise he is ticklish
    g.bounce(-4);
    if (this.hints.step && (this.state === 'station' || this.state === 'home' || this.state === 'dinner')) {
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
    this.hud.setMenu([], false);
    audio.fanfare();
    audio.say('dinner');
    await wait(1.4);
    // if the table was never set, the place settings pop out by themselves
    await this.table.finishNow();
    // everyone else arrives together
    const late = this.guests.filter((g) => !g.arrived);
    if (late.length) {
      audio.doorbell();
      await wait(0.6);
      audio.say('here_friends');
      await this.openDoor();
      const walks = late.map((g, i) => wait(i * 0.9).then(() => this.walkIn(g, true)));
      await Promise.all(walks);
      this.closeDoor();
    }
    // the helper hangs up her job and takes her seat
    const helperWalk = this.helperToSeat();
    // Gobbles finally gets a seat, and a paper pilgrim hat
    const g = this.gobbles;
    const seat = this.kitchen.socket('socket_seat_' + GOBBLES_SEAT);
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
    await helperWalk;
    await wait(0.5);
    // candles: the kids light them, and the room warms to candlelight
    for (let i = 0; i < 2; i++) {
      const c = part('props', 'candle');
      c.position.copy(this.kitchen.socket('socket_candle_' + i));
      st.scene.add(c);
      st.setBaseScale(c, 1.6);
      st.pop(c, 1, 0.01);
      audio.pop(1 + i * 0.2);
      const flame = c.getObjectByName('candle_flame')!;
      flame.visible = false;
      const entry = { root: c, flame, lit: false };
      this.candles.push(entry);
      // big tap area while it is unlit; once lit it stops taking taps so it never blocks the guests behind it
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.42), new THREE.MeshBasicMaterial({ visible: false }));
      box.position.copy(c.position).add(new THREE.Vector3(0, 0.35, 0));
      st.scene.add(box);
      st.input.addMesh(box, 'candle', { enabled: () => this.state === 'dinner' && !entry.lit, tap: (t) => this.tapCandle(entry, t) });
      await wait(0.25);
    }
    st.candleLight.position.copy(this.kitchen.socket('socket_candle_0')).add(new THREE.Vector3(0.2, 1.2, 0.5));
    clock.onFrame(() => {
      this.candles.forEach((cd, i) => {
        if (!cd.lit) return;
        const f = 1 + Math.sin(clock.real * 13 + i * 2) * 0.12 + Math.sin(clock.real * 31) * 0.05;
        cd.flame.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
      });
    });
    this.state = 'dinner';
    this.hints.begin({
      voice: 'table_candles',
      demo: 'tap',
      target: () => (this.candles.find((c) => !c.lit) ?? this.candles[0]).root,
      tap: {},
    });
  }

  private tapCandle(c: { root: THREE.Object3D; flame: THREE.Object3D; lit: boolean }, t: TapInfo) {
    const st = this.stage;
    st.squash(c.root, -3);
    if (c.lit) {
      audio.note(6, 0.2);
      st.particles.burst('spark', t.point, { count: 3, size: 0.04, color: 0xffd27a });
      return;
    }
    this.hints.activity();
    c.lit = true;
    c.flame.visible = true;
    const lit = this.candles.filter((x) => x.lit).length;
    audio.note(3 + lit * 2, 0.3);
    audio.tone({ freq: 900, to: 1700, dur: 0.12, vol: 0.14 });
    st.particles.burst('spark', c.root.position.clone().add(new THREE.Vector3(0, 0.45, 0)), { count: 8, color: [0xffd27a, 0xffa24a, 0xffffff] });
    st.setDay(2 + lit / this.candles.length, 1.8);
    if (lit === this.candles.length && this.state === 'dinner') {
      this.hints.end();
      for (const g of this.guests) g.gasp();
      wait(1.6).then(() => {
        if (this.state !== 'dinner') return;
        this.hints.begin({
          voice: 'serve',
          demo: 'tap',
          target: () => this.guests.find((x) => !x.served)?.root ?? this.gobbles.root,
          tap: {},
        });
      });
    }
  }

  private async serve(g: Guest | null) {
    const st = this.stage;
    if (g) g.served = true;
    else this.gobblesServed = true;
    const plate = this.kitchen.socket('socket_plate_' + (g ? g.look.seat : GOBBLES_SEAT));
    // a scoop of every dish arcs onto the plate
    this.dishes.forEach((d, i) => {
      wait(i * 0.18).then(async () => {
        const blob = part('props', 'serving');
        (meshOf(blob).material as THREE.MeshToonMaterial).color.set(d.station.servingColor);
        blob.position.copy(topOf(d.node));
        st.scene.add(blob);
        st.pop(blob, 1, 0.2);
        audio.pop(1 + i * 0.2, 0.2);
        const off = (i - (this.dishes.length - 1) / 2) * 0.11;
        await arcTo(blob, plate.clone().add(new THREE.Vector3(off, 0.02, rand(-0.02, 0.02))), 0.5, 0.45, { spin: new THREE.Vector3(0, 3, 0) });
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
    const table = this.kitchen.socket('socket_table_centre');
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
    // the feast photo (kept in the scrapbook on this device)
    this.tag = null;
    this.hud.setTag(null, 0, 0);
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
    // name tag over whoever just walked in
    if (this.tag && t < this.tag.until) {
      const p = this.stage.input.screenOf(this.tag.at());
      this.hud.setTag(this.tag.text, p.x, p.y);
    } else if (this.tag) {
      this.tag = null;
      this.hud.setTag(null, 0, 0);
    }
    // the mashed potatoes keep steaming on the table
    if (this.steamAt) {
      this.steamT -= realDt;
      if (this.steamT <= 0) {
        this.steamT = rand(0.8, 1.4);
        this.stage.particles.burst('puff', topOf(this.steamAt).add(new THREE.Vector3(0, 0.05, 0)), { count: 1, color: 0xfffaf0, size: 0.07, speed: 0.04, up: 0.28, life: 1.3 });
      }
    }
  }

  dispose() {
    this.disposed = true;
    this.hud.setTag(null, 0, 0);
  }
}
