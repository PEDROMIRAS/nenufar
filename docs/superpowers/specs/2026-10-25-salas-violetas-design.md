# Salas violetas: jefes extra, cofre trampa y recompensas especiales

Diseño acordado con Pedro el 2026-10-25. Primer bloque de la versión 2, antes del port a HD-2D.

## Por qué

Los probadores terminan la partida, pero muchos no repiten porque «es igual cada vez». Este bloque añade sorpresa y un reto opcional sin tocar la historia principal: el camino de siempre sigue igual, pero cada partida puede esconder salas distintas, con jefes que no conoces y premios que no sabes que existen.

Va antes del port a HD-2D porque casi todo es lógica (`src/core/`) y datos (`src/data/`), que pasan tal cual al 3D. Los monstruos y las heroínas siguen siendo sprites en HD-2D, así que su arte nuevo también se aprovecha.

## Objetivos

- Que dos partidas seguidas se sientan distintas: en una zona hay sala violeta y en otra no, el jefe cambia, el premio cambia y a veces un tesoro es una trampa.
- Un reto opcional de verdad: los jefes violetas son más duros que los de zona.
- Misterio: el jugador descubre las salas explorando y no sabe qué recompensa le toca. El hueco del Corazón del dragón ni se sospecha hasta que se consigue.

## Fuera de alcance

- Cambiar la historia principal, los jefes de zona o el jefe final.
- Tienda, mercader o moneda.
- Modificadores de partida (reglas que cambian cada partida): idea aparte, para después.
- Logros nuevos para estas salas (posible más adelante).

## Lo que haría que saliera mal aunque funcione

- Que las salas violetas sean obligatorias en la práctica, porque sin el premio el juego se vuelve injusto. El camino principal tiene que seguir siendo equilibrado sin ellas.
- Que un premio deje el resto de la partida sin reto (por ejemplo, la quinta habilidad en el Bosque).
- Que el cofre trampa se distinga de un tesoro de verdad antes de abrirlo.
- Que el jugador pueda saber desde el principio de la zona si hay sala violeta.

## Reglas del proyecto que se mantienen

- `src/core/` es lógica pura, sin nada del navegador, con tests de Vitest.
- Ningún número de diseño en el código: probabilidades, estadísticas, poder de las habilidades y colores van en `src/data/*.json`.
- Lo que diferencia a las heroínas, en `heroes.json`; nada de `if (heroina === 'maga')`.
- Todo lo aleatorio con el PRNG con semilla: con `?semilla=N` la partida, salas violetas incluidas, se repite igual.
- Cero asignaciones de memoria dentro del bucle de juego.
- Arte generado por script en `tools/generadores/`, nunca a mano. Las imágenes que Pedro trajo son referencias de concepto, no se copian.
- Equilibrado: `tests/equilibrado.test.ts` mantiene sus objetivos (Fácil 85-90 %, Normal 70-75 %, Difícil 50-55 %, menos de 5 puntos entre heroínas) para la partida **sin** salas violetas.

## Lo que decidió Pedro

### Salas violetas (jefes extra)

- Cada zona puede tener una sala violeta, y como mucho una. **Toda partida tiene al menos una**: si al generar la última zona no ha salido ninguna en las anteriores, sale seguro en esta.
- El jugador no sabe si la zona tiene una al entrar en ella. En el minimapa sale con un **punto violeta** cuando se ve su contorno (al visitar una sala vecina), igual que el cofre, la fuente o el jefe ahora; en gris cuando ya está vencida.
- Jefe de cada zona:

  | Zona | Jefe violeta | Idea de combate |
  | --- | --- | --- |
  | Bosque | Árbol maldito (un árbol con cara, ramas como garras y raíces) | Lento y muy resistente; atrapa con raíces (un estado que impide actuar o huir) |
  | Ruinas | Caballero maldito (armadura completa, capa roja, espadón) | Pesado y defensivo; pega fuerte y despacio |
  | Cripta | Ojo flotante con tentáculos | Estados alterados con la mirada |
  | Cualquiera | **Dragón negro** | El más raro y el más duro; su golpe cargado es un aliento de fuego |

- El dragón negro puede salir en cualquier zona, en lugar del jefe violeta de esa zona. Es el más raro de encontrar.

### Cofre trampa

- A veces una zona tiene una **tercera sala de tesoro** además de las dos de siempre. En el minimapa y en la sala se ve igual que un tesoro normal (punto ámbar, mismo cofre). Al abrir el cofre, es el monstruo y empieza el combate.

### Recompensas de los jefes violetas

- Hay tres recompensas por heroína. Cada jefe violeta vencido da **una al azar entre las que la heroína aún no tiene** (sin repetir):

  | Recompensa | Ronin | Maga |
  | --- | --- | --- |
  | Arma especial | Katana sagrada | Bastón arcano |
  | Armadura especial | Armadura samurái completa (casco con cuernos, placas) | Túnica arcana |
  | Quinta habilidad | **Tajo de llama morada**: un corte en área muy potente, con llamas moradas | **Cometa arcano**: daño mágico en área muy potente que además rompe el golpe cargado que estén preparando los enemigos alcanzados |

- La quinta habilidad no se desbloquea por nivel, como las otras cuatro, sino al conseguirla como recompensa.
- **La fuerza del premio sube con la heroína**, para que ningún premio rompa la partida aunque salga en el Bosque: el arma y la armadura especiales son siempre algo mejores que la mejor pieza normal de su hueco para el nivel de la heroína (sus bonos crecen al subir de nivel), y la quinta habilidad cuesta muchos PM, así que a nivel bajo apenas se puede usar.

### Dificultad de los jefes violetas

- Una heroína que entra al terminar de explorar la zona gana **cerca del 75 % en Fácil, del 60 % en Normal y del 45 % en Difícil**. Lo comprueba el simulador, como el equilibrado de la partida.
- La armadura samurái y la túnica arcana cambian el aspecto de la rana más allá de recolorear: piezas nuevas dibujadas sobre su sprite (casco, placas, estrellas en la túnica), generadas por script.

### El dragón negro

- Además de su recompensa al azar, da el **Corazón del dragón negro**: si la heroína cae en combate, se levanta con media vida en vez de perder la partida. Se gasta al usarse.
- Al conseguirlo aparece en el inventario un **hueco nuevo que antes no existía**, el del Corazón. Hasta vencer al dragón en esa partida, el jugador no ve ese hueco.

## Decisiones mías (Pedro puede cambiarlas)

- **Probabilidades** en `zonas.json`: probabilidad de sala violeta por zona, de que el jefe sea el dragón y de que haya cofre trampa.
- **Entrar en una sala violeta** funciona como cualquier sala con monstruos: se cierran las puertas al entrar y, al tocar al jefe, sale su presentación (como los jefes de zona) y su frase. Perder es fin de la partida.
- **Dureza y dificultad:** los jefes violetas son más duros que el jefe de su zona y se ajustan con los multiplicadores de `dificultades.json`, como todos los monstruos, hasta dar los porcentajes de victoria acordados.
- **Sitio en el Bosque:** con 8 salas solo queda un callejón libre, así que no caben a la vez la sala violeta y el tesoro trampa. Quien construya decide cómo (por ejemplo, una sala más en el Bosque), sin que cambie la sensación de la zona.
- **Cofre trampa:** es un monstruo, no un jefe. Al vencerlo da el botín normal de un cofre de esa zona. No da recompensa especial.
- **Tamaños:** jefes violetas en 48 px de alto; el dragón en 64×48 como el Rey sin Charca. Ninguno sube más de ~42 px sobre los pies, para no tapar su nombre en combate.
- **Frases:** cada jefe violeta tiene una frase al aparecer y otra al caer en `historia.json`, como los jefes de zona. Las escribo yo y Pedro las revisa.
- **Efecto especial de las armas:** la katana sagrada y el bastón arcano tienen un efecto propio además de sus bonos (como el veneno de la hoja rúnica), para que se sientan especiales. Cuál, lo propongo en el plan.
- **El hueco del Corazón** sigue visible y vacío después de gastarlo, como recuerdo.
- **Color violeta** del minimapa: distinto del morado del portal y del fuego para que no se confundan.
- **Bestiario y logros:** los jefes violetas y el cofre trampa no cuentan en el total del bestiario ni para el logro «Naturalista», y no aparecen como «???» antes de vencerlos. Al vencer uno, entra en el bestiario. Así el bestiario no delata que existen.
- **El dragón según la zona:** hay una ficha del dragón por zona, con las estadísticas ajustadas a ella; es el jefe violeta más duro **de su zona**, no de todo el juego. En el Bosque no puede ser un muro imposible a nivel 2.
- **Un dragón por partida como mucho:** si ya ha salido en una zona, no vuelve a salir. Así hay un solo Corazón.
- **El Corazón vive en la partida:** no se guarda entre partidas. En cada partida nueva el hueco vuelve a estar oculto.
- **El cofre trampa en el equilibrado:** como no se distingue de un tesoro, cuenta como parte de una partida normal. El simulador lo incluye con su probabilidad, y los objetivos de `tests/equilibrado.test.ts` se mantienen. El cofre trampa es un monstruo fuerte, no un jefe.
- **Experiencia:** los jefes violetas dan experiencia como cualquier monstruo, en proporción a su dureza.

## Lo que queda para quien lo construya

- Cómo encaja la sala violeta en el generador de zonas (`src/core/zona.ts`, que ya coloca jefe, tesoros y descanso en los callejones) y qué hacer si una zona no tiene callejón libre.
- Las plantillas de sala violeta (una o varias por zona en `plantillas_<zona>.json`).
- Estadísticas, acciones, golpes cargados y fases de los cuatro jefes y del cofre trampa, comprobados con el simulador.
- Cómo se guarda qué recompensas tiene la heroína y el Corazón (la partida no se guarda a medias: basta con el estado de la partida en curso).
- Dónde va la comprobación de «se desbloquea con una recompensa» de la quinta habilidad (hoy `habilidadesDisponibles` mira el nivel).
- Cómo afecta el Corazón al flujo de derrota del combate y a la escena.
- El efecto y el sonido de las dos habilidades nuevas, siguiendo `heroes.json` y `sonido.json`.
- Los generadores de arte de los cuatro jefes, el cofre trampa y las piezas de equipo especiales.
