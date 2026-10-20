"""Efectos de combate de 32x32 sobre quien recibe el golpe: corte, impacto y llamarada morada.

Una sola fila (vale para cualquier dirección) y una animación por efecto, en el mismo formato que
las hojas de personajes. Uso (desde la raíz del repo): python tools/generadores/monstruos/efectos.py
"""
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SALIDA = os.path.join(REPO, "public", "assets", "sprites")
PREVIEWS = os.path.join(REPO, "docs", "previews")

from lienzo import Lienzo  # noqa: E402

T = 32
PALETA = {"contorno": (30, 24, 32), "blanco": (250, 250, 244), "acero": (176, 200, 228),
          "chispa": (255, 214, 110), "naranja": (236, 128, 56),
          # los mismos morados que el fuego de la maga
          "f_core": (246, 228, 255), "f_mid": (190, 110, 246), "f_out": (120, 54, 196)}


def corte(c, i):
    """Tajo diagonal que cruza y se deshace."""
    largo = [0.45, 1.0, 1.0, 0.8][i]
    grosor = [1.5, 2.5, 1.5, 0.8][i]
    for n in range(40):
        t = n / 39
        if t > largo or (i == 3 and t < 0.5):
            continue
        a = math.radians(-150 + t * 120)  # arco de arriba a la izquierda hacia abajo a la derecha
        x, y = 16 + math.cos(a) * 13, 22 + math.sin(a) * 13
        w = grosor * math.sin(t * math.pi)
        c.ellipse(x, y, max(0.6, w), max(0.6, w), "blanco" if i < 2 else "acero")


def impacto(c, i):
    """Estrella de golpe que se abre y deja chispas."""
    r = [5, 9, 11][i]
    for n in range(8):
        a = math.radians(n * 45 + 22.5 * (i % 2))
        largo = r if n % 2 == 0 else r * 0.6
        if i < 2:
            c.line(16, 16, 16 + math.cos(a) * largo, 16 + math.sin(a) * largo, "chispa")
        else:
            c.put(16 + math.cos(a) * largo, 16 + math.sin(a) * largo, "chispa")
    if i < 2:
        c.ellipse(16, 16, 3 + i, 3 + i, "blanco")
        c.ellipse(16, 16, 1.5, 1.5, "naranja")


def llamarada(c, i):
    """Bola de fuego morado que estalla en llamas que suben."""
    r = [4, 8, 9, 6][i]
    c.ellipse(16, 18, r, r * 0.9, "f_out")
    c.ellipse(16, 18 - i * 0.5, r * 0.7, r * 0.65, "f_mid")
    if i < 3:
        c.ellipse(16, 18 - i, r * 0.35, r * 0.35, "f_core")
    for n in range(5):
        x = 16 + (n - 2) * 3.5
        alto = (r + 3 + (n % 2) * 3) if i > 0 else 0
        c.line(x, 18 - r * 0.6, x + ((n + i) % 3 - 1), 18 - alto, "f_mid" if n % 2 else "f_out")


EFECTOS = [("corte", corte, 4, 16), ("impacto", impacto, 3, 14), ("llamarada", llamarada, 4, 12)]


def main():
    columnas = sum(n for _, _, n, _ in EFECTOS)
    sheet = Image.new("RGBA", (columnas * T, T), (0, 0, 0, 0))
    meta = {"frameWidth": T, "frameHeight": T, "anchor": {"x": T // 2, "y": T // 2},
            "directions": {d: 0 for d in ("down", "left", "right", "up")}, "animations": {}}
    col = 0
    for nombre, dibujar, n, fps in EFECTOS:
        meta["animations"][nombre] = {"startColumn": col, "frames": n, "fps": fps, "loop": False}
        for i in range(n):
            c = Lienzo(T, PALETA)
            dibujar(c, i)
            c.contorno()
            sheet.paste(c.imagen(), (col * T, 0))
            col += 1
    sheet.save(os.path.join(SALIDA, "efectos.png"))
    with open(os.path.join(SALIDA, "efectos.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    prev = Image.new("RGB", (sheet.width * 4, T * 4), (44, 50, 60))
    grande = sheet.resize((sheet.width * 4, T * 4), Image.NEAREST)
    prev.paste(grande, (0, 0), grande)
    prev.save(os.path.join(PREVIEWS, "efectos_x4.png"))
    print("ok: efectos")


if __name__ == "__main__":
    main()
