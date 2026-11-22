# Auditoría de deuda técnica: Nenúfar

**Fecha:** 2026-11-22 · **Salud:** 7/10

## Resumen

El código está sano donde más importa: `src/core/` es lógica pura con test en todos sus módulos (801 tests, todos verdes), no hay ni un `TODO`, `FIXME` ni `HACK` en `src/` ni en `tests/`, los 12 atajos `shortcut:` son de desarrollo y llevan escrito su límite, y las dependencias van casi al día. La deuda está concentrada en dos sitios: **el equilibrado** (se rehace a mano cada vez y queda en el filo de sus tests) y **tres archivos de escena y dibujo** que reciben casi todos los cambios y apenas tienen tests propios.

## Los 3 grandes (interés alto)

1. **Equilibrado en el filo y sin herramientas en el repo.** Cada cambio de habilidades, monstruos o dificultad obliga a rehacer el equilibrado, y las herramientas para hacerlo (búsqueda de parámetros, diagnóstico con 1200 partidas, medida del reto) se escriben de nuevo en archivos temporales cada vez: el reequilibrado de las tres habilidades llevó seis búsquedas y varias horas. Además, varias cifras quedan justo en el borde de sus tests (reto: ronin 60,2 % y peor día 35 %; ronin contra el caballero en Difícil 25,2 %; dos presagios a 8 de su tope), con un ruido de ±3 en 300 partidas: cualquier retoque las rompe. *Valor:* añadir contenido (un monstruo, una habilidad) sin perder un día en reequilibrar.
2. **`escenas/mapa.ts`, la clase que lo hace todo** (1210 líneas, 72 cambios en 60 días). Exploración, patrulla, cofres, fuente, altar, mercader, ermitaño, desafío con su cadena de guardados, pantalla de habilidades, HUD y minimapa en una sola clase. El orden de los guardados del desafío ha tenido dos fallos de pérdida de progreso; cada sala de evento nueva toca esta clase. *Valor:* salas de evento nuevas en la mitad de tiempo y sin miedo a romper el guardado.
3. **La interfaz del combate se prueba con capturas** (`escenas/combate.ts` 759 líneas y `render/combate.ts` 975, 128 cambios en 60 días entre los dos). La lógica pura (reparto, toque, mensajes) tiene tests, pero los flujos del menú (elegir habilidad, objetivo, volver, desplazar con el dedo) solo se ven en capturas, y las revisiones finales encuentran fallos de interfaz casi siempre. Ya existe el patrón para probarlo sin navegador (`tests/mapa_falso.ts`, `tests/habilidades_toque.test.ts`). *Valor:* menos fallos que solo aparecen en el móvil.

## Catálogo

| Deuda | Cuadrante | Interés | Dónde |
| --- | --- | --- | --- |
| Herramientas de equilibrado fuera del repo; márgenes en el filo | Prudente y deliberada | Alto | `tests/simulador.ts`, `tests/equilibrado.test.ts`, `violetas.test.ts`, `reto_equilibrado.test.ts`, `presagios_rango.test.ts` |
| Clase del mapa con demasiados trabajos | Prudente e inadvertida | Alto | `src/escenas/mapa.ts` |
| Flujos de la interfaz de combate sin tests | Prudente y deliberada | Alto | `src/escenas/combate.ts`, `src/render/combate.ts` |
| `main.ts` como punto caliente: arranque, flujos de partida, reto, recuperación y 5 atajos por URL juntos | Prudente e inadvertida | Medio | `src/main.ts` (470 líneas, 112 cambios en 60 días) |
| El mundo 3D en un solo archivo (zona, salas, actores, luces, polvo, signos, fondo del combate) | Prudente e inadvertida | Medio | `src/render/mundo/mundo.ts` (1216 líneas) |
| Dependencias: Three 0.187 y TypeScript 7 sin probar | Prudente y deliberada | Bajo | `package.json` |
| Firma del HUD limitada a PV y PM de 999 | Prudente y deliberada (documentada) | Bajo | `src/escenas/mapa.ts:899` |
| Atajos de desarrollo por URL repartidos (12 `shortcut:`) | Prudente y deliberada | Bajo | `src/main.ts`, `src/partida/eventos.ts` |

## Impacto en la velocidad

Las tres partidas grandes de hoy lo muestran: las tres habilidades necesitaron casi tanto tiempo de equilibrado como de código, y la revisión final encontró un fallo de interfaz (el dedo no llegaba a «Listo») que ningún test veía. Mientras el equilibrado se rehaga a mano, cada idea de contenido cuesta un día más; mientras el mapa lo haga todo, cada sala de evento arriesga el guardado.

## Qué hacer primero

1. **Herramientas de equilibrado en el repo** (2-3 h). Pasar a `tests/herramientas/` la búsqueda de parámetros (modifica los datos en memoria y puntúa contra los objetivos de los tests), el diagnóstico por zona con N partidas y la medida rápida del reto, como informes saltados (`test.skip`) con instrucciones; y un script `npm run equilibrio` que imprima la tabla. Después, una búsqueda con margen (apuntar a 2 puntos dentro de cada borde) para que los tests dejen de estar en el filo.
2. **Sacar las salas de evento de `escenas/mapa.ts`** (3-4 h; skill `code-simplification`). Un módulo `escenas/mapa/eventos.ts` con altar, mercader, ermitaño y desafío detrás de una interfaz pequeña (al acercarse, al acabar, qué guardar), con los tests del arnés `mapa_falso` que ya existen; el desafío y su cadena de guardados, con test propio.
3. **Tests de flujo del combate** (3 h; skill `test-driven-development`). Un arnés `combate_falso` como el del mapa y cinco flujos: elegir habilidad y objetivo, volver con Cancelar, desplazar la lista con el dedo, usar un objeto y huir.
4. **Partir `main.ts`** (2 h): `partida/inicio.ts` con empezar, reto y recuperar, y `atajos.ts` con todos los parámetros de desarrollo por URL en un sitio.
5. **Partir `render/mundo/mundo.ts`** (4 h, cuando toque cambiar el 3D): luces y actores a sus módulos.

Las dependencias (Three, TypeScript 7) pueden esperar a un hito propio: no bloquean nada.

---

Auditoría completa: Nenúfar · Salud: 7/10 · Deuda de interés alto: 3 · TODO/FIXME: 0 · Plan: sí · Listo para: sprint de refactorización

## Seguimiento

- 2026-11-22: punto 1 hecho (herramientas `npm run equilibrio*` y equilibrado con 2 puntos de margen salvo los presagios). Punto 2 hecho (`src/escenas/salasEvento.ts`, tests de caracterización en `tests/mapa_eventos.test.ts`; `mapa.ts` de 1210 a 1078 líneas). Punto 3 hecho (`tests/combate_flujos.test.ts`: seis flujos del menú de combate con teclado y dedo, con la escena de verdad).
