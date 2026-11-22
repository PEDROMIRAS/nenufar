# Tres habilidades equipadas — diseño

Fecha: 2026-11-22. Rama prevista: `tres-habilidades`.

## Por qué

Pedro quiere «que haya decisiones de verdad, como en Octopath», y en concreto **decisiones antes de pelear**: con qué entra la rana en cada zona. Hoy no hay ninguna: toda habilidad desbloqueada está siempre en el menú de combate, así que la partida se juega igual cada vez. La decisión que ya existe vive en el turno (defenderse o rematar ante el golpe cargado) y se queda como está.

El público importa: quien llega desde el portafolio y el reto del día solo juegan el Bosque. La mecánica tiene que notarse desde el primer minuto.

## Objetivos

- La rana lleva **3 habilidades equipadas** de un abanico mayor; en el combate solo salen esas 3. Atacar, Defender, Objeto y Huir siguen siempre.
- Se eligen **al entrar en cada zona** (tras su cartel) y **en la sala de descanso, junto a la fuente** (aunque ya esté usada). En ningún otro momento.
- **Hay elección desde el Bosque**: cada rana empieza con 4 habilidades y elige 3.
- Cada habilidad tiene su hueco (golpe cargado, grupos, jefes, estados, aguante): ninguna es la mejor siempre, para que la elección dependa de la zona.

## No objetivos

- Cambiar el combate por turnos (Boost, escudos o puntos débiles: se habló y se descartó para este proyecto).
- Habilidades pasivas o de apoyo.
- Cambiar las habilidades de los monstruos.

## Anti-objetivos (fracaso aunque funcione)

- Que una combinación sea siempre la mejor: la elección sería un trámite.
- Que elegir se vuelva un trámite antes de cada combate (por eso no se puede cambiar desde la pausa).
- Que el equilibrado se salga de sus rangos.

## Decisiones de Pedro

1. Decisión antes de pelear (no en el turno).
2. Cuándo se cambia: al entrar en cada zona y en la sala de descanso.
3. Elección desde el Bosque: 4 iniciales, se eligen 3.
4. La lista de habilidades de abajo («me gusta así»).
5. Construcción: pantalla propia «Habilidades» (enfoque A).
6. También se elige justo antes del combate final (tras la revisión).
8. La quemadura y el veneno de las ranas (Fuego fatuo, Hoja envenenada) quitan el 4 % por turno, no el 8 % de los monstruos: con el 8 % la maga hundía a los violetas y subirles la vida no lo frenaba (la quemadura es un % de esa vida). Tras el reequilibrado.
7. Al reequilibrar se pueden tocar sin preguntar los PM y el poder de todas las habilidades y los multiplicadores de dificultad; las estadísticas de las ranas y el nivel 3 del reto, solo preguntándole (tras la revisión).

## Enfoques considerados

- **A. Pantalla propia «Habilidades» (elegido).** Sale sola en los dos momentos permitidos; la pausa enseña las 3 equipadas sin dejar cambiarlas. El momento de decidir es claro y no estorba.
- **B. Pestaña en la pausa, editable solo en esos momentos.** Reutiliza la pausa, pero la pausa se abre en cualquier sitio y un «ahora no se puede» confunde. Descartado.
- **C. Elegir en el primer turno de cada combate.** Contradice «decidir antes de pelear». Descartado.

## Las habilidades

Nueve por rana: las cinco de ahora (algunas cambian de nivel) y cuatro nuevas. Las cifras de poder, PM y porcentajes son **provisionales**: las fija el equilibrado (ver «Equilibrado»). Las amenazas por zona que guían los huecos: golpe cargado en casi todos los monstruos y jefes; veneno (arañas, Señor de la Cripta, Rey sin Charca, ojo flotante); quemadura (salamandra, sacerdote, oni, ojo flotante); grupos de 2 (hasta 3 con invocaciones).

### Rana ronin

| Cuándo | Habilidad | PM | Qué hace | Hueco |
| --- | --- | --- | --- | --- |
| Al empezar | Corte rápido | 3 | Golpe físico a uno, poder 1,6 (como ahora) | Daño seguro |
| Al empezar | Postura de hierro | 3 | Estado `postura` sobre sí misma (antes, nivel 3) | Aguantar |
| Al empezar | **Golpe de pomo** (nueva) | 2 | Golpe físico a uno, poder ~0,7, `rompeCarga` | Golpe cargado: deja de hacer falta defenderse |
| Al empezar | **Grito de guerra** (nueva) | 3 | Estado `furia` sobre sí misma (ataque ×1,5, defensa ×0,7, tres turnos) | Rematar rápido a cambio de recibir más |
| Nivel 3 | Tajo del viento | 5 | Golpe físico a todos, poder 0,9 (antes, nivel 5) | Grupos |
| Nivel 5 | **Hoja envenenada** (nueva) | 4 | Golpe físico a uno, poder ~1,0, envenena al objetivo (4 % de su vida por turno: `veneno_rana`) | Jefes |
| Nivel 7 | Iaido | 6 | Golpe a uno, poder 2, crítico seguro (como ahora) | Jefes |
| Nivel 9 | **Respiro** (nueva) | 5 | Cura el 25 % de sus PV y le quita veneno y quemadura | La ronin no sabe curarse |
| Jefe violeta | Tajo de llama morada | 12 | Golpe físico a todos, poder 1,8 (como ahora) | Grupos |

### Rana maga

| Cuándo | Habilidad | PM | Qué hace | Hueco |
| --- | --- | --- | --- | --- |
| Al empezar | Fuego morado | 3 | Golpe mágico a uno, poder 1,5 (como ahora) | Daño seguro |
| Al empezar | Curar | 4 | Cura el 35 % de sus PV (antes, nivel 3) | Aguantar |
| Al empezar | **Escarcha** (nueva) | 2 | Golpe mágico a uno, poder ~0,6, `rompeCarga` | Golpe cargado |
| Al empezar | **Velo** (nueva) | 3 | Estado nuevo `velo` sobre sí misma (defensa ×1,5, tres turnos) | La maga es frágil |
| Nivel 3 | Fuego fatuo | 5 | Golpe mágico a uno, poder 0,8, quema al objetivo (4 % de su vida por turno: `quemadura_rana`; antes, nivel 5 y 8 %) | Jefes |
| Nivel 5 | **Maldición** (nueva) | 4 | Estado nuevo `debilitado` a un enemigo (ataque y magia ×0,6, tres turnos) | El que pega fuerte, o el jefe |
| Nivel 7 | Tormenta morada | 8 | Golpe mágico a todos, poder 1,2 (como ahora) | Grupos |
| Nivel 9 | **Purificar** (nueva) | 4 | Le quita veneno y quemadura y cura el 15 % de sus PV | Compite con Curar por un hueco |
| Jefe violeta | Cometa arcano | 25 | Golpe mágico a todos, poder 2, `rompeCarga` (como ahora) | Todo |

### Lo que hay que añadir al motor

- Que una habilidad pueda **quitar estados de quien la usa** (hoy solo los consumibles tienen `quitaEstado`). Respiro y Purificar quitan dos: veneno y quemadura.
- Dos estados nuevos en `combate.json`, solo datos: `velo` (defensa ×1,5) y `debilitado` (ataque ×0,6 **y magia ×0,6**: muchos jefes pegan con magia —Señor de la Cripta, Rey sin Charca, ojo flotante, sacerdote— y con solo el ataque Maldición no les haría nada; decisión mía tras la revisión). `efectiva` ya aplica los multiplicadores de estado a monstruos y heroína.
- Una habilidad que aplica un estado a un enemigo ya funciona (`Fuego fatuo`); una que se aplica `furia` a sí misma también (`estado` con objetivo `propio`).
- Cada habilidad nueva necesita su descripción (`core/descripciones.ts` las genera de los datos: comprobar que cubren `rompeCarga`, estados a enemigos y quitar estados) y, si se quiere, `efecto` y `sonido` de los que ya hay.

## Cómo se elige

### Las 3 equipadas

- La luchadora guarda qué 3 lleva (por nombre). En combate, el menú «Habilidad» enseña solo esas (en el orden de la lista de la rana).
- Las que conoce: las de su nivel y las ganadas como recompensa (lo de ahora). Equipadas ⊆ conocidas, como mucho 3.
- Al empezar una partida nueva (y el reto) se le equipan las 3 primeras conocidas, pero la pantalla sale antes de entrar en la zona, así que la jugadora decide.
- Al ganar una habilidad nueva (subir de nivel o premio de un jefe violeta) **no se equipa sola**. La pantalla de nivel y la del premio lo dicen: «Nueva habilidad: Respiro. Equípala junto a la fuente o al entrar en la siguiente zona».

### La pantalla «Habilidades»

Una escena nueva con el estilo lavanda de las demás (`render/marco.ts`), `alta = true` para el móvil de pie. Boceto (horizontal):

```
┌ Habilidades · elige 3 ───────────────┐┌─────────────────────────┐
│ ◆ ■ Corte rápido           3 PM      ││ Golpe de pomo · 2 PM    │
│   ■ Golpe de pomo          2 PM      ││ Golpe flojo a uno que   │
│   □ Postura de hierro      3 PM      ││ le rompe el golpe       │
│   ■ Grito de guerra        3 PM      ││ cargado.                │
│                                      ││                         │
│              [ Listo ]               ││                         │
└──────────────────────────────────────┘└─────────────────────────┘
```

- Lista de todas las conocidas con su marca (■ equipada, □ no), coste y, al lado (horizontal) o debajo (vertical), qué hace la que está bajo el cursor.
- Confirmar sobre una fila la equipa o la quita. Con 3 ya equipadas, equipar otra no hace nada y lo dice («Quita una antes»).
- «Listo» cierra; solo se puede con 3 equipadas, o con todas las conocidas si son menos de 3. Cancelar también cierra, pero exige lo mismo.
- Teclado, dedo (dos toques como las demás listas: el primero dice qué hace) y mando, igual que las otras pantallas. Anuncia al lector de pantalla.

### Cuándo sale

1. **Al entrar en cada zona**, después de las páginas de historia, del cartel de la zona y del presagio, y antes de que la heroína pueda andar. Incluye la primera zona de una partida nueva. **No** sale al recuperar una partida guardada (ya eligió).
2. **En la sala de descanso**, al llegar junto a la fuente (el mismo alcance con que hoy la fuente restaura), haya restaurado ya o no. Una vez por acercamiento: para que vuelva a salir hay que apartarse y volver (como el altar con `eventoListo`). Si en ese mismo paso la fuente restaura, primero restaura (y su aviso) y luego sale la pantalla.
3. **Antes del combate final**: al cruzar el portal del Cauce Seco, antes de la presentación del Rey sin Charca. Si se cierra el navegador con ella abierta, al recuperar (combate guardado `{ tipo: 'final' }`) vuelve a salir antes del combate. La jugadora simulada también elige ahí.
4. **En el reto del día**, igual: tras elegir rana y su página de entrada, y junto a la fuente de su sala de descanso (el Bosque corto también la tiene). El tiempo del reto no corre con la pantalla abierta (como con la pausa).

### La pausa

La sección Heroína enseña las 3 equipadas y debajo, en tenue, las conocidas que no lleva, con una línea: «Se cambian al entrar en una zona o junto a la fuente». No se pueden cambiar desde la pausa.

## Guardado

- `HeroinaGuardada` suma `equipadas: string[]`. `leerGuardado` lo valida como textos; al restaurar se quedan solo los nombres que la heroína conoce.
- Una partida guardada sin el campo (de antes) se recupera con las 3 primeras conocidas. `VERSION_GUARDADO` **no** sube: no hay por qué descartar esas partidas.
- El combate interrumpido se repite con las equipadas que se guardaron (se guardan al entrar en la sala, como el resto de la heroína).

## Equilibrado

- La jugadora simulada (`core/jugadora.ts`, usada por el simulador y la comprobación del reto) elige sus 3 al empezar cada zona y en la fuente con una regla sencilla en `jugadora.json`, por ejemplo una lista de prioridad por rana (y otra para el tramo del jefe, que se aplica en la fuente). Y en combate usa las nuevas: romper el golpe cargado en vez de defenderse cuando lleve con qué, quitarse veneno o quemadura si los tiene, la furia o la maldición al empezar contra un jefe. La regla exacta es del constructor; que sea simple y razonable, como la actual.
- **Ninguna combinación siempre mejor** (el anti-objetivo): un informe de equilibrado, saltado por defecto como los otros informes largos, simula cada trío posible de cada rana contra los combates de cada zona (los normales y su jefe) y avisa si un trío gana a todos los demás por más de 10 puntos de victoria en todas las zonas; si pasa, se retocan las cifras de las habilidades. Las de recompensa (Tajo de llama morada, Cometa arcano) quedan fuera de la regla: ser fuertes es su premio. Decisión mía tras la revisión.
- Mismos objetivos que hoy, comprobados por los tests existentes: partida completa Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 %, menos de 5 puntos entre ranas; jefes violetas 65/50/35 de media (±10), ningún combate violeta por debajo del 25 %; presagios y eventos dentro de sus márgenes; reto del día entre 55 y 75 % por rana (la comprobación de cada día ya lo garantiza; `tests/reto_equilibrado.test.ts`).
- **Qué se puede tocar** (decisión de Pedro): libres, los PM y el poder de todas las habilidades (también las de «como ahora») y los multiplicadores de dificultad. Las estadísticas de las ranas (`heroes.json`: base y por nivel) y el nivel 3 del reto, solo preguntándole: si no cuadra sin ellos, se para y se le pregunta.
- Habilidades disponibles antes (Postura y Curar desde el nivel 1, Tajo del viento y Fuego fatuo desde el 3) hacen la partida más fácil; tener solo 3 en el menú, más difícil. Se reequilibra con el método de siempre (buscar con 600 partidas, comprobar con 1200 y que pasen las 300 de los tests); las palancas preferidas, por este orden: PM y poder de las habilidades nuevas, luego los multiplicadores de dificultad.

## Lo que queda al constructor

- Nombres de funciones y campos, y dónde vive cada cosa (respetando `core/` puro y sin números en el código).
- La regla exacta de la jugadora simulada y las cifras finales de las habilidades (dentro de lo que pide el equilibrado).
- El efecto visual y el sonido de cada habilidad nueva, de los que ya existen.
- La disposición fina de la pantalla en horizontal y en vertical, siguiendo las otras listas (`core/disposicion.ts`).
