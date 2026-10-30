"""Sacerdote de la luna falsa (48x48), jefe del Cauce Seco. Una figura alta y flaca, encapuchada y sin rostro,
con los brazos abiertos y las mangas hechas jirones; el bajo de la túnica, desgarrado, arde de brasas. Detrás de
la cabeza, la luna falsa: un sol de fuego roto, con púas, que lo ilumina por detrás. Del vacío de la capucha
solo salen dos rendijas furiosas. Las manos, de garra, sostienen llamas. Casi todo es negro: la única luz es el
fuego (la referencia es la imagen 3 del documento de diseño).

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos (la aureola llega a la fila 4).
Hoja del repo: idle (2: la aureola y las llamas pulsan, el bajo ondea), walk (4: no anda, los jefes no se mueven por
la sala), atacar (3: alza los brazos, la aureola crece y las púas se alargan) y golpe (1, destello). Las cuatro
direcciones usan la misma vista, de frente."""
import math

import numpy as np
from dibujo import tile, put, line, outline, ell_mask, poly_mask, shade, flame, ground_shadow, rng

S = 48
TUNICA = [(10, 8, 14), (22, 20, 30), (38, 36, 50), (58, 56, 74)]
VACIO = (2, 1, 3)
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
OJO = [(226, 98, 24), (255, 214, 96), (255, 250, 220)]
HUESO = [(96, 88, 80), (170, 160, 140)]
CINTA = (110, 24, 22)
LUZ = (150, 64, 28)  # el borde de la túnica que mira a la luna falsa
OUT = (4, 3, 8)
CX, CY = 24, 16  # centro de la luna falsa


def luna(t, radio, brillo, fase):
    """La luna falsa: anillo de fuego roto con púas alrededor, y brasas dentro."""
    for y in range(S):
        for x in range(S):
            dx, dy = x + 0.5 - CX, y + 0.5 - CY
            d = math.hypot(dx, dy)
            ang = (math.degrees(math.atan2(dy, dx)) + 360) % 360
            if radio - 1.2 <= d <= radio + 0.6 and int(ang // 22) % 5 != fase % 5:
                arriba = dy < -radio * 0.3
                put(t, x, y, FUEGO[3] if arriba and brillo else (FUEGO[2] if arriba or brillo else FUEGO[1]))
            elif radio - 3 <= d < radio - 1.2 and (x + y * 3 + fase) % 5 == 0:
                put(t, x, y, FUEGO[0])
    for ang in range(0, 360, 30):
        a = math.radians(ang + (6 if fase % 2 else 0))
        largo = 2.5 + brillo * 2 + (1 if ang % 90 == 0 else 0)
        for k in range(int(radio + 1), int(radio + 1 + largo)):
            x, y = CX + math.cos(a) * k, CY + math.sin(a) * k
            if y >= 4:
                put(t, x, y, FUEGO[2] if k < radio + largo - 1 else FUEGO[1])


def dibujar(pulso=0, brazos=0, llama=8, brillo=0, fase=0):
    t = tile(S, S)
    mano_y = 24 - brazos * 6
    # Túnica larga y estrecha, con el bajo desgarrado en jirones desiguales
    bajo = [(38, 45), (36, 40), (33, 46), (30, 41), (27, 46), (24, 40), (21, 46), (18, 42), (15, 46), (12, 41), (10, 45)]
    cuerpo = poly_mask(t, [(17, 23), (31, 23), (33, 32), (38, 44)] + bajo[1:-1] + [(10, 44), (15, 32)])
    shade(t, cuerpo, TUNICA, bias=-0.2)
    for x in (18, 22, 26, 30):  # pliegues largos
        line(t, x, 28, x + (x - 24) // 2, 42 + (x % 2), TUNICA[0])
    # Cinta rasgada que cuelga de la cintura
    line(t, 24, 30, 24, 42, CINTA, 2)
    line(t, 25, 38, 26, 44, CINTA)
    # Mangas largas y rasgadas, con los brazos abiertos
    for s in (-1, 1):
        hx = CX + s * 17
        manga = poly_mask(t, [(CX + s * 6, 23), (hx, mano_y - 1), (CX + s * 20, mano_y + 8), (CX + s * 18, mano_y + 15),
                              (CX + s * 15, mano_y + 10), (CX + s * 12, mano_y + 17), (CX + s * 10, mano_y + 9),
                              (CX + s * 7, 31)])
        shade(t, manga, TUNICA, bias=-0.25)
        for k in range(3):  # dedos de garra
            line(t, hx + s * (k - 1), mano_y - 1, hx + s * (k - 1) * 2, mano_y - 4, HUESO[1])
    # Capucha alta y puntiaguda, con el vacío dentro y dos rendijas de ojos furiosas
    capucha = poly_mask(t, [(24, 6), (28, 11), (30, 18), (32, 24), (16, 24), (18, 18), (20, 11)])
    shade(t, capucha, TUNICA, bias=-0.1)
    t[ell_mask(t, 24, 17, 4.2, 6.2)] = (*VACIO, 255)
    ojo = OJO[2] if brillo else OJO[1]
    for s in (-1, 1):
        # Rendija inclinada: más alta por fuera y más baja hacia la nariz
        for dx, dy in ((4, 0), (3, 0), (2, 1), (1, 1)):
            put(t, CX + (dx if s > 0 else -dx) - (0 if s > 0 else 1), 16 + dy, ojo if dx < 4 else OJO[0])
    outline(t, OUT)
    # Luz de la luna falsa en los bordes de arriba de la capucha y los hombros
    ys, xs = np.nonzero(t[:, :, 3] == 255)
    for y, x in zip(ys, xs):
        if y > 0 and t[y - 1, x, 3] == 0 and math.hypot(x - CX, y - CY) < 16:
            t[y, x] = (*LUZ, 255)
    # Fuego: la luna falsa y las llamas de las manos (sin contorno: brillan)
    luna(t, 9 + pulso, brillo, fase)
    for s in (-1, 1):
        flame(t, CX + s * 17, mano_y - 4, llama + brazos, 4, fase + (2 if s > 0 else 0), FUEGO)
    g = rng(5 + fase)
    for _ in range(7):  # chispas sueltas
        put(t, g.randint(6, 41), g.randint(8, 44), FUEGO[1 + (g.random() > 0.6)])
    for x in range(11, 38, 3):  # brasas del bajo
        if (x + fase) % 2:
            put(t, x, 44 + (x % 2), FUEGO[0])
    ground_shadow(t, CX, S - 2, 17, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. De frente en las cuatro direcciones."""
    if anim in ("idle", "walk"):
        n = [0, 1, 0, 1][i % 4]
        return dibujar(pulso=n, llama=7 + n, brillo=n, fase=i)
    if anim == "atacar":
        return [lambda: dibujar(pulso=1, brazos=1, llama=7, brillo=0, fase=1),
                lambda: dibujar(pulso=1, brazos=1, llama=8, brillo=1, fase=2),
                lambda: dibujar(pulso=1, brazos=0, llama=9, brillo=1, fase=3)][i]()
    return dibujar(pulso=0, brazos=0, llama=5, brillo=0, fase=0)
