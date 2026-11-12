# Round 108b: the user's notes on round 1: every hammer-lands sound was wrong (NOW slices like a sword,
# the crit pick squishes): wanted a plain THUMP, no wood crack, no metal clank. The Consecrate pulse:
# a very light smolder (Consecrate itself became Seraph's Fall option C, Quendel's fire impact).
from paladin_cands import PACKS, Q
TITLE = 'Paladin Sound Picks II'
STORE = 'sound-picks-pal-2'
LEDE = ['Round 2, from your notes. The hammer landing: a plain heavy thump, no slice, no squish, no wood crack, no metal clank. The Consecrate pulse: a very light smolder that repeats while the ground burns.',
        'NOW is what the game plays today. Everything is level-matched, so judge the character; the pulse will sit very quietly in the game.']
H = 'hits-punches-qubodup/hits/'
FIRE = Q + 'Gregor Quendel - Designed Fire - Free Sounds/Gregor Quendel - Designed Fire - '
def c(src, pack, note='', **k): return dict(src=src, pack=pack, note=note, **k)
def L(note, *layers, **k): return dict(src=list(layers), pack='layered', note=note, **k)
G = [
 ("Hammer lands: a thump", [
  dict(key='palHit', title='Hammer lands', desc='The hammer striking a foe: a heavy blunt thump', len=0.8, now=[('hit', 1), ('thud', 0.45)], cands=[
    c(H + 'hit33.mp3.flac', 'hits', 'a deep body blow', len=0.7),
    c(H + 'hit20.mp3.flac', 'hits', 'a deep body blow', len=0.7),
    c(H + 'hit35.mp3.flac', 'hits', 'a round, padded thump', len=0.7),
    c(H + 'hit07.mp3.flac', 'hits', 'a heavy punch', len=0.7),
    c(H + 'hit27.mp3.flac', 'hits', 'a heavy punch', len=0.7),
    L('a deep blow with a low boom under it, heavier (qubodup + varkalandar)', (H + 'hit33.mp3.flac', 0, 0), ('boom-lowfreq-varkalandar/hjm-big_explosion_3.wav', -12, 0), len=0.8),
    L('a deep blow with a faint holy shimmer after it (qubodup)', (H + 'hit20.mp3.flac', 0, 0), ('shimmer-qubodup/shimmer_1.flac', -15, 0.06), len=0.8),
  ]),
 ]),
 ("Consecrate pulse: a light smolder", [
  dict(key='consecTick', title='Consecrated ground pulse', desc='Repeats while the blessed ground burns foes: should be barely there', len=1.0, now=[('clink', 0.6)], cands=[
    c(FIRE + 'Impacts - Complex 04.mp3', 'quendel', "the tail of your Consecrate pick, just the embers", start=1.7, len=1.0, fadein=0.12),
    c('jc-fantasy-vol1/Fantasy SFX Pack Vol 1/Loop_Fantasy SFX Pack Vol 1_Fireball_Hold.wav', 'jc', 'a soft fire hiss', start=0.5, len=1.0, fadein=0.2),
    c(FIRE + 'Textures - Glitch Ripples.mp3', 'quendel', 'rippling embers', start=2.0, len=1.0, fadein=0.15),
    dict(src='game:sizzle', pack='', note="the game's own sizzle"),
  ]),
 ]),
]
