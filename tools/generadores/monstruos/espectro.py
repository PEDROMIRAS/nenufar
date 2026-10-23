"""Espectro de la antorcha (32x32): figura encapuchada que flota, rostro vacío con ojos de brasa
y una antorcha: el alma de un héroe de la Orden, despertada en la Cripta.
Hoja del repo (32x32, filas abajo, izquierda, derecha, arriba): idle (2) y walk (4) flotando,
atacar (3) con la antorcha y golpe (1). El ataque solo se ve de frente (en combate); en las otras
filas esas columnas repiten el flotar."""
import numpy as np
from dibujo import (tile, put, line, rect, outline, poly_mask, ell_mask, shade, flame,
                    ground_shadow)

R = [(24, 6, 14), (46, 10, 22), (72, 16, 30), (108, 24, 36), (156, 40, 44), (204, 70, 58)]  # capa granate
VOID = (12, 6, 12)
EYE, EYE2 = (255, 178, 70), (255, 238, 180)
BONE = [(112, 90, 72), (164, 140, 112), (212, 194, 164)]
WOOD = [(64, 40, 26), (108, 72, 44)]
FIRE = [(196, 64, 18), (244, 134, 36), (255, 204, 86), (255, 246, 206)]
OUT = (30, 14, 20)


def mx(pts, on):
    return [(31 - x, y) for x, y in pts] if on else pts


def body_front(t, ox, oy, f, mirror, face, flash):
    ramp = R[2:] + [R[5], R[5]] if flash else R
    # antorcha (palo) por detrás de la manga
    hand, top = mx([(6, 22)], mirror)[0], mx([(7, 10)], mirror)[0]
    # capa
    tips = [(x, 28 if (i + f) % 2 == 0 else 25) for i, x in enumerate([22, 20, 18, 16, 14, 12, 10])]
    robe = [(9, 14), (23, 14), (26, 19), (24, 23), (23, 25)] + tips + [(9, 25), (8, 23), (6, 19)]
    shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in mx(robe, mirror)]), ramp, bias=-0.22)
    line(t, 16 + ox, 16 + oy, 16 + ox, 25 + oy, ramp[0])
    line(t, mx([(12, 18)], mirror)[0][0] + ox, 18 + oy, mx([(12, 25)], mirror)[0][0] + ox, 25 + oy, ramp[0])
    # mangas
    s_torch = [(10, 15), (13, 16), (10, 22), (5, 22), (7, 17)]
    s_free = [(22, 15), (25, 18), (27, 23), (23, 23), (21, 18)]
    shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in mx(s_free, mirror)]), ramp, bias=-0.3)
    # dedos huesudos colgando de la manga libre
    for x in (23, 25, 26):
        x = mx([(x, 0)], mirror)[0][0]
        line(t, x + ox, 24 + oy, x + ox, 25 + oy + (x % 2), BONE[1])
    # capucha
    hood = [(16, 1), (19, 0), (21, 1), (22, 5), (24, 10), (25, 14), (7, 14), (8, 10), (10, 5), (13, 2)]
    shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in mx(hood, mirror)]), ramp, bias=-0.1)
    if face:
        op = ell_mask(t, 16 + ox, 10 + oy, 3.4, 4.0)
        ring = ell_mask(t, 16 + ox, 10 + oy, 4.4, 5.0) & ~op
        ys, xs = np.nonzero(ring)
        for y, x in zip(ys, xs):
            if y - oy <= 10:
                t[y, x] = (*(ramp[5] if x - ox < 16 else ramp[4]), 255)
        t[op] = (*VOID, 255)
        glow = EYE2 if f % 2 == 0 else EYE
        put(t, 13 + ox, 9 + oy, EYE); put(t, 14 + ox, 9 + oy, glow)
        put(t, 17 + ox, 9 + oy, glow); put(t, 18 + ox, 9 + oy, EYE)
        put(t, 15 + ox, 12 + oy, BONE[0]); put(t, 16 + ox, 12 + oy, BONE[0])
    else:
        line(t, 16 + ox, 4 + oy, 16 + ox, 14 + oy, ramp[1])
    # manga de la antorcha y mano, por delante
    shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in mx(s_torch, mirror)]), ramp, bias=-0.1)
    return hand, top


def tatters(t, pts, f, color):
    for k, (x0, y0, dx) in enumerate(pts):
        wave = [0, 1, 0, -1][(f + k) % 4]
        line(t, x0, y0, x0 + dx, y0 - 1 + wave, color)
        put(t, x0 + dx + (1 if dx > 0 else -1), y0 - 1 + wave + (k % 2), color)


def draw(direction, anim, f):
    t = tile()
    ox, oy, flash = 0, 0, False
    torch = None
    burst = None
    fsize = (6, 2.2)
    if anim in ("idle", "walk"):
        oy = [2, 1, 0, 1][f]
    elif anim == "attack":
        oy = [0, 1, 1][f]
        torch = [((5, 19), (6, 8)), ((9, 21), (13, 14)), ((6, 22), (7, 11))][f]
        fsize = [(7, 2.8), (5, 2.4), (6, 2.2)][f]
        burst = f == 1
    elif anim == "hit":
        ox, oy, flash = 1, 0, True

    if direction in ("down", "up"):
        mirror = direction == "up"
        hand, top = body_front(t, ox, oy, f, mirror, direction == "down", flash)
        if torch:
            hand, top = torch
        hx, hy = hand
        tx, ty = top
        line(t, hx + ox, hy + oy + 3, tx + ox, ty + oy, WOOD[1])
        line(t, hx + ox + 1, hy + oy + 3, tx + ox + 1, ty + oy, WOOD[0])
        rect(t, hx - 1 + ox, hy - 1 + oy, hx + 1 + ox, hy + oy, BONE[1])
        put(t, hx - 1 + ox, hy - 1 + oy, BONE[2])
        side = 1 if not mirror else -1
        tatters(t, [((26 if not mirror else 5) + ox, 18 + oy, 3 * side), ((24 if not mirror else 7) + ox, 23 + oy, 3 * side)], f, R[2])
        outline(t, OUT)
        flame(t, tx + ox, ty + oy, *(fsize[0], fsize[1]), f, FIRE)
        if burst:
            m = ell_mask(t, 14, 11 + oy, 5, 4)
            ys, xs = np.nonzero(m)
            for y, x in zip(ys, xs):
                d = ((x - 14) ** 2 + (y - 11 - oy) ** 2) ** 0.5
                if d < 4.8 and (x * 7 + y * 3) % 5:
                    t[y, x] = (*(FIRE[3] if d < 1.8 else FIRE[2] if d < 3 else FIRE[1]), 255)
            for x, y in ((8, 8), (20, 7), (19, 15), (9, 15), (14, 4)):
                put(t, x, y + oy, FIRE[1])
    else:  # side, mirando a la derecha; izquierda = espejo
        tips = [(x, 28 if (i + f) % 2 == 0 else 25) for i, x in enumerate([19, 17, 15, 13, 11, 9, 7])]
        robe = [(10, 14), (20, 14), (23, 20), (21, 24)] + tips + [(6, 24), (6, 19)]
        shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in robe]), R, bias=-0.22)
        line(t, 15 + ox, 16 + oy, 13 + ox, 25 + oy, R[0])
        tatters(t, [(6 + ox, 17 + oy, -3), (6 + ox, 21 + oy, -4), (7 + ox, 24 + oy, -3)], f, R[2])
        hood = [(11, 2), (14, 0), (19, 2), (24, 6), (26, 11), (24, 14), (9, 14), (8, 9), (9, 4)]
        shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in hood]), R, bias=-0.1)
        op = ell_mask(t, 21.5 + ox, 10.5 + oy, 2.4, 3.2)
        for x in range(19, 25):
            put(t, x + ox, 6 + oy, R[5])
        t[op] = (*VOID, 255)
        put(t, 21 + ox, 10 + oy, EYE); put(t, 22 + ox, 10 + oy, EYE2 if f % 2 == 0 else EYE)
        hand, top = (22, 21), (25, 9)
        line(t, hand[0] + ox, hand[1] + 3 + oy, top[0] + ox, top[1] + oy, WOOD[1])
        line(t, hand[0] + 1 + ox, hand[1] + 3 + oy, top[0] + 1 + ox, top[1] + oy, WOOD[0])
        shade(t, poly_mask(t, [(x + ox, y + oy) for x, y in [(15, 15), (19, 16), (23, 20), (19, 22), (15, 19)]]), R, bias=-0.1)
        rect(t, 21 + ox, 20 + oy, 23 + ox, 21 + oy, BONE[1]); put(t, 21 + ox, 20 + oy, BONE[2])
        outline(t, OUT)
        flame(t, top[0] + ox, top[1] + oy, 6, 2.2, f, FIRE)
        tx = top[0]
    # sombra en el suelo: más pequeña cuanto más alto flota
    ground_shadow(t, 16, 30, 4.5 + oy * 0.6, 1.4)
    img = t
    if direction == "left":
        img = t[:, ::-1].copy()
    return img


def fotograma(direccion, anim, i):
    if anim == "idle":
        return draw(direccion, "idle", [0, 2][i])
    if anim == "walk":
        return draw(direccion, "idle", i)
    if anim == "atacar":
        return draw(direccion, "attack", i) if direccion == "down" else draw(direccion, "idle", i)
    return draw(direccion, "hit", 0) if direccion == "down" else draw(direccion, "idle", 3)
