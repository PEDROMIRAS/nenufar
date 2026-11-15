"""Esqueleto de las Ruinas: huesos vendados bajo un manto pardo hecho jirones, faja roja y la espada en alto.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

import reducir

W, H = 64, 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (16, 10, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "esqueleto.jpg")
ANCHO = 42
SUELO = 925  # por debajo están las piedras del suelo de la imagen

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.2, 0.7, 0.42, 1, "pierna_a"), (0.6, 0.7, 0.86, 1, "pierna_b"), (0, 0, 0.5, 0.3, "brazo_i"),
          (0.76, 0.2, 1, 0.7, "cola")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=20, umbral=22, saturacion=1.3, contraste=1.2,
                            recorte=(0, 0, 1024, SUELO), motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
