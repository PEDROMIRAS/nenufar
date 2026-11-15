"""Acólito: encapuchado de túnica oscura con un báculo de calavera y una llama en la mano, uno de los sacerdotes
de la Orden que encendieron la luna falsa del Cauce Seco.

Hoja a doble resolución (80×80 píxeles de hoja, 40×40 de juego): su pose sale de la imagen de referencia (la 4)
con `reducir.py` y se anima con las curvas de `reducir.movimiento`; la llama parpadea. La imagen vale para todas
las direcciones (la izquierda, en espejo)."""
import os

import reducir

W = H = 80
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (30, 24, 32)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "4-acolito-calavera.jpg")
ANCHO = 58
LLAMA = [(255, 150, 40), (255, 214, 96)]  # el corazón de la llama: su tono y el del parpadeo

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.2, 0.85, 0.55, 1, "pierna_a"), (0.55, 0.85, 0.9, 1, "pierna_b"), (0, 0, 0.22, 1, "brazo_i"),
          (0.72, 0.3, 1, 0.7, "brazo_d")]

_BASE = None


def _es_llama(rgb, x, ancho):
    """Los píxeles rojos de la mitad derecha (la mano con la llama)."""
    r, g, b = rgb
    return x > ancho * 0.6 and r > 130 and r > g * 1.7 and r > b * 1.7


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=18, brillo=2.0, saturacion=1.5, contraste=1.3, encerrado=400,
                            motas=1500)
        alto, ancho = len(grid), len(grid[0])

        def vecinos(x, y):
            return [grid[ny][nx] if 0 <= ny < alto and 0 <= nx < ancho else None
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))]

        # El fondo blanco de la imagen deja un filo claro en el borde de la túnica: se pela (la calavera del báculo,
        # arriba a la izquierda, sí es blanca)
        for _ in range(2):
            filo = [(x, y) for y in range(alto) for x in range(ancho)
                    if grid[y][x] is not None and min(grid[y][x]) > 170 and not (x < 0.3 * ancho and y < 0.3 * alto)
                    and None in vecinos(x, y)]
            for x, y in filo:
                grid[y][x] = None
        # La llama de la mano sale de un rojo liso: su corazón (lo que no toca el borde de la llama) va más claro
        llama = {(x, y) for y in range(alto) for x in range(ancho) if grid[y][x] is not None and _es_llama(grid[y][x], x, ancho)}
        for x, y in llama:
            if all((nx, ny) in llama for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
                grid[y][x] = LLAMA[0]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    pose = _pose()
    if anim == "atacar" or i % 4 >= 2:  # la llama parpadea: dos fotogramas de cada cuatro, y viva al atacar
        pose = [[LLAMA[1] if c == LLAMA[0] else c for c in fila] for fila in pose]
    lienzo = reducir.animar(pose, PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
