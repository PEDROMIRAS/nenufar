# Nenúfar

Dungeon crawler 2D para navegador con combate por turnos estilo JRPG. Exploración en tiempo real por salas; al tocar un monstruo se abre un combate por turnos en una pantalla aparte. Dos heroínas elegibles al empezar: rana ronin (cuerpo a cuerpo) y rana maga (fuego morado a distancia). Tres zonas (Bosque, Ruinas, Cripta), un jefe por zona y un jefe final.

Proyecto de portafolio de Pedro. Idioma del código, comentarios, commits y documentación: **español**.

Documento de desarrollo (fuente de verdad del diseño): https://claude.ai/code/artifact/a6ea0dd0-438d-4190-8647-06fd62dc8754
Si el diseño y este archivo discrepan, manda el documento; avisa de la discrepancia.

## Estado

- Diseño y arte cerrados.
- **Siguiente: hito 1** (base, sala y movimiento). Hecho cuando la heroína se mueve fluida en escritorio y en un móvil real sin engancharse en esquinas.
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

- `public/assets/sprites/`: `rana_ronin`, `rana_maga` (32×32; filas `down,left,right,up`; animaciones `idle`, `walk` y `cast` en la maga; ancla en los pies (16,30); `castReleaseFrame` marca cuándo sale el proyectil) y `fuego_morado` (16×16, mirando a la derecha).
- `public/assets/tilesets/<zona>.json`: todos los tiles tienen `name`, `index`, `layer` (`suelo|muro|objeto|dosel`) y `solid`. Los campos opcionales solo aparecen donde aplican: `weight` solo en suelos (sorteo ponderado entre los suelos de la zona para el símbolo `.`); `frames`/`fps` solo en tiles animados (fuente, portal, hoguera y candelabro). El resto de variantes `_a/_b/_c` (muros) se eligen con la misma probabilidad. En los tipos de TypeScript, `weight`, `frames` y `fps` deben ser opcionales. Los objetos altos se parten en `_sup` (dosel) e `_inf` (sólido) y se ordenan por la Y de su base junto con los personajes.
- `public/assets/tilesets/comunes.json`: cofres, fuente, portal y hoguera, compartidos por todas las zonas. **Se carga siempre junto al tileset de la zona**: las plantillas los usan (`X`, `F`, `>`, `H`) y no existen en los tilesets de zona.
- `public/assets/tilesets/<zona>_autotiles.json`: 16 variantes por tipo, máscara `N=1, E=2, S=4, O=8`.
- `src/data/salas/plantillas_<zona>.json`: mapas ASCII de 15×11 con su `leyenda` y `autotiles`. Para dibujar una sala igual que las vistas previas, ver `tools/generadores/entorno/plantilla.py` (orden de capas, sombras de muros hacia abajo y la derecha, halos de luz).
- Para cambiar arte: editar los scripts de `tools/generadores/` y ejecutar `python tools/generadores/generar_todo.py` (requiere `pip install -r tools/requirements.txt`). Es determinista.

## Comandos

Se definen en el hito 1 (`npm run dev`, `npm run build`, `npm test`, `npm run lint`). Actualiza esta sección al crearlos.

## Forma de trabajar

- Hitos pequeños y jugables; cada hito termina publicado en GitHub Pages.
- Ideas fuera del alcance de la versión 1 (lista en el documento) se apuntan para la versión 2, no se implementan.
- Commits pequeños y descriptivos en español.
