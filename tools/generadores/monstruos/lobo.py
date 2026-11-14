"""Lobo de la Cripta: un hombre lobo negro azulado, encorvado, con las fauces abiertas, los ojos rojos, las garras
rojas y la cola erizada.

Hoja a doble resolución (64×64 píxeles de hoja, 32×32 de juego): su pose de perfil sale de la imagen de referencia
(la 5) con `reducir.py` y se anima con las curvas de `reducir.movimiento`."""
import os

from PIL import Image

import reducir

W, H = 64, 64
ESCALA_HOJA = 2  # píxeles de la hoja por píxel del juego
ANIMS = reducir.ANIMS_DOBLE
OUT = (10, 10, 18)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "5-lobo.jpg")
ANCHO = 44
SUELO = 1304  # la imagen tiene una raya negra de suelo bajo los pies: se corta por aquí
# Paleta fija: la imagen es casi negra y sin ella se queda en una mancha; estos azules la levantan sin aclararla
PALETA = {"negro": (14, 16, 28), "pelo_ss": (24, 30, 52), "pelo_s": (38, 46, 78), "pelo": (58, 68, 106),
          "pelo_l": (88, 100, 142), "rojo_s": (128, 22, 30), "rojo": (214, 42, 50), "colmillo": (236, 230, 220)}

# Partes del perfil (cajas en fracciones de la figura; ver reducir.partes): mira a la derecha
PARTES_PERFIL = [(0.05, 0.74, 0.4, 1, "pierna_a"), (0.5, 0.74, 0.95, 1, "pierna_b"), (0.72, 0.48, 1, 0.72, "brazo_d"),
                 (0, 0.38, 0.22, 0.66, "cola"), (0.6, 0, 1, 0.3, "cabeza")]

_POSES = {}


def _reducida(brillo, contraste):
    ancho_imagen = Image.open(REFERENCIA).width
    return reducir.pose(REFERENCIA, ANCHO, brillo=brillo, saturacion=1.3, contraste=contraste, umbral=70,
                        paleta=PALETA, recorte=(0, 0, ancho_imagen, SUELO), motas=2000)


def _base():
    """La pose de la imagen (de perfil, mirando a la derecha), sin contorno."""
    if "base" not in _POSES:
        # La imagen es casi negra: con mucho brillo se lee el pelo, pero la boca se quema en una mancha blanca;
        # la boca (colmillos y rojos) sale de una segunda reducción con menos brillo.
        grid, boca = _reducida(2.8, 1.0), _reducida(2.0, 1.15)
        alto = len(grid)
        for y, fila in enumerate(grid):
            for x, c in enumerate(fila):
                if c == PALETA["colmillo"]:
                    en_boca = x > 0.74 * ANCHO and 0.1 * alto < y < 0.38 * alto
                    fila[x] = boca[y][x] if en_boca and boca[y][x] is not None else PALETA["pelo_s"]
        _POSES["base"] = grid
    return _POSES["base"]


def _vista(nombre, hacer, partes):
    if nombre not in _POSES:
        _POSES[nombre] = (reducir.con_contorno(hacer(), OUT), partes)
    return _POSES[nombre]


def _perfil():
    """La vista de la imagen: `(pose con contorno, partes)`."""
    return _vista("perfil", _base, PARTES_PERFIL)


# El frente y la espalda no salen de la imagen (que es un perfil): se dibujan por formas, con la rampa de azules
# de la imagen y un pelaje de mechones verticales, más claro arriba (la luz viene de arriba) y más oscuro en los lados
PARTES_FRENTE = [(0.1, 0.72, 0.5, 1, "pierna_a"), (0.5, 0.72, 0.9, 1, "pierna_b"), (0, 0.3, 0.22, 0.82, "brazo_i"),
                 (0.78, 0.3, 1, 0.82, "brazo_d"), (0.28, 0.1, 0.72, 0.5, "cabeza")]
_P = PALETA
_RAMPA = [_P["pelo_l"], _P["pelo"], _P["pelo_s"], _P["pelo_ss"], _P["negro"]]
ANCHO_FRENTE, ALTO_FRENTE, EJE = 44, 50, 22


def _pelo(g, puntos, luz=0.0, borde=_P["negro"]):
    """Rellena el polígono con pelaje: el tono baja de claro a oscuro de arriba abajo y hacia los lados de la
    forma, con mechones (ruido fijo); `luz` lo aclara (negativo) o lo oscurece (positivo)."""
    lleno = reducir.vacia(ANCHO_FRENTE, ALTO_FRENTE)
    for fila in lleno:
        fila[:] = [_P["pelo"]] * ANCHO_FRENTE
    pieza, x0, y0 = reducir.recorte(lleno, puntos)
    alto, ancho = len(pieza), len(pieza[0])
    for y, fila in enumerate(pieza):
        for x, c in enumerate(fila):
            if c is None:
                continue
            lado = abs((x + 0.5) / ancho * 2 - 1)
            mechon = (((x0 + x) * 7 + ((y0 + y) // 3) * 13) % 5 - 2) * 0.3  # mechones verticales
            nivel = 0.4 + 2.3 * (y + 0.5) / alto + 1.2 * lado * lado + mechon + luz
            fila[x] = _RAMPA[max(0, min(4, round(nivel)))]
    reducir.poner(g, pieza, x0, y0, borde=borde)


def _par(g, puntos, luz=0.0, borde=_P["negro"]):
    """La forma y su espejo respecto del eje del cuerpo (un brazo, una pierna, una oreja)."""
    _pelo(g, puntos, luz, borde)
    _pelo(g, [(2 * EJE - x, y) for x, y in reversed(puntos)], luz, borde)


def _garras(g, x0, y, n=3):
    """`n` garras rojas hacia abajo desde la fila `y`, y sus espejos."""
    for k in range(n):
        for x in (x0 + 2 * k, 2 * EJE - 1 - x0 - 2 * k):
            g[y][x] = _P["rojo"]
            g[y + 1][x] = _P["rojo_s"]


def _cuerpo(g):
    """Lo que el frente y la espalda comparten: piernas dobladas de lobo, torso ancho arriba y estrecho en la
    cintura, brazos largos que se abren hacia las garras y los hombros encorvados, más altos que el cuello."""
    _par(g, [(13, 34), (21, 33), (21, 40), (18, 43), (19, 47), (21, 48), (21, 50), (11, 50), (11, 48), (14, 46),
             (13, 42), (11, 38)], luz=0.9, borde=None)  # pierna: muslo, corvejón y pie
    _garras(g, 12, 48)
    _pelo(g, [(12, 14), (32, 14), (33, 22), (30, 28), (28, 33), (29, 37), (15, 37), (16, 33), (14, 28), (11, 22)],
          luz=0.5)  # torso
    for y in range(27, 36):  # el surco del vientre
        g[y][EJE - 1] = g[y][EJE] = _P["pelo_ss"] if y % 3 else _P["negro"]
    _par(g, [(3, 18), (10, 18), (11, 25), (9, 29), (10, 34), (9, 39), (3, 39), (1, 34), (3, 29), (2, 24)],
         luz=0.3)  # brazo
    _garras(g, 3, 39)
    _par(g, [(2, 17), (3, 12), (6, 8), (11, 6), (15, 8), (17, 12), (16, 18), (10, 20), (4, 19)], luz=-0.6)  # hombro


def _cabeza(g):
    """La cabeza de lobo de frente, hundida entre los hombros: dos orejas en punta, el cráneo ancho en los
    pómulos y en cuña hacia el hocico."""
    _par(g, [(13, 13), (15, 2), (20, 10)], luz=-0.2)  # oreja
    _pelo(g, [(15, 11), (19, 9), (25, 9), (29, 11), (32, 17), (29, 19), (28, 23), (25, 28), (19, 28), (16, 23),
              (15, 19), (12, 17)], luz=-0.5)


def _dibujo_frente():
    """De frente, con la cara de la imagen: ojos rojos rasgados bajo el ceño, el hocico al centro, la boca abierta
    con el fondo rojo y los colmillos."""
    g = reducir.vacia(ANCHO_FRENTE, ALTO_FRENTE)
    _cuerpo(g)
    _cabeza(g)
    cara = {"n": "negro", "r": "rojo", "R": "rojo_s", "c": "colmillo", "l": "pelo_l", "p": "pelo", "s": "pelo_s"}
    for y, fila in enumerate(("nn......nn",  # el ceño
                              ".rr....rr.",  # los ojos
                              "...llll...",
                              "...lppl...",  # el puente del hocico
                              "...pnnp...",  # la nariz
                              "..sppppss.",
                              ".cRrrrrRc.",  # la boca abierta y los colmillos de arriba
                              ".cRRRRRRc.",
                              "..sccccs..",  # los de abajo
                              "...nssn...")):
        for x, k in enumerate(fila):
            if k != ".":
                g[15 + y][EJE - 5 + x] = _P[cara[k]]
    return reducir.ajustar(g)


def _dibujo_espalda():
    """De espaldas: el mismo cuerpo sin cara, la cola erizada colgando y la melena bajando por el lomo."""
    g = reducir.vacia(ANCHO_FRENTE, ALTO_FRENTE)
    _pelo(g, [(20, 30), (25, 30), (29, 38), (31, 45), (27, 47), (23, 42), (20, 36)], luz=0.6, borde=None)  # cola
    _cuerpo(g)
    _cabeza(g)
    for y in range(8, 34):  # la melena: mechones claros en zigzag a los lados de una raya oscura
        g[y][EJE - 1] = g[y][EJE] = _P["pelo_ss"]
        g[y][EJE - 2 + 3 * (y % 2)] = _P["pelo_l"] if y % 3 else _P["pelo"]
    return reducir.ajustar(g)


def _frente():
    return _vista("frente", _dibujo_frente, PARTES_FRENTE)


def _espalda():
    return _vista("espalda", _dibujo_espalda, PARTES_FRENTE)


def fotograma(direccion, anim, i):
    pose, partes = {"down": _frente, "up": _espalda}.get(direccion, _perfil)()
    n = next(cuantos for nombre, cuantos, _, _ in ANIMS if nombre == anim)
    lienzo = reducir.animar(pose, partes, anim, i, n, ESCALA_HOJA, W, H, adelante=1)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
