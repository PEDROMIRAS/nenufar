"""Utilidades de dibujo para tiles de 32x32 (arrays RGBA de numpy)."""
import random
import numpy as np

S = 32
OUTLINE = (38, 30, 36)


def tile(h=S, w=S):
    return np.zeros((h, w, 4), np.uint8)


def put(t, x, y, c, wrap=False, a=255):
    x, y = int(round(x)), int(round(y))
    h, w = t.shape[:2]
    if wrap:
        x, y = x % w, y % h
    if 0 <= x < w and 0 <= y < h:
        t[y, x] = (*c, a)


def get(t, x, y):
    return tuple(int(v) for v in t[y % S, x % S][:3])


def fill(t, c):
    t[:, :] = (*c, 255)


def rect(t, x0, y0, x1, y1, c, wrap=False):
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            put(t, x, y, c, wrap)


def line(t, x0, y0, x1, y1, c, w=1, wrap=False):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        k = i / max(n - 1, 1)
        for o in range(w):
            put(t, x0 + (x1 - x0) * k + o, y0 + (y1 - y0) * k, c, wrap)


def ellipse(t, cx, cy, rx, ry, ramp, wrap=False, light=(-0.6, -0.8)):
    """Elipse sombreada: ramp = [oscuro, ..., claro]; luz arriba a la izquierda."""
    n = len(ramp)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = dx * dx + dy * dy
            if d <= 1:
                lit = -(dx * light[0] + dy * light[1])  # -1 sombra .. 1 luz
                k = (lit + 1) / 2 * 0.85 + (1 - d) * 0.25
                idx = max(0, min(n - 1, int(k * n)))
                put(t, x, y, ramp[idx], wrap)


def outline(t, col=OUTLINE):
    a = t[:, :, 3] == 255
    out = t.copy()
    h, w = t.shape[:2]
    for y in range(h):
        for x in range(w):
            if a[y, x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and a[ny, nx]:
                    out[y, x] = (*col, 255)
                    break
    t[:] = out


def ground_shadow(t, cx, cy, rx, ry, alpha=80):
    """Sombra semitransparente sobre el suelo, solo donde no hay objeto."""
    h, w = t.shape[:2]
    for y in range(h):
        for x in range(w):
            if t[y, x, 3] == 0 and ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                t[y, x] = (16, 12, 20, alpha)


def darken(c, f):
    return tuple(max(0, int(v * f)) for v in c)


def rng(seed):
    return random.Random(seed)


def split_tall(t):
    """Parte un objeto de 64 px de alto en (superior, inferior)."""
    return t[:S].copy(), t[S:].copy()
