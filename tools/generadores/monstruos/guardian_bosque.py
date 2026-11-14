"""Guardián del Bosque (64x48), jefe de la zona: un gusano-dragón cubierto de musgo y hiedra, con la cabeza
blanca como un cráneo de hueso y crestas verde azuladas. Mira a la izquierda, hacia la heroína.
Su pose sale de la imagen de referencia (la 8) con `reducir.py`; aquí se anima.

Cabe en 48 de alto con los pies en 46. Hoja: idle (2: respira), walk (4: se mece), atacar (3: se echa
atrás y se lanza) y golpe (1). Todas las filas son la misma vista."""
import math
import os

import reducir

W, H = 128, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (14, 10, 20)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "8-guardian-bosque.png")
ANCHO = 82
# Paleta fija: con la cuantización libre el turquesa de las crestas se pierde entre los verdes y los grises
PALETA = {"negro": (24, 20, 30), "tierra": (70, 50, 40), "piedra": (112, 90, 108), "musgo_s": (36, 80, 40),
          "musgo": (62, 134, 56), "musgo_l": (110, 180, 76), "hueso_s": (150, 156, 164),
          "hueso": (206, 214, 214), "hueso_l": (244, 248, 240), "cresta_s": (40, 130, 130),
          "cresta": (70, 200, 190), "cresta_l": (150, 240, 224), "ambar": (226, 170, 60)}

SUELO = 10  # filas de tierra y hierba de abajo que no se mueven

_BASE = None


def ondular(grid, amplitud, fase, ciclos=1.0, suelo=SUELO):
    """El cuerpo ondulando como un gusano: cada columna sube o baja con una onda, más cuanto más alto (los pies
    no se mueven). Se remuestrea fila a fila, así que no se abre ninguna grieta."""
    alto, ancho = len(grid), len(grid[0])
    tope = alto - suelo
    sal = [fila[:] for fila in grid]
    for x in range(ancho):
        a = amplitud * math.sin(2 * math.pi * (ciclos * x / ancho - fase))
        for y in range(tope):
            origen = round(y + a * (tope - y) / tope)
            sal[y][x] = grid[origen][x] if 0 <= origen < alto else None
    return sal


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=0.95, saturacion=1.35, contraste=1.3, umbral=45, paleta=PALETA, motas=1500)
        # Sin `encerrado`: el cráneo es blanco como el fondo y se lo llevaría. El único resto de fondo encerrado es
        # una mancha blanca entre las ramas de abajo a la izquierda, que se quita aquí.
        alto, ancho = len(grid), len(grid[0])
        claros = {PALETA["hueso"], PALETA["hueso_l"]}
        for y in range(round(alto * 0.55), alto):
            for x in range(round(ancho * 0.25)):
                if grid[y][x] in claros:
                    grid[y][x] = None
        grid = [fila[::-1] for fila in grid]  # la imagen mira a la derecha; el jefe mira a la heroína, a la izquierda
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _onda(anim, i):
    """`(amplitud, fase)` de la ondulación del cuerpo en el fotograma: sustituye a mover partes sueltas, que dejaba
    una grieta en el cuerpo."""
    n = reducir.N_DOBLE[anim]
    if anim == "idle":
        return 1.6, i / n
    if anim == "walk":
        return 3.2, i / n
    if anim == "atacar":
        u = i / (n - 1)
        return reducir._clave(u, [(0, -3), (0.4, 5), (1, 1)]), reducir._clave(u, [(0, 0), (0.4, 0.3), (1, 0.6)])
    return -2, 0


def fotograma(direccion, anim, i):
    """Mira a la izquierda (hacia la heroína); `right` y `up` son la misma imagen volteada."""
    lienzo = reducir.animar(ondular(_pose(), *_onda(anim, i)), [], anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion in ("right", "up") else lienzo
