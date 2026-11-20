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

/**
 * Parte una lista unida con `separador` («Partidas 3 · Victorias 1 · …») en líneas de como mucho `ancho`
 * caracteres sin partir ningún elemento ni empezar una línea con el separador; un elemento que no cabe solo se
 * parte por palabras.
 */
export function partirLista(texto: string, ancho: number, separador = ' · '): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const parte of texto.split(separador).filter(Boolean)) {
    if (actual && actual.length + separador.length + parte.length <= ancho) {
      actual = `${actual}${separador}${parte}`;
      continue;
    }
    if (actual) lineas.push(actual);
    if (parte.length <= ancho) actual = parte;
    else {
      const trozos = partirTexto(parte, ancho);
      actual = trozos.pop() ?? '';
      lineas.push(...trozos);
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}
