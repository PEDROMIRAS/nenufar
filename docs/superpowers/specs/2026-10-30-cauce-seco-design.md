# Cuarta zona: el Cauce Seco

Fecha: 2026-10-30. Estado: borrador para aprobar. Idioma del código, datos y textos del juego: español.

Lo que dijo Pedro va tal cual; lo que he decidido yo va marcado **(mi decisión)** para que se pueda revisar.

## Intención

Una cuarta zona, de fuego, entre la Cripta y el Rey sin Charca. Tiene que pegar con la historia que ya existe (la luna se apaga, el Rey se bebe el agua, las charcas se secan) y dar un reto distinto: **el jugador debe sentirse retado y amenazado por el fuego**.

Con ella llegan monstruos nuevos (Pedro ya tiene el arte de referencia de todos), y al mover algunos monstruos de zona hay que **reequilibrar todo el juego** (las tres zonas existentes incluidas).

### Objetivos
- Una zona completa jugable de principio a fin, con su jefe, su jefe violeta y su variante del Dragón negro, hecha igual que las otras tres.
- Que la historia siga siendo una línea sin saltos: Bosque → Ruinas → Cripta → Cauce Seco → Rey sin Charca.
- Que el equilibrado cumpla los mismos rangos de siempre (ver «Equilibrado»).

### No objetivos
- No se cambia el diseño de las tres zonas existentes más allá de repartir monstruos.
- No se añade la variedad de la versión 2 (más rutas, etc.) ni más enemigos por sala.
- No se crean más niveles de equipo que el 4 (ver «Equipo»).

### Antiobjetivos (lo que lo haría un fracaso aunque funcione)
- Una zona que sea una Cripta con otros colores.
- Un fuego que solo sea más daño: tiene que cambiar cómo se juega el combate (curarse, defender, rematar).
- Que las otras tres zonas queden claramente más fáciles o más difíciles que ahora al mover monstruos.

## Historia

La Orden del Nenúfar, sin luna, no se quedó a oscuras: sus sacerdotes encendieron una **luna falsa de fuego**. El agua que el Rey se bebió dejó un lecho de río seco, y en él levantaron un santuario. La luna falsa los consume y los corrompe. El camino hacia el Rey pasa por ahí.

- **Nombre de la zona:** Cauce Seco (clave `cauce`).
- **Posición:** zona 4. Después viene el jefe final. Hoy el final lo abre el Señor de la Cripta, que se transforma en el Rey sin Charca. **(Mi decisión: el Señor de la Cripta sigue siendo el jefe final con su nombre y su pelea, sin cambios de contenido. Solo cambia dónde se le encuentra: ya no al salir de la Cripta, sino al final del Cauce Seco, al que bajó a beber el agua robada. En el flujo del juego, el jefe final ya viene tras la última zona del orden de `zonas.json`; el Cauce Seco va como última clave y el Sacerdote es su jefe de zona, después del cual aparece el Señor igual que hoy aparece tras la Reina Araña. Los textos de `historia.json` que lo sitúan (cartel y frases de la Cripta, «Mi señor… ya está despierto») siguen valiendo; se revisan por si algo sobra.)**
- **Cartel de zona y frases del jefe:** las redacta quien construya, en el tono de `historia.json` (frases cortas entre comillas, voz rota). **(Queda al constructor.)** Idea de tono: el sacerdote habla de la luz que él dio al mundo.

## Reparto de monstruos

| Zona | Monstruos normales | Jefe | Violeta | Cambios |
|---|---|---|---|---|
| Bosque | Limo, Murciélago, **Jabalí**, **Cuervo** | Rey Limo | Árbol maldito | +2 |
| Ruinas | Esqueleto, Araña, Murciélago | Golem | Caballero maldito | sin cambios |
| Cripta | Caballero, Araña, **Lobo** | Reina Araña | Ojo flotante | −Espectro, +Lobo |
| **Cauce Seco** | **Acólito**, **Espectro**, **Salamandra de brasas** | **Sacerdote de la luna falsa** | **Monje oni** | zona nueva |

- El **Espectro** pasa de la Cripta al Cauce Seco. («El mago de fuego de la Cripta» es el Espectro, el que usa Llama de vela; confirmado por Pedro el 2026-10-30.)
- El **Dragón negro** sigue como jefe violeta opcional aleatorio. Hoy tiene una variante por zona (`dragon_negro_bosque|ruinas|cripta`); el Cauce Seco necesita la suya. Su arte sale del dragón de la imagen 6, con cola de fuego.
- **Lobo:** es la imagen 5. Encaja como héroe o cazador de la Orden que no descansa y, sin luna a la que volver, no es ya un hombre. **(Mi redacción de la historia; la decisión de que vaya a la Cripta es de Pedro.)**
- **Salamandra de brasas:** idea mía aprobada por Pedro. Es pequeña y rápida, el enemigo «básico» de la zona, equivalente al Limo. Es un anfibio que se quedó viviendo en el calor cuando el agua se fue.
- **Acólito:** la imagen 4 (encapuchado con báculo de calavera y llama en la mano). Es un mago: ataque mágico de fuego.
- **Grupos de la zona y de la Cripta:** se reescriben en `zonas.json` con las mismas formas que ya hay (1 o 2 monstruos, con pesos). **(Queda al constructor, ajustado con el equilibrado.)**
- **Estadísticas de los monstruos nuevos:** quedan al constructor, ajustadas con el test de equilibrado. Referencia de escala: la Reina Araña (jefe de la Cripta) tiene 192 de vida y el Señor de la Cripta 285.

## El jefe: Sacerdote de la luna falsa

Imagen 3: figura encapuchada con una aureola de fuego, que es la luna falsa. Va en 48 de alto como los demás jefes, sin subir más de ~42 píxeles sobre los pies para no tapar su nombre en combate.

Pedro pidió «retado, amenazado por el fuego» y eligió **mezclar** dos tipos de amenaza: presión constante (quemadura que te quita vida cada turno, poco margen para curarte) y golpes grandes anunciados (que se esquivan defendiendo). Con el peso en la presión constante.

Propuesta de combate **(mi diseño; las cifras las ajusta el constructor con los tests)**. Usa solo lo que ya existe: acciones con peso, fases por vida, habilidades con estado, ataque cargado con aviso e invocación.

- **Fase 1 (de 100 % a 60 % de vida):** ataca; *Llama* (objetivo todos, daño mágico bajo, estado quemadura); invoca dos acólitos.
- **Fase 2 (menos del 60 %):** aviso «¡La luna falsa se enciende!». La aureola crece. *Llama* sale más a menudo. Aparece *Eclipse*: golpe cargado de poder 4 (el aliento del dragón negro de la Cripta es 4), con aviso un turno antes.
- La quemadura ya existe como estado (la usa *Mirada ardiente* del Ojo flotante). Si hace falta que dure más o tenga otra duración, se ajusta en `estados`, no en el código.

El fuego tiene que ser **una amenaza de verdad** y a la vez justo: el aviso del Eclipse debe poderse leer, como los de los otros jefes.

## Aspecto de la zona

Elegido por Pedro entre tres bocetos: **la estructura de B con los colores de C**.

- **Estructura:** un santuario de la Orden. Muros de sillares, braseros en las paredes y un aro de fuego sobre cada puerta (la luna falsa).
- **Colores:** roca negra con matiz violáceo y vetas de fuego naranja. Los muros son bloques de obsidiana, no ladrillo rojizo.
- **Contra las otras zonas:** las Ruinas son de piedra beige cálida; la Cripta es violeta, fría y de luz difusa. El Cauce Seco es negro con **el naranja como única luz** y poca iluminación general. **(Mi interpretación de cómo distinguirlas.)**
- **Suelo, «lecho de río seco»:** losas de obsidiana con grietas y guijarros blanqueados entre ellas, para que no se pierda la idea del río. **(Mi decisión; Pedro puede quitarlo.)**
- **Fuera de la sala (3D):** la zona tiene su propia luz y su propio borde en `hd2d.json`, como las otras tres (luz, fondo, tipo de borde). El exterior de Ruinas y Cripta ya se había notado «muy plano»; en el Cauce Seco conviene que lo tenga trabajado desde el principio. **(Queda al constructor.)**
- Los fondos de combate y la presentación del jefe usan la sala 3D de esa zona, así que salen del mismo tileset.

## Arte que hay que generar

Todo el arte nuevo sale de los scripts de `tools/generadores/` (determinista), tomando como referencia las siete imágenes que Pedro pasó, copiadas a `docs/superpowers/mockups/cauce-seco-referencias/`:

| Referencia | Para qué |
|---|---|
| 1 jabalí | monstruo normal del Bosque |
| 2 cuervo de ojos brillantes | monstruo normal del Bosque |
| 3 sacerdote con aureola | jefe del Cauce Seco |
| 4 encapuchado con báculo de calavera | Acólito |
| 5 lobo oscuro de garras rojas | monstruo normal de la Cripta |
| 6 dragón con cola de fuego | variante del Dragón negro para el Cauce Seco |
| 7 monje oni con máscara y fuego | jefe violeta del Cauce Seco |

Falta referencia para la **Salamandra de brasas** (la idea es mía): la dibuja el constructor con el mismo método que los monstruos pequeños (Limo, Murciélago).

Además: el tileset del Cauce Seco (`<zona>.json`, autotiles, plantillas ASCII `plantillas_cauce.json` con el mismo formato y número de plantillas que las otras zonas) y los efectos de fuego que haga falta.

Las referencias son pixel art de calidad más alta que los sprites del juego (32×32 y jefes de 48 de alto). **Se adaptan a ese tamaño y a esa paleta, no se copian.** Queda al constructor cuánto detalle cabe; Pedro aprueba el arte, como en las zonas anteriores.

## Fórmula de daño: la defensa

Pedro pidió (2026-10-30) refinar la fórmula de defensa. Hoy es la resta clásica de RPG Maker, `(ATQ × poder − DEF × factor) × varianza × crítico`, con factor 0,5 en físico y 0,25 en mágico (`combate.json`) y un mínimo de 1. Con estadísticas pequeñas, una defensa alta casi anula el daño: la ronin (ataque 9 al empezar, +1 por nivel) contra el Caballero oscuro (defensa 18) pierde 9 puntos por golpe, y el daño llega a quedarse en 1-5 a niveles bajos.

**Decidido por Pedro (2026-10-30):** de las tres familias habituales (resta, cociente y porcentaje) elige el **cociente**, por ser la que se ajusta sola al subir las estadísticas y no tiene constantes que afinar. La defensa nunca anula el daño:

`daño = max(1, ⌊ (ATQ × poder)² / (ATQ × poder + DEF × factor) × varianza × crítico⌋)`

- **Se aplica a todo el daño directo, el de las heroínas y el de los monstruos** **(mi decisión)**: el cálculo está en una sola función (`calcularDanio`). Por eso hay que reescribir los tests con cifras de daño y reequilibrar el juego entero.
- Aquí `ATQ × poder` es el ataque ya multiplicado por el poder de la habilidad (la fuerza que ya usa el código). Con poder 1 es exactamente `ATQ² / (ATQ + DEF × factor)`.
- **(Mi decisión: se mantiene `factor` de `combate.json` como hoy, 0,5 en físico y 0,25 en mágico, para que la defensa siga frenando la magia la mitad que lo físico. El constructor puede ajustarlo con los tests.)**
- Ejemplo de comparación (ronin nivel 5, ataque 13, poder 1): contra un Limo (defensa 3) hace 11, como hoy; contra un Caballero oscuro (defensa 18) hace 7 en vez de 4 (con el factor 0,5 de defensa).
- Se mantienen la varianza, el crítico, el mínimo de 1, *Defender* (×0,5), *Postura de hierro* y *Furia* (multiplican la defensa).
- Los golpes cargados siguen siendo de poder alto (más ataque ×poder), y el veneno y la quemadura (porcentaje de vida) no cambian.
- **Curvas de experiencia y de crecimiento por nivel:** sin cambios de forma (valores fijos de `combate.json`), aparte del nivel máximo 12 y lo que el equilibrado pida. **(Pedro lo dejó así al no decir lo contrario.)**

**Consecuencias:** hay que reescribir los tests que comprueban cifras de daño y, sobre todo, **reequilibrar todo el juego** con la fórmula nueva. Por eso este cambio va **antes** de mover monstruos o añadir la zona nueva: si no, se equilibraría dos veces.

## Equilibrado

Es la parte que lo condiciona todo, porque cambian monstruos de tres zonas y se añade una cuarta.

- **Objetivo de partida completa, decidido por Pedro (2026-10-30):** «el juego tiene que ser un reto». Cada franja baja 10 puntos respecto a los rangos de ahora: **Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 %**, con menos de 5 puntos entre heroínas. **(Interpreto «un 10 %» como 10 puntos, igual que cuando bajó los rangos el 26 de octubre; lo confirmo al entregar.)** Los rangos de hoy están en `tests/equilibrado.test.ts`.
- **Criterio de aceptación: los rangos de victoria por dificultad.** **(Mi decisión.)** Lo que el test imprime de la vida que quita un combate de cada zona es solo una referencia. Para no perder lo que se hizo con la Cripta (los probadores la veían fácil), el constructor apunta esas cifras **antes** de cambiar la fórmula y procura que la Cripta no quede claramente por debajo de ellas.
- **Nivel máximo: de 10 a 12** (`experiencia.nivelMaximo` de `combate.json`). Decidido por Pedro. Afecta a la curva de experiencia, a las estadísticas finales de las heroínas y a las mejoras por nivel; el constructor las reequilibra.
- **Palanca de equilibrado: la vida de los monstruos.** Decidido por Pedro: para compensar los niveles extra se sube la vida de los monstruos, no su defensa (la defensa frena el doble el daño físico y castigaba solo a la ronin).
- **Rangos de los jefes violetas** de `tests/violetas.test.ts` (medias de 75/60/45 por dificultad): **(mi decisión: bajan 10 puntos también, a 65/50/35, para seguir la misma lógica que la partida completa. Pedro no lo ha dicho.)**
- **Largo de la zona:** las zonas van de 8 a 11 a 14 salas. **(Mi decisión: 17 salas, la siguiente de la serie, en ramas de 3.)** La zona más larga da más experiencia y eso entra en el equilibrado, que es quien decide al final entre 17 y 14. Antes de fijarlo hay que comprobar con un test que el generador (`rejilla` de 7, tesoros, salas violetas) coloca 17 sin fallar. **(Mi decisión: si no cabe, 14 salas como la Cripta.)**
- **Probabilidades de salas violetas** (`probabilidad`, `probabilidadDragon`, `probabilidadTrampa`): **(mi decisión: no se tocan.)** Con una zona más habrá más ocasiones de que salgan; lo que digan los tests de equilibrado y de violetas manda.
- **Logros que cuentan zonas o monstruos:** **(mi decisión: se dejan igual siempre que se pueda.)** Solo cambian los que dependan del número de zonas, y el constructor decide cómo.
- **Jefe violeta y dragón de la zona:** mismos criterios que ya comprueba `tests/violetas.test.ts` (medias por dificultad ±10; ningún combate violeta bajo el 25 %; el dragón entre 20 puntos por debajo y 10 por encima del jefe violeta de su zona). **(Mi decisión: el multiplicador `violetas` de `dificultades.json` se aplica al oni igual que a los demás.)**
- **Método:** el de siempre, un test temporal que muta `DIFICULTADES`, `HEROES` y `MONSTRUOS` hasta cuadrar con margen y no en el filo.
- **Orden de trabajo sugerido para el equilibrado:** primero mover monstruos de zona (Bosque y Cripta) con las estadísticas de los nuevos como marcador provisional, dejar las tres zonas en rango, y después añadir el Cauce Seco.
- Hay que tener en cuenta lo ya anotado en CLAUDE.md: más enemigos por sala está **fuera de este trabajo**.

## Equipo

Los cofres de cada zona dan objetos de un nivel (Bosque 1, Ruinas 2, Cripta 3). **Decidido por Pedro (2026-10-30): el Cauce Seco tiene su propio nivel 4 de equipo, «todo tiene que estar hecho».**

- **Qué hay que crear:** una katana (ronin), un bastón (maga) y una armadura (las dos, la armadura es compartida), de nivel 4, en `objetos.json`, con sus bonos y la lista de armas y armaduras que usan los cofres. El equipo normal no lleva sprite propio: solo cambia los colores de la rana con el campo `tinte`, así que **no hay arte nuevo que dibujar**, solo una paleta por pieza.
- **Bonos:** siguen la escalera de hoy (ataque +3, +6, +10; magia +3, +6, +10; defensa +2, +5, +8). El nivel 4 va un escalón por encima. **(Idea mía: ataque y magia +15, defensa +12, y un efecto de estado como el de la hoja rúnica y el cetro de la luna; el constructor las ajusta con el equilibrado.)** La paleta de colores sigue el tema de fuego del Cauce Seco.
- **Cofres:** `nivel: 4` en los cofres de la zona, y que el sorteo de objetos acepte ese nivel.
- **Piezas especiales del jefe violeta (el oni):** las otras zonas dan recompensas especiales (habilidad, pieza con capa de arte, corazón del dragón). El oni debe dar la suya siguiendo el mismo patrón; la pieza especial sí lleva arte nuevo (una capa por rana, como las cuatro que ya hay en `public/assets/sprites/piezas/`). **(Queda al constructor decidir qué da exactamente, siguiendo a los otros jefes violetas, y Pedro aprueba el arte.)**
- **Equilibrado:** con más equipo, el nivel 4 entra en el equilibrado de la partida completa; el bono de ataque total sube y eso es parte de por qué los monstruos necesitan más vida.

## Qué más toca (según lo visto en el código; confirmar al planificar)

- `src/data/monstruos.json`: monstruos nuevos, jefe, violeta, dragón de la zona y los cuatro jefes de zona.
- `src/data/zonas.json`: la zona nueva, los grupos de Bosque y Cripta, `violetas.dragon.cauce`.
- `src/data/historia.json`: cartel de zona, frases del jefe, frases del jefe violeta.
- `src/data/hd2d.json`: luz, fondo y borde del Cauce Seco.
- `ORDEN` en `src/main.ts` y todo lo que dependa del número de zonas (HUD, bestiario, logros, `?zona=N` de desarrollo). Los logros que cuentan zonas o monstruos pueden cambiar de umbral.
- El guardado: las claves de zona nuevas hacen que los guardados antiguos se descarten (ya es el comportamiento actual con claves que no existen). Valorar si hay que subir `VERSION_GUARDADO`.
- Sonido: la ambiental o la música por zona, si existe, siguiendo lo que haga `sonido.json`.
- Documentación: CLAUDE.md (estado) y el documento de desarrollo.

## Cómo se puede partir en entregas

**(Mi decisión; el plan lo puede reordenar.)** No se publica una zona con arte provisional: los probadores la jugarían. Cada entrega termina publicada, como en los hitos anteriores:

1. **Reglas nuevas:** fórmula de defensa por porcentaje, nivel máximo 12, rangos de victoria 10 puntos más bajos y más vida de los monstruos, con las tres zonas actuales reequilibradas. Es publicable por sí sola.
2. Jabalí, cuervo y lobo con su arte definitivo, movidos a sus zonas (sin el Espectro en la Cripta) y las tres zonas reequilibradas otra vez. Es publicable por sí sola.
3. El Cauce Seco entero en una rama: tileset y 3D, Acólito, Espectro (ya movido), Salamandra, sacerdote, oni, dragón de la zona, historia, bestiario, logros y sonido. Dentro de la rama se puede ir por partes con arte provisional, pero se publica una sola vez, cuando está todo y equilibrado.
