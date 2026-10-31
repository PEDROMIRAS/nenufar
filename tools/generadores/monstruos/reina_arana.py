"""Reina Araña (64x48), jefa de la Cripta: una araña negra de patas largas y afiladas, con dibujos rojos
en el abdomen, la cabeza y las patas. Mira a la izquierda, hacia la heroína.
Su pose sale de la imagen de referencia (la 9) con `reducir.py`; aquí se anima.

Cabe en 48 de alto con los pies en 46. Hoja: idle (2: respira), walk (4: se mece), atacar (3: se echa
atrás y se lanza) y golpe (1). Todas las filas son la misma vista."""
import os

import numpy as np

import reducir

W, H = 64, 48
OUT = (14, 8, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "9-reina-arana.png")
ANCHO = 42
# Paleta fija: la imagen es negra con dibujos rojos, y reducida sin ella se mezcla todo en un rojo sucio
PALETA = {"negro": (30, 28, 38), "gris": (62, 60, 74), "gris_l": (104, 98, 110), "hueso": (190, 176, 166),
          "rojo": (206, 48, 66), "rojo_s": (120, 28, 46), "rojo_l": (240, 96, 100)}

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [1, -1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [4, -4, -1], "golpe": [2]}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.35, 0.28, 1, "pierna_a"), (0.28, 0.5, 0.45, 1, "pierna_b"), (0.55, 0.5, 0.72, 1, "pierna_a"),
          (0.72, 0.35, 1, 1, "pierna_b")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.0, saturacion=1.15, contraste=1.15, umbral=40, paleta=PALETA)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = reducir.vida(reducir.partes(_pose(), PARTES, anim, i), anim, i)
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
