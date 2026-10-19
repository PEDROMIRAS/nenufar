"""Rana maga (32x32, 4 direcciones) + bola de fuego morado (16x16).
Filas: abajo, izquierda, derecha, arriba.
Columnas: reposo 0-1, caminar 2-5, lanzar 6-9."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SPRITES = os.path.join(REPO, "public", "assets", "sprites")
PREVIEWS = os.path.join(REPO, "docs", "previews")

import json
from PIL import Image
from rana import Canvas, PAL, S

PAL.update({
    "hat": (44, 78, 102), "hat_s": (28, 50, 70), "hat_l": (76, 118, 140),
    "robe": (58, 112, 120), "robe_s": (36, 74, 86), "robe_l": (96, 152, 154),
    "gold": (226, 180, 72), "gold_s": (164, 118, 46),
    "sash": (124, 64, 176), "sash_s": (84, 40, 128),
    "iris": (178, 122, 236), "iris_s": (118, 70, 182),
    "wood": (120, 78, 46), "wood_s": (78, 50, 32),
    "orb": (226, 200, 255),
    # fuego morado (sin contorno: brilla)
    "f_core": (246, 228, 255), "f_mid": (190, 110, 246), "f_out": (120, 54, 196), "f_deep": (78, 30, 140),
})


def eye(c, cx, cy, look):
    c.ellipse(cx, cy, 2.7, 2.7, "iris", shadow="iris_s")
    c.rect(cx - 1 + look, cy - 1, cx + look, cy + 1, "pupil")
    c.put(cx - 1 + look, cy - 1, "white")


def foot(c, x, y, shade=False):
    col = "skin_s" if shade else "skin"
    c.rect(x, y, x + 5, y + 1, col)
    c.rect(x + 1, y - 1, x + 4, y - 1, col)
    c.put(x + 2, y + 1, "skin_s")
    c.put(x + 4, y + 1, "skin_s")


def wizard_hat(c, cx, brim_y, brim_hw, lean, bob):
    """Sombrero de mago: ala ancha y cono alto con la punta doblada."""
    by = brim_y + bob
    for x in range(int(cx - brim_hw), int(cx + brim_hw) + 1):
        edge = abs(x - cx) >= brim_hw - 1
        c.put(x, by, "hat_s" if edge else "hat")
        c.put(x, by + 1, "hat_s")
    for i in range(1, 10):
        y = by - i
        hw = max(0.5, 5.5 * (1 - i / 10))
        bend = lean * round(3 * (i / 8) ** 2)
        for x in range(int(round(cx - hw + bend)), int(round(cx + hw + bend)) + 1):
            rel = (x - bend - cx) / max(hw, 1)
            c.put(x, y, "hat_s" if rel > 0.3 else ("hat_l" if rel < -0.5 else "hat"))
    c.rect(cx - 5, by - 1, cx + 5, by - 1, "gold")
    c.put(cx, by - 1, "sash")
    c.put(cx - 1 + lean, by - 5, "gold")
    c.put(cx + lean, by - 6, "gold")


def robe(c, cx, top, bottom, hw0, hw1, sway=0):
    for y in range(top, bottom + 1):
        hw = hw0 + (hw1 - hw0) * (y - top) / max(bottom - top, 1)
        off = sway if y > bottom - 3 else 0
        for x in range(int(cx - hw) + off, int(cx + hw) + 1 + off):
            rel = (x - off - (cx - hw)) / (2 * hw)
            col = "robe_s" if rel > 0.66 else ("robe_l" if rel < 0.2 else "robe")
            c.put(x, y, "gold" if y == bottom else col)


def staff(c, x, top, bottom):
    c.rect(x, top + 2, x, bottom, "wood")
    c.rect(x + 1, top + 2, x + 1, bottom, "wood_s")
    c.put(x - 1, top + 1, "wood")
    c.put(x + 2, top + 1, "wood_s")
    c.rect(x, top, x + 1, top + 1, "orb")


def face(c, cx, bob, lx, rx):
    c.ellipse(cx, 13.5 + bob, 7.5, 4.8, "skin", shadow="skin_s", light="skin_l")
    c.rect(cx - 5, 15 + bob, cx + 5, 16 + bob, "belly")
    c.line(cx - 4, 15 + bob, cx + 4, 15 + bob, "skin_s")
    eye(c, lx, 12.5 + bob, 0)
    eye(c, rx, 12.5 + bob, 1)


def flame(fx, x, y, size, phase):
    """Llama morada que sube desde (x, y). size 0-3."""
    if size <= 0:
        return
    h = 2 + size * 2
    for i in range(h):
        yy = y - i
        w = max(0, round((size + 1) * (1 - i / h) ** 0.8))
        sway = (1 if (i + phase) % 4 == 0 else 0) if i > 1 else 0
        for xx in range(x - w + sway, x + w + 1 + sway):
            d = abs(xx - x - sway)
            col = "f_core" if d < w * 0.4 and i < h * 0.6 else ("f_mid" if d < w * 0.8 else "f_out")
            fx.put(xx, yy, col)
    fx.put(x + (phase % 3) - 1, y - h - 1, "f_mid")
    if size >= 3 and phase == 2:
        for dx, dy in ((-5, 0), (5, -1), (-4, -5), (4, -6), (-2, 2), (3, 2)):
            fx.put(x + dx, y + dy, "f_mid")
            fx.put(x + dx + (1 if dx > 0 else -1), y + dy, "f_out")


# posiciones del bastón por dirección: (x, punta_y) en reposo
STAFF = {"down": 4, "up": 27, "side": 27}


def body_down(c, bob, ll, lr, swing, raise_):
    sy = 10 + bob - raise_
    staff(c, STAFF["down"], sy, 29 - raise_ // 2)
    foot(c, 8, 29 - ll)
    foot(c, 18, 29 - lr)
    robe(c, 16, 16 + bob, 27, 7.5, 10, sway=-swing)
    c.rect(5, 17 + bob - raise_, 8, 20 + bob - raise_, "robe_l")
    c.rect(24, 17 + bob + swing, 28, 21 + bob + swing, "robe_s")
    c.rect(3, 19 + bob - raise_, 6, 20 + bob - raise_, "skin")
    c.rect(25, 22 + bob + swing, 27, 23 + bob + swing, "skin_s")
    c.rect(8, 22 + bob, 24, 23 + bob, "sash")
    c.rect(8, 23 + bob, 24, 23 + bob, "sash_s")
    c.line(16, 16 + bob, 16, 21 + bob, "gold")
    face(c, 16, bob, 12.5, 19.5)
    wizard_hat(c, 16, 10, 9.5, 1, bob)
    return STAFF["down"], sy


def body_up(c, bob, ll, lr, swing, raise_):
    foot(c, 8, 29 - ll, shade=True)
    foot(c, 18, 29 - lr, shade=True)
    robe(c, 16, 16 + bob, 27, 7.5, 10, sway=swing)
    c.ellipse(16, 13.5 + bob, 6.5, 4, "skin_s")
    c.rect(9, 14 + bob, 23, 16 + bob, "robe_s")
    c.rect(9, 14 + bob, 23, 14 + bob, "gold")
    c.rect(4, 17 + bob + swing, 8, 21 + bob + swing, "robe_l")
    c.rect(24, 17 + bob - raise_, 27, 20 + bob - raise_, "robe_s")
    c.rect(8, 22 + bob, 24, 23 + bob, "sash")
    # emblema de luna en la espalda
    c.rect(15, 18 + bob, 16, 18 + bob, "gold")
    c.put(14, 19 + bob, "gold")
    c.rect(15, 20 + bob, 16, 20 + bob, "gold")
    sy = 10 + bob - raise_
    staff(c, STAFF["up"], sy, 29 - raise_ // 2)
    c.rect(26, 19 + bob - raise_, 29, 20 + bob - raise_, "skin_s")
    wizard_hat(c, 16, 10, 9.5, -1, bob)
    return STAFF["up"], sy


def body_side(c, bob, fx_, bx, lf, lb, swing, raise_):
    foot(c, bx, 29 - lb, shade=True)
    robe(c, 14, 16 + bob, 27, 6, 8.5, sway=-1 if swing else 0)
    foot(c, fx_, 29 - lf)
    c.rect(7, 22 + bob, 21, 23 + bob, "sash")
    c.ellipse(15, 13.5 + bob, 6, 4.5, "skin_s")
    c.ellipse(21, 13.5 + bob, 6, 4.5, "skin", shadow="skin_s")
    c.rect(20, 15 + bob, 27, 16 + bob, "belly")
    c.line(21, 15 + bob, 27, 15 + bob, "skin_s")
    eye(c, 22, 12.5 + bob, 1)
    sy = 10 + bob - raise_
    staff(c, STAFF["side"] + swing, sy, 29 - raise_ // 2)
    c.rect(17, 17 + bob - raise_, 25 + swing, 20 + bob - raise_, "robe")
    c.rect(17, 20 + bob - raise_, 25 + swing, 20 + bob - raise_, "robe_s")
    c.rect(25 + swing, 19 + bob - raise_, 28 + swing, 20 + bob - raise_, "skin")
    wizard_hat(c, 15, 10, 8, -1, bob)
    return STAFF["side"] + swing, sy


def frame(direction, anim, i):
    c, fx = Canvas(), Canvas()
    bob, ll, lr, swing, raise_, fsize = 0, 0, 0, 0, 0, 2
    if anim == "idle":
        bob = [0, 1][i]
    elif anim == "walk":
        bob = [0, -1, 0, -1][i]
        ll, lr = [(2, 0), (0, 0), (0, 2), (0, 0)][i]
        swing = [1, 0, -1, 0][i]
    else:  # lanzar: alzar, cargar, soltar, recuperar
        raise_ = [1, 1, 1, 0][i]
        fsize = [2, 3, 3, 2][i]
    if direction == "down":
        sx, sy = body_down(c, bob, ll, lr, swing, raise_)
    elif direction == "up":
        sx, sy = body_up(c, bob, ll, lr, swing, raise_)
    else:
        if anim == "walk":
            f, b, lf, lb = [(19, 8, 0, 0), (15, 12, 0, 1), (9, 18, 0, 0), (13, 14, 1, 0)][i]
        else:
            f, b, lf, lb = 17, 9, 0, 0
        sx, sy = body_side(c, bob, f, b, lf, lb, swing, raise_)
    c.outline()
    flame(fx, sx, sy - 1, fsize, i + (0 if anim != "walk" else 1))
    img = c.image()
    img.alpha_composite(fx.image())
    if direction == "left":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img


def fireball(i):
    """Bola de fuego de 16x16 que viaja hacia la derecha."""
    c = Canvas()
    for x in range(1, 9):
        w = (x - 1) / 8 * 3
        jitter = ((x + i) % 3) - 1
        for y in range(round(8 - w + jitter * 0.5), round(8 + w + jitter * 0.5) + 1):
            c.put(x, y, "f_out" if x < 5 else "f_mid")
    c.ellipse(10.5, 8.5, 4, 4, "f_mid")
    c.ellipse(11, 8.5, 2.6, 2.6, "f_core")
    c.put(3 + i % 2, 4 + i % 3, "f_mid")
    c.put(2 + (i + 1) % 2, 12 - i % 3, "f_out")
    img = c.image().crop((0, 0, 16, 16))
    return img


DIRS = ["down", "left", "right", "up"]
ANIMS = [("idle", 2, 3, True), ("walk", 4, 8, True), ("cast", 4, 10, False)]


def build(out):
    cols = sum(a[1] for a in ANIMS)
    sheet = Image.new("RGBA", (cols * S, 4 * S), (0, 0, 0, 0))
    meta = {"frameWidth": S, "frameHeight": S, "anchor": {"x": 16, "y": 30},
            "directions": {d: r for r, d in enumerate(DIRS)}, "animations": {},
            "castReleaseFrame": 2}
    for r, d in enumerate(DIRS):
        col = 0
        for name, n, fps, loop in ANIMS:
            meta["animations"][name] = {"startColumn": col, "frames": n, "fps": fps, "loop": loop}
            for i in range(n):
                sheet.paste(frame(d, name, i), (col * S, r * S))
                col += 1
    sheet.save(f"{out}/rana_maga.png")
    json.dump(meta, open(f"{out}/rana_maga.json", "w"), indent=2)

    fb = Image.new("RGBA", (64, 16), (0, 0, 0, 0))
    for i in range(4):
        fb.paste(fireball(i), (i * 16, 0))
    fb.save(f"{out}/fuego_morado.png")
    json.dump({"frameWidth": 16, "frameHeight": 16, "frames": 4, "fps": 12, "loop": True,
               "faces": "right", "anchor": {"x": 11, "y": 8}},
              open(f"{out}/fuego_morado.json", "w"), indent=2)

    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(os.path.join(PREVIEWS, "maga_x6.png"))

    # vista previa animada: reposo, caminar y lanzar (con proyectil saliendo)
    frames = []
    bg = (58, 50, 82)
    for f in range(32):
        cv = Image.new("RGBA", (4 * S + 20 + 40, 3 * S + 16), bg + (255,))
        for d in range(4):
            x = 4 + d * (S + 4)
            ic = (f // 4) % 2
            cv.alpha_composite(sheet.crop((ic * S, d * S, ic * S + S, d * S + S)), (x, 4))
            wc = (2 + f % 4) * S
            cv.alpha_composite(sheet.crop((wc, d * S, wc + S, d * S + S)), (x, 8 + S))
        # lanzar hacia la derecha con el proyectil
        k = f % 16
        cc = 6 + min(k // 2, 3)
        cv.alpha_composite(sheet.crop((cc * S, 2 * S, cc * S + S, 3 * S)), (4, 12 + 2 * S))
        if k >= 5:
            px = 26 + (k - 5) * 9
            if px < cv.width - 16:
                cv.alpha_composite(fireball(f % 4), (px, 12 + 2 * S + 2))
        frames.append(cv.resize((cv.width * 5, cv.height * 5), Image.NEAREST).convert("RGB"))
    frames[0].save(os.path.join(PREVIEWS, "maga_animada.gif"), save_all=True, append_images=frames[1:], duration=110, loop=0)


if __name__ == "__main__":
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else SPRITES)
