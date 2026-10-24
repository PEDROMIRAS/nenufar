# Salas violetas: plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** salas violetas opcionales con jefes extra, un cofre trampa y recompensas especiales por heroína, para que cada partida sea distinta.

**Arquitectura:** casi todo es lógica pura en `src/core/` (generador de zonas, recompensas, combate) con datos en `src/data/*.json`, probada con Vitest. Las escenas (`mapa.ts`, `combate.ts`, `pausa.ts`, `extras.ts`) y `main.ts` solo conectan y enseñan. El arte nuevo sale de los generadores de `tools/generadores/`.

**Tecnología:** TypeScript strict, Canvas 2D, Vite, Vitest, Python (Pillow) para el arte.

**Diseño:** [docs/superpowers/specs/2026-10-25-salas-violetas-design.md](../specs/2026-10-25-salas-violetas-design.md), aprobado por Pedro el 2026-10-25. Quien ejecute lee los dos.

## Para retomar en otra conversación

- **Rama:** `salas-violetas`, sacada de `main` (en `main`, el hito 7 está comprobado; commit `f03b95e`). Las tres ramas están subidas a GitHub desde el 2026-10-25; nada de esta rama está publicado (Pages solo despliega `main`).
- **Hecho (2026-10-25): las 11 tareas.** Probado en el navegador con semillas 3 (árbol), 7 (dragón) y 6 (tesoro trampa) del Bosque. Pedro aprobó el arte (el árbol y el dragón rehechos según sus referencias; el caballero y el ojo rediseñados). Documentado en la pestaña «Versión 2: salas violetas» del documento de diseño y en `CLAUDE.md`.
- **Cambios respecto al plan:** un cofre trampa por zona (`cofreTrampa` en zonas.json); `violetas` en dificultades.json (multiplicador propio de los jefes violetas, porque un combate suelto apenas nota la dificultad); el test de dureza mira la media de las dos heroínas a ±8; `probabilidadTrampa` 0,25; las piezas especiales son capas generadas (`piezas/`) que el juego pinta sobre la hoja.
- **Decidido por Pedro:** la maga gana mucho más que la ronin contra un jefe solo (en la Cripta, 80-97 % frente a 10-47 %); se deja así y se equilibrará más adelante si hace falta.
- **Siguiente paso:** revisión final de la rama; después, cuando Pedro lo pida, fusionar con `main` y publicar.
- **Otra rama abierta:** `prototipo-hd2d`, con el prototipo HD-2D (sin fusionar con `main`, subida a GitHub). No se toca en este plan. Está documentado en la pestaña «HD-2D: prototipo» del documento de diseño.
- **Entorno (Windows):** ejecutar desde `C:\Users\pmira\Documents\GitHub\nenufar` con la C mayúscula (si no, Vitest falla). Python en `.venv`: `.\.venv\Scripts\python.exe tools\generadores\generar_todo.py`. No editar archivos con PowerShell 5.1 (rompe las tildes). `npm test`, `npm run lint`, `npm run build`.
- **Forma de trabajar con Pedro:** español en todo; commits pequeños en español; no subir ni publicar sin que lo pida; enseñarle capturas del arte nuevo antes de darlo por bueno (va guiando con capturas). Al terminar, actualizar el documento de diseño (Claude Docs, enlace en `CLAUDE.md`) y `CLAUDE.md`.

## Restricciones globales

- `src/core/` no importa nada del navegador; solo `src/input/` y `src/render/` tocan el DOM o el canvas.
- Ningún número de diseño en el código: probabilidades, estadísticas, poder, PM y colores de datos van en `src/data/*.json`.
- Lo que diferencia a las heroínas va en `heroes.json`; nada de `if (heroina === 'maga')`.
- Todo lo aleatorio con el PRNG con semilla (`crearAzar`). Con `?semilla=N` la partida se repite igual, salas violetas incluidas.
- Las tiradas nuevas del generador se hacen **después** de las que ya existen, para que una semilla siga dando el mismo trazado de zona.
- Cero asignaciones de memoria dentro del bucle de juego.
- Arte generado por script, nunca a mano; las referencias de Pedro son concepto, no se copian. Jefes violetas en 48 px de alto; el dragón en 64×48; ninguno sube más de ~42 px sobre los pies.
- `tests/equilibrado.test.ts` mantiene sus objetivos (Fácil 85-90 %, Normal 70-75 %, Difícil 50-55 %, menos de 5 puntos entre heroínas), **con** el cofre trampa y **sin** las salas violetas.
- Jefes violetas: una heroína que entra al terminar de explorar la zona gana cerca del **75 % en Fácil, 60 % en Normal y 45 % en Difícil** (±5).
- Tipos de TypeScript: los campos nuevos de los JSON que no tienen todas las entradas son opcionales.

## Puntos a vigilar en la revisión

1. **Partida sin ninguna sala violeta:** si las dos primeras zonas no la sacan, la tercera la saca siempre. Test en la tarea 2 con muchas semillas.
2. **Dos dragones en una partida:** no puede pasar; si ya salió, las zonas siguientes eligen el jefe de su zona. Test en la tarea 2.
3. **El Bosque sin callejón para el tesoro trampa:** si no queda callejón libre tras jefe, tesoros, descanso y sala violeta, esa zona no tiene tesoro trampa; nunca se rompe la generación. Test en la tarea 2.
4. **Caer con el Corazón contra un jefe que sigue cargando, o con veneno:** la heroína se levanta con media vida y el combate sigue; si vuelve a caer, es derrota. Test en la tarea 5.
5. **Cometa arcano contra un enemigo que muere del golpe y estaba cargando:** no debe fallar ni dejar el estado de carga en un muerto. Test en la tarea 4.

## Mapa de archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/core/types.ts` | `TipoSala` con `'violeta'`; `HabilidadJson.recompensa`, `rompeCarga`; `EquipoJson.bonosPorNivel`; `HeroeJson.especiales`; `MonstruoJson.oculto`; tipos de `zonas.json` para violetas |
| `src/core/zona.ts` | Sala violeta y tesoro trampa en el generador |
| `src/core/violetas.ts` (nuevo) | Qué jefe violeta toca en cada zona y la garantía de al menos una por partida |
| `src/core/recompensas.ts` (nuevo) | Elegir y aplicar las recompensas especiales |
| `src/core/equipo.ts` | Bonos que crecen con el nivel |
| `src/core/inventario.ts` | Recompensas ganadas y el Corazón |
| `src/core/combate.ts` | Quinta habilidad, Cometa arcano rompe la carga, el Corazón al caer, el equipo crece al subir de nivel |
| `src/core/logros.ts`, `src/core/records.ts` | Los monstruos ocultos no cuentan en el bestiario ni en «Naturalista» |
| `src/data/zonas.json`, `monstruos.json`, `heroes.json`, `objetos.json`, `historia.json`, `sonido.json` | Datos nuevos |
| `src/data/salas/plantillas_<zona>.json` | Plantillas de tipo `violeta` |
| `src/escenas/mapa.ts`, `src/render/minimapa.ts` | Sala violeta, cofre trampa y punto violeta |
| `src/escenas/combate.ts`, `src/render/combate.ts` | Evento del Corazón y de la carga rota |
| `src/escenas/pausa.ts` | Hueco del Corazón en el inventario |
| `src/escenas/extras.ts` | Bestiario sin los ocultos no vencidos |
| `src/main.ts` | Estado de la partida (violetas, dragón, recompensas), frases y recompensas tras vencer |
| `tests/simulador.ts`, `tests/equilibrado.test.ts`, `tests/violetas.test.ts` (nuevo) | Cofre trampa en el equilibrado y dureza de los jefes violetas |
| `tools/generadores/monstruos/*`, `tools/generadores/personajes/*`, `tools/generadores/efectos` | Sprites de los 4 jefes, el cofre trampa, las piezas especiales y los efectos |

---

### Tarea 1: tipos y datos base

**Archivos:** modificar `src/core/types.ts`, `src/data/zonas.json`; test `tests/datos.test.ts` (nuevo, o el que ya valide datos si existe).

**Interfaces que produce:**
- `type TipoSala = 'inicio' | 'combate' | 'tesoro' | 'descanso' | 'jefe' | 'violeta'`.
- `SalaZona.trampa?: boolean` (solo en salas `'tesoro'`).
- En `zonas.json`, un bloque nuevo:
  ```json
  "violetas": {
    "probabilidad": 0.45,
    "probabilidadDragon": 0.2,
    "probabilidadTrampa": 0.35,
    "dragon": { "bosque": "dragon_negro_bosque", "ruinas": "dragon_negro_ruinas", "cripta": "dragon_negro_cripta" }
  }
  ```
  y en cada zona `"jefeVioleta": "arbol_maldito" | "caballero_maldito" | "ojo_flotante"`. Los números son de partida; el equilibrado los ajusta.
- `interface AjustesVioletas { probabilidad: number; probabilidadDragon: number; probabilidadTrampa: number; dragon: Record<string, string> }`.

- [ ] **Paso 1:** test que carga `zonas.json` y comprueba que cada zona tiene `jefeVioleta`, que `violetas.dragon` tiene una clave por zona y que las tres probabilidades están en (0, 1).
- [ ] **Paso 2:** ejecutar `npx vitest run tests/datos.test.ts`; falla.
- [ ] **Paso 3:** añadir los tipos y los datos.
- [ ] **Paso 4:** el test pasa; `npx tsc --noEmit` limpio.
- [ ] **Paso 5:** commit «Tipos y datos de las salas violetas».

### Tarea 2: generador con sala violeta y tesoro trampa

**Archivos:** crear `src/core/violetas.ts`; modificar `src/core/zona.ts`; tests `tests/zona.test.ts`, `tests/violetas_zona.test.ts` (nuevo).

**Interfaces que produce:**
- `AjustesZona` gana `violeta: 'no' | 'quiza' | 'seguro'` y `probabilidadVioleta: number`, `probabilidadTrampa: number`.
- `generarZona(ajustes, semilla)` sigue igual de firma. Tras colocar jefe, tesoros y descanso (sin cambiar sus tiradas), con un azar **aparte** derivado de la semilla de la zona (`crearAzar(semilla * 31 + 7)`), decide: si `violeta === 'seguro'`, o `'quiza'` y sale la tirada, un callejón libre pasa a `'violeta'`; después, si queda otro callejón libre y sale la tirada de trampa, pasa a `'tesoro'` con `trampa: true`. Sin callejón libre, no hay sala violeta ni trampa. Con `'seguro'` y sin callejón libre, prueba la siguiente semilla (como ya hace si la zona no cabe).
- En `violetas.ts`: `jefeVioleta(zona: string, datos: { jefeVioleta: string }, ajustes: AjustesVioletas, dragonUsado: boolean, azar: () => number): string`: devuelve la clave del dragón de esa zona con `probabilidadDragon` si no se ha usado, y si no, `datos.jefeVioleta`.
- `modoVioleta(indice: number, total: number, violetasPrevias: number): 'quiza' | 'seguro'`: `'seguro'` solo en la última zona sin ninguna previa.

- [ ] **Paso 1:** tests: (a) con `violeta: 'no'`, el trazado de 1.000 semillas es idéntico al de antes (comparar salas y tipos con la versión actual guardada en el test); (b) con `'seguro'`, toda zona generada tiene exactamente una sala `'violeta'`, que es un callejón (una puerta); (c) ninguna zona tiene más de una violeta ni más de un tesoro trampa; (d) en el Bosque (8 salas) nunca se rompe la generación y, si hay violeta, no hay trampa; (e) `modoVioleta(2, 3, 0) === 'seguro'`, `modoVioleta(1, 3, 0) === 'quiza'`; (f) `jefeVioleta` con `dragonUsado: true` nunca devuelve un dragón.
- [ ] **Paso 2:** fallan.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** pasan, junto con los tests de zona y de plantillas que ya existían.
- [ ] **Paso 5:** commit «Generador: sala violeta y tesoro trampa».

### Tarea 3: recompensas especiales y equipo que crece

**Archivos:** crear `src/core/recompensas.ts`; modificar `src/core/equipo.ts`, `src/core/inventario.ts`, `src/core/combate.ts` (en `terminar`), `src/data/heroes.json`, `src/data/objetos.json`; test `tests/recompensas.test.ts`.

**Interfaces que produce:**
- `type Recompensa = 'arma' | 'armadura' | 'habilidad'`.
- `Inventario` gana `recompensas: Recompensa[]` (las ganadas) y `corazon: 'no' | 'lleno' | 'gastado'`; `crearInventario()` los pone a `[]` y `'no'`.
- `HeroeJson.especiales: { arma: string; armadura: string; habilidad: string }`: claves de `objetos.json` y nombre de la habilidad.
- `EquipoJson.bonosPorNivel?: Partial<Estadisticas>`. `bonosDe(pieza: EquipoJson, nivel: number): Partial<Estadisticas>` = `bonos + bonosPorNivel × (nivel − 1)`. `equipar` resta y suma con `bonosDe(…, l.nivel)`.
- `crecerEquipo(l: Luchador, inv: Inventario, objetos: ObjetosJson, niveles: number): void`: suma `bonosPorNivel × niveles` de las piezas puestas. `terminar` lo llama tras las subidas de nivel.
- `elegirRecompensa(ganadas: readonly Recompensa[], azar: () => number): Recompensa | null`: una al azar entre las que faltan; `null` si ya tiene las tres.
- `aplicarRecompensa(l: Luchador, inv: Inventario, heroe: HeroeJson, r: Recompensa): string`: arma y armadura van a la mochila (con `guardarPieza`; la escena las ofrece con la pantalla de equipo); la habilidad queda ganada. Devuelve la clave o el nombre de lo ganado.
- Piezas nuevas en `objetos.json`: `katana_sagrada`, `baston_arcano` (hueco `arma`), `armadura_samurai`, `tunica_arcana` (hueco `armadura`), cada una con `bonos`, `bonosPorNivel`, `efecto` propio y `tinte`. Efectos propuestos (Pedro los revisa): katana sagrada, 15 % de Quemadura al golpear; bastón arcano, 15 % de Aturdido.

**Regla «siempre algo mejor»**, como test: para cada nivel n de 1 a 10, la suma de `bonosDe(especial, n)` supera en al menos un 10 % a la mejor pieza normal de su hueco **de su tramo** (tramo 1 en los niveles 1-3, tramo 2 en los 4-6 y tramo 3 en los 7-10, con `heroe.armas[tramo − 1]` y `objetos.armaduras[tramo − 1]`). Antes de fijar los tramos, comprobar con el simulador (registrando el nivel con que se llega a cada jefe) que se corresponden con las zonas; si no, ajustar los tramos en el test y decirlo.

- [ ] **Paso 1:** tests de `elegirRecompensa` (nunca repite, `null` con las tres), `aplicarRecompensa`, `bonosDe`, `crecerEquipo` (equipar a nivel 1, subir dos niveles, desequipar: las estadísticas vuelven a las de partida) y la regla «siempre algo mejor».
- [ ] **Paso 2:** fallan.
- [ ] **Paso 3:** implementar y añadir los datos.
- [ ] **Paso 4:** pasan; `tests/equilibrado.test.ts` sigue en rango (las piezas nuevas no salen en cofres ni botín).
- [ ] **Paso 5:** commit «Recompensas especiales y equipo que crece con el nivel».

### Tarea 4: quinta habilidad y Cometa arcano

**Archivos:** modificar `src/core/types.ts`, `src/core/combate.ts`, `src/data/heroes.json`, `src/data/sonido.json`; test `tests/habilidades.test.ts`.

**Interfaces que produce:**
- `HabilidadJson.nivel` sigue siendo obligatorio (la quinta lleva un `nivel` alto que no se alcanza, 99), con `recompensa?: true`.
- `Luchador.habilidadesGanadas: string[]` (nombres); `luchadorDeHeroe` lo crea vacío y `aplicarRecompensa('habilidad')` añade el nombre de `heroe.especiales.habilidad`.
- `habilidadesDisponibles(h)`: las de `recompensa` solo si su nombre está en `h.habilidadesGanadas`; el resto, como ahora, por nivel.
- `HabilidadJson.rompeCarga?: true`: en `usarHabilidad`, a cada objetivo que sigue vivo y tenía `cargando`, se le quita y se emite `{ tipo: 'cargaRota'; objetivo: Luchador }` (evento nuevo).
- Datos: ronin, «Tajo de llama morada» (`objetivo: 'todos'`, físico, poder alto, PM altos, efecto y sonido nuevos); maga, «Cometa arcano» (`objetivo: 'todos'`, mágico, poder alto, PM altos, `rompeCarga: true`). PM y poder: los fija el simulador para que a nivel bajo apenas se puedan usar (PM por encima del PM máximo de nivel 1-2) y no rompan los objetivos de la tarea 9.

- [ ] **Paso 1:** tests: la quinta no está disponible sin ganarla ni a nivel 10; sí tras ganarla; Cometa arcano deja `cargando = false` en los objetivos vivos y emite `cargaRota`; contra un enemigo que muere del golpe estando cargando, no emite `cargaRota` y no falla.
- [ ] **Paso 2:** fallan.
- [ ] **Paso 3:** implementar y añadir los datos.
- [ ] **Paso 4:** pasan.
- [ ] **Paso 5:** commit «Quinta habilidad por recompensa y Cometa arcano».

### Tarea 5: el Corazón del dragón negro

**Archivos:** modificar `src/core/combate.ts`; test `tests/combate.test.ts`.

**Interfaces que produce:**
- En `comprobarMuerte`, si cae la heroína y `c.inventario.corazon === 'lleno'`: `pv = Math.round(pvMax × levantarse)` (fracción en `combate.json`, `corazon.levantarse: 0.5`), quita sus estados, `corazon = 'gastado'`, emite `{ tipo: 'corazon'; objetivo: Luchador; pv: number }` y **no** termina el combate.
- Si vuelve a caer, `'derrota'` como siempre.

- [ ] **Paso 1:** tests: con el Corazón lleno, un golpe que la deja a 0 no termina el combate y la deja con la mitad de los PV, sin estados y con el Corazón gastado; un segundo golpe mortal es derrota; sin Corazón, derrota a la primera.
- [ ] **Paso 2:** fallan. **Paso 3:** implementar. **Paso 4:** pasan.
- [ ] **Paso 5:** commit «El Corazón del dragón negro levanta a la heroína una vez».

### Tarea 6: monstruos nuevos (datos) y bestiario oculto

**Archivos:** modificar `src/data/monstruos.json`, `src/core/types.ts`, `src/core/logros.ts`, `src/main.ts` (`MUNDO`), `src/escenas/extras.ts`, `src/data/historia.json`; tests `tests/logros.test.ts`, `tests/monstruos.test.ts`.

**Interfaces que produce:**
- Monstruos nuevos: `arbol_maldito`, `caballero_maldito` (distinto del `caballero` normal), `ojo_flotante`, `dragon_negro_bosque`, `dragon_negro_ruinas`, `dragon_negro_cripta` (todos `jefe: true`, `oculto: true`) y `cofre_trampa` (`jefe: false`, `oculto: true`, sin `mapa` porque no se mueve). Estadísticas iniciales a ojo, comparables al jefe de su zona; la tarea 9 las ajusta. Los tres dragones comparten nombre «Dragón negro» y `sprite`.
- Ideas de combate (del diseño): árbol, raíces con un estado nuevo `atrapado` en `combate.json` (`pierdeTurno` o no puede huir: elegir el más sencillo con lo que ya hay); caballero, defensa alta y `cargado` fuerte; ojo, habilidades que aplican estados; dragón, `cargado` de aliento de fuego.
- `MonstruoJson.oculto?: true`. `MUNDO.monstruos` (para «Naturalista») excluye los ocultos. El bestiario de Extras no enseña los ocultos hasta vencerlos y no los cuenta en el total.
- `historia.json`: `"violetas": { "<clave>": { "inicio": "...", "caida": "..." } }` para los cuatro jefes (los tres dragones comparten la del dragón). Frases propuestas por quien construya; Pedro las revisa.

- [ ] **Paso 1:** tests: el logro del bestiario se consigue sin vencer a ningún oculto; cada jefe violeta y el cofre trampa existen en `monstruos.json` con `oculto: true`; todos tienen frases en `historia.json` (salvo el cofre trampa).
- [ ] **Paso 2:** fallan. **Paso 3:** implementar. **Paso 4:** pasan.
- [ ] **Paso 5:** commit «Jefes violetas y cofre trampa en los datos; bestiario sin delatarlos».

### Tarea 7: el mapa: sala violeta, cofre trampa y minimapa

**Archivos:** modificar `src/escenas/mapa.ts`, `src/render/minimapa.ts`, `src/data/salas/plantillas_bosque.json`, `plantillas_ruinas.json`, `plantillas_cripta.json`; test `tests/plantillas.test.ts`.

**Interfaces que produce:**
- `OpcionesMapa` gana `jefeVioleta: MonstruoJson | null` y `cofreTrampa: MonstruoJson`.
- Plantillas de tipo `violeta`, al menos una por zona: callejón con el jefe en el centro, como las de `jefe` pero sin portal.
- `poblar`: en `'violeta'`, el jefe violeta en el centro (como el de zona). `aplicarCierre` cierra también en `'violeta'` mientras viva el jefe.
- Cofre trampa: en una sala `'tesoro'` con `trampa`, al abrir el cofre (mismo aviso y sonido de abrir) empieza el combate contra `cofreTrampa`; al ganar, `abrirCofre` normal con la tabla de la zona. Al perder, fin de partida.
- Minimapa: `PUNTO.violeta` con un violeta claro distinto del morado del portal (por ejemplo `#b07cff`); en gris cuando está vencido. El tesoro trampa usa el punto ámbar de siempre.

- [ ] **Paso 1:** test de plantillas: cada zona tiene al menos una plantilla `violeta` válida (15×11, símbolos de su leyenda, sin rincones cerrados, como las demás).
- [ ] **Paso 2:** falla. **Paso 3:** implementar. **Paso 4:** pasa; `npm run build` limpio.
- [ ] **Paso 5:** comprobar en el navegador con `?semilla=N` (buscar con un script una semilla que saque sala violeta y otra con trampa) y hacer capturas para Pedro.
- [ ] **Paso 6:** commit «Mapa: sala violeta, cofre trampa y punto violeta en el minimapa».

### Tarea 8: la partida: frases, recompensas, Corazón e inventario

**Archivos:** modificar `src/main.ts`, `src/escenas/combate.ts`, `src/render/combate.ts`, `src/escenas/pausa.ts`.

**Interfaces que consume:** `modoVioleta`, `jefeVioleta` (tarea 2), `elegirRecompensa`, `aplicarRecompensa` (tarea 3), eventos `cargaRota` (tarea 4) y `corazon` (tarea 5).

- `Partida` gana `violetas: number` y `dragonUsado: boolean`. `crearZona` calcula `modoVioleta(indice, ORDEN.length, partida.violetas)`, pasa el modo a `generarZona`, y si la zona tiene sala violeta elige el jefe con `jefeVioleta` (con un azar derivado de la semilla de la zona) y suma a `partida.violetas`.
- Al tocar al jefe violeta: presentación y frase de inicio como `lucharJefe`, con `historia.violetas`.
- Al vencerlo: frase de caída; `elegirRecompensa` → `aplicarRecompensa` → una página que dice qué se ha ganado (arma o armadura, con la pantalla de equipo para ponérsela; habilidad, con su nombre). Si era un dragón: además `corazon = 'lleno'` y una página del Corazón.
- Combate: el evento `corazon` se anima (destello, «¡El Corazón del dragón late!», PV que suben) y `cargaRota`, con un aviso («¡Carga rota!»).
- Pausa, pestaña Heroína: si `corazon !== 'no'`, sale un hueco «Corazón» con «Corazón del dragón negro» o «Vacío».

- [ ] **Paso 1:** `npm test` y `npm run build` limpios.
- [ ] **Paso 2:** jugar con semillas preparadas: vencer a un jefe violeta (recompensa ofrecida), a un dragón (Corazón en el inventario), caer con el Corazón (se levanta) y abrir un cofre trampa. Capturas para Pedro.
- [ ] **Paso 3:** commit «La partida reparte recompensas y el Corazón del dragón».

### Tarea 9: equilibrado

**Archivos:** modificar `tests/simulador.ts`, `src/data/*.json` (solo valores); crear `tests/violetas.test.ts`.

- `simular` incluye el tesoro trampa: en una sala `'tesoro'` con `trampa`, pelea contra `cofre_trampa` antes de abrir el cofre. Los objetivos de `tests/equilibrado.test.ts` se mantienen.
- `tests/violetas.test.ts`: para cada dificultad y heroína, simula 300 partidas hasta el final de la exploración de cada zona (como `simular`, antes del jefe de zona), y en ese punto un combate contra el jefe violeta de esa zona y contra su dragón, con una copia de la heroína. Objetivo: victorias en **75 ± 5 % (Fácil), 60 ± 5 % (Normal) y 45 ± 5 % (Difícil)**, con el dragón algo por debajo del jefe violeta normal pero dentro de −10 puntos.
- Ajustar solo los JSON (estadísticas, PM y poder de las habilidades nuevas, bonos de las piezas), nunca las fórmulas.

- [ ] **Paso 1:** escribir el test; falla con los valores a ojo.
- [ ] **Paso 2:** ajustar los JSON hasta que pasen `tests/violetas.test.ts` y `tests/equilibrado.test.ts`.
- [ ] **Paso 3:** commit «Equilibrado de los jefes violetas y del cofre trampa».

### Tarea 10: arte

**Archivos:** `tools/generadores/monstruos/` (módulos propios registrados en `PROPIOS` de `generar.py`: `arbol_maldito.py`, `caballero_maldito.py`, `ojo_flotante.py`, `dragon_negro.py`, `cofre_trampa.py`), `tools/generadores/personajes/` (piezas encima del sprite de la rana para la armadura samurái y la túnica arcana, y la forma de la katana sagrada y el bastón arcano), los efectos de las dos habilidades nuevas (`tajo_llama_morada`, `cometa_arcano`) y del Corazón.

- Cada monstruo con las animaciones `idle`, `walk`, `atacar`, `golpe`, como los demás, y su fila de direcciones.
- Tamaños: árbol, caballero y ojo en 48 px de alto; dragón 64×48; cofre trampa 32×32 que, en `idle`, es idéntico al `cofre_cerrado` de `comunes`.
- Las piezas especiales cambian la silueta de la rana, no solo los colores: el sprite de la heroína pasa a componerse con capas por pieza (hoy solo se recolorea con `tinte`). Diseñar cómo se compone sin romper `recolorear` y sin asignar memoria en el bucle (componer al cambiar de equipo, como hoy `vestir`).
- Sonidos nuevos en `sonido.json` (sintetizados).
- Ejecutar `.\.venv\Scripts\python.exe tools\generadores\generar_todo.py`, restaurar con `git checkout` lo regenerado que no cambia, y **enseñar a Pedro la vista previa de cada monstruo y de cada pieza antes de seguir**. Rehacer lo que pida.

- [ ] **Paso 1:** los cinco monstruos, con capturas para Pedro.
- [ ] **Paso 2:** las cuatro piezas especiales sobre las ranas, con capturas.
- [ ] **Paso 3:** efectos y sonidos.
- [ ] **Paso 4:** `npm test`, `npm run lint`, `npm run build` limpios.
- [ ] **Paso 5:** commit por bloque («Sprites de los jefes violetas», «Piezas especiales de las ranas», «Efectos y sonidos de las salas violetas»).

### Tarea 11: documentación

- [ ] Actualizar el documento de diseño (Claude Docs): las salas violetas como primer bloque de la versión 2, con lo que se haya ajustado al equilibrar.
- [ ] Actualizar `CLAUDE.md` (estado y reglas nuevas) y el README si cambian las capturas.
- [ ] Commit «Documentación de las salas violetas».

## Orden y dependencias

1 → 2 → 3 → 4 → 5 → 6 son lógica y datos, cada una con sus tests. 7 y 8 conectan con la escena y necesitan 1-6. 9 necesita 2-6. 10 puede empezar en paralelo desde la tarea 6 (las claves de sprite ya existen) y conviene empezarla pronto, porque Pedro querrá revisar el arte. 11 al final.
