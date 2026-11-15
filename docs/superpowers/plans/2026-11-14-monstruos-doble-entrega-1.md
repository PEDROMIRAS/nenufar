# Monstruos a doble resolución, entrega 1 (motor, recorte, gólem y lobo): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el motor acepte hojas de sprites al doble de resolución y que el gólem y el lobo salgan así, con sus
tres vistas y 8/8/6/1 fotogramas, listos para que Pedro los apruebe dentro del juego.

**Architecture:** un campo opcional `scale` en el JSON de cada hoja dice cuántos píxeles de la hoja ocupa un píxel
del juego; el motor divide por él donde coloca o mide. Los generadores de Python reducen la imagen de referencia al
doble de ancho, quitan también el fondo encerrado y animan la pose con curvas continuas muestreadas a los
fotogramas que se pidan. Las vistas que la imagen no da se montan con piezas de la propia pose reducida.

**Tech Stack:** TypeScript estricto + Vitest (motor y tests de hojas); Python 3.12 del `.venv` con numpy y Pillow
(generadores); Edge sin cabeza para las capturas.

**Spec:** `docs/superpowers/specs/2026-11-14-monstruos-doble-resolucion-design.md`

## Global Constraints

- Idioma del código, comentarios, commits y documentos: español.
- Rama `monstruos-doble`. Commits pequeños. **No se publica ni se fusiona** hasta que Pedro apruebe el arte.
- Mismo tamaño en pantalla que hoy: gólem 48×48 píxeles de juego, lobo 32×32.
- Fotogramas de las hojas nuevas: `idle` 8 a 12 fps, `walk` 8 a 16 fps, `atacar` 6 a 20 fps, `golpe` 1 a 1 fps.
- Recortes limpios: sin fondo sobrante (tampoco el encerrado), sin trozos comidos, sin motas ni píxeles sueltos.
- Arte sobrio y oscuro, nada infantil, parecido a la imagen de Pedro. Sin piezas del cuerpo sueltas al moverse.
- Los monstruos sin convertir se generan igual que ahora, byte a byte, y sus JSON no llevan `scale`.
- Nunca ejecutar `generar_todo.py`. Solo `.venv\Scripts\python.exe tools\generadores\monstruos\generar.py`, y
  después `git checkout` de las hojas que cambien de bytes sin haber cambiado de dibujo (pasa con `espectro.png`).
- Ningún número de diseño en el código TypeScript; `src/core/` no toca el navegador.
- Python siempre con `.venv\Scripts\python.exe` desde la raíz del repo.

## Review Focus

- **Pantalla pequeña (390×844, 360×640):** un sprite de doble resolución dibujado por debajo de su tamaño real no
  debe parpadear ni perder el contorno. Lo cubre la Task 8 (capturas y arreglo de filtrado si hace falta).
- **Hojas viejas:** una hoja sin `scale` se dibuja exactamente como antes. Lo cubren la Task 3 (regenerar no cambia
  ningún archivo sin convertir) y el test `ninguna hoja sin convertir lleva scale` de la Task 4.
- **Combate con varios enemigos:** un lobo nuevo junto a monstruos viejos no encoge al grupo ni se sale de su
  hueco. Lo cubre la Task 8 con `?combate=lobo,arana,lobo,esqueleto`.
- **Bestiario con el monstruo sin ver:** la silueta (copia de la hoja) se dibuja al tamaño de siempre. Task 8.
- **Tamaño de la hoja:** ninguna hoja pasa de 4096 px de ancho (límite de textura en móviles). Test de la Task 4.

---

### Task 1: el motor entiende `scale`

**Files:**
- Modify: `src/core/types.ts` (interfaz `SpriteJson`)
- Modify: `src/render/recursos.ts` (`dibujarFotograma`)
- Modify: `src/render/mundo/mundo.ts` (`crearActor`)
- Modify: `src/render/combate.ts:169` y `:433`
- Modify: `src/render/extras.ts:179`

**Interfaces:**
- Produces: `SpriteJson.scale?: number` (píxeles de la hoja por píxel del juego; ausente = 1). `frameWidth`,
  `frameHeight` y `anchor` siguen en píxeles de la hoja.

- [ ] **Step 1:** añadir `scale?: number` a `SpriteJson` con su comentario.
- [ ] **Step 2:** en `dibujarFotograma`, el destino usa `escala / (datos.scale ?? 1)` para el ancla, el ancho y el
  alto; el origen (columna, fila, `w`, `a`) no cambia.
- [ ] **Step 3:** en `crearActor`, las cuatro medidas que se pasan a `carton` se dividen por `TAM * (scale ?? 1)`;
  `columnas` y `filas` siguen saliendo de `frameWidth` y `frameHeight` sin dividir.
- [ ] **Step 4:** en `combate.ts`, el ancho que decide `G.escala` y el alto de `topeEnemigo` usan la medida
  dividida por `scale`; en `extras.ts`, la escala del bestiario usa `frameHeight / scale`.
- [ ] **Step 5:** `npm test`, `npm run lint` y `npm run build` en verde (ninguna hoja lleva aún `scale`, así que
  nada cambia en pantalla).
- [ ] **Step 6:** commit `Motor: campo scale en las hojas de sprites`.

### Task 2: `reducir.py` quita el fondo encerrado y anima con curvas

**Files:**
- Modify: `tools/generadores/monstruos/reducir.py`
- Test: `tools/generadores/monstruos/test_reducir.py`

**Interfaces:**
- Produces:
  - `pose(..., encerrado=None)`: con un número, las zonas del color del fondo que no tocan el borde y tienen al
    menos ese número de píxeles (de la imagen original) también son fondo. `None` = como hasta ahora.
  - `ANIMS_DOBLE = [("idle", 8, 12, True), ("walk", 8, 16, True), ("atacar", 6, 20, False), ("golpe", 1, 1, False)]`
  - `movimiento(anim, i, n, escala) -> (patrones, torcer, estirar, dx, dy)`: `patrones` es
    `{"pierna_a"|"pierna_b"|"brazo_i"|"brazo_d"|"cola"|"cabeza": (dx, dy)}`, ya multiplicado por `escala`.
  - `partes(grid, lista, anim, i, borde=0.14, patrones=None)` y `vida(grid, anim, i, adelante=-1, fuerza=1.0,
    valores=None)`: con `patrones` (dict de arriba) o `valores` (`(torcer, estirar)`) usan eso en vez de las tablas.
  - `animar(base, lista, anim, i, n, escala, ancho, alto, adelante=-1) -> np.ndarray` de `(alto, ancho, 4)`: la
    pose con `movimiento` aplicado, centrada, con la última fila de la figura en la fila `alto - 2 * escala + 1 + dy`
    (los pies en el ancla) y desplazada `dx * adelante`.
  - `sueltos(img, exentos=()) -> int`: cuántos grupos de píxeles opacos (vecindad de 8) hay además del mayor,
    sin contar los de los colores `exentos`.
- Las tablas `PATRONES` y `VIDA` se quedan: las usan los monstruos sin convertir.

- [ ] **Step 1: tests que fallan** en `test_reducir.py`:

```python
def test_pose_quita_el_fondo_encerrado():
    """Un aro rojo sobre azul: el azul de dentro es fondo aunque no toque el borde."""
    im = Image.new("RGB", (60, 60), AZUL)
    for y in range(10, 50):
        for x in range(10, 50):
            if not (20 <= x < 40 and 20 <= y < 40):
                im.putpixel((x, y), ROJO)
    ruta = os.path.join(tempfile.mkdtemp(), "aro.png")
    im.save(ruta)
    assert reducir.pose(ruta, 20, colores=4)[10][10] is not None  # sin pedirlo, se queda (como antes)
    assert reducir.pose(ruta, 20, colores=4, encerrado=100)[10][10] is None
    assert reducir.pose(ruta, 20, colores=4, encerrado=1000)[10][10] is not None  # 400 px: demasiado pequeño


def test_movimiento_es_continuo_y_escala():
    for anim, n, _, _ in reducir.ANIMS_DOBLE:
        for i in range(n):
            p1, t1, e1, dx1, dy1 = reducir.movimiento(anim, i, n, 1)
            p2, t2, e2, _, _ = reducir.movimiento(anim, i, n, 2)
            assert set(p1) == {"pierna_a", "pierna_b", "brazo_i", "brazo_d", "cola", "cabeza"}
            assert all(abs(p2[k][0] - 2 * p1[k][0]) < 1e-9 and abs(p2[k][1] - 2 * p1[k][1]) < 1e-9 for k in p1)
            assert abs(t2 - 2 * t1) < 1e-9 and e1 == e2 and 0.9 <= e1 <= 1
    reposo = reducir.movimiento("idle", 0, 8, 2)
    assert all(v == (0, 0) for v in reposo[0].values()) and reposo[1:] == (0, 1, 0, 0)
    ataque = [reducir.movimiento("atacar", i, 6, 1)[1] for i in range(6)]
    assert ataque[0] == 0 and ataque[-1] == 0 and min(ataque) < 0 < max(ataque)  # se echa atrás y se lanza


def test_animar_pone_los_pies_en_el_ancla():
    base = reducir.con_contorno([[ROJO] * 10 for _ in range(20)], CONTORNO)
    img = reducir.animar(base, [], "idle", 0, 8, 2, 64, 64)
    opaco = img[:, :, 3] > 0
    assert img.shape == (64, 64, 4) and opaco[64 - 2 * 2 + 1].any() and not opaco[64 - 2 * 2 + 2:].any()
    assert reducir.sin_tocar_bordes(img) and reducir.sueltos(img) == 0


def test_sueltos_cuenta_las_motas():
    img = np.zeros((8, 8, 4), dtype=np.uint8)
    img[2:5, 2:5] = (9, 9, 9, 255)
    img[7, 7] = (1, 2, 3, 255)
    assert reducir.sueltos(img) == 1 and reducir.sueltos(img, exentos=[(1, 2, 3)]) == 0
```

- [ ] **Step 2:** ejecutar `test_reducir.py`: fallan los cuatro.
- [ ] **Step 3:** implementar. `movimiento` son estas curvas (en píxeles de juego, antes de multiplicar):

```python
def _clave(u, puntos):  # curva por claves (t, valor) con paso suave; valor: número o tupla
    ...

def movimiento(anim, i, n, escala):
    q = (0.0, 0.0)
    if anim == "idle":
        f = 2 * math.pi * i / n
        r = (1 - math.cos(f)) / 2  # respiración 0..1..0
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": (0, r), "brazo_d": (0, r), "cola": (math.sin(f), 0), "cabeza": (0, r)}
        t, e, dx, dy = r, 1 - 0.03 * r, 0, 0
    elif anim == "walk":
        f = 2 * math.pi * i / n
        paso = lambda g: (1.5 * math.sin(g), -2 * max(0.0, math.cos(g)))
        bote = (1 - math.cos(2 * f)) / 2
        p = {"pierna_a": paso(f), "pierna_b": paso(f + math.pi), "brazo_i": (0, 2 * math.sin(f)),
             "brazo_d": (0, -2 * math.sin(f)), "cola": (2 * math.sin(f), -math.cos(f)), "cabeza": (0, bote)}
        t, e, dx, dy = 2 * math.sin(f), 1 - 0.02 * bote, 0, bote
    elif anim == "atacar":
        u = i / (n - 1)
        b = _clave(u, [(0, q), (0.3, (0, -3)), (0.6, (1, 3)), (1, q)])
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": b, "brazo_d": (-b[0], b[1]),
             "cola": _clave(u, [(0, q), (0.3, (3, 0)), (0.6, (-3, 1)), (1, q)]),
             "cabeza": _clave(u, [(0, q), (0.3, (0, -2)), (0.6, (0, 2)), (1, q)])}
        t = _clave(u, [(0, 0), (0.3, -3), (0.6, 5), (0.8, 2), (1, 0)])
        e = _clave(u, [(0, 1), (0.3, 1), (0.6, 0.95), (1, 1)])
        dx, dy = _clave(u, [(0, 0), (0.3, -1), (0.6, 2), (1, 0)]), 0
    else:  # golpe: recula
        p = {"pierna_a": q, "pierna_b": q, "brazo_i": (0, -2), "brazo_d": (0, -2), "cola": (2, 0), "cabeza": (0, -1)}
        t, e, dx, dy = -3, 0.97, -2, 0
    return {k: (v[0] * escala, v[1] * escala) for k, v in p.items()}, t * escala, e, round(dx * escala), round(dy * escala)
```

  Los valores exactos 0 del reposo deben salir como `0` y `(0, 0)` (el test los compara por igualdad).
- [ ] **Step 4:** ejecutar `test_reducir.py`: todo `ok`.
- [ ] **Step 5:** commit `reducir.py: fondo encerrado, movimiento por curvas y cuenta de motas`.

### Task 3: `generar.py` admite escala y fotogramas por monstruo

**Files:**
- Modify: `tools/generadores/monstruos/generar.py` (`hoja_propia`)

**Interfaces:**
- Consumes: `reducir.sueltos`.
- Produces: un módulo de `PROPIOS` puede declarar `ESCALA` (entero, por defecto 1), `ANIMS` (lista como la global,
  por defecto la global) y `EXENTOS` (colores que pueden ir sueltos, por defecto ninguno). Con `ESCALA > 1` el JSON
  lleva `"scale": ESCALA` y el ancla es `{"x": ancho // 2, "y": alto - 2 * ESCALA}`. Con `ESCALA == 1` el JSON es
  idéntico al de ahora (sin la clave `scale`). Para los módulos con `ESCALA > 1`, además del aviso de borde, avisa
  con `AVISO: <clave> <dirección> <anim> <i> tiene N grupos sueltos` si `sueltos(...) > 0` (antes del destello).

- [ ] **Step 1:** implementar lo anterior en `hoja_propia`.
- [ ] **Step 2:** ejecutar `generar.py`; `git status --short` no debe listar ningún JSON, y de los PNG solo los que
  cambian de bytes sin cambiar de dibujo (comprobarlo abriendo los dos y comparando píxeles); `git checkout` de esos.
- [ ] **Step 3:** commit `generar.py: escala y fotogramas por monstruo`.

### Task 4: el gólem, de frente, a doble resolución y con el recorte limpio

**Files:**
- Modify: `tools/generadores/monstruos/golem.py`
- Create: `tools/generadores/monstruos/test_hojas_doble.py`
- Create: `tests/hojas_doble.test.ts`
- Regenerados: `public/assets/sprites/monstruos/golem.png` y `.json`

**Interfaces:**
- Consumes: `reducir.pose(encerrado=...)`, `reducir.animar`, `reducir.ANIMS_DOBLE`, `reducir.sueltos`.
- Produces: `golem.py` con `W, H = 96, 96`, `ESCALA = 2`, `ANIMS = reducir.ANIMS_DOBLE`, `EXENTOS = [POLVO]`,
  `ANCHO = 56` y `fotograma(direccion, anim, i)`. En esta tarea las cuatro direcciones dan la vista de frente (las
  otras llegan en la Task 5). `test_hojas_doble.py` recorre la lista `DOBLES = [golem]`, que la Task 6 amplía.

- [ ] **Step 1: tests que fallan.** `test_hojas_doble.py` (mismo estilo que `test_reducir.py`), por cada módulo de
  `DOBLES`, dirección, animación de `ANIMS` y fotograma:
  - `fotograma(...)` tiene forma `(H, W, 4)`, `reducir.sin_tocar_bordes` y `reducir.sueltos(img, EXENTOS) == 0`;
  - las filas 0 a `3 * ESCALA - 1` están vacías (como en la hoja de hoy: no sube más y no tapa su nombre);
  - los 8 fotogramas de `walk` no son todos iguales y `idle` 0 es distinto de `idle` 4;
  - `columnas * W <= 4096`, con `columnas` la suma de fotogramas de `ANIMS`.

  `tests/hojas_doble.test.ts`, con `DOBLES: [clave, ancho, alto][] = [['golem', 48, 48]]`:

```ts
test.each(DOBLES)('%s: doble resolución, mismo tamaño de juego y más fotogramas', (clave, ancho, alto) => {
  const m = HOJAS[ruta(clave)]!.default;
  expect(m.scale).toBe(2);
  expect([m.frameWidth / 2, m.frameHeight / 2]).toEqual([ancho, alto]);
  expect(m.anchor).toEqual({ x: ancho, y: alto * 2 - 4 });
  expect(Object.keys(m.directions)).toEqual(['down', 'left', 'right', 'up']);
  const a = m.animations;
  expect([a.idle.frames, a.walk.frames, a.atacar.frames, a.golpe.frames]).toEqual([8, 8, 6, 1]);
  expect([a.idle.fps, a.walk.fps, a.atacar.fps]).toEqual([12, 16, 20]);
});

test('ninguna hoja sin convertir lleva scale', () => {
  for (const [r, m] of Object.entries(HOJAS))
    if (!DOBLES.some(([c]) => r.endsWith(`/${c}.json`))) expect(m.default.scale, r).toBeUndefined();
});
```

- [ ] **Step 2:** ejecutar los dos: fallan.
- [ ] **Step 3:** rehacer `golem.py`: `reducir.pose(REFERENCIA, 56, ..., paleta=PALETA, encerrado=<valor>)` y
  `reducir.animar` con las `PARTES` de hoy. Elegir `encerrado` mirando la máscara sobre la imagen (fondo quitado
  en magenta, lo quitado por encerrado en amarillo): debe caer el hueco entre el brazo y el torso y cualquier otro
  resto de fondo, y no los brillos de la piedra. El polvo del golpe al suelo sale en el fotograma de `atacar` en que
  el cuerpo está más lanzado, a escala 2.
- [ ] **Step 4:** en `generar.py`, `PROPIOS["golem"] = (96, 96, golem)`. Generar; `git checkout` de lo que no toca.
- [ ] **Step 5:** revisar la imagen: pose ×6 junto a la referencia y la hoja entera, en `docs/previews/doble_golem.png`.
  Buscar fondo sobrante, trozos comidos, motas, y que no parezca llevar capa. Repetir el Step 3 hasta que esté limpio.
- [ ] **Step 6:** `test_hojas_doble.py`, `npm test` y `npm run lint` en verde.
- [ ] **Step 7:** commit `Gólem a doble resolución: frente con el recorte limpio y 8/8/6/1 fotogramas`.

### Task 5: perfil y espalda del gólem, recreados

**Files:**
- Modify: `tools/generadores/monstruos/golem.py`
- Modify: `tools/generadores/monstruos/test_hojas_doble.py`

**Interfaces:**
- Produces: en `golem.py`, `_frente()`, `_perfil()` y `_espalda()`, cada una devuelve `(pose, partes)`; `fotograma`
  usa `_frente` para `down`, `_perfil` para `right`, su espejo para `left` y `_espalda` para `up`.

- [ ] **Step 1: test que falla** en `test_hojas_doble.py`: para cada módulo, `idle` 0 de `down`, `right` y `up` son
  tres imágenes distintas y `left` es el espejo exacto de `right`.
- [ ] **Step 2:** `_espalda()`: la pose de frente en espejo; el visor y la cara del yelmo se tapan con la piedra del
  yelmo; las cadenas que cuelgan por delante y el nudo del cinturón se quitan (queda la cadena de la cintura); el
  pecho pasa a placas de espalda hechas con la textura de las placas de la propia pose. Nada dibujado con colores
  de fuera de `PALETA`.
- [ ] **Step 3:** `_perfil()` (mira a la derecha): cabeza y torso estrechados a poco más de la mitad; la hombrera y
  el brazo de ese lado, delante y en el centro; la pierna de ese lado delante y la otra asomando detrás; el visor,
  hacia el borde derecho del yelmo. Piezas cortadas de la pose de frente, unidas sin huecos.
- [ ] **Step 4:** cajas de `partes` propias de cada vista (de perfil: una pierna delante y otra detrás, un brazo).
- [ ] **Step 5:** revisar `docs/previews/doble_golem.png` con las tres vistas ×6 y a tamaño real junto a la rana:
  las tres deben leerse como el mismo gólem, sin aspecto infantil ni piezas sueltas al andar. Repetir hasta que sí.
- [ ] **Step 6:** generar, tests en verde, commit `Gólem: perfil y espalda recreados a partir de su imagen`.

### Task 6: el lobo, de perfil, a doble resolución

**Files:**
- Create: `tools/generadores/monstruos/lobo.py`
- Modify: `tools/generadores/monstruos/generar.py` (quitar `"lobo"` de `MONSTRUOS`, añadirlo a `PROPIOS` como
  `(64, 64, lobo)` y a `VIGILADOS`)
- Modify: `tools/generadores/monstruos/humanoides.py` (borrar `lobo`, `_garras` y las tablas `LOBO_*`)
- Modify: `tools/generadores/monstruos/test_hojas_doble.py` (`DOBLES = [golem, lobo]`)
- Modify: `tests/hojas_doble.test.ts` (añadir `['lobo', 32, 32]`)
- Modify: `tests/monstruos_nuevos.test.ts` (el test del formato de hoja deja fuera al lobo, que ya lo cubre
  `hojas_doble.test.ts`)

**Interfaces:**
- Produces: `lobo.py` con `W, H = 64, 64`, `ESCALA = 2`, `ANIMS = reducir.ANIMS_DOBLE`, `OUT`, `ANCHO = 48`,
  `REFERENCIA` (`5-lobo.jpg`) y `_perfil()`, `_frente()`, `_espalda()` como en el gólem. En esta tarea `_frente` y
  `_espalda` devuelven el perfil.

- [ ] **Step 1:** ampliar los tests (fallan: no hay módulo ni hoja nueva).
- [ ] **Step 2:** `lobo.py`: la imagen tiene una raya negra de suelo bajo los pies (filas 1306 a 1315 de 1536):
  se recorta antes de reducir, en memoria o con un parámetro de recorte de `reducir.pose`, sin tocar el archivo de
  Pedro. Paleta fija de azul noche, rojo y colmillo; el blanco del colmillo solo vale en la boca (fuera es resto
  del fondo blanco). El lobo mira a la derecha en la imagen: `adelante=1`.
- [ ] **Step 3:** `PARTES`: pierna trasera, pierna delantera, brazo, cola y cabeza.
- [ ] **Step 4:** generar; revisar `docs/previews/doble_lobo.png` (pose ×6 junto a la referencia, hoja entera y a
  tamaño real junto a la rana). Debe leerse como lobo sobre el suelo oscuro de la Cripta: si es una mancha negra,
  subir el brillo de la reducción sin perder el tono sobrio.
- [ ] **Step 5:** tests de Python y `npm test` en verde; commit `Lobo a doble resolución desde su imagen de referencia`.

### Task 7: frente y espalda del lobo, recreados

**Files:**
- Modify: `tools/generadores/monstruos/lobo.py`

- [ ] **Step 1:** el test de las tres vistas distintas (Task 5) falla ahora para el lobo.
- [ ] **Step 2:** `_frente()`: cuerpo simétrico hecho con piezas del perfil (torso, brazo y pierna reflejados a los
  dos lados, con el pelo del lomo como textura); cabeza de frente con los rasgos de la imagen: orejas, dos ojos
  rojos, hocico al centro con la boca abierta y los colmillos; garras rojas en manos y pies.
- [ ] **Step 3:** `_espalda()`: la silueta del frente sin cara, con la melena erizada del lomo bajando por el centro
  y la cola a la vista.
- [ ] **Step 4:** cajas de `partes` de cada vista; revisar `docs/previews/doble_lobo.png` con las tres vistas como
  en la Task 5; repetir hasta que las tres sean el mismo lobo.
- [ ] **Step 5:** generar, tests en verde, commit `Lobo: frente y espalda recreados a partir de su imagen`.

### Task 8: verlo dentro del juego y enseñárselo a Pedro

**Files:**
- Modify (solo si hace falta): `src/render/mundo/mundo.ts`, `src/render/recursos.ts`
- Create: `docs/previews/doble_golem.gif`, `docs/previews/doble_lobo.gif`, capturas `docs/previews/doble_*.png`
- Delete: `docs/previews/prueba_monstruos.gif`
- Modify: `CLAUDE.md` (sección Estado)

- [ ] **Step 1:** `npm run dev` y capturas con Edge sin cabeza a 1000×640, 390×844 y 360×640 de:
  `?combate=lobo,arana,lobo,esqueleto`, `?combate=golem`, el mapa con un lobo (`?zona=2`) y el bestiario.
- [ ] **Step 2:** comprobar en cada captura: mismo tamaño que antes (comparar con una captura de `main`), nombres
  sin tapar, el grupo no se encoge, la silueta del bestiario bien, y que los sprites nuevos no pierden contorno ni
  píxeles en las pantallas pequeñas.
- [ ] **Step 3 (solo si en pequeño se pierden píxeles):** en `crearActor`, las hojas con `scale > 1` usan
  `LinearMipmapLinearFilter` y `generateMipmaps = true` al reducir (ampliar sigue con `NearestFilter`); en
  `dibujarFotograma`, activar `imageSmoothingEnabled` solo mientras se dibuja una hoja por debajo de su tamaño real.
  Repetir las capturas.
- [ ] **Step 4:** un GIF por monstruo con reposo, andar y ataque en las tres vistas, junto a la rana.
- [ ] **Step 5:** `npm test`, `npm run lint`, `npm run build` y los dos tests de Python en verde.
- [ ] **Step 6:** actualizar el Estado de `CLAUDE.md` (qué hay, qué no se probó, que la regla de pedir imágenes de
  frente y espalda queda superada) y commit.
- [ ] **Step 7:** enviar a Pedro los GIF y las capturas y pedirle el visto bueno del aspecto y de las vistas
  recreadas. Sin su visto bueno no se empieza la entrega 2 ni se publica.
