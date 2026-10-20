import type { ConsumibleJson, EstadoJson, HabilidadJson, ReglasCombate } from './types';

// Textos de ayuda del combate, sacados de los datos: si se reequilibra un número, la ayuda cambia sola.

const pct = (fraccion: number): string => `${Math.round(fraccion * 100)} %`;

/** «+50 % de defensa» / «−30 % de defensa» para un multiplicador de estadística. */
function cambio(multiplicador: number, que: string): string {
  const signo = multiplicador >= 1 ? '+' : '−';
  return `${signo}${pct(Math.abs(multiplicador - 1))} de ${que}`;
}

/** Qué hace un estado mientras dura: «−8 % de vida por turno durante 3 turnos». */
export function describirEstado(e: EstadoJson): string {
  const efectos: string[] = [];
  if (e.danioPorTurno) efectos.push(`pierde el ${pct(e.danioPorTurno)} de su vida por turno`);
  if (e.pierdeTurno) efectos.push('pierde su turno');
  if (e.ataque) efectos.push(cambio(e.ataque, 'ataque'));
  if (e.magia) efectos.push(cambio(e.magia, 'magia'));
  if (e.defensa) efectos.push(cambio(e.defensa, 'defensa'));
  const duracion = e.turnos === 1 ? 'durante 1 turno' : `durante ${e.turnos} turnos`;
  return `${efectos.join(' y ')} ${duracion}`;
}

const A_QUIEN: Record<HabilidadJson['objetivo'], string> = {
  uno: 'a un enemigo',
  todos: 'a todos los enemigos',
  propio: '',
  aliado: 'a un aliado',
};

export function describirHabilidad(h: HabilidadJson, estados: Record<string, EstadoJson>): string {
  const partes: string[] = [];
  if (h.danio) {
    const fisico = h.danio.tipo === 'fisico';
    const base = `${pct(h.danio.poder)} de tu ${fisico ? 'ataque' : 'magia'}`;
    partes.push(`Daño ${fisico ? 'físico' : 'mágico'} (${base}) ${A_QUIEN[h.objetivo]}`);
    if (h.danio.criticoSeguro) partes.push('Siempre crítico');
  }
  if (h.cura) partes.push(`Recupera el ${pct(h.cura)} de tus PV`);
  const estado = h.estado ? estados[h.estado] : undefined;
  if (estado) {
    partes.push(
      h.objetivo === 'propio'
        ? `${estado.nombre}: ${describirEstado(estado)}`
        : `Causa ${estado.nombre} (${describirEstado(estado)})`,
    );
  }
  return `${partes.join('. ')}.`;
}

export function describirConsumible(
  c: ConsumibleJson,
  estados: Record<string, EstadoJson>,
): string {
  const partes: string[] = [];
  if (c.pv) partes.push(`Recupera ${c.pv} PV`);
  if (c.pm) partes.push(`Recupera ${c.pm} PM`);
  if (c.quitaEstado) partes.push(`Quita el ${estados[c.quitaEstado]?.nombre ?? c.quitaEstado}`);
  return `${partes.join(' y ')}.`;
}

/** Ayuda de las cinco acciones del menú principal, en su orden. */
export function describirAcciones(reglas: ReglasCombate): string[] {
  const { defender, huida } = reglas;
  return [
    'Golpe normal a un enemigo.',
    'Técnicas especiales que gastan PM.',
    'Usa algo del inventario.',
    `Recibes un ${pct(1 - defender.factorDanio)} menos de daño hasta tu turno y recuperas ${defender.pm} PM.`,
    `${pct(huida.base)} de escapar, +${pct(huida.porIntento)} por intento. Contra jefes no se puede.`,
  ];
}

/** Parte un texto en líneas de como mucho `max` caracteres, sin cortar palabras. */
export function partirEnLineas(texto: string, max: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(' ')) {
    if (actual && actual.length + 1 + palabra.length > max) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}
