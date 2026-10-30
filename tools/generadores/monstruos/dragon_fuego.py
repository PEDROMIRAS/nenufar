"""Dragón de fuego (64x48): un dragón erguido de perfil, mirando a la izquierda, de cuerpo azul verdoso con
cresta y melena de llamas rosas y naranjas, el vientre claro y la cola enroscada que acaba en una llama.
Su pose sale de la imagen de referencia (la 6 del documento de diseño) con `reducir.py`; aquí se anima.

De momento es solo un recurso: el Dragón negro sigue siendo el jefe opcional de las cuatro zonas.
Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira y la llama de la cola parpadea), walk (4: no anda), atacar (3: echa la
cuerpo atrás, se lanza y escupe un resplandor de fuego) y golpe (1, destello). Todas las filas son la misma vista."""
import os

import numpy as np

import reducir

W, H = 64, 48
OUT = (14, 8, 22)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "6-dragon-fuego.jpg")
ANCHO = 39
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
LLAMA_COLA = [(238, 110, 90), (255, 176, 112)]  # los dos tonos de la llama del final de la cola

DY = {"idle": [0, -1], "walk": [0, -1, 0, -1], "atacar": [1, -1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [3, -3, -1], "golpe": [2]}
TONO = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [1, 1, 1], "golpe": [0]}

_BASE = None


def _es_llama_cola(rgb, x, y, ancho, alto):
    """Los píxeles rosados y anaranjados del tercio superior derecho (la llama de la punta de la cola)."""
    r, g, b = rgb
    return x > ancho * 0.7 and y < alto * 0.38 and r > 200 and g < 190 and b < 170 and r > b + 40


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=16, brillo=1.1, saturacion=1.2, contraste=1.3, umbral=45)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _con_llama(sal, tono):
    alto, ancho = len(sal), len(sal[0])
    return [[LLAMA_COLA[tono] if (c is not None and c != OUT and _es_llama_cola(c, x, y, ancho, alto)) else c
             for x, c in enumerate(fila)] for y, fila in enumerate(sal)]


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _con_llama(_pose(), TONO[anim][i])
    alto, ancho = len(sal), len(sal[0])
    x0 = (W - ancho) // 2 + 4 + DX[anim][i]
    y0 = 47 - alto + DY[anim][i]
    reducir.pegar(lienzo, sal, x0, y0)
    if anim == "atacar" and i == 1:
        # Resplandor de fuego que sale de la boca, delante de la cabeza
        boca_x = x0 + min((x for fila in sal[4:10] for x, c in enumerate(fila) if c is not None), default=0)
        boca_y = y0 + 7
        for k in range(1, 15):
            mitad = 1 + k // 3
            for dy in range(-mitad, mitad + 1):
                x, y = boca_x - k + 4, boca_y + dy + k // 2
                if 1 <= x < W - 1 and 0 <= y < H and lienzo[y, x, 3] == 0:
                    d = abs(dy) / (mitad + 0.5)
                    lienzo[y, x] = FUEGO[3 if d < 0.25 else 2 if d < 0.6 else 1] + (255,)
    return lienzo
