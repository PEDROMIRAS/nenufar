# Menú de combate nuevo (diseño)

Fecha: 2026-10-26. Elegido por Pedro con bocetos: disposición **B** (panel de abajo en dos
columnas) y estilo **1** (Octopath: filete dorado). Bocetos en
`docs/superpowers/mockups/2026-10-26-menu-combate.html` (disposiciones) y
`docs/superpowers/mockups/2026-10-26-menu-estetica.html` (estilos).

## Por qué

Con la quinta habilidad (la de recompensa) los botones de una fila no cabían. El arreglo de hoy
(rejilla de 3 columnas y la ayuda «i» subida bajo la barra de turnos) tapa el nombre de los jefes
altos (captura de Pedro con el golem). Pedro quiere además un menú más moderno, al estilo
Octopath.

## Objetivos

- Un panel abajo, de lado a lado, con dos columnas: a la izquierda la lista de opciones (una por
  fila, el coste en PM alineado a la derecha) y a la derecha qué hace la opción elegida.
- Nada del menú tapa a los enemigos ni a la heroína, sea cual sea el jefe.
- Aspecto Octopath: fondo casi negro translúcido, doble filete dorado con rombos en las esquinas,
  la opción elegida con un brillo dorado y un rombo de cursor.
- Se juega igual de bien con teclado que con el dedo.

## No objetivos

- Cambiar otros menús (pausa, equipo, puntos, dificultad): siguen como están.
- Cambiar la lógica del combate (`core/combate.ts`) o el equilibrado.
- La disposición A (lista junto a quien actúa): idea guardada para más adelante.

## Lo que lo estropearía

- Que la ayuda o el panel vuelvan a tapar a un jefe alto (golem, Rey sin Charca, dragón).
- Filas demasiado pequeñas para el dedo, o que un toque mal dado gaste PM u objetos.
- Perder lo que ya funciona: lector de pantalla (`anunciar`), movimiento reducido, contraste.

## Disposición (píxeles del juego, 480×352)

- **Panel:** x 8, y 200, 464 × 146. Encima, a la izquierda, una pestaña con el nombre del menú
  abierto («Acción», «Habilidad», «Objeto», «Objetivo»).
- **Columna izquierda:** 210 de ancho, filas de **24** de alto (el mínimo de 24 píxeles CSS para
  tocar en el móvil, donde el juego va a escala ~1). Nombre a la izquierda; coste o cantidad a la
  derecha (`3 PM`, `x2`). Las listas tienen como mucho 6 filas (5 habilidades + «Volver»; 3
  enemigos + «Volver»), así que caben sin desplazamiento.
- **Columna derecha:** el nombre de la opción elegida en dorado, un filete y debajo su
  descripción en varias líneas (los textos de `ayuda` que ya existen, partidos al nuevo ancho).
- **Sin menú** (mientras se animan los turnos): el panel enseña el registro (las últimas
  acciones) en lugar de la lista.
- **La escena sube** para dejar sitio: los enemigos y la heroína con su ficha entre la barra de
  turnos (y 26) y el panel (y 200). Un jefe alto sube hasta ~42 px sobre sus pies y su nombre va
  encima: hay que comprobarlo con el golem, el Rey sin Charca y el dragón.

## Estilo (del boceto 1)

| Elemento | Valor |
| --- | --- |
| Fondo del panel | degradado de `rgba(14,16,30,.93)` a `rgba(6,8,16,.95)` |
| Filete exterior / interior | `#c9a45a` 1 px / `#6b5428` 1 px, 2 px por dentro |
| Rombos de las esquinas | `#e6c77e`, 6 px |
| Opción elegida | degradado dorado `rgba(230,199,126,.45)` → transparente; rombo `#ffe6a0` de cursor |
| Coste en PM | `#9ec0ff` |
| Opción apagada | `#8e8e9a` (contraste ≥ 4,5:1 sobre el fondo) |
| Título y filete de la derecha | `#e6c77e` |
| Texto de la descripción | `#efe9da` |

Todo pixelado (sin suavizado), con la fuente que ya usa el juego.

## Cómo se maneja

- **Teclado:** como ahora. Arriba y abajo recorren la lista, Enter confirma, Escape vuelve.
- **Toque:** en habilidades, objetos y elección de enemigo, el primer toque elige la opción (y la
  derecha dice qué hace) y el segundo la usa. En el menú principal y en «Volver», un solo toque.
  (Decisión de Pedro; el reparto entre uno y dos toques es propuesta de Claude, sin objeción.)
- **El botón «i» desaparece:** la descripción está siempre a la vista. El ajuste `info` deja de
  usarse en el combate.

## Restricciones

- Solo `src/render/` dibuja y `src/escenas/combate.ts` decide; `core/` no cambia.
- Ningún número de diseño del juego en el código (los de la disposición y los colores son de
  dibujo, como los que ya hay en `render/combate.ts`).
- Cero asignaciones por fotograma (los textos partidos se guardan, como `lineasBoton`).
- `rectOpcion`, `opcionTocada` y `dibujarMenu` los usan otras escenas: sus botones en fila siguen
  igual para ellas. La rejilla y `enRejilla` del 2026-10-26 eran solo para el combate: se quitan
  si nadie más las usa.

## Queda a criterio de quien lo construya

- Las posiciones exactas de enemigos, heroína y ficha dentro del hueco que queda.
- Cómo se dibujan el degradado y los rombos en el canvas.
- El texto de la pestaña de cada menú.

## Cómo se comprueba

- Tests que haya de la escena, y `npm test`, `npm run build`, `npm run lint`.
- Capturas en Edge sin ventana: menú principal, habilidades con 5 (truco temporal que se quita),
  objetos, elección de enemigo con 3, y el golem, el Rey sin Charca y el dragón para ver que nada
  tapa sus nombres.
- Pedro lo prueba en el móvil.
