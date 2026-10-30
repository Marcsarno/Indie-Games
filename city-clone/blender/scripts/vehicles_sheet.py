"""Front three-quarter review tiles of every vehicle (like the concept sheets). blender -b --python scripts/vehicles_sheet.py -> art-review/round19/vehicles_sheet.png"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from vehicles import *; import mood
D = os.path.join(os.path.dirname(__file__), "..", "..", "art-review", "round19"); os.makedirs(D, exist_ok=True); tiles = []
for kind in KINDS:
    reset(); mood.florida(); mood._transform(); g = Builder("ground"); g.box(M("veh_ground", "#d8d6d0"), -30, 30, -30, 30, -.1, 0); g.build()
    make_vehicle(kind, None, "v"); L = SPECS[kind]["L"]; k = max(1.0, L / 4.5) ** .85
    camera((-5.2 * k, 6.5 * k, 3.6 * k), (0, 0, .9), 35); p = os.path.join(D, f"veh_{kind}.png"); render(p, 420, 300, samples=12); tiles.append((kind, p))
raise SystemExit  # stitching is done with system python (Blender has no PIL)
W, H = 420, 300; sheet = Image.new("RGB", (W * 5, H * 3), (240, 240, 238)); d = ImageDraw.Draw(sheet)
for i, (kind, p) in enumerate(tiles):
    im = Image.open(p).convert("RGB"); x, y = (i % 5) * W, (i // 5) * H; sheet.paste(im, (x, y)); d.text((x + 10, y + 8), kind, fill=(20, 20, 20))
sheet.save(os.path.join(D, "vehicles_sheet.png")); print("SHEET")
