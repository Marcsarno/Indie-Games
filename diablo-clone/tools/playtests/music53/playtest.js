// round 53: which song each place asks for: the camp, the woods (the title song first), the wolf den
// (the entering song, not the boss music), the mine, the King's hall
const L = []; SFX.muted = false;
newHero('warrior'); G.mode = 'play'; G.story = { f: { met: true, woodTold: true }, n: 0 };
const at = (name, fn) => { fn(); L.push({ [name]: musicWanted() }); };
at('camp', () => { startLevel(1, 4242); hero.fi = HUB.camp[0]; hero.fj = HUB.camp[1]; });
at('woods', () => { hero.fi = HUB.den[0]; hero.fj = HUB.den[1] + 4; });
at('wolf den', () => startLevel(1, 4242, 'den'));
at('barrow', () => { startLevel(1, 4242); hero.fi = HUB.barrow[0]; hero.fj = HUB.barrow[1] + 4; musicWanted(); startLevel(1, 4242, 'barrow'); });
at('mine floor 1', () => { startLevel(2, 4242); musicWanted(); startLevel(3, 77); });
at('king hall', () => startLevel(5, 99));
L.push({ lists: PLAYLISTS });
window.__out = { log: L, shots: {} };
