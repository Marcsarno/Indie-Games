// Sweet Potatoes: scoop the mash into the casserole, drop marshmallows on top, then toast them golden
// on the open oven door (each tap is a wave of heat).
import * as THREE from 'three';
import { Station } from '../station';
import { part, meshOf } from '../../core/assets';
import { tween, wait, ease, lerp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { Game } from '../game';

const MARSH = 12;

export class SweetStation extends Station {
  doneVoice = 'sweet_done';
  servingColor = 0xee8e3c;

  constructor(game: Game) {
    super(game, 'sweet', 'sweet');
    const st = this.stage;
    for (let k = 0; k < MARSH; k++) st.hide(this.it('marsh_' + k));
    this.it('sw_fill').scale.y = 0.04;
    st.shadow(this.it('casserole'), 0.36, this.top);
    st.shadow(this.it('sw_pot'), 0.26, this.top);
    st.shadow(this.it('marsh_bag'), 0.14, this.top);
  }
  dish() {
    return this.it('casserole');
  }
  voices() {
    return ['sweet_marsh', 'sweet_toast', 'oven_tap', 'sweet_done'];
  }

  async recipe() {
    const st = this.stage;
    const cas = this.it('casserole'), pot = this.it('sw_pot'), scoop = this.it('scoop'), fill = this.it('sw_fill'), bag = this.it('marsh_bag');
    const scoopRest = scoop.position.clone();

    // ---- 1. scoop the mash across
    await this.tapStep({
      voice: 'sweet_scoop',
      target: () => scoop,
      hits: ['pot', 'casserole'],
      need: 4,
      act: async (i) => {
        await tween(0.12, (q) => (scoop.position.y = scoopRest.y - 0.14 * q), ease.in);
        audio.glorp(i);
        st.squash(pot, -3);
        const blob = part('props', 'serving');
        (meshOf(blob).material as THREE.MeshToonMaterial).color.set(0xee8e3c);
        this.root.add(blob);
        blob.position.set(pot.position.x, 0.3, pot.position.z);
        st.setBaseScale(blob, 1.6);
        tween(0.15, (q) => (scoop.position.y = scoopRest.y - 0.14 * (1 - q)), ease.outBack);
        const mash = this.it('sw_pot_mash');
        mash.position.y -= 0.035;
        await arcTo(blob, new THREE.Vector3(cas.position.x + rand(-0.15, 0.15), 0.12, cas.position.z + rand(-0.08, 0.08)), 0.45, 0.42, { spin: new THREE.Vector3(0, 4, 0) });
        this.root.remove(blob);
        st.forget(blob);
        const y0 = fill.scale.y, y1 = (i + 1) / 4;
        tween(0.25, (q) => (fill.scale.y = lerp(y0, y1, q)), ease.outBack);
        st.squash(cas, -3);
        audio.thud();
        audio.note(i, 0.2);
      },
    });
    this.gobbles.cheer();
    await wait(0.4);

    // ---- 2. marshmallows, two at a time
    const local = (v: THREE.Vector3) => cas.worldToLocal(this.world(v));
    const bagTop = local(new THREE.Vector3(bag.position.x, 0.3, bag.position.z));
    await this.tapStep({
      voice: 'sweet_marsh',
      target: () => bag,
      hits: ['bag', 'casserole'],
      need: MARSH / 2,
      gate: false,
      act: async (i) => {
        st.squash(bag, -4);
        audio.pop(1.2 + i * 0.06, 0.2);
        for (const k of [i * 2, i * 2 + 1]) {
          const m = this.it('marsh_' + k);
          const home = m.position.clone();
          m.position.copy(bagTop);
          st.pop(m, 1, 0.3);
          wait((k % 2) * 0.08).then(() => arcTo(m, home, 0.4, 0.4, { spin: new THREE.Vector3(rand(-5, 5), 0, rand(-5, 5)), e: ease.linear })).then(() => {
            m.rotation.set(0, rand(0, 6), 0);
            st.squash(m, -5);
            audio.tone({ freq: 620 + k * 26, to: 420, dur: 0.07, vol: 0.14 });
          });
        }
        await wait(0.2);
      },
    });
    await wait(0.6);
    audio.sparkle();

    // ---- 3. toast on the open oven door: every tap is a wave of heat
    await this.game.oven.load(this, cas, 'sweet_toast', ['casserole']);
    const mats = Array.from({ length: MARSH }, (_, k) => meshOf(this.it('marsh_' + k)).material as THREE.MeshToonMaterial);
    const shades = [new THREE.Color(0xffffff), new THREE.Color(0xffe9c0), new THREE.Color(0xf2c078), new THREE.Color(0xd9984a)];
    await this.tapStep({
      voice: 'oven_tap',
      target: () => this.game.kitchen.n('oven_door'),
      hits: ['casserole'],
      ext: ['oven'],
      need: 3,
      act: async (i) => {
        this.game.oven.heat(cas);
        const from = shades[i], to = shades[i + 1];
        tween(0.5, (q) => mats.forEach((m, k) => m.color.copy(from).lerp(to, Math.min(1, q * (0.8 + (k % 3) * 0.2)))), ease.out);
        for (let k = 0; k < MARSH; k++) {
          const m = this.it('marsh_' + k);
          st.setBaseScale(m, 1 + 0.07 * (i + 1));
          st.squash(m, 3 + (k % 3));
        }
        this.game.kitchen.setNeedle((i + 1) / 3);
        audio.note(i * 2, 0.22);
        await wait(0.55);
      },
    });
    audio.ding();
    this.game.oven.steam(cas, 8);
    this.fx.burst('spark', this.worldOf(cas).add(new THREE.Vector3(0, 0.25, 0)), { count: 12, color: [0xffd27a, 0xffffff, 0xffa24a] });
    this.game.oven.release(this, cas);
  }
}
