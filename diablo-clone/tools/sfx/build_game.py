# Turns the user's picks (tools/sfx/picks.json, read from the Sound Picks page) into the game's
# sound files: game/sfx/<name>.mp3 (+ <name>_2.. variants from the same pack), trimmed, -1 dB
# peak, mono 64 kbps, and game/sfx/CREDITS.md. Prints the list for sound.js SAMPLES.
# python3 tools/sfx/build_game.py <downloads dir>
import os, sys, json, re, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); import candidates as C
D = sys.argv[1]; OUT = os.path.join(HERE, '..', '..', 'game', 'sfx'); os.makedirs(OUT, exist_ok=True)
picks = json.load(open(os.path.join(HERE, 'picks.json')))
# more takes of the most frequent sounds, from the same pack as the pick, so repeats vary
VARIANTS = {
  'step': ['footstep01.ogg', 'footstep03.ogg', 'footstep07.ogg'],
  'hit': ['sword-1b.wav'], 'kill': ['punch_alt-2b.wav'], 'thunk': ['piercing-1a.wav'],
  'swing': ['swing2.wav'], 'gold': ['Pickup_Gold_01.wav', 'Pickup_Gold_02.wav'], 'clatter': ['skeleton1sfx_0.wav'],
}
packOf = lambda p: next(k for k in sorted(C.PACKS, key=len, reverse=True) if p.startswith(k))
def find(pack, base):
    for root, _, fs in os.walk(D + pack):
        if '__MACOSX' not in root and base in fs: return os.path.join(root, base)
    raise SystemExit('missing ' + pack + base)
def peak(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'max_volume: (-?[0-9.]+) dB', r); return float(m.group(1)) if m else 0.0
def conv(src, dst, maxlen):
    tmp = dst + '.tmp.wav'
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-t', str(maxlen), '-af', trim, tmp], check=True)
    g = -1.0 - peak(tmp)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB,afade=t=out:st={max(0, maxlen - 0.15)}:d=0.15', '-codec:a', 'libmp3lame', '-b:a', '64k', dst], check=True)
    os.remove(tmp)
for f in os.listdir(OUT):
    if f.endswith('.mp3'): os.remove(os.path.join(OUT, f))
samples, used = {}, {}
for g, evs in C.GROUPS:
    for key, title, desc, cands in evs:
        v = picks.get(key)
        if not v or v == 'now': continue
        src = cands['abc'.index(v)]; pack = packOf(src)
        long = key in ('boom', 'meteor', 'cry', 'levelUp', 'death', 'frost', 'portal')
        files = [find(pack, os.path.basename(src))] + [find(pack, b) for b in VARIANTS.get(key, [])]
        names = []
        for n, f in enumerate(files):
            nm = key + (f'_{n + 1}' if n else '') + '.mp3'; conv(f, os.path.join(OUT, nm), 3.5 if long else 2.2); names.append(nm)
            used.setdefault(pack, []).append(f'{nm} ({os.path.basename(f)})')
        samples[key] = names
lines = ['# Sound credits', '', 'The game\'s sound effects (game/sfx/) come from these free packs on OpenGameArt; the files were trimmed, level-matched and converted to MP3. The rest of the sounds are synthesized in code (js/sound.js). Music is the user\'s own (game/music/).', '']
for pack, files in sorted(used.items(), key=lambda x: C.PACKS[x[0]][1].lower()):
    name, author, lic, url = C.PACKS[pack]
    lines += [f'- **{name}** by {author}, {lic}: {url}', '  ' + ', '.join(files)]
open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(lines) + '\n')
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.mp3'))
print(json.dumps(samples)); print(sum(len(v) for v in samples.values()), 'files', size // 1024, 'KB')
print('attribution:', sorted({C.PACKS[p][1] + ' (' + C.PACKS[p][2] + ')' for p in used if C.PACKS[p][2] != 'CC0'}))
