"""Araña de las Ruinas y la Cripta: negra, de patas gruesas, con las fauces rojas y los colmillos de hueso.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose sale de la imagen de referencia de
Pedro con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

import reducir

W, H = 64, 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "arana.jpg")
ANCHO = 42
SUELO = 180  # por debajo solo queda la sombra del suelo
# La sombra y el halo que deja el JPEG alrededor, que cuentan como fondo
SOMBRAS = [(104, 102, 102), (96, 94, 95), (88, 86, 87), (80, 78, 79)]
# Paleta fija: la imagen es pequeña y gris como su fondo; sin ella la araña se queda en una mancha clara
PALETA = {"negro": (20, 18, 24), "pata": (38, 35, 44), "cuerpo_s": (58, 54, 64), "cuerpo": (82, 76, 86),
          "rojo_s": (122, 20, 28), "rojo": (206, 34, 38), "colmillo": (236, 214, 200)}

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.5, 0.32, 1, "pierna_a"), (0.68, 0.5, 1, 1, "pierna_b"), (0, 0, 0.3, 0.5, "brazo_i"),
          (0.7, 0, 1, 0.5, "brazo_d")]

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, umbral=12, brillo=1.1, saturacion=1.3, contraste=1.3, paleta=PALETA,
                            fondos_extra=SOMBRAS, recorte=(0, 0, 288, SUELO), motas=60)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    # La imagen vale para todas las direcciones (la izquierda, en espejo)
    lienzo = reducir.animar(_pose(), PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
