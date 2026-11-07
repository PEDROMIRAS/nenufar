# Móvil en vertical, entrega 1: el mapa — plan de implementación

> **Para quien ejecute:** usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans, tarea a tarea. Los pasos llevan casilla (`- [ ]`).

**Objetivo:** con la ventana más alta que ancha, el mapa se ve con 11 de las 21 columnas a tamaño legible y la cámara sigue a la heroína solo en horizontal; el horizontal no cambia.

**Arquitectura:** un cálculo puro en `src/core/encuadre.ts` decide la escala, la posición de la sala en la ventana y cuánto se desplaza; `pantalla.ts` lo usa para el canvas 2D y para `rectSala()`, y `mundo.ts` reencuadra el 3D en cada fotograma con ese rectángulo. Las demás escenas (combate, presentación, título, menús) siguen encuadrando la sala entera como hoy.

**Stack:** TypeScript estricto, Vite, Vitest, Three.js 0.180, Canvas 2D.

**Diseño:** `docs/superpowers/specs/2026-11-07-movil-vertical-design.md`. Esta es la entrega 1 de 3 (mapa); combate y menús tendrán su propio plan, que se escribe tras probar esta en el móvil.

## Restricciones globales

- `src/core/` no importa nada del navegador; lo testeable va ahí con Vitest.
- Ningún número de diseño en el código: las columnas visibles y la franja del HUD salen de `src/data/vertical.json` (11 y 56).
- Cero asignaciones dentro del bucle de juego (por eso `rectSala()` devolverá un objeto compartido).
- «Vertical» = `ancho < alto` de la ventana. Con `ancho >= alto` todo se calcula como hoy, al píxel.
- Vitest falla si el directorio de trabajo empieza con `c:\` en minúscula: ejecutar desde `C:\Users\pmira\Documents\GitHub\nenufar`.
- No tocar `#girar` ni `jugar-vertical` de `index.html` (el aviso se quita en la entrega de los menús; hasta entonces, en el móvil de pie hay que pulsar «Jugar así igualmente»).
- Código, comentarios y commits en español. Rama `movil-vertical` desde `main`. Los commits terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Puntos de revisión (casos que el diseño implica y no nombra)

1. Heroína en el borde izquierdo o derecho de la sala: la cámara se detiene y no enseña fuera de la sala → test de `desplazamientoX` (Tarea 1) y captura (Tarea 3).
2. Ventana cuadrada (`ancho == alto`): cuenta como horizontal → test de `colocarSala` (Tarea 1).
3. Ventana vertical muy baja (390×500): la sala tiene que caber y no tapar el HUD → test de `colocarSala` (Tarea 1).
4. Girar el móvil con el mapa abierto, en los dos sentidos: la heroína sigue a la vista y nada queda desplazado → captura con cambio de tamaño (Tarea 3).
5. Combate, presentación de jefe y título en vertical: el fondo 3D se ve igual que antes de este plan → test de `encajarSala` distinta de `colocarSala` en vertical (Tarea 1) y captura comparada con la de referencia (Tarea 3).

## Archivos

- Crear `src/core/encuadre.ts`: cálculo puro (`encajarSala`, `colocarSala`, `desplazamientoX`, tipos).
- Crear `src/data/vertical.json`: `columnas`, `franjaHud`.
- Crear `tests/encuadre.test.ts`.
- Modificar `src/data/datos.ts` (exportar `VERTICAL`), `src/render/pantalla.ts`, `src/render/hud.ts`, `src/render/mundo/mundo.ts`, `src/escenas/mapa.ts`, y `CLAUDE.md` (Estado).

---

### Tarea 1: Cálculo puro del encuadre

**Files:**
- Create: `src/core/encuadre.ts`, `src/data/vertical.json`, `tests/encuadre.test.ts`
- Modify: `src/data/datos.ts`

**Interfaces:**
- Produces (en `src/core/encuadre.ts`; las unidades son las que pase quien llama, todas iguales):
  - `interface DatosVertical { columnas: number; franjaHud: number }`
  - `interface Colocacion { escala: number; x: number; y: number }` (unidades de ventana por unidad lógica de la sala, y esquina superior izquierda de la sala sin desplazar)
  - `encajarSala(ancho: number, alto: number, salaAncho: number, salaAlto: number): Colocacion`: la sala entera, a todo lo que cabe y centrada (la fórmula de hoy).
  - `colocarSala(ancho: number, alto: number, d: DatosVertical, salaAncho: number, salaAlto: number, tile: number): Colocacion` (`tile` = lado del tile en píxeles lógicos)
  - `desplazamientoX(xHeroina: number, visibleAncho: number, salaAncho: number): number`
- Produces en `src/data/datos.ts`: `export const VERTICAL: DatosVertical`.

- [ ] **Paso 1: escribir `tests/encuadre.test.ts` (debe fallar)** con estos casos, con `salaAncho = 672`, `salaAlto = 416`, `tile = 32`, `d = { columnas: 11, franjaHud: 56 }` y `toBeCloseTo` para los decimales:
  - `encajarSala(1280, 720, 672, 416)`: `escala` = 720/416, `y` = 0, `x` = (1280 − 672·720/416)/2.
  - `colocarSala(1280, 720, d, …)` es igual que `encajarSala(1280, 720, …)` (horizontal sin cambios); lo mismo con `colocarSala(600, 600, d, …)` (cuadrada).
  - `colocarSala(390, 844, d, …)`: `escala` = 390/(11·32), `x` = 0, `y` = (844 − 416·escala)/2 (≈ 191,5).
  - `colocarSala(390, 500, d, …)`: `escala` = (500 − 56)/416, `x` = 0, `y` = 56 (la franja del HUD manda).
  - En vertical, `colocarSala(390, 844, …).escala` ≠ `encajarSala(390, 844, …).escala` (el fondo de combate sigue usando `encajarSala`).
  - `desplazamientoX`, con `visibleAncho` 352: heroína en 0 → 0; en 336 → 160; en 672 → 320; en 100 con `visibleAncho` 700 (ve más que la sala) → 0.

- [ ] **Paso 2: ejecutar `npx vitest run tests/encuadre.test.ts` y comprobar que falla** («no se encuentra el módulo»).

- [ ] **Paso 3: crear `src/data/vertical.json`** con `{ "columnas": 11, "franjaHud": 56 }`; exportar `VERTICAL` en `src/data/datos.ts` como se hace con `HD2D` (importar el JSON y afirmar el tipo `DatosVertical`).

- [ ] **Paso 4: implementar `src/core/encuadre.ts`.**
  - `encajarSala`: `escala = min(ancho/salaAncho, alto/salaAlto)`, centrada en los dos ejes.
  - `colocarSala`: si `ancho >= alto`, devuelve `encajarSala`. Si no, `escala = min(ancho/(columnas·tile), (alto − franjaHud)/salaAlto)`, `x = max(0, (ancho − salaAncho·escala)/2)`, `y = max(franjaHud, (alto − salaAlto·escala)/2)`.
  - `desplazamientoX`: si `visibleAncho >= salaAncho`, 0; si no, `clamp(xHeroina − visibleAncho/2, 0, salaAncho − visibleAncho)`.

- [ ] **Paso 5: `npx vitest run tests/encuadre.test.ts` pasa; `npm test` completo pasa.**

- [ ] **Paso 6: commit** `Encuadre del mapa en vertical: cálculo puro y datos`.

---

### Tarea 2: Pantalla y HUD usan el encuadre

**Files:**
- Modify: `src/render/pantalla.ts`, `src/render/hud.ts`

**Interfaces:**
- Consumes: `colocarSala`, `encajarSala`, `desplazamientoX`, `VERTICAL` (Tarea 1).
- Produces:
  - `vista.salaY: number` (campo nuevo de `vista`): y lógica de la parte superior de la sala en coordenadas de la forma «ventana».
  - `seguir(xHeroina: number): void`: fija el desplazamiento lateral de la cámara del mapa (píxeles lógicos de la sala), con `desplazamientoX(xHeroina, vista.ancho, SALA_ANCHO)`.
  - `rectSala()` cambia de semántica sin cambiar de firma: si la escena activa es de forma «ventana» (el mapa), el rectángulo sigue a la heroína (usa `colocarSala` y el desplazamiento); en cualquier otra, es la sala entera (`encajarSala`). Devuelve **siempre el mismo objeto**, rellenado cada vez (sin asignar), en píxeles CSS.

- [ ] **Paso 1: capturas de referencia antes de tocar nada** (guardar en el scratchpad de la sesión, no en el repo): con `npm run dev` y Edge, mapa en 1280×720; y en 390×844 (emulación móvil táctil, pulsar «Jugar así igualmente») el mapa, un combate y la portada. Sirven de comparación en la Tarea 3.

- [ ] **Paso 2: en `pantalla.ts`**, junto a `SALA_ANCHO`, definir `const TILE = 32` (lado del tile; 672 = 21·32). En `ajustar()`, calcular con las medidas reales (píxeles físicos, como hoy): `const mapa = colocarSala(real.ancho, real.alto, { columnas: VERTICAL.columnas, franjaHud: VERTICAL.franjaHud * dpr }, SALA_ANCHO, SALA_ALTO, TILE)` y `const completa = encajarSala(real.ancho, real.alto, SALA_ANCHO, SALA_ALTO)`; guardar las dos a nivel de módulo. `modos.ventana.escala` y `vista.ancho/alto/hud` salen de `mapa.escala` (donde hoy sale `sala`); `vista.salaY = mapa.y / mapa.escala`. En horizontal el resultado tiene que ser idéntico al de hoy.

- [ ] **Paso 3: en `pantalla.ts`**, añadir `seguir` y reescribir `rectSala()` como se describe arriba (objeto compartido a nivel de módulo; x e y en CSS = valor real / `dpr`; en la forma «ventana», `x = (mapa.x − desplazamiento·mapa.escala)/dpr`).

- [ ] **Paso 4: en `hud.ts`**, `dibujarAviso`: la y pasa a `(vista.salaY + SALA_ALTO) / vista.hud - 46` (hoy supone la sala centrada; en horizontal el valor es el mismo).

- [ ] **Paso 5: `npm test` y `npm run build` pasan** (el horizontal no tiene cambios visibles todavía; el 3D aún no usa el desplazamiento).

- [ ] **Paso 6: commit** `Pantalla: colocación de la sala en vertical y seguimiento lateral`.

---

### Tarea 3: El 3D y el mapa siguen a la heroína

**Files:**
- Modify: `src/render/mundo/mundo.ts`, `src/escenas/mapa.ts`, `CLAUDE.md`; y `src/data/hd2d.json` solo si hace falta (paso 5)

**Interfaces:**
- Consumes: `rectSala()`, `seguir()` (Tarea 2).
- Produces: `Mundo.encuadrar(): void` (privado): aplica a la cámara el rectángulo de `rectSala()`.

- [ ] **Paso 1: en `mundo.ts`**, extraer de `ajustarTamano()` la llamada a `setViewOffset` y la actualización de `sala2d` a `private encuadrar(): void` (usa el objeto de `rectSala()` y modifica `sala2d` en sitio, sin asignar); `ajustarTamano()` la llama y conserva el tamaño del renderizador y `uRadioPx`. Llamar también a `encuadrar()` al principio de `dibujar` y de `dibujarFondo`, para que el rectángulo siga a la heroína en el mapa y vuelva a la sala entera en las demás escenas.

- [ ] **Paso 2: en `mapa.ts`, `draw`**: calcular una vez la x interpolada de la heroína (`h.xAnterior + (h.cuerpo.x - h.xAnterior) * alpha`), llamar a `seguir(esa x)` antes de `mundo.dibujar` y pasar la misma x a `dibujar` (hoy la calcula inline).

- [ ] **Paso 3: `npm test`, `npm run build` y `npm run lint` pasan.**

- [ ] **Paso 4: capturas con Edge** (mismo método que en Tarea 2, paso 1) y comprobar:
  - Horizontal 1280×720: el mapa y su HUD son idénticos a la referencia.
  - 390×844 y 360×800: caben las 13 filas, se ven unas 11 columnas, el HUD (zona, PV, PM, minimapa y mochila) no se solapa con la sala ni con sí mismo, y el aviso de la fuente queda sobre la parte baja de la sala.
  - Heroína en el borde izquierdo, en el centro y en el borde derecho (mantener la flecha): la cámara la sigue y se detiene en los bordes sin enseñar fuera de la sala; el desenfoque de los bordes y la transparencia de lo que tapa a la heroína siguen funcionando con la sala desplazada.
  - Cambiar el tamaño de la ventana con el mapa abierto (390×844 → 844×390 → 390×844): la heroína sigue a la vista y la sala bien colocada.
  - Abrir la mochila y volver al mapa en vertical; entrar en un combate: el fondo 3D se ve como en la referencia.

- [ ] **Paso 5: si en 390×844 se ve el color de fondo vacío bajo o sobre la sala** (el decorado de fuera, `exterior` en `hd2d.json`, es de 6 casillas arriba y 4 abajo), subir `exterior.arriba` / `exterior.abajo` lo justo para cubrirlo y comprobar que el horizontal no cambia de aspecto ni de rendimiento perceptible.

- [ ] **Paso 6: poner al día `CLAUDE.md`**: en «Estado», una viñeta nueva (qué hace el mapa en vertical, que combate y menús faltan, que `#girar` sigue hasta la entrega de menús y que **no se ha probado en un móvil real**), y en «Próximos pasos» tachar el punto 2 como en curso.

- [ ] **Paso 7: commit** `Mapa en vertical: la cámara sigue a la heroína en horizontal`.

---

## Autorrevisión

- **Cobertura del diseño (entrega 1):** mapa con 13 filas y ~11 columnas, cámara solo horizontal con límites, HUD arriba (Tarea 2/3), horizontal intacto (tests + capturas), joystick y botones sin cambios (no se tocan), cambio automático por forma de ventana (`ancho < alto`), números en JSON. Pendiente por diseño, fuera de este plan: combate apilado, menús con pestañas, quitar `#girar`.
- **Tipos:** `Colocacion`, `DatosVertical`, `VERTICAL`, `seguir`, `rectSala`, `vista.salaY` y `encuadrar` se nombran igual en todas las tareas.
- **Lo que no se puede comprobar aquí:** el móvil real (barra del navegador, pantalla completa, el dedo). Lo prueba Pedro.
