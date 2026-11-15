"""Señor de la Cripta, jefe de la Cripta: un caballero encapuchado con cara de calavera, armadura negra de
hombreras con pinchos y un faldón rasgado con forro rojo.

Hoja a doble resolución (96×96 píxeles de hoja, 48×48 de juego): su pose sale de la imagen de referencia (la 11,
la figura sola sobre blanco) con `reducir.py` y se anima con las curvas de `reducir.movimiento`. Es un jefe: no se
mueve por el mapa y la imagen vale para todas las direcciones (la izquierda, en espejo)."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "11-senor-cripta.png")
ANCHO = 44
# Paleta fija: casi todo es negro y gris, y sin ella el acero, el cuero y el forro rojo se hunden en el negro
PALETA = {"negro": (24, 20, 28), "negro_l": (40, 36, 46), "carbon": (60, 56, 68), "gris": (98, 96, 108),
          "acero": (150, 152, 160), "acero_l": (214, 216, 220), "hueso": (236, 234, 224), "cuero": (124, 84, 54),
          "rojo_s": (110, 24, 28), "rojo": (176, 40, 40)}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.1, 0.84, 0.5, 1, "pierna_a"), (0.5, 0.84, 0.9, 1, "pierna_b"), (0, 0.3, 0.26, 0.62, "brazo_i"),
          (0.74, 0.3, 1, 0.62, "brazo_d"), (0.38, 0, 0.68, 0.17, "cabeza")]

# La cara de calavera, dibujada a mano: al reducir la imagen se queda en una mancha blanca sin cuencas
CARA = (23, 6)  # esquina de la cara en la pose reducida
CALAVERA = ("ghhhg", "hhhhh", "hnhnh", "hhnhh", "ghhhg", ".hgh.")
COLORES_CARA = {"g": "gris", "n": "negro", "h": "hueso"}
CLAROS = ("hueso", "acero_l", "acero")

_BASE = None


def _sin_halo(grid):
    """El borde de la figura se mezcla con el blanco del fondo al reducir y sale claro: se oscurece."""
    alto, ancho = len(grid), len(grid[0])
    claros = {PALETA[c] for c in CLAROS}
    borde = [(x, y) for y in range(alto) for x in range(ancho) if grid[y][x] in claros and any(
        not (0 <= x + dx < ancho and 0 <= y + dy < alto) or grid[y + dy][x + dx] is None
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in borde:
        grid[y][x] = PALETA["negro_l"]
    return grid


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.5, saturacion=1.2, contraste=1.25, umbral=40, paleta=PALETA,
                            encerrado=400, motas=1500)
        grid = _sin_halo(grid)
        for y, fila in enumerate(CALAVERA):
            for x, c in enumerate(fila):
                if c != ".":
                    grid[CARA[1] + y][CARA[0] + x] = PALETA[COLORES_CARA[c]]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
