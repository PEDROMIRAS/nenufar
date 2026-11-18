# Aviso de que se juega con mando: diseño corto

Fecha: 2026-11-18. Sigue al hito del mando de Xbox (`2026-11-17-mando-design.md`), ya publicado.

## Por qué

Pedro: quien llega desde el portafolio no sabe que Nenúfar se juega con mando ni, si lo enchufa, que el juego
lo ha visto. Quiere **los dos avisos**, pensados para esa persona: uno fijo antes de usarlo y uno al usarlo.

## Objetivos

1. En la portada, una línea fija bajo el subtítulo: «Juega con teclado, dedo o mando».
2. Al detectar un mando, un cartel «Mando conectado» abajo, unos 2,5 s, en cualquier pantalla.

## No objetivos

- Iconos o dibujos de mando; avisar al desconectar.
- Cambiar los textos por dispositivo del hito anterior.

## Anti-objetivos

- Que la línea tape el logo o los botones, o choque con algo en el móvil de pie.
- Un cartel que se repita sin parar o que bloquee la entrada.

## Enfoques

- **A. Línea bajo el subtítulo de la portada (elegido por Pedro):** se ve nada más entrar, que es lo que
  necesita quien llega del portafolio. Pide algo más de alto en la banda oscura de arriba.
- B. Segunda línea «y mando» en el botón Controles: no mueve nada, pero se pasa por alto.
- El cartel tiene una sola forma sensata: dibujarlo encima de todo desde el bucle principal, porque el cartel
  de avisos que ya existe (`dibujarAviso` del HUD) solo se usa en el mapa.

## Diseño

- **Línea fija** (`escenas/titulo.ts`): «Juega con teclado, dedo o mando», centrada bajo «Un dungeon crawler
  de ranas», con la letra pequeña de los récords (`FUENTE`) y color `PALETA.claro` (*mi elección*). En
  horizontal, la banda oscura de arriba crece de 104 a ~112 px para contenerla (*mi elección*); en vertical
  los botones están abajo y arriba sobra sitio. El texto es el mismo con cualquier dispositivo.
- **Cartel «Mando conectado»:** `input/mando.ts` escucha `gamepadconnected` (el navegador lo lanza cuando la
  página ve el mando, tras el primer botón pulsado) y lo apunta; sale otra vez si se desconecta y se vuelve
  a conectar (*mi elección*). Se dibuja en `main.ts` después de la escena, en la interfaz que toque, abajo y
  centrado, con el estilo de `dibujarAviso` (caja lavanda); dura `aviso.segundos` (2,5) con fundido de
  `aviso.fundido` (0,3 s), números en la sección `mando` de `controles.json`. Con «menos movimiento», sin
  fundido. No toca la entrada. Lo anuncia también el lector de pantalla (`anunciar`).
- Lógica pura del tiempo del cartel (opacidad según los segundos que lleva) en `src/core/`, con test.

## Restricciones

`src/core/` sin navegador; números en `src/data/`; cero asignaciones por fotograma; español.

## Cómo se comprueba

Test de la opacidad del cartel; capturas de la portada en 1000×640 y 390×844; el cartel se fuerza con un
atajo de desarrollo (`?mando` lo enseña al empezar) porque en este Mac no hay mando. Pedro lo prueba con el
suyo.

## Lo que queda al constructor

La posición exacta de la línea y del cartel dentro de las bandas, y cómo se pasa el aviso del input al
dibujo sin acoplar `input/` y `render/` más de lo necesario.
