"""Ermitaño (32x32), el personaje de la sala de evento del mismo nombre (entrega 2b). Una figura encorvada, de
pie, con la capucha echada hacia delante: dentro solo hay sombra, ninguna cara. Se apoya en un bastón torcido con
la mano derecha y de la izquierda cuelga un farol pequeño de luz tenue, que apenas tiñe la capa. Capa raída en
grises pardos, sobria y oscura (nada de ojos grandes ni colores vivos).

Cabe en 32 de alto con los pies en 30. Solo tiene `idle` (2 fotogramas: el farol se balancea y la llama titila);
no anda ni lucha. Todas las direcciones usan la misma vista, de frente.
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
FAROL = (7, 25)  # dónde cuelga el farol (centro de la caja de luz) en reposo


def dibujar(balanceo=0, llama=0):
    t = tile(S, S)
    fx, fy = FAROL[0] + balanceo, FAROL[1]
    # Giba: el lomo encorvado hacia la izquierda, más alto que la cabeza
    shade(t, ell_mask(t, 11, 17, 5.2, 7), CAPA, bias=-0.3)
    # Capa larga, estrecha arriba y ancha por abajo, con el bajo raído a trozos
    bajo = [(25, 28), (23, 29), (21, 28), (18, 29), (15, 28), (12, 29), (10, 28), (8, 29)]
    cuerpo = poly_mask(t, [(12, 14), (20, 14), (22, 20), (25, 27)] + bajo[1:] + [(8, 21)])
    shade(t, cuerpo, CAPA, bias=-0.15)
    for x, y1 in ((11, 27), (14, 28), (18, 27), (22, 26)):  # pliegues
        line(t, x, 21, x + (x - 15) // 4, y1, CAPA[0])
    # Botas que asoman bajo el bajo
    for x in (13, 14, 19, 20):
        put(t, x, 29, MADERA[0]); put(t, x, 30, MADERA[0])
    # Capucha puntiaguda caída hacia delante, con un vacío pequeño dentro
    capucha = poly_mask(t, [(13, 6), (18, 7), (21, 10), (21, 15), (12, 16), (9, 13), (10, 10)])
    shade(t, capucha, CAPA, bias=-0.05)
    t[ell_mask(t, 15.2, 11.6, 2.7, 3.2)] = (*VACIO, 255)
    # Bastón torcido en la mano derecha, bastante más alto que la capucha, con la punta curvada
    line(t, 24, 5, 24, 30, MADERA[1])
    line(t, 24, 12, 24, 29, MADERA[0])
    put(t, 25, 4, MADERA[2]); put(t, 26, 5, MADERA[1]); put(t, 24, 4, MADERA[2]); put(t, 23, 3, MADERA[1])
    # Manga y mano derecha agarrando el bastón
    manga_d = poly_mask(t, [(19, 15), (22, 17), (24, 20), (22, 22), (19, 19)])
    shade(t, manga_d, CAPA, bias=-0.1)
    put(t, 24, 19, MANO[1]); put(t, 24, 20, MANO[0]); put(t, 23, 20, MANO[0])
    # Manga y mano izquierda, de la que cuelga el farol por una cadena corta
    manga_i = poly_mask(t, [(12, 15), (9, 19), (6, 22), (8, 23), (12, 20)])
    shade(t, manga_i, CAPA, bias=-0.1)
    put(t, fx, fy - 4, MANO[1]); put(t, fx - 1, fy - 4, MANO[0])
    put(t, fx, fy - 3, HIERRO); put(t, fx, fy - 2, HIERRO)
    # Farol: caja de hierro con la luz tenue dentro
    for x in range(fx - 2, fx + 3):
        put(t, x, fy - 1, HIERRO); put(t, x, fy + 3, HIERRO)
    for y in range(fy, fy + 3):
        put(t, fx - 2, y, HIERRO); put(t, fx + 2, y, HIERRO)
    for y in range(fy, fy + 3):
        for x in range(fx - 1, fx + 2):
            put(t, x, y, LUZ[0] if llama else LUZ[1])
    put(t, fx, fy + 1, LUZ[2] if llama else LUZ[1])
    outline(t, OUT)
    # La luz del farol tiñe un poco la capa cercana (nunca la sombra de la capucha)
    ys, xs = np.nonzero(t[:, :, 3] == 255)
    for y, x in zip(ys, xs):
        d = math.hypot(x - fx, y - (fy + 1))
        r, g, b = (int(v) for v in t[y, x, :3])
        if 2.5 < d < 7 and (r + g + b) > 60 and y > 15:
            k = 0.28 * (1 - (d - 2.5) / 4.5) * (1.0 if llama else 0.8)
            t[y, x, :3] = [int(r + (LUZ[1][0] - r) * k), int(g + (LUZ[1][1] - g) * k), int(b + (LUZ[1][2] - b) * k)]
    # Halo suave alrededor del farol
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - fx, y - (fy + 1))
            if 3.2 < d < 5.5 and t[y, x, 3] == 0:
                t[y, x] = (*LUZ[0], 70 if d < 4.4 else 34)
    ground_shadow(t, 16, S - 2, 11, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja. Solo idle: el farol se balancea un píxel y la llama titila."""
    n = i % 2
    return dibujar(balanceo=n, llama=n)


def vista_previa(ruta):
    """Los dos fotogramas a tamaño real (arriba) y a x8 sobre un suelo oscuro."""
    suelo = (44, 40, 54, 255)
    ancho = S * 2 * 8 + 24
    img = Image.new("RGBA", (ancho, S * 8 + 16), suelo)
    for i in range(2):
        f = to_img(fotograma("down", "idle", i)).resize((S * 8, S * 8), Image.NEAREST)
        img.alpha_composite(f, (8 + i * (S * 8 + 8), 8))
    img.save(ruta)


if __name__ == "__main__":
    raiz = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
    vista_previa(os.path.join(raiz, "docs", "previews", "ermitano_x8.png"))
    print("ok")
