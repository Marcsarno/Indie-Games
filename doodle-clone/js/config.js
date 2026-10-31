// ALL tunables live here. Units: world units (u). View is 9 u wide, height follows the phone's aspect.
export const C = {
  viewW: 9,
  g: 20,                 // gravity u/s^2 (floaty on purpose: kid-friendly, more time to steer)
  H: 5.5,                // normal jump apex height u
  maxVx: 7, accel: 45,   // horizontal speed cap and easing
  charH: 1.6,            // character height u (user: concept art was too big)
  footTol: 0.4,          // landing forgiveness each side of a platform u
  startFrac: 0.28,       // at the start she stands this far up from the bottom (user: keep her low so you see what is next)
  camTopFrac: 0.52,      // the camera only climbs so her jump APEX never goes above this fraction of the screen (landings stay low, ~20-30%)
  camTopFracRocket: 0.45,
  camRate: 8,
  compress: 0.05, release: 0.05,   // squash hold on landing (s), shared by every outfit
  trampMul: 2.2,         // trampoline jump = trampMul x H
  trampTop: 0.58,        // trampoline surface height above the platform u
  rocket: { dur: 3.0, vy: 11, ease: 1.0 },
  aimAssist: 1.2, rescue: true,
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
export const V0 = Math.sqrt(2 * C.g * C.H);
