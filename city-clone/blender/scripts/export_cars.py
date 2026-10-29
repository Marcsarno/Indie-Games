import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from car import *
for kind, col in (("sedan", "#c8201c"), ("taxi", "#f2b61c")):
    reset(); make_car(kind, col, "car"); print("GLB", export_glb(f"car_{kind}"))
