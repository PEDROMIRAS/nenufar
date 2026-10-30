# Reglas nuevas (fórmula de defensa, nivel 12, rangos más bajos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar el cálculo del daño a la fórmula del cociente, subir el nivel máximo a 12 y bajar 10 puntos los rangos de victoria, dejando las tres zonas actuales reequilibradas con más vida de los monstruos.

**Architecture:** `calcularDanio` (única función de daño directo en `src/core/combate.ts`) cambia de cuerpo sin cambiar de firma. Todo lo demás son números de `src/data/*.json` y los rangos de dos tests de equilibrado. El reequilibrado se hace con el método de siempre: un test temporal que muta `DIFICULTADES`, `HEROES` y `MONSTRUOS` y no se sube.

**Tech Stack:** TypeScript estricto, Vitest, Vite. Windows: ejecutar los comandos desde `C:\Users\pmira\Documents\GitHub\nenufar` con la **C mayúscula** (con `c:\` minúscula Vitest carga dos copias y todo falla).

**Spec:** `docs/superpowers/specs/2026-10-30-cauce-seco-design.md` (secciones «Fórmula de daño: la defensa» y «Equilibrado»). Este plan cubre solo la **entrega 1** de la sección «Cómo se puede partir en entregas». Los planes de las entregas 2 (monstruos movidos) y 3 (Cauce Seco) se escriben después, con los números que salgan de esta.

## Global Constraints

- Fórmula (decidida por Pedro): `daño = max(1, ⌊ (ATQ × poder)² / (ATQ × poder + DEF × factor) × varianza × crítico ⌋)`, con `factor` 0,5 en físico y 0,25 en mágico (`defensaFisica` y `defensaMagica` de `combate.json`, sin cambiar).
- Se aplica a todo el daño directo, de heroínas y de monstruos. El veneno y la quemadura (porcentaje de vida), *Defender* (×0,5) y el tope del golpe cargado no cambian.
- Nivel máximo 12 (`experiencia.nivelMaximo` de `combate.json`, hoy 10). Las curvas de experiencia (`porNivel` 20) y de crecimiento por nivel no cambian de forma.
- Rangos de victoria de partida completa: **Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 %**, menos de 5 puntos entre heroínas. Jefes violetas, media por heroína: **65 / 50 / 35 ± 10**, ningún combate violeta bajo el 25 %, dragón entre 20 puntos por debajo y 10 por encima del violeta de su zona.
- Palanca de equilibrado: la **vida** de los monstruos. No se toca su defensa (la defensa frena el doble el daño físico y castigaba solo a la ronin). Las dificultades siguen ordenadas: ataque y vida de los monstruos no bajan de Fácil a Difícil y la recuperación no sube.
- Ningún número de diseño en el código: todo sale de `src/data/*.json`. Los valores se buscan con margen, no en el filo (el centro del rango ±3).
- Código, comentarios, commits y documentación en español. Commits pequeños; terminar cada commit con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Si un test de equilibrado falla se ajustan los JSON, **nunca la fórmula** (la fórmula ya está decidida).

## Review Focus

Entradas o condiciones que el spec implica y que nadie probaría si no se anotan. Cada una tiene su test en la tarea que posee el código.

- **Ataque 0** (el muñeco de `recompensas.test.ts`, monstruos con `ataque: 0`): el cociente divide entre `ATQ × poder + DEF × factor`; con ataque 0 y defensa 0 sería 0/0 → `NaN`. Debe dar daño 1, nunca `NaN` (Tarea 2).
- **Defensa enorme o ataque mínimo:** el daño no baja de 1 y nunca es mayor con más defensa (Tarea 2).
- **Estados que multiplican la defensa** (*Postura de hierro* ×1,5, *Furia* ×0,7): la defensa efectiva es fraccionaria y el resultado sigue siendo entero ≥ 1 y menor con más defensa (Tarea 2).
- **Nivel 12:** al llegar al máximo no sube más ni acumula experiencia, y las habilidades «de nivel máximo» siguen su regla (Tarea 3).
- **Guardado anterior con heroína de nivel ≤ 10:** sigue cargando (no se cambia `VERSION_GUARDADO`; el nivel máximo solo sube). Se comprueba al pasar la suite entera (Tarea 6).

---

### Task 1: Referencia previa de la vida que quita un combate

Antes de cambiar la fórmula hay que apuntar cuánto daño hace hoy un combate de cada zona, para no perder lo que se hizo con la Cripta (los probadores la veían fácil). Sirve de referencia en la Tarea 5.

**Files:**
- Create: `docs/superpowers/plans/2026-10-30-reglas-nuevas-referencia.md`

**Interfaces:**
- Produces: el archivo de referencia, con la línea `vida que quita un combate` de cada zona, dificultad y heroína.

- [ ] **Step 1: Crear la rama.** `git switch -c reglas-nuevas` desde `main` limpio.
- [ ] **Step 2: Ejecutar `npx vitest run tests/equilibrado.test.ts`** desde `C:\Users\pmira\Documents\GitHub\nenufar`. Esperado: PASS (los rangos viejos aún se cumplen). El test imprime por cada dificultad y heroína `partidas completas N%` y `vida que quita un combate: bosque X% · ruinas Y% · cripta Z%`.
- [ ] **Step 3: Copiar al archivo de referencia** las seis líneas (3 dificultades × 2 heroínas) con su `partidas completas` y su `vida que quita un combate`, tal como salen, bajo el título «Antes de las reglas nuevas (2026-10-30)».
- [ ] **Step 4: Commit.** `git add docs/superpowers/plans/2026-10-30-reglas-nuevas-referencia.md` y `git commit -m "Referencia de equilibrado antes de las reglas nuevas"`.

---

### Task 2: Fórmula del cociente

**Files:**
- Modify: `src/core/combate.ts:237-257` (`calcularDanio`)
- Modify: `src/core/types.ts:269` (comentario de `defensaFisica`)
- Test: `tests/combate.test.ts` (bloque `describe('calcularDanio')`, líneas 36-62), `tests/habilidades.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `calcularDanio(ataque: number, poder: number, defensa: number, factorDefensa: number, reglas: ReglasCombate, azar: () => number, criticoSeguro?: boolean, extraCritico?: number): { cantidad: number; critico: boolean }` **con la misma firma de hoy**. Quien la llama (`golpear`, `src/core/combate.ts:561`) no cambia.

- [ ] **Step 1: Escribir los tests que fallan** en `tests/combate.test.ts`, dentro de `describe('calcularDanio')`, con `cola()` (devuelve 0,5: varianza ×1, sin crítico). Nombres y aserciones:
  - `'contra defensa baja casi no cambia'`: `calcularDanio(13, 1, 3, 0.5, reglas, cola()).cantidad` es `11` (169 / 14,5 = 11,65).
  - `'contra defensa alta deja más que la resta'`: `calcularDanio(13, 1, 18, 0.5, reglas, cola()).cantidad` es `7` (169 / 22 = 7,68; con la resta eran 4).
  - `'el poder multiplica el ataque antes de la defensa'`: `calcularDanio(10, 3, 20, 0.5, reglas, cola()).cantidad` es `22` (900 / 40 = 22,5).
  - `'con ataque 0 el daño es 1, nunca NaN'`: `calcularDanio(0, 1, 0, 0.5, reglas, cola()).cantidad` y `calcularDanio(0, 1, 5, 0.5, reglas, cola()).cantidad` son `1`.
  - `'más defensa nunca da más daño y nunca baja de 1'`: para `defensa` de 0 a 60 (de 1 en 1) con `calcularDanio(13, 1, defensa, 0.5, reglas, cola()).cantidad`, la serie es no creciente y todos son ≥ 1; repetir con defensa `4.5` (fraccionaria, como *Postura de hierro*).
  - Ajustar el texto del test `'aplica la fórmula del documento'` y el comentario a `// 9² / (9 + 3 × 0,5) = 7,71 → 7` (el resultado, 7, no cambia).
- [ ] **Step 2: Ejecutar `npx vitest run tests/combate.test.ts`.** Esperado: FALLAN los tests nuevos de defensa alta (da 4) y de poder (da 20), y el de ataque 0 si el cuerpo ya es el nuevo.
- [ ] **Step 3: Cambiar el cuerpo de `calcularDanio`** en `src/core/combate.ts`, sin cambiar la firma: con `fuerza = ataque × poder` y `resistencia = defensa × factorDefensa`, la base es `fuerza > 0 ? fuerza² / (fuerza + resistencia) : 0`; la varianza, el crítico y `Math.max(1, Math.floor(...))` quedan como están. Actualizar el comentario de la función a la fórmula nueva y el de `defensaFisica` en `src/core/types.ts:269` a «Parte de la Defensa que cuenta en el denominador del cociente del daño (físico y mágico)».
- [ ] **Step 4: Ejecutar `npx vitest run tests/combate.test.ts`.** Esperado: PASS.
- [ ] **Step 5: Recalcular los tests con cifras de daño de `tests/habilidades.test.ts`.** Con la fórmula nueva: *Fuego morado* sigue en 14 (225/15,75), *Iaido* en 26, *Tajo del viento* en 6 por enemigo y *Fuego fatuo* en 7; cambia *Postura de hierro* (golpe del Limo con defensa 9 → `36 / (6 + 4,5) = 3,43` → 3), así que `expect(c.heroina.pv).toBe(PV_RONIN - 3)` y su comentario. Actualizar los comentarios de cada test a la fórmula nueva.
- [ ] **Step 6: Ejecutar `npm test`.** Cada fallo restante que sea por una cifra de daño se recalcula a mano con la fórmula nueva y se corrige en el test (no en la fórmula). Candidatos: tests que cuentan el golpe del Limo (ataque 6) a la ronin (defensa 6 → ahora 4 en vez de 3) en `tests/combate.test.ts`, `tests/jefes.test.ts` o `tests/monstruos_ia.test.ts`. Esperado al final: todos PASS salvo los de equilibrado y violetas (esos se resuelven en la Tarea 5).
- [ ] **Step 7: Commit.** `git add src/core/combate.ts src/core/types.ts tests` y `git commit -m "Daño con fórmula de cociente: la defensa ya no anula el golpe"`.

---

### Task 3: Nivel máximo 12

**Files:**
- Modify: `src/data/combate.json:61` (`nivelMaximo`)
- Test: `tests/progresion.test.ts:61-67`, `tests/habilidades.test.ts:192-225`, `tests/recompensas.test.ts:140-141`

**Interfaces:**
- Consumes: nada.
- Produces: `REGLAS.experiencia.nivelMaximo === 12`.

- [ ] **Step 1: Escribir el test que falla** en `tests/progresion.test.ts`: `'el nivel máximo es 12'` con `expect(REGLAS.experiencia.nivelMaximo).toBe(12)` (importar `REGLAS` de `../src/data/datos`), y cambiar `'en el nivel máximo no sube más ni acumula experiencia'` para que espere `[12, 0]` en lugar de `[10, 0]` y que, tras `ganarExperiencia(h, 500, r)`, siga en nivel 12 con experiencia 0.
- [ ] **Step 2: Ejecutar `npx vitest run tests/progresion.test.ts`.** Esperado: FAIL (nivel 10).
- [ ] **Step 3: Cambiar `nivelMaximo` a `12`** en `src/data/combate.json`.
- [ ] **Step 4: Quitar el 10 literal de los tests y de los comentarios:** en `tests/habilidades.test.ts` líneas 192-225 usar `REGLAS.experiencia.nivelMaximo` donde hoy dice 10 (`combate(heroes.maga, 10)` y el texto «ni a nivel 10» pasa a «ni al nivel máximo»); en `tests/recompensas.test.ts:140-141` el comentario pasa a «tramo 1 en los niveles 1-3, 2 en los 4-6 y 3 en los 7-12».
- [ ] **Step 5: Buscar usos literales** con `git grep -nE "nivel 10|Nivel 10|/10|=== 10" -- src tests`. No debería quedar ninguno ligado al máximo; si queda alguno, usa `nivelMaximo`.
- [ ] **Step 6: Ejecutar `npm test`.** Esperado: PASS salvo equilibrado y violetas.
- [ ] **Step 7: Commit.** `git add src/data/combate.json tests` y `git commit -m "Nivel máximo de las heroínas: de 10 a 12"`.

---

### Task 4: Rangos nuevos en los tests de equilibrado

**Files:**
- Modify: `tests/equilibrado.test.ts:5-12`
- Modify: `tests/violetas.test.ts:7-17`

**Interfaces:**
- Consumes: nada.
- Produces: los rangos de la sección «Global Constraints», que usa la Tarea 5 como criterio.

- [ ] **Step 1: En `tests/equilibrado.test.ts`** cambiar `OBJETIVO` a `facil: [65, 75]`, `normal: [45, 55]`, `dificil: [25, 35]` y el comentario de arriba a «decisión de Pedro del 2026-10-30: cada franja 10 puntos por debajo de las del 26 de octubre, para que sea un reto».
- [ ] **Step 2: En `tests/violetas.test.ts`** cambiar `OBJETIVO` a `{ facil: 65, normal: 50, dificil: 35 }` y el comentario (líneas 7-9) a «cerca del 65 % en Fácil, del 50 % en Normal y del 35 % en Difícil». `MARGEN` (10) y `SUELO` (25) no cambian.
- [ ] **Step 3: Ejecutar `npx vitest run tests/equilibrado.test.ts tests/violetas.test.ts`.** Esperado: FAIL (el juego está afinado a los rangos viejos y a la fórmula vieja). Anotar las líneas impresas: son el punto de partida de la Tarea 5.
- [ ] **Step 4: Commit.** `git add tests` y `git commit -m "Rangos de equilibrado 10 puntos más bajos (partida completa y jefes violetas)"`.

---

### Task 5: Reequilibrar con la vida de los monstruos

Es solo datos. Hay que dejar `equilibrado.test.ts` y `violetas.test.ts` en verde con margen.

**Files:**
- Modify: `src/data/dificultades.json` (`vida`, `ataque`, `violetas`, solo si hace falta)
- Modify: `src/data/monstruos.json` (`estadisticas.pv` de monstruos concretos, solo si hace falta)
- Create (temporal, **no se sube**): `tests/_sintonia.test.ts`

**Interfaces:**
- Consumes: los rangos de la Tarea 4 y el archivo de referencia de la Tarea 1.
- Produces: los JSON equilibrados.

- [ ] **Step 1: Crear `tests/_sintonia.test.ts`** (temporal): un test que, en bucle, muta en memoria `DIFICULTADES`, `HEROES` y `MONSTRUOS` con un conjunto de candidatos de vida, llama a `simular(nombre, 300, dificultad)` de `tests/simulador.ts` e imprime, por dificultad y heroína, `completas` y la vida que quita un combate. Sirve para buscar valores sin tocar los JSON hasta tener un candidato.
- [ ] **Step 2: Subir la vida.** Primera palanca: `vida` en `dificultades.json` (hoy 0,90 / 0,94 / 0,95: los monstruos salen con menos vida de la que dice `monstruos.json`); se sube manteniendo el orden Fácil ≤ Normal ≤ Difícil. Segunda palanca, solo si una zona queda descuadrada: `estadisticas.pv` de monstruos concretos en `monstruos.json`. **No se toca la defensa de ningún monstruo.**
- [ ] **Step 3: Criterio.** Apuntar al centro de cada rango ±3 (Fácil ≈ 70, Normal ≈ 50, Difícil ≈ 30), con menos de 5 puntos entre heroínas; en violetas, media por heroína a ±10 de 65/50/35, suelo 25 y regla del dragón. **(Decisión del plan, para no perder lo hecho con la Cripta):** la «vida que quita un combate» de la Cripta, en Normal y para cada heroína, no puede quedar más de 5 puntos por debajo de la referencia de la Tarea 1; si queda, se compensa con la vida de los monstruos de la Cripta antes que con otra cosa.
- [ ] **Step 4: No tocar `porNivel` (experiencia)** salvo que el equilibrado lo pida: con la cuarta zona llegará más experiencia.
- [ ] **Step 5: Ejecutar `npx vitest run tests/equilibrado.test.ts tests/violetas.test.ts`.** Esperado: PASS. Repetirlo dos veces seguidas (los 300 partidos son deterministas con semilla, así que debe dar lo mismo).
- [ ] **Step 6: Borrar `tests/_sintonia.test.ts`** y comprobar con `git status` que no queda.
- [ ] **Step 7: Ejecutar `npm test`.** Esperado: todo PASS. Si un test de datos (`tests/dificultad.test.ts`, `tests/monstruos.test.ts`) falla por el orden de las dificultades o por un tope de vida, se arregla el JSON, no el test.
- [ ] **Step 8: Commit.** `git add src/data` y `git commit -m "Reequilibrado: más vida de los monstruos para el nivel 12 y la fórmula nueva"`.

---

### Task 6: Cierre y publicación

**Files:**
- Modify: `CLAUDE.md` (sección «Estado»)

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Ejecutar `npm run lint`, `npm run build` y `npm test`.** Esperado: los tres sin errores. Con `npx prettier --write .` si lint se queja de formato.
- [ ] **Step 2: Actualizar `CLAUDE.md`:** la frase de los rangos de partidas completas pasa a «Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 % (rangos de Pedro del 2026-10-30, otros 10 puntos más bajos)»; añadir una viñeta en «Estado» con fecha 2026-10-30: fórmula del cociente `(ATQ×poder)² / (ATQ×poder + DEF×factor)`, nivel máximo 12, la vida de los monstruos como palanca y la rama `reglas-nuevas`. Quitar o matizar «la defensa frena el doble el daño físico» si queda contradictorio con la fórmula nueva.
- [ ] **Step 3: Anotar la discrepancia con el documento de desarrollo.** El documento (fuente de verdad del diseño) describe la fórmula de resta; en la descripción de la PR escribir que hay que actualizar esa sección. No se edita el documento desde aquí.
- [ ] **Step 4: Probar a mano** `npm run dev`: empezar una partida con cada heroína, entrar en un combate del Bosque, comprobar que los números de daño se ven razonables y que la ficha de la heroína muestra nivel máximo 12 al forzarlo en la consola o con `?semilla=N`.
- [ ] **Step 5: Commit** `git add CLAUDE.md` y `git commit -m "Documentar las reglas nuevas en CLAUDE.md"`. Subir la rama (`git push -u origin reglas-nuevas`) y abrir la PR con `gh pr create` **solo cuando Pedro lo pida**: la fusión y la publicación en GitHub Pages las hace Pedro tras probarlo en el móvil.
