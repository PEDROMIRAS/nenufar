# Móvil en vertical, entrega 2: combate y título — plan de implementación

> **Para quien ejecute:** usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Los pasos usan casillas `- [ ]`. Las tareas se titulan «Task N» a propósito (los scripts de la habilidad de ejecución buscan «Task N»).

**Objetivo:** con la ventana más alta que ancha, el combate y el título se ven a un tamaño legible y táctil: combate apilado (escena arriba; debajo, en una columna, lista, descripción y ficha) y sin que los nombres de los enemigos se pisen.

**Arquitectura:** nueva forma de colocar el canvas 2D, «interfaz alta» (ancho lógico fijo ~320, alto lo que dé la ventana), que una escena pide con `alta = true`; las escenas sin adaptar siguen con los 480×352 centrados. El reparto de rectángulos del combate vertical es una función pura en `src/core/` con tests; `render/combate.ts` la usa solo en vertical y deja intacto el horizontal. Los nombres de enemigos se parten en líneas al ancho que les toca (arregla el solape también en horizontal).

**Tecnologías:** TypeScript estricto, Canvas 2D, Three.js (solo el fondo), Vitest.

**Diseño:** `docs/superpowers/specs/2026-11-07-movil-vertical-design.md` (puntos 2 y 4 de «Decidido por Pedro» y «Mis decisiones»). Este plan es la entrega 2; la 3 (menús con pestañas, quitar `#girar`) tendrá el suyo.

## Restricciones globales

- `src/core/` no importa nada del navegador; todo lo que se pueda testear va ahí.
- Ningún número de diseño en el código: van a `src/data/vertical.json` (tipo `DatosVertical` en `src/core/encuadre.ts`, exportado como `VERTICAL` desde `src/data/datos.ts`).
- Cero asignaciones en el bucle de juego: las funciones de dibujo reutilizan objetos, como ya hace `rectOpcion` con `RECT`.
- **El horizontal no cambia:** `LISTA_COMBATE` (x 8, y 201, ancho 210, alto 144), `FILA_COMBATE` 24 y las medidas del panel actual salen igual que hoy; sus tests y capturas no se tocan.
- Doble toque en habilidades, objetos y enemigo (`src/core/menu.ts`): sin cambios.
- Código, comentarios y commits en español. Commits pequeños, uno por tarea.
- Probar en móvil real no se puede desde aquí: Pedro lo prueba. Aquí, capturas con Edge sin cabeza a 390×844, 360×640 y 768×1024.

## Qué se ve mal hoy (capturas de Pedro, 2026-11-07)

1. En vertical el combate se dibuja en los 480×352 centrados y escalados al ancho: letra a ~0,8× y la mitad de arriba y de abajo vacía.
2. Los nombres de enemigos no caben: «Acólito de la luna falsa A» mide 26 letras × 7,2 = 187 px y los enemigos están a 140 px (a 3 enemigos se pisan, también en horizontal), y el tercero se sale de la ventana.
3. El título está en 480×352 con la sala 3D encajada entera (bandas negras arriba y abajo).

## Foco de revisión

1. **Girar el móvil con el combate abierto** (`resize`): los rectángulos del panel se recalculan; un toque justo después no cae en una fila vieja. Test: la disposición sale igual para el mismo tamaño y cambia al cambiar el tamaño.
2. **Muchas opciones** (el menú de habilidades de nivel 12, o 8 objetos): la lista no se sale del panel; las filas se encogen hasta un mínimo y, si ni así caben, la selección sigue siendo alcanzable. Test con `n = 8` y `n = 12`.
3. **4 enemigos a la vez** (Sacerdote e invocados) en 320 de ancho: ningún sprite ni nombre se pisa. Test del ancho útil por enemigo y del nombre partido.
4. **Tableta de pie (768×1024):** con ancho fijo 320 la escala sería 2,4 y la interfaz mediría solo 426 de alto, sin sitio para la escena. Test: la escala tiene tope (`escalaMax`) y el alto lógico siempre da `escenaMin` más el panel.
5. **Móvil bajo (360×640) o ventana muy corta:** la escena no baja de `escenaMin` a costa de aplastar el panel por debajo de las filas mínimas; si no cabe todo, manda el panel (se juega con él). Test de 360×500.

---

## Estructura de ficheros

- `src/data/vertical.json` — añade `interfazAncho`, `escalaMax` y el bloque `combate`.
- `src/core/encuadre.ts` — `DatosVertical` crece; `interfazAlta`, `cubrirSala`.
- `src/core/disposicion.ts` — **nuevo**: `disposicionCombate` y `anchoNombre`, puro.
- `src/render/pantalla.ts` — modo «alta», objeto vivo `interfaz`, `esVertical()`.
- `src/escenas/escena.ts`, `src/escenas/pila.ts`, `src/main.ts` — la escena pide `alta`.
- `src/render/combate.ts` y `src/escenas/combate.ts` — disposición vertical, nombres partidos, toque.
- `src/escenas/titulo.ts` — disposición vertical.
- Tests: `tests/encuadre.test.ts` (amplía), `tests/disposicion.test.ts` (nuevo), `tests/pila.test.ts` (amplía).

---

### Task 1: Datos y cálculo puro de la interfaz alta

**Files:**
- Modify: `src/data/vertical.json`, `src/core/encuadre.ts`
- Test: `tests/encuadre.test.ts`

**Interfaces:**
- Produces:
  - `DatosVertical` con los campos nuevos `interfazAncho: number` (320), `escalaMax: number` (1,6; píxeles CSS por unidad lógica), `escenaMin: number` (260; alto lógico mínimo de la escena del combate).
  - `interfazAlta(anchoCss: number, altoCss: number, d: DatosVertical): { escala: number; ancho: number; alto: number }`: `escala` en píxeles CSS por unidad lógica = `min(anchoCss / d.interfazAncho, d.escalaMax)`; `ancho = anchoCss / escala` (puede pasar de `interfazAncho` en una tableta); `alto = altoCss / escala`.
  - `cubrirSala(ancho, alto, salaAncho, salaAlto): Colocacion`: la sala a la escala que **cubre** la ventana entera (`max` de las dos razones), centrada (recorta lo que sobra). Sustituye a `encajarSala` solo en las escenas que no son el mapa y con ventana vertical.

- [ ] **Step 1: tests que fallan** en `tests/encuadre.test.ts`:
  - `interfazAlta(390, 844, d)` da `escala ≈ 1,21875`, `ancho ≈ 320`, `alto ≈ 692`.
  - `interfazAlta(768, 1024, d)`: `escala = 1,6`, `ancho = 480`, `alto = 640`.
  - `interfazAlta(360, 640, d)`: `ancho = 320`, `alto ≈ 569`.
  - `cubrirSala(390, 844, 672, 416)`: `escala = 844/416`; `x < 0` y `y = 0`; la sala cubre la ventana (`x + 672·escala ≥ 390`).
  - `cubrirSala` en horizontal cuadrada: `escala = max(...)` y centrada.
- [ ] **Step 2:** `npx vitest run tests/encuadre.test.ts` → FALLA («interfazAlta no existe»).
- [ ] **Step 3:** añadir los tres campos a `vertical.json` (320, 1.6, 260) y al tipo, e implementar `interfazAlta` y `cubrirSala` en `encuadre.ts`.
- [ ] **Step 4:** `npx vitest run tests/encuadre.test.ts` → PASA.
- [ ] **Step 5: commit** — «Interfaz alta: datos y cálculo puro (interfazAlta, cubrirSala)».

---

### Task 2: Reparto del combate vertical (función pura)

**Files:**
- Create: `src/core/disposicion.ts`
- Modify: `src/data/vertical.json` (bloque `combate`), `src/core/encuadre.ts` (tipo)
- Test: `tests/disposicion.test.ts`

**Interfaces:**
- Consumes: `interfazAlta` (Task 1), `Rect` de `src/core/menu.ts`.
- Produces:
  - Bloque `combate` de `DatosVertical`: `{ margen: 8, fila: 36, filaMin: 28, alturaDescripcion: 64, alturaFicha: 44, alturaPestana: 16 }` (unidades lógicas; `fila` es el alto de una fila para un dedo: 36 × 1,2 ≈ 44 px CSS).
  - `interface DisposicionCombate { escena: Rect; panel: Rect; lista: Rect; fila: number; descripcion: Rect; ficha: Rect; }`.
  - `disposicionCombate(ancho: number, alto: number, n: number, d: DatosVertical, fuera?: DisposicionCombate): DisposicionCombate`: `ancho`/`alto` lógicos de la interfaz alta, `n` opciones del menú abierto. La escena ocupa de `y = 0` hasta el panel; el panel va pegado abajo (pestaña, lista, descripción, ficha, de arriba abajo, todo dentro de `margen`). `fila = clamp(altoDisponible / n, filaMin, d.combate.fila)`; si `n` filas ni a `filaMin` caben, la lista se queda con lo que quepa y `escena.alto` baja hasta `escenaMin`, pero nunca por debajo (manda el panel). `fuera` si se pasa se rellena y se devuelve (cero asignaciones en el bucle).
  - `anchoNombre(separacion: number): number`: letras que caben en un nombre de enemigo = `floor((separacion − 8) / 7.2)`. Se usa también en horizontal (separación 140 → 18 letras).

- [ ] **Step 1: tests que fallan** en `tests/disposicion.test.ts`:
  - Para `(320, 692)` con `n = 4` y `n = 8`: `escena`, `lista`, `descripcion` y `ficha` están dentro de `[0,ancho]×[0,alto]`; ninguna se pisa (comparar los rectángulos de dos en dos); `escena.alto ≥ escenaMin`; `fila ≥ filaMin`.
  - `n = 12` con `(320, 569)` (360×640): `fila = filaMin`, la lista no sale del panel y `escena.alto ≥ escenaMin`.
  - `(320, 444)` (360×500): `escena.alto ≥ escenaMin` aunque el panel quede apretado; ningún alto negativo.
  - Con `(480, 640)` (tableta tras el tope de escala): la lista y el resto usan el ancho entero y no pasan de `ancho − 2·margen`.
  - Llamarla dos veces con el mismo `fuera` devuelve el mismo objeto.
  - `anchoNombre(140) = 18` y, para `n = 4` enemigos en 320 (`separacion = 320/4 = 80`), `anchoNombre = 10`.
  - Nombre partido (con `partirTexto` de `src/core/texto.ts`): «Acólito de la luna falsa A» a `anchoNombre(106)` queda en líneas de ≤ ese largo.
- [ ] **Step 2:** `npx vitest run tests/disposicion.test.ts` → FALLA.
- [ ] **Step 3:** implementar `src/core/disposicion.ts`; el bloque `combate` a `vertical.json` y al tipo.
- [ ] **Step 4:** `npx vitest run tests/disposicion.test.ts` → PASA.
- [ ] **Step 5: commit** — «Combate vertical: reparto puro del panel apilado».

---

### Task 3: La escena pide la interfaz alta

**Files:**
- Modify: `src/render/pantalla.ts`, `src/escenas/escena.ts`, `src/escenas/pila.ts`, `src/main.ts:257`
- Test: `tests/pila.test.ts`

**Interfaces:**
- Consumes: `interfazAlta`, `cubrirSala` (Task 1).
- Produces:
  - `Escena.alta?: boolean` — «dibuja en la interfaz alta cuando la ventana es vertical».
  - `PilaEscenas` avisa con `alCambiar(ventana: boolean, alta: boolean)`.
  - `fijarModo(esVentana: boolean, alta = false): void`.
  - `export const interfaz = { ancho: ANCHO, alto: ALTO, alta: false }` (vivo, se muta): lo que usan las escenas adaptadas para repartir. Con `alta` falso vale 480×352 (el de siempre).
  - `esVertical(): boolean` (`innerWidth < innerHeight` al último `ajustar`).

- [ ] **Step 1: test que falla** en `tests/pila.test.ts`: al apilar una escena con `alta = true` el callback recibe `(false, true)`; al desapilar vuelve a la anterior con sus valores; una escena sin `alta` da `(false, false)`.
- [ ] **Step 2:** `npx vitest run tests/pila.test.ts` → FALLA.
- [ ] **Step 3:** implementar. En `pantalla.ts`:
  - Cuarto modo `modos.alta` (origen `0,0`, `escala = interfazAlta(...).escala · dpr`); `activo()` lo elige si `alta && esVertical()`.
  - `interfaz.ancho/alto/alta` se actualiza en `fijarModo` y en `ajustar`; con modo alta, `area = {x:0, y:0, ancho, alto}`.
  - `completa = cubrirSala(...)` cuando la ventana es vertical (el título, la presentación de jefes y el fondo del combate llenan la ventana en vez de dejar bandas negras); en horizontal sigue `encajarSala`.
  - Los toques (`aLogico`, `aVentana`) ya usan `activo()`; comprobar que sirven.
- [ ] **Step 4:** `npx vitest run tests/pila.test.ts` y `npx tsc --noEmit` → PASAN.
- [ ] **Step 5: commit** — «Modo de interfaz alta: la escena lo pide con alta = true».

---

### Task 4: Combate apilado y nombres sin pisarse

**Files:**
- Modify: `src/render/combate.ts`, `src/escenas/combate.ts` (líneas 17-19, 74, 518-519)
- Test: se cubre con `tests/disposicion.test.ts` (Task 2) y la captura de la Task 6; añadir a `tests/combate.test.ts` solo si se toca lógica de `core/`.

**Interfaces:**
- Consumes: `disposicionCombate`, `anchoNombre` (Task 2), `interfaz`, `esVertical` (Task 3), `partirTexto`.
- Produces: `EscenaCombate.alta = true`; en `render/combate.ts`:
  - `listaCombate(): Rect` y `filaCombate(): number` (sustituyen a las constantes `LISTA_COMBATE` y `FILA_COMBATE`; en horizontal devuelven exactamente 8/201/210/144 y 24). Los usa `escenas/combate.ts` en `filaTocada(px, py, listaCombate(), filaCombate(), n)`.
  - `aPanel(x, y)` en vertical es la identidad (el panel no se escala en la interfaz alta).

- [ ] **Step 1:** en vertical (`interfaz.alta`) `dibujarCombate`:
  - Velo y `rellenarArea` sobre toda la ventana (el fondo 3D ya la cubre por la Task 3).
  - Barra de turnos en `y = 10` como ahora, usando `interfaz.ancho` en vez de `ANCHO`.
  - Enemigos en fila repartidos en `disposicion.escena.ancho`: separación `ancho / n`; los sprites a escala `min(2, (separación − 8) / anchoMáximoDeFotograma)`; la y de los pies, en la parte baja de `disposicion.escena` (menos la ficha de la heroína).
  - La heroína abajo a la izquierda de la escena, escala 2.
  - Panel apilado en los rectángulos de `disposicionCombate`: pestaña, lista con `fila`, descripción partida al ancho del panel, ficha (nombre, PV y PM con sus barras al ancho del panel). Mientras se animan los turnos, el registro ocupa el sitio de la lista y la descripción.
  - Cuadro «Has caído…»/«¡Victoria!» centrado en `interfaz`.
- [ ] **Step 2:** en los dos modos (también horizontal), el nombre del enemigo se parte con `partirTexto(nombreCorto(e), anchoNombre(separación))` y se escribe de abajo arriba desde `tope − 18` (dos o tres líneas); `topeEnemigo` sube lo que ocupen. El aviso «¡Golpe fuerte!» y la flecha de objetivo se desplazan igual. Con un nombre de una sola línea el dibujo es el de hoy.
- [ ] **Step 3:** `disposicionCombate` se llama al dibujar y al tocar, con el `fuera` propio del módulo (sin asignar); recalcula si cambian `interfaz.ancho`, `interfaz.alto` o `n` (esto da el foco 1: girar el móvil con el combate abierto).
- [ ] **Step 4:** `npx vitest run` (toda la suite), `npx tsc --noEmit` y `npm run lint` → PASAN; en horizontal ningún test cambia.
- [ ] **Step 5: commit** — «Combate en vertical: panel apilado y nombres de enemigos partidos».

---

### Task 5: Título en vertical

**Files:**
- Modify: `src/escenas/titulo.ts`

**Interfaces:**
- Consumes: `interfaz`, `area` (Task 3).
- Produces: `EscenaTitulo.alta = true`.

- [ ] **Step 1:** en `interfaz.alta`: logo y subtítulo arriba centrados en `interfaz.ancho`; los botones «Controles» y «Bestiario y logros» **abajo**, uno al lado del otro (al alcance del pulgar), de al menos 36 unidades de alto; encima, «Pulsa o toca para empezar»; bajo todo, los récords partidos en las líneas que quepan (no se salen de 320). Las bandas oscuras de arriba y abajo cubren `area` entera.
- [ ] **Step 2:** `BOTON_EXTRAS` y `BOTON_CONTROLES` pasan a ser funciones de `interfaz` (en horizontal devuelven los de hoy: `x: ANCHO − 112, y: 6, 106×40` y `x: 6, y: 6, 106×40`); `update` usa esas funciones para el toque.
- [ ] **Step 3:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint` → PASAN.
- [ ] **Step 4: commit** — «Título en vertical: botones abajo y logo arriba».

---

### Task 6: Comprobar con capturas y poner al día CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/previews/vertical_combate_*.png`

- [ ] **Step 1:** `npm run dev`; con Edge sin cabeza, capturas a 390×844, 360×640 y 768×1024 de: el título, el combate con el menú de acciones, el menú de habilidades de nivel alto, y un combate de tres enemigos (por ejemplo, contra el Sacerdote con acólitos). Si no hay forma de llegar a un combate directo, añadir en desarrollo `?combate=<clave de monstruo>` (como `?zona=N`, solo con `import.meta.env.DEV`).
- [ ] **Step 2:** revisar cada captura: nada se sale ni se pisa, filas de un dedo (≥ 44 px CSS), el horizontal igual que antes (captura de 844×390 del mismo combate). Retocar los números de `vertical.json`, no el código.
- [ ] **Step 3:** `npm test`, `npm run lint`, `npm run build` → verdes (decir cuántos tests).
- [ ] **Step 4:** `CLAUDE.md`: entrega 2 hecha, sin probar en móvil real, y lo que queda (entrega 3: pausa/inventario con pestañas, elegir rana, nombre, dificultad, puntos, equipo, bestiario, controles, mensajes, presentación de jefes; quitar `#girar`).
- [ ] **Step 5: commit** — «Móvil en vertical: combate y título (entrega 2)».

---

## Autorrevisión

- **Cobertura del diseño:** combate apilado en una columna con letra y filas de dedo (Tasks 2 y 4); doble toque intacto (Task 4 no toca `menu.ts`); horizontal igual (restricción global y Step 4 de la Task 4); título (Task 5). Quedan para la entrega 3 las pestañas del inventario y el resto de menús, y quitar `#girar`: **mientras tanto, todo menú fuera del combate y el título sigue pequeño en vertical**.
- **Tipos:** `interfazAlta`, `cubrirSala`, `disposicionCombate`, `anchoNombre`, `listaCombate`, `filaCombate`, `interfaz`, `esVertical` y `Escena.alta` se llaman igual en todas las tareas.
- **Decisiones mías, a revisar:** ancho lógico 320 y tope de escala 1,6; fila de 36 (≈ 44 px CSS en un móvil de 390); el fondo 3D «cubre» la ventana en vertical (recorta los lados de la sala) para quitar las bandas negras; el nombre del enemigo se parte en líneas también en horizontal.
