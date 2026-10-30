"""Round 27: dress the backs and sides of big buildings. The game camera now turns with the car, so every face of a building is seen up close.
dress_wall(b, axis, at, out, u0, u1, H, ...) adds to Builder b, on the flat wall at y = at (axis 'y') or x = at (axis 'x') whose outside is the +out direction:
a contrasting base band, pilasters every ~`bay` m, service doors with a small canopy and a light, downspouts, and an optional sign panel (fit-textured, reads correctly from outside)."""
import random
from kit import M


def _box(b, m, axis, at, out, u0, u1, d0, d1, z0, z1):
    """Box on a wall: u along the wall, d outward from the wall face (d0 < d1)."""
    w0, w1 = sorted((at + out * d0, at + out * d1))
    if axis == "y": b.box(m, u0, u1, w0, w1, z0, z1)
    else: b.box(m, w0, w1, u0, u1, z0, z1)


def dress_wall(b, axis, at, out, u0, u1, H, wall_hex="#d8c9a8", base_hex="#9c8f78", trim_hex="#efe4c8", bay=7.0, doors=2, sign=None, sign_w=10.0, sign_h=2.2, sign_z=None, sign_u=None, seed=1, lights=True):
    r = random.Random(seed)
    base = M(f"bk_base_{base_hex[1:]}", base_hex); pil = M(f"bk_pil_{wall_hex[1:]}", wall_hex); trim = M(f"bk_trim_{trim_hex[1:]}", trim_hex)
    door = M("bk_door", "#4c5156"); can = M("bk_canopy", "#3d4246"); lamp = M("bk_lamp", "#ffe2a8", emit=1.2); pipe = M("bk_pipe", "#8d9095")
    L = u1 - u0
    _box(b, base, axis, at, out, u0 - .02, u1 + .02, 0, .06, 0, 1.0)                    # base band
    _box(b, trim, axis, at, out, u0 - .02, u1 + .02, 0, .08, 1.0, 1.12)
    _box(b, trim, axis, at, out, u0 - .02, u1 + .02, 0, .1, H - .6, H - .45)            # upper reveal line
    n = max(1, int(L // bay))
    for k in range(n + 1):                                                              # pilasters
        u = u0 + .4 + k * (L - .8) / n
        _box(b, pil, axis, at, out, u - .35, u + .35, 0, .28, 0, H - .1); _box(b, base, axis, at, out, u - .4, u + .4, 0, .33, 0, 1.0)
    bays = [(u0 + .4 + k * (L - .8) / n, u0 + .4 + (k + 1) * (L - .8) / n) for k in range(n)]
    r.shuffle(bays)
    for (a, c) in bays[:doors]:                                                         # service doors: door, canopy, wall light
        m_ = (a + c) / 2
        _box(b, door, axis, at, out, m_ - .55, m_ + .55, 0, .08, 0, 2.3)
        _box(b, door, axis, at, out, m_ - .7, m_ + .7, 0, .05, 2.3, 2.45)
        _box(b, can, axis, at, out, m_ - 1.1, m_ + 1.1, 0, 1.0, 2.6, 2.72)
        if lights: _box(b, lamp, axis, at, out, m_ - .14, m_ + .14, 0, .18, 2.85, 3.15)
    for (a, c) in bays[doors:doors + 2]:                                                # downspouts
        m_ = a + .9
        _box(b, pipe, axis, at, out, m_ - .08, m_ + .08, .05, .2, 0, H - .2)
    if sign:                                                                            # second sign, centred high on the wall
        z = sign_z if sign_z is not None else H - sign_h - .8; m_ = (u0 + u1) / 2 if sign_u is None else sign_u
        _box(b, trim, axis, at, out, m_ - sign_w / 2 - .15, m_ + sign_w / 2 + .15, 0, .1, z - .15, z + sign_h + .15)
        _box(b, sign, axis, at, out, m_ - sign_w / 2, m_ + sign_w / 2, .1, .16, z, z + sign_h)
