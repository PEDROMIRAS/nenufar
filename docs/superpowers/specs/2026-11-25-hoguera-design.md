# La hoguera: punto de control

Fecha: 2026-11-25. Propuesta mía aprobada por Pedro («procede con el guardado, la propuesta que me has hecho»). Lo que no
estaba en la propuesta va marcado como *mi decisión*.

## Problema

Morir borra la partida y se empieza de cero. Para quien llega desde el portafolio, perder una partida de 20 minutos es
motivo para no volver. El guardado al entrar en cada sala solo protege de cerrar el navegador.

## Diseño

- **Una hoguera en la sala de descanso de cada zona**, junto a la fuente (el Bosque ya la tenía, de adorno; las Ruinas,
  la Cripta y el Cauce la ganan en su `descanso_01`). Empieza **apagada** (*mi decisión*: sin llama ni luz; tile
  `hoguera_apagada` con el mismo dibujo 2D y modelo 3D propio).
- **Encenderla:** basta con acercarse, como con la fuente. Se guarda una copia de la partida de ese momento (heroína,
  inventario, mapa de la zona con lo vencido y lo hecho, si la fuente está usada) y sale el aviso «Hoguera encendida:
  si caes, vuelves aquí (N brasas)». Encender la de otra zona sustituye a la anterior. Encendida, no hace nada más.
- **Brasas por partida**, según la dificultad (`brasas` en `dificultades.json`): Fácil 3, Normal 1, Difícil 0. Sin brasas
  la hoguera no prende y lo dice («No te quedan brasas»); en Difícil, siempre.
- **Al caer** con una hoguera encendida y brasas: se gasta una, se vuelve a la copia (la sala de descanso, junto a la
  fuente) y sale la página «Vuelves a la hoguera» («Caíste, pero la hoguera te devuelve a su lado») con las brasas que quedan. Lo vencido después de encenderla vuelve a
  estar. Sin hoguera o sin brasas, «Fin de la partida» como siempre.
- *Mi decisión:* el tiempo no se rebobina (cuenta todo lo jugado) y la hoguera sigue encendida al volver (se puede volver
  otra vez mientras queden brasas).
- **Récords:** el resumen final dice «Vueltas a la hoguera: N» si se usó alguna (*mi decisión*: los récords no se separan;
  se apunta el dato).
- **Reto del día:** sin hoguera (no guarda nada ni hay sala de descanso en su Bosque corto que sirva).

## Guardado

- `PartidaGuardada` gana `brasas`, `vueltas` y `hoguera` (la copia, sin su propia hoguera), opcionales: una partida de
  antes recibe las brasas de su dificultad y ninguna hoguera. `VERSION_GUARDADO` no cambia.
- La copia viaja en cada guardado, así que cerrar el navegador no la pierde; morir, ganar o «Salir» la borran con la
  partida.

## Equilibrado

La jugadora simulada juega sin reintentos: las cifras de los tests (partida completa) no cambian, pero con brasas Fácil y
Normal se ganan más (cuánto, sin medir: el simulador no juega la vuelta). Se decide no reequilibrar (*mi decisión*: es el propósito).

## Arreglo aparte

La fuente no se alcanzaba desde arriba ni desde abajo (el alcance se medía contra sus casillas de dibujo, una fila, y
choca con una elipse de 2,8×2,2 casillas). Ahora se mide contra las casillas de la elipse (`tocaCasillas`).
