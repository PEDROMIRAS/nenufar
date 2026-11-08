"""Vistas de perfil y de espalda de una figura bípeda sacada de una imagen de frente (`reducir.pose`), para los
jefes que solo tienen una vista. No inventa dibujo nuevo: gira la pose que ya está aprobada.

- `perfil`: mirando a la derecha (la izquierda es esta misma imagen volteada). El torso y la cabeza se estrechan,
  el brazo cercano se cuelga delante del cuerpo y se balancea, el lejano apenas asoma por detrás, y las piernas
  se cruzan al andar.
- `espalda`: la misma pose sin lo que solo se ve de frente (se recolorea lo que `frontal` indique) y con una
  línea de columna en el centro.

Las poses son matrices de colores RGB o `None`, sin contorno (el contorno se pone al final, con
`reducir.con_contorno`).
"""


def _caja(grid):
    ocupados = [(x, y) for y, fila in enumerate(grid) for x, c in enumerate(fila) if c is not None]
    xs, ys = [p[0] for p in ocupados], [p[1] for p in ocupados]
    return min(xs), min(ys), max(xs), max(ys)


def _vacia(alto, ancho):
    return [[None] * ancho for _ in range(alto)]


def _pegar(dest, src, x0, y0, solo_vacios=False):
    for y, fila in enumerate(src):
        for x, c in enumerate(fila):
            if c is None:
                continue
            px, py = x0 + x, y0 + y
            if 0 <= py < len(dest) and 0 <= px < len(dest[0]) and (not solo_vacios or dest[py][px] is None):
                dest[py][px] = c


def _recorte(grid, x0, y0, x1, y1):
    """Las columnas x0..x1 y filas y0..y1 (incluidas) de `grid`."""
    return [fila[x0:x1 + 1] for fila in grid[y0:y1 + 1]]


def _estrechar(sub, factor):
    """Quita columnas con un muestreo uniforme: el ancho pasa a `factor` del original."""
    ancho = len(sub[0])
    nuevo = max(1, round(ancho * factor))
    cols = [min(ancho - 1, int((k + 0.5) * ancho / nuevo)) for k in range(nuevo)]
    return [[fila[c] for c in cols] for fila in sub]


def perfil(grid, paso=0, cuerpo=0.62, cabeza=0.85, brazos=(0.22, 0.78), alto_torso=0.72, columna=None):
    """La pose de frente girada de perfil. `paso` va de -1 a 1: la pierna cercana se adelanta y el brazo cercano se
    atrasa (y al revés). Devuelve una pose del mismo tamaño que `grid`."""
    x0, y0, x1, y1 = _caja(grid)
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    fila_cab = y0 + round(bh * 0.27)
    fila_pie = y0 + round(bh * alto_torso)
    cx = (x0 + x1) // 2
    out = _vacia(len(grid), len(grid[0]))
    ax0 = x0 + round(bw * brazos[0])
    ax1 = x0 + round(bw * brazos[1])
    # Piernas: dos mitades que se cruzan al andar (la cercana, la de la derecha de la imagen)
    for lado, pasos in ((0, -paso), (1, paso)):
        mitad = _recorte(grid, x0 if lado == 0 else cx + 1, fila_pie + 1, cx if lado == 0 else x1, y1)
        mitad = _estrechar(mitad, 0.85)
        ancho_m = len(mitad[0])
        centro = cx - ancho_m // 2 + round(pasos * 3)
        _pegar(out, mitad, centro - 0 * lado, fila_pie + 1 - (1 if pasos > 0 else 0), solo_vacios=(lado == 0))
    # Torso estrechado (sin los brazos) y cabeza
    torso = _estrechar(_recorte(grid, ax0, fila_cab + 1, ax1, fila_pie), cuerpo)
    _pegar(out, torso, cx - len(torso[0]) // 2 + 1, fila_cab + 1)
    cab = _estrechar(_recorte(grid, ax0 - 2, y0, ax1 + 2, fila_cab), cabeza)
    _pegar(out, cab, cx - len(cab[0]) // 2 + 3, y0)
    # Brazo lejano: solo asoma un poco por detrás del torso
    lejano = _estrechar(_recorte(grid, x0, fila_cab + 2, ax0 - 1, fila_pie - 2), 0.7)
    _pegar(out, lejano, cx - len(torso[0]) // 2 - len(lejano[0]) + 3 - round(paso * 2), fila_cab + 2, solo_vacios=True)
    # Brazo cercano: delante del torso, balanceándose al revés que la pierna cercana
    cercano = _estrechar(_recorte(grid, ax1 + 1, fila_cab + 2, x1, fila_pie - 2), 0.9)
    _pegar(out, cercano, cx + len(torso[0]) // 2 - len(cercano[0]) // 2 - 1 - round(paso * 2), fila_cab + 2)
    return out


def espalda(grid, frontal=(), linea=None):
    """La pose de espaldas: los colores de `frontal` (dict color -> color de espalda) se sustituyen, y se marca la
    columna con `linea` (un color) a lo largo del torso."""
    x0, y0, x1, y1 = _caja(grid)
    cx = (x0 + x1) // 2
    out = [[dict(frontal).get(c, c) for c in fila] for fila in grid]
    if linea is not None:
        for y in range(y0 + round((y1 - y0) * 0.3), y0 + round((y1 - y0) * 0.72)):
            if out[y][cx] is not None:
                out[y][cx] = linea
    return out
