"""Monstruos con forma humana (esqueleto, caballero, chamán) y los jefes golem y Señor de la Cripta.

Mismo contrato que criaturas.py: dibujar(c, vista, anim, i). Los bípedos comparten esqueleto de
poses (`_bipedo`); cada uno pone su cabeza, torso y arma.
"""
import math

from criaturas import corona_hierro

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


# ---------------------------------------------------------------- Señor de la Cripta (jefe final)

def _capucha(c, x, y, vista, k, p):
    c.ellipse(x, y, 5 * k, 5 * k, "tunica", sombra="tunica_s", luz="tunica_l")
    if vista != "espalda":
        fx = x if vista == "frente" else x + 2 * k
        c.ellipse(fx, y + 1 * k, 3.2 * k if vista == "frente" else 2.2 * k, 3.5 * k, "cuenca")
        for s in ((-1, 1) if vista == "frente" else (0,)):
            c.put(fx + s * 1.3 * k, y + 0.5 * k, "ojo")
    top = y - 5 * k
    corona_hierro(c, x, top, k, 4)


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


# ---------------------------------------------------------------- lobo

LOBO_BOB = {"idle": [0, 1], "walk": [0, -1, 0, -1], "atacar": [0, 0, 1], "golpe": [0]}
LOBO_PASO = {"idle": [0, 0], "walk": [3, 0, -3, 0], "atacar": [0, 1, 2], "golpe": [0]}
# Zarpa que se lanza al atacar, lunge de la cabeza y mandíbula abierta.
LOBO_ZARPA = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-2, 5, 3], "golpe": [-2]}
LOBO_CABEZA = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 3, 2], "golpe": [-2]}
LOBO_BOCA = {"idle": [0, 0], "walk": [0, 1, 0, 1], "atacar": [1, 3, 2], "golpe": [0]}


def _garras(c, x, y, k, dx=1):
    """Tres garras rojas en la punta de una zarpa."""
    for n in (-1, 0, 1):
        c.put(x + dx * k, y + n * 1.5 * k, "rojo")
        c.put(x + 2 * dx * k, y + n * 1.5 * k, "rojo")


def lobo(c, vista, anim, i):
    k = c.t / 32
    bob = LOBO_BOB[anim][i] * k
    paso = LOBO_PASO[anim][i] * k
    zarpa = LOBO_ZARPA[anim][i] * k
    lunge = LOBO_CABEZA[anim][i] * k
    boca = LOBO_BOCA[anim][i] * k
    base = c.t - 2
    cy = base - 12 * k + bob
    if vista == "lado":
        cx = 13 * k + (lunge if anim == "atacar" else 0)
        # Cola grande y erizada
        c.poly([(cx - 6 * k, cy + 3 * k), (cx - 12 * k, cy + 4 * k), (cx - 15 * k, cy - 2 * k), (cx - 13 * k, cy - 8 * k),
                (cx - 11 * k, cy - 3 * k), (cx - 8 * k, cy - 1 * k)], "pelo_s")
        c.line(cx - 13 * k, cy - 6 * k, cx - 12 * k, cy, "pelo_l")
        # Patas de atrás (digitígradas) y brazo del otro lado
        _grueso(c, cx - 3 * k, cy + 3 * k, cx - 6 * k, cy + 8 * k, "pelo_s", 3 * k)
        _grueso(c, cx - 6 * k, cy + 8 * k, cx - 5 * k - paso, base - 1 * k, "pelo_s", 3 * k)
        _grueso(c, cx - 1 * k, cy + 3 * k, cx - 2 * k + paso * 0.5, cy + 8 * k, "pelo", 3 * k)
        _grueso(c, cx - 2 * k + paso * 0.5, cy + 8 * k, cx + 0 * k + paso, base - 1 * k, "pelo", 3 * k)
        c.rect(cx - 6 * k - paso, base - 1 * k, cx - 3 * k - paso, base, "rojo")
        c.rect(cx - 1 * k + paso, base - 1 * k, cx + 2 * k + paso, base, "rojo")
        # Torso encorvado con la joroba de los hombros
        c.ellipse(cx + 1 * k, cy - 1 * k, 7 * k, 7.5 * k, "pelo", sombra="pelo_s", luz="pelo_l")
        c.ellipse(cx - 3 * k, cy - 5 * k, 6 * k, 5 * k, "pelo", sombra="pelo_s", luz="pelo_l")
        # Cresta de pelo del lomo
        for n in range(5):
            x = cx - 8 * k + n * 2.2 * k
            y = cy - 9 * k - abs(n - 2) * -0.5 * k + n * 0.3 * k
            c.poly([(x - 1.5 * k, y + 3 * k), (x - 3.5 * k, y - 2 * k), (x + 1 * k, y + 1 * k)], "pelo_s")
        # Brazo cercano con garras
        mx, my = cx + 8 * k + zarpa, cy + 3 * k - (zarpa * 0.5)
        _grueso(c, cx + 4 * k, cy - 4 * k, cx + 8 * k, cy, "pelo", 3 * k)
        _grueso(c, cx + 8 * k, cy, mx, my, "pelo", 3 * k)
        _garras(c, mx + 1 * k, my, k)
        # Cabeza de lobo: cráneo, hocico, mandíbula abierta, orejas, ojo rojo
        hx, hy = cx + 6 * k + lunge, cy - 10 * k
        c.ellipse(hx, hy, 5 * k, 4.5 * k, "pelo", sombra="pelo_s", luz="pelo_l")
        c.poly([(hx + 2 * k, hy - 3 * k), (hx + 10 * k, hy - 1 * k), (hx + 10 * k, hy + 1 * k), (hx + 1 * k, hy + 1 * k)], "pelo")
        c.poly([(hx + 1 * k, hy + 1 * k), (hx + 9 * k, hy + 2 * k + boca), (hx + 8 * k, hy + 4 * k + boca),
                (hx + 0 * k, hy + 4 * k)], "pelo_s")
        c.poly([(hx + 1 * k, hy + 1 * k), (hx + 10 * k, hy + 1 * k), (hx + 9 * k, hy + 2 * k + boca)], "rojo")
        for n in range(3):
            c.put(hx + 4 * k + n * 2 * k, hy + 2 * k, "colmillo")
        c.put(hx + 10 * k, hy - 1 * k, "ojo_nariz")
        c.poly([(hx - 3 * k, hy - 3 * k), (hx - 2 * k, hy - 9 * k), (hx + 1 * k, hy - 4 * k)], "pelo_s")
        c.put(hx + 2 * k, hy - 2 * k, "ojo")
        c.put(hx + 3 * k, hy - 2 * k, "ojo")
        return
    cx = c.t / 2
    if vista == "frente":
        for s in (-1, 1):
            _grueso(c, cx + s * 3 * k, cy + 3 * k, cx + s * 4 * k, base - 1 * k, "pelo_s", 3 * k)
            c.rect(cx + s * 4 * k - 1.5 * k, base - 1 * k, cx + s * 4 * k + 1.5 * k, base, "rojo")
            # Brazos colgando con zarpas, que se abren al atacar
            _grueso(c, cx + s * 7 * k, cy - 5 * k, cx + s * (9 + zarpa * 0.4) * k, cy + 5 * k, "pelo", 3 * k)
            _garras(c, cx + s * (9 + zarpa * 0.4) * k, cy + 6 * k, k, 0)
        c.ellipse(cx, cy - 2 * k, 8.5 * k, 8 * k, "pelo", sombra="pelo_s", luz="pelo_l")
        c.ellipse(cx, cy - 7 * k, 9 * k, 4.5 * k, "pelo", luz="pelo_l")
        for n in range(5):
            x = cx - 8 * k + n * 4 * k
            c.poly([(x - 1.5 * k, cy - 8 * k), (x, cy - 12 * k), (x + 1.5 * k, cy - 8 * k)], "pelo_s")
        hy = cy - 10 * k
        c.rect(cx - 3 * k, hy + 3 * k, cx + 3 * k, hy + 6 * k, "pelo_s")
        c.ellipse(cx, hy, 5.5 * k, 5 * k, "pelo", sombra="pelo_s", luz="pelo_l")
        for s in (-1, 1):
            c.poly([(cx + s * 3 * k, hy - 3 * k), (cx + s * 5 * k, hy - 10 * k), (cx + s * 6 * k, hy - 3 * k)], "pelo_s")
            c.put(cx + s * 3 * k, hy - 1 * k, "ojo")
            c.put(cx + s * 2 * k, hy - 1 * k, "ojo")
        c.ellipse(cx, hy + 2 * k, 2.5 * k, 2 * k, "pelo_l")
        c.put(cx, hy + 1 * k, "ojo_nariz")
        c.ellipse(cx, hy + 4 * k, 2 * k, 1.2 * k + boca * 0.3, "rojo")
        c.put(cx - 1.5 * k, hy + 3 * k, "colmillo")
        c.put(cx + 1.5 * k, hy + 3 * k, "colmillo")
        return
    for s in (-1, 1):
        _grueso(c, cx + s * 3 * k, cy + 3 * k, cx + s * 4 * k, base - 1 * k, "pelo_s", 3 * k)
        _grueso(c, cx + s * 7 * k, cy - 5 * k, cx + s * 9 * k, cy + 5 * k, "pelo", 3 * k)
    c.poly([(cx - 3 * k, cy + 4 * k), (cx + 3 * k, cy + 4 * k), (cx + 4 * k, cy + 11 * k), (cx, cy + 12 * k)], "pelo_s")
    c.ellipse(cx, cy - 2 * k, 8.5 * k, 8 * k, "pelo", sombra="pelo_s", luz="pelo_l")
    for n in range(6):
        y = cy - 8 * k + n * 2.4 * k
        c.poly([(cx - 3 * k, y + 2 * k), (cx, y - 1 * k), (cx + 3 * k, y + 2 * k)], "pelo_s")
    c.ellipse(cx, cy - 9 * k, 5 * k, 4.5 * k, "pelo", sombra="pelo_s")
    for s in (-1, 1):
        c.poly([(cx + s * 3 * k, cy - 11 * k), (cx + s * 5 * k, cy - 18 * k), (cx + s * 6 * k, cy - 11 * k)], "pelo_s")
