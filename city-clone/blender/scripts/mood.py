"""Lighting moods for review renders. The game page recreates the same values with Three.js lights (and baked shadows later)."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from lib import *

def _transform(look="None"):
    s = bpy.context.scene
    for vt in ("AgX", "Khronos PBR Neutral", "Standard"):
        try: s.view_settings.view_transform = vt; break
        except TypeError: continue
    try: s.view_settings.look = look
    except TypeError: pass

def day():
    world((0.52, 0.58, 0.72), 1.7); sun(energy=3.0, angle_deg=9)

def dusk(lamps=()):
    world((0.10, 0.13, 0.27), 1.2)
    sun(direction=(0.55, -0.45, -0.42), energy=3.4, color=(1.0, 0.58, 0.30), angle_deg=6)
    for i, (x, y, z) in enumerate(lamps):
        l = bpy.data.lights.new(f"lamp{i}", "POINT"); l.energy = 900; l.color = (1.0, 0.76, 0.46); l.shadow_soft_size = .3; l.use_shadow = False
        o = bpy.data.objects.new(f"lamp{i}", l); bpy.context.scene.collection.objects.link(o); o.location = (x, y, z - .3)

def florida():
    """Bright late-afternoon Coconut Creek: blue sky ambient, warm sun low from the north-east (shadows fall to the lower left)."""
    world((0.55, 0.72, 0.95), 1.15)
    sun(direction=(-0.5, -0.45, -0.74), energy=4.2, color=(1.0, 0.92, 0.78), angle_deg=4)

def finish(mood):   # call after the lights exist and before render(); render() would otherwise reset the view transform
    pass
