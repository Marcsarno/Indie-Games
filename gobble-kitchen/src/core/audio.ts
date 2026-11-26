// All sound is synthesized in code (effects, character babble, a soft music loop) except the narrator,
// whose short lines are generated at build time with Kokoro and shipped as small MP3s.
// Three buses (music, voice, effects) with separate volumes; "quiet" mutes everything and the game stays playable.
import { fetchBytes } from './bytes';

const voiceUrls = import.meta.glob('../assets/audio/voice/*/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface AudioSettings {
  music: number;
  voice: number;
  sfx: number;
  quiet: boolean;
  narrator: string;
}

const PENTA = [0, 2, 4, 7, 9];
/** i-th note of a major pentatonic scale above `base` Hz. */
export const penta = (i: number, base = 523.25) => base * Math.pow(2, (PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);

interface ToneOpts {
  freq: number;
  to?: number;          // slide target
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  attack?: number;
  when?: number;        // delay in seconds
  vibrato?: [number, number, number?]; // rate Hz, depth Hz, end rate
  lp?: number;          // lowpass cutoff
  trem?: [number, number]; // rate, depth 0..1
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  type?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  attack?: number;
  when?: number;
}

class AudioSys {
  ctx: AudioContext | null = null;
  settings: AudioSettings = { music: 0.6, voice: 1, sfx: 0.8, quiet: false, narrator: 'af_heart' };
  private master!: GainNode;
  private sfxBus!: GainNode;
  private voiceBus!: GainNode;
  private musicBus!: GainNode;
  private duck!: GainNode;
  private noiseBuf!: AudioBuffer;
  private voiceCache = new Map<string, Promise<AudioBuffer | null>>();
  private voiceNode: AudioBufferSourceNode | null = null;
  private musicTimer: number | null = null;
  private musicNext = 0;
  private musicStep = 0;
  voiceBusyUntil = 0;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem('gobble.audio') || 'null');
      if (saved) Object.assign(this.settings, saved);
    } catch { /* storage may be blocked; defaults are fine */ }
  }

  get narrators() {
    return [...new Set(Object.keys(voiceUrls).map((p) => p.split('/').slice(-2)[0]))].sort();
  }

  save() {
    try {
      localStorage.setItem('gobble.audio', JSON.stringify(this.settings));
    } catch { /* ignore */ }
    this.applyVolumes();
  }

  /** Must be called from the first tap (iOS only starts audio inside a user gesture). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx: AudioContext = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.voiceBus = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.duck = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.voiceBus.connect(this.master);
      this.musicBus.connect(this.duck).connect(this.master);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.startMusic();
      // warm the narrator lines we need first
      for (const id of ['welcome', 'pick']) this.loadVoice(id);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.quiet ? 0 : 0.9, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.voiceBus.gain.setTargetAtTime(s.voice * 1.25, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.32, t, 0.05); // roughly 10 dB under the voice
  }

  // ------------------------------------------------------------------ building blocks
  tone(o: ToneOpts) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.when ?? 0);
    const dur = o.dur ?? 0.15;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.setValueAtTime(o.vibrato[0], t0);
      if (o.vibrato[2]) lfo.frequency.linearRampToValueAtTime(o.vibrato[2], t0 + dur);
      lg.gain.value = o.vibrato[1];
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    const g = ctx.createGain();
    const vol = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let head: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      head.connect(f);
      head = f;
    }
    if (o.trem) {
      const tg = ctx.createGain();
      tg.gain.value = 1 - o.trem[1] / 2;
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = o.trem[0];
      lg.gain.value = o.trem[1] / 2;
      lfo.connect(lg).connect(tg.gain);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
      head.connect(tg);
      head = tg;
    }
    head.connect(g).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(o: NoiseOpts) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.when ?? 0);
    const dur = o.dur ?? 0.1;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1500, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------------ effects
  pop(p = 1, vol = 0.3) { this.tone({ freq: 620 * p, to: 300 * p, dur: 0.09, vol }); }
  tok() { this.tone({ freq: 330, to: 190, dur: 0.06, vol: 0.14, type: 'triangle' }); }
  /** Marimba-like note; i climbs the pentatonic scale so repeated taps always sound musical. */
  note(i: number, vol = 0.3, base = 523.25) {
    const f = penta(Math.min(i, 14), base);
    this.tone({ freq: f, dur: 0.5, vol, attack: 0.004 });
    this.tone({ freq: f * 4, dur: 0.09, vol: vol * 0.25 });
    this.tone({ freq: f * 2, dur: 0.22, vol: vol * 0.2, type: 'triangle' });
  }
  squelch(i = 0) {
    this.noise({ freq: 1100, to: 280, dur: 0.16, vol: 0.32, q: 1.4 });
    this.tone({ freq: 210, to: 85, dur: 0.14, vol: 0.34 });
    this.note(i, 0.14);
  }
  shhk(i = 0) {
    this.noise({ type: 'highpass', freq: 2200, to: 5200, dur: 0.11, vol: 0.2 });
    this.note(i, 0.12);
  }
  boing(p = 1) { this.tone({ freq: 190 * p, to: 330 * p, dur: 0.42, vol: 0.28, vibrato: [34, 30 * p, 12] }); }
  ping() {
    this.tone({ freq: 2093, dur: 0.7, vol: 0.2 });
    this.tone({ freq: 3136, dur: 0.45, vol: 0.1 });
    this.tone({ freq: 4186, dur: 0.2, vol: 0.06 });
  }
  clink(p = 1) {
    this.tone({ freq: 1750 * p, dur: 0.16, vol: 0.14 });
    this.tone({ freq: 2630 * p, dur: 0.1, vol: 0.08 });
  }
  ratchet(n = 3) {
    for (let k = 0; k < n; k++) this.noise({ type: 'highpass', freq: 3000, dur: 0.025, vol: 0.2, when: k * 0.05 });
    this.tone({ freq: 240, to: 300, dur: 0.14, vol: 0.12, type: 'square', lp: 900 });
  }
  glorp(i = 0) {
    this.tone({ freq: 150 + i * 25, to: 70, dur: 0.2, vol: 0.4 });
    this.noise({ type: 'lowpass', freq: 500, to: 160, dur: 0.2, vol: 0.3 });
    this.tone({ freq: 300 + i * 60, to: 520 + i * 60, dur: 0.07, vol: 0.14, when: 0.12 });
  }
  schlorp() {
    this.tone({ freq: 330, to: 75, dur: 0.6, vol: 0.4, type: 'sawtooth', lp: 620, trem: [19, 0.7] });
    this.noise({ freq: 900, to: 220, dur: 0.6, vol: 0.34, q: 2 });
    this.tone({ freq: 210, to: 55, dur: 0.16, vol: 0.5, when: 0.62 });
    this.noise({ type: 'lowpass', freq: 380, dur: 0.12, vol: 0.34, when: 0.62 });
  }
  wobble(i = 0) { this.tone({ freq: 250 * Math.pow(1.06, Math.min(i, 12)), dur: 0.5, vol: 0.26, vibrato: [11, 55, 7] }); }
  ding(p = 1, vol = 0.3) {
    for (const [m, v, d] of [[1, 1, 1.3], [2.01, 0.5, 0.9], [3.02, 0.25, 0.5]] as const) this.tone({ freq: 1318.5 * p * m, dur: d, vol: vol * v });
  }
  doorbell() {
    this.ding(0.5, 0.34);
    for (const [m, v, d] of [[1, 1, 1.5], [2.01, 0.5, 1.0]] as const) this.tone({ freq: 523.25 * m, dur: d, vol: 0.34 * v, when: 0.42 });
  }
  sparkle() { for (let k = 0; k < 6; k++) this.tone({ freq: penta(k + 10), dur: 0.22, vol: 0.1, when: k * 0.045 }); }
  whoosh() { this.noise({ freq: 500, to: 1900, dur: 0.3, vol: 0.14, q: 0.8, attack: 0.08 }); }
  thud() {
    this.tone({ freq: 120, to: 48, dur: 0.16, vol: 0.5 });
    this.noise({ type: 'lowpass', freq: 300, dur: 0.1, vol: 0.3 });
  }
  bubble() { this.tone({ freq: 420 + Math.random() * 300, to: 1100, dur: 0.08, vol: 0.16 }); }
  meow() {
    this.tone({ freq: 520, to: 760, dur: 0.16, vol: 0.2, type: 'sawtooth', lp: 1600 });
    this.tone({ freq: 760, to: 430, dur: 0.34, vol: 0.2, type: 'sawtooth', lp: 1300, when: 0.15 });
  }
  purr() { this.tone({ freq: 55, dur: 0.8, vol: 0.3, type: 'sawtooth', lp: 240, trem: [24, 0.9] }); }
  steam() { this.noise({ type: 'highpass', freq: 3500, dur: 0.5, vol: 0.06, attack: 0.15 }); }
  shutter() {
    this.noise({ type: 'highpass', freq: 2500, dur: 0.03, vol: 0.3 });
    this.noise({ type: 'highpass', freq: 1800, dur: 0.05, vol: 0.3, when: 0.09 });
  }
  fanfare() {
    [0, 2, 4, 5, 7].forEach((n, k) => {
      this.tone({ freq: penta(n), dur: 0.45, vol: 0.24, when: k * 0.11 });
      this.tone({ freq: penta(n) / 2, dur: 0.3, vol: 0.12, type: 'triangle', when: k * 0.11 });
    });
  }
  jingle() { [0, 2, 4, 7].forEach((n, k) => { this.tone({ freq: penta(n), dur: 0.35, vol: 0.24, when: k * 0.1 }); this.tone({ freq: penta(n) * 2, dur: 0.2, vol: 0.08, type: 'triangle', when: k * 0.1 }); }); }
  creak() { this.tone({ freq: 180, to: 260, dur: 0.3, vol: 0.1, type: 'sawtooth', lp: 700, vibrato: [22, 18] }); }
  brr() { this.noise({ type: 'bandpass', freq: 700, to: 1400, dur: 0.35, vol: 0.1, attack: 0.1 }); this.sparkle(); }

  /** Animalese-style babble: short pitched blips, one per syllable. */
  babble(pitch = 300, syllables = 4, speed = 0.085, vol = 0.2, gobble = false) {
    for (let k = 0; k < syllables; k++) {
      const f = pitch * (0.85 + Math.random() * 0.45);
      this.tone({ freq: f, to: f * (0.85 + Math.random() * 0.25), dur: speed * 0.9, vol, type: 'triangle', when: k * speed, trem: gobble ? [26, 0.9] : undefined });
      this.tone({ freq: f * 2, dur: speed * 0.5, vol: vol * 0.3, type: 'square', lp: 2400, when: k * speed });
    }
    return syllables * speed;
  }
  cheer() {
    for (let k = 0; k < 5; k++) setTimeout(() => this.babble(260 + Math.random() * 380, 3, 0.07, 0.12), k * 70);
    this.sparkle();
  }

  // ------------------------------------------------------------------ narrator
  private loadVoice(id: string) {
    const key = `${this.settings.narrator}/${id}`;
    let p = this.voiceCache.get(key);
    if (!p) {
      const url = Object.entries(voiceUrls).find(([path]) => path.endsWith(`/${key}.mp3`))?.[1];
      p = url && this.ctx ? fetchBytes(url).then((b) => this.ctx!.decodeAudioData(b)).catch(() => null) : Promise.resolve(null);
      this.voiceCache.set(key, p);
    }
    return p;
  }

  preloadVoices(ids: string[]) { ids.forEach((id) => this.loadVoice(id)); }

  /** Speak a narrator line (replaces the one playing). Resolves with its length in seconds (0 if unavailable). */
  async say(id: string): Promise<number> {
    if (!this.ctx) return 0;
    const buf = await this.loadVoice(id);
    if (!buf || !this.ctx) return 0;
    try { this.voiceNode?.stop(); } catch { /* already stopped */ }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceBus);
    src.start();
    this.voiceNode = src;
    const t = this.ctx.currentTime;
    this.voiceBusyUntil = t + buf.duration;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setTargetAtTime(0.35, t, 0.05);
    this.duck.gain.setTargetAtTime(1, t + buf.duration + 0.15, 0.3);
    return buf.duration;
  }

  // ------------------------------------------------------------------ music: a calm generated loop
  private startMusic() {
    if (this.musicTimer !== null || !this.ctx) return;
    this.musicNext = this.ctx.currentTime + 0.3;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
  }

  private pluck(freq: number, when: number, vol: number, dur: number, type: OscillatorType = 'triangle') {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, when);
    f.frequency.exponentialRampToValueAtTime(500, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(f).connect(g).connect(this.musicBus);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const beat = 60 / 76 / 2; // eighth notes at 76 bpm
    // chords as semitones from C3: C, Am, F, G, C, Em, F, G
    const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-8, -5, -1], [-7, -3, 0], [-5, -1, 2]];
    const melody = [12, -1, 16, -1, 19, 16, -1, -1, 21, -1, 19, -1, 16, -1, -1, -1, 17, -1, 21, -1, 24, 21, -1, -1, 19, -1, 16, -1, 14, -1, -1, -1,
      12, -1, 16, -1, 19, -1, 24, -1, 23, -1, 19, -1, 16, -1, -1, -1, 17, -1, 16, -1, 14, -1, 12, -1, 14, -1, -1, -1, 7, -1, -1, -1];
    const hz = (semi: number) => 130.81 * Math.pow(2, semi / 12);
    while (this.musicNext < ctx.currentTime + 0.6) {
      const s = this.musicStep % 64;
      const chord = chords[Math.floor(s / 8)];
      const t = this.musicNext;
      if (s % 8 === 0) this.pluck(hz(chord[0] - 12), t, 0.5, 1.8, 'sine');
      const arp = [0, 2, 1, 2, 0, 2, 1, 2][s % 8];
      this.pluck(hz(chord[arp] + 12), t, 0.16, 0.6);
      const m = melody[s];
      if (m >= 0) this.pluck(hz(m + 12), t, 0.2, 0.9, 'sine');
      this.musicNext += beat;
      this.musicStep++;
    }
  }
}

export const audio = new AudioSys();
