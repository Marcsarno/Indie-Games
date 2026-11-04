# Builds index.html for the B2 review page (run from this folder).
import html
G = [
 ("New monsters", [
  ("cavebat","Cave Bat","cave_bat","NEW. Hovers with its shadow under it, flaps, climbs then dives with claws out, falls flat on death."),
  ("bogtoad","Bog Toad","bog_toad","NEW. Warty olive body, orange eyes, a throat that pulses at rest; hops on walk, lashes its tongue, rolls onto its back on death. Throat is ochre (no pale green in the palette)."),
  ("restless","Restless Dead","restless_dead","NEW. A shambling corpse in a torn tunic, one arm reaching; drags a foot when it walks, falls forward on death."),
  ("spitter","Venom Spitter","venom_spitter","NEW. Brown spider with yellow-green venom patches; rears up and spits a green glob (fires the game's arrow until a venom shot exists)."),
  ("stoneback","Stoneback Spider","stoneback_spider","NEW. Low, heavy, slower; a cracked grey stone shell, orange eyes."),
  ("broodguard","Brood Guard","brood_guard","NEW. Tall on stilt legs with red knees, three red stripes, abdomen cocked up behind."),
  ("xbowman","Bandit Crossbowman","bandit_crossbowman","NEW. Blue-steel cap, laced leather jerkin, crossbow shouldered and aimed level when it shoots, bolt case at the hip. Shown beside the Brigand."),
 ]),
 ("Skeletons", [
  ("skeleton","Skeleton","skeleton","Blue-steel pauldron with an orange boss, round red skull shield, long torn red loincloth, red sash; ribs show."),
  ("spearman","Crypt Spearman","crypt_spearman","Spear held across the body so the head shows from the front; longer navy loincloth."),
  ("axeman","Bone Axeman","bone_axeman","Axe held diagonally, head at shoulder height; long red cloth front and back."),
  ("gravebow","Grave Crossbowman","grave_crossbowman","Bigger leather pauldron with a gold rivet; bolt quiver low on the left thigh."),
  ("tombguard","Tomb Guard","tomb_guard","Thick rolled helm brim, raised so the eyes show; red cloth front and back; bevel on the shield."),
  ("archer","Skeleton Archer",None,"Longer recurved bow held out from the body, back quiver with red fletching, bracer."),
  ("burning","Burning Dead","burning_dead","Taller helm flared at the back; bigger flames with red tips."),
  ("lich","The Lich",None,"Bell-shaped robe with ragged tails; dark hood behind the skull."),
  ("skelking","Skeleton King",None,"Draped red cloak with gold hem and fur collar, broad gold-hilted greatsword; the cloak lies flat in death."),
 ]),
 ("Imps and goblins", [
  ("fallen","Fallen One","fallen_spearling","Purple bat ears swept back, pale hooves, broader loincloth, bigger head and eyes."),
  ("knifer","Fallen Knifer","fallen_knifer","Same ear, hoof and head changes."),
  ("slinger","Fallen Slinger","fallen_slinger","Same ear, hoof and head changes."),
  ("shaman","Fallen Shaman","ember_acolyte","Hood set back so more of the red face shows; pale hooves."),
  ("goblin","Goblin","goblin","Leaner, open leather vest, steel dagger instead of the spear, long nose, rounder cap, ears swept back."),
  ("gchief","Goblin Chieftain",None,"Narrower crown so the face shows, fang necklace, vest."),
  ("gshaman","Goblin Shaman",None,"Forked staff around a bigger orb, leather cap."),
  ("treasure","Treasure Goblin",None,"Fatter sack tied at the neck, bigger gold heap."),
  ("digger","Digger",None,"Pick resting on the shoulder, light steel cap with a candle, pale snout."),
 ]),
 ("Hounds", [
  ("wolf","Wolf","grey_pack_hunter","Bigger pointed ears, black nose, pale cheek, bigger head."),
  ("alpha","The Alpha",None,"Darker coat, silver crest of raised fur, bushy pale-tipped tail."),
  ("hound","Bone Hound","bone_hound","Wide crescent horns sweeping back, bigger skull, cream toes, black nose."),
  ("ghoulhound","Hell Hound","ember_hound","Same horn and head changes as the Bone Hound."),
  ("bear","Dire Bear",None,"Shoulder hump, shorter muzzle, thicker legs, round ears, dark lower legs."),
  ("boar","Boar",None,"Barrel body, spiky bristle crest, flat snout, big upturned tusks, dark legs."),
 ]),
 ("Ogres and treant", [
  ("oclubber","Ogre Clubber","ogre_clubber","Short splayed tusks, arms out from the body, club angled up like a log, belt band, torn skirt."),
  ("orockthrower","Ogre Rockthrower","ogre_rockthrower","Rock held clear of the head, bigger stone bag, belt band."),
  ("oshield","Ogre Shieldbearer","ogre_shieldbearer","Bigger four-plank shield with riveted bands, moved off the fist."),
  ("oenforcer","Ogre Enforcer","ogre_enforcer","Steel cleaver that keeps its color turned away, belt and skirt, shoulder blades."),
  ("warlord","Ogre Warlord",None,"Crude gold crown, pale steel club spikes, leather skirt filling the gap between the legs."),
  ("treant","Treant Elder","treant_elder","Crown of four lobes lifted clear of the face, bigger eyes, longer arms."),
 ]),
 ("Spiders", [
  ("spider","Cave Spider","cave_skitter","Pale spots instead of the skull mark, white fangs, bigger red eyes, red feet, rounder raised abdomen."),
  ("broodmother","Broodmother",None,"Small clutch of egg sacs at the back, red spur on every knee."),
 ]),
 ("Mushrooms, slimes, wraith, bandits", [
  ("shroom","Shroomling",None,"Broad spotted dome over a pale gill skirt, tipped back so the face and eyes show."),
  ("sporecap","Sporecap",None,"Same cap and face as the Shroomling."),
  ("slime","Slime",None,"Gumdrop shape on a puddle skirt, big eyes, a mouth that opens on the bite."),
  ("blueslime","Big Blue Slime",None,"Same as the Slime."),
  ("wraith","Wraith",None,"Seven-point ragged hem flaring out, bell sleeves, bony clawed hands, short hood tip, bigger eyes."),
  ("brigand","Brigand",None,"Dark hood with a red scarf mask, baldric with a brass buckle, long knife in the free hand."),
  ("banditchief","Bandit Chief",None,"Grey fur collar, double-bladed battle axe, blackened spiked pauldrons."),
 ]),
]
import os
slice_of = {}
for d in os.listdir('.'):
    if os.path.isdir(d):
        for f in os.listdir(d):
            if f.startswith('final-'): slice_of[f[6:-4]] = d
out = []
for g, items in G:
    out.append(f'<h2 class="grp">{html.escape(g)}</h2>')
    for mid, name, con, note in items:
        img = f'{slice_of[mid]}/final-{mid}.png'
        c = f'<figure class="concept"><img src="concepts/{con}.png" alt="Concept: {name}"><figcaption>your concept</figcaption></figure>' if con else '<figure class="concept none"><figcaption>no concept: judged on the rubric</figcaption></figure>'
        out.append(f'<section><div class="head"><h3>{name}</h3><span class="tag">{mid}</span></div><div class="row">{c}<p class="note">{html.escape(note)}</p></div><div class="strip"><img loading="lazy" src="{img}" alt="{name}: before and after"></div></section>')
page = open('page_head.html').read().replace('{{BODY}}', '\n'.join(out))
open('index.html', 'w').write(page)
print('ok', sum(len(i) for _, i in G))
