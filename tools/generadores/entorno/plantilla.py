"""Monta salas a partir de plantillas ASCII de 15x11 (diseño de niveles a mano).

Leyenda:
  #  muro (copas / remate)          N  muro norte con cara       D/C  puerta norte abierta/cerrada
  .  suelo                          f  suelo con flores           s    suelo con setas
  :  camino (autotile)              ~  agua (autotile)
  T  árbol   P  pino   r  roca   b  arbusto   o  tocón
  H  hoguera [F]  fuente (3x2: izquierda, centro, derecha)  X  cofre   >  portal
"""
import random
import numpy as np
from PIL import Image
from base import S

PROPS = {"T": "arbol", "P": "pino", "r": "roca", "b": "arbusto", "o": "tocon",
         "H": "hoguera", "[": "fuente_izq", "F": "fuente_cen", "]": "fuente_der", "X": "cofre_cerrado", ">": "portal",
         # Ruinas
         "I": "columna", "i": "columna_rota", "e": "escombros", "v": "vasija",
         # Cripta
         "Y": "pilar", "L": "lapida", "S": "sarcofago", "c": "candelabro"}
BOSQUE_AUTO = {":": "camino", "~": "agua"}
BOSQUE_FLOOR = [("suelo_liso", 85), ("suelo_hierba", 15)]
WALLS = set("#NDC")
LEYENDA = {"#": "muro", "N": "muro_norte", "D": "puerta_norte_abierta", "C": "puerta_norte_cerrada",
           ".": "suelo", "f": "suelo_flores", "s": "suelo_setas",
           ":": "camino de la zona (autotile)", "~": "agua o fosa de la zona (autotile)", ",": "hierba invasora (autotile)",
           **PROPS}


def bits_for(rows, x, y, kinds, link=()):
    h, w = len(rows), len(rows[0])
    b = 0
    for bit, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))):
        nx, ny = x + dx, y + dy
        if not (0 <= nx < w and 0 <= ny < h):
            if x in (0, w - 1) or y in (0, h - 1):
                b |= bit if (dx != 0 and x in (0, w - 1)) or (dy != 0 and y in (0, h - 1)) else 0
            continue
        if rows[ny][nx] in kinds or rows[ny][nx] in link:
            b |= bit
    return b


def render(rows, lk, auto, actors=(), seed=1, frame=0, vignette=True, auto_map=None, floors=None):
    auto_map = auto_map or BOSQUE_AUTO
    floors = floors or BOSQUE_FLOOR
    h, w = len(rows), len(rows[0])
    r = random.Random(seed)
    allt = lk

    def pick(name):
        if name in allt:
            fr = allt[name]
        else:
            fr = allt[r.choice(sorted(k for k in allt if k.startswith(name + "_") and len(k) == len(name) + 2))]
        return fr[frame % len(fr)]

    def floor():
        names, weights = zip(*floors)
        return pick(r.choices(names, weights)[0])

    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 255))
    sprites = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            pos = (x * S, y * S)
            if ch in auto_map:
                link = "D>" if ch == ":" else ""
                img.alpha_composite(auto[f"{auto_map[ch]}_{bits_for(rows, x, y, ch, link)}"], pos)
            elif ch == "f":
                img.alpha_composite(pick("suelo_flores"), pos)
            elif ch == "s":
                img.alpha_composite(pick("suelo_setas"), pos)
            elif ch == "#":
                img.alpha_composite(pick("muro"), pos)
            elif ch == "N":
                img.alpha_composite(pick("muro_norte"), pos)
            elif ch in "DC":
                img.alpha_composite(pick("puerta_norte_abierta" if ch == "D" else "puerta_norte_cerrada"), pos)
            else:
                img.alpha_composite(floor(), pos)
                if ch in PROPS:
                    name = PROPS[ch]
                    if name + "_sup" in allt:
                        im = Image.new("RGBA", (S, 2 * S))
                        im.paste(Image.fromarray(np.asarray(allt[name + "_sup"][0])), (0, 0))
                        im.paste(allt[name + "_inf"][0], (0, S))
                    else:
                        im = pick(name)
                    sprites.append(((y + 1) * S, x * S, im))
    # sombras proyectadas por los muros (luz arriba a la izquierda)
    sh = np.zeros((h * S, w * S), np.float32)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in WALLS:
                continue
            if y > 0 and rows[y - 1][x] in WALLS:
                for k in range(7):
                    sh[y * S + k, x * S:(x + 1) * S] = np.maximum(sh[y * S + k, x * S:(x + 1) * S], 0.38 * (1 - k / 7))
            if x > 0 and rows[y][x - 1] in WALLS:
                for k in range(5):
                    sh[y * S:(y + 1) * S, x * S + k] = np.maximum(sh[y * S:(y + 1) * S, x * S + k], 0.28 * (1 - k / 5))
    arr = np.asarray(img).astype(np.float32)
    arr[:, :, :3] *= (1 - sh)[:, :, None]
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
    # luces: halo cálido de las hogueras y violeta de los portales
    lights = {"H": (np.array([255, 170, 80]), 0.30, 70), ">": (np.array([170, 100, 255]), 0.34, 70),
              "c": (np.array([255, 190, 110]), 0.22, 46)}
    arr = np.asarray(img).astype(np.float32)
    yy, xx = np.mgrid[0:h * S, 0:w * S]
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in lights:
                col, k, rad = lights[ch]
                d = np.sqrt((xx - x * S - 16) ** 2 + (yy - y * S - 20) ** 2) / rad
                a = (np.clip(1 - d, 0, 1) ** 1.5 * k)[:, :, None]
                arr[:, :, :3] = arr[:, :, :3] * (1 - a) + (arr[:, :, :3] * 0.6 + col * 0.6) * a
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
    for px, py, im in actors:
        sprites.append((py + 2, px - 16, im))
    for foot, x, im in sorted(sprites, key=lambda e: e[0]):
        img.alpha_composite(im, (x, foot - im.height))
    if vignette:
        arr = np.asarray(img).astype(np.float32)
        yy, xx = np.mgrid[0:h * S, 0:w * S]
        d = np.sqrt(((xx - w * S / 2) / (w * S / 2)) ** 2 + ((yy - h * S / 2) / (h * S / 2)) ** 2)
        arr[:, :, :3] *= np.clip(1.08 - 0.28 * d ** 2, 0.7, 1)[:, :, None]
        img = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
    return img
