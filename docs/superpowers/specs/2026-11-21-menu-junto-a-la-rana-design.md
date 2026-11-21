# Menú de combate junto a la rana (diseño)

Fecha: 2026-11-21. Decidido con Pedro en una conversación con bocetos (`.superpowers/brainstorm/`, sin versionar; el boceto de octubre sigue en `docs/superpowers/mockups/2026-10-26-menu-combate.html`, opción A).

## Por qué

Pedro: el combate tiene que sentirse **más dinámico y menos de menú fijo**. Hoy un panel grande ocupa la parte de abajo de la pantalla todo el combate (en horizontal, de y = 200 a 346 de 352; en vertical, ~170 px), con la lista, la descripción, la ficha y el registro. La referencia es Octopath Traveler: la lista sale junto a quien actúa, solo cuando le toca, y la escena manda.

**Éxito:** al jugar, el combate se ve como una escena con cosas que aparecen y desaparecen, no como una pantalla con un formulario abajo; todo se sigue leyendo y tocando igual de bien (también con el dedo en el móvil de pie).

**Anti-objetivos:** que se pierda información que hoy se ve (vida, maná, estados, qué hace cada acción, qué acaba de pasar); que algo tape a un enemigo o su nombre; que en el móvil las filas queden pequeñas para el dedo; que cambien las reglas o el equilibrado.

## Qué se ve (aprobado con bocetos, opción A, en horizontal y en vertical)

1. **Barra de turnos arriba**, como hoy (banda con cajitas por luchador). Sin cambios.
2. **Mensajes arriba**, bajo la barra de turnos: los **3 últimos** mensajes del combate, el más nuevo claro y los anteriores cada vez más tenues; se borran solos al cabo de un rato. Sustituye al registro de 10 mensajes del panel (elegido por Pedro entre tres salidas).
3. **La lista junto a la rana**: solo cuando le toca a la heroína, una caja con filas finas (nombre a la izquierda, coste en PM a la derecha) a la derecha de la rana. Vale para todos los menús: acción (Atacar, Habilidad, Objeto, Defender, Huir), habilidades, objetos y elegir enemigo. Encima de la caja, el nombre del menú («Acción», «Habilidad»…), como la pestaña de hoy.
4. **La ficha de la heroína** (nombre o estado, PV y PM con barras) siempre a la vista: en horizontal, una caja abajo a la derecha; en vertical, una franja a lo ancho bajo la lista.
5. **Qué hace lo elegido**: una franja fina abajo del todo, de lado a lado, solo con la lista abierta. Los avisos que hoy salen en ese sitio con el menú abierto («No quedan PM…») salen ahí, en su color de aviso.
6. **La escena gana todo el alto**: los enemigos y la heroína se reparten en el espacio que deja el panel (hay más aire). Nada de lo de abajo tapa a un enemigo, su nombre, su barra ni su aviso de golpe fuerte.

Boceto horizontal (480×352 lógicos):

```
┌──────────────────────────────────────────────┐
│ Turno [Rana ronin] [Jabalí] [Limo]           │
│ Rana ronin golpea a Limo: 7        (tenue)   │
│ Limo golpea a Rana ronin: 3        (medio)   │
│ Jabalí escarba el suelo...         (claro)   │
│                  Jabalí        Limo          │
│                  (jabalí)      (limo)        │
│                  ▬▬▬▬▬         ▬▬▬           │
│        Habilidad                             │
│ (rana) ┌────────────────────┐                │
│        │◆Corte rápido     3 │ ┌────────────┐ │
│        │ Postura de hierro 3│ │Rana ronin  │ │
│        │ Tajo del viento   5│ │PV ▬▬▬▬  31 │ │
│        └────────────────────┘ │PM ▬▬▬   5  │ │
│                               └────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Daño físico (160 % de tu ataque)…        │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Vertical (interfaz alta, 320 de ancho): el mismo orden de arriba abajo; la lista a la derecha de la rana con filas altas para el dedo; debajo, la ficha a lo ancho; abajo del todo, la explicación.

## Decisiones mías dentro de lo aprobado (Pedro las puede tachar)

- **Elegir enemigo** es otra lista igual (nombres de los enemigos vivos y Volver); la flecha sobre el enemigo elegido se mantiene como hoy.
- **La lista entra** con un deslizamiento corto desde la rana (unos 0,12 s) y sale sin animación. Con «menos movimiento» del sistema, aparece sin deslizar.
- **En el turno de los monstruos** no hay lista ni franja de explicación: solo la escena, los mensajes de arriba y la ficha.
- **Los mensajes de arriba** se borran a los pocos segundos de no llegar otro; el tiempo va en `src/data/ritmo.json`. El ritmo de lectura (un toque o Enter salta la espera) no cambia.
- **Muchas opciones** (hasta 6 enemigos más Volver): la caja crece hacia arriba desde la franja de explicación, de modo que nunca se sale por abajo; si tampoco cabe hacia arriba, las filas se encogen hasta un mínimo y, como último recurso, se desplaza (con flechas o toque) en lugar de salirse.
- **Sitio para los mensajes:** bajo la barra de turnos queda reservada una banda de 3 líneas para ellos; los nombres de los enemigos (también los de jefes altos, que hoy suben hasta la barra de turnos) empiezan debajo de esa banda, nunca encima.
- **Tamaño de las filas:** en horizontal, como un texto de 12 px con aire (unos 18-20 lógicos); en vertical, las de hoy (34, mínimo 24, en `vertical.json`), que ya están pensadas para el dedo.

## Qué cambia en el código (para quien lo construya)

Todo en la capa que dibuja y en la escena; `core/combate.ts` y las reglas no se tocan.

- `src/render/combate.ts`: el panel (`dibujarPanel`, `dibujarPanelVertical`, `PANEL`, `PANEL_ESCALA`, `ANCLA_PANEL`, `aPanel`, `LISTA_COMBATE`, `FILA_COMBATE`, `DERECHA`, `dibujarRegistro` con sus columnas) da paso a cuatro piezas: la lista flotante, la ficha, la franja de explicación y los mensajes de arriba. `listaCombate(n)` y `filaCombate(n)` (que la escena usa para saber qué fila se toca) pasan a devolver la caja flotante.
- `src/core/disposicion.ts`: `disposicionCombate` reparte hoy escena y panel en vertical; pasa a dar dónde van la lista (junto a la heroína), la ficha y la franja, en las dos orientaciones, como función pura con test (como hoy).
- `colocarEscena`: sin panel, la escena tiene más alto; los enemigos y la heroína se recolocan para que nada de lo nuevo los tape.
- **Cámara del combate** (`bordeCamara`, `colocarCamara`): el borde de abajo del marco deja de ser el panel; pasa a ser lo más alto de lo que esté abajo mientras ataca alguien (con el menú cerrado, la ficha).
- **Cartel del mando** (`bajoCartelCombate`): acaba sobre la ficha y no sobre el panel.
- `src/escenas/combate.ts`: el registro (`v.registro`, `MENSAJES_GUARDADOS`, `historial` en `ritmo.json`) se queda en 3 mensajes con su momento de llegada, para saber cuándo apagarlos; `v.aviso` sigue sirviendo para los avisos con el menú abierto, ahora en la franja.
- **Lector de pantalla:** `anunciar` sigue igual (cada mensaje se anuncia al llegar).
- **Datos:** los números nuevos (cuántos mensajes, cuánto duran, deslizamiento, tamaños) van en `ritmo.json` o `vertical.json`, nunca en el código.

## Restricciones

- Cero asignaciones de memoria en el bucle de juego (como todo el render).
- Mismos colores y marcos que el resto de la interfaz (`render/marco.ts`, letra Space Mono, títulos con contorno).
- Funciona con teclado, toque y mando como hoy: mismas teclas, el toque elige con dos toques donde hoy lo hace (`efectoToque`).
- Horizontal (480×352) y vertical (interfaz alta) en el mismo cambio.

## Fuera de alcance

- Cambiar qué acciones hay o cómo funcionan; elegir 3 habilidades equipadas (otra idea aparcada).
- Un historial completo consultable a mano (se descartó al elegir los mensajes que se apagan).
- Mantener el panel antiguo como opción en Ajustes (descartado: un solo combate que mantener; el panel queda en el historial de git).

## Enfoques considerados

1. **Sustituir el panel por el menú nuevo** (elegido por Pedro): un solo combate que mantener y probar; el panel y su registro de 10 mensajes desaparecen.
2. **Los dos, a elegir en Ajustes:** red de seguridad para algún móvil, pero cada cambio futuro del combate se haría y revisaría dos veces. Descartado.

En el aspecto, Pedro eligió la **A (Octopath fiel)** frente a la B (lista flotante con una franja baja más fina que el panel, que seguiría siendo algo fijo) y la C (todo junto a la rana, con la vida sobre su cabeza y los mensajes sobre quien actúa: lo más dinámico, pero sin sitio para leer lo que pasa). Para los mensajes eligió **los 3 últimos que se van apagando** frente a una sola línea con historial a mano y frente al historial en la franja de abajo.

## Comprobación

- Tests de las funciones puras de disposición (nada se pisa ni se sale, en horizontal y vertical, con 1 a 7 opciones).
- Capturas en 1280×800 y 390×844 de: menú de acción, habilidades, objetivo con 3+ enemigos, turno de un monstruo, un jefe alto, un aviso «No quedan PM», el final («¡Victoria!»).
- Probar con el dedo (toque) y con teclado; el mando sigue el mismo camino que el teclado.
- Suite completa, lint y build.

## Cambio tras la revisión final (2026-11-21, decidido por Pedro)

En horizontal la pantalla es baja: con la banda de mensajes arriba, la franja de explicación abajo solo tenía una línea (se cortaban las explicaciones largas, como la de Fuego fatuo) y las filas de la lista se quedaban en 16 (pequeñas para el dedo). Pedro eligió, entre tres salidas, **poner la explicación arriba mientras se elige**: en horizontal, con el menú abierto, la banda de los mensajes muestra qué hace lo elegido (o el aviso) y no hay franja abajo; la lista llega hasta abajo, con filas de unos 19-20, y caben las 7 opciones de un combate con 6 enemigos. Al cerrar el menú vuelven los mensajes. En vertical no cambia (franja abajo, de 50).

