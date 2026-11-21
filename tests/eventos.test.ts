import { describe, expect, test } from 'vitest';
import zonas from '../src/data/zonas.json';
import {
  actuar,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadoresDeGrupo,
  type Luchador,
} from '../src/core/combate';
import { crearAzar } from '../src/core/azar';
import { equipar, inventarioInicial } from '../src/core/equipo';
import {
  aplicarAltar,
  aplicarErmitano,
  aplicarMercader,
  despedidaErmitano,
  gruposDesafio,
  loteMercader,
  opcionesAltar,
  opcionesDesafio,
  opcionesErmitano,
  opcionesMercader,
  reglasDesafio,
  textoErmitano,
} from '../src/core/eventos';
import { crearInventario } from '../src/core/inventario';
import { experienciaParaSubir } from '../src/core/progresion';
import { EVENTOS, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';

const altar = EVENTOS.altar;
const reglas = REGLAS.experiencia;
const max = OBJETOS.maximoPorTipo;
const objetos = OBJETOS;

/** La ronin de nivel 1 con estas cifras de vida y magia. */
function heroina(pv: number, pvMax: number, pm: number, pmMax: number): Luchador {
  const l = luchadorDeHeroe(HEROES.ronin);
  Object.assign(l, { pv, pvMax, pm, pmMax });
  return l;
}
const opcion = (l: Luchador, k: string) =>
  opcionesAltar(l, altar, reglas).find((o) => o.clave === k)!;
const pxVida = (nivel: number) =>
  Math.round(experienciaParaSubir(nivel, reglas) * altar.vida.experiencia);

describe('opcionesAltar', () => {
  test('siempre ofrece vida, magia y marcharse, en ese orden', () => {
    expect(opcionesAltar(heroina(40, 40, 10, 10), altar, reglas).map((o) => o.clave)).toEqual([
      'vida',
      'magia',
      'marcharse',
    ]);
  });

  test('marcharse siempre está activa', () => {
    expect(opcion(heroina(1, 40, 0, 10), 'marcharse').activa).toBe(true);
  });

  test('ofrecer vida: con PV a 1 no se puede; con más, dice cuántos PV cuesta y cuánta experiencia da', () => {
    expect(opcion(heroina(1, 40, 5, 10), 'vida').activa).toBe(false);
    const o = opcion(heroina(40, 40, 5, 10), 'vida');
    expect(o.activa).toBe(true);
    expect(o.descripcion).toContain(String(Math.round(40 * altar.vida.porcentaje)));
    expect(o.descripcion).toContain(`${pxVida(1)} PX`);
  });

  test('ofrecer vida en el nivel máximo no promete experiencia', () => {
    const l = heroina(40, 40, 5, 10);
    l.nivel = reglas.nivelMaximo;
    expect(opcion(l, 'vida').descripcion).toBe(
      altar.vida.descripcionNivelMaximo.replace('{coste}', '12'),
    );
  });

  test('ofrecer vida en el nivel máximo con los PM llenos no hace nada: apagada', () => {
    const l = heroina(40, 40, 10, 10);
    l.nivel = reglas.nivelMaximo;
    expect(opcion(l, 'vida').activa).toBe(false);
    expect(opcion(l, 'vida').descripcion).toBe(altar.vida.sinEfecto);
  });

  test('ofrecer magia: sin PM o con los PV llenos no se puede', () => {
    expect(opcion(heroina(20, 40, 0, 10), 'magia').activa).toBe(false);
    expect(opcion(heroina(40, 40, 5, 10), 'magia').activa).toBe(false);
    expect(opcion(heroina(20, 40, 5, 10), 'magia').activa).toBe(true);
  });

  test('una opción apagada dice por qué', () => {
    expect(opcion(heroina(1, 40, 5, 10), 'vida').descripcion).toBe(altar.vida.sinEfecto);
    expect(opcion(heroina(20, 40, 0, 10), 'magia').descripcion).toBe(altar.magia.sinEfecto);
  });
});

describe('aplicarAltar', () => {
  test('vida: paga el porcentaje de PV máximos, rellena los PM y da experiencia', () => {
    const l = heroina(40, 40, 2, 10);
    aplicarAltar(l, crearInventario(), 'vida', altar, objetos, reglas);
    expect(l.pv).toBe(40 - Math.round(40 * altar.vida.porcentaje));
    expect(l.pm).toBe(10);
    expect(l.experiencia).toBe(pxVida(1));
  });

  test('vida: nunca deja menos de 1 PV', () => {
    const l = heroina(5, 100, 0, 10);
    aplicarAltar(l, crearInventario(), 'vida', altar, objetos, reglas);
    expect(l.pv).toBe(1);
  });

  test('vida: si la experiencia da para subir de nivel, sube y lo dice', () => {
    const l = heroina(40, 40, 2, 10);
    l.experiencia = experienciaParaSubir(1, reglas) - 1;
    const aviso = aplicarAltar(l, crearInventario(), 'vida', altar, objetos, reglas);
    expect(l.nivel).toBe(2);
    expect(aviso).toContain('nivel 2');
  });

  test('vida: al subir de nivel el equipo especial puesto crece y al quitarlo no se pierde nada', () => {
    const l = luchadorDeHeroe(HEROES.ronin);
    const inv = inventarioInicial(l, HEROES.ronin, OBJETOS);
    equipar(l, inv, OBJETOS, HEROES.ronin.especiales.arma);
    const antes = l.ataque;
    l.experiencia = experienciaParaSubir(1, reglas) - 1;
    aplicarAltar(l, inv, 'vida', altar, objetos, reglas);
    const crece = OBJETOS.equipo[HEROES.ronin.especiales.arma]!.bonosPorNivel!.ataque!;
    expect(l.ataque).toBe(antes + HEROES.ronin.porNivel.ataque + crece);
    equipar(l, inv, OBJETOS, HEROES.ronin.armaInicial);
    const ref = luchadorDeHeroe(HEROES.ronin);
    const invRef = inventarioInicial(ref, HEROES.ronin, OBJETOS);
    ref.experiencia = experienciaParaSubir(1, reglas) - 1;
    aplicarAltar(ref, invRef, 'vida', altar, objetos, reglas);
    expect(l.ataque).toBe(ref.ataque);
  });

  test('vida en el nivel máximo cobra los PV y no da experiencia', () => {
    const l = heroina(40, 40, 2, 10);
    l.nivel = reglas.nivelMaximo;
    aplicarAltar(l, crearInventario(), 'vida', altar, objetos, reglas);
    expect(l.experiencia).toBe(0);
  });

  test('magia: paga todos los PM, recupera el porcentaje de PV máximos sin pasarse y da una Poción', () => {
    const inv = crearInventario();
    const l = heroina(10, 40, 7, 10);
    aplicarAltar(l, inv, 'magia', altar, objetos, reglas);
    expect(l.pm).toBe(0);
    expect(l.pv).toBe(10 + Math.round(40 * altar.magia.porcentaje));
    for (const c of altar.magia.consumibles) expect(inv.consumibles[c]).toBe(1);
    const casi = heroina(38, 40, 7, 10);
    aplicarAltar(casi, crearInventario(), 'magia', altar, objetos, reglas);
    expect(casi.pv).toBe(40);
  });

  test('magia: con la mochila llena de Pociones no cabe otra y lo dice', () => {
    const inv = crearInventario();
    const [primero] = altar.magia.consumibles;
    inv.consumibles[primero!] = max;
    const aviso = aplicarAltar(heroina(10, 40, 7, 10), inv, 'magia', altar, objetos, reglas);
    expect(inv.consumibles[primero!]).toBe(max);
    expect(aviso).toContain('no te caben');
  });

  test('marcharse no cambia nada', () => {
    const l = heroina(10, 40, 3, 10);
    const inv = crearInventario();
    aplicarAltar(l, inv, 'marcharse', altar, objetos, reglas);
    expect(l).toEqual(heroina(10, 40, 3, 10));
    expect(inv.consumibles).toEqual({});
  });
});

describe('desafío', () => {
  const desafio = EVENTOS.desafio;

  test('opcionesDesafio: aceptar y marcharse, activas, con el número de combates puesto', () => {
    const o = opcionesDesafio(desafio);
    expect(o.map((x) => [x.clave, x.activa])).toEqual([
      ['aceptar', true],
      ['marcharse', true],
    ]);
    expect(o[0]!.descripcion).toContain(String(desafio.combates));
    expect(o[0]!.descripcion).not.toContain('{');
  });

  test('reglasDesafio quita la recuperación y deja el resto como estaba', () => {
    const r = reglasDesafio(REGLAS);
    expect(REGLAS.recuperacionTrasVictoria).toBeGreaterThan(0);
    expect(r.recuperacionTrasVictoria).toBe(0);
    expect({ ...r, recuperacionTrasVictoria: REGLAS.recuperacionTrasVictoria }).toEqual(REGLAS);
  });

  /** La ronin con vida a medias vence de un golpe a un limo, con unas reglas u otras; devuelve su vida. */
  function vidaTrasVencer(reglas: typeof REGLAS): number {
    const l = heroina(10, 40, 3, 10);
    Object.assign(l, { ataque: 999, velocidad: 999 });
    const c = crearCombate(l, luchadoresDeGrupo([MONSTRUOS.limo!]), reglas, crearAzar(1));
    avanzar(c);
    actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(c.resultado).toBe('victoria');
    return l.pv;
  }

  test('con reglasDesafio un combate ganado no devuelve vida; con las normales, sí', () => {
    expect(vidaTrasVencer(REGLAS)).toBeGreaterThan(10);
    expect(vidaTrasVencer(reglasDesafio(REGLAS))).toBe(10);
  });

  test('gruposDesafio da tantos grupos como combates, los mismos con la misma semilla', () => {
    const grupos = [
      { monstruos: 'a', peso: 1 },
      { monstruos: 'b', peso: 1 },
      { monstruos: 'c', peso: 2 },
    ];
    const una = gruposDesafio(grupos, desafio.combates, crearAzar(5));
    expect(una).toHaveLength(desafio.combates);
    expect(gruposDesafio(grupos, desafio.combates, crearAzar(5))).toEqual(una);
    expect(new Set(gruposDesafio(grupos, 200, crearAzar(9)))).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('ermitaño', () => {
  const ermitano = EVENTOS.ermitano;

  test('ofrece `cuantas` ofertas distintas y marcharse, las mismas con la misma semilla', () => {
    const o = opcionesErmitano(ermitano, crearAzar(3));
    expect(o).toHaveLength(ermitano.cuantas + 1);
    expect(o.at(-1)!.clave).toBe('marcharse');
    expect(new Set(o.map((x) => x.clave)).size).toBe(o.length);
    expect(opcionesErmitano(ermitano, crearAzar(3))).toEqual(o);
    expect(o.every((x) => x.activa)).toBe(true);
  });

  test('con otras semillas salen todas las ofertas de la lista', () => {
    const vistas = new Set<string>();
    for (let s = 0; s < 60; s++)
      for (const x of opcionesErmitano(ermitano, crearAzar(s))) vistas.add(x.clave);
    expect(vistas).toEqual(new Set([...ermitano.ofertas.map((x) => x.clave), 'marcharse']));
  });

  test('saluda en todas las zonas, con su propia frase tras la descripción', () => {
    for (const zona of Object.keys(zonas.zonas)) {
      const texto = textoErmitano(ermitano, zona);
      expect(texto.startsWith(ermitano.descripcion)).toBe(true);
      expect(texto).toContain(ermitano.saludos[zona]!);
    }
    // Una zona sin saludo: solo la descripción.
    expect(textoErmitano(ermitano, 'otra')).toBe(ermitano.descripcion);
  });

  test('se despide con una frase de su lista, la misma con la misma semilla', () => {
    const vistas = new Set<string>();
    for (let s = 0; s < 40; s++) vistas.add(despedidaErmitano(ermitano, crearAzar(s)));
    expect(vistas).toEqual(new Set(ermitano.despedidas));
    expect(despedidaErmitano(ermitano, crearAzar(4))).toBe(
      despedidaErmitano(ermitano, crearAzar(4)),
    );
    expect(despedidaErmitano({ ...ermitano, despedidas: [] }, crearAzar(1))).toBe('');
  });

  test('aplicarErmitano guarda los consumibles de la oferta', () => {
    const inv = crearInventario();
    const aviso = aplicarErmitano(inv, 'pociones', ermitano, objetos);
    expect(inv.consumibles.pocion).toBe(3);
    expect(aviso).toBe('El ermitaño te da: Poción ×3');
  });

  test('con la mochila llena avisa de lo que no cabe', () => {
    const inv = crearInventario();
    inv.consumibles.pocion = max;
    expect(aplicarErmitano(inv, 'pociones', ermitano, objetos)).toContain('no te caben más');
    expect(inv.consumibles.pocion).toBe(max);
  });

  test('una oferta que no existe no hace nada', () => {
    const inv = crearInventario();
    expect(aplicarErmitano(inv, 'zzz', ermitano, objetos)).toBe('');
  });

  test('las ofertas piden consumibles que existen', () => {
    for (const o of ermitano.ofertas)
      for (const c of o.consumibles) expect(objetos.consumibles[c]).toBeDefined();
  });
});

describe('mercader', () => {
  const mercader = EVENTOS.mercader;

  test('sin nada en la mochila, solo una opción apagada que lo explica y marcharse', () => {
    const o = opcionesMercader(crearInventario(), mercader, objetos);
    expect(o.map((x) => [x.clave, x.activa])).toEqual([
      ['nada', false],
      ['marcharse', true],
    ]);
  });

  test('ofrece hasta `cuantas` piezas de la mochila, de más a menos valiosa', () => {
    const inv = crearInventario();
    inv.mochila = ['katana_madera', 'hoja_runica', 'tunica', 'katana_acero'];
    const o = opcionesMercader(inv, mercader, objetos);
    expect(o.map((x) => x.clave)).toEqual([
      'hoja_runica',
      'katana_acero',
      'katana_madera',
      'marcharse',
    ]);
    expect(o[0]!.descripcion).toBe('Dejas Hoja rúnica y te llevas Poción ×2 y Éter.');
  });

  test('paga más cuanto mejor es la pieza, y cada unidad de lo que menos se lleva', () => {
    const inv = crearInventario();
    expect(loteMercader(inv, 'katana_gastada', mercader, objetos)).toEqual(['pocion']);
    expect(loteMercader(inv, 'katana_acero', mercader, objetos)).toEqual(['pocion', 'eter']);
    expect(loteMercader(inv, 'katana_brasas', mercader, objetos)).toHaveLength(4);
    inv.consumibles.pocion = 3;
    expect(loteMercader(inv, 'katana_acero', mercader, objetos)).toEqual(['eter', 'eter']);
  });

  test('una pieza que crece con la heroína vale lo que suma en su nivel', () => {
    const inv = crearInventario();
    // Katana sagrada: +5 de ataque y +1 por nivel. En el nivel 1, 1 + ⌊5/4⌋ = 2; en el 8, 1 + ⌊12/4⌋ = 4.
    expect(loteMercader(inv, 'katana_sagrada', mercader, objetos)).toHaveLength(2);
    expect(loteMercader(inv, 'katana_sagrada', mercader, objetos, 8)).toHaveLength(4);
    // Una pieza que no crece paga lo mismo en cualquier nivel.
    expect(loteMercader(inv, 'katana_acero', mercader, objetos, 8)).toEqual(['pocion', 'eter']);
  });

  test('cambiar quita la pieza de la mochila, la apunta como vendida y da el lote', () => {
    const inv = crearInventario();
    inv.mochila = ['katana_acero'];
    const aviso = aplicarMercader(inv, 'katana_acero', mercader, objetos);
    expect(aviso).toBe('Te llevas Poción y Éter');
    expect(inv.mochila).toEqual([]);
    expect(inv.vendidas).toEqual(['katana_acero']);
    expect(inv.consumibles).toMatchObject({ pocion: 1, eter: 1 });
    // Lo que no está en la mochila no se cambia.
    expect(aplicarMercader(inv, 'katana_acero', mercader, objetos)).toBe('');
  });

  test('solo paga lo que cabe; con todo al máximo, la oferta se apaga y no hay trueque', () => {
    const inv = crearInventario();
    inv.mochila = ['hoja_runica'];
    inv.consumibles = { pocion: 5, eter: 4 };
    expect(loteMercader(inv, 'hoja_runica', mercader, objetos)).toEqual(['eter']);
    inv.consumibles = { pocion: 5, eter: 5 };
    const o = opcionesMercader(inv, mercader, objetos);
    expect(o[0]).toMatchObject({
      clave: 'hoja_runica',
      activa: false,
      descripcion: mercader.lleno,
    });
    expect(aplicarMercader(inv, 'hoja_runica', mercader, objetos)).toBe('');
    expect(inv.mochila).toEqual(['hoja_runica']);
  });

  test('los datos del puesto tienen sentido (si no, el lote se colgaría o saldría vacío)', () => {
    expect(mercader.cuantas).toBeGreaterThanOrEqual(1);
    expect(mercader.porBono).toBeGreaterThan(0);
    expect(mercader.base).toBeGreaterThanOrEqual(1);
    expect(mercader.paga.length).toBeGreaterThan(0);
    for (const c of mercader.paga) expect(objetos.consumibles[c]).toBeDefined();
  });
});
