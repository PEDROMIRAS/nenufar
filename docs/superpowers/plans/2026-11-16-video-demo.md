# Vídeo de demo: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un vídeo de ~85 s (1920×1080, H.264 + AAC) con el juego real, voz en off en español de VoiceStudio y rótulos discretos, regenerable con comandos.

**Architecture:** Paquete aparte en `tools/video/` (no toca el `package.json` del juego). Cada plano es un script de Playwright que abre Chromium con ventana contra `npm run dev`, graba la ventana con ffmpeg y el audio del juego desde la página; la voz sale de la CLI de VoiceStudio; `montar.ts` calcula los tiempos a partir de la duración de cada voz y llama a ffmpeg.

**Tech Stack:** Node 25, TypeScript con `tsx`, Playwright (Chromium), ffmpeg (Homebrew), CLI de VoiceStudio, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-16-video-demo-design.md`

## Global Constraints

- Solo imágenes reales del juego; nada generado con IA.
- Voz en español, narrador grave y pausado, la misma voz en las 7 frases (textos exactos del guion de la spec).
- Salida 1920×1080, 16:9, entre 60 y 90 s; cada plano dura su voz + 1 s.
- Rótulos en el tercio inferior, pequeños, sin tapar el juego.
- Nada en `src/` salvo un atajo de desarrollo imprescindible (solo en `import.meta.env.DEV`, commit aparte).
- `tools/video/salida/` y `tools/video/node_modules/` fuera de git.
- Código, comentarios y commits en español.

## Review Focus

- Audio del juego en silencio: el `AudioContext` se crea tras un gesto; el enganche debe parchear `AudioNode.prototype.connect` antes de que cargue la página. Comprobado en Task 1 midiendo el volumen de la pista grabada.
- Voz más larga que su plano: los tiempos salen de la duración de la voz, no del guion. Test de `tiempos.ts` en Task 3.
- Total fuera de 60-90 s: `calcularTiempos` lanza un error. Test en Task 3.
- Grabación de pantalla sin permiso de macOS: ffmpeg da un vídeo negro; Task 1 comprueba que el fotograma central no es negro.
- Un atajo que no lleva al sitio (presentación de jefe): se ve en la revisión de cada plano (Task 4) y se arregla ahí.

---

### Task 1: Base de grabación (un plano de prueba con imagen y audio)

**Files:**
- Create: `tools/video/package.json`, `tools/video/tsconfig.json`, `tools/video/.gitignore`
- Create: `tools/video/grabar.ts` (abrir navegador, grabar, enganche de audio)
- Create: `tools/video/planos/01_portada.ts`

**Interfaces:**
- Produces: `grabarPlano(nombre: string, opciones: { url: string; ancho?: number; alto?: number; duracion: number; coreografia: (pagina: Page) => Promise<void> }): Promise<{ video: string; audio: string }>` en `grabar.ts`; escribe `salida/planos/<nombre>.mp4` y `salida/planos/<nombre>.webm` (audio).

- [x] **Step 1:** `brew install ffmpeg`; `cd tools/video && npm install -D playwright tsx typescript @types/node` y `npx playwright install chromium`.
- [x] **Step 2:** `grabar.ts`: `chromium.launch({ headless: false })`, ventana del tamaño pedido; `addInitScript` que parchea `AudioNode.prototype.connect` para que cualquier conexión a un `destination` se duplique hacia un `MediaStreamAudioDestinationNode` por contexto, grabado con `MediaRecorder`; al acabar, el script lee el blob con `page.evaluate` y lo guarda. La imagen: ffmpeg `-f avfoundation -framerate 60 -capture_cursor 0` de la pantalla, recortado a la ventana (`crop`) y a 60 fps; se arranca justo antes de la coreografía y se para con `q`.
- [x] **Step 3:** `01_portada.ts`: `npm run dev` en marcha; URL `http://localhost:5173/nenufar/?semilla=7` (comprobar la base de Vite), un clic para desbloquear el audio y 12 s de espera.
- [x] **Step 4: Verificar.** `npx tsx planos/01_portada.ts`; luego `ffmpeg -i salida/planos/01_portada.webm -af volumedetect -f null -` da `mean_volume` por encima de −50 dB, y un fotograma extraído a los 6 s no es negro (`signalstats`, YAVG > 10). Si sale negro: dar permiso de grabación de pantalla al terminal y repetir.
- [x] **Step 5: Commit** `tools/video/` (sin `salida/` ni `node_modules/`).

### Task 2: Muestra de voz (se para aquí hasta que Pedro elija)

**Files:**
- Create: `tools/video/voz.ts`, `tools/video/guion.ts`

**Interfaces:**
- Produces: `GUION: { id: string; voz: string; rotulo?: string }[]` (7 entradas, textos exactos de la spec) en `guion.ts`; `generarVoz(texto: string, voz: string, salida: string): Promise<number>` (devuelve la duración en segundos, medida con `ffprobe`) en `voz.ts`.

- [x] **Step 1:** Ver la ayuda de la CLI (`python -m voicestudio_cli speak --help` desde `~/tools/voiceStudio/cli`, o el binario que traiga la app) y cómo listar voces; arrancar la app si la CLI necesita su backend.
- [x] **Step 2:** Generar la frase 1 con 2-3 voces graves en español → `salida/muestras/<voz>.wav`.
- [x] **Step 3:** Enseñarle las muestras a Pedro y fijar la elegida en `guion.ts` (`VOZ`). **No seguir sin su elección.**
- [x] **Step 4: Commit.**

### Task 3: Tiempos del montaje (lógica pura con test)

**Files:**
- Create: `tools/video/tiempos.ts`, `tools/video/tiempos.test.ts`

**Interfaces:**
- Produces: `calcularTiempos(voces: number[], respiro = 1): { inicio: number; duracion: number }[]`; lanza `Error` si el total queda fuera de [60, 90].

- [x] **Step 1: Test** (`node:test`): `calcularTiempos([9, 7])` lanza (total 18); `calcularTiempos([9,7,13,16,10,10,8])` → duraciones `[10,8,14,17,11,11,9]`, inicios acumulados `[0,10,18,32,49,60,71]`; `calcularTiempos(Array(7).fill(15))` lanza (112).
- [x] **Step 2:** `npx tsx --test tiempos.test.ts` → FAIL.
- [x] **Step 3:** Implementar.
- [x] **Step 4:** → PASS. **Step 5: Commit.**

### Task 4: Los siete planos

**Files:**
- Create: `tools/video/planos/02_ranas.ts` … `07_movil.ts` (y rehacer `01_portada.ts` con fundido y su duración)
- Modify (solo si hace falta): `src/main.ts` con un atajo de desarrollo, commit aparte.

**Interfaces:**
- Consumes: `grabarPlano` (Task 1). Cada plano graba algo más que su duración máxima prevista (voz + 3 s); el recorte exacto lo hace el montaje.

- [x] **Step 1:** Leer cómo se empieza una partida (portada → elegir rana → nombre → dificultad → puntos) y las teclas de `src/input/` para escribir las coreografías.
- [x] **Step 2:** Un plano por fila del guion, con sus atajos: 02 elegir rana; 03 Bosque con cofre y salida + `?zona=1,2,3` (2-3 s cada una, cuatro grabaciones); 04 combate con la ronin (`?combate=limo`) y con la maga; 05 `?presagio=luna_roja`, `?evento`, `?desafio`, `?ermitano`; 06 `?combate=` con `rey_limo`, `golem`, `reina_arana`, `sacerdote` y `rey_sin_charca`; 07 a 390×844.
- [x] **Step 3: Verificar** cada plano sacando 3 fotogramas (`ffmpeg -ss`) y mirándolos; si un atajo no lleva al sitio, arreglarlo aquí.
- [x] **Step 4: Commit.**

### Task 5: Voz completa y montaje

**Files:**
- Create: `tools/video/montar.ts`

**Interfaces:**
- Consumes: `GUION`, `generarVoz`, `calcularTiempos`, los planos de `salida/planos/`.
- Produces: `salida/nenufar_demo.mp4` (y `salida/nenufar_demo_sin_rotulos.mp4` para la primera revisión).

- [x] **Step 1:** Generar las 7 voces y sus duraciones; `calcularTiempos`.
- [x] **Step 2:** ffmpeg: recortar y escalar cada plano a 1920×1080 (el 03 y el 06 concatenan sus sub-tomas), fundidos de 0,5 s (`xfade`), voz encima con su `inicio` (`adelay`), audio del juego bajo la voz (`sidechaincompress`), fundido de entrada y salida; el 07 compuesto sobre su propia toma escalada y desenfocada (`boxblur`).
- [x] **Step 3:** Rótulos con `drawtext` (fuente libre, ~28 px, blanco al 85 %, sombra, abajo a la izquierda, con fundido).
- [x] **Step 4: Verificar:** `ffprobe` da 1920×1080, H.264, duración entre 60 y 90 s; ver el vídeo y revisar que la voz no se pisa.
- [x] **Step 5:** Enseñar a Pedro primero la versión sin rótulos y luego la final. **Commit** (el `.mp4` solo si Pedro lo quiere en el repo).


## Resultado (2026-11-17)

**Hecho.** Vídeo final en `docs/video/nenufar_demo.mp4` (77,6 s, 1920×1080, H.264 + AAC, 60 fps), aprobado por Pedro. Para rehacerlo, desde `tools/video`, con la build de grabación servida (`npx vite preview --config tools/video/vite.grabar.config.ts`) y VoiceStudio abierto: `npx tsx planos/0N_*.ts` (tomas), `npx tsx voces.ts` (voz), `npx tsx montar.ts` (~11 min, versión sin rótulos) y `npx tsx rotulos.ts` (~1 min). Todo lo generado va a `~/tools/nenufar-video/`.

**Cambios respecto al plan:**
- Task 1: imagen por screencast de CDP (ventana de 960×540 a dpr 2), no `avfoundation`: la pantalla del MacBook Air no cabe 1920×1080 y no pide permiso de grabación de pantalla.
- Task 2: ni CLI ni OmniVoice (pide licencia CC-BY-NC); VoxCPM2, demasiado lento; Kokoro sonaba robótico. Voz con **Qwen3-TTS VoiceDesign** (motor mlx-audio de VoiceStudio, Apache), diseñada con una descripción («narrador de tráiler de videojuego… español de España») y semilla fija; se rebajan las eses y no lleva eco (Pedro: «mucho eco, muchas ss, como un inglés hablando español»). `VOZ` vive en `voz.ts`, no en `guion.ts`.
- Task 4: `pulsar` mantiene la tecla 80 ms (el juego lee las flechas como teclas sostenidas y perdía las instantáneas); atajo nuevo `?presentar` en `src/main.ts`; `empezarPartida` cuenta las páginas de historia de cada atajo; plano extra `00_musica.ts` (la música del Bosque bajo los planos 1 y 2, que no tienen música en el juego).
- Task 5: este ffmpeg no tiene `drawtext`: los rótulos se dibujan como PNG con Chrome (`rotulos.ts`, monoespaciada en negrita como el juego) y se superponen al montaje. El del combate va a la derecha, sobre el panel de acciones, para no taparlo.

**Pendiente / ideas:**
- Fusionada en `main` el 2026-11-17.
- Enlazar el vídeo desde el portafolio: **todavía no** (Pedro, 2026-11-17); desde el README, cuando Pedro lo pida.
- En el plano 6 cada jefe sale ~1,7 s y del gólem y el sacerdote solo se ve el cartel con su nombre: si se quiere más combate, enseñar menos jefes o alargar el plano.
- Una versión vertical (9:16) para redes, con las tomas del móvil.
