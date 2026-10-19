"""Tileset del Bosque."""
import math
from base import *

G = [(40, 74, 46), (62, 108, 56), (88, 140, 66), (122, 172, 84), (168, 204, 108)]  # verdes
D = [(88, 60, 42), (124, 88, 58), (162, 122, 80)]  # tierra
B = [(62, 40, 30), (96, 64, 42), (132, 92, 58)]  # corteza
R = [(70, 74, 84), (104, 108, 116), (144, 148, 150), (186, 188, 182)]  # roca
P = [(30, 62, 52), (44, 90, 66), (66, 120, 80), (98, 152, 96)]  # pino
SHADE = (30, 52, 38)
PINK, YEL, WHITE, RED = (232, 140, 170), (240, 210, 96), (240, 236, 220), (196, 64, 56)
THORN_A, THORN_B, SPIKE = (92, 62, 42), (64, 42, 30), (214, 204, 164)


def grass(seed, variant="liso"):
    t, r = tile(), rng(seed)
    fill(t, G[2])
    # manchas grandes y suaves que rompen la repetición
    for _ in range(1):
        cx, cy = r.randrange(S), r.randrange(S)
        tone = G[1]
        for y in range(-6, 7):
            for x in range(-8, 9):
                if (x / 8) ** 2 + (y / 6) ** 2 <= 1 and r.random() < 0.3:
                    put(t, cx + x, cy + y, tone, True)
    for _ in range(40):
        put(t, r.randrange(S), r.randrange(S), G[1], wrap=True)
    for _ in range(18):
        x, y = r.randrange(S), r.randrange(S)
        put(t, x, y, G[3], True); put(t, x + 2, y, G[3], True); put(t, x + 1, y + 1, G[1], True)
    for _ in range(5):
        put(t, r.randrange(S), r.randrange(S), G[4], wrap=True)
    if variant == "hierba":
        for _ in range(5):
            x, y = r.randrange(S), r.randrange(4, S)
            for k, dx in enumerate((-2, 0, 2)):
                h = 3 + (k == 1)
                line(t, x + dx, y, x + dx + (dx // 2), y - h, G[3], wrap=True)
                put(t, x + dx + (dx // 2), y - h, G[4], True)
                put(t, x + dx, y + 1, G[0], True)
    elif variant == "flores":
        for _ in range(6):
            x, y = r.randrange(S), r.randrange(S)
            petal = r.choice([PINK, WHITE, PINK])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(t, x + dx, y + dy, petal, True)
            put(t, x, y, YEL, True)
            put(t, x, y + 2, G[0], True)
    elif variant == "setas":
        for _ in range(3):
            x, y = r.randrange(3, S - 3), r.randrange(4, S - 3)
            rect(t, x - 1, y - 1, x + 1, y - 1, RED); put(t, x, y - 2, RED)
            put(t, x - 1, y - 1, WHITE)
            rect(t, x, y, x, y + 1, WHITE)
            put(t, x + 1, y + 1, G[0])
    return t


def canopy(seed):
    t, r = tile(), rng(seed)
    fill(t, G[0])
    blobs = [(r.randrange(S), r.randrange(S), r.uniform(5, 8)) for _ in range(12)]
    for x, y, rad in sorted(blobs, key=lambda b: b[1]):
        ellipse(t, x, y, rad, rad * 0.85, [G[0], G[1], G[2], G[3]], wrap=True)
        for _ in range(3):
            put(t, x - rad / 2 + r.randrange(3), y - rad / 2 + r.randrange(3), G[4], True)
    return t


def trunk(t, x, y0, y1, w):
    rect(t, x, y0, x + w - 1, y1, B[1])
    line(t, x, y0, x, y1, B[2])
    line(t, x + w - 1, y0, x + w - 1, y1, B[0])
    put(t, x - 1, y1, B[0]); put(t, x + w, y1, B[0])


def wall_north(seed, door=None):
    t, r = canopy(seed), rng(seed + 7)
    phase = r.uniform(0, 6)
    edge = [19 + round(2 * math.sin(x / 4.5 + phase)) for x in range(S)]
    for x in range(S):
        for y in range(edge[x], S):
            put(t, x, y, darken(SHADE, 0.75 + 0.25 * (y - edge[x]) / 12))
        put(t, x, edge[x] - 1, G[0])
    if door is None:
        xs, x = [], r.randrange(1, 6)
        while x < S - 3:
            xs.append(x)
            x += r.randrange(11, 17)
        for x in xs:
            w = r.choice([3, 4, 4, 5])
            trunk(t, x, edge[min(x + 1, S - 1)] - 2, 30, w)
    # sotobosque al pie: rompe la línea de troncos
    for _ in range(4):
        bx = r.randrange(S)
        ellipse(t, bx, 29, r.uniform(3, 5), 3, [G[0], G[1], G[2]], wrap=True)
    for x in range(S):
        put(t, x, 31, G[1] if r.random() < 0.6 else G[2])
    if door:
        for y in range(3, S):
            half = 6 + (1 if y > 10 else 0) + (r.random() < 0.3)
            for x in range(16 - half, 16 + half):
                k = max(0.0, (y - 18) / 13)
                dirt = D[1] if (x * 7 + y * 3) % 5 else D[0]
                c = tuple(int(16 + (dv - 16) * k) for dv in dirt) if k > 0 else (16, 28, 22)
                put(t, x, y, c)
        trunk(t, 6, 14, 30, 4)
        trunk(t, 22, 14, 30, 4)
        if door == "cerrada":
            for k in range(4):
                y0 = 12 + k * 5
                for x in range(9, 23):
                    yy = y0 + (1 if ((x + k) // 2) % 2 else -1)
                    put(t, x, yy, THORN_A); put(t, x, yy + 1, THORN_B)
                    if (x + k) % 3 == 0:
                        put(t, x, yy - 1, SPIKE)
                    if (x + k) % 5 == 2:
                        put(t, x, yy + 2, G[2])
    return t


def tree():
    t = tile(2 * S)
    trunk(t, 14, 38, 58, 5)
    put(t, 12, 58, B[1]); put(t, 20, 58, B[0])
    for cx, cy, rad in ((9, 26, 8), (23, 26, 8), (16, 15, 10), (11, 19, 8), (21, 19, 8), (16, 30, 9)):
        ellipse(t, cx, cy, rad, rad * 0.85, [G[0], G[1], G[2], G[3]])
    for x, y in ((10, 9), (12, 8), (7, 15), (15, 6), (11, 14), (6, 21), (18, 10)):
        put(t, x, y, G[4])
    outline(t)
    ground_shadow(t, 16, 60, 11, 3)
    return t


def pine():
    t = tile(2 * S)
    trunk(t, 14, 48, 59, 4)
    for i, (cy, hw) in enumerate(((14, 6), (24, 9), (34, 12), (44, 14))):
        for y in range(cy - 8, cy + 4):
            w = hw * (y - (cy - 8)) / 12
            for x in range(int(16 - w), int(16 + w) + 1):
                rel = (x - 16) / max(w, 1)
                c = P[3] if rel < -0.5 else (P[2] if rel < 0.1 else (P[1] if rel < 0.6 else P[0]))
                put(t, x, y, c)
    put(t, 16, 5, P[2])
    outline(t)
    ground_shadow(t, 16, 61, 10, 2.5)
    return t


def rock():
    t = tile()
    ellipse(t, 16, 21, 11, 8, R)
    line(t, 12, 17, 18, 24, R[1])
    for x, y in ((11, 14), (12, 14), (13, 13), (14, 13), (15, 14), (19, 14), (20, 15)):
        put(t, x, y, G[2]); put(t, x, y - 1, G[3])
    outline(t)
    ground_shadow(t, 16, 29, 11, 2.5)
    return t


def bush():
    t = tile()
    for cx, cy, rad in ((10, 21, 6.5), (22, 21, 6.5), (16, 16, 7)):
        ellipse(t, cx, cy, rad, rad * 0.9, [G[0], G[1], G[2], G[3]])
    for x, y in ((9, 19), (14, 15), (20, 18), (23, 22), (17, 21)):
        put(t, x, y, RED); put(t, x - 1, y - 1, PINK)
    outline(t)
    ground_shadow(t, 16, 28, 11, 2.5)
    return t


def stump():
    t = tile()
    rect(t, 9, 18, 23, 26, B[1])
    for x in range(11, 23, 3):
        line(t, x, 20, x, 26, B[0])
    line(t, 9, 18, 9, 26, B[2])
    rect(t, 7, 25, 9, 26, B[1]); rect(t, 23, 25, 25, 26, B[0])
    ellipse(t, 16, 18, 7.5, 3.5, [D[1], D[2], D[2]])
    for (rx, ry) in ((5, 2.2), (2.5, 1.1)):
        for a in range(0, 360, 20):
            put(t, 16 + rx * math.cos(math.radians(a)), 18 + ry * math.sin(math.radians(a)), D[1])
    outline(t)
    ground_shadow(t, 16, 28, 10, 2)
    return t


def brambles(vertical=False):
    t = tile()
    for k, y0 in enumerate((10, 16, 22)):
        for x in range(S):
            y = y0 + (1 if ((x + k * 2) // 3) % 2 else -1)
            put(t, x, y, THORN_A); put(t, x, y + 1, THORN_A); put(t, x, y + 2, THORN_B)
            if (x + k) % 3 == 0:
                put(t, x, y - 1, SPIKE)
            if (x + k) % 6 == 3:
                put(t, x, y + 3, G[2]); put(t, x + 1, y + 3, G[3])
    outline(t)
    if vertical:
        t[:] = np.transpose(t, (1, 0, 2))
    return t


def tiles():
    tsup, tinf = split_tall(tree())
    psup, pinf = split_tall(pine())
    return [
        ("suelo_liso_a", "suelo", False, [grass(11)], 20),
        ("suelo_liso_b", "suelo", False, [grass(15)], 20),
        ("suelo_liso_c", "suelo", False, [grass(16)], 20),
        ("suelo_hierba", "suelo", False, [grass(12, "hierba")], 20),
        ("suelo_flores", "suelo", False, [grass(13, "flores")], 12),
        ("suelo_setas", "suelo", False, [grass(14, "setas")], 8),
        ("muro_norte_a", "muro", True, [wall_north(21)], None),
        ("muro_norte_b", "muro", True, [wall_north(34)], None),
        ("muro_norte_c", "muro", True, [wall_north(47)], None),
        ("muro_a", "muro", True, [canopy(22)], None),
        ("muro_b", "muro", True, [canopy(58)], None),
        ("puerta_norte_abierta", "muro", False, [wall_north(21, "abierta")], None),
        ("puerta_norte_cerrada", "muro", True, [wall_north(21, "cerrada")], None),
        ("arbol_sup", "dosel", False, [tsup], None),
        ("arbol_inf", "objeto", True, [tinf], None),
        ("pino_sup", "dosel", False, [psup], None),
        ("pino_inf", "objeto", True, [pinf], None),
        ("roca", "objeto", True, [rock()], None),
        ("arbusto", "objeto", True, [bush()], None),
        ("tocon", "objeto", True, [stump()], None),
        ("barrera_h", "objeto", True, [brambles()], None),
        ("barrera_v", "objeto", True, [brambles(True)], None),
    ]
