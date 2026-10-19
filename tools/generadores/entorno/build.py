"""Construye las hojas de tiles, sus JSON y salas de ejemplo de 15x11."""
import json
import random
import sys
from PIL import Image
from base import S

COLS = 8


def build_sheet(name, entries, out):
    frames_total = sum(len(e[3]) for e in entries)
    rows = (frames_total + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * S, rows * S), (0, 0, 0, 0))
    meta = {"tileSize": S, "columns": COLS, "tiles": []}
    i = 0
    lookup = {}
    for tname, layer, solid, frames, weight in entries:
        first = i
        imgs = []
        for f in frames:
            img = Image.fromarray(f, "RGBA")
            sheet.paste(img, ((i % COLS) * S, (i // COLS) * S))
            imgs.append(img)
            i += 1
        item = {"name": tname, "index": first, "layer": layer, "solid": solid}
        if len(frames) > 1:
            item["frames"] = len(frames)
            item["fps"] = 4
        if weight:
            item["weight"] = weight
        meta["tiles"].append(item)
        lookup[tname] = imgs
    sheet.save(f"{out}/{name}.png")
    json.dump(meta, open(f"{out}/{name}.json", "w"), indent=2, ensure_ascii=False)
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(f"{out}/{name}_x3.png")
    return lookup, meta


def hero(path, row=0, col=0):
    sh = Image.open(path).convert("RGBA")
    return sh.crop((col * S, row * S, col * S + S, row * S + S))


def room(zone, lookup, common, floors, props, actors, out_name, doors=None, seed=1, frame=0):
    """props: [(tx, ty, nombre)], actors: [(px, py, imagen)] con el ancla en los pies."""
    W, H = 15, 11
    doors = doors or {"n": "abierta", "s": "abierta", "o": "abierta", "e": "cerrada"}
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 255))
    r = random.Random(seed)
    names, weights = zip(*floors)
    allt = {**common, **lookup}

    def pick(name):
        if name in allt:
            return allt[name]
        variants = sorted(k for k in allt if k.startswith(name + "_") and len(k) == len(name) + 2)
        return allt[r.choice(variants)]

    def tall(name):
        sup, inf = allt[name + "_sup"][0], allt[name + "_inf"][0]
        im = Image.new("RGBA", (S, 2 * S))
        im.paste(sup, (0, 0)); im.paste(inf, (0, S))
        return im
    layer2 = []
    for ty in range(H):
        for tx in range(W):
            fl = pick(r.choices(names, weights)[0])[0]
            img.alpha_composite(fl, (tx * S, ty * S))
            border = tx in (0, W - 1) or ty in (0, H - 1)
            if not border:
                continue
            if ty == 0 and tx == W // 2 and "n" in doors:
                t = pick(f"puerta_norte_{doors['n']}")[0]
            elif ty == 0 and 0 < tx < W - 1:
                t = pick("muro_norte")[0]
            elif (tx, ty) in ((0, H // 2), (W - 1, H // 2), (W // 2, H - 1)):
                side = {(0, H // 2): "o", (W - 1, H // 2): "e", (W // 2, H - 1): "s"}[(tx, ty)]
                if side in doors and doors[side] == "cerrada":
                    layer2.append((tx * S, ty * S + S, pick("barrera_v" if side in "oe" else "barrera_h")[0]))
                if side in doors:
                    continue
                t = pick("muro")[0]
            else:
                t = pick("muro")[0]
            img.alpha_composite(t, (tx * S, ty * S))
    for tx, ty, name in props:
        if name + "_sup" in allt:
            layer2.append((tx * S, ty * S + S, tall(name)))
            continue
        fr = pick(name)
        layer2.append((tx * S, ty * S + S, fr[frame % len(fr)]))
    for px, py, im in actors:
        layer2.append((px - 16, py + 2, im))
    for x, foot, im in sorted(layer2, key=lambda e: e[1]):
        img.alpha_composite(im, (x, foot - im.height))
    img.convert("RGB").resize((W * S * 2, H * S * 2), Image.NEAREST).save(out_name)
    return img
