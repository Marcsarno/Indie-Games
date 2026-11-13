// Round 112: journey sets (the user: "I really want to see the sets"). Through Act I (levels 1-10) each
// class walks through five matched outfits, one per two levels; the user approved the five per class
// (tools/playtests/r111/journey.cjs draws them). How it works:
// - a helm or chest that drops at or under level 11 is the area's set piece (the slot the hero is still
//   missing from that set comes first); weapons, rings, set items and legendaries drop as before;
// - an area's boss always drops the set piece the hero is still missing;
// - the look follows the chest: wear a set's chest and the helm takes on that set's helm, so the hero is
//   always in one matched outfit (the helm keeps its own stats and name);
// - putting on a new set shows it: NEW LOOK and the set's name over the hero, with a burst of light;
// - the bag's empty detail card shows the journey: the five sets, the ones reached lit.
const JOURNEY = {   // [set name, chest, helm] for levels 1-2, 3-4, 5-6, 7-8, 9-10
  warrior: [['HIDE', 'b_hide', 'b_band'], ['BEARHIDE', 'b_bear', 'b_skull'], ['TUSKBREAKER', 'bt_tusk', 'bt_boar'], ['THUNDERHORN', 'bt_thunder', 'bt_ram'], ['MAMMOTH', 'bt_mammoth', 'bt_mskull']],
  paladin: [['SQUIRE', 'pal_plate1', 'pal_helm1'], ['WINTER BULWARK', 'winter_bulwark_mail', 'winter_bulwark_helm'], ['SILVER VIGIL', 'pt_vigil_plate', 'pt_vigil_helm'], ['AURIC', 'pt_auric_plate', 'pt_auric_helm'], ['SERAPH', 'pt_seraph_plate', 'pt_seraph_helm']],
  mage: [['WAYFARER', 'wayfarer_robe', 'wayfarer_hat'], ['CRIMSON ORACLE', 'rose_oracle_robe', 'rose_oracle_hat'], ['STORMCALLER', 'mt_storm_robe', 'mt_storm_hat'], ['STARSEER', 'mt_star_robe', 'mt_star_hat'], ['ECLIPSE', 'mt_eclipse_robe', 'mt_eclipse_hat']],
  ranger: [['LEATHER', 'leather_jerkin', 'ranger_hood'], ['THORN SENTINEL', 'thorn_sentinel_jerkin', 'rt_thorn_hood'], ['FALCONER', 'rt_falconer_jerkin', 'rt_falconer_hood'], ['ANTLER WARDEN', 'rt_antler_jerkin', 'rt_antler_hood'], ['WILDHEART', 'rt_wildheart_jerkin', 'rt_wildheart_hood']],
};
const J_TOP = 11;   // past this level (Act II on) gear drops as it always did
const jBand = lvl => clamp(Math.floor((Math.round(lvl) - 1) / 2), 0, 4);
const jSets = () => JOURNEY[heroCls()] || JOURNEY.warrior;
function jBandOf(base) { if (!base) return -1; const r = rootOf(base), S = jSets(); for (let b = 0; b < S.length; b++) if (S[b][1] === r || S[b][2] === r) return b; return -1; }
const jOwned = id => [...Object.values(hero.equip), ...hero.bag].some(it => it && rootOf(it.base) === id);
function jMissing(level) {   // the set piece of this level's band the hero has neither worn nor carried, chest first
  const S = jSets()[jBand(level)]; return !jOwned(S[1]) ? S[1] : !jOwned(S[2]) ? S[2] : null;
}

// ---------------------------------------------------------------- drops
{ const ri0 = rollItem; rollItem = function (R, level, forceBase) {
  const it = ri0(R, level, forceBase);
  if (forceBase || !(level <= J_TOP) || !it || it.rarity === 'set' || it.rarity === 'legend' || typeof hero === 'undefined' || !hero.equip) return it;
  const slot = ITEM_BASES[it.base].slot; if (slot !== 'helm' && slot !== 'chest') return it;
  const S = jSets()[jBand(level)], mine = slot === 'chest' ? S[1] : S[2], other = slot === 'chest' ? S[2] : S[1];
  const pick = jOwned(mine) && !jOwned(other) ? other : mine;   // the piece still missing first
  const x = ri0(R, level, pick); x.lvl = it.lvl; return x;
}; }
{ const dl0 = dropLoot; dropLoot = function (fi, fj, n, rich) {   // an area's boss (G.lootBoss, set by killEnemy) leaves the missing piece
  dl0(fi, fj, n, rich);
  if (!G.lootBoss || !(LV.diff <= J_TOP)) return;
  const id = jMissing(LV.diff); if (!id) return;
  const it = rollItem(rng((Math.random() * 1e9) | 0), LV.diff, id); if (it.rarity === 'normal') { it.rarity = 'magic'; it.mods = { hp: 6 + Math.round(LV.diff * 2) }; }
  groundItems.push({ item: it, fi: fi + 0.45, fj: fj - 0.35, t: 0 });
}; }

// ---------------------------------------------------------------- the look: the chest decides the outfit
{ const rcJ = recalcHero; recalcHero = function (...a) {
  const r = rcJ(...a), e = hero.equip, c = e.chest, h = e.helm, b = c ? jBandOf(c.base) : -1;
  if (hero.look && b >= 0 && h && h.rarity !== 'set' && h.rarity !== 'legend' && c.rarity !== 'set') hero.look.helm = ITEM_BASES[jSets()[b][2]].look;
  if (hero._jb !== undefined && b > hero._jb && G.mode !== 'title') G.newLook = { name: jSets()[b][0], t: 0, shown: false };   // a new set: show it once back in the game
  hero._jb = b; return r;
}; }
{ const nhJ = newHero; newHero = function (cls, ...rest) {
  hero._jb = undefined; const r = nhJ(cls, ...rest);
  if ((cls || hero.cls) === 'mage' && hero.equip) {   // the mage starts in the first journey set (it was the apprentice robe and the plain hat)
    const mk = id => { const it = rollItem(rng(7), 1, id); it.rarity = 'normal'; it.mods = {}; return it; };
    hero.equip.chest = mk('wayfarer_robe'); hero.equip.helm = mk('wayfarer_hat'); hero._jb = undefined; recalcHero();
  }
  hero._jb = hero.equip && hero.equip.chest ? jBandOf(hero.equip.chest.base) : -1;
  return r;
}; }

// ---------------------------------------------------------------- NEW LOOK, over the hero, back in the game
function updateNewLook(dt) {
  const N = G.newLook; if (!N || G.mode !== 'play') return;
  if (!N.shown) { N.shown = true; sfx('chest'); const [x, y] = screenOf(hero); burst(4, x, y, 20, 18, 46, 51); burst(4, x, y, 30, 10, 30, 27); }
  N.t += dt; if (N.t > 2.8) G.newLook = null;
}
{ const dhJ = drawHud; drawHud = function (...a) {
  const r = dhJ(...a), N = G.newLook;
  if (N && N.shown && G.mode === 'play') {
    const k = N.t < 0.25 ? N.t / 0.25 : N.t > 2.3 ? (2.8 - N.t) / 0.5 : 1, [x, y] = screenOf(hero), sx = Math.round(clamp(x - camX, 50, W - 50)), ty = Math.round(y - camY - 62 - (1 - Math.min(1, N.t / 0.4)) * 8);
    if (BAYER[((G.t * 60) | 0) & 15] < k) { textC('NEW LOOK', sx, ty, 51, 1); textC(N.name, sx, ty + 9, 27, 2); }
  }
  return r;
}; }
{ const upJ = update; update = function (dt) { const r = upJ(dt); updateNewLook(dt); return r; }; }

// ---------------------------------------------------------------- the journey, in the bag's empty card
{ const diJ = drawInventory; drawInventory = function (...a) {
  const r = diJ(...a);
  if (INV.sel && INV.sel.item) return r;
  const C = invLayout().card, S = jSets(), now = hero._jb, reach = Math.max(now, jBand(hero.lvl)), cw = Math.floor((C.w - 10) / 5), y0 = C.y + 40;
  textC('YOUR JOURNEY', C.x + C.w / 2, y0 - 8, 50); const bs = budgetOff();   // (all five built now: a menu can take the moment)
  S.forEach(([name, chest, helm], n) => {
    const x = C.x + 5 + n * cw, cx = x + cw / 2, lit = n <= reach, look = { ...hero.look, chest: ITEM_BASES[chest].look, helm: ITEM_BASES[helm].look, set: '', lgd: null };
    if (n === now) frame(x + 1, y0, cw - 2, 92, 51, 2);
    sprite(getSprite('hero', look, 1, 'idle', n === now ? Math.floor(G.t / 0.2) % 4 : 0, { look, cls: hero.cls, combo: 0 }, 1), Math.round(cx), y0 + 62, 1, lit ? L_ID : 1);   // (the game's own size: five fit side by side)
    textC('LV ' + (n * 2 + 1) + '-' + (n * 2 + 2), cx, y0 + 72, lit ? 26 : 24);
    name.split(' ').forEach((w, q) => textC(w, cx, y0 + 80 + q * 7, n === now ? 51 : lit ? 25 : 6));
  });
  budgetOn(bs);
  return r;
}; }
