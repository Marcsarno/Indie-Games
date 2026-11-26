// The finale: Gobbles' Pumpkin Roast (the "turkey" that lets the real turkey relax). Stuff it, baste it
// three times until it shines, roast it in the oven (peek as often as you like; late just means extra
// crispy), then carve four slices.
import * as THREE from 'three';
import { Station } from '../station';
import { part, meshOf } from '../../core/assets';
import { clock, tween, wait, ease, lerp, clamp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { Game } from '../game';

export class RoastStation extends Station {
  doneVoice = 'roast_done';
  servingColor = 0xe8833a;
  private bodyMat: THREE.MeshToonMaterial;
  private raw = new THREE.Color(1.05, 1.5, 2.3);     // pale, uncooked pumpkin
  private golden = new THREE.Color(1, 1, 1);
  private crisp = new THREE.Color(0.62, 0.5, 0.42);
  private shine = 0;

  constructor(game: Game) {
    super(game, 'roast', 'roast');
    this.slot = 'socket_dish_roast';
    this.tableScale = 0.7;
    const st = this.stage;
    st.hide(this.it('roast_stuffing'));
    for (let k = 0; k < 4; k++) {
      st.hide(this.it('slice_' + k));
      st.hide(this.it('cut_' + k));
    }
    this.bodyMat = meshOf(this.it('roast_body')).material as THREE.MeshToonMaterial;
    this.setDone(0);
    st.shadow(this.it('roast'), 0.5, this.top);
    st.shadow(this.it('rs_bowl'), 0.2, this.top);
    st.shadow(this.it('juice_bowl'), 0.14, this.top);
  }
  dish() {
    return this.it('roast');
  }
  voices() {
    return ['roast_baste', 'roast_bake', 'roast_peek', 'roast_pull', 'roast_carve', 'crispy', 'roast_done'];
  }

  /** Colour of the roast: 0 raw .. 1 golden .. 1.45 extra crispy; basting adds shine and a head start. */
  private setDone(k: number) {
    const c = this.bodyMat.color;
    if (k <= 1) c.copy(this.raw).lerp(this.golden, clamp(k * 0.85 + this.shine * 0.15));
    else c.copy(this.golden).lerp(this.crisp, clamp((k - 1) / 0.45));
    (this.bodyMat.userData.gloss as { value: number }).value = 0.15 + this.shine * 0.5;
  }

  async recipe() {
    const st = this.stage;
    const roast = this.it('roast'), bowl = this.it('rs_bowl'), stuffing = this.it('roast_stuffing');
    const cavity = () => new THREE.Vector3(roast.position.x, 0.5, roast.position.z - 0.03);

    // ---- 1. stuff it
    await this.tapStep({
      voice: 'roast_stuff',
      target: () => bowl,
      hits: ['rsbowl', 'roast'],
      need: 4,
      act: async (i) => {
        st.squash(bowl, -4);
        audio.pop(0.9 + i * 0.08);
        const blob = part('props', 'serving');
        (meshOf(blob).material as THREE.MeshToonMaterial).color.set(0xe6bd7a);
        this.root.add(blob);
        st.setBaseScale(blob, 1.7);
        blob.position.set(bowl.position.x, 0.25, bowl.position.z);
        await arcTo(blob, cavity(), 0.4, 0.42, { spin: new THREE.Vector3(0, 4, 3) });
        this.root.remove(blob);
        st.forget(blob);
        if (i === 0) st.pop(stuffing, 1, 0.01);
        st.setBaseScale(stuffing, 0.4 + 0.2 * i);
        st.squash(roast, -3);
        audio.thud();
        audio.note(i, 0.2);
        this.fx.burst('crumb', this.world(cavity()), { count: 4, color: [0xf1d49b, 0xd69a4e], floor: this.top + 0.1 });
      },
    });
    this.gobbles.cheer();
    await wait(0.4);

    // ---- 2. baste three times: fill the baster, squirt the roast
    const baster = this.it('baster'), bulb = this.it('baster_bulb');
    const tubeMat = meshOf(this.it('baster_tube')).material as THREE.MeshToonMaterial;
    const rest = baster.position.clone();
    const above = new THREE.Vector3(roast.position.x + 0.05, 0.86, roast.position.z + 0.05);
    const juice = new THREE.Color(0xe9b552), clear = new THREE.Color(0xffffff);
    await this.tapStep({
      voice: 'roast_baste',
      target: () => (baster.position.y > 0.5 ? roast : baster),
      hits: ['baster', 'roast'],
      need: 6,
      act: async (i) => {
        if (i % 2 === 0) {
          // fill
          st.squash(bulb, -6);
          audio.glug(i / 2);
          await tween(0.3, (q) => tubeMat.color.copy(clear).lerp(juice, q), ease.out);
          audio.whoosh();
          await arcTo(baster, above, 0.3, 0.4);
        } else {
          // squirt
          st.squash(bulb, -7);
          audio.tone({ freq: 700, to: 300, dur: 0.25, vol: 0.2, type: 'sawtooth', lp: 1400 });
          audio.noise({ type: 'bandpass', freq: 1400, to: 500, dur: 0.25, vol: 0.2 });
          const from = this.world(new THREE.Vector3(above.x, above.y - 0.2, above.z));
          for (let k = 0; k < 5; k++) wait(k * 0.05).then(() => this.fx.burst('blob', from, { count: 2, color: [0xe9b552, 0xf6d58e], size: 0.04, speed: 0.5, up: 0, floor: this.top + 0.3, life: 0.6, bounce: 0.2 }));
          tween(0.3, (q) => tubeMat.color.copy(juice).lerp(clear, q), ease.out);
          const s0 = this.shine, s1 = (i + 1) / 6;
          await tween(0.4, (q) => {
            this.shine = lerp(s0, s1, q);
            this.setDone(0);
          }, ease.out);
          st.squash(roast, -2.5);
          audio.note(i, 0.22);
          this.fx.burst('spark', this.world(cavity()), { count: 5 + i, color: [0xffd27a, 0xffffff], size: 0.06 });
          await arcTo(baster, rest, 0.3, 0.4);
        }
      },
    });
    audio.sparkle();
    this.gobbles.cheer();
    await wait(0.5);

    // ---- 3. into the oven. The timer runs by itself; tap to peek, pull it out when you like.
    const oven = this.game.oven, k = this.game.kitchen;
    await oven.load(this, roast, 'roast_bake', ['roast']);
    await oven.slideIn(roast);
    let t = 0, peeking = false, told = false, lastTick = 0, lastNudge = 0;
    const stop = clock.onFrame((dt) => {
      if (!this.active) return;        // the timer waits while the player is elsewhere
      t = Math.min(1.45, t + dt / 6.5);
      k.setNeedle(t);
      this.setDone(t);
      if (clock.time - lastTick > 0.45) {
        lastTick = clock.time;
        audio.tick();
      }
      if (t >= 0.92 && !told) {
        told = true;
        audio.ding();
        audio.say('roast_pull');
      }
      if (t >= 0.92 && clock.time - lastNudge > 2.2 && !peeking) {
        lastNudge = clock.time;
        st.squash(k.n('oven_door'), 2.5);
        st.particles.burst('spark', k.socket('socket_oven'), { count: 4, size: 0.06, color: [0xffd27a, 0x8fae7e] });
      }
    });
    const outcome = { v: 'golden' as 'golden' | 'crispy' };
    this.game.ovenTap = (tp) => this.externalTap('oven', tp);
    const onTap = async () => {
      if (peeking) return;
      if (t < 0.85) {
        // not yet: a peek never hurts
        peeking = true;
        await oven.slideOut(roast, false);
        this.gobbles.gobble(3);
        await wait(0.7);
        await oven.slideIn(roast);
        peeking = false;
        return;
      }
      outcome.v = t > 1.28 ? 'crispy' : 'golden';
      peeking = true;
      this.next();
    };
    await this.step({ voice: 'roast_peek', target: () => k.n('oven_door'), demo: 'tap', tap: { oven: onTap, roast: onTap } });
    this.game.ovenTap = null;
    stop();
    await oven.slideOut(roast);
    if (outcome.v === 'crispy') {
      // late is never burnt: it is "extra crispy", with a giggle
      audio.say('crispy');
      this.gobbles.cheer();
      audio.boing(1.4);
    } else {
      audio.fanfare();
      this.fx.burst('spark', this.worldOf(roast).add(new THREE.Vector3(0, 0.4, 0)), { count: 16, color: [0xffd27a, 0xffffff, 0xffa24a], size: 0.08 });
    }
    await wait(0.9);
    await oven.unload(this, roast);

    // ---- 4. carve: tap along the dashed lines
    for (let i = 0; i < 4; i++) st.pop(this.it('cut_' + i), 1, 0.01);
    await this.tapStep({
      voice: 'roast_carve',
      target: () => roast,
      hits: ['roast'],
      need: 4,
      act: async (i) => {
        const cut = this.it('cut_' + i), slice = this.it('slice_' + i);
        st.pop(cut, 0);
        audio.chop();
        if (i === 0) this.gobbles.flinch();
        const home = slice.position.clone();
        slice.position.set(cut.position.x, cut.position.y, cut.position.z);
        st.pop(slice, 1, 0.3);
        await arcTo(slice, home, 0.12, 0.28, { e: ease.in });
        st.squash(slice, -6);
        st.squash(roast, -2);
        audio.glorp(i);
        audio.note(i * 2, 0.22);
        this.fx.burst('blob', this.worldOf(slice), { count: 3, color: 0xe9b552, size: 0.03, speed: 0.6, up: 0.8, floor: this.top + 0.03 });
        if (i === 3) clock.hitStop(0.08);
      },
    });
    audio.sparkle();
    this.fx.burst('spark', this.worldOf(roast).add(new THREE.Vector3(0, 0.45, 0)), { count: 14, color: [0xffd27a, 0xffffff, 0xe8833a] });
    void rand;
  }
}
