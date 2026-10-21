# Nenúfar — El Eclipse de las Mil Charcas

Historia del juego, elegida por Pedro entre dos propuestas (la otra, más luminosa, era «el Gran Nenúfar se apaga»). Tono de leyenda: mítico, oscuro, con un final agridulce, al estilo de los Final Fantasy clásicos. Sin chistes.

## Por qué una historia, y sus límites

- El juego quiere sentirse como un JRPG clásico: la heroína tiene un motivo y el viaje va hacia algo.
- Una partida dura de 5 a 15 minutos, y se puede ganar sin entrar en todas las salas. La historia no puede frenar eso: pocos momentos, textos cortos y todo se pasa con un toque.
- Las dos ranas recorren el mismo camino, pero cada una tiene su motivo y su final.

## La leyenda

Cada mil años la luna se apaga, y con ella despierta el **Rey sin Charca**, que se bebe el agua del mundo para no morir nunca.

Hace mil años lo selló la **Orden del Nenúfar**, una hermandad de ranas guerreras y magas, bajo la Cripta de los Héroes. La luna volvió a encenderse. De la Orden ya no queda nadie.

Esta noche empieza el eclipse. Las charcas se secan una a una. Solo resiste el **Gran Nenúfar**.

**El giro:** el Señor de la Cripta es el héroe de la Orden que venció al Rey sin Charca hace mil años. Para derrotarlo bebió su poder, y con los siglos se convirtió en él. El combate final pregunta si la heroína romperá el ciclo o lo repetirá. Las dos lo rompen, cada una a su manera, y las dos pagan un precio.

## Las heroínas

| | Rana ronin | Rana maga |
| --- | --- | --- |
| Quién es | La última portadora de la espada de la Orden | La última maga de la luna |
| Por qué va | Su maestro la preparó para este día; no pensó que llegaría sola | Rompió el sello sin querer, leyendo un libro prohibido |
| Qué la une al villano | El Señor de la Cripta empuña la espada hermana de la suya | Su fuego morado es luz de luna guardada desde el eclipse anterior, lo único que él teme |
| Final | Clava su katana en el sello y se queda como su guardiana, sin beber el poder | Gasta todo su fuego para volver a encender la luna y pierde la magia para siempre |

## El viaje

Cada zona tiene un cartel al entrar (nombre y una o dos líneas) y su jefe dice una frase al empezar el combate y otra al caer.

### Bosque de la Última Lluvia

> Aquí cayó la última lluvia antes del eclipse. El agua se pudre entre los árboles.

**Rey Limo.** Era el espíritu de la lluvia; el agua podrida del eclipse lo ha convertido en un monstruo.

- Al empezar: «El agua... es... mía.»
- Al caer: «La lluvia... recuerdo... la lluvia...» (la lluvia vuelve un momento y deja ver el camino a las Ruinas)

### Ruinas de la Orden

> La capital de la Orden del Nenúfar. Sus guardianes de piedra aún vigilan un sello que ya está roto.

**Golem.** Guardaba el sello del Rey sin Charca. Le arrancaron la runa para abrirlo, y ahora obedece a quien la tiene. Es un guardián que no quiere luchar.

- Al empezar: «Guardián... del sello. No puedo... detenerme.»
- Al caer: «La runa... llévatela. Termina... lo que empezamos.»

### Cripta de los Héroes

> Aquí descansan los héroes de la Orden. Algo los está despertando.

**Reina Araña.** Envuelve los huesos de los héroes en seda negra para levantarlos como soldados del Rey: de ahí los esqueletos y el caballero oscuro.

- Al empezar: «Los héroes duermen mejor envueltos en seda. Pronto, tú también.»
- Al caer: «Mi señor... ya está despierto. Llegas tarde.»

### El Señor de la Cripta

Tras el portal de la Cripta, el combate final.

- Al empezar: «Yo también llegué hasta aquí, hace mil años. Yo también lo vencí. Bebe, y no morirás nunca.»
- Al caer: «Rompe... lo que yo no pude romper.»

Sus avisos de fase (invocar esqueletos, niebla tóxica) se quedan como están en `monstruos.json`.

## Escenas

Cada pantalla es un texto corto sobre fondo oscuro, con la rana o el lugar si viene al caso. Se pasa con Enter o un toque.

### Inicio (después de elegir rana y dificultad)

Comunes a las dos:

1. Hace mil años, la luna se apagó y el Rey sin Charca se bebió el agua del mundo. La Orden del Nenúfar lo encerró bajo la tierra, y la luna volvió.
2. Esta noche, la luna vuelve a apagarse. Las charcas se secan una a una. Solo resiste el Gran Nenúfar.

Rana ronin:

3. Soy la última que lleva la espada de la Orden. Mi maestro me preparó para este día. No pensé que llegaría sola.
4. Al norte, el Bosque. Después, las Ruinas. Al final, la Cripta. Antes de que amanezca.

Rana maga:

3. El libro decía que el sello era una leyenda. Leí la palabra en voz alta. Esa misma noche la luna empezó a apagarse.
4. El fuego morado es luz de luna guardada. Si alguien puede volver a encenderla, soy yo. Me toca arreglarlo.

### Final (al vencer al Señor de la Cripta)

Rana ronin:

1. La espada de la Orden atraviesa el sello. La espada hermana cae al suelo, al fin en paz.
2. El poder del Rey sin Charca la llama. No bebe. Se queda.
3. Amanece. La luna vuelve, y con ella la lluvia sobre las mil charcas.
4. En la Cripta, una guardiana vigila un sello que esta vez nadie romperá.

Rana maga:

1. La maga reúne todo su fuego morado en un último hechizo.
2. La luna se enciende. Su bastón se apaga para siempre.
3. Amanece. Llueve sobre las mil charcas.
4. Ya no sabe hacer magia. Pero ha aprendido a cerrar lo que abrió.

Después, la pantalla de victoria con el resumen de la partida, como ahora.

### Derrota

Una línea antes del resumen: «Esa noche, la luna no volvió a encenderse.»

## Cómo encaja en el juego

- Textos comunes, carteles de zona y frases de los jefes en `src/data/historia.json`; las páginas de inicio y final de cada heroína, en su entrada de `heroes.json`. Nada de texto de historia en el código.
- Cada página es una pantalla de texto sobre fondo oscuro, sin ilustración; se pasa con Enter o un toque. Las frases de los jefes también: una pantalla con su nombre antes del combate y otra al caer (antes de la subida de nivel).
- El cartel de cada zona sale al entrar en ella; el HUD sigue diciendo «Bosque».
- **El ciclo:** quien vence al jefe final ocupa su lugar. Su nombre se guarda en el navegador y en la partida siguiente el jefe final es «<nombre>, Señora de la Cripta». Solo cuenta ganar; sin victorias previas es el Señor de la Cripta.
- Sin hacer (por ahora): la lluvia que vuelve un momento al caer el Rey Limo.
