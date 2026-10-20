/**
 * Nombre que escribe la jugadora, listo para usar: solo letras, números y espacios, sin espacios de
 * más y como mucho `maximo` caracteres. Si no queda nada, `porDefecto`.
 */
export function limpiarNombre(texto: string, porDefecto: string, maximo: number): string {
  const limpio = texto
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/ +/g, ' ')
    .trim()
    .slice(0, maximo)
    .trim();
  return limpio || porDefecto;
}
