# The listening page's candidates: for each game sound (sound.js RECIPES name), the current synth
# and three recordings from the downloaded packs. Paths are relative to the download folder.
K = 'RPGsounds_Kenney/OGG/'
R = 'rpg_sound_pack/RPG Sound Pack/'
F = 'Fantasy_Sound_Library/Fantasy Sound Library/Wav/'
O = 'oga/'
PACKS = {   # folder prefix -> (pack name, author, license, url)
  K: ("RPG Audio (50 RPG sound effects)", "Kenney", "CC0", "https://opengameart.org/content/50-rpg-sound-effects"),
  R: ("RPG Sound Pack", "artisticdude", "CC0", "https://opengameart.org/content/rpg-sound-pack"),
  F: ("Fantasy Sound Effects Library", "Little Robot Sound Factory", "CC-BY 3.0", "https://opengameart.org/content/fantasy-sound-effects-library"),
  O + '80-cc0-rpg-sfx/': ("80 CC0 RPG SFX", "rubberduck", "CC0", "https://opengameart.org/content/80-cc0-rpg-sfx"),
  O + '80-cc0-creature-sfx/': ("80 CC0 creature SFX", "rubberduck", "CC0", "https://opengameart.org/content/80-cc0-creature-sfx"),
  O + '80-cc0-creture-sfx-2/': ("80 CC0 creature SFX #2", "rubberduck", "CC0", "https://opengameart.org/content/80-cc0-creture-sfx-2"),
  O + '100-cc0-sfx/': ("100 CC0 SFX", "rubberduck", "CC0", "https://opengameart.org/content/100-cc0-sfx"),
  O + 'fleshy-fight-sounds/': ("Fleshy Fight Sounds", "Will Leamon", "OGA-BY 3.0", "https://opengameart.org/content/fleshy-fight-sounds"),
  O + '10-impactshield-blocks/': ("10 Impact/Shield Blocks", "starninjas", "CC0", "https://opengameart.org/content/10-impactshield-blocks"),
  O + 'bones-rattle/': ("Bones Rattle", "congusbongus", "CC0", "https://opengameart.org/content/bones-rattle"),
  O + 'skeletonsfxshortpack/': ("Skeleton SFX short pack", "colodical", "CC0", "https://opengameart.org/content/skeletonsfxshortpack"),
  O + '15-monster-gruntpaindeath-sounds/': ("15 monster grunt/pain/death sounds", "Michel Baradari", "CC-BY 3.0", "https://opengameart.org/content/15-monster-gruntpaindeath-sounds"),
  O + 'ice-spells/': ("Ice Spells", "bart", "CC0", "https://opengameart.org/content/ice-spells"),
  O + 'spell-4-fire/': ("Spell 4 (fire)", "bart", "CC-BY 3.0", "https://opengameart.org/content/spell-4-fire"),
  O + 'fire-evil-spell/': ("Fire / evil spell", "qubodup", "CC-BY 3.0", "https://opengameart.org/content/fire-evil-spell"),
  O + 'dog-snarl-grunt-grumble/': ("Dog snarl, grunt, grumble", "qubodup", "CC0", "https://opengameart.org/content/dog-snarl-grunt-grumble"),
  O + 'liquid-bottle-drink-set/': ("Liquid, bottle and drink set", "qubodup", "CC0", "https://opengameart.org/content/liquid-bottle-drink-set"),
  O + 'open-chest/': ("Open chest", "spookymodem", "CC-BY 3.0", "https://opengameart.org/content/open-chest"),
  O + '2-high-quality-explosions/': ("2 high quality explosions", "qubodup", "CC-BY 3.0", "https://opengameart.org/content/2-high-quality-explosions"),
  O + 'battle-sound-effects/': ("Battle sound effects", "Ogrebane", "CC0", "https://opengameart.org/content/battle-sound-effects"),
  O + '3-melee-sounds/': ("3 melee sounds", "remaxim", "CC0", "https://opengameart.org/content/3-melee-sounds"),
  O + 'wolf-monster-sound/': ("Wolf monster sound", "caveboytup", "CC0", "https://opengameart.org/content/wolf-monster-sound"),
}
c1, c2, c2b, c100 = O + '80-cc0-rpg-sfx/', O + '80-cc0-creature-sfx/', O + '80-cc0-creture-sfx-2/', O + '100-cc0-sfx/'
fl = O + 'fleshy-fight-sounds/'
GROUPS = [
 ("Weapons", [
  ("swing", "Light swing", "Sword and light weapon swings", [R + 'battle/swing.wav', R + 'battle/swing2.wav', O + 'battle-sound-effects/swish_2.wav']),
  ("heavySwing", "Heavy swing", "Axe, mace and two-handed swings", [R + 'battle/swing3.wav', O + 'battle-sound-effects/swish_4.wav', O + '3-melee-sounds/melee sound.wav']),
  ("hit", "Blade hits flesh", "A normal hit landing", [fl + 'sword-1a.wav', fl + 'sword-arm-2a.wav', c100 + 'hit_01.ogg']),
  ("crit", "Critical hit", "A heavy, critical blow", [fl + 'hammer-1a.wav', fl + 'hammer-arm-2a.wav', c100 + 'slam_01.ogg']),
  ("kill", "Killing blow", "The hit that kills", [fl + 'piercing-1a.wav', fl + 'punch_alt-2a.wav', c1 + 'creature_die_01.ogg']),
  ("block", "Block", "A shield or weapon blocks a blow", [O + '10-impactshield-blocks/impact.1.ogg', O + '10-impactshield-blocks/impact.4.ogg', c100 + 'metal_03.ogg']),
  ("clank", "Armor clank", "Metal on metal (shields breaking, armored foes)", [c100 + 'metal_01.ogg', c100 + 'metal_05.ogg', K + 'metalPot1.ogg']),
  ("crack", "Ground crack", "Slams, leaps and quakes hitting the ground", [c1 + 'stones_01.ogg', c1 + 'item_stone_02.ogg', c100 + 'slam_04.ogg']),
  ("chain", "Chain", "The warrior's chain hook", [c1 + 'chain_01.ogg', c1 + 'chain_02.ogg', R + 'inventory/chainmail1.wav']),
 ]),
 ("Bow", [
  ("twang", "Bow string", "The ranger looses an arrow", [O + 'battle-sound-effects/Bow.wav', K + 'drawKnife2.ogg', K + 'drawKnife1.ogg']),
  ("thunk", "Arrow hits", "An arrow biting into a foe", [fl + 'piercing-1b.wav', fl + 'piercing-arm-2a.wav', c100 + 'hit_03.ogg']),
 ]),
 ("Spells", [
  ("missile", "Magic missile", "The mage's basic bolt leaving the staff", [F + 'Spell_00.wav', F + 'Spell_02.wav', c1 + 'spell_01.ogg']),
  ("zap", "Missile hits", "A bolt striking", [F + 'Spell_03.wav', R + 'battle/magic1.wav', c1 + 'spell_02.ogg']),
  ("fireball", "Fireball", "A fireball thrown", [c1 + 'spell_fire_01.ogg', c1 + 'spell_fire_03.ogg', O + 'spell-4-fire/foom_0.wav']),
  ("boom", "Explosion", "Fireball and meteor blasts, the ground slam", [O + '2-high-quality-explosions/explosions/explode.wav', O + '2-high-quality-explosions/explosions/explodemini.wav', c100 + 'explosion.ogg']),
  ("meteor", "Meteor falling", "The meteor's whistle down from the sky", [O + 'fire-evil-spell/spells/spells/Fire.aif', c1 + 'spell_fire_05.ogg', c1 + 'spell_fire_07.ogg']),
  ("frost", "Frost", "Frost Nova, Cone of Cold, frozen foes", [O + 'ice-spells/icespells/coldsnap.wav', O + 'ice-spells/icespells/ice.wav', F + 'Spell_04.wav']),
  ("blink", "Blink", "The mage's teleport", [F + 'Spell_01.wav', R + 'battle/spell.wav', O + 'fire-evil-spell/spells/spells/Spell1.aif']),
 ]),
 ("Monsters", [
  ("squeal", "Fallen dies", "The small demons' death squeal", [F + 'Goblin_00.wav', F + 'Goblin_03.wav', c2 + 'scream_01.ogg']),
  ("yelp", "Hound or wolf dies", "A beast's death yelp", [O + 'dog-snarl-grunt-grumble/dog_0/dog-snarl.flac', O + 'wolf-monster-sound/wolf_monster_5.mp3', c2 + 'hurt_02.ogg']),
  ("hiss", "Spider dies", "A spider or beetle dying", [R + 'NPC/beetle/bite-small.wav', c2 + 'bug_01.ogg', c2b + 'bug_05.ogg']),
  ("clatter", "Skeleton falls apart", "Bones rattling down", [O + 'bones-rattle/3.ogg', O + 'skeletonsfxshortpack/skeleton1sfx_0.wav', O + 'skeletonsfxshortpack/skeleton2sfx_0.wav']),
  ("growl", "Beast growl", "Wolves and beasts snarling as they attack", [O + 'dog-snarl-grunt-grumble/dog_0/dog-growl.flac', R + 'NPC/gutteral beast/mnstr1.wav', c2 + 'monster_01.ogg']),
  ("cry", "Boss roar", "A boss waking or calling its pack", [c2 + 'roar_01.ogg', c2 + 'roar_02.ogg', F + 'Dragon_Growl_00.wav']),
  ("splat", "Splat", "Gore and slime", [R + 'NPC/slime/slime1.wav', c2b + 'slime_01.ogg', c100 + 'splash_01.ogg']),
 ]),
 ("You", [
  ("hurt", "You're hurt", "The hero taking a hit", [c2b + 'human_01.ogg', c2b + 'human_03.ogg', O + '15-monster-gruntpaindeath-sounds/michelbaradari-monsters/painb.wav']),
  ("death", "You die", "The hero falling", [F + 'Jingle_Lose_00.wav', c2b + 'die_01.ogg', O + '15-monster-gruntpaindeath-sounds/michelbaradari-monsters/deathb.wav']),
  ("step", "Footstep", "Each footfall", [K + 'footstep00.ogg', F + 'Footsteps/Footstep_Dirt_00.wav', K + 'footstep05.ogg']),
  ("potion", "Drink a potion", "Quaffing a healing potion", [O + 'liquid-bottle-drink-set/qubodup-bottle-and-drink-sounds/swallow-01.flac', R + 'inventory/bottle.wav', R + 'inventory/bubble2.wav']),
  ("levelUp", "Level up", "Gaining a level, finishing a quest", [F + 'Jingle_Achievement_00.wav', F + 'Jingle_Win_00.wav', c100 + 'bell_01.ogg']),
 ]),
 ("Loot and world", [
  ("gold", "Gold", "Picking up gold", [R + 'inventory/coin.wav', F + 'Pickup_Gold_00.wav', c1 + 'item_coins_01.ogg']),
  ("pickup", "Pick up an item", "An item going into the bag", [K + 'cloth1.ogg', R + 'inventory/armor-light.wav', c1 + 'item_misc_01.ogg']),
  ("clink", "Gem or small metal", "Gems, keys and small metal things", [c1 + 'item_gem_01.ogg', R + 'inventory/metal-small1.wav', c100 + 'glass_01.ogg']),
  ("chest", "Open a chest", "Chests, Aldo's cage, the mine's chains", [O + 'open-chest/Chest_Creak.wav', c100 + 'wooded_box_open.ogg', K + 'creak1.ogg']),
  ("barrel", "Break a barrel", "Barrels and crates smashing", [c1 + 'wood_01.ogg', c1 + 'item_wood_01.ogg', c100 + 'wooden_02.ogg']),
  ("portal", "Town portal", "Opening or taking the portal", [F + 'Spell_02.wav', c100 + 'gong_01.ogg', F + 'Trap_00.wav']),
  ("tap", "Menu tap", "Buttons and menus", [R + 'interface/interface1.wav', F + 'Menu_Select_00.wav', K + 'bookFlip1.ogg']),
 ]),
]
