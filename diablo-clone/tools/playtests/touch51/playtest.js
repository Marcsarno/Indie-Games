// round 51: a thumb landing on a person on the move side starts the stick (no walking off to them);
// a quick tap on a person still walks over to talk; a touch the browser takes over releases the stick
const L = [];
newHero('warrior'); G.mode = 'play'; G.story = { f: { met: true, woodTold: true }, n: 0 }; startLevel(1, 4242); G.actCard = 0;
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
const b = cvs.getBoundingClientRect(), sc = b.width / W;
const ev = (type, x, y, id) => cvs.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: b.left + x * sc, clientY: b.top + y * sc, bubbles: true, pointerType: 'touch' }));
// put someone under the left thumb: the hero a little right of Wren so she sits at the left of the screen
const w = npcs.find(n => n.role === 'wren'); hero.fi = w.fi + 3.5; hero.fj = w.fj - 3.5; run(2); render();
const [sx, sy] = iso(w.fi, w.fj).map((v, k) => v - (k ? camY : camX)), p = [Math.round(sx), Math.round(sy - 20)];
L.push({ wrenOnScreen: p, inStickZone: p[0] < W * 0.55, npcAt: (npcAtScreen(p) || {}).role });
// hold and drag down-left for a second
const f0 = [hero.fi, hero.fj]; ev('pointerdown', p[0], p[1], 7); for (let k = 0; k < 6; k++) { ev('pointermove', p[0] - k * 4, p[1] + k * 4, 7); run(1); } run(50);
L.push({ drag: { goTalk: !!hero.goTalk, moved: +Math.hypot(hero.fi - f0[0], hero.fj - f0[1]).toFixed(2), stickHeld: stick.id === 7 } });
ev('pointerup', p[0] - 20, p[1] + 20, 7); run(2); L.push({ afterUp: { stickHeld: stick.id !== null, mx: input.mx } });
// a quick tap on her
hero.fi = w.fi + 3.5; hero.fj = w.fj - 3.5; run(2); render(); ev('pointerdown', p[0], p[1], 8); ev('pointerup', p[0], p[1], 8);
L.push({ tap: { goTalk: hero.goTalk && hero.goTalk.role } }); hero.goTalk = null;
// the browser takes the touch: the stick lets go
ev('pointerdown', 40, H - 60, 9); ev('pointermove', 20, H - 60, 9); run(2); const held = stick.id === 9;
cvs.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 9, bubbles: true })); run(2);
L.push({ lost: { wasHeld: held, released: stick.id === null && input.mx === 0 } });
ev('pointerdown', 40, H - 60, 10); ev('pointermove', 20, H - 60, 10); window.dispatchEvent(new Event('blur')); L.push({ blur: { released: stick.id === null && input.mx === 0 } });
window.__out = { log: L, shots: {} };
