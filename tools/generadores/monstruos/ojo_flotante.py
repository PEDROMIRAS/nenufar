"""Ojo flotante (48x48), jefe violeta de la Cripta. Una bola de carne con un único ojo enorme de
iris violeta, que flota sobre el suelo y deja colgar sus tentáculos. Ataca con la mirada: veneno,
quemaduras y parálisis.

Cabe en 48 de alto con la sombra en 46 y no sube más de ~42 px sobre ella.
Hoja del repo: idle (2: sube y baja), walk (4: flota), atacar (3: el iris se enciende, la mirada
estalla en rayos y se apaga) y golpe (1: cierra el ojo; la hoja lo pasa a blanco)."""
import math

from dibujo import tile, put, line, outline, ell_mask, shade, limb, ground_shadow

S = 48
CARNE = [(46, 28, 56), (78, 48, 90), (112, 72, 124), (150, 104, 160), (190, 142, 196)]
TENTA = [(56, 32, 66), (92, 56, 104), (130, 86, 140), (172, 124, 180)]
BLANCO = [(176, 164, 156), (222, 212, 202), (246, 240, 232)]
VENA = (170, 50, 60)
IRIS = [(80, 40, 130), (150, 96, 230), (206, 170, 255)]
GLOW = [(176, 124, 255), (236, 214, 255)]
PUPILA = (12, 8, 16)
OUT = (20, 12, 24)


def dibujar(alto=0, fase=0, brillo=0.0, cerrado=False, rayos=False):
    t = tile(S, S)
    cx, cy = 24, 19 + alto
    # tentáculos colgando, con un vaivén según la fase
    for k, x0 in enumerate((15, 20, 24, 28, 33)):
        largo = 18 + (k % 2) * 4 - abs(k - 2)
        p = (x0, cy + 9)
        for s in range(3):
            onda = math.sin(fase * 1.6 + k * 1.3 + s * 0.9) * 2.2
            q = (x0 + (x0 - 24) * 0.25 * (s + 1) + onda, cy + 9 + largo * (s + 1) / 3)
            limb(t, p, q, 2.2 - s * 0.6, 1.6 - s * 0.5, TENTA, bias=0.05)
            p = q
        put(t, round(p[0]), round(p[1]), TENTA[3])
    # cuerpo de carne
    shade(t, ell_mask(t, cx, cy, 13, 12), CARNE, bias=0.05)
    outline(t, OUT)
    # párpados y ojo
    shade(t, ell_mask(t, cx, cy + 1, 9.5, 8), CARNE, bias=-0.15)
    if cerrado:
        line(t, cx - 8, cy + 1, cx + 8, cy + 1, OUT)
        line(t, cx - 6, cy + 2, cx + 6, cy + 2, CARNE[1])
    else:
        ojo = ell_mask(t, cx, cy + 1, 8, 6.5)
        shade(t, ojo, BLANCO, bias=0.1, rim=False)
        for x0, y0, x1, y1 in ((cx - 8, cy, cx - 4, cy + 1), (cx + 8, cy + 2, cx + 4, cy + 1), (cx - 6, cy + 5, cx - 3, cy + 3)):
            line(t, x0, y0, x1, y1, VENA)
        iris = IRIS if brillo < 0.5 else [IRIS[1], IRIS[2], GLOW[1]]
        shade(t, ell_mask(t, cx, cy + 1, 4.2, 4.2), iris, bias=0.1, rim=False)
        for y in range(cy - 2, cy + 5):  # pupila rasgada
            put(t, cx, y, PUPILA)
        put(t, cx - 1, cy + 1, PUPILA); put(t, cx + 1, cy + 1, PUPILA)
        put(t, cx - 2, cy - 1, BLANCO[2])
    if rayos:  # la mirada estalla: rayos violetas hacia delante y abajo
        for ang in (-50, -25, 0, 25, 50):
            a = math.radians(90 + ang)
            for r in range(10, 24):
                x, y = cx + math.cos(a) * r, cy + 1 + math.sin(a) * r * 0.9
                if 0 <= x < S and 0 <= y < S - 1 and t[int(y), int(x), 3] == 0:
                    put(t, int(x), int(y), GLOW[r % 2])
    ground_shadow(t, S // 2, S - 2, 11, 1.6)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. Solo mira de frente: todas las filas son la misma vista."""
    if anim == "idle":
        return dibujar(alto=[0, -1][i], fase=i * 2)
    if anim == "walk":
        return dibujar(alto=[0, -1, -1, 0][i], fase=i)
    if anim == "atacar":
        return [lambda: dibujar(alto=-1, fase=1, brillo=0.6),
                lambda: dibujar(alto=0, fase=2, brillo=1.0, rayos=True),
                lambda: dibujar(alto=0, fase=3)][i]()
    return dibujar(alto=1, fase=0, cerrado=True)
