"""Ojo flotante, jefe violeta de la Cripta: una cabeza acorazada con un ojo de ámbar y las fauces abiertas,
de la que salen tentáculos morados acabados en ojos.

Hoja a doble resolución (96×96 píxeles de hoja, 48×48 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (14, 10, 22)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "ojo_flotante.jpg")
ANCHO = 60
SUELO = 800  # por debajo solo queda la sombra del suelo
# El fondo es gris con los bordes más oscuros: sus tonos, del borde al centro
FONDOS = [(92, 91, 98), (100, 100, 106), (110, 112, 118), (122, 122, 130), (132, 132, 138)]

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0, 1, 0.3, "cabeza"), (0, 0.3, 0.25, 0.8, "brazo_i"), (0.75, 0.3, 1, 0.8, "brazo_d"),
          (0.2, 0.8, 0.8, 1, "cola")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=28, umbral=30, brillo=1.15, saturacion=1.5, contraste=1.15,
                            recorte=(0, 0, 746, SUELO), fondos_extra=FONDOS, motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
