"""Business signs for the rebuilt city (round 39, M2): real Coconut Creek / US 441 names (user: "using the actual business names").
Run with system python (Blender's has no PIL): python3 scripts/tex_cc.py  ->  out/tex/sign_cc_<key>.png + out/tex/cc_signs.json (key -> name, colours)."""
import os, json
from PIL import Image, ImageDraw, ImageFont
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "tex"); os.makedirs(OUT, exist_ok=True)
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; CAR = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"
# key: (text, background, letters, accent used on the building: awning / fascia / roof)
SIGNS = {
    # gas
    "wawa": ("WAWA", "#c8102e", "#ffd200", "#c8102e"), "racetrac": ("RaceTrac", "#e1251b", "#ffffff", "#1d2b5a"), "shell": ("Shell", "#ffd500", "#dd1d21", "#dd1d21"),
    "7eleven": ("7-ELEVEN", "#ffffff", "#008163", "#f47b20"), "chevron": ("Chevron", "#ffffff", "#0054a4", "#0054a4"), "mobil": ("Mobil", "#ffffff", "#0b3f8c", "#e41f26"),
    "sunoco": ("SUNOCO", "#0a2d6e", "#fcd116", "#0a2d6e"), "speedway": ("Speedway", "#ffffff", "#e2231a", "#e2231a"),
    # fast food / coffee
    "mcd": ("McDonald's", "#da291c", "#ffc72c", "#da291c"), "chickfila": ("Chick-fil-A", "#ffffff", "#dd0031", "#dd0031"), "tacobell": ("Taco Bell", "#702082", "#ffffff", "#702082"),
    "burgerking": ("BURGER KING", "#f5ebdc", "#d62300", "#ff8732"), "wendys": ("Wendy's", "#ffffff", "#e2203d", "#e2203d"), "dunkin": ("DUNKIN'", "#ffffff", "#ff671f", "#da1884"),
    "starbucks": ("STARBUCKS", "#00704a", "#ffffff", "#00704a"), "pollo": ("Pollo Tropical", "#fdf3d7", "#e35205", "#2e8b3e"), "checkers": ("Checkers", "#ffffff", "#c8102e", "#111111"),
    "popeyes": ("Popeyes", "#ffffff", "#f26522", "#f26522"), "arbys": ("Arby's", "#ffffff", "#d71920", "#d71920"), "chipotle": ("CHIPOTLE", "#451400", "#ffffff", "#a81612"),
    "subway": ("SUBWAY", "#008c15", "#ffc20d", "#008c15"), "kfc": ("KFC", "#a3080c", "#ffffff", "#a3080c"), "dennys": ("Denny's", "#ffd400", "#d4202c", "#d4202c"),
    "tijuana": ("Tijuana Flats", "#1b75bb", "#ffffff", "#f7941d"), "pdq": ("PDQ", "#ffffff", "#c8102e", "#c8102e"), "dominos": ("Domino's", "#006491", "#ffffff", "#e31837"),
    # banks
    "chase": ("CHASE", "#ffffff", "#117aca", "#117aca"), "wellsfargo": ("WELLS FARGO", "#d71e28", "#ffcd41", "#d71e28"), "bofa": ("Bank of America", "#ffffff", "#012169", "#e31837"),
    "tdbank": ("TD Bank", "#34a853", "#ffffff", "#34a853"), "citi": ("citi", "#ffffff", "#056dae", "#056dae"),
    # stores
    "cvs": ("CVS pharmacy", "#ffffff", "#cc0000", "#cc0000"), "walgreens": ("Walgreens", "#ffffff", "#e31837", "#e31837"), "autozone": ("AutoZone", "#f37021", "#ffffff", "#d52b1e"),
    "advance": ("ADVANCE AUTO PARTS", "#ffd200", "#111111", "#d71920"), "carwash": ("CAR WASH", "#1c9ad6", "#ffffff", "#1c9ad6"), "ups": ("The UPS Store", "#351c15", "#ffb500", "#351c15"),
    "homedepot": ("THE HOME DEPOT", "#f96302", "#ffffff", "#f96302"), "target": ("TARGET", "#ffffff", "#cc0000", "#cc0000"), "bestbuy": ("BEST BUY", "#0046be", "#ffe000", "#0046be"),
    "lafitness": ("LA FITNESS", "#ffffff", "#c8102e", "#1d3b6e"), "ross": ("ROSS", "#ffffff", "#0b3c8c", "#0b3c8c"), "marshalls": ("Marshalls", "#ffffff", "#0e1d4f", "#0e1d4f"),
    "petsmart": ("PetSmart", "#ffffff", "#c8102e", "#0053a0"), "walmart": ("Walmart", "#0071ce", "#ffffff", "#0071ce"), "publix": ("Publix", "#3d8a46", "#ffffff", "#3d8a46"),
    "aldi": ("ALDI", "#00205b", "#ffffff", "#f37021"), "officedepot": ("OFFICE DEPOT", "#ffffff", "#cc0000", "#cc0000"), "tjmaxx": ("T.J.Maxx", "#ffffff", "#9b1b30", "#9b1b30"),
    # plaza units
    "nails": ("NAILS", "#7a2f6a", "#ffffff", "#7a2f6a"), "pizza": ("PIZZA", "#b8321f", "#ffffff", "#b8321f"), "deli": ("DELI", "#2f5e3a", "#ffffff", "#2f5e3a"),
    "cleaners": ("CLEANERS", "#2a4f8c", "#ffffff", "#2a4f8c"), "sushi": ("SUSHI", "#1d1d1d", "#ffffff", "#b02a2a"), "vape": ("VAPE", "#3a2a5a", "#7ef2ff", "#3a2a5a"),
    "insurance": ("INSURANCE", "#ffffff", "#0b4ea2", "#0b4ea2"), "liquor": ("LIQUORS", "#7a1f1f", "#ffffff", "#7a1f1f"), "barber": ("BARBER", "#ffffff", "#b02a2a", "#2a4f8c"),
    "taxes": ("TAXES", "#2e7d32", "#ffffff", "#2e7d32"), "cuban": ("CUBAN CAFE", "#f2c230", "#7a1f1f", "#7a1f1f"), "bagels": ("BAGELS", "#8a5a2a", "#ffffff", "#8a5a2a"),
    # dealers + landmarks + civic
    "ford": ("FORD", "#133a7c", "#ffffff", "#133a7c"), "toyota": ("TOYOTA", "#ffffff", "#eb0a1e", "#eb0a1e"), "honda": ("HONDA", "#ffffff", "#cc0000", "#cc0000"),
    "kia": ("KIA", "#05141f", "#ffffff", "#05141f"), "chevrolet": ("CHEVROLET", "#ffffff", "#c8a02a", "#1d1d1d"), "nissan": ("NISSAN", "#ffffff", "#c3002f", "#3c3c3c"),
    "bodyshop": ("COLLISION CENTER", "#ffffff", "#1d3b6e", "#1d3b6e"), "service": ("SERVICE", "#ffffff", "#1d3b6e", "#1d3b6e"),
    "worldofbeer": ("World of Beer", "#1d1d1d", "#f2b632", "#5a3a1a"), "coopershawk": ("Cooper's Hawk", "#1f1f1f", "#d9b56a", "#3a2a1a"), "cinema": ("CINEMARK", "#1d1d1d", "#ffffff", "#b02a2a"), "promenade": ("THE PROMENADE", "#f2e6c8", "#5a3a20", "#5a3a20"),
    "cchs": ("COCONUT CREEK HIGH", "#ffffff", "#7a1f1f", "#7a1f1f"), "ccel": ("COCONUT CREEK ELEMENTARY", "#ffffff", "#1d4f8c", "#1d4f8c"), "fire": ("FIRE RESCUE 50", "#ffffff", "#b8322a", "#b8322a"),
    "rec": ("COMMUNITY CENTER", "#ffffff", "#1d6f8c", "#1d6f8c"), "aquatic": ("AQUATIC CENTER", "#ffffff", "#1d6f8c", "#1d6f8c"), "offices": ("CORPORATE PARK", "#ffffff", "#2a3a4a", "#2a3a4a"),
    "butterfly": ("BUTTERFLY WORLD", "#2e7d32", "#ffe14a", "#2e7d32"), "wynmoor": ("WYNMOOR", "#f2ead6", "#2f4f2f", "#2f4f2f"), "hammocks": ("THE HAMMOCKS", "#f2ead6", "#3a5a2a", "#3a5a2a"),
    "storage": ("PUBLIC STORAGE", "#f37021", "#ffffff", "#f37021"), "church": ("COMMUNITY CHURCH", "#f2eee4", "#3a4a6a", "#3a4a6a"), "stables": ("TRADEWINDS STABLES", "#5a3a20", "#ffffff", "#9e3a2a"),
    "comingsoon": ("COMING SOON", "#1d3b6e", "#ffffff", "#1d3b6e"),
    "cheesecake": ("THE CHEESECAKE FACTORY", "#f2e6c8", "#5a3a20", "#b8863a"), "dsw": ("DSW", "#1d1d1d", "#ffffff", "#1d1d1d"), "kobe": ("KOBE", "#7a1f1f", "#ffffff", "#1d1d1d"),
    "silverspot": ("SILVERSPOT", "#1d1d1d", "#d9b56a", "#1d1d1d"),
    "sabal": ("SABAL PINES PARK", "#5a3a20", "#ffffff", "#5a3a20"), "tradewinds": ("TRADEWINDS PARK", "#5a3a20", "#ffffff", "#5a3a20"), "plaza": ("COCONUT CREEK PLAZA", "#f2e6c8", "#5a3a20", "#5a3a20"),
}
def make(key, text, bg, fg, w=512, h=128):
    im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im)
    font = CAR if any(c.islower() for c in text) else BOLD; size = int(h * .62)
    f = ImageFont.truetype(font, size)
    while d.textlength(text, font=f) > w * .88 and size > 10: size -= 2; f = ImageFont.truetype(font, size)
    bb = d.textbbox((0, 0), text, font=f); d.text(((w - (bb[2] - bb[0])) / 2 - bb[0], (h - (bb[3] - bb[1])) / 2 - bb[1]), text, font=f, fill=fg)
    d.rectangle([2, 2, w - 3, h - 3], outline=fg if bg.lower() in ("#ffffff", "#f2e6c8", "#f2ead6", "#fdf3d7", "#f5ebdc") else bg, width=4)
    im.save(os.path.join(OUT, f"sign_cc_{key}.png"), optimize=True)
GRASS_TINTS = ["#64a345", "#619f43", "#66a446", "#69a948", "#66a548", "#629c41"]       # round 43: zone lawns get the grass texture, tinted (flat colour read as fake)
def grass_tints():
    src = Image.open(os.path.join(OUT, "grass.png")).convert("RGB"); px = list(src.getdata()); mr, mg, mb = (sum(p[i] for p in px) / len(px) for i in range(3))
    for h in GRASS_TINTS:
        r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5)); k = (r / mr, g / mg, b / mb)
        im = Image.new("RGB", src.size); im.putdata([tuple(min(255, int(p[i] * k[i])) for i in range(3)) for p in px]); im.save(os.path.join(OUT, f"grass_{h[1:]}.png"), optimize=True)
if __name__ == "__main__":
    grass_tints()
    for k, (t, bg, fg, acc) in SIGNS.items(): make(k, t, bg, fg)
    json.dump({k: dict(text=t, bg=bg, fg=fg, accent=acc) for k, (t, bg, fg, acc) in SIGNS.items()}, open(os.path.join(OUT, "cc_signs.json"), "w"))
    print(len(SIGNS), "signs")
