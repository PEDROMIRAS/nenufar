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


def fotograma(direccion, anim, i):
    # Pedro (2026-11-14): sin vistas de frente ni de espalda; la imagen (el perfil) vale para todas las direcciones
    pose, partes = _perfil()
    n = next(cuantos for nombre, cuantos, _, _ in ANIMS if nombre == anim)
    lienzo = reducir.animar(pose, partes, anim, i, n, ESCALA_HOJA, W, H, adelante=1)
    return lienzo[:, ::-1].copy() if direccion == "left" else lienzo
