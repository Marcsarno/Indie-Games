"""Blocky pedestrian / hero: rigid parts in a joint hierarchy (no skinning), animated by pose functions, exported with NLA clips.
Faces +Y. Right side = +X. Joint names: pelvis > torso > head, armL/R > foreL/R, legL/R > shinL/R.  ~1.9 m tall; scale 0.92 in the city."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

JOINTS = {  # name: (parent, local offset)
    "pelvis": (None, (0, 0, .90)), "torso": ("pelvis", (0, 0, .10)), "head": ("torso", (0, 0, .56)),
    "armL": ("torso", (-.27, 0, .50)), "foreL": ("armL", (0, 0, -.28)), "armR": ("torso", (.27, 0, .50)), "foreR": ("armR", (0, 0, -.28)),
    "legL": ("pelvis", (-.10, 0, -.10)), "shinL": ("legL", (0, 0, -.40)), "legR": ("pelvis", (.10, 0, -.10)), "shinR": ("legR", (0, 0, -.40)),
}

def make_character(name="ped", jacket="#3f6b3a", pants="#26303f", skin="#d9a577", hair="#1c1612", shoe="#1a1a1c", detail="plain"):
    jk = M("char_jacket", jacket); pt = M("char_pants", pants); sk = M("char_skin", skin); hr = M("char_hair", hair); sh = M("char_shoe", shoe)
    root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
    def part(jn, fn):
        b = Builder(f"{name}.{jn}"); fn(b); o = b.build()
        par, off = JOINTS[jn]; o.parent = bpy.data.objects[f"{name}.{par}"] if par else root; o.location = off; o.rotation_mode = "XYZ"
        o.name = f"{name}.{jn}"; return o
    part("pelvis", lambda b: b.box(pt, -.19, .19, -.11, .11, -.13, .10))
    def torso(b):
        b.box(jk, -.21, .21, -.12, .12, 0, .56)
        b.box(M("char_belt", "#15151a"), -.215, .215, -.125, .125, -.01, .06)
        if detail == "apron": b.box(M("char_apron", "#e8e4da"), -.2, .2, .121, .135, -.05, .45)
        if detail == "suit": b.box(M("char_tie", "#7a1212"), -.035, .035, .121, .135, .1, .5); b.box(M("char_shirt", "#e8e8ea"), -.07, .07, .12, .13, .38, .56)
    part("torso", torso)
    def head(b):
        b.box(sk, -.05, .05, -.05, .05, 0, .09); b.box(sk, -.11, .11, -.11, .11, .09, .33)
        if detail == "cop": b.box(M("char_cap", "#14203f"), -.125, .125, -.125, .125, .27, .37); b.box(M("char_cap", "#14203f"), -.125, .125, .08, .2, .27, .30)
        else: b.box(hr, -.12, .12, -.12, .10, .24, .36); b.box(hr, -.12, .12, -.125, -.04, .09, .30)
        if detail == "shades": b.box(M("char_shades", "#0a0a0c"), -.1, .1, .105, .115, .19, .25)
    part("head", head)
    for s, n in ((-1, "L"), (1, "R")):
        part("arm" + n, lambda b, s=s: b.box(jk, s * .06 - .06, s * .06 + .06, -.065, .065, -.28, .04))
        part("fore" + n, lambda b: (b.box(jk, -.055, .055, -.06, .06, -.26, 0), b.box(sk, -.05, .05, -.055, .055, -.34, -.26)))
        part("leg" + n, lambda b: b.box(pt, -.075, .075, -.08, .08, -.40, 0))
        part("shin" + n, lambda b: (b.box(pt, -.07, .07, -.075, .075, -.36, 0), b.box(sh, -.075, .075, -.10, .17, -.40, -.30)))
    return root

# ---- poses: t in [0,1) -> {joint: (rx, ry, rz)} and pelvis height offset -------------------------------------------------
def _walk(t, amp=1.0, flex=1.0, bob=.025, lean=.0, arm=.5):
    p = 2 * math.pi * t; sw = lambda ph: math.sin(ph)
    pose = {}
    for side, ph in (("L", p), ("R", p + math.pi)):
        pose["leg" + side] = (amp * .55 * sw(ph), 0, 0)
        pose["shin" + side] = (-flex * .9 * max(0, math.cos(ph)) - .05, 0, 0)
        pose["arm" + side] = (-amp * arm * sw(ph), 0, 0); pose["fore" + side] = (.25 + (.35 * amp if arm > .6 else .0), 0, 0)
    pose["pelvis"] = (-lean * .5, 0, .10 * amp * math.sin(p)); pose["torso"] = (-lean * .5, 0, -.14 * amp * math.sin(p)); pose["head"] = (lean * .4, 0, .05 * amp * math.sin(p))   # forward lean = NEGATIVE x
    return pose, bob * amp * math.cos(2 * p)

def walk(t): return _walk(t)
def run(t): return _walk(t, amp=1.5, flex=1.5, bob=.04, lean=.22, arm=.9)
def idle(t):
    s = math.sin(2 * math.pi * t)
    return {"torso": (.015 * s, 0, 0), "head": (-.01 * s, .0, .03 * math.sin(2 * math.pi * t * 2)), "armL": (.03 * s, 0, .05), "armR": (-.03 * s, 0, -.05), "foreL": (.15, 0, 0), "foreR": (.15, 0, 0)}, .004 * s

def punch(t):
    """Right jab: wind-up 0-.22, strike .22-.4, hold to .5, recover to 1."""
    def seg(a, b, u): return a + (b - a) * (u * u * (3 - 2 * u))
    k = [(0, 0), (.22, 1), (.4, 2), (.5, 2), (1.0, 0)]
    cock = {"torso": (0, 0, .45), "armR": (-.5, 0, 0), "foreR": (1.6, 0, 0), "legL": (.35, 0, 0), "legR": (-.3, 0, 0), "armL": (.5, 0, -.1), "foreL": (1.3, 0, 0), "pelvis": (0, 0, .15), "shinR": (-.2, 0, 0)}
    hit = {"torso": (.1, 0, -.55), "armR": (1.45, 0, -.1), "foreR": (.05, 0, 0), "legL": (.6, 0, 0), "legR": (-.4, 0, 0), "armL": (.5, 0, -.1), "foreL": (1.4, 0, 0), "pelvis": (0, 0, -.3), "shinL": (-.25, 0, 0), "shinR": (-.35, 0, 0), "head": (-.05, 0, .2)}
    base = {}
    if t < .22: a, b, u = base, cock, t / .22
    elif t < .4: a, b, u = cock, hit, (t - .22) / .18
    elif t < .5: a, b, u = hit, hit, 0
    else: a, b, u = hit, base, (t - .5) / .5
    keys = set(a) | set(b); z = (0, 0, 0)
    return {j: tuple(seg(a.get(j, z)[i], b.get(j, z)[i], u) for i in range(3)) for j in keys}, -.05 * (1 if .22 <= t < .5 else 0) * min(1, (t - .22) / .1 if t < .32 else 1)

SEAT_DIST = 1.13 / .92      # stand->seat distance in car space (1.55 - 0.42) divided by the 0.92 character scale used in the city
SEAT_DZ = -.44              # pelvis drop when seated

def _smooth(u): return u * u * u * (u * (u * 6 - 15) + 10)
def keyed(keys):
    """keys: [(t, {joint: (rx, ry, rz)}, (dx, dy, dz))] -> pose fn(t). Smootherstep between keys; missing joints are rest."""
    def fn(t):
        t = min(max(t, 0), 1)
        for (t0, p0, o0), (t1, p1, o1) in zip(keys, keys[1:]):
            if t <= t1:
                u = _smooth((t - t0) / (t1 - t0) if t1 > t0 else 1); z3 = (0, 0, 0)
                pose = {j: tuple(p0.get(j, z3)[i] + (p1.get(j, z3)[i] - p0.get(j, z3)[i]) * u for i in range(3)) for j in set(p0) | set(p1)}
                return pose, tuple(o0[i] + (o1[i] - o0[i]) * u for i in range(3))
        return keys[-1][1], keys[-1][2]
    return fn

def enter_keys(side):          # side +1 = right door (turn clockwise to face forward), -1 = left door (counter-clockwise)
    sg = -side; Y = math.pi / 2 * sg                  # Blender: +z yaw is counter-clockwise
    D, DZ = SEAT_DIST, SEAT_DZ
    seated = {"pelvis": (0, 0, Y), "torso": (-.14, 0, 0), "legL": (1.45, 0, 0), "legR": (1.45, 0, 0), "shinL": (-1.45, 0, 0), "shinR": (-1.45, 0, 0),
              "armL": (.95, 0, 0), "armR": (.95, 0, 0), "foreL": (.55, 0, 0), "foreR": (.55, 0, 0), "head": (0, 0, 0)}
    return [(0.00, {}, (0, 0, 0)),
            (0.12, {"armR": (1.15, 0, .1), "foreR": (.25, 0, 0), "torso": (-.05, 0, 0)}, (0, 0, 0)),
            (0.26, {"armR": (.55, 0, .1), "foreR": (.5, 0, 0), "torso": (-.12, 0, 0), "legL": (.25, 0, 0)}, (0, .06 * D, 0)),
            (0.44, {"torso": (-.55, 0, 0), "head": (.35, 0, 0), "pelvis": (0, 0, Y * .28), "legL": (.8, 0, 0), "shinL": (-.7, 0, 0), "legR": (-.2, 0, 0), "armR": (.3, 0, 0), "foreR": (.4, 0, 0), "armL": (.3, 0, 0)}, (0, .45 * D, -.05)),
            (0.62, {"torso": (-.45, 0, 0), "head": (.3, 0, 0), "pelvis": (0, 0, Y * .75), "legL": (1.0, 0, 0), "shinL": (-1.0, 0, 0), "legR": (.7, 0, 0), "shinR": (-.8, 0, 0), "armL": (.6, 0, 0), "armR": (.6, 0, 0), "foreL": (.5, 0, 0), "foreR": (.5, 0, 0)}, (0, .85 * D, DZ * .55)),
            (0.80, seated, (0, D, DZ)),
            (1.00, seated, (0, D, DZ))]

def enter_fn(side): return keyed(enter_keys(side))
def exit_fn(side):
    f = enter_fn(side); return lambda t: f(1 - t)

CLIPS = {"idle": (idle, 48, True), "walk": (walk, 24, True), "run": (run, 16, True), "punch": (punch, 20, False), "enter_L": (enter_fn(-1), 58, False), "enter_R": (enter_fn(1), 58, False), "exit_L": (exit_fn(-1), 58, False), "exit_R": (exit_fn(1), 58, False)}

def apply_pose(root, name, clip, t):
    pose, dz = CLIPS[clip][0](t)
    d3 = dz if isinstance(dz, tuple) else (0, 0, dz)
    for jn, (par, off) in JOINTS.items():
        o = bpy.data.objects[f"{name}.{jn}"]; o.rotation_euler = pose.get(jn, (0, 0, 0))
        o.location = (off[0] + (d3[0] if jn == "pelvis" else 0), off[1] + (d3[1] if jn == "pelvis" else 0), off[2] + (d3[2] if jn == "pelvis" else 0))

def bake_clips(name):
    """Keyframe every clip into per-object actions and stack them as NLA tracks named after the clip (what the glTF exporter groups on)."""
    objs = [bpy.data.objects[f"{name}.{jn}"] for jn in JOINTS]
    for clip, (fn, n, loop) in CLIPS.items():
        for o in objs:
            ad = o.animation_data_create(); act = bpy.data.actions.new(f"{clip}.{o.name}"); ad.action = act
        for f in range(n + (1 if loop else 0)):
            apply_pose(None, name, clip, (f % n) / n if loop else f / (n - 1))
            for o in objs: o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)
        for o in objs:
            ad = o.animation_data; act = ad.action; tr = ad.nla_tracks.new(); tr.name = clip
            st = tr.strips.new(clip, 0, act); ad.action = None
    apply_pose(None, name, "idle", 0)

if __name__ == "__main__":
    reset(); world(); sun()
    root = make_character("hero", "#3f6b3a", "#26303f"); bake_clips("hero")
    p = export_glb("character_test") if False else None
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "character_test.glb"), export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS", export_yup=True)
    print("TRACKS", [t.name for t in bpy.data.objects["hero.pelvis"].animation_data.nla_tracks])
