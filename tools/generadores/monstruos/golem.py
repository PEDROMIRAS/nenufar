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
TRES_VISTAS = True  # frente de la imagen; perfil y espalda recreados
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
GOLPE = 2  # fotograma del ataque en que el puño llega al suelo

# Partes que se mueven por separado (cajas en fracciones de la figura; ver reducir.partes)
PARTES_FRENTE = [(0, 0.74, 0.5, 1, "pierna_a"), (0.5, 0.74, 1, 1, "pierna_b"), (0, 0.25, 0.22, 0.75, "brazo_i"),
                 (0.78, 0.25, 1, 0.75, "brazo_d")]

# De perfil, una pierna atrás y otra delante, y el brazo de este lado en el centro
PARTES_PERFIL = [(0, 0.7, 0.5, 1, "pierna_a"), (0.5, 0.7, 1, 1, "pierna_b"), (0.2, 0.3, 0.8, 0.82, "brazo_i")]

_POSES = {}
_P = PALETA
_PIEDRA = (_P["piedra"], _P["piedra_l"], _P["piedra_h"])
_ORO = (_P["oro_s"], _P["oro"], _P["oro_l"])
# Un paso más oscuro, para lo que queda detrás (la pierna lejana del perfil)
_SOMBRA = {_P["piedra_h"]: _P["piedra_l"], _P["piedra_l"]: _P["piedra"], _P["piedra"]: _P["piedra_s"],
           _P["piedra_s"]: _P["negro"]}


def _base():
    """La pose de la imagen, sin contorno: 56 de ancho por 83 de alto."""
    if "base" not in _POSES:
        # `encerrado`: el hueco entre el brazo y el torso es fondo de la imagen sin salida al borde (sin quitarlo,
        # parece una capa); `motas`: las rayas del suelo junto a los pies.
        grid = reducir.pose(REFERENCIA, ANCHO, brillo=1.3, saturacion=1.5, contraste=1.35, umbral=45, paleta=PALETA,
                            encerrado=500, motas=2000)
        # El pardo de la tela solo vale en el taparrabos: en las juntas de la piedra es sombra y ensucia
        alto = len(grid)
        for y, fila in enumerate(grid):
            for x, c in enumerate(fila):
                if c == _P["tela"] and not (0.28 * ANCHO < x < 0.72 * ANCHO and 0.36 * alto < y < 0.74 * alto):
                    fila[x] = _P["piedra_s"]
        _POSES["base"] = grid
    return _POSES["base"]


def _vista(nombre, hacer, partes):
    if nombre not in _POSES:
        _POSES[nombre] = (reducir.con_contorno(hacer(), OUT), partes)
    return _POSES[nombre]


def _frente():
    """La vista de la imagen: `(pose con contorno, partes)`."""
    return _vista("frente", _base, PARTES_FRENTE)


def _dibujo_espalda():
    """La pose en espejo, sin lo que solo se ve por delante: el visor, las cadenas que cuelgan del cinturón."""
    g = [fila[:] for fila in reducir.espejo(_base())]
    for y, fila in enumerate(g):
        for x, c in enumerate(fila):
            if c is None:
                continue
            if 22 <= x <= 33 and 6 <= y <= 11 and c in (_P["negro"], _P["piedra_s"]):
                fila[x] = _P["piedra_s"] if c == _P["negro"] else _P["piedra"]  # la nuca del yelmo, sin visor
            elif x == 27 and 13 <= y <= 30 and c in _PIEDRA:
                fila[x] = _P["piedra_s"]  # la junta de las placas de la espalda
            elif 22 <= x <= 40 and 37 <= y <= 58 and c in _ORO:
                fila[x] = _P["tela"]  # el taparrabos por detrás, sin cadenas colgando
    return g


# Las piezas de la pose de frente, como polígonos en sus píxeles (56×83), siguiendo las juntas oscuras
PIEZAS = {
    "cabeza": [(22, 0), (33, 0), (33, 12), (22, 12)],
    "torso": [(22, 11), (33, 11), (36, 16), (40, 24), (38, 32), (16, 32), (15, 24), (17, 17)],
    "cadera": [(15, 31), (38, 31), (37, 43), (33, 44), (32, 57), (24, 58), (22, 45), (14, 44)],
    "hombrera": [(34, 6), (37, 1), (45, 2), (52, 8), (54, 17), (53, 24), (42, 25), (41, 23), (36, 17)],  # la grande
    "brazo": [(4, 26), (15, 25), (16, 35), (13, 40), (14, 53), (4, 54), (0, 49), (0, 38), (4, 33)],
    "cadena": [(5, 53), (9, 53), (9, 67), (5, 67)],
    "pierna_cerca": [(12, 44), (23, 45), (24, 57), (24, 83), (4, 83), (4, 78), (10, 74), (10, 58)],
    "pierna_lejos": [(33, 43), (44, 43), (46, 57), (47, 76), (50, 83), (31, 83), (33, 74), (33, 57)],
}


def _dibujo_perfil():
    """Mirando a la derecha, montado con las piezas de la pose de frente. De atrás adelante: la pierna lejana (más
    oscura y adelantada), la cercana, la cadera y el torso (más estrechos: de lado se ve su fondo, no su ancho), la
    cabeza echada hacia delante con el visor en el lado de la cara y, encima, la hombrera y el brazo de este lado.
    Cada pieza lleva una línea oscura que la separa de la de debajo."""
    b = _base()
    n = _P["negro"]
    g = reducir.vacia(56, len(b))

    def pieza(nombre, dx, ancho=None, sombra=False, borde=n, espejo=False):
        """Pega la pieza desplazada `dx` (y estrechada a `ancho` columnas, centrada donde estaba)."""
        trozo, x0, y0 = reducir.cortar(b, PIEZAS[nombre])
        if espejo:
            trozo = reducir.espejo(trozo)
        if nombre == "cabeza":
            for y in range(5, 12):  # el visor solo se ve en la parte de delante del yelmo
                for x in range(0, 5):
                    if trozo[y][x] in (n, _P["piedra_s"]):
                        trozo[y][x] = _P["piedra_s"] if trozo[y][x] == n else _P["piedra"]
        if ancho:
            x0 += (len(trozo[0]) - ancho) // 2
            trozo = reducir.estrechar(trozo, ancho)
        if sombra:
            trozo = reducir.repintar(trozo, _SOMBRA)
        reducir.poner(g, trozo, x0 + dx, y0, borde=borde)

    pieza("pierna_lejos", -8, sombra=True, borde=None)
    pieza("pierna_cerca", 8)
    pieza("cadera", 0, ancho=22)
    pieza("torso", 1, ancho=26)
    pieza("cabeza", 7)
    pieza("hombrera", -23, espejo=True)
    pieza("brazo", 13)
    pieza("cadena", 13)
    return reducir.ajustar(g)


def _espalda():
    return _vista("espalda", _dibujo_espalda, PARTES_FRENTE)


def _perfil():
    return _vista("perfil", _dibujo_perfil, PARTES_PERFIL)


def fotograma(direccion, anim, i):
    pose, partes = {"down": _frente, "up": _espalda}.get(direccion, _perfil)()
    n = next(cuantos for nombre, cuantos, _, _ in ANIMS if nombre == anim)
    lienzo = reducir.animar(pose, partes, anim, i, n, ESCALA_HOJA, W, H, adelante=1 if direccion != "down" else -1)
    if anim == "atacar" and i == GOLPE:
        # Polvo del golpe al suelo, a los lados de los pies
        for dx, dy in ((-3, 0), (-2, -1), (-4, -1), (3, 0), (2, -1), (4, -1)):
            x, y = W // 2 + dx * 6, H - 4 + dy * 2
            for px in (x, x + 1):
                for py in (y, y + 1):
                    if 0 <= px < W and lienzo[py, px, 3] == 0:
                        lienzo[py, px] = POLVO + (255,)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
