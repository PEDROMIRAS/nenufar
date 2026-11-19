# Sala de evento: el puesto del mercader

Fecha: 2026-11-19. Pedro eligió la idea entre las de «Ideas para la versión 2» (más variedad entre partidas: un mercader) y la opción A: **se dejan piezas de la mochila a cambio de consumibles**. Dijo «ponte con ella»: todo lo demás es decisión mía y va marcado como tal.

## Por qué

Los probadores no repetían porque «es igual cada vez». Las salas de evento (altar, desafío, ermitaño) dan variedad. Además, la mochila no sirve para nada: el arma o la armadura que dejas de llevar se quedan ahí para siempre. El mercader les da un uso.

## Qué es

- Una cuarta clase de sala de evento, `evento: 'mercader'`. **Mi decisión:** sale en la mitad de las salas que hoy serían altar (`fraccion` 0,5 de los altares). El reparto queda en un 50 % de desafíos, un 25 % de ermitaños, un 12,5 % de altares y un 12,5 % de mercaderes. Los desafíos y los ermitaños de cada semilla siguen siendo los mismos. La tirada va la última, así que el trazado no cambia.
- **Mi decisión:** es un **puesto vacío**, sin mercader a la vista, así que no hace falta un personaje nuevo. Una tablilla explica el trato. Se ve como el altar en dorado (el desafío ya es el altar en rojo) y lleva su luz dorada. Al hacer el trueque se apaga, igual que el altar. **El aspecto lo tiene que aprobar Pedro.**
- Al acercarse se abre la elección (`EscenaEvento`). Muestra una opción por pieza de la mochila, hasta `cuantas` (3), de más a menos valiosa, y «Marcharse». Si la mochila está vacía, sale una opción apagada que explica por qué.
- **Un trueque por puesto (mi decisión):** el primero lo apaga.
- **Lo que paga (mi decisión):** `base + ⌊bono / porBono⌋` consumibles, con 1 y 4. `bono` es la suma de los bonos de la pieza: la katana gastada da 1, la de acero 2, la hoja rúnica 3 y la katana de brasas 4. Paga en Pociones o Éteres: cada unidad va al tipo del que menos se lleva, contando lo que ya se ha sumado, y a igualdad, la Poción. La opción dice exactamente qué se recibe («Dejas la Katana de acero y te llevas Poción y Éter»). Lo que no cabe (máximo 5 por tipo) se avisa como en el ermitaño.
- **Lo vendido no vuelve:** se apunta en `inventario.vendidas` y los cofres lo cuentan como pieza que ya se tiene. Si no, un cofre podría volver a dar lo que se acaba de vender. El campo es opcional, así que las partidas guardadas antes siguen valiendo.

## Equilibrado

La jugadora simulada no usa mochila: se pone lo que es mejor y tira lo demás. Para medir al mercader, el simulador apunta lo que habría ido a la mochila (lo que se quita y lo que encuentra sin ponérselo), sin tocar el inventario ni los cofres. Así las cifras sin mercader no cambian. En el puesto cambia la pieza más valiosa que le sobra. Objetivo: con la mezcla real de eventos, cada celda (heroína × dificultad) a ±3 puntos de lo que da sin mercader, medido con 2400 partidas. `tests/eventos_rango.test.ts` pasa a incluirlo.

## Fuera

No hay dinero, ni se vende lo que se lleva puesto, ni se pueden cambiar consumibles por consumibles (opciones B y C, descartadas por Pedro). Tampoco hay personaje de mercader con sprite: si Pedro lo quiere, haría falta su imagen.

## Resultado (2026-11-19)

Hecho en la rama `mercader`. Medido con 2400 partidas por casilla, de la mezcla de eventos de antes (sin mercader) a la nueva (victoria en partida completa):

| Dificultad | Ronin | Maga |
| --- | --- | --- |
| Fácil | 73,0 → 73,1 | 72,8 → 73,2 |
| Normal | 46,1 → 46,1 | 51,2 → 51,3 |
| Difícil | 24,1 → 24,3 | 28,9 → 28,5 |

Ninguna casilla se mueve más de 0,4 puntos: el puesto sale en un 5 % de las zonas y paga poco. Atajo de desarrollo: `?mercader` (los eventos son puestos y la partida empieza dentro de uno). Visto con Chrome sin cabeza en el Bosque con la mochila vacía y con cuatro piezas, al hacer un trueque y con el puesto apagado después. **Sin ver** en las otras zonas ni en el móvil. **El aspecto (el altar en dorado) lo tiene que aprobar Pedro.** Como con los demás eventos, la partida se guarda al entrar en cada sala: si se cierra el navegador justo después de un trueque, al volver la sala está como antes. Una partida guardada con la versión anterior puede encontrarse un puesto donde había un altar (no se cambia `VERSION_GUARDADO`, como cuando llegó el ermitaño).
