"""Caballero maldito, jefe violeta de las Ruinas: armadura negra con placas verdosas, penacho y cintas rojas,
el espadón bajo en una mano y el escudo en la otra.

Hoja a doble resolución (96×96 píxeles de hoja, 48×48 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 10, 14)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "caballero_maldito.jpg")
ANCHO = 62
SOMBRAS = [(78, 72, 88), (84, 78, 94)]  # la sombra del suelo de la imagen, que cuenta como fondo

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.4, 0.78, 0.62, 1, "pierna_a"), (0.66, 0.78, 0.9, 1, "pierna_b"), (0, 0.4, 0.42, 0.75, "brazo_i"),
          (0.75, 0.25, 1, 0.75, "brazo_d"), (0.52, 0, 0.75, 0.17, "cabeza")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=24, umbral=26, saturacion=1.2, contraste=1.2,
                            fondos_extra=SOMBRAS, motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
