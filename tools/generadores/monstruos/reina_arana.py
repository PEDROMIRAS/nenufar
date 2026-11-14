"""Reina Araña, jefa de la Cripta: una araña negra enorme con dibujos rojos en el abdomen.

Hoja a doble resolución (128×96 píxeles de hoja, 64×48 de juego): su pose sale de la imagen de referencia (la 9)
con `reducir.py` y se anima con las curvas de `reducir.movimiento`. Es una jefa: no se mueve por el mapa y la
imagen vale para todas las direcciones."""
import os

import reducir

W, H = 128, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (14, 8, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "9-reina-arana.png")
ANCHO = 84
# Paleta fija: la imagen es negra con dibujos rojos, y reducida sin ella se mezcla todo en un rojo sucio
PALETA = {"negro": (30, 28, 38), "gris": (62, 60, 74), "gris_l": (104, 98, 110), "hueso": (190, 176, 166),
          "rojo": (206, 48, 66), "rojo_s": (120, 28, 46), "rojo_l": (240, 96, 100)}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes): las patas, de dos en dos
PARTES = [(0, 0.35, 0.28, 1, "pierna_a"), (0.28, 0.5, 0.45, 1, "pierna_b"), (0.55, 0.5, 0.72, 1, "pierna_a"),
          (0.72, 0.35, 1, 1, "pierna_b")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.0, saturacion=1.15, contraste=1.15, umbral=40, paleta=PALETA,
                            encerrado=400, motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
