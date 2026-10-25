# Nenúfar

Dungeon crawler 2D para navegador con combate por turnos estilo JRPG. Exploración en tiempo real por salas; al tocar un monstruo se abre un combate por turnos en una pantalla aparte. Dos heroínas elegibles al empezar: rana ronin (cuerpo a cuerpo) y rana maga (fuego morado a distancia). Tres zonas (Bosque, Ruinas, Cripta), un jefe por zona y un jefe final.

Proyecto de portafolio de Pedro. Idioma del código, comentarios, commits y documentación: **español**.

Documento de desarrollo (fuente de verdad del diseño): https://claude.ai/code/artifact/a6ea0dd0-438d-4190-8647-06fd62dc8754
Si el diseño y este archivo discrepan, manda el documento; avisa de la discrepancia.

## Estado

- Diseño y arte cerrados.
- Hitos 1 a 6 hechos y publicados en https://pedromiras.github.io/nenufar/ (Pedro los probó en el móvil). Del 6: sprites de monstruos y efectos generados por script, animaciones de combate, la sala como fondo del combate y sonido sintetizado con Web Audio desde `src/data/sonido.json` (silencio en la pausa, guardado como ajuste).
- **Hito 7 hecho y comprobado por Pedro (2026-10-24).** Incluye lo que pidieron los probadores (tope al golpe cargado, transformaciones de jefe que no se saltan, pantalla de controles, inventario en pestañas, fuente y jefe en el minimapa, ayuda en el combate). El enlace desde el portafolio queda fuera del hito, para la versión final. La variedad entre partidas va a la versión 2.
- **Prototipo HD-2D** (estilo Octopath, Three.js) en la rama `prototipo-hd2d`, sin fusionar: a Pedro le gusta y se conservan sus modelos. Cómo está hecho, en la pestaña «HD-2D: prototipo» del documento; los pasos para llevarlo al juego, en «Ideas para la versión 2». Se hará después de las salas violetas.
- **Versión 2, primer bloque: salas violetas** (jefes extra opcionales, cofre trampa y recompensas especiales), en la rama `salas-violetas`. Diseño aprobado en `docs/superpowers/specs/2026-10-25-salas-violetas-design.md`; plan en `docs/superpowers/plans/2026-10-25-salas-violetas.md`. **Hecho (2026-10-25), sin fusionar con `main` ni publicar**; el arte lo aprobó Pedro. Resumen y equilibrado en la pestaña «Versión 2: salas violetas» del documento. Tras la primera partida de Pedro se reequilibró (ronin con más defensa y PM por nivel, jefe final y reina araña más duros): las dos heroínas quedan parejas contra el final salvo en Difícil, donde la maga lo gana bastante más.
- Los jefes violetas llevan además el multiplicador `violetas` de `dificultades.json`; su dureza la comprueba `tests/violetas.test.ts` (media de las dos heroínas: Fácil 75, Normal 60, Difícil 45, ±10). Los monstruos con `oculto: true` no cuentan en el bestiario ni en «Naturalista».
- Al entrar en una sala de combate con monstruos se cierran todas las puertas, también la de entrada. Tras elegir rana se elige dificultad (`src/data/dificultades.json`: multiplicadores de ataque y vida de los monstruos y de la recuperación tras ganar). Objetivo de partidas completas, comprobado por `tests/equilibrado.test.ts`: Fácil 85-95 %, Normal 65-75 %, Difícil 45-55 % (rangos de Pedro del 2026-10-25), con menos de 5 puntos entre heroínas. La ronin recupera 1 PM con cada ataque normal (`pmAlAtacar` en `heroes.json`).
- La "decisión interesante" del combate es el golpe cargado que el monstruo anuncia un turno antes (Limo, poder 3); defender solo si no se puede rematar antes es la mejor estrategia (simulado).
- Zonas en "ramas de 3" (8/11/14 salas): el inicio con 1 puerta y cada sala de paso con la de llegada + 3 nuevas. Decidido en el hito 2 y ya reflejado en el documento.
- Atajos provisionales marcados con `shortcut:` en el código; se quitan en el hito que indica cada uno.
- `?semilla=N` en la URL repite una partida; la semilla de cada zona sale en la consola.
- Hitos 2-7 en el documento. Hasta el hito 5 la lógica puede probarse con rectángulos, pero el arte ya existe y se puede usar desde el hito 1.

## Stack y decisiones fijas

- TypeScript `strict`, Canvas 2D nativo, **sin motor**. Vite. Vitest. ESLint + Prettier. GitHub Pages con GitHub Actions.
- Bucle con `requestAnimationFrame`, lógica a paso fijo de 60 Hz y dibujado interpolado.
- Resolución lógica 480×352 (sala de 15×11 tiles de 32 px), escalada al mayor múltiplo entero, `imageSmoothingEnabled = false`.
- Movimiento libre por píxeles en 8 direcciones; caja de colisión más pequeña que el sprite.
- Entrada por acciones abstractas (`MOVER`, `CONFIRMAR`, `CANCELAR`, `MENU`); teclado y táctil (joystick flotante) como fuentes intercambiables.
- PRNG con semilla (mulberry32) para todo lo aleatorio.
- `localStorage` solo para ajustes y récords.

## Reglas de arquitectura

- `src/core/` es lógica pura: **no importa nada del navegador** y se testea con Vitest.
- Solo `src/input/` y `src/render/` tocan el DOM o el canvas.
- Escenas con `enter()`, `update(dt, acciones)`, `draw(ctx, alpha)`, `exit()`, en una pila (el combate se apila sobre el mapa).
- Combate como máquina de estados que emite eventos (`daño`, `estado`, `muerte`); la escena solo los anima.
- **Ningún número de diseño en el código**: daño, probabilidades, velocidades y estadísticas salen de `src/data/*.json`.
- Lo que diferencia a las heroínas vive en `heroes.json`; nada de `if (heroina === 'maga')` en la lógica.
- Cero asignaciones de memoria dentro del bucle de juego.

## Assets (ya generados, no editar a mano)

- `public/assets/sprites/`: `rana_ronin`, `rana_maga` (32×32; filas `down,left,right,up`; animaciones `idle`, `walk`, `golpe`, `derrota` y el ataque que nombra `heroes.json` (`atacar` / `cast`); ancla en los pies (16,30); `castReleaseFrame` marca cuándo sale el proyectil), `monstruos/<clave>` (campo `sprite` de `monstruos.json`; `idle`, `walk`, `atacar`, `golpe`), `efectos` y `fuego_morado` (16×16, mirando a la derecha). Todas las hojas comparten el formato `SpriteJson`.
- `public/assets/sprites/piezas/<clave>.png`: capas de las piezas especiales (campo `capa` en `objetos.json`), con la misma rejilla que la hoja de su heroína. Los generadores de las ranas las sacan comparando la hoja con la pieza y sin ella (`guardar_capas` en `combate_anim.py`); una pieza no puede borrar píxeles de la rana, solo cubrirlos. El juego las pinta encima de la hoja recoloreada al cambiar de equipo (`vestirHoja` en `render/tinte.ts`).
- `public/assets/tilesets/<zona>.json`: todos los tiles tienen `name`, `index`, `layer` (`suelo|muro|objeto|dosel`) y `solid`. Los campos opcionales solo aparecen donde aplican: `weight` solo en suelos (sorteo ponderado entre los suelos de la zona para el símbolo `.`); `frames`/`fps` solo en tiles animados (fuente, portal, hoguera y candelabro). `caja` solo en objetos sólidos: la base que choca `[x0, y0, x1, y1)` en píxeles del tile (la calcula `entorno/build.py`); los muros chocan con la casilla entera. El resto de variantes `_a/_b/_c` (muros) se eligen con la misma probabilidad. En los tipos de TypeScript, `weight`, `frames`, `fps` y `caja` deben ser opcionales. Los objetos altos se parten en `_sup` (dosel) e `_inf` (sólido) y se ordenan por la Y de su base junto con los personajes.
- `public/assets/tilesets/comunes.json`: cofres, fuente, portal y hoguera, compartidos por todas las zonas. **Se carga siempre junto al tileset de la zona**: las plantillas los usan (`X`, `F`, `>`, `H`) y no existen en los tilesets de zona.
- `public/assets/tilesets/<zona>_autotiles.json`: 16 variantes por tipo, máscara `N=1, E=2, S=4, O=8`.
- `src/data/salas/plantillas_<zona>.json`: mapas ASCII de 15×11 con su `leyenda` y `autotiles`. Para dibujar una sala igual que las vistas previas, ver `tools/generadores/entorno/plantilla.py` (orden de capas, sombras de muros hacia abajo y la derecha, halos de luz).
- Monstruos: la mayoría salen de `tools/generadores/monstruos/humanoides.py` y similares; `espectro`, `golem` y `rey_sin_charca` tienen módulo propio (registrado en `PROPIOS` de `generar.py`) con `fotograma(direccion, anim, i)`. Los jefes van en 48 de alto (el Rey, 64×48) y no suben más de ~42 px sobre los pies, para no tapar su nombre en combate.
- Para cambiar arte: editar los scripts de `tools/generadores/` y ejecutar `python tools/generadores/generar_todo.py` (requiere `pip install -r tools/requirements.txt`). Es determinista.

## Comandos

- `npm run dev`: servidor de desarrollo de Vite.
- `npm run build`: comprueba tipos (`tsc`) y genera `dist/`.
- `npm test`: tests de Vitest (una pasada).
- `npm run lint`: ESLint y comprobación de Prettier (`npx prettier --write .` para formatear).

## Forma de trabajar

- Hitos pequeños y jugables; cada hito termina publicado en GitHub Pages.
- Ideas fuera del alcance de la versión 1 (lista en el documento) se apuntan para la versión 2, no se implementan.
- Commits pequeños y descriptivos en español.
