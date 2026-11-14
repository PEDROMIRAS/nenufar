"""Jabalí: su pose base sale de la imagen de referencia y se repinta con la paleta del juego (la melena de hebras
y los colmillos son los de la imagen); se anima moviéndola y con patas dibujadas. La reducción la hace `reducir.py`.

Hoja a doble resolución (80×80 píxeles de hoja, 40×40 de juego). La imagen (de perfil) vale para todas las
direcciones; la izquierda, en espejo.
"""
import math
import os

import numpy as np

import reducir

W = H = 80
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
PIE = H - 3  # la última fila de los pies (el ancla es H - 4)
OUT = (30, 24, 32)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "1-jabali.jpg")
ANCHO = 72
ESCALA = ANCHO / 28  # los retoques y las patas están medidos para una pose de 28 de ancho
PATA = 8  # ancho de cada pata
PALETA = {
    "oscuro": (84, 35, 22), "sombra": (105, 53, 35), "cuerpo": (138, 82, 56), "luz": (160, 105, 75),
    "melena": (196, 140, 100), "colmillo": (232, 214, 184), "boca": (138, 90, 154), "ojo": (20, 18, 24),
    "blanco": (246, 250, 236),
}
# Retoques a mano sobre la pose reducida: (x, y, color) en píxeles de una pose de 28 de ancho (sin contorno).
RETOQUES = [
    # Ojo con el blanco y la ceja
    (19, 9, "oscuro"), (20, 9, "oscuro"), (19, 10, "blanco"), (20, 10, "ojo"),
    # Rabo corto que sube, a la izquierda (la limpieza de la silueta lo quita si viene de la reducción)
    (2, 12, "sombra"), (1, 11, "sombra"), (1, 10, "cuerpo"), (0, 9, "cuerpo"), (0, 8, "cuerpo"),
    (0, 7, "sombra"), (0, 6, "oscuro"), (1, 6, "oscuro"),
]

_BASE = None


def _retoques():
    """Los retoques a la escala de la pose: cada píxel de la medida base pasa a un bloque."""
    lista = []
    for x, y, k in RETOQUES:
        for yy in range(int(y * ESCALA), int((y + 1) * ESCALA + 0.999)):
            for xx in range(int(x * ESCALA), int((x + 1) * ESCALA + 0.999)):
                lista.append((xx, yy, PALETA[k]))
    return lista


def _pose():
    """La pose base con su contorno (matriz de colores RGB o None)."""
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, fondo="negro", paleta=PALETA, retoques=_retoques())
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _pata(lienzo, x, y_pie, alza, clave, y_arriba):
    """Pata gruesa con contorno y pezuña clara, desde la barriga (`y_arriba`) hasta el suelo."""
    y = y_pie - alza
    for yy in range(y_arriba, y - 1):
        lienzo[yy, x - 1] = OUT + (255,)
        lienzo[yy, x + PATA] = OUT + (255,)
        for xx in range(x, x + PATA):
            lienzo[yy, xx] = PALETA[clave] + (255,)
    for xx in range(x, x + PATA):
        lienzo[y - 1, xx] = lienzo[y, xx] = PALETA["colmillo"] + (255,)
        lienzo[y + 1, xx] = OUT + (255,)
    for yy in (y - 1, y):
        lienzo[yy, x - 1] = lienzo[yy, x + PATA] = OUT + (255,)


# (desplazamiento respecto del borde izquierdo de la pose, color, índice de alza): las dos patas lejanas, más
# oscuras, van detrás del cuerpo
PATAS = [(round(3 * ESCALA), "oscuro", 0), (round(14 * ESCALA), "oscuro", 2),
         (round(8 * ESCALA), "sombra", 1), (round(19 * ESCALA), "sombra", 3)]


def _paso(anim, i):
    """`(bob, alzas)`: cuánto baja el cuerpo y cuánto se levanta cada una de las cuatro patas en el fotograma."""
    f = 2 * math.pi * i / reducir.N_DOBLE[anim]
    if anim == "walk":  # trote: las patas en diagonal van a la vez
        return -round(1 - math.cos(2 * f)), [round(3 * max(0.0, math.sin(f + math.pi / 8 + math.pi * (k % 2)))) for k in range(4)]
    if anim == "idle":
        return round(1 - math.cos(f)), [0] * 4
    return (2 if anim == "atacar" and i in (2, 3) else 0), [0] * 4


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    bob, alza = _paso(anim, i)
    # Los pies (pezuñas) tocan la fila del ancla; el cuerpo, bajo y gordo, casi las tapa.
    y0 = (PIE - 4) - (alto - 1) + bob
    arriba = y0 + alto - 6
    x0 = (W - ancho) // 2
    for d, clave, n in PATAS[:2]:
        _pata(lienzo, x0 + d, PIE, alza[n], clave, arriba)
    reducir.pegar(lienzo, sal, x0, y0)
    for d, clave, n in PATAS[2:]:
        _pata(lienzo, x0 + d, PIE, alza[n], clave, arriba)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
