# Móvil en vertical, entrega 3: menús — plan de implementación

> **Para quien ejecute:** usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Los pasos usan casillas `- [ ]`. Las tareas se titulan «Task N» a propósito (los scripts de la habilidad de ejecución buscan «Task N»).

**Objetivo:** con la ventana más alta que ancha, todas las pantallas que no son el mapa ni el combate (pausa e inventario, elegir rana, dificultad, nombre, puntos, equipo, bestiario y logros, controles, mensajes y presentación de jefes) se ven a un tamaño legible y táctil, y se quita el aviso de girar el móvil (`#girar`).

**Arquitectura:** cada escena declara `alta = true` y, cuando `interfaz.alta` es verdadero, usa una disposición vertical que sale de funciones puras de `src/core/disposicion.ts` (testeadas); el horizontal sigue con sus constantes de 480×352. Las medidas van a `src/data/vertical.json` (`menu`). Las escenas se adaptan una a una y cada tarea deja el juego jugable: una escena sin adaptar sigue con los 480×352 centrados.

**Tecnologías:** TypeScript estricto, Canvas 2D, Vitest, controles HTML sobre el canvas (`Casilla`, `Deslizador`, `CampoNombre`).

**Diseño:** `docs/superpowers/specs/2026-11-07-movil-vertical-design.md` (punto 3 de «Decidido por Pedro»: pestañas arriba, la sección usa el resto del alto, Seguir y Salir abajo). Entregas 1 y 2: sus planes `...-mapa.md` y `...-combate.md`.

## Restricciones globales

- `src/core/` no importa nada del navegador; todo lo que se pueda testear va ahí.
- Ningún número de diseño en el código: van a `vertical.json` (`menu`), tipo `DatosVertical` en `src/core/encuadre.ts`.
- Cero asignaciones en el bucle de juego: los rectángulos de cada fotograma son objetos reutilizados (como `RECT` en `render/combate.ts`) o listas rehechas solo cuando cambia el tamaño (`alRedimensionar` de `pantalla.ts`).
- **El horizontal no cambia:** `LISTA_INVENTARIO`, `TARJETAS`, `FILAS_PUNTOS`, `FILAS_EQUIPO`, `CELDAS`, `PESTANAS`, `rectOpcion` y compañía salen igual que hoy. Su dibujo y sus tests no se tocan.
- Nada de `320` en el código: se usa `interfaz.ancho` (en una tableta pasa de 320 hasta 480) e `interfaz.alto`.
- Doble toque en objetos (`src/core/menu.ts`) y el resto del comportamiento, sin cambios. Salir sigue pidiendo una segunda pulsación.
- Código, comentarios y commits en español; commits pequeños, uno por tarea; commits con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Probar en móvil real no se puede desde aquí: capturas con Edge sin cabeza (`foto.mjs`) a 390×844, 360×640 y 768×1024, y 844×390 para comprobar que el horizontal no cambia.

## Qué se ve mal hoy

Todas estas escenas dibujan en 480×352 centrados y escalados al ancho del móvil (≈0,8×) con barras vacías arriba y abajo; las rejillas y filas están fijadas a píxeles de 480 (`ANCHO - 32`, `FILAS_PUNTOS`, `CELDAS`…). Además, el aviso `#girar` sigue obligando a pulsar «Jugar así igualmente».

## Disposiciones decididas (ancho lógico 320, alto 569–692)

| Pantalla | Vertical |
|---|---|
| Pausa e inventario | Fila de 5 pestañas arriba (Heroína, Objetos, Equipo, Mejorar, Ajustes; Equipo y Mejorar abren su pantalla como hoy; los puntos libres de Mejorar, como insignia en la pestaña); contenido a todo el ancho y el resto del alto; **Seguir** y **Salir** abajo, lado a lado, de 44 de alto |
| Heroína (en la pausa) | Retrato y barras arriba; Estadísticas a la izquierda y Habilidades a la derecha; Equipo debajo a ancho completo |
| Objetos | Filas de 36 a ancho completo; qué hace el elegido, debajo; PV y PM al pie |
| Ajustes | Sonido y Calidad cada uno en su fila; Música y Efectos uno bajo otro a ancho completo; la lista de controles debajo |
| Elegir rana | Dos tarjetas apiladas: la rana a la izquierda y nombre y estadísticas a la derecha |
| Dificultad, puntos, equipo, bestiario, controles | Cabecera arriba, contenido en columna y **botones abajo** (hasta 3 lado a lado; más, en dos columnas) |
| Puntos | Siete filas de 44: nombre y «+5/punto» a la izquierda, valor, «−» y «+» a la derecha |
| Equipo | La rana arriba, las dos piezas a ancho completo con sus flechas, estadísticas en dos columnas |
| Bestiario | Pestañas arriba; rejilla de 6 columnas × 4 filas; ficha del elegido debajo |
| Logros | Filas de 44 con la descripción partida en dos líneas |
| Nombre | El campo HTML en la mitad de arriba (si sale el teclado, no lo tapa) |
| Mensajes y presentación | Centrados en el alto; títulos largos partidos en líneas |

## Foco de revisión

1. **Girar el móvil con un menú abierto:** los rectángulos de toque y los controles HTML (Ajustes y campo de nombre) se recalculan; un toque justo después no cae en un rectángulo viejo. Test: la disposición sale igual para el mismo tamaño y distinta al cambiar.
2. **Teclado en pantalla en «Nombre»:** al salir el teclado, la ventana mide menos y la disposición se recalcula; el campo y los botones siguen alcanzables (campo en la mitad de arriba; si no caben los botones, mandan el campo y el primero).
3. **Contenido que no cabe:** equipo con efecto y Corazón (hasta 9 líneas), 7 filas de puntos, 24 casillas de bestiario y los logros reales en 360×640 (alto 569): la lista no se sale del contenido; las filas se encogen hasta `filaMin`. Tests con `n` grandes.
4. **Nombres largos de jefes** («Sacerdote de la luna falsa», 26 letras) en la presentación: caben partidos en líneas al ancho de la interfaz.
5. **Tableta de pie (768×1024):** `interfaz.ancho` pasa de 320; ninguna disposición usa el 320 fijo ni deja el contenido pegado a la izquierda.

---

## Estructura de ficheros

- `src/data/vertical.json` — añade `menu` (`margen`, `pestana`, `boton`, `fila`, `filaMin`).
- `src/core/encuadre.ts` — `DatosVertical.menu`.
- `src/core/disposicion.ts` — `disposicionPausa`, `botonesAltos`, `tarjetasAltas`, `filasLista`, `celdasBestiario`.
- `src/render/marco.ts` — `dibujarCabecera` centrada en `interfaz.ancho` (hoy 240 y 160 fijos).
- `src/render/combate.ts` — `rectOpcion` / `opcionTocada` / `dibujarMenu` con botones de abajo en la interfaz alta.
- `src/render/pausa.ts`, `src/escenas/pausa.ts`, `src/render/seleccion.ts`, `src/escenas/seleccion.ts`, `src/render/dificultad.ts`, `src/escenas/dificultad.ts`, `src/render/nombre.ts`, `src/escenas/nombre.ts`, `src/render/puntos.ts`, `src/escenas/puntos.ts`, `src/render/equipo.ts`, `src/escenas/equipo.ts`, `src/render/extras.ts`, `src/escenas/extras.ts`, `src/escenas/controles.ts`, `src/escenas/mensaje.ts`, `src/escenas/presentacion.ts` — cada escena declara `alta` y dibuja y toca según `interfaz.alta`.
- `src/main.ts` — rectángulos de los controles HTML (Ajustes y nombre) pasan a objetos mutables que la escena reajusta.
- `index.html` y `src/render/pantalla.ts` — se quita `#girar` y `jugar-vertical`.
- Tests: `tests/disposicion.test.ts` (amplía), `tests/encuadre.test.ts` (si cambia `DatosVertical`).

---

### Task 1: Disposiciones puras y datos

**Files:**
- Modify: `src/data/vertical.json`, `src/core/encuadre.ts` (tipo `DatosVertical`), `src/core/disposicion.ts`
- Test: `tests/disposicion.test.ts`

**Interfaces:**
- Consumes: `Rect` de `src/core/menu.ts`; `DatosVertical`.
- Produces (todas puras, devuelven rectángulos nuevos: se llaman al cambiar el tamaño, no en cada fotograma):
  - `DatosVertical.menu: { margen: number; pestana: number; boton: number; fila: number; filaMin: number }` con 8, 36, 44, 36 y 30.
  - `disposicionPausa(ancho: number, alto: number, d: DatosVertical): { pestanas: Rect[]; contenido: Rect; botones: Rect[] }`: 5 pestañas iguales en una fila arriba (alto `pestana`), 2 botones iguales abajo (alto `boton`), y el contenido en medio con `margen` entre todo.
  - `botonesAltos(n: number, ancho: number, alto: number, d: DatosVertical): Rect[]`: botones de `boton` de alto pegados abajo; hasta 3 lado a lado a ancho completo; más de 3, en dos columnas desde abajo.
  - `tarjetasAltas(n: number, ancho: number, alto: number, d: DatosVertical): Rect[]`: `n` tarjetas apiladas a ancho completo entre una cabecera de 40 y un pie de 24; su alto es el reparto, tope 190.
  - `filasLista(n: number, y0: number, hasta: number, ancho: number, d: DatosVertical): { filas: Rect[]; alto: number }`: `n` filas apiladas desde `y0`; el alto de fila es `min(d.menu.fila, (hasta - y0) / n)`, nunca menos de `d.menu.filaMin`.
  - `celdasBestiario(n: number, ancho: number, y0: number, d: DatosVertical): { celdas: Rect[]; alto: number }`: rejilla con las columnas que caben a 48 de ancho mínimo, centrada; `alto` es lo que ocupa.

- [ ] **Step 1: tests que fallan** en `tests/disposicion.test.ts`:
  - `disposicionPausa(320, 569, d)`: 5 pestañas de ancho ≈ 57,6 y `y = 8`; 2 botones con `y + alto = 561`; el contenido empieza después de las pestañas y acaba antes de los botones; ningún rectángulo se pisa.
  - `disposicionPausa(480, 640, d)` (tableta): el contenido y las pestañas ocupan los 480 de ancho menos márgenes.
  - `botonesAltos(3, 320, 569, d)`: tres botones en la misma `y`, el último acaba en `320 - 8`; `botonesAltos(5, ...)`: dos columnas y todos dentro de `[0, alto]`.
  - `tarjetasAltas(2, 320, 569, d)`: 2 tarjetas de ancho 304, no se pisan y caben entre cabecera y pie.
  - `filasLista(7, 70, 500, 320, d)`: 7 filas a ancho completo dentro de `[70, 500]`; con `hasta` muy pequeño, el alto de fila es `filaMin` y las filas se pasan de `hasta` (el test lo dice: la última sigue siendo alcanzable dentro de la ventana de 569).
  - `celdasBestiario(24, 320, 56, d)`: 6 columnas × 4 filas, todas dentro del ancho; `alto` = 4 × alto de celda más separaciones.
- [ ] **Step 2:** `npx vitest run tests/disposicion.test.ts` → FALLA («disposicionPausa no existe», etc.).
- [ ] **Step 3: implementar** las cinco funciones y `DatosVertical.menu` en `disposicion.ts`, `encuadre.ts` y `vertical.json`. Tipos de resultado y firmas como arriba.
- [ ] **Step 4:** `npx vitest run tests/disposicion.test.ts` → PASA; y `npx vitest run` → toda la suite en verde.
- [ ] **Step 5: commit** «Móvil en vertical: disposiciones puras de los menús».

### Task 2: Cabecera y botones comunes en la interfaz alta

**Files:**
- Modify: `src/render/marco.ts`, `src/render/combate.ts` (`rectOpcion`, `opcionTocada`, `dibujarMenu`)
- Test: `tests/disposicion.test.ts` (los botones salen de `botonesAltos`; sin test de dibujo)

**Interfaces:**
- Consumes: `botonesAltos`, `interfaz` de `pantalla.ts`.
- Produces: `dibujarCabecera` centrada en `interfaz.ancho / 2` (el filete mide 160 como hoy); `opcionTocada(x, y, n)` y `dibujarMenu` usan los rectángulos de `botonesAltos` cuando `interfaz.alta`, con la lista recalculada solo cuando cambian `n`, `interfaz.ancho` o `interfaz.alto` (una caché, sin asignar por fotograma). En horizontal, idénticos a hoy.

- [ ] **Step 1: test que falla**: `botonesAltos` de 3 opciones en 320×569 da rectángulos que no se pisan y cuya zona de toque coincide con la de dibujo (la escena pregunta `opcionTocada` con el centro de cada rectángulo y obtiene su índice; test sobre la caché pura extraída a `core/`).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar** la caché de rectángulos por `(n, ancho, alto)` y usarla en `rectOpcion` cuando `interfaz.alta`; `dibujarCabecera` con `interfaz.ancho`.
- [ ] **Step 4:** `npx vitest run` y `npx tsc --noEmit` → en verde.
- [ ] **Step 5: commit** «Botones y cabecera de los menús en la interfaz alta».

### Task 3: Pausa e inventario con pestañas

**Files:**
- Modify: `src/render/pausa.ts`, `src/escenas/pausa.ts`, `src/main.ts` (rectángulos de Ajustes)
- Test: `tests/pausa.test.ts` (el toque en vertical: `seccionTocadaAlta`) y las funciones puras de la Task 1

**Interfaces:**
- Consumes: `disposicionPausa`, `filasLista`, `interfaz`.
- Produces:
  - `EscenaPausa.alta = true`.
  - `seccionTocada(x, y)` devuelve la sección bajo el toque con las pestañas y los botones de la disposición vertical cuando `interfaz.alta`; en horizontal, como hoy.
  - `dibujarInventario` en vertical: pestañas arriba (la activa con el filete claro y el rombo; Mejorar apagada sin puntos y con su insignia con puntos), el panel del contenido con el marco de siempre, Seguir y Salir como botones abajo (Salir muestra «¿Seguro?» cuando toca).
  - La ficha de la heroína parte «Equipo» a `LETRAS_PANEL_ALTA` letras (un número nuevo en `vertical.json`, no 20) y se rehace al cambiar de forma (`interfaz.alta`), sin asignar por fotograma.
  - `RECT_SONIDO`, `RECT_CALIDAD`, `RECT_MUSICA` y `RECT_EFECTOS` pasan a objetos que la escena reajusta con `alRedimensionar` y al mostrar Ajustes: uno bajo otro en vertical, como en la tabla; `main.ts` sigue creándolos con esos objetos.

- [ ] **Step 1: tests que fallan** en `tests/pausa.test.ts`: con `interfaz.alta = true` y 320×569, `seccionTocada` del centro de cada pestaña da 0 a 4, del centro de «Seguir» da 5 y de «Salir» da 6, y de un punto del contenido da -1; la misma `seccionTocada` en horizontal da lo de hoy (las pruebas existentes siguen igual).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar** el dibujo y el toque verticales; en Ajustes colocar los controles HTML con los rectángulos nuevos (calidad y sonido en su fila, sliders a ancho completo).
- [ ] **Step 4:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint src tests`. Capturas: inventario en Heroína, Objetos y Ajustes a 390×844 y 360×640; revisarlas con `Read`.
- [ ] **Step 5: commit** «Pausa e inventario con pestañas en vertical».

### Task 4: Elegir rana y dificultad

**Files:**
- Modify: `src/render/seleccion.ts`, `src/escenas/seleccion.ts`, `src/render/dificultad.ts`, `src/escenas/dificultad.ts`

**Interfaces:**
- Consumes: `tarjetasAltas`, `botonesAltos`, `interfaz`.
- Produces: `EscenaSeleccion.alta = true` con las tarjetas de `tarjetasAltas` (la rana a la izquierda a escala 3 y nombre y estadísticas a la derecha); `EscenaDificultad.alta = true` con la cabecera, el marco con la ficha (las líneas de la descripción partidas a `interfaz.ancho`) y los botones de `botonesAltos` (Task 2). La pista del pie cambia de sitio con la interfaz.

- [ ] **Step 1: test que falla**: el toque en el centro de cada tarjeta de `tarjetasAltas` elige esa heroína (test de la función de toque de la escena extraída a una función pura `tarjetaTocada(x, y, rects)`).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar** el dibujo y el toque verticales.
- [ ] **Step 4:** suite, tipos, lint y capturas (elegir rana y dificultad a 390×844 y 360×640; hay que pasar el título con `tecla:Enter`).
- [ ] **Step 5: commit** «Elegir rana y dificultad en vertical».

### Task 5: Nombre y puntos

**Files:**
- Modify: `src/render/nombre.ts`, `src/escenas/nombre.ts`, `src/render/puntos.ts`, `src/escenas/puntos.ts`, `src/render/campoNombre.ts` (el rectángulo pasa a ser mutable y se reajusta al redimensionar), `src/main.ts`

**Interfaces:**
- Consumes: `filasLista`, `botonesAltos`.
- Produces: la rana y el campo HTML en la mitad de arriba; botones de `botonesAltos`. Puntos: `filasPuntos(): Rect[]` y `signos(): { menos: number; mas: number; ancho: number }` que devuelven `FILAS_PUNTOS` y `SIGNO` en horizontal y los de la disposición vertical en la interfaz alta (rehechos al cambiar de tamaño); la escena usa esas funciones para tocar y dibujar.

- [ ] **Step 1: tests que fallan**: en vertical, el toque en el centro de «+» y de «−» de cada una de las 7 filas da (fila, signo) correctos (función pura de toque; `FILAS_PUNTOS` y `SIGNO` en horizontal no cambian).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar**; en el nombre, reajustar el campo con `alRedimensionar` antes de `colocar` (el orden de los oyentes de `resize` importa: `pantalla.ts` registra el suyo primero).
- [ ] **Step 4:** suite, tipos, lint y capturas de las dos pantallas.
- [ ] **Step 5: commit** «Nombre y puntos en vertical».

### Task 6: Equipo

**Files:**
- Modify: `src/render/equipo.ts`, `src/escenas/equipo.ts`

**Interfaces:**
- Consumes: `filasLista`, `botonesAltos`.
- Produces: `filasEquipo(): Rect[]` (devuelve `FILAS_EQUIPO` en horizontal); en vertical: la rana arriba, las dos piezas a ancho completo con su efecto debajo, estadísticas en dos columnas y botones abajo; `ANCHO_FLECHA` se mantiene (44).

- [ ] **Step 1: test que falla**: en vertical, un toque en el cuarto izquierdo y en el cuarto derecho de cada fila de `filasEquipo` da «ciclar −1» y «ciclar +1» (función pura de toque).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar.**
- [ ] **Step 4:** suite, tipos, lint y capturas (con arma y armadura de la zona 3 para el peor caso de líneas).
- [ ] **Step 5: commit** «Equipo en vertical».

### Task 7: Bestiario y logros

**Files:**
- Modify: `src/render/extras.ts`, `src/escenas/extras.ts`

**Interfaces:**
- Consumes: `celdasBestiario`, `filasLista`, `botonesAltos`.
- Produces: `celdas(): Rect[]` y `pestanas(): Rect[]` (en horizontal, `CELDAS` y `PESTANAS`); bestiario con rejilla de 6×4, ficha del elegido a ancho completo debajo (el nombre y las líneas partidas a `interfaz.ancho`); logros en filas con la descripción en dos líneas (`partirTexto`, en caché por ancho); botón «Volver» abajo.

- [ ] **Step 1: test que falla**: en vertical, el centro de cada una de las 24 celdas da su índice y ninguna cae fuera del ancho; las dos pestañas caben en `interfaz.ancho`.
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar.**
- [ ] **Step 4:** suite, tipos, lint y capturas de las dos páginas, con la lista real de logros a 360×640.
- [ ] **Step 5: commit** «Bestiario y logros en vertical».

### Task 8: Controles, mensajes y presentación de jefes; quitar el aviso de girar

**Files:**
- Modify: `src/escenas/controles.ts`, `src/escenas/mensaje.ts`, `src/escenas/presentacion.ts`, `index.html`, `src/render/pantalla.ts`, `CLAUDE.md`, `docs/previews/`

**Interfaces:**
- Consumes: `interfaz`, `partirTexto`.
- Produces: las tres escenas con `alta = true`, centradas con `interfaz.ancho` y `interfaz.alto`; mensajes y presentación parten los textos al ancho (en caché); la presentación parte el nombre del jefe en líneas al ancho de la fuente del título. Se borran `#girar` y su CSS de `index.html`, `jugar-vertical` y la clase `vertical` de `pantalla.ts`.

- [ ] **Step 1: tests que fallan**: el reparto del nombre del jefe más largo («Sacerdote de la luna falsa») en líneas de ancho ≤ `interfaz.ancho` con la fuente del título (función pura de `core/texto.ts`, con el ancho de letra de la fuente del título en `vertical.json`).
- [ ] **Step 2:** ejecutarlo → FALLA.
- [ ] **Step 3: implementar** las tres escenas, quitar el aviso y su código.
- [ ] **Step 4:** suite completa, `npx tsc --noEmit`, `npx eslint .`, `npm run build`; recorrer una partida entera en Edge a 390×844 (título → rana → dificultad → nombre → mapa → pausa → combate → presentación de jefe → mensaje) y mirar cada pantalla. Capturas de la entrega 3 en `docs/previews/vertical_menus_*.png`.
- [ ] **Step 5: commit** «Controles, mensajes y presentación en vertical; quitado el aviso de girar», y actualizar `CLAUDE.md` (entrega 3 hecha, sin probar en móvil) en el mismo commit.

---

## Autorrevisión

- **Cobertura del diseño** (punto 3 y orden de entrega): pausa con pestañas, Seguir y Salir abajo (Task 3), el resto de pantallas (Tasks 4 a 8) y quitar `#girar` (Task 8). Sin hueco.
- **Consistencia de nombres:** `botonesAltos`, `filasLista`, `tarjetasAltas`, `celdasBestiario`, `disposicionPausa` se definen en la Task 1 y las demás tareas solo las consumen.
- **Proporción:** 8 tareas; cada pantalla lleva su test de toque puro. El dibujo se comprueba con capturas, como en las entregas anteriores.
- **Riesgo conocido:** `render/pausa.ts` y `render/combate.ts` ya son grandes; si en la Task 3 el dibujo vertical de la pausa pasa de ~150 líneas, va a `render/pausaAlta.ts`.
