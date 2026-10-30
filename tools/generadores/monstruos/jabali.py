"""Jabalí: su pose base sale de la imagen de referencia, reducida a unos 28 píxeles y repintada con la paleta
del juego (la melena de hebras y los colmillos son los de la imagen); se anima moviéndola y con patas dibujadas.
La reducción la hace `reducir.py`.

Contrato de los monstruos con módulo propio: `fotograma(direccion, anim, i)` da un array RGBA de 32×32 con los
pies en (16, 30); `OUT` es el color del contorno (el golpe lo deja casi blanco).
"""
import os

import numpy as np

import reducir

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
RETOQUES = [
    # Ojo con el blanco y la ceja
    (19, 9, "oscuro"), (20, 9, "oscuro"), (19, 10, "blanco"), (20, 10, "ojo"),
    # Rabo corto que sube, a la izquierda (la limpieza de la silueta lo quita si viene de la reducción)
    (2, 12, "sombra"), (1, 11, "sombra"), (1, 10, "cuerpo"), (0, 9, "cuerpo"), (0, 8, "cuerpo"),
    (0, 7, "sombra"), (0, 6, "oscuro"), (1, 6, "oscuro"),
]

_BASE = None


def _pose():
    """La pose base con su contorno (matriz de colores RGB o None)."""
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, fondo="negro", paleta=PALETA,
                            retoques=[(x, y, PALETA[k]) for x, y, k in RETOQUES])
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


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
        reducir.pegar(lienzo, estrecha, x0, y0)
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
    reducir.pegar(lienzo, sal, x0, y0)
    for d, clave, n in patas[2:]:
        _pata(lienzo, x0 + d, 30, alza[n], clave, y0 + alto - 3)
    return lienzo
