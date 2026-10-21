/**
 * Parte un texto en líneas de como mucho `ancho` caracteres sin cortar palabras (una palabra más
 * larga que `ancho` va sola en su línea). Pensado para fuentes monoespaciadas.
 */
export function partirTexto(texto: string, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(' ').filter(Boolean)) {
    if (actual && actual.length + 1 + palabra.length > ancho) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}
