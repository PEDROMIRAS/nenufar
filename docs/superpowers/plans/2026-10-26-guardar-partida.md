# Guardar la partida: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que una partida a medias sobreviva a cerrar el navegador: se guarda al entrar en cada sala y al volver se aparece en esa sala con un mensaje para continuar.

**Architecture:** un módulo puro `src/core/guardado.ts` define los datos guardados, los saca de la partida y los comprueba al leerlos; `render/almacen.ts` los lee y escribe en `localStorage`; `EscenaMapa` informa de su estado al entrar en cada sala y acepta un estado recuperado; `main.ts` une las piezas (guardar, recuperar, borrar, aviso al cerrar).

**Tech Stack:** TypeScript strict, Vitest, sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-26-guardar-partida-design.md`

## Global Constraints

- `src/core/` no importa nada del navegador; `localStorage` solo desde `src/render/almacen.ts`.
- Clave propia de `localStorage` para la partida; los ajustes y récords no cambian.
- Se guardan claves (heroína, dificultad, piezas, consumibles), nunca copias de los JSON.
- El guardado lleva `version: 1`; distinta versión, campo que falta o clave desconocida → `null` (se descarta).
- Morir, ganar al jefe final y «Salir» en la pausa borran la partida guardada.
- Se guarda al entrar en una sala (tras el fundido), nunca en combate ni en cada fotograma.
- Idioma del código, comentarios y commits: español. Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ejecutar Vitest desde `C:\Users\pmira\Documents\GitHub\nenufar` (con `C:` en mayúscula; en minúscula todos los tests fallan).

## Review Focus

- `localStorage` bloqueado o lleno (modo privado, Safari): guardar y leer no pueden lanzar; el juego sigue sin guardado → `try/catch` en `almacen.ts` como `cargarRecords` (Tarea 2).
- Guardado con JSON roto o de otra forma (texto a medias, `null`, un número): `leerGuardado` devuelve `null` → test en Tarea 1.
- Pieza de equipo o consumible que ya no existe en `objetos.json` tras una versión nueva → `null` → test en Tarea 1.
- Recuperar en una sala de combate con monstruos vivos: las puertas deben cerrarse y los vencidos no reaparecen → comprobación en Edge (Tarea 4).
- Cerrar justo después de cruzar el portal, en la sala de inicio de la zona siguiente: debe recuperarse en esa zona, sin repetir el cartel y sin contar dos veces la sala violeta → test de `violetasAntes` en Tarea 1 y comprobación en Edge (Tarea 4).

---

### Tarea 1: datos guardados en `core`

**Files:**
- Create: `src/core/guardado.ts`
- Test: `tests/guardado.test.ts`

**Interfaces:**
- Produces:

```ts
export const VERSION_GUARDADO = 1;

/** Estado del mapa de la zona: lo que no sale de la semilla. Índices de `zona.salas`. */
export interface EstadoMapa {
  sala: number;
  /** Lado por el que se entró (como `Salida.lado`); null en la sala de inicio de la zona. */
  lado: number | null;
  visitadas: number[];
  hechas: number[];
  /** Por sala montada, posiciones (en la lista de `poblar`) de los grupos vencidos. */
  vencidos: Record<number, number[]>;
  fuenteUsada: boolean;
}

export interface HeroinaGuardada {
  nombre: string; nivel: number; experiencia: number; puntos: number;
  pv: number; pvMax: number; pm: number; pmMax: number;
  ataque: number; magia: number; defensa: number; velocidad: number;
  critico: number; habilidadesGanadas: string[];
}

export interface PartidaGuardada {
  version: typeof VERSION_GUARDADO;
  semilla: number;
  /** Índice de la zona en el orden de zonas.json. */
  zona: number;
  heroe: string;        // clave de heroes.json
  dificultad: string;   // clave de dificultades.json
  combates: number;
  vencidos: number;
  /** `violetas` y `dragonUsado` de la partida ANTES de crear la zona actual. */
  violetasAntes: number;
  dragonAntes: boolean;
  rival: string;
  segundos: number;
  heroina: HeroinaGuardada;
  inventario: Inventario;
  mapa: EstadoMapa;
}

/** Lo que el juego conoce, para rechazar claves que ya no existen. */
export interface Conocido {
  heroes: readonly string[];
  dificultades: readonly string[];
  equipo: readonly string[];       // claves de objetos.json equipo
  consumibles: readonly string[];  // claves de objetos.json consumibles
  zonas: number;                   // cuántas zonas hay
}

export function heroinaGuardada(l: Luchador): HeroinaGuardada;
/** Copia los campos guardados sobre una luchadora recién creada con `luchadorDeHeroe`. */
export function restaurarHeroina(l: Luchador, g: HeroinaGuardada): void;
/** Lee y comprueba el texto guardado; null si no vale. Nunca lanza. */
export function leerGuardado(texto: string | null, conocido: Conocido): PartidaGuardada | null;
```

- [ ] **Paso 1: tests que fallan** en `tests/guardado.test.ts`, con una partida de ejemplo construida con `luchadorDeHeroe(HEROES.ronin)` e `inventarioInicial` y `conocido` sacado de `HEROES`, `DIFICULTADES`, `OBJETOS` y `zonas.json`:
  - `ida y vuelta`: `leerGuardado(JSON.stringify(g), conocido)` es `toEqual(g)`.
  - `heroína`: tras subir nivel, cambiar pv y añadir `habilidadesGanadas = ['Tajo de llama morada']`, `restaurarHeroina(luchadorDeHeroe(HEROES.ronin), heroinaGuardada(l))` deja esos mismos campos; `estados` queda vacío.
  - `descarta`: `null`, `''`, `'{'`, `'42'`, `'null'`, versión 2, sin `mapa`, `heroe: 'sapo'`, `dificultad: 'imposible'`, `inventario.arma: 'espada_inexistente'`, `inventario.consumibles: { elixir: 1 }`, `zona: 3` (fuera de rango) → todos `null`.
  - `violetasAntes`: se conserva tal cual en la ida y vuelta (`violetasAntes: 1, dragonAntes: true`).
- [ ] **Paso 2:** `npx vitest run tests/guardado.test.ts` → FALLA (no existe el módulo).
- [ ] **Paso 3:** implementar `src/core/guardado.ts`. `leerGuardado` envuelve `JSON.parse` en `try/catch` y comprueba tipos campo a campo (números finitos, enteros donde son índices, arrays de números, claves en `conocido`, también las de `mochila`).
- [ ] **Paso 4:** `npx vitest run tests/guardado.test.ts` → PASA.
- [ ] **Paso 5:** commit `Guardado: datos de la partida en core, con comprobación al leer`.

### Tarea 2: leer, guardar y borrar en `localStorage`

**Files:**
- Modify: `src/render/almacen.ts`
- Modify: `CLAUDE.md` (regla de `localStorage`: «solo para ajustes, récords y la partida en curso»; también en «Stack y decisiones fijas»)

**Interfaces:**
- Consumes: `leerGuardado`, `PartidaGuardada`, `Conocido` (Tarea 1).
- Produces:

```ts
export function cargarPartida(conocido: Conocido): PartidaGuardada | null;
export function guardarPartida(p: PartidaGuardada): void;
export function borrarPartida(): void;
```

- [ ] **Paso 1:** las tres funciones con la clave `'nenufar.partida'`, cada una en `try/catch` sin lanzar (como `cargarRecords`). Cambiar el comentario de la línea 3.
- [ ] **Paso 2:** `npm run build` y `npm run lint` → sin errores.
- [ ] **Paso 3:** commit `Guardado: la partida en localStorage (y la regla en CLAUDE.md)`.

### Tarea 3: `EscenaMapa` informa y recupera; cofres deterministas

**Files:**
- Modify: `src/escenas/mapa.ts`

**Interfaces:**
- Consumes: `EstadoMapa` (Tarea 1).
- Produces, en `OpcionesMapa`:

```ts
/** Estado recuperado de una partida guardada; null o ausente en una zona nueva. */
recuperado?: EstadoMapa | null;
/** Se llama al terminar de entrar en una sala (también la inicial y la recuperada). */
alEntrarEnSala?: (estado: EstadoMapa) => void;
```

- [ ] **Paso 1: cofres.** En `abrir`, el sorteo usa `crearAzar(zona.semilla * 1013 + zona.salas.indexOf(this.actual))` en vez de `this.azarMapa`. El mismo cofre da lo mismo aunque se recupere.
- [ ] **Paso 2: estado.** Método privado `estado(): EstadoMapa` que lo construye desde `actual`, el lado de entrada (guardarlo en un campo al cruzar; `null` al empezar), `visitadas`, `hechas`, `montadas` (posiciones con `vivo === false`) y `fuenteUsada`. Se llama una vez por sala, no por fotograma.
- [ ] **Paso 3: avisar.** Llamar a `o.alEntrarEnSala?.(this.estado())` al final de `cruzar` y al final del constructor.
- [ ] **Paso 4: recuperar.** En el constructor, si `o.recuperado`: marcar `visitadas` y `hechas`, montar cada sala de `vencidos` y poner `vivo = false` en esas posiciones; `fuenteUsada`; para las salas hechas de tipo `tesoro`, cambiar su cofre cerrado por `cofre_abierto` (como hace `abrir`, sin sortear ni sonar); para la sala del jefe hecha, `abrirPortal`. Empezar en `zona.salas[sala]`: con `lado`, en `posicionEntrada` de la salida de ese lado; sin él, `buscarInicio`. Aplicar el cierre de puertas (`aplicarCierre`). Sin fundido de entrada.
- [ ] **Paso 5:** `npm run build`, `npm test` y `npm run lint` → todo pasa.
- [ ] **Paso 6:** commit `Mapa: estado de la zona al entrar en cada sala y recuperarlo; cofres que no cambian al recuperar`.

### Tarea 4: `main.ts` guarda, recupera, borra y avisa al cerrar

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Paso 1: guardar.** `Partida` gana `violetasAntes: number` y `dragonAntes: boolean`; `crearZona` los fija antes de tocar `violetas`/`dragonUsado` y recibe un `recuperado: EstadoMapa | null` que pasa a `EscenaMapa`. Su `alEntrarEnSala` construye la `PartidaGuardada` (`heroe` y `dificultad` por clave, `segundos` desde `inicio`) y llama a `guardarPartida`.
- [ ] **Paso 2: recuperar.** En `iniciar`, antes de la portada, `cargarPartida(conocido)`. Si hay partida: crear la `Partida` con sus datos (luchadora con `luchadorDeHeroe` + `restaurarHeroina`, inventario guardado, `inicio = performance.now() - segundos * 1000`, `violetas = violetasAntes`, `dragonUsado = dragonAntes`), `vestir`, `crearZona(partida, zona, false, mapa)`, `pila.cambiar(zona)` y encima `contar(pila, [{ titulo: 'Partida recuperada', texto: <una línea con la heroína, nivel y zona> }], () => {})`. Sin historia, cartel ni pistas. La portada no se crea. Si hay partida guardada, `?semilla=N` de la URL no cuenta (solo vale para partidas nuevas).
- [ ] **Paso 3: borrar.** `borrarPartida()` al principio de `terminarPartida` (victoria y derrota) y en `empezarOtra`.
- [ ] **Paso 4: aviso al cerrar.** Un `beforeunload` que llama a `preventDefault()` solo mientras hay partida en curso (variable que pone `empezar`/recuperar y quita `terminarPartida`/`empezarOtra`).
- [ ] **Paso 5:** `npm run build`, `npm test`, `npm run lint` → todo pasa.
- [ ] **Paso 6: comprobar en Edge sin ventana** (script CDP del scratchpad, con un perfil persistente para conservar `localStorage` entre cargas): empezar con `?semilla=1`, bajar a la sala de combate, recargar la página → aparece el mensaje y, al pulsar, la heroína en esa sala con las puertas cerradas. Vencer un grupo, cruzar a otra sala, recargar → el grupo vencido no reaparece. Morir o «Salir» y recargar → portada.
- [ ] **Paso 7:** commit `Guardado: recuperar la partida al volver, borrarla al acabar y avisar al cerrar`.

### Tarea 5: documentación

**Files:**
- Modify: `CLAUDE.md` (Estado: guardado hecho), documento de desarrollo (Claude Docs, pestaña de la versión 2 o «Ideas»): qué se guarda, cuándo se borra, el aviso al cerrar y que los cofres ya no dependen del orden de juego.

- [ ] **Paso 1:** actualizar ambos.
- [ ] **Paso 2:** commit `CLAUDE.md: guardado de la partida`.
