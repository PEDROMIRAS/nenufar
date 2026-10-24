"""Fotogramas de combate que se sacan de una pose ya dibujada: el golpe recibido y la derrota."""
from PIL import Image


def golpe(img):
    """Destello de recibir daño: todo casi blanco salvo el contorno oscuro."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and r + g + b > 120:
                px[x, y] = (int(r * 0.35 + 166), int(g * 0.35 + 166), int(b * 0.35 + 166), a)
    return out


def derrota(img, pie_y=30, caja=None):
    """Dos fotogramas: se encoge sobre los pies y luego queda tumbada en el suelo. `caja` fija el
    recorte (el de la heroína sin piezas especiales, para que sus capas encajen)."""
    s = img.width
    caja = caja or img.getbbox()
    figura = img.crop(caja)
    encogida = figura.resize((figura.width, max(1, round(figura.height * 0.75))), Image.NEAREST)
    f0 = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    f0.alpha_composite(encogida, ((s - encogida.width) // 2, pie_y + 1 - encogida.height))
    tumbada = figura.rotate(90, expand=True)
    tumbada = tumbada.crop(tumbada.getbbox())
    f1 = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    f1.alpha_composite(tumbada, (max(0, (s - tumbada.width) // 2), pie_y + 1 - tumbada.height))
    return [f0, f1]


def guardar_capas(out, base, hoja, piezas, equipo, nombre):
    """Una capa por pieza especial: los píxeles que cambian al dibujar la heroína con ella puesta.
    El juego la pinta encima de la hoja (ya recoloreada), así que la pieza no puede borrar píxeles."""
    import os
    import numpy as np
    sin = np.array(base)
    os.makedirs(os.path.join(out, "piezas"), exist_ok=True)
    vistas = []
    for pieza in piezas:
        equipo.clear()
        equipo.add(pieza)
        con = np.array(hoja()[0])
        equipo.clear()
        cambia = (con != sin).any(axis=2)
        borra = cambia & (con[:, :, 3] == 0)
        if borra.any():
            raise ValueError(f"{pieza} borra {int(borra.sum())} píxeles de la hoja: tiene que cubrirlos")
        capa = np.zeros_like(con)
        capa[cambia] = con[cambia]
        Image.fromarray(capa, "RGBA").save(os.path.join(out, "piezas", f"{pieza}.png"))
        vistas.append(Image.fromarray(con, "RGBA"))
    # vista previa: sin piezas y con cada una
    previa = Image.new("RGBA", (base.width, base.height * (len(vistas) + 1)), (92, 140, 70, 255))
    for k, v in enumerate([base] + vistas):
        previa.alpha_composite(v, (0, k * base.height))
    previa = previa.resize((previa.width * 4, previa.height * 4), Image.NEAREST)
    previas = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "docs", "previews")
    previa.save(os.path.join(previas, f"piezas_{nombre}_x4.png"))
