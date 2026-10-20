// El canvas no se puede leer: lo importante se repite como texto en una región aria-live oculta
// (#anuncios, en index.html) para los lectores de pantalla.

let region: HTMLElement | null = null;

/** Hace que el lector de pantalla diga `texto` (sin cortar lo que esté diciendo). */
export function anunciar(texto: string): void {
  region ??= document.getElementById('anuncios');
  if (region) region.textContent = texto;
}

// Se consulta una vez y se lee su `matches`, que está siempre al día (sin crear nada por fotograma).
const MENOS_MOVIMIENTO = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Quien pide menos movimiento no ve parpadeos rápidos: los destellos quedan fijos. */
export function movimientoReducido(): boolean {
  return MENOS_MOVIMIENTO.matches;
}
