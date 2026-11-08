"""Guardián del Bosque (64x48), jefe de la zona: un gusano-dragón cubierto de musgo y hiedra, con la cabeza
blanca como un cráneo de hueso y crestas verde azuladas. Mira a la izquierda, hacia la heroína.
Su pose sale de la imagen de referencia (la 8) con `reducir.py`; aquí se anima.

Cabe en 48 de alto con los pies en 46. Hoja: idle (2: respira), walk (4: se mece), atacar (3: se echa
atrás y se lanza) y golpe (1). Todas las filas son la misma vista."""
import math
import os

import numpy as np

import reducir
from dibujo import put, line, outline, ell_mask, poly_mask, shade, rng

W, H = 64, 48
OUT = (14, 10, 20)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "8-guardian-bosque.png")
ANCHO = 41
ALTO_CUERNOS = 7  # filas de aire que se añaden arriba para las cuchillas de la cresta
# Paleta fija: con la cuantización libre el turquesa de las crestas se pierde entre los verdes y los grises
PALETA = {"negro": (24, 20, 30), "tierra": (70, 50, 40), "piedra": (112, 90, 108), "musgo_s": (36, 80, 40),
          "musgo": (62, 134, 56), "musgo_l": (110, 180, 76), "hueso_s": (150, 156, 164),
          "hueso": (206, 214, 214), "hueso_l": (244, 248, 240), "cresta_s": (40, 130, 130),
          "cresta": (70, 200, 190), "cresta_l": (150, 240, 224), "ambar": (226, 170, 60)}

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [1, -1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [4, -4, -1], "golpe": [2]}
# Ondulación del cuerpo (amplitud en píxeles arriba del todo, fase en vueltas): sustituye a mover partes sueltas,
# que dejaba una grieta en el cuerpo. Cada columna se desplaza con suavidad y los pies quedan pegados al suelo.
ONDA = {"idle": [(0.8, 0.0), (0.8, 0.5)], "walk": [(1.6, 0.0), (1.6, 0.25), (1.6, 0.5), (1.6, 0.75)],
        "atacar": [(-1.5, 0.0), (2.5, 0.3), (0.5, 0.6)], "golpe": [(-1.0, 0.0)]}
SUELO = 5  # filas de tierra y hierba de abajo que no se mueven

_BASE = None


def ondular(grid, amplitud, fase, ciclos=1.0, suelo=SUELO):
    """El cuerpo ondulando como un gusano: cada columna sube o baja con una onda, más cuanto más alto (los pies
    no se mueven). Se remuestrea fila a fila, así que no se abre ninguna grieta."""
    alto, ancho = len(grid), len(grid[0])
    tope = alto - suelo
    sal = [fila[:] for fila in grid]
    for x in range(ancho):
        a = amplitud * math.sin(2 * math.pi * (ciclos * x / ancho - fase))
        for y in range(tope):
            origen = round(y + a * (tope - y) / tope)
            sal[y][x] = grid[origen][x] if 0 <= origen < alto else None
    return sal


def _cuernos(grid):
    """Tres cuchillas turquesa en lo alto de la cabeza, inclinadas hacia atrás (la imagen las tiene largas y
    marcadas, y al reducirla se quedaban en un par de píxeles)."""
    ancho = len(grid[0])
    grid = [[None] * ancho for _ in range(ALTO_CUERNOS)] + grid
    for fx, largo in ((0.26, 6), (0.38, 7), (0.5, 5)):
        x = int(fx * ancho)
        y = next(f for f in range(len(grid)) if grid[f][x] is not None)
        for n in range(1, largo + 1):
            color = PALETA["cresta_l" if n > largo - 2 else "cresta" if n > 2 else "cresta_s"]
            for px in (x + n // 2, x + 1 + n // 2):
                if px < ancho and (px == x + n // 2 or n < largo * 0.6):
                    grid[y - n][px] = color
    return grid


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=0.95, saturacion=1.35, contraste=1.3, umbral=45, paleta=PALETA)
        grid = [fila[::-1] for fila in grid]  # la imagen mira a la derecha; el jefe mira a la heroína, a la izquierda
        _BASE = reducir.con_contorno(_cuernos(grid), OUT)
    return _BASE


def _lateral(anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    amp, fase = ONDA[anim][i]
    sal = reducir.vida(ondular(_pose(), amp, fase), anim, i)
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo


# --- De frente y de espaldas (dibujadas a mano con la paleta de la imagen de referencia) ---
MUSGO = [PALETA[k] for k in ("musgo_s", "musgo", "musgo_l")]
HUESO = [PALETA[k] for k in ("hueso_s", "hueso", "hueso_l")]
CRESTA = [PALETA[k] for k in ("cresta_s", "cresta", "cresta_l")]
TIERRA = [(52, 38, 34), PALETA["tierra"], (96, 72, 52)]
PIEDRA = [(80, 64, 78), PALETA["piedra"], (140, 118, 134)]
# Por fotograma: desplazamiento de las espiras (ox), de la cabeza (hx, hy), cuánto crece y abre la boca
POSES = {"idle": [(0, 0, 0, 0, 0), (0, 0, 1, 0, 0)],
         "walk": [(-1, 1, 0, 0, 0), (0, 0, 1, 0, 0), (1, -1, 0, 0, 0), (0, 0, 1, 0, 0)],
         "atacar": [(0, 0, -2, 0, 0), (0, 0, 3, 1, 3), (0, 0, 1, 0, 1)], "golpe": [(0, 0, -1, 0, 0)]}


def _suelo(t):
    shade(t, ell_mask(t, 32, 44, 29, 3.4), TIERRA, rim=False)
    g = rng(3)
    for _ in range(30):
        x, y = g.randint(6, 57), g.randint(42, 45)
        if t[y, x, 3]:
            put(t, x, y, PALETA["musgo" if g.random() < 0.7 else "musgo_l"])
    for x in (22, 30, 38, 46):
        put(t, x, 45, PALETA["ambar"])


def _cuerpo(t, ox):
    """Las espiras del cuerpo musgoso y el cuello que sube hacia la cabeza."""
    shade(t, poly_mask(t, [(25, 20), (39, 20), (42, 34), (22, 34)]), MUSGO, bias=-0.05)  # el cuello
    for y in range(24, 34, 3):  # anillos del cuello
        line(t, 26 - (y - 24) // 3, y, 38 + (y - 24) // 3, y, MUSGO[0])
    shade(t, ell_mask(t, 14 + ox, 40, 10, 5.5), MUSGO, bias=-0.1)
    shade(t, ell_mask(t, 50 - ox, 40, 10, 5.5), MUSGO, bias=-0.1)
    shade(t, ell_mask(t, 32 + ox * 0.5, 38, 19, 7.5), MUSGO)
    shade(t, ell_mask(t, 32, 42, 7, 2.6), PIEDRA)
    g = rng(11)
    for _ in range(26):  # hiedra y brotes sobre el musgo
        x, y = g.randint(13, 51), g.randint(22, 42)
        if t[y, x, 3] and tuple(t[y, x, :3]) in MUSGO:
            put(t, x, y, MUSGO[2] if g.random() < 0.5 else MUSGO[0])
    for x in (20, 27, 37, 44):  # ramas oscuras colgando
        line(t, x, 34, x - 1, 39 + x % 3, PALETA["negro"])


def _aletas(t, cx, cy):
    """Las aletas de cresta, turquesas, abiertas a los lados de la cabeza como orejas de dragón, con las puntas
    de cuchilla hacia atrás y arriba, y un cuerno corto en medio."""
    for s in (-1, 1):
        shade(t, poly_mask(t, [(cx + s * 6, cy - 3), (cx + s * 12, cy - 9), (cx + s * 17, cy - 11), (cx + s * 15, cy - 4),
                               (cx + s * 18, cy + 2), (cx + s * 13, cy + 1), (cx + s * 14, cy + 7), (cx + s * 7, cy + 4)]),
              CRESTA, bias=0.0, rim=False)
        for k in range(4):  # vetas más claras en cada aleta
            put(t, cx + s * (9 + k * 2), cy - 5 + k, CRESTA[2])
    for k in range(5):
        put(t, cx, cy - 8 - k, CRESTA[2] if k > 2 else CRESTA[1]); put(t, cx + 1, cy - 8 - k, CRESTA[0])


def _cabeza_frente(t, cx, cy, crece, abre):
    _aletas(t, cx, cy)
    # Cráneo en forma de escudo que se estrecha en el hocico (visto de frente, algo escorzado)
    pts = [(cx - 7, cy - 6), (cx + 7, cy - 6), (cx + 9, cy + 1), (cx + 6 + crece, cy + 8), (cx + 4 + crece, cy + 14 + abre),
           (cx - 4 - crece, cy + 14 + abre), (cx - 6 - crece, cy + 8), (cx - 9, cy + 1)]
    shade(t, poly_mask(t, pts), HUESO, bias=0.15)
    line(t, cx, cy - 5, cx, cy + 10, HUESO[2])  # el caballete del hocico, más claro
    for s in (-1, 1):
        line(t, cx + s * 2, cy - 2, cx + s * 9, cy - 4, HUESO[0])  # ceja
        for k in range(4):  # cuenca: rendija inclinada hacia el hocico
            put(t, cx + s * (7 - k * 1.4), cy + k * 0.8, PALETA["negro"]); put(t, cx + s * (7 - k * 1.4), cy + 1 + k * 0.8, PALETA["negro"])
        put(t, cx + s * 6, cy + 1, PALETA["cresta_l"])
        put(t, cx + s * 2, cy + 10, PALETA["negro"])  # fosas
        line(t, cx + s * 5, cy + 6, cx + s * 4, cy + 12 + abre, HUESO[0])  # la comisura baja hasta la mandíbula
    for x in range(cx - 3, cx + 4, 2):  # colmillos
        put(t, x, cy + 14 + abre, HUESO[2]); put(t, x, cy + 13 + abre, HUESO[1])
    for x in (cx - 4, cx + 3):  # musgo que se le agarra a la frente
        put(t, x, cy - 5, MUSGO[1]); put(t, x + 1, cy - 4, MUSGO[0])


def _cabeza_espalda(t, cx, cy):
    """La nuca: placas de hueso en sombra, las aletas abiertas y musgo cayendo por el cuello."""
    _aletas(t, cx, cy)
    pts = [(cx - 7, cy - 6), (cx + 7, cy - 6), (cx + 9, cy + 1), (cx + 8, cy + 9), (cx - 8, cy + 9), (cx - 9, cy + 1)]
    shade(t, poly_mask(t, pts), [HUESO[0], HUESO[0], HUESO[1], HUESO[1]], bias=0.0)
    for k in range(-5, 9, 3):  # espinazo: placas turquesa a lo largo de la nuca
        put(t, cx, cy + k, CRESTA[2]); put(t, cx, cy + k + 1, CRESTA[1]); put(t, cx + 1, cy + k + 1, CRESTA[0])
    for k in range(-3, 9, 4):  # costuras de las placas
        line(t, cx - 7, cy + k, cx - 2, cy + k + 1, HUESO[0]); line(t, cx + 3, cy + k + 1, cx + 7, cy + k, HUESO[0])
    for x in range(cx - 8, cx + 9, 3):  # musgo cayendo por el cuello
        line(t, x, cy + 8, x + 1, cy + 13 + x % 3, MUSGO[1])
        put(t, x + 1, cy + 13 + x % 3, MUSGO[0])


def _figura(vista, anim, i):
    t = np.zeros((H, W, 4), dtype=np.uint8)
    ox, hx, hy, crece, abre = POSES[anim][i]
    _suelo(t)
    _cuerpo(t, ox)
    cx, cy = 32 + hx, 16 + hy
    if vista == "frente":
        _cabeza_frente(t, cx, cy, crece, abre)
    else:
        _cabeza_espalda(t, cx, cy)
    outline(t, OUT)
    return t


def fotograma(direccion, anim, i):
    """De frente (`down`), de espaldas (`up`) y de perfil mirando a la izquierda; `right` es el perfil volteado."""
    if direccion == "down":
        return _figura("frente", anim, i)
    if direccion == "up":
        return _figura("espalda", anim, i)
    lienzo = _lateral(anim, i)
    return lienzo[:, ::-1].copy() if direccion == "right" else lienzo
