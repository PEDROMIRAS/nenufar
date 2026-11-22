# Tres habilidades equipadas — plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que cada rana lleve 3 habilidades equipadas de un abanico de 9 y las elija al entrar en cada zona, junto a la fuente del descanso y antes del jefe final.

**Architecture:** la luchadora guarda `equipadas` (nombres); `habilidadesConocidas` es lo de hoy (nivel y recompensas) y `habilidadesDisponibles` pasa a ser solo las equipadas, así el combate, la pausa y la jugadora simulada no cambian de llamada. Una escena nueva `EscenaHabilidades` (como `EscenaEvento`) cambia las equipadas; `partida/` y el mapa la abren en los cuatro momentos. El equilibrado se rehace con la jugadora simulada eligiendo por zona.

**Tech Stack:** TypeScript estricto, Vitest, Canvas 2D; datos en `src/data/*.json`.

**Spec:** `docs/superpowers/specs/2026-11-22-tres-habilidades-design.md` (léelo entero: las tablas de habilidades y los momentos de elegir están ahí).

## Global Constraints

- `src/core/` no importa nada del navegador; todo lo nuevo de lógica va ahí, con test.
- Ningún número de diseño en el código: PM, poder, porcentajes, el máximo de equipadas (`heroes.json → equipables: 3`) y la política de la jugadora salen de `src/data/*.json`.
- Nada de `if (heroina === 'maga')`: lo que diferencia a las ranas vive en `heroes.json` y `jugadora.json`.
- Cero asignaciones de memoria dentro del bucle de juego (la escena no crea objetos por fotograma).
- Código, comentarios, textos y commits en español; textos de pantalla en el tono del juego.
- Las pantallas nuevas declaran `alta = true` y se manejan con teclado, dedo (dos toques en listas) y mando, y anuncian al lector (`anunciar`).
- `VERSION_GUARDADO` no sube.
- Equilibrado: Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 % y menos de 5 puntos entre ranas; los tests existentes de equilibrado, violetas, presagios, eventos y reto tienen que pasar. Se pueden tocar sin preguntar PM y poder de todas las habilidades y los multiplicadores de dificultad; **no** las estadísticas de las ranas ni `reto.json → nivel` (si no cuadra sin ellos, parar y preguntar a Pedro).

## Review Focus

1. **Partida guardada de antes, sin `equipadas`** → se recupera con las 3 primeras conocidas, sin error (test en Task 3).
2. **Subir de nivel o ganar la recompensa** → la habilidad nueva no aparece en el combate hasta equiparla, y la pantalla de nivel lo dice (tests en Task 2 y Task 8).
3. **Quedarse quieta junto a la fuente** → la pantalla sale una vez; solo vuelve tras apartarse y acercarse (test en Task 7).
4. **Cerrar el navegador con la pantalla abierta antes del jefe final** → al volver sale otra vez antes del combate (test en Task 7).
5. **Equipar una cuarta con 3 puestas, o cerrar con menos de 3** → no pasa nada y se avisa; con menos de 3 conocidas se puede cerrar con todas (tests en Task 2).

---

### Task 1: Habilidades nuevas, estados nuevos y quitar estados

**Files:**
- Modify: `src/data/heroes.json` (las dos listas `habilidades`), `src/data/combate.json` (`estados`), `src/core/types.ts` (`HabilidadJson`), `src/core/combate.ts` (`usarHabilidad`), `src/core/descripciones.ts` (`describirHabilidad`)
- Test: `tests/habilidades.test.ts`, `tests/descripciones.test.ts`

**Interfaces:**
- Produces: `HabilidadJson.quitaEstados?: string[]` (claves de `combate.json → estados` que la habilidad quita a cada objetivo); estados `velo` `{ nombre: 'Velo', turnos: 3, defensa: 1.5 }` y `debilitado` `{ nombre: 'Debilitado', turnos: 3, ataque: 0.6, magia: 0.6 }`.

- [ ] **Step 1: Tests que fallan** en `tests/habilidades.test.ts` (las heroínas de estos tests, con la habilidad que prueban en `equipadas` puesta a mano: el campo llega en la Task 2, así que esta tarea añade ya `equipadas: string[]` a `Luchador`, vacío en `luchador()`, sin usarlo todavía):
  - `'Golpe de pomo y Escarcha rompen el golpe cargado'`: un limo con `cargando = true`; tras usar cada una, `cargando` es falso.
  - `'Respiro quita veneno y quemadura y cura el 25 %'`: ronin con los dos estados y la mitad de PV; tras usarlo, `estados` vacío y `pv` sube `round(pvMax × 0,25)`.
  - `'Purificar quita veneno y quemadura y cura el 15 %'`, igual con la maga.
  - `'Maldición deja al enemigo con el 60 % de ataque y de magia'`: `efectiva(enemigo, 'ataque')` y `'magia'` = 0,6 × base.
  - `'Grito de guerra pone Furia a la ronin y Hoja envenenada envenena'`.
- [ ] **Step 2:** `npx vitest run tests/habilidades.test.ts` → FAIL (no existen).
- [ ] **Step 3: Datos.** Las nueve de cada rana en el orden y con los niveles y cifras de las tablas del spec (iniciales `nivel: 1`; recompensa `nivel: 99, recompensa: true`). Nuevas: Golpe de pomo (`pm 2`, `uno`, físico `0.7`, `rompeCarga`), Grito de guerra (`pm 3`, `propio`, `estado: furia`), Hoja envenenada (`pm 4`, `uno`, físico `1.0`, `estado: veneno`), Respiro (`pm 5`, `propio`, `cura 0.25`, `quitaEstados: [veneno, quemadura]`), Escarcha (`pm 2`, `uno`, mágico `0.6`, `rompeCarga`), Velo (`pm 3`, `propio`, `estado: velo`), Maldición (`pm 4`, `uno`, `estado: debilitado`), Purificar (`pm 4`, `propio`, `cura 0.15`, `quitaEstados: [veneno, quemadura]`). `efecto` y `sonido` de los que ya existen en `efectos.json`/`sonido.json`. `especiales.habilidad` sigue nombrando la de recompensa.
- [ ] **Step 4: Motor.** En `usarHabilidad`, por cada objetivo, tras la cura: quitar cada estado de `quitaEstados` que tenga (con `quitarEstado`, que ya emite el evento). Nada más cambia: `rompeCarga`, estados a enemigos y `furia` propia ya funcionan.
- [ ] **Step 5: Descripción.** `describirHabilidad` añade «Rompe el golpe cargado» con `rompeCarga` y «Quita Veneno y Quemadura» con `quitaEstados` (nombres de `estados`). Test en `tests/descripciones.test.ts`: la de Golpe de pomo y la de Respiro contienen esas frases; y el test existente de que caben en la franja sigue pasando con las 18.
- [ ] **Step 6:** `npx vitest run tests/habilidades.test.ts tests/descripciones.test.ts` → PASS. (Los de equilibrado pueden fallar hasta la Task 5: no ejecutarlos aquí.)
- [ ] **Step 7: Commit** `Habilidades nuevas: cuatro por rana, Velo y Debilitado, y habilidades que quitan estados`.

### Task 2: Habilidades equipadas en la luchadora

**Files:**
- Modify: `src/core/combate.ts`, `src/data/heroes.json` (`equipables: 3` en cada rana), `src/core/types.ts` (`HeroeJson.equipables`), `src/core/progresion.ts` (`cambiosDeNivel`)
- Create: `src/core/equipadas.ts`
- Test: `tests/equipadas.test.ts`

**Interfaces:**
- Consumes: datos de la Task 1.
- Produces:
  - `Luchador.equipadas: string[]` (nombres; `[]` en los monstruos).
  - `habilidadesConocidas(l: Luchador): HabilidadJson[]` (en `combate.ts`: lo que hoy es `habilidadesDisponibles`).
  - `habilidadesDisponibles(l)`: las conocidas que están en `equipadas`, en el orden de la lista de la rana.
  - `actuar` rechaza una habilidad no equipada (como hoy rechaza una no disponible).
  - En `src/core/equipadas.ts` (el máximo de cada rana es `l.heroe?.equipables ?? 0`): `equipadasIniciales(l: Luchador): string[]` (las primeras conocidas, hasta el máximo); `alternarEquipada(l: Luchador, nombre: string): 'puesta' | 'quitada' | 'llena'` (muta `l.equipadas`; `'llena'` no cambia nada); `puedeCerrar(l: Luchador): boolean` (equipadas = `min(máximo, conocidas)`); `ajustarEquipadas(l: Luchador): void` (quita las que ya no conoce y, si quedan 0, pone las iniciales; lo usan la recuperación y el reto tras subir de nivel).
  - `luchadorDeHeroe` deja `equipadas` con `equipadasIniciales` (nivel 1: las 3 primeras de las 4 iniciales).
  - `cambiosDeNivel(antes, ahora, aviso = '')`: cada «Nueva habilidad: X» lleva detrás `aviso` si se pasa.

- [ ] **Step 1: Tests que fallan** (`tests/equipadas.test.ts`):
  - `'con 4 conocidas y 3 equipadas, el combate solo ofrece esas 3'`.
  - `'alternar quita una puesta, pone una libre y con 3 puestas dice llena sin cambiar nada'`.
  - `'puedeCerrar exige 3; con menos de 3 conocidas, todas'` (heroína con una sola conocida: una copia del héroe con una habilidad en su lista).
  - `'subir de nivel no equipa la nueva'`: ronin con sus 3 iniciales, `ganarExperiencia` hasta nivel 3 → Tajo del viento conocida y no disponible.
  - `'ajustarEquipadas quita nombres desconocidos y rellena si queda vacía'`.
  - `'actuar con una habilidad no equipada lanza error'`.
  - `'cambiosDeNivel añade el aviso a la habilidad nueva'`.
- [ ] **Step 2:** ejecutar → FAIL.
- [ ] **Step 3:** implementar lo de Interfaces. `pausa.ts`, `escenas/combate.ts` y `jugadora.ts` siguen llamando a `habilidadesDisponibles` y ya ven solo las equipadas. Los tests existentes que suben el nivel a mano y usan una habilidad de ese nivel (`habilidades.test.ts`, `combate.test.ts`, `objetos.test.ts`…) la equipan antes (`l.equipadas = [...]`).
- [ ] **Step 4:** `npx vitest run tests/equipadas.test.ts tests/habilidades.test.ts tests/combate.test.ts` → PASS.
- [ ] **Step 5: Commit** `Habilidades equipadas: la luchadora lleva 3 y el combate solo ofrece esas`.

### Task 3: Guardar y recuperar las equipadas

**Files:**
- Modify: `src/core/guardado.ts`, `src/main.ts` (rama de partida recuperada)
- Test: `tests/guardado.test.ts`

**Interfaces:**
- Consumes: `ajustarEquipadas` (Task 2).
- Produces: `HeroinaGuardada.equipadas?: string[]`; `heroinaGuardada` la copia; `restaurarHeroina` la copia si viene (si no, deja vacío); `leerGuardado` la acepta ausente o como lista de textos (rechaza otro tipo); `main.ts`, tras `restaurarHeroina`, llama a `ajustarEquipadas(luchadora)`.

- [ ] **Step 1: Tests que fallan:** `'guarda y restaura las equipadas'`, `'una partida sin equipadas se lee y se recupera con las 3 primeras conocidas'` (texto guardado sin el campo → `leerGuardado` no es null; tras restaurar y `ajustarEquipadas`, 3), `'equipadas que no son textos invalidan el guardado'`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npx vitest run tests/guardado.test.ts tests/mapa_recuperar.test.ts` PASS.
- [ ] **Step 5: Commit** `Guardado: las habilidades equipadas viajan con la partida`.

### Task 4: La jugadora simulada elige y usa las nuevas

**Files:**
- Modify: `src/core/jugadora.ts`, `src/data/jugadora.json`, `src/core/diaJusto.ts` (`jugarReto`), `tests/simulador.ts` (`simular`)
- Test: `tests/jugadora.test.ts`

**Interfaces:**
- Consumes: Task 1-2.
- Produces:
  - `PoliticaJugadora.prioridad: Record<string, string[]>` y `prioridadJefe: Record<string, string[]>` (por clave de `heroes.json`, nombres de habilidad en orden de preferencia).
  - `elegirEquipadas(h: Luchador, orden: readonly string[]): void`: equipa las primeras de `orden` que conozca, hasta su máximo; si no llega, completa con las conocidas en su orden.
  - `decidir` (privada) suma, por este orden de prioridad tras la cura: quitarse veneno/quemadura si los tiene y lleva habilidad con `quitaEstados`; romper un golpe cargado con habilidad `rompeCarga` (sobre el que carga) antes que defenderse; en el primer turno contra un jefe, `furia` propia o un estado a enemigo (`debilitado`, `veneno`) si lo lleva; `estado` propio defensivo (`postura`/`velo`) cuando defendería un golpe cargado y no lo puede romper. El resto como hoy.
  - Momentos: `simular` llama a `elegirEquipadas` con `prioridad` al empezar cada zona, con `prioridadJefe` donde usa la fuente antes del jefe y antes del jefe final; `jugarReto` igual (al empezar y antes del jefe).
  - Valores iniciales en `jugadora.json` (provisionales; la Task 5 los afina): ronin `prioridad` `[Golpe de pomo, Corte rápido, Tajo del viento, Iaido, Hoja envenenada, Respiro]`, `prioridadJefe` `[Iaido, Hoja envenenada, Golpe de pomo, Corte rápido, Grito de guerra]`; maga `prioridad` `[Fuego morado, Curar, Tormenta morada, Escarcha, Fuego fatuo]`, `prioridadJefe` `[Fuego fatuo, Maldición, Curar, Fuego morado]`.

- [ ] **Step 1: Tests que fallan** (`tests/jugadora.test.ts`): `'elige las 3 primeras de su orden que conoce'`; `'con un golpe cargado y Golpe de pomo equipado, lo rompe en vez de defenderse'` (decidir vía `pelear` contra un limo forzado a cargar: no hay evento `defensa` de la heroína y sí `cargaRota`); `'con veneno y Respiro equipado, se lo quita'`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS (`tests/jugadora.test.ts`, `tests/reto_simulador.test.ts`).
- [ ] **Step 5: Commit** `Jugadora simulada: elige sus 3 por zona y usa las habilidades nuevas`.

### Task 5: Reequilibrado y combinaciones dominantes

**Files:**
- Modify: `src/data/heroes.json` (PM y poder de habilidades), `src/data/dificultades.json`, `src/data/jugadora.json`
- Create: `tests/trios.test.ts` (informe, `test.skip` por defecto como los informes largos)
- Test: los de equilibrado existentes

- [ ] **Step 1: Medir** con `npx vitest run tests/equilibrado.test.ts tests/violetas.test.ts tests/presagios_rango.test.ts tests/eventos_rango.test.ts tests/reto_equilibrado.test.ts` y anotar las cifras.
- [ ] **Step 2: Informe de tríos** (`tests/trios.test.ts`): por rana y zona, cada combinación posible de 3 de las conocidas en el nivel con que se llega a esa zona (los `niveles` que devuelve `simular`), sin las de recompensa; `pelear` contra 200 combates de esa zona (sus grupos y su jefe, con `bestiarioCon` de Normal); imprime el porcentaje de cada trío y avisa (`console.warn`) si un trío gana a todos los demás por más de 10 puntos en todas las zonas.
- [ ] **Step 3: Ajustar**, con el método de siempre: buscar con 600 partidas, comprobar con 1200, exigir que pasen las 300 de los tests. Palancas por orden: PM y poder de las habilidades (todas), `prioridad`/`prioridadJefe` si la política juega mal, y multiplicadores de `dificultades.json`. Prohibido sin preguntar: estadísticas de las ranas y `reto.json → nivel`.
- [ ] **Step 4:** toda la suite, `npm run lint`, `npm run build` → verde. El informe de tríos sin avisos.
- [ ] **Step 5: Commit** `Reequilibrado con tres habilidades equipadas` (en el mensaje, las cifras antes → después por rana y dificultad).

### Task 6: La pantalla «Habilidades»

**Files:**
- Create: `src/escenas/habilidades.ts`
- Modify: `src/data/historia.json` (textos de la pantalla: título «Habilidades · elige {n}», «Listo», «Quita una antes», «Elige {n} antes de seguir»)
- Test: `tests/equipadas.test.ts` (la lógica ya está en la Task 2; aquí solo el reparto si sale una función pura nueva)

**Interfaces:**
- Consumes: `habilidadesConocidas`, `alternarEquipada`, `puedeCerrar`, `describirHabilidad`.
- Produces: `class EscenaHabilidades implements Escena` con `alta = true`, `constructor(luchadora: Luchador, estados: Record<string, EstadoJson>, alCerrar: () => void)`.

- [ ] **Step 1:** construirla sobre la forma de `EscenaEvento` (título, filas con `dibujarFila`, explicación de la fila bajo el cursor debajo de la lista, en las dos orientaciones): una fila por conocida con marca ■/□ y su coste, y una fila final «Listo». Confirmar sobre una habilidad la alterna (sonido de menú; si `'llena'`, aviso «Quita una antes» en la explicación y `anunciar`); sobre «Listo», o Cancelar, cierra si `puedeCerrar` y si no avisa «Elige 3 antes de seguir». Dedo: dos toques como `EscenaEvento` (`efectoToque`, `filaTocada`). Mando y teclado por `acciones`. Si las filas no caben (alta baja), se desplazan como en las otras listas.
- [ ] **Step 2:** comprobarla con capturas (Task 9), no con test de dibujo.
- [ ] **Step 3: Commit** `Pantalla Habilidades: elegir las 3 equipadas`.

### Task 7: Abrirla en los cuatro momentos

**Files:**
- Modify: `src/partida/zona.ts`, `src/main.ts`, `src/escenas/mapa.ts` (`OpcionesMapa`, `update`), `src/partida/combates.ts` o `zona.ts` (jefe final)
- Create: `tests/mapa_falso.ts` (el arnés de `tests/mapa_recuperar.test.ts`, sacado para reutilizarlo: `vi.mock` de dibujo y sonido, `abrirMapa(opciones parciales)`)
- Test: `tests/mapa_fuente.test.ts`, `tests/mapa_recuperar.test.ts`

**Interfaces:**
- Consumes: `EscenaHabilidades` (Task 6).
- Produces:
  - `elegirHabilidades(partida: Partida, alCerrar: () => void): void` en `src/partida/relato.ts` (apila la escena; al cerrar, la quita y sigue).
  - `OpcionesMapa.elegirHabilidades: (alCerrar: () => void) => void`.
  - En el mapa: junto a la fuente de la sala de descanso (mismo `objetoAlAlcance(..., 'fuente', ..., ALCANCE)`), tras restaurar si tocaba, llama a `elegirHabilidades` una vez por acercamiento (bandera propia `fuenteLista`, como `eventoListo`).

- [ ] **Step 1: Tests que fallan:**
  - `tests/mapa_fuente.test.ts`: `'junto a la fuente se elige una vez; apartarse y volver la abre otra'` (heroína colocada junto a la fuente del descanso; varios `update` → 1 llamada; moverla lejos y volver → 2).
  - En `tests/mapa_recuperar.test.ts` (ya con el arnés compartido): `'recuperar con el combate final vuelve a pedir las habilidades antes del jefe'` — `reanudarCombate({ tipo: 'final' })` llama a `alUsarPortal`; el test comprueba que la opción del portal final pasa por `elegirHabilidades` antes de `lucharJefe` (con dobles).
- [ ] **Step 2:** FAIL → **Step 3:** implementar:
  - Partida nueva y cada zona nueva: tras `contar(...)` de historia, cartel y presagio, `elegirHabilidades` (en `main.ts → empezar` y en `zona.ts → alUsarPortal`). No al recuperar.
  - Jefe final (`zona.ts`, rama final de `alUsarPortal`): `elegirHabilidades(partida, () => lucharJefe(...))`, después de `guardarPartida(... { tipo: 'final' })`.
  - Reto: en `main.ts → empezarReto`, tras su página de entrada (también con «Otra vez»). El reloj del reto no corre con la pantalla abierta: en `main.ts`, `esPausa` pasa a contar también `EscenaHabilidades`.
  - Reto: tras `empezarEnNivel`, `ajustarEquipadas(luchadora)` (sigue con las 3 iniciales; la pantalla deja elegir entre las 5 que conoce a nivel 3).
- [ ] **Step 4:** PASS + suite de `tests/mapa_*`.
- [ ] **Step 5: Commit** `Se eligen las habilidades al entrar en cada zona, junto a la fuente y antes del jefe final`.

### Task 8: Pausa y avisos de habilidad nueva

**Files:**
- Modify: `src/escenas/pausa.ts`, `src/render/pausa.ts`, `src/render/pausaAlta.ts`, `src/partida/combates.ts` (`cambiosDeNivel` con aviso; texto de la recompensa), `src/partida/eventos.ts` (altar: subir de nivel), `src/data/historia.json`
- Test: `tests/progresion.test.ts`

**Interfaces:**
- Consumes: `habilidadesConocidas`, `cambiosDeNivel(antes, ahora, aviso)`.
- Produces: en la ficha de la pausa, `habilidades` (equipadas) y `otras` (conocidas no equipadas, en tenue) y la línea «Se cambian al entrar en una zona o junto a la fuente» (`historia.json`). Texto de aviso en `historia.json → habilidades.aviso`: «Equípala junto a la fuente o al entrar en la siguiente zona», usado tras «Nueva habilidad: X» en la subida de nivel y añadido a `recompensas.habilidad.texto`.

- [ ] **Step 1: Test que falla:** en `tests/progresion.test.ts`, `'la subida de nivel avisa de dónde equipar la habilidad nueva'`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (horizontal: columna Habilidades con las equipadas, debajo las otras en `PALETA.tenue` y la línea; vertical: lo mismo en su bloque; comprobar que caben con 9 en las dos con capturas) → **Step 4:** PASS.
- [ ] **Step 5: Commit** `Pausa: las 3 equipadas y las demás; aviso al aprender una habilidad`.

### Task 9: Comprobar en el navegador, documentar y publicar

- [ ] **Step 1: Capturas** con Playwright (receta de `CLAUDE.md`) a 1280×800 y 390×844: la pantalla al empezar la partida (ronin y maga), con 9 conocidas (atajo `?puntos` no sirve: usar la consola o `?zona=3`, que empieza a nivel bajo; si hace falta, un atajo `shortcut:` de desarrollo `?nivel=N`), el aviso «Quita una antes», la pausa con equipadas y otras, el menú de combate con solo 3, la fuente del descanso abriéndola, el reto y el combate final (`?zona=3` y portal). Sin errores en la página.
- [ ] **Step 2:** `npm test`, `npm run lint`, `npm run build` → verde; `find src tests dist -name "* 2.*"` vacío.
- [ ] **Step 3:** revisor final nuevo (Opus) sobre toda la rama; arreglar lo importante.
- [ ] **Step 4:** `CLAUDE.md` (bloque nuevo en «Por dónde vamos» con lo hecho, cifras de equilibrado y lo no visto) y fusionar en `main` y publicar (regla de Pedro). Ofrecer actualizar el documento de desarrollo.
