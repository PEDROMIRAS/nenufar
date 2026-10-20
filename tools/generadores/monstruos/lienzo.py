"""Lienzo de pixel art con paleta por claves, como el de las ranas, pero de cualquier tamaño."""
import numpy as np
from PIL import Image


class Lienzo:
    def __init__(self, tam, paleta):
        self.t = tam
        self.pal = paleta
        self.px = np.full((tam, tam), None, dtype=object)

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.t and 0 <= y < self.t:
            self.px[y, x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(round(y0)), int(round(y1)) + 1):
            for x in range(int(round(x0)), int(round(x1)) + 1):
                self.put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, base, sombra=None, luz=None):
        """Elipse con sombra abajo a la derecha y brillo arriba a la izquierda (luz de los tilesets)."""
        for y in range(self.t):
            for x in range(self.t):
                dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                d = dx * dx + dy * dy
                if d <= 1.0:
                    c = base
                    if sombra and (dx * 0.55 + dy * 0.85) > 0.45:
                        c = sombra
                    elif luz and (dx * 0.6 + dy * 0.8) < -0.55 and d > 0.25:
                        c = luz
                    self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(n - 1, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for ox in range(w):
                self.put(x + ox, y, c)

    def poly(self, puntos, c):
        """Polígono relleno (regla par-impar), para alas, capas y guadañas."""
        ys = [p[1] for p in puntos]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            cortes = []
            for (x0, y0), (x1, y1) in zip(puntos, puntos[1:] + puntos[:1]):
                if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0):
                    cortes.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
            cortes.sort()
            for a, b in zip(cortes[::2], cortes[1::2]):
                for x in range(int(round(a)), int(round(b))):
                    self.put(x, y, c)

    def contorno(self):
        out = self.px.copy()
        for y in range(self.t):
            for x in range(self.t):
                if self.px[y, x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.t and 0 <= ny < self.t and self.px[ny, nx] not in (None, "contorno"):
                        out[y, x] = "contorno"
                        break
        self.px = out

    def imagen(self, golpe=False):
        """Con golpe=True todo se pinta casi blanco: el destello de recibir daño."""
        img = Image.new("RGBA", (self.t, self.t), (0, 0, 0, 0))
        for y in range(self.t):
            for x in range(self.t):
                c = self.px[y, x]
                if c is None:
                    continue
                rgb = self.pal[c]
                if golpe and c != "contorno":
                    rgb = tuple(min(255, int(v * 0.35 + 255 * 0.65)) for v in rgb)
                img.putpixel((x, y), rgb + (255,))
        return img
