"""Parametric car. make_car(kind, color) -> object, +Y forward, origin at ground centre, ~4.5 m long."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

def make_car(kind="sedan", color="#c8201c", name="car"):
    b = Builder(name)
    paint = M("paint_" + color.lstrip("#"), color, rough=0.5)
    glass = M("glass", "#34455a", rough=0.2)
    dark = M("trim_dark", "#1a1a1c"); tire = M("tire", "#141416"); hub = M("hub", "#8a8d92")
    head = M("headlight", "#fff2c8", emit=2.0); tail = M("taillight", "#e01818", emit=1.5); amber = M("indicator", "#ff9a1a", emit=1.2)
    # body: lower shell (hood, doors, trunk)
    b.loft(paint, [(-2.25, .38, .80, .84, .86), (-1.9, .32, .95, .90, .90), (-1.2, .30, .95, .91, .91),
                   (1.0, .30, .93, .91, .91), (1.8, .34, .86, .89, .88), (2.25, .40, .66, .85, .82)])
    # cabin: roof paint, everything else glass
    roof_or_glass = lambda n: paint if n.z > 0.95 else glass
    cab = [(-1.30, .93, .98, .80, .78), (-0.80, .93, 1.40, .84, .70), (0.30, .93, 1.40, .84, .70), (1.05, .93, .94, .86, .82)]
    b.loft(paint, cab, mat_fn=roof_or_glass)
    def hw(y, top):     # cabin half-width at y (bottom or top edge), linear between stations
        for p, q in zip(cab, cab[1:]):
            if p[0] <= y <= q[0]:
                t = (y - p[0]) / (q[0] - p[0]); i = 4 if top else 3
                return p[i] + (q[i] - p[i]) * t
    def zt(y):
        for p, q in zip(cab, cab[1:]):
            if p[0] <= y <= q[0]: return p[2] + (q[2] - p[2]) * (y - p[0]) / (q[0] - p[0])
    for y in (-0.80, -0.15, 0.55):      # paint pillars hugging the slanted glass on both sides
        for s_ in (-1, 1):
            hb, ht, z1 = hw(y, False), hw(y, True), zt(y)
            xb = sorted((s_ * hb, s_ * (hb + .03))); xt = sorted((s_ * ht, s_ * (ht + .03)))
            b.prism(paint, (xb[0], xb[1], y - .05, y + .05), (xt[0], xt[1], y - .05, y + .05), .93, z1)
    # bumpers, grille, lamps
    b.box(dark, -.87, .87, 2.12, 2.30, .34, .56); b.box(dark, -.87, .87, -2.30, -2.12, .34, .56)
    b.box(dark, -.5, .5, 2.20, 2.26, .60, .74)
    for s in (-1, 1):
        b.box(head, s * .55 - .15, s * .55 + .15, 2.17, 2.27, .62, .74)
        b.box(tail, s * .60 - .20, s * .60 + .20, -2.30, -2.20, .70, .84)
        mx = sorted((s * .90, s * 1.04)); b.box(paint, mx[0], mx[1], .80, 1.02, 1.00, 1.10)                        # mirrors
        sx = sorted((s * .905, s * .925)); b.box(dark, sx[0], sx[1], -1.1, 1.0, .58, .62)                         # door sill
    # wheels
    for sx in (-1, 1):
        for y in (-1.40, 1.40):
            b.cyl(tire, (sx * .80, y, .34), .34, .26, "x", 12); b.cyl(hub, (sx * .80 + sx * .11, y, .34), .17, .06, "x", 8)
    if kind == "taxi":
        sign = M("taxi_sign", "#fff7d0", emit=1.2); b.box(sign, -.36, .36, -.25, .25, 1.40, 1.58); b.box(dark, -.36, .36, -.05, .05, 1.52, 1.58)
        b.box(dark, -.91, .91, -1.1, 1.0, .64, .67)
    o = b.build(bevel=0.04)
    return o

if __name__ == "__main__":
    reset(); world((0.55, 0.6, 0.7), 1.0); sun()
    car = make_car("sedan"); 
    review_sheet("car_sedan", target=(0, 0, 0.7), scale=0.65, ink=False)
