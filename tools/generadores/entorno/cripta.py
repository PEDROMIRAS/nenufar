"""Tileset de la Cripta: piedra oscura fría, hueso y runas moradas."""
from base import *
import piedra as P

PAL = {"st": [(24, 20, 34), (44, 38, 60), (62, 56, 84), (86, 78, 110), (114, 106, 138)],
       "acc": [(84, 46, 128), (150, 90, 210), (204, 156, 250)]}
BONE = [(126, 116, 98), (170, 160, 136), (214, 206, 184), (238, 232, 214)]
WAX, FL1, FL2, FL3 = (226, 220, 200), (255, 236, 160), (255, 196, 96), (226, 120, 52)
CLOTH = [(70, 30, 84), (104, 48, 124), (140, 72, 160)]
GOLD = [(164, 118, 46), (226, 180, 72)]


def floor(seed, variant="liso"):
    t = P.flagstones(PAL, seed, "grietas" if variant == "grietas" else "liso", size=8)
    r = rng(seed)
    if variant == "huesos":
        for x, y in ((8, 20), (21, 9)):
            rect(t, x, y, x + 5, y, BONE[2]); put(t, x - 1, y - 1, BONE[3]); put(t, x - 1, y + 1, BONE[1])
            put(t, x + 6, y - 1, BONE[3]); put(t, x + 6, y + 1, BONE[1]); rect(t, x, y + 1, x + 5, y + 1, BONE[0])
        ellipse(t, 15, 25, 2.6, 2.3, [BONE[1], BONE[2], BONE[3]])
        put(t, 14, 25, PAL["st"][0]); put(t, 16, 25, PAL["st"][0])
    elif variant == "runa":
        acc = PAL["acc"]
        for a in range(0, 360, 12):
            import math
            x = 16 + 9 * math.cos(math.radians(a)); y = 16 + 9 * math.sin(math.radians(a))
            put(t, x, y, acc[1])
        for (x0, y0, x1, y1) in ((16, 9, 16, 23), (10, 13, 22, 19), (22, 13, 10, 19)):
            line(t, x0, y0, x1, y1, acc[0])
        put(t, 16, 16, acc[2]); put(t, 16, 9, acc[2]); put(t, 16, 23, acc[2])
    return t


def wall_niche(seed):
    t = P.brick_face(PAL, seed, accent=False)
    rect(t, 11, 12, 20, 26, (16, 14, 22))
    for x in range(11, 21):
        put(t, x, 11, PAL["st"][3])
    ellipse(t, 15.5, 21, 3.2, 3, [BONE[1], BONE[2], BONE[3]])
    put(t, 14, 21, (16, 14, 22)); put(t, 17, 21, (16, 14, 22))
    rect(t, 14, 24, 17, 25, BONE[1])
    return t


def wall_banner(seed):
    t = P.brick_face(PAL, seed, accent=False)
    rect(t, 10, 9, 21, 9, GOLD[1])
    for y in range(10, 27):
        for x in range(11, 21):
            put(t, x, y, CLOTH[2] if x < 13 else (CLOTH[1] if x < 19 else CLOTH[0]))
    for x in range(11, 21):
        if (x % 2 == 0):
            put(t, x, 27, CLOTH[0])
    for (x, y) in ((15, 14), (16, 14), (14, 16), (17, 16), (15, 18), (16, 18), (15, 20), (16, 20)):
        put(t, x, y, GOLD[1])
    return t


def tombstone():
    t = tile()
    st = PAL["st"]
    rect(t, 10, 10, 21, 26, st[3]); ellipse(t, 15.5, 11, 6, 4, [st[2], st[3], st[4]])
    line(t, 21, 10, 21, 26, st[1]); line(t, 10, 12, 10, 26, st[4])
    rect(t, 15, 13, 16, 22, st[1]); rect(t, 12, 16, 19, 17, st[1])
    rect(t, 8, 26, 23, 28, st[2]); rect(t, 8, 26, 23, 26, st[4])
    for x in (11, 13, 19):
        put(t, x, 25, PAL["acc"][1])
    outline(t)
    ground_shadow(t, 16, 30, 10, 1.8)
    return t


def sarcophagus():
    t = tile()
    st = PAL["st"]
    rect(t, 6, 16, 25, 27, st[2]); line(t, 25, 16, 25, 27, st[1]); rect(t, 6, 27, 25, 27, st[1])
    rect(t, 5, 8, 26, 15, st[3]); rect(t, 5, 8, 26, 8, st[4]); rect(t, 5, 15, 26, 15, st[1])
    rect(t, 15, 9, 16, 14, GOLD[1]); rect(t, 12, 10, 19, 11, GOLD[1])
    for x in range(8, 24, 4):
        put(t, x, 21, st[1]); put(t, x + 1, 21, st[3])
    outline(t)
    ground_shadow(t, 16, 29, 12, 2)
    return t


def candelabra(frame):
    t = tile()
    rect(t, 15, 12, 16, 27, GOLD[0]); line(t, 15, 12, 15, 27, GOLD[1])
    rect(t, 11, 27, 20, 28, GOLD[0]); rect(t, 11, 27, 20, 27, GOLD[1])
    rect(t, 8, 15, 23, 15, GOLD[1]); rect(t, 8, 16, 23, 16, GOLD[0])
    for x in (8, 15, 22):
        rect(t, x, 9 if x == 15 else 11, x + 1, 14, WAX)
    outline(t)
    for i, x in enumerate((8, 15, 22)):
        top = (9 if x == 15 else 11) - 1
        h = 3 + ((frame + i) % 2)
        for k in range(h):
            put(t, x + (k == h - 1) * ((frame + i) % 2), top - k, FL1 if k == 0 else (FL2 if k < h - 1 else FL3))
            if k == 0:
                put(t, x + 1, top, FL2)
    ground_shadow(t, 16, 29, 7, 1.5)
    return t


def tiles():
    psup, pinf = split_tall(P.column(PAL, 9, accent_band=PAL["acc"]))
    return [
        ("suelo_liso_a", "suelo", False, [floor(201)], 35),
        ("suelo_liso_b", "suelo", False, [floor(202)], 35),
        ("suelo_grietas", "suelo", False, [floor(203, "grietas")], 15),
        ("suelo_huesos", "suelo", False, [floor(204, "huesos")], 5),
        ("suelo_runa", "suelo", False, [floor(205, "runa")], 2),
        ("muro_norte_a", "muro", True, [P.brick_face(PAL, 211, accent=False)], None),
        ("muro_norte_b", "muro", True, [wall_niche(212)], None),
        ("muro_norte_c", "muro", True, [wall_banner(213)], None),
        ("muro_a", "muro", True, [P.cap_blocks(PAL, 221)], None),
        ("muro_b", "muro", True, [P.cap_blocks(PAL, 222)], None),
        ("puerta_norte_abierta", "muro", False, [P.arch_door(PAL, 231, glow=PAL["acc"][1])], None),
        ("puerta_norte_cerrada", "muro", True, [P.arch_door(PAL, 231, closed=True, glow=PAL["acc"][1])], None),
        ("pilar_sup", "dosel", False, [psup], None),
        ("pilar_inf", "objeto", True, [pinf], None),
        ("lapida", "objeto", True, [tombstone()], None),
        ("sarcofago", "objeto", True, [sarcophagus()], None),
        ("candelabro", "objeto", True, [candelabra(0), candelabra(1)], None),
        ("barrera_h", "objeto", True, [P.bars_prop()], None),
        ("barrera_v", "objeto", True, [P.bars_prop(True)], None),
    ]
