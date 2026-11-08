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

**Colocación.** `colocarExtras` (`src/core/zona.ts`) sortea un tercer extra, **después** de la violeta y la trampa y solo en un callejón que quede libre: `probabilidadEvento` (una sola para todas las zonas, en `eventos.json`: 0,4). La sala pasa a `tipo: 'evento'` con `evento: 'altar'`. Sin el campo, nunca. Como la tirada va al final del azar de los extras y con probabilidad 0 no cambia nada, el trazado de siempre y las huellas de `tests/violetas_zona.test.ts` no se mueven.

**Aspecto.** Una plantilla `evento` por zona en `plantillas_<zona>.json` (sala despejada con el altar en el centro, sin monstruos, puertas siempre abiertas). El altar es un **modelo 3D hecho en código** (`crearModelo`, como la fuente y el cofre): losa de piedra con runas lavanda que brillan, igual en las cuatro zonas y teñida por su luz. No toca el arte generado por script. *Mi apuesta; el aspecto lo aprueba Pedro.* El minimapa gana un punto para `evento`.

**Interacción.** Se acerca la heroína al altar (el mismo `objetoAlAlcance` que la fuente y el cofre) y se abre la **escena de elección** (`src/escenas/evento.ts`, `alta = true`): título, una línea que explica cada opción con su coste a la vista y una lista de opciones con la misma ayuda de toque que el resto de menús (dos toques: el primero elige y explica). Escena genérica: título, descripción y opciones `{ texto, efecto }`; el ermitaño la reutilizará.

**El altar** (`src/data/eventos.json`, sin números en el código):
- *Ofrecer vida:* pierdes el 30 % de tus PV máximos (nunca bajas de 1 PV), recuperas todos los PM y ganas el 50 % de la experiencia que cuesta subir de nivel.
- *Ofrecer magia:* pierdes todos tus PM actuales y recuperas el 30 % de tus PV máximos y una Poción.
- *Marcharse:* no pasa nada y el altar sigue esperando.
- Las dos primeras opciones **no se pueden elegir** si no hacen nada (PV a 1 para la primera; PM a cero o PV llenos para la segunda); la escena lo dice. Una vez aceptada una, el altar se apaga (`hechas` del mapa, como la fuente) y no se repite.
- Nada distingue a las heroínas en la lógica: la ronin tiene pocos PM y la maga más, y el efecto sale solo de sus números.

**Lógica pura** en `src/core/eventos.ts`: `opcionesAltar(l, datos)` (qué opciones hay, cuáles están desactivadas y por qué) y `aplicarAltar(l, inv, opcion, datos)`; test con `Luchador` y `Inventario` reales.

**Guardado.** Salir de la sala con el altar sin usar lo deja sin usar; usado, queda en `hechas` igual que la fuente. No hay combate en medio, así que no hace falta nada en `CombateGuardado`. Se recupera al volver (la sala guardada ya lleva `hechas`).

## Decisiones tomadas al ejecutar la entrega 2a

- **La recompensa de ofrecer vida es experiencia, no un Éter ni un cofre.** Un evento sustituye a una sala de combate y pierde su experiencia: con el altar forzado en las cuatro zonas la ronin en Normal bajaba 6-7 puntos aunque el altar curase del todo o diera un cofre; con experiencia, el efecto queda dentro de ±3 con la probabilidad real (ver `CLAUDE.md`).
- **La probabilidad es una sola, en `eventos.json`,** no una por zona: no hacía falta distinguir.
- **El ±3 solo vale con la probabilidad real (0,4), no con el altar forzado:** forzado en las cuatro zonas la maga en Difícil sube hasta 7 con 600 partidas.

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

## Entrega 2c: el desafío

Pedro dijo «sigue» tras publicar el altar; todo lo marcado como *mi apuesta* es una suposición que puede cambiar.

**Idea.** Una sala de evento puede ser un **desafío**: un círculo de piedra con runas rojas que reta a la heroína a **tres combates seguidos de la zona sin recuperar vida entre ellos**. Premio: un cofre de la zona (el mismo sorteo que un tesoro) además de la experiencia de los tres combates. Si huye de uno, pierde el premio. Si cae, es el fin de la partida como siempre.

**Colocación.** El mismo sorteo del altar (probabilidad 0,4 de que un callejón libre sea evento). Una tirada más, solo cuando ya hay evento y al final, decide cuál: `fraccion` de `eventos.json` (*mi apuesta*: 0,5) son desafíos y el resto altares. `SalaZona.evento` pasa a `'altar' | 'desafio'`; sin el campo `probabilidadDesafio` todo son altares y el trazado no cambia.

**Aspecto.** Misma plantilla de evento: el objeto central de `montar` se cambia por `desafio` (el altar con las runas rojas, `desafio_apagado` ya usado). Dos fotogramas más en `comunes` y el modelo 3D del altar con otro color y otra luz. *Mi apuesta; lo aprueba Pedro.*

**Interacción.** Al acercarse se abre `EscenaEvento` con dos opciones: *Aceptar el desafío* y *Marcharse*. Aceptar apaga el círculo (`hechas`) y encadena los combates a través de `iniciarCombate`, con `CombateGuardado` `{ tipo: 'desafio', paso }`: cerrar el navegador repite el combate en curso con la vida de entonces y sigue la cadena. Los grupos salen de la semilla de la zona y la sala, así que son los mismos al volver. En los dos primeros combates `recuperacionTrasVictoria` vale 0 (`reglasDesafio`); el último recupera como siempre. Entre combate y combate la heroína puede usar objetos, repartir puntos y equiparse como siempre.

**Equilibrio.** Un desafío sustituye a una sala de combate: da la experiencia de tres grupos (parecida a la de 2-4 de la sala que sustituye) sin las recuperaciones y con un cofre. La política simulada acepta con al menos el 60 % de los PV. El número de combates y la fracción de desafíos son lo que se afina; objetivo, como el altar: ±3 puntos con la probabilidad real.

**Decisiones tomadas al ejecutar la entrega 2c.**
- *Se reutiliza la plantilla de evento:* el objeto central de `montar` pasa de `altar` a `desafio` (un fotograma nuevo en `comunes`, el modelo 3D con runas rojas y su luz); apagado, el círculo es el `altar_apagado`.
- *Los combates se encadenan desde el mapa* con `iniciarCombate` y `{ tipo: 'desafio', paso }`; el siguiente se lanza en el fotograma siguiente a ganar (`desafioPendiente`), porque `main.ts` guarda la partida al volver al mapa y ese guardado pisaría el del siguiente combate.
- *«Sin recuperación» no incluye la subida de nivel:* subir de nivel restaura parte de la vida y los PM, también entre los combates del desafío.
- *Equilibrio (2400 partidas, ronin / maga, sin eventos → con la mezcla real: probabilidad 0,4 y la mitad desafíos):* Fácil 73,5 / 72,3 → 73,6 / 73,0, Normal 46,3 / 52,6 → 46,0 / 50,2, Difícil 26,1 / 29,8 → 25,0 / 29,2; la peor celda es la maga en Normal (−2,4). Con todos los eventos como desafío (1200 partidas) la peor es −3,5, también la maga en Normal; con el desafío forzado en las cuatro zonas baja de 2 a 7 puntos. La política simulada (acepta con al menos el 60 % de los PV, nunca huye) es mía y sencilla.

**Fuera de esta entrega.** El ermitaño (2b), un premio propio del desafío, desafíos más duros que los combates normales y avisar antes de aceptar de qué grupos se trata.
