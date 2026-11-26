// Cranberry Sauce (the signature toy): open the can -> SCHLORP the ribbed log out -> wobble it.
// Secret: tap the log 10 times and it bursts into a jelly rain.
import * as THREE from 'three';
import { Station } from '../station';
import { meshOf, part } from '../../core/assets';
import { clock, tween, wait, ease, Spring, lerp, clamp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { WobbleUniforms } from '../../fx/toon';
import type { DragInfo, TapInfo } from '../../core/input';
import type { Game } from '../game';

const CAN_H = 0.3;
const LOG_H = 0.265;

export class CranberryStation extends Station {
  doneVoice = 'cran_done';
  servingColor = 0xc22f4b;
  private leanX = new Spring(0, 3.1, 0.07);
  private leanZ = new Spring(0, 3.1, 0.07);
  private wob: WobbleUniforms;
  private bell: THREE.Object3D;
  private wobbles = 0;
  private bellShown = false;
  private raining = false;

  constructor(game: Game) {
    super(game, 'cranberry', 'cranberry');
    const st = this.stage;
    const logMesh = meshOf(this.it('food_log'));
    this.wob = (logMesh.material as THREE.Material).userData.wobble as WobbleUniforms;
    // the wobble runs in the mesh's own (quantized) attribute space
    logMesh.geometry.computeBoundingBox();
    const bb = logMesh.geometry.boundingBox!;
    this.wob.uWobA.value.set(bb.min.y, bb.max.y - bb.min.y, (bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2);
    const metresPerUnit = LOG_H / (bb.max.y - bb.min.y || 1);
    this.bell = part('props', 'bell');
    this.bell.position.copy(this.at('socket_bell'));
    this.root.add(this.bell);
    st.hide(this.bell);
    st.input.add(this.bell, { bell: { enabled: () => this.active && this.bell.visible, tap: (t) => this.tapBell(t) } });
    st.shadow(this.it('can'), 0.13, this.top);
    st.shadow(this.it('cran_plate'), 0.3, this.top);
    clock.onFrame((dt) => {
      const bulge = clamp((1 - this.it('food_log').scale.y) * 0.6, -0.3, 0.4);
      this.wob.uWob.value.set(this.leanX.step(dt) / metresPerUnit, this.leanZ.step(dt) / metresPerUnit, bulge);
    });
  }

  dish() {
    // the log rides on its plate
    const plate = this.it('cran_plate'), log = this.it('food_log');
    if (log.parent !== plate && this.done) {
      plate.attach(log);
      this.stage.dropShadow(log);
    }
    return plate;
  }

  voices() {
    return ['cran_schlorp', 'cran_wobble', 'bell', 'cran_done'];
  }

  async recipe() {
    await this.open();
    await this.schlorp();
    await this.wobble();
  }

  // ------------------------------------------------------------------ 1. open the can
  private async open() {
    const st = this.stage;
    const can = this.it('can'), opener = this.it('opener'), knob = this.it('opener_knob'), lid = this.it('can_lid');
    let turns = 0, busy = false, finished = false, acc = 0, lastA: number | null = null;
    const NEED = 3;
    const crank = async () => {
      if (finished || busy) return;
      busy = true;
      turns++;
      audio.ratchet(4);
      audio.note(turns - 1, 0.16);
      st.squash(can, -1.8);
      const a0 = opener.rotation.y, k0 = knob.rotation.y;
      lid.position.y += 0.006;
      lid.rotation.z = 0.05 * turns;
      await tween(0.3, (q) => {
        opener.rotation.y = a0 - ((Math.PI * 2) / NEED) * q;
        knob.rotation.y = k0 + Math.PI * 2 * q;
      }, ease.inOut);
      busy = false;
      if (turns >= NEED) {
        finished = true;
        this.next();
      }
    };
    const circle = (d: DragInfo) => {
      // circle-drag round the can: each third of a turn is one crank
      const c = st.input.screenOf(this.worldOf(opener));
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
        if (acc > 2.0) {
          acc = 0;
          crank();
        }
      }
      lastA = a;
    };
    await this.step({
      voice: 'cran_open',
      target: () => opener,
      demo: 'circle',
      tap: { opener: crank, can: crank, log: crank },
      drag: { opener: circle, can: circle, log: circle },
    });
    // the lid pops with a ping and lands behind the dish; the opener hops off
    audio.ping();
    clock.hitStop(0.05);
    this.fx.burst('spark', this.worldOf(lid), { count: 8, color: [0xffffff, 0xcdc6c6, 0xffd27a] });
    this.root.attach(lid);
    this.root.attach(opener);
    st.squash(can, 4);
    this.gobbles.bounce(3);
    const lidRest = this.at('socket_lid_rest'), opRest = this.at('socket_opener_rest');
    arcTo(opener, new THREE.Vector3(opRest.x, 0.0, opRest.z), 0.35, 0.5, { quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0)) }).then(() => audio.clink(0.7));
    await arcTo(lid, lidRest, 0.6, 0.6, { spin: new THREE.Vector3(Math.PI * 4, 0, -lid.rotation.z), e: ease.linear });
    lid.rotation.set(0, 0, 0);
    st.squash(lid, -3);
    audio.clink(1.2);
    await wait(0.15);
  }

  // ------------------------------------------------------------------ 2. schlorp
  private async schlorp() {
    const st = this.stage;
    const can = this.it('can'), log = this.it('food_log'), plate = this.it('cran_plate');
    const land = this.at('socket_log');
    const hoverY = land.y + 0.15 + CAN_H;
    // hop over the dish and flip upside down
    audio.whoosh();
    await arcTo(can, new THREE.Vector3(land.x, hoverY, land.z), 0.3, 0.55, { quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)) });
    st.squash(can, 3);
    const y0 = log.position.y;
    let taps = 0, busy = false, finished = false;
    const stopWiggle = clock.onFrame(() => {
      if (!finished) can.rotation.z = Math.sin(clock.time * 5) * 0.04;
    });
    const tapCan = async () => {
      if (busy || finished) return;
      busy = true;
      taps++;
      st.squash(can, -4.5);
      if (taps < 3) {
        audio.glorp(taps);
        const from = log.position.y, to = y0 + taps * 0.075;
        await tween(0.22, (q) => (log.position.y = lerp(from, to, q)), ease.outBack);
        this.fx.burst('blob', this.world(new THREE.Vector3(land.x + rand(-0.05, 0.05), land.y + 0.12, land.z + 0.1)), { count: 2, color: 0xc22f4b, size: 0.03, speed: 0.4, up: 0.6, floor: this.top });
        busy = false;
        return;
      }
      // the giant schlorp: the log slides out in one piece
      finished = true;
      audio.schlorp();
      this.gobbles.flinch();
      const from = log.position.y;
      await tween(0.5, (q) => {
        log.position.y = lerp(from, y0 + 0.2, q);
        const s = 1 - 0.12 * Math.sin(q * Math.PI * 3);
        can.scale.set(s, 1, s);
      }, ease.in);
      // hand the log over to the station, upright, exactly where it is
      const wp = this.worldOf(log);
      this.root.add(log);
      log.rotation.set(0, 0, 0);
      const local = this.root.worldToLocal(wp.clone());
      log.position.set(land.x, local.y - LOG_H, land.z);
      const fall0 = log.position.y;
      await tween(0.14, (q) => (log.position.y = lerp(fall0, land.y, q)), ease.in);
      clock.hitStop(0.07);
      st.squash(log, -7, 3.0, 0.14);
      this.leanX.kick(0.5);
      st.squash(plate, -3);
      this.fx.burst('puff', this.worldOf(log), { count: 8, color: 0xfff4e0, size: 0.07 });
      this.fx.burst('blob', this.worldOf(log).add(new THREE.Vector3(0, 0.1, 0)), { count: 8, color: [0xc22f4b, 0x8e2238], size: 0.03, floor: this.top, speed: 1.2, up: 1.6 });
      st.shadow(log, 0.12, this.top);
      this.next();
    };
    await this.step({
      voice: 'cran_schlorp',
      target: () => can,
      demo: 'tap',
      tap: { can: tapCan, log: tapCan },
    });
    stopWiggle();
    // the empty can pops off and lands on its side
    const rest = this.at('socket_can_rest');
    this.gobbles.cheer();
    await arcTo(can, rest, 0.5, 0.6, { quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0.5, 0)) });
    can.scale.set(1, 1, 1);
    audio.clink(0.6);
    st.squash(can, -2);
  }

  // ------------------------------------------------------------------ 3. wobble (and the bell)
  private async wobble() {
    const log = this.it('food_log');
    const tapLog = (t: TapInfo) => {
      if (this.raining) return;
      this.wobbles++;
      this.wobbleLog(t, this.wobbles - 1);
      if (this.wobbles === 3 && !this.bellShown) this.showBell();
      if (this.wobbles % 10 === 0) this.jellyRain();
    };
    await this.step({
      voice: 'cran_wobble',
      target: () => log,
      demo: 'tap',
      tap: { log: tapLog },
    });
  }

  /** One jelly wobble: lean away from where the finger landed, squash, sing. */
  private wobbleLog(t: TapInfo, i: number) {
    const log = this.it('food_log');
    const lp = log.worldToLocal(t.point.clone());
    const a = Math.atan2(lp.z, lp.x) + Math.PI + rand(-0.4, 0.4);
    this.leanX.kick(Math.cos(a) * 0.75);
    this.leanZ.kick(Math.sin(a) * 0.75);
    this.stage.squash(log, -3.2, 3.0, 0.12);
    audio.wobble(i);
  }

  /** On the dinner table the log is still a toy. */
  protected idleReact(name: string, t: TapInfo) {
    if (this.done && (name === 'log' || name === 'can') && !this.raining) {
      this.wobbleLog(t, (this.wobbles++ % 8));
      this.fx.burst('spark', t.point, { count: 2, size: 0.03, color: 0xffc0cb });
      return;
    }
    super.idleReact(name, t);
  }

  private showBell() {
    this.bellShown = true;
    this.stage.pop(this.bell, 1, 0.01);
    audio.ding(1, 0.16);
    this.fx.burst('spark', this.worldOf(this.bell), { count: 6, color: 0xffd27a });
    // from now on the hints point at the bell
    const def = this.stepDef;
    if (def) {
      def.voice = 'bell';
      def.target = () => this.bell;
    }
  }

  private tapBell(t: TapInfo) {
    const st = this.stage;
    st.squash(this.bell, -4);
    audio.ding();
    this.fx.burst('spark', t.point, { count: 6, color: [0xffd27a, 0xffffff] });
    if (this.stepDef && this.bellShown && !this.raining) {
      this.game.hints.activity();
      st.pop(this.bell, 0);
      this.next();
    }
  }

  /** Secret: ten taps and the log bursts into a jelly rain, then pops back. */
  private async jellyRain() {
    const st = this.stage;
    const log = this.it('food_log');
    this.raining = true;
    clock.hitStop(0.09);
    const at = this.worldOf(log).add(new THREE.Vector3(0, 0.15, 0));
    st.pop(log, 0);
    audio.schlorp();
    audio.boing(1.6);
    st.addShake(0.035);
    this.gobbles.flinch();
    for (let i = 0; i < 3; i++) {
      this.fx.burst('blob', at, { count: 16, color: [0xc22f4b, 0x8e2238, 0xe0506a], size: 0.045, speed: 1.5, up: 3.4, floor: this.top, life: 2.4 });
      await wait(0.12);
    }
    this.game.secret('jelly_rain', at);
    await wait(1.5);
    st.pop(log, 1, 0.01);
    this.leanX.kick(1);
    audio.pop(0.7);
    audio.wobble(4);
    this.gobbles.cheer();
    await wait(0.4);
    this.raining = false;
  }
}
