import { describe, expect, test } from 'vitest';
import { despuesDelCombate, type PantallaTrasCombate } from '../src/core/trasCombate';

/** Ejecuta `despuesDelCombate` cerrando cada pantalla en cuanto sale y devuelve lo que pasó, en orden. */
function recorrer(o: { caida: boolean; sube: boolean; reto: boolean }): string[] {
  const hecho: string[] = [];
  despuesDelCombate(o, {
    guardarEquipo: () => hecho.push('guardarEquipo'),
    avisarMapa: () => hecho.push('avisarMapa'),
    ensenar: (pantalla: PantallaTrasCombate, seguir) => {
      hecho.push(pantalla);
      seguir();
    },
  });
  return hecho;
}

describe('despuesDelCombate', () => {
  test('el equipo va a la mochila y el mapa (que guarda) se avisa antes de cualquier pantalla', () => {
    for (const caida of [false, true])
      for (const sube of [false, true])
        for (const reto of [false, true]) {
          const hecho = recorrer({ caida, sube, reto });
          expect(hecho.slice(0, 2)).toEqual(['guardarEquipo', 'avisarMapa']);
        }
  });

  test('un jefe que sube de nivel: su frase, el nivel, los puntos y el equipo', () => {
    expect(recorrer({ caida: true, sube: true, reto: false })).toEqual([
      'guardarEquipo',
      'avisarMapa',
      'caida',
      'nivel',
      'puntos',
      'equipo',
    ]);
  });

  test('en el reto no se para en los puntos (se reparten solos)', () => {
    expect(recorrer({ caida: false, sube: true, reto: true })).toEqual([
      'guardarEquipo',
      'avisarMapa',
      'nivel',
      'equipo',
    ]);
  });

  test('un combate normal sin subir de nivel: solo el equipo', () => {
    expect(recorrer({ caida: false, sube: false, reto: false })).toEqual([
      'guardarEquipo',
      'avisarMapa',
      'equipo',
    ]);
  });

  test('cada pantalla espera a que se cierre la anterior', () => {
    const abiertas: (() => void)[] = [];
    const vistas: string[] = [];
    despuesDelCombate(
      { caida: true, sube: false, reto: false },
      {
        guardarEquipo: () => {},
        avisarMapa: () => {},
        ensenar: (pantalla, seguir) => {
          vistas.push(pantalla);
          abiertas.push(seguir);
        },
      },
    );
    expect(vistas).toEqual(['caida']);
    abiertas.shift()!();
    expect(vistas).toEqual(['caida', 'equipo']);
  });
});
