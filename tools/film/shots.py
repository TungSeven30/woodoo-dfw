"""Scroll film: one bright room, nine chapters. Renders frames for desktop or phone.
usage: python shots.py -- desktop|phone SPP [first last]"""
import sys, math, os, json
sys.path.insert(0, "/tmp/claude-0/blend")
import bpy
from mathutils import Vector, Matrix, Quaternion
import scene as S
import build as B

VARIANTS = [  # (finish, style, upper)
    ("premium-oak", "slim-shaker", "frosty-white"),
    ("ivory-oak", "flat", "frosty-white"),
    ("iron-black", "traditional-shaker", "iron-black"),
    ("classic-walnut", "flat", "classic-walnut"),
]
HERO_X0, HERO_W, HERO_YF = -0.45, 0.9, -3.4
STACK = Vector((1.15, -3.75, 0.0))


def ss(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerpv(a, b, t):
    return Vector(a).lerp(Vector(b), t)


def bbox_world(objs):
    pts = []
    for o in objs:
        if o.type == "MESH":
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def build_all():
    S.reset()
    import random; random.seed(11)
    m = S.Mats()
    B.world_and_sun()
    B.room(m)
    S.box("wall-R", (0.14, 8.0, 2.74), (3.1, -3.5, 1.37), m.plaster, "room", 0)
    S.box("wall-F", (8.0, 0.14, 2.74), (0, -7.3, 1.37), m.plaster, "room", 0)
    kits = []
    for i, (f, st, up) in enumerate(VARIANTS):
        B.kitchen(m, f, st, col=f"k{i}", upper=up)
        kits.append(S.coll(f"k{i}"))
    B.set_pendants(m, True)
    # hero cabinet: a two-door flat base, no counter, with a shelf
    objs = S.base_cabinet("hero", HERO_X0, HERO_W, HERO_YF, m.wood["premium-oak"], m, "slim-shaker", "hero", doors=2, interior=True, counter=False)
    bpy.context.view_layer.update()
    tops = [o for o in objs if o.parent is None]
    pivots = [o for o in objs if "open_sign" in o.keys()]
    pulls = [o for o in objs if "-dp" in o.name]
    name_order = ["hero-sideL", "hero-bottom", "hero-sideR", "hero-back", "hero-shelf", "hero-railF", "hero-kick", "hero-d0-hinge", "hero-d1-hinge"]
    parts = [bpy.data.objects[n] for n in name_order]
    assert set(parts) == set(tops), (sorted(o.name for o in tops))
    # plates and glasses on the shelf (seen when the doors open)
    plates = []
    sz = S.KICK + S.BASE_H * 0.5 + S.T / 2
    for k in range(5):
        plates.append(S.cyl(f"plate{k}", 0.115, 0.011, (-0.2, -3.1, sz + 0.006 + k * 0.012), m.ceramic, "hero", 48, bevel=0.003))
    for k in range(3):
        plates.append(S.cyl(f"bowl{k}", 0.075, 0.03, (0.15, -3.12, sz + 0.015 + k * 0.03), m.ceramic, "hero", 40, r2=0.09, bevel=0.003))
    for k, gx in enumerate((-0.25, -0.13, 0.0)):
        plates.append(S.cyl(f"glass{k}", 0.035, 0.11, (gx, -3.05, S.KICK + S.T + 0.055), m.glass, "hero", 32))
    for p in plates:
        for mo in p.modifiers:
            mo.segments = 2
    # final and flat (stacked) poses
    info = []
    z = 0.0
    for o in parts:
        grp = [o] + list(o.children)
        lo, hi = bbox_world(grp if o in pivots else [o])
        if o in pivots:
            lo, hi = bbox_world([c for c in o.children if c.name.startswith("hero-d") and "-dp" not in c.name])
        dims = hi - lo
        c = (lo + hi) / 2
        k = min(range(3), key=lambda i: dims[i])
        if k == 0:
            R = Quaternion((0, 1, 0), math.radians(90))
        elif k == 1:
            R = Quaternion((1, 0, 0), math.radians(-90))
        else:
            R = Quaternion()
        th = dims[k]
        info.append(dict(o=o, Mf=o.matrix_world.copy(), c=c, R=R, th=th))
    # stack bottom->top is the reverse of the flight order
    z = 0.0
    for d in reversed(info):
        d["s"] = Vector((STACK.x, STACK.y, z + d["th"] / 2))
        z += d["th"] + 0.0015
    return m, kits, info, pivots, pulls, plates


def place_parts(info, pulls, u):
    """u: 0 stacked flat .. 1 assembled. Each part flies in turn with a small lift."""
    n = len(info)
    for i, d in enumerate(info):
        t0 = i / n * 0.62
        a = ss((u - t0) / 0.38)
        pos = d["s"].lerp(d["c"], a) + Vector((0, 0, math.sin(math.pi * a) * 0.28))
        q = d["R"].slerp(Quaternion(), a)
        M = Matrix.Translation(pos) @ q.to_matrix().to_4x4() @ Matrix.Translation(-d["c"]) @ d["Mf"]
        d["o"].matrix_world = M
    door_done = u >= 0.999
    for p in pulls:
        p.hide_render = not door_done


def set_doors(pivots, ang):
    for pv in pivots:
        e = pv.rotation_euler
        pv.rotation_euler = (e[0], e[1], e[2] + pv["open_sign"] * ang) if False else pv.rotation_euler
    for pv in pivots:
        # rotate about the hinge in world space, from the assembled pose
        Mf = pv["Mf_saved"]
        hinge = Matrix(Mf).to_translation()
        R = Matrix.Rotation(pv["open_sign"] * ang, 4, "Z")
        pv.matrix_world = Matrix.Translation(hinge) @ R @ Matrix.Translation(-hinge) @ Matrix(Mf)


# chapters: (name, frames)
CHAPTERS = [("c0", 6), ("c1", 6), ("c2", 14), ("c3", 6), ("c4", 8), ("c5", 10), ("c6", 12), ("c7", 4), ("c8", 4)]


def shot(ch, t):
    """Return a dict for chapter ch at t in [0,1]."""
    e = ss(t)
    if ch == "c0":
        return dict(pos=lerpv((0.55, -4.55, 0.42), (0.68, -4.42, 0.40), e), tgt=(1.12, -3.78, 0.14), lens=50, focus="stack", f=2.8, u=0.0, door=0, kit=0, hero=True)
    if ch == "c1":
        return dict(pos=lerpv((0.70, -4.30, 0.33), (0.05, -5.15, 1.05), e), tgt=lerpv((1.15, -3.78, 0.15), (0.75, -3.5, 0.25), e), lens=55 - 17 * e, focus="stack", f=2.8, u=0.0, door=0, kit=0, hero=True)
    if ch == "c2":
        return dict(pos=lerpv((0.05, -5.15, 1.05), (0.95, -5.05, 1.0), e), tgt=lerpv((0.75, -3.5, 0.25), (0.25, -3.25, 0.4), e), lens=38, focus="mid", f=3.5, u=t, door=0, kit=0, hero=True)
    if ch == "c3":
        return dict(pos=lerpv((0.055, -3.53, 0.70), (0.045, -3.53, 0.40), e), tgt=lerpv((0.0, -3.405, 0.64), (0.0, -3.405, 0.36), e), lens=85, focus="gap", f=11.0, u=1.0, door=0, kit=0, hero=True)
    if ch == "c4":
        return dict(pos=lerpv((0.35, -4.55, 0.95), (0.25, -4.25, 0.85), e), tgt=(0.0, -3.1, 0.45), lens=40, focus="hero", f=2.8, u=1.0, door=math.radians(115) * ss(t * 1.25), kit=0, hero=True)
    if ch == "c5":
        return dict(pos=lerpv((0.05, -3.55, 0.62), (2.1, -5.4, 1.5), e), tgt=lerpv((0.05, -2.3, 0.48), (-0.5, -0.7, 1.0), e), lens=34 - 6 * e, focus=None, u=1.0, door=0, kit=0, hero=False)
    if ch == "c6":
        k = min(3, int(t * 4 - 1e-6)) if t > 0 else 0
        return dict(pos=lerpv((2.3, -5.3, 1.45), (1.0, -5.7, 1.5), t), tgt=lerpv((-0.4, -0.7, 1.0), (-0.3, -0.7, 1.0), t), lens=28, focus=None, u=1.0, door=0, kit=k, hero=False)
    if ch == "c7":
        return dict(pos=lerpv((-1.2, -5.2, 1.35), (-1.0, -5.0, 1.32), e), tgt=(0.3, -0.8, 1.0), lens=27, focus=None, u=1.0, door=0, kit=0, hero=False)
    if ch == "c8":
        return dict(pos=lerpv((-1.68, -3.55, 1.25), (-1.68, -3.3, 1.25), e), tgt=(-1.68, -0.6, 1.25), lens=30, focus=None, u=1.0, door=0, kit=0, hero=False)


def frame_list():
    out = []
    for ch, n in CHAPTERS:
        for i in range(n):
            t = i / (n - 1) if ch != "c6" else (i + 0.5) / n
            out.append((ch, i, t))
    return out


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    mode, spp = argv[0], int(argv[1])
    frames = frame_list()
    first, last = (int(argv[2]), int(argv[3])) if len(argv) > 3 else (0, len(frames) - 1)
    m, kits, info, pivots, pulls, plates = build_all()
    for pv in pivots:
        pv["Mf_saved"] = [list(r) for r in pv.matrix_world]
    W, H = {"desktop": (1600, 900), "phone": (810, 1440), "preview": (640, 360), "pphone": (324, 576)}[mode]
    B.set_render(W, H, spp)
    cam = B.camera()
    cam.data.sensor_fit = "HORIZONTAL"
    outdir = f"/tmp/claude-0/film/{mode}"
    os.makedirs(outdir, exist_ok=True)
    hero_col = S.coll("hero")
    hero_c = Vector((0, -3.11, 0.46))
    import time
    idxs = [int(x) for x in os.environ["PICK"].split(",")] if os.environ.get("PICK") else range(first, last + 1)
    for idx in idxs:
        ch, i, t = frames[idx]
        fn = f"{outdir}/f{idx:03d}.png"
        if os.path.exists(fn):
            continue
        s = shot(ch, t)
        for k, c in enumerate(kits):
            c.hide_render = k != s["kit"]
        hero_col.hide_render = not s["hero"]
        place_parts(info, pulls, s["u"])
        set_doors(pivots, s["door"]) if s["u"] >= 1 else None
        for p in plates:
            p.hide_render = not (ch == "c4")
        PF = {"c0": 1.15, "c1": 1.2, "c2": 1.25, "c3": 1.0, "c4": 1.2, "c5": 1.35, "c6": 1.4, "c7": 1.4, "c8": 1.2}
        lens = s["lens"] if mode in ("desktop", "preview") else s["lens"] * PF[ch]
        f = s.get("focus")
        if f == "stack":
            f = (Vector(s["pos"]) - (STACK + Vector((0, 0, 0.16)))).length
        elif f == "hero":
            f = (Vector(s["pos"]) - (hero_c + Vector((0, -0.3, 0)))).length
        elif f == "gap":
            f = (Vector(s["pos"]) - Vector(s["tgt"])).length
        elif f == "mid":
            f = (Vector(s["pos"]) - Vector((0.6, -3.5, 0.3))).length
        B.aim(cam, tuple(s["pos"]), tuple(s["tgt"]), lens=lens, focus=f, fstop=s.get("f"))
        bpy.context.scene.render.filepath = fn
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print("FRAME", idx, ch, i, round(time.time() - t0, 1), flush=True)


if __name__ == "__main__":
    main()
