"""Construcción en piedra compartida por Ruinas y Cripta, parametrizada por paleta.

pal = {"st": [mortero, oscuro, medio, claro, brillo], "acc": [acento oscuro, medio, claro]}
"""
from base import *

METAL = [(58, 60, 70), (118, 122, 134), (178, 182, 192)]


def flagstones(pal, seed, variant="liso", size=16, tones=(2, 2, 3), soft=False):
    st, acc = pal["st"], pal["acc"]
    t, r = tile(), rng(seed)
    fill(t, st[0])
    for row, y0 in enumerate(range(0, S, size)):
        off = (size // 2) * (row % 2)
        for x0 in range(off, off + S, size):
            tone = r.choice(tones)
            for y in range(y0 + 1, y0 + size):
                for x in range(x0 + 1, x0 + size):
                    c = st[tone]
                    if soft:
                        if y == y0 + 1 and (x % 3):
                            c = st[min(tone + 1, 4)]
                    elif y == y0 + 1 or x == x0 + 1:
                        c = st[min(tone + 1, 4)]
                    elif y == y0 + size - 1 or x == x0 + size - 1:
                        c = st[tone - 1]
                    put(t, x, y, c, wrap=True)
            for _ in range(size // 2 if not soft else size // 4):
                put(t, x0 + r.randrange(2, size - 1), y0 + r.randrange(2, size - 1),
                    st[max(r.choice([tone - 1, min(tone + 1, 4)]), 1)], wrap=True)
    if variant == "grietas":
        x, y = r.randrange(S), r.randrange(S)
        for _ in range(16):
            put(t, x, y, st[0], True); put(t, x + 1, y, st[1], True)
            x += r.choice([-1, 0, 1]); y += 1
    elif variant == "acento":
        for y in range(S):
            for x in range(S):
                if get(t, x, y) == st[0] and r.random() < 0.45:
                    put(t, x, y, acc[1]); put(t, x, y - 1, acc[0])
                    if r.random() < 0.3:
                        put(t, x + 1, y, acc[2])
    elif variant == "rota":
        x0, y0 = 10 + r.randrange(4), 10 + r.randrange(4)
        for y in range(y0, y0 + 8):
            for x in range(x0, x0 + 9):
                if ((x - x0 - 4) / 4.5) ** 2 + ((y - y0 - 4) / 4) ** 2 <= 1 and r.random() < 0.85:
                    put(t, x, y, st[0])
        for _ in range(5):
            x, y = x0 + r.randrange(9), y0 + r.randrange(8)
            put(t, x, y, st[2]); put(t, x + 1, y, st[1])
    return t


def cap_blocks(pal, seed):
    """Remate del muro visto desde arriba (laterales, sur y esquinas)."""
    st = pal["st"]
    t, r = tile(), rng(seed)
    fill(t, st[1])
    for y0 in (0, 16):
        off = 8 if y0 else 0
        for x0 in range(off, off + S, 16):
            tone = r.choice([3, 3, 2])
            for y in range(y0 + 1, y0 + 16):
                for x in range(x0 + 1, x0 + 16):
                    c = st[tone]
                    if y == y0 + 1 or x == x0 + 1:
                        c = st[min(tone + 1, 4)]
                    elif y >= y0 + 14 or x == x0 + 15:
                        c = st[tone - 1]
                    put(t, x, y, c, wrap=True)
            for _ in range(6):
                put(t, x0 + r.randrange(2, 14), y0 + r.randrange(2, 13), st[tone - 1], True)
    return t


def brick_face(pal, seed, accent=True):
    """Muro norte en vista 3/4: remate arriba, cara de ladrillo y sombra al pie."""
    st, acc = pal["st"], pal["acc"]
    t, r = tile(), rng(seed)
    cap = cap_blocks(pal, seed)
    t[0:8] = cap[0:8]
    for x in range(S):
        put(t, x, 7, st[4] if x % 16 else st[3])
        put(t, x, 8, st[0])
    rows = [(9, 15), (16, 22), (23, 29)]
    for k, (y0, y1) in enumerate(rows):
        off = r.randrange(16)
        widths = [11, 10, 11]
        x = off
        for w in widths:
            tone = r.choice([1, 2, 2])
            for y in range(y0, y1 + 1):
                for xx in range(x, x + w):
                    c = st[tone]
                    if xx == x or y == y1:
                        c = st[0]
                    elif y == y0:
                        c = st[tone + 1]
                    elif y == y1 - 1:
                        c = st[max(tone - 1, 1)]
                    put(t, xx, y, c, wrap=True)
            x += w
    for x in range(S):
        put(t, x, 30, darken(st[0], 0.8)); put(t, x, 31, darken(st[0], 0.6))
    if accent:
        for _ in range(3):
            x = r.randrange(S)
            for y in range(8, 8 + r.randrange(4, 12)):
                put(t, x, y, acc[1] if y % 3 else acc[2])
                put(t, x + 1, y, acc[0])
    return t


def arch_door(pal, seed, closed=False, glow=None):
    st = pal["st"]
    t = brick_face(pal, seed, accent=False)
    cx, cy, rad = 15.5, 15, 7
    for y in range(4, S):
        for x in range(6, 26):
            inside = (abs(x + 0.5 - cx) <= rad and y >= cy) or ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad)
            ring = (abs(x + 0.5 - cx) <= rad + 2 and y >= cy) or ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= (rad + 2) ** 2)
            if inside:
                k = max(0.0, (y - 22) / 9)
                base = (18, 16, 22)
                if glow and y > 24:
                    base = tuple(int(b + (g - b) * 0.35 * k) for b, g in zip(base, glow))
                else:
                    base = tuple(int(b + (s - b) * 0.5 * k) for b, s in zip(base, st[1]))
                put(t, x, y, base)
            elif ring:
                light = x + 0.5 < cx
                put(t, x, y, st[4] if light and y < cy else (st[3] if light else st[1]))
    for x in range(6, 26):
        put(t, x, 30, darken(st[0], 0.8)); put(t, x, 31, darken(st[0], 0.6))
    if closed:
        for x in range(10, 22, 3):
            for y in range(9, 30):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad or y >= cy:
                    put(t, x, y, METAL[1]); put(t, x + 1, y, METAL[0])
            put(t, x, 10, METAL[2])
        for y in (17, 25):
            for x in range(9, 23):
                put(t, x, y, METAL[1]); put(t, x, y + 1, METAL[0])
    return t


def bars_prop(vertical=False):
    t = tile()
    for y in (12, 19):
        rect(t, 0, y, S - 1, y, METAL[2]); rect(t, 0, y + 1, S - 1, y + 2, METAL[1]); rect(t, 0, y + 3, S - 1, y + 3, METAL[0])
    for x in range(2, S, 7):
        ellipse(t, x + 1.5, 16, 3.2, 5, METAL)
    outline(t)
    if vertical:
        t[:] = np.transpose(t, (1, 0, 2))
    return t


def column(pal, seed, accent_band=None):
    st, acc = pal["st"], pal["acc"]
    t, r = tile(2 * S), rng(seed)
    rect(t, 5, 52, 26, 59, st[2]); rect(t, 5, 52, 26, 52, st[4]); rect(t, 5, 59, 26, 59, st[1])
    rect(t, 7, 49, 24, 51, st[3])
    for y in range(12, 49):
        for x in range(9, 23):
            c = st[3] if x < 12 else (st[2] if x < 19 else st[1])
            if (x - 9) % 4 == 3:
                c = st[max(1, [3, 2, 1][0 if x < 12 else (1 if x < 19 else 2)] - 1)]
            put(t, x, y, c)
    rect(t, 6, 7, 25, 11, st[3]); rect(t, 6, 7, 25, 7, st[4]); rect(t, 6, 11, 25, 11, st[1])
    rect(t, 4, 4, 27, 6, st[2]); rect(t, 4, 4, 27, 4, st[4])
    if accent_band:
        for y in (26, 27, 34, 35):
            for x in range(9, 23):
                put(t, x, y, accent_band[1] if y in (26, 34) else accent_band[0])
        for x in range(11, 21, 3):
            rect(t, x, 29, x + 1, 31, accent_band[2])
    else:
        for _ in range(10):
            x = r.randrange(5, 27)
            put(t, x, 51 + r.randrange(2), acc[1]); put(t, x, 50, acc[2])
    outline(t)
    ground_shadow(t, 16, 61, 12, 2.5)
    return t


def broken_column(pal, seed):
    st, acc = pal["st"], pal["acc"]
    t, r = tile(), rng(seed)
    rect(t, 5, 22, 26, 28, st[2]); rect(t, 5, 22, 26, 22, st[4]); rect(t, 5, 28, 26, 28, st[1])
    tops = [12 + r.randrange(6) for _ in range(14)]
    for i, x in enumerate(range(9, 23)):
        for y in range(tops[i], 22):
            c = st[3] if x < 12 else (st[2] if x < 19 else st[1])
            put(t, x, y, c)
        put(t, x, tops[i], st[4])
    for x, y in ((24, 26), (27, 25), (3, 27)):
        rect(t, x, y, x + 2, y + 1, st[2]); put(t, x, y, st[3])
    put(t, 8, 21, acc[1]); put(t, 23, 21, acc[2])
    outline(t)
    ground_shadow(t, 16, 29, 12, 2)
    return t


def rubble(pal, seed):
    st = pal["st"]
    t, r = tile(), rng(seed)
    blocks = [(6, 20, 9, 6), (15, 21, 10, 6), (10, 15, 9, 6), (19, 16, 7, 5), (4, 25, 6, 4), (23, 25, 6, 4)]
    for x, y, w, h in sorted(blocks, key=lambda b: b[1]):
        tone = r.choice([2, 3])
        rect(t, x, y, x + w - 1, y + h - 1, st[tone])
        rect(t, x, y, x + w - 1, y, st[min(tone + 1, 4)])
        rect(t, x, y + h - 1, x + w - 1, y + h - 1, st[tone - 1])
        line(t, x + w - 1, y, x + w - 1, y + h - 1, st[tone - 1])
    outline(t)
    ground_shadow(t, 16, 29, 13, 2)
    return t
