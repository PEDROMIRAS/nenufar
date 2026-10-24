"""Árbol maldito (48x48), jefe violeta del Bosque. Un árbol viejo y vivo, de copa frondosa, con una
cara furiosa en el tronco: cejas de corteza, ojos ámbar que arden, una boca enorme llena de
astillas como colmillos, ramas que acaban en garras y raíces azuladas que se agarran al suelo.
Lento y muy resistente: atrapa con las raíces. (Concepto de Pedro, 2026-10-25.)

Como los demás jefes, cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: la copa se mece), walk (4: no anda, se mece), atacar (3: alza las garras,
las descarga y vuelve) y golpe (1, destello)."""
import numpy as np
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow, rng

S = 48
HOJA = [(22, 58, 42), (34, 90, 52), (56, 132, 58), (98, 178, 74), (164, 218, 104)]
CORTEZA = [(58, 34, 34), (92, 58, 52), (128, 86, 72), (164, 120, 96), (196, 156, 124)]
RAIZ = [(36, 40, 66), (56, 62, 94), (82, 90, 124)]
GARRA = [(70, 44, 40), (120, 82, 68), (176, 136, 108)]
OJO = [(150, 70, 20), (240, 158, 40), (255, 232, 130)]
BOCA = [(14, 6, 8), (34, 14, 18), (62, 26, 30)]
COLMILLO = [(170, 136, 104), (228, 200, 160)]
LIANA = [(44, 110, 52), (86, 156, 70)]
OUT = (26, 14, 18)

# Brazos (rama de la izquierda de la imagen): hombro, codo, mano y hacia dónde abren las garras.
BRAZOS = {
    "reposo": ((16, 25), (9, 23), (5, 29), (0, 1)),
    "alza": ((16, 23), (8, 22), (3, 17), (0, -1)),
    "golpe": ((16, 26), (10, 31), (12, 38), (1, 1)),
}


def garras(t, mano, d):
    """Tres dedos curvos de rama, con la punta clara."""
    dx, dy = d
    for k, (sx, sy) in enumerate(((-2, 0), (0, 1), (2, 0)) if dy else ((0, -2), (1, 0), (0, 2))):
        x0, y0 = mano[0] + sx * 0.7, mano[1] + sy * 0.7
        medio = (x0 + dx * 2 + sx * 0.6, y0 + dy * 2 + sy * 0.4)
        fin = (medio[0] + dx * 1.5 + (1 if dy else 0) * (k - 1), medio[1] + dy * 1.5 + (0 if dy else 1))
        limb(t, (x0, y0), medio, 1.0, 0.7, GARRA)
        line(t, *medio, *fin, GARRA[1])
        put(t, round(fin[0]), round(fin[1]), GARRA[2])


def copa(t, mece):
    """Copa frondosa: matas de hojas, cada una con su luz arriba y su sombra abajo; las de delante
    (más bajas) se dibujan después y tapan a las de atrás. Entre ellas asoman ramas."""
    for (x0, y0), (x1, y1) in (((21, 16), (16, 9)), ((27, 16), (32, 9)), ((24, 16), (24, 6))):
        limb(t, (x0, y0), (x1 + mece, y1), 1.6, 0.8, CORTEZA, bias=-0.1)
    matas = [  # (centro, radios) de atrás adelante
        ((24, 5), (6, 3.5)), ((16, 7), (5.5, 4)), ((32, 7), (5.5, 4)), ((9, 12), (5, 4)),
        ((39, 12), (5, 4)), ((20, 10), (6, 4)), ((29, 10), (6, 4)), ((13, 15), (6, 4)),
        ((35, 15), (6, 4)), ((24, 14), (6.5, 4)), ((18, 17), (5, 3)), ((30, 17), (5, 3)),
    ]
    g = rng(5)
    for k, ((cx, cy), (rx, ry)) in enumerate(matas):
        m = ell_mask(t, cx + (mece if cy < 12 else 0), cy, rx, ry)
        shade(t, m, HOJA[:4], bias=0.05 * (k % 3 - 1))
        # borde de abajo oscuro: separa cada mata de la que tiene detrás
        abajo = np.zeros_like(m); abajo[:-1, :] = m[1:, :]
        t[m & ~abajo] = (*HOJA[0], 255)
        ys, xs = m.nonzero()
        for _ in range(max(2, len(xs) // 14)):  # hojitas en «v», claras en la mitad de arriba
            i = g.randrange(len(xs))
            x, y = xs[i], ys[i]
            if y < cy and m[y + 1, x]:
                put(t, x, y, HOJA[4]); put(t, x - 1, y - 1, HOJA[3]); put(t, x + 1, y - 1, HOJA[3])


def dibujar(brazos="reposo", mece=0, ojos=1.0, inclina=0, raices=0):
    t = tile(S, S)
    ox = inclina
    # raíces azuladas que se agarran al suelo (en el ataque, las de los lados se levantan)
    for (x1, y1), w in (((5, 45), 1.8), ((12, 47), 1.6), ((36, 47), 1.6), ((43, 45), 1.8), ((22, 47), 1.4)):
        if raices and x1 in (5, 43):
            y1 -= 3
        borde = (16 if x1 < 24 else 32) if x1 != 22 else 22
        medio = ((borde + x1) / 2 + ox * 0.5, 43)
        limb(t, (borde + ox, 41), medio, w + 0.6, w, RAIZ, bias=-0.1)
        limb(t, medio, (x1, y1), w, 0.6, RAIZ, bias=-0.15)
    # tronco ancho, que se abre hacia la base
    tronco = [(14, 44), (34, 44), (31, 36), (32, 24), (30, 15), (18, 15), (16, 24), (17, 36)]
    m = poly_mask(t, [(x + ox * (44 - y) / 30, y) for x, y in tronco])
    shade(t, m, CORTEZA, bias=0.05)
    ys, xs = m.nonzero()
    for y, x in zip(ys, xs):  # surcos de la corteza
        if (x * 5 + (y // 3) * 2) % 9 == 0:
            t[y, x] = (*CORTEZA[1], 255)
    # brazos de rama con garras
    for lado in (0, 1):
        hombro, codo, mano, d = BRAZOS[brazos]
        tr = (lambda p: (47 - p[0] + ox, p[1])) if lado else (lambda p: (p[0] + ox, p[1]))
        limb(t, tr(hombro), tr(codo), 2.8, 2.0, CORTEZA, bias=0.05 if lado else 0.15)
        limb(t, tr(codo), tr(mano), 2.0, 1.3, CORTEZA, bias=0.0)
        garras(t, tr(mano), (-d[0], d[1]) if lado else d)
    copa(t, mece)
    outline(t, OUT)
    # cara: cejas fruncidas, cuencas con ojos ámbar, nariz y boca enorme con colmillos de astilla
    for lado in (-1, 1):
        cx = 24 + ox + 5 * lado
        line(t, cx - 3 * lado, 20, cx + 2 * lado, 22, CORTEZA[0])  # ceja hacia el centro y abajo
        line(t, cx - 3 * lado, 19, cx + 2 * lado, 21, CORTEZA[4])
        hueco = ell_mask(t, cx, 24, 2.6, 1.8)
        t[hueco] = (*BOCA[1], 255)
        c = OJO[2] if ojos > 0.8 else (OJO[1] if ojos > 0.4 else OJO[0])
        put(t, cx, 24, c); put(t, cx - lado, 24, OJO[1] if ojos > 0.4 else OJO[0])
        put(t, cx, 23, OJO[1] if ojos > 0.8 else OJO[0])
    line(t, 24 + ox, 25, 24 + ox, 27, CORTEZA[3])
    put(t, 23 + ox, 28, CORTEZA[0]); put(t, 25 + ox, 28, CORTEZA[0])
    abre = 2 if brazos == "golpe" else (1 if brazos == "alza" else 0)
    boca = poly_mask(t, [(17 + ox, 30), (31 + ox, 30), (29 + ox, 37 + abre), (19 + ox, 37 + abre)])
    shade(t, boca, BOCA, bias=-0.1, rim=False)
    for x in range(18, 31, 2):  # colmillos arriba y abajo
        put(t, x + ox, 30, COLMILLO[1]); put(t, x + ox, 31, COLMILLO[0])
        if 19 <= x <= 29:
            put(t, x + 1 + ox, 36 + abre, COLMILLO[0]); put(t, x + 1 + ox, 37 + abre, COLMILLO[1])
    # lianas sobre las raíces
    for x, y in ((9, 43), (10, 44), (38, 43), (37, 44), (22, 44), (26, 45)):
        if t[y, x, 3]:
            put(t, x, y, LIANA[(x + y) % 2])
    ground_shadow(t, S // 2, S - 2, 20, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. No anda: todas las filas lo muestran de frente."""
    if anim == "idle":
        return dibujar(mece=[0, 1][i], ojos=[0.7, 1.0][i])
    if anim == "walk":
        return dibujar(mece=[0, 1, 1, 0][i], ojos=[0.7, 0.9, 1.0, 0.9][i])
    if anim == "atacar":
        return [lambda: dibujar("alza", ojos=1.0, raices=1),
                lambda: dibujar("golpe", inclina=1, ojos=1.0, raices=1),
                lambda: dibujar("reposo", ojos=0.9)][i]()
    return dibujar(inclina=-1, ojos=0.2)
