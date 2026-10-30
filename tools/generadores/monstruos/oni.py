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
ANCHO = 27
# La sombra del suelo de la imagen (dos tonos de marrón grisáceo) también cuenta como fondo.
SOMBRAS = [(160, 133, 122), (175, 148, 137)]
MASCARA = [(150, 142, 128), (226, 220, 204), (244, 240, 228)]
HUECO = (10, 6, 10)
CUERNO = [(96, 22, 20), (156, 44, 32), (236, 190, 150)]  # rojo oscuro, el lado iluminado y la punta clara
ARRIBA = 4  # filas vacías que se añaden por encima para las puntas de los cuernos
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
    """Repinta la máscara de calavera: ancha y angulosa, con la frente plana, dos cuencas oblicuas, la boca abierta con
    dientes y, en las dos esquinas de arriba de la propia máscara, dos cuernos gruesos de rojo oscuro con la punta clara."""
    alto, ancho = len(grid), len(grid[0])
    cx, cy = round(CARA[0] * ancho), round(CARA[1] * (alto - ARRIBA)) + ARRIBA

    def pon(x, y, c):
        if 0 <= y < alto and 0 <= x < ancho:
            grid[y][x] = c

    # Máscara: de la frente (11 de ancho) al mentón (5), con el borde más oscuro
    for fila, medio in enumerate((5, 5, 5, 4, 4, 4, 3, 3, 2)):
        y = cy - 3 + fila
        for dx in range(-medio, medio + 1):
            pon(cx + dx, y, MASCARA[0] if abs(dx) == medio else (MASCARA[2] if fila < 3 else MASCARA[1]))
    pon(cx, cy - 3, MASCARA[0]); pon(cx + 1, cy - 2, MASCARA[0]); pon(cx - 2, cy - 2, MASCARA[0])  # grietas de la frente
    # Cuencas oblicuas (más altas por fuera) y nariz
    for s in (-1, 1):
        pon(cx + s * 4, cy - 1, HUECO); pon(cx + s * 3, cy - 1, HUECO); pon(cx + s * 2, cy - 1, HUECO)
        pon(cx + s * 3, cy, HUECO); pon(cx + s * 2, cy, HUECO)
    pon(cx, cy + 1, HUECO); pon(cx, cy + 2, HUECO)
    # Boca abierta con dientes
    for dx in (-2, -1, 0, 1, 2):
        pon(cx + dx, cy + 3, HUECO)
        pon(cx + dx, cy + 4, MASCARA[2] if dx % 2 == 0 else HUECO)
    # Cuernos: nacen en las esquinas de arriba de la máscara, gruesos, suben abriéndose y acaban en punta clara
    cuerno = [(4, -4, 0), (5, -4, 0), (6, -4, 1), (5, -5, 0), (6, -5, 0), (7, -5, 1), (6, -6, 0), (7, -6, 1),
              (6, -7, 0), (7, -7, 1), (7, -8, 0), (7, -9, 2)]
    for s in (-1, 1):
        for dx, dy, tono in cuerno:
            pon(cx + s * dx, cy + dy, CUERNO[tono])


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
