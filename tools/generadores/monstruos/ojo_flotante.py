"""Ojo flotante (48x48), jefe violeta de la Cripta. Una bola de carne amoratada con un único ojo
enorme: párpados gruesos y venosos, esclerótica amarillenta con venas, iris violeta que brilla y
pupila rasgada. Encima, una corona de púas de hueso; debajo cuelgan tentáculos con ventosas que se
enroscan en la punta. Flota sobre el suelo y ataca con la mirada: veneno, quemaduras y parálisis.

Cabe en 48 de alto con la sombra en 46 y no sube más de ~42 px sobre ella.
Hoja del repo: idle (2: sube y baja), walk (4: flota), atacar (3: abre el ojo de par en par, la
mirada estalla en un rayo y vuelve) y golpe (1: cierra el ojo; la hoja lo pasa a blanco)."""
import math

import numpy as np
from dibujo import tile, put, line, outline, ell_mask, poly_mask, shade, limb, ground_shadow

S = 48
CARNE = [(40, 20, 44), (72, 38, 76), (106, 60, 106), (146, 92, 138), (188, 132, 172)]
MANCHA = (126, 70, 112)
TENTA = [(52, 26, 56), (88, 48, 90), (126, 76, 124), (170, 116, 160)]
VENTOSA = (214, 170, 196)
BLANCO = [(178, 166, 138), (222, 212, 180), (246, 240, 220)]
VENA = (176, 52, 62)
IRIS = [(70, 30, 120), (140, 84, 220), (198, 160, 255)]
GLOW = [(176, 124, 255), (236, 214, 255)]
PUPILA = (10, 6, 14)
HUESO = [(150, 140, 126), (210, 202, 186)]
OUT = (16, 8, 20)


def tentaculo(t, x0, y0, largo, fase, lado):
    """Tentáculo que cuelga y se enrosca hacia `lado` en la punta, con ventosas en la cara de dentro."""
    p = (x0, y0)
    puntos = [p]
    for s in range(1, 5):
        onda = math.sin(fase * 1.5 + x0 * 0.7 + s * 1.1) * 1.6
        p = (x0 + lado * s * 1.3 + onda, y0 + largo * s / 4)
        puntos.append(p)
    rizo = (p[0] + lado * 2.5, p[1] - 1.5)
    for i in range(4):
        limb(t, puntos[i], puntos[i + 1], 2.0 - i * 0.4, 1.6 - i * 0.4, TENTA, bias=0.05)
    limb(t, puntos[4], rizo, 0.6, 0.4, TENTA)
    for i in (1, 2, 3):  # ventosas
        x, y = puntos[i]
        put(t, round(x - lado), round(y), VENTOSA)


def dibujar(alto=0, fase=0, abre=1.0, cerrado=False, rayo=False):
    t = tile(S, S)
    cx, cy = 24, 18 + alto
    # tentáculos por detrás del cuerpo
    for k, (x0, largo, lado) in enumerate(((15, 15, -1), (21, 19, -1), (27, 19, 1), (33, 15, 1))):
        tentaculo(t, x0, cy + 8, largo, fase + k, lado)
    # corona de púas de hueso
    for ang in (-60, -35, -12, 12, 35, 60):
        a = math.radians(ang - 90)
        x0, y0 = cx + math.cos(a) * 10, cy + math.sin(a) * 9.5
        limb(t, (x0, y0), (cx + math.cos(a) * 15, cy + math.sin(a) * 13.5), 1.4, 0.3, HUESO)
    # cuerpo de carne con manchas
    cuerpo = ell_mask(t, cx, cy, 13, 12)
    shade(t, cuerpo, CARNE, bias=0.05)
    for x, y in ((14, -6), (34, -3), (16, 6), (31, 8), (28, -9), (19, -10)):
        put(t, x, cy + y, MANCHA); put(t, x + 1, cy + y, MANCHA)
    outline(t, OUT)
    # párpados gruesos alrededor del ojo
    shade(t, ell_mask(t, cx, cy + 1, 10.5, 8.5), CARNE, bias=-0.2)
    if cerrado:
        line(t, cx - 9, cy + 1, cx + 9, cy + 1, OUT)
        for x in range(cx - 8, cx + 9, 3):  # pestañas
            put(t, x, cy + 2, OUT)
        put(t, cx + 3, cy + 4, GLOW[1])  # una lágrima de luz
    else:
        ry = 4.5 + 2.5 * abre
        ojo = ell_mask(t, cx, cy + 1, 8.5, ry)
        shade(t, ojo, BLANCO, bias=0.1, rim=False)
        borde = ojo & ~ell_mask(t, cx, cy + 1, 7.5, ry - 1)
        t[borde & (np.mgrid[0:S, 0:S][0] < cy + 1)] = (*CARNE[0], 255)  # sombra del párpado de arriba
        for x0, y0, x1, y1 in ((cx - 8, cy, cx - 4, cy + 1), (cx - 7, cy + 4, cx - 4, cy + 2), (cx + 8, cy + 2, cx + 5, cy + 1), (cx + 7, cy - 1, cx + 5, cy)):
            line(t, x0, y0, x1, y1, VENA)
        iris = IRIS if not rayo else [IRIS[1], IRIS[2], GLOW[1]]
        shade(t, ell_mask(t, cx, cy + 1, 4.5, 4.5), iris, bias=0.1, rim=False)
        for y in range(cy - 2, cy + 5):  # pupila rasgada
            put(t, cx, y, PUPILA)
        put(t, cx - 1, cy + 1, PUPILA); put(t, cx + 1, cy + 1, PUPILA)
        put(t, cx - 2, cy - 1, BLANCO[2]); put(t, cx - 3, cy, GLOW[1])
    if rayo:  # la mirada estalla en un rayo hacia la heroína, abajo
        pts = [(cx - 2, cy + 4), (cx + 2, cy + 4), (cx + 9, S - 2), (cx - 9, S - 2)]
        m = poly_mask(t, pts) & ~ell_mask(t, cx, cy, 13, 12)
        ys, xs = m.nonzero()
        for y, x in zip(ys, xs):
            d = abs(x - cx) / max(2 + (y - cy) * 0.35, 1)
            t[y, x] = (*(GLOW[1] if d < 0.35 else GLOW[0] if d < 0.75 else IRIS[1]), 255)
    ground_shadow(t, S // 2, S - 2, 11, 1.6)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. Solo mira de frente: todas las filas son la misma vista."""
    if anim == "idle":
        return dibujar(alto=[0, -1][i], fase=i * 2, abre=0.8)
    if anim == "walk":
        return dibujar(alto=[0, -1, -1, 0][i], fase=i, abre=0.8)
    if anim == "atacar":
        return [lambda: dibujar(alto=-1, fase=1, abre=1.3),
                lambda: dibujar(alto=0, fase=2, abre=1.3, rayo=True),
                lambda: dibujar(alto=0, fase=3, abre=0.8)][i]()
    return dibujar(alto=1, fase=0, cerrado=True)
