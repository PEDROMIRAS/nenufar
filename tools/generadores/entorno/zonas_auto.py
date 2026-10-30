"""Autotiles específicos de Ruinas y Cripta, sobre la máscara de 4 bits de autotile.py."""
from PIL import Image
from base import *
from autotile import mask_for, edge, wobble, wobble_water
import ruinas
import cripta
import cauce

GRASS = [(58, 92, 52), (82, 122, 62), (110, 150, 76), (146, 178, 96)]
POOL = [(46, 66, 82), (66, 96, 116), (112, 146, 164), (176, 204, 214)]


def generic(base, bits, half, rad, wob, corners, paint, seed, rim=None):
    t, r = base.copy(), rng(seed * 29 + bits)
    m = mask_for(bits, half, rad, corners=corners, wob=wob)
    for y in range(S):
        for x in range(S):
            if m[y, x]:
                depth = next((k for k in range(1, 8) if (y - k < 0 and not bits & 1) or (y - k >= 0 and not m[y - k, x])), 8)
                paint(t, x, y, edge(m, x, y), depth, r)
    if rim:
        for y in range(S):
            for x in range(S):
                if not m[y, x] and any(0 <= x + dx < S and 0 <= y + dy < S and m[y + dy, x + dx]
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    put(t, x, y, rim)
    return t


def distance_in(m):
    """Distancia (en píxeles, hasta 6) de cada píxel de la máscara a su borde."""
    d = np.zeros(m.shape, int)
    cur = m.copy()
    for k in range(1, 7):
        d[cur] = k
        nxt = cur.copy()
        nxt[1:, :] &= cur[:-1, :]; nxt[:-1, :] &= cur[1:, :]
        nxt[:, 1:] &= cur[:, :-1]; nxt[:, :-1] &= cur[:, 1:]
        cur = nxt
    return d


# ---------- Ruinas ----------
def ruinas_auto():
    st = ruinas.PAL["st"]
    base = ruinas.P.flagstones(ruinas.PAL, 101, tones=(1, 2, 2), soft=True)

    def calzada(t, x, y, e, depth, r):
        slab = ((x // 8) + (y // 8)) % 2
        c = st[3] if slab else st[2]
        if y % 8 == 1 and x % 8:
            c = st[min(4, (3 if slab else 2) + 1)]
        if x % 8 == 0 or y % 8 == 0:
            c = st[1]
        if e:
            c = st[0]
        put(t, x, y, c)

    def charco(t, x, y, e, depth, r):
        c = POOL[0] if depth <= 2 else POOL[1]
        if e and e[1] != -1:
            c = POOL[3]
        if r.random() < 0.015:
            c = POOL[2]
        put(t, x, y, c)

    mortar = st[0]
    nonlocal_dist = [None]

    def hierba(t, x, y, e, depth, r):
        # la hierba crece primero por las juntas y se espesa hacia el centro
        d = nonlocal_dist[0][y, x]
        in_joint = base_px(x, y) == mortar or base_px(x, y) == st[1]
        p = min(1.0, 0.18 * d + (0.55 if in_joint else 0.0))
        if r.random() > p:
            return
        c = GRASS[1] if r.random() < 0.65 else GRASS[0]
        if d >= 4 and r.random() < 0.25:
            c = GRASS[2]
        if r.random() < 0.05:
            c = GRASS[3]
        put(t, x, y, c)

    def base_px(x, y):
        return tuple(int(v) for v in base[y, x][:3])

    out = {}
    for b in range(16):
        out[f"calzada_{b}"] = generic(base, b, 9, 9, lambda v: 0, False, calzada, 1)
        out[f"charco_{b}"] = generic(base, b, 9, 9, wobble_water, True, charco, 2, rim=st[0])
        m = mask_for(b, 11, 11, corners=True, wob=wobble_water)
        nonlocal_dist[0] = distance_in(m)
        out[f"hierba_{b}"] = generic(base, b, 11, 11, wobble_water, True, hierba, 3)
    return out


# ---------- Cripta ----------
def cripta_auto():
    st, acc = cripta.PAL["st"], cripta.PAL["acc"]
    cloth, gold = cripta.CLOTH, cripta.GOLD
    base = cripta.floor(201)

    def alfombra(t, x, y, e, depth, r):
        c = cloth[1]
        if (x + y) % 6 == 0 or (x - y) % 6 == 0:
            c = cloth[2] if (x // 6 + y // 6) % 2 else cloth[0]
        if e:
            c = gold[1]
        put(t, x, y, c)

    def fosa(t, x, y, e, depth, r):
        if depth <= 3:
            c = [st[3], st[2], st[1]][depth - 1]
        else:
            c = (12, 8, 20)
            if r.random() < 0.04:
                c = acc[0]
            if depth >= 6 and r.random() < 0.03:
                c = acc[1]
        if e and depth > 3:
            c = (12, 8, 20)
        put(t, x, y, c)

    out = {}
    for b in range(16):
        out[f"alfombra_{b}"] = generic(base, b, 9, 9, lambda v: 0, False, alfombra, 4)
        out[f"fosa_{b}"] = generic(base, b, 10, 10, wobble_water, True, fosa, 5, rim=st[4])
    return out


# ---------- Cauce Seco ----------
def cauce_auto():
    st, acc = cauce.PAL["st"], cauce.PAL["acc"]
    base = cauce.floor(301)

    def lecho(t, x, y, e, depth, r):
        """Camino de río seco: losas claras y blanqueadas con guijarros, más claras que el suelo de alrededor."""
        c = (122, 110, 98) if (x // 8 + y // 8) % 2 else (106, 96, 86)
        if e:
            c = (160, 148, 134)
        elif r.random() < 0.04:
            c = cauce.GUIJARRO[1]
        put(t, x, y, c)

    def lava(t, x, y, e, depth, r):
        """Pozo de brasas: roca negra en el borde y rojo oscuro que se aviva hacia el centro, con pocas chispas."""
        if depth <= 2:
            c = [st[3], st[2]][depth - 1]
        elif depth == 3:
            c = (70, 18, 10)
        elif depth == 4:
            c = (112, 30, 12)
        else:
            c = (120, 34, 12) if depth == 5 else (150, 46, 14)
            if r.random() < 0.10:
                c = acc[1]
            if depth >= 6 and r.random() < 0.03:
                c = acc[2]
        put(t, x, y, c)

    out = {}
    for b in range(16):
        out[f"lecho_{b}"] = generic(base, b, 9, 9, lambda v: 0, False, lecho, 6)
        out[f"lava_{b}"] = generic(base, b, 10, 10, wobble_water, True, lava, 7, rim=st[4])
    return out


def as_images(d):
    return {k: Image.fromarray(v, "RGBA") for k, v in d.items()}
