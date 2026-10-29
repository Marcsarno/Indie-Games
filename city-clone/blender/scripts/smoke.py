import bpy, sys, os, math
out = os.environ.get("OUT", "/tmp/smoke")
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,1))
bpy.ops.mesh.primitive_uv_sphere_add(location=(3,0,0.8))
cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); bpy.context.scene.collection.objects.link(co)
co.location=(8,-8,7); co.rotation_euler=(math.radians(60),0,math.radians(45)); bpy.context.scene.camera=co
sun = bpy.data.lights.new("s","SUN"); so = bpy.data.objects.new("s", sun); bpy.context.scene.collection.objects.link(so); so.rotation_euler=(0.8,0.2,0.5)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 480, 320
for eng in ("BLENDER_EEVEE_NEXT","BLENDER_WORKBENCH","CYCLES"):
    try:
        sc.render.engine = eng
        if eng=="CYCLES": sc.cycles.samples=8; sc.cycles.device="CPU"
        sc.render.filepath = f"{out}/{eng}.png"
        bpy.ops.render.render(write_still=True)
        print("RENDER_OK", eng, os.path.getsize(sc.render.filepath))
    except Exception as e:
        print("RENDER_FAIL", eng, str(e)[:120])
bpy.ops.export_scene.gltf(filepath=f"{out}/smoke.glb", export_format="GLB")
print("GLB_OK", os.path.getsize(f"{out}/smoke.glb"))
