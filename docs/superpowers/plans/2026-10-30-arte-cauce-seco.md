# Arte de los monstruos del Cauce Seco (entrega 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar por script las hojas de sprites de los monstruos nuevos del Cauce Seco (Acólito, Salamandra de brasas, Sacerdote de la luna falsa, Monje oni y Dragón de fuego) y dar un aspecto más fiero al Dragón negro, sin tocar todavía los datos del juego.

**Architecture:** Un módulo compartido `reducir.py` convierte una imagen de referencia en una pose de pixel art (quita el fondo, reduce, repinta con pocos colores, limpia la silueta y pone contorno); lo usan el Acólito, el Monje oni, el Dragón de fuego y, tras refactorizarlo, el Jabalí. La Salamandra y el Sacerdote se dibujan a mano con `Lienzo` y `dibujo.py`. Cada monstruo se registra en `PROPIOS` o `MONSTRUOS` de `generar.py`.

**Tech Stack:** Python 3.12 en `.venv` (Pillow, numpy), TypeScript y Vitest para el test de formato de las hojas.

**Spec:** `docs/superpowers/specs/2026-10-30-cauce-seco-design.md` (secciones «Reparto de monstruos», «El jefe», «Arte que hay que generar»). Referencias del usuario: `docs/superpowers/mockups/cauce-seco-referencias/` (3 sacerdote, 4 acólito, 6 dragón de fuego, 7 oni).

## Global Constraints

- Windows: `npx vitest` y `npm` desde `C:\Users\pmira\Documents\GitHub\nenufar` (C mayúscula). Python: `.venv\Scripts\python.exe` (con `-I` los scripts sueltos no ven `tools/`: usar `sys.path.insert`). Para pasar rutas de `/tmp` a Python usar `cygpath -m`. No editar con PowerShell 5.1.
- Hojas: filas `down, left, right, up`; columnas `idle` (2), `walk` (4), `atacar` (3), `golpe` (1) = 10; ancla en los pies `(ancho/2, alto-2)`; `left` es `right` volteado en las hojas de `MONSTRUOS`; en `PROPIOS` el módulo da `fotograma(direccion, anim, i)` (array RGBA) y `OUT`. Tamaños: Acólito 32×32, Salamandra 32×32, Sacerdote 48×48, Oni 48×48, Dragón de fuego 64×48. Los jefes no suben más de ~42 px sobre los pies (que el nombre no se tape).
- Regenerar solo con `.venv\Scripts\python.exe tools\generadores\monstruos\generar.py`, nunca `generar_todo.py`. Después, `git status` y `git checkout` de todo lo que no sea del trabajo (`espectro.png` y `golem.png` cambian de bytes aunque sean iguales).
- **No se tocan datos del juego** (`monstruos.json`, `zonas.json`, `historia.json`...): las fichas de estas criaturas y sus grupos van en la entrega 3d, junto al equilibrado.
- Ningún fotograma toca el borde del cuadro (columna 0, columna último, fila 0): el generador avisa si pasa. Excepción: las patas pueden llegar a la última fila.
- El arte lo aprueba Pedro: **no se fusiona sin su visto bueno**. Pedro ya pidió dos cosas de estilo: contorno continuo y sin huecos, y siluetas limpias (sin píxeles sueltos).
- Código, comentarios y commits en español; commits pequeños con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Formato de las hojas** de los cinco sprites nuevos y del Dragón negro rehecho (tamaño, filas, columnas, ancla): lo comprueba el test de la Tarea 8.
- **Fondo mal quitado** (restos de color de fondo o agujeros dentro de la figura) en las referencias reducidas: se revisa mirando cada hoja ampliada (Tareas 2, 5, 6).
- **El Jabalí no cambia** tras refactorizarlo con `reducir.py`: sus 40 fotogramas deben ser idénticos píxel a píxel (Tarea 1).
- **Los jefes no tapan su nombre**: ningún píxel opaco por encima de la fila 4 en las hojas de 48 de alto (Tareas 4 y 5).
- **El Dragón negro sigue siendo reconocible** y las cuatro variantes siguen compartiendo sprite (Tarea 7).

---

### Task 1: Módulo compartido `reducir.py` y refactor del Jabalí

**Files:**
- Create: `tools/generadores/monstruos/reducir.py`
- Modify: `tools/generadores/monstruos/jabali.py`

**Interfaces:**
- Produces (en `reducir.py`):
  - `pose(ruta: str, ancho: int, colores: int = 14, fondo: str = "auto", umbral: int = 60, contraste: float = 1.35, retoques: list[tuple[int, int, tuple[int, int, int]]] = [], paleta: dict[str, tuple[int, int, int]] | None = None) -> list[list[tuple[int, int, int] | None]]`: con `paleta` fija, cada píxel toma el color más cercano de esa paleta en vez de cuantizar a `colores` colores (así lo usa el Jabalí); lee la imagen, quita el fondo (`"auto"`: color de las cuatro esquinas; flood fill desde el borde sobre los píxeles a distancia < `umbral`), recorta a la figura, reduce a `ancho` píxeles de ancho (`Image.BOX`), sube el contraste, cuantiza a `colores` colores sin tramado, limpia la silueta (quita píxeles sueltos y tapa agujeros) y aplica `retoques` `(x, y, rgb)`. Devuelve la matriz de colores RGB o `None`.
  - `con_contorno(grid, contorno: tuple[int, int, int]) -> list[list[tuple[int, int, int] | None]]`: la pose con una fila y columna más por lado y el borde continuo de 1 px (vecinos en cruz).
  - `pegar(lienzo: np.ndarray, grid, x0: int, y0: int) -> None`: copia la matriz en un array RGBA, recortando lo que se salga.
  - `sin_tocar_bordes(img: np.ndarray, permitir_abajo: bool = True) -> bool`: `True` si ningún píxel opaco está en la columna 0, la última o la fila 0.
- Consumes: nada.

- [ ] **Step 1: Guardar una copia de referencia** de `public/assets/sprites/monstruos/jabali.png` fuera del repo (`cp` al espacio de trabajo) para comparar al final.
- [ ] **Step 2: Escribir un test en Python** `tools/generadores/monstruos/test_reducir.py` (se ejecuta con `.venv\Scripts\python.exe tools\generadores\monstruos\test_reducir.py`, con `assert`): sobre una imagen sintética de 40×30 con un cuadrado rojo en un fondo azul, `pose(...)` devuelve `None` en las esquinas y color en el centro; `con_contorno` rodea con el color de contorno; `sin_tocar_bordes` devuelve `False` si hay un píxel en la columna 0. Ejecutarlo: Expected: FAIL (`reducir` no existe).
- [ ] **Step 3: Implementar `reducir.py`** con las funciones de la sección Interfaces; mover aquí `_limpiar`, `_vecinos` y `_con_contorno` de `jabali.py` (misma lógica).
- [ ] **Step 4: Ejecutar el test.** Expected: PASS.
- [ ] **Step 5: Refactorizar `jabali.py`** para que use `reducir.pose` (con `ancho=28`, `colores=` los de su `PALETA` fija: mantener su cuantización por paleta propia pasando un parámetro opcional `paleta: dict | None` a `pose`, de modo que el resultado sea el mismo) y `reducir.con_contorno` / `reducir.pegar`. Regenerar y comparar con la copia del Step 1 con Pillow: **todos los fotogramas idénticos**. Si no lo son, el refactor está mal: corregir hasta que lo sean.
- [ ] **Step 6: Commit** `git add tools public/assets/sprites/monstruos/jabali.png` y `git commit -m "reducir.py: pose de pixel art a partir de una imagen; el Jabalí lo usa"` (si el PNG no cambió, no se añade).

---

### Task 2: Acólito

**Files:**
- Create: `tools/generadores/monstruos/acolito.py`, `public/assets/sprites/monstruos/acolito.png` y `.json` (los genera el script)
- Modify: `tools/generadores/monstruos/generar.py` (registro en `PROPIOS`)

**Interfaces:**
- Consumes: `reducir.pose`, `con_contorno`, `pegar`, `sin_tocar_bordes`.
- Produces: `acolito.fotograma(direccion, anim, i) -> np.ndarray` (32×32×4) y `acolito.OUT`; clave `acolito` en `PROPIOS` con `(32, 32, acolito)`.

- [ ] **Step 1: Reducir la referencia 4** (encapuchado con báculo de calavera y llama en la mano; fondo blanco) a ~26 píxeles de alto, con `fondo="auto"` y 14 colores. Ver el resultado ampliado ×10 con Read y ajustar `ancho`, `contraste` y `retoques` hasta que se lea: capucha oscura con los ojos rojos, calavera clara en el báculo, llama naranja en la mano, hebilla dorada.
- [ ] **Step 2: Animar** con la pose base (`down` = la referencia): `idle` respira (subir/bajar 1 px y oscilar el color de la llama entre dos tonos naranjas), `walk` balancea ±1 px y alterna los pies con dos pixeles claros bajo la túnica, `atacar` se inclina hacia delante (+2 px) y la llama se agranda 1 px, `golpe` desplaza −2 px. `left`/`right`/`up`: la misma pose (volteada para `left`; para `up` oscureciendo los colores de la cara y de la llama, que no se ven de espaldas).
- [ ] **Step 3: Registrar** `"acolito": (32, 32, acolito)` en `PROPIOS`, generar y comprobar con Read (`docs/previews/monstruos_x3.png` y un recorte ampliado) que la hoja es legible, la silueta continua y sin huecos, y que `sin_tocar_bordes` es cierto en los 40 fotogramas.
- [ ] **Step 4: Commit** `git commit -m "Acólito: arte"` con la hoja, el módulo, `generar.py` y las previsualizaciones.

---

### Task 3: Salamandra de brasas

**Files:**
- Modify: `tools/generadores/monstruos/criaturas.py` (función `salamandra`), `tools/generadores/monstruos/generar.py` (registro en `MONSTRUOS`)
- Create: `public/assets/sprites/monstruos/salamandra.png` y `.json`

**Interfaces:**
- Produces: `criaturas.salamandra(c: Lienzo, vista: str, anim: str, i: int) -> None` y la clave `salamandra` en `MONSTRUOS` con paleta propia.

- [ ] **Step 1: Dibujar `salamandra`** con `Lienzo` (mismo contrato que `limo` y `murcielago`): anfibio alargado y bajo, de cuerpo naranja rojizo (`cuerpo`, `cuerpo_s` oscuro, `cuerpo_l` claro), manchas amarillo brasa en el lomo (`brasa`), cola larga que se curva, cuatro patas cortas, ojos grandes y claros. `lado` (mirando a la derecha) es la vista principal; `frente` con la cabeza grande y los ojos; `espalda` con el lomo manchado y la cola. Poses: `idle` mueve la cola y respira; `walk` serpentea (cuerpo ondulado, patas alternas); `atacar` echa la cabeza adelante y abre la boca (3 fotogramas); `golpe` se encoge.
- [ ] **Step 2: Registrar** con paleta propia en `MONSTRUOS`, generar y comprobar con Read la hoja ampliada: debe leerse como un anfibio de fuego, no confundirse con el Limo ni con la Araña, con el contorno continuo y sin tocar los bordes.
- [ ] **Step 3: Commit** `git commit -m "Salamandra de brasas: arte"`.

---

### Task 4: Sacerdote de la luna falsa

**Files:**
- Create: `tools/generadores/monstruos/sacerdote.py`, `public/assets/sprites/monstruos/sacerdote.png` y `.json`
- Modify: `tools/generadores/monstruos/generar.py` (registro en `PROPIOS`)

**Interfaces:**
- Consumes: `dibujo.py` (`tile, put, line, outline, poly_mask, ell_mask, shade, limb, ground_shadow, rng, fire_band`, como `dragon_negro.py`).
- Produces: `sacerdote.fotograma(direccion, anim, i) -> np.ndarray` (48×48×4), `sacerdote.OUT`; clave `sacerdote` con `(48, 48, sacerdote)`.

- [ ] **Step 1: Dibujar el sacerdote** a partir de la referencia 3 (figura encapuchada, de túnica negra, con una **aureola de fuego** sobre la cabeza y llamas en las manos), de pie y mirando al frente: capucha sin rostro (óvalo negro con dos puntos naranjas por ojos), túnica larga con pliegues, cinturón con hebilla dorada, aureola = anillo naranja de unos 24 px de diámetro con rayos en cruz detrás de la cabeza, dos llamas naranjas en las manos alzadas y chispas sueltas. Nada por encima de la fila 4.
- [ ] **Step 2: Animar:** `idle` (2) hace pulsar la aureola (anillo normal / anillo con un píxel más de radio y más brillo) y mover las llamas; `walk` (4) igual que `idle` (no anda: los jefes no se mueven por la sala); `atacar` (3) levanta los brazos, la aureola crece y brillan los rayos (el aviso del golpe cargado se lee en el último fotograma); `golpe` (1) casi blanco por `destello`. Las cuatro direcciones usan el mismo dibujo (de frente).
- [ ] **Step 3: Registrar,** generar y comprobar con Read la hoja ampliada y que ningún píxel opaco queda por encima de la fila 4 ni toca los bordes.
- [ ] **Step 4: Commit** `git commit -m "Sacerdote de la luna falsa: arte"`.

---

### Task 5: Monje oni

**Files:**
- Create: `tools/generadores/monstruos/oni.py`, `public/assets/sprites/monstruos/oni.png` y `.json`
- Modify: `tools/generadores/monstruos/generar.py` (registro en `PROPIOS`)

**Interfaces:**
- Consumes: `reducir.*`.
- Produces: `oni.fotograma(direccion, anim, i) -> np.ndarray` (48×48×4), `oni.OUT`; clave `oni` con `(48, 48, oni)`.

- [ ] **Step 1: Reducir la referencia 7** (monje con máscara de calavera con cuernos y melena de llamas, piel roja, faja y cintas rojas, llamas en las manos; fondo beige y sombra en el suelo) a unos 42 píxeles de alto con `fondo="auto"` y 16 colores. Cuidado: la sombra del suelo debe quitarse con el fondo (subir `umbral` o recortar por debajo de los pies). Ver ampliado y ajustar hasta que se lean la máscara blanca, el pelo de fuego, la piel roja y la faja blanca.
- [ ] **Step 2: Animar** igual que el Acólito pero en 48×48: `idle` respira y las llamas de las manos y del pelo alternan dos tonos; `walk` igual que `idle` (jefe violeta, no se mueve); `atacar` avanza +3 px y agranda la llama de la mano; `golpe` −3 px. Las cuatro direcciones, de frente.
- [ ] **Step 3: Registrar,** generar y comprobar con Read: figura legible, sin restos del fondo beige, nada por encima de la fila 4, sin tocar los bordes.
- [ ] **Step 4: Commit** `git commit -m "Monje oni: arte"`.

---

### Task 6: Dragón de fuego

**Files:**
- Create: `tools/generadores/monstruos/dragon_fuego.py`, `public/assets/sprites/monstruos/dragon_fuego.png` y `.json`
- Modify: `tools/generadores/monstruos/generar.py` (registro en `PROPIOS`)

**Interfaces:**
- Consumes: `reducir.*`.
- Produces: `dragon_fuego.fotograma(direccion, anim, i) -> np.ndarray` (48×64×4: 64 de ancho y 48 de alto), `dragon_fuego.OUT`; clave `dragon_fuego` con `(64, 48, dragon_fuego)`. **Es solo un recurso por ahora: no se usa en el juego** (Pedro decidió que el Dragón negro se mantiene en las cuatro zonas).

- [ ] **Step 1: Reducir la referencia 6** (dragón de cuerpo azul verdoso, cresta y llamas rosas y naranjas, cola con llama; fondo morado liso; mira a la izquierda) a unos 60 píxeles de ancho con `fondo="auto"` y 16 colores. Ver ampliado y ajustar hasta que se lean los cuernos, la melena de llamas, el vientre claro y la llama del final de la cola.
- [ ] **Step 2: Animar:** `idle` respira (±1 px) y la llama de la cola parpadea (dos tonos); `walk` igual que `idle`; `atacar` echa la cabeza atrás y la adelanta con la boca encendida (desplazar la parte izquierda de la figura 2 px y pintar un resplandor naranja delante); `golpe` casi blanco. Las cuatro direcciones, la misma pose.
- [ ] **Step 3: Registrar,** generar y comprobar con Read la hoja ampliada, que el dragón queda dentro de 64×48 sin tocar los bordes y no sube más de ~42 px sobre los pies.
- [ ] **Step 4: Commit** `git commit -m "Dragón de fuego: arte (aún sin uso en el juego)"`.

---

### Task 7: Dragón negro más fiero

**Files:**
- Modify: `tools/generadores/monstruos/dragon_negro.py`
- Regenerate: `public/assets/sprites/monstruos/dragon_negro.png` (el `.json` no cambia)

**Interfaces:**
- Consumes: el módulo actual (`dibujar(respira, ojos, carga, aliento, alza, cabeza)` y `fotograma`).
- Produces: el mismo contrato (64×48, mismas animaciones y ancla); solo cambia el aspecto.

- [ ] **Step 1: Guardar una copia** del `dragon_negro.png` actual fuera del repo para comparar antes y después.
- [ ] **Step 2: Hacerlo más fiero** sin cambiar el tamaño ni la pose (erguido, de perfil, mirando a la izquierda): **cuernos** largos y curvos hacia atrás en la cabeza, **hocico con dientes** visibles y la mandíbula algo abierta, **ceño marcado** sobre los ojos rojos que brillan, **cresta de púas** más alta y puntiaguda a lo largo del lomo y la cola, **garras** claras y grandes en las patas, **grietas de brasa** (naranja oscuro) entre las escamas del pecho y de las alas, alas con **más envergadura** y puntas afiladas. Mantener el negro con el vientre de placas color arena (es su identidad) y el aliento de fuego de `atacar`.
- [ ] **Step 3: Regenerar** y comparar con Read la hoja antes y después (misma fila, ampliada ×4): el dragón debe verse claramente más amenazador y seguir siendo el mismo. Comprobar que las 40 casillas siguen dentro del cuadro sin tocar los bordes y que nada sube más de ~42 px sobre los pies. Comprobar con `git diff --stat` que solo cambió `dragon_negro.png` y `dragon_negro.py` (y las previsualizaciones).
- [ ] **Step 4: Commit** `git commit -m "Dragón negro: más fiero (cuernos, dientes, púas, garras y brasas)"`.

---

### Task 8: Test de formato, documentación y cierre

**Files:**
- Modify: `tests/monstruos_nuevos.test.ts` (o crear `tests/hojas_cauce.test.ts`), `CLAUDE.md`, `docs/superpowers/specs/2026-10-30-cauce-seco-design.md`
- Create: `docs/previews/cauce_monstruos_x4.png`

**Interfaces:**
- Consumes: las hojas de las Tareas 2-7.

- [ ] **Step 1: Escribir el test que falla** en `tests/hojas_cauce.test.ts`: para cada `[clave, ancho, alto]` de `[['acolito', 32, 32], ['salamandra', 32, 32], ['sacerdote', 48, 48], ['oni', 48, 48], ['dragon_fuego', 64, 48], ['dragon_negro', 64, 48]]`, el JSON de `public/assets/sprites/monstruos/<clave>.json` (leído con `import.meta.glob`, **sin `node:fs`**, que `tsc` no tiene tipos de Node) tiene `frameWidth`, `frameHeight`, `anchor` `{ x: ancho / 2, y: alto - 2 }`, las cuatro direcciones y las animaciones `idle` 2, `walk` 4, `atacar` 3, `golpe` 1; y el PNG existe (`import.meta.glob` con `{ query: '?url' }`). Ejecutar `npx vitest run tests/hojas_cauce.test.ts`. Expected: PASS (las hojas ya existen; si alguna falta o tiene otro formato, falla y se corrige el generador).
- [ ] **Step 2: Imagen de revisión** `docs/previews/cauce_monstruos_x4.png` (Pillow, en el espacio de trabajo temporal y luego copiada): las hojas de acólito, salamandra, sacerdote, oni, dragón de fuego y dragón negro ampliadas ×3, una debajo de otra.
- [ ] **Step 3: Documentar:** viñeta nueva en la sección «Estado» de `CLAUDE.md` (fecha, lo generado, que **no hay datos todavía**, que `reducir.py` es el método para sacar un sprite de una imagen y que el Dragón de fuego queda como recurso sin uso), y en el diseño una sección «Cambios del 2026-10-30 (tarde)» con: las cuatro entregas 3a-3d, que las recompensas de los jefes violetas salen del reservorio de cada heroína (el Monje oni no necesita pieza propia), que el Dragón negro se mantiene en las cuatro zonas y el Dragón de fuego queda como arte para más adelante, y que los datos de los monstruos nuevos van en la 3d.
- [ ] **Step 4: Ejecutar `npm run lint`, `npm run build` y `npm test`.** Expected: sin errores (`npx prettier --write .` si lint se queja).
- [ ] **Step 5: Commit** `git commit -m "Hojas del Cauce Seco: test de formato, documentación e imagen de revisión"`. Subir la rama y abrir la PR con `gh pr create` **solo cuando Pedro lo pida**, y **no fusionar sin su visto bueno al arte**.
