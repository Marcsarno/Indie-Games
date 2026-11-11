"""The warrior (plate, great helm, sword, kite shield): model, rig, clips, review sheet, glb.
Run: blender -b --python scripts/warrior.py   (NORENDER=1 skips the review renders)"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

def build():
    P = Parts("warrior")
    steel = mat("steel", (0.66, 0.70, 0.78), rough=0.45, metal=0.7)
    dark = mat("steel_dark", (0.36, 0.40, 0.50), rough=0.5, metal=0.6)
    gold = mat("gold", (0.95, 0.70, 0.22), rough=0.35, metal=0.85)
    red = mat("red", (0.72, 0.13, 0.10), rough=0.6)
    green = mat("green", (0.24, 0.42, 0.22), rough=0.9)
    leather = mat("leather", (0.30, 0.20, 0.13), rough=0.85)
    blade = mat("blade", (0.86, 0.89, 0.94), rough=0.4, metal=0.6)
    black = mat("black", (0.03, 0.03, 0.045), rough=0.9)

    # ---- legs
    for s, L in ((1, "L"), (-1, "R")):
        x = 0.135 * s
        P.caps((x, 0, 0.50), (x * 1.04, 0, 0.30), 0.105, 0.09, dark, "leg" + L)
        P.ell((x * 1.04, -0.02, 0.29), (0.092, 0.10, 0.085), steel, "shin" + L)                    # knee cop
        P.caps((x * 1.04, 0, 0.27), (x * 1.04, 0, 0.11), 0.098, 0.088, steel, "shin" + L)           # greave
        P.ell((x * 1.04, -0.055, 0.06), (0.098, 0.155, 0.062), dark, "foot" + L)                   # sabaton
        P.lathe((x * 1.04, 0, 0.085), (x * 1.04, 0, 0.115), [(0, 0.094), (0.015, 0.1), (0.03, 0.094)], gold, "shin" + L, seg=12)   # ankle band
    # ---- hips: tassets flare over the thighs, belt, tabard
    P.lathe((0, 0, 0.66), (0, 0, 0.40), [(0, 0.20), (0.06, 0.245), (0.2, 0.285), (0.25, 0.275), (0.26, 0.20)], steel, "pelvis", seg=16, sy=0.80)
    P.lathe((0, 0, 0.615), (0, 0, 0.675), [(0, 0.238), (0.012, 0.25), (0.048, 0.25), (0.06, 0.238)], leather, "pelvis", seg=16, sy=0.80)
    P.box((0, -0.205, 0.645), (0.085, 0.03, 0.075), gold, "pelvis", bevel=0.012)                    # buckle
    tab = lambda s: 0.105 - 0.02 * s
    P.panel((0, -0.215, 0.62), (1, 0, 0), (0, 0.22, 1), tab, 0, 1, 0.27, green, "pelvis", curve=0.8, double=True)
    P.panel((0, 0.215, 0.62), (-1, 0, 0), (0, -0.22, 1), tab, 0, 1, 0.27, green, "pelvis", curve=0.8, double=True)
    # ---- torso: breastplate with a centre ridge, gorget
    P.ell((0, 0.005, 0.80), (0.265, 0.215, 0.215), steel, "torso", seg=16)
    P.ell((0, -0.03, 0.80), (0.20, 0.20, 0.17), steel, "torso", seg=16)
    P.lathe((0, 0, 0.94), (0, 0, 1.03), [(0, 0.16), (0.03, 0.175), (0.07, 0.15), (0.09, 0.12)], dark, "torso", seg=14)   # gorget
    P.lathe((0, 0, 0.675), (0, 0, 0.705), [(0, 0.245), (0.015, 0.252), (0.03, 0.245)], gold, "torso", seg=16, sy=0.80)   # trim under the breastplate
    # ---- arms
    for s, L in ((1, "L"), (-1, "R")):
        P.ell((0.305 * s, 0, 0.935), (0.175, 0.17, 0.15), steel, "arm" + L, seg=14)                  # pauldron
        P.lathe((0.305 * s, 0, 0.845), (0.305 * s, 0, 0.875), [(0, 0.165), (0.015, 0.172), (0.03, 0.165)], gold, "arm" + L, seg=14, sy=0.97)
        P.caps((0.325 * s, 0, 0.86), (0.345 * s, 0, 0.70), 0.078, 0.072, dark, "arm" + L)
        P.ell((0.348 * s, 0.005, 0.695), (0.082, 0.09, 0.08), steel, "fore" + L)                    # elbow cop
        P.caps((0.348 * s, -0.005, 0.67), (0.352 * s, -0.02, 0.54), 0.078, 0.092, steel, "fore" + L)  # gauntlet
        P.ell((0.352 * s, -0.03, 0.475), (0.078, 0.082, 0.075), dark, "hand" + L)
    # ---- great helm: barrel with a pointed crown, brow band, eye slit, breaths, nasal ridge
    hz = 1.0
    P.lathe((0, 0, hz), (0, 0, hz + 0.62), [(0, 0), (0.0, 0.215), (0.05, 0.262), (0.16, 0.285), (0.30, 0.28), (0.40, 0.235), (0.48, 0.16), (0.545, 0.085), (0.60, 0.03), (0.63, 0)], steel, "head", seg=18, sy=1.04)
    P.lathe((0, 0, hz + 0.025), (0, 0, hz + 0.075), [(0, 0.243), (0.012, 0.268), (0.05, 0.283)], gold, "head", seg=18, sy=1.04)   # base rim
    P.lathe((0, 0, hz + 0.305), (0, 0, hz + 0.345), [(0, 0.287), (0.012, 0.293), (0.03, 0.283), (0.04, 0.268)], gold, "head", seg=18, sy=1.04)   # brow band
    P.lathe((0, 0, hz + 0.215), (0, 0, hz + 0.275), [(0, 0.2925), (0.06, 0.2925)], black, "head", seg=10, sy=1.04, arc=(212, 328))   # eye slit
    for k in range(3):                                                                                  # breath slots
        for sgn in (-1, 1):
            a0 = 270 + sgn * (12 + k * 13)
            P.lathe((0, 0, hz + 0.09), (0, 0, hz + 0.17), [(0, 0.281), (0.08, 0.2915)], black, "head", seg=2, sy=1.04, arc=(a0 - 2.6, a0 + 2.6))
    P.lathe((0, 0, hz + 0.03), (0, 0, hz + 0.36), [(0, 0.262), (0.05, 0.283), (0.16, 0.3), (0.3, 0.297), (0.34, 0.288)], gold, "head", seg=2, sy=1.04, arc=(265.5, 274.5))   # nasal ridge
    # ---- sword in the right hand
    h = V((-0.352, -0.03, 0.475)); d = V((-0.22, -0.62, 0.75)).normalized(); side = d.cross(V((1, 0, 0))).normalized()
    P.caps(h - d * 0.085, h + d * 0.085, 0.024, 0.024, leather, "handR", seg=8)
    P.ell(h - d * 0.12, (0.042, 0.042, 0.042), gold, "handR", seg=10, rings=6)
    P.caps(h + d * 0.105 - side * 0.115, h + d * 0.105 + side * 0.115, 0.024, 0.024, gold, "handR", seg=8)
    P.lathe(h + d * 0.115, h + d * 0.83, [(0, 0), (0.0, 0.9), (0.52, 0.85), (0.64, 0.5), (0.715, 0)], blade, "handR", seg=4, sx=0.066, sy=0.024, smooth=False, up=V((1, 0, 0)))
    # ---- kite shield on the left forearm
    n = V((0.55, -0.83, 0.0)).normalized(); up = V((0, 0, 1)); ax = up.cross(n).normalized()            # across; ax x up must = n
    if ax.cross(up).dot(n) < 0: ax = -ax
    top = V((0.395, -0.115, 0.66)) + n * 0.075 + up * 0.26
    kite = lambda s: 0.215 * (min(1.0, (s + 0.06) * 9) ** 0.5) * (1 - max(0.0, s - 0.28) ** 1.7 * 1.62) ** 0.75 if s < 0.995 else 0.0
    rim = lambda s: kite(max(0, min(1, (s - 0.02) / 0.96))) + 0.024
    P.panel(top + up * 0.012, ax, up, rim, 0, 1, 0.60, gold, "foreL", off=0.0, curve=1.1, rows=14, cols=8, double=True)
    P.panel(top, ax, up, kite, 0.02, 0.955, 0.60, red, "foreL", off=0.012, curve=1.1, rows=14, cols=8)
    P.panel(top, ax, up, lambda s: 0.026, 0.13, 0.80, 0.60, gold, "foreL", off=0.02, curve=1.1, rows=6, cols=2)
    P.panel(top, ax, up, lambda s: 0.135, 0.30, 0.385, 0.60, gold, "foreL", off=0.02, curve=1.1, rows=2, cols=8)
    P.caps((0.36, -0.02, 0.60), V((0.36, -0.02, 0.60)) + n * 0.07, 0.03, 0.03, leather, "foreL", seg=8)   # the strap block behind it

    bones = {"root": (None, (0, 0, 0)), "pelvis": ("root", (0, 0, 0.55)), "torso": ("pelvis", (0, 0, 0.66)), "head": ("torso", (0, 0, 1.0)),
             "armL": ("torso", (0.30, 0, 0.90)), "foreL": ("armL", (0.346, 0, 0.70)), "handL": ("foreL", (0.352, -0.02, 0.52)),
             "armR": ("torso", (-0.30, 0, 0.90)), "foreR": ("armR", (-0.346, 0, 0.70)), "handR": ("foreR", (-0.352, -0.02, 0.52)),
             "legL": ("pelvis", (0.135, 0, 0.50)), "shinL": ("legL", (0.14, 0, 0.29)), "footL": ("shinL", (0.14, 0, 0.09)),
             "legR": ("pelvis", (-0.135, 0, 0.50)), "shinR": ("legR", (-0.14, 0, 0.29)), "footR": ("shinR", (-0.14, 0, 0.09))}
    return P.build(bones)

# ---- clips. Signs: a NEGATIVE x turn swings a hanging limb FORWARD; positive x leans the torso forward; positive z turns to the character's left.
S = math.sin; C = math.cos; TAU = 2 * math.pi
GUARD = {"armR": (-0.25, 0, -0.12), "foreR": (-0.55, 0, 0), "armL": (-0.45, 0, 0.1), "foreL": (-0.75, 0, -0.35), "legL": (-0.08, 0, 0.05), "legR": (0.06, 0, -0.05)}
def idle(t):
    b = S(t * TAU); p = dict(GUARD)
    p["torso"] = (0.04 + 0.025 * b, 0, 0); p["head"] = (-0.03 - 0.02 * b, 0, 0.04 * S(t * TAU * 0.5))
    p["armR"] = (-0.25 + 0.03 * b, 0, -0.12); p["foreR"] = (-0.55 - 0.05 * b, 0, 0); p["foreL"] = (-0.75 + 0.03 * b, 0, -0.35)
    return p, {"pelvis": (0, 0, -0.012 - 0.008 * b)}
def walk(t):
    a = t * TAU; p = {}
    for L, ph in (("L", 0), ("R", math.pi)):
        sw = S(a + ph)
        p["leg" + L] = (-0.62 * sw, 0, 0); p["shin" + L] = (0.95 * max(0.0, S(a + ph - 1.9)) + 0.1, 0, 0); p["foot" + L] = (-0.25 * max(0.0, sw) + 0.2 * max(0.0, -sw), 0, 0)
    p["torso"] = (0.10, 0, 0.10 * S(a)); p["head"] = (-0.06, 0, -0.07 * S(a))
    p["armR"] = (-0.25 - 0.28 * S(a), 0, -0.12); p["foreR"] = (-0.6, 0, 0)
    p["armL"] = (-0.45 + 0.16 * S(a), 0, 0.1); p["foreL"] = (-0.75, 0, -0.35)
    return p, {"pelvis": (0, 0, -0.02 + 0.022 * C(2 * a))}
def run(t):
    a = t * TAU; p = {}
    for L, ph in (("L", 0), ("R", math.pi)):
        sw = S(a + ph)
        p["leg" + L] = (-0.95 * sw - 0.1, 0, 0); p["shin" + L] = (1.45 * max(0.0, S(a + ph - 1.8)) + 0.15, 0, 0); p["foot" + L] = (-0.3 * max(0.0, sw) + 0.35 * max(0.0, -sw), 0, 0)
    p["torso"] = (0.24, 0, 0.16 * S(a)); p["head"] = (-0.16, 0, -0.1 * S(a))
    p["armR"] = (0.15 - 0.5 * S(a), 0, -0.2); p["foreR"] = (-0.9, 0, 0)
    p["armL"] = (-0.5 + 0.3 * S(a), 0, 0.12); p["foreL"] = (-0.85, 0, -0.35)
    return p, {"pelvis": (0, 0, -0.03 + 0.035 * C(2 * a))}
_g = GUARD
attack = keyed([
    (0.00, {**_g, "torso": (0.04, 0, 0)}, {}),
    (0.26, {"torso": (-0.10, 0, -0.50), "head": (0.05, 0, 0.35), "armR": (-2.55, 0, -0.35), "foreR": (-0.75, 0, 0), "armL": (-0.7, 0, 0.25), "foreL": (-0.9, 0, -0.5),   # wind-up: blade back over the shoulder
            "legL": (-0.25, 0, 0), "legR": (0.22, 0, 0), "shinR": (0.25, 0, 0)}, {"pelvis": (0, 0.05, -0.03)}),
    (0.34, {"torso": (-0.12, 0, -0.55), "head": (0.05, 0, 0.38), "armR": (-2.65, 0, -0.38), "foreR": (-0.8, 0, 0), "armL": (-0.7, 0, 0.25), "foreL": (-0.9, 0, -0.5),
            "legL": (-0.28, 0, 0), "legR": (0.22, 0, 0), "shinR": (0.25, 0, 0)}, {"pelvis": (0, 0.055, -0.03)}),
    (0.50, {"torso": (0.38, 0, 0.45), "head": (-0.22, 0, -0.3), "armR": (-0.85, 0, 0.35), "foreR": (-0.1, 0, 0), "armL": (0.1, 0, 0.3), "foreL": (-0.9, 0, -0.2),        # the cut lands
            "legL": (-0.75, 0, 0), "shinL": (0.55, 0, 0), "legR": (0.5, 0, 0), "shinR": (0.2, 0, 0)}, {"pelvis": (0, -0.14, -0.09)}),
    (0.66, {"torso": (0.42, 0, 0.55), "head": (-0.24, 0, -0.35), "armR": (-0.45, 0, 0.5), "foreR": (-0.05, 0, 0), "armL": (0.15, 0, 0.3), "foreL": (-0.9, 0, -0.2),        # follow-through, held
            "legL": (-0.78, 0, 0), "shinL": (0.6, 0, 0), "legR": (0.52, 0, 0), "shinR": (0.2, 0, 0)}, {"pelvis": (0, -0.15, -0.10)}),
    (1.00, {**_g, "torso": (0.04, 0, 0)}, {}),
])
CLIPS = {"idle": (idle, 2.0, True), "walk": (walk, 0.8, True), "run": (run, 0.55, True), "attack": (attack, 0.55, False)}

if __name__ == "__main__":
    reset(); arm, mesh = build()
    print("TRIS", sum(len(p.vertices) - 2 for p in mesh.data.polygons), "VERTS", len(mesh.data.vertices))
    if not os.environ.get("NORENDER"):
        studio()
        for nm, fn, t in (("rest", None, 0), ("idle", idle, 0.2), ("walk", walk, 0.2), ("windup", attack, 0.3), ("cut", attack, 0.5)):
            if fn: apply_pose(arm, fn, t)
            for yaw in (20, 160, 250) if nm in ("rest", "idle") else (20,):
                shot(os.path.join(OUT, f"warrior_{nm}_{yaw}.png"), iso_cam(yaw), (0, 0, 0.78))
        apply_pose(arm, lambda t: ({}, {}), 0)
    bake(arm, CLIPS); export("warrior")
