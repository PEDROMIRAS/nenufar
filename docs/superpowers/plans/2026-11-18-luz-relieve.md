# Luz y relieve: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el juego deje de verse plano en las cuatro zonas: relieve en los sprites, luz con contraste, fuentes de luz en todas las salas y cámara del combate.

**Architecture:** Sale de la prueba ya hecha en esta rama (`luz-relieve`, antes `prueba-luz`: `core/relieve.ts`, `texturaNormales`, `core/camaraCombate.ts`, `relieve` y `niebla` en `hd2d.json`, `camara` en `impacto.json`). Lo puro va en `src/core/` con test; los modelos de las fuentes de luz, en un archivo nuevo `src/render/mundo/ambiente.ts`; todos los números, en `hd2d.json` e `impacto.json`.

**Tech Stack:** TypeScript strict, Three.js 0.180, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-luz-relieve-design.md`

## Global Constraints

- Como mucho cuatro luces de punto por sala (`PUNTUALES` = 4, sin cambiar).
- Calidad baja (`calidadAlta` falso): sin mapa de normales en los sprites ni relieve en el suelo, además de lo que ya quita.
- `src/core/` sin navegador; números en `src/data/`; cero asignaciones por fotograma; español en código, comentarios y commits (`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Vitest: `npx vitest run tests/<archivo>`; suite: `npm test`, `npm run lint`, `npm run build`. Servidor de capturas: `npm run dev -- --port 5199`, Playwright de `tools/video` con el Chrome del sistema.

## Review Focus

1. **Una sala con objetos de luz y fuentes de ambiente a la vez:** las de ambiente solo entran si la sala no tiene luces propias, y la hoguera de la portada sigue siendo la que hace sombra → test de `lugaresDeLuz` + condición en `montar` (Task 3).
2. **La portada, el combate y la presentación de jefe** usan la misma sala 3D: las fuentes de ambiente salen también de fondo del combate sin romper el desenfoque → capturas (Task 3 y 5).
3. **Cambiar la calidad en Ajustes con una sala ya montada:** los sprites pierden o recuperan el relieve sin recargar → Task 1, comprobado con captura tras cambiarla.
4. **Hojas de sprite grandes** (jefes de 128×96 a doble resolución): el mapa de normales se calcula una vez por hoja y no congela la carga de la zona → `texturaNormales` con caché (Task 1); medir el tiempo de la primera sala con jefe.
5. **Golpes encadenados del mismo atacante** (`ultimoAtacante`): la cámara no da tirones al empezar el segundo → `zoomAtaque` con el tiempo del ataque en curso (Task 4).

---

### Task 1: Relieve en los sprites, con test y calidad baja

**Files:**
- Test: `tests/relieve.test.ts`
- Modify: `src/core/relieve.ts` (ya existe), `src/render/mundo/mundo.ts` (`crearActor`, `aplicarCalidad`, suelo de `montar`)

**Interfaces:**
- Produces: `normalesDeSprite(rgba, ancho, alto, o: OpcionesRelieve): Uint8ClampedArray` (ya existe; tests nuevos). En `mundo.ts`, los materiales con relieve guardan su mapa en `userData.normales` / `userData.relieveSuelo` y `aplicarCalidad` los quita o pone.

- [ ] **Step 1: Tests** de `normalesDeSprite` con una imagen de 7×7 con un cuadrado opaco de 5×5 en medio: el píxel central apunta de frente (z ≈ 255, x e y ≈ 128); el del borde izquierdo apunta a la izquierda (x < 128); el de arriba, hacia arriba (y > 128); los transparentes conservan alfa 0; con `fuerza` 0 todos los opacos dan (128, 128, 255).
- [ ] **Step 2:** `npx vitest run tests/relieve.test.ts` → PASS (la función ya existe; si alguno falla, el fallo es de la función: arreglarla).
- [ ] **Step 3: Calidad baja:** `aplicarCalidad` recorre las mallas de la escena y pone `normalMap` / `bumpMap` a `null` (baja) o a lo guardado en `userData` (alta), con `material.needsUpdate = true`; `crearActor` y el suelo de `montar` crean el material ya según `calidadAlta`.
- [ ] **Step 4:** captura de una sala en alta y tras cambiar a baja en Ajustes (sin recargar); medir con `performance.now()` cuánto tarda `texturaNormales` con la hoja más grande (consola) y apuntarlo.
- [ ] **Step 5: Commit** — `git commit -m "Relieve de los sprites: tests y sin relieve en calidad baja"`

### Task 2: Luz con contraste en las cuatro zonas

**Files:**
- Modify: `src/data/hd2d.json` (`zonas.<zona>.cielo.intensidad`, `principal`, `niebla`; `luces.*.intensidad` y `alcance`)

- [ ] **Step 1:** capturas de antes (portada de cada zona con `?portada=<zona>_descanso_01`, una sala de combate con `?zona=N&semilla=7` y un combate con `?combate=<monstruo de la zona>`), a 1000×640.
- [ ] **Step 2:** ajustar los valores con estos puntos de partida: cielo Bosque 0,85, Ruinas 0,9, Cripta 1,2, Cauce 1,2; niebla 0,012 en las cuatro; luces de objetos ×1,4 de intensidad y +2 de alcance (la hoguera, 20 y 8). Criterio: nada quemado junto a una luz (el pixel art conserva sus colores) y nada negro lejos de ellas.
- [ ] **Step 3:** capturas de después de lo mismo; comparar por parejas; apuntar los valores finales.
- [ ] **Step 4:** `npm test` (los tests de `hd2d.json`, si los hay) → pasa.
- [ ] **Step 5: Commit** — `git commit -m "Luz con contraste en las cuatro zonas"`

### Task 3: Fuentes de luz en las salas que no tienen

**Files:**
- Create: `src/render/mundo/ambiente.ts`, `tests/luces.test.ts` (o ampliar el que haya)
- Modify: `src/core/luces.ts`, `src/core/types.ts` (`ZonaHd2d.ambiente`), `src/data/hd2d.json` (`zonas.<zona>.ambiente`, `luces.luciernagas|haz|fuego_fatuo|grieta`), `src/render/mundo/mundo.ts` (`montar`)

**Interfaces:**
- Produces: `lugaresDeLuz(sala: { ancho: number; alto: number; solido: readonly boolean[]; objetos: readonly { x: number; y: number }[] }, salidas: readonly { entrada: readonly [number, number] }[], cuantos: number, distancia: number, azar: () => number): [number, number][]` en `core/luces.ts`: casillas libres (no sólidas, sin objeto) a `distancia` o más de cada entrada y separadas entre sí al menos `distancia`; como mucho `cuantos`; determinista con el mismo azar.
- `ZonaHd2d.ambiente?: { tipo: 'luciernagas' | 'haz' | 'fuego_fatuo' | 'grieta'; min: number; max: number; distancia: number }`.
- `crearAmbiente(tipo, azar): { obj: THREE.Object3D; actualizar: (tiempo: number) => void }` en `ambiente.ts` (luciérnagas: 8-12 puntos amarillo verdoso que flotan; haz: cono translúcido aditivo desde arriba con motas; fuego fatuo: esfera violeta emisiva que sube y baja; grieta: plano en el suelo con grietas naranjas que laten).

- [ ] **Step 1: Tests** de `lugaresDeLuz`: en una sala de 21×13 vacía con una salida, devuelve `cuantos` casillas, todas libres, a `distancia` o más de la entrada y entre sí; con la sala llena de sólidos, `[]`; con el mismo azar, el mismo resultado.
- [ ] **Step 2:** test → FAIL; implementar; → PASS.
- [ ] **Step 3:** `ambiente.ts` y, en `montar`, tras poner los objetos: si `v.luces` está vacío y la zona tiene `ambiente`, entre `min` y `max` fuentes (con `v.azar`) en `lugaresDeLuz(...)`, cada una con su modelo en el grupo, su animación en `v.animados` y su luz en `v.luces` (`compararLuces` ordena). Valores de partida: Bosque luciérnagas 1-2, Ruinas haz 1, Cripta fuego fatuo 1-2, Cauce grieta 1-2; `distancia` 3.
- [ ] **Step 4:** capturas de una sala de combate de cada zona (mapa) y del fondo de un combate; la portada de cada zona sin cambios (tiene sus luces).
- [ ] **Step 5:** `npm test`, `npm run lint`, `npm run build` → pasan.
- [ ] **Step 6: Commit** — `git commit -m "Fuentes de luz en las salas sin luces: luciérnagas, haz, fuego fatuo y grieta"`

### Task 4: Cámara del combate, más fuerte en los golpes que importan

**Files:**
- Modify: `src/core/camaraCombate.ts`, `tests/camaraCombate.test.ts`, `src/data/impacto.json` (`camara.fuerte`), `src/render/combate.ts` (`VistaCombate.ataqueFuerte`, `acercarAlAtaque`), `src/escenas/combate.ts` (al empezar la animación de un golpe: `v.ataqueFuerte = siguiente.critico || siguiente.cargado || hay un jefe en el combate`)

**Interfaces:**
- Produces: `zoomAtaque(t: number, golpe: number, d: CamaraCombateJson, fuerte = false): number` — con `fuerte`, el zoom se multiplica por `d.fuerte` (partida: 1,6).

- [ ] **Step 1: Test** nuevo: con `fuerte`, en el tramo quieto el zoom es `1 + zoom × fuerte`; sin él, igual que antes.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** captura de un golpe normal y de uno de jefe (`?combate=rey_limo`) en pleno ataque.
- [ ] **Step 4: Commit** — `git commit -m "Cámara del combate: más cerca en críticos, golpes cargados y jefes"`

### Task 5: Capturas finales y cierre

- [ ] **Step 1:** capturas finales de las cuatro zonas (mapa, combate, portada) a 1000×640 y 390×844 en `docs/previews/luz_<zona>_<pantalla>.png`, y las de antes con el mismo nombre y `_antes`; borrar las `prueba_luz_*` que ya no sirvan.
- [ ] **Step 2:** `CLAUDE.md` (Estado y Próximos pasos) y «Resultado» de este plan con lo visto, lo no visto (el móvil real, el rendimiento) y los valores finales.
- [ ] **Step 3: Commit** — `git commit -m "CLAUDE.md y plan: luz y relieve hecho"`

## Resultado (2026-11-18)

Hecho en línea. Suite, lint y build pasan.

- **Valores finales:** cielo Bosque 0,85, Ruinas 0,9 (principal 1,6), Cripta 1,4 (principal 1,0), Cauce 1,6; niebla 0,012; luces de objetos ×1,4 y +2 de alcance (hoguera 20 y 8); luciérnagas 3,5, haz 9, fuego fatuo 7, grieta 7; relieve radio 5, detalle 0,35, fuerza 2,5, escala 1,5, suelo 0,6; cámara 12 % y ×1,6 en golpes fuertes.
- **Visto con Chrome sin cabeza:** la portada de las cuatro zonas, la primera sala de cada zona (1000×640 y 390×844), una sala de combate entera por zona, un combate por zona, el acercamiento normal y el de jefe, y el cambio de calidad sin recargar.
- **Medido:** el mapa de normales de la hoja más grande (2208×384) tarda 58 ms en el Mac, una vez por hoja.
- **Sin ver:** el móvil real (rendimiento incluido), las fuentes de luz en movimiento, salas sin luces de la Cripta y el Cauce. En las salas del Cauce con braseros solo arriba, la mitad de abajo queda en penumbra.
