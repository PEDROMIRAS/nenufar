import { disposicionPausaCacheada, filasLista } from '../core/disposicion';
import type { Rect } from '../core/menu';
import { VERTICAL } from '../data/datos';
import { dibujarControles } from './controles';
import { dibujarCaja, dibujarFila, dibujarMarco, dibujarTitulo, PALETA, rombo } from './marco';
import { interfaz, rellenarArea } from './pantalla';
import {
  barraConTexto,
  COLOR,
  NOMBRE_SECCION,
  RECT_CALIDAD,
  RECT_EFECTOS,
  RECT_MUSICA,
  RECT_SONIDO,
  SECCIONES,
  type VistaInventario,
} from './pausa';
import { COLOR_BARRA } from './combate';
import { dibujarFotograma } from './recursos';
import { escribir } from './texto';

/**
 * El inventario en la interfaz alta (móvil de pie): las cinco secciones como pestañas arriba, el contenido a
 * ancho completo en medio y Seguir y Salir como botones abajo. Las medidas salen de `disposicionPausa`.
 */

/** Sangría del contenido dentro del marco del panel, y alto de una línea de texto de la fuente normal. */
const SANGRIA = 12;
const LINEA = 14;

/** Filas de la sección Objetos y su caja (para tocar), recordadas mientras no cambian el tamaño ni el número. */
let objetos: { n: number; ancho: number; alto: number; caja: Rect; fila: number } | null = null;

/** Dónde caen las filas de consumibles y cuánto mide cada una; sirve para dibujar y para tocar. */
export function objetosAltos(n: number): { caja: Rect; fila: number } {
  if (
    !objetos ||
    objetos.n !== n ||
    objetos.ancho !== interfaz.ancho ||
    objetos.alto !== interfaz.alto
  ) {
    const c = disposicionPausaCacheada(interfaz.ancho, interfaz.alto, VERTICAL).contenido;
    // Debajo de las filas hay que dejar sitio al nombre y la descripción del elegido y a los PV y PM.
    const y0 = c.y + 34;
    const { filas, alto } = filasLista(n, y0, c.y + c.alto - 130, interfaz.ancho, VERTICAL);
    const caja = { x: c.x + SANGRIA, y: y0, ancho: c.ancho - 2 * SANGRIA, alto };
    objetos = { n, ancho: interfaz.ancho, alto: interfaz.alto, caja, fila: filas[0]?.alto ?? 0 };
  }
  return objetos;
}

export function dibujarInventarioAlto(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  ctx.fillStyle = 'rgba(8, 10, 14, 0.94)';
  rellenarArea(ctx);
  const p = disposicionPausaCacheada(interfaz.ancho, interfaz.alto, VERTICAL);
  dibujarPestanas(ctx, v, p.pestanas);
  dibujarMarco(ctx, p.contenido.x, p.contenido.y, p.contenido.ancho, p.contenido.alto);
  if (v.pagina === 'heroina') dibujarHeroina(ctx, v, p.contenido);
  else if (v.pagina === 'objetos') dibujarObjetos(ctx, v, p.contenido);
  else dibujarAjustes(ctx, p.contenido);
  for (let i = 0; i < 2; i++) {
    const b = p.botones[i]!;
    const elegida = v.elegida === 5 + i && !v.enObjetos;
    const s = SECCIONES[5 + i]!;
    dibujarCaja(ctx, b.x, b.y, b.ancho, b.alto, elegida ? 'elegida' : 'normal');
    const texto = v.ficha.detalles[s] || NOMBRE_SECCION[s];
    escribir(
      ctx,
      texto,
      b.x + b.ancho / 2,
      b.y + (b.alto - 12) / 2,
      elegida ? PALETA.elegida : PALETA.claro,
      'center',
    );
  }
}

/** Las cinco secciones arriba: el cursor la ilumina y un rombo marca la que se ve debajo. */
function dibujarPestanas(ctx: CanvasRenderingContext2D, v: VistaInventario, rs: Rect[]): void {
  for (let i = 0; i < 5; i++) {
    const r = rs[i]!;
    const s = SECCIONES[i]!;
    const elegida = i === v.elegida && !v.enObjetos;
    const apagada = s === 'mejorar' && !v.ficha.mejorar;
    const estado = apagada
      ? elegida
        ? 'elegidaApagada'
        : 'apagada'
      : elegida
        ? 'elegida'
        : 'normal';
    dibujarCaja(ctx, r.x, r.y, r.ancho, r.alto, estado);
    const color = apagada ? PALETA.apagada : elegida ? PALETA.elegida : PALETA.claro;
    const detalle = v.ficha.detalles[s];
    const x = r.x + r.ancho / 2;
    if (detalle) {
      escribir(ctx, NOMBRE_SECCION[s], x, r.y + 5, color, 'center');
      escribir(ctx, detalle, x, r.y + 19, PALETA.cursor, 'center');
    } else escribir(ctx, NOMBRE_SECCION[s], x, r.y + (r.alto - 12) / 2, color, 'center');
    if (s === v.pagina) rombo(ctx, x, r.y + r.alto + 4, 6, PALETA.cursor);
  }
}

/** Retrato y barras arriba; debajo, Estadísticas y Habilidades en dos columnas y, a ancho completo, Equipo. */
function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaInventario, c: Rect): void {
  const f = v.ficha;
  const x0 = c.x + SANGRIA;
  const ancho = c.ancho - 2 * SANGRIA;
  const centro = x0 + 40;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(centro - 20, c.y + 105, 40, 4);
  dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, centro, c.y + 108, 3);
  const x = x0 + 96;
  escribir(ctx, f.nombre, x, c.y + 14, PALETA.texto);
  escribir(ctx, f.nivel, x, c.y + 30, PALETA.claro);
  barraConTexto(ctx, x, c.y + 54, 'PV', f.pv / f.pvMax, COLOR_BARRA.pv, f.textoPv);
  barraConTexto(ctx, x, c.y + 70, 'PM', f.pm / Math.max(1, f.pmMax), COLOR_BARRA.pm, f.textoPm);
  barraConTexto(ctx, x, c.y + 86, 'PX', f.px / Math.max(1, f.pxSiguiente), PALETA.px, f.textoPx);

  const columna = (ancho - 12) / 2;
  const derecha = x0 + columna + 12;
  const arriba = c.y + 124;
  dibujarTitulo(ctx, x0, arriba, columna, 'Estadísticas');
  for (let i = 0; i < f.estadisticas.length; i++)
    escribir(ctx, f.estadisticas[i]!, x0, arriba + 22 + i * 13, PALETA.texto);
  dibujarTitulo(ctx, derecha, arriba, columna, 'Habilidades');
  for (let i = 0; i < f.habilidades.length; i++)
    escribir(ctx, f.habilidades[i]!, derecha, arriba + 22 + i * LINEA, PALETA.texto);

  const fin = Math.max(f.estadisticas.length * 13, f.habilidades.length * LINEA);
  const yEquipo = arriba + 22 + fin + 8;
  dibujarTitulo(ctx, x0, yEquipo, ancho, 'Equipo');
  for (let i = 0; i < f.equipo.length; i++)
    escribir(ctx, f.equipo[i]!, x0, yEquipo + 22 + i * 13, PALETA.texto);
  if (f.presagio.length > 0) {
    const yPresagio = yEquipo + 22 + f.equipo.length * 13 + 8;
    dibujarTitulo(ctx, x0, yPresagio, ancho, 'Presagio');
    for (let i = 0; i < f.presagio.length; i++)
      escribir(
        ctx,
        f.presagio[i]!,
        x0,
        yPresagio + 22 + i * 13,
        i === 0 ? PALETA.claro : PALETA.texto,
      );
  }
}

/** Los consumibles en filas; debajo, qué hace el elegido; al pie, los PV y PM. */
function dibujarObjetos(ctx: CanvasRenderingContext2D, v: VistaInventario, c: Rect): void {
  const f = v.ficha;
  const x0 = c.x + SANGRIA;
  const ancho = c.ancho - 2 * SANGRIA;
  dibujarTitulo(ctx, x0, c.y + 12, ancho, 'Objetos');
  const { caja, fila } = objetosAltos(f.objetos.length);
  for (let i = 0; i < f.objetos.length; i++) {
    const o = f.objetos[i]!;
    const elegido = v.enObjetos && i === v.objeto;
    const estado = o.disponible
      ? elegido
        ? 'elegida'
        : 'normal'
      : elegido
        ? 'elegidaApagada'
        : 'apagada';
    dibujarFila(ctx, caja.x, caja.y + i * fila, caja.ancho, fila, o.nombre, o.cantidad, estado);
  }
  const o = f.objetos[v.objeto];
  if (o) {
    const y = caja.y + caja.alto + 16;
    dibujarTitulo(ctx, x0, y, ancho, o.nombre);
    for (let i = 0; i < o.lineas.length; i++)
      escribir(ctx, o.lineas[i]!, x0, y + 24 + i * LINEA, PALETA.texto);
  }
  const yPie = c.y + c.alto - 24;
  escribir(ctx, 'PV', x0, yPie, COLOR.etiqueta);
  escribir(ctx, f.textoPv, x0 + 22, yPie, PALETA.texto);
  escribir(ctx, 'PM', x0 + 110, yPie, COLOR.etiqueta);
  escribir(ctx, f.textoPm, x0 + 132, yPie, PALETA.texto);
}

/** Etiquetas de los controles HTML (ya colocados uno bajo otro) y, debajo, la lista de controles del juego. */
function dibujarAjustes(ctx: CanvasRenderingContext2D, c: Rect): void {
  const x0 = c.x + SANGRIA;
  const ancho = c.ancho - 2 * SANGRIA;
  dibujarTitulo(ctx, x0, c.y + 12, ancho, 'Ajustes');
  escribir(ctx, 'Sonido', RECT_SONIDO.x + RECT_SONIDO.ancho + 8, RECT_SONIDO.y + 14, PALETA.texto);
  escribir(
    ctx,
    'Calidad',
    RECT_CALIDAD.x + RECT_CALIDAD.ancho + 8,
    RECT_CALIDAD.y + 14,
    PALETA.texto,
  );
  escribir(ctx, 'Música', RECT_MUSICA.x, RECT_MUSICA.y - 16, COLOR.etiqueta);
  escribir(ctx, 'Efectos', RECT_EFECTOS.x, RECT_EFECTOS.y - 16, COLOR.etiqueta);
  const y = RECT_EFECTOS.y + RECT_EFECTOS.alto + 14;
  dibujarTitulo(ctx, x0, y, ancho, 'Controles');
  dibujarControles(ctx, x0, y + 24);
}
