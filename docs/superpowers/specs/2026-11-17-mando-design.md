# Mando de Xbox: diseño

Fecha: 2026-11-17. Rama: `mando`. Tercer hito de la auditoría con las skills de gamedev (input-systems,
game-ui-ux, game-feel), después del peso de los golpes y el mapa vivo.

## Por qué

Nenúfar solo se juega con teclado o con el dedo. La skill game-ui-ux pide que toda pantalla se pueda
recorrer con mando, y un juego de combate por turnos estilo JRPG se juega de forma natural con uno. Pedro
juega con un **mando de Xbox** y quiere que **vibre con los golpes**.

## Objetivos

1. Jugar la partida entera con un mando de Xbox: moverse, correr, combatir, menús, inventario, Ajustes
   (salvo los controles HTML, ver abajo), bestiario y logros.
2. Los textos de ayuda cambian solos según el último dispositivo usado: teclado, táctil o mando.
3. El mando vibra con los golpes del combate según los tres pesos de `impacto.json`, y con la entrada al
   combate; con el Temblor a 0 (ajuste o «menos movimiento») no vibra.

## No objetivos

- Remapear botones, mandos de PlayStation o Switch (con la asignación estándar del navegador funcionan con
  los mismos botones en la misma posición, pero los textos dirán A/B/X/Y), varios mandos a la vez.
- Escribir el nombre de la rana con el mando: vale el nombre por defecto, que ya viene puesto. La
  pantalla del nombre ya responde a CONFIRMAR y CANCELAR (`escenas/nombre.ts`), así que A sigue y B vuelve.
- Mover los deslizadores y casillas HTML de Ajustes con el mando (son controles del navegador). Queda como
  idea si Pedro lo echa en falta.
- Números del equilibrado.

## Anti-objetivos

- Que el stick mueva sola a la heroína o salte de opción en los menús al rozarlo (zona muerta).
- Que un botón mantenido repita la acción (como el teclado, cuenta al pulsarlo).
- Vibración constante o molesta: cada golpe vibra una vez y poco, salvo los máximos.

## Enfoque

Una sola forma sensata (aprobada por Pedro): una fuente nueva `input/mando.ts` que lee la API Gamepad en cada
paso lógico y rellena las mismas `Acciones` que el teclado; un estado mínimo de «último dispositivo usado»
que el dibujo lee para elegir los textos; y la vibración colgada de los pesos de `impacto.json`.
Descartadas: una librería de mandos (no hace falta), escuchar eventos (el navegador solo avisa de
conectar/desconectar, no de cada botón), elegir el dispositivo a mano en Ajustes (un paso más; lo habitual
es cambiar solo).

## Diseño

### Botones (asignación estándar de la API Gamepad, mando de Xbox)

| Mando | Índice | Acción |
|---|---|---|
| Stick izquierdo | ejes 0, 1 | MOVER (8 direcciones, con zona muerta) |
| Cruceta | botones 12-15 | MOVER |
| A | 0 | CONFIRMAR (al pulsar) |
| B | 1 | CANCELAR (al pulsar) |
| Menú (☰) | 9 | MENU (al pulsar) |
| Y | 3 | INFO (al pulsar) |
| X o gatillo derecho | 2, 7 (valor > `gatillo`) | CORRER (mantenido) |

En los menús, el cambio de opción ya ocurre una vez por cambio de dirección (las escenas comparan con la
dirección anterior), así que con la cruceta o el stick funciona como con las flechas sin tocar las escenas.

### Lógica pura (`src/core/mando.ts`)

- `interface MandoLeido { buttons: readonly { pressed: boolean; value: number }[]; axes: readonly number[] }`
  (un `Gamepad` del navegador lo cumple, así que no se copia nada).
- `leerMando(m: MandoLeido, antes: boolean[], d: MandoJson, acciones: Acciones): boolean` — escribe en
  `acciones` (MOVER con `fijarDireccion` y la zona muerta; la cruceta gana si está pulsada; CONFIRMAR,
  CANCELAR, MENU e INFO solo en el paso en que se pulsan, comparando con `antes`, que actualiza; CORRER
  mantenido) y devuelve si hubo alguna entrada (para el último dispositivo).
- Números en `src/data/controles.json`, sección nueva `mando`: `{ "zonaMuerta": 0.35, "gatillo": 0.5,
  "botones": { "confirmar": 0, "cancelar": 1, "correr": 2, "info": 3, "gatilloCorrer": 7, "menu": 9,
  "arriba": 12, "abajo": 13, "izquierda": 14, "derecha": 15 } }`.

### Fuente (`src/input/mando.ts`)

`crearMando(): FuenteEntrada` — en `leer`, toma el primer mando de `navigator.getGamepads()` que exista
(sin crear arrays nuevos si se puede: recorrer el resultado) y llama a `leerMando`. Si no hay mando, no hace
nada. Se añade a la lista de fuentes de `main.ts` después del teclado.

### Último dispositivo (`src/input/dispositivo.ts`)

`type Dispositivo = 'teclado' | 'tactil' | 'mando'`; `dispositivo(): Dispositivo` y
`usarDispositivo(d)`. Empieza en `'tactil'` si `esTactil()`, si no `'teclado'`. Lo ponen el teclado (al
pulsar una tecla propia), el toque y el joystick (al tocar) y el mando (cuando `leerMando` devuelve true).

### Textos

- `controles.json`: `ayuda.mando` (Moverse: «Stick o cruceta», Correr: «X o gatillo derecho», Aceptar: «A»,
  Volver: «B», Inventario: «Menú», Bestiario: «Y (portada)») y `pistas.mando` («Stick: moverte · X o
  gatillo: correr», «Menú: mochila, equipo y puntos de mejora», la de la espalda igual).
- Las letras se escriben tal cual («A», «B», «X», «Y», «Menú»): los símbolos Ⓐ o ☰ dependen de la fuente
  del sistema y en la letra monoespaciada del juego pueden salir con otra anchura.
- `AYUDA_CONTROLES` y `TEXTO_CONTROLES` dejan de ser constantes y se calculan según `dispositivo()`
  (sin crear nada por fotograma: tres listas hechas al cargar).
- Las pistas de pie de las pantallas (elegir rana, dificultad, nombre, puntos, equipo, bestiario y logros,
  controles, «Pulsa Enter para continuar» del lector de pantalla) pasan de `esTactil() ? a : b` a una
  función `segunDispositivo({ teclado, tactil, mando })` que elige según `dispositivo()`. Cada pantalla
  tiene su texto de mando (por ejemplo «Cruceta elegir · A empezar · B volver»).
- Las pistas del mapa (`pistas` de `controles.json`) se eligen al enseñarse.

### Vibración

- `impacto.json`: cada peso gana `vibracion: { duracion, fuerte, debil }` (s y 0-1): leve
  `{ 0.05, 0, 0.25 }`, fuerte `{ 0.12, 0.45, 0.5 }`, máximo `{ 0.25, 0.9, 0.7 }`; y `entrada.vibracion`
  `{ 0.15, 0.3, 0.4 }`.
- `input/mando.ts` exporta `vibrar(v: { duracion; fuerte; debil }): void`: si el último dispositivo es el
  mando, hay mando con `vibrationActuator` y `temblorEfectivo() > 0`, llama a
  `playEffect('dual-rumble', { duration: ms, strongMagnitude: fuerte × temblor, weakMagnitude: debil ×
  temblor })`; si no, nada. Los errores de la promesa se ignoran.
- El combate llama a `vibrar(peso.vibracion)` donde ya aplica el peso; el mapa, al empezar la entrada.

## Restricciones

- `src/core/` sin navegador; números en `src/data/`; cero asignaciones en el bucle (la lectura del mando no
  crea arrays ni objetos por paso; `antes` es un array fijo).
- Solo `src/input/` y `src/render/` tocan el navegador (la API Gamepad vive en `input/`).
- Ningún número del equilibrado cambia.
- Español en código, comentarios y commits.

## Cómo se comprueba

- Tests de `core/mando.ts` con mandos falsos: A pulsada da CONFIRMAR una vez y no al mantenerla; B, Menú e
  Y igual; X o el gatillo por encima de 0,5 dan CORRER mientras se mantienen; el stick por debajo de la
  zona muerta no mueve, por encima da una de las 8 direcciones; la cruceta gana al stick; sin nada pulsado
  devuelve false.
- Test de datos: `ayuda.mando` y `pistas.mando` existen y tienen tantas filas como las de teclado; cada peso
  tiene `vibracion` con valores entre 0 y 1.
- `npm test`, `npm run lint`, `npm run build`.
- **Sin mando en la máquina de pruebas:** el dibujo de los textos de mando se mira forzando el dispositivo
  (atajo de desarrollo `?mando` que lo fija en `'mando'`); la lectura real del mando y la vibración las
  prueba Pedro con su mando de Xbox.

## Lo que queda al constructor

- Los textos exactos de mando de cada pantalla, dentro del estilo de los de teclado.
- Cómo se avisa al último dispositivo desde el toque y el joystick sin tocar su lógica.
