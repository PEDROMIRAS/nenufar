import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE); sys.path.insert(0, HERE)
os.makedirs('out', exist_ok=True)
SPRITES = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'sprites')
from PIL import Image
import bosque, comunes, autotile as A
from build import build_sheet, hero
from plantilla import render, LEYENDA
from plantillas_salas import con_ids

lk, _ = build_sheet('bosque', bosque.tiles(), 'out')
com, _ = build_sheet('comunes', comunes.tiles(), 'out')
lk = {**com, **lk}
base = bosque.grass(11)
auto = {}
for bits in range(16):
    auto[f'camino_{bits}'] = Image.fromarray(A.path_tile(base, bits, bosque.D, [bosque.G[1], bosque.G[3]], bosque.R, 5), 'RGBA')
    auto[f'agua_{bits}'] = Image.fromarray(A.water_tile(base, bits, [(42, 86, 130), (62, 122, 172), (120, 178, 218), (196, 230, 244)], bosque.G[0], 5), 'RGBA')

ronin_r = hero(os.path.join(SPRITES, 'rana_ronin.png'), 2, 0)
maga_d = hero(os.path.join(SPRITES, 'rana_maga.png'), 0, 0)
# Personajes de muestra en algunas vistas previas (posición de los pies en píxeles).
ACTORES = {
    'bosque_combate_01': [(3 * 32 + 16, 5 * 32 + 24, ronin_r), (7 * 32 + 16, 4 * 32 + 6, maga_d)],
    'bosque_descanso_01': [(6 * 32 + 6, 6 * 32 + 14, ronin_r), (8 * 32 + 26, 6 * 32 + 10, maga_d)],
}
plantillas = []
for id_, tipo, rows in con_ids('bosque'):
    img = render(rows, lk, auto, ACTORES.get(id_, []), seed=3)
    img.convert('RGB').resize((img.width * 2, img.height * 2), Image.NEAREST).save(f'out/plantilla_{id_}.png')
    plantillas.append({"id": id_, "tipo": tipo, "mapa": rows})
print('ok')

sheet = Image.new('RGBA', (16 * 32, 2 * 32))
meta = {"tileSize": 32, "bitmask": "N=1, E=2, S=4, O=8", "tiles": []}
for row, kind in enumerate(('camino', 'agua')):
    for b in range(16):
        sheet.paste(auto[f'{kind}_{b}'], (b * 32, row * 32))
        meta["tiles"].append({"name": f"{kind}_{b}", "index": row * 16 + b, "layer": "suelo",
                              "solid": kind == 'agua', "autotile": kind, "mask": b})
sheet.save('out/bosque_autotiles.png')
json.dump(meta, open('out/bosque_autotiles.json', 'w'), indent=2, ensure_ascii=False)
json.dump({"tamano": [15, 11], "leyenda": LEYENDA, "autotiles": {":": "camino", "~": "agua"},
           "plantillas": plantillas},
          open('out/plantillas_bosque.json', 'w'), indent=2, ensure_ascii=False)
