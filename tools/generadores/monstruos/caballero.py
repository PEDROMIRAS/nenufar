"""Caballero de la Cripta: armadura de placas gris, pañuelo y faldón rojos, capa oscura y el espadón bajo.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

import reducir

W, H = 64, 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (12, 10, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "caballero.jpg")
ANCHO = 40
SUELO = 478  # la imagen tiene una raya de suelo bajo los pies: se corta por aquí

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.38, 0.8, 0.62, 1, "pierna_a"), (0.62, 0.8, 0.9, 1, "pierna_b"), (0, 0.5, 0.4, 0.76, "brazo_i"),
          (0.5, 0, 0.75, 0.2, "cabeza")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=20, umbral=40, contraste=1.2, recorte=(0, 0, 512, SUELO),
                            motas=600)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
