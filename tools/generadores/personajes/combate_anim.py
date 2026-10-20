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


def derrota(img, pie_y=30):
    """Dos fotogramas: se encoge sobre los pies y luego queda tumbada en el suelo."""
    s = img.width
    caja = img.getbbox()
    figura = img.crop(caja)
    encogida = figura.resize((figura.width, max(1, round(figura.height * 0.75))), Image.NEAREST)
    f0 = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    f0.alpha_composite(encogida, ((s - encogida.width) // 2, pie_y + 1 - encogida.height))
    tumbada = figura.rotate(90, expand=True)
    tumbada = tumbada.crop(tumbada.getbbox())
    f1 = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    f1.alpha_composite(tumbada, (max(0, (s - tumbada.width) // 2), pie_y + 1 - tumbada.height))
    return [f0, f1]
