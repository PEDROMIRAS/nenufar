"""Monje oni (48x48), jefe violeta del Cauce Seco. Su pose sale de la imagen de referencia (la 7 del documento de
diseño) reducida con `reducir.py`: monje de piel rojiza en guardia, con la melena y los dos brazos en llamas, el
mandil claro y los pies descalzos. A esa escala la máscara de calavera se pierde, así que se repinta encima
(cuencas, nariz y dientes). Aquí se anima: respira y las llamas parpadean.

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira, las llamas parpadean), walk (4: no anda, es un jefe), atacar (3: se echa hacia
delante) y golpe (1, destello). Las cuatro direcciones usan la misma vista, de frente."""
import os

import numpy as np

import reducir

W, H = 48, 48
OUT = (8, 4, 10)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "7-oni.jpg")
ANCHO = 29
# La sombra del suelo de la imagen (dos tonos de marrón grisáceo) también cuenta como fondo.
SOMBRAS = [(160, 133, 122), (175, 148, 137)]
MASCARA = [(150, 142, 128), (226, 220, 204), (244, 240, 228)]
HUECO = (10, 6, 10)
CUERNO = [(110, 24, 20), (170, 50, 36), (222, 138, 92)]  # base, medio y punta clara
ARRIBA = 2  # filas vacías que se añaden por encima para las puntas de los cuernos
CARA = (0.4375, 0.143)  # dónde está la cabeza, como fracción del ancho y del alto de la pose
LLAMA = [None, (255, 168, 52)]  # el segundo tono de las llamas (el primero es el de la imagen)

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [-1, 1, 0], "golpe": [1]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [0, 0, 0], "golpe": [-2]}
TONO = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [1, 1, 1], "golpe": [0]}

_BASE = None


def _es_llama(c):
    r, g, b = c
    return r > 200 and g < 175 and b < 100 and r > g + 60


def _calavera(grid):
    """Repinta la máscara de calavera en la cabeza: óvalo claro con dos cuencas, la nariz y la fila de dientes, y
    los dos cuernos que le salen de la frente."""
    alto, ancho = len(grid), len(grid[0])
    cx, cy = round(CARA[0] * ancho), round(CARA[1] * (alto - ARRIBA)) + ARRIBA
    for y in range(cy - 4, cy + 5):
        for x in range(cx - 3, cx + 4):
            d = ((x - cx) / 3.0) ** 2 + ((y - cy) / 4.0) ** 2
            if d <= 1.0 and 0 <= y < alto and 0 <= x < ancho:
                grid[y][x] = MASCARA[2] if d < 0.35 else (MASCARA[1] if d < 0.8 else MASCARA[0])
    # Cuernos: nacen en la frente, se abren hacia fuera y suben, y la punta se curva hacia dentro
    cuerno = [(-3, -3, 0), (-2, -3, 0), (-4, -4, 0), (-3, -4, 1), (-5, -5, 1), (-4, -5, 1), (-5, -6, 1), (-4, -6, 1),
              (-5, -7, 1), (-4, -8, 2)]
    for s in (-1, 1):
        for dx, dy, tono in cuerno:
            x, y = cx - dx if s > 0 else cx + dx, cy + dy
            if 0 <= y < alto and 0 <= x < ancho:
                grid[y][x] = CUERNO[tono]
    for dx in (-1, 1):
        grid[cy - 1][cx + dx] = HUECO
        grid[cy][cx + dx] = HUECO
    grid[cy + 1][cx] = HUECO
    for dx in (-1, 0, 1):
        grid[cy + 3][cx + dx] = HUECO if dx == 0 else MASCARA[2]


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=24, umbral=40, brillo=1.0, saturacion=1.3, contraste=1.1,
                            fondos_extra=SOMBRAS)
        grid = [[None] * len(grid[0]) for _ in range(ARRIBA)] + grid
        _calavera(grid)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _con_llama(sal, tono):
    if tono == 0:
        return sal
    return [[LLAMA[1] if (c is not None and c != OUT and _es_llama(c)) else c for c in fila] for fila in sal]


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _con_llama(_pose(), TONO[anim][i])
    alto, ancho = len(sal), len(sal[0])
    # Los pies tocan la fila 46; el monje nunca sube por encima de la fila 4.
    x0 = (W - ancho) // 2 + DX[anim][i]
    y0 = 47 - alto + DY[anim][i]
    reducir.pegar(lienzo, sal, x0, y0)
    return lienzo
