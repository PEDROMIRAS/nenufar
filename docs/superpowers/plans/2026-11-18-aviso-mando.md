# Aviso de que se juega con mando: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien llega desde el portafolio sepa que se juega con mando (línea en la portada) y vea que el juego lo ha detectado (cartel «Mando conectado»).

**Architecture:** La línea es texto fijo en `escenas/titulo.ts`. El cartel: `input/mando.ts` cuenta las conexiones (`gamepadconnected`), `main.ts` lo detecta en el paso lógico y lleva el tiempo, `core/cartel.ts` (puro) da la opacidad y `render/cartel.ts` lo dibuja encima de la escena con su propia transformación.

**Tech Stack:** TypeScript strict, Canvas 2D, API Gamepad, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-aviso-mando-design.md`

## Global Constraints

- Texto de la portada exacto: «Juega con teclado, dedo o mando». Texto del cartel exacto: «Mando conectado».
- Números en la sección `mando` de `src/data/controles.json`: `"aviso": { "segundos": 2.5, "fundido": 0.3 }`.
- `src/core/` sin navegador; cero asignaciones por fotograma; el cartel no toca la entrada.
- Con «menos movimiento» (`movimientoReducido()`), sin fundido (opacidad 1 mientras dura).
- Español en código, comentarios y commits (`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Vitest: `npx vitest run tests/<archivo>`; suite: `npm test`, `npm run lint`, `npm run build`.

## Review Focus

1. **El cartel en cada forma de pantalla** (mapa en ventana, menús de 480×352, interfaz alta 320 de ancho): se ve abajo y centrado, sin salirse → capturas en Task 2.
2. **Mando ya conectado al cargar la página** (Chrome puede lanzar `gamepadconnected` al cargar si el mando ya se usó en esa pestaña): el cartel sale una vez, no en bucle → la cuenta solo cambia con eventos (Task 2).
3. **Varias conexiones seguidas** (desconectar y conectar dentro de los 2,5 s): el cartel vuelve a empezar, no se suma → el tiempo se pone a 0 en cada conexión nueva (Task 2).
4. **La línea de la portada en el móvil de pie a 360 de ancho** cabe en una línea y no choca con nada → captura a 360×640 (Task 1).
5. **Lector de pantalla:** «Mando conectado» se anuncia una vez por conexión (Task 2).

---

### Task 1: Línea fija en la portada

**Files:**
- Modify: `src/escenas/titulo.ts` (constante `TEXTO_MANDO`, `draw`: línea bajo el subtítulo a y ≈ 92 con `FUENTE` y `PALETA.claro`; banda de arriba de 104 a 112 px)
- Test: `tests/titulo_mando.test.ts`

**Interfaces:**
- Produces: `export const TEXTO_MANDO = 'Juega con teclado, dedo o mando'` en `src/escenas/titulo.ts` (si importar la escena en Vitest arrastra el navegador, ponerla en `src/data/controles.json` como `mando.texto` y leerla de ahí; ledger la decisión).

- [ ] **Step 1: Test que falla:** `TEXTO_MANDO` es exactamente «Juega con teclado, dedo o mando» y cabe en `letrasEnAncho(320 - 2 * 8)` letras de la fuente pequeña (usa la medida de letra de `FUENTE` que ya usa el título para partir los récords).
- [ ] **Step 2:** `npx vitest run tests/titulo_mando.test.ts` → FAIL.
- [ ] **Step 3: Implementar** la constante y su dibujo; la banda de arriba crece a 112.
- [ ] **Step 4:** test → PASS; capturas de la portada (Playwright de `tools/video`, servidor en 5199) a 1000×640, 390×844 y 360×640: la línea se lee, no toca el logo ni los botones.
- [ ] **Step 5: Commit** — `git commit -m "Portada: línea que dice que se juega con teclado, dedo o mando"`

### Task 2: Cartel «Mando conectado»

**Files:**
- Create: `src/core/cartel.ts`, `src/render/cartel.ts`, `tests/cartel.test.ts`
- Modify: `src/data/controles.json` (`mando.aviso`), `src/core/mando.ts` (`MandoJson.aviso`), `src/input/mando.ts` (`conexionesMando()`), `src/main.ts` (tiempo del cartel en el paso, dibujo tras `pila.draw`, `anunciar`, atajo `?mando` lo enseña al empezar)

**Interfaces:**
- Produces: `opacidadCartel(t: number, d: { segundos: number; fundido: number }, reducido: boolean): number` en `core/cartel.ts` (t = segundos desde que salió; 0 si t < 0 o t ≥ segundos); `conexionesMando(): number` en `input/mando.ts` (cuántos `gamepadconnected` ha habido); `dibujarCartel(ctx: CanvasRenderingContext2D, texto: string, opacidad: number): void` en `render/cartel.ts`, que fija su propia transformación (píxeles CSS de la ventana × `vista.hud`) y lo pone abajo y centrado con el estilo de `dibujarAviso` del HUD (caja oscura, texto `PALETA.cursor`); es lo último del fotograma, así que no hace falta restaurar la transformación (el siguiente `colocarContexto` la pone).

- [ ] **Step 1: Tests que fallan** en `tests/cartel.test.ts` con `d = controles.mando.aviso`:
  - `antes y después no se ve`: `opacidadCartel(-0.1, d, false)` y `opacidadCartel(2.5, d, false)` → 0.
  - `aparece y se va con fundido`: t = 0 → 0; t = 0,15 → 0,5; t = 1 → 1; t = 2,35 → 0,5.
  - `con menos movimiento no funde`: t = 0 y t = 2,4 con `reducido` → 1.
- [ ] **Step 2:** `npx vitest run tests/cartel.test.ts` → FAIL.
- [ ] **Step 3: Implementar.** `opacidadCartel` (rampa lineal de `fundido` al entrar y al salir); `conexionesMando` con un `addEventListener('gamepadconnected', …)` a nivel de módulo protegido por `typeof addEventListener`; en `main.ts`, en el paso: si `conexionesMando()` cambió desde el último paso, `tiempoCartel = 0` y `anunciar('Mando conectado')`; si no, `tiempoCartel += dt`; en el dibujo, tras `pila.draw`, si la opacidad > 0, `dibujarCartel`. `tiempoCartel` empieza en `Infinity` (no se ve); con `?mando` en desarrollo empieza en 0.
- [ ] **Step 4:** `npx vitest run tests/cartel.test.ts` → PASS; `npx tsc --noEmit -p .`; capturas con `?semilla=7&mando` del cartel sobre la portada a 1000×640 y 390×844 (≈0,5 s tras cargar) y sobre el mapa (llegar al mapa con los nueve Enter y recargar no sirve: basta con portada y una pantalla de menú, dejando constancia de que el mapa no se vio si no da tiempo).
- [ ] **Step 5:** `npm test`, `npm run lint`, `npm run build` → pasan.
- [ ] **Step 6: Commit** — `git commit -m "Cartel «Mando conectado» al detectar un mando"`

### Task 3: Cierre

- [ ] **Step 1:** `CLAUDE.md` (estado y próximos pasos) y sección «Resultado» de este plan con lo visto y lo no visto.
- [ ] **Step 2: Commit** — `git commit -m "CLAUDE.md y plan: aviso de mando hecho"`
