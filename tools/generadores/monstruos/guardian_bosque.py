"""Guardián del Bosque (64x48), jefe de la zona: un gusano-dragón cubierto de musgo y hiedra, con la cabeza
blanca como un cráneo de hueso y crestas verde azuladas. Mira a la izquierda, hacia la heroína.
Su pose sale de la imagen de referencia (la 8) con `reducir.py`; aquí se anima.

Cabe en 48 de alto con los pies en 46. Hoja: idle (2: respira), walk (4: se mece), atacar (3: se echa
atrás y se lanza) y golpe (1). Todas las filas son la misma vista."""
import os

import numpy as np

import reducir

W, H = 64, 48
OUT = (14, 10, 20)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "8-guardian-bosque.png")
ANCHO = 46

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [1, -1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [4, -4, -1], "golpe": [2]}

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=18, brillo=0.95, saturacion=1.1, contraste=1.3, umbral=45)
        grid = [fila[::-1] for fila in grid]  # la imagen mira a la derecha; el jefe mira a la heroína, a la izquierda
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
