import { area, rellenarArea } from './pantalla';
import { escribir, FUENTE, FUENTE_GRANDE } from './texto';

/**
 * Estilo de los menús de combate e inventario (2026-10-26): el de Octopath (doble filete, rombos en
 * las esquinas, brillo y rombo de cursor) en el lavanda de Nenúfar. Bocetos en docs/superpowers/mockups/.
 */
export const PALETA = {
  fondoArriba: 'rgba(18,14,32,0.93)',
  fondoAbajo: 'rgba(9,7,18,0.95)',
  filete: '#9b7fd6',
  interior: '#4a3a75',
  claro: '#c9b6ff',
  brillo: 'rgba(180,140,255,0.42)',
  seleccion: 'rgba(180,140,255,0.22)',
  cursor: '#e4d8ff',
  elegida: '#f4eeff',
  pm: '#9ec0ff',
  apagada: '#8e8e9a',
  texto: '#efe9da',
  px: '#7fc65e',
};

/** Lado de los rombos de las esquinas y del cursor. */
const ROMBO = 6;

// Los degradados del canvas van en coordenadas absolutas: se crean una vez por posición y se guardan.
const GRADIENTES = new Map<number, CanvasGradient>();

function gradiente(
  ctx: CanvasRenderingContext2D,
  clave: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  desde: string,
  hasta: string,
): CanvasGradient {
  let g = GRADIENTES.get(clave);
  if (!g) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, desde);
    g.addColorStop(1, hasta);
    GRADIENTES.set(clave, g);
  }
  return g;
}

/** Rombo de lado `lado` centrado en (cx, cy). */
export function rombo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  lado: number,
  color: string,
): void {
  const r = lado / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

/** Fondo de las pantallas a pantalla completa (elegir rana, dificultad, puntos…): degradado lavanda oscuro. */
export function dibujarFondo(ctx: CanvasRenderingContext2D): void {
  // Sin guardarlo: la ventana puede cambiar de tamaño.
  const g = ctx.createLinearGradient(0, area.y, 0, area.y + area.alto);
  g.addColorStop(0, '#1a1230');
  g.addColorStop(1, '#07050e');
  ctx.fillStyle = g;
  rellenarArea(ctx);
}

/** Título centrado de una pantalla: texto grande en lavanda claro y, debajo, un filete con un rombo. */
export function dibujarCabecera(
  ctx: CanvasRenderingContext2D,
  y: number,
  texto: string,
  alto = 22,
): void {
  escribir(ctx, texto, 240, y, PALETA.claro, 'center', FUENTE_GRANDE);
  ctx.fillStyle = PALETA.filete;
  ctx.fillRect(160, y + alto, 160, 1);
  rombo(ctx, 240, y + alto, ROMBO, PALETA.cursor);
}

/**
 * Caja sencilla (botones, casillas, filas pequeñas): fondo oscuro y un filete. Elegida = brillo y
 * filete claro; una apagada elegida solo lleva el filete claro (su gris no se aclara).
 */
export function dibujarCaja(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  estado: 'normal' | 'elegida' | 'apagada' | 'elegidaApagada',
): void {
  const elegida = estado === 'elegida' || estado === 'elegidaApagada';
  ctx.fillStyle = PALETA.fondoAbajo;
  ctx.fillRect(x, y, ancho, alto);
  if (estado === 'elegida') {
    ctx.fillStyle = PALETA.seleccion;
    ctx.fillRect(x, y, ancho, alto);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = elegida ? PALETA.cursor : PALETA.interior;
  ctx.strokeRect(x + 0.5, y + 0.5, ancho - 1, alto - 1);
}

/** Panel con degradado, doble filete y un rombo en cada esquina. */
export function dibujarMarco(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): void {
  ctx.fillStyle = gradiente(
    ctx,
    y * 1000 + alto,
    0,
    y,
    0,
    y + alto,
    PALETA.fondoArriba,
    PALETA.fondoAbajo,
  );
  ctx.fillRect(x, y, ancho, alto);
  ctx.lineWidth = 1;
  ctx.strokeStyle = PALETA.filete;
  ctx.strokeRect(x + 0.5, y + 0.5, ancho - 1, alto - 1);
  ctx.strokeStyle = PALETA.interior;
  ctx.strokeRect(x + 3.5, y + 3.5, ancho - 7, alto - 7);
  rombo(ctx, x, y, ROMBO, PALETA.claro);
  rombo(ctx, x + ancho, y, ROMBO, PALETA.claro);
  rombo(ctx, x, y + alto, ROMBO, PALETA.claro);
  rombo(ctx, x + ancho, y + alto, ROMBO, PALETA.claro);
}

/**
 * Una fila de lista: el texto a la izquierda y `detalle` a la derecha; elegida = brillo y rombo de
 * cursor. Una apagada que está elegida lleva el cursor (para saber dónde se está) con el texto gris.
 */
export function dibujarFila(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  texto: string,
  detalle: string,
  estado: 'normal' | 'elegida' | 'apagada' | 'elegidaApagada',
): void {
  const elegida = estado === 'elegida' || estado === 'elegidaApagada';
  const apagada = estado === 'apagada' || estado === 'elegidaApagada';
  if (elegida) {
    // El brillo va de izquierda a derecha y se apaga antes del final: la clave solo depende de x y ancho.
    ctx.fillStyle = gradiente(
      ctx,
      -(x * 1000 + ancho),
      x,
      0,
      x + ancho * 0.8,
      0,
      PALETA.brillo,
      'rgba(180,140,255,0)',
    );
    ctx.fillRect(x, y, ancho, alto);
    rombo(ctx, x + 8, y + alto / 2, ROMBO, PALETA.cursor);
  }
  const yTexto = y + (alto - 12) / 2;
  const color = apagada ? PALETA.apagada : elegida ? PALETA.elegida : PALETA.texto;
  escribir(ctx, texto, x + 16, yTexto, color);
  if (detalle) {
    escribir(ctx, detalle, x + ancho - 8, yTexto, apagada ? PALETA.apagada : PALETA.pm, 'right');
  }
}

/** Ancho medido de cada texto de pestaña (medirlo en cada fotograma crearía un objeto cada vez). */
const ANCHOS = new Map<string, number>();

/** Pestaña con el nombre del menú abierto, apoyada sobre el borde de arriba de un marco. */
export function dibujarPestana(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  texto: string,
): void {
  let ancho = ANCHOS.get(texto);
  if (ancho === undefined) {
    ctx.font = FUENTE;
    ancho = Math.ceil(ctx.measureText(texto).width) + 16;
    ANCHOS.set(texto, ancho);
  }
  ctx.fillStyle = PALETA.fondoAbajo;
  ctx.fillRect(x, y, ancho, 15);
  ctx.strokeStyle = PALETA.filete;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, ancho - 1, 15);
  escribir(ctx, texto, x + 8, y + 2, PALETA.claro);
}

/** Título en lavanda claro con su filete debajo, que se desvanece hacia la derecha. */
export function dibujarTitulo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  texto: string,
): void {
  escribir(ctx, texto, x, y, PALETA.claro);
  ctx.fillStyle = gradiente(
    ctx,
    -(x * 1000 + ancho) - 0.5,
    x,
    0,
    x + ancho,
    0,
    PALETA.filete,
    'rgba(155,127,214,0)',
  );
  ctx.fillRect(x, y + 16, ancho, 1);
}
