// Screen UI. Kid buttons are big pictures (no reading); text only appears on the title line for parents
// and inside the parent area, which sits behind a hold-for-3-seconds gate styled unlike the kid buttons.
import { audio } from '../core/audio';
import { GUESTS, guestNames, saveGuestName } from '../game/guests';

const ICON = {
  play: '<svg viewBox="0 0 100 100"><path d="M36 22 L80 50 L36 78 Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/></svg>',
  home: '<svg viewBox="0 0 100 100"><path d="M14 50 L50 18 L86 50" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 48 V82 H74 V48" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 100 100"><path d="M78 50 A28 28 0 1 1 64 26" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><path d="M58 8 L70 28 L48 34 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 100 100"><path d="M50 26 C40 16 22 16 12 22 V80 C22 74 40 74 50 84 C60 74 78 74 88 80 V22 C78 16 60 16 50 26 Z" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round"/><path d="M50 26 V84" stroke="currentColor" stroke-width="8"/></svg>',
  gear: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="9"/><g stroke="currentColor" stroke-width="11" stroke-linecap="round"><path d="M50 12 V22"/><path d="M50 78 V88"/><path d="M12 50 H22"/><path d="M78 50 H88"/><path d="M23 23 L30 30"/><path d="M70 70 L77 77"/><path d="M23 77 L30 70"/><path d="M70 30 L77 23"/></g></svg>',
};

// pictures for the menu of jobs (no reading needed)
const DISH: Record<string, string> = {
  potato: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="44" rx="34" ry="22" fill="#FBEDBE"/><path d="M12 48 H88 C88 74 72 86 50 86 C28 86 12 74 12 48 Z" fill="#FFF4E0"/><path d="M15 58 H85 C84 64 82 68 79 72 H21 C18 68 16 64 15 58 Z" fill="#B23A48"/><rect x="42" y="24" width="18" height="12" rx="3" fill="#F6D58E" transform="rotate(-12 51 30)"/></svg>',
  cranberry: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="76" rx="42" ry="14" fill="#FFF4E0"/><ellipse cx="50" cy="76" rx="42" ry="14" fill="none" stroke="#8FAE7E" stroke-width="5"/><rect x="30" y="20" width="40" height="56" rx="9" fill="#C22F4B"/><path d="M30 38 H70 M30 52 H70" stroke="#8E2238" stroke-width="4"/></svg>',
  table: '<svg viewBox="0 0 100 100"><circle cx="56" cy="50" r="30" fill="#FFF9EE"/><circle cx="56" cy="50" r="30" fill="none" stroke="#8FAE7E" stroke-width="6"/><circle cx="56" cy="50" r="15" fill="none" stroke="#E9DCC6" stroke-width="3"/><path d="M14 22 V44 M8 22 V38 Q8 46 14 46 Q20 46 20 38 V22 M14 46 V82" fill="none" stroke="#8E848C" stroke-width="5" stroke-linecap="round"/></svg>',
  beans: '<svg viewBox="0 0 100 100"><g fill="none" stroke-linecap="round" stroke-width="13"><path d="M16 34 Q50 20 84 30" stroke="#4E8238"/><path d="M14 54 Q50 44 86 52" stroke="#6FA24A"/><path d="M18 74 Q50 66 82 74" stroke="#4E8238"/></g><path d="M50 22 V84" stroke="#FFF4E0" stroke-width="4" stroke-dasharray="6 7"/></svg>',
  stuffing: '<svg viewBox="0 0 100 100"><path d="M10 48 H90 C90 74 74 88 50 88 C26 88 10 74 10 48 Z" fill="#FFF4E0"/><path d="M13 58 H87 C86 64 84 68 81 72 H19 C16 68 14 64 13 58 Z" fill="#8FAE7E"/><g fill="#F1D49B" stroke="#D69A4E" stroke-width="3"><rect x="24" y="30" width="18" height="18" rx="3" transform="rotate(-10 33 39)"/><rect x="44" y="22" width="18" height="18" rx="3" transform="rotate(8 53 31)"/><rect x="60" y="32" width="18" height="18" rx="3" transform="rotate(-6 69 41)"/></g><circle cx="44" cy="46" r="3" fill="#5C9A4C"/><circle cx="62" cy="26" r="3" fill="#5C9A4C"/></svg>',
  sweet: '<svg viewBox="0 0 100 100"><rect x="8" y="34" width="84" height="44" rx="10" fill="#B23A48"/><rect x="16" y="28" width="68" height="36" rx="8" fill="#EE8E3C"/><g fill="#FFFDF6" stroke="#E9DCC6" stroke-width="2"><circle cx="30" cy="40" r="8"/><circle cx="50" cy="38" r="8"/><circle cx="70" cy="40" r="8"/><circle cx="40" cy="54" r="8"/><circle cx="60" cy="54" r="8"/></g></svg>',
  pie: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#D9A066"/><circle cx="50" cy="50" r="40" fill="none" stroke="#C68B59" stroke-width="5" stroke-dasharray="9 6"/><circle cx="50" cy="50" r="29" fill="#D8762B"/><path d="M50 34 C60 36 64 46 58 54 C54 60 44 60 40 54 C36 46 40 36 50 34 Z" fill="#FFFDF6"/></svg>',
  roast: '<svg viewBox="0 0 100 100"><rect x="8" y="70" width="84" height="16" rx="6" fill="#8E848C"/><ellipse cx="50" cy="56" rx="32" ry="24" fill="#E8833A"/><path d="M40 34 Q38 56 42 78 M60 34 Q62 56 58 78" stroke="#B8673A" stroke-width="4" fill="none"/><ellipse cx="50" cy="34" rx="18" ry="8" fill="#F1D49B"/><path d="M14 44 L26 66" stroke="#F6D58E" stroke-width="13" stroke-linecap="round"/><path d="M86 44 L74 66" stroke="#F6D58E" stroke-width="13" stroke-linecap="round"/><circle cx="12" cy="40" r="7" fill="#fff"/><circle cx="88" cy="40" r="7" fill="#fff"/></svg>',
  bell: '<svg viewBox="0 0 100 100"><path d="M50 18 C28 18 22 40 22 58 L14 72 H86 L78 58 C78 40 72 18 50 18 Z" fill="#F2B33D"/><rect x="43" y="8" width="14" height="14" rx="6" fill="#B8673A"/><circle cx="50" cy="80" r="9" fill="#B8673A"/><path d="M34 34 Q30 46 30 58" stroke="#FFF4E0" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
};

// how to do the current step, as a moving picture
const HAND = '<svg class="hand" viewBox="0 0 100 100"><path d="M40 92 C28 80 22 66 24 56 C25 50 32 50 36 56 V22 C36 12 50 12 50 22 V46 C50 40 62 40 62 48 C63 42 74 43 74 50 C75 45 85 46 85 54 V70 C85 82 78 92 66 92 Z" fill="#FFF4E0" stroke="#3B2630" stroke-width="5" stroke-linejoin="round"/></svg>';
const GESTURE: Record<string, string> = {
  tap: `<div class="g g-tap"><i class="ring"></i>${HAND}</div>`,
  swipe: `<div class="g g-swipe"><i class="track"></i>${HAND}</div>`,
  circle: `<div class="g g-circle"><i class="orbit"></i>${HAND}</div>`,
  updown: `<div class="g g-updown"><i class="track v"></i>${HAND}</div>`,
};
const GOBBLES_FACE = '<svg viewBox="0 0 120 110"><g fill="none" stroke-linecap="round" stroke-width="13"><path d="M60 62 L14 30" stroke="#B23A48"/><path d="M60 62 L30 12" stroke="#E8833A"/><path d="M60 62 L60 6" stroke="#F6D58E"/><path d="M60 62 L90 12" stroke="#E8833A"/><path d="M60 62 L106 30" stroke="#B23A48"/></g><ellipse cx="60" cy="72" rx="34" ry="32" fill="#A8683F" stroke="#3B2630" stroke-width="4"/><rect x="42" y="18" width="36" height="20" rx="8" fill="#fff" stroke="#3B2630" stroke-width="4"/><ellipse cx="60" cy="16" rx="24" ry="13" fill="#fff" stroke="#3B2630" stroke-width="4"/><circle cx="47" cy="62" r="11" fill="#fff" stroke="#3B2630" stroke-width="3"/><circle cx="73" cy="62" r="11" fill="#fff" stroke="#3B2630" stroke-width="3"/><circle cx="49" cy="64" r="5" fill="#2C1B26"/><circle cx="71" cy="64" r="5" fill="#2C1B26"/><path d="M52 74 L68 74 L60 88 Z" fill="#F2B33D" stroke="#3B2630" stroke-width="3" stroke-linejoin="round"/><path d="M66 84 q6 6 2 14 q-7 -4 -6 -12 z" fill="#D8453F"/></svg>';

// sticker pictures: found ones are coloured, the rest stay silhouettes (no counters, no percentages)
const STICKERS: Record<string, string> = {
  jelly_rain: '<svg viewBox="0 0 100 100"><path d="M50 10 C70 40 82 52 82 66 A32 32 0 0 1 18 66 C18 52 30 40 50 10 Z" fill="#C22F4B"/><circle cx="38" cy="62" r="8" fill="#fff" opacity=".55"/></svg>',
  pots_tune: '<svg viewBox="0 0 100 100"><path d="M40 20 L78 12 V62" fill="none" stroke="#4F7A5A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 20 V72" stroke="#4F7A5A" stroke-width="9" stroke-linecap="round"/><ellipse cx="29" cy="74" rx="14" ry="11" fill="#4F7A5A"/><ellipse cx="67" cy="64" rx="14" ry="11" fill="#4F7A5A"/></svg>',
  dis_pumpkin: '<svg viewBox="0 0 100 100"><rect x="45" y="12" width="10" height="18" rx="4" fill="#4F7A5A"/><ellipse cx="50" cy="58" rx="38" ry="30" fill="#E8833A"/><ellipse cx="50" cy="58" rx="16" ry="30" fill="#F29B52"/></svg>',
  dis_mustache: '<svg viewBox="0 0 100 100"><path d="M50 48 C40 30 14 34 8 58 C22 70 42 66 50 54 C58 66 78 70 92 58 C86 34 60 30 50 48 Z" fill="#3B2630"/></svg>',
  dis_leaf: '<svg viewBox="0 0 100 100"><path d="M50 8 C82 30 84 64 50 92 C16 64 18 30 50 8 Z" fill="#D9772F"/><path d="M50 20 V92" stroke="#8C5A3C" stroke-width="6" stroke-linecap="round"/></svg>',
  cat_purr: '<svg viewBox="0 0 100 100"><path d="M18 34 L24 10 L44 26 H56 L76 10 L82 34 C92 60 76 86 50 86 C24 86 8 60 18 34 Z" fill="#EFA35C"/><path d="M34 52 q6 -8 12 0 M54 52 q6 -8 12 0" fill="none" stroke="#3B2630" stroke-width="5" stroke-linecap="round"/><path d="M46 64 h8 l-4 6 z" fill="#F0907A"/></svg>',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
}

export class Hud {
  root: HTMLElement;
  private title: HTMLElement;
  private bar: HTMLElement;
  private playBtn: HTMLButtonElement;
  private homeBtn: HTMLButtonElement;
  private againBtn: HTMLButtonElement;
  private bookBtn: HTMLButtonElement;
  private gear: HTMLButtonElement;
  private panel: HTMLElement;
  private book: HTMLElement;
  private photo: HTMLElement;
  private flashEl: HTMLElement;
  private found = new Set<string>();
  private tagEl: HTMLElement;
  private cardEl: HTMLElement;
  private photos: string[] = [];
  onPlay = () => {};
  onHome = () => {};
  onAgain = () => {};
  onPick: (id: string) => void = () => {};
  onBell = () => {};
  private menu: HTMLElement;
  private gestureEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = el('div', 'hud');
    container.appendChild(this.root);

    // ---- title
    this.title = el('div', 'title', `
      <div class="sign">
        <div class="mascot">${GOBBLES_FACE}</div>
        <div class="logo"><span>Gobble Gobble</span><b>Kitchen</b></div>
        <div class="loading"><div class="bar"></div></div>
        <button class="kid play" aria-label="Play">${ICON.play}</button>
      </div>
      <div class="trust">No ads &middot; No purchases &middot; No links &middot; No data collected</div>`);
    this.root.appendChild(this.title);
    this.bar = this.title.querySelector('.bar')!;
    this.playBtn = this.title.querySelector('.play')!;
    this.playBtn.style.display = 'none';
    // 'click' (not pointerdown): on touch screens only the end of a tap counts as the user gesture
    // that iOS needs before it lets audio start
    let played = false;
    this.playBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (played) return;
      played = true;
      audio.unlock();
      audio.pop(1.2);
      this.title.classList.add('gone');
      this.onPlay();
    });

    // ---- kid buttons (kept away from the corners and the bottom edge)
    this.homeBtn = el('button', 'kid home hidden', ICON.home);
    this.homeBtn.setAttribute('aria-label', 'Back to the kitchen');
    this.homeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.onHome(); });
    this.bookBtn = el('button', 'kid bookbtn hidden', ICON.book);
    this.bookBtn.setAttribute('aria-label', 'Sticker book');
    this.bookBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.pop(1.3); this.toggleBook(); });
    this.againBtn = el('button', 'kid again hidden', ICON.again);
    this.againBtn.setAttribute('aria-label', 'Cook again');
    this.againBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.onAgain(); });
    this.root.append(this.homeBtn, this.bookBtn, this.againBtn);
    // ---- the picture menu of jobs (overview only)
    this.menu = el('div', 'menu hidden');
    this.gestureEl = el('div', 'gesture hidden');
    this.root.append(this.menu, this.gestureEl);

    // ---- sticker book
    this.book = el('div', 'book hidden');
    this.book.addEventListener('pointerdown', () => this.toggleBook(false));
    this.root.appendChild(this.book);
    try {
      for (const id of JSON.parse(localStorage.getItem('gobble.stickers') || '[]')) if (STICKERS[id]) this.found.add(id);
    } catch { /* storage may be blocked */ }
    this.renderBook();

    try {
      this.photos = JSON.parse(localStorage.getItem('gobble.photos') || '[]').filter((p: unknown) => typeof p === 'string').slice(0, 3);
    } catch { /* storage may be blocked */ }
    this.renderBook();

    // ---- name tag over a guest, and the big name card
    this.tagEl = el('div', 'nametag hidden');
    this.cardEl = el('div', 'bigcard hidden');
    this.root.append(this.tagEl, this.cardEl);

    // ---- photo and flash
    this.photo = el('div', 'photo hidden');
    this.flashEl = el('div', 'flash');
    this.root.append(this.photo, this.flashEl);

    // ---- parent gate: hold for 3 seconds
    this.gear = el('button', 'gear', `${ICON.gear}<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/></svg>`);
    this.gear.setAttribute('aria-label', 'Grown-ups: hold for 3 seconds');
    this.root.appendChild(this.gear);
    let timer = 0;
    const cancel = () => {
      clearTimeout(timer);
      this.gear.classList.remove('holding');
    };
    this.gear.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.gear.classList.add('holding');
      timer = window.setTimeout(() => {
        cancel();
        this.openPanel();
      }, 3000);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.gear.addEventListener(ev, cancel);

    this.panel = el('div', 'panel hidden');
    this.root.appendChild(this.panel);
  }

  // ---------------------------------------------------------------- title
  progress(k: number) {
    this.bar.style.width = Math.round(k * 100) + '%';
  }
  ready() {
    (this.title.querySelector('.loading') as HTMLElement).style.display = 'none';
    this.playBtn.style.display = '';
  }
  hideTitle() {
    this.title.classList.add('gone');
  }
  showGame() {
    this.bookBtn.classList.toggle('hidden', this.found.size === 0 && this.photos.length === 0);
  }

  /** Name tag at a game-space position (null hides it). */
  setTag(text: string | null, x: number, y: number) {
    if (!text) {
      this.tagEl.classList.add('hidden');
      return;
    }
    if (this.tagEl.textContent !== text) this.tagEl.textContent = text;
    this.tagEl.classList.remove('hidden');
    this.tagEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  /** Show a guest's name card big for a moment. */
  showCard(canvas: HTMLCanvasElement) {
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.alt = '';
    this.cardEl.innerHTML = '';
    this.cardEl.appendChild(img);
    this.cardEl.classList.remove('hidden', 'go');
    void this.cardEl.offsetWidth;
    this.cardEl.classList.add('go');
    clearTimeout(this.cardTimer);
    this.cardTimer = window.setTimeout(() => this.cardEl.classList.add('hidden'), 1250);
  }
  private cardTimer = 0;

  /** Show the jobs on offer (and the dinner bell once it is earned). An empty list hides the menu. */
  setMenu(items: { id: string; started: boolean }[], bell: boolean, done: string[] = []) {
    this.menu.innerHTML = '';
    this.menu.classList.toggle('hidden', items.length === 0 && !bell);
    if (items.length || bell) {
      // what is already on the table, as a row of little pictures (no numbers)
      const tray = el('div', 'tray', done.map((id) => `<i>${DISH[id] ?? ''}</i>`).join(''));
      if (done.length) this.menu.appendChild(tray);
    }
    for (const it of items) {
      const b = el('button', 'kid dishbtn' + (it.started ? ' started' : ''), DISH[it.id] ?? '');
      b.setAttribute('aria-label', it.id);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onPick(it.id);
      });
      this.menu.appendChild(b);
    }
    if (bell) {
      const b = el('button', 'kid dishbtn bellbtn', DISH.bell);
      b.setAttribute('aria-label', 'Dinner bell');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onBell();
      });
      this.menu.appendChild(b);
    }
  }
  /** A gentle wave through the menu when the player has been idle. */
  pulseMenu() {
    this.menu.classList.remove('wave');
    void this.menu.offsetWidth;
    this.menu.classList.add('wave');
  }

  /** Show how the current step is done (tap, swipe, circle, up-down), or hide the bubble. */
  setGesture(kind: string | null) {
    const html = kind ? GESTURE[kind] : undefined;
    this.gestureEl.classList.toggle('hidden', !html);
    if (html && this.gestureEl.dataset.kind !== kind) this.gestureEl.innerHTML = html;
    this.gestureEl.dataset.kind = kind ?? '';
  }

  showHome(on: boolean) {
    this.homeBtn.classList.toggle('hidden', !on);
  }
  showAgain(on: boolean) {
    this.againBtn.classList.toggle('hidden', !on);
  }

  // ---------------------------------------------------------------- stickers
  /** Returns true if this sticker is new. */
  addSticker(id: string) {
    if (!STICKERS[id] || this.found.has(id)) return false;
    this.found.add(id);
    try { localStorage.setItem('gobble.stickers', JSON.stringify([...this.found])); } catch { /* ignore */ }
    this.renderBook();
    this.bookBtn.classList.remove('hidden');
    // the new sticker pops up big, then tucks into the book button
    const fly = el('div', 'stickerfly', STICKERS[id]);
    this.root.appendChild(fly);
    setTimeout(() => fly.classList.add('tuck'), 1300);
    setTimeout(() => {
      fly.remove();
      this.bookBtn.classList.add('wiggle');
      setTimeout(() => this.bookBtn.classList.remove('wiggle'), 600);
    }, 1900);
    return true;
  }
  private renderBook() {
    const stickers = Object.entries(STICKERS).map(([id, svg]) => `<div class="sticker ${this.found.has(id) ? 'found' : ''}">${svg}</div>`).join('');
    const photos = (this.photos ?? []).map((p, i) => `<img class="snap" alt="Feast photo" style="--r:${[-4, 3, -2][i % 3]}deg" src="${p}">`).join('');
    this.book.innerHTML = `<div class="page"><div class="stickers">${stickers}</div>${photos ? `<div class="snaps">${photos}</div>` : ''}</div>`;
  }
  private toggleBook(on?: boolean) {
    this.book.classList.toggle('hidden', on === undefined ? !this.book.classList.contains('hidden') : !on);
  }

  // ---------------------------------------------------------------- photo
  flash() {
    this.flashEl.classList.remove('go');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('go');
  }
  showPhoto(url: string) {
    if (!url) return;
    this.photo.innerHTML = `<img alt="Feast photo" src="${url}">`;
    this.photo.classList.remove('hidden');
    this.keepPhoto(url);
  }
  /** Scrapbook: the last three feast photos, small, on this device only. */
  private keepPhoto(url: string) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 420;
      c.height = Math.round((420 * img.height) / img.width);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      this.photos = [c.toDataURL('image/jpeg', 0.72), ...this.photos].slice(0, 3);
      try { localStorage.setItem('gobble.photos', JSON.stringify(this.photos)); } catch { /* full or blocked: the photo just is not kept */ }
      this.renderBook();
      this.bookBtn.classList.remove('hidden');
    };
    img.src = url;
  }
  hidePhoto() {
    this.photo.classList.add('hidden');
  }

  // ---------------------------------------------------------------- parent area
  private openPanel() {
    const s = audio.settings;
    const voices = audio.narrators;
    const names: Record<string, string> = { af_heart: 'Heart (warm)', af_bella: 'Bella (bright)', bf_emma: 'Emma (British)' };
    const custom = guestNames();
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const guestRows = GUESTS.map((g) => `<label>${esc(g.name)} <input type="text" maxlength="14" data-guest="${g.id}" placeholder="${esc(g.name)}" value="${esc(custom[g.id] ?? '')}"></label>`).join('');
    this.panel.innerHTML = `
      <div class="sheet">
        <h2>Grown-ups</h2>
        <label>Music <input type="range" min="0" max="1" step="0.05" data-k="music" value="${s.music}"></label>
        <label>Voice <input type="range" min="0" max="1" step="0.05" data-k="voice" value="${s.voice}"></label>
        <label>Sound effects <input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${s.sfx}"></label>
        <label class="row"><input type="checkbox" data-k="quiet" ${s.quiet ? 'checked' : ''}> Quiet mode (everything still works with the sound off)</label>
        ${voices.length > 1 ? `<label>Narrator <select data-k="narrator">${voices.map((v) => `<option value="${v}" ${v === s.narrator ? 'selected' : ''}>${names[v] ?? v}</option>`).join('')}</select></label>` : ''}
        <h3>Who is coming to dinner</h3>
        ${guestRows}
        <p>Names show on the name cards the next time you start cooking. The narrator only says the names as first written.</p>
        <p>No ads, no purchases, no outbound links and no data collection. Stickers, photos, names and settings are saved on this device only.</p>
        <div class="btns"><button data-a="title">Back to the start</button><button data-a="close" class="primary">Done</button></div>
      </div>`;
    this.panel.classList.remove('hidden');
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k as 'music' | 'voice' | 'sfx' | 'quiet' | 'narrator';
        if (k === 'quiet') s.quiet = (inp as HTMLInputElement).checked;
        else if (k === 'narrator') {
          s.narrator = inp.value;
          audio.save();
          audio.say('welcome');
          return;
        } else s[k] = parseFloat(inp.value);
        audio.save();
      });
    });
    this.panel.querySelectorAll<HTMLInputElement>('[data-guest]').forEach((inp) => {
      inp.addEventListener('change', () => saveGuestName(inp.dataset.guest!, inp.value));
    });
    this.panel.querySelector('[data-a="close"]')!.addEventListener('click', () => this.panel.classList.add('hidden'));
    this.panel.querySelector('[data-a="title"]')!.addEventListener('click', () => location.reload());
  }
}
