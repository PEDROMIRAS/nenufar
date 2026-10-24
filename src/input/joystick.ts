import { fijarDireccion } from '../core/direccion';
import type { FuenteEntrada } from './fuente';

interface Ajustes {
  /** Radio del joystick en píxeles CSS. */
  radio: number;
  /** Fracción del radio que no mueve (0..1). */
  zonaMuerta: number;
  /** Fracción del radio desde la que se corre (el dedo lejos del centro). */
  correrDesde: number;
}

/**
 * Joystick flotante: nace donde se pone el dedo, en cualquier punto de la pantalla, y mide el arrastre
 * desde ahí. Solo se dibuja al arrastrar: un toque en un botón no lo hace aparecer.
 */
export function crearJoystick(
  raiz: HTMLElement,
  { radio, zonaMuerta, correrDesde }: Ajustes,
): FuenteEntrada {
  const base = circulo(radio * 2, 'rgba(255,255,255,0.12)');
  const mando = circulo(radio, 'rgba(255,255,255,0.35)');
  raiz.append(base, mando);

  let dedo: number | null = null;
  let origenX = 0;
  let origenY = 0;
  let dx = 0;
  let dy = 0;
  let visible = false;

  const colocar = (): void => {
    base.style.transform = `translate(${origenX - radio}px, ${origenY - radio}px)`;
    // El mando se queda dentro de la base aunque el dedo se salga.
    const escala = Math.min(1, radio / (Math.hypot(dx, dy) || 1));
    mando.style.transform = `translate(${origenX + dx * escala - radio / 2}px, ${origenY + dy * escala - radio / 2}px)`;
  };
  const soltar = (): void => {
    dedo = null;
    visible = false;
    base.style.display = mando.style.display = 'none';
  };
  const soltarDedo = (e: PointerEvent): void => {
    if (e.pointerId === dedo) soltar();
  };

  raiz.addEventListener('pointerdown', (e) => {
    // Tocar un campo de texto o un botón HTML tiene que funcionar: ahí no nace el joystick.
    const control = e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement;
    if (dedo !== null || e.pointerType === 'mouse' || control) return;
    dedo = e.pointerId;
    origenX = e.clientX;
    origenY = e.clientY;
    dx = dy = 0;
    raiz.setPointerCapture(e.pointerId);
  });
  raiz.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedo) return;
    dx = e.clientX - origenX;
    dy = e.clientY - origenY;
    if (!visible && Math.hypot(dx, dy) > radio * zonaMuerta) {
      visible = true;
      base.style.display = mando.style.display = 'block';
    }
    if (visible) colocar();
  });
  raiz.addEventListener('pointerup', soltarDedo);
  raiz.addEventListener('pointercancel', soltarDedo);
  // Si el navegador le quita el dedo sin pointerup (gesto del sistema, aviso, otra ventana), sin esto
  // el joystick seguía creyendo que había un dedo y no volvía a nacer: «se pierde».
  raiz.addEventListener('lostpointercapture', soltarDedo);
  addEventListener('blur', soltar);

  return {
    leer(acciones) {
      if (dedo === null) return;
      fijarDireccion(acciones, dx / radio, dy / radio, zonaMuerta);
      // Llevar el dedo cerca del borde (o más allá) es correr: no hace falta ningún botón.
      if (Math.hypot(dx, dy) >= radio * correrDesde) acciones.correr = true;
    },
  };
}

function circulo(diametro: number, color: string): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:0;top:0;display:none;pointer-events:none;width:${diametro}px;height:${diametro}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);box-sizing:border-box`;
  return div;
}
