"""Cuervo del Bosque: rechoncho, negro violáceo, con los ojos amarillos encendidos y un collar de plumas pardas.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose sale de la imagen de referencia (la 2)
con `reducir.py` y se anima con las curvas de `reducir.movimiento`. La imagen vale para todas las direcciones (la
izquierda, en espejo)."""
import os

import reducir

W = H = 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (16, 14, 24)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "2-cuervo.jpg")
ANCHO = 38
SOMBRA = [(72, 75, 118)]  # la sombra del suelo de la imagen, que cuenta como fondo
PALETA = {"negro": (26, 23, 36), "pluma_s": (38, 34, 50), "pluma": (52, 47, 66), "pluma_l": (78, 70, 96),
          "pico_s": (70, 60, 62), "pico": (110, 94, 90), "collar": (126, 86, 52), "ojo_s": (232, 150, 40),
          "ojo": (255, 214, 120), "ojo_l": (255, 248, 214)}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.2, 0.88, 0.5, 1, "pierna_a"), (0.5, 0.88, 0.8, 1, "pierna_b"), (0.1, 0, 0.75, 0.45, "cabeza"),
          (0.62, 0.45, 1, 0.9, "brazo_d")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.25, saturacion=1.2, contraste=1.2, umbral=40, paleta=PALETA,
                            fondos_extra=SOMBRA, motas=3000)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
