import { expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { DIFICULTADES, HEROES } from '../src/data/datos';
import zonas from '../src/data/zonas.json';
import { pct, pelear, simular, type Cuenta } from './simulador';

// Dureza de los jefes violetas (decisión de Pedro): una heroína que entra al terminar de explorar la
// zona gana cerca del 75 % en Fácil, del 60 % en Normal y del 45 % en Difícil. El dragón, algo por
// debajo del jefe violeta de su zona. Si falla, se ajustan los JSON, nunca las fórmulas.
// Cada heroína, de media entre los tres jefes violetas, a ±10: así las salas violetas cuestan lo mismo
// con las dos. Un jefe suelto puede ser el difícil para una de ellas, pero ningún combate violeta
// (dragones incluidos) baja del suelo: la sala es opcional, no se sabe qué hay dentro y perder acaba
// la partida. El dragón, frente al jefe violeta de su zona en la media de las dos heroínas: como
// mucho 10 puntos por encima y como mucho 20 por debajo. Con 300 partidas cada porcentaje baila
// unos ±3 puntos, y en Fácil la maga ya gana casi siempre al dragón de las Ruinas: con 5 de margen
// la regla quedaba por debajo del ruido y se rompía con cualquier cambio.
const OBJETIVO: Record<keyof typeof DIFICULTADES, number> = { facil: 75, normal: 60, dificil: 45 };
const MARGEN = 10;
const SUELO = 25;

test.each(Object.entries(OBJETIVO))(
  '%s: los jefes violetas ganan lo acordado y el dragón un poco menos',
  (clave, objetivo) => {
    const dificultad = DIFICULTADES[clave as keyof typeof DIFICULTADES];
    const fallos: string[] = [];
    const cuentas: Record<string, Cuenta[]> = {};
    for (const nombre of Object.keys(HEROES)) {
      const propias: Record<string, Cuenta> = {};
      // Con una copia de la heroína tal como acaba la zona: la partida sigue igual.
      simular(nombre, 300, dificultad, (zona, h, inv, mundo, s) => {
        const rivales = {
          violeta: zonas.zonas[zona].jefeVioleta,
          dragon: zonas.violetas.dragon[zona],
        };
        for (const [tipo, rival] of Object.entries(rivales)) {
          const azar = crearAzar(s * 173 + rival.length);
          const gana = pelear(structuredClone(h), structuredClone(inv), [rival], azar, mundo);
          const c = (propias[`${zona}/${tipo}`] ??= { ganados: 0, jugados: 0 });
          c.jugados++;
          if (gana) c.ganados++;
        }
      });
      console.log(
        `${clave} · ${nombre}: ${Object.entries(propias)
          .map(([k, c]) => `${k} ${pct(c)}%`)
          .join(' · ')}`,
      );
      for (const [k, c] of Object.entries(propias)) {
        (cuentas[k] ??= []).push(c);
        if (pct(c) < SUELO) fallos.push(`${nombre} ${k} ${pct(c)} bajo el suelo`);
      }
      const violetas = Object.keys(zonas.zonas).map((z) => pct(propias[`${z}/violeta`]!));
      const suya = violetas.reduce((a, b) => a + b, 0) / violetas.length;
      if (Math.abs(suya - objetivo) > MARGEN) fallos.push(`${nombre} violetas de media ${suya}`);
    }
    const media = (k: string): number => {
      const lista = cuentas[k]!;
      return lista.reduce((a, c) => a + pct(c), 0) / lista.length;
    };
    for (const zona of Object.keys(zonas.zonas)) {
      const violeta = media(`${zona}/violeta`);
      const dragon = media(`${zona}/dragon`);
      if (dragon - violeta > 10 || violeta - dragon > 20) {
        fallos.push(`${zona} dragón ${dragon} frente a violeta ${violeta}`);
      }
    }
    expect(fallos).toEqual([]);
  },
  120_000,
);
