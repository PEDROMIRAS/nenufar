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


def _mascara(a, fondo, umbral, fondos_extra=()):
    """Matriz booleana: `True` donde hay figura."""
    if fondo == "negro":
        return a.sum(axis=2) > NEGRO
    alto, ancho = a.shape[:2]
    cercano = np.sqrt(((a - _esquina(a)) ** 2).sum(axis=2)) < umbral
    for extra in fondos_extra:  # otros colores que también son fondo (la sombra del suelo, por ejemplo)
        cercano |= np.sqrt(((a - np.array(extra)) ** 2).sum(axis=2)) < umbral
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
         brillo=1.0, saturacion=1.0, fondos_extra=()):
    """La pose reducida a `ancho` píxeles de ancho.

    `fondo`: "auto" (el color de las esquinas, quitado desde los bordes) o "negro". Con `paleta` fija
    (dict de nombre a RGB) cada píxel toma el color más cercano de esa paleta; sin ella, la imagen se
    cuantiza a `colores` colores. `brillo` y `saturacion` (1 = sin cambio) levantan las figuras oscuras antes de
    reducir. `fondos_extra` son colores RGB que, además del de las esquinas, cuentan como fondo. `retoques` son `(x, y, rgb)` que se aplican al final.
    """
    im = Image.open(ruta).convert("RGB")
    a = np.array(im).astype(int)
    mask = _mascara(a, fondo, umbral, fondos_extra)
    ys, xs = np.where(mask)
    assert mask.any(), f"{ruta}: no se encontró ninguna figura (¿umbral demasiado alto o imagen lisa?)"
    caja = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    recorte = im.crop(caja)
    m = Image.fromarray((mask[caja[1]:caja[3], caja[0]:caja[2]] * 255).astype("uint8"))
    alto = max(1, round(recorte.height * ancho / recorte.width))
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


# Cuánto se tuerce cada pose (píxeles que se adelanta la parte de arriba) y cuánto se estira de alto, por animación.
VIDA = {"idle": ([0, 1], [1.0, 0.97]), "walk": ([0, 2, 0, -2], [1.0, 0.98, 1.0, 0.98]),
        "atacar": ([-3, 5, 1], [1.0, 0.95, 1.0]), "golpe": ([-3], [0.97])}
MARGEN = 6


def vida(grid, anim, i, adelante=-1, fuerza=1.0):
    """La pose con vida: los pies quietos, el cuerpo respira (se encoge y vuelve) y se mece o se echa encima del
    enemigo (la parte de arriba se desplaza más que la de abajo). `adelante` es -1 si mira a la izquierda y 1 si
    mira a la derecha; `fuerza` rebaja el movimiento de los cuadros justos. Sin esto, una pose sacada de una imagen solo se movería entera, un píxel arriba y abajo."""
    torcer, estirar = VIDA[anim][0][i] * fuerza, VIDA[anim][1][i]
    alto, ancho = len(grid), len(grid[0])
    pie = alto - 1
    sal = [[None] * (ancho + 2 * MARGEN) for _ in range(alto)]
    for y in range(alto):
        origen = round(pie - (pie - y) / estirar)
        if not 0 <= origen < alto:
            continue
        desp = round(torcer * adelante * ((pie - y) / pie) ** 1.5)
        for x, c in enumerate(grid[origen]):
            if c is not None:
                sal[y][x + MARGEN + desp] = c
    return sal


_Q = (0, 0)
# Movimiento (dx, dy) de cada parte del cuerpo en cada fotograma: idle (2), walk (4), atacar (3), golpe (1).
PATRONES = {
    "pierna_a": {"idle": [_Q, _Q], "walk": [_Q, (0, -2), _Q, (0, 1)], "atacar": [_Q, _Q, _Q], "golpe": [_Q]},
    "pierna_b": {"idle": [_Q, _Q], "walk": [_Q, (0, 1), _Q, (0, -2)], "atacar": [_Q, _Q, _Q], "golpe": [_Q]},
    "brazo_i": {"idle": [_Q, (0, 1)], "walk": [_Q, (0, 2), _Q, (0, -2)], "atacar": [(0, -3), (1, 3), (0, 0)],
                "golpe": [(0, -2)]},
    "brazo_d": {"idle": [(0, 1), _Q], "walk": [_Q, (0, -2), _Q, (0, 2)], "atacar": [(0, -3), (-1, 3), (0, 0)],
                "golpe": [(0, -2)]},
    "cola": {"idle": [_Q, (1, 0)], "walk": [_Q, (2, -1), _Q, (-2, 1)], "atacar": [(3, 0), (-3, 1), (0, 0)],
             "golpe": [(2, 0)]},
    "cabeza": {"idle": [_Q, (0, 1)], "walk": [_Q, (0, 1), _Q, (0, 1)], "atacar": [(0, -2), (0, 2), (0, 0)],
               "golpe": [(0, -1)]},
}


def partes(grid, lista, anim, i):
    """La pose con cada parte de `lista` movida por separado: `(x0, y0, x1, y1, patron)`, con la caja en fracciones
    de lo que ocupa la figura (0 a 1) y el patrón de `PATRONES`. Cada píxel va con la primera parte que lo contiene.
    Así brazos, piernas, colas y cabezas se mueven de verdad, no solo la figura entera."""
    alto, ancho = len(grid), len(grid[0])
    ocupados = [(x, y) for y in range(alto) for x in range(ancho) if grid[y][x] is not None]
    xs, ys = [p[0] for p in ocupados], [p[1] for p in ocupados]
    bx, by, bw, bh = min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    sal = [fila[:] for fila in grid]
    movidos = []
    for x, y in ocupados:
        for fx0, fy0, fx1, fy1, patron in lista:
            if fx0 <= (x - bx) / bw < fx1 and fy0 <= (y - by) / bh < fy1:
                dx, dy = PATRONES[patron][anim][i]
                sal[y][x] = None
                movidos.append((x + dx, y + dy, grid[y][x]))
                break
    for x, y, c in movidos:
        if 0 <= x < ancho and 0 <= y < alto:
            sal[y][x] = c
    return sal
