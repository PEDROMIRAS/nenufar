"""Acólito (40x40): encapuchado de túnica oscura con un báculo de calavera y una llama en la mano, uno de los
sacerdotes de la Orden que encendieron la luna falsa del Cauce Seco. Su pose sale de la imagen de referencia
(`reducir.py`); aquí se anima: respira, se balancea al andar, se echa encima al atacar, y la llama parpadea.

Contrato de los monstruos con módulo propio: `fotograma(direccion, anim, i)` da un array RGBA de 40×40 con los
pies en (20, 38); `OUT` es el color del contorno (el golpe lo deja casi blanco).
"""
import os

import numpy as np

import reducir

OUT = (30, 24, 32)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "4-acolito-calavera.jpg")
ANCHO = 29
W = H = 40
LLAMA = [(214, 52, 30), (255, 150, 40)]  # los dos tonos que alterna la llama
TUNICA = (62, 58, 66)

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [-1, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 1, 0, -1], "atacar": [0, 0, 0], "golpe": [-2]}
# Qué tono de llama toca en cada fotograma (el último del ataque es el más vivo).
TONO = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [1, 1, 1], "golpe": [0]}

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
        grid = reducir.pose(REFERENCIA, ANCHO, colores=18, brillo=2.0, saturacion=1.5, contraste=1.3)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _con_llama(sal, tono):
    """La pose con la llama pintada en uno de sus dos tonos."""
    ancho = len(sal[0])
    return [[LLAMA[tono] if (c is not None and c != OUT and _es_llama(c, x, ancho)) else c
             for x, c in enumerate(fila)] for fila in sal]


def _de_espaldas(sal):
    """De espaldas no se ven ni los ojos ni la cara: los píxeles rojos de la capucha pasan a túnica."""
    alto = len(sal)
    return [[TUNICA if (c is not None and c != OUT and y < alto * 0.35 and c[0] > 120 and c[0] > c[1] * 1.7) else c
             for c in fila] for y, fila in enumerate(sal)]


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _con_llama(reducir.vida(reducir.partes(_pose(), PARTES, anim, i), anim, i, fuerza=0.5), TONO[anim][i])
    if direccion == "up":
        sal = _de_espaldas(sal)
    if direccion == "left":
        sal = [fila[::-1] for fila in sal]
    alto, ancho = len(sal), len(sal[0])
    # Los pies (la última fila de la túnica) tocan la fila del ancla (H - 2).
    x0 = (W - ancho) // 2 + DX[anim][i]
    y0 = (H - 1) - alto + DY[anim][i]
    reducir.pegar(lienzo, sal, x0, y0)
    return lienzo
