"""Señor de la Cripta (48x48), jefe de la Cripta: un guerrero alto con capucha, armadura negra de hombreras con
púas, capa rota con forro rojo y la cara de calavera. Va de frente y flota apenas sobre el suelo.
Su pose sale de la imagen de referencia (la 11) con `reducir.py`; aquí se anima.

Hoja del repo: idle (2: respira), walk (4: se mece), atacar (3: se echa atrás, se lanza y vuelve) y golpe (1:
recula). Todas las filas son la misma vista."""
import os

import numpy as np

import reducir

W, H = 48, 48
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "11-senor-cripta.png")
ANCHO = 21
# Paleta fija: casi todo es negro, y sin ella los grises y el rojo se hunden en un negro liso
PALETA = {"negro": (20, 18, 24), "carbon": (44, 42, 52), "acero_s": (72, 70, 84), "acero": (112, 110, 126),
          "acero_l": (170, 170, 184), "hueso": (214, 208, 196), "rojo_s": (96, 20, 30), "rojo": (170, 34, 44),
          "cuero": (112, 78, 48)}

CARA = (7, 3)  # esquina de la cara en la pose reducida

DY = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [-1, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 2, 0], "golpe": [-2]}

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.6, saturacion=1.3, contraste=1.1, umbral=40, paleta=PALETA)
        # La cara de calavera, dibujada a mano: al reducir la imagen se pierde en la capucha
        for y, fila in enumerate(("..hh..", ".hhhh.", ".nhhn.", ".hhhh.", "..hnh.")):
            for x, c in enumerate(fila):
                if c != ".":
                    grid[CARA[1] + y][CARA[0] + x] = PALETA["hueso" if c == "h" else "negro"]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
