"""Limo grande (el que invoca el Guardián del Bosque): el limo de `limo.py` con la baba azulada."""
import limo

W, H, ESCALA_HOJA, ANIMS, OUT = limo.W, limo.H, limo.ESCALA_HOJA, limo.ANIMS, limo.OUT


def _azulado(c):
    r, g, b = c
    return (r, g * 3 // 4, min(255, b + g // 2)) if g > r and g > b else c  # solo la baba verde; la lengua, igual


def fotograma(direccion, anim, i):
    return limo.fotograma(direccion, anim, i, tinte=_azulado)
