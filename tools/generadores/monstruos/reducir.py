"""Saca una pose de pixel art de una imagen de referencia: quita el fondo, recorta la figura, la reduce, la
repinta con pocos colores, limpia la silueta y le pone contorno.

Una pose es una matriz (filas de columnas) de colores RGB o `None` (transparente). Los módulos de los
monstruos la animan moviéndola y añadiéndole lo que la imagen no tiene (patas, llamas, brillos).
"""
import math

import numpy as np
from PIL import Image, ImageEnhance

NEGRO = 90  # con fondo="negro", es figura todo píxel cuya suma RGB supere esto


def _esquina(a):
    """Color del fondo: la media de los cuatro bloques de 3×3 de las esquinas."""
    bloques = [a[:3, :3], a[:3, -3:], a[-3:, :3], a[-3:, -3:]]
    return np.concatenate([b.reshape(-1, 3) for b in bloques]).mean(axis=0)


def _grupos(marca):
    """Los grupos de píxeles `True` unidos en cruz, cada uno como lista de `(x, y)`."""
    alto, ancho = marca.shape
    visto = np.zeros((alto, ancho), dtype=bool)
    grupos = []
    for y0, x0 in zip(*np.where(marca)):
        if visto[y0, x0]:
            continue
        grupo, pila = [], [(int(x0), int(y0))]
        visto[y0, x0] = True
        while pila:
            x, y = pila.pop()
            grupo.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < ancho and 0 <= ny < alto and marca[ny, nx] and not visto[ny, nx]:
                    visto[ny, nx] = True
                    pila.append((nx, ny))
        grupos.append(grupo)
    return grupos


def _mascara(a, fondo, umbral, fondos_extra=(), encerrado=None, motas=None):
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
    if encerrado is not None:
        # Fondo encerrado: del color del fondo pero sin camino hasta el borde (el hueco entre un brazo y el
        # torso). Solo los trozos grandes: los pequeños son brillos de la figura que se parecen al fondo.
        for grupo in _grupos(cercano & ~fondo_m):
            if len(grupo) >= encerrado:
                for x, y in grupo:
                    fondo_m[y, x] = True
    if motas is not None:
        # Motas: trozos pequeños separados de la figura (restos del suelo, salpicaduras de la imagen).
        for grupo in _grupos(~fondo_m):
            if len(grupo) < motas:
                for x, y in grupo:
                    fondo_m[y, x] = True
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
         brillo=1.0, saturacion=1.0, fondos_extra=(), encerrado=None, motas=None, recorte=None):
    """La pose reducida a `ancho` píxeles de ancho.

    `fondo`: "auto" (el color de las esquinas, quitado desde los bordes) o "negro". Con `paleta` fija
    (dict de nombre a RGB) cada píxel toma el color más cercano de esa paleta; sin ella, la imagen se
    cuantiza a `colores` colores. `brillo` y `saturacion` (1 = sin cambio) levantan las figuras oscuras antes de
    reducir. `fondos_extra` son colores RGB que, además del de las esquinas, cuentan como fondo. `retoques` son `(x, y, rgb)` que se aplican al final.
    `encerrado`: con un número, las zonas del color del fondo que no tocan el borde de la imagen y tienen al menos
    esos píxeles (de la imagen original) también se quitan. `motas`: con un número, los trozos de figura sueltos
    de menos de esos píxeles se quitan (no valen con `fondo="negro"`). `recorte`: caja `(x0, y0, x1, y1)` de la
    imagen que se mira, para dejar fuera una raya de suelo o un rótulo.
    """
    # `ruta` puede ser una imagen ya abierta (y retocada: bocetos de alrededor tapados, por ejemplo)
    im = (ruta if isinstance(ruta, Image.Image) else Image.open(ruta)).convert("RGB")
    if recorte:
        im = im.crop(recorte)
    a = np.array(im).astype(int)
    mask = _mascara(a, fondo, umbral, fondos_extra, encerrado, motas)
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


def vida(grid, anim, i, adelante=-1, fuerza=1.0, valores=None):
    """La pose con vida: los pies quietos, el cuerpo respira (se encoge y vuelve) y se mece o se echa encima del
    enemigo (la parte de arriba se desplaza más que la de abajo). `adelante` es -1 si mira a la izquierda y 1 si
    mira a la derecha; `fuerza` rebaja el movimiento de los cuadros justos; `valores` son `(torcer, estirar)` ya
    calculados (los de `movimiento`), en vez de los de la tabla. Sin esto, una pose sacada de una imagen solo se movería entera, un píxel arriba y abajo."""
    torcer, estirar = valores or (VIDA[anim][0][i] * fuerza, VIDA[anim][1][i])
    margen = MARGEN if valores is None else math.ceil(abs(torcer)) + 1  # a doble escala se tuerce más
    alto, ancho = len(grid), len(grid[0])
    pie = alto - 1
    sal = [[None] * (ancho + 2 * margen) for _ in range(alto)]
    for y in range(alto):
        origen = round(pie - (pie - y) / estirar)
        if not 0 <= origen < alto:
            continue
        desp = round(torcer * adelante * ((pie - y) / pie) ** 1.5)
        for x, c in enumerate(grid[origen]):
            if c is not None:
                sal[y][x + margen + desp] = c
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


def _ventana(f, a, b, borde):
    """1 dentro de [a, b] y, fuera, baja suavemente a 0 a lo largo de `borde` (todo en fracciones de la figura)."""
    if a <= f <= b:
        return 1.0
    d = (a - f) if f < a else (f - b)
    u = max(0.0, 1.0 - d / borde)
    return u * u * (3 - 2 * u)


def partes(grid, lista, anim, i, borde=0.14, patrones=None):
    """La pose con brazos, piernas, colas y cabezas moviéndose de verdad: `lista` son `(x0, y0, x1, y1, patron)`, con
    la caja en fracciones de lo que ocupa la figura (0 a 1) y el patrón de `PATRONES` (o de `patrones`, el
    diccionario de `movimiento`, si se da).

    Cada parte arrastra la imagen con un campo de desplazamiento suave: vale lo del patrón dentro de su caja y
    baja a cero a lo largo de `borde` fuera de ella (donde se solapan dos partes, se reparten). La imagen se
    remuestrea con ese campo, así que nada se corta: lo que une una pierna con el cuerpo se estira en lugar de
    abrirse (moverlas como piezas sueltas dejaba grietas y trozos flotando)."""
    alto, ancho = len(grid), len(grid[0])
    ocupados = [(x, y) for y in range(alto) for x in range(ancho) if grid[y][x] is not None]
    xs, ys = [p[0] for p in ocupados], [p[1] for p in ocupados]
    bx, by, bw, bh = min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    sal = [[None] * ancho for _ in range(alto)]
    for y in range(alto):
        fy = (y - by + 0.5) / bh
        for x in range(ancho):
            fx = (x - bx + 0.5) / bw
            sx = sy = total = 0.0
            for fx0, fy0, fx1, fy1, patron in lista:
                w = _ventana(fx, fx0, fx1, borde) * _ventana(fy, fy0, fy1, borde)
                if w > 0:
                    dx, dy = patrones[patron] if patrones else PATRONES[patron][anim][i]
                    sx, sy, total = sx + w * dx, sy + w * dy, total + w
            if total > 1:
                sx, sy = sx / total, sy / total
            ox, oy = round(x - sx), round(y - sy)
            if 0 <= ox < ancho and 0 <= oy < alto:
                sal[y][x] = grid[oy][ox]
    for y in range(alto):  # ningún píxel suelto: lo que el estiramiento deja sin vecinos se quita
        for x in range(ancho):
            if sal[y][x] is not None and all(k is None for k in _vecinos(sal, x, y)):
                sal[y][x] = None
    return sal


# ---------------------------------------------------------------- hojas a doble resolución
# (nombre, fotogramas, fps, en bucle): duran lo mismo que las de 2, 4 y 3 fotogramas, con más pasos.
ANIMS_DOBLE = [("idle", 8, 12, True), ("walk", 8, 16, True), ("atacar", 6, 20, False), ("golpe", 1, 1, False)]
N_DOBLE = {nombre: n for nombre, n, _, _ in ANIMS_DOBLE}  # fotogramas de cada animación


def _clave(u, puntos):
    """Valor en `u` de una curva dada por claves `(t, valor)`, con paso suave entre ellas (número o tupla)."""
    for (t0, v0), (t1, v1) in zip(puntos, puntos[1:]):
        if t0 <= u <= t1:
            f = (u - t0) / (t1 - t0)
            f = f * f * (3 - 2 * f)
            if isinstance(v0, tuple):
                return tuple(a + (b - a) * f for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * f
    return puntos[-1][1]


def movimiento(anim, i, n, escala):
    """El movimiento del fotograma `i` de `n` como curvas continuas, en vez de las tablas `PATRONES` y `VIDA`:
    `(patrones, torcer, estirar, dx, dy)`, con `patrones` de parte a `(dx, dy)`. Las medidas están pensadas en
    píxeles del juego y salen multiplicadas por `escala` (2 en las hojas a doble resolución)."""
    q = (0, 0)
    if anim == "idle":
        f = 2 * math.pi * i / n
        r = (1 - math.cos(f)) / 2  # respiración: 0, 1, 0
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": (0, r), "brazo_d": (0, r), "cola": (math.sin(f), 0),
             "cabeza": (0, r)}
        t, e, dx, dy = r, 1 - 0.03 * r, 0, 0
    elif anim == "walk":
        f = 2 * math.pi * i / n
        bote = (1 - math.cos(2 * f)) / 2

        def paso(g):  # la pierna avanza mientras está en el aire
            return 1.5 * math.sin(g), -2 * max(0.0, math.cos(g))

        p = {"pierna_a": paso(f), "pierna_b": paso(f + math.pi), "brazo_i": (0, 2 * math.sin(f)),
             "brazo_d": (0, -2 * math.sin(f)), "cola": (2 * math.sin(f), -math.cos(f)), "cabeza": (0, bote)}
        t, e, dx, dy = 2 * math.sin(f), 1 - 0.02 * bote, 0, bote
    elif anim == "atacar":
        # El primer fotograma ya es el cuerpo echado atrás (el combate lo deja quieto ahí mientras el monstruo
        # prepara un golpe cargado); se lanza en el 40 % y vuelve al reposo.
        u = i / (n - 1)
        b = _clave(u, [(0, (0, -3)), (0.4, (1, 3)), (1, q)])
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": b, "brazo_d": (-b[0], b[1]),
             "cola": _clave(u, [(0, (3, 0)), (0.4, (-3, 1)), (1, q)]),
             "cabeza": _clave(u, [(0, (0, -2)), (0.4, (0, 2)), (1, q)])}
        t = _clave(u, [(0, -3), (0.4, 5), (0.7, 2), (1, 0)])
        e = _clave(u, [(0, 1), (0.4, 0.95), (1, 1)])
        dx, dy = _clave(u, [(0, -1), (0.4, 2), (1, 0)]), 0
    else:  # golpe: recula
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": (0, -2), "brazo_d": (0, -2), "cola": (2, 0), "cabeza": (0, -1)}
        t, e, dx, dy = -3, 0.97, -2, 0
    return ({k: (v[0] * escala, v[1] * escala) for k, v in p.items()}, t * escala, e, round(dx * escala),
            round(dy * escala))


def animar(base, lista, anim, i, n, escala, ancho, alto, adelante=-1):
    """El fotograma `i` de `n` de la pose `base` (con su contorno) como array RGBA de `alto`×`ancho`: las partes
    de `lista` y el cuerpo se mueven con `movimiento`, la figura va centrada y sus pies caen en el ancla
    (`alto - 2 * escala`)."""
    patrones, torcer, estirar, dx, dy = movimiento(anim, i, n, escala)
    g = vida(partes(base, lista, anim, i, patrones=patrones), anim, i, adelante=adelante, valores=(torcer, estirar))
    lienzo = np.zeros((alto, ancho, 4), dtype=np.uint8)
    pegar(lienzo, g, (ancho - len(g[0])) // 2 + dx * adelante, alto - 2 * escala + 2 + dy - len(g))
    return lienzo


def sueltos(img, exentos=()):
    """Cuántos trozos opacos hay además del mayor (motas y piezas sueltas), unidos también en diagonal. Los
    píxeles de los colores `exentos` no cuentan (el polvo de un golpe, por ejemplo)."""
    exentos = {tuple(c) for c in exentos}
    alto, ancho = img.shape[:2]
    libre = {(x, y) for y in range(alto) for x in range(ancho)
             if img[y, x, 3] > 0 and tuple(int(v) for v in img[y, x, :3]) not in exentos}
    trozos = 0
    while libre:
        pila = [libre.pop()]
        trozos += 1
        while pila:
            x, y = pila.pop()
            for nx in (x - 1, x, x + 1):
                for ny in (y - 1, y, y + 1):
                    if (nx, ny) in libre:
                        libre.remove((nx, ny))
                        pila.append((nx, ny))
    return max(0, trozos - 1)
