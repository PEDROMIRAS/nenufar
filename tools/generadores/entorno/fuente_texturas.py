"""Texturas de la fuente en 3D, recortadas de la imagen de referencia (la 14 de `docs/superpowers/mockups/cauce-seco-referencias`):
piedra y agua en mosaico espejo (para que no se vea la costura al envolverlas).
Salida: public/assets/sprites/fuente/{piedra,agua}.png. Uso (desde la raíz del repo): python tools/generadores/entorno/fuente_texturas.py"""
import os

from PIL import Image, ImageEnhance, ImageOps

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
REF = os.path.join(REPO, "docs", "superpowers", "mockups", "cauce-seco-referencias", "14-fuente.png")
SALIDA = os.path.join(REPO, "public", "assets", "sprites", "fuente")


def espejo(im):
    """El recorte y sus reflejos, en 2x2: se repite sin costuras."""
    w, h = im.size
    o = Image.new("RGB", (2 * w, 2 * h))
    o.paste(im, (0, 0)); o.paste(ImageOps.mirror(im), (w, 0))
    o.paste(ImageOps.flip(im), (0, h)); o.paste(ImageOps.flip(ImageOps.mirror(im)), (w, h))
    return o


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    ref = Image.open(REF).convert("RGB")
    # La piedra de la imagen es oscura y, con la luz de la sala, se hunde: se aclara antes de guardarla
    espejo(ImageEnhance.Brightness(ref.crop((330, 520, 430, 585)).resize((96, 62), Image.LANCZOS)).enhance(2.1)).save(os.path.join(SALIDA, "piedra.png"))
    espejo(ref.crop((282, 444, 338, 472)).resize((64, 32), Image.LANCZOS)).save(os.path.join(SALIDA, "agua.png"))
    print("ok")
