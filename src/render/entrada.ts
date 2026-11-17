// Entrada al combate sobre el mapa: un destello blanco y franjas oscuras en diagonal que barren la pantalla de
// izquierda a derecha hasta dejarla en negro. Se dibuja en coordenadas de la ventana del mapa.
import { franja, type FaseEntrada } from '../core/impacto';

/** El mismo negro violáceo de los fondos de la interfaz. */
const OSCURO = '#08040c';

/** Dibuja la fase `fase` de la entrada con `n` franjas sobre un área de `ancho` × `alto`. */
export function dibujarEntrada(
  ctx: CanvasRenderingContext2D,
  fase: FaseEntrada,
  n: number,
  ancho: number,
  alto: number,
): void {
  if (fase.destello > 0) {
    ctx.globalAlpha = fase.destello;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.globalAlpha = 1;
  }
  if (fase.barrido <= 0) return;
  // Bandas verticales inclinadas: cada una tapa su tramo (y un poco del de al lado, para no dejar rendijas).
  const inclinacion = alto * 0.35;
  const banda = (ancho + inclinacion) / n;
  ctx.fillStyle = OSCURO;
  for (let i = 0; i < n; i++) {
    const c = franja(i, n, fase.barrido);
    if (c <= 0) continue;
    const x0 = i * banda - inclinacion;
    const w = (banda + 1) * c;
    ctx.beginPath();
    ctx.moveTo(x0 + inclinacion, 0);
    ctx.lineTo(x0 + inclinacion + w, 0);
    ctx.lineTo(x0 + w, alto);
    ctx.lineTo(x0, alto);
    ctx.closePath();
    ctx.fill();
  }
}
