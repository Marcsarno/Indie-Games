"""Packs the glbs (and today's 2D warrior sprite, if a rig sheet was rendered to REF) into look/models.js."""
import base64, io, os, sys
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, "..", "blender", "out")
b = lambda p: base64.b64encode(open(p, "rb").read()).decode()
ref = ""
sheet = os.environ.get("REF")   # node ../tools/rig-sheet.cjs hero <dir>  ->  <dir>/hero.png
if sheet:
    from PIL import Image
    im = Image.open(sheet).crop((626, 116, 777, 290)); buf = io.BytesIO(); im.save(buf, "PNG")
    ref = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
open(os.path.join(here, "models.js"), "w").write('window.MODELS={warrior:"%s",room:"%s",ref:"%s"};' % (b(os.path.join(out, "warrior.glb")), b(os.path.join(out, "room.glb")), ref))
