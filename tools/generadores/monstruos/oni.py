"""Monje oni (48x48), jefe violeta del Cauce Seco. Un monje demoníaco de piel rojiza: máscara de calavera con
dos cuernos, melena de llamas, collar de cuentas doradas, mandil claro con una cuerda roja en la cintura,
pantalón negro holgado y los pies descalzos. Un brazo cuelga con una llama; el otro se extiende y arde.
(La referencia es la imagen 7 del documento de diseño; a 48 px, reducirla daba solo ruido, así que se dibuja.)

Cabe en 48 de alto con los pies en 46 y no sube más de ~42 px sobre ellos.
Hoja del repo: idle (2: respira y las llamas pulsan), walk (4: no anda, es un jefe), atacar (3: adelanta los
brazos y las llamas crecen) y golpe (1, destello). Las cuatro direcciones usan la misma vista, de frente."""
import numpy as np
from dibujo import tile, put, line, rect, outline, ell_mask, poly_mask, shade, limb, flame, ground_shadow, rng

S = 48
PIEL = [(52, 18, 16), (92, 30, 22), (136, 48, 30), (180, 76, 42)]
MASCARA = [(124, 116, 104), (186, 178, 162), (226, 220, 204), (244, 240, 228)]
CUERNO = [(70, 16, 14), (122, 32, 26), (176, 58, 40)]
TELA = [(120, 114, 102), (172, 164, 148), (214, 206, 188), (238, 232, 216)]
PANTALON = [(18, 16, 22), (34, 30, 38), (52, 46, 56), (76, 68, 78)]
CHALECO = [(34, 22, 24), (58, 36, 34), (86, 54, 46)]
CUERDA = (176, 36, 36)
ORO = [(164, 118, 46), (226, 180, 72)]
FUEGO = [(130, 34, 12), (226, 98, 24), (255, 186, 64), (255, 242, 200)]
HUECO = (10, 6, 10)
OUT = (8, 4, 10)
CX = 24


def dibujar(bob=0, brazo=0, llama=6, fase=0):
    t = tile(S, S)
    # Pies descalzos, piernas holgadas y mandil
    for x in (15, 33):
        shade(t, ell_mask(t, x, 45, 4.5, 2), PIEL, bias=0.0)
    izq = poly_mask(t, [(13, 31), (24, 31), (23, 44), (11, 44)])
    der = poly_mask(t, [(24, 31), (35, 31), (37, 44), (25, 44)])
    shade(t, izq, PANTALON, bias=-0.1)
    shade(t, der, PANTALON, bias=-0.1)
    for x in (12, 36):  # cintas rojas en los tobillos
        rect(t, x - 1, 41, x + 2, 42, CUERDA)
    mandil = poly_mask(t, [(18, 31), (30, 31), (31, 43), (17, 43)])
    shade(t, mandil, TELA, bias=0.0)
    line(t, 24, 33, 24, 42, TELA[0])
    line(t, 19, 34, 18, 42, TELA[1]); line(t, 29, 34, 30, 42, TELA[1])
    # Cintura: cuerda roja con una cuenta dorada y borlas
    rect(t, 15, 30, 33, 31, CUERDA)
    rect(t, 23, 30, 24, 32, ORO[1])
    for x in (21, 27):
        rect(t, x, 32, x, 36, CUERDA)
    # Torso: chaleco oscuro abierto, que deja ver el pecho, con el collar de cuentas
    torso = poly_mask(t, [(15, 19 + bob), (33, 19 + bob), (32, 30), (16, 30)])
    shade(t, torso, CHALECO, bias=0.0)
    pecho = poly_mask(t, [(21, 19 + bob), (27, 19 + bob), (24, 28)])
    shade(t, pecho, PIEL, bias=0.05)
    for x, y in ((21, 22), (23, 24), (25, 24), (27, 22)):
        put(t, x, y + bob, ORO[1])
    put(t, 24, 26 + bob, CUERDA)
    # Brazos: el de la izquierda cuelga con una llama; el de la derecha se extiende (y se adelanta al atacar)
    limb(t, (15, 21 + bob), (10, 27), 3.6, 2.9, PIEL, bias=0.0)
    limb(t, (10, 27), (9, 34 - brazo * 3), 2.9, 2.4, PIEL, bias=0.0)
    limb(t, (33, 21 + bob), (39, 22 - brazo * 2), 3.6, 2.9, PIEL, bias=0.0)
    limb(t, (39, 22 - brazo * 2), (42, 20 - brazo * 4), 2.9, 2.3, PIEL, bias=0.0)
    # Cabeza: máscara de calavera con cuernos
    for s in (-1, 1):
        cuerno = poly_mask(t, [(CX + s * 3, 11), (CX + s * 8, 8), (CX + s * 9, 5), (CX + s * 10, 9), (CX + s * 6, 13)])
        shade(t, cuerno, CUERNO, bias=0.0)
    shade(t, ell_mask(t, CX, 14, 5.2, 6.0), MASCARA, bias=0.05)
    for x in (21, 26):
        rect(t, x, 12, x + 1, 14, HUECO)
    put(t, 24, 15, HUECO); put(t, 24, 16, HUECO)
    line(t, 21, 18, 27, 18, HUECO)
    for x in (22, 24, 26):
        put(t, x, 18, MASCARA[3]); put(t, x, 19, HUECO)
    line(t, 20, 15, 20, 17, MASCARA[0]); line(t, 28, 15, 28, 17, MASCARA[0])
    outline(t, OUT)
    # Fuego: la melena y las llamas de las manos (sin contorno: brillan)
    flame(t, CX, 11, 4, 4, fase, FUEGO)
    flame(t, CX - 5, 12, 3, 2, fase + 1, FUEGO)
    flame(t, CX + 5, 12, 3, 2, fase + 2, FUEGO)
    flame(t, 9, 33 - brazo * 3, llama, 3, fase, FUEGO)
    flame(t, 42, 19 - brazo * 4, llama + 1, 3, fase + 1, FUEGO)
    g = rng(7 + fase)
    for _ in range(4):  # chispas sueltas
        put(t, g.randint(5, 41), g.randint(8, 38), FUEGO[1 + (g.random() > 0.6)])
    ground_shadow(t, CX, S - 2, 16, 2)
    return t


def fotograma(direccion, anim, i):
    """Un fotograma de la hoja del repo. De frente en las cuatro direcciones."""
    if anim in ("idle", "walk"):
        n = [0, 1, 0, 1][i % 4]
        return dibujar(bob=n, llama=5 + n, fase=i)
    if anim == "atacar":
        return [lambda: dibujar(bob=0, brazo=0, llama=6, fase=1),
                lambda: dibujar(bob=1, brazo=1, llama=8, fase=2),
                lambda: dibujar(bob=0, brazo=1, llama=7, fase=3)][i]()
    return dibujar(bob=1, llama=4, fase=0)
