"""Cofre trampa (32x32): en reposo es idéntico al cofre cerrado de comunes (no se distingue de un
tesoro); al atacar abre la tapa y dentro hay dientes, una lengua y dos ojos con la luz violeta.

Parte de las casillas `cofre_cerrado` y `cofre_abierto` de public/assets/tilesets/comunes.png
(se generan antes, con el entorno), así que si cambia el cofre cambia también la trampa.
Hoja del repo: idle (2, el cofre tal cual), walk (4: da saltitos), atacar (3: abre, muerde y
cierra) y golpe (1, destello)."""
import os

import numpy as np
from PIL import Image
from dibujo import put

S = 32
OUT = (30, 24, 32)
BOCA = (64, 14, 26)
DIENTE = (240, 234, 220)
LENGUA = [(150, 44, 70), (204, 90, 110)]
OJO = [(176, 124, 255), (236, 214, 255)]

_RUTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..",
                     "public", "assets", "tilesets", "comunes.png")


def _casillas():
    hoja = Image.open(_RUTA).convert("RGBA")
    return (np.array(hoja.crop((0, 0, S, S))), np.array(hoja.crop((S, 0, 2 * S, S))))


CERRADO, ABIERTO = _casillas()


# Hueco del cofre abierto (entre la tapa y el cuerpo), en píxeles de la casilla.
HUECO = (7, 9, 24, 14)


def boca(lengua=True, ojos=True):
    """El cofre abierto con boca: dientes en sierra arriba y abajo, lengua y ojos en el fondo."""
    t = ABIERTO.copy()
    x0, y0, x1, y1 = HUECO
    t[y0:y1 + 1, x0:x1 + 1] = (*BOCA, 255)
    for x in range(x0, x1 + 1):
        put(t, x, y0, DIENTE)
        put(t, x, y1, DIENTE)
        if x % 2 == 0:
            put(t, x, y0 + 1, DIENTE)
            put(t, x + 1, y1 - 1, DIENTE)
    if ojos:
        for ex in (12, 19):
            put(t, ex, y0 + 2, OJO[1]); put(t, ex + 1, y0 + 2, OJO[0])
    if lengua:
        for x in range(14, 19):
            put(t, x, y1 - 1, LENGUA[1] if x in (15, 16) else LENGUA[0])
        put(t, 16, y1, LENGUA[1])
    return t


def subir(t, dy):
    """El fotograma desplazado `dy` píxeles hacia arriba (la sombra se queda en el suelo)."""
    if dy == 0:
        return t.copy()
    out = np.zeros_like(t)
    out[: S - dy] = t[dy:]
    sombra = t[S - 3:].copy()
    sombra[sombra[:, :, 3] == 255] = 0
    abajo = out[S - 3:]
    vacio = abajo[:, :, 3] == 0
    abajo[vacio] = sombra[vacio]
    return out


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo; de frente en todas las filas, como un cofre."""
    if anim == "idle":
        return CERRADO.copy()
    if anim == "walk":
        return subir(CERRADO, [0, 2, 0, 1][i])
    if anim == "atacar":
        return [lambda: boca(lengua=False), lambda: subir(boca(), 2), lambda: subir(boca(lengua=False, ojos=False), 1)][i]()
    return subir(CERRADO, 1)
