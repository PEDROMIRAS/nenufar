# Peso de los golpes y entrada al combate: diseño

Fecha: 2026-11-17. Rama: `peso-golpes`. Primer hito de la auditoría con las skills de gamedev (game-feel, audio-design).

## Por qué

Pedro: «los golpes no pesan, todo se siente plano». Hoy un golpe normal, un crítico y el golpe cargado
de un jefe se ven casi igual (parpadeo, número que flota, una línea en el registro y un sonido corto),
y al tocar un monstruo el combate aparece de golpe. Si todo pesa lo mismo, nada destaca.

**Referencia: Octopath Traveler** (aprobada por Pedro), la misma del HD-2D: impactos secos, destello
breve, la sala que tiembla y un sonido grave. Pedro pidió un arte **sobrio y oscuro, no infantil**:
nada de rebotes elásticos ni números de dibujos animados.

## Objetivos

1. Cada impacto tiene un **peso** (leve, fuerte o máximo) y cada peso se ve y se oye distinto:
   temblor de la escena, pausa de impacto, destello, tamaño del número y un sonido grave debajo.
2. Los golpes **recibidos** por la heroína pesan igual que los que da.
3. Los efectos de sonido no suenan siempre idénticos (variación pequeña de tono).
4. **Entrada al combate:** destello, franjas oscuras en diagonal que barren la pantalla, un golpe de
   sonido y el combate que aparece desde negro. **Salida:** fundido suave de vuelta al mapa.
5. Ajuste de **Temblor** (0-100 %) en el inventario; con «menos movimiento» del sistema, sin temblor
   ni destellos.

## No objetivos

- **Ningún número del equilibrado** (daño, vida, probabilidades, experiencia). Los tests de
  equilibrado no deben moverse.
- Posprocesado de Three.js (desenfoque radial, aberración, pantalla rota en pedazos): caro en el móvil,
  desaparece con calidad baja y no afecta a la capa 2D. Queda como idea.
- Respuesta en el mapa (pasos, polvo, «¡!» sobre el monstruo), mando y música por zona: hitos
  siguientes de la auditoría.

## Anti-objetivos (sería un fracaso aunque funcione)

- Que se sienta de dibujos animados: rebotes con sobrepaso, aplastar y estirar exagerado, números que
  botan.
- Que el combate se haga más lento de forma notable: la pausa de impacto como mucho 0,12 s por golpe.
- Que tiemble la interfaz: el panel, la lista y el registro quedan quietos; solo se mueve la escena.
- Destellos por encima de 3 por segundo (WCAG; ya se respeta en `render/combate.ts`).

## Enfoques considerados

1. **Módulo de impacto con los números en JSON (elegido por Pedro).** `core/impacto.ts` (lógica pura,
   con tests) decide el peso de cada evento y lleva el trauma y la pausa; `src/data/impacto.json` da
   los números. Sigue las reglas del proyecto y se afina sin tocar código. Más piezas que el 2.
2. Directamente en `escenas/combate.ts`, con números en `ritmo.json`. Más rápido, pero mezcla diseño y
   animación y no se testea sin navegador.
3. Posprocesado en Three.js. Lo más vistoso, pero caro y solo en la capa 3D. Descartado (ver no
   objetivos).

## Diseño

### Pesos

| Peso | Cuándo | Trauma | Pausa | Destello | Número | Sonido extra |
|------|--------|:------:|:-----:|:--------:|:------:|--------------|
| leve | golpe normal, dado o recibido | 0,25 | 0,04 s | no | normal | no |
| fuerte | crítico; golpe dado a un jefe o recibido de un jefe; muerte de un enemigo normal | 0,5 | 0,08 s | 0,12 | ×1,4 | `impacto` |
| máximo | golpe cargado que se descarga; muerte de un jefe; la heroína cae | 0,85 | 0,12 s | 0,22 | ×1,7 | `impacto_fuerte` |

- Si un evento cumple varias condiciones, manda el peso mayor.
- Daño por estado (veneno, quemadura): **sin peso** (solo el número, como ahora).
- Curas, defensa y avisos: sin peso.
- Los números de la tabla son el punto de partida (de la skill game-feel); viven en `impacto.json`
  y se afinan jugando.

### Temblor (trauma)

- `trauma` entre 0 y 1. Cada impacto **suma** su trauma (con tope en 1); decae a ritmo constante
  (`decaimiento` por segundo, propuesta 1,6) **en tiempo real**, también durante la pausa de impacto.
- Desplazamiento = `trauma² × máximo × ruido(t)`: el cuadrado hace que lo leve apenas se mueva y lo
  fuerte se note. `ruido(t)` es una suma de senos de frecuencias distintas para x e y (no un número
  al azar cada fotograma, que vibra como estática). Máximos propuestos: 6 px lógicos en x, 4 en y,
  sin giro.
- Se multiplica por el ajuste de Temblor (0-1). Con `prefers-reduced-motion`, 0.
- **Qué se mueve:** la sala 3D (`v.fondo(v.tiempo, temblor, …)`, hoy siempre 0 en
  `render/combate.ts:254`) y la capa 2D de la escena (orden de turnos, enemigos, heroína, proyectil,
  efecto y número flotante) con un `translate`. El panel y el título no se mueven. El fondo 3D recibe
  hoy solo un temblor horizontal: hace falta añadir el vertical o aceptar solo x en el 3D (decisión
  del constructor; que casen las dos capas es lo importante).

### Pausa de impacto

- Al mostrar un evento con peso, la escena entra en pausa `pausa` segundos.
- Durante la pausa **no avanzan** los tiempos de animación del combate (`tiempoAtaque`,
  `tiempoEfecto`, `tiempoGolpe`, `tiempoCaida`) ni la espera del evento (`espera`). **Sí avanzan** el
  decaimiento del trauma, la música y los sonidos.
- Pausas que se solapan no se suman: manda la mayor de lo que queda (`max`).
- Un toque o Enter no salta la pausa (dura como mucho 0,12 s); sí sigue saltando la lectura.
- Golpes de varias partes (Corte doble…) llegan como eventos `danio` separados: cada uno tiene su
  pausa. Ya van espaciados por `ritmo.eventos.danio`, así que no se encadenan.

### Destello y número

- Destello: un velo blanco sobre la escena (no sobre el panel) con la opacidad del peso, que se apaga
  en ~0,1 s. Uno por impacto, así que no pasa de 3 por segundo con el ritmo actual. Con menos
  movimiento, sin destello.
- Número: el tamaño del peso, que aparece un poco más grande y se asienta en ~0,15 s con ease-out
  (sin sobrepaso). Los críticos siguen llevando «!».

### Sonido

- Dos efectos nuevos en `sonido.json`: `impacto` (onda senoidal grave, ~90 → 40 Hz, ~0,15 s, con
  algo de ruido) y `impacto_fuerte` (más largo y más grave). Suenan **además** del sonido del golpe.
- **Variación:** campo opcional `variacion` por efecto (por ejemplo 0,04 = ±4 % de tono) que
  `sonar()` aplica a las frecuencias. Se pone en los golpes y cortes (`golpe`, `critico`, `corte`,
  `corte_doble`, `acero`, `impacto`…), no en los de interfaz (`cursor`, `confirmar`). El azar sale de
  un `crearAzar` propio del módulo de sonido (es solo estética, no toca el azar de la partida).
- Sin agacharse la música por ahora (la música de combate ya es baja: `volumen.musica` 0,09).

### Entrada al combate

La pila de escenas solo dibuja la de arriba, así que la entrada se reparte en dos mitades:

1. **En el mapa** (que ya tiene su fundido de salas): al tocar el monstruo, la heroína se para y
   empieza la entrada (`entrada.duracion`, propuesta 0,5 s):
   - 0-0,08 s: destello blanco (con menos movimiento, sin destello);
   - 0,08-0,45 s: 7 franjas oscuras en diagonal entran escalonadas de izquierda a derecha hasta tapar
     la pantalla;
   - suena `encuentro` (nuevo efecto: golpe grave con un barrido de ruido) al empezar;
   - al terminar, en negro, se llama a lo que hoy hace `iniciarCombate` (combate normal, presentación
     del jefe o violeta, cadena del desafío).
2. **En el combate:** empieza desde negro y se aclara en `entrada.aparicion` (propuesta 0,3 s). La
   presentación de un jefe también empieza desde negro.

**Salida:** tras confirmar el resultado, fundido a negro (0,25 s) y el mapa sale de negro con lo que
ya existe (`entrarDesdeNegro` / fundido). Al huir, igual.

- La cronología es lógica pura (`core/impacto.ts` o un `core/entrada.ts`: qué fase y qué progreso
  hay en el instante t) y con test; el dibujo, en `render/`.
- Entre combates del desafío también hay entrada (es una pelea nueva).
- Al recuperar una partida guardada a mitad de combate: si ese camino pasa por `iniciarCombate`, que
  se vea la entrada; si no, no hace falta añadirla.
- Las franjas son 2D, iguales en calidad alta y baja.

### Ajuste de Temblor

- `Ajustes.temblor` (0-1, por defecto 1) en `render/almacen.ts`, guardado como los volúmenes.
- Deslizador «Temblor» en la sección Ajustes del inventario, en horizontal y en vertical (las
  posiciones de `disposicionAjustes` y `vertical.json` ganan una fila).
- La presentación de los jefes, que ya tiembla, también lo respeta.

### Datos

`src/data/impacto.json` (nuevo), propuesta:

```json
{
  "pesos": {
    "leve":   { "trauma": 0.25, "pausa": 0.04, "destello": 0,    "numero": 1,   "sonido": null },
    "fuerte": { "trauma": 0.5,  "pausa": 0.08, "destello": 0.12, "numero": 1.4, "sonido": "impacto" },
    "maximo": { "trauma": 0.85, "pausa": 0.12, "destello": 0.22, "numero": 1.7, "sonido": "impacto_fuerte" }
  },
  "temblor": { "maxX": 6, "maxY": 4, "decaimiento": 1.6, "frecuencias": [13, 17] },
  "destello": { "duracion": 0.1 },
  "numero": { "asentar": 0.15 },
  "entrada": { "duracion": 0.5, "destello": 0.08, "franjas": 7, "aparicion": 0.3, "salida": 0.25 }
}
```

## Restricciones del proyecto

- `src/core/` sin navegador; números en `src/data/`; nada de `if (heroina === …)`.
- **Cero asignaciones en el bucle:** el desplazamiento se escribe en un objeto reutilizado.
- Idioma: español en código, comentarios y commits.

## Cómo se comprueba

- Tests de `core/impacto.ts`: el peso de cada caso de la tabla (y el mayor si coinciden varios); el
  trauma con tope 1 y su decaimiento; el temblor es 0 con trauma 0 y crece con su cuadrado; las pausas
  que se solapan toman el máximo; la cronología de la entrada (fase y progreso en cada tramo).
- `npm test`, `npm run lint` y `npm run build` pasan, y **los tests de equilibrado no cambian**.
- Capturas con Edge sin cabeza de la entrada a mitad del barrido y de un golpe fuerte (horizontal y
  390×844), con `?combate=clave`.
- **El peso solo se juzga jugando:** Pedro lo prueba en el ordenador y en el móvil y se afinan los
  números de `impacto.json`.

## Lo que queda al constructor

- Si la cronología de la entrada vive en `impacto.ts` o en un módulo propio.
- Cómo se pasa el temblor vertical al fondo 3D (o si basta con el horizontal).
- La forma exacta de los sonidos nuevos dentro de lo descrito.
- Cómo encaja la entrada con el fundido de salas que ya tiene el mapa, sin duplicarlo.
