"""Portada del juego: imagen para compartir el enlace (og.png, 1200x630) e icono de la pestaña.

Parte del fondo de la portada (la sala de descanso del Bosque, sin personajes) y de los sprites de
las ranas y los monstruos. Uso (desde la raíz del repo): python tools/generadores/portada.py
"""
import os

from PIL import Image, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
PUBLIC = os.path.join(REPO, "public")
SPRITES = os.path.join(PUBLIC, "assets", "sprites")
S = 32


def fotograma(hoja, fila, col, tam=S):
    return Image.open(os.path.join(SPRITES, hoja)).convert("RGBA").crop((col * tam, fila * tam, (col + 1) * tam, (fila + 1) * tam))


def pegar(fondo, sprite, escala, pie_x, pie_y, ancla_y):
    """Pega un sprite escalado con sus pies (ancla) en (pie_x, pie_y)."""
    grande = sprite.resize((sprite.width * escala, sprite.height * escala), Image.NEAREST)
    fondo.alpha_composite(grande, (pie_x - grande.width // 2, pie_y - ancla_y * escala))


def main():
    sala = Image.open(os.path.join(PUBLIC, "assets", "portada.png")).convert("RGBA")
    # Imagen para compartir: la sala a ×3, algo oscurecida, con las ranas junto a la fuente.
    fondo = sala.resize((sala.width * 3, sala.height * 3), Image.NEAREST)
    fondo = ImageEnhance.Brightness(fondo).enhance(0.7)
    pegar(fondo, fotograma("rana_ronin.png", 2, 0), 6, 498, 640, 30)  # mirando a la derecha
    pegar(fondo, fotograma("rana_maga.png", 1, 0), 6, 942, 640, 30)  # mirando a la izquierda
    pegar(fondo, fotograma("monstruos/limo.png", 1, 0), 4, 1180, 760, 30)
    pegar(fondo, fotograma("monstruos/murcielago.png", 0, 0), 4, 1110, 430, 30)
    x0 = (fondo.width - 1200) // 2
    fondo.crop((x0, 240, x0 + 1200, 240 + 630)).convert("RGB").save(os.path.join(PUBLIC, "og.png"))

    # Icono: la cabeza de la ronin de frente, a 64x64.
    cara = fotograma("rana_ronin.png", 0, 0)
    cara = cara.crop(cara.getbbox()).crop((0, 0, cara.getbbox()[2] - cara.getbbox()[0], 22))
    lado = max(cara.size)
    icono = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    icono.alpha_composite(cara, ((lado - cara.width) // 2, (lado - cara.height) // 2))
    icono.resize((64, 64), Image.NEAREST).save(os.path.join(PUBLIC, "favicon.png"))
    print("ok: og.png, favicon.png")


if __name__ == "__main__":
    main()
