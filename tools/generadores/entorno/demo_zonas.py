import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE); sys.path.insert(0, HERE)
os.makedirs('out', exist_ok=True)
SPRITES = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'sprites')
from PIL import Image
import ruinas, cripta, cauce, comunes, zonas_auto as Z
from build import build_sheet, hero
from plantilla import render, LEYENDA
from plantillas_salas import con_ids, PLANTILLAS

com, _ = build_sheet('comunes', comunes.tiles(), 'out')
ronin_u = hero(os.path.join(SPRITES, 'rana_ronin.png'), 3, 0)
ronin_r = hero(os.path.join(SPRITES, 'rana_ronin.png'), 2, 0)
maga_d = hero(os.path.join(SPRITES, 'rana_maga.png'), 0, 0)
maga_u = hero(os.path.join(SPRITES, 'rana_maga.png'), 3, 0)

SALAS = {
 'ruinas': {
  'auto_map': {":": "calzada", "~": "charco", ",": "hierba"},
  'floors': [("suelo_liso", 70), ("suelo_grietas", 15), ("suelo_musgo", 12), ("suelo_rota", 3)],
 },
 'cripta': {
  'auto_map': {":": "alfombra", "~": "fosa"},
  'floors': [("suelo_liso", 80), ("suelo_grietas", 12), ("suelo_huesos", 6), ("suelo_runa", 2)],
 },
 'cauce': {
  'auto_map': {":": "lecho", "~": "lava"},
  'floors': [("suelo_liso_a", 35), ("suelo_liso_b", 35), ("suelo_grietas", 15), ("suelo_guijarros", 10), ("suelo_brasas", 5)],
 },
}
# Personajes de muestra en algunas vistas previas (posición de los pies en píxeles).
ACTORES = {
    'ruinas_combate_01': [(5 * 32 + 16, 5 * 32 + 26, ronin_r), (7 * 32 + 16, 7 * 32 + 20, maga_u)],
    'ruinas_tesoro_01': [(7 * 32 + 16, 5 * 32 + 10, ronin_u), (8 * 32 + 20, 6 * 32 + 10, maga_u)],
    'cripta_combate_01': [(4 * 32 + 16, 5 * 32 + 26, ronin_r), (7 * 32 + 16, 7 * 32 + 20, maga_u)],
    'cripta_jefe_01': [(7 * 32 + 16, 5 * 32 + 20, ronin_u), (7 * 32 + 16, 7 * 32 + 10, maga_u)],
}
mods = {'ruinas': (ruinas, Z.ruinas_auto), 'cripta': (cripta, Z.cripta_auto), 'cauce': (cauce, Z.cauce_auto)}
for zone, cfg in SALAS.items():
    mod, mk = mods[zone]
    lk, _ = build_sheet(zone, mod.tiles(), 'out')
    lk = {**com, **lk}
    auto_np = mk()
    auto = Z.as_images(auto_np)
    # hoja de autotiles y su JSON
    kinds = list(cfg['auto_map'].values())
    sheet = Image.new('RGBA', (16 * 32, len(kinds) * 32))
    meta = {"tileSize": 32, "bitmask": "N=1, E=2, S=4, O=8", "tiles": []}
    for row, kind in enumerate(kinds):
        for b in range(16):
            sheet.paste(auto[f'{kind}_{b}'], (b * 32, row * 32))
            meta["tiles"].append({"name": f"{kind}_{b}", "index": row * 16 + b, "layer": "suelo",
                                  "solid": kind in ("charco", "fosa", "lava"), "autotile": kind, "mask": b})
    sheet.save(f'out/{zone}_autotiles.png')
    json.dump(meta, open(f'out/{zone}_autotiles.json', 'w'), indent=2, ensure_ascii=False)
    if zone not in PLANTILLAS:  # shortcut: el Cauce Seco no tiene plantillas hasta la tarea 4 del plan
        continue
    plant = []
    for id_, tipo, rows in con_ids(zone):
        img = render(rows, lk, auto, ACTORES.get(id_, []), seed=5, auto_map=cfg['auto_map'], floors=cfg['floors'])
        img.convert('RGB').resize((img.width * 2, img.height * 2), Image.NEAREST).save(f'out/plantilla_{id_}.png')
        plant.append({"id": id_, "tipo": tipo, "mapa": rows})
    json.dump({"tamano": [15, 11], "leyenda": LEYENDA, "autotiles": cfg['auto_map'], "plantillas": plant},
              open(f'out/plantillas_{zone}.json', 'w'), indent=2, ensure_ascii=False)
print('ok')
