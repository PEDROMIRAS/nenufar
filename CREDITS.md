# Créditos

## Arte

El arte del juego sale de los scripts en Python de `tools/generadores/`, que son deterministas: con los mismos scripts, el resultado es idéntico píxel a píxel.

- **Dibujado por los scripts:** las dos heroínas y sus piezas de equipo, los efectos, el proyectil, los tilesets, los autotiles, los objetos comunes y algunos monstruos (el murciélago, el dragón negro, el Sacerdote de la luna falsa y el cofre trampa) y el ermitaño.
- **Sacado de imágenes de referencia:** casi todos los monstruos y jefes, y las texturas de la fuente de descanso. Los scripts reducen cada imagen, le quitan el fondo, la repintan con la paleta del juego y la animan. Las imágenes son originales del autor del proyecto y están en el repositorio, en `docs/superpowers/mockups/referencias-monstruos/` y `docs/superpowers/mockups/cauce-seco-referencias/`.
- **Modelos 3D** (árboles, rocas, columnas, cofres, hoguera, portal, fuente, altar…): se construyen en código con Three.js en `src/render/mundo/`, con texturas sacadas de los colores del propio arte.

## Sonido

La música y los efectos se sintetizan en el navegador con Web Audio a partir de `src/data/sonido.json`; no hay archivos de audio.

## Assets de terceros

El proyecto no usa assets de terceros. Si en el futuro se añade alguno (música, sonidos, fuentes), se anotará aquí con su autor, enlace y licencia. Solo se aceptan licencias CC0, CC-BY o CC-BY-SA.

| Asset | Autor | Licencia | Enlace |
| --- | --- | --- | --- |
| — | — | — | — |
