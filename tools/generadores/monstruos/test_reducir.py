"""Pruebas de reducir.py. Uso (desde la raíz del repo): .venv\\Scripts\\python.exe tools\\generadores\\monstruos\\test_reducir.py"""
import os
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reducir  # noqa: E402

ROJO, AZUL, CONTORNO = (200, 30, 30), (30, 30, 200), (10, 10, 10)


def imagen_de_prueba():
    """40×30: un cuadrado rojo de 20×14 en un fondo azul liso."""
    im = Image.new("RGB", (40, 30), AZUL)
    for y in range(8, 22):
        for x in range(10, 30):
            im.putpixel((x, y), ROJO)
    ruta = os.path.join(tempfile.mkdtemp(), "prueba.png")
    im.save(ruta)
    return ruta


def test_pose_quita_el_fondo_y_recorta():
    grid = reducir.pose(imagen_de_prueba(), 10, colores=4)
    assert len(grid[0]) == 10
    assert all(k is not None for fila in grid for k in fila), "el recorte debe ser solo la figura"
    r, g, b = grid[len(grid) // 2][5]
    assert r > 150 and g < 80 and b < 80


def test_pose_con_fondo_negro_y_paleta_fija():
    im = Image.new("RGB", (20, 20), (0, 0, 0))
    for y in range(5, 15):
        for x in range(5, 15):
            im.putpixel((x, y), (130, 80, 50))
    ruta = os.path.join(tempfile.mkdtemp(), "negro.png")
    im.save(ruta)
    paleta = {"marron": (138, 82, 56), "claro": (232, 214, 184)}
    grid = reducir.pose(ruta, 10, fondo="negro", paleta=paleta)
    colores = {k for fila in grid for k in fila if k is not None}
    assert colores <= set(paleta.values())


def test_limpia_pixeles_sueltos_y_agujeros():
    cuadro = [[(1, 2, 3)] * 6 for _ in range(6)]
    cuadro[2][2] = None  # agujero
    reducir.limpiar(cuadro)
    assert cuadro[2][2] == (1, 2, 3)  # el agujero se tapa
    unico = [[None] * 3 for _ in range(3)]
    unico[0][0] = (9, 9, 9)  # píxel suelto
    reducir.limpiar(unico)
    assert unico[0][0] is None


def test_con_contorno_rodea_la_figura():
    grid = [[(5, 5, 5), (5, 5, 5)], [(5, 5, 5), (5, 5, 5)]]
    sal = reducir.con_contorno(grid, CONTORNO)
    assert len(sal) == 4 and len(sal[0]) == 4
    assert sal[0][1] == CONTORNO and sal[1][0] == CONTORNO and sal[3][2] == CONTORNO
    assert sal[0][0] is None, "las esquinas no tocan la figura en cruz"
    assert sal[1][1] == (5, 5, 5)


def test_pegar_recorta_lo_que_se_sale():
    lienzo = np.zeros((4, 4, 4), dtype=np.uint8)
    reducir.pegar(lienzo, [[(1, 2, 3)] * 3 for _ in range(3)], 2, 2)
    assert tuple(lienzo[3, 3]) == (1, 2, 3, 255)
    assert tuple(lienzo[1, 1]) == (0, 0, 0, 0)


def test_sin_tocar_bordes():
    img = np.zeros((8, 8, 4), dtype=np.uint8)
    img[3, 3] = (1, 1, 1, 255)
    assert reducir.sin_tocar_bordes(img)
    img[3, 0] = (1, 1, 1, 255)
    assert not reducir.sin_tocar_bordes(img)
    img[3, 0] = 0
    img[7, 3] = (1, 1, 1, 255)
    assert reducir.sin_tocar_bordes(img, permitir_abajo=True)
    assert not reducir.sin_tocar_bordes(img, permitir_abajo=False)


def test_imagen_lisa_da_un_error_claro():
    ruta = os.path.join(tempfile.mkdtemp(), "lisa.png")
    Image.new("RGB", (10, 10), AZUL).save(ruta)
    try:
        reducir.pose(ruta, 5)
    except AssertionError as e:
        assert "ninguna figura" in str(e)
    else:
        raise AssertionError("debía fallar con una imagen lisa")


def test_pose_quita_el_fondo_encerrado():
    """Un aro rojo sobre azul: el azul de dentro es fondo aunque no toque el borde."""
    im = Image.new("RGB", (60, 60), AZUL)
    for y in range(10, 50):
        for x in range(10, 50):
            if not (20 <= x < 40 and 20 <= y < 40):
                im.putpixel((x, y), ROJO)
    ruta = os.path.join(tempfile.mkdtemp(), "aro.png")
    im.save(ruta)
    assert reducir.pose(ruta, 20, colores=4)[10][10] is not None  # sin pedirlo, se queda (como antes)
    assert reducir.pose(ruta, 20, colores=4, encerrado=100)[10][10] is None
    assert reducir.pose(ruta, 20, colores=4, encerrado=1000)[10][10] is not None  # 400 px: demasiado pequeño


def test_pose_quita_las_motas_de_alrededor():
    """Un cuadrado rojo y, lejos, una mota roja de 2×2 (un resto del suelo de la imagen)."""
    im = Image.open(imagen_de_prueba())
    for x, y in ((36, 26), (37, 26), (36, 27), (37, 27)):
        im.putpixel((x, y), ROJO)
    ruta = os.path.join(tempfile.mkdtemp(), "mota.png")
    im.save(ruta)
    con_mota = reducir.pose(ruta, 10, colores=4)
    assert any(k is None for fila in con_mota for k in fila), "sin pedirlo, la mota ensancha el recorte (como antes)"
    limpia = reducir.pose(ruta, 10, colores=4, motas=10)
    assert all(k is not None for fila in limpia for k in fila), "el recorte debe ser solo el cuadrado"


def test_piezas_para_montar_vistas():
    a, b = (1, 1, 1), (2, 2, 2)
    grid = [[a, b, None], [a, b, b]]
    assert reducir.trozo(grid, 1, 0, 3, 2) == [[b, None], [b, b]]
    assert reducir.espejo(grid) == [[None, b, a], [b, b, a]]
    assert reducir.repintar(grid, {a: b}) == [[b, b, None], [b, b, b]]
    lienzo = reducir.vacia(4, 3)
    reducir.poner(lienzo, grid, 2, 1)  # lo que se sale se recorta y lo transparente no tapa
    assert lienzo == [[None] * 4, [None, None, a, b], [None, None, a, b]]
    assert reducir.ajustar(lienzo) == [[a, b], [a, b]]
    cuadro = [[a] * 6 for _ in range(6)]
    pieza, x0, y0 = reducir.recorte(cuadro, [(2, 1), (5, 1), (5, 4), (2, 4)])  # un polígono: solo lo de dentro
    assert (x0, y0) == (2, 1) and len(pieza) == 3 and len(pieza[0]) == 3 and all(c == a for f in pieza for c in f)
    triangulo, _, _ = reducir.recorte(cuadro, [(0, 0), (6, 0), (0, 6)])
    assert triangulo[0][0] == a and triangulo[-1][-1] is None
    assert reducir.estrechar([[a, a, b, b]], 2) == [[a, b]]
    fondo = [[a] * 5 for _ in range(5)]
    reducir.poner(fondo, [[b]], 2, 2, borde=(9, 9, 9))  # con borde, lo de debajo se separa con una línea
    assert fondo[2][2] == b and fondo[1][2] == fondo[2][1] == fondo[3][2] == fondo[2][3] == (9, 9, 9)
    assert fondo[1][1] == a


def test_pose_recorta_la_imagen_antes_de_buscar_la_figura():
    """Una raya de suelo de lado a lado bajo el cuadrado: recortando la imagen por encima, no entra."""
    im = Image.open(imagen_de_prueba())
    for x in range(2, 38):
        im.putpixel((x, 26), ROJO)
    ruta = os.path.join(tempfile.mkdtemp(), "raya.png")
    im.save(ruta)
    grid = reducir.pose(ruta, 10, colores=4, recorte=(0, 0, 40, 24))
    assert all(k is not None for fila in grid for k in fila), "el recorte debe ser solo el cuadrado"


def test_movimiento_es_continuo_y_escala():
    for anim, n, _, _ in reducir.ANIMS_DOBLE:
        for i in range(n):
            p1, t1, e1, dx1, dy1 = reducir.movimiento(anim, i, n, 1)
            p2, t2, e2, _, _ = reducir.movimiento(anim, i, n, 2)
            assert set(p1) == {"pierna_a", "pierna_b", "brazo_i", "brazo_d", "cola", "cabeza"}
            assert all(abs(p2[k][0] - 2 * p1[k][0]) < 1e-9 and abs(p2[k][1] - 2 * p1[k][1]) < 1e-9 for k in p1)
            assert abs(t2 - 2 * t1) < 1e-9 and e1 == e2 and 0.9 <= e1 <= 1
    reposo = reducir.movimiento("idle", 0, 8, 2)
    assert all(v == (0, 0) for v in reposo[0].values()) and reposo[1:] == (0, 1, 0, 0)
    ataque = [reducir.movimiento("atacar", i, 6, 1)[1] for i in range(6)]
    assert ataque[0] == 0 and ataque[-1] == 0 and min(ataque) < 0 < max(ataque)  # se echa atrás y se lanza


def test_animar_pone_los_pies_en_el_ancla():
    base = reducir.con_contorno([[ROJO] * 10 for _ in range(20)], CONTORNO)
    img = reducir.animar(base, [], "idle", 0, 8, 2, 64, 64)
    opaco = img[:, :, 3] > 0
    assert img.shape == (64, 64, 4) and opaco[64 - 2 * 2 + 1].any() and not opaco[64 - 2 * 2 + 2:].any()
    assert reducir.sin_tocar_bordes(img) and reducir.sueltos(img) == 0


def test_sueltos_cuenta_las_motas():
    img = np.zeros((8, 8, 4), dtype=np.uint8)
    img[2:5, 2:5] = (9, 9, 9, 255)
    img[7, 7] = (1, 2, 3, 255)
    assert reducir.sueltos(img) == 1 and reducir.sueltos(img, exentos=[(1, 2, 3)]) == 0


if __name__ == "__main__":
    for nombre, f in list(globals().items()):
        if nombre.startswith("test_") and callable(f):
            f()
            print("ok", nombre)
