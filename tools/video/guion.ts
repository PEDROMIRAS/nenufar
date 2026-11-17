/** El guion aprobado (docs/superpowers/specs/2026-11-16-video-demo-design.md): una entrada por plano. */
export interface Plano {
  /** Nombre del archivo del plano en planos/ y de su toma (sin extensión). */
  id: string;
  /** Lo que dice la voz en off. */
  voz: string;
  /** Rótulo del tercio inferior, si lo lleva. */
  rotulo?: string;
}

export const GUION: readonly Plano[] = [
  {
    id: '01_portada',
    voz: 'Hace mil años, la luna se apagó y el Rey sin Charca se bebió el agua del mundo. Esta noche, vuelve a apagarse.',
  },
  {
    id: '02_ranas',
    voz: 'Elige a tu heroína: la rana ronin, con su katana, o la rana maga, con su fuego morado.',
  },
  {
    id: '03_zonas',
    voz: 'Recorre cuatro zonas que cambian en cada partida: el Bosque de la Última Lluvia, las Ruinas de la Orden, la Cripta de los Héroes y el Cauce Seco.',
    rotulo: 'Salas generadas por semilla · HD-2D con Three.js',
  },
  {
    id: '04_combate',
    voz: 'Al tocar a un monstruo empieza un combate por turnos. Cada enemigo anuncia su golpe más fuerte un turno antes: tú decides si rematarlo o defenderte.',
    rotulo: 'Combate como máquina de estados · lógica testeada',
  },
  {
    id: '05_variedad',
    voz: 'Presagios, altares, desafíos y un viejo ermitaño cambian las reglas de cada partida.',
  },
  {
    id: '06_jefes',
    voz: 'Al final de cada zona aguarda un guardián. Y detrás de todos ellos, el Rey sin Charca.',
  },
  {
    id: '07_movil',
    voz: 'Nenúfar. Juégalo gratis en el navegador, en el ordenador o en el móvil.',
    rotulo: 'pedromiras.github.io/nenufar · TypeScript · Three.js · sin motor',
  },
];
