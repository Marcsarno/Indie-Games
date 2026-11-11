"""A corner of a crypt room for the look test: flagstones, two brick walls, torches, a barrel.
Run: blender -b --python scripts/room.py"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
random.seed(7)
def join(P, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in P.objs: o.select_set(True)
    bpy.context.view_layer.objects.active = P.objs[0]; bpy.ops.object.join(); bpy.context.object.name = name; return bpy.context.object
reset()
H = 7.0
stones = [mat(f"stone{i}", c, rough=0.95) for i, c in enumerate([(0.36, 0.33, 0.31), (0.41, 0.37, 0.33), (0.31, 0.29, 0.29), (0.45, 0.40, 0.34)])]
bricks = [mat(f"brick{i}", c, rough=0.95) for i, c in enumerate([(0.30, 0.27, 0.27), (0.35, 0.31, 0.29), (0.26, 0.24, 0.25)])]
grout = mat("grout", (0.10, 0.09, 0.09), rough=1)
P = Parts("floor")
P.box((0, 0, -0.06), (2 * H + 0.4, 2 * H + 0.4, 0.1), grout, None)
n = 22; s = 2 * H / n
for i in range(n):
    for j in range(n):
        if random.random() < 0.012: continue
        x = -H + (i + 0.5) * s; y = -H + (j + 0.5) * s
        P.box((x, y, -0.035 + random.uniform(-0.008, 0.01)), (s - 0.035, s - 0.035, 0.09), random.choice(stones), None, bevel=0.022, bseg=1, rot=(random.uniform(-.012, .012), random.uniform(-.012, .012), 0))
join(P, "floor")
W = Parts("wall")
bw, bh, th = 0.62, 0.30, 0.5
for wall in (0, 1):
    for c in range(8):
        off = (c % 2) * bw / 2; k = -1
        while True:
            k += 1; a = -H - 0.3 + off + k * bw
            if a > H + 0.3: break
            z = bh / 2 + c * bh; size = (bw - 0.03, th, bh - 0.03); dpt = random.uniform(-0.02, 0.02)
            if wall == 0: W.box((a, H + th / 2 + dpt, z), size, random.choice(bricks), None, bevel=0.03, bseg=1)
            else: W.box((-H - th / 2 - dpt, a, z), (th, bw - 0.03, bh - 0.03), random.choice(bricks), None, bevel=0.03, bseg=1)
W.box((0, H + th / 2 + 0.03, 1.2), (2 * H + 0.6, th * 0.8, 2.4), grout, None); W.box((-H - th / 2 - 0.03, 0, 1.2), (th * 0.8, 2 * H + 0.6, 2.4), grout, None)
W.box((0, H + th / 2, 8 * bh + 0.06), (2 * H + 1.2, th + 0.12, 0.14), stones[2], None, bevel=0.03, bseg=1); W.box((-H - th / 2, 0, 8 * bh + 0.06), (th + 0.12, 2 * H + 1.2, 0.14), stones[2], None, bevel=0.03, bseg=1)
join(W, "walls")
# torches (an empty marks each flame so the page can put a light there)
iron = mat("iron", (0.12, 0.11, 0.12), rough=0.6, metal=0.6); wood = mat("wood", (0.33, 0.21, 0.12), rough=0.9); flame = mat("flame", (1.0, 0.62, 0.18), emit=4.0)
T = Parts("torch")
for nm, pos, out in (("t0", (-2.2, H, 1.55), V((0, -1, 0))), ("t1", (-H, 1.2, 1.55), V((1, 0, 0)))):
    p = V(pos) + out * 0.05; tip = p + out * 0.28 + V((0, 0, 0.26))
    T.caps(p, p + out * 0.2, 0.03, 0.03, iron, None, seg=8); T.caps(p + out * 0.2, tip, 0.04, 0.055, wood, None, seg=8)
    T.lathe(tip - V((0, 0, 0.03)), tip + V((0, 0, 0.36)), [(0, 0), (0.02, 0.075), (0.1, 0.095), (0.22, 0.055), (0.36, 0)], flame, None, seg=10)
    e = bpy.data.objects.new("light_" + nm, None); bpy.context.scene.collection.objects.link(e); e.location = tip + V((0, 0, 0.18)) + out * 0.1
join(T, "torches")
B = Parts("barrel"); bx, by = -H + 1.3, H - 1.1
B.lathe((bx, by, 0), (bx, by, 1.0), [(0, 0), (0.0, 0.33), (0.25, 0.41), (0.5, 0.43), (0.75, 0.41), (1.0, 0.33), (1.0, 0.0)], wood, None, seg=16)
for z in (0.18, 0.82): B.lathe((bx, by, z - 0.04), (bx, by, z + 0.04), [(0, 0.385 if z < .5 else 0.405), (0.04, 0.41), (0.08, 0.405 if z < .5 else 0.385)], iron, None, seg=16)
join(B, "barrel")
export("room", anim=False)
if not os.environ.get("NORENDER"):
    studio(); shot(os.path.join(OUT, "room.png"), iso_cam(45, 30, 20, (0, 0, 0)), (0, 0, 0.5), ortho=20, w=600, h=600)
