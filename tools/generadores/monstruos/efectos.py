"""Efectos de combate de 32x32: los golpes (corte, impacto, llamarada morada) y uno por habilidad.

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
          "f_core": (246, 228, 255), "f_mid": (190, 110, 246), "f_out": (120, 54, 196),
          "acero_osc": (110, 128, 156), "viento": (214, 236, 244), "viento_osc": (140, 184, 204),
          "verde": (96, 200, 112), "verde_claro": (200, 255, 190),
          "fatuo": (150, 236, 190), "fatuo_osc": (70, 150, 120)}


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


# Habilidades de la ronin

def corte_doble(c, i):
    """Corte rápido: dos tajos que se cruzan en X, uno tras otro."""
    for k, (x0, y0, x1, y1) in enumerate(((5, 6, 27, 26), (27, 6, 5, 26))):
        paso = i - k * 2  # el segundo empieza dos fotogramas después
        if paso < 0 or paso > 3:
            continue
        hasta = [0.5, 1.0, 1.0, 1.0][paso]
        desde = [0.0, 0.0, 0.4, 0.75][paso]
        color = "blanco" if paso < 2 else "acero"
        c.line(x0 + (x1 - x0) * desde, y0 + (y1 - y0) * desde,
               x0 + (x1 - x0) * hasta, y0 + (y1 - y0) * hasta, color, w=2 if paso < 2 else 1)


def aura_acero(c, i):
    """Postura de hierro: un anillo de acero que se cierra sobre la ronin y brilla."""
    r = [14, 12, 11, 11, 11][i]
    for n in range(12):
        a = math.radians(n * 30 + i * 8)
        x, y = 16 + math.cos(a) * r, 16 + math.sin(a) * r * 1.1
        c.ellipse(x, y, 1.6, 1.6, "acero" if (n + i) % 3 else "blanco")
    if i >= 2:
        for n in range(3):
            a = math.radians(n * 120 + i * 40)
            c.put(16 + math.cos(a) * (r - 4), 16 + math.sin(a) * (r - 4), "blanco")


def viento(c, i):
    """Tajo del viento: una media luna de aire que barre de izquierda a derecha."""
    cx = [-4, 6, 16, 26, 34][i]
    for n in range(14):
        t = n / 13
        a = math.radians(-70 + t * 140)
        x, y = cx + math.cos(a) * 9, 16 + math.sin(a) * 13
        c.ellipse(x, y, 1.2 + math.sin(t * math.pi) * 1.3, 1.0, "viento")
    for k in range(3):
        y = 9 + k * 7
        c.line(cx - 14 - k * 2, y, cx - 6, y, "viento_osc")


def iaido(c, i):
    """Iaido: un destello y un corte horizontal largo que se queda un instante."""
    if i == 0:
        c.ellipse(16, 16, 9, 9, "blanco")
        return
    largo = [0, 1.0, 1.0, 0.7, 0.35][i]
    grosor = [0, 3, 2, 1, 1][i]
    x0, x1 = 16 - 15 * largo, 16 + 15 * largo
    c.line(x0, 16, x1, 16, "blanco" if i < 3 else "acero", w=grosor)
    for x, y in ((8, 11), (24, 21), (12, 22), (21, 10)):
        if (x + i) % 2:
            c.put(x, y, "chispa")


# Habilidades de la maga

def llamarada_grande(c, i):
    """Fuego morado: la llamarada de la maga, más grande."""
    r = [5, 10, 12, 11, 7][i]
    c.ellipse(16, 18, r, r * 0.9, "f_out")
    c.ellipse(16, 18 - i * 0.5, r * 0.7, r * 0.65, "f_mid")
    if i < 4:
        c.ellipse(16, 18 - i, r * 0.35, r * 0.35, "f_core")
    for n in range(7):
        x = 16 + (n - 3) * 3.2
        alto = (r + 2 + (n % 2) * 4) if i > 0 else 0
        c.line(x, 18 - r * 0.6, x + ((n + i) % 3 - 1), 18 - alto, "f_mid" if n % 2 else "f_out")


def chispas_verdes(c, i):
    """Curar: chispas verdes que suben alrededor de la maga."""
    alturas = (0, 11, 5, 17, 8, 20, 2)  # cada chispa empieza a una altura, para que no salgan en fila
    for n in range(7):
        x = 6 + n * 3.4
        y = 28 - ((i * 4 + alturas[n]) % 24)
        if (n + i) % 3 == 0:
            c.line(x - 1.5, y, x + 1.5, y, "verde_claro")
            c.line(x, y - 1.5, x, y + 1.5, "verde_claro")
        else:
            c.ellipse(x, y, 1.0, 1.0, "verde")


def fuego_fatuo(c, i):
    """Fuego fatuo: tres llamitas verdosas que dan vueltas al enemigo."""
    for k in range(3):
        a = math.radians(k * 120 + i * 45)
        x, y = 16 + math.cos(a) * 10, 16 + math.sin(a) * 6
        c.ellipse(x, y, 2.4, 2.4, "fatuo_osc")
        c.ellipse(x, y - 0.6, 1.4, 1.4, "fatuo")
        c.line(x, y - 2, x + math.cos(a + 1.6), y - 5, "fatuo")


def lluvia_fuego(c, i):
    """Tormenta morada: llamas que caen del cielo y estallan."""
    if i < 3:
        for k, x in enumerate((9, 16, 23)):
            y = [2, 9, 16][i] - k * 3
            c.line(x, y - 6, x, y, "f_mid")
            c.ellipse(x, y, 2, 2, "f_out")
            c.put(x, y, "f_core")
    else:
        r = [0, 0, 0, 10, 6][i]
        c.ellipse(16, 20, r, r * 0.6, "f_out")
        c.ellipse(16, 20, r * 0.6, r * 0.35, "f_mid")
        for n in range(5):
            x = 16 + (n - 2) * 4
            c.line(x, 20, x + (n - 2), 20 - r, "f_mid")


EFECTOS = [("corte", corte, 4, 16), ("impacto", impacto, 3, 14), ("llamarada", llamarada, 4, 12),
           ("corte_doble", corte_doble, 6, 18), ("aura_acero", aura_acero, 5, 12),
           ("viento", viento, 5, 16), ("iaido", iaido, 5, 14),
           ("llamarada_grande", llamarada_grande, 5, 12), ("chispas_verdes", chispas_verdes, 6, 14),
           ("fuego_fatuo", fuego_fatuo, 6, 14), ("lluvia_fuego", lluvia_fuego, 5, 12)]


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
