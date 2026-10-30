"""Rey sin Charca (64x48), jefe final: la última forma del Señor de la Cripta. Un caballero de armadura negra con
yelmo de cuernos, ojos rojos, hombreras con púas, la capa rota hasta el suelo y un fuego morado oscuro en la mano.
Va de frente y no anda. Su pose sale de la imagen de referencia (la 13) con `reducir.py`; aquí se anima.

Solo sale en combate (de frente, ×2). Como los otros jefes, cabe en 48 de alto con los pies en 46 y no sube
más de ~42 px sobre ellos: por encima van su nombre y la barra de turnos.
Hoja del repo: idle (2: respira), walk (4: se mece), atacar (3: se echa atrás, se lanza y vuelve) y golpe (1)."""
import os

import numpy as np
from PIL import Image, ImageFilter
import tempfile

import reducir

W, H = 64, 48
OUT = (8, 6, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "13-rey-sin-charca.png")
ANCHO = 40
COMPRESION = 0.75  # la figura es más alta que ancha: se comprime a lo alto para ganar píxeles de ancho
SOMBRAS = [(184, 177, 169), (177, 170, 164)]  # la sombra del suelo de la imagen, que cuenta como fondo
# Paleta fija: la imagen es casi toda negra, y sin ella los pliegues de la armadura se hunden en un negro liso
PALETA = {"negro": (18, 16, 22), "negro_l": (34, 32, 42), "carbon": (54, 52, 64), "gris_s": (76, 74, 88),
          "gris": (104, 102, 116), "gris_l": (150, 148, 158), "hueso": (206, 204, 210), "rojo": (226, 36, 48), "rojo_l": (255, 120, 108), "morado_s": (62, 30, 88),
          "morado": (116, 58, 156), "morado_l": (172, 108, 208)}

OJOS_Y = 10  # fila de los ojos en la pose reducida; la cabeza está centrada entre las columnas 19 y 22

DY = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [0, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-2, 2, 0], "golpe": [-2]}

_BASE = None


def _pose():
    global _BASE
    if _BASE is None:
        im = Image.open(REFERENCIA).convert("RGB")
        im = im.resize((im.width, round(im.height * COMPRESION)), Image.LANCZOS)
        # Afilar antes de reducir: los pliegues de la armadura están casi en el mismo negro
        im = im.filter(ImageFilter.UnsharpMask(radius=6, percent=260, threshold=1))
        with tempfile.TemporaryDirectory() as d:
            ruta = os.path.join(d, "rey.png")
            im.save(ruta)
            grid = reducir.pose(ruta, ANCHO, brillo=3.0, saturacion=1.25, contraste=1.5, umbral=40, paleta=PALETA,
                                fondos_extra=SOMBRAS)
        # El borde de la imagen mezcla el beige del fondo con el negro: se pelan los grises claros que dan al vacío
        claros = {PALETA["gris_l"], PALETA["hueso"]}
        for _ in range(2):
            quitar = [(x, y) for y, fila in enumerate(grid) for x, c in enumerate(fila)
                      if c in claros and any(
                          not (0 <= y + dy < len(grid) and 0 <= x + dx < len(fila)) or grid[y + dy][x + dx] is None
                          for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
            for x, y in quitar:
                grid[y][x] = None
        # El fuego de la mano (arriba a la izquierda) sale gris al reducir: se repinta de morado
        morado = {PALETA["hueso"]: PALETA["morado_l"], PALETA["gris_l"]: PALETA["morado"], PALETA["gris"]: PALETA["morado_s"]}
        for y in range(round(len(grid) * 0.5)):
            for x in range(round(len(grid[0]) * 0.3)):
                grid[y][x] = morado.get(grid[y][x], grid[y][x])
        # Restos de la sombra del suelo en el bajo de la capa: salen blancos y se pasan a gris oscuro
        for y in range(round(len(grid) * 0.65), len(grid)):
            grid[y] = [PALETA["carbon"] if c in claros else c for c in grid[y]]
        # Los ojos, dibujados a mano: al reducir la imagen se juntan en una sola mancha roja
        for x, color in ((19, "rojo"), (20, "negro"), (21, "negro"), (22, "rojo")):
            grid[OJOS_Y][x] = PALETA[color]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
