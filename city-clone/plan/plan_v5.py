"""Plan v5 drawings. Run: python3 plan/plan_v5.py  -> art-review/plan/plan_v5_overlay.png (our roads + districts over the reference map) and plan_v5.png (clean plan, metres grid, land-use shares).
Data: plan/map_px.py (pixels) + plan/trace_v5.json (coast + lakes traced from the reference water mask)."""
import os, sys, json, math
from PIL import Image, ImageDraw, ImageFont, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_px as M
HERE = os.path.dirname(os.path.abspath(__file__)); REF = os.path.join(HERE, "..", "art", "coconut-11-map-reference.png"); OUT = os.path.join(HERE, "..", "art-review", "plan"); os.makedirs(OUT, exist_ok=True)
TR = json.load(open(os.path.join(HERE, "trace_v5.json")))
def catmull(pts, closed=False, step=6.0):
    n = len(pts); out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = pts[(i - 1) % n] if (closed or i > 0) else pts[0], pts[i], pts[(i + 1) % n], pts[(i + 2) % n] if (closed or i + 2 < n) else pts[-1]
        k = max(2, int(math.dist(p1, p2) / step))
        for j in range(k):
            t = j / k; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3) for d in (0, 1)))
    if not closed: out.append(pts[-1])
    return out
RANK_COL = {3: "#e84a7a", 10: "#222", 9: "#333", 8: "#444", 6: "#777", 5: "#999"}
def draw_px(d, W, S, F, with_roads=True, label=True, alpha_fill=None):
    pass
def font(sz, bold=False):
    try: return ImageFont.truetype("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", sz)
    except Exception: return ImageFont.load_default()
def overlay(path):
    im = Image.open(REF).convert("RGB"); lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for nm, (cat, col, poly) in M.DISTRICTS.items(): d.polygon(poly, fill=col + "55", outline=col)
    im = Image.alpha_composite(im.convert("RGBA"), lay); d = ImageDraw.Draw(im); F = font(14, True)
    for nm, (rank, hw, pts) in M.ROADS.items():
        c = catmull(pts); d.line(c, fill=(255, 0, 255) if rank >= 8 else (0, 255, 255), width=3 if rank >= 8 else 2, joint="curve")
    for nm, a, b in M.BRIDGES: d.line([a, b], fill=(255, 255, 0), width=6)
    d.line([tuple(p) for p in TR["coast"]] + [tuple(TR["coast"][0])], fill=(255, 128, 0), width=2)
    im.convert("RGB").save(path)
def clean(path):
    S = 3.0; X0, X1, Y0, Y1 = -300, 300, -270, 250; W, H = int((X1 - X0) * S), int((Y1 - Y0) * S)
    def P(x, y): return ((x - X0) * S, (Y1 - y) * S)
    def PX(p): return P(*M.to_m(p))
    img = Image.new("RGB", (W, H), "#2d78b8"); d = ImageDraw.Draw(img); F, F2, F3 = font(15, True), font(12), font(26, True)
    for gx in range(-300, 301, 50): d.line([P(gx, Y0), P(gx, Y1)], fill="#3a86c4", width=1); d.text(P(gx, Y1 - 8), str(gx), fill="#cfe6f7", font=F2)
    for gy in range(-250, 251, 50): d.line([P(X0, gy), P(X1, gy)], fill="#3a86c4", width=1); d.text(P(X0 + 4, gy), str(gy), fill="#cfe6f7", font=F2)
    coast = [PX(p) for p in TR["coast"]]; land = Image.new("L", (W, H), 0); ImageDraw.Draw(land).polygon(coast, fill=255)
    for h in TR["holes"]: ImageDraw.Draw(land).polygon([PX(p) for p in h], fill=0)
    lay = Image.new("RGB", (W, H), "#d9ecc8"); ld = ImageDraw.Draw(lay)
    for nm, (cat, col, poly) in M.DISTRICTS.items(): ld.polygon([PX(p) for p in poly], fill=col, outline="#666")
    img.paste(lay, (0, 0), land); d = ImageDraw.Draw(img)
    d.line(coast + [coast[0]], fill="#e8d8a0", width=3)
    # areas
    tot = sum(1 for v in land.getdata() if v > 127) / (S * S); cats = {}
    for nm, (cat, col, poly) in M.DISTRICTS.items():
        m_ = Image.new("L", (W, H), 0); ImageDraw.Draw(m_).polygon([PX(p) for p in poly], fill=255); a = sum(1 for v in ImageChops.multiply(m_, land).getdata() if v > 127) / (S * S); cats[cat] = cats.get(cat, 0) + a
    for nm, (rank, hw, pts) in M.ROADS.items():
        c = [PX(p) for p in catmull(pts)]; d.line(c, fill="#ffffff", width=max(3, int(hw * 2 * S * .9) + 3), joint="curve"); d.line(c, fill=RANK_COL[rank], width=max(2, int(hw * 2 * S * .9)), joint="curve")
    for nm, a, b in M.BRIDGES: d.line([PX(a), PX(b)], fill="#c9a36a", width=int(7 * S * .9))
    for nm, (cat, col, poly) in M.DISTRICTS.items():
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly); tx, ty = PX((cx, cy))
        lines = nm.replace(" (", "\n(").split("\n")
        for k, ln in enumerate(lines):
            y_ = ty + (k - (len(lines) - 1) / 2) * 14
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)): d.text((tx + ox, y_ + oy), ln, fill="#ffffffdd", font=F2, anchor="mm")
            d.text((tx, y_), ln, fill="#1a1a1a", font=F2, anchor="mm")
    for nm, p in M.LANDMARKS:
        x, y = PX(p); d.ellipse([x - 5, y - 5, x + 5, y + 5], fill="#e22", outline="#fff")
    d.text((20, 14), "Grand Theft Coconut Creek: plan v5 (traced from the reference map, our districts)", fill="#fff", font=F3)
    y_ = 52
    for cat, a in sorted(cats.items(), key=lambda t: -t[1]): d.text((20, y_), f"{cat}: {100 * a / tot:.0f}%", fill="#fff", font=F); y_ += 20
    d.text((20, y_ + 4), f"land {tot / 1000:.0f}k m2, about {(max(p[0] for p in TR['coast']) - min(p[0] for p in TR['coast'])) * M.SCALE:.0f} x {(max(p[1] for p in TR['coast']) - min(p[1] for p in TR['coast'])) * M.SCALE:.0f} m", fill="#fff", font=F)
    img.save(path); return cats, tot
if __name__ == "__main__":
    overlay(os.path.join(OUT, "plan_v5_overlay.png")); c, t = clean(os.path.join(OUT, "plan_v5.png")); print({k: f"{100 * v / t:.0f}%" for k, v in c.items()}, int(t))
