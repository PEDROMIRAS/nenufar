import { botonesAltosCacheados, letrasEnAncho } from '../core/disposicion';
import { VERTICAL } from '../data/datos';
import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarFondo, PALETA } from './marco';
import { alRedimensionar, esTactil, interfaz } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, partirCacheado } from './texto';

/** Caracteres como mucho: lo que cabe sin descuadrar el combate y el inventario. */
export const LARGO_NOMBRE = 12;
/** Dónde va el campo de texto, en píxeles lógicos. */
export const RECT_CAMPO = { x: 120, y: 196, ancho: 240, alto: 32 };
const CAMPO_HORIZONTAL = { ...RECT_CAMPO };

/**
 * Pone el campo donde toca según la interfaz: en la alta (móvil de pie), a lo ancho y en la mitad de arriba
 * (con el teclado en pantalla abierto sigue a la vista); si no, donde siempre. Se llama al mostrarlo y al cambiar
 * el tamaño de la ventana, antes de que el campo se recoloque sobre su rectángulo.
 */
export function ajustarCampoNombre(): void {
  const r = RECT_CAMPO;
  if (!interfaz.alta) {
    Object.assign(r, CAMPO_HORIZONTAL);
    return;
  }
  r.x = VERTICAL.menu.margen * 2;
  r.y = 196;
  r.ancho = interfaz.ancho - 4 * VERTICAL.menu.margen;
  r.alto = VERTICAL.menu.boton - 4;
}
alRedimensionar(ajustarCampoNombre);

/** Pantalla del nombre: la rana elegida grande; el campo de texto HTML va encima, en RECT_CAMPO. */
export function dibujarNombre(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  tipo: string,
  tiempo: number,
  menu: MenuVista,
): void {
  dibujarFondo(ctx);
  const alta = interfaz.alta;
  const centro = interfaz.ancho / 2;
  // En la interfaz alta el título largo no cabe a 24 px de letra: se acorta.
  dibujarCabecera(ctx, 16, alta ? 'Nombre de tu rana' : '¿Cómo se llama tu rana?');
  dibujarFotograma(ctx, sprite, 'idle', 'down', tiempo, centro, 160, 3);
  escribir(ctx, tipo, centro, 172, PALETA.claro, 'center');
  const pista = esTactil()
    ? 'Escribe un nombre y toca Seguir'
    : 'Escribe un nombre · Enter seguir · ↓ botones · Esc volver';
  if (alta) {
    // La pista, partida al ancho, justo sobre los botones.
    const lineas = partirCacheado(pista, letrasEnAncho(interfaz.ancho - 2 * VERTICAL.menu.margen));
    const base = botonesAltosCacheados(
      menu.opciones.length,
      interfaz.ancho,
      interfaz.alto,
      VERTICAL,
    )[0]!.y;
    for (let i = 0; i < lineas.length; i++)
      escribir(
        ctx,
        lineas[i]!,
        centro,
        base - 8 - (lineas.length - i) * 14,
        PALETA.apagada,
        'center',
      );
  } else escribir(ctx, pista, centro, 252, PALETA.apagada, 'center');
  dibujarMenu(ctx, menu);
}
