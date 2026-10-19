"""Autotiles de 16 variantes (máscara de 4 bits: N=1, E=2, S=4, O=8) para caminos y agua.

Cada tile dibuja un disco central y un brazo hacia cada vecino conectado. Si dos brazos
contiguos están activos se rellena también la esquina entre ellos, para que los bloques
de 2x2 o mayores queden macizos. Los bordes usan una ondulación que depende solo de la
posición dentro del tile, así que las costuras entre tiles coinciden.
"""
import math
from base import *

N, E, SO, W = 1, 2, 4, 8


def wobble(v, amp=1.2, k=2):
    return round(amp * math.sin(2 * math.pi * k * v / S))


def wobble_water(v):
    return round(2.0 * math.sin(2 * math.pi * v / S) + 1.2 * math.sin(2 * math.pi * 3 * v / S + 1.3))


def mask_for(bits, half, rad, corners=True, wob=None):
    wob = wob or wobble
    m = np.zeros((S, S), bool)
    lo, hi = 16 - half, 15 + half
    for y in range(S):
        for x in range(S):
            dx, dy = x + 0.5 - 16, y + 0.5 - 16
            inside = dx * dx + dy * dy <= rad * rad
            wx, wy = wob(y), wob(x)
            if bits & N and y <= 16 and lo - wx <= x <= hi + wx:
                inside = True
            if bits & SO and y >= 15 and lo - wx <= x <= hi + wx:
                inside = True
            if bits & W and x <= 16 and lo - wy <= y <= hi + wy:
                inside = True
            if bits & E and x >= 15 and lo - wy <= y <= hi + wy:
                inside = True
            # esquinas macizas entre brazos contiguos
            if corners and ((bits & N and bits & E and x >= 16 and y <= 15) or (bits & E and bits & SO and x >= 16 and y >= 16) \
                    or (bits & SO and bits & W and x <= 15 and y >= 16) or (bits & W and bits & N and x <= 15 and y <= 15)):
                inside = True
            m[y, x] = inside
    return m


def edge(m, x, y):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < S and 0 <= ny < S and not m[ny, nx]:
            return (dx, dy)
    return None


def path_tile(base, bits, dirt, grass_cols, pebble, seed):
    t, r = base.copy(), rng(seed * 31 + bits)
    m = mask_for(bits, 6, 7.5, corners=False, wob=lambda v: wobble(v, 1.5, 2))
    for y in range(S):
        for x in range(S):
            if not m[y, x]:
                continue
            e = edge(m, x, y)
            c = dirt[1]
            q = r.random()
            if q < 0.12:
                c = dirt[0]
            elif q > 0.9:
                c = dirt[2]
            if e:
                c = grass_cols[0] if e[1] == -1 else dirt[0]
                if e[1] == -1 and r.random() < 0.5:
                    c = grass_cols[1]
            put(t, x, y, c)
    for _ in range(4):
        x, y = r.randrange(S), r.randrange(S)
        if m[y, x] and not edge(m, x, y):
            put(t, x, y, pebble[1]); put(t, x + 1, y, pebble[0])
    return t


def water_tile(base, bits, water, bank, seed, frame=0):
    t, r = base.copy(), rng(seed * 17 + bits)
    m = mask_for(bits, 11, 10.5, wob=wobble_water)
    for y in range(S):
        for x in range(S):
            if not m[y, x]:
                continue
            e = edge(m, x, y)
            near_top = any(0 <= y - k and not m[y - k, x] for k in (1, 2, 3))
            c = water[1]
            if near_top:
                c = water[0]
            if e:
                c = water[3] if e[1] != -1 else water[0]
            put(t, x, y, c)
    for _ in range(5):
        x, y = r.randrange(2, S - 4), r.randrange(2, S - 2)
        if all(m[y, x + k] and not edge(m, x + k, y) for k in range(3)):
            for k in range(3):
                put(t, x + k, y, water[2])
            put(t, x + 1, y, water[3])
    # orilla: borde oscuro en la hierba alrededor del agua
    for y in range(S):
        for x in range(S):
            if m[y, x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < S and 0 <= ny < S and m[ny, nx]:
                    put(t, x, y, bank)
                    break
    return t


def build(prefix, maker):
    return [(f"{prefix}_{bits}", maker(bits)) for bits in range(16)]
