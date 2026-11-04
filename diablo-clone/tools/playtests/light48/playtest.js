// round 48b: the new dungeon light and its switch on the map screen (LIGHT: NEW / OLD)
const L = [], shots = {};
const sum = () => { const d = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height).data; let s = 0; for (let k = 0; k < d.length; k += 4) s += d[k] + d[k + 1] + d[k + 2]; return Math.round(s / (d.length / 4)); };
newHero('warrior'); G.mode = 'play'; startLevel(3, 777); G.actCard = 0; enemies = [];
for (let i = 0; i < 300; i++) warmStep(30);
render(); const a = sum(); L.push({ dl48: DL48, ao: !!AO, mean: a });
showMap = true; render(); shots.map = cvs.toDataURL(); const b = UI.lightBtn;
const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
const r = cvs.getBoundingClientRect(), sc = r.width / W;
L.push({ btn: b });
setDL48(false); showMap = false; render(); L.push({ dl48: DL48, ao: !!AO, mean: sum() });
setDL48(true); render(); L.push({ dl48: DL48, ao: !!AO, mean: sum(), backToFirst: sum() === a });
// outdoors untouched
startLevel(1, 4242); G.actCard = 0; for (let i = 0; i < 200; i++) warmStep(30); render(); const o1 = sum(); setDL48(false); render(); const o0 = sum(); setDL48(true); L.push({ outdoorSame: o1 === o0, ao: AO });
window.__out = { log: L, shots };
