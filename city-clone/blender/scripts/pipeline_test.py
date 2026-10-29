import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from lib import *
reset(); world(); sun()
paint = mat("paint", (0.72, 0.1, 0.1)); glass = mat("glass", (0.12, 0.16, 0.2)); tire = mat("tire", (0.05, 0.05, 0.05))
body = box("body", (1.9, 4.2, 0.7), (0, 0, 0.6), paint, bevel=0.08)
cab = box("cab", (1.6, 2.0, 0.6), (0, -0.2, 1.2), glass, bevel=0.1)
parts = [body, cab]
for x in (-0.95, 0.95):
    for y in (-1.4, 1.4):
        parts.append(cyl("wheel", 0.38, 0.3, (x, y, 0.38), tire, rot=(0, math.radians(90), 0), verts=10))
car = join(parts, "test_car"); flat(car); outline(car, 0.04)
review_sheet("pipeline_test", target=(0, 0, 0.7), scale=0.7)
print("GLB", export_glb("pipeline_test"))
