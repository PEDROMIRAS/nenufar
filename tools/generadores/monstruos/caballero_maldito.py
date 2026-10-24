"""Caballero maldito (48x48), jefe violeta de las Ruinas. Un guardián de la Orden dentro de una
armadura de placas negra que ya no puede quitarse: yelmo con cuernos y la rendija encendida,
hombreras con púas, filos dorados gastados y grietas por las que se escapa la luz violeta de la
maldición. Capa roja hecha jirones y un espadón que sostiene en guardia, en diagonal. Pesado y
defensivo: pega fuerte y despacio. Distinto del Caballero oscuro de la Cripta (azul, con pluma).

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira en guardia), walk (4: no anda), atacar (3: alza el espadón por
encima de la cabeza, lo descarga hasta el suelo y vuelve) y golpe (1, destello)."""
import numpy as np
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow

S = 48
ACERO = [(18, 18, 26), (36, 36, 48), (58, 58, 74), (88, 88, 108), (130, 130, 152)]
CAPA = [(58, 10, 18), (96, 20, 28), (138, 34, 40), (176, 60, 58)]
ORO = [(110, 76, 30), (178, 134, 58), (226, 190, 110)]
HOJA = [(92, 98, 116), (158, 166, 184), (222, 228, 240)]
CUERNO = [(60, 52, 46), (120, 108, 92), (184, 172, 150)]
GLOW = [(96, 50, 150), (176, 124, 255), (236, 214, 255)]
OUT = (10, 8, 14)


def placa(t, pts, bias=0.0):
    """Una placa de armadura: sombreada, con el filo de arriba dorado."""
    m = poly_mask(t, pts)
    shade(t, m, ACERO, bias=bias)
    arriba = np.zeros_like(m); arriba[1:, :] = m[:-1, :]
    t[m & ~arriba] = (*ORO[1], 255)
    return m


def espadon(t, mano, punta, brillo=False):
    """Espadón desde las manos hasta la punta: hoja ancha con filo claro, guarda dorada y pomo."""
    (x0, y0), (x1, y1) = mano, punta
    ln = max(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5, 1)
    ux, uy = (x1 - x0) / ln, (y1 - y0) / ln
    base = (x0 + ux * 3, y0 + uy * 3)
    limb(t, base, punta, 2.0, 0.5, HOJA, bias=0.15)
    line(t, base[0] - uy, base[1] + ux, x1 - ux * 2, y1 - uy * 2, HOJA[2])
    if brillo:  # la maldición recorre el filo
        line(t, base[0] + uy * 0.5, base[1] - ux * 0.5, x1 - ux * 3, y1 - uy * 3, GLOW[1])
    gx, gy = -uy * 4.5, ux * 4.5
    line(t, base[0] - gx, base[1] - gy, base[0] + gx, base[1] + gy, ORO[1], w=2)
    put(t, round(base[0] - gx), round(base[1] - gy), ORO[2])
    put(t, round(x0 - ux * 2), round(y0 - uy * 2), ORO[2])  # pomo


def dibujar(pose="guardia", respira=0, ojos=1.0, inclina=0):
    t = tile(S, S)
    b, ox = respira, inclina
    # capa por detrás, ancha y rota por abajo
    bajo = [(40, 45), (37, 41), (34, 46), (30, 42), (26, 46), (21, 42), (17, 46), (13, 41), (9, 45)]
    shade(t, poly_mask(t, [(13 + ox, 15 + b), (35 + ox, 15 + b)] + bajo), CAPA, bias=-0.15)
    # piernas: grebas y escarpes puntiagudos
    for x in (17, 26):
        placa(t, [(x, 33), (x + 6, 33), (x + 6, 43), (x, 43)], bias=-0.05)
        placa(t, [(x - 2, 42), (x + 6, 42), (x + 7, 46), (x - 2, 46)], bias=-0.25)
        shade(t, ell_mask(t, x + 3, 37, 2.2, 1.6), ACERO, bias=0.3)  # rodillera
    # faldar de malla y coraza
    falda = poly_mask(t, [(15 + ox, 30 + b), (33 + ox, 30 + b), (35 + ox, 36 + b), (13 + ox, 36 + b)])
    shade(t, falda, ACERO, bias=-0.15)
    ys, xs = falda.nonzero()
    for y, x in zip(ys, xs):
        if (x + y) % 2 == 0:
            t[y, x] = (*ACERO[1], 255)
    pecho = placa(t, [(16 + ox, 16 + b), (32 + ox, 16 + b), (30 + ox, 30 + b), (18 + ox, 30 + b)], bias=0.1)
    line(t, 24 + ox, 18 + b, 24 + ox, 28 + b, ACERO[1])
    line(t, 16 + ox, 30 + b, 32 + ox, 30 + b, ORO[0])
    # grietas de la maldición en el pecho
    for (x0, y0), (x1, y1) in (((20, 20), (22, 24)), ((22, 24), (21, 27)), ((28, 19), (27, 23))):
        line(t, x0 + ox, y0 + b, x1 + ox, y1 + b, GLOW[1] if ojos > 0.4 else GLOW[0])
    # yelmo cerrado con cuernos curvos
    for lado in (-1, 1):
        cx = 24 + ox + 4 * lado
        limb(t, (cx, 7 + b), (cx + 4 * lado, 4 + b), 1.4, 1.0, CUERNO, bias=0.1)
        limb(t, (cx + 4 * lado, 4 + b), (cx + 5 * lado, 7 + b), 1.0, 0.3, CUERNO, bias=0.1)
    yelmo = ell_mask(t, 24 + ox, 11 + b, 5.8, 6.2) | poly_mask(t, [(19 + ox, 11 + b), (29 + ox, 11 + b), (28 + ox, 17 + b), (20 + ox, 17 + b)])
    shade(t, yelmo, ACERO, bias=0.2)
    # hombreras con púas
    for lado in (-1, 1):
        cx = 24 + ox + 10 * lado
        limb(t, (cx + 2 * lado, 16 + b), (cx + 8 * lado, 13 + b), 1.8, 0.3, ACERO, bias=0.3)
        m = ell_mask(t, cx, 18 + b, 5.5, 4.2)
        shade(t, m, ACERO, bias=0.2 if lado < 0 else 0.0)
        abajo = np.zeros_like(m); abajo[:-1, :] = m[1:, :]
        t[m & ~abajo] = (*ORO[1], 255)
    # brazos y espadón según la pose
    hombros = ((15 + ox, 21 + b), (33 + ox, 21 + b))
    if pose == "guardia":  # en diagonal hacia delante y arriba, a la izquierda
        manos, punta, brillo = (21 + ox, 31 + b), (4, 9), False
    elif pose == "alza":  # por encima de la cabeza, hacia atrás
        manos, punta, brillo = (28 + ox, 9 + b), (45, 5), True
    else:  # golpe: hasta el suelo, delante
        manos, punta, brillo = (19 + ox, 30 + b), (3, 45), True
    if pose == "alza":
        espadon(t, manos, punta, brillo)
    for h in hombros:
        codo = ((h[0] + manos[0]) / 2 + (2 if h[0] < 24 else -2), (h[1] + manos[1]) / 2 + 2)
        limb(t, h, codo, 2.6, 2.2, ACERO, bias=0.1)
        limb(t, codo, manos, 2.2, 2.0, ACERO, bias=0.0)
    shade(t, ell_mask(t, manos[0], manos[1], 2.4, 2.0), ACERO, bias=0.2)  # guanteletes
    if pose != "alza":
        espadon(t, manos, punta, brillo)
    outline(t, OUT)
    # rendija en T del yelmo, con la luz de la maldición (sin contorno: brilla)
    c = GLOW[2] if ojos > 0.8 else (GLOW[1] if ojos > 0.4 else GLOW[0])
    line(t, 20 + ox, 11 + b, 28 + ox, 11 + b, (6, 4, 10))
    line(t, 24 + ox, 11 + b, 24 + ox, 15 + b, (6, 4, 10))
    for x in (21, 22, 26, 27):
        put(t, x + ox, 11 + b, c if x in (22, 26) else GLOW[1] if ojos > 0.4 else GLOW[0])
    ground_shadow(t, S // 2, S - 2, 16, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. No anda: todas las filas lo muestran de frente."""
    if anim == "idle":
        return dibujar(respira=[0, 1][i], ojos=[0.7, 1.0][i])
    if anim == "walk":
        return dibujar(respira=[0, 0, 1, 1][i], ojos=[0.7, 0.9, 1.0, 0.9][i])
    if anim == "atacar":
        return [lambda: dibujar("alza", ojos=1.0),
                lambda: dibujar("golpe", inclina=-1, ojos=1.0),
                lambda: dibujar(ojos=0.9)][i]()
    return dibujar(inclina=1, ojos=0.2)
