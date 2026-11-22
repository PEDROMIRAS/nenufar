import { expect, test, vi } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { luchadorDeHeroe } from '../src/core/combate';
import { empezarEnNivel } from '../src/core/progresion';
import { HEROES, REGLAS } from '../src/data/datos';
import { EscenaHabilidades } from '../src/escenas/habilidades';

// La pantalla sin dibujo ni sonido, en la interfaz de 480×352 (horizontal): aquí solo cuenta el toque.
vi.mock('../src/render/accesibilidad', () => ({ anunciar: () => {} }));
vi.mock('../src/render/sonido', () => ({ sonar: () => {} }));
vi.mock('../src/render/marco', () => ({
  dibujarFila: () => {},
  dibujarFondo: () => {},
  dibujarMarco: () => {},
  triangulo: () => {},
  PALETA: {},
}));
vi.mock('../src/render/texto', () => ({ escribir: () => {}, FUENTE_GRANDE: '' }));
vi.mock('../src/render/pantalla', () => ({ interfaz: { ancho: 480, alto: 352, alta: false } }));
vi.mock('../src/escenas/mensaje', () => ({ letras: () => ({ titulo: 30, linea: 60 }) }));

test('con el dedo se llega a «Listo» aunque no quepan todas las filas', () => {
  const heroe = HEROES.ronin!;
  const l = luchadorDeHeroe(heroe);
  empezarEnNivel(l, REGLAS.experiencia.nivelMaximo, REGLAS.experiencia);
  l.habilidadesGanadas.push(heroe.especiales.habilidad);
  let cerrada = false;
  const escena = new EscenaHabilidades(l, REGLAS.estados, () => (cerrada = true));
  // 9 habilidades y «Listo»: 10 filas, de las que en 480×352 se ven 9 (la lista empieza en y = 82, filas de 26).
  const tocar = (k: number): void => {
    const a = crearAcciones();
    a.toqueX = 100;
    a.toqueY = 82 + k * 26 + 5;
    escena.update(1 / 60, a);
  };
  // La última fila a la vista, tres veces: desplaza, elige «Listo» y lo usa.
  tocar(8);
  tocar(8);
  tocar(8);
  expect(cerrada).toBe(true);
});
