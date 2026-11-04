# Builds the listening page's audio: the current synth (rendered by tools/capture/synthwav.cjs)
# and each candidate, trimmed of silence, peak-normalized to -1 dB, mono MP3.
# python3 tools/sfx/build_listen.py <downloads dir> <synth wav dir> <out dir>
import os, sys, json, subprocess, re
sys.path.insert(0, os.path.dirname(__file__)); import candidates as C
D, NOW, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
def resolve(p):
    if os.path.exists(D + p): return D + p
    pack = next((k for k in sorted(C.PACKS, key=len, reverse=True) if p.startswith(k)), None)
    base = os.path.basename(p)
    for root, _, fs in os.walk(D + (pack or '')):
        if '__MACOSX' in root: continue
        if base in fs: return os.path.join(root, base)
    raise SystemExit('missing ' + p)
def peak(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'max_volume: (-?[0-9.]+) dB', r); return float(m.group(1)) if m else 0.0
def conv(src, dst, maxlen):
    tmp = dst + '.tmp.wav'
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-t', str(maxlen), '-af', trim, tmp], check=True)
    g = -1.0 - peak(tmp)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB,afade=t=out:st={max(0, maxlen - 0.15)}:d=0.15', '-codec:a', 'libmp3lame', '-b:a', '96k', dst], check=True)
    os.remove(tmp)
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout or 0)
manifest = []
for gname, evs in C.GROUPS:
    grp = {'group': gname, 'events': []}
    for key, title, desc, cands in evs:
        long = key in ('boom', 'meteor', 'cry', 'levelUp', 'death', 'frost', 'portal')
        ev = {'key': key, 'title': title, 'desc': desc, 'now': f'{key}-now.mp3', 'cands': []}
        conv(os.path.join(NOW, key + '.wav'), os.path.join(OUT, f'{key}-now.mp3'), 3)
        for n, p in enumerate(cands):
            src = resolve(p); pack = next(k for k in sorted(C.PACKS, key=len, reverse=True) if p.startswith(k)); P = C.PACKS[pack]
            fn = f'{key}-{"abc"[n]}.mp3'; dur = conv(src, os.path.join(OUT, fn), 3.5 if long else 2.2)
            ev['cands'].append({'file': fn, 'src': os.path.relpath(src, D), 'pack': P[0], 'author': P[1], 'license': P[2], 'url': P[3], 'dur': round(dur, 2)})
        grp['events'].append(ev)
    manifest.append(grp)
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print(sum(len(g['events']) for g in manifest), 'events;', sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) // 1024, 'KB')
