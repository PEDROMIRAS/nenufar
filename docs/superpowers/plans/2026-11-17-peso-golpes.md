# Peso de los golpes y entrada al combate: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada golpe del combate tenga peso (temblor, pausa de impacto, destello, número y sonido grave según tres pesos) y que se entre y salga del combate con una transición, sin tocar el equilibrado.

**Architecture:** `src/core/impacto.ts` (lógica pura) decide el peso de cada evento, lleva el trauma, la pausa y la cronología de la entrada; sus números salen de `src/data/impacto.json`. La escena de combate aplica los pesos y dibuja la escena desplazada; el mapa dibuja el barrido de entrada antes de llamar a `iniciarCombate`; el combate aparece desde negro y se funde a negro al terminar.

**Tech Stack:** TypeScript strict, Canvas 2D, Three.js 0.180 (fondo), Web Audio, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-peso-golpes-design.md`

## Global Constraints

- **Ningún número del equilibrado cambia**: `tests/equilibrado.test.ts`, `violetas*.test.ts`, `presagios*` y `eventos*` siguen pasando sin tocarlos.
- `src/core/` no importa nada del navegador; los números de diseño van en `src/data/impacto.json`.
- Cero asignaciones en el bucle de juego: el desplazamiento y la fase de entrada se escriben en objetos reutilizados.
- La pausa de impacto como mucho 0,12 s; un toque o Enter no la salta.
- Solo tiembla la escena (orden de turnos, enemigos, heroína, proyectil, efecto, número); el panel, el registro y el título, quietos.
- Destellos: uno por impacto, nunca más de 3 por segundo; con `prefers-reduced-motion`, sin temblor ni destellos.
- Sin rebotes con sobrepaso (ease-out, no `back`).
- Código, comentarios y commits en español; commits terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Vitest: `npx vitest run tests/<archivo>`. Suite completa: `npm test`; además `npm run lint` y `npm run build`.

## Review Focus

1. **Dos golpes muy seguidos** (Corte doble, golpes de varios enemigos): las pausas no se suman y el trauma no pasa de 1 → tests `pausas solapadas` y `trauma con tope` (Task 1).
2. **Temblor a 0 en Ajustes o con «menos movimiento»**: nada se mueve ni destella, también en la presentación del jefe → test `factorTemblor` (Task 1) y comprobación en Task 3.
3. **Recargar con un combate guardado a medias**: el combate recuperado empieza desde negro y se juega igual → comprobación manual en Task 6.
4. **Cadena del desafío y cofre trampa**: cada combate pasa por la entrada y al volver el mapa sale de negro una sola vez, sin dejar a la heroína parada → comprobación manual en Task 6 (`?desafio`).
5. **Huir o morir**: la salida a negro también ocurre con `huida` y `derrota`, y `alTerminar` se llama una sola vez → test de escena no hay; comprobación manual en Task 6 y guarda `saliendo` en Task 4.

---

### Task 1: Lógica del impacto y sus datos

**Files:**
- Create: `src/core/impacto.ts`, `src/data/impacto.json`, `tests/impacto.test.ts`
- Modify: `src/data/datos.ts` (exportar `IMPACTO`)

**Interfaces:**
- Produces:
  - `type Peso = 'leve' | 'fuerte' | 'maximo'`
  - `interface PesoJson { trauma: number; pausa: number; destello: number; numero: number; sonido: string | null }`
  - `interface ImpactoJson { pesos: Record<Peso, PesoJson>; temblor: { maxX: number; maxY: number; decaimiento: number; frecuencias: [number, number] }; destello: { duracion: number }; numero: { asentar: number }; entrada: { duracion: number; destello: number; opacidadDestello: number; franjas: number; aparicion: number; salida: number } }`
  - `pesoDe(e: Evento): Peso | null`
  - `sumarTrauma(trauma: number, peso: PesoJson): number` (tope 1)
  - `decaerTrauma(trauma: number, dt: number, d: ImpactoJson): number` (no baja de 0)
  - `desplazamiento(trauma: number, t: number, factor: number, d: ImpactoJson, salida: { x: number; y: number }): { x: number; y: number }` — escribe en `salida` y la devuelve
  - `juntarPausa(queda: number, nueva: number): number` (= `Math.max`)
  - `factorTemblor(ajuste: number, menosMovimiento: boolean): number` (0 si `menosMovimiento`; si no, `ajuste` limitado a [0, 1])
  - `interface FaseEntrada { destello: number; barrido: number; terminada: boolean }`
  - `faseEntrada(t: number, d: ImpactoJson, salida: FaseEntrada): FaseEntrada` — `destello` = opacidad (de `opacidadDestello` a 0 entre 0 y `entrada.destello`), `barrido` = progreso 0-1 de `entrada.destello` a `entrada.duracion`, `terminada` = `t >= entrada.duracion`
  - `franja(i: number, n: number, barrido: number): number` — cobertura 0-1 de la franja `i` de `n`; escalonadas: la franja i empieza en `i/(n-1) × 0,5` y tarda 0,5 en cubrirse
  - `IMPACTO: ImpactoJson` desde `src/data/datos.ts`

- [ ] **Step 1: Escribir `src/data/impacto.json`** con los valores del spec (sección «Datos») y además `"opacidadDestello": 0.7` en `entrada`.

- [ ] **Step 2: Escribir los tests que fallan** en `tests/impacto.test.ts` (luchadores mínimos con `esHeroina` y `monstruo: { jefe } as MonstruoJson`, el resto con `as Luchador`):
  - `pesoDe`: golpe normal de monstruo normal a heroína → `'leve'`; de heroína a monstruo normal → `'leve'`; crítico → `'fuerte'`; heroína golpea a jefe → `'fuerte'`; jefe golpea a heroína → `'fuerte'`; `cargado: true` → `'maximo'`; crítico y cargado a la vez → `'maximo'`; `muerte` de monstruo normal → `'fuerte'`; `muerte` de jefe → `'maximo'`; `muerte` de heroína → `'maximo'`; `danioEstado`, `cura`, `defensa` → `null`.
  - `trauma con tope`: `sumarTrauma(0.9, IMPACTO.pesos.maximo)` → `1`; `sumarTrauma(0, IMPACTO.pesos.leve)` → `0.25`.
  - `decaerTrauma(0.5, 1, IMPACTO)` → `0` (1,6/s); `decaerTrauma(1, 0.25, IMPACTO)` → `0.6` (`toBeCloseTo`).
  - `desplazamiento`: con trauma 0 → `{x: 0, y: 0}`; con trauma 1 y factor 1, `|x| <= 6` y `|y| <= 4` en 100 instantes; con trauma 0,5 el máximo de `|x|` en 100 instantes es ≤ 1/4 del de trauma 1 (cuadrado); con factor 0 → 0; devuelve el mismo objeto que recibe (`toBe(salida)`).
  - `pausas solapadas`: `juntarPausa(0.1, 0.04)` → `0.1`; `juntarPausa(0.02, 0.12)` → `0.12`.
  - `factorTemblor(0.5, false)` → `0.5`; `factorTemblor(1, true)` → `0`; `factorTemblor(1.4, false)` → `1`.
  - `faseEntrada`: en t=0, `destello` 0,7 y `barrido` 0; en t=0,08, `destello` 0; en t=0,29 (mitad del barrido) `barrido` ≈ 0,5; en t=0,5, `barrido` 1 y `terminada`; t>0,5 no pasa de 1.
  - `franja`: `franja(0,7,0)` → 0; `franja(0,7,0.5)` → 1; `franja(6,7,0.5)` → 0; `franja(6,7,1)` → 1.

- [ ] **Step 3: Ejecutar y ver que falla:** `npx vitest run tests/impacto.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 4: Implementar `src/core/impacto.ts`** con las firmas de arriba. Jefe = `l.monstruo?.jefe === true`. El ruido de `desplazamiento` es una suma de dos senos por eje con las `frecuencias` (y desfases distintos para x e y) normalizada a [-1, 1]; amplitud `trauma² × factor × max`. Exportar `IMPACTO` en `datos.ts` como los demás JSON (`impactoJson as ImpactoJson`).

- [ ] **Step 5: Ejecutar y ver que pasa:** `npx vitest run tests/impacto.test.ts` → PASS.

- [ ] **Step 6: Commit** — `git add src/core/impacto.ts src/data/impacto.json src/data/datos.ts tests/impacto.test.ts && git commit -m "Impacto: pesos de los golpes, trauma, pausa y cronología de la entrada"`

### Task 2: Sonidos nuevos y variación de tono

**Files:**
- Modify: `src/data/sonido.json`, `src/render/sonido.ts:116-141`
- Test: `tests/impacto.test.ts` (añadir)

**Interfaces:**
- Consumes: `IMPACTO.pesos[*].sonido` (Task 1).
- Produces: efectos `impacto`, `impacto_fuerte`, `encuentro` en `sonido.json`; `sonar(nombre)` con variación de tono.

- [ ] **Step 1: Test que falla** en `tests/impacto.test.ts`: `todo sonido de un peso existe` — cada `IMPACTO.pesos[p].sonido` no nulo y `'encuentro'` son claves de `sonido.json → efectos`; `toda variación nombra un efecto` — cada clave de `sonido.json → variacion` está en `efectos` y su valor está en (0, 0,1].

- [ ] **Step 2: Ejecutar:** `npx vitest run tests/impacto.test.ts` → FAIL.

- [ ] **Step 3: Datos.** En `sonido.json → efectos`: `impacto` (capa `sine` 90→40 Hz, 0,15 s, volumen 0,9, más una de `ruido` 0,06 s volumen 0,3), `impacto_fuerte` (`sine` 70→30 Hz, 0,28 s, volumen 1; `ruido` 0,1 s volumen 0,45), `encuentro` (`ruido` 0,25 s volumen 0,5; `square` 220→55 Hz 0,3 s volumen 0,5; `sine` 60 Hz 0,35 s retardo 0,05). Nuevo objeto de primer nivel `variacion`: `golpe`, `critico`, `corte`, `corte_doble`, `acero`, `iaido`, `impacto`, `impacto_fuerte` a 0,04.

- [ ] **Step 4: `sonar`.** Por llamada, un factor `1 + (azar() * 2 - 1) × variacion[nombre]` (azar propio del módulo, `crearAzar(2)`, creado una vez) que multiplica `desde` y `hasta` de los osciladores; sin entrada en `variacion`, factor 1. Nada se crea fuera de los nodos de audio que ya se crean.

- [ ] **Step 5: Ejecutar:** `npx vitest run tests/impacto.test.ts` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "Sonido: impactos graves, sonido de encuentro y variación de tono en los golpes"`

### Task 3: Ajuste de Temblor

**Files:**
- Modify: `src/render/almacen.ts` (`Ajustes.temblor`, por defecto 1), `src/render/accesibilidad.ts`, `src/core/disposicion.ts:237-250`, `src/render/pausa.ts` (rect horizontal `RECT_TEMBLOR` y etiqueta «Temblor»), `src/escenas/pausa.ts:85-90,338-347`, `src/main.ts:166,305-306`, `src/escenas/presentacion.ts:59-62`
- Test: `tests/disposicion.test.ts`

**Interfaces:**
- Consumes: `factorTemblor` (Task 1).
- Produces: `leerTemblor(): number` y `ponerTemblor(v: number): void` en `render/almacen.ts` (o junto a los volúmenes, donde encaje); `temblorEfectivo(): number` en `render/accesibilidad.ts` = `factorTemblor(leerTemblor(), movimientoReducido())`; `disposicionAjustes(...)` devuelve además `temblor: Rect`.

- [ ] **Step 1: Test que falla** en `tests/disposicion.test.ts`: `disposicionAjustes` devuelve `temblor` con el mismo ancho que `efectos`, `temblor.y` mayor que `efectos.y + efectos.alto`, y `controlesY` mayor que `temblor.y + temblor.alto`.

- [ ] **Step 2: Ejecutar:** `npx vitest run tests/disposicion.test.ts` → FAIL.

- [ ] **Step 3: Implementar.** `disposicionAjustes`: `temblor` debajo de `efectos` con el mismo paso (control + 22) y `controlesY` tras él. Ajuste guardado como los volúmenes (lectura tolerante: no número → 1). Tercer deslizador `crearDeslizador(canvas, RECT_TEMBLOR, 'Temblor de la pantalla')` en `main.ts`, mostrado y ocultado con los otros en `escenas/pausa.ts`; en horizontal, `RECT_TEMBLOR` bajo `RECT_EFECTOS` con la misma separación (mover lo de debajo si hace falta) y la etiqueta «Temblor» con las de volumen. La presentación del jefe multiplica su `dx` por `temblorEfectivo()` (sustituye su `movimientoReducido() ? 0 :`).

- [ ] **Step 4: Ejecutar:** `npx vitest run tests/disposicion.test.ts` → PASS; `npm run build` sin errores.

- [ ] **Step 5: Mirarlo.** `npm run dev`, abrir el inventario → Ajustes en 1000×640 y en 390×844 (Edge sin cabeza o el navegador): el deslizador se ve, no tapa la lista de controles y su valor se recuerda al recargar.

- [ ] **Step 6: Commit** — `git commit -m "Ajustes: deslizador de temblor de la pantalla"`

### Task 4: Peso de los golpes en el combate

**Files:**
- Modify: `src/escenas/combate.ts` (`update`, `mostrar` casos `danio` y `muerte`, final del combate), `src/render/combate.ts` (`VistaCombate`, `dibujarCombate:252-275`, `dibujarFlotante:812-822`), `src/render/mundo/mundo.ts:50-55,627-642` (`FondoSala` y `dibujarFondo` con temblor vertical), `src/escenas/mapa.ts:762-763`, `src/escenas/presentacion.ts:62`

**Interfaces:**
- Consumes: `pesoDe`, `sumarTrauma`, `decaerTrauma`, `desplazamiento`, `juntarPausa`, `IMPACTO` (Task 1); `temblorEfectivo()` (Task 3); efectos de Task 2.
- Produces:
  - `type FondoSala = (tiempo: number, temblorX: number, temblorY: number, luz: …) => void` (antes un solo `temblor`); `Mundo.dibujarFondo(sala, tiempo, temblorX, temblorY, luz)` mueve la cámara también en y con la misma conversión que x (`/ SALA_ALTO × encuadre.alto`).
  - En `VistaCombate`: `tiempoReal: number` (avanza siempre, también en la pausa; lo usa el ruido del temblor), `temblor: { x: number; y: number }` (objeto reutilizado), `destello: number` (opacidad inicial del último), `tiempoDestello: number`, `escalaNumero: number`, `negro: number` (opacidad del velo negro de entrada y salida, 0-1).
  - En `EscenaCombate`: `trauma`, `pausa` (segundos que quedan), `saliendo: number` (−1 = no; si no, segundos de salida).

- [ ] **Step 1: Aplicar el peso.** En `mostrar`, para `danio` y `muerte`: `const p = pesoDe(e)`; si hay peso, `trauma = sumarTrauma(...)`, `pausa = juntarPausa(pausa, peso.pausa)`, `v.destello = peso.destello × (movimientoReducido() ? 0 : 1)`, `v.tiempoDestello = 0`, `v.escalaNumero = peso.numero`, y `sonar(peso.sonido)` además del sonido actual. Sin peso (daño por estado, curas), `v.escalaNumero = 1`.

- [ ] **Step 2: Pausa y trauma en `update`.** Al principio: `trauma = decaerTrauma(trauma, dt)`; `desplazamiento(trauma, v.tiempoReal, temblorEfectivo(), IMPACTO, v.temblor)` (tiempo que siempre avanza); `v.tiempoDestello += dt`. Si `pausa > 0`: `pausa -= dt` y `return` **antes** de avanzar `v.tiempo`, `tiempoAtaque`, `tiempoEfecto`, `tiempoCaida`, `tiempoGolpe` y `espera` (la música y el sonido siguen solos). Un toque no salta la pausa.

- [ ] **Step 3: Dibujar.** En `dibujarCombate`: `v.fondo(v.tiempo, v.temblor.x, v.temblor.y, …)`; `ctx.save(); ctx.translate(Math.round(v.temblor.x), Math.round(v.temblor.y))` alrededor de `dibujarOrden`…`dibujarFlotante`, y `restore` antes del panel. Tras la escena (dentro del translate), el velo blanco del destello: opacidad `v.destello × max(0, 1 − tiempoDestello / IMPACTO.destello.duracion)`, solo sobre la escena (no sobre el panel: en vertical, hasta el borde de arriba del panel; en horizontal, toda el área menos el panel). El número flotante con `FUENTE_GRANDE` escalada: de `escalaNumero × 1,15` a `escalaNumero` en `IMPACTO.numero.asentar` s con ease-out cuadrático (sin sobrepaso). Actualizar los otros llamadores de `FondoSala` (`mapa.ts:762`, `presentacion.ts:62`, con `temblorY` 0).

- [ ] **Step 4: Entrada y salida del combate.** `v.negro` empieza en 1 y baja a 0 en `IMPACTO.entrada.aparicion` s (velo negro sobre todo, panel incluido). Al confirmar el resultado (donde hoy se llama `this.alTerminar(resultado)`): si `saliendo < 0`, `saliendo = 0`; en cada `update` con `saliendo >= 0`, sube `v.negro` hasta 1 en `IMPACTO.entrada.salida` s y entonces llama `alTerminar` **una sola vez**. Mismo camino para victoria, derrota y huida. La presentación del jefe también empieza desde negro (`aparicion`).

- [ ] **Step 5: Comprobar.** `npm test`, `npm run lint`, `npm run build` pasan; los tests de equilibrado no cambian. `npm run dev` con `?combate=limo,limo` y `?combate=golem`: golpe normal casi quieto, crítico y golpe al jefe con temblor, destello y número más grande, panel quieto, combate que sale de negro y se funde al acabar. Ajuste de temblor a 0 → nada se mueve.

- [ ] **Step 6: Commit** — `git commit -m "Combate: temblor, pausa de impacto, destello y número según el peso del golpe; entrada y salida en negro"`

### Task 5: Entrada al combate desde el mapa

**Files:**
- Create: `src/render/entrada.ts`
- Modify: `src/escenas/mapa.ts` (los tres `this.o.iniciarCombate(` de las líneas ~633, ~654 y ~781; `update:303-325`; `draw`)

**Interfaces:**
- Consumes: `faseEntrada`, `franja`, `IMPACTO` (Task 1); `sonar('encuentro')` (Task 2); `movimientoReducido()`.
- Produces: `dibujarEntrada(ctx: CanvasRenderingContext2D, fase: FaseEntrada, n: number): void` en `render/entrada.ts` (dibuja en coordenadas de la ventana del mapa, sobre toda el área: velo blanco con `fase.destello` y `n` franjas oscuras `#08040c` en diagonal, cada una tapando su banda en proporción a `franja(i, n, fase.barrido)`, de izquierda a derecha); en `EscenaMapa`, `private entrarEnCombate(lanzar: () => void): void`.

- [ ] **Step 1: `entrarEnCombate`.** Guarda `lanzar` en `this.combateEntrante`, pone `this.entrada = 0`, `sonar('encuentro')`. Los tres sitios pasan su llamada actual a `iniciarCombate` envuelta en `() => …`; su `alTerminar`, además de lo que ya hace, pone `this.fundido = duracionFundido / 2` para que el mapa salga de negro al volver (una vez por combate).

- [ ] **Step 2: `update`.** Si `this.combateEntrante`: la heroína no se mueve (como en el fundido), `this.entrada += dt`; cuando `faseEntrada(...).terminada`, `const l = this.combateEntrante; this.combateEntrante = null; l();`. Va antes del bloque de `desafioPendiente`, para que la cadena del desafío también la use.

- [ ] **Step 3: `draw`.** Con entrada en curso, `dibujarEntrada(ctx, faseEntrada(this.entrada, IMPACTO, this.fase), IMPACTO.entrada.franjas)` encima de todo (HUD incluido); con `movimientoReducido()`, sin destello (opacidad 0) y las franjas igual. `this.fase` es un `FaseEntrada` reutilizado.

- [ ] **Step 4: Comprobar.** `npm test`, `npm run lint`, `npm run build`. `npm run dev`: tocar un monstruo en el Bosque → destello, franjas, sonido, el combate aparece desde negro; al ganar, fundido a negro y el mapa sale de negro con la heroína donde estaba. Captura con Edge sin cabeza a mitad del barrido (1000×640 y 390×844) en `docs/previews/entrada_combate*.png`.

- [ ] **Step 5: Commit** — `git commit -m "Mapa: entrada al combate con destello y franjas en diagonal"`

### Task 6: Comprobación de casos y cierre

**Files:**
- Modify: `CLAUDE.md` (Estado y Próximos pasos), `docs/superpowers/plans/2026-11-17-peso-golpes.md` (sección «Resultado»)

- [ ] **Step 1: Casos del Review Focus** con `npm run dev` y Edge o el navegador:
  - `?desafio`: aceptar el desafío; los tres combates pasan por la entrada; entre ellos el mapa no se queda parado ni en negro.
  - Cofre trampa (`?semilla=` con una sala de tesoro trampa, o el atajo que exista): suena el cofre, entrada, combate.
  - Huir de un combate y perder uno: salida a negro y una sola vuelta al mapa (o a la pantalla de derrota).
  - Recargar a mitad de un combate: se recupera y aparece desde negro.
  - Temblor a 0 y `prefers-reduced-motion` (Edge: `--force-prefers-reduced-motion`): sin temblor ni destellos, también en la presentación de un jefe.

- [ ] **Step 2: Suite completa:** `npm test`, `npm run lint`, `npm run build` → todo pasa.

- [ ] **Step 3: Documentar.** En `CLAUDE.md`, una viñeta de estado (rama, qué se hizo, números en `impacto.json`, sin probar en el móvil, que el peso lo juzga Pedro jugando) y actualizar «Próximos pasos». En el plan, una sección «Resultado» con lo que cambió respecto al plan.

- [ ] **Step 4: Commit** — `git commit -m "CLAUDE.md y plan: peso de los golpes hecho, pendiente de probar jugando"`
