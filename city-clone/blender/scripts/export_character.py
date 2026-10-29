import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from character import *
reset(); make_character("ped", "#3f6b3a", "#26303f", detail="plain"); bake_clips("ped")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "character.glb"), export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS", export_yup=True, export_extras=True)
