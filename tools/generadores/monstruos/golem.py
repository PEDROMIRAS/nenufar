"""Golem de piedra, jefe de las Ruinas (48x48). Rocas apiladas con musgo; en el pecho, el hueco
de la runa que le arrancaron para abrir el sello, con grietas que aún brillan.

Se diseña en un espacio de 64 px y se dibuja a 3/4 (Z) para caber en el marco de 48 de los jefes:
en combate se ve ×2 y por encima solo hay sitio hasta la barra de turnos.
Hoja del repo: idle (2), walk (4, no anda: respira), atacar (3: el puño en alto, que es lo que se
ve mientras carga el golpe anunciado; el golpe al suelo; la vuelta) y golpe (1, destello)."""
import numpy as np
from dibujo import tile, put, line, rect, outline, round_rect_mask, ground_shadow, rng

S = 48
K = S / 64


def Z(v):
    return int(round(v * K))


ST = [(50, 42, 38), (84, 70, 60), (120, 102, 84), (158, 138, 112), (196, 178, 146)]
MOSS = [(64, 92, 46), (98, 130, 62), (140, 168, 88)]
GLOW = [(150, 70, 24), (232, 132, 44), (255, 196, 92), (255, 240, 190)]
HOLE = (20, 14, 14)
DUST = (186, 168, 138)
OUT = (30, 24, 22)


def stone_fill(t, m, bias=0.0):
    """Piedra en tres bandas planas (luz arriba-izquierda), filo claro arriba y contorno propio."""
    if not m.any():
        return
    ys, xs = np.nonzero(m)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    sx, sy = max((xs.max() - xs.min()) / 2, 1), max((ys.max() - ys.min()) / 2, 1)
    up = np.zeros_like(m); up[1:, :] = m[:-1, :]
    er = m.copy()
    er[1:, :] &= m[:-1, :]; er[:-1, :] &= m[1:, :]; er[:, 1:] &= m[:, :-1]; er[:, :-1] &= m[:, 1:]
    for y, x in zip(ys, xs):
        lit = -((x + 0.5 - cx) / sx * -0.6 + (y + 0.5 - cy) / sy * -0.8) + bias * 2
        tone = 3 if lit > 0.45 else (1 if lit < -0.45 else 2)
        if not up[y, x]:
            tone = min(tone + 1, 4)
        t[y, x] = (*ST[tone], 255)
        if not er[y, x] and up[y, x]:
            t[y, x] = (*OUT, 255)


def block(t, x0, y0, x1, y1, seed, bias=0.0, r=3, moss=False, cracks=1):
    """Bloque de roca; coordenadas en el espacio de 64."""
    x0, y0, x1, y1, r = Z(x0), Z(y0), Z(x1), Z(y1), max(1, Z(r))
    m = round_rect_mask(t, x0, y0, x1, y1, r)
    stone_fill(t, m, bias)
    g = rng(seed)
    ys, xs = np.nonzero(m)
    for _ in range(max(1, len(xs) // 26)):
        i = g.randrange(len(xs))
        x, y = xs[i], ys[i]
        if 0 < x < S - 1 and m[y, x + 1]:
            put(t, x, y, ST[1]); put(t, x + 1, y, ST[3] if g.random() < 0.5 else ST[2])
    for _ in range(cracks):
        x, y = g.randrange(x0 + 2, max(x0 + 3, x1 - 2)), g.randrange(y0 + 2, max(y0 + 3, y1 - 2))
        for _ in range(g.randrange(2, 5)):
            if 0 <= y < S and 0 <= x < S and m[y, x]:
                put(t, x, y, ST[0])
            x += g.choice((-1, 0, 1)); y += 1
    if moss:
        for x in range(x0 + 1, x1):
            top = next((y for y in range(y0, y1 + 1) if 0 <= y < S and m[y, x]), None)
            if top is not None and g.random() < 0.75:
                put(t, x, top, MOSS[2 if g.random() < 0.3 else 1])
    return m


def mx(box):
    x0, y0, x1, y1 = box
    return (63 - x1, y0, 63 - x0, y1)


ARM = {  # (antebrazo, puño) del brazo derecho de la imagen, en el espacio de 64
    "rest": ((46, 28, 57, 41), (44, 39, 61, 55)),
    "raise": ((45, 10, 56, 24), (41, 0, 59, 14)),
    "slam": ((42, 30, 53, 43), (33, 44, 53, 61)),
}


def pose(t, bob=0, rarm="rest", glow=0.5, lean=0, eyes=1.0, fist_glow=0.0, dust=0, chips=False):
    by = bob + lean
    # piernas y pies
    block(t, 20, 44, 30, 58, 11, -0.05, cracks=1)
    block(t, 34, 44, 44, 58, 12, -0.15, cracks=1)
    block(t, 16, 55, 31, 62, 13, -0.2, r=2, cracks=0)
    block(t, 33, 55, 48, 62, 14, -0.3, r=2, cracks=0)
    # brazo izquierdo (siempre en reposo) y antebrazo derecho, detrás de los hombros
    fa, fi = ARM["rest"]
    lx0, ly0, lx1, ly1 = mx(fa)
    block(t, lx0, ly0 + by, lx1, ly1 + by, 21, -0.05)
    ra, rf = ARM[rarm]
    if rarm != "slam":
        dy = by if rarm == "rest" else 0
        block(t, ra[0], ra[1] + dy, ra[2], ra[3] + dy, 31, -0.15)
    # tronco
    block(t, 22, 38 + by, 42, 47 + by, 15, -0.3, r=2)
    block(t, 17, 17 + by, 47, 41 + by, 16, -0.05, r=4, cracks=2)
    block(t, 19, 19 + by, 31, 30 + by, 17, 0.12, r=3)
    block(t, 33, 19 + by, 45, 30 + by, 18, 0.02, r=3)
    block(t, 24, 31 + by, 40, 40 + by, 19, -0.1, r=2)
    # hueco de la runa arrancada y grietas que aún brillan
    cx, cy = Z(32), Z(26 + by)
    for d in range(4):
        for x in range(cx - (3 - d), cx + (3 - d) + 1):
            put(t, x, cy - d, HOLE); put(t, x, cy + d, HOLE)
    gc = GLOW[0] if glow < 0.6 else (GLOW[1] if glow < 0.9 else GLOW[2])
    for x0, y0, x1, y1 in ((cx - 3, cy, cx - 7, cy + 3), (cx + 3, cy, cx + 7, cy + 2), (cx, cy + 3, cx - 1, cy + 7), (cx + 1, cy - 3, cx + 3, cy - 6)):
        line(t, x0, y0, x1, y1, gc)
    if glow >= 0.9:
        put(t, cx, cy, GLOW[1])
    # hombros con musgo
    block(t, 5, 13 + by, 24, 31 + by, 22, 0.1, r=6, moss=True, cracks=2)
    block(t, 39, 13 + by, 58, 31 + by, 23, -0.05, r=6, moss=True, cracks=2)
    # cabeza hundida entre los hombros
    hy = 5 + by
    block(t, 25, hy, 38, hy + 15, 24, 0.0, r=3, moss=True, cracks=0)
    line(t, Z(26), Z(hy + 6), Z(37), Z(hy + 6), ST[1])
    ec = GLOW[3] if eyes > 0.8 else (GLOW[2] if eyes > 0.5 else GLOW[0])
    for ex in (28, 34):
        put(t, Z(ex), Z(hy + 8), ec); put(t, Z(ex) + 1, Z(hy + 8), ec)
    for x in range(Z(29), Z(35) + 1):
        put(t, x, Z(hy + 12), ST[0] if x % 2 else ST[3])
    # puños, delante
    lf = mx(fi)
    block(t, lf[0], lf[1] + by, lf[2], lf[3] + by, 41, -0.1, r=5, cracks=2)
    if rarm == "rest":
        block(t, rf[0], rf[1] + by, rf[2], rf[3] + by, 42, -0.2, r=5, cracks=2)
    else:
        if rarm == "slam":
            block(t, *ra, 31, -0.15)
        block(t, *rf, 42, 0.0, r=5, cracks=2)
    if fist_glow > 0:
        x0, y0, x1, y1 = (Z(v) for v in rf)
        g = rng(7)
        col = GLOW[2] if fist_glow > 0.9 else GLOW[1]
        fm = round_rect_mask(t, x0 + 2, y0 + 2, x1 - 2, y1 - 2, 2)
        for _ in range(3 if fist_glow > 0.9 else 2):
            x, y = g.randrange(x0 + 3, x1 - 2), y0 + 2
            for _ in range(y1 - y0 - 4):
                if 0 <= y < S and fm[y, x]:
                    put(t, x, y, col)
                x += g.choice((-1, 0, 0, 1)); y += 1
    outline(t, OUT)
    if fist_glow >= 1.0 and rarm == "raise":
        x0, y0, x1, y1 = (Z(v) for v in rf)
        for x, y in ((x0 - 2, y0 + 3), (x1 + 1, y0 + 5), (x0 + 2, y1 + 2), (x1 - 2, y1 + 2)):
            put(t, x, y, GLOW[2])
    if dust:
        g = rng(99 + dust)
        for _ in range(20 if dust == 2 else 9):
            x = g.randrange(Z(22), S - 1) if dust == 2 else g.randrange(Z(26), Z(60))
            y = g.randrange(Z(52), S)
            if t[y, x, 3] == 0:
                put(t, x, y, DUST)
    if chips:
        for x, y in ((14, 8), (50, 6), (10, 26), (55, 40), (20, 2)):
            rect(t, Z(x), Z(y), Z(x) + 1, Z(y) + 1, ST[3])
    ground_shadow(t, S // 2, S - 2, Z(24), 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. El golem no anda: todas las filas lo muestran de frente."""
    t = tile(S, S)
    if anim == "idle":
        return pose(t, bob=[0, 1][i], glow=[0.5, 0.9][i])
    if anim == "walk":
        return pose(t, bob=[0, 0, 1, 1][i], glow=[0.5, 0.7, 0.9, 0.7][i])
    if anim == "atacar":
        return [lambda: pose(t, rarm="raise", glow=1.0, fist_glow=1.0),
                lambda: pose(t, rarm="slam", lean=2, fist_glow=0.8, dust=2),
                lambda: pose(t, dust=1)][i]()
    # golpe: recula con los ojos apagados y salta alguna esquirla (la hoja lo pasa a blanco)
    return pose(t, lean=-1, eyes=0.3, glow=0.3, chips=True)
