"""Tileset de las Ruinas: piedra arenisca gris con musgo."""
from base import *
import piedra as P

PAL = {"st": [(62, 60, 58), (98, 94, 88), (130, 124, 114), (160, 154, 140), (192, 186, 170)],
       "acc": [(62, 90, 50), (96, 128, 62), (138, 166, 84)]}
CLAY = [(104, 54, 38), (148, 82, 54), (188, 118, 74), (220, 158, 106)]


def urn():
    t = tile()
    ellipse(t, 16, 21, 8, 7.5, CLAY)
    rect(t, 13, 10, 19, 14, CLAY[2]); line(t, 19, 10, 19, 14, CLAY[1])
    ellipse(t, 16, 10, 5, 1.8, [CLAY[0], CLAY[3]])
    for x in range(10, 23):
        put(t, x, 19, CLAY[0] if x % 3 else CLAY[3])
    put(t, 12, 17, CLAY[3]); put(t, 11, 18, CLAY[3])
    outline(t)
    ground_shadow(t, 16, 29, 9, 2)
    return t


def tiles():
    csup, cinf = split_tall(P.column(PAL, 3))
    return [
        ("suelo_liso_a", "suelo", False, [P.flagstones(PAL, 101, tones=(1, 2, 2), soft=True)], 33),
        ("suelo_liso_b", "suelo", False, [P.flagstones(PAL, 102, tones=(1, 2, 2), soft=True)], 30),
        ("suelo_grietas", "suelo", False, [P.flagstones(PAL, 103, "grietas", tones=(1, 2, 2), soft=True)], 15),
        ("suelo_musgo", "suelo", False, [P.flagstones(PAL, 104, "acento", tones=(1, 2, 2), soft=True)], 15),
        ("suelo_rota", "suelo", False, [P.flagstones(PAL, 105, "rota", tones=(1, 2, 2), soft=True)], 4),
        ("muro_norte_a", "muro", True, [P.brick_face(PAL, 111)], None),
        ("muro_norte_b", "muro", True, [P.brick_face(PAL, 112)], None),
        ("muro_norte_c", "muro", True, [P.brick_face(PAL, 113, accent=False)], None),
        ("muro_a", "muro", True, [P.cap_blocks(PAL, 121)], None),
        ("muro_b", "muro", True, [P.cap_blocks(PAL, 122)], None),
        ("puerta_norte_abierta", "muro", False, [P.arch_door(PAL, 131)], None),
        ("puerta_norte_cerrada", "muro", True, [P.arch_door(PAL, 131, closed=True)], None),
        ("columna_sup", "dosel", False, [csup], None),
        ("columna_inf", "objeto", True, [cinf], None),
        ("columna_rota", "objeto", True, [P.broken_column(PAL, 5)], None),
        ("escombros", "objeto", True, [P.rubble(PAL, 6)], None),
        ("vasija", "objeto", True, [urn()], None),
        ("barrera_h", "objeto", True, [P.bars_prop()], None),
        ("barrera_v", "objeto", True, [P.bars_prop(True)], None),
    ]
