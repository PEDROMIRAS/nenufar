# Vídeo de demo de Nenúfar: diseño

Fecha: 2026-11-16. Aprobado por Pedro en la conversación (guion «perfecto»).

## Para qué

Un único vídeo que sirva a la vez de **pieza de portafolio** (qué es el proyecto y qué hay detrás) y de **tráiler para jugadores** (que den ganas de jugarlo). Éxito: se entiende en menos de 90 s qué es Nenúfar, cómo se juega y dónde jugarlo, y se ve el juego real, no imágenes generadas.

## Decisiones (de Pedro)

- **Solo imágenes reales del juego.** Nada de vídeo generado con IA: Open Higgsfield queda fuera (pide créditos de pago de la API de Higgsfield).
- **Voz en off en español**, generada en local con **VoiceStudio**: narrador **grave y pausado**, de cuento oscuro.
- **Horizontal 16:9, 1920×1080, 60-90 s** (objetivo ~85 s).
- **Grabación guionizada y automática** (opción 1): Chrome controlado por Playwright contra `npm run dev`, con semilla fija y los atajos de desarrollo; si cambia el juego, se regraba con un comando.
- Rótulos técnicos **discretos, en el tercio inferior**; nunca tapan el juego.

## Guion (aprobado)

| # | Tiempo | Imagen | Voz en off | Rótulo |
|---|---|---|---|---|
| 1 | 0:00–0:10 | Fundido desde negro a la portada 3D con la música del título. | «Hace mil años, la luna se apagó y el Rey sin Charca se bebió el agua del mundo. Esta noche, vuelve a apagarse.» | NENÚFAR (logo de la portada) |
| 2 | 0:10–0:18 | Elegir rana: el cursor pasa de la ronin a la maga y vuelve. | «Elige a tu heroína: la rana ronin, con su katana, o la rana maga, con su fuego morado.» | — |
| 3 | 0:18–0:33 | La ronin cruza una sala del Bosque (abre un cofre, sale por un arco); cortes de 2–3 s de Ruinas, Cripta y Cauce Seco (`?zona=N`). | «Recorre cuatro zonas que cambian en cada partida: el Bosque de la Última Lluvia, las Ruinas de la Orden, la Cripta de los Héroes y el Cauce Seco.» | Salas generadas por semilla · HD-2D con Three.js |
| 4 | 0:33–0:51 | La ronin toca un limo → combate: Corte rápido, el limo anuncia su golpe cargado, ella se defiende; corte a la maga lanzando fuego morado. | «Al tocar a un monstruo empieza un combate por turnos. Cada enemigo anuncia su golpe más fuerte un turno antes: tú decides si rematarlo o defenderte.» | Combate como máquina de estados · lógica testeada |
| 5 | 0:51–1:03 | Cartel de presagio (`?presagio=luna_roja`), altar, círculo rojo del desafío, ermitaño (`?evento`, `?desafio`, `?ermitano`). | «Presagios, altares, desafíos y un viejo ermitaño cambian las reglas de cada partida.» | — |
| 6 | 1:03–1:15 | Presentaciones de jefe: Guardián del Bosque, Golem de piedra, Reina Araña, Sacerdote de la luna falsa; un instante del Rey sin Charca (`?combate=<clave>`). | «Al final de cada zona aguarda un guardián. Y detrás de todos ellos, el Rey sin Charca.» | — |
| 7 | 1:15–1:25 | Toma del móvil en vertical (390×844) en el centro, la sala desenfocada a los lados; fundido al logo. | «Nenúfar. Juégalo gratis en el navegador, en el ordenador o en el móvil.» | pedromiras.github.io/nenufar · TypeScript · Three.js · sin motor |

Los tiempos son orientativos: manda la duración real de cada frase de voz más un respiro; cada plano dura lo que su voz + ~1 s, y el total se mantiene entre 60 y 90 s.

## Cómo se hace

Todo vive en `tools/video/` (fuera de `src/`, no entra en el juego ni en el build) y lo que se genera, en `tools/video/salida/` (ignorado por git, salvo el vídeo final si Pedro lo quiere en el repo).

1. **Planos** (`planos/*.ts`, uno por fila del guion): cada uno abre Chromium **con ventana** (no sin cabeza: WebGL y el bloom tienen que verse como en un navegador real) a 1920×1080, carga `http://localhost:5173/?semilla=N&…`, espera a que cargue y ejecuta su coreografía de teclas (`MOVER`, `CONFIRMAR`… por teclado) con esperas fijas. Mismo script, misma toma.
2. **Imagen**: grabación de la ventana con ffmpeg (`avfoundation`, 60 fps). Requiere el permiso de grabación de pantalla de macOS para el terminal. **Alternativa** si el permiso o el rendimiento fallan: fotogramas por CDP (`Page.startScreencast`) unidos con ffmpeg.
3. **Audio del juego**: se inyecta antes de cargar la página un enganche que, cuando un nodo se conecta a `AudioContext.destination`, lo conecta también a un `MediaStreamAudioDestinationNode` grabado con `MediaRecorder`; el script lo descarga al acabar el plano. Así se graba la música y los efectos sintetizados sin cables virtuales.
4. **Voz**: la CLI de VoiceStudio (`speak`) contra la app instalada, una pista WAV por frase, con la misma voz para todas. La voz se elige escuchando la frase 1 con 2-3 voces graves en español y se fija en el script.
5. **Montaje** (`montar.sh` o `montar.ts`): ffmpeg recorta cada plano a su duración, encadena con fundidos cortos, pone la voz encima, baja la música del juego bajo la voz (ducking con `sidechaincompress`), dibuja los rótulos (`drawtext` con la fuente del juego si su licencia lo permite, si no una sans libre) y exporta H.264 + AAC, 1920×1080, 30 o 60 fps.
6. **Plano 7** (vertical): se graba a 390×844 y se compone en el centro del 16:9 con la misma toma escalada y desenfocada detrás.

## Riesgos y qué hacer

- **Movimiento mecánico**: si la exploración queda rígida, ese plano lo graba Pedro jugando (opción 3, mixta), solo ese.
- **Atajos que no llevan exactamente al sitio** (p. ej. la presentación de un jefe con `?combate`): si alguno no sirve, se añade un atajo de desarrollo mínimo en `main.ts`, marcado y solo en desarrollo, en un commit aparte.
- **Audio que no engancha** (el juego crea el `AudioContext` tras un gesto): el enganche parchea el prototipo antes de cargar la página, así vale para cualquier contexto que se cree después.
- **VoiceStudio sin voz grave en español satisfactoria**: se prueba primero (paso 4) antes de montar nada.

## Fuera de alcance

Versión en inglés, corte vertical para redes, música nueva y cualquier imagen generada con IA.

## Cómo se comprueba

Pedro ve el vídeo final. Antes, se le enseñan la muestra de voz (frase 1) y un primer montaje sin rótulos.
