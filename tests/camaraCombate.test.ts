import { describe, expect, test } from 'vitest';
import { camaraAtaque, encuadrar, zoomMaximo, type Encuadre } from '../src/core/camaraCombate';

const d = { zoom: 0.1, entrada: 0.2, mantener: 0.3, salida: 0.4 };
const nuevo = (zoom = 1, x = 0, y = 0): Encuadre => ({ zoom, x, y });

describe('zoomMaximo', () => {
  test('1 + zoom, y en un golpe fuerte zoom × fuerte', () => {
    expect(zoomMaximo(d)).toBeCloseTo(1.1);
    expect(zoomMaximo({ ...d, fuerte: 1.6 }, true)).toBeCloseTo(1.16);
    expect(zoomMaximo({ ...d, fuerte: 1.6 }, false)).toBeCloseTo(1.1);
    // Sin el campo, el fuerte no cambia nada.
    expect(zoomMaximo(d, true)).toBeCloseTo(1.1);
  });

  test('sin zoom en los datos, 1', () => {
    expect(zoomMaximo({ ...d, zoom: 0 })).toBe(1);
    expect(zoomMaximo({ ...d, zoom: Number.NaN })).toBe(1);
  });
});

describe('camaraAtaque', () => {
  const objetivo = nuevo(1.1, 200, 100);

  test('desde quieta: se acerca, se queda tras el golpe y vuelve a 1', () => {
    const z = (t: number): number => camaraAtaque(t, 0.5, d, nuevo(), objetivo, nuevo()).zoom;
    expect(z(0)).toBe(1);
    expect(z(0.1)).toBeCloseTo(1.05);
    expect(z(0.5)).toBeCloseTo(1.1);
    expect(z(0.79)).toBeCloseTo(1.1);
    expect(z(1.0)).toBeCloseTo(1.05);
    expect(z(1.3)).toBe(1);
  });

  test('desde quieta no se desplaza: el punto es el del ataque desde el principio', () => {
    const c = camaraAtaque(0.1, 0.5, d, nuevo(1, 0, 0), objetivo, nuevo());
    expect(c.x).toBe(200);
    expect(c.y).toBe(100);
  });

  test('un ataque que empieza con la cámara aún cerca del anterior sale de donde estaba, sin tirón', () => {
    const desde = nuevo(1.08, 120, 60);
    const inicio = camaraAtaque(0, 0.5, d, desde, objetivo, nuevo());
    expect(inicio).toEqual(desde);
    const medio = camaraAtaque(0.1, 0.5, d, desde, objetivo, nuevo());
    expect(medio.zoom).toBeCloseTo(1.09);
    // Se mezcla el desplazamiento, (zoom − 1) · punto: (0,08·120 + 0,1·200) / 2 / 0,09.
    expect(medio.x).toBeCloseTo((0.08 * 120 + 0.1 * 200) / 2 / 0.09);
    expect(medio.y).toBeCloseTo((0.08 * 60 + 0.1 * 100) / 2 / 0.09);
    const llegada = camaraAtaque(0.3, 0.5, d, desde, objetivo, nuevo());
    expect(llegada.zoom).toBeCloseTo(1.1);
    expect(llegada.x).toBe(200);
    expect(llegada.y).toBe(100);
  });

  test('al pasar de un encuadre a otro, nada se sale del marco por el camino', () => {
    const marco = { arriba: 26, abajo: 200 };
    const contenido = { arriba: 40, abajo: 188 };
    const desde = encuadrar(1.2, 100, 40, contenido, marco, nuevo());
    const hacia = encuadrar(1.2, 300, 190, contenido, marco, nuevo());
    for (let t = 0; t <= d.entrada; t += 0.01) {
      const c = camaraAtaque(t, 0.5, d, desde, hacia, nuevo());
      expect(c.y + c.zoom * (contenido.arriba - c.y)).toBeGreaterThanOrEqual(marco.arriba - 1e-9);
      expect(c.y + c.zoom * (contenido.abajo - c.y)).toBeLessThanOrEqual(marco.abajo + 1e-9);
    }
  });

  test('sin zoom o con tiempos raros, 1', () => {
    expect(camaraAtaque(0.3, 0.5, { ...d, zoom: 0 }, nuevo(), objetivo, nuevo()).zoom).toBe(1);
    expect(camaraAtaque(-1, 0.5, d, nuevo(), objetivo, nuevo()).zoom).toBe(1);
    expect(camaraAtaque(Number.NaN, 0.5, d, nuevo(), objetivo, nuevo()).zoom).toBe(1);
  });
});

describe('encuadrar', () => {
  const marco = { arriba: 26, abajo: 200 };
  /** Dónde acaba el punto `p` con el encuadre `e`. */
  const tras = (e: Encuadre, p: number): number => e.y + e.zoom * (p - e.y);

  test('con sitio de sobra, el zoom y el punto pedidos', () => {
    const e = encuadrar(1.1, 200, 120, { arriba: 80, abajo: 160 }, marco, nuevo());
    expect(e).toEqual({ zoom: 1.1, x: 200, y: 120 });
  });

  test('mueve el punto lo justo para que los nombres no suban sobre la barra de turnos', () => {
    const contenido = { arriba: 40, abajo: 150 };
    const e = encuadrar(1.2, 200, 130, contenido, marco, nuevo());
    expect(e.zoom).toBeCloseTo(1.2);
    expect(tras(e, contenido.arriba)).toBeCloseTo(marco.arriba);
    expect(tras(e, contenido.abajo)).toBeLessThanOrEqual(marco.abajo);
  });

  test('ni los pies de la heroína bajan al panel', () => {
    const contenido = { arriba: 100, abajo: 190 };
    const e = encuadrar(1.2, 200, 100, contenido, marco, nuevo());
    expect(tras(e, contenido.abajo)).toBeCloseTo(marco.abajo);
    expect(tras(e, contenido.arriba)).toBeGreaterThanOrEqual(marco.arriba);
  });

  test('si el contenido casi llena el marco, se acerca menos: lo que quepa', () => {
    const contenido = { arriba: 27, abajo: 188 };
    const e = encuadrar(1.19, 200, 129, contenido, marco, nuevo());
    expect(e.zoom).toBeCloseTo((200 - 26) / (188 - 27));
    expect(tras(e, contenido.arriba)).toBeCloseTo(marco.arriba);
    expect(tras(e, contenido.abajo)).toBeCloseTo(marco.abajo);
  });

  test('sin zoom, o si el contenido ya llena el marco, no se acerca', () => {
    expect(encuadrar(1, 200, 120, { arriba: 80, abajo: 160 }, marco, nuevo()).zoom).toBe(1);
    expect(encuadrar(1.2, 200, 120, { arriba: 26, abajo: 200 }, marco, nuevo()).zoom).toBe(1);
  });
});

describe('encuadrar con los lados', () => {
  const marco = { arriba: 0, abajo: 400 };
  const contenido = { arriba: 100, abajo: 200 };
  const pantalla = { izquierda: 0, derecha: 320 };
  /** Dónde acaba el punto `p` (en x) con el encuadre `e`. */
  const tras = (e: Encuadre, p: number): number => e.x + e.zoom * (p - e.x);

  test('mueve el punto lo justo para que el nombre de la derecha no salga de la pantalla', () => {
    // Acercarse hacia la izquierda empuja hacia fuera lo de la derecha.
    const lados = { izquierda: 20, derecha: 315 };
    const e = encuadrar(1.05, 100, 150, contenido, marco, nuevo(), lados, pantalla);
    expect(e.zoom).toBeCloseTo(1.05);
    expect(tras(e, lados.derecha)).toBeCloseTo(pantalla.derecha);
    expect(tras(e, lados.izquierda)).toBeGreaterThanOrEqual(pantalla.izquierda);
  });

  test('si lo de los lados casi llena la pantalla, se acerca menos', () => {
    const lados = { izquierda: 5, derecha: 315 };
    const e = encuadrar(1.2, 160, 150, contenido, marco, nuevo(), lados, pantalla);
    expect(e.zoom).toBeCloseTo(320 / 310);
    expect(tras(e, lados.izquierda)).toBeCloseTo(pantalla.izquierda);
    expect(tras(e, lados.derecha)).toBeCloseTo(pantalla.derecha);
  });

  test('sin lados, la x no se toca', () => {
    expect(encuadrar(1.1, 300, 150, contenido, marco, nuevo()).x).toBe(300);
  });
});
