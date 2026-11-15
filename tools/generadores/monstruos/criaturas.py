"""El murciélago, el único monstruo que aún se dibuja con el Lienzo (no tiene imagen de referencia).

`vista` es 'frente', 'lado' (mirando a la derecha) o 'espalda'; `anim` es idle, walk, atacar o golpe; `i` el
fotograma. El tamaño sale de `c.t`.
"""


def _escala(c):
    return c.t / 32


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
