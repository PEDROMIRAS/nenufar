"""Caballero maldito (48x48), jefe violeta de las Ruinas. Un guardián de la Orden dentro de una
armadura completa que ya no se quita: acero ennegrecido, capa roja hecha jirones y un espadón.
Por la rendija del yelmo sale la luz violeta de la maldición. Pesado y defensivo: pega fuerte y
despacio. Distinto del Caballero oscuro de la Cripta (azul, con pluma y espada corta).

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira apoyado en el espadón), walk (4: no anda), atacar (3: alza el
espadón a un lado, lo descarga en diagonal y vuelve) y golpe (1, destello)."""
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow

S = 48
ACERO = [(28, 30, 38), (52, 56, 68), (82, 88, 104), (120, 128, 146), (168, 176, 192)]
CAPA = [(62, 14, 20), (100, 24, 30), (140, 40, 42), (178, 66, 60)]
HOJA = [(96, 100, 116), (170, 176, 192), (226, 232, 242)]
ORO = [(120, 84, 34), (196, 150, 64)]
GLOW = [(96, 50, 150), (176, 124, 255), (236, 214, 255)]
OUT = (16, 14, 20)


def espada(t, empunadura, punta):
    """Espadón de la empuñadura (manos) a la punta: hoja ancha, guarda dorada y pomo."""
    (x0, y0), (x1, y1) = empunadura, punta
    dx, dy = x1 - x0, y1 - y0
    ln = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / ln, dy / ln
    base = (x0 + ux * 3, y0 + uy * 3)
    limb(t, base, punta, 1.8, 0.6, HOJA, bias=0.1)
    line(t, base[0], base[1], x1 - ux, y1 - uy, HOJA[2])  # filo brillante
    gx, gy = -uy * 4, ux * 4
    line(t, base[0] - gx, base[1] - gy, base[0] + gx, base[1] + gy, ORO[1], w=2)
    put(t, round(x0 - ux * 2), round(y0 - uy * 2), ORO[0])


def dibujar(pose="reposo", respira=0, ojos=1.0, inclina=0):
    t = tile(S, S)
    b = respira
    ox = inclina
    # capa por detrás, con el borde roto
    bajo = [(38, 44), (35, 42), (32, 45), (28, 43), (24, 45), (20, 43), (16, 45), (13, 42), (10, 44)]
    shade(t, poly_mask(t, [(14 + ox, 16 + b), (34 + ox, 16 + b)] + [(x + ox, y) for x, y in bajo]), CAPA, bias=-0.1)
    # piernas y escarpes
    for x in (18, 25):
        shade(t, poly_mask(t, [(x, 33), (x + 5, 33), (x + 5, 44), (x, 44)]), ACERO, bias=-0.05)
        shade(t, poly_mask(t, [(x - 1, 43), (x + 6, 43), (x + 6, 46), (x - 1, 46)]), ACERO, bias=-0.2)
    # coraza, faldar y cinto
    shade(t, poly_mask(t, [(16 + ox, 31 + b), (32 + ox, 31 + b), (34 + ox, 37 + b), (14 + ox, 37 + b)]), ACERO, bias=-0.1)
    shade(t, poly_mask(t, [(15 + ox, 17 + b), (33 + ox, 17 + b), (31 + ox, 32 + b), (17 + ox, 32 + b)]), ACERO, bias=0.1)
    line(t, 17 + ox, 31 + b, 31 + ox, 31 + b, ORO[0])
    line(t, 24 + ox, 19 + b, 24 + ox, 29 + b, ACERO[1])
    # yelmo con cimera
    shade(t, ell_mask(t, 24 + ox, 11 + b, 5.2, 6.2), ACERO, bias=0.15)
    limb(t, (24 + ox, 6 + b), (24 + ox, 3 + b), 1.2, 0.8, CAPA, bias=0.2)
    # hombreras
    for x in (13, 35):
        shade(t, ell_mask(t, x + ox, 18 + b, 5.5, 4.2), ACERO, bias=0.2 if x < 24 else 0.0)
    # brazos y espadón según la pose
    if pose == "reposo":  # apoyado en el espadón, la punta en el suelo
        manos = (24 + ox, 27 + b)
        for x in (13, 35):
            limb(t, (x + ox, 21 + b), manos, 2.4, 2.0, ACERO, bias=0.05)
        espada(t, manos, (24 + ox, 46))
    elif pose == "alza":  # el espadón en alto, a un lado
        manos = (36 + ox, 13 + b)
        limb(t, (13 + ox, 21 + b), manos, 2.4, 2.0, ACERO, bias=0.1)
        limb(t, (35 + ox, 21 + b), manos, 2.4, 2.0, ACERO, bias=0.0)
        espada(t, manos, (46, 2))
    else:  # golpe: la hoja baja en diagonal
        manos = (30 + ox, 30 + b)
        limb(t, (13 + ox, 21 + b), manos, 2.4, 2.0, ACERO, bias=0.1)
        limb(t, (35 + ox, 21 + b), manos, 2.4, 2.0, ACERO, bias=0.0)
        espada(t, manos, (46, 45))
    outline(t, OUT)
    # rendija del yelmo con la luz de la maldición (sin contorno: brilla)
    y = 11 + b
    c = GLOW[2] if ojos > 0.8 else (GLOW[1] if ojos > 0.4 else GLOW[0])
    line(t, 20 + ox, y, 28 + ox, y, (10, 8, 14))
    for x in (22, 26):
        put(t, x + ox, y, c)
        put(t, x + ox + 1, y, GLOW[1] if ojos > 0.4 else GLOW[0])
    ground_shadow(t, S // 2, S - 2, 15, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. No anda: todas las filas lo muestran de frente."""
    if anim == "idle":
        return dibujar(respira=[0, 1][i], ojos=[0.7, 1.0][i])
    if anim == "walk":
        return dibujar(respira=[0, 0, 1, 1][i], ojos=[0.7, 0.9, 1.0, 0.9][i])
    if anim == "atacar":
        return [lambda: dibujar("alza", ojos=1.0),
                lambda: dibujar("golpe", inclina=1, ojos=1.0),
                lambda: dibujar(ojos=0.9)][i]()
    return dibujar(inclina=-1, ojos=0.2)
