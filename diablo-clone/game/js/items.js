'use strict';
// Items: stats and visible look are separate. A base names its slot and visual family; affixes
// only change numbers, so many rolled items share one look (handoff: equipment contract).

const ITEM_BASES = {
  short_sword: { slot: 'weapon', look: 'sword', name: 'SHORT SWORD', dmg: [2, 6], cls: 'warrior', lvl: 1 },
  long_sword: { slot: 'weapon', look: 'sword', name: 'LONG SWORD', dmg: [4, 9], cls: 'warrior', lvl: 2 },
  hand_axe: { slot: 'weapon', look: 'axe', name: 'HAND AXE', dmg: [3, 10], cls: 'warrior', lvl: 1, slow: true },
  war_axe: { slot: 'weapon', look: 'axe', name: 'WAR AXE', dmg: [6, 15], cls: 'warrior', lvl: 3, slow: true },
  mace: { slot: 'weapon', look: 'mace', name: 'MACE', dmg: [3, 11], cls: 'warrior', lvl: 1, slow: true },
  cap: { slot: 'helm', look: 'cap', name: 'CAP', armor: 2, cls: 'warrior', lvl: 1 },
  great_helm: { slot: 'helm', look: 'great', name: 'GREAT HELM', armor: 5, cls: 'warrior', lvl: 2 },
  horned_helm: { slot: 'helm', look: 'horned', name: 'HORNED HELM', armor: 4, cls: 'warrior', lvl: 1 },
  tunic: { slot: 'chest', look: 'tunic', name: 'TUNIC', armor: 1, cls: 'warrior', lvl: 1 },
  chain_mail: { slot: 'chest', look: 'chain', name: 'CHAIN MAIL', armor: 6, cls: 'warrior', lvl: 1 },
  plate_mail: { slot: 'chest', look: 'plate', name: 'PLATE MAIL', armor: 11, cls: 'warrior', lvl: 4 },
  buckler: { slot: 'shield', look: 'buckler', name: 'BUCKLER', armor: 3, block: 10, cls: 'warrior', lvl: 1 },
  kite_shield: { slot: 'shield', look: 'kite', name: 'KITE SHIELD', armor: 6, block: 20, cls: 'warrior', lvl: 2 },
  flail: { slot: 'weapon', look: 'flail', name: 'FLAIL', dmg: [5, 13], cls: 'warrior', lvl: 2, slow: true },
  greatsword: { slot: 'weapon', look: 'greatsword', name: 'GREATSWORD', dmg: [8, 18], cls: 'warrior', lvl: 3, slow: true },
  barbute: { slot: 'helm', look: 'barbute', name: 'BARBUTE', armor: 4, cls: 'warrior', lvl: 2 },
  crown_helm: { slot: 'helm', look: 'crown', name: 'CROWNED HELM', armor: 7, cls: 'warrior', lvl: 4 },
  brigandine: { slot: 'chest', look: 'brigandine', name: 'BRIGANDINE', armor: 8, cls: 'warrior', lvl: 2 },
  dark_plate: { slot: 'chest', look: 'darkplate', name: 'DARK PLATE', armor: 15, cls: 'warrior', lvl: 5 },
  round_shield: { slot: 'shield', look: 'round', name: 'ROUND SHIELD', armor: 4, block: 15, cls: 'warrior', lvl: 1 },
  tower_shield: { slot: 'shield', look: 'tower', name: 'TOWER SHIELD', armor: 10, block: 28, cls: 'warrior', lvl: 3 },
  // mage gear (round 18): robes are one design in three colors; staves differ by the orb's color
  oak_staff: { slot: 'weapon', look: 'staff', name: 'OAK STAFF', dmg: [3, 7], cls: 'mage', lvl: 1 },
  ember_staff: { slot: 'weapon', look: 'staff_fire', name: 'EMBER STAFF', dmg: [5, 11], cls: 'mage', lvl: 2 },
  frost_staff: { slot: 'weapon', look: 'staff_ice', name: 'FROST STAFF', dmg: [8, 15], cls: 'mage', lvl: 3 },
  apprentice_robe: { slot: 'chest', look: 'robe_blue', name: 'APPRENTICE ROBE', armor: 2, cls: 'mage', lvl: 1 },
  mystic_robe: { slot: 'chest', look: 'robe_purple', name: 'MYSTIC ROBE', armor: 5, cls: 'mage', lvl: 2 },
  archmage_robe: { slot: 'chest', look: 'robe_red', name: 'ARCHMAGE ROBE', armor: 8, cls: 'mage', lvl: 3 },
  wizard_hat: { slot: 'helm', look: 'hat', name: 'WIZARD HAT', armor: 1, cls: 'mage', lvl: 1 },
  hood: { slot: 'helm', look: 'hood', name: 'DEEP HOOD', armor: 3, cls: 'mage', lvl: 1 },
  // ranger gear (round 33): bows (the off hand), leather jerkins, hoods, and quivers in the shield slot
  hunting_bow: { slot: 'weapon', look: 'bow', name: 'HUNTING BOW', dmg: [2, 6], cls: 'ranger', lvl: 1 },
  long_bow: { slot: 'weapon', look: 'bow_long', name: 'LONGBOW', dmg: [4, 10], cls: 'ranger', lvl: 2 },
  horn_bow: { slot: 'weapon', look: 'bow_horn', name: 'HORN BOW', dmg: [7, 14], cls: 'ranger', lvl: 3 },
  leather_jerkin: { slot: 'chest', look: 'jerkin', name: 'LEATHER JERKIN', armor: 3, cls: 'ranger', lvl: 1 },
  studded_jerkin: { slot: 'chest', look: 'jerkin_stud', name: 'STUDDED JERKIN', armor: 6, cls: 'ranger', lvl: 2 },
  hide_coat: { slot: 'chest', look: 'jerkin_hide', name: 'HIDE COAT', armor: 9, cls: 'ranger', lvl: 3 },
  ranger_hood: { slot: 'helm', look: 'rhood', name: 'RANGER HOOD', armor: 2, cls: 'ranger', lvl: 1 },
  shadow_hood: { slot: 'helm', look: 'rhood_dark', name: 'SHADOW HOOD', armor: 4, cls: 'ranger', lvl: 2 },
  quiver: { slot: 'shield', look: 'quiver', name: 'QUIVER', armor: 1, cls: 'ranger', lvl: 1 },
  war_quiver: { slot: 'shield', look: 'quiver', name: 'WAR QUIVER', armor: 3, cls: 'ranger', lvl: 2 },
  // round 42a: more ordinary bases, so the common drops have range before any more legendaries come.
  // Tiers by area level; most reuse a look (as Diablo did), only their numbers and names differ.
  broadsword: { slot: 'weapon', look: 'sword', name: 'BROADSWORD', dmg: [6, 13], cls: 'warrior', lvl: 3 },
  bastard_sword: { slot: 'weapon', look: 'bsword', name: 'BASTARD SWORD', dmg: [8, 17], cls: 'warrior', lvl: 4 },
  morning_star: { slot: 'weapon', look: 'mstar', name: 'MORNING STAR', dmg: [7, 16], cls: 'warrior', lvl: 3, slow: true },
  battle_axe: { slot: 'weapon', look: 'baxe', name: 'BATTLE AXE', dmg: [10, 21], cls: 'warrior', lvl: 5, slow: true },
  spangenhelm: { slot: 'helm', look: 'spangen', name: 'SPANGENHELM', armor: 6, cls: 'warrior', lvl: 3 },
  bascinet: { slot: 'helm', look: 'bascinet', name: 'BASCINET', armor: 8, cls: 'warrior', lvl: 5 },
  scale_mail: { slot: 'chest', look: 'scale', name: 'SCALE MAIL', armor: 9, cls: 'warrior', lvl: 3 },
  gothic_plate: { slot: 'chest', look: 'gothic', name: 'GOTHIC PLATE', armor: 18, cls: 'warrior', lvl: 5 },
  targe: { slot: 'shield', look: 'targe', name: 'TARGE', armor: 5, block: 17, cls: 'warrior', lvl: 3 },
  heater_shield: { slot: 'shield', look: 'heater', name: 'HEATER SHIELD', armor: 8, block: 22, cls: 'warrior', lvl: 4 },
  battle_staff: { slot: 'weapon', look: 'staff_fire', name: 'BATTLE STAFF', dmg: [10, 18], cls: 'mage', lvl: 4 },
  runed_staff: { slot: 'weapon', look: 'staff_rune', name: 'RUNED STAFF', dmg: [13, 22], cls: 'mage', lvl: 5 },
  silk_robe: { slot: 'chest', look: 'robe_purple', name: 'SILK ROBE', armor: 10, cls: 'mage', lvl: 4 },
  sorcerer_robe: { slot: 'chest', look: 'robe_red', name: "SORCERER'S ROBE", armor: 13, cls: 'mage', lvl: 5 },
  conjurer_hat: { slot: 'helm', look: 'hat_conj', name: "CONJURER'S HAT", armor: 3, cls: 'mage', lvl: 3 },
  sage_hood: { slot: 'helm', look: 'hood_sage', name: "SAGE'S HOOD", armor: 5, cls: 'mage', lvl: 4 },
  ash_bow: { slot: 'weapon', look: 'bow', name: 'ASH BOW', dmg: [3, 8], cls: 'ranger', lvl: 2 },
  recurve_bow: { slot: 'weapon', look: 'bow_horn', name: 'RECURVE BOW', dmg: [9, 17], cls: 'ranger', lvl: 4 },
  war_bow: { slot: 'weapon', look: 'bow_war', name: 'WAR BOW', dmg: [11, 20], cls: 'ranger', lvl: 5 },
  scale_jerkin: { slot: 'chest', look: 'jerkin_scale', name: 'SCALE JERKIN', armor: 11, cls: 'ranger', lvl: 4 },
  drake_hide: { slot: 'chest', look: 'jerkin_drake', name: 'DRAKE HIDE', armor: 14, cls: 'ranger', lvl: 5 },
  // round 49: the art chat's hero sets (art A6, A8) as items, named for their sets; icon: the nearest hand-drawn icon, tint: its color
  militia_mail: { slot: 'chest', look: 'militia', name: 'MILITIA ARMOR', armor: 5, cls: 'warrior', lvl: 1, icon: 'brigandine', tint: 'LEATHER' },
  roadwarden_mail: { slot: 'chest', look: 'roadwarden', name: 'ROADWARDEN ARMOR', armor: 5, cls: 'warrior', lvl: 1, icon: 'brigandine', tint: 'CHAIN' },
  roadwarden_helm: { slot: 'helm', look: 'kettle', name: 'ROADWARDEN HELM', armor: 3, cls: 'warrior', lvl: 1, icon: 'cap' },
  border_warden_mail: { slot: 'chest', look: 'borderwarden', name: 'BORDER WARDEN ARMOR', armor: 8, cls: 'warrior', lvl: 2, icon: 'brigandine', tint: 'CLOTH_GREEN' },
  gatewatch_mail: { slot: 'chest', look: 'gatewatch', name: 'GATEWATCH ARMOR', armor: 8, cls: 'warrior', lvl: 2, icon: 'brigandine', tint: 'CHAIN' },
  gatewatch_helm: { slot: 'helm', look: 'nasal', name: 'GATEWATCH HELM', armor: 5, cls: 'warrior', lvl: 2, icon: 'spangen' },
  gatewatch_weapon: { slot: 'weapon', look: 'spear', name: 'LEAFBLADE SPEAR', dmg: [5, 12], cls: 'warrior', lvl: 2, icon: 'spear' },
  gatewatch_shield: { slot: 'shield', look: 'board', name: 'GATEWATCH SHIELD', armor: 6, block: 18, cls: 'warrior', lvl: 2, icon: 'round', tint: 'CHAIN' },
  copper_raider_mail: { slot: 'chest', look: 'copperraider', name: 'COPPER RAIDER ARMOR', armor: 8, cls: 'warrior', lvl: 2, icon: 'brigandine', tint: 'BRONZE' },
  copper_raider_helm: { slot: 'helm', look: 'barbute_dark', name: 'COPPER RAIDER HELM', armor: 5, cls: 'warrior', lvl: 2, icon: 'barbute' },
  copper_raider_weapon: { slot: 'weapon', look: 'caxe', name: 'CRESCENT AXE', dmg: [6, 15], cls: 'warrior', lvl: 2, icon: 'axe', slow: true },
  iron_guard_mail: { slot: 'chest', look: 'ironguard', name: 'IRON GUARD ARMOR', armor: 10, cls: 'warrior', lvl: 3, icon: 'brigandine', tint: 'PLATE' },
  vanguard_mail: { slot: 'chest', look: 'vanguard', name: 'VANGUARD ARMOR', armor: 10, cls: 'warrior', lvl: 3, icon: 'brigandine', tint: 'CLOTH_BLUE' },
  dusk_duelist_mail: { slot: 'chest', look: 'duskduelist', name: 'DUSK DUELIST ARMOR', armor: 10, cls: 'warrior', lvl: 3, icon: 'brigandine', tint: 'CLOTH_SHADOW' },
  dusk_duelist_helm: { slot: 'helm', look: 'skullcap', name: 'DUSK DUELIST HELM', armor: 6, cls: 'warrior', lvl: 3, icon: 'cap' },
  dusk_duelist_weapon: { slot: 'weapon', look: 'sabre', name: 'SILVER SABRE', dmg: [7, 15], cls: 'warrior', lvl: 3, icon: 'sword' },
  dusk_duelist_shield: { slot: 'shield', look: 'buckler_steel', name: 'DUSK DUELIST SHIELD', armor: 7, block: 20, cls: 'warrior', lvl: 3, icon: 'buckler', tint: 'CLOTH_SHADOW' },
  warbringer_mail: { slot: 'chest', look: 'warbringer', name: 'WARBRINGER ARMOR', armor: 12, cls: 'warrior', lvl: 4, icon: 'brigandine', tint: 'DSTEEL' },
  oathkeeper_mail: { slot: 'chest', look: 'oathkeeper', name: 'OATHKEEPER ARMOR', armor: 12, cls: 'warrior', lvl: 4, icon: 'brigandine', tint: 'CLOTH_WHITE' },
  oathkeeper_weapon: { slot: 'weapon', look: 'fmace', name: 'FLANGED MACE', dmg: [10, 21], cls: 'warrior', lvl: 4, icon: 'mstar', slow: true },
  oathkeeper_shield: { slot: 'shield', look: 'heater_oath', name: 'OATHKEEPER SHIELD', armor: 9, block: 24, cls: 'warrior', lvl: 4, icon: 'heater', tint: 'CLOTH_WHITE' },
  winter_bulwark_mail: { slot: 'chest', look: 'winterbulwark', name: 'WINTER BULWARK ARMOR', armor: 12, cls: 'warrior', lvl: 4, icon: 'brigandine', tint: 'SLATE' },
  winter_bulwark_helm: { slot: 'helm', look: 'great_flat', name: 'WINTER BULWARK HELM', armor: 7, cls: 'warrior', lvl: 4, icon: 'great' },
  winter_bulwark_weapon: { slot: 'weapon', look: 'faxe', name: 'FROSTSTEEL AXE', dmg: [10, 21], cls: 'warrior', lvl: 4, icon: 'baxe', slow: true },
  winter_bulwark_shield: { slot: 'shield', look: 'heater_frost', name: 'WINTER BULWARK SHIELD', armor: 9, block: 24, cls: 'warrior', lvl: 4, icon: 'heater', tint: 'SLATE' },
  steel_knight_mail: { slot: 'chest', look: 'steelknight', name: 'STEEL KNIGHT ARMOR', armor: 16, cls: 'warrior', lvl: 5, icon: 'brigandine', tint: 'PLATE' },
  crown_guard_mail: { slot: 'chest', look: 'crownguard', name: 'CROWN GUARD ARMOR', armor: 16, cls: 'warrior', lvl: 5, icon: 'brigandine', tint: 'GOLD' },
  ember_forged_mail: { slot: 'chest', look: 'emberforged', name: 'EMBER FORGED ARMOR', armor: 20, cls: 'warrior', lvl: 6, icon: 'brigandine', tint: 'AUTUMNM' },
  ember_forged_helm: { slot: 'helm', look: 'bascinet_gold', name: 'EMBER FORGED HELM', armor: 10, cls: 'warrior', lvl: 6, icon: 'bascinet' },
  ember_forged_weapon: { slot: 'weapon', look: 'fhammer', name: 'FORGE HAMMER', dmg: [14, 28], cls: 'warrior', lvl: 6, icon: 'mace', slow: true },
  royal_executor_mail: { slot: 'chest', look: 'royalexecutor', name: 'ROYAL EXECUTOR ARMOR', armor: 20, cls: 'warrior', lvl: 6, icon: 'brigandine', tint: 'CLOTH_RED' },
  royal_executor_helm: { slot: 'helm', look: 'helm_royal', name: 'ROYAL EXECUTOR HELM', armor: 10, cls: 'warrior', lvl: 6, icon: 'crown' },
  royal_executor_weapon: { slot: 'weapon', look: 'kgsword', name: 'KINGSGUARD GREATSWORD', dmg: [14, 28], cls: 'warrior', lvl: 6, icon: 'greatsword', slow: true },
  bramble_scout_jerkin: { slot: 'chest', look: 'jerkin_bramble', name: 'BRAMBLE SCOUT JERKIN', armor: 4, cls: 'ranger', lvl: 1, icon: 'jerkin', tint: 'LEATHER' },
  bramble_scout_bow: { slot: 'weapon', look: 'bow_ash', name: 'BRAMBLE SCOUT BOW', dmg: [3, 7], cls: 'ranger', lvl: 1, icon: 'bow', tint: 'WOOD' },
  marsh_runner_jerkin: { slot: 'chest', look: 'jerkin_marsh', name: 'MARSH RUNNER JERKIN', armor: 4, cls: 'ranger', lvl: 1, icon: 'jerkin', tint: 'PINE' },
  marsh_runner_bow: { slot: 'weapon', look: 'bow_swamp', name: 'MARSH RUNNER BOW', dmg: [3, 7], cls: 'ranger', lvl: 1, icon: 'bow', tint: 'HAIR' },
  ashwood_hunter_jerkin: { slot: 'chest', look: 'jerkin_ashwood', name: 'ASHWOOD HUNTER JERKIN', armor: 6, cls: 'ranger', lvl: 2, icon: 'jerkin', tint: 'STRAWM' },
  ashwood_hunter_bow: { slot: 'weapon', look: 'bow_iron', name: 'ASHWOOD HUNTER BOW', dmg: [5, 10], cls: 'ranger', lvl: 2, icon: 'bow', tint: 'IRON' },
  dune_strider_jerkin: { slot: 'chest', look: 'jerkin_dune', name: 'DUNE STRIDER JERKIN', armor: 9, cls: 'ranger', lvl: 3, icon: 'jerkin', tint: 'STRAWM' },
  dune_strider_bow: { slot: 'weapon', look: 'bow_arbalest', name: 'DUNE STRIDER CROSSBOW', dmg: [7, 14], cls: 'ranger', lvl: 3, icon: 'bow', tint: 'BRONZE' },
  night_tracker_jerkin: { slot: 'chest', look: 'jerkin_night', name: 'NIGHT TRACKER JERKIN', armor: 9, cls: 'ranger', lvl: 3, icon: 'jerkin', tint: 'CLOTH_NAVY' },
  night_tracker_bow: { slot: 'weapon', look: 'bow_cross', name: 'NIGHT TRACKER CROSSBOW', dmg: [7, 14], cls: 'ranger', lvl: 3, icon: 'bow', tint: 'IRON' },
  thorn_sentinel_jerkin: { slot: 'chest', look: 'jerkin_thorn', name: 'THORN SENTINEL JERKIN', armor: 11, cls: 'ranger', lvl: 4, icon: 'jerkin', tint: 'CLOTH_GREEN' },
  thorn_sentinel_bow: { slot: 'weapon', look: 'bow_recurve', name: 'THORN SENTINEL BOW', dmg: [9, 17], cls: 'ranger', lvl: 4, icon: 'bow', tint: 'HORN' },
  frostpath_stalker_jerkin: { slot: 'chest', look: 'jerkin_frost', name: 'FROSTPATH STALKER JERKIN', armor: 14, cls: 'ranger', lvl: 5, icon: 'jerkin', tint: 'CHAIN' },
  frostpath_stalker_bow: { slot: 'weapon', look: 'bow_silver', name: 'FROSTPATH STALKER BOW', dmg: [11, 20], cls: 'ranger', lvl: 5, icon: 'bow', tint: 'STEEL' },
  blackthorn_warden_jerkin: { slot: 'chest', look: 'jerkin_warden', name: 'BLACKTHORN WARDEN JERKIN', armor: 16, cls: 'ranger', lvl: 6, icon: 'jerkin', tint: 'CLOTH_SHADOW' },
  blackthorn_warden_bow: { slot: 'weapon', look: 'bow_thorn', name: 'BLACKTHORN WARDEN BOW', dmg: [13, 23], cls: 'ranger', lvl: 6, icon: 'bow', tint: 'CHITIN' },
  wayfarer_robe: { slot: 'chest', look: 'robe_way', name: 'WAYFARER ROBE', armor: 3, cls: 'mage', lvl: 1, icon: 'robe', tint: 'LEATHER' },
  wayfarer_hat: { slot: 'helm', look: 'hat_way', name: 'WAYFARER HAT', armor: 2, cls: 'mage', lvl: 1, icon: 'hat', tint: 'LEATHER' },
  wayfarer_staff: { slot: 'weapon', look: 'staff_amber', name: 'WAYFARER STAFF', dmg: [4, 8], cls: 'mage', lvl: 1, icon: 'staff', orb: 'FIREM' },
  tidekeeper_robe: { slot: 'chest', look: 'robe_tide', name: 'TIDEKEEPER ROBE', armor: 5, cls: 'mage', lvl: 2, icon: 'robe', tint: 'WATERM' },
  tidekeeper_hat: { slot: 'helm', look: 'hat_tide', name: 'TIDEKEEPER HAT', armor: 3, cls: 'mage', lvl: 2, icon: 'hat', tint: 'WATERM' },
  tidekeeper_staff: { slot: 'weapon', look: 'staff_pearl', name: 'TIDEKEEPER STAFF', dmg: [6, 12], cls: 'mage', lvl: 2, icon: 'staff', orb: 'ICE' },
  frost_scholar_robe: { slot: 'chest', look: 'robe_frost', name: 'FROST SCHOLAR ROBE', armor: 5, cls: 'mage', lvl: 2, icon: 'robe', tint: 'CLOTH_WHITE' },
  frost_scholar_hat: { slot: 'helm', look: 'hat_frost', name: 'FROST SCHOLAR HAT', armor: 3, cls: 'mage', lvl: 2, icon: 'hat', tint: 'CLOTH_WHITE' },
  frost_scholar_staff: { slot: 'weapon', look: 'staff_frost', name: 'FROST SCHOLAR STAFF', dmg: [6, 12], cls: 'mage', lvl: 2, icon: 'staff', orb: 'ICE' },
  rose_oracle_robe: { slot: 'chest', look: 'robe_rose', name: 'CRIMSON ORACLE ROBE', armor: 8, cls: 'mage', lvl: 3, icon: 'robe', tint: 'CLOTH_WINE' },
  rose_oracle_hat: { slot: 'helm', look: 'hat_rose', name: 'CRIMSON ORACLE HAT', armor: 4, cls: 'mage', lvl: 3, icon: 'hat', tint: 'CLOTH_WINE' },
  rose_oracle_staff: { slot: 'weapon', look: 'staff_rose', name: 'CRIMSON ORACLE STAFF', dmg: [8, 15], cls: 'mage', lvl: 3, icon: 'staff', orb: 'ARCANE' },
  duskweaver_robe: { slot: 'chest', look: 'robe_dusk', name: 'DUSKWEAVER ROBE', armor: 8, cls: 'mage', lvl: 3, icon: 'robe', tint: 'CLOTH_PURPLE' },
  duskweaver_hat: { slot: 'helm', look: 'hat_dusk', name: 'DUSKWEAVER HAT', armor: 4, cls: 'mage', lvl: 3, icon: 'hat', tint: 'CLOTH_PURPLE' },
  duskweaver_staff: { slot: 'weapon', look: 'staff_moon', name: 'DUSKWEAVER STAFF', dmg: [8, 15], cls: 'mage', lvl: 3, icon: 'staff', orb: 'ARCANE' },
  cinder_sage_robe: { slot: 'chest', look: 'robe_cinder', name: 'CINDER SAGE ROBE', armor: 10, cls: 'mage', lvl: 4, icon: 'robe', tint: 'CLOTH_SHADOW' },
  cinder_sage_hat: { slot: 'helm', look: 'hat_cinder', name: 'CINDER SAGE HAT', armor: 5, cls: 'mage', lvl: 4, icon: 'hat', tint: 'CLOTH_SHADOW' },
  cinder_sage_staff: { slot: 'weapon', look: 'staff_cage', name: 'CINDER SAGE STAFF', dmg: [10, 18], cls: 'mage', lvl: 4, icon: 'staff', orb: 'FIREM' },
  runebinder_robe: { slot: 'chest', look: 'robe_rune', name: 'RUNEBINDER ROBE', armor: 13, cls: 'mage', lvl: 5, icon: 'robe', tint: 'CLOTH_NAVY' },
  runebinder_hat: { slot: 'helm', look: 'hat_rune', name: 'RUNEBINDER HAT', armor: 6, cls: 'mage', lvl: 5, icon: 'hat', tint: 'CLOTH_NAVY' },
  runebinder_staff: { slot: 'weapon', look: 'staff_runestone', name: 'RUNEBINDER STAFF', dmg: [13, 22], cls: 'mage', lvl: 5, icon: 'staff', orb: 'ICE' },
  sunwarden_robe: { slot: 'chest', look: 'robe_sun', name: 'SUNWARDEN ROBE', armor: 15, cls: 'mage', lvl: 6, icon: 'robe', tint: 'GOLD' },
  sunwarden_hat: { slot: 'helm', look: 'hat_sun', name: 'SUNWARDEN HAT', armor: 7, cls: 'mage', lvl: 6, icon: 'hat', tint: 'GOLD' },
  sunwarden_staff: { slot: 'weapon', look: 'staff_sun', name: 'SUNWARDEN STAFF', dmg: [15, 26], cls: 'mage', lvl: 6, icon: 'staff', orb: 'FIREM' },
  hunter_hood: { slot: 'helm', look: 'rhood_hunter', name: "HUNTER'S HOOD", armor: 4, cls: 'ranger', lvl: 3 },
  night_hood: { slot: 'helm', look: 'rhood_night', name: 'NIGHT HOOD', armor: 6, cls: 'ranger', lvl: 4 },
  deep_quiver: { slot: 'shield', look: 'quiver_deep', name: 'DEEP QUIVER', armor: 5, cls: 'ranger', lvl: 4 },
  // rings and amulets: every class, no base stat, always at least magic
  ring: { slot: 'ring', look: 'ring', name: 'RING', cls: 'any', lvl: 1, w: 0.065 },
  amulet: { slot: 'amulet', look: 'amulet', name: 'AMULET', cls: 'any', lvl: 2, w: 0.045 },
  heal: { slot: 'potion', name: 'HEALING POTION', heal: 30, lvl: 1 },
  mana: { slot: 'potion', name: 'MANA POTION', mana: 25, lvl: 1 },   // drunk on pickup
};
const AFFIXES = [
  { pre: 'SHARP', stat: 'dmgPct', roll: [15, 40], slots: ['weapon'] },
  { pre: 'HEAVY', stat: 'dmgFlat', roll: [1, 4], slots: ['weapon'] },
  { pre: 'STURDY', stat: 'armorFlat', roll: [2, 6], slots: ['helm', 'chest', 'shield'] },
  { suf: 'OF LIFE', stat: 'hp', roll: [5, 15], slots: ['helm', 'chest', 'shield', 'weapon', 'ring', 'amulet'] },
  { suf: 'OF MIND', stat: 'mana', roll: [4, 12], slots: ['helm', 'chest', 'weapon', 'ring', 'amulet'] },
  { suf: 'OF LEECH', stat: 'leech', roll: [2, 5], slots: ['weapon', 'ring'] },
  { suf: 'OF SPEED', stat: 'speed', roll: [5, 12], slots: ['chest', 'helm', 'amulet'] },
  // round 16
  { suf: 'OF PRECISION', stat: 'crit', roll: [3, 8], slots: ['weapon', 'helm', 'ring', 'amulet'] },
  { pre: 'THORNED', stat: 'thorns', roll: [10, 25], slots: ['chest', 'shield'] },
  { pre: 'SWIFT', stat: 'atkSpeed', roll: [8, 15], slots: ['weapon', 'ring'] },
  { suf: 'OF RENEWAL', stat: 'regen', roll: [1, 2], slots: ['helm', 'chest', 'amulet'] },
  // round 42a: plain, everyday affixes (the common pool, kept apart from legendary powers)
  { pre: 'BURNING', stat: 'fireDmg', roll: [1, 2], slots: ['weapon', 'ring'] },
  { pre: 'CHILLING', stat: 'chill', roll: [10, 25], slots: ['weapon', 'amulet'] },
  { pre: 'GILDED', stat: 'goldFind', roll: [15, 40], slots: ['helm', 'ring', 'amulet'] },
  { pre: 'LUCKY', stat: 'find', roll: [8, 20], slots: ['ring', 'amulet', 'helm'] },
  { suf: 'OF THE VULTURE', stat: 'hpKill', roll: [1, 3], slots: ['weapon', 'ring'] },
  { suf: 'OF SIPHONING', stat: 'manaKill', roll: [1, 3], slots: ['weapon', 'ring', 'amulet'] },
  { suf: 'OF THE HEALER', stat: 'potion', roll: [15, 35], slots: ['chest', 'amulet'] },
  { suf: 'OF THE WALL', stat: 'dr', roll: [1, 2], slots: ['chest', 'shield', 'amulet'] },
];
// legendaries (round 16): fixed names and powers, an orange beam; bosses always drop one
const LEGENDARIES = [
  { fx: 'ember', base: 'long_sword', name: 'EMBERBRAND', mods: { dmgPct: 60, fireburst: 1 }, lore: "FORGED IN A DRAGON'S THROAT" },
  { fx: 'oak', base: 'crown_helm', name: 'CROWN OF THE OAK KING', mods: { hp: 25, regen: 3 }, lore: 'THE FOREST MENDS YOU' },
  { fx: 'grave', base: 'tower_shield', name: 'GRAVEWARDEN', mods: { armorFlat: 8, thorns: 60 }, lore: 'WHAT STRIKES YOU BLEEDS' },
  { fx: 'storm', base: 'brigandine', name: 'STORMHIDE', mods: { speed: 18, atkSpeed: 25 }, lore: 'LIGHTNING IN YOUR STEP' },
  { fx: 'blood', base: 'greatsword', name: 'BLOODDRINKER', mods: { dmgPct: 40, leech: 12 }, lore: 'IT IS NEVER FULL' },
  { fx: 'cinder', base: 'ember_staff', name: 'STAFF OF CINDERS', cls: 'mage', mods: { dmgPct: 60, fireburst: 1 }, lore: 'EVERY DEATH CATCHES FIRE' },
  { fx: 'magi', base: 'archmage_robe', name: 'MANTLE OF THE MAGI', cls: 'mage', mods: { mana: 40, hp: 20, regen: 2 }, lore: 'WOVEN FROM STARLIGHT' },
  { fx: 'seer', base: 'wizard_hat', name: "SEER'S PEAK", cls: 'mage', mods: { crit: 15, mana: 20 }, lore: 'IT SEES WHERE TO STRIKE' },
  { fx: 'wind', base: 'long_bow', name: 'WINDRUNNER', cls: 'ranger', mods: { atkSpeed: 30, speed: 15 }, lore: 'IT SINGS BEFORE IT STRIKES' },
  { fx: 'fang', base: 'hide_coat', name: 'WOLFHIDE', cls: 'ranger', mods: { hp: 30, crit: 10 }, lore: 'THE PACK REMEMBERS' },
  { fx: 'maul', base: 'war_axe', name: "WARLORD'S MAUL", mods: { dmgPct: 50, crit: 15 }, lore: 'TAKEN FROM THE OGRE' },
];
// sets (round 16): three named pieces each; wearing two gives a bonus, all three a bigger one
const SETS = {
  magus: { name: 'MAGUS', cls: 'mage', pieces: [['wizard_hat', 'MAGUS CAP'], ['mystic_robe', 'MAGUS VESTMENT'], ['oak_staff', 'MAGUS ROD']],
    bonus: [{ mana: 25 }, { dmgPct: 25, crit: 8 }], lines: ['2: +25 MANA', '3: +25% DAMAGE, +8% CRIT'] },
  warden: { name: "WARDEN'S", pieces: [['great_helm', "WARDEN'S VISOR"], ['plate_mail', "WARDEN'S PLATE"], ['kite_shield', "WARDEN'S WALL"]],
    bonus: [{ armorFlat: 10 }, { regen: 2, thorns: 30 }], lines: ['2: +10 ARMOR', '3: +2 LIFE/S, 30% RETURNED'] },
  ranger: { name: "SCOUT'S", pieces: [['cap', "SCOUT'S CAP"], ['brigandine', "SCOUT'S JERKIN"], ['buckler', "SCOUT'S TARGE"]],   // a warrior set (renamed when the ranger class came)
    bonus: [{ speed: 12 }, { atkSpeed: 20, crit: 8 }], lines: ['2: +12% MOVE SPEED', '3: +20% ATTACK SPEED, +8% CRIT'] },
  stalker: { name: "STALKER'S", cls: 'ranger', pieces: [['shadow_hood', "STALKER'S COWL"], ['studded_jerkin', "STALKER'S HIDE"], ['war_quiver', "STALKER'S QUIVER"]],
    bonus: [{ crit: 8 }, { atkSpeed: 25, dmgPct: 20 }], lines: ['2: +8% CRIT', '3: +25% ATTACK SPEED, +20% DAMAGE'] },
};
// round 56: outfits. The art chat's sets are ordinary drops, and wearing matching pieces of one gives a
// bonus that grows with each piece (2, then 3, then 4 worn), themed to the set. A piece is any of the
// listed bases (some helms and weapons belong to more than one outfit). The old SETS (green set items)
// are separate and work as before.
const OUTFITS = {
  militia: { name: 'MILITIA', pieces: ['militia_mail', 'cap'], bonus: [{ hp: 15 }], lines: ['2: +15 LIFE'] },
  roadwarden: { name: 'ROADWARDEN', pieces: ['roadwarden_mail', 'roadwarden_helm', 'long_sword', 'round_shield'], bonus: [{ armorFlat: 4 }, { regen: 2 }, { speed: 10 }], lines: ['2: +4 ARMOR', '3: +2 LIFE/S', '4: +10% MOVE SPEED'] },
  border_warden: { name: 'BORDER WARDEN', pieces: ['border_warden_mail', 'spangenhelm'], bonus: [{ atkSpeed: 10 }], lines: ['2: +10% ATTACK SPEED'] },
  gatewatch: { name: 'GATEWATCH', pieces: ['gatewatch_mail', 'gatewatch_helm', 'gatewatch_weapon', 'gatewatch_shield'], bonus: [{ armorFlat: 6 }, { dmgPct: 15 }, { crit: 5 }], lines: ['2: +6 ARMOR', '3: +15% DAMAGE', '4: +5% CRIT'] },
  copper_raider: { name: 'COPPER RAIDER', pieces: ['copper_raider_mail', 'copper_raider_helm', 'copper_raider_weapon'], bonus: [{ dmgPct: 15 }, { hpKill: 3 }], lines: ['2: +15% DAMAGE', '3: +3 LIFE PER KILL'] },
  iron_guard: { name: 'IRON GUARD', pieces: ['iron_guard_mail', 'great_helm'], bonus: [{ armorFlat: 10 }], lines: ['2: +10 ARMOR'] },
  vanguard: { name: 'VANGUARD', pieces: ['vanguard_mail', 'barbute'], bonus: [{ speed: 10 }], lines: ['2: +10% MOVE SPEED'] },
  dusk_duelist: { name: 'DUSK DUELIST', pieces: ['dusk_duelist_mail', 'dusk_duelist_helm', 'dusk_duelist_weapon', 'dusk_duelist_shield'], bonus: [{ crit: 6 }, { atkSpeed: 15 }, { leech: 4 }], lines: ['2: +6% CRIT', '3: +15% ATTACK SPEED', '4: +4% LIFE STOLEN'] },
  warbringer: { name: 'WARBRINGER', pieces: ['warbringer_mail', 'horned_helm'], bonus: [{ dmgPct: 20 }], lines: ['2: +20% DAMAGE'] },
  oathkeeper: { name: 'OATHKEEPER', pieces: ['oathkeeper_mail', 'great_helm', 'oathkeeper_weapon', 'oathkeeper_shield'], bonus: [{ armorFlat: 10 }, { thorns: 25 }, { regen: 3 }], lines: ['2: +10 ARMOR', '3: 25% DAMAGE RETURNED', '4: +3 LIFE/S'] },
  winter_bulwark: { name: 'WINTER BULWARK', pieces: ['winter_bulwark_mail', 'winter_bulwark_helm', 'winter_bulwark_weapon', 'winter_bulwark_shield'], bonus: [{ armorFlat: 12 }, { chill: 15 }, { dr: 3 }], lines: ['2: +12 ARMOR', '3: 15% CHANCE TO CHILL', '4: -3 DAMAGE TAKEN'] },
  steel_knight: { name: 'STEEL KNIGHT', pieces: ['steel_knight_mail', 'bascinet'], bonus: [{ armorFlat: 15 }], lines: ['2: +15 ARMOR'] },
  crown_guard: { name: 'CROWN GUARD', pieces: ['crown_guard_mail', 'crown_helm'], bonus: [{ hp: 25, armorFlat: 10 }], lines: ['2: +25 LIFE, +10 ARMOR'] },
  ember_forged: { name: 'EMBER FORGED', pieces: ['ember_forged_mail', 'ember_forged_helm', 'ember_forged_weapon'], bonus: [{ fireDmg: 4 }, { dmgPct: 20 }], lines: ['2: +4 FIRE DAMAGE', '3: +20% DAMAGE'] },
  royal_executor: { name: 'ROYAL EXECUTOR', pieces: ['royal_executor_mail', 'royal_executor_helm', 'royal_executor_weapon'], bonus: [{ crit: 8 }, { dmgPct: 30 }], lines: ['2: +8% CRIT', '3: +30% DAMAGE'] },
  bramble_scout: { name: 'BRAMBLE SCOUT', pieces: ['bramble_scout_jerkin', 'bramble_scout_bow'], bonus: [{ speed: 10 }], lines: ['2: +10% MOVE SPEED'] },
  marsh_runner: { name: 'MARSH RUNNER', pieces: ['marsh_runner_jerkin', 'marsh_runner_bow'], bonus: [{ regen: 2 }], lines: ['2: +2 LIFE/S'] },
  ashwood_hunter: { name: 'ASHWOOD HUNTER', pieces: ['ashwood_hunter_jerkin', 'ashwood_hunter_bow'], bonus: [{ dmgPct: 15 }], lines: ['2: +15% DAMAGE'] },
  dune_strider: { name: 'DUNE STRIDER', pieces: ['dune_strider_jerkin', 'dune_strider_bow'], bonus: [{ atkSpeed: 15 }], lines: ['2: +15% ATTACK SPEED'] },
  night_tracker: { name: 'NIGHT TRACKER', pieces: ['night_tracker_jerkin', 'night_tracker_bow', 'night_hood'], bonus: [{ crit: 8 }, { dmgPct: 15 }], lines: ['2: +8% CRIT', '3: +15% DAMAGE'] },
  thorn_sentinel: { name: 'THORN SENTINEL', pieces: ['thorn_sentinel_jerkin', 'thorn_sentinel_bow'], bonus: [{ thorns: 25, armorFlat: 6 }], lines: ['2: 25% DAMAGE RETURNED, +6 ARMOR'] },
  frostpath_stalker: { name: 'FROSTPATH STALKER', pieces: ['frostpath_stalker_jerkin', 'frostpath_stalker_bow'], bonus: [{ chill: 15, dmgPct: 10 }], lines: ['2: 15% CHANCE TO CHILL, +10% DAMAGE'] },
  blackthorn_warden: { name: 'BLACKTHORN WARDEN', pieces: ['blackthorn_warden_jerkin', 'blackthorn_warden_bow'], bonus: [{ dmgPct: 20, crit: 6 }], lines: ['2: +20% DAMAGE, +6% CRIT'] },
  wayfarer: { name: 'WAYFARER', pieces: ['wayfarer_robe', 'wayfarer_hat', 'wayfarer_staff'], bonus: [{ mana: 20 }, { speed: 10 }], lines: ['2: +20 MANA', '3: +10% MOVE SPEED'] },
  tidekeeper: { name: 'TIDEKEEPER', pieces: ['tidekeeper_robe', 'tidekeeper_hat', 'tidekeeper_staff'], bonus: [{ mana: 25 }, { manaKill: 3 }], lines: ['2: +25 MANA', '3: +3 MANA PER KILL'] },
  frost_scholar: { name: 'FROST SCHOLAR', pieces: ['frost_scholar_robe', 'frost_scholar_hat', 'frost_scholar_staff'], bonus: [{ chill: 15 }, { dmgPct: 20 }], lines: ['2: 15% CHANCE TO CHILL', '3: +20% DAMAGE'] },
  rose_oracle: { name: 'CRIMSON ORACLE', pieces: ['rose_oracle_robe', 'rose_oracle_hat', 'rose_oracle_staff'], bonus: [{ leech: 3 }, { crit: 8 }], lines: ['2: +3% LIFE STOLEN', '3: +8% CRIT'] },
  duskweaver: { name: 'DUSKWEAVER', pieces: ['duskweaver_robe', 'duskweaver_hat', 'duskweaver_staff'], bonus: [{ manaKill: 3 }, { dmgPct: 20 }], lines: ['2: +3 MANA PER KILL', '3: +20% DAMAGE'] },
  cinder_sage: { name: 'CINDER SAGE', pieces: ['cinder_sage_robe', 'cinder_sage_hat', 'cinder_sage_staff'], bonus: [{ fireDmg: 4 }, { dmgPct: 20 }], lines: ['2: +4 FIRE DAMAGE', '3: +20% DAMAGE'] },
  runebinder: { name: 'RUNEBINDER', pieces: ['runebinder_robe', 'runebinder_hat', 'runebinder_staff'], bonus: [{ mana: 30 }, { crit: 8, dmgPct: 15 }], lines: ['2: +30 MANA', '3: +8% CRIT, +15% DAMAGE'] },
  sunwarden: { name: 'SUNWARDEN', pieces: ['sunwarden_robe', 'sunwarden_hat', 'sunwarden_staff'], bonus: [{ hp: 25 }, { dmgPct: 25, regen: 2 }], lines: ['2: +25 LIFE', '3: +25% DAMAGE, +2 LIFE/S'] },
};
// round 63: higher tiers of the art chat's set pieces. All gear stopped at item level 6, so deeper
// floors only had better affixes. Each piece now also drops as TEMPERED (6 levels on) and ANCIENT
// (12 on): the same look, damage along the gear curve (((L + 2) / (l + 2)) ^ 0.8), armor more gently
// (its square root: armor cuts damage steeply), block +5 a tier (max 40). A tier counts as its plain
// piece for the outfit's bonus (`root`).
const TIERS = [['TEMPERED', 6], ['ANCIENT', 12]];
for (const id of [...new Set(Object.values(OUTFITS).flatMap(o => o.pieces))]) {
  const b = ITEM_BASES[id]; if (!b || !b.icon) continue;   // (the old generic pieces in an outfit, a cap or a long sword, stay as they are)
  TIERS.forEach(([word, up], n) => {
    const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), ka = Math.sqrt(k), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
    if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
    if (b.armor) v.armor = Math.round(b.armor * ka);
    if (b.block) v.block = Math.min(40, b.block + 5 * (n + 1));
    ITEM_BASES[id + '_t' + (n + 1)] = v;
  });
}
const rootOf = base => (ITEM_BASES[base] && ITEM_BASES[base].root) || base;
const outfitsOf = base => Object.keys(OUTFITS).filter(k => OUTFITS[k].pieces.includes(rootOf(base)));
function outfitCount(k, equip) { const e = equip || (typeof hero !== 'undefined' ? hero.equip : {}); return Object.values(e).filter(it => it && OUTFITS[k].pieces.includes(rootOf(it.base))).length; }
// the hero's class decides which gear drops (game.js sets hero.cls; warrior when unset)
const heroCls = () => (typeof hero !== 'undefined' && hero.cls) || 'warrior';
const forCls = o => o.cls === 'any' || (o.cls || 'warrior') === heroCls();
const JEWELRY = { ring: 1, amulet: 1 };
// magic find from worn gear (game.js keeps STAT; items.js is also loaded by the art kit without it)
const findK = () => 1 + ((typeof STAT !== 'undefined' && STAT.find) || 0) / 100;
function rollSetItem(R) {
  const k = R.pick(Object.keys(SETS).filter(k => forCls(SETS[k]))), [base, name] = R.pick(SETS[k].pieces);
  return { id: itemSerial++, base, rarity: 'set', set: k, name, mods: { [ITEM_BASES[base].slot === 'weapon' ? 'dmgPct' : 'armorFlat']: R.int(3, 6), hp: R.int(8, 16) } };
}
function rollLegendary(R) {
  const L = R.pick(LEGENDARIES.filter(forCls));
  return { id: itemSerial++, base: L.base, rarity: 'legend', name: L.name, lore: L.lore, fx: L.fx, mods: { ...L.mods } };
}
const RARITY_COL = { normal: 26, magic: 40, rare: 51, legend: 112, set: 55 };
let itemSerial = 1;
function rollItem(R, level, forceBase) {
  const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].lvl <= level + 1 && ITEM_BASES[k].slot !== 'potion' && forCls(ITEM_BASES[k]));
  let baseId = forceBase;
  if (!baseId) {   // weighted pick: rings and amulets keep a fixed share (about 6% and 4%) however many other bases a class has
    const gw = k => ITEM_BASES[k].lvl < level - 6 ? 0.35 : 1, nGear = bases.filter(k => !JEWELRY[ITEM_BASES[k].slot]).reduce((a, k) => a + gw(k), 0), wt = k => JEWELRY[ITEM_BASES[k].slot] ? ITEM_BASES[k].w * nGear : gw(k);   // (round 63: gear far below the floor's level comes up less)
    const tot = bases.reduce((a, k) => a + wt(k), 0);
    let x = R() * tot; baseId = bases[bases.length - 1];
    for (const k of bases) { x -= wt(k); if (x < 0) { baseId = k; break; } }
  }
  const base = ITEM_BASES[baseId], mf = findK();
  const it = { id: itemSerial++, base: baseId, rarity: 'normal', mods: {} };
  if (base.slot === 'potion') return it;
  it.lvl = Math.max(1, Math.round(level) + [-1, 0, 0, 1][Math.floor(R() * 4)]);   // round 75: every item carries the level it dropped at (round 77: the area's, give or take one)
  if (!forceBase && R() < (0.008 + level * 0.002) * mf) { const x = rollLegendary(R); x.lvl = it.lvl; return x; }
  if (!forceBase && R() < 0.015 + level * 0.002) { const x = rollSetItem(R); x.lvl = it.lvl; return x; }
  const q = R();
  it.rarity = q < (0.06 + level * 0.01) * mf ? 'rare' : q < 0.34 + (mf - 1) * 0.3 ? 'magic' : 'normal';
  if (it.rarity === 'normal' && JEWELRY[base.slot]) it.rarity = 'magic';   // a plain ring is nothing
  const n = it.rarity === 'rare' ? R.int(2, 3) : it.rarity === 'magic' ? 1 : 0;
  const pool = AFFIXES.filter(a => a.slots.includes(base.slot));
  const used = [];
  for (let k = 0; k < n && pool.length; k++) {
    const a = pool.splice(Math.floor(R() * pool.length), 1)[0];
    it.mods[a.stat] = R.int(a.roll[0], a.roll[1]) + Math.floor(level * 0.6);
    used.push(a);
  }
  if (it.rarity === 'magic' && used[0]) it.prefix = used[0].pre || null, it.suffix = used[0].suf || null;
  if (it.rarity === 'rare') it.title = R.pick(['GRIM', 'DREAD', 'BLOOD', 'GLOOM', 'BONE', 'STORM', 'DOOM', 'ASH']) + ' ' + R.pick(['BITE', 'WARD', 'SHELL', 'CROWN', 'SCAR', 'HOWL', 'MARK']);
  return it;
}
// rough worth of an item in its slot, for the bag's upgrade arrows and the comparison lines
// an item's level: the level it dropped at (older saves: its base's)
const itemLvl = it => it.lvl || ITEM_BASES[it.base].lvl || 1;
// round 77: an item's level counts. A piece found above its base's level is stronger along the gear
// curve the tempered tiers already use: damage by ((L + 2) / (l + 2)) ^ 0.8, armor by its square
// root (armor cuts damage steeply); block stays. So a short sword from a level 9 area beats one
// from level 1, while a higher base at the same level is still the better blade. Items from before
// this (no level of their own) are exactly what they were.
function itemStats(it) {
  const b = ITEM_BASES[it.base], L = Math.max(b.lvl || 1, it.lvl || 0), k = (L + 2) / ((b.lvl || 1) + 2);
  if (k <= 1 || b.slot === 'potion') return b;
  const kd = Math.pow(k, 0.8), o = Object.assign({}, b);   // (round 85: a copy of the whole base: the look, slot and the rest came through missing, so gear found above its base level was invisible on the hero)
  if (b.dmg) o.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)];
  if (b.armor) o.armor = Math.round(b.armor * Math.sqrt(k));
  return o;
}
function itemScore(it) {
  const b = itemStats(it), m = it.mods || {};
  const avg = b.dmg ? (b.dmg[0] + b.dmg[1]) / 2 : 0;
  return (avg + (m.dmgFlat || 0)) * (1 + (m.dmgPct || 0) / 100) * (b.slow ? 0.9 : 1) + (b.armor || 0) + (m.armorFlat || 0) + (b.block || 0) * 0.3
    + (m.hp || 0) * 0.25 + (m.mana || 0) * 0.1 + (m.leech || 0) * 0.6 + (m.crit || 0) * 0.5 + (m.atkSpeed || 0) * 0.35 + (m.speed || 0) * 0.3
    + (m.thorns || 0) * 0.1 + (m.regen || 0) * 3 + (m.fireburst ? 8 : 0)
    + (m.fireDmg || 0) * 1.2 + (m.chill || 0) * 0.15 + (m.goldFind || 0) * 0.05 + (m.find || 0) * 0.1 + (m.hpKill || 0) * 1.5 + (m.manaKill || 0) * 0.8
    + (m.potion || 0) * 0.1 + (m.dr || 0) * 2.5;
}
// what changes if `it` replaces `cur`: [text, color] lines, green for gains and red for losses
function compareLines(it, cur) {
  const b = itemStats(it), c = itemStats(cur), m = it.mods || {}, n = cur.mods || {}, out = [];
  const dmg = x => x.dmg ? (x.dmg[0] + x.dmg[1]) / 2 : 0;
  const d = (dmg(b) + (m.dmgFlat || 0)) * (1 + (m.dmgPct || 0) / 100) - (dmg(c) + (n.dmgFlat || 0)) * (1 + (n.dmgPct || 0) / 100);
  if (Math.abs(d) >= 0.5) out.push([`${d > 0 ? '+' : ''}${d.toFixed(1)} AVG DAMAGE`, d > 0 ? 55 : 23]);
  const a = (b.armor || 0) + (m.armorFlat || 0) - (c.armor || 0) - (n.armorFlat || 0);
  if (a) out.push([`${a > 0 ? '+' : ''}${a} ARMOR`, a > 0 ? 55 : 23]);
  const h = (m.hp || 0) - (n.hp || 0);
  if (h) out.push([`${h > 0 ? '+' : ''}${h} LIFE`, h > 0 ? 55 : 23]);
  const s = itemScore(it) - itemScore(cur);
  out.push([s > 0.5 ? 'BETTER THAN WORN' : s < -0.5 ? 'WORSE THAN WORN' : 'ABOUT THE SAME', s > 0.5 ? 55 : s < -0.5 ? 23 : 25]);
  return out;
}
// how many pieces of a set the hero wears now
function setCount(k) { return typeof hero === 'undefined' ? 0 : Object.values(hero.equip).filter(it => it && it.set === k).length; }
function itemName(it) {
  const b = ITEM_BASES[it.base];
  if (it.rarity === 'legend' || it.rarity === 'set') return it.name;
  if (it.rarity === 'rare' && it.title) return it.title;
  return [it.prefix, b.name, it.suffix].filter(Boolean).join(' ');
}
function itemLines(it) {
  const b = ITEM_BASES[it.base], m = it.mods, L = [];
  if (b.slot === 'potion') return [b.mana ? 'RESTORES ' + b.mana + ' MANA' : 'RESTORES ' + b.heal + ' LIFE'];
  if (it.rarity === 'rare' || it.rarity === 'legend' || it.rarity === 'set') L.push(b.name);
  { const q = itemStats(it); if (q.dmg) L.push(`DAMAGE ${q.dmg[0]}-${q.dmg[1]}${b.slow ? ' (SLOW)' : ''}`); if (q.armor) L.push(`ARMOR ${q.armor}`); }
  if (b.block) L.push(`BLOCK ${b.block}%`);
  if (m.dmgPct) L.push(`+${m.dmgPct}% DAMAGE`);
  if (m.dmgFlat) L.push(`+${m.dmgFlat} DAMAGE`);
  if (m.armorFlat) L.push(`+${m.armorFlat} ARMOR`);
  if (m.hp) L.push(`+${m.hp} LIFE`);
  if (m.mana) L.push(`+${m.mana} MANA`);
  if (m.leech) L.push(`${m.leech}% LIFE STEAL`);
  if (m.speed) L.push(`+${m.speed}% MOVE SPEED`);
  if (m.crit) L.push(`+${m.crit}% CRITICAL CHANCE`);
  if (m.thorns) L.push(`${m.thorns}% DAMAGE RETURNED`);
  if (m.atkSpeed) L.push(`+${m.atkSpeed}% ATTACK SPEED`);
  if (m.regen) L.push(`+${m.regen} LIFE PER SECOND`);
  if (m.fireburst) L.push('KILLS EXPLODE IN FIRE');
  if (m.fireDmg) L.push(`+${m.fireDmg} FIRE DAMAGE`);
  if (m.chill) L.push(`${m.chill}% CHANCE TO CHILL`);
  if (m.goldFind) L.push(`+${m.goldFind}% GOLD FOUND`);
  if (m.find) L.push(`+${m.find}% BETTER ITEMS`);
  if (m.hpKill) L.push(`+${m.hpKill} LIFE PER KILL`);
  if (m.manaKill) L.push(`+${m.manaKill} MANA PER KILL`);
  if (m.potion) L.push(`POTIONS HEAL ${m.potion}% MORE`);
  if (m.dr) L.push(`-${m.dr} DAMAGE TAKEN PER HIT`);
  if (it.lore) L.push(it.lore);
  if (it.set) { const S = SETS[it.set]; L.push(`${S.name} SET (${setCount(it.set)}/3 WORN)`); L.push(...S.lines); }
  for (const k of outfitsOf(it.base)) { const O = OUTFITS[k]; L.push(`${O.name} OUTFIT (${outfitCount(k)}/${O.pieces.length} WORN)`); L.push(...O.lines); }   // round 56
  return L;
}

// ---------------------------------------------------------------- icons (rig-drawn, 24x24)
const iconCache = {};
function itemIcon(it) {
  const b0 = ITEM_BASES[it.base], k = b0.look || it.base, b = b0.icon ? Object.assign({}, b0, { look: b0.icon }) : b0, tint = b0.tint ? M[b0.tint] : null;   // (round 49: a new look borrows the nearest icon, in its own color)
  if (iconCache[k]) return iconCache[k];
  const r = new Rig();
  const team = M.CLOTH_RED;
  if (b.slot === 'weapon') {
    const bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, -7);
    const wide = V.norm(V.cross(bd, [0, 0, 1])), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -2.5), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER); r.sph(V.mad(g, bd, -3.1), 1.2, M.GOLD);
    if (b.look.startsWith('staff')) {
      const orb = b0.orb ? M[b0.orb] : b.look === 'staff_fire' ? M.FIREM : b.look === 'staff_ice' || b.look === 'staff_rune' ? M.ICE : M.ARCANE;
      if (b.look === 'staff_rune') for (const z of [7, 11]) r.cyl(V.mad(g, bd, z), V.mad(g, bd, z + 0.9), 1.4, M.GOLD);
      r.cone(V.mad(g, bd, -1), V.mad(g, bd, 14), 0.9, 1.0, M.WOOD); r.sph(V.mad(g, bd, 16), 2.8, orb, { noShadow: true });
      for (const s of [-1, 1]) r.cone(V.mad(g, bd, 13), V.add(V.mad(g, bd, 16.6), V.mul(wide, s * 2.6)), 0.7, 0.4, M.GOLD);
    } else if (b.look.startsWith('bow')) {   // a bow standing on its end, strung
      const lm = tint || b.look === 'bow_horn' ? M.HORN : b.look === 'bow_war' ? M.BARK : M.WOOD, L = b.look === 'bow_long' || b.look === 'bow_war' ? 10 : 8.5;
      r.p.length = 0;   // no grip and pommel for a bow
      r.cone([0, 0, 4], [-2, 0, 4 + L * 0.6], 1.1, 0.9, lm); r.cone([-2, 0, 4 + L * 0.6], [0.6, 0, 4 + L * 1.1], 0.9, 0.5, lm);
      r.cone([0, 0, 4], [-2, 0, 4 - L * 0.6], 1.1, 0.9, lm); r.cone([-2, 0, 4 - L * 0.6], [0.6, 0, 4 - L * 1.1], 0.9, 0.5, lm);
      r.cone([0.6, 0, 4 + L * 1.1], [0.6, 0, 4 - L * 1.1], 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true });
      return (iconCache[k] = renderRig(r, Math.PI / 2, 26, 26, 13, 15));
    } else if (b.look === 'bsword') { r.cone(V.mad(g, bd, -4.4), V.mad(g, bd, -2.6), 0.9, 0.9, M.LEATHER); r.box(V.mad(g, bd, 1.8), [0.7, 4.0, 0.8], M.GOLD, wf); r.box(V.mad(g, bd, 11), [9, 1.3, 0.4], M.BLADE, wf); }
    else if (b.look === 'sword') { r.box(V.mad(g, bd, 1.8), [0.7, 3.4, 0.8], M.GOLD, wf); r.box(V.mad(g, bd, 9.6), [7.4, 1.2, 0.4], M.BLADE, wf); }
    else if (b.look === 'greatsword') { r.box(V.mad(g, bd, 1.8), [0.8, 4.2, 0.9], M.IRON, wf); r.box(V.mad(g, bd, 10.2), [8.4, 1.5, 0.45], M.BLADE, wf); }
    else if (b.look === 'flail') { r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 7), 0.9, 0.9, M.WOOD); r.sph(V.mad(V.mad(g, bd, 9), [0, 0, -1], 3), 2.6, M.IRON); }
    else {
      r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13), 0.9, 0.9, M.WOOD);
      if (b.look === 'spear') { r.cone(V.mad(g, bd, 12.5), V.mad(g, bd, 17.5), 1.6, 0.2, M.BLADE); r.cyl(V.mad(g, bd, 12), V.mad(g, bd, 12.8), 1.2, M.GOLD); }   // round 56: a leaf blade on a long haft
      else if (b.look === 'axe') r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3)), [2.8, 3.0, 0.5], M.BLADE, wf);
      else if (b.look === 'baxe') for (const s of [-1, 1]) r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, s * 3)), [3.2, 2.6, 0.5], M.BLADE, wf);
      else if (b.look === 'mstar') { const hb = V.mad(g, bd, 13.5); r.sph(hb, 3.0, M.IRON); for (const d of [bd, wide, V.mul(wide, -1), wf[2], V.mul(wf[2], -1)]) r.cone(V.mad(hb, d, 2.4), V.mad(hb, d, 4.6), 0.8, 0.15, M.STEEL); }
      else r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
    }
  } else if (b.slot === 'helm') {
    const hd = [0, 0, 4], fwd = [1, 0, 0], up = [0, 0, 1], sd = [0, 1, 0];
    if (b.look === 'cap') r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.IRON);
    else if (b.look === 'hat' || b.look === 'hat_conj') { r.cyl([0, 0, 0], [0, 0, 0.8], 7, (tint || (b.look === 'hat_conj' ? M.CLOTH_NAVY : M.CLOTH_PURPLE))); r.cone([0, 0, 0.5], [-1.2, 0, 6], 4.6, 2.4, (tint || (b.look === 'hat_conj' ? M.CLOTH_NAVY : M.CLOTH_PURPLE)), { mf: p => p[2] < 2 ? M.GOLD : 0 }); r.cone([-1.2, 0, 6], [-4.5, 0, 10.5], 2.4, 0.5, (tint || (b.look === 'hat_conj' ? M.CLOTH_NAVY : M.CLOTH_PURPLE))); }
    else if (b.look.startsWith('rhood')) { const hm = b.look === 'rhood_dark' ? M.CLOTH_SHADOW : b.look === 'rhood_night' ? M.CLOTH_NAVY : M.CLOTH_GREEN; r.ell([0, 0, 4], [5.4, 5.6, 5.8], hm, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : 0 }); r.cone([-4, 0, 7], [-8, 0, 4], 2.2, 0.5, hm); r.ell([0, 0, -1.5], [4, 5.4, 1.6], hm); }
    else if (b.look === 'spangen') { r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.STEEL, null, { mf: p => Math.abs(p[1]) < 0.6 || p[2] < 0.6 ? M.GOLD : 0 }); r.cone([0, 0, 5], [0, 0, 9.5], 3, 0.3, M.STEEL); }
    else if (b.look === 'hood_sage') { r.ell([0, 0, 4], [5.4, 5.6, 5.8], M.CLOTH_GREEN, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : p[0] > 3 && Math.abs(p[1]) < 4 && p[2] < 6.2 ? M.GOLD : 0 }); r.cone([-4, 0, 6], [-8, 0, 2], 2.2, 0.5, M.CLOTH_GREEN); }
    else if (b.look === 'hood') { r.ell([0, 0, 4], [5.4, 5.6, 5.8], M.CLOTH_BLUE, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : 0 }); r.cone([-4, 0, 6], [-8, 0, 2], 2.2, 0.5, M.CLOTH_BLUE); }
    else if (b.look === 'barbute') r.ell(hd, [5.4, 5.3, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); return q[0] > 2.4 && ((Math.abs(q[2] - 0.8) < 0.75 && Math.abs(q[1]) < 3.2) || (Math.abs(q[1]) < 0.8 && q[2] < 0.8 && q[2] > -4)) ? M.DARK : 0; } });
    else {
      r.ell(hd, [5.6, 5.4, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); if (Math.abs(q[2] - 2.2) < 0.8) return M.GOLD; if (q[0] > 2.6 && Math.abs(q[2] - 0.4) < 0.75 && Math.abs(q[1]) < 4) return M.DARK; return 0; } });
      if (b.look === 'bascinet') r.cone([0, 0, 9], [-1.5, 0, 14], 3.6, 0.4, M.STEEL);
      if (b.look === 'horned') for (const s of [-1, 1]) r.cone(V.add(hd, [0, s * 5, 2.5]), V.add(hd, [0, s * 8.5, 8]), 1.4, 0.4, M.HORN);
      if (b.look === 'crown') { r.cyl(V.add(hd, [0, 0, 3]), V.add(hd, [0, 0, 4.6]), 5.2, M.GOLD); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; r.cone(V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 4.4]), V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 7]), 0.9, 0.2, M.GOLD); } }
      void fwd; void up; void sd;
    }
  } else if (b.slot === 'chest') {
    const m = tint || b.look === 'jerkin_hide' ? (tint || M.HIDE) : b.look === 'jerkin_drake' ? M.BLOODY : b.look.startsWith('jerkin') ? M.LEATHER : b.look === 'plate' ? M.PLATE : b.look === 'darkplate' || b.look === 'gothic' ? M.DSTEEL : b.look === 'chain' ? M.CHAIN : b.look === 'scale' ? M.GOLD : b.look.startsWith('robe') ? (TEAM[b.look.slice(5)] || team) : team;
    if (b.look.startsWith('robe')) r.cone([0, 0, 2], [0, 0, -7], 4.4, 6.6, m, { mf: p => p[2] < -5.4 ? M.GOLD : 0 });   // the robe's skirt
    r.ell([0, 0, 3], [4.6, 6.6, 6.4], m, null, b.look.startsWith('robe') ? { mf: p => p[0] > 2 && Math.abs(p[1]) < 0.8 ? M.GOLD : 0 } : undefined);
    for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], b.look === 'tunic' ? M.LEATHER : b.look.startsWith('jerkin') ? M.CLOTH_GREEN : m);
  } else if (b.slot === 'shield' && b.look.startsWith('quiver')) {   // a leather quiver with three fletchings (the deep one: a gold band, two more)
    r.cone([0, 0, -4], [0, 0, 7], 2.2, 2.6, M.LEATHER, { mf: p => p[2] > 5.6 || Math.abs(p[2] - 0.5) < 0.6 ? M.DARK : 0 });
    for (const [y, m] of [[-1.1, M.CLOTH_WHITE], [0, M.CLOTH_RED], [1.1, M.CLOTH_WHITE]]) r.cone([0, y, 7], [0, y * 1.3, 11], 0.9, 0.4, m, { noShadow: true });
    if (b.look === 'quiver_deep') { for (const y of [-2.2, 2.2]) r.cone([0, y, 7], [0, y * 1.3, 10.5], 0.9, 0.4, M.CLOTH_RED, { noShadow: true }); r.cyl([0, 0, 2], [0, 0, 3], 2.6, M.GOLD); }
  } else if (b.slot === 'shield') {
    if (b.look === 'tower') { r.box([0, 0, 4], [0.8, 4.4, 7.4], team, null, { mf: p => Math.abs(p[1]) > 3.5 || Math.abs(p[2] - 4) > 6.5 ? M.IRON : Math.abs(p[1]) < 0.8 ? M.GOLD : 0 }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'targe') { r.ell([0, 0, 4], [1, 5, 5], M.LEATHER, null, { mf: p => { const d2 = (p[1] ** 2 + (p[2] - 4) ** 2) / 25; return d2 > 0.78 ? M.IRON : Math.abs(d2 - 0.42) < 0.08 && Math.abs(Math.sin(Math.atan2(p[2] - 4, p[1]) * 4)) > 0.7 ? M.GOLD : 0; } }); r.cone([0.8, 0, 4], [3.4, 0, 4], 1.3, 0.2, M.STEEL); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'heater') { r.ell([0, 0, 4], [1, 4.8, 6.4], team, null, { mf: p => { const u = p[1] / 4.8, v = (p[2] - 4) / 6.4; return v > 0.62 ? M.IRON : u * u + v * v > 0.66 ? M.GOLD : Math.abs(v + Math.abs(u) * 1.1 - 0.15) < 0.13 ? M.GOLD : 0; } }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'round') { r.ell([0, 0, 4], [1, 5, 5], M.WOOD, null, { mf: p => { const d2 = (p[1] ** 2 + (p[2] - 4) ** 2) / 25; return d2 > 0.74 || d2 < 0.06 ? M.IRON : 0; } }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    const big = b.look === 'kite', rad = big ? [1, 5, 7] : [1, 4.4, 4.4], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    r.ell([0, 0, 4], rad, team, ax, { mf: p => { const u = p[1] / rad[1], v = (p[2] - 4) / rad[2]; return u * u + v * v > 0.62 ? M.GOLD : (big && (Math.abs(u) < 0.14 || Math.abs(v - 0.15) < 0.11)) ? M.GOLD : 0; } });
  } else if (b.slot === 'ring') {   // round 42a: a gold band facing you, tipped back a little, a blue stone in a setting on top
    const c = [0, 0, 5], u = [0, 1, 0], v = V.norm([-0.35, 0, 0.94]);
    for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; r.sph(V.add(c, V.add(V.mul(u, Math.cos(a) * 4.6), V.mul(v, Math.sin(a) * 4.6))), 1.2, M.GOLD); }
    const top = V.mad(c, v, 5.4);
    r.cone(top, V.mad(top, v, 1.4), 1.5, 2.3, M.GOLD); r.sph(V.mad(top, v, 2.2), 2.1, M.ICE);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 21));
  } else if (b.slot === 'amulet') {   // a chain hanging in a V to a round gold pendant with a red stone
    for (let k = 0; k <= 12; k++) { const t = k / 12, y = (t - 0.5) * 11, z = 7 + Math.abs(t - 0.5) * 2 * 7; r.sph([-0.5, y, z], 0.95, M.GOLD); }
    r.ell([0, 0, 3.0], [1.0, 4.4, 4.4], M.GOLD); r.sph([0.9, 0, 3.0], 2.5, M.CLOTH_RED);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 21));
  } else {   // potion
    const liquid = b.mana ? M.CLOTH_BLUE : M.CLOTH_RED;
    r.cyl([0, 0, -1], [0, 0, 6], 3.4, liquid); r.sph([0, 0, 6], 3.6, liquid);
    r.cyl([0, 0, 9], [0, 0, 11.5], 1.3, M.BONE); r.cyl([0, 0, 11.5], [0, 0, 12.5], 1.6, M.WOOD);
  }
  return (iconCache[k] = renderRig(r, b.slot === 'shield' ? Math.PI / 4 : b.slot === 'helm' || b.slot === 'chest' ? Math.PI / 4 : 0, 26, 26, 13, 17));
}
