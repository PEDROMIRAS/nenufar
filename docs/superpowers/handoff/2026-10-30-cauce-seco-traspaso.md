# Traspaso: el Cauce Seco (cuarta zona) y las reglas nuevas

Fecha: 2026-10-30 (cierre de sesión). Para retomar en otra conversación o tarea sin releer todo lo hablado.
Lee primero `CLAUDE.md` (estado del proyecto) y este documento; el diseño detallado está en
`docs/superpowers/specs/2026-10-30-cauce-seco-design.md` y cada entrega tiene su plan en `docs/superpowers/plans/`.

## 1. Dónde estamos, en una pantalla

| Entrega | Qué es | Estado |
|---|---|---|
| 1 | Reglas nuevas: fórmula de daño por cociente, nivel máximo 12, rangos de victoria 10 puntos más bajos, reequilibrado | **Hecha y publicada** (PR #12) |
| 2 | Jabalí y cuervo (Bosque), lobo (Cripta); el Espectro sale de la Cripta y queda oculto; bestiario de 7 casillas por fila | **Hecha y publicada** (PR #13) |
| 3a | **Arte** de los monstruos del Cauce Seco (acólito, salamandra, sacerdote, oni, dragón de fuego) y Dragón negro más fiero | **Hecha en la rama `arte-cauce-seco`**, subida, **PR #14 abierto sin fusionar**: falta el visto bueno de Pedro al arte. Después se rehicieron los cinco jefes desde sus imágenes (ver `CLAUDE.md`) |
| 3b | La zona: tileset, autotiles, 8 plantillas, aspecto 3D, música | **Hecha y subida en la rama `cauce-seco-zona`** (sale de `arte-cauce-seco`), sin fusionar ni activar; ver `CLAUDE.md` |
| 3c | Equipo de nivel 4, textos de la zona, rediseño del bestiario | Sin plan |
| 3d | Activar la zona (`zonas.json`), fichas de datos de los monstruos y equilibrado con cuatro zonas | Sin plan |

- `main` (último `74a6de1`, publicado): incluye las entregas 1 y 2. Suite verde, `lint` y `build` sin errores.
- Rama `arte-cauce-seco` (último `1ae3c0e`, 18 commits por delante de `main`): 36 ficheros de test y 322 tests en verde. **Sin PR.**
- Sin fusionar y sin publicar todavía: la 3a. El Cauce Seco **no está activo en el juego**: no aparece en `zonas.json` ni en ningún dato; los sprites son recursos sueltos.
- El plan de la 3b (`docs/superpowers/plans/2026-10-30-zona-cauce-seco.md`) está escrito y se sube con este documento. Pedro todavía no ha dicho «adelante» a ese plan.

## 2. La historia y el diseño (resumen; el detalle está en el spec)

- Historia: la Orden del Nenúfar, sin luna, encendió una **luna falsa de fuego**; el Rey sin Charca se bebió el agua y dejó un lecho de río seco, y ahí hay un santuario. La zona va **entre la Cripta y el jefe final** (el Señor de la Cripta, que se transforma en el Rey sin Charca; se le encuentra ahora al final del Cauce Seco). Zona 4, clave `cauce`.
- Reparto (decidido por Pedro): **Bosque** = Limo, Murciélago, Jabalí, Cuervo; **Cripta** = Caballero oscuro, Araña, Lobo; **Cauce Seco** = Acólito, Espectro (movido desde la Cripta; es el «mago de fuego»), Salamandra de brasas; jefe de zona **Sacerdote de la luna falsa** (aureola de fuego); jefe violeta **Monje oni**; el **Dragón negro** sigue como jefe opcional aleatorio en las **cuatro** zonas (los cuatro dragones comparten sprite; hay un test).
- Combate del Sacerdote (propuesta mía, aprobada): fase 1 (100-60 %) ataca, *Llama* a todos con quemadura e invoca dos acólitos; fase 2 (<60 %) «¡La luna falsa se enciende!», *Llama* más a menudo y el golpe cargado *Eclipse* (poder 4, aviso un turno antes). Mezcla de presión constante (quemadura) y golpes grandes anunciados. Usa solo lo que ya existe en el motor.
- Las recompensas de los jefes violetas salen del **reservorio de cada heroína** (habilidad y dos piezas especiales): el oni **no necesita pieza ni arte de recompensa nuevos**.
- **Equipo de nivel 4** (Pedro: «todo tiene que estar hecho»): katana, bastón y armadura nuevos en `objetos.json`, solo con paleta de `tinte` (no llevan sprite propio). Bonos propuestos: ataque y magia +15, defensa +12, y un efecto de estado. Cuidado: `tests/recompensas.test.ts` tiene un `tramo(nivel)` («siempre algo mejor») que habrá que revisar con los bonos nuevos.
- Largo de la zona: **17 salas** si el generador lo admite (hay que comprobarlo), si no 14. Las probabilidades de salas violetas no se tocan. Los logros se dejan igual salvo los que dependan del número de zonas.
- La sala de `descanso` del Cauce Seco lleva la fuente de siempre (el único sitio con agua): decisión mía, a confirmar con Pedro.

## 3. Las reglas del juego tal como están en `main` (entrega 1 y 2)

- **Fórmula de daño**: `max(1, ⌊(ATQ×poder)² / (ATQ×poder + DEF×factor) × varianza × crítico⌋)` con `factor` 0,5 físico y 0,25 mágico (`calcularDanio`, `src/core/combate.ts`). Se aplica a todo el daño directo.
- **Nivel máximo 12.** Objetivo de partida completa: **Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 %**, menos de 5 puntos entre heroínas; jefes violetas 65/50/35 de media (±10), suelo 25 %, dragón entre 20 puntos por debajo y 10 por encima del violeta de su zona.
- Resultado actual (ronin / maga): Fácil 70 / 69, Normal 49 / 53, Difícil 32 / 32. Márgenes estrechos (1-3 puntos): la vida de los monstruos se redondea a enteros y **salta** (×1,07 → ×1,08 hunde a la ronin).
- Valores que se tocaron para cuadrarlo: ronin +2 ataque por nivel y 46 PV iniciales; maga 40 PV; vida de monstruos ×1,07 en las tres dificultades; ataque de monstruos Fácil ×1,08, Normal y Difícil ×1,11; recuperación 1 / 0,69 / 0,44; violetas Normal ×1,09 y Difícil ×1,075; Señor de la Cripta 314 PV y Rey sin Charca 234 PV; lobo 54 PV, ataque 15, velocidad 8; jabalí 25 PV, ataque 7; cuervo ataque 6; árbol maldito 100 PV, caballero maldito 250 PV, dragón de las Ruinas ataque 19.
- Método para reequilibrar (el de siempre, **no se sube**): un test temporal que muta en memoria `DIFICULTADES`, `HEROES`, `MONSTRUOS` y `REGLAS` (leyendo cambios de un JSON) y llama a `simular()` de `tests/simulador.ts`; para buscar, una búsqueda aleatoria sobre pocos parámetros puntuando la distancia a 70 / 50 / 30 y a la igualdad entre heroínas. Sin `--disableConsoleIntercept` Vitest 5 no muestra los `console.log`. Se borran después.
- **El documento de desarrollo (Claude Docs) sigue describiendo la fórmula de resta**: hay que actualizarlo (lo dice `CLAUDE.md`).

## 4. El arte: qué hay, cómo se hizo y qué dijo Pedro

Todo en `public/assets/sprites/monstruos/`, generado por `tools/generadores/monstruos/generar.py` (determinista). Imágenes de revisión: `docs/previews/todos_monstruos.png` (galería de todos), `cauce_monstruos_x3.png`, `dragones_aliento.png`, `oni_x8.png`, `jabali_comparacion.png`, `monstruos_nuevos_x4.png`.

| Monstruo | Cuadro | Cómo se hizo |
|---|---|---|
| Jabalí | 40×40 | Reducido de su imagen (`jabali.py`), siempre de perfil (también en combate) |
| Cuervo | 32×32 | Dibujado con `Lienzo` (`criaturas.py`) |
| Lobo | 32×32 | `Lienzo` (`humanoides.py`) |
| Acólito | 40×40 | Reducido de su imagen (`acolito.py`), llama que parpadea |
| Salamandra de brasas | 40×40 | A mano con `Lienzo` (`criaturas.py`), oscura, de perfil también en combate |
| Sacerdote de la luna falsa | 48×48 | A mano con `dibujo.py` (`sacerdote.py`): alto y flaco, brazos abiertos, aureola/sol roto |
| Monje oni | 48×48 | Reducido de su imagen con la **máscara de calavera repintada** y los **cuernos blancos** (`oni.py`) |
| Dragón de fuego | 64×48 | Reducido de su imagen (`dragon_fuego.py`); **recurso sin uso** |
| Dragón negro | 64×48 | Más fiero: cuernos de hueso, colmillos, más negro, brasas; aliento horizontal |

**Cosas que Pedro ha pedido o corregido (criterio para todo el arte que falte):**
- Sobrio y oscuro; **nada infantil** (sin ojos redondos grandes ni colores lisos). Se rehízo la salamandra por eso.
- **Que se parezca a su imagen de referencia**: si una reducción sirve, se usa (así quedó el jabalí tras cuatro vueltas y el oni); a mano solo cuando la referencia da ruido.
- Contorno **continuo y sin huecos**; las patas pegadas a la barriga; sin píxeles sueltos.
- Oni: cuernos **blancos, en la máscara** (no en la capucha), frente **redondeada**, que **se vean a tamaño real** (en pixel art, lo fino no se ve).
- Dragones: el fuego sale **de la boca, recto hacia delante, no hacia abajo** («puede valer de momento»; el Dragón negro tiene el hocico cerca del borde, así que el chorro es corto; ensanchar su cuadro es la opción si se quiere más largo).
- Salamandra, acólito y jabalí un poco más grandes → hecho (40×40).
- Pedro prefiere ver el arte en imágenes: `SendUserFile` (herramienta diferida; cargarla con `ToolSearch select:SendUserFile`) con `display: render`.

**Pendiente de Pedro en el arte:** dice que el sacerdote «está mejor pero hay que ajustar detalles» (**no ha dicho cuáles**: preguntárselo); si el Dragón negro le parece suficientemente fiero; y dar el visto bueno al conjunto antes de fusionar la 3a.

## 5. Cómo trabajar aquí (trampas del entorno)

- Windows: ejecuta `npx vitest` y `npm` desde `C:\Users\pmira\Documents\GitHub\nenufar` con la **C mayúscula**; con `c:\` minúscula Vitest carga dos copias y todo falla.
- Python en `.venv\Scripts\python.exe`. Con `-I` los scripts sueltos no ven `tools/`: `sys.path.insert(0, ...)`. Para pasar rutas de `/tmp` de Git Bash a Python usa `$(cygpath -m /tmp/archivo)`; dentro de un script Python no valen las rutas `/tmp`.
- **Regenerar los monstruos solo con** `.venv\Scripts\python.exe tools\generadores\monstruos\generar.py` y luego `git checkout public/assets/sprites/monstruos/espectro.png public/assets/sprites/monstruos/golem.png` (cambian de bytes aunque sean iguales). **Nunca `generar_todo.py`**: reescribe todo con otra compresión y JSON con CRLF. Para el entorno (tilesets) se ejecutan los scripts de `tools/generadores/entorno/` **desde su carpeta** y se copia a mano lo de `cauce`.
- `generar.py` avisa («toca el borde del cuadro») para los monstruos de `VIGILADOS`; ningún fotograma de un monstruo nuevo toca el borde del cuadro, y los jefes no suben de la fila 4.
- `tools/generadores/monstruos/reducir.py` saca una pose de pixel art de una imagen (quita el fondo —también varios colores, como la sombra del suelo—, reduce, ajusta `brillo`/`saturacion`/`contraste`, limpia la silueta, pone contorno). Tiene tests: `.venv\Scripts\python.exe tools\generadores\monstruos\test_reducir.py`.
- No edites con PowerShell 5.1 (rompe las tildes); usa Edit/Write o scripts de Python.
- El build (`tsc`) no tiene tipos de Node: en los tests usa `import.meta.glob`, no `node:fs`.
- Los commits terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; las PR, con la línea «🤖 Generated with [Claude Code](https://claude.com/claude-code)».
- **Pedro no quiere que se fusione ni publique nada sin pedirlo.** «Sube, PR y publica» = `git push`, `gh pr create` y `gh pr merge N --merge`; «subir la rama» = solo `git push -u origin <rama>`. Antes de fusionar conviene que él pruebe en el móvil.

**Proceso que se ha usado (con las habilidades de Superpowers):** brainstorming → spec → `writing-plans` (un plan por entrega) → `executing-plans` en la misma sesión (a Pedro le gusta «tú mismo»): rama desde `main`, registro de decisiones en `.superpowers/sdd/<plan>/progress.md` (git-ignorado), un `Ruling:` por cada desvío del plan, TDD en cada paso, `task-start`/`task-done` de los scripts de la habilidad, revisión final con un subagente de `model: "fable"` y limpieza del espacio de trabajo. Cada entrega termina con una pregunta de cómo cerrar la rama (fusionar / PR / dejar).

## 6. Siguiente paso, en orden

1. **Cerrar la 3a con Pedro:** resolver los detalles del sacerdote y, cuando dé el visto bueno, abrir la PR (`gh pr create --base main --head arte-cauce-seco`) **solo si lo pide**; fusionar solo si lo pide. No tiene efecto en el juego hasta la 3d.
2. **Ejecutar el plan de la 3b** (`docs/superpowers/plans/2026-10-30-zona-cauce-seco.md`) si Pedro dice «adelante»: rama `zona-cauce-seco` desde `main`; tileset de obsidiana y lecho de río, autotiles `lecho` y `lava`, ocho plantillas, aspecto 3D (`hd2d.json`, modelo del brasero), visor de desarrollo `?portada=<id de plantilla>`, música. **No tocar `zonas.json`.**
3. **Planificar y ejecutar la 3c:** equipo de nivel 4, textos (`historia.json`: cartel y frases del sacerdote y del oni), rediseño del bestiario (hoy 20 de 21 casillas; la 3d lo desborda: páginas o casillas menores).
4. **Planificar y ejecutar la 3d:** añadir `cauce` a `zonas.json` (grupos, `jefe: "sacerdote"`, `jefeVioleta: "oni"`, `cofreTrampa`, `cofre` de nivel 4, `violetas.dragon.cauce` con el mismo sprite que las demás variantes), fichas de monstruos con estadísticas, **quitar `oculto: true` al Espectro y a los nuevos** (hasta entonces «Naturalista» no los pide), tests de zonas y de violetas, y **reequilibrar con cuatro zonas** (los rangos de la sección 3 siguen valiendo; es probable que haya que repartir otra vez las palancas). Revisar también `main.ts`: `NombreZona` y `ORDEN` salen de `zonas.json`; el `PLANTILLAS` de la 3b pasa a ser el de la zona activa.
5. Al acabar: actualizar el documento de desarrollo (fórmula y zona 4) y `CLAUDE.md`.

## 7. Cabos sueltos y riesgos conocidos

- **Nadie ha visto nada de esto en el navegador ni en el móvil**: ni el bestiario de 7 por fila, ni los monstruos nuevos en el mapa y en combate, ni el arte en movimiento. Pedro debe probar tras la publicación de las entregas 1 y 2 (ya está en GitHub Pages).
- Márgenes de equilibrado de 1-3 puntos; cualquier cambio de datos puede sacar un test de rango y obliga a reequilibrar (los tests son deterministas, no flaky).
- Una partida guardada antes de la entrega 1 sigue con las estadísticas viejas de las heroínas, y puede mostrar otros monstruos en grupos sin vencer.
- El multiplicador `violetas` de Difícil (1,075) es menor que el de Normal (1,09): el violeta de Difícil sale algo más flojo. No hay test que fuerce el orden de las dificultades.
- El Dragón negro ya tocaba el borde del cuadro (columnas 0 y 63, fila 0) antes de esta tanda; no se arregló.
- El Dragón de fuego no tiene datos ni uso; si se quiere usar, hay que decidir si sustituye al Dragón negro (los tests exigen que las variantes compartan sprite).
- El sprite del Dragón negro se rehízo más fiero de forma moderada; Pedro puede querer más (alas mayores, más púas).
- `tests/hojas_cauce.test.ts` y `tests/monstruos_nuevos.test.ts` comprueban el formato de las hojas, pero no el tamaño real de los PNG.
