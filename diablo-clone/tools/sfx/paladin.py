# Round 108: the Paladin's own sounds. For each of his 16 sound events: NOW (what he plays today, the
# same layers mixed at their in-game volumes) and 4-7 candidates: new recordings from free packs plus
# sounds the game already has (the barbarian's swings, the mage's spells) where they fit.
#   python3 tools/sfx/paladin.py <downloads dir> <synth wav dir> <out dir>
# The page saves picks in its own db at picks/main (and localStorage 'sound-picks-pal').
import os, sys, subprocess, re, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, '..', '..', 'game', 'sfx')
sys.path.insert(0, HERE)
from paladin_cands import PACKS, G   # the candidate lists (paladin_cands.py)

# what the game plays today for each event: (sound, volume); synth-only sounds come from the synth renders
SAMPLE_GAIN = {}
src = open(os.path.join(HERE, '..', '..', 'game', 'js', 'sound.js')).read()
for k, v in re.findall(r'(\w+): ([0-9.]+)', re.search(r'const SAMPLE_GAIN = \{([^}]*)\}', src).group(1)): SAMPLE_GAIN[k] = float(v)
SYNTH_GAIN = {k: float(v) for k, v in re.findall(r'(\w+): ([0-9.]+)', re.search(r'const SYNTH_GAIN = \{([^}]*)\}', src).group(1))}

def peak(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'max_volume: (-?[0-9.]+) dB', o); return float(m.group(1)) if m else 0.0
def dur(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout or 0)
def conv(srcs, dst, maxlen, start=0.0):
    """one file, or several layered ([(path, gain dB, delay s[, start s])]), trimmed, peak -1 dB, mono MP3"""
    tmp = dst + '.tmp.wav'
    if isinstance(srcs, str): srcs = [(srcs, 0, 0, start)]
    srcs = [tuple(x) + (0,) * (4 - len(x)) for x in srcs]
    args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    for p, _, _, st in srcs: args += (['-ss', str(st)] if st else []) + ['-i', p]
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'
    fl = ';'.join(f'[{i}:a]aformat=channel_layouts=mono,aresample=44100,volume={g}dB,adelay={int(d * 1000)}[s{i}]' for i, (_, g, d, _) in enumerate(srcs))
    fl += ';' + ''.join(f'[s{i}]' for i in range(len(srcs))) + f'amix=inputs={len(srcs)}:normalize=0:duration=longest,atrim=0:{maxlen},' + trim + '[o]'
    args += ['-filter_complex', fl, '-map', '[o]', '-ac', '1', tmp]
    subprocess.run(args, check=True)
    g = -1.0 - peak(tmp)
    d = min(maxlen, dur(tmp))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB,afade=t=out:st={max(0, d - 0.12):.2f}:d=0.12', '-codec:a', 'libmp3lame', '-b:a', '96k', dst], check=True)
    os.remove(tmp)

def now_mix(layers, synth, dst, maxlen):
    """NOW: the event's current layers at their in-game volumes (relative), then one overall peak normalize"""
    import math
    srcs = []
    for name, vol, *dl in layers:
        f = os.path.join(GAME, name + '.mp3')
        g = SAMPLE_GAIN.get(name, 0.6) * vol
        if not os.path.exists(f): f = os.path.join(synth, name + '.wav'); g = SYNTH_GAIN.get(name, 1.0) * vol
        srcs.append((f, round(20 * math.log10(max(g, 1e-3)), 2), dl[0] if dl else 0))
    conv(srcs, dst, maxlen)

def resolve(D, p):
    if p.startswith('game:'): return os.path.join(GAME, p[5:] + '.mp3')
    if os.path.exists(os.path.join(D, p)): return os.path.join(D, p)
    raise SystemExit('missing ' + p)

if __name__ == '__main__':
    D, SYN, OUT = sys.argv[1:4]
    os.makedirs(os.path.join(OUT, 'a'), exist_ok=True)
    manifest = []
    for gname, evs in G:
        out = []
        for ev in evs:
            key, title, desc, now, cands, maxlen = ev['key'], ev['title'], ev['desc'], ev['now'], ev['cands'], ev.get('len', 2.5)
            nowf = f'{key}-now.mp3'; now_mix(now, SYN, os.path.join(OUT, 'a', nowf), maxlen)
            e = {'key': key, 'title': title, 'desc': desc, 'now': nowf, 'nowWhat': ' + '.join(n for n, *_ in now), 'cands': []}
            for n, c in enumerate(cands):
                p = c['src']; fn = f'{key}-{"abcdefgh"[n]}.mp3'
                srcs = [(resolve(D, q[0]),) + tuple(q[1:]) for q in p] if isinstance(p, list) else resolve(D, p)
                conv(srcs, os.path.join(OUT, 'a', fn), c.get('len', maxlen), c.get('start', 0.0))
                if isinstance(p, str) and p.startswith('game:'): pk = ('Already in the game: ' + c.get('note', p[5:]), '', '', '')
                else: pk = PACKS[c['pack']]
                e['cands'].append({'file': fn, 'src': p, 'pack': pk[0], 'author': pk[1], 'license': pk[2], 'url': pk[3], 'note': c.get('note', '')})
            out.append(e)
        manifest.append((gname, out))
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    # the page: round 2's frame (tools/pages/soundpicks2.html), its own storage key
    old = open(os.path.join(HERE, '..', 'pages', 'soundpicks2.html')).read()
    head = old[:old.index('<main>')].replace('<title>Sound Picks II</title>', '<title>Paladin Sound Picks</title>')
    script = old[old.index('<script>'):].replace("'sound-picks-2'", "'sound-picks-pal'")
    E = html.escape; L = "ABCDEFGH"
    body = ['<main>', '  <header>', '    <h1>Paladin Sound Picks</h1>',
      '    <p class="lede">The Paladin borrowed everyone else\'s sounds: mage zaps, the portal hum, the level-up chime, a tiny clink for a giant bell. Here is a sound of his own for each of his 16 moments. NOW is what he plays today; the letters are new recordings from free packs, plus a few sounds the game already has where they fit (marked). Tap to listen, then pick. Pick NOW to keep one as it is. Your picks save as you go, and I read them from here.</p>',
      '    <p class="lede">Headphones or the phone held close help. Everything is level-matched, so judge the character of each sound, not its loudness: I set in-game volumes after you pick.</p>',
      '  </header>', '  <p class="status" id="status">Loading your picks&hellip;</p>']
    for gname, evs in manifest:
        body += ['  <section>', f'    <h2 class="g">{E(gname)}</h2>']
        for ev in evs:
            k = ev['key']; opts = [('NOW', 'now', ev['now'])] + [(L[n], L[n].lower(), cd['file']) for n, cd in enumerate(ev['cands'])]
            body += [f'    <div class="ev" data-key="{k}">', f'      <h3>{E(ev["title"])}</h3>', f'      <p class="d">{E(ev["desc"])}</p>', '      <div class="opts">']
            for lab, val, f in opts:
                body.append(f'        <div class="opt"><button class="play" data-src="a/{f}" aria-label="Play {lab} for {E(ev["title"])}">&#9654; {lab}</button><label><input type="radio" name="{k}" value="{val}"> pick</label></div>')
            cr = [f'NOW: today\'s {E(ev["nowWhat"])}'] + [f'{L[n]}: ' + (E(cd['note']) + ' &middot; ' if cd['note'] and not cd['pack'].startswith('Already') else '') + E(cd['pack']) + (' by ' + E(cd['author']) if cd['author'] else '') + (f' ({cd["license"]})' if cd['license'] else '') for n, cd in enumerate(ev['cands'])]
            body += ['      </div>', '      <p class="credit">' + '; '.join(cr) + '</p>', '    </div>']
        body.append('  </section>')
    body += ['  <section>', '    <h2>Your picks so far</h2>', '    <div id="summary">None yet.</div>', '  </section>', '</main>']
    open(os.path.join(OUT, 'index.html'), 'w').write(head + '\n'.join(body) + '\n' + script)
    print(sum(len(e['cands']) for _, evs in manifest for e in evs), 'candidates,', sum(len(evs) for _, evs in manifest), 'sounds')
