# Menús nuevos: combate e inventario (diseño)

Fecha: 2026-10-26. Elegido por Pedro con bocetos en `docs/superpowers/mockups/`:

| Boceto | Elegido |
| --- | --- |
| `2026-10-26-menu-combate.html` (disposición del combate) | **B**: panel de abajo en dos columnas. La **A** (lista junto a quien actúa) queda como idea |
| `2026-10-26-menu-estetica.html` (estilo) | **1**: Octopath, doble filete con rombos en las esquinas |
| `2026-10-26-menu-inventario.html` (inventario) | **B**: lista a la izquierda, lo elegido a la derecha |
| `2026-10-26-menu-tono.html` (tono) | **2**: lavanda de Nenúfar, para los dos menús |

## Por qué

Con la quinta habilidad (la de recompensa) los botones del combate no cabían. El arreglo
provisional del 2026-10-26 (rejilla de 3 columnas y la ayuda «i» bajo la barra de turnos) tapa el
nombre de los jefes altos (captura de Pedro con el golem), y en el inventario la lista de
habilidades se salía del panel. Pedro quiere además unos menús más modernos, al estilo Octopath
pero con los colores de Nenúfar.

## Objetivos

- Combate: un panel abajo, de lado a lado, con la lista a la izquierda y qué hace lo elegido a
  la derecha. Nada tapa a los enemigos ni a la heroína, sea cual sea el jefe.
- Inventario: una lista a la izquierda con todo (secciones y acciones) y la sección elegida a la
  derecha, con sitio de sobra para las 5 habilidades.
- El mismo aspecto en los dos: estilo Octopath (doble filete, rombos, brillo y rombo de cursor)
  en lavanda.
- Se juega igual de bien con teclado que con el dedo.

## No objetivos

- Rehacer el resto de pantallas (portada, selección, nombre, dificultad, equipo, puntos, mensajes
  de historia). Pueden adoptar el estilo más adelante; ahora siguen como están.
- Cambiar la lógica del combate (`core/`) o el equilibrado.

## Lo que lo estropearía

- Que el panel o la ayuda vuelvan a tapar a un jefe alto (golem, Rey sin Charca, dragón).
- Filas demasiado pequeñas para el dedo, o que un toque mal dado gaste PM u objetos.
- Perder lo que ya funciona: lector de pantalla (`anunciar`), movimiento reducido, contraste ≥
  4,5:1, controles HTML de Ajustes, «¿Seguro?» al salir.

## Paleta común (lavanda de Nenúfar)

| Elemento | Valor |
| --- | --- |
| Fondo de los paneles | degradado de `rgba(18,14,32,.93)` a `rgba(9,7,18,.95)` |
| Filete exterior / interior | `#9b7fd6` 1 px / `#4a3a75` 1 px, 2 px por dentro |
| Rombos de las esquinas y títulos | `#c9b6ff` (rombos de 6 px) |
| Opción elegida | degradado `rgba(180,140,255,.42)` → transparente; texto `#f4eeff`; rombo de cursor `#e4d8ff` |
| Coste en PM, bonos de equipo | `#9ec0ff` |
| Opción apagada | `#8e8e9a` |
| Texto normal | `#efe9da` |
| Barras | PV rojo y PM azul como ahora; **PX verde nenúfar `#7fc65e`** (antes morada: se confundía con el lavanda; decisión de Pedro) |

Todo pixelado (sin suavizado), con la fuente que ya usa el juego. Los colores de dibujo viven en
`src/render/` como los de ahora; si se comparten entre combate e inventario, en un único sitio.

## Combate

**Disposición (píxeles del juego, 480×352).**

- Panel: x 8, y 200, 464 × 146. Encima, a la izquierda, una pestaña con el nombre del menú
  abierto («Acción», «Habilidad», «Objeto», «Objetivo»).
- Columna izquierda: 210 de ancho, filas de **24** (el mínimo de 24 px CSS para tocar en el
  móvil, donde el juego va a escala ~1). Nombre a la izquierda; coste o cantidad a la derecha
  (`3 PM`, `x2`). Como mucho 6 filas (5 habilidades + «Volver»; 3 enemigos + «Volver»): caben sin
  desplazamiento.
- Columna derecha: el nombre de lo elegido en lavanda claro, un filete y su descripción en varias
  líneas (los textos de `ayuda` que ya existen, partidos al nuevo ancho).
- Sin menú (mientras se animan los turnos): el panel enseña el registro (las últimas acciones).
- La escena sube: enemigos, heroína y su ficha entre la barra de turnos (y 26) y el panel (y 200).
  Un jefe alto sube hasta ~42 px sobre sus pies con su nombre encima: comprobar golem, Rey sin
  Charca y dragón.

**Manejo.**

- Teclado como ahora: arriba y abajo recorren la lista, Enter confirma, Escape vuelve.
- Toque: en habilidades, objetos y enemigo, el primer toque elige (y la derecha dice qué hace) y
  el segundo usa. En el menú principal y en «Volver», un solo toque. (Dos toques: decisión de
  Pedro; el reparto, propuesta de Claude sin objeción.)
- El botón «i» desaparece: la descripción está siempre a la vista. El ajuste `info` deja de usarse
  en el combate.
- La rejilla de 3 columnas y `enRejilla` (2026-10-26) eran solo para el combate: se quitan si
  nadie más las usa.

## Inventario (pausa)

**Disposición.**

- Izquierda: panel x 12, y 12, 128 × 328 con la lista: Heroína, Objetos, Equipo, Mejorar, Ajustes;
  un hueco; Seguir y Salir abajo. Filas de 28. «Mejorar» apagada si no hay puntos, con los puntos
  libres a la derecha cuando los hay. «Salir» pide «¿Seguro?» como ahora.
- Derecha: panel x 150, y 12, 318 × 328 con la sección elegida:
  - **Heroína:** retrato (a tamaño triple como ahora) con nombre, nivel y barras PV, PM y PX al
    lado; debajo, en dos columnas, Estadísticas y Equipo a un lado y Habilidades al otro.
  - **Objetos:** la lista de consumibles con su cantidad y, para el elegido, qué hace; usar uno
    sigue la regla de dos toques. Lo que ya hace la pestaña Objetos de ahora.
  - **Ajustes:** los controles HTML de ahora (sonido, calidad, música, efectos), colocados dentro
    de este panel (sus `RECT_*` cambian).
- **Equipo** y **Mejorar** abren sus pantallas de ahora, como los botones actuales.

**Manejo.**

- Teclado: arriba y abajo en la lista de la izquierda; cambiar de elemento cambia la sección de la
  derecha al momento. En Objetos y Ajustes, Enter (o derecha) entra en la sección y Escape (o
  izquierda) vuelve a la lista. Escape en la lista es Seguir, como ahora.
- Toque: un toque en una sección la abre; en Seguir, Equipo y Mejorar, un toque basta; en Objetos,
  dos toques para usar.

## Restricciones

- Solo `src/render/` dibuja; las escenas deciden; `core/` no cambia.
- Cero asignaciones por fotograma (textos partidos guardados, como `lineasBoton`).
- `rectOpcion`, `opcionTocada` y `dibujarMenu` los usan otras escenas (dificultad, equipo, puntos,
  nombre, extras): para ellas, sus botones siguen igual.
- Accesibilidad: lo que se anuncia hoy con `anunciar` se sigue anunciando (sección, opción elegida,
  qué hace); el cursor no parpadea con movimiento reducido.

## Queda a criterio de quien lo construya

- Posiciones exactas dentro de los huecos, y cómo dibujar el degradado y los rombos en el canvas.
- El texto de la pestaña de cada menú del combate.
- Si el combate y el inventario comparten una función de panel (probable: mismo estilo).

## Cómo se comprueba

- `npm test`, `npm run build`, `npm run lint`.
- Capturas en Edge sin ventana: combate (principal, habilidades con 5 con un truco temporal que se
  quita, objetos, enemigo con 3) y contra golem, Rey sin Charca y dragón; inventario en Heroína
  (5 habilidades), Objetos y Ajustes (controles HTML en su sitio).
- Pedro lo prueba en el móvil.
