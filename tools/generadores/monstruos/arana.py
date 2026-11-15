"""Araña de las Ruinas y la Cripta: negra, de patas gruesas, con las fauces rojas y los colmillos de hueso.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego). La referencia de Pedro es pixel art ampliado al
doble: se usan sus píxeles tal cual (reducirla más la dejaba en una mancha), repintados con una paleta fija para
quitar el ruido del JPEG, y se anima con las curvas de `reducir.movimiento`."""
import os

import numpy as np
from PIL import Image

import reducir

W = H = 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "arana.jpg")
AMPLIACION = 2  # píxeles de la imagen por píxel del dibujo
SOMBRAS = [(98, 96, 97), (90, 88, 89), (82, 80, 81)]  # la sombra del suelo de la imagen, que cuenta como fondo
# Más oscura que la imagen, que es gris como su fondo
PALETA = [(18, 16, 22), (30, 28, 36), (44, 40, 50), (60, 55, 66), (78, 72, 82), (122, 20, 28), (206, 34, 38),
          (236, 214, 200)]

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.5, 0.32, 1, "pierna_a"), (0.68, 0.5, 1, 1, "pierna_b"), (0, 0, 0.3, 0.5, "brazo_i"),
          (0.7, 0, 1, 0.5, "brazo_d")]

_BASE = None


def _oscuro(c):
    """Los grises, más oscuros; el rojo y el hueso, igual."""
    return c * 0.72 if c.max() - c.min() < 30 and c.max() < 170 else c


def _pose():
    global _BASE
    if _BASE is None:
        a = np.array(Image.open(REFERENCIA).convert("RGB")).astype(int)
        alto, ancho = a.shape[0] // AMPLIACION, a.shape[1] // AMPLIACION
        a = a.reshape(alto, AMPLIACION, ancho, AMPLIACION, 3).mean(axis=(1, 3))  # cada bloque, un píxel del dibujo
        m = reducir._mascara(a, "auto", 14, SOMBRAS, motas=12)
        ys, xs = np.where(m)
        colores = np.array(PALETA)
        grid = [[PALETA[int(((colores - _oscuro(a[y, x])) ** 2).sum(axis=1).argmin())] if m[y, x] else None
                 for x in range(xs.min(), xs.max() + 1)] for y in range(ys.min(), ys.max() + 1)]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
