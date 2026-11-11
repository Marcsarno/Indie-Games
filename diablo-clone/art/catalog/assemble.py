#!/usr/bin/env python3
"""Assemble the Dungeon of Bones dossier: merge the research JSON files, compress the images, write one standalone HTML.

usage: python3 assemble.py <out.html> <data.json> [<data.json> ...]
Images are resized (longest side MAXW) and stored once each as WebP data URIs in a separate JSON block, so the
records block stays light for an importing AI. Records reference images by image id ("img-<hash>").
"""
import json, sys, os, hashlib, base64, io, html, re, datetime
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

MAXW, Q = int(os.environ.get('MAXW', 520)), int(os.environ.get('Q', 50))
CAP_TOP, CAP_HIST = int(os.environ.get('CAP_TOP', 2)), int(os.environ.get('CAP_HIST', 1))
out, srcs = sys.argv[1], sys.argv[2:]

recs, order, questions = {}, [], []
def merge(a, b):   # keep the first record, fill gaps and append history from the second
    for k, v in b.items():
        if k not in a or a[k] in (None, '', [], {}): a[k] = v
        elif k in ('history', 'images', 'tags', 'related') and isinstance(v, list):
            seen = {json.dumps(x, sort_keys=True) for x in a[k]}
            a[k] += [x for x in v if json.dumps(x, sort_keys=True) not in seen]
for s in srcs:
    d = json.load(open(s))
    questions += [{'from': os.path.basename(s), 'q': q} for q in d.get('openQuestions', [])]
    for r in d.get('records', []):
        i = r.get('id')
        if not i: continue
        if i in recs: merge(recs[i], r)
        else: recs[i] = r; order.append(i)

imgs, missing = {}, []
def embed(path):
    if not path or not os.path.isfile(path): missing.append(path); return None
    key = 'img-' + hashlib.sha1(path.encode()).hexdigest()[:12]
    if key in imgs: return key
    try:
        im = Image.open(path)
        if getattr(im, 'is_animated', False): im.seek(0)
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        w, h = im.size; AREA = int(os.environ.get('AREA', 200000)); k = min(1.0, (AREA / (w * h)) ** 0.5, 1400 / max(w, h))
        if k < 1: im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.NEAREST if k >= 0.5 else Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=Q, method=6)
        imgs[key] = {'src': os.path.relpath(path, '/'), 'data': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()}
        return key
    except Exception as e:
        missing.append(f'{path} ({e})'); return None

def fix_images(lst, cap=99):
    outl = []
    for im in (lst or [])[:cap]:
        if isinstance(im, str): im = {'path': im}
        k = embed(im.get('path'))
        if k: outl.append({'image': k, 'caption': im.get('caption', ''), 'role': im.get('role', ''), 'source': imgs[k]['src']})
    return outl

for i in order:
    r = recs[i]; r.setdefault('project', 'dungeon-of-bones')
    full = [x if isinstance(x, dict) else {'path': x} for x in (r.get('images') or [])]
    r['moreImages'] = [{'source': os.path.relpath(x['path'], '/') if x.get('path') else None, 'caption': x.get('caption', ''), 'role': x.get('role', '')} for x in full[CAP_TOP:]]
    r['images'] = fix_images(full, CAP_TOP)
    for v in r.get('history', []) or []:
        fv = v.get('images') or []
        v['moreImages'] = [{'source': os.path.relpath((x if isinstance(x, str) else x.get('path', '')), '/'), 'caption': '' if isinstance(x, str) else x.get('caption', '')} for x in fv[CAP_HIST:]]
        v['images'] = fix_images(fv, CAP_HIST)
    if r['images']: r['preview'] = r['images'][0]['image']
    r.setdefault('downloads', [])
    r.setdefault('sentToClaude', None)

records = [recs[i] for i in order]
ALL = set(recs)
SLUG = {}
for i in ALL:
    SLUG.setdefault(i.split('-', 2)[-1] if i.count('-') >= 2 else i, []).append(i)
ALIAS = {'dob-audio-camp-music': 'dob-audio-camp-song', 'dob-audio-dungeon-music': 'dob-audio-dungeon-song', 'dob-audio-forest-music': 'dob-audio-forest-song',
  'dob-audio-lair-music': 'dob-audio-lair-song', 'dob-audio-title-music': 'dob-audio-title-song', 'dob-audio-synth-sfx': 'dob-audio-sfx',
  'dob-boss-barrow-wight': 'dob-boss-barrowwight', 'dob-boss-barrow-wraith': 'dob-boss-barrowwight', 'dob-story-table-opening': 'dob-story-dave-table',
  'dob-map-hollow': 'dob-env-camp', 'dob-tool-art-review': 'dob-tool-review-tools', 'dob-tool-perf52': 'dob-tool-review-tools'}
def resolve(x):
    x = ALIAS.get(x, x)
    if x in ALL: return x
    for a, b in (('dob-enemy-', 'dob-boss-'), ('dob-boss-', 'dob-enemy-'), ('dob-skill-', 'dob-spell-'), ('dob-spell-', 'dob-skill-'), ('dob-npc-', 'dob-boss-'), ('dob-env-', 'dob-map-'), ('dob-map-', 'dob-env-')):
        if x.startswith(a) and b + x[len(a):] in ALL: return b + x[len(a):]
    tail = x.split('-', 2)[-1] if x.count('-') >= 2 else x
    c = [i for i in ALL if i.endswith('-' + tail) or i.split('-', 2)[-1].startswith(tail + '-')]
    return c[0] if len(c) == 1 else None
unresolved = set()
for r in records:
    outr = []
    for x in r.get('related') or []:
        y = resolve(x)
        if y and y != r['id'] and y not in outr: outr.append(y)
        elif not y: unresolved.add(x)
    r['related'] = outr
    if r.get('history'):
        for k, v in enumerate(r['history']): v.setdefault('id', f"{r['id']}@v{k+1}")
KIND_ORDER = ['project', 'direction', 'hero', 'spell', 'skill', 'fx', 'gear', 'npc', 'enemy', 'boss', 'env', 'map', 'prop', 'ui', 'audio', 'story', 'concept', 'tool', 'round']
def rkey(r):
    m = re.match(r'dob-round-(\d+)([a-z]*)', r['id'])
    return (int(m.group(1)), m.group(2)) if m else (9999, r['id'])

CAVEATS = [
  'The full git history starts on 2026-11-03 (round 30). Dates for rounds 1-29 are estimates from the notes (about 2026-10-27 to 2026-11-03); each record says so in its notes.',
  'Many review images from round 44 on were never committed (the art-review folder is git-ignored), so later rounds often have no image. Images marked "captured for this catalog" were taken from the current build on 2026-11-11, not at the time of the round.',
  'The shipped game (main branch) has the art chat\'s rounds A1-A8 only. Everything from B2 on (17 new monsters, the reworked bosses, Malgrath and Azhruk) is on the art branch and not in the game: addedToGame false.',
  'status values come from what the notes record; "user-approved" can mean the user approved the plan, not the finished result; the record says which.',
  'The game\'s own title screen spells it DUNGEONS OF BONES; the notes and most commits say Dungeon of Bones.',
  'The 3D remake and the third-person World are recorded as projects with their own rounds; they reuse the 2D game\'s code and assets.',
]
manifest = {
  'schema': 'studio-catalog-dossier/1',
  'generated': datetime.date.today().isoformat(),
  'project': {
    'id': 'dungeon-of-bones', 'title': 'Dungeon of Bones', 'altNames': ['Dungeons of Bones', 'DUNGEONS OF BONES (in-game title)', 'diablo-clone'],
    'genre': 'Diablo-style action RPG (2D pixel art, plus a 3D remake and a third-person World version)',
    'repo': 'github.com/marcsarno/indie-games, folder diablo-clone/',
    'links': {
      '2d-game': 'https://claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g',
      '3d-remake': 'https://dungeons-of-bones-3d-marcsarno.vercel.app',
      'world-third-person': 'https://bones-world-3d-marcsarno.vercel.app',
      'table-opening-animatic': 'https://claude.ai/artifact/NCWhZqq4KNmfhjtTMSiLXM'},
    'relatedProjects': ['Grand Theft Coconut Creek (city-clone/)', 'Mario World 1-1 recreation (mario-clone/)', 'Halloween Doodle Jump (doodle-clone/, planned)'],
  },
  'conventions': {
    'ids': 'dob-<kind>-<slug>; rounds dob-round-NNN[letter]; versions <asset id>@vN. Stable: re-imports should match on id.',
    'addedToGame': 'true only when verified in the main branch code and reachable in play; false when in code but not spawned, only on the art branch, or removed; "unverified" when unknown.',
    'status': 'commit-says = only a commit message or the notes claim it; tested = a recorded test, capture or check; user-approved / user-rejected = the notes record the user reaction.',
    'stage': ['concept', 'in-progress', 'built-not-in-game', 'in-game', 'replaced', 'removed', 'experiment'],
    'sentToClaude': 'null throughout: not tracked by this project; left for the studio catalog to fill.',
    'images': 'records reference image ids; the image data (WebP previews, longest side %d px) is in the separate dob-images block; "source" is the original file path in the repo checkout (full resolution stays there).' % MAXW,
  },
  'counts': {},
  'records': records,
  'openQuestions': questions,
  'missingImages': missing,
  'unresolvedRelatedIds': sorted(unresolved),
  'caveats': CAVEATS,
}
from collections import Counter
manifest['counts'] = dict(Counter(r.get('kind', '?') for r in records))

# ---------------------------------------------------------------- HTML
def esc(s): return html.escape(str(s if s is not None else ''))
def badge(t, cls): return f'<span class="b {cls}">{esc(t)}</span>'
def stageb(r):
    s = r.get('stage', ''); ag = r.get('addedToGame')
    out = badge(s or 'stage ?', 'st-' + re.sub('[^a-z]', '', str(s)))
    out += badge({True: 'in game', False: 'not in game', 'unverified': 'in game: unverified'}.get(ag, 'in game: unverified'), 'ag-' + str(ag).lower())
    st = r.get('status')
    if st: out += badge(st, 'ss')
    return out
def figs(lst, cls='figs'):
    if not lst: return ''
    return f'<div class="{cls}">' + ''.join(f'<figure><img loading="lazy" alt="{esc(x.get("caption") or x.get("role"))}" data-img="{x["image"]}"><figcaption><b>{esc(x.get("role",""))}</b> {esc(x.get("caption",""))}</figcaption></figure>' for x in lst) + '</div>'
def hist(r):
    h = r.get('history') or []
    if not h: return ''
    rows = ''.join(f'<li><div class="hv"><code>{esc(v.get("id",""))}</code> <span class="d">{esc(v.get("date",""))}</span> {badge(v.get("status",""),"ss") if v.get("status") else ""}</div><div class="ht"><b>{esc(v.get("title",""))}</b> {esc(v.get("change",""))}</div>{figs(v.get("images"), "figs small")}{"<div class=c>commits: " + esc(", ".join(v.get("commits") or [])) + "</div>" if v.get("commits") else ""}</li>' for v in h)
    return f'<details><summary>History: {len(h)} version{"s" if len(h)!=1 else ""}</summary><ol class="hist">{rows}</ol></details>'
def card(r):
    src = r.get('source'); srcs = ''
    if isinstance(src, dict):
        parts = []
        for k, v in src.items(): parts.append(f'{k}: ' + (', '.join(map(str, v)) if isinstance(v, list) else str(v)))
        srcs = '; '.join(parts)
    elif isinstance(src, list): srcs = ', '.join(map(str, src))
    elif src: srcs = str(src)
    d = r.get('dates') or {}
    dates = (d.get('first') or '') + ((' to ' + d['last']) if d.get('last') and d.get('last') != d.get('first') else '') if isinstance(d, dict) else str(d)
    rel = ' '.join(f'<a href="#{esc(x)}">{esc(x)}</a>' for x in (r.get('related') or []))
    hay = ' '.join([r.get('id',''), r.get('title',''), r.get('description',''), ' '.join(r.get('tags') or []), r.get('category','')]).lower()
    return f'''<article class="card" id="{esc(r['id'])}" data-kind="{esc(r.get('kind',''))}" data-cat="{esc(r.get('category',''))}" data-stage="{esc(r.get('stage',''))}" data-q="{esc(hay)}">
<header><h3>{esc(r.get('title', r['id']))}</h3><code class="id">{esc(r['id'])}</code></header>
<div class="meta">{badge(r.get('kind',''),'k')}{badge(r.get('category',''),'cat') if r.get('category') else ''}{stageb(r)}{('<span class="d">' + esc(dates) + '</span>') if dates else ''}</div>
<p>{esc(r.get('description',''))}</p>
{figs(r.get('images'))}
{('<p class="n"><b>Notes:</b> ' + esc(r.get('notes')) + '</p>') if r.get('notes') else ''}
{hist(r)}
<div class="foot">{('<div><b>Tags</b> ' + ' '.join(badge(t,'t') for t in (r.get('tags') or [])) + '</div>') if r.get('tags') else ''}{('<div><b>Related</b> ' + rel + '</div>') if rel else ''}{('<div class="c"><b>Source</b> ' + esc(srcs) + '</div>') if srcs else ''}</div>
</article>'''

rounds = sorted([r for r in records if r.get('kind') == 'round'], key=rkey)
assets = [r for r in records if r.get('kind') != 'round']
cats = []
for r in assets:
    c = r.get('category') or 'Uncategorised'
    if c not in cats: cats.append(c)
CAT_ORDER = ['Packs & Projects', 'Art Direction', 'Characters & Zombies', 'Weapons', 'Animations & Rigs', 'Outdoor', 'Indoor', 'Maps & Layouts', 'Props & Interactables', 'Textures & Decals', 'Audio', 'Food & Cooking', 'Reference & Documents', 'Uncategorised']
cats.sort(key=lambda c: CAT_ORDER.index(c) if c in CAT_ORDER else 99)
def kord(r): return (KIND_ORDER.index(r.get('kind')) if r.get('kind') in KIND_ORDER else 99, r.get('title', ''))
sections = ''.join(f'<section class="cat"><h2 id="cat-{i}">{esc(c)} <small>{sum(1 for r in assets if (r.get("category") or "Uncategorised")==c)}</small></h2><div class="grid">' + ''.join(card(r) for r in sorted([r for r in assets if (r.get('category') or 'Uncategorised') == c], key=kord)) + '</div></section>' for i, c in enumerate(cats))
tl = ''.join(card(r) for r in rounds)
def roster():
    sp = [r for r in records if r.get('kind') in ('spell', 'skill')]
    def cls(r):
        c = r.get('class') or ''
        if not c:
            for t in r.get('tags') or []:
                if t in ('warrior', 'mage', 'ranger'): c = t
        return c
    rows = ''
    for c in ('warrior', 'mage', 'ranger', 'all'):
        cur = [r for r in sp if cls(r) == c and r.get('stage') == 'in-game']
        old = [r for r in sp if cls(r) == c and r.get('stage') in ('removed', 'replaced')]
        if not cur and not old: continue
        def li(r):
            h = r.get('history') or []
            when = (h[-1].get('title') or '') if r.get('stage') in ('removed', 'replaced') and h else ''
            return f'<li><a href="#{esc(r["id"])}">{esc(r.get("title"))}</a>' + (f' <span class="d">{esc(when)}</span>' if when else '') + '</li>'
        rows += f'<tr><td><b>{esc(c.title())}</b></td><td><ul>{"".join(li(r) for r in cur)}</ul></td><td><ul>{"".join(li(r) for r in old)}</ul></td></tr>'
    return f'<section class="panel" id="roster"><h2 style="margin-top:4px">Spell and skill roster</h2><p class="n">What each class casts today, and what was cut or replaced along the way (the last history entry says when). Every name links to its card with the full history and images.</p><div style="overflow-x:auto"><table class="leg ro"><tr><td></td><td><b>In the game now</b></td><td><b>Removed or replaced</b></td></tr>{rows}</table></div></section>'
def caveats():
    return '<section class="panel" id="caveats"><h2 style="margin-top:4px">Read this first: what is certain and what is not</h2><ul>' + ''.join(f'<li>{esc(c)}</li>' for c in CAVEATS) + '</ul></section>'
nav = ''.join(f'<a href="#cat-{i}">{esc(c)}</a>' for i, c in enumerate(cats))
kinds = sorted({r.get('kind','') for r in assets})
kopts = ''.join(f'<option value="{esc(k)}">{esc(k)}</option>' for k in kinds)
first = min((r.get('dates') or {}).get('first') or '9' for r in rounds) if rounds else ''
last = max((r.get('dates') or {}).get('last') or (r.get('dates') or {}).get('first') or '' for r in rounds) if rounds else ''

manifest_json = json.dumps(manifest, ensure_ascii=False, indent=1).replace('</', '<\\/')
images_json = json.dumps({k: v for k, v in imgs.items()}, ensure_ascii=False).replace('</', '<\\/')

page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dungeon of Bones: Build Dossier</title>
<meta name="description" content="Standalone build dossier for Dungeon of Bones: a dated timeline of every build round and an asset catalog with before/after art, for import into a studio catalog.">
<style>
:root{{--bg:#14111a;--panel:#1d1826;--panel2:#251f31;--ink:#efe8db;--mute:#b3a9c2;--line:#3a3150;--gold:#e9c27a;--ok:#7fc98a;--no:#e38a7a;--unk:#c9b56a}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}}
a{{color:var(--gold)}} a:hover{{color:#ffd99a}} code{{font-family:ui-monospace,Menlo,monospace;font-size:.85em}}
.wrap{{max-width:1240px;margin:0 auto;padding:24px 16px 80px}}
h1{{font-size:clamp(26px,4vw,40px);margin:0 0 4px;color:var(--gold);letter-spacing:.5px}} h2{{margin:40px 0 14px;font-size:24px;border-bottom:2px solid var(--line);padding-bottom:6px}} h2 small{{color:var(--mute);font-weight:400;font-size:15px}}
h3{{margin:0;font-size:18px}} .lede{{color:var(--mute);max-width:820px}}
.panel{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0}}
.kv{{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}} .kv b{{color:var(--mute);font-weight:500}}
nav.top{{position:sticky;top:0;z-index:5;background:#14111aee;backdrop-filter:blur(4px);border-bottom:1px solid var(--line);padding:8px 16px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px}}
.tools{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}} .tools input,.tools select{{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:9px 10px;font:inherit;min-height:44px}} .tools input{{flex:1 1 260px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:14px}} .tl{{display:grid;gap:12px}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-width:0}}
.card header{{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;align-items:baseline}} .id{{color:var(--mute)}}
.card p{{margin:0}} .n{{color:var(--mute);font-size:14px}}
.meta{{display:flex;flex-wrap:wrap;gap:6px;align-items:center}} .b{{display:inline-block;font-size:12px;padding:2px 8px;border-radius:99px;background:var(--panel2);border:1px solid var(--line);color:var(--mute)}}
.b.k{{color:var(--gold);border-color:#6b5532}} .ag-true{{color:var(--ok);border-color:#3d6b45}} .ag-false{{color:var(--no);border-color:#7a4338}} .ag-unverified,.ag-none{{color:var(--unk)}} .d{{font-size:13px;color:var(--mute)}}
.figs{{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}} .tl .figs{{grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr))}} .figs.small{{grid-template-columns:minmax(0,1fr);max-width:520px}}
figure{{margin:0;background:#0d0b12;border:1px solid var(--line);border-radius:6px;overflow:hidden}} figure img{{display:block;width:100%;height:auto;image-rendering:pixelated;cursor:zoom-in}} figcaption{{font-size:12px;color:var(--mute);padding:4px 6px}} figcaption b{{color:var(--gold);font-weight:500;text-transform:uppercase;font-size:11px}}
details summary{{cursor:pointer;color:var(--gold);min-height:32px}} ol.hist{{margin:6px 0 0;padding-left:20px;display:grid;gap:10px}} .hv{{display:flex;flex-wrap:wrap;gap:6px;align-items:center}} .ht{{font-size:14px}} .c{{font-size:12px;color:var(--mute);word-break:break-word}}
.foot{{display:grid;gap:4px;font-size:13px;border-top:1px solid var(--line);padding-top:8px}} .foot a{{font-size:12px;margin-right:6px}}
.hide{{display:none!important}} #zoom{{position:fixed;inset:0;background:#000d;display:none;align-items:center;justify-content:center;z-index:9;padding:16px}} #zoom img{{max-width:100%;max-height:100%;image-rendering:pixelated}}
table.leg{{border-collapse:collapse;font-size:14px}} table.ro ul{{margin:0;padding-left:18px}} table.leg td{{border-top:1px solid var(--line);padding:6px 10px;vertical-align:top}}
</style></head><body>
<nav class="top" aria-label="Sections"><a href="#about">About</a><a href="#import">For the importing AI</a><a href="#roster">Spells &amp; skills</a><a href="#timeline">Timeline ({len(rounds)})</a><a href="#catalog">Asset catalog ({len(assets)})</a>{nav}</nav>
<div class="wrap">
<header id="about"><h1>Dungeon of Bones</h1><p class="lede">Build dossier: every build round in date order, and every asset with its before and after art. A Diablo-style action RPG made in conversation with Claude, from {esc(first)} to {esc(last)}. Generated {esc(manifest['generated'])}.</p></header>
<div class="panel kv">
<b>Project id</b><span><code>dungeon-of-bones</code> (also written "Dungeons of Bones"; folder <code>diablo-clone/</code>)</span>
<b>Repository</b><span>github.com/marcsarno/indie-games, folder <code>diablo-clone/</code></span>
<b>Play (2D)</b><span><a href="https://claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g">claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g</a></span>
<b>Play (3D remake)</b><span><a href="https://dungeons-of-bones-3d-marcsarno.vercel.app">dungeons-of-bones-3d-marcsarno.vercel.app</a></span>
<b>Play (third-person World)</b><span><a href="https://bones-world-3d-marcsarno.vercel.app">bones-world-3d-marcsarno.vercel.app</a></span>
<b>Records</b><span>{len(rounds)} build rounds, {len(assets)} assets, {len(imgs)} preview images</span>
</div>
<section id="import" class="panel"><h2 style="margin-top:4px">For the importing AI</h2>
<p>All data is in <code>&lt;script type="application/json" id="dob-catalog"&gt;</code> (records, conventions, counts, open questions). Image previews are in <code>id="dob-images"</code> as <code>{{"img-…": {{"src": original path, "data": WebP data URI}}}}</code>; records point at them by id in <code>images[].image</code> and <code>preview</code>. Match on <code>id</code> when updating. Full-resolution originals stay in the repository at each image's <code>source</code> path.</p>
<table class="leg"><tr><td><b>addedToGame</b></td><td>true only when verified in the main branch code and reachable in play; false when in code but not spawned, only on the <code>art</code> branch, or removed; "unverified" when unknown.</td></tr>
<tr><td><b>status</b></td><td><i>commit-says</i>: only a commit message or the notes claim it. <i>tested</i>: a recorded test, capture or check. <i>user-approved</i> / <i>user-rejected</i>: the notes record the user's reaction.</td></tr>
<tr><td><b>stage</b></td><td>concept, in-progress, built-not-in-game, in-game, replaced, removed, experiment</td></tr>
<tr><td><b>categories</b></td><td>The studio's categories are used as given. Spells, skills, bosses, UI and story are tags (<code>spell</code>, <code>skill</code>, <code>boss</code>, <code>ui</code>, <code>story</code>); suggested new categories: <b>Spells &amp; Skills</b>, <b>UI</b>, <b>Story &amp; Cutscenes</b>.</td></tr>
<tr><td><b>sentToClaude</b></td><td>null throughout (not tracked by this project).</td></tr></table>
</section>
{caveats()}
{roster()}
<div class="tools"><label for="q" class="hide">Search</label><input id="q" type="search" placeholder="Search names, ids, tags…" aria-label="Search records"><select id="fk" aria-label="Filter by kind"><option value="">All kinds</option><option value="round">round</option>{kopts}</select><select id="fs" aria-label="Filter by stage"><option value="">All stages</option><option>in-game</option><option>built-not-in-game</option><option>in-progress</option><option>concept</option><option>replaced</option><option>removed</option><option>experiment</option></select></div>
<h2 id="timeline">Timeline: build rounds <small>{len(rounds)}</small></h2>
<div class="tl">{tl}</div>
<h2 id="catalog">Asset catalog <small>{len(assets)}</small></h2>
{sections}
</div>
<div id="zoom" role="dialog" aria-label="Image preview"><img alt=""></div>
<script type="application/json" id="dob-catalog">{manifest_json}</script>
<script type="application/json" id="dob-images">{images_json}</script>
<script>
(function(){{
  var q=document.getElementById('q'),fk=document.getElementById('fk'),fs=document.getElementById('fs'),cards=[].slice.call(document.querySelectorAll('.card'));
  function run(){{var t=(q.value||'').toLowerCase(),k=fk.value,s=fs.value;cards.forEach(function(c){{var ok=(!t||c.dataset.q.indexOf(t)>=0)&&(!k||c.dataset.kind===k)&&(!s||c.dataset.stage===s);c.classList.toggle('hide',!ok);}});}}
  q.addEventListener('input',run);fk.addEventListener('change',run);fs.addEventListener('change',run);
  var IM=JSON.parse(document.getElementById('dob-images').textContent);
  [].slice.call(document.querySelectorAll('img[data-img]')).forEach(function(im){{var d=IM[im.getAttribute('data-img')];if(d)im.src=d.data;}});
  var z=document.getElementById('zoom'),zi=z.querySelector('img');
  document.addEventListener('click',function(e){{if(e.target.tagName==='IMG'&&e.target.closest('figure')){{zi.src=e.target.src;zi.alt=e.target.alt;z.style.display='flex';}}else if(e.target===z||e.target===zi){{z.style.display='none';}}}});
}})();
</script>
</body></html>'''
open(out, 'w').write(page)
print(out, f'{os.path.getsize(out)/1e6:.1f} MB', len(records), 'records', len(imgs), 'images', len(missing), 'missing image paths')
