# Nenúfar

Dungeon crawler 2D para navegador y móvil: exploras zonas de salas en tiempo real y, al tocar un monstruo, luchas en un combate por turnos estilo JRPG. Al empezar eliges heroína (una **rana ronin** de cuerpo a cuerpo o una **rana maga** de fuego morado) y dificultad (Fácil, Normal o Difícil). Tres zonas (Bosque, Ruinas y Cripta), un jefe por zona y un jefe final.

### ▶ [Jugar en el navegador](https://pedromiras.github.io/nenufar/)

| Elige heroína | Explora | Lucha |
| --- | --- | --- |
| ![Elección de heroína](docs/capturas/seleccion.png) | ![Sala del Bosque con monstruos](docs/capturas/mapa.png) | ![Combate: la maga lanza fuego morado a un limo](docs/capturas/combate.png) |

## Cómo se juega

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Moverse y elegir | Flechas o WASD | Joystick (arrastra en cualquier punto) |
| Aceptar | Enter, Espacio o Z | Tocar la opción |
| Inventario (pausa) y volver | Escape (X también vuelve) | Botón de la mochila |
| Qué hace cada opción del combate | I | Botón i (después, un toque elige y otro usa) |

Cada zona se genera al entrar (`?semilla=N` en la URL repite una partida). Los monstruos patrullan y te persiguen; si los pillas por la espalda, atacas primero. En combate, fíjate en el golpe cargado que anuncian: es el momento de Defender. Sube de nivel, encuentra equipo en el botín y los cofres, y bebe de la fuente una vez por zona.

## Qué tiene de interesante por dentro

- **Sin motor:** TypeScript `strict` y Canvas 2D a mano, bucle a 60 Hz fijos con dibujado interpolado y escalado de píxel entero.
- **Lógica pura y testeada:** `src/core/` no toca el navegador. El combate es una máquina de estados que emite eventos y la escena solo los anima. Vitest cubre generación de zonas, combate, IA, jefes, objetos y progresión.
- **Datos, no números en el código:** estadísticas, habilidades, monstruos, zonas, botín, música y efectos de sonido viven en `src/data/*.json`.
- **Equilibrado medido:** un test juega 300 partidas enteras con cada heroína en cada dificultad y exige que lleguen al final el 85-90 % en Fácil, el 70-75 % en Normal y el 50-55 % en Difícil, sin más de 5 puntos entre ellas ([tests/equilibrado.test.ts](tests/equilibrado.test.ts)).
- **Todo el arte generado por script:** heroínas, monstruos, efectos y tilesets salen de scripts deterministas en Python ([tools/generadores/](tools/generadores/)).
- **Sonido sintetizado:** música por zona y efectos con Web Audio a partir de notas en JSON; ningún archivo de audio.
- **Accesible:** se juega entero con teclado; lo que pasa en pantalla se lee en una región `aria-live` para lectores de pantalla; respeta `prefers-reduced-motion`.
- **Ligero:** unos 300 KB de descarga en total.

📄 **Documento de desarrollo:** https://claude.ai/code/artifact/a6ea0dd0-438d-4190-8647-06fd62dc8754

## Estado

- [x] Diseño de juego cerrado (ver documento)
- [x] Arte: heroínas, monstruos, efectos, tilesets de las tres zonas, objetos comunes, autotiles y plantillas de sala
- [x] Hito 1: base, sala y movimiento
- [x] Hito 2: zona generada
- [x] Hito 3: combate prototipo
- [x] Hito 4: contenido y progresión
- [x] Hito 5: objetos y pantallas
- [x] Hito 6: arte de combate y sonido
- [ ] Hito 7: equilibrado, pulido y publicación

## Desarrollo

```bash
npm install
npm run dev     # servidor de desarrollo
npm test        # tests (Vitest)
npm run lint    # ESLint y Prettier
npm run build   # tipos y build de producción en dist/
```

## Estructura

```text
nenufar/
├── src/
│   ├── core/       # lógica pura: zona, salas, movimiento, combate, IA, progresión, música
│   ├── data/       # JSON de diseño: héroes, monstruos, zonas, objetos, combate, sonido, salas
│   ├── escenas/    # título, selección, mapa, combate, pausa, equipo y mensajes (pila de escenas)
│   ├── input/      # teclado, joystick y toque como fuentes de acciones abstractas
│   └── render/     # canvas, sprites, HUD, sonido, accesibilidad y almacenamiento
├── public/assets/
│   ├── sprites/    # heroínas, monstruos, efectos y proyectil, cada hoja con su JSON
│   └── tilesets/   # bosque, ruinas, cripta, comunes y sus autotiles, con JSON
├── tests/          # Vitest, incluido el simulador de equilibrado
├── docs/           # capturas y vistas previas del arte
└── tools/generadores/  # scripts en Python que generan todo el arte
```

## Formato de los assets

**Sprites de personaje** (`rana_ronin.json`, `rana_maga.json`): cuadros de 32×32, una fila por dirección (`down`, `left`, `right`, `up`) y animaciones por columnas (`idle`, `walk`, `golpe`, `derrota` y el ataque: `atacar` en la ronin, `cast` en la maga). El ancla está en los pies, en (16, 30). En la maga, `castReleaseFrame` indica el fotograma en el que debe salir la bola de fuego.

**Monstruos** (`monstruos/<clave>.json`): el mismo formato, de 32×32 (48×48 los jefes grandes), con `idle`, `walk`, `atacar` y `golpe`; el ancla, en los pies. **Efectos y proyectil** (`efectos.json`, `fuego_morado.json`): también el mismo formato, con una sola fila para todas las direcciones; el fuego mira a la derecha.

**Tilesets** (`<zona>.json`): por cada tile, `name`, `index`, `layer` (`suelo`, `muro`, `objeto` o `dosel`), `solid`, `weight` en los suelos y `frames`/`fps` en los animados.
- Los objetos de dos tiles de alto se parten en `_sup` (dosel, no sólido) e `_inf` (sólido) y se ordenan por la Y de su base junto con los personajes.
- Las variantes `_a`, `_b`, `_c` se eligen al azar para evitar repeticiones.

**Autotiles** (`<zona>_autotiles.json`): 16 variantes por tipo según una máscara de vecinos `N=1, E=2, S=4, O=8`. Bosque: `camino` y `agua`. Ruinas: `calzada`, `charco` y `hierba`. Cripta: `alfombra` y `fosa`.

**Plantillas de sala** (`src/data/salas/plantillas_<zona>.json`): `tamano`, `leyenda` (símbolo → tile u objeto), `autotiles` (símbolo → tipo de autotile de la zona) y la lista de `plantillas`, cada una con `id`, `tipo` y `mapa` (11 líneas de 15 caracteres). Diseñar una sala nueva es añadir un mapa.

## Regenerar el arte

```bash
pip install -r tools/requirements.txt
python tools/generadores/generar_todo.py
```

Las semillas son fijas: sin cambios en los scripts, el resultado es idéntico píxel a píxel. Para cambiar colores o formas, edita las paletas al principio de cada script (`personajes/rana_ronin.py`, `entorno/bosque.py`…) y vuelve a ejecutarlo.

## Créditos

Ver [CREDITS.md](CREDITS.md).
