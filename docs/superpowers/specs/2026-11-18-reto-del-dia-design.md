# Reto del día: diseño

Fecha: 2026-11-18. Último hito de la auditoría con las skills de gamedev, replanteado con Pedro: la escalera de
dificultad tras la primera victoria queda descartada para este público y la partida diaria se convierte en un
modo corto.

## Por qué

Pedro: el público es **quien llega desde el portafolio**, que **se queda unos minutos y se va**, y lo que se
busca es **que quiera repetir**. Hoy esos minutos se van en entrar (unas nueve pulsaciones: rana, dificultad,
nombre, puntos, historia) y una partida completa son cuatro zonas y más de 50 salas: el visitante no termina
nada ni ve un motivo para volver a intentarlo. La escalera premiaría solo a quien ya ha ganado, que no es él.

## Qué es

Un modo aparte, **«Reto del día»**, que se empieza desde la portada, se juega en unos 5 minutos y acaba siempre
en una tarjeta de resultado con «Otra vez». El mapa sale de la fecha: **hoy todos juegan el mismo y «Otra vez»
repite ese mismo mapa** (decisión de Pedro: así se aprenden las salas y se mejora el tiempo). Mañana es otro.

## Objetivos

1. Del botón a la primera sala, como mucho **dos pulsaciones** (el botón y la rana).
2. Una partida del reto dura **unos 5 minutos** (entre 3 y 8) jugando con normalidad.
3. Acaba siempre, ganes o pierdas, en una tarjeta con lo conseguido y **«Otra vez»**, que vuelve a la primera sala
   del mismo mapa en una pulsación.
4. Quien lo intenta por primera vez gana más o menos **la mitad** de las veces.
5. Récord del día y cuántos días distintos se ha jugado, guardados en el navegador.

## No objetivos

- Marcador entre jugadores, compartir el resultado, cuentas o servidor.
- Escalera de dificultad, otras zonas en el reto, variantes semanales.
- Cambiar la partida normal (su flujo, su equilibrado, sus récords y logros).
- Guardar a mitad el reto (si se cierra, se pierde: dura 5 minutos).

## Anti-objetivos

- Que el reto enseñe un juego distinto del de verdad: es el mismo Bosque, la misma rana, el mismo combate.
- Que se cuele un menú entre el botón y el juego, o entre la muerte y «Otra vez».
- Que «Otra vez» dé otro mapa, o que el mapa cambie a lo largo del día.
- Que el reto toque los récords, logros o el bestiario de la partida normal, o el guardado de la partida normal.
- Que salga tan fácil que se gane sin entender el combate, o tan difícil que el visitante no pase de la segunda
  sala.

## Enfoques

- **A. Reto del día (elegido por Pedro):** modo corto con entrada directa, semilla del día y tarjeta final con
  «Otra vez». Es lo único que permite al visitante empezar, terminar y querer repetir dentro de su visita.
  Cuesta un modo nuevo y un equilibrado corto.
- B. Entrada y repetición rápidas en la partida normal (saltar nombre e historia, «Reintentar» al morir): más
  barato y sin equilibrado, pero el visitante sigue sin terminar nada en unos minutos. Queda como idea para
  la partida normal.
- C. Escalera de dificultad tras ganar: descartada para este público (casi nadie llega a ganar).

## Diseño

**Entrada.** En la portada, un botón «Reto del día» (*mi elección*: en horizontal, centrado sobre «Pulsa o toca
para empezar»; en vertical, encima de los dos botones de abajo; con flechas, cruceta o mando se llega a él como
a los otros). Al pulsarlo, la pantalla de elegir rana que ya existe (un toque, o confirmar con teclado o mando) y
directamente la primera sala. Si hay una partida normal guardada (hoy salta la portada al abrir el juego), eso
no cambia: el reto se empieza desde la portada cuando se llega a ella, y la partida guardada sigue intacta. Sin dificultad, nombre, puntos ni historia: la rana lleva su nombre de
`heroes.json`, y al entrar sale un cartel de dos líneas («Reto del día · <fecha>» y «Llega al Guardián del
Bosque»; *mi elección*). Con «Pulsa o toca para empezar» todo sigue como hoy.

**El mapa.** El Bosque en pequeño, generado con `generarZona` (*mi elección*: 8 salas, que es el mínimo que deja
varias salas de combate, un tesoro, el descanso y el jefe; las ramas de 3 exigen 2 + 3k). **Los números del reto
van en un JSON propio** (`src/data/reto.json`, *mi elección*): salas, grupos por sala (*mi apuesta*: 1-2, en vez
de 2-4), tesoros, multiplicadores de dificultad y lo que haga falta para el equilibrado. Sin sala violeta, sin
cofre trampa, sin eventos y sin presagio (*mi elección*: un primer contacto sencillo). Jefe: el Guardián del
Bosque. Música y sonido, los del Bosque.

**La semilla del día.** Sale de la fecha local del navegador (*mi elección*: `AAAAMMDD` como número, pasada por
la mezcla que ya usa el juego). La misma fecha da la misma zona, los mismos grupos y los mismos cofres; el azar
del combate también sale de esa semilla, así que dos intentos iguales dan lo mismo. Si el reto está abierto al
pasar la medianoche, sigue con el mapa con el que empezó; la tarjeta final y «Otra vez» usan la fecha de ese
intento (*mi elección*), y el siguiente desde la portada ya es el del nuevo día.

**Durante el reto.** El juego de siempre: mapa, combate, cofres, fuente, mochila (la pausa funciona). Los puntos
de mejora se reparten **solos** al subir de nivel, con un orden por heroína guardado en `heroes.json` (*mi
elección*: el mismo que usa el simulador, ronin ataque-PV-defensa y maga magia-PV-PM), y sale el aviso de
subida de nivel como siempre, sin abrir la pantalla de puntos. «Salir» de la pausa vuelve a la portada sin
tarjeta. El reto no se guarda (si se cierra, se pierde) y **no toca la partida normal guardada**: si había una,
sigue ahí después.

El tiempo del reto no cuenta la pausa (*mi elección*). Un «día jugado» es una fecha en la que se acabó al
menos un intento, ganado o perdido.

**La tarjeta final.** Al vencer al Guardián o al caer, se funde a una tarjeta (estilo lavanda de `marco.ts`, en
las tres formas de pantalla) con:

- el resultado: «¡Guardián vencido!» y el tiempo, o «Caíste en la sala N de M» (*mi elección*: medido por salas
  superadas, para que perder también diga cuánto se avanzó);
- tu mejor resultado de hoy **con esa rana** («Tu mejor de hoy con la ronin»: un tiempo si has ganado alguna vez
  hoy con ella; si no, la mejor sala alcanzada), marcado «¡Nuevo récord!» si este intento lo supera. **Un récord
  por rana** (decisión de Pedro: así la otra rana sigue teniendo su récord por batir y da otro motivo para
  repetir);
- «Días jugados: N»;
- dos botones, **«Otra vez»** (elegido por defecto: una pulsación lo lanza con la misma rana) y «Portada».

Una victoria siempre supera a una derrota; entre victorias gana el menor tiempo; entre derrotas, la sala más
lejana.

**Guardado del reto.** En `localStorage`, con una clave propia separada de los récords (*mi elección*:
`nenufar.reto`): la fecha del último día jugado, el mejor resultado de ese día de cada rana (por su clave de
`heroes.json`) y la cuenta de días distintos. Al llegar un día nuevo, los mejores resultados se reinician y los
días suben uno. Lectura y escritura protegidas
(si el almacenamiento falla, el reto se juega igual, sin récord).

**Lógica pura en `src/core/`** con test: la semilla de una fecha, la comparación de resultados, la actualización
del guardado del reto con un resultado y una fecha, y el reparto automático de puntos.

## Equilibrado

Objetivo: que gane **más o menos la mitad de quienes lo prueban por primera vez**. El simulador juega mejor que
un recién llegado, así que el objetivo simulado es **60-70 % de victorias con cada heroína**, con menos de 5
puntos entre ellas (*mi elección*), medido con la misma jugadora simulada y sobre muchas fechas distintas
(muchas semillas), no sobre una. Además, **ninguna fecha imposible**: con ninguna semilla del simulador una
heroína gana menos del 35 % (*mi elección*; el mapa de un día debe ser justo para todos). Se garantiza
**solo afinando** (*mi elección*): el test lo comprueba sobre una muestra amplia de fechas (al menos un año de
días seguidos) y se acepta que una fecha fuera de la muestra pueda salir algo peor. Con 8 salas y 1-2 grupos el
mapa varía poco de un día a otro; si la muestra enseña días malos, el siguiente paso sería saltar de semilla
con una regla barata, y eso pide otra decisión. Palancas: los
multiplicadores del reto en `reto.json` (ataque, vida, recuperación tras ganar) y los grupos por sala; no se
tocan las fichas de los monstruos ni de las heroínas (el equilibrado de la partida normal no cambia). Hace falta
un test que guarde el rango, como `tests/equilibrado.test.ts`.

## Restricciones

`src/core/` sin navegador; números en `src/data/`; nada de `if (heroina === ...)` en la lógica; cero asignaciones
por fotograma; español en código, textos y commits; teclado, táctil y mando con los textos por dispositivo de
siempre; las tres formas de pantalla (ventana, menú, interfaz alta).

## Cómo se comprueba

Tests de la lógica pura y del equilibrado; capturas con Playwright del botón en la portada (1000×640 y 390×844),
la entrada directa, una sala del reto y la tarjeta final ganando y perdiendo (la tarjeta se puede forzar con un
atajo de desarrollo, *mi elección*: `?reto=gana` / `?reto=pierde`). Medir con el simulador cuánto dura un reto
(número de combates y turnos) como aproximación a los 5 minutos; la duración real la confirma Pedro jugando.

## Lo que queda al constructor

La posición exacta del botón y de la tarjeta, cómo se reutilizan la escena del mapa y `crearPartida` para el modo
reto sin duplicarlas, la forma de `reto.json`, los textos menores de la tarjeta y el atajo de desarrollo.
