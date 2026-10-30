# La zona del Cauce Seco: tileset, plantillas, aspecto 3D y sonido (entrega 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que exista todo lo que hace falta para jugar en el Cauce Seco (arte de suelos, muros y objetos, autotiles, ocho plantillas de sala, aspecto en 3D y música), verificable en el navegador con un visor de desarrollo, **sin meter todavía la zona en `zonas.json`** (eso es la entrega 3d).

**Architecture:** Un módulo `cauce.py` genera el tileset como los de Cripta y Ruinas (con las utilidades de `piedra.py`); `zonas_auto.py` genera sus autotiles; `plantillas_salas.py` y `plantilla.py` generan las plantillas ASCII; `hd2d.json` y `modelos.ts` dan el aspecto 3D; `sonido.json` trae su música. Un parámetro de desarrollo `?portada=<id de plantilla>` enseña una sala de cualquier zona en la portada 3D.

**Tech Stack:** Python 3.12 en `.venv` (Pillow, numpy), TypeScript y Three.js 0.180, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-cauce-seco-design.md` (secciones «Aspecto de la zona», «Qué más toca» y «Cambios del 2026-10-30 (tarde)»). Referencias de arte: `docs/superpowers/mockups/cauce-seco-referencias/` (3 y 7 dan la paleta: negro, naranja de fuego, ladrillo oscuro).

## Global Constraints

- Windows: `npx vitest` y `npm` desde `C:\Users\pmira\Documents\GitHub\nenufar` (C mayúscula). Python: `.venv\Scripts\python.exe`; los scripts de `tools/generadores/entorno/` se ejecutan **desde su carpeta** (`os.chdir(HERE)` en `demo_final.py`). Para rutas de `/tmp` a Python usar `cygpath -m`. No editar con PowerShell 5.1.
- **La zona no se activa:** no se toca `src/data/zonas.json` ni `historia.json` ni los monstruos. `NombreZona` y `ORDEN` de `main.ts` salen de `zonas.json`, así que nada del juego normal debe nombrar `cauce`; solo el visor de desarrollo y los tests.
- Nombre de la zona: `cauce` (así se llaman los archivos: `cauce.png/.json`, `cauce_autotiles.png/.json`, `plantillas_cauce.json`, la clave de `hd2d.json` y de `sonido.json`).
- Las plantillas son de **15×11** como las demás (el juego las ensancha a 21×13 al construir la sala). Salidas siempre abiertas en `(7,0)`/`(7,1)`, `(7,10)`, `(0,5)` y `(14,5)`; cofres y portales fuera del camino de entrada; 8 plantillas: `cauce_combate_01..03`, `cauce_jefe_01`, `cauce_inicio_01`, `cauce_descanso_01`, `cauce_tesoro_01`, `cauce_violeta_01` (los mismos tipos que Cripta).
- Aspecto (Pedro): estructura de un santuario de la Orden con **muros de bloques de obsidiana** (negro con matiz violáceo), el **naranja como única luz**, y suelo de **lecho de río agrietado con guijarros blanqueados**; un **aro de fuego sobre cada puerta** (la luna falsa). Tiene que distinguirse de la Cripta (violeta, fría, luz difusa) y de las Ruinas (piedra beige y cálida). Sobrio y oscuro, nada infantil.
- Los números de diseño salen de JSON (`hd2d.json`, `sonido.json`), no del código. Código, comentarios y commits en español; commits pequeños con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Regenerar el entorno con `generar_todo.py` **reescribe todos los PNG y los JSON con CRLF**: generar solo lo del entorno con los scripts de `entorno/` y copiar a mano a `public/assets/tilesets/` y `src/data/salas/` los archivos de `cauce` (y restaurar con `git checkout` lo ajeno que cambie). Añadir `cauce` también a las listas de `generar_todo.py`.
- El arte lo aprueba Pedro: **no se fusiona sin su visto bueno**. Rama: `zona-cauce-seco`, desde `main`.

## Review Focus

- **Nombres de tile completos:** el tileset de `cauce` tiene todos los nombres que `construirSala` y el mapa necesitan (suelos con peso, `muro`, `muro_norte`, `puerta_norte_abierta/cerrada`, `barrera_h/v`) además de los objetos; lo comprueba el test de la Tarea 1 y de plantillas (Tarea 4).
- **Cada plantilla se puede recorrer:** salidas libres y conectadas, y las casillas de entrada libres (el test de plantillas ya lo comprueba para las demás zonas; debe pasar con `cauce`).
- **El autotile de la fosa (`lava`) existe con sus 16 variantes** y el nombre que pone `hd2d.json` en `hundido.autotile` (Tarea 3 y 5).
- **Objetos sin modelo 3D** se quedan como sprite de pie sin romper nada: solo `brasero` tiene modelo nuevo (Tarea 5).
- **Nada del juego normal nombra `cauce`:** una partida normal (sin `?portada=`) carga igual que antes; `npm run build` y `npm test` pasan (Tarea 6).

---

### Task 1: El tileset base (suelos, muros y puertas)

**Files:**
- Create: `tools/generadores/entorno/cauce.py`, `tests/tileset_cauce.test.ts`
- Modify: `tools/generadores/entorno/demo_final.py` (registrar `cauce` en el bucle de zonas), `tools/generadores/generar_todo.py` (listas de copia)
- Create (generados): `public/assets/tilesets/cauce.png` y `cauce.json`, `docs/previews/cauce_x3.png`

**Interfaces:**
- Produces: `cauce.tiles()` con la misma forma que `cripta.tiles()` (lista de `(nombre, capa, sólido, [fotogramas], peso)`); el test `tests/tileset_cauce.test.ts` con la lista `NOMBRES_BASE`.

- [ ] **Step 1: Escribir el test que falla** `tests/tileset_cauce.test.ts` (con `import.meta.glob` sobre `../public/assets/tilesets/cauce.json`, sin `node:fs`): el JSON existe, tiene `tileSize` 32 y los tiles `suelo_liso_a`, `suelo_liso_b`, `suelo_grietas`, `suelo_guijarros`, `suelo_brasas` (capa `suelo`, con `weight`), `muro_norte_a`, `muro_norte_b`, `muro_norte_c`, `muro_a`, `muro_b`, `puerta_norte_abierta`, `puerta_norte_cerrada` (capa `muro`, las cerradas y los muros sólidos), `barrera_h`, `barrera_v` (capa `objeto`, sólidos). Ejecutar `npx vitest run tests/tileset_cauce.test.ts`. Expected: FAIL (no existe el JSON).
- [ ] **Step 2: Crear `cauce.py`** siguiendo `cripta.py`: `PAL` de obsidiana (`st` de 5 tonos entre `(10,8,14)` y `(92,82,104)` con matiz violáceo; `acc` naranja de `(140,48,16)` a `(255,186,64)`) y `GUIJARRO` (`(204,200,192)`, `(160,156,150)`). Suelos: `floor(seed, variante)` con `P.flagstones` de lecho (losas oscuras agrietadas) y las variantes `grietas` (más grietas), `guijarros` (tres o cuatro guijarros claros redondos con su sombra) y `brasas` (grietas con un hilo de brasa naranja). Muros: `P.brick_face` y `P.cap_blocks` con la paleta; `muro_norte_b` con una **hornacina con el aro de fuego** (anillo naranja de unos 10 px sobre el vacío) y `muro_norte_c` con una **veta de brasa** que baja entre los bloques. Puertas: `P.arch_door(PAL, ..., glow=PAL["acc"][1])` (abierta y cerrada) con un **aro de fuego sobre el dintel**. Barreras: `P.bars_prop()` (`barrera_v` con `True`). `tiles()` devuelve la lista con esos nombres y los pesos de los suelos (`liso_a` 35, `liso_b` 35, `grietas` 15, `guijarros` 10, `brasas` 5).
- [ ] **Step 3: Registrar `cauce` en `demo_final.py`** (importar el módulo y añadirlo a la tupla `(('bosque', bosque), ..., ('cauce', cauce))`) y en las listas de `generar_todo.py` (`for zona in ("bosque", "ruinas", "cripta", "cauce", "comunes")` para `*.png/.json/_x3.png`). Ejecutar `..\..\..\.venv\Scripts\python.exe demo_final.py` **desde `tools/generadores/entorno`**; copiar `out/cauce.png`, `out/cauce.json` a `public/assets/tilesets/` y `out/cauce_x3.png` a `docs/previews/`. Mirar `docs/previews/cauce_x3.png` con Read: debe verse obsidiana negra y violácea, con el naranja solo en brasas, el aro de fuego y las puertas; distinta de la Cripta.
- [ ] **Step 4: Ejecutar el test.** Expected: PASS.
- [ ] **Step 5: Commit** `git add tools public/assets/tilesets/cauce.* docs/previews/cauce_x3.png tests` y `git commit -m "Cauce Seco: tileset base (suelos de lecho, muros de obsidiana y puertas con la luna falsa)"`.

---

### Task 2: Los objetos del Cauce Seco

**Files:**
- Modify: `tools/generadores/entorno/cauce.py`, `tests/tileset_cauce.test.ts`
- Regenerate: `public/assets/tilesets/cauce.png` y `.json`, `docs/previews/cauce_x3.png`

**Interfaces:**
- Consumes: `cauce.tiles()` de la Tarea 1.
- Produces: los tiles de objeto `pilar_sup` (capa `dosel`, no sólido), `pilar_inf`, `roca`, `columna_rota`, `escombros` (capa `objeto`, sólidos, con `caja` calculada por `build.py`) y `brasero` (capa `objeto`, sólido, **2 fotogramas**, `frames: 2`, `fps: 4`).

- [ ] **Step 1: Ampliar el test que falla:** añadir esos nombres con sus capas, que `brasero` tenga `frames` 2 y que los sólidos de capa `objeto` tengan `caja`. Ejecutar. Expected: FAIL.
- [ ] **Step 2: Dibujar los objetos** en `cauce.py` con las utilidades de `cripta.py` y `ruinas.py` (`candelabra`, `column`, `ruin`...): `pilar` (columna de obsidiana con una grieta de brasa, partida en `pilar_sup` y `pilar_inf` con `split_tall`), `roca` y `escombros` (bloques de obsidiana facetados y astillas), `columna_rota` (fuste partido con el pedazo caído), y **`brasero`** (cuenco de hierro negro sobre tres patas con una llama de 3 a 5 px de alto que cambia entre los dos fotogramas, como `candelabra(frame)`). Sin colores chillones: la única luz saturada es el fuego.
- [ ] **Step 3: Regenerar** con `demo_final.py` (desde `entorno/`), copiar y mirar `docs/previews/cauce_x3.png` con Read. Expected: los objetos se leen a escala real y el brasero se distingue de un candelabro de la Cripta.
- [ ] **Step 4: Ejecutar el test.** Expected: PASS. **Step 5: Commit** `git commit -m "Cauce Seco: pilares, rocas, escombros, columna rota y brasero"`.

---

### Task 3: Autotiles del lecho y la lava

**Files:**
- Modify: `tools/generadores/entorno/zonas_auto.py` (`cauce_auto()` y su registro), `tests/tileset_cauce.test.ts`
- Create (generados): `public/assets/tilesets/cauce_autotiles.png` y `.json`

**Interfaces:**
- Consumes: la máscara de 4 bits de `autotile.py` y `generic(...)` de `zonas_auto.py`.
- Produces: dos autotiles de 16 variantes cada uno, con nombres `lecho` (camino: losas claras de río seco con guijarros) y `lava` (fosa de brasas: fondo rojo oscuro con un borde de roca negra y un brillo naranja que se aviva hacia el centro), y la asignación `{":": "lecho", "~": "lava"}` para las plantillas.

- [ ] **Step 1: Ampliar el test que falla:** `cauce_autotiles.json` existe y contiene `lecho_00..lecho_15` y `lava_00..lava_15` (misma convención de nombres que `cripta_autotiles.json`: leerlo para copiarla). Expected: FAIL.
- [ ] **Step 2: Escribir `cauce_auto()`** en `zonas_auto.py` siguiendo `ruinas_auto()` y `cripta_auto()`: `lecho` con `generic(...)` y un `paint` de losas de grano claro y guijarros; `lava` con un `paint` que usa la profundidad (`depth`) para ir de roca negra en el borde a naranja `(226,98,24)` y amarillo `(255,186,64)` en el centro, con puntos de brasa alternados. Registrarlo donde se registran `ruinas_auto` y `cripta_auto` (ver `demo_zonas.py`) y exportar con el mismo nombre de salida que las demás (`cauce_autotiles.png/.json` en `out/`).
- [ ] **Step 3: Ejecutar `demo_zonas.py`** (desde `entorno/`), copiar los dos archivos a `public/assets/tilesets/` y mirar con Read la vista previa de autotiles. Expected: la lava se lee como un pozo de brasas y el lecho como un camino de río seco.
- [ ] **Step 4: Ejecutar el test.** Expected: PASS. **Step 5: Commit** `git commit -m "Cauce Seco: autotiles del lecho y la lava"`.

---

### Task 4: Las ocho plantillas de sala

**Files:**
- Modify: `tools/generadores/entorno/plantilla.py` (`PROPS` con `B` → `brasero`), `tools/generadores/entorno/plantillas_salas.py` (zona `cauce`), `tools/generadores/entorno/demo_plantilla.py` (si registra zonas), `tools/generadores/generar_todo.py` (copia de `plantillas_cauce.json`), `tests/plantillas.test.ts`
- Create (generados): `src/data/salas/plantillas_cauce.json`, `docs/previews/plantilla_cauce_*.png`

**Interfaces:**
- Consumes: los tiles y autotiles de las Tareas 1-3.
- Produces: `plantillas_cauce.json` con `leyenda`, `autotiles` (`{":": "lecho", "~": "lava"}`) y las 8 plantillas con los ids de «Global Constraints».

- [ ] **Step 1: Añadir `cauce` al test que falla** (`tests/plantillas.test.ts`): importar `plantillas_cauce.json`, `cauce.json` y `cauce_autotiles.json`, sumarlos a `ZONAS` y `TILESETS` (con la misma forma que las demás). Ejecutar `npx vitest run tests/plantillas.test.ts`. Expected: FAIL (no existe `plantillas_cauce.json`).
- [ ] **Step 2: Diseñar las plantillas** en `plantillas_salas.py` para `cauce`, con la leyenda de `plantilla.py` y los objetos de la zona (`Y` pilar, `r` roca, `i` columna rota, `e` escombros, `B` brasero nuevo, `H` hoguera y `[F]` fuente de `comunes`, `X` cofre, `>` portal): `inicio` con un camino de lecho y dos braseros junto a la entrada; tres `combate` distintos (uno con un pozo de lava lateral, uno con un cauce de lecho que cruza la sala en diagonal, uno con pilares y escombros en dos mitades); `descanso` con la fuente (el único sitio con agua, a propósito) rodeada de braseros; `tesoro` con el cofre al fondo entre dos pilares; `jefe` con el portal al fondo y dos braseros grandes, y `violeta` con un círculo de braseros. Cumplir las reglas de «Global Constraints» (salidas, cofres y portales fuera del camino de entrada, centro despejado, borde de dos tiles al norte).
- [ ] **Step 3: Generar** con `demo_plantilla.py` (desde `entorno/`), copiar `plantillas_cauce.json` a `src/data/salas/` y las vistas previas `plantilla_cauce_*.png` a `docs/previews/`, y mirar dos o tres con Read: legibles, con el naranja como único acento y sin parecer la Cripta.
- [ ] **Step 4: Ejecutar `npx vitest run tests/plantillas.test.ts`.** Expected: PASS, incluidas las comprobaciones de salidas, conexión y entradas de las ocho plantillas de `cauce`. Si alguna falla, corregir el ASCII, no el test.
- [ ] **Step 5: Commit** `git commit -m "Cauce Seco: ocho plantillas de sala"`.

---

### Task 5: Aspecto 3D, luz del brasero y visor de desarrollo

**Files:**
- Modify: `src/data/hd2d.json` (zona `cauce` y luz `brasero`), `src/render/mundo/modelos.ts` (modelo de `brasero`), `src/main.ts` (parámetro `?portada=` de desarrollo y `PLANTILLAS` con `cauce`), `tests/hd2d_zonas.test.ts` (nuevo)

**Interfaces:**
- Consumes: el tileset, los autotiles y las plantillas de las Tareas 1-4; el tipo `ZonaHd2d` y la sección `luces` de `hd2d.json`.
- Produces: `HD2D.zonas.cauce` con las mismas claves que `HD2D.zonas.cripta`; `HD2D.luces.brasero` (color y parpadeo como `candelabro`, pero naranja); `crearModelo` con un caso `brasero`; y la URL `?portada=<id de plantilla>` (solo en desarrollo) que enseña esa sala en la portada 3D.

- [ ] **Step 1: Escribir el test que falla** `tests/hd2d_zonas.test.ts`: `hd2d.json` tiene `zonas.cauce` y las claves de primer nivel de `cauce` son las mismas que las de `cripta`; `zonas.cauce.hundido.autotile` es `"lava"`; `zonas.cauce.borde.tipo` es `"sillares"`; y `luces.brasero` existe con las mismas claves que `luces.candelabro`. Ejecutar. Expected: FAIL.
- [ ] **Step 2: Añadir la zona a `hd2d.json`** **(valores de partida míos; se afinan mirando la sala)**: `fondo` `#0a0508`; `cielo` `{ arriba: #5a2a1a, abajo: #160a0a, intensidad: 1.6 }`; `principal` `{ color: #ff9a52, intensidad: 1.0 }`; `borde` de `sillares` con `alto` 1.1, `hiladas` 4, `porCasilla` 2, `irregular` 0.15, `salida` 0.02, `hueco` 0.025, `tono` 0.08; `hundido` `{ autotile: "lava", nivel: 0.3, fondo: 0.8, orilla: 1, colorFondo: "#7a1c06", brillo: 0.9 }`. Añadir `luces.brasero` copiando la forma de `luces.candelabro` con color `#ff8a3a` e intensidad algo mayor.
- [ ] **Step 3: Modelo 3D del brasero** en `modelos.ts`: un caso `brasero` que reutiliza lo que hace el de `candelabro` (cuenco y patas con los colores de su propio sprite, una luz parpadeante) adaptado a un cuenco con llama; el resto de objetos del Cauce Seco (`pilar_inf`, `roca`, `columna_rota`, `escombros`) ya tienen modelo por su nombre y toman los colores de su sprite.
- [ ] **Step 4: Visor de desarrollo.** En `main.ts`, ampliar `PLANTILLAS` a `Record<string, PlantillasJson>` con `cauce` (importando `plantillas_cauce.json`) y hacer que `portada()` use, solo si `import.meta.env.DEV` y existe `?portada=<id>`, la zona y la plantilla de ese id (la zona es lo que va antes del primer `_` del id). Sin el parámetro, nada cambia.
- [ ] **Step 5: Ejecutar `npx vitest run tests/hd2d_zonas.test.ts`.** Expected: PASS. Ejecutar `npm run build`. Expected: sin errores de tipos.
- [ ] **Step 6: Verlo en el navegador.** Arrancar `npm run dev` y, con Edge sin cabeza (ver la nota de entorno de CLAUDE.md: `msedge.exe --headless=new --screenshot=...`), capturar `?portada=cauce_combate_01`, `?portada=cauce_descanso_01` y `?portada=cauce_jefe_01`; mirar las capturas con Read: obsidiana negra, brasas, el pozo de lava con su brillo, el aro sobre las puertas y los braseros iluminando. Ajustar los números de `hd2d.json` hasta que se vea como lo descrito en el diseño; guardar las capturas finales en `docs/previews/cauce_3d_*.png`.
- [ ] **Step 7: Commit** `git commit -m "Cauce Seco: aspecto 3D, luz del brasero y visor ?portada= de desarrollo"`.

---

### Task 6: La música de la zona

**Files:**
- Modify: `src/data/sonido.json` (pista `cauce`), `tests/musica.test.ts` (si enumera las pistas)

**Interfaces:**
- Consumes: la forma de las pistas de zona de `sonido.json` (`tempo` y `voces` con `onda`, `volumen` y `notas`).
- Produces: la pista `cauce`, para que la zona ya tenga música cuando se active.

- [ ] **Step 1: Mirar `tests/musica.test.ts`** y cómo valida las pistas. Si recorre las claves de `zonas.json`, añadir un test que compruebe que `sonido.json` tiene una pista `cauce` bien formada con la misma función de validación; Expected: FAIL (no existe).
- [ ] **Step 2: Componer la pista** `cauce` a imitación de `cripta` (tempo 84-96, dos o tres voces con el formato de notas de las demás): una voz grave de `sine` o `triangle` que sostiene un bordón en modo frigio (por ejemplo `D2 ~ ~ ~ Eb2 ~ ~ ~ D2 ~ ~ ~ C2 ~ ~ ~`), una voz de `triangle` con una melodía lenta y entrecortada por los silencios (`~`/`-`) y, para el crepitar, una voz `square` de volumen bajo (0,15-0,2) con notas cortas y repetidas. Distinta de la Cripta (que es fría y larga) y de las Ruinas.
- [ ] **Step 3: Ejecutar `npx vitest run tests/musica.test.ts`.** Expected: PASS. **Step 4: Commit** `git commit -m "Cauce Seco: música de la zona"`.

---

### Task 7: Cierre

**Files:**
- Modify: `CLAUDE.md` (sección «Estado»), `docs/superpowers/specs/2026-10-30-cauce-seco-design.md` (nota)

- [ ] **Step 1: Ejecutar `npm run lint`, `npm run build` y `npm test`.** Expected: sin errores (`npx prettier --write .` si lint se queja). Comprobar con `git status` que no cambió nada ajeno (restaurar con `git checkout`) y que **`zonas.json`, `historia.json` y `monstruos.json` no están tocados**.
- [ ] **Step 2: Imagen de revisión** `docs/previews/cauce_zona_x2.png`: tres plantillas de `cauce` (combate, descanso y jefe) y las capturas 3D de la Tarea 5, juntas.
- [ ] **Step 3: Documentar:** viñeta en «Estado» de `CLAUDE.md` (fecha, la rama, qué hay, que **la zona sigue sin activar**, cómo verla: `npm run dev` y `?portada=cauce_combate_01`, y que `cauce` solo aparece en `hd2d.json`, `sonido.json`, los tilesets, las plantillas, `main.ts` (visor) y los tests) y una línea en el diseño.
- [ ] **Step 4: Commit** `git commit -m "Cauce Seco: zona completa pero sin activar; documentación"`. Subir la rama y abrir la PR con `gh pr create` **solo cuando Pedro lo pida**, y **no fusionar sin su visto bueno al arte**.

## Notas para la entrega 3d (activar la zona)

- Añadir `cauce` a `zonas.json` (17 salas o 14 si el generador no admite 17), sus `grupos`, `jefe: "sacerdote"`, `jefeVioleta: "oni"`, `cofreTrampa`, `cofre` de nivel 4, `violetas.dragon.cauce`; `historia.json` (cartel y frases); las fichas de monstruos (con las estadísticas); y `PLANTILLAS` de `main.ts` pasa a sacarse de la zona activa.
- El `descanso` de la zona usa la fuente de `comunes` (el único agua): decidir si se queda así.
