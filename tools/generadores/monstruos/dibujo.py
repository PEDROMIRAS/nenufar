"""Utilidades de dibujo para monstruos (lienzos de cualquier tamaño, arrays RGBA de numpy)."""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "entorno"))
from base import tile, put, rect, line, outline, rng  # noqa: E402,F401


def poly_mask(t, pts):
    h, w = t.shape[:2]
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=1)
    return np.array(m, bool)


def ell_mask(t, cx, cy, rx, ry):
    h, w = t.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    return ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1


def round_rect_mask(t, x0, y0, x1, y1, r=3):
    h, w = t.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    m = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        corner = ((xx < x0 + r) if cx == x0 + r else (xx > x1 - r)) & ((yy < y0 + r) if cy == y0 + r else (yy > y1 - r))
        m &= ~corner | ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + 0.5)
    return m


def shade(t, m, ramp, bias=0.0, light=(-0.55, -0.85), rim=True):
    """Rellena la máscara con una rampa (oscuro → claro): luz arriba a la izquierda.
    Con rim, el borde superior se aclara y el inferior/derecho se oscurece un tono."""
    if not m.any():
        return
    ys, xs = np.nonzero(m)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    sx, sy = max((xs.max() - xs.min()) / 2, 1), max((ys.max() - ys.min()) / 2, 1)
    dx, dy = (xs + 0.5 - cx) / sx, (ys + 0.5 - cy) / sy
    lit = -(dx * light[0] + dy * light[1])
    n = len(ramp)
    idx = np.clip(((lit + 1) / 2 * 0.9 + 0.05 + bias) * n, 0, n - 1).astype(int)
    if rim:
        h, w = m.shape
        up = np.zeros_like(m); up[1:, :] = m[:-1, :]
        down = np.zeros_like(m); down[:-1, :] = m[1:, :]
        right = np.zeros_like(m); right[:, :-1] = m[:, 1:]
        top_edge = ~up[ys, xs]
        low_edge = ~down[ys, xs] | ~right[ys, xs]
        idx = np.where(top_edge, np.minimum(idx + 1, n - 1), idx)
        idx = np.where(low_edge & ~top_edge, np.maximum(idx - 1, 0), idx)
    for y, x, k in zip(ys, xs, idx):
        t[y, x] = (*ramp[k], 255)


def limb(t, p0, p1, w0, w1, ramp, bias=0.0):
    """Extremidad como cuadrilátero de grosor variable entre dos puntos."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    ln = max((dx * dx + dy * dy) ** 0.5, 1e-6)
    nx, ny = -dy / ln, dx / ln
    pts = [(x0 + nx * w0, y0 + ny * w0), (x1 + nx * w1, y1 + ny * w1),
           (x1 - nx * w1, y1 - ny * w1), (x0 - nx * w0, y0 - ny * w0)]
    m = poly_mask(t, pts) | ell_mask(t, x0, y0, w0 + 0.5, w0 + 0.5) | ell_mask(t, x1, y1, w1 + 0.5, w1 + 0.5)
    shade(t, m, ramp, bias)
    return m


def flame(t, x, y, h, w, phase, ramp):
    """Lengua de fuego que sube desde (x, y). ramp: [rojo, naranja, amarillo, blanco]. Sin contorno: brilla."""
    for i in range(h):
        k = i / max(h - 1, 1)
        half = w * (1 - k) ** 0.75
        sway = round(np.sin(i * 0.7 + phase * 1.9) * k * 1.4)
        for xx in range(int(round(x - half)) + sway, int(round(x + half)) + 1 + sway):
            d = abs(xx - x - sway) / max(half, 0.6)
            c = ramp[3] if d < 0.3 and k < 0.55 else (ramp[2] if d < 0.6 and k < 0.8 else (ramp[1] if k < 0.9 else ramp[0]))
            put(t, xx, y - i, c)
    put(t, x + (phase % 3) - 1, y - h - 1 - (phase % 2), ramp[1])


def ground_shadow(t, cx, cy, rx, ry, color=(16, 12, 20), alpha=80):
    m = ell_mask(t, cx, cy, rx, ry) & (t[:, :, 3] == 0)
    t[m] = (*color, alpha)


def to_img(t):
    return Image.fromarray(t, "RGBA")


def fire_band(t, x0, x1, base_y, hmax, phase, ramp, profile=None, bright=0.35):
    """Franja de fuego continua: cada columna sube con una altura con ruido y el color depende
    de la altura relativa (base brillante, puntas oscuras). Sin contorno: brilla."""
    import math
    for x in range(int(x0), int(x1) + 1):
        u = (x - x0) / max(x1 - x0, 1)
        shape = profile(u) if profile else 1.0
        n = (0.6 + 0.22 * math.sin(x * 0.55 + phase * 1.3) + 0.12 * math.sin(x * 1.25 - phase * 0.9)
             + (0.16 if ((x // 3) * 5 + phase * 3) % 7 == 0 else 0))
        h = max(1, int(round(hmax * shape * n)))
        by = base_y - ((x * 7 + phase) % 3)
        for i in range(h):
            k = i / h
            c = ramp[3] if k < bright * 0.6 else ramp[2] if k < bright + 0.2 else ramp[1] if k < 0.8 else ramp[0]
            put(t, x, by - i, c)
        if h > 3 and (x + phase) % 4 == 0:
            put(t, x, by - h - 1, ramp[0])
