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


# ---------------------------------------------------------------- jabalí

JABALI_FASE = {"idle": [0, 0], "walk": [0, 1.6, 3.1, 4.7], "atacar": [0, 0, 0], "golpe": [0]}
# Por fotograma: avance del cuerpo, cabeza agachada y altura del cuerpo (en píxeles de 32).
JABALI_AVANCE = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-2, 1, 3], "golpe": [-2]}
JABALI_CABEZA = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [0, 2, 1], "golpe": [-1]}
JABALI_ALTO = {"idle": [0, 1], "walk": [0, -1, 0, -1], "atacar": [0, 1, 0], "golpe": [0]}


def _pata_jabali(c, x, y0, base, lift, k, clave):
    """Pata corta y gruesa con pezuña; `lift` la levanta al andar."""
    c.rect(x, y0, x + 2.5 * k, base - lift - 1 * k, clave)
    c.rect(x, base - lift - 1 * k, x + 2.5 * k, base - lift, "pezuna")


def _melena(c, x0, x1, y_base, altura, k, cuantas, pico_en):
    """Hilera de púas del lomo, inclinadas hacia atrás; las más altas están en los hombros."""
    for n in range(cuantas):
        t = n / (cuantas - 1)
        x = x0 + (x1 - x0) * t
        h = altura * (1 - 0.55 * abs(t - pico_en))
        punta = (x - 3.5 * k, y_base - h)
        c.poly([(x - 2.5 * k, y_base + 2 * k), punta, (x + 2 * k, y_base + 2 * k)], "cuerpo_s")
        c.line(x - 2 * k, y_base + 1 * k, x + 1.5 * k, y_base + 1 * k, "pua")
        c.put(punta[0] + 0.5 * k, punta[1] + 1 * k, "cuerpo_l")
        c.put(punta[0] + 1 * k, punta[1] + 2 * k, "cuerpo")


def _colmillo(c, pts, k):
    """Colmillo curvo de marfil: segmentos gruesos entre los puntos dados."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        c.line(x0, y0, x1, y1, "colmillo", 2)


def jabali(c, vista, anim, i):
    k = _escala(c)
    fase = JABALI_FASE[anim][i]
    av = JABALI_AVANCE[anim][i] * k
    agacha = JABALI_CABEZA[anim][i] * k
    alto = JABALI_ALTO[anim][i] * k
    base = c.t - 2
    cy = base - 9 * k + alto
    lift = [max(0, math.sin(fase + (0 if n % 2 else math.pi))) * 2 * k for n in range(4)]
    if vista == "lado":
        cx = 11 * k + av
        cy -= 1 * k
        # Patas de atrás y de delante (las del otro lado, más oscuras)
        for n, (px, clave) in enumerate(((cx - 6 * k, "cuerpo_s"), (cx + 5 * k, "cuerpo_s"),
                                         (cx - 3 * k, "cuerpo"), (cx + 8 * k, "cuerpo"))):
            _pata_jabali(c, px, cy + 4 * k, base, lift[n], k, clave)
        # Rabo fino con borla
        c.line(cx - 10 * k, cy - 1 * k, cx - 12 * k, cy - 5 * k, "cuerpo_s")
        c.put(cx - 12 * k, cy - 6 * k, "pua")
        # Cuerpo muy redondo
        c.ellipse(cx, cy, 10.5 * k, 8.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        # Melena: hebras largas y claras que caen hacia atrás por todo el lomo
        for n in range(13):
            t = n / 12
            x = cx - 8.5 * k + t * 16 * k
            borde = cy - 8.5 * k * math.sqrt(max(0.05, 1 - ((x - cx) / (10.5 * k)) ** 2))
            largo = (5 + 4 * math.sin(t * math.pi)) * k
            clave = "cuerpo_l" if n % 3 == 0 else ("cuerpo" if n % 3 == 1 else "pua")
            c.line(x + 1 * k, borde + 3 * k, x - 3.5 * k, borde - largo + 3 * k, "pua", 2)
            c.line(x + 1 * k, borde + 2 * k, x - 3 * k, borde - largo + 2 * k, clave)
        # Cabeza baja y redonda con el hocico corto, la boca morada y el colmillo grande
        hx, hy = cx + 10 * k, cy + 2.5 * k + agacha
        c.ellipse(hx, hy, 5.5 * k, 5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        c.ellipse(hx + 4 * k, hy + 1.5 * k, 3 * k, 2.8 * k, "cuerpo_l", sombra="cuerpo")
        c.poly([(hx - 3 * k, hy - 3 * k), (hx - 2.5 * k, hy - 8 * k), (hx, hy - 3.5 * k)], "cuerpo_s")
        c.rect(hx + 0 * k, hy - 2.5 * k, hx + 3 * k, hy - 1.5 * k, "pua")
        c.rect(hx + 1 * k, hy - 1.5 * k, hx + 2 * k, hy - 0.5 * k, "brillo")
        c.put(hx + 2 * k, hy - 1 * k, "ojo")
        c.rect(hx + 6.5 * k, hy + 0.5 * k, hx + 7.5 * k, hy + 1.5 * k, "pezuna")
        boca = 1.5 * k if anim == "atacar" and i == 1 else 0
        c.ellipse(hx + 4 * k, hy + 4.2 * k + boca * 0.5, 3.2 * k, 1.6 * k + boca * 0.5, "boca")
        c.line(hx + 2 * k, hy + 4.2 * k, hx + 6 * k, hy + 4.2 * k, "pua")
        _colmillo(c, [(hx + 2.5 * k, hy + 5 * k), (hx + 6 * k, hy + 4.5 * k), (hx + 8.5 * k, hy + 1.5 * k),
                      (hx + 8.5 * k, hy - 2 * k), (hx + 7 * k, hy - 4.5 * k)], k)
        return
    cx = c.t / 2
    if vista == "frente":
        for n, px in enumerate((cx - 6 * k, cx + 3.5 * k)):
            _pata_jabali(c, px, cy + 3 * k, base, lift[n], k, "cuerpo_s")
        c.ellipse(cx, cy - 1 * k, 10 * k, 7.5 * k, "cuerpo_s")
        _melena(c, cx - 7 * k, cx + 7 * k, cy - 5 * k, 8 * k, k, 6, 0.5)
        c.ellipse(cx, cy + 1 * k + agacha, 7.5 * k, 6.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        for s in (-1, 1):
            c.poly([(cx + s * 6 * k, cy - 3 * k), (cx + s * 8 * k, cy - 8 * k), (cx + s * 3 * k, cy - 5 * k)], "cuerpo_s")
        c.ellipse(cx, cy + 4 * k + agacha, 4 * k, 3 * k, "cuerpo_l", sombra="cuerpo")
        for ox in (-4, 4):
            c.put(cx + ox * k, cy - 1 * k + agacha, "ojo")
            c.put(cx + ox * k - 0.5 * k, cy - 2 * k + agacha, "brillo")
        c.put(cx - 1.5 * k, cy + 4 * k + agacha, "pezuna")
        c.put(cx + 1.5 * k, cy + 4 * k + agacha, "pezuna")
        c.rect(cx - 2 * k, cy + 6.5 * k + agacha, cx + 2 * k, cy + 7 * k + agacha, "boca")
        for s in (-1, 1):
            _colmillo(c, [(cx + s * 3 * k, cy + 6.5 * k + agacha), (cx + s * 6.5 * k, cy + 5.5 * k + agacha),
                          (cx + s * 8 * k, cy + 1.5 * k + agacha), (cx + s * 7.5 * k, cy - 1.5 * k + agacha)], k)
        return
    for n, px in enumerate((cx - 6 * k, cx + 3.5 * k)):
        _pata_jabali(c, px, cy + 3 * k, base, lift[n], k, "cuerpo_s")
    c.ellipse(cx, cy, 10 * k, 7.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
    for n in range(5):
        y = cy - 6 * k + n * 3 * k
        c.poly([(cx - 3 * k, y + 2 * k), (cx, y - 1 * k), (cx + 3 * k, y + 2 * k)], "pua")
        c.put(cx, y, "cuerpo_l")
    for s in (-1, 1):
        c.poly([(cx + s * 7 * k, cy - 3 * k), (cx + s * 8 * k, cy - 8 * k), (cx + s * 4 * k, cy - 5 * k)], "cuerpo_s")
    c.line(cx, cy + 5 * k, cx + 1 * k, cy + 8 * k, "pua")


# ---------------------------------------------------------------- cuervo

CUERVO_ALTO = {"idle": [0, 1], "walk": [0, -2, 0, -2], "atacar": [0, -2, 1], "golpe": [0]}
CUERVO_AVANCE = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [-1, 2, 4], "golpe": [-2]}
CUERVO_ALAS = {"idle": [0, 0], "walk": [0, 1, 0, 1], "atacar": [0, 1, 2], "golpe": [0]}


def _ojo_cuervo(c, x, y, cerrado):
    """Ojo grande y brillante: el único brillo del cuervo."""
    if cerrado:
        c.line(x - 1, y + 1, x + 1, y + 1, "cuerpo_s")
        return
    c.rect(x - 1, y - 1, x + 1, y + 1, "ojo")
    c.put(x - 1, y - 1, "brillo")
    c.put(x, y, "brillo")


def cuervo(c, vista, anim, i):
    k = _escala(c)
    alto = CUERVO_ALTO[anim][i] * k
    av = CUERVO_AVANCE[anim][i] * k
    alas = CUERVO_ALAS[anim][i]
    parpadeo = anim == "idle" and i == 1
    base = c.t - 2
    cy = base - 10 * k + alto
    if vista == "lado":
        cx = 14 * k + av
        # Patas finas con garras, que se levantan al saltar
        for px in (cx - 3 * k, cx + 2 * k):
            c.rect(px, base - 4 * k + min(0, alto), px + 1 * k, base - 1 * k + min(0, alto), "pico")
            c.line(px - 1 * k, base - 1 * k + min(0, alto), px + 2 * k, base - 1 * k + min(0, alto), "pico")
        # Cola
        c.poly([(cx - 7 * k, cy), (cx - 13 * k, cy + 7 * k + alas), (cx - 9 * k, cy + 8 * k), (cx - 4 * k, cy + 5 * k)],
               "cuerpo_s")
        c.ellipse(cx, cy, 8.5 * k, 8 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        # Ala plegada con plumas, y el babero marrón del pecho
        c.poly([(cx - 6 * k, cy - 3 * k - alas), (cx + 3 * k, cy - 1 * k), (cx + 1 * k, cy + 6 * k), (cx - 8 * k, cy + 4 * k)],
               "cuerpo_s")
        for n in range(3):
            c.line(cx - 6 * k + n * 2 * k, cy + 1 * k, cx - 4 * k + n * 2 * k, cy + 5 * k, "cuerpo")
        for n in range(3):
            c.put(cx + 4 * k + n * 1.5 * k, cy + 3 * k + (n % 2) * k, "adorno")
        # Cabeza redonda con plumas de punta, ojo y pico
        hx, hy = cx + 5 * k, cy - 8 * k
        c.ellipse(hx, hy, 6 * k, 5.5 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        for n in range(3):
            c.poly([(hx - 4 * k + n * 2 * k, hy - 4 * k), (hx - 3 * k + n * 2 * k, hy - 8 * k), (hx - 2 * k + n * 2 * k, hy - 4 * k)],
                   "cuerpo_s")
        c.rect(hx - 4 * k, hy - 3 * k, hx - 2 * k, hy - 2 * k, "adorno")
        _ojo_cuervo(c, hx + 2 * k, hy - 1 * k, parpadeo)
        abre = 1 * k if anim == "atacar" and i == 1 else 0
        c.poly([(hx + 5 * k, hy - 1 * k), (hx + 12 * k, hy + 1 * k), (hx + 5 * k, hy + 3 * k)], "pico")
        c.line(hx + 5 * k, hy + 1 * k, hx + 11 * k, hy + 1 * k + abre, "cuerpo_s")
        return
    cx = c.t / 2
    if vista == "frente":
        for px in (cx - 4 * k, cx + 2 * k):
            c.rect(px, base - 4 * k + min(0, alto), px + 1 * k, base - 1 * k + min(0, alto), "pico")
            c.line(px - 1 * k, base - 1 * k + min(0, alto), px + 2 * k, base - 1 * k + min(0, alto), "pico")
        for s in (-1, 1):
            c.ellipse(cx + s * 8 * k, cy + 2 * k, 3.5 * k, 6.5 * k, "cuerpo_s", luz="cuerpo")
            c.poly([(cx + s * 8 * k, cy + 6 * k), (cx + s * 9 * k, cy + 9 * k + alas), (cx + s * 6 * k, cy + 8 * k)], "cuerpo_s")
        c.ellipse(cx, cy + 1 * k, 8.5 * k, 9 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        # Babero marrón en festón
        for n in range(5):
            x = cx - 5 * k + n * 2.5 * k
            c.line(x, cy + 6 * k, x + 1.5 * k, cy + 8 * k, "adorno")
        for s in (-1, 1):
            c.poly([(cx + s * 3 * k, cy - 6 * k), (cx + s * 5 * k, cy - 10 * k), (cx + s * 6 * k, cy - 5 * k)], "cuerpo_s")
        _ojo_cuervo(c, cx - 4 * k, cy - 2 * k, parpadeo)
        _ojo_cuervo(c, cx + 4 * k, cy - 2 * k, parpadeo)
        c.poly([(cx - 2 * k, cy + 1 * k), (cx + 2 * k, cy + 1 * k), (cx, cy + 6 * k)], "pico")
        c.line(cx - 1 * k, cy + 2 * k, cx + 1 * k, cy + 2 * k, "cuerpo_l")
        return
    for px in (cx - 4 * k, cx + 2 * k):
        c.rect(px, base - 4 * k + min(0, alto), px + 1 * k, base - 1 * k + min(0, alto), "pico")
    c.poly([(cx - 3 * k, cy + 6 * k), (cx + 3 * k, cy + 6 * k), (cx + 4 * k, cy + 12 * k), (cx, cy + 13 * k), (cx - 4 * k, cy + 12 * k)],
           "cuerpo_s")
    c.ellipse(cx, cy, 8.5 * k, 9 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
    for s in (-1, 1):
        c.ellipse(cx + s * 4.5 * k, cy + 1 * k, 3.5 * k, 7 * k, "cuerpo_s")
        c.line(cx + s * 4.5 * k, cy - 4 * k, cx + s * 4.5 * k, cy + 6 * k + alas, "cuerpo")
        c.poly([(cx + s * 3 * k, cy - 8 * k), (cx + s * 5 * k, cy - 12 * k), (cx + s * 6 * k, cy - 7 * k)], "cuerpo_s")
