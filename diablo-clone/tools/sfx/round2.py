# Round 58: a second round of sound candidates (the user: magic missile needs work, hurt and death are
# weak, some picks were only okay). For each sound: what the game plays now and 3-5 new recordings
# from new packs (CC0 unless noted). Builds the clips and the listening page.
#   python3 tools/sfx/round2.py <downloads dir> <out dir>
import os, sys, subprocess, re, json, html
D, OUT = sys.argv[1], sys.argv[2]
GAME = os.path.join(os.path.dirname(__file__), '..', '..', 'game', 'sfx')
c, m, g, d = 'oga2/combat150/04_magic_spells/', 'oga2/magic-spell-sfx/', 'oga2/male-grunts/yelling sounds/', 'oga2/death-male/'
w, x, r = 'oga2/combat150/01_combat_melee/', 'oga2/combat150/03_explosions_destruction/', 'oga2/combat150/02_combat_ranged/'
o3 = 'oga3/'
s, sw, i = 'oga2/sword20/', 'oga2/swishes/swishes/', 'oga2/impact/qubodupImpact/'
PACKS = {
  'oga2/combat150/': ("150 Combat Sound Effects", "various", "CC0", "https://opengameart.org/content/150-combat-sound-effects"),
  m: ("Magic Spell SFX", "OGA", "CC0", "https://opengameart.org/content/magic-spell-sfx"),
  'oga2/male-grunts/': ("Male Grunt/Yelling sounds", "HaelDB", "CC0", "https://opengameart.org/content/male-gruntyelling-sounds"),
  d: ("DEATH SOUNDS (Male)", "VoiceBosch", "CC-BY-SA 4.0", "https://opengameart.org/content/death-sounds-male-audio-pack"),
  s: ("20 Sword Sound Effects", "StarNinjas", "CC0", "https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes"),
  'oga2/swishes/': ("Swishes Sound Pack", "artisticdude", "CC0", "https://opengameart.org/content/swishes-sound-pack"),
  'oga2/impact/': ("Impact", "qubodup", "CC0", "https://opengameart.org/content/impact"),
  'oga3/electric-sound-effects-library/': ("Electric Sound Effects Library", "Little Robot Sound Factory", "CC-BY 3.0", "https://opengameart.org/content/electric-sound-effects-library"),
  'oga3/swish-bamboo-stick-weapon-swhoshes/': ("Swish - bamboo stick weapon swooshes", "qubodup", "CC0", "https://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes"),
  'oga3/air-woosh-move/': ("Air Woosh Move", "OGA", "CC0", "https://opengameart.org/content/air-woosh-move"),
  'oga3/4-projectile-launches/': ("4 projectile launches", "OGA", "CC-BY 3.0", "https://opengameart.org/content/4-projectile-launches"),
  'oga/80-cc0-rpg-sfx/': ("80 CC0 RPG SFX", "rubberduck", "CC0", "https://opengameart.org/content/80-cc0-rpg-sfx"),
  'mix/': ("Layered here: the bamboo swoosh (qubodup, CC0) and the electric whoosh (Little Robot Sound Factory, CC-BY 3.0)", "", "CC-BY 3.0", ""),
}
G = [
 ("Spells", [
  ("missile", "Magic missile", "The mage's bolt leaving the staff, as a fast whoosh through the air (round 2b: the first five sounded like a tune)", [o3 + 'electric-sound-effects-library/Wav/Whoosh_Electric/Whoosh_Electric_00.wav', r + 'Shoot_02_s01.wav', 'oga/80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/spell_fire_04.ogg', o3 + 'swish-bamboo-stick-weapon-swhoshes/swosh-24.flac', o3 + 'air-woosh-move/air_move.wav', o3 + '4-projectile-launches/launches/iceball.wav', 'mix/air-arcane.wav']),
  ("zap", "Missile hits", "A bolt striking", [c + 'ElectroZap_s01.wav', c + 'HeavyZap_s01.wav', x + 'BlastImpact_01_s01.wav', c + 'Retro Electric Short 03_s05.wav', x + 'GravityBomb_01_s01.wav']),
  ("fireball", "Fireball", "A fireball thrown", [c + 'Fire Spell Impact 3_s06.wav', c + 'Fire Spell Impact 5_s06.wav', m + 'magical_6_0.ogg', x + 'explosion_crunch_000_48kHz_16bit_0.78s_e875be4e_s04.wav']),
  ("boom", "Explosion", "Fireball and meteor blasts", [x + 'explosion_crunch_002_48kHz_16bit_1.26s_e0852ce0_s04.wav', x + 'low_frequency_explosion_000_48kHz_16bit_2s_84586419_s04.wav', x + 'BlastImpact_02_s01.wav', x + 'Retro Explosion Short 01_s05.wav']),
  ("meteor", "Meteor", "The meteor coming down", [c + 'Fire Spell Impact 1_s06.wav', c + 'Earth Spell Impact 1_s07.wav', x + 'explosion_crunch_004_48kHz_16bit_1.98s_b6838d5c_s04.wav']),
  ("frost", "Frost", "Frost Nova, Cone of Cold, frozen foes", [c + 'Ice Spell Impact 1_s06.wav', c + 'Ice Spell Impact 3_s06.wav', c + 'Ice Spell Impact 5_s06.wav']),
  ("blink", "Blink", "The mage's teleport", [c + 'Wind Spell Impact 1_s07.wav', m + 'magical_7_0.ogg', m + 'magical_1_0.ogg', c + 'Retro Charge Off StereoUP 02_s05.wav']),
 ]),
 ("You", [
  ("hurt", "You're hurt", "The hero taking a hit (you said it's weak)", [g + '3grunt1.wav', g + '3grunt3.wav', g + '1yell6.wav', g + '2yell3.wav', g + 'yell6.wav']),
  ("death", "You die", "The hero falling (you said it's weak)", [d + '01.wav', d + '05.wav', d + '12.wav', d + '19.wav', g + '3yell13.wav']),
 ]),
 ("Weapons", [
  ("swing", "Light swing", "Sword and light weapon swings", [sw + 'swish-1.wav', sw + 'swish-4.wav', s + 'sword - StarNinjas/sword.3.ogg', s + 'sword - StarNinjas/sword.6.ogg']),
  ("heavySwing", "Heavy swing", "Axe, mace and two-handed swings", [sw + 'swish-8.wav', sw + 'swish-9.wav', s + 'sword - StarNinjas/sword.1.ogg', s + 'sword - StarNinjas/sword.9.ogg']),
  ("hit", "Blade hits flesh", "A normal hit landing", [w + 'impact_punch_medium_000_48kHz_16bit_0.36s_bd322da3_s02.wav', i + 'qubodupImpactMeat01.ogg', w + 'knife_slice_48kHz_16bit_0.51s_9438a1db_s03.wav', w + 'SmallImpact_01_s01.wav']),
  ("crit", "Critical hit", "A heavy, critical blow", [w + 'impact_punch_heavy_000_48kHz_16bit_0.65s_8fb58ba7_s02.wav', w + 'impact_punch_heavy_002_48kHz_16bit_0.46s_565485a1_s02.wav', i + 'qubodupImpactMeat02.ogg']),
  ("block", "Block", "A shield or weapon blocks a blow", [s + 'sword_clash.1.ogg', s + 'sword_clash.5.ogg', i + 'qubodupImpactMetal.ogg']),
  ("clank", "Armor clank", "Metal on metal", [s + 'sword_clash.3.ogg', s + 'sword_clash.8.ogg']),
 ]),
 ("World", [
  ("crack", "Ground crack", "Slams, leaps and quakes", [i + 'qubodupImpactStone.ogg', x + 'explosion_crunch_001_48kHz_16bit_1.36s_5803a7f0_s04.wav']),
  ("barrel", "Break a barrel", "Barrels and crates smashing", [i + 'qubodupImpactWood.ogg', x + 'Break_01_s01.wav']),
  ("splat", "Splat", "Gore and slime", [w + 'slime_000_48kHz_16bit_0.5s_691d3d6e_s04.wav']),
 ]),
]
LONG = {'missile', 'boom', 'meteor', 'death', 'frost', 'fireball', 'blink'}
def peak(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    mm = re.search(r'max_volume: (-?[0-9.]+) dB', o); return float(mm.group(1)) if mm else 0.0
def conv(src, dst, maxlen):
    tmp = dst + '.tmp.wav'
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-t', str(maxlen), '-af', trim, tmp], check=True)
    gain = -1.0 - peak(tmp)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.2f}dB,afade=t=out:st={max(0, maxlen - 0.15)}:d=0.15', '-codec:a', 'libmp3lame', '-b:a', '96k', dst], check=True)
    os.remove(tmp)
os.makedirs(os.path.join(OUT, 'a'), exist_ok=True)
manifest = []
for gname, evs in G:
    out = []
    for key, title, desc, cands in evs:
        now = os.path.join(GAME, key + '.mp3')
        if not os.path.exists(now): now = os.path.join(sys.argv[3], key + '-now.mp3') if len(sys.argv) > 3 else None
        nowf = f'{key}-now.mp3'
        if now and os.path.exists(now): subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', now, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', os.path.join(OUT, 'a', nowf)], check=True)
        ev = {'key': key, 'title': title, 'desc': desc, 'now': nowf, 'cands': []}
        for n, p in enumerate(cands):
            pack = next(k for k in sorted(PACKS, key=len, reverse=True) if p.startswith(k)); P = PACKS[pack]
            fn = f'{key}-{"abcdefg"[n]}.mp3'; conv(os.path.join(D, p), os.path.join(OUT, 'a', fn), 3.5 if key in LONG else 2.2)
            ev['cands'].append({'file': fn, 'src': p, 'pack': P[0], 'author': P[1], 'license': P[2], 'url': P[3]})
        out.append(ev)
    manifest.append((gname, out))
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
# the page: the same frame as round 1's (tools/pages/soundpicks.html); picks saved in its own db at picks/main
old = open(os.path.join(os.path.dirname(__file__), '..', 'pages', 'soundpicks.html')).read()
head = old[:old.index('<main>')].replace('<title>Sound Picks</title>', '<title>Sound Picks II</title>').replace('repeat(4, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))')
script = old[old.index('<script>'):].replace("'sound-picks'", "'sound-picks-2'")
E = html.escape
body = ['<main>', '  <header>', '    <h1>Sound Picks II</h1>',
  '    <p class="lede">Dungeon of Bones, round 2. For each sound: NOW is what the game plays today, and the letters are new recordings from free packs I hadn\'t used yet. Tap to listen, then pick. Pick NOW to keep a sound as it is. Your picks save as you go, and I read them from here.</p>',
  '    <p class="lede">The magic missile, the hurt and the death sounds come first. Headphones or a phone held close help: the new ones are level-matched, NOW is at its in-game volume.</p>',
  '  </header>', '  <p class="status" id="status">Loading your picks&hellip;</p>']
for gname, evs in manifest:
    body += ['  <section>', f'    <h2 class="g">{E(gname)}</h2>']
    for ev in evs:
        k = ev['key']; opts = [('NOW', 'now', ev['now'])] + [("ABCDEFG"[n], "abcdefg"[n], cd['file']) for n, cd in enumerate(ev['cands'])]
        body += [f'    <div class="ev" data-key="{k}">', f'      <h3>{E(ev["title"])}</h3>', f'      <p class="d">{E(ev["desc"])}</p>', '      <div class="opts">']
        for lab, val, f in opts:
            body.append(f'        <div class="opt"><button class="play" data-src="a/{f}" aria-label="Play {lab} for {E(ev["title"])}">&#9654; {lab}</button><label><input type="radio" name="{k}" value="{val}"> pick</label></div>')
        body += ['      </div>', '      <p class="credit">' + '; '.join(f'{"ABCDEFG"[n]}: {E(cd["pack"])}{" by " + E(cd["author"]) if cd["author"] else ""} ({cd["license"]})' for n, cd in enumerate(ev['cands'])) + '</p>', '    </div>']
    body.append('  </section>')
body += ['  <section>', '    <h2>Your picks so far</h2>', '    <div id="summary">None yet.</div>', '  </section>', '</main>']
open(os.path.join(OUT, 'index.html'), 'w').write(head + '\n'.join(body) + '\n' + script)
print(sum(len(e['cands']) for _, evs in manifest for e in evs), 'candidates,', sum(len(evs) for _, evs in manifest), 'sounds')
