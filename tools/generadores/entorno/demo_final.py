import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE); sys.path.insert(0, HERE)
os.makedirs('out', exist_ok=True)
SPRITES = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'sprites')
from PIL import Image
import bosque, ruinas, cripta, comunes
from build import build_sheet, room, hero

ronin_d = hero(os.path.join(SPRITES, 'rana_ronin.png'), 0, 0)
ronin_u = hero(os.path.join(SPRITES, 'rana_ronin.png'), 3, 0)
maga_d = hero(os.path.join(SPRITES, 'rana_maga.png'), 0, 0)
maga_r = hero(os.path.join(SPRITES, 'rana_maga.png'), 2, 0)
com, _ = build_sheet('comunes', comunes.tiles(), 'out')
sets = {}
for name, mod in (('bosque', bosque), ('ruinas', ruinas), ('cripta', cripta)):
    lk, meta = build_sheet(name, mod.tiles(), 'out')
    sets[name] = (lk, [(t['name'], t['weight']) for t in meta['tiles'] if t['layer'] == 'suelo'])

def floors(n): return sets[n][1]
salas = [
    ('bosque', 'descanso', [(7, 4, 'fuente'), (5, 6, 'hoguera'), (2, 3, 'arbol'), (12, 3, 'pino'), (2, 8, 'pino'), (12, 8, 'arbol'), (10, 6, 'tocon')],
     [(6 * 32 + 16, 7 * 32 + 26, ronin_u), (4 * 32 + 8, 6 * 32 + 20, maga_r)], {"n": "abierta", "o": "abierta"}),
    ('ruinas', 'tesoro', [(7, 3, 'cofre_cerrado'), (5, 3, 'columna'), (9, 3, 'columna'), (3, 7, 'columna_rota'), (11, 7, 'escombros'), (2, 2, 'vasija'), (12, 2, 'vasija')],
     [(7 * 32 + 16, 6 * 32 + 20, ronin_u), (8 * 32 + 26, 7 * 32 + 10, maga_d)], {"s": "abierta"}),
    ('cripta', 'jefe', [(7, 2, 'portal'), (4, 3, 'pilar'), (10, 3, 'pilar'), (3, 2, 'candelabro'), (11, 2, 'candelabro'), (3, 7, 'lapida'), (11, 7, 'lapida'), (5, 8, 'sarcofago'), (9, 8, 'sarcofago')],
     [(7 * 32 + 16, 5 * 32 + 26, ronin_u), (6 * 32, 6 * 32 + 10, maga_d)], {"s": "abierta", "n": "cerrada"}),
]
for zone, kind, props, actors, doors in salas:
    lk, fl = sets[zone]
    room(zone, lk, com, fl, props, actors, f'out/sala_{zone}_{kind}.png', doors=doors, seed=7)

# objetos animados en movimiento
anim = [('fuente', com['fuente']), ('portal', com['portal']), ('hoguera', com['hoguera']), ('candelabro', sets['cripta'][0]['candelabro'])]
bg = sets['ruinas'][0]['suelo_liso_a'][0]
frames = []
for f in range(8):
    cv = Image.new('RGBA', (len(anim) * 40 + 8, 40))
    for i, (_, fr) in enumerate(anim):
        cv.alpha_composite(bg, (4 + i * 40, 4))
        cv.alpha_composite(fr[(f // 2) % len(fr)], (4 + i * 40, 4))
    frames.append(cv.resize((cv.width * 5, cv.height * 5), Image.NEAREST).convert('RGB'))
frames[0].save('out/objetos_animados.gif', save_all=True, append_images=frames[1:], duration=250, loop=0)
print('ok')
