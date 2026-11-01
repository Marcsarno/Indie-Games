"""City plan v7 (round 37): the whole city re-laid from the user's description of the real Coconut Creek road grid.
Coordinates in metres: x east, y north, origin = Lyons Rd at the south edge. Run: python3 plan_v7.py -> plan_v7.png
This file is the single source of truth for the new layout; iterate here with the user before any 3D build."""
from PIL import Image, ImageDraw, ImageFont
import os

# ---- arterials (user, round 37) ----
NS = {  # north-south, west to east: x, width (m)
    "State Rd 7 (US 441)": (-250, 22),
    "Lyons Rd": (0, 22),
    "Powerline Rd": (250, 20),
}
EW = [  # east-west, south to north: name, y, x0, x1, width
    ("Coconut Creek Pkwy", 20, -250, 250, 18),
    ("Hammock Blvd", 115, -250, 0, 14),            # only west of Lyons; east of Lyons it becomes the Wynmoore entrance
    ("Copans Rd", 210, -250, 250, 18),
    ("Sample Rd", 320, -250, 250, 22),
    ("Wiles Rd", 430, -250, 250, 16),
    ("Winston Park Blvd", 530, -250, 250, 16),
    ("Hillsboro Blvd", 640, -250, 250, 20),
]
# ---- areas / landmarks ----
ZONES = [  # (label, x0, y0, x1, y1, fill)
    ("WYNMOORE\n(gated community)", 12, 32, 238, 198, "#e9d8a6"),
]
SPOTS = [  # (label, x, y, colour)
    ("PUBLIX", -45, 565, "#2e8b3e"),
    ("POLICE", 70, 235, "#1d3f8a"),
    ("CITY HALL", 140, 235, "#2f6fb3"),
    ("SEMINOLE CASINO", -215, 365, "#c8901e"),
    ("CAR DEALERS", -110, 298, "#8a8f98"),
    ("CAR DEALERS", 120, 298, "#8a8f98"),
    ("GATE", 22, 115, "#d0582a"),
]
RES = [("residential", -125, 480), ("residential", 125, 480), ("residential", 125, 585), ("residential", -125, 160), ("residential", -125, 65)]

S = 1.6; PAD = 70
X0, X1, Y0, Y1 = -300, 300, -20, 680
W, H = int((X1 - X0) * S) + 2 * PAD, int((Y1 - Y0) * S) + 2 * PAD
P = lambda x, y: (PAD + (x - X0) * S, PAD + (Y1 - y) * S)
def font(sz, bold=True):
    try: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
    except OSError: return ImageFont.load_default()

im = Image.new("RGB", (W, H), "#5d9a3a"); d = ImageDraw.Draw(im)
for (lab, x0, y0, x1, y1, col) in ZONES:
    d.rectangle([P(x0, y1), P(x1, y0)], fill=col, outline="#8a6d1f", width=3)
    cx, cy = P((x0 + x1) / 2, (y0 + y1) / 2 + 30); d.multiline_text((cx, cy), lab, fill="#5a4310", font=font(20), anchor="mm", align="center")
for (lab, x, y) in RES:
    cx, cy = P(x, y); d.text((cx, cy), lab, fill="#cfe7b8", font=font(15, False), anchor="mm")
# roads: asphalt, then a centre line
for name, y, x0, x1, w in EW:
    d.line([P(x0, y), P(x1, y)], fill="#3a3c40", width=int(w * S))
for name, (x, w) in NS.items():
    d.line([P(x, Y0 + 10), P(x, Y1 - 15)], fill="#3a3c40", width=int(w * S))
for name, y, x0, x1, w in EW: d.line([P(x0, y), P(x1, y)], fill="#e8c34a", width=2)
for name, (x, w) in NS.items(): d.line([P(x, Y0 + 10), P(x, Y1 - 15)], fill="#e8c34a", width=2)
# Hammock east of Lyons = the Wynmoore entry drive with a gate
d.line([P(0, 115), P(12, 115)], fill="#3a3c40", width=int(10 * S))
# labels
for name, y, x0, x1, w in EW:
    lx, ly = P(x0 + 6, y + w / 2 + 6); d.text((lx, ly), name, fill="white", font=font(17), anchor="ls", stroke_width=3, stroke_fill="#1b1b1b")
for name, (x, w) in NS.items():
    t = Image.new("RGBA", (420, 40), (0, 0, 0, 0)); td = ImageDraw.Draw(t); td.text((210, 20), name, fill="white", font=font(19), anchor="mm", stroke_width=3, stroke_fill="#1b1b1b")
    t = t.rotate(90, expand=True); cx, cy = P(x, 380); im.paste(t, (int(cx - t.width / 2 - w * S / 2 - 16), int(cy - t.height / 2)), t)
for (lab, x, y, col) in SPOTS:
    cx, cy = P(x, y); d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=col, outline="white", width=2)
    d.text((cx + 13, cy), lab, fill="white", font=font(15), anchor="lm", stroke_width=3, stroke_fill="#1b1b1b")
# title, compass, scale
d.text((PAD, 22), "COCONUT CREEK  -  PLAN v7 (draft 1: arterials)", fill="white", font=font(24), stroke_width=3, stroke_fill="#1b1b1b")
nx, ny = W - 50, 40; d.polygon([(nx, ny - 18), (nx - 10, ny + 10), (nx + 10, ny + 10)], fill="white"); d.text((nx, ny + 24), "N", fill="white", font=font(16), anchor="mm")
sx, sy = P(-290, -12); d.line([(sx, sy), (sx + 100 * S, sy)], fill="white", width=4); d.text((sx + 50 * S, sy - 12), "100 m", fill="white", font=font(14), anchor="mm")
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_v7.png")); print(W, H)
