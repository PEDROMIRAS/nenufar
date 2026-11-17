# Mapa vivo: «¡!» y «?», pasos y polvo — diseño

Fecha: 2026-11-17. Rama: `mapa-vivo`. Segundo hito de la auditoría con las skills de gamedev (game-feel,
audio-design), después del peso de los golpes (que a Pedro le pareció «mucho mejor»).

## Por qué

En el mapa todo es silencioso y sin aviso: la heroína anda y corre sin sonido, y un monstruo que la ve pasa
de patrullar a perseguirla sin ninguna señal; te enteras cuando se te echa encima. Es el mismo problema que
tenían los golpes: nada responde.

**Decisiones de Pedro:**
- El «¡!» sale **cuando el monstruo te ve** (no justo antes del combate): avisa de que hay que huir o
  esquivarlo, y de que se le puede pillar por la espalda. Referencia: Dragon Quest y Octopath con enemigos
  visibles.
- También un **«?»** cuando el monstruo te pierde de vista y vuelve a su patrulla (como en Metal Gear).
- Señales como **sprites 3D pegados al monstruo** (enfoque 1).

Tono: sobrio, el mismo de Octopath que en el hito anterior.

## Objetivos

1. **«¡!»** sobre el monstruo que empieza a perseguirte: aparece algo más grande y se asienta sin rebote,
   suena un toque corto de alerta y el monstruo se queda quieto un instante, mirándote, antes de lanzarse.
2. **«?»** sobre el monstruo que deja de perseguirte, sin sonido o con uno muy suave, y que se desvanece.
3. **Pasos** de la heroína: un sonido suave en cada pisada, al compás de la animación de andar, distinto en
   cada zona (hierba, piedra, losa y hueso, lecho seco); al correr van más deprisa (la animación ya se
   acelera) y algo más fuertes.
4. **Polvo al correr:** pequeñas nubes en los pies que se deshacen, del color del suelo de la zona. Al
   andar, nada.

## No objetivos

- Música nueva, cambios en cómo ven o persiguen los monstruos (distancias de visión, velocidades).
- Pasos de los monstruos.
- Señales para jefes (no se mueven por el mapa) y para el ermitaño (no persigue).
- Números del equilibrado. El simulador de equilibrado no recorre el mapa, así que sus tests no cambian.

## Anti-objetivos

- Que se sienta de dibujos animados: signos que botan, nubes de polvo grandes, pasos que tapan la música.
- Que la pausa del «¡!» cambie el reto de forma apreciable: debe ser corta (~0,3 s).
- Pasos que suenan con la heroína quieta contra un muro (anda en el sitio): solo suenan si se ha movido.

## Enfoques considerados

1. **Señales como sprites 3D pegados al monstruo (elegido por Pedro).** Dos texturas pequeñas (el «¡!» en
   rojo, el «?» en lavanda) dibujadas una vez con la letra del juego; cada monstruo que puede perseguir
   tiene un sprite encima de la cabeza. Se mueve con él, con la cámara que sigue a la heroína en vertical y
   con la profundidad (lo que tapa al monstruo tapa al signo). Cuesta un sprite más por monstruo.
2. Signos en la capa 2D sobre todo, proyectando la posición del monstruo en cada fotograma: texto más
   nítido, pero hay que proyectar y ajustar en horizontal y vertical, y nunca queda tapado.

## Diseño

### Lógica pura (`src/core/`)

- **Patrulla** (`core/patrulla.ts`): `Patrulla` gana
  - `alerta: number`: segundos que le quedan quieto tras verte (0 = nada);
  - `cambio: -1 | 0 | 1`: qué pasó en este paso lógico (1 = acaba de verte, −1 = acaba de perderte, 0 = nada).
    Se pone a 0 al empezar cada `actualizarPatrulla`.
  Al pasar de no perseguir a perseguir: `cambio = 1`, `alerta = pausa` y el monstruo mira hacia la heroína
  (`dirX`, `dirY`). Mientras `alerta > 0` no se mueve. Al dejar de perseguir: `cambio = −1`.
  La pausa entra como parámetro nuevo de `actualizarPatrulla` (su número sale del JSON nuevo). El ermitaño
  no ve (no cambia nada para él).
- **Señales** (`core/senales.ts`, nuevo): cronología de un signo, pura y sin asignaciones:
  `escalaSigno(t, d)` y `opacidadSigno(t, d)` (aparece de `crecer` a 1 en `aparicion` s con ease-out, se
  mantiene, y se desvanece en el último tramo de `duracion`); `pisada(antes, ahora, fps, frames, pisadas)`:
  si al pasar el tiempo de animación de `antes` a `ahora` se ha entrado en un fotograma de pisada.

### Datos (`src/data/mapa_vivo.json`, nuevo)

```json
{
  "alerta": { "pausa": 0.3, "duracion": 0.9, "aparicion": 0.12, "crecer": 1.35, "sonido": "alerta" },
  "perdido": { "duracion": 1.1, "aparicion": 0.15, "crecer": 1.2, "sonido": null },
  "pasos": { "pisadas": [0, 2], "corriendo": 1.4 },
  "polvo": {
    "cada": 0.12,
    "vida": 0.45,
    "cantidad": 12,
    "colores": { "bosque": "#6b5a3e", "ruinas": "#8a8478", "cripta": "#6f6a73", "cauce": "#7a5a44" }
  }
}
```

- `pasos.pisadas`: fotogramas de la animación `walk` (4 fotogramas) en que el pie toca el suelo;
  `corriendo`: multiplicador de volumen al correr.
- `polvo.cada`: segundos entre nubes al correr; `cantidad`: cuántas partículas hay como mucho (reutilizadas).

### Sonido (`src/data/sonido.json`)

- `alerta`: toque corto y agudo, dos notas subiendo, ~0,15 s (sobrio, no un silbato).
- `paso_bosque`, `paso_ruinas`, `paso_cripta`, `paso_cauce`: ruido muy corto (~0,05 s) filtrado por la
  onda que mejor imite cada suelo, con volumen bajo (el nivel más bajo de respuesta de la skill game-feel);
  todos en `variacion` (±6-8 %) para que no suenen iguales.
- `sonar` necesita un volumen extra opcional para los pasos al correr: `sonar(nombre, volumen = 1)`.

### Dibujo (`src/render/mundo/`)

- **Signos:** dos texturas de canvas hechas una vez (letra del título del juego; «¡!» en el rojo de los PV
  `#d8584a` con contorno oscuro, «?» en lavanda de `PALETA`), y un sprite 3D (plano que mira a la cámara,
  como los actores) por monstruo que pueda perseguir, solo sobre el primero del grupo. Va sobre la cabeza
  (alto del fotograma del monstruo). Oculto si no hay signo. Escala y opacidad salen de `core/senales.ts`.
  Con «menos movimiento», sin crecer (aparece a su tamaño).
- **Polvo:** un `THREE.Points` (o sprites) con `polvo.cantidad` partículas reutilizadas en anillo: al
  correr, cada `polvo.cada` s se pone una en los pies de la heroína; sube un poco, crece y se desvanece en
  `polvo.vida` s. Color de la zona. Nada se crea por fotograma.
- **Pasos:** en la escena del mapa, tras actualizar a la heroína, si `pisada(...)` y se ha movido de verdad,
  `sonar('paso_' + zona, corriendo ? pasos.corriendo : 1)`. El nombre del sonido se arma una vez por zona,
  no cada paso.

### Escena del mapa (`src/escenas/mapa.ts`)

Por cada monstruo vivo: si `cambio === 1`, empieza su signo «¡!» (y `sonar(alerta.sonido)`); si `−1`, su
«?». Cada monstruo lleva el signo actual y su tiempo; al cambiar de sala, los signos se borran. Durante la
entrada al combate y el fundido no se actualiza nada (ya es así).

## Restricciones

- `src/core/` sin navegador; números en `src/data/`; cero asignaciones en el bucle.
- Ningún número del equilibrado cambia; los tests de equilibrado no se tocan.
- Español en código, comentarios y commits.

## Cómo se comprueba

- Tests de `core/patrulla.ts`: al entrar en visión, `cambio = 1`, `alerta = pausa`, mira a la heroína y no
  se mueve durante la pausa; luego persigue; al salir de visión × olvido, `cambio = −1`; en el paso
  siguiente `cambio = 0`. Los tests de patrulla que ya hay siguen pasando (con pausa 0 donde importe).
- Tests de `core/senales.ts`: escala y opacidad en los tramos; `pisada` entra en los fotogramas 0 y 2 y no
  en 1 y 3, también si el tiempo salta varios fotogramas de golpe.
- Test de datos: los sonidos nombrados existen y hay color de polvo y sonido de paso para cada zona de
  `zonas.json`.
- `npm test`, `npm run lint`, `npm run build`.
- Capturas con Chrome sin cabeza: un monstruo con «¡!» y otro con «?», polvo al correr (1000×640 y
  390×844). Los pasos y el toque de alerta solo se juzgan jugando.

## Lo que queda al constructor

- La forma exacta de cada sonido de paso dentro de lo descrito.
- El tamaño del signo en el mundo y su altura sobre la cabeza.
- Si el polvo es `THREE.Points` o sprites, mientras no cree objetos por fotograma.
