// Game clock, tweens, waits and springs. Game time can freeze for a few frames (freeze-frame hits)
// while "real" time keeps running for particles.

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t: number) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};
export type Ease = (t: number) => number;

interface Tw {
  t: number;
  dur: number;
  fn: (k: number, raw: number) => void;
  ease: Ease;
  resolve: () => void;
  gen: number;
}

class Clock {
  time = 0;          // game seconds
  real = 0;          // real seconds
  dt = 0;
  realDt = 0;
  private freeze = 0;
  private tweens: Tw[] = [];
  private gen = 0;
  private everyFrame = new Set<(dt: number) => void>();

  /** Advance. Returns game dt (0 during a freeze-frame). */
  step(realDt: number) {
    this.realDt = realDt;
    this.real += realDt;
    if (this.freeze > 0) {
      this.freeze -= realDt;
      this.dt = 0;
    } else {
      this.dt = realDt;
    }
    this.time += this.dt;
    if (this.dt > 0) {
      const list = this.tweens;
      this.tweens = [];
      for (const tw of list) {
        if (tw.gen !== this.gen) continue;
        tw.t += this.dt;
        const raw = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
        tw.fn(tw.ease(raw), raw);
        if (raw >= 1) tw.resolve();
        else this.tweens.push(tw);
      }
      for (const f of this.everyFrame) f(this.dt);
    }
    return this.dt;
  }

  /** Pause game time for a moment (particles keep going on real time). */
  hitStop(seconds = 0.075) {
    this.freeze = Math.max(this.freeze, seconds);
  }

  tween(dur: number, fn: (k: number, raw: number) => void, e: Ease = ease.inOut): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ t: 0, dur, fn, ease: e, resolve, gen: this.gen });
      if (dur <= 0) fn(1, 1);
    });
  }

  wait(seconds: number): Promise<void> {
    return this.tween(seconds, () => {}, ease.linear);
  }

  onFrame(f: (dt: number) => void) {
    this.everyFrame.add(f);
    return () => this.everyFrame.delete(f);
  }

  /** Drop every running tween (their promises never resolve): used when a session is thrown away. */
  clear() {
    this.gen++;
    this.tweens = [];
    this.everyFrame.clear();
  }
}

export const clock = new Clock();
export const tween = clock.tween.bind(clock);
export const wait = clock.wait.bind(clock);

/** Damped spring toward a target. freq in Hz, damping ratio (1 = critical, lower = bouncier). */
export class Spring {
  x: number;
  v = 0;
  target: number;
  constructor(x = 0, public freq = 4, public damping = 0.35) {
    this.x = x;
    this.target = x;
  }
  kick(v: number) {
    this.v += v;
  }
  step(dt: number) {
    // semi-implicit Euler in small substeps so big frame times stay stable
    const w = this.freq * Math.PI * 2;
    let left = Math.min(dt, 0.1);
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 240);
      const a = -w * w * (this.x - this.target) - 2 * this.damping * w * this.v;
      this.v += a * h;
      this.x += this.v * h;
      left -= h;
    }
    return this.x;
  }
  snap(x: number) {
    this.x = x;
    this.target = x;
    this.v = 0;
  }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
