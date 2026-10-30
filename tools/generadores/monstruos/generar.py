"""Genera las hojas de sprites de los monstruos y los jefes.

Cada monstruo: public/assets/sprites/monstruos/<clave>.png y .json, con filas abajo, izquierda,
derecha y arriba, y animaciones idle (2), walk (4), atacar (3) y golpe (1). Ancla en los pies.
Uso (desde la raíz del repo): python tools/generadores/monstruos/generar.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SALIDA = os.path.join(REPO, "public", "assets", "sprites", "monstruos")
PREVIEWS = os.path.join(REPO, "docs", "previews")

from lienzo import Lienzo  # noqa: E402
import criaturas  # noqa: E402
import humanoides  # noqa: E402
import espectro  # noqa: E402
import jabali  # noqa: E402
import acolito  # noqa: E402
import sacerdote  # noqa: E402
import oni  # noqa: E402
import dragon_fuego  # noqa: E402
import reducir  # noqa: E402
import golem  # noqa: E402
import rey_sin_charca  # noqa: E402
import arbol_maldito  # noqa: E402
import caballero_maldito  # noqa: E402
import ojo_flotante  # noqa: E402
import dragon_negro  # noqa: E402
import cofre_trampa  # noqa: E402

DIRS = ["down", "left", "right", "up"]
VISTA = {"down": "frente", "left": "lado", "right": "lado", "up": "espalda"}
# (nombre, fotogramas, fps, en bucle)
ANIMS = [("idle", 2, 3, True), ("walk", 4, 8, True), ("atacar", 3, 10, False), ("golpe", 1, 1, False)]

BASE = {"contorno": (30, 24, 32), "ojo": (20, 18, 24), "brillo": (246, 250, 236),
        "oro": (226, 182, 72), "oro_s": (160, 112, 44), "gema": (208, 62, 82)}


def paleta(**colores):
    p = dict(BASE)
    p.update(colores)
    return p


HUESO = dict(hueso=(216, 210, 191), hueso_s=(160, 152, 134), hueso_l=(240, 236, 222), cuenca=(36, 28, 38))
METAL = dict(metal=(170, 178, 190), metal_l=(226, 232, 240))
VERDE = dict(cuerpo=(127, 196, 106), cuerpo_s=(78, 146, 72), cuerpo_l=(186, 232, 150), boca=(40, 70, 40))
MONSTRUOS = {
    # Bosque: verdes y tierras
    "limo": (32, paleta(**VERDE), criaturas.limo, {}),
    "limo_grande": (32, paleta(cuerpo=(104, 186, 120), cuerpo_s=(62, 132, 84), cuerpo_l=(168, 226, 168),
                               boca=(34, 66, 44)), criaturas.limo, {}),
    "rey_limo": (48, paleta(cuerpo=(86, 168, 80), cuerpo_s=(52, 116, 56), cuerpo_l=(150, 214, 124),
                            boca=(30, 60, 30)), criaturas.limo, {"corona": True}),
    "murcielago": (32, paleta(cuerpo=(112, 86, 132), cuerpo_s=(74, 54, 92), cuerpo_l=(150, 124, 168),
                              ala=(90, 66, 110), ala_s=(58, 40, 74), ojo=(226, 60, 70), diente=(240, 236, 220)),
                   criaturas.murcielago, {}),
    "cuervo": (32, paleta(cuerpo=(48, 44, 58), cuerpo_s=(33, 31, 45), cuerpo_l=(92, 83, 108), pico=(116, 98, 92),
                          adorno=(122, 82, 48), ojo=(255, 214, 120), brillo=(255, 248, 214)), criaturas.cuervo, {}),
    "salamandra": (32, paleta(cuerpo=(66, 44, 42), cuerpo_s=(34, 24, 28), cuerpo_l=(108, 72, 60), brasa=(255, 106, 28),
                              brasa_l=(255, 206, 90), diente=(240, 226, 200), boca=(120, 24, 20)),
                   criaturas.salamandra, {}),
    "lobo": (32, paleta(pelo=(40, 50, 84), pelo_s=(18, 25, 44), pelo_l=(78, 92, 136), rojo=(204, 40, 48),
                        colmillo=(240, 236, 228), ojo=(255, 84, 84), ojo_nariz=(12, 14, 24)), humanoides.lobo, {}),
    # Ruinas y Cripta: la araña común; la reina, en morados fríos
    "arana": (32, paleta(cuerpo=(122, 59, 59), cuerpo_s=(78, 34, 40), cuerpo_l=(164, 92, 84), cabeza=(98, 46, 48),
                         pata=(58, 30, 34), ojo=(236, 196, 80), marca=(214, 120, 60)), criaturas.arana, {}),
    "reina_arana": (48, paleta(cuerpo=(86, 52, 110), cuerpo_s=(52, 30, 72), cuerpo_l=(128, 88, 152),
                               cabeza=(70, 40, 92), pata=(40, 24, 54), ojo=(240, 80, 110), marca=(206, 196, 220)),
                    criaturas.arana, {"corona": True}),
    # Humanoides de las Ruinas y la Cripta
    "esqueleto": (32, paleta(**HUESO, **METAL, ojo=(232, 70, 70), cuero=(110, 72, 48)), humanoides.esqueleto, {}),
    "caballero": (32, paleta(**METAL, armadura=(59, 69, 96), armadura_s=(36, 42, 62), armadura_l=(100, 114, 150),
                             visor=(16, 14, 20), ojo=(236, 84, 84), capa=(116, 38, 50), pluma=(176, 50, 62),
                             cuero=(96, 64, 44)), humanoides.caballero, {}),
    "senor_cripta": (48, paleta(**HUESO, **METAL, tunica=(48, 34, 66), tunica_s=(28, 20, 40), tunica_l=(82, 62, 108),
                                ojo=(170, 255, 130), madera=(70, 52, 40)), humanoides.senor_cripta, {}),
}


# Monstruos dibujados con su propio módulo (más detalle que el Lienzo): (ancho, alto, módulo).
# Cada módulo da `fotograma(direccion, anim, i)` como array RGBA con los pies en (ancho/2, alto-2).
PROPIOS = {
    "jabali": (32, 32, jabali),
    "acolito": (32, 32, acolito),
    "sacerdote": (48, 48, sacerdote),
    "oni": (48, 48, oni),
    "dragon_fuego": (64, 48, dragon_fuego),
    "espectro": (32, 32, espectro),
    "golem": (48, 48, golem),
    "rey_sin_charca": (64, 48, rey_sin_charca),
    # Jefes violetas y el cofre trampa (que en reposo es el cofre cerrado de comunes)
    "arbol_maldito": (48, 48, arbol_maldito),
    "caballero_maldito": (48, 48, caballero_maldito),
    "ojo_flotante": (48, 48, ojo_flotante),
    "dragon_negro": (64, 48, dragon_negro),
    "cofre_trampa": (32, 32, cofre_trampa),
}


# Monstruos cuyos fotogramas no deben tocar el borde del cuadro (el generador avisa si pasa).
VIGILADOS = {"jabali", "acolito", "salamandra", "sacerdote", "oni", "dragon_fuego"}


def destello(img, contorno):
    """El fotograma de golpe, casi blanco salvo el contorno (como `Lienzo.imagen(golpe=True)`)."""
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 255 and (r, g, b) != contorno:
                px[x, y] = tuple(min(255, int(v * 0.35 + 255 * 0.65)) for v in (r, g, b)) + (255,)
    return img


def hoja_propia(clave, ancho, alto, modulo):
    columnas = sum(n for _, n, _, _ in ANIMS)
    sheet = Image.new("RGBA", (columnas * ancho, len(DIRS) * alto), (0, 0, 0, 0))
    meta = {"frameWidth": ancho, "frameHeight": alto, "anchor": {"x": ancho // 2, "y": alto - 2},
            "directions": {}, "animations": {}}
    for fila, d in enumerate(DIRS):
        meta["directions"][d] = fila
        col = 0
        for nombre, n, fps, bucle in ANIMS:
            meta["animations"][nombre] = {"startColumn": col, "frames": n, "fps": fps, "loop": bucle}
            for i in range(n):
                arr = modulo.fotograma(d, nombre, i)
                if clave in VIGILADOS and not reducir.sin_tocar_bordes(arr):
                    print(f"AVISO: {clave} {d} {nombre} {i} toca el borde del cuadro")
                img = Image.fromarray(arr, "RGBA")
                if nombre == "golpe":
                    img = destello(img, modulo.OUT)
                sheet.paste(img, (col * ancho, fila * alto))
                col += 1
    sheet.save(os.path.join(SALIDA, f"{clave}.png"))
    with open(os.path.join(SALIDA, f"{clave}.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    return sheet


def fotograma(tam, pal, dibujar, extra, direccion, anim, i, clave=None):
    c = Lienzo(tam, pal)
    dibujar(c, VISTA[direccion], anim, i, **extra)
    c.contorno()
    img = c.imagen(golpe=anim == "golpe")
    img = img.transpose(Image.FLIP_LEFT_RIGHT) if direccion == "left" else img
    if clave in VIGILADOS and not reducir.sin_tocar_bordes(np.array(img)):
        print(f"AVISO: {clave} {direccion} {anim} {i} toca el borde del cuadro")
    return img


def hoja(clave, tam, pal, dibujar, extra):
    columnas = sum(n for _, n, _, _ in ANIMS)
    sheet = Image.new("RGBA", (columnas * tam, len(DIRS) * tam), (0, 0, 0, 0))
    meta = {"frameWidth": tam, "frameHeight": tam, "anchor": {"x": tam // 2, "y": tam - 2},
            "directions": {}, "animations": {}}
    for fila, d in enumerate(DIRS):
        meta["directions"][d] = fila
        col = 0
        for nombre, n, fps, bucle in ANIMS:
            meta["animations"][nombre] = {"startColumn": col, "frames": n, "fps": fps, "loop": bucle}
            for i in range(n):
                sheet.paste(fotograma(tam, pal, dibujar, extra, d, nombre, i, clave), (col * tam, fila * tam))
                col += 1
    sheet.save(os.path.join(SALIDA, f"{clave}.png"))
    with open(os.path.join(SALIDA, f"{clave}.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    return sheet


def main():
    os.makedirs(SALIDA, exist_ok=True)
    hojas = {clave: hoja(clave, *datos) for clave, datos in MONSTRUOS.items()}
    hojas.update({clave: hoja_propia(clave, *datos) for clave, datos in PROPIOS.items()})
    # Vista previa: cada hoja ×3, una debajo de otra, sobre fondo de hierba oscura.
    ancho = max(h.width for h in hojas.values()) * 3
    alto = sum(h.height * 3 + 8 for h in hojas.values())
    prev = Image.new("RGB", (ancho, alto), (44, 70, 46))
    y = 0
    for h in hojas.values():
        prev.paste(h.resize((h.width * 3, h.height * 3), Image.NEAREST), (0, y), h.resize((h.width * 3, h.height * 3), Image.NEAREST))
        y += h.height * 3 + 8
    prev.save(os.path.join(PREVIEWS, "monstruos_x3.png"))
    print("ok:", ", ".join(hojas))


if __name__ == "__main__":
    main()
