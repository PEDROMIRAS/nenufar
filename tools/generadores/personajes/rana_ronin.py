"""Héroe rana ronin (32x32, 4 direcciones). Filas: abajo, izquierda, derecha, arriba.
Columnas: reposo 0-1, caminar 0-3, atacar 0-2, golpe 0 y derrota 0-1."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SPRITES = os.path.join(REPO, "public", "assets", "sprites")
PREVIEWS = os.path.join(REPO, "docs", "previews")

import json
from PIL import Image
from rana import Canvas, PAL, S, eye
from combate_anim import derrota, golpe, guardar_capas

PAL.update({
    "hat": (204, 158, 92), "hat_s": (156, 108, 60), "hat_d": (98, 62, 38), "hat_l": (234, 198, 128),
    "robe": (74, 94, 132), "robe_s": (46, 58, 90), "robe_l": (112, 134, 172),
    "gold": (224, 178, 70), "gold_s": (164, 116, 44),
    "scarf": (190, 46, 56), "scarf_s": (126, 28, 44), "scarf_l": (232, 92, 82),
    "lacquer": (30, 24, 34), "wrap": (232, 226, 206),
    "blade": (214, 224, 236), "blade_s": (140, 152, 170),
    # piezas especiales: laca roja de la armadura samurái y luz de la katana sagrada
    "lac": (156, 34, 42), "lac_s": (98, 20, 30), "lac_l": (204, 74, 66), "aura": (190, 140, 255),
})

# Piezas especiales que lleva puestas al dibujar. Las capas de public/assets/sprites/piezas/ salen de
# comparar la hoja con cada pieza y sin ella (ver `build`).
EQUIPO = set()
PIEZAS = ["armadura_samurai", "katana_sagrada"]


def foot(c, x, y, shade=False):
    col = "skin_s" if shade else "skin"
    c.rect(x, y, x + 5, y + 1, col)
    c.rect(x + 1, y - 1, x + 4, y - 1, col)
    c.put(x + 2, y + 1, "skin_s")
    c.put(x + 4, y + 1, "skin_s")


def hat(c, cx, top, hw_max, bob):
    """Sombrero cónico de paja: ápice arriba, ala ancha abajo."""
    if "armadura_samurai" in EQUIPO:
        kabuto(c, cx, top, hw_max, bob)
        return
    rows = 7
    for i in range(rows + 1):
        y = top + i + bob
        hw = 1 + (hw_max - 1) * (i / rows) ** 0.8
        for x in range(int(round(cx - hw)), int(round(cx + hw)) + 1):
            rel = (x - cx) / max(hw, 1)
            col = "hat"
            if rel > 0.35:
                col = "hat_s"
            elif rel < -0.45 and i < rows:
                col = "hat_l"
            if i < rows and i > 1 and (x - int(cx)) % 4 == 0:
                col = "hat_s" if col != "hat_s" else "hat_d"
            if i == rows:
                col = "hat_d"
            c.put(x, y, col)
    c.put(cx, top + bob - 1, "hat_d")


def kabuto(c, cx, top, hw_max, bob):
    """Yelmo samurái: casco lacado con placa dorada, cubrenuca de láminas y cuernos dorados en V.
    Ocupa al menos lo que el sombrero (una capa no puede borrar píxeles de la hoja)."""
    rows = 7
    for i in range(rows + 1):
        y = top + i + bob
        hw = 1 + (hw_max - 1) * (i / rows) ** 0.8
        for x in range(int(round(cx - hw)), int(round(cx + hw)) + 1):
            rel = (x - cx) / max(hw, 1)
            if i < 4:
                col = "lac_s" if rel > 0.35 else ("lac_l" if rel < -0.4 else "lac")
            else:
                col = "lac" if (i % 2) else "lac_s"
                if i % 2 and (x - int(cx)) % 3 == 0:
                    col = "gold"
            c.put(x, y, col)
    c.rect(cx - 1, top + bob + 2, cx + 1, top + bob + 3, "gold")  # placa del frente
    c.put(cx, top + bob - 1, "gold")
    for lado in (-1, 1):  # cuernos (kuwagata)
        c.line(cx + lado, top + bob + 2, cx + 4 * lado, top + bob - 3, "gold")
        c.put(cx + 5 * lado, top + bob - 4, "gold_s")


def robe(c, cx, top, bottom, hw0, hw1, sway=0, front=True):
    for y in range(top, bottom + 1):
        t = (y - top) / max(bottom - top, 1)
        hw = hw0 + (hw1 - hw0) * t
        off = sway if y > bottom - 3 else 0
        for x in range(int(cx - hw) + off, int(cx + hw) + 1 + off):
            rel = (x - off - (cx - hw)) / (2 * hw)
            col = "robe"
            if rel > 0.66 or y == bottom:
                col = "robe_s"
            elif rel < 0.2:
                col = "robe_l"
            c.put(x, y, col)
    if "armadura_samurai" in EQUIPO:
        # peto de láminas lacadas con cordones dorados
        for y in range(top, top + 6):
            hw = hw0 + (hw1 - hw0) * (y - top) / max(bottom - top, 1)
            for x in range(int(cx - hw), int(cx + hw) + 1):
                col = "lac" if (y - top) % 2 == 0 else "lac_s"
                c.put(x, y, "gold" if (y - top) % 2 and x % 3 == 0 else col)
        return
    if front:
        # cruce del kimono con ribete dorado
        c.line(cx - 3, top, cx + 1, top + 5, "gold")
        c.line(cx + 3, top, cx + 1, top + 4, "gold_s")
        c.line(cx + 1, top + 5, cx + 1, bottom, "robe_s")


def sash(c, x0, x1, y):
    c.rect(x0, y, x1, y + 1, "gold")
    c.rect(x0, y + 1, x1, y + 1, "gold_s")


def katana_hilt(c, x0, y0, x1, y1, w=2):
    """Empuñadura desde la guarda (x0,y0) hasta el pomo (x1,y1)."""
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        for o in range(w):
            c.put(x + o, y, "wrap" if i % 2 else "lacquer")
    c.rect(x0 - 1, y0, x0 + 2, y0, "gold")
    c.rect(x1, y1, x1 + w - 1, y1, "gold")
    if "katana_sagrada" in EQUIPO:  # guarda redonda grande y un colgante de luz en el pomo
        c.rect(x0 - 2, y0 - 1, x0 + 3, y0 + 1, "gold")
        c.put(x1 + w, y1 + 1, "aura")
        c.put(x1 + w, y1 + 2, "aura")


def sleeve(c, x0, x1, y, light):
    """Manga ancha de kimono: de la túnica hasta la mano. Con la armadura, hombrera de láminas."""
    c.rect(x0, y, x1, y + 4, "robe_l" if light else "robe_s")
    c.rect(x0, y + 4, x1, y + 4, "robe_s")
    if "armadura_samurai" in EQUIPO:
        c.rect(x0 - 1, y - 1, x1 + 1, y + 2, "lac")
        c.rect(x0 - 1, y + 1, x1 + 1, y + 1, "gold")
        c.rect(x0 - 1, y - 1, x1 + 1, y - 1, "lac_l")


def draw_front(c, bob, lift_l, lift_r, swing, tail):
    # katana: asoma por el hombro izquierdo del personaje (derecha de la imagen)
    katana_hilt(c, 23, 16 + bob, 28, 2 + bob)
    foot(c, 8, 29 - lift_l)
    foot(c, 18, 29 - lift_r)
    robe(c, 16, 16 + bob, 27, 7.5, 10, sway=-swing)
    sleeve(c, 4, 8, 17 + bob - swing, True)
    sleeve(c, 24, 28, 17 + bob + swing, False)
    c.rect(5, 22 + bob - swing, 7, 23 + bob - swing, "skin")
    c.rect(25, 22 + bob + swing, 27, 23 + bob + swing, "skin_s")
    sash(c, 8, 24, 22 + bob)
    c.rect(14, 22 + bob, 16, 24 + bob, "gold")
    # cara
    c.ellipse(16, 13.5 + bob, 7.5, 4.8, "skin", shadow="skin_s", light="skin_l")
    c.rect(11, 15 + bob, 21, 16 + bob, "belly")
    c.line(12, 15 + bob, 20, 15 + bob, "skin_s")
    eye(c, 12.5, 12.5 + bob, 0)
    eye(c, 19.5, 12.5 + bob, 1)
    # bufanda: de frente la cola cae dentro del contorno
    c.rect(9, 17 + bob, 23, 19 + bob, "scarf")
    c.rect(9, 19 + bob, 23, 19 + bob, "scarf_s")
    c.rect(10, 17 + bob, 14, 17 + bob, "scarf_l")
    c.line(10, 19 + bob, 9 + tail, 24 + bob, "scarf", w=2)
    c.put(10 + tail, 25 + bob, "scarf_s")
    hat(c, 16, 3, 12, bob)


def draw_back(c, bob, lift_l, lift_r, swing, tail):
    foot(c, 8, 29 - lift_l, shade=True)
    foot(c, 18, 29 - lift_r, shade=True)
    robe(c, 16, 16 + bob, 27, 7.5, 10, front=False, sway=swing)
    c.line(16, 24 + bob, 16, 27, "robe_s")
    sleeve(c, 4, 8, 17 + bob + swing, True)
    sleeve(c, 24, 28, 17 + bob - swing, False)
    c.rect(5, 22 + bob + swing, 7, 23 + bob + swing, "skin_s")
    c.rect(25, 22 + bob - swing, 27, 23 + bob - swing, "skin_s")
    sash(c, 8, 24, 22 + bob)
    c.ellipse(16, 13.5 + bob, 6.5, 4, "skin_s")
    # katana: de espaldas, mismo hombro (izquierda de la imagen)
    c.line(21, 27, 11, 14 + bob, "lacquer", w=2)
    c.line(21, 26, 12, 15 + bob, "scarf_s")
    c.rect(16, 20 + bob, 17, 21 + bob, "gold")
    c.rect(20, 26, 21, 27, "gold")
    katana_hilt(c, 10, 14 + bob, 4, 2 + bob)
    # bufanda: nudo y colas que salen del contorno, solo visibles de espaldas
    c.rect(8, 15 + bob, 24, 18 + bob, "scarf")
    c.rect(8, 18 + bob, 24, 18 + bob, "scarf_s")
    c.rect(21, 16 + bob, 23, 18 + bob, "scarf_l")
    c.line(23, 17 + bob, 29, 21 + bob + tail, "scarf", w=2)
    c.line(23, 18 + bob, 28, 24 + bob + tail, "scarf_s", w=2)
    hat(c, 16, 3, 12, bob)


def draw_side(c, bob, front_x, back_x, lift_f, lift_b, swing, tail):
    # mirando a la derecha
    katana_hilt(c, 10, 15 + bob, 3, 2 + bob)
    foot(c, back_x, 29 - lift_b, shade=True)
    robe(c, 14, 16 + bob, 27, 6, 8, front=False, sway=-1 if swing else 0)
    foot(c, front_x, 29 - lift_f)
    sash(c, 7, 21, 22 + bob)
    sleeve(c, 16 + swing, 20 + swing, 17 + bob, False)
    c.rect(18 + swing, 22 + bob, 20 + swing, 23 + bob, "skin")
    # cabeza: el morro sobresale del ala para leer la orientación
    c.ellipse(15, 13.5 + bob, 6, 4.5, "skin_s")
    c.ellipse(21, 13.5 + bob, 6, 4.5, "skin", shadow="skin_s")
    c.rect(20, 15 + bob, 27, 16 + bob, "belly")
    c.line(21, 15 + bob, 27, 15 + bob, "skin_s")
    eye(c, 22, 12.5 + bob, 1)
    # bufanda: la cola vuela hacia atrás, fuera del contorno
    c.rect(10, 17 + bob, 22, 19 + bob, "scarf")
    c.rect(10, 19 + bob, 22, 19 + bob, "scarf_s")
    c.line(10, 18 + bob, 2, 19 + bob + tail, "scarf", w=1)
    c.line(10, 19 + bob, 3, 21 + bob + tail, "scarf_s", w=1)
    hat(c, 15, 3, 10, bob)


BOB_IDLE = [0, 1]
BOB_WALK = [0, -1, 0, -1]
TAIL_IDLE = [0, 1]
TAIL_WALK = [0, -1, 0, 1]


# Katana desenvainada al atacar, por vista: (mano, punta) en preparar, cortar y acabar el tajo.
TAJO = {
    "down": [((24, 13), (15, 1)), ((9, 20), (1, 29)), ((8, 22), (3, 30))],
    "up": [((24, 14), (19, 0)), ((10, 13), (1, 4)), ((8, 16), (0, 12))],
    "side": [((17, 14), (8, 2)), ((24, 18), (31, 26)), ((23, 20), (28, 29))],
}


def katana(c, mano, punta):
    (hx, hy), (tx, ty) = mano, punta
    if "katana_sagrada" in EQUIPO:  # la hoja sagrada va envuelta en luz
        c.line(hx + 1, hy - 1, tx + 1, ty - 1, "aura", w=2)
    c.line(hx, hy, tx, ty, "blade", w=2)
    c.line(hx, hy, tx, ty, "blade_s")
    c.rect(hx - 1, hy - 1, hx + 1, hy + 1, "gold")
    if "katana_sagrada" in EQUIPO:
        c.rect(hx - 2, hy - 2, hx + 2, hy + 2, "gold")
    c.rect(hx, hy, hx, hy, "wrap")


def frame(direction, anim, i):
    if anim == "golpe":
        return golpe(frame(direction, "idle", 0))
    if anim == "derrota":
        # Mismo recorte con y sin piezas (el de todas puestas): así las capas encajan y nada se corta.
        puestas = set(EQUIPO)
        EQUIPO.clear()
        EQUIPO.update(PIEZAS)
        caja = frame(direction, "idle", 0).getbbox()
        EQUIPO.clear()
        EQUIPO.update(puestas)
        return derrota(frame(direction, "idle", 0), caja=caja)[i]
    c = Canvas()
    if anim in ("idle", "atacar"):
        bob, tail = (BOB_IDLE[i], TAIL_IDLE[i]) if anim == "idle" else (0, [0, 1, 1][i])
        lift_l = lift_r = swing = 0
    else:
        bob, tail = BOB_WALK[i], TAIL_WALK[i]
        lift_l, lift_r = [(2, 0), (0, 0), (0, 2), (0, 0)][i]
        swing = [1, 0, -1, 0][i]
    if direction == "down":
        draw_front(c, bob, lift_l, lift_r, swing, tail)
    elif direction == "up":
        draw_back(c, bob, lift_l, lift_r, swing, tail)
    else:
        if anim != "walk":
            fx, bx, lf, lb = 17, 9, 0, 0
        else:
            fx, bx, lf, lb = [(19, 8, 0, 0), (15, 12, 0, 1), (9, 18, 0, 0), (13, 14, 1, 0)][i]
        draw_side(c, bob, fx, bx, lf, lb, swing, tail)
    if anim == "atacar":
        katana(c, *TAJO[direction if direction in ("down", "up") else "side"][i])
    c.outline()
    img = c.image()
    if direction == "left":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img


DIRS = ["down", "left", "right", "up"]
# (nombre, fotogramas, fps, en bucle)
ANIMS = [("idle", 2, 3, True), ("walk", 4, 8, True), ("atacar", 3, 12, False), ("golpe", 1, 1, False),
         ("derrota", 2, 4, False)]


def hoja():
    sheet = Image.new("RGBA", (sum(a[1] for a in ANIMS) * S, 4 * S), (0, 0, 0, 0))
    meta = {"frameWidth": S, "frameHeight": S, "anchor": {"x": 16, "y": 30},
            "directions": {d: r for r, d in enumerate(DIRS)}, "animations": {}}
    for r, d in enumerate(DIRS):
        col = 0
        for name, n, fps, loop in ANIMS:
            meta["animations"][name] = {"startColumn": col, "frames": n, "fps": fps, "loop": loop}
            for i in range(n):
                sheet.paste(frame(d, name, i), (col * S, r * S))
                col += 1
    return sheet, meta


def build(out):
    sheet, meta = hoja()
    sheet.save(f"{out}/rana_ronin.png")
    guardar_capas(out, sheet, hoja, PIEZAS, EQUIPO, "ronin")
    json.dump(meta, open(f"{out}/rana_ronin.json", "w"), indent=2)
    sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(PREVIEWS, "ronin_x8.png"))
    frames = []
    for f in range(24):
        cv = Image.new("RGBA", (4 * S + 20, 2 * S + 12), (92, 140, 70, 255))
        for d in range(4):
            x = 4 + d * (S + 4)
            cv.alpha_composite(sheet.crop(((f // 4) % 2 * S, d * S, (f // 4) % 2 * S + S, d * S + S)), (x, 4))
            wc = (2 + f % 4) * S
            cv.alpha_composite(sheet.crop((wc, d * S, wc + S, d * S + S)), (x, 8 + S))
        frames.append(cv.resize((cv.width * 6, cv.height * 6), Image.NEAREST).convert("RGB"))
    frames[0].save(os.path.join(PREVIEWS, "ronin_animada.gif"), save_all=True, append_images=frames[1:], duration=125, loop=0)


if __name__ == "__main__":
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else SPRITES)
