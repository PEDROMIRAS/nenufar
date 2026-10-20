import { describe, expect, test } from 'vitest';
import { E, N, O, S, generarZona, type SalaZona, type Zona } from '../src/core/zona';
import datos from '../src/data/zonas.json';

const LADOS = [
  { bit: N, dx: 0, dy: -1, opuesto: S },
  { bit: E, dx: 1, dy: 0, opuesto: O },
  { bit: S, dx: 0, dy: 1, opuesto: N },
  { bit: O, dx: -1, dy: 0, opuesto: E },
];

const ajustes = (zona: keyof typeof datos.zonas) => ({
  ...datos.generacion,
  salas: datos.zonas[zona].salas,
});

/** Recorre la zona por sus puertas, comprobando de paso que cada puerta tiene su pareja al otro lado. */
function recorrer(zona: Zona): Map<SalaZona, number> {
  const en = (x: number, y: number) => zona.salas.find((s) => s.x === x && s.y === y);
  const inicio = zona.salas.find((s) => s.tipo === 'inicio')!;
  const distancias = new Map([[inicio, 0]]);
  const cola = [inicio];
  for (let i = 0; i < cola.length; i++) {
    const s = cola[i]!;
    for (const l of LADOS) {
      if (!(s.puertas & l.bit)) continue;
      const v = en(s.x + l.dx, s.y + l.dy);
      if (!v || !(v.puertas & l.opuesto)) throw new Error(`Puerta sin pareja en (${s.x}, ${s.y})`);
      if (!distancias.has(v)) {
        distancias.set(v, distancias.get(s)! + 1);
        cola.push(v);
      }
    }
  }
  return distancias;
}

describe.each(Object.keys(datos.zonas) as (keyof typeof datos.zonas)[])('zona %s', (nombre) => {
  const a = ajustes(nombre);

  test('1.000 semillas dan zonas válidas', () => {
    for (let semilla = 0; semilla < 1000; semilla++) {
      const zona = generarZona(a, semilla);
      const distancias = recorrer(zona);
      const cuenta = (tipo: SalaZona['tipo']) => zona.salas.filter((s) => s.tipo === tipo).length;

      expect(zona.salas).toHaveLength(a.salas);
      expect(distancias.size).toBe(a.salas); // todas alcanzables
      expect(new Set(zona.salas.map((s) => `${s.x},${s.y}`)).size).toBe(a.salas);
      for (const s of zona.salas) {
        expect(s.x >= 0 && s.y >= 0 && s.x < a.rejilla && s.y < a.rejilla).toBe(true);
        expect(s.distancia).toBe(distancias.get(s));
      }
      expect([cuenta('inicio'), cuenta('jefe'), cuenta('tesoro'), cuenta('descanso')]).toEqual([
        1, 1, 1, 1,
      ]);
      const jefe = zona.salas.find((s) => s.tipo === 'jefe')!;
      expect(jefe.distancia).toBeGreaterThanOrEqual(a.distanciaMinimaJefe);
      expect(jefe.distancia).toBe(Math.max(...zona.salas.map((s) => s.distancia)));
    }
  });

  test('la misma semilla da la misma zona', () => {
    expect(generarZona(a, 42)).toEqual(generarZona(a, 42));
  });
});
