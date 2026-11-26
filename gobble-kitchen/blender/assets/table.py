"""Set the Table station: a serving cart with a stack of plates, a cup of forks and a rack of name cards.
Station space: origin on the floor under the cart, x right, y away from the player. Cart top at z = TOP."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

TOP = 0.8
SEATS = 8


def plate_piece():
    def col(co, no):
        rad = math.hypot(co.x, co.y)
        return P.lin('sage') if 0.15 < rad < 0.2 else P.lin('ceramic')
    return sh.lathe([(0, 0), (0.1, 0), (0.13, 0.008), (0.155, 0.018), (0.195, 0.026), (0.2, 0.034), (0.15, 0.026), (0.1, 0.014), (0, 0.014)], segs=32).shade(col)


def fork_piece():
    """Lies flat, tines toward -Y (the direction the sitter faces), origin at its middle."""
    pcs = [sh.tube([(0, 0.13, 0.008), (0, 0.0, 0.008), (0, -0.04, 0.01)], r=[0.011, 0.009, 0.008], segs=8, col='steel'),
           sh.box(0.05, 0.035, 0.012, r=0.005, col='steel').at(0, -0.055, 0.01)]
    for dx in (-0.019, 0.0, 0.019):
        pcs.append(sh.tube([(dx, -0.07, 0.01), (dx, -0.13, 0.012)], r=0.006, segs=6, col='steel'))
    return pcs


def build(out, preview):
    root = C.empty('station_table')
    objs = [root]

    # the cart
    cart = [sh.box(1.3, 0.56, 0.05, r=0.02, seg=3, cell=0.14, col='wood').at(0, 0, TOP - 0.025),
            sh.box(1.2, 0.5, 0.04, r=0.015, col='wood_light').at(0, 0, 0.3),
            sh.tube([(0.67, -0.22, TOP + 0.08), (0.74, -0.22, TOP + 0.1), (0.74, 0.22, TOP + 0.1), (0.67, 0.22, TOP + 0.08)], r=0.018, col='cranberry', segs=8)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            cart.append(sh.box(0.05, 0.05, TOP - 0.1, r=0.015, col='wood_dark').at(0.6 * sx, 0.23 * sy, (TOP - 0.1) / 2 + 0.08))
            cart.append(sh.cyl(0.055, 0.04, bevel=0.012, segs=14, col='ink').rot(90, 0, 0).at(0.6 * sx, 0.23 * sy + 0.02, 0.055))
    # a folded cloth and a small pumpkin on the lower shelf
    cart.append(sh.box(0.4, 0.3, 0.05, r=0.02, col='cranberry').at(-0.3, 0, 0.345))
    cart.append(sh.uvball(0.11, segs=16, rings=10).scale(1, 1, 0.8).shade(lambda c, n: P.mix('pumpkin', 'roast', 0.5 + 0.5 * math.cos(math.atan2(c.y, c.x) * 8))).at(0.3, 0, 0.41))
    cart.append(sh.cyl(0.012, 0.04, bevel=0.004, segs=8, col='green').at(0.3, 0, 0.49))
    cart_ob = C.make('cart', cart, parent=root, shade='lambert')
    objs.append(cart_ob)

    # plates: a stack, each one its own object (plate_0 is on top and goes first)
    px = -0.4
    for i in range(SEATS):
        o = C.make('plate_%d' % i, plate_piece(), loc=(px, 0.0, TOP + 0.024 * (SEATS - 1 - i)), parent=root, shade='toon', outline=(i == 0), normals=False)
        objs.append(o)
    objs.append(C.hit('hit_plates', (px, 0, TOP + 0.12), (0.62, 0.62, 0.42), parent=root))

    # forks standing in a cup, tines up
    fx = 0.08
    cup = C.make('fork_cup', sh.lathe([(0, 0), (0.07, 0), (0.085, 0.16), (0.075, 0.16), (0.062, 0.016), (0, 0.016)], segs=20, r=0.008).shade(
        lambda co, no: P.lin('teal') if co.z < 0.13 and math.hypot(co.x, co.y) > 0.06 else P.lin('ceramic')), loc=(fx, 0.03, TOP), parent=root, shade='toon', outline=True, normals=False)
    objs.append(cup)
    for i in range(SEATS):
        a = 2 * math.pi * i / SEATS
        o = C.make('fork_%d' % i, fork_piece(), loc=(fx + math.cos(a) * 0.03, 0.03 + math.sin(a) * 0.03, TOP + 0.16),
                   rot=(-90 + 12 * math.sin(a), 12 * math.cos(a), 0), parent=root, shade='toon', outline=True)
        objs.append(o)
    objs.append(C.hit('hit_forks', (fx, 0.03, TOP + 0.17), (0.4, 0.4, 0.5), parent=root))

    # name cards in a rack (the game draws each guest's portrait onto 'card_i_face')
    cx = 0.44
    objs.append(C.make('card_rack', sh.box(0.34, 0.22, 0.04, r=0.015, col='wood_dark').at(0, 0, 0.02), loc=(cx, 0.02, TOP), parent=root, shade='toon'))
    for i in range(SEATS):
        o = C.make('card_%d' % i, sh.box(0.26, 0.016, 0.32, r=0.012, seg=2, col='cream').at(0, 0, 0.16), loc=(cx, -0.08 + 0.026 * i, TOP + 0.03), rot=(-8, 0, 0), parent=root, shade='toon', outline=True)
        objs.append(o)
        objs.append(C.empty('card_%d_face' % i, loc=(0, -0.0095, 0.16), parent=o))
    objs.append(C.hit('hit_cards', (cx, 0.02, TOP + 0.2), (0.5, 0.45, 0.5), parent=root))

    objs.append(C.empty('socket_gobbles', loc=(0.0, 0.0, TOP), parent=root))   # replaced in the game by a spot on the table
    C.bake_ao([cart_ob], floor_z=0.0, dist=0.4, strength=0.9)
    for o in objs:
        if o.type == 'MESH' and not o.get('hit') and o is not cart_ob:
            C.bake_ao([o], dist=0.08, strength=0.5)
    C.export_glb(os.path.join(out, 'table.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'table.png'), target=(0, 0, 0.7), dist=3.0, yaw=0, pitch=30)
