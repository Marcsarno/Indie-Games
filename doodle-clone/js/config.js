// ALL tunables live here. Units: world units (u). View is 9 u wide, height follows the phone's aspect.
export const C = {
  viewW: 9,
  g: 40,                 // gravity u/s^2 (round 2: was 20, user: 'too floaty'); up-time = sqrt(2H/g) = 0.5 s
  H: 5.0,                // normal jump apex height u
  maxVx: 9, accel: 90, decel: 120,   // horizontal speed cap; snappy start and quick stop when you let go (was 7/45, no decel)
  charH: 1.6,            // character height u (user: concept art was too big)
  footTol: 0.4,          // landing forgiveness each side of a platform u
  startFrac: 0.25,       // at the start she stands this far up from the bottom (user: keep her low so you see what is next)
  camLandFrac: 0.25,     // round 2: the camera glides so the LAST PLATFORM YOU LANDED ON sits 25% up (smooth climb, no lurch at every apex)
  camGlide: 3,           // how fast it glides there (1/s)
  camLeadT: 0.7,         // while climbing, frame the platform you will probably land on next (s of climb ahead)
  camTopFrac: 0.6,       // also glide so her current height is <= ~60% (keeps the camera moving smoothly while you climb)
  camTopFracRocket: 0.45,
  camRate: 12,
  hold: 0,               // round 2: no pause on landing (it felt sticky). The crouch frames play during the first 'release' s of the rise instead.
  compress: 0.05, release: 0.08,
  trampMul: 2.2,         // trampoline jump = trampMul x H
  trampTop: 0.58,        // trampoline surface height above the platform u
  rocket: { dur: 2.5, vy: 16, ease: 0.7 },
  aimAssist: 0, rescue: true,   // aim assist off (round 2: it moved her without input, part of 'controls are bad')
  control: 'finger',     // 'finger' = she follows your finger left/right (default), 'sides' = hold left/right half
  platTopFrac: 0.30,     // landing line is this fraction down from the top of the slab sprite
  step: 1 / 120,
  // difficulty ladder: heights in u. Flat start, long easy stretch, late ramp. Blended over 30 u at each zone start.
  zones: [
    { h: 0,   slider: 0,    crumbly: 0,    gap: [0.22, 0.34], w: [2.9, 3.0], sspeed: 1.0 },
    { h: 100, slider: 0.20, crumbly: 0,    gap: [0.26, 0.42], w: [2.7, 2.9], sspeed: 1.1 },
    { h: 250, slider: 0.20, crumbly: 0.20, gap: [0.28, 0.48], w: [2.5, 2.8], sspeed: 1.3 },
    { h: 500, slider: 0.25, crumbly: 0.25, gap: [0.30, 0.54], w: [2.3, 2.6], sspeed: 1.6 },
    { h: 900, slider: 0.30, crumbly: 0.30, gap: [0.34, 0.60], w: [2.0, 2.4], sspeed: 2.0 },
  ],
  // outfits: lifetime candy needed
  outfits: [
    { id: 'witch', name: 'Witch', emoji: '🧙', need: 0 },
    { id: 'fairy', name: 'Fairy', emoji: '🧚', need: 50 },
    { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', need: 150 },
    { id: 'ghost', name: 'Ghost', emoji: '👻', need: 300 },
    { id: 'astronaut', name: 'Astronaut', emoji: '👩‍🚀', need: 500 },
  ],
};
export const v0 = () => Math.sqrt(2 * C.g * C.H);   // a function so the tune panel can change g/H live
