# Round 58: puts the user's round-2 picks (tools/sfx/picks2.json, from Sound Picks II) into the game:
# game/sfx/<name>.mp3 replaced or added (trimmed, -1 dB peak, mono 64 kbps, as build_game.py), and the
# credits appended to game/sfx/CREDITS.md. Prints what changed for sound.js SAMPLES.
#   python3 tools/sfx/apply_round2.py <downloads dir>
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import round2 as R2
D = sys.argv[1]; OUT = os.path.join(HERE, '..', '..', 'game', 'sfx')
picks = json.load(open(os.path.join(HERE, 'picks2.json')))
done, lines = {}, ['', '## Round 2 (round 58)', '']
for g, evs in R2.G:
    for key, title, desc, cands in evs:
        v = picks.get(key)
        if not v or v == 'now': continue
        src = cands['abcdefg'.index(v)]; pack = next(k for k in sorted(R2.PACKS, key=len, reverse=True) if src.startswith(k)); P = R2.PACKS[pack]
        for f in os.listdir(OUT):
            if f == key + '.mp3' or (f.startswith(key + '_') and f.endswith('.mp3')): os.remove(os.path.join(OUT, f))
        R2.conv(os.path.join(D, src), os.path.join(OUT, key + '.mp3'), 3.5 if key in R2.LONG else 2.2)
        done[key] = 1
        lines.append(f'- {key}.mp3 ({os.path.basename(src)}): **{P[0]}**' + (f' by {P[1]}' if P[1] else '') + f', {P[2]}' + (f': {P[3]}' if P[3] else ''))
open(os.path.join(OUT, 'CREDITS.md'), 'a').write('\n'.join(lines) + '\n')
print(json.dumps(done))
