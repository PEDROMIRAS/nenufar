"""Monstruos sin forma humana: limos, murciélago y arañas.

Cada función dibuja una pose en un Lienzo: `vista` es 'frente', 'lado' (mirando a la derecha) o
'espalda'; `anim` es idle, walk, atacar o golpe; `i` el fotograma. El tamaño sale de `c.t`.
"""
import math


def _escala(c):
    return c.t / 32


# ---------------------------------------------------------------- limos

LIMO_POSES = {
    # (ancho, alto, salto) relativos: el limo se aplasta y se estira al moverse
    "idle": [(1.0, 1.0, 0), (1.06, 0.94, 0)],
    "walk": [(1.1, 0.88, 0), (0.92, 1.08, -2), (0.96, 1.04, -3), (1.04, 0.96, -1)],
    "atacar": [(1.16, 0.8, 0), (0.84, 1.2, -4), (1.22, 0.8, 1)],
    "golpe": [(0.94, 1.0, -1)],
}


def limo(c, vista, anim, i, corona=False):
    k = _escala(c)
    sx, sy, dy = LIMO_POSES[anim][i]
    base = c.t - 2
    rx, ry = 11.5 * k * sx, 9.5 * k * sy
    cx, cy = c.t / 2, base - ry + dy * k
    c.ellipse(cx, cy, rx, ry, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
    # Gotas en la base, que se quedan pegadas al suelo.
    c.ellipse(cx - rx * 0.7, base - 1.5 * k, 2.5 * k, 1.8 * k, "cuerpo_s")
    c.ellipse(cx + rx * 0.75, base - 1.2 * k, 2 * k, 1.5 * k, "cuerpo_s")
    c.ellipse(cx - rx * 0.35, cy - ry * 0.45, 2.2 * k, 1.6 * k, "brillo")
    if vista != "espalda":
        desp = 0 if vista == "frente" else rx * 0.35
        sep = rx * 0.38 if vista == "frente" else rx * 0.3
        for ox in (-sep, sep):
            ex = cx + ox + desp
            c.ellipse(ex, cy, 1.8 * k, 2.4 * k, "ojo")
            c.put(ex - 0.5 * k, cy - 1 * k, "brillo")
        if anim == "atacar" and i == 1:
            c.ellipse(cx + desp, cy + ry * 0.45, 3 * k, 1.6 * k, "boca")
        else:
            c.line(cx + desp - 2 * k, cy + ry * 0.4, cx + desp + 2 * k, cy + ry * 0.4, "boca")
    if corona:
        top = cy - ry
        pts = [(cx - 7 * k, top + 2 * k), (cx - 7 * k, top - 4 * k), (cx - 3.5 * k, top - 1 * k),
               (cx, top - 6 * k), (cx + 3.5 * k, top - 1 * k), (cx + 7 * k, top - 4 * k),
               (cx + 7 * k, top + 2 * k)]
        c.poly(pts, "oro")
        c.line(cx - 7 * k, top + 1 * k, cx + 7 * k, top + 1 * k, "oro_s")
        c.put(cx, top - 3 * k, "gema")


# ---------------------------------------------------------------- murciélago

ALAS = {"idle": [-3, 1], "walk": [-6, -1, 4, -1], "atacar": [-7, 3, -2], "golpe": [2]}


def murcielago(c, vista, anim, i):
    k = _escala(c)
    punta = ALAS[anim][i] * k
    # Vuela: el cuerpo va alto y se mece; al atacar se lanza hacia abajo.
    alto = {"idle": [0, 1], "walk": [0, -1, 0, 1], "atacar": [-2, 4, 0], "golpe": [-3]}[anim][i] * k
    cx, cy = c.t / 2, 13 * k + alto
    k *= 1.15  # algo más grande que el resto: si no, en el mapa apenas se ve
    if vista == "lado":
        c.poly([(cx - 1 * k, cy - 2 * k), (cx - 11 * k, cy - 4 * k + punta), (cx - 8 * k, cy + 3 * k),
                (cx - 3 * k, cy + 3 * k)], "ala_s")
        c.ellipse(cx + 1 * k, cy, 5 * k, 5.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        c.poly([(cx + 4 * k, cy - 4 * k), (cx + 6 * k, cy - 9 * k), (cx + 7 * k, cy - 3 * k)], "cuerpo_s")
        c.put(cx + 4 * k, cy - 1 * k, "ojo")
        c.put(cx + 5 * k, cy + 2 * k, "diente")
        c.poly([(cx, cy - 1 * k), (cx + 9 * k, cy - 5 * k + punta), (cx + 7 * k, cy + 2 * k),
                (cx + 2 * k, cy + 3 * k)], "ala")
        return
    for lado in (-1, 1):
        c.poly([(cx + lado * 3 * k, cy - 2 * k), (cx + lado * 14 * k, cy - 3 * k + punta),
                (cx + lado * 12 * k, cy + 2 * k + punta * 0.4), (cx + lado * 9 * k, cy + 1 * k),
                (cx + lado * 6 * k, cy + 4 * k), (cx + lado * 3 * k, cy + 3 * k)], "ala")
        c.line(cx + lado * 4 * k, cy - 1 * k, cx + lado * 12 * k, cy - 1.5 * k + punta * 0.8, "ala_s")
        # Orejas puntiagudas
        c.poly([(cx + lado * 1 * k, cy - 4 * k), (cx + lado * 4 * k, cy - 10 * k),
                (cx + lado * 4.5 * k, cy - 3 * k)], "cuerpo_s")
    c.ellipse(cx, cy, 5 * k, 5.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
    if vista == "frente":
        c.put(cx - 2 * k, cy - 1 * k, "ojo")
        c.put(cx + 2 * k, cy - 1 * k, "ojo")
        c.put(cx - 1 * k, cy + 2 * k, "diente")
        c.put(cx + 1 * k, cy + 2 * k, "diente")


# ---------------------------------------------------------------- arañas

def _patas(c, cx, cy, k, fase, ancho):
    """Cuatro patas por lado, con una curva hacia arriba, que se alternan al andar."""
    for n in range(4):
        # Las de delante apuntan hacia delante y las de detrás hacia atrás, como en una araña de verdad.
        abanico = (n - 1.5) * 2.2 * k
        sube = math.sin(fase + n * math.pi / 2 + (0 if n % 2 else math.pi)) * 1.5 * k
        for lado in (-1, 1):
            x0, y0 = cx + lado * 2.5 * k, cy - 2 * k + n * 1.5 * k
            rodilla = (cx + lado * 9 * k * ancho, y0 - 4 * k + abanico * 0.5 + sube)
            pie = (cx + lado * 14 * k * ancho, y0 + 4 * k + abanico + sube * 0.6)
            c.line(x0, y0, rodilla[0], rodilla[1], "pata")
            c.line(rodilla[0], rodilla[1], pie[0], pie[1], "pata")


def arana(c, vista, anim, i, corona=False):
    k = _escala(c)
    fase = {"idle": [0, 0.6], "walk": [0, 1.6, 3.1, 4.7], "atacar": [0, 0, 0], "golpe": [0]}[anim][i]
    alza = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [2, -3, 0], "golpe": [-2]}[anim][i] * k
    cx, base = c.t / 2, c.t - 4 * k
    cy = base - 9 * k + alza
    ancho = 0.75 if vista == "lado" else 1.0
    _patas(c, cx, cy, k, fase, ancho)
    if vista == "frente":
        c.ellipse(cx, cy - 4 * k, 7 * k, 6 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        c.ellipse(cx, cy + 2 * k, 4.5 * k, 4 * k, "cabeza", sombra="cuerpo_s")
        for ox, oy in ((-1.5, 1), (1.5, 1), (-2.5, 2.5), (2.5, 2.5)):
            c.put(cx + ox * k, cy + oy * k, "ojo")
        # Quelíceros, que se abren al atacar
        abre = 2 * k if anim == "atacar" and i == 1 else 0
        c.line(cx - 1.5 * k - abre, cy + 5 * k, cx - 1 * k, cy + 7 * k, "pata")
        c.line(cx + 1.5 * k + abre, cy + 5 * k, cx + 1 * k, cy + 7 * k, "pata")
    elif vista == "lado":
        c.ellipse(cx - 4 * k, cy - 1 * k, 7 * k, 5.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        c.ellipse(cx + 4.5 * k, cy + 1 * k, 4 * k, 3.5 * k, "cabeza", sombra="cuerpo_s")
        c.put(cx + 6 * k, cy, "ojo")
        c.put(cx + 7 * k, cy + 1 * k, "ojo")
    else:
        c.ellipse(cx, cy + 2 * k, 4 * k, 3.5 * k, "cabeza", sombra="cuerpo_s")
        c.ellipse(cx, cy - 3 * k, 7.5 * k, 6.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        # Marca en el abdomen
        c.poly([(cx, cy - 7 * k), (cx + 2 * k, cy - 3 * k), (cx, cy + 1 * k), (cx - 2 * k, cy - 3 * k)], "marca")
    if corona:
        top = cy - 10 * k if vista != "lado" else cy - 6 * k
        x = cx if vista != "lado" else cx - 4 * k
        c.poly([(x - 5 * k, top + 2 * k), (x - 5 * k, top - 3 * k), (x - 2 * k, top),
                (x, top - 4 * k), (x + 2 * k, top), (x + 5 * k, top - 3 * k), (x + 5 * k, top + 2 * k)], "oro")
        c.put(x, top - 1 * k, "gema")
