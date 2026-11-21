# Menú de combate junto a la rana: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar el panel fijo de abajo del combate: la lista sale junto a la rana cuando le toca, la ficha y la explicación van abajo en cajas pequeñas y los 3 últimos mensajes se ven arriba y se apagan solos.

**Architecture:** Una función pura nueva (`disposicionCombate` en `src/core/disposicion.ts`) reparte la pantalla en las dos orientaciones con números de `src/data/menu_combate.json`; un módulo puro (`src/core/mensajes.ts`) lleva los mensajes que se apagan. `src/render/combate.ts` deja de dibujar el panel y dibuja cuatro piezas (mensajes, lista, ficha, explicación) con esa disposición; `src/escenas/combate.ts` guarda los mensajes, el desplazamiento de la lista y su entrada.

**Tech Stack:** TypeScript estricto, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-menu-junto-a-la-rana-design.md`

## Global Constraints

- Las reglas del combate (`src/core/combate.ts`) y el equilibrado no cambian.
- Ningún número de diseño en el código: van en `src/data/menu_combate.json` (disposición, entrada de la lista) o `src/data/ritmo.json` (mensajes).
- Cero asignaciones de memoria por fotograma en `render/` (reutilizar objetos, como hoy `DISP`, `CONTENIDO`, `MARCO`).
- Colores y marcos de `src/render/marco.ts` (`dibujarCaja`, `dibujarMarco`, `dibujarFila`, `dibujarPestana`, `PALETA`); letra de `render/texto.ts`.
- Horizontal (interfaz 480×352) y vertical (interfaz alta, 320 de ancho y el alto de la ventana) en el mismo cambio.
- Teclado, toque y mando funcionan como hoy (`efectoToque`, dos toques en Habilidad, Objeto y objetivo; Volver al primero).
- Con `movimientoReducido()`, la lista aparece sin deslizar.
- Tareas tituladas «Task N»; commits pequeños en español con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Muchas opciones** (objetivo con 6 enemigos + Volver = 7) en 480×352 y 320×569: ninguna fila se sale; las que no caben se alcanzan desplazando con flechas o con el dedo (test en Task 1 y Task 3).
- **Jefe alto** (Rey sin Charca, 96 de alto) con el menú de acción abierto: su nombre no sube sobre los mensajes y la lista no tapa su barra ni sus PV (test en Task 1 con `ALTO_MAX_ENEMIGO`).
- **Toque fuera de la lista** con el menú abierto: no elige nada (como hoy, `filaTocada` devuelve −1) (test en Task 3).
- **Mensajes largos** («Salamandra de brasas golpea a Rana ronin: 9»): se parten en líneas dentro de la banda sin salirse por la derecha; la banda guarda como mucho 3 mensajes visibles (test en Task 2).
- **Aviso con el menú abierto** («No quedan PM»): sale en la franja de explicación, en color de aviso, y no se pierde al no haber registro (test en Task 2 del contador `aviso`; captura en Task 5).

---

### Task 1: Disposición pura del combate sin panel

**Files:**
- Create: `src/data/menu_combate.json`
- Modify: `src/core/disposicion.ts` (sustituye `disposicionCombate` y el tipo `DisposicionCombate`)
- Modify: `src/core/types.ts` (tipo `DatosMenuCombate`), `src/data/datos.ts` (exporta `MENU_COMBATE`)
- Test: `tests/disposicion.test.ts` (sustituye el `describe('disposicionCombate')`)

**Interfaces:**
- Produces:
  ```ts
  export interface DisposicionCombate {
    mensajes: Rect;        // banda de 3 líneas bajo la barra de turnos
    enemigoY: number;      // pies de los enemigos
    heroina: { x: number; y: number }; // pies de la heroína
    lista: Rect;           // caja de la lista (solo se dibuja con menú)
    fila: number;          // alto de cada fila
    visibles: number;      // filas que caben a la vez (≤ n)
    ficha: Rect;
    explicacion: Rect;     // franja de abajo (solo con menú)
  }
  export function disposicionCombate(ancho: number, alto: number, n: number, alta: boolean,
    d: DatosMenuCombate, fuera?: DisposicionCombate): DisposicionCombate;
  export function primeraVisible(seleccion: number, primera: number, visibles: number, n: number): number;
  ```

`menu_combate.json` (valores de partida; los tests mandan):

```json
{
  "finTurnos": 26,
  "margen": 8,
  "lineaMensaje": 14,
  "mensajes": 3,
  "altoMaxEnemigo": 96,
  "bajoEnemigo": 46,
  "nombre": 18,
  "tituloLista": 14,
  "separacionLista": 12,
  "entradaLista": 0.12,
  "horizontal": { "heroinaX": 48, "anchoLista": 168, "fila": 16, "filaMin": 14, "ficha": [164, 46], "explicacion": 26 },
  "vertical": { "heroinaX": 40, "fila": 34, "filaMin": 24, "ficha": 44, "explicacion": 64 }
}
```

Reparto (las dos orientaciones, de arriba abajo): `mensajes` de `finTurnos + 2` a `+ mensajes × lineaMensaje`; `enemigoY = mensajes.y + mensajes.alto + nombre + altoMaxEnemigo + 4` (así el nombre de un jefe alto empieza bajo los mensajes); `explicacion` pegada abajo a lo ancho; `ficha` encima de la explicación (horizontal: caja `ficha[0]×ficha[1]` a la derecha; vertical: a lo ancho, alto `ficha`); `lista` a la derecha de la heroína (`x = heroinaX + 32 + separacionLista`), con el borde de abajo en lo alto de la ficha en vertical y de la explicación en horizontal, creciendo hacia arriba hasta `enemigoY + bajoEnemigo` como mucho; `fila` se encoge hasta `filaMin` y, si ni así caben, `visibles < n`. `heroina.y` = borde de abajo de la lista.

- [ ] **Step 1: Write the failing tests** (en `tests/disposicion.test.ts`, `describe('disposicionCombate')`, con `MENU_COMBATE` y los helpers `dentroDe`/`seCruzan` de ese archivo):
  - `test.each([[480, 352, false], [320, 569, true], [320, 692, true], [480, 640, true]])('%ix%i: nada se pisa ni se sale con 1 a 7 opciones')`: para `n` de 1 a 7, `mensajes`, `lista`, `ficha` y `explicacion` dentro de la pantalla y sin cruzarse entre sí.
  - `'la lista nunca sube sobre lo de los enemigos'`: `lista.y >= enemigoY + bajoEnemigo` para n 1..7 en los cuatro tamaños.
  - `'el nombre de un jefe alto queda bajo los mensajes'`: `enemigoY - altoMaxEnemigo - nombre >= mensajes.y + mensajes.alto`.
  - `'en horizontal caben 6 opciones sin desplazar'`: `disposicionCombate(480, 352, 6, false, MENU_COMBATE).visibles === 6`.
  - `'con 7 opciones en 320×569 las filas no bajan de filaMin y las que no caben se desplazan'`: `fila >= vertical.filaMin` y `visibles <= 7`, `visibles * fila <= lista.alto`.
  - `'en vertical las filas son de dedo'`: con n = 5 en 320×692, `fila === vertical.fila` (34).
  - `primeraVisible`: `(0, 0, 5, 7) → 0`, `(6, 0, 5, 7) → 2`, `(1, 2, 5, 7) → 1`, `(3, 0, 7, 7) → 0`.
- [ ] **Step 2: Run** `npx vitest run tests/disposicion.test.ts` — FAIL (`disposicionCombate` tiene otra firma; `MENU_COMBATE` no existe).
- [ ] **Step 3: Implement** el JSON, el tipo `DatosMenuCombate` (forma del JSON), `MENU_COMBATE` en `datos.ts` y las dos funciones en `disposicion.ts` (rellenando `fuera` sin asignar cuando se pasa, como la de hoy). Borra los campos viejos (`escena`, `panel`, `registro`, `descripcion`) y lo de `vertical.json` → `combate` que ya no use nadie (`columnaIzquierda`, `alturaPestana`, `filas`; `escenaMin` solo si nadie más lo lee).
- [ ] **Step 4: Run** `npx vitest run tests/disposicion.test.ts` — PASS. Ajusta los números del JSON (no los tests) si alguno no cabe.
- [ ] **Step 5: Commit** — `git commit -m "Combate: disposición sin panel (lista junto a la rana, ficha y explicación abajo)"`.

### Task 2: Mensajes que se apagan

**Files:**
- Create: `src/core/mensajes.ts`
- Modify: `src/data/ritmo.json` (sustituye `historial` por `mensajes`)
- Test: `tests/mensajes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MensajesCombate { textos: string[]; desde: number[] } // como mucho `cuantos`, el más nuevo al final
  export function crearMensajes(): MensajesCombate;
  export function apuntarMensaje(m: MensajesCombate, texto: string, ahora: number, cuantos: number): void;
  export function opacidadMensaje(m: MensajesCombate, i: number, ahora: number, r: RitmoMensajes): number; // 0..1
  export interface RitmoMensajes { cuantos: number; duran: number; apagar: number; tenues: number[] }
  ```
  `ritmo.json` → `"mensajes": { "cuantos": 3, "duran": 4, "apagar": 0.6, "tenues": [1, 0.65, 0.35] }`: el más nuevo con `tenues[0]`, el anterior `tenues[1]`…; a los `duran` segundos de llegar el **último** mensaje, todos se apagan en `apagar` segundos (si llega otro, vuelven a contar).

- [ ] **Step 1: Write the failing tests** (`tests/mensajes.test.ts`):
  - `'guarda como mucho 3, el más nuevo al final'`: cuatro `apuntarMensaje` → `textos` son los tres últimos.
  - `'el nuevo claro y los anteriores más tenues'`: con 3 mensajes y `ahora` = llegada del último, opacidades `[0.35, 0.65, 1]` para i = 0, 1, 2.
  - `'se apagan a los duran segundos del último'`: a `duran + apagar / 2` → la del último ≈ 0,5; a `duran + apagar` → 0.
  - `'uno nuevo los vuelve a encender'`: tras apagarse, `apuntarMensaje` a `ahora` → la del nuevo es 1.
- [ ] **Step 2: Run** `npx vitest run tests/mensajes.test.ts` — FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `src/core/mensajes.ts` (sin asignar en `opacidadMensaje`; `apuntarMensaje` hace `shift` de los dos arrays al pasar de `cuantos`) y el bloque `mensajes` en `ritmo.json` (quita `historial`).
- [ ] **Step 4: Run** `npx vitest run tests/mensajes.test.ts` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "Combate: mensajes que se apagan (los 3 últimos)"`.

### Task 3: Dibujar el combate sin panel y tocar la lista

**Files:**
- Modify: `src/render/combate.ts`, `src/escenas/combate.ts`
- Test: `tests/combate_toque.test.ts` (nuevo)

**Interfaces:**
- Consumes: `disposicionCombate`, `primeraVisible`, `MENU_COMBATE` (Task 1); `MensajesCombate`, `apuntarMensaje`, `opacidadMensaje` (Task 2).
- Produces (en `render/combate.ts`): `VistaCombate` sustituye `registro: string[]` por `mensajes: MensajesCombate` y añade `primera: number` (primera fila visible) y `entrada: number` (segundos desde que se abrió la lista); `listaCombate(n)` y `filaCombate(n)` devuelven la zona de filas de la caja flotante (sin título); se borran `aPanel`, `PANEL`, `PANEL_ESCALA`, `ANCLA_PANEL`, `LISTA_COMBATE`, `FILA_COMBATE`, `DERECHA`, `dibujarPanel`, `dibujarPanelVertical`, `dibujarRegistro`, `REGISTRO`, `REGISTRO_V`, `LETRAS_IZQUIERDA`.
- Produces (pura, exportada de `src/core/menu.ts`): `export function filaDeToque(x: number, y: number, zona: Rect, fila: number, primera: number, visibles: number, n: number): number` (índice de opción, −1 fuera).

- [ ] **Step 1: Write the failing tests** (`tests/combate_toque.test.ts`): `filaDeToque` con zona `{x: 92, y: 200, ancho: 168, alto: 80}`, fila 16: toque en (100, 205) con `primera` 0 → 0; con `primera` 2 → 2; en (100, 279) → 4; en (300, 205) → −1 (fuera); en (100, 199) → −1; con `visibles` 5 y `n` 3, en (100, 260) → −1 (fila vacía).
- [ ] **Step 2: Run** `npx vitest run tests/combate_toque.test.ts` — FAIL.
- [ ] **Step 3: Implement** en este orden:
  1. `filaDeToque` en `core/menu.ts`.
  2. `escenas/combate.ts`: `registrar` usa `apuntarMensaje(v.mensajes, texto, v.tiempo, ritmo.mensajes.cuantos)` (el contador `v.aviso` sigue como hoy); el toque usa `filaDeToque` con `listaCombate(n)`, `filaCombate(n)` y `v.primera` (sin `aPanel`); al mover la selección, `v.primera = primeraVisible(...)`; al abrir un menú (`abrir`), `v.primera = 0` y `v.entrada = 0`; `v.entrada += dt` en `update`.
  3. `render/combate.ts`: `dibujarCombate` dibuja, después de la escena, `dibujarMensajes` (banda `mensajes`: cada mensaje partido con `avisoPartido` al ancho de la banda, alfa `opacidadMensaje`, de abajo arriba hasta llenar la banda), y si hay menú `dibujarLista` (pestaña `v.pestana` encima con `dibujarPestana`, caja con `dibujarCaja`, filas `primera..primera+visibles` con `dibujarFila` y el coste a la derecha en horizontal o debajo en vertical como hoy con `d.fila >= 30`; si `!movimientoReducido()`, desplazada a la izquierda `(1 − min(1, entrada / entradaLista)) × 12` px; flechas ▲/▼ en el borde si hay filas ocultas) y `dibujarExplicacion` (franja: el aviso con `dibujarAviso` si `v.aviso > 0`, si no la `ayuda` de la opción elegida partida a su ancho); siempre `dibujarFicha` (el código de ficha de hoy de `dibujarPanelVertical`, con el estado en lugar del nombre si no cabe, en el rectángulo `ficha`).
  4. Borra lo listado en «Produces».
- [ ] **Step 4: Run** `npx vitest run` (suite entera) — PASS; `npx tsc --noEmit -p .` sin errores.
- [ ] **Step 5: Commit** — `git commit -m "Combate: la lista junto a la rana, la ficha y la explicación abajo, sin panel"`.

### Task 4: Escena, cámara y cartel con la disposición nueva

**Files:**
- Modify: `src/render/combate.ts` (`colocarEscena`, `dibujarEnemigo`, `colocarCamara`, `bordePanel`/`bordeCamara`, `bajoCartelCombate`)

**Interfaces:**
- Consumes: `DisposicionCombate` (Task 1).

- [ ] **Step 1: Implement**: `colocarEscena` toma `G.enemigoY`, `G.heroinaX`, `G.heroinaY` de `disposicionCombate` en las dos orientaciones (en horizontal `G.escala`, `G.separacion` y `G.centro` siguen como hoy); el tope de los nombres de enemigos y de sus avisos («¡Golpe fuerte!», flecha) usa `mensajes.y + mensajes.alto` donde hoy usa `FIN_BARRA_TURNOS` (en `dibujarEnemigo` y en `colocarCamara` → `arriba`, `MARCO.arriba`); `bordeCamara` = `lista.y` con menú y `ficha.y` sin él en vertical, y en horizontal sin menú el borde de abajo de la pantalla menos `margen` (la ficha va a la derecha y se dibuja encima); `bajoCartelCombate` = `ficha.y − 4` en horizontal; `bordePanel` desaparece.
- [ ] **Step 2: Run** `npx vitest run tests/camaraCombate.test.ts tests/disposicion.test.ts` y la suite — PASS; `npm run lint` sin errores.
- [ ] **Step 3: Commit** — `git commit -m "Combate: escena, cámara y cartel con la disposición sin panel"`.

### Task 5: Comprobar en pantalla y documentar

**Files:**
- Modify: `CLAUDE.md` (bloque nuevo en «Por dónde vamos»), documento de desarrollo (fila en «Versión 2: lo nuevo»; «Pantalla de combate» en la pestaña principal).

- [ ] **Step 1: Capturas** con Playwright (Chrome del sistema, `npm run dev -- --port 5202`) a 1280×800 y 390×844: menú de acción (`?semilla=7&combate=jabali,murcielago`), Habilidad, objetivo con 3 enemigos (`?combate=limo,jabali,cuervo`), 6 enemigos (`?combate=limo,limo,limo,limo,limo,limo`: se desplaza), jefe alto (`?zona=3&combate=rey_sin_charca`), turno de un monstruo, «No quedan PM» (gastar PM con Habilidad), «¡Victoria!». Mirar cada una: nada se pisa ni se sale, los mensajes se apagan, la lista entra deslizando.
- [ ] **Step 2: Tocar** con `page.mouse.click` una fila de Habilidad (primer toque elige, segundo usa) y fuera de la lista (no hace nada), en las dos orientaciones.
- [ ] **Step 3: Run** `npm test`, `npm run lint`, `npm run build` — todo pasa.
- [ ] **Step 4: Documentar** en `CLAUDE.md` y el documento de desarrollo, y **Commit** — `git commit -m "Combate sin panel: comprobado y documentado"`.
