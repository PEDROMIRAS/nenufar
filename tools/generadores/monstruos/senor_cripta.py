"""Señor de la Cripta (48x48), jefe de la Cripta: una calavera encapuchada con la capa rota hasta el suelo y una
espada en la mano. Va de frente y no anda.
Su pose sale de la imagen de referencia (la 12) con `reducir.py`; aquí se anima. La imagen es una escena (cueva,
velas), así que antes de reducirla se separa la figura con un contorno dibujado a mano y se le quita la niebla verde.

Hoja del repo: idle (2: respira), walk (4: se mece), atacar (3: se echa atrás, se lanza y vuelve) y golpe (1:
recula). Todas las filas son la misma vista."""
import os
import tempfile
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import reducir

W, H = 48, 48
OUT = (10, 8, 12)
REFERENCIA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "superpowers",
                          "mockups", "cauce-seco-referencias", "12-senor-cripta-espada.png")
ANCHO = 42
COMPRESION = 0.75  # la figura es más alta que ancha: se comprime un poco a lo alto para ganar píxeles de ancho
# Zona de la imagen con la figura y los dos contornos (cuerpo y espada), en coordenadas de ese recorte ampliado ×1,5
CAJA = (130, 100, 650, 700)
AUMENTO = 1.5
CUERPO = [(310, 60), (360, 38), (420, 70), (440, 140), (500, 175), (545, 260), (550, 330), (560, 400), (565, 520),
          (620, 640), (640, 760), (580, 860), (430, 890), (210, 890), (150, 810), (185, 650), (215, 560), (160, 500),
          (150, 380), (200, 330), (235, 215), (310, 150)]
ESPADA = [(25, 420), (60, 412), (385, 740), (362, 768)]
FONDO = (255, 0, 255)
# Paleta fija: casi todo es negro y gris, y sin ella el acero y el cuero se hunden en el negro
PALETA = {"negro": (22, 18, 28), "negro_l": (38, 34, 48), "carbon": (56, 52, 68), "gris_s": (76, 74, 90),
          "gris": (104, 104, 118), "acero": (148, 154, 158), "acero_l": (208, 216, 208), "hueso": (230, 234, 220),
          "cuero": (130, 88, 54), "cuero_l": (196, 130, 72)}
CARA = (22, 1)  # esquina de la cara en la pose reducida
COLORES_CARA = {"c": "carbon", "n": "negro", "h": "hueso"}

DY = {"idle": [0, 1], "walk": [0, 1, 0, 1], "atacar": [0, 1, 0], "golpe": [0]}
DX = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 1, 0], "golpe": [-2]}

_BASE = None


def _figura():
    """La imagen con la figura sola sobre un fondo liso (`FONDO`), recortada a su caja."""
    im = Image.open(REFERENCIA).convert("RGB").crop(CAJA)
    im = im.resize((round(im.width * AUMENTO), round(im.height * AUMENTO)), Image.NEAREST)
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    for contorno in (CUERPO, ESPADA):
        d.polygon(contorno, fill=255)
    a = np.array(im).astype(int)
    dentro = np.array(m) > 0
    luz = a.sum(axis=2) / 3
    bruma = (luz > 78) & (a[:, :, 1] > a[:, :, 0] + 10) & (a[:, :, 1] >= a[:, :, 2])
    alto, ancho = dentro.shape
    # La niebla verde que se cuela por los bordes del contorno se quita propagándola desde fuera
    quitar = np.zeros_like(dentro)
    cola = deque()
    for y in range(alto):
        for x in range(ancho):
            if dentro[y, x] and bruma[y, x] and any(
                    not (0 <= y + dy < alto and 0 <= x + dx < ancho) or not dentro[y + dy, x + dx]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                quitar[y, x] = True
                cola.append((x, y))
    while cola:
        x, y = cola.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < ancho and 0 <= ny < alto and dentro[ny, nx] and bruma[ny, nx] and not quitar[ny, nx]:
                quitar[ny, nx] = True
                cola.append((nx, ny))
    salida = a.astype("uint8")
    salida[~(dentro & ~quitar)] = FONDO
    img = Image.fromarray(salida)
    img = img.resize((img.width, round(img.height * COMPRESION)), Image.LANCZOS)
    # Afilar antes de reducir: la imagen tiene los pliegues de la capa casi en el mismo negro
    return img.filter(ImageFilter.UnsharpMask(radius=3, percent=140, threshold=2))


def _pose():
    global _BASE
    if _BASE is None:
        with tempfile.TemporaryDirectory() as d:
            ruta = os.path.join(d, "senor.png")
            _figura().save(ruta)
            grid = reducir.pose(ruta, ANCHO, brillo=2.0, saturacion=1.2, contraste=1.35, umbral=40, paleta=PALETA)
        # La cara de calavera, dibujada a mano: al reducir la imagen se queda en una mancha gris
        for y, fila in enumerate((".ccc..", "cnnnc.", "nhhhhn", "hnhhnh", "nhhhhn", ".nhhn.")):
            for x, c in enumerate(fila):
                if c != ".":
                    grid[CARA[1] + y][CARA[0] + x] = PALETA[COLORES_CARA[c]]
        _BASE = reducir.con_contorno(grid, OUT)
    return _BASE


def fotograma(direccion, anim, i):
    lienzo = np.zeros((H, W, 4), dtype=np.uint8)
    sal = _pose()
    alto, ancho = len(sal), len(sal[0])
    reducir.pegar(lienzo, sal, (W - ancho) // 2 + DX[anim][i], 47 - alto + DY[anim][i])
    return lienzo
