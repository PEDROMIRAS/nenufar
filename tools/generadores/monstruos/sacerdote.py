"""Sacerdote de la luna falsa (48x48), jefe del Cauce Seco. Una figura encapuchada y sin rostro, de túnica
negra con pliegues y una hebilla dorada en el cinturón. Sobre la cabeza lleva la luna falsa: una aureola de
fuego con rayos en cruz. Las dos manos arden. Sobrio y amenazador: casi todo es negro, y la única luz es el
fuego (la referencia es la imagen 3 del documento de diseño).

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos (la aureola llega a la fila 4).
Hoja del repo: idle (2: la aureola y las llamas pulsan), walk (4: no anda, los jefes no se mueven por la sala),
atacar (3: alza los brazos, la aureola crece y los rayos brillan) y golpe (1, destello). Las cuatro
direcciones usan la misma vista, de frente."""
import math

import numpy as np
from dibujo import tile, put, line, outline, ell_mask, poly_mask, shade, limb, flame, ground_shadow, rng

S = 48
TUNICA = [(14, 12, 20), (28, 26, 38), (44, 42, 58), (66, 64, 84)]
VACIO = (4, 3, 6)
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
OJO = [(226, 98, 24), (255, 186, 64)]
ORO = [(164, 118, 46), (226, 180, 72)]
CINTURON = (58, 40, 30)
OUT = (6, 4, 10)
CX, CY_AUREOLA = 24, 16


def aureola(t, radio, brillo, fase):
    """La luna falsa: anillo de fuego de 2 px con cuatro rayos en cruz, y chispas sueltas fuera."""
    for y in range(S):
        for x in range(S):
            d = math.hypot(x + 0.5 - CX, y + 0.5 - CY_AUREOLA)
            if radio - 1.3 <= d <= radio + 0.7:
                arriba = y + 0.5 < CY_AUREOLA - radio * 0.4
                c = FUEGO[3] if arriba and brillo else (FUEGO[2] if arriba or brillo else FUEGO[1])
                put(t, x, y, c)
            elif radio + 0.7 < d <= radio + 1.7 and (x * 3 + y * 5 + fase) % 4 == 0:
                put(t, x, y, FUEGO[0])
    largo = 4 + brillo * 2
    for dx, dy in ((0, -1), (1, 0), (-1, 0)):
        # El rayo de arriba no pasa de la fila 4: el nombre del jefe no queda tapado
        tope = int(CY_AUREOLA - 4) if dy < 0 else 99
        for k in range(int(radio + 1), min(int(radio + largo), tope + 1)):
            put(t, CX + dx * k, CY_AUREOLA + dy * k, FUEGO[2] if k < radio + largo - 2 else FUEGO[1])


def dibujar(pulso=0, brazos=0, llama=7, brillo=0, fase=0):
    t = tile(S, S)
    # Túnica larga, que se ensancha hasta el suelo, con el dobladillo en picos
    cuerpo = poly_mask(t, [(16, 24), (32, 24), (36, 36), (39, 46), (34, 44), (30, 46), (26, 44), (22, 46), (18, 44),
                           (14, 46), (9, 46), (12, 36)])
    shade(t, cuerpo, TUNICA, bias=-0.15)
    for x in (17, 21, 26, 30):  # pliegues
        line(t, x, 30, x + (x - 24) // 3, 44, TUNICA[0])
    line(t, 20, 26, 14, 44, TUNICA[2])
    # Cinturón y hebilla dorada
    for x in range(12, 37):
        if cuerpo[32, x]:
            put(t, x, 32, CINTURON); put(t, x, 33, CINTURON)
    put(t, 23, 32, ORO[1]); put(t, 24, 32, ORO[1]); put(t, 23, 33, ORO[0]); put(t, 24, 33, ORO[0])
    # Brazos y mangas anchas: hacia las manos, que arden
    mano_y = 31 - brazos * 7
    for s in (-1, 1):
        hombro = (CX + s * 8, 25)
        mano = (CX + s * (15 + brazos), mano_y)
        limb(t, hombro, (CX + s * 12, 27 + (1 - brazos) * 2), 3.4, 3.0, TUNICA, bias=-0.1)
        limb(t, (CX + s * 12, 27 + (1 - brazos) * 2), mano, 3.0, 2.2, TUNICA, bias=-0.05)
        put(t, mano[0], mano[1], FUEGO[1])
    # Capucha: un óvalo alto con el vacío dentro y dos ojos de brasa
    capucha = poly_mask(t, [(24, 8), (29, 11), (32, 17), (33, 24), (15, 24), (16, 17), (19, 11)])
    shade(t, capucha, TUNICA, bias=-0.05)
    vacio = ell_mask(t, 24, 18, 4.6, 6.2)
    t[vacio] = (*VACIO, 255)
    put(t, 22, 17, OJO[1]); put(t, 26, 17, OJO[1])
    put(t, 21, 17, OJO[0]); put(t, 27, 17, OJO[0])
    line(t, 21, 15, 23, 16, TUNICA[0]); line(t, 27, 15, 25, 16, TUNICA[0])  # ceño
    outline(t, OUT)
    # Fuego: la luna falsa y las llamas de las manos (sin contorno: brillan)
    aureola(t, 8 + pulso, brillo, fase)
    for s in (-1, 1):
        flame(t, CX + s * (15 + brazos), mano_y, llama + brazos * 3, 3 + brazos, fase + (2 if s > 0 else 0), FUEGO)
    g = rng(5 + fase)
    for _ in range(5):  # chispas sueltas
        put(t, g.randint(6, 41), g.randint(8, 40), FUEGO[1 + (g.random() > 0.6)])
    ground_shadow(t, CX, S - 2, 15, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. De frente en las cuatro direcciones."""
    if anim in ("idle", "walk"):
        n = [0, 1, 0, 1][i % 4]
        return dibujar(pulso=n, llama=6 + n, brillo=n, fase=i)
    if anim == "atacar":
        return [lambda: dibujar(pulso=1, brazos=1, llama=7, brillo=0, fase=1),
                lambda: dibujar(pulso=2, brazos=1, llama=9, brillo=1, fase=2),
                lambda: dibujar(pulso=1, brazos=0, llama=8, brillo=1, fase=3)][i]()
    return dibujar(pulso=0, brazos=0, llama=5, brillo=0, fase=0)
