"""Espectro del Cauce Seco: una calavera embozada bajo una capucha roja, con una antorcha en alto y el sayo
hecho jirones que no llega al suelo.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`. Los jirones sueltos de la imagen se
quitan (ninguna pieza separada del cuerpo)."""
import os

import reducir

W, H = 64, 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (14, 6, 10)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "espectro.jpg")
ANCHO = 34
FLOTA = 2  # píxeles de juego sobre el suelo: no pisa

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0, 0.35, 0.6, "brazo_i"), (0.65, 0.5, 1, 0.82, "brazo_d"), (0.3, 0.78, 0.8, 1, "cola")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=20, umbral=40, brillo=1.2, contraste=1.1, motas=900)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H, flota=FLOTA)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
