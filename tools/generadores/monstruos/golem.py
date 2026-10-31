"""Golem, jefe de las Ruinas (48x48): un coloso de armadura de piedra gris azulada, con yelmo de hierro, hombreras
enormes, cadenas doradas en la cintura y en el puño, y un taparrabos roto. Va de frente y no anda.
Su pose sale de la imagen de referencia (la 10) con `reducir.py`; aquí se anima.

Hoja del repo: idle (2: respira), walk (4: se mece, no anda), atacar (3: se echa atrás, se lanza y golpea el
suelo con polvo; la vuelta) y golpe (1: recula). Todas las filas son la misma vista."""
import os

import numpy as np

import reducir

W, H = 48, 48
OUT = (16, 14, 20)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "10-golem.png")
ANCHO = 28
# Paleta fija: la imagen es toda gris azulada con oro y negro, y sin ella se mezcla en grises sucios
PALETA = {"negro": (28, 28, 36), "tela": (62, 52, 48), "piedra_s": (58, 66, 80), "piedra": (94, 106, 122),
          "piedra_l": (134, 148, 164), "piedra_h": (178, 190, 202), "oro_s": (130, 96, 40), "oro": (206, 160, 62),
          "oro_l": (246, 214, 116)}
POLVO = (176, 166, 150)

DY = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [-1, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 2, 0], "golpe": [-2]}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.74, 0.5, 1, "pierna_a"), (0.5, 0.74, 1, 1, "pierna_b"), (0, 0.25, 0.22, 0.75, "brazo_i"),
          (0.78, 0.25, 1, 0.75, "brazo_d")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.3, saturacion=1.5, contraste=1.35, umbral=45, paleta=PALETA)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = reducir.vida(reducir.partes(_pose(), PARTES, anim, i), anim, i)
    alto, ancho = len(sal), len(sal[0])
    x0, y0 = (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i]
    reducir.pegar(lienzo, sal, x0, y0)
    if anim == "atacar" and i == 1:
        # Polvo del golpe al suelo, a los lados de los pies
        for dx, dy in ((-3, 0), (-2, -1), (-4, -1), (3, 0), (2, -1), (4, -1)):
            x, y = W // 2 + dx * 3, 46 + dy
            if 0 <= x < W and lienzo[y, x, 3] == 0:
                lienzo[y, x] = POLVO + (255,)
    return lienzo
