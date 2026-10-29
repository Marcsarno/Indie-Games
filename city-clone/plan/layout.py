"""City layout data shared by plan2d.py (the flat plan picture) and blender/scripts/coconut_scene.py (the 3D build). Blender metres, x east, y north.
OUTLINE is the coastline (counter-clockwise control points); EDGES says what each stretch of coast is; MAIN_ROADS are the new arterials/collectors outside the kept 200 m centre."""
OUTLINE = [(120, -196), (196, -172), (198, -104), (166, -62), (140, -30), (186, 8), (198, 78), (172, 132), (160, 188), (104, 196), (74, 156), (36, 128), (-4, 142), (-30, 176), (-70, 192), (-132, 196), (-190, 152), (-198, 76), (-164, 34), (-198, -26), (-188, -92), (-146, -118), (-150, -182), (-64, -196), (-50, -150), (18, -166), (30, -194)]
# (first control index, last control index, kind). kinds: forest, fence, water, highway
EDGES = [(0, 5, "forest"), (5, 8, "fence"), (8, 13, "water"), (13, 16, "forest"), (16, 20, "highway"), (20, 23, "forest"), (23, 27, "water")]
EDGE_COLORS = {"forest": "#2f6f3a", "fence": "#8a6a2a", "water": "#2d78b8", "highway": "#444"}
MAIN_ROADS = {
    "Lyons Rd": dict(pts=[(-150, 160), (-60, 146), (10, 112), (60, 118), (150, 148)], hw=5.0, rank=9, sw=(1, 1)),
    "South Arterial": dict(pts=[(-120, -150), (-60, -134), (30, -122), (110, -128), (186, -140)], hw=5.0, rank=9, sw=(1, 1)),
    "West Collector": dict(pts=[(-134, -96), (-120, -50), (-122, 40), (-130, 110), (-146, 160)], hw=3.5, rank=6, sw=(1, 1)),
    "East Collector": dict(pts=[(118, -150), (122, -80), (116, 10), (124, 100)], hw=3.5, rank=6, sw=(1, 1)),
    "Coast Road NE": dict(pts=[(116, 108), (140, 120), (166, 150)], hw=3.5, rank=6, sw=(1, 1)),
}
