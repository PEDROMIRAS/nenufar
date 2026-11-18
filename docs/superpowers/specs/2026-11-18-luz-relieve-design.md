# Luz y relieve: diseño corto

Fecha: 2026-11-18. Sale de la prueba `prueba-luz` (relieve en los sprites, niebla, hoguera más fuerte y cámara del
combate), que Pedro vio y aprobó como dirección: «sigue por aquí, hazlo como hito en las cuatro zonas».

## Por qué

Pedro: el juego se ve **plano** y pensó en cambiar de motor. La auditoría vio que lo plano no es de Three.js: los
sprites reciben la luz por igual de arriba abajo, la luz de cielo es tan fuerte que lo iguala todo, las salas de
combate no tienen fuentes de luz y la cámara del combate no se mueve.

## Objetivos

1. Relieve en todos los sprites de pie (ranas, monstruos, ermitaño): mapa de normales sacado del pixel art.
2. Luz con contraste en las cuatro zonas: menos luz de cielo, más luz de punto y niebla suave del color de la zona.
3. Una o dos fuentes de luz en cada sala que no tenga ninguna, con algo visible que las justifique.
4. Cámara del combate que se acerca al atacante y al objetivo en cada ataque, más en críticos, golpes cargados y
   combates contra jefes.

## No objetivos

- Cambiar de motor; tocar el arte de los sprites; combate en 3D (los luchadores siguen en la capa 2D).
- Más de cuatro luces de punto por sala (el móvil no lo aguanta).

## Anti-objetivos

- Que se vea más oscuro sin ganar profundidad (lo que pasaba en la prueba en salas sin luces).
- Que la luz queme los colores del pixel art (la maga amarilla de la prueba con la hoguera al máximo).
- Que baje el rendimiento en el móvil; que «calidad baja» deje de aliviarlo.

## Enfoques

- **A. Seguir con Three.js (elegido por Pedro tras ver la prueba).**
- B. Babylon: haría lo mismo con el mismo trabajo de luz; se descartó.
- C. Godot: reescribir todo, peor en la web; se descartó.

## Diseño (todo, propuesta mía aprobada por Pedro)

- **Relieve:** `normalesDeSprite` (puro) y `texturaNormales` de la prueba, en todos los `crearActor`. En calidad
  baja, sin mapa de normales ni relieve del suelo.
- **Luz por zona** (`hd2d.json`): cielo de Bosque 1,6 → ~0,85 (noche verde), Ruinas 1,5 → ~0,9 (tarde cálida y
  rasante), Cripta 2,6 → ~1,2 (violeta frío), Cauce Seco 2,7 → ~1,2 (rojo de brasas); niebla por zona; las luces de
  los objetos, más fuertes y con más alcance. Se afinan con capturas.
- **Fuentes de luz en salas sin luces:** 1-2 por sala, en casillas libres elegidas con la semilla de la sala, lejos
  de las salidas. Bosque: enjambre de luciérnagas; Ruinas: haz de luz desde arriba; Cripta: fuego fatuo flotando;
  Cauce Seco: grieta de brasa en el suelo. Cada una, una luz de `hd2d.json` y un modelo animado. Comparten el
  reparto de cuatro luces de punto.
- **Cámara del combate:** `zoomAtaque` de la prueba, multiplicado por un factor si el golpe es crítico o cargado o
  si lucha un jefe.

## Restricciones

`src/core/` sin navegador; números en `src/data/`; cero asignaciones por fotograma; español.

## Cómo se comprueba

Tests de lo puro (relieve, dónde caen las luces, cámara). Capturas de antes y después en las cuatro zonas (mapa,
combate, portada; horizontal y 390×844). El aspecto de las fuentes de luz lo aprueba Pedro con las capturas.

## Lo que queda al constructor

Los valores exactos de luz por zona, la forma de cada fuente de luz y el factor de la cámara.
