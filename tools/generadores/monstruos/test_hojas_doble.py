"""Pruebas de los monstruos a doble resolución. Uso (desde la raíz del repo):
.venv\\Scripts\\python.exe tools\\generadores\\monstruos\\test_hojas_doble.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reducir  # noqa: E402
import golem  # noqa: E402
import lobo  # noqa: E402
import acolito  # noqa: E402
import cuervo  # noqa: E402
import jabali  # noqa: E402
import reina_arana  # noqa: E402
import guardian_bosque  # noqa: E402
import oni  # noqa: E402
import rey_sin_charca  # noqa: E402
import senor_cripta  # noqa: E402

DOBLES = [golem, lobo, reina_arana, acolito, cuervo, jabali, oni, guardian_bosque, senor_cripta, rey_sin_charca]
DIRS = ["down", "left", "right", "up"]
_CUADROS = {}


def cuadros(m):
    """Todos los fotogramas del módulo, `{(direccion, anim, i): array}` (se calculan una vez)."""
    if m not in _CUADROS:
        _CUADROS[m] = {(d, anim, i): m.fotograma(d, anim, i)
                       for d in DIRS for anim, n, _, _ in m.ANIMS for i in range(n)}
    return _CUADROS[m]


def test_cada_fotograma_cabe_limpio_en_su_cuadro():
    for m in DOBLES:
        for (d, anim, i), img in cuadros(m).items():
            donde = f"{m.__name__} {d} {anim} {i}"
            assert img.shape == (m.H, m.W, 4), donde
            assert reducir.sin_tocar_bordes(img), f"{donde}: toca el borde"
            assert reducir.sueltos(img, getattr(m, "EXENTOS", ())) == 0, f"{donde}: tiene motas o piezas sueltas"
            # Como en la hoja de antes: tres píxeles de juego libres arriba, para no tapar su nombre en combate
            assert not (img[:3 * m.ESCALA_HOJA, :, 3] > 0).any(), f"{donde}: sube demasiado"


def test_las_animaciones_se_mueven():
    for m in DOBLES:
        c = cuadros(m)
        for d in DIRS:
            andar = {c[(d, "walk", i)].tobytes() for i in range(8)}
            assert len(andar) >= 6, f"{m.__name__} {d}: andar tiene solo {len(andar)} fotogramas distintos"
            assert c[(d, "idle", 0)].tobytes() != c[(d, "idle", 4)].tobytes(), f"{m.__name__} {d}: no respira"


def test_la_izquierda_es_el_espejo_de_la_derecha():
    for m in DOBLES:
        c = cuadros(m)
        assert (c[("left", "idle", 0)] == c[("right", "idle", 0)][:, ::-1]).all(), m.__name__


def test_la_hoja_cabe_en_una_textura():
    for m in DOBLES:
        assert sum(n for _, n, _, _ in m.ANIMS) * m.W <= 4096, m.__name__


if __name__ == "__main__":
    for nombre, f in list(globals().items()):
        if nombre.startswith("test_") and callable(f):
            f()
            print("ok", nombre)
