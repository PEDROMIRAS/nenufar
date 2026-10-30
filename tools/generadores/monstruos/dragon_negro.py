"""Dragón negro (64x48), el jefe violeta más raro: puede salir en cualquier zona. Erguido y de perfil,
mirando a la izquierda (hacia la heroína): escamas negras, vientre de placas color arena, cresta
de púas, ojos rojos y alas grandes de membrana oscura; la cola se enrosca a su espalda. Su golpe
cargado es un aliento de fuego. Al vencerlo da su Corazón. (Concepto de Pedro, 2026-10-25.)

Como el Rey sin Charca, mide 64x48 con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira), walk (4: no anda), atacar (3: echa la cabeza atrás con la boca
encendida, escupe el fuego y vuelve) y golpe (1, destello)."""
import numpy as np
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow, rng, fire_band

W, H = 64, 48
NEGRO = [(6, 5, 10), (16, 14, 24), (30, 28, 42), (52, 48, 70), (84, 80, 106)]
MEMBRANA = [(20, 18, 28), (34, 30, 44), (52, 46, 64)]
PLACA = [(96, 74, 50), (140, 112, 76), (184, 154, 108), (214, 190, 140)]
GARRA = [(150, 148, 156), (210, 208, 214)]
OJO = [(150, 20, 20), (236, 50, 40), (255, 170, 120)]
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
HUESO = [(96, 88, 76), (150, 140, 120), (206, 196, 172)]
BRASA = (196, 70, 22)
OUT = (6, 4, 10)


def escamas(t, m):
    """Textura de escamas: medias lunas oscuras al tresbolillo sobre lo ya sombreado."""
    ys, xs = m.nonzero()
    for y, x in zip(ys, xs):
        if (x + (y // 2) * 2) % 4 == 0 and y % 2 == 0:
            r, g, b = (int(v) for v in t[y, x, :3])
            t[y, x] = (max(0, r - 14), max(0, g - 14), max(0, b - 16), 255)


def ala(t, alza):
    """El ala de este lado, grande, detrás del cuerpo: membrana festoneada y huesos marcados."""
    hombro = (36, 19)
    codo = (48, 6 - alza)
    puntas = [(62, 10 - alza), (60, 24), (54, 21), (51, 29), (46, 25), (42, 30)]
    m = poly_mask(t, [hombro, codo] + puntas + [(38, 26)])
    shade(t, m, MEMBRANA, bias=0.1)
    for p in puntas[::2]:
        line(t, *codo, *p, NEGRO[2])
    limb(t, hombro, codo, 2.2, 1.6, NEGRO, bias=0.1)
    limb(t, codo, puntas[0], 1.4, 0.6, NEGRO, bias=0.1)


def dibujar(respira=0, ojos=1.0, carga=0.0, aliento=False, alza=0, cabeza=(0, 0)):
    t = tile(H, W)
    b = respira
    hx, hy = cabeza
    # el ala de detrás (la del otro lado), solo asoma por encima del lomo
    lejos = poly_mask(t, [(30, 18), (24, 6 - alza), (20, 9), (22, 15), (26, 20)])
    shade(t, lejos, MEMBRANA, bias=-0.2)
    ala(t, alza)
    # cola que se enrosca por detrás, a la derecha
    p = [(40, 40), (51, 44), (59, 41), (62, 34), (60, 29)]
    for i in range(4):
        limb(t, p[i], p[i + 1], 3.6 - i * 0.8, 2.8 - i * 0.8, NEGRO, bias=0.0)
    for x, y in ((50, 41), (56, 39), (60, 34)):  # púas de la cola, altas y afiladas
        put(t, x, y - 2, NEGRO[3]); put(t, x, y - 3, NEGRO[2]); put(t, x, y - 4, NEGRO[3]); put(t, x - 1, y - 3, NEGRO[1])
    # patas traseras: muslo grande y pie con garras
    for cx, w in ((40, 6.5), (27, 5.5)):
        shade(t, ell_mask(t, cx, 37 + b * 0.5, w, w), NEGRO, bias=0.05)
        limb(t, (cx, 40), (cx - 1, 45), 2.6, 2.4, NEGRO, bias=0.0)
        for dx in (-3, -1, 1):
            put(t, cx - 1 + dx, 46, GARRA[1]); put(t, cx - 1 + dx, 45, GARRA[0]); put(t, cx - 1 + dx, 44, GARRA[0])
    # tronco erguido
    tronco = poly_mask(t, [(25, 19 + b), (36, 17 + b), (41, 28), (39, 41), (26, 42), (22, 31)])
    shade(t, tronco, NEGRO, bias=0.1)
    escamas(t, tronco)
    ys, xs = tronco.nonzero()
    for y, x in zip(ys, xs):  # brasas entre las escamas del lomo y el costado
        if 24 < y < 40 and x > 27 and (x * 3 + y * 5) % 13 == 0:
            t[y, x] = (*BRASA, 255)
    # vientre de placas, de frente a la izquierda
    vientre = poly_mask(t, [(24, 22 + b), (29, 21 + b), (32, 41), (25, 41), (22, 32)])
    shade(t, vientre, PLACA, bias=0.05)
    for y in range(23 + b, 41, 3):
        line(t, 22, y, 32, y, PLACA[0])
    # cuello que sube y se curva hacia delante
    cab = (18 + hx, 12 + hy)
    cuello = [(30, 22 + b), (26, 15 + b // 2 + hy // 2), cab]
    for i in range(2):
        limb(t, cuello[i], cuello[i + 1], 4.6 - i * 0.6, 4.0 - i * 0.6, NEGRO, bias=0.15)
    for i, (x, y) in enumerate(((31, 18), (29, 14), (26, 11), (23, 8))):  # cresta del cuello
        x, y = x + hx * i // 3, y + hy * i // 3
        line(t, x, y, x + 2, y - 3, NEGRO[3])
    # cabeza de perfil: cráneo, hocico largo y mandíbula
    cx, cy = cab
    shade(t, ell_mask(t, cx + 1, cy - 1, 5, 4), NEGRO, bias=0.2)
    abre = 2 if aliento else (1 if carga > 0 else 0)
    shade(t, poly_mask(t, [(cx - 1, cy - 4), (cx - 10, cy - 1), (cx - 11, cy + 1), (cx - 1, cy + 1)]), NEGRO, bias=0.15)
    shade(t, poly_mask(t, [(cx, cy + 1 + abre), (cx - 9, cy + 2 + abre), (cx - 9, cy + 4 + abre), (cx + 1, cy + 4)]), NEGRO, bias=-0.1)
    for x, y, l in ((cx + 3, cy - 3, 6), (cx, cy - 4, 5), (cx + 4, cy, 4)):  # púas hacia atrás
        limb(t, (x, y), (x + l, y - l // 2 - 1), 1.3, 0.3, NEGRO, bias=0.2)
    # cuernos largos de hueso, afilados y curvos hacia atrás: líneas finas con la punta clara
    for puntos, w in ((((cx + 2, cy - 4), (cx + 5, cy - 6), (cx + 10, cy - 5), (cx + 12, cy - 3)), 2),
                      (((cx + 4, cy - 2), (cx + 8, cy - 3), (cx + 12, cy - 1)), 1)):
        for (xa, ya), (xb, yb) in zip(puntos, puntos[1:]):
            line(t, xa, ya + 1, xb, yb + 1, HUESO[0], w)
            line(t, xa, ya, xb, yb, HUESO[1], w)
        put(t, puntos[-1][0], puntos[-1][1], HUESO[2])
    # brazo corto delante del vientre
    limb(t, (30, 26 + b), (25, 32 + b), 2.2, 1.6, NEGRO, bias=0.05)
    for dx in (-1, 1):
        put(t, 24 + dx, 34 + b, GARRA[1])
    outline(t, OUT)
    # boca encendida, ojo rojo y orificio de la nariz
    if abre:
        c = FUEGO[2] if carga >= 1 or aliento else FUEGO[1]
        line(t, cx - 9, cy + 1 + abre // 2, cx - 1, cy + 1 + abre // 2, c)
        if abre > 1:
            line(t, cx - 8, cy + 2, cx - 2, cy + 2, FUEGO[1])
    else:
        line(t, cx - 9, cy + 2, cx - 1, cy + 2, OJO[0])
    c = OJO[2] if ojos > 0.8 else (OJO[1] if ojos > 0.4 else OJO[0])
    put(t, cx - 1, cy - 2, c); put(t, cx, cy - 2, OJO[1] if ojos > 0.4 else OJO[0])
    if ojos > 0.4:  # halo rojo alrededor del ojo
        put(t, cx - 2, cy - 2, OJO[0]); put(t, cx - 1, cy - 1, OJO[0]); put(t, cx + 1, cy - 2, OJO[0])
    line(t, cx - 2, cy - 3, cx + 1, cy - 4, NEGRO[0])  # ceja
    line(t, cx - 4, cy - 3, cx - 2, cy - 4, NEGRO[0])  # ceño más duro
    for x in range(cx - 9, cx - 1, 2):  # colmillos de arriba y, con la boca abierta, de abajo
        put(t, x, cy + 1, GARRA[1])
        if abre:
            put(t, x + 1, cy + 2 + abre, GARRA[1])
    put(t, cx - 9, cy - 1, OUT)
    # el pecho se enciende al tomar aire
    if carga > 0:
        ys, xs = vientre.nonzero()
        for y, x in zip(ys, xs):
            if y % 3 != (23 + b) % 3 and ((x + y) % 2 == 0 or carga >= 1) and 24 < y < 36:
                t[y, x] = (*FUEGO[1 if carga < 1 else 2], 255)
    if aliento:  # chorro de fuego: sale del hueco de la boca, por la punta del hocico, recto hacia delante
        g = rng(3)
        xt, yt = cx - 11, cy + 2 + abre // 2  # la punta del hocico, a la altura del hueco entre las mandíbulas
        for k in range(1, xt - 1):
            mitad = 1 + k * 0.75
            for dy in range(-int(mitad), int(mitad) + 1):
                x, y = xt - k, yt + dy + g.choice((-1, 0, 0, 0, 1))
                if 1 <= x < W and 0 <= y < H - 1 and t[y, x, 3] == 0:
                    d = abs(dy) / max(mitad, 1)
                    put(t, x, y, FUEGO[3] if d < 0.25 else FUEGO[2] if d < 0.6 else FUEGO[1])
    ground_shadow(t, 36, H - 2, 18, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. Solo lucha de perfil: todas las filas son la misma vista."""
    if anim == "idle":
        return dibujar(respira=[0, 1][i], alza=[0, 1][i])
    if anim == "walk":
        return dibujar(respira=[0, 1, 1, 0][i], alza=[0, 1, 2, 1][i])
    if anim == "atacar":
        return [lambda: dibujar(carga=1.0, alza=2, cabeza=(3, -2)),
                lambda: dibujar(aliento=True, alza=0, cabeza=(3, 1)),
                lambda: dibujar(carga=0.4, ojos=0.9)][i]()
    return dibujar(ojos=0.2, alza=-1, cabeza=(2, 2))
