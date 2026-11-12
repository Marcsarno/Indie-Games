# Round 108: the Paladin's sound candidates (for paladin.py). Paths are relative to the downloads folder
# (all from opengameart.org; the pages are in PACKS). 'game:<name>' is a sound the game already has.
# A candidate's src is a path, or a list of layers [(path, gain dB, delay s, start s)].
J = 'jc-fantasy-vol1/Fantasy SFX Pack Vol 1/Single_Fantasy SFX Pack Vol 1_'
Q = 'cinematic-quendel/Gregor Quendel - Designed Series - Free Downloads/'
MI, MT = 'medieval-impacts-stillnorth/', 'medieval-textures-stillnorth/'
PACKS = {
  'stillnorth': ("Medieval Weapon Impacts / Textures", "StillNorthMedia", "CC0", "https://opengameart.org/content/medieval-sound-effects-weapon-impacts"),
  'jc': ("Fantasy SFX Pack Vol 1", "JC Sounds", "CC-BY 4.0", "https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1"),
  'leo-heal': ("8 Heals and Buffs SFX", "leohpaz", "CC-BY 4.0", "https://opengameart.org/content/8-heals-and-buffs-sfx"),
  'leo-atk': ("8 Magic Attacks", "leohpaz", "CC-BY 4.0", "https://opengameart.org/content/8-magic-attacks"),
  'quendel': ("Free Cinematic Sound Effects", "Gregor Quendel", "CC-BY 4.0", "https://opengameart.org/content/free-cinematic-sound-effects"),
  'p0ss': ("Spell Sounds Starter Pack", "p0ss", "CC-BY-SA 3.0", "https://opengameart.org/content/spell-sounds-starter-pack"),
  'virix': ("Magic SFX Sample", "virix", "CC-BY 3.0", "https://opengameart.org/content/magic-sfx-sample"),
  'cure': ("Cure Magic", "someoneman", "CC0", "https://opengameart.org/content/cure-magic"),
  'wisdom': ("Wisdom Magic (voices)", "qubodup", "CC-BY 3.0", "https://opengameart.org/content/wisdom-magic"),
  'metalint': ("Metal Interactions", "qubodup", "CC0", "https://opengameart.org/content/metal-interactions"),
  'clang': ("Metal Clang Explosions Zing", "qubodup", "CC0", "https://opengameart.org/content/metal-clang-explosions-zing"),
  'hits': ("37 hits/punches", "qubodup", "CC0", "https://opengameart.org/content/37-hitspunches"),
  'tiny': ("Fantasy Sound Effects (Tinysized)", "vehicle", "CC0", "https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx"),
  'choir': ("Fantasy Choir", "cesisco", "CC0", "https://opengameart.org/content/fantasy-choir-3-orchestral-pieces"),
  'glass': ("Glass Bell Sounds", "varkalandar", "CC-BY 3.0", "https://opengameart.org/content/glass-bell-sounds"),
  'tolling': ("Tolling Bell SFX", "Fun-Gi Development", "CC-BY 3.0", "https://opengameart.org/content/tolling-bell-sfx"),
  'steps': ("Metal footsteps on concrete", "thimras", "CC0", "https://opengameart.org/content/metal-footsteps-on-concrete"),
  'armorsteps': ("Footsteps Leather, Cloth, Armor", "HaelDB", "CC0", "https://opengameart.org/content/footsteps-leather-cloth-armor"),
  'smite': ("Magic Smite", "spookymodem", "CC-BY 3.0", "https://opengameart.org/content/magic-smite"),
  'shimmer': ("Shimmer glitter magic", "qubodup", "CC-BY 3.0", "https://opengameart.org/content/shimmer-glitter-magic"),
  'replenish': ("Replenish Life Force", "qubodup", "CC-BY 3.0", "https://opengameart.org/content/replenish-life-force-sound"),
  'elemental': ("Elemental Spell", "qubodup", "CC-BY-SA 3.0", "https://opengameart.org/content/elemental-spell"),
  'beam': ("Doomsday Laser Cannon", "tad", "CC0", "https://opengameart.org/content/doomsday-laser-cannon-sound-effect"),
  'churchbell': ("Church Bell (real recording)", "qubodup", "CC-BY-SA 3.0", "https://opengameart.org/content/church-bell"),
  'deathbell': ("Death Bell", "specter5053", "CC-BY-SA 3.0", "https://opengameart.org/content/death-bell"),
  'gong': ("Gonk Gong", "dklon", "CC-BY 3.0", "https://opengameart.org/content/gonk-gong"),
  'cathedral': ("Cathedral", "umplix", "CC0", "https://opengameart.org/content/cathedral-0"),
  'heavenly': ("Heavenly Loop", "isaiah658", "CC0", "https://opengameart.org/content/heavenly-loop"),
  'dragonflap': ("Dragon Flap", "vishwajai", "CC0", "https://opengameart.org/content/dragon-flap-0"),
  'largewings': ("Large Wings Flap", "antumdeluge", "CC0", "https://opengameart.org/content/large-wings-flap"),
  'batflap': ("Various Sound Effects", "spring-spring", "CC0", "https://opengameart.org/content/various-sound-effects-0"),
  'birdflap': ("Flap, Splat, Poo (Yo Frankie!)", "lamoot", "CC-BY 3.0", "https://opengameart.org/content/flap-splat-poo-yo-frankie"),
  'cloth': ("Cloth swing sounds", "vinrax", "CC-BY 3.0", "https://opengameart.org/content/cloth-swing-sounds"),
  'thunderj': ("Thunder, Very Close, Rain, 01", "InspectorJ", "CC-BY 3.0", "https://opengameart.org/content/thunder-very-close-rain-01"),
  'thunder2': ("Thunder", "jerimee", "CC-BY 3.0", "https://opengameart.org/content/thunder"),
  'explode': ("2 High Quality Explosions", "Michel Baradari", "CC-BY 3.0", "https://opengameart.org/content/2-high-quality-explosions"),
  'lowboom': ("Big low frequency explosion boom", "varkalandar", "CC-BY 3.0", "https://opengameart.org/content/big-low-frequency-explosion-boom"),
  'deep': ("LONG DEEP IMPACT", "rohhsa", "CC-BY-SA 4.0", "https://opengameart.org/content/long-deep-impact"),
  'rpg': ("RPG Sound Pack", "artisticdude", "CC0", "https://opengameart.org/content/rpg-sound-pack"),
  'bells5': ("Bell Sounds", "marcelofg55", "CC-BY 3.0", "https://opengameart.org/content/bell-sounds"),
  'layered': ("layered here from the packs named", "", "", ""),
}
SWING_AXE = (MT + 'Axe Swing.wav', 0, 0, 0.0)
MACE = (MI + 'Mace Norse Sword Blade.wav', 0, 0, 2.31)
SHIM = ('shimmer-qubodup/shimmer_1.flac', -7, 0.03)
THUNDER = ('thunder-close-inspectorj/Thunder, Very Close, Rain, 01.wav', 0, 0, 0.9)
WIS1 = 'wisdom-magic-qubodup/qubodup-WisdomMagic/qubodup-WisdomMagic1.flac'
def c(src, pack, note='', **k): return dict(src=src, pack=pack, note=note, **k)
def L(note, *layers, **k): return dict(src=list(layers), pack='layered', note=note, **k)
def game(name, note): return dict(src='game:' + name, pack='', note=note)

G = [
 ("His hammer", [
  dict(key='palSwing', title='Hammer swing', desc='Every swing of the war hammer (the first two of the combo)', len=1.0, now=[('swing', 0.5)], cands=[
    c(MT + 'Axe Swing.wav', 'stillnorth', 'a real heavy axe swing', len=0.95),
    c(MT + 'Spear Swing.wav', 'stillnorth', 'a long polearm sweep', start=2.74, len=0.95),
    c('metal-interactions-qubodup/metal_interactions/metal_swing1.wav', 'metalint', 'a heavy metal swing'),
    c(J + 'Heavy Sword_Swing_01.wav', 'jc', 'designed heavy swing'),
    L('the axe swing with his cloak snapping under it (StillNorthMedia + vinrax)', SWING_AXE, ('cloth-swing-vinrax/cloth_sounds.flac', -5, 0.05, 3.69), len=0.95),
    game('heavySwing', "the Barbarian's heavy swing"),
  ]),
  dict(key='palHit', title='Hammer lands', desc='The hammer striking a foe, with its burst of light', len=1.2, now=[('hit', 1), ('thud', 0.45)], cands=[
    c(MI + 'Mace Norse Sword Blade.wav', 'stillnorth', 'a real mace on steel, with ring', start=2.31, len=0.8),
    c('tinysized-vehicle/sfx-cc0/metal-hammer-hit-01.wav', 'tiny', 'a real hammer on metal'),
    c(J + 'Heavy Sword_Hit_Metal_01.wav', 'jc', 'designed heavy metal hit'),
    L('mace on steel + a body blow underneath (StillNorthMedia + qubodup)', MACE, ('hits-punches-qubodup/hits/hit05.mp3.flac', -3, 0), len=0.9),
    L('mace on steel + a holy shimmer (StillNorthMedia + qubodup)', MACE, SHIM, len=1.0),
    game('crit', "the game's critical-hit thump"),
  ]),
  dict(key='palShot', title='Third swing: hammer of light', desc='The combo finisher: a small hammer of light flies out', len=1.6, now=[('whoomp', 0.7)], cands=[
    c('magic-smite-spookymodem/Magic Smite.wav', 'smite', 'a bolt of holy energy', len=1.6),
    c(J + 'Electric Spell_Launch_01.wav', 'jc', 'a spell launching', len=1.6),
    c(Q + 'Gregor Quendel - Designed Fire - Free Sounds/Gregor Quendel - Designed Fire - Short - Swoosh Burst Sizzling 01.mp3', 'quendel', 'a bursting swoosh'),
    L('heavy swing + holy shimmer (StillNorthMedia + qubodup)', SWING_AXE, ('shimmer-qubodup/shimmer_1.flac', -3, 0.12), len=1.1),
    game('missile', "the mage's missile whoosh"),
  ]),
  dict(key='palPillar', title='Light falls on a foe', desc='Archangel: pillars of light fall on what his waves touch', len=1.2, now=[('zap', 0.5)], cands=[
    c('magic-smite-spookymodem/Magic Smite.wav', 'smite', 'holy bolt, cut short', len=1.1),
    c(J + 'Healing Chime_01.wav', 'jc', 'a bright chime', len=1.2),
    c('elemental-spell-qubodup/qubodup-ccbysa3-elementalSpell-opengameart/wav/qubodup-ccbysa3-elementalSpell-opengameart1.wav', 'elemental', '', len=1.2),
    c('shimmer-qubodup/shimmer_1.flac', 'shimmer', 'glitter'),
    L('a chime struck over a soft thump (JC Sounds + qubodup)', (J + 'Healing Chime_01.wav', 0, 0), ('hits-punches-qubodup/hits/hit05.mp3.flac', -6, 0), len=1.2),
  ]),
 ]),
 ("His skills", [
  dict(key='palThrow', title='Hammer of Light', desc='He hurls a spinning hammer of light that comes back to him', len=1.8, now=[('heavySwing', 1), ('whoomp', 0.6)], cands=[
    c(Q + 'Gregor Quendel - Designed Fire - Free Sounds/Gregor Quendel - Designed Fire - Short - Swoosh Burst Sizzling 01.mp3', 'quendel', 'a bursting swoosh', len=1.8),
    c('leohpaz-heals-buffs/16_Atk_buff_04.wav', 'leo-heal', 'an attack blessing', len=1.8),
    c(J + 'Electric Spell_Launch_02.wav', 'jc', 'a spell launching', len=1.8),
    L('a spear sweep + holy shimmer (StillNorthMedia + qubodup)', (MT + 'Spear Swing.wav', 0, 0, 2.74), ('shimmer-qubodup/shimmer_1.flac', -4, 0.15), len=1.3),
    L('heavy swing + magic smite (StillNorthMedia + spookymodem)', SWING_AXE, ('magic-smite-spookymodem/Magic Smite.wav', -4, 0.1), len=1.8),
  ]),
  dict(key='consecrate', title='Consecrate', desc='He blesses the ground around him (the gold circle)', len=3.0, now=[('crit', 1), ('levelUp', 0.4)], cands=[
    c('leohpaz-heals-buffs/17_Def_buff_01.wav', 'leo-heal', 'a defense blessing', len=3.0),
    c('spell-starter-p0ss/blessing.ogg', 'p0ss', 'a blessing', len=3.0),
    c(J + 'Magic Shield_Activation_01.wav', 'jc', 'a ward rising', len=3.0),
    c('magic-sfx-virix/Healing Full.wav', 'virix', 'a full heal', len=3.0),
    L('the hammer struck down + voices swell (StillNorthMedia + qubodup)', MACE, (WIS1, -2, 0.08), len=2.4),
    L('a blessing over a choir swell (p0ss + cesisco)', ('spell-starter-p0ss/blessing.ogg', 0, 0), ('fantasy-choir-cesisco/Fantasy Choir 1.wav', -8, 0, 10.0), len=3.0),
  ]),
  dict(key='consecTick', title='Consecrated ground pulse', desc='The blessed ground pulsing as it burns foes (repeats, so it should be soft)', len=1.0, now=[('clink', 0.6)], cands=[
    c('cure-magic-someoneman/Cure2.wav', 'cure', 'a soft heal sparkle', len=1.0),
    c('shimmer-qubodup/shimmer_1.flac', 'shimmer', 'glitter'),
    c('bell-glass-varkalandar/hjm-glass_bell_1.wav', 'glass', 'a glass bell', len=1.0),
    c('replenish-qubodup/Replenish.wav', 'replenish', '', len=1.0),
  ]),
  dict(key='judgeCall', title='Judgment: the sky opens', desc='The tear in the sky as his hammer begins to fall (Judgment and Wrath of Heaven)', len=2.4, now=[('cry', 0.5), ('portal', 0.6)], cands=[
    c('leohpaz-magic-attacks/45_Charge_05.wav', 'leo-atk', 'a charge-up', len=2.4),
    c(Q + 'Gregor Quendel - Designed Sci-Fi - Free Sounds/02_Effects/Gregor Quendel - Designed Sci-Fi - Summon_01.mp3', 'quendel', 'a summoning', len=2.4),
    c('thunder-jerimee/thunderclap_0.ogg', 'thunder2', 'a thunderclap', start=0.9, len=2.4),
    L('voices + a charge-up (qubodup + leohpaz)', (WIS1, 0, 0), ('leohpaz-magic-attacks/45_Charge_05.wav', -4, 0), len=2.4),
    c('beam-doomsday-tad/doomsday_laser_cannon_short.wav', 'beam', 'a cannon charging', len=2.0),
  ]),
  dict(key='judgeLand', title='Judgment: the hammer lands', desc='The giant hammer from the sky smashing down (Wrath of Heaven: three of them)', len=3.0, now=[('crit', 0.7), ('meteor', 0.5)], cands=[
    c('thunder-close-inspectorj/Thunder, Very Close, Rain, 01.wav', 'thunderj', 'a real thunder strike, very close', start=0.9, len=3.0),
    c('explosions-hq-qubodup/explosions/explode.wav', 'explode', 'a big explosion', len=2.0),
    c('metal-clang-zing-qubodup/psii-metal-play-set-1/explosion1.wav', 'clang', 'a metallic explosion'),
    c(Q + 'Gregor Quendel - Designed Mecha - Free Sounds/Gregor Quendel - Designed Mecha - Elements - Impact 01.mp3', 'quendel', 'a heavy designed impact', len=2.4),
    L('thunder + mace on steel + a low boom (InspectorJ + StillNorthMedia + varkalandar)', THUNDER, MACE, ('boom-lowfreq-varkalandar/hjm-big_explosion_3.wav', -4, 0), len=3.0),
    game('meteor', "the mage's meteor"),
  ]),
  dict(key='seraphRise', title="Seraph's Fall: rising", desc='Up in a column of light, the wings snapping open at the top', len=2.2, now=[('whoomp', 1), ('heavySwing', 1), ('portal', 0.6, 0.5)], cands=[
    c('wings-dragon-flap-vishwajai/dragonflap.wav', 'dragonflap', 'one powerful wing beat', len=2.0),
    L('a wing beat + voices (vishwajai + qubodup)', ('wings-dragon-flap-vishwajai/dragonflap.wav', 0, 0), (WIS1, -4, 0.2), len=2.2),
    c('leohpaz-heals-buffs/30_Revive_03.wav', 'leo-heal', 'a resurrection swell', len=2.2),
    c(J + 'Magic Shield_Activation_02.wav', 'jc', 'a radiant rise', len=2.2),
    L('a rising swoosh into a wing snap (Gregor Quendel + vishwajai)', (Q + 'Gregor Quendel - Designed Fire - Free Sounds/Gregor Quendel - Designed Fire - Short - Swoosh Burst Sizzling 01.mp3', -2, 0), ('wings-dragon-flap-vishwajai/dragonflap.wav', 0, 0.45), len=2.2),
  ]),
  dict(key='seraphDive', title="Seraph's Fall: crashing down", desc='He dives and hits the ground in a burst of light', len=2.6, now=[('boom', 1), ('crit', 1), ('meteor', 0.7)], cands=[
    L('thunder + a low boom (InspectorJ + varkalandar)', THUNDER, ('boom-lowfreq-varkalandar/hjm-big_explosion_3.wav', -2, 0), len=2.6),
    c('explosions-hq-qubodup/explosions/explode.wav', 'explode', 'a big explosion'),
    c(Q + 'Gregor Quendel - Designed Fire - Free Sounds/Gregor Quendel - Designed Fire - Impacts - Complex 04.mp3', 'quendel', 'a designed impact', len=2.6),
    c('leohpaz-magic-attacks/30_Earth_02.wav', 'leo-atk', 'an earth blast', len=2.6),
    c('metal-clang-zing-qubodup/psii-metal-play-set-1/explosion-fuzzy1.wav', 'clang', 'a metallic blast', len=2.6),
    game('boom', "the mage's explosion"),
  ]),
  dict(key='lance', title='Lance of Dawn', desc='He becomes a lance of light shooting along a line', len=2.0, now=[('whoomp', 1), ('heavySwing', 1)], cands=[
    c('beam-doomsday-tad/doomsday_laser_cannon_short.wav', 'beam', 'a beam firing', start=1.0, len=2.0),
    c(Q + 'Gregor Quendel - Designed Sci-Fi - Free Sounds/01_Textures/Gregor Quendel - Designed Sci-Fi - SolarWind_01.mp3', 'quendel', 'solar wind', len=2.0),
    c('spell-starter-p0ss/transmision.ogg', 'p0ss', 'an energy rush', len=2.0),
    L('a gust of wind + glitter (leohpaz + qubodup)', ('leohpaz-magic-attacks/25_Wind_01.wav', 0, 0), ('shimmer-qubodup/shimmer_1.flac', -4, 0.1), len=1.8),
    L('a charge + magic smite (JC Sounds + spookymodem)', (J + 'Electric Spell_Buildup.wav', -2, 0), ('magic-smite-spookymodem/Magic Smite.wav', 0, 0.5), len=2.0),
  ]),
  dict(key='toll', title='Divine Toll (the bell)', desc='He rings his hammer like a great bell: three rings of sound and light', len=4.0, now=[('levelUp', 0.45), ('clink', 1)], cands=[
    c('bell-church-qubodup/churchbell.flac', 'churchbell', 'a real church bell', len=4.0),
    c('bell-death-specter/death_bell_sound_effect.wav', 'deathbell', 'a real bell pitched down, deep', len=4.0),
    c('bell-tolling-fungi/Tolling Bell-Bright_3.mp3', 'tolling', 'a bright tolling bell', len=4.0),
    c('bell-sounds-marcelofg55/Bell Sounds_0.mp3', 'bells5', 'a big bell', len=4.0),
    L('the church bell with voices swelling under it (qubodup)', ('bell-church-qubodup/churchbell.flac', 0, 0), (WIS1, -5, 0.15), len=4.0),
    L('mace on steel into the deep bell (StillNorthMedia + specter5053)', MACE, ('bell-death-specter/death_bell_sound_effect.wav', -1, 0.04), len=4.0),
    c('gong-dklon/gong.wav', 'gong', 'a gong (short)'),
  ]),
 ]),
 ("Faith and wings", [
  dict(key='faithReady', title='Wings ready', desc='Faith reaches half (Wings of Dawn) or full (Archangel)', len=2.5, now=[('levelUp', 0.6)], cands=[
    c(J + 'Healing Chime_01.wav', 'jc', 'a healing chime', len=2.5),
    c('bell-glass-varkalandar/hjm-glass_bell_3.wav', 'glass', 'a glass bell', len=2.5),
    c('leohpaz-heals-buffs/02_Heal_02.wav', 'leo-heal', 'a heal', len=2.0),
    c('wisdom-magic-qubodup/qubodup-WisdomMagic/qubodup-WisdomMagic5.flac', 'wisdom', 'voices'),
    c('replenish-qubodup/Replenish.wav', 'replenish', ''),
  ]),
  dict(key='wings', title='Wings open', desc='Wings of Dawn and the Archangel bursting open (the big moment)', len=3.2, now=[('levelUp', 1), ('portal', 1)], cands=[
    L('voices + a burst of wing beats (qubodup + antumdeluge)', (WIS1, 0, 0), ('wings-large-antumdeluge/wings_flap_large.flac', -3, 0.1), len=3.0),
    c('fantasy-choir-cesisco/Fantasy Choir 1.wav', 'choir', 'a choir swell', start=10.0, len=3.2),
    c('choir-cathedral-umplix/cathedral.wav', 'cathedral', 'a cathedral swell', start=9.8, len=3.2),
    c('leohpaz-heals-buffs/30_Revive_03.wav', 'leo-heal', 'a resurrection swell', len=3.2),
    L('choir swell + one great wing beat (cesisco + vishwajai)', ('fantasy-choir-cesisco/Fantasy Choir 1.wav', 0, 0, 10.0), ('wings-dragon-flap-vishwajai/dragonflap.wav', -2, 0.05), len=3.2),
    c('heavenly-loop-isaiah658/Heavenly Loop.flac', 'heavenly', 'a heavenly pad', len=3.0),
  ]),
  dict(key='flap', title='Wing beat', desc='A beat of the wings when he hops forward in flight', len=1.2, now=[('whoomp', 1)], cands=[
    c('wings-dragon-flap-vishwajai/dragonflap.wav', 'dragonflap', 'one powerful wing beat', len=1.2),
    c('wings-large-antumdeluge/wings_flap_large.flac', 'largewings', 'large wings, one beat', len=0.75),
    c('wings-batflap-springspring/snd_flap.wav', 'batflap', ''),
    c('wings-birdflap-yofrankie/bird_flap.flac', 'birdflap', 'a bird flap'),
    c('cloth-swing-vinrax/cloth_sounds.flac', 'cloth', 'a heavy cloth snap', start=6.31, len=1.0),
  ]),
 ]),
 ("His armor", [
  dict(key='palStep', title='Footsteps in plate', desc='His steps (today he walks like everyone else)', len=0.6, now=[('step', 1)], cands=[
    c('footsteps-armor-haeldb/footsteps/step_metal.ogg', 'armorsteps', 'armored step'),
    c('footsteps-armor-haeldb/footsteps/step_metal (3).ogg', 'armorsteps', 'armored step'),
    c('footsteps-metal-thimras/metal_steps_01.wav', 'steps', 'a metal step'),
    c('rpg-sound-pack-artisticdude/RPG Sound Pack/inventory/chainmail1.wav', 'rpg', 'chainmail jingle', len=0.6),
  ]),
  dict(key='palHurt', title='Struck in his armor', desc='A clank of plate under the grunt when something hits him', len=1.0, now=[('hurt', 1)], cands=[
    L('the grunt + a plate clank (the game + StillNorthMedia)', ('game:hurt', 0, 0), (MI + 'Mace Spear Haft.wav', -6, 0), len=1.0),
    L('the grunt + chainmail (the game + artisticdude)', ('game:hurt', 0, 0), ('rpg-sound-pack-artisticdude/RPG Sound Pack/inventory/chainmail1.wav', -4, 0), len=1.0),
    L('the grunt + metal ringing (the game + artisticdude)', ('game:hurt', 0, 0), ('rpg-sound-pack-artisticdude/RPG Sound Pack/inventory/metal-ringing.wav', -8, 0), len=1.0),
    L('the grunt + the armor clank the game has (the game)', ('game:hurt', 0, 0), ('game:clank', -3, 0), len=1.0),
  ]),
 ]),
]
