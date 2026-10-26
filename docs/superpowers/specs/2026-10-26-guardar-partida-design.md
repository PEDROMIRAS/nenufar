# Guardar la partida (diseño)

Fecha: 2026-10-26. Aprobado por Pedro en la conversación: guardar al entrar en cada sala, sin
reintentos al morir y volviendo directamente a la sala con un mensaje para continuar.

## Para qué

Un probador pulsó Ctrl+W sin querer y perdió la partida. El guardado es **una red de seguridad
contra cierres accidentales** (pestaña, ventana, el móvil que descarta la pestaña), no un sistema
de partidas guardadas: hay una sola partida en curso, se guarda sola y no hay menú ni ranuras.

## Objetivos

- Si el navegador se cierra con una partida a medias, al volver a abrir el juego se aparece
  **directamente en la sala donde se estaba**, con un mensaje encima («Partida recuperada» y
  «Pulsa o toca para continuar»). No se pasa por la portada.
- Se recupera el estado que había **al entrar en esa sala**.

## No objetivos

- Varias partidas o ranuras, guardar a mano, exportar partidas.
- Recuperar un combate a medias: si se cerró durante un combate, se vuelve a la sala con los
  monstruos que quedaban vivos al entrar.
- Recuperar la posición exacta, los monstruos en mitad de su patrulla o la lluvia tras el jefe.

## Lo que lo estropearía (anti-objetivos)

- **Que sirva para hacer trampas.** Morir borra la partida, como ahora (decisión de Pedro: «si
  mueres, comienzas de nuevo»). No debe poder reintentarse un combate ni volver a sortear un
  cofre cerrando y abriendo el navegador.
- Que un guardado viejo o roto deje el juego colgado: si no se puede leer, se descarta en
  silencio y sale la portada.
- Que cambie el equilibrado: no hay curación ni ventaja nueva al recuperar.

## Cuándo se guarda y cuándo se borra

- **Se guarda al entrar en cada sala**, ya pasado el fundido: al empezar la zona (sala de inicio)
  y al cruzar una puerta. El portal no guarda por sí mismo: guarda la sala de inicio de la zona
  siguiente al entrar en ella.
- **Se borra** al morir (fin de la partida), al ganar al jefe final y con «Salir» en la pausa.
- Durante un combate o una escena encima del mapa (pausa, equipo, puntos, historia) no se guarda.

Consecuencia aceptada: lo que pase dentro de una sala (combates ganados, cofre abierto, fuente,
puntos gastados, objetos usados) no queda guardado hasta entrar en la sala siguiente. Si se cierra
antes, se repite esa sala desde su entrada.

## Qué se guarda

Todo lo necesario para reconstruir la partida, **y nada que pueda sacarse de la semilla**: las
salas se generan igual a partir de la semilla de la zona y del número de sala (`montar` en
`escenas/mapa.ts`), así que basta con guardar qué ha cambiado.

De la partida (`Partida` en `main.ts`):

- semilla, índice de la zona actual, clave de la heroína (`heroes.json`) y clave de la dificultad;
- `combates` (las tiradas de cada combate salen de él), `vencidos`, `violetas`, `dragonUsado`,
  `rival`;
- segundos de partida jugados hasta ahora (el tiempo con el navegador cerrado no cuenta).

De la heroína (`Luchador`): nombre, nivel, experiencia, puntos, pv/pvMax, pm/pmMax, ataque, magia,
defensa, velocidad, critico y habilidadesGanadas. Los estados y la defensa de combate no se
guardan: se guarda fuera de combate.

El inventario entero (`Inventario`: consumibles, arma, armadura, mochila, usados, recompensas,
corazon).

Del mapa de la zona (`EscenaMapa`):

- sala actual (su índice en `zona.salas`) y por qué lado se entró (null en la sala de inicio);
- salas visitadas y salas hechas (las del minimapa);
- por cada sala ya montada, qué grupos de monstruos están vencidos (por su posición en la lista
  de `poblar`, que es determinista);
- si se usó la fuente.

Los cofres abiertos y el portal abierto se deducen de las salas hechas (una sala de tesoro hecha
tiene el cofre abierto; una sala del jefe hecha tiene el portal).

## Al recuperar

1. Al cargar el juego, si hay partida guardada y se puede leer, se crea la partida con esos datos
   (en vez de la portada) y la zona guardada, con la heroína en la sala guardada, en la entrada por
   la que llegó (o en el inicio de la sala de inicio).
2. Encima se enseña el mensaje de recuperación con el mismo sistema que las páginas de historia
   (`contar` en `main.ts`); al pulsar, sigue el juego. Ese toque también sirve para que el
   navegador deje sonar el audio.
3. No se repiten la historia del principio, el cartel de la zona ni las pistas de controles.
4. Las puertas se cierran como siempre si la sala tiene monstruos vivos.
5. Ojo: `crearZona` suma `violetas` y marca `dragonUsado` al crear la zona. Al recuperar, la zona
   se vuelve a crear: hay que guardar esos dos valores tal como estaban **antes** de crear la zona
   actual, para que el sorteo del jefe violeta salga igual y no se cuente dos veces.
6. La heroína se viste con su equipo (`vestir` en `main.ts`), como al cambiarlo en la pausa.

## Contra las trampas con los cofres

Hoy el contenido de un cofre sale de `azarMapa`, un generador que avanza con todo lo que pasa en la
zona; al recuperar empezaría de nuevo y el mismo cofre daría otra cosa. **El sorteo de cada cofre
debe depender solo de la semilla de la zona y del número de sala**, como ya pasa con el montaje de
las salas. Con eso, cerrar y volver a abrir no cambia lo que hay dentro. (Cambia lo que dan los
cofres con una semilla dada respecto a hoy; no importa.)

Los combates ya salen de `semilla` y `combates`, que se guardan: repetir un combate tras cerrar da
las mismas tiradas.

## Aviso al cerrar (propuesta de Claude)

Mientras haya partida en curso, el navegador pregunta «¿Seguro que quieres salir?» al cerrar la
pestaña o pulsar Ctrl+W (evento `beforeunload`). Es lo que habría evitado lo del probador. En el
móvil no sale, por eso el guardado sigue haciendo falta. No sale en la portada ni tras el fin de la
partida.

## Restricciones

- Cambia una regla fija de CLAUDE.md: `localStorage` pasa a guardar ajustes, récords **y la
  partida en curso** (en su propia clave). Hay que actualizar CLAUDE.md y el documento de
  desarrollo.
- `src/core/` sigue sin tocar el navegador: pasar la partida a datos guardables, comprobarlos y
  reconstruirla va en `core` y se prueba con Vitest; leer y escribir en `localStorage`, en
  `render/almacen.ts` como los ajustes.
- Los datos se guardan por clave (heroína, dificultad, objetos, monstruos), nunca copiando los
  JSON del juego: si un número de diseño cambia en una versión nueva, la partida recuperada usa el
  nuevo.
- El guardado lleva un número de versión. Si no coincide, o falta algo, o una clave ya no existe
  (una pieza de equipo renombrada), se descarta.
- Nada de esto puede asignar memoria dentro del bucle de juego por fotograma: guardar ocurre al
  cruzar una puerta, no en cada fotograma.

## Queda a criterio de quien lo construya

- La forma exacta de los datos guardados y el nombre de la clave de `localStorage`.
- Cómo se pasa a `EscenaMapa` el estado recuperado (opción nueva en `OpcionesMapa` o un método).
- El texto exacto del mensaje (en el tono del juego).
- Qué hacer con `?semilla=N` en la URL si hay partida guardada (propuesta: se recupera la guardada;
  la semilla solo vale para partidas nuevas).

## Cómo se comprueba

- Tests de `core`: ida y vuelta (guardar y recuperar da la misma partida), guardado de otra
  versión o con claves desconocidas descartado, y el mismo cofre da lo mismo tras recuperar.
- En Edge sin ventana: jugar hasta una sala, recargar la página y ver que se sale en esa sala con
  el mensaje; morir y recargar y ver la portada.
- Pedro lo prueba en el móvil cerrando la pestaña.
