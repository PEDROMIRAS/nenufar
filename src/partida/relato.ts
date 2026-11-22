// La historia: páginas de texto encadenadas, carteles de zona, presagios y el nombre del jefe final.
import { limpiarNombre } from '../core/nombre';
import historia from '../data/historia.json';
import zonas from '../data/zonas.json';
import { REGLAS } from '../data/datos';
import { EscenaHabilidades } from '../escenas/habilidades';
import { EscenaMensaje } from '../escenas/mensaje';
import { type PilaEscenas } from '../escenas/pila';
import { LARGO_NOMBRE } from '../render/nombre';
import { cargarAjustes } from '../render/almacen';
import { ORDEN, type Partida, monstruo } from './partida';

/** Una pantalla de la historia. */
export interface Pagina {
  titulo: string;
  texto: string;
}

export const COLOR_HISTORIA = '#c9b6ff';
export const SEGUIR = 'Pulsa o toca para seguir';

/** Apila las páginas de la historia una tras otra encima de lo que haya; al pasar la última, sigue. */
export function contar(pila: PilaEscenas, paginas: readonly Pagina[], alFinal: () => void): void {
  const [primera, ...resto] = paginas;
  if (!primera) {
    alFinal();
    return;
  }
  pila.apilar(
    new EscenaMensaje(primera.titulo, COLOR_HISTORIA, [primera.texto], SEGUIR, () => {
      pila.desapilar();
      contar(pila, resto, alFinal);
    }),
  );
}

/** Apila la pantalla Habilidades; al cerrarla (con las equipadas que debe), la quita y sigue. */
export function elegirHabilidades(partida: Partida, alCerrar: () => void): void {
  partida.pila.apilar(
    new EscenaHabilidades(partida.luchadora, REGLAS.estados, () => {
      partida.pila.desapilar();
      alCerrar();
    }),
  );
}

/** Páginas sin título, una por texto. */
export const paginas = (textos: readonly string[]): Pagina[] =>
  textos.map((texto) => ({ titulo: '', texto }));

/** Página del presagio de la zona, tras su cartel (ninguna si no hay). */
export function paginaPresagio(partida: Partida): Pagina[] {
  const p = partida.presagio;
  return p ? [{ titulo: `Presagio: ${p.nombre}`, texto: p.descripcion }] : [];
}

/** Cartel de la zona `indice` al entrar: su nombre largo y una o dos líneas. */
export function cartel(indice: number): Pagina {
  const zona = historia.zonas[ORDEN[indice] ?? 'bosque'];
  return { titulo: zona.nombre, texto: zona.cartel };
}

/** Nombre del jefe final de esta partida, con el de la última heroína que lo venció si la hubo. */
export function tituloRival(): string {
  const senora = limpiarNombre(cargarAjustes().senora, '', LARGO_NOMBRE);
  return senora
    ? historia.jefeFinal.heredado.replace('{nombre}', senora)
    : monstruo(zonas.jefeFinal).nombre;
}
