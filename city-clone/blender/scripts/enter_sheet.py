import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from character import *; from car import make_car, set_door
reset(); world((0.55, .6, .7), 1.4); sun()
car = make_car("sedan", "#c8201c", "car")
side = {"L": -1, "R": 1}[os.environ.get("SIDE", "L")]
hero = make_character("hero", "#3f6b3a", "#26303f"); hero.scale = (.92, .92, .92)
hero.location = (side * 1.55, .10, 0); hero.rotation_euler = (0, 0, math.radians(90 if side < 0 else -90) * -1)   # forward -> toward the car
tag = "FL" if side < 0 else "FR"
frames = (0, .12, .26, .44, .62, .80, 1.0)
def door_frac(t): return min(1, max(0, (t - .08) / .2)) if t < .85 else min(1, max(0, 1 - (t - .85) / .15))
for i, t in enumerate(frames):
    apply_pose(None, "hero", "enter_" + os.environ.get("SIDE", "L"), t); set_door(car, tag, door_frac(t))
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera((side * .6, .1, .5), 45, 7.5); render(os.path.join(OUT, f"enter{i}_game.png"), 360, 360, samples=12)
    camera((side * 5.5, -5.5, 3.8), (side * .4, .1, .6), 38); render(os.path.join(OUT, f"enter{i}_3q.png"), 360, 360, samples=12)
