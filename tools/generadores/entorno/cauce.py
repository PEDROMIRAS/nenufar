"""Tileset del Cauce Seco: santuario de la Orden sobre un lecho de río seco. Muros de obsidiana con matiz
violáceo, suelo de losas agrietadas con guijarros blanqueados y el naranja del fuego como única luz."""
import math

from base import *
import piedra as P

PAL = {"st": [(10, 8, 14), (24, 20, 32), (44, 38, 58), (68, 60, 84), (92, 82, 104)],
       "acc": [(140, 48, 16), (226, 98, 24), (255, 186, 64)]}
# El suelo es un lecho de río: piedra más parda y cálida que la obsidiana violácea de los muros
SUELO = {"st": [(18, 14, 16), (36, 30, 32), (58, 50, 50), (84, 74, 70), (110, 98, 90)], "acc": PAL["acc"]}
GUIJARRO = [(150, 146, 140), (204, 200, 192), (236, 232, 222)]
VACIO = (14, 10, 16)


def _aro(t, cx, cy, radio, color, brillo):
    """Anillo de fuego (la luna falsa de la Orden): `color` en el arco y `brillo` en lo alto."""
    for a in range(0, 360, 15):
        x = cx + radio * math.cos(math.radians(a))
        y = cy + radio * math.sin(math.radians(a))
        put(t, x, y, brillo if math.sin(math.radians(a)) < -0.5 else color)


def floor(seed, variante="liso"):
    t = P.flagstones(SUELO, seed, "grietas" if variante in ("grietas", "brasas") else "liso", size=8)
    r = rng(seed)
    if variante == "guijarros":
        for x, y in ((7, 8), (21, 12), (12, 22), (25, 25)):
            ellipse(t, x, y, 3.2, 2.5, GUIJARRO)
            put(t, x - 1, y - 1, GUIJARRO[2]); put(t, x - 2, y, GUIJARRO[2])
    elif variante == "brasas":
        # Un hilo de brasa que corre por una grieta, con alguna chispa más viva
        x, y = 4, 6
        while x < 28:
            put(t, x, y, PAL["acc"][0] if r.random() < 0.6 else PAL["acc"][1])
            x += 1
            y += r.choice((-1, 0, 0, 1))
            y = max(3, min(28, y))
        put(t, 12, 13, PAL["acc"][2]); put(t, 21, 17, PAL["acc"][2])
    return t


def wall_hornacina(seed):
    """Muro con una hornacina vacía y el aro de fuego dentro."""
    t = P.brick_face(PAL, seed, accent=False)
    rect(t, 11, 12, 20, 26, VACIO)
    for x in range(11, 21):
        put(t, x, 11, PAL["st"][3])
    _aro(t, 15.5, 19, 4.6, PAL["acc"][1], PAL["acc"][2])
    return t


def wall_veta(seed):
    """Muro con una veta de brasa que baja entre los bloques."""
    t = P.brick_face(PAL, seed, accent=False)
    x = 15
    for y in range(5, 28):
        put(t, x, y, PAL["acc"][1] if y % 5 == 0 else PAL["acc"][0])
        if y % 6 == 3:
            x += 1
        elif y % 6 == 0:
            x -= 1
    put(t, 15, 12, PAL["acc"][2]); put(t, 16, 21, PAL["acc"][2])
    return t


def door(seed, closed=False):
    t = P.arch_door(PAL, seed, closed=closed, glow=PAL["acc"][1])
    _aro(t, 15.5, 3.5, 2.6, PAL["acc"][1], PAL["acc"][2])  # la luna falsa sobre el dintel
    return t


def pilar():
    """Columna de obsidiana con una grieta de brasa que la recorre; devuelve (parte de arriba, parte de abajo)."""
    t = P.column(PAL, 309)
    acc = PAL["acc"]
    x = 15
    for y in range(14, 48):
        put(t, x, y, acc[1] if y % 4 == 0 else acc[0])
        if y % 7 == 3:
            x += 1
        elif y % 7 == 0:
            x -= 1
    put(t, 15, 30, acc[2]); put(t, 16, 40, acc[2])
    return split_tall(t)


def roca():
    """Bloque de obsidiana facetado, con una veta de brasa."""
    t, st = tile(), PAL["st"]
    ellipse(t, 16, 20, 11, 8, [st[1], st[2], st[3]])
    for x0, y0, x1, y1 in ((8, 20, 14, 13), (14, 13, 20, 14), (20, 14, 24, 21), (14, 13, 15, 26)):
        line(t, x0, y0, x1, y1, st[1])
    line(t, 10, 17, 15, 12, st[4]); line(t, 15, 12, 20, 13, st[4])
    for k, y in enumerate(range(18, 25)):
        put(t, 17 + (k % 2), y, PAL["acc"][0] if y % 3 else PAL["acc"][1])
    outline(t)
    ground_shadow(t, 16, 29, 12, 2)
    return t


def escombros():
    t = P.rubble(PAL, 308)
    for x, y in ((9, 27), (20, 28), (25, 22)):
        put(t, x, y, PAL["acc"][0])
    return t


HIERRO = [(14, 12, 18), (30, 26, 36), (52, 46, 62), (84, 76, 98)]


def brasero(frame):
    """Cuenco de hierro negro sobre tres patas, con brasas y una llama que cambia entre los dos fotogramas."""
    t = tile()
    acc = PAL["acc"]
    for x0, y0, x1, y1 in ((10, 21, 8, 29), (16, 22, 16, 29), (21, 21, 23, 29)):
        line(t, x0, y0, x1, y1, HIERRO[2])
    rect(t, 9, 16, 22, 21, HIERRO[1]); rect(t, 9, 16, 22, 16, HIERRO[3]); rect(t, 10, 21, 21, 21, HIERRO[0])
    rect(t, 11, 18, 20, 19, HIERRO[2])
    outline(t)
    for x in range(10, 22):
        put(t, x, 15, acc[0] if x % 2 else acc[1])  # el montón de brasas
    alto = (4, 6)[frame]
    for k in range(alto):
        ancho = max(1, 3 - k // 2)
        for dx in range(-ancho, ancho + 1):
            x = 15 + dx + (1 if k >= alto - 2 and frame else 0)
            put(t, x, 14 - k, acc[2] if k < 2 and abs(dx) < 2 else (acc[1] if abs(dx) < ancho else acc[0]))
    ground_shadow(t, 16, 29, 8, 1.5)
    return t


def tiles():
    psup, pinf = pilar()
    return [
        ("suelo_liso_a", "suelo", False, [floor(301)], 35),
        ("suelo_liso_b", "suelo", False, [floor(302)], 35),
        ("suelo_grietas", "suelo", False, [floor(303, "grietas")], 15),
        ("suelo_guijarros", "suelo", False, [floor(304, "guijarros")], 10),
        ("suelo_brasas", "suelo", False, [floor(305, "brasas")], 5),
        ("muro_norte_a", "muro", True, [P.brick_face(PAL, 311, accent=False)], None),
        ("muro_norte_b", "muro", True, [wall_hornacina(312)], None),
        ("muro_norte_c", "muro", True, [wall_veta(313)], None),
        ("muro_a", "muro", True, [P.cap_blocks(PAL, 321)], None),
        ("muro_b", "muro", True, [P.cap_blocks(PAL, 322)], None),
        ("puerta_norte_abierta", "muro", False, [door(331)], None),
        ("puerta_norte_cerrada", "muro", True, [door(331, closed=True)], None),
        ("pilar_sup", "dosel", False, [psup], None),
        ("pilar_inf", "objeto", True, [pinf], None),
        ("roca", "objeto", True, [roca()], None),
        ("columna_rota", "objeto", True, [P.broken_column(PAL, 307)], None),
        ("escombros", "objeto", True, [escombros()], None),
        ("brasero", "objeto", True, [brasero(0), brasero(1)], None),
        ("barrera_h", "objeto", True, [P.bars_prop()], None),
        ("barrera_v", "objeto", True, [P.bars_prop(True)], None),
    ]
