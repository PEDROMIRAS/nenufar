// Fin de la partida y del reto del día: récords, logros, la tarjeta final y la vuelta a la portada.
import { anotarReto, textoFecha, type Fecha, type ResultadoReto } from '../core/reto';
import { EscenaFinReto } from '../escenas/finReto';
import {
  actualizarRecords,
  anotarLogros,
  esNuevoRecord,
  formatearTiempo,
  type Resumen,
} from '../core/records';
import { logrosNuevos, monstruosDelMundo, type Logro } from '../core/logros';
import logrosJson from '../data/logros.json';
import { DIFICULTADES, HEROES, MONSTRUOS } from '../data/datos';
import historia from '../data/historia.json';
import zonas from '../data/zonas.json';
import { EscenaMensaje } from '../escenas/mensaje';
import { PALETA } from '../render/marco';
import {
  borrarPartida,
  cargarRecords,
  cargarReto,
  guardarAjustes,
  guardarRecords,
  guardarReto,
} from '../render/almacen';
import { sesion, type Partida, claveDe, monstruo } from './partida';
import { contar, paginas } from './relato';

export const LOGROS: readonly Logro[] = logrosJson.logros;
/** Lo que miran los logros que no está en la partida: qué ranas y qué monstruos existen. */
export const MUNDO = { heroes: Object.keys(HEROES), monstruos: monstruosDelMundo(MONSTRUOS) };

export const VOLVER_AL_TITULO = 'Pulsa o toca para volver al título';

/** Vuelve al título para empezar otra partida con un mapa nuevo (sin la semilla de la URL). */
export const empezarOtra = (): void => {
  sesion.enCurso = false;
  borrarPartida();
  location.assign(location.pathname);
};

/** Vuelve a la portada sin tocar la partida guardada (desde el reto del día, que no guarda nada). */
export const volverAPortada = (): void => {
  sesion.enCurso = false;
  location.assign(location.pathname);
};

/** La fecha de hoy en el navegador; en desarrollo, `?fecha=AAAA-MM-DD` la fuerza. */
export function hoy(): Fecha {
  const pedida = import.meta.env.DEV
    ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(new URLSearchParams(location.search).get('fecha') ?? '')
    : null;
  if (pedida) return { anio: Number(pedida[1]), mes: Number(pedida[2]), dia: Number(pedida[3]) };
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/**
 * Fin del reto del día: apunta el resultado en el récord de hoy de esa rana y enseña la tarjeta final, con «Otra vez»
 * (la misma rana y la misma fecha, aunque ya sea otro día) y «Portada».
 */
export function terminarReto(partida: Partida, victoria: boolean): void {
  const reto = partida.reto;
  const heroe = partida.luchadora.heroe;
  if (!reto || !heroe) return volverAPortada();
  sesion.retoEnJuego = null;
  const resultado: ResultadoReto = { victoria, segundos: reto.segundos, ...reto.progreso() };
  const clave = claveDe(HEROES, heroe);
  const fecha = textoFecha(reto.fecha);
  const { estado, nuevo } = anotarReto(cargarReto(), fecha, clave, resultado);
  guardarReto(estado);
  // Si otra pestaña ya jugó un día más reciente, el intento no se apunta y la tarjeta lo dice.
  const apuntado = estado.fecha === fecha;
  const mejor = (apuntado ? estado.mejores[clave] : null) ?? resultado;
  partida.pila.cambiar(
    new EscenaFinReto(
      {
        titulo: victoria ? '¡Guardián vencido!' : 'Fin del reto',
        resultado: victoria
          ? `Tiempo: ${formatearTiempo(resultado.segundos)}`
          : `Caíste en la sala ${resultado.sala} de ${resultado.de}`,
        mejor: apuntado
          ? `Tu mejor de hoy con la ${heroe.nombre.replace(/^Rana /, 'rana ')}`
          : 'No cuenta: ya jugaste un día más reciente',
        mejorValor: mejor.victoria
          ? `Victoria en ${formatearTiempo(mejor.segundos)}`
          : `Sala ${mejor.sala} de ${mejor.de}`,
        nuevo,
        dias: `Días jugados: ${estado.dias}`,
      },
      () => sesion.reiniciarReto(heroe, reto.fecha),
      volverAPortada,
    ),
  );
}

/** Fin de la partida: guarda los récords y enseña el resumen. */
export function terminarPartida(partida: Partida, victoria: boolean): void {
  // Morir o ganar acaba la partida: no hay nada que recuperar.
  sesion.enCurso = false;
  borrarPartida();
  const l = partida.luchadora;
  const resumen: Resumen = {
    victoria,
    heroina: l.nombre,
    nivel: l.nivel,
    zona: partida.zona,
    vencidos: partida.vencidos,
    segundos: (performance.now() - partida.inicio) / 1000,
    dificultad: claveDe(DIFICULTADES, partida.dificultad),
    heroe: l.heroe ? claveDe(HEROES, l.heroe) : '',
    objetosUsados: partida.inventario.usados,
    contraHeredada: partida.rival !== monstruo(zonas.jefeFinal).nombre,
  };
  const records = cargarRecords();
  const nuevoRecord = esNuevoRecord(records, resumen);
  const actualizados = actualizarRecords(records, resumen);
  const nuevos = logrosNuevos(actualizados, resumen, MUNDO, LOGROS);
  guardarRecords(anotarLogros(actualizados, nuevos));
  // Quien vence al jefe final ocupa su lugar: la próxima partida la espera a ella en la Cripta.
  if (victoria) guardarAjustes({ senora: l.nombre });
  const lineas = [
    `${resumen.heroina}, nivel ${resumen.nivel} (${partida.dificultad.nombre})`,
    victoria ? `Has derrotado a ${partida.rival}` : `Caíste en: ${resumen.zona}`,
    `Monstruos vencidos: ${resumen.vencidos}`,
    `Tiempo: ${formatearTiempo(resumen.segundos)}`,
    ...(nuevoRecord ? ['', `¡Nuevo récord en ${partida.dificultad.nombre}!`] : []),
    ...nuevos.map((clave) => `Logro: ${LOGROS.find((l) => l.clave === clave)?.nombre ?? clave}`),
  ];
  const textos = victoria ? (l.heroe?.historia.final ?? []) : [historia.derrota];
  contar(partida.pila, paginas(textos), () =>
    partida.pila.cambiar(
      victoria
        ? new EscenaMensaje('¡Victoria!', PALETA.elegida, lineas, VOLVER_AL_TITULO, empezarOtra)
        : new EscenaMensaje(
            'Fin de la partida',
            PALETA.peligro,
            lineas,
            VOLVER_AL_TITULO,
            empezarOtra,
          ),
    ),
  );
}
