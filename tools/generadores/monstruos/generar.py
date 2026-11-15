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
import espectro  # noqa: E402
import jabali  # noqa: E402
import acolito  # noqa: E402
import sacerdote  # noqa: E402
import oni  # noqa: E402
import dragon_fuego  # noqa: E402
import guardian_bosque  # noqa: E402
import reina_arana  # noqa: E402
import senor_cripta  # noqa: E402
import reducir  # noqa: E402
import golem  # noqa: E402
import rey_sin_charca  # noqa: E402
import arbol_maldito  # noqa: E402
import caballero_maldito  # noqa: E402
import ojo_flotante  # noqa: E402
import dragon_negro  # noqa: E402
import cofre_trampa  # noqa: E402
import ermitano  # noqa: E402
import lobo  # noqa: E402
import cuervo  # noqa: E402
import limo  # noqa: E402
import limo_grande  # noqa: E402
import arana  # noqa: E402
import esqueleto  # noqa: E402
import caballero  # noqa: E402
import salamandra  # noqa: E402

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


MONSTRUOS = {
    "murcielago": (32, paleta(cuerpo=(112, 86, 132), cuerpo_s=(74, 54, 92), cuerpo_l=(150, 124, 168),
                              ala=(90, 66, 110), ala_s=(58, 40, 74), ojo=(226, 60, 70), diente=(240, 236, 220)),
                   criaturas.murcielago, {}),
}


# Monstruos dibujados con su propio módulo (más detalle que el Lienzo): (ancho, alto, módulo).
# Cada módulo da `fotograma(direccion, anim, i)` como array RGBA con los pies en (ancho/2, alto-2).
PROPIOS = {
    "jabali": (80, 80, jabali),
    "acolito": (80, 80, acolito),
    "sacerdote": (48, 48, sacerdote),
    "oni": (96, 96, oni),
    "dragon_fuego": (64, 48, dragon_fuego),
    "rey_limo": (128, 96, guardian_bosque),
    "reina_arana": (128, 96, reina_arana),
    "senor_cripta": (96, 96, senor_cripta),
    "espectro": (64, 64, espectro),
    "limo": (64, 64, limo),
    "limo_grande": (64, 64, limo_grande),
    "arana": (64, 64, arana),
    "esqueleto": (64, 64, esqueleto),
    "caballero": (64, 64, caballero),
    "salamandra": (80, 80, salamandra),
    "golem": (96, 96, golem),
    "lobo": (64, 64, lobo),
    "cuervo": (64, 64, cuervo),
    "rey_sin_charca": (128, 96, rey_sin_charca),
    # Jefes violetas y el cofre trampa (que en reposo es el cofre cerrado de comunes)
    "arbol_maldito": (96, 96, arbol_maldito),
    "caballero_maldito": (96, 96, caballero_maldito),
    "ojo_flotante": (96, 96, ojo_flotante),
    "dragon_negro": (128, 96, dragon_negro),
    "cofre_trampa": (32, 32, cofre_trampa),
    # Personaje de la sala de evento del ermitaño (no es un monstruo: no está en monstruos.json)
    "ermitano": (32, 32, ermitano),
}


# Monstruos cuyos fotogramas no deben tocar el borde del cuadro (el generador avisa si pasa).
VIGILADOS = {"lobo", "cuervo", "rey_sin_charca", "senor_cripta", "golem", "jabali", "acolito", "salamandra", "sacerdote",
             "oni", "dragon_fuego", "rey_limo", "reina_arana", "limo", "limo_grande", "arana", "esqueleto", "caballero",
             "espectro", "arbol_maldito", "caballero_maldito", "ojo_flotante", "dragon_negro"}


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
    """La hoja de un módulo propio. El módulo puede declarar `ESCALA_HOJA` (píxeles de la hoja por píxel del juego: 2 en
    las hojas a doble resolución), `ANIMS` (sus fotogramas y fps, como la lista global) y `EXENTOS` (colores que
    pueden ir sueltos, como el polvo de un golpe)."""
    anims = getattr(modulo, "ANIMS", ANIMS)
    escala = getattr(modulo, "ESCALA_HOJA", 1)
    columnas = sum(n for _, n, _, _ in anims)
    sheet = Image.new("RGBA", (columnas * ancho, len(DIRS) * alto), (0, 0, 0, 0))
    meta = {"frameWidth": ancho, "frameHeight": alto, "anchor": {"x": ancho // 2, "y": alto - 2 * escala},
            "directions": {}, "animations": {}}
    if escala > 1:
        meta["scale"] = escala
    for fila, d in enumerate(DIRS):
        meta["directions"][d] = fila
        col = 0
        for nombre, n, fps, bucle in anims:
            meta["animations"][nombre] = {"startColumn": col, "frames": n, "fps": fps, "loop": bucle}
            for i in range(n):
                arr = modulo.fotograma(d, nombre, i)
                if clave in VIGILADOS and not reducir.sin_tocar_bordes(arr):
                    print(f"AVISO: {clave} {d} {nombre} {i} toca el borde del cuadro")
                motas = reducir.sueltos(arr, getattr(modulo, "EXENTOS", ())) if escala > 1 else 0
                if motas:
                    print(f"AVISO: {clave} {d} {nombre} {i} tiene {motas} grupos sueltos")
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
