# Móvil en vertical: diseño

Fecha: 2026-11-07. Estado: borrador para aprobar por Pedro. Decidido en una conversación con bocetos en el navegador (`.superpowers/brainstorm/1133-1794049302/content/`, no se versiona).

## Intención

Hoy, con el móvil de pie, el juego se ve muy pequeño: la sala (21×13 casillas, apaisada) se escala al ancho del móvil y queda a la mitad de tamaño que en horizontal, con la mitad de la pantalla vacía. Los menús (480×352) pasan por lo mismo. Ahora se avisa de que se gire el móvil; la idea es que **se pueda jugar de pie, cómodamente, con una mano**, sin tocar el horizontal.

## Objetivos

- Con la ventana más alta que ancha, mapa, combate y menús usan la pantalla entera con un tamaño legible y táctil (letra y filas del tamaño de un dedo).
- El horizontal queda exactamente como está hoy.
- Las partidas, los guardados y toda la lógica de `src/core/` no cambian.

## No objetivos

- Cámara que se mueve también en vertical, ni mapa a pantalla completa con controles flotando encima (idea C de los bocetos; B es su primer paso y no se tira nada si se quiere después).
- Rediseñar el arte, el HUD en horizontal o los menús en horizontal.
- Gestos nuevos, botones nuevos de acción, vibración, giro automático de la pantalla.
- Cambiar el equilibrado del juego.

## Antiobjetivos (fracaso aunque «funcione»)

- Que el horizontal cambie de aspecto, de rendimiento o se rompa.
- Que en vertical algo siga viéndose a la mitad de tamaño que en horizontal.
- Que un toque se pierda o dispare algo sin querer por tener los controles pegados al borde de la pantalla.

## Decidido por Pedro

1. **Mapa (opción B de los bocetos).** En vertical, la sala se encuadra de modo que **caben siempre las 13 filas** y solo se ven unas 11 de las 21 columnas; la cámara sigue a la heroína **solo en horizontal** y se detiene en los bordes de la sala. Casillas del tamaño de las del horizontal. El HUD (PV, PM, minimapa, mochila) arriba; los controles, debajo del mapa, sin tapar nada.
2. **Combate (apilado).** Escena arriba y, debajo, **en una sola columna**: la lista de acciones o habilidades, la descripción de lo elegido y la ficha de la heroína. Letra y filas cómodas para el dedo.
3. **Menús (pestañas).** Las secciones del inventario (Heroína, Objetos, Equipo, Mejorar, Ajustes) pasan a una fila de pestañas arriba; la sección elegida usa todo el resto del alto; Seguir y Salir quedan abajo, al alcance del pulgar.
4. **Doble toque: sin cambios.** En habilidades, objetos y enemigo el primer toque elige y explica y el segundo usa; lo demás, un toque (`src/core/menu.ts`). Ya funciona así en el móvil.

## Mis decisiones (a revisar)

- **Cambio automático por la forma de la ventana.** «Vertical» = ventana más alta que ancha, sea móvil o una ventana estrecha de escritorio. No depende de `pointer: coarse`. Se recalcula en cada `resize` (ya existe).
- **Aviso de girar el móvil** (`#girar` en `index.html` y `jugar-vertical`): se quita en vertical, porque ya se puede jugar así. Si hace falta, una línea discreta («se ve más grande en horizontal») en la portada.
- **Joystick: se queda como está.** *Corrijo lo que supuse en los bocetos:* el joystick es flotante, nace donde se pone el dedo y no hay botón de confirmar ni de acción (se interactúa andando); el único botón del mapa es la mochila, arriba. En vertical el pulgar usa la franja libre bajo el mapa; no se añade ninguna zona fija ni botón nuevo. Los bocetos del navegador dibujaban un «OK» y un joystick fijos que **no** son parte del diseño.
- **Columnas visibles: 11 de 21**, dato en un JSON de `src/data/` (regla del proyecto: ningún número de diseño en el código). Es un punto de partida; se afina al verlo.
- **Una sola lógica de colocación para los menús en vertical:** la interfaz pasa de 480×352 a una interfaz alta (ancho fijo, alto según la ventana), y cada escena usa su disposición vertical cuando la ventana es vertical. Cómo se organiza en código (valores vivos de `ANCHO`/`ALTO`, una función `esVertical()`, disposiciones por escena) lo decide quien implemente, mientras `src/core/` siga sin importar nada del navegador.
- **Orden de entrega, cada paso publicable:** (1) colocación en vertical y mapa con cámara que sigue (3D y capa 2D: HUD, fundido, lluvia); (2) combate; (3) menús, pantalla por pantalla (pausa/inventario primero; después título, elegir rana, nombre, dificultad, puntos, equipo, bestiario y logros, controles, mensajes).

## Qué hay hoy (para quien construya)

- `src/render/pantalla.ts`: dos formas de colocar el canvas 2D, «ventana» (mapa) y «menú» (480×352 centrado); la sala escala con `min(ancho/672, alto/416)`; `vista` y `vista.hud` anclan el HUD; `rectSala()` da el rectángulo de la sala y el 3D se encuadra con él (`mundo.ts`, `ajustarTamano`, con `setViewOffset`).
- `src/escenas/mapa.ts` dibuja el HUD y el minimapa «a la izquierda de la mochila»; `BOTON_MENU` y `MARGEN_HUD` fijan su sitio.
- `src/input/joystick.ts`: flotante, correr arrastrando lejos; ignora `HTMLButtonElement` y `HTMLInputElement`.
- Combate: `src/render/combate.ts` (panel de dos columnas, `PANEL_ESCALA = 1`, `aPanel` para el toque) y `src/escenas/combate.ts`; el fondo del combate es la sala 3D desenfocada.
- Menús: `src/escenas/` (`pausa.ts` 422 líneas, `equipo.ts`, `puntos.ts`, `titulo.ts`…) con `src/render/marco.ts` (`dibujarFondo`, `dibujarCaja`, `dibujarFila`…), todos con las constantes `ANCHO`/`ALTO`.
- `index.html`: aviso `#girar` para vertical táctil.

## Restricciones

- `src/core/` es lógica pura, sin navegador. Lo que se pueda testear (por ejemplo, la cuenta de dónde se coloca la cámara y que se detenga en los bordes) va ahí o en una función pura con test de Vitest.
- Cero números de diseño en el código; cero asignaciones en el bucle de juego.
- El horizontal es la referencia: sus tests y capturas no cambian.

## Qué se deja a quien construya

Cómo repartir la colocación entre pantalla, 3D y capa 2D; el detalle de cada disposición vertical; los números afinados al verlo.

## Cómo se comprueba

- Vitest para lo puro. Capturas con Edge sin cabeza en ventana vertical (por ejemplo 390×844) del mapa, el combate y cada menú.
- **No hay forma de probar en un móvil real desde aquí:** Pedro tiene que probarlo en el móvil (barra del navegador, pantalla completa, dedo). En iPhone la pantalla completa no existe desde la web.
