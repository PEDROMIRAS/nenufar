# Presagios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Las tareas se titulan «Task N» (los scripts de ejecución buscan ese texto).

**Goal:** Al entrar en una zona, con una probabilidad de datos, sale un presagio que cambia una regla de esa zona (precio y premio), sin tocar el trazado ni el equilibrado de la partida sin presagios.

**Architecture:** Lógica pura en `src/core/presagios.ts` (sorteo con azar propio derivado de la semilla de la zona, y funciones que aplican cada modificador a datos que ya existen: dificultad, tabla del cofre, grupos por sala, fuente). Datos en `src/data/presagios.json`. `main.ts` lo conecta al crear la zona; el simulador de `tests/` lo usa igual para medir cada presagio.

**Tech Stack:** TypeScript estricto, Vitest, JSON de datos. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-08-variedad-partidas-design.md` (bloque 1). Si el plan y la spec discrepan, avisar.

## Global Constraints

- `src/core/` sin DOM; solo `src/render/` y `src/escenas/` tocan el canvas.
- Ningún número de diseño en el código: probabilidades y multiplicadores en `src/data/presagios.json`.
- Todo lo aleatorio con el PRNG con semilla (`crearAzar`); el sorteo **no** consume el azar del trazado: `generarZona` y sus huellas (`tests/violetas_zona.test.ts`) no cambian.
- Sin presagio (probabilidad 0 o no sale) el juego es idéntico al actual: `tests/equilibrado.test.ts` sigue midiendo la partida sin presagios y debe pasar sin tocar sus rangos (Fácil 65-75, Normal 45-55, Difícil 25-35; heroínas a menos de 5 puntos).
- Cada presagio, forzado en las cuatro zonas, no mueve la victoria de partida completa más de ±3 puntos respecto a no tener presagio (búsqueda con 600 partidas, comprobación con 1200; el test de 300 usa ±5 por el ruido).
- Textos en español; comentarios, commits y documentación en español. Commits pequeños, con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Rama `variedad-presagios` (sale de `main`).
- Decisión mía sobre la spec: **no se guarda el presagio** en la partida ni se sube `VERSION_GUARDADO`. Sale de `zona.semilla` y es independiente de las zonas anteriores, así que al recuperar una partida se vuelve a sortear igual (como el trazado). Si Pedro prefiere guardarlo, es una tarea aparte.
- Decisiones mías de alcance (la spec dejaba la lista abierta): cuatro presagios (`luna_roja`, `manada`, `fuente_seca`, `coraza`); *Niebla* y *Presa herida* quedan fuera de esta entrega (el primero toca el minimapa, el segundo necesita ataque solo del jefe). El jefe final se lucha **sin** presagio.

## Review Focus

- Probabilidad 0 en `presagios.json`: ninguna zona recibe presagio y nada cambia (Task 1 lo prueba con el sorteo; Task 4 con el simulador).
- `fuente_seca` en una zona sin sala de descanso, o con la fuente ya usada: sin efecto y sin error (Task 3).
- `nivelCofre: 1` en un cofre que ya es del nivel más alto: se queda en ese nivel, no apunta a una pieza inexistente (Task 1).
- `manada` con más grupos que casillas libres: `colocarMonstruos` devuelve menos y la sala se puebla igual, sin error (Task 3).
- Partida recuperada a mitad de zona: mismo presagio, mismos multiplicadores, y **sin** repetir el cartel (Task 2 y 4; el HUD sí lo muestra).
- Jefe violeta y presagio con `ataque`: se multiplican los dos (`violetas` × presagio); queda dicho en el comentario de `dificultadCon` y lo cubre la medición de Task 5.

---

### Task 1: Datos y lógica pura de los presagios

**Files:**
- Create: `src/data/presagios.json`, `src/core/presagios.ts`, `tests/presagios.test.ts`
- Modify: `src/core/types.ts` (tipos `PresagioJson`, `DatosPresagios`; campo `experiencia?` en `DificultadJson`), `src/data/datos.ts` (export `PRESAGIOS`, mismo patrón que `DIFICULTADES`)

**Interfaces:**
- Produces (en `types.ts`):
  - `interface PresagioJson { nombre: string; descripcion: string; ataque: number; vida: number; experiencia: number; gruposExtra: number; nivelCofre: number; fuente: 'todo' | 'pm' }` (multiplicadores: 1 = sin cambio; `gruposExtra` y `nivelCofre`: 0 = sin cambio).
  - `interface DatosPresagios { probabilidad: number; lista: Record<string, PresagioJson> }`
  - `DificultadJson.experiencia?: number` (multiplica la experiencia de los monstruos; ausente = 1).
- Produces (en `presagios.ts`):
  - `elegirPresagio(datos: DatosPresagios, semillaZona: number): string | null` — con su propio azar (`crearAzar(semillaZona * 17 + 3)`): primero la tirada contra `probabilidad`, luego elige una clave de `lista` con la misma probabilidad.
  - `dificultadCon(d: DificultadJson, p: PresagioJson | null): DificultadJson` — copia con `ataque` y `vida` multiplicados y `experiencia = p.experiencia`; `null` devuelve `d` tal cual (misma referencia). Comentario: los jefes violetas reciben `violetas` y además el presagio.
  - `cofreCon(tabla: readonly BotinJson[], p: PresagioJson | null, nivelMaximo: number): BotinJson[]` — suma `nivelCofre` al `nivel` de cada entrada que lo tiene, sin pasar de `nivelMaximo`.
  - `restaurarFuente(l: { pv: number; pvMax: number; pm: number; pmMax: number }, modo: 'todo' | 'pm'): void`.
- Initial values de `presagios.json` (se recentran en Task 5): `probabilidad` 0,6; `luna_roja` {ataque 1,06, nivelCofre 1}; `manada` {gruposExtra 1, experiencia 1,15}; `fuente_seca` {fuente `pm`, experiencia 1,15}; `coraza` {vida 1,08, nivelCofre 1}; el resto de campos de cada uno, neutros. Nombres: «Luna roja», «Manada», «Fuente seca», «Coraza» (≤ 12 letras, caben en el HUD); `descripcion` de una línea con el precio y el premio.

- [ ] **Step 1: Tests en `tests/presagios.test.ts`**
  - `elegirPresagio`: con `probabilidad: 0` devuelve `null` para 1.000 semillas; con `probabilidad: 1` devuelve siempre una clave de `lista`; la misma semilla da siempre lo mismo; con la `probabilidad` real salen las cuatro claves y `null` en 2.000 semillas.
  - `dificultadCon(d, null) === d`; con `luna_roja` sobre `DIFICULTADES.normal`, `ataque` = `1,08 × 1,06` y `vida` igual; `experiencia` = la del presagio.
  - `cofreCon`: `nivelCofre: 1` sube de 1 a 2; con `nivelMaximo: 4` una entrada de nivel 4 se queda en 4; una entrada sin `nivel` (poción) queda igual; no modifica la tabla original.
  - `restaurarFuente`: `'todo'` deja PV y PM al máximo; `'pm'` deja los PV como estaban y los PM al máximo.
  - Datos: cada presagio tiene `nombre` de ≤ 12 letras, `descripcion` no vacía, multiplicadores > 0, `gruposExtra` y `nivelCofre` enteros ≥ 0.
- [ ] **Step 2: Ejecutar `npx vitest run tests/presagios.test.ts`.** Esperado: falla (no existe `presagios.ts`).
- [ ] **Step 3: Escribir los tipos, el JSON, el export y `presagios.ts`** con las firmas de arriba.
- [ ] **Step 4: Ejecutar `npx vitest run tests/presagios.test.ts`.** Esperado: pasa.
- [ ] **Step 5: Commit** `Presagios: datos y lógica pura`.

### Task 2: Experiencia con presagio

**Files:**
- Modify: `src/core/types.ts` (`ReglasCombate.multiplicadorExperiencia?: number`), `src/core/dificultad.ts` (`reglasCon`), `src/core/combate.ts:686` (la suma de PX), `tests/dificultad.test.ts`, `tests/combate.test.ts`

**Interfaces:**
- Consumes: `DificultadJson.experiencia?` (Task 1).
- Produces: `reglasCon(r, d)` devuelve además `multiplicadorExperiencia: d.experiencia ?? 1`; al ganar, `px = Math.round(suma de e.monstruo.experiencia × (c.reglas.multiplicadorExperiencia ?? 1))`. Con el multiplicador ausente o 1 el resultado es exactamente el de hoy.

- [ ] **Step 1: Tests.** `reglasCon` con y sin `experiencia` en la dificultad; en `combate.test.ts`, un combate ganado contra un grupo cuya suma es 12 da 12 PX con el multiplicador ausente y 14 con 1,15 (`Math.round(13,8)`).
- [ ] **Step 2: Ejecutar** `npx vitest run tests/dificultad.test.ts tests/combate.test.ts`. Esperado: falla.
- [ ] **Step 3: Implementar** los tres cambios de arriba.
- [ ] **Step 4: Ejecutar** los mismos tests y `npx vitest run tests/equilibrado.test.ts` (debe seguir pasando igual: sin presagio nada cambia). Esperado: pasan.
- [ ] **Step 5: Commit** `Experiencia: multiplicador por presagio`.

### Task 3: El mapa aplica los grupos extra y la fuente

**Files:**
- Modify: `src/core/monstruos.ts` (nueva `cuantosGrupos`), `src/escenas/mapa.ts` (`OpcionesMapa`, `poblar`, la fuente en `update`), `tests/monstruos.test.ts`

**Interfaces:**
- Consumes: `restaurarFuente` (Task 1).
- Produces: `cuantosGrupos(ajustes: { min: number; max: number }, extra: number, azar: () => number): number` = `min + ⌊azar() × (max − min + 1)⌋ + extra` (consume una sola tirada, como hoy). `OpcionesMapa` gana `gruposExtra: number` y `fuente: 'todo' | 'pm'`; el aviso de la fuente dice «La fuente te restaura los PV y los PM» o «La fuente solo te restaura los PM».

- [ ] **Step 1: Tests en `tests/monstruos.test.ts`:** `cuantosGrupos` con `extra: 0` da el mismo valor que la fórmula de hoy para 200 semillas (entre `min` y `max`); con `extra: 1` da ese valor + 1; consume una sola tirada del azar. Y `colocarMonstruos` pidiendo más grupos que casillas libres devuelve menos y no falla (la sala de 15×11 del test, con `cuantos: 500`).
- [ ] **Step 2: Ejecutar** `npx vitest run tests/monstruos.test.ts`. Esperado: falla.
- [ ] **Step 3: Implementar** `cuantosGrupos`; usarla en `poblar` (`mapa.ts:715`); sustituir en `update` (`mapa.ts:319-329`) `l.pv = l.pvMax; l.pm = l.pmMax` por `restaurarFuente(l, this.o.fuente)` y el aviso según el modo. Los dos campos nuevos se pasan desde `main.ts` en Task 4; mientras tanto, los dos sitios que crean `OpcionesMapa` (main y, si existe, el visor de desarrollo) los reciben con `0` y `'todo'`.
- [ ] **Step 4: Ejecutar** `npx vitest run` completo y `npm run build`. Esperado: verde.
- [ ] **Step 5: Commit** `Mapa: grupos extra y fuente por presagio`.

### Task 4: Conectar el presagio en `main.ts`

**Files:**
- Modify: `src/main.ts` (`Partida`, `crearZona`, `luchar`/combates con `monstruoCon`, el portal final, `cartel`), `src/escenas/mapa.ts` (cabecera del HUD y aviso al entrar), `src/data/historia.json` solo si hace falta texto del cartel

**Interfaces:**
- Consumes: `elegirPresagio`, `dificultadCon`, `cofreCon` (Task 1); `reglasCon` (Task 2); `OpcionesMapa.gruposExtra`, `fuente` (Task 3).
- Produces: `Partida.presagio: PresagioJson | null` y `Partida.dificultadZona: DificultadJson` (la dificultad con el presagio puesto; `partida.dificultad` **no cambia**, porque los récords la buscan por identidad en `DIFICULTADES`). `OpcionesMapa.presagio: string | null` (nombre para el HUD y el aviso).

- [ ] **Step 1: En `crearZona`**, justo después de `generarZona`: `const clave = PRESAGIO_FORZADO ?? elegirPresagio(PRESAGIOS, zona.semilla)`; `partida.presagio = clave ? PRESAGIOS.lista[clave] : null`; recalcular `partida.dificultadZona = dificultadCon(partida.dificultad, partida.presagio)`, `partida.bestiario = bestiarioCon(MONSTRUOS, partida.dificultadZona)` y `partida.reglas = reglasCon(REGLAS, partida.dificultadZona)`. Pasar a `EscenaMapa` `gruposExtra: p?.gruposExtra ?? 0`, `fuente: p?.fuente ?? 'todo'`, `cofre: cofreCon(datos.cofre, p, OBJETOS.armaduras.length)` y `presagio: p?.nombre ?? null`.
- [ ] **Step 2: Los combates** que hoy usan `monstruoCon(m, partida.dificultad)` (`main.ts:840`) pasan a `partida.dificultadZona`. Al usar el portal de la última zona, antes de `lucharJefe` del final: `partida.presagio = null` y recalcular las tres cosas con `partida.dificultad`.
- [ ] **Step 3: Atajo de desarrollo** `?presagio=clave` (solo con `import.meta.env.DEV`, como `?zona=N`), marcado con `// shortcut: solo en desarrollo, para probar un presagio concreto`. Lee la clave y comprueba que existe en `PRESAGIOS.lista`.
- [ ] **Step 4: Cartel y HUD.** Si hay presagio y la partida **no** es recuperada (`!recuperado`), tras el cartel de la zona se cuenta una página `{ titulo: 'Presagio: ' + nombre, texto: descripcion }` (`contar` con `cartel(...)` ya se usa así en el portal; en la primera zona va junto al cartel inicial). En `mapa.ts:512` la cabecera pasa a `${nombreZona} · ${presagio} · Nv ${nivel}` cuando hay presagio.
- [ ] **Step 5: Verificar** `npx vitest run`, `npm run build`, `npm run lint`. Después, a mano con Edge y `npm run dev`: `?presagio=manada`, `?presagio=fuente_seca` y `?presagio=luna_roja` en el Bosque (cartel, cabecera, más grupos, fuente solo PM, cofre de nivel 2) y con la ventana en vertical (390×844), mirando que la cabecera no se corta. Cerrar y reabrir a mitad de zona: mismo presagio y sin cartel.
- [ ] **Step 6: Commit** `Presagios: sorteo al entrar en la zona, cartel y HUD`.

### Task 5: El simulador mide los presagios

**Files:**
- Modify: `tests/simulador.ts` (`simular`), `tests/equilibrado.test.ts` (solo si hace falta pasar el argumento nuevo), nuevo `tests/presagios_equilibrado.test.ts`

**Interfaces:**
- Consumes: Task 1 a 3.
- Produces: `simular(nombre, partidas, dificultad, alExplorar?, presagios?: { forzado?: string; probabilidad?: number })`. Sin `presagios` (o con `probabilidad: 0`) el resultado es idéntico al de hoy. Con `forzado: clave` esa zona-presagio se aplica en las cuatro zonas; con `probabilidad: p` se sortea con `elegirPresagio({ ...PRESAGIOS, probabilidad: p }, zona.semilla)`. Por zona: `mundo` y `cofre` con el presagio, `gruposExtra` en `n`, `restaurarFuente` en los dos sitios donde el simulador cura en la fuente. El jefe final usa el `mundo` base.

- [ ] **Step 1: Test de identidad** en `tests/presagios_equilibrado.test.ts`: `simular(nombre, 100, normal)` y `simular(nombre, 100, normal, undefined, { probabilidad: 0 })` dan exactamente el mismo `completas` y las mismas tablas, para las dos heroínas.
- [ ] **Step 2: Ejecutar** `npx vitest run tests/presagios_equilibrado.test.ts`. Esperado: falla (parámetro inexistente o idéntico por casualidad; si pasa sin cambios, añadir antes el test del paso 3).
- [ ] **Step 3: Test por presagio** (`test.each` sobre las claves de `PRESAGIOS.lista`, en las tres dificultades y las dos heroínas, 300 partidas): `|completas con presagio forzado − completas sin presagio| ≤ 5`; imprimir las dos cifras. Timeout amplio (`300_000`).
- [ ] **Step 4: Implementar** el parámetro en `simular`.
- [ ] **Step 5: Ejecutar** `npx vitest run tests/presagios_equilibrado.test.ts tests/equilibrado.test.ts`. Esperado: el de identidad y el de equilibrado pasan; el de cada presagio puede fallar: eso es el insumo de Task 6.
- [ ] **Step 6: Commit** `Simulador: presagios`.

### Task 6: Buscar las cifras de cada presagio

**Files:**
- Modify: `src/data/presagios.json`, `tests/presagios_equilibrado.test.ts` (la tolerancia final)

**Interfaces:**
- Consumes: `simular` con `forzado` (Task 5).
- Produces: cifras de los cuatro presagios con las que cada uno, **en las cuatro zonas a la vez**, se queda dentro de ±3 puntos de la partida sin presagio con cada heroína en Fácil, Normal y Difícil.

- [ ] **Step 1: Medir con 600 partidas** (script suelto en la carpeta temporal, no en el repo) la victoria sin presagio y con cada presagio forzado. Registrar la tabla.
- [ ] **Step 2: Retocar** `ataque`, `vida`, `experiencia`, `gruposExtra` o `nivelCofre` de los que se salgan, con el método de siempre (buscar con 600, comprobar con 1200 y que pasen las 300 del test); los valores se guardan redondeados a 3 decimales y se buscan ya así. Palancas por orden: `ataque`/`vida` del precio, `experiencia` del premio, y por último `nivelCofre`/`gruposExtra` (saltan en enteros). Si un presagio no entra en ±3 con ninguna cifra razonable, se quita y se dice.
- [ ] **Step 3: Fijar el test** de Task 5 con la tolerancia que resulte (±5 con 300 partidas por el ruido) y comprobar `npx vitest run` completo: `equilibrado.test.ts` intacto.
- [ ] **Step 4: Commit** `Presagios: cifras equilibradas` con la tabla (sin presagio / con cada uno) en el cuerpo del commit.

### Task 7: Documentación y cierre

**Files:**
- Modify: `CLAUDE.md` (Estado y Próximos pasos), `docs/superpowers/specs/2026-11-08-variedad-partidas-design.md` (decisiones tomadas: presagio no guardado, cuatro presagios, final sin presagio, respuestas de Pedro si las hay)

- [ ] **Step 1: CLAUDE.md:** viñeta del bloque 1 (rama, qué hay, cifras medidas, atajo `?presagio=`, **sin probar en móvil**), y los Próximos pasos con el bloque 2 (salas de evento).
- [ ] **Step 2: Actualizar el documento de desarrollo** (pestaña «Versión 2») si Pedro lo pide; si no, dejarlo anotado en CLAUDE.md como pendiente.
- [ ] **Step 3: Verificar** `npm test`, `npm run lint`, `npm run build`.
- [ ] **Step 4: Commit** `CLAUDE.md: presagios`. La fusión y la publicación las decide Pedro.

---

## Autocomprobación

- **Cobertura de la spec (bloque 1):** sorteo con probabilidad y azar propio → Task 1; modificadores reutilizando los existentes → Tasks 1-3; cartel y HUD → Task 4; guardado → decidido no guardar (Constraints); equilibrado ±3 y test del sorteo → Tasks 5-6; la partida sin presagios sigue como hoy → Task 2, 4 y 5. *Niebla* y *Presa herida*, citados como ejemplos, quedan fuera y está dicho.
- **Consistencia de tipos:** `PresagioJson`, `DatosPresagios`, `elegirPresagio`, `dificultadCon`, `cofreCon`, `restaurarFuente` (Task 1) se usan con esos nombres en 3, 4 y 5; `multiplicadorExperiencia` y `experiencia?` (Tasks 1-2) enlazan por `reglasCon`.
- **Proporción:** plan más corto que el código que describe; los cuerpos de las funciones los escribe quien implementa.
