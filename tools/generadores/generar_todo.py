"""Regenera todo el arte del juego y deja cada archivo en su sitio del repositorio.

Uso (desde la raíz del repo):
    pip install -r tools/requirements.txt
    python tools/generadores/generar_todo.py

Las semillas son fijas: si no cambias los scripts, el resultado es idéntico píxel a píxel.
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SPRITES = os.path.join(REPO, "public", "assets", "sprites")
TILESETS = os.path.join(REPO, "public", "assets", "tilesets")
SALAS = os.path.join(REPO, "src", "data", "salas")
PREVIEWS = os.path.join(REPO, "docs", "previews")
PERSONAJES = os.path.join(HERE, "personajes")
ENTORNO = os.path.join(HERE, "entorno")
OUT = os.path.join(ENTORNO, "out")


def run(script, cwd):
    print(f"> {script}")
    subprocess.run([sys.executable, script], cwd=cwd, check=True)


def copy(name, dest, rename=None):
    shutil.copy2(os.path.join(OUT, name), os.path.join(dest, rename or name))


def main():
    for d in (SPRITES, TILESETS, SALAS, PREVIEWS):
        os.makedirs(d, exist_ok=True)
    # Las vistas previas de plantillas se rehacen enteras: así no quedan las de plantillas renombradas o borradas.
    for d in (OUT, PREVIEWS):
        for f in os.listdir(d) if os.path.isdir(d) else ():
            if f.startswith("plantilla_") and f.endswith(".png"):
                os.remove(os.path.join(d, f))

    # 1. Personajes (escriben directamente en public/assets/sprites y docs/previews)
    run("rana_ronin.py", PERSONAJES)
    run("rana_maga.py", PERSONAJES)
    run("generar.py", os.path.join(HERE, "monstruos"))
    run("efectos.py", os.path.join(HERE, "monstruos"))

    # 2. Entorno (escribe en entorno/out y se copia a su sitio)
    for script in ("demo_final.py", "demo_plantilla.py", "demo_zonas.py"):
        run(script, ENTORNO)

    for zona in ("bosque", "ruinas", "cripta", "comunes"):
        copy(f"{zona}.png", TILESETS)
        copy(f"{zona}.json", TILESETS)
        copy(f"{zona}_x3.png", PREVIEWS)
    for zona in ("bosque", "ruinas", "cripta"):
        copy(f"{zona}_autotiles.png", TILESETS)
        copy(f"{zona}_autotiles.json", TILESETS)
        copy(f"plantillas_{zona}.json", SALAS)
    for f in os.listdir(OUT):
        if f.startswith("plantilla_") and f.endswith(".png"):
            copy(f, PREVIEWS)
    copy("objetos_animados.gif", PREVIEWS)
    copy("portada_sala.png", os.path.join(REPO, "public", "assets"), "portada.png")

    # 3. Portada: imagen para compartir e icono, a partir de la sala de la portada y los sprites
    run("portada.py", HERE)
    print("Listo: sprites, tilesets, plantillas y vistas previas actualizados.")


if __name__ == "__main__":
    main()
