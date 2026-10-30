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


def corona_hierro(c, x, top, k, ancho=5):
    """Corona de hierro oscuro con puntas desiguales y una brasa, nada de oro liso."""
    a = ancho * k
    alturas = [(-1, 4), (-0.45, 8), (0.1, 5), (0.6, 9), (1, 4)]
    pts = [(x - a, top + 2 * k)]
    for n, (f, h) in enumerate(alturas):
        pts.append((x + f * a, top - h * k * 0.8))
        if n < len(alturas) - 1:
            pts.append((x + (f + alturas[n + 1][0]) / 2 * a, top - 0.5 * k))
    pts.append((x + a, top + 2 * k))
    c.poly(pts, "oro")
    c.line(x - a, top + 1 * k, x + a, top + 1 * k, "oro_s")
    c.put(x + 0.1 * a, top - 1 * k, "gema")


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
    if not corona:
        c.ellipse(cx - rx * 0.35, cy - ry * 0.45, 2.2 * k, 1.6 * k, "brillo")
    if vista != "espalda":
        desp = 0 if vista == "frente" else rx * 0.35
        sep = rx * 0.38 if vista == "frente" else rx * 0.3
        for ox in (-sep, sep):
            ex = cx + ox + desp
            if corona:
                # Ojos rasgados con ceño y sin brillo, para que no parezca un muñeco
                s_ = 1 if ox < 0 else -1
                c.line(ex - 2 * k, cy - 1 * k * s_, ex + 2 * k, cy + 1 * k * s_, "ojo")
                c.put(ex + 1 * k * (1 if ox > 0 else -1), cy + 0.5 * k * s_, "gema")
                continue
            c.ellipse(ex, cy, 1.8 * k, 2.4 * k, "ojo")
            c.put(ex - 0.5 * k, cy - 1 * k, "brillo")
        if anim == "atacar" and i == 1:
            c.ellipse(cx + desp, cy + ry * 0.45, 3 * k, 1.6 * k, "boca")
        else:
            c.line(cx + desp - 2 * k, cy + ry * 0.4, cx + desp + 2 * k, cy + ry * 0.4, "boca")
    if corona:
        corona_hierro(c, cx, cy - ry, k, 7)


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
        corona_hierro(c, cx if vista != "lado" else cx - 4 * k, top, k, 5)


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


# ---------------------------------------------------------------- salamandra de brasas

SAL_FASE = {"idle": [0, 0.9], "walk": [0, 1.6, 3.1, 4.7], "atacar": [0, 0, 0], "golpe": [0]}
SAL_AVANCE = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [0, 0, 0], "golpe": [0]}
SAL_BOCA = {"idle": [0, 0], "walk": [0, 0, 0, 0], "atacar": [0, 1, 0.5], "golpe": [0]}
SAL_ALTO = {"idle": [0, 1], "walk": [0, -1, 0, -1], "atacar": [0, -1, 0], "golpe": [1]}


def salamandra(c, vista, anim, i):
    """Salamandra carbonizada: cuerpo negruzco y esbelto con grietas de brasa, lomo de púas, cabeza angulosa
    con cuernos, ojos rasgados y la cola ardiendo. En combate y en el bestiario (vista «frente») se ve de perfil."""
    k = _escala(c)
    fase = SAL_FASE[anim][i]
    avance = SAL_AVANCE[anim][i] * k
    boca = SAL_BOCA[anim][i] * k
    alto = SAL_ALTO[anim][i] * k
    base = c.t - 2
    lift = [max(0, math.sin(fase + (0 if n % 2 else math.pi))) * 2 * k for n in range(4)]
    if vista in ("lado", "frente"):
        tramos = []
        for n in range(15):
            t = n / 14
            x = (5 + t * 12) * k + avance * t
            y = base - 6 * k + alto + math.sin(fase + t * 5) * 1.8 * k * (1 - t * 0.5)
            g = (0.9 + 2.5 * math.sin(min(1.0, t * 1.25) * math.pi / 2)) * k
            tramos.append((x, y, g))
        # Patas largas y finas, abiertas hacia fuera, con tres garras
        for n, idx in enumerate((4, 6, 9, 11)):
            x, y, g = tramos[idx]
            col = "cuerpo_s" if n % 2 == 0 else "cuerpo"
            pie = base - lift[n]
            rodilla = (x + (1 if n < 2 else -0.5) * 2.5 * k * (-1 if n < 2 else 1), y + g + 1.5 * k)
            c.line(x, y + g * 0.4, rodilla[0], rodilla[1], col)
            c.line(rodilla[0], rodilla[1], x + (-1 if n < 2 else 1) * 1 * k, pie, col)
            for dx in (-1, 0, 1):
                c.put(x + (-1 if n < 2 else 1) * 1 * k + dx * k, pie, "diente")
        # Cola ardiendo (se dibuja primero: va detrás)
        x, y, g = tramos[0]
        alta = 3 + int(round(1.5 * math.sin(fase * 2 + 1)))
        c.poly([(x - 1 * k, y), (x - 3 * k, y - 2 * k), (x - 2 * k, y - (alta + 1) * k), (x, y - 2.5 * k)], "brasa")
        c.poly([(x - 1 * k, y - 0.5 * k), (x - 2 * k, y - 2 * k), (x - 1.5 * k, y - alta * k)], "brasa_l")
        for x, y, g in tramos:
            c.ellipse(x, y, 2.3 * k, g, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
        # Lomo de púas con la punta al rojo, y las grietas de brasa por el costado
        for n in range(2, 13):
            x, y, g = tramos[n]
            punta = 1.8 + (n % 2) * 0.9
            c.poly([(x - 1 * k, y - g + 0.5 * k), (x, y - g - punta * k), (x + 1 * k, y - g + 0.5 * k)], "cuerpo_s")
            c.put(x, y - g - (punta - 0.3) * k, "brasa")
        for n in range(3, 13, 2):
            x, y, g = tramos[n]
            c.put(x - 0.5 * k, y + g * 0.1, "brasa")
            c.put(x + 0.5 * k, y + g * 0.45, "brasa_l")
        # Cabeza de cuña con cuernos, ojo rasgado, dientes y la boca que se abre al atacar
        x, y, g = tramos[-1]
        hx, hy = x + 2.5 * k, y - 0.3 * k
        c.poly([(hx - 4 * k, hy - 2.5 * k), (hx + 3 * k, hy - 3 * k), (hx + 9.5 * k, hy - 0.5 * k),
                (hx + 9.5 * k, hy + 0.8 * k), (hx + 2 * k, hy + 2.5 * k), (hx - 4 * k, hy + 2 * k)], "cuerpo")
        c.poly([(hx - 3 * k, hy + 0.5 * k), (hx + 9 * k, hy + 0.8 * k), (hx + 2 * k, hy + 2.5 * k), (hx - 4 * k, hy + 2 * k)],
               "cuerpo_s")
        c.poly([(hx - 3.5 * k, hy - 2.5 * k), (hx - 7.5 * k, hy - 5.5 * k), (hx - 1 * k, hy - 3 * k)], "cuerpo_s")
        c.put(hx - 7 * k, hy - 5 * k, "brasa")
        c.line(hx, hy - 2.2 * k, hx + 4 * k, hy - 1.7 * k, "cuerpo_s")
        c.put(hx + 2 * k, hy - 1.2 * k, "brasa_l")
        c.put(hx + 3 * k, hy - 1.2 * k, "brasa")
        if boca > 0:
            c.poly([(hx + 1.5 * k, hy + 0.8 * k), (hx + 9 * k, hy + 0.8 * k), (hx + 8 * k, hy + 3.5 * k + boca * 2),
                    (hx + 0.5 * k, hy + 3 * k + boca)], "cuerpo_s")
            c.poly([(hx + 2.5 * k, hy + 1 * k), (hx + 8 * k, hy + 1 * k), (hx + 7 * k, hy + 3 * k + boca)], "boca")
            c.put(hx + 5 * k, hy + 2 * k, "brasa")
            for dx in (3, 5, 7):
                c.put(hx + dx * k, hy + 1.2 * k, "diente")
                c.put(hx + (dx - 0.5) * k, hy + 3 * k + boca, "diente")
        else:
            c.line(hx + 1.5 * k, hy + 0.8 * k, hx + 9 * k, hy + 0.5 * k, "boca")
            for dx in (3, 5, 7):
                c.put(hx + dx * k, hy + 1.3 * k, "diente")
        return
    cx = c.t / 2
    # Espalda: lomo con púas y grietas de brasa, y la cola ardiendo abajo
    c.ellipse(cx, base - 11 * k + alto, 5 * k, 10 * k, "cuerpo", sombra="cuerpo_s", luz="cuerpo_l")
    for n in range(6):
        y = base - 19 * k + n * 3 * k + alto
        c.poly([(cx - 2 * k, y + 1.5 * k), (cx, y - 1.5 * k), (cx + 2 * k, y + 1.5 * k)], "cuerpo_s")
        c.put(cx, y - 1 * k, "brasa")
    c.ellipse(cx, base - 21 * k + alto, 4 * k, 3 * k, "cuerpo", sombra="cuerpo_s")
    c.poly([(cx - 1.5 * k, base - 1 * k), (cx, base - 4 * k - fase % 2 * k), (cx + 1.5 * k, base - 1 * k)], "brasa_l")
