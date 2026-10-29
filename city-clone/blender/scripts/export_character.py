import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from character import *
reset(); arm = make_skinned("ped", jacket="#3f6b3a", pants="#26303f", detail="plain"); bake_clips_skinned(arm)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "character.glb"), export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS", export_yup=True, export_extras=True, export_skins=True)
print("EXPORTED", len(arm.pose.bones))
