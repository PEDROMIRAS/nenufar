"""Jabalí: su pose base sale de la imagen de referencia, reducida a unos 28 píxeles y repintada con la paleta
del juego (la melena de hebras y los colmillos son los de la imagen); se anima moviéndola y con patas dibujadas.

Contrato de los monstruos con módulo propio: `fotograma(direccion, anim, i)` da un array RGBA de 32×32 con los
pies en (16, 30); `OUT` es el color del contorno (el golpe lo deja casi blanco).
"""
import os

import numpy as np
from PIL import Image, ImageEnhance

OUT = (30, 24, 32)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "1-jabali.jpg")
ANCHO = 28
PALETA = {
    "oscuro": (84, 35, 22), "sombra": (105, 53, 35), "cuerpo": (138, 82, 56), "luz": (160, 105, 75),
    "melena": (196, 140, 100), "colmillo": (232, 214, 184), "boca": (138, 90, 154), "ojo": (20, 18, 24),
    "blanco": (246, 250, 236),
}
# Retoques a mano sobre la pose reducida: (x, y, color) en píxeles de la pose base (sin contorno).
RETOQUES = [(19, 9, "oscuro"), (20, 9, "oscuro"), (19, 10, "blanco"), (20, 10, "ojo")]


def _base():
    """La pose base: matriz de colores (o None) de la imagen reducida, sin contorno."""
    im = Image.open(REFERENCIA).convert("RGB")
    a = np.array(im).astype(int)
    mask = a.sum(axis=2) > 90
    ys, xs = np.where(mask)
    caja = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    recorte = im.crop(caja)
    m = Image.fromarray((mask[caja[1]:caja[3], caja[0]:caja[2]] * 255).astype("uint8"))
    alto = round(recorte.height * ANCHO / recorte.width)
    reducida = recorte.resize((ANCHO, alto), Image.BOX)
    c = np.array(ImageEnhance.Contrast(reducida).enhance(1.35)).astype(int)
    mm = np.array(m.resize((ANCHO, alto), Image.BOX)) >= 110
    claves = list(PALETA)
    colores = np.array([PALETA[k] for k in claves])
    grid = [[None] * ANCHO for _ in range(alto)]
    for y in range(alto):
        for x in range(ANCHO):
            if mm[y, x]:
                d = ((colores - c[y, x]) ** 2).sum(axis=1)
                grid[y][x] = claves[int(d.argmin())]
    _limpiar(grid)
    for x, y, k in RETOQUES:
        grid[y][x] = k
    return grid


def _vecinos(grid, x, y):
    alto, ancho = len(grid), len(grid[0])
    return [grid[ny][nx] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
            if 0 <= nx < ancho and 0 <= ny < alto]


def _limpiar(grid):
    """Silueta limpia: quita píxeles sueltos y tapa los agujeros que deja la reducción."""
    alto, ancho = len(grid), len(grid[0])
    for _ in range(2):
        for y in range(alto):
            for x in range(ancho):
                v = _vecinos(grid, x, y)
                ocupados = [k for k in v if k is not None]
                if grid[y][x] is not None and len(ocupados) <= 1:
                    grid[y][x] = None
                elif grid[y][x] is None and len(ocupados) >= 3:
                    grid[y][x] = max(set(ocupados), key=ocupados.count)


def _con_contorno(grid):
    """Pose con una fila y columna extra alrededor para el contorno: matriz de colores RGB o 'contorno'."""
    alto, ancho = len(grid), len(grid[0])
    sal = [[None] * (ancho + 2) for _ in range(alto + 2)]
    for y in range(alto):
        for x in range(ancho):
            sal[y + 1][x + 1] = grid[y][x]
    for y in range(alto + 2):
        for x in range(ancho + 2):
            if sal[y][x] is not None:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < ancho + 2 and 0 <= ny < alto + 2 and sal[ny][nx] not in (None, "contorno"):
                    sal[y][x] = "contorno"
                    break
    return sal


def _rgb(k):
    return OUT if k == "contorno" else PALETA[k]


_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        _BASE = _con_contorno(_base())
    return _BASE


def _pegar(lienzo, sal, x0, y0):
    for y, fila in enumerate(sal):
        for x, k in enumerate(fila):
            if k is None:
                continue
            px, py = x0 + x, y0 + y
            if 0 <= px < 32 and 0 <= py < 32:
                lienzo[py, px] = _rgb(k) + (255,)


def _pata(lienzo, x, y_pie, alza, clave, y_arriba):
    """Pata gruesa de 3 píxeles con contorno y pezuña clara, desde la barriga (`y_arriba`) hasta el suelo."""
    y = y_pie - alza
    for yy in range(y_arriba, y):
        lienzo[yy, x - 1] = OUT + (255,)
        lienzo[yy, x + 3] = OUT + (255,)
        for xx in (x, x + 1, x + 2):
            lienzo[yy, xx] = PALETA[clave] + (255,)
    for xx in (x, x + 1, x + 2):
        lienzo[y, xx] = PALETA["colmillo"] + (255,)
        lienzo[y + 1, xx] = OUT + (255,)
    lienzo[y, x - 1] = OUT + (255,)
    lienzo[y, x + 3] = OUT + (255,)


BOB = {"idle": [0, 1], "walk": [0, -1, 0, -1], "atacar": [0, 1, 0], "golpe": [0]}
AVANCE = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 2, 1], "golpe": [-2]}
ALZA = {"idle": [[0] * 4] * 2, "walk": [[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]],
        "atacar": [[0] * 4] * 3, "golpe": [[0] * 4]}


def fotograma(direccion, anim, i):
    lienzo = np.zeros((32, 32, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    bob = BOB[anim][i]
    # Los pies (pezuñas) tocan la fila 30; el cuerpo, bajo y gordo, casi las tapa.
    y0 = 28 - (alto - 1) + bob
    if direccion == "up":
        # De espaldas: la misma pose estrechada, con el rabo en el centro.
        estrecha = [[sal[y][int(x * ancho / 15)] for x in range(15)] for y in range(alto)]
        x0 = 16 - 8
        _pegar(lienzo, estrecha, x0, y0)
        alza = ALZA[anim][i]
        _pata(lienzo, 10, 30, alza[0], "sombra", y0 + alto - 3)
        _pata(lienzo, 19, 30, alza[1], "sombra", y0 + alto - 3)
        return lienzo
    x0 = 1 + AVANCE[anim][i]
    alza = ALZA[anim][i]
    # (desplazamiento, color, índice de alza): las dos patas lejanas, más oscuras, van detrás del cuerpo.
    patas = [(3, "oscuro", 0), (14, "oscuro", 2), (8, "sombra", 1), (19, "sombra", 3)]
    if direccion == "left":
        sal = [fila[::-1] for fila in sal]
        x0 = 32 - ancho - 1 - AVANCE[anim][i]
        patas = [(ancho - 3 - d, c, n) for d, c, n in patas]
    for d, clave, n in patas[:2]:
        _pata(lienzo, x0 + d, 30, alza[n], clave, y0 + alto - 3)
    _pegar(lienzo, sal, x0, y0)
    for d, clave, n in patas[2:]:
        _pata(lienzo, x0 + d, 30, alza[n], clave, y0 + alto - 3)
    return lienzo
