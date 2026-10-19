import { alpha, avanzar, crearReloj, PASO } from '../core/reloj';

/** Arranca el bucle: lógica a paso fijo de 60 Hz y un dibujado interpolado por fotograma. */
export function iniciarBucle(
  actualizar: (dt: number) => void,
  dibujar: (alpha: number) => void,
): void {
  const reloj = crearReloj();
  let anterior: number | undefined;

  const fotograma = (ahora: number): void => {
    const delta = anterior === undefined ? 0 : (ahora - anterior) / 1000;
    anterior = ahora;
    for (let pasos = avanzar(reloj, delta); pasos > 0; pasos--) actualizar(PASO);
    dibujar(alpha(reloj));
    requestAnimationFrame(fotograma);
  };
  requestAnimationFrame(fotograma);
}
