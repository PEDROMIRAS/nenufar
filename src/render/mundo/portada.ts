import type { Sala, Tile } from '../../core/sala';
import type { Direccion, Hd2dJson, ZonaHd2d } from '../../core/types';
import type { Sprite } from '../recursos';
import type { Actor, Mundo, VistaSala } from './mundo';

/** Lo que la portada necesita del mundo 3D: montarlo al entrar, dibujarlo y soltarlo al salir. */
export interface Portada3d {
  preparar: () => void;
  dibujar: (tiempo: number) => void;
  vaciar: () => void;
}

/** La sala de la portada en 3D, con las ranas junto a la fuente mirándose y dos monstruos acechando. */
export function crearPortada(
  mundo: Mundo,
  datos: Hd2dJson['portada'],
  aspecto: ZonaHd2d,
  sala: Sala,
  catalogo: ReadonlyMap<string, Tile>,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  sprites: { ronin: Sprite; maga: Sprite; limo?: Sprite; murcielago?: Sprite },
): Portada3d {
  let vista: VistaSala | null = null;
  // Cada actor con su sitio, animación, dirección y desfase (para que no se muevan a la vez).
  let actores: [Actor, number[], string, Direccion, number][] = [];
  return {
    preparar: () => {
      mundo.prepararZona(aspecto, imagenes, catalogo, tam);
      const v = mundo.montar(sala, [], datos.semilla, datos.encuadre);
      vista = v;
      const { maga, limo, murcielago } = sprites;
      actores = [[mundo.crearActor(v, maga), datos.maga, 'idle', 'left', 0.4]];
      if (limo) actores.push([mundo.crearActor(v, limo), datos.limo, 'idle', 'left', 0]);
      if (murcielago)
        actores.push([mundo.crearActor(v, murcielago), datos.murcielago, 'walk', 'down', 0]);
    },
    dibujar: (tiempo) => {
      if (!vista) return;
      for (const [a, [x = 0, y = 0], anim, dir, fase] of actores) {
        mundo.colocarActor(a, x, y, anim, dir, tiempo + fase);
      }
      const [x = 0, y = 0] = datos.ronin;
      mundo.dibujar(vista, sprites.ronin, x, y, 'idle', 'right', tiempo, 1, 0, tiempo);
    },
    vaciar: () => {
      mundo.vaciar();
      vista = null;
      actores = [];
    },
  };
}
