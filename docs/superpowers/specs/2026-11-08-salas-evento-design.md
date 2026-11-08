# Salas de evento (variedad entre partidas, bloque 2)

Segunda parte de `2026-11-08-variedad-partidas-design.md`. Propuesta mía (Pedro dijo «continúa» sin contestar preguntas): todo lo marcado como *mi apuesta* es una suposición que puede cambiar.

## Idea

Un callejón libre de la zona puede ser una **sala de evento**: una sala sin combate donde la heroína se encuentra algo y **decide**. El primer evento es el **altar**; el ermitaño y el desafío van en entregas aparte porque piden arte nuevo y guardado de combates encadenados.

## Entregas

1. **2a (esta):** el tipo de sala `evento`, la escena de elección y el altar.
2. **2b:** el ermitaño (elige uno de dos objetos). Pide un sprite de personaje: lo aprueba Pedro antes de usarlo.
3. **2c:** el desafío (tres combates seguidos). Pide un `CombateGuardado` nuevo y saltarse la recuperación entre combates.

Cada una se publica sola; 2b y 2c reutilizan lo de 2a.

## Entrega 2a

**Colocación.** `colocarExtras` (`src/core/zona.ts`) sortea un tercer extra, **después** de la violeta y la trampa y solo en un callejón que quede libre: `probabilidadEvento` por zona en `zonas.json`. La sala pasa a `tipo: 'evento'` con `evento: 'altar'`. Sin el campo, nunca. Como la tirada va al final del azar de los extras y con probabilidad 0 no cambia nada, el trazado de siempre y las huellas de `tests/violetas_zona.test.ts` no se mueven.

**Aspecto.** Una plantilla `evento` por zona en `plantillas_<zona>.json` (sala despejada con el altar en el centro, sin monstruos, puertas siempre abiertas). El altar es un **modelo 3D hecho en código** (`crearModelo`, como la fuente y el cofre): losa de piedra con runas lavanda que brillan, igual en las cuatro zonas y teñida por su luz. No toca el arte generado por script. *Mi apuesta; el aspecto lo aprueba Pedro.* El minimapa gana un punto para `evento`.

**Interacción.** Se acerca la heroína al altar (el mismo `objetoAlAlcance` que la fuente y el cofre) y se abre la **escena de elección** (`src/escenas/evento.ts`, `alta = true`): título, una línea que explica cada opción con su coste a la vista y una lista de opciones con la misma ayuda de toque que el resto de menús (dos toques: el primero elige y explica). Escena genérica: título, descripción y opciones `{ texto, efecto }`; el ermitaño la reutilizará.

**El altar** (`src/data/eventos.json`, sin números en el código):
- *Ofrecer vida:* pierdes el 30 % de tus PV máximos (nunca bajas de 1 PV) y recuperas todos los PM y un Éter.
- *Ofrecer magia:* pierdes todos tus PM actuales y recuperas el 30 % de tus PV máximos.
- *Marcharse:* no pasa nada y el altar sigue esperando.
- Las dos primeras opciones **no se pueden elegir** si no hacen nada (PV al mínimo para la primera, PM a cero para la segunda); la escena lo dice. Una vez aceptada una, el altar se apaga (`hechas` del mapa, como la fuente) y no se repite.
- Nada distingue a las heroínas en la lógica: la ronin tiene pocos PM y la maga más, y el efecto sale solo de sus números.

**Lógica pura** en `src/core/eventos.ts`: `opcionesAltar(l, datos)` (qué opciones hay, cuáles están desactivadas y por qué) y `aplicarAltar(l, inv, opcion, datos)`; test con `Luchador` y `Inventario` reales.

**Guardado.** Salir de la sala con el altar sin usar lo deja sin usar; usado, queda en `hechas` igual que la fuente. No hay combate en medio, así que no hace falta nada en `CombateGuardado`. Se recupera al volver (la sala guardada ya lleva `hechas`).

## Equilibrio

- El altar es un intercambio, no un regalo: con la vida al máximo la primera opción solo da un Éter y un PM que ya tienes, y la segunda solo sirve con la vida baja. El simulador (`tests/simulador.ts`) gana una política simple: usa el altar cuando le conviene (la primera con PV altos, la segunda con PM sobrantes y PV bajos).
- Sin eventos (probabilidad 0) todo es idéntico: `tests/equilibrado.test.ts` sigue midiendo lo de siempre.
- Con el altar forzado en las cuatro zonas la victoria en partida completa no se mueve más de ±3 puntos con cada heroína y dificultad (misma salvedad que los presagios: solo se puede comprobar con ~2400 partidas; el test de 300 guarda contra desvíos de más de 8). La palanca fina es el porcentaje de PV.
- Los jefes violeta no cambian: el altar solo reparte recursos que ya existen.

## Fuera de la entrega 2a

Ermitaño, desafío, más eventos, moneda y tienda; que un evento cuente para récords o logros (mi apuesta: no); avisar del evento antes de entrar en la sala (el punto del minimapa sigue la niebla de siempre).

## Lo que decide Pedro

1. ¿Te vale el altar como modelo 3D hecho en código, igual en las cuatro zonas, o prefieres un dibujo por zona (más arte y más trabajo)?
2. ¿Los dos cambios (vida por magia y magia por vida) y el 30 %, o prefieres otro trato?
3. ¿Empiezo por el altar (2a) o por el desafío, que da más reto?

## Reglas del proyecto que se mantienen

Lógica en `src/core/` sin DOM y con tests; escenas y dibujo en `src/escenas/` y `src/render/`; ningún número de diseño en el código; en vertical la escena se dibuja en la interfaz alta; textos en español en `eventos.json` o `historia.json`.
