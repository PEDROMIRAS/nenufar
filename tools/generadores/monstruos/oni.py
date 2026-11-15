"""Monje oni (48x48), jefe violeta del Cauce Seco. Su pose sale de la imagen de referencia (la 7 del documento de
diseño) reducida con `reducir.py`: monje de piel rojiza en guardia, con la melena y los dos brazos en llamas, el
mandil claro y los pies descalzos. A esa escala la máscara de calavera se pierde, así que se repinta encima
(cuencas, nariz y dientes). Aquí se anima: respira y las llamas parpadean.

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira, las llamas parpadean), walk (4: no anda, es un jefe), atacar (3: se echa hacia
delante) y golpe (1, destello). Las cuatro direcciones usan la misma vista, de frente."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (8, 4, 10)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "7-oni.jpg")
ANCHO = 56
# La sombra del suelo de la imagen (dos tonos de marrón grisáceo) también cuenta como fondo.
SOMBRAS = [(160, 133, 122), (175, 148, 137)]
LLAMA = [None, (255, 168, 52)]  # el segundo tono de las llamas (el primero es el de la imagen)

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES = [(0, 0.78, 0.5, 1, "pierna_a"), (0.5, 0.78, 1, 1, "pierna_b"), (0, 0.28, 0.28, 0.62, "brazo_i"),
          (0.74, 0.1, 1, 0.5, "brazo_d")]

_BASE = None


def _es_llama(c):
    r, g, b = c
    return r > 200 and g < 175 and b < 100 and r > g + 60


def _pose():
    global _BASE
    if _BASE is None:
        grid = reducir.pose(REFERENCIA, ANCHO, colores=24, umbral=40, brillo=1.0, saturacion=1.3, contraste=1.1,
                            fondos_extra=SOMBRAS, encerrado=400, motas=1500)
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def _con_llama(sal, tono):
    if tono == 0:
        return sal
    return [[LLAMA[1] if (c is not None and c != OUT and _es_llama(c)) else c for c in fila] for fila in sal]


def fotograma(direccion, anim, i):
    # Las llamas parpadean: dos fotogramas de cada cuatro, y vivas al atacar. La imagen vale para todas las
    # direcciones (la izquierda, en espejo).
    pose = _con_llama(_pose(), 1 if anim == "atacar" or i % 4 >= 2 else 0)
    lienzo = reducir.animar(pose, PARTES, anim, i, reducir.N_DOBLE[anim], ESCALA_HOJA, W, H)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
