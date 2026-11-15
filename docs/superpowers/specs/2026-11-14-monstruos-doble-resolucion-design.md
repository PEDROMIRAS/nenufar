# Monstruos a doble resolución y con más fotogramas: diseño

Fecha: 2026-11-14. Estado: pendiente de que Pedro lo apruebe.

## Qué se quiere y por qué

Pedro quiere que los monstruos se vean con mejores gráficos y se muevan más fluidos, sin dejar el pixel art. Hoy
son dibujos de 32 a 64 px con 2 fotogramas en reposo, 4 al andar, 3 al atacar y 1 al recibir un golpe: se ven
toscos y se mueven a saltos.

Se hizo una prueba con el lobo y el gólem (`docs/previews/prueba_monstruos.gif`, de usar y tirar) con tres
versiones: la actual, el mismo tamaño con más fotogramas y el doble de resolución con más fotogramas. **Pedro
eligió la tercera** (la «opción B»).

## Lo que decidió Pedro

- Se mantiene el pixel art, con más detalle y más fotogramas.
- Opción B: los sprites se dibujan al **doble de resolución** y se muestran **al mismo tamaño en pantalla** (sus
  píxeles son la mitad de grandes).
- **Cuidado con los recortes.** El gólem de la prueba parecía llevar capa: era fondo de la imagen que quedó sin
  quitar entre el brazo y el torso. No puede pasar.
- Se empieza por los monstruos que ya tienen imagen de referencia. Para los demás, Pedro busca imágenes (lista al
  final).
- Las ranas también se mejoran (proyecto aparte, después de este).
- **No va a haber imágenes de frente ni de espalda: las vistas que faltan las recreo yo** a partir de la única
  imagen de cada monstruo.

## Orden de los trabajos

1. **Este documento:** el motor y los monstruos que tienen imagen de referencia útil.
2. **Las ranas a doble resolución.** Diseño aparte: se dibujan por código, llevan capas de equipo y recoloreado.
3. **El resto de monstruos**, según lleguen las imágenes de Pedro.

## Objetivos

- Los diez monstruos de la tabla de abajo, a doble resolución, sacados de su imagen de referencia.
- Cada uno con sus **tres vistas** (de frente, de perfil y de espalda): la de la imagen y las otras dos recreadas.
- Movimiento más fluido: reposo 8 fotogramas, andar 8, atacar 6, golpe 1 (el destello, como ahora).
- Mismo tamaño en pantalla que hoy, en el mapa, en el combate, en el bestiario y en la presentación de jefes.
- Recortes limpios: sin fondo sobrante (tampoco el encerrado entre brazos y piernas), sin trozos comidos, sin
  motas ni píxeles sueltos.
- Los monstruos sin convertir siguen funcionando igual y conviven con los nuevos.

## Fuera del alcance

- Las ranas, los efectos, el fuego morado, las piezas de equipo y los tiles.
- Los monstruos sin imagen de referencia útil (lista al final) y el dragón de fuego, que no se usa en el juego.
- Cambios de equilibrado, de datos de combate o de duración de las animaciones.

## Lo que sería un fracaso aunque funcione

- Que un monstruo se vea más grande o más pequeño que hoy, o tape su nombre en combate.
- Fondo sin recortar, huecos o motas en cualquier fotograma.
- Que salga infantil o deje de parecerse a la imagen de Pedro (su regla: sobrio y oscuro, nada infantil).
- Piezas del cuerpo sueltas o grietas al moverse (regla de Pedro del 2026-11-08).
- Que una vista recreada parezca otro monstruo, otro estilo o un dibujo infantil al lado de la vista de la imagen.
- Que en el móvil los sprites nuevos parpadeen o pierdan el contorno al reducirse.

## Monstruos de este trabajo

| Monstruo | Clave | Cuadro hoy | Cuadro nuevo | Imagen | Nota |
|---|---|---|---|---|---|
| Jabalí | `jabali` | 40×40 | 80×80 | `1-jabali.jpg` | Las patas se dibujan por código |
| Cuervo | `cuervo` | 32×32 | 64×64 | `2-cuervo.jpg` | Hoy está dibujado por código: cambia de aspecto |
| Lobo | `lobo` | 32×32 | 64×64 | `5-lobo.jpg` | Hoy está dibujado por código: cambia de aspecto |
| Acólito | `acolito` | 40×40 | 80×80 | `4-acolito-calavera.jpg` | Llama que parpadea |
| Monje oni | `oni` | 48×48 | 96×96 | `7-oni.jpg` | Máscara repintada a mano |
| Guardián del Bosque | `rey_limo` | 64×48 | 128×96 | `8-guardian-bosque.png` | El cuerpo ondula entero |
| Reina Araña | `reina_arana` | 64×48 | 128×96 | `9-reina-arana.png` | |
| Gólem | `golem` | 48×48 | 96×96 | `10-golem.png` | El del fallo de la «capa» |
| Señor de la Cripta | `senor_cripta` | 48×48 | 96×96 | `11` y `12-senor-cripta-espada.png` | Fuego morado y contorno a mano |
| Rey sin Charca | `rey_sin_charca` | 64×48 | 128×96 | `13-rey-sin-charca.png` | Forro rojo y fuego morado |

Las imágenes están en `docs/superpowers/mockups/cauce-seco-referencias/`.

## Cómo se hace (decisiones mías, no de Pedro)

### Motor

- `SpriteJson` gana un campo opcional `scale` (por defecto 1): cuántos píxeles de la hoja ocupa un píxel del
  juego. Las hojas nuevas llevan `scale: 2`, y `frameWidth`, `frameHeight` y `anchor` siguen en píxeles de la hoja.
- Todo lo que usa esas medidas para colocar o dar tamaño trabaja con la medida dividida por `scale`:
  `dibujarFotograma` (`src/render/recursos.ts`), `crearActor` (`src/render/mundo/mundo.ts`), el reparto de enemigos
  y la altura del nombre en `src/render/combate.ts`, y la escala del bestiario en `src/render/extras.ts`.
- Los fotogramas y los fps ya salen del JSON de cada hoja, así que más fotogramas no piden cambios en el motor.
- Las animaciones duran lo mismo que hoy, para no tocar el ritmo del combate: reposo 8 fotogramas a 12 fps, andar
  8 a 16 fps, atacar 6 a 20 fps. El golpe del ataque cae hacia el fotograma 3 o 4 (0,15 a 0,2 s), que casa con el
  anticipo mínimo de 0,2 s que ya usa el combate.

### Generadores

- `tools/generadores/monstruos/reducir.py`:
  - El recorte quita también el **fondo encerrado** (zonas del color del fondo que no tocan el borde de la imagen),
    con un tamaño mínimo para no comerse brillos del mismo color.
  - El movimiento deja de ser una tabla por fotograma (`PATRONES`, `VIDA`) y pasa a ser curvas continuas que se
    muestrean a los fotogramas que se pidan y se multiplican por la escala, como en la prueba.
- `generar.py` admite por monstruo su número de fotogramas, sus fps y su `scale`, y los escribe en el JSON. Los
  monstruos sin convertir se generan igual que ahora, byte a byte.
- Cada módulo de monstruo reduce su imagen al doble de ancho. Los retoques a mano medidos en píxeles (ojos,
  máscara del oni, fuego morado, forro rojo, patas del jabalí) se rehacen a la escala nueva; donde el detalle de la
  imagen ya sobrevive a la reducción, el retoque se quita.

### Vistas

Cada imagen da una sola vista. Las otras dos se recrean **con los píxeles de la propia imagen** ya reducida (misma
paleta, mismas texturas, mismas proporciones), no dibujando de cero: la figura se parte en piezas (cabeza, torso,
brazos, piernas, cola, arma) y cada vista las vuelve a componer. La izquierda es el espejo de la derecha.

- **Espalda a partir del frente:** la silueta en espejo; la cara, el pecho y los adornos de delante se tapan con
  la textura del material de al lado (yelmo, capucha, placas, pelo) y se añade lo propio de la espalda (nuca, capa,
  lomo, cola).
- **Perfil a partir del frente:** torso y cabeza estrechados, el brazo y la pierna de ese lado por delante y los
  del otro asomando por detrás; la cabeza girada (visor, hocico o pico hacia delante) se retoca a mano.
- **Frente a partir del perfil:** cuerpo simétrico hecho con la mitad que mejor se ve, reflejada; la cabeza de
  frente se dibuja con los rasgos de la imagen (ojos, hocico, colmillos, cuernos).
- **Espalda a partir del perfil:** como el frente, sin cara y con el lomo y la cola a la vista.

Cada vista tiene sus propias cajas de partes para animarse, y se revisa junto a la vista de la imagen, ampliada y
a tamaño real.

Qué vista da cada imagen: perfil el jabalí, el lobo, el guardián y la reina araña; frente o tres cuartos el
cuervo, el acólito, el oni, el gólem, el señor de la cripta y el rey sin charca (quien lo construya lo confirma
mirando cada imagen).

**Riesgo:** es la parte difícil. Dos intentos anteriores fallaron: el frente del guardián dibujado a mano salió
infantil y un giro automático de una pose no dio un perfil creíble. Lo que cambia ahora es que hay el doble de
píxeles y que las vistas se montan con trozos de la imagen. Por eso la primera entrega enseña a Pedro las tres
vistas del lobo y del gólem antes de hacer las demás.

### Riesgo conocido

En pantallas pequeñas el mapa 3D y el canvas 2D pueden dibujar un sprite de doble resolución a menos de su tamaño
real, y al reducir sin suavizado se pierden píxeles (contornos que parpadean). Hay que mirarlo a 390×844 y
360×640; si pasa, la textura del mapa usa filtrado con mipmaps al reducir y el canvas 2D suaviza solo cuando
reduce.

## Entregas

1. **Motor, recorte y los dos de la prueba (lobo y gólem) con sus tres vistas**, vistos dentro del juego (mapa y
   combate, en horizontal y en móvil vertical). Pedro aprueba el aspecto y las vistas recreadas antes de seguir.
2. **Los otros ocho**, con el mismo método.

Se trabaja en una rama (`monstruos-doble`). No se publica hasta que Pedro apruebe el arte.

## Cómo se comprueba

- Por cada monstruo, una imagen ampliada de su pose junto a su imagen de referencia y la hoja entera, revisadas
  buscando fondo sobrante, trozos comidos, motas y piezas sueltas. Quedan en `docs/previews/`.
- Un GIF por monstruo con reposo, andar y ataque en las tres vistas, para que Pedro vea el movimiento.
- Tests: un caso de `test_reducir.py` con fondo encerrado; `tests/hojas_cauce.test.ts` y
  `tests/monstruos_nuevos.test.ts` aceptan el formato nuevo (cuadro, fotogramas y `scale`); un test que comprueba
  que el tamaño en píxeles de juego de cada monstruo convertido es el de antes.
- Capturas con Edge sin cabeza del mapa y del combate a 1000×640, 390×844 y 360×640, con un monstruo nuevo junto
  a uno sin convertir.
- `npm test`, `npm run lint` y `npm run build` en verde.

## Queda a criterio de quien lo construya

- Las curvas exactas de cada animación y las cajas de las partes de cada monstruo.
- Los ajustes de brillo, contraste y paleta de cada reducción.
- Dónde vive la división por `scale` (una función de ayuda o en cada sitio).

## Anexo: imágenes que busca Pedro

Monstruos sin imagen de referencia útil. Para que una imagen sirva: **una sola figura de cuerpo entero, fondo liso
de un color que no esté en la figura, sin escenario, sin sombra ni raya en el suelo, de unos 600 px de alto o
más**. Basta una vista (mejor la que mira a la cámara, de frente o de tres cuartos): las otras las recreo yo.

| # | Monstruo | Dónde sale | Cómo es hoy |
|---|---|---|---|
| 1 | Limo | Bosque | Baba verde con ojos |
| 2 | Limo grande | Bosque | El limo, más grande y de otro verde (puede salir de la misma imagen) |
| 3 | Murciélago | Bosque | Morado, ojos rojos, alas abiertas |
| 4 | Araña | Ruinas | Rojiza, patas oscuras, ojos amarillos |
| 5 | Esqueleto | Ruinas | De pie, con espada |
| 6 | Caballero oscuro | Cripta | Armadura azul oscuro, escudo, pluma roja |
| 7 | Salamandra de brasas | Cauce Seco | Oscura, grietas de brasa, la cola ardiendo |
| 8 | Espectro | Cauce Seco | Encapuchado rojo con una llama en la mano |
| 9 | Sacerdote de la luna falsa | Jefe del Cauce Seco | Alto y flaco, brazos abiertos, el sol roto detrás |
| 10 | Árbol maldito | Jefe violeta del Bosque | Árbol con cara y boca de colmillos |
| 11 | Caballero maldito | Jefe violeta de las Ruinas | Armadura con cuernos, capa roja, espadón |
| 12 | Ojo flotante | Jefe violeta de la Cripta | Un ojo morado con tentáculos |
| 13 | Dragón negro | Jefe violeta de las cuatro zonas | Negro, cuernos de hueso, ojo rojo, alas |
| 14 | Cofre trampa | Las cuatro zonas | El cofre del juego, que abre la boca |

El sacerdote está en la lista porque su imagen (`3-sacerdote-aureola.jpg`) es una escena con fondo y la figura no
se puede separar; el sprite de hoy está dibujado a mano. El ermitaño (personaje, no monstruo) también está dibujado
por código; si Pedro quiere mejorarlo, sirve una imagen con las mismas condiciones.
