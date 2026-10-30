"""Review renders for lm_retail.py: PALM MARKET + police station side by side on a small lot, ~45 deg views like the concept art.
Run: python3 scripts/tex_retail.py && blender -b --python scripts/lm_retail_sheet.py   -> art-review/round18/{supermarket,police_station}.png (+ *_game.png north-up)"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from kit import *; import mood; import lm_retail as lr

DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art-review", "round18"); os.makedirs(DST, exist_ok=True)
reset(); mood.florida(); mood._transform()
g = Builder("ground"); grass = M("grass", "#5d9a3a", tex="grass", tile=4.0); asph = M("asphalt", "#4b4d50", tex="asphalt", tile=4.0); walk = M("sidewalk", "#b3b0a6", tex="sidewalk", tile=3.0)
g.box(grass, -90, 90, -60, 60, -.3, 0)
SMX, PDX = -32.0, 36.0
g.box(asph, SMX - 30, SMX + 30, -48, -20, 0, .03); g.box(walk, SMX - 25, SMX + 25, -20, 16, 0, .12)          # supermarket lot + walk
g.box(asph, PDX - 22, PDX + 22, -40, -18, 0, .03); g.box(walk, PDX - 17, PDX + 17, -18, 12, 0, .12)          # police lot + walk
g.build()
sm = lr.supermarket("palm_market"); sm.location = (SMX, 0, .12)
pd = lr.police_station("police_station"); pd.location = (PDX, 0, .12)
print("TRIS supermarket", lr.tris(sm), "mats", len(sm.data.materials), [m.name for m in sm.data.materials])
print("TRIS police_station", lr.tris(pd), "mats", len(pd.data.materials), [m.name for m in pd.data.materials])
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
shots = (("supermarket", (SMX, -6, 4), 38, 74, -32), ("police_station", (PDX, -6, 4), 38, 54, -32),
         ("supermarket_game", (SMX, -4, 2), 45, 70, 0), ("police_station_game", (PDX, -4, 2), 45, 52, 0))
for nm, tgt, pitch, dist, yaw in shots:
    if only and nm not in only: continue
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera(tgt, pitch, dist, yaw=yaw); render(os.path.join(DST, nm + ".png"), 1000, 760, samples=20, keep_transform=True)
