"""Rey sin Charca (64x48): la forma en que se transforma el Señor de la Cripta en su última fase,
tras siglos con el poder que bebió. Cuerpo de obsidiana encorvado, cuernos de hueso, costillar
abierto con un corazón de fuego, melena de llamas y falda de humo ardiente.
Morado como el Señor de la Cripta del que sale (antes era verde azulado y no parecía el mismo jefe);
solo los ojos guardan el verde azulado del agua muerta que se bebió.

Solo sale en combate (de frente, ×2). Como los otros jefes, cabe en 48 de alto con los pies en 46
y no sube más de ~42 px sobre ellos: por encima van su nombre y la barra de turnos. Se diseña en
un espacio con el suelo en y = 61 y se dibuja a escala K.
Hoja del repo: idle (2), walk (4), atacar (3) y golpe (1)."""
import numpy as np
from dibujo import tile, put, line, rect, outline, poly_mask, ell_mask, shade, limb, flame, fire_band, ground_shadow

S = 64
H = 48
K = 0.72
O = [(14, 8, 20), (30, 18, 40), (50, 32, 64), (76, 52, 92), (110, 82, 128)]  # obsidiana morada
BONE = [(112, 104, 114), (166, 156, 166), (220, 210, 220)]
FIRE = [(70, 28, 98), (126, 56, 170), (190, 120, 236), (244, 222, 255)]  # fuego morado
FIRE_DIM = [(44, 20, 62), (80, 40, 110), (130, 90, 170), (200, 170, 230)]
EYES = [(46, 150, 146), (124, 222, 204), (226, 255, 244)]  # el agua muerta que se bebió
OUT = (16, 6, 26)


def R(v):
    return v * K


def mxp(p):
    return (63 - p[0], p[1])


POSES = {  # hombro, codo, muñeca, dirección de las garras del brazo izquierdo de la imagen
    "idle": ((15, 25), (8, 34), (8, 44), (0, 1)),
    "raise": ((15, 24), (7, 22), (10, 16), (0, -1)),
    "strike": ((16, 25), (12, 37), (22, 45), (1, 1)),
    "recover": ((15, 26), (9, 35), (9, 45), (0, 1)),
}


def claws(t, w, d, tip_col):
    dx, dy = d
    spread = [(-1, 0), (0, 1), (1, 1), (2, 0)] if dy else [(0, -1), (1, -1), (1, 1), (0, 2)]
    for sx, sy in spread:
        x0, y0 = w[0] + sx, w[1] + sy
        tip = (x0 + dx * 3 + sx * 0.5, y0 + dy * 3 + sy)
        line(t, x0, y0, *tip, BONE[1])
        put(t, *tip, tip_col)


def draw(anim, f):
    t = tile(H, S)
    pose, oy, ox, fire, mane, burst = "idle", 0, 0, FIRE, 1.0, False
    if anim == "idle":
        oy = [0, -1, -1, 0][f]
    elif anim == "attack":
        pose = ["raise", "strike", "recover"][f]
        oy = [-1, 1, 0][f]
        mane = [1.3, 1.1, 1.0][f]
        burst = f == 1
    elif anim == "hit":
        pose, oy, ox, fire, mane = "recover", -1, -1, FIRE_DIM, 0.6
    sh, el, wr, cd = POSES[pose]

    def P(p):
        return (32 + (p[0] - 32) * K + ox, H - 2 - (61 - p[1]) * K + oy)

    hc = P((32, 23))

    # melena de llamas en una capa aparte, por detrás y sin contorno
    back = tile(H, S)
    fire_band(back, hc[0] - R(17), hc[0] + R(17), hc[1] + 1, R(17) * mane, f, fire,
              profile=lambda u: max(0.12, 1 - abs(u - 0.5) * 1.8) ** 0.55, bright=0.75)

    # falda de humo ardiente (sustituye a las piernas)
    jag = [1, 0, 1, 0, 1, 0, 1]
    hem = [(x, 55 + (4 if jag[i] ^ (f % 2) else 1)) for i, x in enumerate(range(44, 18, -4))]
    skirt = [(20, 39), (44, 39), (48, 51)] + hem + [(16, 51)]
    sk = poly_mask(t, [P(p) for p in skirt])
    shade(t, sk, O, bias=-0.2)
    ys, xs = np.nonzero(sk)
    for y, x in zip(ys, xs):  # el humo se ilumina desde abajo
        if y > P((0, 56))[1]:
            t[y, x] = (*fire[0], 255)
        elif y > P((0, 52))[1]:
            t[y, x] = (*O[3], 255)
    # tronco ancho y hombros con púas
    torso = [(14, 19), (50, 19), (55, 25), (51, 34), (45, 41), (19, 41), (13, 34), (9, 25)]
    body = poly_mask(t, [P(p) for p in torso])
    shade(t, body, O, bias=-0.05)
    for side in (0, 1):
        tr = (lambda p: P(mxp(p))) if side else P
        for sp in ([(10, 21), (6, 13), (14, 19)], [(15, 19), (14, 11), (19, 18)]):
            shade(t, poly_mask(t, [tr(p) for p in sp]), O, bias=0.1)
    # costillar abierto
    ch = P((32, 35))
    t[ell_mask(t, ch[0], ch[1], R(7.0), R(6.0))] = (*O[0], 255)
    # brazos
    arms = np.zeros((H, S), bool)
    for side in (0, 1):
        tr = (lambda p: P(mxp(p))) if side else P
        arms |= limb(t, tr(sh), tr(el), R(4.6), R(3.4), O, bias=-0.05 if side else 0.05)
        arms |= limb(t, tr(el), tr(wr), R(3.4), R(2.8), O, bias=-0.1 if side else 0.0)
        claws(t, tr(wr), (-cd[0], cd[1]) if side else cd, fire[2])
    # cabeza grande con mandíbula
    head = ell_mask(t, hc[0], hc[1], R(8.5), R(7.0)) | poly_mask(t, [
        (hc[0] - R(6), hc[1] + R(3)), (hc[0] + R(6), hc[1] + R(3)), (hc[0] + R(3), hc[1] + R(9)), (hc[0] - R(3), hc[1] + R(9))])
    shade(t, head, O, bias=0.12)
    # cuernos de hueso hacia fuera y arriba, en tres tramos que se afinan
    for side in (-1, 1):
        x0, y0 = hc[0] + R(6) * side, hc[1] - R(4)
        pts = [(x0, y0), (x0 + R(6) * side, y0 - R(2)), (x0 + R(10) * side, y0 - R(5)), (x0 + R(11) * side, y0 - R(9))]
        ws = [1.8, 1.3, 0.8, 0.3]
        for i in range(3):
            limb(t, pts[i], pts[i + 1], ws[i], ws[i + 1], BONE, bias=0.1 if side < 0 else -0.1)
    outline(t, OUT)

    # costillas y corazón de fuego (sin contorno: brillan)
    for k, dy in enumerate((-2, 0, 2)):
        for side in (-1, 1):
            line(t, ch[0] + 1.5 * side, ch[1] + dy, ch[0] + (4.5 - abs(dy) / 2) * side, ch[1] + dy - 1, BONE[1 if k else 2])
    line(t, ch[0], ch[1] - 4, ch[0], ch[1] + 4, BONE[0])
    pulse = [0, 1, 1, 0][f % 4] if anim == "idle" else (1 if anim == "attack" else -1)
    flame(t, round(ch[0]), round(ch[1] + 3), 5 + pulse, 2.2 + 0.3 * pulse, f, fire)
    # cara: cuencas que arden y colmillos
    ex0, ey = round(hc[0]), round(hc[1])
    for ex, d in ((ex0 - 3, -1), (ex0 + 3, 1)):
        put(t, ex, ey, EYES[2]); put(t, ex + d, ey, EYES[1]); put(t, ex, ey + 1, EYES[0])
    for i, x in enumerate(range(ex0 - 2, ex0 + 3)):
        put(t, x, ey + 4, fire[1] if i % 2 else BONE[2])
    # luz del fuego sobre la cabeza y en los bordes del cuerpo
    hm = head & (t[:, :, 3] == 255)
    up = np.zeros_like(hm); up[1:, :] = hm[:-1, :]
    t[hm & ~up] = (*fire[1], 255)
    solid = t[:, :, 3] == 255
    yy = np.mgrid[0:H, 0:S][0]
    edge_l = np.zeros_like(solid); edge_l[:, 1:] = ~solid[:, :-1]
    edge_r = np.zeros_like(solid); edge_r[:, :-1] = ~solid[:, 1:]
    t[solid & (edge_l | edge_r) & (t[:, :, 1] < 60) & (yy > P((0, 24))[1])] = (*fire[0], 255)
    # llamas que lamen el borde de la falda, chispas y la ola de fuego del ataque
    fire_band(t, P((17, 0))[0], P((47, 0))[0], H - 1, 4, f, fire, profile=lambda u: 0.5 + 0.5 * (1 - abs(u - 0.5) * 2))
    for i in range(5):
        x, y = 8 + (i * 13 + f * 3) % 48, 34 - ((f * 6 + i * 11) % 26)
        if t[y, x, 3] == 0:
            put(t, x, y, fire[2] if i % 2 else fire[1])
    if burst:
        fire_band(t, 3, 60, H - 1, 11, f + 3, fire, profile=lambda u: 0.45 + 0.55 * (1 - abs(u - 0.5) * 2), bright=0.45)
    ground_shadow(t, 32 + ox, H - 2, 14, 1.8, color=FIRE[0], alpha=70)
    under = t[:, :, 3] == 0  # la melena va por detrás de todo
    t[under] = back[under]
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. Solo lucha de frente: todas las filas son la misma vista."""
    if anim == "idle":
        return draw("idle", [0, 2][i])
    if anim == "walk":
        return draw("idle", i)
    if anim == "atacar":
        return draw("attack", i)
    return draw("hit", 0)
