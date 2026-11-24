"""Woodoo film scene builder for Blender (bpy 5.x, Cycles, headless).

Units are metres. X right, Y depth (back wall at y=0, the kitchen faces -Y), Z up.
"""
import bpy, math, random
from mathutils import Vector, Euler, Quaternion

TEX = "/tmp/claude-0/blend/tex"
FINISH_TINT = {
    "premium-oak": (1.0, 1.0, 1.0),
    "ivory-oak": (1.0, 1.0, 1.0),
    "classic-walnut": (1.0, 1.0, 1.0),
    "iron-black": (1.0, 1.0, 1.0),
    "frosty-white": (1.0, 1.0, 1.0),
}

# ---------------------------------------------------------------- utilities

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def box(name, size, center, mat, col="room", bevel=0.0012, grain=0.0, segs=2):
    sx, sy, sz = size
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    v = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
         (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = center
    coll(col).objects.link(ob)
    if mat:
        me.materials.append(mat)
    if bevel and min(size) > bevel * 2.5:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segs
        m.limit_method = "NONE"
    ob["grain"] = grain
    ob["rand"] = random.random()
    return ob


def cyl(name, r, h, center, mat, col="room", verts=32, axis="Z", r2=None, bevel=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=center)
    ob = bpy.context.object
    ob.name = name
    for c in ob.users_collection:
        c.objects.unlink(ob)
    coll(col).objects.link(ob)
    if axis == "X":
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Y":
        ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth() if False else None
    for p in ob.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    if bevel:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 2
    return ob


def sphere(name, r, center, mat, col="room", seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=center)
    ob = bpy.context.object
    ob.name = name
    for c in ob.users_collection:
        c.objects.unlink(ob)
    coll(col).objects.link(ob)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def parent(children, par):
    """Parent while the pivot is still unrotated: children keep their world placement."""
    from mathutils import Matrix
    inv = Matrix.Translation(-Vector(par.location))
    for c in children:
        if c.parent is not None:
            continue
        c.parent = par
        c.matrix_parent_inverse = inv


def empty(name, loc, col="room"):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    coll(col).objects.link(e)
    return e

# ---------------------------------------------------------------- materials

def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    return m, nt, bsdf


def simple(name, color, rough=0.5, metal=0.0, coat=0.0, aniso=0.0, transmission=0.0, ior=1.45, emission=None, estr=0.0, sss=0.0):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Anisotropic"].default_value = aniso
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["IOR"].default_value = ior
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = estr
    return m


def wood_mat(finish):
    """Real veneer texture, box-projected in object space at true scale. Each part gets its own
    offset so no two doors repeat, and rails turn their grain sideways."""
    m, nt, b = node_mat(f"wood-{finish}")
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    attr_g = N.new("ShaderNodeAttribute"); attr_g.attribute_type = "OBJECT"; attr_g.attribute_name = "grain"
    attr_r = N.new("ShaderNodeAttribute"); attr_r.attribute_type = "OBJECT"; attr_r.attribute_name = "rand"
    # rotated coordinate for horizontal grain: swap x and z
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
    comb = N.new("ShaderNodeCombineXYZ")
    L.new(sep.outputs["Z"], comb.inputs["X"]); L.new(sep.outputs["Y"], comb.inputs["Y"]); L.new(sep.outputs["X"], comb.inputs["Z"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "VECTOR"
    L.new(attr_g.outputs["Fac"], mix.inputs["Factor"]); L.new(tc.outputs["Object"], mix.inputs[4]); L.new(comb.outputs[0], mix.inputs[5])
    # random offset per part
    off = N.new("ShaderNodeVectorMath"); off.operation = "MULTIPLY_ADD"
    off.inputs[1].default_value = (1, 1, 1)
    rv = N.new("ShaderNodeCombineXYZ")
    mulA = N.new("ShaderNodeMath"); mulA.operation = "MULTIPLY"; mulA.inputs[1].default_value = 7.13
    mulB = N.new("ShaderNodeMath"); mulB.operation = "MULTIPLY"; mulB.inputs[1].default_value = 3.71
    L.new(attr_r.outputs["Fac"], mulA.inputs[0]); L.new(attr_r.outputs["Fac"], mulB.inputs[0])
    L.new(mulA.outputs[0], rv.inputs["X"]); L.new(mulB.outputs[0], rv.inputs["Z"]); L.new(mulA.outputs[0], rv.inputs["Y"])
    L.new(mix.outputs[1], off.inputs[0]); L.new(rv.outputs[0], off.inputs[2])
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.25, 1.25, 1.25)
    L.new(off.outputs[0], mp.inputs[0])

    def img(kind, color=True):
        t = N.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(f"{TEX}/{finish}_{kind}.png", check_existing=True)
        t.image.colorspace_settings.name = "sRGB" if color else "Non-Color"
        t.projection = "BOX"; t.projection_blend = 0.15
        L.new(mp.outputs[0], t.inputs[0])
        return t
    d = img("diff"); r = img("rough", False); n = img("nor", False)
    L.new(d.outputs[0], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs[3].default_value = 0.38; rr.inputs[4].default_value = 0.62
    L.new(r.outputs[0], rr.inputs[0]); L.new(rr.outputs[0], b.inputs["Roughness"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.35
    L.new(n.outputs[0], nm.inputs["Color"]); L.new(nm.outputs[0], b.inputs["Normal"])
    b.inputs["Coat Weight"].default_value = 0.12
    b.inputs["Coat Roughness"].default_value = 0.35
    return m


def marble_mat():
    m, nt, b = node_mat("marble")
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.9, 0.9, 0.9)
    L.new(tc.outputs["Object"], mp.inputs[0])
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 1.6; noise.inputs["Detail"].default_value = 9; noise.inputs["Distortion"].default_value = 0.6
    L.new(mp.outputs[0], noise.inputs[0])
    wave = N.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 0.9; wave.inputs["Distortion"].default_value = 9.0
    wave.inputs["Detail"].default_value = 6; wave.inputs["Detail Scale"].default_value = 1.6
    vadd = N.new("ShaderNodeVectorMath"); vadd.operation = "ADD"
    L.new(mp.outputs[0], vadd.inputs[0]); L.new(noise.outputs["Color"], vadd.inputs[1])
    L.new(vadd.outputs[0], wave.inputs[0])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.62, 0.6, 0.57, 1)
    ramp.color_ramp.elements[1].position = 0.2; ramp.color_ramp.elements[1].color = (0.93, 0.92, 0.90, 1)
    e = ramp.color_ramp.elements.new(0.6); e.color = (0.96, 0.955, 0.945, 1)
    L.new(wave.outputs["Fac"], ramp.inputs[0])
    L.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.14
    b.inputs["Coat Weight"].default_value = 0.3
    b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Subsurface Weight"].default_value = 0.05
    return m


def floor_mat():
    """Wide-plank pale oak: the brick texture gives each plank its own patch of the veneer."""
    m, nt, b = node_mat("floor")
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    brick = N.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Mortar Size"].default_value = 0.0018
    brick.inputs["Brick Width"].default_value = 1.6
    brick.inputs["Row Height"].default_value = 0.2
    brick.offset = 0.37; brick.squash = 1.0
    brick.inputs["Color1"].default_value = (0, 0, 0, 1); brick.inputs["Color2"].default_value = (1, 1, 1, 1)
    brick.inputs["Bias"].default_value = 0.0
    # swap so planks run along Y (away from camera)
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
    comb = N.new("ShaderNodeCombineXYZ"); L.new(sep.outputs["Y"], comb.inputs["X"]); L.new(sep.outputs["X"], comb.inputs["Y"])
    L.new(comb.outputs[0], brick.inputs[0])
    off = N.new("ShaderNodeVectorMath"); off.operation = "MULTIPLY_ADD"; off.inputs[1].default_value = (5.3, 9.1, 0)
    L.new(brick.outputs["Color"], off.inputs[0]); L.new(comb.outputs[0], off.inputs[2])
    rot = N.new("ShaderNodeMapping"); rot.inputs["Rotation"].default_value = (0, 0, math.pi / 2); rot.inputs["Scale"].default_value = (1.1, 1.1, 1.1)
    L.new(off.outputs[0], rot.inputs[0])
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(f"{TEX}/ivory-oak_diff.png", check_existing=True)
    L.new(rot.outputs[0], t.inputs[0])
    # warm the pale oak slightly and darken the seams
    hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = 1.35; hsv.inputs["Value"].default_value = 0.92
    L.new(t.outputs[0], hsv.inputs["Color"])
    seam = N.new("ShaderNodeMix"); seam.data_type = "RGBA"; seam.inputs[7].default_value = (0.25, 0.2, 0.15, 1)
    L.new(brick.outputs["Fac"], seam.inputs["Factor"]); L.new(hsv.outputs[0], seam.inputs[6])
    L.new(seam.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Coat Weight"].default_value = 0.1
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.001
    L.new(brick.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], b.inputs["Normal"])
    return m


def plaster_mat():
    m, nt, b = node_mat("plaster")
    N, L = nt.nodes, nt.links
    b.inputs["Base Color"].default_value = (0.86, 0.83, 0.78, 1)
    b.inputs["Roughness"].default_value = 0.9
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 40; noise.inputs["Detail"].default_value = 8
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.04
    L.new(noise.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], b.inputs["Normal"])
    return m


class Mats:
    def __init__(self):
        self.wood = {f: wood_mat(f) for f in ["ivory-oak", "premium-oak", "iron-black", "classic-walnut", "frosty-white"]}
        self.interior = simple("interior", (0.80, 0.74, 0.64), 0.55)
        self.marble = marble_mat()
        self.floor = floor_mat()
        self.plaster = plaster_mat()
        self.steel = simple("steel", (0.78, 0.78, 0.77), 0.22, 1.0, aniso=0.5)
        self.brass = simple("brass", (0.80, 0.60, 0.34), 0.28, 1.0)
        self.iron = simple("iron", (0.03, 0.03, 0.03), 0.55, 0.6)
        self.blackglass = simple("blackglass", (0.01, 0.01, 0.012), 0.05, 0.0, coat=1.0)
        self.glass = simple("glass", (1, 1, 1), 0.02, 0.0, transmission=1.0, ior=1.5)
        self.opal = simple("opal", (0.98, 0.96, 0.92), 0.25, 0.0, transmission=0.6, emission=(1.0, 0.78, 0.5), estr=0.0)
        self.ceramic = simple("ceramic", (0.92, 0.9, 0.86), 0.35, coat=0.6)
        self.stone_vase = simple("stonevase", (0.80, 0.76, 0.70), 0.85)
        self.leaf = simple("leaf", (0.13, 0.2, 0.09), 0.45, sss=0.0)
        self.leaf.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 0.15
        self.stem = simple("stem", (0.22, 0.17, 0.1), 0.7)
        self.lemon = simple("lemon", (0.85, 0.62, 0.08), 0.35, coat=0.3)
        self.board = wood_mat("classic-walnut")
        self.pull = simple("pullblack", (0.02, 0.02, 0.02), 0.38, 0.7)
        self.window = simple("windowframe", (0.025, 0.025, 0.025), 0.4, 0.5)
        self.label = simple("label", (0.95, 0.94, 0.9), 0.8)
        self.bulb = simple("bulb", (1, 1, 1), 0.5, emission=(1.0, 0.72, 0.42), estr=0.0)
        self.warmlight = simple("warmlight", (1, 1, 1), 0.5, emission=(1.0, 0.8, 0.55), estr=0.0)

# ---------------------------------------------------------------- cabinetry

T = 0.019      # door / panel thickness
GAP = 0.002    # the 2 mm reveal
KICK = 0.10    # toe kick height
BASE_H = 0.72  # carcass height
DEPTH = 0.58
CTOP = 0.03


def door(name, w, h, center, wood, style, col="room", hinge="L", rot_open=0.0):
    """A door built at the hinge, so it can swing. Returns the hinge pivot."""
    cx, cy, cz = center
    hx = cx - w / 2 if hinge == "L" else cx + w / 2
    piv = empty(name + "-hinge", (hx, cy, cz), col)
    parts = []
    sgn = 1 if hinge == "L" else -1
    lx = sgn * w / 2  # door centre relative to hinge
    if style == "flat":
        parts.append(box(name, (w, T, h), (hx + lx, cy, cz), wood, col, bevel=0.0015))
    else:
        st = 0.072 if style == "traditional-shaker" else 0.045
        parts.append(box(name + "-sL", (st, T, h), (hx + lx - w / 2 + st / 2, cy, cz), wood, col, 0.0012, 0))
        parts.append(box(name + "-sR", (st, T, h), (hx + lx + w / 2 - st / 2, cy, cz), wood, col, 0.0012, 0))
        parts.append(box(name + "-rT", (w - 2 * st, T, st), (hx + lx, cy, cz + h / 2 - st / 2), wood, col, 0.0012, 1))
        parts.append(box(name + "-rB", (w - 2 * st, T, st), (hx + lx, cy, cz - h / 2 + st / 2), wood, col, 0.0012, 1))
        parts.append(box(name + "-p", (w - 2 * st + 0.002, T * 0.55, h - 2 * st + 0.002), (hx + lx, cy + T * 0.2, cz), wood, col, 0.0008, 0))
    parent(parts, piv)
    piv["open_sign"] = -sgn
    return piv, parts


def pull(name, center, length, mat, col="room", vertical=True):
    cx, cy, cz = center
    a = "Z" if vertical else "X"
    bar = cyl(name, 0.0055, length, (cx, cy - 0.032, cz), mat, col, 24, a)
    so = []
    for s in (-1, 1):
        off = (0, 0, s * (length / 2 - 0.02)) if vertical else (s * (length / 2 - 0.02), 0, 0)
        so.append(cyl(name + f"-so{s}", 0.0045, 0.03, (cx + off[0], cy - 0.016, cz + off[2]), mat, col, 16, "Y"))
    return [bar] + so


def base_cabinet(name, x0, w, y_front, wood, mats, style, col="room", doors=2, drawers=0, door_open=0.0, interior=False, facing=-1, counter=True):
    """Frameless base cabinet. y_front is the plane of the door backs; the box sits behind it
    (facing=-1 means doors face -Y)."""
    objs = []
    d = DEPTH
    yc = y_front - facing * d / 2  # box centre
    z0 = KICK
    # carcass: finished sides, bottom, top rails, back
    objs.append(box(f"{name}-sideL", (T, d, BASE_H), (x0 + T / 2, yc, z0 + BASE_H / 2), wood if not interior else wood, col, 0.0008, 0))
    objs.append(box(f"{name}-sideR", (T, d, BASE_H), (x0 + w - T / 2, yc, z0 + BASE_H / 2), wood, col, 0.0008, 0))
    objs.append(box(f"{name}-bottom", (w - 2 * T, d, T), (x0 + w / 2, yc, z0 + T / 2), mats.interior, col, 0.0006, 1))
    objs.append(box(f"{name}-back", (w - 2 * T, 0.008, BASE_H), (x0 + w / 2, yc - facing * (d / 2 - 0.004), z0 + BASE_H / 2), mats.interior, col, 0, 0))
    objs.append(box(f"{name}-railF", (w - 2 * T, 0.1, T), (x0 + w / 2, y_front - facing * 0.05, z0 + BASE_H - T / 2), mats.interior, col, 0.0006, 1))
    if interior:
        objs.append(box(f"{name}-shelf", (w - 2 * T - 0.004, d - 0.04, T), (x0 + w / 2, yc + 0.01, z0 + BASE_H * 0.5), mats.interior, col, 0.0008, 1))
    # toe kick, recessed 75 mm
    objs.append(box(f"{name}-kick", (w, 0.016, KICK), (x0 + w / 2, y_front - facing * 0.075, KICK / 2), mats.iron, col, 0.0005))
    fronts = []
    yd = y_front + facing * T / 2
    if drawers:
        hs = [0.18, 0.26, BASE_H - 0.18 - 0.26]
        z = z0 + BASE_H
        for i, hh in enumerate(hs):
            hh2 = hh - GAP
            pv, parts = door(f"{name}-dr{i}", w - GAP, hh2, (x0 + w / 2, yd, z - hh / 2), wood, "flat" if style == "flat" else style, col)
            fronts += [pv] + parts
            fronts += pull(f"{name}-drp{i}", (x0 + w / 2, yd, z - hh / 2), min(0.3, w * 0.5), mats.pull, col, vertical=False)
            z -= hh
    else:
        dw = (w - GAP * doors) / doors
        for i in range(doors):
            hinge = "L" if (i == 0) else "R"
            cx = x0 + GAP / 2 + dw / 2 + i * (dw + GAP)
            pv, parts = door(f"{name}-d{i}", dw, BASE_H - GAP, (cx, yd, z0 + BASE_H / 2), wood, style, col, hinge, door_open)
            px = cx + (dw / 2 - 0.045) * (1 if hinge == "L" else -1)
            pp = pull(f"{name}-dp{i}", (px, yd, z0 + BASE_H - 0.2), 0.24, mats.pull, col)
            parent(pp, pv)
            pv.rotation_euler = (0, 0, pv["open_sign"] * door_open)
            fronts += [pv] + parts + pp
    objs += fronts
    if counter:
        objs.append(box(f"{name}-top", (w + 0.0, d + 0.025, CTOP), (x0 + w / 2, yc + facing * 0.0125, z0 + BASE_H + CTOP / 2), mats.marble, col, 0.002, 0, 3))
    return objs


def upper_cabinet(name, x0, w, z0, h, wood, mats, style, col="room", doors=2):
    objs = []
    d = 0.33
    yc = -d / 2
    objs.append(box(f"{name}-body", (w, d, h), (x0 + w / 2, yc, z0 + h / 2), wood, col, 0.0008, 0))
    dw = (w - GAP * doors) / doors
    for i in range(doors):
        hinge = "L" if i == 0 else "R"
        cx = x0 + GAP / 2 + dw / 2 + i * (dw + GAP)
        pv, parts = door(f"{name}-d{i}", dw, h - GAP, (cx, -d - T / 2, z0 + h / 2), wood, style, col, hinge)
        px = cx + (dw / 2 - 0.045) * (1 if hinge == "L" else -1)
        objs += [pv] + parts
        if style != "flat":
            objs += pull(f"{name}-dp{i}", (px, -d - T / 2, z0 + 0.12), 0.14, mats.pull, col)
    return objs


def tall_unit(name, x0, w, wood, mats, style, col="room", h=2.32, split=True):
    objs = [box(f"{name}-body", (w, DEPTH, h), (x0 + w / 2, -DEPTH / 2, KICK + h / 2), wood, col, 0.0008, 0)]
    objs.append(box(f"{name}-kick", (w, 0.016, KICK), (x0 + w / 2, -DEPTH + 0.075, KICK / 2), mats.iron, col, 0.0005))
    hs = [h * 0.62, h * 0.38] if split else [h]
    z = KICK
    for i, hh in enumerate(hs):
        pv, parts = door(f"{name}-d{i}", w - GAP, hh - GAP, (x0 + w / 2, -DEPTH - T / 2, z + hh / 2), wood, style, col, "L")
        px = x0 + w - 0.05
        pp = pull(f"{name}-p{i}", (px, -DEPTH - T / 2, z + (0.45 if i == 0 else 0.22)), 0.42 if i == 0 else 0.28, mats.pull, col)
        objs += [pv] + parts + pp
        z += hh
    return objs

# ---------------------------------------------------------------- appliances and props

def range_unit(x0, w, mats, col="room"):
    objs = []
    yb = -DEPTH / 2
    top = KICK + BASE_H + CTOP
    objs.append(box("range-body", (w, DEPTH - 0.02, top - 0.005), (x0 + w / 2, yb - 0.01, (top - 0.005) / 2), mats.steel, col, 0.003))
    objs.append(box("range-door", (w - 0.03, 0.02, 0.5), (x0 + w / 2, -DEPTH - 0.01, 0.38), mats.steel, col, 0.004))
    objs.append(box("range-window", (w - 0.16, 0.004, 0.26), (x0 + w / 2, -DEPTH - 0.021, 0.36), mats.blackglass, col, 0.002))
    objs += [cyl("range-handle", 0.009, w - 0.12, (x0 + w / 2, -DEPTH - 0.06, 0.6), mats.steel, col, 24, "X")]
    for s in (-1, 1):
        objs.append(cyl(f"range-hso{s}", 0.006, 0.05, (x0 + w / 2 + s * (w / 2 - 0.08), -DEPTH - 0.04, 0.6), mats.steel, col, 16, "Y"))
    objs.append(box("range-panel", (w - 0.01, 0.06, 0.09), (x0 + w / 2, -DEPTH + 0.01, top - 0.08), mats.steel, col, 0.003))
    for i in range(5):
        kx = x0 + 0.1 + i * (w - 0.2) / 4
        objs.append(cyl(f"knob{i}", 0.018, 0.03, (kx, -DEPTH - 0.03, top - 0.08), mats.iron, col, 32, "Y", bevel=0.002))
    # cooktop + cast-iron grates
    objs.append(box("cooktop", (w - 0.01, DEPTH - 0.06, 0.008), (x0 + w / 2, yb, top - 0.004), mats.iron, col, 0.002))
    for gx in (0.25, 0.75):
        cx = x0 + w * gx
        for gz in (0, 1):
            cy = yb + (-0.12 if gz == 0 else 0.12)
            objs.append(cyl(f"burner{gx}{gz}", 0.04, 0.012, (cx, cy, top + 0.006), mats.iron, col, 32))
            for k in range(3):
                objs.append(box(f"grate{gx}{gz}{k}", (0.3, 0.012, 0.018), (cx, cy - 0.09 + k * 0.09, top + 0.018), mats.iron, col, 0.002))
            objs.append(box(f"grateX{gx}{gz}", (0.012, 0.22, 0.018), (cx, cy, top + 0.018), mats.iron, col, 0.002))
    return objs


def hood(x0, w, mats, col="room"):
    cx = x0 + w / 2
    objs = []
    # tapered canopy
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=w * 0.72, radius2=0.2, depth=0.36, location=(cx, -0.26, 1.78))
    ob = bpy.context.object; ob.name = "hood-canopy"; ob.rotation_euler = (0, 0, math.pi / 4)
    ob.scale = (1, 0.62, 1)
    for c in ob.users_collection: c.objects.unlink(ob)
    coll(col).objects.link(ob); ob.data.materials.append(mats.steel)
    m = ob.modifiers.new("bevel", "BEVEL"); m.width = 0.004; m.segments = 2
    objs.append(ob)
    objs.append(box("hood-band", (w + 0.04, 0.5, 0.05), (cx, -0.26, 1.58), mats.steel, col, 0.003))
    objs.append(box("hood-chimney", (0.3, 0.26, 0.8), (cx, -0.14, 2.36), mats.steel, col, 0.003))
    objs.append(box("hood-light", (w * 0.6, 0.2, 0.004), (cx, -0.3, 1.553), mats.warmlight, col, 0))
    return objs


def faucet(x, y, z, mats, col="room"):
    """Brass gooseneck faucet from a bezier curve."""
    cu = bpy.data.curves.new("faucet", "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = 0.011; cu.bevel_resolution = 6
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(2)
    pts = [(x, y, z), (x, y, z + 0.33), (x, y - 0.2, z + 0.2)]
    for p, co in zip(sp.bezier_points, pts):
        p.co = co; p.handle_left_type = p.handle_right_type = "AUTO"
    sp.bezier_points[1].handle_left = (x, y, z + 0.2); sp.bezier_points[1].handle_right = (x, y, z + 0.42)
    sp.bezier_points[1].handle_left_type = sp.bezier_points[1].handle_right_type = "FREE"
    sp.bezier_points[1].handle_right = (x, y - 0.12, z + 0.42)
    ob = bpy.data.objects.new("faucet", cu); coll(col).objects.link(ob); cu.materials.append(mats.brass)
    base = cyl("faucet-base", 0.028, 0.05, (x, y, z + 0.025), mats.brass, col, 32)
    lever = cyl("faucet-lever", 0.006, 0.1, (x + 0.05, y, z + 0.12), mats.brass, col, 16, "X")
    return [ob, base, lever]


def sink(cx, cy, top, mats, col="room"):
    objs = [box("sink-well", (0.62, 0.38, 0.004), (cx, cy, top - 0.2), mats.steel, col, 0)]
    # dark rim shadow line to read as an undermount opening
    objs.append(box("sink-rim", (0.64, 0.40, 0.003), (cx, cy, top + 0.0005), mats.iron, col, 0))
    return objs


def olive_branch(name, base, mats, col, seed=1, height=0.55, lean=(0.0, 0.0)):
    r = random.Random(seed)
    objs = []
    for s in range(5):
        cu = bpy.data.curves.new(f"{name}-s{s}", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.0025; cu.bevel_resolution = 2
        sp = cu.splines.new("NURBS"); n = 5; sp.points.add(n - 1)
        ang = r.uniform(0, math.tau); spread = r.uniform(0.05, 0.22)
        pts = []
        for i in range(n):
            t = i / (n - 1)
            px = base[0] + math.cos(ang) * spread * t ** 1.4 + lean[0] * t
            py = base[1] + math.sin(ang) * spread * t ** 1.4 + lean[1] * t
            pz = base[2] + height * t * r.uniform(0.75, 1.05)
            pts.append((px, py, pz))
            sp.points[i].co = (px, py, pz, 1)
        sp.use_endpoint_u = True; sp.order_u = 3
        ob = bpy.data.objects.new(f"{name}-s{s}", cu); coll(col).objects.link(ob); cu.materials.append(mats.stem)
        objs.append(ob)
        # leaves along the stem
        for k in range(16):
            t = 0.25 + 0.75 * k / 15
            i = min(n - 2, int(t * (n - 1))); f = t * (n - 1) - i
            p = Vector(pts[i]).lerp(Vector(pts[i + 1]), f)
            leaf = sphere(f"{name}-l{s}-{k}", 0.5, p, mats.leaf, col, 8)
            leaf.scale = (0.006, 0.0015, 0.034)
            leaf.rotation_euler = (r.uniform(-1.0, 1.0), r.uniform(-1.2, 1.2), r.uniform(0, math.tau))
            objs.append(leaf)
    return objs


def vase(name, loc, mats, col, h=0.22, r=0.07):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=h, location=(loc[0], loc[1], loc[2] + h / 2))
    ob = bpy.context.object; ob.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    coll(col).objects.link(ob); ob.data.materials.append(mats.stone_vase)
    for p in ob.data.polygons: p.use_smooth = True
    m = ob.modifiers.new("bevel", "BEVEL"); m.width = 0.012; m.segments = 4
    return ob


def pendant(name, x, y, mats, col, drop=1.05, ceiling=2.74):
    z = ceiling - drop
    objs = [cyl(f"{name}-rod", 0.004, drop - 0.1, (x, y, z + (drop - 0.1) / 2 + 0.09), mats.brass, col, 12)]
    objs.append(cyl(f"{name}-canopy", 0.05, 0.02, (x, y, ceiling - 0.01), mats.brass, col, 32))
    objs.append(cyl(f"{name}-cap", 0.025, 0.04, (x, y, z + 0.1), mats.brass, col, 32))
    g = sphere(f"{name}-globe", 0.11, (x, y, z), mats.opal, col, 48)
    objs.append(g)
    return objs


def flatpack_stack(mats, wood, origin, col="flatpack"):
    """Stacked panels of a base cabinet kit, each with a small printed label."""
    ox, oy, oz = origin
    sizes = [(0.9, 0.58), (0.9, 0.58), (0.58, 0.72), (0.58, 0.72), (0.9, 0.72), (0.45, 0.72), (0.45, 0.72), (0.86, 0.1), (0.86, 0.55)]
    objs = []
    z = oz
    r = random.Random(4)
    for i, (a, b) in enumerate(sizes):
        dx = r.uniform(-0.01, 0.01); dy = r.uniform(-0.008, 0.008)
        ob = box(f"fp{i}", (a, b, T), (ox + dx, oy + dy, z + T / 2), wood if i % 3 != 2 else wood, col, 0.0008, 0)
        objs.append(ob)
        lb = box(f"fp{i}-label", (0.06, 0.0005, 0.012), (ox + dx - a / 2 + 0.08, oy + dy - b / 2 - 0.0003, z + T / 2), mats.label, col, 0)
        objs.append(lb)
        z += T + 0.0015
    return objs
