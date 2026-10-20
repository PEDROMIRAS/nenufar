"""Monstruos con forma humana (esqueleto, caballero, chamán) y los jefes golem y Señor de la Cripta.

Mismo contrato que criaturas.py: dibujar(c, vista, anim, i). Los bípedos comparten esqueleto de
poses (`_bipedo`); cada uno pone su cabeza, torso y arma.
"""
import math

# Por animación y fotograma: balanceo vertical, zancada, ángulo del brazo del arma (90 = colgando,
# 0 = al frente, -90 = arriba) y ángulo del arma (-90 = hacia arriba).
BOB = {"idle": [0, 1], "walk": [0, -1, 0, -1], "atacar": [0, -1, 1], "golpe": [0]}
PASO = {"idle": [0, 0], "walk": [2, 0, -2, 0], "atacar": [0, 1, 2], "golpe": [0]}
BRAZO = {"idle": [75, 78], "walk": [70, 80, 90, 80], "atacar": [-120, 10, 40], "golpe": [110]}
ARMA = {"idle": [-80, -78], "walk": [-75, -80, -85, -80], "atacar": [-130, 15, 60], "golpe": [-110]}


def _pose(c, anim, i, talla=1.0):
    return {"k": c.t / 32 * talla, "bob": BOB[anim][i], "paso": PASO[anim][i],
            "brazo": math.radians(BRAZO[anim][i]), "arma": math.radians(ARMA[anim][i]),
            "atq": anim == "atacar" and i == 1, "inc": -2 if anim == "golpe" else 0}


def _grueso(c, x0, y0, x1, y1, col, w):
    """Línea de grosor w en las dos direcciones (brazos, piernas, mangos)."""
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    r = (w - 1) / 2
    for s in range(n + 1):
        t = s / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        c.rect(x - r, y - r, x + r, y + r, col)


def _bipedo(c, vista, p, pierna, brazo, torso, cabeza, arma, escudo=None, grosor=(2, 2)):
    k = p["k"]
    cx = c.t / 2 + p["inc"] * k
    base = c.t - 2
    cadera = base - 7 * k + p["bob"] * k
    hombro = cadera - 9 * k
    wp, wb = max(1, round(grosor[0] * k)), max(1, round(grosor[1] * k))
    b, a, paso = p["brazo"], p["arma"], p["paso"] * k
    lado = 1 if vista != "espalda" else -1  # de espaldas, el brazo del arma queda al otro lado

    if vista == "lado":
        sx, sy = cx + 1 * k, hombro + 1 * k
        mano = (sx + math.cos(b) * 6 * k, sy + math.sin(b) * 6 * k)
        dx, dy = math.cos(a), math.sin(a)
        _grueso(c, cx - 1 * k, sy, cx - 2 * k, sy + 6 * k, brazo + "_s", wb)  # brazo de atrás
        if pierna:
            _grueso(c, cx - 1 * k, cadera, cx - paso * 1.2, base, pierna + "_s", wp)
            _grueso(c, cx, cadera, cx + paso * 1.2, base, pierna, wp)
    else:
        sx, sy = cx + lado * 4.5 * k, hombro + 1 * k
        mano = (sx + lado * (1 - math.cos(b) * 2) * k, sy + math.sin(b) * 6 * k)
        dx, dy = lado * math.cos(a) * 0.6, math.sin(a)
        if vista == "espalda":
            arma(c, mano[0], mano[1], dx, dy, k, vista, p)
        if pierna:
            for s in (-1, 1):
                alza = max(0, s * paso) * 0.7
                _grueso(c, cx + s * 2 * k, cadera, cx + s * 2.2 * k, base - alza, pierna, wp)
        _grueso(c, cx - lado * 4.5 * k, sy, cx - lado * 5 * k, sy + 6 * k, brazo, wb)  # brazo libre
    torso(c, cx, hombro, cadera, vista, k, p)
    cabeza(c, cx, hombro - 4.5 * k, vista, k, p)
    if escudo:
        ex = cx + 3 * k if vista == "lado" else cx - lado * 6 * k
        escudo(c, ex, hombro + 5 * k, vista, k)
    _grueso(c, sx, sy, mano[0], mano[1], brazo, wb)
    if vista != "espalda":
        arma(c, mano[0], mano[1], dx, dy, k, vista, p)


def _espada(largo):
    def dibujar(c, hx, hy, dx, dy, k, vista, p):
        _grueso(c, hx - dx * 2 * k, hy - dy * 2 * k, hx, hy, "cuero", max(1, round(k)))
        c.line(hx, hy, hx + dx * largo * k, hy + dy * largo * k, "metal", w=max(1, round(k)))
        c.line(hx + dx * 1 * k, hy + dy * 1 * k, hx + dx * (largo - 1) * k, hy + dy * (largo - 1) * k, "metal_l")
        # Guarda perpendicular a la hoja
        c.line(hx - dy * 2 * k, hy + dx * 2 * k, hx + dy * 2 * k, hy - dx * 2 * k, "oro_s")
    return dibujar


# ---------------------------------------------------------------- esqueleto

def _calavera(c, x, y, vista, k, p):
    c.ellipse(x, y, 4.5 * k, 4.2 * k, "hueso", sombra="hueso_s", luz="hueso_l")
    c.rect(x - 2.5 * k, y + 3 * k, x + 2.5 * k, y + 4.5 * k, "hueso_s")
    if vista == "frente":
        for s in (-1, 1):
            c.ellipse(x + s * 1.8 * k, y, 1.3 * k, 1.5 * k, "cuenca")
            c.put(x + s * 1.8 * k, y, "ojo")
        c.put(x, y + 2 * k, "cuenca")
        c.line(x - 2 * k, y + 3.5 * k, x + 2 * k, y + 3.5 * k, "cuenca")
    elif vista == "lado":
        c.ellipse(x + 2 * k, y, 1.2 * k, 1.5 * k, "cuenca")
        c.put(x + 2 * k, y, "ojo")
        c.line(x + 1 * k, y + 3.5 * k, x + 2.5 * k, y + 3.5 * k, "cuenca")


def _costillas(c, cx, hombro, cadera, vista, k, p):
    c.ellipse(cx, hombro + 4 * k, 4.5 * k if vista != "lado" else 3 * k, 4.5 * k, "hueso", sombra="hueso_s")
    for n in range(3):
        y = hombro + (2.5 + n * 2) * k
        c.line(cx - 3.5 * k, y, cx + 3.5 * k, y, "cuenca")
    c.line(cx, hombro, cx, cadera, "hueso_s")  # columna
    c.rect(cx - 3 * k, cadera - 1 * k, cx + 3 * k, cadera, "hueso_s")  # pelvis


def esqueleto(c, vista, anim, i):
    p = _pose(c, anim, i)
    _bipedo(c, vista, p, "hueso", "hueso", _costillas, _calavera, _espada(9), grosor=(1.5, 1.5))


# ---------------------------------------------------------------- caballero oscuro

def _yelmo(c, x, y, vista, k, p):
    c.ellipse(x, y, 4.8 * k, 4.8 * k, "armadura", sombra="armadura_s", luz="armadura_l")
    if vista == "frente":
        c.rect(x - 3 * k, y, x + 3 * k, y + 0.8 * k, "visor")
        c.put(x - 1.5 * k, y, "ojo")
        c.put(x + 1.5 * k, y, "ojo")
    elif vista == "lado":
        c.rect(x + 1 * k, y, x + 4.5 * k, y + 0.8 * k, "visor")
        c.put(x + 3 * k, y, "ojo")
    # Penacho
    c.poly([(x - 1 * k, y - 4 * k), (x + 1 * k, y - 4 * k), (x - 1 * k, y - 8 * k), (x - 4 * k, y - 6 * k)], "pluma")


def _coraza(c, cx, hombro, cadera, vista, k, p):
    if vista != "frente":
        # La capa asoma por detrás (y cubre la espalda)
        ancho = 5.5 if vista == "espalda" else 3
        dx = 0 if vista == "espalda" else -2 * k
        c.poly([(cx + dx - ancho * k, hombro), (cx + dx + ancho * k, hombro),
                (cx + dx + (ancho + 1) * k, cadera + 6 * k), (cx + dx - (ancho + 1) * k, cadera + 6 * k)], "capa")
    if vista != "espalda":
        c.ellipse(cx, hombro + 4 * k, 5.5 * k if vista == "frente" else 4 * k, 5 * k,
                  "armadura", sombra="armadura_s", luz="armadura_l")
    c.rect(cx - 4 * k, cadera - 1 * k, cx + 4 * k, cadera, "cuero")
    # Hombreras
    for s in ((-1, 1) if vista != "lado" else (1,)):
        c.ellipse(cx + s * 4.5 * k, hombro + 1 * k, 2.2 * k, 1.8 * k, "armadura_l", sombra="armadura")


def _escudo(c, x, y, vista, k):
    if vista == "espalda":
        return
    w = 3.5 if vista == "frente" else 2
    c.poly([(x - w * k, y - 4 * k), (x + w * k, y - 4 * k), (x + w * k, y + 1 * k), (x, y + 5 * k),
            (x - w * k, y + 1 * k)], "armadura_s")
    c.line(x, y - 3 * k, x, y + 3 * k, "oro")
    c.line(x - (w - 1) * k, y - 1 * k, x + (w - 1) * k, y - 1 * k, "oro")


def caballero(c, vista, anim, i):
    p = _pose(c, anim, i)
    _bipedo(c, vista, p, "armadura", "armadura", _coraza, _yelmo, _espada(11), escudo=_escudo, grosor=(3, 2.5))


# ---------------------------------------------------------------- chamán goblin

def _goblin(c, x, y, vista, k, p):
    y += 1 * k
    for s in ((-1, 1) if vista != "lado" else (-1,)):
        c.poly([(x + s * 3 * k, y - 1 * k), (x + s * 9 * k, y - 4 * k), (x + s * 4 * k, y + 2 * k)], "piel_s")
    c.ellipse(x, y, 5 * k, 4.5 * k, "piel", sombra="piel_s", luz="piel_l")
    if vista == "frente":
        for s in (-1, 1):
            c.put(x + s * 2 * k, y, "ojo")
        c.line(x - 2 * k, y + 2.5 * k, x + 2 * k, y + 2.5 * k, "piel_s")
        c.put(x - 1 * k, y + 3 * k, "hueso")
        c.put(x + 1 * k, y + 3 * k, "hueso")
    elif vista == "lado":
        c.put(x + 3 * k, y, "ojo")
        c.put(x + 5 * k, y + 1 * k, "piel")  # nariz ganchuda
    # Tocado de plumas
    for n, col in enumerate(("pluma", "orbe", "pluma")):
        c.line(x + (n - 1) * 2 * k, y - 4 * k, x + (n - 1) * 3 * k, y - 8 * k, col)


def _tunica(c, cx, hombro, cadera, vista, k, p):
    ancho = 4 if vista != "lado" else 3
    c.poly([(cx - ancho * k, hombro), (cx + ancho * k, hombro), (cx + (ancho + 3) * k, cadera + 5 * k),
            (cx - (ancho + 3) * k, cadera + 5 * k)], "tunica")
    c.line(cx - (ancho + 2) * k, cadera + 4 * k, cx + (ancho + 2) * k, cadera + 4 * k, "tunica_s")
    if vista != "espalda":
        # Collar de colmillos
        for n in range(-2, 3):
            c.put(cx + n * 1.5 * k, hombro + 1.5 * k + abs(n) * -0.3 * k, "hueso")


def _baston(c, hx, hy, dx, dy, k, vista, p):
    # El bastón va en la mano casi vertical; al lanzar el hechizo se alza y la esfera crece.
    tx, ty = hx + dx * 8 * k, hy + dy * 8 * k
    _grueso(c, hx - dx * 4 * k, hy - dy * 4 * k, tx, ty, "madera", max(1, round(k)))
    r = 2.6 if p["atq"] else 1.8
    c.ellipse(tx, ty, r * k, r * k, "orbe", luz="brillo")


def chaman(c, vista, anim, i):
    p = _pose(c, anim, i, talla=0.85)
    _bipedo(c, vista, p, "piel", "piel", _tunica, _goblin, _baston, grosor=(2, 1.5))


# ---------------------------------------------------------------- golem (jefe de las Ruinas)

GOLEM_PUNOS = {"idle": [(0, 0), (0, 1)], "walk": [(-1, 1), (0, 0), (1, -1), (0, 0)],
               "atacar": [(-14, -14), (6, 6), (3, 3)], "golpe": [(-2, -2)]}


def golem(c, vista, anim, i):
    k = c.t / 32
    bob = BOB[anim][i] * k
    pi, pd = (v * k for v in GOLEM_PUNOS[anim][i])
    cx, base = c.t / 2 + (-2 * k if anim == "golpe" else 0), c.t - 2
    paso = PASO[anim][i] * k
    # Piernas cortas como pilares
    for s in (-1, 1):
        alza = max(0, s * paso) * 0.6
        c.rect(cx + s * 4 * k - 2.5 * k, base - 8 * k, cx + s * 4 * k + 2.5 * k, base - alza, "piedra_s")
    cy = base - 15 * k + bob
    hombros = (-1, 1) if vista != "lado" else (1,)
    if vista == "lado":
        c.ellipse(cx - 3 * k, cy - 1 * k, 4 * k, 6 * k, "piedra_s")  # brazo de atrás
    c.ellipse(cx, cy, 10 * k if vista != "lado" else 7 * k, 8 * k, "piedra", sombra="piedra_s", luz="piedra_l")
    # Grietas, musgo y la runa del pecho, que brilla al atacar
    c.line(cx - 6 * k, cy - 3 * k, cx - 3 * k, cy + 1 * k, "piedra_s")
    c.line(cx + 5 * k, cy + 2 * k, cx + 7 * k, cy + 5 * k, "piedra_s")
    c.ellipse(cx - 5 * k, cy - 6 * k, 3 * k, 1.5 * k, "musgo")
    if vista != "espalda":
        rx = cx if vista == "frente" else cx + 4 * k
        c.poly([(rx, cy - 3 * k), (rx + 2 * k, cy), (rx, cy + 3 * k), (rx - 2 * k, cy)],
               "runa" if anim == "atacar" else "runa_s")
    # Cabeza pequeña hundida entre los hombros
    hx = cx if vista != "lado" else cx + 3 * k
    c.ellipse(hx, cy - 9 * k, 4 * k, 3.5 * k, "piedra", sombra="piedra_s", luz="piedra_l")
    if vista == "frente":
        c.rect(hx - 2.5 * k, cy - 9 * k, hx - 1.5 * k, cy - 8.5 * k, "runa")
        c.rect(hx + 1.5 * k, cy - 9 * k, hx + 2.5 * k, cy - 8.5 * k, "runa")
    elif vista == "lado":
        c.rect(hx + 2 * k, cy - 9 * k, hx + 3 * k, cy - 8.5 * k, "runa")
    # Brazos enormes: hombro y puño; al atacar los alza y los deja caer
    for s, dy in zip(hombros, (pi, pd)):
        ax = cx + s * 10 * k if vista != "lado" else cx + 5 * k
        c.ellipse(ax, cy - 3 * k, 4 * k, 4 * k, "piedra", sombra="piedra_s", luz="piedra_l")
        c.ellipse(ax + (s * 1 * k if vista != "lado" else 3 * k), cy + 6 * k + dy, 4.5 * k, 4 * k,
                  "piedra", sombra="piedra_s", luz="piedra_l")


# ---------------------------------------------------------------- Señor de la Cripta (jefe final)

def _capucha(c, x, y, vista, k, p):
    c.ellipse(x, y, 5 * k, 5 * k, "tunica", sombra="tunica_s", luz="tunica_l")
    if vista != "espalda":
        fx = x if vista == "frente" else x + 2 * k
        c.ellipse(fx, y + 1 * k, 3.2 * k if vista == "frente" else 2.2 * k, 3.5 * k, "cuenca")
        for s in ((-1, 1) if vista == "frente" else (0,)):
            c.put(fx + s * 1.3 * k, y + 0.5 * k, "ojo")
    top = y - 5 * k
    c.poly([(x - 4 * k, top + 2 * k), (x - 4 * k, top - 2 * k), (x - 2 * k, top), (x, top - 3 * k),
            (x + 2 * k, top), (x + 4 * k, top - 2 * k), (x + 4 * k, top + 2 * k)], "oro")
    c.put(x, top - 0.5 * k, "gema")


def _manto(c, cx, hombro, cadera, vista, k, p):
    base = c.t - 2
    hem = [(cx + n * 2 * k, base - (2 * k if n % 2 else 0)) for n in range(5, -6, -1)]
    c.poly([(cx - 5 * k, hombro), (cx + 5 * k, hombro)] + hem, "tunica")
    c.poly([(cx + 1 * k, hombro + 2 * k), (cx + 5 * k, hombro)] + hem[:4], "tunica_s")
    if vista != "espalda":
        c.line(cx, hombro + 2 * k, cx, base - 3 * k, "tunica_l")
        c.rect(cx - 4 * k, cadera - 2 * k, cx + 4 * k, cadera - 1 * k, "oro_s")


def _guadana(c, hx, hy, dx, dy, k, vista, p):
    tx, ty = hx + dx * 10 * k, hy + dy * 10 * k
    _grueso(c, hx - dx * 6 * k, hy - dy * 6 * k, tx, ty, "madera", max(1, round(k)))
    # Hoja curva perpendicular al mango, hacia delante
    nx, ny = -dy, dx
    if nx < 0:
        nx, ny = -nx, -ny
    pts = [(tx, ty), (tx + nx * 4 * k - dx * 1 * k, ty + ny * 4 * k - dy * 1 * k),
           (tx + nx * 8 * k - dx * 4 * k, ty + ny * 8 * k - dy * 4 * k),
           (tx + nx * 3 * k - dx * 2 * k, ty + ny * 3 * k - dy * 2 * k), (tx - dx * 1.5 * k, ty - dy * 1.5 * k)]
    c.poly(pts, "metal")
    c.line(pts[0][0], pts[0][1], pts[2][0], pts[2][1], "metal_l")


def senor_cripta(c, vista, anim, i):
    p = _pose(c, anim, i)
    p["bob"] -= 2  # flota un poco sobre el suelo
    _bipedo(c, vista, p, None, "hueso", _manto, _capucha, _guadana, grosor=(2, 1.5))
