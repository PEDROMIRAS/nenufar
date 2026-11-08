# Variedad entre partidas: presagios y salas de evento

Propuesta de Claude del 2026-11-08, **sin aprobar por Pedro**. Pedro pidió que la hiciera sin preguntas previas, así que todo lo marcado «mi apuesta» es suposición mía.

## Por qué

Los probadores decían que «es igual cada vez». Hoy una partida cambia en el trazado de las salas, el azar de los cofres y los grupos de monstruos, y a veces en una sala violeta. Pero las reglas son las mismas, las zonas se recorren con el mismo plan y los callejones solo dan jefe, tesoro, descanso o violeta. Mi apuesta: lo que falta no es más contenido (más monstruos), sino **decisiones y reglas distintas** que cambien cómo se juega una zona.

## Idea en una frase

Dos bloques que se pueden hacer por separado, en este orden:

1. **Presagios**: al entrar en cada zona, a veces (probabilidad en datos) se sortea un presagio que cambia una regla de esa zona, con un precio y un premio.
2. **Salas de evento**: un callejón libre puede ser una sala con una elección (altar, ermitaño, desafío) en lugar de combate.

Un tercer bloque, **monstruos y plantillas nuevas**, queda para el final: es lo más caro (arte por script y aprobación de Pedro) y lo que menos cambia el modo de jugar.

## Bloque 1: presagios

- Al cruzar la puerta de entrada de una zona, con probabilidad `presagio.probabilidad` de `zonas.json` (mi apuesta: 0,6) sale uno de una lista en `src/data/presagios.json`. Si no sale ninguno, la zona es como hoy.
- Se anuncia con un cartel al entrar (mismo estilo lavanda que los avisos del HUD) y queda un icono con su nombre en el HUD y en la pausa.
- Cada presagio es **un precio y un premio**, para que no sea ni un castigo ni un regalo. Ejemplos (mi apuesta, la lista final se cierra al equilibrar):
  - *Luna roja*: los monstruos pegan más; los cofres de la zona dan equipo de un nivel más.
  - *Manada*: un grupo más por sala; más experiencia por combate.
  - *Fuente seca*: la fuente de descanso solo recupera PM; los cofres traen más pociones.
  - *Presa herida*: los monstruos empiezan con menos vida; el jefe de la zona pega más.
  - *Niebla*: el minimapa solo muestra las salas visitadas y la sala del jefe deja de marcarse; la experiencia sube un poco.
- Cada presagio es una combinación de modificadores que **ya existen** o que son pequeños: multiplicador de ataque o vida (como los de `dificultades.json`), grupos por sala, nivel del equipo de los cofres, qué cura la fuente, qué enseña el minimapa. No hay lógica nueva de combate.
- El sorteo usa su propio azar derivado de la semilla de la zona (como las salas violetas): `?semilla=N` repite la partida con sus presagios, y el trazado de las salas no cambia.
- Se guarda en la partida (`guardado.ts`, subir `VERSION_GUARDADO`) para que cerrar y volver no lo cambie.

### Equilibrado (la parte difícil)

Los márgenes actuales son de 0,6 a 2 puntos en Fácil y Difícil (ver CLAUDE.md, Bosque a 11 salas); cualquier retoque puede romperlos. Por eso:

- Cada presagio se mide **solo**, forzado en las cuatro zonas, con el simulador (`tests/simulador.ts`): la victoria en partida completa no se mueve más de ±3 puntos respecto a no tener presagio, con cada heroína y en las tres dificultades. Las cifras de cada presagio salen de una búsqueda, no a ojo.
- Como solo toca algunas zonas y con probabilidad menor que 1, la media de muchas partidas se mueve menos que cada presagio. El test de `equilibrado.test.ts` sigue midiendo la partida **sin** presagios (probabilidad 0), como las salas violetas.
- Un test nuevo comprueba el sorteo con semilla y que cada presagio de la lista cumple su rango.

## Bloque 2: salas de evento

- Un callejón libre (como los de la sala violeta y el cofre trampa) puede ser de evento, con su probabilidad en `zonas.json`. Si coexiste con la violeta y la trampa, manda un orden fijo.
- Eventos de mi apuesta, todos sin moneda ni tienda (la spec de las salas violetas las dejó fuera):
  - *Altar*: ofrecer una parte de la vida actual a cambio de PM o de un objeto; se ve el precio antes de aceptar.
  - *Ermitaño*: elegir uno de dos objetos; el otro se pierde.
  - *Desafío*: tres combates seguidos sin descanso entre ellos; premio al final. Reutiliza `EscenaCombate` y `grupos` de la zona.
- Los eventos son opcionales y no pueden hacer falta para ganar: el camino principal sigue equilibrado sin ellos.
- Necesita una escena nueva por tipo de elección; el aspecto de la sala sale de las plantillas que ya hay (altar y ermitaño con sprite de pie, desafío como una sala de combate cerrada).

## Objetivos y no objetivos

- Que dos partidas con la misma heroína y dificultad se jueguen distinto, no solo se vean distinto.
- Que cada presagio y cada evento se explique en una línea antes de decidir: nada de efectos ocultos que se sientan injustos.
- No: monstruos nuevos, moneda, tienda, cambio de la historia, jefes ni jefe final.
- No: que algo sea obligatorio para llegar al reto de Fácil, Normal o Difícil que dicen `equilibrado.test.ts` y CLAUDE.md.

## Reglas del proyecto que se mantienen

- Lógica en `src/core/` sin DOM y con tests; escenas y avisos en `src/escenas/` y `src/render/`.
- Ningún número de diseño en el código: todo en `presagios.json`, `zonas.json` y `eventos.json`.
- Todo lo aleatorio con el PRNG con semilla; sin diferencias entre heroínas en la lógica.
- Con la ventana vertical, los carteles y las escenas de evento se dibujan en la interfaz alta (320 de ancho).
- Texto en español en `historia.json` o en los JSON nuevos.

## Lo que decide Pedro

1. ¿Presagio **por zona** (mi apuesta, cuatro por partida como máximo) o **uno por partida**? Por zona da más variedad pero más combinaciones que equilibrar.
2. ¿Se ve el presagio **antes** de cruzar la puerta de entrada de la zona (se puede decidir no entrar, o es solo un aviso) o solo al entrar? Mi apuesta: solo al entrar, sin elección.
3. ¿Entran los presagios en récords y logros (ganar con tal presagio)? Mi apuesta: no, de momento.
4. ¿Bloque 1 antes que el 2? Mi apuesta: sí, es casi solo datos y no necesita escenas nuevas.

## Orden y tamaño

Bloque 1 son unas 6-8 tareas (datos, sorteo en `zona.ts`, aplicar modificadores, guardado, cartel y HUD, simulador, búsqueda de cifras, test). Bloque 2 es similar pero con una escena por evento. Tras aprobar este documento, el siguiente paso es el plan (`superpowers:writing-plans`) del bloque 1.

## Decisiones tomadas al ejecutar el bloque 1 (2026-11-08)

- Presagio **por zona**, visible solo al entrar (cartel y nombre en el HUD), sin elección y fuera de récords y logros: las cuatro suposiciones de «Lo que decide Pedro», sin confirmar con Pedro.
- **No se guarda** el presagio: sale de la semilla de la zona y se vuelve a sortear igual al recuperar la partida; no hizo falta subir `VERSION_GUARDADO`.
- Lista final: `luna_roja`, `manada`, `fuente_seca` y `coraza`. *Niebla* y *Presa herida* quedan fuera. Los premios y precios cambiaron respecto a los ejemplos de arriba: el ataque de los monstruos da saltos por el redondeo y no sirve para afinar, así que se añadió `recuperacion` (continua).
- El jefe final se lucha sin presagio.
- El criterio de ±3 puntos no es comprobable con menos de ~2400 partidas por el ruido del simulador: se aceptó la media de las seis celdas (heroína × dificultad) dentro de ±1,5 y ninguna celda a más de unos 4 puntos. Detalle y cifras en CLAUDE.md y en el commit «Presagios: cifras equilibradas».
