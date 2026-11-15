"""Limo del Bosque: una baba verde con cuernos, la boca abierta de par en par chorreando y la lengua morada fuera.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego). La referencia de Pedro es un GIF de pixel art de
10 fotogramas, ampliado 6 veces: se usan sus píxeles tal cual (sin reducir ni repintar) y su propia animación; aquí
solo se elige qué fotograma va en cada paso y se desplaza (salta al andar, se lanza al atacar)."""
import os

import numpy as np
from PIL import Image

import reducir

W = H = 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (0, 0, 0)  # el contorno negro que ya trae el dibujo
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "referencias-monstruos", "limo.gif")
AMPLIACION = 6  # píxeles de la imagen por píxel del dibujo
SOMBRA = [(77, 69, 75)]  # la sombra del suelo de la imagen, que cuenta como fondo
# Qué fotograma del GIF va en cada paso: en reposo y al andar, su ciclo (10) en 8 pasos; al atacar empieza encogido
# (el combate lo deja quieto ahí mientras prepara un golpe cargado) y saca la lengua
PASOS = {"idle": [0, 1, 2, 3, 5, 7, 8, 9], "walk": [0, 1, 2, 3, 5, 7, 8, 9], "atacar": [5, 6, 7, 2, 3, 0],
         "golpe": [4]}

_CUADROS = None


def _cuadros():
    """Los 10 fotogramas del GIF como poses (colores o `None`), todos con la misma caja: el suelo no se mueve."""
    global _CUADROS
    if _CUADROS is None:
        gif = Image.open(REFERENCIA)
        colores, mascaras = [], []
        for k in range(gif.n_frames):
            gif.seek(k)
            a = np.array(gif.convert("RGB"))[AMPLIACION // 2::AMPLIACION, AMPLIACION // 2::AMPLIACION].astype(int)
            colores.append(a)
            mascaras.append(reducir._mascara(a, "auto", 20, SOMBRA, motas=8))
        ys, xs = np.where(np.any(mascaras, axis=0))
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        _CUADROS = [[[tuple(int(v) for v in a[y, x]) if m[y, x] else None for x in range(x0, x1)]
                     for y in range(y0, y1)] for a, m in zip(colores, mascaras)]
    return _CUADROS


def fotograma(direccion, anim, i, tinte=None):
    pose = _cuadros()[PASOS[anim][i]]
    if tinte:
        pose = [[c and tinte(c) for c in fila] for fila in pose]
    _, _, _, dx, dy = reducir.movimiento(anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA)
    if anim == "walk":
        dy = -dy  # salta en vez de hundirse
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    reducir.pegar(lienzo, pose, (W - len(pose[0])) // 2 - dx, H - 2 * ESCALA_HOJA + 1 + dy - len(pose))
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
