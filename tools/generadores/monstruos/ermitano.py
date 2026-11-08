"""Ermitaño (32x32), el personaje de la sala de evento del mismo nombre (entrega 2b). Una figura encorvada, de
pie, con la capucha echada hacia delante: dentro solo hay sombra, ninguna cara. Se apoya en un bastón torcido
con una mano y de la otra cuelga un farol pequeño de luz tenue, que apenas tiñe la capa. Capa raída en grises
pardos, sobria y oscura (nada de ojos grandes ni colores vivos).

Cabe en 32 de alto con los pies en 30. Se ve desde las cuatro direcciones (de frente, de perfil, de espalda; la
izquierda es el perfil volteado) y tiene `idle` (2 fotogramas: respira y el farol titila) y `walk` (4: cada
fotograma es el cuerpo entero redibujado, con bamboleo, pasos, el bastón que se apoya y el farol que oscila al
revés). Nada se mueve por separado del resto.
Vista previa: python tools/generadores/monstruos/ermitano.py  ->  docs/previews/ermitano_x8.png"""
import math
import os

import numpy as np
from PIL import Image
from dibujo import tile, put, line, outline, ell_mask, poly_mask, shade, ground_shadow, to_img

S = 32
CAPA = [(12, 10, 14), (28, 24, 28), (46, 40, 42), (70, 62, 58)]
VACIO = (2, 1, 3)
MANO = [(112, 92, 78), (168, 144, 116)]
MADERA = [(38, 26, 20), (76, 54, 36), (112, 84, 52)]
HIERRO = (40, 38, 46)
LUZ = [(120, 60, 22), (214, 128, 44), (255, 208, 110)]
OUT = (4, 3, 8)


def _bajo(pts, paso):
    """El bajo raído: los picos de abajo se mecen con el paso."""
    return [(x + (paso if i % 2 else -paso) // 1, y) for i, (x, y) in enumerate(pts)]


def _farol(t, fx, fy, llama):
    """Farol colgando de la cadena que sale de (fx, fy-2): caja de hierro con la luz tenue dentro."""
    put(t, fx, fy - 3, HIERRO); put(t, fx, fy - 2, HIERRO)
    for x in range(fx - 2, fx + 3):
        put(t, x, fy - 1, HIERRO); put(t, x, fy + 3, HIERRO)
    for y in range(fy, fy + 3):
        put(t, fx - 2, y, HIERRO); put(t, fx + 2, y, HIERRO)
        for x in range(fx - 1, fx + 2):
            put(t, x, y, LUZ[0] if llama else LUZ[1])
    put(t, fx, fy + 1, LUZ[2] if llama else LUZ[1])


def _baston(t, x, y0, y1, curva=1):
    line(t, x, y0, x, y1, MADERA[1])
    line(t, x, y0 + 7, x, y1, MADERA[0])
    put(t, x + curva, y0 - 1, MADERA[2]); put(t, x + 2 * curva, y0, MADERA[1]); put(t, x, y0 - 1, MADERA[2])
    put(t, x - curva, y0 - 2, MADERA[1])


def _frente(t, dy, bal, llama, paso):
    shade(t, ell_mask(t, 11 + paso * 0.5, 17 + dy, 5.2, 7), CAPA, bias=-0.3)
    bajo = _bajo([(25, 28), (23, 29), (21, 28), (18, 29), (15, 28), (12, 29), (10, 28), (8, 29)], paso)
    shade(t, poly_mask(t, [(12, 14 + dy), (20, 14 + dy), (22, 20 + dy), (25, 27 + dy)] + bajo[1:] + [(8, 21 + dy)]),
          CAPA, bias=-0.15)
    for x, y1 in ((11, 27), (14, 28), (18, 27), (22, 26)):  # pliegues
        line(t, x, 21 + dy, x + (x - 15) // 4 + paso, y1 + dy, CAPA[0])
    for x, y in ((13, 29), (14, 29), (13, 30), (14, 30), (19, 29), (20, 29), (19, 30), (20, 30)):
        if not (paso > 0 and x >= 19 and y == 30) and not (paso < 0 and x <= 14 and y == 30):
            put(t, x, y, MADERA[0])  # botas: la del pie que se levanta se queda en una fila
    shade(t, poly_mask(t, [(13, 6 + dy), (18, 7 + dy), (21, 10 + dy), (21, 15 + dy), (12, 16 + dy), (9, 13 + dy),
                           (10, 10 + dy)]), CAPA, bias=-0.05)
    t[ell_mask(t, 15.2, 11.6 + dy, 2.7, 3.2)] = (*VACIO, 255)
    by = -1 if paso else 0  # el bastón se levanta un poco al dar el paso
    _baston(t, 24, 5 + dy + by, 30 + by)
    shade(t, poly_mask(t, [(19, 15 + dy), (22, 17 + dy), (24, 20 + dy), (22, 22 + dy), (19, 19 + dy)]), CAPA, bias=-0.1)
    put(t, 24, 19 + dy + by, MANO[1]); put(t, 24, 20 + dy + by, MANO[0]); put(t, 23, 20 + dy + by, MANO[0])
    fx, fy = 7 + bal, 25 + dy
    shade(t, poly_mask(t, [(12, 15 + dy), (9, 19 + dy), (6, 22 + dy), (8, 23 + dy), (12, 20 + dy)]), CAPA, bias=-0.1)
    put(t, fx, fy - 4, MANO[1]); put(t, fx - 1, fy - 4, MANO[0])
    _farol(t, fx, fy, llama)
    return fx, fy


def _perfil(t, dy, bal, llama, paso):
    """De perfil mirando a la derecha: giba atrás, capucha en pico delante, el bastón por delante."""
    shade(t, ell_mask(t, 10.5, 16.5 + dy, 5.5, 7), CAPA, bias=-0.3)
    bajo = _bajo([(22, 28), (20, 29), (18, 28), (15, 29), (12, 28), (9, 29), (7, 28)], paso)
    shade(t, poly_mask(t, [(11, 14 + dy), (18, 14 + dy), (21, 20 + dy), (22, 27 + dy)] + bajo[1:] + [(7, 22 + dy)]),
          CAPA, bias=-0.15)
    for x, y1 in ((10, 27), (13, 28), (17, 27)):
        line(t, x, 21 + dy, x + 1 + paso, y1 + dy, CAPA[0])
    # Botas: una adelanta y la otra queda atrás; la punta mira a la derecha
    for bx in (13 - paso * 2, 18 + paso * 2):
        for x in range(bx - 1, bx + 2):
            put(t, x, 29, MADERA[0]); put(t, x, 30, MADERA[0])
        put(t, bx + 2, 30, MADERA[0])
    shade(t, poly_mask(t, [(12, 7 + dy), (17, 7 + dy), (21, 10 + dy), (23, 14 + dy), (18, 15 + dy), (11, 16 + dy),
                           (9, 12 + dy)]), CAPA, bias=-0.05)
    t[ell_mask(t, 19.2, 12.4 + dy, 2.0, 2.4)] = (*VACIO, 255)
    sx = 26 + (paso if paso > 0 else 0)  # el bastón se planta delante en el paso
    by = -1 if paso < 0 else 0
    _baston(t, sx, 5 + dy + by, 30 + by)
    shade(t, poly_mask(t, [(17, 15 + dy), (21, 17 + dy), (sx - 1, 20 + dy), (sx - 2, 22 + dy), (18, 20 + dy)]), CAPA,
          bias=-0.1)
    put(t, sx, 19 + dy + by, MANO[1]); put(t, sx, 20 + dy + by, MANO[0])
    fx, fy = 7 + bal, 25 + dy
    shade(t, poly_mask(t, [(12, 15 + dy), (9, 19 + dy), (7, 22 + dy), (9, 23 + dy), (12, 20 + dy)]), CAPA, bias=-0.1)
    put(t, fx, fy - 4, MANO[1])
    _farol(t, fx, fy, llama)
    return fx, fy


def _espalda(t, dy, bal, llama, paso):
    """De espaldas: la capucha es solo tela con un pliegue; el bastón y el farol asoman a los lados."""
    shade(t, ell_mask(t, 16, 17 + dy, 8, 8), CAPA, bias=-0.3)
    bajo = _bajo([(25, 28), (23, 29), (21, 28), (18, 29), (15, 28), (12, 29), (10, 28), (8, 29)], paso)
    shade(t, poly_mask(t, [(10, 14 + dy), (22, 14 + dy), (24, 20 + dy), (25, 27 + dy)] + bajo[1:] + [(7, 21 + dy)]),
          CAPA, bias=-0.15)
    line(t, 16, 18 + dy, 16 + paso, 28 + dy, CAPA[0])
    for x, y1 in ((11, 27), (13, 28), (19, 27), (22, 26)):
        line(t, x, 21 + dy, x + (x - 16) // 5 + paso, y1 + dy, CAPA[0])
    for x, y in ((13, 29), (14, 29), (13, 30), (14, 30), (19, 29), (20, 29), (19, 30), (20, 30)):
        if not (paso > 0 and x >= 19 and y == 30) and not (paso < 0 and x <= 14 and y == 30):
            put(t, x, y, MADERA[0])
    shade(t, poly_mask(t, [(13, 6 + dy), (19, 6 + dy), (22, 10 + dy), (22, 15 + dy), (10, 15 + dy), (10, 10 + dy)]),
          CAPA, bias=-0.1)
    line(t, 16, 8 + dy, 16, 14 + dy, CAPA[0])  # el pliegue de la capucha
    by = -1 if paso else 0
    _baston(t, 25, 5 + dy + by, 30 + by)
    shade(t, poly_mask(t, [(21, 15 + dy), (24, 17 + dy), (25, 20 + dy), (23, 22 + dy), (20, 19 + dy)]), CAPA, bias=-0.1)
    put(t, 25, 19 + dy + by, MANO[1]); put(t, 25, 20 + dy + by, MANO[0])
    fx, fy = 6 + bal, 25 + dy
    shade(t, poly_mask(t, [(11, 15 + dy), (8, 19 + dy), (5, 22 + dy), (7, 23 + dy), (11, 20 + dy)]), CAPA, bias=-0.1)
    put(t, fx, fy - 4, MANO[1])
    _farol(t, fx, fy, llama)
    return fx, fy


def dibujar(vista, dy=0, bal=0, llama=0, paso=0):
    t = tile(S, S)
    fx, fy = {"frente": _frente, "lado": _perfil, "espalda": _espalda}[vista](t, dy, bal, llama, paso)
    outline(t, OUT)
    # La luz del farol tiñe un poco la capa cercana (nunca la sombra de la capucha)
    ys, xs = np.nonzero(t[:, :, 3] == 255)
    for y, x in zip(ys, xs):
        d = math.hypot(x - fx, y - (fy + 1))
        r, g, b = (int(v) for v in t[y, x, :3])
        if 2.5 < d < 7 and (r + g + b) > 60 and y > 15:
            k = 0.28 * (1 - (d - 2.5) / 4.5) * (1.0 if llama else 0.8)
            t[y, x, :3] = [int(r + (LUZ[1][0] - r) * k), int(g + (LUZ[1][1] - g) * k), int(b + (LUZ[1][2] - b) * k)]
    for y in range(S):  # halo suave alrededor del farol
        for x in range(S):
            d = math.hypot(x - fx, y - (fy + 1))
            if 3.2 < d < 5.5 and t[y, x, 3] == 0:
                t[y, x] = (*LUZ[0], 70 if d < 4.4 else 34)
    ground_shadow(t, 16, S - 2, 11, 2)
    return t


# idle: respira (el cuerpo baja un píxel) y el farol titila; walk: el cuerpo sube al pasar, el farol oscila al revés
_IDLE = [dict(dy=0, bal=0, llama=0), dict(dy=1, bal=1, llama=1)]
_WALK = [dict(dy=0, bal=1, llama=0, paso=1), dict(dy=-1, bal=0, llama=1, paso=0),
         dict(dy=0, bal=-1, llama=0, paso=-1), dict(dy=-1, bal=0, llama=1, paso=0)]


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja. `left` es `right` volteado (igual que en las demás hojas)."""
    vista = {"down": "frente", "up": "espalda", "left": "lado", "right": "lado"}[direccion]
    pose = (_WALK if anim == "walk" else _IDLE)[i % (4 if anim == "walk" else 2)]
    t = dibujar(vista, **pose)
    return t[:, ::-1].copy() if direccion == "left" else t


def vista_previa(ruta):
    """Cada fila, una dirección (abajo, izquierda, derecha, arriba): 2 de idle y 4 de walk, a x6 sobre un suelo oscuro."""
    esc, m = 6, 6
    columnas = [("idle", 0), ("idle", 1)] + [("walk", i) for i in range(4)]
    img = Image.new("RGBA", (m + len(columnas) * (S * esc + m), m + 4 * (S * esc + m)), (44, 40, 54, 255))
    for r, d in enumerate(("down", "left", "right", "up")):
        for c, (anim, i) in enumerate(columnas):
            f = to_img(fotograma(d, anim, i)).resize((S * esc, S * esc), Image.NEAREST)
            img.alpha_composite(f, (m + c * (S * esc + m), m + r * (S * esc + m)))
    img.save(ruta)


if __name__ == "__main__":
    raiz = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
    vista_previa(os.path.join(raiz, "docs", "previews", "ermitano_x8.png"))
    print("ok")
