"""Genera la hoja de sprites del héroe rana (32x32, 4 direcciones).

Filas: abajo, izquierda, derecha, arriba.
Columnas: reposo 0-1, caminar 0-3.
"""
import json
import numpy as np
from PIL import Image

S = 32
PAL = {
    "outline": (38, 30, 36),
    "skin": (112, 174, 64),
    "skin_s": (68, 122, 50),
    "skin_l": (164, 210, 96),
    "belly": (214, 222, 160),
    "eye": (236, 172, 52),
    "eye_s": (196, 112, 40),
    "pupil": (24, 20, 28),
    "white": (250, 248, 236),
    "cloak": (218, 196, 164),
    "cloak_s": (174, 144, 118),
    "cloak_d": (128, 96, 82),
    "cloak_l": (238, 222, 196),
    "tunic": (58, 92, 52),
    "strap": (112, 62, 42),
    "metal": (186, 190, 200),
    "metal_s": (120, 124, 138),
    "grip": (126, 52, 40),
    "sheath": (84, 48, 38),
}


class Canvas:
    def __init__(self):
        self.px = np.full((S, S), None, dtype=object)

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < S and 0 <= y < S:
            self.px[y, x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, base, shadow=None, light=None):
        for y in range(S):
            for x in range(S):
                dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                d = dx * dx + dy * dy
                if d <= 1.0:
                    c = base
                    if shadow and (dx * 0.55 + dy * 0.85) > 0.45:
                        c = shadow
                    elif light and (dx * 0.6 + dy * 0.8) < -0.55 and d > 0.25:
                        c = light
                    self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(n - 1, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for ox in range(w):
                self.put(x + ox, y, c)

    def outline(self):
        out = self.px.copy()
        for y in range(S):
            for x in range(S):
                if self.px[y, x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < S and 0 <= ny < S and self.px[ny, nx] not in (None, "outline"):
                        out[y, x] = "outline"
                        break
        self.px = out

    def image(self):
        img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        for y in range(S):
            for x in range(S):
                c = self.px[y, x]
                if c is not None:
                    img.putpixel((x, y), PAL[c] + (255,))
        return img


def cloak_body(c, cx, top, bottom, hw0, hw1, opening=True):
    for y in range(top, bottom + 1):
        t = (y - top) / max(bottom - top, 1)
        hw = hw0 + (hw1 - hw0) * t
        for x in range(int(cx - hw), int(cx + hw) + 1):
            rel = (x - (cx - hw)) / (2 * hw)
            col = "cloak"
            if rel > 0.68 or y == bottom:
                col = "cloak_s"
            elif rel < 0.18 and y < top + 4:
                col = "cloak_l"
            c.put(x, y, col)
    if opening:
        c.rect(cx - 1, top + 3, cx + 1, bottom, "tunic")
        c.line(cx - 2, top + 3, cx - 2, bottom, "cloak_d")
        c.line(cx + 2, top + 3, cx + 2, bottom, "cloak_d")


def eye(c, cx, cy, look):
    c.ellipse(cx, cy, 2.7, 2.7, "eye", shadow="eye_s")
    c.rect(cx - 1 + look, cy - 1, cx + look, cy + 1, "pupil")
    c.put(cx - 1 + look, cy - 1, "white")


def foot(c, x, y, shade=False):
    col = "skin_s" if shade else "skin"
    c.rect(x, y, x + 4, y + 1, col)
    c.rect(x + 1, y - 1, x + 3, y - 1, col)
    c.put(x + 1, y + 1, "skin_s")
    c.put(x + 3, y + 1, "skin_s")


def draw_front(c, bob, lift_l, lift_r, swing):
    # espada a la espalda (asoma sobre el hombro derecho)
    c.line(21, 9 + bob, 24, 3 + bob, "grip")
    c.rect(24, 1 + bob, 25, 2 + bob, "metal")
    c.rect(20, 9 + bob, 23, 9 + bob, "metal_s")
    # piernas y pies
    c.rect(11, 25 + bob, 21, 27, "tunic")
    foot(c, 9, 29 - lift_l)
    foot(c, 18, 29 - lift_r)
    # capa
    cloak_body(c, 16, 15 + bob, 26 + bob, 7, 9)
    # correa cruzada
    c.line(10, 17 + bob, 21, 24 + bob, "strap")
    c.put(15, 20 + bob, "metal")
    # manos
    c.rect(6, 21 + bob - swing, 7, 22 + bob - swing, "skin")
    c.rect(25, 21 + bob + swing, 26, 22 + bob + swing, "skin")
    # capucha y cara
    c.ellipse(16, 11 + bob, 9.5, 7.5, "cloak_d")
    c.ellipse(16, 10 + bob, 9.5, 7.5, "cloak", shadow="cloak_s", light="cloak_l")
    c.ellipse(16, 11.5 + bob, 7, 5, "cloak_d")
    c.ellipse(16, 11.5 + bob, 6, 4.3, "skin", shadow="skin_s", light="skin_l")
    c.rect(12, 13 + bob, 20, 15 + bob, "belly")
    c.line(13, 13 + bob, 19, 13 + bob, "skin_s")
    eye(c, 12.5, 9.5 + bob, 0)
    eye(c, 19.5, 9.5 + bob, 1)


def draw_back(c, bob, lift_l, lift_r, swing):
    c.rect(11, 25 + bob, 21, 27, "tunic")
    foot(c, 9, 29 - lift_l, shade=True)
    foot(c, 18, 29 - lift_r, shade=True)
    c.rect(6, 21 + bob + swing, 7, 22 + bob + swing, "skin")
    c.rect(25, 21 + bob - swing, 26, 22 + bob - swing, "skin")
    cloak_body(c, 16, 15 + bob, 26 + bob, 7, 9, opening=False)
    c.ellipse(16, 11 + bob, 9.5, 7.5, "cloak_d")
    c.ellipse(16, 10 + bob, 9.5, 7.5, "cloak", shadow="cloak_s", light="cloak_l")
    c.line(16, 4 + bob, 16, 16 + bob, "cloak_s")
    # espada en la espalda: vaina en diagonal
    c.line(12, 25 + bob, 19, 11 + bob, "sheath", w=2)
    c.rect(19, 9 + bob, 21, 10 + bob, "metal_s")
    c.line(21, 8 + bob, 23, 3 + bob, "grip", w=2)
    c.rect(23, 1 + bob, 24, 2 + bob, "metal")


def draw_side(c, bob, front_x, back_x, lift_f, lift_b, swing):
    # mirando a la derecha
    c.line(11, 9 + bob, 8, 3 + bob, "grip")
    c.rect(7, 1 + bob, 8, 2 + bob, "metal")
    c.rect(9, 9 + bob, 12, 9 + bob, "metal_s")
    foot(c, back_x, 29 - lift_b, shade=True)
    c.rect(12, 25 + bob, 19, 27, "tunic")
    foot(c, front_x, 29 - lift_f)
    cloak_body(c, 15, 15 + bob, 26 + bob, 6, 7.5, opening=False)
    c.line(19, 18 + bob, 19, 26 + bob, "cloak_d")
    c.line(12, 17 + bob, 19, 23 + bob, "strap")
    c.rect(20 + swing, 21 + bob, 21 + swing, 22 + bob, "skin")
    c.ellipse(14.5, 11 + bob, 7.5, 7.2, "cloak_d")
    c.ellipse(14.5, 10 + bob, 7.5, 7.2, "cloak", shadow="cloak_s", light="cloak_l")
    c.ellipse(19.5, 11.5 + bob, 5.8, 5, "cloak_d")
    c.ellipse(20, 11.5 + bob, 5, 4.3, "skin", shadow="skin_s", light="skin_l")
    c.rect(18, 13 + bob, 24, 15 + bob, "belly")
    c.line(19, 13 + bob, 24, 13 + bob, "skin_s")
    eye(c, 20.5, 9.5 + bob, 1)


BOB_IDLE = [0, 1]
BOB_WALK = [0, -1, 0, -1]


def frame(direction, anim, i):
    c = Canvas()
    if anim == "idle":
        bob = BOB_IDLE[i]
        params = dict(lift_l=0, lift_r=0, swing=0)
    else:
        bob = BOB_WALK[i]
        lift_l, lift_r = [(2, 0), (0, 0), (0, 2), (0, 0)][i]
        swing = [1, 0, -1, 0][i]
        params = dict(lift_l=lift_l, lift_r=lift_r, swing=swing)

    if direction == "down":
        draw_front(c, bob, **params)
    elif direction == "up":
        draw_back(c, bob, **params)
    else:
        if anim == "idle":
            fx, bx, lf, lb, sw = 17, 10, 0, 0, 0
        else:
            fx, bx, lf, lb, sw = [(18, 9, 0, 0, -1), (15, 12, 0, 1, 0),
                                  (10, 17, 0, 0, 1), (13, 14, 1, 0, 0)][i]
        draw_side(c, bob, fx, bx, lf, lb, sw)
    c.outline()
    img = c.image()
    if direction == "left":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img


DIRS = ["down", "left", "right", "up"]
ANIMS = [("idle", 2), ("walk", 4)]


def build(out_dir):
    cols = sum(n for _, n in ANIMS)
    sheet = Image.new("RGBA", (cols * S, len(DIRS) * S), (0, 0, 0, 0))
    meta = {"frameWidth": S, "frameHeight": S, "anchor": {"x": 16, "y": 30},
            "directions": {}, "animations": {}}
    for row, d in enumerate(DIRS):
        meta["directions"][d] = row
        col = 0
        for name, n in ANIMS:
            meta["animations"][name] = {"startColumn": col, "frames": n,
                                        "fps": 3 if name == "idle" else 8, "loop": True}
            for i in range(n):
                sheet.paste(frame(d, name, i), (col * S, row * S))
                col += 1
    sheet.save(f"{out_dir}/rana_heroe.png")
    with open(f"{out_dir}/rana_heroe.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    return sheet


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    sheet = build(out)
    sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(f"{out}/preview_x8.png")
