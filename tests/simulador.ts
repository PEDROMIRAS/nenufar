import { crearAzar, elegirConPeso } from '../src/core/azar';
import {
  actuar,
  avanzar,
  crearCombate,
  habilidadesDisponibles,
  luchadorDeHeroe,
  luchadoresDeGrupo,
  type AccionHeroina,
  type Combate,
  type Luchador,
} from '../src/core/combate';
import { abrirCofre, equipar } from '../src/core/equipo';
import { crearInventario, type Inventario } from '../src/core/inventario';
import type { EquipoJson } from '../src/core/types';
import { generarZona } from '../src/core/zona';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import zonas from '../src/data/zonas.json';

/** Simulador de partidas enteras jugadas con una política razonable (para el equilibrado). */

/** Jugadora razonable: se cura con poca vida, defiende el golpe cargado y usa lo más fuerte que tenga. */
function decidir(c: Combate): AccionHeroina {
  const h = c.heroina;
  const vivos = c.enemigos.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv);
  const objetivo = vivos[0]!;
  const habs = habilidadesDisponibles(h).filter((x) => x.pm <= h.pm);
  if (h.pv < h.pvMax * 0.35) {
    const cura = habs.find((x) => x.cura);
    if (cura) return { tipo: 'habilidad', habilidad: cura, objetivo: null };
    if ((c.inventario?.consumibles.pocion ?? 0) > 0) return { tipo: 'objeto', clave: 'pocion' };
  }
  const golpe = Math.max(h.ataque, h.magia) * 1.2;
  if (vivos.some((e) => e.cargando) && !(vivos.length === 1 && objetivo.pv <= golpe)) {
    return { tipo: 'defender' };
  }
  const area = habs.find((x) => x.objetivo === 'todos' && x.danio);
  if (area && vivos.length > 1) return { tipo: 'habilidad', habilidad: area, objetivo: null };
  const uno = habs
    .filter((x) => x.objetivo === 'uno' && x.danio)
    .sort((a, b) => b.danio!.poder - a.danio!.poder)[0];
  if (uno) return { tipo: 'habilidad', habilidad: uno, objetivo };
  return { tipo: 'atacar', objetivo };
}

const valor = (p: EquipoJson | undefined): number =>
  p ? Object.values(p.bonos).reduce((a, b) => a + (b ?? 0), 0) : 0;

/** Se pone la pieza si suma más que la que lleva en ese hueco. */
function quizaEquipar(h: Luchador, inv: Inventario, clave: string): void {
  const nueva = OBJETOS.equipo[clave];
  const actual = nueva && inv[nueva.hueco];
  if (nueva && valor(nueva) > valor(actual ? OBJETOS.equipo[actual] : undefined)) {
    equipar(h, inv, OBJETOS, clave);
  }
}

function pelear(h: Luchador, inv: Inventario, grupo: string[], azar: () => number): boolean {
  const c = crearCombate(
    h,
    luchadoresDeGrupo(grupo.map((k) => MONSTRUOS[k]!)),
    REGLAS,
    azar,
    MONSTRUOS,
  );
  c.inventario = inv;
  c.objetos = OBJETOS;
  avanzar(c);
  for (let vueltas = 0; !c.resultado && vueltas < 300; vueltas++) actuar(c, decidir(c));
  for (const pieza of c.equipoEncontrado) quizaEquipar(h, inv, pieza);
  return c.resultado === 'victoria';
}

export interface Cuenta {
  ganados: number;
  jugados: number;
}
export const pct = (c: Cuenta): number =>
  c.jugados ? Math.round((c.ganados / c.jugados) * 1000) / 10 : 0;

export function simular(nombre: string, partidas = 300) {
  const heroe = HEROES[nombre as keyof typeof HEROES];
  const claves = Object.keys(zonas.zonas) as (keyof typeof zonas.zonas)[];
  const sueltos: Record<string, Cuenta> = {};
  const reales: Record<string, Cuenta> = {};
  const jefes: Record<string, Cuenta> = {};
  const contar = (t: Record<string, Cuenta>, k: string, gana: boolean): void => {
    t[k] ??= { ganados: 0, jugados: 0 };
    t[k].jugados++;
    if (gana) t[k].ganados++;
  };
  let completas = 0;
  for (let s = 1; s <= partidas; s++) {
    const azar = crearAzar(s * 97);
    const h = luchadorDeHeroe(heroe);
    const inv = crearInventario();
    let viva = true;
    for (const [i, clave] of claves.entries()) {
      const z = zonas.zonas[clave];
      const zona = generarZona({ ...zonas.generacion, salas: z.salas }, s + i * 7919);
      let fuente = zona.salas.some((x) => x.tipo === 'descanso');
      for (const sala of zona.salas) {
        if (sala.tipo === 'tesoro') {
          const hallazgo = abrirCofre(z.cofre, azar, heroe, OBJETOS, inv);
          if (hallazgo?.tipo === 'equipo') quizaEquipar(h, inv, hallazgo.clave);
        }
        if (sala.tipo !== 'combate') continue;
        // La fuente se guarda para cuando hace falta.
        if (fuente && h.pv < h.pvMax * 0.5) {
          fuente = false;
          h.pv = h.pvMax;
          h.pm = h.pmMax;
        }
        const grupos = zonas.monstruos.gruposPorSala;
        const n = grupos.min + Math.floor(azar() * (grupos.max - grupos.min + 1));
        for (let g = 0; g < n && viva; g++) {
          const grupo = elegirConPeso(z.grupos, azar)!.monstruos;
          // El mismo combate empezando con la vida llena, sin tocar la partida.
          const copia = structuredClone(h);
          copia.pv = copia.pvMax;
          copia.pm = copia.pmMax;
          contar(
            sueltos,
            clave,
            pelear(copia, structuredClone(inv), grupo, crearAzar(s * 131 + g)),
          );
          viva = pelear(h, inv, grupo, azar);
          contar(reales, clave, viva);
        }
        if (!viva) break;
      }
      if (!viva) break;
      if (fuente) {
        h.pv = h.pvMax;
        h.pm = h.pmMax;
      }
      viva = pelear(h, inv, [z.jefe], azar);
      contar(jefes, clave, viva);
      if (!viva) break;
    }
    if (viva) {
      viva = pelear(h, inv, [zonas.jefeFinal], azar);
      contar(jefes, 'final', viva);
    }
    if (viva) completas++;
  }
  return { sueltos, reales, jefes, completas: Math.round((completas / partidas) * 1000) / 10 };
}
