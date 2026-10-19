"""Objetos comunes a todas las zonas: cofre, fuente, portal y hoguera."""
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


def fountain(frame):
    t = tile()
    ellipse(t, 16, 23, 14, 7, ST)
    ellipse(t, 16, 22, 11, 4.6, [WATER[0], WATER[1], WATER[1], WATER[2]])
    rect(t, 14, 8, 17, 21, ST[2]); line(t, 14, 8, 14, 21, ST[3]); line(t, 17, 8, 17, 21, ST[1])
    ellipse(t, 15.5, 8, 4, 1.8, [ST[1], ST[2], ST[3]])
    outline(t)
    # agua: chorro y destellos (sin contorno)
    for k in range(4):
        put(t, 15 + (frame + k) % 2, 6 - k, WATER[2 + (k % 2)])
    for dx in (-3, 3):
        for k in range(4):
            put(t, 15.5 + dx + (dx // 3) * (k // 2), 5 + k + (frame % 2), WATER[2])
    sparks = [(10, 21), (21, 23), (13, 24), (19, 20)] if frame == 0 else [(12, 20), (20, 22), (16, 25), (9, 23)]
    for x, y in sparks:
        put(t, x, y, WATER[3])
    ground_shadow(t, 16, 30, 14, 1.5)
    return t


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
        ("fuente", "objeto", True, [fountain(0), fountain(1)], None),
        ("portal", "objeto", False, [portal(0), portal(1)], None),
        ("hoguera", "objeto", True, [campfire(0), campfire(1)], None),
    ]
