# Monstruos nuevos del Bosque y la Cripta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el jabalí y el cuervo al Bosque y el lobo a la Cripta, con arte generado por script, y sacar al Espectro de la Cripta, dejando las tres zonas equilibradas.

**Architecture:** Cada monstruo es una función de dibujo en el generador de sprites (`tools/generadores/monstruos/`) más una entrada en `src/data/monstruos.json`. Los grupos de cada zona se reescriben en `src/data/zonas.json`. El reequilibrado es solo datos, con el método de siempre (test temporal que muta `DIFICULTADES`, `HEROES` y `MONSTRUOS`, que no se sube).

**Tech Stack:** TypeScript estricto, Vitest, Python 3.12 en `.venv` (Pillow, numpy) para el arte.

**Spec:** `docs/superpowers/specs/2026-10-30-cauce-seco-design.md` (secciones «Reparto de monstruos», «Arte que hay que generar» y «Equilibrado»). Este plan cubre la **entrega 2** de «Cómo se puede partir en entregas». Imágenes de referencia: `docs/superpowers/mockups/cauce-seco-referencias/` (1 jabalí, 2 cuervo, 5 lobo).

## Global Constraints

- Windows: ejecutar `npx vitest` y `npm` desde `C:\Users\pmira\Documents\GitHub\nenufar` con la **C mayúscula**. Python: `.venv\Scripts\python.exe`. No editar archivos con PowerShell 5.1 (rompe tildes); usar Edit/Write.
- Bosque queda con **Limo, Murciélago, Jabalí y Cuervo**; Cripta con **Caballero oscuro, Araña y Lobo**. El **Espectro sale de la Cripta** y se queda en `monstruos.json` con `"oculto": true` hasta la entrega 3 (así «Naturalista» sigue siendo posible: el bestiario no cuenta los ocultos).
- Sprites: hojas de **32×32** por fotograma, 4 filas (`down,left,right,up`) y columnas `idle`(2) `walk`(4) `atacar`(3) `golpe`(1) = 10; ancla en los pies `(16, 30)`. `left` es `right` volteado. Se dibujan con `Lienzo` (`lienzo.py`) y paleta por claves. Es pixel art de baja resolución: **se adapta la referencia a 32×32 y a la paleta del juego, no se copia**.
- Regenerar solo con `.venv\Scripts\python.exe tools\generadores\monstruos\generar.py`, **nunca** `generar_todo.py` (reescribe todos los PNG y los JSON con CRLF). Después, `git status` y `git checkout` de todo lo que no sea de los monstruos nuevos o `docs/previews/monstruos_x3.png`.
- Ningún número de diseño en el código: estadísticas, pesos y velocidades salen de `src/data/*.json`.
- Rangos de victoria de partida completa: **Fácil 65-75 %, Normal 45-55 %, Difícil 25-35 %**, menos de 5 puntos entre heroínas; violetas 65/50/35 (±10), suelo 25 %, regla del dragón (`tests/violetas.test.ts`). La defensa de los monstruos no se toca como palanca; las dificultades siguen ordenadas.
- Código, comentarios y commits en español; commits pequeños, con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. El arte lo aprueba Pedro: **no se fusiona sin su visto bueno**.

## Review Focus

- **Hoja de sprites completa y bien anclada** de cada monstruo nuevo (10 columnas × 4 filas, ancla `(16, 30)`, fotograma `golpe` casi blanco): se lee con un test sobre el JSON y el PNG (Tareas 1-3).
- **Bestiario que desborda su rejilla** al haber 3 monstruos normales más: `tests/logros.test.ts` («cabe en su rejilla») debe seguir pasando; si no, ampliar la rejilla en `src/escenas/extras.ts` (Tarea 4).
- **«Naturalista» posible:** con el Espectro oculto y sin zona que lo use, el logro no puede pedir un monstruo que no sale (Tarea 4).
- **Grupos con dos monstruos del mismo tipo** («Jabalí A», «Jabalí B») y de tipos nuevos mezclados: se pelean sin error ni nombres repetidos (Tarea 4).
- **Partida guardada con una sala de la Cripta que aún lleva al Espectro:** carga y lucha, porque el Espectro sigue en `monstruos.json` (Tarea 4).

---

### Task 1: Jabalí

**Files:**
- Modify: `tools/generadores/monstruos/criaturas.py` (añadir `jabali`), `tools/generadores/monstruos/generar.py` (registro en `MONSTRUOS`), `src/data/monstruos.json`
- Create: `public/assets/sprites/monstruos/jabali.png`, `jabali.json` (los genera el script)
- Test: `tests/monstruos_nuevos.test.ts` (nuevo)

**Interfaces:**
- Produces: clave `jabali` en `MONSTRUOS`; `criaturas.jabali(c: Lienzo, vista: str, anim: str, i: int) -> None`; el test `tests/monstruos_nuevos.test.ts` con la tabla `NUEVOS = ['jabali']` que amplían las Tareas 2 y 3.

- [ ] **Step 1: Escribir el test que falla** en `tests/monstruos_nuevos.test.ts`: para cada clave de `NUEVOS`, comprobar `MONSTRUOS[clave]` definido, `jefe: false`, sin `oculto`, con `mapa` y `caja`, y que `sprite` apunta a una hoja que existe en `public/assets/` con JSON de `frameWidth` y `frameHeight` 32, `anchor` `{ x: 16, y: 30 }`, las cuatro direcciones y las animaciones `idle` (2), `walk` (4), `atacar` (3) y `golpe` (1), y un PNG de `10 × 32` de ancho por `4 × 32` de alto (leer el PNG con su cabecera: bytes 16-23, ancho y alto en big endian).
- [ ] **Step 2: Ejecutar `npx vitest run tests/monstruos_nuevos.test.ts`.** Expected: FAIL (`MONSTRUOS.jabali` indefinido).
- [ ] **Step 3: Dibujar `jabali` en `criaturas.py`** con la firma de `limo` y `murcielago`: cuadrúpedo bajo y ancho, de perfil mirando a la derecha en `lado`. Paleta nueva en `generar.py` (partir de la referencia 1, mostrando la imagen con Read y muestreando sus colores con Pillow): `cuerpo` marrón, `cuerpo_s` marrón oscuro, `cuerpo_l` marrón claro, `colmillo` crema, `boca` morado, más `ojo` y `brillo` de `BASE`. Rasgos: lomo con púas (hilera de triángulos `cuerpo_s`), dos colmillos que sobresalen, rabo corto. Poses: `idle` respira (cuerpo ±1 px), `walk` alterna las patas, `atacar` agacha la cabeza y embiste (desplazamiento horizontal creciente en los 3 fotogramas), `golpe` retrocede. `frente` y `espalda` simplifican el cuerpo (ancho, cabeza abajo o lomo con púas).
- [ ] **Step 4: Registrar `"jabali": (32, paleta(...), criaturas.jabali, {})`** en `MONSTRUOS` de `generar.py`, ejecutar el generador y abrir `docs/previews/monstruos_x3.png` con Read: la hoja debe verse reconocible como el jabalí de la referencia, y las cuatro filas coherentes. Corregir el dibujo hasta que se lea bien.
- [ ] **Step 5: Añadir `jabali` a `src/data/monstruos.json`** con valores de partida **(míos; se afinan en la Tarea 5)**: pv 30, pm 0, ataque 9, magia 0, defensa 5, velocidad 3; acciones `atacar` 60 y `cargar` 40; `cargado` poder 2.5, aviso «escarba el suelo...»; `jefe: false`; `experiencia` 9; `botin` pocion 20, nada 70, armadura nivel 1 peso 5, arma nivel 1 peso 5; `caja` 22×12; `mapa` velocidad 28, persecucion 60, vision 80, patrulla 40; `color` `#7a5232`. Misma forma que `limo`.
- [ ] **Step 6: Ejecutar `npx vitest run tests/monstruos_nuevos.test.ts`.** Expected: PASS.
- [ ] **Step 7: `git status`:** restaurar con `git checkout` cualquier hoja de otro monstruo que el generador haya reescrito; commit `git add tools src/data public/assets/sprites/monstruos/jabali.* docs/previews/monstruos_x3.png tests` y `git commit -m "Jabalí: arte y datos"`.

---

### Task 2: Cuervo

**Files:**
- Modify: `criaturas.py` (añadir `cuervo`), `generar.py`, `src/data/monstruos.json`, `tests/monstruos_nuevos.test.ts`
- Create: `public/assets/sprites/monstruos/cuervo.png`, `cuervo.json`

**Interfaces:**
- Consumes: la tabla `NUEVOS` de la Tarea 1.
- Produces: clave `cuervo`; `criaturas.cuervo(c, vista, anim, i) -> None`.

- [ ] **Step 1: Test que falla:** añadir `'cuervo'` a `NUEVOS`. Ejecutar `npx vitest run tests/monstruos_nuevos.test.ts`. Expected: FAIL solo en `cuervo`.
- [ ] **Step 2: Dibujar `cuervo`** (referencia 2): pájaro redondeado de pie con ojos grandes brillantes. Paleta: `cuerpo` casi negro azulado, `cuerpo_s` más oscuro, `cuerpo_l` gris azulado, `pico` gris pardo, `ojo` **amarillo claro brillante** (no el `ojo` oscuro de `BASE`: usar la clave `ojo` con ese color), `adorno` marrón para el borde del plumaje. Poses: `idle` balancea el cuerpo ±1 px y parpadea en el fotograma 2; `walk` da saltitos; `atacar` se lanza con el pico por delante (3 fotogramas); `golpe` echa las plumas atrás. Vistas `frente` (dos ojos), `lado` (un ojo, pico a la derecha) y `espalda` (cola y alas plegadas).
- [ ] **Step 3: Registrar en `generar.py`,** generar y revisar `docs/previews/monstruos_x3.png` con Read hasta que se lea como el cuervo de la referencia, con los ojos como único brillo.
- [ ] **Step 4: Entrada en `monstruos.json`** (valores de partida, míos): pv 11, ataque 7, defensa 1, velocidad 11, magia 0, pm 0; acciones `atacar` 100; `experiencia` 6; `botin` eter 10, pocion 10, nada 80; `caja` 16×10; `mapa` velocidad 48, persecucion 85, vision 112, patrulla 64; `color` `#2c2838`.
- [ ] **Step 5: Ejecutar `npx vitest run tests/monstruos_nuevos.test.ts`.** Expected: PASS.
- [ ] **Step 6: Restaurar lo ajeno con `git checkout` y commit** `git commit -m "Cuervo: arte y datos"`.

---

### Task 3: Lobo

**Files:**
- Modify: `tools/generadores/monstruos/humanoides.py` (añadir `lobo`), `generar.py`, `src/data/monstruos.json`, `tests/monstruos_nuevos.test.ts`
- Create: `public/assets/sprites/monstruos/lobo.png`, `lobo.json`

**Interfaces:**
- Consumes: la tabla `NUEVOS`.
- Produces: clave `lobo`; `humanoides.lobo(c, vista, anim, i) -> None`.

- [ ] **Step 1: Test que falla:** añadir `'lobo'` a `NUEVOS`; ejecutar el test. Expected: FAIL solo en `lobo`.
- [ ] **Step 2: Dibujar `lobo`** (referencia 5) en 32×32: bestia erguida y encorvada, corpulenta, con la cabeza de lobo, garras rojas y boca abierta. Paleta: `pelo` azul marino muy oscuro, `pelo_s` más oscuro, `pelo_l` azul gris, `rojo` para garras, lengua y ojos (`ojo` rojo), `colmillo` blanco. Poses: `idle` respira y balancea la cola; `walk` alterna las zancadas; `atacar` se lanza con una garra al frente (3 fotogramas); `golpe` se echa atrás. Vistas `frente`, `lado` (hocico a la derecha) y `espalda` (nuca con melena y cola).
- [ ] **Step 3: Registrar, generar y revisar** con Read el `monstruos_x3.png` hasta que el lobo se lea como la referencia y no se confunda con el Caballero o el Esqueleto (la silueta debe verse distinta).
- [ ] **Step 4: Entrada en `monstruos.json`** (valores de partida, míos): pv 70, pm 0, ataque 20, magia 0, defensa 8, velocidad 10; acciones `atacar` 60 y `cargar` 40; `cargado` poder 2.5, aviso «muestra los colmillos...»; `experiencia` 28; `botin` pocion 30, eter 15, nada 55, arma nivel 2 peso 6, armadura nivel 2 peso 6; `caja` 20×12; `mapa` velocidad 40, persecucion 80, vision 96, patrulla 48; `color` `#262c44`.
- [ ] **Step 5: Ejecutar el test.** Expected: PASS.
- [ ] **Step 6: Restaurar lo ajeno y commit** `git commit -m "Lobo: arte y datos"`.

---

### Task 4: Grupos de las zonas y el Espectro oculto

**Files:**
- Modify: `src/data/zonas.json` (grupos de `bosque` y `cripta`), `src/data/monstruos.json` (`espectro`: `"oculto": true`), `src/escenas/extras.ts` (solo si el bestiario desborda)
- Test: `tests/monstruos_nuevos.test.ts`

**Interfaces:**
- Consumes: las claves `jabali`, `cuervo`, `lobo` de las Tareas 1-3.
- Produces: los grupos finales de cada zona.

- [ ] **Step 1: Tests que fallan** en `tests/monstruos_nuevos.test.ts`:
  - `'el Bosque usa jabalí y cuervo'`: algún grupo de `zonas.zonas.bosque.grupos` contiene `jabali` y algún otro `cuervo`.
  - `'la Cripta usa el lobo y ya no al Espectro'`: algún grupo de `cripta` contiene `lobo` y ninguno de ninguna zona contiene `espectro`.
  - `'el Espectro sigue existiendo pero oculto'`: `MONSTRUOS.espectro` definido con `oculto === true`.
  - `'todos los grupos nombran monstruos que existen y no son jefes'`: para cada zona y grupo, cada clave está en `MONSTRUOS`, con `jefe` falso.
  - `'un grupo con dos monstruos del mismo tipo los distingue por letra'`: `luchadoresDeGrupo([MONSTRUOS.jabali!, MONSTRUOS.jabali!, MONSTRUOS.cuervo!]).map((l) => l.nombre)` es `['Jabalí A', 'Jabalí B', 'Cuervo']` (importar `luchadoresDeGrupo` de `../src/core/combate`).
- [ ] **Step 2: Ejecutar `npx vitest run tests/monstruos_nuevos.test.ts`.** Expected: FAIL en los tres primeros.
- [ ] **Step 3: Reescribir los grupos.** Bosque: añadir a los cuatro actuales `[jabali]` peso 2, `[cuervo]` peso 2, `[cuervo, limo]` peso 1 y `[jabali, murcielago]` peso 1. Cripta: sustituir `espectro` por `lobo` en los dos grupos que lo llevan y añadir `[lobo]` peso 2 **(mis valores de partida; se afinan en la Tarea 5)**. Añadir `"oculto": true` a la entrada `espectro` (es temporal, hasta la entrega 3).
- [ ] **Step 4: Ejecutar `npx vitest run`** (suite entera, sin `equilibrado` ni `violetas` por ahora: `--exclude tests/equilibrado.test.ts --exclude tests/violetas.test.ts`). Expected: PASS. Si `tests/logros.test.ts` («cabe en su rejilla») falla, ampliar la rejilla del bestiario en `src/escenas/extras.ts` lo mínimo que haga falta y dejar la regla del test igual. Si falla algún test que cuenta monstruos del bestiario o usa `espectro` en una zona, corregir el test, no los datos.
- [ ] **Step 5: Commit** `git add src tests` y `git commit -m "Grupos del Bosque y la Cripta con los monstruos nuevos; el Espectro, oculto hasta el Cauce Seco"`.

---

### Task 5: Reequilibrar

Solo datos. Dejar `equilibrado.test.ts` y `violetas.test.ts` en verde **con margen** (centro del rango ±3, mejor que quedar en el filo).

**Files:**
- Modify: `src/data/monstruos.json`, `src/data/zonas.json` (pesos de grupos), `src/data/dificultades.json`, `src/data/heroes.json` (solo si hace falta)
- Create (temporal, **no se sube**): `tests/_sintonia.test.ts`, `tests/_busca.test.ts`

**Interfaces:**
- Consumes: los datos de las Tareas 1-4.
- Produces: los JSON equilibrados.

- [ ] **Step 1: Medir** con `npx vitest run tests/equilibrado.test.ts tests/violetas.test.ts --disableConsoleIntercept` (sin esa opción Vitest 5 no muestra los `console.log`). Anotar cuánto sale cada heroína y dificultad y la «vida que quita un combate» de cada zona. Estado de partida de la entrega 1: Fácil 67/67, Normal 50/54, Difícil 32/32 (ronin/maga); Cripta ≈ 14,5 % por combate en Normal.
- [ ] **Step 2: Crear los tests temporales** que mutan en memoria `HEROES`, `MONSTRUOS`, `DIFICULTADES` y `REGLAS` leyendo los cambios de un JSON del espacio de trabajo (método de `tests/simulador.ts`): uno que imprime las partidas completas por dificultad y heroína, y otro que prueba al azar combinaciones de los parámetros y ordena por cercanía al centro de los rangos (70 / 50 / 30) y a la igualdad entre heroínas.
- [ ] **Step 3: Palancas, por orden:** estadísticas y pesos de los tres monstruos nuevos (vida, ataque), luego los pesos de los grupos de Bosque y Cripta, luego los multiplicadores de `dificultades.json`. **No se toca la defensa de ningún monstruo ni la fórmula.** Las dificultades siguen ordenadas (ataque y vida no bajan de Fácil a Difícil; la recuperación no sube). Aviso: la vida de los monstruos se redondea a enteros y salta; pruebas intermedias (por ejemplo 1,07 → 1,08) pueden hundir a una heroína de golpe.
- [ ] **Step 4: Criterio:** los rangos de «Global Constraints»; y la «vida que quita un combate» de la Cripta en Normal no queda más de 5 puntos por debajo de la de la entrega 1 (14,5 %).
- [ ] **Step 5: Ejecutar `npx vitest run tests/equilibrado.test.ts tests/violetas.test.ts`** dos veces seguidas. Expected: PASS las dos (son deterministas).
- [ ] **Step 6: Borrar los tests temporales** y comprobar con `git status` que no quedan. Ejecutar `npm test`. Expected: todo PASS.
- [ ] **Step 7: Commit** `git add src/data` y `git commit -m "Reequilibrado con el jabalí, el cuervo y el lobo"`.

---

### Task 6: Cierre

**Files:**
- Modify: `CLAUDE.md` (sección «Estado»)

- [ ] **Step 1: Ejecutar `npm run lint`, `npm run build` y `npm test`.** Expected: sin errores. `npx prettier --write .` si lint se queja de formato.
- [ ] **Step 2: Mirar el arte con Read** en `docs/previews/monstruos_x3.png` y en un recorte de cada monstruo nuevo ampliado ×6 (Pillow, en el espacio de trabajo temporal, no en el repo) y apuntar en la PR qué hay que revisar con Pedro.
- [ ] **Step 3: Actualizar `CLAUDE.md`:** viñeta de «Estado» con la fecha, los monstruos nuevos y sus zonas, el Espectro oculto hasta la entrega 3, la nota de equilibrado con sus márgenes, y que `generar.py` (no `generar_todo.py`) es lo que regenera los monstruos.
- [ ] **Step 4: Commit** `git commit -m "Documentar los monstruos nuevos en CLAUDE.md"`. Subir la rama y abrir la PR con `gh pr create` **solo cuando Pedro lo pida**, y **no fusionar sin su visto bueno al arte**.

## Notas para la entrega 3 (Cauce Seco)

- `tests/monstruos.test.ts` («los dragones comparten nombre y sprite») exige que las variantes del Dragón negro compartan sprite; el spec decía que la cuarta variante sale del dragón de la imagen 6. Hay que decidir entonces: cambiar el sprite del Dragón negro para las cuatro zonas, o relajar ese test.
- El Espectro vuelve a ser visible (`oculto` fuera) al entrar en el Cauce Seco.
