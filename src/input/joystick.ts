import { fijarDireccion } from '../core/direccion';
import type { FuenteEntrada } from './fuente';

interface Ajustes {
  /** Radio del joystick en píxeles CSS. */
  radio: number;
  /** Fracción del radio que no mueve (0..1). */
  zonaMuerta: number;
}

/** Joystick flotante: aparece donde se pone el dedo (mitad izquierda) y mide el arrastre desde ese punto. */
export function crearJoystick(raiz: HTMLElement, { radio, zonaMuerta }: Ajustes): FuenteEntrada {
  const base = circulo(radio * 2, 'rgba(255,255,255,0.12)');
  const mando = circulo(radio, 'rgba(255,255,255,0.35)');
  raiz.append(base, mando);

  let dedo: number | null = null;
  let origenX = 0;
  let origenY = 0;
  let dx = 0;
  let dy = 0;

  const colocar = (): void => {
    base.style.transform = `translate(${origenX - radio}px, ${origenY - radio}px)`;
    // El mando se queda dentro de la base aunque el dedo se salga.
    const escala = Math.min(1, radio / (Math.hypot(dx, dy) || 1));
    mando.style.transform = `translate(${origenX + dx * escala - radio / 2}px, ${origenY + dy * escala - radio / 2}px)`;
  };
  const soltar = (e: PointerEvent): void => {
    if (e.pointerId !== dedo) return;
    dedo = null;
    base.style.display = mando.style.display = 'none';
  };

  raiz.addEventListener('pointerdown', (e) => {
    // Solo en la mitad izquierda: la derecha queda para los botones táctiles.
    if (dedo !== null || e.pointerType === 'mouse' || e.clientX > innerWidth / 2) return;
    dedo = e.pointerId;
    origenX = e.clientX;
    origenY = e.clientY;
    dx = dy = 0;
    raiz.setPointerCapture(e.pointerId);
    base.style.display = mando.style.display = 'block';
    colocar();
  });
  raiz.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedo) return;
    dx = e.clientX - origenX;
    dy = e.clientY - origenY;
    colocar();
  });
  raiz.addEventListener('pointerup', soltar);
  raiz.addEventListener('pointercancel', soltar);

  return {
    leer(acciones) {
      if (dedo !== null) fijarDireccion(acciones, dx / radio, dy / radio, zonaMuerta);
    },
  };
}

function circulo(diametro: number, color: string): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:0;top:0;display:none;pointer-events:none;width:${diametro}px;height:${diametro}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);box-sizing:border-box`;
  return div;
}
