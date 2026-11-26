"""Build every model headless:
    blender42 -b --factory-startup -P blender/build_all.py -- --out build/raw [--only potato,kitchen] [--no-preview]
Each asset script starts from an empty scene, builds rounded vertex-coloured meshes, bakes AO into the
vertex colours, exports a GLB and renders a 512 px preview PNG."""
import sys
import os
import json
import importlib
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.stdout.reconfigure(line_buffering=True)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


OUT = os.path.abspath(arg('--out', 'build/raw'))
ONLY = arg('--only')
PREVIEW = '--no-preview' not in argv
ASSETS = ['potato', 'cranberry', 'beans', 'stuffing', 'sweet', 'pie', 'roast', 'table', 'props', 'gobbles', 'guest', 'kitchen']

from lib import palette, common  # noqa: E402

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(HERE, '..', 'src', 'game', 'palette.json'), 'w') as f:
    json.dump(palette.PALETTE, f, indent=2)

for name in ASSETS:
    if ONLY and name not in ONLY.split(','):
        continue
    t = time.time()
    common.reset()
    mod = importlib.import_module('assets.' + name)
    mod.build(OUT, PREVIEW)
    print('== %s done in %.1fs' % (name, time.time() - t))
