"""Árbol maldito, jefe violeta del Bosque: un tronco con cara (ojos de ámbar, boca abierta con colmillos de
madera), ramas con garras y la copa encima.

Hoja a doble resolución (96×96 píxeles de hoja, 48×48 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`. De los dos árboles de la imagen se usa el
grande."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (14, 12, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "arbol_maldito.jpg")
ANCHO = 64
GRANDE = (0, 0, 318, 383)  # el árbol grande; a su derecha hay otro pequeño
# El fondo es un degradado de azul a violeta: sus tonos, de arriba abajo
CIELO = [(144, 203, 219), (140, 191, 211), (136, 179, 204), (132, 167, 197), (129, 154, 189), (126, 142, 182),
         (123, 130, 176)]

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.5, 0.25, 0.76, "brazo_i"), (0.75, 0.5, 1, 0.76, "brazo_d"), (0, 0, 1, 0.42, "cabeza"),
          (0.1, 0.88, 0.5, 1, "pierna_a"), (0.5, 0.88, 0.9, 1, "pierna_b")]  # las raíces hacen de pies

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=24, umbral=26, contraste=1.15, recorte=GRANDE,
                            fondos_extra=CIELO, motas=400)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
