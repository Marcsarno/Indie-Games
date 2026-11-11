'use strict';
// Round 96: the camp's MERCHANT and BLACKSMITH get screens of their own (the user: gold is the one
// currency; salvage stays the easy way to turn loot into gold; potions only drop).
// MERCHANT: buy from a few wares that change after every trip out of camp, sell what you carry, and
// one SHOWCASE piece behind glass: a legendary or a set piece, dear, to save up for. SAVE keeps it
// (until you buy it or tap UNSAVE); unsaved, it is gone after your next trip and something new is there.
// BLACKSMITH: upgrade any piece of gear to +1, +2 and +3 for gold. Each step adds about an eighth to
// a weapon's damage or an armor's protection (or to a ring's or amulet's every bonus); a +3 weapon shines.
const UP_MAX = 3;
const UP_K = { dmg: 0.13, armor: 0.15, mod: 0.12 };
// what the next step costs: more each step, more for better and higher gear
const upCost = it => { const u = it.up || 0, rk = { normal: 1, magic: 1.2, rare: 1.5, set: 2, legend: 2.5 }[it.rarity] || 1; return Math.round((18 + itemLvl(it) * 10) * rk * [1, 2.4, 4.8][u] / 5) * 5; };
// an item's stats with its upgrades (items.js itemStats calls this for weapons and armor)
function upStats(o, up) {
  if (o.dmg) o.dmg = [Math.round(o.dmg[0] * (1 + UP_K.dmg * up)), Math.max(o.dmg[1] + up, Math.round(o.dmg[1] * (1 + UP_K.dmg * up)))];   // (at least +1 a step on the top end)
  if (o.armor) o.armor = Math.max(o.armor + up, Math.round(o.armor * (1 + UP_K.armor * up)));
  return o;
}
function upgradeItem(it) {
  if ((it.up || 0) >= UP_MAX) return false;
  const c = upCost(it); if (hero.gold < c) return false;
  hero.gold -= c; it.up = (it.up || 0) + 1;
  if (JEWELRY[ITEM_BASES[it.base].slot]) for (const k in it.mods) if (typeof it.mods[k] === 'number') it.mods[k] += Math.max(1, Math.round(it.mods[k] * UP_K.mod));   // a ring or an amulet: every bonus grows
  recalcHero(); prewarmHero();
  return true;
}
// ---------------------------------------------------------------- the merchant's stock
const SHOP_N = 4;
const buyPrice = it => { const v = itemValue(it) * (it.rarity === 'legend' || it.rarity === 'set' ? 3.5 : 3); return Math.round(v * (G.story && G.story.f && G.story.f.farmPaid ? 0.85 : 1) / 5) * 5; };   // (Hollis's reward: fairer prices)
const sellPrice = it => Math.round(itemValue(it) * 1.25);   // she pays a little more than salvage
function shopLevel() { return Math.max(1, hero.lvl); }   // the wares are at the hero's level
function rollWares() {
  const R = rng((Math.random() * 1e9) | 0), lv = shopLevel(), out = [];
  for (let n = 0; n < SHOP_N; n++) {
    let it = null;
    for (let t = 0; t < 80; t++) { it = rollItem(R, lv); if (it.rarity === 'magic' || it.rarity === 'rare') break; }   // no greys; the showcase has the best
    it.lvl = lv; out.push(it);
  }
  return out;
}
function rollShowcase() {
  const R = rng((Math.random() * 1e9) | 0), lv = shopLevel() + 1;
  const it = R() < 0.6 ? rollLegendary(R) : rollSetItem(R); it.lvl = lv;
  return it;
}
function shopState() {
  if (!G.shop) G.shop = { wares: rollWares(), show: rollShowcase(), saved: false, away: false };
  return G.shop;
}
// called as each level starts: a trip out of camp, then back, brings new wares (and a new showcase piece unless it was saved)
function shopOnLevel() {
  if (!G.shop || PREVIEW) return;
  if (LV.area !== 'town') { G.shop.away = true; return; }
  if (!G.shop.away) return;
  G.shop.away = false; G.shop.wares = rollWares();
  if (!G.shop.saved || !G.shop.show) { G.shop.show = rollShowcase(); G.shop.saved = false; }
}
// ---------------------------------------------------------------- screens
const SHOP = { tab: 'buy', sel: null, flash: null, L: null };   // sel: { item, from: 'wares'|'show'|'bag'|'equip', slot }
function openShop(kind) { G.mode = kind; SHOP.tab = 'buy'; SHOP.sel = null; SHOP.flash = null; clearInput(); if (kind === 'shop') shopState(); sfx('tap'); }
function closeShop() { G.mode = 'play'; SHOP.sel = null; saveGame(); }
const shopFlash = (text, col) => { SHOP.flash = { text, col, t: G.t }; };
function screenBack() { fillRect(0, 0, W, H, 2); for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 4) put(x, y, 3); }
function slotBox(r, it, sel, extra) {
  const special = it && (it.rarity === 'legend' || it.rarity === 'set') ? RARITY_COL[it.rarity] : 6;
  fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, sel ? 51 : special, 3);
  if (!it) return;
  sprite(itemIcon(it), r.x + Math.round(r.w / 2), r.y + Math.round(r.h / 2) + 6, 1, 4);
  fillRect(r.x + 2, r.y + r.h - 3, 4, 1, RARITY_COL[it.rarity]);
  if (it.up) upBadge(r.x + r.w - 9, r.y + 2, it.up);
  if (extra) extra(r, it);
}
// the gold +N in a slot's corner
function upBadge(x, y, n) { fillRect(x - 1, y - 1, 9, 7, BLK); text('+' + n, x, y, n >= UP_MAX ? 27 : 51, 1, false); }
// a card: the item's name and stats, the worn one beside it when it would replace it
function itemCard(C, it, opts = {}) {
  fillRect(C.x, C.y, C.w, C.h, 3); frame(C.x, C.y, C.w, C.h, 8, 4);
  if (!it) { (opts.hint || []).forEach((l, n) => textC(l, W / 2, C.y + 12 + n * 10, n ? 24 : 25)); return; }
  const b = ITEM_BASES[it.base], col = C.w / 2 - 6, cut = s => s.length * 4 > col ? s.slice(0, Math.floor(col / 4)) : s;
  const cur = opts.compare && canWear(it) ? hero.equip[b.slot] : null, vy = C.y + 6;
  const lines = opts.lines || [...['ITEM LEVEL ' + itemLvl(it)], ...itemLines(it)];
  text(cut(itemName(it)), C.x + 6, vy, RARITY_COL[it.rarity]);
  lines.slice(0, opts.max || 8).forEach((l, n) => text(cut(l), C.x + 6, vy + 9 + n * 7, n === 0 ? 24 : 26));
  if (opts.compare && !canWear(it)) textC('NOT FOR YOUR CLASS', C.x + C.w * 0.75, vy + 9, 23);
  if (cur && cur !== it) {
    const x2 = C.x + C.w / 2 + 2;
    for (let y = vy - 2; y < vy + 64; y++) put(C.x + C.w / 2 - 2, y, 5);
    text('WORN NOW', x2, vy, 24); text(cut(itemName(cur)), x2, vy + 9, RARITY_COL[cur.rarity]);
    itemLines(cur).slice(0, 6).forEach((l, n) => text(cut(l), x2, vy + 18 + n * 7, 24));
    const ch = compareLines(it, cur); if (ch.length) { const [l, c] = ch[ch.length - 1]; textC(l, W / 2, vy + 70, c); }
  }
}
function bigButton(L, label, x, y, w, h, on, lit, col = 53) {
  const pulse = Math.floor(G.t * 4) % 2;
  fillRect(x, y, w, h, lit ? col : 5); frame(x, y, w, h, lit ? (pulse ? col + 2 : col + 1) : 8, 2); textC(label, x + w / 2, y + Math.floor(h / 2) - 2, lit ? 27 : 24);
  L.btns.push({ x, y, w, h, on });
}
function shopHeader(L, title) {
  text(title, 6, 6, 51, 2);
  text(`GOLD ${hero.gold}`, 6, 22, 50);
  fillRect(L.close.x, L.close.y, L.close.w, L.close.h, 20); frame(L.close.x, L.close.y, L.close.w, L.close.h, 51, 49); textC('CLOSE', L.close.x + L.close.w / 2, L.close.y + 7, 27);
}
// ---- the merchant
function shopLayout() {
  const L = { close: { x: W - 56, y: 3, w: 52, h: 20 }, btns: [], tabs: { buy: { x: 6, y: 32, w: 60, h: 16 }, sell: { x: 70, y: 32, w: 60, h: 16 } } };
  L.show = { x: 6, y: 64, w: W - 12, h: 60 }; L.showIcon = { x: 12, y: 70, w: 46, h: 48 };
  L.wares = []; const ww = Math.floor((W - 12 - 3 * 6) / 4); for (let n = 0; n < SHOP_N; n++) L.wares.push({ x: 6 + n * (ww + 6), y: 142, w: ww, h: 44 });
  L.bag = []; for (let n = 0; n < BAG_SIZE; n++) L.bag.push({ x: 15 + (n % 6) * 41, y: 56 + Math.floor(n / 6) * 40, w: 34, h: 30 });
  L.card = { x: 6, y: 204, w: W - 12, h: H - 210 };
  return L;
}
function drawShop() {
  screenBack();
  const L = shopLayout(), S = shopState(), pulse = Math.floor(G.t * 4) % 2;
  shopHeader(L, 'MERCHANT');
  for (const k of ['buy', 'sell']) { const r = L.tabs[k], sel = SHOP.tab === k; fillRect(r.x, r.y, r.w, r.h, sel ? 5 : 3); frame(r.x, r.y, r.w, r.h, sel ? 51 : 8, sel ? 50 : 3); textC(k.toUpperCase(), r.x + r.w / 2, r.y + 6, sel ? 27 : 25); }
  const sel = SHOP.sel;
  if (SHOP.tab === 'buy') {
    // the showcase: behind glass, with a glow in its color
    const sh = S.show, r = L.show, c = sh ? RARITY_COL[sh.rarity] : 8;
    fillRect(r.x, r.y, r.w, r.h, 4); frame(r.x, r.y, r.w, r.h, sel && sel.from === 'show' ? 51 : c, 3);
    text('SHOWCASE', r.x, r.y - 9, 26);
    if (sh) {
      const ic = L.showIcon, gl = 0.5 + 0.5 * Math.sin(G.t * 3);
      fillRect(ic.x, ic.y, ic.w, ic.h, 2);
      for (let y = ic.y; y < ic.y + ic.h; y++) for (let x = ic.x; x < ic.x + ic.w; x++) { const d = Math.hypot((x - ic.x - ic.w / 2) / ic.w, (y - ic.y - ic.h / 2) / ic.h); if (BAYER[((y & 3) << 2) | (x & 3)] < (0.5 - d) * (0.6 + gl * 0.6)) put(x, y, c); }
      frame(ic.x, ic.y, ic.w, ic.h, c, 3);
      sprite(itemIcon(sh), ic.x + ic.w / 2, ic.y + ic.h / 2 + 16, 2, 4);
      const tx = ic.x + ic.w + 8, p = buyPrice(sh);
      text(itemName(sh), tx, r.y + 8, c);
      text(ITEM_BASES[sh.base].name + '  LEVEL ' + itemLvl(sh), tx, r.y + 17, 24);
      text(`${p} GOLD`, tx, r.y + 28, hero.gold >= p ? 50 : 22);
      text(S.saved ? 'KEPT FOR YOU' : 'GONE AFTER YOUR NEXT TRIP', tx, r.y + 38, S.saved ? 55 : 24);
      const sb = { x: r.x + r.w - 66, y: r.y + r.h - 22, w: 60, h: 16 };
      fillRect(sb.x, sb.y, sb.w, sb.h, S.saved ? 50 : 5); frame(sb.x, sb.y, sb.w, sb.h, S.saved ? 51 : 8, 2); textC(S.saved ? 'UNSAVE' : 'SAVE', sb.x + sb.w / 2, sb.y + 5, 27);
      if (S.saved) for (let k = 0; k < 3; k++) put(sb.x + 4 + k, sb.y + 6 + k, 27), put(sb.x + 6 + k, sb.y + 8 - k * 2, 27);
      L.save = sb;
    } else textC('SOLD. SOMETHING NEW AFTER YOUR NEXT TRIP', W / 2, r.y + 28, 24);
    text('WARES', 6, 132, 26); text('NEW AFTER EVERY TRIP OUT', W - 6 - textWidth('NEW AFTER EVERY TRIP OUT'), 132, 24);
    L.wares.forEach((rr, n) => {
      const it = S.wares[n];
      slotBox({ x: rr.x, y: rr.y, w: rr.w, h: rr.h - 10 }, it, sel && sel.from === 'wares' && sel.item === it);
      if (it) { const p = buyPrice(it); textC(`${p}G`, rr.x + rr.w / 2, rr.y + rr.h - 7, hero.gold >= p ? 50 : 22); }
      else textC('SOLD', rr.x + rr.w / 2, rr.y + 12, 6);
    });
    const it = sel && (sel.from === 'wares' || sel.from === 'show') ? sel.item : null;
    itemCard(L.card, it, { compare: true, hint: ['TAP AN ITEM TO SEE IT', 'SAVE THE SHOWCASE PIECE TO KEEP IT'] });
    if (it) {
      const p = buyPrice(it), can = hero.gold >= p && hero.bag.length < BAG_SIZE;
      bigButton(L, `BUY ${p} GOLD`, W / 2 - 60, L.card.y + L.card.h - 30, 120, 24, () => buy(it, sel.from), can, 49);
    }
  } else {
    L.bag.forEach((r, n) => {
      const it = hero.bag[n];
      slotBox(r, it, sel && sel.from === 'bag' && sel.item === it);
      if (it && ITEM_BASES[it.base].slot !== 'potion') textC(`${sellPrice(it)}`, r.x + r.w / 2, r.y + r.h + 2, 50);
    });
    const it = sel && sel.from === 'bag' ? sel.item : null;
    itemCard(L.card, it, { compare: true, hint: ['TAP AN ITEM TO SELL IT', 'SHE PAYS A LITTLE MORE THAN SALVAGE'] });
    const jk = junk();
    if (it) bigButton(L, `SELL ${sellPrice(it)} GOLD`, L.card.x + 8, L.card.y + L.card.h - 30, 116, 24, () => sell([it]), true, 49);
    bigButton(L, jk.length ? `SELL WORSE (${jk.length})` : 'NOTHING WORSE', L.card.x + L.card.w - 124, L.card.y + L.card.h - 30, 116, 24, () => { if (jk.length) sell(jk); }, jk.length > 0, 49);
  }
  if (SHOP.flash && G.t - SHOP.flash.t < 1.6) textC(SHOP.flash.text, W / 2, 195, SHOP.flash.col);
  SHOP.L = L;
}
function buy(it, from) {
  const S = shopState(), p = buyPrice(it);
  if (hero.bag.length >= BAG_SIZE) { shopFlash('YOUR BAG IS FULL', 22); sfx('tap'); return; }
  if (hero.gold < p) { shopFlash('NOT ENOUGH GOLD', 22); sfx('tap'); return; }
  hero.gold -= p; it.isNew = true; hero.bag.push(it);
  if (from === 'show') { S.show = null; S.saved = false; } else S.wares[S.wares.indexOf(it)] = null;
  SHOP.sel = null; sfx('gold'); sfx('clink'); shopFlash('BOUGHT: ' + itemName(it), RARITY_COL[it.rarity]);
  if (!hero.equip[ITEM_BASES[it.base].slot] && canWear(it)) equipItem(it);
  saveShop();
}
function sell(items) {
  let g = 0; for (const it of items) { const k = hero.bag.indexOf(it); if (k < 0) continue; hero.bag.splice(k, 1); g += sellPrice(it); }
  hero.gold += g; SHOP.sel = null; sfx('gold'); shopFlash(`SOLD ${items.length} FOR ${g} GOLD`, 50); saveShop();
}
const saveShop = () => { const m0 = G.mode; G.mode = 'play'; saveGame(); G.mode = m0; };
function shopTap(p) {
  const L = SHOP.L || shopLayout(), S = shopState();
  if (inRect(p, L.close)) { sfx('tap'); closeShop(); return; }
  for (const b of L.btns) if (inRect(p, b)) { b.on(); return; }
  for (const k of ['buy', 'sell']) if (inRect(p, L.tabs[k])) { sfx('tap'); SHOP.tab = k; SHOP.sel = null; return; }
  if (SHOP.tab === 'buy') {
    if (L.save && inRect(p, L.save) && S.show) { S.saved = !S.saved; sfx(S.saved ? 'clink' : 'tap'); shopFlash(S.saved ? 'SAVED: IT WAITS UNTIL YOU BUY IT' : 'NOT SAVED: GONE AFTER YOUR NEXT TRIP', S.saved ? 55 : 24); saveShop(); return; }
    if (inRect(p, L.show) && S.show) { sfx('tap'); SHOP.sel = { item: S.show, from: 'show' }; return; }
    L.wares.forEach((r, n) => { if (inRect(p, r) && S.wares[n]) { sfx('tap'); SHOP.sel = { item: S.wares[n], from: 'wares' }; } });
  } else L.bag.forEach((r, n) => { const it = hero.bag[n]; if (inRect(p, r) && it && ITEM_BASES[it.base].slot !== 'potion') { sfx('tap'); SHOP.sel = { item: it, from: 'bag' }; } });
}
// ---- the blacksmith
function smithLayout() {
  const L = { close: { x: W - 56, y: 3, w: 52, h: 20 }, btns: [], slots: {}, bag: [] };
  SLOTS.forEach((s, n) => L.slots[s] = { x: 9 + n * 43, y: 46, w: 37, h: 32 });
  for (let n = 0; n < BAG_SIZE; n++) L.bag.push({ x: 15 + (n % 6) * 41, y: 98 + Math.floor(n / 6) * 34, w: 34, h: 30 });
  L.card = { x: 6, y: 206, w: W - 12, h: H - 212 };
  return L;
}
// the lines that change at the next step: [now, then]
function upPreview(it) {
  const n = { ...it, mods: { ...it.mods }, up: (it.up || 0) + 1 };
  if (JEWELRY[ITEM_BASES[it.base].slot]) for (const k in n.mods) if (typeof n.mods[k] === 'number') n.mods[k] += Math.max(1, Math.round(n.mods[k] * UP_K.mod));
  const a = itemLines(it), b = itemLines(n), out = [];
  for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) out.push([a[k], b[k]]);
  return out;
}
function drawSmith() {
  screenBack();
  const L = smithLayout(), sel = SHOP.sel;
  shopHeader(L, 'BLACKSMITH');
  text('WORN', 9, 37, 26);
  for (const s of SLOTS) slotBox(L.slots[s], hero.equip[s], sel && sel.item === hero.equip[s] && hero.equip[s]);
  text('BAG', 15, 89, 26);
  L.bag.forEach((r, n) => { const it = hero.bag[n]; slotBox(r, it && ITEM_BASES[it.base].slot !== 'potion' ? it : null, sel && sel.item === it && it); });
  const it = sel && sel.item, C = L.card;
  if (!it) { itemCard(C, null, { hint: ['TAP A PIECE OF GEAR TO UPGRADE IT', 'UP TO +3. A +3 WEAPON SHINES'] }); }
  else {
    const u = it.up || 0;
    { const cx = W / 2, cy = C.y + 100, gl = u / UP_MAX, c = u >= 2 ? 51 : 50;   // the piece itself, big, glowing brighter with each step
      if (u) for (let y = cy - 34; y < cy + 6; y++) for (let x = cx - 30; x < cx + 30; x++) { const d = Math.hypot((x - cx) / 30, (y - cy + 14) / 20); if (d < 1 && BAYER[((y & 3) << 2) | (x & 3)] < (1 - d) * gl * (0.7 + 0.3 * Math.sin(G.t * 3))) put(x, y, c); }
      SHOP.icon = [cx, cy + 12]; }
    if (u >= UP_MAX) {
      itemCard(C, it, { max: 4 });
      textC('MASTERWORK: FULLY UPGRADED', W / 2, C.y + C.h - 24, 27);
    } else {
      fillRect(C.x, C.y, C.w, C.h, 3); frame(C.x, C.y, C.w, C.h, 8, 4);
      const nx = { ...it, up: u + 1 };
      text(itemName(it), C.x + 6, C.y + 6, RARITY_COL[it.rarity]); textC('>', W / 2, C.y + 6, 26); text(itemName(nx), C.x + C.w / 2 + 8, C.y + 6, 51);
      const ch = upPreview(it);
      ch.slice(0, 6).forEach(([a, b], n) => { text(a, C.x + 6, C.y + 20 + n * 9, 24); textC('>', W / 2, C.y + 20 + n * 9, 26); text(b, C.x + C.w / 2 + 8, C.y + 20 + n * 9, 55); });
      for (let k = 0; k < UP_MAX; k++) { const x = W / 2 - 22 + k * 16; fillRect(x, C.y + C.h - 48, 12, 6, k < u ? 51 : 5); frame(x, C.y + C.h - 48, 12, 6, k < u ? 50 : 8, 3); }
      const c = upCost(it), can = hero.gold >= c;
      bigButton(L, `UPGRADE +${u + 1}  ${c} GOLD`, W / 2 - 70, C.y + C.h - 34, 140, 26, () => doUpgrade(it), can, 109);
    }
  }
  if (it) sprite(itemIcon(it), SHOP.icon[0], SHOP.icon[1], 3, 4);
  if (SHOP.flash && G.t - SHOP.flash.t < 1.6) textC(SHOP.flash.text, W / 2, C.y + 66, SHOP.flash.col, SHOP.flash.big ? 2 : 1);
  if (SHOP.sparks) drawSmithSparks();
  SHOP.L = L;
}
function doUpgrade(it) {
  const c = upCost(it);
  if (hero.gold < c) { shopFlash('NOT ENOUGH GOLD', 22); sfx('tap'); return; }
  upgradeItem(it);
  sfx('clank'); sfx('clink'); if (it.up >= UP_MAX) sfx('levelUp');
  SHOP.flash = { text: itemName(it) + '!', col: it.up >= UP_MAX ? 27 : 51, t: G.t, big: true };
  // sparks fly off the card
  const C = (SHOP.L || smithLayout()).card; SHOP.sparks = [];
  for (let k = 0; k < 40; k++) { const a = -Math.PI * Math.random(); SHOP.sparks.push({ x: W / 2, y: C.y + 96, vx: Math.cos(a) * (40 + Math.random() * 90), vy: Math.sin(a) * (60 + Math.random() * 90), t: 0.5 + Math.random() * 0.5 }); }
  SHOP.sparkT = G.t;
  saveShop();
}
function drawSmithSparks() {
  const dt = Math.max(0, Math.min(0.05, G.t - (SHOP.sparkLast || G.t))); SHOP.sparkLast = G.t;
  for (const s of SHOP.sparks) { s.t -= dt; s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.t > 0) { put(s.x, s.y, s.t > 0.6 ? 27 : s.t > 0.3 ? 51 : 112); put(s.x - s.vx * 0.01, s.y - s.vy * 0.01, 110); } }
  SHOP.sparks = SHOP.sparks.filter(s => s.t > 0); if (!SHOP.sparks.length) SHOP.sparks = null;
}
function smithTap(p) {
  const L = SHOP.L || smithLayout();
  if (inRect(p, L.close)) { sfx('tap'); closeShop(); return; }
  for (const b of L.btns) if (inRect(p, b)) { b.on(); return; }
  for (const s of SLOTS) if (inRect(p, L.slots[s]) && hero.equip[s]) { sfx('tap'); SHOP.sel = { item: hero.equip[s], from: 'equip', slot: s }; return; }
  L.bag.forEach((r, n) => { const it = hero.bag[n]; if (inRect(p, r) && it && ITEM_BASES[it.base].slot !== 'potion') { sfx('tap'); SHOP.sel = { item: it, from: 'bag' }; } });
}
