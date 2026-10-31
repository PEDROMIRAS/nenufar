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
ANCHO = 41
ALTO_CUERNOS = 7  # filas de aire que se añaden arriba para las cuchillas de la cresta
# Paleta fija: con la cuantización libre el turquesa de las crestas se pierde entre los verdes y los grises
PALETA = {"negro": (24, 20, 30), "tierra": (70, 50, 40), "piedra": (112, 90, 108), "musgo_s": (36, 80, 40),
          "musgo": (62, 134, 56), "musgo_l": (110, 180, 76), "hueso_s": (150, 156, 164),
          "hueso": (206, 214, 214), "hueso_l": (244, 248, 240), "cresta_s": (40, 130, 130),
          "cresta": (70, 200, 190), "cresta_l": (150, 240, 224), "ambar": (226, 170, 60)}

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [1, -1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [4, -4, -1], "golpe": [2]}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0, 0.5, 0.55, "cabeza"), (0.7, 0.2, 1, 0.75, "cola")]

_BASE = None


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


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = reducir.vida(reducir.partes(_pose(), PARTES, anim, i), anim, i)
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
