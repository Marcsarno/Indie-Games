import html
G=[("Bosses",[
 ("hounds/final-alpha.png","Greyfang, the Alpha","greyfang","Rebuilt: blue-grey coat (reads on dark floors), big spiky cream mane over neck, shoulders and chest, yellow eyes, red scar, leaner longer legs, cream toes and tail tip. Weak spot: the mane hides the ears from the front."),
 ("rook/final-banditchief.png","Rook, Bandit Chief","rook","Rebuilt: steel cap with a red bandana knotted at the side, scowling bearded face, stocky build, quilted red coat to the knees, leather pauldron, belt with a brass key, broad cleaver, planked round shield. Horned helm, spikes and axe gone."),
 ("skeletons/final-skelking.png","The Skeleton King","skeleton_king","Rebuilt: normal-size skull (was 1.4x), modest gold crown, plate breastplate with gold buckle, layered gold-trimmed pauldrons, tattered dark crimson cape gathered at the neck, broad chipped sword held low, clawed hand raised."),
 ("ogres/final-gorr.png","Gorr, the Minebreaker","gorr","New boss (shown under the Warlord for scale): steel pauldrons, leather overalls with braces crossing at the back, rope belt, ragged apron, hip pouch, faceted stone sledgehammer with an overhead two-handed slam."),
]),("Elites",[
 ("ogres/final-ironjaw.png","Ironjaw Enforcer","ironjaw_enforcer","New (shown under the regular Enforcer): iron jaw grille with tusks poking past it, riveted steel pauldron, cross strap, big buckle, short torn red skirt, iron-banded wooden mallet."),
 ("ashhex/final-ashhex.png","Ashhex Shaman","ashhex_shaman","New (shown under the Fallen Shaman): orange hood and mantle, tall white horns, bone-fang necklace, taller orb staff, flame in hand; smaller head than the Shaman's."),
 ("hounds/final-gravespine.png","Gravespine Hound","gravespine_hound","New (shown above the Bone Hound): horned skull mask with red eyes, tall curled bone plates down the spine, ragged dark red cloth, studded iron collar."),
 ("skeletons/final-bulwark.png","Crypt Bulwark","crypt_bulwark","New (shown above the Tomb Guard): blued-steel kettle helm with an iron brim, steel pauldrons, cross strap, bare-wood tower shield with iron bands, spiked mace, blue loincloth, 15% bigger."),
])]
out=[]
for g,items in G:
    out.append(f'<h2 class="grp">{g}</h2>')
    for img,name,con,note in items:
        out.append(f'<section><div class="head"><h3>{name}</h3></div><div class="row"><figure class="concept"><img src="concepts/{con}.png" alt="Concept: {name}"><figcaption>your concept</figcaption></figure><p class="note">{html.escape(note)}</p></div><div class="strip"><img loading="lazy" src="{img}" alt="{name}"></div></section>')
open('index.html','w').write(open('page_head.html').read().replace('{{BODY}}','\n'.join(out)))
