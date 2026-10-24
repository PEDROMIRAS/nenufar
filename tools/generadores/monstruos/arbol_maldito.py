"""Árbol maldito (48x48), jefe violeta del Bosque. Un árbol muerto con cara: dos cuencas que brillan
con la luz violeta de la maldición, una boca de corteza rota, ramas como garras y raíces que se
agarran al suelo. Lento y muy resistente: atrapa con las raíces.

Como los demás jefes, cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: se mece), walk (4: no anda, se mece), atacar (3: alza las garras, las
descarga y vuelve) y golpe (1, destello)."""
import numpy as np
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow

S = 48
BARK = [(38, 26, 22), (62, 42, 32), (90, 64, 44), (122, 90, 60), (154, 120, 82)]
TWIG = [(34, 24, 22), (56, 40, 32), (84, 60, 44), (112, 84, 58)]
MOSS = [(60, 86, 44), (92, 124, 60)]
GLOW = [(96, 50, 150), (176, 124, 255), (236, 214, 255)]  # la maldición, en violeta
HOLE = (18, 10, 16)
OUT = (24, 16, 18)

# Brazos (rama izquierda de la imagen): hombro, codo, mano y hacia dónde abren las garras.
BRAZOS = {
    "reposo": ((17, 19), (9, 17), (6, 27), (0, 1)),
    "alza": ((17, 18), (9, 11), (8, 3), (0, -1)),
    "golpe": ((17, 20), (10, 25), (15, 34), (1, 1)),
}


def garras(t, mano, d, color):
    dx, dy = d
    for sx, sy in ((-2, 0), (0, 1), (2, 0)) if dy else ((0, -2), (1, 0), (0, 2)):
        x0, y0 = mano[0] + sx * 0.6, mano[1] + sy * 0.6
        fin = (x0 + dx * 3 + sx, y0 + dy * 3 + sy * 0.5)
        line(t, x0, y0, *fin, TWIG[1])
        put(t, round(fin[0]), round(fin[1]), color)


def dibujar(brazos="reposo", mece=0, ojos=1.0, inclina=0, raices=0):
    t = tile(S, S)
    ox = inclina
    # raíces que se agarran al suelo (en el ataque, alguna se levanta)
    for (x1, y1), w in (((5, 46), 2.4), ((13, 47), 2.0), ((35, 47), 2.0), ((43, 46), 2.4)):
        if raices and x1 in (5, 43):
            y1 -= 3
        limb(t, (24 + (x1 - 24) * 0.25 + ox, 41), (x1 + ox * 0.5, y1), w + 1, 0.8, BARK, bias=-0.1)
    # copa muerta: ramas finas hacia arriba
    for (x0, y0), (x1, y1) in (((21, 13), (15, 5)), ((24, 12), (24, 3)), ((27, 13), (33, 5)),
                               ((16, 8), (12, 6)), ((32, 8), (37, 7))):
        limb(t, (x0 + ox, y0 + mece), (x1 + ox + mece, y1 + mece), 1.3, 0.5, TWIG, bias=0.1)
    # tronco
    tronco = [(15, 45), (33, 45), (31, 35), (32, 22), (29, 11), (19, 11), (16, 22), (17, 35)]
    m = poly_mask(t, [(x + ox * (45 - y) / 34, y + (mece if y < 30 else 0)) for x, y in tronco])
    shade(t, m, BARK, bias=0.0)
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):  # vetas de la corteza
        if (x * 3 + y // 4) % 7 == 0:
            t[y, x] = (*BARK[1], 255)
    # brazos-rama con garras
    for lado in (0, 1):
        hombro, codo, mano, d = BRAZOS[brazos]
        tr = (lambda p: (47 - p[0] + ox, p[1] + mece)) if lado else (lambda p: (p[0] + ox, p[1] + mece))
        limb(t, tr(hombro), tr(codo), 2.6, 1.8, TWIG, bias=0.05 if lado else 0.15)
        limb(t, tr(codo), tr(mano), 1.8, 1.0, TWIG, bias=0.0)
        garras(t, tr(mano), (-d[0], d[1]) if lado else d, GLOW[1] if brazos != "reposo" else TWIG[3])
    # musgo sobre los hombros del tronco
    for x in range(17, 31):
        if (x * 5) % 3:
            put(t, x + ox, 12 + mece + (x % 2), MOSS[x % 2])
    outline(t, OUT)
    # cara: cuencas que brillan y boca de corteza rota (sin contorno: es hueco)
    cy = 22 + mece
    for ex in (20, 28):
        hueco = ell_mask(t, ex + ox, cy, 2.6, 2.1)
        t[hueco] = (*HOLE, 255)
        c = GLOW[2] if ojos > 0.8 else (GLOW[1] if ojos > 0.4 else GLOW[0])
        put(t, ex + ox, cy, c)
        put(t, ex + ox - 1, cy, GLOW[1] if ojos > 0.4 else GLOW[0])
    boca = poly_mask(t, [(19 + ox, 29 + mece), (29 + ox, 29 + mece), (27 + ox, 35 + mece), (21 + ox, 35 + mece)])
    t[boca] = (*HOLE, 255)
    for i, x in enumerate(range(20, 29, 2)):  # astillas como dientes
        put(t, x + ox, 29 + mece + (i % 2), BARK[3])
        put(t, x + ox + 1, 35 + mece - (i % 2), BARK[2])
    if ojos > 0.8:
        put(t, 24 + ox, 32 + mece, GLOW[0])
    ground_shadow(t, S // 2, S - 2, 18, 2)
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
