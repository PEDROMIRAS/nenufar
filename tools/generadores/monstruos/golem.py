"""Golem, jefe de las Ruinas: un coloso de armadura de piedra gris azulada, con yelmo de hierro, hombreras
enormes, cadenas doradas en la cintura y en el puño, y un taparrabos roto.

Hoja a doble resolución (96×96 píxeles de hoja, 48×48 de juego): su pose de frente sale de la imagen de referencia
(la 10) con `reducir.py` y se anima con las curvas de `reducir.movimiento`: idle (8: respira), walk (8: se mece y
levanta los pies), atacar (6: se echa atrás, se lanza y golpea el suelo con polvo; la vuelta) y golpe (1: recula)."""
import os

import reducir

W, H = 96, 96
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (16, 14, 20)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "10-golem.png")
ANCHO = 56
# Paleta fija: la imagen es toda gris azulada con oro y negro, y sin ella se mezcla en grises sucios
PALETA = {"negro": (28, 28, 36), "tela": (62, 52, 48), "piedra_s": (58, 66, 80), "piedra": (94, 106, 122),
          "piedra_l": (134, 148, 164), "piedra_h": (178, 190, 202), "oro_s": (130, 96, 40), "oro": (206, 160, 62),
          "oro_l": (246, 214, 116)}
POLVO = (176, 166, 150)
EXENTOS = [POLVO]  # el polvo del golpe va suelto a propósito
GOLPE = 3  # fotograma del ataque en que el puño llega al suelo

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES_FRENTE = [(0, 0.74, 0.5, 1, "pierna_a"), (0.5, 0.74, 1, 1, "pierna_b"), (0, 0.25, 0.22, 0.75, "brazo_i"),
                 (0.78, 0.25, 1, 0.75, "brazo_d")]

_POSES = {}


def _frente():
    """La vista de la imagen: `(pose con contorno, partes)`."""
    if "frente" not in _POSES:
        # `encerrado`: el hueco entre el brazo y el torso es fondo de la imagen sin salida al borde (sin quitarlo,
        # parece una capa); `motas`: las rayas del suelo junto a los pies.
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.3, saturacion=1.5, contraste=1.35, umbral=45, paleta=PALETA,
                            encerrado=500, motas=2000)
        # El pardo de la tela solo vale en el taparrabos: en las juntas de la piedra es sombra y ensucia
        alto = len(grid)
        for y, fila in enumerate(grid):
            for x, c in enumerate(fila):
                if c == PALETA["tela"] and not (0.28 * ANCHO < x < 0.72 * ANCHO and 0.36 * alto < y < 0.74 * alto):
                    fila[x] = PALETA["piedra_s"]
        _POSES["frente"] = (reducir.con_contorno(grid, OUT), PARTES_FRENTE)
    return _POSES["frente"]


def fotograma(direccion, anim, i):
    pose, partes = _frente()
    n = next(cuantos for nombre, cuantos, _, _ in ANIMS if nombre == anim)
    lienzo = reducir.animar(pose, partes, anim, i, n, ESCALA_HOJA, W, H)
    if anim == "atacar" and i == GOLPE:
        # Polvo del golpe al suelo, a los lados de los pies
        for dx, dy in ((-3, 0), (-2, -1), (-4, -1), (3, 0), (2, -1), (4, -1)):
            x, y = W // 2 + dx * 6, H - 4 + dy * 2
            for px in (x, x + 1):
                for py in (y, y + 1):
                    if 0 <= px < W and lienzo[py, px, 3] == 0:
                        lienzo[py, px] = POLVO + (255,)
    return lienzo
