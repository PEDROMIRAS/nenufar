"""Señor de la Cripta (48x48), jefe de la Cripta: un guerrero alto con capucha, armadura negra de hombreras con
púas, capa rota con forro rojo y la cara de calavera. Va de frente y flota apenas sobre el suelo.
Su pose sale de la imagen de referencia (la 11) con `reducir.py`; aquí se anima.

Hoja del repo: idle (2: respira), walk (4: se mece), atacar (3: se echa atrás, se lanza y vuelve) y golpe (1:
recula). Todas las filas son la misma vista."""
import os
import tempfile

import numpy as np
from PIL import Image

import reducir

W, H = 48, 48
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "11-senor-cripta.png")
ANCHO = 28
COMPRESION = 0.75  # la figura es el doble de alta que de ancha: se comprime a lo alto para ganar píxeles de ancho
# Paleta fija: casi todo es negro, y sin ella los grises y el rojo se hunden en un negro liso
PALETA = {"negro": (34, 30, 42), "carbon": (62, 58, 74), "acero_s": (92, 90, 108), "acero": (138, 136, 156),
          "acero_l": (196, 196, 210), "hueso": (226, 220, 206), "rojo_s": (110, 24, 34), "rojo": (190, 40, 50),
          "cuero": (124, 88, 54)}
CARA = (11, 3)  # esquina de la cara en la pose reducida

DY = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [-1, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 2, 0], "golpe": [-2]}

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        im = Image.open(REFERENCIA).convert("RGB")
        im = im.resize((im.width, round(im.height * COMPRESION)), Image.LANCZOS)
        with tempfile.TemporaryDirectory() as d:
            ruta = os.path.join(d, "senor.png")
            im.save(ruta)
            grid = reducir.pose(ruta, ANCHO, brillo=1.8, saturacion=1.3, contraste=1.15, umbral=40, paleta=PALETA)
        # La cara de calavera, dibujada a mano: al reducir la imagen se pierde en la capucha
        colores = {"n": "negro", "h": "hueso", "r": "rojo"}
        for y, fila in enumerate(("nnnnnn", "nhhhhn", "nhrhrn", "nhhhhn", "nnhhnn", "..nn..")):
            for x, c in enumerate(fila):
                if c != ".":
                    grid[CARA[1] + y][CARA[0] + x] = PALETA[colores[c]]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
