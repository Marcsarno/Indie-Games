# builds tools/pages/bestiary.html from art/bestiary/ (run tools/capture/bestiary.cjs first)
import json, html
from PIL import Image
B = 'art/bestiary/'
m = json.load(open(B + 'bestiary.json'))
def img(f, alt, cls=''):
    w, h = Image.open(B + f).size
    return f'<img src="{f}" alt="{html.escape(alt)}" width="{w}" height="{h}" loading="lazy"{" class=" + chr(34) + cls + chr(34) if cls else ""}>'
def scroll(f, alt, cap):
    w, h = Image.open(B + f).size
    return f'<figure><div class="scroll"><img src="{f}" alt="{html.escape(alt)}" width="{w}" height="{h}" style="height:{max(110, min(200, h // 2))}px;width:auto" loading="lazy"></div><figcaption>{cap} &middot; <button class="save" data-src="{f}" hidden>save PNG</button></figcaption></figure>'
mon = [x for x in m['monsters'] if not x['boss']]; boss = [x for x in m['monsters'] if x['boss']]
fam = {}
for x in m['monsters']: fam.setdefault(x['family'], []).append(x)
out = []
out.append('''<title>Bestiary</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Source+Sans+3:wght@400;600&display=swap">
<style>
  /* the game's crypt colors, one dark look (same frame as the round pages) */
  :root { --crypt: #0d0908; --panel: #18110e; --ember: #c9a77c; --bone: #e8dcc4; --dim: #8a7660; --rule: #2e221b;
    --display: 'Cinzel', Georgia, serif; --body: 'Source Sans 3', system-ui, sans-serif; color-scheme: dark; }
  html, body { background: var(--crypt); color: var(--bone); }
  body { font: 16px/1.5 var(--body); margin: 0; padding: 28px max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px)); }
  main { max-width: 760px; margin: 0 auto; display: grid; gap: 36px; }
  section { display: grid; gap: 12px; min-width: 0; }
  h1 { font: 600 1.6rem/1.2 var(--display); color: var(--ember); margin: 0 0 6px; letter-spacing: .04em; }
  h2 { font: 600 1.1rem/1.3 var(--display); color: var(--ember); margin: 0; letter-spacing: .05em; }
  h3 { font: 600 1rem/1.3 var(--body); color: var(--bone); margin: 8px 0 0; }
  p, ul { margin: 0; max-width: 66ch; } ul { padding-left: 1.2em; display: grid; gap: 4px; }
  .lede { color: var(--dim); } a { color: var(--ember); }
  figure { margin: 0; display: grid; gap: 6px; min-width: 0; }
  .frame { background: var(--panel); border: 1px solid var(--rule); padding: 8px; }
  .frame img { display: block; width: 100%; height: auto; image-rendering: pixelated; }
  .scroll { overflow-x: auto; background: var(--panel); border: 1px solid var(--rule); padding: 6px; }
  .scroll img { display: block; image-rendering: pixelated; max-width: none; }
  figcaption { color: var(--dim); font-size: .9rem; }
  pre { white-space: pre-wrap; background: var(--panel); border: 1px solid var(--rule); padding: 12px; margin: 0; font-size: .9rem; color: var(--bone); }
  button.save { font: 600 .85rem var(--body); color: var(--crypt); background: var(--ember); border: 0; border-radius: 3px; padding: 2px 8px; cursor: pointer; }
  button.save.big { font-size: 1rem; padding: 8px 14px; justify-self: start; }
  .pal img { width: 352px; max-width: 100%; height: auto; image-rendering: pixelated; display: block; }
</style>
<main>
<header>
  <h1>Bestiary</h1>
  <p class="lede">Every monster, hero outfit, gear look and item in Dungeon of Bones, exactly as the game draws them. For an image generator or artist to design new ones in the same style.</p>
</header>
<section>
  <h2>How to use it</h2>
  <ul>
    <li>Give the generator an overview sheet (heroes or monsters) plus the palette as the style reference, and describe the new design in the prompt below.</li>
    <li>For new armor, also give it that class&rsquo;s gear row, so it sees how a piece sits on the hero.</li>
    <li>Bring the result back to the art chat. It rebuilds the design from the game&rsquo;s 3D shapes and runs it through the art review, so ask for clear silhouettes, colors and shapes rather than fine painted detail.</li>
  </ul>
</section>
<section>
  <h2>The style</h2>
  <ul>
    <li><strong>View:</strong> isometric 3/4 view from above, with 2:1 diamond floor tiles (32&times;16 game pixels). Characters have 8 facings.</li>
    <li><strong>Size:</strong> the screen is 270&times;480 game pixels. A hero is about ''' + str(m['heroHeight']) + ''' game pixels tall. Characters are drawn at twice that detail (one sprite pixel is half a game pixel), which is what these sheets show.</li>
    <li><strong>Proportions:</strong> chibi. A big round head, about a third of the height, on a short, sturdy body. Big readable weapons and helmets.</li>
    <li><strong>Construction:</strong> every part is a simple 3D shape (spheres, cylinders, boxes, cones) shaded in flat bands of 3 to 5 tones from one color ramp. No gradients, no texture noise, no anti-aliasing.</li>
    <li><strong>Light:</strong> from the upper left, with darker, slightly cooler shadow sides at the lower right.</li>
    <li><strong>Outline:</strong> a 1-pixel dark outline around the silhouette, and no black lines inside it.</li>
    <li><strong>Colors:</strong> only the palette below. Each material (bone, iron, cloth, leather, skin, fur) has its own ramp.</li>
    <li><strong>Animation:</strong> idle, a walk cycle, attack wind-up and strike, hit and death. The sheets show one frame of each.</li>
  </ul>
</section>
<section>
  <h2>Prompt template</h2>
<pre>Pixel art game sprite, same style as the attached reference sheet: chibi proportions (big round head, short sturdy body), isometric 3/4 top-down view, shown from 4 angles (front, front 3/4, side, back) side by side. Built from simple chunky shapes with flat 3-5 tone shading, light from the upper left, a 1-pixel dark outline, no gradients, no anti-aliasing, limited palette (attached), plain dark background, about 80 pixels tall.
Subject: [describe the new monster / armor / weapon here].</pre>
</section>
<section>
  <h2>Palette</h2>
  <figure class="pal"><div class="frame">''' + img('palette.png', 'The game palette: 126 numbered color swatches in ramps from dark to light') + '''</div><figcaption>All ''' + str(len(m['palette'])) + ''' colors the game uses, numbered. <button class="save" data-src="palette.png" hidden>save PNG</button></figcaption></figure>
</section>
<section>
  <h2>Overview sheets</h2>
  <figure><div class="frame">''' + img('sheet-heroes.png', 'All hero outfits facing front-right: warriors, mages and rangers') + '''</div><figcaption>The three heroes in every outfit. <button class="save" data-src="sheet-heroes.png" hidden>save PNG</button></figcaption></figure>
  <figure><div class="frame">''' + img('sheet-monsters.png', 'All ordinary monsters facing front-right at the same scale') + '''</div><figcaption>The monsters, all at one scale. <button class="save" data-src="sheet-monsters.png" hidden>save PNG</button></figcaption></figure>
  <figure><div class="frame">''' + img('sheet-bosses.png', 'The bosses and big monsters') + '''</div><figcaption>Bosses and big ones, drawn smaller than the rest. <button class="save" data-src="sheet-bosses.png" hidden>save PNG</button></figcaption></figure>
</section>
<section>
  <h2>Heroes, outfit by outfit</h2>
  <p class="lede">Six facings, two walk frames and the attack. Scroll each row sideways.</p>''')
for h in m['heroes']:
    out.append(scroll(h['file'].replace('art/bestiary/', ''), f"{h['cls']} {h['label']} in six facings, walk and attack", f"{h['cls'].capitalize()}: {html.escape(h['label'])}"))
out.append('</section><section><h2>Every gear look, worn</h2><p class="lede">Each piece the hero can wear, on the hero (front-right), class by class.</p>')
for g in m['gear']:
    out.append(scroll(g['file'], f"{g['cls']} {g['slot']}s: {', '.join(g['bases'])}", f"{g['cls'].capitalize()} {g['slot']}s ({len(g['bases'])})"))
out.append('</section><section><h2>Monsters</h2><p class="lede">Six facings, then walk, wind-up, strike, hit and death. Grouped by body family: one body can wear many looks.</p>')
for f, xs in fam.items():
    out.append(f'<h3>{f.capitalize()} family</h3>')
    for x in xs:
        name = x['name'].title() + (f" ({x['title'].capitalize()})" if x['title'] else '')
        out.append(scroll(f"monsters/{x['id']}.png", f"{x['name']} in six facings and its action frames", html.escape(name) + (' &middot; boss' if x['boss'] else '')))
out.append('</section><section><h2>Item icons</h2>')
for it in m['items']:
    out.append(scroll(it['file'], f"{it['slot']} icons", f"{it['slot'].capitalize()} icons ({it['n']})"))
out.append('</section></main>')
out.append('''<script>
// the save buttons: the viewer is asked before each file is saved (they stay hidden where saving is not possible)
(async () => {
  let dl = null; try { dl = await claude.use('downloads'); } catch (e) { dl = null; }
  if (!dl) return;
  for (const b of document.querySelectorAll('button.save')) {
    b.hidden = false;
    b.addEventListener('click', async () => {
      const src = b.dataset.src, t = b.textContent; b.disabled = true; b.textContent = 'preparing...';
      try { const blob = await (await fetch(src)).blob(); await dl.save({ filename: 'bestiary-' + src.replace(/\\//g, '-'), data: blob }); b.textContent = 'saved'; }
      catch (e) { b.textContent = e && e.code === 'declined' ? t : 'could not save'; }
      setTimeout(() => { b.textContent = t; b.disabled = false; }, 2000);
    });
  }
})();
</script>''')
open('tools/pages/bestiary.html', 'w').write('\n'.join(out))
print('ok')
