"""Objetos comunes a todas las zonas: cofre, fuente (de 3x2 casillas), portal y hoguera."""
import math
from base import *

W = [(78, 48, 32), (118, 76, 46), (160, 110, 64), (196, 146, 90)]  # madera
GOLD = [(140, 98, 38), (206, 162, 62), (246, 214, 120)]
ST = [(64, 66, 74), (100, 104, 112), (140, 144, 150), (182, 186, 188)]
WATER = [(40, 92, 160), (70, 140, 210), (130, 196, 240), (220, 244, 255)]
FIRE = [(210, 84, 40), (246, 150, 52), (255, 214, 110), (255, 246, 210)]
VIO = [(46, 18, 76), (96, 40, 160), (164, 96, 236), (230, 204, 255)]


def chest(opened=False):
    t = tile()
    rect(t, 6, 15, 25, 27, W[1])
    for y in (19, 23):
        rect(t, 6, y, 25, y, W[0])
    line(t, 25, 15, 25, 27, W[0]); line(t, 6, 15, 6, 27, W[2])
    if not opened:
        rect(t, 6, 9, 25, 14, W[2]); rect(t, 7, 8, 24, 8, W[3]); rect(t, 6, 14, 25, 14, W[0])
        for x in (9, 21):
            rect(t, x, 8, x + 1, 27, GOLD[1]); line(t, x, 8, x, 27, GOLD[2])
        rect(t, 14, 13, 17, 17, GOLD[1]); put(t, 15, 15, W[0]); put(t, 15, 16, W[0]); put(t, 14, 13, GOLD[2])
    else:
        rect(t, 6, 3, 25, 8, W[1]); rect(t, 7, 2, 24, 2, W[2]); rect(t, 6, 8, 25, 8, W[0])
        rect(t, 7, 9, 24, 14, (40, 24, 18))
        for x, y in ((10, 12), (13, 11), (16, 12), (19, 11), (21, 13), (12, 13)):
            put(t, x, y, GOLD[2]); put(t, x + 1, y, GOLD[1])
        put(t, 15, 10, FIRE[3])
        for x in (9, 21):
            rect(t, x, 15, x + 1, 27, GOLD[1]); line(t, x, 15, x, 27, GOLD[2])
            rect(t, x, 2, x + 1, 8, GOLD[1])
    outline(t)
    ground_shadow(t, 16, 29, 12, 2)
    return t


PIEDRA = [(30, 34, 48), (52, 58, 76), (84, 92, 112), (124, 132, 152)]  # la piedra de la fuente: azulada y oscura
AGUA_F = [(34, 78, 150), (64, 140, 214), (120, 204, 248), (214, 244, 255)]
PISTILO = (255, 170, 120)


def _juntas(t, x0, x1, y0, y1):
    """Piedras de la pared de un piso: juntas oscuras en filas desfasadas, con un filo claro arriba de cada una."""
    for k, y in enumerate(range(y0, y1, 4)):
        line(t, x0, y, x1, y, PIEDRA[0])
        for x in range(x0 + (k % 2) * 5, x1, 10):
            line(t, x, y, x, min(y + 3, y1), PIEDRA[0])
            put(t, x + 1, y + 1, PIEDRA[3])


def _piso(t, cx, cy, rx, ry, alto):
    """Un piso: pared de piedra con juntas, borde claro y la lámina de agua dentro."""
    ellipse(t, cx, cy + alto, rx, ry, [PIEDRA[0], PIEDRA[1], PIEDRA[1]])
    rect(t, cx - rx, cy, cx + rx, cy + alto, PIEDRA[1])
    _juntas(t, cx - rx + 1, cx + rx - 1, cy + 3, cy + alto)
    ellipse(t, cx, cy, rx, ry, [PIEDRA[1], PIEDRA[2], PIEDRA[3]])
    ellipse(t, cx, cy + 0.6, rx - 5, ry - 2.6, [AGUA_F[0], AGUA_F[1], AGUA_F[1], AGUA_F[2]])


def _nenufar(t, cx, cy):
    """Flor de loto morada con hojas, de unos 9x4 píxeles."""
    for dx, dy, c in ((-4, 1, VIO[0]), (-3, 1, VIO[1]), (3, 1, VIO[1]), (4, 1, VIO[0]), (-2, 0, VIO[1]), (-1, 0, VIO[2]),
                      (0, -1, VIO[2]), (1, 0, VIO[2]), (2, 0, VIO[1]), (-1, 1, VIO[1]), (0, 1, VIO[2]), (1, 1, VIO[1]),
                      (-2, 1, VIO[0]), (2, 1, VIO[0]), (0, 0, VIO[3])):
        put(t, cx + dx, cy + dy, c)
    put(t, cx, cy - 2, PISTILO)


def fountain(frame):
    """Fuente de la sala de descanso: 3 casillas de ancho y 2 de alto (96x64). Tres pisos de piedra con agua
    que cae de uno a otro, nenúfares morados y chispas azules (sale de la imagen 14 de las referencias)."""
    t = tile(2 * S, 3 * S)
    _piso(t, 48, 41, 44, 10, 10)   # el pilón de abajo
    _piso(t, 48, 30, 30, 7, 7)     # el piso de en medio
    # Columna y taza de arriba
    rect(t, 43, 15, 52, 24, PIEDRA[1]); line(t, 43, 15, 43, 24, PIEDRA[3]); line(t, 52, 15, 52, 24, PIEDRA[0])
    ellipse(t, 48, 14, 14, 4.5, [PIEDRA[1], PIEDRA[2], PIEDRA[3]])
    ellipse(t, 48, 14.4, 10, 2.6, [AGUA_F[0], AGUA_F[1], AGUA_F[2]])
    outline(t)
    # Cascadas de un piso al siguiente (sin contorno) y centelleo del agua
    for lado in (-1, 1):
        for k in range(10):
            put(t, 48 + lado * 11, 16 + k, AGUA_F[2 + (k + frame) % 2])
        for dx in (22, 14):
            for k in range(9):
                put(t, 48 + lado * dx, 31 + k, AGUA_F[2 + (k + frame) % 2])
    for x, y in ((20, 41), (74, 40), (32, 45), (62, 46), (40, 31), (57, 30), (48, 14)):
        _nenufar(t, x, y)
    for i, (x, y) in enumerate(((16, 39), (80, 42), (28, 33), (68, 32), (36, 47), (60, 44), (46, 29), (52, 28))):
        if (i + frame) % 2 == 0:
            put(t, x, y, AGUA_F[3])
    for i, (x, y) in enumerate(((40, 3), (56, 5), (48, 1), (30, 8), (66, 9))):  # chispas sobre la fuente
        if (i + frame) % 2 == 0:
            put(t, x, y, AGUA_F[2])
    for x, y in ((84, 47), (85, 49), (86, 46), (82, 50), (87, 48)):  # hiedra en la pared
        put(t, x, y, (60, 120, 56))
    ground_shadow(t, 48, 62, 44, 2)
    return t


def piezas_fuente():
    """La fuente partida en casillas: (nombre, [fotogramas]) de cada columna, arriba y abajo."""
    fr = [fountain(0), fountain(1)]
    piezas = []
    for col, nombre in enumerate(("fuente_izq", "fuente_cen", "fuente_der")):
        x = col * S
        piezas.append((nombre + "_sup", "dosel", False, [f[:S, x:x + S].copy() for f in fr], None))
        piezas.append((nombre + "_inf", "objeto", True, [f[S:, x:x + S].copy() for f in fr], None))
    return piezas


def portal(frame):
    t = tile()
    for y in range(4, 30):
        for x in range(4, 28):
            dx, dy = (x + 0.5 - 16) / 11.5, (y + 0.5 - 17) / 13
            d = dx * dx + dy * dy
            if 0.72 < d <= 1:
                light = x < 16
                put(t, x, y, ST[3] if light and y < 14 else (ST[2] if light else ST[1]))
            elif d <= 0.72:
                ang = math.atan2(dy, dx) + frame * 0.6
                swirl = (math.sin(ang * 3 + d * 9) + 1) / 2
                c = VIO[0] if d > 0.55 else (VIO[1] if swirl < 0.55 else VIO[2])
                if d < 0.06:
                    c = VIO[3]
                put(t, x, y, c)
    rect(t, 6, 27, 25, 29, ST[1]); rect(t, 6, 27, 25, 27, ST[2])
    outline(t)
    for x, y in ((5, 6 + frame), (26, 9 - frame), (16, 2 + frame)):
        put(t, x, y, VIO[2])
    return t


def campfire(frame):
    t = tile()
    for a in range(0, 360, 40):
        x = 16 + 10 * math.cos(math.radians(a)); y = 24 + 4.5 * math.sin(math.radians(a))
        ellipse(t, x, y, 2.4, 1.8, ST)
    line(t, 9, 26, 22, 21, W[1], w=2); line(t, 9, 21, 22, 26, W[2], w=2)
    outline(t)
    h = [12, 14][frame]
    for y in range(23 - h, 24):
        k = (23 - y) / h
        w = 5 * (1 - k) ** 0.7 + 0.5
        sway = round(math.sin(y * 0.6 + frame * 2) * k * 1.5)
        for x in range(int(16 - w + sway), int(16 + w + sway) + 1):
            d = abs(x - 16 - sway) / max(w, 1)
            put(t, x, y, FIRE[3] if d < 0.3 and k < 0.6 else (FIRE[2] if d < 0.6 else (FIRE[1] if k < 0.8 else FIRE[0])))
    for x, y in ((11, 8 + frame * 2), (21, 6 + frame), (17, 4 - frame)):
        put(t, x, y, FIRE[1])
    ground_shadow(t, 16, 29, 13, 2)
    return t


def tiles():
    return [
        ("cofre_cerrado", "objeto", True, [chest()], None),
        ("cofre_abierto", "objeto", True, [chest(True)], None),
        *piezas_fuente(),
        ("portal", "objeto", False, [portal(0), portal(1)], None),
        ("hoguera", "objeto", True, [campfire(0), campfire(1)], None),
    ]
