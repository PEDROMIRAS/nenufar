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


if __name__ == "__main__":
    for nombre, f in list(globals().items()):
        if nombre.startswith("test_") and callable(f):
            f()
            print("ok", nombre)
