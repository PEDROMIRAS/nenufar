# Reto del día: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un modo corto «Reto del día» (el Bosque en pequeño con la semilla de la fecha) que se empieza desde la portada en dos pulsaciones y acaba en una tarjeta con el récord del día por rana y «Otra vez».

**Architecture:** Lógica pura nueva en `src/core/reto.ts` (semilla de la fecha, progreso, comparación de resultados y guardado del reto) y `repartirPuntos` en `src/core/progresion.ts`; números en `src/data/reto.json`. `main.ts` gana un modo reto (`Partida.reto`) que reutiliza `crearPartida`, `crearZona` y `luchar` con ramas en los puntos donde la partida normal guarda, anota récords o acaba; la tarjeta final es una escena nueva `src/escenas/finReto.ts`.

**Tech Stack:** TypeScript strict, Canvas 2D, Three.js (sin cambios), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-reto-del-dia-design.md`

## Global Constraints

- Textos exactos: botón «Reto del día»; cartel de entrada «Reto del día · <fecha>» y «Llega al Guardián del Bosque»; tarjeta «¡Guardián vencido!», «Caíste en la sala N de M», «Tu mejor de hoy con la <rana>», «¡Nuevo récord!», «Días jugados: N», botones «Otra vez» y «Portada».
- Números del reto en `src/data/reto.json`; no se tocan las fichas de monstruos ni de heroínas ni `dificultades.json`/`zonas.json` (la partida normal y su equilibrado no cambian: `tests/equilibrado.test.ts` sigue pasando sin tocarlo).
- Equilibrado del reto (simulado): 60-70 % de victorias con cada heroína, ≤ 5 puntos entre ellas, y ninguna fecha de la muestra (365 días seguidos) por debajo del 35 % con ninguna heroína.
- El reto no toca `nenufar.partida` (ni guarda ni borra), ni los récords, logros o bestiario; guarda solo en `nenufar.reto` (lectura y escritura con try/catch).
- `src/core/` sin navegador; nada de `if (heroina === ...)`; cero asignaciones por fotograma; teclado, táctil y mando; las tres formas de pantalla.
- Español en código, comentarios y commits (`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Vitest: `npx vitest run tests/<archivo>`; suite: `npm test`, `npm run lint`, `npm run build`.

## Review Focus

1. **El reto guardándose como partida normal:** si `alEntrarEnSala` o `iniciarCombate` guardan en modo reto, al recargar se recupera el reto como partida normal sin portada → en modo reto no se llama a `guardarPartida` ni a `borrarPartida` (Task 4, test manual con recarga a mitad: vuelve a la portada).
2. **«Salir» de la pausa o morir en el reto** no debe pasar por `empezarOtra`/`terminarPartida` (borran la partida normal y anotan récords) → ramas propias (Task 4 y 5).
3. **Medianoche y fechas raras** (31 de diciembre, 29 de febrero, cambio de día con el reto abierto): la semilla y la cuenta de días siguen bien → tests de `semillaDelDia` y `anotarReto` con esas fechas (Task 1); «Otra vez» usa la fecha del intento (Task 5).
4. **`localStorage` corrupto o bloqueado:** el reto se juega igual sin récord → `leerReto` tolera basura (Task 1) y `almacen.ts` envuelve en try/catch (Task 5).
5. **La portada con el cuarto botón** en horizontal 1000×640, en vertical 390×844 y 360×640, con flechas, cruceta y toque: no pisa el aviso, los récords ni los otros botones → capturas (Task 4).

---

### Task 1: Lógica pura del reto

**Files:**
- Create: `src/core/reto.ts`, `tests/reto.test.ts`

**Interfaces:**
- Produces:
  - `interface Fecha { anio: number; mes: number; dia: number }` (mes 1-12).
  - `textoFecha(f: Fecha): string` → `'AAAA-MM-DD'`.
  - `semillaDelDia(f: Fecha): number`: entero positivo, `Math.floor(crearAzar(anio*10000 + mes*100 + dia)() * 2**31) + 1`.
  - `interface ResultadoReto { victoria: boolean; segundos: number; sala: number; de: number }`.
  - `mejorResultado(a: ResultadoReto, b: ResultadoReto | null): boolean` (¿`a` es mejor que `b`?): victoria > derrota; entre victorias, menos segundos; entre derrotas, más `sala`; con `b` null, true; empate, false.
  - `progresoReto(salas: readonly SalaZona[], visitadas: readonly number[]): { sala: number; de: number }`: `de` = salas de tipo `combate` o `jefe`; `sala` = cuántas de ellas están en `visitadas` (índices en `salas`), mínimo 1.
  - `interface EstadoReto { fecha: string; dias: number; mejores: Record<string, ResultadoReto> }` y `RETO_VACIO`.
  - `anotarReto(e: EstadoReto, fecha: string, heroe: string, r: ResultadoReto): { estado: EstadoReto; nuevo: boolean }`: si `fecha !== e.fecha`, `dias + 1` y `mejores` vacío antes de comparar; `nuevo` = `mejorResultado(r, mejores[heroe] ?? null)`; no muta `e`.
  - `leerReto(texto: string | null): EstadoReto`: JSON mal formado o campos de otro tipo → `RETO_VACIO` (o el campo dañado descartado).

- [ ] **Step 1: Tests que fallan** en `tests/reto.test.ts`:
  - `semillaDelDia` es igual para la misma fecha, distinta para 2026-12-31 y 2027-01-01 y para 2028-02-29 y 2028-03-01, y siempre entero ≥ 1.
  - `mejorResultado`: victoria 200 s gana a derrota sala 6; victoria 150 s gana a victoria 200 s y no al revés; derrota sala 4 gana a sala 3; con `null`, true; iguales, false.
  - `progresoReto` con una zona de `generarZona` de 8 salas: `de` = salas combate + jefe; con `visitadas = [índice del inicio]`, `sala` = 1.
  - `anotarReto`: primer día → `dias` 1, `nuevo` true; mismo día peor → `nuevo` false y conserva el mejor; mismo día con la otra rana → récord propio; día nuevo → `dias` 2 y `mejores` reiniciado.
  - `leerReto('{basura')`, `leerReto(null)` y `leerReto('{"dias":"x"}')` → estado válido sin lanzar.
- [ ] **Step 2:** `npx vitest run tests/reto.test.ts` → FAIL (no existe el módulo).
- [ ] **Step 3: Implementar** `src/core/reto.ts`.
- [ ] **Step 4:** `npx vitest run tests/reto.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Reto del día: lógica pura (semilla, progreso, récord por rana)"`

### Task 2: Reparto automático de puntos

**Files:**
- Modify: `src/core/progresion.ts`, `src/core/types.ts` (`HeroeJson.planPuntos: Mejora[]`), `src/data/heroes.json` (ronin `["ataque","pv","defensa"]`, maga `["magia","pv","pm"]`), `tests/simulador.ts` (`gastarPuntos` usa `repartirPuntos` y desaparece `PLAN`)
- Test: `tests/progresion.test.ts`

**Interfaces:**
- Produces: `repartirPuntos(h: Luchador, plan: readonly Mejora[], r: ReglasProgresion): void` en `progresion.ts`: gasta todos los puntos posibles en orden `plan[(h.nivel + i) % plan.length]` (el bucle de `gastarPuntos` del simulador, tal cual, para que el equilibrado no cambie); con plan vacío no hace nada.

- [ ] **Step 1: Test que falla:** una ronin de nivel 3 con 2 puntos acaba con 0 puntos y las mejoras en el orden del plan; con plan vacío, los puntos no cambian.
- [ ] **Step 2:** `npx vitest run tests/progresion.test.ts` → FAIL.
- [ ] **Step 3: Implementar** y pasar el simulador a usarla con `h.heroe.planPuntos`.
- [ ] **Step 4:** `npx vitest run tests/progresion.test.ts tests/equilibrado.test.ts` → PASS (las cifras impresas del equilibrado, iguales que antes en `main`).
- [ ] **Step 5: Commit** — `git commit -m "Puntos de mejora: reparto automático con el plan de cada heroína"`

### Task 3: Datos del reto y equilibrado

**Files:**
- Create: `src/data/reto.json`, `tests/reto_equilibrado.test.ts`
- Modify: `tests/simulador.ts` (`simularReto`)

**Interfaces:**
- Produces: `reto.json` con al menos `{ "zona": "bosque", "salas": 8, "tesoros": 1, "gruposPorSala": { "min": 1, "max": 2 }, "dificultad": { "nombre": "Reto", "descripcion": "…", "ataque", "vida", "recuperacion", "violetas": 1 } }` (`dificultad` con la forma de `DificultadJson`; valores iniciales los de Normal) y lo que la búsqueda necesite. `simularReto(nombre: string, fechas: readonly number[], intentos: number): { total: number; porFecha: number[] }` (porcentajes): por cada semilla de fecha, la zona con `generarZona({ ...zonas.generacion, salas, tesoros }, semilla)` sin violeta, trampa ni eventos, `intentos` partidas con azar de combate distinto (`crearAzar(semilla * 97 + k)`), heroína de nivel 1, `repartirPuntos` tras cada combate, cofres del Bosque, fuente como en `simular` y el jefe de la zona al final.

- [ ] **Step 1: Test** `tests/reto_equilibrado.test.ts`: con las semillas de los 365 días desde 2026-11-18 y 20 intentos por fecha, cada heroína entre 60 y 70 % de total, ≤ 5 puntos entre ellas, y `Math.min(...porFecha) >= 35`; imprime total, peor fecha y combates medios por reto.
- [ ] **Step 2:** `npx vitest run tests/reto_equilibrado.test.ts` → FAIL o PASS por casualidad; anotar cifras.
- [ ] **Step 3: Buscar valores** de `reto.json` (ataque, vida, recuperación, grupos por sala; `salas` puede subir a 11 si con 8 no hay combates suficientes) hasta que pase con margen; dejar las cifras en el ledger. Si ningún valor saca la peor fecha de 35 %, **parar y avisar** (el spec dice que eso pide otra decisión).
- [ ] **Step 4:** test → PASS; `npm test` → pasa.
- [ ] **Step 5: Commit** — `git commit -m "Reto del día: datos y equilibrado simulado"`

### Task 4: El modo reto en el juego

**Files:**
- Modify: `src/escenas/titulo.ts` (botón y foco `reto`, callback `alReto`), `src/main.ts`, `src/escenas/mapa.ts` (solo si hace falta exponer las salas visitadas: `visitadasIndices(): number[]` o reutilizar `estado().visitadas`)

**Interfaces:**
- Consumes: Task 1 (`semillaDelDia`, `textoFecha`, `progresoReto`), Task 2 (`repartirPuntos`), Task 3 (`reto.json`).
- Produces: en `main.ts`, `Partida.reto: { fecha: Fecha; segundos: number } | null` y `empezarReto(heroe: HeroeJson, sprite: Sprite, fecha: Fecha): void` (dentro de `iniciar`, junto a `empezar`), que Task 5 usa para «Otra vez»; `terminarReto(partida: Partida, victoria: boolean): void` (en Task 4, un stub que vuelve a la portada; Task 5 lo completa).

- [ ] **Step 1: Portada.** Foco nuevo `reto` en `FOCOS`: ← → siguen recorriendo controles, empezar y extras como hoy; ↑ desde empezar va a reto, ↑ desde reto a extras, ↓ vuelve a empezar. Botón «Reto del día» en horizontal centrado encima del aviso y en vertical encima de los dos botones de abajo; toque y confirmar lo abren con `alReto`. Captura con Playwright a 1000×640, 390×844 y 360×640.
- [ ] **Step 2: Entrada.** `alReto` → `EscenaSeleccion` (otra instancia) → `empezarReto(heroe, sprite, hoy)`: `luchadorDeHeroe`, nombre de la rana, `crearPartida(..., reto.dificultad, ..., semillaDelDia(fecha))`, `partida.reto = { fecha, segundos: 0 }`, zona del reto y cartel de dos líneas con `contar`. Fecha: la local (`new Date()`); en desarrollo `?fecha=AAAA-MM-DD` la fuerza.
- [ ] **Step 3: Zona del reto.** `crearZona` con un parámetro de modo (o una función hermana que comparta la construcción de `EscenaMapa`): ajustes de `reto.json` sin violeta, trampa, eventos ni presagio, `gruposPorSala` del reto, sin pistas de primera partida, `alEntrarEnSala` y el guardado de `iniciarCombate` **sin guardar**, y la victoria contra el jefe llama a `terminarReto(partida, true)` en vez de abrir el portal.
- [ ] **Step 4: Durante el reto.** En `luchar`: sin `anotarVencidos` en modo reto; al subir de nivel, `repartirPuntos(luchadora, heroe.planPuntos, ...)` y el mensaje de nivel sin abrir `EscenaPuntos`; la derrota llama a `terminarReto(partida, false)`. Pausa: «Salir» vuelve a la portada sin `borrarPartida` (`location.assign(location.pathname)`). `enCurso` queda falso en el reto (cerrar no pregunta). Tiempo: `partida.reto.segundos += dt` en el paso lógico salvo con la pausa encima (`pila` expone la escena de arriba o la pausa avisa).
- [ ] **Step 5: Comprobar** con Playwright (`?fecha=2026-11-18`): portada → reto → rana → primera sala en dos pulsaciones; recargar a mitad vuelve a la portada (no a una partida recuperada); `localStorage['nenufar.partida']` sigue sin existir.
- [ ] **Step 6:** `npm test`, `npm run lint`, `npm run build` → pasan.
- [ ] **Step 7: Commit** — `git commit -m "Reto del día: botón en la portada, entrada directa y zona corta"`

### Task 5: Tarjeta final, récord y «Otra vez»

**Files:**
- Create: `src/escenas/finReto.ts`
- Modify: `src/render/almacen.ts` (`cargarReto(): EstadoReto`, `guardarReto(e: EstadoReto): void`, clave `nenufar.reto`, con try/catch), `src/main.ts` (`terminarReto` completo; atajo `?reto=gana|pierde`)

**Interfaces:**
- Consumes: Task 1 (`anotarReto`, `progresoReto`, `mejorResultado`), Task 4 (`empezarReto`, `Partida.reto`).
- Produces: `EscenaFinReto` (`alta = true`), constructor `(lineas: { titulo: string; resultado: string; mejor: string; nuevo: boolean; dias: string }, alOtraVez: () => void, alPortada: () => void)`; dos botones con «Otra vez» elegido; ← → o ↑ ↓ cambian, confirmar o toque eligen, cancelar = Portada; textos de pista por dispositivo como las demás escenas.

- [ ] **Step 1: `terminarReto`:** resultado con `progresoReto(zona.salas, visitadas)` y `segundos`; `anotarReto(cargarReto(), textoFecha(fecha), claveHeroe, r)`; `guardarReto`; fundido a `EscenaFinReto` (victoria: «¡Guardián vencido!» y el tiempo con `formatearTiempo`; derrota: «Caíste en la sala N de M»). «Otra vez» → `empezarReto` con la misma rana y la fecha del intento; «Portada» → `location.assign(location.pathname)`.
- [ ] **Step 2: Atajo de desarrollo** `?reto=gana|pierde`: abre la tarjeta al empezar con un resultado de prueba.
- [ ] **Step 3: Capturas** de la tarjeta ganando y perdiendo a 1000×640 y 390×844, y un reto jugado hasta morir o ganar con `?fecha=2026-11-18` (si el tiempo da) para ver «Otra vez» entrar en el mismo mapa.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` → pasan.
- [ ] **Step 5: Commit** — `git commit -m "Reto del día: tarjeta final con récord por rana y «Otra vez»"`

### Task 6: Cierre

- [ ] **Step 1:** `CLAUDE.md` (Estado y Próximos pasos: el hito 4 de la auditoría es el reto; la escalera queda descartada para este público) y sección «Resultado» de este plan con lo visto, lo no visto y las cifras del equilibrado.
- [ ] **Step 2: Commit** — `git commit -m "CLAUDE.md y plan: reto del día hecho"`

## Resultado (2026-11-18)

Hecho en línea. Suite, lint y build pasan.

- **Equilibrado:** `reto.json` con nivel inicial 3, ataque ×1,9, vida ×1,4, recuperación 0,6, 8 salas, 1-2 grupos, 1 tesoro. Ronin 66,5 % (peor día 49 %, Guardián 88 %), maga 65,9 % (peor día 46 %, Guardián 96 %), unos 6 combates por reto, sin subidas de nivel durante el reto. Con la rana en nivel 1 ningún multiplicador común igualaba a las dos (la maga, 15-25 puntos por encima); pociones extra y experiencia ×4 lo igualaban deformando el juego. El peor día se mide con 100 intentos por fecha: con 20 es ruido.
- **Visto con Chrome sin cabeza:** la portada con el botón (1000×640, 390×844, 360×640), la entrada en dos pulsaciones (botón y rana; luego el cartel), una sala y un combate ganado del reto sin tocar récords ni guardar partida, la recarga a mitad que vuelve a la portada, la tarjeta ganando y perdiendo (`?reto=gana|pierde`, 1000×640 y 390×844) y «Otra vez» entrando en el mismo mapa.
- **Sin ver:** morir o vencer al Guardián jugando, la subida de nivel con reparto automático (no ocurre con estas cifras), el móvil real, el mando y la duración real.
