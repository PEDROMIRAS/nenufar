"""Dragón negro, el guardián de las salas violetas (el mismo en las cuatro zonas): sentado, con las alas en alto,
el cuello erguido, escamas de pizarra y la panza clara.

Hoja a doble resolución (128×96 píxeles de hoja, 64×48 de juego): su pose sale de la imagen de referencia de Pedro
(una lámina de bocetos: se usa el dragón grande) con `reducir.py` y se anima con las curvas de
`reducir.movimiento`. Mira a la izquierda."""
import os

from PIL import Image, ImageDraw

import reducir

W, H = 128, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 10, 16)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "dragon_negro.jpg")
ANCHO = 72
LAMINA = (0, 300, 736, 1104)  # la parte de la lámina donde está el dragón grande
# Los otros bocetos y el rótulo que caen dentro de esa parte (en sus coordenadas): se tapan con el color del papel
AJENOS = [[(440, 0), (736, 0), (736, 300), (600, 300), (572, 262), (440, 75)], [(0, 0), (350, 0), (350, 100), (0, 100)]]
# El papel, del centro (claro) a las esquinas de abajo (oscuras)
PAPEL = [(203, 182, 158), (190, 169, 142), (176, 156, 131), (158, 141, 120), (140, 127, 110), (126, 116, 103)]

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0, 0.28, 0.6, "brazo_i"), (0.6, 0, 1, 0.6, "brazo_d"), (0.18, 0.05, 0.5, 0.3, "cabeza"),
          (0, 0.86, 0.3, 1, "cola")]

_BASE = None


def _es_papel(c):
    """El papel que queda encerrado entre un ala y el cuerpo (la panza es más gris y no entra)."""
    r, g, b = c
    return r > 185 and r - b > 34


def _pose():
    global _BASE
    if _BASE is None:
        lamina = Image.open(REFERENCIA).convert("RGB").crop(LAMINA)
        for ajeno in AJENOS:
            ImageDraw.Draw(lamina).polygon(ajeno, fill=PAPEL[0])
        grid = reducir.pose(lamina, ANCHO, colores=24, umbral=26, brillo=1.15, saturacion=1.3, contraste=1.2,
                            fondos_extra=PAPEL, motas=3000)
        grid = [[None if c is not None and _es_papel(c) else c for c in fila] for fila in grid]
        reducir.limpiar(grid)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
