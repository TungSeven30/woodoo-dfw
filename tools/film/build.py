import sys, math, random
sys.path.insert(0, "/tmp/claude-0/blend")
import bpy
from mathutils import Vector
import scene as S

CEIL = 2.74


def set_render(w, h, samples=48):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 6
    sc.cycles.transparent_max_bounces = 6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.use_persistent_data = True
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    sc.view_settings.exposure = 0.0


def world_and_sun():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world"); sc.world = w; w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    sky = nt.nodes.new("ShaderNodeTexSky")
    try:
        sky.sky_type = "MULTIPLE_SCATTERING"
    except Exception:
        sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(24)
    sky.sun_rotation = math.radians(250)
    sky.sun_disc = False
    nt.links.new(sky.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = 0.22
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 5.0; sun.angle = math.radians(1.2)
    sun.color = (1.0, 0.9, 0.78)
    so = bpy.data.objects.new("sun", sun); S.coll("lights").objects.link(so)
    # from the left (window side), low afternoon sun
    d_from = Vector((-1.0, -0.55, 0.62)).normalized()
    so.rotation_euler = (-d_from).to_track_quat("-Z", "Y").to_euler()
    # bright exterior seen through the window, like a well-exposed interior photo
    ext = bpy.data.materials.new("exterior"); ext.use_nodes = True
    en = ext.node_tree.nodes; en.remove(en["Principled BSDF"])
    em = en.new("ShaderNodeEmission"); em.inputs[0].default_value = (0.93, 0.95, 0.97, 1); em.inputs[1].default_value = 2.2
    ext.node_tree.links.new(em.outputs[0], en["Material Output"].inputs[0])
    eo = S.box("exterior", (0.02, 9, 5), (-6.5, -2.2, 1.8), ext, "lights", 0)
    eo.visible_shadow = False; eo.visible_diffuse = False; eo.visible_glossy = True
    # soft bounce fill from the open camera side
    fill = bpy.data.lights.new("fill", "AREA"); fill.shape = "RECTANGLE"; fill.size = 6; fill.size_y = 2.4
    fill.energy = 260; fill.color = (1.0, 0.95, 0.9)
    fo = bpy.data.objects.new("fill", fill); S.coll("lights").objects.link(fo)
    fo.location = (0.3, -6.5, 1.8); fo.rotation_euler = (math.radians(90), 0, 0)
    return so, fo


def room(m):
    c = "room"
    S.box("floor", (14, 14, 0.02), (0, -3, -0.01), m.floor, c, 0)
    S.box("wall-back", (8, 0.12, CEIL + 0.2), (0, 0.06, (CEIL + 0.2) / 2), m.plaster, c, 0)
    S.box("ceiling", (8, 8, 0.1), (0, -3.5, CEIL + 0.05), m.plaster, c, 0)
    # left wall with a large window opening (y -1.1 .. -3.3, z 0.75 .. 2.45)
    wx = -2.9
    S.box("wall-L-a", (0.14, 1.1, CEIL), (wx, -0.55, CEIL / 2), m.plaster, c, 0)
    S.box("wall-L-b", (0.14, 3.0, CEIL), (wx, -4.8, CEIL / 2), m.plaster, c, 0)
    S.box("wall-L-sill", (0.14, 2.2, 0.75), (wx, -2.2, 0.375), m.plaster, c, 0)
    S.box("wall-L-head", (0.14, 2.2, CEIL - 2.45), (wx, -2.2, 2.45 + (CEIL - 2.45) / 2), m.plaster, c, 0)
    # black steel mullions
    for yy in (-1.1, -1.833, -2.566, -3.3):
        S.box(f"mull-v{yy}", (0.05, 0.035, 1.7), (wx, yy, 1.6), m.window, c, 0.002)
    for zz in (0.75, 1.6, 2.45):
        S.box(f"mull-h{zz}", (0.05, 2.2, 0.035), (wx, -2.2, zz), m.window, c, 0.002)
    S.box("glass", (0.008, 2.2, 1.7), (wx + 0.02, -2.2, 1.6), m.glass, c, 0)
    # baseboard
    S.box("base-back", (8, 0.012, 0.09), (0, -0.006, 0.045), m.plaster, c, 0.001)


def kitchen(m, finish="premium-oak", style="flat", col="kitchen", upper=None):
    wood = m.wood[finish]
    uwood = m.wood[upper or finish]
    objs = []
    # tall fridge column + pantry on the left of the back run
    objs += S.tall_unit("tallA", -2.3, 0.62, wood, m, style, col)
    objs += S.tall_unit("tallB", -1.68, 0.62, wood, m, style, col)
    # back run base cabinets
    x = -1.06
    objs += S.base_cabinet("b1", x, 0.6, -DEPTH(), wood, m, style, col, drawers=3); x += 0.6
    objs += S.base_cabinet("b2", x, 0.4, -DEPTH(), wood, m, style, col, doors=1); x += 0.4
    rx = x
    objs += S.range_unit(x, 0.76, m, col); x += 0.76
    objs += S.base_cabinet("b3", x, 0.6, -DEPTH(), wood, m, style, col, drawers=3); x += 0.6
    objs += S.base_cabinet("b4", x, 0.8, -DEPTH(), wood, m, style, col, doors=2); x += 0.8
    end = x
    # marble backsplash, full height between counter and uppers
    ztop = S.KICK + S.BASE_H + S.CTOP
    objs.append(S.box("splash", (end + 1.06, 0.012, 1.42 - ztop), ((end - 1.06) / 2, -0.006, ztop + (1.42 - ztop) / 2), m.marble, col, 0.001))
    # uppers either side of the hood, stacked to the ceiling with molding
    for (ux, uw, nm) in [(-1.06, 1.0, "u1"), (rx + 0.76, end - rx - 0.76, "u2")]:
        objs += S.upper_cabinet(nm, ux, uw, 1.45, 0.86, uwood, m, style, col)
        objs += S.upper_cabinet(nm + "s", ux, uw, 2.33, 0.33, uwood, m, "flat" if style == "flat" else style, col)
        objs.append(S.box(nm + "-mold", (uw + 0.02, 0.36, 0.076), (ux + uw / 2, -0.18, 2.70), uwood, col, 0.002, 1))
    objs += S.hood(rx, 0.76, m, col)
    # island facing the camera, with sink and faucet
    iy = -1.75
    ix = -1.0
    for i, (w, kind) in enumerate([(0.6, "dr"), (0.9, "d2"), (0.6, "dr")]):
        if kind == "dr":
            objs += S.base_cabinet(f"i{i}", ix, w, iy - DEPTH(), wood, m, style, col, drawers=3, counter=False)
        else:
            objs += S.base_cabinet(f"i{i}", ix, w, iy - DEPTH(), wood, m, style, col, doors=2, counter=False)
        ix += w
    # island back panel (seating side) and one thick marble slab with an overhang
    objs.append(S.box("island-back", (2.1, S.T, S.BASE_H + S.KICK), (0.05, iy + 0.02, (S.BASE_H + S.KICK) / 2), wood, col, 0.001))
    objs.append(S.box("island-top", (2.3, 1.0, 0.04), (0.05, iy - 0.22, S.KICK + S.BASE_H + 0.02), m.marble, col, 0.003, 0, 3))
    # waterfall ends
    for sx in (-1.1, 1.2):
        objs.append(S.box(f"island-fall{sx}", (0.04, 1.0, S.KICK + S.BASE_H), (sx, iy - 0.22, (S.KICK + S.BASE_H) / 2), m.marble, col, 0.003, 0, 3))
    itop = S.KICK + S.BASE_H + 0.04
    objs += S.sink(0.05, iy - 0.3, itop, m, col)
    objs += S.faucet(0.05, iy - 0.1, itop, m, col)
    # styling: olive branches in a stone vase, lemons, a walnut board
    objs.append(S.vase("vase", (-0.75, iy - 0.3, itop), m, col))
    objs += S.olive_branch("olive", (-0.75, iy - 0.3, itop + 0.2), m, col, seed=3, height=0.5, lean=(0.05, -0.04))
    for k, (lx, ly) in enumerate([(0.65, -2.08), (0.71, -2.12), (0.68, -2.02)]):
        objs.append(S.sphere(f"lemon{k}", 0.034, (lx, ly, itop + 0.034), m.lemon, col, 24))
    objs.append(S.box("board", (0.42, 0.26, 0.022), (0.75, -0.3, ztop + 0.011), m.board, col, 0.004))
    objs.append(S.box("board2", (0.3, 0.2, 0.022), (0.78, -0.25, ztop + 0.04), m.board, col, 0.004))
    objs.append(S.vase("jar", (-0.8, -0.25, ztop), m, col, h=0.16, r=0.055))
    # pendants over the island
    for k, px in enumerate((-0.6, 0.05, 0.7)):
        objs += S.pendant(f"pend{k}", px, iy - 0.22, m, col)
    # a stool peeking from the far side
    return objs


def DEPTH():
    return S.DEPTH


def set_pendants(m, on):
    b = m.opal.node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Strength"].default_value = 2.5 if on else 0.0
    m.warmlight.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 3.0 if on else 0.0


def camera(name="cam", lens=32):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.02; cd.clip_end = 60
    ob = bpy.data.objects.new(name, cd); bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def aim(cam, pos, target, lens=None, focus=None, fstop=None):
    cam.location = pos
    d = Vector(target) - Vector(pos)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if lens:
        cam.data.lens = lens
    if focus is not None:
        cam.data.dof.use_dof = True
        cam.data.dof.focus_distance = focus
        cam.data.dof.aperture_fstop = fstop or 2.8
    else:
        cam.data.dof.use_dof = False


def build(finish="premium-oak", style="flat", upper="frosty-white"):
    S.reset()
    random.seed(11)
    m = S.Mats()
    world_and_sun()
    room(m)
    kitchen(m, finish, style, upper=upper)
    set_pendants(m, True)
    return m


if __name__ == "__main__":
    w, h, spp = int(sys.argv[-3]), int(sys.argv[-2]), int(sys.argv[-1])
    m = build()
    set_render(w, h, spp)
    cam = camera()
    aim(cam, (2.1, -5.4, 1.5), (-0.5, -0.7, 1.0), lens=28)
    bpy.context.scene.render.filepath = "/tmp/claude-0/blend/test-kitchen.png"
    import time; t = time.time()
    bpy.ops.render.render(write_still=True)
    print("RENDER_S", round(time.time() - t, 1))
