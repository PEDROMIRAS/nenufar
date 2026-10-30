"""Saca una pose de pixel art de una imagen de referencia: quita el fondo, recorta la figura, la reduce, la
repinta con pocos colores, limpia la silueta y le pone contorno.

Una pose es una matriz (filas de columnas) de colores RGB o `None` (transparente). Los módulos de los
monstruos la animan moviéndola y añadiéndole lo que la imagen no tiene (patas, llamas, brillos).
"""
import numpy as np
from PIL import Image, ImageEnhance

NEGRO = 90  # con fondo="negro", es figura todo píxel cuya suma RGB supere esto


def _esquina(a):
    """Color del fondo: la media de los cuatro bloques de 3×3 de las esquinas."""
    bloques = [a[:3, :3], a[:3, -3:], a[-3:, :3], a[-3:, -3:]]
    return np.concatenate([b.reshape(-1, 3) for b in bloques]).mean(axis=0)


def _mascara(a, fondo, umbral):
    """Matriz booleana: `True` donde hay figura."""
    if fondo == "negro":
        return a.sum(axis=2) > NEGRO
    alto, ancho = a.shape[:2]
    cercano = np.sqrt(((a - _esquina(a)) ** 2).sum(axis=2)) < umbral
    fondo_m = np.zeros((alto, ancho), dtype=bool)
    pila = [(x, y) for x in range(ancho) for y in (0, alto - 1)] + [(x, y) for y in range(alto) for x in (0, ancho - 1)]
    while pila:
        x, y = pila.pop()
        if not (0 <= x < ancho and 0 <= y < alto) or fondo_m[y, x] or not cercano[y, x]:
            continue
        fondo_m[y, x] = True
        pila.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return ~fondo_m


def _vecinos(grid, x, y):
    alto, ancho = len(grid), len(grid[0])
    return [grid[ny][nx] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
            if 0 <= nx < ancho and 0 <= ny < alto]


def limpiar(grid):
    """Silueta limpia, en el sitio: quita los píxeles sueltos y tapa los agujeros que deja la reducción."""
    alto, ancho = len(grid), len(grid[0])
    for _ in range(2):
        for y in range(alto):
            for x in range(ancho):
                ocupados = [k for k in _vecinos(grid, x, y) if k is not None]
                if grid[y][x] is not None and len(ocupados) <= 1:
                    grid[y][x] = None
                elif grid[y][x] is None and len(ocupados) >= 3:
                    grid[y][x] = max(sorted(set(ocupados)), key=ocupados.count)


def pose(ruta, ancho, colores=14, fondo="auto", umbral=60, contraste=1.35, retoques=(), paleta=None,
         brillo=1.0, saturacion=1.0):
    """La pose reducida a `ancho` píxeles de ancho.

    `fondo`: "auto" (el color de las esquinas, quitado desde los bordes) o "negro". Con `paleta` fija
    (dict de nombre a RGB) cada píxel toma el color más cercano de esa paleta; sin ella, la imagen se
    cuantiza a `colores` colores. `brillo` y `saturacion` (1 = sin cambio) levantan las figuras oscuras antes de
    reducir. `retoques` son `(x, y, rgb)` que se aplican al final.
    """
    im = Image.open(ruta).convert("RGB")
    a = np.array(im).astype(int)
    mask = _mascara(a, fondo, umbral)
    ys, xs = np.where(mask)
    caja = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    recorte = im.crop(caja)
    m = Image.fromarray((mask[caja[1]:caja[3], caja[0]:caja[2]] * 255).astype("uint8"))
    alto = round(recorte.height * ancho / recorte.width)
    reducida = recorte.resize((ancho, alto), Image.BOX)
    reducida = ImageEnhance.Color(ImageEnhance.Brightness(reducida).enhance(brillo)).enhance(saturacion)
    c = np.array(ImageEnhance.Contrast(reducida).enhance(contraste)).astype(int)
    mm = np.array(m.resize((ancho, alto), Image.BOX)) >= 110
    grid = [[None] * ancho for _ in range(alto)]
    if paleta:
        colores_p = np.array(list(paleta.values()))
        for y in range(alto):
            for x in range(ancho):
                if mm[y, x]:
                    d = ((colores_p - c[y, x]) ** 2).sum(axis=1)
                    grid[y][x] = tuple(int(v) for v in colores_p[int(d.argmin())])
    else:
        fg = c[mm].astype("uint8").reshape(-1, 1, 3)
        q = np.array(Image.fromarray(fg).quantize(colors=colores, method=Image.MEDIANCUT, dither=Image.NONE)
                     .convert("RGB")).reshape(-1, 3)
        n = 0
        for y in range(alto):
            for x in range(ancho):
                if mm[y, x]:
                    grid[y][x] = tuple(int(v) for v in q[n])
                    n += 1
    limpiar(grid)
    for x, y, rgb in retoques:
        grid[y][x] = rgb
    return grid


def con_contorno(grid, contorno):
    """La pose con una fila y una columna más por lado y un borde continuo de 1 px (vecinos en cruz)."""
    alto, ancho = len(grid), len(grid[0])
    marca = "contorno"
    sal = [[None] * (ancho + 2) for _ in range(alto + 2)]
    for y in range(alto):
        for x in range(ancho):
            sal[y + 1][x + 1] = grid[y][x]
    for y in range(alto + 2):
        for x in range(ancho + 2):
            if sal[y][x] is not None:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < ancho + 2 and 0 <= ny < alto + 2 and sal[ny][nx] not in (None, marca):
                    sal[y][x] = marca
                    break
    return [[contorno if k == marca else k for k in fila] for fila in sal]


def pegar(lienzo, grid, x0, y0):
    """Copia la pose en un array RGBA con su esquina en (x0, y0), recortando lo que se salga."""
    alto, ancho = lienzo.shape[:2]
    for y, fila in enumerate(grid):
        for x, rgb in enumerate(fila):
            if rgb is None:
                continue
            px, py = x0 + x, y0 + y
            if 0 <= px < ancho and 0 <= py < alto:
                lienzo[py, px] = tuple(rgb) + (255,)


def sin_tocar_bordes(img, permitir_abajo=True):
    """`True` si ningún píxel opaco está en la primera ni la última columna ni en la primera fila."""
    opaco = img[:, :, 3] > 0
    if opaco[:, 0].any() or opaco[:, -1].any() or opaco[0, :].any():
        return False
    return permitir_abajo or not opaco[-1, :].any()
