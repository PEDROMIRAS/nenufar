"""Dragón negro (64x48), el jefe violeta más raro: puede salir en cualquier zona. Escamas negras
con reflejos morados, alas abiertas, cuernos de hueso y los ojos con la luz violeta de la
maldición. Su golpe cargado es un aliento de fuego (naranja, para no confundirlo con el fuego
morado de la maga). Al vencerlo da su Corazón.

Como el Rey sin Charca, mide 64x48 con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira con las alas), walk (4: no anda), atacar (3: toma aire con el
pecho encendido, escupe el fuego y vuelve) y golpe (1, destello)."""
from dibujo import tile, put, line, outline, poly_mask, ell_mask, shade, limb, fire_band, ground_shadow

W, H = 64, 48
NEGRO = [(12, 10, 18), (26, 22, 36), (42, 36, 56), (62, 54, 82), (90, 78, 116)]
MEMBRANA = [(30, 18, 40), (50, 32, 66), (74, 50, 96)]
HUESO = [(120, 112, 116), (176, 168, 168), (224, 218, 214)]
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
GLOW = [(96, 50, 150), (176, 124, 255), (236, 214, 255)]
OUT = (8, 4, 12)


def ala(t, lado, alza):
    """Ala abierta: membrana entre los dedos, con los huesos marcados."""
    def tr(p):
        return (W - 1 - p[0], p[1]) if lado else p
    hombro = (25, 24)
    puntas = [(5, 6 - alza), (3, 15 - alza), (7, 24 - alza // 2), (13, 30), (19, 31)]
    shade(t, poly_mask(t, [tr(hombro)] + [tr(p) for p in puntas]), MEMBRANA, bias=0.1 if not lado else -0.05)
    for p in puntas[:4]:
        line(t, *tr(hombro), *tr(p), NEGRO[3])
    limb(t, tr(hombro), tr(puntas[0]), 1.8, 0.8, NEGRO, bias=0.1)


def dibujar(respira=0, ojos=1.0, carga=0.0, aliento=False, alza=0, inclina=0):
    t = tile(H, W)
    b = respira
    ox = inclina
    for lado in (0, 1):
        ala(t, lado, alza)
    # cola que se enrosca a la derecha
    p = [(40, 40), (50, 43), (57, 39), (60, 32)]
    for i in range(3):
        limb(t, p[i], p[i + 1], 3.2 - i, 2.2 - i * 0.8, NEGRO, bias=0.0)
    # patas traseras con garras
    for x in (23, 37):
        limb(t, (x + ox, 37), (x + ox, 45), 3.2, 2.6, NEGRO, bias=0.05)
        for dx in (-2, 0, 2):
            put(t, x + ox + dx, 46, HUESO[1])
    # cuerpo y vientre de placas
    shade(t, ell_mask(t, 32 + ox, 33 + b, 11, 9.5), NEGRO, bias=0.05)
    vientre = ell_mask(t, 32 + ox, 35 + b, 5.5, 6.5)
    shade(t, vientre, [NEGRO[2], NEGRO[3], NEGRO[4]], bias=0.0, rim=False)
    # cuello y cabeza
    hy = 12 + b - (2 if carga > 0 else 0)
    limb(t, (32 + ox, 28 + b), (32 + ox, hy + 4), 4.6, 3.6, NEGRO, bias=0.1)
    shade(t, ell_mask(t, 32 + ox, hy, 6, 5), NEGRO, bias=0.15)
    shade(t, poly_mask(t, [(28 + ox, hy + 2), (36 + ox, hy + 2), (34 + ox, hy + 8), (30 + ox, hy + 8)]), NEGRO, bias=0.0)
    for lado in (-1, 1):  # cuernos
        limb(t, (32 + ox + 4 * lado, hy - 3), (32 + ox + 9 * lado, hy - 8), 1.6, 0.4, HUESO, bias=0.1)
    outline(t, OUT)
    # ojos con la luz de la maldición
    c = GLOW[2] if ojos > 0.8 else (GLOW[1] if ojos > 0.4 else GLOW[0])
    for ex in (29, 35):
        put(t, ex + ox, hy, c)
        put(t, ex + ox + (1 if ex > 32 else -1), hy, GLOW[1] if ojos > 0.4 else GLOW[0])
    put(t, 31 + ox, hy + 7, OUT); put(t, 33 + ox, hy + 7, OUT)  # orificios
    # el fuego que se le enciende en el pecho y la boca al tomar aire
    if carga > 0:
        # brilla entre las placas del vientre, más fuerte por dentro
        ys, xs = vientre.nonzero()
        cyv = ys.mean()
        for y, x in zip(ys, xs):
            dentro = ((x - 32 - ox) / 5.5) ** 2 + ((y - cyv) / 6.5) ** 2
            if y % 3 == 0 and dentro < 0.9:
                t[y, x] = (*FUEGO[2 if carga >= 1 and dentro < 0.4 else 1], 255)
            elif carga >= 1 and dentro < 0.25:
                t[y, x] = (*FUEGO[1], 255)
        put(t, 32 + ox, hy + 8, FUEGO[2])
    if aliento:  # escupe el fuego hacia delante, hasta el suelo
        for i in range(10):
            fire_band(t, 32 + ox - i * 2, 32 + ox + i * 2, hy + 10 + i * 2, 3, i, FUEGO)
        fire_band(t, 8, 56, H - 1, 9, 2, FUEGO, profile=lambda u: 0.4 + 0.6 * (1 - abs(u - 0.5) * 2), bright=0.45)
    ground_shadow(t, W // 2, H - 2, 18, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. Solo lucha de frente: todas las filas son la misma vista."""
    if anim == "idle":
        return dibujar(respira=[0, 1][i], alza=[0, 2][i])
    if anim == "walk":
        return dibujar(respira=[0, 1, 1, 0][i], alza=[0, 1, 2, 1][i])
    if anim == "atacar":
        return [lambda: dibujar(carga=1.0, alza=3, ojos=1.0),
                lambda: dibujar(aliento=True, alza=1, inclina=1),
                lambda: dibujar(carga=0.4, ojos=0.9)][i]()
    return dibujar(inclina=-1, ojos=0.2, alza=-1)
