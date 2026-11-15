"""Salamandra de brasas del Cauce Seco: un lagarto de escamas al rojo, con cuernos, cresta de púas y el lomo
y la cola ardiendo.

Hoja a doble resolución (80×80 píxeles de hoja, 40×40 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`. Mira a la izquierda."""
import os

import reducir

W, H = 80, 80
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (40, 12, 10)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "salamandra.jpg")
ANCHO = 58
SUELO = 690  # la imagen acaba en una raya negra

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0.38, 0.78, 0.62, 1, "pierna_a"), (0.78, 0.72, 1, 1, "pierna_b"), (0.4, 0, 1, 0.45, "cola"),
          (0, 0.5, 0.3, 1, "cabeza")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=24, umbral=45, contraste=1.15, recorte=(0, 0, 1200, SUELO),
                            motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
