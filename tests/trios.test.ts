import { test } from 'vitest';
import { crearAzar, elegirConPeso } from '../src/core/azar';
import { habilidadesConocidas, type Luchador } from '../src/core/combate';
import type { Inventario } from '../src/core/inventario';
import { DIFICULTADES, HEROES } from '../src/data/datos';
import zonas from '../src/data/zonas.json';
import { pelear, simular, type Mundo } from './simulador';

/**
 * Informe (saltado: quitar el `.skip` para verlo, tarda un par de minutos). Que ninguna combinación de 3 habilidades
 * sea siempre la mejor: por rana y zona, cada trío posible de las que conoce al acabar la zona (sin las de recompensa,
 * que son un premio), desde como acaba la zona y sin rellenar nada, contra dos combates seguidos de esa zona y su jefe,
 * en Normal. Avisa si un trío gana a todos los demás por más
 * de 10 puntos en todas las zonas.
 */
const FOTOS = 40;
const DIFERENCIA = 10;

function trios<T>(lista: readonly T[]): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i++)
    for (let j = i + 1; j < lista.length; j++)
      for (let k = j + 1; k < lista.length; k++) r.push([lista[i]!, lista[j]!, lista[k]!]);
  return r;
}

test.skip('informe: ninguna combinación de 3 habilidades es siempre la mejor', () => {
  for (const nombre of Object.keys(HEROES)) {
    // La heroína tal como acaba cada zona, en varias partidas.
    const fotos: Record<string, { h: Luchador; inv: Inventario; mundo: Mundo }[]> = {};
    simular(nombre, FOTOS, DIFICULTADES.normal, (zona, h, inv, mundo) => {
      (fotos[zona] ??= []).push({ h: structuredClone(h), inv: structuredClone(inv), mundo });
    });
    const mejores: Record<string, number> = {};
    for (const [zona, lista] of Object.entries(fotos)) {
      const z = zonas.zonas[zona as keyof typeof zonas.zonas];
      const nombres = habilidadesConocidas(lista[0]!.h)
        .filter((x) => !x.recompensa)
        .map((x) => x.nombre);
      const porTrio = trios(nombres).map((trio) => {
        let ganados = 0;
        let jugados = 0;
        lista.forEach(({ h, inv, mundo }, s) => {
          // Tal como acaba la zona, sin rellenar nada: dos combates seguidos y el jefe (el desgaste es lo que separa).
          const azar = crearAzar(s * 7 + 1);
          const copia = structuredClone(h);
          copia.equipadas = [...trio];
          const bolsa = structuredClone(inv);
          const cadena = [
            elegirConPeso(z.grupos, azar)!.monstruos,
            elegirConPeso(z.grupos, azar)!.monstruos,
            [z.jefe],
          ];
          jugados++;
          if (cadena.every((rivales) => pelear(copia, bolsa, rivales, azar, mundo))) ganados++;
        });
        return { trio: trio.join(' + '), pct: Math.round((ganados / jugados) * 1000) / 10 };
      });
      porTrio.sort((a, b) => b.pct - a.pct);
      console.log(`${nombre} · ${zona}: ${porTrio.map((t) => `${t.trio} ${t.pct}%`).join(' · ')}`);
      const [primero, segundo] = porTrio;
      if (primero && segundo && primero.pct - segundo.pct > DIFERENCIA)
        mejores[primero.trio] = (mejores[primero.trio] ?? 0) + 1;
    }
    for (const [trio, zonasGanadas] of Object.entries(mejores))
      if (zonasGanadas === Object.keys(fotos).length)
        console.warn(`${nombre}: ${trio} gana por más de ${DIFERENCIA} puntos en todas las zonas`);
  }
});
